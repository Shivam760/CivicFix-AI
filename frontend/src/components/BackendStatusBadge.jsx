import React, { useEffect, useState } from 'react';
import { Server, Settings2, X, Shield } from 'lucide-react';
import { checkBackendHealth, API_BASE_URL } from '../services/apiClient';

/**
 * BackendStatusBadge
 * Developer Diagnostics & Connectivity Inspector.
 * 
 * Production Quality Rules:
 * - Strictly isolated to development builds (`import.meta.env.DEV`).
 * - Never rendered in production.
 * - Does not expose sensitive server credentials or tokens.
 */
export default function BackendStatusBadge({ devSimulation, onToggleDevSimulation }) {
  const [isOnline, setIsOnline] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let mounted = true;
    checkBackendHealth().then((res) => {
      if (mounted) {
        setIsOnline(res.isOnline);
      }
    });

    const interval = setInterval(() => {
      checkBackendHealth().then((res) => {
        if (mounted) setIsOnline(res.isOnline);
      });
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Guard against rendering in non-dev environments
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <>
      {/* Floating Development Diagnostics Badge */}
      <aside aria-label="Developer Diagnostics" className="fixed bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-40">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border shadow-xs backdrop-blur-md transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
            isOnline
              ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300'
              : devSimulation
              ? 'bg-amber-50/95 text-amber-900 border-amber-300'
              : 'bg-stone-50/95 text-stone-700 border-stone-300'
          }`}
          title="Developer Diagnostics (Dev Environment Only)"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-emerald-500 animate-pulse'
                : devSimulation
                ? 'bg-amber-500'
                : 'bg-stone-400'
            }`}
          />
          <span>
            {isOnline
              ? 'DEV: API Connected'
              : devSimulation
              ? 'DEV: Simulation Active'
              : 'DEV: Backend Offline'}
          </span>
          <Settings2 className="w-3 h-3 opacity-60 ml-0.5" />
        </button>
      </aside>

      {/* Developer Diagnostics Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-[#FFFDF9] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="api-modal-title" className="text-sm font-bold text-stone-900 m-0">
                    Developer Diagnostics
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    LOCAL ENVIRONMENT ONLY
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-stone-600 leading-relaxed">
              <div className="p-3 bg-stone-100/70 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between font-semibold text-stone-800 mb-1">
                  <span>FastAPI Service Endpoint:</span>
                  <span className="font-mono text-[11px] text-emerald-700">{API_BASE_URL}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span>
                    Health Probe (`/health`):{' '}
                    <strong className={isOnline ? 'text-emerald-700' : 'text-red-600'}>
                      {isOnline ? 'Active (200 OK)' : 'Unreachable (FastAPI not running)'}
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-900 mb-1.5 text-xs">Target Backend API Endpoints:</h3>
                <div className="space-y-1 font-mono text-[11px] bg-stone-900 text-stone-100 p-3 rounded-lg overflow-x-auto max-h-36">
                  <div className="text-emerald-400 font-bold"># Authentication</div>
                  <div>POST /api/v1/auth/login</div>
                  <div>POST /api/v1/auth/register</div>
                  <div className="text-emerald-400 font-bold mt-1"># Citizen Grievances</div>
                  <div>GET  /api/v1/complaints/mine</div>
                  <div>POST /api/v1/complaints</div>
                  <div className="text-emerald-400 font-bold mt-1"># Committee Operations</div>
                  <div>GET  /api/v1/committee/complaints</div>
                  <div>PATCH /api/v1/committee/complaints/{'{id}'}/status</div>
                  <div>POST  /api/v1/committee/complaints/{'{id}'}/updates</div>
                  <div className="text-emerald-400 font-bold mt-1"># Admin Governance</div>
                  <div>GET  /api/v1/admin/analytics</div>
                  <div>GET  /api/v1/admin/users</div>
                  <div>GET  /api/v1/admin/authorities</div>
                  <div>GET  /api/v1/admin/activity</div>
                </div>
              </div>

              {/* Dev Simulation Toggle (Dev Only) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div>
                  <div className="font-semibold text-amber-900">Offline Simulation Mode</div>
                  <div className="text-[11px] text-amber-700">
                    Allows evaluating frontend state transitions when the FastAPI server is stopped.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleDevSimulation(!devSimulation)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    devSimulation ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                  role="switch"
                  aria-checked={devSimulation}
                  aria-label="Toggle developer simulation mode"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      devSimulation ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                <Shield className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Guarantee:</strong> This diagnostic panel and offline simulation mode are automatically excluded from production builds.
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
