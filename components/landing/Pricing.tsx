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
      title: "Monthly",
      price: "₹299",
      period: "/ month",
      perks: [
        "5 question papers per day",
        "4 answer evaluations per day",
        "All CS Executive & Professional modules",
        "Concept Q&A"
      ],
      ctaText: "Get Started",
      highlight: false,
      badge: null
    },
    {
      title: "6 Months",
      price: "₹2,999",
      period: "/ 6 months",
      perks: [
        "300 question papers total",
        "300 answer evaluations total",
        "All CS Executive & Professional modules",
        "Concept Q&A",
        "Priority support"
      ],
      ctaText: "Get Started",
      highlight: true,
      badge: "Most Popular"
    },
    {
      title: "Annual",
      price: "₹7,999",
      period: "/ year",
      perks: [
        "600 question papers total",
        "600 answer evaluations total",
        "All CS Executive & Professional modules",
        "Concept Q&A",
        "Priority support",
        "Early access to new features"
      ],
      ctaText: "Get Started",
      highlight: false,
      badge: "Best Value"
    }
  ];

  return (
    <section id="pricing" className="px-6 py-16 md:py-24 max-w-[960px] mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
        >
          <Chip className="mb-6">Pricing</Chip>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.2] font-bold font-sora text-lp-text tracking-tight max-w-[700px] mb-6"
          style={{ willChange: "transform" }}
        >
          Less than a single tutoring session. <GradientText>Every month.</GradientText>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-[0.95rem] md:text-[1rem] text-lp-muted max-w-[600px] leading-[1.7]"
          style={{ willChange: "transform" }}
        >
          No hidden fees. No auto-renewals without notice. Pay once, study hard.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.1, duration: 0.6, ease }}
            className={cn(
              "relative flex flex-col p-8 rounded-[16px] transition-colors duration-300",
              plan.highlight 
                ? "bg-[rgba(79,110,247,0.03)] border-[1.5px] border-lp-accent" 
                : "bg-lp-bg-card border border-lp-border-subtle hover:border-[rgba(79,110,247,0.3)]"
            )}
            style={{ willChange: "transform" }}
          >
            {plan.badge && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {plan.highlight ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-bold bg-lp-accent text-white">
                    {plan.badge}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-medium bg-lp-bg border border-lp-border-medium text-lp-muted">
                    {plan.badge}
                  </span>
                )}
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-sora font-medium text-lp-dim mb-4">{plan.title}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-sora text-lp-text">{plan.price}</span>
                <span className="text-[14px] text-lp-muted">{plan.period}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-4 mb-8 flex-1">
              {plan.perks.map((perk, j) => (
                <li key={j} className="flex items-start gap-3">
                  <Check size={18} className="text-lp-accent mt-0.5 shrink-0" />
                  <span className="text-[0.95rem] text-lp-muted leading-tight">{perk}</span>
                </li>
              ))}
            </ul>

            <Link href={`/login?signup=true&plan=${i === 0 ? 'monthly' : i === 1 ? 'quarterly' : 'yearly'}`} className="w-full">
              <motion.button
                whileHover={{ y: -2, scale: plan.highlight ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ ease }}
                className={cn(
                  "relative w-full py-3 rounded-[14px] text-[15px] font-medium transition-all duration-300",
                  plan.highlight
                    ? "bg-gradient-to-r from-lp-accent to-[#6b85ff] hover:from-lp-accent-hover hover:to-[#4a6aff] text-white shadow-[0_4px_14px_0_rgba(79,110,247,0.39)] hover:shadow-[0_6px_20px_rgba(79,110,247,0.3)] border border-[rgba(255,255,255,0.1)]"
                    : "bg-transparent border border-lp-border-medium hover:border-lp-accent text-lp-text hover:bg-[rgba(79,110,247,0.08)]"
                )}
              >
                {plan.ctaText}
              </motion.button>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
