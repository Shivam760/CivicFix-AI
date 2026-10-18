import React, { useEffect, useRef, useState } from 'react';
import { motion, useTransform, useScroll, useSpring } from 'framer-motion';

/**
 * TracingBeam (Aceternity UI inspired)
 *
 * Runs a continuous glowing SVG path down the side of the container, tracking scroll progress
 * and providing a connected visual spine for the three workflow steps.
 */
export function TracingBeam({ children, className = '' }) {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const contentRef = useRef(null);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  const y1 = useSpring(
    useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]),
    { stiffness: 500, damping: 90 }
  );
  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]),
    { stiffness: 500, damping: 90 }
  );

  return (
    <motion.div
      ref={ref}
      className={`relative w-full mx-auto ${className}`}
    >
      <div className="absolute -left-4 md:-left-12 top-3">
        <motion.div
          transition={{ duration: 0.2, delay: 0.5 }}
          animate={{
            boxShadow:
              scrollYProgress.get() > 0
                ? 'none'
                : 'rgba(0, 0, 0, 0.24) 0px 3px 8px',
          }}
          className="ml-[27px] h-4 w-4 rounded-full border border-[#D5C9B3] shadow-xs flex items-center justify-center bg-white"
        >
          <motion.div
            transition={{ duration: 0.2, delay: 0.5 }}
            animate={{
              backgroundColor: scrollYProgress.get() > 0 ? '#10B981' : '#10B981',
              borderColor: scrollYProgress.get() > 0 ? '#059669' : '#059669',
            }}
            className="h-2 w-2 rounded-full border border-emerald-600 bg-emerald-500"
          />
        </motion.div>

        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight}
          className="ml-4 block"
          aria-hidden="true"
        >
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="#E8E0CE"
            strokeOpacity="0.8"
            transition={{ duration: 10 }}
          />
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="url(#tracingGrad)"
            strokeWidth="2.5"
            className="motion-reduce:hidden"
            transition={{ duration: 10 }}
          />
          <defs>
            <motion.linearGradient
              id="tracingGrad"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1}
              y2={y2}
            >
              <stop stopColor="#10B981" stopOpacity="0" />
              <stop stopColor="#10B981" />
              <stop offset="0.325" stopColor="#14B8A6" />
              <stop offset="1" stopColor="#047857" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>

      <div ref={contentRef} className="w-full">
        {children}
      </div>
    </motion.div>
  );
}
