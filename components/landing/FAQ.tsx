"use client";

import { motion } from "framer-motion";
import Chip from "../ui/Chip";

export default function FAQ() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const faqs = [
    {
      q: "What subjects does it cover?",
      a: "All core ICSI CS Executive and Professional module subjects — Company Law, Securities Laws & Capital Markets, Direct & Indirect Tax Laws, Corporate Restructuring, Drafting, Pleadings & Appearances, and more. Select your specific module and start practicing."
    },
    {
      q: "How accurate is the answer evaluation?",
      a: "It evaluates against official ICSI examiner guidelines — checking for proper legal section numbers, key legal terms, case law references, structure, and marks breakdown. It is not just a grammar checker; it highlights exactly why and where an examiner would deduct marks."
    },
    {
      q: "Can I use it on mobile?",
      a: "Yes — fully responsive. Open it before your exam, during study breaks, anywhere."
    },
    {
      q: "What happens when I hit my daily/monthly limit?",
      a: "You'll see your remaining usage in the dashboard. Limits reset daily for the Monthly plan, and are total for the 6-month and Annual plans."
    }
  ];

  return (
    <section className="bg-lp-bg-alt py-16 md:py-24">
      <div className="px-6 max-w-[960px] mx-auto w-full">
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease }}
          >
            <Chip className="mb-6">FAQ</Chip>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.2] font-bold font-sora text-lp-text tracking-tight"
            style={{ willChange: "transform" }}
          >
            Honest <span className="font-playfair-italic text-lp-accent font-normal">answers.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="p-8 rounded-[16px] bg-lp-bg-card border border-lp-border-subtle"
              style={{ willChange: "transform" }}
            >
              <h3 className="text-lg font-bold font-sora text-lp-text mb-3">
                {faq.q}
              </h3>
              <p className="text-[0.95rem] text-lp-muted leading-[1.7]">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
