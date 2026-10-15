import { ReactNode } from "react";
import { cn } from "@/lib/utils"; // Assume this exists, or use clsx/tailwind-merge

export default function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-semibold",
        "bg-[#141639]/80 text-[#AFAEA2] border border-[#AFAEA2]/25 shadow-sm",
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#D21319] animate-pulse" />
      {children}
    </span>
  );
}
