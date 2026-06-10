import { NextRequest, NextResponse } from "next/server"
import { getFlashModel } from "@/lib/gemini"
import { readSubjectPdf } from "@/lib/pdf-utils"
import { buildGeneratePrompt } from "@/lib/prompts"
import { GenerateRequest, GenerateResponse, GenerateError } from "@/lib/types"
import { generateWithOpenRouter } from "@/lib/openrouter"

export const maxDuration = 60

export async function POST(req: NextRequest) {
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
    const model = getFlashModel()
    const result = await model.generateContent(prompt)
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
