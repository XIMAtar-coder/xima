import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  BookOpen, Upload, ClipboardCheck, Sparkles, Calendar,
  Cpu, MessageCircle, Lightbulb, Zap, ArrowRight,
} from 'lucide-react';
import AssessmentLayers from '@/components/how-it-works/AssessmentLayers';

const XIMATAR_ANIMALS = [
  'bear', 'bee', 'cat', 'chameleon', 'dolphin', 'elephant',
  'fox', 'horse', 'lion', 'owl', 'parrot', 'wolf',
];

// Drive, Computational, Knowledge, Communication, Creativity
// Existing i18n order: 1 Computational, 2 Communication, 3 Knowledge, 4 Creativity, 5 Drive
const PILLAR_ICONS = [Cpu, MessageCircle, BookOpen, Lightbulb, Zap];

const STEP_ICONS = [Upload, ClipboardCheck, Sparkles, Calendar];

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
            <h1 className="text-[32px] md:text-[40px] xl:text-[52px] font-bold leading-[1.1] mb-5 whitespace-pre-line text-foreground">
              {t('howItWorks.hero_headline')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-5 max-w-xl">
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
          <div className="relative">
            <AssessmentLayers
              labels={{
                l1: t('howItWorks.pipeline_l1_badge'),
                l2: t('howItWorks.pipeline_l2_badge'),
                l3: t('howItWorks.pipeline_l3_badge'),
              }}
            />
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
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => {
              const Icon = STEP_ICONS[n - 1];
              return (
                <Card key={n} className="p-6 text-center hover:shadow-lg transition-shadow group glass-surface-static">
                  <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 group-hover:border-primary/40 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-xs font-mono text-primary/70 mb-2">0{n}</div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">
                    {t(`howItWorks.step${n}_title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(`howItWorks.step${n}_body`)}
                  </p>
                </Card>
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
              const isLive = level !== 'l3';
              return (
                <Card key={level} className="p-7 hover:shadow-lg transition-shadow glass-surface-static">
                  <span className={`inline-block text-xs font-mono px-3 py-1 rounded-full mb-4 ${
                    isLive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {t(`howItWorks.pipeline_${level}_badge`)}
                  </span>
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
                      <Icon size={20} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {t(`howItWorks.pillar${n}_name`)}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {t(`howItWorks.pillar${n}_body`)}
                  </p>
                  <div className="space-y-2 text-xs">
                    <p className="text-foreground/90 bg-primary/5 border border-primary/15 rounded-md px-3 py-2">
                      ✓ {t(`howItWorks.pillar${n}_strength`)}
                    </p>
                    <p className="text-foreground/90 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2">
                      ⚡ {t(`howItWorks.pillar${n}_friction`)}
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
                <div className="w-20 h-20 rounded-full overflow-hidden border border-primary/20 bg-primary/5 transition-transform group-hover:scale-105">
                  <img
                    src={`/ximatars/${animal}.png`}
                    alt={animal}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs text-muted-foreground capitalize">{animal}</span>
              </div>
            ))}
          </div>
          <p className="italic text-center text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.identity_portability')}
          </p>
        </section>

        {/* ── CTA ── */}
        <Card className="p-8 md:p-12 text-center glass-surface-static border-2 border-primary/20 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground whitespace-pre-line">
            {t('howItWorks.cta_headline')}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            {t('howItWorks.cta_body')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 px-8">
              <Link to="/ximatar-journey">
                {t('howItWorks.cta_button')}
                <ArrowRight size={20} className="ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/assessment-guide">
                {t('howItWorks.cta_secondary')}
              </Link>
            </Button>
          </div>
        </Card>

      </div>
    </LandingLayout>
  );
};

export default HowItWorks;
