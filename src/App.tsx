
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { useState, useEffect } from "react";
import './i18n'; // Initialize i18n
import Index from "./pages/Index";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Business from "./pages/Business";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import XimatarJourney from "./pages/XimatarJourney";
import XimaChat from "./pages/XimaChat";
import DevelopmentPlan from "./pages/DevelopmentPlan";
import TestDataAnalysis from "./pages/TestDataAnalysis";
import TestLogicalProblemSolving from "./pages/TestLogicalProblemSolving";
import TestPresentationSkills from "./pages/TestPresentationSkills";
import TestCreativeThinking from "./pages/TestCreativeThinking";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { XimAIProvider } from "./context/XimAIProvider";
import OpportunityDetails from "./pages/OpportunityDetails";

import { AssessmentProvider } from "./contexts/AssessmentContext";
// Legal pages
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import Imprint from "./pages/legal/Imprint";
// Business Portal
import BusinessRegister from "./pages/business/Register";
import BusinessLogin from "./pages/business/Login";
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessCandidates from "./pages/business/Candidates";
import CreateChallenge from "./pages/business/CreateChallenge";
import CreateXimaCoreChallenge from "./pages/business/CreateXimaCoreChallenge";
import ChallengeTypeSelector from "./pages/business/ChallengeTypeSelector";
import BusinessChallenges from "./pages/business/Challenges";
import BusinessEvaluations from "./pages/business/Evaluations";
import BusinessReports from "./pages/business/Reports";
import BusinessSettings from "./pages/business/Settings";
import BusinessJobs from "./pages/business/Jobs";
import CreateJobOffer from "./pages/business/CreateJobOffer";
import JobCandidateMatching from "./pages/business/JobCandidateMatching";
import Analytics from "./pages/Analytics";
import AssessmentGuide from "./pages/AssessmentGuide";
import ChallengeAccept from "./pages/ChallengeAccept";
import GoalCandidates from "./pages/business/GoalCandidates";
import GoalChallenges from "./pages/business/GoalChallenges";
import GoalSettings from "./pages/business/GoalSettings";
import GoalDecisionPack from "./pages/business/GoalDecisionPack";
import ChallengeResponses from "./pages/business/ChallengeResponses";
import ChallengeCompletion from "./pages/candidate/ChallengeCompletion";
import ChallengeFollowup from "./pages/candidate/ChallengeFollowup";
import StandingVideoSession from "./pages/candidate/StandingVideoSession";
import EligibilityReview from "./pages/admin/EligibilityReview";
import AuthCallback from "./pages/AuthCallback";
import CandidateSettings from "./pages/Settings";
import CandidateSessionDetail from "./pages/candidate/SessionDetail";
import CandidateSessionRoom from "./pages/candidate/SessionRoom";
// Verification
import VerifyEmail from "./pages/auth/VerifyEmail";
import { VerificationGate } from "./components/auth/VerificationGate";
// Mentor Portal
import MentorPortal from "./pages/mentor/MentorPortal";
import MentorLogin from "./pages/mentor/MentorLogin";
import MentorProfileEdit from "./pages/mentor/MentorProfileEdit";
import MentorSessions from "./pages/mentor/MentorSessions";
import MentorCalendar from "./pages/mentor/MentorCalendar";
import MentorSessionDetail from "./pages/mentor/MentorSessionDetail";
import MentorPreview from "./pages/mentor/MentorPreview";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loading on route change
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <XimAIProvider>
        <VerificationGate>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/business" element={<Business />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* Legal Pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/imprint" element={<Imprint />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ximatar-journey" element={<XimatarJourney />} />
            <Route path="/xima-chat" element={<XimaChat />} />
            <Route path="/development-plan" element={<DevelopmentPlan />} />
            <Route path="/test/data-analysis" element={<TestDataAnalysis />} />
            <Route path="/test/logical-problem-solving" element={<TestLogicalProblemSolving />} />
            <Route path="/test/presentation-skills" element={<TestPresentationSkills />} />
            <Route path="/test/creative-thinking" element={<TestCreativeThinking />} />
            <Route path="/opportunity/:id" element={<OpportunityDetails />} />
            
            <Route path="/assessment-guide" element={<AssessmentGuide />} />
            <Route path="/dashboard" element={<Profile />} />
            <Route path="/chat" element={<XimaChat />} />
            <Route path="/settings" element={<CandidateSettings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/eligibility" element={<EligibilityReview />} />
            {/* Mentor Portal Routes */}
            <Route path="/mentor" element={<MentorPortal />} />
            <Route path="/mentor/login" element={<MentorLogin />} />
            <Route path="/mentor/profile" element={<MentorProfileEdit />} />
            <Route path="/mentor/preview" element={<MentorPreview />} />
            <Route path="/mentor/sessions" element={<MentorSessions />} />
            <Route path="/mentor/calendar" element={<MentorCalendar />} />
            <Route path="/mentor/calendar/:sessionId" element={<MentorSessionDetail />} />
            {/* Business Portal Routes */}
            <Route path="/business/register" element={<BusinessRegister />} />
            <Route path="/business/login" element={<BusinessLogin />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/business/candidates" element={<BusinessCandidates />} />
            <Route path="/business/challenges" element={<BusinessChallenges />} />
            <Route path="/business/challenges/select" element={<ChallengeTypeSelector />} />
            <Route path="/business/challenges/new" element={<CreateChallenge />} />
            <Route path="/business/challenges/xima-core" element={<CreateXimaCoreChallenge />} />
            <Route path="/business/challenges/:id/edit" element={<CreateChallenge />} />
            <Route path="/business/evaluations" element={<BusinessEvaluations />} />
            <Route path="/business/reports" element={<BusinessReports />} />
            <Route path="/business/settings" element={<BusinessSettings />} />
            <Route path="/business/jobs" element={<BusinessJobs />} />
            <Route path="/business/jobs/new" element={<CreateJobOffer />} />
            <Route path="/business/jobs/:jobId/matches" element={<JobCandidateMatching />} />
            {/* Goal-scoped routes */}
            <Route path="/business/goals/:goalId/candidates" element={<GoalCandidates />} />
            <Route path="/business/goals/:goalId/challenges" element={<GoalChallenges />} />
            <Route path="/business/goals/:goalId/settings" element={<GoalSettings />} />
            <Route path="/business/goals/:goalId/decision-pack" element={<GoalDecisionPack />} />
            <Route path="/business/goals/:goalId/challenges/:challengeId/responses" element={<ChallengeResponses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/challenge/accept" element={<ChallengeAccept />} />
            {/* Candidate challenge completion */}
            <Route path="/candidate/challenges/:invitationId" element={<ChallengeCompletion />} />
            <Route path="/candidate/challenges/:invitationId/standing" element={<StandingVideoSession />} />
            <Route path="/candidate/followups/:invitationId" element={<ChallengeFollowup />} />
            {/* Candidate session detail */}
            <Route path="/sessions/:sessionId" element={<CandidateSessionDetail />} />
            <Route path="/sessions/:sessionId/room" element={<CandidateSessionRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </VerificationGate>
        {/* <ChatEntry /> */}
      </XimAIProvider>
    </>
  );
};

const App = () => {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Initial app load
    const timer = setTimeout(() => setInitialLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserProvider>
          <AssessmentProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <LoadingScreen isLoading={initialLoading} />
              {!initialLoading && (
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              )}
            </TooltipProvider>
          </AssessmentProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
