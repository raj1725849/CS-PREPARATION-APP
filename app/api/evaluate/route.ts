import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt,
  buildModelAnswerSystemPrompt,
  buildModelAnswerUserPrompt
} from "@/lib/prompts"
import { EvaluateRequest, EvaluateResponse, EvaluateError } from "@/lib/types"
import { evaluateWithOpenRouter } from "@/lib/openrouter"
import { resolveSubjectName } from "@/lib/subject-map"
import { retrieveRubric } from "@/lib/rubric-retriever"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"

export const maxDuration = 60

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
      console.warn(`Direct JSON parsing failed for ${callName}, attempting repair...`);
    }
  }

  // Repair attempt
  if (!parsedObj) {
    const openBraces = (rawText.match(/\{/g) || []).length;
    const closeBraces = (rawText.match(/\}/g) || []).length;

    if (openBraces > closeBraces) {
      console.warn(`Attempting JSON repair for ${callName}. Open/close braces: ${openBraces}/${closeBraces}. Length: ${rawText.length}`);
      const stack: string[] = [];
      const scanStart = jsonStart === -1 ? 0 : jsonStart;
      for (let i = scanStart; i < rawText.length; i++) {
        const char = rawText[i];
        if (char === '{') stack.push('}');
        else if (char === '[') stack.push(']');
        else if (char === '}' && stack[stack.length - 1] === '}') stack.pop();
        else if (char === ']' && stack[stack.length - 1] === ']') stack.pop();
      }
      const repairSuffix = stack.reverse().join("");
      const repaired = rawText + repairSuffix;
      const repairedStart = repaired.indexOf('{');
      const repairedEnd = repaired.lastIndexOf('}');
      if (repairedStart !== -1 && repairedEnd !== -1) {
        const cleanRepaired = repaired.substring(repairedStart, repairedEnd + 1);
        try {
          parsedObj = JSON.parse(cleanRepaired);
          console.log(`JSON repair succeeded for ${callName} using stack traversal`);
        } catch (repairErr) {
          console.error(`Stack-based JSON repair failed for ${callName}:`, repairErr);
        }
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

    const systemInstructionModel = buildModelAnswerSystemPrompt();
    const userPromptModel = buildModelAnswerUserPrompt({
      subject: resolvedSubject,
      question: rubric.matched && rubric.question_text ? rubric.question_text : question,
      marks: finalMarks,
      studentAnswer,
      rubric
    });

    // Run both calls in parallel!
    const [evalData, modelData] = await Promise.all([
      generateJSONWithFallback(systemInstructionEval, userPromptEval, "Evaluation", finalMarks),
      generateJSONWithFallback(systemInstructionModel, userPromptModel, "ModelAnswer", finalMarks)
    ]);

    const scorePercent = (evalData.marks_awarded / evalData.total_marks) * 100
    const verdict = scorePercent >= 60
      ? "Pass"
      : scorePercent >= 50
      ? "Borderline Pass"
      : "Fail"

    const parsed: EvaluateResponse = {
      marks_awarded: evalData.marks_awarded ?? 0,
      total_marks: evalData.total_marks ?? finalMarks,
      score_percentage: Math.round(scorePercent * 10) / 10,
      verdict,
      deductions: evalData.deductions ?? [],
      model_answer: modelData.model_answer ?? "",
      evaluated_at: new Date().toISOString(),
      question_analysis: evalData.question_analysis ?? {
        question_type: "Unknown",
        relevant_acts: [],
        mandatory_sections: [],
        mandatory_keywords: [],
        expected_case_laws: [],
        expected_structure: ""
      },
      answer_found: evalData.answer_found ?? true,
      answer_identification_note: evalData.answer_identification_note ?? "",
      keywords_found: evalData.keywords_found ?? [],
      keywords_missing: evalData.keywords_missing ?? [],
      sections_found: evalData.sections_found ?? [],
      sections_missing: evalData.sections_missing ?? [],
      acts_found: evalData.acts_found ?? [],
      acts_missing: evalData.acts_missing ?? [],
      examiner_note: evalData.examiner_note ?? "",
      evaluation_summary: evalData.evaluation_summary ?? "",
      correctly_covered_points: evalData.correctly_covered_points ?? [],
      missing_points: evalData.missing_points ?? [],
      missing_keywords: evalData.missing_keywords ?? [],
      irrelevant_content: evalData.irrelevant_content ?? [],
      mark_deduction_analysis: evalData.mark_deduction_analysis ?? [],
      icsi_examiner_feedback: evalData.icsi_examiner_feedback ?? [],
      what_you_should_add: modelData.what_you_should_add ?? [],
      what_you_should_remove: modelData.what_you_should_remove ?? [],
      writing_analysis: evalData.writing_analysis ?? {
        structure: "",
        presentation: "",
        relevance: "",
        legal_language: "",
        use_of_keywords: "",
        completeness: ""
      },
      strengths: evalData.strengths ?? [],
      weaknesses: evalData.weaknesses ?? [],
      improvement_plan: evalData.improvement_plan ?? []
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
