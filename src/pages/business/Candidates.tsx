import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Star, Target, ArrowUpDown, Sparkles, ArrowLeft, Bookmark, BookmarkCheck, RefreshCw, ChevronDown, Lightbulb, Bug, Pencil, Plus, Settings, AlertCircle, ExternalLink } from 'lucide-react';
import { XimatarCandidateCard } from '@/components/business/XimatarCandidateCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHiringGoalShortlist } from '@/hooks/useHiringGoalShortlist';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateChallengeModal } from '@/components/business/CreateChallengeModal';
import { NoChallengeGate } from '@/components/business/NoChallengeGate';
import { SelectionActionBar } from '@/components/business/SelectionActionBar';
import { ChallengePickerModal, type Challenge } from '@/components/business/ChallengePickerModal';
import { Link } from 'react-router-dom';

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

const BusinessCandidates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const goalIdFromParams = searchParams.get('fromGoal');
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
  
  // Goal ID from URL param (only for goal-scoped view)
  const goalId = goalIdFromParams;
  
  // All active challenges across ALL goals (for global pool)
  const [allActiveChallenges, setAllActiveChallenges] = useState<Challenge[]>([]);
  // Goal-specific challenges (for goal-scoped view)
  const [goalActiveChallenges, setGoalActiveChallenges] = useState<Challenge[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [showChallengePickerModal, setShowChallengePickerModal] = useState(false);
  const [bulkInviteLoading, setBulkInviteLoading] = useState(false);

  // Shortlist from hiring goal (only used when goalId is set)
  const { 
    loading: shortlistLoading, 
    hiringGoal, 
    shortlist, 
    error: shortlistError 
  } = useHiringGoalShortlist(goalId);

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

  // Fetch ALL active challenges across ALL goals (for global pool)
  useEffect(() => {
    const fetchAllActiveChallenges = async () => {
      if (!user?.id) {
        setAllActiveChallenges([]);
        setChallengeLoading(false);
        return;
      }
      
      setChallengeLoading(true);
      try {
        // Get ALL active challenges for this business with goal info
        const { data, error } = await supabase
          .from('business_challenges')
          .select(`
            id, 
            title, 
            updated_at, 
            end_at,
            hiring_goal_id,
            hiring_goal_drafts!business_challenges_hiring_goal_id_fkey (
              role_title
            )
          `)
          .eq('business_id', user.id)
          .eq('status', 'active')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        const challenges: Challenge[] = (data || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          updated_at: c.updated_at,
          end_at: c.end_at,
          hiring_goal_id: c.hiring_goal_id,
          goal_title: c.hiring_goal_drafts?.role_title || t('business.goals.untitled')
        }));
        
        setAllActiveChallenges(challenges);
      } catch (err) {
        console.error('Error fetching all active challenges:', err);
        setAllActiveChallenges([]);
      } finally {
        setChallengeLoading(false);
      }
    };
    
    fetchAllActiveChallenges();
  }, [user?.id, t]);

  // Fetch goal-specific challenges (when in goal view)
  useEffect(() => {
    const fetchGoalChallenges = async () => {
      if (!goalId || !user?.id) {
        setGoalActiveChallenges([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('business_challenges')
          .select('id, title, updated_at, end_at, hiring_goal_id')
          .eq('business_id', user.id)
          .eq('hiring_goal_id', goalId)
          .eq('status', 'active')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setGoalActiveChallenges(data || []);
      } catch (err) {
        console.error('Error fetching goal challenges:', err);
        setGoalActiveChallenges([]);
      }
    };
    
    fetchGoalChallenges();
  }, [goalId, user?.id]);

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
        c.ximatar_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        const { data: shortlistedData } = await supabase
          .from('business_shortlists')
          .select('candidate_profile_id')
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId);

        const { data: invitationsData, error: invitationsErr } = await supabase
          .from('challenge_invitations')
          .select('candidate_profile_id, status')
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId);

        if (invitationsErr) {
          console.error('Error loading invitations:', invitationsErr);
        }

        const shortlistedIds = new Set(shortlistedData?.map(s => s.candidate_profile_id) || []);
        setShortlistedCount(shortlistedIds.size);

        const invStatusMap: Record<string, 'none' | 'invited' | 'accepted' | 'declined'> = {};
        if (!invitationsErr) {
          (invitationsData || []).forEach(inv => {
            invStatusMap[inv.candidate_profile_id] = inv.status as any;
          });
        }
        setInvitationStatuses(invStatusMap);

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
  }, [goalId, shortlist, user?.id]);

  // Load invitation statuses for global pool (track all invitations for each candidate)
  useEffect(() => {
    const loadGlobalInvitationStatuses = async () => {
      if (goalId || !user?.id || candidates.length === 0) return;
      
      const profileIds = candidates.map(c => c.profile_id);
      const { data, error } = await supabase
        .from('challenge_invitations')
        .select('candidate_profile_id, status')
        .eq('business_id', user.id)
        .in('candidate_profile_id', profileIds);
      
      if (error) {
        console.error('Error loading global invitation statuses:', error);
        return;
      }
      
      // For global pool, if ANY invitation exists for a candidate, mark as invited
      const statusMap: Record<string, 'invited' | 'accepted' | 'declined' | 'none'> = {};
      (data || []).forEach(inv => {
        // Priority: accepted > invited > declined > none
        const current = statusMap[inv.candidate_profile_id];
        if (inv.status === 'accepted') {
          statusMap[inv.candidate_profile_id] = 'accepted';
        } else if (inv.status === 'invited' && current !== 'accepted') {
          statusMap[inv.candidate_profile_id] = 'invited';
        } else if (!current) {
          statusMap[inv.candidate_profile_id] = inv.status as any;
        }
      });
      
      setInvitationStatuses(statusMap);
    };
    
    loadGlobalInvitationStatuses();
  }, [goalId, user?.id, candidates]);

  const loadCandidates = async () => {
    try {
      const { data: candidatesData, error } = await supabase.rpc('get_candidate_visibility');

      if (error) throw error;

      const candidatesWithShortlist: Candidate[] = (candidatesData || []).map((candidate: any) => ({
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
    if (!candidate || !goalId) return;

    try {
      if (candidate.isShortlisted) {
        await supabase
          .from('business_shortlists')
          .delete()
          .eq('business_id', user?.id)
          .eq('hiring_goal_id', goalId)
          .eq('candidate_profile_id', candidateId);
      } else {
        await supabase
          .from('business_shortlists')
          .insert({
            business_id: user?.id,
            hiring_goal_id: goalId,
            candidate_profile_id: candidateId
          });
      }

      const updatedCandidates = candidates.map(c => 
        c.user_id === candidateId 
          ? { ...c, isShortlisted: !c.isShortlisted }
          : c
      );
      setCandidates(updatedCandidates);
      
      const newCount = updatedCandidates.filter(c => c.isShortlisted).length;
      setShortlistedCount(newCount);
      
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

  const handleViewFilterChange = (value: string) => {
    setViewFilter(value as 'all' | 'shortlisted');
    setVisibleCount(PAGE_SIZE);
    if (value === 'shortlisted') {
      setFilteredCandidates(candidates.filter(c => c.isShortlisted));
    } else {
      setFilteredCandidates(candidates);
    }
  };

  const handleRegenerate = async () => {
    if (!goalId) return;
    setIsRegenerating(true);
    
    const newSeed = regenerateSeed + 1;
    setRegenerateSeed(newSeed);
    
    const savedIds = new Set(candidates.filter(c => c.isShortlisted).map(c => c.user_id));
    
    const seededShuffle = [...candidates].map((c, i) => ({
      ...c,
      sortKey: Math.sin(newSeed * 9999 + i) * 10000
    })).sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...c }) => c);
    
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

  const handleShowMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // Invite to challenge - works for both global pool and goal view
  const handleInviteToChallenge = async (candidateProfileId: string, challengeId: string, hiringGoalId: string) => {
    if (!user?.id) return;
    
    setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'loading' }));
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, name')
        .eq('id', candidateProfileId)
        .single();

      if (!profile) throw new Error('Candidate profile not found');

      const candidateName = profile.full_name || profile.name || 'Candidate';
      const candidateEmail = profile.email;

      const { data: invitation, error: invError } = await supabase
        .from('challenge_invitations')
        .insert({
          business_id: user.id,
          hiring_goal_id: hiringGoalId,
          candidate_profile_id: candidateProfileId,
          challenge_id: challengeId
        })
        .select('id, invite_token')
        .single();

      if (invError) {
        if (invError.code === '23505') {
          toast({
            title: t('business.shortlist.already_invited'),
            description: t('business.shortlist.already_invited_desc'),
            variant: 'default'
          });
          setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'invited' }));
          return { success: false, alreadyInvited: true };
        }
        throw invError;
      }

      // Get the candidate's user_id for notification
      const { data: candidateProfileData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', candidateProfileId)
        .single();

      // Create in-app notification for the candidate
      if (candidateProfileData?.user_id) {
        const notificationType = 'challenge_invitation';
        try {
          await supabase.from('notifications').insert({
            recipient_id: candidateProfileData.user_id,
            sender_id: user.id,
            type: notificationType,
            related_id: invitation.id,
            title: t('notifications.new_challenge_invitation'),
            message: t('notifications.challenge_invitation_message', { company: companyName || 'Company' })
          });
        } catch (notifErr) {
          console.warn('Notification insert failed:', notifErr);
        }
      }

      // Send email if available
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

      setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'invited' }));
      
      setCandidates(prev => prev.map(c => 
        c.profile_id === candidateProfileId ? { ...c, invitationStatus: 'invited' as const } : c
      ));
      setFilteredCandidates(prev => prev.map(c => 
        c.profile_id === candidateProfileId ? { ...c, invitationStatus: 'invited' as const } : c
      ));

      return { success: true };
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setInvitationStatuses(prev => ({ ...prev, [candidateProfileId]: 'none' }));
      return { success: false, error: err.message };
    }
  };

  // Handle single invite from card
  const handleSingleInvite = (candidateProfileId: string) => {
    // Use goal-specific challenges if in goal view, otherwise all active challenges
    const challengesToUse = goalId ? goalActiveChallenges : allActiveChallenges;
    
    if (challengesToUse.length === 0) return;
    
    if (challengesToUse.length === 1) {
      const challenge = challengesToUse[0];
      const goalIdToUse = goalId || challenge.hiring_goal_id!;
      handleInviteToChallenge(candidateProfileId, challenge.id, goalIdToUse).then(result => {
        if (result?.success) {
          toast({
            title: t('business.shortlist.invitation_sent'),
            description: t('business.shortlist.invitation_sent_desc', { name: 'Candidate' })
          });
        } else if (result?.error) {
          toast({
            title: t('common.error'),
            description: result.error,
            variant: 'destructive'
          });
        }
      });
    } else {
      // Multiple challenges - show picker
      setSelectedCandidates([candidateProfileId]);
      setShowChallengePickerModal(true);
    }
  };

  // Handle bulk invite click
  const handleBulkInviteClick = () => {
    const challengesToUse = goalId ? goalActiveChallenges : allActiveChallenges;
    if (selectedCandidates.length === 0 || challengesToUse.length === 0) return;
    
    if (challengesToUse.length === 1) {
      handleBulkInvite(challengesToUse[0].id, goalId || challengesToUse[0].hiring_goal_id!);
    } else {
      setShowChallengePickerModal(true);
    }
  };

  // Perform bulk invite to a specific challenge
  const handleBulkInvite = async (challengeId: string, hiringGoalId: string) => {
    if (selectedCandidates.length === 0) return;
    
    setBulkInviteLoading(true);
    setShowChallengePickerModal(false);
    
    let successCount = 0;
    let failCount = 0;
    let alreadyInvitedCount = 0;
    
    for (const profileId of selectedCandidates) {
      const result = await handleInviteToChallenge(profileId, challengeId, hiringGoalId);
      if (result?.success) {
        successCount++;
      } else if (result?.alreadyInvited) {
        alreadyInvitedCount++;
      } else {
        failCount++;
      }
    }
    
    setBulkInviteLoading(false);
    setSelectedCandidates([]);
    
    if (successCount > 0) {
      toast({
        title: t('business.invite.bulk_success'),
        description: t('business.invite.bulk_success_desc', { count: successCount })
      });
    }
    if (alreadyInvitedCount > 0) {
      toast({
        title: t('business.invite.already_invited_count'),
        description: t('business.invite.already_invited_count_desc', { count: alreadyInvitedCount }),
        variant: 'default'
      });
    }
    if (failCount > 0) {
      toast({
        title: t('common.error'),
        description: t('business.invite.bulk_fail_desc', { count: failCount }),
        variant: 'destructive'
      });
    }
  };

  // Get challenges to use based on view mode
  const activeChallenges = goalId ? goalActiveChallenges : allActiveChallenges;
  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCandidates.length;

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

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header - Different for goal-scoped vs global pool view */}
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

            {!challengeLoading && goalActiveChallenges.length === 0 && (
              <NoChallengeGate 
                onCreateChallenge={() => navigate(`/business/challenges/new?goal=${goalId}`)}
                onViewSaved={() => setViewFilter('shortlisted')}
              />
            )}

            {goalActiveChallenges.length > 0 && (
              <div className="flex items-center justify-between gap-4 text-sm bg-slate-900/60 border border-white/10 p-4 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-white/80">
                  <Target size={16} className="text-primary shrink-0" />
                  <span>
                    {t('business.invite.active_challenges_count', { count: goalActiveChallenges.length })}
                    {goalActiveChallenges.length === 1 && (
                      <span>: <strong className="text-white">{goalActiveChallenges[0].title}</strong></span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {goalActiveChallenges.length === 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/business/challenges/${goalActiveChallenges[0].id}/edit`)}
                      className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Pencil size={14} className="mr-1" />
                      {t('common.edit')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/business/challenges/select?goal=${goalId}`)}
                    className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Plus size={14} className="mr-1" />
                    {t('business_challenge.new_challenge')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/business/challenges')}
                    className="h-8 px-2 text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Settings size={14} className="mr-1" />
                    {t('business_challenge.manage_challenges')}
                  </Button>
                </div>
              </div>
            )}

            {viewFilter === 'all' && goalActiveChallenges.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/80 bg-slate-900/60 border border-white/10 p-3 rounded-lg">
                <Lightbulb size={16} className="text-amber-400 shrink-0" />
                {t('business.shortlist.select_hint')}
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
          // Global Candidate Pool Header
          <div className="space-y-4">
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
                    onClick={handleBulkInviteClick}
                    className="bg-primary hover:bg-primary/90"
                    disabled={allActiveChallenges.length === 0}
                  >
                    <Target className="mr-2" size={16} />
                    {t('business.candidates.invite_action')} ({selectedCandidates.length})
                  </Button>
                </div>
              )}
            </div>
            
            {/* No active challenges banner for global pool */}
            {!challengeLoading && allActiveChallenges.length === 0 && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-200">{t('business.invite.no_challenge_title')}</p>
                    <p className="text-xs text-amber-200/70">{t('business.invite.no_challenge_desc')}</p>
                  </div>
                  <Link to="/business/challenges">
                    <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-200 hover:bg-amber-500/20">
                      {t('business.invite.go_to_challenges')}
                      <ExternalLink size={12} className="ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            
            {/* Active challenges info for global pool */}
            {allActiveChallenges.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/80 bg-slate-900/60 border border-white/10 p-3 rounded-lg">
                <Target size={16} className="text-primary shrink-0" />
                <span>{t('business.invite.active_challenges_count', { count: allActiveChallenges.length })}</span>
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
                isSelected={selectedCandidates.includes(candidate.profile_id)}
                showSaveButton={!!goalId}
                showDebug={showDebug}
                invitationStatus={invitationStatuses[candidate.profile_id] || candidate.invitationStatus || 'none'}
                inviteDisabled={activeChallenges.length === 0}
                inviteDisabledReason={activeChallenges.length === 0 ? t('business.invite.activate_first') : undefined}
                onSelect={(checked) => {
                  if (checked) {
                    setSelectedCandidates([...selectedCandidates, candidate.profile_id]);
                  } else {
                    setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.profile_id));
                  }
                }}
                onToggleShortlist={() => handleToggleShortlist(candidate.user_id)}
                onInviteToChallenge={() => handleSingleInvite(candidate.profile_id)}
              />
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

        {/* Show More Button */}
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
              setGoalActiveChallenges(prev => [{ id: challengeId, title: challengeTitle, updated_at: new Date().toISOString() }, ...prev]);
            }}
          />
        )}

        {/* Challenge Picker Modal */}
        <ChallengePickerModal
          open={showChallengePickerModal}
          onOpenChange={setShowChallengePickerModal}
          challenges={activeChallenges}
          selectedCount={selectedCandidates.length}
          onConfirm={(challengeId, hiringGoalId) => {
            const challenge = activeChallenges.find(c => c.id === challengeId);
            const goalIdToUse = hiringGoalId || goalId || challenge?.hiring_goal_id;
            if (goalIdToUse) {
              handleBulkInvite(challengeId, goalIdToUse);
            }
          }}
          loading={bulkInviteLoading}
        />

        {/* Selection Action Bar - for goal view */}
        {goalId && (
          <SelectionActionBar
            selectedCount={selectedCandidates.length}
            activeChallengeCount={goalActiveChallenges.length}
            onInvite={handleBulkInviteClick}
            onClear={() => setSelectedCandidates([])}
            inviteDisabled={goalActiveChallenges.length === 0}
            inviteDisabledReason={goalActiveChallenges.length === 0 ? t('business_challenge.create_first_tooltip') : undefined}
          />
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessCandidates;
