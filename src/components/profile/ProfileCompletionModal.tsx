import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, MapPin, Plus } from 'lucide-react';

interface LocationEntry {
  city?: string;
  region?: string;
  country?: string;
  type?: string;
}

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  initialData?: {
    desired_locations?: LocationEntry[];
    work_preference?: string;
    willing_to_relocate?: string;
    salary_expectation?: { min?: number; max?: number; currency?: string; period?: string; type?: string };
    availability_date?: string;
    industry_preferences?: string[];
    desired_roles?: string[];
    transportation_options?: string[];
    max_commute_minutes?: number;
    content_language?: string;
  };
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  open, onClose, userId, onSuccess, initialData,
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Locations
  const [locations, setLocations] = useState<LocationEntry[]>(initialData?.desired_locations || []);
  const [cityInput, setCityInput] = useState('');
  const [includeRemote, setIncludeRemote] = useState(
    initialData?.desired_locations?.some(l => l.type === 'remote') || false
  );

  // Work mode
  const [workPreference, setWorkPreference] = useState(initialData?.work_preference || '');

  // Relocate
  const [relocate, setRelocate] = useState(initialData?.willing_to_relocate || '');

  // Desired roles (NEW)
  const [desiredRoles, setDesiredRoles] = useState<string[]>(
    (initialData?.desired_roles as string[]) || []
  );
  const [roleInput, setRoleInput] = useState('');

  // Transportation (NEW)
  const [transportOptions, setTransportOptions] = useState<string[]>(
    (initialData?.transportation_options as string[]) || []
  );
  const [maxCommute, setMaxCommute] = useState<number | null>(initialData?.max_commute_minutes ?? null);

  // Salary
  const [currency, setCurrency] = useState(initialData?.salary_expectation?.currency || 'EUR');
  const [period, setPeriod] = useState(initialData?.salary_expectation?.period || 'annual');
  const [salaryType, setSalaryType] = useState(initialData?.salary_expectation?.type || 'gross');
  const [salaryMin, setSalaryMin] = useState(initialData?.salary_expectation?.min?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(initialData?.salary_expectation?.max?.toString() || '');

  // Availability
  const [availability, setAvailability] = useState(initialData?.availability_date ? 'date' : '');
  const [availabilityDate, setAvailabilityDate] = useState(initialData?.availability_date || '');

  // Industries
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialData?.industry_preferences || []);

  // Content language (NEW)
  const [contentLanguage, setContentLanguage] = useState(initialData?.content_language || 'en');

  const addCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setLocations(prev => [...prev, { city: trimmed }]);
    setCityInput('');
  };

  const removeLocation = (idx: number) => {
    setLocations(prev => prev.filter((_, i) => i !== idx));
  };

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (!trimmed || desiredRoles.length >= 5) return;
    setDesiredRoles(prev => [...prev, trimmed]);
    setRoleInput('');
  };

  const removeRole = (idx: number) => {
    setDesiredRoles(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleTransport = (value: string) => {
    setTransportOptions(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleIndustry = (val: string) => {
    setSelectedIndustries(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const computeAvailabilityDate = (): string | null => {
    if (availability === 'date' && availabilityDate) return availabilityDate;
    const now = new Date();
    if (availability === 'immediately') return now.toISOString().split('T')[0];
    if (availability === '2_weeks') { now.setDate(now.getDate() + 14); return now.toISOString().split('T')[0]; }
    if (availability === '1_month') { now.setMonth(now.getMonth() + 1); return now.toISOString().split('T')[0]; }
    if (availability === '3_months') { now.setMonth(now.getMonth() + 3); return now.toISOString().split('T')[0]; }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allLocations = [
        ...locations.filter(l => l.type !== 'remote'),
        ...(includeRemote ? [{ type: 'remote' }] : []),
      ];

      const { error } = await supabase
        .from('profiles')
        .update({
          desired_locations: allLocations,
          work_preference: workPreference || null,
          willing_to_relocate: relocate || null,
          salary_expectation: (salaryMin || salaryMax) ? {
            min: salaryMin ? Number(salaryMin) : null,
            max: salaryMax ? Number(salaryMax) : null,
            currency, period, type: salaryType,
          } : null,
          availability_date: computeAvailabilityDate(),
          industry_preferences: selectedIndustries,
          desired_roles: desiredRoles,
          transportation_options: transportOptions,
          max_commute_minutes: maxCommute,
          content_language: contentLanguage,
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
        } as any)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('feed_items').insert({
        user_id: userId,
        feed_type: 'milestone',
        title: t('profile_completion.success_title'),
        body: t('profile_completion.success_body'),
        icon: 'check-circle',
        action_url: '/profile',
        action_label: 'View Profile',
        priority: 2,
      } as any);

      toast.success(t('profile_completion.success_title'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ProfileCompletionModal] Save error:', err);
      toast.error(t('profile_completion.save_error', 'Error saving preferences'));
    } finally {
      setSaving(false);
    }
  };

  const industries = [
    { value: 'technology', labelKey: 'profile_completion.ind_technology' },
    { value: 'finance', labelKey: 'profile_completion.ind_finance' },
    { value: 'consulting', labelKey: 'profile_completion.ind_consulting' },
    { value: 'healthcare', labelKey: 'profile_completion.ind_healthcare' },
    { value: 'manufacturing', labelKey: 'profile_completion.ind_manufacturing' },
    { value: 'energy', labelKey: 'profile_completion.ind_energy' },
    { value: 'education', labelKey: 'profile_completion.ind_education' },
    { value: 'media', labelKey: 'profile_completion.ind_media' },
    { value: 'retail', labelKey: 'profile_completion.ind_retail' },
    { value: 'automotive', labelKey: 'profile_completion.ind_automotive' },
    { value: 'real_estate', labelKey: 'profile_completion.ind_real_estate' },
    { value: 'food', labelKey: 'profile_completion.ind_food' },
    { value: 'nonprofit', labelKey: 'profile_completion.ind_nonprofit' },
    { value: 'government', labelKey: 'profile_completion.ind_government' },
    { value: 'startup', labelKey: 'profile_completion.ind_startup' },
    { value: 'other', labelKey: 'profile_completion.ind_other' },
  ];

  const workModes = [
    { value: 'remote', labelKey: 'profile_completion.work_remote', hintKey: 'profile_completion.work_remote_hint' },
    { value: 'hybrid', labelKey: 'profile_completion.work_hybrid', hintKey: 'profile_completion.work_hybrid_hint' },
    { value: 'on-site', labelKey: 'profile_completion.work_onsite', hintKey: 'profile_completion.work_onsite_hint' },
    { value: 'flexible', labelKey: 'profile_completion.work_flexible', hintKey: 'profile_completion.work_flexible_hint' },
  ];

  const relocateOptions = [
    { value: 'yes', labelKey: 'profile_completion.reloc_anywhere' },
    { value: 'within_country', labelKey: 'profile_completion.reloc_country' },
    { value: 'within_region', labelKey: 'profile_completion.reloc_europe' },
    { value: 'international', labelKey: 'profile_completion.reloc_international' },
    { value: 'no', labelKey: 'profile_completion.reloc_no' },
  ];

  const availabilityOptions = [
    { value: 'immediately', labelKey: 'profile_completion.avail_immediately' },
    { value: '2_weeks', labelKey: 'profile_completion.avail_2_weeks' },
    { value: '1_month', labelKey: 'profile_completion.avail_1_month' },
    { value: '3_months', labelKey: 'profile_completion.avail_3_months' },
    { value: 'date', labelKey: 'profile_completion.avail_specific_date' },
  ];

  const transportModes = [
    { value: 'car', labelKey: 'profile_completion.transport_car' },
    { value: 'public', labelKey: 'profile_completion.transport_public' },
    { value: 'bike', labelKey: 'profile_completion.transport_bike' },
    { value: 'walking', labelKey: 'profile_completion.transport_walking' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-background border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('profile_completion.title')}</DialogTitle>
          <DialogDescription className="text-base">{t('profile_completion.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Locations */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.locations_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.locations_hint')}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t('profile_completion.city_placeholder', 'es. Milano, Roma...')}
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addCity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {locations.filter(l => l.type !== 'remote').map((loc, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  <MapPin className="h-3 w-3" />{loc.city || loc.region}
                  <button onClick={() => removeLocation(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeRemote} onCheckedChange={setIncludeRemote} />
              <span className="text-sm text-foreground">{t('profile_completion.work_remote', 'Remote')}</span>
            </div>
          </div>

          {/* Work mode */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.work_mode_label')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {workModes.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setWorkPreference(m.value)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    workPreference === m.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm text-foreground">{t(m.labelKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(m.hintKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Relocate */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.relocate_label')}</Label>
            <RadioGroup value={relocate} onValueChange={setRelocate}>
              {relocateOptions.map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`relocate-${opt.value}`} />
                  <label htmlFor={`relocate-${opt.value}`} className="text-sm text-foreground cursor-pointer">{t(opt.labelKey)}</label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Desired roles (NEW) */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.desired_roles_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.desired_roles_hint')}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t('profile_completion.role_placeholder', 'es. Product Manager, UX Designer...')}
                value={roleInput}
                onChange={e => setRoleInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addRole} disabled={desiredRoles.length >= 5}>
                {t('common.add', 'Add')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {desiredRoles.map((role, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {role}
                  <button onClick={() => removeRole(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Transportation (only if hybrid/on-site) */}
          {(workPreference === 'hybrid' || workPreference === 'on-site') && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-foreground">{t('profile_completion.transport_label')}</Label>
                <p className="text-xs text-muted-foreground">{t('profile_completion.transport_hint')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {transportModes.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        checked={transportOptions.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          if (checked) setTransportOptions(prev => [...prev, opt.value]);
                          else setTransportOptions(prev => prev.filter(v => v !== opt.value));
                        }}
                      />
                      <span className="text-sm text-foreground">{t(opt.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground">{t('profile_completion.commute_label')}</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={maxCommute ?? ''}
                  onChange={e => setMaxCommute(e.target.value ? Number(e.target.value) : null)}
                  placeholder="es. 45"
                  className="w-32 mt-1"
                />
              </div>
            </div>
          )}

          {/* Salary */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.salary_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.salary_hint')}</p>

            {/* Gross/Net toggle */}
            <div className="flex gap-2 mb-1">
              <button
                type="button"
                onClick={() => setSalaryType('gross')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                  salaryType === 'gross' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {t('profile_completion.salary_gross', 'Gross')}
              </button>
              <button
                type="button"
                onClick={() => setSalaryType('net')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                  salaryType === 'net' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {t('profile_completion.salary_net', 'Net')}
              </button>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['EUR', 'USD', 'GBP', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder={t('profile_completion.min', 'Min')} className="w-24" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} />
              <span className="text-muted-foreground">—</span>
              <Input type="number" placeholder={t('profile_completion.max', 'Max')} className="w-24" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{t('profile_completion.salary_annual', 'Annual')}</SelectItem>
                  <SelectItem value="monthly">{t('profile_completion.salary_monthly', 'Monthly')}</SelectItem>
                  <SelectItem value="daily">{t('profile_completion.salary_daily', 'Daily')}</SelectItem>
                  <SelectItem value="hourly">{t('profile_completion.salary_hourly', 'Hourly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.availability_label')}</Label>
            <RadioGroup value={availability} onValueChange={setAvailability}>
              {availabilityOptions.map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`avail-${opt.value}`} />
                  <label htmlFor={`avail-${opt.value}`} className="text-sm text-foreground cursor-pointer">{t(opt.labelKey)}</label>
                </div>
              ))}
            </RadioGroup>
            {availability === 'date' && (
              <Input type="date" value={availabilityDate} onChange={e => setAvailabilityDate(e.target.value)} className="w-48 mt-2" />
            )}
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.industry_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.industry_hint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {industries.map(ind => (
                <Badge
                  key={ind.value}
                  variant={selectedIndustries.includes(ind.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleIndustry(ind.value)}
                >
                  {t(ind.labelKey)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Content language (NEW) */}
          <div className="space-y-2">
            <Label className="text-foreground">{t('profile_completion.content_language_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.content_language_hint')}</p>
            <Select value={contentLanguage} onValueChange={setContentLanguage}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>{t('profile_completion.later')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '...' : t('profile_completion.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
