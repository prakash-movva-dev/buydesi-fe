import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types/api';

interface ProtectedRouteProps {
  roles?: ReadonlyArray<UserRole>;
}

/**
 * Gate every authenticated route. If a `roles` list is supplied, the
 * authenticated user's role must be in it (SUPER_ADMIN is not auto-bypassed
 * here — include it explicitly when you want super to see something).
 */
export const ProtectedRoute = ({ roles }: ProtectedRouteProps) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
};
