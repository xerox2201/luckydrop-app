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
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-14 space-y-8">
      {/* Studio Header */}
      <div className="relative rounded-3xl overflow-hidden studio-arena-frame p-6 sm:p-9">
        <img
          src={LUXURY_IMAGES.fairnessAudit}
          alt="Provably Fair Padlock"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f212e]/95 via-[#0f212e]/88 to-[#1a2c38]/92 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={LUXURY_IMAGES.shieldIcon3d}
              alt="Security Shield"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#00e701]/70 shadow-xl shrink-0"
            />
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#00e701]/15 border border-[#00e701]/40 text-[#00e701] text-xs font-mono font-bold">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>PROVABLY FAIR HMAC-SHA256 (52-BIT FLOAT) VERIFIER</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white">
                راستی‌آزمای رمزنگاری Provably Fair و مرکز شفافیت ریاضی
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                تبدیل ۵۲ بیت اول خروجی <code className="text-[#fbbf24]">HMAC-SHA256(serverSeed, clientSeed:nonce:round:cursor)</code> به عدد اعشاری یکنواخت <code className="text-[#00e701]">X = parseInt(hex.slice(0,13), 16) / 2^52</code> در بازه <code className="text-[#00e701]">[0, 1)</code> برای استخراج ۱۰۰٪ قطعی و غیرقابل‌دستکاری نتایج.
              </p>
            </div>
          </div>

          {/* 4-Step Cryptographic Pipeline Badges */}
          <div className="grid grid-cols-2 gap-2 shrink-0 font-mono text-[11px]" dir="ltr">
            <div className="bg-[#1a2c38] border border-white/[0.08] rounded-xl px-3 py-2">
              <span className="text-slate-400 block">01. COMMIT</span>
              <strong className="text-[#00e701]">SHA-256(ServerSeed)</strong>
            </div>
            <div className="bg-[#1a2c38] border border-white/[0.08] rounded-xl px-3 py-2">
              <span className="text-slate-400 block">02. ENTROPY</span>
              <strong className="text-[#fbbf24]">ClientSeed + Nonce</strong>
            </div>
            <div className="bg-[#1a2c38] border border-white/[0.08] rounded-xl px-3 py-2">
              <span className="text-slate-400 block">03. EXTRACT</span>
              <strong className="text-sky-300">First 13 Hex (52-Bit)</strong>
            </div>
            <div className="bg-[#1a2c38] border border-white/[0.08] rounded-xl px-3 py-2">
              <span className="text-slate-400 block">04. AUDIT</span>
              <strong className="text-white">Rotate &amp; Reveal</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 0. STEP-BY-STEP VISUAL PIPELINE: ACTIVE SEEDS & INTERACTIVE HMAC-SHA256 VERIFIER */}
      <section
        data-testid="provably-fair-verifier-section"
        className="studio-arena-frame rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-[#00e701]">
              STEP-BY-STEP HMAC-SHA256 &amp; 52-BIT UNIFORM FLOAT [0, 1) PIPELINE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              ماشین‌حساب راستی‌آزمایی مستقل قرعه‌کشی‌ها و چرخش بذر رمزنگاری (Rotate Seed Pair)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#1a2c38] border border-[#fbbf24]/40 text-xs font-mono font-bold text-[#fbbf24] tabular-nums" dir="ltr">
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
              className="px-4 py-2 rounded-xl stake-emerald-cta font-black text-xs cursor-pointer whitespace-nowrap"
            >
              چرخش Server Seed و افشای بذر فعلی ↻
            </button>
          </div>
        </div>

        {seedSavedMsg && (
          <div className="p-3.5 rounded-2xl bg-[#00e701]/15 border border-[#00e701]/50 text-[#00e701] text-xs font-bold">
            {seedSavedMsg}
          </div>
        )}

        {/* Step 1 & Step 2: Active Pre-Commitment Bar + Client Seed Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4">
          <div className="lg:col-span-7 space-y-1">
            <span className="text-[11px] font-bold text-slate-300 block">
              ۱. تعهد فعلی بذر سرور (Active Server Seed SHA-256 Commitment — ثبت‌شده قبل از شرط):
            </span>
            <code
              data-testid="active-commitment-hash"
              className="text-xs font-mono text-[#00e701] break-all block"
              dir="ltr"
            >
              {provablyFairSeeds.serverSeedHash}
            </code>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                ۲. بذر کلاینت شما (Editable Client Seed):
              </label>
              <input
                type="text"
                dir="ltr"
                value={editClientSeed}
                onChange={(e) => setEditClientSeed(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-[#fbbf24]"
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
              className="px-4 py-2 rounded-xl gold-gradient-cta font-black text-xs cursor-pointer whitespace-nowrap"
            >
              بروزرسانی Client Seed
            </button>
          </div>
        </div>

        {/* Step 3 & Step 4: Verifier Inputs + 52-Bit Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-sm font-black text-white">
              ۳. ورودی‌های تابع HMAC-SHA256 جهت بازمحاسبه مستقل
            </h3>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Revealed Server Seed:</label>
              <input
                type="text"
                dir="ltr"
                data-testid="verifier-server-seed-input"
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-[#00e701]"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">
                SHA-256(Server Seed) Commitment Match:
              </label>
              <div
                className="bg-[#0f212e] border border-[#00e701]/30 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 break-all"
                dir="ltr"
              >
                {computedCommitmentHash}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Client Seed:</label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="verifier-client-seed-input"
                  value={verifyClientSeed}
                  onChange={(e) => setVerifyClientSeed(e.target.value)}
                  className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Nonce &amp; Round:</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    data-testid="verifier-nonce-input"
                    value={verifyNonce}
                    onChange={(e) => setVerifyNonce(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 studio-input-well rounded-xl px-2.5 py-2 text-xs font-mono text-[#fbbf24] tabular-nums"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={verifyRoundCode}
                    onChange={(e) => setVerifyRoundCode(e.target.value)}
                    className="flex-1 studio-input-well rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#1a2c38] border border-[#00e701]/35 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-[#00e701]">
                ۴. گوی‌های برنده استخراج‌شده از ۵۲ بیت اول HMAC-SHA256:
              </span>
              <span className="text-[11px] font-mono text-[#fbbf24] tabular-nums" dir="ltr">
                X₀ = {verificationResult.uniformFloatX.toFixed(12)}
              </span>
            </div>

            <div
              data-testid="verifier-derived-balls"
              className="flex items-center justify-center gap-3 py-3 bg-[#0f212e] rounded-2xl border border-white/[0.08]"
              dir="ltr"
            >
              {verificationResult.drawnMain.map((num) => (
                <span
                  key={num}
                  className="w-11 h-11 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-lg tabular-nums"
                >
                  {String(num).padStart(2, '0')}
                </span>
              ))}
              <span className="text-[#fbbf24] font-black text-lg">+</span>
              <span className="w-12 h-12 rounded-full lottery-ball-purple text-white font-mono font-black text-sm flex items-center justify-center border-2 border-[#fbbf24] shadow-lg tabular-nums">
                ★{String(verificationResult.drawnGolden).padStart(2, '0')}
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scroll" dir="ltr">
              {verificationResult.cursorSamples.map((sample) => (
                <div
                  key={sample.cursor}
                  className="bg-[#0f212e] border border-white/[0.06] rounded-xl px-3 py-2 text-[11px] font-mono tabular-nums flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <div className="truncate">
                    <span className="text-slate-400">Cursor {sample.cursor} ({sample.ballType}):</span>{' '}
                    <span className="text-[#00e701]">0x{sample.first52BitHex}</span>
                    <span className="text-slate-600">{sample.hmacHex.slice(13, 28)}...</span>
                  </div>
                  <div className="shrink-0 text-[#fbbf24]">
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
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#1a2c38]">
            <table
              data-testid="verifiable-draw-history-table"
              className="w-full text-right text-xs border-collapse"
            >
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0f212e] text-slate-300 font-mono text-[11px]">
                  <th className="py-3 px-3">Round</th>
                  <th className="py-3 px-3">Winning Numbers</th>
                  <th className="py-3 px-3">52-Bit Float X</th>
                  <th className="py-3 px-3">Server Seed Hash</th>
                  <th className="py-3 px-3">Evaluated / Winners</th>
                  <th className="py-3 px-3">Payout</th>
                  <th className="py-3 px-3">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] font-mono text-[11px] tabular-nums">
                {drawHistory.map((d) => (
                  <tr key={d.drawId} className="hover:bg-white/[0.04]">
                    <td className="py-3 px-3 text-[#fbbf24] font-bold" dir="ltr">
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
                    <td className="py-3 px-3 text-[#00e701] font-black" dir="ltr">
                      ${d.totalPayoutUsdt.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleLoadDrawRecord(d)}
                        className="px-2.5 py-1 rounded-lg bg-[#213743] hover:bg-[#2f4553] border border-[#00e701]/40 text-[#00e701] text-[10px] font-bold cursor-pointer whitespace-nowrap"
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

      {/* 1. Interactive Binomial Odds & Expected Value (EV) Calculator + Proof of Reserves */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 studio-arena-frame rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-[#fbbf24]">
                BINOMIAL PROBABILITY &amp; EV SIMULATOR
              </span>
              <h2 className="text-xl font-black text-white mt-0.5">
                ماشین‌حساب شانس برد و امید ریاضی (EV)
              </h2>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#1a2c38] border border-[#fbbf24]/30 text-[#fbbf24] font-mono font-bold text-xs tabular-nums">
              RTP: 85.0%
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">تعداد بلیط‌های خریداری‌شده در یک دور:</span>
              <span
                className="text-lg font-black text-[#fbbf24] font-mono tabular-nums"
                data-testid="ev-ticket-count"
              >
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
              className="w-full accent-[#fbbf24] cursor-pointer h-2 bg-[#213743] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">سرمایه‌گذاری کل شما:</span>
              <strong
                className="text-lg font-black text-white font-mono tabular-nums block"
                data-testid="ev-total-cost"
              >
                {formatAmount(stats.totalCostUsdt)}
              </strong>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                ${stats.totalCostUsdt} USDT
              </span>
            </div>

            <div className="bg-[#1a2c38] border border-[#00e701]/35 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400 block">احتمال برد حداقل یک جایزه (Binomial):</span>
              <strong
                className="text-2xl font-black text-[#00e701] font-mono tabular-nums block"
                data-testid="ev-any-prize-prob"
              >
                {stats.anyPrizeProbabilityPercent}%
              </strong>
              <span className="text-[11px] text-slate-300">بر پایه توزیع دوجمعی ۱ - (1 - p)^n</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="w-full py-3.5 rounded-xl gold-gradient-cta font-black text-sm cursor-pointer"
          >
            خرید {toPersianDigits(ticketCount)} بلیط با این ضریب احتمال ←
          </button>
        </div>

        {/* Public Multi-Signature Solvency Proof Vaults */}
        <div className="lg:col-span-6 studio-arena-frame rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-[#00e701]">
                100% VERIFIABLE ON-CHAIN SOLVENCY
              </span>
              <h2 className="text-xl font-black text-white mt-0.5">
                آدرس خزانه‌های چندامضایی عمومی (Proof of Reserves)
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#1a2c38] border border-[#00e701]/30 text-[#00e701] text-xs font-mono font-bold">
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
                className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{vault.title}</span>
                  <span className="text-xs font-mono font-black text-[#00e701] tabular-nums">
                    {vault.balance}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#213743] rounded-xl px-3 py-2">
                  <code className="text-[11px] font-mono text-[#fbbf24] truncate">{vault.address}</code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyAddress(vault.address)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white font-bold cursor-pointer"
                    >
                      {copiedVault === vault.address ? 'کپی شد!' : 'کپی'}
                    </button>
                    <a
                      href={vault.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-[#fbbf24]/20 text-[#fbbf24] text-[10px] font-bold"
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
      <section className="studio-arena-frame rounded-3xl p-6 sm:p-8 space-y-5">
        <div>
          <span className="text-xs font-mono font-bold text-[#fbbf24]">
            COMBINATORIAL PROBABILITY MATRIX
          </span>
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
            <tbody className="divide-y divide-white/[0.06] tabular-nums">
              {COMBINATORIAL_TIERS.map((row) => (
                <tr key={row.tier} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-4 px-4 font-black text-[#fbbf24]">{row.tier}</td>
                  <td className="py-4 px-4 font-bold text-white">{row.matchPattern}</td>
                  <td className="py-4 px-4 font-mono text-slate-300">{row.oddsText}</td>
                  <td className="py-4 px-4 font-bold text-[#00e701] font-mono">{row.poolShare}</td>
                  <td className="py-4 px-4 font-black text-white font-mono">
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
