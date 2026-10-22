import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { authStorage } from '../services/apiClient';
import { PENDING_PATH, homePathFor, isAwaitingApproval } from '../constants/roles';

/**
 * ProtectedRoute
 * Shows the page only to a logged-in user with an allowed role; otherwise
 * redirects. This only decides what to show: the backend checks the token and
 * permissions on every request, and an expired token (401) logs the user out.
 *
 * Officials an admin has not approved see only their application page
 * (allowUnapproved marks that page).
 */
export default function ProtectedRoute({ allowedRoles, allowUnapproved = false, children }) {
  const location = useLocation();
  const user = authStorage.getUser();

  if (!authStorage.isAuthenticated() || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAwaitingApproval(user) && !allowUnapproved) {
    return <Navigate to={PENDING_PATH} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but this area is for another role: go to your own home.
    return <Navigate to={homePathFor(user)} replace />;
  }

  return children ? children : <Outlet />;
}
