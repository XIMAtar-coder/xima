import { describe, it, expect } from 'vitest';
import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import esTranslations from '@/i18n/locales/es.json';
import { exampleMatchesOptions } from '../exampleRelevance';

type Locale = {
  assessmentSets: Record<string, { questions: Record<string, { options?: string[] }> } | string>;
  assessmentHelp: Record<string, { examples: Record<string, { body: string }> }>;
};

const locales = { en: enTranslations, it: itTranslations, es: esTranslations } as unknown as Record<string, Locale>;

describe('rewritten help examples (assessmentHelp)', () => {
  it('describe the options actually shown, for every question and language', () => {
    const stale: string[] = [];
    for (const [lang, loc] of Object.entries(locales)) {
      for (const [set, value] of Object.entries(loc.assessmentSets)) {
        if (typeof value !== 'object') continue;
        for (const [q, question] of Object.entries(value.questions)) {
          const body = loc.assessmentHelp[set]?.examples?.[q]?.body;
          if (!body) { stale.push(`${lang}.${set}.${q}: missing`); continue; }
          if (!exampleMatchesOptions(body, question.options)) stale.push(`${lang}.${set}.${q}`);
        }
      }
    }
    expect(stale).toEqual([]);
  });

  it('carry no links', () => {
    for (const loc of Object.values(locales)) {
      expect(JSON.stringify(loc.assessmentHelp)).not.toMatch(/https?:/);
    }
  });
});

describe('exampleMatchesOptions', () => {
  const options = ['Break it into parts', 'Look for patterns', 'Search software tools', 'Consult others'];

  it('reads the plain **A.** markers', () => {
    const body = '**A.** You break the work into parts.\n\n**B.** You look for patterns.\n\n**C.** You search software.\n\n**D.** You consult colleagues.';
    expect(exampleMatchesOptions(body, options)).toBe(true);
  });

  it('rejects an example written for other options', () => {
    const body = '**Option A (Challenging goals):** x\n**Option B (Positive impact):** x\n**Option C (Learning):** x\n**Option D (Recognition):** x';
    expect(exampleMatchesOptions(body, options)).toBe(false);
  });

  it('treats examples without option markers, and open questions, as fine', () => {
    expect(exampleMatchesOptions('Use the STAR method.', undefined)).toBe(true);
    expect(exampleMatchesOptions('Just think about it.', ['a', 'b', 'c', 'd'])).toBe(true);
  });

  it('reads unbracketed markers from the text that follows', () => {
    const body = '**Opción A:** Dividir en partes\n**Opción B:** Buscar patrones\n**Opción C:** Herramientas software\n**Opción D:** Consultar otros';
    const opts = ['Dividirlo en partes', 'Buscar patrones', 'Buscar herramientas', 'Consultar con otros'];
    expect(exampleMatchesOptions(body, opts)).toBe(true);
    expect(exampleMatchesOptions(body, ['x', 'y', 'z', 'w'])).toBe(false);
  });
});
