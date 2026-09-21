import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useCandidateChallenges } from '@/hooks/useCandidateChallenges';
import { MentorSection } from '@/components/profile/MentorSection';
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal';
import { XimatarHeroCard } from '@/components/profile/XimatarHeroCard';
import { StrengthFrictionSummary } from '@/components/profile/StrengthFrictionSummary';
import { AssessmentOverviewCard } from '@/components/profile/AssessmentOverviewCard';
import { OpenAnswerList } from '@/components/profile/OpenAnswerList';
import { CVAnalysisCard } from '@/components/profile/CVAnalysisCard';
import { MyOpportunitiesSection } from '@/components/opportunities/MyOpportunitiesSection';
import { MembershipSummaryCard } from '@/components/profile/MembershipSummaryCard';
import { ChallengesForYouSection } from '@/components/profile/ChallengesForYouSection';
import { MemberCodeBadge } from '@/components/business/MemberCodeBadge';
import { XimaJourneyGuideModal } from '@/components/onboarding/XimaJourneyGuideModal';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { PillarBars, formatScore, pillarName, readPillar, type PillarKey } from '@/components/candidate/PillarBars';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/lib/data/useSupabaseQuery';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';
import { cn } from '@/lib/utils';
import { log } from '@/lib/log';

type SectionId = 'profile' | 'cv' | 'mentor' | 'challenges' | 'opportunities';

/** A collapsed panel below the fold; the overview links open and scroll to it. */
const DetailSection: React.FC<{
  id: SectionId; number: string; title: string; hint: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ id, number, title, hint, open, onToggle, children }) => (
  <section id={id} className="xs-panel !p-0 scroll-mt-20">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`${id}-content`}
      className="flex w-full items-center gap-4 px-6 py-4 text-left"
    >
      <span className="font-mono text-[11px] text-muted-foreground">{number}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-foreground">{title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{hint}</span>
      </span>
      <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-content`} className="space-y-6 border-t border-[hsl(var(--xs-line))] px-6 py-6">{children}</div>}
  </section>
);

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [, setRefreshKey] = React.useState(0);
  const [profileRefreshKey, setProfileRefreshKey] = React.useState(0);
  const [, setMentorRefreshKey] = React.useState(0);
  const [processingMentor, setProcessingMentor] = React.useState(false);
  const profileData = useProfileData(profileRefreshKey);
  const { shouldAutoShowGuide, completeStep } = useOnboardingState();
  const [guideOpen, setGuideOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Partial<Record<SectionId, boolean>>>({});
  const { activeCount: activeChallenges, loading: challengesLoading } = useCandidateChallenges();

  // Admin redirect: admins should never see the candidate dashboard.
  // Uses the shared data layer so the roles fetch is cached across pages.
  const { data: userRoles } = useSupabaseQuery<Array<{ role: string }>>(
    ['user_roles', user?.id],
    () => supabase.from('user_roles').select('role').eq('user_id', user!.id),
    { enabled: !!user?.id, staleTime: 5 * 60_000 }
  );
  useEffect(() => {
    if (userRoles?.some((r) => r.role === 'admin')) navigate('/admin', { replace: true });
  }, [userRoles, navigate]);

  const hasMentor = !!profileData.mentor_profile;

  useEffect(() => {
    const completedAt = sessionStorage.getItem('xima_profile_sync_completed');
    if (!completedAt) return;
    sessionStorage.removeItem('xima_profile_sync_completed');
    setProfileRefreshKey(prev => prev + 1);
  }, []);

  // Send welcome email once after user lands on dashboard with a created profile
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (!profileData || profileData.isLoading) return;
    const raw = sessionStorage.getItem('xima_pending_welcome');
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      const recipient = pending.email || user.email;
      if (!recipient) return;
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: recipient,
          idempotencyKey: `welcome:${pending.userId || user.id}`,
          templateData: {
            name: pending.name || (user as any)?.user_metadata?.name || '',
            locale: pending.locale || 'en',
          },
        },
      }).catch((e) => log.warn('[Profile] welcome email failed:', e));
    } catch (e) {
      log.warn('[Profile] welcome email parse error:', e);
    } finally {
      sessionStorage.removeItem('xima_pending_welcome');
    }
  }, [isAuthenticated, user?.id, profileData?.isLoading]);

  useEffect(() => {
    if (hasMentor) completeStep('choose_mentor');
  }, [hasMentor, completeStep]);

  useEffect(() => {
    const processPendingMentorAssignment = async () => {
      if (!isAuthenticated || !user?.id || processingMentor) return;
      const selectedProfessionalData = localStorage.getItem('selected_professional_data');
      if (!selectedProfessionalData) return;
      if (profileData.mentor_profile) {
        localStorage.removeItem('selected_professional_data');
        return;
      }
      try {
        setProcessingMentor(true);
        const professional = JSON.parse(selectedProfessionalData);
        const { data, error } = await supabase.functions.invoke('assign-mentor', { body: { professional_id: professional.id } });
        if (error) {
          toast({ title: "Note", description: "We'll assign your selected mentor shortly." });
        } else if (data?.success) {
          localStorage.removeItem('selected_professional_data');
          toast({ title: "Success", description: `${professional.full_name} has been assigned as your mentor!` });
          setProfileRefreshKey(prev => prev + 1);
        }
      } catch (error) {
        log.error('[Profile] Failed to process mentor assignment:', error);
      } finally { setProcessingMentor(false); }
    };
    const timeout = setTimeout(() => { processPendingMentorAssignment(); }, 1000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user?.id, profileData.mentor_profile, processingMentor, toast]);

  const handleAvatarUpdate = () => setRefreshKey(prev => prev + 1);
  const handleCVUploadSuccess = () => setProfileRefreshKey(prev => prev + 1);
  const handleMentorBookingSuccess = () => { setMentorRefreshKey(prev => prev + 1); setProfileRefreshKey(prev => prev + 1); };
  const handleGuideClose = (dontShowAgain: boolean) => {
    setGuideOpen(false);
    if (dontShowAgain || shouldAutoShowGuide) completeStep('welcome_seen');
  };

  const openSection = useCallback((id: SectionId) => {
    setOpenSections(prev => ({ ...prev, [id]: true }));
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }, []);
  const toggleSection = (id: SectionId) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const breadcrumb = <span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('nav.dashboard')}</span>;

  if (!isAuthenticated) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        <div className="mx-auto max-w-xl py-12 text-center">
          <h2 className="xs-title mb-4">{t('common.login_required')}</h2>
          <Button onClick={() => navigate('/login')}>{t('common.login')}</Button>
        </div>
      </CandidateLayout>
    );
  }

  if (profileData.isLoading) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </CandidateLayout>
    );
  }

  if (!profileData.hasAssessment) {
    return (
      <CandidateLayout breadcrumb={breadcrumb}>
        <XimaJourneyGuideModal open={guideOpen} onClose={handleGuideClose} isAutoOpen={shouldAutoShowGuide} />
        <EmailVerificationBanner slim />
        <Panel className="mx-auto max-w-2xl py-14 text-center">
          <h2 className="xs-title mb-3">{t('profile.no_assessment_title')}</h2>
          <p className="mx-auto mb-8 max-w-md text-[16px] text-muted-foreground">{t('profile.no_assessment_desc')}</p>
          <Button size="lg" onClick={() => navigate('/ximatar-journey')}>
            {t('profile.start_assessment')}
          </Button>
        </Panel>
      </CandidateLayout>
    );
  }

  const name = profileData.full_name || user?.name || t('profile.user');
  const scores = profileData.pillar_scores;
  const strongest = profileData.strongest_pillar as PillarKey | null;
  const weakest = profileData.weakest_pillar as PillarKey | null;
  const driveValue = readPillar(scores, 'drive');
  const cv = profileData.cv_analysis;
  const alignment = typeof cv?.alignmentScore === 'number' ? Math.round(cv.alignmentScore) : null;
  const profileCompleted = !!profileData.profile_completed;
  const mentor = profileData.mentor_profile;
  const linkClass = 'mt-auto pt-3 text-left text-[14px] font-semibold text-primary hover:underline';

  return (
    <CandidateLayout breadcrumb={breadcrumb}>
      <Seo
        title="Your Profile — XIMA Dashboard"
        description="Your personal XIMA dashboard: XIMAtar profile, pillar insights, mentor sessions, and matched opportunities."
        path="/profile"
        noindex
      />
      <XimaJourneyGuideModal open={guideOpen} onClose={handleGuideClose} isAutoOpen={shouldAutoShowGuide} />
      <ProfileCompletionModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userId={user?.id || ''}
        onSuccess={() => setProfileRefreshKey(prev => prev + 1)}
      />

      <EmailVerificationBanner slim />

      <PageHeader
        eyebrow={t('dashboard.eyebrow', 'Your personal space')}
        title={t('dashboard.welcome_back', { name, defaultValue: 'Welcome back, {{name}}.' })}
        subtitle={t('dashboard.assessment_saved', 'Your assessment is saved.')}
        actions={(
          <>
            {profileData.subscriber_code && (
              <MemberCodeBadge code={profileData.subscriber_code} variant="founding" className="px-3 py-1 text-sm" />
            )}
            <Button variant="outline" size="sm" onClick={() => setGuideOpen(true)}>
              {t('dashboard.guided_tour', 'Guided tour')}
            </Button>
          </>
        )}
      />

      {/* Overview: XIMAtar + pillars */}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <XimatarHeroCard
          ximatarName={profileData.ximatar_name} ximatarImage={profileData.ximatar_image}
          driveLevel={profileData.drive_level} strongestPillar={profileData.strongest_pillar}
          weakestPillar={profileData.weakest_pillar} storytelling={profileData.ximatar_storytelling}
          fullName={profileData.full_name} avatarUrl={(user?.avatar as any)?.image || null}
          pillarScores={profileData.pillar_scores} onAvatarUpdate={handleAvatarUpdate}
          onExploreProfile={() => openSection('profile')}
        />

        <Panel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">{t('dashboard.five_pillars', 'Your five pillars')}</h2>
            <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{t('dashboard.scale_0_10', 'Scale 0–10')}</span>
          </div>
          <PillarBars scores={scores} />
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[hsl(var(--xs-line))] pt-4">
            <div>
              <p className="text-[12px] text-muted-foreground">{t('dashboard.your_strength', 'Your strength')}</p>
              <p className="text-[15px] font-semibold text-foreground">
                {strongest ? pillarName(t, strongest) : '—'}
                {strongest && <span className="ml-1.5 font-mono text-[13px] font-medium text-primary">{formatScore(readPillar(scores, strongest), i18n.language)}</span>}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">{t('dashboard.development_area', 'Development area')}</p>
              <p className="text-[15px] font-semibold text-foreground">
                {weakest ? pillarName(t, weakest) : '—'}
                {weakest && <span className="ml-1.5 font-mono text-[13px] font-medium text-primary">{formatScore(readPillar(scores, weakest), i18n.language)}</span>}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Drive {formatScore(driveValue, i18n.language)}{profileData.drive_level ? ` · ${t(`profile.drive_level_${profileData.drive_level}`)}` : ''}. {t('dashboard.drive_line', 'The pace of growth in the areas to develop.')}
          </p>
        </Panel>
      </div>

      {/* Next step + CV alignment (the score only once an analysis exists) */}
      <div className={cn('mt-5 grid gap-5', cv && 'lg:grid-cols-[1.3fr_1fr]')}>
        <Panel className="border-l-4 border-l-primary">
          <Eyebrow className="!text-primary">{t('dashboard.next_step_label', 'The next step')}</Eyebrow>
          {profileCompleted ? (
            <>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.4px] text-foreground">{t('dashboard.prefs_set_title', 'Your preferences are set.')}</h2>
              <p className="mt-1.5 text-[14px] text-muted-foreground">{t('dashboard.prefs_set_body', 'Update them whenever something changes.')}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/settings#preferences')}>
                {t('dashboard.edit_preferences', 'Edit preferences')} <span aria-hidden="true">→</span>
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.4px] text-foreground">{t('dashboard.next_step_title', 'What job are you looking for?')}</h2>
              <p className="mt-1.5 text-[14px] text-muted-foreground">{t('dashboard.next_step_body', 'Add your preferences to complete your profile.')}</p>
              <Button className="mt-4" onClick={() => setProfileModalOpen(true)}>
                {t('dashboard.set_preferences', 'Set preferences')} <span aria-hidden="true">→</span>
              </Button>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t('dashboard.preference_summary', 'Role · Location · Salary · Availability')}</p>
            </>
          )}
        </Panel>

        {cv && (
          <Panel className="flex items-start gap-5">
            <div className="xs-num shrink-0 font-mono text-[40px] font-medium leading-none text-primary">
              {alignment !== null ? alignment : '—'}<span className="text-[14px] text-muted-foreground">/100</span>
            </div>
            <div className="flex min-h-full flex-col">
              <h3 className="text-[16px] font-semibold text-foreground">{t('dashboard.cv_and_assessment', 'CV and assessment')}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">{t('dashboard.cv_differences', 'There are differences to explore.')}</p>
              <button type="button" onClick={() => openSection('cv')} className={linkClass}>
                {t('dashboard.read_analysis', 'Read the analysis')} <span aria-hidden="true">→</span>
              </button>
            </div>
          </Panel>
        )}
      </div>

      {/* Challenges · mentor · opportunities */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Panel className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-foreground">{t('dashboard.your_challenges', 'Your challenges')}</h2>
            <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {challengesLoading ? '…' : t('dashboard.active_count', { count: activeChallenges, defaultValue: '{{count}} active' })}
            </span>
          </div>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {activeChallenges > 0
              ? t('dashboard.challenges_waiting', 'Challenges are waiting for your answer.')
              : t('dashboard.challenges_none', "You haven't received invitations yet. Challenges proposed by companies will appear here.")}
          </p>
          <button type="button" onClick={() => openSection('challenges')} className={linkClass}>
            {t('dashboard.go_to_challenges', 'Go to challenges')} <span aria-hidden="true">→</span>
          </button>
        </Panel>

        <Panel className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-foreground">{t('dashboard.useful_conversation', 'A useful conversation')}</h2>
            <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{t('dashboard.optional', 'Optional')}</span>
          </div>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {mentor ? (
              <>
                <strong className="text-foreground">{mentor.name}</strong>
                {mentor.bio && <><br /><span className="line-clamp-2">{mentor.bio}</span></>}
              </>
            ) : t('dashboard.mentor_none', 'No mentor assigned yet. Availability is published by the mentor.')}
          </p>
          <button type="button" onClick={() => openSection('mentor')} className={linkClass}>
            {t('dashboard.meet_mentor', 'Meet the mentor')} <span aria-hidden="true">→</span>
          </button>
        </Panel>

        <Panel className="flex flex-col">
          <h2 className="text-[17px] font-semibold text-foreground">{t('dashboard.your_opportunities', 'Your opportunities')}</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">{t('dashboard.opportunities_hint', 'Set role, location and availability to make opportunities more relevant.')}</p>
          <button type="button" onClick={() => openSection('opportunities')} className={linkClass}>
            {t('dashboard.explore_opportunities', 'Explore opportunities')} <span aria-hidden="true">→</span>
          </button>
        </Panel>
      </div>

      {/* Details below the fold */}
      <div className="mt-8">
        <Eyebrow className="mb-3">{t('dashboard.details_label', 'In depth')}</Eyebrow>
        <div className="space-y-3">
          <DetailSection id="profile" number="01" title={t('dashboard.section_profile', 'Your profile')} hint={t('dashboard.section_profile_hint', 'Edge, friction, assessment overview and story')} open={!!openSections.profile} onToggle={() => toggleSection('profile')}>
            <StrengthFrictionSummary strongestPillar={profileData.strongest_pillar} weakestPillar={profileData.weakest_pillar} growthPath={profileData.ximatar_growth_path} />
            {scores && <AssessmentOverviewCard pillarScores={scores} driveLevel={profileData.drive_level} storytelling={profileData.ximatar_storytelling} />}
            {profileData.open_answers && profileData.open_answers.length > 0 && <OpenAnswerList openAnswers={profileData.open_answers} />}
          </DetailSection>

          <DetailSection id="cv" number="02" title={t('dashboard.cv_analysis_title')} hint={cv ? t('dashboard.section_cv_hint', 'Comparison, suggestions and a new upload') : t('dashboard.cv_missing', 'Upload your CV to compare it with the assessment.')} open={!!openSections.cv} onToggle={() => toggleSection('cv')}>
            <CVAnalysisCard cvAnalysis={profileData.cv_analysis} cvPillarScores={profileData.cv_pillar_scores} assessmentPillarScores={profileData.pillar_scores} onUploadSuccess={handleCVUploadSuccess} />
          </DetailSection>

          <DetailSection id="mentor" number="03" title={t('dashboard.mentor_title')} hint={mentor ? mentor.name : t('dashboard.mentor_none', 'No mentor assigned yet. Availability is published by the mentor.')} open={!!openSections.mentor} onToggle={() => toggleSection('mentor')}>
            <MentorSection mentor={profileData.mentor_profile} onBookingSuccess={handleMentorBookingSuccess} />
          </DetailSection>

          <DetailSection id="challenges" number="04" title={t('dashboard.your_challenges', 'Your challenges')} hint={t('dashboard.section_challenges_hint', 'Invitations from companies and their status')} open={!!openSections.challenges} onToggle={() => toggleSection('challenges')}>
            <ChallengesForYouSection />
          </DetailSection>

          <DetailSection id="opportunities" number="05" title={t('dashboard.your_opportunities', 'Your opportunities')} hint={t('dashboard.section_opportunities_hint', 'For you, saved and applications')} open={!!openSections.opportunities} onToggle={() => toggleSection('opportunities')}>
            <MyOpportunitiesSection />
          </DetailSection>
        </div>
      </div>

      <div className="mt-8">
        <MembershipSummaryCard />
      </div>
    </CandidateLayout>
  );
};

export default Profile;
