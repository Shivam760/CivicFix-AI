import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * 3D Pin (Aceternity UI inspired)
 *
 * Implements:
 * - 3D isometric tilt on hover/interaction (rotateX, rotateZ with perspective)
 * - Concentric radar ripples projecting onto the ground plane
 * - Glowing vertical beacon wire connecting the card to the surface
 * - Floating interactive title pill with gradient light bar
 * - Reduced-motion support
 */
export function PinContainer({
  children,
  title,
  href,
  className = '',
  containerClassName = '',
  active = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Smooth hover tilt into isometric 3D perspective
  const defaultTransform = 'translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
  const hoverTransform = 'translate(-50%, -50%) rotateX(32deg) rotateY(0deg) rotateZ(-12deg)';

  const activeTransform = (isHovered || active) && !shouldReduceMotion
    ? hoverTransform
    : defaultTransform;

  return (
    <div
      className={`relative group/pin z-30 cursor-pointer ${containerClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          perspective: '1200px',
          transform: 'rotateX(60deg) translateZ(0px)',
        }}
        className="absolute left-1/2 top-1/2 ml-[0.09rem] mt-4 -translate-x-1/2 -translate-y-1/2"
      >
        <div
          style={{
            transform: activeTransform,
            transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute left-1/2 top-1/2 flex justify-start items-start rounded-3xl shadow-[0_24px_50px_rgba(15,23,42,0.18)] bg-[#FFFDF8] border-2 border-[#E8E0CE] group-hover/pin:border-emerald-500/80 transition-colors duration-500 overflow-hidden"
        >
          <div className={`relative p-5 sm:p-6 ${className}`}>
            {children}
          </div>
        </div>
      </div>

      <PinPerspective title={title} href={href} isHovered={isHovered || active} />
    </div>
  );
}

function PinPerspective({ title, href, isHovered }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`pointer-events-none w-full h-[420px] flex items-center justify-center transition-opacity duration-500 ${
        isHovered ? 'opacity-100' : 'opacity-80 group-hover/pin:opacity-100'
      }`}
    >
      <div className="w-full h-full -mt-7 flex-none inset-0 relative">
        {/* Floating Title Pill */}
        {title && (
          <div className="absolute top-0 inset-x-0 flex justify-center z-40">
            <a
              href={href || '#'}
              className="relative flex items-center gap-2 rounded-full bg-[#181A20] py-1 px-4 ring-1 ring-white/20 shadow-xl pointer-events-auto hover:bg-black transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="relative z-20 text-white text-xs font-mono font-bold inline-block">
                {title}
              </span>
              <span className="absolute -bottom-0 left-1/4 w-3/4 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            </a>
          </div>
        )}

        {/* Concentric Ground Plane Radar Rings */}
        <div
          style={{
            perspective: '1200px',
            transform: 'rotateX(60deg) translateZ(0)',
          }}
          className="absolute left-1/2 top-1/2 ml-[0.09rem] mt-8 -translate-x-1/2 -translate-y-1/2"
        >
          {!shouldReduceMotion && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                animate={{ opacity: [0, 0.9, 0.4, 0], scale: [0.6, 1.3] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 0, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-56 w-56 rounded-full bg-emerald-500/10 border border-emerald-500/30"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                animate={{ opacity: [0, 0.9, 0.4, 0], scale: [0.6, 1.3] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 1.5, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-56 w-56 rounded-full bg-teal-500/10 border border-teal-500/30"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                animate={{ opacity: [0, 0.9, 0.4, 0], scale: [0.6, 1.3] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 3, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-56 w-56 rounded-full bg-emerald-500/10 border border-emerald-500/30"
              />
            </>
          )}
        </div>

        {/* Vertical Glowing Beacon Light Beam */}
        <div className="absolute left-1/2 bottom-1/2 -translate-x-1/2">
          <div className="w-[3px] h-28 bg-gradient-to-t from-emerald-500 via-teal-400 to-transparent blur-[2px]" />
          <div className="w-[1.5px] h-28 bg-gradient-to-t from-emerald-500 via-teal-300 to-transparent -mt-28" />
          <div className="w-2 h-2 rounded-full bg-emerald-400 blur-[2px] -mt-1 mx-auto" />
          <div className="w-1 h-1 rounded-full bg-white -mt-1.5 mx-auto" />
        </div>
      </div>
    </div>
  );
}
