import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[#D21319] font-bold tracking-tight",
        className
      )}
    >
      {children}
    </span>
  );
}
