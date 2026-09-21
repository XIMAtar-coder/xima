import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MentorLayout from '@/components/mentor/MentorLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MentorCandidateCard } from '@/components/mentor/MentorCandidateCard';
import { Check, AlertCircle } from 'lucide-react';
import NotAMentor from './NotAMentor';

/**
 * Preview, "this is where they meet you" layout: the card is shown inside the
 * moment it actually appears in — the candidate's result page, beside the other
 * mentors proposed for the same person.
 *
 * The other slots stay blank on purpose: a mentor session can only read its own
 * row, so any name shown there would be invented. The page also no longer
 * prints "85% compatibility", which was a constant for every mentor without
 * reviews and had nothing to do with any candidate.
 */
export default function MentorPreview() {
  const { t } = useTranslation();
  const { isMentor, mentorProfile, loading } = useMentorProfile();

  if (loading) {
    return (
      <MentorLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      </MentorLayout>
    );
  }

  if (!isMentor || !mentorProfile) return <NotAMentor />;

  const checklist = [
    { done: true, label: t('mentor.check_name', 'Name'), hint: t('mentor.check_name_hint', 'Not editable.') },
    { done: Boolean(mentorProfile.title), label: t('mentor.title_label', 'Professional title'), hint: mentorProfile.title || t('mentor.check_missing', 'Missing') },
    { done: Boolean(mentorProfile.profile_image_url), label: t('mentor.check_photo', 'Photo'), hint: mentorProfile.profile_image_url ? t('mentor.check_present', 'Present') : t('mentor.check_photo_hint', 'Without a photo you stay an initial in a grey circle.') },
    { done: Boolean(mentorProfile.bio), label: t('mentor.bio_label', 'Bio'), hint: mentorProfile.bio ? t('mentor.check_present', 'Present') : t('mentor.check_bio_hint', 'This is where the others explain how they work.') },
    { done: Boolean(mentorProfile.specialties?.length), label: t('mentor.specialties_label', 'Specialties'), hint: (mentorProfile.specialties?.length || 0) > 0 ? t('mentor.check_first_three', 'Up to three are shown.') : t('mentor.check_missing', 'Missing') },
    { done: Boolean(mentorProfile.first_session_expectations), label: t('mentor.first_session_label', 'At the first session'), hint: mentorProfile.first_session_expectations ? t('mentor.check_present', 'Present') : t('mentor.check_expectations_hint', 'Without it, nobody knows what happens if they choose you.') },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <MentorLayout breadcrumb={<span className="truncate">{t('mentor.area_label', 'Mentor area')} / {t('mentor.nav_preview', 'Profile preview')}</span>}>
      <PageHeader
        eyebrow={`${t('mentor.preview_eyebrow', 'Preview')} / ${t('mentor.preview_side', 'Candidate side')}`}
        title={t('mentor.preview_title', 'This is how they find you')}
        subtitle={t('mentor.preview_subtitle', 'The page a person sees after their own XIMAtar result, with you in it.')}
        actions={
          <Button asChild>
            <Link to="/mentor/profile">{t('mentor.complete_profile', 'Complete the profile')}</Link>
          </Button>
        }
      />

      {/* The candidate's moment */}
      <section className="rounded-[14px] border border-[hsl(var(--xs-line))] bg-muted/40 p-5 sm:p-6">
        <Eyebrow>{t('mentor.preview_context_label', 'Candidate screen')}</Eyebrow>
        <div className="mt-3 rounded-xl border border-[hsl(var(--xs-line))] bg-card p-5">
          <p className="xs-eyebrow">{t('mentor.preview_result_label', 'Their result')}</p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {t('mentor.preview_result_body', 'After the result, a few mentors are proposed for the pillar the person is weakest on. You are one of them.')}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border-2 border-primary bg-background p-4 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
              <p className="mb-3 inline-flex rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {t('mentor.preview_this_is_you', 'This is you')}
              </p>
              <MentorCandidateCard data={mentorProfile} />
            </div>

            {/* Deliberately blank: the other mentors are chosen per candidate */}
            {[0, 1].map((i) => (
              <div key={i} className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--xs-line))] p-4 text-center">
                <p className="text-[13px] font-medium text-muted-foreground">{t('mentor.preview_other_mentor', 'Another mentor')}</p>
                <p className="mt-1.5 max-w-[190px] text-[12.5px] leading-relaxed text-muted-foreground">
                  {t('mentor.preview_other_mentor_hint', 'Chosen for that particular person, so it cannot be shown here.')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Panel>
          <Eyebrow>{t('mentor.preview_readout', 'What they see and what they do not')}</Eyebrow>
          <h2 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
            {t('mentor.preview_card_line_by_line', 'Your card, line by line.')}
          </h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {t('mentor.preview_completeness', '{{done}} of {{total}} elements filled in', { done: doneCount, total: checklist.length })}
          </p>
          <ul className="mt-4">
            {checklist.map((c) => (
              <li key={c.label} className="flex gap-3 border-t border-[hsl(var(--xs-line))] py-3 first:border-t-0 first:pt-0">
                <span
                  className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md ${c.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}
                  aria-hidden="true"
                >
                  {c.done ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                </span>
                <span className="min-w-0 text-[14px]">
                  <span className="font-semibold text-foreground">{c.label}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{c.hint}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/mentor/profile">{t('mentor.action_edit_profile', 'Edit my profile')}</Link>
          </Button>
        </Panel>

        <aside>
          <div className="xs-glass p-5">
            <Eyebrow>{t('mentor.affinity', 'Affinity')}</Eyebrow>
            <h3 className="mt-2 text-[17px] font-semibold text-foreground">{t('mentor.affinity_title', 'Affinity is not a score on you.')}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {t('mentor.affinity_body', 'It is recomputed for each person, comparing your pillars with theirs. There is no candidate in a preview, so no percentage is shown here: it would be a made-up number.')}
            </p>
          </div>
        </aside>
      </div>
    </MentorLayout>
  );
}
