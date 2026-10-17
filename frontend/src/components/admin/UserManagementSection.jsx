import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Shield,
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  XCircle,
  X,
  FileText,
} from 'lucide-react';
import DataTable from '../common/DataTable';
import LoadingState from '../common/LoadingState';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { formatDate } from '../../utils/formatters';
import { getAdminUsers, updateUserRole, updateUserStatus } from '../../services/userService';
import { ROLES } from '../../constants/roles';
import { useToast } from '../../context/ToastContext';

/**
 * UserManagementSection
 * Platform user directory with role elevation, account suspension, and detail inspection.
 * 
 * BACKEND INTEGRATION:
 * 1. GET /api/v1/admin/users
 * 2. PATCH /api/v1/admin/users/{id}/role
 * 3. PATCH /api/v1/admin/users/{id}/status
 * 
 * SECURITY INVARIANT:
 * Changing user roles or account status MUST require administrator credentials verified
 * on the backend. Frontend guards are purely for UX and never substitute for backend RBAC.
 */
export default function UserManagementSection() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // User Detail Modal
  const [detailUser, setDetailUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Confirmation Modal State
  const [targetUser, setTargetUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'role' | 'status'
  const [newSelectedRole, setNewSelectedRole] = useState(ROLES.COMMITTEE);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const reloadUsers = useCallback(() => {
    setLoading(true);
    getAdminUsers({
      search,
      role: roleFilter,
      status: statusFilter,
    }).then((res) => {
      if (res.success) {
        setUsers(res.data);
      }
      setLoading(false);
    });
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    getAdminUsers({
      search,
      role: roleFilter,
      status: statusFilter,
    }).then((res) => {
      if (isMounted) {
        if (res.success) {
          setUsers(res.data);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [search, roleFilter, statusFilter]);

  const handleOpenDetailModal = (u) => {
    setDetailUser(u);
    setDetailModalOpen(true);
  };

  const handleOpenRoleModal = (u) => {
    setTargetUser(u);
    setActionType('role');
    setNewSelectedRole(u.role === ROLES.CITIZEN ? ROLES.COMMITTEE : ROLES.CITIZEN);
    setConfirmModalOpen(true);
  };

  const handleOpenStatusModal = (u) => {
    setTargetUser(u);
    setActionType('status');
    setConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!targetUser) return;

    if (actionType === 'role') {
      const res = await updateUserRole(targetUser.id, newSelectedRole);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Role Updated',
          message: `${targetUser.name}'s platform role set to ${newSelectedRole.toUpperCase()}.`,
        });
        reloadUsers();
      } else {
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: res.error || 'Failed to update user role.',
        });
      }
    } else if (actionType === 'status') {
      const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
      const res = await updateUserStatus(targetUser.id, newStatus);
      if (res.success) {
        showToast({
          type: newStatus === 'active' ? 'success' : 'warning',
          title: newStatus === 'active' ? 'Account Activated' : 'Account Suspended',
          message: `Account status for ${targetUser.name} changed to ${newStatus}.`,
        });
        reloadUsers();
      } else {
        showToast({
          type: 'error',
          title: 'Action Failed',
          message: res.error || 'Failed to update user status.',
        });
      }
    }

    setConfirmModalOpen(false);
  };

  const columns = [
    {
      key: 'name',
      title: 'User Profile & Identity',
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-300 shadow-2xs">
            {u.name.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-navy block truncate max-w-[180px]">{u.name}</span>
            <span className="text-[11px] text-muted block truncate max-w-[180px]">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role Privilege',
      render: (role) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            role === ROLES.ADMIN
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : role === ROLES.COMMITTEE
              ? 'bg-teal-50 text-teal-800 border-teal-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <Shield className="w-3 h-3" />
          <span>{role === ROLES.ADMIN ? 'Administrator' : role === ROLES.COMMITTEE ? 'Committee Officer' : 'Citizen'}</span>
        </span>
      ),
    },
    {
      key: 'department',
      title: 'Jurisdiction / Division',
      render: (dept) => (
        <span className="text-navy/80 text-xs font-semibold block truncate max-w-[180px]">
          {dept || 'General Jurisdiction'}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Account Status',
      render: (st) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider ${
            st === 'active'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}
        >
          {st === 'active' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
          <span>{st}</span>
        </span>
      ),
    },
    {
      key: 'lastActive',
      title: 'Last Active',
      render: (d) => <span className="text-muted text-[11px] font-mono tabular-nums">{formatDate(d)}</span>,
    },
    {
      key: 'actions',
      title: 'Administrative Actions',
      align: 'right',
      render: (_, u) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetailModal(u);
            }}
            className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-canvas text-[11px] font-bold text-navy transition-colors cursor-pointer shadow-2xs"
          >
            Details
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRoleModal(u);
            }}
            className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-canvas text-[11px] font-bold text-primary transition-colors cursor-pointer shadow-2xs"
          >
            Role
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenStatusModal(u);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
              u.status === 'active'
                ? 'border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {u.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Backend Security Invariant Notice */}
      <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-3 text-xs text-muted shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>RBAC Security Policy:</strong> User permissions and status updates require signed administrator credentials.
            Frontend checks never substitute for backend server-verified authorization.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
          RBAC PROTECTED
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            id="user-search-input"
            aria-label="Search users by name, email, or phone"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or phone..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            id="user-role-filter"
            aria-label="Filter users by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value={ROLES.CITIZEN}>Citizens</option>
            <option value={ROLES.COMMITTEE}>Committee Officers</option>
            <option value={ROLES.ADMIN}>Administrators</option>
          </select>

          <select
            id="user-status-filter"
            aria-label="Filter users by account status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-canvas border border-border text-xs font-semibold text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingState message="Fetching user directory records..." />
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-2xs overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            onRowClick={handleOpenDetailModal}
            emptyMessage="No platform users found matching query."
          />
        </div>
      )}

      {/* User Detail Inspection Modal */}
      {detailModalOpen && detailUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border text-left space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-300">
                  {detailUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy">{detailUser.name}</h3>
                  <span className="text-xs text-muted font-mono">{detailUser.id}</span>
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
                    <Mail className="w-3 h-3" /> Email
                  </span>
                  <span className="font-semibold text-navy truncate block">{detailUser.email}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </span>
                  <span className="font-semibold text-navy block font-mono">{detailUser.phone || '+91 98450 12345'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Assigned Role
                  </span>
                  <span className="font-bold text-primary capitalize">{detailUser.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Building className="w-3 h-3" /> Department
                  </span>
                  <span className="font-semibold text-navy block truncate">{detailUser.department}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Registered
                  </span>
                  <span className="font-mono text-navy">{formatDate(detailUser.registeredAt || '2025-08-14')}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last Active
                  </span>
                  <span className="font-mono text-navy">{formatDate(detailUser.lastActive)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-canvas border border-border flex items-center justify-between">
                <span className="text-muted flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Complaints / Work Orders Count:</span>
                </span>
                <span className="font-mono font-bold text-navy">{detailUser.reportsCount || 0} Records</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenRoleModal(detailUser);
                }}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-navy hover:bg-surface-canvas cursor-pointer"
              >
                Change Role
              </button>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Role Elevation & Suspension */}
      <ConfirmationDialog
        isOpen={confirmModalOpen}
        title={
          actionType === 'role'
            ? `Modify Role for ${targetUser?.name}`
            : `${targetUser?.status === 'active' ? 'Suspend' : 'Activate'} User Account`
        }
        message={
          actionType === 'role'
            ? `Are you sure you want to change the platform role of ${targetUser?.email} to ${newSelectedRole.toUpperCase()}? This modifies their municipal operational authority and access permissions.`
            : `Are you sure you want to ${targetUser?.status === 'active' ? 'suspend' : 're-activate'} ${targetUser?.name}'s account access? Suspended users will be immediately logged out and blocked from filing or managing civic issues.`
        }
        confirmLabel={actionType === 'role' ? 'Confirm Role Change' : 'Confirm Status Change'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModalOpen(false)}
        isDestructive={actionType === 'status' && targetUser?.status === 'active'}
      />
    </div>
  );
}
