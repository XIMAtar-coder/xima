import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useProfileData } from '@/hooks/useProfileData';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Loader2 } from 'lucide-react';

/**
 * Checks if candidate readiness flags are set in localStorage.
 * These are set during the pre-auth flow (assessment + mentor selection).
 */
export function hasLocalReadiness(): boolean {
  const assessmentDone = localStorage.getItem('xima.assessment_completed') === 'true';
  const mentorSelected = !!localStorage.getItem('selected_professional_data');
  return assessmentDone && mentorSelected;
}

/**
 * Route guard for candidate-protected routes (/profile, /settings, /feed, /sessions/*).
 * Requires:
 *   1. Authenticated session
 *   2. Assessment completed (DB or localStorage)
 *   3. Mentor selected (DB or localStorage)
 *
 * Redirects to /ximatar-journey if any condition fails.
 */
export const CandidateRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, session } = useUser();
  const location = useLocation();
  const profileData = useProfileData(0);

  // If session is null and we haven't resolved yet, show loading briefly
  // (session === null could mean "not yet loaded" or "not logged in")
  // We use a simple heuristic: if profileData is still loading, wait
  if (profileData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // Not logged in → send to assessment start
  if (!isAuthenticated) {
    console.info('[CandidateRouteGuard] Not authenticated → redirect /ximatar-journey');
    return <Navigate to="/ximatar-journey" state={{ from: location }} replace />;
  }

  // Check DB-level readiness (assessment exists + mentor exists)
  const hasAssessment = profileData.hasAssessment;
  const hasMentor = !!profileData.mentor_profile;

  // Also accept localStorage as fallback (mentor might be pending assignment)
  const localReady = hasLocalReadiness();

  console.info('[CandidateRouteGuard] Check:', { hasAssessment, hasMentor, localReady, path: location.pathname });

  if (!hasAssessment && !localReady) {
    console.info('[CandidateRouteGuard] No assessment (DB or local) → redirect /ximatar-journey');
    return <Navigate to="/ximatar-journey" replace />;
  }

  // If assessment exists in DB but no mentor yet, also allow if localStorage has pending mentor
  if (hasAssessment && !hasMentor && !localStorage.getItem('selected_professional_data')) {
    console.info('[CandidateRouteGuard] Assessment OK but no mentor → redirect /ximatar-journey');
    return <Navigate to="/ximatar-journey" replace />;
  }

  return <>{children}</>;
};
