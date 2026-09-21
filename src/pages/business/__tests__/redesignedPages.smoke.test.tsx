/**
 * Smoke tests for the redesigned company pages (Challenges, Evaluations, Jobs,
 * Messages, Settings, hiring-goal wizard): they render in their empty and
 * populated states without runtime errors, and the key controls are present.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// `t` must be referentially stable like the real one: Jobs.tsx keys its fetch
// callback on it, so a fresh function per render would refetch forever.
vi.mock('react-i18next', () => {
  const t = (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key);
  const i18n = { language: 'en', changeLanguage: vi.fn() };
  return { useTranslation: () => ({ t, i18n }) };
});

vi.mock('@/components/business/BusinessLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'biz-1', name: 'Acme', email: 'hr@acme.test' }, isAuthenticated: true, signOut: vi.fn() }),
}));
vi.mock('@/hooks/useBusinessRole', () => ({ useBusinessRole: () => ({ isBusiness: true, loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

// Supabase: every chain resolves with a per-table fixture.
const tableResults: Record<string, unknown> = {};
const chain = (table: string) => {
  const c: Record<string, unknown> = {};
  const self = () => c;
  ['select', 'eq', 'neq', 'in', 'not', 'order', 'limit', 'update', 'insert', 'maybeSingle', 'single'].forEach((m) => { c[m] = self; });
  c.then = (resolve: (v: unknown) => void) => resolve({ data: tableResults[table] ?? [], error: null });
  return c;
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => chain(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'biz-1' } } }) },
    functions: { invoke: vi.fn() },
  },
}));

// Heavy children are stubbed; only the pages under test are real.
vi.mock('@/components/business/ChallengeContextSelector', () => ({ default: () => null }));
vi.mock('@/components/business/SubmissionDetailDrawer', () => ({ SubmissionDetailDrawer: () => <div data-testid="submission-drawer" /> }));
vi.mock('@/components/business/PdfImportModal', () => ({ default: () => null }));
vi.mock('@/components/business/JobPostDetailDrawer', () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="job-drawer" /> : null) }));
vi.mock('@/components/business/PipelineChatList', () => ({ PipelineChatList: () => <div data-testid="thread-list" /> }));
vi.mock('@/components/business/PipelineChatView', () => ({ PipelineChatView: () => <div data-testid="thread-view" /> }));
vi.mock('@/components/business/SuggestFieldButton', () => ({ default: () => <button type="button">suggest</button> }));
vi.mock('@/components/business/LogoUploader', () => ({ LogoUploader: () => <div data-testid="logo-uploader" /> }));
vi.mock('@/components/settings/ProfilingOptOutSection', () => ({ ProfilingOptOutSection: () => <div data-testid="profiling" /> }));
vi.mock('@/components/settings/AccountDeletionSection', () => ({ AccountDeletionSection: () => <div data-testid="deletion" /> }));
vi.mock('@/hooks/useCompanyLegal', () => ({ useCompanyLegal: () => ({ companyLegal: null, isLoading: false, upsert: vi.fn(), isUpserting: false }) }));
vi.mock('@/hooks/useBusinessEntitlements', () => ({
  useBusinessEntitlements: () => ({
    entitlements: { features: { mentor_portal: true }, seatsUsed: 1, maxSeats: 3, contractStart: null, contractEnd: null },
    loading: false, planTier: 'starter', isFreePlan: true,
  }),
}));
vi.mock('@/hooks/useBusinessProfile', () => ({
  useBusinessProfile: () => ({
    businessProfile: { company_name: 'Acme', manual_industry: 'tech', snapshot_industry: null, manual_hq_city: 'Milano', snapshot_hq_city: null, manual_hq_country: 'Italy', snapshot_hq_country: null, website: '', hr_contact_email: '' },
    isLoading: false, invalidate: vi.fn(), updateOptimistically: vi.fn(),
  }),
}));

const threads = { data: [] as unknown[], isLoading: false };
vi.mock('@/hooks/usePipelineChatThreads', () => ({ usePipelineChatThreads: () => threads }));

const challengeRows = { data: [] as unknown[], isLoading: false, refetch: vi.fn() };
vi.mock('@/lib/data/useSupabaseQuery', () => ({ useSupabaseQuery: () => challengeRows }));
vi.mock('@/hooks/useChallengeResponsesData', () => ({
  useChallengeStatsMap: () => ({ statsMap: new Map([['c1', { invited: 2, responses: 1 }]]), loading: false, debug: {} }),
}));

const submissions = { rows: [] as unknown[], loading: false, error: null, refetch: vi.fn(), updateRowDecision: vi.fn() };
vi.mock('@/hooks/useBusinessSubmissions', () => ({ useBusinessSubmissions: () => submissions }));

import Challenges from '../Challenges';
import Evaluations from '../Evaluations';
import Jobs from '../Jobs';
import PipelineChat from '../PipelineChat';
import Settings from '../Settings';
import HiringGoalCreate from '../HiringGoalCreate';

const wrap = (ui: React.ReactNode, path = '/') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/business/hiring-goals/new" element={ui} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const submissionRow = (over: Record<string, unknown>) => ({
  invitationId: 'inv-1', candidateProfileId: 'p1', candidateName: 'Candidate #A254 — Owl', anonymousLabel: 'A254',
  ximatarArchetype: 'owl', ximatarLevel: 1, invitationStatus: 'sent', invitedAt: '2026-09-01T00:00:00Z',
  submissionId: null, submissionStatus: null, submittedAt: null, draftPayload: null, submittedPayload: null,
  signalsPayload: null, signalsVersion: null, reviewDecision: null, reviewFollowupQuestion: null,
  challengeId: 'c1', challengeTitle: 'XIMA Core — Software engineer', challengeDescription: null,
  challengeSuccessCriteria: [], challengeRubric: null, hiringGoalId: 'g1', roleTitle: 'Software engineer',
  evaluationStatus: 'invited', ...over,
});

beforeEach(() => {
  challengeRows.data = [];
  submissions.rows = [];
  threads.data = [];
  Object.keys(tableResults).forEach((k) => delete tableResults[k]);
  window.localStorage.clear();
});

describe('Challenges (registro operativo)', () => {
  it('renders the empty state as a row with the create action', () => {
    wrap(<Challenges />);
    expect(screen.getByRole('heading', { name: 'businessPortal.challenges_page_title' })).toBeInTheDocument();
    expect(screen.getByText('challenges.no_challenges')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /challenges.create_first/ })).toBeInTheDocument();
  });

  it('lists challenges as rows with counters, tabs and actions', () => {
    challengeRows.data = [
      { id: 'c1', title: 'XIMA Core — Software engineer', description: null, status: 'active', hiring_goal_id: 'g1', role_title: 'Software engineer', deadline: null, end_at: null, updated_at: '2026-09-17T00:00:00Z', created_at: '2026-09-17T00:00:00Z' },
      { id: 'c2', title: 'Old one', description: null, status: 'archived', hiring_goal_id: null, role_title: null, deadline: '2026-10-01T00:00:00Z', end_at: null, updated_at: '2026-09-10T00:00:00Z', created_at: '2026-09-10T00:00:00Z' },
    ];
    wrap(<Challenges />);
    expect(screen.getByRole('button', { name: 'XIMA Core — Software engineer' })).toBeInTheDocument();
    expect(screen.getAllByText('businessPortal.challenge_view_responses').length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'challenges.duplicate' }).length).toBe(2);
    // Archived rows offer "activate", active rows offer "archive".
    expect(screen.getAllByRole('button', { name: 'challenges.archive' }).length).toBe(1);
    expect(screen.getAllByRole('button', { name: 'challenges.activate' }).length).toBe(1);
    // Tab filter narrows the register.
    fireEvent.click(screen.getByRole('button', { name: /businessPortal.challenges_filter_archived/ }));
    expect(screen.queryByRole('button', { name: 'XIMA Core — Software engineer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Old one' })).toBeInTheDocument();
  });
});

describe('Evaluations (lettura affiancata)', () => {
  it('renders the "every evaluation starts with a response" empty state', () => {
    wrap(<Evaluations />);
    expect(screen.getByText('businessPortal.evaluations_waiting_title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'businessPortal.evaluations_empty_cta' })).toBeInTheDocument();
  });

  it('selects the first candidate, filters by status and opens the drawer for a submitted response', () => {
    submissions.rows = [
      submissionRow({ invitationId: 'inv-1' }),
      submissionRow({ invitationId: 'inv-2', candidateName: 'Candidate #B771 — Fox', ximatarArchetype: 'fox', submissionStatus: 'submitted', submittedAt: '2026-09-18T00:00:00Z', evaluationStatus: 'submitted' }),
    ];
    wrap(<Evaluations />);
    const rows = screen.getAllByRole('button', { pressed: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Candidate #A254 — Owl');
    // Waiting copy for an invited candidate; the open action is disabled.
    expect(screen.getByText('businessPortal.evaluations_waiting_title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'businessPortal.evaluations_open_review' })).toBeDisabled();

    // Filter to submitted: the fox becomes the selection and the drawer can open.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'submitted' } });
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Candidate #B771 — Fox');
    expect(screen.getByText('businessPortal.evaluations_received_title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'businessPortal.evaluations_open_review' }));
    expect(screen.getByTestId('submission-drawer')).toBeInTheDocument();
  });
});

describe('Jobs (vista per stato)', () => {
  it('renders the three columns and the first-post row when empty', async () => {
    wrap(<Jobs />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'businessPortal.jobs_page_title' })).toBeInTheDocument());
    expect(screen.getByText('businessPortal.jobs_col_draft_empty')).toBeInTheDocument();
    expect(screen.getByText('businessPortal.jobs_col_published_empty')).toBeInTheDocument();
    expect(screen.getByText('businessPortal.jobs_col_archived_empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /businessPortal.jobs_create_first_cta/ })).toBeInTheDocument();
  });

  it('places posts in their column, filters by tab and opens the detail drawer', async () => {
    tableResults.job_posts = [
      { id: 'j1', title: 'Backend developer', status: 'active', location: 'Milano', department: null, employment_type: null, updated_at: '2026-09-10T00:00:00Z', created_at: '2026-09-10T00:00:00Z' },
      { id: 'j2', title: 'Draft post', status: 'draft', location: null, department: 'R&D', employment_type: null, updated_at: '2026-09-11T00:00:00Z', created_at: '2026-09-11T00:00:00Z' },
      { id: 'j3', title: 'Published via drawer', status: 'published', location: null, department: null, employment_type: null, updated_at: '2026-09-12T00:00:00Z', created_at: '2026-09-12T00:00:00Z' },
    ];
    wrap(<Jobs />);
    await waitFor(() => expect(screen.getByText('Backend developer')).toBeInTheDocument());
    const published = screen.getByRole('region', { name: 'businessPortal.jobs_filter_published' });
    expect(published).toHaveTextContent('Backend developer');
    expect(published).toHaveTextContent('Published via drawer');
    expect(screen.getByRole('region', { name: 'businessPortal.jobs_filter_draft' })).toHaveTextContent('Draft post');

    fireEvent.click(screen.getByRole('button', { name: /businessPortal.jobs_filter_draft/ }));
    expect(screen.queryByRole('region', { name: 'businessPortal.jobs_filter_published' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Draft post'));
    expect(screen.getByTestId('job-drawer')).toBeInTheDocument();
  });
});

describe('Messages (registro essenziale)', () => {
  it('shows the counter chip and the empty row', () => {
    wrap(<PipelineChat />);
    expect(screen.getByText('pipeline_chat.active_count_label')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No active conversations' })).toBeInTheDocument();
    expect(screen.getByText('pipeline_chat.next_contact')).toBeInTheDocument();
  });

  it('keeps the list + chat view when threads exist', () => {
    threads.data = [{ id: 't1' }];
    wrap(<PipelineChat />);
    expect(screen.getByTestId('thread-list')).toBeInTheDocument();
    expect(screen.getByTestId('thread-view')).toBeInTheDocument();
    expect(screen.queryByText('pipeline_chat.next_contact')).not.toBeInTheDocument();
  });
});

describe('Settings (indice operativo)', () => {
  it('renders the index, the numbered sections, the plan and the DNA panels', async () => {
    tableResults.company_profiles = { summary: 'A summary', values: ['Rigore'], operating_style: '', communication_style: '', ideal_traits: [], pillar_vector: { drive: 72, knowledge: 85 }, recommended_ximatars: ['owl', 'cat'] };
    tableResults.business_profiles = { dna_last_regenerated_at: null, dna_locked_until: null, strategic_focus: null };
    tableResults.company_dna_history = [];
    wrap(<Settings />);
    expect(screen.getByRole('heading', { name: 'businessPortal.settings_page_title' })).toBeInTheDocument();
    // Six index entries pointing at the sections.
    ['azienda', 'profilo', 'pilastri', 'legale', 'privacy', 'piano'].forEach((id) => {
      expect(screen.getByRole('link', { name: new RegExp(id === 'azienda' ? 'settings_nav_company' : id === 'profilo' ? 'settings_nav_profile' : id === 'pilastri' ? 'settings_nav_dna' : id === 'legale' ? 'settings_nav_legal' : id === 'privacy' ? 'settings_nav_privacy' : 'settings_nav_plan') })).toHaveAttribute('href', `#${id}`);
    });
    expect(document.getElementById('azienda')).toBeTruthy();
    expect(document.getElementById('legale')).toBeTruthy();
    expect(document.getElementById('privacy')).toBeTruthy();
    expect(document.getElementById('piano')).toBeTruthy();
    expect(screen.getByRole('button', { name: /businessPortal.settings_plan_change_cta/ })).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('profilo')).toBeTruthy());
    expect(screen.getByText('A summary')).toBeInTheDocument();
    // The five pillars always render; a vector missing some shows them at 0.
    await waitFor(() => expect(screen.getAllByRole('progressbar').length).toBe(5));
    expect(screen.getByText('businessPortal.settings_dna_recommended')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rigenera DNA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imposta focus strategico' })).toBeInTheDocument();
    // All original company fields are still there.
    expect(screen.getByLabelText('Nome azienda')).toBeInTheDocument();
    expect(screen.getByLabelText('Settore')).toBeInTheDocument();
    expect(screen.getByLabelText('Durata sfida predefinita (giorni)')).toBeInTheDocument();
  });
});

describe('Hiring goal wizard (scheda di precisione)', () => {
  it('shows the step index, the live summary and moves through the steps', async () => {
    wrap(<HiringGoalCreate />, '/business/hiring-goals/new');
    expect(screen.getByRole('heading', { name: 'hiring_goal.wizard_title' })).toBeInTheDocument();
    expect(screen.getByText('hiring_goal.meta_local_draft')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'hiring_goal.steps_label' })).toBeInTheDocument();
    expect(screen.getByText('hiring_goal.summary_role_placeholder')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('hiring_goal.company_context_title')).toBeInTheDocument());

    const cont = screen.getByRole('button', { name: /hiring_goal.continue/ });
    expect(cont).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Titolo del ruolo/), { target: { value: 'Software engineer' } });
    expect(screen.getByText('Software engineer', { selector: 'p' })).toBeInTheDocument();
    expect(cont).not.toBeDisabled();
    fireEvent.click(cont);
    expect(screen.getByText('Quali sono le responsabilità chiave?')).toBeInTheDocument();
    // Going back through the index works; jumping ahead does not.
    const roleStep = screen.getByRole('button', { name: /hiring_goal.step_role/ });
    expect(roleStep).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /hiring_goal.step_pay/ })).toBeDisabled();
    fireEvent.click(roleStep);
    expect(screen.getByLabelText(/Titolo del ruolo/)).toHaveValue('Software engineer');
  });
});
