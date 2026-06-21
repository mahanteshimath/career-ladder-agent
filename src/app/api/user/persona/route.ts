import { NextRequest } from "next/server";
import { updateUserPersona } from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  persona: z.enum(["student", "job_seeker"]),
  researchInterests: z.array(z.string()).max(20).default([]),
});

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    await updateUserPersona(
      userId,
      parsed.data.persona,
      parsed.data.researchInterests
    );
    return apiSuccess({ persona: parsed.data.persona });
  } catch (error) {
    console.error("Update persona error:", error);
    return serverError();
  }
}
