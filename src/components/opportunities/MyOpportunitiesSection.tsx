import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJobInteractions } from '@/hooks/useJobInteractions';
import { useJobRecommendations } from '@/hooks/useJobRecommendations';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Bookmark, CheckCircle2, TrendingUp, ExternalLink, Sparkles, MapPin, Briefcase, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  description: string | null;
  location: string | null;
  skills: string[] | null;
  source_url: string | null;
  created_at: string;
}

export const MyOpportunitiesSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { interactions, loading: interactionsLoading } = useJobInteractions();
  const { recommendations, loading: recommendationsLoading, refresh } = useJobRecommendations();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);

  const savedJobs = interactions.filter((i) => i.status === 'saved');
  const appliedJobs = interactions.filter((i) => i.status === 'applied');

  const fetchOpportunities = async () => {
    setOpportunitiesLoading(true);
    setOpportunitiesError(null);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-opportunities');

      if (error) throw error;

      if (data?.success && data?.opportunities) {
        setOpportunities(data.opportunities);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Error fetching opportunities:', error);
      setOpportunitiesError(error.message || 'Failed to fetch opportunities');
      toast.error('Failed to load job opportunities');
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const renderOpportunityCard = (opp: Opportunity) => (
    <div 
      key={opp.id} 
      className="p-5 border border-[hsl(var(--xima-accent))]/20 rounded-lg bg-gradient-to-br from-background to-[hsl(var(--xima-accent))]/5 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
            {opp.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--xima-gray))] mb-2">
            <Briefcase className="w-4 h-4" />
            <span>{opp.company}</span>
          </div>
          {opp.location && (
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--xima-gray))]">
              <MapPin className="w-4 h-4" />
              <span>{opp.location}</span>
            </div>
          )}
        </div>
      </div>

      {opp.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {opp.description}
        </p>
      )}

      {opp.skills && opp.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {opp.skills.slice(0, 4).map((skill, idx) => (
            <Badge 
              key={idx} 
              variant="secondary" 
              className="bg-[hsl(var(--xima-teal))]/10 text-[hsl(var(--xima-teal))]"
            >
              {skill}
            </Badge>
          ))}
          {opp.skills.length > 4 && (
            <Badge variant="outline" className="text-muted-foreground">
              {t('opportunities.more_skills', { count: opp.skills.length - 4 })}
            </Badge>
          )}
        </div>
      )}

      <Button 
        size="sm" 
        onClick={() => navigate(`/opportunity/${opp.id}`)}
        className="w-full bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90"
      >
        {t('opportunities.view_details')}
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderJobCard = (
    jobId: string,
    title?: string,
    company?: string,
    matchScore?: number,
    status?: string
  ) => (
    <div 
      key={jobId} 
      className="p-4 border border-[hsl(var(--xima-accent))]/20 rounded-lg bg-gradient-to-br from-background to-[hsl(var(--xima-accent))]/5 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-lg text-foreground truncate">
            {title || 'Untitled Position'}
          </h3>
          <p className="text-sm text-[hsl(var(--xima-gray))]">{company || 'Company'}</p>
        </div>
        {matchScore !== undefined && (
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-2xl font-bold text-[hsl(var(--xima-accent))]">
              {matchScore}%
            </span>
            <span className="text-xs text-[hsl(var(--xima-gray))]">{t('opportunities.match')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {status === 'saved' && (
          <Badge variant="secondary" className="bg-[hsl(var(--xima-teal))]/10 text-[hsl(var(--xima-teal))]">
            <Bookmark className="w-3 h-3 mr-1 fill-current" />
            {t('opportunities.saved')}
          </Badge>
        )}
        {status === 'applied' && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('opportunities.applied')}
          </Badge>
        )}
        {matchScore && matchScore >= 80 && (
          <Badge variant="secondary" className="bg-[hsl(var(--xima-accent))]/10 text-[hsl(var(--xima-accent))]">
            <TrendingUp className="w-3 h-3 mr-1" />
            {t('opportunities.top_match')}
          </Badge>
        )}
      </div>

      <Button 
        size="sm" 
        onClick={() => navigate(`/opportunity/${jobId}`)}
        className="w-full bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90"
      >
        {t('opportunities.view_details')}
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  return (
    <Card className="w-full animate-[fade-in_0.5s_ease-out]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-2xl">{t('dashboard.opportunities_title')}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refresh();
            fetchOpportunities();
          }}
          disabled={recommendationsLoading || opportunitiesLoading}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {t('dashboard.opportunities_refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recommended">
              <Sparkles className="w-4 h-4 mr-2" />
               {t('dashboard.opportunities_tab_for_you')}
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="w-4 h-4 mr-2" />
              {t('dashboard.opportunities_tab_saved')}
            </TabsTrigger>
            <TabsTrigger value="applied">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('dashboard.opportunities_tab_applied')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="space-y-4">
            {opportunitiesLoading ? (
              <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--xima-accent))] animate-spin" />
                <p className="text-[hsl(var(--xima-gray))]">{t('opportunities.loading_jobs')}</p>
              </div>
            ) : opportunitiesError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500/40" />
                <p className="text-red-600 mb-4">{opportunitiesError}</p>
                <Button 
                  onClick={fetchOpportunities}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('opportunities.retry')}
                </Button>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-8">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--xima-accent))]/40" />
              <p className="text-[hsl(var(--xima-gray))] font-medium mb-1">
                {t('dashboard.opportunities_empty_headline')}
                </p>
              <p className="text-sm text-[hsl(var(--xima-gray))]">
                {t('dashboard.opportunities_empty_body')}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {opportunities.map((opp) => renderOpportunityCard(opp))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {interactionsLoading ? (
              <p className="text-center text-[hsl(var(--xima-gray))]">{t('opportunities.loading_saved')}</p>
            ) : savedJobs.length === 0 ? (
              <p className="text-center text-[hsl(var(--xima-gray))] py-8">
                {t('opportunities.no_saved')}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {savedJobs.map((interaction) =>
                  renderJobCard(
                    interaction.job_id,
                    undefined,
                    undefined,
                    undefined,
                    'saved'
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applied" className="space-y-4">
            {interactionsLoading ? (
              <p className="text-center text-[hsl(var(--xima-gray))]">{t('opportunities.loading_applications')}</p>
            ) : appliedJobs.length === 0 ? (
              <p className="text-center text-[hsl(var(--xima-gray))] py-8">
                {t('opportunities.no_applications')}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {appliedJobs.map((interaction) =>
                  renderJobCard(
                    interaction.job_id,
                    undefined,
                    undefined,
                    undefined,
                    'applied'
                  )
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
