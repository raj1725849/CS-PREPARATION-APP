import { NextRequest, NextResponse } from "next/server"
import { getFlashModel, getGeminiKeyCount } from "@/lib/gemini"
import { readSubjectPdf } from "@/lib/pdf-utils"
import { buildGeneratePrompt } from "@/lib/prompts"
import { GenerateRequest, GenerateResponse, GenerateError } from "@/lib/types"
import { generateWithOpenRouter } from "@/lib/openrouter"
import { verifyUserAndEnforceLimit } from "@/lib/firebase-server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    await verifyUserAndEnforceLimit(req, "generate");
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

    const response: GenerateResponse = {
      paper,
      subject,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (geminiErr: unknown) {
    console.warn("/api/generate Gemini failed, falling back to OpenRouter:", geminiErr)
    
    try {
      const fallbackPaper = await generateWithOpenRouter(prompt)
      
      if (!fallbackPaper?.trim()) {
        throw new Error("OpenRouter returned empty response")
      }

      const response: GenerateResponse = {
        paper: fallbackPaper,
        subject,
        generatedAt: new Date().toISOString()
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
