import React, { useState } from 'react';
import AIReportCard from '../components/AIReportCard';
import ZonalTelemetryMap from '../components/ZonalTelemetryMap';

/**
 * LiveMapSection
 *
 * Implements wide-canvas side-by-side presentation:
 * - Left: AI Report Preview Card with Aceternity 3D Card Effect
 * - Right: Live Municipal Infrastructure Telemetry Map
 * - Expansive width (max-w-[1536px]) utilizing left and right screen margins
 */
export default function LiveMapSection() {
  const [selectedPinId, setSelectedPinId] = useState('pin-1');

  return (
    <section
      id="live-map"
      className="relative py-24 sm:py-32 bg-[#FAF6EE] text-[#181A20] border-b border-[#E8E0CE] overflow-hidden"
      aria-label="Live Municipal Grievance Telemetry Map"
    >
      {/* Background Soft Glows */}
      <div
        className="absolute top-1/4 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -left-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-[#059669] uppercase px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] inline-block mb-3 shadow-2xs">
            Real-Time Ward GIS &amp; Intake
          </span>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-[#181A20] tracking-tight mb-4 leading-[1.12]">
            Live Municipal Infrastructure Telemetry
          </h2>
          <p className="text-sm sm:text-base text-[#5C5549] leading-relaxed font-sans">
            Every incident is geo-referenced with sub-meter precision to eliminate boundary confusion and dispatch closest municipal repair units.
          </p>
        </div>

        {/* Side-by-Side 2-Column Grid (Expansive 50/50 split across wide screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          {/* Column 1: AI Report Preview Card with 3D Effect */}
          <div className="flex flex-col h-full">
            <AIReportCard className="h-full flex flex-col justify-between" />
          </div>

          {/* Column 2: Live Zonal Telemetry Map */}
          <div className="flex flex-col h-full">
            <ZonalTelemetryMap
              selectedPinId={selectedPinId}
              onSelectPin={(pin) => setSelectedPinId(pin.id)}
              className="h-full flex flex-col justify-between"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
