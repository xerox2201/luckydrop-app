import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  calculateMinesMultiplier,
  deriveProvablyFairMinesBoard,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import {
  HapticEngine,
  tmaCurrencyToUsdt,
  usdtToTmaCurrency,
  formatTmaCurrency,
} from '../utils/telegramTma.ts';
import { plinkoSoundEngine } from '../utils/plinkoSoundEngine.ts';

interface MinesGameArenaProps {
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}

export const MinesGameArena: React.FC<MinesGameArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    provablyFairSeeds,
    startGameSession,
    revealGameSessionStep,
    cashoutGameSession,
  } = useLottery();

  const [betAmountCurrency, setBetAmountCurrency] = useState<number>(
    activeTmaCurrency === 'TON' ? 1 : 100
  );
  const [minesCount, setMinesCount] = useState<number>(3);
  const [roundActive, setRoundActive] = useState<boolean>(false);
  const [busyStep, setBusyStep] = useState<boolean>(false);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [mineIndices, setMineIndices] = useState<number[]>([]);
  const [explodedTile, setExplodedTile] = useState<number | null>(null);
  const [cashedOutWin, setCashedOutWin] = useState<{
    multiplier: number;
    payoutCurrency: number;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Sync default bet step when user switches TON <-> STARS pill in header
  React.useEffect(() => {
    setBetAmountCurrency(activeTmaCurrency === 'TON' ? 1 : 100);
  }, [activeTmaCurrency]);

  const currentMultiplier = roundActive
    ? calculateMinesMultiplier(minesCount, revealedTiles.length)
    : 1.0;
  const nextTileMultiplier = calculateMinesMultiplier(
    minesCount,
    roundActive ? revealedTiles.length + 1 : 1
  );
  const currentPayoutCurrency = Number((betAmountCurrency * currentMultiplier).toFixed(2));

  const startMinesRound = async () => {
    if (busyStep) return;
    HapticEngine.impactOccurred('medium');
    setStatusMsg(null);
    setCashedOutWin(null);
    setExplodedTile(null);
    setMineIndices([]);

    const available = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    if (betAmountCurrency > available) {
      HapticEngine.notificationOccurred('error');
      setStatusMsg(
        `⚠️ موجودی ${activeTmaCurrency === 'TON' ? 'TON' : 'Stars'} شما برای شروع بازی کافی نیست.`
      );
      return;
    }

    const betUsdt = tmaCurrencyToUsdt(
      betAmountCurrency,
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate
    );

    setBusyStep(true);
    const startRes = await startGameSession({
      gameId: 'MINES',
      betAmountUsdt: betUsdt,
      betAmountNative: betAmountCurrency,
      currency: activeTmaCurrency,
      minesCount,
    });
    setBusyStep(false);

    if (!startRes.ok) {
      HapticEngine.notificationOccurred('error');
      setStatusMsg(startRes.error || 'خطا در شروع بازی در سرور');
      return;
    }

    setRevealedTiles([]);
    setRoundActive(true);
    plinkoSoundEngine.playPegHit(3, 12);
  };

  const handleTileTap = async (tileIndex: number) => {
    if (!roundActive || busyStep) return;
    if (revealedTiles.includes(tileIndex)) return;

    setBusyStep(true);
    const revealRes = await revealGameSessionStep({ tileIndex });
    setBusyStep(false);

    if (!revealRes.ok) {
      HapticEngine.notificationOccurred('error');
      setStatusMsg(revealRes.error || 'خطا در بررسی خانه در سرور');
      return;
    }

    if (revealRes.status === 'BOMB_HIT' || revealRes.hitBomb) {
      HapticEngine.notificationOccurred('error');
      plinkoSoundEngine.playBucketLand(0.2, false);
      setExplodedTile(revealRes.explodedTile ?? tileIndex);
      if (Array.isArray(revealRes.mineIndices)) {
        setMineIndices(revealRes.mineIndices);
      }
      setRoundActive(false);

      if (revealRes.evaluation && onRoundSettled) {
        onRoundSettled(revealRes.evaluation, revealRes.debitTransactionUuid || '');
      }
      return;
    }

    // Safe diamond tile confirmed by server!
    HapticEngine.impactOccurred('light');
    const nextRevealed = Array.isArray(revealRes.revealedTiles)
      ? revealRes.revealedTiles
      : [...revealedTiles, tileIndex];
    plinkoSoundEngine.playPegHit(nextRevealed.length + 3, 16);
    setRevealedTiles(nextRevealed);

    if (revealRes.status === 'AUTO_CASHED_OUT') {
      HapticEngine.notificationOccurred('success');
      const mult = revealRes.currentMultiplier || calculateMinesMultiplier(minesCount, nextRevealed.length);
      plinkoSoundEngine.playBucketLand(mult, mult >= 10);
      setRoundActive(false);
      if (Array.isArray(revealRes.mineIndices)) {
        setMineIndices(revealRes.mineIndices);
      }
      const payoutCurr =
        activeTmaCurrency === 'TON'
          ? revealRes.payoutTon ?? Number((betAmountCurrency * mult).toFixed(2))
          : revealRes.payoutStars ?? Math.round(betAmountCurrency * mult);
      setCashedOutWin({
        multiplier: mult,
        payoutCurrency: payoutCurr,
      });
      if (revealRes.evaluation && onRoundSettled) {
        onRoundSettled(revealRes.evaluation, revealRes.debitTransactionUuid || '');
      }
    }
  };

  const settleCashout = async () => {
    if (!roundActive || revealedTiles.length <= 0 || busyStep) return;

    setBusyStep(true);
    const res = await cashoutGameSession();
    setBusyStep(false);

    if (!res.ok) {
      HapticEngine.notificationOccurred('error');
      setStatusMsg(res.error || 'خطا در برداشت سود');
      return;
    }

    HapticEngine.notificationOccurred('success');
    const mult = res.multiplier || calculateMinesMultiplier(minesCount, revealedTiles.length);
    plinkoSoundEngine.playBucketLand(mult, mult >= 10);
    setRoundActive(false);
    if (Array.isArray(res.mineIndices)) {
      setMineIndices(res.mineIndices);
    }

    const payoutCurr =
      activeTmaCurrency === 'TON'
        ? res.payoutTon ?? Number((betAmountCurrency * mult).toFixed(2))
        : res.payoutStars ?? Math.round(betAmountCurrency * mult);
    setCashedOutWin({
      multiplier: mult,
      payoutCurrency: payoutCurr,
    });
    if (res.evaluation && onRoundSettled) {
      onRoundSettled(res.evaluation, res.debitTransactionUuid || '');
    }
  };

  const handlePickRandomSafeTile = () => {
    if (!roundActive) return;
    const unrevealed = Array.from({ length: 25 }, (_, i) => i).filter(
      (i) => !revealedTiles.includes(i)
    );
    if (unrevealed.length === 0) return;
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    handleTileTap(pick);
  };

  const handleMaxBet = () => {
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    setBetAmountCurrency(
      activeTmaCurrency === 'TON'
        ? Math.max(0.01, Number(avail.toFixed(2)))
        : Math.max(1, Math.floor(avail))
    );
  };

  return (
    <div data-testid="mines-game-arena" className="space-y-3" dir="ltr">
      {/* =====================================================================
          TOP: GAME CANVAS CONTAINER
          w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716]
          border border-purple-500/25 overflow-hidden relative
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716] border border-purple-500/25 overflow-hidden relative flex flex-col items-center justify-center p-3">
        {/* Top-Left: Floating Translucent Pill for Current & Next Multipliers */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[11px] font-mono tabular-nums">
          <span className="text-purple-200 font-bold">
            Now: <strong className="text-[#fbbf24]">{currentMultiplier.toFixed(2)}x</strong>
          </span>
          <span className="text-purple-400">·</span>
          <span className="text-[#00f59b] font-bold">Next: {nextTileMultiplier.toFixed(2)}x</span>
        </div>

        {/* Top-Right: Floating Translucent Pill for Gems & Nonce */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[11px] font-mono tabular-nums">
          <span className="text-[#00f59b] font-bold">
            💎 {25 - minesCount - revealedTiles.length}
          </span>
          <span className="text-purple-300/60">#{provablyFairSeeds.nonce}</span>
        </div>

        {/* Center 5x5 Tactile 3D Vault Grid */}
        <div className="grid grid-cols-5 gap-1.5 w-full max-w-[212px] sm:max-w-[260px] aspect-square mt-5">
          {Array.from({ length: 25 }, (_, idx) => {
            const isRevealedSafe = revealedTiles.includes(idx);
            const isExploded = explodedTile === idx;
            const isUnrevealedMineAfterEnd =
              !roundActive &&
              (explodedTile !== null || cashedOutWin !== null) &&
              mineIndices.includes(idx) &&
              !isExploded;

            return (
              <button
                key={idx}
                type="button"
                data-testid={`mines-tile-${idx}`}
                disabled={!roundActive || isRevealedSafe}
                onClick={() => handleTileTap(idx)}
                className={`relative rounded-xl font-mono font-black text-base flex items-center justify-center transition-all duration-150 select-none cursor-pointer ${
                  isExploded
                    ? 'bg-gradient-to-br from-[#f43f5e] to-[#be123c] border border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.8)] scale-95'
                    : isRevealedSafe
                    ? 'bg-gradient-to-br from-[#00f59b]/30 to-[#059669]/40 border border-[#00f59b] shadow-[0_0_14px_rgba(0,245,155,0.4)] scale-95'
                    : isUnrevealedMineAfterEnd
                    ? 'bg-[#1e1638]/70 border border-rose-500/40 opacity-75'
                    : roundActive
                    ? 'bg-gradient-to-b from-[#251b45] to-[#17102e] hover:from-[#31245a] hover:to-[#1f163d] border border-purple-400/35 shadow-[0_3px_0_#0d081d] active:translate-y-0.5'
                    : 'bg-[#150f28] border border-purple-500/20 opacity-85'
                }`}
              >
                {isExploded ? (
                  <span className="text-lg animate-bounce">💥</span>
                ) : isRevealedSafe ? (
                  <span className="text-lg">💎</span>
                ) : isUnrevealedMineAfterEnd ? (
                  <span className="text-sm opacity-80">💣</span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-purple-400/35" />
                )}
              </button>
            );
          })}
        </div>

        {/* Floating Win / Boom Overlay Banner */}
        {cashedOutWin && (
          <div
            data-testid="mines-win-banner"
            className="absolute bottom-2.5 inset-x-4 px-3 py-1.5 rounded-xl bg-[#052e16]/95 border border-[#00f59b] text-[#00f59b] font-mono text-xs font-bold text-center"
          >
            🎉 WON +{formatTmaCurrency(cashedOutWin.payoutCurrency, activeTmaCurrency)} (
            {cashedOutWin.multiplier.toFixed(2)}x)
          </div>
        )}

        {explodedTile !== null && (
          <div
            data-testid="mines-boom-banner"
            className="absolute bottom-2.5 inset-x-4 px-3 py-1.5 rounded-xl bg-rose-950/95 border border-[#f43f5e] text-rose-200 font-mono text-xs font-bold text-center"
            dir="rtl"
          >
            💥 برخورد با مین در خانه #{explodedTile + 1}!
          </div>
        )}

        {statusMsg && (
          <div className="absolute bottom-2.5 inset-x-4 text-xs font-semibold text-[#fbbf24] text-center" dir="rtl">
            {statusMsg}
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
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              disabled={roundActive}
              value={betAmountCurrency}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmountCurrency(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={roundActive}
              onClick={() =>
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number((v / 2).toFixed(2)))
                    : Math.max(1, Math.floor(v / 2))
                )
              }
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.min(Math.max(0.01, avail), Number((v * 2).toFixed(2)))
                    : Math.min(Math.max(1, avail), v * 2)
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={handleMaxBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-[#fbbf24] transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Mines Count Segmented Selector (h-10 rounded-xl) */}
        <div className="h-10 rounded-xl bg-[#090612] px-2.5 border border-purple-500/20 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-purple-300/60">
            💣 Mines Count:
          </span>
          <div className="flex items-center gap-1">
            {[1, 3, 5, 10, 16].map((cnt) => (
              <button
                key={cnt}
                type="button"
                disabled={roundActive}
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setMinesCount(cnt);
                }}
                className={`h-7 px-2.5 rounded-lg font-mono text-[11px] font-semibold cursor-pointer tabular-nums ${
                  minesCount === cnt
                    ? 'bg-purple-600/40 text-white border border-purple-400/40'
                    : 'bg-purple-950/60 text-purple-300/70 hover:text-white'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 3: Full-Width Tactile Primary CTA Button */}
        {roundActive ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="mines-cashout-btn"
              disabled={revealedTiles.length === 0}
              onClick={() => settleCashout()}
              className="w-full h-12 rounded-xl font-bold text-sm text-[#041f14] bg-[#00f59b] shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Cash Out ({currentMultiplier.toFixed(2)}x)</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/15 text-xs font-mono tabular-nums">
                {formatTmaCurrency(currentPayoutCurrency, activeTmaCurrency, false)}
              </span>
            </button>

            <button
              type="button"
              data-testid="mines-random-pick-btn"
              onClick={handlePickRandomSafeTile}
              className="h-12 px-3 rounded-xl bg-[#090612] hover:bg-purple-950/80 border border-purple-500/25 text-xs font-semibold text-purple-200 shrink-0 cursor-pointer"
            >
              🎲Pick
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="mines-start-btn"
            onClick={startMinesRound}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Mines</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
              {formatTmaCurrency(betAmountCurrency, activeTmaCurrency)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
