# Mentor Data Import Guide

## Overview

Mentors displayed at the **END of the candidate assessment** (post-assessment mentor selection) are fetched from:
- **Primary**: `public.mentors` table via `recommend-mentors` edge function
- **Fallback**: `public.mentors_public` view (for unauthenticated users)

### Key Principles

- ✅ **Flexible count** — You can have 3, 5, 8, 20, or any number of mentors
- ✅ **Database is source of truth** — No hardcoded mentors in UI
- ✅ **Only active mentors shown** — Filter: `is_active = true`
- ✅ **No code changes needed** — Update data via SQL only
- ✅ **No AI generation** — All mentor content is founder-provided

---

## Quick Start (3 Steps)

### Step 1: Prepare Your Data
1. Create your mentor data following the JSON schema below
2. Each mentor needs an `id` that **already exists** in the database
3. Or insert new mentor rows first (see "Adding New Mentors" section)

### Step 2: Upload Photos
1. Add mentor photos to `public/avatars/` folder
2. Use format: `firstname-lastname.jpg` (lowercase, hyphenated)
3. Recommended: **512×512px** or **800×800px**, square, JPG or WebP

### Step 3: Run SQL Update
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new)
2. Write UPDATE statements for each mentor (see `mentors_upsert.sql` template)
3. Run the SQL
4. Verify with the post-update query

---

## Files Reference

| File | Purpose |
|------|---------|
| `mentors_seed.template.json` | Schema example with sample values |
| `mentors_seed.input.json` | Template for your mentor data |
| `mentors_upsert.sql` | SQL template for updates |
| `README_MENTORS.md` | This guide |

---

## JSON Schema

Each mentor object must follow this structure:

```json
{
  "id": "uuid (REQUIRED — must match existing DB row)",
  "name": "string (REQUIRED)",
  "title": "string (optional)",
  "bio": "string (optional)",
  "profile_image_url": "string, e.g. /avatars/name.jpg (optional)",
  "linkedin_url": "string, full URL (optional)",
  "specialties": ["string array"] (REQUIRED),
  "xima_pillars": ["string array"] (REQUIRED, see valid values),
  "rating": "number 0.0-5.0 (optional)",
  "experience_years": "number 0-60 (optional)",
  "is_active": "boolean (REQUIRED, true to show)"
}
```

### Valid xima_pillars Values
Only these values are allowed:
- `computational_power`
- `communication`
- `knowledge`
- `creativity`
- `drive`

---

## Example: Adding 3 Mentors

```json
[
  {
    "id": "b58d9a69-93e0-4634-bffb-48e26d4fe922",
    "name": "Jane Doe",
    "title": "Career Coach",
    "bio": "Expert in leadership development with 12 years of experience.",
    "profile_image_url": "/avatars/jane-doe.jpg",
    "linkedin_url": "https://linkedin.com/in/janedoe",
    "specialties": ["leadership", "communication"],
    "xima_pillars": ["communication", "drive"],
    "rating": 4.8,
    "experience_years": 12,
    "is_active": true
  },
  {
    "id": "8e51d44c-b96d-42d1-ac48-823f2cb8686b",
    "name": "John Smith",
    "title": "Technical Mentor",
    "bio": "Specializes in data science and analytical thinking.",
    "profile_image_url": "/avatars/john-smith.jpg",
    "linkedin_url": "https://linkedin.com/in/johnsmith",
    "specialties": ["data science", "analytics"],
    "xima_pillars": ["computational_power", "knowledge"],
    "rating": 4.6,
    "experience_years": 8,
    "is_active": true
  },
  {
    "id": "8f879039-36cb-4367-8064-49ba9a9fdbf2",
    "name": "Maria Garcia",
    "title": "Innovation Specialist",
    "bio": "Helps professionals unlock creative problem-solving.",
    "profile_image_url": "/avatars/maria-garcia.jpg",
    "linkedin_url": "https://linkedin.com/in/mariagarcia",
    "specialties": ["creativity", "innovation"],
    "xima_pillars": ["creativity", "communication"],
    "rating": 4.9,
    "experience_years": 15,
    "is_active": true
  }
]
```

---

## Adding New Mentors

To add a **new mentor** (not update an existing one):

1. Generate a new UUID (use [uuidgenerator.net](https://www.uuidgenerator.net/))
2. Insert the new row first:

```sql
INSERT INTO public.mentors (id, name, is_active, specialties, xima_pillars)
VALUES (
  'YOUR_NEW_UUID_HERE',
  'New Mentor Name',
  true,
  ARRAY['specialty1'],
  ARRAY['communication']
);
```

3. Then update with full data using the standard UPDATE statement

---

## Hiding Mentors

To **hide a mentor** without deleting:

```sql
UPDATE public.mentors 
SET is_active = false, updated_at = now()
WHERE id = 'MENTOR_UUID_HERE';
```

The mentor will no longer appear in the assessment results but data is preserved.

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
- [ ] All `id` values match existing DB rows (or insert new ones first)
- [ ] `name` is filled for each mentor
- [ ] `specialties` is a non-empty array
- [ ] `xima_pillars` contains only valid values (see list above)
- [ ] `rating` is between 0.0 and 5.0 (or null)
- [ ] Photo files exist at the specified paths
- [ ] `is_active = true` for mentors you want displayed

---

## Security Notes

The `mentors_public` view exposes only safe fields:
- ✅ id, name, title, bio, profile_image_url, linkedin_url, specialties, xima_pillars, rating, is_active
- ❌ user_id, availability, hourly_rate (NOT exposed)

---

## Verification Queries

### Check current mentors:
```sql
SELECT id, name, is_active, updated_at 
FROM public.mentors 
ORDER BY name;
```

### Count active mentors:
```sql
SELECT COUNT(*) as active_mentor_count 
FROM public.mentors 
WHERE is_active = true;
```

### Validate pillar values:
```sql
SELECT id, name, xima_pillars
FROM public.mentors
WHERE NOT (
  xima_pillars <@ ARRAY['computational_power', 'communication', 'knowledge', 'creativity', 'drive']::text[]
);
-- Should return 0 rows
```

---

## Dry Run

**Always test with ONE mentor first before updating all.**

1. Run preflight check
2. Update 1 mentor
3. Verify in SQL and in the assessment flow
4. Then update the rest
