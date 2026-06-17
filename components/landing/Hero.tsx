"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Chip from "../ui/Chip";
import GradientText from "../ui/GradientText";

export default function Hero() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20 overflow-hidden text-center max-w-[960px] mx-auto">
      {/* Radial Glow Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,110,247,0.12) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease }}
        >
          <Chip className="mb-6">For ICSI Company Secretary Students</Chip>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease }}
          className="text-[clamp(2.6rem,6vw,4.8rem)] leading-[1.1] font-bold font-sora text-lp-text tracking-tight max-w-[900px] mb-6"
          style={{ willChange: "transform" }}
        >
          Your AI tutor that <GradientText>evaluates answers,</GradientText> generates papers, and actually explains <GradientText>why you lost marks.</GradientText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="text-[0.95rem] md:text-[1rem] text-lp-muted max-w-[560px] mb-10 leading-[1.7]"
          style={{ willChange: "transform" }}
        >
          Practice with unlimited ICSI-pattern exam papers, and get your law and tax answers evaluated line-by-line just like an examiner would. Starting at ₹299/month.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          style={{ willChange: "transform" }}
        >
          <Link href="/login?signup=true" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ ease }}
              className="relative w-full sm:w-auto group"
            >
              <div className="absolute inset-0 bg-lp-accent blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-500 rounded-[14px]"></div>
              <div className="relative bg-gradient-to-r from-lp-accent to-[#6b85ff] text-white px-10 py-4 rounded-[14px] text-[16px] font-semibold tracking-wide transition-all duration-300 shadow-[0_8px_30px_rgb(79,110,247,0.3)] group-hover:shadow-[0_8px_30px_rgb(79,110,247,0.5)] border border-[rgba(255,255,255,0.1)]">
                Get Started
              </div>
            </motion.button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6, ease }}
          className="mt-8 text-[13px] text-lp-dim font-medium"
        >
          No credit card required &middot; Start in 30 seconds &middot; Cancel anytime
        </motion.div>
      </div>
    </section>
  );
}
