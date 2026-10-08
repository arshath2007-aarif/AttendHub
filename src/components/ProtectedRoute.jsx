import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './States';
import { homeFor } from '../utils/roleRedirect';

// Wrap a group of routes. `roles` = which roles may enter.
// Anyone else is sent to their own dashboard (or login if not signed in).
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './States';
import { homeFor } from '../utils/roleRedirect';

// Wrap a group of routes. `roles` = which roles may enter.
// Anyone else is sent to their own dashboard (or login if not signed in).
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
