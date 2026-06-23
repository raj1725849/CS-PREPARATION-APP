"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Edit3, ShieldAlert, Award, AlertTriangle, Info } from "lucide-react";
import { saveSession, updateSession, checkAndIncrementUsage, getSessionById } from "@/lib/storage";
import { EvaluateSession, EnhancedDeduction } from "@/lib/types";
import ImageUploader, { UploadedImage } from "@/components/ImageUploader";
import UpgradeModal from "@/components/UpgradeModal";
import { auth } from "@/lib/firebase";
import { extractMarksFromText } from "@/lib/marks-extractor";

const SUBJECTS = [
  "Company Law", "Economic Laws", "Tax Laws", 
  "Company Accounts", "Capital Markets", "Industrial Laws",
  "Jurisprudence, Interpretation & General Laws"
];

const LOADING_MESSAGES = [
  "Reading handwriting...",
  "Analyzing question structure...",
  "Extracting legal points...",
  "Cross-checking sections and case laws...",
  "Applying ICSI strict rubric...",
  "Computing exact marks..."
];

const EXTRACT_MESSAGES = [
  "Scanning handwritten sheets...",
  "Transcribing words...",
  "Verifying text structure...",
  "Preparing review screen..."
];

// Helper to compress base64 images via canvas
function compressBase64(base64: string, maxWidth = 400, quality = 0.5): Promise<string> {
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

export default function EvaluatePage() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [question, setQuestion] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // Rubric fallback: shown only when the backend can't find the question in the rubric bank
  const [rubricNotFound, setRubricNotFound] = useState(false);
  const [manualMarks, setManualMarks] = useState("5");
  
  // Step workflow state: "upload" | "extracting" | "review" | "evaluating" | "result"
  const [step, setStep] = useState<"upload" | "extracting" | "review" | "evaluating" | "result">("upload");
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [unclear, setUnclear] = useState(false);
  
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<any>(null);

  // Ideal answer lazy-loading states
  const [isLoadingIdealAnswer, setIsLoadingIdealAnswer] = useState(false);
  const [idealAnswer, setIdealAnswer] = useState("");

  const [parsedPaper, setParsedPaper] = useState<any | null>(null);
  const [activeEvalIdx, setActiveEvalIdx] = useState<number>(0);
  const [forceRender, setForceRender] = useState<number>(0);

  // Multi-question expected answers states
  const [idealAnswers, setIdealAnswers] = useState<Record<string, string>>({});
  const [loadingIdealAnswers, setLoadingIdealAnswers] = useState<Record<string, boolean>>({});

  const handleFetchMultiExpectedAnswer = async (evalItem: any) => {
    if (!evalItem || !evalItem.questionId || !result) return;
    
    setLoadingIdealAnswers(prev => ({ ...prev, [evalItem.questionId]: true }));
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/evaluate/expected-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          subject: result.subject || subject,
          question: evalItem.questionText,
          questionId: evalItem.questionId,
          paperId: result.paperId,
          marks: evalItem.total_marks
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch expected answer");
      }

      const data = await res.json();
      setIdealAnswers(prev => ({ ...prev, [evalItem.questionId]: data.expectedAnswer || "" }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to load expected answer. Please try again.");
    } finally {
      setLoadingIdealAnswers(prev => ({ ...prev, [evalItem.questionId]: false }));
    }
  };

  const isMultiQuestionPaper = (text: string): boolean => {
    if (!text) return false;
    const matches = text.match(/(?:Q\.?\s*\d+|Question\s*\d+|\b\d+\([a-z]\)|\b[2-9]\.\s)/gi);
    return matches !== null && matches.length >= 2;
  };



  // Load session if sessionId is in query param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get("sessionId");
      if (sessionId) {
        setStep("evaluating"); // show loader while fetching
        setLoadingMsgIdx(0);
        
        // Wait for auth state to resolve
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            try {
              const session = await getSessionById(sessionId);
              if (session && session.type === "evaluate") {
                setSubject(session.subject);
                setQuestion(session.question);
                setEditedText(session.studentCorrectedText || "");
                setExtractedText(session.originalExtractedText || "");
                setResult(session);
                if (session.model_answer) {
                  setIdealAnswer(session.model_answer);
                } else {
                  setIdealAnswer("");
                }
                setStep("result");
              } else {
                alert("Evaluation session not found.");
                setStep("upload");
              }
            } catch (err) {
              console.error("Failed to load session:", err);
              setStep("upload");
            }
          }
        });
        return () => unsubscribe();
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "extracting") {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % EXTRACT_MESSAGES.length);
      }, 1500);
    } else if (step === "evaluating") {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [step]);



  const handleFetchIdealAnswer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!result) return;
    if (!result.questionId) {
      alert("This evaluation is from an older session without a question reference. Please re-evaluate to enable the Ideal Answer feature.");
      return;
    }
    setIsLoadingIdealAnswer(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/evaluate/ideal-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          subject: result.subject || subject,
          question: result.question || question,
          questionId: result.questionId,
          marks: result.total_marks,
          questionNumber: result.questionNumber
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch ideal answer");
      }

      const data = await res.json();
      setIdealAnswer(data.model_answer || "");
      
      // Update result state
      const updatedResult = { ...result, model_answer: data.model_answer };
      setResult(updatedResult);

      // Save/update locally in sessions array in Firestore
      try {
        await updateSession(updatedResult);
      } catch (saveErr) {
        console.warn("Failed to update session locally in Firestore:", saveErr);
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to load ideal answer. Please try again.");
    } finally {
      setIsLoadingIdealAnswer(false);
    }
  };

  // Triggered after Upload step to start text extraction
  const handleStartExtraction = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!question.trim()) return alert("Please enter the question");
    if (uploadedImages.length === 0) return alert("Please upload at least one image");
    if (uploadedImages.some(img => img.status !== "ready")) {
      return alert("Please wait for all images to finish processing, and remove any with errors.");
    }

    setStep("extracting");
    setLoadingMsgIdx(0);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      // Check and parse paper in the background/parallel
      if (isMultiQuestionPaper(question)) {
        try {
          const parseRes = await fetch("/api/parse-paper", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": idToken ? `Bearer ${idToken}` : ""
            },
            body: JSON.stringify({ paperText: question })
          });
          if (parseRes.ok) {
            const paperData = await parseRes.json();
            setParsedPaper(paperData);
          } else {
            setParsedPaper(null);
          }
        } catch (parseErr) {
          console.warn("Failed to parse paper, continuing standard flow:", parseErr);
          setParsedPaper(null);
        }
      } else {
        setParsedPaper(null);
      }
      
      // Compress images before sending to OCR to avoid payload too large (413) or out-of-memory errors
      // Use optimized max width (1200) and quality (0.6) to keep quality high but significantly reduce payload size
      const compressedImagesForOCR = await Promise.all(
        uploadedImages.map(img => compressBase64(img.base64, 1200, 0.6))
      );

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          images: compressedImagesForOCR,
          mimeTypes: uploadedImages.map(() => "image/jpeg") // canvas outputs JPEGs
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to extract text");
      }

      const data = await res.json();
      setExtractedText(data.text || "");
      setEditedText(data.text || "");
      setUnclear(!!data.unclear);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to read answer sheet. Please try again.");
      setStep("upload");
    }
  };

  // Triggered from Review screen to perform final evaluation
  const handleEvaluate = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check and enforce daily usage limit
    const usageCheck = await checkAndIncrementUsage("evaluate");
    if (!usageCheck.allowed && usageCheck.limitReached) {
      setIsUpgradeOpen(true);
      return;
    }

    setStep("evaluating");
    setResult(null);
    setLoadingMsgIdx(0);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      if (parsedPaper) {
        // Multi-question paper evaluation path
        const res = await fetch("/api/evaluate-multi", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": idToken ? `Bearer ${idToken}` : ""
          },
          body: JSON.stringify({
            paperId: parsedPaper.paperId,
            subject,
            studentAnswer: editedText
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to evaluate multi-question paper");
        }

        const data = await res.json();
        setResult(data);

        const session = {
          id: crypto.randomUUID(),
          type: "evaluate",
          date: new Date().toISOString(),
          subject: subject as any,
          question,
          total_marks: data.total_marks,
          marks_awarded: data.marks_awarded,
          score_percentage: data.score_percentage,
          verdict: data.verdict,
          chapter: "Mixed Chapters",
          improvement_suggestion: "Attempt all remaining items in the exam paper.",
          originalExtractedText: extractedText,
          studentCorrectedText: editedText,
          isMultiQuestion: true,
          paperId: parsedPaper.paperId,
          evaluations: data.evaluations
        };

        await saveSession(session as any);
        setStep("result");
        return;
      }

      // Build request body — auto-detect marks from question text if present, or include manual marks
      const requestBody: Record<string, any> = {
        subject,
        question,
        studentAnswer: editedText
      };
      
      const extractedMarks = extractMarksFromText(question);

      if (extractedMarks && !isNaN(extractedMarks) && extractedMarks > 0 && extractedMarks <= 30) {
        requestBody.marks = extractedMarks;
      } else if (rubricNotFound) {
        requestBody.marks = parseInt(manualMarks);
      }

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        
        // Handle RUBRIC_NOT_FOUND: show manual marks fallback
        if (res.status === 422 && errData.code === "RUBRIC_NOT_FOUND") {
          setRubricNotFound(true);
          setStep("review");
          return;
        }
        
        throw new Error(errData.error || "Failed to evaluate");
      }
      
      const data = await res.json();
      setResult(data);

      const session: EvaluateSession = {
        id: crypto.randomUUID(),
        type: "evaluate",
        date: new Date().toISOString(),
        subject: subject as any,
        question,
        total_marks: data.total_marks,
        marks_awarded: data.marks_awarded,
        score_percentage: data.score_percentage,
        verdict: data.verdict,
        chapter: data.chapter,
        improvement_suggestion: data.improvement_suggestion,
        questionId: data.questionId,
        questionNumber: data.questionNumber,
        deductions: data.deductions,
        strengths: data.strengths,
        missing_points: data.missing_points,
        keywords_missing: data.keywords_missing,
        originalExtractedText: extractedText,
        studentCorrectedText: editedText
      };
      
      await saveSession(session);
      setRubricNotFound(false);
      setStep("result");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to evaluate answer. Please check console for details.");
      setStep("review");
    }
  };

  const isUploadDisabled = uploadedImages.length === 0 || uploadedImages.some(img => img.status === "uploading");

  return (
    <div className="min-h-screen pb-12">
      <TopBar 
        title="Evaluate Answer Sheet" 
        subtitle="Upload handwritten answers for strict ICSI standard evaluation"
        breadcrumbs={[{ label: "Home" }, { label: "Evaluate Answer", href: "/evaluate" }]} 
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8 reveal stagger-1">
        
        {/* ── STEP 1: UPLOAD FORM ──────────────────────────────── */}
        {step === "upload" && (
          <form className="bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Subject</label>
              <select 
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[11px] text-[#94a3b8]">Marks are auto-detected from our question bank</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Exam Question</label>
              <textarea 
                rows={3}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors resize-none"
                placeholder="Paste the exam question being answered here..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Answer Sheet Images</label>
              <ImageUploader 
                onImagesReady={(images) => setUploadedImages(images)} 
                maxImages={10} 
              />
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1.5 mt-2">
                <div className="font-bold text-[#0f2640] flex items-center gap-1.5">
                  <span>💡</span> Tips for best transcription accuracy:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-500 leading-normal">
                  <li>Take photos in <strong>good, clear lighting</strong> (avoid dark shadows).</li>
                  <li>Hold the camera <strong>flat and steady</strong> to prevent motion blur.</li>
                  <li>Ensure the pages are <strong>upright</strong> (not rotated or sideways).</li>
                </ul>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleStartExtraction}
                disabled={isUploadDisabled}
                className="w-full bg-[#e8590c] hover:bg-[#c94d0a] disabled:bg-[#94a3b8] text-white px-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
              >
                Continue to Review
              </button>
              <p className="text-xs text-center text-[#64748b] mt-3">Transcribes handwriting before strict evaluation</p>
            </div>
          </form>
        )}

        {/* ── STEP 2: EXTRACTION LOADING STATE ──────────────────── */}
        {step === "extracting" && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
            <Loader2 className="w-16 h-16 text-[#e8590c] animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#0f2640] tracking-tight">
                Reading your handwritten answer...
              </h2>
              <p className="text-sm text-[#64748b] animate-pulse max-w-xs mx-auto">
                {EXTRACT_MESSAGES[loadingMsgIdx]}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW AND EDIT FLOW ──────────────────────── */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-sm space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="bg-[#e8590c]/10 text-[#e8590c] p-3 rounded-lg shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#0f2640] tracking-tight">
                    Please review your answer before evaluation
                  </h2>
                  <p className="text-sm text-[#64748b] leading-relaxed">
                    We have converted your handwriting into text. Quickly check that everything looks correct before continuing.
                  </p>
                </div>
              </div>

              {parsedPaper && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0f2640] flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#e8590c]" />
                        Parsed Question Paper Structure
                      </h3>
                      <p className="text-xs text-[#64748b]">
                        We auto-detected the following questions and marks from your pasted question paper
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-200/80 text-slate-800 text-xs px-2.5 py-1 rounded-md font-bold">
                        {parsedPaper.totalQuestions} Questions
                      </span>
                      <span className="bg-[#e8590c]/10 text-[#e8590c] text-xs px-2.5 py-1 rounded-md font-bold">
                        Total {parsedPaper.totalMarks} Marks
                      </span>
                    </div>
                  </div>

                  {/* Warnings & Missing Gaps */}
                  {((parsedPaper.warnings && parsedPaper.warnings.length > 0) || (parsedPaper.missingQuestions && parsedPaper.missingQuestions.length > 0)) && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4" />
                        Paper Structure Warnings
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-amber-800/90 leading-relaxed">
                        {parsedPaper.missingQuestions && parsedPaper.missingQuestions.length > 0 && (
                          <li className="font-bold">
                            Missing question sequence detected: Expected {parsedPaper.missingQuestions.join(", ")}
                          </li>
                        )}
                        {parsedPaper.warnings && parsedPaper.warnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Questions Grid/List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {parsedPaper.questions && parsedPaper.questions.map((q: any, qIdx: number) => (
                      <div key={q.questionId || qIdx} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 hover:border-slate-300 transition-colors">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                              Question {q.questionNumber}
                            </span>
                            <p className="text-xs text-[#0f2640] leading-relaxed font-medium">
                              {q.questionText}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-500 shrink-0">
                            {q.marks} Marks
                          </span>
                        </div>

                        {/* Subparts */}
                        {q.subparts && q.subparts.length > 0 && (
                          <div className="pl-6 border-l-2 border-slate-100 space-y-2 mt-2">
                            {q.subparts.map((sub: any, sIdx: number) => (
                              <div key={sub.questionId || sIdx} className="flex justify-between items-start gap-3 bg-slate-50/50 p-2 rounded border border-slate-100/50">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded font-mono">
                                    Subpart {sub.questionNumber}
                                  </span>
                                  <p className="text-[11px] text-slate-700 leading-relaxed">
                                    {sub.questionText}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                  {sub.marks} Marks
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unclear && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm reveal">
                  <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Some parts of the answer may not be clear.</strong> Please review carefully before evaluation.
                  </p>
                </div>
              )}

              {/* Rubric not found fallback — manual marks selector */}
              {rubricNotFound && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 p-5 rounded-xl text-sm space-y-3 shadow-sm reveal">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Question not found in our question bank</p>
                      <p className="text-blue-800/80">We couldn&apos;t auto-detect the marks for this question. Please select the marks manually below.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-8">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider shrink-0">Total Marks:</label>
                    <select
                      className="border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white transition-colors"
                      value={manualMarks}
                      onChange={e => setManualMarks(e.target.value)}
                    >
                      <option value="3">3 marks</option>
                      <option value="5">5 marks</option>
                      <option value="7">7 marks</option>
                      <option value="10">10 marks</option>
                      <option value="15">15 marks</option>
                      <option value="20">20 marks</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider block">
                  Extracted Answer Text
                </label>
                <textarea
                  className="w-full border border-[#cbd5e1] rounded-xl px-4 py-4 text-[15px] font-sans leading-relaxed focus:outline-none focus:border-[#1a3a5c] bg-[#f8fafc] focus:bg-white transition-all resize-y min-h-[250px] shadow-inner"
                  value={editedText}
                  onChange={e => setEditedText(e.target.value)}
                  placeholder="Review and modify the parsed answer here..."
                />
              </div>

              <div className="border-t border-[#e2e8f0] pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => setStep("upload")}
                  className="w-full sm:w-auto px-6 py-3 border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 order-last sm:order-first"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                <button
                  onClick={handleEvaluate}
                  className="w-full sm:w-auto px-8 py-3 bg-[#e8590c] hover:bg-[#c94d0a] text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 text-center"
                >
                  Looks Correct — Evaluate Answer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: EVALUATING LOADING STATE ────────────────── */}
        {step === "evaluating" && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
            <Loader2 className="w-16 h-16 text-[#e8590c] animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[#0f2640] tracking-tight">
                Evaluating answer strictly...
              </h2>
              <p className="text-sm text-[#64748b] animate-pulse max-w-xs mx-auto">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 5: EVALUATION RESULTS ──────────────────────── */}
        {step === "result" && result && (() => {
          const activeEval = result.isMultiQuestion && result.evaluations && result.evaluations.length > 0
            ? result.evaluations[activeEvalIdx] || result.evaluations[0]
            : result;

          return (
            <div className="space-y-6 reveal stagger-2">
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setStep("upload");
                    setResult(null);
                    setQuestion("");
                    setUploadedImages([]);
                    setExtractedText("");
                    setEditedText("");
                    setIdealAnswer("");
                    setRubricNotFound(false);
                    setParsedPaper(null);
                    setActiveEvalIdx(0);
                    setIdealAnswers({});
                    setLoadingIdealAnswers({});
                  }}
                  className="flex items-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Start New Evaluation
                </button>

                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 font-mono">
                  ICSI EXAMINER REPORT
                </span>
              </div>

              {/* Scorecard Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2640] via-[#102a4a] to-[#1e3a5f] p-8 shadow-xl text-white border border-[#1e293b]/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-white/10 to-transparent rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
                
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold font-mono">Evaluation Report</span>
                    <h2 className="text-2xl md:text-3xl font-extrabold font-sora text-white">ICSI Scorecard</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      {!result.isMultiQuestion && result.questionNumber && (
                        <>
                          <span className="text-sm text-[#cbd5e1]">Question: <strong className="text-white">Q{result.questionNumber}</strong></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                        </>
                      )}
                      <span className="text-sm text-[#cbd5e1]">Subject: <strong className="text-white">{result.subject}</strong></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                      <span className="text-sm text-[#cbd5e1]">Chapter: <strong className="text-white">{result.isMultiQuestion ? "Multi-Question Paper" : (result.chapter || "General")}</strong></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                      <span className="text-sm text-[#cbd5e1]">Max Marks: <strong className="text-white">{result.total_marks}</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-1 font-bold font-mono">Score Obtained</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-extrabold font-playfair text-[#e8590c]">{result.marks_awarded}</span>
                        <span className="text-lg text-[#94a3b8]">/ {result.total_marks}</span>
                      </div>
                      <span className="text-xs text-[#38bdf8] font-semibold block mt-1 font-mono">{result.score_percentage}% Score</span>
                    </div>

                    <div className="h-16 w-[1px] bg-slate-700/50 hidden md:block" />

                    <div className="flex flex-col items-center">
                      <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-2 font-bold text-center font-mono">Verdict</span>
                      <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border font-mono ${
                        result.verdict === 'Pass'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : result.verdict === 'Fail'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {result.verdict}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Question Tabs Selector */}
              {result.isMultiQuestion && result.evaluations && result.evaluations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">
                    Questions in this evaluation
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.evaluations.map((evalItem: any, idx: number) => {
                      const isSelected = activeEvalIdx === idx;
                      return (
                        <button
                          key={evalItem.questionId || idx}
                          onClick={() => {
                            setActiveEvalIdx(idx);
                          }}
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                            isSelected
                              ? "bg-[#1a3a5c] text-white border-[#1a3a5c] shadow-md scale-[1.02]"
                              : "bg-white text-[#475569] border-[#e2e8f0] hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            evalItem.verdict === 'Pass' ? 'bg-green-500' : evalItem.verdict === 'Fail' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          Question {evalItem.questionNumber || `Q${idx + 1}`} ({evalItem.marks_awarded}/{evalItem.total_marks})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Question Info Panel */}
              {result.isMultiQuestion && activeEval && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0f2640] flex items-center gap-2">
                        <span className="bg-[#1a3a5c] text-white text-xs px-2 py-0.5 rounded font-bold font-mono">
                          Question {activeEval.questionNumber}
                        </span>
                        Evaluation Details
                      </h3>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        Chapter: <strong className="text-[#0f2640]">{activeEval.chapter || "General"}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">Score</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xl font-bold text-[#e8590c]">{activeEval.marks_awarded}</span>
                          <span className="text-xs text-slate-500 font-mono">/{activeEval.total_marks}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border font-mono ${
                        activeEval.verdict === 'Pass'
                          ? 'bg-green-500/10 text-green-700 border-green-500/30'
                          : activeEval.verdict === 'Fail'
                          ? 'bg-red-500/10 text-red-700 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                      }`}>
                        {activeEval.verdict}
                      </span>
                    </div>
                  </div>
                  
                  {/* Question Text */}
                  <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                    <strong className="text-[#0f2640]">Question text being evaluated:</strong>
                    <p className="mt-1 text-slate-600 font-normal">{activeEval.questionText || result.question}</p>
                  </div>
                </div>
              )}

              {/* Brief Improvement Suggestion */}
              {activeEval.improvement_suggestion && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                    <Edit3 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 font-mono">Improvement Suggestion</h4>
                    <p className="text-sm text-slate-700 italic leading-relaxed font-mono">
                      "{activeEval.improvement_suggestion}"
                    </p>
                  </div>
                </div>
              )}

              {/* Strengths & Missing Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-green-50/40 rounded-xl border border-green-200/60 p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-green-950 uppercase tracking-wider flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Key Strengths
                  </h4>
                  {activeEval.strengths && activeEval.strengths.length > 0 ? (
                    <ul className="space-y-2.5">
                      {activeEval.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-green-900 flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-800/60 italic">No specific strengths listed.</p>
                  )}
                </div>

                {/* Missing Substantive Points */}
                <div className="bg-amber-50/40 rounded-xl border border-amber-200/60 p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-2 font-mono">
                    <XCircle className="w-4 h-4 text-amber-600" /> Missing Points
                  </h4>
                  {activeEval.missing_points && activeEval.missing_points.length > 0 ? (
                    <ul className="space-y-2.5">
                      {activeEval.missing_points.map((pt: string, i: number) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-700 italic font-mono">No key points missing.</p>
                  )}
                </div>
              </div>

              {/* Keywords Missed */}
              <div className="bg-rose-50/40 rounded-xl border border-rose-200/60 p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-extrabold text-rose-950 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Keywords Missed
                </h4>
                {activeEval.keywords_missing && activeEval.keywords_missing.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeEval.keywords_missing.map((kw: string, i: number) => (
                      <span key={i} className="bg-rose-100 text-rose-800 text-xs px-3 py-1.5 rounded-full font-semibold border border-rose-200 font-mono">
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-700 italic font-mono">All essential keywords covered!</p>
                )}
              </div>

              {/* Ideal Answer Section */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f2640] font-sora">Ideal Model Answer</h3>
                    <p className="text-xs text-[#64748b] mt-0.5 font-mono">Official guideline answer formatted pointwise</p>
                  </div>
                  {((result.isMultiQuestion && activeEval && idealAnswers[activeEval.questionId]) || (!result.isMultiQuestion && idealAnswer)) && (
                    <button 
                      onClick={() => {
                        const textToCopy = result.isMultiQuestion ? idealAnswers[activeEval.questionId] : idealAnswer;
                        navigator.clipboard.writeText(textToCopy);
                        alert("Model answer copied to clipboard!");
                      }}
                      className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                    >
                      Copy Text
                    </button>
                  )}
                </div>

                {result.isMultiQuestion && activeEval ? (
                  idealAnswers[activeEval.questionId] ? (
                    <div className="bg-green-50/30 rounded-xl p-6 font-sans text-[#0f2640] text-[15px] leading-relaxed whitespace-pre-wrap border border-green-100/30">
                      {idealAnswers[activeEval.questionId]}
                    </div>
                  ) : (
                    <div className="pt-2 space-y-3">
                      <button
                        onClick={() => handleFetchMultiExpectedAnswer(activeEval)}
                        disabled={loadingIdealAnswers[activeEval.questionId]}
                        className="w-full bg-[#1a3a5c] hover:bg-[#0f2640] disabled:bg-[#94a3b8] disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {loadingIdealAnswers[activeEval.questionId] ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Formatting Guideline Answer...
                          </>
                        ) : (
                          "View Expected Answer"
                        )}
                      </button>
                    </div>
                  )
                ) : (
                  idealAnswer ? (
                    <div className="bg-green-50/30 rounded-xl p-6 font-sans text-[#0f2640] text-[15px] leading-relaxed whitespace-pre-wrap border border-green-100/30">
                      {idealAnswer}
                    </div>
                  ) : (
                    <div className="pt-2 space-y-3">
                      {!result.questionId && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 font-mono" />
                          <p className="text-sm font-mono">
                            This is an older evaluation. Re-evaluate to enable the Ideal Answer feature.
                          </p>
                        </div>
                      )}
                      <button
                        onClick={handleFetchIdealAnswer}
                        disabled={isLoadingIdealAnswer || !result.questionId}
                        className="w-full bg-[#1a3a5c] hover:bg-[#0f2640] disabled:bg-[#94a3b8] disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {isLoadingIdealAnswer ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Formatting Guideline Answer...
                          </>
                        ) : (
                          "View Ideal Answer"
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>

            </div>
          );
        })()}
      </div>
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
