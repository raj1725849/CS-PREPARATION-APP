import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
}

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="CS Prep Emblem"
    >
      {/* Outer subtle governance diamond frame */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="10"
        stroke="#AFAEA2"
        strokeWidth="1.5"
        strokeOpacity="0.25"
        className="transition-colors group-hover:stroke-opacity-50"
      />
      
      {/* Dynamic Legal / Executive Crest - 'C' Arc */}
      <path
        d="M26 14H19C15.6863 14 13 16.6863 13 20V28C13 31.3137 15.6863 34 19 34H26"
        stroke="#F8F8F6"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      
      {/* 'S' Flow Interlocking Arc with Crimson Accent */}
      <path
        d="M22 17C24.5 17 29 17.5 29 21.5C29 25.5 23 25 23 29C23 32.5 27 33 30 32"
        stroke="#D21319"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Precision Diamond Apex */}
      <polygon
        points="32,15 35,18 32,21 29,18"
        fill="#D21319"
      />

      {/* Subtle Inner Pillar Anchor */}
      <circle cx="18" cy="24" r="1.75" fill="#AFAEA2" />
    </svg>
  );
};

export default function Logo({
  className = "",
  variant = "full",
  size = "md",
  href = "/"
}: LogoProps) {
  const pixelSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  };

  const textSizes = {
    sm: "text-base tracking-tight",
    md: "text-lg tracking-tight",
    lg: "text-xl tracking-tight",
    xl: "text-2xl tracking-tight",
  };

  const currentSize = pixelSizes[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      <LogoIcon size={currentSize} />
      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <div className={`font-display-sans font-black ${textSizes[size]} text-[#F8F8F6] flex items-center`}>
            <span>CS</span>
            <span className="text-[#D21319] ml-0.5">PREP</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D21319] ml-1 mb-0.5 inline-block animate-pulse" />
          </div>
          {size === "lg" || size === "xl" ? (
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#AFAEA2] font-semibold mt-1">
              ICSI Executive Intelligence
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
