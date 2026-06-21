/**
 * Hash-based deduplication for job/position entries.
 * Uses title + company/university + location to generate unique key.
 */
export function generateDeduplicationHash(
  title: string,
  organization: string,
  location: string
): string {
  const normalized = `${title.toLowerCase().trim()}|${organization.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
  return hashString(normalized);
}

/**
 * Simple FNV-1a 32-bit hash for deduplication keys.
 */
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Check if an entry already exists before inserting.
 */
export function isDuplicate(
  existingHashes: Set<string>,
  title: string,
  organization: string,
  location: string
): boolean {
  const hash = generateDeduplicationHash(title, organization, location);
  return existingHashes.has(hash);
}
