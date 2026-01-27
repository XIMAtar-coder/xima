# Mentor Data Import Guide

## Overview

Mentors displayed at the end of the candidate assessment flow are stored in `public.mentors` table.

**Source of truth:**
- Edge function `recommend-mentors` queries `public.mentors` where `is_active = true`
- Fallback: `public.mentors_public` view (for guest users)

## Current Mentors in DB

| ID | Name | Status |
|----|------|--------|
| b58d9a69-93e0-4634-bffb-48e26d4fe922 | Pietro Martinelli | active |
| 8e51d44c-b96d-42d1-ac48-823f2cb8686b | Dr. Maria Rossi | active |
| 8f879039-36cb-4367-8064-49ba9a9fdbf2 | Pietro Cozzi | active |
| 82eb1e7a-efb1-4170-931b-712db6e33ba8 | Daniel Cracau | active |
| 928dbd7d-1d4f-4abd-b069-d6bb18fd725e | Roberta Fazzeri | active |
| c66de3f0-98bd-4f31-b1eb-89b9edcdb2fa | Daniel Rodriguez | active |

## How to Update Mentors

### Step 1: Prepare Your Data

1. Copy `mentors_seed.template.json` to `mentors_seed.json`
2. Fill in real values for each mentor
3. **IMPORTANT:** Keep the `id` field unchanged - it must match existing DB rows

### Step 2: Upload Images

Upload mentor photos to `public/avatars/` with filenames matching `profile_image_url`:
- `/avatars/pietro-martinelli.jpg` → `public/avatars/pietro-martinelli.jpg`

### Step 3: Generate UPDATE Statements

For each mentor in your JSON, create an UPDATE statement:

```sql
UPDATE public.mentors SET
  name = 'Full Name',
  title = 'Role / Specialty',
  bio = 'Bio text (use Italian as default, or English)',
  profile_image_url = '/avatars/filename.jpg',
  linkedin_url = 'https://linkedin.com/in/...',
  specialties = ARRAY['tag1', 'tag2'],
  xima_pillars = ARRAY['communication', 'drive'],
  rating = 4.8,
  experience_years = 10,
  is_active = true,
  updated_at = now()
WHERE id = 'UUID_HERE';
```

### Step 4: Run Migration

Use the Supabase SQL editor or create a migration file.

## Schema Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | YES | Must match existing row |
| name | text | YES | Full display name |
| title | text | NO | Role/specialty title |
| bio | text | NO | Single language (prefer IT) |
| profile_image_url | text | NO | Path like `/avatars/name.jpg` |
| linkedin_url | text | NO | Full LinkedIn URL |
| specialties | text[] | YES | Array of expertise tags |
| xima_pillars | text[] | YES | Array: computational_power, communication, knowledge, creativity, drive |
| rating | numeric | NO | 0.0 to 5.0 |
| experience_years | integer | NO | 0 to 60 |
| is_active | boolean | NO | Default true |

## Validation Rules

- `rating`: 0.0 - 5.0
- `experience_years`: 0 - 60
- `xima_pillars`: Must be valid pillar names
- `profile_image_url`: Must start with `/avatars/` or be a full URL

## Preflight Check

Before updating, verify current state:

```sql
SELECT id, name, is_active, updated_at 
FROM public.mentors 
ORDER BY updated_at DESC;
```

## Dry Run

Test with ONE mentor first before batch updating.
