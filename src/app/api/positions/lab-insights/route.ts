export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getAuthenticatedUser, badRequest, serverError } from "@/lib/api-response";

const labSchema = z.object({
  university: z.string().min(2, "University is required"),
  department: z.string().optional(),
  field: z.string().optional(),
});

// POST /api/positions/lab-insights — compile lab/department insights for a position
export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = labSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }

  try {
    const result = await orchestrate({
      task: "research_lab",
      userId,
      payload: {
        university: parsed.data.university,
        department: parsed.data.department || "",
        field: parsed.data.field,
      },
    });

    if (!result.success) {
      return serverError("Could not compile lab insights. Please try again.");
    }

    return NextResponse.json({ success: true, data: result.data, cached: result.cached });
  } catch (err) {
    console.error("[lab-insights] Error:", err);
    return serverError("Could not compile lab insights. Please try again.");
  }
}
