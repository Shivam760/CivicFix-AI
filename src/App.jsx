import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Authentication Pages (Preserved)
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LandingPage from './pages/landing/LandingPage';

// Role-Based Dashboards & Sub-Views
import CitizenDashboardPage from './pages/citizen/CitizenDashboardPage';
import CitizenReportPage from './pages/citizen/CitizenReportPage';
import CommitteeDashboardPage, { CommitteeQueueView } from './pages/committee/CommitteeDashboardPage';
import AdminDashboardPage, {
  AdminAnalyticsView,
  AdminComplaintsView,
  AdminAiMonitoringView,
} from './pages/admin/AdminDashboardPage';
import UserManagementSection from './components/admin/UserManagementSection';
import AuthorityDirectorySection from './components/admin/AuthorityDirectorySection';
import SystemAuditSection from './components/admin/SystemAuditSection';
import NotFoundPage from './pages/NotFoundPage';

// Security & Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './constants/roles';

// Theme & Feedback Providers
import ThemeProvider from './context/ThemeProvider';
import ToastProvider from './components/feedback/ToastProvider';
import { pageTransition, getReducedMotionVariants } from './lib/motion';

// Developer-only lazy modules (completely omitted from production builds)
const DashboardPreview = import.meta.env.DEV
  ? React.lazy(() => import('./pages/DashboardPreview'))
  : null;
const BackendStatusBadge = import.meta.env.DEV
  ? React.lazy(() => import('./components/BackendStatusBadge'))
  : null;

/**
 * PageTransitionWrapper
 * Wraps route views in smooth framer-motion page transition animations
 * respecting prefers-reduced-motion.
 */
function PageTransitionWrapper({ children }) {
  const shouldReduce = useReducedMotion();
  const variants = getReducedMotionVariants(pageTransition, shouldReduce);

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedRoutes
 * Configures role-based routes for Citizen, Committee Member, and Administrator.
 */
function AnimatedRoutes({ devSimulation, setDevSimulation }) {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ========================================================= */}
          {/* AUTHENTICATION ROUTES (PRESERVED)                        */}
          {/* ========================================================= */}
          <Route
            path="/login"
            element={
              <PageTransitionWrapper>
                <LoginPage devSimulation={devSimulation} />
              </PageTransitionWrapper>
            }
          />
          <Route
            path="/signup"
            element={
              <PageTransitionWrapper>
                <SignUpPage devSimulation={devSimulation} />
              </PageTransitionWrapper>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PageTransitionWrapper>
                <ForgotPasswordPage devSimulation={devSimulation} />
              </PageTransitionWrapper>
            }
          />

          {/* ========================================================= */}
          {/* ROLE ROUTE DISPATCHER (DEV ONLY)                          */}
          {/* ========================================================= */}
          {import.meta.env.DEV && DashboardPreview && (
            <Route
              path="/dashboard"
              element={
                <React.Suspense fallback={null}>
                  <PageTransitionWrapper>
                    <DashboardPreview />
                  </PageTransitionWrapper>
                </React.Suspense>
              }
            />
          )}

          {/* ========================================================= */}
          {/* ROLE 1: CITIZEN DASHBOARD ROUTES                          */}
          {/* ========================================================= */}
          <Route
            path="/citizen"
            element={
              // BACKEND INTEGRATION: replace with server-verified role from JWT
              <ProtectedRoute allowedRoles={[ROLES.CITIZEN]} />
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <PageTransitionWrapper>
                  <CitizenDashboardPage />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="complaints"
              element={
                <PageTransitionWrapper>
                  <CitizenDashboardPage />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="complaints/:id"
              element={
                <PageTransitionWrapper>
                  <CitizenDashboardPage />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="report"
              element={
                <PageTransitionWrapper>
                  <CitizenReportPage />
                </PageTransitionWrapper>
              }
            />
          </Route>

          {/* ========================================================= */}
          {/* ROLE 2: COMMITTEE MEMBER DASHBOARD ROUTES                 */}
          {/* ========================================================= */}
          <Route
            path="/committee"
            element={
              // BACKEND INTEGRATION: replace with server-verified role from JWT
              <ProtectedRoute allowedRoles={[ROLES.COMMITTEE]}>
                <CommitteeDashboardPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <PageTransitionWrapper>
                  <CommitteeQueueView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="complaints"
              element={
                <PageTransitionWrapper>
                  <CommitteeQueueView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="complaints/:id"
              element={
                <PageTransitionWrapper>
                  <CommitteeQueueView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="authorities"
              element={
                <PageTransitionWrapper>
                  <AuthorityDirectorySection />
                </PageTransitionWrapper>
              }
            />
          </Route>

          {/* ========================================================= */}
          {/* ROLE 3: ADMINISTRATOR DASHBOARD ROUTES                    */}
          {/* ========================================================= */}
          <Route
            path="/admin"
            element={
              // BACKEND INTEGRATION: replace with server-verified role from JWT
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <PageTransitionWrapper>
                  <AdminAnalyticsView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="analytics"
              element={
                <PageTransitionWrapper>
                  <AdminAnalyticsView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="complaints"
              element={
                <PageTransitionWrapper>
                  <AdminComplaintsView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="ai-monitoring"
              element={
                <PageTransitionWrapper>
                  <AdminAiMonitoringView />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="users"
              element={
                <PageTransitionWrapper>
                  <UserManagementSection />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="authorities"
              element={
                <PageTransitionWrapper>
                  <AuthorityDirectorySection />
                </PageTransitionWrapper>
              }
            />
            <Route
              path="activity"
              element={
                <PageTransitionWrapper>
                  <SystemAuditSection />
                </PageTransitionWrapper>
              }
            />
          </Route>

          {/* ========================================================= */}
          {/* LANDING PAGE & FALLBACK ROUTES                            */}
          {/* ========================================================= */}
          <Route
            path="/"
            element={
              <PageTransitionWrapper>
                <LandingPage />
              </PageTransitionWrapper>
            }
          />
          <Route
            path="/landing"
            element={
              <PageTransitionWrapper>
                <LandingPage />
              </PageTransitionWrapper>
            }
          />
          <Route path="/not-found" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>

      {/* Development-Only Diagnostics & Status Overlay */}
      {import.meta.env.DEV && BackendStatusBadge && (
        <React.Suspense fallback={null}>
          <BackendStatusBadge
            devSimulation={devSimulation}
            onToggleDevSimulation={setDevSimulation}
          />
        </React.Suspense>
      )}
    </>
  );
}

export default function App() {
  // Developer simulation is strictly forced to false in production builds
  const [devSimulation, setDevSimulation] = useState(() => {
    if (!import.meta.env.DEV) return false;
    return localStorage.getItem('civicfix_dev_simulation') === 'true';
  });

  const handleToggleDevSimulation = (val) => {
    if (!import.meta.env.DEV) return;
    setDevSimulation(val);
    localStorage.setItem('civicfix_dev_simulation', String(val));
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AnimatedRoutes
            devSimulation={devSimulation}
            setDevSimulation={handleToggleDevSimulation}
          />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
