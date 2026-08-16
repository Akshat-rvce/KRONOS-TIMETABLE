"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  className = '',
  hoverEffect = false
}) => {
  if (hoverEffect) {
    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`glass-card p-5 ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`glass-panel p-6 ${className}`}>
      {children}
    </div>
  );
};

export default GlassContainer;
