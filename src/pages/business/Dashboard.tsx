import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, CheckCircle, TrendingUp, Plus, ArrowRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CandidateEngagement } from '@/components/business/CandidateEngagement';
import { CompanyProfileCard } from '@/components/business/CompanyProfileCard';

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUser();
  const { isBusiness, loading: businessLoading } = useBusinessRole();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    shortlisted: 0,
    activeChallenges: 0,
    completedChallenges: 0
  });
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/business/login');
      return;
    }

    if (businessLoading) return;

    if (!isBusiness) {
      toast({
        title: 'Access Denied',
        description: 'You do not have business access',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    loadDashboardStats();
    loadCompanyProfile();
    loadBusinessProfile();
  }, [isAuthenticated, isBusiness, businessLoading, navigate, toast]);

  const loadDashboardStats = async () => {
    try {
      // Get total available candidates (users who completed assessment)
      const { count: candidatesCount } = await supabase
        .from('assessment_results')
        .select('*', { count: 'exact', head: true });

      // Get shortlisted candidates
      const { count: shortlistedCount } = await supabase
        .from('candidate_shortlist')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user?.id);

      // Get active challenges
      const { count: activeChallengesCount } = await supabase
        .from('business_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', user?.id)
        .gte('deadline', new Date().toISOString());

      // Get business challenges first
      const { data: businessChallenges } = await supabase
        .from('business_challenges')
        .select('id')
        .eq('business_id', user?.id);

      const challengeIds = businessChallenges?.map(c => c.id) || [];

      // Get completed challenges count
      let completedCount = 0;
      if (challengeIds.length > 0) {
        const { count } = await supabase
          .from('candidate_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .in('challenge_id', challengeIds);
        completedCount = count || 0;
      }

      setStats({
        totalCandidates: candidatesCount || 0,
        shortlisted: shortlistedCount || 0,
        activeChallenges: activeChallengesCount || 0,
        completedChallenges: completedCount || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company profile:', error);
      } else {
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadBusinessProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading business profile:', error);
      } else {
        setBusinessProfile(data);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

  const handleGenerateProfile = async () => {
    if (!user?.id || !businessProfile) {
      toast({
        title: 'Error',
        description: 'Missing user or business profile information',
        variant: 'destructive'
      });
      return;
    }

    setProfileLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-profile', {
        body: {
          company_id: user.id,
          company_name: businessProfile.company_name,
          website: businessProfile.website
        }
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Company profile generated successfully'
      });

      // Reload the profile
      await loadCompanyProfile();
    } catch (error: any) {
      console.error('Error generating profile:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate company profile',
        variant: 'destructive'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3A9FFF] mx-auto mb-4"></div>
            <p className="text-[#A3ABB5]">Loading dashboard...</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  const statCards = [
    {
      title: 'Available Candidates',
      value: stats.totalCandidates,
      icon: <Users size={24} />,
      color: 'text-[#3A9FFF]',
      bgColor: 'bg-[#3A9FFF]/10',
      link: '/business/candidates'
    },
    {
      title: 'Shortlisted',
      value: stats.shortlisted,
      icon: <CheckCircle size={24} />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/business/candidates'
    },
    {
      title: 'Active Challenges',
      value: stats.activeChallenges,
      icon: <Target size={24} />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      link: '/business/challenges'
    },
    {
      title: 'Completed',
      value: stats.completedChallenges,
      icon: <TrendingUp size={24} />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      link: '/business/evaluations'
    }
  ];

  return (
    <BusinessLayout>
      <div className="space-y-8">
         {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-[#A3ABB5]">
            Manage your talent pipeline and launch new challenges
          </p>
        </div>

        {/* Company Profile Section */}
        <CompanyProfileCard
          profile={companyProfile}
          loading={profileLoading}
          onGenerate={handleGenerateProfile}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40 transition-all hover:scale-105"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <div className={stat.color}>{stat.icon}</div>
                  </div>
                  <Link to={stat.link}>
                    <Button variant="ghost" size="icon" className="hover:bg-[#3A9FFF]/10">
                      <ArrowRight size={18} className="text-[#A3ABB5]" />
                    </Button>
                  </Link>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-sm text-[#A3ABB5]">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardHeader>
              <CardTitle className="text-white">Find Top Talent</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                Browse through our pool of assessed candidates and find the perfect match for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/business/candidates">
                <Button className="w-full bg-[#3A9FFF] hover:bg-[#3A9FFF]/90">
                  <Users size={18} className="mr-2" />
                  Browse Candidates
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardHeader>
              <CardTitle className="text-white">Launch New Challenge</CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                Create custom challenges to evaluate candidates' skills and problem-solving abilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/business/challenges/new">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-[#3A9FFF] hover:opacity-90">
                  <Plus size={18} className="mr-2" />
                  Create Challenge
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
          <CardHeader>
            <CardTitle className="text-white">Getting Started</CardTitle>
            <CardDescription className="text-[#A3ABB5]">
              Complete these steps to maximize your hiring success
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#3A9FFF]/10 border border-[#3A9FFF]/20">
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-white">Account created successfully</span>
            </div>
            <Link to="/business/candidates">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#3A9FFF]/10 border border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40 transition-all cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-[#A3ABB5]" />
                <span className="text-[#A3ABB5]">Browse and shortlist candidates</span>
              </div>
            </Link>
            <Link to="/business/challenges/new">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#3A9FFF]/10 border border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40 transition-all cursor-pointer">
                <div className="w-5 h-5 rounded-full border-2 border-[#A3ABB5]" />
                <span className="text-[#A3ABB5]">Create your first challenge</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Candidate Engagement */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Candidate Engagement</h2>
          <CandidateEngagement />
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;
