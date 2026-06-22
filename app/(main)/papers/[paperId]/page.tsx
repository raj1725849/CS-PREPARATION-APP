"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Play,
  Download,
  UploadCloud,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle
} from "lucide-react";
import ImageUploader, { UploadedImage } from "@/components/ImageUploader";
import UpgradeModal from "@/components/UpgradeModal";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { GeneratedPaperDocument, GeneratedPaperQuestion, EvaluateSession } from "@/lib/types";
import { getEvaluationFromFirestore } from "@/lib/question-store";

// Helper to compress base64 images via canvas
function compressBase64(base64: string, maxWidth = 1200, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(base64);
      return;
    }
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.split(",")[1]);
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => {
      resolve(base64);
    };
  });
}

export default function PaperDetailPage() {
  const { paperId } = useParams() as { paperId: string };
  const router = useRouter();

  // Core data states
  const [paper, setPaper] = useState<GeneratedPaperDocument | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  // Exam view states
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60); // 3 hours in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Upload/Verification states
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState("");
  const [ocrFailed, setOcrFailed] = useState(false);

  // Verification editor states
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({}); // questionId -> studentAnswer text
  const [unassignedAnswers, setUnassignedAnswers] = useState<string[]>([]);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // Accordion details in results mode
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setError("Please login to access mock exams.");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch paper details
  useEffect(() => {
    if (!user || !paperId) return;
    fetchPaper();
  }, [user, paperId]);

  // Exam Mode Timer
  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && examStarted) {
      handleTimeOut();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examStarted, timeLeft]);

  const fetchPaper = async () => {
    setLoading(true);
    setError("");
    try {
      const docRef = doc(db, "generated_papers", paperId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const paperData = snap.data() as GeneratedPaperDocument;
        setPaper(paperData);

        // Prepopulate studentAnswers state
        const answersMap: Record<string, string> = {};
        paperData.questions.forEach((q) => {
          answersMap[q.questionId] = q.idealAnswerCode ? "" : ""; // start empty
        });
        setStudentAnswers(answersMap);

        // If completed, fetch related evaluations
        if (paperData.status === "completed") {
          await fetchEvaluations(paperData);
        }
      } else {
        setError("Exam paper not found.");
      }
    } catch (err: any) {
      console.error("Failed to fetch paper:", err);
      setError(err.message || "Failed to load exam paper.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluations = async (paperData: GeneratedPaperDocument) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const evalDataMap: Record<string, any> = {};
      const fetchPromises = paperData.questions
        .filter((q) => q.evaluationId)
        .map(async (q) => {
          const evalDoc = await getEvaluationFromFirestore(idToken, user.uid, q.evaluationId!);
          if (evalDoc) {
            evalDataMap[q.questionId] = evalDoc;
          }
        });

      await Promise.all(fetchPromises);
      setEvaluations(evalDataMap);
    } catch (err) {
      console.warn("Failed to prefetch evaluations:", err);
    }
  };

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleTimeOut = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExamStarted(false);
    alert("Time is up! Please submit your answer sheets now.");
    handleTransitionToUpload();
  };

  const handleTransitionToUpload = async () => {
    if (!paper) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const updatedPaper = { ...paper, status: "attempted" as const };
      const docRef = doc(db, "generated_papers", paper.paperId);
      await setDoc(docRef, updatedPaper, { merge: true });
      setPaper(updatedPaper);
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  // Bulk transcribe and auto-split answers
  const handleProcessAnswerSheets = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (uploadedImages.length === 0) return alert("Please upload at least one image");
    if (uploadedImages.some((img) => img.status !== "ready")) {
      return alert("Please wait for all images to upload completely.");
    }

    setOcrRunning(true);
    setOcrFailed(false);
    setOcrProgressMsg("1. Compressing and preparing answer sheet images...");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      // Compress images before sending to OCR to avoid payload too large (413) or out-of-memory errors
      const compressedImages = await Promise.all(
        uploadedImages.map(img => compressBase64(img.base64, 1200, 0.6))
      );

      setOcrProgressMsg("2. Extracting handwritten text using Gemini Vision OCR...");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          images: compressedImages,
          mimeTypes: uploadedImages.map(() => "image/jpeg")
        })
      });

      if (!extractRes.ok) {
        const errData = await extractRes.json().catch(() => ({}));
        throw new Error(errData.error || "OCR extraction failed");
      }

      const extractData = await extractRes.json();
      const extractedText = extractData.text || "";
      setBulkText(extractedText);

      setOcrProgressMsg("3. Segmenting answer sheet question-by-question...");
      const splitRes = await fetch("/api/split-answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          bulkText: extractedText,
          questions: paper?.questions || []
        })
      });

      if (!splitRes.ok) {
        const errData = await splitRes.json().catch(() => ({}));
        throw new Error(errData.error || "Auto-splitting failed");
      }

      const splitData = await splitRes.json();
      // Map segmented answers to studentAnswers state
      const answersMap: Record<string, string> = {};
      paper?.questions.forEach((q) => {
        const match = splitData.find((sd: any) => sd.questionId === q.questionId);
        answersMap[q.questionId] = match ? match.studentAnswer : "";
      });
      setStudentAnswers(answersMap);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process uploaded sheets.");
      setOcrFailed(true);
    } finally {
      setOcrRunning(false);
      setOcrProgressMsg("");
    }
  };

  // Save current verification answer and switch focus
  const handleUpdateAnswerText = (text: string) => {
    if (!paper) return;
    const activeQuestion = paper.questions[activeQuestionIdx];
    setStudentAnswers((prev) => ({
      ...prev,
      [activeQuestion.questionId]: text
    }));
  };

  const handleNextQuestion = () => {
    if (!paper) return;
    if (activeQuestionIdx < paper.questions.length - 1) {
      setActiveQuestionIdx((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (activeQuestionIdx > 0) {
      setActiveQuestionIdx((prev) => prev - 1);
    }
  };

  // Run full evaluation
  const handleRunEvaluation = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!paper) return;

    setSubmitting(true);
    setError("");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token missing");

      // Format answers for pipeline
      const formattedAnswers = Object.entries(studentAnswers).map(([questionId, studentAnswer]) => ({
        questionId,
        studentAnswer
      }));

      const res = await fetch("/api/evaluate-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          paperId: paper.paperId,
          answers: formattedAnswers
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Paper evaluation failed");
      }

      const updatedDoc = await res.json();
      setPaper(updatedDoc);
      await fetchEvaluations(updatedDoc);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to evaluate mock exam. Check connection and daily limits.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset exam so they can re-attempt
  const handleReattempt = async () => {
    if (!paper || !confirm("Are you sure you want to reset this mock exam? This will clear prior evaluations and answers.")) return;
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const resetQuestions = paper.questions.map((q) => ({
        ...q,
        evaluated: false,
        evaluationId: ""
      }));

      const updatedPaper: GeneratedPaperDocument = {
        ...paper,
        questions: resetQuestions,
        status: "generated",
        evaluationSummary: undefined
      };

      const docRef = doc(db, "generated_papers", paper.paperId);
      await setDoc(docRef, updatedPaper);
      setPaper(updatedPaper);
      setStudentAnswers({});
      setUploadedImages([]);
      setBulkText("");
      setEvaluations({});
      setExamStarted(false);
      setTimeLeft(3 * 60 * 60);
    } catch (err) {
      console.error(err);
      alert("Failed to reset exam.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle accordion in results
  const toggleExpandQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0")
    ].join(":");
  };

  // Calculate topic-specific accuracy percentage
  const calculateTopicPerformance = () => {
    if (!paper || Object.keys(evaluations).length === 0) return [];

    const performanceMap: Record<string, { possible: number; scored: number }> = {};

    paper.questions.forEach((q) => {
      const evalData = evaluations[q.questionId];
      const marksScored = evalData ? evalData.marksAwarded : 0;
      
      if (!performanceMap[q.topic]) {
        performanceMap[q.topic] = { possible: 0, scored: 0 };
      }
      performanceMap[q.topic].possible += q.marks;
      performanceMap[q.topic].scored += marksScored;
    });

    return Object.entries(performanceMap).map(([topic, data]) => {
      const percentage = Math.round((data.scored / data.possible) * 100);
      return { topic, percentage, scored: data.scored, possible: data.possible };
    });
  };

  // Copy Paper Content to clipboard
  const handleCopyPaperText = () => {
    if (!paper?.paperText) return;
    navigator.clipboard.writeText(paper.paperText);
    alert("Exam paper text copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-[#e8590c] animate-spin" />
        <p className="text-sm font-semibold text-[#0f2640] animate-pulse">Loading mock examination details...</p>
      </div>
    );
  }

  if (error && !paper) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <TopBar title="Error" subtitle="Problem loading mock exam" breadcrumbs={[{ label: "Home" }, { label: "Mock Exams", href: "/dashboard" }]} />
        <div className="p-8 max-w-xl mx-auto text-center space-y-6 mt-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-[#0f2640]">Something went wrong</h2>
          <p className="text-sm text-[#64748b]">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="bg-[#0f2640] text-white px-6 py-3 rounded-lg font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!paper) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      <TopBar
        title={paper.subject}
        subtitle={`Mock Examination • ${paper.totalMarks} Marks • Difficulty: ${paper.difficultyLevel}`}
        breadcrumbs={[{ label: "Home" }, { label: "Mock Exams", href: "/dashboard" }, { label: paper.subject }]}
      />

      <div className="p-8 max-w-6xl mx-auto space-y-8 reveal">
        
        {/* ── ERROR ALERT ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* ── VIEWPORT 1: EXAM WRITING MODE ── */}
        {paper.status === "generated" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Exam Timer and Guidelines */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-6 shadow-sm space-y-6">
                <h3 className="text-base font-bold text-[#0f2640] uppercase tracking-wider border-b pb-2">Exam Control Center</h3>
                
                {!examStarted ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-slate-50 rounded-xl">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Time Allowed</span>
                      <span className="text-3xl font-extrabold text-[#0f2640] mt-1 block">3 Hours</span>
                    </div>
                    <button
                      onClick={handleStartExam}
                      className="w-full bg-[#e8590c] hover:bg-[#c94d0a] text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-lg shadow-md active:scale-95"
                    >
                      <Play className="w-5 h-5 fill-white" /> Start Simulation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-orange-50/50 border border-orange-200/50 rounded-xl">
                      <span className="text-xs font-bold text-[#e8590c] block uppercase">Simulated Timer Remaining</span>
                      <span className="text-4xl font-black font-mono text-[#0f2640] mt-2 block tracking-wider">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    <button
                      onClick={handleTimeOut}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      Stop & Submit Answers
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-[#0f2640] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#e8590c]" /> ICSI Examination Rules
                </h4>
                <ul className="list-disc pl-5 space-y-2 text-xs text-[#64748b] leading-relaxed">
                  <li>Write answers on blank, unruled A4 sheets.</li>
                  <li>Label your question numbers clearly on each sheet (e.g. <strong>Ans to Q1(a)</strong>).</li>
                  <li>Scan or photograph your answer sheets upright in bright lighting when done.</li>
                  <li>You will upload all pages at once in the next step.</li>
                </ul>
              </div>
            </div>

            {/* Right side: Mock Paper Sheet View */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 shadow-lg overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Exam Sheet Preview
                  </span>
                  <button
                    onClick={handleCopyPaperText}
                    className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0f2640] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Copy Paper Text
                  </button>
                </div>
                
                {examStarted ? (
                  <div className="p-8 font-serif leading-relaxed text-slate-800 max-h-[600px] overflow-y-auto pr-6 custom-scrollbar whitespace-pre-wrap text-sm border-t select-text">
                    {paper.paperText}
                  </div>
                ) : (
                  <div className="p-16 text-center space-y-4 bg-slate-50/30">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto" />
                    <h4 className="text-lg font-bold text-[#0f2640]">Ready to Attempt?</h4>
                    <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                      Click the "Start Simulation" button to reveal the exam question sheet and begin the countdown timer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEWPORT 2: UPLOAD & VERIFICATION MODE ── */}
        {(paper.status === "attempted" || paper.status === "evaluating") && (
          <div className="space-y-8">
            
            {/* Phase A: Upload Images Screen */}
            {bulkText === "" && !ocrRunning ? (
              <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-8 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-[#e8590c]/10 text-[#e8590c] p-3 rounded-xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0f2640]">Upload Mock Answer Sheets</h3>
                    <p className="text-sm text-[#64748b] mt-1">
                      Upload photos or scanned sheets of your completed exam answers. Our system will transcribe the text and segment it.
                    </p>
                  </div>
                </div>

                <ImageUploader onImagesReady={(imgs) => setUploadedImages(imgs)} maxImages={15} />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={handleReattempt} className="btn btn-secondary flex items-center gap-1">
                    <RotateCcw className="w-4 h-4" /> Reset Exam
                  </button>
                  <button
                    onClick={handleProcessAnswerSheets}
                    disabled={uploadedImages.length === 0 || uploadedImages.some(img => img.status === "uploading")}
                    className="bg-[#e8590c] hover:bg-[#c94d0a] disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 rounded-xl font-bold transition-all"
                  >
                    Process Answer Sheets
                  </button>
                </div>
              </div>
            ) : null}

            {/* Phase B: OCR Loader State */}
            {ocrRunning && (
              <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
                <Loader2 className="w-16 h-16 text-[#e8590c] animate-spin" />
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-[#0f2640]">Transcribing & Splitting Sheets...</h3>
                  <p className="text-sm text-[#64748b] animate-pulse max-w-sm mx-auto font-medium">
                    {ocrProgressMsg}
                  </p>
                </div>
              </div>
            )}

            {/* Phase C: OCR Failed state retry */}
            {ocrFailed && bulkText === "" && (
              <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm text-center space-y-4">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-[#0f2640]">Transcription Failed</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  OCR processing failed due to connection error or key limitation. Please click below to try again.
                </p>
                <button onClick={handleProcessAnswerSheets} className="bg-[#e8590c] text-white px-6 py-2.5 rounded-lg font-bold">
                  Retry Processing
                </button>
              </div>
            )}

            {/* Phase D: Side-by-Side Verification Workspace */}
            {bulkText !== "" && !ocrRunning && (
              <div className="space-y-6">
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-2.5 shadow-sm">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-950 font-bold uppercase tracking-wide">Verification Dashboard:</strong> Review each segmented answer below. Adjust mapping, correct OCR spelling mistakes, and click "Run Full Evaluation" when ready.
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left Sidebar: Questions list */}
                  <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-4 shadow-sm h-fit space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b pb-2 px-1">Questions Array</span>
                    <div className="space-y-1">
                      {paper.questions.map((q, idx) => {
                        const attempted = !!studentAnswers[q.questionId]?.trim();
                        return (
                          <div
                            key={q.questionId}
                            onClick={() => setActiveQuestionIdx(idx)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              activeQuestionIdx === idx
                                ? "bg-slate-50 border-[#0f2640] shadow-sm font-semibold text-[#0f2640]"
                                : "bg-white border-transparent hover:bg-slate-50/50 text-slate-600"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">Q{q.questionNumber}</span>
                              <span className="text-[10px] text-slate-400">{q.marks} Marks</span>
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                attempted ? "bg-[#34c759]" : "bg-slate-200"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main content pane */}
                  <div className="lg:col-span-3 bg-white rounded-2xl border border-[#cbd5e1]/40 p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Active Verification: Question {paper.questions[activeQuestionIdx].questionNumber}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-md">
                        {paper.questions[activeQuestionIdx].marks} Marks
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Question Text</label>
                      <div className="bg-slate-50 border rounded-xl p-4 text-sm font-medium text-slate-700">
                        {paper.questions[activeQuestionIdx].questionText}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Transcribed Student Answer (Editable)
                      </label>
                      <textarea
                        className="w-full border border-slate-200 rounded-xl px-4 py-4 text-sm leading-relaxed focus:outline-none focus:border-[#e8590c] font-sans min-h-[220px]"
                        value={studentAnswers[paper.questions[activeQuestionIdx].questionId] || ""}
                        onChange={(e) => handleUpdateAnswerText(e.target.value)}
                        placeholder={`Write or review student's answer for Q${paper.questions[activeQuestionIdx].questionNumber} here...`}
                      />
                      <p className="text-[10px] text-slate-400 italic">
                        Empty text implies this question was skipped. You can manually type/edit the answer text.
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex gap-2">
                        <button
                          onClick={handlePrevQuestion}
                          disabled={activeQuestionIdx === 0}
                          className="btn btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={handleNextQuestion}
                          disabled={activeQuestionIdx === paper.questions.length - 1}
                          className="btn btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      
                      <button
                        onClick={handleRunEvaluation}
                        disabled={submitting}
                        className="bg-[#0f2640] hover:bg-[#1a3a5c] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Evaluating ({paper.questions.length} Questions)...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 fill-white" /> Confirm & Run Evaluation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start gap-4">
                  <button onClick={handleReattempt} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-bold">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Upload & Answers
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── VIEWPORT 3: RESULTS MODE ── */}
        {paper.status === "completed" && paper.evaluationSummary && (
          <div className="space-y-8">
            
            {/* Scorecard Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2640] via-[#102a4a] to-[#1e3a5f] p-8 shadow-xl text-white border border-[#1e293b]/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-white/10 to-transparent rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
              
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold">Simulation Results Summary</span>
                  <h2 className="text-3xl font-extrabold font-sora text-white">ICSI Mock Scorecard</h2>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="text-sm text-[#cbd5e1]">Subject: <strong className="text-white">{paper.subject}</strong></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                    <span className="text-sm text-[#cbd5e1]">Duration: <strong className="text-white">3 Hours</strong></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                    <span className="text-sm text-[#cbd5e1]">Attempt Date: <strong className="text-white">{new Date(paper.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-1 font-bold">Total Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold font-playfair text-[#e8590c]">
                        {paper.evaluationSummary.marksAwarded}
                      </span>
                      <span className="text-lg text-[#94a3b8]">/ {paper.totalMarks}</span>
                    </div>
                    <span className="text-xs text-[#38bdf8] font-semibold block mt-1">
                      {paper.evaluationSummary.scorePercentage}% Score
                    </span>
                  </div>

                  <div className="h-16 w-[1px] bg-slate-700/50 hidden md:block" />

                  <div className="flex flex-col items-center">
                    <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-2 font-bold text-center">Verdict</span>
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
                      paper.evaluationSummary.verdict === 'Pass'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : paper.evaluationSummary.verdict === 'Fail'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {paper.evaluationSummary.verdict}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Granular topic-wise performance breakdown */}
            <div className="bg-white rounded-2xl border border-[#cbd5e1]/40 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#0f2640]">Syllabus Topic Performance Analysis</h3>
                <p className="text-xs text-[#64748b] mt-0.5">Understand your accuracy breakdown across individual syllabus chapters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {calculateTopicPerformance().map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-[#0f2640]">{item.topic}</span>
                      <span className="text-slate-600">{item.scored} / {item.possible} marks ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.percentage >= 60 ? "bg-[#34c759]" : item.percentage >= 45 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions detail List with accordions */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#0f2640]">Detailed Question Evaluations</h3>
              <div className="space-y-3">
                {paper.questions.map((q) => {
                  const evalData = evaluations[q.questionId] as any;
                  const isExpanded = !!expandedQuestions[q.questionId];

                  return (
                    <div key={q.questionId} className="bg-white rounded-2xl border border-[#cbd5e1]/40 shadow-sm overflow-hidden">
                      {/* Accordion header */}
                      <div
                        onClick={() => toggleExpandQuestion(q.questionId)}
                        className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50/50 transition-all select-none border-b border-transparent"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-base font-extrabold text-[#0f2640]">Q{q.questionNumber}</span>
                          <span className="text-xs text-slate-400 font-semibold">{q.topic} • {q.subTopic}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          {evalData ? (
                            <span className="text-sm font-bold text-[#0f2640]">
                              {evalData.marksAwarded} / {q.marks} Marks
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-md">
                              Skipped / Failed
                            </span>
                          )}
                          
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {/* Accordion content */}
                      {isExpanded && evalData && (
                        <div className="p-6 border-t bg-slate-50/30 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Original Question and Student answer */}
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question Text</span>
                                <div className="bg-white border rounded-xl p-4 text-xs font-medium text-slate-700">
                                  {q.questionText}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student answer</span>
                                <div className="bg-white border rounded-xl p-4 text-xs text-slate-700 whitespace-pre-wrap max-h-[220px] overflow-y-auto custom-scrollbar leading-relaxed">
                                  {evalData.studentAnswer || "No answer submitted."}
                                </div>
                              </div>
                            </div>

                            {/* Right: AI evaluation analysis */}
                            <div className="space-y-4">
                              <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Award className="w-4 h-4 text-emerald-500" /> Examiner Feedback
                                </h4>
                                
                                {evalData.improvement_suggestion && (
                                  <p className="text-xs text-slate-700 italic border-l-2 border-amber-300 pl-3">
                                    "{evalData.improvement_suggestion}"
                                  </p>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Chapter</span>
                                    <span className="text-xs text-slate-700 block font-medium">{evalData.chapter}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Verdict</span>
                                    <span className="text-xs text-slate-700 block font-medium">{evalData.verdict}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions if any */}
                              {evalData.deductions && evalData.deductions.length > 0 && (
                                <div className="bg-[#fff5f5] border border-red-200/50 rounded-xl p-5 space-y-3">
                                  <h4 className="text-xs font-bold text-red-950 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" /> Specific Deductions
                                  </h4>
                                  <ul className="space-y-2">
                                    {evalData.deductions.map((d: any, idx: number) => (
                                      <li key={idx} className="text-xs text-red-900 flex items-start gap-2 leading-relaxed">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                                        <div>
                                          <strong className="font-bold">{d.check_type || d.type}:</strong> Deducted {d.marks_deducted}m. Expected: "{d.what_was_expected}"
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ideal answer summary */}
                          {evalData.model_answer && (
                            <div className="bg-white border rounded-xl p-5 space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reference Ideal Answer</span>
                              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {evalData.model_answer}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                onClick={() => router.push("/dashboard")}
                className="btn btn-secondary"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push(`/papers/${paper.paperId}/expected-answers`)}
                className="bg-[#1a3a5c] hover:bg-[#0f2640] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                View Expected Answers
              </button>
              <button
                onClick={handleReattempt}
                className="bg-[#e8590c] hover:bg-[#c94d0a] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
              >
                Re-attempt Mock Exam
              </button>
            </div>

          </div>
        )}

      </div>
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
