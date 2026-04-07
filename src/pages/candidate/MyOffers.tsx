import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, CheckCircle, XCircle, Clock, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const OfferCard = ({ offer, onResponded }: { offer: HiringOffer; onResponded: () => void }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const companyName = (offer as any).business_profiles?.company_name || 'Company';
  const isPending = offer.offer_status === 'sent';

  const respondToOffer = async (decision: 'accepted' | 'declined') => {
    setIsResponding(true);
    try {
      const { error } = await supabase.functions.invoke('respond-to-offer', {
        body: { offer_id: offer.id, response: decision, candidate_message: message || undefined },
      });
      if (error) throw error;
      toast({
        title: decision === 'accepted'
          ? t('offers.accepted', 'Accepted')
          : t('offers.declined', 'Declined'),
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

  const statusVariant = offer.offer_status === 'accepted' ? 'default'
    : offer.offer_status === 'declined' ? 'destructive'
    : 'secondary';

  const statusIcon = offer.offer_status === 'accepted' ? <CheckCircle className="w-3 h-3" />
    : offer.offer_status === 'declined' ? <XCircle className="w-3 h-3" />
    : <Clock className="w-3 h-3" />;

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {companyName[0]}
            </div>
            <div>
              <p className="font-semibold text-foreground">{companyName}</p>
              <p className="text-xs text-muted-foreground">
                {offer.created_at && new Date(offer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant} className="gap-1">
            {statusIcon}
            {offer.offer_status === 'sent' ? t('offers.pending', 'Pending')
              : offer.offer_status === 'accepted' ? t('offers.accepted', 'Accepted')
              : t('offers.declined', 'Declined')}
          </Badge>
        </div>

        {/* Offer details */}
        {offer.offer_message && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground">{offer.offer_message}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {offer.offer_salary && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              {offer.offer_salary}
            </div>
          )}
          {offer.offer_start_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {t('offers.start', 'Start')}: {new Date(offer.offer_start_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Response actions */}
        {isPending && (
          <div className="space-y-3 pt-2 border-t border-border">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('offers.response_placeholder', 'Optional message to the company...')}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => respondToOffer('accepted')}
                disabled={isResponding}
                className="flex-1 gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                {t('offers.accept', 'Accept Offer')}
              </Button>
              <Button
                variant="outline"
                onClick={() => respondToOffer('declined')}
                disabled={isResponding}
                className="flex-1 gap-1"
              >
                <XCircle className="w-4 h-4" />
                {t('offers.decline', 'Decline')}
              </Button>
            </div>
          </div>
        )}

        {/* Already responded */}
        {offer.candidate_response && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">{t('offers.your_response', 'Your response')}:</p>
            <p className="text-sm text-foreground">{offer.candidate_response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MyOffers = () => {
  const { t } = useTranslation();
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
    <MainLayout requireAuth>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('offers.title', 'Job Offers')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('offers.subtitle', 'Review and respond to offers from companies')}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
          </div>
        ) : !offers?.length ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">
              {t('offers.no_offers', 'No offers yet')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('offers.no_offers_hint', 'Complete challenges to get noticed by companies')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onResponded={() => queryClient.invalidateQueries({ queryKey: ['my-offers'] })}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyOffers;
