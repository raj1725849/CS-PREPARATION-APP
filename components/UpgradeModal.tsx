"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateUserProfile } from "@/lib/storage";
import { X, Check } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { refreshPlan, plan } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (selectedPlan: "monthly" | "quarterly" | "yearly") => {
    setLoadingPlan(selectedPlan);
    try {
      await updateUserProfile({ plan: selectedPlan });
      await refreshPlan();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to upgrade plan:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "monthly" as const,
      name: "Monthly Plan",
      price: "₹299",
      period: "month",
      savings: null,
      features: [
        "Unlimited Question Paper Generation",
        "Unlimited Answer Sheet Evaluation",
        "Detailed Statutory Section Analysis",
        "Deduction severity reporting",
        "Cancel online anytime",
      ],
      popular: false,
    },
    {
      id: "quarterly" as const,
      name: "Quarterly Plan",
      price: "₹799",
      period: "3 months",
      savings: "Save 11%",
      features: [
        "Unlimited Question Paper Generation",
        "Unlimited Answer Sheet Evaluation",
        "Detailed Statutory Section Analysis",
        "Deduction severity reporting",
        "Priority AI model access",
      ],
      popular: true,
    },
    {
      id: "yearly" as const,
      name: "Yearly Plan",
      price: "₹2499",
      period: "year",
      savings: "Save 30%",
      features: [
        "Unlimited Question Paper Generation",
        "Unlimited Answer Sheet Evaluation",
        "Detailed Statutory Section Analysis",
        "Deduction severity reporting",
        "Priority AI model access",
        "Dedicated study metrics support",
      ],
      popular: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center text-green-400">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Upgrade Successful!</h2>
            <p className="text-slate-400 max-w-xs">
              Welcome to your new plan. Unlimited access has been unlocked.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Upgrade to Premium
              </h2>
              <p className="text-slate-400 mt-2">
                Accelerate your CS Exam preparation with unlimited practice tests and real-time evaluations.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isActivePlan = plan === p.id;

                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-xl p-5 md:p-6 border transition-all relative ${
                      p.popular
                        ? "border-[#e8590c] bg-white/5 shadow-lg shadow-[#e8590c]/5"
                        : "border-white/10 bg-white/0"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8590c] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      {p.savings && (
                        <span className="inline-block bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1">
                          {p.savings}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl md:text-4xl font-extrabold text-white">{p.price}</span>
                      <span className="text-slate-400 text-xs">/ {p.period}</span>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1 text-left">
                      {p.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-300">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={loadingPlan !== null || isActivePlan}
                      className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
                        isActivePlan
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default"
                          : p.popular
                          ? "bg-[#e8590c] hover:bg-[#c94d0a] text-white hover:scale-[1.02]"
                          : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      } disabled:opacity-50`}
                    >
                      {isActivePlan
                        ? "Active Plan"
                        : loadingPlan === p.id
                        ? "Upgrading..."
                        : "Upgrade Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
