import { NextRequest } from "next/server";
import { generateOtp } from "@/lib/auth/otp";
import { apiSuccess, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/otp/send — Send OTP to the user's email
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    const result = await generateOtp(parsed.data.email);
    if (!result.success) {
      return badRequest(result.message);
    }
    return apiSuccess({ message: result.message });
  } catch (error) {
    console.error("OTP send error:", error);
    return serverError();
  }
}
