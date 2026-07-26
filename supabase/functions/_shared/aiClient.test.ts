/**
 * Regression tests for extractJsonFromAiContent.
 *
 * Context: between 2026-02-11 and b56faf51 (2026-07-26), ten edge functions did
 * `JSON.parse(extractJsonFromAiContent(content))`. Because the helper already
 * returns a parsed value, the second parse stringified the object to
 * "[object Object]" and threw SyntaxError on every request — every caller fell
 * into its catch/fallback path and the model's output was silently discarded
 * (most visibly, L2 AI signals were replaced by a regex heuristic labelled as AI).
 *
 * These tests pin both halves of that contract:
 *   1. the helper returns a parsed object/array — never a JSON string;
 *   2. no call site anywhere under supabase/functions re-parses its return value.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { extractJsonFromAiContent } from "./aiClient.ts";

const FUNCTIONS_DIR = join(__dirname, "..");

function listEdgeFunctionSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listEdgeFunctionSources(full);
    return entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
      ? [full]
      : [];
  });
}

describe("extractJsonFromAiContent", () => {
  it("returns a parsed object, not a JSON string", () => {
    const result = extractJsonFromAiContent('{"score": 42}');

    expect(typeof result).toBe("object");
    expect(result).toEqual({ score: 42 });
    expect(typeof result).not.toBe("string");
  });

  it("strips markdown code fences and still returns a parsed object", () => {
    const result = extractJsonFromAiContent('```json\n{"hardSkillClarity": "high"}\n```');

    expect(result).toEqual({ hardSkillClarity: "high" });
  });

  it("strips unlabelled code fences", () => {
    expect(extractJsonFromAiContent('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("finds the JSON object inside surrounding prose", () => {
    const result = extractJsonFromAiContent('Sure! Here is the analysis:\n{"summary": "ok"}\nHope that helps.');

    expect(result).toEqual({ summary: "ok" });
  });

  it("returns arrays when the caller asks for one", () => {
    expect(extractJsonFromAiContent<unknown[]>("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("re-parsing the return value throws — this is the regression being guarded", () => {
    const result = extractJsonFromAiContent('{"score": 42}');

    // What ten call sites used to do. JSON.parse coerces its argument to the
    // string "[object Object]", which is not valid JSON.
    expect(() => JSON.parse(result as unknown as string)).toThrow(SyntaxError);
  });

  it("returns null (never throws) when the content holds no JSON", () => {
    expect(extractJsonFromAiContent("I'm sorry, I can't help with that.")).toBeNull();
    expect(extractJsonFromAiContent("")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(extractJsonFromAiContent('{"score": 42,}')).toBeNull();
    expect(extractJsonFromAiContent('```json\n{"unterminated": \n```')).toBeNull();
  });

  it("returns null for bare primitives, so a string can never escape", () => {
    expect(extractJsonFromAiContent("42")).toBeNull();
    expect(extractJsonFromAiContent('"just a quoted string"')).toBeNull();
    expect(extractJsonFromAiContent("true")).toBeNull();
    expect(extractJsonFromAiContent("null")).toBeNull();
  });
});

describe("edge function call sites", () => {
  const sources = listEdgeFunctionSources(FUNCTIONS_DIR);

  it("finds the edge function sources to scan", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it("never passes the return value of extractJsonFromAiContent to JSON.parse", () => {
    const offenders: string[] = [];

    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("extractJsonFromAiContent")) continue;

      // Direct: JSON.parse(extractJsonFromAiContent(...))
      if (/JSON\.parse\(\s*extractJsonFromAiContent/.test(source)) {
        offenders.push(`${file}: JSON.parse(extractJsonFromAiContent(...))`);
      }

      // Indirect: const x = extractJsonFromAiContent(...); ... JSON.parse(x)
      // Also catches the dead `typeof x === 'string' ? JSON.parse(x) : x` guard,
      // which is unreachable under the current return type and only muddies the contract.
      const assignments = source.matchAll(
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:await\s+)?extractJsonFromAiContent\b/g,
      );
      for (const [, name] of assignments) {
        if (new RegExp(`JSON\\.parse\\(\\s*${name}\\s*[),]`).test(source)) {
          offenders.push(`${file}: JSON.parse(${name}) where ${name} is already parsed`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
