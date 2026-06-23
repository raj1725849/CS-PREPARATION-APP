export class AiParseError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = "AiParseError";
    this.rawResponse = rawResponse;
  }
}

/**
 * Repairs unescaped newlines and control characters inside JSON strings
 * before passing to JSON.parse().
 */
export function repairJsonStrings(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let result = '';
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (char === '\\' && !isEscaped) {
      isEscaped = true;
      result += char;
    } else {
      if (inString && (char === '\n' || char === '\r' || char === '\t')) {
        if (char === '\n') result += '\\n';
        else if (char === '\r') result += '\\r';
        else if (char === '\t') result += '\\t';
      } else {
        result += char;
      }
      isEscaped = false;
    }
  }
  return result;
}

/**
 * Automatically repairs truncated JSON strings by closing open quotes, brackets, and braces.
 */
export function repairTruncatedJson(jsonStr: string): string {
  let result = jsonStr.trim();
  let inString = false;
  let isEscaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (inString) {
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else if (char === '"' && !isEscaped) {
        inString = false;
      } else {
        isEscaped = false;
      }
    } else {
      if (char === '"') {
        inString = true;
        isEscaped = false;
      } else if (char === '{') {
        stack.push('{');
      } else if (char === '[') {
        stack.push('[');
      } else if (char === '}') {
        stack.pop();
      } else if (char === ']') {
        stack.pop();
      }
    }
  }

  if (inString) {
    result += '"';
  }

  result = result.trim();
  if (result.endsWith(',')) {
    result = result.slice(0, -1).trim();
  }

  // Remove incomplete key-value structures at the cut-off point
  result = result.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  result = result.replace(/,\s*"[^"]*"\s*$/, "");

  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') {
      result += '}';
    } else if (open === '[') {
      result += ']';
    }
  }

  return result;
}

/**
 * Safely parses an AI response into a JSON object.
 * Removes markdown fences, repairs unescaped characters, handles truncation errors,
 * and optionally validates the schema.
 * 
 * @param rawText The raw string response from Gemini/OpenRouter.
 * @param validator Optional function to validate the parsed object. Should return true if valid, or throw/return false.
 * @returns The parsed and validated JSON object.
 * @throws AiParseError with the raw text if parsing or validation fails.
 */
export function parseAiResponse<T = any>(
  rawText: string,
  validator?: (data: any) => boolean
): T {
  if (!rawText || !rawText.trim()) {
    throw new AiParseError("AI returned an empty response.", rawText);
  }

  let cleanJson = rawText.trim();

  // 1. Remove markdown fences
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```(json)?\n?/, "").trim();
    cleanJson = cleanJson.replace(/\n?```$/, "").trim();
  }

  // 2. Repair common structural issues (unescaped newlines)
  cleanJson = repairJsonStrings(cleanJson);

  // 3. Try parsing
  let parsedData: any;
  try {
    parsedData = JSON.parse(cleanJson);
  } catch (err: any) {
    // Attempt to repair the JSON if it looks truncated or if parsing failed
    console.warn("[JSON Parser] Initial parse failed, attempting auto-repair...");
    try {
      const repairedJson = repairTruncatedJson(cleanJson);
      parsedData = JSON.parse(repairedJson);
      console.log("[JSON Parser] Auto-repair successful! Parsed partial data.");
    } catch (repairErr: any) {
      const lastChar = cleanJson[cleanJson.length - 1];
      const isTruncated = (lastChar !== '}' && lastChar !== ']') || 
                          err.message.toLowerCase().includes("unterminated string") || 
                          err.message.toLowerCase().includes("unexpected end of json");
      
      let userFriendlyMessage = "Failed to parse AI response. The response may be malformed.";
      if (isTruncated) {
        userFriendlyMessage = "AI generation was truncated or incomplete. Please try generating fewer questions or a smaller paper.";
      }

      console.error("[JSON Parser] Parse Failed after repair attempt:", err.message);
      console.error(`[JSON Parser] Raw string length: ${rawText.length}. Ends with: ${rawText.substring(rawText.length - 100)}`);
      
      throw new AiParseError(userFriendlyMessage, rawText);
    }
  }

  // 4. Validate schema
  if (validator) {
    try {
      const isValid = validator(parsedData);
      if (!isValid) {
        throw new Error("Validation function returned false");
      }
    } catch (err: any) {
      console.error("[JSON Parser] Validation Failed:", err.message);
      throw new AiParseError("Parsed JSON did not match expected schema.", rawText);
    }
  }

  return parsedData as T;
}
