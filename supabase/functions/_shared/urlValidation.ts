/**
 * SSRF guard — only allow https public URLs.
 * Blocks loopback, private, link-local, ULA, and reserved ranges.
 * Throws on unsafe / invalid URLs.
 */
export function assertSafePublicUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Only https URLs are allowed");
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateRanges = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc[0-9a-f]{2}:/i,
    /^fd[0-9a-f]{2}:/i,
    /^fe80:/i,
  ];
  if (privateRanges.some((r) => r.test(host))) {
    throw new Error("Private or reserved address blocked");
  }
  return parsed;
}

/** Safe fetch wrapper that validates URL before issuing the request. */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  const safe = assertSafePublicUrl(rawUrl);
  return fetch(safe.toString(), init);
}
