import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, MapPin } from 'lucide-react';
import { ChoiceChip } from '@/components/candidate/ChoiceChip';
import { log } from '@/lib/log';

/**
 * The job-preferences form (fields + save) shared by the dashboard's
 * "complete your profile" modal and the settings page, where it sits inline
 * under "01 / Preferenze". Same data, same save; only the container differs.
 */
export interface LocationEntry {
  city?: string;
  region?: string;
  country?: string;
  type?: string;
}

export interface JobPreferencesInitialData {
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
}

export const INDUSTRY_OPTIONS = [
  'technology', 'finance', 'consulting', 'healthcare', 'manufacturing', 'energy', 'education', 'media',
  'retail', 'automotive', 'real_estate', 'food', 'nonprofit', 'government', 'startup', 'other',
] as const;

export const WORK_MODES = [
  { value: 'remote', labelKey: 'profile_completion.work_remote', hintKey: 'profile_completion.work_remote_hint' },
  { value: 'hybrid', labelKey: 'profile_completion.work_hybrid', hintKey: 'profile_completion.work_hybrid_hint' },
  { value: 'on-site', labelKey: 'profile_completion.work_onsite', hintKey: 'profile_completion.work_onsite_hint' },
  { value: 'flexible', labelKey: 'profile_completion.work_flexible', hintKey: 'profile_completion.work_flexible_hint' },
];

export const RELOCATE_OPTIONS = [
  { value: 'yes', labelKey: 'profile_completion.reloc_anywhere' },
  { value: 'within_country', labelKey: 'profile_completion.reloc_country' },
  { value: 'within_region', labelKey: 'profile_completion.reloc_europe' },
  { value: 'international', labelKey: 'profile_completion.reloc_international' },
  { value: 'no', labelKey: 'profile_completion.reloc_no' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'immediately', labelKey: 'profile_completion.avail_immediately' },
  { value: '2_weeks', labelKey: 'profile_completion.avail_2_weeks' },
  { value: '1_month', labelKey: 'profile_completion.avail_1_month' },
  { value: '3_months', labelKey: 'profile_completion.avail_3_months' },
  { value: 'date', labelKey: 'profile_completion.avail_specific_date' },
];

const TRANSPORT_MODES = [
  { value: 'car', labelKey: 'profile_completion.transport_car' },
  { value: 'public', labelKey: 'profile_completion.transport_public' },
  { value: 'bike', labelKey: 'profile_completion.transport_bike' },
  { value: 'walking', labelKey: 'profile_completion.transport_walking' },
];

export const CONTENT_LANGUAGES = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

export function useJobPreferencesForm(userId: string, initialData?: JobPreferencesInitialData) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<LocationEntry[]>(initialData?.desired_locations || []);
  const [cityInput, setCityInput] = useState('');
  const [includeRemote, setIncludeRemote] = useState(initialData?.desired_locations?.some(l => l.type === 'remote') || false);
  const [workPreference, setWorkPreference] = useState(initialData?.work_preference || '');
  const [relocate, setRelocate] = useState(initialData?.willing_to_relocate || '');
  const [desiredRoles, setDesiredRoles] = useState<string[]>(initialData?.desired_roles || []);
  const [roleInput, setRoleInput] = useState('');
  const [transportOptions, setTransportOptions] = useState<string[]>(initialData?.transportation_options || []);
  const [maxCommute, setMaxCommute] = useState<number | null>(initialData?.max_commute_minutes ?? null);
  const [currency, setCurrency] = useState(initialData?.salary_expectation?.currency || 'EUR');
  const [period, setPeriod] = useState(initialData?.salary_expectation?.period || 'annual');
  const [salaryType, setSalaryType] = useState(initialData?.salary_expectation?.type || 'gross');
  const [salaryMin, setSalaryMin] = useState(initialData?.salary_expectation?.min?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(initialData?.salary_expectation?.max?.toString() || '');
  const [availability, setAvailability] = useState(initialData?.availability_date ? 'date' : '');
  const [availabilityDate, setAvailabilityDate] = useState(initialData?.availability_date || '');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialData?.industry_preferences || []);
  const [contentLanguage, setContentLanguage] = useState(initialData?.content_language || 'en');

  const addCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setLocations(prev => [...prev, { city: trimmed }]);
    setCityInput('');
  };
  const removeLocation = (idx: number) => setLocations(prev => prev.filter((_, i) => i !== idx));
  const addRole = () => {
    const trimmed = roleInput.trim();
    if (!trimmed || desiredRoles.length >= 5) return;
    setDesiredRoles(prev => [...prev, trimmed]);
    setRoleInput('');
  };
  const removeRole = (idx: number) => setDesiredRoles(prev => prev.filter((_, i) => i !== idx));
  const toggleTransport = (value: string) =>
    setTransportOptions(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  const toggleIndustry = (val: string) =>
    setSelectedIndustries(prev => (prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]));

  const computeAvailabilityDate = (): string | null => {
    if (availability === 'date' && availabilityDate) return availabilityDate;
    const now = new Date();
    if (availability === 'immediately') return now.toISOString().split('T')[0];
    if (availability === '2_weeks') { now.setDate(now.getDate() + 14); return now.toISOString().split('T')[0]; }
    if (availability === '1_month') { now.setMonth(now.getMonth() + 1); return now.toISOString().split('T')[0]; }
    if (availability === '3_months') { now.setMonth(now.getMonth() + 3); return now.toISOString().split('T')[0]; }
    return null;
  };

  /** Persist; resolves true on success. */
  const save = async (): Promise<boolean> => {
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
      return true;
    } catch (err: any) {
      log.error('[JobPreferencesForm] Save error:', err);
      toast.error(t('profile_completion.save_error', 'Error saving preferences'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving, save,
    locations, cityInput, setCityInput, addCity, removeLocation, includeRemote, setIncludeRemote,
    workPreference, setWorkPreference, relocate, setRelocate,
    desiredRoles, roleInput, setRoleInput, addRole, removeRole,
    transportOptions, toggleTransport, maxCommute, setMaxCommute,
    currency, setCurrency, period, setPeriod, salaryType, setSalaryType, salaryMin, setSalaryMin, salaryMax, setSalaryMax,
    availability, setAvailability, availabilityDate, setAvailabilityDate,
    selectedIndustries, toggleIndustry, contentLanguage, setContentLanguage,
  };
}

export type JobPreferencesFormState = ReturnType<typeof useJobPreferencesForm>;

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode; hint?: React.ReactNode }> = ({ htmlFor, children, hint }) => (
  <div className="mb-2">
    <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-foreground">{children}</label>
    {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
  </div>
);

const fieldInput = 'h-11 rounded-md border-[hsl(var(--xs-line))] bg-background text-[14px]';

/** The fields only; the caller decides where the save button goes. */
export const JobPreferencesFields: React.FC<{ form: JobPreferencesFormState; idPrefix?: string }> = ({ form, idPrefix = 'prefs' }) => {
  const { t } = useTranslation();
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Locations */}
      <div>
        <FieldLabel htmlFor={id('city')} hint={t('profile_completion.locations_hint')}>{t('profile_completion.locations_label')}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={id('city')}
            className={fieldInput}
            placeholder={t('profile_completion.city_placeholder', 'es. Milano, Roma...')}
            value={form.cityInput}
            onChange={e => form.setCityInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); form.addCity(); } }}
          />
          <Button type="button" variant="outline" className="h-11" onClick={form.addCity}>{t('common.add', 'Add')}</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {form.locations.filter(l => l.type !== 'remote').map((loc, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1 font-normal">
              <MapPin className="h-3 w-3" />{loc.city || loc.region}
              <button type="button" onClick={() => form.removeLocation(i)} className="ml-1 hover:text-destructive" aria-label={t('common.dismiss', 'Remove')}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <ChoiceChip selected={form.includeRemote} onToggle={() => form.setIncludeRemote(!form.includeRemote)} className="min-h-[32px] py-1 text-[13px]">
            {t('profile_completion.work_remote', 'Remote')}
          </ChoiceChip>
        </div>
      </div>

      {/* Desired roles */}
      <div>
        <FieldLabel htmlFor={id('role')} hint={t('profile_completion.desired_roles_hint')}>{t('profile_completion.desired_roles_label')}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={id('role')}
            className={fieldInput}
            placeholder={t('profile_completion.role_placeholder', 'es. Product Manager, UX Designer...')}
            value={form.roleInput}
            onChange={e => form.setRoleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); form.addRole(); } }}
          />
          <Button type="button" variant="outline" className="h-11" onClick={form.addRole} disabled={form.desiredRoles.length >= 5}>{t('common.add', 'Add')}</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {form.desiredRoles.map((role, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1 font-normal">
              {role}
              <button type="button" onClick={() => form.removeRole(i)} className="ml-1 hover:text-destructive" aria-label={t('common.dismiss', 'Remove')}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Work mode */}
      <div className="md:col-span-2">
        <FieldLabel>{t('profile_completion.work_mode_label')}</FieldLabel>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('profile_completion.work_mode_label')}>
          {WORK_MODES.map(m => (
            <ChoiceChip key={m.value} role="radio" selected={form.workPreference === m.value} onToggle={() => form.setWorkPreference(m.value)} hint={t(m.hintKey)}>
              {t(m.labelKey)}
            </ChoiceChip>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">{t('profile_completion.chip_hint', 'The blue border and the check mark show the active choices.')}</p>
      </div>

      {/* Transportation (only if hybrid/on-site) */}
      {(form.workPreference === 'hybrid' || form.workPreference === 'on-site') && (
        <>
          <div>
            <FieldLabel hint={t('profile_completion.transport_hint')}>{t('profile_completion.transport_label')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_MODES.map(opt => (
                <ChoiceChip key={opt.value} selected={form.transportOptions.includes(opt.value)} onToggle={() => form.toggleTransport(opt.value)}>
                  {t(opt.labelKey)}
                </ChoiceChip>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel htmlFor={id('commute')}>{t('profile_completion.commute_label')}</FieldLabel>
            <Input
              id={id('commute')}
              type="number" min={5} max={180} step={5}
              className={`${fieldInput} w-32`}
              value={form.maxCommute ?? ''}
              onChange={e => form.setMaxCommute(e.target.value ? Number(e.target.value) : null)}
              placeholder="45"
            />
          </div>
        </>
      )}

      {/* Relocate */}
      <div className="md:col-span-2">
        <FieldLabel htmlFor={id('relocate')}>{t('profile_completion.relocate_label')}</FieldLabel>
        <Select value={form.relocate} onValueChange={form.setRelocate}>
          <SelectTrigger id={id('relocate')} className={fieldInput}><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger>
          <SelectContent>
            {RELOCATE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Salary */}
      <div className="md:col-span-2">
        <FieldLabel hint={t('profile_completion.salary_hint')}>{t('profile_completion.salary_label')}</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2" role="radiogroup" aria-label={t('profile_completion.salary_label')}>
            <ChoiceChip role="radio" selected={form.salaryType === 'gross'} onToggle={() => form.setSalaryType('gross')}>{t('profile_completion.salary_gross', 'Gross')}</ChoiceChip>
            <ChoiceChip role="radio" selected={form.salaryType === 'net'} onToggle={() => form.setSalaryType('net')}>{t('profile_completion.salary_net', 'Net')}</ChoiceChip>
          </div>
          <Select value={form.currency} onValueChange={form.setCurrency}>
            <SelectTrigger className={`${fieldInput} w-24`} aria-label="Currency"><SelectValue /></SelectTrigger>
            <SelectContent>{['EUR', 'USD', 'GBP', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder={t('profile_completion.min', 'Min')} className={`${fieldInput} w-28`} value={form.salaryMin} onChange={e => form.setSalaryMin(e.target.value)} aria-label={t('profile_completion.min', 'Min')} />
          <span className="text-muted-foreground">—</span>
          <Input type="number" placeholder={t('profile_completion.max', 'Max')} className={`${fieldInput} w-28`} value={form.salaryMax} onChange={e => form.setSalaryMax(e.target.value)} aria-label={t('profile_completion.max', 'Max')} />
          <Select value={form.period} onValueChange={form.setPeriod}>
            <SelectTrigger className={`${fieldInput} w-32`} aria-label="Period"><SelectValue /></SelectTrigger>
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
      <div>
        <FieldLabel htmlFor={id('availability')}>{t('profile_completion.availability_label')}</FieldLabel>
        <Select value={form.availability} onValueChange={form.setAvailability}>
          <SelectTrigger id={id('availability')} className={fieldInput}><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        {form.availability === 'date' && (
          <>
            <FieldLabel htmlFor={id('date')}>{t('profile_completion.avail_specific_date')}</FieldLabel>
            <Input id={id('date')} type="date" className={fieldInput} value={form.availabilityDate} onChange={e => form.setAvailabilityDate(e.target.value)} />
          </>
        )}
      </div>

      {/* Industries */}
      <div className="md:col-span-2">
        <FieldLabel hint={t('profile_completion.industry_hint')}>{t('profile_completion.industry_label')}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map(ind => (
            <ChoiceChip key={ind} selected={form.selectedIndustries.includes(ind)} onToggle={() => form.toggleIndustry(ind)} className="min-h-[36px] py-1.5 text-[13px]">
              {t(`profile_completion.ind_${ind}`)}
            </ChoiceChip>
          ))}
        </div>
      </div>

      {/* Content language */}
      <div className="md:col-span-2">
        <FieldLabel htmlFor={id('lang')} hint={t('profile_completion.content_language_hint')}>{t('profile_completion.content_language_label')}</FieldLabel>
        <Select value={form.contentLanguage} onValueChange={form.setContentLanguage}>
          <SelectTrigger id={id('lang')} className={`${fieldInput} md:w-72`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTENT_LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default JobPreferencesFields;
