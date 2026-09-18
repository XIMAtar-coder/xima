/**
 * CCNL (Contratto Collettivo Nazionale di Lavoro) options for Italian pay transparency.
 * Surfaced in the hiring-goal form; mandatory disclosure under D.Lgs. 96/2026
 * (recepimento Direttiva UE 2023/970), effective 7 June 2026.
 *
 * Guardrail: candidates must NEVER be asked their current/previous salary — the
 * decree forbids it. The candidate's own salary EXPECTATION is allowed (private).
 */
/**
 * Monthly payments per year set by each CCNL: 12 + tredicesima, plus the
 * quattordicesima where the contract provides it. Checked 2026-09-18 against
 * the contract summaries (commercio, turismo, studi professionali, logistica
 * and ANIA pay the 14th; metalmeccanici, chimico-farmaceutico, ABI, TLC,
 * AIOP, edilizia and dirigenti do not). null = unknown, the user chooses.
 * Company-level agreements can add a 14th anywhere: the wizard lets the
 * business override.
 */
export const CCNL_OPTIONS: { value: string; label: string; months: 13 | 14 | null }[] = [
  { value: 'commercio_terziario', label: 'Commercio e Terziario', months: 14 },
  { value: 'dirigenti_industria', label: 'Dirigenti Industria', months: 13 },
  { value: 'metalmeccanico_industria', label: 'Metalmeccanico Industria', months: 13 },
  { value: 'metalmeccanico_artigianato', label: 'Metalmeccanico Artigianato', months: 13 },
  { value: 'edilizia_industria', label: 'Edilizia Industria', months: 13 },
  { value: 'studi_professionali', label: 'Studi Professionali', months: 14 },
  { value: 'turismo_pubblici_esercizi', label: 'Pubblici Esercizi / Turismo', months: 14 },
  { value: 'trasporti_logistica', label: 'Trasporti e Logistica', months: 14 },
  { value: 'chimico_farmaceutico', label: 'Chimico-Farmaceutico', months: 13 },
  { value: 'credito_abi', label: 'Credito (ABI)', months: 13 },
  { value: 'assicurazioni_ania', label: 'Assicurazioni (ANIA)', months: 14 },
  { value: 'telecomunicazioni', label: 'Telecomunicazioni', months: 13 },
  { value: 'sanita_privata', label: 'Sanità Privata', months: 13 },
  { value: 'altro', label: 'Altro', months: null },
];

export const CCNL_HELPER_IT =
  'Obbligatorio dal 7 giugno 2026 (D.Lgs. 96/2026 — Direttiva UE 2023/970 sulla trasparenza retributiva).';

export function labelForCcnl(value: string | null | undefined): string {
  if (!value) return '—';
  return CCNL_OPTIONS.find((o) => o.value === value)?.label || value;
}

/**
 * Default monthly payments per year for a goal: the CCNL in Italy, the two
 * statutory extra payments in Spain (Estatuto de los Trabajadores art. 31),
 * 12 elsewhere (a 13th month in France or Germany depends on the collective
 * or individual contract).
 */
export function defaultPayMonths(country: string | null | undefined, ccnl: string | null | undefined): number {
  const c = (country || '').toUpperCase();
  if (c === 'IT' || c === '') {
    const m = CCNL_OPTIONS.find((o) => o.value === ccnl)?.months;
    return m ?? 13;
  }
  if (c === 'ES') return 14;
  return 12;
}
