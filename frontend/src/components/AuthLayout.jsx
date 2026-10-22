import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import CivicHeader from './CivicHeader';
import ThemeToggle from './common/ThemeToggle';
import CivicIllustration from './CivicIllustration';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ShieldCheck, Activity, Lock, Sparkles } from 'lucide-react';

/**
 * TiltIllustrationContainer
 * Subtle 3D perspective container tracking mouse movement.
 * Honors prefers-reduced-motion by disabling tilt effect.
 */
function TiltIllustrationContainer({ children, className = '' }) {
  const shouldReduce = useReducedMotion();
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (shouldReduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotation({
      x: (-y / (rect.height / 2)) * 3.5,
      y: (x / (rect.width / 2)) * 3.5,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: rotation.x, rotateY: rotation.y }}
      transition={{ type: 'spring', damping: 28, stiffness: 120 }}
      style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
      className={`relative w-full flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 auth-gradient-bg opacity-30 rounded-3xl blur-2xl -z-10 pointer-events-none" />
      {children}
    </motion.div>
  );
}

/**
 * AuthLayout
 * Premium, Production-Quality Civic Technology Authentication Layout.
 * 
 * Design Standards:
 * - Soothing eye-protective warm canvas with elevated warm surfaces.
 * - Dignified, restrained animations with strict reduced-motion support.
 * - Genuine civic-impact copy with zero fake or invented statistics.
 * - Tested responsiveness from 320px mobile up to 1920px widescreen.
 */
export default function AuthLayout({
  children,
  illustrationSide = 'right', // 'right' for login, 'left' for signup, 'center' for forgot-password
  pageKey = 'auth',
}) {
  const shouldReduceMotion = useReducedMotion();
  // Render only one layout: hiding the other with CSS would leave a second
  // copy of the form in the page, with the same input IDs.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Dignified, restrained entrance motion (no flash, no jarring effects)
  const pageEntranceVariants = {
    initial: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : -6,
      transition: { duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeIn' },
    },
  };

  const isLeftIllustration = illustrationSide === 'left';
  const isCenter = illustrationSide === 'center';
  const isSignUp = pageKey === 'signup';

  return (
    <motion.div
      key={pageKey}
      variants={pageEntranceVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen w-full bg-surface-canvas text-navy flex flex-col justify-between selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden relative transition-colors"
    >
      {/* Light / dark mode switch */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Subtle Architectural Grid for Soft Depth */}
      <div className="fixed inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none -z-10" />

      {/* Warm Ambient Sunlight Accents (Anti-Glare / Eye-Care) */}
      <div className="fixed -top-32 right-0 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="fixed -bottom-32 left-0 w-[500px] h-[500px] bg-yellow-100/30 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* ========================================================================= */}
      {/* DESKTOP / TABLET DUAL-AUTHORITY SPLIT LAYOUT (>= 1024px)                  */}
      {/* ========================================================================= */}
      {isDesktop ? (
      <main className="flex w-full min-h-screen relative z-10 py-8 lg:py-12 px-6 sm:px-8 lg:px-12 max-w-[1240px] xl:max-w-[1360px] mx-auto items-center justify-center">
        {/* If Forgot Password (Centered Layout) */}
        {isCenter ? (
          <div className="w-full flex flex-col items-center justify-center p-4 max-w-xl mx-auto my-auto">
            <div className="w-full flex justify-center mb-6">
              <CivicHeader />
            </div>
            <div className="w-full p-2 sm:p-4">
              {children}
            </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 xl:gap-14 items-start my-auto">
            {/* LEFT COLUMN */}
            <div className="w-full min-w-0 flex flex-col justify-start">
              {isLeftIllustration ? (
                isSignUp ? (
                  // -------------------------------------------------------------
                  // SIGN-UP LEFT SIDE: Community Impact Showcase (Aligned Top)
                  // -------------------------------------------------------------
                  <div className="w-full max-w-[500px] xl:max-w-[540px] mx-auto flex flex-col justify-start relative">
                    {/* Top Community Banner: Exact height & alignment match to CivicHeader */}
                    <div className="h-[44px] flex items-center justify-between border-b border-[#E5DAC4]/60 pb-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11.5px] font-mono font-bold tracking-wider text-emerald-800 uppercase">
                          CivicFix AI Community Network
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-stone-600 px-2.5 py-0.5 rounded-full bg-[#F3EDE0]/80 border border-[#E5DAC4]/80">
                        Citizen Portal
                      </span>
                    </div>

                    {/* Headline & Civic Impact Mission */}
                    <div className="pt-1 pb-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-bold mb-1.5 border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Citizen Participation</span>
                      </div>
                      <h2 className="text-xl xl:text-2xl font-black text-stone-900 tracking-tight leading-snug">
                        Empowering Citizens. <span className="text-emerald-700">Restoring Communities.</span>
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        Report problems on your street, follow every status change, and confirm repairs with your neighbours.
                      </p>
                    </div>

                    {/* 3 Citizen Impact Pillars (Compact & crisp) */}
                    <div className="space-y-2 py-2">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-[#EBE3D0]/80 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">
                          🛣️
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-900">Road Infrastructure &amp; Hazards</div>
                          <div className="text-[11px] text-stone-600 font-medium">Pin potholes and road damage on the map, with photos.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-[#EBE3D0]/80 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 text-sm font-bold">
                          ♻️
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-900">Sanitation &amp; Waste Management</div>
                          <div className="text-[11px] text-stone-600 font-medium">Report overflowing bins and blocked drains.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-[#EBE3D0]/80 shadow-2xs">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-bold">
                          💡
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-900">Streetlights &amp; Public Safety</div>
                          <div className="text-[11px] text-stone-600 font-medium">Report broken fixtures to restore illuminated corridors.</div>
                        </div>
                      </div>
                    </div>

                    {/* Centered Vector Illustration - Lifted and fully visible */}
                    <TiltIllustrationContainer className="py-1">
                      <CivicIllustration _variant="desktop" className="w-full max-w-[360px] xl:max-w-[400px]" />
                    </TiltIllustrationContainer>

                    {/* Authentic Citizen Trust Guarantees */}
                    <div className="pt-2.5 border-t border-[#E5DAC4]/60 flex items-center justify-around text-center text-[11px] font-semibold text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>You approve every draft</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Neighbours verify repairs</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // -------------------------------------------------------------
                  // LOGIN LEFT SIDE: Seamless Civic Infrastructure Showcase
                  // -------------------------------------------------------------
                  <div className="w-full max-w-[560px] xl:max-w-[620px] mx-auto flex flex-col items-center justify-start relative text-center">
                    {/* Top Badge: Aligned with right branding header */}
                    <div className="w-full h-[44px] flex items-center justify-between border-b border-[#E5DAC4]/60 pb-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-mono font-semibold tracking-wider text-stone-600 uppercase">
                          Public Infrastructure Network
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-800 font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-300/60">
                        Community Reports
                      </span>
                    </div>

                    {/* Hero Centered 3D Illustration - Enlarged by ~38-40% */}
                    <TiltIllustrationContainer className="my-auto py-2 xl:py-2.5">
                      <CivicIllustration _variant="desktop" className="w-full max-w-[540px] xl:max-w-[590px]" />
                    </TiltIllustrationContainer>

                    {/* Civic Impact Statement */}
                    <div className="w-full pt-3.5 border-t border-[#E5DAC4]/60">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                        Smart Civic Reporting &amp; Neighbour-Verified Repairs
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                        AI suggestions you approve, a clear status history, and repairs confirmed by the people who live there.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                // -------------------------------------------------------------
                // LEFT SIDE FORM (When illustration is on right)
                // -------------------------------------------------------------
                <div className="w-full max-w-[450px] xl:max-w-[480px] mx-auto flex flex-col justify-start relative">
                  <div className="h-[44px] flex items-center justify-start mb-4">
                    <CivicHeader />
                  </div>
                  <div>{children}</div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="w-full min-w-0 flex flex-col justify-start">
              {!isLeftIllustration ? (
                // -------------------------------------------------------------
                // RIGHT SIDE ILLUSTRATION (When illustration is on right)
                // -------------------------------------------------------------
                <div className="w-full max-w-[560px] xl:max-w-[620px] mx-auto flex flex-col items-center justify-start relative text-center">
                  {/* Top Badge: Aligned with left branding header */}
                  <div className="w-full h-[44px] flex items-center justify-between border-b border-[#E5DAC4]/60 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-mono font-semibold tracking-wider text-stone-600 uppercase">
                        Public Infrastructure Network
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-800 font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-300/60">
                      Community Reports
                    </span>
                  </div>

                  {/* Hero Centered 3D Illustration - Enlarged by ~38-40% */}
                  <TiltIllustrationContainer className="my-auto py-2 xl:py-2.5">
                    <CivicIllustration _variant="desktop" className="w-full max-w-[540px] xl:max-w-[590px]" />
                  </TiltIllustrationContainer>

                  {/* Civic Impact Statement */}
                  <div className="w-full pt-3.5 border-t border-[#E5DAC4]/60">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                      Smart Civic Reporting &amp; Neighbour-Verified Repairs
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                      AI suggestions you approve, a clear status history, and repairs confirmed by the people who live there.
                    </p>
                  </div>
                </div>
              ) : (
                // -------------------------------------------------------------
                // RIGHT SIDE FORM (When illustration is on left)
                // -------------------------------------------------------------
                <div className="w-full max-w-[450px] xl:max-w-[480px] mx-auto flex flex-col justify-start relative">
                  <div className="h-[44px] flex items-center justify-start mb-4">
                    <CivicHeader />
                  </div>
                  <div>{children}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      ) : (
      <>
      {/* ========================================================================= */}
      {/* MOBILE & TABLET LAYOUT (< 1024px)                                         */}
      {/* ========================================================================= */}
      <main className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-16 max-w-lg mx-auto w-full relative z-10 justify-center">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <CivicHeader />
          <span className="text-[10.5px] font-mono text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
            {isSignUp ? 'Enrollment' : 'Portal'}
          </span>
        </div>

        {/* Mobile Form Sitting Seamlessly on Background */}
        <div className="w-full p-2 sm:p-6 my-auto">
          {children}
        </div>

        {/* Mobile Civic Illustration below form (for login/signup) */}
        {!isCenter && (
          <div className="w-full py-6 flex flex-col items-center text-center">
            <CivicIllustration _variant="mobile" className="w-full max-w-[340px]" />
            <div className="pt-3 px-2">
              <span className="text-xs font-bold text-stone-800">
                Public Infrastructure Network
              </span>
              <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                AI-assisted civic reporting, with repairs confirmed by neighbours.
              </p>
            </div>
          </div>
        )}

        {/* Mobile Footer with Security Seal */}
        <footer className="mt-6 pt-4 pb-2 text-center text-[11px] text-stone-600 font-medium border-t border-[#E5DAC4] flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>CivicFix AI · community issue reporting</span>
        </footer>
      </main>
      </>
      )}
    </motion.div>
  );
}
