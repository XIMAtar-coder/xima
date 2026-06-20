// Truncate text to ~maxTokens (estimated as 4 chars/token by default).
// Cuts on a word boundary when possible. Used PRIOR to hashing so idempotency
// is computed on the exact bytes that will be embedded.

export function truncateToTokens(text: string, maxTokens = 2000, charsPerToken = 4): string {
  if (!text) return "";
  const maxChars = maxTokens * charsPerToken;
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) return slice.slice(0, lastSpace);
  return slice;
}

// Stable SHA-256 hex digest of input string (Deno Web Crypto).
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
