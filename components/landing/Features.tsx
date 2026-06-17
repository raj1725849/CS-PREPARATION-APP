"use client";

import { motion } from "framer-motion";
import Chip from "../ui/Chip";
import GradientText from "../ui/GradientText";
import { CheckCircle2, FileText, Lightbulb, Target } from "lucide-react";

export default function Features() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const features = [
    {
      icon: <CheckCircle2 size={22} className="text-lp-accent" />,
      title: "Instant Answer Evaluation",
      description: "Write your answer, get a detailed breakdown in seconds — marks awarded, what you missed, and exactly how to phrase it better. No waiting for a teacher."
    },
    {
      icon: <FileText size={22} className="text-lp-accent" />,
      title: "Question Paper Generation",
      description: "Generate exam-pattern question papers for any ICSI CS subject. Practice 10x more papers than your seniors ever could."
    },
    {
      icon: <Lightbulb size={22} className="text-lp-accent" />,
      title: "Concept Explanations",
      description: "Stuck on Company Law compliances, GST provisions, or corporate restructuring? Ask anything and get explanations tuned to your ICSI exam level — not generic textbook jargon."
    },
    {
      icon: <Target size={22} className="text-lp-accent" />,
      title: "Progress That Makes Sense",
      description: "See which topics you're weak in, which question types you keep getting wrong, and where to spend the next hour. Your dashboard speaks exam strategy."
    }
  ];

  return (
    <section id="features" className="px-6 py-16 md:py-24 max-w-[960px] mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
        >
          <Chip className="mb-6">What It Does</Chip>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.2] font-bold font-sora text-lp-text tracking-tight max-w-[700px] mb-6"
          style={{ willChange: "transform" }}
        >
          Everything a coaching class charges <GradientText>₹10k for</GradientText> — in one tab.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-[0.95rem] md:text-[1rem] text-lp-muted max-w-[600px] leading-[1.7]"
          style={{ willChange: "transform" }}
        >
          Built specifically for ICSI Company Secretary exams. Not a generic chatbot. Not another YouTube playlist.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: i * 0.1, duration: 0.6, ease }}
            style={{ willChange: "transform" }}
            className="group p-8 rounded-[16px] bg-lp-bg-card border border-lp-border-subtle hover:border-[rgba(79,110,247,0.3)] transition-colors duration-300"
          >
            <div className="w-[40px] h-[40px] rounded-lg bg-[rgba(79,110,247,0.12)] flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold font-sora text-lp-text mb-3">
              {feature.title}
            </h3>
            <p className="text-[0.95rem] text-lp-muted leading-[1.7]">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
