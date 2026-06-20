"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-lp-border-subtle bg-lp-bg overflow-hidden py-16 md:py-24">
      {/* Background Fine Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none z-0">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8F29E" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[960px] mx-auto px-6 space-y-16">
        
        {/* Top Section: CTA Box */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-12 border-b border-lp-border-subtle/50">
          <div className="space-y-3">
            <h3 className="text-2xl md:text-4xl font-bold font-sora text-lp-text tracking-tight">
              Start your journey to <span className="font-playfair-italic text-lp-accent font-normal">becoming a CS</span> today.
            </h3>
            <p className="text-xs md:text-sm text-lp-muted">
              Get evaluated, practice questions, and learn from your mistake trends.
            </p>
          </div>
          <Link href="/login?signup=true" className="shrink-0 w-full md:w-auto">
            <motion.button
              whileHover={{ x: 4 }}
              className="w-full md:w-auto bg-lp-accent hover:bg-lp-accent-hover text-[#0A231C] px-8 py-3.5 rounded-[12px] text-[14px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(232,242,158,0.15)]"
            >
              Get Started <ArrowRight size={16} />
            </motion.button>
          </Link>
        </div>

        {/* Middle Section: Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo & Info */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="text-xl font-bold font-sora tracking-tight text-lp-text">
              CS<span className="text-lp-accent">PREP</span>
            </Link>
            <p className="text-[12px] text-lp-muted leading-relaxed max-w-[280px]">
              AI-driven preparation system built strictly for ICSI Executive & Professional examinations. Practice, evaluate, improve.
            </p>
          </div>

          {/* Links Column 1 */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-lp-accent">Platform</h4>
            <ul className="space-y-2 text-[13px] text-lp-muted">
              <li>
                <a href="#features" className="hover:text-lp-text transition-colors">Features</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-lp-text transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-lp-text transition-colors">Pricing</a>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-lp-accent">Support</h4>
            <ul className="space-y-2 text-[13px] text-lp-muted">
              <li>
                <Link href="/login" className="hover:text-lp-text transition-colors">Dashboard</Link>
              </li>
              <li>
                <span className="text-lp-dim">Help Desk (Coming soon)</span>
              </li>
              <li>
                <span className="text-lp-dim">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Footer signature & copyright */}
        <div className="pt-8 border-t border-lp-border-subtle/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-lp-dim">
          <p>&copy; {new Date().getFullYear()} CS Prep. All rights reserved.</p>
          <p>Tuned specifically for ICSI Company Secretary examinations.</p>
        </div>

      </div>
    </footer>
  );
}
