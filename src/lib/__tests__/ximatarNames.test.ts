import { describe, it, expect } from 'vitest';
import en from '@/i18n/locales/en.json';
import itLocale from '@/i18n/locales/it.json';
import es from '@/i18n/locales/es.json';
import { XIMATAR_PROFILES } from '@/lib/ximatarTaxonomy';

/**
 * The results page showed the English label ("Horse") in every language
 * because no `ximatar.<label>.name` key existed. Every archetype the
 * taxonomy can return must have a name in each locale.
 */
const locales = { en, it: itLocale, es } as unknown as Record<string, { ximatar?: Record<string, { name?: string }> }>;

describe('archetype names', () => {
  const labels = Object.keys(XIMATAR_PROFILES);

  it('covers every archetype in every language', () => {
    const missing: string[] = [];
    for (const [lang, data] of Object.entries(locales)) {
      for (const label of labels) {
        if (!data.ximatar?.[label]?.name) missing.push(`${lang}.${label}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('is translated, not the English label repeated', () => {
    expect(locales.it.ximatar?.horse?.name).toBe('Cavallo');
    expect(locales.es.ximatar?.owl?.name).toBe('Búho');
    expect(locales.en.ximatar?.horse?.name).toBe('Horse');
  });
});
