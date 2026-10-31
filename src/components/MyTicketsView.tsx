import React, { useState } from 'react';
import {
  Ticket,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Trophy,
  Plus,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { HapticEngine } from '../utils/telegramTma';
import { tr } from '../utils/i18n';

export const MyTicketsView: React.FC = () => {
  const {
    lang,
    tickets,
    claimedTicketCodes,
    claimTicketPrize,
    formatAmount,
    navigateTo,
    setActiveTrackingTicket,
    setViralCardTicket,
  } = useLottery();

  const [filter, setFilter] = useState<'ALL' | 'WON' | 'ACTIVE'>('ALL');
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [claimSuccessBanner, setClaimSuccessBanner] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredTickets = tickets.filter((t) => {
    const normalized = t.status.toUpperCase();
    if (filter === 'WON') return normalized === 'WON';
    if (filter === 'ACTIVE') return normalized === 'ACTIVE' || normalized === 'MINTED';
    return true;
  });

  const handleClaim = async (ticketCode: string, prizeUsdt: number) => {
    setClaimingCode(ticketCode);
    await claimTicketPrize(ticketCode, prizeUsdt, 'TON Network');
    setClaimingCode(null);
    setClaimSuccessBanner(
      tr(
        lang,
        `🎉 جایزه ${formatAmount(prizeUsdt)} بلیت ${ticketCode} به کیف پول شما واریز شد!`,
        `🎉 Prize ${formatAmount(prizeUsdt)} for ticket ${ticketCode} credited to your wallet!`
      )
    );
    setTimeout(() => setClaimSuccessBanner(null), 5000);
  };

  const handleCopy = (text: string) => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <main className="w-full max-w-[440px] mx-auto px-3 pt-2 pb-24 space-y-3.5 select-none">
      {/* Sticky Back Header */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 backdrop-blur-xl">
        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('lobby');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr(lang, 'بازگشت به لابی', 'Back to Lobby')}
        </button>
        <div className="flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-[#FFE066]" />
          <span className="text-xs font-black text-white">
            {tr(lang, 'بلیت‌های من و جوایز', 'My Tickets & Prizes')}
          </span>
        </div>
      </div>

      {/* Hero Summary */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#FFD700]/25 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[10px] font-black text-[#FFE066]">
              <Sparkles className="w-3 h-3" />
              {tr(lang, 'کوپن‌های ثبت‌شده با امضای ۵۲ بیتی', '52-Bit Cryptographic Slips')}
            </span>
            <h1 className="text-base font-black text-white mt-1">
              {tr(lang, `کل بلیت‌های شما (${tickets.length})`, `Your Lottery Slips (${tickets.length})`)}
            </h1>
          </div>
          <button
            onClick={() => navigateTo('play')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {tr(lang, 'بلیت جدید', 'New Slip')}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          {(['ALL', 'WON', 'ACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-[#FFE066] text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' && tr(lang, `همه (${tickets.length})`, `All (${tickets.length})`)}
              {tab === 'WON' && tr(lang, '🏆 برنده', '🏆 Won')}
              {tab === 'ACTIVE' && tr(lang, '⏳ فعال', '⏳ Active')}
            </button>
          ))}
        </div>
      </section>

      {claimSuccessBanner && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
          {claimSuccessBanner}
        </div>
      )}

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="p-6 rounded-3xl bg-[#110C22]/85 border border-white/10 text-center space-y-2.5">
          <Ticket className="w-8 h-8 text-[#FFE066]/60 mx-auto" />
          <div className="text-xs font-black text-white">
            {tr(lang, 'هنوز بلیتی در این بخش ثبت نشده است.', 'No lottery tickets found in this filter.')}
          </div>
          <p className="text-[11px] text-slate-400">
            {tr(
              lang,
              'می‌توانید در لابی با ۱ کلیک بلیت تصادفی بخرید یا شماره‌های دلخواه خود را دستی انتخاب کنید.',
              'Use 1-Tap Quick Pick in the Lobby or choose your own numbers in Custom Ball Picker.'
            )}
          </p>
          <button
            onClick={() => navigateTo('play')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 font-black text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {tr(lang, 'انتخاب دستی شماره‌ها', 'Open Custom Ball Picker')}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTickets.map((t) => {
            let mainBalls: number[] = [];
            try {
              mainBalls = JSON.parse(t.mainNumbers);
            } catch {
              mainBalls = [7, 14, 21, 33, 49];
            }
            const statusUpper = t.status.toUpperCase();
            const isWon = statusUpper === 'WON';
            const isLost = statusUpper === 'LOST';
            const isClaimed = Boolean(t.claimed) || claimedTicketCodes.includes(t.ticketCode);
            const prizeAmount = parseFloat(t.prizeWonUsdt || '0') || 0;

            return (
              <div
                key={t.ticketCode}
                className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
                  isWon
                    ? 'bg-emerald-950/20 border-emerald-400/40'
                    : 'bg-[#110C22]/90 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-[#FFE066]">
                        {t.ticketCode}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({t.roundCode})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.createdAt}</div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                      isWon
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                        : isLost
                        ? 'bg-white/5 text-slate-400 border border-white/10'
                        : 'bg-[#0098EA]/20 text-[#38BDF8] border border-[#0098EA]/35'
                    }`}
                  >
                    {isWon ? (
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {tr(lang, 'برنده', 'WON')} ({formatAmount(prizeAmount)})
                      </span>
                    ) : isLost ? (
                      tr(lang, 'پایان‌یافته', 'Settled')
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tr(lang, 'در انتظار قرعه‌کشی', 'Active')}
                      </span>
                    )}
                  </span>
                </div>

                {/* Selected Balls */}
                <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-400">
                    {tr(lang, 'ترکیب گوی‌ها:', 'Picked Balls:')}
                  </span>
                  <div className="flex items-center gap-1" dir="ltr">
                    {mainBalls.map((n, idx) => (
                      <span
                        key={idx}
                        className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-mono text-[10px] font-black text-white"
                      >
                        {n < 10 ? `0${n}` : n}
                      </span>
                    ))}
                    <span className="text-xs font-black text-[#FFE066]">+</span>
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 flex items-center justify-center font-mono text-[10px] font-black">
                      {t.goldenBall}
                    </span>
                  </div>
                </div>

                {/* Hash & Action Row */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(t.txHash)}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer truncate max-w-[180px]"
                    dir="ltr"
                  >
                    <Copy className="w-3 h-3 text-[#00F5D4] shrink-0" />
                    <span className="truncate">
                      {copiedHash === t.txHash ? 'Copied!' : t.txHash}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setViralCardTicket(t)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FFE066]/15 hover:bg-[#FFE066]/25 border border-[#FFE066]/35 text-[#FFE066] text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      {tr(lang, 'کارت بلیت', 'Share Card')}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTrackingTicket(t);
                        navigateTo('status');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#00F5D4]" />
                      {tr(lang, 'رهگیری', 'Verify')}
                    </button>

                    {isWon && !isClaimed && prizeAmount > 0 && (
                      <button
                        onClick={() => handleClaim(t.ticketCode, prizeAmount)}
                        disabled={claimingCode === t.ticketCode}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {claimingCode === t.ticketCode
                          ? '...'
                          : tr(lang, 'دریافت جایزه', 'Claim')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
