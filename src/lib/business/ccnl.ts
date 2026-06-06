/**
 * CCNL (Contratto Collettivo Nazionale di Lavoro) options for Italian pay transparency.
 * Surfaced in the hiring-goal form; mandatory disclosure under D.Lgs. 96/2026
 * (recepimento Direttiva UE 2023/970), effective 7 June 2026.
 *
 * Guardrail: candidates must NEVER be asked their current/previous salary — the
 * decree forbids it. The candidate's own salary EXPECTATION is allowed (private).
 */
export const CCNL_OPTIONS: { value: string; label: string }[] = [
  { value: 'commercio_terziario', label: 'Commercio e Terziario' },
  { value: 'dirigenti_industria', label: 'Dirigenti Industria' },
  { value: 'metalmeccanico_industria', label: 'Metalmeccanico Industria' },
  { value: 'metalmeccanico_artigianato', label: 'Metalmeccanico Artigianato' },
  { value: 'edilizia_industria', label: 'Edilizia Industria' },
  { value: 'studi_professionali', label: 'Studi Professionali' },
  { value: 'turismo_pubblici_esercizi', label: 'Pubblici Esercizi / Turismo' },
  { value: 'trasporti_logistica', label: 'Trasporti e Logistica' },
  { value: 'chimico_farmaceutico', label: 'Chimico-Farmaceutico' },
  { value: 'credito_abi', label: 'Credito (ABI)' },
  { value: 'assicurazioni_ania', label: 'Assicurazioni (ANIA)' },
  { value: 'telecomunicazioni', label: 'Telecomunicazioni' },
  { value: 'sanita_privata', label: 'Sanità Privata' },
  { value: 'altro', label: 'Altro' },
];

export const CCNL_HELPER_IT =
  'Obbligatorio dal 7 giugno 2026 (D.Lgs. 96/2026 — Direttiva UE 2023/970 sulla trasparenza retributiva).';

export function labelForCcnl(value: string | null | undefined): string {
  if (!value) return '—';
  return CCNL_OPTIONS.find((o) => o.value === value)?.label || value;
}
