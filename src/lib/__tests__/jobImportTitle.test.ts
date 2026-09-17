import { describe, it, expect } from 'vitest';
import { fallbackTitleFromText, looksLikeRawPdf } from '../../../supabase/functions/import-job-post-pdf/normalizeJobPostText';

describe('job post import title fallback', () => {
  it('keeps a "Role - Area (City)" first line as the title', () => {
    expect(fallbackTitleFromText('Lead Engineer - Automotive Consultancy (Bologna) Cerchiamo un Lead Engineer con esperienza'))
      .toBe('Lead Engineer - Automotive Consultancy (Bologna)');
  });
  it('uses the first sentence when there is no parenthesis', () => {
    expect(fallbackTitleFromText('• PROCESS ENGINEER Company. Location: Manufacturing'))
      .toBe('PROCESS ENGINEER Company');
  });
  it('cuts long lines on a word boundary', () => {
    const t = fallbackTitleFromText('word '.repeat(40)) || '';
    expect(t.length).toBeLessThanOrEqual(90);
    expect(t.endsWith(' ')).toBe(false);
  });
  it('returns null for empty text', () => {
    expect(fallbackTitleFromText('   \n  ')).toBeNull();
  });
});

describe('raw PDF detection', () => {
  it('flags PDF internals', () => {
    expect(looksLikeRawPdf('% ReportLab Generated PDF document http://www.reportlab.com\n/F1 2 0 R /F2 3 0 R')).toBe(true);
    expect(looksLikeRawPdf('%PDF-1.4\n1 0 obj')).toBe(true);
  });
  it('accepts normal job text', () => {
    expect(looksLikeRawPdf('Software Engineer\nWe are hiring a software engineer in Milan.')).toBe(false);
  });
});
