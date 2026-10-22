import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import LandingPage from './pages/landing/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import ReportDetailPage from './pages/ReportDetailPage';
import CitizenDashboardPage from './pages/citizen/CitizenDashboardPage';
import CitizenReportPage from './pages/citizen/CitizenReportPage';
import VerificationsPage from './pages/citizen/VerificationsPage';
import NearbyPage from './pages/citizen/NearbyPage';
import OfficialDashboardPage from './pages/official/OfficialDashboardPage';
import PendingApprovalPage from './pages/account/PendingApprovalPage';
import AdminPage from './pages/admin/AdminPage';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ROLES } from './constants/roles';
import ThemeProvider from './context/ThemeProvider';
import ToastProvider from './components/feedback/ToastProvider';
import { pageTransition, getReducedMotionVariants } from './lib/motion';

/**
 * PageTransitionWrapper
 * Fades pages in and out on route changes (less motion if the OS asks for it).
 */
function PageTransitionWrapper({ children }) {
  const shouldReduce = useReducedMotion();
  const variants = getReducedMotionVariants(pageTransition, shouldReduce);
  return (
    <motion.div variants={variants} initial="hidden" animate="visible" exit="exit" className="w-full flex-1 flex flex-col">
      {children}
    </motion.div>
  );
}

// Shorthand: wrap a page in the transition.
const page = (element) => <PageTransitionWrapper>{element}</PageTransitionWrapper>;

/**
 * AnimatedRoutes
 * Public pages, citizen pages (/citizen/...) and official pages (/official/...).
 * ProtectedRoute sends logged-out users to /login and the wrong role to its own home.
 */
function PageCrashed() {
  // Shown instead of a blank screen when a page throws while drawing.
  return (
    <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-surface-canvas text-navy">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-6 text-center space-y-3 shadow-2xs">
        <h1 className="text-lg font-bold">Something went wrong on this page</h1>
        <p className="text-sm text-muted">
          Reloading usually fixes it. If it keeps happening, the details are in the browser console.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold"
          >
            Reload
          </button>
          <a href="/" className="px-4 py-2 rounded-xl border border-border text-sm font-bold">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    // resetKey: going to another page tries again after a crash.
    <ErrorBoundary resetKey={location.pathname} fallback={<PageCrashed />}>
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={page(<LandingPage />)} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={page(<LoginPage />)} />
        <Route path="/signup" element={page(<SignUpPage />)} />

        <Route path="/citizen" element={<ProtectedRoute allowedRoles={[ROLES.CITIZEN]} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={page(<CitizenDashboardPage />)} />
          <Route path="report" element={page(<CitizenReportPage />)} />
          <Route path="reports/:id" element={page(<ReportDetailPage />)} />
          <Route path="nearby" element={page(<NearbyPage />)} />
          <Route path="verifications" element={page(<VerificationsPage />)} />
        </Route>

        <Route path="/official" element={<ProtectedRoute allowedRoles={[ROLES.OFFICIAL]} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={page(<OfficialDashboardPage />)} />
          <Route path="reports/:id" element={page(<ReportDetailPage />)} />
        </Route>

        {/* Admins: approve and reject officials (the backend allows them nothing else). */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              {page(<AdminPage />)}
            </ProtectedRoute>
          }
        />

        {/* Pending or rejected officials: their application, nothing else. */}
        <Route
          path="/account/pending"
          element={
            <ProtectedRoute allowedRoles={[ROLES.OFFICIAL]} allowUnapproved>
              {page(<PendingApprovalPage />)}
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
