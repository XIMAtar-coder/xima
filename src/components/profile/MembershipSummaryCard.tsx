import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Crown, Zap, Star, Sparkles, Settings, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TIER_ICONS: Record<string, React.ReactNode> = {
  freemium: <Zap className="h-4 w-4" />,
  basic: <Star className="h-4 w-4" />,
  premium: <Crown className="h-4 w-4" />,
  pro: <Sparkles className="h-4 w-4" />,
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
  const [error, setError] = useState(false);
  const [tier, setTier] = useState('freemium');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const fetch = async () => {
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
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    );
  }

  const tierLabel = t(`dashboard.membership.tier_${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1));

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: tier + credits */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={TIER_COLORS[tier] || TIER_COLORS.freemium}>
                  {TIER_ICONS[tier] || TIER_ICONS.freemium}
                  <span className="ml-1">{tierLabel}</span>
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {credits} {t('dashboard.membership.creditsLabel', 'credits')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {t('dashboard.membership.microcopy', 'Credits unlock 45-min mentor sessions. Earn them by inviting friends.')}
              </p>
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {error && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings#referrals')}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              {t('dashboard.membership.ctaInvite', 'Invite friends')}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/settings')}
              className="gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('dashboard.membership.ctaManage', 'Manage plan')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
