"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Chip from "../ui/Chip";
import GradientText from "../ui/GradientText";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const plans = [
    {
      title: "Monthly Plan",
      price: "₹699",
      period: "/ month",
      perks: [
        "30 AI Question Papers per month",
        "40 Answer Evaluations per month",
        "100 Doubt Questions per month",
        "Performance Analytics",
        "Progress Tracking",
        "Access to All Core Features"
      ],
      ctaText: "Start Monthly Plan",
      highlight: false,
      badge: null,
      planParam: "monthly"
    },
    {
      title: "Exam Pass Plan",
      price: "₹3,199",
      period: "/ 6 months",
      perks: [
        "250 AI Question Papers",
        "300 Answer Evaluations",
        "1,000 Doubt Questions",
        "Performance Analytics",
        "Progress Tracking",
        "Weak Topic Analysis",
        "Full Access Until Next Exam Attempt",
        "Priority Support"
      ],
      ctaText: "Get Exam Pass",
      highlight: true,
      badge: "Most Popular",
      planParam: "quarterly"
    },
    {
      title: "Annual Plan",
      price: "₹6,499",
      period: "/ year",
      perks: [
        "600 AI Question Papers",
        "750 Answer Evaluations",
        "2,500 Doubt Questions",
        "Advanced Analytics",
        "Priority Processing",
        "Access to New Features",
        "Full Platform Access"
      ],
      ctaText: "Choose Annual Plan",
      highlight: false,
      badge: null,
      planParam: "yearly"
    }
  ];

  return (
    <section id="pricing" className="px-6 py-16 md:py-24 max-w-[960px] mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-16">
        <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#AFAEA2] mb-3 select-none">
          TRANSPARENT VALUE
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.15] font-display-sans font-black uppercase text-lp-text tracking-tight max-w-[700px] mb-6"
          style={{ willChange: "transform" }}
        >
          INVEST IN YOUR CS CAREER. <span className="font-editorial-italic text-[#D21319] normal-case font-normal text-[1.15em]">pick your plan.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-[0.95rem] md:text-[1rem] text-[#AFAEA2] max-w-[600px] leading-[1.7]"
          style={{ willChange: "transform" }}
        >
          Simple pricing designed for students preparing for CS Professional and Executive examinations.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 items-stretch pt-4">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.1, duration: 0.6, ease }}
            className={cn(
              "relative flex flex-col p-8 rounded-[20px] transition-all duration-300",
              plan.highlight 
                ? "bg-[#222659] border-2 border-[#D21319] md:scale-[1.04] md:-translate-y-2 z-10 shadow-[0_20px_50px_rgba(210,19,25,0.2)]" 
                : "bg-[#141639] border border-[#AFAEA2]/20 hover:border-[#AFAEA2]/40 hover:-translate-y-1 shadow-lg"
            )}
            style={{ willChange: "transform" }}
          >
            {plan.badge && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.08em] font-bold bg-[#D21319] text-white shadow-md">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-sora font-semibold text-lp-text mb-4">{plan.title}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-sora text-lp-text">{plan.price}</span>
                <span className="text-[14px] text-[#AFAEA2]">{plan.period}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-4 mb-8 flex-1">
              {plan.perks.map((perk, j) => (
                <li key={j} className="flex items-start gap-3">
                  <Check size={18} className="text-[#D21319] mt-0.5 shrink-0" />
                  <span className="text-[0.92rem] text-[#AFAEA2] leading-tight">{perk}</span>
                </li>
              ))}
            </ul>

            <Link href={`/login?signup=true&plan=${plan.planParam}`} className="w-full mt-auto">
              <motion.button
                whileHover={{ y: -2, scale: plan.highlight ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ ease }}
                className={cn(
                  "relative w-full py-3.5 rounded-[12px] text-[15px] font-bold transition-all duration-300 cursor-pointer",
                  plan.highlight
                    ? "bg-[#D21319] hover:bg-[#b81015] text-white shadow-[0_4px_14px_0_rgba(210,19,25,0.35)] hover:shadow-[0_6px_20px_rgba(210,19,25,0.5)]"
                    : "bg-transparent border border-[#AFAEA2]/30 hover:border-[#AFAEA2] text-lp-text hover:bg-white/[0.04]"
                )}
              >
                {plan.ctaText}
              </motion.button>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Savings Comparison & Platform Notes */}
      <div className="mt-16 flex flex-col items-center gap-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="w-full max-w-[800px] p-6 rounded-[20px] bg-[#222659]/80 border border-[#AFAEA2]/20 backdrop-blur-sm shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
        >
          <div className="flex flex-col md:flex-row items-center justify-around gap-6 divide-y md:divide-y-0 md:divide-x divide-[#AFAEA2]/20">
            <div className="flex flex-col items-center md:items-start md:px-6 w-full md:w-auto">
              <span className="text-xs uppercase tracking-wider text-[#AFAEA2] mb-1 font-semibold">Monthly Plan</span>
              <span className="text-[15px] font-bold text-lp-text">₹699/month</span>
            </div>
            <div className="flex flex-col items-center md:items-start md:px-8 w-full md:w-auto pt-4 md:pt-0">
              <span className="text-xs uppercase tracking-wider text-[#D21319] mb-1 font-semibold">6-Month Exam Pass</span>
              <span className="text-[15px] font-bold text-lp-text flex items-center gap-2">
                Save ₹995 <span className="text-xs font-normal text-[#AFAEA2]">compared to monthly billing</span>
              </span>
            </div>
            <div className="flex flex-col items-center md:items-start md:px-8 w-full md:w-auto pt-4 md:pt-0">
              <span className="text-xs uppercase tracking-wider text-green-400 mb-1 font-semibold">Annual Plan</span>
              <span className="text-[15px] font-bold text-lp-text flex items-center gap-2">
                Save ₹1,889 <span className="text-xs font-normal text-[#AFAEA2]">compared to monthly billing</span>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs text-lp-muted max-w-[650px] leading-[1.6]"
        >
          All plans include AI-powered question generation, answer evaluation, progress tracking, and exam-focused preparation tools.
        </motion.p>
      </div>
    </section>
  );
}
