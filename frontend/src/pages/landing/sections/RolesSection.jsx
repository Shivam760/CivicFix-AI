import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import CategoryIcon from '../../../components/icons3d/CategoryIcon';
import { Link } from 'react-router-dom';

/**
 * RolesSection
 * Interactive 3-role presentation (Citizen, Committee Member, Administrator)
 * with accessible ARIA tablist, sliding underline, and expandable Framer Motion drawers.
 */
export default function RolesSection() {
  const [activeTab, setActiveTab] = useState('citizen');
  const [expandedCards, setExpandedCards] = useState({
    citizen: false,
    committee: false,
    admin: false,
  });
  const shouldReduceMotion = useReducedMotion();

  const roles = [
    {
      id: 'citizen',
      title: 'Normal Citizen',
      category: 'road',
      badge: 'Public Participation',
      summary: 'Empowering local residents to flag neighborhood hazards in under 30 seconds.',
      actions: [
        'Report potholes, streetlights, garbage, drainage & water leaks',
        'Capture geo-tagged photo evidence with automatic ward lock',
        'Track live engineering milestones and verified contractor sign-offs',
      ],
      details: [
        'Accessible via mobile browser with zero required app store downloads.',
        'Automatic deduplication ensures nearby reports contribute to hazard priority scoring.',
        'Direct feedback loop alerts you as soon as municipal crews deploy to your ward.',
      ],
      ctaText: 'Enter Citizen Portal',
      ctaLink: '/signup',
      icon: User,
    },
    {
      id: 'committee',
      title: 'Committee Member',
      category: 'streetlight',
      badge: 'Zonal Operations',
      summary: 'Equipping ward corporators and triage desks with rapid dispatch workflows.',
      actions: [
        'Review AI multi-modal vision triage and severity classifications',
        'Assign cases to verified jurisdictional authority engineers',
        'Supervise 48-hour municipal SLA compliance across ward sectors',
      ],
      details: [
        'Internal case notes and official engineer logs are protected from public leakage.',
        'Zonal authority directory maps jurisdiction boundaries for BWSSB, BBMP, and BESCOM.',
        'One-click forwarding dispatches official notices to contracted road & sanitation teams.',
      ],
      ctaText: 'Open Committee Desk',
      ctaLink: '/login',
      icon: Users,
    },
    {
      id: 'admin',
      title: 'Administrator',
      category: 'other',
      badge: 'Platform Governance',
      summary: 'Centralized municipal control, civic analytics velocity, and security auditing.',
      actions: [
        'Monitor platform-wide grievance resolution rates and intake velocity',
        'Manage official authority directories, head engineers, and staff roles',
        'Audit complete chronological system logs for civic governance compliance',
      ],
      details: [
        'Real-time municipal SLA compliance scoring across city zones and regional divisions.',
        'Granular role-based access control protecting citizen credentials and operational data.',
        'Exportable governance reports ready for municipal council and legislative presentation.',
      ],
      ctaText: 'Access Admin Console',
      ctaLink: '/login',
      icon: ShieldCheck,
    },
  ];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % roles.length;
      setActiveTab(roles[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + roles.length) % roles.length;
      setActiveTab(roles[prevIndex].id);
    }
  };

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="roles"
      className="relative py-28 bg-[#FFFDF8] text-[#181A20] border-b border-[#E8E0CE] overflow-hidden"
      aria-label="CivicFix Role-Based Dashboards"
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold tracking-widest text-[#059669] uppercase px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] inline-block mb-3 shadow-2xs">
            Tailored User Roles
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-[#181A20] tracking-tight mb-4">
            Three Distinct Roles. One Unified Civic Platform.
          </h2>
          <p className="text-sm sm:text-base text-[#5C5549] leading-relaxed font-sans">
            Purpose-built workspaces designed specifically for citizen reporters, ward triage committees, and platform administrators.
          </p>
        </div>

        {/* Accessible ARIA Tablist */}
        <div className="flex items-center justify-center mb-12">
          <div
            role="tablist"
            aria-label="User Roles"
            className="inline-flex p-1.5 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] shadow-2xs"
          >
            {roles.map((role, idx) => {
              const isActive = activeTab === role.id;
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  role="tab"
                  id={`tab-${role.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${role.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onClick={() => setActiveTab(role.id)}
                  className={`relative flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    isActive ? 'text-[#181A20]' : 'text-[#5C5549] hover:text-[#181A20]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{role.title}</span>
                  {isActive && (
                    <motion.div
                      layoutId={shouldReduceMotion ? undefined : 'activeRoleTabUnderline'}
                      className="absolute inset-0 rounded-xl bg-white border border-[#D5C9B3] shadow-xs -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles 3-Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {roles.map((role) => {
            const isTabActive = activeTab === role.id;
            const isExpanded = expandedCards[role.id];

            return (
              <motion.div
                key={role.id}
                role="tabpanel"
                id={`panel-${role.id}`}
                aria-labelledby={`tab-${role.id}`}
                layout
                className={`relative rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between ${
                  isTabActive
                    ? 'bg-white border-2 border-emerald-600 shadow-xl ring-2 ring-emerald-500/10'
                    : 'bg-[#FAF6EE] border-[#E8E0CE] hover:bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar with 3D Icon & Role Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] shadow-2xs">
                      <CategoryIcon category={role.category} size={32} />
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-emerald-800 border border-[#A7F3D0]">
                      {role.badge}
                    </span>
                  </div>

                  {/* Title & One-Liner Summary */}
                  <h3 className="font-display text-2xl font-bold text-[#181A20] mb-2">
                    {role.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C5549] mb-6 leading-relaxed font-sans">
                    {role.summary}
                  </p>

                  {/* 3 Core Responsibilities */}
                  <div className="space-y-3 mb-6">
                    {role.actions.map((act, actIdx) => (
                      <div key={actIdx} className="flex items-start gap-2.5 text-xs text-[#3E382E]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{act}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expandable Detail Panel via Framer Motion Layout Animation */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden mb-6"
                      >
                        <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-2 text-xs text-[#3E382E]">
                          <div className="font-bold text-[#059669] font-mono text-[11px] uppercase">
                            Operational Capabilities:
                          </div>
                          {role.details.map((det, dIdx) => (
                            <p key={dIdx} className="text-[11.5px] leading-relaxed text-[#5C5549]">
                              &bull; {det}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-[#E8E0CE]/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleExpand(role.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Less details' : 'Learn more'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <Link
                    to={role.ctaLink}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#181A20] hover:text-emerald-700 transition-colors"
                  >
                    <span>{role.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
