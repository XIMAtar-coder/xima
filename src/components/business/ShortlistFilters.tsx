import React from 'react';
import { useTranslation } from 'react-i18next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal } from 'lucide-react';

export interface ShortlistFilterValues {
  degree_type?: string;
  min_experience?: number;
  industry?: string;
  limit?: number;
}

interface ShortlistFiltersProps {
  filters: ShortlistFilterValues;
  onChange: (filters: ShortlistFilterValues) => void;
  /** When given, the parent owns the toggle and this renders only the fields. */
  open?: boolean;
}

const FilterFields: React.FC<Pick<ShortlistFiltersProps, 'filters' | 'onChange'>> = ({ filters, onChange }) => {
  const { t } = useTranslation();
  return (
    <div id="shortlist-filters" className="rounded-lg border border-[hsl(var(--xs-line))] bg-[hsl(var(--xs-page))] p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        {t('shortlist.filters.warning', 'XIMA recommends identity-first matching. These filters are optional and reduce the candidate pool.')}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label className="text-xs">{t('shortlist.filters.degree', 'Degree type')}</Label>
          <Select
            value={filters.degree_type || ''}
            onValueChange={v => onChange({ ...filters, degree_type: v || undefined })}
          >
            <SelectTrigger className="mt-1 bg-card">
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
            className="mt-1 bg-card"
          />
        </div>
        <div>
          <Label className="text-xs">{t('shortlist.filters.industry', 'Industry')}</Label>
          <Input
            placeholder={t('shortlist.filters.industry_placeholder', 'Any (e.g. technology)')}
            value={filters.industry ?? ''}
            onChange={e => onChange({ ...filters, industry: e.target.value || undefined })}
            className="mt-1 bg-card"
          />
        </div>
      </div>
    </div>
  );
};

export const ShortlistFilters: React.FC<ShortlistFiltersProps> = ({ filters, onChange, open }) => {
  const { t } = useTranslation();

  if (open !== undefined) {
    return open ? <FilterFields filters={filters} onChange={onChange} /> : null;
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        {t('shortlist.filters.title', 'Advanced filters (degree, experience, industry)')}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <FilterFields filters={filters} onChange={onChange} />
      </CollapsibleContent>
    </Collapsible>
  );
};
