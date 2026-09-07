import React from 'react';
import { StateVector } from '../types';
import { SIDES_METADATA } from '../lib/bitwiseMath';

interface AmbientBackdropProps {
  activeVector: StateVector;
}

export const AmbientBackdrop: React.FC<AmbientBackdropProps> = ({ activeVector }) => {
  const meta = SIDES_METADATA[activeVector] || SIDES_METADATA['0EE'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000 ease-in-out">
      {/* Background base layer */}
      <div className="absolute inset-0 bg-[#06070a]" />

      {/* Primary dynamic radial glow orb 1 (top-right / center) */}
      <div
        className="absolute -top-[15%] right-[5%] w-[550px] h-[550px] md:w-[750px] md:h-[750px] rounded-full blur-[120px] opacity-40 mix-blend-screen transition-all duration-1000 ease-out animate-subtle-drift"
        style={{
          backgroundColor: meta.palette.primary,
          boxShadow: `0 0 160px ${meta.palette.primary}`,
        }}
      />

      {/* Secondary dynamic radial glow orb 2 (bottom-left) */}
      <div
        className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full blur-[140px] opacity-30 mix-blend-screen transition-all duration-1000 ease-out"
        style={{
          backgroundColor: meta.palette.secondary,
        }}
      />

      {/* Center atmospheric aura */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[150px] opacity-25 transition-all duration-1000 ease-in-out"
        style={{
          backgroundColor: meta.palette.primary,
        }}
      />

      {/* Cybernetic dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Subtle vignette boundary */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070a]/40 via-transparent to-[#06070a]/80" />
    </div>
  );
};
