import { NextRequest } from "next/server";
import { submitIssue, getUserIssues } from "@/lib/snowflake/queries";
import { apiSuccess, apiError, badRequest, getAuthenticatedUser } from "@/lib/api-response";
import { z } from "zod";

const issueSchema = z.object({
  category: z.enum(["bug", "feature", "content", "other"]),
  description: z.string().min(20, "Description must be at least 20 characters"),
  attachment: z
    .string()
    .regex(/^data:image\/(png|jpe?g|gif|webp);base64,/, "Attachment must be a PNG, JPG, GIF, or WEBP image")
    .max(4_000_000, "Attachment too large (max ~2MB)")
    .optional(),
});

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    await submitIssue({
      userId,
      category: parsed.data.category,
      description: parsed.data.description,
      attachment: parsed.data.attachment ?? null,
    });

    return apiSuccess({ message: "Issue reported successfully" }, 201);
  } catch (err) {
    console.error("Issue submission error:", err);
    return apiError("INTERNAL_ERROR", "Failed to submit issue", 500);
  }
}

export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const issues = await getUserIssues(userId);
    return apiSuccess(issues);
  } catch (err) {
    console.error("Issue fetch error:", err);
    return apiError("INTERNAL_ERROR", "Failed to fetch issues", 500);
  }
}
