import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  BookOpen, Upload, ClipboardCheck, Hexagon, Users,
  Cpu, MessageCircle, Lightbulb, Zap, ArrowRight,
  Brain, Swords, Video,
} from 'lucide-react';

const XIMATAR_ANIMALS = [
  'bear', 'bee', 'cat', 'chameleon', 'dolphin', 'elephant',
  'fox', 'horse', 'lion', 'owl', 'parrot', 'wolf',
];

// i18n order: 1 Computational, 2 Communication, 3 Knowledge, 4 Creativity, 5 Drive
const PILLAR_ICONS = [Cpu, MessageCircle, BookOpen, Lightbulb, Zap];
const STEP_ICONS = [Upload, ClipboardCheck, Hexagon, Users];
const PIPELINE_ICONS = { l1: Brain, l2: Swords, l3: Video } as const;

const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <LandingLayout>
      <div className="container max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-16">

        {/* ── HERO ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-20 md:mb-28">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-primary mb-4 block">
              {t('howItWorks.eyebrow')}
            </span>
            <h1 className="text-[32px] md:text-[42px] xl:text-[52px] font-bold leading-[1.1] mb-5 whitespace-pre-line text-foreground">
              {t('howItWorks.hero_headline')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-5 max-w-xl leading-[1.65]">
              {t('howItWorks.hero_subheadline')}
            </p>
            <p className="italic text-base md:text-lg text-muted-foreground mb-8 max-w-xl">
              {t('howItWorks.hero_pullquote')}
            </p>
            <Button variant="outline" asChild>
              <Link to="/assessment-guide">
                <BookOpen className="w-4 h-4 mr-2" />
                {t('howItWorks.hero_cta')}
              </Link>
            </Button>
          </div>

          {/* 3D layers PNG with absolute-positioned L1/L2/L3 labels */}
          <div className="relative w-full max-w-md mx-auto">
            <img
              src="/images/assessment-layers.png"
              alt=""
              className="w-full h-auto select-none"
              draggable={false}
            />
            {/* L3 — top platform */}
            <div className="absolute right-0 top-[15%] flex items-center gap-2">
              <span className="text-foreground font-bold text-lg">L3</span>
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                Live
              </span>
            </div>
            {/* L2 — middle platform */}
            <div className="absolute right-0 top-[45%] flex items-center gap-2">
              <span className="text-foreground font-bold text-lg">L2</span>
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                Live
              </span>
            </div>
            {/* L1 — bottom platform */}
            <div className="absolute right-0 bottom-[15%] flex items-center gap-2">
              <span className="text-foreground font-bold text-lg">L1</span>
              <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                Live
              </span>
            </div>
          </div>
        </section>

        {/* ── JOURNEY ── */}
        <section className="mb-20 md:mb-28">
          <div className="text-center mb-10">
            <span className="font-mono text-xs uppercase tracking-widest text-primary mb-2 block">
              {t('howItWorks.journey_label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              {t('howItWorks.journey_headline')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('howItWorks.journey_subheadline')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4 relative">
            {[1, 2, 3, 4].map((n) => {
              const Icon = STEP_ICONS[n - 1];
              return (
                <div key={n} className="relative flex flex-col items-center text-center">
                  {/* Dotted connector to next step (desktop) */}
                  {n < 4 && (
                    <div
                      aria-hidden
                      className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] border-t-2 border-dashed"
                      style={{ borderColor: 'hsl(var(--primary) / 0.25)' }}
                    />
                  )}
                  <div className="relative z-10 w-16 h-16 flex items-center justify-center rounded-full bg-background border border-primary/15 shadow-sm mb-4">
                    <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="text-sm font-bold text-primary mb-1">0{n}</div>
                  <h3 className="text-base font-semibold mb-2 text-foreground">
                    {t(`howItWorks.step${n}_title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">
                    {t(`howItWorks.step${n}_body`)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PIPELINE ── */}
        <section className="mb-20 md:mb-28">
          <div className="text-center mb-10">
            <span className="font-mono text-xs uppercase tracking-widest text-primary mb-2 block">
              {t('howItWorks.pipeline_label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              {t('howItWorks.pipeline_headline')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('howItWorks.pipeline_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['l1', 'l2', 'l3'] as const).map((level) => {
              const Icon = PIPELINE_ICONS[level];
              const badgeClass =
                level === 'l1'
                  ? 'bg-primary text-primary-foreground'
                  : level === 'l2'
                  ? 'bg-teal-500 text-white'
                  : 'bg-primary text-primary-foreground';
              return (
                <Card key={level} className="p-7 hover:shadow-lg transition-shadow glass-surface-static relative">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-block text-xs font-mono px-3 py-1 rounded-full ${badgeClass}`}>
                      {t(`howItWorks.pipeline_${level}_badge`)}
                    </span>
                    <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    {t(`howItWorks.pipeline_${level}_title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`howItWorks.pipeline_${level}_body`)}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── PILLARS ── */}
        <section className="mb-20 md:mb-28">
          <div className="text-center mb-10">
            <span className="font-mono text-xs uppercase tracking-widest text-primary mb-2 block">
              {t('howItWorks.pillars_label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground whitespace-pre-line">
              {t('howItWorks.pillars_headline')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorks.pillars_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5].map((n) => {
              const Icon = PILLAR_ICONS[n - 1];
              return (
                <Card key={n} className="p-6 hover:shadow-lg transition-shadow glass-surface-static">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                      <Icon size={20} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {t(`howItWorks.pillar${n}_name`)}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {t(`howItWorks.pillar${n}_body`)}
                  </p>
                  <div className="space-y-2 text-sm">
                    <p style={{ color: '#0B6BFF' }}>
                      {t(`howItWorks.pillar${n}_strength`)}
                    </p>
                    <p style={{ color: '#D97706' }}>
                      {t(`howItWorks.pillar${n}_friction`)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <p className="text-muted-foreground">
              {t('howItWorks.pillars_archetype_logic')}
            </p>
            <p className="italic text-lg text-muted-foreground">
              {t('howItWorks.pillars_pullquote')}
            </p>
          </div>
        </section>

        {/* ── ARCHETYPES ── */}
        <section className="mb-20 md:mb-28">
          <div className="text-center mb-10">
            <span className="font-mono text-xs uppercase tracking-widest text-primary mb-2 block">
              {t('howItWorks.identity_label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground whitespace-pre-line">
              {t('howItWorks.identity_headline')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorks.identity_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 justify-items-center mb-8">
            {XIMATAR_ANIMALS.map((animal) => (
              <div key={animal} className="flex flex-col items-center gap-2 group">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-primary/15 bg-primary/5 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg">
                  <img
                    src={`/ximatars/${animal}.png`}
                    alt={animal}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs text-muted-foreground capitalize">{animal}</span>
              </div>
            ))}
          </div>
          <p className="italic text-center text-muted-foreground max-w-[700px] mx-auto">
            {t('howItWorks.identity_portability')}
          </p>
        </section>

      </div>

      {/* ── FINAL CTA (full-width dark gradient) ── */}
      <section
        className="relative w-full overflow-hidden mt-16"
        style={{
          background:
            'linear-gradient(135deg, #071E3A 0%, #0A2A5E 60%, #0B3D7A 100%)',
        }}
      >
        {/* subtle wave decoration */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ opacity: 0.12 }}
        >
          <path
            d="M0,180 C240,260 480,100 720,180 C960,260 1200,100 1440,180 L1440,400 L0,400 Z"
            fill="none"
            stroke="#7FB3FF"
            strokeWidth="1.5"
          />
          <path
            d="M0,240 C240,320 480,160 720,240 C960,320 1200,160 1440,240"
            fill="none"
            stroke="#7FB3FF"
            strokeWidth="1"
          />
          <path
            d="M0,120 C240,200 480,40 720,120 C960,200 1200,40 1440,120"
            fill="none"
            stroke="#7FB3FF"
            strokeWidth="1"
          />
        </svg>

        <div className="container max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-24 relative">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-12 items-center">
            <div className="md:col-span-3">
              <img
                src="/images/xima-full-white.svg"
                alt="XIMA"
                className="h-12 w-auto mb-6"
              />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 whitespace-pre-line leading-[1.15]">
                {t('howItWorks.cta_headline')}
              </h2>
              <p className="text-base md:text-lg text-white/70 max-w-xl leading-relaxed">
                {t('howItWorks.cta_body')}
              </p>
            </div>
            <div className="md:col-span-2 flex flex-col gap-4 w-full">
              <Button
                asChild
                size="lg"
                className="w-full bg-[#0B6BFF] hover:bg-[#0B6BFF]/90 text-white shadow-[0_4px_16px_rgba(11,107,255,0.35)]"
              >
                <Link to="/ximatar-journey">
                  {t('howItWorks.cta_button')}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full bg-transparent border-white/70 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/business">
                  {t('howItWorks.cta_secondary')}
                  <ArrowRight size={20} className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default HowItWorks;
