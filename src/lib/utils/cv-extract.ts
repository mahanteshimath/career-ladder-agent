/**
 * Extract text from uploaded CV files (PDF and DOCX).
 * Uses pdf-parse for PDFs and mammoth for DOCX.
 */

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractPdf(buffer);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractDocx(buffer);
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Generate a safe filename with timestamp + truncated original name.
 */
export function sanitizeFilename(originalName: string): string {
  const timestamp = Date.now();
  const clean = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 50);
  return `${timestamp}_${clean}`;
}
