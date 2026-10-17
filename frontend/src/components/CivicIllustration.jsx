import React, { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * CivicIllustration
 * Institutional Deep Municipal Authority Edition:
 * - Smart-city dusk atmosphere with illuminated municipal streetlights
 * - Official Department of Public Works recycling bin
 * - Road infrastructure hazard (pothole) with glowing lidar/telemetry scanner
 * - Glowing GPS municipal map marker pin with animated radar rings
 * - Verified Government Dispatch Ticket Card with floating micro-motion
 */
export default function CivicIllustration({ className = '', _variant = 'desktop' }) {
  const shouldReduceMotion = useReducedMotion();
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '_');

  // Scoped unique IDs
  const platformBaseGrad = `pedBase_${uid}`;
  const platformTopGrad = `pedTop_${uid}`;
  const platformInnerGrad = `pedInner_${uid}`;
  const bldgNavyGrad = `bldgNavy_${uid}`;
  const bldgSlateGrad = `bldgSlate_${uid}`;
  const bldgSteelGrad = `bldgSteel_${uid}`;
  const bldgDuskGrad = `bldgDusk_${uid}`;
  const binBodyGrad = `binBody_${uid}`;
  const pinTealGrad = `pinTeal_${uid}`;
  const cardShadowFilter = `cardShadow_${uid}`;
  const lampGlowGrad = `lampGlow_${uid}`;

  return (
    <div
      className={`relative flex items-center justify-center select-none w-full ${className}`}
      role="img"
      aria-label="CivicFix AI municipal authority infrastructure dispatch illustration"
    >
      <svg
        viewBox="0 0 580 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl transition-transform duration-300"
      >
        <defs>
          {/* Card Drop Shadow */}
          <filter id={cardShadowFilter} x="160" y="70" width="260" height="200" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#040D1A" floodOpacity="0.45" />
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#040D1A" floodOpacity="0.25" />
          </filter>

          {/* Streetlight Golden Beam */}
          <radialGradient id={lampGlowGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Institutional Granite/Slate Pedestal */}
          <linearGradient id={platformBaseGrad} x1="290" y1="310" x2="290" y2="430" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="40%" stopColor="#111827" />
            <stop offset="100%" stopColor="#0B0F19" />
          </linearGradient>

          <linearGradient id={platformTopGrad} x1="90" y1="345" x2="490" y2="345" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="35%" stopColor="#334155" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <radialGradient id={platformInnerGrad} cx="290" cy="340" r="200" fx="280" fy="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#253346" />
            <stop offset="75%" stopColor="#17212F" />
            <stop offset="100%" stopColor="#0E1622" />
          </radialGradient>

          {/* Authority Building Gradients */}
          <linearGradient id={bldgNavyGrad} x1="130" y1="180" x2="200" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#0E233D" />
          </linearGradient>

          <linearGradient id={bldgSlateGrad} x1="210" y1="170" x2="300" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2A3C53" />
            <stop offset="100%" stopColor="#162232" />
          </linearGradient>

          <linearGradient id={bldgSteelGrad} x1="300" y1="160" x2="380" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#334B68" />
            <stop offset="100%" stopColor="#1A2A3D" />
          </linearGradient>

          <linearGradient id={bldgDuskGrad} x1="390" y1="190" x2="460" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#243447" />
            <stop offset="100%" stopColor="#121D28" />
          </linearGradient>

          {/* Municipal Bin Gradient */}
          <linearGradient id={binBodyGrad} x1="150" y1="260" x2="195" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="40%" stopColor="#059669" />
            <stop offset="100%" stopColor="#044E36" />
          </linearGradient>

          {/* GPS Pin Gradient */}
          <linearGradient id={pinTealGrad} x1="290" y1="285" x2="290" y2="345" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* ================================================================= */}
        {/* 1. 3D ISOMETRIC GRANITE PEDESTAL                                  */}
        {/* ================================================================= */}
        {/* Ambient Ground Shadow */}
        <ellipse cx="290" cy="385" rx="230" ry="56" fill="#030712" opacity="0.6" />
        <ellipse cx="290" cy="380" rx="215" ry="48" fill="#030712" opacity="0.4" />

        {/* Emerald Edge Glow Under Pedestal */}
        <ellipse cx="290" cy="365" rx="200" ry="46" fill="#059669" opacity="0.15" />

        {/* Pedestal Bottom Base Cylinder */}
        <path
          d="M70 345 C70 395, 510 395, 510 345 L510 368 C510 418, 70 418, 70 368 Z"
          fill={`url(#${platformBaseGrad})`}
        />

        {/* Pedestal Outer Rim Bevel with emerald highlight */}
        <ellipse cx="290" cy="345" rx="220" ry="60" fill={`url(#${platformTopGrad})`} />

        {/* Pedestal Top Pavement Surface */}
        <ellipse cx="290" cy="343" rx="212" ry="56" fill={`url(#${platformInnerGrad})`} />

        {/* Precision Laser Geotag Seam */}
        <ellipse cx="290" cy="343" rx="178" ry="45" stroke="#10B981" strokeWidth="1.2" strokeDasharray="4 6" fill="none" opacity="0.5" />

        {/* ================================================================= */}
        {/* 2. MUNICIPAL AUTHORITY BUILDINGS & STREETLIGHT                   */}
        {/* ================================================================= */}

        {/* Building 4: Far Right (Command Center East) */}
        <g id="building-east">
          <rect x="400" y="195" width="68" height="140" rx="6" fill={`url(#${bldgDuskGrad})`} stroke="#334155" strokeWidth="1" />
          {/* Windows: Warm golden glow inside dark facade */}
          <g fill="#FDE68A">
            <rect x="412" y="210" width="14" height="14" rx="3" opacity="0.85" />
            <rect x="440" y="210" width="14" height="14" rx="3" opacity="0.85" />
            <rect x="412" y="234" width="14" height="14" rx="3" opacity="0.85" />
            <rect x="440" y="234" width="14" height="14" rx="3" opacity="0.4" />
            <rect x="412" y="258" width="14" height="14" rx="3" opacity="0.85" />
            <rect x="440" y="258" width="14" height="14" rx="3" opacity="0.85" />
            <rect x="412" y="282" width="14" height="14" rx="3" opacity="0.6" />
            <rect x="440" y="282" width="14" height="14" rx="3" opacity="0.85" />
          </g>
        </g>

        {/* Streetlight with golden ambient cone of light */}
        <g id="streetlight">
          {/* Ambient Breathing Glow */}
          <motion.circle
            cx="390"
            cy="120"
            r="36"
            fill={`url(#${lampGlowGrad})`}
            animate={shouldReduceMotion ? {} : { scale: [1, 1.25, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Light cone illuminating pavement */}
          <polygon points="390,122 340,340 440,340" fill="#FDE68A" opacity="0.08" />

          {/* Heavy Duty Municipal Street Pole */}
          <path
            d="M360 175 C360 130, 372 112, 388 112 L392 112"
            stroke="#64748B"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Lamp fixture head */}
          <circle cx="392" cy="116" r="8" fill="#F59E0B" />
          <ellipse cx="392" cy="122" rx="14" ry="7" fill="#FEF08A" opacity="0.9" />
        </g>

        {/* Building 3: Skyscraper (Central Dispatch Tower) */}
        <g id="building-tower">
          <rect x="312" y="150" width="78" height="185" rx="6" fill={`url(#${bldgSteelGrad})`} stroke="#475569" strokeWidth="1" />
          {/* Rooftop Telemetry Antenna with blinking red beacon */}
          <line x1="351" y1="150" x2="351" y2="128" stroke="#94A3B8" strokeWidth="2.5" />
          <circle cx="351" cy="128" r="3" fill="#EF4444" />

          {/* Windows */}
          <g fill="#E2E8F0">
            <rect x="326" y="170" width="20" height="16" rx="3" opacity="0.9" />
            <rect x="358" y="170" width="20" height="16" rx="3" opacity="0.9" />
            <rect x="326" y="198" width="20" height="16" rx="3" opacity="0.5" />
            <rect x="358" y="198" width="20" height="16" rx="3" opacity="0.9" />
            <rect x="326" y="226" width="20" height="16" rx="3" opacity="0.9" />
            <rect x="358" y="226" width="20" height="16" rx="3" opacity="0.4" />
            <rect x="326" y="254" width="20" height="16" rx="3" opacity="0.9" />
            <rect x="358" y="254" width="20" height="16" rx="3" opacity="0.9" />
          </g>
        </g>

        {/* Building 2: Center (Municipal Hall) */}
        <g id="building-hall">
          <rect x="208" y="180" width="102" height="155" rx="6" fill={`url(#${bldgSlateGrad})`} stroke="#334155" strokeWidth="1" />
          {/* Windows */}
          <g fill="#FDE68A">
            <rect x="224" y="200" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="251" y="200" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="278" y="200" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="224" y="228" width="16" height="16" rx="3" opacity="0.4" />
            <rect x="251" y="228" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="278" y="228" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="224" y="256" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="251" y="256" width="16" height="16" rx="3" opacity="0.85" />
            <rect x="278" y="256" width="16" height="16" rx="3" opacity="0.5" />
          </g>
        </g>

        {/* Building 1: Left (Public Works Depot) */}
        <g id="building-depot">
          <rect x="122" y="205" width="76" height="130" rx="6" fill={`url(#${bldgNavyGrad})`} stroke="#1E293B" strokeWidth="1" />
          {/* Windows */}
          <g fill="#A7F3D0">
            <rect x="136" y="222" width="14" height="14" rx="3" opacity="0.8" />
            <rect x="166" y="222" width="14" height="14" rx="3" opacity="0.8" />
            <rect x="136" y="246" width="14" height="14" rx="3" opacity="0.5" />
            <rect x="166" y="246" width="14" height="14" rx="3" opacity="0.8" />
            <rect x="136" y="270" width="14" height="14" rx="3" opacity="0.8" />
            <rect x="166" y="270" width="14" height="14" rx="3" opacity="0.8" />
          </g>
        </g>

        {/* ================================================================= */}
        {/* 3. CIVIC INCIDENTS & SENSORS (BIN, ROAD CAVITY, GPS BEACON)       */}
        {/* ================================================================= */}

        {/* Municipal Green Wheelie Bin */}
        <g id="municipal-bin">
          <ellipse cx="170" cy="365" rx="30" ry="8.5" fill="#000000" opacity="0.5" />

          {/* Wheels */}
          <circle cx="150" cy="360" r="6.5" fill="#0F172A" />
          <circle cx="150" cy="360" r="3" fill="#64748B" />
          <circle cx="190" cy="360" r="6.5" fill="#0F172A" />
          <circle cx="190" cy="360" r="3" fill="#64748B" />

          {/* Body */}
          <path
            d="M145 264 L195 264 L189 356 C189 359, 186 361, 183 361 L157 361 C154 361, 151 359, 151 356 Z"
            fill={`url(#${binBodyGrad})`}
          />

          {/* Lid & Handle */}
          <rect x="141" y="257" width="58" height="9" rx="3.5" fill="#044E36" />
          <rect x="162" y="253" width="16" height="5" rx="2" fill="#022C1E" />

          {/* White Slats */}
          <line x1="158" y1="274" x2="158" y2="348" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <line x1="170" y1="274" x2="170" y2="348" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <line x1="182" y1="274" x2="182" y2="348" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* Road Hazard (Pothole with Laser Scan Ring) */}
        <g id="pothole-hazard">
          <ellipse cx="290" cy="354" rx="55" ry="20" fill="#020617" opacity="0.7" />
          <ellipse cx="290" cy="351" rx="50" ry="17" fill="#0F172A" />
          <ellipse cx="290" cy="352" rx="42" ry="12" fill="#020617" />

          {/* Crack fissures */}
          <path d="M240 350 L228 354 M340 351 L352 355 M256 362 L248 366" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />

          {/* Lidar Scan Arc */}
          <ellipse cx="290" cy="352" rx="46" ry="14" stroke="#10B981" strokeWidth="1" strokeDasharray="5 5" fill="none" opacity="0.8" />
        </g>

        {/* GPS Civic Pin with Radar Pulse */}
        <g id="civic-map-pin">
          <ellipse cx="290" cy="350" rx="10" ry="4" fill="#020617" opacity="0.8" />

          {/* Animated Radar Rings */}
          {!shouldReduceMotion && (
            <>
              <ellipse cx="290" cy="350" rx="16" ry="6" stroke="#10B981" strokeWidth="1.5" fill="none">
                <animate attributeName="rx" values="10;32;10" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="ry" values="4;12;4" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="290" cy="350" rx="24" ry="9" stroke="#34D399" strokeWidth="1" fill="none">
                <animate attributeName="rx" values="16;42;16" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                <animate attributeName="ry" values="6;16;6" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" begin="0.8s" repeatCount="indefinite" />
              </ellipse>
            </>
          )}

          {/* Pin Body */}
          <path
            d="M290 348 C286 343, 272 324, 272 309 C272 298.5, 280 290, 290 290 C300 290, 308 298.5, 308 309 C308 324, 294 343, 290 348 Z"
            fill={`url(#${pinTealGrad})`}
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="290" cy="308" r="5.5" fill="#FFFFFF" />
        </g>

        {/* ================================================================= */}
        {/* 4. VERIFIED GOVERNMENT DISPATCH TICKET CARD                       */}
        {/* ================================================================= */}
        <motion.g
          id="floating-report-card"
          filter={`url(#${cardShadowFilter})`}
          animate={shouldReduceMotion ? {} : { y: [0, -9, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Card Container (Institutional Slate & White with Emerald Accent Top Bar) */}
          <rect
            x="195"
            y="94"
            width="210"
            height="124"
            rx="18"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />

          {/* Top Emerald Header Strip */}
          <path
            d="M195 112 C195 102, 203 94, 213 94 L387 94 C397 94, 405 102, 405 112 L405 118 L195 118 Z"
            fill="#064E3B"
          />

          {/* Verification Code */}
          <text
            x="208"
            y="108"
            fill="#6EE7B7"
            fontSize="9"
            fontWeight="800"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.8px"
          >
            VERIFIED MUNICIPAL DISPATCH
          </text>
          <text
            x="392"
            y="108"
            fill="#A7F3D0"
            fontSize="9"
            fontWeight="700"
            fontFamily="ui-monospace, monospace"
            textAnchor="end"
            letterSpacing="0.4px"
          >
            #CF-4821
          </text>

          {/* Header Row: Checkmark Badge + "Report received" Title */}
          <rect x="214" y="128" width="30" height="30" rx="8" fill="#10B981" />
          <path
            d="M222 143 L227 148 L236 137"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text
            x="254"
            y="144"
            fill="#0F172A"
            fontSize="14.5"
            fontWeight="800"
            fontFamily="var(--font-sans), system-ui, sans-serif"
            letterSpacing="-0.2px"
          >
            Report received
          </text>
          <text
            x="254"
            y="155"
            fill="#64748B"
            fontSize="9.5"
            fontWeight="500"
            fontFamily="var(--font-sans), system-ui, sans-serif"
          >
            Assigned: Dept. of Public Works
          </text>

          {/* Progress / Status Bar */}
          <rect x="214" y="172" width="172" height="7" rx="3.5" fill="#E2E8F0" />
          <rect x="214" y="172" width="120" height="7" rx="3.5" fill="#10B981" />

          {/* Action Status Pill */}
          <rect x="214" y="188" width="112" height="19" rx="9.5" fill="#047857" />
          <text
            x="270"
            y="201.5"
            fill="#FFFFFF"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="var(--font-sans), system-ui, sans-serif"
            textAnchor="middle"
            letterSpacing="0.4px"
          >
            ACTION IN PROGRESS
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
