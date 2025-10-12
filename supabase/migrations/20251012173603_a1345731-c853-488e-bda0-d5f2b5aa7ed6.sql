-- Assessment content tables for 23-question flow
-- Designed for CSV import with uuid PKs from files

-- Extensions
create extension if not exists pgcrypto;

-- 1) FLOW DEFINITIONS
create table if not exists public.assessment_flows (
  id uuid primary key,
  code text unique not null,
  title_key text,
  active boolean not null default true,
  "default" boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.flow_sections (
  id uuid primary key,
  flow_id uuid not null references public.assessment_flows(id) on delete cascade,
  section_index int not null check (section_index > 0),
  title_key text,
  description_key text
);

-- 2) QUESTION BANK
create table if not exists public.question_bank (
  id uuid primary key,
  code text unique not null,
  pillar text not null check (pillar in ('computational_power','communication','knowledge','creativity','drive')),
  level text check (level in ('beginner','intermediate','expert')),
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_localizations (
  question_id uuid not null references public.question_bank(id) on delete cascade,
  lang text not null check (lang in ('it','en','es')),
  prompt text not null,
  helper text,
  primary key (question_id, lang)
);

create table if not exists public.answer_options (
  id uuid primary key,
  question_id uuid not null references public.question_bank(id) on delete cascade,
  option_index int not null check (option_index between 1 and 9),
  value_label text not null,
  weight numeric(4,2),
  next_question_code text
);

-- 3) FLOW → QUESTION MAPPING
create table if not exists public.flow_questions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.assessment_flows(id) on delete cascade,
  section_id uuid references public.flow_sections(id) on delete set null,
  question_id uuid not null references public.question_bank(id) on delete cascade,
  position int not null check (position > 0)
);

-- Indexes for performance
create index if not exists idx_flow_sections_flow on public.flow_sections(flow_id, section_index);
create index if not exists idx_flow_questions_flow on public.flow_questions(flow_id, position);
create index if not exists idx_answer_options_question on public.answer_options(question_id, option_index);
create index if not exists idx_question_bank_code on public.question_bank(code);
create index if not exists idx_question_bank_pillar on public.question_bank(pillar);

-- Enable RLS on all content tables
alter table public.assessment_flows enable row level security;
alter table public.flow_sections enable row level security;
alter table public.question_bank enable row level security;
alter table public.question_localizations enable row level security;
alter table public.answer_options enable row level security;
alter table public.flow_questions enable row level security;

-- Public read policies (service role will bypass RLS for writes)
drop policy if exists "flows: read" on public.assessment_flows;
create policy "flows: read" on public.assessment_flows for select using (true);

drop policy if exists "flow_sections: read" on public.flow_sections;
create policy "flow_sections: read" on public.flow_sections for select using (true);

drop policy if exists "question_bank: read" on public.question_bank;
create policy "question_bank: read" on public.question_bank for select using (true);

drop policy if exists "question_localizations: read" on public.question_localizations;
create policy "question_localizations: read" on public.question_localizations for select using (true);

drop policy if exists "answer_options: read" on public.answer_options;
create policy "answer_options: read" on public.answer_options for select using (true);

drop policy if exists "flow_questions: read" on public.flow_questions;
create policy "flow_questions: read" on public.flow_questions for select using (true);