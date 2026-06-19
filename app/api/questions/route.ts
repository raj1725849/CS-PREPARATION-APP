import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveSubjectName } from "@/lib/subject-map";

const EVALUATION_DIR = path.join(process.cwd(), "evalution");

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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const subject = searchParams.get("subject");

  if (!subject) {
    return NextResponse.json({ error: "Missing subject query parameter" }, { status: 400 });
  }

  const resolvedSubject = resolveSubjectName(subject);
  const slug = getSubjectSlug(resolvedSubject);

  if (!slug) {
    return NextResponse.json({ questions: [] });
  }

  const subjectDir = path.join(EVALUATION_DIR, slug);
  let filesToRead: string[] = [];

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

  if (filesToRead.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  const questionsList: any[] = [];

  for (const filePath of filesToRead) {
    try {
      const rawContent = fs.readFileSync(filePath, "utf-8");
      const rubricData = JSON.parse(rawContent);

      if (rubricData.questions && Array.isArray(rubricData.questions)) {
        for (const item of rubricData.questions) {
          if (item.sub_questions && Array.isArray(item.sub_questions)) {
            for (const subQ of item.sub_questions) {
              questionsList.push({
                question_number: subQ.sub_question || "",
                question_id: item.question_id || "",
                question_text: subQ.question_text || "",
                max_marks: subQ.marks || 5
              });
            }
          } else if (item.question_text) {
            questionsList.push({
              question_number: item.question_number || "",
              question_id: item.question_id || "",
              question_text: item.question_text || "",
              max_marks: item.max_marks || 5
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error reading or parsing ${filePath}:`, err);
    }
  }

  // Sort questions by question number (e.g. 1(a), 1(b)...)
  questionsList.sort((a, b) => {
    return a.question_number.localeCompare(b.question_number, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });

  return NextResponse.json({ questions: questionsList });
}
