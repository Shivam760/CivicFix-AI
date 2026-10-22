import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles, Shield, Cpu, CheckCircle2 } from 'lucide-react';
import CivicLogo3D from '../../../components/CivicLogo3D';
import CivicLogo3DShowcase from '../../../components/CivicLogo3DShowcase';
import MagneticButton from '../components/MagneticButton';
import { BackgroundBeams } from '../../../components/ui/background-beams';

/**
 * HeroSection
 *
 * Cinematic wide-canvas hero utilizing edge-to-edge space with Aceternity-inspired
 * Background Beams, 3D CivicLogo3D brand mark, and 3D Pin AI Intake Console.
 */
export default function HeroSection() {
  const heroRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll parallax for background gradient orbs
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -120]);
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 80]);
  const orb3Y = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -60]);

  const handleScrollToHowItWorks = (e) => {
    e.preventDefault();
    const target = document.querySelector('#how-it-works');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen w-full flex flex-col justify-center pt-28 pb-16 overflow-hidden bg-gradient-to-b from-[#FFFDF8] via-[#FAF6EE] to-[#F4EDE0] text-[#181A20]"
      aria-label="CivicFix AI Overview"
    >
      {/* Background Beams filling left and right margins */}
      <BackgroundBeams />

      {/* Background Layer 1: Inline SVG Noise Grain Filter */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply z-0"
        aria-hidden="true"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="heroNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#heroNoise)" />
        </svg>
      </div>

      {/* Background Layer 2: Parallax Gradient Orbs */}
      <motion.div
        style={{ y: orb1Y }}
        className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <motion.div
        style={{ y: orb2Y }}
        className="absolute top-1/3 -right-24 w-[550px] h-[550px] rounded-full bg-teal-400/10 blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <motion.div
        style={{ y: orb3Y }}
        className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-400/15 blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Outer Margin Decorative Technical Rulers (Making use of left & right screen space) */}
      <div className="hidden 2xl:flex flex-col justify-between absolute left-6 top-36 bottom-20 z-10 text-[10px] font-mono text-[#7E7566] select-none pointer-events-none border-l border-[#E8E0CE] pl-3">
        <span>SYS: ONLINE</span>
        <span className="rotate-90 origin-left tracking-widest uppercase">YOUR NEIGHBOURHOOD</span>
        <span>LAT 12.9716° N</span>
      </div>
      <div className="hidden 2xl:flex flex-col justify-between absolute right-6 top-36 bottom-20 z-10 text-[10px] font-mono text-[#7E7566] text-right select-none pointer-events-none border-r border-[#E8E0CE] pr-3">
        <span>AI MODEL CF-v4</span>
        <span className="-rotate-90 origin-right tracking-widest uppercase">ZONAL INTAKE ACTIVE</span>
        <span>LON 77.5946° E</span>
      </div>

      {/* Main Content Wide Grid (max-w-[1536px] for expansive edge-to-edge breathing room) */}
      <div className="max-w-[1536px] mx-auto w-full px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center z-10 my-auto">
        {/* Left Column: Headlines, Brand Mark & Actions */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          {/* Brand Mark & Eyebrow Row */}
          <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap">
            <CivicLogo3D
              size="lg"
              animated={true}
              interactive={true}
              className="drop-shadow-lg"
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2ECE0] border border-[#E8E0CE] text-[#047857] text-xs font-semibold shadow-2xs"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="tracking-widest font-mono text-[11px] sm:text-xs font-bold uppercase text-emerald-800">
                CIVICFIX AI · SMARTER COMMUNITIES
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600 ml-0.5" />
            </motion.div>
          </div>

          {/* Large Headline with Controlled Line Breaks & Subtle Brand Gradient */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-[68px] xl:text-[76px] 2xl:text-[82px] font-black tracking-tight leading-[1.08] text-[#181A20]">
            <motion.span
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              Your Neighborhood.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="block mt-1 sm:mt-2"
            >
              <span>Your Voice. </span>
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Real Progress.
              </span>
            </motion.span>
          </h1>

          {/* Supporting Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease: 'easeOut' }}
            className="text-base sm:text-lg lg:text-xl text-[#5C5549] max-w-2xl leading-relaxed font-sans font-normal"
          >
            Report potholes, overflowing bins, broken streetlights, and other civic issues in seconds. CivicFix AI suggests a category and a complaint draft for you to check, and neighbours confirm when a repair is really done.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38, ease: 'easeOut' }}
            className="pt-2 flex flex-wrap items-center gap-4"
          >
            {/* Primary CTA */}
            <MagneticButton>
              <Link
                to="/signup"
                className="group relative inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <span>Report an Issue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticButton>

            {/* Secondary CTA */}
            <a
              href="#how-it-works"
              onClick={handleScrollToHowItWorks}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-[#FAF6EE] border border-[#E8E0CE] text-[#181A20] font-bold text-sm tracking-wide shadow-2xs hover:shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <span>Explore How It Works</span>
              <ChevronDown className="w-4 h-4 text-[#7E7566]" />
            </a>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5C5549] font-medium"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>You approve before anything is sent</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-600" />
              <span>AI suggestions, clearly labelled</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Transparent Progress Tracking</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: 3D Animating CivicFix AI Brand Emblem Showcase */}
        <div className="lg:col-span-5 flex items-center justify-center relative">
          <CivicLogo3DShowcase />
        </div>
      </div>

      {/* Gentle Scroll Indicator at Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none"
        aria-hidden="true"
      >
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#7E7566] uppercase">
          Scroll to explore
        </span>
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [0, 6, 0],
                }
          }
          transition={{
            duration: 1.8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="w-5 h-9 rounded-full border border-[#E8E0CE] flex items-start justify-center p-1 bg-white/70 shadow-2xs"
        >
          <div className="w-1 h-2 rounded-full bg-emerald-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}
