import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, Star, Sparkles, Users, MessageSquare, BookOpen, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MembershipStatus {
  tier: string;
  sessions_remaining_current_period: number;
  free_session_credits: number;
  unlimited_chat_with_mentor: boolean;
  can_book_weekly: boolean;
  can_access_training_unlimited: boolean;
  interview_prep_credits: number;
  renewal_at: string | null;
}

const TIER_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  price: string;
  color: string;
  benefits: { icon: React.ReactNode; text: string }[];
}> = {
  freemium: {
    label: 'Freemium',
    icon: <Zap className="h-5 w-5" />,
    price: 'Free',
    color: 'bg-muted text-muted-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, text: '1 free intro session' },
      { icon: <Users className="h-4 w-4" />, text: 'Earn sessions via referrals (5 invites = 1 session)' },
    ],
  },
  basic: {
    label: 'Basic',
    icon: <Star className="h-5 w-5" />,
    price: '€8.99/month',
    color: 'bg-primary/10 text-primary',
    benefits: [
      { icon: <Video className="h-4 w-4" />, text: '1 mentor session per month' },
    ],
  },
  premium: {
    label: 'Premium',
    icon: <Crown className="h-5 w-5" />,
    price: '€20.99/month',
    color: 'bg-accent text-accent-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, text: '1 mentor session per month' },
      { icon: <MessageSquare className="h-4 w-4" />, text: 'Unlimited chat with mentor' },
      { icon: <Sparkles className="h-4 w-4" />, text: 'Interview prep after 3 challenges' },
    ],
  },
  pro: {
    label: 'Pro',
    icon: <Sparkles className="h-5 w-5" />,
    price: '€39.99/month',
    color: 'bg-primary text-primary-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, text: '1 mentor session per week' },
      { icon: <MessageSquare className="h-4 w-4" />, text: 'Unlimited chat with mentor' },
      { icon: <BookOpen className="h-4 w-4" />, text: 'Unlimited training courses' },
    ],
  },
};

export const MembershipSection: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_membership_status');
        if (!error && data) {
          setStatus(data as unknown as MembershipStatus);
        }
      } catch (err) {
        console.error('[MembershipSection] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentTier = status?.tier || 'freemium';
  const config = TIER_CONFIG[currentTier] || TIER_CONFIG.freemium;

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-primary" />
              {t('settings.membership_title', 'Membership Plan')}
            </CardTitle>
            <Badge className={config.color}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
          </div>
          <CardDescription>
            {t('settings.membership_subtitle', 'Your current plan and benefits')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Benefits List */}
          <div className="space-y-2">
            {config.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {benefit.icon}
                </div>
                <span className="text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Credits & Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {status?.sessions_remaining_current_period ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('settings.sessions_remaining', 'Sessions remaining')}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {status?.free_session_credits ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('settings.free_credits', 'Free credits')}
              </p>
            </div>
            {(currentTier === 'premium' || currentTier === 'pro') && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {status?.interview_prep_credits ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.interview_prep_credits', 'Interview prep')}
                </p>
              </div>
            )}
            {status?.unlimited_chat_with_mentor && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                <MessageSquare className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  {t('settings.unlimited_chat', 'Unlimited chat')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options (only show for non-pro) */}
      {currentTier !== 'pro' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {t('settings.upgrade_title', 'Upgrade Your Plan')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {Object.entries(TIER_CONFIG)
                .filter(([key]) => {
                  const tierOrder = ['freemium', 'basic', 'premium', 'pro'];
                  return tierOrder.indexOf(key) > tierOrder.indexOf(currentTier);
                })
                .map(([key, tierConfig]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {tierConfig.icon}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tierConfig.label}</p>
                        <p className="text-sm text-muted-foreground">{tierConfig.price}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      {t('settings.coming_soon', 'Coming soon')}
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
