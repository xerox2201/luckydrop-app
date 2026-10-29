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

  // Interactive HMAC-SHA256 52-Bit Float Verifier State (for completed draws)
  const initialHistory = drawHistory[0];
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>(
    initialHistory?.serverSeed ||
      provablyFairSeeds.previousServerSeed ||
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  );
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>(
    initialHistory?.clientSeed || provablyFairSeeds.clientSeed || 'luckydrop_vip_client_seed'
  );
  const [verifyNonce, setVerifyNonce] = useState<number>(initialHistory?.nonce || 1);
  const [verifyRoundCode, setVerifyRoundCode] = useState<string>(
    initialHistory?.roundCode || '#LD-8492'
  );
  const [editClientSeed, setEditClientSeed] = useState<string>(provablyFairSeeds.clientSeed);
  const [seedSavedMsg, setSeedSavedMsg] = useState<string | null>(null);

  const stats = calculateBinomialOddsAndEV(ticketCount, 5, 250000, 85);

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
    <div className="space-y-4 px-3 pt-2 pb-24">
      {/* Studio Header */}
      <div className="relative rounded-2xl overflow-hidden studio-arena-frame p-4">
        <img
          src={LUXURY_IMAGES.fairnessAudit}
          alt="Provably Fair Padlock"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f212e]/95 via-[#0f212e]/88 to-[#1a2c38]/92 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <img
              src={LUXURY_IMAGES.shieldIcon3d}
              alt="Security Shield"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-[#00e701]/70 shadow-lg shrink-0"
            />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#00e701]/15 border border-[#00e701]/40 text-[#00e701] text-[10px] font-mono font-bold">
                <span>LUCKYDROP • POST-DRAW VERIFIER (52-BIT)</span>
              </div>
              <h1 className="text-base font-black text-white">
                مرکز راستی‌آزمایی پس از قرعه‌کشی و بازی‌ها (LuckyDrop)
              </h1>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            جهت جلوگیری از هرگونه پیش‌بینی قبل از قرعه‌کشی، بذر سرور و کد هش (<code className="text-[#fbbf24]">hash</code>) بلافاصله <strong>پس از پایان هر دور قرعه‌کشی یا بازی</strong> منتشر می‌شوند تا هر بازیکن بتواند نتیجه را با فرمول <code className="text-[#00e701]">HMAC-SHA256</code> بازمحاسبه کند.
          </p>
        </div>
      </div>

      {/* 0. STEP-BY-STEP VISUAL PIPELINE: CLIENT SEED & INTERACTIVE POST-DRAW HMAC-SHA256 VERIFIER */}
      <section
        data-testid="provably-fair-verifier-section"
        className="studio-arena-frame rounded-2xl p-4 space-y-4"
      >
        <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#00e701]">
              POST-DRAW HMAC-SHA256 &amp; 52-BIT UNIFORM FLOAT [0, 1) VERIFIER
            </span>
            <h2 className="text-sm font-black text-white mt-0.5">
              ماشین‌حساب راستی‌آزمایی دورهای انجام‌شده (LuckyDrop)
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-[#1a2c38] border border-[#fbbf24]/40 text-[11px] font-mono font-bold text-[#fbbf24] tabular-nums" dir="ltr">
              Completed Nonce: #{verifyNonce}
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
                setSeedSavedMsg('✅ دور قبلی بسته شد و بذر افشاشده در فرم راستی‌آزمایی زیر بارگذاری گردید.');
                setTimeout(() => setSeedSavedMsg(null), 4000);
              }}
              className="px-3 py-1.5 rounded-xl stake-emerald-cta font-black text-[11px] cursor-pointer whitespace-nowrap"
            >
              دریافت بذر دور پایان‌یافته ↻
            </button>
          </div>
        </div>

        {seedSavedMsg && (
          <div className="p-3 rounded-xl bg-[#00e701]/15 border border-[#00e701]/50 text-[#00e701] text-xs font-bold">
            {seedSavedMsg}
          </div>
        )}

        {/* Client Seed Editor (No pre-draw active server hash exposed) */}
        <div className="space-y-2.5 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-300 leading-relaxed">
            🔒 کد هش (<code className="font-mono text-[#fbbf24]">hash</code>) دور فعال تا زمان اتمام قرعه‌کشی مخفی می‌ماند و بلافاصله پس از پایان دور در جدول تاریخچه زیر منتشر می‌شود.
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                بذر کلاینت شما (Editable Client Seed):
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
              className="px-3 py-2 rounded-xl gold-gradient-cta font-black text-xs cursor-pointer whitespace-nowrap"
            >
              ذخیره Seed
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Client Seed:</label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="verifier-client-seed-input"
                  value={verifyClientSeed}
                  onChange={(e) => setVerifyClientSeed(e.target.value)}
                  className="w-full min-w-0 studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-white"
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
                    className="w-20 shrink-0 studio-input-well rounded-xl px-2.5 py-2 text-xs font-mono text-[#fbbf24] tabular-nums"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={verifyRoundCode}
                    onChange={(e) => setVerifyRoundCode(e.target.value)}
                    className="flex-1 min-w-0 studio-input-well rounded-xl px-2.5 py-2 text-xs font-mono text-white"
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
                    <td className="py-3 px-3 text-slate-300 break-all min-w-[200px]" dir="ltr">
                      <span className="text-[#a855f7] font-bold mr-1">hash</span>
                      {d.serverSeedHash}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {toPersianDigits(d.ticketsEvaluatedCount)} بلیت / {toPersianDigits(d.winnersCount)} برنده
                    </td>
                    <td className="py-3 px-3 text-[#00e701] font-black" dir="ltr">
                      {formatAmount(d.totalPayoutUsdt)}
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
      <section className="space-y-4">
        <div className="studio-arena-frame rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#fbbf24]">
                BINOMIAL PROBABILITY &amp; EV SIMULATOR
              </span>
              <h2 className="text-sm font-black text-white mt-0.5">
                ماشین‌حساب شانس برد و امید ریاضی (EV)
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-[#1a2c38] border border-[#fbbf24]/30 text-[#fbbf24] font-mono font-bold text-xs tabular-nums">
              RTP: 85.0%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">تعداد بلیط‌های خریداری‌شده در یک دور:</span>
              <span
                className="text-base font-black text-[#fbbf24] font-mono tabular-nums"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 block">سرمایه‌گذاری کل شما:</span>
              <strong
                className="text-sm font-black text-white font-mono tabular-nums block"
                data-testid="ev-total-cost"
              >
                {formatAmount(stats.totalCostUsdt)}
              </strong>
              <span className="text-[10px] font-mono text-purple-300/60 tabular-nums" dir="ltr">
                {(stats.totalCostUsdt / 5).toFixed(2)} TON • {Math.round(stats.totalCostUsdt * 50).toLocaleString('en-US')} ⭐
              </span>
            </div>

            <div className="bg-[#1a2c38] border border-[#00e701]/35 rounded-2xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 block">احتمال برد حداقل یک جایزه:</span>
              <strong
                className="text-lg font-black text-[#00e701] font-mono tabular-nums block"
                data-testid="ev-any-prize-prob"
              >
                {stats.anyPrizeProbabilityPercent}%
              </strong>
              <span className="text-[10px] text-slate-300">توزیع دوجمعی ۱ - (1 - p)^n</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="w-full py-3 rounded-xl gold-gradient-cta font-black text-xs cursor-pointer"
          >
            خرید {toPersianDigits(ticketCount)} بلیط با این ضریب احتمال ←
          </button>
        </div>

        {/* Public Multi-Signature Solvency Proof Vaults */}
        <div className="studio-arena-frame rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#00e701]">
                100% VERIFIABLE ON-CHAIN SOLVENCY
              </span>
              <h2 className="text-sm font-black text-white mt-0.5">
                آدرس خزانه‌های چندامضایی عمومی (Proof of Reserves)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-[#1a2c38] border border-[#00e701]/30 text-[#00e701] text-[10px] font-mono font-bold">
              3-of-5 Multi-Sig
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: 'خزانه اصلی جوایز شبکه تون (LuckyDrop TON Multi-Sig Vault)',
                balance: '50,000.00 TON',
                address: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
                explorer: 'https://tonviewer.com/UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
              },
              {
                title: 'خزانه پشتیبان ستاره‌های تلگرام (LuckyDrop Stars Reserve)',
                balance: '12,500,000 ⭐',
                address: 'UQB9xV7kM2nPqR8tW4yZ1cF5hJ6kL0mN3pQ_StarsPool',
                explorer: 'https://tonviewer.com/UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
              },
            ].map((vault) => (
              <div
                key={vault.address}
                className="bg-[#1a2c38] border border-white/[0.07] rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">{vault.title}</span>
                  <span className="text-xs font-mono font-black text-[#00e701] tabular-nums" dir="ltr">
                    {vault.balance}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#213743] rounded-lg px-2.5 py-1.5">
                  <code className="text-[10px] font-mono text-[#fbbf24] break-all">{vault.address}</code>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyAddress(vault.address)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white font-bold cursor-pointer"
                    >
                      {copiedVault === vault.address ? 'کپی شد!' : 'کپی'}
                    </button>
                    <a
                      href={vault.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-[#fbbf24]/20 text-[#fbbf24] text-[10px] font-bold"
                    >
                      استعلام ↗
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Full Combinatorial Probability Table */}
      <section className="studio-arena-frame rounded-2xl p-4 space-y-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#fbbf24]">
            COMBINATORIAL PROBABILITY MATRIX
          </span>
          <h2 className="text-sm font-black text-white mt-0.5">
            جدول کامل سطوح جوایز و احتمال دقیق ریاضی (Tier 1 تا Tier 5)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-2">سطح جایزه</th>
                <th className="py-2.5 px-2">الگوی تطابق</th>
                <th className="py-2.5 px-2">ضریب احتمال</th>
                <th className="py-2.5 px-2">سهم استخر</th>
                <th className="py-2.5 px-2">جایزه تخمینی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] tabular-nums">
              {COMBINATORIAL_TIERS.map((row) => (
                <tr key={row.tier} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-2.5 px-2 font-black text-[#fbbf24]">{row.tier}</td>
                  <td className="py-2.5 px-2 font-bold text-white">{row.matchPattern}</td>
                  <td className="py-2.5 px-2 font-mono text-slate-300" dir="ltr">{row.oddsText}</td>
                  <td className="py-2.5 px-2 font-bold text-[#00e701] font-mono" dir="ltr">{row.poolShare}</td>
                  <td className="py-2.5 px-2 font-black text-white font-mono" dir="ltr">
                    {formatAmount(row.estimatedPrizeUsdt)}
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
