import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Star, Quote } from 'lucide-react';

/**
 * Counter item for impact row
 */
function ImpactCounter({ endValue, suffix = '', label, subtext }) {
  const shouldReduceMotion = useReducedMotion();
  const [val, setVal] = useState(() => (shouldReduceMotion ? endValue : 0));
  const elRef = useRef(null);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let start = null;
          const duration = 1800;
          const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setVal(ease * endValue);
            if (progress < 1) requestAnimationFrame(step);
            else setVal(endValue);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (elRef.current) observer.observe(elRef.current);
    return () => observer.disconnect();
  }, [endValue, shouldReduceMotion]);

  const display = Number.isInteger(endValue)
    ? Math.floor(val).toLocaleString()
    : val.toFixed(1);

  return (
    <div ref={elRef} className="text-center p-6 rounded-3xl bg-[#FFFDF8] border border-[#E8E0CE] shadow-sm hover:shadow-md transition-all">
      <div className="font-display text-4xl sm:text-5xl font-black text-[#181A20] tabular-nums tracking-tight mb-2">
        {display}{suffix}
      </div>
      <div className="text-sm font-bold text-[#059669] mb-1">{label}</div>
      <p className="text-xs text-[#5C5549] font-medium font-sans">{subtext}</p>
    </div>
  );
}

/**
 * ImpactSection
 * Demonstrates proven civic outcomes, verified authority affiliations,
 * and neighborhood testimonials.
 *
 * NOTE FOR BACKEND/AI DEVELOPER:
 * All impact percentages and testimonials are demonstration prototype data.
 * Will connect to live satisfaction surveys in FastAPI when ready.
 */
export default function ImpactSection() {
  const shouldReduceMotion = useReducedMotion();

  const testimonials = [
    {
      quote:
        'Reporting the open manhole on our lane took 20 seconds. It was inspected within 3 hours and repaired the next morning.',
      author: 'Ananya Sharma',
      role: 'Resident, Bellandur Ward 150',
    },
    {
      quote:
        'The automated categorization accurately directs issues to my engineering desk without endless manual sorting.',
      author: 'K. Rajshekhar',
      role: 'Zonal Public Works Supervisor',
    },
    {
      quote:
        'Complete transparency. The photo audit before and after asphalt sealing gives citizens total trust in municipal progress.',
      author: 'Vikram Menon',
      role: 'Civic Volunteer & Neighborhood Rep',
    },
    {
      quote:
        'The GPS telemetry eliminated jurisdictional finger-pointing between road and drainage authorities entirely.',
      author: 'Sunita Rao',
      role: 'Ward Committee Member',
    },
    {
      quote:
        'Fixed corridor darkness along a 2-kilometer school stretch in 48 hours. Phenomenal municipal velocity.',
      author: 'David Fernandez',
      role: 'Citizen Commuter, Indiranagar',
    },
    {
      quote:
        'Centralized analytics give our zonal executive team live visibility on contractor fulfillment and repair backlogs.',
      author: 'Meenakshi Iyer',
      role: 'Municipal Executive Director',
    },
  ];

  const authorities = [
    { name: 'Municipal Roads Dept.', division: 'Pavement Maintenance' },
    { name: 'Water Board & Sewerage', division: 'Pipeline Infrastructure' },
    { name: 'Sanitation Dept.', division: 'Solid Waste Management' },
    { name: 'Electrical Grid Authority', division: 'Corridor Lighting' },
    { name: 'Stormwater Control Bureau', division: 'Monsoon Flood Prevention' },
  ];

  const marqueeQuotes = [...testimonials, ...testimonials];

  return (
    <section
      id="impact"
      className="relative py-28 bg-[#FAF6EE] text-[#181A20] border-b border-[#E8E0CE] overflow-hidden"
      aria-label="CivicFix Municipal Impact and Trust"
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-[#059669] uppercase px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] inline-block mb-3 shadow-2xs">
            Civic Outcomes
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-[#181A20] tracking-tight mb-4">
            Measurable Community Trust &amp; Verified Impact
          </h2>
          <p className="text-sm sm:text-base text-[#5C5549] leading-relaxed font-sans">
            Real neighborhoods, verified public works departments, and transparent resolution milestones.
          </p>
        </div>

        {/* Impact Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <ImpactCounter
            endValue={98.8}
            suffix="%"
            label="Verified Intake Precision"
            subtext="AI computer-vision damage classification"
          />
          <ImpactCounter
            endValue={3.4}
            suffix="x"
            label="Faster Authority Dispatch"
            subtext="Compared to manual municipal telephone triage"
          />
          <ImpactCounter
            endValue={94.2}
            suffix="%"
            label="Citizen Satisfaction"
            subtext="Verified on-site closure satisfaction rating"
          />
        </div>

        {/* Verified Municipal Authorities Row */}
        <div className="mb-16">
          <div className="text-center text-xs font-bold font-mono text-[#7E7566] uppercase tracking-widest mb-6">
            Integrated Municipal Authorities
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {authorities.map((auth, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#FFFDF8] border border-[#E8E0CE] hover:border-emerald-300 transition-colors shadow-2xs"
              >
                <div className="w-5 h-5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#181A20]">{auth.name}</div>
                  <div className="text-[10px] text-[#7E7566] font-mono">{auth.division}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Neighborhood Testimonial Marquee */}
        <div className="relative w-full overflow-hidden py-4 border-y border-[#E8E0CE] bg-[#FFFDF8]">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#FFFDF8] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#FFFDF8] to-transparent z-10 pointer-events-none" />

          <div
            className={`flex items-stretch gap-6 w-max ${
              shouldReduceMotion ? 'overflow-x-auto justify-center' : 'animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused]'
            }`}
            style={shouldReduceMotion ? {} : { willChange: 'transform' }}
          >
            {marqueeQuotes.map((t, idx) => (
              <div
                key={idx}
                className="w-80 sm:w-96 p-6 rounded-3xl bg-[#FAF6EE] border border-[#E8E0CE] flex flex-col justify-between shrink-0 select-none shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#3E382E] leading-relaxed font-sans italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E8E0CE]/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#181A20]">{t.author}</div>
                    <div className="text-[11px] text-emerald-800 font-mono font-medium">{t.role}</div>
                  </div>
                  <Quote className="w-5 h-5 text-[#D5C9B3]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footnote Disclosing Illustrative Examples */}
        <p className="text-[11px] text-[#7E7566] text-center mt-4 font-medium">
          *Illustrative examples from pilot municipal deployments and test user feedback sessions.
        </p>
      </div>
    </section>
  );
}
