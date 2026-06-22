export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/agents/orchestrator";
import { insertCv, getUserCvs, deleteOlderCvs } from "@/lib/snowflake/queries";
import { embedAndStoreCv } from "@/lib/snowflake/embeddings";
import { extractTextFromFile, sanitizeFilename } from "@/lib/utils/cv-extract";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { trackUsage } from "@/lib/snowflake/queries";
import { getAuthenticatedUser } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  // Rate limit check — disabled for testing
  // try {
  //   await enforceRateLimit(userId, tier, "cv_upload");
  // } catch (err) {
  //   return NextResponse.json(
  //     { success: false, error: (err as Error).message },
  //     { status: 429 }
  //   );
  // }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file provided" },
      { status: 400 }
    );
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  try {
    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromFile(buffer, file.type);

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Could not extract sufficient text from file" },
        { status: 400 }
      );
    }

    // Parse CV with AI agent
    const parseResult = await orchestrate({
      task: "parse_cv",
      userId,
      payload: { rawText },
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Failed to parse CV" },
        { status: 500 }
      );
    }

    // Extract flat CV object and profile from CvParseResult { cv, detectedProfile }
    const cvParseResult = parseResult.data as { cv: object; detectedProfile: object; usedFallback?: boolean };
    const parsedCv = cvParseResult.cv || cvParseResult; // handle both shapes
    const detectedProfile = cvParseResult.detectedProfile || null;
    const filename = sanitizeFilename(file.name);

    // Store flat CV object in Snowflake (not the wrapper)
    await insertCv({
      userId,
      filename,
      rawText,
      parsedJson: parsedCv,
    });

    // Delete older CVs keeping only the latest 3
    await deleteOlderCvs(userId, 3);

    // Retrieve the newly inserted CV ID
    const userCvs = await getUserCvs(userId);
    const newCvId = userCvs?.[0]?.ID as string | undefined;

    // Generate and store embedding (optional — may fail on trial accounts)
    try {
      await embedAndStoreCv(userId, rawText);
    } catch (embedErr) {
      console.warn("Embedding generation skipped (Cortex unavailable):", (embedErr as Error).message);
    }

    // Track usage
    await trackUsage(userId, "cv_upload");

    return NextResponse.json({
      success: true,
      data: {
        id: newCvId,
        filename,
        parsed: parsedCv,
        profile: detectedProfile,
        usedFallback: cvParseResult.usedFallback || false,
        processingTime: parseResult.processingTime,
      },
    });
  } catch (error) {
    console.error("CV upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
