/**
 * Smoke tests for the mentor area after the restyle: the four pages render
 * inside the shared shell, the profile editor previews what the candidate will
 * see while you type, and the preview page no longer prints a compatibility
 * percentage that nobody computed.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => {
  const t = (key: string, opts?: unknown) => (typeof opts === 'string' ? opts : key);
  const i18n = { language: 'it', changeLanguage: vi.fn() };
  return { useTranslation: () => ({ t, i18n }) };
});

vi.mock('@/components/mentor/MentorLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mentor-shell">{children}</div>,
}));
vi.mock('@/components/mentor/MentorCVAccessSection', () => ({ MentorCVAccessSection: () => <div data-testid="cv-access" /> }));
vi.mock('@/components/mentor/MentorAvatarUpload', () => ({ MentorAvatarUpload: () => <div data-testid="avatar-upload" /> }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

const mentorProfile = {
  id: 'm1',
  name: 'Alessandro Del Piero',
  title: 'Mentore di prova',
  bio: '',
  profile_image_url: null as string | null,
  specialties: ['Leadership', 'Team building'],
  xima_pillars: ['communication', 'drive'],
  first_session_expectations: '',
  rating: null as number | null,
  is_active: true,
};
const profileState = { isMentor: true, mentorProfile, loading: false, refetch: vi.fn(), error: null };
vi.mock('@/hooks/useMentorProfile', () => ({ useMentorProfile: () => profileState }));

const calendarState = {
  slots: [] as unknown[],
  sessions: [] as unknown[],
  loading: false,
  createSlot: vi.fn(), deleteSlot: vi.fn(), confirmSession: vi.fn(),
  rejectSession: vi.fn(), cancelSession: vi.fn(), completeSession: vi.fn(),
};
vi.mock('@/hooks/useMentorCalendar', () => ({ useMentorCalendar: () => calendarState }));

import MentorPortal from '../MentorPortal';
import MentorProfileEdit from '../MentorProfileEdit';
import MentorPreview from '../MentorPreview';
import MentorCalendar from '../MentorCalendar';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  profileState.mentorProfile = { ...mentorProfile };
});

describe('Portale mentore', () => {
  it('shows identity, quick access and the missing-profile step', () => {
    wrap(<MentorPortal />);
    expect(screen.getByRole('heading', { name: 'Mentor portal' })).toBeInTheDocument();
    expect(screen.getByText('Alessandro Del Piero')).toBeInTheDocument();
    // Bio and photo are missing, so the next step is offered.
    expect(screen.getByText('Let candidates find you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Calendar and sessions/ })).toBeInTheDocument();
    expect(screen.getByTestId('cv-access')).toBeInTheDocument();
    // The rating has no value: shown as a dash, never as zero.
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('Profilo mentore', () => {
  it('previews the candidate card while typing and only enables save after a change', () => {
    wrap(<MentorProfileEdit />);
    expect(screen.getByText('What the candidate sees')).toBeInTheDocument();
    const save = screen.getAllByRole('button', { name: /Save changes/ })[0];
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Accompagno chi guida squadre.' } });
    // Once in the textarea, once in the card on the right.
    expect(screen.getAllByText('Accompagno chi guida squadre.').length).toBeGreaterThan(1);
    expect(screen.getAllByRole('button', { name: /Save changes/ })[0]).not.toBeDisabled();
  });
});

describe('Anteprima mentore', () => {
  it('places the card in the candidate moment and states that affinity has no fixed value', () => {
    wrap(<MentorPreview />);
    expect(screen.getByRole('heading', { name: 'This is how they find you' })).toBeInTheDocument();
    expect(screen.getByText('This is you')).toBeInTheDocument();
    // The other mentors are per candidate: placeholders, not invented people.
    expect(screen.getAllByText('Another mentor')).toHaveLength(2);
    expect(screen.getByText('Affinity is not a score on you.')).toBeInTheDocument();
    expect(screen.queryByText(/85%/)).not.toBeInTheDocument();
  });
});

describe('Calendario mentore', () => {
  it('opens on the requests tab and explains the rule and the time zone', async () => {
    wrap(<MentorCalendar />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Calendar and sessions' })).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /Requests/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No requests to handle.')).toBeInTheDocument();
    expect(screen.getByText(/A free slot can receive a request/)).toBeInTheDocument();
    expect(screen.getByText('A free day, for now')).toBeInTheDocument();
  });
});
