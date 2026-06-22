import { NextRequest, NextResponse } from "next/server";
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini";
import {
  buildCSExamReadyAnswerSystemPrompt,
  buildCSExamReadyAnswerUserPrompt
} from "@/lib/prompts";
import { parseAiResponse, AiParseError } from "@/lib/json-parser";
import { evaluateWithOpenRouter } from "@/lib/openrouter";
import { resolveSubjectName } from "@/lib/subject-map";
import { retrieveRubric } from "@/lib/rubric-retriever";
import { verifyUserAuth } from "@/lib/firebase-server";
import { getIdealAnswerFromFirestore, saveIdealAnswerToFirestore } from "@/lib/question-store";

export const maxDuration = 60;

async function generateExamReadyAnswer(
  subject: string,
  question: string,
  marks: number,
  sourceMaterial: string
): Promise<string> {
  const systemPrompt = buildCSExamReadyAnswerSystemPrompt();
  const userPrompt = buildCSExamReadyAnswerUserPrompt({
    subject,
    question,
    marks,
    sourceMaterial
  });

  const parts = [{ text: userPrompt }];
  let rawText = "";
  let lastGeminiErr: any = null;
  const maxRetries = getGeminiKeyCount();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const model = getEvalModel();
      const result = await model.generateContent({
        systemInstruction: systemPrompt,
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 20,
          maxOutputTokens: 8192
        }
      });
      rawText = result.response.text().trim();
      break;
    } catch (err: any) {
      lastGeminiErr = err;
      console.warn(`[EXPECTED_ANSWER] Gemini attempt ${i + 1}/${maxRetries} failed:`, err.message);
    }
  }

  if (!rawText) {
    console.warn(`[EXPECTED_ANSWER] Gemini failed, falling back to OpenRouter:`, lastGeminiErr);
    try {
      rawText = await evaluateWithOpenRouter(userPrompt, [], [], systemPrompt);
    } catch (fallbackErr: any) {
      console.error(`[EXPECTED_ANSWER] OpenRouter fallback error:`, fallbackErr);
      throw new Error(`Models failed. Gemini Error: ${lastGeminiErr.message}. OpenRouter Error: ${fallbackErr.message}`);
    }
  }

  try {
    const parsed = parseAiResponse(rawText);
    return parsed.expectedAnswer || "";
  } catch (err) {
    if (err instanceof AiParseError) {
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), `evaluate_error_expectedanswer.log`);
        fs.writeFileSync(logPath, `--- ERROR DATE: ${new Date().toISOString()} ---\n${err.rawResponse}\n`, 'utf8');
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
  const authHeader = req.headers.get("Authorization");

  try {
    const authResult = await verifyUserAuth(req);
    uid = authResult.uid;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || "Unauthorized" }, { status });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { subject, question, questionId, paperId, marks, idealAnswerCode } = body;

  if (!subject || !question || !questionId || !paperId) {
    return NextResponse.json({
      error: `Missing required fields. Received: subject=${!!subject}, question=${!!question}, questionId=${!!questionId}, paperId=${!!paperId}`
    }, { status: 400 });
  }

  const resolvedSubject = resolveSubjectName(subject);
  const resolvedMarks = marks || 5;

  // 1. Check Cache
  try {
    const cached = await getIdealAnswerFromFirestore(idToken, paperId, questionId);
    if (cached && cached.expectedAnswer) {
      console.log(`[EXPECTED_ANSWER] Cache HIT for ${paperId}_${questionId}`);
      return NextResponse.json({ expectedAnswer: cached.expectedAnswer }, { status: 200 });
    }
  } catch (cacheErr) {
    console.warn("[EXPECTED_ANSWER] Cache check error:", cacheErr);
  }

  // 2. Resolve source material
  const rubric = retrieveRubric(resolvedSubject, question);
  let sourceMaterial = "";
  if (rubric.matched && rubric.expected_answer?.full_answer_summary) {
    sourceMaterial = rubric.expected_answer.full_answer_summary;
    console.log(`[EXPECTED_ANSWER] Using matched guideline answer as source`);
  } else {
    sourceMaterial = idealAnswerCode || "No reference answer available.";
    console.log(`[EXPECTED_ANSWER] Using idealAnswerCode fallback`);
  }

  // 3. Generate exam-ready answer
  try {
    const expectedAnswer = await generateExamReadyAnswer(
      resolvedSubject,
      question,
      resolvedMarks,
      sourceMaterial
    );

    // Save to cache asynchronously
    const answerDoc = {
      paperId,
      questionId,
      userId: uid,
      expectedAnswer,
      generatedAt: new Date().toISOString()
    };
    saveIdealAnswerToFirestore(idToken, paperId, questionId, answerDoc).catch((err) => {
      console.error("[EXPECTED_ANSWER] Background cache save failed:", err);
    });

    return NextResponse.json({ expectedAnswer }, { status: 200 });
  } catch (err: any) {
    console.error("[EXPECTED_ANSWER] Generation failed:", err);
    return NextResponse.json({ error: `Generation failed: ${err.message}` }, { status: 502 });
  }
}
