
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
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
import { ChatWidget } from "./components/ximai/ChatWidget";
import OpportunityDetails from "./pages/OpportunityDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="/dashboard" element={<Profile />} />
              <Route path="/chat" element={<XimaChat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatWidget />
          </XimAIProvider>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
