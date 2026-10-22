import React, { useState, useEffect } from 'react';
import { Menu, Shield } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ThemeToggle from '../common/ThemeToggle';

/**
 * Topbar
 * Upper bar for the dashboards: mobile menu button, the signed-in user's
 * role (from GET /auth/me, not switchable), and their name.
 * (The teammate's role switcher and sample notifications were removed: the
 * role comes from the backend, and there are no notifications yet.)
 */
export default function Topbar({ onToggleMobileMenu, activeRole }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const user = useCurrentUser() || {};

  // Show a border once the page scrolls a little.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all duration-200 ${
        isScrolled
          ? 'bg-surface/90 backdrop-blur-md border-b border-border shadow-2xs'
          : 'bg-surface/75 backdrop-blur-sm border-b border-transparent'
      }`}
    >
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

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300/60 bg-emerald-50/70 text-xs font-bold text-emerald-900 shadow-2xs">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Role:</span>
          <span>{ROLE_LABELS[activeRole] || activeRole}</span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-2xs">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-bold text-navy truncate max-w-[160px]">{user.name || 'User'}</div>
            <div className="text-[10.5px] text-muted font-semibold truncate max-w-[160px]">{user.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
