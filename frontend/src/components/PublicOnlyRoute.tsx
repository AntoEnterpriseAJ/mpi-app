import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export function PublicOnlyRoute() {
  const { status, isManager } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen fullPage label="Checking authentication..." />;
  }

  if (status === 'authenticated') {
    return <Navigate to={isManager ? '/manager' : '/leave'} replace />;
  }

  return <Outlet />;
}
