/**
 * One way to write an amount of money across XIMA.
 *
 * The same salary used to appear as "60,000", "60.000 USD" and "€60.000"
 * on three screens of one flow, with the euro sign even when the goal was
 * in dollars. Amounts follow the language of the page for separators;
 * euros carry the symbol, every other currency its code, always after
 * the number: "60.000 €", "60.000–75.000 USD".
 */
const LOCALE: Record<string, string> = { it: 'it-IT', en: 'en-GB', es: 'es-ES' };

const localeTag = (lang?: string | null) => LOCALE[(lang || 'it').slice(0, 2).toLowerCase()] || 'it-IT';

const unit = (currency?: string | null) => {
  const code = (currency || 'EUR').toUpperCase();
  return code === 'EUR' ? '€' : code;
};

export const formatAmount = (amount: number, lang?: string | null) =>
  new Intl.NumberFormat(localeTag(lang), { maximumFractionDigits: 0, useGrouping: true }).format(Math.round(amount));

export const formatMoney = (amount: number, currency?: string | null, lang?: string | null) =>
  `${formatAmount(amount, lang)} ${unit(currency)}`;

/** "60.000–75.000 €"; a single figure when the two ends coincide or one is missing. */
export const formatMoneyRange = (min?: number | null, max?: number | null, currency?: string | null, lang?: string | null) => {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return null;
  if (!lo || !hi || lo === hi) return formatMoney(lo || hi, currency, lang);
  return `${formatAmount(lo, lang)}–${formatAmount(hi, lang)} ${unit(currency)}`;
};
