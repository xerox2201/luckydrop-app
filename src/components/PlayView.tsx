import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  convertUsdtToCrypto,
  toPersianDigits,
  computeDeterministicHash,
} from '../utils/lotteryEngine.ts';

export const PlayView: React.FC = () => {
  const {
    selectedMainBalls,
    setSelectedMainBalls,
    selectedGoldenBall,
    setSelectedGoldenBall,
    fxRates,
    formatAmount,
    balanceUsdt,
    mintTicket,
    navigateTo,
    setDepositModalOpen,
    killSwitchActive,
  } = useLottery();

  const [selectedNetwork, setSelectedNetwork] = useState<string>('USDT (TRC-20)');
  const [clientSeed, setClientSeed] = useState<string>(() =>
    'zarrin_vip_' + Math.random().toString(16).substring(2, 12)
  );
  const [minting, setMinting] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const ticketPriceUsdt = 2.0;

  const toggleMainBall = (num: number) => {
    setFeedbackError(null);
    if (selectedMainBalls.includes(num)) {
      setSelectedMainBalls(selectedMainBalls.filter((n) => n !== num));
    } else {
      if (selectedMainBalls.length >= 5) {
        // Replace oldest selected ball for smooth UX
        setSelectedMainBalls([...selectedMainBalls.slice(1), num].sort((a, b) => a - b));
      } else {
        setSelectedMainBalls([...selectedMainBalls, num].sort((a, b) => a - b));
      }
    }
  };

  const handleAiQuickPick = () => {
    setFeedbackError(null);
    const pool: number[] = [];
    while (pool.length < 5) {
      const candidate = Math.floor(Math.random() * 50) + 1;
      if (!pool.includes(candidate)) pool.push(candidate);
    }
    pool.sort((a, b) => a - b);
    const golden = Math.floor(Math.random() * 15) + 1;
    setSelectedMainBalls(pool);
    setSelectedGoldenBall(golden);
    setClientSeed('ai_entropy_' + Date.now().toString(16));
  };

  const handlePurchaseTicket = async () => {
    setFeedbackError(null);
    if (selectedMainBalls.length !== 5) {
      setFeedbackError('لطفاً دقیقاً ۵ عدد اصلی از جدول ۱ تا ۵۰ انتخاب نمایید.');
      return;
    }
    setMinting(true);
    const result = await mintTicket(selectedNetwork);
    setMinting(false);
    if (!result.ok) {
      setFeedbackError(result.error || 'خطا در صدور بلیط.');
      return;
    }
    navigateTo('status');
  };

  const liveCommitHash = computeDeterministicHash(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    clientSeed,
    482
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#171d2c] via-[#131824] to-[#1a1329] border border-amber-500/30 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">confirmation_number</span>
            <span>ترمینال انتخاب اعداد و صدور کوپن قرارداد هوشمند • دور #۴۸۲</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            انتخاب ۵ گوی اصلی + ۱ گوی طلایی شانس
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            با تطابق ۵ عدد اصلی و ۱ گوی طلایی، برنده جک‌پات بزرگ{' '}
            <strong className="text-amber-400">{formatAmount(184500)}</strong> خواهید شد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="ai-quick-pick-btn"
            onClick={handleAiQuickPick}
            className="px-5 py-3.5 rounded-2xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-400/40 text-purple-200 font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(147,51,234,0.3)]"
          >
            <span className="material-symbols-outlined text-amber-300">auto_awesome</span>
            <span>انتخاب هوشمند با آنتروپی کوانتومی (AI Quick-Pick)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMainBalls([])}
            className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold"
          >
            پاکسازی جدول
          </button>
        </div>
      </div>

      {/* Main Terminal Grid + Live Ticket Slip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Right 8 Cols: 50-Number Main Grid + 15 Golden Ball Selector */}
        <div className="lg:col-span-8 space-y-6">
          {/* 50-Number Grid (Pick 5) */}
          <div className="rounded-3xl bg-[#131824] border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  مرحله اول: ۵ عدد از جدول ۱ تا ۵۰ انتخاب کنید
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تعداد انتخاب‌شده:{' '}
                  <strong className="text-amber-400">
                    {toPersianDigits(selectedMainBalls.length)} از ۵ گوی
                  </strong>
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-mono font-bold">
                PICK 5 / 50
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5" dir="ltr">
              {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedMainBalls.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    data-testid={`main-ball-${num}`}
                    onClick={() => toggleMainBall(num)}
                    className={`h-12 rounded-2xl font-mono font-black text-sm transition-all flex items-center justify-center ${
                      isSelected
                        ? 'lottery-ball-gold text-slate-950 scale-105 border-2 border-amber-200'
                        : 'bg-[#1a2130] hover:bg-[#232c40] text-slate-300 border border-white/5'
                    }`}
                  >
                    {String(num).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 15 Golden Ball Selector (Pick 1) */}
          <div className="rounded-3xl bg-gradient-to-br from-[#191528] to-[#121723] border border-purple-500/35 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>مرحله دوم: انتخاب ۱ گوی طلایی ویژه (Golden Mega Ball)</span>
                </h2>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  گوی طلایی ضریب جک‌پات شما را تا سقف ۱۵.۲ میلیارد تومان فعال می‌کند.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-mono font-bold">
                PICK 1 / 15 ★
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-15 gap-2.5" dir="ltr">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((gNum) => {
                const isSelected = selectedGoldenBall === gNum;
                return (
                  <button
                    key={gNum}
                    type="button"
                    data-testid={`golden-ball-${gNum}`}
                    onClick={() => setSelectedGoldenBall(gNum)}
                    className={`h-12 rounded-full font-mono font-black text-sm transition-all flex items-center justify-center ${
                      isSelected
                        ? 'lottery-ball-purple text-white scale-110 border-2 border-amber-300 shadow-[0_0_20px_rgba(168,85,247,0.75)]'
                        : 'bg-[#211b34] hover:bg-[#2c2445] text-purple-200 border border-purple-500/20'
                    }`}
                  >
                    {String(gNum).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Seed & Provably Fair Cryptographic Commitment */}
          <div className="rounded-3xl bg-[#131824] border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">lock</span>
                <span>بذر اختصاصی سمت کاربر (Provably Fair Client Seed)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">SHA-256 Deterministic</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="text"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                className="sm:col-span-5 bg-[#0a0e16] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono"
              />
              <div className="sm:col-span-7 bg-[#0a0e16] border border-white/5 rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 overflow-hidden">
                <span className="truncate">Commit: {liveCommitHash}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right/Left 4 Cols: Live Ticket Slip & Instant Crypto Pricing */}
        <div className="lg:col-span-4 rounded-3xl bg-[#151b28] border-2 border-amber-500/40 p-6 space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.75)] sticky top-24">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] text-amber-400 font-bold block">WEB3 SMART TICKET SLIP</span>
              <h3 className="text-xl font-black text-white">کوپن دیجیتال بلیط شما</h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold">
              ROUND #482
            </span>
          </div>

          {/* Selected Balls Preview */}
          <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-3">
            <span className="text-xs text-slate-400 block">ترکیب انتخابی شما در بلاکچین:</span>
            <div className="flex items-center justify-center gap-2 py-1" dir="ltr">
              {[0, 1, 2, 3, 4].map((idx) => {
                const val = selectedMainBalls[idx];
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-sm ${
                      val
                        ? 'lottery-ball-gold text-slate-950'
                        : 'bg-white/5 border border-dashed border-white/20 text-slate-500'
                    }`}
                  >
                    {val ? String(val).padStart(2, '0') : '?'}
                  </div>
                );
              })}
              <span className="text-amber-400 font-black">+</span>
              <div className="w-11 h-11 rounded-full lottery-ball-purple text-white flex items-center justify-center font-mono font-black text-sm border border-amber-300">
                ★{String(selectedGoldenBall).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Instantaneous Multi-Crypto Price Breakdown */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>قیمت پایه بلیط (USDT):</span>
              <span className="font-mono font-black text-white">${ticketPriceUsdt.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>معادل لحظه‌ای به ارز انتخابی:</span>
              <span className="font-black text-amber-400">{formatAmount(ticketPriceUsdt)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#0c1018] border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">معادل شبکه TRON</span>
                <strong className="font-mono text-rose-400 text-xs">
                  {convertUsdtToCrypto(ticketPriceUsdt, 'TRX', fxRates)} TRX
                </strong>
              </div>
              <div className="bg-[#0c1018] border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">معادل شبکه TON</span>
                <strong className="font-mono text-sky-400 text-xs">
                  {convertUsdtToCrypto(ticketPriceUsdt, 'TON', fxRates)} TON
                </strong>
              </div>
            </div>
          </div>

          {/* Settlement Network Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              شبکه ثبت کوپن در بلاکچین:
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full bg-[#0c1018] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold"
            >
              <option value="USDT (TRC-20)">Tether USDT (TRC-20 • بدون کارمزد)</option>
              <option value="TON Network">The Open Network (TON • تلگرام)</option>
              <option value="TRON (TRX)">TRON Native (TRX)</option>
              <option value="BNB (BEP-20)">BNB Smart Chain (BEP-20)</option>
            </select>
          </div>

          {feedbackError && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold">
              ⚠️ {feedbackError}
            </div>
          )}

          {/* Mint Button */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={minting || killSwitchActive}
              data-testid="mint-ticket-submit"
              onClick={handlePurchaseTicket}
              className="w-full py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-base shadow-[0_10px_25px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">verified</span>
              <span>
                {killSwitchActive
                  ? 'فروش بلیط موقتاً متوقف است (Kill-Switch)'
                  : minting
                  ? 'در حال صدور کوپن در بلاکچین...'
                  : 'ثبت نهایی و صدور آنی بلیط در بلاکچین'}
              </span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>موجودی فعلی: {formatAmount(balanceUsdt)}</span>
              <button
                type="button"
                onClick={() => setDepositModalOpen(true)}
                className="text-amber-400 hover:underline font-bold"
              >
                + افزایش موجودی کریپتو
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
