"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateUserProfile } from "@/lib/storage";
import { X, Check } from "lucide-react";
import { loadRazorpayScript, RazorpayResponse } from "@/lib/payment";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { refreshPlan, plan, user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (selectedPlan: "monthly" | "quarterly" | "yearly") => {
    setLoadingPlan(selectedPlan);
    try {
      // 1. Load the Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Failed to load Razorpay payment gateway. Please check your connection.");
        setLoadingPlan(null);
        return;
      }

      // 2. Fetch the client key config
      const configRes = await fetch("/api/payment/config");
      if (!configRes.ok) {
        throw new Error("Failed to load payment configuration");
      }
      const { key } = await configRes.json();

      const idToken = await user?.getIdToken();

      // 3. Create the payment order on server
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({ plan: selectedPlan })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to initiate payment order");
      }
      const { order } = await orderRes.json();

      // 4. Set up Razorpay Checkout Options
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "CS Prep",
        description: `${
          selectedPlan === "monthly" ? "Monthly" : selectedPlan === "quarterly" ? "6-Month" : "Annual"
        } Premium Subscription`,
        order_id: order.id,
        theme: {
          color: "#E8F29E"
        },
        prefill: {
          name: user?.displayName || "",
          email: user?.email || ""
        },
        handler: async function (response: RazorpayResponse) {
          setLoadingPlan(selectedPlan);
          try {
            const verifyIdToken = await user?.getIdToken();

            // 5. Verify the payment on the server
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": verifyIdToken ? `Bearer ${verifyIdToken}` : ""
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan
              })
            });

            if (!verifyRes.ok) {
              let errMsg = "Payment signature verification failed";
              try {
                const errData = await verifyRes.json();
                errMsg = errData.error || errMsg;
              } catch (jsonErr) {
                try {
                  const rawText = await verifyRes.text();
                  errMsg = `Server Error (${verifyRes.status}): ${rawText.substring(0, 100)}`;
                } catch (textErr) {
                  errMsg = `Server Error (${verifyRes.status})`;
                }
              }
              throw new Error(errMsg);
            }

            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              // Perform client-side upgrade fallback for local testing
              await updateUserProfile({
                plan: selectedPlan,
                subscriptionStatus: "active",
                expiresAt: new Date(Date.now() + (selectedPlan === "monthly" ? 30 : selectedPlan === "quarterly" ? 180 : 365) * 24 * 60 * 60 * 1000).toISOString(),
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                upgradedAt: new Date().toISOString()
              });

              // 6. Refresh plan context state (updated server-side)
              await refreshPlan();
              setSuccess(true);
              setTimeout(() => {
                setSuccess(false);
                onClose();
              }, 1500);
            } else {
              alert("Payment verification failed. Please try again or contact support.");
            }
          } catch (verifyErr: any) {
            console.error("Signature verification error:", verifyErr);
            alert(`Error verifying payment signature: ${verifyErr.message}`);
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          }
        }
      };

      // 5. Open Razorpay Checkout modal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      console.error("Failed to upgrade plan:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during checkout.";
      alert(message);
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "monthly" as const,
      name: "Monthly Plan",
      price: "₹1",
      period: "month",
      savings: null,
      features: [
        "30 AI Question Papers per month",
        "40 Answer Evaluations per month",
        "100 Doubt Questions per month",
        "Performance Analytics",
        "Progress Tracking",
        "Access to All Core Features"
      ],
      popular: false
    },
    {
      id: "quarterly" as const,
      name: "Exam Pass Plan",
      price: "₹3,199",
      period: "6 months",
      savings: "Most Popular",
      features: [
        "250 AI Question Papers",
        "300 Answer Evaluations",
        "1,000 Doubt Questions",
        "Performance Analytics",
        "Progress Tracking",
        "Weak Topic Analysis",
        "Full Access Until Next Exam Attempt",
        "Priority Support"
      ],
      popular: true
    },
    {
      id: "yearly" as const,
      name: "Annual Plan",
      price: "₹6,499",
      period: "year",
      savings: "Save 22%",
      features: [
        "600 AI Question Papers",
        "750 Answer Evaluations",
        "2,500 Doubt Questions",
        "Advanced Analytics",
        "Priority Processing",
        "Access to New Features",
        "Full Platform Access"
      ],
      popular: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0A231C] border border-[rgba(232,242,158,0.15)] rounded-2xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#a8bcb5] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#E8F29E]/20 border border-[#E8F29E]/50 rounded-full flex items-center justify-center text-[#E8F29E]">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white font-sora tracking-tight">Upgrade Successful!</h2>
            <p className="text-[#a8bcb5] max-w-xs font-inter">
              Welcome to your new plan. Premium access has been successfully unlocked.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">
                Upgrade to Premium
              </h2>
              <p className="text-[#a8bcb5] mt-2 font-inter">
                Accelerate your CS Exam preparation with custom AI mock tests and real-time detailed evaluations.
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
                        ? "border-[#E8F29E] bg-[#0e352a] shadow-lg shadow-[#E8F29E]/5"
                        : "border-[rgba(232,242,158,0.08)] bg-[#0e352a]/40"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8F29E] text-[#0A231C] text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full font-sora">
                        Most Popular
                      </span>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white font-sora">{p.name}</h3>
                      {p.savings && !p.popular && (
                        <span className="inline-block bg-[#E8F29E]/10 border border-[#E8F29E]/20 text-[#E8F29E] text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 font-sora">
                          {p.savings}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl md:text-4xl font-extrabold text-white font-sora">{p.price}</span>
                      <span className="text-[#a8bcb5] text-xs font-inter">/ {p.period}</span>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1 text-left">
                      {p.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-[#a8bcb5] font-inter">
                          <Check className="w-4 h-4 text-[#E8F29E] flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={loadingPlan !== null || isActivePlan}
                      className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-300 cursor-pointer ${
                        isActivePlan
                          ? "bg-[#E8F29E]/10 border border-[#E8F29E]/20 text-[#E8F29E] cursor-default"
                          : p.popular
                          ? "bg-[#E8F29E] hover:bg-[#d9e28f] text-[#0A231C] font-bold hover:scale-[1.02] shadow-[0_4px_14px_rgba(232,242,158,0.2)]"
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
