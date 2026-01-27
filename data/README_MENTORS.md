# Mentor Data Import Guide

## Overview

Mentors displayed at the **END of the candidate assessment** (XimatarJourney → ResultsComparison → FeaturedProfessionals) are fetched from:
- **Primary**: `public.mentors` table via `recommend-mentors` edge function
- **Fallback**: `public.mentors_public` view

### Key Principles

- ✅ **Flexible count** — ANY number of mentors (not fixed to 6)
- ✅ **Database is source of truth** — No hardcoded mentors in UI
- ✅ **Only active mentors shown** — Filter: `is_active = true`
- ✅ **No code changes needed** — Update data via SQL only
- ✅ **No AI generation** — All mentor content is founder-provided

---

## Quick Start (4 Steps)

### Step 1: Edit JSON Data
1. Open `data/mentors_seed.input.json`
2. Add mentor objects to the `"mentors"` array
3. Each mentor needs `name` and `xima_pillars` (required)

### Step 2: Upload Photos
1. Upload mentor photos to `public/avatars/` folder
2. Use format: `firstname-lastname.jpg` (lowercase, hyphenated)
3. Recommended: **512×512px** or **800×800px**, square, JPG/WebP

### Step 3: Run SQL Upsert
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new)
2. Copy the UPSERT statement(s) from `data/mentors_upsert.sql`
3. Run the SQL

### Step 4: Verify
1. Check mentors with: `SELECT * FROM public.mentors WHERE is_active = true;`
2. Complete an assessment to see mentors in the post-assessment screen

---

## Files Reference

| File | Purpose |
|------|---------|
| `mentors_seed.input.json` | Source of truth — your mentor data |
| `mentors_seed.template.json` | Schema reference with examples |
| `mentors_upsert.sql` | SQL script to run (copy to SQL Editor) |
| `README_MENTORS.md` | This guide |

---

## JSON Schema

File: `data/mentors_seed.input.json`

```json
{
  "mentors": [
    {
      "name": "Full Name (REQUIRED)",
      "title": "Role / Title (optional)",
      "bio": "Short bio text (optional)",
      "profile_image_url": "/avatars/firstname-lastname.jpg (optional)",
      "linkedin_url": "https://linkedin.com/in/handle (optional, used for matching)",
      "specialties": ["tag1", "tag2"] (optional),
      "xima_pillars": ["communication", "drive"] (REQUIRED),
      "rating": 4.8 (optional, 0-5),
      "is_active": true (optional, defaults to true)
    }
  ]
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

## UPSERT Matching Logic

The SQL script uses this matching priority:

1. **PRIMARY: `linkedin_url`** — If provided, matches on LinkedIn URL (unique index)
2. **FALLBACK: `name`** — If no linkedin_url, matches by name (case-insensitive)
3. **INSERT** — If no match found, creates new mentor with generated UUID

This means:
- ✅ You don't need to know existing UUIDs
- ✅ LinkedIn URL is the safest way to identify mentors
- ✅ New mentors are auto-inserted
- ✅ Existing mentors are updated, not duplicated

---

## Example: Adding 3 Mentors

```json
{
  "mentors": [
    {
      "name": "Daniel Cracau",
      "title": "Entrepreneur and Kindness Advocate | Ex UN staff",
      "bio": "Enabling sustainable technologies through hard work, creativity, and win-win networking.",
      "profile_image_url": "/avatars/daniel-cracau.jpg",
      "linkedin_url": "https://www.linkedin.com/in/daniel-cracau/",
      "specialties": ["Entrepreneurship", "Sustainable technologies"],
      "xima_pillars": ["communication", "knowledge", "computational_power"],
      "rating": 5.0,
      "is_active": true
    },
    {
      "name": "Jane Smith",
      "title": "Leadership Coach",
      "bio": "Expert in career transitions and executive coaching.",
      "profile_image_url": "/avatars/jane-smith.jpg",
      "linkedin_url": "https://linkedin.com/in/janesmith",
      "specialties": ["Leadership", "Coaching"],
      "xima_pillars": ["communication", "drive"],
      "rating": 4.8,
      "is_active": true
    },
    {
      "name": "Marco Rossi",
      "title": "Tech Advisor",
      "bio": "CTO background, specializes in tech career paths.",
      "profile_image_url": "/avatars/marco-rossi.jpg",
      "linkedin_url": "https://linkedin.com/in/marcorossi",
      "specialties": ["Technology", "Strategy"],
      "xima_pillars": ["computational_power", "knowledge"],
      "rating": 4.9,
      "is_active": true
    }
  ]
}
```

---

## Hiding/Removing Mentors

To **hide a mentor** without deleting:

```sql
UPDATE public.mentors 
SET is_active = false, updated_at = now()
WHERE linkedin_url = 'https://linkedin.com/in/mentor-to-hide';
-- OR
WHERE LOWER(name) = LOWER('Mentor Name');
```

The mentor will no longer appear but data is preserved.

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
- [ ] JSON is valid (use jsonlint.com to check)
- [ ] Every mentor has `name` (required)
- [ ] Every mentor has `xima_pillars` array with valid values
- [ ] `rating` is between 0.0 and 5.0 (or omit)
- [ ] Photo files exist at specified paths
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
SELECT id, name, linkedin_url, is_active, updated_at 
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

## Troubleshooting

**Mentor not appearing?**
1. Check `is_active = true`
2. Verify photo path exists
3. Confirm `xima_pillars` are valid

**Duplicate mentor created?**
- Use `linkedin_url` for reliable matching
- Check for typos in LinkedIn URL

**SQL error on upsert?**
- Ensure `linkedin_url` is unique per mentor
- Validate JSON arrays are properly formatted
