import { useState } from 'react';
import { Target, Users, Zap, CheckCircle, Shield, Brain, TrendingUp, ChevronDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const HowXimaWorksExplainer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const steps = [
    {
      icon: Target,
      colorClasses: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      title: t('business.how_xima.step1_title', '1. Definisci il tuo obiettivo di assunzione'),
      description: t('business.how_xima.step1_desc', 'Descrivi il ruolo con responsabilità, location, seniority. XIMA analizza il fit culturale con il DNA della tua azienda.'),
    },
    {
      icon: Users,
      colorClasses: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      title: t('business.how_xima.step2_title', '2. Shortlist intelligente e anonima'),
      description: t('business.how_xima.step2_desc', 'Ricevi candidati ordinati per identità comportamentale (XIMAtar), traiettoria di crescita, engagement e località. Nessun nome, nessuna foto, nessun CV: solo segnali.'),
    },
    {
      icon: Zap,
      colorClasses: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      title: t('business.how_xima.step3_title', '3. Pipeline a 3 livelli di sfide'),
      description: t('business.how_xima.step3_desc', "L1 valuta i comportamenti, L2 le competenze tecniche, L3 le capacità comunicative. I candidati vedono solo il livello successivo se sblocchi l'avanzamento."),
    },
    {
      icon: CheckCircle,
      colorClasses: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
      title: t('business.how_xima.step4_title', '4. Rivelazione identità e offerta'),
      description: t('business.how_xima.step4_desc', "Solo quando decidi di fare un'offerta, l'identità del candidato viene rivelata. Zero bias durante tutto il processo."),
    },
  ];

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">
              {t('business.how_xima.title', 'Come funziona XIMA')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('business.how_xima.subtitle', "Dal brief all'assunzione in 4 passaggi")}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Step navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    activeStep === i
                      ? `${step.colorClasses} shadow-sm`
                      : 'border-transparent hover:bg-secondary/30'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">
                    {step.title.split('.')[0]}.
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active step content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-secondary/10 border border-border/50">
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-foreground">{steps[activeStep].title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {steps[activeStep].description}
              </p>
              {activeStep === 0 && (
                <Button size="sm" onClick={() => navigate('/business')}>
                  {t('business.how_xima.create_goal', 'Crea il tuo primo obiettivo')}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {activeStep === 1 && (
                <Button size="sm" variant="outline" onClick={() => navigate('/business/candidates')}>
                  {t('business.how_xima.browse_pool', 'Esplora il pool')}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-center">
              <StepVisual step={activeStep} />
            </div>
          </div>

          {/* Key benefits strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{t('business.how_xima.benefit1_title', 'Zero bias')}</p>
                <p className="text-xs text-muted-foreground">{t('business.how_xima.benefit1_desc', "Anonimato totale fino all'offerta")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{t('business.how_xima.benefit2_title', 'AI comportamentale')}</p>
                <p className="text-xs text-muted-foreground">{t('business.how_xima.benefit2_desc', 'Matching su 5 pilastri psicometrici')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{t('business.how_xima.benefit3_title', 'Traiettoria di crescita')}</p>
                <p className="text-xs text-muted-foreground">{t('business.how_xima.benefit3_desc', 'Scegli chi sta crescendo, non solo chi è arrivato')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

const StepVisual = ({ step }: { step: number }) => {
  if (step === 0) {
    return (
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <rect x="20" y="15" width="160" height="90" rx="12" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.3" />
        <text x="100" y="45" textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))" fontWeight="600">Role Brief</text>
        <rect x="40" y="55" width="50" height="6" rx="3" fill="hsl(var(--primary))" opacity="0.5" />
        <rect x="40" y="67" width="80" height="6" rx="3" fill="hsl(var(--primary))" opacity="0.3" />
        <rect x="40" y="79" width="60" height="6" rx="3" fill="hsl(var(--primary))" opacity="0.2" />
      </svg>
    );
  }
  if (step === 1) {
    return (
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} transform={`translate(${20 + i * 35}, 30)`}>
            <circle cx="15" cy="15" r="14" fill="hsl(var(--primary))" opacity={0.15 + i * 0.15} />
            <circle cx="15" cy="12" r="5" fill="hsl(var(--primary))" opacity={0.3 + i * 0.1} />
            <rect x="7" y="22" width="16" height="4" rx="2" fill="hsl(var(--primary))" opacity={0.2 + i * 0.1} />
            <text x="15" y="72" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">#{i + 1}</text>
          </g>
        ))}
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        {['L1', 'L2', 'L3'].map((level, i) => (
          <g key={level}>
            <rect x={20 + i * 60} y="30" width="50" height="60" rx="8" fill="hsl(var(--primary))" opacity={0.15 + i * 0.15} />
            <text x={45 + i * 60} y="55" textAnchor="middle" fontSize="14" fontWeight="700" fill="hsl(var(--primary))">{level}</text>
            <text x={45 + i * 60} y="72" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))">
              {i === 0 ? 'Behavior' : i === 1 ? 'Skills' : 'Comm'}
            </text>
            {i < 2 && <path d={`M${75 + i * 60},60 L${80 + i * 60},60`} stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrow)" />}
          </g>
        ))}
      </svg>
    );
  }
  if (step === 3) {
    return (
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <circle cx="70" cy="55" r="20" fill="hsl(var(--primary))" opacity="0.2" />
        <text x="70" y="59" textAnchor="middle" fontSize="10" fill="hsl(var(--primary))">?</text>
        <path d="M95,55 L115,55" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4" />
        <circle cx="140" cy="55" r="20" fill="hsl(var(--primary))" opacity="0.5" />
        <text x="140" y="53" textAnchor="middle" fontSize="10" fill="hsl(var(--primary-foreground))">✓</text>
        <text x="140" y="65" textAnchor="middle" fontSize="6" fill="hsl(var(--primary-foreground))">Revealed</text>
      </svg>
    );
  }
  return null;
};
