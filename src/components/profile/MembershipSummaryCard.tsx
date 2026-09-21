import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/log';

/**
 * Plan and credits as one compact row at the bottom of the dashboard
 * (the redesign moves them out of the top of the page).
 */
export const MembershipSummaryCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('freemium');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [profileRes, balanceRes] = await Promise.all([
          supabase.from('profiles').select('membership_tier').eq('user_id', user.id).single(),
          supabase.rpc('get_my_credit_balance'),
        ]);
        if (!profileRes.error && profileRes.data) setTier((profileRes.data as any).membership_tier || 'freemium');
        if (!balanceRes.error && balanceRes.data != null) setCredits(balanceRes.data as number);
      } catch (e) { log.warn('[MembershipSummaryCard] load failed', e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="xs-panel !py-4">
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }

  const tierLabel = t(`dashboard.membership.tier_${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1));

  return (
    <div className="xs-panel flex flex-col gap-3 !py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] text-foreground">
        <span className="rounded-md border border-[hsl(var(--xs-line))] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {t('dashboard.plan_label', 'Plan')} {tierLabel}
        </span>
        <span className="ml-3"><strong className="xs-num font-semibold">{credits}</strong> {t('dashboard.membership.credits_label', 'credits')}</span>
        <span className="ml-2 hidden text-[13px] text-muted-foreground md:inline">· {t('dashboard.membership.hint')}</span>
      </p>
      <div className="flex flex-wrap gap-4 text-[14px] font-semibold text-primary">
        <button type="button" onClick={() => navigate('/settings#invitations')} className="hover:underline">
          {t('dashboard.membership.invite')} →
        </button>
        <button type="button" onClick={() => navigate('/settings#subscription')} className="hover:underline">
          {t('dashboard.membership.manage')} →
        </button>
      </div>
    </div>
  );
};
