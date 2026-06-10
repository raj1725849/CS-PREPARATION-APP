import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"

let keyIndex = 0

function getGenAI(): GoogleGenerativeAI {
  const keys = [
    process.env.gemini_api_key1,
    process.env.gemini_api_key2,
    process.env.gemini_api_key3,
    process.env.gemini_api_key4
  ].filter(Boolean) as string[]

  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys found. " +
      "Add gemini_api_key1, gemini_api_key2, etc. to .env."
    )
  }

  // Rotate key
  const apiKey = keys[keyIndex % keys.length]
  keyIndex++

  return new GoogleGenerativeAI(apiKey)
}

export function getFlashModel(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
    }
  })
}

export function getGeminiKeyCount(): number {
  return [
    process.env.gemini_api_key1,
    process.env.gemini_api_key2,
    process.env.gemini_api_key3,
    process.env.gemini_api_key4
  ].filter(Boolean).length || 1;
}

export function getEvalModel(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 8192,
    }
  })
}
