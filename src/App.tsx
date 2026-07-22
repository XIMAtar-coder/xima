import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { useState, useEffect, lazy, Suspense } from "react";
import './i18n'; // Initialize i18n
import { XimAIProvider } from "./context/XimAIProvider";
import { AssessmentProvider } from "./contexts/AssessmentContext";
import RouteSkeleton from "./components/ui/RouteSkeleton";
import ChunkErrorBoundary from "./components/ui/ChunkErrorBoundary";
import { ChatEntry } from "./components/ximai/ChatEntry";
import { useUser } from "./context/UserContext";

// ---- Public / marketing ----
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Business = lazy(() => import("./pages/Business"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ContactSales = lazy(() => import("./pages/ContactSales"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Imprint = lazy(() => import("./pages/legal/Imprint"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

// ---- Candidate ----
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const XimatarJourney = lazy(() => import("./pages/XimatarJourney"));
const XimaChat = lazy(() => import("./pages/XimaChat"));
const Messages = lazy(() => import("./pages/Messages"));
const DevelopmentPlan = lazy(() => import("./pages/DevelopmentPlan"));
const OpportunityDetails = lazy(() => import("./pages/OpportunityDetails"));
const AssessmentGuide = lazy(() => import("./pages/AssessmentGuide"));
const ChallengeAccept = lazy(() => import("./pages/ChallengeAccept"));
const CandidateSettings = lazy(() => import("./pages/Settings"));
const CandidateSessionDetail = lazy(() => import("./pages/candidate/SessionDetail"));
const CandidateSessionRoom = lazy(() => import("./pages/candidate/SessionRoom"));
const ChallengeCompletion = lazy(() => import("./pages/candidate/ChallengeCompletion"));
const ChallengeFollowup = lazy(() => import("./pages/candidate/ChallengeFollowup"));
const StandingVideoSession = lazy(() => import("./pages/candidate/StandingVideoSession"));
const MyOffers = lazy(() => import("./pages/candidate/MyOffers"));
const JobsBrowse = lazy(() => import("./pages/JobsBrowse"));

// ---- Tests ----
const TestDataAnalysis = lazy(() => import("./pages/TestDataAnalysis"));
const TestLogicalProblemSolving = lazy(() => import("./pages/TestLogicalProblemSolving"));
const TestPresentationSkills = lazy(() => import("./pages/TestPresentationSkills"));
const TestCreativeThinking = lazy(() => import("./pages/TestCreativeThinking"));

// ---- Business ----
const BusinessRegister = lazy(() => import("./pages/business/Register"));
const BusinessLogin = lazy(() => import("./pages/business/Login"));
const BusinessDashboard = lazy(() => import("./pages/business/Dashboard"));
const BusinessCandidates = lazy(() => import("./pages/business/Candidates"));
const CreateChallenge = lazy(() => import("./pages/business/CreateChallenge"));
const CreateXimaCoreChallenge = lazy(() => import("./pages/business/CreateXimaCoreChallenge"));
const ChallengeTypeSelector = lazy(() => import("./pages/business/ChallengeTypeSelector"));
const BusinessChallenges = lazy(() => import("./pages/business/Challenges"));
const BusinessEvaluations = lazy(() => import("./pages/business/Evaluations"));
const BusinessHiringGoals = lazy(() => import("./pages/business/HiringGoals"));
const BusinessSettings = lazy(() => import("./pages/business/Settings"));
const BusinessJobs = lazy(() => import("./pages/business/Jobs"));
const CreateJobOffer = lazy(() => import("./pages/business/CreateJobOffer"));
const JobCandidateMatching = lazy(() => import("./pages/business/JobCandidateMatching"));
const GoalCandidates = lazy(() => import("./pages/business/GoalCandidates"));
const GoalChallenges = lazy(() => import("./pages/business/GoalChallenges"));
const GoalSettings = lazy(() => import("./pages/business/GoalSettings"));
const GoalDecisionPack = lazy(() => import("./pages/business/GoalDecisionPack"));
const ChallengeResponses = lazy(() => import("./pages/business/ChallengeResponses"));
const GoalShortlistPage = lazy(() => import("./pages/business/GoalShortlistPage"));
const BusinessPipelineChat = lazy(() => import("./pages/business/PipelineChat"));
const HiringGoalCreate = lazy(() => import("./pages/business/HiringGoalCreate"));
const JobImportWizard = lazy(() => import("./pages/business/JobImportWizard"));

// ---- Mentor ----
const MentorPortal = lazy(() => import("./pages/mentor/MentorPortal"));
const MentorLogin = lazy(() => import("./pages/mentor/MentorLogin"));
const MentorProfileEdit = lazy(() => import("./pages/mentor/MentorProfileEdit"));
const MentorSessions = lazy(() => import("./pages/mentor/MentorSessions"));
const MentorCalendar = lazy(() => import("./pages/mentor/MentorCalendar"));
const MentorSessionDetail = lazy(() => import("./pages/mentor/MentorSessionDetail"));
const MentorPreview = lazy(() => import("./pages/mentor/MentorPreview"));

// ---- Admin ----
const Admin = lazy(() => import("./pages/Admin"));
const EligibilityReview = lazy(() => import("./pages/admin/EligibilityReview"));

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
      <Suspense key={location.pathname} fallback={<RouteSkeleton />}>
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
      </Suspense>
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
