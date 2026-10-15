import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  title: string;
  subtitle?: string;
  breadcrumbs: { label: string; href?: string }[];
}

export default function TopBar({ title, subtitle, breadcrumbs }: TopBarProps) {
  return (
    <div className="bg-[#1B1E4A]/85 backdrop-blur-md border-b border-[#AFAEA2]/15 px-8 py-6 sticky top-0 z-40">
      <div className="flex flex-col gap-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#AFAEA2] mb-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-white font-semibold" : ""}>{crumb.label}</span>
                )}
                {!isLast && <ChevronRight className="w-3 h-3 text-[#AFAEA2]/50" />}
              </div>
            );
          })}
        </nav>

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-white font-sora tracking-tight">
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-[#AFAEA2] mt-1 font-inter">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
