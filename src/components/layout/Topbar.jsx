import React, { useState, useEffect } from 'react';
import { Menu, Bell, Shield, ChevronDown } from 'lucide-react';
import { ROLES, ROLE_LABELS, ROLE_PATHS } from '../../constants/roles';
import { getCurrentUser, setActiveRolePreview } from '../../services/authService';
import NotificationPanel from '../common/NotificationPanel';
import { useNavigate } from 'react-router-dom';

/**
 * Topbar
 * Upper navigation bar for CivicFix AI dashboards.
 * Features:
 * - Mobile responsive drawer toggle.
 * - Sticky navigation with backdrop blur and border toggled via passive scroll listener (>8px).
 * - In-memory theme toggle (Light / Dark mode).
 * - Role preview switcher (in development mode) or institutional role badge (in production).
 * - Notification alerts panel with unread indicator badge.
 * - Current user avatar and profile details.
 */
export default function Topbar({ onToggleMobileMenu, activeRole }) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const user = getCurrentUser();

  // Passive scroll listener for subtle 1px bottom border on scroll > 8px
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSwitchRole = (newRole) => {
    setActiveRolePreview(newRole);
    setRoleMenuOpen(false);
    navigate(ROLE_PATHS[newRole]);
  };

  return (
    <header
      className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all duration-200 ${
        isScrolled
          ? 'bg-surface/90 backdrop-blur-md border-b border-border shadow-2xs'
          : 'bg-surface/75 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      {/* Left: Mobile Navigation Drawer Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-border bg-surface-canvas text-navy hover:bg-border/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Role Switcher / Badge, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Instant Role Preview Selector (DEV only) / Static Role Badge (Prod) */}
        {import.meta.env.DEV ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-xs font-bold text-emerald-900 transition-colors cursor-pointer shadow-2xs"
              title="Switch Dashboard Role View"
            >
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Role:</span>
              <span>{ROLE_LABELS[activeRole] || 'Citizen'}</span>
              <ChevronDown className="w-3 h-3 text-primary" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl border border-border shadow-lg py-1.5 z-50 animate-fadeIn text-left">
                <div className="px-3 py-1.5 text-[10.5px] font-bold text-muted uppercase tracking-wider border-b border-border">
                  Switch Active Role View
                </div>
                {Object.values(ROLES).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSwitchRole(r)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                      activeRole === r
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-navy/80 hover:bg-surface-canvas'
                    }`}
                  >
                    <span>{ROLE_LABELS[r]}</span>
                    {activeRole === r && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300/60 bg-emerald-50/70 text-xs font-bold text-emerald-900 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Role:</span>
            <span>{ROLE_LABELS[activeRole] || 'Citizen'}</span>
          </div>
        )}

        {/* Notifications Bell Button & Dropdown Panel */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-navy transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 text-muted" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface" />
          </button>
          <NotificationPanel
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

        {/* User Mini Avatar and Role Summary */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-bold text-navy truncate max-w-[120px]">
              {user.name || 'User'}
            </div>
            <div className="text-[10.5px] text-muted font-semibold capitalize">{activeRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
