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

import ProtectedRoute from './components/ProtectedRoute';
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
function AnimatedRoutes() {
  const location = useLocation();

  return (
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
