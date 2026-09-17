import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Building2, Users, Shield, Sparkles, BarChart3, Zap } from 'lucide-react';
import LandingLayout from '@/components/landing/LandingLayout';
import Seo from '@/components/Seo';

// Text lives in the locale files (pricing.tiers.*): this page used to be
// English-only whatever language the visitor had chosen.
const TIERS = [
  { id: 'starter', icon: Zap, featureCount: 5 },
  { id: 'growth', icon: BarChart3, highlighted: true, featureCount: 7 },
  { id: 'enterprise', icon: Building2, featureCount: 9 },
] as const;

const Pricing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <LandingLayout>
      <Seo
        title="XIMA Pricing — Plans for every stage of hiring"
        description="Compare XIMA plans: Starter for small teams, Growth for scaling companies, and custom enterprise tiers with advanced hiring intelligence."
        path="/pricing"
      />
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('pricing.title', 'Plans for every stage of growth')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.subtitle', 'All plans include the XIMA assessment framework. Upgrade when your team needs advanced hiring intelligence.')}
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const highlighted = 'highlighted' in tier && tier.highlighted;
            const features = Array.from({ length: tier.featureCount }, (_, i) => t(`pricing.tiers.${tier.id}.feature${i + 1}`));
            return (
              <Card
                key={tier.id}
                className={`relative ${highlighted ? 'border-2 border-primary' : 'border-border'}`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">
                      {t('pricing.most_popular', 'Most Popular')}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{t(`pricing.tiers.${tier.id}.name`)}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{t(`pricing.tiers.${tier.id}.price`)}</span>
                  </div>
                  <CardDescription className="mt-2">{t(`pricing.tiers.${tier.id}.description`)}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={highlighted ? 'default' : 'outline'}
                    onClick={() => tier.id === 'starter'
                      // "Get started free" led to the sales contact form.
                      ? navigate('/business/register')
                      : navigate('/contact-sales', { state: { desiredTier: tier.id } })}
                  >
                    {tier.id === 'starter'
                      ? t('pricing.get_started', 'Get Started Free')
                      : t('pricing.contact_sales', 'Contact Sales')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust section */}
        <div className="text-center py-8 border-t border-border">
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">{t('pricing.gdpr', 'GDPR Compliant')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm">{t('pricing.no_bias', 'No bias, no scoring')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">{t('pricing.ai_powered', 'AI-powered signals')}</span>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};

export default Pricing;
