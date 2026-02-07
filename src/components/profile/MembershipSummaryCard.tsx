import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Crown, Zap, Star, Sparkles, Settings, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TIER_ICONS: Record<string, React.ReactNode> = {
  freemium: <Zap className="h-3.5 w-3.5" />,
  basic: <Star className="h-3.5 w-3.5" />,
  premium: <Crown className="h-3.5 w-3.5" />,
  pro: <Sparkles className="h-3.5 w-3.5" />,
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
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierLabel = t(`dashboard.membership.tier_${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1));

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Coins className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {t('dashboard.membership.title', 'Membership & Credits')}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {t('dashboard.membership.subtitle', 'Earn credits by inviting friends. Use credits to unlock mentor sessions.')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <Badge className={`${TIER_COLORS[tier] || TIER_COLORS.freemium} text-xs`}>
            {TIER_ICONS[tier] || TIER_ICONS.freemium}
            <span className="ml-1">{tierLabel}</span>
          </Badge>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold text-foreground">{credits}</span>
            <span className="text-muted-foreground">{t('dashboard.membership.creditsLabel', 'credits')}</span>
          </div>
        </div>

        {/* CTAs + hint */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/settings')}
              className="gap-1.5 text-xs h-8"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('dashboard.membership.manage', 'Manage plan')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings#referrals')}
              className="gap-1.5 text-xs h-8"
            >
              <Users className="h-3.5 w-3.5" />
              {t('dashboard.membership.invite', 'Invite friends')}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground sm:ml-auto">
            {t('dashboard.membership.hint', 'A standard 45-min mentor session costs 5 credits.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
