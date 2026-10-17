import React from 'react';
import { useNavigate } from 'react-router-dom';
import CivicHeader from '../components/CivicHeader';
import { authStorage } from '../services/apiClient';
import { setActiveRolePreview } from '../services/authService';
import { ROLES, ROLE_PATHS } from '../constants/roles';
import { User, Shield, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';

/**
 * DashboardPreview / Role Dispatcher
 * Automatically routes authenticated users to their role-specific dashboard,
 * while providing an institutional role portal selector for rapid demonstration.
 */
export default function DashboardPreview() {
  const navigate = useNavigate();
  const user = authStorage.getUser() || { email: sessionStorage.getItem('civicfix_user_email') || 'citizen@civicfix.ai' };

  const handleSelectRole = (role) => {
    setActiveRolePreview(role);
    navigate(ROLE_PATHS[role]);
  };

  const handleSignOut = () => {
    authStorage.clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FAF6EB] text-[#1C1917] p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full pb-6 border-b border-[#E5DAC4]">
        <CivicHeader />
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8CEBA] bg-[#FFFDF9] hover:bg-[#FAF6ED] text-xs font-bold text-stone-700 transition-colors shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full my-auto py-8">
        <div className="bg-[#FFFDF9] rounded-3xl p-8 sm:p-12 border border-[#EBE3D0] shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-4 border border-emerald-300/60">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Authenticated Civic Session &bull; Role Authorization Active</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mb-2 tracking-tight">
            CivicFix AI Role Dashboard Portal
          </h1>
          <p className="text-sm text-slate-600 mb-8 max-w-2xl">
            Logged in as <strong className="text-[#0F172A] font-semibold">{user.email}</strong>. Select your authorized municipal workspace below to proceed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Citizen Role Card */}
            <div
              onClick={() => handleSelectRole(ROLES.CITIZEN)}
              className="p-6 rounded-2xl bg-white border border-[#EBE3D0] hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-[#0F172A] text-lg mb-1 group-hover:text-emerald-700 transition-colors">
                  Normal Citizen
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Report civic infrastructure hazards, track repair milestones, and receive notifications from municipal officers.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Enter Citizen Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Committee Member Role Card */}
            <div
              onClick={() => handleSelectRole(ROLES.COMMITTEE)}
              className="p-6 rounded-2xl bg-white border border-[#EBE3D0] hover:border-teal-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4 border border-teal-200">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-[#0F172A] text-lg mb-1 group-hover:text-teal-700 transition-colors">
                  Committee Member
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Operational case workspace for municipal officers. Triage reports, dispatch field crews, update statuses, and log internal notes.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
                <span>Enter Operations Desk</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Administrator Role Card */}
            <div
              onClick={() => handleSelectRole(ROLES.ADMIN)}
              className="p-6 rounded-2xl bg-white border border-[#EBE3D0] hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 border border-purple-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-[#0F172A] text-lg mb-1 group-hover:text-purple-700 transition-colors">
                  System Administrator
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Platform oversight console. Monitor SLA velocity, manage user RBAC roles, maintain the verified authority directory, and audit logs.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-500 py-4 max-w-5xl mx-auto w-full">
        &copy; 2026 CivicFix AI &bull; Smart Civic Tech Platform
      </footer>
    </div>
  );
}
