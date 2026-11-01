import React, { useId } from 'react';
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
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

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
                filter: [
                  'drop-shadow(0 0 18px rgba(255,215,0,0.45))',
                  'drop-shadow(0 0 28px rgba(0,245,212,0.65))',
                  'drop-shadow(0 0 18px rgba(255,215,0,0.45))',
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
        className="relative flex items-center justify-center shrink-0 rounded-[26%] overflow-hidden border border-[#FFD700]/55 bg-[#080512] shadow-[0_6px_24px_rgba(255,215,0,0.28),inset_0_1px_1px_rgba(255,255,255,0.25)]"
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-label="LuckyDrop Official 3D Emblem"
        >
          <defs>
            {/* Deep Obsidian Vault Background */}
            <radialGradient id={`bg_${uid}`} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#1B113A" />
              <stop offset="55%" stopColor="#0B0718" />
              <stop offset="100%" stopColor="#05030B" />
            </radialGradient>

            {/* 24K Polished Gold Sphere Gradient */}
            <linearGradient id={`goldSphere_${uid}`} x1="18" y1="16" x2="102" y2="108" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF9DB" />
              <stop offset="22%" stopColor="#FFE066" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="78%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>

            {/* Royal Gold Crown Gradient */}
            <linearGradient id={`royalCrest_${uid}`} x1="36" y1="8" x2="84" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="40%" stopColor="#FFD700" />
              <stop offset="85%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>

            {/* Inner Obsidian Sphere Cavity */}
            <radialGradient id={`innerVault_${uid}`} cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#0E223D" />
              <stop offset="65%" stopColor="#090616" />
              <stop offset="100%" stopColor="#04020A" />
            </radialGradient>

            {/* Cyan-Blue TON Diamond Drop Top Left Facet */}
            <linearGradient id={`tonFacetLeft_${uid}`} x1="38" y1="42" x2="60" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="35%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0098EA" />
            </linearGradient>

            {/* Cyan-Emerald TON Diamond Drop Right Facet */}
            <linearGradient id={`tonFacetRight_${uid}`} x1="60" y1="42" x2="82" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F5D4" />
              <stop offset="45%" stopColor="#0098EA" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Diamond Crown Top Table */}
            <linearGradient id={`tonCrown_${uid}`} x1="42" y1="36" x2="78" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#00F5D4" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="120" height="120" rx="28" fill={`url(#bg_${uid})`} />

          {/* Subtle Geometric Micro-Grid Ring */}
          <circle
            cx="60"
            cy="66"
            r="46"
            stroke="url(#goldSphere_${uid})"
            strokeOpacity="0.22"
            strokeWidth="0.75"
            strokeDasharray="3 3"
          />

          {/* Minimalist Royal Crest Crowning the Gold Sphere */}
          <path
            d="M39 27L45 14L60 22L75 14L81 27H39Z"
            fill={`url(#royalCrest_${uid})`}
            stroke="#FFFBEB"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Crest Apex Jewels */}
          <circle cx="45" cy="12.5" r="2.2" fill="#FFE066" />
          <circle cx="60" cy="10.5" r="3" fill="#00F5D4" />
          <circle cx="75" cy="12.5" r="2.2" fill="#FFE066" />

          {/* 24K Polished Gold Sphere Outer Ring */}
          <circle
            cx="60"
            cy="66"
            r="39"
            fill={`url(#goldSphere_${uid})`}
          />
          {/* Specular Highlight Arc on Gold Sphere */}
          <path
            d="M28 52C33 36 46 29 60 29C74 29 87 36 92 52"
            stroke="#FFFBEB"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />

          {/* Inner Obsidian Vault Sphere */}
          <circle
            cx="60"
            cy="66"
            r="32"
            fill={`url(#innerVault_${uid})`}
            stroke="#FFE066"
            strokeOpacity="0.4"
            strokeWidth="1"
          />

          {/* Ambient Cyan Glow Inside Sphere */}
          <circle cx="60" cy="66" r="22" fill="#0098EA" fillOpacity="0.22" />

          {/* Faceted Glowing Cyan-Blue TON Diamond Drop */}
          {/* Top Crown Table of the Diamond Drop */}
          <polygon
            points="49,47 71,47 79,57 41,57"
            fill={`url(#tonCrown_${uid})`}
          />
          {/* Left Pavilion Facet */}
          <polygon
            points="41,57 60,57 60,91"
            fill={`url(#tonFacetLeft_${uid})`}
          />
          {/* Right Pavilion Facet */}
          <polygon
            points="79,57 60,57 60,91"
            fill={`url(#tonFacetRight_${uid})`}
          />
          {/* Inner Center Facet Cut for Extra 3D Depth */}
          <polygon
            points="51,57 69,57 60,91"
            fill="#38BDF8"
            fillOpacity="0.32"
          />
          {/* Crisp Specular Facet Lines */}
          <path
            d="M49 47L71 47L79 57L60 91L41 57L49 47ZM41 57H79M60 47V91M49 47L51 57L60 91M71 47L69 57L60 91"
            stroke="#E0F2FE"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />

          {/* Top-Left Specular Sparkle Star */}
          <path
            d="M44 42L45.2 45.2L48.5 46.5L45.2 47.8L44 51L42.8 47.8L39.5 46.5L42.8 45.2L44 42Z"
            fill="#FFFFFF"
          />
        </svg>
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

