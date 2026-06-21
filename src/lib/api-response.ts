import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import type { TierName } from "@/config/tiers";

type ApiSuccess<T = unknown> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number
) {
  const body: ApiError = { success: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

// Common error responses
export const unauthorized = () => apiError("UNAUTHORIZED", "Authentication required", 401);
export const forbidden = () => apiError("FORBIDDEN", "Insufficient permissions", 403);
export const notFound = (resource = "Resource") => apiError("NOT_FOUND", `${resource} not found`, 404);
export const rateLimited = (message = "Rate limit exceeded") => apiError("RATE_LIMITED", message, 429);
export const badRequest = (message: string) => apiError("BAD_REQUEST", message, 400);
export const serverError = (message = "Internal server error") => apiError("INTERNAL_ERROR", message, 500);
export const serviceUnavailable = (message = "Service temporarily unavailable. Please sign out and sign in again.") =>
  apiError("SERVICE_UNAVAILABLE", message, 503);

/**
 * Get authenticated session with validated user ID.
 * Returns null response helpers if auth fails or user ID is missing.
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, userId: null, tier: "free" as TierName, error: unauthorized() };
  }

  const userId = session.user.id;
  if (!userId) {
    return { session, userId: null, tier: "free" as TierName, error: serviceUnavailable("User session incomplete. Please sign out and sign in again.") };
  }

  const tier = ((session.user as Record<string, unknown>).tier as TierName) || "free";
  return { session, userId, tier, error: null };
}
