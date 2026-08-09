import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './common/LoadingSpinner';
import type { UserRole } from '../types';

interface Props {
  roles?: UserRole[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
