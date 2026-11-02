import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Gamepad2,
  Gift,
  Lock,
  Target,
  Ticket,
  Trophy,
  UserCheck,
  HelpCircle,
  FileText,
  Headset,
  Crown,
  Flame,
  Radio,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { generateBulkQuickPickSlips, formatCountdownHMS } from '../utils/lotteryEngine';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import { tr } from '../utils/i18n';

export const LobbyView: React.FC = () => {
  const {
    lang,
    navigateTo,
    rounds,
    activeRoundCode,
    setActiveRoundCode,
    activeLotterySpec,
    lotteryTimers,
    activeTmaCurrency,
    tonUsdRate,
    starsUsdRate,
    formatActiveTmaAmount,
    mintBulkTickets,
    tickets,
    drawHistory,
    openLatestDrawCeremony,
    setViralCardTicket,
    officialBrandTitle,
    setAiChatOpen,
    unreadSupportCount,
    monthlySuperJackpot,
    monthlyVipQualification,
    liveTickerEvent,
    poolPulseKey,
    sseConnected,
  } = useLottery();

  const [buyingQty, setBuyingQty] = useState<number | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [pulseHighlight, setPulseHighlight] = useState<boolean>(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (poolPulseKey > 0) {
      setPulseHighlight(true);
      const timer = setTimeout(() => setPulseHighlight(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [poolPulseKey]);

  const activeRoundObj =
    rounds.find((r) => r.roundCode === activeRoundCode) || rounds[0] || null;

  const latestCompletedDraw =
    drawHistory.find((d) => d.roundCode === activeLotterySpec.roundCode) ||
    drawHistory[0] ||
    null;

  const latestWinningMain: number[] =
    latestCompletedDraw?.drawnMain && latestCompletedDraw.drawnMain.length > 0
      ? latestCompletedDraw.drawnMain
      : Array.isArray(activeLotterySpec.winningNumbers) &&
        activeLotterySpec.winningNumbers.length > 0
      ? activeLotterySpec.winningNumbers
      : [7, 14, 23, 38, 49];

  const latestWinningGolden: number =
    typeof latestCompletedDraw?.drawnGolden === 'number'
      ? latestCompletedDraw.drawnGolden
      : typeof activeLotterySpec.winningGoldenBall === 'number'
      ? activeLotterySpec.winningGoldenBall
      : 8;

  const cleanTitleFa = (raw: string) =>
    String(raw || '')
      .replace(/\s*\([^)]*۸۵٪[^)]*\)/g, '')
      .replace(/\s*\([^)]*85%[^)]*\)/g, '')
      .trim();

  const remainingSec = activeRoundObj?.drawTargetTimestampMs
    ? Math.max(0, Math.floor((activeRoundObj.drawTargetTimestampMs - nowMs) / 1000))
    : lotteryTimers[activeLotterySpec.id] || 3600;

  const countdown = formatCountdownHMS(remainingSec);
  const unitPriceUsdt = activeLotterySpec.ticketPriceUsdt;

  // 30-Day Monthly VIP Super-Jackpot Countdown calculation
  const monthlyRemainingSec = Math.max(
    0,
    Math.floor(((monthlySuperJackpot?.nextMonthlyDrawTimestampMs || nowMs) - nowMs) / 1000)
  );
  const monthlyDays = String(Math.floor(monthlyRemainingSec / 86400)).padStart(2, '0');
  const monthlyHours = String(Math.floor((monthlyRemainingSec % 86400) / 3600)).padStart(2, '0');
  const monthlyMinutes = String(Math.floor((monthlyRemainingSec % 3600) / 60)).padStart(2, '0');
  const monthlySeconds = String(monthlyRemainingSec % 60).padStart(2, '0');
  const lastRolloverItem = monthlySuperJackpot?.rolloverHistory?.[0] || null;

  const handleQuickBuy = async (qty: number) => {
    HapticEngine.impactOccurred('medium');
    setBuyingQty(qty);
    setPurchaseToast(null);

    const slips = generateBulkQuickPickSlips(
      qty,
      activeLotterySpec.mainCount,
      activeLotterySpec.mainMax,
      activeLotterySpec.goldenMax,
      `tma_qp_${Date.now()}`
    );
    const totalCostUsdt = Number((qty * unitPriceUsdt).toFixed(2));
    const unitPriceTon = Number((unitPriceUsdt / (tonUsdRate || 5)).toFixed(2));
    const unitPriceStars = Math.max(1, Math.round(unitPriceUsdt / (starsUsdRate || 0.02)));
    const exactCostTon = Number((qty * unitPriceTon).toFixed(2));
    const exactCostStars = Math.round(qty * unitPriceStars);

    const res = await mintBulkTickets(
      slips,
      activeLotterySpec.roundCode,
      totalCostUsdt,
      activeTmaCurrency === 'STARS' ? 'Telegram Stars' : 'TON Network',
      {
        currency: activeTmaCurrency,
        amountTon: exactCostTon,
        amountStars: exactCostStars,
      }
    );

    setBuyingQty(null);
    if (res.ok && res.tickets && res.tickets.length > 0) {
      HapticEngine.notificationOccurred('success');
      setPurchaseToast(
        tr(
          lang,
          `🎉 ${qty} بلیت در دور ${activeLotterySpec.roundCode} با موفقیت صادر شد!`,
          `🎉 ${qty} ticket(s) minted in round ${activeLotterySpec.roundCode}!`
        )
      );
      setTimeout(() => setPurchaseToast(null), 4000);
    } else if (res.error) {
      HapticEngine.notificationOccurred('error');
      setPurchaseToast(`⚠️ ${res.error}`);
      setTimeout(() => setPurchaseToast(null), 4000);
    }
  };

  const myActiveTicketsInRound = tickets.filter(
    (t) => t.roundCode === activeLotterySpec.roundCode
  );
  const myVipSuperTickets = tickets.filter((t) => t.roundCode === '#LD-MONTHLY-VIP');

  return (
    <main className="w-full px-3 pt-3 pb-6 space-y-3.5 select-none">
      {/* LIVE REAL-TIME SSE TICKER FEED (When any player mints a ticket) */}
      {liveTickerEvent && (
        <div
          data-testid="live-sse-ticker-banner"
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-[#00F5D4]/15 via-[#171130] to-[#FFE066]/15 border border-[#00F5D4]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-[11px] transition-all"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className="w-3.5 h-3.5 text-[#00F5D4] animate-pulse shrink-0" />
            <span className="text-slate-200 font-bold truncate">
              {tr(
                lang,
                `⚡ ${liveTickerEvent.buyerDisplayName} همین الان ${liveTickerEvent.ticketCount} بلیت در ${liveTickerEvent.roundCode} خرید!`,
                `⚡ ${liveTickerEvent.buyerDisplayName} just bought ${liveTickerEvent.ticketCount} slip(s) in ${liveTickerEvent.roundCode}!`
              )}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-black text-[#FFE066]" dir="ltr">
            {liveTickerEvent.newJackpotTon.toFixed(2)} TON
          </span>
        </div>
      )}

      {/* 1. COMPACT ROUND SELECTOR PILLS */}
      {rounds.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {rounds.map((r) => {
            const isSelected = r.roundCode === activeLotterySpec.roundCode;
            return (
              <button
                key={r.roundCode}
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setActiveRoundCode(r.roundCode);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0098EA]/25 to-[#FFD700]/20 border-[#FFD700]/60 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_10px_20px_rgba(0,0,0,0.5)]'
                    : 'bg-[#110C22]/85 border-white/10 text-slate-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),_0_6px_14px_rgba(0,0,0,0.45)] hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4] animate-pulse" />
                <span>
                  {lang === 'EN' ? r.titleEn || cleanTitleFa(r.titleFa) : cleanTitleFa(r.titleFa)}
                </span>
                <span className="font-mono text-[10px] text-[#FFE066]">
                  {r.roundCode}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. HERO GRAND JACKPOT CARD WITH 3D VISUALS & BESPOKE OBSIDIAN GLASS */}
      <section className="relative overflow-hidden rounded-3xl p-4 luckydrop-obsidian-glass luckydrop-specular-gold luckydrop-microgrid-watermark shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_14px_28px_rgba(0,0,0,0.6)]">
        <img
          src="/assets/3d/hero-jackpot-3d.png"
          alt="3D TON Jackpot"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-[#0098EA]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badge Row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F5D4]/12 border border-[#00F5D4]/35 text-[#00F5D4] text-[10px] font-black">
            <LuckyDropLogo size={16} />
            <span>
              {tr(
                lang,
                'استخر جوایز بزرگ • تسویه ۱۰۰٪ خودکار و آنی',
                'Grand Jackpot Pool • 100% Instant Auto Payout'
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              title={sseConnected ? 'Real-Time SSE Stream Active' : 'Auto-Sync Active'}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[9px] font-mono font-bold text-emerald-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
              {activeLotterySpec.roundCode}
            </span>
          </div>
        </div>

        {/* Round Title & Live Pool Amount */}
        <div className="relative z-10 text-center my-3">
          <div className="text-xs font-bold text-slate-300 mb-1">
            {lang === 'EN'
              ? activeRoundObj?.titleEn ||
                activeLotterySpec.titleEn ||
                cleanTitleFa(activeLotterySpec.titleFa)
              : cleanTitleFa(activeLotterySpec.titleFa)}
          </div>
          <div
            data-testid="hero-live-jackpot-amount"
            className={`text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-[#FFF6D6] via-[#FFE066] to-[#00F5D4] bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,215,0,0.3)] transition-transform duration-300 ${
              pulseHighlight ? 'scale-105 brightness-125' : 'scale-100'
            }`}
            dir="ltr"
          >
            {formatActiveTmaAmount(activeLotterySpec.jackpotUsdt)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tr(lang, 'قیمت هر بلیت:', 'Ticket Price:')}{' '}
            <span className="font-mono font-bold text-white" dir="ltr">
              {formatActiveTmaAmount(unitPriceUsdt)}
            </span>{' '}
            •{' '}
            {tr(
              lang,
              `${activeLotterySpec.mainCount} گوی از ${activeLotterySpec.mainMax}`,
              `${activeLotterySpec.mainCount}/${activeLotterySpec.mainMax} Balls`
            )}
            {typeof activeRoundObj?.ticketsSoldCount === 'number' &&
              activeRoundObj.ticketsSoldCount > 0 && (
                <span className="ml-1.5 text-[#FFE066] font-mono font-bold">
                  • 🎟️ {activeRoundObj.ticketsSoldCount}
                </span>
              )}
          </div>
        </div>

        {/* Live Countdown Boxes */}
        <div className="relative z-10 flex items-center justify-between bg-[#090614]/90 border border-white/10 rounded-2xl p-2.5 mb-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_8px_16px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Clock className="w-4 h-4 text-[#FFE066]" />
            <span>{tr(lang, 'قرعه‌کشی خودکار راس تایم:', 'Auto Draw In:')}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs font-black" dir="ltr">
            <span className="px-2 py-1 rounded-xl bg-white/10 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
              {countdown.hours}h
            </span>
            <span className="text-[#FFE066]">:</span>
            <span className="px-2 py-1 rounded-xl bg-white/10 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
              {countdown.minutes}m
            </span>
            <span className="text-[#FFE066]">:</span>
            <span className="px-2 py-1 rounded-xl bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]">
              {countdown.seconds}s
            </span>
          </div>
        </div>

        {/* 1-TAP QUICK PICK BUTTONS */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
            <span className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#FFE066]" />
              {tr(lang, 'خرید سریع ۱-کلیکی (انتخاب تصادفی هوشمند):', '1-Tap Quick Pick (Auto Numbers):')}
            </span>
            <span className="font-mono text-[10px] text-[#00F5D4]">Provably Fair</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10].map((qty) => {
              const costUsdt = qty * unitPriceUsdt;
              const isBusy = buyingQty === qty;
              return (
                <button
                  key={qty}
                  disabled={buyingQty !== null}
                  onClick={() => handleQuickBuy(qty)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border font-bold transition-all cursor-pointer active:scale-95 ${
                    qty === 5
                      ? 'bg-gradient-to-b from-[#FFE066] to-[#B8860B] text-slate-950 border-[#FFE066] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_10px_20px_rgba(0,0,0,0.5)]'
                      : 'bg-[#171130] hover:bg-[#1E163D] text-white border-white/15 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  <span className="text-xs font-black">
                    {isBusy
                      ? tr(lang, 'در حال صدور...', 'Minting...')
                      : tr(lang, `🎟️ ${qty} بلیت`, `🎟️ ${qty} Slip${qty > 1 ? 's' : ''}`)}
                  </span>
                  <span
                    className={`text-[10px] font-mono mt-0.5 ${
                      qty === 5 ? 'text-slate-900 font-black' : 'text-[#00F5D4]'
                    }`}
                    dir="ltr"
                  >
                    {formatActiveTmaAmount(costUsdt)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* PROMINENT CUSTOM BALL PICKER & MY TICKETS BUTTONS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                HapticEngine.selectionChanged();
                navigateTo('play');
              }}
              data-testid="custom-pick-btn"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#00F5D4]/15 hover:bg-[#00F5D4]/25 border border-[#00F5D4]/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-[#00F5D4] text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Target className="w-4 h-4 shrink-0" />
              <span>{tr(lang, '🎯 انتخاب دستی شماره‌ها', '🎯 Custom Pick')}</span>
            </button>

            <button
              onClick={() => {
                HapticEngine.selectionChanged();
                navigateTo('my-tickets');
              }}
              data-testid="lobby-my-tickets-btn"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-slate-100 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Ticket className="w-4 h-4 text-[#FFE066] shrink-0" />
              <span>
                {tr(
                  lang,
                  `🎟️ بلیت‌های من (${tickets.length})`,
                  `🎟️ My Tickets (${tickets.length})`
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Purchase Feedback Toast */}
        {purchaseToast && (
          <div className="relative z-10 mt-3 p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)] text-emerald-200 text-xs font-bold text-center">
            {purchaseToast}
          </div>
        )}
      </section>

      {/* 2.25 MONTHLY VIP LOYALTY SUPER-JACKPOT ROLLOVER VAULT CARD */}
      <section
        data-testid="monthly-super-jackpot-vault-card"
        className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#19112E] via-[#0E091C] to-[#1E1409] border border-[#FFE066]/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_28px_rgba(0,0,0,0.55)] space-y-3"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FFE066]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 flex items-center justify-center shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),_0_6px_14px_rgba(255,215,0,0.4)] shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-[#FFE066] truncate">
                {tr(
                  lang,
                  '👑 ابر جک‌پات ماهانه وفاداری (Monthly VIP Super-Jackpot Vault)',
                  '👑 Monthly VIP Super-Jackpot Rollover Vault'
                )}
              </h2>
              <p className="text-[10px] text-slate-300 truncate">
                {tr(
                  lang,
                  'سرریز خودکار جوایز برنده‌نشده تمام دورها • ویژه کاربران وفادار VIP',
                  '100% Unclaimed Prize Rollover Vault • Exclusive to Loyal VIP Players'
                )}
              </p>
            </div>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#FFE066]/15 border border-[#FFE066]/40 text-[#FFE066]">
            {monthlySuperJackpot.roundId || '#LD-MONTHLY-VIP'}
          </span>
        </div>

        {/* Live Accumulated Rollover Pool & 30-Day Timer */}
        <div className="grid grid-cols-2 gap-2.5 bg-[#080511]/90 border border-[#FFE066]/25 rounded-2xl p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_8px_16px_rgba(0,0,0,0.45)]">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">
              {tr(lang, 'موجودی انباشته خزانه سرریز:', 'Accumulated Rollover Pool:')}
            </div>
            <div
              data-testid="monthly-super-pot-ton"
              className={`font-mono text-xl font-black text-[#FFE066] mt-0.5 transition-transform duration-300 ${
                pulseHighlight ? 'scale-105 text-white' : ''
              }`}
              dir="ltr"
            >
              💎 {(monthlySuperJackpot.accumulatedPoolTon || 0).toFixed(2)} TON
            </div>
            <div className="font-mono text-[10px] text-[#00F5D4]" dir="ltr">
              ≈ {(monthlySuperJackpot.accumulatedPoolStars || 0).toLocaleString('en-US')} ⭐ Stars
            </div>
          </div>

          <div className="flex flex-col justify-between items-end">
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#FFE066]" />
              <span>{tr(lang, 'شمارش معکوس ۳۰ روزه:', '30-Day Vault Draw:')}</span>
            </div>
            <div
              data-testid="monthly-super-pot-countdown"
              className="flex items-center gap-1 font-mono text-[11px] font-black mt-1"
              dir="ltr"
            >
              <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-[#FFE066] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                {monthlyDays}d
              </span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">{monthlyHours}h</span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                {monthlyMinutes}m
              </span>
              <span>:</span>
              <span className="px-1.5 py-0.5 rounded-lg bg-[#00F5D4]/20 text-[#00F5D4] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]">
                {monthlySeconds}s
              </span>
            </div>
            <div className="text-[9px] text-amber-300/90 mt-1">
              {tr(
                lang,
                '♾️ قانون انتقال بی‌نهایت به ماه بعد در صورت عدم برنده',
                '♾️ Infinite Rollover if unclaimed'
              )}
            </div>
          </div>
        </div>

        {/* Last Rollover Contribution Banner */}
        {lastRolloverItem && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-400/25 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)] text-[10px]">
            <span className="text-amber-200 font-bold truncate">
              {tr(
                lang,
                `🔥 آخرین سرریز انتقالی از دور ${lastRolloverItem.sourceRoundCode}:`,
                `🔥 Last Rollover from ${lastRolloverItem.sourceRoundCode}:`
              )}
            </span>
            <span className="font-mono font-black text-[#FFE066] shrink-0" dir="ltr">
              +{Number(lastRolloverItem.rolloverTon || 0).toFixed(2)} TON ({lastRolloverItem.timestamp})
            </span>
          </div>
        )}

        {/* User VIP Qualification Progress Bar & Earned VIP Super-Tickets */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-200 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#FFE066]" />
              {tr(lang, 'وضعیت صلاحیت VIP شما:', 'Your VIP Qualification:')}
            </span>
            <span
              data-testid="monthly-vip-qualification-badge"
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                monthlyVipQualification.isQualified
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/15 border border-amber-400/35 text-amber-300'
              }`}
            >
              {monthlyVipQualification.isQualified
                ? tr(lang, '✅ واجد شرایط قرعه‌کشی ماهانه VIP', '✅ Qualified for Monthly VIP Pot')
                : tr(
                    lang,
                    `در حال تکمیل (${monthlyVipQualification.overallProgressPercent}%)`,
                    `In Progress (${monthlyVipQualification.overallProgressPercent}%)`
                  )}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFE066] via-[#00F5D4] to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(6, monthlyVipQualification.overallProgressPercent)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
            <div className="p-2 rounded-2xl bg-white/[0.04] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)] text-center">
              <div className="text-slate-400">{tr(lang, 'بلیت‌های خریداری‌شده', 'Tickets Bought')}</div>
              <div className="font-mono font-black text-white mt-0.5" dir="ltr">
                {monthlyVipQualification.regularTicketsBoughtCount} /{' '}
                {monthlyVipQualification.minTicketsRequired}
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-white/[0.04] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)] text-center">
              <div className="text-slate-400">{tr(lang, 'امتیاز وفاداری XP', 'Loyalty XP')}</div>
              <div className="font-mono font-black text-[#00F5D4] mt-0.5" dir="ltr">
                {monthlyVipQualification.userXp} / {monthlyVipQualification.minXpRequired} XP
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-[#FFE066]/10 border border-[#FFE066]/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_6px_14px_rgba(0,0,0,0.4)] text-center">
              <div className="text-amber-200">{tr(lang, 'بلیت سوپر VIP شما', 'VIP Super-Slips')}</div>
              <div
                data-testid="monthly-vip-super-tickets-count"
                className="font-mono font-black text-[#FFE066] mt-0.5"
                dir="ltr"
              >
                👑 {Math.max(myVipSuperTickets.length, monthlyVipQualification.vipSuperTicketsEarnedTotal)}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-0.5">
            {tr(
              lang,
              `🎁 به ازای هر ۵ بلیت عادی، ۱ بلیت رایگان ابر جک‌پات ماهانه VIP صادر می‌شود (${monthlyVipQualification.ticketsUntilNextVipTicket} بلیت تا کوپن VIP بعدی)`,
              `🎁 Earn 1 Free Monthly VIP Super-Ticket for every 5 regular slips (${monthlyVipQualification.ticketsUntilNextVipTicket} more until next VIP slip)`
            )}
          </div>
        </div>
      </section>

      {/* 2.5 LATEST COMPLETED DRAW & CINEMATIC CEREMONY REPLAY CARD */}
      <section
        data-testid="latest-completed-draw-card"
        className="rounded-3xl p-3.5 luckydrop-obsidian-glass luckydrop-specular-gold flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFE066] shrink-0" />
              <span className="text-xs font-black text-white truncate">
                {tr(
                  lang,
                  `آخرین شماره‌های برنده (${
                    latestCompletedDraw?.roundCode || activeLotterySpec.roundCode
                  })`,
                  `Latest Completed Draw (${
                    latestCompletedDraw?.roundCode || activeLotterySpec.roundCode
                  })`
                )}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {tr(
                lang,
                'قابل راستی‌آزمایی با الگوریتم Provably Fair • تسویه آنی برندگان',
                'Verified Provably Fair (SHA-256) • Instant Auto Payout'
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="lobby-watch-draw-btn"
            onClick={() => openLatestDrawCeremony(latestCompletedDraw)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-[11px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_8px_16px_rgba(0,0,0,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <span>
              {tr(
                lang,
                '🎬 مشاهده مراسم قرعه‌کشی',
                '🎬 Watch Draw'
              )}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <div className="flex items-center gap-1.5" dir="ltr">
            {latestWinningMain.map((num, idx) => (
              <span
                key={idx}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFF9DB] via-[#FFE066] to-[#B8860B] text-slate-950 font-mono text-[11px] font-black flex items-center justify-center shadow-[inset_0_2px_3px_rgba(255,255,255,0.7),_0_6px_12px_rgba(0,0,0,0.45)]"
              >
                {String(num).padStart(2, '0')}
              </span>
            ))}
            {latestWinningGolden > 0 && (
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00f59b] to-[#00A86B] text-slate-950 font-mono text-[11px] font-black flex items-center justify-center ring-1 ring-[#FFE066] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),_0_6px_12px_rgba(0,0,0,0.45)]">
                ★{latestWinningGolden}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#00f59b] font-bold">
            ✓ SHA-256 Verified
          </span>
        </div>
      </section>

      {/* 3. QUICK LAUNCHER FOR INSTANT GAMES & EARN QUESTS */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('mini-games');
          }}
          className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-3xl bg-gradient-to-br from-[#121D38] to-[#0B1022] border border-[#00F5D4]/30 hover:border-[#00F5D4]/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/plinko-3d.png"
            alt="Plinko & Crash 3D"
            className="w-11 h-11 rounded-2xl object-cover border border-[#00F5D4]/40 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, '۹ بازی آنی کازینو', '9 Instant Games')}
            </div>
            <div className="text-[10px] text-[#00F5D4] font-mono mt-0.5 truncate">
              Plinko • Crash • Mines
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('earn');
          }}
          className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-3xl bg-gradient-to-br from-[#1A1530] to-[#0E0A1C] border border-[#FFD700]/30 hover:border-[#FFD700]/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/ton-chest-3d.png"
            alt="TON Chest 3D"
            className="w-11 h-11 rounded-2xl object-cover border border-[#FFD700]/40 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, 'ماموریت و دعوت', 'Quests & Invite')}
            </div>
            <div className="text-[10px] text-[#FFE066] font-mono mt-0.5 truncate">
              {tr(lang, '+۱۰٪ کمیسیون آنی', '+10% Referral')}
            </div>
          </div>
        </button>
      </div>

      {/* 4. USER'S ACTIVE TICKETS IN THIS ROUND */}
      <section className="rounded-3xl p-3.5 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),_0_10px_20px_rgba(0,0,0,0.5)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-xs font-black text-white">
              {tr(
                lang,
                `بلیت‌های من در این دور (${myActiveTicketsInRound.length})`,
                `My Tickets in This Round (${myActiveTicketsInRound.length})`
              )}
            </h2>
          </div>
          <button
            onClick={() => navigateTo('my-tickets')}
            className="text-[10px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
          >
            {tr(lang, 'مشاهده همه ←', 'View All →')}
          </button>
        </div>

        {myActiveTicketsInRound.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            {tr(
              lang,
              'هنوز بلیتی در این دور ندارید. با دکمه‌های بالا در ۱ ثانیه بلیت خود را صادر کنید.',
              'No tickets in this round yet. Use Quick Pick or Custom Pick above to mint your slip.'
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
            {myActiveTicketsInRound.slice(0, 5).map((t) => {
              let mainNums: number[] = [];
              try {
                mainNums = JSON.parse(t.mainNumbers);
              } catch {
                mainNums = [7, 14, 21, 33, 49];
              }
              return (
                <div
                  key={t.ticketCode}
                  onClick={() => setViralCardTicket(t)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[#FFE066]/25 shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),_0_8px_16px_rgba(0,0,0,0.45)] luckydrop-holographic-shimmer cursor-pointer transition-all"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-[#FFE066]">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          t.status === 'WON'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-[#0098EA]/20 text-[#38BDF8]'
                        }`}
                      >
                        {t.status === 'WON'
                          ? tr(lang, 'برنده!', 'WON!')
                          : tr(lang, 'فعال', 'ACTIVE')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {tr(lang, 'ضربه برای اشتراک‌گذاری کارت بلیت', 'Tap to share viral ticket card')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" dir="ltr">
                    {mainNums.map((num, idx) => (
                      <span
                        key={idx}
                        className="w-6 h-6 rounded-xl bg-white/10 border border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center font-mono text-[10px] font-bold text-white"
                      >
                        {num}
                      </span>
                    ))}
                    <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center font-mono text-[10px] font-black">
                      {t.goldenBall}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. SECONDARY VIEWS QUICK ACCESS GRID (VIP PROFILE, WINNERS, HOW IT WORKS, FAIRNESS, RULES) */}
      <section className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigateTo('user-panel')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="truncate">
            {tr(lang, 'پروفایل VIP و صندوقچه', 'VIP Profile & Chest')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('winners')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <Trophy className="w-4 h-4 text-[#FFE066] shrink-0" />
          <span className="truncate">
            {tr(lang, 'تالار برندگان و نتایج', 'Winners & Results')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('how-it-works')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <span className="truncate">
            {tr(lang, 'راهنمای کامل بازی', 'How It Works')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('terms')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">
            {tr(lang, 'قوانین و مقررات', 'Terms & Rules')}
          </span>
        </button>
      </section>

      {/* 6. PROVABLY FAIR SEED BADGE & PROPRIETARY BRAND SIGNATURE FOOTER */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-3xl luckydrop-obsidian-glass luckydrop-specular-purple text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
            <span className="truncate font-mono" dir="ltr">
              SHA256: {activeLotterySpec.serverSeedHash.slice(0, 18)}...
            </span>
          </div>
          <button
            onClick={() => navigateTo('transparency')}
            className="shrink-0 flex items-center gap-1 text-[#00F5D4] font-bold hover:underline cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{tr(lang, 'اثبات عدالت', 'Verify RNG')}</span>
          </button>
        </div>

        <div
          data-testid="lobby-official-brand-signature"
          className="p-3 rounded-3xl luckydrop-obsidian-glass luckydrop-specular-gold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <LuckyDropLogo size={24} />
            <div className="min-w-0">
              <div className="text-[10px] font-black text-[#FFE066] truncate">
                {officialBrandTitle}
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate">
                {tr(
                  lang,
                  'پروتکل اختصاصی Web3 با تسویه آنی TON و پشتیبانی ۲۴/۷',
                  'Proprietary Web3 Protocol • Instant TON Settlement & 24/7 VIP Concierge'
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              HapticEngine.selectionChanged();
              setAiChatOpen(true);
            }}
            className="shrink-0 relative flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-[#FFE066]/15 hover:bg-[#FFE066]/25 border border-[#FFE066]/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.45)] text-[#FFE066] text-[10px] font-black cursor-pointer"
          >
            <Headset className="w-3.5 h-3.5" />
            <span>{tr(lang, 'پشتیبانی VIP', 'VIP Support')}</span>
            {unreadSupportCount > 0 && (
              <span className="ml-0.5 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black">
                {unreadSupportCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </main>
  );
};
