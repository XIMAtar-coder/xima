import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { supabase } from '@/integrations/supabase/client';
import { FileUp, Upload, ClipboardPaste, Loader2, AlertTriangle, X, Plus } from 'lucide-react';
import XimaHrRequestModal from '@/components/business/XimaHrRequestModal';

// ── Chip list editor ──
const ChipListEditor: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}> = ({ items, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const addItem = () => {
    const v = input.trim();
    if (v && !items.includes(v)) { onChange([...items, v]); setInput(''); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

// ── Language editor ──
const LanguageEditor: React.FC<{
  languages: { language: string; level: string }[];
  onChange: (langs: { language: string; level: string }[]) => void;
}> = ({ languages, onChange }) => {
  const [newLang, setNewLang] = useState('');
  const [newLevel, setNewLevel] = useState('fluent');
  return (
    <div className="space-y-2">
      {languages.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={l.language} onChange={(e) => { const u = [...languages]; u[i] = { ...u[i], language: e.target.value }; onChange(u); }} className="flex-1" />
          <Select value={l.level} onValueChange={(v) => { const u = [...languages]; u[i] = { ...u[i], level: v }; onChange(u); }}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="fluent">Fluent</SelectItem>
              <SelectItem value="native">Native</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => onChange(languages.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={newLang} onChange={(e) => setNewLang(e.target.value)} placeholder="Language" className="flex-1" />
        <Select value={newLevel} onValueChange={setNewLevel}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="fluent">Fluent</SelectItem>
            <SelectItem value="native">Native</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { if (newLang.trim()) { onChange([...languages, { language: newLang.trim(), level: newLevel }]); setNewLang(''); } }}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ── Seniority → experience_level mapping ──
function mapSeniorityToExperienceLevel(seniority: string): 'first_time' | 'independent' | 'led_others' {
  // TODO Phase 3C: The hiring goal wizard should display original granular seniority
  // alongside the collapsed experience_level, e.g. "Senior (imported as 'led_others')".
  // Granular seniority is preserved in job_posts.seniority.
  switch (seniority?.toLowerCase()) {
    case 'entry': case 'junior': case 'internship': return 'first_time';
    case 'mid': case 'mid-level': return 'independent';
    case 'senior': case 'lead': case 'principal': case 'executive': return 'led_others';
    default: return 'independent';
  }
}

const JobImportWizard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { businessProfile } = useBusinessProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [pasteText, setPasteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rawText, setRawText] = useState('');

  // Extracted data (Step 2)
  const [extracted, setExtracted] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showXimaHrModal, setShowXimaHrModal] = useState(false);

  const handleAnalyze = async () => {
    if (!user?.id) return;
    setAnalyzing(true);
    try {
      let response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { data, error } = await supabase.functions.invoke('import-job-post', { body: formData });
        if (error) throw error;
        response = data;
      } else {
        const { data, error } = await supabase.functions.invoke('import-job-post', {
          body: { method: 'paste', raw_text: pasteText },
        });
        if (error) throw error;
        response = data;
      }

      if (response?.error) throw new Error(response.error);
      if (!response?.success || !response?.job) throw new Error('Extraction failed');

      setExtracted(response.job);
      setRawText(pasteText || '[file upload]');
      setStep(2);
    } catch (err: any) {
      console.error('[JobImportWizard] Analysis error:', err);
      toast({ title: 'Error', description: err.message || 'Analysis failed', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
  };

  const buildJobPostRow = (status: string, ximaHr = false) => ({
    business_id: user!.id,
    title: extracted.title || 'Untitled',
    description: extracted.description || '',
    responsibilities: (extracted.responsibilities || []).join('\n• '),
    requirements_must: (extracted.required_skills || []).join(', '),
    requirements_nice: (extracted.nice_to_have_skills || []).join(', '),
    benefits: extracted.benefits || null,
    location: [extracted.location_city, extracted.location_country].filter(Boolean).join(', ') || null,
    employment_type: extracted.employment_type || null,
    seniority: extracted.seniority || null,
    salary_range: extracted.salary_min && extracted.salary_max
      ? `${extracted.salary_min}-${extracted.salary_max} ${extracted.salary_currency || 'EUR'}/yr`
      : null,
    department: extracted.department || null,
    import_source: 'imported',
    import_raw_data: extracted as any,
    ai_suggested_ximatar: extracted.suggested_ximatar || null,
    status,
    ...(ximaHr ? {
      xima_hr_requested: true,
      xima_hr_requested_at: new Date().toISOString(),
      xima_hr_status: 'pending',
      published_at: new Date().toISOString(),
    } : {}),
  });

  const handleSaveAsJobPost = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('job_posts').insert(buildJobPostRow('draft'));
      if (error) throw error;
      toast({ title: t('business.jobs.import.saved_toast') });
      navigate('/business/jobs');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToGoal = async () => {
    setSaving(true);
    try {
      // 1. Insert job post
      const { data: jp, error: jpErr } = await supabase
        .from('job_posts')
        .insert(buildJobPostRow('draft'))
        .select('id')
        .single();
      if (jpErr || !jp) throw jpErr || new Error('Failed to create job post');

      // 2. Build task_description from role_summary + responsibilities
      const taskParts: string[] = [];
      if (extracted.role_summary) taskParts.push(extracted.role_summary);
      if (extracted.responsibilities?.length) {
        taskParts.push('\n\n**Responsabilità:**');
        extracted.responsibilities.forEach((r: string) => taskParts.push(`• ${r}`));
      }

      // 3. Insert hiring goal draft
      const { error: hgErr } = await supabase
        .from('hiring_goal_drafts')
        .insert({
          business_id: user!.id,
          role_title: extracted.title || 'Untitled',
          task_description: taskParts.join('\n'),
          experience_level: mapSeniorityToExperienceLevel(extracted.seniority),
          work_model: extracted.work_model || null,
          country: extracted.location_country || null,
          city_region: extracted.location_city || null,
          salary_min: extracted.salary_min ? Math.round(extracted.salary_min) : null,
          salary_max: extracted.salary_max ? Math.round(extracted.salary_max) : null,
          salary_currency: extracted.salary_currency || 'EUR',
          salary_period: 'yearly', // CHECK constraint uses 'yearly', not 'annual'
          imported_from_listing_id: jp.id,
          status: 'draft',
        });
      if (hgErr) throw hgErr;

      toast({ title: t('business.jobs.import.converted_toast') });
      navigate(`/business/hiring-goals/new?from_listing=${jp.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateXimaHr = async () => {
    setSaving(true);
    try {
      // XIMA HR listings publish immediately: XIMA HR team runs selection
      // from real candidate interest, not from a dormant draft.
      const { data: jp, error: jpErr } = await supabase
        .from('job_posts')
        .insert(buildJobPostRow('published', true))
        .select('id')
        .single();
      if (jpErr || !jp) throw jpErr || new Error('Failed to create job post');

      // Call request-xima-hr
      const { data, error: fnErr } = await supabase.functions.invoke('request-xima-hr', {
        body: { business_id: user!.id, source: 'listing', source_id: jp.id },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      toast({ title: t('business.xima_hr.modal.success_title'), description: t('business.xima_hr.modal.success_body') });
      navigate('/business/jobs');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canAnalyze = selectedFile || pasteText.length >= 200;

  return (
    <BusinessLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('business.jobs.import.title')}</h1>
          {/* Stepper */}
          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
              <span className="text-sm font-medium">{t('business.jobs.import.step1.heading')}</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
              <span className="text-sm font-medium">{t('business.jobs.import.step2.heading')}</span>
            </div>
          </div>
        </div>

        {/* Step 1: Source */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="paste">
                <TabsList className="mb-4">
                  <TabsTrigger value="paste" className="gap-2"><ClipboardPaste className="h-4 w-4" />{t('business.jobs.import.step1.tab_paste')}</TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" />{t('business.jobs.import.step1.tab_upload')}</TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={t('business.jobs.import.step1.paste_placeholder')}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{pasteText.length} chars {pasteText.length < 200 && '(min 200)'}</span>
                    <Button onClick={handleAnalyze} disabled={!canAnalyze || analyzing}>
                      {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('business.jobs.import.step1.analyzing')}</> : t('business.jobs.import.step1.analyze_cta')}
                    </Button>
                  </div>
                  {analyzing && <p className="text-xs text-muted-foreground">{t('business.jobs.import.step1.analyzing_hint')}</p>}
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setSelectedFile(f); } }}
                  >
                    <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t('business.jobs.import.step1.upload_hint')}</p>
                    {selectedFile && (
                      <div className="mt-3 text-sm font-medium text-foreground">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileSelect} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAnalyze} disabled={!selectedFile || analyzing}>
                      {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('business.jobs.import.step1.analyzing')}</> : t('business.jobs.import.step1.analyze_cta')}
                    </Button>
                  </div>
                  {analyzing && <p className="text-xs text-muted-foreground">{t('business.jobs.import.step1.analyzing_hint')}</p>}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review */}
        {step === 2 && extracted && (
          <div className="space-y-6">
            {/* Section 1: Role */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">{t('business.jobs.import.step2.role_section')}</h3>
                <div className="space-y-3">
                  <div>
                    <Label>{t('business.jobs.import.step2.role_section')} *</Label>
                    <Input value={extracted.title || ''} onChange={(e) => setExtracted({ ...extracted, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('businessPortal.jobs.import.fields.summary', 'Riepilogo')}</Label>
                    <Textarea value={extracted.role_summary || ''} onChange={(e) => setExtracted({ ...extracted, role_summary: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <Label>{t('businessPortal.jobs.import.fields.seniority', 'Livello di seniority')}</Label>
                    <Select value={extracted.seniority || ''} onValueChange={(v) => setExtracted({ ...extracted, seniority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Entry / Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="executive">Principal / Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Skills */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">{t('business.jobs.import.step2.skills_section')}</h3>
                <div>
                  <Label>{t('businessPortal.jobs.import.fields.responsibilities', 'Responsabilità')}</Label>
                  <ChipListEditor items={extracted.responsibilities || []} onChange={(v) => setExtracted({ ...extracted, responsibilities: v })} placeholder="Add responsibility..." />
                </div>
                <div>
                  <Label>{t('businessPortal.jobs.import.fields.required_skills', 'Competenze richieste')}</Label>
                  <ChipListEditor items={extracted.required_skills || []} onChange={(v) => setExtracted({ ...extracted, required_skills: v })} placeholder="Add skill..." />
                </div>
                <div>
                  <Label>{t('businessPortal.jobs.import.fields.nice_to_have', 'Competenze gradite')}</Label>
                  <ChipListEditor items={extracted.nice_to_have_skills || []} onChange={(v) => setExtracted({ ...extracted, nice_to_have_skills: v })} placeholder="Add skill..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Years Experience (min)</Label>
                    <Input type="number" value={extracted.years_experience_min ?? ''} onChange={(e) => setExtracted({ ...extracted, years_experience_min: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <Label>Years Experience (max)</Label>
                    <Input type="number" value={extracted.years_experience_max ?? ''} onChange={(e) => setExtracted({ ...extracted, years_experience_max: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div>
                  <Label>Education Level</Label>
                  <Select value={extracted.education_level || ''} onValueChange={(v) => setExtracted({ ...extracted, education_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="bachelor">Bachelor</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                      <SelectItem value="none_required">None Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Languages</Label>
                  <LanguageEditor languages={extracted.languages || []} onChange={(v) => setExtracted({ ...extracted, languages: v })} />
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Where and How */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground">{t('business.jobs.import.step2.where_section')}</h3>
                <div>
                  <Label>Work Model</Label>
                  <Select value={extracted.work_model || ''} onValueChange={(v) => setExtracted({ ...extracted, work_model: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">Onsite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={extracted.location_city || ''} onChange={(e) => setExtracted({ ...extracted, location_city: e.target.value })} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={extracted.location_country || ''} onChange={(e) => setExtracted({ ...extracted, location_country: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Salary (RAL) */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">{t('business.jobs.import.step2.salary_section')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('business.jobs.import.step2.salary_tooltip')}</p>
                </div>
                {extracted.salary_is_estimated && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">{t('business.jobs.import.step2.salary_estimated_warning')}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>RAL Min (EUR)</Label>
                    <Input type="number" value={extracted.salary_min ?? ''} onChange={(e) => setExtracted({ ...extracted, salary_min: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <Label>RAL Max (EUR)</Label>
                    <Input type="number" value={extracted.salary_max ?? ''} onChange={(e) => setExtracted({ ...extracted, salary_max: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: XIMAtar suggestion */}
            {extracted.suggested_ximatar && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">{t('business.jobs.import.step2.archetype_section')}</h3>
                  <div className="flex items-start gap-4">
                    <img
                      src={`/ximatars/${extracted.suggested_ximatar}.png`}
                      alt={extracted.suggested_ximatar}
                      className="w-16 h-16 rounded-xl object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground capitalize">{extracted.suggested_ximatar}</p>
                      {extracted.ximatar_reasoning && (
                        <p className="text-sm text-muted-foreground mt-1">{extracted.ximatar_reasoning}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{t('business.jobs.import.step2.archetype_hint')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <Button variant="outline" onClick={handleSaveAsJobPost} disabled={saving} className="flex-1">
                {t('business.jobs.import.step2.save_as_listing')}
              </Button>
              <Button onClick={handleConvertToGoal} disabled={saving} className="flex-1">
                {t('business.jobs.import.step2.convert_to_goal')}
              </Button>
              <Button variant="outline" onClick={handleActivateXimaHr} disabled={saving} className="flex-1">
                {t('business.jobs.import.step2.activate_xima_hr')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
};

export default JobImportWizard;
