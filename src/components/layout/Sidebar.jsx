import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  ClipboardList,
  Building2,
  Users,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Cpu,
} from 'lucide-react';
import { ROLES } from '../../constants/roles';
import { getCurrentUser, signOutUser } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

/**
 * Sidebar
 * Persistent responsive sidebar inspired by the uploaded Tesla Reports & Shopeers dashboards.
 * Features animated active item indicator using framer-motion layoutId.
 */
export default function Sidebar({ activeRole, onCloseMobile }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = getCurrentUser();
  const shouldReduceMotion = useReducedMotion();

  const handleSignOut = () => {
    signOutUser();
    showToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out of CivicFix AI.',
    });
    navigate('/login');
  };

  // Role-specific navigation items
  const navItemsByRole = {
    [ROLES.CITIZEN]: [
      {
        section: 'Overview',
        items: [
          { to: '/citizen/dashboard', label: 'Citizen Home', icon: LayoutDashboard },
          { to: '/citizen/complaints', label: 'My Complaints', icon: FileText, badge: '4' },
          { to: '/citizen/report', label: 'Report New Issue', icon: PlusCircle, isHighlight: true },
        ],
      },
    ],
    [ROLES.COMMITTEE]: [
      {
        section: 'Case Operations',
        items: [
          { to: '/committee/dashboard', label: 'Operations Desk', icon: LayoutDashboard },
          { to: '/committee/complaints', label: 'Assigned Queue', icon: ClipboardList, badge: '6' },
          { to: '/committee/authorities', label: 'Zonal Directory', icon: Building2 },
        ],
      },
    ],
    [ROLES.ADMIN]: [
      {
        section: 'Platform Console',
        items: [
          { to: '/admin/dashboard', label: 'System Overview', icon: LayoutDashboard },
          { to: '/admin/analytics', label: 'Civic Analytics', icon: BarChart3 },
          { to: '/admin/complaints', label: 'All Complaints', icon: FileText, badge: '1.4k' },
          { to: '/admin/ai-monitoring', label: 'AI Monitoring', icon: Cpu },
        ],
      },
      {
        section: 'Governance',
        items: [
          { to: '/admin/users', label: 'User Management', icon: Users },
          { to: '/admin/authorities', label: 'Authority Directory', icon: Building2 },
          { to: '/admin/activity', label: 'Audit Trail', icon: ShieldAlert },
        ],
      },
    ],
  };

  const navSections = navItemsByRole[activeRole] || navItemsByRole[ROLES.CITIZEN];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between h-full select-none transition-colors">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-sm shadow-emerald-700/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-extrabold tracking-tight text-navy flex items-center gap-1.5">
                CivicFix AI
              </span>
              <span className="text-[10.5px] font-semibold text-primary uppercase tracking-wider">
                {activeRole === ROLES.CITIZEN
                  ? 'Citizen Portal'
                  : activeRole === ROLES.COMMITTEE
                  ? 'Committee Workspace'
                  : 'Platform Administration'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]" aria-label="Main Navigation">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx}>
              {sec.section && (
                <div className="px-3 mb-2 text-[10.5px] font-bold text-muted uppercase tracking-wider">
                  {sec.section}
                </div>
              )}
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => onCloseMobile && onCloseMobile()}
                      className={({ isActive }) =>
                        `relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'text-white font-bold'
                            : item.isHighlight
                            ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
                            : 'text-muted hover:text-navy hover:bg-surface-canvas'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Animated active indicator pill */}
                          {isActive && (
                            <motion.div
                              layoutId={shouldReduceMotion ? undefined : 'activeSidebarIndicator'}
                              className="absolute inset-0 bg-primary rounded-xl z-0 shadow-2xs"
                              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                            />
                          )}

                          <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive
                                  ? 'text-white'
                                  : item.isHighlight
                                  ? 'text-primary'
                                  : 'text-muted group-hover:text-navy'
                              }`}
                            />
                            <span className="truncate text-xs" title={item.label}>
                              {item.label}
                            </span>
                          </div>

                          {item.badge && (
                            <span
                              className={`relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ml-1.5 ${
                                isActive
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-border/70 text-navy'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-border bg-surface-canvas/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border shadow-2xs mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/30">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-navy truncate">{user.name || 'User'}</div>
              <div className="text-[10.5px] text-muted truncate">{user.email}</div>
            </div>
          </div>
          <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
            {activeRole}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-semibold text-navy transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <LogOut className="w-3.5 h-3.5 text-muted" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
