import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X, MapPin, Plus } from 'lucide-react';

interface LocationEntry {
  city?: string;
  region?: string;
  country?: string;
  type?: string;
}

const INDUSTRIES = [
  { value: 'technology', label: 'Technology & Software' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'healthcare', label: 'Healthcare & Pharma' },
  { value: 'manufacturing', label: 'Manufacturing & Engineering' },
  { value: 'energy', label: 'Energy & Sustainability' },
  { value: 'education', label: 'Education & Research' },
  { value: 'media', label: 'Media & Communications' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'automotive', label: 'Automotive & Mobility' },
  { value: 'real_estate', label: 'Real Estate & Construction' },
  { value: 'food', label: 'Food & Agriculture' },
  { value: 'nonprofit', label: 'Non-profit & NGO' },
  { value: 'government', label: 'Government & Public Sector' },
  { value: 'startup', label: 'Startups' },
  { value: 'other', label: 'Other' },
];

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  initialData?: {
    desired_locations?: LocationEntry[];
    work_preference?: string;
    willing_to_relocate?: string;
    salary_expectation?: { min?: number; max?: number; currency?: string; period?: string };
    availability_date?: string;
    industry_preferences?: string[];
  };
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  open, onClose, userId, onSuccess, initialData,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Field 1: Locations
  const [locations, setLocations] = useState<LocationEntry[]>(initialData?.desired_locations || []);
  const [cityInput, setCityInput] = useState('');
  const [includeRemote, setIncludeRemote] = useState(
    initialData?.desired_locations?.some(l => l.type === 'remote') || false
  );

  // Field 2: Work mode
  const [workPreference, setWorkPreference] = useState(initialData?.work_preference || '');

  // Field 3: Relocate
  const [relocate, setRelocate] = useState(initialData?.willing_to_relocate || '');

  // Field 4: Salary
  const [currency, setCurrency] = useState(initialData?.salary_expectation?.currency || 'EUR');
  const [period, setPeriod] = useState(initialData?.salary_expectation?.period || 'annual');
  const [salaryMin, setSalaryMin] = useState(initialData?.salary_expectation?.min?.toString() || '');
  const [salaryMax, setSalaryMax] = useState(initialData?.salary_expectation?.max?.toString() || '');

  // Field 5: Availability
  const [availability, setAvailability] = useState(initialData?.availability_date ? 'date' : '');
  const [availabilityDate, setAvailabilityDate] = useState(initialData?.availability_date || '');

  // Field 6: Industries
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialData?.industry_preferences || []);

  const addCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setLocations(prev => [...prev, { city: trimmed }]);
    setCityInput('');
  };

  const removeLocation = (idx: number) => {
    setLocations(prev => prev.filter((_, i) => i !== idx));
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
            currency, period,
          } : null,
          availability_date: computeAvailabilityDate(),
          industry_preferences: selectedIndustries,
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
        } as any)
        .eq('user_id', userId);

      if (error) throw error;

      // Insert feed milestone
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

      toast({ title: t('profile_completion.success_title') });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ProfileCompletionModal] Save error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const workModes = [
    { value: 'remote', label: 'Remote', desc: 'Work from anywhere' },
    { value: 'hybrid', label: 'Hybrid', desc: 'Mix of office and remote' },
    { value: 'on-site', label: 'On-site', desc: 'In the office full time' },
    { value: 'flexible', label: 'Flexible', desc: 'Open to any arrangement' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('profile_completion.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t('profile_completion.subtitle')}</p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Field 1: Locations */}
          <div className="space-y-2">
            <Label>{t('profile_completion.locations_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.locations_hint')}</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Milan, London..."
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity())}
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
              <span className="text-sm">Remote</span>
            </div>
          </div>

          {/* Field 2: Work mode */}
          <div className="space-y-2">
            <Label>{t('profile_completion.work_mode_label')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {workModes.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setWorkPreference(m.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    workPreference === m.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Field 3: Relocate */}
          <div className="space-y-2">
            <Label>{t('profile_completion.relocate_label')}</Label>
            <RadioGroup value={relocate} onValueChange={setRelocate}>
              {[
                { value: 'yes', label: 'Yes — open to relocating anywhere' },
                { value: 'within_country', label: 'Within my country' },
                { value: 'within_region', label: 'Within Europe' },
                { value: 'international', label: 'Open to international relocation' },
                { value: 'no', label: 'No — I prefer to stay where I am' },
              ].map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`relocate-${opt.value}`} />
                  <label htmlFor={`relocate-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Field 4: Salary */}
          <div className="space-y-2">
            <Label>{t('profile_completion.salary_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.salary_hint')}</p>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['EUR', 'USD', 'GBP', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Min" className="w-24" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} />
              <span className="text-muted-foreground">—</span>
              <Input type="number" placeholder="Max" className="w-24" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Field 5: Availability */}
          <div className="space-y-2">
            <Label>{t('profile_completion.availability_label')}</Label>
            <RadioGroup value={availability} onValueChange={setAvailability}>
              {[
                { value: 'immediately', label: 'Immediately' },
                { value: '2_weeks', label: 'Within 2 weeks' },
                { value: '1_month', label: 'Within 1 month' },
                { value: '3_months', label: 'Within 3 months' },
                { value: 'date', label: 'Specific date' },
              ].map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`avail-${opt.value}`} />
                  <label htmlFor={`avail-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                </div>
              ))}
            </RadioGroup>
            {availability === 'date' && (
              <Input type="date" value={availabilityDate} onChange={e => setAvailabilityDate(e.target.value)} className="w-48 mt-2" />
            )}
          </div>

          {/* Field 6: Industries */}
          <div className="space-y-2">
            <Label>{t('profile_completion.industry_label')}</Label>
            <p className="text-xs text-muted-foreground">{t('profile_completion.industry_hint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map(ind => (
                <Badge
                  key={ind.value}
                  variant={selectedIndustries.includes(ind.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleIndustry(ind.value)}
                >
                  {ind.label}
                </Badge>
              ))}
            </div>
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
