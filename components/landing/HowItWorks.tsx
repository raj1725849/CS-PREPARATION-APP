"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Chip from "../ui/Chip";
import GradientText from "../ui/GradientText";

export default function HowItWorks() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const steps = [
    {
      num: "01",
      title: "Pick your subject",
      description: "Choose from any ICSI CS Executive or Professional module subject. The system maps it to official ICSI exam patterns."
    },
    {
      num: "02",
      title: "Generate or attempt a paper",
      description: "Get a full question paper, or answer one question at a time. Timed mode available if you want exam conditions."
    },
    {
      num: "03",
      title: "Submit your answer",
      description: "Type it out or paste it. The evaluator reads it the way an examiner does — structure, coverage, keyword density."
    },
    {
      num: "04",
      title: "Get marks and feedback",
      description: "See exactly which parts earned marks, what an ideal answer looks like, and where you'd lose marks in the real exam."
    }
  ];

  return (
    <section id="how-it-works" className="bg-[#141639] py-16 md:py-24 border-y border-[#AFAEA2]/10">
      <div className="px-6 max-w-[780px] mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#AFAEA2] mb-3 select-none">
            METHODICAL MASTERY
          </p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.15] font-display-sans font-black uppercase text-lp-text tracking-tight mb-6"
            style={{ willChange: "transform" }}
          >
            FROM SYLLABUS TO EXAM-READY IN <span className="font-editorial-italic text-[#D21319] normal-case font-normal text-[1.15em]">four steps.</span>
          </motion.h2>
        </div>
 
        <div className="relative" ref={containerRef}>
          {/* Background Line */}
          <div className="absolute left-[24px] top-[24px] bottom-[24px] w-[2px] bg-[#AFAEA2]/20 md:left-[32px]" />
          
          {/* Animated Foreground Line */}
          <motion.div 
            className="absolute left-[24px] top-[24px] w-[2px] bg-[#D21319] md:left-[32px] origin-top"
            style={{ height: lineHeight }}
          />
 
          <div className="flex flex-col gap-12 relative z-10">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-6 md:gap-10">
                <div className="flex-shrink-0 w-[50px] h-[50px] md:w-[64px] md:h-[64px] rounded-full bg-[#1B1E4A] border border-[#AFAEA2]/30 shadow-md flex items-center justify-center font-sora font-extrabold text-[#F8F8F6] text-lg md:text-xl relative z-10">
                  <span className="text-[#D21319] mr-0.5 text-xs">#</span>{step.num}
                </div>
                <div className="pt-2 md:pt-4">
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease }}
                    className="text-xl md:text-2xl font-bold font-sora text-lp-text mb-3"
                  >
                    {step.title}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease }}
                    className="text-[0.95rem] md:text-[1rem] text-[#AFAEA2] leading-[1.7]"
                  >
                    {step.description}
                  </motion.p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
