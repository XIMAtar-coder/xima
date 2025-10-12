-- =============================================
-- XIMA XIMAtar Multilingual Database Schema
-- =============================================

-- 1. TABLES

-- A. XIMatars base table
create table public.ximatars (
  id uuid primary key default gen_random_uuid(),
  label text unique not null check (label in (
    'lion','owl','dolphin','fox','bear','cat',
    'bee','parrot','elephant','wolf','chameleon','horse'
  )),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- B. XIMAtar translations
create table public.ximatar_translations (
  ximatar_id uuid not null references public.ximatars(id) on delete cascade,
  lang lang_code not null,
  title text not null,
  core_traits text not null,
  behavior text,
  weaknesses text,
  ideal_roles text,
  primary key (ximatar_id, lang)
);

-- C. Assessment results (links user to XIMAtar)
create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete cascade,
  ximatar_id uuid references public.ximatars(id),
  total_score numeric(5,2),
  computed_at timestamptz not null default now(),
  rationale jsonb,
  unique (user_id, assessment_id)
);

-- D. Pillar scores (detailed breakdown)
create table public.pillar_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_result_id uuid not null references public.assessment_results(id) on delete cascade,
  pillar text not null check (pillar in ('computational_power','communication','knowledge','creativity','drive')),
  score numeric(4,2) not null check (score >= 0 and score <= 10),
  created_at timestamptz not null default now(),
  unique (assessment_result_id, pillar)
);

-- 2. INDEXES
create index idx_ximatars_label on public.ximatars(label);
create index idx_ximatar_translations_lang on public.ximatar_translations(lang);
create index idx_assessment_results_user on public.assessment_results(user_id, computed_at desc);
create index idx_pillar_scores_result on public.pillar_scores(assessment_result_id);

-- 3. RLS POLICIES

alter table public.ximatars enable row level security;
create policy "ximatars: public read" on public.ximatars
  for select using (true);

alter table public.ximatar_translations enable row level security;
create policy "ximatar_translations: public read" on public.ximatar_translations
  for select using (true);

alter table public.assessment_results enable row level security;
create policy "assessment_results: owner read" on public.assessment_results
  for select using (auth.uid() = user_id);
create policy "assessment_results: owner write" on public.assessment_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.pillar_scores enable row level security;
create policy "pillar_scores: owner read" on public.pillar_scores
  for select using (
    exists (
      select 1 from public.assessment_results ar 
      where ar.id = pillar_scores.assessment_result_id 
      and ar.user_id = auth.uid()
    )
  );

-- 4. TRIGGERS

create trigger trg_ximatars_updated_at
before update on public.ximatars
for each row execute procedure public.touch_updated_at();

-- 5. ASSIGNMENT FUNCTION

create or replace function public.assign_ximatar(
  p_user uuid, 
  p_assessment uuid, 
  p_lang text default 'it'
)
returns uuid 
language plpgsql
security definer
set search_path = public
as $$
declare
  comp numeric; comm numeric; know numeric; crea numeric; drv numeric;
  best text; xid uuid; result_id uuid;
begin
  -- Get or create assessment result
  insert into public.assessment_results (user_id, assessment_id)
  values (p_user, p_assessment)
  on conflict (user_id, assessment_id) do update set computed_at = now()
  returning id into result_id;

  -- Get scores from assessment_scores table (existing structure)
  select
    max(case when pillar='computational_power' then score end),
    max(case when pillar='communication' then score end),
    max(case when pillar='knowledge' then score end),
    max(case when pillar='creativity' then score end),
    max(case when pillar='drive' then score end)
  into comp, comm, know, crea, drv
  from public.assessment_scores
  where assessment_id = p_assessment;

  -- Apply enhanced XIMAtar assignment logic
  if drv >= 8.5 then
    if comm >= 8.0 then
      best := 'lion';  -- Executive Leader
    elsif comp >= 8.0 then
      best := 'bee';   -- Productive Worker
    else
      best := 'horse'; -- Reliable Driver
    end if;
  elsif comp >= 8.5 then
    if crea >= 8.0 then
      best := 'cat';   -- Independent Specialist
    else
      best := 'owl';   -- Analyst
    end if;
  elsif comm >= 8.5 then
    if crea >= 7.5 then
      best := 'parrot'; -- Communicator
    elsif know >= 8.0 then
      best := 'dolphin'; -- Team Facilitator
    else
      best := 'fox';    -- Opportunist
    end if;
  elsif crea >= 8.5 then
    if comm >= 8.0 then
      best := 'fox';   -- Opportunist
    else
      best := 'cat';   -- Independent Specialist
    end if;
  elsif know >= 8.5 then
    best := 'elephant'; -- Long-Term Strategist
  elsif abs(comp - (comp+comm+know+crea+drv)/5) <= 1.0 and abs(crea - (comp+comm+know+crea+drv)/5) <= 1.0 then
    best := 'chameleon'; -- Adaptive Operator
  elsif drv >= 8.0 and comm >= 7.5 then
    best := 'wolf';      -- Tactical Team Player
  elsif drv >= 8.0 and know >= 7.5 then
    best := 'bear';      -- Reliable Guardian
  else
    best := 'horse';     -- Default fallback
  end if;

  -- Get XIMAtar ID
  select id into xid from public.ximatars where label = best;

  -- Update assessment result
  update public.assessment_results
  set 
    ximatar_id = xid,
    total_score = coalesce(comp,0) + coalesce(comm,0) + coalesce(know,0) + coalesce(crea,0) + coalesce(drv,0),
    rationale = jsonb_build_object(
      'computational_power', coalesce(comp,0),
      'communication', coalesce(comm,0),
      'knowledge', coalesce(know,0),
      'creativity', coalesce(crea,0),
      'drive', coalesce(drv,0),
      'assignment_logic', best
    ),
    computed_at = now()
  where id = result_id;

  -- Insert or update pillar scores
  insert into public.pillar_scores (assessment_result_id, pillar, score)
  values 
    (result_id, 'computational_power', coalesce(comp,0)),
    (result_id, 'communication', coalesce(comm,0)),
    (result_id, 'knowledge', coalesce(know,0)),
    (result_id, 'creativity', coalesce(crea,0)),
    (result_id, 'drive', coalesce(drv,0))
  on conflict (assessment_result_id, pillar) 
  do update set score = excluded.score, created_at = now();

  -- Also update profiles.ximatar for backward compatibility
  update public.profiles set ximatar = best::ximatar_type where id = p_user;

  return xid;
end;
$$;

-- 6. TRIGGER ON ASSESSMENT COMPLETION

create or replace function public.on_assessment_finished()
returns trigger 
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed_at is not null and (old.completed_at is null or old.completed_at != new.completed_at) then
    perform public.assign_ximatar(new.user_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assessment_finished on public.assessments;
create trigger trg_assessment_finished
after update on public.assessments
for each row execute procedure public.on_assessment_finished();

-- 7. SEED DATA

-- Insert all 12 XIMatars
insert into public.ximatars (label, image_url) values
('lion', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/lion.png'),
('owl', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/owl.png'),
('dolphin', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/dolphin.png'),
('fox', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/fox.png'),
('bear', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/bear.png'),
('cat', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/cat.png'),
('bee', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/bee.png'),
('parrot', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/parrot.png'),
('elephant', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/elephant.png'),
('wolf', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/wolf.png'),
('chameleon', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/chameleon.png'),
('horse', 'https://iyckvvnecpnldrxqmzta.supabase.co/storage/v1/object/public/ximatar/horse.png')
on conflict (label) do nothing;

-- Italian translations
insert into public.ximatar_translations (ximatar_id, lang, title, core_traits, behavior, weaknesses, ideal_roles)
select id, 'it',
  case label
    when 'lion' then 'Il Leader Esecutivo'
    when 'owl' then 'L''Analista'
    when 'dolphin' then 'Il Facilitatore di Squadra'
    when 'fox' then 'L''Opportunista'
    when 'bear' then 'Il Guardiano Affidabile'
    when 'cat' then 'Lo Specialista Indipendente'
    when 'bee' then 'Il Lavoratore Produttivo'
    when 'parrot' then 'Il Comunicatore'
    when 'elephant' then 'Lo Stratega a Lungo Termine'
    when 'wolf' then 'Il Giocatore di Squadra Tattico'
    when 'chameleon' then 'L''Operatore Adattivo'
    when 'horse' then 'Il Trascinatore Affidabile'
  end,
  case label
    when 'lion' then 'Determinato, Strategico, Dominante, Orientato ai risultati'
    when 'owl' then 'Preciso, Razionale, Strutturato, Analitico'
    when 'dolphin' then 'Empatico, Collaborativo, Positivo, Inclusivo'
    when 'fox' then 'Persuasivo, Flessibile, Astuto, Creativo'
    when 'bear' then 'Leale, Stabile, Protettivo, Affidabile'
    when 'cat' then 'Curioso, Autonomo, Analitico, Innovativo'
    when 'bee' then 'Disciplinato, Efficiente, Costante, Metodico'
    when 'parrot' then 'Espressivo, Sociale, Energico, Comunicativo'
    when 'elephant' then 'Saggio, Riflessivo, Visionario, Paziente'
    when 'wolf' then 'Collaborativo, Adattabile, Leale, Tattico'
    when 'chameleon' then 'Adattivo, Versatile, Intuitivo, Flessibile'
    when 'horse' then 'Tenace, Affidabile, Operativo, Produttivo'
  end,
  case label
    when 'lion' then 'Guida con visione strategica e decisioni rapide. Ispira gli altri verso obiettivi ambiziosi.'
    when 'owl' then 'Analizza profondamente i dati prima di agire. Preferisce precisione e struttura.'
    when 'dolphin' then 'Crea armonia nel team e facilita la collaborazione. Ottimo nell''ascolto attivo.'
    when 'fox' then 'Trova opportunità creative e negozia con astuzia. Sa adattare il messaggio al pubblico.'
    when 'bear' then 'Protegge il team e garantisce stabilità. Costruisce fiducia a lungo termine.'
    when 'cat' then 'Lavora in autonomia su problemi complessi. Innovativo e indipendente.'
    when 'bee' then 'Completa task con efficienza e disciplina. Segue processi consolidati.'
    when 'parrot' then 'Comunica con energia ed entusiasmo. Costruisce relazioni facilmente.'
    when 'elephant' then 'Pensa a lungo termine e pianifica con saggezza. Grande memoria e visione.'
    when 'wolf' then 'Gioca di squadra con intelligenza tattica. Si adatta alle dinamiche del gruppo.'
    when 'chameleon' then 'Si adatta rapidamente a contesti diversi. Versatile e intuitivo.'
    when 'horse' then 'Trascina il team con tenacia e affidabilità. Produttivo e costante.'
  end,
  case label
    when 'lion' then 'Può essere troppo direttivo; rischio di micromanagement'
    when 'owl' then 'Lento nel prendere decisioni; può paralizzarsi nell''analisi'
    when 'dolphin' then 'Evita conflitti necessari; può essere troppo accomodante'
    when 'fox' then 'Può sembrare opportunista; rischio di manipolazione percepita'
    when 'bear' then 'Resistente al cambiamento; può essere troppo conservativo'
    when 'cat' then 'Può isolarsi; difficoltà nella collaborazione'
    when 'bee' then 'Rigidità nei processi; poca flessibilità creativa'
    when 'parrot' then 'Può parlare troppo; rischio di superficialità'
    when 'elephant' then 'Lento nell''esecuzione; può essere troppo teorico'
    when 'wolf' then 'Dipende troppo dal gruppo; poca iniziativa individuale'
    when 'chameleon' then 'Può mancare di identità chiara; percepito come poco autentico'
    when 'horse' then 'Testardaggine; difficoltà ad adattarsi a nuove strategie'
  end,
  case label
    when 'lion' then 'CEO, Direttore, Manager strategico, Imprenditore'
    when 'owl' then 'Analista dati, Ricercatore, Controller, Ingegnere'
    when 'dolphin' then 'HR, Mediatore, Team coach, Customer success'
    when 'fox' then 'Venditore, Marketer, Negoziatore, Business developer'
    when 'bear' then 'Project manager, Operations, Quality assurance, Admin'
    when 'cat' then 'Sviluppatore, Designer, Consulente, Ricerca & sviluppo'
    when 'bee' then 'Specialist, Tecnico, Operatore, Amministrativo'
    when 'parrot' then 'PR, Social media manager, Speaker, Community manager'
    when 'elephant' then 'Strategist, Advisor, Consulente di direzione, Mentor'
    when 'wolf' then 'Agile team member, Scrum master, Coordinatore, Facilitatore'
    when 'chameleon' then 'Account manager, Consulente multi-settore, Generalista'
    when 'horse' then 'Operativo senior, Team lead operativo, Production manager'
  end
from public.ximatars
on conflict (ximatar_id, lang) do nothing;

-- English translations
insert into public.ximatar_translations (ximatar_id, lang, title, core_traits, behavior, weaknesses, ideal_roles)
select id, 'en',
  case label
    when 'lion' then 'The Executive Leader'
    when 'owl' then 'The Analyst'
    when 'dolphin' then 'The Team Facilitator'
    when 'fox' then 'The Opportunist'
    when 'bear' then 'The Reliable Guardian'
    when 'cat' then 'The Independent Specialist'
    when 'bee' then 'The Productive Worker'
    when 'parrot' then 'The Communicator'
    when 'elephant' then 'The Long-Term Strategist'
    when 'wolf' then 'The Tactical Team Player'
    when 'chameleon' then 'The Adaptive Operator'
    when 'horse' then 'The Reliable Driver'
  end,
  case label
    when 'lion' then 'Assertive, Strategic, Dominant, Results-oriented'
    when 'owl' then 'Precise, Rational, Structured, Analytical'
    when 'dolphin' then 'Empathetic, Collaborative, Positive, Inclusive'
    when 'fox' then 'Persuasive, Flexible, Clever, Creative'
    when 'bear' then 'Loyal, Stable, Protective, Reliable'
    when 'cat' then 'Curious, Autonomous, Analytical, Innovative'
    when 'bee' then 'Disciplined, Efficient, Consistent, Methodical'
    when 'parrot' then 'Expressive, Social, Energetic, Communicative'
    when 'elephant' then 'Wise, Reflective, Visionary, Patient'
    when 'wolf' then 'Collaborative, Adaptable, Loyal, Tactical'
    when 'chameleon' then 'Adaptive, Versatile, Intuitive, Flexible'
    when 'horse' then 'Tenacious, Reliable, Operational, Productive'
  end,
  case label
    when 'lion' then 'Leads with strategic vision and quick decisions. Inspires others toward ambitious goals.'
    when 'owl' then 'Analyzes data deeply before acting. Prefers precision and structure.'
    when 'dolphin' then 'Creates team harmony and facilitates collaboration. Excellent active listener.'
    when 'fox' then 'Finds creative opportunities and negotiates cleverly. Adapts message to audience.'
    when 'bear' then 'Protects the team and ensures stability. Builds long-term trust.'
    when 'cat' then 'Works autonomously on complex problems. Innovative and independent.'
    when 'bee' then 'Completes tasks with efficiency and discipline. Follows established processes.'
    when 'parrot' then 'Communicates with energy and enthusiasm. Builds relationships easily.'
    when 'elephant' then 'Thinks long-term and plans wisely. Great memory and vision.'
    when 'wolf' then 'Team player with tactical intelligence. Adapts to group dynamics.'
    when 'chameleon' then 'Quickly adapts to different contexts. Versatile and intuitive.'
    when 'horse' then 'Drives the team with tenacity and reliability. Productive and consistent.'
  end,
  case label
    when 'lion' then 'Can be too directive; risk of micromanagement'
    when 'owl' then 'Slow decision-making; analysis paralysis risk'
    when 'dolphin' then 'Avoids necessary conflicts; can be too accommodating'
    when 'fox' then 'May seem opportunistic; risk of perceived manipulation'
    when 'bear' then 'Resistant to change; can be too conservative'
    when 'cat' then 'Can isolate themselves; collaboration difficulties'
    when 'bee' then 'Process rigidity; little creative flexibility'
    when 'parrot' then 'Can talk too much; risk of superficiality'
    when 'elephant' then 'Slow execution; can be too theoretical'
    when 'wolf' then 'Too group-dependent; little individual initiative'
    when 'chameleon' then 'May lack clear identity; perceived as inauthentic'
    when 'horse' then 'Stubbornness; difficulty adapting to new strategies'
  end,
  case label
    when 'lion' then 'CEO, Director, Strategic Manager, Entrepreneur'
    when 'owl' then 'Data Analyst, Researcher, Controller, Engineer'
    when 'dolphin' then 'HR, Mediator, Team Coach, Customer Success'
    when 'fox' then 'Sales, Marketer, Negotiator, Business Developer'
    when 'bear' then 'Project Manager, Operations, Quality Assurance, Admin'
    when 'cat' then 'Developer, Designer, Consultant, R&D'
    when 'bee' then 'Specialist, Technician, Operator, Administrative'
    when 'parrot' then 'PR, Social Media Manager, Speaker, Community Manager'
    when 'elephant' then 'Strategist, Advisor, Management Consultant, Mentor'
    when 'wolf' then 'Agile Team Member, Scrum Master, Coordinator, Facilitator'
    when 'chameleon' then 'Account Manager, Multi-sector Consultant, Generalist'
    when 'horse' then 'Senior Operator, Operational Team Lead, Production Manager'
  end
from public.ximatars
on conflict (ximatar_id, lang) do nothing;

-- Spanish translations
insert into public.ximatar_translations (ximatar_id, lang, title, core_traits, behavior, weaknesses, ideal_roles)
select id, 'es',
  case label
    when 'lion' then 'El Líder Ejecutivo'
    when 'owl' then 'El Analista'
    when 'dolphin' then 'El Facilitador de Equipo'
    when 'fox' then 'El Oportunista'
    when 'bear' then 'El Guardián Confiable'
    when 'cat' then 'El Especialista Independiente'
    when 'bee' then 'El Trabajador Productivo'
    when 'parrot' then 'El Comunicador'
    when 'elephant' then 'El Estratega a Largo Plazo'
    when 'wolf' then 'El Jugador Táctico de Equipo'
    when 'chameleon' then 'El Operador Adaptativo'
    when 'horse' then 'El Conductor Confiable'
  end,
  case label
    when 'lion' then 'Asertivo, Estratégico, Dominante, Orientado a resultados'
    when 'owl' then 'Preciso, Racional, Estructurado, Analítico'
    when 'dolphin' then 'Empático, Colaborativo, Positivo, Inclusivo'
    when 'fox' then 'Persuasivo, Flexible, Astuto, Creativo'
    when 'bear' then 'Leal, Estable, Protector, Confiable'
    when 'cat' then 'Curioso, Autónomo, Analítico, Innovador'
    when 'bee' then 'Disciplinado, Eficiente, Constante, Metódico'
    when 'parrot' then 'Expresivo, Social, Enérgico, Comunicativo'
    when 'elephant' then 'Sabio, Reflexivo, Visionario, Paciente'
    when 'wolf' then 'Colaborativo, Adaptable, Leal, Táctico'
    when 'chameleon' then 'Adaptativo, Versátil, Intuitivo, Flexible'
    when 'horse' then 'Tenaz, Confiable, Operativo, Productivo'
  end,
  case label
    when 'lion' then 'Lidera con visión estratégica y decisiones rápidas. Inspira a otros hacia metas ambiciosas.'
    when 'owl' then 'Analiza datos profundamente antes de actuar. Prefiere precisión y estructura.'
    when 'dolphin' then 'Crea armonía en el equipo y facilita la colaboración. Excelente oyente activo.'
    when 'fox' then 'Encuentra oportunidades creativas y negocia con astucia. Adapta el mensaje a la audiencia.'
    when 'bear' then 'Protege al equipo y garantiza estabilidad. Construye confianza a largo plazo.'
    when 'cat' then 'Trabaja autónomamente en problemas complejos. Innovador e independiente.'
    when 'bee' then 'Completa tareas con eficiencia y disciplina. Sigue procesos establecidos.'
    when 'parrot' then 'Comunica con energía y entusiasmo. Construye relaciones fácilmente.'
    when 'elephant' then 'Piensa a largo plazo y planifica sabiamente. Gran memoria y visión.'
    when 'wolf' then 'Jugador de equipo con inteligencia táctica. Se adapta a las dinámicas del grupo.'
    when 'chameleon' then 'Se adapta rápidamente a contextos diferentes. Versátil e intuitivo.'
    when 'horse' then 'Impulsa al equipo con tenacidad y confiabilidad. Productivo y constante.'
  end,
  case label
    when 'lion' then 'Puede ser demasiado directivo; riesgo de microgestión'
    when 'owl' then 'Toma de decisiones lenta; riesgo de parálisis por análisis'
    when 'dolphin' then 'Evita conflictos necesarios; puede ser demasiado complaciente'
    when 'fox' then 'Puede parecer oportunista; riesgo de manipulación percibida'
    when 'bear' then 'Resistente al cambio; puede ser demasiado conservador'
    when 'cat' then 'Puede aislarse; dificultades de colaboración'
    when 'bee' then 'Rigidez en procesos; poca flexibilidad creativa'
    when 'parrot' then 'Puede hablar demasiado; riesgo de superficialidad'
    when 'elephant' then 'Ejecución lenta; puede ser demasiado teórico'
    when 'wolf' then 'Demasiado dependiente del grupo; poca iniciativa individual'
    when 'chameleon' then 'Puede carecer de identidad clara; percibido como poco auténtico'
    when 'horse' then 'Terquedad; dificultad para adaptarse a nuevas estrategias'
  end,
  case label
    when 'lion' then 'CEO, Director, Gerente Estratégico, Emprendedor'
    when 'owl' then 'Analista de Datos, Investigador, Controlador, Ingeniero'
    when 'dolphin' then 'RRHH, Mediador, Coach de Equipo, Éxito del Cliente'
    when 'fox' then 'Ventas, Marketing, Negociador, Desarrollo de Negocios'
    when 'bear' then 'Gerente de Proyecto, Operaciones, Control de Calidad, Admin'
    when 'cat' then 'Desarrollador, Diseñador, Consultor, I+D'
    when 'bee' then 'Especialista, Técnico, Operador, Administrativo'
    when 'parrot' then 'PR, Gerente de Redes Sociales, Speaker, Gerente de Comunidad'
    when 'elephant' then 'Estratega, Asesor, Consultor de Dirección, Mentor'
    when 'wolf' then 'Miembro de Equipo Ágil, Scrum Master, Coordinador, Facilitador'
    when 'chameleon' then 'Gerente de Cuenta, Consultor Multisectorial, Generalista'
    when 'horse' then 'Operativo Senior, Líder de Equipo Operativo, Gerente de Producción'
  end
from public.ximatars
on conflict (ximatar_id, lang) do nothing;

-- 8. ENABLE REALTIME

alter publication supabase_realtime add table public.ximatars;
alter publication supabase_realtime add table public.ximatar_translations;
alter publication supabase_realtime add table public.assessment_results;
alter publication supabase_realtime add table public.pillar_scores;