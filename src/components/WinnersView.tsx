import React from 'react';
import { Trophy, ShieldCheck, ExternalLink, Sparkles, ArrowLeft, Ticket } from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { tr, localizeServerText } from '../utils/i18n';
import { HapticEngine } from '../utils/telegramTma';

export const WinnersView: React.FC = () => {
  const {
    lang,
    navigateTo,
    drawHistory,
    transactions,
    tickets,
    formatActiveTmaAmount,
  } = useLottery();

  const wonTickets = tickets.filter((t) => t.status === 'WON');

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
          <Trophy className="w-4 h-4 text-[#FFE066]" />
          <span className="text-xs font-black text-white">
            {tr(lang, 'تالار برندگان و تاریخچه قرعه‌کشی', 'Winners & Draw History')}
          </span>
        </div>
      </div>

      {/* Hero Summary Card */}
      <section className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#FFD700]/25 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[10px] font-black text-[#FFE066]">
              <Sparkles className="w-3 h-3" />
              {tr(lang, 'اثبات آن‌چین و ۵۲ بیتی HMAC-SHA256', '52-Bit HMAC-SHA256 Verified')}
            </span>
            <h1 className="text-base font-black text-white mt-1.5">
              {tr(lang, 'برندگان تاییدشده LuckyDrop', 'Verified LuckyDrop Winners')}
            </h1>
          </div>
          <button
            onClick={() => {
              HapticEngine.selectionChanged();
              navigateTo('transparency');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[10px] font-black text-[#00F5D4] cursor-pointer"
          >
            {tr(lang, 'اثبات عدالت', 'Verify RNG')}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'کل ادوار پایان‌یافته', 'Completed Draws')}
            </div>
            <div className="text-sm font-black font-mono text-white mt-0.5">
              {drawHistory.length}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'بردهای حساب شما', 'Your Winning Slips')}
            </div>
            <div className="text-sm font-black font-mono text-[#00F5D4] mt-0.5">
              {wonTickets.length}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'تقسیم استخر جوایز', 'Pool Payout')}
            </div>
            <div className="text-sm font-black font-mono text-[#FFE066] mt-0.5">85%</div>
          </div>
        </div>
      </section>

      {/* Verifiable Draw History List */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-white">
            {tr(lang, 'تاریخچه قرعه‌کشی‌های انجام‌شده', 'Completed Lottery Draws')}
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            {drawHistory.length} {tr(lang, 'دور', 'Draws')}
          </span>
        </div>

        {drawHistory.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#110C22]/80 border border-white/10 text-center space-y-2">
            <Trophy className="w-7 h-7 text-[#FFE066]/60 mx-auto" />
            <div className="text-xs font-bold text-slate-200">
              {tr(
                lang,
                'قرعه‌کشی دور فعلی راس تایمر شمارش معکوس به صورت خودکار انجام می‌شود.',
                'The current round draw executes automatically when the countdown reaches zero.'
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {tr(
                lang,
                'بلافاصله پس از پایان هر دور، گوی‌های برنده و Server Seed افشاشده در این صفحه ثبت می‌گردند.',
                'Winning balls and the revealed cryptographic Server Seed appear here immediately after each draw.'
              )}
            </p>
            <button
              onClick={() => navigateTo('lobby')}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 font-black text-xs cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5" />
              {tr(lang, 'شرکت در دور فعال', 'Join Active Draw')}
            </button>
          </div>
        ) : (
          drawHistory.map((d) => (
            <div
              key={d.drawId}
              className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white">
                    {localizeServerText(lang, d.roundTitleFa || d.roundCode)}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400">
                    {localizeServerText(lang, d.createdAt)}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[10px] font-mono font-black text-[#00F5D4]">
                  {formatActiveTmaAmount(d.totalPayoutUsdt || 0)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap" dir="ltr">
                {d.drawnMain.map((num, idx) => (
                  <span
                    key={idx}
                    className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-mono text-xs font-black text-white"
                  >
                    {num < 10 ? `0${num}` : num}
                  </span>
                ))}
                <span className="text-xs font-black text-[#FFE066]">+</span>
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 flex items-center justify-center font-mono text-xs font-black">
                  {d.drawnGolden}
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono truncate max-w-[210px]" dir="ltr">
                  HMAC: 0x{d.primaryHmacHex.slice(0, 18)}...
                </span>
                <button
                  onClick={() => navigateTo('transparency')}
                  className="inline-flex items-center gap-1 text-[#00F5D4] font-bold cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3" />
                  {tr(lang, 'بررسی هش', 'Verify Hash')}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Recent Verified Payouts */}
      {transactions.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-black text-white px-1">
            {tr(lang, 'تراکنش‌های اخیر برندگان', 'Recent Winner Payouts')}
          </h3>
          {transactions.slice(0, 8).map((tx) => (
            <div
              key={tx.id}
              className="p-3 rounded-2xl bg-[#110C22]/85 border border-white/10 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">
                  {localizeServerText(lang, tx.winnerName)}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {localizeServerText(lang, tx.lotteryTitle)} • {tx.winningCombo}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-black text-[#00F5D4]">
                  {tx.amountCrypto || formatActiveTmaAmount(parseFloat(tx.amountUsdt) || 0)}
                </div>
                <div className="text-[9px] text-slate-500 font-mono flex items-center justify-end gap-1">
                  <ExternalLink className="w-2.5 h-2.5" />
                  {localizeServerText(lang, tx.timeAgoLabel)}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
};
