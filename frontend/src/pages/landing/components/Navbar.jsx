import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import CivicHeader from '../../../components/CivicHeader';
import MagneticButton from './MagneticButton';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'Roles', href: '#roles', id: 'roles' },
  { label: 'Impact', href: '#impact', id: 'impact' },
];

/**
 * Navbar
 * Cinematic fixed top bar for the CivicFix AI landing page.
 * - Transparent at scroll top; converts into a blurred glass bar (backdrop-blur-xl, border) after 16px.
 * - IntersectionObserver active section highlighting.
 * - Responsive full-screen mobile menu with staggered motion links.
 */
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  // Passive scroll listener for glass transition after 16px
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active section link indicator
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    NAV_LINKS.forEach((link) => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSmoothScroll = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF6EE]/90 backdrop-blur-xl border-b border-[#E8E0CE] shadow-xs py-3'
          : 'bg-[#FAF6EE]/50 backdrop-blur-xs py-4 sm:py-5'
      }`}
    >
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 flex items-center justify-between">
        {/* Left: CivicHeader with Crest & Wordmark */}
        <CivicHeader variant="dark" className="shrink-0" />

        {/* Center: Anchor Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-1.5 px-3 py-1.5 rounded-full bg-[#F2ECE0]/90 border border-[#E8E0CE] backdrop-blur-md"
          aria-label="Landing Page Navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'text-emerald-900 font-bold'
                    : 'text-[#5C5549] hover:text-[#181A20] hover:bg-[#E8E0CE]/50'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeLandingNav"
                    className="absolute inset-0 rounded-full bg-white border border-[#D5C9B3] shadow-2xs -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#3E382E] hover:text-[#181A20] hover:bg-[#E8E0CE]/50 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            Sign in
          </Link>
          <MagneticButton>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <span>Report an issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </MagneticButton>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2.5 rounded-xl border border-[#E8E0CE] bg-white/90 text-[#3E382E] hover:text-[#181A20] hover:bg-[#F2ECE0] transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Full-Screen Overlay Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 top-[65px] z-50 bg-[#FAF6EE]/98 backdrop-blur-2xl border-t border-[#E8E0CE] flex flex-col justify-between p-6 md:hidden shadow-xl"
          >
            <div className="space-y-2 pt-4">
              {NAV_LINKS.map((link, idx) => (
                <motion.a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx, duration: 0.25 }}
                  className="block px-4 py-3 rounded-2xl text-base font-bold text-[#3E382E] hover:text-emerald-700 hover:bg-white/80 transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
            </div>

            <div className="pt-6 border-t border-[#E8E0CE] space-y-3 pb-8">
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>Report an issue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 rounded-2xl border border-[#E8E0CE] bg-white hover:bg-[#F2ECE0] text-[#181A20] font-bold text-sm text-center block transition-colors"
              >
                Sign in to Platform
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
