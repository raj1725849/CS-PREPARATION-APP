"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import { CheckSquare, FileWarning, Book, AlignLeft, Key, CheckCircle2, XCircle, ArrowLeft, Loader2, Edit3, ShieldAlert } from "lucide-react";
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
        studentCorrectedText: editedText
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
        {step === "result" && result && (
          <div className="space-y-6 reveal stagger-2">
            
            <div className="flex justify-start">
              <button
                onClick={() => {
                  setStep("upload");
                  setResult(null);
                  setQuestion("");
                  setUploadedImages([]);
                  setExtractedText("");
                  setEditedText("");
                }}
                className="flex items-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Start New Evaluation
              </button>
            </div>

            {!result.answer_found && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 shadow-sm">
                <span className="text-xl">⚠</span>
                <p><strong>Answer not clearly identified on the sheet.</strong> Ensure question numbers are written clearly. Evaluation based on visible content.</p>
              </div>
            )}

            {/* SECTION A - SCORE CARD */}
            <div className="bg-[#0f2640] rounded-xl border border-[#1a3a5c] p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 text-white">
              <div>
                <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-1">Final Score</h3>
                <div className="text-4xl font-bold font-playfair">{result.marks_awarded} <span className="text-xl text-[#64748b] font-sans font-normal">/ {result.total_marks} marks</span></div>
              </div>
              <div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide
                  ${result.verdict === 'Pass' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    result.verdict === 'Fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                    'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`
                }>
                  {result.verdict.toUpperCase()}
                </span>
              </div>
            </div>

            {/* SECTION B - QUESTION ANALYSIS CARD */}
            <div className="bg-[#f0f4f8] rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#1a3a5c] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0f2640] mb-4 uppercase tracking-wider">Question Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">Question Type</p>
                    <p className="text-sm text-[#0f2640] font-medium">{result.question_analysis?.question_type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">Expected Structure</p>
                    <p className="text-sm text-[#0f2640] font-medium">{result.question_analysis?.expected_structure}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Relevant Acts</p>
                    <div className="flex flex-wrap gap-2">
                      {result.question_analysis?.relevant_acts?.length ? result.question_analysis.relevant_acts.map((act: string, i: number) => (
                        <span key={i} className="bg-[#1a3a5c] text-white text-xs px-2.5 py-1 rounded-full">{act}</span>
                      )) : <span className="text-xs text-[#94a3b8]">None required</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Key Sections</p>
                    <div className="flex flex-wrap gap-2">
                      {result.question_analysis?.mandatory_sections?.length ? result.question_analysis.mandatory_sections.map((sec: string, i: number) => (
                        <span key={i} className="bg-[#1a3a5c] text-white text-xs px-2.5 py-1 rounded-full">{sec}</span>
                      )) : <span className="text-xs text-[#94a3b8]">None required</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C - COVERAGE ANALYSIS */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0f2640] mb-4 uppercase tracking-wider">Coverage Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#e2e8f0]">
                {/* Acts */}
                <div className="space-y-3 pt-4 md:pt-0">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0f2640]">
                    <Book className="w-4 h-4 text-[#64748b]" /> Acts
                  </h4>
                  <ul className="space-y-2">
                    {result.acts_found?.map((act: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{act}</span></li>
                    ))}
                    {result.acts_missing?.map((act: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#64748b]"><XCircle className="w-4 h-4 text-red-500 shrink-0" /> <span>{act}</span></li>
                    ))}
                    {!result.acts_found?.length && !result.acts_missing?.length && <li className="text-[12px] text-[#94a3b8]">N/A</li>}
                  </ul>
                </div>

                {/* Sections */}
                <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0f2640]">
                    <AlignLeft className="w-4 h-4 text-[#64748b]" /> Sections
                  </h4>
                  <ul className="space-y-2">
                    {result.sections_found?.map((sec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{sec}</span></li>
                    ))}
                    {result.sections_missing?.map((sec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#64748b]"><XCircle className="w-4 h-4 text-red-500 shrink-0" /> <span>{sec}</span></li>
                    ))}
                    {!result.sections_found?.length && !result.sections_missing?.length && <li className="text-[12px] text-[#94a3b8]">N/A</li>}
                  </ul>
                </div>

                {/* Keywords */}
                <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0f2640]">
                    <Key className="w-4 h-4 text-[#64748b]" /> Keywords
                  </h4>
                  <ul className="space-y-2">
                    {result.keywords_found?.map((kw: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#0f2640]"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> <span>{kw}</span></li>
                    ))}
                    {result.keywords_missing?.map((kw: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#64748b]"><XCircle className="w-4 h-4 text-red-500 shrink-0" /> <span>{kw}</span></li>
                    ))}
                    {!result.keywords_found?.length && !result.keywords_missing?.length && <li className="text-[12px] text-[#94a3b8]">N/A</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION D - DEDUCTIONS CARD */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0f2640] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <FileWarning className="w-4 h-4 text-[#e8590c]" /> Deductions Found
              </h3>
              
              {!sortedDeductions || sortedDeductions.length === 0 ? (
                <p className="text-sm text-green-600 font-medium">Perfect answer! No deductions found.</p>
              ) : (
                <div className="space-y-0">
                  {sortedDeductions.map((d: EnhancedDeduction, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-4 py-4 border-b border-[#e2e8f0] last:border-0 last:pb-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white
                            ${d.severity === 'critical' ? 'bg-red-600' : 
                              d.severity === 'major' ? 'bg-orange-500' : 
                              'bg-gray-500'}`
                          }>
                            {d.severity}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                            ${d.type === 'missing' ? 'bg-red-100 text-red-700' : 
                              d.type === 'wrong' ? 'bg-orange-100 text-orange-700' : 
                              'bg-blue-100 text-blue-700'}`
                          }>
                            {d.type}
                          </span>
                        </div>
                        <p className="text-sm text-[#0f2640] leading-relaxed">
                          <strong>Expected:</strong> {d.what_was_expected}
                        </p>
                        {d.what_student_wrote && (
                          <p className="text-sm text-[#64748b] leading-relaxed italic">
                            Student wrote: "{d.what_student_wrote}"
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-bold text-red-600 whitespace-nowrap shrink-0 mt-1">
                        −{d.marks_deducted} marks
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION E - MODEL ANSWER CARD */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] border-l-4 border-l-green-500 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0f2640] mb-2 uppercase tracking-wider">Model Answer</h3>
              <p className="text-xs text-[#64748b] mb-4">Based on question analysis — this is what ICSI expects for full marks</p>
              <div className="bg-green-50/50 rounded-lg p-4 font-serif text-[#0f2640] leading-relaxed whitespace-pre-wrap">
                {result.model_answer}
              </div>
            </div>

            {/* SECTION F - EXAMINER NOTE */}
            {result.examiner_note && (
              <div className="bg-white rounded-xl border border-[#e2e8f0] border-l-4 border-l-[#e8590c] p-5 shadow-sm">
                <p className="text-[13px] text-[#64748b] italic">
                  📝 <span className="font-semibold text-[#0f2640] not-italic">Examiner Note:</span> {result.examiner_note}
                </p>
              </div>
            )}

          </div>
        )}
      </div>
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}
