/**
 * La Salita — what is recorded, and what is not.
 *
 * Recorded: choices and persistence. Whether a level was solved, how many
 * times it was attempted, what the person chose after failing (try again,
 * try another board, stop), how long they stayed on the hard level, and
 * whether they came back on another day.
 *
 * Not recorded as a merit: speed, taps, precision. A fast solver and a slow
 * one who keeps going get the same read on Drive; only the second one shows
 * it on the near-impossible level.
 */

export type Outcome = 'solved' | 'timeout' | 'stopped';
export type Choice = 'retry' | 'change' | 'stop';

export interface Attempt { level: number; seed: number; outcome: Outcome; seconds: number; at: string }
export interface AfterFailure { level: number; choice: Choice; at: string }

export interface SalitaSignals {
  version: 1;
  startedAt: string;
  /** Distinct calendar days the trial was opened on. */
  days: string[];
  attempts: Attempt[];
  choices: AfterFailure[];
  /** Highest level reached (1..4) and whether level 4 was ever solved. */
  reached: number;
  finished: boolean;
}

const KEY = 'xima.salita.v1';
const today = () => new Date().toISOString().slice(0, 10);

export function loadSignals(): SalitaSignals | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SalitaSignals) : null;
  } catch {
    return null;
  }
}

export function saveSignals(s: SalitaSignals): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

/** Opens (or reopens) the trial, counting a return when it is a new day. */
export function openSignals(): SalitaSignals {
  const existing = loadSignals();
  const d = today();
  if (existing) {
    if (!existing.days.includes(d)) existing.days = [...existing.days, d];
    saveSignals(existing);
    return existing;
  }
  const fresh: SalitaSignals = { version: 1, startedAt: new Date().toISOString(), days: [d], attempts: [], choices: [], reached: 1, finished: false };
  saveSignals(fresh);
  return fresh;
}

export function recordAttempt(s: SalitaSignals, a: Omit<Attempt, 'at'>): SalitaSignals {
  const next = { ...s, attempts: [...s.attempts, { ...a, at: new Date().toISOString() }], reached: Math.max(s.reached, a.level) };
  if (a.level === 4 && a.outcome === 'solved') next.finished = true;
  saveSignals(next);
  return next;
}

export function recordChoice(s: SalitaSignals, c: Omit<AfterFailure, 'at'>): SalitaSignals {
  const next = { ...s, choices: [...s.choices, { ...c, at: new Date().toISOString() }] };
  saveSignals(next);
  return next;
}

export interface SalitaSummary {
  hardAttempts: number;     // attempts on levels 3 and 4
  retries: number;          // chose "try again" after a failure
  changes: number;          // chose "another board" after a failure
  stoppedEarly: boolean;    // stopped before reaching level 3
  hardSeconds: number;      // time spent on level 4, all attempts
  returns: number;          // days beyond the first
  reached: number;
  finished: boolean;
  /** 0–10: evidence of Drive from behaviour. Blended later with the questionnaire; never shown as a grade. */
  evidence: number;
}

export function summarise(s: SalitaSignals | null): SalitaSummary | null {
  if (!s || s.attempts.length === 0) return null;
  const hard = s.attempts.filter((a) => a.level >= 3);
  const hardSeconds = s.attempts.filter((a) => a.level === 4).reduce((n, a) => n + a.seconds, 0);
  const retries = s.choices.filter((c) => c.choice === 'retry').length;
  const changes = s.choices.filter((c) => c.choice === 'change').length;
  const returns = Math.max(0, s.days.length - 1);
  const stoppedEarly = s.reached < 3;
  // Persistence on the near-impossible level is the strongest signal; a
  // return on another day the second; retries and changes after a failure
  // the third. Capped so nobody can grind the number.
  const evidence = Math.min(10, Math.round((
    Math.min(4, (hardSeconds / 120) * 4)
    + Math.min(3, retries * 1.5)
    + Math.min(1.5, changes * 0.75)
    + Math.min(1.5, returns * 1.5)
    + (s.finished ? 1 : 0)
  ) * 10) / 10);
  return { hardAttempts: hard.length, retries, changes, stoppedEarly, hardSeconds, returns, reached: s.reached, finished: s.finished, evidence };
}
