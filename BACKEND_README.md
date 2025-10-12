# XIMA Supabase Backend Documentation

## Overview
Production-grade Supabase backend for the XIMA web application with **content-first architecture**. All questions, flows, rules, tests, and UI copy are stored as editable content in the database—no code changes required to update assessments, add translations, or modify business logic.

## Architecture

### Database Schema

#### Core Tables
- **profiles** - Extended user profiles with XIMAtar assignment
- **assessments** - User assessment session records
- **assessment_answers** - User responses to specific questions (what they actually answered)
- **assessment_scores** - Computed pillar scores (0-10 scale)
- **user_scores** - Current score snapshot for dashboard performance

#### Content Management (Editable without code changes)
- **question_bank** - Master question repository with pillar/level
- **question_localizations** - Translated prompts and helpers (IT/EN/ES)
- **answer_options** - Answer choices with weights and branching logic
- **assessment_flows** - Named assessment sequences (e.g., '23Q onboarding')
- **flow_sections** - Grouping sections within flows
- **flow_questions** - Links questions to flows in order
- **scoring_rules** - Editable scoring formulas (JSON)
- **ximatar_rules** - XIMAtar assignment logic (JSON, no hardcoding)
- **content_versions** - Version tracking for questions/rules/tests

#### Mentoring System
- **mentors** - Professional mentor profiles
- **mentor_matches** - Mentee-to-mentor assignments
- **appointments** - Scheduled mentoring sessions
- **professionals** - Professional session providers
- **bookings** - Professional session bookings

#### Communication
- **chat_threads** - Conversation containers
- **chat_participants** - Thread membership
- **chat_messages** - Message history with i18n support

#### Opportunities
- **opportunities** - Job listings
- **user_opportunity_matches** - Personalized job rankings
- **company_sentiment** - Community-sourced company insights
- **saved_opportunities** - User-saved job bookmarks

#### Development Plan
- **devplan_items** - Available skill-building activities
- **dev_items_localizations** - Translated titles/descriptions for dev items
- **devplan_user_items** - User progress tracking
- **tests** - Test definitions with metadata
- **test_questions** - Editable test questions with type/position
- **test_answers** - Answer options with correct flags and weights
- **test_attempts** - User test submissions

#### Internationalization & Configuration
- **i18n_keys** - Translation key registry
- **i18n_translations** - Multi-language content (IT/EN/ES)
- **feature_flags** - Enable/disable features without deployment
- **ui_copy_overrides** - Per-language UI text overrides

#### Analytics
- **bot_events** - Chatbot interaction tracking

### Data Types

#### Enums
```sql
-- XIMAtar personality types
ximatar_type: lion | owl | dolphin | fox | bear | cat | bee | parrot | elephant | wolf | chameleon | horse

-- Supported languages
lang_code: it | en | es
```

### Key Features

#### Content-First Architecture
**Zero-Code Content Updates**: All assessment questions, flows, rules, and tests are stored as database records. Content editors can:
- Add/edit questions with multi-language support
- Reorder questions in flows without code changes
- Update scoring weights and XIMAtar assignment rules
- Create new tests with custom questions
- Toggle features on/off via feature flags
- Version content changes for auditing

#### Automated Score Processing
When an assessment is completed:
1. User answers stored in `assessment_answers` table
2. Trigger `on_assessment_complete` fires
3. Function `recompute_user_scores` calculates pillar scores from answer weights
4. XIMAtar type assigned based on `ximatar_rules` logic (editable)
5. Opportunity matches recalculated automatically

#### XIMAtar Assignment Logic (Editable in `ximatar_rules`)
Default logic:
```
Computational Power (highest) → Owl
Communication (highest) → Parrot
Knowledge (highest) → Elephant
Creativity (highest) → Fox
Drive (highest) → Horse
Default → Wolf
```
**Note**: This logic is stored as JSON in the database and can be modified by admins.

## Security

### Row Level Security (RLS)
All tables have RLS enabled with strict policies:

- **Profiles**: Users can view/edit their own profile
- **Assessments**: Users can only access their own assessments
- **Chat**: Participants can only access threads they're part of
- **Bookings**: Users see only their own bookings
- **Opportunities**: Public read, user-specific matches
- **Development Plan**: Users track only their own progress

### Functions
All functions use `SECURITY DEFINER` with explicit `search_path = public` to prevent search path exploitation.

## Storage

### Buckets

#### avatars (Public)
- User profile pictures
- 5MB max file size
- Allowed: JPEG, PNG, WebP, GIF
- Users can upload/update/delete their own avatars
- Path: `avatars/{user_id}/*`

#### ximatar (Public Read-Only)
- XIMAtar character assets
- 10MB max file size
- Allowed: JPEG, PNG, WebP, SVG
- Admin upload only

#### cv-uploads (Private)
- User CV documents
- Configured via existing policies

## API Functions (RPCs)

### recompute_user_scores(user_id)
Recalculates all scores and XIMAtar assignment for a user.

```typescript
await supabase.rpc('recompute_user_scores', { p_user: userId })
```

### ensure_mentor_thread(user_id, mentor_id)
Creates or retrieves a 1:1 chat thread between user and mentor.

```typescript
const { data: threadId } = await supabase.rpc('ensure_mentor_thread', {
  p_user: userId,
  p_mentor: mentorId
})
```

### log_bot_event(user_id, route, lang, type, payload)
Logs chatbot interactions for analytics.

```typescript
await supabase.rpc('log_bot_event', {
  p_user: userId,
  p_route: '/dashboard',
  p_lang: 'it',
  p_type: 'message',
  p_payload: { action: 'help_requested' }
})
```

### recompute_matches(user_id)
Regenerates opportunity matches for a user.

```typescript
await supabase.rpc('recompute_matches', { p_user: userId })
```

## Views

### v_dashboard
Consolidated dashboard data for authenticated users.

```typescript
const { data } = await supabase
  .from('v_dashboard')
  .select('*')
  .eq('auth_user_id', user.id)
  .single()
```

Returns:
- User profile and XIMAtar
- Current pillar scores
- Match quality percentage
- Top 10 opportunity matches with details

## Usage Examples

### Fetching an Assessment Flow (Content-Driven)

```typescript
// Get the default assessment flow with questions
const { data: flow } = await supabase
  .from('assessment_flows')
  .select(`
    id,
    code,
    title_key,
    flow_questions (
      position,
      question:question_bank (
        id,
        code,
        pillar,
        level,
        question_localizations (
          lang,
          prompt,
          helper
        ),
        answer_options (
          option_index,
          value_label,
          weight
        )
      )
    )
  `)
  .eq('is_default', true)
  .eq('active', true)
  .single()

// Questions are ordered by position, ready to display
const questions = flow.flow_questions
  .sort((a, b) => a.position - b.position)
  .map(fq => fq.question)
```

### Creating an Assessment & Recording Answers

```typescript
// 1. Create assessment session
const { data: assessment } = await supabase
  .from('assessments')
  .insert({
    user_id: profileId,
    flow_code: 'onboarding_23q',
    source: 'registration',
    started_at: new Date().toISOString()
  })
  .select()
  .single()

// 2. Record each answer as user progresses
await supabase.from('assessment_answers').insert({
  assessment_id: assessment.id,
  question_id: questionId,
  option_index: selectedOptionIndex,
  weight: selectedOption.weight
})

// 3. Mark as complete (triggers auto score calculation)
await supabase
  .from('assessments')
  .update({ completed_at: new Date().toISOString() })
  .eq('id', assessment.id)

// Trigger automatically:
// - Aggregates weights by pillar into assessment_scores
// - Updates user_scores with latest pillar values
// - Assigns XIMAtar based on ximatar_rules logic
// - Recomputes opportunity matches
```

### Fetching Opportunities with Matches

```typescript
const { data: matches } = await supabase
  .from('user_opportunity_matches')
  .select(`
    match_score,
    rationale,
    opportunity:opportunities (
      id,
      title,
      company,
      location,
      skills,
      description
    )
  `)
  .eq('user_id', profileId)
  .order('match_score', { ascending: false })
  .limit(10)
```

### Starting a Chat

```typescript
// Create a mentor chat thread
const { data: threadId } = await supabase.rpc('ensure_mentor_thread', {
  p_user: profileId,
  p_mentor: mentorProfileId
})

// Send a message
await supabase.from('chat_messages').insert({
  thread_id: threadId,
  sender_id: profileId,
  body: 'Hi! I need help with analytical skills.',
  lang: 'it'
})

// Subscribe to new messages
const channel = supabase
  .channel(`thread:${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `thread_id=eq.${threadId}`
  }, (payload) => {
    console.log('New message:', payload.new)
  })
  .subscribe()
```

### Uploading an Avatar

```typescript
const file = event.target.files[0]
const filePath = `${userId}/${Date.now()}-${file.name}`

const { error: uploadError } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: true
  })

if (!uploadError) {
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)
  
  // Update profile
  await supabase
    .from('profiles')
    .update({ avatar: { url: data.publicUrl } })
    .eq('id', profileId)
}
```

### Tracking Development Plan Progress

```typescript
// Get user's dev plan items
const { data: items } = await supabase
  .from('devplan_user_items')
  .select(`
    id,
    status,
    progress,
    devplan_item:devplan_items (
      key,
      pillar,
      difficulty,
      title_i18n_key
    )
  `)
  .eq('user_id', profileId)

// Update progress
await supabase
  .from('devplan_user_items')
  .update({
    progress: 75,
    status: 'in_progress',
    last_result: { score: 8.5, completed_at: new Date().toISOString() }
  })
  .eq('id', itemId)
```

## Performance Indexes

All high-traffic queries are indexed:
- `assessments(user_id, completed_at DESC)`
- `assessment_answers(assessment_id)` - NEW
- `assessment_scores(assessment_id, pillar)`
- `question_bank(pillar)` where active - NEW
- `question_bank(code)` where active - NEW
- `answer_options(question_id, option_index)` - NEW
- `flow_questions(flow_id, position)` - NEW
- `test_questions(test_id, position)` - NEW
- `test_answers(test_question_id, option_index)` - NEW
- `chat_messages(thread_id, created_at)`
- `bookings(seeker_user_id, starts_at)`
- `user_opportunity_matches(user_id, match_score DESC)`
- `devplan_user_items(user_id, status)`
- `test_attempts(user_id, completed_at DESC)`
- `bot_events(user_id, created_at DESC)`

## Environment Variables

Required in your Lovable project:
```
SUPABASE_URL=https://iyckvvnecpnldrxqmzta.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Already configured in the project `.env` file.

## Seed Data

### Included in Migration
- **23Q Assessment Flow**: Default onboarding flow with 23 sample questions across all 5 pillars
- **XIMAtar Rules**: Default max-pillar logic for all 12 animals (editable JSON)
- **Answer Options**: 4-point Likert scale (0, 3.3, 6.7, 10 weights) for all sample questions
- **Feature Flags**: Chat, mentoring, booking, dev plan flags (all enabled)
- **i18n Keys**: Assessment, admin, and feature keys with IT/EN/ES translations

### How to Edit Content
1. **Questions**: Update `question_localizations` for text, `answer_options` for choices/weights
2. **Flows**: Add/remove questions in `flow_questions`, change order via `position`
3. **Rules**: Edit `ximatar_rules.logic` JSON to change assignment algorithm
4. **Translations**: Insert into `i18n_translations` for new languages or keys
5. **Tests**: Add rows to `test_questions` and `test_answers` for new test content

All changes take effect immediately—no code deployment required.

## Remaining Security Configuration

The following warnings require manual configuration in Supabase dashboard:

1. **OTP Expiry** - Reduce OTP token expiry time in Auth settings
2. **Leaked Password Protection** - Enable in Auth security settings  
3. **Postgres Version** - Upgrade to latest version for security patches

These are platform-level settings and cannot be configured via SQL.

## Migration History

Migrations are automatically tracked in `supabase/migrations/`:
- Initial schema creation with RLS
- Security hardening (function search_path, view security)

## Next Steps

1. ✅ Database schema created (content-first architecture)
2. ✅ RLS policies enforced (all tables protected)
3. ✅ Storage buckets configured (avatars, ximatar, uploads)
4. ✅ Business logic functions deployed (scores, matches, XIMAtar)
5. ✅ Seed data loaded (23Q flow, XIMAtar rules, feature flags, i18n)
6. ⏳ **Frontend Integration**: Connect React components to new content tables
7. ⏳ **Admin UI**: Build pages for editing questions/flows/rules (protected by RLS)
8. ⏳ **Replace Hardcoded Questions**: Migrate from static question arrays to database queries
9. ⏳ **Content Population**: Fill out complete 23Q with real questions and translations
10. ⏳ **Configure Supabase Auth**: Enable OTP protection, leaked password detection

## Admin Content Editing (Secure)

To enable admin editing of questions, flows, and rules:

1. **Create Admin Role** (see security instructions):
```sql
-- Create admin role enum
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

2. **Add Admin Policies** to content tables:
```sql
-- Example: Allow admins to insert/update/delete questions
create policy "question_bank: admin write" on public.question_bank
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Repeat for: question_localizations, answer_options, assessment_flows,
-- flow_sections, flow_questions, scoring_rules, ximatar_rules, etc.
```

3. **Build Admin UI** at `/admin` route with:
   - Question editor (CRUD for question_bank + localizations)
   - Flow builder (drag-drop question ordering)
   - Rule editor (JSON schema for ximatar_rules and scoring_rules)
   - Content version history viewer

## Support

For schema modifications or troubleshooting:
- Review Supabase logs: [Edge Function Logs](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/logs/edge-functions)
- Check RLS policies: [Database Policies](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/auth/policies)
- SQL Editor: [Run Queries](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new)
