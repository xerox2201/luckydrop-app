import React from 'react';

export const LUXURY_IMAGES = {
  // Custom Rendered 3D LuckyDrop Brand & Background Suite
  logo3d: '/assets/3d/luckydrop-3d-logo.png',
  splashBg3d: '/assets/3d/luckydrop-3d-splash-bg.png',
  jackpotHero3d: '/assets/3d/luckydrop-3d-jackpot-hero.png',
  gamesBanner3d: '/assets/3d/luckydrop-3d-games-banner.png',
  brandCrownLogo: '/assets/3d/luckydrop-3d-logo.png',

  // Active Page & Category Banners
  poolHourlyFlash: '/assets/aistudio/Gemini_Generated_Image___4__ce1abd71.jpg',
  userVipBanner: '/assets/aistudio/Gemini_Generated_Image___10__1f6ae709.jpg',
  fairnessAudit: '/assets/aistudio/Gemini_Generated_Image___11__32a4dde5.jpg',
  shieldIcon3d: '/assets/aistudio/Gemini_Generated_Image___19__500a21a6.jpg',
};

interface PageHeroBannerProps {
  badgeFa: string;
  titleFa: string;
  subtitleFa: string;
  imageUrl?: string;
  iconUrl?: string;
  rightContent?: React.ReactNode;
}

export const PageHeroBanner: React.FC<PageHeroBannerProps> = ({
  badgeFa,
  titleFa,
  subtitleFa,
  imageUrl = LUXURY_IMAGES.jackpotHero3d,
  iconUrl = LUXURY_IMAGES.logo3d,
  rightContent,
}) => {
  return (
    <section className="relative rounded-3xl overflow-hidden border border-amber-500/45 bg-[#090c14] p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.92)] motion-card-enter">
      {/* Real 8K Octane Render Background Image with Multi-Layer Obsidian & Gold Veil */}
      <img
        src={imageUrl}
        alt={titleFa}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105 transition-transform duration-700 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#07090e]/92 via-[#0b0f18]/80 to-[#140f05]/75 pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-80 h-80 bg-amber-500/20 rounded-full blur-[95px] pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 max-w-2xl">
          <img
            src={iconUrl}
            alt="LuckyDrop 3D Emblem"
            referrerPolicy="no-referrer"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_24px_rgba(245,158,11,0.55)] shrink-0"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wide">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{badgeFa}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow">
              {titleFa}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
              {subtitleFa}
            </p>
          </div>
        </div>

        {rightContent && <div className="shrink-0">{rightContent}</div>}
      </div>
    </section>
  );
};
