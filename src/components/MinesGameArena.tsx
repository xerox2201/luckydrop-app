import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  calculateMinesMultiplier,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import {
  tmaCurrencyToUsdt,
  formatTmaCurrency,
} from '../utils/telegramTma.ts';
import { useSoundHaptics } from '../services/soundHaptics.ts';
import { tr } from '../utils/i18n.ts';
import {
  MinesParticleOverlay,
  MinesFxEvent,
} from './games/fx/MinesParticleFX.tsx';
import {
  LuxuryIconBadge,
  TonCrystalIcon,
  TelegramStarIcon,
  LuxuryDiceCubeIcon,
  LuxuryMineBombIcon,
  MinesEmeraldGemIcon,
  ProvablyFairShieldIcon,
  LuxurySoundOnIcon,
  LuxurySoundMuteIcon,
} from './ui/LuxuryIcons.tsx';

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
    navigateTo,
    lang,
  } = useLottery();

  const { isMuted, toggleMute, soundHaptics } = useSoundHaptics();

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
  const [fxEvents, setFxEvents] = useState<MinesFxEvent[]>([]);

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

  const pushFxEvent = (tileIndex: number, kind: MinesFxEvent['kind']) => {
    setFxEvents((prev) => [
      ...prev.slice(-14),
      {
        id: `mfx-${tileIndex}-${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        tileIndex,
        kind,
      },
    ]);
  };

  const startMinesRound = async () => {
    if (busyStep) return;
    soundHaptics.playClick('medium');
    setStatusMsg(null);
    setCashedOutWin(null);
    setExplodedTile(null);
    setMineIndices([]);

    const available = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    if (betAmountCurrency > available) {
      soundHaptics.notificationOccurred('error');
      setStatusMsg(
        tr(
          lang,
          `موجودی ${activeTmaCurrency === 'TON' ? 'TON' : 'Stars'} شما برای شروع بازی کافی نیست.`,
          `Insufficient ${activeTmaCurrency === 'TON' ? 'TON' : 'Stars'} balance to start round.`
        )
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
      soundHaptics.notificationOccurred('error');
      setStatusMsg(
        startRes.error ||
          tr(lang, 'خطا در شروع بازی در سرور', 'Failed to start Mines session on server')
      );
      return;
    }

    setRevealedTiles([]);
    setRoundActive(true);
    soundHaptics.playTileTap();
  };

  const handleTileTap = async (tileIndex: number) => {
    if (!roundActive || busyStep) return;
    if (revealedTiles.includes(tileIndex)) return;

    soundHaptics.playTileTap();
    setBusyStep(true);
    const revealRes = await revealGameSessionStep({ tileIndex });
    setBusyStep(false);

    if (!revealRes.ok) {
      soundHaptics.notificationOccurred('error');
      setStatusMsg(
        revealRes.error || tr(lang, 'خطا در بررسی خانه در سرور', 'Failed to reveal tile')
      );
      return;
    }

    if (revealRes.status === 'BOMB_HIT' || revealRes.hitBomb) {
      const hitIdx = revealRes.explodedTile ?? tileIndex;
      soundHaptics.playMineExplosion();
      pushFxEvent(hitIdx, 'MINE_HIT');
      setExplodedTile(hitIdx);
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
    const nextRevealed = Array.isArray(revealRes.revealedTiles)
      ? revealRes.revealedTiles
      : [...revealedTiles, tileIndex];
    soundHaptics.playGemReveal(nextRevealed.length, 25 - minesCount);
    pushFxEvent(tileIndex, 'GEM_REVEAL');
    setRevealedTiles(nextRevealed);

    if (revealRes.status === 'AUTO_CASHED_OUT') {
      const mult =
        revealRes.currentMultiplier ||
        calculateMinesMultiplier(minesCount, nextRevealed.length);
      soundHaptics.playWinChime(mult, mult >= 10);
      pushFxEvent(12, 'CASHOUT_WIN');
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
      soundHaptics.notificationOccurred('error');
      setStatusMsg(res.error || tr(lang, 'خطا در برداشت سود', 'Failed to cash out'));
      return;
    }

    const mult = res.multiplier || calculateMinesMultiplier(minesCount, revealedTiles.length);
    soundHaptics.playWinChime(mult, mult >= 10);
    pushFxEvent(12, 'CASHOUT_WIN');
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
    soundHaptics.selectionChanged();
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
          TOP: IMMERSIVE OBSIDIAN & GOLD GLASSMORPHIC GAME BOARD
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-gradient-to-b from-[#110a22]/95 via-[#0b0716]/98 to-[#07040e] border border-amber-500/30 ring-1 ring-emerald-500/15 shadow-[inset_0_2px_28px_rgba(0,0,0,0.88),0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl overflow-hidden relative flex flex-col items-center justify-center p-3">
        {/* Ambient Studio Spotlight Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(16,185,129,0.12),rgba(245,158,11,0.06)_45%,transparent_75%)]"
        />

        {/* 60 FPS Localized Emerald Light Particles & Obsidian-Ruby Shockwave Canvas */}
        <MinesParticleOverlay events={fxEvents} />

        {/* Top-Left: Floating Translucent Pill for Current & Next Multipliers */}
        <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/85 backdrop-blur-xl border border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-[11px] font-mono tabular-nums">
          <span className="text-purple-200 font-bold">
            Now: <strong className="text-[#fbbf24]">{currentMultiplier.toFixed(2)}x</strong>
          </span>
          <span className="text-amber-400/60">·</span>
          <span className="text-[#00f59b] font-bold">Next: {nextTileMultiplier.toFixed(2)}x</span>
        </div>

        {/* Top-Right: Floating Translucent Pill for Sound Mute Toggle, Gems & Nonce */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          <button
            type="button"
            data-testid="mines-audio-mute-btn"
            onClick={toggleMute}
            aria-label={isMuted ? tr(lang, 'وصل صدا', 'Unmute Audio') : tr(lang, 'قطع صدا', 'Mute Audio')}
            title={isMuted ? tr(lang, 'وصل صدا', 'Unmute Audio') : tr(lang, 'قطع صدا', 'Mute Audio')}
            className="h-7 px-2 rounded-full bg-[#070510]/85 backdrop-blur-xl border border-amber-500/30 hover:border-amber-400/60 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            {isMuted ? <LuxurySoundMuteIcon size={14} /> : <LuxurySoundOnIcon size={14} />}
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/85 backdrop-blur-xl border border-amber-500/30 text-[11px] font-mono tabular-nums">
            <span className="text-[#00f59b] font-bold inline-flex items-center gap-1">
              <MinesEmeraldGemIcon size={14} />
              <span>{25 - minesCount - revealedTiles.length}</span>
            </span>
            <button
              type="button"
              onClick={() => navigateTo('transparency')}
              className="text-purple-200/80 hover:text-white inline-flex items-center gap-0.5 cursor-pointer"
            >
              <ProvablyFairShieldIcon size={12} />
              <span>#{provablyFairSeeds.nonce}</span>
            </button>
          </div>
        </div>

        {/* Center 5x5 Tactile 3D Obsidian-Gold Vault Grid */}
        <div className="relative z-10 grid grid-cols-5 gap-1.5 w-full max-w-[216px] sm:max-w-[264px] aspect-square mt-5 p-2 rounded-2xl bg-[#06030d]/90 border border-amber-500/25 shadow-[inset_0_3px_18px_rgba(0,0,0,0.92)]">
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
                className={`relative rounded-xl font-mono font-black text-base flex items-center justify-center transition-all duration-200 select-none cursor-pointer ${
                  isExploded
                    ? 'bg-gradient-to-br from-[#f43f5e] via-[#be123c] to-[#4c0519] border border-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.9),inset_0_1px_2px_rgba(255,255,255,0.4)] scale-95'
                    : isRevealedSafe
                    ? 'bg-gradient-to-br from-[#10B981]/35 via-[#059669]/45 to-[#064E3B]/80 border border-[#34D399] shadow-[0_0_18px_rgba(16,185,129,0.55),inset_0_1px_2px_rgba(255,255,255,0.35)] scale-95'
                    : isUnrevealedMineAfterEnd
                    ? 'bg-[#1e1638]/75 border border-rose-500/40 opacity-80'
                    : roundActive
                    ? 'bg-gradient-to-b from-[#271d49] via-[#191233] to-[#110b24] hover:from-[#33255e] hover:to-[#1d143b] border border-amber-400/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_3.5px_0_#080412] active:translate-y-0.5'
                    : 'bg-gradient-to-b from-[#18112e] to-[#0e091d] border border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] opacity-90'
                }`}
              >
                {isExploded ? (
                  <LuxuryMineBombIcon size={24} className="animate-bounce drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                ) : isRevealedSafe ? (
                  <MinesEmeraldGemIcon
                    size={24}
                    className="scale-105 transition-transform duration-200 drop-shadow-[0_0_8px_rgba(16,185,129,0.85)]"
                  />
                ) : isUnrevealedMineAfterEnd ? (
                  <LuxuryMineBombIcon size={18} className="opacity-80" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-300/35 shadow-[0_0_6px_rgba(253,224,71,0.35)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Floating Win / Boom Overlay Banner */}
        {cashedOutWin && (
          <div
            data-testid="mines-win-banner"
            className="absolute bottom-2.5 inset-x-4 z-30 px-3 py-1.5 rounded-xl bg-[#052e16]/95 backdrop-blur-xl border border-[#00f59b] shadow-[0_0_20px_rgba(16,185,129,0.45)] text-[#00f59b] font-mono text-xs font-bold text-center flex items-center justify-center gap-1.5"
          >
            <MinesEmeraldGemIcon size={15} />
            <span>
              WON +{formatTmaCurrency(cashedOutWin.payoutCurrency, activeTmaCurrency)} (
              {cashedOutWin.multiplier.toFixed(2)}x)
            </span>
          </div>
        )}

        {explodedTile !== null && (
          <div
            data-testid="mines-boom-banner"
            className="absolute bottom-2.5 inset-x-4 z-30 px-3 py-1.5 rounded-xl bg-rose-950/95 backdrop-blur-xl border border-[#f43f5e] shadow-[0_0_22px_rgba(244,63,94,0.5)] text-rose-200 font-mono text-xs font-bold text-center flex items-center justify-center gap-1.5"
          >
            <LuxuryMineBombIcon size={15} />
            <span>
              {tr(
                lang,
                `برخورد با مین در خانه #${explodedTile + 1}!`,
                `Mine detonated on tile #${explodedTile + 1}!`
              )}
            </span>
          </div>
        )}

        {statusMsg && (
          <div className="absolute bottom-2.5 inset-x-4 z-30 text-xs font-semibold text-[#fbbf24] text-center">
            {statusMsg}
          </div>
        )}
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DECK (Obsidian & Gold Glassmorphic Hardware Deck)
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24]/95 backdrop-blur-xl p-3.5 border border-amber-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.18),0_12px_32px_rgba(0,0,0,0.6)] space-y-3">
        {/* ROW 1: Bet Amount Input (h-11 rounded-xl bg-[#090612] px-3) with 1/2, 2x, MAX */}
        <div className="h-11 rounded-xl bg-[#090612]/95 px-3 border border-amber-500/25 shadow-inner flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <LuxuryIconBadge variant={activeTmaCurrency === 'TON' ? 'cyan' : 'gold'} size="xs">
              {activeTmaCurrency === 'TON' ? (
                <TonCrystalIcon size={14} />
              ) : (
                <TelegramStarIcon size={14} />
              )}
            </LuxuryIconBadge>
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
              onClick={() => {
                soundHaptics.selectionChanged();
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number((v / 2).toFixed(2)))
                    : Math.max(1, Math.floor(v / 2))
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 border border-purple-500/25 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={() => {
                soundHaptics.selectionChanged();
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmountCurrency((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.min(Math.max(0.01, avail), Number((v * 2).toFixed(2)))
                    : Math.min(Math.max(1, avail), v * 2)
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 border border-purple-500/25 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={handleMaxBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 border border-amber-500/30 text-[#fbbf24] transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Mines Count Segmented Selector (h-10 rounded-xl) */}
        <div className="h-10 rounded-xl bg-[#090612]/95 px-2.5 border border-amber-500/25 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-purple-200/80 inline-flex items-center gap-1.5">
            <LuxuryMineBombIcon size={14} />
            <span>{tr(lang, 'تعداد مین:', 'Mines Count:')}</span>
          </span>
          <div className="flex items-center gap-1">
            {[1, 3, 5, 10, 16].map((cnt) => (
              <button
                key={cnt}
                type="button"
                disabled={roundActive}
                onClick={() => {
                  soundHaptics.selectionChanged();
                  setMinesCount(cnt);
                }}
                className={`h-7 px-2.5 rounded-lg font-mono text-[11px] font-semibold cursor-pointer tabular-nums transition-all ${
                  minesCount === cnt
                    ? 'bg-gradient-to-b from-amber-500/35 to-purple-700/45 text-[#fde047] border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
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
              className="w-full h-12 rounded-xl font-bold text-sm text-[#041f14] bg-gradient-to-r from-[#00f59b] via-[#34d399] to-[#10b981] border border-emerald-200/60 shadow-[0_4px_0_#059669,0_0_20px_rgba(16,185,129,0.4)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <MinesEmeraldGemIcon size={16} />
              <span>Cash Out ({currentMultiplier.toFixed(2)}x)</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/15 text-xs font-mono tabular-nums">
                {formatTmaCurrency(currentPayoutCurrency, activeTmaCurrency, false)}
              </span>
            </button>

            <button
              type="button"
              data-testid="mines-random-pick-btn"
              onClick={handlePickRandomSafeTile}
              className="h-12 px-3 rounded-xl bg-[#090612] hover:bg-purple-950/80 border border-amber-500/30 text-xs font-semibold text-amber-200 shrink-0 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform duration-200"
            >
              <LuxuryDiceCubeIcon size={15} />
              <span>{tr(lang, 'تصادفی', 'Pick')}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="mines-start-btn"
            onClick={startMinesRound}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] via-[#7e22ce] to-[#6b21a8] border border-amber-400/40 shadow-[0_4px_0_#4c1d95,0_8px_24px_rgba(147,51,234,0.35)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LuxuryMineBombIcon size={17} />
            <span>{tr(lang, 'شروع بازی مین', 'Start Mines')}</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
              {formatTmaCurrency(betAmountCurrency, activeTmaCurrency)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
