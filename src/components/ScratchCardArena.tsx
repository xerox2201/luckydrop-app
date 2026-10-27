import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  ScratchCardCell,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import {
  HapticEngine,
  tmaCurrencyToUsdt,
  usdtToTmaCurrency,
  formatTmaCurrency,
} from '../utils/telegramTma.ts';
import { plinkoSoundEngine } from '../utils/plinkoSoundEngine.ts';

interface ScratchCardArenaProps {
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}

const DEFAULT_PREVIEW_CELLS: ScratchCardCell[] = [
  { index: 0, symbol: '💎', label: '5x', tierMultiplier: 5 },
  { index: 1, symbol: '👑', label: '100x', tierMultiplier: 100 },
  { index: 2, symbol: '🌟', label: '25x', tierMultiplier: 25 },
  { index: 3, symbol: '⚡', label: '2x', tierMultiplier: 2 },
  { index: 4, symbol: '💎', label: '5x', tierMultiplier: 5 },
  { index: 5, symbol: '🍀', label: '1.2x', tierMultiplier: 1.2 },
  { index: 6, symbol: '👑', label: '100x', tierMultiplier: 100 },
  { index: 7, symbol: '🌟', label: '25x', tierMultiplier: 25 },
  { index: 8, symbol: '💎', label: '5x', tierMultiplier: 5 },
];

export const ScratchCardArena: React.FC<ScratchCardArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonUsdRate,
    starsUsdRate,
    freeScratchCards,
    consumeFreeScratchCard,
    playInstantMiniGame,
  } = useLottery();

  const [betAmountCurrency, setBetAmountCurrency] = useState<number>(
    activeTmaCurrency === 'TON' ? 1 : 100
  );
  const [cells, setCells] = useState<ScratchCardCell[]>(DEFAULT_PREVIEW_CELLS);
  const [scratchedIndices, setScratchedIndices] = useState<number[]>([]);
  const [cardPurchased, setCardPurchased] = useState<boolean>(false);
  const [lastEval, setLastEval] = useState<MiniGameEvaluationResult | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  React.useEffect(() => {
    setBetAmountCurrency(activeTmaCurrency === 'TON' ? 1 : 100);
  }, [activeTmaCurrency]);

  const handleBuyOrUseFreeCard = async (useFreeBonus: boolean) => {
    HapticEngine.impactOccurred('medium');
    setStatusBanner(null);

    if (useFreeBonus) {
      const ok = consumeFreeScratchCard();
      if (!ok) {
        setStatusBanner('⚠️ شما در حال حاضر کارت اسکرچ رایگان ندارید.');
        return;
      }
    }

    const betUsdt = useFreeBonus
      ? 1.0
      : tmaCurrencyToUsdt(betAmountCurrency, activeTmaCurrency, tonUsdRate, starsUsdRate);

    const res = await playInstantMiniGame({
      gameId: 'SCRATCH',
      betAmountUsdt: betUsdt,
      usedFreeBonusToken: useFreeBonus,
    });

    if (!res.ok || !res.evaluation) {
      setStatusBanner(res.error || 'خطا در صدور کارت اسکرچ هولوگرافیک');
      return;
    }

    setCells(res.evaluation.scratchCells || DEFAULT_PREVIEW_CELLS);
    setScratchedIndices([]);
    setCardPurchased(true);
    setLastEval(res.evaluation);

    if (onRoundSettled) {
      onRoundSettled(res.evaluation, res.debitTransactionUuid || '');
    }
  };

  const scratchSingleCell = (index: number) => {
    if (!cardPurchased) return;
    if (scratchedIndices.includes(index)) return;
    HapticEngine.impactOccurred('light');
    plinkoSoundEngine.playPegHit(index + 2, 12);
    const next = [...scratchedIndices, index];
    setScratchedIndices(next);
    if (next.length === 9 && lastEval) {
      plinkoSoundEngine.playBucketLand(lastEval.multiplier, lastEval.multiplier >= 10);
    }
  };

  const scratchAllInstant = () => {
    if (!cardPurchased) return;
    HapticEngine.notificationOccurred(lastEval?.won ? 'success' : 'warning');
    setScratchedIndices([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    if (lastEval) {
      plinkoSoundEngine.playBucketLand(lastEval.multiplier, lastEval.multiplier >= 10);
    }
  };

  const allRevealed = cardPurchased && scratchedIndices.length === 9;

  return (
    <div data-testid="scratch-card-arena" className="space-y-3" dir="ltr">
      {/* =====================================================================
          TOP: GAME CANVAS CONTAINER
          w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716]
          border border-purple-500/25 overflow-hidden relative
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716] border border-purple-500/25 overflow-hidden relative flex flex-col items-center justify-center p-3">
        {/* Top-Left: Floating Translucent Pill for Multipliers */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[10px] font-mono tabular-nums text-purple-200">
          <span>👑 100x</span>
          <span>·</span>
          <span>🌟 25x</span>
          <span>·</span>
          <span>💎 5x</span>
        </div>

        {/* Top-Right: Floating Translucent Pill for Free Cards */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[10px] font-mono tabular-nums text-[#00f59b]">
          <span>🎁 {freeScratchCards} Free</span>
        </div>

        {/* 3x3 Holographic Foil Scratch Matrix */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[210px] sm:max-w-[250px] aspect-square mt-5">
          {cells.map((cell) => {
            const isRevealed = !cardPurchased || scratchedIndices.includes(cell.index);
            return (
              <button
                key={cell.index}
                type="button"
                data-testid={`scratch-cell-${cell.index}`}
                onClick={() => scratchSingleCell(cell.index)}
                className={`relative rounded-2xl flex flex-col items-center justify-center transition-all duration-200 select-none cursor-pointer overflow-hidden ${
                  isRevealed
                    ? cell.tierMultiplier > 0
                      ? 'bg-gradient-to-br from-[#2a1d4e] to-[#150f28] border-2 border-[#fbbf24] shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                      : 'bg-[#150f28] border border-purple-500/25'
                    : 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-600 border border-purple-200/50 shadow-[0_4px_0_#3b0764] active:scale-95'
                }`}
              >
                {isRevealed ? (
                  <>
                    <span className="text-2xl drop-shadow">{cell.symbol}</span>
                    <span className="text-[11px] font-mono font-bold text-[#fbbf24] mt-0.5">
                      {cell.label}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white">
                    <span className="text-lg">✨</span>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase mt-0.5">
                      SCRATCH
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {allRevealed && lastEval && (
          <div
            data-testid="scratch-result-banner"
            className={`absolute bottom-2.5 inset-x-4 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-center border ${
              lastEval.won
                ? 'bg-[#052e16]/95 border-[#00f59b] text-[#00f59b]'
                : 'bg-[#130d24]/95 border-purple-500/30 text-purple-200'
            }`}
          >
            {lastEval.scratchTierName} —{' '}
            {lastEval.won
              ? `WON +${formatTmaCurrency(
                  usdtToTmaCurrency(
                    lastEval.payoutUsdt,
                    activeTmaCurrency,
                    tonUsdRate,
                    starsUsdRate
                  ),
                  activeTmaCurrency
                )}`
              : 'NO 3-OF-A-KIND MATCH'}
          </div>
        )}

        {statusBanner && (
          <div className="absolute bottom-2.5 inset-x-4 text-xs font-semibold text-[#fbbf24] text-center" dir="rtl">
            {statusBanner}
          </div>
        )}
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DECK
          rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        {/* ROW 1: Bet Amount Input (h-11 rounded-xl bg-[#090612] px-3) with 1/2, 2x, MAX */}
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm shrink-0">
              {activeTmaCurrency === 'TON' ? '💎' : '⭐'}
            </span>
            <input
              type="number"
              value={betAmountCurrency}
              onChange={(e) =>
                setBetAmountCurrency(Math.max(0.1, Number(e.target.value) || 0.5))
              }
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.2, Number((v / 2).toFixed(2)))
                    : Math.max(10, Math.floor(v / 2))
                )
              }
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              onClick={() =>
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON' ? Number((v * 2).toFixed(2)) : v * 2
                )
              }
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              onClick={() =>
                setBetAmountCurrency(activeTmaCurrency === 'TON' ? 10 : 1000)
              }
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-[#fbbf24] transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Free Bonus Card Selector Row (h-10 rounded-xl) */}
        <div className="h-10 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-purple-300/60">
            3-of-a-Kind Match Wins up to 100x
          </span>
          <button
            type="button"
            data-testid="scratch-use-free-btn"
            disabled={freeScratchCards <= 0}
            onClick={() => handleBuyOrUseFreeCard(true)}
            className="h-7 px-2.5 rounded-lg bg-purple-950/80 border border-purple-500/30 text-[11px] font-semibold text-[#00f59b] disabled:opacity-40 cursor-pointer shrink-0"
          >
            🎁 Use Free ({freeScratchCards})
          </button>
        </div>

        {/* ROW 3: Full-Width Tactile Primary CTA Button */}
        {cardPurchased && scratchedIndices.length < 9 ? (
          <button
            type="button"
            data-testid="scratch-reveal-all-btn"
            onClick={scratchAllInstant}
            className="w-full h-12 rounded-xl font-bold text-sm text-slate-950 bg-[#fbbf24] shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>⚡ Instant Scratch All</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="scratch-buy-btn"
            onClick={() => handleBuyOrUseFreeCard(false)}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>✨ Buy Scratch Card</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
              {formatTmaCurrency(betAmountCurrency, activeTmaCurrency)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
