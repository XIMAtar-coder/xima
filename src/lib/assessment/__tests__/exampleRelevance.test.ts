import { describe, it, expect } from 'vitest';
import enTranslations from '@/i18n/locales/en.json';
import itTranslations from '@/i18n/locales/it.json';
import { exampleMatchesOptions } from '../exampleRelevance';

type Sets = Record<string, {
  questions: Record<string, { options?: string[] }>;
  examples?: Record<string, { body?: string }>;
}>;

const en = (enTranslations as unknown as { assessmentSets: Sets }).assessmentSets;
const it_ = (itTranslations as unknown as { assessmentSets: Sets }).assessmentSets;

const check = (sets: Sets, set: string, q: string) =>
  exampleMatchesOptions(sets[set].examples?.[q]?.body ?? '', sets[set].questions[q].options);

describe('exampleMatchesOptions', () => {
  it('accepts an example that walks through the same options', () => {
    expect(check(en, 'science_tech', 'q1')).toBe(true);
    expect(check(en, 'service_ops', 'q1')).toBe(true);
    expect(check(it_, 'science_tech', 'q1')).toBe(true);
  });

  it('rejects an example written for options the question no longer has', () => {
    // q5 asks how to fix a debugging weakness; its example describes motivation.
    expect(check(en, 'science_tech', 'q5')).toBe(false);
    expect(check(it_, 'science_tech', 'q5')).toBe(false);
  });

  it('rejects an example where only one option was changed', () => {
    // Option D became "Map dependencies and failure modes"; example still says "Case studies".
    expect(check(en, 'science_tech', 'q21')).toBe(false);
  });

  it('treats examples without option markers, and open questions, as fine', () => {
    expect(exampleMatchesOptions('Use the STAR method.', undefined)).toBe(true);
    expect(exampleMatchesOptions('Just think about it.', ['a', 'b', 'c', 'd'])).toBe(true);
  });

  it('reads unbracketed markers from the text that follows', () => {
    const body = '**Opción A:** Dividir en partes\n**Opción B:** Buscar patrones\n**Opción C:** Herramientas software\n**Opción D:** Consultar otros';
    const options = ['Dividirlo en partes', 'Buscar patrones', 'Buscar herramientas', 'Consultar con otros'];
    expect(exampleMatchesOptions(body, options)).toBe(true);
    expect(exampleMatchesOptions(body, ['x', 'y', 'z', 'w'])).toBe(false);
  });
});
