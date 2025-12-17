import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Search, Filter, Star, Target, ArrowUpDown, Sparkles, ArrowLeft, Bookmark, BookmarkCheck, RefreshCw, ChevronDown, Lightbulb, Bug, Pencil, Plus } from 'lucide-react';
import { XimatarCandidateCard } from '@/components/business/XimatarCandidateCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHiringGoalShortlist } from '@/hooks/useHiringGoalShortlist';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChallengeModal } from '@/components/business/CreateChallengeModal';
import { NoChallengeGate } from '@/components/business/NoChallengeGate';

const PAGE_SIZE = 12;

interface Candidate {
  user_id: string;
  profile_id: string;
  display_name: string;
  ximatar_label: string;
  ximatar_image: string;
  ximatar_id?: string;
  evaluation_score: number;
  pillar_average: number;
  computational_power: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
  rank: number;
  isShortlisted?: boolean;
  matchLevel?: 'high' | 'medium' | 'low';
  matchReasons?: string[];
  invitationStatus?: 'none' | 'invited' | 'accepted' | 'declined' | 'loading';
}

interface ActiveChallenge {
  id: string;
  title: string;
}

const BusinessCandidates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('fromGoal');
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
  const [viewFilter, setViewFilter] = useState<'all' | 'shortlisted'>('all');
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSeed, setRegenerateSeed] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [invitationStatuses, setInvitationStatuses] = useState<Record<string, 'none' | 'invited' | 'accepted' | 'declined' | 'loading'>>({});
  const [companyName, setCompanyName] = useState<string>('');
  
  // Challenge gating state
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);

  // Fetch company name for invitations
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('business_profiles')
        .select('company_name')
        .eq('user_id', user.id)
        .single();
      if (data) setCompanyName(data.company_name);
    };
    fetchCompanyName();
  }, [user?.id]);

  // Fetch active challenge for the hiring goal
  useEffect(() => {
    const fetchActiveChallenge = async () => {
      if (!goalId || !user?.id) {
        setChallengeLoading(false);
        return;
      }
      
      try {
        // Get the most recently updated active challenge for this goal
        const { data, error } = await supabase
          .from('business_challenges')
          .select('id, title')
          .eq('business_id', user.id)
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setActiveChallenge(data);
      } catch (err) {
        console.error('Error fetching active challenge:', err);
        setActiveChallenge(null);
      } finally {
        setChallengeLoading(false);
      }
    };
    
    fetchActiveChallenge();
  }, [goalId, user?.id]);

  // Shortlist from hiring goal
  const { 
    loading: shortlistLoading, 
    hiringGoal, 
    shortlist, 
    error: shortlistError 
  } = useHiringGoalShortlist(goalId);

  useEffect(() => {
    if (!isAuthenticated || (businessLoading === false && !isBusiness)) {
      navigate('/business/login');
      return;
    }

    // If we have a goalId, use shortlist data instead of loading all candidates
    if (goalId) {
      setLoading(false);
      return;
    }

    if (!businessLoading) {
      loadCandidates();
    }
  }, [isAuthenticated, isBusiness, businessLoading, goalId]);

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

  // Update candidates when shortlist is loaded (for goal-based view)
  useEffect(() => {
    if (goalId && shortlist.length > 0) {
      const loadShortlistAndInvitations = async () => {
        // Use the new business_shortlists table
        const { data: shortlistedData, error: shortlistErr } = await supabase
          .from('business_shortlists')
          .select('candidate_profile_id')
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId);

        // Also load existing invitations
        const { data: invitationsData, error: invitationsErr } = await supabase
          .from('challenge_invitations')
          .select('candidate_profile_id, status')
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId);

        // Handle invitation query errors - don't mark anyone as invited
        if (invitationsErr) {
          console.error('Error loading invitations:', invitationsErr);
          toast({
            title: t('common.error'),
            description: 'Failed to load invitation statuses',
            variant: 'destructive'
          });
        }

        const shortlistedIds = new Set(shortlistedData?.map(s => s.candidate_profile_id) || []);
        setShortlistedCount(shortlistedIds.size);

        // Build invitation status map keyed by profile_id (candidate_profile_id)
        const invStatusMap: Record<string, 'none' | 'invited' | 'accepted' | 'declined'> = {};
        if (!invitationsErr) {
          (invitationsData || []).forEach(inv => {
            invStatusMap[inv.candidate_profile_id] = inv.status as any;
          });
        }
        setInvitationStatuses(invStatusMap);

        // Map using profile_id for invitation status lookup
        const candidatesWithStatus = shortlist.map(c => ({
          ...c,
          isShortlisted: shortlistedIds.has(c.profile_id),
          invitationStatus: invStatusMap[c.profile_id] || 'none'
        }));

        setCandidates(candidatesWithStatus);
        setFilteredCandidates(candidatesWithStatus);
      };
      loadShortlistAndInvitations();
    }
  }, [goalId, shortlist, user?.id, t, toast]);

  const loadCandidates = async () => {
    try {
      const { data: candidatesData, error } = await supabase.rpc('get_candidate_visibility');

      if (error) throw error;

      // For non-goal view, we don't have goal-specific shortlist - just show all
      const candidatesWithShortlist: Candidate[] = (candidatesData || []).map((candidate: any) => {
        // DEV: Log if ximatar data is inconsistent
        if (process.env.NODE_ENV === 'development') {
          const hasLabelImageMismatch = candidate.ximatar_label && candidate.ximatar_image && 
            !candidate.ximatar_image.toLowerCase().includes(candidate.ximatar_label.toLowerCase());
          if (hasLabelImageMismatch) {
            console.warn('[DEV] Ximatar mismatch:', {
              user_id: candidate.user_id,
              label: candidate.ximatar_label,
              image: candidate.ximatar_image
            });
          }
        }
        
        return {
          user_id: candidate.user_id,
          profile_id: candidate.profile_id || candidate.user_id,
          display_name: candidate.display_name || 'Unknown',
          ximatar_label: candidate.ximatar_label || 'unknown',
          ximatar_image: candidate.ximatar_image || '/placeholder.svg',
          ximatar_id: candidate.ximatar_id,
          evaluation_score: Number(candidate.evaluation_score) || 0,
          pillar_average: Number(candidate.pillar_average) || 0,
          computational_power: Number(candidate.computational_power) || 0,
          communication: Number(candidate.communication) || 0,
          knowledge: Number(candidate.knowledge) || 0,
          creativity: Number(candidate.creativity) || 0,
          drive: Number(candidate.drive) || 0,
          rank: Number(candidate.rank) || 0,
          isShortlisted: false
        };
      });

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
    if (!candidate || !goalId) return;

    try {
      if (candidate.isShortlisted) {
        // Remove from shortlist
        await supabase
          .from('business_shortlists')
          .delete()
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId)
          .eq('candidate_profile_id', candidateId);
      } else {
        // Add to shortlist
        await supabase
          .from('business_shortlists')
          .insert({
            business_id: user?.id,
            hiring_goal_id: goalId,
            candidate_profile_id: candidateId
          });
      }

      // Update local state immediately
      const updatedCandidates = candidates.map(c => 
        c.user_id === candidateId 
          ? { ...c, isShortlisted: !c.isShortlisted }
          : c
      );
      setCandidates(updatedCandidates);
      
      // Update count
      const newCount = updatedCandidates.filter(c => c.isShortlisted).length;
      setShortlistedCount(newCount);
      
      // Update filtered view
      if (viewFilter === 'shortlisted') {
        setFilteredCandidates(updatedCandidates.filter(c => c.isShortlisted));
      } else {
        setFilteredCandidates(updatedCandidates);
      }

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

  // Handle view filter changes (All / Shortlisted)
  const handleViewFilterChange = (value: string) => {
    setViewFilter(value as 'all' | 'shortlisted');
    setVisibleCount(PAGE_SIZE); // Reset pagination when switching tabs
    if (value === 'shortlisted') {
      setFilteredCandidates(candidates.filter(c => c.isShortlisted));
    } else {
      setFilteredCandidates(candidates);
    }
  };

  // Handle regenerate matches (deterministic shuffle with seed)
  const handleRegenerate = async () => {
    if (!goalId) return;
    setIsRegenerating(true);
    
    // Increment seed for new shuffle
    const newSeed = regenerateSeed + 1;
    setRegenerateSeed(newSeed);
    
    // Preserve currently saved candidates
    const savedIds = new Set(candidates.filter(c => c.isShortlisted).map(c => c.user_id));
    
    // Deterministic shuffle using seed-based scoring
    const seededShuffle = [...candidates].map((c, i) => ({
      ...c,
      sortKey: Math.sin(newSeed * 9999 + i) * 10000
    })).sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...c }) => c);
    
    // Put saved candidates at the top, then rest
    const savedCandidates = seededShuffle.filter(c => savedIds.has(c.user_id));
    const unsavedCandidates = seededShuffle.filter(c => !savedIds.has(c.user_id));
    const reordered = [...savedCandidates, ...unsavedCandidates];
    
    setCandidates(reordered);
    setFilteredCandidates(viewFilter === 'shortlisted' ? reordered.filter(c => c.isShortlisted) : reordered);
    setVisibleCount(PAGE_SIZE);
    
    toast({
      title: t('business.shortlist.regenerated'),
      description: t('business.shortlist.regenerated_desc')
    });
    
    setIsRegenerating(false);
  };

  // Show more candidates
  const handleShowMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // Handle invite to challenge - candidateProfileId is profiles.id
  const handleInviteToChallenge = async (candidateProfileId: string) => {
    if (!goalId || !user?.id || !activeChallenge) return;
    
    // Set loading state for THIS candidate only (keyed by profile_id)
    setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'loading' }));
    
    try {
      // Get candidate email from profiles using profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, name')
        .eq('id', candidateProfileId)
        .single();

      if (!profile) throw new Error('Candidate profile not found');

      const candidateName = profile.full_name || profile.name || 'Candidate';
      const candidateEmail = profile.email;

      // Create invitation record with challenge_id
      const { data: invitation, error: invError } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: user.id,
          hiring_goal_id: goalId,
          candidate_profile_id: candidateProfileId,
          challenge_id: activeChallenge.id
        })
        .select('id, invite_token')
        .single();

      if (invError) {
        if (invError.code === '23505') {
          // Duplicate - already invited
          toast({
            title: t('business.shortlist.already_invited'),
            description: t('business.shortlist.already_invited_desc'),
            variant: 'default'
          });
          setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'invited' }));
          return;
        }
        throw invError;
      }

      // Send email via edge function (if we have email)
      if (candidateEmail) {
        try {
          await supabase.functions.invoke('send-challenge-invitation', {
            body: {
              invitation_id: invitation.id,
              candidate_email: candidateEmail,
              candidate_name: candidateName,
              company_name: companyName || 'Company',
              role_title: hiringGoal?.role_title,
              invite_token: invitation.invite_token,
              language: 'en'
            }
          });
        } catch (emailErr) {
          console.warn('Email sending failed (non-blocking):', emailErr);
        }
      }

      // Update local state - keyed by profile_id
      setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'invited' }));
      
      // Update candidate in list - match by profile_id
      setCandidates(prev => prev.map(c => 
        c.profile_id === candidateProfileId ? { ...c, invitationStatus: 'invited' as const } : c
      ));
      setFilteredCandidates(prev => prev.map(c => 
        c.profile_id === candidateProfileId ? { ...c, invitationStatus: 'invited' as const } : c
      ));

      toast({
        title: t('business.shortlist.invitation_sent'),
        description: t('business.shortlist.invitation_sent_desc', { name: candidateName })
      });
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      // Reset to 'none' on error - keyed by profile_id
      setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'none' }));
      toast({
        title: t('common.error'),
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  // Get paginated candidates for display
  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCandidates.length;

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

  if (loading || businessLoading || (goalId && shortlistLoading)) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            {goalId && (
              <p className="text-muted-foreground">{t('business.shortlist.generating')}</p>
            )}
          </div>
        </div>
      </BusinessLayout>
    );
  }

  // Match level badge styling
  const getMatchBadge = (level: 'high' | 'medium' | 'low' | undefined) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">{t('business.shortlist.match_high')}</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">{t('business.shortlist.match_medium')}</Badge>;
      case 'low':
        return <Badge className="bg-muted text-muted-foreground border-border">{t('business.shortlist.match_low')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header - Different for shortlist vs pool view */}
        {goalId ? (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/business/dashboard')}
              className="gap-2 -ml-2"
            >
              <ArrowLeft size={16} />
              {t('common.back')}
            </Button>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {t('business.shortlist.title')}
                </h1>
                <p className="text-white/80">
                  {t('business.shortlist.subtitle', { count: filteredCandidates.length })}
                </p>
                {hiringGoal?.role_title && (
                  <Badge variant="outline" className="mt-2">
                    {hiringGoal.role_title}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* DEV Debug Toggle */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant={showDebug ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                    title="Toggle DEV Debug Info"
                  >
                    <Bug size={14} />
                  </Button>
                )}
                {/* Regenerate button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                >
                  <RefreshCw size={14} className={`mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {t('business.shortlist.regenerate')}
                </Button>
              </div>
            </div>
            
            {/* Shortlist filter tabs */}
            <Tabs value={viewFilter} onValueChange={handleViewFilterChange} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-900/60 border border-white/10">
                <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                  <Bookmark size={14} />
                  {t('business.shortlist.all_matches')}
                </TabsTrigger>
                <TabsTrigger value="shortlisted" className="gap-2 data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70">
                  <BookmarkCheck size={14} />
                  {t('business.shortlist.saved')} ({shortlistedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Challenge gate banner - show if no active challenge */}
            {!challengeLoading && !activeChallenge && (
              <NoChallengeGate 
                onCreateChallenge={() => navigate(`/business/challenges/new?goal=${goalId}`)}
                onViewSaved={() => setViewFilter('shortlisted')}
              />
            )}

            {/* Active challenge badge with actions */}
            {activeChallenge && (
              <div className="flex items-center justify-between gap-4 text-sm bg-slate-900/60 border border-white/10 p-4 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-white/80">
                  <Target size={16} className="text-primary shrink-0" />
                  <span>{t('business_challenge.active_challenge')}: <strong className="text-white">{activeChallenge.title}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/business/challenges/${activeChallenge.id}/edit`)}
                    className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Pencil size={14} className="mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/business/challenges/new?goal=${goalId}`)}
                    className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Plus size={14} className="mr-1" />
                    {t('business_challenge.new_challenge')}
                  </Button>
                </div>
              </div>
            )}

            {/* Hint for All Matches tab */}
            {viewFilter === 'all' && activeChallenge && (
              <div className="flex items-center gap-2 text-sm text-white/80 bg-slate-900/60 border border-white/10 p-3 rounded-lg">
                <Lightbulb size={16} className="text-amber-400 shrink-0" />
                {t('business.shortlist.save_hint')}
              </div>
            )}

            {shortlistError && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4 text-destructive">
                  {shortlistError}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('business.candidates.title')}</h1>
              <p className="text-white/80">
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
        )}

        {/* Search and Filters - Only show in full pool view */}
        {!goalId && (
          <Card className="bg-slate-900/60 border border-white/10 shadow-lg">
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
        )}

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCandidates.map((candidate) => (
            <div key={candidate.user_id} className="relative">
              {/* Match badge for shortlist view */}
              {goalId && candidate.matchLevel && (
                <div className="absolute -top-2 -right-2 z-10">
                  {getMatchBadge(candidate.matchLevel)}
                </div>
              )}
              <XimatarCandidateCard
                candidateId={candidate.user_id}
                profileId={candidate.profile_id}
                displayName={candidate.display_name}
                ximatarLabel={candidate.ximatar_label}
                ximatarImage={candidate.ximatar_image}
                ximatarId={candidate.ximatar_id}
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
                showSaveButton={!!goalId}
                showDebug={showDebug}
                invitationStatus={invitationStatuses[candidate.profile_id] || candidate.invitationStatus || 'none'}
                inviteDisabled={!activeChallenge}
                inviteDisabledReason={!activeChallenge ? t('business_challenge.create_first_tooltip') : undefined}
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
                onInviteToChallenge={() => handleInviteToChallenge(candidate.profile_id)}
              />
              {/* Match reasons for shortlist view */}
              {goalId && candidate.matchReasons && candidate.matchReasons.length > 0 && (
                <div className="mt-2 p-3 bg-slate-900/60 rounded-lg border border-white/10">
                  <p className="text-xs font-medium text-white/70 mb-1">
                    {t('business.shortlist.why_matched')}
                  </p>
                  <ul className="space-y-1">
                    {candidate.matchReasons.map((reason, idx) => (
                      <li key={idx} className="text-xs text-white/90 flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show More Button (Pagination) */}
        {hasMore && displayedCandidates.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleShowMore}
              className="gap-2"
            >
              <ChevronDown size={16} />
              {t('business.shortlist.show_more', { count: PAGE_SIZE })}
            </Button>
          </div>
        )}

        {/* Empty States */}
        {filteredCandidates.length === 0 && (
          <Card className="bg-slate-900/60 border border-white/10 shadow-lg">
            <CardContent className="p-12 text-center space-y-4">
              {goalId && viewFilter === 'shortlisted' ? (
                <>
                  <BookmarkCheck size={48} className="mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground text-lg">
                    {t('business.shortlist.no_saved')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleViewFilterChange('all')}
                  >
                    {t('business.shortlist.browse_matches')}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-lg">
                  {goalId ? t('business.shortlist.no_matches') : t('business.candidates.no_candidates')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Challenge Modal */}
        {goalId && user?.id && (
          <CreateChallengeModal
            open={showCreateChallengeModal}
            onOpenChange={setShowCreateChallengeModal}
            hiringGoalId={goalId}
            businessId={user.id}
            defaultTitle={hiringGoal?.role_title || t('business_challenge.new_challenge')}
            defaultDescription={hiringGoal?.task_description || ''}
            onChallengeCreated={(challengeId, challengeTitle) => {
              setActiveChallenge({ id: challengeId, title: challengeTitle });
            }}
          />
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessCandidates;
