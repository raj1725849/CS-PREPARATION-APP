import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildFormatIdealAnswerSystemPrompt,
  buildFormatIdealAnswerUserPrompt,
  buildGenerateIdealAnswerSystemPrompt,
  buildGenerateIdealAnswerUserPrompt
} from "@/lib/prompts"
import { evaluateWithOpenRouter } from "@/lib/openrouter"
import { resolveSubjectName } from "@/lib/subject-map"
import { retrieveRubric } from "@/lib/rubric-retriever"
import { verifyUserAuth } from "@/lib/firebase-server"

export const maxDuration = 60

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

  let parsedObj: any = null;
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

  // Basic brace repair
  if (!parsedObj && jsonStart !== -1) {
    const s = rawText.substring(jsonStart);
    let inString = false;
    let isEscaped = false;
    const stack: ('{' | '[')[] = [];
    for (let i = 0; i < s.length; i++) {
      const char = s[i];
      if (isEscaped) { isEscaped = false; continue; }
      if (char === '\\') { isEscaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{' || char === '[') stack.push(char);
        else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
        else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
      }
    }
    let repaired = s;
    if (inString) repaired += '"';
    let suffix = "";
    for (let j = stack.length - 1; j >= 0; j--) {
      suffix += stack[j] === '{' ? '}' : ']';
    }
    repaired += suffix;
    try {
      parsedObj = JSON.parse(repaired);
    } catch (err) {
      console.error(`Repair failed for ${callName}`);
    }
  }

  if (!parsedObj) {
    throw new Error(`AI response for ${callName} was cut off or invalid JSON.`);
  }

  return parsedObj;
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

  const { subject, question, questionId, marks } = body;

  if (!subject || typeof question !== "string" || !question.trim() || typeof questionId !== "string" || !questionId.trim() || marks === undefined || marks === null) {
    return NextResponse.json({ 
      error: `Missing required fields: subject, question, questionId, marks. Received: subject=${subject}, question=${!!question}, questionId=${!!questionId}, marks=${marks}` 
    }, { status: 400 });
  }

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
    console.warn("Failed to check cached ideal answer in Firestore:", cacheErr);
  }

  if (cachedAnswer) {
    console.log(`Cache HIT for user ${uid}, question ${questionId}`);
    return NextResponse.json({ model_answer: cachedAnswer }, { status: 200 });
  }

  console.log(`Cache MISS for user ${uid}, question ${questionId}. Fetching/generating...`);

  // 2. Retrieve Rubric
  const rubric = retrieveRubric(resolvedSubject, question);
  let modelAnswer = "";

  try {
    if (rubric.matched && rubric.expected_answer?.full_answer_summary) {
      console.log("Formatting pre-stored guideline answer with Gemini...");
      const systemPrompt = buildFormatIdealAnswerSystemPrompt();
      const userPrompt = buildFormatIdealAnswerUserPrompt({
        subject: resolvedSubject,
        question: rubric.question_text || question,
        marks: rubric.marks || marks,
        guidelineAnswer: rubric.expected_answer.full_answer_summary
      });

      const resData = await generateJSONWithFallback(systemPrompt, userPrompt, "FormatIdealAnswer");
      const formatted = resData.model_answer || "";
      if (formatted) {
        modelAnswer = `**Question ${rubric.sub_question} Expected Answer:**\n\n${formatted}`;
      }
    } else {
      console.log("Generating model answer from scratch with Gemini...");
      const systemPrompt = buildGenerateIdealAnswerSystemPrompt();
      const userPrompt = buildGenerateIdealAnswerUserPrompt({
        subject: resolvedSubject,
        question: question,
        marks: marks
      });

      const resData = await generateJSONWithFallback(systemPrompt, userPrompt, "GenerateIdealAnswer");
      modelAnswer = resData.model_answer || "";
    }
  } catch (err: any) {
    console.error("Failed to format/generate model answer:", err);
    return NextResponse.json({ error: `Failed to format/generate model answer: ${err.message}` }, { status: 502 });
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
