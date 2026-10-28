import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  deriveProvablyFairBalls,
  MULTI_LOTTERY_SPECS,
  COMBINATORIAL_TIERS,
  LotteryTypeId,
  calculateDynamicPariMutuelPool,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';
import { ThreeGoldenSphere } from './ThreeGoldenSphere.tsx';
import { HapticEngine } from '../utils/telegramTma.ts';

export const LobbyView: React.FC = () => {
  const {
    rounds,
    tickets,
    drawHistory,
    transactions,
    formatAmount,
    navigateTo,
    selectedMainBalls,
    setSelectedMainBalls,
    selectedGoldenBall,
    setSelectedGoldenBall,
    activeLotteryId,
    setActiveLotteryId,
    activeRoundCode,
    setActiveRoundCode,
    activeRound,
    activeLotterySpec,
    lotteryTimers,
    provablyFairSeeds,
    setBulkTicketCount,
    mintTicket,
    setViralCardTicket,
    activeTmaCurrency,
  } = useLottery();

  const [zoneCTab, setZoneCTab] = useState<'MY_TICKETS' | 'RULES_AND_TIERS' | 'PAST_DRAWS'>(
    'MY_TICKETS'
  );
  const [bundleQty, setBundleQty] = useState<1 | 5 | 10>(1);
  const [instantMintBanner, setInstantMintBanner] = useState<string | null>(null);
  const [showVerifier, setShowVerifier] = useState<boolean>(false);

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

  // Active Pool Spec & Countdown in sleek HH:MM:SS
  const activeSpec = activeLotterySpec || MULTI_LOTTERY_SPECS[0];
  const mainCount = Number(activeRound?.mainCount) || activeSpec.mainCount || 5;
  const mainMax = Number(activeRound?.mainMax) || activeSpec.mainMax || 50;
  const goldenMax =
    typeof activeRound?.goldenMax === 'number'
      ? activeRound.goldenMax
      : activeSpec.goldenMax ?? 15;

  const activeTimerSec = activeRound?.drawTargetTimestampMs
    ? Math.max(0, Math.floor((activeRound.drawTargetTimestampMs - Date.now()) / 1000))
    : lotteryTimers[activeLotteryId] || 3600;
  const totalHours = Math.floor(activeTimerSec / 3600);
  const minutes = Math.floor((activeTimerSec % 3600) / 60);
  const seconds = activeTimerSec % 60;
  const formattedCountdown = `${String(totalHours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`;

  // Dynamic Hero Lottery Ball Rack matching mainCount & mainMax (e.g. 5/50 + 1/15)
  const [heroBalls, setHeroBalls] = useState<number[]>(() =>
    selectedMainBalls.length === mainCount && selectedMainBalls.every((b) => b <= mainMax)
      ? selectedMainBalls
      : [7, 14, 23, 38, 49].slice(0, mainCount)
  );
  const [heroStarBall, setHeroStarBall] = useState<number>(() =>
    goldenMax > 0 ? Math.min(goldenMax, Math.max(1, selectedGoldenBall || 8)) : 0
  );

  // Keep selected balls valid whenever user switches tournament tab (50, 35, 25, or 40 balls)
  useEffect(() => {
    const validMain = selectedMainBalls.filter((b) => b >= 1 && b <= mainMax);
    if (validMain.length === mainCount) {
      setHeroBalls(validMain);
    } else {
      const pool: number[] = [];
      const defaults = activeSpec.winningNumbers || [3, 9, 17, 24, 31];
      for (const d of defaults) {
        if (d <= mainMax && pool.length < mainCount && !pool.includes(d)) {
          pool.push(d);
        }
      }
      while (pool.length < mainCount) {
        const n = Math.floor(Math.random() * mainMax) + 1;
        if (!pool.includes(n)) pool.push(n);
      }
      pool.sort((a, b) => a - b);
      setHeroBalls(pool);
      setSelectedMainBalls(pool);
    }

    if (goldenMax === 0) {
      setHeroStarBall(0);
      setSelectedGoldenBall(0);
    } else if (selectedGoldenBall < 1 || selectedGoldenBall > goldenMax) {
      const nextStar = Math.min(goldenMax, activeSpec.winningGoldenBall || 6);
      setHeroStarBall(nextStar);
      setSelectedGoldenBall(nextStar);
    } else {
      setHeroStarBall(selectedGoldenBall);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLotteryId, activeRoundCode, mainCount, mainMax, goldenMax]);

  const randomizeHeroRack = () => {
    HapticEngine.impactOccurred('light');
    const pool: number[] = [];
    while (pool.length < mainCount) {
      const n = Math.floor(Math.random() * mainMax) + 1;
      if (!pool.includes(n)) pool.push(n);
    }
    pool.sort((a, b) => a - b);
    const star = goldenMax > 0 ? Math.floor(Math.random() * goldenMax) + 1 : 0;
    setHeroBalls(pool);
    setHeroStarBall(star);
    setSelectedMainBalls(pool);
    setSelectedGoldenBall(star);
  };

  const toggleHeroGridNumber = (n: number) => {
    HapticEngine.selectionChanged();
    if (heroBalls.includes(n)) {
      if (heroBalls.length > 1) {
        const next = heroBalls.filter((b) => b !== n);
        setHeroBalls(next);
        setSelectedMainBalls(next);
      }
    } else {
      const next =
        heroBalls.length >= mainCount
          ? [...heroBalls.slice(1), n].sort((a, b) => a - b)
          : [...heroBalls, n].sort((a, b) => a - b);
      setHeroBalls(next);
      setSelectedMainBalls(next);
    }
  };

  const handleQuickInstantBuy = async () => {
    HapticEngine.impactOccurred('medium');
    setSelectedMainBalls(heroBalls.slice(0, mainCount));
    setSelectedGoldenBall(heroStarBall);
    if (bundleQty > 1) {
      setBulkTicketCount(bundleQty);
      navigateTo('play');
      return;
    }
    const res = await mintTicket('TON Network');
    if (res.ok && res.ticket) {
      HapticEngine.notificationOccurred('success');
      setInstantMintBanner(`✅ کوپن #${res.ticket.ticketCode} به استخر ${activeSpec.roundCode} اضافه شد!`);
      setTimeout(() => setInstantMintBanner(null), 4000);
    } else {
      navigateTo('play');
    }
  };

  const handleSelectRoundInLobby = (roundItem: typeof rounds[number]) => {
    HapticEngine.selectionChanged();
    setActiveRoundCode(roundItem.roundCode);
    if (roundItem.lotteryType) {
      setActiveLotteryId(roundItem.lotteryType as LotteryTypeId);
    }
  };

  const handleRunVerification = () => {
    HapticEngine.impactOccurred('light');
    const balls = deriveProvablyFairBalls(
      verifyServerSeed,
      verifyClientSeed,
      verifyRoundNum,
      mainCount,
      mainMax,
      Math.max(1, goldenMax)
    );
    setVerifiedResult(balls);
  };

  const matchingRound = activeRound || rounds[0];
  const grossCollectedPoolUsdt =
    parseFloat(matchingRound?.totalSalesUsdt || '0') ||
    Number(matchingRound?.jackpotUsdt || 0) / 0.85 ||
    0;
  const poolBreakdown = calculateDynamicPariMutuelPool(grossCollectedPoolUsdt, 15);
  const megaJackpotUsdt = poolBreakdown.distributablePool85Usdt;
  const unitTicketPriceUsdt =
    Number(matchingRound?.ticketPriceUsdt) || activeSpec.ticketPriceUsdt || 5;
  const bundleDiscount = bundleQty === 10 ? 0.9 : bundleQty === 5 ? 0.95 : 1;
  const totalBuyCostUsdt = Number((unitTicketPriceUsdt * bundleQty * bundleDiscount).toFixed(2));
  const activeFullSeedHash = (
    matchingRound?.serverSeedHash ||
    activeSpec.serverSeedHash ||
    provablyFairSeeds.serverSeedHash
  ).replace(/^0x/, '');

  const jackpotWinners = transactions.filter(
    (t) =>
      t.type?.toLowerCase() === 'payout' ||
      t.type?.toUpperCase() === 'JACKPOT_PAYOUT' ||
      Boolean(t.winnerName)
  );

  return (
    <div className="space-y-3 px-3 pt-2 pb-24 max-w-[440px] mx-auto">
      {instantMintBanner && (
        <div className="rounded-2xl bg-[#130d24]/90 border border-[#00f59b]/40 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md text-[#00f59b] text-xs font-semibold flex items-center justify-between gap-2">
          <span>{instantMintBanner}</span>
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => navigateTo('my-tickets')}
            className="px-3 py-1.5 rounded-xl bg-[#00f59b] text-[#051c08] font-bold text-xs cursor-pointer whitespace-nowrap"
          >
            مشاهده ↗
          </motion.button>
        </div>
      )}

      {/* =====================================================================
          a) COMPACT HERO JACKPOT CARD
          Dynamic Pool Switcher (synced with Admin Rounds), 85% Distributable Pool
          readout in 💎 TON or ⭐ Stars, 15% Site Share badge, and 3D Glass Machine.
          ===================================================================== */}
      <section className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col items-center text-center gap-3">
        {/* Dynamic Pool Pill Switcher (Renders all active rounds managed by Admin) */}
        <div
          className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          dir="rtl"
        >
          {rounds.map((r) => {
            const active =
              matchingRound?.roundCode === r.roundCode || activeRoundCode === r.roundCode;
            return (
              <motion.button
                whileTap={{ scale: 0.96 }}
                key={r.roundCode}
                type="button"
                data-testid={
                  r.lotteryType
                    ? `lobby-lottery-card-${r.lotteryType}`
                    : `lobby-round-pill-${r.roundCode}`
                }
                onClick={() => handleSelectRoundInLobby(r)}
                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                  active
                    ? 'bg-purple-600/40 border-purple-400/60 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                    : 'bg-[#070510]/70 border-purple-500/15 text-purple-300/65 hover:text-white'
                }`}
              >
                {r.titleFa.includes('(')
                  ? r.titleFa
                  : `${r.titleFa} (${r.mainCount || 5}/${r.mainMax || 50})`}
              </motion.button>
            );
          })}
        </div>

        {/* Centered Dynamic 85% Pool Readout & Sleek HH:MM:SS Countdown Pill */}
        <div className="flex flex-col items-center gap-1.5 pt-0.5 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#070510]/90 border border-purple-500/25">
            <span className="text-[11px] font-semibold text-purple-200">
              {matchingRound?.titleFa || activeSpec.titleFa}
            </span>
            <span className="text-purple-500/50">•</span>
            <span
              className="text-xs font-semibold text-[#00f59b] font-mono tabular-nums"
              dir="ltr"
            >
              ⏱ {formattedCountdown}
            </span>
          </div>

          <div className="text-[10px] font-bold text-[#00f59b]">
            جایزه خالص قابل تقسیم راس تایم (۸۵٪ استخر جمع‌شده):
          </div>

          <div
            data-testid="hero-jackpot-amount"
            className="text-3xl font-extrabold tracking-tight tabular-nums text-[#fbbf24] drop-shadow-[0_2px_16px_rgba(251,191,36,0.3)]"
            dir="ltr"
          >
            {activeTmaCurrency === 'TON' ? '💎 ' : '⭐ '}
            {formatAmount(megaJackpotUsdt)}
          </div>

          {/* Dynamic Pool Transparency Pill: Gross Collected vs 15% Site Reserved */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] text-purple-200/85 bg-[#070510]/80 border border-purple-500/20 rounded-xl px-2.5 py-1">
            <span>
              کل استخر جمع‌شده: <strong className="text-white" dir="ltr">{formatAmount(poolBreakdown.grossCollectedUsdt)}</strong>
            </span>
            <span className="text-purple-500/50">•</span>
            <span className="text-[#fbbf24]">۱۵٪ سهم محفوظ سایت</span>
          </div>

          {/* Full Real Network Seed Hash ("hash" + complete 64-char hex code) */}
          <div
            className="w-full rounded-xl bg-[#070510]/80 border border-purple-500/20 px-2.5 py-1.5 flex items-baseline gap-1.5 text-left"
            dir="ltr"
          >
            <span className="text-[10px] font-mono font-bold text-[#fbbf24] shrink-0">hash</span>
            <code
              data-testid="lobby-hero-full-seed-hash"
              className="text-[9.5px] font-mono text-purple-200/85 break-all select-all leading-tight"
            >
              {activeFullSeedHash}
            </code>
          </div>
        </div>

        {/* Seamlessly Embedded 3D Glass Air-Mix Machine (Zero Double Borders) */}
        <div className="w-full">
          <ThreeGoldenSphere />
        </div>
      </section>

      {/* =====================================================================
          b) CLEAN NUMBER PICKER CARD (ALL 50 / 35 / 25 / 40 BALLS + 15 GOLDEN BALLS)
          Every number button is a compact, symmetrical perfect circle.
          ===================================================================== */}
      <section className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-3">
        {/* Single Aligned Header Row: ⚡ Quick Pick + Ticket Quantity (1x, 5x, 10x) */}
        <div className="flex items-center justify-between gap-2" dir="ltr">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid="quick-pick-btn"
            onClick={randomizeHeroRack}
            className="h-8 px-3 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-400/40 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>⚡ Quick Pick ({mainCount}/{mainMax})</span>
          </motion.button>

          <div className="flex items-center gap-1 bg-[#070510] p-1 rounded-xl border border-purple-500/20">
            {([1, 5, 10] as const).map((qty) => {
              const active = bundleQty === qty;
              return (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  key={qty}
                  type="button"
                  data-testid={`bundle-qty-${qty}`}
                  onClick={() => {
                    HapticEngine.selectionChanged();
                    setBundleQty(qty);
                  }}
                  className={`h-6 px-2.5 rounded-lg text-[11px] font-bold tabular-nums transition-all cursor-pointer ${
                    active
                      ? 'bg-[#fbbf24] text-slate-950 shadow-sm'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  {qty}x
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Balls Summary Strip */}
        <div
          className="flex items-center justify-between rounded-xl bg-[#070510]/90 border border-purple-500/20 px-3 py-2"
          dir="ltr"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {heroBalls.map((num) => (
              <span
                key={num}
                className="w-7 h-7 rounded-full lottery-ball-gold flex items-center justify-center text-slate-950 font-mono font-bold text-xs tabular-nums"
              >
                {String(num).padStart(2, '0')}
              </span>
            ))}
            {goldenMax > 0 && (
              <>
                <span className="text-xs font-bold text-[#fbbf24] px-0.5">+</span>
                <span className="w-7 h-7 rounded-full lottery-ball-purple flex items-center justify-center text-white font-mono font-bold text-xs tabular-nums border border-[#fbbf24]/80">
                  ★{heroStarBall}
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] font-mono font-semibold text-purple-200/80 tabular-nums">
            {heroBalls.length}/{mainCount} • 1–{mainMax}
          </span>
        </div>

        {/* Symmetrical 10-Column Grid (Shows ALL 50 / 35 / 25 / 40 Main Balls as Compact Perfect Circles) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-purple-300/70 gap-2">
            <span className="truncate">
              انتخاب {toPersianDigits(mainCount)} گوی اصلی (۱ تا {toPersianDigits(mainMax)}):
            </span>
            <span className="font-mono text-[#00f59b] whitespace-nowrap shrink-0" dir="ltr">
              {formatAmount(unitTicketPriceUsdt)} / بلیت
            </span>
          </div>

          <div
            data-testid="lobby-main-balls-grid"
            className="grid grid-cols-10 gap-1.5"
            dir="ltr"
          >
            {Array.from({ length: mainMax }, (_, i) => i + 1).map((n) => {
              const isPicked = heroBalls.includes(n);
              return (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  key={n}
                  type="button"
                  data-testid={`lobby-main-ball-${n}`}
                  onClick={() => toggleHeroGridNumber(n)}
                  className={`aspect-square rounded-full flex items-center justify-center text-[11px] font-mono font-bold tabular-nums transition-all cursor-pointer select-none ${
                    isPicked
                      ? 'lottery-ball-gold text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.65)] ring-1 ring-amber-200'
                      : 'bg-[#090612] hover:bg-purple-950/60 text-purple-200/85 border border-purple-500/25'
                  }`}
                >
                  {String(n).padStart(2, '0')}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Symmetrical 8-Column Golden Star Ball Grid (★1 to ★15 / ★10 / ★12) */}
        {goldenMax > 0 && (
          <div className="pt-2 border-t border-purple-500/15 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-purple-300/70">
              <span>انتخاب ۱ گوی طلایی شانس (۱ تا {toPersianDigits(goldenMax)}):</span>
              <span className="font-mono font-bold tabular-nums text-[#fbbf24]" dir="ltr">
                ★{heroStarBall} Selected
              </span>
            </div>
            <div
              data-testid="lobby-golden-balls-grid"
              className="grid grid-cols-8 gap-1.5"
              dir="ltr"
            >
              {Array.from({ length: goldenMax }, (_, i) => i + 1).map((g) => {
                const active = heroStarBall === g;
                return (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    key={g}
                    type="button"
                    data-testid={`lobby-golden-ball-${g}`}
                    onClick={() => {
                      HapticEngine.selectionChanged();
                      setHeroStarBall(g);
                      setSelectedGoldenBall(g);
                    }}
                    className={`aspect-square rounded-full flex items-center justify-center text-[11px] font-mono font-bold tabular-nums transition-all cursor-pointer select-none ${
                      active
                        ? 'lottery-ball-purple text-white border-2 border-[#fbbf24] shadow-[0_0_12px_rgba(168,85,247,0.65)]'
                        : 'bg-[#090612] hover:bg-purple-950/60 text-purple-300/70 border border-purple-500/25'
                    }`}
                  >
                    ★{g}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Full-Width Tactile Buy Ticket CTA */}
        <div className="pt-1 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid="hero-buy-ticket-btn"
            onClick={handleQuickInstantBuy}
            className="flex-1 h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-[#9333ea] to-[#7e22ce] text-white shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              🎟️ خرید بلیت ({bundleQty}x{bundleQty === 5 ? ' • ۵٪ تخفیف' : bundleQty === 10 ? ' • ۱۰٪ تخفیف' : ''})
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums" dir="ltr">
              {formatAmount(totalBuyCostUsdt)}
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid={`lobby-play-btn-${activeLotteryId}`}
            onClick={() => navigateTo('play')}
            aria-label="Open Advanced Ticket Terminal"
            className="h-12 px-3 rounded-xl bg-[#090612] border border-purple-500/25 text-xs font-semibold text-purple-200/80 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            ترمینال ↗
          </motion.button>
        </div>
      </section>

      {/* =====================================================================
          c) 3-TAB SEGMENTED SWITCHER:
          1) بلیت‌های من (My Tickets)
          2) قوانین و جدول جوایز (Rules & Prize Tiers)
          3) تاریخچه و اثبات عدالت (Past Draws & Provably Fair)
          ===================================================================== */}
      <section className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-3">
        <div className="grid grid-cols-3 gap-1 bg-[#070510] p-1 rounded-xl border border-purple-500/20">
          {(
            [
              {
                id: 'MY_TICKETS',
                testId: 'lottery-subtab-tickets',
                label: `🎟️ بلیت‌ها (${tickets.length})`,
              },
              {
                id: 'RULES_AND_TIERS',
                testId: 'lottery-subtab-rules',
                label: '📜 قوانین و جوایز',
              },
              {
                id: 'PAST_DRAWS',
                testId: 'lottery-subtab-fairness',
                label: `🛡️ تاریخچه (${drawHistory.length + jackpotWinners.length})`,
              },
            ] as const
          ).map((tab) => {
            const active = zoneCTab === tab.id;
            return (
              <motion.button
                whileTap={{ scale: 0.96 }}
                key={tab.id}
                type="button"
                data-testid={tab.testId}
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setZoneCTab(tab.id);
                }}
                className={`relative h-9 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-purple-300/60 hover:text-white'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="lobby-segmented-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-lg bg-purple-600/35 border border-purple-400/40 -z-10"
                  />
                )}
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Tab Content with AnimatePresence */}
        <AnimatePresence mode="wait">
          {zoneCTab === 'MY_TICKETS' && (
            <motion.div
              key="MY_TICKETS"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-2.5"
            >
              {tickets.slice(0, 4).map((t) => {
                const prize = parseFloat(t.prizeWonUsdt) || 0;
                const isWinner = prize > 0 || t.status.toUpperCase() === 'WON';
                let parsedNums: number[] = [7, 14, 23, 38, 49];
                try {
                  parsedNums = JSON.parse(t.mainNumbers);
                } catch {
                  // fallback
                }
                const fullTicketHash = (t.serverSeedHash || t.txHash || provablyFairSeeds.serverSeedHash).replace(
                  /^0x/,
                  ''
                );
                return (
                  <div
                    key={t.ticketCode}
                    className="rounded-xl bg-[#070510]/85 border border-purple-500/20 p-3 space-y-2"
                    dir="ltr"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#fbbf24] tabular-nums">
                            #{t.ticketCode}
                          </span>
                          <span className="text-[11px] font-medium text-purple-300/50 truncate">
                            {t.roundCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {parsedNums.map((num, idx) => (
                            <span
                              key={`${t.ticketCode}-${idx}`}
                              className="w-6 h-6 rounded-full lottery-ball-gold text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center tabular-nums"
                            >
                              {String(num).padStart(2, '0')}
                            </span>
                          ))}
                          {t.goldenBall > 0 && (
                            <span className="w-6 h-6 rounded-full lottery-ball-purple text-white font-mono font-bold text-[10px] flex items-center justify-center tabular-nums">
                              ★{t.goldenBall}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {isWinner ? (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#00f59b]/20 border border-[#00f59b]/50 text-[#00f59b] text-[11px] font-semibold tabular-nums">
                            +{formatAmount(prize)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-200/80 text-[11px] font-medium">
                            Active
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setViralCardTicket(t)}
                          className="text-[11px] font-medium text-purple-300/60 hover:text-white underline cursor-pointer"
                        >
                          Share Card ↗
                        </button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-purple-500/15 flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#fbbf24] shrink-0">
                        hash
                      </span>
                      <code className="text-[9.5px] font-mono text-purple-300/80 break-all select-all">
                        {fullTicketHash}
                      </code>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => navigateTo('terms')}
                  className="text-[11px] font-semibold text-purple-300/70 hover:text-white underline cursor-pointer"
                >
                  📜 مشاهده قوانین کامل و ضرایب
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => navigateTo('my-tickets')}
                  className="text-xs font-semibold text-[#fbbf24] hover:underline cursor-pointer"
                >
                  همه بلیت‌ها ({tickets.length}) ←
                </motion.button>
              </div>
            </motion.div>
          )}

          {zoneCTab === 'RULES_AND_TIERS' && (
            <motion.div
              key="RULES_AND_TIERS"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Prize Tiers Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>🏆 جدول ضرایب و رده‌های جوایز ({activeSpec.titleFa})</span>
                  <span className="text-[11px] font-mono text-[#00f59b]" dir="ltr">
                    85% RTP Pool
                  </span>
                </div>

                <div className="space-y-1.5">
                  {COMBINATORIAL_TIERS.map((tier, idx) => (
                    <div
                      key={tier.tier}
                      className="rounded-xl bg-[#070510]/90 border border-purple-500/20 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-purple-600/30 text-[#fbbf24] font-mono text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {tier.matchPattern}
                          </span>
                        </div>
                        <div className="text-[10px] text-purple-300/60 flex items-center gap-2">
                          <span>{tier.poolShare}</span>
                          <span>•</span>
                          <span className="font-mono" dir="ltr">
                            Odds: {tier.oddsText}
                          </span>
                        </div>
                      </div>

                      <div
                        className="text-xs font-mono font-extrabold text-[#00f59b] tabular-nums shrink-0"
                        dir="ltr"
                      >
                        {formatAmount(tier.estimatedPrizeUsdt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Waterfall & Fair Play Rules */}
              <div className="rounded-xl bg-[#070510]/90 border border-purple-500/20 p-3 space-y-2 text-xs">
                <div className="font-bold text-[#fbbf24]">
                  ⚖️ قوانین مالی و مکانیزم اثبات‌پذیری (Provably Fair HMAC-SHA256)
                </div>
                <ul className="space-y-1 text-[11px] text-purple-200/85 leading-relaxed list-disc list-inside">
                  <li>
                    <strong>۸۵٪ کل فروش بلیت‌ها</strong> مستقیماً در استخر جوایز همان دور قفل می‌شود.
                  </li>
                  <li>
                    <strong>۳٪ ذخیره Rollover</strong> به استخر دور بعد و صندوق وفاداری VIP منتقل می‌گردد و ۲٪ صرف گس شبکه می‌شود.
                  </li>
                  <li>
                    تخفیف خرید دسته‌ای: خرید <strong>5x بلیت شامل ۵٪ تخفیف</strong> و خرید{' '}
                    <strong>10x بلیت شامل ۱۰٪ تخفیف</strong> آنی است.
                  </li>
                  <li>
                    تمامی گوی‌های خروجی با فرمول رمزنگاری{' '}
                    <code className="font-mono text-[#00f59b]">HMAC_SHA256(serverSeed, clientSeed:nonce)</code>{' '}
                    استخراج شده و کد کامل <code className="font-mono text-[#fbbf24]">hash</code> قبل از قرعه‌کشی منتشر می‌شود.
                  </li>
                </ul>

                <div className="pt-2 border-t border-purple-500/15 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="lobby-open-full-rules-btn"
                    onClick={() => navigateTo('terms')}
                    className="h-9 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-400/40 text-[11px] font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>📜 قوانین و مقررات جامع</span>
                  </button>
                  <button
                    type="button"
                    data-testid="lobby-open-transparency-btn"
                    onClick={() => navigateTo('transparency')}
                    className="h-9 rounded-xl bg-[#090612] hover:bg-purple-950/70 border border-purple-500/30 text-[11px] font-bold text-[#00f59b] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🛡️ مرکز شفافیت و حسابرسی</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {zoneCTab === 'PAST_DRAWS' && (
            <motion.div
              key="PAST_DRAWS"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-2.5"
            >
              <div className="space-y-2" dir="ltr">
                {drawHistory.slice(0, 3).map((d) => (
                  <div
                    key={d.drawId}
                    onClick={() => navigateTo('transparency')}
                    className="p-2.5 rounded-xl bg-[#070510]/85 border border-purple-500/20 space-y-1.5 cursor-pointer hover:border-purple-400/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white tabular-nums">
                        {d.roundCode} (#{d.nonce})
                      </span>
                      <span className="font-mono font-bold text-[#00f59b] tabular-nums">
                        {formatAmount(d.totalPayoutUsdt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {d.drawnMain.map((b) => (
                        <span
                          key={b}
                          className="w-5 h-5 rounded-full lottery-ball-gold text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center"
                        >
                          {String(b).padStart(2, '0')}
                        </span>
                      ))}
                      {d.drawnGolden > 0 && (
                        <span className="w-5 h-5 rounded-full lottery-ball-purple text-white font-mono font-bold text-[10px] flex items-center justify-center">
                          ★{d.drawnGolden}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 pt-1 border-t border-purple-500/15">
                      <span className="text-[10px] font-mono font-bold text-[#fbbf24] shrink-0">
                        hash
                      </span>
                      <code className="text-[9.5px] font-mono text-purple-300/80 break-all select-all">
                        {d.serverSeedHash.replace(/^0x/, '')}
                      </code>
                    </div>
                  </div>
                ))}

                {jackpotWinners.slice(0, 2).map((w) => (
                  <div
                    key={w.txHash}
                    onClick={() => navigateTo('status')}
                    className="p-2.5 rounded-xl bg-[#070510]/85 border border-purple-500/20 space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{w.winnerName}</span>
                      <span className="font-mono font-bold text-[#00f59b] tabular-nums">
                        +{formatAmount(Number(w.amountUsdt))}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#fbbf24] shrink-0">
                        hash
                      </span>
                      <code className="text-[9.5px] font-mono text-purple-300/80 break-all select-all">
                        {w.txHash.replace(/^0x/, '')}
                      </code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Provably Fair Verifier Toggle */}
              <div className="pt-1 border-t border-purple-500/15 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowVerifier((prev) => !prev)}
                    className="text-[11px] font-semibold text-purple-200/80 hover:text-white underline cursor-pointer"
                  >
                    {showVerifier ? 'بستن ماشین‌حساب SHA-256' : '🔍 بازبینی هش قرعه‌کشی (SHA-256)'}
                  </button>
                  <button
                    type="button"
                    data-testid="verify-fairness-btn"
                    onClick={handleRunVerification}
                    className="px-2.5 py-1 rounded-lg bg-[#00f59b]/20 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-semibold cursor-pointer"
                  >
                    تست هش ✓
                  </button>
                </div>

                {showVerifier && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1" dir="ltr">
                    <input
                      type="text"
                      value={verifyServerSeed}
                      onChange={(e) => setVerifyServerSeed(e.target.value)}
                      className="h-8 rounded-lg bg-[#070510] border border-purple-500/25 px-2 text-[10px] font-mono text-white"
                      placeholder="Server Seed"
                    />
                    <input
                      type="text"
                      value={verifyClientSeed}
                      onChange={(e) => setVerifyClientSeed(e.target.value)}
                      className="h-8 rounded-lg bg-[#070510] border border-purple-500/25 px-2 text-[10px] font-mono text-[#00f59b]"
                      placeholder="Client Seed"
                    />
                    <input
                      type="number"
                      value={verifyRoundNum}
                      onChange={(e) => setVerifyRoundNum(Number(e.target.value) || 482)}
                      className="h-8 rounded-lg bg-[#070510] border border-purple-500/25 px-2 text-[10px] font-mono text-[#fbbf24] tabular-nums"
                      placeholder="Round"
                    />
                  </div>
                )}

                {verifiedResult && (
                  <div
                    className="rounded-xl bg-[#070510] border border-[#00f59b]/35 p-2.5 text-[10px] font-mono text-[#00f59b] space-y-1"
                    dir="ltr"
                  >
                    <div>
                      Balls: {verifiedResult.mainBalls.join(', ')} + ★{verifiedResult.goldenBall}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-[#fbbf24] shrink-0">hash</span>
                      <code className="text-purple-200 break-all select-all">
                        {verifiedResult.hash.replace(/^0x/, '')}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
