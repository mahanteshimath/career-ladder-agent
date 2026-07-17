"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PRICING_TIERS, UPCOMING_TIERS } from "@/config/tiers";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PricingCards() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  function goFree() {
    router.push("/login?callbackUrl=%2Fdashboard%2Fupload");
  }

  async function handleSubscribe(tier: string) {
    setMessage(null);
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=%2F%23pricing");
      return;
    }

    setBusyTier(tier);
    try {
      const orderRes = await fetch("/api/subscribe/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        const msg = orderData?.error?.message || orderData?.error || "Could not start checkout.";
        setMessage({ type: orderRes.status === 503 ? "info" : "error", text: msg });
        setBusyTier(null);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setMessage({ type: "error", text: "Could not load the payment gateway. Check your connection." });
        setBusyTier(null);
        return;
      }

      const { orderId, amount, currency, keyId } = orderData.data;
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Career Ladder",
        description: `${tier} subscription`,
        prefill: {
          name: session?.user?.name || undefined,
          email: session?.user?.email || undefined,
        },
        theme: { color: "#3a56d4" },
        modal: { ondismiss: () => setBusyTier(null) },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/subscribe/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, tier }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setMessage({ type: "success", text: "Subscription active! Redirecting..." });
              setTimeout(() => router.push("/dashboard"), 1200);
            } else {
              setMessage({ type: "error", text: verifyData?.error?.message || "Payment verification failed. Contact support." });
            }
          } catch {
            setMessage({ type: "error", text: "Payment verification failed. Contact support." });
          } finally {
            setBusyTier(null);
          }
        },
      });
      rzp.open();
    } catch {
      setMessage({ type: "error", text: "Something went wrong starting checkout." });
      setBusyTier(null);
    }
  }

  return (
    <>
      {message && (
        <div
          className={`max-w-3xl mx-auto mb-6 rounded-lg px-4 py-3 text-sm border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : message.type === "error"
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          }`}
          role="status"
        >
          {message.text}
        </div>
      )}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
      {PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`
            relative border rounded-2xl p-8 flex flex-col transition-all hover:shadow-lg
            ${tier.name === "premium"
              ? "border-blue-500 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/50 scale-[1.02]"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }
          `}
        >
          {tier.name === "premium" && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
              Most Popular
            </span>
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {tier.displayName}
          </h3>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              {tier.price}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              {tier.priceSubtext}
            </span>
          </div>
          <ul className="mt-6 space-y-3 flex-1">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300"
              >
                <svg
                  className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={() => (tier.name === "free" ? goFree() : handleSubscribe(tier.name))}
            disabled={busyTier === tier.name}
            className={`
              mt-8 w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed
              ${tier.name === "premium"
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                : tier.name === "basic"
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
                  : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }
            `}
          >
            {busyTier === tier.name
              ? "Processing..."
              : tier.name === "free"
                ? "Get Started Free"
                : "Subscribe Now"}
          </button>
        </div>
      ))}

      {UPCOMING_TIERS.map((tier) => (
        <div
          key={tier.name}
          className="relative border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 flex flex-col bg-gray-50/60 dark:bg-gray-900/40"
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full shadow-sm">
            Coming Soon
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {tier.displayName}
          </h3>
          <div className="mt-3">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              {tier.price}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              {tier.priceSubtext}
            </span>
          </div>
          <ul className="mt-6 space-y-3 flex-1">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300"
              >
                <svg
                  className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            disabled
            className="mt-8 w-full py-3 px-4 rounded-xl font-semibold text-sm border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      ))}
      </div>
    </>
  );
}
