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
      className="relative w-full max-w-[360px] mx-auto select-none cursor-pointer group"
      style={{ perspective: '900px' }}
    >
      {/* Ambient Volumetric 24K Gold Glow Behind the #7 Sphere */}
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-b from-amber-400/30 via-amber-500/15 to-transparent blur-2xl opacity-85 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Interactive 3D Parallax Frame Containing the 8K Octane Render of Golden Sphere #7 */}
      <div
        className="relative rounded-3xl overflow-hidden border-2 border-amber-400/60 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.35)] bg-[#06080d] transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.01)`,
        }}
      >
        <img
          src={LUXURY_IMAGES.heroSphere7}
          alt="گوی طلایی شماره ۷ با تاج سلطنتی"
          className="w-full h-[250px] sm:h-[275px] object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Subtle Rim Vignette to Blend Seamlessly into the Hero Stage */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-transparent opacity-70 pointer-events-none" />

        {/* Bottom Floating Luxury Badge */}
        <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/50 text-[11px] font-black text-amber-300 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>گوی طلایی سلطنتی #7 • جک‌پات VIP</span>
          </span>
        </div>
      </div>
    </div>
  );
};
