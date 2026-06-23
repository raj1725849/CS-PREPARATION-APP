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

  const { images, mimeTypes } = body

  if (!images?.length || !mimeTypes?.length) {
    return NextResponse.json(
      { error: "At least one answer image is required" },
      { status: 400 }
    )
  }

  if (images.length !== mimeTypes.length) {
    return NextResponse.json(
      { error: "images and mimeTypes arrays must be same length" },
      { status: 400 }
    )
  }

  const prompt = `Extract the handwritten answer from the image(s) exactly as written.
Preserve paragraph structure, spacing, bullet points, and numbering.
Do not summarize, do not grade, and do not provide any feedback.

Return the output strictly in a valid JSON format with two fields:
- 'text' (string): The exact extracted text. Use \\n for line breaks.
- 'unclear' (boolean): A flag indicating if significant portions of the answer are illegible, blurry, cut-off, or difficult to read.

JSON format:
{
  "text": "extracted text here",
  "unclear": false
}`;

  const parts = [
    { text: prompt },
    ...images.map((imageBase64: string, i: number) => ({
      inlineData: {
        data: imageBase64,
        mimeType: mimeTypes[i] || "image/jpeg"
      }
    }))
  ];

  try {
    let result;
    let lastGeminiErr;
    const maxRetries = getGeminiKeyCount();

    for (let i = 0; i < maxRetries; i++) {
      try {
        const model = getFlashModel()
        result = await model.generateContent({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
        break; // Success!
      } catch (err: any) {
        lastGeminiErr = err;
        console.warn(`Gemini extract attempt ${i + 1}/${maxRetries} failed:`, err.message);
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

    let text = "";
    let unclear = false;

    try {
      const parsed = parseAiResponse<{ text: string, unclear: boolean }>(responseText);
      text = parsed.text || "";
      unclear = !!parsed.unclear;
    } catch (parseErr: any) {
      console.warn("All JSON parsing attempts failed in /api/extract:", parseErr.message);
      
      if (parseErr instanceof AiParseError) {
        // Fallback: if we completely fail to parse JSON for OCR extraction, 
        // we can just return the raw text cleaned up instead of crashing.
        let raw = parseErr.rawResponse || responseText;
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```(json)?/, "").trim();
          raw = raw.replace(/```$/, "").trim();
        }
        text = raw;
      } else {
        text = responseText.trim();
      }
    }

    return NextResponse.json({ text, unclear }, { status: 200 })

  } catch (geminiErr: any) {
    console.error("/api/extract error:", geminiErr);
    return NextResponse.json(
      { error: `Gemini extraction failed: ${geminiErr.message}` },
      { status: 502 }
    )
  }
}
