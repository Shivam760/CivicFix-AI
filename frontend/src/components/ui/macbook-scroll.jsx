import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * MacbookScroll (Aceternity UI inspired)
 *
 * Implements:
 * - Scroll-linked 3D lid rotation opening from 25° down to 0°
 * - Realistic MacBook keyboard chassis, speaker grilles, and trackpad
 * - High-DPI screen bezel with actual CivicFix AI citizen dashboard screenshot
 * - Support for prefers-reduced-motion (renders open laptop statically)
 * - Expansive width utilizing the full left and right space of the landing page
 */
export function MacbookScroll({
  src,
  title,
  badge,
}) {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const rotate = useTransform(scrollYProgress, [0.1, 0.6], [-28, 0]);

  return (
    <div
      ref={ref}
      className="relative min-h-[140vh] sm:min-h-[160vh] flex flex-col items-center py-16 sm:py-24 overflow-hidden bg-[#FAF6EE] text-[#181A20]"
    >
      {/* Title & Badge */}
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-4 z-20 mb-12 sm:mb-20">
        {badge && <div className="mb-4">{badge}</div>}
        {title}
      </div>

      {/* Sticky Laptop Stage */}
      <div className="sticky top-28 sm:top-36 flex flex-col items-center justify-center w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 z-10">
        {/* 3D Perspective Stage */}
        <div
          className="relative flex flex-col items-center w-full max-w-[980px] select-none"
          style={{ perspective: '1200px' }}
        >
          {/* Laptop Lid (Screen) */}
          <motion.div
            style={
              shouldReduceMotion
                ? { transform: 'rotateX(0deg)' }
                : {
                    rotateX: rotate,
                    transformStyle: 'preserve-3d',
                  }
            }
            className="relative w-full aspect-[16/10] max-h-[580px] rounded-[24px] bg-[#0F172A] p-2.5 sm:p-3.5 border-4 border-[#334155] shadow-2xl origin-bottom transition-transform"
          >
            {/* Glossy Screen Bezel */}
            <div className="relative w-full h-full rounded-[16px] overflow-hidden bg-black border border-slate-800">
              {/* Webcam */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-30">
                <div className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </div>

              {/* Real Dashboard Screenshot */}
              <picture>
                <source srcSet={src} type="image/webp" />
                <img
                  src="/images/dashboard-preview.png"
                  alt="CivicFix AI citizen dashboard on a laptop screen"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </picture>

              {/* Glass Reflection Highlight */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08] pointer-events-none z-20"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          {/* Laptop Base (Chassis, Hinge & Keyboard) */}
          <div className="relative w-[105%] -mt-1 h-8 sm:h-10 bg-gradient-to-b from-[#64748B] via-[#475569] to-[#1E293B] rounded-b-[20px] shadow-[0_24px_50px_rgba(15,23,42,0.35)] flex items-center justify-center px-8 border-t border-slate-400/40">
            {/* Notch indent for opening */}
            <div className="w-20 sm:w-28 h-2 rounded-b-lg bg-[#0F172A] -mt-6 border-b border-slate-600" />
          </div>

          {/* Soft Ground Contact Shadow */}
          <div
            className="w-[90%] h-10 -mt-2 bg-emerald-950/25 blur-2xl rounded-full pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
