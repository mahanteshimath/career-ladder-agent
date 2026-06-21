/**
 * Perplexity API HTTP client with retry logic and response normalization.
 * Uses the sonar-deep-research model for real-time web search.
 */

import {
  PERPLEXITY_API_URL,
  PERPLEXITY_MODEL,
  PERPLEXITY_TIMEOUT,
  PERPLEXITY_MAX_RETRIES,
  isRetryableStatus,
  getPerplexityApiKey,
} from "./config";

export interface PerplexitySuccess {
  content: string;
  citations: string[];
}

export interface PerplexityError {
  error: string;
}

export type PerplexityResult = PerplexitySuccess | PerplexityError;

export function isPerplexityError(
  result: PerplexityResult
): result is PerplexityError {
  return "error" in result;
}

interface CallOptions {
  model?: string;
  temperature?: number;
  webSearchOptions?: { search_context_size: string };
  timeout?: number;
  maxRetries?: number;
}

/**
 * Call the Perplexity API with automatic retries and response normalization.
 *
 * @param systemPrompt - System-level instructions
 * @param userPrompt - User query
 * @param options - Override defaults (model, temperature, timeout)
 * @returns Normalized content + citations, or error object
 */
export async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  options: CallOptions = {}
): Promise<PerplexityResult> {
  if (!systemPrompt.trim() || !userPrompt.trim()) {
    return { error: "System prompt and user prompt must not be empty." };
  }

  const apiKey = getPerplexityApiKey();
  const model = options.model || PERPLEXITY_MODEL;
  const temperature = options.temperature ?? 0.0;
  const timeout = options.timeout || PERPLEXITY_TIMEOUT;
  const maxRetries = options.maxRetries ?? PERPLEXITY_MAX_RETRIES;
  const totalAttempts = Math.max(1, maxRetries + 1);

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  };

  if (options.webSearchOptions) {
    payload.web_search_options = options.webSearchOptions;
  }

  let lastError = "";

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (isRetryableStatus(response.status)) {
        lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
        if (attempt < totalAttempts) {
          await sleepBeforeRetry(attempt);
          continue;
        }
        return {
          error: `Perplexity temporary failure after ${totalAttempts} attempts (${lastError})`,
        };
      }

      if (!response.ok) {
        const body = (await response.text()).slice(0, 300);
        return { error: `Perplexity API error (HTTP ${response.status}): ${body}` };
      }

      const result = await response.json();
      const normalized = normalizeResponse(result);

      if (normalized) {
        return normalized;
      }

      return {
        error: `Unexpected Perplexity API response shape: ${JSON.stringify(result).slice(0, 500)}`,
      };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = "Request timed out.";
        if (attempt < totalAttempts) {
          await sleepBeforeRetry(attempt);
          continue;
        }
        return {
          error: "Perplexity API request timed out after retries. Deep research takes long; try again.",
        };
      }

      lastError = `Connection error: ${(err as Error).message}`;
      if (attempt < totalAttempts) {
        await sleepBeforeRetry(attempt);
        continue;
      }
      return { error: `Connection error after retries: ${lastError}` };
    }
  }

  return { error: `Perplexity request failed: ${lastError}` };
}

/**
 * Exponential backoff with bounded jitter.
 */
function sleepBeforeRetry(attempt: number): Promise<void> {
  const delay = Math.min(8000, 2 ** (attempt - 1) * 1000 + Math.random() * 300);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Normalize different Perplexity response formats into { content, citations }.
 */
function normalizeResponse(
  result: Record<string, unknown>
): PerplexitySuccess | null {
  const content = extractContent(result);
  if (!content) return null;
  const citations = extractCitations(result);
  return { content, citations };
}

function extractContent(result: Record<string, unknown>): string {
  // Classic chat completions shape
  const choices = result.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message as Record<string, unknown> | undefined;
    if (message) {
      const content = message.content;
      if (typeof content === "string") return content;
      // Array of content blocks
      if (Array.isArray(content)) {
        const parts: string[] = [];
        for (const block of content) {
          if (typeof block === "object" && block !== null) {
            const text =
              (block as Record<string, unknown>).text ||
              (block as Record<string, unknown>).content;
            if (typeof text === "string" && text) parts.push(text);
          }
        }
        if (parts.length > 0) return parts.join("\n");
      }
    }
  }

  // Agent/tool response shapes
  if (typeof result.output_text === "string" && result.output_text) {
    return result.output_text as string;
  }
  if (typeof result.answer === "string" && result.answer) {
    return result.answer as string;
  }
  if (typeof result.content === "string" && result.content) {
    return result.content as string;
  }

  return "";
}

function extractCitations(result: Record<string, unknown>): string[] {
  // Direct citations array
  if (Array.isArray(result.citations)) {
    return (result.citations as unknown[])
      .filter((c): c is string => typeof c === "string" && c.startsWith("http"))
      .map((c) => c.trim());
  }

  // Sources array with url field
  if (Array.isArray(result.sources)) {
    return (result.sources as Record<string, unknown>[])
      .map((s) => (s.url || s.link || "") as string)
      .filter((u) => u.startsWith("http"));
  }

  // Nested in choices[0].message
  const choices = result.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message as Record<string, unknown> | undefined;
    if (message && Array.isArray(message.citations)) {
      return (message.citations as unknown[])
        .filter((c): c is string => typeof c === "string" && c.startsWith("http"));
    }
  }

  return [];
}
