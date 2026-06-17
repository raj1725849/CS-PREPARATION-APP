import fs from "fs";
import path from "path";

export interface RubricExpectedAnswer {
  key_points: string[];
  legal_provisions: string[];
  full_answer_summary: string;
}

export interface RubricEvaluationCriteria {
  full_marks: string;
  good: string;
  partial: string;
  minimal: string;
}

export interface RubricSubQuestion {
  sub_question: string;
  question_text: string;
  marks: number;
  expected_answer: RubricExpectedAnswer;
  evaluation_criteria: RubricEvaluationCriteria;
  case_context?: string; // Stored from parent
}

export interface RubricMatchResult {
  matched: boolean;
  sub_question?: string;
  question_text?: string;
  marks?: number;
  case_context?: string;
  expected_answer?: RubricExpectedAnswer;
  evaluation_criteria?: RubricEvaluationCriteria;
  similarity: number;
}

const EVALUATION_DIR = path.join(process.cwd(), "evalution");

// Word-based Jaccard similarity for matching questions
function getWordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function computeSimilarity(text1: string, text2: string): number {
  const set1 = getWordSet(text1);
  const set2 = getWordSet(text2);
  if (set1.size === 0 || set2.size === 0) return 0;
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

export function retrieveRubric(
  subject: string,
  questionText: string
): RubricMatchResult {
  const sub = subject.toLowerCase().trim();
  let filename = "";

  if (sub.includes("company law")) {
    filename = "company law .json";
  } else if (
    sub.includes("jigl") ||
    sub.includes("jurisprudence") ||
    sub.includes("industrial")
  ) {
    filename = "jigl grp1.json";
  } else {
    // Attempt fallback to find any file in the directory
    return { matched: false, similarity: 0 };
  }

  const filePath = path.join(EVALUATION_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Evaluation rubric file not found: ${filePath}`);
    return { matched: false, similarity: 0 };
  }

  try {
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const rubricData = JSON.parse(rawContent);

    let bestMatch: RubricSubQuestion | null = null;
    let maxSimilarity = 0;
    let matchedCaseContext = "";

    if (rubricData.questions && Array.isArray(rubricData.questions)) {
      for (const question of rubricData.questions) {
        const caseContext = question.case_context || "";
        if (question.sub_questions && Array.isArray(question.sub_questions)) {
          for (const subQ of question.sub_questions) {
            const sim = computeSimilarity(questionText, subQ.question_text);
            if (sim > maxSimilarity) {
              maxSimilarity = sim;
              bestMatch = subQ;
              matchedCaseContext = caseContext;
            }
          }
        }
      }
    }

    // Similarity threshold of 0.25 for a valid match
    if (bestMatch && maxSimilarity >= 0.25) {
      return {
        matched: true,
        sub_question: bestMatch.sub_question,
        question_text: bestMatch.question_text,
        marks: bestMatch.marks,
        case_context: matchedCaseContext || undefined,
        expected_answer: bestMatch.expected_answer,
        evaluation_criteria: bestMatch.evaluation_criteria,
        similarity: maxSimilarity,
      };
    }
  } catch (err) {
    console.error(`Error loading or parsing rubric file ${filename}:`, err);
  }

  return { matched: false, similarity: 0 };
}
