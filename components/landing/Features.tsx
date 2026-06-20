"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Chip from "../ui/Chip";
import { CheckCircle2, FileText, BarChart3, AlertCircle, ArrowUpRight } from "lucide-react";

export default function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to track active feature scroll card
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            setActiveIndex(index);
          }
        });
      },
      {
        root: null,
        rootMargin: "-25% 0px -45% 0px", // Trigger when the section reaches the center of the viewport
        threshold: 0.2,
      }
    );

    const cards = document.querySelectorAll(".feature-scroll-card");
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, []);

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
    <section id="features" className="px-6 py-20 md:py-28 max-w-[1000px] mx-auto w-full relative z-10">
      {/* Editorial Header */}
      <div className="flex flex-col items-center text-center mb-16 md:mb-24">
        <Chip className="mb-6">AI Tutor Capabilities</Chip>
        <h2 
          className="text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.15] font-bold font-sora text-lp-text tracking-tight max-w-[800px] mb-6"
        >
          Supercharge <span className="font-playfair-italic text-lp-accent font-normal">your prep</span> with Active Intelligence.
        </h2>
        <p className="text-[14px] md:text-[16px] text-lp-muted max-w-[580px] leading-relaxed">
          Specifically tuned for the ICSI syllabus. No generic explanations, just rigorous preparation tailored for CS candidates.
        </p>
      </div>

      {/* Two-Column Sticky Scroll Layout */}
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start relative">
        
        {/* Left Column: Scrollable cards */}
        <div className="space-y-4 lg:pr-4">
          {features.map((feature, i) => {
            const isActive = activeIndex === i;
            return (
              <div
                key={i}
                data-index={i}
                className="feature-scroll-card min-h-[55vh] flex flex-col justify-center transition-all duration-500 py-12 first:pt-0 last:pb-16"
              >
                <div 
                  className={`transition-all duration-500 origin-left ${
                    isActive 
                      ? "opacity-100 scale-100 translate-x-2" 
                      : "opacity-30 scale-95 translate-x-0 pointer-events-none lg:pointer-events-auto"
                  }`}
                >
                  <span className="text-xs uppercase tracking-[0.15em] font-bold text-lp-accent bg-lp-accent/10 px-3 py-1.5 rounded-lg border border-lp-accent/20 mb-4 inline-block">
                    {feature.chip}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold font-sora text-lp-text mt-2 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-lp-muted leading-[1.7] mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-lp-muted">
                        <CheckCircle2 size={16} className="text-lp-accent mt-0.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Sticky Mockup Visual Showcase */}
        <div className="lg:sticky lg:top-[120px] w-full aspect-[4/3] rounded-2xl bg-[#0e352a]/60 border border-lp-border-medium shadow-[0_20px_50px_rgba(232,242,158,0.04)] overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 min-h-[350px] md:min-h-[420px] z-10 backdrop-blur-md">
          <AnimatePresence mode="wait">
            
            {/* Visual 0: Answer Evaluation Panel */}
            {activeIndex === 0 && (
              <motion.div
                key="evaluation"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white"
              >
                {/* Simulated Header */}
                <div className="flex justify-between items-center pb-3 border-b border-lp-border-subtle">
                  <div>
                    <h4 className="font-bold font-sora text-lp-text">ICSI Examiner Report</h4>
                    <p className="text-[10px] text-lp-muted">Q1. Shorter Notice Compliance</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-lp-accent font-bold">Marks Awarded</span>
                    <p className="text-lg font-bold text-lp-accent">3.5 <span className="text-xs text-lp-muted">/ 5.0</span></p>
                  </div>
                </div>

                {/* Score & Verdict Row */}
                <div className="py-2.5 flex items-center justify-between bg-lp-bg-card/40 px-3 rounded-lg border border-lp-border-subtle my-2">
                  <span className="text-[10px] text-lp-muted font-medium">Verdict: <strong className="text-lp-accent">Borderline Pass (70%)</strong></span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold uppercase tracking-wider">Pass</span>
                </div>

                {/* Evaluator Corrections */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-1 py-1 scrollbar-none">
                  {/* Deduction Item */}
                  <div className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-300">Deduction (-1.0 mark): Section citation missing</p>
                      <p className="text-[10px] text-lp-muted mt-0.5">Failed to cite Section 101(1) of the Companies Act, 2013 for the 21 clear days requirement.</p>
                    </div>
                  </div>

                  {/* Deduction Item 2 */}
                  <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-300">Deduction (-0.5 mark): Incomplete reason</p>
                      <p className="text-[10px] text-lp-muted mt-0.5">Vague definition of 'clear days'. Must specify exclusion of day of notice and day of meeting.</p>
                    </div>
                  </div>

                  {/* Strength Item */}
                  <div className="bg-green-950/20 border border-green-900/30 p-2.5 rounded-lg flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-300">Strength (+3.5 marks): Accurate exceptions</p>
                      <p className="text-[10px] text-lp-muted mt-0.5">Perfect explanation of 95% consent rule for AGM and EGM shorter notice.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Visual 1: Exam Question Paper Mockup */}
            {activeIndex === 1 && (
              <motion.div
                key="paper"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white"
              >
                {/* Exam Paper Header */}
                <div className="text-center pb-4 border-b border-lp-border-subtle space-y-1">
                  <h4 className="font-bold text-[10px] tracking-[0.2em] text-lp-accent uppercase">THE INSTITUTE OF COMPANY SECRETARIES OF INDIA</h4>
                  <p className="text-[9px] uppercase tracking-wider text-lp-muted">EXECUTIVE PROGRAMME &bull; SUBJECT EXAM</p>
                  <p className="text-sm font-extrabold font-sora text-lp-text tracking-tight">COMPANY LAW &amp; COMPLIANCE</p>
                  <div className="flex items-center justify-between text-[8px] text-lp-dim font-bold pt-1">
                    <span>TIME ALLOWED: 3 HOURS</span>
                    <span>MAXIMUM MARKS: 100</span>
                  </div>
                </div>

                {/* Exam Paper Document Body */}
                <div className="flex-1 space-y-4 py-4 overflow-y-auto scrollbar-none">
                  {/* Instructions */}
                  <div className="text-[10px] italic text-lp-muted border-l-2 border-lp-accent/40 pl-2">
                    Note: Attempt all questions. Cite relevant sections of the Companies Act, 2013, Rules, and Secretarial Standards (SS) where applicable.
                  </div>

                  {/* Question 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-lp-text">Q1. (a) case study basis</span>
                      <span className="text-lp-accent font-mono shrink-0">[10 Marks]</span>
                    </div>
                    <p className="text-[10px] text-lp-muted leading-relaxed">
                      Peacock Appliances Limited, an unlisted public company, was unable to redeem preference shares on maturity due to lack of distributable profits in the year 2024. State the legal procedures under Section 55(3) of the Act to resolve this.
                    </p>
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-lp-text">Q1. (b) descriptive basis</span>
                      <span className="text-lp-accent font-mono shrink-0">[5 Marks]</span>
                    </div>
                    <p className="text-[10px] text-lp-muted leading-relaxed">
                      Distinguish between Ordinary Resolution and Special Resolution, specifying voting thresholds and notice requirements under Section 114.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Visual 2: Analytics & Weak Area Dashboard */}
            {activeIndex === 2 && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-full flex flex-col justify-between text-left font-sans text-xs text-white"
              >
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
                  <div className="bg-lp-bg-card/50 border border-lp-border-subtle p-2.5 rounded-lg text-center">
                    <span className="text-[9px] text-lp-dim uppercase font-bold block">Avg Score</span>
                    <span className="text-base font-extrabold text-lp-text mt-0.5 block">62.8%</span>
                  </div>
                  <div className="bg-lp-bg-card/50 border border-lp-border-subtle p-2.5 rounded-lg text-center">
                    <span className="text-[9px] text-lp-dim uppercase font-bold block">Evaluated</span>
                    <span className="text-base font-extrabold text-lp-accent mt-0.5 block">42 papers</span>
                  </div>
                  <div className="bg-lp-bg-card/50 border border-lp-border-subtle p-2.5 rounded-lg text-center">
                    <span className="text-[9px] text-lp-dim uppercase font-bold block">Mistake Rate</span>
                    <span className="text-base font-extrabold text-red-400 mt-0.5 block">-18%</span>
                  </div>
                </div>

                {/* Charts and Data */}
                <div className="flex-1 flex flex-col justify-end space-y-3.5">
                  {/* Topic Performance Bar Chart */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-[9px] text-lp-muted uppercase tracking-wider">Subject Proficiency</h5>
                    <div className="space-y-1.5">
                      {/* Bar 1 */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] text-lp-muted">
                          <span>Company Law</span>
                          <span className="font-semibold text-lp-text">72%</span>
                        </div>
                        <div className="h-1.5 w-full bg-lp-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-lp-accent rounded-full" style={{ width: "72%" }} />
                        </div>
                      </div>

                      {/* Bar 2 */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] text-lp-muted">
                          <span>Securities & Capital Markets</span>
                          <span className="font-semibold text-lp-text">64%</span>
                        </div>
                        <div className="h-1.5 w-full bg-lp-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-lp-accent rounded-full" style={{ width: "64%" }} />
                        </div>
                      </div>

                      {/* Bar 3 */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] text-lp-muted">
                          <span>Tax Laws (Direct & Indirect)</span>
                          <span className="font-semibold text-red-400">42% (Focus area)</span>
                        </div>
                        <div className="h-1.5 w-full bg-lp-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: "42%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Panel */}
                  <div className="p-2.5 rounded-lg bg-lp-accent/5 border border-lp-accent/20 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-lp-muted">
                      <BarChart3 size={12} className="text-lp-accent" />
                      <span>Suggested focus: <strong>GST Exemptions</strong> in Tax Laws</span>
                    </div>
                    <ArrowUpRight size={12} className="text-lp-accent" />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
