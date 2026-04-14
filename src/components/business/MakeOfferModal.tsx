import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert, User, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getArchetypeImageUrl } from '@/utils/anonymousDisplay';

interface RevealedProfile {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  seniority_level: string | null;
  total_years_experience: number | null;
  cv_summary: string | null;
  cv_archetype: string | null;
  alignment_score: number | null;
}

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    anonymous_label?: string | null;
    ximatar_archetype?: string | null;
    ximatar_level?: number;
    total_score?: number;
    identity_revealed?: boolean;
  };
  hiringGoalId: string;
  onComplete?: () => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  open, onOpenChange, candidate, hiringGoalId, onComplete,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedProfile, setRevealedProfile] = useState<RevealedProfile | null>(null);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);

  const imgUrl = getArchetypeImageUrl(candidate.ximatar_archetype);
  const archetypeName = (candidate.ximatar_archetype || 'unknown').charAt(0).toUpperCase() + (candidate.ximatar_archetype || 'unknown').slice(1);

  const revealIdentity = async () => {
    setIsRevealing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reveal-candidate-identity', {
        body: { shortlist_id: candidate.id, hiring_goal_id: hiringGoalId },
      });
      if (error) throw error;
      setRevealedProfile(data.candidate);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || 'Failed to reveal identity', variant: 'destructive' });
    } finally {
      setIsRevealing(false);
    }
  };

  const sendOffer = async () => {
    if (!revealedProfile) return;
    setSendingOffer(true);
    try {
      // First find the offer record created during identity reveal
      const { data: offers } = await supabase
        .from('hiring_offers')
        .select('id')
        .eq('shortlist_id', candidate.id)
        .eq('offer_status', 'draft')
        .limit(1);

      const offerId = offers?.[0]?.id;
      if (!offerId) {
        toast({ title: t('common.error'), description: 'No draft offer found', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.functions.invoke('send-hiring-offer', {
        body: {
          offer_id: offerId,
          offer_message: offerMessage || undefined,
          offer_salary: offerSalary || undefined,
          offer_start_date: startDate || undefined,
        },
      });
      if (error) throw error;

      toast({ title: t('hiring.offer_sent', 'Offer sent successfully'), description: `→ ${revealedProfile.full_name}` });
      onComplete?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message || 'Failed to send offer', variant: 'destructive' });
    } finally {
      setSendingOffer(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setRevealedProfile(null);
      setOfferMessage('');
      setOfferSalary('');
      setStartDate('');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('anonymous.offer_title', 'Make an offer')}</DialogTitle>
          <DialogDescription>
            {t('anonymous.reveal_warning', "Once revealed, you'll see the candidate's name, CV, and contact details. This action is logged and cannot be undone.")}
          </DialogDescription>
        </DialogHeader>

        {!revealedProfile ? (
          <div className="space-y-4">
            {/* Anonymous profile */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <img src={imgUrl} alt={archetypeName} className="h-10 w-10 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <p className="font-semibold text-foreground">
                  {t('anonymous.candidate_label', 'Candidate #{{number}}', { number: candidate.anonymous_label || '?' })} — {archetypeName}
                </p>
                {candidate.total_score !== undefined && (
                  <p className="text-sm text-muted-foreground">Score: {candidate.total_score}/100</p>
                )}
              </div>
            </div>

            {/* Warning */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">{t('anonymous.reveal_title', 'Reveal candidate identity')}</p>
                  <p className="text-muted-foreground mt-1">
                    {t('anonymous.reveal_warning')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={revealIdentity} disabled={isRevealing} className="w-full">
              {isRevealing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('anonymous.revealing', 'Revealing identity...')}</>
              ) : (
                t('anonymous.reveal_button', 'Reveal Identity & Prepare Offer')
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Revealed profile */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {revealedProfile.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{revealedProfile.full_name}</p>
                {revealedProfile.email && <p className="text-sm text-muted-foreground">{revealedProfile.email}</p>}
                {revealedProfile.phone && <p className="text-sm text-muted-foreground">{revealedProfile.phone}</p>}
                {revealedProfile.location && <p className="text-sm text-muted-foreground">{revealedProfile.location}</p>}
              </div>
              <Badge className="ml-auto">{t('anonymous.identity_revealed', 'Identity revealed')}</Badge>
            </div>

            {/* CV summary */}
            {revealedProfile.cv_summary && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium text-foreground mb-1">CV Summary</p>
                <p className="text-sm text-muted-foreground">{revealedProfile.cv_summary}</p>
              </div>
            )}

            {/* Offer form */}
            <div className="space-y-3">
              <div>
                <Label>{t('anonymous.offer_message_label', 'Message to candidate')}</Label>
                <Textarea
                  value={offerMessage}
                  onChange={e => setOfferMessage(e.target.value)}
                  placeholder="Congratulations! We'd like to offer you..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('anonymous.offer_salary_label', 'Salary offer')}</Label>
                  <Input
                    value={offerSalary}
                    onChange={e => setOfferSalary(e.target.value)}
                    placeholder="€45,000/year"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t('anonymous.offer_start_label', 'Start date')}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Button onClick={sendOffer} disabled={sendingOffer} className="w-full gap-2">
              <Send className="w-4 h-4" />
              {t('anonymous.send_offer', 'Send Offer')} {revealedProfile.full_name && `to ${revealedProfile.full_name}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
