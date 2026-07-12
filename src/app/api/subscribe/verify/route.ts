/**
 * POST /api/subscribe/verify — Verify a Razorpay payment and upgrade the tier.
 * The tier is only upgraded after the payment signature is verified server-side.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, apiSuccess, badRequest, serverError, apiError } from "@/lib/api-response";
import { updateUserTier } from "@/lib/snowflake/queries";
import {
  isRazorpayConfigured,
  verifyRazorpaySignature,
  computeExpiry,
  TIER_PLANS,
} from "@/lib/payments/razorpay";

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  tier: z.enum(["basic", "premium"]),
});

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!isRazorpayConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", "Payments are not enabled yet.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Missing payment verification fields.");
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = parsed.data;

  const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    // Never upgrade on an unverified/forged signature.
    return apiError("PAYMENT_VERIFICATION_FAILED", "Payment could not be verified.", 400);
  }

  try {
    const expiresAt = computeExpiry(tier);
    await updateUserTier(userId, tier, expiresAt);
    return apiSuccess({ tier, expiresAt, plan: TIER_PLANS[tier].label });
  } catch (err) {
    console.error("[subscribe/verify] Error:", err);
    return serverError("Payment verified but the account could not be updated. Contact support.");
  }
}
