import React from 'react';
import { Sparkles } from 'lucide-react';
import { MacbookScroll } from '../../../components/ui/macbook-scroll';

/**
 * ProductShowcaseSection
 *
 * Aceternity UI MacBook Scroll showcase section displaying the real CivicFix AI
 * Citizen Grievance Portal dashboard inside an animated 3D laptop chassis.
 */
export default function ProductShowcaseSection() {
  return (
    <section
      id="product-showcase"
      className="relative w-full overflow-hidden bg-[#FAF6EE] border-b border-[#E8E0CE]"
      aria-label="CivicFix AI Product Dashboard Showcase"
    >
      <MacbookScroll
        src="/images/dashboard-preview.webp"
        badge={
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-mono font-bold tracking-widest uppercase shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>CITIZEN PORTAL PREVIEW</span>
          </div>
        }
        title={
          <div className="space-y-3">
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-[#181A20] tracking-tight leading-[1.12]">
              <span>Commanding City-Scale Progress. </span>
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Built for Real Communities.
              </span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-[#5C5549] max-w-2xl mx-auto font-sans leading-relaxed">
              A preview of the citizen dashboard: your reports, their status, and the repairs waiting for your check.
            </p>
          </div>
        }
      />
    </section>
  );
}
