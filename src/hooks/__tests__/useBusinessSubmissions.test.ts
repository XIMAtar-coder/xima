import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { deriveEvaluationStatus, sortSubmissionRows } from '../useBusinessSubmissions';

describe('deriveEvaluationStatus', () => {
  it('is invited when there is no submission yet', () => {
    expect(deriveEvaluationStatus({ invitationStatus: 'invited', submissionStatus: null, reviewDecision: null })).toBe('invited');
  });

  it('is in progress once accepted or drafted', () => {
    expect(deriveEvaluationStatus({ invitationStatus: 'accepted', submissionStatus: null, reviewDecision: null })).toBe('in_progress');
    expect(deriveEvaluationStatus({ invitationStatus: 'invited', submissionStatus: 'draft', reviewDecision: null })).toBe('in_progress');
  });

  it('is submitted until a review decision exists, then reviewed', () => {
    expect(deriveEvaluationStatus({ invitationStatus: 'accepted', submissionStatus: 'submitted', reviewDecision: null })).toBe('submitted');
    expect(deriveEvaluationStatus({ invitationStatus: 'accepted', submissionStatus: 'submitted', reviewDecision: 'pass' })).toBe('reviewed');
  });

  it('keeps declined and expired invitations distinct', () => {
    expect(deriveEvaluationStatus({ invitationStatus: 'declined', submissionStatus: null, reviewDecision: null })).toBe('declined');
    expect(deriveEvaluationStatus({ invitationStatus: 'expired', submissionStatus: 'draft', reviewDecision: null })).toBe('expired');
  });
});

describe('sortSubmissionRows', () => {
  it('puts responses awaiting review first, newest first', () => {
    const rows = sortSubmissionRows([
      { evaluationStatus: 'invited' as const, submittedAt: null, invitedAt: '2026-09-10T00:00:00Z' },
      { evaluationStatus: 'submitted' as const, submittedAt: '2026-09-01T00:00:00Z', invitedAt: '2026-08-01T00:00:00Z' },
      { evaluationStatus: 'submitted' as const, submittedAt: '2026-09-05T00:00:00Z', invitedAt: '2026-08-01T00:00:00Z' },
    ]);
    expect(rows.map((r) => r.submittedAt)).toEqual(['2026-09-05T00:00:00Z', '2026-09-01T00:00:00Z', null]);
  });
});
