import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  MULTI_LOTTERY_SPECS,
  LotteryTypeId,
  calculateBulkCartSummary,
  toPersianDigits,
  computeDeterministicHash,
} from '../utils/lotteryEngine.ts';

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
    provablyFairSeeds,
  } = useLottery();

  const [selectedNetwork, setSelectedNetwork] = useState<string>('TON Network');
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
    <div className="space-y-3 px-3 pt-2 pb-24">
      {/* Top Bar */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-mono font-bold text-[#a855f7] tracking-wider block truncate">
            VIP TICKET TERMINAL • ترمینال صدور بلیت
          </span>
          <h1 className="text-sm font-black text-white mt-0.5 truncate">
            خرید تکی و دسته‌ای بلیت با تخفیف پلکانی
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('lobby')}
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-purple-500/25 text-[11px] font-bold text-purple-200 cursor-pointer shrink-0"
        >
          بازگشت ↗
        </button>
      </div>

      {/* 1. CONCURRENT MULTI-LOTTERY SELECTOR TABS — Clean 2x2 Grid (No Vertical Wrapping) */}
      <div className="grid grid-cols-2 gap-2" data-testid="play-multi-lottery-tabs">
        {MULTI_LOTTERY_SPECS.map((spec) => {
          const isSelected = activeLotteryId === spec.id;
          return (
            <button
              key={spec.id}
              type="button"
              data-testid={`lottery-tab-${spec.id}`}
              onClick={() => setActiveLotteryId(spec.id as LotteryTypeId)}
              className={`nimbus-ticket-card p-3 rounded-2xl text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'ring-2 ring-[#a855f7] shadow-[0_0_20px_rgba(168,85,247,0.35)] text-white'
                  : 'text-slate-300 hover:text-white opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold shrink-0">
                  {spec.roundCode}
                </span>
                <span className="text-[11px] font-mono font-black text-[#00f59b] tabular-nums whitespace-nowrap" dir="ltr">
                  {formatAmount(spec.ticketPriceUsdt)}
                </span>
              </div>

              <div className="text-xs font-extrabold text-white truncate">
                {spec.titleFa.split('(')[0].trim()}
              </div>

              <div className="pt-1.5 border-t border-purple-500/20 flex flex-col gap-0.5 text-[10px]">
                <div className="flex items-center justify-between text-purple-200/80">
                  <span>استخر جایزه:</span>
                  <strong className="font-mono text-[#fbbf24] tabular-nums" dir="ltr">
                    {formatAmount(spec.jackpotUsdt)}
                  </strong>
                </div>
                <div className="text-[10px] font-semibold text-amber-300 truncate">
                  {spec.formatLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. ACTIVE ROUND BANNER & QUICK PICK */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-200">
            {activeLotterySpec.titleFa.split('(')[0].trim()} • {activeLotterySpec.roundCode}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#070510] border border-purple-500/25 text-[11px] font-mono font-bold text-[#fbbf24] tabular-nums" dir="ltr">
            ⏱ {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="bulk-ai-quick-pick-btn"
            onClick={handleBulkQuickPick5}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/40 to-amber-500/30 hover:brightness-110 border border-amber-400/50 text-amber-200 font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>⚡ تولید هوشمند ۵ کوپن (×5)</span>
          </button>

          <button
            type="button"
            data-testid="ai-quick-pick-btn"
            onClick={handleSingleSlipQuickPick}
            className="py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/35 text-purple-200 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🎲 تصادفی کوپن فعلی</span>
          </button>
        </div>
      </div>

      {/* 3. MULTI-TICKET BATCH SELECTOR & TABBED SLIP EDITOR */}
      <div className="rounded-2xl nimbus-ticket-card p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {[1, 3, 5, 10].map((cnt) => (
              <button
                key={cnt}
                type="button"
                data-testid={`batch-count-btn-${cnt}`}
                onClick={() => handleSelectBatchCount(cnt)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  bulkSlips.length === cnt
                    ? 'bg-[#fbbf24] text-slate-950 shadow'
                    : 'bg-[#070510] border border-purple-500/20 text-purple-200 hover:text-white'
                }`}
              >
                {toPersianDigits(cnt)}x
                {cnt === 5 ? ' (-5%)' : cnt === 10 ? ' (-10%)' : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="custom-slip-count" className="text-[10px] text-purple-300/70">
              تعداد:
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
              className="w-12 bg-[#070510] border border-purple-500/30 rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-[#fbbf24]"
              dir="ltr"
            />
          </div>
        </div>

        {/* Tabbed Slip Editor (Ticket #1, #2, #3...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-purple-500/20" data-testid="bulk-slip-tabs" dir="ltr">
          {bulkSlips.map((slip, idx) => {
            const isTabActive = activeSlipIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                data-testid={`slip-tab-${idx + 1}`}
                onClick={() => selectSlipTab(idx)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                    : 'bg-[#070510] border-purple-500/20 text-purple-300/70 hover:text-white'
                }`}
              >
                <span>#{idx + 1}</span>
                <span className="text-[10px] text-[#00f59b]">
                  [{slip.mainNumbers.join(',')}]
                  {goldenMax > 0 ? `+★${slip.goldenBall}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. STAGE 1: PERFECT CIRCULAR MAIN BALLS GRID (1 to mainMax: 50 / 35 / 25 / 40) */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-black text-white">
              مرحله اول (کوپن #{toPersianDigits(activeSlipIndex + 1)}): انتخاب{' '}
              {toPersianDigits(mainCount)} گوی از ۱ تا {toPersianDigits(mainMax)}
            </h2>
            <p className="text-[10px] text-purple-300/70 mt-0.5">
              انتخاب‌شده:{' '}
              <strong className="text-[#fbbf24]">
                {toPersianDigits(selectedMainBalls.length)} از {toPersianDigits(mainCount)} گوی
              </strong>
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold shrink-0" dir="ltr">
            PICK {mainCount} / {mainMax}
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1.5" dir="ltr">
          {Array.from({ length: mainMax }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedMainBalls.includes(num);
            return (
              <button
                key={num}
                type="button"
                data-testid={`main-ball-${num}`}
                onClick={() => toggleMainBall(num)}
                className={`aspect-square rounded-full font-mono font-bold text-[11px] transition-all flex items-center justify-center cursor-pointer tabular-nums ${
                  isSelected
                    ? 'lottery-ball-gold text-slate-950 scale-105 ring-2 ring-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                    : 'bg-[#070510] hover:bg-purple-950/60 text-purple-200/80 border border-purple-500/20'
                }`}
              >
                {String(num).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. STAGE 2: PERFECT CIRCULAR GOLDEN BALLS GRID (1 to goldenMax: 15 / 10 / 12) */}
      {goldenMax > 0 && (
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/30 p-3.5 space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-black text-white">
                مرحله دوم (کوپن #{toPersianDigits(activeSlipIndex + 1)}): انتخاب ۱ گوی طلایی از ۱ تا{' '}
                {toPersianDigits(goldenMax)}
              </h2>
              <p className="text-[10px] text-purple-300/70 mt-0.5">
                گوی طلایی ضریب جک‌پات رده اول را فعال می‌کند.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-mono font-bold shrink-0" dir="ltr">
              PICK 1 / {goldenMax} ★
            </span>
          </div>

          <div className="grid grid-cols-8 gap-1.5" dir="ltr">
            {Array.from({ length: goldenMax }, (_, i) => i + 1).map((gNum) => {
              const isSelected = selectedGoldenBall === gNum;
              return (
                <button
                  key={gNum}
                  type="button"
                  data-testid={`golden-ball-${gNum}`}
                  onClick={() => setSelectedGoldenBall(gNum)}
                  className={`aspect-square rounded-full font-mono font-bold text-[10px] transition-all flex items-center justify-center cursor-pointer tabular-nums ${
                    isSelected
                      ? 'lottery-ball-purple text-white scale-105 ring-2 ring-[#fbbf24] shadow-[0_0_12px_rgba(168,85,247,0.65)]'
                      : 'bg-[#070510] hover:bg-purple-950/60 text-purple-300/80 border border-purple-500/25'
                  }`}
                >
                  ★{gNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. CLIENT SEED & FULL CRYPTOGRAPHIC COMMITMENT HASH */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#00f59b]">
            🔒 بذر اختصاصی کوپن #{toPersianDigits(activeSlipIndex + 1)} (Client Seed)
          </span>
          <span className="font-mono text-[10px] text-purple-300/60">HMAC-SHA256</span>
        </div>
        <input
          type="text"
          value={currentSlipSeed}
          onChange={(e) => handleUpdateCurrentSlipSeed(e.target.value)}
          className="w-full bg-[#070510] border border-purple-500/25 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
          dir="ltr"
        />
        <div className="rounded-xl bg-[#070510]/90 border border-purple-500/20 px-2.5 py-2 space-y-1.5" dir="ltr">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-[#a855f7] shrink-0">
              hash
            </span>
            <code className="text-[10px] font-mono text-purple-200/90 break-all leading-relaxed select-all">
              {provablyFairSeeds.serverSeedHash}
            </code>
          </div>
          <div className="flex items-start gap-2 pt-1 border-t border-purple-500/15">
            <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#00f59b] shrink-0">
              hash
            </span>
            <code className="text-[10px] font-mono text-emerald-300/90 break-all leading-relaxed select-all">
              {liveCommitHash}
            </code>
          </div>
        </div>
      </div>

      {/* 7. MULTI-CHANCE CART SUMMARY & CHECKOUT */}
      <div className="rounded-2xl nimbus-ticket-card p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
          <div>
            <span className="text-[10px] text-amber-400 font-mono font-bold block">
              MULTI-CHANCE SMART CART
            </span>
            <h3 className="text-sm font-black text-white">
              خلاصه سبد خرید ({toPersianDigits(bulkSlips.length)} کوپن)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold">
            {activeLotterySpec.roundCode}
          </span>
        </div>

        {/* All Slips in Cart Preview */}
        <div
          className="bg-[#070510] border border-purple-500/20 rounded-xl p-2.5 space-y-1.5 max-h-44 overflow-y-auto"
          data-testid="cart-slips-list"
        >
          {bulkSlips.map((slip, idx) => (
            <div
              key={idx}
              onClick={() => selectSlipTab(idx)}
              className={`p-2 rounded-lg border flex items-center justify-between text-[11px] cursor-pointer transition-all ${
                activeSlipIndex === idx
                  ? 'bg-amber-500/15 border-amber-400/50 text-white'
                  : 'bg-[#130d24] border-white/5 text-slate-300'
              }`}
            >
              <span className="font-mono font-bold text-amber-300">Ticket #{idx + 1}</span>
              <div className="flex items-center gap-1 font-mono" dir="ltr">
                {slip.mainNumbers.map((n) => (
                  <span
                    key={n}
                    className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] flex items-center justify-center font-bold"
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                ))}
                {goldenMax > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-bold">
                    ★{String(slip.goldenBall).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Dynamic Price Breakdown (TON & Stars) */}
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-purple-200/80">
            <span>قیمت واحد هر بلیت:</span>
            <span className="font-mono font-semibold text-white tabular-nums" dir="ltr">
              {formatAmount(unitPriceUsdt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-purple-200/80">
            <span>تعداد بلیت در تراکنش:</span>
            <span className="font-mono font-semibold text-white tabular-nums" data-testid="cart-ticket-count">
              {bulkSlips.length}x
            </span>
          </div>
          {cartSummary.discountPercent > 0 && (
            <div className="flex items-center justify-between text-[#00f59b] font-semibold">
              <span>تخفیف خرید دسته‌ای ({toPersianDigits(cartSummary.discountPercent)}٪):</span>
              <span className="font-mono tabular-nums" dir="ltr">
                -{formatAmount(cartSummary.subtotalUsdt - cartSummary.totalUsdt)}
              </span>
            </div>
          )}
          <div className="border-t border-purple-500/20 pt-2 flex items-center justify-between">
            <span className="font-bold text-white">مبلغ کل قابل پرداخت:</span>
            <span
              data-testid="cart-total-usdt"
              className="font-mono font-extrabold text-sm text-[#fbbf24] tabular-nums"
              dir="ltr"
            >
              {formatAmount(cartSummary.totalUsdt)}
            </span>
          </div>
          <span className="sr-only" data-testid="cart-total-fiat">
            {formatAmount(cartSummary.totalUsdt)}
          </span>
          <span className="sr-only" data-testid="cart-total-ton">
            {cartSummary.totalTon} TON
          </span>
          <span className="sr-only" data-testid="cart-total-trx">
            {cartSummary.totalTon} TON
          </span>
        </div>

        {/* Settlement Network Selector (Strictly TON or Telegram Stars) */}
        <div>
          <label className="block text-[11px] font-semibold text-purple-200/80 mb-1.5">
            ارز تسویه یکجای سبد خرید:
          </label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="w-full bg-[#070510] border border-purple-500/25 rounded-xl px-3 py-2 text-xs text-white font-semibold"
          >
            <option value="TON Network">💎 TON (The Open Network)</option>
            <option value="Telegram Stars">⭐ Stars (Telegram Stars)</option>
          </select>
        </div>

        {feedbackError && (
          <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold">
            ⚠️ {feedbackError}
          </div>
        )}

        {/* Atomic Single-Tx Checkout Button */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={minting || killSwitchActive}
            data-testid="mint-ticket-submit"
            onClick={handlePurchaseBatch}
            className="w-full h-12 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {killSwitchActive
                ? 'فروش بلیت موقتاً متوقف است (Kill-Switch)'
                : minting
                ? 'در حال ثبت دسته‌ای در بلاکچین...'
                : `پرداخت یکجا و صدور ${toPersianDigits(bulkSlips.length)} بلیت (${formatAmount(
                    cartSummary.totalUsdt
                  )})`}
            </span>
          </button>

          <div className="flex items-center justify-between text-[11px] font-medium text-purple-300/60 tabular-nums px-1">
            <span>موجودی فعلی: {formatAmount(balanceUsdt)}</span>
            <button
              type="button"
              onClick={() => setDepositModalOpen(true)}
              className="text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              + شارژ آنی کیف پول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
