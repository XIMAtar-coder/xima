export type InstinctOption = {
  label: string;
  facet: string;
};

export type InstinctCard = {
  id: string;
  prompt: string;
  a: InstinctOption;
  b: InstinctOption;
};

export type DayItem = {
  id: string;
  source: string;
  body: string;
};

export type DayGesture = {
  id: string;
  emoji: string;
  label: string;
};

export type IntroContext = {
  /** Sector + 1-line descriptor. NEVER the company name. */
  company_descriptor?: string;
  role_title?: string;
  role_summary?: string;
  compensation?: {
    ral_min?: number | null;
    ral_max?: number | null;
    ccnl?: string | null;
    currency?: string;
  };
  /** Qualitative only — no numbers, no level promises. */
  growth_line?: string;
};

export type MindsetConfig = {
  experience: 'mindset';
  guide?: {
    name?: string;
    intro?: string;
    debrief_focus?: string;
    resolve_line?: string;
  };
  instinct_cards?: InstinctCard[];
  day?: {
    clock?: string;
    items?: DayItem[];
    gestures?: DayGesture[];
  };
  intro_context?: IntroContext;
};

export type InstinctChoice = { card_id: string; choice: 'a' | 'b'; facet: string };
export type DayLogEntry = { item_id: string; gesture: string };
export type DebriefEntry = { q: string; a: string };

export type MindsetPayload = {
  format: 'mindset';
  instinct_choices: InstinctChoice[];
  day_log: DayLogEntry[];
  debrief: DebriefEntry[];
  lit_facets: string[];
};

export const EMPTY_MINDSET_PAYLOAD: MindsetPayload = {
  format: 'mindset',
  instinct_choices: [],
  day_log: [],
  debrief: [],
  lit_facets: [],
};
