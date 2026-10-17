import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, CheckCircle2, Activity, MapPin } from 'lucide-react';

/**
 * CivicLogo3DShowcase
 *
 * A state-of-the-art 3D animated civic brand emblem built with pure CSS 3D transforms,
 * multi-layered depth planes, gyroscopic orbital rings, and dynamic lighting:
 *
 * 1. 3D Perspective Stage: 1200px depth with preserve-3d context.
 * 2. Ground Radar & Volumetric Shadow: Expanding sonar pulse and breathing floor contact shadow.
 * 3. Gyroscopic Orbital Rings: Nested 3D gimbal planes rotating continuously around the emblem.
 * 4. Multi-Plane 3D Civic Emblem:
 *    - Base Chamfer (translateZ: -32px): Deep obsidian & emerald extrusion plate.
 *    - Shield Core (translateZ: 0px): Metallic emerald/slate gradient with chrome bevel rim and coordinate laser etchings.
 *    - Infrastructure Roadway (translateZ: +28px): Perspective civic highway ribbon with glowing curbs and animated light pulse.
 *    - Resolution Checkmark (translateZ: +56px): Specular chrome & mint spire cutting cleanly upward.
 *    - Apex AI Fusion Node (translateZ: +82px): Breathing quantum core with concentric radar pulses.
 * 5. Floating 3D Telemetry HUD Badges (translateZ: +60px to +75px).
 * 6. Smooth Mouse-Tilt Tracking with Spring Physics.
 * 7. Full prefers-reduced-motion accessibility.
 */
export default function CivicLogo3DShowcase({ className = '' }) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(pointer: fine)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(pointer: fine)');
      const listener = (e) => setCanHover(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!canHover || shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotate({
      x: Math.max(-16, Math.min(16, (-y / (rect.height / 2)) * 16)),
      y: Math.max(-16, Math.min(16, (x / (rect.width / 2)) * 16)),
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const isAnimated = !shouldReduceMotion;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[560px] aspect-square flex items-center justify-center select-none ${className}`}
      style={{ perspective: '1200px' }}
      role="img"
      aria-label="CivicFix AI 3D Animated Civic Technology Emblem"
    >
      {/* ========================================================= */}
      {/* 1. GROUND RADAR & VOLUMETRIC CONTACT SHADOW               */}
      {/* ========================================================= */}
      {/* Floor Radar Scanning Ring */}
      <div
        style={{
          transform: 'rotateX(75deg) translateZ(-80px)',
          transformStyle: 'preserve-3d',
        }}
        className="absolute bottom-2 w-[82%] h-[82%] rounded-full border border-emerald-500/20 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-[70%] h-[70%] rounded-full border border-dashed border-emerald-400/25 animate-[spin_40s_linear_infinite]" />
        <div className="absolute w-[40%] h-[40%] rounded-full border border-emerald-500/30" />
      </div>

      {/* Dynamic Ground Soft Shadow (Breathes with Float Height) */}
      <motion.div
        animate={
          isAnimated
            ? {
                scale: isHovered ? 1.18 : [0.92, 1.1, 0.92],
                opacity: isHovered ? 0.45 : [0.22, 0.38, 0.22],
              }
            : { scale: 1, opacity: 0.3 }
        }
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-4 w-[68%] h-14 rounded-full bg-emerald-950/45 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ========================================================= */}
      {/* 2. MAIN 3D FLOATING MASTER RIG                            */}
      {/* ========================================================= */}
      <motion.div
        animate={
          isAnimated
            ? {
                y: isHovered ? -8 : [-10, 10, -10],
                rotateX: rotate.x !== 0 ? rotate.x : [3, -3, 3],
                rotateY: rotate.y !== 0 ? rotate.y : [-8, 8, -8],
              }
            : { y: 0, rotateX: 0, rotateY: 0 }
        }
        transition={
          isAnimated
            ? {
                y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' },
                rotateX:
                  rotate.x !== 0
                    ? { type: 'spring', stiffness: 220, damping: 22 }
                    : { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                rotateY:
                  rotate.y !== 0
                    ? { type: 'spring', stiffness: 220, damping: 22 }
                    : { duration: 8, repeat: Infinity, ease: 'easeInOut' },
              }
            : undefined
        }
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
        className="relative flex items-center justify-center"
      >
        {/* ========================================================= */}
        {/* 3. CONTINUOUS GYROSCOPIC GIMBAL ORBITAL RINGS             */}
        {/* ========================================================= */}

        {/* Gimbal Ring 1: Primary Emerald Latitude Orbit (Inclined +68deg X, +18deg Y) */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(68deg) rotateY(18deg)',
          }}
          className="absolute w-[360px] sm:w-[420px] h-[360px] sm:h-[420px] rounded-full pointer-events-none"
        >
          <motion.div
            animate={isAnimated ? { rotateZ: 360 } : {}}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="w-full h-full rounded-full border border-emerald-500/35 border-t-emerald-300 border-r-teal-300 relative"
          >
            {/* Primary Orbiting Satellite Beacon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_14px_#34D399] flex items-center justify-center border border-white/60">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </motion.div>
        </div>

        {/* Gimbal Ring 2: Counter-Rotating Dashed Orbit (Inclined -62deg X, +32deg Y) */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(-62deg) rotateY(32deg)',
          }}
          className="absolute w-[320px] sm:w-[380px] h-[320px] sm:h-[380px] rounded-full pointer-events-none"
        >
          <motion.div
            animate={isAnimated ? { rotateZ: -360 } : {}}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="w-full h-full rounded-full border border-dashed border-teal-400/40 border-b-cyan-300 relative"
          >
            {/* Counter-Orbiting Satellite Node */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-teal-300 shadow-[0_0_12px_#2DD4BF] border border-white/50" />
          </motion.div>
        </div>

        {/* Equatorial Telemetry Latitude Ring */}
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(82deg)',
          }}
          className="absolute w-[410px] sm:w-[470px] h-[410px] sm:h-[470px] rounded-full border border-emerald-500/15 pointer-events-none"
        />

        {/* ========================================================= */}
        {/* 4. MULTI-LAYER 3D CIVIC LOGO CORE MONOLITH                */}
        {/* ========================================================= */}

        {/* LAYER A: Rear Chamfer Extrusion (translateZ: -32px) */}
        <div
          style={{
            transform: 'translateZ(-32px) scale(0.96)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg viewBox="0 0 200 220" className="w-64 sm:w-76 h-auto opacity-80">
            <path
              d="M100 210 C70 180, 20 140, 20 75 C20 38, 48 20, 100 20 C152 20, 180 38, 180 75 C180 140, 130 180, 100 210 Z"
              fill="#011F18"
              stroke="#064E3B"
              strokeWidth="4"
            />
          </svg>
        </div>

        {/* LAYER B: Obsidian & Emerald Shield Core (translateZ: 0px) */}
        <div
          style={{
            transform: 'translateZ(0px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 200 220" className="w-64 sm:w-76 h-auto drop-shadow-2xl">
            <defs>
              {/* Metallic Shield Outer Gradient */}
              <linearGradient id="emblemShieldGrad" x1="20" y1="20" x2="180" y2="210" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="35%" stopColor="#065F46" />
                <stop offset="70%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#022C22" />
              </linearGradient>

              {/* Polished Chrome & Emerald Bevel Rim */}
              <linearGradient id="emblemRimGrad" x1="20" y1="20" x2="180" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="25%" stopColor="#34D399" />
                <stop offset="65%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Recessed Carbon & Technical Chamber Plate */}
              <linearGradient id="emblemChamberGrad" x1="100" y1="40" x2="100" y2="190" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0B132B" />
                <stop offset="70%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#022C22" />
              </linearGradient>

              {/* Glass Diagonal Glare */}
              <linearGradient id="emblemGlassSheen" x1="30" y1="25" x2="130" y2="130" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Main Outer Shield Pin Frame */}
            <path
              d="M100 205 C72 178, 25 138, 25 74 C25 38, 52 22, 100 22 C148 22, 175 38, 175 74 C175 138, 128 178, 100 205 Z"
              fill="url(#emblemShieldGrad)"
              stroke="url(#emblemRimGrad)"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Recessed Inner Technical Cavity */}
            <path
              d="M100 188 C78 164, 38 128, 38 74 C38 46, 60 34, 100 34 C140 34, 162 46, 162 74 C162 128, 122 164, 100 188 Z"
              fill="url(#emblemChamberGrad)"
              stroke="#065F46"
              strokeWidth="2"
            />

            {/* Technical Sub-Grid Lines in Recess */}
            <circle cx="100" cy="74" r="50" fill="none" stroke="#10B981" strokeWidth="0.6" strokeDasharray="4 4" opacity="0.25" />
            <circle cx="100" cy="74" r="30" fill="none" stroke="#10B981" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />

            {/* Laser-Etched Coordinate Watermarks */}
            <text x="100" y="52" textAnchor="middle" fill="#34D399" fontSize="6" fontFamily="monospace" opacity="0.75" letterSpacing="1.2">
              CIVICFIX AI · BBMP WARD 150
            </text>
            <text x="100" y="60" textAnchor="middle" fill="#94A3B8" fontSize="4.8" fontFamily="monospace" opacity="0.6" letterSpacing="0.8">
              12.9716° N · 77.5946° E
            </text>

            {/* Specular Diagonal Reflection */}
            <path
              d="M100 24 C64 24, 28 36, 26 68 C26 70, 75 48, 100 48 C125 48, 174 70, 174 68 C172 36, 136 24, 100 24 Z"
              fill="url(#emblemGlassSheen)"
            />
          </svg>
        </div>

        {/* LAYER C: 3D Infrastructure Roadway Ribbon (translateZ: +28px) */}
        <div
          style={{
            transform: 'translateZ(28px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg viewBox="0 0 200 220" className="w-64 sm:w-76 h-auto">
            <defs>
              <linearGradient id="emblemRoadRibbon" x1="100" y1="180" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1E293B" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.98" />
              </linearGradient>
            </defs>

            {/* Perspective Road Ribbon Tapering to Apex */}
            <path
              d="M65 178 L80 92 L120 92 L135 178 Z"
              fill="url(#emblemRoadRibbon)"
              stroke="#475569"
              strokeWidth="1.2"
            />

            {/* Glowing Emerald Curbs */}
            <line x1="66" y1="176" x2="81" y2="93" stroke="#10B981" strokeWidth="2.2" opacity="0.9" />
            <line x1="134" y1="176" x2="119" y2="93" stroke="#10B981" strokeWidth="2.2" opacity="0.9" />

            {/* Dashed Center Road Markings */}
            <line
              x1="100"
              y1="174"
              x2="100"
              y2="96"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeDasharray="8 6"
              strokeLinecap="round"
            />

            {/* Continuous Cybernetic Pulse traveling upward along the road */}
            {isAnimated && (
              <circle cx="100" cy="140" r="3" fill="#6EE7B7">
                <animate
                  attributeName="cy"
                  from="174"
                  to="96"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* GIS Focal Crosshair */}
            <circle cx="100" cy="92" r="14" fill="none" stroke="#34D399" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        </div>

        {/* LAYER D: 3D Chrome & Mint Resolution Checkmark Spire (translateZ: +56px) */}
        <div
          style={{
            transform: 'translateZ(56px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-[0_12px_24px_rgba(4,120,87,0.4)]"
        >
          <svg viewBox="0 0 200 220" className="w-64 sm:w-76 h-auto">
            <defs>
              <linearGradient id="emblemCheckGrad" x1="56" y1="105" x2="148" y2="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="45%" stopColor="#34D399" />
                <stop offset="80%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>
            </defs>

            {/* Checkmark Spire Outer Glow Stroke */}
            <path
              d="M62 108 L88 132 L144 68"
              fill="none"
              stroke="url(#emblemCheckGrad)"
              strokeWidth="10.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Specular 3D Highlight Core Ridge */}
            <path
              d="M63 107 L88 130 L142 70"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {/* Vertex Nodes */}
            <circle cx="62" cy="108" r="3.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="88" cy="132" r="4" fill="#34D399" stroke="#FFFFFF" strokeWidth="1.2" />
          </svg>
        </div>

        {/* LAYER E: Apex AI Fusion Beacon (translateZ: +82px) */}
        <motion.div
          animate={
            isAnimated
              ? {
                  scale: [1, 1.25, 1],
                  opacity: [0.85, 1, 0.85],
                }
              : {}
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            transform: 'translateZ(82px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute top-[28%] right-[27%] -translate-y-1/2 translate-x-1/2 pointer-events-none"
        >
          <div className="relative flex items-center justify-center">
            {/* Luminous Glow Halo */}
            <div className="absolute w-14 h-14 rounded-full bg-emerald-400/35 blur-md animate-ping" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-300 to-white shadow-[0_0_24px_#34D399] flex items-center justify-center border-2 border-white">
              <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ========================================================= */}
      {/* 5. SURROUNDING FLOATING 3D TELEMETRY HUD BADGES           */}
      {/* ========================================================= */}

      {/* Top Badge: AI Multi-Modal Engine */}
      <motion.div
        animate={isAnimated ? { y: [-6, 6, -6] } : {}}
        transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-3 sm:top-2 right-2 sm:right-6 z-30 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8E0CE] text-[#181A20] shadow-xl text-[11px] font-mono font-bold"
      >
        <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-900">AI MODEL CF-v4</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">99.4%</span>
        </div>
      </motion.div>

      {/* Bottom-Left Badge: Verified Municipal Gateway */}
      <motion.div
        animate={isAnimated ? { y: [6, -6, 6] } : {}}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-3 left-1 sm:left-4 z-30 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8E0CE] text-[#181A20] shadow-xl text-[11px] font-mono font-bold"
      >
        <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
        <span>BBMP DISPATCH · WARD 150</span>
      </motion.div>

      {/* Bottom-Right Badge: Active SLA Resolution Tracking */}
      <motion.div
        animate={isAnimated ? { y: [-5, 5, -5] } : {}}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-5 right-1 sm:right-6 z-30 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8E0CE] text-[#181A20] shadow-xl text-[11px] font-mono font-bold"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>SLA RESOLUTION · 48H</span>
      </motion.div>
    </div>
  );
}
