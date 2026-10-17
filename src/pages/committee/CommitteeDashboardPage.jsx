import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Outlet,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Sparkles,
  RefreshCw,
  ArrowUpDown,
  Building2,
  MoreVertical,
  Bell,
  Eye,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import ComplaintDetailModal from '../../components/complaints/ComplaintDetailModal';
import AiCaseInsightsPanel from '../../components/complaints/AiCaseInsightsPanel';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import {
  getCommitteeComplaints,
  applyAiRecommendation,
  updateComplaintStatus,
} from '../../services/complaintService';
import { getCurrentUser } from '../../services/authService';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { formatDate } from '../../utils/formatters';
import { ROLES } from '../../constants/roles';
import { staggerContainer, fadeUp } from '../../lib/motion';
import { useToast } from '../../context/ToastContext';

// Priority ordering weights for sorting urgent cases first
const PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * CommitteeQueueView
 * Modern, AI-powered Operational Case Queue view.
 * 
 * Features:
 * 1. Officer Header with personalized greeting, workload overview, and quick controls.
 * 2. 4 Stat Cards: Assigned Complaints, Awaiting Review, Critical/High-Priority, Resolved This Week.
 * 3. AI Case Insights Panel: Displays AI-predicted category, severity, department, next action, confidence,
 *    and clear badges distinguishing AI suggestions from confirmed administrative decisions.
 * 4. Advanced Complaint Table: Search, multi-dimensional filters (Status, Priority, Category, Department),
 *    Urgency-first default sorting with user controls, row-level actions menu, and responsive mobile cards.
 * 5. Full Complaint Detail View with 8 organized sections.
 */
export function CommitteeQueueView() {
  const {
    complaints,
    loading,
    error,
    reloadComplaints,
    handleOpenDetail,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    departmentFilter,
    setDepartmentFilter,
    sortBy,
    setSortBy,
    activeQueueTab,
    setActiveQueueTab,
    selectedComplaintForAi,
    setSelectedComplaintForAi,
  } = useOutletContext();

  const { showToast } = useToast();
  const currentUser = getCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Actions dropdown state
  const [openActionRowId, setOpenActionRowId] = useState(null);

  // Quick action confirmation dialog state
  const [confirmStatusData, setConfirmStatusData] = useState(null);
  const [isApplyingAi, setIsApplyingAi] = useState(false);

  // Close actions menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenActionRowId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Compute available unique departments from complaints
  const availableDepartments = useMemo(() => {
    const set = new Set();
    complaints.forEach((c) => {
      if (c.department) set.add(c.department);
      if (c.assignedDepartment) set.add(c.assignedDepartment);
    });
    return Array.from(set).filter(Boolean);
  }, [complaints]);

  // Operational Metrics (Calculated from actual live data)
  const totalAssigned = complaints.length;
  const awaitingReview = complaints.filter(
    (c) => c.status === 'submitted' || c.status === 'under_review'
  ).length;
  const inProgress = complaints.filter(
    (c) => c.status === 'in_progress' || c.status === 'assigned'
  ).length;
  const criticalCount = complaints.filter((c) => c.priority === 'critical').length;
  const highCount = complaints.filter((c) => c.priority === 'high').length;
  const criticalHighCount = criticalCount + highCount;

  // Resolved complaints in current jurisdictional cycle
  const resolvedThisWeek = useMemo(() => {
    return complaints.filter((c) => c.status === 'resolved').length;
  }, [complaints]);

  // Queue Tab Filtering
  const queueFilteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (activeQueueTab === 'all') return true;
      if (activeQueueTab === 'unreviewed') return c.status === 'submitted' || c.status === 'under_review';
      if (activeQueueTab === 'in_progress') return c.status === 'in_progress' || c.status === 'assigned';
      if (activeQueueTab === 'critical') return c.priority === 'critical';
      if (activeQueueTab === 'resolved') return c.status === 'resolved';
      return true;
    });
  }, [complaints, activeQueueTab]);

  // Department Filtering
  const deptFilteredComplaints = useMemo(() => {
    if (!departmentFilter || departmentFilter === 'all') return queueFilteredComplaints;
    return queueFilteredComplaints.filter((c) => {
      const dept = c.department || c.assignedDepartment || '';
      return dept.toLowerCase().includes(departmentFilter.toLowerCase());
    });
  }, [queueFilteredComplaints, departmentFilter]);

  // Sorting: Prioritize urgent cases by default, but allow officer to change
  const sortedComplaints = useMemo(() => {
    const list = [...deptFilteredComplaints];
    switch (sortBy) {
      case 'urgency':
        // Urgent first (Critical -> High -> Medium -> Low), then newest
        return list.sort((a, b) => {
          const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
          const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
          if (weightB !== weightA) return weightB - weightA;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'id':
        return list.sort((a, b) => a.id.localeCompare(b.id));
      case 'status':
        return list.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return list;
    }
  }, [deptFilteredComplaints, sortBy]);

  // Pagination calculation
  const totalItems = sortedComplaints.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedComplaints = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedComplaints.slice(start, start + pageSize);
  }, [sortedComplaints, safeCurrentPage, pageSize]);

  // Derived active complaint for AI Case Insights panel (no cascading effect)
  const activeAiComplaint = useMemo(() => {
    if (selectedComplaintForAi) {
      const match = complaints.find((c) => c.id === selectedComplaintForAi.id);
      if (match) return match;
    }
    return (
      complaints.find((c) => c.priority === 'critical' && c.aiAnalysis) ||
      complaints.find((c) => c.aiAnalysis) ||
      complaints[0] ||
      null
    );
  }, [selectedComplaintForAi, complaints]);

  // Handle Apply AI Recommendation from panel
  const handleApplyAiFromPanel = async (complaint, aiRecommendation) => {
    setIsApplyingAi(true);
    const res = await applyAiRecommendation(complaint.id, aiRecommendation);
    setIsApplyingAi(false);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'AI Recommendation Confirmed',
        message: `Case ${complaint.id} successfully assigned to ${aiRecommendation.suggestedDepartment}.`,
      });
      reloadComplaints();
    } else {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: res.error || 'Could not apply recommendation.',
      });
    }
  };

  // Quick status change handler
  const handleQuickStatusChange = async (complaint, newStatus) => {
    const res = await updateComplaintStatus(
      complaint.id,
      newStatus,
      `Quick transition to ${newStatus} by Committee Officer ${currentUser?.name || ''}`
    );
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Complaint ${complaint.id} marked as ${newStatus}.`,
      });
      reloadComplaints();
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update status.',
      });
    }
    setConfirmStatusData(null);
  };

  // Select Highest Priority Case
  const handleSelectUrgentCase = () => {
    const urgentCase =
      complaints.find((c) => c.priority === 'critical') ||
      complaints.find((c) => c.priority === 'high') ||
      complaints[0];
    if (urgentCase) {
      setSelectedComplaintForAi(urgentCase);
      setActiveQueueTab('critical');
    }
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDepartmentFilter('all');
    setActiveQueueTab('all');
    setSortBy('urgency');
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    departmentFilter !== 'all' ||
    activeQueueTab !== 'all';

  // Table Columns
  const columns = [
    {
      key: 'id',
      title: 'Case ID',
      render: (id, row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
            {id}
          </span>
          {row.aiAnalysis && (
            <span
              title="AI Triage Insights Available"
              className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0"
            />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      title: 'Complaint Title & Summary',
      render: (title, row) => (
        <div className="max-w-xs sm:max-w-sm">
          <span className="font-bold text-stone-900 block truncate text-xs sm:text-sm">
            {title}
          </span>
          <span className="text-[11px] text-stone-500 font-medium truncate block mt-0.5">
            {row.description}
          </span>
        </div>
      ),
    },
    {
      key: 'location',
      title: 'Location & Ward',
      render: (_, row) => (
        <div className="max-w-[180px]">
          <span className="text-xs text-stone-800 font-medium truncate block">
            {row.location?.address || 'Bengaluru'}
          </span>
          <span className="text-[10px] text-stone-500 font-semibold block">
            {row.location?.ward ? `${row.location.ward} • ` : ''}{row.location?.zone || 'East Zone'}
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (cat, row) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
          <Layers className="w-3 h-3 text-stone-500" />
          <span className="truncate max-w-[110px]">{row.categoryLabel || cat}</span>
        </span>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      render: (p) => <PriorityBadge priority={p} />,
    },
    {
      key: 'status',
      title: 'Status',
      render: (st) => <StatusBadge status={st} />,
    },
    {
      key: 'createdAt',
      title: 'Reported',
      render: (d) => (
        <span className="text-stone-500 font-mono text-[11px] whitespace-nowrap">
          {formatDate(d)}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      title: 'Assigned Desk / Dept',
      render: (off, row) => (
        <div className="max-w-[150px]">
          <span className="text-xs font-semibold text-stone-800 block truncate">
            {off || 'Unassigned'}
          </span>
          <span className="text-[10px] text-stone-500 truncate block">
            {row.department || row.assignedDepartment || 'Pending Triage'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (_, row) => {
        const isMenuOpen = openActionRowId === row.id;
        const isSelectedForAi = selectedComplaintForAi?.id === row.id;

        return (
          <div className="flex items-center justify-end gap-1.5 relative">
            {/* Quick Inspect AI Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedComplaintForAi(row);
              }}
              title="Inspect AI Insights for this case"
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isSelectedForAi
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {/* Quick Review Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(row);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-950 transition-colors shadow-2xs cursor-pointer"
            >
              Review
            </button>

            {/* Actions Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionRowId(isMenuOpen ? null : row.id);
                }}
                className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                aria-label="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-stone-200 shadow-xl py-1.5 z-40 animate-fadeIn text-left"
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    Case Operations
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionRowId(null);
                      handleOpenDetail(row, 'overview');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>View Full Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionRowId(null);
                      setSelectedComplaintForAi(row);
                      handleOpenDetail(row, 'ai_analysis');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Review AI Analysis</span>
                  </button>

                  <div className="my-1 border-t border-stone-100" />
                  <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Quick Status Change
                  </div>

                  {row.status !== 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionRowId(null);
                        setConfirmStatusData({ complaint: row, status: 'in_progress' });
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span>Set In Progress</span>
                    </button>
                  )}

                  {row.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionRowId(null);
                        setConfirmStatusData({ complaint: row, status: 'resolved' });
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Mark Resolved</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionRowId(null);
                      handleOpenDetail(row, 'actions');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 flex items-center gap-2 border-t border-stone-100 mt-1 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Assign Department...</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* 1. Dashboard Header Card */}
      <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E5DAC4] shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Institutional Officer Portal
              </span>
              <span className="text-xs font-bold text-stone-500 font-mono">
                {currentUser?.badgeId || 'OFF-7720-BLR'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
              Welcome back, {currentUser?.name || 'Officer'}
            </h2>
            <p className="text-xs text-stone-600 mt-0.5 max-w-3xl leading-relaxed">
              Operational overview: <strong>{awaitingReview} unreviewed complaints</strong> and{' '}
              <strong className="text-rose-700">{criticalHighCount} high-urgency incidents</strong>{' '}
              currently require triage and dispatch under {currentUser?.assignedZone || 'East Zone & Mahadevapura Division'}.
            </p>
          </div>

          {/* Quick Officer Controls & Notification Indicator */}
          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
            {/* Direct Refresh Action */}
            <button
              type="button"
              onClick={reloadComplaints}
              disabled={loading}
              title="Sync complaints with backend"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Queue</span>
            </button>

            {/* Notification Indicator Button */}
            <button
              type="button"
              onClick={() => {
                showToast({
                  type: 'info',
                  title: 'Operational Notifications',
                  message: `${criticalCount} critical emergencies flagged by CivicFix AI engine today.`,
                });
              }}
              className="relative p-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-stone-600" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Critical SLA Emergency Alert Banner */}
      {criticalCount > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <strong>Emergency Attention Required:</strong> {criticalCount} critical incident{criticalCount === 1 ? '' : 's'} flagged for rapid response safety protocol.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveQueueTab('critical')}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
          >
            Filter Critical Cases
          </button>
        </div>
      )}

      {/* 2. Statistics Cards with Framer Motion Stagger */}
      <motion.div
        variants={staggerContainer(0.06, 0.04)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4"
      >
        {/* Card 1: Assigned Complaints */}
        <motion.div variants={fadeUp}>
          <StatCard
            title="Assigned Complaints"
            value={totalAssigned}
            icon={ClipboardList}
            accentColor="emerald"
            subtext="Total jurisdictional queue"
            trend={{
              value: '+3 this week',
              direction: 'up',
              isGood: true,
              label: 'intake rate',
            }}
          />
        </motion.div>

        {/* Card 2: Awaiting Review */}
        <motion.div variants={fadeUp}>
          <StatCard
            title="Awaiting Review"
            value={awaitingReview}
            icon={Clock}
            accentColor="amber"
            badge={awaitingReview > 0 ? `${awaitingReview} Action Needed` : undefined}
            subtext="Unverified intake reports"
            trend={
              awaitingReview > 0
                ? {
                    value: `${awaitingReview} pending`,
                    direction: 'up',
                    isGood: false,
                    label: 'requires triage',
                  }
                : undefined
            }
          />
        </motion.div>

        {/* Card 3: Critical or High-Priority */}
        <motion.div variants={fadeUp}>
          <StatCard
            title="Critical &amp; High Priority"
            value={criticalHighCount}
            icon={AlertTriangle}
            accentColor="rose"
            badge={criticalCount > 0 ? `${criticalCount} Critical` : undefined}
            subtext="Urgent safety hazards (< 24h SLA)"
            trend={
              criticalCount > 0
                ? {
                    value: `${criticalCount} emergency`,
                    direction: 'up',
                    isGood: false,
                    label: 'immediate valve/barricade',
                  }
                : undefined
            }
          />
        </motion.div>

        {/* Card 4: Resolved Complaints This Week */}
        <motion.div variants={fadeUp}>
          <StatCard
            title="Resolved This Week"
            value={resolvedThisWeek}
            icon={CheckCircle2}
            accentColor="teal"
            subtext="Verified field remediations"
            trend={{
              value: '98% on-time',
              direction: 'up',
              isGood: true,
              label: 'SLA compliance',
            }}
          />
        </motion.div>
      </motion.div>

      {/* 3. AI Case Insights Panel */}
      <AiCaseInsightsPanel
        complaint={activeAiComplaint}
        isApplying={isApplyingAi}
        onReviewRecommendation={(c) => handleOpenDetail(c, 'ai_analysis')}
        onApplyRecommendation={handleApplyAiFromPanel}
        onOpenDetails={(c) => handleOpenDetail(c, 'overview')}
        onSelectUrgentCase={handleSelectUrgentCase}
      />

      {/* API Error State Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Backend Query Error:</strong> {error}
            </span>
          </div>
          <button
            type="button"
            onClick={reloadComplaints}
            className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Operational Queue Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b border-[#EBE3D0]">
        {[
          { id: 'all', label: 'All Cases', count: totalAssigned },
          { id: 'unreviewed', label: 'New / Unreviewed', count: awaitingReview, isAlert: awaitingReview > 0 },
          { id: 'in_progress', label: 'In Progress / Assigned', count: inProgress },
          { id: 'critical', label: 'Critical Priority', count: criticalCount, isAlert: criticalCount > 0 },
          { id: 'resolved', label: 'Resolved', count: resolvedThisWeek },
        ].map((tab) => {
          const isActive = activeQueueTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveQueueTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-[#FFFDF9] text-stone-600 border border-[#EBE3D0] hover:bg-[#FAF5EC]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-emerald-900 text-white'
                    : tab.isAlert
                    ? 'bg-rose-100 text-rose-800 font-bold'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Filter, Search & Sort Control Bar */}
      <div className="space-y-3 mb-4">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter by Case ID, title, address, reporter, or department..."
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All Statuses', value: 'all' },
                { label: 'Submitted', value: 'submitted' },
                { label: 'Under Review', value: 'under_review' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Rejected', value: 'rejected' },
              ],
            },
            {
              id: 'priority',
              label: 'Priority',
              value: priorityFilter,
              onChange: setPriorityFilter,
              options: [
                { label: 'All Priorities', value: 'all' },
                { label: 'Critical', value: 'critical' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ],
            },
            {
              id: 'category',
              label: 'Category',
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: [
                { label: 'All Domains', value: 'all' },
                ...CIVIC_CATEGORIES.map((cat) => ({
                  label: cat.label,
                  value: cat.id,
                })),
              ],
            },
            {
              id: 'department',
              label: 'Department',
              value: departmentFilter,
              onChange: setDepartmentFilter,
              options: [
                { label: 'All Departments', value: 'all' },
                ...availableDepartments.map((dept) => ({
                  label: dept,
                  value: dept,
                })),
              ],
            },
          ]}
        />

        {/* Secondary Bar: Sorting & Filter Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#FAF5EC] p-3 rounded-2xl border border-[#EBE3D0]">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-bold text-stone-700">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#D8CEBA] rounded-xl px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              <option value="urgency">Urgency (Critical First) — Default</option>
              <option value="newest">Submission Date (Newest First)</option>
              <option value="oldest">Submission Date (Oldest First)</option>
              <option value="id">Case ID (A-Z)</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-stone-500 text-[11px] font-medium">
              Showing <strong>{sortedComplaints.length}</strong> matching grievances
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Complaints Table or Responsive Mobile Card Layout */}
      {loading ? (
        <DashboardSkeleton count={4} />
      ) : sortedComplaints.length === 0 ? (
        <EmptyState
          title="No complaints in this queue"
          description="There are currently no civic cases matching your selected filters or work queue."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop & Tablet Table (Hidden on small mobile) */}
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={paginatedComplaints}
              onRowClick={(row) => setSelectedComplaintForAi(row)}
            />
          </div>

          {/* Mobile Responsive Grievance Cards (Shown on mobile screens < 640px) */}
          <div className="sm:hidden space-y-3">
            {paginatedComplaints.map((c) => {
              const isSelectedForAi = selectedComplaintForAi?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaintForAi(c)}
                  className={`p-4 rounded-2xl bg-[#FFFDF9] border transition-all cursor-pointer ${
                    isSelectedForAi
                      ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-[#EBE3D0] hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                      {c.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{c.title}</h4>
                  <p className="text-[11px] text-stone-600 line-clamp-2 mt-1">{c.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-[#EBE3D0] flex items-center justify-between text-[11px] text-stone-500">
                    <span className="truncate max-w-[150px]">{c.location?.address}</span>
                    <span className="font-mono">{formatDate(c.createdAt)}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComplaintForAi(c);
                      }}
                      className="flex-1 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>AI Insights</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(c);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Review Case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Quick Status Change Confirmation Dialog */}
      {confirmStatusData && (
        <ConfirmationDialog
          isOpen={Boolean(confirmStatusData)}
          title={`Confirm Status Transition to ${confirmStatusData.status.toUpperCase()}`}
          message={`Are you sure you want to transition case ${confirmStatusData.complaint.id} to "${confirmStatusData.status}"?`}
          confirmLabel="Confirm Transition"
          onConfirm={() =>
            handleQuickStatusChange(confirmStatusData.complaint, confirmStatusData.status)
          }
          onCancel={() => setConfirmStatusData(null)}
        />
      )}
    </>
  );
}

/**
 * CommitteeDashboardPage
 * Parent layout container resolving sub-views via <Outlet />.
 */
export default function CommitteeDashboardPage() {
  const user = getCurrentUser();
  const { id: routeComplaintId } = useParams();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMockData, setIsMockData] = useState(false);

  // Active Work Queue Tab ('all' | 'unreviewed' | 'in_progress' | 'critical' | 'resolved')
  const [activeQueueTab, setActiveQueueTab] = useState('all');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency' | 'newest' | 'oldest' | 'id' | 'status'

  // Selected complaint for modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalInitialTab, setModalInitialTab] = useState('overview');
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Selected complaint for AI panel
  const [selectedComplaintForAi, setSelectedComplaintForAi] = useState(null);

  const reloadComplaints = useCallback(() => {
    setLoading(true);
    setError(null);
    getCommitteeComplaints({
      search,
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
    })
      .then((res) => {
        if (res.success) {
          setComplaints(res.data);
          setIsMockData(res.isMock);
        } else {
          setError(res.error || 'Failed to load complaints from backend.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Network communication failure.');
        setLoading(false);
      });
  }, [search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    let isMounted = true;
    getCommitteeComplaints({
      search,
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
    })
      .then((res) => {
        if (isMounted) {
          if (res.success) {
            setComplaints(res.data);
            setIsMockData(res.isMock);
            // If route specifies a complaint ID, automatically open it
            if (routeComplaintId) {
              const match = res.data.find((c) => c.id === routeComplaintId);
              if (match) {
                setSelectedComplaint(match);
                setSelectedComplaintForAi(match);
                setDetailModalOpen(true);
              }
            }
          } else {
            setError(res.error || 'Failed to query complaints.');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Error communicating with service.');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, priorityFilter, categoryFilter, routeComplaintId]);

  const handleOpenDetail = (complaint, tab = 'overview') => {
    const fullComplaint = complaints.find((c) => c.id === complaint.id) || complaint;
    setSelectedComplaint(fullComplaint);
    setModalInitialTab(tab);
    setDetailModalOpen(true);
  };

  return (
    <DashboardLayout
      activeRole={ROLES.COMMITTEE}
      title="Committee Operations Desk"
      subtitle="Operational case queue for municipal grievance inspection, dispatch, and SLA verification."
      primaryAction={
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700 bg-[#FFFDF9] px-3 py-2 rounded-xl border border-[#D8CEBA] shadow-2xs">
            Officer Badge: {user.badgeId || 'OFF-7720-BLR'}
          </span>
        </div>
      }
    >
      {/* Simulation / Mock Banner */}
      {isMockData && (
        <div className="mb-6 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Officer Notice:</strong> Displaying assigned municipal case fixtures. Live rows
              require connection to <code>GET /api/v1/committee/complaints</code>.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-amber-200/80 px-2 py-0.5 rounded text-amber-950 shrink-0">
            CASE SIMULATION
          </span>
        </div>
      )}

      {/* Render sub-view via Outlet */}
      <Outlet
        context={{
          complaints,
          loading,
          error,
          reloadComplaints,
          handleOpenDetail,
          search,
          setSearch,
          statusFilter,
          setStatusFilter,
          priorityFilter,
          setPriorityFilter,
          categoryFilter,
          setCategoryFilter,
          departmentFilter,
          setDepartmentFilter,
          sortBy,
          setSortBy,
          activeQueueTab,
          setActiveQueueTab,
          selectedComplaintForAi,
          setSelectedComplaintForAi,
        }}
      />

      {/* Case Management Modal (Committee View Active) */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={detailModalOpen}
        initialTab={modalInitialTab}
        onClose={() => setDetailModalOpen(false)}
        isCommitteeView={true}
        onComplaintUpdated={reloadComplaints}
      />
    </DashboardLayout>
  );
}
