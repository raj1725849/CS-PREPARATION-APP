import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildFormatIdealAnswerSystemPrompt,
  buildFormatIdealAnswerUserPrompt,
  buildGenerateIdealAnswerSystemPrompt,
  buildGenerateIdealAnswerUserPrompt
} from "@/lib/prompts"
import { parseAiResponse, AiParseError } from "@/lib/json-parser"
import { evaluateWithOpenRouter } from "@/lib/openrouter"
import { resolveSubjectName } from "@/lib/subject-map"
import { retrieveRubric } from "@/lib/rubric-retriever"
import { verifyUserAuth } from "@/lib/firebase-server"
import { getQuestionFromFirestore } from "@/lib/question-store"

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
  callName: string
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

  if (!rawText) {
    console.warn(`/api/evaluate/ideal-answer ${callName} Gemini failed, falling back to OpenRouter:`, lastGeminiErr);
    try {
      rawText = await evaluateWithOpenRouter(userPrompt, [], [], systemInstruction);
    } catch (fallbackErr: any) {
      console.error(`/api/evaluate/ideal-answer ${callName} OpenRouter fallback error:`, fallbackErr);
      throw new Error(`Models failed for ${callName}. Gemini Error: ${lastGeminiErr.message}. OpenRouter Error: ${fallbackErr.message}`);
    }
  }

  try {
    return parseAiResponse(rawText);
  } catch (err: any) {
    if (err instanceof AiParseError) {
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

  const { subject, question, questionId, marks, questionNumber } = body;

  if (!subject || typeof question !== "string" || !question.trim() || typeof questionId !== "string" || !questionId.trim()) {
    return NextResponse.json({ 
      error: `Missing required fields: subject, question, questionId. Received: subject=${subject}, question=${!!question}, questionId=${!!questionId}` 
    }, { status: 400 });
  }

  const extractedNum = questionNumber || extractQuestionNumber(question);

  console.log(`[IDEAL_ANSWER_TRACE] Step 1: Received request — questionId=${questionId}, subject=${subject}, uid=${uid}`);

  const resolvedSubject = resolveSubjectName(subject);

  // 1. Check Firestore REST API Cache
  const cacheUrl = `https://firestore.googleapis.com/v1/projects/cs-prep-dashboard-v1/databases/(default)/documents/users/${uid}/ideal_answers/${questionId}`;
  let cachedAnswer = "";

  try {
    const cacheRes = await fetch(cacheUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    if (cacheRes.ok) {
      const docData = await cacheRes.json();
      if (docData.fields && docData.fields.model_answer) {
        cachedAnswer = docData.fields.model_answer.stringValue || "";
      }
    }
  } catch (cacheErr) {
    console.warn("[IDEAL_ANSWER_TRACE] Failed to check cached ideal answer in Firestore:", cacheErr);
  }

  console.log(`[IDEAL_ANSWER_TRACE] Step 2: Cache ${cachedAnswer ? 'HIT' : 'MISS'} for questionId=${questionId}`);

  if (cachedAnswer) {
    return NextResponse.json({ model_answer: cachedAnswer }, { status: 200 });
  }

  // 2. Fetch question document from Firebase for better rubric matching
  let questionText = question; // fallback to request body
  let questionMarks = marks || 5;
  let questionDocFound = false;

  if (idToken && uid && questionId) {
    const questionDoc = await getQuestionFromFirestore(idToken, uid, questionId);
    console.log(`[IDEAL_ANSWER_TRACE] Step 3: Question document ${questionDoc ? 'FOUND' : 'NOT FOUND'} for questionId=${questionId}`);
    if (questionDoc) {
      questionDocFound = true;
      questionText = questionDoc.questionText || question;
      questionMarks = questionDoc.marks || marks || 5;
    } else {
      console.warn(`[IDEAL_ANSWER_TRACE] Question document not found for questionId=${questionId}, uid=${uid}. Falling back to request body question text.`);
    }
  }

  // 3. Retrieve Rubric using the best available question text
  const rubric = retrieveRubric(resolvedSubject, questionText);
  console.log(`[IDEAL_ANSWER_TRACE] Step 4: Rubric match=${rubric.matched}, similarity=${rubric.similarity.toFixed(2)}`);
  let modelAnswer = "";

  try {
    if (rubric.matched && rubric.expected_answer?.full_answer_summary) {
      console.log("Formatting pre-stored guideline answer with Gemini...");
      const systemPrompt = buildFormatIdealAnswerSystemPrompt();
      const userPrompt = buildFormatIdealAnswerUserPrompt({
        subject: resolvedSubject,
        question: rubric.question_text || questionText,
        marks: rubric.marks || questionMarks,
        guidelineAnswer: rubric.expected_answer.full_answer_summary
      });

      const resData = await generateJSONWithFallback(systemPrompt, userPrompt, "FormatIdealAnswer");
      const formatted = resData.model_answer || "";
      if (formatted) {
        const qNum = rubric.sub_question || extractedNum;
        modelAnswer = qNum ? `**Question ${qNum} Expected Answer:**\n\n${formatted}` : formatted;
      }
    } else {
      console.log("[IDEAL_ANSWER_TRACE] Step 5: Generating model answer from scratch with AI...");
      const systemPrompt = buildGenerateIdealAnswerSystemPrompt();
      const userPrompt = buildGenerateIdealAnswerUserPrompt({
        subject: resolvedSubject,
        question: questionText,
        marks: questionMarks
      });

      const resData = await generateJSONWithFallback(systemPrompt, userPrompt, "GenerateIdealAnswer");
      const generated = resData.model_answer || "";
      if (generated) {
        modelAnswer = extractedNum ? `**Question ${extractedNum} Expected Answer:**\n\n${generated}` : generated;
      }
    }
  } catch (err: any) {
    console.error("Failed to format/generate model answer:", err);
    return NextResponse.json({ 
      error: err instanceof AiParseError ? err.message : `Failed to format/generate model answer: ${err.message}` 
    }, { status: 502 });
  }

  if (!modelAnswer) {
    return NextResponse.json({ error: "Failed to generate model answer" }, { status: 502 });
  }

  // 3. Cache in Firestore in the background
  try {
    const patchBody = {
      fields: {
        model_answer: { stringValue: modelAnswer },
        generatedAt: { stringValue: new Date().toISOString() }
      }
    };
    const patchRes = await fetch(cacheUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patchBody)
    });
    if (patchRes.ok) {
      console.log(`Cached ideal answer in Firestore for user ${uid}, question ${questionId}`);
    } else {
      const errText = await patchRes.text();
      console.warn("Failed to save cached ideal answer to Firestore:", errText);
    }
  } catch (saveErr) {
    console.warn("Error saving cached ideal answer to Firestore:", saveErr);
  }

  return NextResponse.json({ model_answer: modelAnswer }, { status: 200 });
}
