/**
 * Razorpay payment helpers. Server-side only.
 *
 * Security: subscription tier is only ever upgraded after verifying the
 * Razorpay payment signature server-side (HMAC-SHA256). The client is never
 * trusted to assert a successful payment.
 */

import crypto from "crypto";

export type PaidTier = "basic" | "premium";

interface TierPlan {
  /** Amount in paise (₹1 = 100 paise). */
  amountPaise: number;
  /** Subscription duration in days. */
  durationDays: number;
  label: string;
}

export const TIER_PLANS: Record<PaidTier, TierPlan> = {
  basic: { amountPaise: 7500, durationDays: 7, label: "Basic (weekly)" },
  premium: { amountPaise: 49900, durationDays: 30, label: "Premium (monthly)" },
};

export function isPaidTier(value: unknown): value is PaidTier {
  return value === "basic" || value === "premium";
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Verify the Razorpay payment signature. Returns true only on an exact match. */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Compute the subscription expiry timestamp (ISO) for a tier from now. */
export function computeExpiry(tier: PaidTier): string {
  const now = new Date();
  now.setDate(now.getDate() + TIER_PLANS[tier].durationDays);
  return now.toISOString();
}
