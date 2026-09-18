/**
 * Helpers for the hiring-goal creation wizard (src/pages/business/HiringGoalCreate.tsx):
 * RAL derivation from the single salary input, company-profile location
 * prefill, and a per-user localStorage draft.
 */

/**
 * RAL from the single salary input. A monthly figure is multiplied by the
 * number of monthly payments, which depends on the contract (13 or 14 in
 * Italy, see defaultPayMonths in ccnl.ts) and can be overridden.
 */
export function deriveRal(
  salaryMin: number,
  salaryMax: number,
  period: string,
  payMonths = 13,
): { ral_min: number; ral_max: number } {
  const factor = period === 'monthly' ? payMonths : 1;
  const toRal = (v: number) => (Number.isFinite(v) && v > 0 ? Math.round(v * factor) : 0);
  return { ral_min: toRal(salaryMin), ral_max: toRal(salaryMax) };
}

/** Countries the wizard's select offers, keyed by the stored code. */
export const GOAL_COUNTRY_CODES = ['IT', 'FR', 'DE', 'ES', 'UK', 'US'] as const;

const COUNTRY_ALIASES: Record<string, (typeof GOAL_COUNTRY_CODES)[number]> = {
  it: 'IT', ita: 'IT', italy: 'IT', italia: 'IT', italie: 'IT', italien: 'IT',
  fr: 'FR', fra: 'FR', france: 'FR', francia: 'FR', frankreich: 'FR',
  de: 'DE', deu: 'DE', ger: 'DE', germany: 'DE', germania: 'DE', deutschland: 'DE', alemania: 'DE', allemagne: 'DE',
  es: 'ES', esp: 'ES', spain: 'ES', spagna: 'ES', espana: 'ES', 'españa': 'ES', espagne: 'ES', spanien: 'ES',
  uk: 'UK', gb: 'UK', gbr: 'UK', 'united kingdom': 'UK', 'great britain': 'UK', england: 'UK', 'regno unito': 'UK', 'reino unido': 'UK',
  us: 'US', usa: 'US', 'united states': 'US', 'united states of america': 'US', 'stati uniti': 'US', 'estados unidos': 'US',
};

export function countryCodeFromProfile(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.trim().toLowerCase().replace(/\./g, '');
  return COUNTRY_ALIASES[key] ?? '';
}

// ── Draft persistence ──

const DRAFT_VERSION = 1;
const draftKey = (userId: string) => `xima:hiring-goal-draft:v${DRAFT_VERSION}:${userId}`;

export interface StoredGoalDraft<T> {
  version: number;
  savedAt: string;
  step: number;
  formData: T;
}

export function loadGoalDraft<T>(userId: string): StoredGoalDraft<T> | null {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGoalDraft<T>;
    if (parsed?.version !== DRAFT_VERSION || !parsed.formData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGoalDraft<T>(userId: string, step: number, formData: T): void {
  if (!userId) return;
  try {
    const payload: StoredGoalDraft<T> = {
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      step,
      formData,
    };
    window.localStorage.setItem(draftKey(userId), JSON.stringify(payload));
  } catch {
    // Storage full or blocked (private mode): the wizard still works, just without a draft.
  }
}

export function clearGoalDraft(userId: string): void {
  if (!userId) return;
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // ignore
  }
}
