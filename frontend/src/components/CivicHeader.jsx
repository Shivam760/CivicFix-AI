import React from 'react';
import { Link } from 'react-router-dom';
import CivicLogo3D from './CivicLogo3D';

/**
 * CivicHeader
 * Institutional municipal authority branding with shield emblem and state infrastructure badge.
 */
export default function CivicHeader({ className = '', variant = 'dark' }) {
  const isLight = variant === 'light';

  return (
    <header className={`flex items-center ${className}`}>
      <Link
        to="/"
        className="inline-flex items-center gap-3.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl px-2 py-1.5 transition-all"
        aria-label="CivicFix AI home"
      >
        {/* 3D Distinctive Brand Mark Emblem */}
        <CivicLogo3D size="md" animated={true} interactive={true} className="group-hover:scale-105 transition-transform" />

        {/* Brand Name & Authority Designation */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[19px] sm:text-[21px] font-black tracking-tight transition-colors ${
              isLight ? 'text-white group-hover:text-emerald-300' : 'text-[#0F172A] group-hover:text-emerald-700'
            }`}>
              CivicFix AI
            </span>
            <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs ${
              isLight ? 'bg-white/15 text-white border-white/20' : 'bg-emerald-100 text-emerald-800 border-emerald-300/70'
            }`}>
              Platform
            </span>
          </div>
          <span className={`text-[11.5px] font-medium tracking-tight ${
            isLight ? 'text-slate-300' : 'text-slate-500'
          }`}>
            Civic issue reporting
          </span>
        </div>
      </Link>
    </header>
  );
}
