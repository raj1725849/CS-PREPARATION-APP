"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, FileText, CheckSquare, FolderOpen, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import UpgradeModal from "./UpgradeModal";

export default function Sidebar() {
  const pathname = usePathname();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Generate Paper", href: "/generate", icon: FileText },
    { name: "Evaluate Answer", href: "/evaluate", icon: CheckSquare },
    { name: "Study Material", href: "/admin", icon: FolderOpen },
  ];

  const { user, plan } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#061814] border-b border-[rgba(232,242,158,0.05)] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#E8F29E]" />
          <span className="text-white text-lg font-bold font-playfair tracking-wide">CS Prep</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-[#a8bcb5] hover:text-white transition-colors p-2"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed left-0 top-0 w-[240px] h-full bg-[#061814] flex flex-col z-50 border-r border-[rgba(232,242,158,0.05)] transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#E8F29E]" />
            <span className="text-white text-xl font-bold font-playfair tracking-wide">CS Prep</span>
          </div>
          <button 
            className="md:hidden text-[#a8bcb5]"
            onClick={closeMobileMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2">
          <span className="text-[10px] font-semibold text-[#a8bcb5] uppercase tracking-widest font-sora">
            MENU
          </span>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-white/[0.03] text-[#E8F29E] border-l-4 border-[#E8F29E]"
                    : "text-[#a8bcb5] hover:bg-white/[0.02] hover:text-white border-l-4 border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium font-inter">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          {user && (
            <div className="mb-4 p-3 bg-[#0e352a]/40 rounded-lg border border-[rgba(232,242,158,0.08)]">
              <p className="text-xs text-[#a8bcb5] mb-1">Logged in as</p>
              <p className="text-sm font-medium text-white truncate mb-2 font-inter" title={user.email || undefined}>
                {user.email}
              </p>
              <div className="flex items-center justify-between border-t border-[rgba(232,242,158,0.08)] pt-2 mt-2">
                <div>
                  <span className="text-[10px] text-[#a8bcb5] block uppercase tracking-wider">Plan</span>
                  <span className="text-xs font-semibold text-white capitalize font-sora">{plan} Tier</span>
                </div>
                {plan === "free" && (
                  <button
                    onClick={() => setIsUpgradeOpen(true)}
                    className="bg-[#E8F29E] hover:bg-[#d9e28f] text-[#0A231C] text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors mb-4"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>

          <p className="text-xs text-[#a8bcb5] text-center opacity-70 font-inter">
            ICSI Executive Programme
          </p>
        </div>

        <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      </div>
    </>
  );
}

