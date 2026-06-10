"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, FileText, CheckSquare, FolderOpen, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Generate Paper", href: "/generate", icon: FileText },
    { name: "Evaluate Answer", href: "/evaluate", icon: CheckSquare },
    { name: "Study Material", href: "/admin", icon: FolderOpen },
  ];

  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    // router.push is handled by AuthProvider
  };

  return (
    <div className="fixed left-0 top-0 w-[240px] h-full bg-[#0f2640] flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-white" />
        <span className="text-white text-xl font-bold font-playfair tracking-wide">CS Prep</span>
      </div>

      <div className="px-6 py-2">
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">
          MENU
        </span>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? "bg-white/10 text-white border-l-4 border-[#e8590c]"
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-white border-l-4 border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        {user && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-[#94a3b8] mb-1">Logged in as</p>
            <p className="text-sm font-medium text-white truncate" title={user.email || undefined}>
              {user.email}
            </p>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors mb-4"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>

        <p className="text-xs text-[#94a3b8] text-center opacity-70">
          ICSI Executive Programme
        </p>
      </div>
    </div>
  );
}
