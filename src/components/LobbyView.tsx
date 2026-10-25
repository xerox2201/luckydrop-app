import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  deriveProvablyFairBalls,
  convertUsdtToCrypto,
  MULTI_LOTTERY_SPECS,
  LotteryTypeId,
} from '../utils/lotteryEngine.ts';
import { ThreeGoldenSphere } from './ThreeGoldenSphere.tsx';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const LobbyView: React.FC = () => {
  const {
    rounds,
    tickets,
    drawHistory,
    transactions,
    fxRates,
    formatAmount,
    navigateTo,
    selectedMainBalls,
    setSelectedMainBalls,
    selectedGoldenBall,
    setSelectedGoldenBall,
    activeLotteryId,
    setActiveLotteryId,
    lotteryTimers,
    provablyFairSeeds,
    setBulkTicketCount,
    mintTicket,
    setViralCardTicket,
  } = useLottery();

  const [activeCategory, setActiveCategory] = useState<'ALL' | LotteryTypeId>('ALL');
  const [zoneCTab, setZoneCTab] = useState<'MY_TICKETS' | 'PAST_DRAWS'>('MY_TICKETS');
  const [bundleQty, setBundleQty] = useState<1 | 5 | 10>(1);
  const [instantMintBanner, setInstantMintBanner] = useState<string | null>(null);

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
  const [heroBalls, setHeroBalls] = useState<number[]>(
    selectedMainBalls.length === 5 ? selectedMainBalls : [7, 15, 22, 34, 49]
  );
  const [heroStarBall, setHeroStarBall] = useState<number>(selectedGoldenBall || 8);

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
    setSelectedMainBalls(pool);
    setSelectedGoldenBall(star);
  };

  const toggleHeroGridNumber = (n: number) => {
    if (heroBalls.includes(n)) {
      if (heroBalls.length > 1) {
        const next = heroBalls.filter((b) => b !== n);
        setHeroBalls(next);
        setSelectedMainBalls(next);
      }
    } else {
      const next =
        heroBalls.length >= 5
          ? [...heroBalls.slice(1), n].sort((a, b) => a - b)
          : [...heroBalls, n].sort((a, b) => a - b);
      setHeroBalls(next);
      setSelectedMainBalls(next);
    }
  };

  const applyHeroBallsToTerminal = () => {
    setActiveLotteryId('MEGA_WEEKLY');
    setSelectedMainBalls(heroBalls.slice(0, 5));
    setSelectedGoldenBall(heroStarBall);
    if (bundleQty > 1) {
      setBulkTicketCount(bundleQty);
    }
    navigateTo('play');
  };

  const handleQuickInstantBuy = async () => {
    setSelectedMainBalls(heroBalls.slice(0, 5));
    setSelectedGoldenBall(heroStarBall);
    if (bundleQty > 1) {
      setBulkTicketCount(bundleQty);
      navigateTo('play');
      return;
    }
    const res = await mintTicket('USDT (TRC-20)');
    if (res.ok && res.ticket) {
      setInstantMintBanner(
        `✅ کوپن هولوگرافیک #${res.ticket.ticketCode} با تعهد SHA-256 صادر شد و در تب «بلیت‌های هولوگرافیک من» قرار گرفت!`
      );
      setTimeout(() => setInstantMintBanner(null), 4500);
    } else {
      navigateTo('play');
    }
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

  const visibleSpecs = MULTI_LOTTERY_SPECS.filter((spec) =>
    activeCategory === 'ALL' ? true : spec.id === activeCategory
  );

  const jackpotWinners = transactions.filter(
    (t) =>
      t.type?.toLowerCase() === 'payout' ||
      t.type?.toUpperCase() === 'JACKPOT_PAYOUT' ||
      Boolean(t.winnerName)
  );

  const getPoolBannerImage = (id: LotteryTypeId) => {
    if (id === 'MEGA_WEEKLY') return LUXURY_IMAGES.poolMegaVip;
    if (id === 'DAILY_BLITZ') return LUXURY_IMAGES.poolDailyBlitz;
    if (id === 'HOURLY_FLASH') return LUXURY_IMAGES.poolHourlyFlash;
    return LUXURY_IMAGES.poolTonSpecial;
  };

  const renderPoolEmblem = (id: LotteryTypeId) => {
    const iconSrc =
      id === 'MEGA_WEEKLY'
        ? LUXURY_IMAGES.brandCrownLogo
        : id === 'DAILY_BLITZ'
        ? LUXURY_IMAGES.trophyIcon3d
        : id === 'HOURLY_FLASH'
        ? LUXURY_IMAGES.ticketIcon3d
        : LUXURY_IMAGES.walletIcon3d;

    return (
      <img
        src={iconSrc}
        alt={id}
        referrerPolicy="no-referrer"
        className="w-11 h-11 rounded-xl object-cover border border-[#fbbf24]/70 shadow-[0_0_18px_rgba(251,191,36,0.35)] shrink-0"
      />
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-14 space-y-8">
      {instantMintBanner && (
        <div className="p-4 rounded-2xl bg-[#00e701]/15 border border-[#00e701]/50 text-[#00e701] text-xs sm:text-sm font-black flex items-center justify-between gap-3">
          <span>{instantMintBanner}</span>
          <button
            type="button"
            onClick={() => navigateTo('my-tickets')}
            className="px-3 py-1.5 rounded-lg bg-[#00e701] text-[#051c08] font-black text-xs cursor-pointer whitespace-nowrap"
          >
            مشاهده کوپن ↗
          </button>
        </div>
      )}

      {/* =====================================================================
          CATEGORY 2: 3-ZONE BENTO GRID STUDIO PRESENTATION
          ZONE A (7 Cols): Hero & 3D Glass Air-Mix Draw Machine + Server Seed Hash
          ZONE B (5 Cols): Interactive Tactile Ticket Builder (Number Picker, Quick-Pick ⚡, Bundles)
          ===================================================================== */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch motion-card-enter">
        {/* ZONE A: Hero & Live 3D Air-Mix Draw Machine (7 Cols) */}
        <div className="xl:col-span-7 relative rounded-3xl overflow-hidden studio-arena-frame flex flex-col justify-between p-6 sm:p-8">
          <img
            src={LUXURY_IMAGES.vaultHero}
            alt="LuckyDrop Studio Vault"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f212e]/95 via-[#0f212e]/88 to-[#1a2c38]/95 pointer-events-none" />
          <div className="absolute -top-24 left-1/3 w-80 h-80 bg-[#fbbf24]/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Bar: Active Server Seed Hash Commitment Badge */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.07]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#1a2c38] border border-[#fbbf24]/40 text-[#fbbf24] text-xs font-black">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>ZONE A • 3D AIR-MIX DRAW MACHINE</span>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('transparency')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#213743] hover:bg-[#2f4553] border border-white/10 text-[11px] font-mono text-slate-300 cursor-pointer tabular-nums"
              dir="ltr"
              title="کلیک برای بررسی تعهد SHA-256 بذر سرور"
            >
              <span className="text-[#00e701] font-bold">SHA-256 Seed:</span>
              <span>{provablyFairSeeds.serverSeedHash.slice(0, 14)}...</span>
              <span className="text-[#fbbf24]">Nonce #{provablyFairSeeds.nonce}</span>
            </button>
          </div>

          {/* Center Grid: Headline + Live Jackpot & 3D Golden Sphere Chamber */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4">
            <div className="md:col-span-7 space-y-4 text-center md:text-right">
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                استودیو قرعه‌کشی زنده <span className="gold-shimmer-text">LuckyDrop</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                استخراج ۵ گوی اصلی + ۱ گوی طلایی با الگوریتم ۵۲ بیتی <code className="text-[#00e701] font-mono">HMAC-SHA256</code> و واریز خودکار جوایز به کیف پول یکپارچه PAM.
              </p>

              {/* Live Jackpot Counter Card */}
              <div className="bg-[#1a2c38]/90 border border-[#fbbf24]/40 rounded-2xl p-4 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">جایزه استخر بزرگ هفتگی (Mega Pool):</span>
                  <span className="font-mono text-[11px] text-[#00e701] font-bold" dir="ltr">
                    85.0% RTP GUARANTEED
                  </span>
                </div>
                <div
                  className="text-3xl sm:text-4xl font-black font-mono text-[#fbbf24] tabular-nums tracking-tight"
                  dir="ltr"
                >
                  ${Math.round(megaJackpotUsdt).toLocaleString('en-US')}.00 USDT
                </div>
                <div
                  data-testid="hero-jackpot-amount"
                  className="text-xs font-black text-[#00e701] font-mono tabular-nums"
                >
                  معادل زنده اوراکل: {formatAmount(megaJackpotUsdt)}
                </div>
              </div>

              {/* 4-Box Tabular Countdown Timer */}
              <div className="grid grid-cols-4 gap-2 text-center" dir="ltr">
                {[
                  { val: days, label: 'DAYS / روز' },
                  { val: hours, label: 'HRS / ساعت' },
                  { val: minutes, label: 'MIN / دقیقه' },
                  { val: seconds, label: 'SEC / ثانیه' },
                ].map((u, idx) => (
                  <div
                    key={idx}
                    className="bg-[#213743] border border-white/[0.08] rounded-xl py-2 px-1 shadow-inner"
                  >
                    <div className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
                      {String(u.val).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{u.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D WebGL Golden Sphere Chamber */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <ThreeGoldenSphere />
            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="relative z-10 pt-4 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="hero-buy-ticket-btn"
                onClick={() => navigateTo('play')}
                className="px-6 py-3.5 rounded-xl gold-gradient-cta font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-lg">confirmation_number</span>
                <span>ترمینال کامل خرید بلیت</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('mini-games')}
                className="px-4 py-3.5 rounded-xl bg-[#213743] hover:bg-[#2f4553] border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base text-[#00e701]">bolt</span>
                <span>مینی‌گیم‌های ۶۰ فریم</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('user-panel')}
              className="text-xs font-bold text-[#fbbf24] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>پنل VIP و لینک معرف ۲٪</span>
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </button>
          </div>
        </div>

        {/* ZONE B: Interactive Tactile Ticket Builder (5 Cols) */}
        <div className="xl:col-span-5 studio-sidebar-panel rounded-3xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Header & 1-Click Quick Pick ⚡ */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] pb-3.5">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#00e701] block">
                  ZONE B • INTERACTIVE TICKET BUILDER
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  انتخاب سریع شماره‌ها (۵ گوی اصلی + ۱ گوی طلایی)
                </h2>
              </div>
              <button
                type="button"
                onClick={randomizeHeroRack}
                className="px-3.5 py-2 rounded-xl bg-[#213743] hover:bg-[#2f4553] border border-[#fbbf24]/40 text-[#fbbf24] text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <span>⚡</span>
                <span>انتخاب تصادفی (Quick Pick)</span>
              </button>
            </div>

            {/* Selected 3D Golden Spheres Preview Rack */}
            <div className="bg-[#0f212e] border border-white/[0.07] rounded-2xl p-3.5 flex items-center justify-between gap-2" dir="ltr">
              <div className="flex items-center gap-2">
                {heroBalls.map((num) => (
                  <span
                    key={num}
                    className="w-9 h-9 rounded-full lottery-ball-gold flex items-center justify-center text-slate-950 font-black text-xs font-mono tabular-nums"
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                ))}
                <span className="text-[#fbbf24] font-black text-sm">+</span>
                <span className="w-9 h-9 rounded-full lottery-ball-purple flex items-center justify-center text-white font-black text-xs font-mono tabular-nums border border-[#fbbf24]">
                  ★{String(heroStarBall).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {heroBalls.length}/5 Selected
              </span>
            </div>

            {/* Tactile Number Picker Grid (1..25 quick studio matrix + Golden Ball selector) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>انتخاب از ماتریس گوی‌های اصلی:</span>
                <span className="font-mono text-slate-400" dir="ltr">
                  #01 – #30 Quick Grid
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1.5" dir="ltr">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
                  const isPicked = heroBalls.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleHeroGridNumber(n)}
                      className={`h-8 rounded-lg font-mono text-xs font-black transition-all cursor-pointer tabular-nums ${
                        isPicked
                          ? 'lottery-ball-gold text-slate-950 scale-105'
                          : 'bg-[#213743] hover:bg-[#2f4553] text-slate-200 border border-white/[0.06]'
                      }`}
                    >
                      {String(n).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Golden Star Ball Quick Selector (1..10) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>انتخاب گوی طلایی ویژه (Golden Star Ball):</span>
                <span className="font-mono text-purple-300" dir="ltr">
                  ★{String(heroStarBall).padStart(2, '0')}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1.5" dir="ltr">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => {
                  const active = heroStarBall === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setHeroStarBall(g);
                        setSelectedGoldenBall(g);
                      }}
                      className={`h-8 rounded-lg font-mono text-xs font-black transition-all cursor-pointer tabular-nums ${
                        active
                          ? 'lottery-ball-purple text-white border border-[#fbbf24] scale-105'
                          : 'bg-[#0f212e] hover:bg-[#213743] text-slate-300 border border-white/[0.06]'
                      }`}
                    >
                      ★{g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi-Ticket Bundle Selector (1x, 5x, 10x) */}
            <div className="bg-[#0f212e] border border-white/[0.07] rounded-2xl p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300">بسته خرید (Bundle):</span>
              <div className="flex items-center gap-1.5" dir="ltr">
                {([
                  { qty: 1 as const, label: '1x Ticket ($5)' },
                  { qty: 5 as const, label: '5x (-5% Off)' },
                  { qty: 10 as const, label: '10x (-10% Off)' },
                ]).map((b) => (
                  <button
                    key={b.qty}
                    type="button"
                    onClick={() => setBundleQty(b.qty)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-black transition-all cursor-pointer whitespace-nowrap tabular-nums ${
                      bundleQty === b.qty
                        ? 'bg-[#fbbf24] text-slate-950 shadow'
                        : 'bg-[#213743] text-slate-300 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prominent 3D Buy Ticket CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleQuickInstantBuy}
              className="w-full py-3.5 px-4 rounded-xl stake-emerald-cta font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              <span>خرید آنی کوپن ({bundleQty}x)</span>
            </button>
            <button
              type="button"
              onClick={applyHeroBallsToTerminal}
              className="w-full py-3.5 px-4 rounded-xl gold-gradient-cta font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>انتقال به سبد خرید ←</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FOUR CONCURRENT ACTIVE LOTTERY POOLS
          ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#fbbf24] text-2xl">casino</span>
              <span>استخرهای قرعه‌کشی فعال همزمان</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              هر استخر دارای تایمر مستقل، قیمت بلیت مجزا و بذر رمزنگاری Provably Fair اختصاصی است.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1a2c38] p-1.5 rounded-2xl border border-white/[0.07] overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'همه استخرها (۴)' },
              { id: 'MEGA_WEEKLY', label: 'Mega VIP' },
              { id: 'DAILY_BLITZ', label: 'Daily Blitz' },
              { id: 'HOURLY_FLASH', label: 'Hourly Flash' },
              { id: 'TON_SPECIAL', label: 'TON Special' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'gold-gradient-cta text-[#241300] shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
                ? 'جک‌پات بزرگ هفتگی (۵ از ۵۰ + ۱)'
                : spec.id === 'DAILY_BLITZ'
                ? 'قرعه‌کشی سریع روزانه (۵ از ۳۵ + ۱)'
                : spec.id === 'HOURLY_FLASH'
                ? 'قرعه‌کشی ۶۰ دقیقه‌ای (۴ از ۲۵)'
                : 'ویژه کامیونیتی تلگرام (TON)';

            return (
              <div
                key={spec.id}
                data-testid={`lobby-lottery-card-${spec.id}`}
                className={`luxury-marble-card luxury-marble-card-hover rounded-3xl overflow-hidden flex flex-col justify-between ${
                  isSelected ? 'ring-2 ring-[#fbbf24]' : ''
                }`}
              >
                {/* Graphical Card Header Image */}
                <div className="relative h-32 overflow-hidden border-b border-white/[0.07]">
                  <img
                    src={getPoolBannerImage(spec.id)}
                    alt={cleanTitleEn}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-55 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f212e] via-[#0f212e]/45 to-transparent" />
                  <div
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-[#0b1620]/85 border border-white/15 text-xs font-mono font-black text-[#00e701] tabular-nums"
                    dir="ltr"
                  >
                    ⏱ {formatTimerCompact(timerSec)}
                  </div>
                  <div className="absolute bottom-3 right-3 left-3 flex items-center gap-3">
                    {renderPoolEmblem(spec.id)}
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate" dir="ltr">
                        {cleanTitleEn}
                      </h3>
                      <p className="text-xs font-bold text-[#fbbf24] truncate">{cleanSubFa}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">جایزه استخر فعلی:</span>
                      <div
                        className="text-2xl xl:text-3xl font-black text-[#fbbf24] font-mono tabular-nums whitespace-nowrap mt-0.5"
                        dir="ltr"
                      >
                        ${Math.round(jackpotNum).toLocaleString('en-US')}+
                      </div>
                      <div className="text-xs font-bold text-[#00e701] mt-1 truncate tabular-nums">
                        {formatAmount(jackpotNum)}
                      </div>
                    </div>

                    <div className="bg-[#1a2c38] rounded-2xl p-3 border border-white/[0.07] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">قیمت هر بلیت:</span>
                        <span className="font-mono font-black text-white text-sm tabular-nums" dir="ltr">
                          ${ticketPriceNum.toFixed(2)} USDT
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between text-[11px] text-[#fbbf24] font-mono tabular-nums"
                        dir="ltr"
                      >
                        <span>{priceEq.ton} TON</span>
                        <span>·</span>
                        <span>{priceEq.toman.toLocaleString('en-US')} T</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`lobby-play-btn-${spec.id}`}
                    onClick={() => handleSelectLotteryAndPlay(spec.id)}
                    className="w-full py-3.5 rounded-xl gold-gradient-cta font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>ورود به استخر و خرید بلیت</span>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          ZONE C: MY ACTIVE HOLOGRAPHIC TICKETS & VERIFIABLE PAST DRAWS + STATS
          ===================================================================== */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Zone C Tabbed Panel (7 Cols) */}
        <div className="xl:col-span-7 studio-arena-frame rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#fbbf24] block">
                ZONE C • HOLOGRAPHIC VOUCHERS &amp; VERIFIABLE DRAW ARCHIVE
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                کوپن‌های هولوگرافیک فعال من و تاریخچه قرعه‌کشی‌ها
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1a2c38] p-1 rounded-xl border border-white/[0.07]">
              <button
                type="button"
                onClick={() => setZoneCTab('MY_TICKETS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  zoneCTab === 'MY_TICKETS'
                    ? 'bg-[#213743] text-[#fbbf24] border border-[#fbbf24]/40 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🎟️ بلیت‌های هولوگرافیک ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setZoneCTab('PAST_DRAWS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  zoneCTab === 'PAST_DRAWS'
                    ? 'bg-[#213743] text-[#00e701] border border-[#00e701]/40 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🛡️ تاریخچه قرعه‌کشی و برندگان ({drawHistory.length + jackpotWinners.length})
              </button>
            </div>
          </div>

          {zoneCTab === 'MY_TICKETS' ? (
            <div className="space-y-3">
              {tickets.slice(0, 4).map((t) => {
                const prize = parseFloat(t.prizeWonUsdt) || 0;
                const isWinner = prize > 0 || t.status.toUpperCase() === 'WON';
                let parsedNums: number[] = [7, 14, 23, 38, 49];
                try {
                  parsedNums = JSON.parse(t.mainNumbers);
                } catch {
                  // fallback
                }
                return (
                  <div
                    key={t.ticketCode}
                    className="relative rounded-2xl bg-gradient-to-r from-[#1a2c38] via-[#162733] to-[#1a2c38] border border-white/[0.09] hover:border-[#fbbf24]/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#fbbf24] tabular-nums" dir="ltr">
                          #{t.ticketCode}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {t.roundCode === '#ZRN-8493'
                            ? 'Mega Jackpot VIP'
                            : t.roundCode === '#BLZ-2409'
                            ? 'Daily Blitz'
                            : 'Hourly Flash'}
                        </span>
                        <span className="text-[11px] text-slate-400">· {t.createdAt}</span>
                      </div>

                      {/* Selected Balls on Holographic Voucher */}
                      <div className="flex items-center gap-1.5 pt-1" dir="ltr">
                        {parsedNums.map((num, idx) => (
                          <span
                            key={`${t.ticketCode}-${idx}`}
                            className="w-7 h-7 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-xs flex items-center justify-center tabular-nums"
                          >
                            {String(num).padStart(2, '0')}
                          </span>
                        ))}
                        <span className="text-[#fbbf24] font-black text-xs">+</span>
                        <span className="w-7 h-7 rounded-full lottery-ball-purple text-white font-mono font-black text-xs flex items-center justify-center tabular-nums">
                          ★{String(t.goldenBall).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      {isWinner ? (
                        <span className="px-3 py-1 rounded-lg bg-[#00e701]/20 border border-[#00e701]/50 text-[#00e701] text-xs font-black font-mono tabular-nums" dir="ltr">
                          WON +${prize.toFixed(2)} USDT
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-[#213743] border border-white/10 text-[#fbbf24] text-xs font-bold">
                          ⏳ فعال در قرعه‌کشی
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViralCardTicket(t)}
                          className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          کارت هولوگرافیک
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo('my-tickets')}
                          className="text-[11px] font-bold text-[#fbbf24] hover:underline cursor-pointer"
                        >
                          جزئیات ←
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400">
                  تمامی کوپن‌ها با امضای دیجیتال SHA-256 در دفترکل ثبت شده‌اند.
                </span>
                <button
                  type="button"
                  onClick={() => navigateTo('my-tickets')}
                  className="px-4 py-2 rounded-xl bg-[#213743] hover:bg-[#2f4553] text-xs font-black text-[#fbbf24] cursor-pointer whitespace-nowrap"
                >
                  مشاهده همه بلیت‌ها ({tickets.length}) ←
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-white/10 font-mono">
                    <th className="py-2.5">دور / برنده</th>
                    <th className="py-2.5">اعداد برنده / استخر</th>
                    <th className="py-2.5 hidden sm:table-cell">هش / منطقه</th>
                    <th className="py-2.5 text-left">جایزه تسویه‌شده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono text-xs tabular-nums">
                  {drawHistory.slice(0, 3).map((d) => (
                    <tr
                      key={d.drawId}
                      onClick={() => navigateTo('transparency')}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-black text-[#fbbf24]" dir="ltr">
                        {d.roundCode} (#{d.nonce})
                      </td>
                      <td className="py-3 text-white font-bold" dir="ltr">
                        [{d.drawnMain.join(', ')}] + ★{d.drawnGolden}
                      </td>
                      <td className="py-3 text-slate-400 hidden sm:table-cell" dir="ltr">
                        0x{d.first52BitHex}
                      </td>
                      <td className="py-3 text-left font-black text-[#00e701]" dir="ltr">
                        ${d.totalPayoutUsdt.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {jackpotWinners.slice(0, 3).map((w) => (
                    <tr
                      key={w.txHash}
                      onClick={() => navigateTo('status')}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-black text-white" dir="ltr">
                        {w.winnerName}
                      </td>
                      <td className="py-3 font-sans font-bold text-slate-200">{w.lotteryTitle}</td>
                      <td className="py-3 font-sans text-slate-400 hidden sm:table-cell">
                        {w.winnerLocation}
                      </td>
                      <td className="py-3 text-left font-black text-[#00e701]" dir="ltr">
                        ${Number(w.amountUsdt).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Platform Live Stats & Dedicated User VIP Panel Showcase Card (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col justify-between gap-5">
          <div className="studio-arena-frame rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-black text-white border-b border-white/[0.07] pb-3">
              آمار زنده شبکه LuckyDrop
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.ticketIcon3d}
                  alt="Tickets"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-[#fbbf24]/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">کل بلیت‌های صادر شده</span>
                  <div className="text-lg font-black text-white font-mono tabular-nums" dir="ltr">
                    4,892,342
                  </div>
                </div>
              </div>

              <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.vipAvatar}
                  alt="Users"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-[#fbbf24]/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">کاربران فعال جهانی</span>
                  <div className="text-lg font-black text-white font-mono tabular-nums" dir="ltr">
                    287,563
                  </div>
                </div>
              </div>

              <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.trophyIcon3d}
                  alt="Winnings"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-[#fbbf24]/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">جوایز تسویه شده</span>
                  <div className="text-lg font-black text-[#00e701] font-mono tabular-nums" dir="ltr">
                    $1,245,680
                  </div>
                </div>
              </div>

              <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.shieldIcon3d}
                  alt="RTP"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-[#00e701]/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">نرخ بازگشت (RTP)</span>
                  <div className="text-lg font-black text-[#fbbf24] font-mono tabular-nums" dir="ltr">
                    85.0% — 99.0%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Banner Card for User VIP Panel & Admin Security Gateway */}
          <div
            onClick={() => navigateTo('user-panel')}
            className="relative rounded-3xl overflow-hidden studio-arena-frame p-6 cursor-pointer group"
          >
            <img
              src={LUXURY_IMAGES.userVipBanner}
              alt="VIP User Panel"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f212e]/95 via-[#0f212e]/85 to-[#1a2c38]/90" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#fbbf24] block">
                  👑 VIP LOYALTY &amp; REFERRAL PORTAL
                </span>
                <h4 className="text-lg font-black text-white group-hover:text-[#fbbf24] transition-colors">
                  ورود به پنل کاربری VIP و مدیریت حساب
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  مشاهده پورتفولیوی چندارزی، صندوقچه ۳٪ وفاداری و لینک معرف ۲٪ بدون ریسک.
                </p>
              </div>
              <span className="w-11 h-11 rounded-xl gold-gradient-cta flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. PROVABLY FAIR SHA-256 COMMIT HASH VERIFICATION BOX
          ===================================================================== */}
      <section className="relative rounded-3xl overflow-hidden studio-arena-frame p-6 sm:p-7 space-y-5">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-3">
              <img
                src={LUXURY_IMAGES.shieldIcon3d}
                alt="Fairness Shield"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border border-[#00e701]/60 shrink-0"
              />
              <div>
                <span className="text-xs font-mono font-bold text-[#00e701] block">
                  PROVABLY FAIR HMAC-SHA256 AUDIT ENGINE
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  ماشین‌حساب بازبینی مستقل هش قرعه‌کشی (Live SHA-256 Audit)
                </h3>
              </div>
            </div>
            <code className="text-xs font-mono text-[#fbbf24] bg-[#1a2c38] px-3 py-1.5 rounded-xl border border-white/10">
              HMAC_SHA256(ServerSeed : ClientSeed : Round)
            </code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Server Seed (بذر سرور):</label>
              <input
                type="text"
                dir="ltr"
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Client Seed (بذر کاربر):</label>
              <input
                type="text"
                dir="ltr"
                value={verifyClientSeed}
                onChange={(e) => setVerifyClientSeed(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#00e701] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">شماره دور (Round):</label>
              <input
                type="number"
                dir="ltr"
                value={verifyRoundNum}
                onChange={(e) => setVerifyRoundNum(Number(e.target.value) || 482)}
                className="w-full studio-input-well rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#fbbf24] font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              data-testid="verify-fairness-btn"
              onClick={handleRunVerification}
              className="px-5 py-3 rounded-xl stake-emerald-cta font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">fact_check</span>
              <span>محاسبه و راستی‌آزمایی خروجی قرعه‌کشی</span>
            </button>

            {verifiedResult && (
              <div className="flex items-center gap-2" dir="ltr">
                <span className="text-xs text-slate-300 font-mono font-bold">Drawn Balls:</span>
                {verifiedResult.mainBalls.map((b) => (
                  <span
                    key={b}
                    className="w-8 h-8 rounded-full lottery-ball-gold text-slate-950 font-black text-xs flex items-center justify-center font-mono tabular-nums"
                  >
                    {b}
                  </span>
                ))}
                <span className="w-8 h-8 rounded-full lottery-ball-purple text-white font-black text-xs flex items-center justify-center font-mono tabular-nums">
                  ★{verifiedResult.goldenBall}
                </span>
              </div>
            )}
          </div>

          {verifiedResult && (
            <div className="p-3 rounded-xl bg-[#1a2c38] border border-[#00e701]/40 text-xs font-mono text-[#00e701] break-all" dir="ltr">
              Computed SHA-256: {verifiedResult.hash}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
