import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/context/UserContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Globe, Mail, Save, Clock, TrendingUp, 
  Sparkles, Loader2, Edit2, RotateCcw, X, Info, Target, Dna
} from 'lucide-react';
import CompanyLegalSettings from '@/components/business/CompanyLegalSettings';
import { ProfilingOptOutSection } from '@/components/settings/ProfilingOptOutSection';
import { AccountDeletionSection } from '@/components/settings/AccountDeletionSection';
import { BusinessPlanCard } from '@/components/business/BusinessPlanCard';
import { LogoUploader } from '@/components/business/LogoUploader';
import { toast as sonnerToast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Editable Field Sub-Component ───
const EditableField = ({ label, impact, value, isOverridden, editing, type, rows, onEdit, onCancel, onChange, onSave, onReset }: any) => {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState('');

  return (
    <div className="border-b border-border pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {isOverridden && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800">
                {t('business.profile.modified', 'Modificato')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{impact}</p>
        </div>
        {!editing && (
          <div className="flex gap-1">
            {isOverridden && (
              <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('common.reset_to_ai', 'Ripristina AI')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit} className="h-7 text-xs">
              <Edit2 className="w-3 h-3 mr-1" />
              {t('common.edit', 'Modifica')}
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        type === 'tags' ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {(value || []).map((v: string, i: number) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800">{v}</span>
            ))}
            {(!value || value.length === 0) && <p className="text-sm text-muted-foreground italic">{t('common.empty', 'Vuoto')}</p>}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground">
            {value || <span className="text-muted-foreground italic">{t('common.empty', 'Vuoto')}</span>}
          </p>
        )
      ) : (
        <div className="space-y-3 mt-2">
          {type === 'textarea' && (
            <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows || 3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
          )}
          {type === 'tags' && (
            <>
              <div className="flex flex-wrap gap-2">
                {(value || []).map((v: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800">
                    {v}
                    <button onClick={() => onChange(value.filter((_: string, j: number) => j !== i))} className="ml-1 hover:text-purple-700 dark:hover:text-purple-300">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); onChange([...(value || []), tagInput.trim()]); setTagInput(''); } }}
                  placeholder={t('common.add_tag', 'Aggiungi e premi Enter...')}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>{t('common.save', 'Salva')}</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel', 'Annulla')}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Editable AI Profile Section ───
const EditableAIProfileSection = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState({ summary: false, values: false, operating: false, communication: false, traits: false });
  const [drafts, setDrafts] = useState({ summary: '', values: [] as string[], operating: '', communication: '', traits: [] as string[] });

  const { data: companyProfile, refetch } = useQuery({
    queryKey: ['company-profile-edit', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_profiles').select('*').eq('company_id', user.id).maybeSingle();
      if (data) {
        setDrafts({
          summary: (data as any).summary_override ?? data.summary ?? '',
          values: (data as any).values_override ?? data.values ?? [],
          operating: (data as any).operating_style_override ?? data.operating_style ?? '',
          communication: (data as any).communication_style_override ?? data.communication_style ?? '',
          traits: (data as any).ideal_traits_override ?? data.ideal_traits ?? [],
        });
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const isOverridden = (field: string) => {
    const map: Record<string, string> = {
      summary: 'summary_override', values: 'values_override',
      operating: 'operating_style_override', communication: 'communication_style_override',
      traits: 'ideal_traits_override',
    };
    return (companyProfile as any)?.[map[field]] !== null && (companyProfile as any)?.[map[field]] !== undefined;
  };

  const saveField = async (field: string, value: any) => {
    if (!user?.id || !companyProfile) return;
    const fieldMap: Record<string, string> = {
      summary: 'summary_override', values: 'values_override',
      operating: 'operating_style_override', communication: 'communication_style_override',
      traits: 'ideal_traits_override',
    };
    try {
      const { error } = await supabase.from('company_profiles')
        .update({ [fieldMap[field]]: value, overrides_updated_at: new Date().toISOString() } as any)
        .eq('company_id', user.id);
      if (error) throw error;
      sonnerToast.success(t('business.profile.field_saved', 'Modifica salvata'));
      setEditing({ ...editing, [field]: false });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    } catch (err: any) {
      sonnerToast.error(err.message);
    }
  };

  const resetField = async (field: string) => {
    if (!confirm(t('business.profile.reset_confirm', "Ripristinare il valore generato dall'AI?"))) return;
    if (!user?.id) return;
    const fieldMap: Record<string, string> = {
      summary: 'summary_override', values: 'values_override',
      operating: 'operating_style_override', communication: 'communication_style_override',
      traits: 'ideal_traits_override',
    };
    await supabase.from('company_profiles').update({ [fieldMap[field]]: null } as any).eq('company_id', user.id);
    sonnerToast.success(t('business.profile.reset_success', 'Ripristinato il valore AI'));
    refetch();
    queryClient.invalidateQueries({ queryKey: ['company-profile'] });
  };

  if (!companyProfile) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t('business.settings.ai_profile', 'Profilo AI Editabile')}
        </CardTitle>
        <CardDescription>
          {t('business.settings.ai_profile_hint', "Modifica i campi generati dall'AI. Le tue modifiche si sovrappongono al baseline AI senza alterare il DNA dei pilastri.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                {t('business.settings.matching_impact_title', 'Come le tue modifiche influenzano il matching')}
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                {t('business.settings.matching_impact_desc', 'Il DNA dei pilastri resta ancorato all\'analisi AI. Le modifiche qui sotto influenzano come i candidati vedono la tua azienda, il punteggio di affinità culturale e i tratti comportamentali cercati nei XIMAtar.')}
              </p>
            </div>
          </div>
        </div>

        <EditableField label={t('business.company.summary', 'Riepilogo Aziendale')} impact={t('business.settings.summary_impact', 'Visibile ai candidati nella shortlist.')} value={drafts.summary} isOverridden={isOverridden('summary')} editing={editing.summary} type="textarea" rows={4}
          onEdit={() => setEditing({ ...editing, summary: true })}
          onCancel={() => { setEditing({ ...editing, summary: false }); setDrafts({ ...drafts, summary: (companyProfile as any).summary_override ?? companyProfile.summary ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, summary: v })}
          onSave={() => saveField('summary', drafts.summary)} onReset={() => resetField('summary')} />

        <EditableField label={t('business.company.core_values', 'Valori Fondamentali')} impact={t('business.settings.values_impact', 'Pesano nel calcolo del culture-fit.')} value={drafts.values} isOverridden={isOverridden('values')} editing={editing.values} type="tags"
          onEdit={() => setEditing({ ...editing, values: true })}
          onCancel={() => { setEditing({ ...editing, values: false }); setDrafts({ ...drafts, values: (companyProfile as any).values_override ?? companyProfile.values ?? [] }); }}
          onChange={(v: string[]) => setDrafts({ ...drafts, values: v })}
          onSave={() => saveField('values', drafts.values)} onReset={() => resetField('values')} />

        <EditableField label={t('business.company.operating_style', 'Stile Operativo')} impact={t('business.settings.operating_impact', 'Determina il peso di Drive vs Knowledge nel matching.')} value={drafts.operating} isOverridden={isOverridden('operating')} editing={editing.operating} type="textarea" rows={3}
          onEdit={() => setEditing({ ...editing, operating: true })}
          onCancel={() => { setEditing({ ...editing, operating: false }); setDrafts({ ...drafts, operating: (companyProfile as any).operating_style_override ?? companyProfile.operating_style ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, operating: v })}
          onSave={() => saveField('operating', drafts.operating)} onReset={() => resetField('operating')} />

        <EditableField label={t('business.company.communication_style', 'Stile di Comunicazione')} impact={t('business.settings.communication_impact', "Influenza il peso del pilastro Communication.")} value={drafts.communication} isOverridden={isOverridden('communication')} editing={editing.communication} type="textarea" rows={3}
          onEdit={() => setEditing({ ...editing, communication: true })}
          onCancel={() => { setEditing({ ...editing, communication: false }); setDrafts({ ...drafts, communication: (companyProfile as any).communication_style_override ?? companyProfile.communication_style ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, communication: v })}
          onSave={() => saveField('communication', drafts.communication)} onReset={() => resetField('communication')} />

        <EditableField label={t('business.company.ideal_candidate_traits', 'Tratti Ideali del Candidato')} impact={t('business.settings.traits_impact', 'Filtro diretto sul matching.')} value={drafts.traits} isOverridden={isOverridden('traits')} editing={editing.traits} type="tags"
          onEdit={() => setEditing({ ...editing, traits: true })}
          onCancel={() => { setEditing({ ...editing, traits: false }); setDrafts({ ...drafts, traits: (companyProfile as any).ideal_traits_override ?? companyProfile.ideal_traits ?? [] }); }}
          onChange={(v: string[]) => setDrafts({ ...drafts, traits: v })}
          onSave={() => saveField('traits', drafts.traits)} onReset={() => resetField('traits')} />

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{t('business.settings.dna_note_title', 'Nota sul DNA dei pilastri')}: </strong>
            {t('business.settings.dna_note', "Il DNA dei pilastri non cambia con le modifiche qui sopra. Per ricalcolarlo, usa la sezione DNA sotto.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── DNA Pillar Section ───
const DnaPillarSection = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);

  const { data: businessProfile } = useQuery({
    queryKey: ['business-profile-dna', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('business_profiles')
        .select('dna_last_regenerated_at, dna_locked_until, strategic_focus')
        .eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-dna', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('company_profiles')
        .select('pillar_vector, recommended_ximatars')
        .eq('company_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: dnaHistory } = useQuery({
    queryKey: ['dna-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('company_dna_history')
        .select('*').eq('business_id', user.id)
        .order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const daysUntilUnlock = useMemo(() => {
    if (!businessProfile?.dna_locked_until) return 0;
    const diff = (new Date(businessProfile.dna_locked_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  }, [businessProfile]);

  const isLocked = daysUntilUnlock > 0;
  const pillarVector = companyProfile?.pillar_vector as Record<string, number> | null;
  const strategicFocus = businessProfile?.strategic_focus as { pillar?: string; weight_boost?: number; expires_at?: string } | null;

  const PILLAR_LABELS: Record<string, string> = {
    drive: 'Drive', knowledge: 'Knowledge', comp_power: 'Comp. Power',
    computational_power: 'Comp. Power', creativity: 'Creativity', communication: 'Communication',
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Dna className="w-5 h-5 text-primary" />
            {t('business.dna.title', 'DNA Pilastri Aziendali')}
          </CardTitle>
          {businessProfile?.dna_last_regenerated_at && (
            <span className="text-xs text-muted-foreground">
              {t('business.dna.last_updated', 'Ultimo aggiornamento')}: {new Date(businessProfile.dna_last_regenerated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Philosophy banner */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20 p-4">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-purple-900 dark:text-purple-100">
                {t('business.dna.philosophy_title', 'Il DNA è identità, non preferenza')}
              </p>
              <p className="text-xs text-purple-800 dark:text-purple-200 mt-1 leading-relaxed">
                {t('business.dna.philosophy_desc', 'XIMA non permette di modificare il DNA ogni giorno. Il tuo DNA rappresenta chi sei davvero come azienda. Puoi rigenerare al massimo una volta a trimestre. Tra una rigenerazione e l\'altra, puoi dichiarare un "focus strategico" temporaneo.')}
              </p>
            </div>
          </div>
        </div>

        {/* DNA pillars display */}
        {pillarVector && Object.keys(pillarVector).length > 0 && (
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(pillarVector).map(([key, value]) => {
              const score = typeof value === 'number' ? value : 0;
              const label = PILLAR_LABELS[key] || key.replace(/_/g, ' ');
              const focusBoost = strategicFocus?.pillar === key ? strategicFocus.weight_boost || 0 : 0;
              return (
                <div key={key} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                      <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                        strokeDasharray={`${(score / 100) * 201} 201`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-semibold text-foreground">{score}</span>
                    </div>
                    {focusBoost > 0 && (
                      <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-100">
                        +{Math.round(focusBoost * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground capitalize">{label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setShowFocusModal(true)} className="flex-1">
            <Target className="w-4 h-4 mr-2" />
            {strategicFocus ? t('business.dna.update_focus', 'Aggiorna focus strategico') : t('business.dna.set_focus', 'Imposta focus strategico')}
          </Button>
          <Button variant={isLocked ? 'ghost' : 'default'} onClick={() => !isLocked && setShowRegenerateModal(true)} disabled={isLocked} className="flex-1">
            <Sparkles className="w-4 h-4 mr-2" />
            {isLocked ? t('business.dna.locked_for_days', `Bloccato per ${daysUntilUnlock} giorni`) : t('business.dna.regenerate', 'Rigenera DNA')}
          </Button>
        </div>

        {isLocked && (
          <p className="text-xs text-muted-foreground text-center">
            {t('business.dna.lock_explanation', 'Il prossimo aggiornamento del DNA sarà disponibile dopo il')} {new Date(businessProfile?.dna_locked_until!).toLocaleDateString()}
          </p>
        )}

        {/* DNA history */}
        {dnaHistory && dnaHistory.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {t('business.dna.history', 'Storico evoluzione')}
            </p>
            <div className="space-y-2">
              {dnaHistory.slice(0, 3).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/20">
                  <span className="text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</span>
                  {entry.regeneration_reason && (
                    <span className="text-muted-foreground italic flex-1 ml-3 truncate">"{entry.regeneration_reason}"</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Regenerate DNA Modal */}
      {showRegenerateModal && (
        <RegenerateDnaModal
          onClose={() => setShowRegenerateModal(false)}
          pillarScores={pillarVector}
          bestFitXimatars={companyProfile?.recommended_ximatars}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['business-profile-dna'] });
            queryClient.invalidateQueries({ queryKey: ['company-profile-dna'] });
            queryClient.invalidateQueries({ queryKey: ['company-profile'] });
            queryClient.invalidateQueries({ queryKey: ['dna-history'] });
          }}
        />
      )}

      {/* Strategic Focus Modal */}
      {showFocusModal && (
        <StrategicFocusModal
          onClose={() => setShowFocusModal(false)}
          currentFocus={strategicFocus}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['business-profile-dna'] })}
        />
      )}
    </Card>
  );
};

// ─── Regenerate DNA Modal ───
const RegenerateDnaModal = ({ onClose, pillarScores, bestFitXimatars, onSuccess }: { onClose: () => void; pillarScores: any; bestFitXimatars: any; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [reason, setReason] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (reason.trim().length < 20) {
      sonnerToast.error(t('business.dna.reason_too_short', 'Spiega in almeno 20 caratteri perché vuoi rigenerare il DNA'));
      return;
    }
    setRegenerating(true);
    try {
      // Save current DNA to history
      if (pillarScores) {
        await supabase.from('company_dna_history').insert({
          business_id: user?.id,
          pillar_scores: pillarScores,
          best_fit_ximatars: bestFitXimatars,
          regeneration_reason: reason,
          triggered_by_user: user?.id,
        });
      }

      const { error } = await supabase.functions.invoke('generate-company-profile', {
        body: { company_id: user?.id, force_regenerate: true, regeneration_reason: reason },
      });
      if (error) throw error;

      // Lock DNA for 90 days
      const lockUntil = new Date();
      lockUntil.setDate(lockUntil.getDate() + 90);
      await supabase.from('business_profiles').update({
        dna_last_regenerated_at: new Date().toISOString(),
        dna_locked_until: lockUntil.toISOString(),
      }).eq('user_id', user?.id);

      sonnerToast.success(t('business.dna.regenerated', 'DNA rigenerato. Prossima rigenerazione disponibile tra 90 giorni.'));
      onSuccess();
      onClose();
    } catch (err: any) {
      sonnerToast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{t('business.dna.regenerate_title', 'Rigenera il DNA aziendale')}</DialogTitle>
          <DialogDescription>{t('business.dna.regenerate_subtitle', 'Questa azione bloccherà il DNA per 90 giorni. Spiega cosa è cambiato.')}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 my-3">
          <p className="text-xs text-amber-900 dark:text-amber-100">
            <strong>{t('business.dna.warning_title', 'Importante')}: </strong>
            {t('business.dna.warning_desc', 'Una volta rigenerato, non potrai modificare il DNA per 90 giorni. Usa il "focus strategico" nel frattempo.')}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            {t('business.dna.reason_label', 'Cosa è cambiato? (min 20 caratteri)')}
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder={t('business.dna.reason_placeholder', 'es. Abbiamo aperto una nuova divisione AI/ML...')}
            rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none" />
          <p className="text-xs text-muted-foreground mt-1">{reason.length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Annulla')}</Button>
          <Button onClick={handleRegenerate} disabled={regenerating || reason.trim().length < 20}>
            {regenerating ? t('business.dna.regenerating', 'Rigenerazione...') : t('business.dna.confirm_regenerate', 'Conferma e Rigenera')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Strategic Focus Modal ───
const StrategicFocusModal = ({ onClose, currentFocus, onSuccess }: { onClose: () => void; currentFocus: any; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [pillar, setPillar] = useState(currentFocus?.pillar || 'drive');
  const [boostLevel, setBoostLevel] = useState(currentFocus?.weight_boost || 0.10);
  const [expiresAt, setExpiresAt] = useState(
    currentFocus?.expires_at?.slice(0, 10) || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );

  const handleSave = async () => {
    const focus = { pillar, weight_boost: boostLevel, expires_at: expiresAt, set_at: new Date().toISOString() };
    await supabase.from('business_profiles').update({ strategic_focus: focus }).eq('user_id', user?.id);
    sonnerToast.success(t('business.dna.focus_saved', 'Focus strategico salvato'));
    onSuccess();
    onClose();
  };

  const handleClear = async () => {
    await supabase.from('business_profiles').update({ strategic_focus: null }).eq('user_id', user?.id);
    sonnerToast.success(t('business.dna.focus_cleared', 'Focus strategico rimosso'));
    onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{t('business.dna.focus_title', 'Imposta focus strategico')}</DialogTitle>
          <DialogDescription>{t('business.dna.focus_subtitle', 'Orienta temporaneamente il matching verso un pilastro specifico, senza alterare il DNA permanente.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('business.dna.focus_pillar', 'Pilastro da enfatizzare')}</label>
            <select value={pillar} onChange={e => setPillar(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="drive">Drive</option>
              <option value="knowledge">Knowledge</option>
              <option value="comp_power">Comp. Power</option>
              <option value="creativity">Creativity</option>
              <option value="communication">Communication</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t('business.dna.focus_intensity', 'Intensità del boost')}: +{Math.round(boostLevel * 100)}%
            </label>
            <input type="range" min="0.05" max="0.25" step="0.05" value={boostLevel}
              onChange={e => setBoostLevel(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>+5% ({t('business.dna.subtle', 'Sottile')})</span>
              <span>+25% ({t('business.dna.strong', 'Forte')})</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('business.dna.focus_expires', 'Scade il')}</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              max={new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none" />
            <p className="text-xs text-muted-foreground mt-1">{t('business.dna.focus_expires_hint', 'Dopo questa data, il focus si disattiverà automaticamente')}</p>
          </div>
        </div>
        <DialogFooter>
          {currentFocus && <Button variant="ghost" onClick={handleClear}>{t('business.dna.clear_focus', 'Rimuovi focus')}</Button>}
          <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Annulla')}</Button>
          <Button onClick={handleSave}>{t('common.save', 'Salva')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Form Field Helper ───
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

// ─── Main Settings Page ───
const BusinessSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { businessProfile: sharedProfile, invalidate: invalidateBusinessProfile, updateOptimistically } = useBusinessProfile();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: '', website: '', hrContactEmail: '',
    defaultChallengeDuration: 7, defaultChallengeDifficulty: 3,
    manual_hq_city: '', manual_hq_country: '', manual_industry: '',
    manual_employees_count: '', manual_revenue_range: '', manual_founded_year: '',
  });

  useEffect(() => {
    if (sharedProfile && !initialized) {
      setFormData({
        companyName: sharedProfile.company_name || '',
        website: sharedProfile.website || '',
        hrContactEmail: sharedProfile.hr_contact_email || '',
        defaultChallengeDuration: sharedProfile.default_challenge_duration || 7,
        defaultChallengeDifficulty: sharedProfile.default_challenge_difficulty || 3,
        manual_hq_city: sharedProfile.manual_hq_city || sharedProfile.snapshot_hq_city || '',
        manual_hq_country: sharedProfile.manual_hq_country || sharedProfile.snapshot_hq_country || '',
        manual_industry: sharedProfile.manual_industry || sharedProfile.snapshot_industry || '',
        manual_employees_count: (sharedProfile.manual_employees_count || sharedProfile.snapshot_employees_count || '').toString(),
        manual_revenue_range: sharedProfile.manual_revenue_range || sharedProfile.snapshot_revenue_range || '',
        manual_founded_year: (sharedProfile.manual_founded_year || sharedProfile.snapshot_founded_year || '').toString(),
      });
      setLogoUrl((sharedProfile as any).logo_url || (sharedProfile as any).company_logo || null);
      setInitialized(true);
    }
  }, [sharedProfile, initialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .upsert({
          user_id: user?.id,
          company_name: formData.companyName,
          website: formData.website,
          hr_contact_email: formData.hrContactEmail,
          default_challenge_duration: formData.defaultChallengeDuration,
          default_challenge_difficulty: formData.defaultChallengeDifficulty,
          manual_hq_city: formData.manual_hq_city || null,
          manual_hq_country: formData.manual_hq_country || null,
          manual_industry: formData.manual_industry || null,
          manual_employees_count: formData.manual_employees_count ? parseInt(formData.manual_employees_count) : null,
          manual_revenue_range: formData.manual_revenue_range || null,
          manual_founded_year: formData.manual_founded_year ? parseInt(formData.manual_founded_year) : null,
          snapshot_manual_override: true,
        });
      if (error) throw error;
      toast({ title: t('business_portal.success'), description: t('business_portal.settings_updated') });
      invalidateBusinessProfile();
    } catch (error: any) {
      toast({ title: t('business_portal.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-colors";

  return (
    <BusinessLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.settings_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.settings_page_subtitle')}</p>
        </div>

        <BusinessPlanCard />

        {/* ─── Company Identity & Basics ─── */}
        <form onSubmit={handleSubmit}>
          <Card className="border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="text-primary" />
                {t('business.profile.identity_section', 'Identità e dati di base')}
              </CardTitle>
              <CardDescription>{t('business.profile.identity_hint', 'Dati factuali della tua azienda. Alimentano l\'analisi AI e il matching.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">{t('business.settings.logo', 'Logo aziendale')}</Label>
                <LogoUploader currentLogo={logoUrl} onUpload={(url) => { setLogoUrl(url); invalidateBusinessProfile(); }} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('businessPortal.settings_company_name_label', 'Nome azienda')}>
                  <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Acme Corporation" className={inputClass} required />
                </FormField>
                <FormField label={t('businessPortal.settings_company_website_label', 'Sito web')}>
                  <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.com" className={inputClass} />
                </FormField>
                <FormField label={t('businessPortal.settings_company_hr_email_label', 'Email HR')}>
                  <input type="email" value={formData.hrContactEmail} onChange={(e) => setFormData({ ...formData, hrContactEmail: e.target.value })}
                    placeholder="hr@company.com" className={inputClass} />
                </FormField>
                <FormField label={t('business.settings.hq_city', 'Sede principale (Città)')}>
                  <input type="text" value={formData.manual_hq_city} onChange={(e) => setFormData({ ...formData, manual_hq_city: e.target.value })}
                    placeholder="es. Milano" className={inputClass} />
                </FormField>
                <FormField label={t('business.settings.country', 'Paese')}>
                  <input type="text" value={formData.manual_hq_country} onChange={(e) => setFormData({ ...formData, manual_hq_country: e.target.value })}
                    placeholder="es. Italy" className={inputClass} />
                </FormField>
                <FormField label={t('business.settings.industry', 'Settore')}>
                  <select value={formData.manual_industry} onChange={(e) => setFormData({ ...formData, manual_industry: e.target.value })}
                    className={inputClass}>
                    <option value="">—</option>
                    <option value="technology">{t('business.industry.technology', 'Tecnologia')}</option>
                    <option value="engineering">{t('business.industry.engineering', 'Ingegneria')}</option>
                    <option value="finance">{t('business.industry.finance', 'Finanza')}</option>
                    <option value="consulting">{t('business.industry.consulting', 'Consulenza')}</option>
                    <option value="healthcare">{t('business.industry.healthcare', 'Sanità')}</option>
                    <option value="manufacturing">{t('business.industry.manufacturing', 'Manifatturiero')}</option>
                    <option value="retail">{t('business.industry.retail', 'Retail')}</option>
                    <option value="education">{t('business.industry.education', 'Educazione')}</option>
                    <option value="other">{t('business.industry.other', 'Altro')}</option>
                  </select>
                </FormField>
                <FormField label={t('business.settings.size', 'Dimensione azienda')}>
                  <select value={formData.manual_employees_count} onChange={(e) => setFormData({ ...formData, manual_employees_count: e.target.value })}
                    className={inputClass}>
                    <option value="">—</option>
                    <option value="10">1-10</option>
                    <option value="50">11-50</option>
                    <option value="200">51-200</option>
                    <option value="1000">201-1000</option>
                    <option value="5000">1000+</option>
                  </select>
                </FormField>
                <FormField label={t('business.settings.founded_year', 'Anno di fondazione')}>
                  <input type="number" value={formData.manual_founded_year} onChange={(e) => setFormData({ ...formData, manual_founded_year: e.target.value })}
                    placeholder="es. 2010" min="1800" max={new Date().getFullYear()} className={inputClass} />
                </FormField>
                <FormField label={t('business.settings.revenue', 'Fatturato annuo')}>
                  <select value={formData.manual_revenue_range} onChange={(e) => setFormData({ ...formData, manual_revenue_range: e.target.value })}
                    className={inputClass}>
                    <option value="">—</option>
                    <option value="under_1m">&lt; €1M</option>
                    <option value="1m_10m">€1M - €10M</option>
                    <option value="10m_50m">€10M - €50M</option>
                    <option value="50m_500m">€50M - €500M</option>
                    <option value="over_500m">&gt; €500M</option>
                  </select>
                </FormField>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('businessPortal.settings_challenge_duration_label', 'Durata sfida predefinita (giorni)')}>
                  <input type="number" min="1" max="30" value={formData.defaultChallengeDuration}
                    onChange={(e) => setFormData({ ...formData, defaultChallengeDuration: parseInt(e.target.value) })}
                    className={inputClass} />
                </FormField>
                <FormField label={t('businessPortal.settings_challenge_difficulty_label', 'Difficoltà predefinita (1-5)')}>
                  <input type="number" min="1" max="5" value={formData.defaultChallengeDifficulty}
                    onChange={(e) => setFormData({ ...formData, defaultChallengeDifficulty: parseInt(e.target.value) })}
                    className={inputClass} />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="mr-2" size={16} />
            {loading ? t('business_portal.saving') : t('businessPortal.settings_save_cta')}
          </Button>
        </form>

        <Separator className="my-8" />

        {/* ─── Editable AI Profile ─── */}
        <EditableAIProfileSection />

        <Separator className="my-8" />

        {/* ─── DNA Pillar Section ─── */}
        <DnaPillarSection />

        <Separator className="my-8" />
        <CompanyLegalSettings />
        <Separator className="my-8" />
        <ProfilingOptOutSection />
        <Separator className="my-8" />
        <AccountDeletionSection variant="business" />
      </div>
    </BusinessLayout>
  );
};

export default BusinessSettings;