import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  Wrench,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import ComplaintCard from '../../components/complaints/ComplaintCard';
import { ErrorBox } from '../../components/reports/ui';
import { listAllReports } from '../../services/reportService';
import { errorText } from '../../services/apiClient';
import { getCurrentUser } from '../../services/authService';
import { CIVIC_CATEGORIES, categoryLabel } from '../../constants/civicCategories';
import { STATUS_FILTER_OPTIONS, OPEN_FILTER, matchesStatusFilter } from '../../constants/complaintStatuses';
import { formatDate } from '../../utils/formatters';
import { ROLES } from '../../constants/roles';
import { staggerContainer, fadeUp } from '../../lib/motion';

/**
 * CitizenDashboardPage
 * The citizen's own reports (GET /reports returns only theirs), with counts,
 * search, filters and a card or table view. Opening a report goes to
 * /citizen/reports/:id.
 */
export default function CitizenDashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(OPEN_FILTER);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const loadReports = useCallback(async () => {
    setIsRefreshing(true);
    const res = await listAllReports();
    if (res.ok) {
      setReports(res.data);
      setError('');
    } else {
      setError(errorText(res.error));
    }
    setIsRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = reports
    .filter((r) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.location_text || '').toLowerCase().includes(q);
      const matchesStatus = matchesStatusFilter(r.status, statusFilter);
      const matchesCategory =
        categoryFilter === 'all' || (categoryFilter === 'none' ? !r.category : r.category === categoryFilter);
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? diff : -diff;
    });

  const count = (...statuses) => reports.filter((r) => statuses.includes(r.status)).length;
  const hasFilters = search || statusFilter !== OPEN_FILTER || categoryFilter !== 'all';
  // Closed (withdrawn) reports are hidden by default, not deleted.
  const hiddenClosed = statusFilter === OPEN_FILTER ? count('closed') : 0;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter(OPEN_FILTER);
    setCategoryFilter('all');
    setSortBy('newest');
  };

  const openReport = (report) => navigate(`/citizen/reports/${report.id}`);

  const columns = [
    {
      key: 'title',
      title: 'Report',
      render: (title, row) => (
        <div className="max-w-xs sm:max-w-md">
          <span className="font-bold text-navy block truncate">{title}</span>
          <span className="text-[11px] text-muted font-medium truncate block">
            {categoryLabel(row.category)}
            {row.location_text ? ` • ${row.location_text}` : ''}
          </span>
        </div>
      ),
    },
    { key: 'status', title: 'Status', render: (st) => <StatusBadge status={st} /> },
    {
      key: 'created_at',
      title: 'Reported',
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
            openReport(row);
          }}
          className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-primary transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          Open
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="My reports"
      subtitle="Report civic problems and follow what happens to them."
      // The sidebar has "Report new issue" on wide screens; on phones the
      // sidebar is folded away, so the button is shown here instead.
      primaryAction={
        <button
          type="button"
          onClick={() => navigate('/citizen/report')}
          className="lg:hidden inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report new issue</span>
        </button>
      }
    >
      {/* Welcome */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-border shadow-2xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-navy tracking-tight">
              Welcome back, {user?.name || 'Citizen'}!
            </h2>
            <p className="text-xs text-muted leading-relaxed max-w-2xl">
              Follow your reports, approve complaint drafts, and check repairs officials say are done.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReports}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-canvas hover:bg-surface text-xs font-bold text-navy transition-colors cursor-pointer shadow-2xs disabled:opacity-50 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Counts */}
      <motion.div
        variants={staggerContainer(0.06, 0.04)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            title="Open reports"
            value={reports.length - count('closed')}
            icon={FileText}
            accentColor="emerald"
            subtext={count('closed') ? `${count('closed')} closed, not counted` : 'Everything not closed'}
            onClick={() => setStatusFilter(OPEN_FILTER)}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard title="Waiting" value={count('reported', 'under_review')} icon={Clock} accentColor="amber" subtext="Reported or under review" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            title="Being repaired"
            value={count('in_progress', 'awaiting_verification')}
            icon={Wrench}
            accentColor="teal"
            subtext="In progress or awaiting your check"
            onClick={() => navigate('/citizen/verifications')}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard title="Resolved" value={count('resolved')} icon={CheckCircle2} accentColor="blue" subtext="Confirmed by residents" />
        </motion.div>
      </motion.div>

      {/* Filters */}
      <div className="space-y-3 mb-5">
        <FilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, description or place..."
          totalResults={filteredReports.length}
          onReset={resetFilters}
          filters={[
            {
              id: 'status',
              label: 'Filter by status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: STATUS_FILTER_OPTIONS,
            },
            {
              id: 'category',
              label: 'Filter by category',
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: [
                { value: 'all', label: 'All categories' },
                ...CIVIC_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
                { value: 'none', label: 'Category not set' },
              ],
            },
            {
              id: 'sort',
              label: 'Sort by date',
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
              ],
            },
          ]}
        />

        <div className="flex items-center justify-between text-xs text-muted">
          <div className="font-semibold">
            Showing <span className="font-bold text-navy">{filteredReports.length}</span> reports
            {hiddenClosed > 0 && (
              <>
                {' · '}
                {hiddenClosed} closed hidden{' '}
                <button
                  type="button"
                  onClick={() => setStatusFilter('closed')}
                  className="font-bold text-primary underline cursor-pointer"
                >
                  Show closed
                </button>
              </>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 bg-surface rounded-xl border border-border shadow-2xs">
            {[
              { mode: 'grid', label: 'Cards', Icon: LayoutGrid },
              { mode: 'table', label: 'Table', Icon: TableIcon },
            ].map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === mode ? 'bg-primary text-white shadow-2xs' : 'text-muted hover:text-navy hover:bg-surface-canvas'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ErrorBox>{error}</ErrorBox>

      {loading ? (
        <DashboardSkeleton count={4} />
      ) : filteredReports.length === 0 ? (
        !error && (
          <EmptyState
            {...(hasFilters
              ? {
                  title: 'No matching reports',
                  description: 'Try other search words or clear the filters.',
                  actionLabel: 'Clear filters',
                  onAction: resetFilters,
                }
              : hiddenClosed > 0
              ? {
                  title: 'No open reports',
                  description: 'All your reports are closed. They are kept, just hidden from this list.',
                  actionLabel: 'Show closed reports',
                  onAction: () => setStatusFilter('closed'),
                }
              : {
                  title: "You haven't reported anything yet",
                  description: 'Seen a pothole, overflowing garbage or a broken streetlight? Report it here.',
                  actionLabel: 'Report your first issue',
                  onAction: () => navigate('/citizen/report'),
                })}
          />
        )
      ) : viewMode === 'grid' ? (
        <motion.div
          variants={staggerContainer(0.04, 0.02)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredReports.map((r) => (
            <motion.div key={r.id} variants={fadeUp}>
              <ComplaintCard complaint={r} onSelect={openReport} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <DataTable columns={columns} data={filteredReports} onRowClick={openReport} />
        </div>
      )}
    </DashboardLayout>
  );
}
