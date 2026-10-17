import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Info,
  AlertTriangle,
  AlertOctagon,
  X,
  Terminal,
} from 'lucide-react';
import DataTable from '../common/DataTable';
import LoadingState from '../common/LoadingState';
import { getAuditActivityLogs } from '../../services/analyticsService';
import { formatDate } from '../../utils/formatters';

/**
 * SystemAuditSection
 * Platform security and operational audit trail inspector.
 * 
 * BACKEND INTEGRATION:
 * 1. GET /api/v1/admin/activity
 * 2. The PostgreSQL backend is the authoritative source of audit records.
 * 3. Frontend logging is for administrative inspection only; the backend
 *    independently records all state transitions, elevation events, and critical errors.
 */
export default function SystemAuditSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  // Detail Inspector Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  useEffect(() => {
    getAuditActivityLogs().then((res) => {
      setLoading(false);
      if (res.success) {
        setLogs(res.data);
      }
    });
  }, []);

  const handleInspect = (log) => {
    setSelectedLog(log);
    setInspectModalOpen(true);
  };

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.event.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.id && log.id.toLowerCase().includes(q)) ||
      (log.ip && log.ip.toLowerCase().includes(q));

    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;

    let matchesEventType = true;
    if (eventTypeFilter === 'ticket') {
      matchesEventType = log.event.includes('TICKET') || log.event.includes('STATUS');
    } else if (eventTypeFilter === 'user') {
      matchesEventType = log.event.includes('USER') || log.event.includes('ROLE') || log.event.includes('CITIZEN');
    } else if (eventTypeFilter === 'authority') {
      matchesEventType = log.event.includes('AUTHORITY') || log.event.includes('WORKORDER');
    }

    return matchesSearch && matchesSeverity && matchesEventType;
  });

  // Extract affected record ID from details if present (e.g. CF-2026-0891 or usr-007)
  const extractRecordId = (log) => {
    const ticketMatch = log.details?.match(/(CF-\d{4}-\d{4})/);
    if (ticketMatch) return ticketMatch[1];
    const userMatch = log.details?.match(/(usr-\d+)/);
    if (userMatch) return userMatch[1];
    const authMatch = log.details?.match(/(AUTH-[A-Z0-9-]+)/);
    if (authMatch) return authMatch[1];
    return 'System Target';
  };

  const columns = [
    {
      key: 'event',
      title: 'Audit Action / Event',
      render: (evt, row) => (
        <div className="flex items-center gap-2">
          {row.severity === 'danger' ? (
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          ) : row.severity === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
          )}
          <div>
            <span className="font-mono font-bold text-navy text-xs block">{evt}</span>
            <span className="text-[10.5px] text-muted font-mono">{row.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'actor',
      title: 'Actor / Subsystem',
      render: (actor) => (
        <div className="text-xs">
          <span className="font-bold text-navy block truncate max-w-[160px]">{actor}</span>
          <span className="text-[10.5px] text-muted font-mono">Authenticated Caller</span>
        </div>
      ),
    },
    {
      key: 'record',
      title: 'Affected Entity',
      render: (_, row) => {
        const recordId = extractRecordId(row);
        return (
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 tabular-nums">
            {recordId}
          </span>
        );
      },
    },
    {
      key: 'details',
      title: 'Operation Details',
      render: (det) => (
        <p className="text-navy/80 text-xs leading-relaxed max-w-sm truncate" title={det}>
          {det}
        </p>
      ),
    },
    {
      key: 'severity',
      title: 'Level',
      render: (sev) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider ${
            sev === 'danger'
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : sev === 'warning'
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {sev}
        </span>
      ),
    },
    {
      key: 'timestamp',
      title: 'Timestamp & IP',
      render: (t, row) => (
        <div className="text-right">
          <span className="font-mono text-[11px] text-navy block tabular-nums">{formatDate(t)}</span>
          <span className="font-mono text-[10px] text-muted">{row.ip || '10.24.10.4'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Inspect',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleInspect(row);
          }}
          className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-canvas text-[11px] font-bold text-navy transition-colors cursor-pointer shadow-2xs"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Notice Callout */}
      <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3 text-xs text-muted shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Authoritative Immutable Ledger:</strong> Every administrative modification, state transition,
            and role elevation is signed and cryptographically persisted by the PostgreSQL audit observer.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200 shrink-0">
          IMMUTABLE LEDGER
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            id="audit-search-input"
            aria-label="Search audit trail by event, actor, or description"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by event, actor, ticket ID, or IP..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            id="audit-event-type-filter"
            aria-label="Filter by event category"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Event Types</option>
            <option value="ticket">Ticket &amp; Status Events</option>
            <option value="user">User &amp; Role Events</option>
            <option value="authority">Authority &amp; Work Orders</option>
          </select>

          <select
            id="audit-severity-filter"
            aria-label="Filter audit logs by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>

          {(search || severityFilter !== 'all' || eventTypeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSeverityFilter('all');
                setEventTypeFilter('all');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border text-xs font-bold text-muted hover:text-navy cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Audit Table */}
      {loading ? (
        <LoadingState message="Fetching system audit ledger..." />
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredLogs}
            onRowClick={handleInspect}
            emptyMessage="No audit logs match the selected filter criteria."
          />
        </div>
      )}

      {/* Audit Event Detail Inspection Modal */}
      {inspectModalOpen && selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border text-left space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                <h3 className="text-base font-extrabold text-navy">Audit Event Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 rounded-xl border border-border text-muted hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted">Event Descriptor</span>
                <span className="font-mono text-sm font-bold text-navy block">{selectedLog.event}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted">Actor Identity</span>
                  <span className="font-semibold text-navy block">{selectedLog.actor}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted">Severity Level</span>
                  <span className="font-bold capitalize text-primary">{selectedLog.severity}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted">Origin Address</span>
                  <span className="font-mono text-navy block">{selectedLog.ip || '10.24.10.4'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted">Timestamp</span>
                  <span className="font-mono text-navy block">{formatDate(selectedLog.timestamp)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted">Operation Payload / Remarks</span>
                <p className="text-navy font-mono text-[11px] leading-relaxed p-2 rounded-lg bg-surface border border-border/60">
                  {selectedLog.details}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
