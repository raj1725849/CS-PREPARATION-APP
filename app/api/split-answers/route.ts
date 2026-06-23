import { NextRequest, NextResponse } from "next/server"
import { getFlashModel, getGeminiKeyCount } from "@/lib/gemini"
import { verifyUserAuth } from "@/lib/firebase-server"
import { parseAiResponse, AiParseError } from "@/lib/json-parser"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user
    await verifyUserAuth(req);
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status }
    );
  }

  let body;
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { bulkText, questions } = body

  if (typeof bulkText !== "string" || !bulkText.trim()) {
    return NextResponse.json(
      { error: "bulkText is required as a non-empty string" },
      { status: 400 }
    )
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: "questions list is required as a non-empty array" },
      { status: 400 }
    )
  }

  // Build prompt for Gemini to auto-split the bulk text
  const questionsPromptText = questions
    .map((q: any) => `- ID: "${q.questionId}", Number: "${q.questionNumber}", Text: "${q.questionText}", Marks: ${q.marks}`)
    .join("\n");

  const prompt = `You are an expert ICSI exam coordinator.
You are given the transcribed text from a student's handwritten exam answer sheet, and a list of questions that were on the exam paper.

Your task is to segment the transcribed text and assign the corresponding answer text to each question ID.

QUESTIONS ON THE EXAM:
${questionsPromptText}

TRANSCRIBED STUDENT ANSWER SHEET (BULK TEXT):
${bulkText}

INSTRUCTIONS:
1. Identify which parts of the bulk text correspond to the answer for each question.
2. If the student has clearly labeled the answer (e.g. "Ans to Q2", "1(a)", etc.), use that label to map it. 
3. If there are no clear labels, analyze the legal and factual context of the text to match it to the most relevant question.
4. Extract the EXACT answer text. Do not summarize, do not correct spelling/grammar, and do not evaluate. Preserve line breaks and paragraph structure.
5. If the student did not attempt a question (no matching text is found in the sheet), return an empty string "" for its answer.
6. Return the output STRICTLY as a JSON array of objects with fields 'questionId' and 'studentAnswer'.

JSON Output format:
[
  {
    "questionId": "question_id_here",
    "studentAnswer": "exact extracted answer text..."
  }
]`;

  try {
    let result;
    let lastGeminiErr;
    const maxRetries = getGeminiKeyCount();

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = getFlashModel()
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1, // low temperature for high precision mapping
            maxOutputTokens: 8192
          }
        })
        break; // Success!
      } catch (err: any) {
        lastGeminiErr = err;
        console.warn(`Gemini split attempt ${i + 1}/${maxRetries} failed:`, err.message);
      }
    }

    if (!result) {
      throw lastGeminiErr;
    }

    const responseText = result.response.text();
    if (!responseText?.trim()) {
      return NextResponse.json(
        { error: "Gemini returned empty response" },
        { status: 502 }
      )
    }

    let parsedArray: any;
    try {
      parsedArray = parseAiResponse(responseText, (data) => Array.isArray(data));
    } catch (parseErr: any) {
      throw parseErr;
    }

    return NextResponse.json(parsedArray, { status: 200 })

  } catch (geminiErr: any) {
    console.error("/api/split-answers error:", geminiErr);
    
    if (geminiErr instanceof AiParseError) {
      return NextResponse.json(
        { error: geminiErr.message },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: `Gemini answer splitting failed: ${geminiErr.message}` },
      { status: 502 }
    )
  }
}
