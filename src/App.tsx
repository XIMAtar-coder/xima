
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
import ChatEntry from "./components/ximai/ChatEntry";
import OpportunityDetails from "./pages/OpportunityDetails";
import Risultati from "./pages/Risultati";
import { AssessmentProvider } from "./contexts/AssessmentContext";
// Business Portal
import BusinessRegister from "./pages/business/Register";
import BusinessLogin from "./pages/business/Login";
import BusinessDashboard from "./pages/business/Dashboard";
import BusinessCandidates from "./pages/business/Candidates";
import CreateChallenge from "./pages/business/CreateChallenge";
import BusinessEvaluations from "./pages/business/Evaluations";
import BusinessReports from "./pages/business/Reports";
import BusinessSettings from "./pages/business/Settings";
import BusinessJobs from "./pages/business/Jobs";
import Analytics from "./pages/Analytics";

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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ximatar-journey" element={<XimatarJourney />} />
          <Route path="/xima-chat" element={<XimaChat />} />
          <Route path="/development-plan" element={<DevelopmentPlan />} />
          <Route path="/test/data-analysis" element={<TestDataAnalysis />} />
          <Route path="/test/logical-problem-solving" element={<TestLogicalProblemSolving />} />
          <Route path="/test/presentation-skills" element={<TestPresentationSkills />} />
          <Route path="/test/creative-thinking" element={<TestCreativeThinking />} />
          <Route path="/opportunity/:id" element={<OpportunityDetails />} />
          <Route path="/risultati" element={<Risultati />} />
          <Route path="/dashboard" element={<Profile />} />
          <Route path="/chat" element={<XimaChat />} />
          <Route path="/admin" element={<Admin />} />
          {/* Business Portal Routes */}
          <Route path="/business/register" element={<BusinessRegister />} />
          <Route path="/business/login" element={<BusinessLogin />} />
          <Route path="/business/dashboard" element={<BusinessDashboard />} />
          <Route path="/business/candidates" element={<BusinessCandidates />} />
          <Route path="/business/challenges" element={<BusinessDashboard />} />
          <Route path="/business/challenges/new" element={<CreateChallenge />} />
          <Route path="/business/evaluations" element={<BusinessEvaluations />} />
          <Route path="/business/reports" element={<BusinessReports />} />
          <Route path="/business/settings" element={<BusinessSettings />} />
          <Route path="/business/jobs" element={<BusinessJobs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
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
