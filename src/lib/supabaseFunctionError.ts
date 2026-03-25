const extractMessageFromString = (value: string): string | null => {
  const trimmed = value.trim();
  const jsonStart = trimmed.indexOf("{");
  const candidates = [trimmed, jsonStart >= 0 ? trimmed.slice(jsonStart) : null].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        return parsed.error.trim();
      }
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      continue;
    }
  }

  return null;
};

export async function getSupabaseFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error && typeof error === "object") {
    const maybeContext = (error as { context?: Response }).context;

    if (maybeContext instanceof Response) {
      try {
        const payload = await maybeContext.clone().json();
        if (typeof payload?.error === "string" && payload.error.trim()) {
          return payload.error.trim();
        }
      } catch {
        try {
          const text = await maybeContext.clone().text();
          const extracted = extractMessageFromString(text);
          if (extracted) return extracted;
        } catch {
          // Ignore parse failures and fall through to generic handling.
        }
      }
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      const extracted = extractMessageFromString(message);
      return extracted ?? message;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return extractMessageFromString(error) ?? error;
  }

  return fallback;
}