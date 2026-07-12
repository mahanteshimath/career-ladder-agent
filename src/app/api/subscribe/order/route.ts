/**
 * POST /api/subscribe/order — Create a Razorpay order for a paid tier.
 * Requires authentication. Returns 503 when Razorpay is not configured.
 */

import { NextRequest } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { getAuthenticatedUser, apiSuccess, badRequest, serverError, apiError } from "@/lib/api-response";
import { TIER_PLANS, isRazorpayConfigured } from "@/lib/payments/razorpay";

const OrderSchema = z.object({ tier: z.enum(["basic", "premium"]) });

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!isRazorpayConfigured()) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "Payments are not enabled yet. Please check back soon or contact support.",
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("A valid tier (basic or premium) is required.");
  }

  const plan = TIER_PLANS[parsed.data.tier];

  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await rzp.orders.create({
      amount: plan.amountPaise,
      currency: "INR",
      receipt: `sub_${parsed.data.tier}_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { userId, tier: parsed.data.tier },
    });

    return apiSuccess({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      tier: parsed.data.tier,
    });
  } catch (err) {
    console.error("[subscribe/order] Error:", err);
    return serverError("Could not start checkout. Please try again.");
  }
}
