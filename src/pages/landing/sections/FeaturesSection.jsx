import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import CategoryIcon from '../../../components/icons3d/CategoryIcon';
import { staggerContainer, fadeUp } from '../../../lib/motion';

/**
 * SpotlightCard
 * Glass card with dynamic cursor-following spotlight glow using CSS custom variables.
 */
function SpotlightCard({ children, className = '' }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-500/80 overflow-hidden ${className}`}
    >
      {/* Spotlight glow layer */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(550px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(16, 185, 129, 0.08), transparent 40%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

/**
 * FeaturesSection
 * Responsive Bento Grid of 6 core civic technology capabilities with custom spotlights.
 */
export default function FeaturesSection() {
  const shouldReduceMotion = useReducedMotion();

  const features = [
    {
      id: 'ai-vision',
      colSpan: 'lg:col-span-8',
      category: 'road',
      badge: 'Vision Model',
      title: 'Multi-Modal AI Auto-Categorization',
      description:
        'Advanced computer vision scans photographic uploads to detect damage dimensions, categorize hazard domains, and calculate urgency scores before human review.',
      tag: '98.8% Intake Precision',
    },
    {
      id: 'gis-map',
      colSpan: 'lg:col-span-4',
      category: 'streetlight',
      badge: 'GIS Telemetry',
      title: 'Live Geo-Spatial Ward Mapping',
      description:
        'Pinpoint coordinates are mapped against municipal ward boundaries, preventing jurisdictional disputes and duplicate issue logging.',
      tag: 'Automatic Ward Boundary Lock',
    },
    {
      id: 'photo-vault',
      colSpan: 'lg:col-span-4',
      category: 'water',
      badge: 'Audit Proof',
      title: 'Tamper-Proof Photo Evidence',
      description:
        'Contractors must upload geo-tagged, timestamped photographic verification of repaired infrastructure before tickets can be signed off.',
      tag: 'Cryptographic Timestamping',
    },
    {
      id: 'authorities',
      colSpan: 'lg:col-span-8',
      category: 'drainage',
      badge: 'Directory',
      title: 'Authenticated Municipal Routing',
      description:
        'Instant triage links directly to verified municipal authorities — BBMP Roads, BWSSB Water, BESCOM Electrical, and Solid Waste Corporations.',
      tag: 'Zero Bureaucratic Delay',
    },
    {
      id: 'alerts',
      colSpan: 'lg:col-span-6',
      category: 'garbage',
      badge: 'Notifications',
      title: 'Real-Time Milestone Alerts',
      description:
        'Citizens receive automatic status updates as cases transition from intake to assignment, active repair crew deployment, and final inspection.',
      tag: 'Multi-Channel Updates',
    },
    {
      id: 'audit-trail',
      colSpan: 'lg:col-span-6',
      category: 'other',
      badge: 'Governance',
      title: 'Immutable Public Audit Trail',
      description:
        'Every status change, engineer note, and completion timestamp is permanently recorded, fostering complete civic transparency and public trust.',
      tag: 'Open Public Accountability',
    },
  ];

  return (
    <section
      id="features"
      className="relative py-28 bg-[#FFFDF8] text-[#181A20] border-b border-[#E8E0CE] overflow-hidden"
      aria-label="CivicFix Platform Features"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-mono font-bold tracking-widest text-[#059669] uppercase px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] inline-block mb-3 shadow-2xs">
            Core Architecture
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-[#181A20] tracking-tight mb-4">
            Built for High-Velocity Municipal Governance
          </h2>
          <p className="text-sm sm:text-base text-[#5C5549] leading-relaxed font-sans">
            Combining state-of-the-art vision models, verified directory routing, and tamper-proof field milestones.
          </p>
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={shouldReduceMotion ? undefined : staggerContainer(0.08, 0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {features.map((feat) => (
            <motion.div
              key={feat.id}
              variants={shouldReduceMotion ? undefined : fadeUp}
              className={`${feat.colSpan} flex`}
            >
              <SpotlightCard className="w-full flex flex-col justify-between">
                <div>
                  {/* Top Bar with 3D Category Icon and Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2.5 rounded-2xl bg-[#FAF6EE] border border-[#E8E0CE] shadow-2xs">
                      <CategoryIcon category={feat.category} size={32} />
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FAF6EE] text-[#5C5549] border border-[#E8E0CE]">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#181A20] mb-2 tracking-tight group-hover:text-emerald-700 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C5549] leading-relaxed font-sans mb-6">
                    {feat.description}
                  </p>
                </div>

                {/* Bottom Tag */}
                <div className="pt-4 border-t border-[#E8E0CE]/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold font-mono text-[11px] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{feat.tag}</span>
                  </div>
                  <span className="text-[#7E7566] font-medium font-mono text-[10.5px]">CivicFix Enterprise</span>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
