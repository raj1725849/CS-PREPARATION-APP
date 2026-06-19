import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt
} from "@/lib/prompts"
import { EvaluateRequest, EvaluateResponse, EvaluateError } from "@/lib/types"
import { evaluateWithOpenRouter } from "@/lib/openrouter"
import { resolveSubjectName } from "@/lib/subject-map"
import { retrieveRubric } from "@/lib/rubric-retriever"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"

export const maxDuration = 60

function getQuestionHashId(questionText: string): string {
  let hash = 0;
  const normalized = questionText.toLowerCase().replace(/[^\w]/g, "");
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "Q_" + Math.abs(hash).toString(36);
}

async function generateJSONWithFallback(
  systemInstruction: string,
  userPrompt: string,
  callName: string,
  finalMarks: number
): Promise<any> {
  const parts = [{ text: userPrompt }];
  let rawText = "";
  let lastGeminiErr: any = null;
  const maxRetries = getGeminiKeyCount();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const model = getEvalModel();
      const result = await model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 20,
          maxOutputTokens: 8192
        }
      });
      rawText = result.response.text().trim();
      break; // Success
    } catch (err: any) {
      lastGeminiErr = err;
      console.warn(`Gemini ${callName} attempt ${i + 1}/${maxRetries} failed:`, err.message);
    }
  }

  // If Gemini failed all retries, fall back to OpenRouter
  if (!rawText) {
    console.warn(`/api/evaluate ${callName} Gemini failed all retries, falling back to OpenRouter:`, lastGeminiErr);
    try {
      rawText = await evaluateWithOpenRouter(userPrompt, [], [], systemInstruction);
    } catch (fallbackErr: any) {
      console.error(`/api/evaluate ${callName} OpenRouter fallback error:`, fallbackErr);
      throw new Error(`Models failed for ${callName}. Gemini Error: ${lastGeminiErr.message}. OpenRouter Error: ${fallbackErr.message}`);
    }
  }

  console.log(`=== ${callName} RAW (first 800 chars) ===`);
  console.log(rawText.slice(0, 800));
  console.log("Response length:", rawText.length, "chars");
  console.log("====================================");

  let parsedObj: any = null;

  // First attempt: try to parse directly
  const jsonStart = rawText.indexOf('{');
  const jsonEnd = rawText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const cleanJson = rawText.substring(jsonStart, jsonEnd + 1);
    try {
      parsedObj = JSON.parse(cleanJson);
    } catch (err) {
      console.warn(`Direct JSON parsing failed for ${callName}, attempting robust repair...`);
    }
  }

  // Robust repair attempt
  if (!parsedObj && jsonStart !== -1) {
    const s = rawText.substring(jsonStart);
    let inString = false;
    let isEscaped = false;
    const stack: ('{' | '[')[] = [];
    let lastValidIndex = 0;

    for (let i = 0; i < s.length; i++) {
      const char = s[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        if (!inString) {
          lastValidIndex = i + 1;
        }
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
          lastValidIndex = i + 1;
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
            lastValidIndex = i + 1;
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
            lastValidIndex = i + 1;
          }
        } else if (char === ',') {
          lastValidIndex = i; // comma boundary is safe
        }
      }
    }

    // Attempt 1: Direct close of current string and braces
    let repaired1 = s;
    if (inString) {
      repaired1 += '"';
    }
    let suffix1 = "";
    for (let j = stack.length - 1; j >= 0; j--) {
      suffix1 += stack[j] === '{' ? '}' : ']';
    }
    repaired1 += suffix1;

    try {
      parsedObj = JSON.parse(repaired1);
      console.log(`Robust JSON repair (Attempt 1: Direct Close) succeeded for ${callName}`);
    } catch (err) {
      console.warn(`Robust JSON repair (Attempt 1) failed, attempting backtrack...`);
    }

    // Attempt 2: Backtrack to last safe boundary
    if (!parsedObj && lastValidIndex > 0) {
      const cleanSub = s.substring(0, lastValidIndex);
      const subStack: ('{' | '[')[] = [];
      let subInString = false;
      let subEscaped = false;

      for (let i = 0; i < cleanSub.length; i++) {
        const char = cleanSub[i];
        if (subEscaped) { subEscaped = false; continue; }
        if (char === '\\') { subEscaped = true; continue; }
        if (char === '"') { subInString = !subInString; continue; }
        if (!subInString) {
          if (char === '{' || char === '[') subStack.push(char);
          else if (char === '}') { if (subStack[subStack.length - 1] === '{') subStack.pop(); }
          else if (char === ']') { if (subStack[subStack.length - 1] === '[') subStack.pop(); }
        }
      }

      let repaired2 = cleanSub.trim();
      if (repaired2.endsWith(',')) {
        repaired2 = repaired2.slice(0, -1).trim();
      }

      let suffix2 = "";
      for (let j = subStack.length - 1; j >= 0; j--) {
        suffix2 += subStack[j] === '{' ? '}' : ']';
      }
      repaired2 += suffix2;

      try {
        parsedObj = JSON.parse(repaired2);
        console.log(`Robust JSON repair (Attempt 2: Backtrack) succeeded for ${callName}`);
      } catch (err2) {
        console.error(`Robust JSON repair (Attempt 2) failed as well for ${callName}:`, err2);
      }
    }
  }

  if (!parsedObj) {
    console.error(`Failed to parse response for ${callName}. Raw response:\n`, rawText);
    
    // Log to file for debug
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), `evaluate_error_${callName.toLowerCase()}.log`);
      fs.writeFileSync(logPath, `--- ERROR DATE: ${new Date().toISOString()} ---\n${rawText}\n`, 'utf8');
      console.log(`Wrote raw ${callName} response to evaluate_error_${callName.toLowerCase()}.log`);
    } catch (logErr) {
      console.error("Failed to write raw response log file:", logErr);
    }
    
    throw new Error(`AI response for ${callName} was cut off or invalid JSON.`);
  }

  return parsedObj;
}

export async function POST(req: NextRequest) {
  try {
    await verifyUserAndEnforceLimit(req, "evaluate");
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json<EvaluateError>(
      { error: err.message || "Unauthorized", code: "UNKNOWN" },
      { status }
    );
  }

  let body: EvaluateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<EvaluateError>(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const { subject, question, marks, studentAnswer } = body

  if (!subject || !question?.trim() || !marks || !studentAnswer?.trim()) {
    return NextResponse.json<EvaluateError>(
      { error: "Missing required fields: subject, question, marks, studentAnswer", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  // Resolve the subject and retrieve the rubric
  const resolvedSubject = resolveSubjectName(subject);
  const rubric = retrieveRubric(resolvedSubject, question);

  // If the rubric has its own marks definition, we can use it, or fallback to request marks
  const finalMarks = rubric.matched && rubric.marks ? rubric.marks : marks;

  if (rubric.matched) {
    console.log(`Matched rubric: "${rubric.question_text}" (Sub-question: ${rubric.sub_question}, Similarity: ${rubric.similarity.toFixed(2)}, Marks: ${rubric.marks})`);
  } else {
    console.log(`No rubric matched for: "${question}" (Subject: ${resolvedSubject})`);
  }

  try {
    const systemInstructionEval = buildEvaluateSystemPrompt();
    const userPromptEval = buildEvaluateUserPrompt({
      subject: resolvedSubject,
      question: rubric.matched && rubric.question_text ? rubric.question_text : question,
      marks: finalMarks,
      studentAnswer,
      rubric
    });

    const evalData = await generateJSONWithFallback(systemInstructionEval, userPromptEval, "Evaluation", finalMarks);

    const scorePercent = (evalData.marks_awarded / evalData.total_marks) * 100
    const verdict = scorePercent >= 60
      ? "Pass"
      : scorePercent >= 50
      ? "Borderline Pass"
      : "Fail"

    const resolvedQuestionId = rubric.matched && rubric.question_id
      ? rubric.question_id
      : getQuestionHashId(question);

    const parsed: EvaluateResponse = {
      marks_awarded: evalData.marks_awarded ?? 0,
      total_marks: evalData.total_marks ?? finalMarks,
      score_percentage: Math.round(scorePercent * 10) / 10,
      verdict,
      chapter: evalData.chapter ?? "General",
      improvement_suggestion: evalData.improvement_suggestion ?? "",
      questionId: resolvedQuestionId,
      questionNumber: rubric.matched ? rubric.sub_question : undefined,
      deductions: evalData.deductions ?? [],
      strengths: evalData.strengths ?? [],
      missing_points: evalData.missing_points ?? [],
      keywords_missing: evalData.keywords_missing ?? [],
      evaluated_at: new Date().toISOString()
    };

    return NextResponse.json(parsed, { status: 200 })

  } catch (err: any) {
    console.error("Evaluation pipeline failed:", err);
    
    // Check if it's a truncation error
    const isTruncated = err.message?.includes("cut off") || err.message?.includes("truncated");
    return NextResponse.json<EvaluateError>(
      {
        error: isTruncated 
          ? "AI response was cut off. This happens when the answer is very detailed. Please try again."
          : `Evaluation pipeline failed: ${err.message}`,
        code: isTruncated ? "TRUNCATED_RESPONSE" : "GEMINI_ERROR"
      },
      { status: 502 }
    )
  }
}
