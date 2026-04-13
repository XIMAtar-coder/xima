import React from 'react';
import { useTranslation } from 'react-i18next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';

export interface ShortlistFilterValues {
  degree_type?: string;
  min_experience?: number;
  industry?: string;
  limit?: number;
}

interface ShortlistFiltersProps {
  filters: ShortlistFilterValues;
  onChange: (filters: ShortlistFilterValues) => void;
}

export const ShortlistFilters: React.FC<ShortlistFiltersProps> = ({ filters, onChange }) => {
  const { t } = useTranslation();

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <SlidersHorizontal className="w-4 h-4" />
        {t('shortlist.filters.title', 'Advanced filters (degree, experience, industry)')}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4">
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {t('shortlist.filters.warning', 'XIMA recommends identity-first matching. These filters are optional and reduce the candidate pool.')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">{t('shortlist.filters.degree', 'Degree type')}</Label>
            <Select
              value={filters.degree_type || ''}
              onValueChange={v => onChange({ ...filters, degree_type: v || undefined })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('shortlist.filters.any', 'Any (recommended)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('shortlist.filters.any', 'Any (recommended)')}</SelectItem>
                <SelectItem value="bachelor">Bachelor's</SelectItem>
                <SelectItem value="laurea triennale">Laurea Triennale</SelectItem>
                <SelectItem value="master">Master's</SelectItem>
                <SelectItem value="laurea magistrale">Laurea Magistrale</SelectItem>
                <SelectItem value="mba">MBA</SelectItem>
                <SelectItem value="phd">PhD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t('shortlist.filters.experience', 'Min. experience (years)')}</Label>
            <Input
              type="number"
              min={0}
              placeholder={t('shortlist.filters.any', 'Any')}
              value={filters.min_experience ?? ''}
              onChange={e => onChange({ ...filters, min_experience: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">{t('shortlist.filters.industry', 'Industry')}</Label>
            <Input
              placeholder={t('shortlist.filters.industry_placeholder', 'Any (e.g. technology)')}
              value={filters.industry ?? ''}
              onChange={e => onChange({ ...filters, industry: e.target.value || undefined })}
              className="mt-1"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
