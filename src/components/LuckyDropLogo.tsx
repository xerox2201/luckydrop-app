import React, { useState } from 'react';
import { motion } from 'motion/react';

interface LuckyDropLogoProps {
  size?: number;
  showWordmark?: boolean;
  animated?: boolean;
  variant?: '3d' | 'svg';
  className?: string;
}

export const LuckyDropLogo: React.FC<LuckyDropLogoProps> = ({
  size = 64,
  showWordmark = false,
  animated = false,
  variant = '3d',
  className = '',
}) => {
  const [fallbackSvg, setFallbackSvg] = useState(false);
  const src =
    variant === '3d' && !fallbackSvg
      ? '/assets/3d/luckydrop-3d-logo.png'
      : '/luckydrop-logo.svg';

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <motion.div
        animate={
          animated
            ? {
                y: [0, -4, 0],
                filter: [
                  'drop-shadow(0 0 18px rgba(245,158,11,0.45))',
                  'drop-shadow(0 0 28px rgba(56,189,248,0.6))',
                  'drop-shadow(0 0 18px rgba(245,158,11,0.45))',
                ],
              }
            : undefined
        }
        transition={
          animated
            ? {
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center shrink-0 rounded-[24%] overflow-hidden border border-amber-400/50 bg-[#090514] shadow-[0_6px_22px_rgba(245,158,11,0.3)]"
      >
        <img
          src={src}
          alt="LuckyDrop Official 3D Logo"
          referrerPolicy="no-referrer"
          onError={() => setFallbackSvg(true)}
          className="w-full h-full object-cover"
        />
      </motion.div>

      {showWordmark && (
        <div className="mt-2 text-center leading-tight" dir="ltr">
          <span className="font-extrabold tracking-tight bg-gradient-to-r from-[#FFF3B0] via-[#FBBF24] to-[#38BDF8] bg-clip-text text-transparent text-lg">
            LuckyDrop
          </span>
        </div>
      )}
    </div>
  );
};

export function downloadAssetFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadOfficialLuckyDropLogoPng(): Promise<void> {
  downloadAssetFile('/assets/3d/luckydrop-3d-logo.png', 'LuckyDrop-3D-Logo-1024x1024.png');
}

export function downloadOfficialLuckyDropSplash3dPng(): void {
  downloadAssetFile('/assets/3d/luckydrop-3d-splash-bg.png', 'LuckyDrop-3D-Splash-1080x1920.png');
}

export function downloadOfficialLuckyDropJackpot3dPng(): void {
  downloadAssetFile('/assets/3d/luckydrop-3d-jackpot-hero.png', 'LuckyDrop-3D-Jackpot-Hero-1600x900.png');
}

export function downloadOfficialLuckyDropLogoSvg(): void {
  downloadAssetFile('/luckydrop-logo.svg', 'LuckyDrop-Official-Vector-Logo.svg');
}
