const DEFAULT_CALLBACK_URL = "/dashboard";

export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  baseUrl: string
) {
  if (!callbackUrl) {
    return DEFAULT_CALLBACK_URL;
  }

  try {
    const base = new URL(baseUrl);
    const parsed = new URL(callbackUrl, base.origin);

    if (parsed.origin !== base.origin) {
      return DEFAULT_CALLBACK_URL;
    }

    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return safePath === "/" ? DEFAULT_CALLBACK_URL : safePath;
  } catch {
    return DEFAULT_CALLBACK_URL;
  }
}
