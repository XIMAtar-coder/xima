/**
 * Mini-games along the questionnaire — what is kept.
 *
 * Three short games (rhythm, odd-one-out, balance) sit between the scenarios
 * to get people used to the interactive format before La Salita. They are
 * explicitly "not part of the result". The only things recorded are the
 * choice after a miss (try again / move on / skip the game entirely) and
 * how many rounds were attempted — never accuracy or speed.
 */

export type MiniGameId = 'ritmo' | 'intruso' | 'bilancia';
export type MiniChoice = 'retry' | 'continue' | 'skip';

export interface MiniGameSignal {
  game: MiniGameId;
  roundsAttempted: number;
  misses: number;
  /** What the person chose the first time a round went wrong (null: never missed). */
  afterMiss: MiniChoice | null;
  skipped: boolean;
  at: string;
}

const KEY = 'xima.minigames.v1';

export function loadMiniSignals(): Record<MiniGameId, MiniGameSignal | undefined> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {} as Record<MiniGameId, MiniGameSignal | undefined>;
  }
}

export function saveMiniSignal(signal: MiniGameSignal): void {
  try {
    const all = loadMiniSignals();
    all[signal.game] = signal;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}

export function clearMiniSignals(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Small deterministic random for boards that must be reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
