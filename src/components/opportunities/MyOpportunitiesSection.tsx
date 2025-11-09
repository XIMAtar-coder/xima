import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useJobInteractions } from '@/hooks/useJobInteractions';
import { useJobMatches } from '@/hooks/useJobMatches';
import { useUser } from '@/context/UserContext';
import { Bookmark, CheckCircle2, TrendingUp, ExternalLink } from 'lucide-react';

export const MyOpportunitiesSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { interactions, loading: interactionsLoading } = useJobInteractions();
  const { matches, loading: matchesLoading } = useJobMatches(user);

  const savedJobs = interactions.filter((i) => i.status === 'saved');
  const appliedJobs = interactions.filter((i) => i.status === 'applied');
  const recommendedJobs = matches.filter((m) => m.score >= 70);

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
            <span className="text-xs text-[hsl(var(--xima-gray))]">Match</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {status === 'saved' && (
          <Badge variant="secondary" className="bg-[hsl(var(--xima-teal))]/10 text-[hsl(var(--xima-teal))]">
            <Bookmark className="w-3 h-3 mr-1 fill-current" />
            Saved
          </Badge>
        )}
        {status === 'applied' && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Applied
          </Badge>
        )}
        {matchScore && matchScore >= 80 && (
          <Badge variant="secondary" className="bg-[hsl(var(--xima-accent))]/10 text-[hsl(var(--xima-accent))]">
            <TrendingUp className="w-3 h-3 mr-1" />
            Top Match
          </Badge>
        )}
      </div>

      <Button 
        size="sm" 
        onClick={() => navigate(`/opportunity/${jobId}`)}
        className="w-full bg-[hsl(var(--xima-accent))] hover:bg-[hsl(var(--xima-accent))]/90"
      >
        View Details
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  return (
    <Card className="w-full animate-[fade-in_0.5s_ease-out]">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">My Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recommended">
              <TrendingUp className="w-4 h-4 mr-2" />
              Recommended
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="applied">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Applied
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="space-y-4">
            {matchesLoading ? (
              <p className="text-center text-[hsl(var(--xima-gray))]">Loading recommendations...</p>
            ) : recommendedJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[hsl(var(--xima-gray))] mb-4">
                  Complete your XIMA assessment to get personalized job recommendations!
                </p>
                <Button onClick={() => navigate('/ximatar-journey')}>
                  Start Assessment
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendedJobs.map((match) =>
                  renderJobCard(
                    match.job.id,
                    match.job.title,
                    match.job.company,
                    match.score,
                    undefined
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {interactionsLoading ? (
              <p className="text-center text-[hsl(var(--xima-gray))]">Loading saved opportunities...</p>
            ) : savedJobs.length === 0 ? (
              <p className="text-center text-[hsl(var(--xima-gray))] py-8">
                No saved opportunities yet. Browse recommended jobs to get started!
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
              <p className="text-center text-[hsl(var(--xima-gray))]">Loading applications...</p>
            ) : appliedJobs.length === 0 ? (
              <p className="text-center text-[hsl(var(--xima-gray))] py-8">
                No applications yet. Start applying to opportunities that match your XIMA profile!
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
