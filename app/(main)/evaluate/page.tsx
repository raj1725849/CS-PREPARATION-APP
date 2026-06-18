"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import { CheckSquare, FileWarning, Book, AlignLeft, Key, CheckCircle2, XCircle, ArrowLeft, Loader2, Edit3, ShieldAlert, Award, ClipboardCheck, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { saveSession, checkAndIncrementUsage } from "@/lib/storage";
import { EvaluateSession, EnhancedDeduction } from "@/lib/types";
import ImageUploader, { UploadedImage } from "@/components/ImageUploader";
import UpgradeModal from "@/components/UpgradeModal";
import { auth } from "@/lib/firebase";

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

const TABS = [
  { id: "scorecard", label: "Scorecard & Feedback", icon: Award },
  { id: "audit", label: "Question Audit", icon: ClipboardCheck },
  { id: "model", label: "Model Answer & Edits", icon: Sparkles },
  { id: "analytics", label: "Performance Analytics", icon: TrendingUp },
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
  const [marks, setMarks] = useState("5");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  
  // Step workflow state: "upload" | "extracting" | "review" | "evaluating" | "result"
  const [step, setStep] = useState<"upload" | "extracting" | "review" | "evaluating" | "result">("upload");
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [unclear, setUnclear] = useState(false);
  
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"scorecard" | "audit" | "model" | "analytics">("scorecard");

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
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          images: uploadedImages.map(img => img.base64),
          mimeTypes: uploadedImages.map(img => img.mimeType)
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

      // Compress images in parallel for storage auditing
      const compressedImages = await Promise.all(
        uploadedImages.map(img => compressBase64(img.base64))
      );

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          subject,
          question,
          marks: parseInt(marks),
          studentAnswer: editedText
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
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
        total_marks: parseInt(marks),
        marks_awarded: data.marks_awarded,
        score_percentage: data.score_percentage,
        verdict: data.verdict,
        deductions: data.deductions,
        model_answer: data.model_answer,
        question_analysis: data.question_analysis,
        answer_found: data.answer_found,
        answer_identification_note: data.answer_identification_note,
        keywords_found: data.keywords_found,
        keywords_missing: data.keywords_missing,
        sections_found: data.sections_found,
        sections_missing: data.sections_missing,
        acts_found: data.acts_found,
        acts_missing: data.acts_missing,
        examiner_note: data.examiner_note,
        originalImages: compressedImages,
        originalExtractedText: extractedText,
        studentCorrectedText: editedText,
        evaluation_summary: data.evaluation_summary,
        correctly_covered_points: data.correctly_covered_points,
        missing_points: data.missing_points,
        missing_keywords: data.missing_keywords,
        irrelevant_content: data.irrelevant_content,
        mark_deduction_analysis: data.mark_deduction_analysis,
        icsi_examiner_feedback: data.icsi_examiner_feedback,
        what_you_should_add: data.what_you_should_add,
        what_you_should_remove: data.what_you_should_remove,
        writing_analysis: data.writing_analysis,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        improvement_plan: data.improvement_plan
      };
      
      await saveSession(session);
      setStep("result");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to evaluate answer. Please check console for details.");
      setStep("review");
    }
  };

  const isUploadDisabled = uploadedImages.length === 0 || uploadedImages.some(img => img.status === "uploading");

  // Helper for sorting deductions
  const sortedDeductions = result?.deductions?.sort((a: EnhancedDeduction, b: EnhancedDeduction) => {
    const sevOrder = { critical: 1, major: 2, minor: 3 };
    const sevA = sevOrder[a.severity as keyof typeof sevOrder] || 4;
    const sevB = sevOrder[b.severity as keyof typeof sevOrder] || 4;
    if (sevA !== sevB) return sevA - sevB;
    return b.marks_deducted - a.marks_deducted;
  });

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#0f2640]">Subject</label>
                <select 
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#0f2640]">Total Marks for Question</label>
                <select 
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                  value={marks}
                  onChange={e => setMarks(e.target.value)}
                >
                  <option value="5">5 marks</option>
                  <option value="7">7 marks</option>
                  <option value="10">10 marks</option>
                  <option value="15">15 marks</option>
                  <option value="20">20 marks</option>
                </select>
              </div>
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

              {unclear && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm reveal">
                  <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Some parts of the answer may not be clear.</strong> Please review carefully before evaluation.
                  </p>
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
                  className="w-full sm:w-auto px-6 py-3 border border-[#cbd5e1] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white rounded-xl font-semibold text-sm transition-colors text-center"
                >
                  Update & Continue
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
        {/* ── STEP 5: EVALUATION RESULTS ──────────────────────── */}
        {step === "result" && result && (
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
                  setActiveTab("scorecard");
                }}
                className="flex items-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Start New Evaluation
              </button>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
                ICSI EXAMINER REPORT
              </span>
            </div>

            {!result.answer_found && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 shadow-sm">
                <span className="text-xl">⚠</span>
                <p><strong>Answer not clearly identified on the sheet.</strong> Ensure question numbers are written clearly. Evaluation based on visible content.</p>
              </div>
            )}

            {/* TAB SELECTOR */}
            <div className="flex flex-wrap p-1.5 bg-[#f1f5f9] rounded-xl gap-1 border border-[#e2e8f0]">
              {TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-white text-[#0f2640] shadow-sm"
                        : "text-[#64748b] hover:text-[#0f2640] hover:bg-white/50"
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? "text-[#e8590c]" : ""}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── TAB 1: SCORECARD & FEEDBACK ─────────────────────── */}
            {activeTab === "scorecard" && (
              <div className="space-y-6 reveal">
                
                {/* Premium Scoreboard Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2640] via-[#102a4a] to-[#1e3a5f] p-8 shadow-xl text-white border border-[#1e293b]/50">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-white/10 to-transparent rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
                  
                  <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-3">
                      <span className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold">Evaluation Report</span>
                      <h2 className="text-2xl md:text-3xl font-extrabold font-sora text-white">ICSI Scorecard</h2>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <span className="text-sm text-[#cbd5e1]">Subject: <strong className="text-white">{subject}</strong></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e8590c]" />
                        <span className="text-sm text-[#cbd5e1]">Max Marks: <strong className="text-white">{result.total_marks}</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-1 font-bold">Score Obtained</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-extrabold font-playfair text-[#e8590c]">{result.marks_awarded}</span>
                          <span className="text-lg text-[#94a3b8]">/ {result.total_marks}</span>
                        </div>
                        <span className="text-xs text-[#38bdf8] font-semibold block mt-1">{result.score_percentage}% Score</span>
                      </div>

                      <div className="h-16 w-[1px] bg-slate-700/50 hidden md:block" />

                      <div className="flex flex-col items-center">
                        <span className="text-xs text-[#94a3b8] block uppercase tracking-wider mb-2 font-bold text-center">Verdict</span>
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
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
                  
                  {/* Progress Bar */}
                  <div className="mt-8 pt-6 border-t border-slate-700/30">
                    <div className="flex justify-between text-xs text-[#94a3b8] mb-2 font-bold">
                      <span>EVALUATION COMPLETE</span>
                      <span>{result.score_percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          result.verdict === 'Pass' 
                            ? 'bg-green-500' 
                            : result.verdict === 'Fail' 
                            ? 'bg-red-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${result.score_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Examiner Note */}
                {result.examiner_note && (
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5 shadow-sm flex items-start gap-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                      <Edit3 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Examiner Note</h4>
                      <p className="text-sm text-slate-700 italic leading-relaxed">
                        "{result.examiner_note}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Evaluation Summary */}
                {result.evaluation_summary && (
                  <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-2">
                    <h4 className="text-sm font-bold text-[#0f2640] uppercase tracking-wider">Executive Summary</h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{result.evaluation_summary}</p>
                  </div>
                )}

                {/* ICSI Examiner Feedback */}
                {result.icsi_examiner_feedback && result.icsi_examiner_feedback.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-[#0f2640] flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 bg-[#e8590c] rounded-full" />
                      How an ICSI Examiner Views This Answer
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {result.icsi_examiner_feedback.map((item: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start text-sm text-[#334155] bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0f2640]/5 text-[#0f2640] text-xs font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: QUESTION-WISE AUDIT ──────────────────────── */}
            {activeTab === "audit" && (
              <div className="space-y-6 reveal">
                
                {/* Question Analysis Card */}
                <div className="bg-slate-50 rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#0f2640] mb-4 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-[#e8590c]" />
                    Required Answer Architecture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Question Type</p>
                        <span className="inline-block px-3 py-1 bg-[#1a3a5c]/5 text-[#1a3a5c] rounded-md text-xs font-semibold uppercase">
                          {result.question_analysis?.question_type || "Standard"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1">Expected Structure</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{result.question_analysis?.expected_structure}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Relevant Acts</p>
                        <div className="flex flex-wrap gap-2">
                          {result.question_analysis?.relevant_acts?.length ? result.question_analysis.relevant_acts.map((act: string, i: number) => (
                            <span key={i} className="bg-[#1a3a5c] text-white text-xs px-2.5 py-1 rounded-full font-medium">{act}</span>
                          )) : <span className="text-xs text-[#94a3b8]">None required</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">Key Sections</p>
                        <div className="flex flex-wrap gap-2">
                          {result.question_analysis?.mandatory_sections?.length ? result.question_analysis.mandatory_sections.map((sec: string, i: number) => (
                            <span key={i} className="bg-[#1a3a5c] text-white text-xs px-2.5 py-1 rounded-full font-medium">{sec}</span>
                          )) : <span className="text-xs text-[#94a3b8]">None required</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coverage Audit Lists */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#0f2640] uppercase tracking-wider mb-4">Statutory & Keyword Coverage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      {/* Acts */}
                      <div className="space-y-3 pt-4 md:pt-0">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider">
                          <Book className="w-4 h-4 text-[#64748b]" /> Acts
                        </h4>
                        <ul className="space-y-2">
                          {result.acts_found?.map((act: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{act}</span></li>
                          ))}
                          {result.acts_missing?.map((act: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-500"><XCircle className="w-4 h-4 text-red-400 shrink-0" /> <span>{act}</span></li>
                          ))}
                          {!result.acts_found?.length && !result.acts_missing?.length && <li className="text-xs text-[#94a3b8]">N/A</li>}
                        </ul>
                      </div>

                      {/* Sections */}
                      <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider">
                          <AlignLeft className="w-4 h-4 text-[#64748b]" /> Sections
                        </h4>
                        <ul className="space-y-2">
                          {result.sections_found?.map((sec: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{sec}</span></li>
                          ))}
                          {result.sections_missing?.map((sec: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-500"><XCircle className="w-4 h-4 text-red-400 shrink-0" /> <span>{sec}</span></li>
                          ))}
                          {!result.sections_found?.length && !result.sections_missing?.length && <li className="text-xs text-[#94a3b8]">N/A</li>}
                        </ul>
                      </div>

                      {/* Keywords */}
                      <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider">
                          <Key className="w-4 h-4 text-[#64748b]" /> Keywords
                        </h4>
                        <ul className="space-y-2">
                          {result.keywords_found?.map((kw: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{kw}</span></li>
                          ))}
                          {result.keywords_missing?.map((kw: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-500"><XCircle className="w-4 h-4 text-red-400 shrink-0" /> <span>{kw}</span></li>
                          ))}
                          {!result.keywords_found?.length && !result.keywords_missing?.length && <li className="text-xs text-[#94a3b8]">N/A</li>}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Pedagogical Audit Blocks */}
                  <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Correctly Covered Legal Points
                      </h4>
                      {result.correctly_covered_points && result.correctly_covered_points.length > 0 ? (
                        <ul className="space-y-2">
                          {result.correctly_covered_points.map((pt: string, i: number) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-green-50/30 p-2.5 rounded-lg border border-green-100/30">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No points correctly covered.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-amber-600" />
                        Missing Substantive Points
                      </h4>
                      {result.missing_points && result.missing_points.length > 0 ? (
                        <ul className="space-y-2">
                          {result.missing_points.map((pt: string, i: number) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/30">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-600 italic">Perfect! No substantive points missing.</p>
                      )}
                    </div>
                  </div>

                  {/* Irrelevant Content Alert */}
                  {result.irrelevant_content && result.irrelevant_content.length > 0 && (
                    <div className="border-t border-slate-100 pt-6">
                      <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-sm flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-rose-900 mb-1">Irrelevant Information Identified</h4>
                          <p className="text-xs text-rose-800/80 mb-2">The following details are outside the scope of the question and did not earn marks:</p>
                          <ul className="list-disc pl-4 space-y-1 text-xs">
                            {result.irrelevant_content.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mark Deductions List */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#0f2640] mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <FileWarning className="w-4 h-4 text-[#e8590c]" />
                    Strict Marking & Deduction Audit
                  </h3>
                  
                  {!sortedDeductions || sortedDeductions.length === 0 ? (
                    <p className="text-sm text-green-600 font-medium bg-green-50 p-4 rounded-lg">Perfect answer! No deductions made by the examiner.</p>
                  ) : (
                    <div className="divide-y divide-[#e2e8f0]">
                      {sortedDeductions.map((d: EnhancedDeduction, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white ${
                                d.severity === 'critical' ? 'bg-red-600' : 
                                d.severity === 'major' ? 'bg-orange-500' : 
                                'bg-gray-500'
                              }`}>
                                {d.severity}
                              </span>
                              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                d.type === 'missing' ? 'bg-red-50 text-red-700 border border-red-100' : 
                                d.type === 'wrong' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 
                                'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {d.type}
                              </span>
                            </div>
                            <p className="text-sm text-[#0f2640] leading-relaxed">
                              <strong>Expected:</strong> {d.what_was_expected}
                            </p>
                            {d.what_student_wrote && (
                              <p className="text-xs text-[#64748b] leading-relaxed italic bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100 inline-block">
                                Student wrote: "{d.what_student_wrote}"
                              </p>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-red-600 whitespace-nowrap shrink-0 mt-1">
                            −{d.marks_deducted} marks
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Qualitative Mark Deduction Analysis */}
                  {result.mark_deduction_analysis && result.mark_deduction_analysis.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marks Deduction Summary</h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                        {result.mark_deduction_analysis.map((analysis: string, i: number) => (
                          <li key={i}>{analysis}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── TAB 3: MODEL ANSWER & IMPROVEMENT ───────────────── */}
            {activeTab === "model" && (
              <div className="space-y-6 reveal">
                
                {/* Ideal Model Answer Card */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] border-l-4 border-l-green-600 p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#0f2640] font-sora">Official Model Answer</h3>
                      <p className="text-xs text-[#64748b] mt-0.5">Point-wise structure required for scoring full marks at ICSI levels</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(result.model_answer);
                        alert("Model answer copied to clipboard!");
                      }}
                      className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                    >
                      Copy Text
                    </button>
                  </div>
                  <div className="bg-green-50/30 rounded-xl p-6 font-sans text-[#0f2640] text-[15px] leading-relaxed whitespace-pre-wrap border border-green-100/30">
                    {result.model_answer}
                  </div>
                </div>

                {/* What to Add vs What to Remove */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* What You Should Add */}
                  <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 text-green-600 rounded-lg shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">What You Should Have Added</h4>
                        <p className="text-xs text-[#64748b]">Key contents missing in your submitted draft</p>
                      </div>
                    </div>
                    {result.what_you_should_add && result.what_you_should_add.length > 0 ? (
                      <ul className="space-y-3">
                        {result.what_you_should_add.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-green-600 italic font-medium bg-green-50 p-4 rounded-xl text-center">Perfect! You included everything that was required.</p>
                    )}
                  </div>

                  {/* What You Should Remove */}
                  <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 text-red-600 rounded-lg shrink-0">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">What You Should Remove / Avoid</h4>
                        <p className="text-xs text-[#64748b]">Irrelevant theory or repetitive statements</p>
                      </div>
                    </div>
                    {result.what_you_should_remove && result.what_you_should_remove.length > 0 ? (
                      <ul className="space-y-3">
                        {result.what_you_should_remove.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-green-600 italic font-medium bg-green-50 p-4 rounded-xl text-center">Excellent! No unnecessary content identified in your answer.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 4: PERFORMANCE ANALYTICS ───────────────────── */}
            {activeTab === "analytics" && (
              <div className="space-y-6 reveal">
                
                {/* 6-Point Writing Quality Grid */}
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-[#0f2640] font-sora">6-Point Writing Quality Audit</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Evaluation of answer craftsmanship against statutory drafting guidelines</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Structure */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">1. Structure & Organization</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.structure || "No structure data available."}
                        </p>
                      </div>
                    </div>

                    {/* Presentation */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">2. Presentation & Formatting</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.presentation || "No presentation data available."}
                        </p>
                      </div>
                    </div>

                    {/* Relevance */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">3. Content Relevance</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.relevance || "No relevance data available."}
                        </p>
                      </div>
                    </div>

                    {/* Legal Language */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">4. Legal Terminology & Phrasing</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.legal_language || "No legal language data available."}
                        </p>
                      </div>
                    </div>

                    {/* Use of Keywords */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">5. Citing of Acts & Sections</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.use_of_keywords || "No section citation data available."}
                        </p>
                      </div>
                    </div>

                    {/* Completeness */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#e8590c] uppercase tracking-wider block mb-1">6. Completeness of Sub-Parts</span>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          {result.writing_analysis?.completeness || "No completeness data available."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-green-50/40 rounded-xl border border-green-200/60 p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-extrabold text-green-950 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" /> Key Strengths
                    </h4>
                    {result.strengths && result.strengths.length > 0 ? (
                      <ul className="space-y-2.5">
                        {result.strengths.map((s: string, i: number) => (
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

                  {/* Weaknesses */}
                  <div className="bg-rose-50/40 rounded-xl border border-rose-200/60 p-6 shadow-sm space-y-4">
                    <h4 className="text-sm font-extrabold text-rose-950 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Areas of Improvement
                    </h4>
                    {result.weaknesses && result.weaknesses.length > 0 ? (
                      <ul className="space-y-2.5">
                        {result.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-rose-900 flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-2 shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-rose-800/60 italic">No specific weaknesses listed.</p>
                    )}
                  </div>
                </div>

                {/* Personalized Improvement Plan */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#0f2640] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#e8590c]" />
                    ICSI Improvement Action Plan
                  </h3>
                  {result.improvement_plan && result.improvement_plan.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {result.improvement_plan.map((item: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1a3a5c] text-white text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-sm text-[#334155] leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No custom plan required. Keep it up!</p>
                  )}
                </div>

              </div>
            )}

          </div>
        )}
      </div>
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
