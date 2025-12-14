import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Star, Target, ArrowUpDown } from 'lucide-react';
import { XimatarCandidateCard } from '@/components/business/XimatarCandidateCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Candidate {
  user_id: string;
  ximatar_label: string;
  ximatar_image: string;
  evaluation_score: number;
  pillar_average: number;
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
  rank: number;
  isShortlisted?: boolean;
}

const BusinessCandidates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [ximatarFilter, setXimatarFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'pillar'>('score');

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    if (!businessLoading) {
      loadCandidates();
    }
  }, [isAuthenticated, isBusiness, businessLoading]);

  useEffect(() => {
    let filtered = [...candidates];

    if (ximatarFilter !== 'all') {
      filtered = filtered.filter(c => c.ximatar_label?.toLowerCase() === ximatarFilter.toLowerCase());
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.ximatar_label?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'score') {
        return b.evaluation_score - a.evaluation_score;
      } else {
        return b.pillar_average - a.pillar_average;
      }
    });

    setFilteredCandidates(filtered);
  }, [searchTerm, candidates, ximatarFilter, sortBy]);

  const loadCandidates = async () => {
    try {
      const { data: candidatesData, error } = await supabase.rpc('get_candidate_visibility');

      if (error) throw error;

      const { data: shortlisted } = await supabase
        .from('candidate_shortlist')
        .select('candidate_id')
        .eq('business_id', user?.id);

      const shortlistedIds = new Set(shortlisted?.map(s => s.candidate_id) || []);

      // DEV DEBUG: Log first 5 candidates raw data
      if (import.meta.env.DEV && candidatesData?.length) {
        console.group('🔍 [DEV] Candidate Pool Audit');
        console.log('Source: supabase.rpc("get_candidate_visibility")');
        console.log('Underlying tables: profiles → assessment_results → pillar_scores → ximatars');
        console.log('Total candidates returned:', candidatesData.length);
        console.table(
          candidatesData.slice(0, 5).map((c: any, i: number) => ({
            '#': i + 1,
            profile_user_id: c.user_id,
            ximatar_id: c.ximatar_id || 'null',
            ximatar_label: c.ximatar_label || 'null',
            evaluation_score: c.evaluation_score,
            source: 'profiles.user_id → auth.users.id'
          }))
        );
        console.groupEnd();
      }

      const candidatesWithShortlist: Candidate[] = (candidatesData || []).map((candidate: any) => ({
        user_id: candidate.user_id,
        ximatar_label: candidate.ximatar_label || 'Unknown',
        ximatar_image: candidate.ximatar_image || '/placeholder.svg',
        evaluation_score: Number(candidate.evaluation_score) || 0,
        pillar_average: Number(candidate.pillar_average) || 0,
        computational_power: Number(candidate.computational_power) || 0,
        communication: Number(candidate.communication) || 0,
        knowledge: Number(candidate.knowledge) || 0,
        creativity: Number(candidate.creativity) || 0,
        drive: Number(candidate.drive) || 0,
        rank: Number(candidate.rank) || 0,
        isShortlisted: shortlistedIds.has(candidate.user_id)
      }));

      try {
        await supabase.rpc('log_user_activity', {
          p_user_id: user?.id,
          p_action: 'view_candidate_pool',
          p_context: { count: candidatesWithShortlist.length }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      setCandidates(candidatesWithShortlist);
      setFilteredCandidates(candidatesWithShortlist);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast({
        title: t('common.error'),
        description: t('business.candidates.failed_update'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortlist = async (candidateId: string) => {
    const candidate = candidates.find(c => c.user_id === candidateId);
    if (!candidate) return;

    try {
      if (candidate.isShortlisted) {
        await supabase
          .from('candidate_shortlist')
          .delete()
          .eq('business_id', user?.id)
          .eq('candidate_id', candidateId);
      } else {
        await supabase
          .from('candidate_shortlist')
          .insert({
            business_id: user?.id,
            candidate_id: candidateId,
            status: 'shortlisted'
          });
      }

      loadCandidates();
      toast({
        title: candidate.isShortlisted ? t('business.candidates.removed_from_shortlist') : t('business.candidates.added_single'),
        description: candidate.isShortlisted ? t('business.candidates.candidate_removed') : t('business.candidates.candidate_added')
      });
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: t('common.error'),
        description: t('business.candidates.failed_update'),
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) {
      toast({
        title: t('business.candidates.no_selection'),
        description: t('business.candidates.select_first'),
        variant: 'destructive'
      });
      return;
    }

    try {
      if (action === 'shortlist') {
        const inserts = selectedCandidates.map(candidateId => ({
          business_id: user?.id,
          candidate_id: candidateId,
          status: 'shortlisted'
        }));

        await supabase
          .from('candidate_shortlist')
          .upsert(inserts);

        toast({
          title: t('business.dashboard.success'),
          description: `${selectedCandidates.length} ${t('business.candidates.added_to_shortlist')}`
        });
      } else if (action === 'challenge') {
        navigate('/business/challenges/new', { state: { selectedCandidates } });
      }

      setSelectedCandidates([]);
      loadCandidates();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: t('common.error'),
        description: t('business.candidates.failed_action'),
        variant: 'destructive'
      });
    }
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('business.candidates.title')}</h1>
            <p className="text-muted-foreground">
              {filteredCandidates.length} {t('business.candidates.available')}
            </p>
          </div>
          {selectedCandidates.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkAction('shortlist')}
                variant="outline"
                className="border-primary/30"
              >
                <Star className="mr-2" size={16} />
                {t('business.candidates.shortlist_action')} ({selectedCandidates.length})
              </Button>
              <Button
                onClick={() => handleBulkAction('challenge')}
                className="bg-primary hover:bg-primary/90"
              >
                <Target className="mr-2" size={16} />
                {t('business.candidates.invite_action')}
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  placeholder={t('business.candidates.search_placeholder')}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={ximatarFilter} onValueChange={setXimatarFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2" size={16} />
                  <SelectValue placeholder={t('business.candidates.filter_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('business.candidates.all_types')}</SelectItem>
                  <SelectItem value="owl">Owl</SelectItem>
                  <SelectItem value="parrot">Parrot</SelectItem>
                  <SelectItem value="elephant">Elephant</SelectItem>
                  <SelectItem value="fox">Fox</SelectItem>
                  <SelectItem value="horse">Horse</SelectItem>
                  <SelectItem value="wolf">Wolf</SelectItem>
                  <SelectItem value="lion">Lion</SelectItem>
                  <SelectItem value="bee">Bee</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="dolphin">Dolphin</SelectItem>
                  <SelectItem value="bear">Bear</SelectItem>
                  <SelectItem value="chameleon">Chameleon</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'score' | 'pillar') => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="mr-2" size={16} />
                  <SelectValue placeholder={t('business.candidates.sort_by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">{t('business.candidates.evaluation_score')}</SelectItem>
                  <SelectItem value="pillar">{t('business.candidates.pillar_average')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <XimatarCandidateCard
              key={candidate.user_id}
              candidateId={candidate.user_id}
              ximatarLabel={candidate.ximatar_label}
              ximatarImage={candidate.ximatar_image}
              evaluationScore={candidate.evaluation_score}
              pillarAverage={candidate.pillar_average}
              pillars={{
                computational_power: candidate.computational_power,
                communication: candidate.communication,
                knowledge: candidate.knowledge,
                creativity: candidate.creativity,
                drive: candidate.drive,
              }}
              isShortlisted={candidate.isShortlisted}
              isSelected={selectedCandidates.includes(candidate.user_id)}
              onSelect={async (checked) => {
                if (checked) {
                  setSelectedCandidates([...selectedCandidates, candidate.user_id]);
                  try {
                    await supabase.rpc('log_user_activity', {
                      p_user_id: user?.id,
                      p_action: 'candidate_view',
                      p_context: { candidate_id: candidate.user_id }
                    });
                  } catch (err) {
                    console.warn('Failed to log activity:', err);
                  }
                } else {
                  setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.user_id));
                }
              }}
              onToggleShortlist={() => handleToggleShortlist(candidate.user_id)}
              onInviteToChallenge={() => navigate('/business/challenges/new', { state: { selectedCandidates: [candidate.user_id] } })}
            />
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">{t('business.candidates.no_candidates')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessCandidates;
