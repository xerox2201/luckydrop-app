import React, { useState, useMemo } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  COMBINATORIAL_TIERS,
  calculateBinomialOddsAndEV,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';
import {
  deriveProvablyFairLotteryDraw,
  sha256Hex,
} from '../utils/provablyFair.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const TransparencyView: React.FC = () => {
  const {
    formatAmount,
    navigateTo,
    provablyFairSeeds,
    drawHistory,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
  } = useLottery();

  const [ticketCount, setTicketCount] = useState<number>(10);
  const [copiedVault, setCopiedVault] = useState<string | null>(null);

  // Interactive HMAC-SHA256 52-Bit Float Verifier State
  const initialHistory = drawHistory[0];
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>(
    initialHistory?.serverSeed ||
      provablyFairSeeds.previousServerSeed ||
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  );
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>(
    initialHistory?.clientSeed || provablyFairSeeds.clientSeed || 'zarrin_vip_genesis_client_seed'
  );
  const [verifyNonce, setVerifyNonce] = useState<number>(initialHistory?.nonce || 1);
  const [verifyRoundCode, setVerifyRoundCode] = useState<string>(
    initialHistory?.roundCode || '#ZRN-8492'
  );
  const [editClientSeed, setEditClientSeed] = useState<string>(provablyFairSeeds.clientSeed);
  const [seedSavedMsg, setSeedSavedMsg] = useState<string | null>(null);

  const stats = calculateBinomialOddsAndEV(ticketCount, 2, 184500, 85);

  const verificationResult = useMemo(() => {
    return deriveProvablyFairLotteryDraw({
      serverSeed: verifyServerSeed,
      clientSeed: verifyClientSeed,
      nonce: verifyNonce,
      roundCode: verifyRoundCode,
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
    });
  }, [verifyServerSeed, verifyClientSeed, verifyNonce, verifyRoundCode]);

  const computedCommitmentHash = useMemo(() => sha256Hex(verifyServerSeed.trim()), [verifyServerSeed]);

  const copyAddress = (addr: string) => {
    navigator.clipboard?.writeText(addr);
    setCopiedVault(addr);
    setTimeout(() => setCopiedVault(null), 2000);
  };

  const handleLoadDrawRecord = (rec: (typeof drawHistory)[0]) => {
    setVerifyServerSeed(rec.serverSeed);
    setVerifyClientSeed(rec.clientSeed);
    setVerifyNonce(rec.nonce);
    setVerifyRoundCode(rec.roundCode);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/40 p-6 sm:p-10 shadow-2xl">
        <img
          src={LUXURY_IMAGES.fairnessAudit}
          alt="Provably Fair Padlock"
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090d16]/92 via-[#0e1522]/85 to-[#081c1a]/90 pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <img
            src={LUXURY_IMAGES.shieldIcon3d}
            alt="Security Shield"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400/75 shadow-xl shrink-0"
          />
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>PROVABLY FAIR HMAC-SHA256 (52-BIT FLOAT) VERIFIER &amp; DRAW HISTORY</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              راستی‌آزمای رمزنگاری Provably Fair (HMAC-SHA256) و مرکز شفافیت ریاضی
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
              تبدیل ۵۲ بیت اول خروجی <code className="text-amber-300">HMAC-SHA256(serverSeed, clientSeed:nonce:round:cursor)</code> به عدد اعشاری یکنواخت <code className="text-emerald-300">X = parseInt(hex.slice(0,13), 16) / 2^52</code> در بازه <code className="text-emerald-300">[0, 1)</code> برای استخراج ۱۰۰٪ قطعی و غیرقابل‌دستکاری گوی‌های برنده.
            </p>
          </div>
        </div>
      </div>

      {/* 0. LIVE PROVABLY FAIR HMAC-SHA256 VERIFIER & SEED CONTROLLER */}
      <section
        data-testid="provably-fair-verifier-section"
        className="rounded-3xl bg-[#141923] border border-emerald-500/45 p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              INTERACTIVE HMAC-SHA256 &amp; 52-BIT UNIFORM FLOAT [0, 1) CRYPTOGRAPHIC VERIFIER
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              ماشین‌حساب راستی‌آزمایی مستقل قرعه‌کشی‌ها و بذرهای رمزنگاری (Active &amp; Revealed Seeds)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs font-mono text-amber-300">
              Active Nonce: #{provablyFairSeeds.nonce}
            </span>
            <button
              type="button"
              data-testid="verifier-rotate-seed-btn"
              onClick={async () => {
                const rotated = await rotateProvablyFairServerSeed();
                if (rotated.previousServerSeed) {
                  setVerifyServerSeed(rotated.previousServerSeed);
                  setVerifyNonce(rotated.previousNonce || 1);
                }
                setSeedSavedMsg('✅ بذر سرور چرخش یافت و بذر قبلی در فرم راستی‌آزمایی زیر بارگذاری شد.');
                setTimeout(() => setSeedSavedMsg(null), 4000);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              چرخش Server Seed و افشای بذر فعلی ↻
            </button>
          </div>
        </div>

        {seedSavedMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-xs font-bold">
            {seedSavedMsg}
          </div>
        )}

        {/* Active Pre-Commitment Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#0b0f18] border border-white/10 rounded-2xl p-4">
          <div className="lg:col-span-7 space-y-1">
            <span className="text-[11px] text-slate-400 block">
              تعهد فعلی بذر سرور (Active Server Seed SHA-256 Commitment — ثبت‌شده قبل از شرط):
            </span>
            <code
              data-testid="active-commitment-hash"
              className="text-xs font-mono text-emerald-300 break-all block"
              dir="ltr"
            >
              {provablyFairSeeds.serverSeedHash}
            </code>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] text-slate-400 block mb-1">
                بذر کلاینت شما (Editable Client Seed):
              </label>
              <input
                type="text"
                dir="ltr"
                value={editClientSeed}
                onChange={(e) => setEditClientSeed(e.target.value)}
                className="w-full bg-[#141923] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-amber-300"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                await updateProvablyFairClientSeed(editClientSeed);
                setVerifyClientSeed(editClientSeed);
                setSeedSavedMsg('✅ بذر کلاینت جدید ذخیره شد.');
                setTimeout(() => setSeedSavedMsg(null), 3000);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              بروزرسانی Client Seed
            </button>
          </div>
        </div>

        {/* Verifier Inputs + Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3 bg-[#0b0f18] border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-black text-white">ورودی‌های تابع HMAC-SHA256 جهت بازمحاسبه مستقل</h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Revealed Server Seed:</label>
              <input
                type="text"
                dir="ltr"
                data-testid="verifier-server-seed-input"
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                className="w-full bg-[#141923] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                SHA-256(Server Seed) Commitment Match:
              </label>
              <div className="bg-[#141923] border border-emerald-500/30 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 break-all" dir="ltr">
                {computedCommitmentHash}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Client Seed:</label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="verifier-client-seed-input"
                  value={verifyClientSeed}
                  onChange={(e) => setVerifyClientSeed(e.target.value)}
                  className="w-full bg-[#141923] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nonce &amp; Round:</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    data-testid="verifier-nonce-input"
                    value={verifyNonce}
                    onChange={(e) => setVerifyNonce(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 bg-[#141923] border border-white/15 rounded-xl px-2.5 py-2 text-xs font-mono text-amber-300"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={verifyRoundCode}
                    onChange={(e) => setVerifyRoundCode(e.target.value)}
                    className="flex-1 bg-[#141923] border border-white/15 rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#0b0f18] border border-emerald-500/35 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-emerald-400">
                ✓ گوی‌های برنده استخراج‌شده از ۵۲ بیت اول HMAC-SHA256:
              </span>
              <span className="text-[11px] font-mono text-amber-300" dir="ltr">
                X₀ = {verificationResult.uniformFloatX.toFixed(12)}
              </span>
            </div>

            <div
              data-testid="verifier-derived-balls"
              className="flex items-center justify-center gap-3 py-2 bg-[#141923] rounded-2xl border border-white/10"
              dir="ltr"
            >
              {verificationResult.drawnMain.map((num) => (
                <span
                  key={num}
                  className="w-11 h-11 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-lg"
                >
                  {String(num).padStart(2, '0')}
                </span>
              ))}
              <span className="text-amber-400 font-black text-lg">+</span>
              <span className="w-12 h-12 rounded-full lottery-ball-purple text-white font-mono font-black text-sm flex items-center justify-center border-2 border-amber-300 shadow-lg">
                ★{String(verificationResult.drawnGolden).padStart(2, '0')}
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1" dir="ltr">
              {verificationResult.cursorSamples.map((sample) => (
                <div
                  key={sample.cursor}
                  className="bg-[#141923] border border-white/5 rounded-xl px-3 py-2 text-[11px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <div className="truncate">
                    <span className="text-slate-400">Cursor {sample.cursor} ({sample.ballType}):</span>{' '}
                    <span className="text-emerald-300">0x{sample.first52BitHex}</span>
                    <span className="text-slate-600">{sample.hmacHex.slice(13, 28)}...</span>
                  </div>
                  <div className="shrink-0 text-amber-300">
                    X={sample.uniformFloatX.toFixed(6)} →{' '}
                    <strong className="text-white">Ball #{sample.mappedNumber}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Verifiable Draw History Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-black text-white">
            تاریخچه قرعه‌کشی‌های انجام‌شده و قابل راستی‌آزمایی (Verifiable Draw History)
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0f18]">
            <table
              data-testid="verifiable-draw-history-table"
              className="w-full text-right text-xs border-collapse"
            >
              <thead>
                <tr className="border-b border-white/10 bg-[#070a10] text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3">Round</th>
                  <th className="py-3 px-3">Winning Numbers</th>
                  <th className="py-3 px-3">52-Bit Float X</th>
                  <th className="py-3 px-3">Server Seed Hash</th>
                  <th className="py-3 px-3">Evaluated / Winners</th>
                  <th className="py-3 px-3">Payout</th>
                  <th className="py-3 px-3">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {drawHistory.map((d) => (
                  <tr key={d.drawId} className="hover:bg-white/5">
                    <td className="py-3 px-3 text-amber-300 font-bold" dir="ltr">
                      {d.roundCode} (#{d.nonce})
                    </td>
                    <td className="py-3 px-3 text-white font-bold" dir="ltr">
                      [{d.drawnMain.join(', ')}] + ★{d.drawnGolden}
                    </td>
                    <td className="py-3 px-3 text-sky-300" dir="ltr">
                      {d.uniformFloatX.toFixed(8)} (0x{d.first52BitHex})
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[160px]" dir="ltr">
                      {d.serverSeedHash.slice(0, 18)}...
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {toPersianDigits(d.ticketsEvaluatedCount)} بلیت / {toPersianDigits(d.winnersCount)} برنده
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-black" dir="ltr">
                      ${d.totalPayoutUsdt.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleLoadDrawRecord(d)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer"
                      >
                        تست در ماشین‌حساب ↑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 1. Interactive Binomial Odds & Expected Value (EV) Calculator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400">BINOMIAL PROBABILITY &amp; EV SIMULATOR</span>
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
          </div>

          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
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

      {/* 2. Full Combinatorial Probability Table */}
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
