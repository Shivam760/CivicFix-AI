/**
 * src/lib/motion.js
 *
 * Shared framer-motion animation variants.
 * (This file was missing from the teammate's push because the root
 * .gitignore had a Python rule "lib/" that also matched src/lib/.)
 */

const EASE = [0.22, 1, 0.36, 1];

// Whole-page fade/slide used by App.jsx for route changes.
export const pageTransition = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

// Parent container: reveals its children one after another.
export function staggerContainer(stagger = 0.06, delay = 0) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

// Child item: fades in while moving up slightly.
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

// When the user asks the OS for reduced motion, keep only the opacity fade.
export function getReducedMotionVariants(variants, shouldReduce) {
  if (!shouldReduce) return variants;
  const reduced = {};
  for (const [key, value] of Object.entries(variants)) {
    reduced[key] = { opacity: value.opacity ?? 1, transition: { duration: 0.01 } };
  }
  return reduced;
}
