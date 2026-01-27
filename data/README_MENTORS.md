# Mentor Data Import Guide

## Overview

Mentors displayed at the END of the candidate assessment flow (post-assessment mentor selection) are fetched from:
- **Primary**: `public.mentors` table via `recommend-mentors` edge function
- **Fallback**: `public.mentors_public` view (for unauthenticated users)

## Quick Start (3 Steps)

### Step 1: Prepare Your Data
1. Open `data/mentors_seed.input.json`
2. Fill in real values for each mentor (see schema below)
3. Save the file

### Step 2: Upload Photos
1. Add mentor photos to `public/avatars/` folder
2. Use format: `firstname-lastname.jpg` (lowercase, hyphenated)
3. Recommended: **512×512px** or **800×800px**, square, JPG or WebP

### Step 3: Run SQL Update
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new)
2. Copy statements from `data/mentors_upsert.sql`
3. Replace `{{PLACEHOLDER}}` values with your data
4. Run the SQL

---

## Files Reference

| File | Purpose |
|------|---------|
| `mentors_seed.template.json` | Schema example with sample values |
| `mentors_seed.input.json` | **YOUR INPUT** — fill this with real data |
| `mentors_upsert.sql` | SQL statements to run in Supabase |
| `README_MENTORS.md` | This guide |

---

## Current Mentor IDs (DO NOT CHANGE)

| ID | Current Name |
|----|--------------|
| `b58d9a69-93e0-4634-bffb-48e26d4fe922` | Pietro Martinelli |
| `8e51d44c-b96d-42d1-ac48-823f2cb8686b` | Dr. Maria Rossi |
| `8f879039-36cb-4367-8064-49ba9a9fdbf2` | Pietro Cozzi |
| `82eb1e7a-efb1-4170-931b-712db6e33ba8` | Daniel Cracau |
| `928dbd7d-1d4f-4abd-b069-d6bb18fd725e` | Roberta Fazzeri |
| `c66de3f0-98bd-4f31-b1eb-89b9edcdb2fa` | Daniel Rodriguez |

---

## JSON Schema

```json
{
  "id": "UUID (REQUIRED — must match existing DB row)",
  "name": "Full Name (REQUIRED)",
  "title": "Role / Specialty (optional)",
  "bio": "Single bio text, prefer Italian (optional)",
  "profile_image_url": "/avatars/filename.jpg (optional)",
  "linkedin_url": "https://linkedin.com/in/... (optional)",
  "specialties": ["tag1", "tag2"] (REQUIRED, string array),
  "xima_pillars": ["pillar1", "pillar2"] (REQUIRED, see valid values),
  "rating": 4.8 (optional, 0.0-5.0),
  "experience_years": 10 (optional, 0-60),
  "is_active": true (REQUIRED)
}
```

### Valid xima_pillars Values
- `computational_power`
- `communication`
- `knowledge`
- `creativity`
- `drive`

---

## Photo Guidelines

| Aspect | Recommendation |
|--------|----------------|
| Size | 512×512px or 800×800px |
| Format | JPG or WebP |
| Aspect ratio | Square (1:1) |
| Filename | `firstname-lastname.jpg` (lowercase) |
| Location | `public/avatars/` folder |

---

## Validation Checklist

Before running SQL:
- [ ] All `id` values match existing DB rows
- [ ] `name` is filled for each mentor
- [ ] `specialties` is a non-empty array
- [ ] `xima_pillars` contains only valid values
- [ ] `rating` is between 0.0 and 5.0 (or null)
- [ ] Photo files exist at the specified paths

---

## Security Notes

The `mentors_public` view exposes only safe fields:
- ✅ id, name, title, bio, profile_image_url, linkedin_url, specialties, xima_pillars, rating, is_active
- ❌ user_id, availability, hourly_rate (NOT exposed)

---

## Dry Run

**Always test with ONE mentor first before updating all.**

```sql
-- Preflight: Check current state
SELECT id, name, is_active, updated_at 
FROM public.mentors 
ORDER BY name;
```
