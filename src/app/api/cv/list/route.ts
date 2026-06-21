import { getUserCvs } from "@/lib/snowflake/queries";
import { apiSuccess, getAuthenticatedUser } from "@/lib/api-response";

export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const cvs = await getUserCvs(userId);
    return apiSuccess(cvs);
  } catch (err) {
    console.error("CV list error:", err);
    return apiSuccess([]); // Return empty on error for graceful degradation
  }
}
