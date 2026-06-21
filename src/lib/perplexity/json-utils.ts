/**
 * JSON parsing utilities for AI-generated responses.
 * Handles markdown fencing, partial JSON, and multiple response formats.
 */

/**
 * Parse a JSON array or object from AI-generated text.
 * Handles: raw JSON, markdown-fenced JSON, embedded JSON in prose.
 */
export function parseJsonResponse(text: string): unknown[] | null {
  if (!text || !text.trim()) return null;

  // Try direct parse first
  const direct = tryParseJson(text.trim());
  if (direct !== null) return normalizeToArray(direct);

  // Strip markdown fences (```json ... ``` or ``` ... ```)
  const fenced = extractFromFences(text);
  if (fenced) {
    const parsed = tryParseJson(fenced);
    if (parsed !== null) return normalizeToArray(parsed);
  }

  // Try to find JSON array in text (regex)
  const extracted = extractJsonArray(text);
  if (extracted) {
    const parsed = tryParseJson(extracted);
    if (parsed !== null) return normalizeToArray(parsed);
  }

  // Try to find JSON object in text
  const extractedObj = extractJsonObject(text);
  if (extractedObj) {
    const parsed = tryParseJson(extractedObj);
    if (parsed !== null) return normalizeToArray(parsed);
  }

  return null;
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeToArray(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data.length > 0 ? data : null;
  }
  if (typeof data === "object" && data !== null) {
    // Handle { "positions": [...] } or { "jobs": [...] }
    const obj = data as Record<string, unknown>;
    for (const key of ["positions", "jobs", "results", "data", "items"]) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        return obj[key] as unknown[];
      }
    }
    // Single object → wrap in array
    return [data];
  }
  return null;
}

function extractFromFences(text: string): string | null {
  // Match ```json\n...\n``` or ```\n...\n```
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  return match?.[1]?.trim() || null;
}

function extractJsonArray(text: string): string | null {
  // Find the first [ and its matching ]
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
