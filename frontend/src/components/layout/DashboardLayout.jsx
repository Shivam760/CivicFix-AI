import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';
import { getActiveRole } from '../../services/authService';

/**
 * DashboardLayout
 * Unifying layout shell for Citizen, Committee, and Administrator dashboards.
 * Adheres to 8px spacing scale, 1200px max-width container, and responsive gutters.
 */
export default function DashboardLayout({
  children,
  title,
  subtitle,
  primaryAction,
  breadcrumbs,
  activeRole: propRole,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeRole = propRole || getActiveRole();

  return (
    <div className="min-h-screen bg-surface-canvas text-navy flex flex-col antialiased transition-colors">
      <div className="flex flex-1 min-h-screen">
        {/* Desktop Persistent Sidebar */}
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-20">
          <Sidebar activeRole={activeRole} />
        </div>

        {/* Mobile Drawer Backdrop & Sidebar */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
          >
            <div
              className="fixed inset-0 bg-navy/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-surface h-full shadow-2xl z-10 animate-fadeIn">
              <Sidebar activeRole={activeRole} onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            activeRole={activeRole}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* 1200px max-width container with 8px-scale gutters: 16px mobile, 24px tablet, 32px desktop */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
            {/* Breadcrumbs */}
            <Breadcrumbs customCrumbs={breadcrumbs} />

            {/* Page Header */}
            {(title || primaryAction) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-muted mt-1">{subtitle}</p>
                  )}
                </div>
                {primaryAction && <div className="shrink-0">{primaryAction}</div>}
              </div>
            )}

            {/* Body Slot */}
            {children}
          </main>

          {/* Institutional Footer */}
          <footer className="py-4 px-6 border-t border-border text-center text-xs text-muted font-medium bg-surface/60">
            &copy; 2026 CivicFix AI &bull; Civic issue reporting
          </footer>
        </div>
      </div>
    </div>
  );
}
