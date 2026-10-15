"use client";

import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function Counter({ from, to, duration = 1.5, suffix = "" }: { from: number; to: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (isInView) {
      const controls = animate(from, to, {
        duration,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        onUpdate(v) {
          setValue(Math.round(v));
        },
      });
      return controls.stop;
    }
  }, [from, to, duration, isInView]);

  return <span ref={ref}>{value}{suffix}</span>;
}

export default function Stats() {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const stats = [
    { value: 10, suffix: "x", label: "More practice papers than your seniors ever had" },
    { value: 30, suffix: "s", label: "Average time to get your answer evaluated" },
    { value: 0, prefix: "₹", label: "Spent on tutoring when you're consistent" },
    { value: 100, suffix: "%", label: "Syllabus coverage across all ICSI CS modules" },
  ];

  return (
    <section className="px-6 py-16 md:py-24 max-w-[960px] mx-auto w-full">
      <div className="border border-[#AFAEA2]/20 rounded-[20px] bg-[#222659] p-8 md:p-12 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D21319]/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Editorial Section Kicker */}
        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#AFAEA2] mb-2 select-none">
            MEASURED OUTCOMES
          </p>
          <h3 className="text-lg md:text-2xl font-display-sans font-black uppercase text-[#F8F8F6]">
            BUILT FOR <span className="font-editorial-italic normal-case text-[#D21319] text-[1.15em] font-normal">rankers</span>, ACCESSIBLE TO ALL
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 relative z-10">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="flex flex-col items-center text-center"
              style={{ willChange: "transform" }}
            >
              <div className="text-[2.2rem] md:text-[2.7rem] font-black font-display-sans text-[#F8F8F6] mb-2 tracking-tight">
                <span className="text-[#D21319]">{stat.prefix}</span>
                <Counter from={0} to={stat.value} />
                <span className="text-[#D21319]">{stat.suffix}</span>
              </div>
              <div className="text-[13px] text-[#AFAEA2] leading-[1.6] font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
