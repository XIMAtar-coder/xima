import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/**
 * "Annunci di lavoro" / "Offerte ricevute" as two tabs over the two routes
 * (/jobs and /my-offers), from the candidate opportunities redesign.
 */
export const useReceivedOffersCount = () =>
  useQuery({
    queryKey: ['received-offers-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from('hiring_offers')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_user_id', user.id)
        .in('offer_status', ['sent', 'accepted', 'declined']);
      return count || 0;
    },
    staleTime: 60_000,
  });

export const OpportunitiesTabs: React.FC<{ active: 'jobs' | 'offers'; offersCount?: number }> = ({ active, offersCount }) => {
  const { t } = useTranslation();
  const { data: fetched } = useReceivedOffersCount();
  const count = offersCount ?? fetched ?? 0;

  const tabClass = (isActive: boolean) => cn(
    'border-b-2 px-1 pb-3 text-[15px] transition-colors',
    isActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
  );

  return (
    <nav aria-label={t('jobs.tabs_label', 'Opportunity sections')} className="mb-6 flex gap-6 border-b border-[hsl(var(--xs-line))]">
      <Link to="/jobs" aria-current={active === 'jobs' ? 'page' : undefined} className={tabClass(active === 'jobs')}>
        {t('jobs.tab_listings', 'Job listings')}
      </Link>
      <Link to="/my-offers" aria-current={active === 'offers' ? 'page' : undefined} className={tabClass(active === 'offers')}>
        {t('jobs.tab_offers', 'Offers received')} <span className="xs-num font-mono text-[12px]">{count}</span>
      </Link>
    </nav>
  );
};

export default OpportunitiesTabs;
