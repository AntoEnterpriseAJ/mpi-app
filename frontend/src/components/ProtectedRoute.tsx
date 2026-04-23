import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

type ProtectedRouteProps = {
  requiredRole?: 'Manager' | 'User';
  fallbackPath?: string;
};

export function ProtectedRoute({
  requiredRole,
  fallbackPath = '/leave',
}: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingScreen fullPage label="Recovering session..." />;
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole && user.role.toLowerCase() !== requiredRole.toLowerCase()) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
