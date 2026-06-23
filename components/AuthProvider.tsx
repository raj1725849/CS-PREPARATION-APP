"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { getUserProfile } from "@/lib/storage";
import { BillingPlan } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  plan: BillingPlan;
  loading: boolean;
  refreshPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: "free",
  loading: true,
  refreshPlan: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<BillingPlan>("free");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshPlan = async () => {
    const profile = await getUserProfile();
    if (profile) {
      setPlan(profile.plan);
    }
  };

  useEffect(() => {
    // Intercept window.fetch to attach the x-local-plan header when on localhost
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        const localSubStr = localStorage.getItem("cs_prep_local_subscription");
        if (localSubStr) {
          try {
            const localSub = JSON.parse(localSubStr);
            if (localSub.plan) {
              init = init || {};
              init.headers = init.headers || {};
              if (init.headers instanceof Headers) {
                init.headers.set("x-local-plan", localSub.plan);
              } else if (Array.isArray(init.headers)) {
                const idx = init.headers.findIndex(([k]) => k.toLowerCase() === "x-local-plan");
                if (idx !== -1) {
                  init.headers[idx][1] = localSub.plan;
                } else {
                  init.headers.push(["x-local-plan", localSub.plan]);
                }
              } else {
                (init.headers as any)["x-local-plan"] = localSub.plan;
              }
            }
          } catch (e) {
            console.error("Error setting local plan header:", e);
          }
        }
        return originalFetch.call(this, input, init);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const profile = await getUserProfile();
        setPlan(profile?.plan || "free");
      } else {
        setPlan("free");
      }
      setLoading(false);
      
      // We only want to handle redirects for the main app routes, not the root level or login
      const isSigningUp = typeof window !== "undefined" && sessionStorage.getItem("signing_up") === "true";
      if (!user && pathname !== "/login" && pathname !== "/") {
        router.push("/login");
      } else if (user && pathname === "/login" && !isSigningUp) {
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, plan, loading, refreshPlan }}>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a]">
          <div className="w-8 h-8 border-4 border-[#e8590c] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div style={{ display: loading ? 'none' : 'block' }} className="h-full w-full">
        {children}
      </div>
    </AuthContext.Provider>
  );
}
