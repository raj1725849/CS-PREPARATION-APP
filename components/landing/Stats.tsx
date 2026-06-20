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
      <div className="border border-lp-border-medium rounded-[16px] bg-lp-bg-card p-8 md:p-12 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
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
              <div className="text-[2rem] md:text-[2.5rem] font-bold font-sora text-lp-accent mb-2">
                {stat.prefix}
                <Counter from={0} to={stat.value} />
                {stat.suffix}
              </div>
              <div className="text-[13px] text-lp-muted leading-[1.6]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
