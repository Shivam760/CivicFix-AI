import React from 'react';

/**
 * BackgroundBeams (Aceternity UI inspired)
 *
 * Full-bleed animated SVG light rays and glowing collision paths that stretch across the left
 * and right margins of the viewport, eliminating empty dead space and creating depth.
 */
export function BackgroundBeams({ className = '' }) {

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="beamGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#059669" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="beamGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#0D9488" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="centerGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Center Glow */}
        <rect width="1440" height="900" fill="url(#centerGlow)" />

        {/* Far Left Beam Paths (making use of left space) */}
        <path
          d="M -100 0 L 400 900"
          stroke="url(#beamGrad1)"
          strokeWidth="1.5"
          strokeDasharray="12 16"
        />
        <path
          d="M 50 -100 L 550 900"
          stroke="url(#beamGrad1)"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Far Right Beam Paths (making use of right space) */}
        <path
          d="M 1540 0 L 1040 900"
          stroke="url(#beamGrad2)"
          strokeWidth="1.5"
          strokeDasharray="16 20"
        />
        <path
          d="M 1390 -100 L 890 900"
          stroke="url(#beamGrad2)"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Subtle Horizontal Telemetry Grid Lines stretching edge-to-edge */}
        <line x1="0" y1="220" x2="1440" y2="220" stroke="#E8E0CE" strokeWidth="0.8" strokeDasharray="4 8" opacity="0.6" />
        <line x1="0" y1="460" x2="1440" y2="460" stroke="#E8E0CE" strokeWidth="0.8" strokeDasharray="4 8" opacity="0.6" />
        <line x1="0" y1="700" x2="1440" y2="700" stroke="#E8E0CE" strokeWidth="0.8" strokeDasharray="4 8" opacity="0.6" />

        {/* Outer Margin Coordinate Guides */}
        <text x="24" y="240" fill="#7E7566" fontSize="9" fontFamily="monospace" opacity="0.7">
          LAT 12.9716° N / SENSOR GRID
        </text>
        <text x="1416" y="240" fill="#7E7566" fontSize="9" fontFamily="monospace" textAnchor="end" opacity="0.7">
          LON 77.5946° E / CIVIC GRID
        </text>

        <text x="24" y="480" fill="#7E7566" fontSize="9" fontFamily="monospace" opacity="0.7">
          STREET LEVEL / NEIGHBOURHOOD
        </text>
        <text x="1416" y="480" fill="#7E7566" fontSize="9" fontFamily="monospace" textAnchor="end" opacity="0.7">
          STATUS: INGESTION ONLINE
        </text>
      </svg>
    </div>
  );
}
