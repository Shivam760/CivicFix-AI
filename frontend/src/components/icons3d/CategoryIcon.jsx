import React from 'react';

/**
 * CategoryIcon
 * Renders rich pseudo-3D vector icons for civic infrastructure categories
 * using layered SVG radial gradients, bevels, and drop-shadows.
 */
export default function CategoryIcon({
  category = 'other_civic',
  size = 32,
  className = '',
}) {
  const norm = String(category || '').toLowerCase();

  // Map variations to canonical keys
  let canonical = 'other';
  if (norm.includes('pothole') || norm.includes('road')) {
    canonical = 'road';
  } else if (norm.includes('light')) {
    canonical = 'streetlight';
  } else if (norm.includes('garbage') || norm.includes('waste')) {
    canonical = 'garbage';
  } else if (norm.includes('drain') || norm.includes('sewage')) {
    canonical = 'drainage';
  } else if (norm.includes('water') || norm.includes('leak')) {
    canonical = 'water';
  }

  const dim = typeof size === 'number' ? `${size}px` : size;

  switch (canonical) {
    case 'road':
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="roadBase" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="60%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
            <linearGradient id="roadBevel" x1="0" y1="0" x2="0" y2="48">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="stripeGrad" x1="0" y1="0" x2="0" y2="24">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
            <filter id="potholeGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Base 3D road block */}
          <rect x="6" y="8" width="36" height="32" rx="8" fill="url(#roadBase)" filter="url(#potholeGlow)" />
          <rect x="6" y="8" width="36" height="32" rx="8" stroke="url(#roadBevel)" strokeWidth="1.5" />
          {/* Road Perspective Dashes */}
          <line x1="24" y1="12" x2="24" y2="20" stroke="url(#stripeGrad)" strokeWidth="3" strokeLinecap="round" />
          <line x1="24" y1="26" x2="24" y2="36" stroke="url(#stripeGrad)" strokeWidth="3" strokeLinecap="round" />
          {/* 3D Warning Cone Badge on corner */}
          <circle cx="34" cy="32" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
          <path d="M 34 28 L 37 34 L 31 34 Z" fill="#FFFFFF" />
        </svg>
      );

    case 'streetlight':
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bulb" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
            <linearGradient id="fixture" x1="0" y1="0" x2="0" y2="48">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          {/* Ambient Glow */}
          <circle cx="24" cy="20" r="16" fill="url(#lampGlow)" />
          {/* 3D Lamp Fixture Base */}
          <path d="M 21 34 L 27 34 L 25 42 L 23 42 Z" fill="url(#fixture)" />
          {/* 3D Lamp Canopy Hood */}
          <path d="M 14 18 C 14 12, 34 12, 34 18 L 30 20 L 18 20 Z" fill="url(#fixture)" />
          {/* 3D Glass Light Bulb Sphere */}
          <circle cx="24" cy="22" r="8" fill="url(#bulb)" stroke="#FDE047" strokeWidth="1" />
          {/* Highlight glint */}
          <ellipse cx="22" cy="19" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.8" />
        </svg>
      );

    case 'garbage':
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="binBody" cx="30%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="60%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064E3B" />
            </radialGradient>
            <linearGradient id="lidBevel" x1="0" y1="0" x2="0" y2="12">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          {/* 3D Bin Body */}
          <path
            d="M 12 16 L 15 40 C 15 42, 33 42, 33 40 L 36 16 Z"
            fill="url(#binBody)"
            stroke="#047857"
            strokeWidth="1.2"
          />
          {/* Vertical Ribs for 3D tactile depth */}
          <line x1="20" y1="20" x2="21" y2="36" stroke="#047857" strokeWidth="1.5" opacity="0.6" />
          <line x1="28" y1="20" x2="27" y2="36" stroke="#A7F3D0" strokeWidth="1" opacity="0.6" />
          {/* 3D Bin Lid */}
          <rect x="9" y="12" width="30" height="5" rx="2.5" fill="url(#lidBevel)" stroke="#064E3B" strokeWidth="1" />
          {/* Handle */}
          <rect x="21" y="9" width="6" height="4" rx="1.5" fill="#047857" />
        </svg>
      );

    case 'water':
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="dropSphere" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="45%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </radialGradient>
            <linearGradient id="waterRipple" x1="0" y1="0" x2="0" y2="10">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          {/* Base ripple disk */}
          <ellipse cx="24" cy="38" rx="16" ry="5" fill="url(#waterRipple)" opacity="0.7" />
          <ellipse cx="24" cy="38" rx="11" ry="3" fill="#E0F2FE" opacity="0.8" />
          {/* 3D Glossy Droplet */}
          <path
            d="M 24 8 C 24 8, 12 24, 12 30 C 12 36.6, 17.4 42, 24 42 C 30.6 42, 36 36.6, 36 30 C 36 24, 24 8, 24 8 Z"
            fill="url(#dropSphere)"
            stroke="#38BDF8"
            strokeWidth="1"
          />
          {/* Glossy highlight streak */}
          <ellipse cx="18" cy="27" rx="3.5" ry="5.5" transform="rotate(-20 18 27)" fill="#FFFFFF" opacity="0.75" />
        </svg>
      );

    case 'drainage':
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="drainRim" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="60%" stopColor="#5B21B6" />
              <stop offset="100%" stopColor="#3B0764" />
            </radialGradient>
            <radialGradient id="drainCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>
          {/* Outer 3D Bevel Ring */}
          <circle cx="24" cy="24" r="18" fill="url(#drainRim)" stroke="#C4B5FD" strokeWidth="1.5" />
          {/* Interior Pit */}
          <circle cx="24" cy="24" r="13" fill="url(#drainCore)" stroke="#4C1D95" strokeWidth="1" />
          {/* Drainage Grille Slots */}
          <rect x="22" y="14" width="4" height="20" rx="1.5" fill="#DDD6FE" />
          <rect x="15" y="17" width="4" height="14" rx="1.5" fill="#DDD6FE" opacity="0.85" />
          <rect x="29" y="17" width="4" height="14" rx="1.5" fill="#DDD6FE" opacity="0.85" />
        </svg>
      );

    default:
      return (
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="otherShield" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>
          {/* 3D Municipal Seal Shield */}
          <path
            d="M 24 6 L 38 12 C 38 26, 24 38, 24 42 C 24 38, 10 26, 10 12 Z"
            fill="url(#otherShield)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          {/* Center Civic Star */}
          <polygon
            points="24,16 26.5,21.5 32.5,22 28,26 29.5,32 24,28.8 18.5,32 20,26 15.5,22 21.5,21.5"
            fill="#FCD34D"
            stroke="#F59E0B"
            strokeWidth="0.8"
          />
        </svg>
      );
  }
}
