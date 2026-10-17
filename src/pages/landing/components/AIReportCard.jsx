import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  AlertTriangle,
  Scan,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { CardContainer, CardBody, CardItem } from '../../../components/ui/3d-card';

/**
 * AIReportCard (Enhanced with Aceternity UI 3D Card Effect)
 *
 * Demonstrates:
 * - 3D parallax depth where the photo, reticle, badges, and location panel lift off the card
 * - Real civic-issue photography (severe road asphalt cavity with municipal caution barricades)
 * - AI computer-vision scanning frame and bounding box reticle
 * - Location panel with lightweight non-interactive vector map illustration
 * - Restrained HIGH priority status indicator and traffic advisory
 * - Explicit DEMO REPORT disclosures
 */
export default function AIReportCard({ className = '', _variant = 'full' }) {
  const shouldReduceMotion = useReducedMotion();
  const [imgError, setImgError] = useState(false);

  return (
    <CardContainer containerClassName={`w-full h-full ${className}`} className="w-full h-full">
      <CardBody className="relative w-full h-full rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] shadow-xl hover:shadow-2xl hover:border-emerald-400/80 transition-all duration-300 p-0 overflow-hidden flex flex-col justify-between">
        {/* Subtle Ambient Glow Behind Card */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-0"
          aria-hidden="true"
        />

        {/* ========================================================= */}
        {/* 1. TOP HEADER STRIP & DEMO BADGES (CardItem Z: 30)         */}
        {/* ========================================================= */}
        <CardItem
          translateZ={30}
          className="w-full px-5 py-3.5 bg-gradient-to-r from-[#FAF6EE] to-[#F2ECE0] border-b border-[#E8E0CE] flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Scan className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#065F46] uppercase">
              AI REPORT PREVIEW
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Scanner Pulse Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">AI Vision Active</span>
            </span>

            {/* Explicit Demo Badge */}
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-300 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider">
              DEMO REPORT
            </span>
          </div>
        </CardItem>

        {/* ========================================================= */}
        {/* 2. LARGE CIVIC PHOTOGRAPH (CardItem Z: 45)                 */}
        {/* ========================================================= */}
        <CardItem
          translateZ={45}
          className="relative w-full h-56 sm:h-64 bg-slate-900 overflow-hidden group select-none"
        >
          {/* Real Civic Hazard Photograph */}
          {!imgError ? (
            <img
              src="/images/urban-civic-hazard.jpg"
              alt="Severe road asphalt cavity with municipal caution barricades detected by AI Vision"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
              <ShieldAlert className="w-10 h-10 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-white">Road Surface Cavity Captured</span>
              <span className="text-[11px] text-slate-400 font-mono mt-1">Outer Ring Road Service Lane</span>
            </div>
          )}

          {/* Soft Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />

          {/* AI Laser Scanning Sweep Beam */}
          {!shouldReduceMotion && (
            <motion.div
              animate={{
                y: ['0%', '240%', '0%'],
                opacity: [0.3, 0.85, 0.3],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34D399] pointer-events-none z-10"
              aria-hidden="true"
            />
          )}

          {/* Bounding Box Reticle (CardItem Z: 75 for extreme 3D pop) */}
          <div
            className="absolute top-[32%] left-[22%] w-[56%] h-[48%] rounded-xl border border-emerald-400/80 bg-emerald-500/10 backdrop-blur-[1px] pointer-events-none z-10 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            aria-hidden="true"
          >
            {/* Corner Brackets */}
            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

            {/* Floating Detection Chip */}
            <div className="absolute -top-3.5 left-2 px-2 py-0.5 rounded bg-emerald-900/90 border border-emerald-400/90 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
              <span>Pothole detected · 98.4%</span>
            </div>

            {/* Hazard Dimensions / Telemetry Badge */}
            <div className="absolute -bottom-3 right-2 px-2 py-0.5 rounded bg-slate-900/85 border border-slate-700 text-slate-200 text-[9.5px] font-mono">
              Est. Area: 1.2m²
            </div>
          </div>

          {/* Category Pill Tag Overlay */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/15 text-white text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Road Infrastructure</span>
          </div>

          {/* Telemetry Target Info */}
          <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/15 text-slate-300 text-[10.5px] font-mono">
            Ref: #CF-ORR-150
          </div>
        </CardItem>

        {/* ========================================================= */}
        {/* 3. REPORT DETAILS (CardItem Z: 40)                         */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
          {/* Title & Priority Badge Row */}
          <CardItem translateZ={50} className="w-full flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-black text-[#181A20] tracking-tight leading-snug">
                Road damage detected
              </h3>
              <p className="text-xs text-[#5C5549] mt-0.5 font-medium">
                Automated multi-modal computer vision analysis
              </p>
            </div>

            {/* Restrained HIGH Priority Badge */}
            <div className="shrink-0 flex flex-col items-end">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-300 text-amber-800 text-xs font-bold shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>HIGH</span>
              </div>
              <span className="text-[10px] text-[#7E7566] font-mono mt-0.5">Priority Tier 1</span>
            </div>
          </CardItem>

          {/* Supporting Indicator Banner (CardItem Z: 35) */}
          <CardItem
            translateZ={35}
            className="w-full p-3 rounded-2xl bg-amber-500/5 border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-900 font-medium"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Traffic affected · Review recommended by ward inspection team</span>
          </CardItem>

          {/* Location Panel with Vector Map (CardItem Z: 55) */}
          <CardItem
            translateZ={55}
            className="w-full p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center"
          >
            {/* Left: Location & Ward Details */}
            <div className="sm:col-span-7 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#181A20]">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Outer Ring Road · Service Lane</span>
              </div>
              <div className="text-[11.5px] text-[#5C5549] pl-5.5 font-medium">
                Bengaluru, Karnataka · Ward 150
              </div>
              <div className="text-[10.5px] font-mono text-[#7E7566] pl-5.5 pt-0.5">
                12.9352° N, 77.6245° E
              </div>
            </div>

            {/* Right: Vector Map */}
            <div className="sm:col-span-5 h-20 rounded-xl border border-[#D5C9B3] overflow-hidden relative bg-[#EFE8DA] shadow-inner select-none">
              <svg
                className="w-full h-full"
                viewBox="0 0 200 80"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Outer Ring Road Ward 150 Map Grid Illustration"
              >
                <rect width="200" height="80" fill="#EAE3D2" />
                <path d="M140 0 C130 20, 160 45, 175 40 C190 35, 200 48, 200 80 L200 0 Z" fill="#CBD5E1" opacity="0.6" />
                <line x1="20" y1="0" x2="20" y2="80" stroke="#DDD4C0" strokeWidth="1.5" />
                <line x1="60" y1="0" x2="60" y2="80" stroke="#DDD4C0" strokeWidth="1.5" />
                <line x1="100" y1="0" x2="100" y2="80" stroke="#DDD4C0" strokeWidth="1.5" />
                <line x1="140" y1="0" x2="140" y2="80" stroke="#DDD4C0" strokeWidth="1.5" />
                <line x1="0" y1="20" x2="200" y2="20" stroke="#DDD4C0" strokeWidth="1.5" />
                <line x1="0" y1="60" x2="200" y2="60" stroke="#DDD4C0" strokeWidth="1.5" />
                <path d="M 0 45 C 50 40, 90 25, 150 45 C 175 52, 200 50, 200 50" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
                <path d="M 0 45 C 50 40, 90 25, 150 45 C 175 52, 200 50, 200 50" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" />
                <path d="M 0 45 C 50 40, 90 25, 150 45 C 175 52, 200 50, 200 50" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 3" />
                <path d="M 10 52 C 60 47, 100 32, 160 52" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                <g transform="translate(102, 34)">
                  {!shouldReduceMotion && (
                    <circle cx="0" cy="0" r="9" stroke="#10B981" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx="0" cy="0" r="3.5" fill="#047857" />
                  <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
                  <path d="M0 -3 C-3 -3, -4 -7, -4 -9 C-4 -12, -2 -14, 0 -14 C2 -14, 4 -12, 4 -9 C4 -7, 3 -3, 0 -3 Z" fill="#059669" stroke="#FFFFFF" strokeWidth="1" />
                  <circle cx="0" cy="-9" r="1.2" fill="#FFFFFF" />
                </g>
              </svg>
              <div className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-[#5C5549] bg-white/75 px-1 rounded">
                ORR GIS #150
              </div>
            </div>
          </CardItem>

          {/* Footer (CardItem Z: 20) */}
          <CardItem
            translateZ={20}
            className="w-full pt-1 flex items-center justify-between text-[11px] text-[#7E7566] font-medium border-t border-[#E8E0CE]"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ready for municipal review</span>
            </div>
            <span className="font-mono text-[10px]">Sample demonstration preview</span>
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
}
