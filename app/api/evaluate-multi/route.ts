import { NextRequest, NextResponse } from "next/server";
import { verifyUserAuth } from "@/lib/firebase-server";
import { getParsedPaperFromFirestore, saveDebugReportToFirestore } from "@/lib/question-store";

export const maxDuration = 120; // Allow enough time for sequential evaluations

export async function POST(req: NextRequest) {
  let uid = "";
  let idToken = "";

  try {
    const authResult = await verifyUserAuth(req);
    uid = authResult.uid;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { paperId, subject, studentAnswer } = body;

  if (!paperId || !subject || typeof studentAnswer !== "string" || !studentAnswer.trim()) {
    return NextResponse.json(
      { error: "Missing required fields: paperId, subject, studentAnswer" },
      { status: 400 }
    );
  }

  if (!idToken) {
    return NextResponse.json(
      { error: "Authorization ID Token is required" },
      { status: 401 }
    );
  }

  // 1. Fetch parsed paper structure from Firestore
  const parsedPaper = await getParsedPaperFromFirestore(idToken, uid, paperId);
  if (!parsedPaper) {
    return NextResponse.json(
      { error: `Parsed paper ${paperId} not found` },
      { status: 404 }
    );
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  console.log(`[EVALUATE_MULTI] Starting orchestration for paper ${paperId}. Origin: ${origin}`);

  try {
    // 2. Map structured questions for the split-answers API
    const flatQuestionsList: any[] = [];
    parsedPaper.questions.forEach((q: any) => {
      if (q.subparts && q.subparts.length > 0) {
        q.subparts.forEach((sub: any) => {
          flatQuestionsList.push({
            questionId: sub.questionId,
            questionNumber: sub.questionNumber,
            questionText: sub.questionText,
            marks: sub.marks
          });
        });
      } else {
        flatQuestionsList.push({
          questionId: q.questionId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          marks: q.marks
        });
      }
    });

    // 3. Call split-answers API to segment the bulk student answer sheet
    console.log(`[EVALUATE_MULTI] Splitting answers for ${flatQuestionsList.length} questions...`);
    const splitRes = await fetch(`${origin}/api/split-answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        bulkText: studentAnswer,
        questions: flatQuestionsList
      })
    });

    if (!splitRes.ok) {
      const errData = await splitRes.json().catch(() => ({}));
      throw new Error(errData.error || `Split API returned ${splitRes.status}`);
    }

    const splitData = await splitRes.json();
    console.log("[EVALUATE_MULTI] Split API successful. Evaluating questions individually...");

    // 4. Evaluate each question segment individually
    const evaluations: any[] = [];
    let totalMarksAwarded = 0;
    let totalMarksPossible = 0;

    for (let i = 0; i < flatQuestionsList.length; i++) {
      const q = flatQuestionsList[i];
      const match = splitData.find((sd: any) => sd.questionId === q.questionId);
      const questionAnswerText = match ? match.studentAnswer : "";

      if (!questionAnswerText || !questionAnswerText.trim()) {
        console.log(`[EVALUATE_MULTI] Question ${q.questionNumber} not attempted.`);
        evaluations.push({
          questionId: q.questionId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          marks_awarded: 0,
          total_marks: q.marks,
          verdict: "Fail",
          score_percentage: 0,
          deductions: [{
            check_type: "not_attempted",
            type: "missing",
            what_student_wrote: "",
            what_was_expected: "Provide an answer to this question",
            marks_deducted: q.marks,
            severity: "critical"
          }],
          strengths: [],
          missing_points: ["No content written for this question."],
          keywords_missing: [],
          improvement_suggestion: "Attempt all questions in the paper."
        });
        totalMarksPossible += q.marks;
        continue;
      }

      console.log(`[EVALUATE_MULTI] Evaluating question ${q.questionNumber} (${i + 1}/${flatQuestionsList.length})`);
      const evalRes = await fetch(`${origin}/api/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subject: subject,
          question: q.questionText,
          questionId: q.questionId,
          marks: q.marks,
          studentAnswer: questionAnswerText
        })
      });

      if (!evalRes.ok) {
        const errData = await evalRes.json().catch(() => ({}));
        throw new Error(errData.error || `Evaluation failed for Q${q.questionNumber} with status ${evalRes.status}`);
      }

      const evalData = await evalRes.json();
      evaluations.push({
        questionId: q.questionId,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        ...evalData
      });

      totalMarksAwarded += evalData.marks_awarded || 0;
      totalMarksPossible += q.marks;

      // Rate limit spacer
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    // 5. Build Aggregated Evaluation Response
    const scorePercentage = totalMarksPossible > 0 ? Math.round((totalMarksAwarded / totalMarksPossible) * 100 * 10) / 10 : 0;
    const verdict = scorePercentage >= 60
      ? "Pass"
      : scorePercentage >= 50
      ? "Borderline Pass"
      : "Fail";

    const aggregatedResult = {
      isMultiQuestion: true,
      paperId,
      subject,
      total_marks: totalMarksPossible,
      marks_awarded: totalMarksAwarded,
      score_percentage: scorePercentage,
      verdict,
      evaluations,
      evaluated_at: new Date().toISOString()
    };

    // 6. Save Debug/Audit Report
    const debugReport = {
      reportId: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      paperId: paperId,
      detectedQuestions: flatQuestionsList.map(q => q.questionNumber),
      detectedMarks: flatQuestionsList.map(q => `${q.questionNumber}: ${q.marks}`),
      missingQuestions: parsedPaper.missingQuestions || [],
      totalQuestions: parsedPaper.totalQuestions,
      totalMarks: parsedPaper.totalMarks,
      parserWarnings: parsedPaper.warnings || [],
      createdAt: new Date().toISOString()
    };

    await saveDebugReportToFirestore(idToken, uid, debugReport);
    console.log(`[EVALUATE_MULTI] Successfully completed multi-evaluation. Score: ${totalMarksAwarded}/${totalMarksPossible}`);

    // Trigger expected answers preheating in the background
    flatQuestionsList.forEach(async (q) => {
      try {
        fetch(`${origin}/api/evaluate/expected-answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            subject,
            question: q.questionText,
            questionId: q.questionId,
            paperId,
            marks: q.marks
          })
        }).catch(err => console.warn(`Expected answer fetch failed background: ${err.message}`));
      } catch (err: any) {
        console.warn(`[EVALUATE_MULTI] Failed background preheat trigger for ${q.questionNumber}:`, err.message);
      }
    });

    return NextResponse.json(aggregatedResult, { status: 200 });

  } catch (err: any) {
    console.error("Multi-question evaluation orchestration failed:", err);
    return NextResponse.json(
      { error: `Multi-question evaluation failed: ${err.message}` },
      { status: 502 }
    );
  }
}
