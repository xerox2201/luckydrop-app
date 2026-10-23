import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  MULTI_LOTTERY_SPECS,
  LotteryTypeId,
  calculateBulkCartSummary,
  toPersianDigits,
  computeDeterministicHash,
} from '../utils/lotteryEngine.ts';
import { PageHeroBanner, LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const PlayView: React.FC = () => {
  const {
    activeLotteryId,
    setActiveLotteryId,
    activeLotterySpec,
    lotteryTimers,
    selectedMainBalls,
    setSelectedMainBalls,
    selectedGoldenBall,
    setSelectedGoldenBall,
    bulkSlips,
    setBulkSlips,
    activeSlipIndex,
    setActiveSlipIndex,
    setBulkTicketCount,
    triggerBulkAiQuickPick,
    fxRates,
    formatAmount,
    balanceUsdt,
    mintBulkTickets,
    navigateTo,
    setDepositModalOpen,
    killSwitchActive,
  } = useLottery();

  const [selectedNetwork, setSelectedNetwork] = useState<string>('USDT (TRC-20)');
  const [customCountInput, setCustomCountInput] = useState<number>(bulkSlips.length);
  const [minting, setMinting] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const mainCount = activeLotterySpec.mainCount;
  const mainMax = activeLotterySpec.mainMax;
  const goldenMax = activeLotterySpec.goldenMax;
  const unitPriceUsdt = activeLotterySpec.ticketPriceUsdt;

  const cartSummary = calculateBulkCartSummary(bulkSlips.length, unitPriceUsdt, fxRates);

  const selectSlipTab = (idx: number) => {
    setFeedbackError(null);
    const target = bulkSlips[idx];
    if (!target) return;
    setActiveSlipIndex(idx);
    setSelectedMainBalls(target.mainNumbers);
    setSelectedGoldenBall(target.goldenBall);
  };

  const toggleMainBall = (num: number) => {
    setFeedbackError(null);
    if (selectedMainBalls.includes(num)) {
      setSelectedMainBalls(selectedMainBalls.filter((n) => n !== num));
    } else {
      if (selectedMainBalls.length >= mainCount) {
        setSelectedMainBalls([...selectedMainBalls.slice(1), num].sort((a, b) => a - b));
      } else {
        setSelectedMainBalls([...selectedMainBalls, num].sort((a, b) => a - b));
      }
    }
  };

  const handleSingleSlipQuickPick = () => {
    setFeedbackError(null);
    const pool: number[] = [];
    while (pool.length < mainCount) {
      const candidate = Math.floor(Math.random() * mainMax) + 1;
      if (!pool.includes(candidate)) pool.push(candidate);
    }
    pool.sort((a, b) => a - b);
    const golden = goldenMax > 0 ? Math.floor(Math.random() * goldenMax) + 1 : 0;
    setSelectedMainBalls(pool);
    setSelectedGoldenBall(golden);
  };

  const handleBulkQuickPick5 = () => {
    setFeedbackError(null);
    triggerBulkAiQuickPick(5);
    setCustomCountInput(5);
  };

  const handleSelectBatchCount = (count: number) => {
    setFeedbackError(null);
    setCustomCountInput(count);
    setBulkTicketCount(count);
  };

  const handleUpdateCurrentSlipSeed = (newSeed: string) => {
    setBulkSlips((prev) => {
      const copy = [...prev];
      if (copy[activeSlipIndex]) {
        copy[activeSlipIndex] = { ...copy[activeSlipIndex], clientSeed: newSeed };
      }
      return copy;
    });
  };

  const handlePurchaseBatch = async () => {
    setFeedbackError(null);
    for (let i = 0; i < bulkSlips.length; i++) {
      if (bulkSlips[i].mainNumbers.length !== mainCount) {
        setFeedbackError(
          `لطفاً در کوپن شماره #${toPersianDigits(i + 1)} دقیقاً ${toPersianDigits(
            mainCount
          )} عدد اصلی انتخاب نمایید.`
        );
        setActiveSlipIndex(i);
        return;
      }
    }

    setMinting(true);
    const result = await mintBulkTickets(
      bulkSlips,
      activeLotterySpec.roundCode,
      cartSummary.totalUsdt,
      selectedNetwork
    );
    setMinting(false);

    if (!result.ok) {
      setFeedbackError(result.error || 'خطا در صدور بلیت‌ها.');
      return;
    }
    navigateTo('my-tickets');
  };

  const currentSlipSeed = bulkSlips[activeSlipIndex]?.clientSeed || 'zarrin_vip_seed';
  const liveCommitHash = computeDeterministicHash(
    activeLotterySpec.serverSeedHash,
    currentSlipSeed,
    activeLotterySpec.roundCode
  );

  const countdownSec = lotteryTimers[activeLotteryId] || activeLotterySpec.initialCountdownSec;
  const hrs = Math.floor(countdownSec / 3600);
  const mins = Math.floor((countdownSec % 3600) / 60);
  const secs = countdownSec % 60;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8 overflow-x-clip">
      <PageHeroBanner
        badgeFa="BULK & SINGLE VIP TICKET TERMINAL • ترمینال خرید تکی و دسته‌ای"
        titleFa="صدور آنی بلیت‌های طلایی VIP با تخفیف پلکانی"
        subtitleFa="انتخاب دستی شماره‌ها یا تولید هوشمند ۵ کوپن متمایز با یک کلیک (Bulk AI Quick-Pick) و ثبت آنی در بلاکچین."
        imageUrl={LUXURY_IMAGES.playTicketsBanner}
        iconUrl={LUXURY_IMAGES.ticketIcon3d}
      />

      {/* 1. CONCURRENT MULTI-LOTTERY SELECTOR TABS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="play-multi-lottery-tabs">
        {MULTI_LOTTERY_SPECS.map((spec) => {
          const isSelected = activeLotteryId === spec.id;
          return (
            <button
              key={spec.id}
              type="button"
              data-testid={`lottery-tab-${spec.id}`}
              onClick={() => setActiveLotteryId(spec.id as LotteryTypeId)}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/20 via-[#171d2c] to-amber-500/5 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                  : 'bg-[#131824] border-white/10 text-slate-400 hover:text-white hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                  {spec.roundCode}
                </span>
                <span className="text-xs font-mono font-black text-emerald-400">
                  ${spec.ticketPriceUsdt.toFixed(2)} / بلیت
                </span>
              </div>
              <div className="text-sm font-black text-white truncate">{spec.titleFa}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                <span>جایزه: ${spec.jackpotUsdt.toLocaleString('en-US')}</span>
                <span className="text-amber-300 font-bold">{spec.formatLabel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. HEADER BANNER & BULK AI QUICK-PICK CONTROLS */}
      <div className="rounded-3xl bg-gradient-to-r from-[#171d2c] via-[#131824] to-[#1a1329] border border-amber-500/30 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">confirmation_number</span>
            <span>
              {activeLotterySpec.titleFa} • دور {activeLotterySpec.roundCode} • زمان باقی‌مانده:{' '}
              <strong className="font-mono" dir="ltr">
                {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            ترمینال خرید تکی و دسته‌ای بلیت ({activeLotterySpec.formatLabel})
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            استخر تضمین‌شده این دور:{' '}
            <strong className="text-amber-400">
              ${activeLotterySpec.jackpotUsdt.toLocaleString('en-US')} USDT ({formatAmount(activeLotterySpec.jackpotUsdt)})
            </strong>{' '}
            • تخفیف ۵٪ برای ۵ بلیت و ۱۰٪ برای ۱۰ بلیت همزمان!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="bulk-ai-quick-pick-btn"
            onClick={handleBulkQuickPick5}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600/40 to-amber-500/30 hover:brightness-110 border border-amber-400/50 text-amber-200 font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(147,51,234,0.35)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-amber-300">auto_awesome</span>
            <span>تولید هوشمند ۵ کوپن متمایز (Bulk AI Quick-Pick ×5)</span>
          </button>

          <button
            type="button"
            data-testid="ai-quick-pick-btn"
            onClick={handleSingleSlipQuickPick}
            className="px-4 py-3.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/35 text-purple-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">casino</span>
            <span>انتخاب تصادفی کوپن فعلی</span>
          </button>
        </div>
      </div>

      {/* 3. MULTI-TICKET BATCH SELECTOR & TABBED SLIP EDITOR */}
      <div className="rounded-3xl bg-[#131824] border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 ml-2">
              تعداد بلیت در سبد خرید یکجا (Multi-Chance Batch):
            </span>
            {[1, 3, 5, 10].map((cnt) => (
              <button
                key={cnt}
                type="button"
                data-testid={`batch-count-btn-${cnt}`}
                onClick={() => handleSelectBatchCount(cnt)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  bulkSlips.length === cnt
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-[#0b0f18] border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {toPersianDigits(cnt)} بلیت
                {cnt === 5 ? ' (۵٪ تخفیف)' : cnt === 10 ? ' (۱۰٪ تخفیف)' : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="custom-slip-count" className="text-xs text-slate-400">
              تعداد دلخواه:
            </label>
            <input
              id="custom-slip-count"
              type="number"
              min={1}
              max={25}
              value={customCountInput}
              onChange={(e) => {
                const v = Math.max(1, Math.min(25, Number(e.target.value) || 1));
                setCustomCountInput(v);
                setBulkTicketCount(v);
              }}
              className="w-16 bg-[#0a0e16] border border-white/15 rounded-xl px-2.5 py-1.5 text-center text-xs font-mono font-bold text-amber-300"
              dir="ltr"
            />
          </div>
        </div>

        {/* Tabbed Slip Editor (Ticket #1, #2, #3...) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10" data-testid="bulk-slip-tabs">
          {bulkSlips.map((slip, idx) => {
            const isTabActive = activeSlipIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                data-testid={`slip-tab-${idx + 1}`}
                onClick={() => selectSlipTab(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                  isTabActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                    : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span>Ticket #{idx + 1}</span>
                <span className="text-[10px] text-emerald-400">
                  [{slip.mainNumbers.join(',')}]
                  {goldenMax > 0 ? `+★${slip.goldenBall}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN BALL PICKER + MULTI-CHANCE CART SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Right 8 Cols: Number Grid + Golden Ball Selector */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl bg-[#131824] border border-white/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">
                  مرحله اول (کوپن #{toPersianDigits(activeSlipIndex + 1)}): انتخاب{' '}
                  {toPersianDigits(mainCount)} عدد از جدول ۱ تا {toPersianDigits(mainMax)}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تعداد انتخاب‌شده:{' '}
                  <strong className="text-amber-400">
                    {toPersianDigits(selectedMainBalls.length)} از {toPersianDigits(mainCount)} گوی
                  </strong>
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-mono font-bold">
                PICK {mainCount} / {mainMax}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5" dir="ltr">
              {Array.from({ length: mainMax }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedMainBalls.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    data-testid={`main-ball-${num}`}
                    onClick={() => toggleMainBall(num)}
                    className={`h-12 rounded-2xl font-mono font-black text-sm transition-all flex items-center justify-center cursor-pointer ${
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

          {/* Golden Ball Selector (if goldenMax > 0) */}
          {goldenMax > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-[#191528] to-[#121723] border border-purple-500/35 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">
                    مرحله دوم (کوپن #{toPersianDigits(activeSlipIndex + 1)}): انتخاب ۱ گوی طلایی از ۱ تا{' '}
                    {toPersianDigits(goldenMax)}
                  </h2>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    گوی طلایی ضریب جک‌پات رده اول را فعال می‌کند.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-mono font-bold">
                  PICK 1 / {goldenMax} ★
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-15 gap-2.5" dir="ltr">
                {Array.from({ length: goldenMax }, (_, i) => i + 1).map((gNum) => {
                  const isSelected = selectedGoldenBall === gNum;
                  return (
                    <button
                      key={gNum}
                      type="button"
                      data-testid={`golden-ball-${gNum}`}
                      onClick={() => setSelectedGoldenBall(gNum)}
                      className={`h-12 rounded-full font-mono font-black text-sm transition-all flex items-center justify-center cursor-pointer ${
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
          )}

          {/* Client Seed & Provably Fair Cryptographic Commitment */}
          <div className="rounded-3xl bg-[#131824] border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">lock</span>
                <span>بذر اختصاصی کوپن #{toPersianDigits(activeSlipIndex + 1)} (Client Seed)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">SHA-256 Deterministic</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="text"
                value={currentSlipSeed}
                onChange={(e) => handleUpdateCurrentSlipSeed(e.target.value)}
                className="sm:col-span-5 bg-[#0a0e16] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono"
              />
              <div className="sm:col-span-7 bg-[#0a0e16] border border-white/5 rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 overflow-hidden">
                <span className="truncate">Commit: {liveCommitHash}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right/Left 4 Cols: Multi-Chance Cart Summary & Single-Tx Checkout */}
        <div className="lg:col-span-4 rounded-3xl bg-[#151b28] border-2 border-amber-500/40 p-6 space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.75)] sticky top-24">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] text-amber-400 font-bold block">MULTI-CHANCE SMART CART</span>
              <h3 className="text-xl font-black text-white">
                خلاصه سبد خرید ({toPersianDigits(bulkSlips.length)} کوپن)
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono font-bold">
              {activeLotterySpec.roundCode}
            </span>
          </div>

          {/* All Slips in Cart Preview */}
          <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-3.5 space-y-2 max-h-56 overflow-y-auto" data-testid="cart-slips-list">
            {bulkSlips.map((slip, idx) => (
              <div
                key={idx}
                onClick={() => selectSlipTab(idx)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  activeSlipIndex === idx
                    ? 'bg-amber-500/15 border-amber-400/50 text-white'
                    : 'bg-[#121723] border-white/5 text-slate-300'
                }`}
              >
                <span className="font-mono font-bold text-amber-300">Ticket #{idx + 1}</span>
                <div className="flex items-center gap-1 font-mono" dir="ltr">
                  {slip.mainNumbers.map((n) => (
                    <span
                      key={n}
                      className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[11px]"
                    >
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                  {goldenMax > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[11px]">
                      ★{String(slip.goldenBall).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Live Dynamic Price Oracle Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>قیمت واحد هر بلیت:</span>
              <span className="font-mono font-bold text-white">${unitPriceUsdt.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>تعداد بلیت در تراکنش:</span>
              <span className="font-mono font-bold text-white" data-testid="cart-ticket-count">
                {bulkSlips.length}x
              </span>
            </div>
            {cartSummary.discountPercent > 0 && (
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>تخفیف خرید دسته‌ای ({toPersianDigits(cartSummary.discountPercent)}٪):</span>
                <span className="font-mono">
                  -${(cartSummary.subtotalUsdt - cartSummary.totalUsdt).toFixed(2)} USDT
                </span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
              <span className="font-black text-slate-200">مبلغ کل قابل پرداخت (USDT):</span>
              <span
                data-testid="cart-total-usdt"
                className="font-mono font-black text-lg text-amber-400"
              >
                ${cartSummary.totalUsdt.toFixed(2)} USDT
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>معادل زنده اوراکل (تومان / ارز):</span>
              <span className="font-black text-emerald-400" data-testid="cart-total-fiat">
                {formatAmount(cartSummary.totalUsdt)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-[#0c1018] border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">معادل زنده TON</span>
                <strong className="font-mono text-sky-400 text-xs" data-testid="cart-total-ton">
                  {cartSummary.totalTon} TON
                </strong>
              </div>
              <div className="bg-[#0c1018] border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">معادل زنده TRX</span>
                <strong className="font-mono text-rose-400 text-xs" data-testid="cart-total-trx">
                  {cartSummary.totalTrx} TRX
                </strong>
              </div>
            </div>
          </div>

          {/* Settlement Network Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              شبکه تسویه یکجای سبد خرید:
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
              <option value="Bitcoin (BTC)">Bitcoin (SegWit)</option>
            </select>
          </div>

          {feedbackError && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold">
              ⚠️ {feedbackError}
            </div>
          )}

          {/* Atomic Single-Tx Checkout Button */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={minting || killSwitchActive}
              data-testid="mint-ticket-submit"
              onClick={handlePurchaseBatch}
              className="w-full py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm sm:text-base shadow-[0_10px_25px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">verified</span>
              <span>
                {killSwitchActive
                  ? 'فروش بلیت موقتاً متوقف است (Kill-Switch)'
                  : minting
                  ? 'در حال ثبت دسته‌ای در بلاکچین...'
                  : `پرداخت یکجا و صدور ${toPersianDigits(bulkSlips.length)} بلیت ($${cartSummary.totalUsdt.toFixed(2)})`}
              </span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>موجودی فعلی: {formatAmount(balanceUsdt)}</span>
              <button
                type="button"
                onClick={() => setDepositModalOpen(true)}
                className="text-amber-400 hover:underline font-bold cursor-pointer"
              >
                + شارژ آنی کیف پول
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
