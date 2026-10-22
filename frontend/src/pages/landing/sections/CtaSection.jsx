import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import MagneticButton from '../components/MagneticButton';

/**
 * CtaSection
 * Prominent civic closing call to action featuring emerald gradient banner
 * and magnetic interaction button, fully optimized for light theme.
 */
export default function CtaSection() {
  const shouldReduceMotion = useReducedMotion();

  const lines = [
    'Seen a problem on your street?',
    'Report it in a few minutes.',
  ];

  return (
    <section
      className="relative py-20 sm:py-28 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 bg-[#FAF6EE] overflow-hidden"
      aria-label="CivicFix Call to Action"
    >
      <div className="max-w-[1536px] mx-auto relative rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-8 sm:p-16 lg:p-20 text-center text-white shadow-2xl shadow-emerald-900/20 overflow-hidden">
        {/* Soft Radial Ambient Glow */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-3xl mx-auto relative z-10 space-y-6 sm:space-y-8">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Active Public Citizen Network</span>
          </div>

          {/* Line-by-Line Headline Reveal */}
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            {lines.map((line, idx) => (
              <span key={idx} className="block overflow-hidden">
                <motion.span
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: shouldReduceMotion ? 0.2 : 0.55,
                    delay: shouldReduceMotion ? 0 : idx * 0.15,
                    ease: [0.215, 0.61, 0.355, 1],
                  }}
                  className={`inline-block ${
                    idx === 1
                      ? 'bg-gradient-to-r from-emerald-200 via-teal-100 to-white bg-clip-text text-transparent'
                      : ''
                  }`}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed font-sans font-normal">
            Create a free account, describe the issue, add photos, and follow it until residents confirm it is fixed.
          </p>

          {/* Magnetic Button & Secondary Action */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white hover:bg-emerald-50 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-slate-950/20 hover:shadow-2xl transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <span>Report an issue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticButton>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm tracking-wide transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <span>Sign In to Platform</span>
            </Link>
          </div>

          {/* Security Seal */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-emerald-200/80 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Nothing is sent anywhere without your approval</span>
          </div>
        </div>
      </div>
    </section>
  );
}
