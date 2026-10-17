import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import AIReportCard from '../components/AIReportCard';
import ZonalTelemetryMap from '../components/ZonalTelemetryMap';
import { TracingBeam } from '../../../components/ui/tracing-beam';

/**
 * Custom SVG Icons for the 3 Steps
 */

// Step 1: Camera combined with Location Pin
function CameraPinIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
      <path d="M18 2.5a2 2 0 0 1 2 2c0 1.5-2 3.5-2 3.5s-2-2-2-3.5a2 2 0 0 1 2-2z" fill="currentColor" strokeWidth="1" />
    </svg>
  );
}

// Step 2: Intelligent Scanning Frame / Neural Network Symbol
function AIScannerIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="9" r="1.5" />
      <circle cx="16" cy="9" r="1.5" />
      <circle cx="9" cy="15" r="1.5" />
      <circle cx="15" cy="15" r="1.5" />
      <line x1="12" y1="12" x2="8" y2="9" strokeWidth="1.2" strokeDasharray="1 1" />
      <line x1="12" y1="12" x2="16" y2="9" strokeWidth="1.2" strokeDasharray="1 1" />
      <line x1="12" y1="12" x2="9" y2="15" strokeWidth="1.2" strokeDasharray="1 1" />
      <line x1="12" y1="12" x2="15" y2="15" strokeWidth="1.2" strokeDasharray="1 1" />
    </svg>
  );
}

// Step 3: Location Pin Combined with Progress Indicator / Checkmark
function PinProgressIcon({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4.5-4.5-8-8.5-8-12a8 8 0 1 1 16 0c0 3.5-3.5 7.5-8 12z" />
      <circle cx="12" cy="9" r="4.5" strokeDasharray="18 6" strokeWidth="1.5" />
      <path d="m10 9 1.5 1.5 3-3" strokeWidth="2" />
    </svg>
  );
}

/**
 * HowItWorksSection
 *
 * Implements:
 * - Aceternity Tracing Beam connecting the three stages
 * - Wide canvas layout utilizing the left and right margins of the viewport
 * - Step 01: Capture the Issue
 * - Step 02: Let AI Assist
 * - Step 03: Track the Resolution
 * - Side-by-side interactive inspector pairing 3D AI Report Card with Zonal Telemetry Map
 */
export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'step-01',
      step: '01',
      title: 'Capture the Issue',
      tagline: 'STEP 01',
      description:
        'Snap a photo, describe the problem, and attach its location. Reporting a civic issue takes just a few moments.',
      icon: CameraPinIcon,
      color: 'emerald',
      badge: 'Quick Submission',
    },
    {
      id: 'step-02',
      step: '02',
      title: 'Let AI Assist',
      tagline: 'STEP 02',
      description:
        'AI helps identify the issue category and assess its urgency, making reports easier to organize and prioritize.',
      icon: AIScannerIcon,
      color: 'teal',
      badge: 'Smart Triage',
    },
    {
      id: 'step-03',
      step: '03',
      title: 'Track the Resolution',
      tagline: 'STEP 03',
      description:
        'Follow status updates as the responsible team reviews the report and works toward resolving the issue.',
      icon: PinProgressIcon,
      color: 'blue',
      badge: 'Full Visibility',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="relative bg-[#FAF6EE] text-[#181A20] py-24 sm:py-32 border-b border-[#E8E0CE] overflow-hidden"
      aria-label="How CivicFix AI Works"
    >
      {/* Background Radial Glow */}
      <div
        className="absolute top-1/4 -left-48 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -right-48 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-mono font-bold tracking-widest uppercase mb-4 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>HOW CIVICFIX AI WORKS</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-[#181A20] tracking-tight leading-[1.12] mb-4"
          >
            From Street-Level Problems to Real Progress
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-[#5C5549] leading-relaxed font-sans"
          >
            Three simple steps to report civic issues, help teams prioritize what matters, and follow progress toward resolution.
          </motion.p>
        </div>

        {/* Tracing Beam Wrapped Content */}
        <TracingBeam>
          {/* ========================================================= */}
          {/* 1. THREE VISUALLY CONNECTED STEP CARDS                    */}
          {/* ========================================================= */}
          <div className="relative mb-16 sm:mb-20">
            {/* Subtle Horizontal Progression Line on Desktop */}
            <div
              className="hidden lg:block absolute top-[52px] left-[15%] right-[15%] h-0.5 bg-[#E8E0CE] -z-0"
              aria-hidden="true"
            >
              {/* Active Progress Fill */}
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600"
                initial={false}
                animate={{
                  width: activeStep === 0 ? '0%' : activeStep === 1 ? '50%' : '100%',
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {/* Cards Grid Spanning Wide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative z-10">
              {steps.map((st, idx) => {
                const Icon = st.icon;
                const isActive = activeStep === idx;

                return (
                  <motion.button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.12 }}
                    className={`group relative text-left p-6 sm:p-7 rounded-3xl transition-all duration-300 cursor-pointer border flex flex-col justify-between ${
                      isActive
                        ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-950/5 ring-2 ring-emerald-500/20 -translate-y-1'
                        : 'bg-[#FFFDF8] border-[#E8E0CE] hover:border-emerald-300 hover:bg-white shadow-xs hover:shadow-md'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div>
                      {/* Top Header Row with Numbered Indicator & Custom Icon */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-display font-black text-sm tracking-tight transition-all duration-300 ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-[#FAF6EE] text-[#5C5549] border border-[#E8E0CE] group-hover:bg-emerald-50 group-hover:text-emerald-800'
                            }`}
                          >
                            {st.step}
                          </div>
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7E7566]">
                            {st.tagline}
                          </span>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-[#FAF6EE] text-[#5C5549] border border-[#E8E0CE] group-hover:text-emerald-700'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Step Title */}
                      <h3
                        className={`font-display text-xl sm:text-2xl font-black tracking-tight mb-2.5 transition-colors ${
                          isActive ? 'text-[#181A20]' : 'text-[#2D2A26] group-hover:text-[#181A20]'
                        }`}
                      >
                        {st.title}
                      </h3>

                      {/* Step Description */}
                      <p className="text-xs sm:text-sm text-[#5C5549] leading-relaxed font-sans font-normal">
                        {st.description}
                      </p>
                    </div>

                    {/* Active Card Indicator Strip */}
                    <div className="pt-5 mt-4 border-t border-[#E8E0CE] flex items-center justify-between text-xs">
                      <span
                        className={`font-mono font-semibold transition-colors ${
                          isActive ? 'text-emerald-700 font-bold' : 'text-[#7E7566]'
                        }`}
                      >
                        {isActive ? '● Live Preview Active' : 'Click to inspect'}
                      </span>
                      <ArrowRight
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isActive
                            ? 'text-emerald-600 translate-x-1'
                            : 'text-[#D5C9B3] group-hover:text-[#5C5549]'
                        }`}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. DYNAMIC WORKFLOW INSPECTOR (EXPANSIVE SIDE-BY-SIDE)    */}
          {/* ========================================================= */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#5C5549]">
                  Interactive Workflow Inspector
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#7E7566]">
                <span>Viewing Step:</span>
                <span className="font-bold font-mono text-emerald-800 bg-[#E8E0CE]/50 px-2 py-0.5 rounded">
                  0{activeStep + 1} / 03
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 01 PREVIEW: Side-by-Side 3D Report Card & Telemetry Map */}
              {activeStep === 0 && (
                <motion.div
                  key="preview-step-01"
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch"
                >
                  <div className="flex flex-col h-full">
                    <AIReportCard className="h-full flex flex-col justify-between" />
                  </div>
                  <div className="flex flex-col h-full">
                    <ZonalTelemetryMap className="h-full flex flex-col justify-between" />
                  </div>
                </motion.div>
              )}

              {/* STEP 02 PREVIEW: AI Multi-Modal Categorization & Urgency Analysis */}
              {activeStep === 1 && (
                <motion.div
                  key="preview-step-02"
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] shadow-xl p-6 sm:p-8 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#E8E0CE]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base sm:text-lg text-[#181A20]">
                          AI Multi-Modal Triage &amp; Prioritization
                        </h4>
                        <p className="text-xs text-[#5C5549]">
                          Model CF-v4 · Multi-Factor Urgency Evaluation
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      98.4% CONFIDENCE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-1">
                      <span className="text-[11px] font-mono text-[#7E7566] uppercase">Detected Domain</span>
                      <div className="font-display font-bold text-sm text-[#181A20]">Road Infrastructure</div>
                      <div className="text-[11px] text-emerald-700 font-medium">Asphalt cavity / Pothole</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-1">
                      <span className="text-[11px] font-mono text-[#7E7566] uppercase">Assessed Urgency</span>
                      <div className="font-display font-bold text-sm text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Priority Tier 1 (High)</span>
                      </div>
                      <div className="text-[11px] text-[#5C5549] font-medium">Traffic flow impeded</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-1">
                      <span className="text-[11px] font-mono text-[#7E7566] uppercase">Jurisdiction Match</span>
                      <div className="font-display font-bold text-sm text-teal-800">Ward 150 Bureau</div>
                      <div className="text-[11px] text-[#5C5549] font-medium">Service Lane ORR Corridor</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] space-y-3">
                    <span className="text-xs font-bold text-[#181A20] flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Multi-Factor Urgency Breakdown</span>
                    </span>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-[#5C5549] mb-1">
                          <span>Road Depth &amp; Cavity Hazard</span>
                          <span className="font-mono font-bold text-[#181A20]">94 / 100</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E8E0CE] overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: '94%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-[#5C5549] mb-1">
                          <span>Traffic Density Impact (Outer Ring Road)</span>
                          <span className="font-mono font-bold text-[#181A20]">88 / 100</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E8E0CE] overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-[#5C5549] mb-1">
                          <span>Weather &amp; Rain Deterioration Factor</span>
                          <span className="font-mono font-bold text-[#181A20]">76 / 100</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E8E0CE] overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: '76%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
                    <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>AI assists engineering officers by auto-tagging reports for expedited review and priority dispatch.</span>
                  </div>
                </motion.div>
              )}

              {/* STEP 03 PREVIEW: Transparent Resolution Progress Timeline */}
              {activeStep === 2 && (
                <motion.div
                  key="preview-step-03"
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] shadow-xl p-6 sm:p-8 space-y-6"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[#E8E0CE]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base sm:text-lg text-[#181A20]">
                          Verified Grievance Resolution Timeline
                        </h4>
                        <p className="text-xs text-[#5C5549]">
                          Ticket #CF-ORR-150 · Transparent Community Audit
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      IN PROGRESS
                    </span>
                  </div>

                  <div className="space-y-4 relative pl-6 border-l-2 border-emerald-300 ml-3">
                    <div className="relative">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute -left-[35px] top-0.5 bg-white rounded-full" />
                      <div className="font-display font-bold text-sm text-[#181A20]">
                        Citizen Report Submitted &amp; GPS Tagged
                      </div>
                      <div className="text-xs text-[#5C5549] mt-0.5">
                        Oct 14, 09:15 AM · Photographic proof and coordinates registered
                      </div>
                    </div>

                    <div className="relative">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute -left-[35px] top-0.5 bg-white rounded-full" />
                      <div className="font-display font-bold text-sm text-[#181A20]">
                        AI Triage &amp; Urgency Prioritization Complete
                      </div>
                      <div className="text-xs text-[#5C5549] mt-0.5">
                        Oct 14, 09:16 AM · Assigned High Priority Tier 1 based on traffic impact
                      </div>
                    </div>

                    <div className="relative">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute -left-[35px] top-0.5 bg-white rounded-full" />
                      <div className="font-display font-bold text-sm text-[#181A20]">
                        Municipal Ward Inspection Acknowledged
                      </div>
                      <div className="text-xs text-[#5C5549] mt-0.5">
                        Oct 14, 11:30 AM · Ward 150 Road Engineer reviewed and queued for repair
                      </div>
                    </div>

                    <div className="relative">
                      <Clock className="w-5 h-5 text-amber-600 absolute -left-[35px] top-0.5 bg-white rounded-full animate-pulse" />
                      <div className="font-display font-bold text-sm text-amber-800">
                        Asphalt Repair Crew Scheduled
                      </div>
                      <div className="text-xs text-amber-900 mt-0.5 font-medium">
                        Oct 15, 08:00 AM · Maintenance team dispatched for surface resurfacing
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] flex items-center justify-between text-xs text-[#5C5549]">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      <span>Every step logged with immutable timestamps for community trust.</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#7E7566]">Verified Public Record</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TracingBeam>
      </div>
    </section>
  );
}
