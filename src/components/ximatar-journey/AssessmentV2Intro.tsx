import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadAloudButton } from '@/components/candidate/audio/ReadAloudButton';
import { Eyebrow } from '@/components/layout/PageHeader';

/**
 * One screen before the first question: what this is, how long it takes, and
 * that there are no right answers.
 *
 * Roberta went in without knowing what she was walking into. A video would
 * have been the heavy answer — six fields, three languages, impossible to
 * correct — so the three kinds of screen are drawn instead: a scenario, a
 * puzzle, the climb. They are the real screens in miniature, they weigh
 * nothing and they are translated like everything else.
 */

const Card: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <figure className="m-0 flex-1">
    <div className="grid h-[96px] place-items-center rounded-lg border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] p-2">
      {children}
    </div>
    <figcaption className="mt-2 text-[12.5px] leading-[1.4] text-muted-foreground">{label}</figcaption>
  </figure>
);

/** A scenario: the question line and four answers. */
const MiniQuestion = () => (
  <svg viewBox="0 0 100 62" className="h-full w-full" aria-hidden="true">
    <rect x={6} y={6} width={64} height={4} rx={2} fill="#162e43" opacity={0.75} />
    <rect x={6} y={13} width={44} height={4} rx={2} fill="#162e43" opacity={0.4} />
    {[24, 34, 44, 54].map((y, i) => (
      <g key={y}>
        <rect x={6} y={y - 4} width={88} height={8} rx={3} fill="#fff" stroke={i === 1 ? 'hsl(var(--primary))' : 'hsl(var(--xs-line))'} strokeWidth={i === 1 ? 1.4 : 1} />
        <circle cx={12} cy={y} r={2.2} fill="none" stroke={i === 1 ? 'hsl(var(--primary))' : '#9aa5b1'} strokeWidth={1.2} />
        {i === 1 && <circle cx={12} cy={y} r={1.1} fill="hsl(var(--primary))" />}
        <rect x={18} y={y - 1.5} width={i === 1 ? 62 : 48} height={3} rx={1.5} fill="#162e43" opacity={0.35} />
      </g>
    ))}
  </svg>
);

/** A break: a small puzzle. */
const MiniPuzzle = () => (
  <svg viewBox="0 0 62 62" className="h-full w-full" aria-hidden="true">
    <rect x={1} y={1} width={60} height={60} rx={6} fill="#fff" stroke="#162e43" strokeWidth={1.6} />
    {[1, 2, 3, 4, 5].map((i) => (
      <g key={i} stroke="hsl(var(--xs-line))" strokeWidth={0.8}>
        <line x1={i * 10 + 1} y1={1} x2={i * 10 + 1} y2={61} />
        <line x1={1} y1={i * 10 + 1} x2={61} y2={i * 10 + 1} />
      </g>
    ))}
    <rect x={4} y={24} width={18} height={8} rx={2.5} fill="hsl(var(--primary))" fillOpacity={0.18} stroke="hsl(var(--primary))" strokeWidth={1.4} />
    <rect x={34} y={4} width={8} height={28} rx={2.5} fill="#eef0f3" stroke="#162e43" strokeWidth={1.2} />
    <rect x={44} y={34} width={8} height={18} rx={2.5} fill="#eef0f3" stroke="#162e43" strokeWidth={1.2} />
    <rect x={59} y={24} width={3} height={8} rx={1.5} fill="hsl(var(--primary))" />
  </svg>
);

/** The climb: pipes that make a picture. */
const MiniSalita = () => (
  <svg viewBox="0 0 62 62" className="h-full w-full" aria-hidden="true">
    {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
      <rect key={`${r}${c}`} x={c * 20 + 2} y={r * 20 + 2} width={17} height={17} rx={4}
        fill="#fff" stroke="hsl(var(--xs-line))" strokeWidth={1} />
    )))}
    <g stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" fill="none">
      <path d="M10.5 10.5 H30.5 M30.5 10.5 H50.5" />
      <path d="M10.5 10.5 V30.5 M50.5 10.5 V30.5" />
      <path d="M10.5 30.5 V50.5 M50.5 30.5 V50.5" />
      <path d="M10.5 50.5 H30.5 M30.5 50.5 H50.5" />
    </g>
  </svg>
);

interface Props { total: number; onStart: () => void }

export const AssessmentV2Intro: React.FC<Props> = ({ total, onStart }) => {
  const { t } = useTranslation();
  const lines = [t('assessmentV2Intro.l1'), t('assessmentV2Intro.l2', { count: total }), t('assessmentV2Intro.l3')];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>{t('assessmentV2Intro.eyebrow')}</Eyebrow>
        <ReadAloudButton text={[t('assessmentV2Intro.title'), ...lines].join('. ')} />
      </div>
      <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.5px] text-foreground sm:text-[28px]">
        {t('assessmentV2Intro.title')}
      </h2>
      <ul className="mt-3 grid gap-1.5 text-[15px] leading-[1.5] text-foreground">
        {lines.map((l) => (
          <li key={l} className="flex gap-2.5">
            <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{l}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-3 sm:flex-nowrap">
        <Card label={t('assessmentV2Intro.cap_question')}><MiniQuestion /></Card>
        <Card label={t('assessmentV2Intro.cap_break')}><MiniPuzzle /></Card>
        <Card label={t('assessmentV2Intro.cap_climb')}><MiniSalita /></Card>
      </div>

      <p className="mt-4 rounded-lg border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] px-4 py-3 text-[13.5px] leading-[1.5] text-foreground">
        {t('assessmentV2Intro.honest')}
      </p>

      <div className="mt-5 flex justify-end border-t border-[hsl(var(--xs-line))] pt-4">
        <Button size="lg" onClick={onStart}>
          {t('assessmentV2Intro.start')}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default AssessmentV2Intro;
