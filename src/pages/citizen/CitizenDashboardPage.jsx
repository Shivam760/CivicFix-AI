import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import ComplaintDetailModal from '../../components/complaints/ComplaintDetailModal';
import ReportIssueModal from '../../components/complaints/ReportIssueModal';
import { getCitizenComplaints } from '../../services/complaintService';
import { getCurrentUser } from '../../services/authService';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { formatDate } from '../../utils/formatters';
import { ROLES } from '../../constants/roles';
import { staggerContainer, fadeUp } from '../../lib/motion';

/**
 * CitizenDashboardPage
 * Modern, responsive citizen grievance intake and issue tracking portal.
 * 
 * Features:
 * - Friendly personalized welcome header with civic engagement messaging
 * - 4 core citizen metric stat cards derived from real backend data
 * - Search by ID, title, and address
 * - Filter by status and category
 * - Sort by newest or oldest
 * - Responsive view mode toggle (Card Grid vs Table view)
 * - 4-step guided grievance reporting modal with AI assistance and photo preview
 * - Comprehensive complaint detail tracking timeline modal
 */
export default function CitizenDashboardPage() {
  const user = getCurrentUser();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMockData, setIsMockData] = useState(false);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const reloadComplaints = useCallback(() => {
    setIsRefreshing(true);
    getCitizenComplaints().then((res) => {
      if (res.success) {
        setComplaints(res.data);
        setIsMockData(res.isMock);
      }
      setIsRefreshing(false);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCitizenComplaints().then((res) => {
      if (isMounted) {
        if (res.success) {
          setComplaints(res.data);
          setIsMockData(res.isMock);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter and sort complaints
  const filteredAndSortedComplaints = complaints
    .filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.location?.address && c.location.address.toLowerCase().includes(q)) ||
        (c.location?.ward && c.location.ward.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });

  // Calculate actual citizen metric statistics
  const totalComplaints = complaints.length;
  const inProgressComplaints = complaints.filter(
    (c) => c.status === 'in_progress' || c.status === 'assigned'
  ).length;
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved').length;
  const awaitingReviewComplaints = complaints.filter(
    (c) => c.status === 'submitted' || c.status === 'under_review'
  ).length;

  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setDetailModalOpen(true);
  };

  // Table Columns for desktop DataTable view
  const columns = [
    {
      key: 'id',
      title: 'Ticket ID',
      render: (id) => (
        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 tabular-nums">
          {id}
        </span>
      ),
    },
    {
      key: 'title',
      title: 'Complaint Title',
      render: (title, row) => (
        <div className="max-w-xs sm:max-w-md">
          <span className="font-bold text-navy block truncate">{title}</span>
          <span className="text-[11px] text-muted font-medium truncate block">
            {row.categoryLabel || row.category} &bull; {row.location?.address || 'Bengaluru'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (st) => <StatusBadge status={st} />,
    },
    {
      key: 'priority',
      title: 'Urgency',
      render: (pr) => <PriorityBadge priority={pr} />,
    },
    {
      key: 'createdAt',
      title: 'Reported Date',
      render: (d) => <span className="text-muted font-mono text-[11px] tabular-nums">{formatDate(d)}</span>,
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetail(row);
          }}
          className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-primary transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          Track Complaint
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="Citizen Grievance Portal"
      subtitle="Report municipal issues and track real-time resolution milestones in your ward."
      primaryAction={
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </button>
      }
    >
      {/* Simulation Notice for Offline Dev Mode */}
      {isMockData && (
        <div className="mb-4 p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Simulation Mode:</strong> Displaying citizen grievances from local cache (FastAPI backend is offline).
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-amber-700 hidden sm:inline">GET /api/v1/complaints/mine</span>
        </div>
      )}

      {/* 1. Compact Welcome Section Header */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-border shadow-2xs mb-5 relative overflow-hidden transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/25">
                ID: {user.municipalId || 'BLR-CIT-88291'} &bull; {user.ward || 'Ward 150 - Bellandur'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>AI Auto-Triage Active</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-navy tracking-tight">
              Welcome back, {user.name || 'Citizen'}!
            </h2>

            <p className="text-xs text-muted leading-relaxed max-w-2xl">
              Track progress on your active tickets, review resolution milestones, or report new neighborhood hazards.
            </p>
          </div>

          {/* Quick Sync Action */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={reloadComplaints}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-canvas hover:bg-surface text-xs font-bold text-navy transition-colors cursor-pointer shadow-2xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Refresh complaints list"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Citizen Statistics Cards */}
      <motion.div
        variants={staggerContainer(0.06, 0.04)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            title="Total Complaints"
            value={totalComplaints}
            icon={FileText}
            accentColor="emerald"
            subtext="Lifetime reports submitted"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            title="Awaiting Review"
            value={awaitingReviewComplaints}
            icon={Clock}
            accentColor="amber"
            subtext="Under municipal triage"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            title="Complaints In Progress"
            value={inProgressComplaints}
            icon={AlertTriangle}
            accentColor="teal"
            subtext="Active repair crews"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            title="Resolved Complaints"
            value={resolvedComplaints}
            icon={CheckCircle2}
            accentColor="blue"
            subtext="Verified fixed on-site"
          />
        </motion.div>
      </motion.div>

      {/* 7. Search, Filters, and Sorting Controls */}
      <div className="space-y-3 mb-5">
        <FilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search complaints by ID, title, or address..."
          totalResults={filteredAndSortedComplaints.length}
          onReset={() => {
            setSearch('');
            setStatusFilter('all');
            setCategoryFilter('all');
            setSortBy('newest');
          }}
          filters={[
            {
              id: 'status',
              label: 'Filter by Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'rejected', label: 'Rejected' },
              ],
            },
            {
              id: 'category',
              label: 'Filter by Category',
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: [
                { value: 'all', label: 'All Categories' },
                ...CIVIC_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
              ],
            },
            {
              id: 'sort',
              label: 'Sort by Date',
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
              ],
            },
          ]}
        />

        {/* View Mode Switcher Header for Desktop */}
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="font-semibold">
            Showing <span className="font-bold text-navy">{filteredAndSortedComplaints.length}</span> complaints
            {statusFilter !== 'all' && ` with status "${statusFilter}"`}
          </div>

          <div className="hidden md:flex items-center gap-1 p-1 bg-surface rounded-xl border border-border shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-muted hover:text-navy hover:bg-surface-canvas'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-muted hover:text-navy hover:bg-surface-canvas'
              }`}
              title="Compact Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 & 8. Complaints List / Card Grid with Skeleton Loading */}
      {loading ? (
        <DashboardSkeleton count={4} />
      ) : filteredAndSortedComplaints.length === 0 ? (
        <EmptyState
          title={
            search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No matching complaints found'
              : "You haven't reported any civic issues yet"
          }
          description={
            search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search terms or clearing status filters to find your complaints.'
              : 'Spot potholes, garbage dumps, or broken streetlights in your neighborhood? Submit your first issue to notify civic authorities.'
          }
          actionLabel={
            search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Clear Filters'
              : 'Report Your First Issue'
          }
          onAction={() => {
            if (search || statusFilter !== 'all' || categoryFilter !== 'all') {
              setSearch('');
              setStatusFilter('all');
              setCategoryFilter('all');
            } else {
              setReportModalOpen(true);
            }
          }}
        />
      ) : (
        <>
          {/* View Mode A: Card Grid View (Default on mobile, option on desktop) */}
          {viewMode === 'grid' ? (
            <motion.div
              variants={staggerContainer(0.04, 0.02)}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredAndSortedComplaints.map((c) => (
                <motion.div key={c.id} variants={fadeUp}>
                  <ComplaintCard complaint={c} onSelect={handleOpenDetail} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* View Mode B: Desktop Table View */
            <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
              <DataTable
                columns={columns}
                data={filteredAndSortedComplaints}
                onRowClick={handleOpenDetail}
              />
            </div>
          )}
        </>
      )}

      {/* 4. Complaint Tracking Timeline & Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        isCommitteeView={false}
        onComplaintUpdated={reloadComplaints}
      />

      {/* 5 & 6. Guided 4-Step Report Issue Modal with AI Assist */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onComplaintCreated={() => {
          reloadComplaints();
        }}
      />
    </DashboardLayout>
  );
}
