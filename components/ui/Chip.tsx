import { ReactNode } from "react";
import { cn } from "@/lib/utils"; // Assume this exists, or use clsx/tailwind-merge

export default function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-medium",
        "bg-[rgba(79,110,247,0.12)] text-[#7B96FF] border border-[rgba(79,110,247,0.2)]",
        className
      )}
    >
      {children}
    </span>
  );
}
