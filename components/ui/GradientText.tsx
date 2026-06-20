import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-clip-text text-transparent bg-gradient-to-br from-lp-accent to-[#ffffff]",
        className
      )}
    >
      {children}
    </span>
  );
}
