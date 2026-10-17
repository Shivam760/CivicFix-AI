import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import CivicHeader from '../components/CivicHeader';

/**
 * NotFoundPage
 * Friendly 404 page adhering to the CivicFix AI design system.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#FAF6EB] text-[#1C1917] p-6 sm:p-10 flex flex-col justify-between">
      <header className="max-w-4xl mx-auto w-full pb-6 border-b border-[#E5DAC4]">
        <CivicHeader />
      </header>

      <main className="max-w-md mx-auto w-full my-auto text-center py-12">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-300">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">
          Page Not Found (404)
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mb-8 leading-relaxed">
          The requested municipal route does not exist or has been relocated to another division.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/citizen/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D8CEBA] bg-[#FFFDF9] hover:bg-[#FAF6ED] text-xs sm:text-sm font-semibold text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-stone-500 py-4 max-w-4xl mx-auto w-full">
        &copy; 2026 CivicFix AI &bull; Smart Municipal Infrastructure Portal
      </footer>
    </div>
  );
}
