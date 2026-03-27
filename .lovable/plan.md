

# XIMA Intelligence Engine — Phase A Implementation Plan

## What This Does

Adds a database-native intelligence layer that reduces AI API costs by 40-50% on matching functions. The database learns from every AI call and answers future requests without needing the LLM.

Three layers:
1. **Vector matching** (pgvector) — instant job/mentor matching at zero API cost
2. **Pattern library** — reusable AI outputs served from database
3. **Inference deposits** — every AI call stores structured data back into the database

## Technical Plan

### 1. Database Migration

Create a single migration that:

- Enables the `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- Adds `pillar_vector vector(5)` column to `profiles` table
- Adds `requirement_vector vector(5)` to `job_posts`
- Adds `strength_vector vector(5)` to `mentors`
- Adds `pillar_vector_col vector(5)` to `company_profiles`
- Creates trigger `compute_pillar_vector()` that auto-computes the vector when `pillar_scores` changes on `profiles`
- Backfills existing profiles
- Creates `intelligence_patterns` table (pattern type, archetype, pillar, confidence, usage count, JSONB data)
- Creates `intelligence_deposits` table (user_id, function_name, deposit data, linked pattern)
- Creates 4 SQL functions: `match_jobs_by_vector`, `match_mentors_by_gap`, `find_similar_profiles`, `find_matching_patterns`
- Creates IVFFlat indexes on vector columns

**Note on IVFFlat indexes**: These require a minimum number of rows to build properly (lists parameter). With lists=10, this needs ~100+ rows. For early-stage usage this is fine — Postgres falls back to sequential scan when the index can't be used.

**Note on mentors table**: The `mentors` table has `xima_pillars TEXT[]` (pillar names, not scores). The `strength_vector` column will need to be populated manually or via a separate process that maps pillar names to scores. The `match_mentors_by_gap` function will only return results for mentors with populated vectors.

### 2. New Shared Module: `_shared/intelligenceEngine.ts`

Creates a module with:
- `matchJobsByVector(userId, limit)` — calls `match_jobs_by_vector` RPC
- `matchMentorsByGap(userId, limit)` — calls `match_mentors_by_gap` RPC
- `findPattern(type, archetype, pillar, minConfidence)` — calls `find_matching_patterns` RPC, increments usage count on hit
- `depositInference(userId, functionName, data, metadata)` — stores deposit + creates/strengthens patterns
- `checkDatabaseFirst(type, archetype, pillar)` — checks pattern library, returns `{source: 'database'|'llm_required', data, confidence}`

### 3. Edge Function Integration (4 functions)

**recommend-jobs**: Before the existing scoring loop, call `matchJobsByVector()`. If vector matches exist, use them for ranking and only call Claude for narrative generation on top 5 matches (shrinking the prompt from ~3000 to ~200 tokens). After Claude call, `depositInference()`.

**recommend-mentors**: Call `matchMentorsByGap()` first. If gap-based matches exist, use them. Claude only needed for narrative. After success, deposit.

**generate-growth-path**: Call `checkDatabaseFirst('growth_path', archetype, weakestPillar)`. If a high-confidence pattern exists, return it directly (zero API cost). Otherwise call Claude normally, then deposit the result as a new pattern.

**generate-challenge**: Call `checkDatabaseFirst('challenge', archetype, targetPillar)`. Same pattern — serve from DB if confident, else call Claude and deposit.

### 4. Files Changed

| File | Action |
|------|--------|
| New migration SQL | Create tables, functions, indexes, triggers |
| `supabase/functions/_shared/intelligenceEngine.ts` | New module |
| `supabase/functions/recommend-jobs/index.ts` | Add vector matching + deposits |
| `supabase/functions/recommend-mentors/index.ts` | Add gap matching + deposits |
| `supabase/functions/generate-growth-path/index.ts` | Add pattern check + deposits |
| `supabase/functions/generate-challenge/index.ts` | Add pattern check + deposits |
| `src/integrations/supabase/types.ts` | Auto-updated with new tables |

### 5. Cost Impact

- **recommend-jobs**: Vector matching replaces full LLM scoring. Claude only writes narratives for top 5. ~70% cost reduction.
- **recommend-mentors**: Gap matching is pure math. Claude only for narrative. ~80% reduction.
- **generate-growth-path**: After first call per archetype/pillar combo, future calls served from pattern library. ~90% reduction on repeat patterns.
- **generate-challenge**: Same pattern caching. ~90% on repeats.

### 6. Risk Mitigation

- All vector matching is additive — if no vectors exist, functions fall back to current LLM path
- Pattern confidence threshold (0.7) prevents serving low-quality cached patterns
- Existing budget and cache systems remain untouched and complement this layer

