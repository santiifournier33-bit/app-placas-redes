"use client";

import React, { useRef, useState, useEffect } from 'react';
import { 
  motion, 
  useMotionValue, 
  useMotionTemplate, 
  useAnimationFrame 
} from "framer-motion";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility for merging Tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper component for the SVG grid pattern.
 */
const GridPattern = ({ offsetX, offsetY, size }: { offsetX: any; offsetY: any; size: number }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="grid-pattern"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary/10" 
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};

/** Static SVG grid pattern (no Framer Motion, no JS animation). */
const StaticGridPattern = ({ size }: { size: number }) => (
  <svg className="w-full h-full">
    <defs>
      <pattern
        id="grid-pattern-static"
        width={size}
        height={size}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${size} 0 L 0 0 0 ${size}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary/10"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern-static)" />
  </svg>
);

export const InfiniteGrid = ({ children }: { children: React.ReactNode }) => {
  const [gridSize] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Track mouse position with Motion Values for performance (desktop only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  // Grid offsets for infinite scroll animation (desktop only)
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.5; 
  const speedY = 0.5;

  useAnimationFrame(() => {
    if (!isClient || isMobile) return;
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    // Reset offset at pattern width to simulate infinity
    gridOffsetX.set((currentX + speedX) % gridSize);
    gridOffsetY.set((currentY + speedY) % gridSize);
  });

  // Create a dynamic radial mask for the "flashlight" effect (desktop only)
  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative w-full h-screen flex flex-col items-center justify-center overflow-auto bg-surface"
      )}
    >
      {/* Mobile: static grid, no animation */}
      {isMobile ? (
        <div className="fixed inset-0 z-0 opacity-10">
          <StaticGridPattern size={gridSize} />
        </div>
      ) : (
        <>
          {/* Layer 1: Subtle background grid (always visible) */}
          <div className="fixed inset-0 z-0 opacity-10">
            <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
          </div>

          {/* Layer 2: Highlighted grid (revealed by mouse mask) */}
          <motion.div 
            className="fixed inset-0 z-0 opacity-70"
            style={{ maskImage, WebkitMaskImage: maskImage }}
          >
            <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
          </motion.div>
        </>
      )}

      {/* Decorative Blur Spheres (Brand Colors: Deep Blue & Gold/Beige) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute right-[-10%] top-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute left-[-10%] bottom-[-20%] w-[35%] h-[40%] rounded-full bg-secondary/30 blur-[130px]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen p-4">
        {children}
      </div>
    </div>
  );
};
