import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Crown, Zap, Star, Sparkles, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TIER_ICONS: Record<string, React.ReactNode> = {
  freemium: <Zap className="h-3 w-3" />,
  basic: <Star className="h-3 w-3" />,
  premium: <Crown className="h-3 w-3" />,
  pro: <Sparkles className="h-3 w-3" />,
};

const TIER_COLORS: Record<string, string> = {
  freemium: 'bg-muted text-muted-foreground',
  basic: 'bg-primary/10 text-primary',
  premium: 'bg-accent text-accent-foreground',
  pro: 'bg-primary text-primary-foreground',
};

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

        if (!profileRes.error && profileRes.data) {
          setTier((profileRes.data as any).membership_tier || 'freemium');
        }
        if (!balanceRes.error && balanceRes.data != null) {
          setCredits(balanceRes.data as number);
        }
      } catch {
        // silently fail — card still shows CTAs
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-section p-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </div>
    );
  }

  const tierLabel = t(`dashboard.membership.tier_${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1));

  return (
    <div className="dashboard-section p-5 space-y-3">
      {/* Title + tier badge */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Coins className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
          {t('dashboard.membership.title')}
        </h3>
        <Badge
          variant="secondary"
          className={`${TIER_COLORS[tier] || TIER_COLORS.freemium} text-[11px] px-2 py-0.5 gap-1 font-semibold`}
        >
          {TIER_ICONS[tier] || TIER_ICONS.freemium}
          {tierLabel}
        </Badge>
      </div>

      {/* Narrative subtitle */}
      <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
        {t('dashboard.membership.subtitle')}
      </p>

      {/* Credit balance */}
      <div className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-bold text-foreground stat-value">
          {credits}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('dashboard.membership.credits_label', 'credits')}
        </span>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <Button
          size="sm"
          onClick={() => navigate('/settings#referrals')}
          className="gap-1.5 text-xs h-8"
        >
          <Users className="h-3.5 w-3.5" />
          {t('dashboard.membership.invite')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.membership.manage')}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
        {t('dashboard.membership.hint')}
      </p>
    </div>
  );
};