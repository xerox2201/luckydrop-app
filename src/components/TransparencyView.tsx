import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  COMBINATORIAL_TIERS,
  calculateBinomialOddsAndEV,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';

export const TransparencyView: React.FC = () => {
  const { formatAmount, navigateTo } = useLottery();
  const [ticketCount, setTicketCount] = useState<number>(10);
  const [copiedVault, setCopiedVault] = useState<string | null>(null);

  const stats = calculateBinomialOddsAndEV(ticketCount, 2, 184500, 85);

  const copyAddress = (addr: string) => {
    navigator.clipboard?.writeText(addr);
    setCopiedVault(addr);
    setTimeout(() => setCopiedVault(null), 2000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#141a29] via-[#111622] to-[#132226] border border-emerald-500/30 p-6 sm:p-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <span className="material-symbols-outlined text-base">calculate</span>
          <span>MATHEMATICAL TRANSPARENCY & SOLVENCY PROOF</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white">
          مرکز شفافیت ریاضی، جدول احتمالات و اثبات موجودی خزانه
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          تمامی محاسبات ترکیبیاتی <code className="text-amber-300">C(50,5) × C(15,1) = 31,781,400</code> و توزیع دوجمعی امید ریاضی (Expected Value) به صورت ۱۰۰٪ متن‌باز و قابل راستی‌آزمایی در بلاکچین ارائه شده‌اند.
        </p>
      </div>

      {/* 1. Interactive Binomial Odds & Expected Value (EV) Calculator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400">BINOMIAL PROBABILITY & EV SIMULATOR</span>
              <h2 className="text-xl font-black text-white mt-0.5">
                ماشین‌حساب شانس برد و امید ریاضی (EV)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 font-mono font-bold text-xs">
              RTP: 85.0%
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">تعداد بلیط‌های خریداری‌شده در یک دور:</span>
              <span className="text-lg font-black text-amber-400 font-mono" data-testid="ev-ticket-count">
                {toPersianDigits(ticketCount)} بلیط
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={500}
              value={ticketCount}
              data-testid="ev-ticket-slider"
              onChange={(e) => setTicketCount(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-[#0a0e16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
              <span>1 Ticket ($2)</span>
              <span>100 Tickets ($200)</span>
              <span>250 Tickets ($500)</span>
              <span>500 Tickets ($1,000)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0c1018] border border-white/10 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">سرمایه‌گذاری کل شما:</span>
              <strong className="text-lg font-black text-white block" data-testid="ev-total-cost">
                {formatAmount(stats.totalCostUsdt)}
              </strong>
              <span className="text-[11px] font-mono text-slate-500">${stats.totalCostUsdt} USDT</span>
            </div>

            <div className="bg-[#0c1018] border border-emerald-500/30 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">احتمال برد حداقل یک جایزه (Binomial):</span>
              <strong className="text-2xl font-black text-emerald-400 font-mono block" data-testid="ev-any-prize-prob">
                {stats.anyPrizeProbabilityPercent}%
              </strong>
              <span className="text-[11px] text-emerald-300/80">بر پایه توزیع دوجمعی ۱ - (1 - p)^n</span>
            </div>

            <div className="bg-[#0c1018] border border-white/10 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">امید ریاضی بازگشت سرمایه (EV):</span>
              <strong className="text-lg font-black text-amber-300 font-mono block">
                ${stats.expectedReturnUsdt} USDT
              </strong>
              <span className="text-[11px] text-slate-400">۸۵٪ بازگشت تضمینی استخر به بازیکنان</span>
            </div>

            <div className="bg-[#0c1018] border border-purple-500/30 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">شانس مستقیم جک‌پات مگا:</span>
              <strong className="text-sm font-black text-purple-300 font-mono block">
                {stats.jackpotOddsRatio}
              </strong>
              <span className="text-[11px] text-slate-400">ضریب تقویت شانس: {toPersianDigits(ticketCount)} برابر</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all"
          >
            خرید {toPersianDigits(ticketCount)} بلیط با این ضریب احتمال ←
          </button>
        </div>

        {/* Public Multi-Signature Solvency Proof Vaults */}
        <div className="lg:col-span-6 rounded-3xl bg-[#141923] border border-white/10 p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-400">100% VERIFIABLE ON-CHAIN SOLVENCY</span>
              <h2 className="text-xl font-black text-white mt-0.5">
                آدرس خزانه‌های چندامضایی عمومی (Proof of Reserves)
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold">
              3-of-5 Multi-Sig
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            برخلاف سایت‌های سنتی، ۱۰۰٪ موجودی جک‌پات در کیف‌پول‌های چندامضایی سرد و گرم روی شبکه‌های TRON و TON نگهداری شده و در هر لحظه توسط عموم قابل استعلام است:
          </p>

          <div className="space-y-3">
            {[
              {
                title: 'خزانه اصلی جوایز تتر (Tron TRC-20 Multi-Sig Vault)',
                balance: '$248,500.00 USDT',
                address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
                explorer: 'https://tronscan.org/#/address/TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
              },
              {
                title: 'خزانه پشتیبان شبکه تون (TON Jetton Smart Treasury)',
                balance: '24,810 TON ($129,508 USDT)',
                address: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
                explorer: 'https://tonviewer.com/UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
              },
              {
                title: 'کیف پول سرد ذخیره طلایی بیت‌کوین (Cold Storage Ledger)',
                balance: '2.15 BTC ($191,887 USDT)',
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                explorer: 'https://mempool.space/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
              },
            ].map((vault) => (
              <div
                key={vault.address}
                className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{vault.title}</span>
                  <span className="text-xs font-mono font-black text-emerald-400">{vault.balance}</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#141925] rounded-xl px-3 py-2">
                  <code className="text-[11px] font-mono text-amber-300 truncate">{vault.address}</code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyAddress(vault.address)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-bold"
                    >
                      {copiedVault === vault.address ? 'کپی شد!' : 'کپی'}
                    </button>
                    <a
                      href={vault.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold"
                    >
                      استعلام زنده ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Full Combinatorial Probability Table (Tier 1 to Tier 5) */}
      <section className="rounded-3xl bg-[#141923] border border-white/10 p-6 sm:p-8 space-y-5">
        <div>
          <span className="text-xs font-bold text-amber-400">COMBINATORIAL PROBABILITY MATRIX</span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            جدول کامل سطوح جوایز و احتمال دقیق ریاضی (Tier 1 تا Tier 5)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3.5 px-4">سطح جایزه</th>
                <th className="py-3.5 px-4">الگوی تطابق گوی‌ها</th>
                <th className="py-3.5 px-4">ضریب احتمال (Odds)</th>
                <th className="py-3.5 px-4">سهم از استخر جایزه</th>
                <th className="py-3.5 px-4">جایزه تخمینی هر برنده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMBINATORIAL_TIERS.map((row) => (
                <tr key={row.tier} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-black text-amber-400">{row.tier}</td>
                  <td className="py-4 px-4 font-bold text-white">{row.matchPattern}</td>
                  <td className="py-4 px-4 font-mono text-slate-300">{row.oddsText}</td>
                  <td className="py-4 px-4 font-bold text-emerald-400">{row.poolShare}</td>
                  <td className="py-4 px-4 font-black text-white">
                    {formatAmount(row.estimatedPrizeUsdt)}{' '}
                    <span className="text-[11px] font-mono text-slate-400">
                      (${row.estimatedPrizeUsdt.toLocaleString('en-US')})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
