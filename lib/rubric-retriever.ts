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

// Convert subject string to its slug folder name
function getSubjectSlug(subject: string): string {
  const sub = subject.toLowerCase().trim();
  if (sub.includes("company")) {
    return "company-law";
  } else if (
    sub.includes("jigl") ||
    sub.includes("jurisprudence") ||
    sub.includes("general laws")
  ) {
    return "jurisprudence-interpretation-general-laws";
  } else if (
    sub.includes("setting up") ||
    sub.includes("sbec") ||
    sub.includes("sbill") ||
    sub.includes("industrial")
  ) {
    return "setting-up-of-business";
  } else if (
    sub.includes("corporate accounting") ||
    sub.includes("accounting") ||
    sub.includes("cafm") ||
    sub.includes("cma")
  ) {
    return "corporate-accounting";
  } else if (
    sub.includes("securities") ||
    sub.includes("capital market") ||
    sub.includes("slcm") ||
    sub.includes("cmsl")
  ) {
    return "securities-law";
  } else if (
    sub.includes("economic") ||
    sub.includes("commercial") ||
    sub.includes("ebcl") ||
    sub.includes("ecipl")
  ) {
    return "economic-commercial-laws";
  } else if (
    sub.includes("tax") ||
    sub.includes("tlp") ||
    sub.includes("tl")
  ) {
    return "tax-laws";
  }
  return "";
}

export function retrieveRubric(
  subject: string,
  questionText: string
): RubricMatchResult {
  const slug = getSubjectSlug(subject);
  if (!slug) {
    return { matched: false, similarity: 0 };
  }

  const subjectDir = path.join(EVALUATION_DIR, slug);
  let filesToRead: string[] = [];

  // 1. Gather all JSON files in the subject's slug directory
  if (fs.existsSync(subjectDir) && fs.statSync(subjectDir).isDirectory()) {
    try {
      const files = fs.readdirSync(subjectDir);
      filesToRead = files
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(subjectDir, f));
    } catch (err) {
      console.error(`Error reading subject directory ${slug}:`, err);
    }
  }

  // 2. Fallback to reading the old root level JSON files for backward compatibility
  if (filesToRead.length === 0) {
    let oldFilename = "";
    if (slug === "company-law") {
      oldFilename = "company law .json";
    } else if (slug === "jurisprudence-interpretation-general-laws") {
      oldFilename = "jigl grp1.json";
    }

    if (oldFilename) {
      const oldPath = path.join(EVALUATION_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        filesToRead.push(oldPath);
      }
    }
  }

  if (filesToRead.length === 0) {
    console.warn(`No rubric files found for subject slug: ${slug}`);
    return { matched: false, similarity: 0 };
  }

  let bestMatch: RubricSubQuestion | null = null;
  let maxSimilarity = 0;
  let matchedCaseContext = "";

  for (const filePath of filesToRead) {
    try {
      const rawContent = fs.readFileSync(filePath, "utf-8");
      const rubricData = JSON.parse(rawContent);

      if (rubricData.questions && Array.isArray(rubricData.questions)) {
        for (const item of rubricData.questions) {
          // Check if it's the old nested structure
          if (item.sub_questions && Array.isArray(item.sub_questions)) {
            const caseContext = item.case_context || "";
            for (const subQ of item.sub_questions) {
              const sim = computeSimilarity(questionText, subQ.question_text);
              if (sim > maxSimilarity) {
                maxSimilarity = sim;
                bestMatch = {
                  sub_question: subQ.sub_question,
                  question_text: subQ.question_text,
                  marks: subQ.marks,
                  expected_answer: subQ.expected_answer,
                  evaluation_criteria: subQ.evaluation_criteria,
                  case_context: caseContext || undefined,
                };
                matchedCaseContext = caseContext;
              }
            }
          } 
          // New flat structure (each item is a sub-question itself)
          else if (item.question_text) {
            const sim = computeSimilarity(questionText, item.question_text);
            if (sim > maxSimilarity) {
              maxSimilarity = sim;

              // Convert new rubric format to legacy interface
              const keyPoints: string[] = [];
              let fullMarksDesc = "Candidate must cover all key legal aspects.";
              let goodDesc = "Candidate covers main provisions.";
              let partialDesc = "Candidate covers some provisions.";
              let minimalDesc = "Candidate mentions keywords only.";

              if (item.evaluation_rubric) {
                const rub = item.evaluation_rubric;
                
                // Extract points
                const mustHave = rub.must_have_points || [];
                const important = rub.important_points || [];
                const optional = rub.optional_points || [];
                
                mustHave.forEach((p: any) => keyPoints.push(p.point));
                important.forEach((p: any) => keyPoints.push(p.point));
                optional.forEach((p: any) => keyPoints.push(p.point));

                // Build descriptions
                if (mustHave.length > 0) {
                  fullMarksDesc = "Must include: " + mustHave.map((p: any) => `${p.point} (${p.marks}m)`).join(", ");
                  goodDesc = "Includes most key points: " + mustHave.slice(0, Math.ceil(mustHave.length / 2)).map((p: any) => p.point).join(", ");
                  partialDesc = "Includes some basic points: " + mustHave.slice(0, 1).map((p: any) => p.point).join(", ");
                }
              }

              const provList: string[] = [];
              if (item.legal_provisions && Array.isArray(item.legal_provisions)) {
                item.legal_provisions.forEach((prov: any) => {
                  if (prov.section && prov.act) {
                    provList.push(`Section ${prov.section}, ${prov.act}`);
                  } else if (prov.act) {
                    provList.push(prov.act);
                  }
                });
              }

              bestMatch = {
                sub_question: item.question_number || "",
                question_text: item.question_text,
                marks: item.max_marks || 0,
                expected_answer: {
                  key_points: keyPoints,
                  legal_provisions: provList,
                  full_answer_summary: item.model_answer || "",
                },
                evaluation_criteria: {
                  full_marks: fullMarksDesc,
                  good: goodDesc,
                  partial: partialDesc,
                  minimal: minimalDesc,
                },
                case_context: item.case_context || undefined,
              };
              matchedCaseContext = item.case_context || "";
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error loading or parsing rubric file ${filePath}:`, err);
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

  return { matched: false, similarity: 0 };
}
