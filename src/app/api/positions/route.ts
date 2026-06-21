import { NextRequest } from "next/server";
import { getPositions, savePosition, unsavePosition } from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";

/**
 * GET /api/positions — List academic positions with filters
 * Query params: type, continent, department, keyword, limit, offset
 */
export async function GET(request: NextRequest) {
  const { error } = await getAuthenticatedUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);

  try {
    const positions = await getPositions({
      type: searchParams.get("type") || undefined,
      continent: searchParams.get("continent") || undefined,
      department: searchParams.get("department") || undefined,
      keyword: searchParams.get("keyword") || undefined,
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
    });

    return apiSuccess(positions);
  } catch (error) {
    console.error("Positions fetch error:", error);
    return serverError();
  }
}

/**
 * POST /api/positions — Save/unsave a position bookmark
 * Body: { positionId, action: "save" | "unsave" }
 */
export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await request.json();
  const { positionId, action } = body;

  if (!positionId || !["save", "unsave"].includes(action)) {
    return badRequest("positionId and action (save/unsave) are required");
  }

  try {
    if (action === "save") {
      await savePosition(userId, positionId);
    } else {
      await unsavePosition(userId, positionId);
    }
    return apiSuccess({ saved: action === "save" });
  } catch (err) {
    console.error("Position save error:", err);
    return serverError();
  }
}
