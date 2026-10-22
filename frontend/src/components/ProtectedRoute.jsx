import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { authStorage } from '../services/apiClient';
import { ROLE_PATHS } from '../constants/roles';

/**
 * ProtectedRoute
 * Shows the page only to a logged-in user with an allowed role; otherwise
 * redirects. This only decides what to show: the backend checks the token and
 * permissions on every request, and an expired token (401) logs the user out.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const user = authStorage.getUser();

  if (!authStorage.isAuthenticated() || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but this area is for the other role: go to your own home.
    return <Navigate to={ROLE_PATHS[user.role] || '/login'} replace />;
  }

  return children ? children : <Outlet />;
}
