import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Building2, Users, Shield, Sparkles, BarChart3, Zap } from 'lucide-react';
import LandingLayout from '@/components/landing/LandingLayout';

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    description: 'For small teams getting started with talent assessment',
    icon: Zap,
    color: 'border-border',
    features: [
      '1 seat',
      'Up to 5 active hiring goals',
      'Level 1 + Level 2 challenges',
      'Basic candidate signals',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 'Custom',
    description: 'For growing companies with structured hiring processes',
    icon: BarChart3,
    color: 'border-primary',
    highlighted: true,
    features: [
      'Up to 10 seats',
      'Unlimited hiring goals',
      'Level 1 + Level 2 + Level 3 challenges',
      'Premium signals & Decision Pack',
      'Eligibility gate & Consistency guard',
      'Data export',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations requiring full platform capabilities',
    icon: Building2,
    color: 'border-primary',
    features: [
      'Unlimited seats',
      'Unlimited hiring goals',
      'All challenge levels',
      'All premium features',
      'Mentor portal access',
      'Advanced analytics & reporting',
      'Dedicated account manager',
      'Custom SLA',
      'SSO / SAML (roadmap)',
    ],
  },
];

const Pricing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <LandingLayout>
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
            return (
              <Card
                key={tier.id}
                className={`relative ${tier.highlighted ? 'border-2 border-primary shadow-lg shadow-primary/10' : 'border-border'}`}
              >
                {tier.highlighted && (
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
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  </div>
                  <CardDescription className="mt-2">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? 'default' : 'outline'}
                    onClick={() => navigate('/contact-sales', { state: { desiredTier: tier.id } })}
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
