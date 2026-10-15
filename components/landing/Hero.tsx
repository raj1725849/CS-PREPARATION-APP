"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Chip from "../ui/Chip";

export default function Hero() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <section 
      className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-36 pb-24 overflow-hidden text-center w-full"
    >
      {/* Cinematic Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 scale-105"
        style={{ 
          backgroundImage: "url('/hero_bg.png')",
          filter: "brightness(0.85) contrast(1.05)" 
        }}
      />
      
      {/* Volumetric Radial Overlay to maintain contrast and focus */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ 
          background: "radial-gradient(circle at center, rgba(27,30,74,0.4) 0%, #1B1E4A 80%)"
        }}
      />

      {/* Decorative subtle light beam glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] rounded-full pointer-events-none z-0 filter blur-3xl opacity-25"
        style={{ 
          background: "radial-gradient(circle, #D21319 0%, transparent 70%)"
        }}
      />

      {/* Tiny Editorial Accent Texts on the sides (inspired by reference) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden xl:block z-10 select-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#AFAEA2] origin-left -rotate-90 font-medium">
          WE DON'T PREDICT THE FUTURE
        </p>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block z-10 select-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#AFAEA2] origin-right rotate-90 font-medium">
          WE BUILD IT FOR YOU
        </p>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-[960px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease }}
        >
          <p className="text-[11px] md:text-[13px] uppercase tracking-[0.28em] font-semibold text-[#AFAEA2] mb-6 select-none">
            STRUGGLING WITH ICSI ANSWER WRITING?
          </p>
        </motion.div>

        {/* Signature Editorial Typography Lockup (Matching User Reference) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.8, ease }}
          className="relative my-2 md:my-4 select-none flex flex-col items-center w-full"
        >
          {/* Row 1: NEEDING + clarity */}
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 md:gap-x-6 relative">
            <span className="font-display-sans font-black uppercase text-[clamp(2.7rem,6.8vw,6.4rem)] leading-[0.95] tracking-tight text-[#F8F8F6]">
              NEEDING
            </span>
            <span className="font-editorial-italic text-[clamp(3.3rem,8.6vw,7.8rem)] leading-[0.9] text-[#D21319] -ml-1 md:-ml-2 transform -rotate-1 select-none">
              clarity
            </span>

            {/* Micro annotation tag (Right) */}
            <div className="hidden lg:flex absolute -top-3 -right-24 xl:-right-36 items-center">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#AFAEA2] border border-[#AFAEA2]/25 px-2.5 py-1 rounded bg-[#1B1E4A]/80 backdrop-blur-sm">
                ICSI 2024 Syllabus
              </span>
            </div>
          </div>

          {/* Row 2: IN YOUR + answers? */}
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 md:gap-x-6 relative mt-1 md:mt-2">
            {/* Micro annotation tag (Left) */}
            <div className="hidden lg:flex absolute -bottom-2 -left-24 xl:-left-36 items-center">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#AFAEA2] border border-[#AFAEA2]/25 px-2.5 py-1 rounded bg-[#1B1E4A]/80 backdrop-blur-sm">
                Line-by-Line Audits
              </span>
            </div>

            <span className="font-display-sans font-black uppercase text-[clamp(2.7rem,6.8vw,6.4rem)] leading-[0.95] tracking-tight text-[#F8F8F6]">
              IN YOUR
            </span>
            <span className="font-editorial-italic text-[clamp(3.3rem,8.6vw,7.8rem)] leading-[0.9] text-[#F8F8F6] -ml-1 md:-ml-2 transform -rotate-1 select-none">
              answers?
            </span>

            {/* Micro annotation tag (Far Right) */}
            <div className="hidden xl:flex absolute -bottom-2 -right-32 items-center">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#AFAEA2] border border-[#AFAEA2]/25 px-2.5 py-1 rounded bg-[#1B1E4A]/80 backdrop-blur-sm">
                Case Law & Sections
              </span>
            </div>
          </div>
        </motion.div>

        {/* Framing Bottom Kicker */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6, ease }}
          className="text-[11px] md:text-[13px] uppercase tracking-[0.24em] font-semibold text-[#F8F8F6] mt-4 mb-6 select-none"
        >
          WE HAVE JUST THE SYSTEM FOR YOU
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease }}
          className="text-[15px] md:text-[17px] text-[#AFAEA2] max-w-[620px] mb-10 leading-[1.75]"
          style={{ willChange: "transform" }}
        >
          Practice with unlimited ICSI-pattern mock papers, and get your handwritten law and tax answers evaluated line-by-line just like an official examiner. Starting at ₹699/month.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          style={{ willChange: "transform" }}
        >
          <Link href="/login?signup=true" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ ease }}
              className="w-full sm:w-auto bg-[#D21319] hover:bg-[#b81015] text-white px-10 py-4 rounded-[12px] text-[16px] font-bold tracking-wide transition-all duration-300 shadow-[0_8px_30px_rgba(210,19,25,0.35)] hover:shadow-[0_10px_35px_rgba(210,19,25,0.5)] cursor-pointer"
            >
              Active Intelligence
            </motion.button>
          </Link>

          <a href="#features" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ ease }}
              className="w-full sm:w-auto bg-transparent border border-[#AFAEA2]/30 hover:border-[#AFAEA2] text-lp-text px-10 py-4 rounded-[12px] text-[16px] font-semibold tracking-wide transition-all duration-300 hover:bg-white/[0.04] cursor-pointer"
            >
              See it in action
            </motion.button>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6, ease }}
          className="mt-12 text-[12px] text-lp-dim font-medium tracking-wide uppercase"
        >
          No credit card required &bull; Start in 30 seconds &bull; Cancel anytime
        </motion.div>
      </div>
    </section>
  );
}
