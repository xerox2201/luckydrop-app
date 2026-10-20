import React, { useState, useEffect } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { toPersianDigits } from '../utils/lotteryEngine.ts';

export const TxStatusView: React.FC = () => {
  const {
    tickets,
    activeTrackingTicket,
    setActiveTrackingTicket,
    navigateTo,
    formatAmount,
  } = useLottery();

  const currentTicket = activeTrackingTicket || tickets[0] || null;
  const [stage, setStage] = useState<number>(3);
  const [latencyMs, setLatencyMs] = useState<number>(18);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyMs(Math.floor(14 + Math.random() * 9));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const simulateLiveReplay = () => {
    setStage(1);
    setTimeout(() => setStage(2), 900);
    setTimeout(() => setStage(3), 1900);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-[#131824] border border-emerald-500/30 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>MEMPOOL & BLOCKCHAIN CONFIRMATION TRACKER</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            رهگیری زنده تراکنش و تایید بلاکچین
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
             پایش لحظه‌ای مراحل ثبت کوپن از استخر ممپول (Mempool) تا صدور نهایی بلیط در قرارداد هوشمند.
          </p>
        </div>

        {/* Node Latency Telemetry */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#0b0f18] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400">dns</span>
            <div>
              <span className="text-[10px] text-slate-400 block">پینگ نود اختصاصی TronGrid / TON:</span>
              <strong className="text-xs font-mono text-emerald-400">{latencyMs} ms • ONLINE</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={simulateLiveReplay}
            className="px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">sync</span>
            <span>شبیه‌سازی مجدد پایپ‌لاین ۳ مرحله‌ای</span>
          </button>
        </div>
      </div>

      {/* 3-Stage Visual Validation Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            step: 1,
            title: '۱. شناسایی در استخر ممپول (Mempool Seen)',
            desc: 'تراکنش شما در کمتر از ۲ ثانیه توسط نودهای اعتبارسنج شبکه شناسایی و امضای دیجیتال آن تایید شد.',
            badge: '0/2 Confirmations • Broadcasted',
            icon: 'sensors',
          },
          {
            step: 2,
            title: '۲. دریافت ۲ تایید بلاک (Block Confirmations)',
            desc: 'تراکنش در بلاک شماره #۲۱,۴۹۲,۱۸۴ استخراج شد و نهایی‌سازی (Finality) شبکه دریافت گردید.',
            badge: '2/2 Confirmations • Verified',
            icon: 'deployed_code',
          },
          {
            step: 3,
            title: '۳. صدور کوپن قرارداد هوشمند (Coupon Minted)',
            desc: 'کد یکتای بلیط به همراه هش تعهد SHA-256 در دفترکل دائمی زرین لاتاری ثبت گردید.',
            badge: 'MINTED & LOCKED ON-CHAIN',
            icon: 'verified',
          },
        ].map((item) => {
          const isCompleted = stage >= item.step;
          return (
            <div
              key={item.step}
              className={`rounded-3xl p-6 border transition-all ${
                isCompleted
                  ? 'bg-[#141b28] border-emerald-500/45 shadow-[0_15px_35px_rgba(16,185,129,0.12)]'
                  : 'bg-[#10141f] border-white/10 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              </div>
              <h3 className="text-base font-black text-white mb-2">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Active Ticket Certificate & Explorer Links */}
      {currentTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 block">SMART CONTRACT COUPON RECEIPT</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  گواهی دیجیتال کوپن: <span className="font-mono text-amber-300">{currentTicket.ticketCode}</span>
                </h2>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                {currentTicket.status} ({toPersianDigits(currentTicket.confirmations)} تایید بلاک)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0f18] border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-slate-400 block">اعداد انتخابی ثبت‌شده در بلاکچین:</span>
                <div className="flex items-center gap-2 pt-1" dir="ltr">
                  {currentTicket.mainNumbers
                    .replace(/[\[\]]/g, '')
                    .split(',')
                    .map((n, idx) => (
                      <span
                        key={idx}
                        className="w-8 h-8 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-xs flex items-center justify-center"
                      >
                        {String(n.trim()).padStart(2, '0')}
                      </span>
                    ))}
                  <span className="w-8 h-8 rounded-full lottery-ball-purple text-white font-mono font-black text-xs flex items-center justify-center">
                    ★{String(currentTicket.goldenBall).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="bg-[#0b0f18] border border-white/5 rounded-2xl p-4 space-y-1">
                <span className="text-slate-400 block">شبکه و مبلغ پرداخت‌شده:</span>
                <strong className="text-base font-black text-emerald-400 block">
                  {formatAmount(Number(currentTicket.costUsdt))} (${currentTicket.costUsdt} USDT)
                </strong>
                <span className="text-[11px] font-mono text-slate-400">{currentTicket.currencyNetwork}</span>
              </div>
            </div>

            <div className="space-y-2 bg-[#0b0f18] border border-white/10 rounded-2xl p-4 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>TXID (Transaction Hash):</span>
                <span className="text-emerald-400">Verified On-Chain</span>
              </div>
              <div className="text-amber-200 break-all">{currentTicket.txHash}</div>
              <div className="pt-2 border-t border-white/5 text-slate-400">
                SHA-256 Commit Hash: <span className="text-slate-300 break-all">{currentTicket.commitHash}</span>
              </div>
            </div>

            {/* Explorer External Verification Links */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`https://tronscan.org/#/transaction/${currentTicket.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-amber-300 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                <span>مشاهده در TronScan Explorer</span>
              </a>
              <a
                href={`https://etherscan.io/tx/${currentTicket.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-sky-300 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                <span>استعلام در Etherscan / TONViewer</span>
              </a>
              <button
                type="button"
                onClick={() => navigateTo('play')}
                className="px-4 py-2.5 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs"
              >
                + صدور کوپن جدید
              </button>
            </div>
          </div>

          {/* All User Minted Tickets List */}
          <div className="lg:col-span-5 rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-4">
            <h3 className="text-lg font-black text-white">
              لیست کوپن‌های ثبت‌شده شما ({toPersianDigits(tickets.length)})
            </h3>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {tickets.map((t) => {
                const isSelected = currentTicket?.ticketCode === t.ticketCode;
                return (
                  <button
                    key={t.ticketCode}
                    type="button"
                    onClick={() => setActiveTrackingTicket(t)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-[#0c1018] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-black text-sm text-amber-300">{t.ticketCode}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        [{t.mainNumbers}] + ★{t.goldenBall}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold block">
                        {t.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{t.currencyNetwork}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
