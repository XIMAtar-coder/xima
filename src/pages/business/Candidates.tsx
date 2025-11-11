import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Search, Filter, Star, Mail, Target, MapPin } from 'lucide-react';

interface Candidate {
  id: string;
  user_id: string;
  name: string;
  email: string;
  ximatar: string;
  pillars: any;
  match_score?: number;
  isShortlisted?: boolean;
}

const BusinessCandidates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

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
    if (searchTerm) {
      const filtered = candidates.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ximatar?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCandidates(filtered);
    } else {
      setFilteredCandidates(candidates);
    }
  }, [searchTerm, candidates]);

  const loadCandidates = async () => {
    try {
      // Get all users who have completed assessments
      const { data: assessmentResults } = await supabase
        .from('assessment_results')
        .select(`
          user_id,
          ximatars(label),
          total_score
        `)
        .not('ximatar_id', 'is', null);

      // Get profiles for these users
      const userIds = assessmentResults?.map(ar => ar.user_id) || [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      // Get shortlisted candidates
      const { data: shortlisted } = await supabase
        .from('candidate_shortlist')
        .select('candidate_id')
        .eq('business_id', user?.id);

      const shortlistedIds = new Set(shortlisted?.map(s => s.candidate_id) || []);

      // Combine data
      const candidateData: Candidate[] = profiles?.map(profile => {
        const assessment = assessmentResults?.find(ar => ar.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          name: profile.name || profile.full_name || 'Anonymous',
          email: profile.email || '',
          ximatar: (assessment?.ximatars as any)?.label || 'Unknown',
          pillars: profile.pillars,
          match_score: Math.floor(Math.random() * 30 + 70), // Simulated for now
          isShortlisted: shortlistedIds.has(profile.user_id)
        };
      }) || [];

      setCandidates(candidateData);
      setFilteredCandidates(candidateData);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load candidates',
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
        title: candidate.isShortlisted ? 'Removed from shortlist' : 'Added to shortlist',
        description: `${candidate.name} has been ${candidate.isShortlisted ? 'removed from' : 'added to'} your shortlist`
      });
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shortlist',
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) {
      toast({
        title: 'No candidates selected',
        description: 'Please select candidates first',
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
          title: 'Success',
          description: `${selectedCandidates.length} candidates added to shortlist`
        });
      } else if (action === 'challenge') {
        navigate('/business/challenges/new', { state: { selectedCandidates } });
      }

      setSelectedCandidates([]);
      loadCandidates();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive'
      });
    }
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3A9FFF]"></div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Candidate Pool</h1>
            <p className="text-[#A3ABB5]">
              {filteredCandidates.length} assessed candidates available
            </p>
          </div>
          {selectedCandidates.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkAction('shortlist')}
                variant="outline"
                className="border-[#3A9FFF]/30"
              >
                <Star className="mr-2" size={16} />
                Shortlist ({selectedCandidates.length})
              </Button>
              <Button
                onClick={() => handleBulkAction('challenge')}
                className="bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
              >
                <Target className="mr-2" size={16} />
                Invite to Challenge
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-[#A3ABB5]" size={18} />
                <Input
                  placeholder="Search by name, email, or XIMAtar..."
                  className="pl-10 bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="border-[#3A9FFF]/30">
                <Filter className="mr-2" size={16} />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Checkbox
                    checked={selectedCandidates.includes(candidate.user_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCandidates([...selectedCandidates, candidate.user_id]);
                      } else {
                        setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.user_id));
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleShortlist(candidate.user_id)}
                    className={candidate.isShortlisted ? 'text-yellow-500' : 'text-[#A3ABB5]'}
                  >
                    <Star size={20} fill={candidate.isShortlisted ? 'currentColor' : 'none'} />
                  </Button>
                </div>

                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#3A9FFF]/20 border-2 border-[#3A9FFF] flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-[#3A9FFF]">
                      {candidate.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{candidate.name}</h3>
                  <p className="text-sm text-[#A3ABB5] flex items-center justify-center gap-1">
                    <Mail size={14} />
                    {candidate.email}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A3ABB5]">XIMAtar</span>
                    <Badge className="bg-[#3A9FFF]/20 text-[#3A9FFF] capitalize">
                      {candidate.ximatar}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#A3ABB5]">Match Score</span>
                    <span className="text-sm font-bold text-white">{candidate.match_score}%</span>
                  </div>

                  <div className="w-full bg-[#0A0F1C] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#3A9FFF] to-purple-500 h-2 rounded-full"
                      style={{ width: `${candidate.match_score}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#3A9FFF]/20">
                  <Button
                    variant="outline"
                    className="w-full border-[#3A9FFF]/30 text-white hover:bg-[#3A9FFF]/10"
                    onClick={() => navigate(`/business/candidates/${candidate.user_id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardContent className="p-12 text-center">
              <p className="text-[#A3ABB5] text-lg">No candidates found matching your criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </BusinessLayout>
  );
};

export default BusinessCandidates;
