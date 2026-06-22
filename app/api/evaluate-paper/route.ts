import { NextRequest, NextResponse } from "next/server"
import { verifyUserAuth } from "@/lib/firebase-server"
import { getPaperFromFirestore, savePaperToFirestore, getIdealAnswerFromFirestore } from "@/lib/question-store"

export const maxDuration = 60

async function preheatExpectedAnswers(
  idToken: string,
  uid: string,
  paperId: string,
  subject: string,
  questions: any[],
  origin: string
) {
  console.log(`[PREHEAT] Starting background preheat for paper ${paperId}`);
  for (const q of questions) {
    try {
      const cached = await getIdealAnswerFromFirestore(idToken, paperId, q.questionId);
      if (cached && cached.expectedAnswer) {
        console.log(`[PREHEAT] Cache HIT for question ${q.questionNumber}`);
        continue;
      }

      console.log(`[PREHEAT] Cache MISS for question ${q.questionNumber}. Triggering generation...`);
      const res = await fetch(`${origin}/api/evaluate/expected-answer`, {
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
          marks: q.marks,
          idealAnswerCode: q.idealAnswerCode
        })
      });
      if (!res.ok) {
        console.warn(`[PREHEAT] Failed to generate for question ${q.questionNumber}: HTTP ${res.status}`);
      } else {
        console.log(`[PREHEAT] Successfully preheated question ${q.questionNumber}`);
      }

      // Slight delay to prevent hitting Gemini concurrent rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err: any) {
      console.error(`[PREHEAT] Error preheating question ${q.questionNumber}:`, err.message);
    }
  }
}

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
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { paperId, answers } = body

  if (!paperId || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Missing required fields: paperId (string), answers (array)" },
      { status: 400 }
    )
  }

  if (!idToken) {
    return NextResponse.json(
      { error: "Authorization ID Token is required" },
      { status: 401 }
    )
  }

  // 1. Fetch paper from Firestore
  const paper = await getPaperFromFirestore(idToken, paperId);
  if (!paper) {
    return NextResponse.json(
      { error: `Paper ${paperId} not found` },
      { status: 404 }
    )
  }

  if (paper.userId !== uid) {
    return NextResponse.json(
      { error: "Forbidden: You do not own this paper" },
      { status: 403 }
    )
  }

  // Set paper status to evaluating
  paper.status = "evaluating";
  await savePaperToFirestore(idToken, paper);

  // Determine current origin from headers
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  console.log(`[EVALUATE_PAPER] Starting evaluations for paper ${paperId} using origin ${origin}`);

  let totalMarksAwarded = 0;
  let totalMarksPossible = paper.totalMarks || 100;
  const updatedQuestions = [...paper.questions];

  try {
    // 2. Evaluate questions sequentially to avoid rate-limit clashes with API key rotations
    for (let i = 0; i < updatedQuestions.length; i++) {
      const q = updatedQuestions[i];
      const answerEntry = answers.find((a: any) => a.questionId === q.questionId);
      const studentAnswerText = answerEntry ? answerEntry.studentAnswer : "";

      if (!studentAnswerText || !studentAnswerText.trim()) {
        console.log(`[EVALUATE_PAPER] Question ${q.questionNumber} (${q.questionId}) not attempted.`);
        q.evaluated = true;
        q.evaluationId = "";
        // 0 marks awarded for skipped question
        continue;
      }

      console.log(`[EVALUATE_PAPER] Evaluating question ${q.questionNumber} (${i + 1}/${updatedQuestions.length})`);

      try {
        const evalRes = await fetch(`${origin}/api/evaluate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            subject: paper.subject,
            question: q.questionText,
            questionId: q.questionId,
            marks: q.marks,
            studentAnswer: studentAnswerText
          })
        });

        if (!evalRes.ok) {
          const errData = await evalRes.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${evalRes.status}`);
        }

        const evalData = await evalRes.json();
        q.evaluated = true;
        q.evaluationId = evalData.evaluationId || "";
        totalMarksAwarded += evalData.marks_awarded || 0;
        
        console.log(`[EVALUATE_PAPER] Question ${q.questionNumber} evaluated: ${evalData.marks_awarded}/${q.marks} marks`);

      } catch (err: any) {
        console.error(`[EVALUATE_PAPER] Failed to evaluate question ${q.questionNumber}:`, err.message);
        // If one question fails, fail the whole pipeline so they can re-try
        throw new Error(`Failed to evaluate question ${q.questionNumber}: ${err.message}`);
      }
    }

    // 3. Aggregate final paper metrics
    const scorePercentage = Math.round((totalMarksAwarded / totalMarksPossible) * 100 * 10) / 10;
    const verdict = scorePercentage >= 60
      ? "Pass"
      : scorePercentage >= 50
      ? "Borderline Pass"
      : "Fail";

    paper.questions = updatedQuestions;
    paper.status = "completed";
    paper.evaluationSummary = {
      marksAwarded: totalMarksAwarded,
      scorePercentage,
      verdict,
      feedback: `Completed mock exam on ${paper.subject}. Scored ${totalMarksAwarded} out of ${totalMarksPossible} marks.`
    };

    // 4. Save updated paper to Firestore
    await savePaperToFirestore(idToken, paper);
    console.log(`[EVALUATE_PAPER] Paper ${paperId} successfully evaluated. Verdict: ${verdict}, Score: ${scorePercentage}%`);

    // Preheat expected answers in the background
    preheatExpectedAnswers(idToken, uid, paperId, paper.subject, paper.questions, origin).catch((err) => {
      console.error("[EVALUATE_PAPER] Background expected answer preheating failed:", err);
    });

    return NextResponse.json(paper, { status: 200 });

  } catch (pipelineErr: any) {
    console.error(`[EVALUATE_PAPER] Pipeline failed:`, pipelineErr);
    
    // Restore status to attempted so the student can retry
    paper.status = "attempted";
    await savePaperToFirestore(idToken, paper);

    return NextResponse.json(
      { error: `Mock paper evaluation pipeline failed: ${pipelineErr.message}` },
      { status: 502 }
    )
  }
}
