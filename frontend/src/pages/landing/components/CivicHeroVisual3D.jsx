import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  Cpu,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Scan,
} from 'lucide-react';
import { PinContainer } from '../../../components/ui/3d-pin';

/**
 * CivicHeroVisual3D
 *
 * Replaces the dated flat illustration with a rich, interactive 3D animating
 * civic AI intake console powered by Aceternity UI's 3D Pin.
 *
 * Implements:
 * - 3D Pin perspective tilt with glowing beacon light and ground radar ripples
 * - Active photographic computer-vision scanner with scanning laser line
 * - Verified Municipal Dispatch Ticket with animated progress bar
 * - Floating 3D telemetry tags (AI Model CF-v4, Ward 150 GPS, 48h SLA)
 * - Continuous subtle levitation physics
 * - Full prefers-reduced-motion support
 */
export default function CivicHeroVisual3D({ className = '' }) {
  const shouldReduceMotion = useReducedMotion();
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative w-full max-w-[520px] lg:max-w-[560px] mx-auto flex items-center justify-center select-none ${className}`}
    >
      {/* 3D Pin Container with perspective and ground radar */}
      <PinContainer
        title="CIVICFIX AI • LIVE INTAKE SYSTEM"
        href="#live-map"
        containerClassName="w-full h-[460px] sm:h-[500px] flex items-center justify-center"
        className="w-[320px] sm:w-[380px] bg-gradient-to-b from-[#FFFDF8] to-[#FAF6EE] text-[#181A20]"
      >
        <div className="flex flex-col space-y-3.5">
          {/* Top Dispatch Banner */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E0CE]">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-900">
                ACTIVE AI INTAKE #CF-4821
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[10px] font-mono font-bold">
              WARD 150
            </span>
          </div>

          {/* Photographic Hazard Reticle with Active Laser Scan */}
          <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-slate-900 border border-[#E8E0CE] shadow-inner group/photo">
            {imgError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-1" />
                <span className="text-xs font-mono font-bold">Road Hazard Telemetry</span>
              </div>
            ) : (
              <picture>
                <source srcSet="/images/road-hazard-pothole.webp" type="image/webp" />
                <img
                  src="/images/road-hazard-pothole.jpg"
                  alt="City road pothole hazard detected by CivicFix AI vision model"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover filter contrast-[1.05]"
                  loading="eager"
                />
              </picture>
            )}

            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />

            {/* Computer Vision Scanning Laser Sweep */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{ y: [0, 160, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 shadow-[0_0_12px_#10B981] pointer-events-none z-20"
              />
            )}

            {/* AI Multi-Modal Bounding Box Reticle */}
            <div className="absolute top-5 left-6 right-6 bottom-7 border-2 border-dashed border-emerald-400/90 rounded-xl bg-emerald-500/10 pointer-events-none flex flex-col justify-between p-2 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-white drop-shadow-md">
                <span className="flex items-center gap-1 bg-emerald-950/85 px-1.5 py-0.5 rounded border border-emerald-400/40">
                  <Scan className="w-3 h-3 text-emerald-400" />
                  Pothole • 98.8%
                </span>
                <span className="bg-emerald-950/85 px-1.5 py-0.5 rounded border border-emerald-400/40">
                  1.2 m²
                </span>
              </div>
              <div className="text-[9.5px] font-mono text-emerald-200 self-end bg-emerald-950/85 px-1.5 py-0.5 rounded border border-emerald-400/40">
                Depth: 6.4 cm
              </div>
            </div>

            {/* Corner Crosshair Marks */}
            <div className="absolute top-2 left-2 text-[9px] font-mono text-emerald-400 opacity-80">⌜</div>
            <div className="absolute top-2 right-2 text-[9px] font-mono text-emerald-400 opacity-80">⌝</div>
            <div className="absolute bottom-2 left-2 text-[9px] font-mono text-emerald-400 opacity-80">⌞</div>
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-emerald-400 opacity-80">⌟</div>
          </div>

          {/* Incident Details & Verified Progress */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#181A20] leading-tight">
                  Outer Ring Road Service Hazard
                </h4>
                <p className="text-[11px] text-[#7E7566] font-mono">
                  Bengaluru South • Ward 150
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                HIGH TIER
              </span>
            </div>

            {/* Animated Dispatch Progress Bar */}
            <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono font-bold text-[#3E382E]">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Assigned: Dept. of Public Works
                </span>
                <span className="text-emerald-700">75%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E8E0CE] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500"
                />
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-[#7E7566] font-mono pt-0.5">
                <span>Field Dispatch Active</span>
                <span>SLA: 48h Target</span>
              </div>
            </div>
          </div>
        </div>
      </PinContainer>

      {/* Floating 3D Satellite Telemetry Orbiters */}
      <motion.div
        animate={shouldReduceMotion ? {} : { y: [-6, 6, -6] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:flex items-center gap-1.5 absolute -top-4 -left-6 z-40 bg-[#FFFDF8]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E0CE] shadow-lg text-[10.5px] font-mono font-bold text-[#181A20]"
      >
        <Cpu className="w-3.5 h-3.5 text-emerald-600" />
        <span>AI MODEL CF-v4</span>
      </motion.div>

      <motion.div
        animate={shouldReduceMotion ? {} : { y: [6, -6, 6] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:flex items-center gap-1.5 absolute top-1/2 -right-8 z-40 bg-[#FFFDF8]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E0CE] shadow-lg text-[10.5px] font-mono font-bold text-[#181A20]"
      >
        <MapPin className="w-3.5 h-3.5 text-teal-600" />
        <span>GPS: 12.92°N, 77.67°E</span>
      </motion.div>

      <motion.div
        animate={shouldReduceMotion ? {} : { y: [-5, 5, -5] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden sm:flex items-center gap-1.5 absolute -bottom-4 left-6 z-40 bg-[#FFFDF8]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E0CE] shadow-lg text-[10.5px] font-mono font-bold text-[#181A20]"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
        <span>VERIFIED BBMP INTAKE</span>
      </motion.div>
    </div>
  );
}
