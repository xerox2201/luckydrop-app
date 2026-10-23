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
    transactions,
    fxRates,
    formatAmount,
    navigateTo,
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
        className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.45)] shrink-0"
      />
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-14 space-y-8">
      {/* =====================================================================
          1. 3D WEBGL & HIGH-RES GRAPHICAL HERO STAGE (Simplified, High-Contrast, Zero Clutter)
          ===================================================================== */}
      <section className="relative rounded-3xl overflow-hidden border border-amber-500/45 shadow-[0_28px_80px_rgba(0,0,0,0.92)] motion-card-enter">
        {/* Real Photographic Vault Background + Multi-Stop Obsidian Gold Veil */}
        <img
          src={LUXURY_IMAGES.vaultHero}
          alt="LuckyDrop Sovereign Vault"
          className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#0b0f18]/85 to-[#171105]/92" />
        <div className="absolute -top-24 left-1/3 w-96 h-96 bg-amber-500/20 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Right Column (RTL): Crystal-Clear Headline, Subtitle & Primary Actions */}
          <div className="lg:col-span-5 space-y-4 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/45 text-amber-300 text-xs sm:text-sm font-black">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>تضمین ۱۰۰٪ قرعه‌کشی هوشمند راس تایمر</span>
            </div>

            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              بزرگترین لاتاری هوشمند ارز دیجیتال
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              ۴ استخر همزمان با اثبات رمزنگاری <span className="text-amber-300 font-bold">SHA-256</span>، نرخ زنده اوراکل و تسویه آنی جوایز به کیف پول شما.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                data-testid="hero-buy-ticket-btn"
                onClick={() => navigateTo('play')}
                className="gold-gradient-cta text-[#241300] font-black text-sm sm:text-base px-7 py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-xl"
              >
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
                <span>همین حالا بلیت بخرید</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('user-panel')}
                className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-400/40 text-amber-200 font-black text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">workspace_premium</span>
                <span>پنل کاربری VIP</span>
              </button>
            </div>
          </div>

          {/* Center Column: Interactive Three.js 3D Golden Lottery Sphere (#7 with Royal Crown & Orbiting Balls) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <ThreeGoldenSphere />
          </div>

          {/* Left Column (RTL): Oversized High-Contrast Jackpot Readout & 4-Unit Countdown */}
          <div className="lg:col-span-3 bg-[#090d16]/90 border border-amber-500/35 rounded-3xl p-5 space-y-4 text-center shadow-2xl" dir="ltr">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
              <span>👑</span>
              <span>MEGA JACKPOT POOL</span>
            </div>

            <div className="text-3xl xl:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 drop-shadow whitespace-nowrap">
              ${Math.round(megaJackpotUsdt).toLocaleString('en-US')}+
            </div>

            <div
              data-testid="hero-jackpot-amount"
              className="text-xs sm:text-sm font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl py-2 px-3"
              dir="rtl"
            >
              معادل زنده: {formatAmount(megaJackpotUsdt)}
            </div>

            {/* High-Legibility 4-Box Countdown */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              {[
                { val: days, label: 'روز' },
                { val: hours, label: 'ساعت' },
                { val: minutes, label: 'دقیقه' },
                { val: seconds, label: 'ثانیه' },
              ].map((u, idx) => (
                <div
                  key={idx}
                  className="bg-[#111726] border border-amber-500/35 rounded-2xl py-2 px-1"
                >
                  <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    {String(u.val).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] font-bold text-slate-300 mt-0.5">{u.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Interactive AI 5+1 Golden Ball Quick-Pick Strip */}
        <div className="relative z-10 bg-[#080b12]/90 border-t border-amber-500/25 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-lg">auto_awesome</span>
              <span>ترکیب شانس پیشنهادی هوش مصنوعی (۵ گوی اصلی + ۱ گوی طلایی):</span>
            </span>
            <div className="flex items-center gap-2" dir="ltr">
              {heroBalls.map((num) => (
                <span
                  key={num}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full lottery-ball-gold flex items-center justify-center text-slate-950 font-black text-xs sm:text-sm font-mono"
                >
                  {String(num).padStart(2, '0')}
                </span>
              ))}
              <span className="text-amber-400 font-black text-sm">+</span>
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full lottery-ball-purple flex items-center justify-center text-white font-black text-xs sm:text-sm font-mono">
                ★{String(heroStarBall).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={randomizeHeroRack}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-amber-300 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">autorenew</span>
              <span>شماره تصادفی جدید</span>
            </button>
            <button
              type="button"
              onClick={applyHeroBallsToTerminal}
              className="px-4 py-2 rounded-xl emerald-gradient-cta text-xs sm:text-sm font-black cursor-pointer"
            >
              انتقال مستقیم به سبد خرید ←
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FOUR CONCURRENT ACTIVE LOTTERY POOLS (Graphical Photo Cards + Bold Fonts)
          ===================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-2xl">casino</span>
              <span>استخرهای قرعه‌کشی فعال همزمان</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              هر استخر دارای تایمر مستقل، قیمت بلیت مجزا و بذر رمزنگاری Provably Fair اختصاصی است.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#101520] p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
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
                  isSelected ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {/* Graphical Card Header Image */}
                <div className="relative h-32 overflow-hidden border-b border-amber-500/25">
                  <img
                    src={getPoolBannerImage(spec.id)}
                    alt={cleanTitleEn}
                    className="w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d111a] via-[#0d111a]/45 to-transparent" />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/75 border border-white/15 text-xs font-mono font-black text-emerald-400" dir="ltr">
                    ⏱ {formatTimerCompact(timerSec)}
                  </div>
                  <div className="absolute bottom-3 right-3 left-3 flex items-center gap-3">
                    {renderPoolEmblem(spec.id)}
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate" dir="ltr">
                        {cleanTitleEn}
                      </h3>
                      <p className="text-xs font-bold text-amber-200 truncate">{cleanSubFa}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">جایزه استخر فعلی:</span>
                      <div
                        className="text-2xl xl:text-3xl font-black text-amber-400 font-mono whitespace-nowrap mt-0.5"
                        dir="ltr"
                      >
                        ${Math.round(jackpotNum).toLocaleString('en-US')}+
                      </div>
                      <div className="text-xs font-bold text-emerald-300 mt-1 truncate">
                        {formatAmount(jackpotNum)}
                      </div>
                    </div>

                    <div className="bg-[#090c14]/90 rounded-2xl p-3 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">قیمت هر بلیت:</span>
                        <span className="font-mono font-black text-white text-sm" dir="ltr">
                          ${ticketPriceNum.toFixed(2)} USDT
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-mono" dir="ltr">
                        <span>{priceEq.ton} TON</span>
                        <span>•</span>
                        <span>{priceEq.toman.toLocaleString('en-US')} T</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`lobby-play-btn-${spec.id}`}
                    onClick={() => handleSelectLotteryAndPlay(spec.id)}
                    className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#241300] font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
          3. RECENT TICKETS & WINNERS TABLE + PLATFORM STATS & VIP SHOWCASE
          ===================================================================== */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Tickets & Blockchain Winners Table (7 Cols) */}
        <div className="xl:col-span-7 luxury-marble-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">بلیت‌های اخیر شما و برندگان بلاکچین</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                ثبت آنی تمامی کوپن‌ها و تسویه خودکار جوایز به کیف پول برندگان
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('my-tickets')}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs sm:text-sm text-amber-300 font-black cursor-pointer"
            >
              مشاهده همه بلیت‌ها ←
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="text-xs text-slate-300 border-b border-white/10">
                  <th className="py-3 font-bold">کد بلیت / برنده</th>
                  <th className="py-3 font-bold">استخر بازی</th>
                  <th className="py-3 font-bold hidden sm:table-cell">زمان / منطقه</th>
                  <th className="py-3 font-bold">وضعیت</th>
                  <th className="py-3 font-bold text-left">مبلغ جایزه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {tickets.slice(0, 4).map((t) => {
                  const prize = parseFloat(t.prizeWonUsdt) || 0;
                  const isWinner = prize > 0 || t.status === 'won';
                  return (
                    <tr
                      key={t.ticketCode}
                      onClick={() => navigateTo('my-tickets')}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 font-mono font-black text-white" dir="ltr">
                        {t.ticketCode}
                      </td>
                      <td className="py-3.5 font-bold text-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-amber-400">👑</span>
                          <span>
                            {t.roundCode === '#ZRN-8493'
                              ? 'Mega Jackpot VIP'
                              : t.roundCode === '#BLZ-2409'
                              ? 'Daily Blitz'
                              : 'Hourly Flash'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-300 text-xs hidden sm:table-cell">{t.createdAt}</td>
                      <td className="py-3.5">
                        {isWinner ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                            ★ برنده جایزه
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black">
                            ⏳ در انتظار قرعه‌کشی
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-left font-mono font-black text-emerald-400 text-base" dir="ltr">
                        {isWinner ? `$${prize.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}

                {jackpotWinners.slice(0, 2).map((w) => (
                  <tr
                    key={w.txHash}
                    onClick={() => navigateTo('status')}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 font-mono font-black text-amber-300" dir="ltr">
                      {w.winnerName}
                    </td>
                    <td className="py-3.5 font-bold text-slate-100">{w.lotteryTitle}</td>
                    <td className="py-3.5 text-slate-300 text-xs hidden sm:table-cell">{w.winnerLocation}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                        ✓ پرداخت شده
                      </span>
                    </td>
                    <td className="py-3.5 text-left font-mono font-black text-emerald-400 text-base" dir="ltr">
                      ${Number(w.amountUsdt).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Live Stats & Dedicated User VIP Panel Showcase Card (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col justify-between gap-5">
          <div className="luxury-marble-card rounded-3xl p-6 space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-white border-b border-white/10 pb-3">
              آمار زنده شبکه LuckyDrop
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.ticketIcon3d}
                  alt="Tickets"
                  className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">کل بلیت‌های صادر شده</span>
                  <div className="text-lg sm:text-xl font-black text-white font-mono" dir="ltr">
                    4,892,342
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.vipAvatar}
                  alt="Users"
                  className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">کاربران فعال جهانی</span>
                  <div className="text-lg sm:text-xl font-black text-white font-mono" dir="ltr">
                    287,563
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.trophyIcon3d}
                  alt="Winnings"
                  className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">جوایز تسویه شده</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono" dir="ltr">
                    $1,245,680
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0d15] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <img
                  src={LUXURY_IMAGES.shieldIcon3d}
                  alt="RTP"
                  className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-300 block">نرخ بازگشت (RTP)</span>
                  <div className="text-lg sm:text-xl font-black text-amber-300 font-mono" dir="ltr">
                    85.0%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Banner Card for User VIP Panel & Admin Security Gateway */}
          <div
            onClick={() => navigateTo('user-panel')}
            className="relative rounded-3xl overflow-hidden border border-amber-500/45 p-6 cursor-pointer group shadow-xl"
          >
            <img
              src={LUXURY_IMAGES.userVipBanner}
              alt="VIP User Panel"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090d16]/92 via-[#0f1524]/85 to-[#1f1606]/85" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
                  👑 پنل اختصاصی کاربر و امنیت
                </span>
                <h4 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                  ورود به پنل کاربری VIP و مدیریت حساب
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  مشاهده پورتفولیوی چندارزی، دریافت آنی جوایز و درگاه استاندارد امنیتی ادمین (Zero-Trust).
                </p>
              </div>
              <span className="w-12 h-12 rounded-2xl gold-gradient-cta text-[#241300] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. PROVABLY FAIR SHA-256 COMMIT HASH VERIFICATION BOX
          ===================================================================== */}
      <section className="relative rounded-3xl overflow-hidden border border-emerald-500/35 p-6 sm:p-7 space-y-5 shadow-2xl">
        <img
          src={LUXURY_IMAGES.fairnessAudit}
          alt="Provably Fair Audit"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080c14]/92 via-[#0b111d]/90 to-[#071712]/90 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <img
                src={LUXURY_IMAGES.shieldIcon3d}
                alt="Fairness Shield"
                className="w-12 h-12 rounded-2xl object-cover border border-emerald-400/60 shrink-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-black text-emerald-400 block">
                  الگوریتم اثبات‌پذیر منصفانه (Provably Fair HMAC-SHA256)
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  ماشین‌حساب بازبینی مستقل هش قرعه‌کشی (Live SHA-256 Audit)
                </h3>
              </div>
            </div>
            <code className="text-xs font-mono text-amber-300 bg-[#090c14] px-3 py-1.5 rounded-xl border border-amber-500/30">
              HMAC_SHA256(ServerSeed : ClientSeed : Round)
            </code>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Server Seed (بذر سرور):</label>
              <input
                type="text"
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                className="w-full bg-[#090c14] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Client Seed (بذر کاربر):</label>
              <input
                type="text"
                value={verifyClientSeed}
                onChange={(e) => setVerifyClientSeed(e.target.value)}
                className="w-full bg-[#090c14] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">شماره دور (Round):</label>
              <input
                type="number"
                value={verifyRoundNum}
                onChange={(e) => setVerifyRoundNum(Number(e.target.value) || 482)}
                className="w-full bg-[#090c14] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-300 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              data-testid="verify-fairness-btn"
              onClick={handleRunVerification}
              className="px-5 py-3 rounded-xl emerald-gradient-cta font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
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
                    className="w-8 h-8 rounded-full lottery-ball-gold text-slate-950 font-black text-xs flex items-center justify-center font-mono"
                  >
                    {b}
                  </span>
                ))}
                <span className="w-8 h-8 rounded-full lottery-ball-purple text-white font-black text-xs flex items-center justify-center font-mono">
                  ★{verifiedResult.goldenBall}
                </span>
              </div>
            )}
          </div>

          {verifiedResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs font-mono text-emerald-300 break-all">
              Computed SHA-256: {verifiedResult.hash}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
