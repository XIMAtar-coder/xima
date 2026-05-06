import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LandingLayout from '@/components/landing/LandingLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Layers, Shield, Building2, Check, ShieldCheck } from 'lucide-react';

const FEATURE_ICONS = [
  <Users className="w-8 h-8" />,
  <Layers className="w-8 h-8" />,
  <Shield className="w-8 h-8" />,
  <Building2 className="w-8 h-8" />,
];

const Business = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <LandingLayout>
      <div className="container max-w-7xl mx-auto px-4 md:px-8 xl:px-12">

        {/* Hero */}
        <section className="flex flex-col items-center text-center py-16 md:py-24 space-y-8 max-w-4xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            {t('business.eyebrow')}
          </span>
          <h1 className="text-[28px] md:text-[40px] xl:text-[48px] font-bold leading-tight text-foreground whitespace-pre-line">
            {t('business.hero_headline')}
          </h1>
          <p className="text-[14px] md:text-[17px] text-muted-foreground max-w-2xl">
            {t('business.hero_subheadline')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate('/business/register')}>
              {t('business.hero_cta_primary')}
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/business/login')}>
              {t('business.hero_cta_secondary')}
            </Button>
          </div>
        </section>

        {/* Why XIMA */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {t('business.why_label')}
            </span>
            <h2 className="text-[24px] md:text-[32px] xl:text-[36px] font-bold leading-tight text-foreground mt-4 whitespace-pre-line">
              {t('business.why_headline')}
            </h2>
            <p className="text-muted-foreground mt-4 text-[15px] md:text-[17px]">
              {t('business.why_subheadline')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <div className="text-primary">{FEATURE_ICONS[i - 1]}</div>
                  <h3 className="text-xl font-bold text-foreground">
                    {t(`business.feature${i}_title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`business.feature${i}_body`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {t('business.pipeline_label')}
            </span>
            <h2 className="text-[24px] md:text-[32px] xl:text-[36px] font-bold leading-tight text-foreground mt-4">
              {t('business.pipeline_headline')}
            </h2>
            <p className="text-muted-foreground mt-4 text-[15px] md:text-[17px]">
              {t('business.pipeline_subheadline')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="text-5xl font-bold text-primary">
                  {t(`business.pipeline_step${step}_number`)}
                </span>
                <h3 className="text-xl font-bold text-foreground">
                  {t(`business.pipeline_step${step}_title`)}
                </h3>
                <p className="text-muted-foreground">
                  {t(`business.pipeline_step${step}_body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {t('business.pricing_label')}
            </span>
            <h2 className="text-[24px] md:text-[32px] xl:text-[36px] font-bold leading-tight text-foreground mt-4">
              {t('business.pricing_headline')}
            </h2>
            <p className="text-muted-foreground mt-4 text-[15px] md:text-[17px]">
              {t('business.pricing_subheadline')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((plan) => {
              const isGrowth = plan === 2;
              return (
                <Card
                  key={plan}
                  className={isGrowth ? 'border-primary border-2 relative' : ''}
                >
                  <CardContent className="p-6 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary text-xs font-mono px-3 py-1 rounded-full">
                        {t(`business.plan${plan}_badge`)}
                      </span>
                      {isGrowth && (
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                          {t('business.plan2_highlight')}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-4xl font-bold text-foreground">
                        {t(`business.plan${plan}_price`)}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        {t(`business.plan${plan}_period`)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {t(`business.plan${plan}_tagline`)}
                    </p>
                    <ul className="space-y-2 flex-1">
                      {[1, 2, 3, 4, 5].map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          {t(`business.plan${plan}_feature${f}`)}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={isGrowth ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => navigate(plan === 3 ? '/contact-sales' : '/business/register')}
                    >
                      {t(`business.plan${plan}_cta`)}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Trust & Compliance */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {t('business.trust_label')}
            </span>
            <h2 className="text-[24px] md:text-[32px] xl:text-[36px] font-bold leading-tight text-foreground mt-4 whitespace-pre-line">
              {t('business.trust_headline')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <ShieldCheck className="w-6 h-6 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground">
                    {t(`business.trust_${i}_title`)}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t(`business.trust_${i}_body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 text-center max-w-3xl mx-auto">
          <h2 className="text-[28px] md:text-[36px] font-bold text-foreground whitespace-pre-line">
            {t('business.cta_headline')}
          </h2>
          <p className="text-muted-foreground mt-4 text-[15px] md:text-[17px] max-w-xl mx-auto">
            {t('business.cta_body')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button size="lg" onClick={() => navigate('/business/register')}>
              {t('business.cta_primary')}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact-sales">{t('business.cta_secondary')}</Link>
            </Button>
          </div>
        </section>

      </div>
    </LandingLayout>
  );
};

export default Business;
