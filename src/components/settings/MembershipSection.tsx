import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, Star, Sparkles, Users, MessageSquare, BookOpen, Video, Loader2, Copy, Check, Send, Gift, Clock, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReferralRow {
  id: string;
  status: string;
  created_at: string;
  referred_email: string | null;
}

const TIER_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  price: string;
  color: string;
  benefits: { icon: React.ReactNode; textKey: string; fallback: string }[];
}> = {
  freemium: {
    label: 'Freemium',
    icon: <Zap className="h-5 w-5" />,
    price: 'Free',
    color: 'bg-muted text-muted-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, textKey: 'settings.benefit_free_intro', fallback: '1 free intro session (30 min)' },
      { icon: <Users className="h-4 w-4" />, textKey: 'settings.benefit_referral_credits', fallback: 'Earn credits by inviting friends' },
    ],
  },
  basic: {
    label: 'Basic',
    icon: <Star className="h-5 w-5" />,
    price: '€8.99/month',
    color: 'bg-primary/10 text-primary',
    benefits: [
      { icon: <Video className="h-4 w-4" />, textKey: 'settings.benefit_monthly_session', fallback: '1 mentor session per month' },
    ],
  },
  premium: {
    label: 'Premium',
    icon: <Crown className="h-5 w-5" />,
    price: '€20.99/month',
    color: 'bg-accent text-accent-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, textKey: 'settings.benefit_monthly_session', fallback: '1 mentor session per month' },
      { icon: <MessageSquare className="h-4 w-4" />, textKey: 'settings.benefit_unlimited_chat', fallback: 'Unlimited chat with mentor' },
      { icon: <Sparkles className="h-4 w-4" />, textKey: 'settings.benefit_interview_prep', fallback: 'Interview prep after 3 challenges' },
    ],
  },
  pro: {
    label: 'Pro',
    icon: <Sparkles className="h-5 w-5" />,
    price: '€39.99/month',
    color: 'bg-primary text-primary-foreground',
    benefits: [
      { icon: <Video className="h-4 w-4" />, textKey: 'settings.benefit_weekly_session', fallback: '1 mentor session per week' },
      { icon: <MessageSquare className="h-4 w-4" />, textKey: 'settings.benefit_unlimited_chat', fallback: 'Unlimited chat with mentor' },
      { icon: <BookOpen className="h-4 w-4" />, textKey: 'settings.benefit_unlimited_training', fallback: 'Unlimited training courses' },
    ],
  },
};

export const MembershipSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState('freemium');
  const [creditBalance, setCreditBalance] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [qualifiedCount, setQualifiedCount] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, balanceRes, referralsRes] = await Promise.all([
        supabase.from('profiles').select('referral_code, membership_tier').eq('user_id', user.id).single(),
        supabase.rpc('get_my_credit_balance'),
        supabase.from('referrals').select('id, status, created_at, referred_email').order('created_at', { ascending: false }).limit(20),
      ]);

      if (!profileRes.error && profileRes.data) {
        setReferralCode(profileRes.data.referral_code);
        setCurrentTier((profileRes.data as any).membership_tier || 'freemium');
      }
      if (!balanceRes.error && balanceRes.data != null) {
        setCreditBalance(balanceRes.data as number);
      }
      if (!referralsRes.error && referralsRes.data) {
        setReferrals(referralsRes.data as ReferralRow[]);
        const qualified = (referralsRes.data as ReferralRow[]).filter(
          r => r.status === 'qualified' || r.status === 'rewarded'
        ).length;
        setQualifiedCount(qualified);
      }
    } catch (err) {
      console.error('[MembershipSection] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    const link = `https://xima.lovable.app/register?ref=${referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: t('settings.link_copied', 'Link copied!') });
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-referral-invite', {
        body: { recipient_email: inviteEmail.trim(), locale: i18n.language },
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });

      if (error || !data?.success) {
        const errCode = data?.error || error?.message || 'UNKNOWN';
        toast({
          title: t('common.error'),
          description: errCode === 'SELF_INVITE'
            ? t('settings.cannot_self_invite', "You can't invite yourself")
            : t('settings.invite_failed', 'Failed to send invite'),
          variant: 'destructive',
        });
      } else {
        toast({ title: t('settings.invite_sent', 'Invite sent!') });
        setInviteEmail('');
      }
    } catch (err) {
      console.error('[MembershipSection] Send invite error:', err);
      toast({ title: t('common.error'), description: t('settings.invite_failed', 'Failed to send invite'), variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'invited': return t('settings.referral_invited', 'Invited');
      case 'signed_up': return t('settings.referral_signed_up', 'Signed up');
      case 'qualified': return t('settings.referral_qualified', 'Qualified');
      case 'rewarded': return t('settings.referral_rewarded', 'Rewarded');
      default: return s;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'rewarded': return 'bg-primary/10 text-primary';
      case 'qualified': return 'bg-green-500/10 text-green-600';
      case 'signed_up': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
          <div className="space-y-2">
            {config.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {benefit.icon}
                </div>
                <span className="text-foreground">{t(benefit.textKey, benefit.fallback)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Credits counter — prominent */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">{creditBalance}</p>
                  <p className="text-xs text-muted-foreground">{t('credits.available', 'Available credits')}</p>
                </div>
              </div>
              {creditBalance >= 5 && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  {t('credits.can_book', 'Can book session')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('credits.cost_standard_session', 'Standard mentor session (45 min) costs 5 credits.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Referral Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            {t('referral.title', 'Invite friends, earn credits')}
          </CardTitle>
          <CardDescription>
            {t('referral.how_it_works', 'When someone signs up with your link and completes their first free intro session with a mentor, the referral is validated.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* How credits work */}
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>✦ {t('referral.earn_credits', 'Each validated referral gives you +1 credit.')}</p>
            <p className="text-xs">
              {t('referral.qualified_rule', 'We count referrals only after the first mentor intro is completed to ensure real profiles.')}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{qualifiedCount}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.qualified_referrals', 'Validated referrals')}
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{creditBalance}</p>
              <p className="text-xs text-muted-foreground">
                {t('credits.available', 'Available credits')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Invite link */}
          {referralCode && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {t('settings.your_invite_link', 'Your invite link')}
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`https://xima.lovable.app/register?ref=${referralCode}`}
                  className="text-xs bg-muted/50"
                />
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Send invite by email */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t('settings.send_invite_email', 'Send invite by email')}
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('settings.email_placeholder', 'friend@example.com')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <Button
                variant="default"
                size="icon"
                onClick={handleSendInvite}
                disabled={sendingInvite || !inviteEmail.trim()}
                className="shrink-0"
              >
                {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Recent referrals */}
          {referrals.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t('settings.recent_invites', 'Recent invites')}
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate text-xs">
                          {ref.referred_email
                            ? ref.referred_email.replace(/(.{2}).*@/, '$1***@')
                            : t('settings.referral_user', 'Referred user')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(ref.status)}`}>
                          {getStatusLabel(ref.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/contact-sales'}
                    >
                      {t('pricing.contact_sales', 'Contact Sales')}
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
