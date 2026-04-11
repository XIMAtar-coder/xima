import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Compass, BookOpen, FileText, User, Briefcase } from 'lucide-react';
import { usePersonalFeed, FeedCategory } from '@/hooks/usePersonalFeed';
import { PersonalFeedCard } from './PersonalFeedCard';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';

export const PersonalFeedView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [category, setCategory] = useState<FeedCategory>('for_you');
  const { feedItems, isLoading, markAsRead, trackEngagement, unreadCount, userArchetype, hoursSinceLastGrowth } = usePersonalFeed(category);

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleTrackEngagement = (id: string) => {
    trackEngagement.mutate(id);
  };

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as FeedCategory)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="for_you">{t('feed.tab.for_you', 'Per te')}</TabsTrigger>
          <TabsTrigger value="growth">{t('feed.tab.growth', 'Growth')}</TabsTrigger>
          <TabsTrigger value="opportunities">{t('feed.tab.opportunities', 'Opportunità')}</TabsTrigger>
          <TabsTrigger value="discover">{t('feed.tab.discover', 'Scopri')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed content per tab */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TabContent
          category={category}
          feedItems={feedItems}
          navigate={navigate}
          t={t}
          userId={user?.id}
          onMarkRead={handleMarkRead}
          onTrackEngagement={handleTrackEngagement}
          userArchetype={userArchetype}
          hoursSinceLastGrowth={hoursSinceLastGrowth}
        />
      )}
    </div>
  );
};

interface TabContentProps {
  category: FeedCategory;
  feedItems: any[];
  navigate: any;
  t: any;
  userId?: string;
  onMarkRead: (id: string) => void;
  onTrackEngagement: (id: string) => void;
  userArchetype?: string;
  hoursSinceLastGrowth?: number | null;
}

const TabContent = ({ category, feedItems, navigate, t, userId, onMarkRead, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: TabContentProps) => {
  switch (category) {
    case 'for_you':
      return <ForYouTab feedItems={feedItems} navigate={navigate} t={t} userId={userId} onMarkRead={onMarkRead} onTrackEngagement={onTrackEngagement} userArchetype={userArchetype} hoursSinceLastGrowth={hoursSinceLastGrowth} />;
    case 'growth':
      return <GrowthTab feedItems={feedItems} navigate={navigate} t={t} userId={userId} onMarkRead={onMarkRead} onTrackEngagement={onTrackEngagement} userArchetype={userArchetype} hoursSinceLastGrowth={hoursSinceLastGrowth} />;
    case 'opportunities':
      return <OpportunitiesTab navigate={navigate} t={t} userId={userId} />;
    case 'discover':
      return <DiscoverTab feedItems={feedItems} navigate={navigate} t={t} onTrackEngagement={onTrackEngagement} userArchetype={userArchetype} hoursSinceLastGrowth={hoursSinceLastGrowth} />;
    default:
      return null;
  }
};

/* ─── FOR YOU TAB ─── */
const ForYouTab = ({ feedItems, navigate, t, userId, onMarkRead, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: any) => {
  const { data: profile } = useQuery({
    queryKey: ['feed-user-state', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('ximatar_id, pillar_scores, profile_completed')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: hasCv } = useQuery({
    queryKey: ['feed-has-cv', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('assessment_cv_analysis')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const { data: hasGrowthPath } = useQuery({
    queryKey: ['feed-has-growth', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('growth_paths' as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // If no feed items, show state-aware onboarding
  if (!feedItems?.length) {
    const missingItems: string[] = [];
    if (!hasCv) missingItems.push('cv');
    if (!hasGrowthPath) missingItems.push('growth');
    if (!profile?.profile_completed) missingItems.push('profile');

    return (
      <Card className="border-border/50">
        <CardContent className="py-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              {t('feed.for_you_welcome_title', 'Il tuo Feed personale')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {t('feed.for_you_welcome_subtitle', 'Il Feed raccoglie la tua storia di crescita professionale: aggiornamenti sui tuoi pilastri, sfide dalle aziende, contenuti curati per il tuo archetipo e raccomandazioni personalizzate.')}
            </p>
          </div>

          {missingItems.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('feed.complete_these', 'Completa questi passaggi per arricchire il tuo Feed:')}
              </p>

              {!hasCv && (
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('feed.upload_cv_title', 'Carica il tuo CV')}</p>
                    <p className="text-xs text-muted-foreground">{t('feed.upload_cv_hint', 'Analizziamo il tuo CV per mostrarti tensioni tra identità e credenziali')}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
                    {t('common.start', 'Inizia')}
                  </Button>
                </div>
              )}

              {!hasGrowthPath && (
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('feed.activate_growth_title', 'Attiva il Growth Hub')}</p>
                    <p className="text-xs text-muted-foreground">{t('feed.activate_growth_hint', 'Ricevi corsi, libri e podcast su misura per far crescere i tuoi pilastri deboli')}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/development-plan')}>
                    {t('common.activate', 'Attiva')}
                  </Button>
                </div>
              )}

              {!profile?.profile_completed && (
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('feed.complete_profile_title', 'Completa il tuo profilo')}</p>
                    <p className="text-xs text-muted-foreground">{t('feed.complete_profile_hint', 'Aggiungi ruoli desiderati, località e preferenze per ricevere opportunità migliori')}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/settings')}>
                    {t('common.complete', 'Completa')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {missingItems.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                {t('feed.all_set', 'Hai completato tutti i passaggi iniziali. Il tuo Feed si popolerà man mano che interagisci con la piattaforma.')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item: any) => (
        <PersonalFeedCard
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onTrackEngagement={onTrackEngagement}
          userArchetype={userArchetype}
          hoursSinceLastGrowth={hoursSinceLastGrowth}
        />
      ))}
    </div>
  );
};

/* ─── GROWTH TAB ─── */
const GrowthTab = ({ feedItems, navigate, t, userId, onMarkRead, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: any) => {
  const { data: hasGrowthPath } = useQuery({
    queryKey: ['feed-has-growth', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('growth_paths' as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  if (!hasGrowthPath) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-lg font-semibold">
            {t('feed.growth_activate_title', 'Attiva il tuo Growth Hub')}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {t('feed.growth_activate_subtitle', "Il Growth Hub ti offre un percorso personalizzato di corsi, libri e podcast curati dall'AI per far crescere i tuoi pilastri più deboli.")}
          </p>
          <Button className="mt-4" onClick={() => navigate('/development-plan')}>
            {t('feed.activate_growth_hub', 'Attiva Growth Hub')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has growth path: show growth-related feed items
  if (!feedItems?.length) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('feed.no_growth_activity', 'Inizia a completare risorse nel Growth Hub per vedere i tuoi progressi qui')}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/development-plan')}>
            {t('feed.go_to_hub', 'Vai al Hub')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Growth path overview card */}
      <Card className="border-teal-200/50 dark:border-teal-800/50 bg-teal-50/30 dark:bg-teal-950/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t('feed.your_growth_path', 'Il tuo percorso di crescita')}</p>
              <p className="text-xs text-muted-foreground">
                {t('feed.growth_active_hint', 'Growth Hub attivo — i progressi appariranno qui')}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/development-plan')}>
              {t('feed.go_to_hub', 'Vai al Hub')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedItems.map((item: any) => (
        <PersonalFeedCard
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onTrackEngagement={onTrackEngagement}
          userArchetype={userArchetype}
          hoursSinceLastGrowth={hoursSinceLastGrowth}
        />
      ))}
    </div>
  );
};

/* ─── OPPORTUNITIES TAB ─── */
const OpportunitiesTab = ({ navigate, t, userId }: { navigate: any; t: any; userId?: string }) => {
  const { data: matchedJobs, isLoading } = useQuery({
    queryKey: ['feed-matched-jobs', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('recommend-jobs', {
          body: { user_id: userId, limit: 10 },
        });
        if (error) {
          console.warn('[feed-opportunities] recommend-jobs failed:', error);
          return [];
        }
        return data?.recommendations || data?.opportunities || [];
      } catch (e) {
        console.warn('[feed-opportunities] Error:', e);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 120000,
  });

  const { data: latestJobs } = useQuery({
    queryKey: ['feed-latest-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hiring_goal_drafts' as any)
        .select('id, role_title, description, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 120000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasMatched = matchedJobs && matchedJobs.length > 0;
  const hasLatest = latestJobs && latestJobs.length > 0;

  if (!hasMatched && !hasLatest) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">
            {t('feed.no_opportunities_yet', 'Nessuna opportunità al momento')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('feed.no_opportunities_hint', 'Completa il tuo profilo e XIMAtar per ricevere match personalizzati.')}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/jobs')}>
            {t('feed.browse_all_jobs', 'Esplora tutte le posizioni')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {hasMatched && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t('feed.matches_for_you', 'Match per te')}
          </p>
          <div className="space-y-3">
            {matchedJobs.map((job: any) => (
              <OpportunityCard key={job.id || job.job_id || job.job?.id} job={job} isMatch t={t} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {hasLatest && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t('feed.latest_on_platform', 'Ultime opportunità sulla piattaforma')}
          </p>
          <div className="space-y-3">
            {(latestJobs as any[]).map((job: any) => (
              <OpportunityCard key={job.id} job={job} isMatch={false} t={t} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
          {t('feed.see_all_jobs', 'Vedi tutte le posizioni')}
        </Button>
      </div>
    </div>
  );
};

const OpportunityCard = ({ job, isMatch, t, navigate }: { job: any; isMatch: boolean; t: any; navigate: any }) => {
  const title = job.role_title || job.title || job.job?.title || 'Position';
  const company = job.company_name || job.company || job.job?.company || '';
  const location = job.location || job.job?.location || '';

  return (
    <Card className={`hover:shadow-md transition-shadow ${isMatch ? 'border-primary/30 bg-primary/5' : 'border-border/50'}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{title}</p>
            <p className="text-xs text-muted-foreground">
              {company}{location ? ` · ${location}` : ''}
            </p>
            {job.xima_narrative && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{job.xima_narrative}</p>
            )}
            {job.match_score && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${job.match_score}%` }} />
                </div>
                <span className="text-xs font-medium">{job.match_score}% match</span>
              </div>
            )}
          </div>
          {isMatch && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0 ml-2">
              {t('feed.for_you_chip', 'Per te')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── DISCOVER TAB ─── */
const DiscoverTab = ({ feedItems, navigate, t, onTrackEngagement, userArchetype, hoursSinceLastGrowth }: any) => {
  // Only show verified external content (feedItems from discover already filters external)
  // If no items, show a clean empty state — not fake articles
  if (!feedItems?.length) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="py-12 text-center">
          <Compass className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1">
            {t('feed.discover_empty_title', 'Contenuti in arrivo')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('feed.discover_empty_description', 'Articoli curati e verificati da fonti autorevoli verranno aggiunti a breve, personalizzati per il tuo archetipo e i tuoi pilastri.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item: any) => (
        <PersonalFeedCard
          key={item.id}
          item={item}
          onTrackEngagement={onTrackEngagement}
          userArchetype={userArchetype}
          hoursSinceLastGrowth={hoursSinceLastGrowth}
        />
      ))}
    </div>
  );
};
