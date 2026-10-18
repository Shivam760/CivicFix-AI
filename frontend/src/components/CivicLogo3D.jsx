import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * CivicLogo3D
 *
 * Distinctive 3D-style animated brand mark combining:
 * 1. Civic infrastructure: Perspective roadway with dashed center lane
 * 2. Intelligent resolution: Dynamic upward-sweeping checkmark / civic shield apex
 * 3. AI telemetry: Glowing focal beacon node with concentric pulse
 *
 * Implements:
 * - Multi-layered SVG depth with metallic and emerald specular gradients
 * - Soft reactive shadow that dynamically scales and diffuses during vertical float
 * - Gentle 3D perspective tilt (disabled under prefers-reduced-motion)
 * - Restrained specular sheen highlight
 * - Smooth hover response and responsive scaling ('sm', 'md', 'lg', 'xl', 'hero')
 */
export default function CivicLogo3D({
  size = 'md',
  animated = true,
  interactive = true,
  className = '',
}) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Size map in pixels
  const sizeMap = {
    sm: { box: 36, icon: 36 },
    md: { box: 44, icon: 44 },
    lg: { box: 60, icon: 60 },
    xl: { box: 84, icon: 84 },
    hero: { box: 112, icon: 112 },
  };

  const dim = sizeMap[size] || sizeMap.md;

  // Handle interactive 3D pointer tilt
  const handleMouseMove = (e) => {
    if (!interactive || shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: Math.max(-10, Math.min(10, (-y / (rect.height / 2)) * 10)),
      y: Math.max(-10, Math.min(10, (x / (rect.width / 2)) * 10)),
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const isAnimated = animated && !shouldReduceMotion;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: dim.box,
        height: dim.box,
        perspective: 800,
      }}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      aria-label="CivicFix AI Animated 3D Brand Mark"
      role="img"
    >
      {/* Dynamic Ground Shadow (Synchronized with vertical float) */}
      <motion.div
        animate={
          isAnimated
            ? {
                scale: isHovered ? 1.15 : [0.92, 1.08, 0.92],
                opacity: isHovered ? 0.45 : [0.28, 0.42, 0.28],
              }
            : { scale: 1, opacity: 0.35 }
        }
        transition={
          isAnimated
            ? {
                duration: 4.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
        className="absolute -bottom-1 w-[80%] h-[18%] rounded-full bg-emerald-950/40 blur-[5px] pointer-events-none"
        aria-hidden="true"
      />

      {/* 3D Floating & Tilting Container */}
      <motion.div
        animate={
          isAnimated
            ? {
                y: isHovered ? -4 : [-3, 3, -3],
                rotateX: tilt.x !== 0 ? tilt.x : [1.5, -1.5, 1.5],
                rotateY: tilt.y !== 0 ? tilt.y : [-2.5, 2.5, -2.5],
              }
            : { y: 0, rotateX: 0, rotateY: 0 }
        }
        transition={
          isAnimated
            ? {
                y: isHovered
                  ? { duration: 0.25 }
                  : { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
                rotateX:
                  tilt.x !== 0
                    ? { type: 'spring', stiffness: 220, damping: 20 }
                    : { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                rotateY:
                  tilt.y !== 0
                    ? { type: 'spring', stiffness: 220, damping: 20 }
                    : { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              }
            : undefined
        }
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
        }}
        className="relative flex items-center justify-center transition-transform duration-300"
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_8px_16px_rgba(4,120,87,0.22)]"
        >
          <defs>
            {/* Base Deep Shield Gradient */}
            <linearGradient id="shieldBaseGrad" x1="20" y1="12" x2="100" y2="108" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="45%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#022C22" />
            </linearGradient>

            {/* Shield Outer Bevel Rim Gradient (Specular Emerald to Mint) */}
            <linearGradient id="shieldRimGrad" x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="25%" stopColor="#34D399" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Inner Recessed Road Plate Gradient */}
            <linearGradient id="roadPlateGrad" x1="60" y1="30" x2="60" y2="102" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="60%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0A1324" />
            </linearGradient>

            {/* Dynamic Road Surface Gradient */}
            <linearGradient id="roadRibbonGrad" x1="60" y1="96" x2="60" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.95" />
            </linearGradient>

            {/* Checkmark Apex Wing (Triumphant Resolution) */}
            <linearGradient id="checkWingGrad" x1="32" y1="62" x2="92" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#A7F3D0" />
            </linearGradient>

            {/* Specular Diagonal Sheen */}
            <linearGradient id="specularSheen" x1="20" y1="16" x2="80" y2="76" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* AI Beacon Core Glow */}
            <radialGradient id="beaconGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="1" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ========================================================= */}
          {/* LAYER 1: 3D EXTRUDED BACK-CHAMFER (Depth extrusion layer) */}
          {/* ========================================================= */}
          <path
            d="M60 114 C44 98, 20 78, 20 42 C20 22, 36 14, 60 14 C84 14, 100 22, 100 42 C100 78, 76 98, 60 114 Z"
            fill="#011F18"
            transform="translate(0, 3)"
          />

          {/* ========================================================= */}
          {/* LAYER 2: MAIN GEOMETRIC SHIELD PIN FRAME                  */}
          {/* ========================================================= */}
          <path
            d="M60 112 C44 96, 20 76, 20 40 C20 20, 36 12, 60 12 C84 12, 100 20, 100 40 C100 76, 76 96, 60 112 Z"
            fill="url(#shieldBaseGrad)"
            stroke="url(#shieldRimGrad)"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Upper Specular Facet Shading */}
          <path
            d="M60 14 C40 14, 23 21, 22 39 C22 40, 48 30, 60 30 C72 30, 98 40, 98 39 C97 21, 80 14, 60 14 Z"
            fill="url(#specularSheen)"
            opacity="0.8"
          />

          {/* ========================================================= */}
          {/* LAYER 3: INNER CIVIC RECESS PLATE                         */}
          {/* ========================================================= */}
          <path
            d="M60 102 C47 88, 27 70, 27 41 C27 26, 39 19, 60 19 C81 19, 93 26, 93 41 C93 70, 73 88, 60 102 Z"
            fill="url(#roadPlateGrad)"
            stroke="#064E3B"
            strokeWidth="1.2"
          />

          {/* Ambient Inner Shadow Ring */}
          <path
            d="M60 102 C47 88, 27 70, 27 41 C27 26, 39 19, 60 19 C81 19, 93 26, 93 41"
            fill="none"
            stroke="#021C15"
            strokeWidth="2.5"
            opacity="0.6"
          />

          {/* ========================================================= */}
          {/* LAYER 4: PERSPECTIVE CIVIC ROADWAY (Infrastructure)       */}
          {/* ========================================================= */}
          {/* Asphalt perspective road tapering toward AI focal node */}
          <path
            d="M40 96 L49 52 L71 52 L80 96 Z"
            fill="url(#roadRibbonGrad)"
            stroke="#334155"
            strokeWidth="0.8"
          />

          {/* Road Curb Edge Reflectors */}
          <line x1="41" y1="94" x2="49.5" y2="53" stroke="#10B981" strokeWidth="1.2" opacity="0.75" />
          <line x1="79" y1="94" x2="70.5" y2="53" stroke="#10B981" strokeWidth="1.2" opacity="0.75" />

          {/* Dashed Center Lane Marking (Civic Highway Marker) */}
          <line
            x1="60"
            y1="92"
            x2="60"
            y2="54"
            stroke="#F8FAFC"
            strokeWidth="2.2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* ========================================================= */}
          {/* LAYER 5: DYNAMIC RESOLUTION CHECKMARK APEX                */}
          {/* ========================================================= */}
          {/* Bold geometric checkmark seamlessly integrated with road node */}
          <path
            d="M37 57 L52 71 L86 36"
            stroke="url(#checkWingGrad)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Specular Inner Stroke for 3D Bevel On Checkmark */}
          <path
            d="M38 56 L52 69 L84 37"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* ========================================================= */}
          {/* LAYER 6: AI INTELLIGENCE FOCAL BEACON                     */}
          {/* ========================================================= */}
          {/* Concentric Telemetry Rings */}
          <circle cx="86" cy="36" r="11" fill="url(#beaconGlow)" opacity="0.7" />
          <circle cx="86" cy="36" r="7" stroke="#6EE7B7" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.8" />
          <circle cx="86" cy="36" r="3.2" fill="#FFFFFF" />

          {/* Micro Telemetry Vertex Nodes */}
          <circle cx="37" cy="57" r="2.2" fill="#34D399" />
          <circle cx="52" cy="71" r="2.5" fill="#10B981" />
        </svg>

        {/* Restrained Accent Glow Backdrop */}
        <div
          className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md -z-10 pointer-events-none transition-opacity duration-300"
          style={{ opacity: isHovered ? 0.75 : 0.35 }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  );
}
