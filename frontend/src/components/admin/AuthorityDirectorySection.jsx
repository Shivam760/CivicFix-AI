import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  ExternalLink,
  Building,
  User,
  Mail,
  Phone,
  X,
  MapPin,
  Activity,
} from 'lucide-react';
import DataTable from '../common/DataTable';
import LoadingState from '../common/LoadingState';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { getAuthorities, createAuthority, toggleAuthorityStatus } from '../../services/authorityService';
import { CIVIC_CATEGORIES } from '../../constants/civicCategories';
import { useToast } from '../../context/ToastContext';

/**
 * AuthorityDirectorySection
 * Verified Municipal Authority Directory management interface.
 * 
 * BACKEND INTEGRATION:
 * The authority directory is the single source of truth for grievance dispatch routing.
 * Endpoints:
 * - GET /api/v1/admin/authorities
 * - POST /api/v1/admin/authorities
 * - PATCH /api/v1/admin/authorities/{id}/status
 */
export default function AuthorityDirectorySection() {
  const { showToast } = useToast();
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Authority Detail Modal
  const [detailAuth, setDetailAuth] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Status Toggle Confirmation
  const [targetAuth, setTargetAuth] = useState(null);
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);

  // New Authority Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAuthData, setNewAuthData] = useState({
    name: '',
    department: '',
    jurisdictionZone: 'Bengaluru Urban',
    category: 'pothole',
    headOfficer: '',
    email: '',
    phone: '',
    portalUrl: '',
  });

  const reloadAuthorities = useCallback(() => {
    setLoading(true);
    getAuthorities({ search, category: categoryFilter }).then((res) => {
      if (res.success) {
        setAuthorities(res.data);
      }
      setLoading(false);
    });
  }, [search, categoryFilter]);

  useEffect(() => {
    let isMounted = true;
    getAuthorities({ search, category: categoryFilter }).then((res) => {
      if (isMounted) {
        if (res.success) {
          setAuthorities(res.data);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [search, categoryFilter]);

  const handleOpenStatusConfirm = (auth) => {
    setTargetAuth(auth);
    setStatusConfirmModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetAuth) return;
    const res = await toggleAuthorityStatus(targetAuth.id, targetAuth.status);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Authority Status Updated',
        message: `${targetAuth.department} is now ${res.status}.`,
      });
      reloadAuthorities();
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to toggle authority status.',
      });
    }
    setStatusConfirmModalOpen(false);
  };

  const handleCreateAuthority = async (e) => {
    e.preventDefault();
    if (!newAuthData.name.trim() || !newAuthData.department.trim()) return;

    const res = await createAuthority({
      ...newAuthData,
      name: newAuthData.name.trim(),
      department: newAuthData.department.trim(),
      headOfficer: newAuthData.headOfficer.trim() || 'Executive Engineer',
      email: newAuthData.email.trim(),
      phone: newAuthData.phone.trim(),
      portalUrl: newAuthData.portalUrl.trim() || undefined,
    });

    if (res.success) {
      showToast({
        type: 'success',
        title: 'Authority Registered',
        message: `${newAuthData.department} added to verified directory.`,
      });
      setIsAddModalOpen(false);
      setNewAuthData({
        name: '',
        department: '',
        jurisdictionZone: 'Bengaluru Urban',
        category: 'pothole',
        headOfficer: '',
        email: '',
        phone: '',
        portalUrl: '',
      });
      reloadAuthorities();
    } else {
      showToast({
        type: 'error',
        title: 'Registration Error',
        message: res.error || 'Failed to register authority entity.',
      });
    }
  };

  const getWorkloadMeta = (tickets) => {
    if (tickets > 45) return { label: 'High Load', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (tickets > 25) return { label: 'Moderate', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const columns = [
    {
      key: 'name',
      title: 'Department & Authority',
      render: (_, a) => (
        <div className="max-w-xs">
          <div className="flex items-center gap-1.5 font-bold text-navy">
            <span className="truncate">{a.department}</span>
            {a.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Verified Municipal Authority" />
            )}
          </div>
          <span className="text-xs text-muted font-medium block truncate">{a.name}</span>
          <span className="text-[10.5px] text-muted font-mono">{a.id}</span>
        </div>
      ),
    },
    {
      key: 'headOfficer',
      title: 'Responsible Officer',
      render: (officer) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-navy">
          <User className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="truncate max-w-[140px]">{officer || 'Executive Engineer'}</span>
        </div>
      ),
    },
    {
      key: 'categoryLabel',
      title: 'Domain',
      render: (cat, a) => (
        <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
          {cat || a.category}
        </span>
      ),
    },
    {
      key: 'activeTickets',
      title: 'Assigned Workload',
      render: (tickets) => {
        const workload = getWorkloadMeta(tickets);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-navy tabular-nums">{tickets} cases</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${workload.color}`}>
                {workload.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (st) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            st === 'active'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-surface-canvas text-muted border border-border'
          }`}
        >
          {st}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (_, a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailAuth(a);
              setDetailModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-canvas text-[11px] font-bold text-navy transition-colors cursor-pointer shadow-2xs"
          >
            Details
          </button>
          {a.portalUrl && (
            <a
              href={a.portalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg border border-border bg-surface hover:bg-surface-canvas text-muted hover:text-navy transition-colors cursor-pointer"
              title="Official Municipal Portal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenStatusConfirm(a);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
              a.status === 'active'
                ? 'border-border bg-surface hover:bg-surface-canvas text-muted hover:text-navy'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {a.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Directory Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            id="authority-search-input"
            aria-label="Search authorities by name, department, or jurisdiction"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search authorities by name, department, or jurisdiction..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            id="authority-category-filter"
            aria-label="Filter authorities by service domain"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Service Domains</option>
            {CIVIC_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Authority</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <LoadingState message="Fetching verified authority records..." />
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <DataTable
            columns={columns}
            data={authorities}
            onRowClick={(a) => {
              setDetailAuth(a);
              setDetailModalOpen(true);
            }}
            emptyMessage="No municipal authorities found matching query."
          />
        </div>
      )}

      {/* Authority Details Inspection Modal */}
      {detailModalOpen && detailAuth && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border text-left space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy">{detailAuth.department}</h3>
                  <span className="text-xs text-muted">{detailAuth.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-xl border border-border text-muted hover:text-navy cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <User className="w-3 h-3" /> Responsible Officer
                  </span>
                  <span className="font-bold text-navy block">{detailAuth.headOfficer || 'Executive Engineer'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Active Workload
                  </span>
                  <span className="font-mono font-bold text-primary block">{detailAuth.activeTickets} Active Cases</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Official Dispatch Email
                  </span>
                  <span className="font-mono text-navy truncate block">{detailAuth.email || 'dispatch@bbmp.gov.in'}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Official Phone
                  </span>
                  <span className="font-mono text-navy block">{detailAuth.phone || '+91 80 2297 5500'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Jurisdiction Area
                </span>
                <span className="font-semibold text-navy block">{detailAuth.jurisdictionZone}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              {detailAuth.portalUrl && (
                <a
                  href={detailAuth.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Visit Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Authority Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border text-left my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="text-base font-extrabold text-navy">Register Municipal Authority</h3>
                <p className="text-xs text-muted">Add a verified public entity to the grievance routing directory.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl border border-border text-muted hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAuthority} className="space-y-3 text-xs">
              <div>
                <label htmlFor="new-auth-name" className="block font-bold text-navy mb-1">
                  Parent Entity / Authority Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="new-auth-name"
                  type="text"
                  required
                  placeholder="e.g. Bruhat Bengaluru Mahanagara Palike"
                  value={newAuthData.name}
                  onChange={(e) => setNewAuthData({ ...newAuthData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="new-auth-dept" className="block font-bold text-navy mb-1">
                  Division / Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="new-auth-dept"
                  type="text"
                  required
                  placeholder="e.g. Road Infrastructure Division (Mahadevapura Zone)"
                  value={newAuthData.department}
                  onChange={(e) => setNewAuthData({ ...newAuthData, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-auth-zone" className="block font-bold text-navy mb-1">Jurisdiction Zone</label>
                  <input
                    id="new-auth-zone"
                    type="text"
                    value={newAuthData.jurisdictionZone}
                    onChange={(e) => setNewAuthData({ ...newAuthData, jurisdictionZone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="new-auth-category" className="block font-bold text-navy mb-1">Primary Domain</label>
                  <select
                    id="new-auth-category"
                    value={newAuthData.category}
                    onChange={(e) => setNewAuthData({ ...newAuthData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    {CIVIC_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-auth-head" className="block font-bold text-navy mb-1">Responsible Officer</label>
                  <input
                    id="new-auth-head"
                    type="text"
                    placeholder="e.g. Er. S. Kumar"
                    value={newAuthData.headOfficer}
                    onChange={(e) => setNewAuthData({ ...newAuthData, headOfficer: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="new-auth-phone" className="block font-bold text-navy mb-1">Dispatch Phone</label>
                  <input
                    id="new-auth-phone"
                    type="text"
                    placeholder="+91 80 2297 5500"
                    value={newAuthData.phone}
                    onChange={(e) => setNewAuthData({ ...newAuthData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-auth-email" className="block font-bold text-navy mb-1">Official Dispatch Email</label>
                <input
                  id="new-auth-email"
                  type="email"
                  placeholder="dispatch.roads@bbmp.gov.in"
                  value={newAuthData.email}
                  onChange={(e) => setNewAuthData({ ...newAuthData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-surface-canvas border border-border text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-border text-muted hover:text-navy font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-emerald-600 text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Toggle */}
      <ConfirmationDialog
        isOpen={statusConfirmModalOpen}
        title={`${targetAuth?.status === 'active' ? 'Deactivate' : 'Activate'} Municipal Authority`}
        message={`Are you sure you want to ${
          targetAuth?.status === 'active' ? 'deactivate' : 'activate'
        } ${targetAuth?.department}? ${
          targetAuth?.status === 'active'
            ? 'Deactivated authorities will be excluded from automated AI intake routing and case dispatching.'
            : 'Activated authorities will immediately receive incoming civic work orders.'
        }`}
        confirmLabel={targetAuth?.status === 'active' ? 'Deactivate' : 'Activate'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusConfirmModalOpen(false)}
        isDestructive={targetAuth?.status === 'active'}
      />
    </div>
  );
}
