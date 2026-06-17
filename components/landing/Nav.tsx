"use client";

import { useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import GradientText from "../ui/GradientText";
import { Menu, X } from "lucide-react";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 60],
    ["rgba(11, 14, 26, 0)", "rgba(11, 14, 26, 0.9)"]
  );
  const backdropBlur = useTransform(
    scrollY,
    [0, 60],
    ["blur(0px)", "blur(16px)"]
  );
  const borderBottom = useTransform(
    scrollY,
    [0, 60],
    ["1px solid rgba(79, 110, 247, 0)", "1px solid rgba(79, 110, 247, 0.12)"]
  );

  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  return (
    <>
      <motion.nav
        style={{ background, backdropFilter: backdropBlur, borderBottom }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-4 transition-all duration-300"
      >
        <div className="flex items-center justify-between w-full max-w-[960px]">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold font-sora tracking-tight text-lp-text">
            CS<GradientText>PREP</GradientText>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[14px] text-lp-muted hover:text-lp-text transition-colors duration-200">
              Features
            </Link>
            <Link href="#how-it-works" className="text-[14px] text-lp-muted hover:text-lp-text transition-colors duration-200">
              How it works
            </Link>
            <Link href="#pricing" className="text-[14px] text-lp-muted hover:text-lp-text transition-colors duration-200">
              Pricing
            </Link>
            
            <Link href="/login?signup=true">
              <motion.button
                whileHover={{ y: -1, scale: 1.02 }}
                transition={{ ease }}
                className="bg-gradient-to-r from-lp-accent to-[#6b85ff] hover:from-lp-accent-hover hover:to-[#4a6aff] text-white px-5 py-2.5 rounded-[14px] text-[14px] font-medium transition-all shadow-[0_4px_14px_0_rgba(79,110,247,0.39)] hover:shadow-[0_6px_20px_rgba(79,110,247,0.23)]"
              >
                Get Started
              </motion.button>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-lp-text p-2 focus:outline-none transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease }}
            className="fixed inset-x-0 top-[70px] mx-6 p-6 rounded-[20px] bg-lp-bg-card/95 backdrop-blur-xl border border-lp-border-medium flex flex-col gap-6 md:hidden z-40 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
            <Link
              href="#features"
              onClick={() => setIsOpen(false)}
              className="text-[16px] font-medium text-lp-muted hover:text-lp-text transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setIsOpen(false)}
              className="text-[16px] font-medium text-lp-muted hover:text-lp-text transition-colors duration-200"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsOpen(false)}
              className="text-[16px] font-medium text-lp-muted hover:text-lp-text transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link href="/login?signup=true" onClick={() => setIsOpen(false)} className="w-full mt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-lp-accent to-[#6b85ff] text-white py-3 rounded-[14px] text-[15px] font-medium shadow-[0_4px_14px_0_rgba(79,110,247,0.39)]"
              >
                Get Started
              </motion.button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
