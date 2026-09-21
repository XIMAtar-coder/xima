import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CandidateLayout from '@/components/layout/CandidateLayout';
import { PageHeader, Panel, Eyebrow } from '@/components/layout/PageHeader';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { OpportunitiesTabs } from '@/components/candidate/OpportunitiesTabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HiringOffer {
  id: string;
  business_id: string;
  offer_status: string | null;
  offer_message: string | null;
  offer_salary: string | null;
  offer_start_date: string | null;
  candidate_response: string | null;
  responded_at: string | null;
  created_at: string | null;
  business_profiles?: { company_name: string } | null;
}

/** One offer as a row of the offers register. */
const OfferRow = ({ offer, onResponded }: { offer: HiringOffer; onResponded: () => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const companyName = (offer as any).business_profiles?.company_name || t('offers.company', 'Company');
  const isPending = offer.offer_status === 'sent';

  const respondToOffer = async (decision: 'accepted' | 'declined') => {
    setIsResponding(true);
    try {
      if (decision === 'accepted') {
        const { canPerformSensitiveAction } = await import('@/lib/auth/verificationGuard');
        const gate = await canPerformSensitiveAction();
        if (!gate.allowed) {
          toast({ title: 'Email non verificata', description: gate.reason, variant: 'destructive' });
          setIsResponding(false);
          return;
        }
      }
      const { error } = await supabase.functions.invoke('respond-to-offer', {
        body: { offer_id: offer.id, response: decision, candidate_message: message || undefined },
      });
      if (error) throw error;
      toast({
        title: decision === 'accepted' ? t('offers.accepted', 'Accepted') : t('offers.declined', 'Declined'),
        description: decision === 'accepted'
          ? 'Congratulations! You accepted the offer.'
          : 'You declined the offer.',
      });
      onResponded();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to respond', variant: 'destructive' });
    } finally {
      setIsResponding(false);
    }
  };

  const statusLabel = offer.offer_status === 'sent'
    ? t('offers.pending', 'Pending')
    : offer.offer_status === 'accepted'
      ? t('offers.accepted', 'Accepted')
      : t('offers.declined', 'Declined');

  return (
    <article className="border-b border-[hsl(var(--xs-line))] px-6 py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--xs-line))] font-mono text-[13px] text-foreground" aria-hidden="true">
            {companyName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[16px] font-semibold text-foreground">{companyName}</b>
            <span className="block text-[12px] text-muted-foreground">
              {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : '—'}
            </span>
          </span>
        </div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider',
          offer.offer_status === 'accepted' ? 'border-primary/40 text-primary' : 'border-[hsl(var(--xs-line))] text-muted-foreground',
        )}>
          {statusLabel}
        </span>
      </div>

      {offer.offer_message && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{offer.offer_message}</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-4 sm:max-w-md">
        <div>
          <dt className="text-[12px] text-muted-foreground">{t('jobs.fact_salary', 'Salary')}</dt>
          <dd className="text-[14px] font-medium text-foreground">{offer.offer_salary || '—'}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">{t('offers.start', 'Start')}</dt>
          <dd className="text-[14px] font-medium text-foreground">
            {offer.offer_start_date ? new Date(offer.offer_start_date).toLocaleDateString() : '—'}
          </dd>
        </div>
      </dl>

      {isPending && (
        <div className="mt-4 space-y-3 border-t border-[hsl(var(--xs-line))] pt-4">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('offers.response_placeholder', 'Optional message to the company...')}
            rows={2}
            aria-label={t('offers.response_placeholder', 'Optional message to the company...')}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => respondToOffer('accepted')} disabled={isResponding} className="gap-1.5">
              {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {t('offers.accept', 'Accept Offer')}
            </Button>
            <Button variant="outline" onClick={() => respondToOffer('declined')} disabled={isResponding} className="gap-1.5">
              <XCircle className="h-4 w-4" />
              {t('offers.decline', 'Decline')}
            </Button>
          </div>
        </div>
      )}

      {offer.candidate_response && (
        <div className="mt-3 border-t border-[hsl(var(--xs-line))] pt-3">
          <p className="text-[12px] text-muted-foreground">{t('offers.your_response', 'Your response')}</p>
          <p className="text-[14px] text-foreground">{offer.candidate_response}</p>
        </div>
      )}
    </article>
  );
};

const MyOffers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['my-offers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('hiring_offers')
        .select('*')
        .eq('candidate_user_id', user.id)
        .in('offer_status', ['sent', 'accepted', 'declined'])
        .order('created_at', { ascending: false });
      return (data || []) as HiringOffer[];
    },
  });

  return (
    <CandidateLayout breadcrumb={<span className="block truncate">{t('nav.candidate_area', 'Your space')} / {t('jobs.tab_offers', 'Offers received')}</span>}>
      <EmailVerificationBanner slim />
      <PageHeader
        eyebrow={t('dashboard.eyebrow', 'Your personal space')}
        title={t('jobs.hero_title', 'Your opportunities')}
        subtitle={t('offers.subtitle', 'Review and respond to offers from companies')}
      />
      <OpportunitiesTabs active="offers" offersCount={offers?.length} />

      {isLoading ? (
        <Panel className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </Panel>
      ) : !offers?.length ? (
        <Panel className="py-12 text-center">
          <Eyebrow>{t('offers.empty_eyebrow', 'Offers received · 0')}</Eyebrow>
          <h2 className="xs-title mx-auto mt-3 max-w-lg !text-[26px]">{t('offers.empty_title', 'The next proposal starts with you.')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-muted-foreground">
            {t('offers.no_offers_hint', 'Complete challenges to get noticed by companies')}
          </p>
          <ol className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <li className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('offers.step_1', '01 · Complete a challenge')}</li>
            <li className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('offers.step_2', '02 · The company reviews you')}</li>
            <li className="rounded-md border border-[hsl(var(--xs-line))] px-2.5 py-1">{t('offers.step_3', '03 · You receive an offer')}</li>
          </ol>
          <p className="mx-auto mt-5 max-w-lg text-[13px] text-muted-foreground">
            {t('offers.empty_note', 'When you receive an offer you can read it and answer here. Conversations with companies start from the offer.')}
          </p>
          <Button className="mt-6" onClick={() => navigate('/jobs')}>{t('offers.browse_jobs', 'Explore the listings')} →</Button>
        </Panel>
      ) : (
        <Panel className="!p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--xs-line))] px-6 py-3.5">
            <strong className="text-[14px] font-semibold text-foreground">{t('offers.list_title', 'Offers received')}</strong>
            <span className="xs-num font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{offers.length}</span>
          </div>
          {offers.map(offer => (
            <OfferRow
              key={offer.id}
              offer={offer}
              onResponded={() => queryClient.invalidateQueries({ queryKey: ['my-offers'] })}
            />
          ))}
        </Panel>
      )}
    </CandidateLayout>
  );
};

export default MyOffers;
