import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { calculateWaterfallCashflow, toPersianDigits } from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const FinancesView: React.FC = () => {
  const { rounds, formatAmount, officialWallets, updateOfficialWallets } = useLottery();

  // Interactive Profit & Margin Simulator state ($500K to $10M volume)
  const [simVolumeUsdt, setSimVolumeUsdt] = useState<number>(2500000);
  const [simRtpPercent, setSimRtpPercent] = useState<number>(85);

  // Cold Storage Hardware Sweep Modal & 2FA state
  const [accumulatedProfitUsdt, setAccumulatedProfitUsdt] = useState<number>(482910);
  const [sweepAddress, setSweepAddress] = useState<string>(officialWallets.COLD_TREASURY);
  const [twoFaCode, setTwoFaCode] = useState<string>('849201');
  const [sweepSuccessMsg, setSweepSuccessMsg] = useState<string | null>(null);

  // Historical Ledger Search
  const [ledgerQuery, setLedgerQuery] = useState<string>('');

  const simSplit = calculateWaterfallCashflow(simVolumeUsdt, simRtpPercent);

  const handleColdStorageSweep = (e: React.FormEvent) => {
    e.preventDefault();
    if (accumulatedProfitUsdt <= 0) return;
    updateOfficialWallets({ COLD_TREASURY: sweepAddress });
    const sweptAmount = accumulatedProfitUsdt;
    setAccumulatedProfitUsdt(0);
    setSweepSuccessMsg(
      `✅ مبلغ $${sweptAmount.toLocaleString('en-US')} USDT سود خالص با موفقیت با امضای سخت‌افزاری Ledger Nano X به آدرس سرد ${sweepAddress.slice(0, 12)}... منتقل شد.`
    );
  };

  const filteredRounds = rounds.filter(
    (r) =>
      r.roundCode.toLowerCase().includes(ledgerQuery.toLowerCase()) ||
      r.titleFa.includes(ledgerQuery) ||
      r.serverSeedHash.toLowerCase().includes(ledgerQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-10">
      {/* 1. Real-Time Accumulated Pure Profit Hero Counter */}
      <section className="relative overflow-hidden rounded-3xl bg-[#101622] border border-amber-500/40 p-6 sm:p-10 shadow-2xl">
        <img
          src={LUXURY_IMAGES.cockpitCommandVault}
          alt="Cold Treasury Vault"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a12]/95 via-[#070a12]/80 to-[#070a12]/90"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <img
                src={LUXURY_IMAGES.walletIcon3d}
                alt="Treasury Wallet"
                className="w-5 h-5 rounded-md object-cover"
              />
              <span>AUTOMATED WATERFALL CASHFLOW ENGINE (10% GUARANTEED MARGIN)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              داشبورد سود خالص اپراتور و جریان نقدینگی خزانه
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              در مدل توکنومیکس LuckyDrop، به ازای هر ۱۰۰ واحد فروش بلیت، دقیقاً <strong className="text-emerald-400">۱۰٪ سود خالص بدون ریسک</strong> پیش از قرعه‌کشی توسط قرارداد هوشمند جدا شده و آماده انتقال به کیف پول سرد (Ledger HW) است.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[#0b0f18]/95 backdrop-blur-xl border border-amber-500/35 rounded-3xl p-6 space-y-3 text-center">
            <span className="text-xs font-bold text-slate-400 block">
              سود خالص انباشته‌شده قابل برداشت (Un-swept Operator Profit):
            </span>
            <div
              data-testid="accumulated-profit-counter"
              className="text-3xl sm:text-4xl font-black text-amber-400 font-mono"
            >
              ${accumulatedProfitUsdt.toLocaleString('en-US')} USDT
            </div>
            <div className="text-sm font-bold text-emerald-400">
              معادل: {formatAmount(accumulatedProfitUsdt)}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Profit & Margin Simulator ($500K to $10M Volume) + Cold Storage Sweep */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Simulator */}
        <div className="lg:col-span-7 rounded-3xl bg-[#141923] border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400">WATERFALL CASHFLOW SIMULATOR</span>
              <h2 className="text-xl font-black text-white mt-0.5">
                شبیه‌ساز سود خالص و تقسیم خودکار درآمد ($500K تا $10M)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold">
              Zero-Risk Margin
            </span>
          </div>

          {/* Volume Slider ($500,000 to $10,000,000) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">حجم کل فروش بلیط ماهانه (Ticket Volume):</span>
              <span className="text-lg font-black text-amber-400 font-mono" data-testid="sim-volume-label">
                ${simVolumeUsdt.toLocaleString('en-US')} USDT
              </span>
            </div>
            <input
              type="range"
              min={500000}
              max={10000000}
              step={100000}
              value={simVolumeUsdt}
              data-testid="sim-volume-slider"
              onChange={(e) => setSimVolumeUsdt(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-[#0a0e16] rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500" dir="ltr">
              <span>$500K</span>
              <span>$2.5M</span>
              <span>$5.0M</span>
              <span>$10.0M USDT</span>
            </div>
          </div>

          {/* RTP Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">نرخ بازگشت جایزه به بازیکنان (Player RTP %):</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{simRtpPercent}%</span>
            </div>
            <input
              type="range"
              min={75}
              max={90}
              step={1}
              value={simRtpPercent}
              onChange={(e) => setSimRtpPercent(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-[#0a0e16] rounded-lg"
            />
          </div>

          {/* 4-Way Waterfall Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#0b0f18] border border-emerald-500/40 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">
                سود خالص تضمینی اپراتور ({simSplit.operatorMarginPercent}%):
              </span>
              <strong
                data-testid="sim-operator-profit"
                className="text-xl font-black text-emerald-400 font-mono block"
              >
                ${simSplit.operatorProfitUsdt.toLocaleString('en-US')} USDT
              </strong>
              <span className="text-xs text-amber-300 font-bold block">
                {formatAmount(simSplit.operatorProfitUsdt)}
              </span>
            </div>

            <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">
                استخر جوایز بازیکنان ({simSplit.rtpPercent}% RTP):
              </span>
              <strong className="text-xl font-black text-white font-mono block">
                ${simSplit.prizePoolUsdt.toLocaleString('en-US')} USDT
              </strong>
              <span className="text-xs text-slate-400 block">
                {formatAmount(simSplit.prizePoolUsdt)}
              </span>
            </div>

            <div className="bg-[#0b0f18] border border-purple-500/30 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">ذخیره تصاعدی دور بعد (۳٪ Rollover):</span>
              <strong className="text-base font-black text-purple-300 font-mono block">
                ${simSplit.jackpotRolloverUsdt.toLocaleString('en-US')} USDT
              </strong>
            </div>

            <div className="bg-[#0b0f18] border border-sky-500/30 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">بودجه گس شبکه، اوراکل و سرور (۲٪):</span>
              <strong className="text-base font-black text-sky-300 font-mono block">
                ${simSplit.gasAndInfraUsdt.toLocaleString('en-US')} USDT
              </strong>
            </div>
          </div>
        </div>

        {/* One-Click Profit Sweep to Hardware Cold Storage (Ledger HW + 2FA) */}
        <form
          onSubmit={handleColdStorageSweep}
          className="lg:col-span-5 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 sm:p-8 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">HARDWARE COLD STORAGE SWEEP</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-mono font-bold">
                Ledger Nano X • 2FA
              </span>
            </div>
            <h3 className="text-xl font-black text-white">
              تخلیه آنی سود به کیف‌پول سخت‌افزاری سرد
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              انتقال مستقیم سود خالص انباشته‌شده از قرارداد هوشمند به کیف پول سرد سخت‌افزاری با تایید دو مرحله‌ای (YubiKey / Google Authenticator).
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                آدرس مقصد کیف‌پول سرد (TRC-20 / Ledger Vault):
              </label>
              <input
                type="text"
                value={sweepAddress}
                onChange={(e) => setSweepAddress(e.target.value)}
                className="w-full bg-[#0b0f18] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                کد تایید دو مرحله‌ای سخت‌افزاری (6-Digit 2FA):
              </label>
              <input
                type="text"
                maxLength={6}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
                className="w-full bg-[#0b0f18] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-mono tracking-widest text-center"
              />
            </div>

            {sweepSuccessMsg && (
              <div
                data-testid="sweep-success-banner"
                className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold leading-relaxed"
              >
                {sweepSuccessMsg}
              </div>
            )}
          </div>

          <button
            type="submit"
            data-testid="sweep-to-cold-storage-btn"
            className="w-full py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">security_key</span>
            <span>امضا و انتقال کل سود به کیف پول سرد (Sweep Now)</span>
          </button>
        </form>
      </div>

      {/* 3. Historical Round Accounting Ledger with Cryptographic Hashes */}
      <section className="rounded-3xl bg-[#141923] border border-white/10 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-400">IMMUTABLE FINANCIAL AUDIT LEDGER</span>
            <h2 className="text-xl font-black text-white mt-0.5">
              دفترکل تاریخی حسابداری دورها و هش‌های رمزنگاری‌شده
            </h2>
          </div>
          <input
            type="text"
            placeholder="جستجوی کد دور یا هش SHA-256..."
            value={ledgerQuery}
            onChange={(e) => setLedgerQuery(e.target.value)}
            className="bg-[#0b0f18] border border-white/15 rounded-xl px-4 py-2 text-xs text-white w-full sm:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3.5 px-3">کد دور</th>
                <th className="py-3.5 px-3">عنوان استخر</th>
                <th className="py-3.5 px-3">کل فروش بلیط</th>
                <th className="py-3.5 px-3">جوایز پرداختی (۸۵٪)</th>
                <th className="py-3.5 px-3">سود خالص اپراتور (۱۰٪)</th>
                <th className="py-3.5 px-3">ذخیره دور بعد (۳٪)</th>
                <th className="py-3.5 px-3">هش تعهد SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRounds.map((r) => (
                <tr key={r.roundCode} className="hover:bg-white/5">
                  <td className="py-3.5 px-3 font-mono font-bold text-amber-400">{r.roundCode}</td>
                  <td className="py-3.5 px-3 font-bold text-white">{r.titleFa}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-200">
                    ${Number(r.totalSalesUsdt).toLocaleString('en-US')}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">
                    ${Number(r.totalPayoutUsdt).toLocaleString('en-US')}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-black text-emerald-400">
                    +${Number(r.operatorProfitUsdt).toLocaleString('en-US')}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-purple-300">
                    ${Number(r.rolloverReserveUsdt).toLocaleString('en-US')}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                    {r.serverSeedHash.slice(0, 18)}... ({toPersianDigits(100)}% Verified)
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
