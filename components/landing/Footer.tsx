import Link from "next/link";
import GradientText from "../ui/GradientText";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[rgba(79,110,247,0.08)] bg-lp-bg px-6 py-8">
      <div className="max-w-[960px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold font-sora tracking-tight text-lp-text">
          CS<GradientText>PREP</GradientText>
        </Link>
        
        <p className="text-[14px] text-lp-dim text-center md:text-right">
          Built for Company Secretary (CS) candidates who are serious about their exams.
        </p>
      </div>
    </footer>
  );
}
