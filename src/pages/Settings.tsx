import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useUser } from '@/context/UserContext';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { SectionIndex } from '@/components/candidate/SectionIndex';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DataExportButton } from '@/components/profile/DataExportButton';
import { ProfilingOptOutSection } from '@/components/settings/ProfilingOptOutSection';
import { AccountDeletionSection } from '@/components/settings/AccountDeletionSection';
import { MentorCVConsentToggle } from '@/components/settings/MentorCVConsentToggle';
import { MembershipSection } from '@/components/settings/MembershipSection';
import { JobPreferencesFields, useJobPreferencesForm, type JobPreferencesInitialData } from '@/components/profile/JobPreferencesForm';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { useCandidateSnapshot } from '@/hooks/useCandidateSnapshot';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';
import { log } from '@/lib/log';

type MentorInfo = { mentorId: string | null; mentorName: string | null; profileId: string | null };

const SectionHead: React.FC<{ index: string; title: string; text: string; aside?: React.ReactNode }> = ({ index, title, text, aside }) => (
  <div className="mb-6 flex items-start justify-between gap-4">
    <div>
      <Eyebrow>{index}</Eyebrow>
      <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.4px] text-foreground">{title}</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">{text}</p>
    </div>
    {aside}
  </div>
);

const Tag: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => (
  <span className={cn('shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider', active ? 'border-primary/40 text-primary' : 'border-[hsl(var(--xs-line))] text-muted-foreground')}>
    {children}
  </span>
);

/** The page body once the profile row is loaded (the form needs its initial values). */
const SettingsBody: React.FC<{
  userId: string;
  initial: JobPreferencesInitialData;
  profileCompleted: boolean;
  mentorInfo: MentorInfo;
  onSaved: () => void;
}> = ({ userId, initial, profileCompleted, mentorInfo, onSaved }) => {
  const { t } = useTranslation();
  const form = useJobPreferencesForm(userId, initial);
  const snapshot = useCandidateSnapshot();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const ok = await form.save();
    if (ok) { setSavedAt(new Date()); onSaved(); }
  };

  const checks = [
    { done: !!form.workPreference, label: t('settings.check_work_mode', 'Work mode') },
    { done: !!form.availability, label: t('settings.check_availability', 'Availability') },
    { done: form.locations.filter(l => l.type !== 'remote').length > 0 || form.includeRemote, label: t('settings.check_locations', 'Where you want to work') },
    { done: form.desiredRoles.length > 0, label: t('settings.check_roles', 'Desired roles') },
  ];
  const doneCount = checks.filter(c => c.done).length;

  const index = [
    { id: 'preferences', number: '01', label: t('settings.index_preferences', 'Work preferences') },
    { id: 'subscription', number: '02', label: t('settings.index_subscription', 'Subscription') },
    { id: 'invitations', number: '03', label: t('settings.index_invitations', 'Invitations and credits') },
    { id: 'privacy', number: '04', label: t('settings.index_privacy', 'Privacy and data') },
  ];

  return (
    <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_300px]">
      <SectionIndex items={index} ariaLabel={t('settings.index_label', 'Settings sections')} className="lg:sticky lg:top-20 lg:self-start" />

      <div className="min-w-0 space-y-6">
        <Panel id="preferences" className="scroll-mt-20">
          <SectionHead
            index={t('settings.section_01', '01 / Preferences')}
            title={t('settings.prefs_title', 'The job you are looking for')}
            text={t('settings.prefs_text', 'Tell us what matters to you. You can pick more than one option.')}
            aside={<Tag active={profileCompleted}>{profileCompleted ? t('settings.tag_complete', 'Complete') : t('settings.tag_todo', 'To complete')}</Tag>}
          />
          <JobPreferencesFields form={form} />
        </Panel>

        <Panel id="subscription" className="scroll-mt-20">
          <SectionHead
            index={t('settings.section_02', '02 / Subscription')}
            title={t('settings.plan_title', 'Your plan, no surprises')}
            text={t('settings.plan_text', 'Mentor sessions and tools for your path.')}
          />
          <MembershipSection part="plan" flat />
        </Panel>

        <Panel id="invitations" className="scroll-mt-20">
          <SectionHead
            index={t('settings.section_03', '03 / Invitations')}
            title={t('settings.invite_title', 'One invitation, a new start')}
            text={t('settings.invite_text', 'Share XIMA and earn credits for your path.')}
          />
          <MembershipSection part="referral" flat />
        </Panel>

        <Panel id="privacy" className="scroll-mt-20">
          <SectionHead
            index={t('settings.section_04', '04 / Privacy and data')}
            title={t('settings.privacy_title', 'You decide')}
            text={t('settings.privacy_text', 'Manage CV access, profile analysis and personal data.')}
          />
          <div className="divide-y divide-[hsl(var(--xs-line))]">
            {mentorInfo.profileId && (
              <div className="pb-6">
                <MentorCVConsentToggle flat candidateProfileId={mentorInfo.profileId} mentorId={mentorInfo.mentorId} mentorName={mentorInfo.mentorName} />
              </div>
            )}
            <div className="py-6"><ProfilingOptOutSection flat /></div>
            <div className="py-6"><DataExportButton flat /></div>
            <div className="pt-6"><AccountDeletionSection flat variant="candidate" /></div>
          </div>
        </Panel>

        {/* Sticky save bar — the one glass surface on this page */}
        <div className="xs-glass sticky bottom-4 z-20 flex flex-col gap-3 !py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground">{t('settings.save_title', 'Your preferences, always editable')}</p>
            <p className="text-[12px] text-muted-foreground">
              {savedAt
                ? t('settings.saved_at', { time: savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), defaultValue: 'Saved at {{time}}' })
                : t('settings.save_hint', 'Changes to section 01 are saved with the button.')}
            </p>
          </div>
          <Button type="submit" disabled={form.saving} className="shrink-0">
            {form.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('profile_completion.save')}
          </Button>
        </div>
      </div>

      <aside className="hidden space-y-0 xl:block xl:sticky xl:top-20 xl:self-start">
        <Panel className="!p-5">
          <Eyebrow>{t('settings.your_profile', 'Your profile')}</Eyebrow>
          {snapshot.ximatarImage && (
            <div className="mt-3 h-16 w-16 overflow-hidden rounded-[10px] bg-[hsl(var(--xs-page))]">
              <OptimizedImage src={snapshot.ximatarImage} alt={snapshot.ximatarName || 'XIMAtar'} width={64} height={64} className="h-full w-full object-cover" />
            </div>
          )}
          <h3 className="mt-3 text-[16px] font-semibold text-foreground">
            {snapshot.name}{snapshot.ximatarName ? `, ${snapshot.ximatarName}.` : ''}
          </h3>
          <div className="mt-4 h-1.5 overflow-hidden rounded-sm bg-[hsl(var(--xs-line))]" role="progressbar" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={doneCount} aria-label={t('settings.completion_label', '{{done}} of {{total}} priority fields set', { done: doneCount, total: checks.length })}>
            <div className="h-full bg-primary transition-[width]" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
          </div>
          <p className="mt-3 text-[12px] font-semibold text-foreground">{t('settings.shape_prefs', 'Shape your preferences')}</p>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span className={cn('font-mono text-[12px]', c.done ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true">{c.done ? '✓' : '○'}</span>
                <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="px-5 py-5">
          <Eyebrow>{t('settings.why_label', 'Why complete them?')}</Eyebrow>
          <p className="mt-2 text-[13px] text-muted-foreground">{t('settings.why_text', 'Your assessment describes your profile. Your preferences say where and how you want to put it to use.')}</p>
        </div>
        <div className="border-t border-[hsl(var(--xs-line))] px-5 py-5">
          <h3 className="text-[14px] font-semibold text-foreground">{t('settings.start_title', 'A starting point')}</h3>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{t('settings.start_text', 'Your plan includes one free 30-minute intro session with a mentor.')}</p>
          <a href="#subscription" className="mt-3 block text-[13px] font-semibold text-primary hover:underline">{t('settings.explore_plan', 'Explore your plan')} →</a>
        </div>
      </aside>
    </form>
  );
};

const CandidateSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { completeStep, hasCompletedStep } = useOnboardingState();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Admin redirect: admins should never see the candidate settings page
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (cancelled) return;
      if (data?.some((r: any) => r.role === 'admin')) navigate('/admin', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user?.id, navigate]);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobPrefs, setJobPrefs] = useState<JobPreferencesInitialData>({});
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo>({ mentorId: null, mentorName: null, profileId: null });

  // Auto-complete settings onboarding step on page visit
  useEffect(() => {
    if (!hasCompletedStep('settings_manage_plan')) {
      completeStep('settings_manage_plan');
    }
  }, [completeStep, hasCompletedStep]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, desired_locations, work_preference, willing_to_relocate, salary_expectation, availability_date, industry_preferences, desired_roles, transportation_options, max_commute_minutes, content_language, profile_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) return;
        const p = profile as any;

        setJobPrefs({
          desired_locations: p.desired_locations || [],
          work_preference: p.work_preference || undefined,
          willing_to_relocate: p.willing_to_relocate || undefined,
          salary_expectation: p.salary_expectation || undefined,
          availability_date: p.availability_date || undefined,
          industry_preferences: p.industry_preferences || [],
          desired_roles: p.desired_roles || [],
          transportation_options: p.transportation_options || [],
          max_commute_minutes: p.max_commute_minutes ?? undefined,
          content_language: p.content_language || undefined,
        });
        setProfileCompleted(!!p.profile_completed);

        let mentorId: string | null = null;
        let mentorName: string | null = null;

        const { data: match } = await supabase
          .from('mentor_matches')
          .select('mentor_user_id')
          .eq('mentee_user_id', profile.id)
          .maybeSingle();

        if (match?.mentor_user_id) {
          const { data: mentor } = await supabase
            .from('mentors_public')
            .select('id, name')
            .eq('user_id', match.mentor_user_id)
            .maybeSingle();

          if (mentor) {
            mentorId = mentor.id;
            mentorName = mentor.name;
          }
        }

        setMentorInfo({ mentorId, mentorName, profileId: profile.id });
      } catch (err) {
        log.error('[CandidateSettings] Error fetching data:', err);
      } finally {
        setLoaded(true);
      }
    };

    fetchData();
  }, [refreshKey]);

  // Deep links from the dashboard (/settings#invitations): scroll once the sections exist.
  useEffect(() => {
    if (!loaded || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [loaded, location.hash]);

  return (
    <CandidateLayout breadcrumb={<span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('settings.page_title')}</span>}>
      <EmailVerificationBanner slim />
      <PageHeader
        eyebrow={t('settings.eyebrow', 'Focus on the next step')}
        title={t('settings.hero_title', 'Work, on your terms.')}
        subtitle={t('settings.hero_subtitle', 'Complete your preferences so companies understand what you are looking for. Your plan and your data live here too.')}
      />
      {loaded && userId ? (
        <SettingsBody
          key={refreshKey}
          userId={userId}
          initial={jobPrefs}
          profileCompleted={profileCompleted}
          mentorInfo={mentorInfo}
          onSaved={() => setRefreshKey(prev => prev + 1)}
        />
      ) : (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
    </CandidateLayout>
  );
};

export default CandidateSettings;
