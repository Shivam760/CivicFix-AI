import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { authStorage } from '../services/apiClient';
import { getActiveRole } from '../services/authService';
import { ROLE_PATHS } from '../constants/roles';

/**
 * ProtectedRoute
 * Route guard enforcing authentication and role-based access control.
 * 
 * If unauthenticated: redirects to /login.
 * If role is unauthorized: redirects to that user's authorized role dashboard.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();

  const hasToken = Boolean(authStorage.getToken());
  const isMarkedAuthenticated = sessionStorage.getItem('civicfix_authenticated') === 'true';

  // Session survival check:
  // If marked authenticated in session storage but token is missing from memory (e.g. after refresh),
  // invalidate the session and redirect with an expiration notice.
  if (isMarkedAuthenticated && !hasToken) {
    authStorage.clearSession();
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          sessionExpired: true,
          message: 'Session expired, please sign in again',
        }}
        replace
      />
    );
  }

  // Not authenticated
  if (!authStorage.isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // BACKEND INTEGRATION: replace with server-verified role from JWT
  const userRole = getActiveRole();

  // Role authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect unauthorized user to their role-appropriate workspace
    const fallbackPath = ROLE_PATHS[userRole] || '/citizen/dashboard';
    if (location.pathname === fallbackPath) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? children : <Outlet />;
}
