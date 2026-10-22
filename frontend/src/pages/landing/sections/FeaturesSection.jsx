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
      badge: 'AI assistant',
      title: 'AI suggestions you check',
      description:
        'The AI reads your report and suggests a category, a matching authority from the directory, missing details, and a complaint draft. Every suggestion is labelled as one, and nothing is applied until you accept it.',
      tag: 'Suggestions, not facts',
    },
    {
      id: 'approval',
      colSpan: 'lg:col-span-4',
      category: 'streetlight',
      badge: 'Your approval',
      title: 'You approve the exact text',
      description:
        'Edit the draft as often as you like; each edit is a new version. Only the version you approve can be sent, and editing clears the approval.',
      tag: 'Versioned drafts',
    },
    {
      id: 'photo-evidence',
      colSpan: 'lg:col-span-4',
      category: 'water',
      badge: 'Photos',
      title: 'Private photo evidence',
      description:
        'Attach up to 5 photos. Location data is stripped from each file, and photos are only visible to you, officials and residents checking a repair.',
      tag: 'GPS metadata removed',
    },
    {
      id: 'verification',
      colSpan: 'lg:col-span-8',
      category: 'drainage',
      badge: 'Residents decide',
      title: 'Neighbours confirm repairs',
      description:
        'When an official claims a repair, they add after-repair photos. You and residents living within 2 km check it in person and vote. Only those votes mark it resolved.',
      tag: 'A claim is not proof',
    },
    {
      id: 'officials',
      colSpan: 'lg:col-span-6',
      category: 'garbage',
      badge: 'Officials',
      title: 'A clear workflow for officials',
      description:
        'Officials see every report and move it through review and repair with notes, following the allowed steps. They cannot edit your report or your drafts.',
      tag: 'Role-based access',
    },
    {
      id: 'history',
      colSpan: 'lg:col-span-6',
      category: 'other',
      badge: 'History',
      title: 'Every step recorded',
      description:
        'Each change, approval, photo and vote is added to the report history, so you can see what happened and when.',
      tag: 'Event timeline',
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
            AI help that stays a suggestion, your approval of every word, and repairs confirmed by the people who live there.
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
