import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import MentorLayout from '@/components/mentor/MentorLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/business/XsBits';
import { ArrowRight, CalendarClock, ChevronDown, Edit, Eye } from 'lucide-react';
import { MentorCVAccessSection } from '@/components/mentor/MentorCVAccessSection';
import { mentorAvatarUrl, pillarLabel } from '@/components/mentor/mentorBits';
import NotAMentor from './NotAMentor';

/**
 * Mentor home, "everything at a glance" layout: identity on the left, the two
 * things a mentor actually comes here for on the right (availability and
 * profile), and the explanation folded away once it has been read.
 */
export default function MentorPortal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMentor, mentorProfile, loading } = useMentorProfile();

  if (loading) {
    return (
      <MentorLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MentorLayout>
    );
  }

  if (!isMentor || !mentorProfile) return <NotAMentor />;

  const avatar = mentorAvatarUrl(mentorProfile.profile_image_url);
  const isProfileIncomplete = !mentorProfile.bio || !mentorProfile.title
    || !mentorProfile.profile_image_url || !mentorProfile.xima_pillars?.length;

  const shortcuts = [
    {
      to: '/mentor/calendar',
      icon: CalendarClock,
      title: t('mentor.action_calendar', 'Calendar and sessions'),
      body: t('mentor.action_calendar_desc', 'Open your availability and handle meeting requests'),
    },
    {
      to: '/mentor/profile',
      icon: Edit,
      title: t('mentor.action_edit_profile', 'Edit my profile'),
      body: t('mentor.action_edit_profile_desc', 'Update your bio, pillars and specialties'),
    },
    {
      to: '/mentor/preview',
      icon: Eye,
      title: t('mentor.action_preview', 'Preview for candidates'),
      body: t('mentor.action_preview_desc', 'See how your profile is presented'),
    },
  ];

  const steps = [
    { n: '01', title: t('mentor.how_step_1_title', 'You appear in the results'), body: t('mentor.how_step_1_desc', 'Candidates find you through the affinity between their XIMAtar pillars and yours.') },
    { n: '02', title: t('mentor.how_step_2_title', 'You keep your profile current'), body: t('mentor.how_step_2_desc', 'Bio, pillars and what to expect from the first session.') },
    { n: '03', title: t('mentor.how_step_3_title', 'You accompany the candidates'), body: t('mentor.how_step_3_desc', 'An open slot can receive a request; a request becomes a session once you confirm it.') },
    { n: '04', title: t('mentor.how_step_4_title', 'You read the CVs you are given'), body: t('mentor.how_step_4_desc', 'You only see a CV when that person grants you access.') },
  ];

  return (
    <MentorLayout breadcrumb={<span className="truncate">{t('mentor.area_label', 'Mentor area')} / {t('mentor.portal_title', 'Mentor portal')}</span>}>
      <PageHeader
        eyebrow={`${t('mentor.eyebrow_personal', 'Personal area')} / ${t('mentor.role_label', 'Mentor')}`}
        title={t('mentor.portal_title', 'Mentor portal')}
        subtitle={t('mentor.portal_description', 'Your profile and your meetings with candidates, in one place.')}
        actions={
          <Button variant="outline" asChild>
            <Link to="/mentor/preview">
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('mentor.nav_preview', 'Profile preview')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* Identity */}
        <Panel className="lg:sticky lg:top-20">
          <Chip tone={mentorProfile.is_active ? 'status' : 'neutral'}>
            {mentorProfile.is_active ? t('mentor.status_active', 'Active') : t('mentor.status_inactive', 'Inactive')}
          </Chip>

          <div className="mt-4 h-16 w-16 overflow-hidden rounded-full bg-muted">
            {avatar ? (
              <img src={avatar} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                {mentorProfile.name.charAt(0)}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-[20px] font-semibold leading-tight tracking-[-0.3px] text-foreground">{mentorProfile.name}</h2>
          {mentorProfile.title && <p className="mt-1 text-sm text-muted-foreground">{mentorProfile.title}</p>}

          {mentorProfile.xima_pillars && mentorProfile.xima_pillars.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mentorProfile.xima_pillars.map((pillar) => <Chip key={pillar}>{pillarLabel(t, pillar)}</Chip>)}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[hsl(var(--xs-line))] pt-4">
            <div>
              <dt className="text-[12px] text-muted-foreground">{t('mentor.rating', 'Rating')}</dt>
              <dd className="xs-num mt-1 text-[22px] font-semibold leading-none text-foreground">
                {mentorProfile.rating ? mentorProfile.rating.toFixed(1) : '—'}
              </dd>
              {!mentorProfile.rating && <dd className="mt-1 text-[12px] text-muted-foreground">{t('mentor.no_reviews', 'No reviews yet')}</dd>}
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">{t('mentor.active_coachees', 'Candidates followed now')}</dt>
              <dd className="xs-num mt-1 text-[22px] font-semibold leading-none text-foreground">
                {(mentorProfile as any).active_coached_profiles_count || 0}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">{t('mentor.total_coached', 'Accompanied in total')}</dt>
              <dd className="xs-num mt-1 text-[22px] font-semibold leading-none text-foreground">
                {(mentorProfile as any).total_coached_profiles_count || 0}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">{t('mentor.pillars', 'Pillars')}</dt>
              <dd className="xs-num mt-1 text-[22px] font-semibold leading-none text-foreground">
                {mentorProfile.xima_pillars?.length || 0}
              </dd>
            </div>
          </dl>

          <Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/mentor/profile')}>
            <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('mentor.action_edit_profile', 'Edit my profile')}
          </Button>
        </Panel>

        {/* Operations */}
        <div className="space-y-6">
          {isProfileIncomplete && (
            <div className="xs-glass p-6">
              <Eyebrow>{t('mentor.next_step', 'The next step')}</Eyebrow>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.4px] text-foreground">
                    {t('mentor.profile_incomplete_title', 'Let candidates find you')}
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    {t('mentor.profile_incomplete_desc', 'Some information is missing from your profile. Complete it to appear among the recommended mentors.')}
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => navigate('/mentor/profile')}>
                  {t('mentor.complete_profile', 'Complete the profile')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          <Panel className="!p-0">
            <p className="xs-eyebrow px-5 pb-1 pt-5">{t('mentor.quick_access', 'Quick access')}</p>
            <ul className="divide-y divide-[hsl(var(--xs-line))]">
              {shortcuts.map(({ to, icon: Icon, title, body }) => (
                <li key={to}>
                  <Link to={to} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-foreground">{title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{body}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <MentorCVAccessSection mentorId={mentorProfile.id} />

          <details className="xs-panel group !p-0">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-semibold text-foreground">
              {t('mentor.how_it_works_title', 'How the mentor portal works')}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-5 border-t border-[hsl(var(--xs-line))] px-5 py-5 sm:grid-cols-2">
              {steps.map((s) => (
                <div key={s.n}>
                  <p className="font-mono text-[12px] font-semibold text-primary">{s.n}</p>
                  <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </MentorLayout>
  );
}
