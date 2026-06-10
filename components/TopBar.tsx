import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  title: string;
  subtitle?: string;
  breadcrumbs: { label: string; href?: string }[];
}

export default function TopBar({ title, subtitle, breadcrumbs }: TopBarProps) {
  return (
    <div className="bg-white border-b border-[#e2e8f0] px-8 py-6 sticky top-0 z-40">
      <div className="flex flex-col gap-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#94a3b8] mb-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-[#0f2640] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[#64748b]" : ""}>{crumb.label}</span>
                )}
                {!isLast && <ChevronRight className="w-3 h-3" />}
              </div>
            );
          })}
        </nav>

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-[#0f2640] font-playfair tracking-tight">
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-[#64748b] mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
