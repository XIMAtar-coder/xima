import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/UserContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Globe, Mail, Save, Clock, TrendingUp, MapPin, Users, Calendar,
  DollarSign, RefreshCw, Sparkles, Loader2, Edit2, RotateCcw, X, Info
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
              <span
                key={i}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800"
              >
                {v}
              </span>
            ))}
            {(!value || value.length === 0) && (
              <p className="text-sm text-muted-foreground italic">{t('common.empty', 'Vuoto')}</p>
            )}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground">
            {value || <span className="text-muted-foreground italic">{t('common.empty', 'Vuoto')}</span>}
          </p>
        )
      ) : (
        <div className="space-y-3 mt-2">
          {type === 'textarea' && (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={rows || 3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          )}
          {type === 'tags' && (
            <>
              <div className="flex flex-wrap gap-2">
                {(value || []).map((v: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-800"
                  >
                    {v}
                    <button
                      onClick={() => onChange(value.filter((_: string, j: number) => j !== i))}
                      className="ml-1 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      onChange([...(value || []), tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  placeholder={t('common.add_tag', 'Aggiungi e premi Enter...')}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>
              {t('common.save', 'Salva')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {t('common.cancel', 'Annulla')}
            </Button>
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
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState({ summary: false, values: false, operating: false, communication: false, traits: false });
  const [drafts, setDrafts] = useState({ summary: '', values: [] as string[], operating: '', communication: '', traits: [] as string[] });

  const { data: companyProfile, refetch } = useQuery({
    queryKey: ['company-profile-edit', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', user.id)
        .maybeSingle();
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
      const { error } = await supabase
        .from('company_profiles')
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
    if (!confirm(t('business.profile.reset_confirm', "Ripristinare il valore generato dall'AI? La tua modifica verrà persa."))) return;
    if (!user?.id) return;
    const fieldMap: Record<string, string> = {
      summary: 'summary_override', values: 'values_override',
      operating: 'operating_style_override', communication: 'communication_style_override',
      traits: 'ideal_traits_override',
    };
    await supabase
      .from('company_profiles')
      .update({ [fieldMap[field]]: null } as any)
      .eq('company_id', user.id);
    sonnerToast.success(t('business.profile.reset_success', 'Ripristinato il valore AI'));
    refetch();
    queryClient.invalidateQueries({ queryKey: ['company-profile'] });
  };

  const handleRegenerateProfile = async () => {
    const overrideKeys = ['summary_override', 'values_override', 'operating_style_override', 'communication_style_override', 'ideal_traits_override'];
    const hasOverrides = overrideKeys.some(k => (companyProfile as any)?.[k] !== null && (companyProfile as any)?.[k] !== undefined);
    if (hasOverrides) {
      const proceed = confirm(t('business.profile.regenerate_with_overrides_confirm',
        'Hai modifiche personalizzate ai campi del profilo. La rigenerazione aggiornerà il baseline AI ma le tue modifiche resteranno attive. Procedere?'));
      if (!proceed) return;
    }
    setRegenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-company-profile', {
        body: { company_id: user?.id, force_regenerate: true },
      });
      if (error) throw error;
      sonnerToast.success(t('business.profile.regenerated', 'Profilo rigenerato con successo'));
      refetch();
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    } catch (err: any) {
      sonnerToast.error(err.message || t('business.profile.regenerate_error', 'Errore nella rigenerazione'));
    } finally {
      setRegenerating(false);
    }
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
          {t('business.settings.ai_profile_hint', "Modifica i campi generati dall'AI per riflettere meglio la tua azienda. Le tue modifiche si sovrappongono al baseline AI senza alterare il DNA dei pilastri.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Impact explanation banner */}
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

        <EditableField
          label={t('business.company.summary', 'Riepilogo Aziendale')}
          impact={t('business.settings.summary_impact', 'Visibile ai candidati nella shortlist e nei dettagli del job.')}
          value={drafts.summary}
          isOverridden={isOverridden('summary')}
          editing={editing.summary}
          type="textarea" rows={4}
          onEdit={() => setEditing({ ...editing, summary: true })}
          onCancel={() => { setEditing({ ...editing, summary: false }); setDrafts({ ...drafts, summary: (companyProfile as any).summary_override ?? companyProfile.summary ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, summary: v })}
          onSave={() => saveField('summary', drafts.summary)}
          onReset={() => resetField('summary')}
        />

        <EditableField
          label={t('business.company.core_values', 'Valori Fondamentali')}
          impact={t('business.settings.values_impact', 'Pesano nel calcolo del culture-fit con i candidati.')}
          value={drafts.values}
          isOverridden={isOverridden('values')}
          editing={editing.values}
          type="tags"
          onEdit={() => setEditing({ ...editing, values: true })}
          onCancel={() => { setEditing({ ...editing, values: false }); setDrafts({ ...drafts, values: (companyProfile as any).values_override ?? companyProfile.values ?? [] }); }}
          onChange={(v: string[]) => setDrafts({ ...drafts, values: v })}
          onSave={() => saveField('values', drafts.values)}
          onReset={() => resetField('values')}
        />

        <EditableField
          label={t('business.company.operating_style', 'Stile Operativo')}
          impact={t('business.settings.operating_impact', 'Determina il peso di Drive vs Knowledge nel matching.')}
          value={drafts.operating}
          isOverridden={isOverridden('operating')}
          editing={editing.operating}
          type="textarea" rows={3}
          onEdit={() => setEditing({ ...editing, operating: true })}
          onCancel={() => { setEditing({ ...editing, operating: false }); setDrafts({ ...drafts, operating: (companyProfile as any).operating_style_override ?? companyProfile.operating_style ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, operating: v })}
          onSave={() => saveField('operating', drafts.operating)}
          onReset={() => resetField('operating')}
        />

        <EditableField
          label={t('business.company.communication_style', 'Stile di Comunicazione')}
          impact={t('business.settings.communication_impact', "Influenza il peso del pilastro Communication nei XIMAtar matchati.")}
          value={drafts.communication}
          isOverridden={isOverridden('communication')}
          editing={editing.communication}
          type="textarea" rows={3}
          onEdit={() => setEditing({ ...editing, communication: true })}
          onCancel={() => { setEditing({ ...editing, communication: false }); setDrafts({ ...drafts, communication: (companyProfile as any).communication_style_override ?? companyProfile.communication_style ?? '' }); }}
          onChange={(v: string) => setDrafts({ ...drafts, communication: v })}
          onSave={() => saveField('communication', drafts.communication)}
          onReset={() => resetField('communication')}
        />

        <EditableField
          label={t('business.company.ideal_candidate_traits', 'Tratti Ideali del Candidato')}
          impact={t('business.settings.traits_impact', 'Filtro diretto sul matching: i candidati che esprimono questi tratti ricevono punteggi più alti.')}
          value={drafts.traits}
          isOverridden={isOverridden('traits')}
          editing={editing.traits}
          type="tags"
          onEdit={() => setEditing({ ...editing, traits: true })}
          onCancel={() => { setEditing({ ...editing, traits: false }); setDrafts({ ...drafts, traits: (companyProfile as any).ideal_traits_override ?? companyProfile.ideal_traits ?? [] }); }}
          onChange={(v: string[]) => setDrafts({ ...drafts, traits: v })}
          onSave={() => saveField('traits', drafts.traits)}
          onReset={() => resetField('traits')}
        />

        {/* Regenerate button */}
        <div className="pt-4 border-t border-border">
          <Button variant="outline" onClick={handleRegenerateProfile} disabled={regenerating}>
            {regenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('business.profile.regenerating', 'Rigenerazione in corso...')}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{t('business.profile.regenerate', 'Rigenera Profilo AI')}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            <strong className="text-foreground">{t('business.settings.dna_note_title', 'Nota sul DNA dei pilastri')}: </strong>
            {t('business.settings.dna_note', "Il DNA dei pilastri non cambia con le modifiche qui sopra. Per ricalcolarlo, modifica sito web/settore/cultura del team nelle informazioni base e clicca \"Rigenera Profilo AI\".")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Settings Page ───
const BusinessSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { businessProfile: sharedProfile, invalidate: invalidateBusinessProfile, updateOptimistically } = useBusinessProfile();
  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: '', website: '', hrContactEmail: '',
    defaultChallengeDuration: 7, defaultChallengeDifficulty: 3,
  });

  const [snapshotData, setSnapshotData] = useState({
    manual_hq_city: '', manual_hq_country: '', manual_industry: '',
    manual_employees_count: '', manual_revenue_range: '', manual_founded_year: '',
    manual_website: '', snapshot_manual_override: false,
    snapshot_hq_city: '', snapshot_hq_country: '', snapshot_industry: '',
    snapshot_employees_count: '', snapshot_revenue_range: '', snapshot_founded_year: '',
  });

  useEffect(() => {
    if (sharedProfile && !initialized) {
      setFormData({
        companyName: sharedProfile.company_name || '',
        website: sharedProfile.website || '',
        hrContactEmail: sharedProfile.hr_contact_email || '',
        defaultChallengeDuration: sharedProfile.default_challenge_duration || 7,
        defaultChallengeDifficulty: sharedProfile.default_challenge_difficulty || 3,
      });
      setSnapshotData({
        manual_hq_city: sharedProfile.manual_hq_city || '',
        manual_hq_country: sharedProfile.manual_hq_country || '',
        manual_industry: sharedProfile.manual_industry || '',
        manual_employees_count: sharedProfile.manual_employees_count?.toString() || '',
        manual_revenue_range: sharedProfile.manual_revenue_range || '',
        manual_founded_year: sharedProfile.manual_founded_year?.toString() || '',
        manual_website: sharedProfile.manual_website || '',
        snapshot_manual_override: sharedProfile.snapshot_manual_override || false,
        snapshot_hq_city: sharedProfile.snapshot_hq_city || '',
        snapshot_hq_country: sharedProfile.snapshot_hq_country || '',
        snapshot_industry: sharedProfile.snapshot_industry || '',
        snapshot_employees_count: sharedProfile.snapshot_employees_count?.toString() || '',
        snapshot_revenue_range: sharedProfile.snapshot_revenue_range || '',
        snapshot_founded_year: sharedProfile.snapshot_founded_year?.toString() || '',
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

  const handleSaveSnapshot = async () => {
    setSnapshotLoading(true);
    const updates = {
      manual_hq_city: snapshotData.manual_hq_city || null,
      manual_hq_country: snapshotData.manual_hq_country || null,
      manual_industry: snapshotData.manual_industry || null,
      manual_employees_count: snapshotData.manual_employees_count ? parseInt(snapshotData.manual_employees_count) : null,
      manual_revenue_range: snapshotData.manual_revenue_range || null,
      manual_founded_year: snapshotData.manual_founded_year ? parseInt(snapshotData.manual_founded_year) : null,
      manual_website: snapshotData.manual_website || null,
      snapshot_manual_override: snapshotData.snapshot_manual_override,
    };
    try {
      const { error } = await supabase.from('business_profiles').update(updates).eq('user_id', user?.id);
      if (error) throw error;
      updateOptimistically(updates);
      invalidateBusinessProfile();
      toast({ title: t('business_portal.success'), description: t('business.settings.snapshot_saved') });
    } catch (error: any) {
      toast({ title: t('business_portal.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleResetToAI = async () => {
    setSnapshotLoading(true);
    const resetUpdates = {
      manual_hq_city: null, manual_hq_country: null, manual_industry: null,
      manual_employees_count: null, manual_revenue_range: null, manual_founded_year: null,
      manual_website: null, snapshot_manual_override: false,
    };
    try {
      const { error } = await supabase.from('business_profiles').update(resetUpdates).eq('user_id', user?.id);
      if (error) throw error;
      setSnapshotData(prev => ({
        ...prev, manual_hq_city: '', manual_hq_country: '', manual_industry: '',
        manual_employees_count: '', manual_revenue_range: '', manual_founded_year: '',
        manual_website: '', snapshot_manual_override: false,
      }));
      updateOptimistically(resetUpdates);
      invalidateBusinessProfile();
      toast({ title: t('business_portal.success'), description: t('business.settings.snapshot_reset') });
    } catch (error: any) {
      toast({ title: t('business_portal.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSnapshotLoading(false);
    }
  };

  return (
    <BusinessLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('businessPortal.settings_page_title')}</h1>
          <p className="text-muted-foreground">{t('businessPortal.settings_page_subtitle')}</p>
        </div>

        <BusinessPlanCard />

        <form onSubmit={handleSubmit}>
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="text-primary" />
                {t('businessPortal.settings_company_title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('businessPortal.settings_company_subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">{t('business.settings.logo', 'Logo aziendale')}</Label>
                <LogoUploader currentLogo={logoUrl} onUpload={(url) => { setLogoUrl(url); invalidateBusinessProfile(); }} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-foreground">{t('businessPortal.settings_company_name_label')}</Label>
                <Input id="companyName" placeholder="Acme Corporation" className="bg-background border-border text-foreground" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-foreground flex items-center gap-2"><Globe size={16} />{t('businessPortal.settings_company_website_label')}</Label>
                <Input id="website" type="url" placeholder="https://company.com" className="bg-background border-border text-foreground" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hrContactEmail" className="text-foreground flex items-center gap-2"><Mail size={16} />{t('businessPortal.settings_company_hr_email_label')}</Label>
                <Input id="hrContactEmail" type="email" placeholder="hr@company.com" className="bg-background border-border text-foreground" value={formData.hrContactEmail} onChange={(e) => setFormData({ ...formData, hrContactEmail: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">{t('businessPortal.settings_challenge_defaults_title')}</CardTitle>
              <CardDescription className="text-muted-foreground">{t('businessPortal.settings_challenge_defaults_subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-foreground flex items-center gap-2"><Clock size={16} />{t('businessPortal.settings_challenge_duration_label')}</Label>
                <Input id="duration" type="number" min="1" max="30" className="bg-background border-border text-foreground" value={formData.defaultChallengeDuration} onChange={(e) => setFormData({ ...formData, defaultChallengeDuration: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-foreground flex items-center gap-2"><TrendingUp size={16} />{t('businessPortal.settings_challenge_difficulty_label')}</Label>
                <Input id="difficulty" type="number" min="1" max="5" className="bg-background border-border text-foreground" value={formData.defaultChallengeDifficulty} onChange={(e) => setFormData({ ...formData, defaultChallengeDifficulty: parseInt(e.target.value) })} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={loading}>
            <Save className="mr-2" size={16} />
            {loading ? t('business_portal.saving') : t('businessPortal.settings_save_cta')}
          </Button>
        </form>

        <Separator className="my-8" />

        {/* Editable AI Profile Section */}
        <EditableAIProfileSection />

        <Separator className="my-8" />

        {/* Company Snapshot Section */}
        <Card id="snapshot" className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="text-amber-500" />
              {t('businessPortal.settings_snapshot_title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('businessPortal.settings_snapshot_subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-foreground font-medium">{t('businessPortal.settings_snapshot_manual_toggle')}</Label>
                <p className="text-xs text-muted-foreground">{t('businessPortal.settings_snapshot_manual_body')}</p>
              </div>
              <Switch checked={snapshotData.snapshot_manual_override} onCheckedChange={(checked) => setSnapshotData(prev => ({ ...prev, snapshot_manual_override: checked }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><MapPin size={16} />{t('businessPortal.settings_snapshot_city_label')}</Label>
                <Input placeholder={snapshotData.snapshot_hq_city || t('business.settings.city_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_hq_city} onChange={(e) => setSnapshotData({ ...snapshotData, manual_hq_city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><MapPin size={16} />{t('businessPortal.settings_snapshot_country_label')}</Label>
                <Input placeholder={snapshotData.snapshot_hq_country || t('business.settings.country_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_hq_country} onChange={(e) => setSnapshotData({ ...snapshotData, manual_hq_country: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><Building2 size={16} />{t('businessPortal.settings_snapshot_sector_label')}</Label>
                <Input placeholder={snapshotData.snapshot_industry || t('business.settings.industry_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_industry} onChange={(e) => setSnapshotData({ ...snapshotData, manual_industry: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><Users size={16} />{t('businessPortal.settings_snapshot_employees_label')}</Label>
                <Input type="number" placeholder={snapshotData.snapshot_employees_count || t('business.settings.employees_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_employees_count} onChange={(e) => setSnapshotData({ ...snapshotData, manual_employees_count: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><Globe size={16} />{t('businessPortal.settings_snapshot_website_label')}</Label>
                <Input type="url" placeholder={formData.website || t('business.settings.website_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_website} onChange={(e) => setSnapshotData({ ...snapshotData, manual_website: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2"><DollarSign size={16} />{t('businessPortal.settings_snapshot_revenue_label')}</Label>
                <Input placeholder={snapshotData.snapshot_revenue_range || t('business.settings.revenue_placeholder')} className="bg-background border-border text-foreground" value={snapshotData.manual_revenue_range} onChange={(e) => setSnapshotData({ ...snapshotData, manual_revenue_range: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-foreground flex items-center gap-2"><Calendar size={16} />{t('businessPortal.settings_snapshot_founded_label')}</Label>
                <Input type="number" min="1800" max={new Date().getFullYear()} placeholder={snapshotData.snapshot_founded_year || t('business.settings.founded_placeholder')} className="bg-background border-border text-foreground max-w-xs" value={snapshotData.manual_founded_year} onChange={(e) => setSnapshotData({ ...snapshotData, manual_founded_year: e.target.value })} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t('businessPortal.settings_snapshot_note')}</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" onClick={handleSaveSnapshot} disabled={snapshotLoading} className="flex-1 bg-primary hover:bg-primary/90">
                <Save className="mr-2" size={16} />
                {snapshotLoading ? t('business_portal.saving') : t('businessPortal.settings_snapshot_save_cta')}
              </Button>
              <Button type="button" variant="outline" onClick={handleResetToAI} disabled={snapshotLoading} className="flex-1">
                <RefreshCw className="mr-2" size={16} />
                {t('businessPortal.settings_snapshot_reset_cta')}
              </Button>
            </div>
          </CardContent>
        </Card>

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
