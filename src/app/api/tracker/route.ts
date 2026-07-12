import { NextRequest } from "next/server";
import {
  addTrackerItem,
  getTrackerItems,
  updateTrackerItem,
  deleteTrackerItem,
} from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";
import { generateDeduplicationHash } from "@/lib/utils/dedup";
import { ALL_STAGE_IDS } from "@/config/tracker";
import { z } from "zod";

const addSchema = z.object({
  journey: z.enum(["job", "academic"]),
  title: z.string().min(1).max(512),
  organization: z.string().max(512).optional(),
  location: z.string().max(256).optional(),
  url: z.string().max(2048).optional(),
  deadline: z.string().optional(),
  sourceType: z.enum(["job", "position", "manual"]).optional(),
  sourceId: z.string().max(36).optional(),
  stage: z.enum(ALL_STAGE_IDS).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(ALL_STAGE_IDS).optional(),
  notes: z.string().max(2000).optional(),
});

// GET /api/tracker?journey=job|academic — list the user's tracker items
export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const journeyParam = new URL(request.url).searchParams.get("journey");
  const journey = journeyParam === "job" || journeyParam === "academic" ? journeyParam : undefined;

  try {
    const items = await getTrackerItems(userId, journey);
    return apiSuccess(items);
  } catch (err) {
    console.error("Tracker list error:", err);
    return serverError();
  }
}

// POST /api/tracker — add an item to the tracker
export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const parsed = addSchema.safeParse(await request.json());
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }
  const d = parsed.data;

  try {
    const added = await addTrackerItem({
      userId,
      journey: d.journey,
      stage: d.stage,
      title: d.title,
      organization: d.organization,
      location: d.location,
      url: d.url,
      deadline: d.deadline,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      dedupHash: generateDeduplicationHash(
        `${userId}:${d.title}`,
        d.organization || "",
        d.location || ""
      ),
      notes: d.notes,
      metadata: d.metadata,
    });
    return apiSuccess({ added });
  } catch (err) {
    console.error("Tracker add error:", err);
    return serverError();
  }
}

// PATCH /api/tracker — update an item's stage and/or notes
export async function PATCH(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  try {
    await updateTrackerItem(userId, parsed.data.id, {
      stage: parsed.data.stage,
      notes: parsed.data.notes,
    });
    return apiSuccess({ updated: true });
  } catch (err) {
    console.error("Tracker update error:", err);
    return serverError();
  }
}

// DELETE /api/tracker?id=<itemId> — remove an item
export async function DELETE(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("id is required");

  try {
    await deleteTrackerItem(userId, id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("Tracker delete error:", err);
    return serverError();
  }
}
