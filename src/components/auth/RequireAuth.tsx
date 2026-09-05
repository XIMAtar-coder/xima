import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useBusinessRole } from '@/hooks/useBusinessRole';
import { useMentorProfile } from '@/hooks/useMentorProfile';
import { Loader2 } from 'lucide-react';

type Role = 'candidate' | 'business' | 'mentor' | 'admin';

const LOGIN_FOR: Record<Role, string> = {
  candidate: '/login',
  business: '/business/login',
  mentor: '/mentor/login',
  admin: '/login',
};

const Waiting = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

/**
 * Route-level guard. Until 2026-08-28 there was none: 77 routes each relied on
 * whatever check the page happened to do, so /profile rendered raw i18n keys to
 * anonymous visitors and /mentor rendered a blank screen.
 *
 * It also waits for the persisted session to load. Page-local checks that read
 * isAuthenticated synchronously bounced a signed-in user to /login on refresh —
 * unnoticed while every load signed everyone out anyway.
 */
export const RequireAuth: React.FC<React.PropsWithChildren<{ role?: Role }>> = ({ role = 'candidate', children }) => {
  const { isAuthenticated, isAuthLoading } = useUser();
  const location = useLocation();

  if (isAuthLoading) return <Waiting />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${LOGIN_FOR[role]}?next=${next}`} replace />;
  }
  if (role === 'candidate') return <>{children}</>;
  return <RoleGate role={role}>{children}</RoleGate>;
};

const RoleGate: React.FC<React.PropsWithChildren<{ role: Role }>> = ({ role, children }) => {
  const admin = useAdminRole();
  const business = useBusinessRole();
  const mentor = useMentorProfile();

  const loading = role === 'admin' ? admin.loading : role === 'business' ? business.loading : mentor.loading;
  const allowed = role === 'admin' ? (admin.isAdmin || admin.isOperator)
    : role === 'business' ? business.isBusiness
    : mentor.isMentor;

  if (loading) return <Waiting />;
  // Signed in, wrong role: send them to the portal they do belong to rather
  // than a login they are already past.
  if (!allowed) return <Navigate to="/profile" replace />;
  return <>{children}</>;
};

export default RequireAuth;
