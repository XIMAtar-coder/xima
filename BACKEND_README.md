# XIMA Supabase Backend Documentation

## Overview
Production-grade Supabase backend for the XIMA web application with comprehensive data persistence, security, and business logic.

## Architecture

### Database Schema

#### Core Tables
- **profiles** - Extended user profiles with XIMAtar assignment
- **assessments** - User assessment records and metadata
- **assessment_scores** - Detailed pillar scores (0-10 scale)
- **user_scores** - Current score snapshot for dashboard performance

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
- **devplan_user_items** - User progress tracking
- **tests** - Assessment test definitions
- **test_attempts** - User test submissions

#### Internationalization
- **i18n_keys** - Translation key registry
- **i18n_translations** - Multi-language content (IT/EN/ES)

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

#### Automated Score Processing
When an assessment is completed:
1. Trigger `on_assessment_complete` fires
2. Function `recompute_user_scores` calculates pillar scores
3. XIMAtar type assigned based on highest pillar
4. Opportunity matches recalculated automatically

#### XIMAtar Assignment Logic
```
Computational Power (highest) → Owl
Communication (highest) → Parrot
Knowledge (highest) → Elephant
Creativity (highest) → Fox
Drive (highest) → Horse
Default → Wolf
```

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

### Creating an Assessment

```typescript
// 1. Create assessment record
const { data: assessment, error } = await supabase
  .from('assessments')
  .insert({
    user_id: profileId,
    source: 'onboarding',
    level: 'beginner',
    started_at: new Date().toISOString()
  })
  .select()
  .single()

// 2. Submit pillar scores
await supabase.from('assessment_scores').insert([
  { assessment_id: assessment.id, pillar: 'computational_power', score: 7.5 },
  { assessment_id: assessment.id, pillar: 'communication', score: 8.0 },
  { assessment_id: assessment.id, pillar: 'knowledge', score: 6.5 },
  { assessment_id: assessment.id, pillar: 'creativity', score: 9.0 },
  { assessment_id: assessment.id, pillar: 'drive', score: 7.0 }
])

// 3. Mark as complete (triggers auto-processing)
await supabase
  .from('assessments')
  .update({ completed_at: new Date().toISOString() })
  .eq('id', assessment.id)

// XIMAtar is now assigned and matches are computed
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
- `assessment_scores(assessment_id, pillar)`
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

Initial translations provided for:
- XIMAtar names (IT/EN/ES)
- Dashboard labels
- Chat welcome messages
- Mentor discovery copy

Extend translations in `i18n_translations` table as needed.

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

1. ✅ Database schema created
2. ✅ RLS policies enforced
3. ✅ Storage buckets configured
4. ✅ Business logic functions deployed
5. ⏳ Connect frontend to new tables
6. ⏳ Migrate existing assessment data to new structure
7. ⏳ Add seed data for development plan items
8. ⏳ Configure Supabase Auth security settings

## Support

For schema modifications or troubleshooting:
- Review Supabase logs: [Edge Function Logs](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/logs/edge-functions)
- Check RLS policies: [Database Policies](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/auth/policies)
- SQL Editor: [Run Queries](https://supabase.com/dashboard/project/iyckvvnecpnldrxqmzta/sql/new)
