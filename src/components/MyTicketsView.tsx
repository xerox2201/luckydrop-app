import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  MULTI_LOTTERY_SPECS,
  evaluateTicketWinTier,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';
import { LiquidNavbar, NimbusIcons } from '@/components/ui/liquid-glass-navbar';

export const MyTicketsView: React.FC = () => {
  const {
    tickets,
    rounds,
    claimedTicketCodes,
    claimTicketPrize,
    formatAmount,
    navigateTo,
    setActiveTrackingTicket,
    setViralCardTicket,
  } = useLottery();

  const [filterRound, setFilterRound] = useState<string>('ALL');
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [claimBanner, setClaimBanner] = useState<string | null>(null);

  const parseMainNumbers = (raw: string): number[] => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      // Fallback comma-separated
    }
    return String(raw)
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n));
  };

  const getRoundInfo = (roundCode: string) => {
    const foundRound = rounds.find((r) => r.roundCode === roundCode);
    const spec = MULTI_LOTTERY_SPECS.find((s) => s.roundCode === roundCode) || MULTI_LOTTERY_SPECS[0];
    const winningMain = foundRound
      ? parseMainNumbers(foundRound.winningNumbers)
      : spec.winningNumbers;
    const winningGolden = foundRound ? foundRound.winningGoldenBall : spec.winningGoldenBall;
    const jackpotUsdt = foundRound ? parseFloat(foundRound.jackpotUsdt) : spec.jackpotUsdt;
    return {
      titleFa: foundRound?.titleFa || spec.titleFa,
      winningMain: winningMain.length > 0 ? winningMain : spec.winningNumbers,
      winningGolden,
      jackpotUsdt,
    };
  };

  const filteredTickets = tickets.filter((t) =>
    filterRound === 'ALL' ? true : t.roundCode === filterRound
  );

  const handleClaimPrize = async (ticketCode: string, prizeUsdt: number, network: string) => {
    setClaimingCode(ticketCode);
    const ok = await claimTicketPrize(ticketCode, prizeUsdt, network);
    setClaimingCode(null);
    if (ok) {
      setClaimBanner(
        `جایزه بلیت ${ticketCode} به مبلغ ${formatAmount(
          prizeUsdt
        )} به صورت آنی به موجودی کیف پول شما اضافه شد!`
      );
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8 overflow-x-clip">
      {/* Header Banner — Nimbus Liquid Glass */}
      <div className="relative rounded-3xl overflow-hidden nimbus-wallet-header p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <img
          src={LUXURY_IMAGES.playTicketsBanner}
          alt="My VIP Tickets"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1322]/90 via-[#101c32]/82 to-[#161a36]/88 pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <img
            src={LUXURY_IMAGES.trophyIcon3d}
            alt="Trophy"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/75 shadow-xl shrink-0"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">Style</span>
              <span>دفترکل بلیت‌های من و مرکز دریافت آنی جوایز • My Tickets &amp; Claim Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              بلیت‌های من و استعلام هوشمند رده برد (/my-tickets)
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
              تمامی کوپن‌های ثبت‌شده شما به تفکیک دور قرعه‌کشی، مجهز به تطبیق‌دهنده خودکار اعداد برنده و دکمه دریافت ۱-کلیکی جوایز در کیف پول.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="gold-gradient-cta text-[#2a1700] font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>خرید بلیت جدید (تکی یا دسته‌ای)</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('withdraw')}
            className="px-5 py-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-black text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span>برداشت آنی جوایز</span>
          </button>
        </div>
      </div>

      {claimBanner && (
        <div
          data-testid="claim-success-banner"
          className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-bold text-sm flex items-center justify-between gap-4"
        >
          <span>🎉 {claimBanner}</span>
          <button
            type="button"
            onClick={() => setClaimBanner(null)}
            className="text-xs text-emerald-300 underline"
          >
            بستن
          </button>
        </div>
      )}

      {/* Filter Tabs by Concurrent Lottery Round — Nimbus LiquidNavbar */}
      <div className="overflow-x-auto no-scrollbar max-w-full" dir="ltr">
        <LiquidNavbar
          aria-label="فیلتر دورهای قرعه‌کشی"
          tone="dark"
          size="md"
          compact={false}
          sound={true}
          value={filterRound}
          onValueChange={(id) => setFilterRound(id)}
          items={[
            {
              id: 'ALL',
              label: `همه دورها (${toPersianDigits(tickets.length)})`,
              fx: 'glow',
              icon: NimbusIcons.spark,
            },
            ...MULTI_LOTTERY_SPECS.map((spec, idx) => ({
              id: spec.roundCode,
              label: `${spec.titleFa.split('(')[0].trim()} (${spec.roundCode})`,
              fx: (['drop', 'spin', 'wave', 'pop'] as const)[idx % 4],
              icon: NimbusIcons.droplet,
            })),
          ]}
        />
      </div>

      {/* Tickets List — Nimbus Liquid Glass Ticket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="my-tickets-grid">
        {filteredTickets.map((ticket) => {
          const mainArr = parseMainNumbers(ticket.mainNumbers);
          const roundInfo = getRoundInfo(ticket.roundCode);
          const winEval = evaluateTicketWinTier(
            mainArr,
            ticket.goldenBall,
            roundInfo.winningMain,
            roundInfo.winningGolden,
            roundInfo.jackpotUsdt
          );
          const isClaimed =
            Boolean(ticket.claimed) || claimedTicketCodes.includes(ticket.ticketCode);
          const effectivePrize =
            winEval.prizeUsdt > 0
              ? winEval.prizeUsdt
              : parseFloat(ticket.prizeWonUsdt || '0');
          const hasPrize = effectivePrize > 0;

          return (
            <div
              key={ticket.ticketCode}
              data-testid={`my-ticket-card-${ticket.ticketCode}`}
              className={`nimbus-ticket-card rounded-3xl p-6 space-y-4 ${
                hasPrize
                  ? 'ring-2 ring-emerald-400/60 shadow-[0_15px_40px_rgba(16,185,129,0.22)]'
                  : ''
              }`}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="text-xs font-black text-white block">{roundInfo.titleFa}</span>
                  <span className="text-[11px] font-mono text-amber-400 block">
                    کد کوپن: {ticket.ticketCode} • دور {ticket.roundCode}
                  </span>
                  {ticket.transactionUuid && (
                    <span className="text-[10px] font-mono text-slate-400 block" dir="ltr">
                      PAM TX: {ticket.transactionUuid}
                    </span>
                  )}
                </div>
                <span
                  data-testid={`ticket-status-badge-${ticket.ticketCode}`}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border ${
                    ticket.status.toUpperCase() === 'WON' || hasPrize
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : ticket.status.toUpperCase() === 'LOST'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {ticket.status.toUpperCase() === 'WON'
                    ? `WON • برنده (${formatAmount(Number(ticket.prizeWonUsdt))})`
                    : ticket.status.toUpperCase() === 'LOST'
                    ? 'LOST • پایان‌یافته'
                    : 'ACTIVE • فعال در قرعه‌کشی'}
                </span>
              </div>

              {/* Ticket Balls vs Winning Balls */}
              <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>اعداد انتخابی شما (رنگ سبز = تطابق با بلاک قرعه‌کشی):</span>
                  <span className="font-mono">{ticket.currencyNetwork}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2" dir="ltr">
                  {mainArr.map((num, idx) => {
                    const matched = winEval.matchedMain.includes(num);
                    return (
                      <span
                        key={idx}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm ${
                          matched
                            ? 'bg-emerald-500 text-slate-950 border-2 border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                            : 'lottery-ball-gold text-slate-950'
                        }`}
                      >
                        {String(num).padStart(2, '0')}
                      </span>
                    );
                  })}
                  {ticket.goldenBall > 0 && (
                    <>
                      <span className="text-amber-400 font-black">+</span>
                      <span
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-mono font-black text-sm border-2 ${
                          winEval.matchedGolden
                            ? 'bg-emerald-500 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                            : 'lottery-ball-purple text-white border-amber-300'
                        }`}
                      >
                        ★{String(ticket.goldenBall).padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                  <span>
                    اعداد برنده دور: <strong className="font-mono text-amber-300">[{roundInfo.winningMain.join(', ')}]</strong>
                    {roundInfo.winningGolden > 0 ? ` + ★${roundInfo.winningGolden}` : ''}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {toPersianDigits(winEval.matchedMain.length)} تطابق اصلی
                    {winEval.matchedGolden ? ' + گوی طلایی' : ''}
                  </span>
                </div>
              </div>

              {/* Bottom Action Bar: 1-Click Claim Prize, Story Certificate, or Blockchain Tracker */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-medium text-purple-300/50 block">جایزه تعلق‌گرفته:</span>
                  <span className="text-base font-bold tracking-wide text-[#00f59b] tabular-nums" dir="ltr">
                    {formatAmount(effectivePrize)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid={`my-tickets-viral-btn-${ticket.ticketCode}`}
                    onClick={() => setViralCardTicket(ticket)}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs text-amber-300 font-black cursor-pointer"
                  >
                    📸 کارت تصویری استوری
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTrackingTicket(ticket);
                      navigateTo('status');
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-bold cursor-pointer"
                  >
                    استعلام TXID
                  </button>

                  {hasPrize && !isClaimed && (
                    <button
                      type="button"
                      disabled={claimingCode === ticket.ticketCode}
                      data-testid={`claim-prize-btn-${ticket.ticketCode}`}
                      onClick={() =>
                        handleClaimPrize(ticket.ticketCode, effectivePrize, ticket.currencyNetwork)
                      }
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">redeem</span>
                      <span>
                        {claimingCode === ticket.ticketCode
                          ? 'در حال واریز آنی...'
                          : 'دریافت آنی جایزه (1-Click Claim)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
