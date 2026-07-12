import { NextRequest } from "next/server";
import { getUserProfile, updateUserProfile } from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";
import { z } from "zod";

const profileSchema = z.object({
  goal: z.enum(["job", "masters", "phd", "postdoc", "undecided"]),
  field: z.string().min(1).max(100),
  level: z.enum(["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"]),
  geoPref: z.array(z.string()).max(10).optional(),
  researchInterests: z.array(z.string()).max(20).optional(),
  confirmedByUser: z.boolean().default(true),
});

export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const row = await getUserProfile(userId);
    if (!row || !row.PROFILE_JSON) {
      return apiSuccess(null);
    }
    return apiSuccess(row.PROFILE_JSON);
  } catch (err) {
    console.error("Get profile error:", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    const profile = {
      ...parsed.data,
      detectedAt: new Date().toISOString(),
      confirmedByUser: true,
    };
    await updateUserProfile(userId, profile);
    return apiSuccess({ profile });
  } catch (err) {
    console.error("Update profile error:", err);
    return serverError();
  }
}
