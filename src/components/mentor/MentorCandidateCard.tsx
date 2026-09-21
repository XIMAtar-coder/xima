import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/business/XsBits';
import { mentorAvatarUrl, pillarLabel } from './mentorBits';
import { cn } from '@/lib/utils';

export interface MentorCardData {
  name: string;
  title?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  specialties?: string[] | null;
  xima_pillars?: string[] | null;
  first_session_expectations?: string | null;
}

/**
 * The mentor exactly as a candidate sees them. Rendered both in the profile
 * editor (live, beside the form) and on the preview page, so what the mentor
 * checks is the same component the candidate gets — not a lookalike.
 *
 * Missing fields are shown as what they are: an empty space the candidate
 * would see. The old preview filled the gap with a fixed "85% compatibility"
 * for every mentor without reviews, which was a number nobody had computed.
 */
export const MentorCandidateCard: React.FC<{ data: MentorCardData; className?: string }> = ({ data, className }) => {
  const { t } = useTranslation();
  const avatar = mentorAvatarUrl(data.profile_image_url);

  const Missing: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="rounded-lg border border-dashed border-[hsl(var(--xs-line))] bg-muted/30 p-3 text-[13px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );

  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {avatar ? (
            <img src={avatar} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {data.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold leading-tight text-foreground">{data.name}</p>
          {data.title
            ? <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{data.title}</p>
            : <p className="mt-0.5 text-[13px] text-muted-foreground">{t('mentor.card_no_title', 'No professional title yet')}</p>}
        </div>
      </div>

      {data.bio
        ? <p className="text-[13.5px] leading-relaxed text-foreground">{data.bio}</p>
        : <Missing>{t('mentor.card_no_bio', 'Your bio goes here: two or three lines on how you work and with whom.')}</Missing>}

      {data.specialties && data.specialties.length > 0 && (
        <div>
          <p className="xs-eyebrow mb-1.5">{t('mentor.specialties_label', 'Specialties')}</p>
          <div className="flex flex-wrap gap-1.5">
            {data.specialties.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}
            {data.specialties.length > 3 && <Chip>+{data.specialties.length - 3}</Chip>}
          </div>
        </div>
      )}

      {data.xima_pillars && data.xima_pillars.length > 0 && (
        <div>
          <p className="xs-eyebrow mb-1.5">{t('mentor.card_pillars', 'Pillars you accompany')}</p>
          <div className="flex flex-wrap gap-1.5">
            {data.xima_pillars.map((p) => <Chip key={p}>{pillarLabel(t, p)}</Chip>)}
          </div>
        </div>
      )}

      <div>
        <p className="xs-eyebrow mb-1.5">{t('mentor.first_session_label', 'At the first session')}</p>
        {data.first_session_expectations
          ? <p className="text-[13.5px] leading-relaxed text-foreground">{data.first_session_expectations}</p>
          : <Missing>{t('mentor.card_no_expectations', 'Not set yet. It is the question everyone asks themselves before choosing.')}</Missing>}
      </div>

      <Button className="w-full" disabled>{t('mentor.card_select', 'Choose this mentor')}</Button>
    </div>
  );
};

export default MentorCandidateCard;
