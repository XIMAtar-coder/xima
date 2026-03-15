/**
 * BusinessPlanCard — Shows current plan, entitlements, seats, and contract info
 * in the business settings page. All upgrade CTAs route to Contact Sales.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBusinessEntitlements, type FeatureFlag } from '@/hooks/useBusinessEntitlements';
import {
  Crown, Users, Calendar, Check, X, ArrowRight, Loader2,
  Shield, BarChart3, FileText, MessageSquare, Sparkles, Eye
} from 'lucide-react';

const FEATURE_KEYS: Record<FeatureFlag, { labelKey: string; icon: React.ReactNode }> = {
  mentor_portal: { labelKey: 'businessPortal.settings_plan_feature_mentor_portal', icon: <MessageSquare className="h-4 w-4" /> },
  level3_challenges: { labelKey: 'businessPortal.settings_plan_feature_l3_challenges', icon: <Sparkles className="h-4 w-4" /> },
  data_export: { labelKey: 'businessPortal.settings_plan_feature_data_export', icon: <FileText className="h-4 w-4" /> },
  premium_signals: { labelKey: 'businessPortal.settings_plan_feature_premium_signals', icon: <BarChart3 className="h-4 w-4" /> },
  eligibility_gate: { labelKey: 'businessPortal.settings_plan_feature_eligibility_gate', icon: <Shield className="h-4 w-4" /> },
  decision_pack: { labelKey: 'businessPortal.settings_plan_feature_decision_pack', icon: <Eye className="h-4 w-4" /> },
  consistency_guard: { labelKey: 'businessPortal.settings_plan_feature_consistency_guard', icon: <Shield className="h-4 w-4" /> },
  advanced_signals: { labelKey: 'businessPortal.settings_plan_feature_advanced_signals', icon: <BarChart3 className="h-4 w-4" /> },
};

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  growth: 'bg-primary/10 text-primary',
  enterprise: 'bg-primary text-primary-foreground',
};

export const BusinessPlanCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { entitlements, loading, planTier } = useBusinessEntitlements();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Crown className="h-5 w-5 text-primary" />
            {t('businessPortal.settings_plan_title')}
          </CardTitle>
          <Badge className={TIER_COLORS[planTier] || TIER_COLORS.starter}>
            {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {t('businessPortal.settings_plan_subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('businessPortal.settings_plan_seats_label')}
              </p>
              <p className="text-xs text-muted-foreground">
                {entitlements?.seatsUsed ?? 1} / {entitlements?.maxSeats ?? 1} {t('business.plan.used', 'used')}
              </p>
            </div>
          </div>
        </div>

        {/* Contract dates */}
        {(entitlements?.contractStart || entitlements?.contractEnd) && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-sm">
              {entitlements?.contractStart && (
                <span className="text-foreground">
                  {t('business.plan.contract_start', 'Start')}: {entitlements.contractStart}
                </span>
              )}
              {entitlements?.contractEnd && (
                <span className="text-muted-foreground ml-3">
                  {t('business.plan.contract_end', 'End')}: {entitlements.contractEnd}
                </span>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Features */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">
            {t('businessPortal.settings_plan_features_label')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(FEATURE_KEYS) as [FeatureFlag, typeof FEATURE_KEYS[FeatureFlag]][]).map(
              ([key, { labelKey, icon }]) => {
                const enabled = entitlements?.features[key] === true;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      enabled ? 'text-foreground' : 'text-muted-foreground opacity-60'
                    }`}
                  >
                    {enabled ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <X className="h-4 w-4 shrink-0" />
                    )}
                    {icon}
                    <span>{t(labelKey)}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <Separator />

        {/* CTA */}
        <Button
          className="w-full"
          variant={planTier === 'enterprise' ? 'outline' : 'default'}
          onClick={() => navigate('/contact-sales', { state: { desiredTier: planTier === 'starter' ? 'growth' : 'enterprise' } })}
        >
          {planTier === 'enterprise'
            ? t('business.plan.manage_plan', 'Manage Plan')
            : t('businessPortal.settings_plan_upgrade_cta')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
