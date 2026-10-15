"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import Chip from "../ui/Chip";
import { CheckCircle2, FileText, BarChart3, AlertCircle, ArrowUpRight } from "lucide-react";

export default function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Calculate the y translation for the cards.
  // We have 3 cards, each styled to have exactly 380px height.
  // The viewport height is 380px.
  // Total translation range: 0 to -760px.
  const y = useTransform(scrollYProgress, [0, 1], ["0px", "-760px"]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.33) {
      setActiveIndex(0);
    } else if (latest < 0.66) {
      setActiveIndex(1);
    } else {
      setActiveIndex(2);
    }
  });

  const features = [
    {
      index: 0,
      chip: "AI OCR & Grading",
      title: "Line-by-Line Answer Evaluation",
      description: "Submit photos of your handwritten answer sheet. Our model reads your handwriting, transcribes it, and evaluates it line-by-line against the strict ICSI marking scheme. See exactly where you earned marks and where you lost them.",
      bullets: [
        "Checks for mandatory sections and case law citations",
        "Flags missing legal keywords and incomplete statements",
        "Drafts a top-scoring ideal answer for comparison"
      ]
    },
    {
      index: 1,
      chip: "Mock Generator",
      title: "ICSI-Pattern Mock Papers",
      description: "Generate customized question papers based on specific subjects, modules, chapters, or difficulty levels. Built to perfectly mimic actual ICSI Executive and Professional exam structures.",
      bullets: [
        "Includes descriptive, short notes, and case study questions",
        "Matches official marks weightage (5, 7, 10, or 20 marks)",
        "Generated dynamically from your public syllabus PDFs"
      ]
    },
    {
      index: 2,
      chip: "Performance Analytics",
      title: "Weak Area Dashboard",
      description: "Every evaluation is analyzed to build your preparation strategy. Identify weak chapters, track score trends, and understand your mistake patterns before you sit for the actual exam.",
      bullets: [
        "Displays average score percentages per subject",
        "Categorizes recurring errors (e.g. sections missing)",
        "Recommends focus topics for your next study session"
      ]
    }
  ];

  return (
    <section 
      id="features" 
      ref={containerRef} 
      className={isDesktop ? "relative h-[300vh] w-full" : "relative w-full py-12"}
    >
      <div className={isDesktop ? "sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center items-center py-6 z-10" : "flex flex-col items-center py-6 z-10 w-full overflow-hidden"}>
        {/* Editorial Header */}
        <div className="flex flex-col items-center text-center mb-6 shrink-0 px-6">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#AFAEA2] mb-3 select-none">
            ENGINEERED FOR ICSI STANDARDS
          </p>
          <h2 
            className="text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-display-sans font-black uppercase text-lp-text tracking-tight max-w-[800px] mb-4"
          >
            SUPERCHARGE <span className="font-editorial-italic text-[#D21319] normal-case font-normal text-[1.15em]">your prep</span> WITH ACTIVE INTELLIGENCE.
          </h2>
          <p className="text-[13px] md:text-[14px] text-lp-muted max-w-[580px] leading-relaxed">
            Specifically tuned for the ICSI syllabus. No generic explanations, just rigorous preparation tailored for CS candidates.
          </p>
        </div>

        {/* Two-Column Grid container */}
        <div className={isDesktop ? "grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full max-w-[1000px] mx-auto px-6 h-[400px]" : "flex flex-col w-full max-w-[1000px] mx-auto px-6 mt-8"}>
          
          {/* Left Column: Sliding cards */}
          <div className={isDesktop ? "h-[380px] overflow-hidden relative w-full pr-4" : "w-full"}>
            <motion.div style={isDesktop ? { y } : {}} className={isDesktop ? "flex flex-col gap-0" : "flex flex-col gap-24"}>
              {features.map((feature, i) => {
                const isActive = isDesktop ? activeIndex === i : true;
                return (
                  <div
                    key={i}
                    className={isDesktop ? "h-[380px] flex flex-col justify-center transition-all duration-500 py-6" : "flex flex-col justify-center"}
                  >
                    <div 
                      className={`transition-all duration-500 origin-left ${
                        isActive 
                          ? "opacity-100 scale-100 translate-x-0 lg:translate-x-2" 
                          : "opacity-20 scale-95 translate-x-0"
                      }`}
                    >
                      <span className="text-xs uppercase tracking-[0.15em] font-bold text-[#D21319] bg-[#D21319]/10 px-3 py-1.5 rounded-lg border border-[#D21319]/25 mb-4 inline-block font-sora">
                        {feature.chip}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold font-sora text-lp-text mt-2 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-[13px] md:text-[14px] text-lp-muted leading-[1.6] mb-5">
                        {feature.description}
                      </p>
                      <ul className="space-y-2.5">
                        {feature.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] md:text-xs text-lp-muted">
                            <CheckCircle2 size={14} className="text-[#D21319] mt-0.5 shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Mobile Inline Visual (rendered directly below text on mobile) */}
                      {!isDesktop && (
                        <div className="w-full h-[340px] mt-8 rounded-2xl bg-[#222659]/80 border border-[#AFAEA2]/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col items-center justify-center p-4 backdrop-blur-md relative z-10">
                          <FeatureVisual index={feature.index} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Right Column: Sticky Mockup Visual Showcase (Desktop Only) */}
          {isDesktop && (
            <div className="w-full h-[380px] rounded-2xl bg-[#222659]/80 border border-[#AFAEA2]/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 z-10 backdrop-blur-md">
            <AnimatePresence mode="wait">
              
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-full"
              >
                <FeatureVisual index={activeIndex} />
              </motion.div>

            </AnimatePresence>
          </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white">
        {/* Simulated Header */}
        <div className="flex justify-between items-center pb-3 border-b border-lp-border-subtle">
          <div>
            <h4 className="font-bold font-sora text-lp-text">ICSI Examiner Report</h4>
            <p className="text-[10px] text-[#AFAEA2]">Q1. Shorter Notice Compliance</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-[#D21319] font-bold">Marks Awarded</span>
            <p className="text-lg font-bold text-[#D21319]">3.5 <span className="text-xs text-[#AFAEA2]">/ 5.0</span></p>
          </div>
        </div>

        {/* Score & Verdict Row */}
        <div className="py-2.5 flex items-center justify-between bg-lp-bg-card/40 px-3 rounded-lg border border-lp-border-subtle my-2">
          <span className="text-[10px] text-[#AFAEA2] font-medium">Verdict: <strong className="text-[#D21319]">Borderline Pass (70%)</strong></span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold uppercase tracking-wider">Pass</span>
        </div>

        {/* Evaluator Corrections */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 py-1 scrollbar-none">
          {/* Deduction Item */}
          <div className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Deduction (-1.0 mark): Section citation missing</p>
              <p className="text-[10px] text-[#AFAEA2] mt-0.5">Failed to cite Section 101(1) of the Companies Act, 2013 for the 21 clear days requirement.</p>
            </div>
          </div>

          {/* Deduction Item 2 */}
          <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Deduction (-0.5 mark): Incomplete reason</p>
              <p className="text-[10px] text-[#AFAEA2] mt-0.5">Vague definition of 'clear days'. Must specify exclusion of day of notice and day of meeting.</p>
            </div>
          </div>

          {/* Strength Item */}
          <div className="bg-green-950/20 border border-green-900/30 p-2.5 rounded-lg flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-300">Strength (+3.5 marks): Accurate exceptions</p>
              <p className="text-[10px] text-[#AFAEA2] mt-0.5">Perfect explanation of 95% consent rule for AGM and EGM shorter notice.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white">
        {/* Exam Paper Header */}
        <div className="text-center pb-4 border-b border-lp-border-subtle space-y-1">
          <h4 className="font-bold text-[10px] tracking-[0.2em] text-[#D21319] uppercase">THE INSTITUTE OF COMPANY SECRETARIES OF INDIA</h4>
          <p className="text-[9px] uppercase tracking-wider text-[#AFAEA2]">EXECUTIVE PROGRAMME &bull; SUBJECT EXAM</p>
          <p className="text-sm font-extrabold font-sora text-lp-text tracking-tight">COMPANY LAW &amp; COMPLIANCE</p>
          <div className="flex items-center justify-between text-[8px] text-[#AFAEA2] font-bold pt-1">
            <span>TIME ALLOWED: 3 HOURS</span>
            <span>MAXIMUM MARKS: 100</span>
          </div>
        </div>

        {/* Exam Paper Document Body */}
        <div className="flex-1 space-y-4 py-4 overflow-y-auto scrollbar-none">
          {/* Instructions */}
          <div className="text-[10px] italic text-[#AFAEA2] border-l-2 border-[#D21319]/40 pl-2">
            Note: Attempt all questions. Cite relevant sections of the Companies Act, 2013, Rules, and Secretarial Standards (SS) where applicable.
          </div>

          {/* Question 1 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-start font-bold">
              <span className="text-lp-text">Q1. (a) case study basis</span>
              <span className="text-[#D21319] font-mono shrink-0">[10 Marks]</span>
            </div>
            <p className="text-[10px] text-[#AFAEA2] leading-relaxed">
              Peacock Appliances Limited, an unlisted public company, was unable to redeem preference shares on maturity due to lack of distributable profits in the year 2024. State the legal procedures under Section 55(3) of the Act to resolve this.
            </p>
          </div>

          {/* Question 2 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-start font-bold">
              <span className="text-lp-text">Q1. (b) descriptive basis</span>
              <span className="text-[#D21319] font-mono shrink-0">[5 Marks]</span>
            </div>
            <p className="text-[10px] text-[#AFAEA2] leading-relaxed">
              Distinguish between Ordinary Resolution and Special Resolution, specifying voting thresholds and notice requirements under Section 114.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center pb-3 border-b border-lp-border-subtle">
          <div>
            <h4 className="font-bold font-sora text-lp-text">Strategy & Analytics</h4>
            <p className="text-[10px] text-lp-muted">Student ID: CS-EX-2401</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-bold">
            <span>Active Prep</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>

        {/* Score Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 my-3">
          <div className="bg-[#141639] border border-[#AFAEA2]/20 p-2.5 rounded-lg text-center">
            <span className="text-[9px] text-[#AFAEA2] uppercase font-bold block">Avg Score</span>
            <span className="text-base font-extrabold text-lp-text mt-0.5 block">62.8%</span>
          </div>
          <div className="bg-[#141639] border border-[#AFAEA2]/20 p-2.5 rounded-lg text-center">
            <span className="text-[9px] text-[#AFAEA2] uppercase font-bold block">Evaluated</span>
            <span className="text-base font-extrabold text-[#D21319] mt-0.5 block">42 papers</span>
          </div>
          <div className="bg-[#141639] border border-[#AFAEA2]/20 p-2.5 rounded-lg text-center">
            <span className="text-[9px] text-[#AFAEA2] uppercase font-bold block">Mistake Rate</span>
            <span className="text-base font-extrabold text-red-400 mt-0.5 block">-18%</span>
          </div>
        </div>

        {/* Charts and Data */}
        <div className="flex-1 flex flex-col justify-end space-y-3.5">
          {/* Topic Performance Bar Chart */}
          <div className="space-y-2">
            <h5 className="font-bold text-[9px] text-[#AFAEA2] uppercase tracking-wider">Subject Proficiency</h5>
            <div className="space-y-1.5">
              {/* Bar 1 */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#AFAEA2]">
                  <span>Company Law</span>
                  <span className="font-semibold text-lp-text">72%</span>
                </div>
                <div className="h-1.5 w-full bg-[#141639] rounded-full overflow-hidden">
                  <div className="h-full bg-[#D21319] rounded-full" style={{ width: "72%" }} />
                </div>
              </div>

              {/* Bar 2 */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#AFAEA2]">
                  <span>Securities & Capital Markets</span>
                  <span className="font-semibold text-lp-text">64%</span>
                </div>
                <div className="h-1.5 w-full bg-[#141639] rounded-full overflow-hidden">
                  <div className="h-full bg-[#D21319] rounded-full" style={{ width: "64%" }} />
                </div>
              </div>

              {/* Bar 3 */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] text-[#AFAEA2]">
                  <span>Tax Laws (Direct & Indirect)</span>
                  <span className="font-semibold text-red-400">42% (Focus area)</span>
                </div>
                <div className="h-1.5 w-full bg-[#141639] rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: "42%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation Panel */}
          <div className="p-2.5 rounded-lg bg-[#D21319]/10 border border-[#D21319]/25 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-[#AFAEA2]">
              <BarChart3 size={12} className="text-[#D21319]" />
              <span>Suggested focus: <strong className="text-white">GST Exemptions</strong> in Tax Laws</span>
            </div>
            <ArrowUpRight size={12} className="text-[#D21319]" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
