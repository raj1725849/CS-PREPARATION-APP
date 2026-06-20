"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Chip from "../ui/Chip";
import GradientText from "../ui/GradientText";

export default function CallToAction() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <section className="relative px-6 py-24 md:py-32 w-full flex justify-center overflow-hidden">
      {/* Radial Glow Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,110,247,0.12) 0%, transparent 60%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease }}
        className="relative z-10 flex flex-col items-center text-center w-full max-w-[800px]"
        style={{ willChange: "transform" }}
      >
        <Chip className="mb-6">Get Started</Chip>
        
        <h2 className="text-[clamp(1.8rem,4vw,3.2rem)] leading-[1.1] font-bold font-sora text-lp-text tracking-tight mb-6">
          Your exams are <span className="font-playfair-italic text-lp-accent font-normal">closer than you think.</span>
        </h2>
        
        <p className="text-[0.95rem] md:text-[1rem] text-lp-muted max-w-[500px] mb-10 leading-[1.7]">
          Start with free access. Most students see improvement within the first week of consistent practice.
        </p>

        <Link href="/login?signup=true" className="w-full sm:w-auto">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ ease }}
            className="relative w-full sm:w-auto group"
          >
            <div className="absolute inset-0 bg-lp-accent blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-[12px]"></div>
            <div className="relative bg-lp-accent text-[#0A231C] px-10 py-4 rounded-[12px] text-[16px] font-bold tracking-wide transition-all duration-300 shadow-[0_8px_30px_rgba(232,242,158,0.25)] group-hover:shadow-[0_8px_30px_rgba(232,242,158,0.4)]">
              {"Get Started — It's Free"}
            </div>
          </motion.button>
        </Link>
      </motion.div>
    </section>
  );
}
