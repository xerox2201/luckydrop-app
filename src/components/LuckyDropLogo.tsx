import React, { useState } from 'react';
import { motion } from 'motion/react';

export const OFFICIAL_LUCKYDROP_LOGO_URL = '/assets/3d/luckydrop-3d-logo.png';

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
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      data-testid="luckydrop-bespoke-3d-emblem"
      className={`inline-flex flex-col items-center select-none ${className}`}
    >
      <motion.div
        animate={
          animated
            ? {
                y: [0, -4, 0],
                scale: [1, 1.03, 1],
                filter: [
                  'drop-shadow(0 4px 16px rgba(255,215,0,0.45))',
                  'drop-shadow(0 6px 26px rgba(0,245,212,0.65))',
                  'drop-shadow(0 4px 16px rgba(255,215,0,0.45))',
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
        className="relative flex items-center justify-center shrink-0 drop-shadow-[0_4px_14px_rgba(255,215,0,0.35)]"
      >
        {!imgFailed ? (
          <img
            src={OFFICIAL_LUCKYDROP_LOGO_URL}
            alt="LuckyDrop Official 3D Emblem"
            draggable={false}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain select-none pointer-events-none"
          />
        ) : (
          <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            className="w-full h-full"
          >
            <circle cx="32" cy="32" r="29" fill="#0E0A1F" stroke="#FBBF24" strokeWidth="3" />
            <circle cx="32" cy="32" r="23" fill="#131B38" stroke="#00F5D4" strokeWidth="1.5" />
            <path
              d="M32 13L47 26L32 51L17 26L32 13Z"
              fill="#0098EA"
              stroke="#FFE066"
              strokeWidth="2"
            />
            <path d="M32 13L40 26L32 51L24 26L32 13Z" fill="#38BDF8" fillOpacity="0.65" />
          </svg>
        )}
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
  downloadAssetFile('/assets/3d/luckydrop-3d-logo.png', 'LuckyDrop-Official-Logo-Transparent.png');
}

export function downloadOfficialLuckyDropSplash3dPng(): void {
  downloadAssetFile('/assets/3d/luckydrop-3d-splash-bg.png', 'LuckyDrop-3D-Splash-1080x1920.png');
}

export function downloadOfficialLuckyDropJackpot3dPng(): void {
  downloadAssetFile('/assets/3d/luckydrop-3d-jackpot-hero.png', 'LuckyDrop-3D-Jackpot-Hero-1600x900.png');
}

export function downloadOfficialLuckyDropLogoSvg(): void {
  downloadAssetFile('/assets/3d/luckydrop-3d-logo.png', 'LuckyDrop-Official-Vector-Logo.png');
}
