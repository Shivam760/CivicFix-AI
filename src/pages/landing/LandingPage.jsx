import React, { useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import useDocumentTitle from '../../hooks/useDocumentTitle';
import Navbar from './components/Navbar';
import HeroSection from './sections/HeroSection';

// Below-the-fold sections are lazy-loaded with React.lazy and Suspense
// for minimal initial bundle size and rapid Largest Contentful Paint (LCP)
const StatsSection = lazy(() => import('./sections/StatsSection'));
const HowItWorksSection = lazy(() => import('./sections/HowItWorksSection'));
const ProductShowcaseSection = lazy(() => import('./sections/ProductShowcaseSection'));
const FeaturesSection = lazy(() => import('./sections/FeaturesSection'));
const RolesSection = lazy(() => import('./sections/RolesSection'));
const ImpactSection = lazy(() => import('./sections/ImpactSection'));
const CtaSection = lazy(() => import('./sections/CtaSection'));
const FooterSection = lazy(() => import('./sections/FooterSection'));

/**
 * Lightweight placeholder for below-the-fold sections while lazy chunks load
 */
function SectionFallback({ minHeight = 'min-h-[280px]' }) {
  return (
    <div
      className={`w-full ${minHeight} bg-[#FAF6EE] flex items-center justify-center py-12`}
      aria-busy="true"
      aria-label="Loading section content..."
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
        <span className="text-xs text-[#7E7566] font-mono tracking-wider uppercase font-semibold">
          Loading CivicFix AI...
        </span>
      </div>
    </div>
  );
}

/**
 * LandingPage
 *
 * Cinematic, animated showcase landing page for CivicFix AI.
 * Implements:
 * - Lenis smooth scrolling (disabled for users with prefers-reduced-motion)
 * - Semantic landmarks (<header>, <main id="main-content">, <footer>)
 * - Accessible skip-to-content anchor for keyboard navigation
 * - Dynamic SEO meta tags and page title
 * - Eagerly loaded Hero for instantaneous LCP; lazy below-the-fold chunking
 */
export default function LandingPage() {
  // Set dynamic SEO page title and meta description
  useDocumentTitle(
    'CivicFix AI — Next-Gen Civic Grievance & Infrastructure Platform',
    'AI-assisted civic grievance reporting and infrastructure tracking platform. Report potholes, streetlights, garbage, and drainage with instant AI routing to verified municipal authorities.'
  );

  // Initialize Lenis smooth scroll
  useEffect(() => {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    let lenisInstance = null;
    let rafId = null;

    try {
      lenisInstance = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exponential ease-out
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
      });

      // Expose on window for components (e.g. BackToTop in FooterSection)
      window.__lenis = lenisInstance;

      // Render loop
      function raf(time) {
        lenisInstance.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    } catch (err) {
      console.warn('Lenis smooth scroll initialization skipped:', err);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (lenisInstance) {
        lenisInstance.destroy();
        delete window.__lenis;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#181A20] selection:bg-emerald-600 selection:text-white font-sans antialiased overflow-x-hidden relative">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[999] px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold shadow-xl ring-2 ring-emerald-300 transition"
      >
        Skip to main content
      </a>

      {/* Global Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main id="main-content" className="relative z-10 focus:outline-none">
        {/* Hero Section — Eagerly rendered for maximum speed & visual impact */}
        <HeroSection />

        {/* Below-the-fold sections lazy-loaded in sequence */}
        <Suspense fallback={<SectionFallback minHeight="min-h-[160px]" />}>
          <StatsSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[400px]" />}>
          <HowItWorksSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[500px]" />}>
          <ProductShowcaseSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[400px]" />}>
          <FeaturesSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[400px]" />}>
          <RolesSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[300px]" />}>
          <ImpactSection />
        </Suspense>

        <Suspense fallback={<SectionFallback minHeight="min-h-[300px]" />}>
          <CtaSection />
        </Suspense>
      </main>

      {/* Footer */}
      <Suspense fallback={<div className="h-32 bg-[#F4EDE0]" />}>
        <FooterSection />
      </Suspense>
    </div>
  );
}
