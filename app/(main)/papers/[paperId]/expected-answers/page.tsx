"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  Copy,
  XCircle
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { GeneratedPaperDocument } from "@/lib/types";
import { getEvaluationFromFirestore } from "@/lib/question-store";

// Inline helper to convert simple **bold** markdown formatting to React nodes
function formatTopperAnswer(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Replace **text** with bold tags
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    const content = parts.map((part, pIdx) => {
      if (pIdx % 2 === 1) {
        return <strong key={pIdx} className="font-bold text-[#0f2640]">{part}</strong>;
      }
      return part;
    });

    // Check if line is a heading/section
    const isHeading = line.trim().startsWith("1.") || line.trim().startsWith("2.") || line.trim().startsWith("3.") || line.trim().startsWith("4.") || line.trim().startsWith("5.") || line.trim().startsWith("**");
    
    return (
      <div key={idx} className={`${isHeading ? "mt-4 mb-2 font-semibold text-lg" : "mb-1 text-slate-700"} leading-relaxed min-h-[1.5rem]`}>
        {content}
      </div>
    );
  });
}

export default function ExpectedAnswersViewerPage() {
  const { paperId } = useParams() as { paperId: string };
  const router = useRouter();

  const [paper, setPaper] = useState<GeneratedPaperDocument | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Pagination states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expectedAnswers, setExpectedAnswers] = useState<Record<string, string>>({});
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch paper details
  useEffect(() => {
    if (!user || !paperId) return;
    fetchPaperAndEvaluations();
  }, [user, paperId]);

  // Load expected answer for the current question index
  useEffect(() => {
    if (!paper) return;
    const currentQuestion = paper.questions[currentIndex];
    if (currentQuestion) {
      loadExpectedAnswerForQuestion(currentQuestion);
    }
  }, [paper, currentIndex]);

  const fetchPaperAndEvaluations = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const docRef = doc(db, "generated_papers", paperId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const paperData = snap.data() as GeneratedPaperDocument;
        setPaper(paperData);

        // Fetch evaluations for all questions
        const evalMap: Record<string, any> = {};
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const fetchPromises = paperData.questions
            .filter((q) => q.evaluationId)
            .map(async (q) => {
              const evalDoc = await getEvaluationFromFirestore(idToken, user.uid, q.evaluationId!);
              if (evalDoc) {
                evalMap[q.questionId] = evalDoc;
              }
            });
          await Promise.all(fetchPromises);
          setEvaluations(evalMap);
        }
      } else {
        setErrorMsg("Exam paper not found.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load paper details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExpectedAnswerForQuestion = async (q: any) => {
    if (expectedAnswers[q.questionId]) return; // already loaded (Cache HIT)
    setLoadingAnswer(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/evaluate/expected-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          subject: paper?.subject,
          question: q.questionText,
          questionId: q.questionId,
          paperId: paper?.paperId,
          marks: q.marks,
          idealAnswerCode: q.idealAnswerCode
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setExpectedAnswers((prev) => ({
        ...prev,
        [q.questionId]: data.expectedAnswer || ""
      }));
    } catch (err: any) {
      console.error(err);
      setExpectedAnswers((prev) => ({
        ...prev,
        [q.questionId]: "Failed to retrieve expected answer: " + err.message
      }));
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Answer copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-[#e8590c] animate-spin" />
        <p className="text-sm font-semibold text-[#0f2640] animate-pulse">Loading expected answers...</p>
      </div>
    );
  }

  if (errorMsg || !paper) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <TopBar title="Error" subtitle="Expected Answer Viewer" breadcrumbs={[{ label: "Home" }, { label: "Mock Exams", href: "/dashboard" }]} />
        <div className="p-8 max-w-xl mx-auto text-center space-y-6 mt-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[#0f2640]">Something went wrong</h2>
          <p className="text-sm text-[#64748b]">{errorMsg || "Please log in."}</p>
          <button onClick={() => router.push("/dashboard")} className="bg-[#0f2640] text-white px-6 py-3 rounded-lg font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = paper.questions[currentIndex];
  const currentEvaluation = evaluations[currentQuestion.questionId];
  const marksScored = currentEvaluation ? currentEvaluation.marksAwarded : 0;
  const marksPercent = (marksScored / currentQuestion.marks) * 100;
  const answerMarkdown = expectedAnswers[currentQuestion.questionId] || "";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28">
      <TopBar
        title={paper.subject}
        subtitle="ICSI Examination Ideal Expected Answers"
        breadcrumbs={[
          { label: "Home" },
          { label: "Mock Exams", href: "/dashboard" },
          { label: "Paper Detail", href: `/papers/${paper.paperId}` },
          { label: "Expected Answers" }
        ]}
      />

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Header Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Question {currentIndex + 1} of {paper.questions.length}</span>
            <span>{Math.round(((currentIndex + 1) / paper.questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e8590c] rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / paper.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Stacked Layout B Content Cards */}
        <div className="space-y-6">
          
          {/* Card 1: Question details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md">
                  Question {currentQuestion.questionNumber}
                </span>
                <div className="text-xs text-slate-400 font-semibold mt-1">
                  {currentQuestion.topic} • {currentQuestion.subTopic}
                </div>
              </div>
              
              {/* Score indicators */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Your Score</span>
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className={`text-2xl font-extrabold font-playfair ${
                    marksPercent >= 60 ? "text-green-600" : marksPercent >= 45 ? "text-amber-500" : "text-red-500"
                  }`}>{marksScored}</span>
                  <span className="text-xs text-slate-400">/ {currentQuestion.marks}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 border rounded-xl p-4 text-sm font-semibold text-slate-700 leading-relaxed">
              {currentQuestion.questionText}
            </div>
          </div>

          {/* Card 2: Performance gap analysis */}
          {currentEvaluation && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Gaps & Deductions
              </h3>

              {/* Deductions / Gaps */}
              {currentEvaluation.deductions && currentEvaluation.deductions.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs text-red-700 font-bold block">What You Missed:</span>
                  <ul className="space-y-2.5">
                    {currentEvaluation.deductions.map((d: any, idx: number) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed bg-red-50/30 border border-red-100/50 rounded-lg p-2.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                        <div>
                          <strong className="font-bold text-red-950">{d.check_type || d.type}: </strong>
                          Expected: &quot;{d.what_was_expected}&quot;.
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-green-700 font-bold bg-green-50/50 p-3 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> No major content gaps identified!
                </p>
              )}

              {/* Keywords Missed */}
              <div className="pt-2">
                <span className="text-xs text-slate-500 font-bold block mb-2">Keywords Missed:</span>
                {currentEvaluation.keywords_missing && currentEvaluation.keywords_missing.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentEvaluation.keywords_missing.map((kw: string, idx: number) => (
                      <span key={idx} className="bg-rose-50 text-rose-700 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-rose-200/50">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-green-700 italic font-medium">All essential keywords covered!</span>
                )}
              </div>
            </div>
          )}

          {/* Card 3: ICSI Expected Points */}
          {currentEvaluation && currentEvaluation.missing_points && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#e8590c]" /> ICSI Expected Points
              </h3>
              <div className="bg-slate-50/50 border rounded-xl p-4 space-y-3">
                <span className="text-xs text-slate-500 font-bold block">Key legal and conceptual parameters checked by examiners:</span>
                {currentEvaluation.model_answer ? (
                  <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {currentEvaluation.model_answer}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Expected rubric details generated by AI during evaluation.</p>
                )}
              </div>
            </div>
          )}

          {/* Card 4: Exam-Ready Topper Answer */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Exam-Ready Topper Answer
              </h3>
              {answerMarkdown && !loadingAnswer && (
                <button
                  onClick={() => handleCopy(answerMarkdown)}
                  className="text-xs text-[#0f2640] border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Answer
                </button>
              )}
            </div>

            {loadingAnswer ? (
              <div className="bg-slate-50 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#e8590c] animate-spin" />
                <p className="text-xs font-semibold text-slate-500 animate-pulse">Formatting guideline answer strictly into exam ready format...</p>
              </div>
            ) : (
              <div className="bg-[#f0fdf4]/30 border border-green-200/50 rounded-xl p-6 font-sans text-slate-800 text-[14px] leading-relaxed">
                {formatTopperAnswer(answerMarkdown) || "No expected answer loaded."}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-8 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex justify-between items-center z-50">
        <button
          onClick={() => router.push(`/papers/${paperId}`)}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>

        <div className="flex gap-2.5">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || loadingAnswer}
            className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(paper.questions.length - 1, prev + 1))}
            disabled={currentIndex === paper.questions.length - 1 || loadingAnswer}
            className="flex items-center gap-1 bg-[#0f2640] hover:bg-[#1a3a5c] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
