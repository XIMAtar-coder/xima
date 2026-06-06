// L2 conversation runtime types — mirror server contract in supabase/functions/l2-converse.
export type TranscriptEntry = {
  role: 'counterpart' | 'candidate';
  text: string;
  turn: number; // -1 = opener, 0..6 = paired candidate/counterpart turn index
  curveball?: boolean;
  degraded?: boolean;
};

export type L2DraftPayload = {
  format: 'l2_conversation';
  opening_line: string;
  transcript: TranscriptEntry[];
  curveball_fired: boolean;
  last_turn_index: number;
  done?: boolean;
  reason?: 'concludi_signal' | 'max_turns';
};

export type L2Counterpart = {
  name: string;
  role: string;
  opening_line?: string;
  stance?: string;
};

export type L2SimulationConfig = {
  counterpart: L2Counterpart;
  scenario: string; // full scene-set string (no .framing subfield)
  curveball?: { trigger_turn?: number; event?: string };
};

export type L2ChallengeConfig = {
  experience?: string;
  l2_simulation?: L2SimulationConfig;
  [k: string]: any;
};

export const MAX_CANDIDATE_TURNS = 7;

export const EMPTY_L2_PAYLOAD: L2DraftPayload = {
  format: 'l2_conversation',
  opening_line: '',
  transcript: [],
  curveball_fired: false,
  last_turn_index: -1,
};
