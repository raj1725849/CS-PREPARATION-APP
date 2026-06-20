import { NextRequest, NextResponse } from "next/server"
import { getFlashModel, getGeminiKeyCount } from "@/lib/gemini"
import { readSubjectPdf } from "@/lib/pdf-utils"
import { buildGeneratePrompt } from "@/lib/prompts"
import { GenerateRequest, GenerateResponse, GenerateError, ParsedQuestion } from "@/lib/types"
import { generateWithOpenRouter } from "@/lib/openrouter"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"
import {
  generateQuestionId,
  computeTextHash,
  saveQuestionToFirestore,
} from "@/lib/question-store"

export const maxDuration = 60

/**
 * Parse individual questions from a generated ICSI paper.
 * The generate prompt enforces a strict format:
 *   Q1, Q2... with sub-parts (a), (b)... and [X Marks] annotations.
 * This parser extracts each question/sub-question with its marks.
 */
function parseQuestionsFromPaper(paper: string, subject: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = paper.split("\n");

  // Regex patterns for question detection
  // Matches: Q1., Q1, Q.1, Question 1, etc.
  const mainQRegex = /^(?:Q\.?\s*(\d+)|Question\s+(\d+))/i;
  // Matches: (a), (b), (i), (ii), etc. as sub-parts
  const subQRegex = /^\s*\(([a-z]|[ivx]+)\)\s+/i;
  // Matches: [5 Marks], [10 marks], (5 Marks), etc.
  const marksRegex = /[\[\(]\s*(\d+)\s*(?:marks?|m)\s*[\]\)]/i;

  let currentMainQ = "";
  let currentText = "";
  let currentNumber = "";

  function flushQuestion() {
    if (currentText.trim() && currentNumber) {
      // Extract marks from the question text
      const marksMatch = currentText.match(marksRegex);
      const marks = marksMatch ? parseInt(marksMatch[1]) : 5; // default 5

      questions.push({
        questionNumber: currentNumber,
        questionText: currentText.trim(),
        marks,
        questionId: generateQuestionId(),
      });
    }
    currentText = "";
    currentNumber = "";
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip section headers, instructions, and the paper header
    if (/^(SECTION|THE INSTITUTE|EXECUTIVE PROGRAMME|Time|Maximum|All questions|Attempt)/i.test(trimmed)) {
      continue;
    }
    // Skip "OR" choice separators
    if (/^OR$/i.test(trimmed)) continue;
    // Skip "Write short notes" instruction lines
    if (/^Write short notes on/i.test(trimmed)) continue;

    const mainMatch = trimmed.match(mainQRegex);
    if (mainMatch) {
      flushQuestion();
      currentMainQ = mainMatch[1] || mainMatch[2];
      // Check if this line also has a sub-part
      const afterQ = trimmed.replace(mainQRegex, "").trim();
      const subInLine = afterQ.match(/^\.\s*\(([a-z])\)\s*/i);
      if (subInLine) {
        currentNumber = `${currentMainQ}(${subInLine[1].toLowerCase()})`;
        currentText = afterQ.replace(/^\.\s*\([a-z]\)\s*/i, "").trim();
      } else {
        // Check if the rest of the line is a sub-question or the question itself
        const dotAfter = afterQ.replace(/^\.?\s*/, "").trim();
        if (dotAfter) {
          currentNumber = `Q${currentMainQ}`;
          currentText = dotAfter;
        } else {
          currentNumber = `Q${currentMainQ}`;
        }
      }
      continue;
    }

    const subMatch = trimmed.match(subQRegex);
    if (subMatch && currentMainQ) {
      flushQuestion();
      currentNumber = `${currentMainQ}(${subMatch[1].toLowerCase()})`;
      currentText = trimmed.replace(subQRegex, "").trim();
      continue;
    }

    // Continuation line — append to current question
    if (currentNumber) {
      currentText += " " + trimmed;
    }
  }

  // Flush the last question
  flushQuestion();

  console.log(`[GENERATE] Parsed ${questions.length} questions from paper for subject: ${subject}`);
  return questions;
}

/**
 * Save parsed questions to Firebase in the background.
 * Non-blocking — failures are logged but don't break the response.
 */
async function saveQuestionsToFirebase(
  idToken: string,
  uid: string,
  questions: ParsedQuestion[],
  subject: string,
  paperId: string
): Promise<void> {
  const savePromises = questions.map((q) =>
    saveQuestionToFirestore(idToken, uid, {
      questionId: q.questionId,
      userId: uid,
      subject,
      questionText: q.questionText,
      marks: q.marks,
      source: "generated",
      paperId,
      textHash: computeTextHash(q.questionText),
      createdAt: new Date().toISOString(),
    })
  );

  const results = await Promise.allSettled(savePromises);
  const saved = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.length - saved;
  console.log(`[GENERATE] Firebase save: ${saved} questions saved, ${failed} failed for paper ${paperId}`);
}

export async function POST(req: NextRequest) {
  let uid = "";
  let idToken = "";

  try {
    const authResult = await verifyUserAndEnforceLimit(req, "generate");
    uid = authResult.uid;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json<GenerateError>(
      { error: err.message || "Unauthorized", code: "INVALID_REQUEST" },
      { status }
    );
  }

  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<GenerateError>(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const { subject, scope, topic, questionTypes, marks, difficulty } = body

  if (!subject || !scope || !questionTypes?.length || !marks || !difficulty) {
    return NextResponse.json<GenerateError>(
      { error: "Missing required fields: subject, scope, questionTypes, marks, difficulty", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  if (scope === "topic" && !topic?.trim()) {
    return NextResponse.json<GenerateError>(
      { error: "Topic is required when scope is 'topic'", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  let pdfContext = ""
  try {
    pdfContext = await readSubjectPdf(subject, 20000)
  } catch (err) {
    console.warn("PDF read failed — generating without context:", err)
  }

  const prompt = buildGeneratePrompt({
    subject, scope, topic, questionTypes, marks, difficulty, pdfContext
  })

  // Generate a paperId for linking questions back to this session
  const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    let result;
    let lastGeminiErr;
    const maxRetries = getGeminiKeyCount();

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = getFlashModel()
        result = await model.generateContent(prompt)
        break; // Success!
      } catch (err: any) {
        lastGeminiErr = err;
        console.warn(`Gemini attempt ${i + 1}/${maxRetries} failed:`, err.message);
      }
    }

    if (!result) {
      throw lastGeminiErr;
    }

    const paper = result.response.text()

    if (!paper?.trim()) {
      return NextResponse.json<GenerateError>(
        { error: "Gemini returned empty response", code: "GEMINI_ERROR" },
        { status: 502 }
      )
    }

    // Parse individual questions from the paper
    const parsedQuestions = parseQuestionsFromPaper(paper, subject);

    // Save questions to Firebase (non-blocking, best-effort)
    if (idToken && uid && parsedQuestions.length > 0) {
      saveQuestionsToFirebase(idToken, uid, parsedQuestions, subject, paperId).catch((err) => {
        console.error("[GENERATE] Background Firebase save failed:", err);
      });
    }

    const response: GenerateResponse = {
      paper,
      subject,
      generatedAt: new Date().toISOString(),
      questions: parsedQuestions,
    }

    return NextResponse.json(response, { status: 200 })

  } catch (geminiErr: unknown) {
    console.warn("/api/generate Gemini failed, falling back to OpenRouter:", geminiErr)
    
    try {
      const fallbackPaper = await generateWithOpenRouter(prompt)
      
      if (!fallbackPaper?.trim()) {
        throw new Error("OpenRouter returned empty response")
      }

      // Parse individual questions from the fallback paper too
      const parsedQuestions = parseQuestionsFromPaper(fallbackPaper, subject);

      // Save questions to Firebase (non-blocking, best-effort)
      if (idToken && uid && parsedQuestions.length > 0) {
        saveQuestionsToFirebase(idToken, uid, parsedQuestions, subject, paperId).catch((err) => {
          console.error("[GENERATE] Background Firebase save failed (fallback):", err);
        });
      }

      const response: GenerateResponse = {
        paper: fallbackPaper,
        subject,
        generatedAt: new Date().toISOString(),
        questions: parsedQuestions,
      }

      return NextResponse.json(response, { status: 200 })

    } catch (fallbackErr: any) {
      console.error("/api/generate OpenRouter fallback error:", fallbackErr)
      return NextResponse.json<GenerateError>(
        { error: `Models failed. Gemini Error: ${(geminiErr as Error).message}. OpenRouter Error: ${fallbackErr.message}`, code: "GEMINI_ERROR" },
        { status: 502 }
      )
    }
  }
}
