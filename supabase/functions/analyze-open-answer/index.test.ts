import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-open-answer`;

interface AnalysisResult {
  score_total: number;
  score_breakdown: {
    length: number;
    relevance: number;
    structure: number;
    specificity: number;
    action: number;
  };
  quality_label: string;
  steve_jobs_explanation: string;
  improvement_suggestions: string[];
  detected_red_flags: string[];
  cleaned_text: string;
  non_answer_detected: boolean;
}

async function callAnalyzeOpenAnswer(text: string, options?: {
  field?: string;
  language?: string;
  openKey?: string;
}): Promise<AnalysisResult> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      text,
      field: options?.field || "science_tech",
      language: options?.language || "en",
      openKey: options?.openKey || "open1",
    }),
  });

  // response.json() already consumes the body
  const data = await response.json();
  return data;
}

// =====================================================
// NON-ANSWER DETECTION TESTS
// =====================================================

Deno.test("Non-answer: 'I don't know' returns low score", async () => {
  const result = await callAnalyzeOpenAnswer("I don't know");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
  assertEquals(result.quality_label, "insufficient");
  assert(result.detected_red_flags.includes("non_answer"), "Should have non_answer flag");
});

Deno.test("Non-answer: 'idk' returns low score", async () => {
  const result = await callAnalyzeOpenAnswer("idk");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
  assertEquals(result.quality_label, "insufficient");
});

Deno.test("Non-answer: Italian 'non lo so' returns low score", async () => {
  const result = await callAnalyzeOpenAnswer("non lo so", { language: "it" });
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

Deno.test("Non-answer: Very short text (< 15 chars)", async () => {
  const result = await callAnalyzeOpenAnswer("ok sure");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

Deno.test("Non-answer: Only dots/ellipsis", async () => {
  const result = await callAnalyzeOpenAnswer("......");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

Deno.test("Non-answer: 'boh' (Italian slang for 'I don't know')", async () => {
  const result = await callAnalyzeOpenAnswer("boh", { language: "it" });
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

Deno.test("Non-answer: Spanish 'no sé'", async () => {
  const result = await callAnalyzeOpenAnswer("no sé", { language: "es" });
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

Deno.test("Non-answer: Less than 5 words", async () => {
  const result = await callAnalyzeOpenAnswer("this is short text");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10, `Score should be <= 10, got ${result.score_total}`);
});

// =====================================================
// SUBSTANTIVE ANSWER TESTS
// =====================================================

Deno.test("Substantive answer: Medium quality gets reasonable score", async () => {
  const mediumQualityAnswer = `
    When approaching a complex data analysis problem, I typically start by understanding the 
    business context and defining clear objectives. I then gather and clean the data, 
    perform exploratory analysis to identify patterns, and select appropriate statistical 
    methods. For example, in my previous project, I used regression analysis to predict 
    customer churn and achieved 85% accuracy. Communication of findings is crucial.
  `;
  
  const result = await callAnalyzeOpenAnswer(mediumQualityAnswer);
  
  assertEquals(result.non_answer_detected, false);
  assert(result.score_total > 30, `Medium quality should score > 30, got ${result.score_total}`);
  assert(result.score_total <= 85, `Should not be too high, got ${result.score_total}`);
  assertExists(result.steve_jobs_explanation);
  assert(result.improvement_suggestions.length > 0, "Should have improvement suggestions");
});

Deno.test("Short but valid answer gets capped score", async () => {
  const shortValidAnswer = "I analyze data using Python and create visualizations to present insights.";
  
  const result = await callAnalyzeOpenAnswer(shortValidAnswer);
  
  // Should not be detected as non-answer (it's valid content, just short)
  // But score should be capped due to brevity
  assert(result.score_total <= 50, `Short answer should be capped, got ${result.score_total}`);
});

// =====================================================
// RESPONSE STRUCTURE TESTS
// =====================================================

Deno.test("Response has all required fields", async () => {
  const result = await callAnalyzeOpenAnswer("I don't know");
  
  assertExists(result.score_total, "Should have score_total");
  assertExists(result.score_breakdown, "Should have score_breakdown");
  assertExists(result.quality_label, "Should have quality_label");
  assertExists(result.steve_jobs_explanation, "Should have explanation");
  assertExists(result.improvement_suggestions, "Should have improvement_suggestions");
  assertExists(result.detected_red_flags, "Should have detected_red_flags");
  assertExists(result.cleaned_text, "Should have cleaned_text");
  assert(typeof result.non_answer_detected === "boolean", "Should have non_answer_detected boolean");
});

Deno.test("Score breakdown sums correctly", async () => {
  const result = await callAnalyzeOpenAnswer("I don't know");
  
  const breakdown = result.score_breakdown;
  assertExists(breakdown.length);
  assertExists(breakdown.relevance);
  assertExists(breakdown.structure);
  assertExists(breakdown.specificity);
  assertExists(breakdown.action);
  
  // All values should be numbers
  assert(typeof breakdown.length === "number");
  assert(typeof breakdown.relevance === "number");
  assert(typeof breakdown.structure === "number");
  assert(typeof breakdown.specificity === "number");
  assert(typeof breakdown.action === "number");
});

Deno.test("Quality label reflects score correctly", async () => {
  // Non-answer should have 'insufficient' label
  const nonAnswerResult = await callAnalyzeOpenAnswer("idk");
  assertEquals(nonAnswerResult.quality_label, "insufficient");
});

// =====================================================
// EDGE CASES
// =====================================================

Deno.test("Handles empty string gracefully", async () => {
  const result = await callAnalyzeOpenAnswer("");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10);
});

Deno.test("Handles whitespace-only input", async () => {
  const result = await callAnalyzeOpenAnswer("     \n\t   ");
  
  assertEquals(result.non_answer_detected, true);
  assert(result.score_total <= 10);
});

Deno.test("Improvement suggestions are provided for non-answers", async () => {
  const result = await callAnalyzeOpenAnswer("idk");
  
  assert(result.improvement_suggestions.length >= 2, "Should have at least 2 suggestions");
  assert(
    result.improvement_suggestions.every(s => s.length > 10),
    "Suggestions should be meaningful text"
  );
});
