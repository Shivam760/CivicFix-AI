import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

const MouseEnterContext = createContext(undefined);

/**
 * CardContainer (Aceternity UI 3D Card Effect)
 * Pure React + Tailwind + CSS 3D Transforms
 */
export function CardContainer({
  children,
  className = '',
  containerClassName = '',
}) {
  const containerRef = useRef(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e) => {
    if (!containerRef.current || shouldReduceMotion) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  };

  const handleMouseEnter = () => {
    setIsMouseEntered(true);
    if (!containerRef.current || shouldReduceMotion) return;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
  };

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={`flex items-center justify-center ${containerClassName}`}
        style={{ perspective: '1000px' }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`relative transition-all duration-200 ease-linear ${className}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div
      className={`w-full h-full [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardItem({
  as: Tag = 'div',
  children,
  className = '',
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}) {
  const ref = useRef(null);
  const [isMouseEntered] = useMouseEnter();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (isMouseEntered && !shouldReduceMotion) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    }
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ, shouldReduceMotion]);

  return (
    <Tag
      ref={ref}
      className={`transition duration-200 ease-linear ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function useMouseEnter() {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    return [false, () => {}];
  }
  return context;
}
