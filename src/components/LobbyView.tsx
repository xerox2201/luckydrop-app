import React, { useState } from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import {
  toPersianDigits,
  deriveProvablyFairBalls,
  convertUsdtToCrypto,
  MULTI_LOTTERY_SPECS,
  LotteryTypeId,
} from '../utils/lotteryEngine.ts';

export const LobbyView: React.FC = () => {
  const {
    rounds,
    tickets,
    transactions,
    fxRates,
    oracleCountdownSec,
    refreshPriceOracleNow,
    formatAmount,
    balanceUsdt,
    navigateTo,
    setDepositModalOpen,
    setAiChatOpen,
    setSelectedMainBalls,
    setSelectedGoldenBall,
    activeLotteryId,
    setActiveLotteryId,
    lotteryTimers,
  } = useLottery();

  const [activeCategory, setActiveCategory] = useState<'ALL' | LotteryTypeId>('ALL');

  // Provably Fair interactive verification box state
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>('zarrin_server_secret_v4_round_482');
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>(
    '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  );
  const [verifyRoundNum, setVerifyRoundNum] = useState<number>(482);
  const [verifiedResult, setVerifiedResult] = useState<{
    hash: string;
    mainBalls: number[];
    goldenBall: number;
  } | null>(null);

  // Mega Weekly timer from context
  const megaTimerSec = lotteryTimers.MEGA_WEEKLY || 219529;
  const days = Math.floor(megaTimerSec / 86400);
  const hours = Math.floor((megaTimerSec % 86400) / 3600);
  const minutes = Math.floor((megaTimerSec % 3600) / 60);
  const seconds = megaTimerSec % 60;

  // Dynamic Hero Lottery Ball Rack (5 Main + 1 Golden Star Ball)
  const [heroBalls, setHeroBalls] = useState<number[]>([7, 15, 22, 34, 49]);
  const [heroStarBall, setHeroStarBall] = useState<number>(8);

  const randomizeHeroRack = () => {
    const pool: number[] = [];
    while (pool.length < 5) {
      const n = Math.floor(Math.random() * 50) + 1;
      if (!pool.includes(n)) pool.push(n);
    }
    pool.sort((a, b) => a - b);
    const star = Math.floor(Math.random() * 15) + 1;
    setHeroBalls(pool);
    setHeroStarBall(star);
  };

  const applyHeroBallsToTerminal = () => {
    setActiveLotteryId('MEGA_WEEKLY');
    setSelectedMainBalls(heroBalls.slice(0, 5));
    setSelectedGoldenBall(heroStarBall);
    navigateTo('play');
  };

  const handleSelectLotteryAndPlay = (id: LotteryTypeId) => {
    setActiveLotteryId(id);
    navigateTo('play');
  };

  const handleRunVerification = () => {
    const balls = deriveProvablyFairBalls(verifyServerSeed, verifyClientSeed, verifyRoundNum);
    setVerifiedResult(balls);
  };

  const formatTimerCompact = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) {
      return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const megaRound = rounds.find((r) => r.roundCode === '#ZRN-8493');
  const megaJackpotUsdt = Number(megaRound?.jackpotUsdt) || 184500;
  const megaCryptoEq = convertUsdtToCrypto(megaJackpotUsdt, fxRates);

  const visibleSpecs = MULTI_LOTTERY_SPECS.filter((spec) =>
    activeCategory === 'ALL' ? true : spec.id === activeCategory
  );

  const jackpotWinners = transactions.filter(
    (t) =>
      t.type?.toLowerCase() === 'payout' ||
      t.type?.toUpperCase() === 'JACKPOT_PAYOUT' ||
      Boolean(t.winnerName)
  );

  const renderPoolEmblem = (id: LotteryTypeId) => {
    if (id === 'MEGA_WEEKLY') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#2a1f0a] to-[#110c03] border-2 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.35)] flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M3 18H21V20H3V18ZM3 15L5 7L9.5 11.5L12 5L14.5 11.5L19 7L21 15H3Z" fill="#FBBF24" />
          </svg>
        </div>
      );
    }
    if (id === 'DAILY_BLITZ') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#2a1f0a] to-[#110c03] border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-amber-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
        </div>
      );
    }
    if (id === 'HOURLY_FLASH') {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#2a1f0a] to-[#110c03] border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-amber-300 text-2xl">timer</span>
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#082438] to-[#04111c] border-2 border-sky-400/70 shadow-[0_0_24px_rgba(56,189,248,0.4)] flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-sky-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          send
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3.5 lg:px-6 py-5 lg:py-7 pb-24 lg:pb-12">
      {/* ADAPTIVE DUAL-SHELL GRID:
          - Desktop (lg+): 3-Column Bento Dashboard (Left Navigation Rail + Center Main Stage + Right Wallet Dock)
          - Mobile (<lg): Native Mobile App Vertical Flow matching Mobile Showcase Image
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =====================================================================
            COLUMN 1 (DESKTOP LEFT SIDEBAR RAIL — Matches Desktop Reference Image)
            ===================================================================== */}
        <aside className="hidden lg:flex lg:col-span-2 flex-col gap-4 sticky top-28">
          <div className="luxury-marble-card rounded-3xl p-3 space-y-1">
            {[
              { id: 'lobby' as AppRoute, label: 'داشبورد', icon: 'home', active: true },
              { id: 'play' as AppRoute, label: 'خرید بلیت', icon: 'confirmation_number', active: false },
              { id: 'my-tickets' as AppRoute, label: 'بلیت‌های من', icon: 'redeem', active: false },
              { id: 'deposit' as AppRoute, label: 'واریز', icon: 'add_card', active: false },
              { id: 'withdraw' as AppRoute, label: 'برداشت', icon: 'payments', active: false },
              { id: 'transparency' as AppRoute, label: 'شفافیت', icon: 'verified_user', active: false },
              { id: 'terms' as AppRoute, label: 'قوانین', icon: 'gavel', active: false },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                  item.active
                    ? 'gold-gradient-cta text-[#241300] font-black shadow-lg'
                    : 'text-slate-300 hover:text-amber-300 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* VIP Gold Account Level Card (Matches Left Column of Desktop Reference) */}
          <div className="luxury-marble-card rounded-3xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                👑
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">سطح حساب</span>
                <span className="text-sm font-black text-amber-300">VIP Gold</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-[#090c14] border border-white/10 overflow-hidden p-0.5">
                <div className="h-full w-[86%] rounded-full gold-gradient-cta" />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">تا سطح بعدی</span>
                <span className="font-mono font-black text-amber-300">۸۶٪</span>
              </div>
            </div>
          </div>

          {/* Live Support Card (Matches Left Column of Desktop Reference) */}
          <button
            type="button"
            onClick={() => setAiChatOpen(true)}
            className="luxury-marble-card luxury-marble-card-hover rounded-3xl p-4 flex items-center gap-3 text-right cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="material-symbols-outlined text-xl">headset_mic</span>
            </div>
            <div>
              <div className="text-xs font-black text-white">پشتیبانی</div>
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span>Live Chat 24/7</span>
              </div>
            </div>
          </button>

          {/* Bottom Brand Seal */}
          <div className="luxury-marble-card rounded-3xl p-4 text-center space-y-1.5 relative overflow-hidden">
            <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 text-sm">
              👑
            </div>
            <div className="text-sm font-black text-amber-300 tracking-tight" dir="ltr">
              LuckyDrop
            </div>
            <div className="text-[9px] text-slate-400 tracking-[0.16em] uppercase" dir="ltr">
              PREMIUM EXPERIENCE
            </div>
          </div>
        </aside>

        {/* =====================================================================
            COLUMN 2 (CENTER MAIN STAGE — Hero Banner + 4 Pools + Recent Tickets + Stats)
            ===================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. HERO JACKPOT BANNER (With 3D Crowned #7 Golden Lottery Balls & Volumetric Podium) */}
          <section className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-[#1b1509] via-[#0d111a] to-[#1a1306] p-5 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.9)]">
            {/* Ambient Golden Light Streaks */}
            <div className="absolute -top-24 left-1/3 w-80 h-80 bg-amber-500/20 rounded-full blur-[95px] pointer-events-none" />
            <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-amber-400/15 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Right Side (RTL): Headline, Subtitle & Primary Gold CTA */}
              <div className="md:col-span-5 space-y-3.5 text-center md:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold">
                  <span>تضمین ۱۰۰٪ قرعه‌کشی راس تایمر</span>
                </div>

                <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white leading-tight">
                  بزرگترین لاتاری ارز دیجیتال
                </h1>

                <p className="text-xs sm:text-sm text-amber-100/80 font-medium">
                  جایزه‌های میلیونی <span className="mx-1 text-amber-400">•</span> شفاف{' '}
                  <span className="mx-1 text-amber-400">•</span> سریع{' '}
                  <span className="mx-1 text-amber-400">•</span> امن
                </p>

                <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <button
                    type="button"
                    data-testid="hero-buy-ticket-btn"
                    onClick={() => navigateTo('play')}
                    className="gold-gradient-cta text-[#241300] font-black text-sm px-6 py-3.5 rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>همین حالا بازی کنید</span>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                  </button>
                </div>
              </div>

              {/* Centerpiece: 3D Metallic Golden Lottery Spheres (#7 with Royal Crown, #3, #12, #28) on Glowing Podium */}
              <div className="md:col-span-4 flex flex-col items-center justify-center py-2">
                <div className="relative w-48 h-40 flex items-center justify-center">
                  {/* Volumetric Gold Halo Behind Sphere #7 */}
                  <div className="absolute inset-4 rounded-full bg-amber-400/25 blur-2xl" />

                  {/* Left Secondary 3D Ball (#3 & #12) */}
                  <div className="absolute left-2 bottom-7 w-11 h-11 rounded-full lottery-ball-gold flex items-center justify-center font-mono font-black text-sm text-[#1c1002] border border-amber-200/70 shadow-lg">
                    3
                  </div>
                  <div className="absolute left-8 bottom-3 w-12 h-12 rounded-full lottery-ball-gold flex items-center justify-center font-mono font-black text-base text-[#1c1002] border border-amber-200/80 shadow-xl z-10">
                    12
                  </div>

                  {/* Right Secondary 3D Ball (#28) */}
                  <div className="absolute right-3 bottom-5 w-13 h-13 rounded-full lottery-ball-gold flex items-center justify-center font-mono font-black text-base text-[#1c1002] border border-amber-200/80 shadow-xl z-10">
                    28
                  </div>

                  {/* Giant Center #7 Golden Sphere with Royal 24K Gold Crown */}
                  <div className="relative z-20 flex flex-col items-center -mt-3">
                    {/* 3D Royal Gold Crown atop Ball #7 */}
                    <svg className="w-12 h-9 -mb-2 drop-shadow-[0_4px_12px_rgba(251,191,36,0.8)]" viewBox="0 0 64 44" fill="none">
                      <path
                        d="M8 36H56L60 12L44 24L32 6L20 24L4 12L8 36Z"
                        fill="url(#heroCrownGrad)"
                        stroke="#FEF08A"
                        strokeWidth="2"
                      />
                      <rect x="8" y="38" width="48" height="5" rx="2.5" fill="#F59E0B" />
                      <circle cx="32" cy="5" r="3.5" fill="#FEF9C3" />
                      <circle cx="4" cy="11" r="3" fill="#FEF08A" />
                      <circle cx="60" cy="11" r="3" fill="#FEF08A" />
                      <defs>
                        <linearGradient id="heroCrownGrad" x1="4" y1="6" x2="60" y2="40" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FEF9C3" />
                          <stop offset="0.45" stopColor="#FBBF24" />
                          <stop offset="1" stopColor="#B45309" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Giant 3D #7 Sphere */}
                    <div className="w-24 h-24 rounded-full lottery-ball-gold border-2 border-amber-200/90 flex items-center justify-center shadow-[0_12px_35px_rgba(245,158,11,0.65)]">
                      <div className="w-16 h-16 rounded-full border border-amber-900/30 bg-gradient-to-b from-amber-200/40 to-transparent flex items-center justify-center">
                        <span className="font-mono font-black text-4xl text-[#1c1002] drop-shadow">7</span>
                      </div>
                    </div>
                  </div>

                  {/* Glowing Golden Podium Base */}
                  <div className="absolute bottom-0 inset-x-2 h-5 rounded-full bg-gradient-to-r from-amber-700/40 via-amber-300/80 to-amber-700/40 border border-amber-200/60 shadow-[0_0_25px_rgba(251,191,36,0.6)]" />
                </div>
              </div>

              {/* Left Side (RTL): Current Jackpot Readout & Countdown */}
              <div className="md:col-span-3 space-y-2.5 text-center md:text-left" dir="ltr">
                <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                  <span>👑</span>
                  <span>Jackpot فعلی</span>
                </div>
                <div className="text-2xl xl:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 drop-shadow whitespace-nowrap">
                  ${Math.round(megaJackpotUsdt).toLocaleString('en-US')}+
                </div>
                <div
                  data-testid="hero-jackpot-amount"
                  className="text-[11px] font-bold text-emerald-300 leading-snug"
                  dir="rtl"
                >
                  {formatAmount(megaJackpotUsdt)}
                </div>

                {/* Compact 4-Box Countdown */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                  {[
                    { val: days, label: 'روز' },
                    { val: hours, label: 'ساعت' },
                    { val: minutes, label: 'دقیقه' },
                    { val: seconds, label: 'ثانیه' },
                  ].map((u, idx) => (
                    <div
                      key={idx}
                      className="bg-[#090c14]/90 border border-amber-500/30 rounded-xl py-1.5 px-1"
                    >
                      <div className="text-sm font-black text-amber-300 font-mono">
                        {String(u.val).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] text-slate-400">{u.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Interactive 5+1 Golden Ball Strip inside Hero */}
            <div className="relative z-10 mt-5 pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-300">ترکیب پیشنهادی هوش مصنوعی:</span>
                <div className="flex items-center gap-1.5" dir="ltr">
                  {heroBalls.map((num) => (
                    <span
                      key={num}
                      className="w-7 h-7 rounded-full lottery-ball-gold flex items-center justify-center text-slate-950 font-black text-xs font-mono"
                    >
                      {String(num).padStart(2, '0')}
                    </span>
                  ))}
                  <span className="text-amber-400 font-black text-xs">+</span>
                  <span className="w-7 h-7 rounded-full lottery-ball-purple flex items-center justify-center text-white font-black text-xs font-mono">
                    ★{String(heroStarBall).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={randomizeHeroRack}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">autorenew</span>
                  <span>تصادفی جدید</span>
                </button>
                <button
                  type="button"
                  onClick={applyHeroBallsToTerminal}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-bold cursor-pointer"
                >
                  انتقال به سبد خرید ←
                </button>
              </div>
            </div>
          </section>

          {/* MOBILE-ONLY QUICK CRYPTO STRIP & WALLET BAR (Matches Screen 1 & Screen 4 of Mobile Reference) */}
          <div className="lg:hidden space-y-3">
            {/* 3 Crypto Mini Cards like Mobile Screen 1 */}
            <div className="grid grid-cols-3 gap-2.5" dir="ltr">
              <div className="luxury-marble-card rounded-2xl p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                    ₿
                  </span>
                  <span>BTC</span>
                </div>
                <div className="text-xs font-black text-white font-mono mt-1">
                  ${fxRates.BTC.toLocaleString('en-US')}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">+1.24%</div>
              </div>

              <div className="luxury-marble-card rounded-2xl p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                    ₮
                  </span>
                  <span>USDT/T</span>
                </div>
                <div className="text-xs font-black text-amber-300 font-mono mt-1">
                  {fxRates.TOMAN.toLocaleString('en-US')}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">Live IRT</div>
              </div>

              <div className="luxury-marble-card rounded-2xl p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                    💎
                  </span>
                  <span>TON</span>
                </div>
                <div className="text-xs font-black text-white font-mono mt-1">${fxRates.TON}</div>
                <div className="text-[10px] text-emerald-400 font-mono">+2.41%</div>
              </div>
            </div>
          </div>

          {/* 2. FOUR CONCURRENT ACTIVE LOTTERY POOLS (Matches Row 2 of Desktop & Screen 1 of Mobile) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>استخرهای فعال همزمان</span>
                <span className="text-xs font-normal text-slate-400">(۴ قرعه‌کشی زنده)</span>
              </h2>

              <div className="flex items-center gap-1 bg-[#101520] p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: 'همه (۴)' },
                  { id: 'MEGA_WEEKLY', label: 'Mega VIP' },
                  { id: 'DAILY_BLITZ', label: 'Daily Blitz' },
                  { id: 'HOURLY_FLASH', label: 'Hourly Flash' },
                  { id: 'TON_SPECIAL', label: 'TON Special' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === tab.id
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {visibleSpecs.map((spec) => {
                const matchingRound = rounds.find((r) => r.roundCode === spec.roundCode);
                const jackpotNum = Number(matchingRound?.jackpotUsdt) || spec.jackpotUsdt;
                const ticketPriceNum = Number(matchingRound?.ticketPriceUsdt) || spec.ticketPriceUsdt;
                const timerSec = lotteryTimers[spec.id] || spec.initialCountdownSec;
                const isSelected = activeLotteryId === spec.id;
                const priceEq = convertUsdtToCrypto(ticketPriceNum, fxRates);
                const cleanTitleEn =
                  spec.id === 'MEGA_WEEKLY'
                    ? 'Mega Jackpot VIP'
                    : spec.id === 'DAILY_BLITZ'
                    ? 'Daily Blitz'
                    : spec.id === 'HOURLY_FLASH'
                    ? 'Hourly Flash'
                    : 'TON Special';
                const cleanSubFa =
                  spec.id === 'MEGA_WEEKLY'
                    ? 'جایزه ویژه هفتگی'
                    : spec.id === 'DAILY_BLITZ'
                    ? 'قرعه‌کشی روزانه'
                    : spec.id === 'HOURLY_FLASH'
                    ? 'قرعه‌کشی ساعتی'
                    : 'ویژه کامیونیتی تلگرام';

                return (
                  <div
                    key={spec.id}
                    data-testid={`lobby-lottery-card-${spec.id}`}
                    className={`luxury-marble-card luxury-marble-card-hover rounded-3xl p-4 flex flex-col justify-between ${
                      isSelected ? 'ring-1 ring-amber-400/70' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        {renderPoolEmblem(spec.id)}
                        <div className="min-w-0">
                          <h3 className="text-xs xl:text-[13px] font-black text-white whitespace-nowrap" dir="ltr">
                            {cleanTitleEn}
                          </h3>
                          <p className="text-[11px] text-slate-400 truncate">{cleanSubFa}</p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <div
                          className="text-lg xl:text-xl font-black text-amber-400 font-mono whitespace-nowrap"
                          dir="ltr"
                        >
                          ${Math.round(jackpotNum).toLocaleString('en-US')}+
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {formatAmount(jackpotNum)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 bg-[#090c14]/80 rounded-xl px-2.5 py-1.5 border border-white/5">
                        <span>ورودی: ${ticketPriceNum.toFixed(2)}</span>
                        <span className="font-mono text-emerald-400">⏱ {formatTimerCompact(timerSec)}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between px-1" dir="ltr">
                        <span>{priceEq.ton} TON</span>
                        <span>•</span>
                        <span>{priceEq.toman.toLocaleString('en-US')} T</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`lobby-play-btn-${spec.id}`}
                      onClick={() => handleSelectLotteryAndPlay(spec.id)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-b from-[#251d0d] to-[#141007] hover:from-amber-500 hover:to-amber-600 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-black text-xs transition-all cursor-pointer"
                    >
                      {spec.id === 'MEGA_WEEKLY'
                        ? 'مشاهده و خرید'
                        : spec.id === 'TON_SPECIAL'
                        ? 'عضویت و بازی'
                        : 'بازی کنید'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. BOTTOM SPLIT ROW: RECENT TICKETS TABLE + PLATFORM LIVE STATS (Matches Desktop Reference) */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Left Card (RTL Right): بلیت‌های اخیر شما و برندگان (Recent Tickets & Winners Table) */}
            <div className="xl:col-span-7 luxury-marble-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">بلیت‌های اخیر شما و برندگان</h3>
                <button
                  type="button"
                  onClick={() => navigateTo('my-tickets')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  مشاهده همه ←
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="text-[11px] text-slate-400 border-b border-white/5">
                      <th className="py-2 font-medium">شماره بلیت</th>
                      <th className="py-2 font-medium">بازی</th>
                      <th className="py-2 font-medium hidden sm:table-cell">زمان</th>
                      <th className="py-2 font-medium">وضعیت</th>
                      <th className="py-2 font-medium text-left">جایزه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tickets.slice(0, 4).map((t) => {
                      const prize = parseFloat(t.prizeWonUsdt) || 0;
                      const isWinner = prize > 0 || t.status === 'won';
                      return (
                        <tr
                          key={t.ticketCode}
                          onClick={() => navigateTo('my-tickets')}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="py-3 font-mono font-bold text-slate-200" dir="ltr">
                            {t.ticketCode}
                          </td>
                          <td className="py-3 font-bold text-white">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-amber-400">👑</span>
                              <span>{t.roundCode === '#ZRN-8493' ? 'Mega Jackpot VIP' : t.roundCode === '#BLZ-2409' ? 'Daily Blitz' : 'Hourly Flash'}</span>
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 hidden sm:table-cell">{t.createdAt}</td>
                          <td className="py-3">
                            {isWinner ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                                <span>★ برنده</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-bold">
                                <span>★ در انتظار</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-left font-mono font-black text-emerald-400" dir="ltr">
                            {isWinner ? `$${prize.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      );
                    })}

                    {jackpotWinners.slice(0, 2).map((w) => (
                      <tr
                        key={w.txHash}
                        onClick={() => navigateTo('status')}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <td className="py-3 font-mono font-bold text-amber-300" dir="ltr">
                          {w.winnerName}
                        </td>
                        <td className="py-3 font-bold text-slate-200">{w.lotteryTitle}</td>
                        <td className="py-3 text-slate-400 hidden sm:table-cell">{w.winnerLocation}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                            ★ پرداخت شد
                          </span>
                        </td>
                        <td className="py-3 text-left font-mono font-black text-emerald-400" dir="ltr">
                          ${Number(w.amountUsdt).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Card (RTL Left): آمار کلی پلتفرم (Platform Live Stats 2x2 Bento) */}
            <div className="xl:col-span-5 luxury-marble-card rounded-3xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-base font-black text-white border-b border-white/10 pb-3">
                  آمار کلی پلتفرم
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 text-base">🎫</span>
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] flex items-center justify-center">
                        ↗
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-white font-mono" dir="ltr">
                      4,892,342
                    </div>
                    <div className="text-[11px] text-slate-400">تعداد بلیت‌ها</div>
                  </div>

                  <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 text-base">👥</span>
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] flex items-center justify-center">
                        ●
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-white font-mono" dir="ltr">
                      287,563
                    </div>
                    <div className="text-[11px] text-slate-400">کاربران فعال</div>
                  </div>

                  <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 text-base">🎁</span>
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] flex items-center justify-center">
                        ✓
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-400 font-mono" dir="ltr">
                      $1,245,680
                    </div>
                    <div className="text-[11px] text-slate-400">کل جوایز پرداخت شده</div>
                  </div>

                  <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 text-base">🏆</span>
                      <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] flex items-center justify-center">
                        ★
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-300 font-mono" dir="ltr">
                      $24,563
                    </div>
                    <div className="text-[11px] text-slate-400">میانگین جایزه</div>
                  </div>
                </div>
              </div>

              {/* Popular Games Quick Strip */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>🔥</span>
                  <span>بازی‌های محبوب</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {MULTI_LOTTERY_SPECS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectLotteryAndPlay(s.id)}
                      className="bg-[#0a0d15] hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/35 rounded-xl p-2 transition-all cursor-pointer"
                    >
                      <div className="text-sm">
                        {s.id === 'MEGA_WEEKLY'
                          ? '👑'
                          : s.id === 'DAILY_BLITZ'
                          ? '⚡'
                          : s.id === 'HOURLY_FLASH'
                          ? '⏱'
                          : '✈️'}
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 truncate mt-1" dir="ltr">
                        {s.titleEn.split(' ')[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. PROVABLY FAIR SHA-256 COMMIT HASH VERIFICATION BOX */}
          <section className="luxury-marble-card rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-black text-emerald-400 block">
                  الگوریتم اثبات‌پذیر منصفانه (Provably Fair HMAC-SHA256)
                </span>
                <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                  ماشین‌حساب بازبینی مستقل هش قرعه‌کشی (Live SHA-256 Audit)
                </h3>
              </div>
              <code className="text-[10px] font-mono text-amber-300 bg-[#090c14] px-2.5 py-1 rounded-lg border border-amber-500/25">
                HMAC_SHA256(ServerSeed : ClientSeed : Round)
              </code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Server Seed (بذر سرور):</label>
                <input
                  type="text"
                  value={verifyServerSeed}
                  onChange={(e) => setVerifyServerSeed(e.target.value)}
                  className="w-full bg-[#090c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Client Seed (بذر کاربر):</label>
                <input
                  type="text"
                  value={verifyClientSeed}
                  onChange={(e) => setVerifyClientSeed(e.target.value)}
                  className="w-full bg-[#090c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">شماره دور (Round):</label>
                <input
                  type="number"
                  value={verifyRoundNum}
                  onChange={(e) => setVerifyRoundNum(Number(e.target.value) || 482)}
                  className="w-full bg-[#090c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                data-testid="verify-fairness-btn"
                onClick={handleRunVerification}
                className="px-4 py-2.5 rounded-xl emerald-gradient-cta font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">fact_check</span>
                <span>محاسبه و راستی‌آزمایی خروجی قرعه‌کشی</span>
              </button>

              {verifiedResult && (
                <div className="flex items-center gap-1.5" dir="ltr">
                  <span className="text-[11px] text-slate-400 font-mono">Drawn:</span>
                  {verifiedResult.mainBalls.map((b) => (
                    <span
                      key={b}
                      className="w-7 h-7 rounded-full lottery-ball-gold text-slate-950 font-black text-xs flex items-center justify-center font-mono"
                    >
                      {b}
                    </span>
                  ))}
                  <span className="w-7 h-7 rounded-full lottery-ball-purple text-white font-black text-xs flex items-center justify-center font-mono">
                    ★{verifiedResult.goldenBall}
                  </span>
                </div>
              )}
            </div>

            {verifiedResult && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 break-all">
                Computed SHA-256: {verifiedResult.hash}
              </div>
            )}
          </section>
        </div>

        {/* =====================================================================
            COLUMN 3 (RIGHT WALLET & MARKET DOCK — Matches Desktop Reference & Mobile Wallet)
            ===================================================================== */}
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-28">
          {/* Card 1: موجودی کیف پول (My Wallet Box matching Desktop Reference & Mobile Screen 4) */}
          <div className="luxury-marble-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                </span>
                <span className="text-sm font-black text-white">موجودی کیف پول</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">+1.24% ↗</span>
            </div>

            <div className="bg-[#090c14] border border-white/10 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-baseline justify-between" dir="ltr">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-amber-300">
                  USDT ▾
                </span>
              </div>
              <div className="text-xs font-bold text-amber-300/90">
                معادل زنده: {formatAmount(balanceUsdt)}
              </div>
            </div>

            {/* Emerald Deposit & Gold-Outlined Withdraw Buttons (Exact Match to Reference Image) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigateTo('deposit')}
                className="py-3 rounded-2xl emerald-gradient-cta font-black text-xs hover:brightness-110 transition-all cursor-pointer"
              >
                واریز
              </button>
              <button
                type="button"
                onClick={() => navigateTo('withdraw')}
                className="py-3 rounded-2xl bg-[#141824] hover:bg-amber-500/20 border border-amber-500/45 text-amber-300 font-black text-xs transition-all cursor-pointer"
              >
                برداشت
              </button>
            </div>

            {/* Supported Currencies List (ارزهای موجود) */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>ارزهای موجود</span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE 15s</span>
              </div>

              <div className="space-y-2" dir="ltr">
                {[
                  {
                    symbol: '₮',
                    bg: 'bg-emerald-500 text-slate-950',
                    name: 'USDT (TRC-20)',
                    price: `${fxRates.TOMAN.toLocaleString('en-US')} T`,
                    change: '+1.24%',
                  },
                  {
                    symbol: '₿',
                    bg: 'bg-amber-500 text-slate-950',
                    name: 'Bitcoin (BTC)',
                    price: `$${fxRates.BTC.toLocaleString('en-US')}`,
                    change: '+2.41%',
                  },
                  {
                    symbol: '💎',
                    bg: 'bg-sky-500 text-slate-950',
                    name: 'Toncoin (TON)',
                    price: `$${fxRates.TON}`,
                    change: '+2.17%',
                  },
                  {
                    symbol: 'T',
                    bg: 'bg-rose-500 text-white',
                    name: 'TRON (TRX)',
                    price: `$${fxRates.TRX}`,
                    change: '+0.98%',
                  },
                  {
                    symbol: 'B',
                    bg: 'bg-yellow-400 text-slate-950',
                    name: 'BNB (BEP-20)',
                    price: `$${fxRates.BNB}`,
                    change: '+1.56%',
                  },
                ].map((coin) => (
                  <div
                    key={coin.name}
                    className="flex items-center justify-between bg-[#090c14]/90 border border-white/5 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${coin.bg}`}
                      >
                        {coin.symbol}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{coin.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-white font-mono">{coin.price}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">{coin.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: وضعیت اوراکل (Live Oracle Status Card matching Right Dock of Desktop Reference) */}
          <div className="luxury-marble-card rounded-3xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">وضعیت اوراکل</span>
              <button
                type="button"
                onClick={refreshPriceOracleNow}
                className="text-[10px] text-amber-300 hover:underline cursor-pointer"
              >
                بروزرسانی آنی
              </button>
            </div>
            <div className="flex items-center justify-between bg-[#090c14] border border-emerald-500/30 rounded-2xl px-3.5 py-2.5" dir="ltr">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Live Oracle Connected</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300">
                00:{String(oracleCountdownSec).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Card 3: اپلیکیشن موبایل LuckyDrop (Mobile App Showcase Card matching Bottom-Right of Desktop Reference) */}
          <div className="luxury-marble-card rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-7 space-y-2.5">
                <div className="text-xs font-bold text-amber-300">اپلیکیشن موبایل</div>
                <div className="text-lg font-black text-amber-400 leading-none" dir="ltr">
                  LuckyDrop
                </div>
                <p className="text-[11px] text-slate-300">همیشه در دسترس! تشخیص خودکار موبایل و وب</p>
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => navigateTo('launch')}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-black/80 border border-white/15 hover:border-amber-400/50 text-[10px] font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-amber-300">phone_iphone</span>
                    <span>Web3 Mobile App</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('launch')}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-black/80 border border-white/15 hover:border-sky-400/50 text-[10px] font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-sky-400">send</span>
                    <span>Telegram Mini-App</span>
                  </button>
                </div>
              </div>

              {/* Mini 3D Angled Phone Frame */}
              <div className="col-span-5 flex justify-center">
                <div className="w-24 h-40 rounded-2xl bg-[#07090e] border-2 border-amber-400/60 shadow-[0_10px_30px_rgba(245,158,11,0.3)] p-2 flex flex-col justify-between -rotate-6">
                  <div className="w-8 h-1 rounded-full bg-amber-500/40 mx-auto" />
                  <div className="text-center space-y-1">
                    <div className="w-7 h-7 mx-auto rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xs">
                      👑
                    </div>
                    <div className="text-[8px] font-black text-amber-300" dir="ltr">
                      LuckyDrop
                    </div>
                    <div className="text-[7px] text-emerald-400 font-mono" dir="ltr">
                      $184,500+
                    </div>
                  </div>
                  <div className="h-4 rounded-md gold-gradient-cta text-[7px] font-black text-[#241300] flex items-center justify-center">
                    PLAY VIP
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
