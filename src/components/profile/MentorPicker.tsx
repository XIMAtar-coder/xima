import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FeaturedProfessionals from '@/components/FeaturedProfessionals';
import { pillarShortName } from '@/components/ximatar-journey/pillarLabels';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/log';

interface Props {
  /** Pillar scores 0–10, drive included. */
  pillarScores: Record<string, number> | null;
  ximatar?: string | null;
  onAssigned: () => void;
}

/**
 * The mentor choice for whoever did not pick one on the results page: the
 * mentors closest to the profile (recommend-mentors), first call free.
 */
export const MentorPicker: React.FC<Props> = ({ pillarScores, ximatar, onAssigned }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const list = pillarScores
    ? Object.entries(pillarScores).map(([pillar, score]) => ({ pillar, score: Number(score) }))
    : [];
  const content = list.filter((p) => p.pillar !== 'drive').sort((a, b) => a.score - b.score);
  const weak = content[0] ? pillarShortName(t, content[0].pillar) : '';

  const choose = async (mentor: { id: string; full_name: string }) => {
    if (busy) return;
    setBusy(mentor.id);
    try {
      const { data, error } = await supabase.functions.invoke('assign-mentor', { body: { professional_id: mentor.id } });
      if (error || !data?.success) throw error || new Error('assign failed');
      toast({ title: t('results2.mentor_assigned', { name: mentor.full_name.split(/\s+/)[0] }) });
      onAssigned();
    } catch (e) {
      log.error('[MentorPicker] assign failed', e);
      toast({ title: t('results2.mentor_assign_error_title'), description: t('results2.mentor_assign_error'), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[19px] font-semibold tracking-[-0.3px] text-foreground">{t('results2.mentor_title')}</h3>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {weak ? t('results2.mentor_body', { pillar: weak }) : t('dashboard.mentor_guide')}
        </p>
        <p className="mt-2 text-[13px] font-semibold text-primary">{t('results2.mentor_free_call')}</p>
      </div>
      <FeaturedProfessionals
        variant="compact"
        limit={3}
        onSelect={(p) => choose(p)}
        selectedId={busy || undefined}
        pillarScores={list}
        ximatar={ximatar || undefined}
      />
    </div>
  );
};

export default MentorPicker;
