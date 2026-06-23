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
          background: "radial-gradient(circle at center, rgba(10,35,28,0.3) 0%, #0A231C 75%)" 
        }}
      />

      {/* Decorative subtle light beam glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none z-0 filter blur-3xl opacity-20"
        style={{ 
          background: "radial-gradient(circle, #E8F29E 0%, transparent 70%)" 
        }}
      />

      {/* Tiny Editorial Accent Texts on the sides (inspired by reference) */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden xl:block z-10 select-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lp-dim origin-left -rotate-90">
          WE DON'T PREDICT THE FUTURE
        </p>
      </div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block z-10 select-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lp-dim origin-right rotate-90">
          WE BUILD IT FOR YOU
        </p>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-[880px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease }}
        >
          <Chip className="mb-8">
            For ICSI Company Secretary candidates
          </Chip>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease }}
          className="text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[1.12] font-bold font-sora text-lp-text tracking-tight max-w-[850px] mb-8"
          style={{ willChange: "transform" }}
        >
          Your AI tutor that <span className="font-playfair-italic text-lp-accent font-normal">evaluates answers</span>, generates papers, and actually explains <span className="font-playfair-italic text-lp-accent font-normal">why you lost marks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="text-[15px] md:text-[17px] text-lp-muted max-w-[580px] mb-12 leading-[1.75]"
          style={{ willChange: "transform" }}
        >
          Practice with unlimited ICSI-pattern exam papers, and get your law and tax answers evaluated line-by-line just like an examiner would. Starting at ₹1/month.
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
              className="w-full sm:w-auto bg-lp-accent hover:bg-lp-accent-hover text-[#0A231C] px-10 py-4 rounded-[12px] text-[16px] font-bold tracking-wide transition-all duration-300 shadow-[0_8px_30px_rgba(232,242,158,0.25)] hover:shadow-[0_8px_30px_rgba(232,242,158,0.4)]"
            >
              Active Intelligence
            </motion.button>
          </Link>

          <a href="#features" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ ease }}
              className="w-full sm:w-auto bg-transparent border border-lp-border-medium hover:border-lp-accent text-lp-text px-10 py-4 rounded-[12px] text-[16px] font-semibold tracking-wide transition-all duration-300 hover:bg-[rgba(232,242,158,0.05)]"
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
