import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Compass,
  Plus,
  Minus,
  Layers,
  MapPin,
  Crosshair,
  ExternalLink,
} from 'lucide-react';
import CategoryIcon from '../../../components/icons3d/CategoryIcon';

/**
 * ZonalTelemetryMap
 *
 * High-fidelity GIS vector map component for municipal grievance telemetry:
 * - Bengaluru South Zonal Grid with realistic city GIS topography (Agara Lake, Sector Parks, Named Arterials)
 * - Authentic high-resolution GIS aerial satellite imagery layer with toggleable topographic vector grid
 * - Interactive GIS HUD controls (Compass Rose, Zoom +/- buttons, Layer mode)
 * - Real-time incident pins with radar waves and interactive tooltips
 * - Selected incident micro-preview bar with GPS coordinates
 * - Status legend strip (Submitted, Under Review, Crew Assigned, In Progress, Resolved)
 */
export default function ZonalTelemetryMap({
  className = '',
  selectedPinId = 'pin-1',
  onSelectPin,
}) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredPin, setHoveredPin] = useState(null);
  const [internalPinId, setInternalPinId] = useState(null);
  const currentPinId = internalPinId || selectedPinId || 'pin-1';
  const [zoomLevel, setZoomLevel] = useState(14);
  const [mapLayer, setMapLayer] = useState('Satellite GIS'); // 'Satellite GIS' | 'Topographic'

  // Initial Pin Data across municipal ward grid
  const [pins, setPins] = useState([
    {
      id: 'pin-1',
      x: 32, // percentage coordinates
      y: 42,
      lat: '12.9248° N',
      lon: '77.6782° E',
      category: 'road',
      categoryLabel: 'Road Infrastructure',
      title: 'Deep Pothole on ORR Service Road',
      location: 'Ward 150 • Outer Ring Road',
      status: 'in_progress',
      reportedAgo: '2 days ago',
    },
    {
      id: 'pin-2',
      x: 68,
      y: 28,
      lat: '12.9341° N',
      lon: '77.6255° E',
      category: 'streetlight',
      categoryLabel: 'Streetlights & Safety',
      title: 'Corridor Dark Spot (4 Fixtures Out)',
      location: 'Ward 112 • 100ft Road Corridor',
      status: 'under_review',
      reportedAgo: '4 hours ago',
    },
    {
      id: 'pin-3',
      x: 48,
      y: 72,
      lat: '12.9312° N',
      lon: '77.6189° E',
      category: 'water',
      categoryLabel: 'Water Supply',
      title: 'Main Pipeline Valve Leakage',
      location: 'Ward 85 • Koramangala 4th Block',
      status: 'resolved',
      reportedAgo: '1 day ago',
    },
    {
      id: 'pin-4',
      x: 82,
      y: 65,
      lat: '12.9115° N',
      lon: '77.6433° E',
      category: 'drainage',
      categoryLabel: 'Stormwater Drainage',
      title: 'Culvert Grate Blockage',
      location: 'Ward 174 • HSR Sector 2',
      status: 'assigned',
      reportedAgo: '6 hours ago',
    },
    {
      id: 'pin-5',
      x: 20,
      y: 68,
      lat: '12.9276° N',
      lon: '77.6698° E',
      category: 'garbage',
      categoryLabel: 'Waste Management',
      title: 'Illegal Waste Dump on Vacant Lot',
      location: 'Ward 150 • Green Glen Layout',
      status: 'submitted',
      reportedAgo: 'Just now',
    },
  ]);

  // Status mapping for colors and labels
  const statusConfig = {
    submitted: {
      label: 'Submitted',
      color: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      fill: '#D97706',
    },
    under_review: {
      label: 'Under Review',
      color: 'bg-teal-500',
      badge: 'bg-teal-50 text-teal-800 border-teal-200',
      fill: '#0D9488',
    },
    assigned: {
      label: 'Crew Assigned',
      color: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      fill: '#0284C7',
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      fill: '#059669',
    },
    resolved: {
      label: 'Resolved',
      color: 'bg-emerald-600',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      fill: '#047857',
    },
  };

  // Slowly cycle pin statuses for subtle live-feed motion (unless reduced motion is active)
  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      setPins((prev) =>
        prev.map((p, idx) => {
          if (idx === 0) {
            const nextStatus = p.status === 'in_progress' ? 'resolved' : 'in_progress';
            return { ...p, status: nextStatus };
          }
          if (idx === 1) {
            const nextStatus = p.status === 'under_review' ? 'assigned' : 'under_review';
            return { ...p, status: nextStatus };
          }
          return p;
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const activePin = pins.find((p) => p.id === currentPinId) || pins[0];
  const activeCfg = statusConfig[activePin.status] || statusConfig.submitted;

  const handleSelectPin = (pin) => {
    setInternalPinId(pin.id);
    if (onSelectPin) onSelectPin(pin);
  };

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.min(18, Math.max(10, prev + delta)));
  };

  return (
    <div
      className={`relative rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] p-4 sm:p-6 shadow-xl overflow-hidden flex flex-col justify-between text-[#181A20] ${className}`}
      aria-label="Bengaluru South Zonal Grid Live Telemetry Map"
    >
      {/* Top Header Bar inside Map Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#E8E0CE] relative z-20">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <div>
            <span className="text-xs font-bold text-[#181A20] tracking-wide block">
              Bengaluru South Zonal Grid
            </span>
            <span className="text-[10.5px] text-[#7E7566] block font-mono">
              Telemetry Channel: Active • 5 Active Incidents
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layer switcher pill */}
          <button
            onClick={() => setMapLayer((prev) => (prev === 'Satellite GIS' ? 'GIS Topographic' : 'Satellite GIS'))}
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-[#5C5549] hover:text-[#181A20] bg-[#FAF6EE] hover:bg-white px-2.5 py-1 rounded-full border border-[#E8E0CE] transition shadow-2xs"
            title="Toggle Map Layer"
          >
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>{mapLayer}</span>
          </button>

          {/* Real-time badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#5C5549] bg-[#FAF6EE] px-2.5 py-1 rounded-full border border-[#E8E0CE]">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Real-Time Stream</span>
          </div>
        </div>
      </div>

      {/* Main Map Surface with Interactive Canvas & Satellite Topography */}
      <div className="relative w-full h-[300px] sm:h-[350px] lg:h-[380px] rounded-2xl bg-slate-900 border border-[#E8E0CE] overflow-hidden select-none group shadow-inner">
        {/* High-Resolution Satellite Imagery Base Layer */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <img
            src="/images/satellite-ward-telemetry.jpg"
            alt="High-resolution satellite GIS aerial imagery of municipal ward"
            className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
          />
          {/* Subtle GIS Topography & Radar Vignette Overlay */}
          <div className="absolute inset-0 bg-slate-950/30 mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none" />
        </div>

        {/* SVG Topography & Roads Layer */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Minor Street Grid Pattern */}
            <pattern id="zonalMinorGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(100, 116, 139, 0.12)" strokeWidth="0.8" />
            </pattern>
            {/* Major Ward Grid Pattern */}
            <pattern id="zonalMajorGrid" width="128" height="128" patternUnits="userSpaceOnUse">
              <path d="M 128 0 L 0 0 0 128" fill="none" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="1.2" />
            </pattern>

            {/* Lake Water Surface Pattern */}
            <linearGradient id="lakeWaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.16" />
            </linearGradient>

            {/* Park Greenery Gradient */}
            <linearGradient id="parkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Background Grid Patterns */}
          <rect width="100%" height="100%" fill="url(#zonalMinorGrid)" />
          <rect width="100%" height="100%" fill="url(#zonalMajorGrid)" />

          {/* ========================================================= */}
          {/* 1. MUNICIPAL TOPOGRAPHY (Lakes, Parks & Urban Zones)       */}
          {/* ========================================================= */}

          {/* Agara Lake Water Body */}
          <path
            d="M 520,180 C 580,160 660,190 700,240 C 730,280 710,340 650,350 C 590,360 510,320 490,260 C 480,220 490,190 520,180 Z"
            fill="url(#lakeWaterGrad)"
            stroke="#38BDF8"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
          <text x="590" y="260" fill="#0284C7" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.75" letterSpacing="1">
            AGARA LAKE
          </text>

          {/* Bellandur Green Sector Park */}
          <polygon
            points="140,80 280,70 300,160 160,170"
            fill="url(#parkGrad)"
            stroke="#10B981"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="3 3"
          />
          <text x="180" y="125" fill="#047857" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.75" letterSpacing="0.8">
            SECTOR 3 ECO-PARK
          </text>

          {/* Koramangala Civic Zone Outline */}
          <polygon
            points="420,40 540,30 560,110 430,120"
            fill="url(#parkGrad)"
            stroke="#10B981"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          <text x="440" y="80" fill="#047857" fontSize="8.5" fontFamily="monospace" fontWeight="bold" opacity="0.7">
            KORAMANGALA 4TH
          </text>

          {/* ========================================================= */}
          {/* 2. ARTERIAL ROADS & EXPRESSWAYS                          */}
          {/* ========================================================= */}

          {/* Outer Ring Road (ORR) Arterial Highway */}
          <path
            d="M -50,140 Q 240,60 520,130 T 1000,120"
            fill="none"
            stroke="rgba(148, 163, 184, 0.85)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M -50,140 Q 240,60 520,130 T 1000,120"
            fill="none"
            stroke="#059669"
            strokeWidth="1.5"
            strokeDasharray="8 8"
            className="opacity-90"
          />
          {/* Road Label for ORR */}
          <text x="210" y="88" fill="#181A20" fontSize="9.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5" opacity="0.85">
            OUTER RING ROAD (ORR)
          </text>

          {/* Sarjapur Diagonal Expressway */}
          <path
            d="M 140,-40 L 420,480"
            fill="none"
            stroke="rgba(148, 163, 184, 0.7)"
            strokeWidth="5"
          />
          <text x="320" y="320" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.8" transform="rotate(58 320 320)">
            SARJAPUR MAIN ROAD
          </text>

          {/* 100ft Road Corridor */}
          <path
            d="M 40,320 Q 260,240 460,280 T 950,240"
            fill="none"
            stroke="rgba(148, 163, 184, 0.65)"
            strokeWidth="4"
          />
          <text x="140" y="275" fill="#475569" fontSize="8.5" fontFamily="monospace" fontWeight="bold" opacity="0.8">
            100FT ROAD CORRIDOR
          </text>

          {/* Local Sector Feeder Streets */}
          <line x1="160" y1="170" x2="160" y2="340" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="300" y1="160" x2="520" y2="180" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="650" y1="350" x2="850" y2="370" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="2" strokeDasharray="4 4" />

          {/* Ward Boundary Polygon Accent */}
          <polygon
            points="180,80 460,65 560,260 320,360 130,220"
            fill="rgba(16, 185, 129, 0.04)"
            stroke="rgba(16, 185, 129, 0.55)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />
          <text x="210" y="220" fill="#059669" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity="0.65" letterSpacing="1">
            MUNICIPAL WARD 150 BOUNDARY
          </text>
        </svg>

        {/* ========================================================= */}
        {/* 3. GIS HUD OVERLAYS (Compass, Controls, Coordinates)       */}
        {/* ========================================================= */}

        {/* Top-Left: Compass Rose & Zone HUD */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#FFFDF8]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#E8E0CE] shadow-xs text-xs font-mono text-[#5C5549]">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
            <Compass className="w-3.5 h-3.5 text-emerald-700 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <span className="font-bold text-[#181A20] text-[10.5px] block leading-tight">N 12° 55′ 28″</span>
            <span className="text-[9px] text-[#7E7566] block leading-tight">E 77° 41′ 04″</span>
          </div>
        </div>

        {/* Top-Right: Zoom & Recenter Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <div className="flex flex-col rounded-xl bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8E0CE] shadow-sm overflow-hidden">
            <button
              onClick={() => handleZoom(1)}
              aria-label="Zoom in map"
              className="p-1.5 hover:bg-emerald-50 text-[#5C5549] hover:text-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-[#E8E0CE]" />
            <button
              onClick={() => handleZoom(-1)}
              aria-label="Zoom out map"
              className="p-1.5 hover:bg-emerald-50 text-[#5C5549] hover:text-emerald-700 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setZoomLevel(14);
              setInternalPinId('pin-1');
            }}
            aria-label="Recenter map"
            className="p-2 rounded-xl bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8E0CE] shadow-sm hover:bg-emerald-50 text-[#5C5549] hover:text-emerald-700 transition flex items-center justify-center"
            title="Recenter on Ward 150"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom-Left Scale Bar & GIS Tag */}
        <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-2 bg-[#FFFDF8]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#E8E0CE] text-[9.5px] font-mono text-[#5C5549] shadow-xs">
          <span>SCALE</span>
          <div className="w-10 h-1 bg-[#D5C9B3] relative flex items-center justify-between">
            <span className="w-0.5 h-2 bg-[#5C5549]" />
            <span className="w-0.5 h-2 bg-[#5C5549]" />
          </div>
          <span>500m</span>
        </div>

        {/* Bottom-Right Satellite Telemetry Status Chip */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-[#FFFDF8]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#E8E0CE] text-[9.5px] font-mono text-emerald-800 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SATELLITE TELEMETRY &bull; WARD 150 &bull; {zoomLevel}x</span>
        </div>

        {/* ========================================================= */}
        {/* 5. INTERACTIVE TELEMETRY PINS                              */}
        {/* ========================================================= */}
        {pins.map((pin) => {
          const cfg = statusConfig[pin.status] || statusConfig.submitted;
          const isHovered = hoveredPin?.id === pin.id;
          const isSelected = currentPinId === pin.id;

          return (
            <div
              key={pin.id}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
              onMouseEnter={() => setHoveredPin(pin)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={() => handleSelectPin(pin)}
            >
              {/* Concentric Radar Wave (disabled on reduced motion) */}
              {!shouldReduceMotion && (
                <motion.div
                  animate={{ scale: [1, 2.3], opacity: [0.65, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  style={{ backgroundColor: cfg.fill }}
                  className="absolute inset-0 rounded-full"
                />
              )}

              {/* Pin Marker with Drop Shadow */}
              <motion.div
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: isSelected ? 1.3 : 1, y: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                whileHover={{ scale: 1.35 }}
                className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 shadow-md transition-shadow ${
                  isSelected ? 'ring-3 ring-emerald-500 ring-offset-2 shadow-xl' : 'hover:shadow-lg'
                }`}
                style={{ borderColor: cfg.fill }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill }} />
              </motion.div>

              {/* Interactive Tooltip on Hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.94 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-11 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#FFFDF8] border border-[#E8E0CE] shadow-2xl text-left pointer-events-none z-40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon category={pin.category} size={16} />
                        <span className="text-[10.5px] font-bold text-[#181A20]">{pin.categoryLabel}</span>
                      </div>
                      <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="text-[11.5px] font-bold text-[#181A20] leading-snug">
                      {pin.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#7E7566] font-medium pt-1 border-t border-[#E8E0CE]/60 font-mono">
                      <span>{pin.location}</span>
                      <span>{pin.reportedAgo}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 6. SELECTED INCIDENT MICRO-INSPECTOR BAR                   */}
      {/* ========================================================= */}
      <div className="mt-3.5 p-2.5 sm:p-3 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-white border border-[#E8E0CE] shrink-0 shadow-2xs">
            <CategoryIcon category={activePin.category} size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#181A20] text-xs truncate max-w-[200px] sm:max-w-xs">
                {activePin.title}
              </span>
              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${activeCfg.badge}`}>
                {activeCfg.label}
              </span>
            </div>
            <div className="text-[10.5px] text-[#7E7566] font-mono flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{activePin.location}</span>
              <span className="hidden md:inline">• GPS: {activePin.lat}, {activePin.lon}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono text-[#059669] font-bold">
          <span className="hidden sm:inline">Active Telemetry</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Status Legend Strip */}
      <div className="mt-3 pt-3 border-t border-[#E8E0CE] flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
        <span className="text-[#7E7566] font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
          Incident Status Legend:
        </span>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px]">
          {Object.entries(statusConfig).map(([key, item]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[#5C5549]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
