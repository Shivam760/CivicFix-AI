import React, { useRef, useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Activity, Clock, Building2, Users } from 'lucide-react';
import CategoryIcon from '../../../components/icons3d/CategoryIcon';

/**
 * AnimatedCounter
 * Smoothly animates from 0 up to the target value when intersecting the viewport.
 */
function AnimatedCounter({ endValue, duration = 2000, suffix = '', prefix = '', decimals = 0 }) {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(() => (shouldReduceMotion ? endValue : 0));
  const counterRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime = null;

          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out quart curve: 1 - (1 - progress)^4
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = easeProgress * endValue;

            setCount(current);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(endValue);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.25 }
    );

    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, [endValue, duration, shouldReduceMotion]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString();

  return (
    <span ref={counterRef} className="tabular-nums font-display font-black text-slate-950">
      {prefix}{formatted}{suffix}
    </span>
  );
}

/**
 * StatsSection
 * Metrics summary bar with animated counters and continuous civic category marquee.
 */
export default function StatsSection() {
  const shouldReduceMotion = useReducedMotion();

  // ============================================================================
  // ⚠️ BACKEND & AI DEPARTMENT INTEGRATION NOTICE:
  // NOTE: All metrics below:
  //   - Complaints Tracked: 14,820+ (Across municipal ward zones)
  //   - Avg. Resolution Time: 48 hrs (From intake to contractor sign-off)
  //   - Authorities Onboarded: 84 (Verified municipal departments)
  //   - Citizens Reporting: 32,500+ (Active registered neighborhood voices)
  //
  // ARE CURRENTLY DEMO / SIMULATED NUMBERS for frontend demonstration purposes.
  // When the backend and AI developer implements the live backend services:
  // -> Update these demo figures with live queries from FastAPI + PostgreSQL.
  // -> Expected Endpoint: GET /api/v1/analytics/public-overview
  // -> Expected Response Shape:
  //    {
  //      "complaints_tracked": 14820,
  //      "avg_resolution_hours": 48,
  //      "authorities_onboarded": 84,
  //      "citizens_reporting": 32500
  //    }
  // Currently running on client-side demo figures until backend and AI department is ready.
  // ============================================================================
  const metrics = [
    {
      label: 'Complaints Tracked',
      value: 14820,
      suffix: '+',
      icon: Activity,
      color: 'text-emerald-700',
      detail: 'Across municipal ward zones',
    },
    {
      label: 'Avg. Resolution Time',
      value: 48,
      suffix: ' hrs',
      icon: Clock,
      color: 'text-amber-700',
      detail: 'From intake to contractor sign-off',
    },
    {
      label: 'Authorities Onboarded',
      value: 84,
      suffix: '',
      icon: Building2,
      color: 'text-teal-700',
      detail: 'Verified municipal departments',
    },
    {
      label: 'Citizens Reporting',
      value: 32500,
      suffix: '+',
      icon: Users,
      color: 'text-blue-700',
      detail: 'Active registered neighborhood voices',
    },
  ];

  const civicCategories = [
    { id: 'road', name: 'Roads & Potholes', count: '5.2k cases' },
    { id: 'streetlight', name: 'Streetlights & Safety', count: '3.8k cases' },
    { id: 'garbage', name: 'Sanitation & Waste', count: '4.1k cases' },
    { id: 'drainage', name: 'Drainage & Flooding', count: '1.2k cases' },
    { id: 'water', name: 'Water Leakage & Mains', count: '2.4k cases' },
  ];

  // Duplicate for seamless infinite loop marquee
  const marqueeItems = [...civicCategories, ...civicCategories, ...civicCategories];

  return (
    <section
      className="relative z-10 py-16 bg-[#FFFDF8] border-y border-[#E8E0CE] overflow-hidden"
      aria-label="CivicFix Platform Statistics and Categories"
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 mb-10">
        {/* Demo Status Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#E8E0CE] text-[11px] font-semibold text-[#7E7566] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Demo Preview Metrics • Live FastAPI &amp; AI Telemetry in Progress</span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-3xl bg-[#FAF6EE] border border-[#E8E0CE] hover:border-emerald-400 hover:bg-white transition-all shadow-xs hover:shadow-md group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#7E7566] uppercase tracking-wider">
                    {item.label}
                  </span>
                  <div className="p-2 rounded-xl bg-white border border-[#E8E0CE] shadow-2xs">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                </div>

                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#181A20] tracking-tight mb-1">
                  <AnimatedCounter endValue={item.value} suffix={item.suffix} />
                </div>

                <p className="text-xs text-[#5C5549] font-medium">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footnote Disclosing Sample Figures */}
        <p className="text-[11px] text-[#7E7566] text-center mt-4 font-medium">
          *Demonstration preview metrics. All figures are currently demo numbers. Real-time metrics will update automatically when the FastAPI &amp; AI backend is connected.
        </p>
      </div>

      {/* Horizontal Infinite Marquee */}
      <div className="relative w-full overflow-hidden py-4 border-t border-[#E8E0CE] bg-[#FAF6EE]/60">
        {/* Soft Left & Right Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[#FFFDF8] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[#FFFDF8] to-transparent z-10 pointer-events-none" />

        <div
          className={`flex items-center gap-4 w-max ${
            shouldReduceMotion ? 'overflow-x-auto justify-center' : 'animate-[marquee_35s_linear_infinite] hover:[animation-play-state:paused]'
          }`}
          style={shouldReduceMotion ? {} : { willChange: 'transform' }}
        >
          {marqueeItems.map((cat, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAF6EE] border border-[#E8E0CE] transition-colors shrink-0 select-none shadow-2xs"
            >
              <CategoryIcon category={cat.id} size={22} />
              <span className="text-xs font-bold text-[#181A20]">{cat.name}</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-emerald-800 border border-[#A7F3D0] tabular-nums">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
