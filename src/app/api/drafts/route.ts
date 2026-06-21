import { getAuthenticatedUser } from "@/lib/api-response";
import { getUserDrafts } from "@/lib/snowflake/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const drafts = await getUserDrafts(userId);
    return NextResponse.json({
      success: true,
      data: drafts.map((draft) => ({
        id: String(draft.ID),
        type: String(draft.TYPE),
        content: String(draft.CONTENT || ""),
        context: draft.CONTEXT,
        createdAt: draft.CREATED_AT,
      })),
    });
  } catch (err) {
    console.error("Draft list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load drafts" },
      { status: 500 }
    );
  }
}
