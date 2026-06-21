import { getUserSavedPositions } from "@/lib/snowflake/queries";
import { apiSuccess, serverError, getAuthenticatedUser } from "@/lib/api-response";

/**
 * GET /api/positions/saved — List user's saved/bookmarked positions
 */
export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const positions = await getUserSavedPositions(userId);
    return apiSuccess(positions);
  } catch (err) {
    console.error("Saved positions fetch error:", err);
    return serverError();
  }
}
