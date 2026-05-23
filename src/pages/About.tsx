import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import Seo from '@/components/Seo';
import {
  Network,
  Hexagon,
  ShieldCheck,
  Zap,
  Lightbulb,
  BookOpen,
  MessageCircle,
  Cpu,
  Check,
  Users,
  Layers,
  Globe2,
  Target,
} from 'lucide-react';

const XIMATARS = [
  'bear', 'bee', 'cat', 'chameleon', 'dolphin', 'elephant',
  'fox', 'horse', 'lion', 'owl', 'parrot', 'wolf',
] as const;

const PILLARS = [
  { key: 'drive', Icon: Zap },
  { key: 'creativity', Icon: Lightbulb },
  { key: 'knowledge', Icon: BookOpen },
  { key: 'communication', Icon: MessageCircle },
  { key: 'computation', Icon: Cpu },
] as const;

const NAVY = '#071E3A';
const NAVY_DEEP = '#0A2A5E';
const BLUE = '#0B6BFF';

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p
    className={`text-xs font-mono uppercase tracking-[0.2em] mb-3 ${className}`}
    style={{ color: BLUE }}
  >
    {children}
  </p>
);

const About: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <LandingLayout>
      <Seo
        title="Chi Siamo — XIMA"
        description="XIMA nasce dall'ingegneria di precisione di AlphaLink Engineering. Cinque pilastri, dodici archetipi, zero proxy demografici."
        path="/about"
      />

      {/* SECTION 1 — Hero */}
      <section className="px-6 lg:px-10 pt-16 md:pt-24 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <Label>{t('about.hero.label')}</Label>
            <h1
              className="font-bold text-foreground leading-[1.1]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 46px)', letterSpacing: '-0.02em' }}
            >
              {t('about.hero.titlePre')}
              <span style={{ color: BLUE }}>{t('about.hero.titleAccent1')}</span>
              {t('about.hero.titleMid')}
              <span style={{ color: BLUE }}>{t('about.hero.titleAccent2')}</span>
              {t('about.hero.titlePost')}
            </h1>
            <p
              className="mt-6 text-muted-foreground"
              style={{ fontSize: 18, lineHeight: 1.65, maxWidth: 520 }}
            >
              {t('about.hero.body')}
            </p>
            <blockquote
              className="mt-8 italic text-muted-foreground"
              style={{
                borderLeft: `3px solid ${BLUE}`,
                paddingLeft: 16,
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 520,
              }}
            >
              {t('about.hero.quote')}
            </blockquote>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/images/assessment-layers.png"
              alt=""
              aria-hidden="true"
              className="w-full max-w-[400px] h-auto"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 — L'Origine */}
      <section className="px-6 lg:px-10 pb-12 md:pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-10 items-start">
          {/* Image / placeholder (40%) */}
          <div className="md:col-span-2">
            <div
              className="w-full rounded-2xl overflow-hidden relative"
              style={{
                aspectRatio: '4 / 3',
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
                boxShadow: '0 24px 60px rgba(7,30,58,0.25)',
              }}
            >
              {/* subtle blueprint grid pattern */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(11,107,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(11,107,255,0.18) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                  opacity: 0.5,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 40%, rgba(11,107,255,0.35) 0%, transparent 60%)',
                }}
              />
            </div>
          </div>
          {/* Text (60%) */}
          <div className="md:col-span-3">
            <Label>{t('about.origin.label')}</Label>
            <h2
              className="font-bold text-foreground whitespace-pre-line"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              {t('about.origin.title')}
            </h2>
            <div className="mt-5 space-y-4">
              {(['p1', 'p2', 'p3'] as const).map((k) => (
                <p key={k} className="text-muted-foreground" style={{ fontSize: 16, lineHeight: 1.65 }}>
                  {t(`about.origin.${k}`)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Principles strip */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="rounded-2xl border border-border bg-card grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {[
              { Icon: Network, key: 'p1' },
              { Icon: Hexagon, key: 'p2' },
              { Icon: ShieldCheck, key: 'p3' },
            ].map(({ Icon, key }) => (
              <div key={key} className="flex items-center gap-4 px-6 py-6 md:py-7">
                <Icon className="flex-shrink-0" size={28} strokeWidth={1.5} style={{ color: BLUE }} />
                <p className="font-semibold text-foreground" style={{ fontSize: 15, lineHeight: 1.35 }}>
                  {t(`about.principles.${key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Il Problema */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div
          className="max-w-[1200px] mx-auto rounded-2xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-8 md:px-12 py-10 md:py-12">
            <div>
              <p
                className="text-xs font-mono uppercase tracking-[0.2em] mb-3"
                style={{ color: '#5BA0FF' }}
              >
                {t('about.problem.label')}
              </p>
              <h2
                className="font-bold whitespace-pre-line"
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(26px, 3.4vw, 36px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {t('about.problem.title')}
              </h2>
              <p
                className="mt-4"
                style={{ color: 'rgba(255,255,255,0.82)', fontSize: 18, lineHeight: 1.6 }}
              >
                {t('about.problem.body')}
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <img
                src="/images/problem-cv-breaking.png"
                alt=""
                aria-hidden="true"
                className="w-full max-w-[300px] h-auto"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Il Modello */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <Label className="!text-center">{t('about.model.label')}</Label>
            <h2
              className="font-bold text-foreground"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              {t('about.model.title')}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PILLARS.map(({ key, Icon }) => (
              <div
                key={key}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col"
              >
                <Icon size={28} strokeWidth={1.5} style={{ color: BLUE }} />
                <h3 className="mt-4 font-bold text-foreground" style={{ fontSize: 16 }}>
                  {t(`about.model.${key}_name`)}
                </h3>
                <p
                  className="mt-2 text-muted-foreground"
                  style={{ fontSize: 14, lineHeight: 1.55 }}
                >
                  {t(`about.model.${key}_body`)}
                </p>
              </div>
            ))}
          </div>
          <p
            className="mt-10 italic text-center text-muted-foreground mx-auto"
            style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 720, color: BLUE }}
          >
            {t('about.model.quote')}
          </p>
        </div>
      </section>

      {/* SECTION 6 — 12 Archetipi (tinted band) */}
      <section
        className="px-6 lg:px-10 py-16 md:py-20"
        style={{ background: 'hsl(var(--muted) / 0.4)' }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <Label>{t('about.archetypes.label')}</Label>
            <h2
              className="font-bold text-foreground whitespace-pre-line"
              style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.01em' }}
            >
              {t('about.archetypes.title')}
            </h2>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-4 md:gap-3">
            {XIMATARS.map((name) => (
              <div key={name} className="flex flex-col items-center">
                <div
                  className="rounded-full overflow-hidden border-2"
                  style={{
                    width: 72,
                    height: 72,
                    borderColor: 'hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                >
                  <img
                    src={`/ximatars/${name}.png`}
                    alt={t(`about.archetypes.name_${name}`)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="mt-2 text-xs font-medium text-foreground">
                  {t(`about.archetypes.name_${name}`)}
                </span>
              </div>
            ))}
          </div>
          <p
            className="mt-10 text-muted-foreground mx-auto text-center"
            style={{ fontSize: 16, lineHeight: 1.65, maxWidth: 800 }}
          >
            {t('about.archetypes.body')}
          </p>
        </div>
      </section>

      {/* SECTION 7 — Le Persone dietro XIMA */}
      <section className="px-6 lg:px-10 py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <Label>{t('about.team.label')}</Label>
            <h2
              className="font-bold text-foreground"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              {t('about.team.title')}
            </h2>
            <p
              className="mt-3 text-muted-foreground"
              style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 720 }}
            >
              {t('about.team.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['pietro', 'daniel'] as const).map((p) => (
              <div
                key={p}
                className="rounded-2xl border border-border bg-card p-6 md:p-7 flex gap-5 items-start"
              >
                <img
                  src={`/avatars/${p === 'pietro' ? 'pietro-cozzi' : 'daniel-cracau'}.jpg`}
                  alt={t(`about.team.${p}_name`)}
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground" style={{ fontSize: 18 }}>
                    {t(`about.team.${p}_name`)}
                  </h3>
                  <p className="mt-0.5 font-medium" style={{ color: BLUE, fontSize: 14 }}>
                    {t(`about.team.${p}_role`)}
                  </p>
                  <p
                    className="mt-3 text-muted-foreground"
                    style={{ fontSize: 14, lineHeight: 1.6 }}
                  >
                    {t(`about.team.${p}_bio`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 — Stats strip */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="rounded-2xl border border-border bg-card grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
            {[
              { Icon: Users, vKey: 'team_value', lKey: 'team_label' },
              { Icon: Users, vKey: 'people_value', lKey: 'people_label' },
              { Icon: Layers, vKey: 'disciplines_value', lKey: 'disciplines_label' },
              { Icon: Globe2, vKey: 'countries_value', lKey: 'countries_label' },
              { Icon: Target, vKey: 'mission_value', lKey: 'mission_label', subKey: 'mission_sub' as const },
            ].map(({ Icon, vKey, lKey, subKey }) => (
              <div key={vKey} className="flex items-center gap-4 px-6 py-6">
                <Icon className="flex-shrink-0 text-muted-foreground" size={26} strokeWidth={1.5} />
                <div className="min-w-0">
                  <div className="font-bold leading-none" style={{ color: BLUE, fontSize: 26 }}>
                    {t(`about.stats.${vKey}`)}
                  </div>
                  <div className="mt-1.5 text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.3 }}>
                    {t(`about.stats.${lKey}`)}
                  </div>
                  {subKey && (
                    <div className="mt-1 text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.3 }}>
                      {t(`about.stats.${subKey}`)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9 — Due Entrate. Un Sistema. */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10">
            <Label>{t('about.value.label')}</Label>
            <h2
              className="font-bold text-foreground"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              {t('about.value.title')}
            </h2>
            <p
              className="mt-3 text-muted-foreground"
              style={{ fontSize: 18, lineHeight: 1.6, maxWidth: 720 }}
            >
              {t('about.value.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['candidates', 'business'] as const).map((side) => (
              <div
                key={side}
                className="rounded-2xl border border-border bg-card p-6 md:p-7"
              >
                <p
                  className="text-xs font-mono uppercase tracking-[0.2em] mb-4"
                  style={{ color: BLUE }}
                >
                  {t(`about.value.${side}_label`)}
                </p>
                <ul className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check
                        className="flex-shrink-0 mt-0.5"
                        size={18}
                        strokeWidth={2.5}
                        style={{ color: BLUE }}
                      />
                      <span className="text-foreground" style={{ fontSize: 14, lineHeight: 1.55 }}>
                        {t(`about.value.${side}_${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10 — Final CTA (shared) */}
      <LandingFinalCTA />
    </LandingLayout>
  );
};

export default About;
