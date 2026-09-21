/**
 * BusinessPlanCard — Shows current plan, entitlements, seats, and contract info
 * in the business settings page. All upgrade CTAs route to Contact Sales.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/layout/PageHeader';
import { SettingsSectionHeader } from '@/components/business/SettingsSectionHeader';
import { useBusinessEntitlements, type FeatureFlag } from '@/hooks/useBusinessEntitlements';
import { ArrowRight, Loader2 } from 'lucide-react';

const FEATURE_KEYS: Record<FeatureFlag, string> = {
  mentor_portal: 'businessPortal.settings_plan_feature_mentor_portal',
  level3_challenges: 'businessPortal.settings_plan_feature_l3_challenges',
  data_export: 'businessPortal.settings_plan_feature_data_export',
  premium_signals: 'businessPortal.settings_plan_feature_premium_signals',
  eligibility_gate: 'businessPortal.settings_plan_feature_eligibility_gate',
  decision_pack: 'businessPortal.settings_plan_feature_decision_pack',
  consistency_guard: 'businessPortal.settings_plan_feature_consistency_guard',
  advanced_signals: 'businessPortal.settings_plan_feature_advanced_signals',
};

export const BusinessPlanCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { entitlements, loading, planTier, isFreePlan } = useBusinessEntitlements();

  if (loading) {
    return (
      <section id="piano" className="xs-glass scroll-mt-20 flex items-center justify-center py-8" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </section>
    );
  }

  const planName = isFreePlan
    ? t('businessPortal.settings_plan_free')
    : planTier.charAt(0).toUpperCase() + planTier.slice(1);
  const features = Object.entries(FEATURE_KEYS) as [FeatureFlag, string][];
  const missing = features.filter(([key]) => entitlements?.features[key] !== true);
  const included = features.filter(([key]) => entitlements?.features[key] === true);

  return (
    <section id="piano" className="xs-glass scroll-mt-20">
      <SettingsSectionHeader
        index="06"
        eyebrow={t('businessPortal.settings_eyebrow_plan')}
        title={t('businessPortal.settings_plan_title')}
        subtitle={isFreePlan
          ? t('businessPortal.settings_plan_free_subtitle')
          : t('businessPortal.settings_plan_subtitle')}
      />

      {/* Plan summary */}
      <div className="flex items-end justify-between gap-4 border-y border-[hsl(var(--xs-line))] py-4">
        <div>
          <Eyebrow>{t('businessPortal.settings_plan_current')}</Eyebrow>
          <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.5px] text-foreground">{planName}</p>
        </div>
        <div className="text-right">
          <p className="xs-num text-[24px] font-semibold leading-none text-foreground">
            {entitlements?.seatsUsed ?? 1} <span className="text-sm font-normal text-muted-foreground">/ {entitlements?.maxSeats ?? 1}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('businessPortal.settings_plan_seats_used')}</p>
        </div>
      </div>

      {/* Contract dates */}
      {(entitlements?.contractStart || entitlements?.contractEnd) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {entitlements?.contractStart && (
            <span className="text-foreground">
              {t('business.plan.contract_start', 'Start')}: {entitlements.contractStart}
            </span>
          )}
          {entitlements?.contractEnd && (
            <span className="ml-3">
              {t('business.plan.contract_end', 'End')}: {entitlements.contractEnd}
            </span>
          )}
        </p>
      )}

      {/* Features */}
      <div className="mt-5">
        {missing.length > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-foreground">{t('businessPortal.settings_plan_not_included', { plan: planName })}</h3>
            <ul className="mt-2 space-y-1.5">
              {missing.map(([key, labelKey]) => (
                <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="w-3 text-center">−</span>
                  {t(labelKey)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('businessPortal.settings_plan_all_included')}</p>
        )}
        {included.length > 0 && missing.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">{t('businessPortal.settings_plan_features_label')} ({included.length})</summary>
            <ul className="mt-2 space-y-1.5">
              {included.map(([key, labelKey]) => (
                <li key={key} className="flex items-center gap-2 text-foreground">
                  <span aria-hidden="true" className="w-3 text-center text-primary">✓</span>
                  {t(labelKey)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* CTA */}
      <Button
        className="mt-5 w-full"
        variant={planTier === 'enterprise' ? 'outline' : 'default'}
        onClick={() => navigate('/contact-sales', { state: { desiredTier: planTier === 'starter' ? 'growth' : 'enterprise' } })}
      >
        {planTier === 'enterprise'
          ? t('business.plan.manage_plan', 'Manage Plan')
          : t('businessPortal.settings_plan_change_cta')}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
};
