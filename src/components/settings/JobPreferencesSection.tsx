import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock, Building2, DollarSign, Globe } from 'lucide-react';
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal';

interface JobPreferencesSectionProps {
  userId: string;
  profileData: {
    desired_locations?: any[];
    work_preference?: string | null;
    willing_to_relocate?: string | null;
    salary_expectation?: any;
    availability_date?: string | null;
    industry_preferences?: string[];
  };
  onUpdate: () => void;
}

export const JobPreferencesSection: React.FC<JobPreferencesSectionProps> = ({
  userId, profileData, onUpdate,
}) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const notSet = t('profile_completion.not_set');

  const formatLocations = (locs?: any[]) => {
    if (!locs || locs.length === 0) return notSet;
    return locs.map(l => l.type === 'remote' ? 'Remote' : l.city || l.region || '').filter(Boolean).join(', ') || notSet;
  };

  const formatSalary = (sal?: any) => {
    if (!sal || (!sal.min && !sal.max)) return notSet;
    const parts = [sal.currency || 'EUR'];
    if (sal.min) parts.push(Number(sal.min).toLocaleString());
    if (sal.min && sal.max) parts.push('—');
    if (sal.max) parts.push(Number(sal.max).toLocaleString());
    if (sal.period) parts.push(`(${sal.period})`);
    return parts.join(' ');
  };

  const rows = [
    { icon: MapPin, label: t('profile_completion.locations_label'), value: formatLocations(profileData.desired_locations) },
    { icon: Briefcase, label: t('profile_completion.work_mode_label'), value: profileData.work_preference || notSet },
    { icon: Globe, label: t('profile_completion.relocate_label'), value: profileData.willing_to_relocate?.replace(/_/g, ' ') || notSet },
    { icon: DollarSign, label: t('profile_completion.salary_label'), value: formatSalary(profileData.salary_expectation) },
    { icon: Clock, label: t('profile_completion.availability_label'), value: profileData.availability_date || notSet },
    { icon: Building2, label: t('profile_completion.industry_label'), value: profileData.industry_preferences?.join(', ') || notSet },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('profile_completion.section_title')}</h3>
        <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
          {t('profile_completion.edit')}
        </Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-3">
            <row.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{row.label}</div>
              <div className="text-sm text-muted-foreground truncate">{row.value}</div>
            </div>
          </div>
        ))}
      </div>
      <ProfileCompletionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        onSuccess={onUpdate}
        initialData={{
          desired_locations: profileData.desired_locations,
          work_preference: profileData.work_preference || undefined,
          willing_to_relocate: profileData.willing_to_relocate || undefined,
          salary_expectation: profileData.salary_expectation,
          availability_date: profileData.availability_date || undefined,
          industry_preferences: profileData.industry_preferences,
        }}
      />
    </div>
  );
};
