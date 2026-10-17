import React, { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Card Component
 * Supports variants: 'flat', 'raised', and 'glass'.
 * Includes an optional physics-based 3D tilt effect on hover clamped to ±4deg.
 * Automatically disables 3D tilt on touch devices and when prefers-reduced-motion is active.
 */
export default function Card({
  variant = 'flat', // 'flat' | 'raised' | 'glass'
  tilt = false,
  className = '',
  children,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [canTilt, setCanTilt] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    return false;
  });
  const prefersReducedMotion = useReducedMotion();
  const isTiltActive = canTilt && !prefersReducedMotion && Boolean(tilt);

  // Sync with media query changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(hover: hover) and (pointer: fine)');
      const listener = (e) => setCanTilt(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!isTiltActive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Normalized -1 to 1, clamped to ±4 degrees
    const normX = Math.max(-1, Math.min(1, (x - centerX) / centerX));
    const normY = Math.max(-1, Math.min(1, (y - centerY) / centerY));
    setRotate({
      x: -normY * 4,
      y: normX * 4,
    });
  };

  const handleMouseEnter = () => {
    if (canTilt) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (canTilt) {
      setIsHovered(false);
      setRotate({ x: 0, y: 0 });
    }
  };

  const variantClasses = {
    flat: 'bg-surface border border-border shadow-2xs',
    raised:
      'bg-surface-raised border border-border-subtle shadow-[0_8px_30px_-6px_rgba(10,19,41,0.08),0_2px_8px_-2px_rgba(10,19,41,0.04)]',
    glass:
      'bg-surface/85 backdrop-blur-xl border border-border/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]',
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:border-border-strong transition-colors'
    : '';

  const tiltStyle =
    canTilt && isHovered
      ? {
          transform: `perspective(900px) rotateX(${rotate.x.toFixed(2)}deg) rotateY(${rotate.y.toFixed(2)}deg)`,
          transition: 'transform 0.12s ease-out',
        }
      : canTilt
      ? {
          transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)',
          transition: 'transform 0.3s ease-out',
        }
      : undefined;

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={onClick && !canTilt && !prefersReducedMotion ? { y: -3 } : undefined}
      whileTap={onClick && !prefersReducedMotion ? { scale: 0.98 } : undefined}
      style={tiltStyle}
      className={`rounded-2xl transition-shadow ${variantClasses[variant] || variantClasses.flat} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
