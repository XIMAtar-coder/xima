import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';
import {
  Users,
  Layers,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  FileText,
  ClipboardCheck,
  Sparkles,
  BarChart3,
  Globe2,
  UserCheck,
  FileSearch,
} from 'lucide-react';

const NAVY = '#071E3A';
const NAVY_DEEP = '#0A2A5E';
const BLUE = '#0B6BFF';

const XIMATAR_CANDIDATES = [
  { name: 'lion', archetype: 'Lion', code: 'C-2847', score: 92, tier: 'Alto' },
  { name: 'fox', archetype: 'Fox', code: 'C-3194', score: 88, tier: 'Alto' },
  { name: 'owl', archetype: 'Owl', code: 'C-1762', score: 76, tier: 'Medio' },
  { name: 'dolphin', archetype: 'Dolphin', code: 'C-4081', score: 64, tier: 'Medio' },
  { name: 'bear', archetype: 'Bear', code: 'C-2509', score: 48, tier: 'Basso' },
] as const;

const HERO_CANDIDATE = {
  name: 'lion',
  archetype: 'Lion',
  code: 'C-2847',
  pillars: [
    { key: 'drive', label: 'Drive', value: 8.4 },
    { key: 'computational', label: 'Computazionale', value: 7.2 },
    { key: 'knowledge', label: 'Knowledge', value: 6.8 },
    { key: 'communication', label: 'Comunicazione', value: 9.1 },
    { key: 'creativity', label: 'Creatività', value: 8.6 },
  ],
} as const;

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p
    className={`text-xs font-mono uppercase tracking-[0.2em] mb-3 ${className}`}
    style={{ color: BLUE }}
  >
    {children}
  </p>
);

const tierColor = (tier: string) => {
  if (tier === 'Alto') return '#10B981';
  if (tier === 'Medio') return '#F59E0B';
  return '#EF4444';
};

const Business: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <LandingLayout>
      <Seo
        title="XIMA per le Aziende — Assumi sui segnali, non sui CV"
        description="Psicometria enterprise per le PMI. Profili comportamentali validati, sfide AI per ruolo, selezione filtrata per adattamento reale."
        path="/business"
      />

      {/* SECTION 1 — Hero */}
      <section className="px-6 lg:px-10 pt-16 md:pt-24 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <Label>{t('business.eyebrow')}</Label>
            <h1
              className="font-bold text-foreground leading-[1.1] whitespace-pre-line"
              style={{ fontSize: 'clamp(32px, 4.5vw, 46px)', letterSpacing: '-0.02em' }}
            >
              {t('business.hero_headline')}
            </h1>
            <p
              className="mt-6 text-muted-foreground"
              style={{ fontSize: 17, lineHeight: 1.65, maxWidth: 520 }}
            >
              {t('business.hero_subheadline')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/business/register')}
                className="inline-flex items-center gap-2 font-semibold transition-all"
                style={{
                  background: BLUE,
                  color: '#FFFFFF',
                  borderRadius: 12,
                  padding: '14px 24px',
                  fontSize: 15,
                  boxShadow: '0 14px 32px rgba(11,107,255,0.28)',
                }}
              >
                {t('business.hero_cta_primary')}
              </button>
              <button
                onClick={() => navigate('/business/login')}
                className="inline-flex items-center gap-2 font-semibold transition-all border border-border bg-card text-foreground"
                style={{ borderRadius: 12, padding: '14px 24px', fontSize: 15 }}
              >
                {t('business.hero_cta_secondary')}
              </button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                'Nessuna carta di credito',
                'Setup in 2 minuti',
                'Primo candidato in 24h',
              ].map((s) => (
                <span key={s} className="flex items-center gap-2">
                  <Check size={16} style={{ color: BLUE }} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Hero card — anon candidate + landing-style pentagon radar */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="rounded-[28px] p-6 w-full max-w-[480px] relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 30px 70px rgba(7,30,58,0.35)',
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    <img
                      src={`/ximatars/${HERO_CANDIDATE.name}.png`}
                      alt={HERO_CANDIDATE.archetype}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="font-semibold font-mono text-white" style={{ fontSize: 14 }}>
                      Candidato #{HERO_CANDIDATE.code}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      XIMAtar · {HERO_CANDIDATE.archetype} — anonimo fino all'offerta
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#34D399' }}
                >
                  ● 8.6/10
                </span>
              </div>

              {/* Pentagon radar — landing-style glass */}
              <div className="mt-3 relative z-10">
                <svg viewBox="0 0 380 270" className="w-full h-auto" style={{ overflow: 'visible' }}>
                  {(() => {
                    const cx = 190;
                    const cy = 130;
                    const maxR = 78;
                    const max = 10;
                    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                    const point = (i: number, r: number) => ({
                      x: cx + r * Math.cos(angle(i)),
                      y: cy + r * Math.sin(angle(i)),
                    });
                    const ringPath = (r: number) =>
                      HERO_CANDIDATE.pillars
                        .map((_, i) => {
                          const p = point(i, r);
                          return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                        })
                        .join(' ') + 'Z';
                    const dataPath =
                      HERO_CANDIDATE.pillars
                        .map((p, i) => {
                          const pt = point(i, (p.value / max) * maxR);
                          return `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                        })
                        .join(' ') + 'Z';
                    return (
                      <>
                        {[0.25, 0.5, 0.75, 1].map((s, idx) => (
                          <path
                            key={idx}
                            d={ringPath(maxR * s)}
                            fill="none"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth={1}
                          />
                        ))}
                        {HERO_CANDIDATE.pillars.map((_, i) => {
                          const p = point(i, maxR);
                          return (
                            <line
                              key={i}
                              x1={cx}
                              y1={cy}
                              x2={p.x}
                              y2={p.y}
                              stroke="rgba(255,255,255,0.14)"
                              strokeWidth={1}
                            />
                          );
                        })}
                        <path
                          d={dataPath}
                          fill="rgba(11,107,255,0.35)"
                          stroke="rgba(140,190,255,0.95)"
                          strokeWidth={1.5}
                          style={{ filter: 'drop-shadow(0 0 8px rgba(11,107,255,0.5))' }}
                        />
                        {HERO_CANDIDATE.pillars.map((p, i) => {
                          const pt = point(i, (p.value / max) * maxR);
                          return (
                            <circle
                              key={i}
                              cx={pt.x}
                              cy={pt.y}
                              r={3.5}
                              fill="white"
                              style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.9))' }}
                            />
                          );
                        })}
                        <foreignObject x={cx - 14} y={cy - 14} width={28} height={28}>
                          <img
                            src="/images/xima-symbol-white.svg"
                            alt=""
                            style={{ width: '100%', height: '100%', opacity: 0.95 }}
                          />
                        </foreignObject>
                        {HERO_CANDIDATE.pillars.map((p, i) => {
                          const pt = point(i, maxR + 22);
                          const anchor =
                            pt.x < cx - 5 ? 'end' : pt.x > cx + 5 ? 'start' : 'middle';
                          return (
                            <g key={i}>
                              <text
                                x={pt.x}
                                y={pt.y - 4}
                                textAnchor={anchor}
                                fill="white"
                                fontSize={12}
                                fontWeight={600}
                                opacity={0.95}
                              >
                                {p.value.toFixed(1)}
                              </text>
                              <text
                                x={pt.x}
                                y={pt.y + 9}
                                textAnchor={anchor}
                                fill="white"
                                fontSize={9.5}
                                opacity={0.7}
                              >
                                {p.label}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Bottom stats strip */}
              <div
                className="mt-4 rounded-2xl p-4 relative z-10 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Adattamento al ruolo
                    </span>
                    <span className="font-bold text-white" style={{ fontSize: 18 }}>92%</span>
                  </div>
                  <div
                    className="h-1.5 mt-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                  >
                    <div className="h-full" style={{ width: '92%', background: '#5BA0FF' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Rischio di Attrito
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.18)', color: '#34D399' }}
                  >
                    ● Basso
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Sfida L2 — Product Designer
                    </span>
                    <span className="font-bold text-white" style={{ fontSize: 16 }}>84%</span>
                  </div>
                  <div
                    className="h-1.5 mt-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.10)' }}
                  >
                    <div className="h-full" style={{ width: '84%', background: '#5BA0FF' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* SECTION 2 — Why XIMA */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <Label className="!text-center">{t('business.why_label')}</Label>
            <h2
              className="font-bold text-foreground whitespace-pre-line"
              style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.01em' }}
            >
              {t('business.why_headline')}
            </h2>
            <p
              className="mt-4 text-muted-foreground mx-auto"
              style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 760 }}
            >
              {t('business.why_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: Users, n: 1 },
              { Icon: Layers, n: 2 },
              { Icon: ShieldCheck, n: 3 },
              { Icon: Building2, n: 4 },
            ].map(({ Icon, n }) => (
              <div
                key={n}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col"
              >
                <Icon size={28} strokeWidth={1.5} style={{ color: BLUE }} />
                <h3
                  className="mt-4 font-bold text-foreground"
                  style={{ fontSize: 16, lineHeight: 1.3 }}
                >
                  {t(`business.feature${n}_title`)}
                </h3>
                <p
                  className="mt-3 text-muted-foreground"
                  style={{ fontSize: 14, lineHeight: 1.6 }}
                >
                  {t(`business.feature${n}_body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — Pipeline */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <Label>{t('business.pipeline_label')}</Label>
            <h2
              className="font-bold text-foreground"
              style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.01em' }}
            >
              {t('business.pipeline_headline')}
            </h2>
            <p
              className="mt-4 text-muted-foreground"
              style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 520 }}
            >
              {t('business.pipeline_subheadline')}
            </p>

            {/* Icon row */}
            <div className="mt-8 flex items-center gap-2">
              {[FileText, ClipboardCheck, Sparkles, BarChart3].map((Ic, i) => (
                <React.Fragment key={i}>
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 48,
                      height: 48,
                      background: i === 0 ? BLUE : 'rgba(11,107,255,0.10)',
                      color: i === 0 ? '#FFFFFF' : BLUE,
                    }}
                  >
                    <Ic size={22} strokeWidth={1.8} />
                  </div>
                  {i < 3 && (
                    <div
                      className="flex-1 border-t border-dashed"
                      style={{ borderColor: 'rgba(11,107,255,0.35)' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step}>
                  <div
                    className="font-mono text-sm font-semibold"
                    style={{ color: BLUE }}
                  >
                    {t(`business.pipeline_step${step}_number`)}
                  </div>
                  <h3
                    className="mt-1 font-bold text-foreground"
                    style={{ fontSize: 15, lineHeight: 1.35 }}
                  >
                    {t(`business.pipeline_step${step}_title`)}
                  </h3>
                  <p
                    className="mt-2 text-muted-foreground"
                    style={{ fontSize: 13, lineHeight: 1.55 }}
                  >
                    {t(`business.pipeline_step${step}_body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate list mock */}
          <div
            className="rounded-2xl border border-border bg-card p-5"
            style={{ boxShadow: '0 24px 60px rgba(7,30,58,0.18)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-semibold text-foreground">Candidati</span>
              <span className="text-xs text-muted-foreground">Ordina per Adattamento ▾</span>
            </div>
            <ul className="divide-y divide-border">
              {XIMATAR_CANDIDATES.map((c) => (
                <li key={c.code} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                    <img
                      src={`/ximatars/${c.name}.png`}
                      alt={c.archetype}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate font-mono" style={{ fontSize: 13 }}>
                      Candidato #{c.code}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      XIMAtar · {c.archetype}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {c.score}%
                  </span>
                  <span
                    className="text-xs font-semibold w-16 text-right"
                    style={{ color: tierColor(c.tier) }}
                  >
                    ● {c.tier}
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="mt-3 w-full text-sm font-semibold py-2.5 rounded-lg border border-border text-foreground hover:bg-muted/40 transition"
            >
              Confronta candidati
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Pricing */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <Label className="!text-center">{t('business.pricing_label')}</Label>
            <h2
              className="font-bold text-foreground"
              style={{ fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.01em' }}
            >
              {t('business.pricing_headline')}
            </h2>
            <p
              className="mt-4 text-muted-foreground mx-auto"
              style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 640 }}
            >
              {t('business.pricing_subheadline')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((plan) => {
              const isGrowth = plan === 2;
              return (
                <div
                  key={plan}
                  className="rounded-2xl bg-card p-6 flex flex-col"
                  style={{
                    border: isGrowth ? `2px solid ${BLUE}` : '1px solid hsl(var(--border))',
                    boxShadow: isGrowth ? '0 24px 60px rgba(11,107,255,0.18)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(11,107,255,0.10)', color: BLUE }}
                    >
                      {t(`business.plan${plan}_badge`)}
                    </span>
                    {isGrowth && (
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: BLUE, color: '#FFFFFF' }}
                      >
                        {t('business.plan2_highlight')}
                      </span>
                    )}
                  </div>
                  <div className="mt-5">
                    <span
                      className="font-bold text-foreground"
                      style={{ fontSize: 36, letterSpacing: '-0.02em' }}
                    >
                      {t(`business.plan${plan}_price`)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      {t(`business.plan${plan}_period`)}
                    </span>
                  </div>
                  <p
                    className="mt-3 text-muted-foreground"
                    style={{ fontSize: 14, lineHeight: 1.55 }}
                  >
                    {t(`business.plan${plan}_tagline`)}
                  </p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {[1, 2, 3, 4, 5].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          strokeWidth={2.5}
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: BLUE }}
                        />
                        <span
                          className="text-foreground"
                          style={{ fontSize: 13.5, lineHeight: 1.55 }}
                        >
                          {t(`business.plan${plan}_feature${f}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      navigate(plan === 3 ? '/contact-sales' : '/business/register')
                    }
                    className="mt-6 w-full font-semibold transition-all"
                    style={{
                      background: isGrowth ? BLUE : 'transparent',
                      color: isGrowth ? '#FFFFFF' : 'hsl(var(--foreground))',
                      border: isGrowth ? 'none' : '1px solid hsl(var(--border))',
                      borderRadius: 10,
                      padding: '12px 18px',
                      fontSize: 14,
                    }}
                  >
                    {t(`business.plan${plan}_cta`)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5 — Trust & Compliance */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          <div className="lg:col-span-2">
            <Label>{t('business.trust_label')}</Label>
            <h2
              className="font-bold text-foreground whitespace-pre-line"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              {t('business.trust_headline')}
            </h2>
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { Icon: ShieldCheck, n: 1 },
              { Icon: UserCheck, n: 2 },
              { Icon: FileSearch, n: 3 },
              { Icon: Globe2, n: 4 },
            ].map(({ Icon, n }) => (
              <div key={n}>
                <Icon size={26} strokeWidth={1.5} style={{ color: BLUE }} />
                <h3
                  className="mt-3 font-bold text-foreground"
                  style={{ fontSize: 15, lineHeight: 1.3 }}
                >
                  {t(`business.trust_${n}_title`)}
                </h3>
                <p
                  className="mt-2 text-muted-foreground"
                  style={{ fontSize: 13.5, lineHeight: 1.6 }}
                >
                  {t(`business.trust_${n}_body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Final CTA */}
      <section className="px-6 lg:px-10 pb-16 md:pb-20">
        <div
          className="max-w-[1200px] mx-auto rounded-2xl overflow-hidden relative"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}
        >
          <svg
            className="absolute right-0 bottom-0 pointer-events-none"
            width="60%"
            height="100%"
            viewBox="0 0 800 400"
            aria-hidden="true"
            style={{ opacity: 0.3 }}
          >
            <defs>
              <linearGradient id="biz-cta-wave" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B6BFF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0B6BFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {Array.from({ length: 18 }).map((_, i) => (
              <path
                key={i}
                d={`M ${100 + i * 30} 400 Q ${300 + i * 18} ${200 - i * 6}, ${800} ${140 + i * 4}`}
                fill="none"
                stroke="url(#biz-cta-wave)"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-8 md:px-12 py-12 md:py-14">
            <div>
              <h2
                className="font-bold whitespace-pre-line"
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(26px, 3.4vw, 36px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {t('business.cta_headline')}
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 1.6 }}>
                {t('business.cta_body')}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/business/register')}
                  className="inline-flex items-center gap-2 font-semibold"
                  style={{
                    background: BLUE,
                    color: '#FFFFFF',
                    borderRadius: 12,
                    padding: '14px 24px',
                    fontSize: 15,
                    boxShadow: '0 14px 32px rgba(11,107,255,0.4)',
                  }}
                >
                  {t('business.cta_primary')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/contact-sales"
                  className="inline-flex items-center gap-2 font-semibold"
                  style={{
                    background: 'transparent',
                    color: '#FFFFFF',
                    border: '1.5px solid rgba(255,255,255,0.55)',
                    borderRadius: 12,
                    padding: '14px 24px',
                    fontSize: 15,
                  }}
                >
                  {t('business.cta_secondary')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default Business;
