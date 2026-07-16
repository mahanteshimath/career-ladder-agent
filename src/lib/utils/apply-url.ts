/**
 * Apply-link reliability guard.
 *
 * Live job/position URLs come from an LLM (Perplexity) and are often unreliable:
 * they may be empty, or point at a search-results / aggregator listing page
 * rather than the specific posting. Linking straight to those sends the user to
 * a DIFFERENT job than the one they clicked. When a URL looks unreliable we fall
 * back to a targeted web search for the exact role, which reliably lands the user
 * on the right posting instead of a wrong one.
 */

// Patterns that indicate a search-results / aggregator listing page rather than
// a single specific posting.
const UNRELIABLE_URL_PATTERNS: RegExp[] = [
  /google\.[a-z.]+\/search/i,
  /bing\.com\/search/i,
  /indeed\.[a-z.]+\/(q-|jobs\?|m\/jobs)/i,
  /linkedin\.com\/jobs\/search/i,
  /glassdoor\.[a-z.]+\/(Search|Job\/jobs)/i,
  /naukri\.com\/.*-jobs/i,
  /ziprecruiter\.com\/(Jobs|candidate\/search)/i,
  /simplyhired\.[a-z.]+\/search/i,
  /monster\.[a-z.]+\/jobs\/search/i,
];

export function isReliableApplyUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return !UNRELIABLE_URL_PATTERNS.some((re) => re.test(trimmed));
}

export interface ApplyLink {
  href: string;
  /** True when we fell back to a web search instead of a direct posting link. */
  isSearch: boolean;
}

/**
 * Resolve the best apply/source link for a role. Uses the direct URL when it
 * looks like a specific posting; otherwise returns a Google search for the
 * exact role so the user reliably finds it.
 */
export function resolveApplyLink(
  url: string | undefined | null,
  title: string,
  organization?: string | null
): ApplyLink {
  if (isReliableApplyUrl(url)) {
    return { href: url!.trim(), isSearch: false };
  }
  const query = [title, organization].filter(Boolean).join(" ").trim();
  return {
    href: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    isSearch: true,
  };
}
