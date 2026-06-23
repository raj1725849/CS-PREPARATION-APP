import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt
} from "@/lib/prompts"
import { parseAiResponse, AiParseError } from "@/lib/json-parser"
import { EvaluateRequest, EvaluateResponse, EvaluateError } from "@/lib/types"
import { evaluateWithOpenRouter } from "@/lib/openrouter"
import { resolveSubjectName } from "@/lib/subject-map"
import { retrieveRubric } from "@/lib/rubric-retriever"
import { extractMarksFromText } from "@/lib/marks-extractor"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"
import {
  generateQuestionId,
  generateEvaluationId,
  computeTextHash,
  saveQuestionToFirestore,
  saveEvaluationToFirestore,
  getQuestionFromFirestore,
  findQuestionByRubricId,
} from "@/lib/question-store"

export const maxDuration = 60

function extractQuestionNumber(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.trim().match(/^(?:Q\.?\s*(\d+(?:\([a-z]\))?)|Question\s+(\d+(?:\([a-z]\))?)|(\d+(?:\([a-z]\))?))\b/i);
  if (!match) return undefined;
  return match[1] || match[2] || match[3];
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

  try {
    return parseAiResponse(rawText);
  } catch (err: any) {
    if (err instanceof AiParseError) {
      // Log to file for debug
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), `evaluate_error_${callName.toLowerCase()}.log`);
        fs.writeFileSync(logPath, `--- ERROR DATE: ${new Date().toISOString()} ---\n${err.rawResponse}\n`, 'utf8');
        console.log(`Wrote raw ${callName} response to evaluate_error_${callName.toLowerCase()}.log`);
      } catch (logErr) {
        console.error("Failed to write raw response log file:", logErr);
      }
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  let uid = "";
  let idToken = "";

  try {
    const authResult = await verifyUserAndEnforceLimit(req, "evaluate");
    uid = authResult.uid;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
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

  const { subject, question, marks, studentAnswer, questionId: incomingQuestionId } = body as EvaluateRequest & { questionId?: string }

  if (!subject || typeof question !== "string" || !question.trim() || typeof studentAnswer !== "string" || !studentAnswer.trim()) {
    return NextResponse.json<EvaluateError>(
      { error: `Missing required fields: subject, question, studentAnswer. Received: subject=${subject}, question=${!!question}, studentAnswer=${!!studentAnswer}`, code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  // Resolve the subject and retrieve the rubric
  const resolvedSubject = resolveSubjectName(subject);
  const rubric = retrieveRubric(resolvedSubject, question);

  // Determine marks: rubric match > user-provided > extract from text > RUBRIC_NOT_FOUND error
  let finalMarks: number;
  if (rubric.matched && rubric.marks) {
    finalMarks = rubric.marks;
  } else if (marks !== undefined && marks !== null) {
    finalMarks = marks;
  } else {
    // Try to extract marks from the question text using robust utility
    const extractedMarks = extractMarksFromText(question);

    if (extractedMarks && !isNaN(extractedMarks) && extractedMarks > 0 && extractedMarks <= 30) {
      finalMarks = extractedMarks;
      console.log(`[EVALUATE] Auto-detected marks from question text: ${finalMarks}`);
    } else {
      // No rubric match AND no marks provided — ask frontend for manual marks
      return NextResponse.json<EvaluateError>(
        { error: "Question not found in our question bank. Please select the marks manually.", code: "RUBRIC_NOT_FOUND" },
        { status: 422 }
      )
    }
  }

  if (rubric.matched) {
    console.log(`Matched rubric: "${rubric.question_text}" (Sub-question: ${rubric.sub_question}, Similarity: ${rubric.similarity.toFixed(2)}, Marks: ${rubric.marks})`);
  } else {
    console.log(`No rubric matched for: "${question}" (Subject: ${resolvedSubject}). Using user-provided marks: ${finalMarks}`);
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

    // ─── Resolve questionId via Firebase ─────────────────────────
    let resolvedQuestionId: string;

    if (incomingQuestionId && idToken && uid) {
      // Frontend passed a known questionId (from a generated paper)
      const existing = await getQuestionFromFirestore(idToken, uid, incomingQuestionId);
      if (existing) {
        resolvedQuestionId = incomingQuestionId;
        console.log(`[EVALUATE] Using existing question doc: ${resolvedQuestionId}`);
      } else {
        // questionId was stale/invalid — create new
        resolvedQuestionId = generateQuestionId();
        console.log(`[EVALUATE] Incoming questionId ${incomingQuestionId} not found in Firebase, creating new: ${resolvedQuestionId}`);
        await saveQuestionToFirestore(idToken, uid, {
          questionId: resolvedQuestionId,
          userId: uid,
          subject: resolvedSubject,
          questionText: question,
          marks: finalMarks,
          source: "manual",
          textHash: computeTextHash(question),
          createdAt: new Date().toISOString(),
        });
      }
    } else if (rubric.matched && rubric.question_id && idToken && uid) {
      // Rubric matched — check if we already have a doc for this rubric question
      const existing = await findQuestionByRubricId(idToken, uid, rubric.question_id);
      if (existing) {
        resolvedQuestionId = existing.questionId;
        console.log(`[EVALUATE] Found existing question for rubric ${rubric.question_id}: ${resolvedQuestionId}`);
      } else {
        resolvedQuestionId = generateQuestionId();
        console.log(`[EVALUATE] Creating question doc for rubric ${rubric.question_id}: ${resolvedQuestionId}`);
        await saveQuestionToFirestore(idToken, uid, {
          questionId: resolvedQuestionId,
          userId: uid,
          subject: resolvedSubject,
          questionText: rubric.question_text || question,
          marks: finalMarks,
          source: "rubric",
          rubricQuestionId: rubric.question_id,
          textHash: computeTextHash(rubric.question_text || question),
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // No rubric match, no prior ID — create new question doc
      resolvedQuestionId = generateQuestionId();
      console.log(`[EVALUATE] No rubric match, no incoming ID. Creating new question: ${resolvedQuestionId}`);
      if (idToken && uid) {
        await saveQuestionToFirestore(idToken, uid, {
          questionId: resolvedQuestionId,
          userId: uid,
          subject: resolvedSubject,
          questionText: question,
          marks: finalMarks,
          source: "manual",
          textHash: computeTextHash(question),
          createdAt: new Date().toISOString(),
        });
      }
    }

    let evalId = "";
    if (idToken && uid) {
      evalId = generateEvaluationId();
    }

    const parsed: EvaluateResponse & { evaluationId?: string } = {
      marks_awarded: evalData.marks_awarded ?? 0,
      total_marks: evalData.total_marks ?? finalMarks,
      score_percentage: Math.round(scorePercent * 10) / 10,
      verdict,
      chapter: evalData.chapter ?? "General",
      improvement_suggestion: evalData.improvement_suggestion ?? "",
      questionId: resolvedQuestionId,
      questionNumber: rubric.matched ? rubric.sub_question : extractQuestionNumber(question),
      deductions: evalData.deductions ?? [],
      strengths: evalData.strengths ?? [],
      missing_points: evalData.missing_points ?? [],
      keywords_missing: evalData.keywords_missing ?? [],
      evaluated_at: new Date().toISOString(),
      evaluationId: evalId || undefined
    };

    // ─── Save evaluation document to Firebase ────────────────────
    if (idToken && uid && evalId) {
      saveEvaluationToFirestore(idToken, uid, {
        evaluationId: evalId,
        userId: uid,
        questionId: resolvedQuestionId,
        subject: resolvedSubject,
        questionText: question,
        studentAnswer,
        marksAwarded: parsed.marks_awarded,
        totalMarks: parsed.total_marks,
        scorePercentage: parsed.score_percentage,
        verdict: parsed.verdict,
        sessionId: "", // will be set by frontend when saving session
        createdAt: new Date().toISOString(),
        // Save full details for mock exam report linking
        chapter: parsed.chapter,
        improvement_suggestion: parsed.improvement_suggestion,
        deductions: parsed.deductions,
        strengths: parsed.strengths,
        missing_points: parsed.missing_points,
        keywords_missing: parsed.keywords_missing,
        model_answer: evalData.model_answer || ""
      } as any).catch((err) => {
        console.error("[EVALUATE] Background evaluation save failed:", err);
      });
    }

    return NextResponse.json(parsed, { status: 200 })

  } catch (err: any) {
    console.error("Evaluation pipeline failed:", err);
    
    const isTruncated = err.message?.includes("cut off") || err.message?.includes("truncated");
    return NextResponse.json<EvaluateError>(
      {
        error: err instanceof AiParseError ? err.message : (isTruncated 
          ? "AI response was cut off. This happens when the answer is very detailed. Please try again."
          : `Evaluation pipeline failed: ${err.message}`),
        code: isTruncated || err instanceof AiParseError ? "TRUNCATED_RESPONSE" : "GEMINI_ERROR"
      },
      { status: 502 }
    )
  }
}
