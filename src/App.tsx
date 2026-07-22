import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { useState, useEffect } from "react";
import './i18n'; // Initialize i18n
import { XimAIProvider } from "./context/XimAIProvider";
import { AssessmentProvider } from "./contexts/AssessmentContext";
import ChunkErrorBoundary from "./components/ui/ChunkErrorBoundary";
import { ChatEntry } from "./components/ximai/ChatEntry";
import { useUser } from "./context/UserContext";

// ---- Public / marketing ----
import Index from "./pages/Index";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Business from "./pages/Business";
import Pricing from "./pages/Pricing";
import ContactSales from "./pages/ContactSales";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import Imprint from "./pages/legal/Imprint";
import OAuthConsent from "./pages/OAuthConsent";

// ---- Candidate ----
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import XimatarJourney from "./pages/XimatarJourney";
import XimaChat from "./pages/XimaChat";
import Messages from "./pages/Messages";
import DevelopmentPlan from "./pages/DevelopmentPlan";
import OpportunityDetails from "./pages/OpportunityDetails";
import AssessmentGuide from "./pages/AssessmentGuide";
import ChallengeAccept from "./pages/ChallengeAccept";
import CandidateSettings from "./pages/Settings";
import CandidateSessionDetail from "./pages/candidate/SessionDetail";
import CandidateSessionRoom from "./pages/candidate/SessionRoom";
import ChallengeCompletion from "./pages/candidate/ChallengeCompletion";
import ChallengeFollowup from "./pages/candidate/ChallengeFollowup";
import StandingVideoSession from "./pages/candidate/StandingVideoSession";
import MyOffers from "./pages/candidate/MyOffers";
import JobsBrowse from "./pages/JobsBrowse";

// ---- Tests ----
import TestDataAnalysis from "./pages/TestDataAnalysis";
import TestLogicalProblemSolving from "./pages/TestLogicalProblemSolving";
import TestPresentationSkills from "./pages/TestPresentationSkills";
import TestCreativeThinking from "./pages/TestCreativeThinking";

// ---- Business ----
import BusinessRegister from "./pages/business/Register";
import BusinessLogin from "./pages/business/Login";
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessCandidates from "./pages/business/Candidates";
import CreateChallenge from "./pages/business/CreateChallenge";
import CreateXimaCoreChallenge from "./pages/business/CreateXimaCoreChallenge";
import ChallengeTypeSelector from "./pages/business/ChallengeTypeSelector";
import BusinessChallenges from "./pages/business/Challenges";
import BusinessEvaluations from "./pages/business/Evaluations";
import BusinessHiringGoals from "./pages/business/HiringGoals";
import BusinessSettings from "./pages/business/Settings";
import BusinessJobs from "./pages/business/Jobs";
import CreateJobOffer from "./pages/business/CreateJobOffer";
import JobCandidateMatching from "./pages/business/JobCandidateMatching";
import GoalCandidates from "./pages/business/GoalCandidates";
import GoalChallenges from "./pages/business/GoalChallenges";
import GoalSettings from "./pages/business/GoalSettings";
import GoalDecisionPack from "./pages/business/GoalDecisionPack";
import ChallengeResponses from "./pages/business/ChallengeResponses";
import GoalShortlistPage from "./pages/business/GoalShortlistPage";
import BusinessPipelineChat from "./pages/business/PipelineChat";
import HiringGoalCreate from "./pages/business/HiringGoalCreate";
import JobImportWizard from "./pages/business/JobImportWizard";

// ---- Mentor ----
import MentorPortal from "./pages/mentor/MentorPortal";
import MentorLogin from "./pages/mentor/MentorLogin";
import MentorProfileEdit from "./pages/mentor/MentorProfileEdit";
import MentorSessions from "./pages/mentor/MentorSessions";
import MentorCalendar from "./pages/mentor/MentorCalendar";
import MentorSessionDetail from "./pages/mentor/MentorSessionDetail";
import MentorPreview from "./pages/mentor/MentorPreview";

// ---- Admin ----
import Admin from "./pages/Admin";
import EligibilityReview from "./pages/admin/EligibilityReview";

const queryClient = new QueryClient();

const LegacyGoalsRedirect = () => {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/business\/goals/, '');
  return <Navigate to={`/business/hiring-goals${rest}${location.search}${location.hash}`} replace />;
};

// Public/marketing/auth routes where XIM-AI must NEVER appear (even if a session exists).
const HIDDEN_AI_ROUTES = new Set([
  '/', '/about', '/how-it-works', '/business', '/pricing', '/contact-sales',
  '/login', '/register', '/verify-email', '/unsubscribe',
  '/privacy', '/terms', '/imprint',
  '/business/login', '/business/register',
  '/mentor/login',
  '/challenge/accept',
  '/.lovable/oauth/consent',
]);

const XimAILauncher = () => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useUser();
  // Gated: only authenticated users, never on public/auth routes, never under /auth/*.
  if (!isAuthenticated) return null;
  if (pathname.startsWith('/auth/')) return null;
  if (HIDDEN_AI_ROUTES.has(pathname)) return null;
  return <ChatEntry />;
};

/**
 * RoutesTree reads `useLocation()` itself and passes it explicitly to <Routes>.
 * This guarantees Routes reconciles against the current URL on every navigation
 * (defensive against cases where a concurrent transition + lazy chunk would
 * otherwise keep the previous route's UI on screen — observed on mobile).
 * The Suspense fallback is keyed by pathname so a hanging lazy chunk shows the
 * skeleton for the new route instead of the stale previous page.
 */
const RoutesTree = () => {
  const location = useLocation();
  console.log('[nav] render location =', location.pathname);
  useEffect(() => {
    console.log('[nav] committed location =', location.pathname);
  }, [location.pathname]);
  return (
    <ChunkErrorBoundary>
      <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact-sales" element={<ContactSales />} />
          <Route path="/business" element={<Business />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
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
          <Route path="/messages" element={<Messages />} />
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
          <Route path="/business/reports" element={<Navigate to="/business/evaluations" replace />} />
          <Route path="/business/settings" element={<BusinessSettings />} />
          <Route path="/business/jobs" element={<BusinessJobs />} />
          <Route path="/business/jobs/new" element={<CreateJobOffer />} />
          <Route path="/business/jobs/import" element={<JobImportWizard />} />
          <Route path="/business/jobs/:jobId/matches" element={<JobCandidateMatching />} />
          {/* Goal-scoped routes */}
          <Route path="/business/hiring-goals/:goalId/shortlist" element={<GoalShortlistPage />} />
          <Route path="/business/hiring-goals/:goalId/candidates" element={<GoalCandidates />} />
          <Route path="/business/hiring-goals/:goalId/challenges" element={<GoalChallenges />} />
          <Route path="/business/hiring-goals/:goalId/settings" element={<GoalSettings />} />
          <Route path="/business/hiring-goals/:goalId/decision-pack" element={<GoalDecisionPack />} />
          <Route path="/business/hiring-goals/:goalId/challenges/:challengeId/responses" element={<ChallengeResponses />} />
          <Route path="/business/hiring-goals" element={<BusinessHiringGoals />} />
          <Route path="/business/hiring-goals/new" element={<HiringGoalCreate />} />
          <Route path="/business/hiring-goals/:goalId/edit" element={<HiringGoalCreate />} />
          {/* Legacy redirects: /business/goals/* → /business/hiring-goals/* */}
          <Route path="/business/goals/*" element={<LegacyGoalsRedirect />} />
          <Route path="/business/messages" element={<BusinessPipelineChat />} />
          <Route path="/analytics" element={<Navigate to="/admin?tab=overview" replace />} />
          <Route path="/challenge/accept" element={<ChallengeAccept />} />
          {/* Candidate challenge completion */}
          <Route path="/candidate/challenges/:invitationId" element={<ChallengeCompletion />} />
          <Route path="/candidate/challenges/:invitationId/standing" element={<StandingVideoSession />} />
          <Route path="/candidate/followups/:invitationId" element={<ChallengeFollowup />} />
          {/* Candidate session detail */}
          <Route path="/sessions/:sessionId" element={<CandidateSessionDetail />} />
          <Route path="/sessions/:sessionId/room" element={<CandidateSessionRoom />} />
          <Route path="/jobs" element={<JobsBrowse />} />
          <Route path="/my-offers" element={<MyOffers />} />
          <Route path="/offers" element={<MyOffers />} />
          <Route path="*" element={<NotFound />} />
      </Routes>
    </ChunkErrorBoundary>
  );
};

const AppContent = () => {
  return (
    <XimAIProvider>
      <RoutesTree />
      <XimAILauncher />
    </XimAIProvider>
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
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="xima-theme" enableSystem={false}>
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
