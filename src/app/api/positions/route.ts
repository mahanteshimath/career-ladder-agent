import { NextRequest } from "next/server";
import { getPositions, savePosition, unsavePosition, getUserCvs } from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";
import { computeFitScore } from "@/lib/utils/fit-score";

/** Extract keywords from a user's most recent parsed CV. Never throws. */
async function latestCvKeywords(userId: string): Promise<string[]> {
  try {
    const cvs = await getUserCvs(userId);
    const latest = cvs?.[0] as { PARSED_JSON?: unknown } | undefined;
    if (!latest?.PARSED_JSON) return [];
    const parsed =
      typeof latest.PARSED_JSON === "string"
        ? JSON.parse(latest.PARSED_JSON)
        : latest.PARSED_JSON;
    const kw = (parsed as { keywords?: unknown; skills?: unknown }) || {};
    const keywords = Array.isArray(kw.keywords) ? kw.keywords.map(String) : [];
    const skills = Array.isArray(kw.skills) ? kw.skills.map(String) : [];
    return [...keywords, ...skills];
  } catch {
    return [];
  }
}

/**
 * GET /api/positions — List academic positions with filters
 * Query params: type, continent, department, keyword, limit, offset
 */
export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
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

    // Attach an optional, additive FIT_SCORE when the user has a parsed CV.
    // Fully deterministic (no AI cost); failures degrade to no score.
    const cvKeywords = await latestCvKeywords(userId);
    const withFit =
      cvKeywords.length > 0 && Array.isArray(positions)
        ? (positions as Record<string, unknown>[]).map((p) => {
            const text = [p.TITLE, p.DEPARTMENT, p.DESCRIPTION, p.REQUIREMENTS]
              .filter(Boolean)
              .join(" ");
            return { ...p, FIT_SCORE: computeFitScore(cvKeywords, text) };
          })
        : positions;

    return apiSuccess(withFit);
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
