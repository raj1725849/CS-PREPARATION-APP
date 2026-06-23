import { getFlashModel, getGeminiKeyCount } from "./gemini";
import { parseAiResponse } from "./json-parser";
import { extractMarksFromText } from "./marks-extractor";

export interface ParsedQuestion {
  questionId: string;        // unique ID, e.g. "q_1", "q_1a"
  questionNumber: string;    // e.g. "1", "1(a)", "2", "2(b)"
  questionText: string;
  marks: number;
  subpartId?: string;        // e.g. "a", "b" for subpart compatibility
  text?: string;             // subpart raw question text
  subparts?: ParsedQuestion[];
}

export interface StructuredPaper {
  paperId: string;
  totalQuestions: number;
  totalMarks: number;
  questions: ParsedQuestion[];
  warnings: string[];
  missingQuestions: string[];
}

/**
 * Parses the raw pasted question paper text into a structured list of questions using Gemini.
 */
export async function parseQuestionPaper(text: string): Promise<StructuredPaper> {
  const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (!text || !text.trim()) {
    return {
      paperId,
      totalQuestions: 0,
      totalMarks: 0,
      questions: [],
      warnings: ["Empty paper text received"],
      missingQuestions: []
    };
  }

  const prompt = `You are an expert ICSI exam coordinator.
Your task is to take a manually pasted question paper and parse it into a structured JSON list of questions.

PASTED QUESTION PAPER:
"""
${text}
"""

INSTRUCTIONS:
1. Detect all questions and sub-questions (subparts).
2. For each question, extract:
   - "questionNumber": e.g., "1", "1(a)", "Q2", "2(b)"
   - "questionText": The full descriptive text of that question (omit the number and marks from this text).
   - "marks": The marks allocated to this specific question as an integer.
3. If a question has subparts (like Q1 has (a), (b), (c)), list the subparts under the "subparts" array of that question. If there are subparts, ensure their marks are extracted.
4. If a question or subpart has no marks specified in the text, estimate/default it to 5, and we will flag a warning.
5. Return the JSON object matching this schema:
{
  "questions": [
    {
      "questionNumber": "1",
      "questionText": "...",
      "marks": 5,
      "subparts": [
        {
          "questionNumber": "1(a)",
          "questionText": "...",
          "marks": 5
        }
      ]
    }
  ]
}

STRICT RULE: Return ONLY a valid JSON object. No explanations, no markdown fences.`;

  let parsed: { questions: any[] } = { questions: [] };
  let errorMsg = "";

  const maxRetries = getGeminiKeyCount();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const model = getFlashModel();
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      const responseText = result.response.text();
      parsed = parseAiResponse(responseText);
      break;
    } catch (err: any) {
      errorMsg = err.message;
      console.warn(`[PAPER_PARSER] Gemini parse attempt ${i + 1}/${maxRetries} failed:`, err.message);
    }
  }

  // Fallback if parsing failed completely
  if (!parsed || !parsed.questions || parsed.questions.length === 0) {
    console.warn("[PAPER_PARSER] AI parsing failed. Using regex fallback.");
    parsed = regexFallbackParse(text);
  }

  // Flatten and process structure
  const processedQuestions: ParsedQuestion[] = [];
  const warnings: string[] = [];
  
  // Apply Hierarchy Post-Processor
  const groupedQuestions = groupHierarchy(parsed.questions, warnings);
  let calculatedTotalMarks = 0;

  groupedQuestions.forEach((q: any, idx: number) => {
    const qNum = String(q.questionNumber || `Q${idx + 1}`).trim();
    const qText = String(q.questionText || "").trim();
    let qMarks = parseInt(q.marks, 10);
    const hasExplicitParentMarks = !isNaN(qMarks) && qMarks > 0;

    if (isNaN(qMarks) || qMarks <= 0) {
      // Try regex extract from text
      const extracted = extractMarksFromText(qText);
      qMarks = extracted || 5;
      warnings.push(`Marks not clearly detected for Question ${qNum}. Defaulted to ${qMarks} marks.`);
    }

    const questionId = `q_${idx + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    const processedSubparts: ParsedQuestion[] = [];
    if (q.subparts && Array.isArray(q.subparts) && q.subparts.length > 0) {
      q.subparts.forEach((sub: any, sIdx: number) => {
        const subNum = String(sub.questionNumber || `${qNum}(${String.fromCharCode(97 + sIdx)})`).trim();
        const subText = String(sub.questionText || "").trim();
        let subMarks = parseInt(sub.marks, 10);
        let hasExplicitSubMarks = !isNaN(subMarks) && subMarks > 0;

        if (!hasExplicitSubMarks) {
          const extractedSub = extractMarksFromText(subText);
          if (extractedSub) {
            subMarks = extractedSub;
            hasExplicitSubMarks = true;
          }
        }

        const subId = sub.subpartId || String.fromCharCode(97 + sIdx);

        processedSubparts.push({
          questionId: `${questionId}_sub_${sIdx + 1}`,
          questionNumber: subNum,
          questionText: subText,
          subpartId: subId,
          text: subText,
          marks: hasExplicitSubMarks ? subMarks : -1
        });
      });

      if (hasExplicitParentMarks) {
        // Parent marks is specified!
        qMarks = parseInt(q.marks, 10);
        calculatedTotalMarks += qMarks;

        // Resolve any subparts that don't have explicit marks
        const unresolved = processedSubparts.filter(s => s.marks === -1);
        const resolvedSum = processedSubparts.filter(s => s.marks !== -1).reduce((sum, s) => sum + s.marks, 0);

        if (unresolved.length > 0) {
          const remaining = Math.max(0, qMarks - resolvedSum);
          const distributedVal = remaining / unresolved.length;
          processedSubparts.forEach(s => {
            if (s.marks === -1) {
              s.marks = distributedVal;
            }
          });
        }
      } else {
        // Parent marks is NOT specified. We sum up subparts (defaulting missing ones to 5)
        processedSubparts.forEach(s => {
          if (s.marks === -1) {
            s.marks = 5;
            warnings.push(`Marks not clearly detected for subpart ${s.questionNumber}. Defaulted to 5 marks.`);
          }
        });
        qMarks = processedSubparts.reduce((sum, s) => sum + s.marks, 0);
        calculatedTotalMarks += qMarks;
      }
    } else {
      calculatedTotalMarks += qMarks;
    }

    processedQuestions.push({
      questionId,
      questionNumber: qNum,
      questionText: qText,
      marks: qMarks,
      subparts: processedSubparts.length > 0 ? processedSubparts : undefined
    });
  });

  // Gap detection for missing questions
  const missingQuestions = detectMissingQuestionGaps(processedQuestions);

  // General validation warnings
  if (processedQuestions.length === 0) {
    warnings.push("No questions could be parsed from the paper.");
  }
  
  // Check for duplicate question numbers
  const numSet = new Set<string>();
  processedQuestions.forEach(q => {
    if (numSet.has(q.questionNumber)) {
      warnings.push(`Duplicate question number detected: ${q.questionNumber}`);
    }
    numSet.add(q.questionNumber);
  });

  return {
    paperId,
    totalQuestions: processedQuestions.length,
    totalMarks: calculatedTotalMarks,
    questions: processedQuestions,
    warnings,
    missingQuestions
  };
}

function matchQuestionPrefix(line: string): string | null {
  const trimmed = line.trim();
  
  const qPrefixRegex = /^[\s\-\*•]*\(?Q(?:uestion)?\.?\s*(\d+(?:\([a-z0-9]\))?|[a-z](?:\([a-z0-9]\))?|[ivxIVX]+)\)?[\.\):\-]?(?:\s+|$)/i;
  let match = trimmed.match(qPrefixRegex);
  if (match) return match[1];

  const subpartParenRegex = /^[\s\-\*•]*\(?(\d+\([a-z0-9]\)|[a-z]\([a-z0-9]\))[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(subpartParenRegex);
  if (match) return match[1];
  
  const punctRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)\)[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(punctRegex);
  if (match) return match[1];
  
  const dotRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)\.[\.\):\-]?(?:\s+|$)/i;
  match = trimmed.match(dotRegex);
  if (match) return match[1];

  const colonDashRegex = /^[\s\-\*•]*\(?(\d+|[a-z]|[ivxIVX]+)[:\-](?:\s+|$)/i;
  match = trimmed.match(colonDashRegex);
  if (match) return match[1];

  return null;
}

function isSubpartPrefix(prefix: string): boolean {
  const cleaned = prefix.trim().toLowerCase();
  if (/^[a-z]$/.test(cleaned)) {
    return true;
  }
  if (/^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$/.test(cleaned)) {
    return true;
  }
  return false;
}

function parentNumbersMatch(numStrA: string, numStrB: string): boolean {
  const cleanA = numStrA.trim().replace(/^Q(?:uestion)?\.?\s*/i, "").match(/^\d+/);
  const cleanB = numStrB.trim().replace(/^Q(?:uestion)?\.?\s*/i, "").match(/^\d+/);
  if (cleanA && cleanB) {
    return parseInt(cleanA[0], 10) === parseInt(cleanB[0], 10);
  }
  return numStrA.trim().toLowerCase() === numStrB.trim().toLowerCase();
}

function groupHierarchy(rawQuestions: any[], warnings: string[]): any[] {
  const grouped: any[] = [];
  let currentParent: any = null;

  rawQuestions.forEach((q: any) => {
    const qNum = String(q.questionNumber || "").trim();
    
    // 1. Try compound subpart match (e.g. "1(a)", "Q1(a)", "1a")
    const cleanNum = qNum.replace(/^Q(?:uestion)?\.?\s*/i, "");
    const compoundMatch = cleanNum.match(/^(\d+)\(?([a-z])\)?$/i);

    if (compoundMatch) {
      const parentNum = compoundMatch[1];
      const subLetter = compoundMatch[2].toLowerCase();

      let parentQ = grouped.find(g => parentNumbersMatch(g.questionNumber, parentNum));
      if (!parentQ) {
        parentQ = {
          questionNumber: `Q${parentNum}`,
          questionText: `Question ${parentNum}`,
          marks: 5,
          subparts: []
        };
        grouped.push(parentQ);
      }
      
      if (!parentQ.subparts) {
        parentQ.subparts = [];
      }

      parentQ.subparts.push({
        questionNumber: qNum,
        questionText: q.questionText || "",
        marks: q.marks,
        subpartId: subLetter,
        text: q.questionText || ""
      });
      currentParent = parentQ;
      return;
    }

    // 2. Try standalone subpart match (e.g. "a", "(b)", "i.")
    const isSub = isSubpartPrefix(qNum);

    if (isSub) {
      if (currentParent) {
        if (!currentParent.subparts) {
          currentParent.subparts = [];
        }
        const cleanSubpartId = qNum.replace(/[().]/g, "").toLowerCase();
        
        currentParent.subparts.push({
          questionNumber: `${currentParent.questionNumber}(${cleanSubpartId})`,
          questionText: q.questionText || "",
          marks: q.marks,
          subpartId: cleanSubpartId,
          text: q.questionText || ""
        });
      } else {
        warnings.push(`Subpart "${qNum}" detected without a parent question.`);
      }
    } else {
      // 3. Regular main question
      const newQ = {
        ...q,
        subparts: []
      };
      
      if (q.subparts && Array.isArray(q.subparts)) {
        q.subparts.forEach((sub: any) => {
          const subNum = String(sub.questionNumber || "").trim();
          const cleanSubpartId = subNum.replace(/^[^\(]*\(?([a-z0-9]+)\)?.*$/i, "$1").toLowerCase();
          newQ.subparts.push({
            ...sub,
            subpartId: cleanSubpartId || subNum,
            text: sub.questionText || ""
          });
        });
      }
      
      grouped.push(newQ);
      currentParent = newQ;
    }
  });

  return grouped;
}

/**
 * Basic Regex-based line split as a robust fallback.
 */
function regexFallbackParse(text: string): { questions: any[] } {
  const questions: any[] = [];
  const lines = text.split("\n");
  
  let currentQ: any = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const fullNum = matchQuestionPrefix(line);
    if (fullNum) {
      const cleanText = trimmed.replace(/^[\s\-\*•]*\(?(?:Q(?:uestion)?\.?\s*)?(\d+(?:\([a-z0-9]\))?|[a-z](?:\([a-z0-9]\))?|[ivxIVX]+)\)?[\.\):\-]?\s*/i, "").trim();
      const subpartMatch = fullNum.match(/^(\d+)\(?([a-z])\)?$/i);

      if (subpartMatch) {
        const parentNum = subpartMatch[1];
        const subLetter = subpartMatch[2];
        const subNumStr = `${parentNum}(${subLetter.toLowerCase()})`;
        
        let parentQ = questions.find(q => parentNumbersMatch(q.questionNumber, parentNum));
        if (!parentQ) {
          parentQ = {
            questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            questionNumber: parentNum,
            questionText: `Question ${parentNum}`,
            marks: null as any,
            subparts: []
          };
          questions.push(parentQ);
        }
        
        if (!parentQ.subparts) {
          parentQ.subparts = [];
        }

        const marks = extractMarksFromText(trimmed);
        parentQ.subparts.push({
          questionId: `${parentQ.questionId}_sub_${parentQ.subparts.length + 1}`,
          questionNumber: subNumStr,
          questionText: cleanText,
          subpartId: subLetter.toLowerCase(),
          text: cleanText,
          marks: marks as any
        });
        currentQ = parentQ;
      } else if (isSubpartPrefix(fullNum)) {
        if (currentQ) {
          if (!currentQ.subparts) {
            currentQ.subparts = [];
          }
          const subLetter = fullNum.replace(/[().]/g, "").toLowerCase();
          const subNumStr = `${currentQ.questionNumber}(${subLetter})`;
          const marks = extractMarksFromText(trimmed);
          currentQ.subparts.push({
            questionId: `${currentQ.questionId}_sub_${currentQ.subparts.length + 1}`,
            questionNumber: subNumStr,
            questionText: cleanText,
            subpartId: subLetter,
            text: cleanText,
            marks: marks as any
          });
        } else {
          // Orphan subpart inside regex fallback
          const marks = extractMarksFromText(trimmed);
          currentQ = {
            questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            questionNumber: fullNum,
            questionText: cleanText,
            marks: marks as any,
            subparts: []
          };
          questions.push(currentQ);
        }
      } else {
        const marks = extractMarksFromText(trimmed);
        currentQ = {
          questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          questionNumber: fullNum,
          questionText: cleanText,
          marks: marks as any,
          subparts: []
        };
        questions.push(currentQ);
      }
    } else if (currentQ) {
      if (currentQ.subparts && currentQ.subparts.length > 0) {
        const lastSub = currentQ.subparts[currentQ.subparts.length - 1];
        lastSub.questionText += " \n" + trimmed;
        if (lastSub.text !== undefined) {
          lastSub.text += " \n" + trimmed;
        }
      } else {
        currentQ.questionText += " \n" + trimmed;
      }
    }
  });

  // Post-process to remove empty subparts array
  questions.forEach(q => {
    if (q.subparts && q.subparts.length === 0) {
      delete q.subparts;
    }
  });

  return { questions };
}

/**
 * Scans list of questions to identify gaps in numbering (e.g. Q1, Q2, Q4 flags Q3 missing).
 */
function detectMissingQuestionGaps(questions: ParsedQuestion[]): string[] {
  const missing: string[] = [];
  const numbers: number[] = [];

  questions.forEach((q) => {
    // Extract integer prefix from questionNumber, e.g. "Q1" -> 1, "2(a)" -> 2
    const match = q.questionNumber.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (!isNaN(val)) {
        numbers.push(val);
      }
    }
  });

  if (numbers.length === 0) return [];

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  // Check simple gaps in sequence
  for (let i = min; i <= max; i++) {
    if (!numbers.includes(i)) {
      missing.push(`Q${i}`);
    }
  }

  return missing;
}
