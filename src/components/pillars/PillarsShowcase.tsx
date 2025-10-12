import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, MessageCircle, BookOpen, Lightbulb, Zap, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PillarKey = 'computational_power' | 'communication' | 'knowledge' | 'creativity' | 'drive';

interface PillarIcon {
  icon: React.ReactNode;
  accentVar: string;
}

const pillarIcons: Record<PillarKey, PillarIcon> = {
  computational_power: {
    icon: <Brain className="w-6 h-6 stroke-[1.5]" />,
    accentVar: 'hsl(217 91% 60%)', // Blue
  },
  communication: {
    icon: <MessageCircle className="w-6 h-6 stroke-[1.5]" />,
    accentVar: 'hsl(263 70% 60%)', // Purple
  },
  knowledge: {
    icon: <BookOpen className="w-6 h-6 stroke-[1.5]" />,
    accentVar: 'hsl(0 84% 60%)', // Red
  },
  creativity: {
    icon: <Lightbulb className="w-6 h-6 stroke-[1.5]" />,
    accentVar: 'hsl(142 71% 45%)', // Green
  },
  drive: {
    icon: <Zap className="w-6 h-6 stroke-[1.5]" />,
    accentVar: 'hsl(38 92% 50%)', // Amber
  },
};

type VisualizationType = 'bar' | 'radar';

export function PillarsShowcase() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [expandedPillar, setExpandedPillar] = useState<PillarKey | null>(null);
  const [visType, setVisType] = useState<VisualizationType>('bar');
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const pillars: PillarKey[] = ['computational_power', 'communication', 'knowledge', 'creativity', 'drive'];

  const handleCardClick = (pillar: PillarKey) => {
    setExpandedPillar(expandedPillar === pillar ? null : pillar);
  };

  const handleKeyDown = (e: React.KeyboardEvent, pillar: PillarKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(pillar);
    } else if (e.key === 'Escape') {
      setExpandedPillar(null);
    }
  };

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lang = i18n.language === 'it' ? '' : `/${i18n.language}`;
    navigate(`${lang}/ximatar-journey`);
  };

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="container max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          {t('pillars.title')}
        </h2>

        <div
          className={cn(
            'grid gap-6 transition-opacity duration-700',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
            isInView ? 'opacity-100' : 'opacity-0'
          )}
        >
          {pillars.map((pillar, index) => {
            const isExpanded = expandedPillar === pillar;
            const { icon, accentVar } = pillarIcons[pillar];
            const name = t(`pillars.items.${pillar}.name`);
            const tagline = t(`pillars.items.${pillar}.tagline`);
            const description = t(`pillars.items.${pillar}.description`);
            const howWeEval = t(`pillars.items.${pillar}.how_we_evaluate`, { returnObjects: true }) as string[];
            const tips = t(`pillars.items.${pillar}.tips`, { returnObjects: true }) as string[];

            return (
              <Card
                key={pillar}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`pillar-detail-${pillar}`}
                onClick={() => handleCardClick(pillar)}
                onKeyDown={(e) => handleKeyDown(e, pillar)}
                className={cn(
                  'relative p-6 rounded-3xl border bg-card cursor-pointer',
                  'transition-all duration-200 ease-out',
                  'hover:scale-[1.02] hover:shadow-lg',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isExpanded && 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5 shadow-xl'
                )}
                style={
                  {
                    '--pillar-accent': accentVar,
                    animationDelay: `${index * 80}ms`,
                  } as React.CSSProperties
                }
              >
                {/* Icon Badge */}
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-transform duration-200 group-hover:rotate-12"
                  style={{ backgroundColor: `color-mix(in srgb, ${accentVar} 15%, transparent)`, color: accentVar }}
                >
                  {icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-2 text-foreground">{name}</h3>

                {/* Tagline (always visible) */}
                <p className="text-sm text-muted-foreground mb-4">{tagline}</p>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    id={`pillar-detail-${pillar}`}
                    className="mt-6 pt-6 border-t border-border animate-fade-in"
                  >
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Description */}
                      <div>
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-2">
                          Descrizione
                        </h4>
                        <p className="text-sm text-foreground leading-relaxed">{description}</p>
                      </div>

                      {/* How we evaluate */}
                      <div>
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-2">
                          Come valutiamo
                        </h4>
                        <ul className="space-y-2">
                          {howWeEval.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: accentVar }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tips */}
                      <div>
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-2">
                          Suggerimenti per migliorare
                        </h4>
                        <ul className="space-y-2">
                          {tips.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: accentVar }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Mini Visualization */}
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                          Visualizzazione
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVisType('bar');
                            }}
                            className={cn(
                              'px-3 py-1 text-xs rounded-md transition-colors',
                              visType === 'bar'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            Barra
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVisType('radar');
                            }}
                            className={cn(
                              'px-3 py-1 text-xs rounded-md transition-colors',
                              visType === 'radar'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            Radar
                          </button>
                        </div>
                      </div>

                      {visType === 'bar' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-32">{name}</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: '75%', backgroundColor: accentVar }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {t('pillars.example_label')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="relative w-48 h-48">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                              {/* Pentagon outline */}
                              <polygon
                                points="100,20 181,76 155,160 45,160 19,76"
                                fill="none"
                                stroke="hsl(var(--border))"
                                strokeWidth="1"
                              />
                              {/* Filled area (example) */}
                              <polygon
                                points="100,50 145,80 135,130 65,130 55,80"
                                fill={`color-mix(in srgb, ${accentVar} 30%, transparent)`}
                                stroke={accentVar}
                                strokeWidth="2"
                              />
                              {/* Labels */}
                              {pillars.map((p, i) => {
                                const angle = (i * 72 - 90) * (Math.PI / 180);
                                const x = 100 + 95 * Math.cos(angle);
                                const y = 100 + 95 * Math.sin(angle);
                                return (
                                  <text
                                    key={p}
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    className={cn(
                                      'text-[8px] fill-current',
                                      p === pillar ? 'font-semibold' : 'font-normal'
                                    )}
                                    style={{ fill: p === pillar ? accentVar : 'hsl(var(--muted-foreground))' }}
                                  >
                                    {t(`pillars.items.${p}.name`).split(' ')[0]}
                                  </text>
                                );
                              })}
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CTA Zone */}
                    <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                      <Button size="lg" onClick={handleCTA} className="w-full sm:w-auto">
                        {t('pillars.cta_primary')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full sm:w-auto"
                      >
                        {t('pillars.cta_secondary')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expand/Collapse Icon */}
                <div className="absolute top-6 right-6 text-muted-foreground">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
