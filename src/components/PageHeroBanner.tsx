import React from 'react';

export const LUXURY_IMAGES = {
  // Custom Rendered 3D LuckyDrop Brand & Background Suite
  logo3d: '/assets/3d/luckydrop-3d-logo.png',
  splashBg3d: '/assets/3d/luckydrop-3d-splash-bg.png',
  jackpotHero3d: '/assets/3d/luckydrop-3d-jackpot-hero.png',
  gamesBanner3d: '/assets/3d/luckydrop-3d-games-banner.png',

  // 1. Hero Centerpiece (#7 Gold Sphere with Royal Crown)
  heroSphere7: '/assets/aistudio/Gemini_Generated_Image__e0626b6e.jpg',
  // 2. Hero Wide Casino Vault Background
  vaultHero: '/assets/aistudio/Gemini_Generated_Image___1__d11543f0.jpg',
  // 3-6. Four Concurrent Lottery Pool Banners
  poolMegaVip: '/assets/aistudio/Gemini_Generated_Image___2__d7af2394.jpg',
  poolDailyBlitz: '/assets/aistudio/Gemini_Generated_Image___3__26d196a1.jpg',
  poolHourlyFlash: '/assets/aistudio/Gemini_Generated_Image___4__ce1abd71.jpg',
  poolTonSpecial: '/assets/aistudio/Gemini_Generated_Image___5__a75b6435.jpg',
  // 7. Global Seamless Black Onyx Marble Background
  globalMarbleBg: '/assets/aistudio/Gemini_Generated_Image___6__134e28bc.jpg',
  // 8-14. Page Header Banners
  playTicketsBanner: '/assets/aistudio/Gemini_Generated_Image___7__c1677e25.jpg',
  depositVault: '/assets/aistudio/Gemini_Generated_Image___8__b9a70753.jpg',
  withdrawVault: '/assets/aistudio/Gemini_Generated_Image___9__962bcc62.jpg',
  userVipBanner: '/assets/aistudio/Gemini_Generated_Image___10__1f6ae709.jpg',
  fairnessAudit: '/assets/aistudio/Gemini_Generated_Image___11__32a4dde5.jpg',
  cockpitCommandVault: '/assets/aistudio/Gemini_Generated_Image___12__7f974f44.jpg',
  telegramBot: '/assets/aistudio/Gemini_Generated_Image___13__cf879f0e.jpg',
  // 15-20. 3D Square Icons & Emblems
  brandCrownLogo: '/assets/3d/luckydrop-3d-logo.png',
  vipAvatar: '/assets/aistudio/Gemini_Generated_Image___15__f5bd1004.jpg',
  trophyIcon3d: '/assets/aistudio/Gemini_Generated_Image___16__d7467a9f.jpg',
  ticketIcon3d: '/assets/aistudio/Gemini_Generated_Image___17__711d1459.jpg',
  walletIcon3d: '/assets/aistudio/Gemini_Generated_Image___18__601439ab.jpg',
  shieldIcon3d: '/assets/aistudio/Gemini_Generated_Image___19__500a21a6.jpg',
  // Aliases for backward compatibility across views
  goldBalls: '/assets/aistudio/Gemini_Generated_Image___2__d7af2394.jpg',
  goldCoins: '/assets/aistudio/Gemini_Generated_Image___8__b9a70753.jpg',
  desktopShowcase: '/assets/aistudio/Gemini_Generated_Image___10__1f6ae709.jpg',
  mobileShowcase: '/assets/aistudio/Gemini_Generated_Image___13__cf879f0e.jpg',
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
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/70 shadow-[0_0_28px_rgba(245,158,11,0.45)] shrink-0"
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
