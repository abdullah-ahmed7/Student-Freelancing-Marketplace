import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useApp';
import { LoadingState } from './ui';

// UI-level protection only. The backend must enforce the same rules.
export function ProtectedRoute() {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();
  if (!ready) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
