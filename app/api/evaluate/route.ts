import { NextRequest, NextResponse } from "next/server"
import { getEvalModel, getGeminiKeyCount } from "@/lib/gemini"
import {
  buildEvaluateSystemPrompt,
  buildEvaluateUserPrompt
} from "@/lib/prompts"
import { EvaluateRequest, EvaluateResponse, EvaluateError } from "@/lib/types"
import { evaluateWithOpenRouter } from "@/lib/openrouter"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: EvaluateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<EvaluateError>(
      { error: "Invalid JSON body", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const { subject, question, marks, images, mimeTypes } = body

  if (!subject || !question?.trim() || !marks) {
    return NextResponse.json<EvaluateError>(
      { error: "Missing required fields: subject, question, marks", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  if (!images?.length || !mimeTypes?.length) {
    return NextResponse.json<EvaluateError>(
      { error: "At least one answer image is required", code: "NO_IMAGES" },
      { status: 400 }
    )
  }

  if (images.length !== mimeTypes.length) {
    return NextResponse.json<EvaluateError>(
      { error: "images and mimeTypes arrays must be same length", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  if (images.length > 10) {
    return NextResponse.json<EvaluateError>(
      { error: "Maximum 10 images allowed per evaluation", code: "INVALID_REQUEST" },
      { status: 400 }
    )
  }

  const userPrompt = buildEvaluateUserPrompt({ subject, question, marks })

  const parts = [
    { text: userPrompt },
    ...images.map((imageBase64, i) => ({
      inlineData: {
        data: imageBase64,
        mimeType: mimeTypes[i] || "image/jpeg"
      }
    }))
  ]

  try {
    const systemInstruction = buildEvaluateSystemPrompt()

    let result;
    let lastGeminiErr;
    const maxRetries = getGeminiKeyCount();

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = getEvalModel()
        result = await model.generateContent({
          systemInstruction,
          contents: [{ role: "user", parts }]
        })
        break; // Success!
      } catch (err: any) {
        lastGeminiErr = err;
        console.warn(`Gemini attempt ${i + 1}/${maxRetries} failed:`, err.message);
      }
    }

    if (!result) {
      throw lastGeminiErr;
    }

    let rawText = result.response.text().trim()

    // Detect truncated response — JSON cut off before closing
    const openBraces = (rawText.match(/\{/g) || []).length
    const closeBraces = (rawText.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      console.error(
        `Truncated JSON detected — ${openBraces} opening braces, ` +
        `${closeBraces} closing braces. Response length: ${rawText.length} chars`
      )
      // Attempt to repair by closing all open structures
      const deficit = openBraces - closeBraces
      const repaired = rawText + "]}".repeat(deficit)
      console.log("Attempted repair:", repaired.slice(-100))
      
      // Try parsing the repaired version
      try {
        const reparsed = JSON.parse(repaired)
        console.log("Repair succeeded")
        // Overwrite rawText with repaired version so string extraction logic down below works,
        // or actually since the repair is already parsed, we could just stringify it again.
        rawText = repaired;
      } catch {
        console.error("Repair failed — response too truncated to recover")
        return NextResponse.json<EvaluateError>(
          {
            error: "AI response was cut off. This happens when the answer " +
                   "is very detailed. Please try again.",
            code: "TRUNCATED_RESPONSE"
          },
          { status: 502 }
        )
      }
    }
    
    console.log("=== GEMINI RAW (first 800 chars) ===")
    console.log(rawText.slice(0, 800))
    console.log("Response length:", rawText.length, "chars")
    console.log("Open braces:", openBraces, "| Close braces:", closeBraces)
    console.log("====================================")

    let parsed: EvaluateResponse
    try {
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON structure found in response");
      }
      const cleanJson = rawText.substring(jsonStart, jsonEnd + 1);

      const raw = JSON.parse(cleanJson)

      const scorePercent = (raw.marks_awarded / raw.total_marks) * 100
      const verdict = scorePercent >= 60
        ? "Pass"
        : scorePercent >= 50
        ? "Borderline Pass"
        : "Fail"

      const parseResult = (rawObj: any): EvaluateResponse => ({
        marks_awarded: rawObj.marks_awarded ?? 0,
        total_marks: rawObj.total_marks ?? marks,
        score_percentage: Math.round(scorePercent * 10) / 10,
        verdict,
        deductions: rawObj.deductions ?? [],
        model_answer: rawObj.model_answer ?? "",
        evaluated_at: new Date().toISOString(),
        question_analysis: rawObj.question_analysis ?? {
          question_type: "Unknown",
          relevant_acts: [],
          mandatory_sections: [],
          mandatory_keywords: [],
          expected_case_laws: [],
          expected_structure: ""
        },
        answer_found: rawObj.answer_found ?? true,
        answer_identification_note: rawObj.answer_identification_note ?? "",
        keywords_found: rawObj.keywords_found ?? [],
        keywords_missing: rawObj.keywords_missing ?? [],
        sections_found: rawObj.sections_found ?? [],
        sections_missing: rawObj.sections_missing ?? [],
        acts_found: rawObj.acts_found ?? [],
        acts_missing: rawObj.acts_missing ?? [],
        examiner_note: rawObj.examiner_note ?? ""
      });

      parsed = parseResult(raw);
    } catch (parseErr) {
      console.error("Failed to parse Gemini evaluation JSON:", rawText)
      return NextResponse.json<EvaluateError>(
        { error: "Failed to parse evaluation response from AI", code: "PARSE_ERROR" },
        { status: 502 }
      )
    }

    return NextResponse.json(parsed, { status: 200 })

  } catch (geminiErr: unknown) {
    console.warn("/api/evaluate Gemini failed, falling back to OpenRouter:", geminiErr)
    
    try {
      const systemInstruction = buildEvaluateSystemPrompt()
      const rawText = await evaluateWithOpenRouter(userPrompt, images, mimeTypes, systemInstruction)
      
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON structure found in response");
      }
      const cleanJson = rawText.substring(jsonStart, jsonEnd + 1);

      const rawObj = JSON.parse(cleanJson)
      const scorePercent = (rawObj.marks_awarded / rawObj.total_marks) * 100
      const verdict = scorePercent >= 60 ? "Pass" : scorePercent >= 50 ? "Borderline Pass" : "Fail"

      const parsed: EvaluateResponse = {
        marks_awarded: rawObj.marks_awarded ?? 0,
        total_marks: rawObj.total_marks ?? marks,
        score_percentage: Math.round(scorePercent * 10) / 10,
        verdict,
        deductions: rawObj.deductions ?? [],
        model_answer: rawObj.model_answer ?? "",
        evaluated_at: new Date().toISOString(),
        question_analysis: rawObj.question_analysis ?? {
          question_type: "Unknown",
          relevant_acts: [],
          mandatory_sections: [],
          mandatory_keywords: [],
          expected_case_laws: [],
          expected_structure: ""
        },
        answer_found: rawObj.answer_found ?? true,
        answer_identification_note: rawObj.answer_identification_note ?? "",
        keywords_found: rawObj.keywords_found ?? [],
        keywords_missing: rawObj.keywords_missing ?? [],
        sections_found: rawObj.sections_found ?? [],
        sections_missing: rawObj.sections_missing ?? [],
        acts_found: rawObj.acts_found ?? [],
        acts_missing: rawObj.acts_missing ?? [],
        examiner_note: rawObj.examiner_note ?? ""
      }

      return NextResponse.json(parsed, { status: 200 })

    } catch (fallbackErr: any) {
      console.error("/api/evaluate OpenRouter fallback error:", fallbackErr)
      return NextResponse.json<EvaluateError>(
        { error: `Models failed. Gemini Error: ${(geminiErr as Error).message}. OpenRouter Error: ${fallbackErr.message}`, code: "GEMINI_ERROR" },
        { status: 502 }
      )
    }
  }
}
