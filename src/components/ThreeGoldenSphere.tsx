import React, { useState } from 'react';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const ThreeGoldenSphere: React.FC = () => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setTilt({
      rx: -ny * 8,
      ry: nx * 10,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      data-testid="three-golden-sphere"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[320px] mx-auto select-none cursor-pointer group"
      style={{ perspective: '900px' }}
    >
      {/* Ambient Volumetric Gold Glow */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-amber-400/20 via-purple-500/15 to-transparent blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Seamless 3D Air-Mix Chamber (Zero Double Borders) */}
      <div
        className="relative rounded-2xl overflow-hidden bg-transparent transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        }}
      >
        <img
          src={LUXURY_IMAGES.heroSphere7}
          alt="3D Glass Air-Mix Machine"
          className="w-full h-[185px] object-cover object-center group-hover:scale-105 transition-transform duration-500 rounded-2xl"
        />

        {/* Soft Radial Vignette to Blend Seamlessly into Card Surface */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#130d24] via-transparent to-[#130d24]/40 pointer-events-none" />

        {/* Minimal Floating Live Air-Mix Pill */}
        <div className="absolute bottom-2 inset-x-3 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#070510]/85 backdrop-blur-md border border-purple-500/25 text-[11px] font-medium text-purple-200/90 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f59b] animate-pulse" />
            <span>3D Air-Mix Chamber #7</span>
          </span>
        </div>
      </div>
    </div>
  );
};
