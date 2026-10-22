import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, Search, Wrench, Users, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import CategoryIcon from '../../components/icons3d/CategoryIcon';
import { ErrorBox, btnSecondary } from '../../components/reports/ui';
import { listAllReports } from '../../services/reportService';
import { errorText } from '../../services/apiClient';
import { getCurrentUser } from '../../services/authService';
import { CIVIC_CATEGORIES, categoryLabel } from '../../constants/civicCategories';
import { STATUS_FILTER_OPTIONS, OPEN_FILTER, matchesStatusFilter } from '../../constants/complaintStatuses';
import { ROLES } from '../../constants/roles';
import { formatDate } from '../../utils/formatters';
import { staggerContainer, fadeUp } from '../../lib/motion';

/**
 * OfficialDashboardPage
 * Officials see every report (GET /reports). They open a report to change
 * its status or add after-repair photos. They cannot edit reports, see
 * drafts, or vote on repairs.
 */
export default function OfficialDashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(OPEN_FILTER);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('oldest');

  const load = useCallback(async () => {
    setRefreshing(true);
    const res = await listAllReports();
    if (res.ok) {
      setReports(res.data);
      setError('');
    } else {
      setError(errorText(res.error));
    }
    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const count = (status) => reports.filter((r) => r.status === status).length;

  const visible = reports
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

  const openReport = (report) => navigate(`/official/reports/${report.id}`);

  const columns = [
    {
      key: 'title',
      title: 'Report',
      render: (title, row) => (
        <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md">
          <CategoryIcon category={row.category || 'other'} size={24} />
          <div className="min-w-0">
            <span className="font-bold text-navy block truncate">{title}</span>
            <span className="text-[11px] text-muted font-medium truncate block">
              {categoryLabel(row.category)}
              {row.location_text ? ` • ${row.location_text}` : ''}
            </span>
          </div>
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
      key: 'support_count',
      title: 'Me too',
      align: 'right',
      render: (n) => <span className="tabular-nums font-semibold text-navy">{n}</span>,
    },
    {
      key: 'updated_at',
      title: 'Last change',
      render: (d) => <span className="text-muted font-mono text-[11px] tabular-nums">{formatDate(d)}</span>,
    },
  ];

  const statCard = (title, status, Icon, accentColor, subtext) => (
    <motion.div variants={fadeUp}>
      <StatCard
        title={title}
        value={count(status)}
        icon={Icon}
        accentColor={accentColor}
        subtext={subtext}
        onClick={() => setStatusFilter(statusFilter === status ? OPEN_FILTER : status)}
      />
    </motion.div>
  );

  return (
    <DashboardLayout
      activeRole={ROLES.OFFICIAL}
      title="Reports queue"
      subtitle={`Signed in as ${user?.name || 'official'}. Review reports, record progress, and claim repairs with photos.`}
      primaryAction={
        <button type="button" className={btnSecondary} onClick={load} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
    >
      <motion.div
        variants={staggerContainer(0.06, 0.04)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
      >
        {statCard('New', 'reported', Inbox, 'amber', 'Not reviewed yet')}
        {statCard('Under review', 'under_review', Search, 'blue', 'Being looked at')}
        {statCard('In progress', 'in_progress', Wrench, 'teal', 'Repair started')}
        {statCard('Awaiting residents', 'awaiting_verification', Users, 'purple', 'Repair claimed, being checked')}
      </motion.div>

      <div className="mb-5">
        <FilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, description or place..."
          totalResults={visible.length}
          onReset={() => {
            setSearch('');
            setStatusFilter(OPEN_FILTER);
            setCategoryFilter('all');
            setSortBy('oldest');
          }}
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
                { value: 'oldest', label: 'Oldest first' },
                { value: 'newest', label: 'Newest first' },
              ],
            },
          ]}
        />
      </div>

      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <DashboardSkeleton count={4} />
      ) : visible.length === 0 ? (
        !error && <EmptyState title="No reports here" description="No report matches these filters." />
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <DataTable columns={columns} data={visible} onRowClick={openReport} />
        </div>
      )}
    </DashboardLayout>
  );
}
