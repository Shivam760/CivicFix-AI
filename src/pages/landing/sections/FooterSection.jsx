import React from 'react';
import { ArrowUp, Heart, ShieldCheck } from 'lucide-react';
import CivicHeader from '../../../components/CivicHeader';

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function TwitterIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

/**
 * FooterSection
 * 
 * Semantic, responsive footer with deep navy background matching the dark landing theme.
 * Includes:
 * - Brand column with CivicHeader crest, mission statement, and system status indicator
 * - 4 organized link columns: Platform, Governance, Resources, Legal
 * - Back to top button integrated with Lenis smooth scroll or native window.scrollTo
 * - Copyright and social links
 */
export default function FooterSection() {
  const handleScrollToTop = () => {
    // Lenis instance is attached to window.__lenis if smooth scroll is active
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { duration: 1.2 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const footerLinks = {
    platform: [
      { label: 'Report Grievance', href: '/login' },
      { label: 'AI Routing Engine', href: '#how-it-works' },
      { label: 'Platform Architecture', href: '#features' },
      { label: 'Role Dashboards', href: '#roles' },
    ],
    governance: [
      { label: 'Ward Committees', href: '#roles' },
      { label: 'Municipal SLA Standards', href: '#impact' },
      { label: 'Audit Trail & Transparency', href: '#features' },
      { label: 'Elected Official Portal', href: '#roles' },
      { label: 'Open Civic Data', href: '#impact' },
    ],
    resources: [
      { label: 'Citizen Handbook', href: '#' },
      { label: 'FastAPI Integration Docs', href: '#' },
      { label: 'OpenAPI 3.1 Spec', href: '#' },
      { label: 'Civic Schema & GIS Standards', href: '#' },
      { label: 'Community Guidelines', href: '#' },
    ],
    legal: [
      { label: 'Citizen Privacy Charter', href: '#' },
      { label: 'Terms of Civic Service', href: '#' },
      { label: 'Data Sovereignty & Encryption', href: '#' },
      { label: 'Accessibility Statement (WCAG 2.1 AA)', href: '#' },
      { label: 'Security Vulnerability Disclosure', href: '#' },
    ],
  };

  return (
    <footer className="bg-[#F4EDE0] text-[#5C5549] border-t border-[#E8E0CE] transition-colors" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* Main Links Container */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-12">
          
          {/* Brand & Mission (2 cols on large screens) */}
          <div className="lg:col-span-2 space-y-5">
            <CivicHeader variant="dark" />
            <p className="text-sm text-[#5C5549] leading-relaxed max-w-sm">
              Empowering citizens and municipal departments with intelligent triage, 
              geospatial routing, and transparent SLA tracking for accountable city governance.
            </p>

            {/* Live Platform Operational Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFDF8] border border-[#E8E0CE] text-xs font-medium text-[#3E382E] shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>All Systems Operational • 99.98% Uptime</span>
            </div>

            {/* Social / Community Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="CivicFix AI on GitHub"
                className="w-9 h-9 rounded-lg bg-[#FFFDF8] border border-[#E8E0CE] flex items-center justify-center text-[#5C5549] hover:text-[#181A20] hover:border-[#D5C9B3] hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="CivicFix AI on Twitter"
                className="w-9 h-9 rounded-lg bg-[#FFFDF8] border border-[#E8E0CE] flex items-center justify-center text-[#5C5549] hover:text-[#181A20] hover:border-[#D5C9B3] hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="CivicFix AI on LinkedIn"
                className="w-9 h-9 rounded-lg bg-[#FFFDF8] border border-[#E8E0CE] flex items-center justify-center text-[#5C5549] hover:text-[#181A20] hover:border-[#D5C9B3] hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div>
            <h3 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-emerald-800 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Governance */}
          <div>
            <h3 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-4">
              Governance
            </h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.governance.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-emerald-800 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-emerald-800 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal & Standards */}
          <div>
            <h3 className="text-xs font-bold text-[#181A20] uppercase tracking-wider mb-4">
              Legal & Trust
            </h3>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-emerald-800 transition-colors inline-block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:rounded"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Back to Top */}
        <div className="mt-14 pt-8 border-t border-[#E8E0CE] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7E7566]">
            <span>© 2026 CivicFix AI.</span>
            <span>Open Civic Technology Platform.</span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-[#7E7566]">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" aria-label="care" /> for resilient cities
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-[#5C5549]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Municipal Gateway</span>
            </div>

            {/* Back to top button */}
            <button
              onClick={handleScrollToTop}
              aria-label="Scroll back to top"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFDF8] hover:bg-white border border-[#E8E0CE] hover:border-[#D5C9B3] text-xs font-medium text-[#3E382E] hover:text-[#181A20] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
