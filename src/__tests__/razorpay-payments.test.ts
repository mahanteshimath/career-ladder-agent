import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  verifyRazorpaySignature,
  computeExpiry,
  isPaidTier,
  isRazorpayConfigured,
  TIER_PLANS,
} from "@/lib/payments/razorpay";

const SECRET = "test_secret_key";

function sign(orderId: string, paymentId: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("razorpay payments", () => {
  const original = process.env.RAZORPAY_KEY_SECRET;
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = SECRET;
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  });
  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = original;
  });

  it("accepts a correctly signed payment", () => {
    const sig = sign("order_1", "pay_1");
    expect(verifyRazorpaySignature("order_1", "pay_1", sig)).toBe(true);
  });

  it("rejects a forged/incorrect signature", () => {
    expect(verifyRazorpaySignature("order_1", "pay_1", "deadbeef")).toBe(false);
    const wrong = sign("order_1", "pay_1", "different_secret");
    expect(verifyRazorpaySignature("order_1", "pay_1", wrong)).toBe(false);
  });

  it("rejects when fields are missing", () => {
    expect(verifyRazorpaySignature("", "pay", "sig")).toBe(false);
    expect(verifyRazorpaySignature("order", "", "sig")).toBe(false);
    expect(verifyRazorpaySignature("order", "pay", "")).toBe(false);
  });

  it("computes an expiry in the future matching plan duration", () => {
    const iso = computeExpiry("basic");
    const days = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(Math.round(days)).toBe(TIER_PLANS.basic.durationDays);
  });

  it("validates paid tiers", () => {
    expect(isPaidTier("basic")).toBe(true);
    expect(isPaidTier("premium")).toBe(true);
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier("enterprise")).toBe(false);
  });

  it("reports configuration state from env", () => {
    expect(isRazorpayConfigured()).toBe(true);
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(isRazorpayConfigured()).toBe(false);
  });

  it("uses correct amounts in paise", () => {
    expect(TIER_PLANS.basic.amountPaise).toBe(7500);
    expect(TIER_PLANS.premium.amountPaise).toBe(49900);
  });
});
