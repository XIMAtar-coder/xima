import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import MainLayout from '@/components/layout/MainLayout';
import { DataExportButton } from '@/components/profile/DataExportButton';
import { ProfilingOptOutSection } from '@/components/settings/ProfilingOptOutSection';
import { AccountDeletionSection } from '@/components/settings/AccountDeletionSection';
import { MentorCVConsentToggle } from '@/components/settings/MentorCVConsentToggle';
import { MembershipSection } from '@/components/settings/MembershipSection';
import { JobPreferencesSection } from '@/components/settings/JobPreferencesSection';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

const CandidateSettings = () => {
  const { t } = useTranslation();
  const { completeStep, hasCompletedStep } = useOnboardingState();
  const [refreshKey, setRefreshKey] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobPrefs, setJobPrefs] = useState<any>({});
  const [mentorInfo, setMentorInfo] = useState<{ mentorId: string | null; mentorName: string | null; profileId: string | null }>({
    mentorId: null,
    mentorName: null,
    profileId: null,
  });

  // Auto-complete settings onboarding step on page visit
  useEffect(() => {
    if (!hasCompletedStep('settings_manage_plan')) {
      completeStep('settings_manage_plan');
    }
  }, [completeStep, hasCompletedStep]);

  useEffect(() => {
    const fetchMentorInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) return;

        let mentorId = null;
        let mentorName = null;

        const { data: match } = await supabase
          .from('mentor_matches')
          .select('mentor_user_id')
          .eq('mentee_user_id', profile.id)
          .maybeSingle();

        if (match?.mentor_user_id) {
          const { data: mentor } = await supabase
            .from('mentors')
            .select('id, name')
            .eq('user_id', match.mentor_user_id)
            .maybeSingle();

          if (mentor) {
            mentorId = mentor.id;
            mentorName = mentor.name;
          }
        }

        setMentorInfo({
          mentorId,
          mentorName,
          profileId: profile.id,
        });
      } catch (err) {
        console.error('[CandidateSettings] Error fetching mentor info:', err);
      }
    };

    fetchMentorInfo();
  }, []);

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto py-8 px-4 md:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[28px] md:text-[34px] font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            {t('settings.page_title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('settings.page_subtitle')}
          </p>
        </div>

        {/* Mentor CV Access Consent */}
        {mentorInfo.profileId && (
          <>
            <MentorCVConsentToggle
              candidateProfileId={mentorInfo.profileId}
              mentorId={mentorInfo.mentorId}
              mentorName={mentorInfo.mentorName}
            />
            <Separator />
          </>
        )}

        {/* Membership Plan */}
        <MembershipSection />

        <Separator />

        {/* Data Export (GDPR Art. 20 - Portability) */}
        <DataExportButton />

        <Separator />

        {/* Profiling Opt-Out (GDPR Art. 21/22) */}
        <ProfilingOptOutSection />

        <Separator />

        {/* Account Deletion (GDPR Art. 17) */}
        <AccountDeletionSection variant="candidate" />
      </div>
    </MainLayout>
  );
};

export default CandidateSettings;
