/**
 * Perplexity API configuration.
 * Deep research model performs live web searches to find real-time data.
 */

export const PERPLEXITY_API_URL =
  process.env.PERPLEXITY_API_URL || "https://api.perplexity.ai/chat/completions";

export const PERPLEXITY_MODEL =
  process.env.PERPLEXITY_MODEL || "sonar-pro";

export const PERPLEXITY_TIMEOUT = 90_000; // 90 seconds — deep research is slow

export const PERPLEXITY_MAX_RETRIES = 2;

/** Global daily cap to prevent runaway costs. */
export const PERPLEXITY_DAILY_CAP = parseInt(
  process.env.PERPLEXITY_DAILY_CAP || "50",
  10
);

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/**
 * Check if Perplexity API key is configured.
 */
export function isPerplexityConfigured(): boolean {
  const key = process.env.PERPLEXITY_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

export function getPerplexityApiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || !key.trim()) {
    throw new Error(
      "PERPLEXITY_API_KEY is not configured. Add it to .env.local."
    );
  }
  return key.trim();
}
