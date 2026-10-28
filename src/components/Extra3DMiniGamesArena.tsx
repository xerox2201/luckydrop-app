import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  TowerDifficulty,
  WheelRiskLevel,
  WHEEL_SEGMENTS_16,
  calculateTowerStepMultiplier,
  deriveProvablyFairTowerBoard,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import {
  HapticEngine,
  tmaCurrencyToUsdt,
  usdtToTmaCurrency,
  formatTmaCurrency,
} from '../utils/telegramTma.ts';
import { plinkoSoundEngine } from '../utils/plinkoSoundEngine.ts';

interface ExtraArenaProps {
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}

/* ============================================================================
   1. TOWER RUSH 3D (برج کریستالی سه‌بعدی ۸ طبقه)
   ============================================================================ */
export const Tower3DGameArena: React.FC<ExtraArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    provablyFairSeeds,
    playInstantMiniGame,
  } = useLottery();

  const [betAmount, setBetAmount] = useState<number>(activeTmaCurrency === 'TON' ? 0.5 : 50);
  const [difficulty, setDifficulty] = useState<TowerDifficulty>('MEDIUM');
  const [roundActive, setRoundActive] = useState<boolean>(false);
  const [currentFloor, setCurrentFloor] = useState<number>(0);
  const [trapColsPerRow, setTrapColsPerRow] = useState<number[]>([]);
  const [pickedCols, setPickedCols] = useState<Record<number, number>>({});
  const [explodedFloor, setExplodedFloor] = useState<number | null>(null);
  const [cashedOutBanner, setCashedOutBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setBetAmount(activeTmaCurrency === 'TON' ? 0.5 : 50);
  }, [activeTmaCurrency]);

  const colsCount = difficulty === 'EASY' ? 4 : difficulty === 'MEDIUM' ? 3 : 2;
  const activeMult =
    currentFloor > 0 ? calculateTowerStepMultiplier(difficulty, currentFloor) : 1.0;
  const nextMult = calculateTowerStepMultiplier(difficulty, Math.min(8, currentFloor + 1));

  const handleStartTower = () => {
    setErrorMsg(null);
    setCashedOutBanner(null);
    setExplodedFloor(null);

    const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
    const cleanBet = Math.max(minBet, betAmount);
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    if (cleanBet > avail) {
      setErrorMsg('موجودی کیف پول برای شروع برج سه‌بعدی کافی نیست.');
      return;
    }

    HapticEngine.impactOccurred('medium');
    const board = deriveProvablyFairTowerBoard({
      serverSeed: provablyFairSeeds.serverSeed,
      clientSeed: provablyFairSeeds.clientSeed,
      nonce: provablyFairSeeds.nonce,
      difficulty,
    });
    setTrapColsPerRow(board.trapColumnsPerFloor);
    setPickedCols({});
    setCurrentFloor(0);
    setRoundActive(true);
    plinkoSoundEngine.playDrop();
  };

  const handleSelectTile = async (floorIdx: number, colIdx: number) => {
    if (!roundActive || floorIdx !== currentFloor) return;

    const nextPicked = { ...pickedCols, [floorIdx]: colIdx };
    setPickedCols(nextPicked);

    const trapCol = trapColsPerRow[floorIdx] ?? 0;
    const isHitTrap =
      difficulty === 'HARD' ? colIdx === trapCol : colIdx === trapCol;

    if (isHitTrap) {
      HapticEngine.notificationOccurred('error');
      plinkoSoundEngine.playBucketLand(0.2, false);
      setExplodedFloor(floorIdx);
      setRoundActive(false);

      const wagerUsdt = tmaCurrencyToUsdt(
        Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, betAmount),
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      const res = await playInstantMiniGame({
        gameId: 'TOWER_3D',
        betAmountUsdt: wagerUsdt,
        towerDifficulty: difficulty,
        towerFloorsCleared: floorIdx,
        towerHitTrap: true,
      });
      if (res.evaluation && onRoundSettled) {
        onRoundSettled(res.evaluation, res.debitTransactionUuid || '');
      }
      return;
    }

    // Cleared floor!
    const clearedSteps = floorIdx + 1;
    HapticEngine.impactOccurred('light');
    plinkoSoundEngine.playPegHit(clearedSteps * 2, 16);
    setCurrentFloor(clearedSteps);

    if (clearedSteps >= 8) {
      await handleCashoutTower(clearedSteps);
    }
  };

  const handleCashoutTower = async (stepsOverride?: number) => {
    const steps = stepsOverride ?? currentFloor;
    if (!roundActive || steps <= 0) return;

    HapticEngine.notificationOccurred('success');
    const mult = calculateTowerStepMultiplier(difficulty, steps);
    plinkoSoundEngine.playBucketLand(mult, mult >= 10);
    setRoundActive(false);

    const wagerUsdt = tmaCurrencyToUsdt(
      Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, betAmount),
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate
    );
    const res = await playInstantMiniGame({
      gameId: 'TOWER_3D',
      betAmountUsdt: wagerUsdt,
      towerDifficulty: difficulty,
      towerFloorsCleared: steps,
      towerHitTrap: false,
    });

    if (res.ok && res.evaluation) {
      const wonCurr = usdtToTmaCurrency(
        res.evaluation.payoutUsdt,
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      setCashedOutBanner(
        `🏰 برداشت موفق در طبقه ${steps}/8 با ضریب ${mult.toFixed(2)}x (+${formatTmaCurrency(
          wonCurr,
          activeTmaCurrency
        )})`
      );
      onRoundSettled?.(res.evaluation, res.debitTransactionUuid || '');
    }
  };

  return (
    <div data-testid="tower-3d-arena" className="space-y-3" dir="ltr">
      <div className="w-full rounded-2xl bg-[#0b0716] border border-purple-500/25 p-3.5 relative overflow-hidden">
        {/* Top Floating HUD */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="px-2.5 py-1 rounded-full bg-[#070510]/90 border border-purple-500/25 text-[11px] font-mono text-purple-200">
            Floor: <strong className="text-[#00f59b]">{currentFloor}/8</strong> • Now:{' '}
            <strong className="text-[#fbbf24]">{activeMult.toFixed(2)}x</strong>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[#070510]/90 border border-purple-500/25 text-[11px] font-mono text-[#00f59b]">
            Next: {nextMult.toFixed(2)}x
          </div>
        </div>

        {/* 8-Floor 3D Isometric Crystal Tower Stack (Top Floor 8 down to Floor 1) */}
        <div className="space-y-1.5 py-1" style={{ perspective: '800px' }}>
          {Array.from({ length: 8 }, (_, idx) => 7 - idx).map((floorIdx) => {
            const isCurrent = roundActive && floorIdx === currentFloor;
            const isCleared = floorIdx < currentFloor;
            const rowMult = calculateTowerStepMultiplier(difficulty, floorIdx + 1);

            return (
              <motion.div
                key={floorIdx}
                animate={{
                  scale: isCurrent ? 1.02 : 1,
                  rotateX: isCurrent ? 0 : 6,
                }}
                className={`grid items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-purple-900/35 border-[#00f59b]/60 shadow-[0_0_16px_rgba(0,245,155,0.2)]'
                    : isCleared
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-[#130d24]/80 border-purple-500/15 opacity-80'
                }`}
                style={{ gridTemplateColumns: `54px repeat(${colsCount}, minmax(0, 1fr))` }}
              >
                <span className="text-[10px] font-mono font-bold text-purple-300 tabular-nums">
                  F{floorIdx + 1} • {rowMult.toFixed(2)}x
                </span>
                {Array.from({ length: colsCount }, (__, cIdx) => {
                  const wasPicked = pickedCols[floorIdx] === cIdx;
                  const isTrap = trapColsPerRow[floorIdx] === cIdx;
                  const showReveal = !roundActive && (explodedFloor !== null || currentFloor > 0);

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      data-testid={`tower-floor-${floorIdx}-col-${cIdx}`}
                      disabled={!isCurrent}
                      onClick={() => handleSelectTile(floorIdx, cIdx)}
                      className={`h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        wasPicked && explodedFloor === floorIdx && isTrap
                          ? 'bg-rose-600 text-white border border-rose-300 shadow-[0_0_12px_#f43f5e]'
                          : wasPicked && isCleared
                          ? 'bg-[#00f59b] text-[#041f14] shadow-[0_0_12px_#00f59b]'
                          : showReveal && isTrap
                          ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                          : isCurrent
                          ? 'bg-gradient-to-b from-purple-600/50 to-indigo-900/60 hover:from-purple-500/70 border border-purple-300/40 text-white shadow-[0_2px_0_#3b0764]'
                          : 'bg-[#090612]/90 border border-purple-500/20 text-purple-300/50'
                      }`}
                    >
                      {wasPicked && explodedFloor === floorIdx && isTrap
                        ? '💀'
                        : wasPicked && isCleared
                        ? '💎'
                        : showReveal && isTrap
                        ? '🔥'
                        : isCurrent
                        ? '✨'
                        : '•'}
                    </button>
                  );
                })}
              </motion.div>
            );
          })}
        </div>

        {cashedOutBanner && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/90 border border-[#00f59b] text-[#00f59b] text-xs font-bold text-center" dir="rtl">
            {cashedOutBanner}
          </div>
        )}
        {explodedFloor !== null && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-bold text-center" dir="rtl">
            💥 برخورد با تله کریستالی در طبقه {explodedFloor + 1}!
          </div>
        )}
        {errorMsg && (
          <div className="mt-2.5 p-2 rounded-xl bg-rose-500/20 text-rose-200 text-xs text-center" dir="rtl">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Bottom Control Deck */}
      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span>{activeTmaCurrency === 'TON' ? '💎' : '⭐'}</span>
            <input
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              disabled={roundActive}
              value={betAmount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmount(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={roundActive}
              onClick={() => setBetAmount(activeTmaCurrency === 'TON' ? 0.01 : 1)}
              className="h-7 px-2 text-[10px] font-mono font-bold rounded-lg bg-purple-950/80 text-emerald-300 cursor-pointer"
            >
              MIN
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={() =>
                setBetAmount((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number((v / 2).toFixed(2)))
                    : Math.max(1, Math.floor(v / 2))
                )
              }
              className="h-7 px-2 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-purple-200 cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmount((v) =>
                  activeTmaCurrency === 'TON'
                    ? Math.min(Math.max(0.01, avail), Number((v * 2).toFixed(2)))
                    : Math.min(Math.max(1, avail), v * 2)
                );
              }}
              className="h-7 px-2 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-purple-200 cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              disabled={roundActive}
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmount(
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number(avail.toFixed(2)))
                    : Math.max(1, Math.floor(avail))
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-[#fbbf24] cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="h-10 rounded-xl bg-[#090612] p-1 border border-purple-500/20 grid grid-cols-3 gap-1">
          {(['EASY', 'MEDIUM', 'HARD'] as TowerDifficulty[]).map((diff) => (
            <button
              key={diff}
              type="button"
              disabled={roundActive}
              onClick={() => setDifficulty(diff)}
              className={`rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                difficulty === diff
                  ? 'bg-purple-600/40 text-white border border-purple-400/40'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              {diff === 'EASY' ? 'Easy (3/4)' : diff === 'MEDIUM' ? 'Med (2/3)' : 'Hard (1/2)'}
            </button>
          ))}
        </div>

        {roundActive ? (
          <button
            type="button"
            data-testid="tower-cashout-btn"
            disabled={currentFloor <= 0}
            onClick={() => handleCashoutTower()}
            className="w-full h-12 rounded-xl font-bold text-sm text-[#041f14] bg-[#00f59b] shadow-[0_4px_0_#059669] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
          >
            <span>Cash Out Floor {currentFloor} ({activeMult.toFixed(2)}x)</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="tower-start-btn"
            onClick={handleStartTower}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🏰 Climb 3D Tower</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono">
              {formatTmaCurrency(betAmount, activeTmaCurrency)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   2. WHEEL ROYALE 3D (چرخ شانس سه‌بعدی ۱۶ سگمنتی تا 50x)
   ============================================================================ */
export const Wheel3DGameArena: React.FC<ExtraArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    playInstantMiniGame,
    formatActiveTmaAmount,
  } = useLottery();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [betAmount, setBetAmount] = useState<number>(activeTmaCurrency === 'TON' ? 0.5 : 50);
  const [risk, setRisk] = useState<WheelRiskLevel>('MEDIUM');
  const [spinning, setSpinning] = useState<boolean>(false);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [lastWinBanner, setLastWinBanner] = useState<string | null>(null);

  const segments = WHEEL_SEGMENTS_16[risk];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 280;
    const H = 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const radius = 118;
    const segAngle = (Math.PI * 2) / segments.length;
    const rotRad = (rotationDeg * Math.PI) / 180;

    // Outer 3D Golden/Neon Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1338';
    ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < segments.length; i++) {
      const mult = segments[i];
      const startA = -Math.PI / 2 + i * segAngle - segAngle / 2 + rotRad;
      const endA = startA + segAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.closePath();

      ctx.fillStyle =
        mult >= 10
          ? '#fbbf24'
          : mult >= 3
          ? '#9333ea'
          : mult >= 1.5
          ? '#00f59b'
          : mult > 0
          ? '#38bdf8'
          : '#1e1b2e';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#090612';
      ctx.stroke();

      // Label along radius
      const midA = (startA + endA) / 2;
      ctx.translate(cx + Math.cos(midA) * (radius * 0.72), cy + Math.sin(midA) * (radius * 0.72));
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle = mult >= 1.5 ? '#090612' : '#e2e8f0';
      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${mult}x`, 0, 0);
      ctx.restore();
    }

    // Center 3D Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#090612';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f59b';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3D', cx, cy);

    // Top Pointer Flapper
    ctx.beginPath();
    ctx.moveTo(cx - 10, 6);
    ctx.lineTo(cx + 10, 6);
    ctx.lineTo(cx, 26);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    ctx.restore();
  }, [rotationDeg, segments]);

  const handleSpinWheel = async () => {
    if (spinning) return;
    setLastWinBanner(null);

    const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
    const cleanBet = Math.max(minBet, betAmount);
    const wagerUsdt = tmaCurrencyToUsdt(cleanBet, activeTmaCurrency, tonUsdRate, starsUsdRate);

    setSpinning(true);
    HapticEngine.impactOccurred('medium');
    plinkoSoundEngine.playDrop();

    const res = await playInstantMiniGame({
      gameId: 'WHEEL_3D',
      betAmountUsdt: wagerUsdt,
      wheelRisk: risk,
    });

    if (!res.ok || !res.evaluation) {
      setSpinning(false);
      setLastWinBanner(res.error || 'خطا در چرخش گردونه سه‌بعدی');
      return;
    }

    const ev = res.evaluation;
    const segIdx = ev.wheelSegmentIndex ?? 0;
    const segDeg = 360 / 16;
    const targetDeg = rotationDeg + 360 * 5 + (360 - segIdx * segDeg);

    const startDeg = rotationDeg;
    const startTime = performance.now();
    const duration = 1600;

    const animateWheel = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      setRotationDeg(startDeg + (targetDeg - startDeg) * easeOut);
      if (t < 1) {
        window.requestAnimationFrame(animateWheel);
      } else {
        setSpinning(false);
        plinkoSoundEngine.playBucketLand(ev.multiplier, ev.multiplier >= 10);
        setLastWinBanner(
          ev.won
            ? `🎡 سگمنت #${segIdx + 1} (${ev.multiplier}x) — برد +${formatActiveTmaAmount(
                ev.payoutUsdt
              )}`
            : `🎡 سگمنت #${segIdx + 1} (0x) — دور بعدی شانس خود را امتحان کنید`
        );
        onRoundSettled?.(ev, res.debitTransactionUuid || '');
      }
    };
    window.requestAnimationFrame(animateWheel);
  };

  return (
    <div data-testid="wheel-3d-arena" className="space-y-3" dir="ltr">
      <div className="w-full rounded-2xl bg-[#0b0716] border border-purple-500/25 p-4 flex flex-col items-center justify-center relative">
        <canvas ref={canvasRef} className="w-[260px] h-[260px] block select-none" />
        {lastWinBanner && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-[#130d24] border border-purple-400/40 text-xs font-bold text-[#00f59b] text-center" dir="rtl">
            {lastWinBanner}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span>{activeTmaCurrency === 'TON' ? '💎' : '⭐'}</span>
            <input
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              disabled={spinning}
              value={betAmount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmount(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBetAmount(activeTmaCurrency === 'TON' ? 0.01 : 1)}
              className="h-7 px-2 text-[10px] font-mono font-bold rounded-lg bg-purple-950/80 text-emerald-300 cursor-pointer"
            >
              MIN
            </button>
            <button
              type="button"
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmount(
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number(avail.toFixed(2)))
                    : Math.max(1, Math.floor(avail))
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-[#fbbf24] cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="h-10 rounded-xl bg-[#090612] p-1 border border-purple-500/20 grid grid-cols-3 gap-1">
          {(['LOW', 'MEDIUM', 'HIGH'] as WheelRiskLevel[]).map((rLevel) => (
            <button
              key={rLevel}
              type="button"
              disabled={spinning}
              onClick={() => setRisk(rLevel)}
              className={`rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                risk === rLevel
                  ? 'bg-purple-600/40 text-[#fbbf24] border border-purple-400/40'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              {rLevel === 'LOW' ? 'Low (Max 2x)' : rLevel === 'MEDIUM' ? 'Med (Max 10x)' : 'High (Max 50x)'}
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="wheel-spin-btn"
          disabled={spinning}
          onClick={handleSpinWheel}
          className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{spinning ? '🎡 Spinning 3D Wheel...' : '🎡 Spin Royale Wheel'}</span>
          <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono">
            {formatTmaCurrency(betAmount, activeTmaCurrency)}
          </span>
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
   3. CYBER HI-LO 3D (کارت هولوگرافیک سه‌بعدی بالاتر / پایین‌تر)
   ============================================================================ */
const CARD_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const HiLo3DGameArena: React.FC<ExtraArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    playInstantMiniGame,
    formatActiveTmaAmount,
  } = useLottery();

  const [betAmount, setBetAmount] = useState<number>(activeTmaCurrency === 'TON' ? 0.5 : 50);
  const [baseCard, setBaseCard] = useState<number>(7);
  const [drawnCard, setDrawnCard] = useState<number | null>(null);
  const [flipping, setFlipping] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string | null>(null);

  const higherChoices = Math.max(1, 13 - baseCard + 1);
  const lowerChoices = Math.max(1, baseCard);
  const higherMult = Number(((13 / higherChoices) * 0.98).toFixed(2));
  const lowerMult = Number(((13 / lowerChoices) * 0.98).toFixed(2));

  const handleGuess = async (guess: 'HIGHER' | 'LOWER' | 'SAME') => {
    if (flipping) return;
    setFlipping(true);
    setResultText(null);
    HapticEngine.impactOccurred('medium');

    const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
    const wagerUsdt = tmaCurrencyToUsdt(
      Math.max(minBet, betAmount),
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate
    );

    const targetMult =
      guess === 'SAME' ? 12.74 : guess === 'HIGHER' ? higherMult : lowerMult;

    const res = await playInstantMiniGame({
      gameId: 'HILO_3D',
      betAmountUsdt: wagerUsdt,
      hiloMultiplier: targetMult,
      hiloSummaryLabel: `Cyber Hi-Lo 3D (${guess} from #${baseCard})`,
    });

    setFlipping(false);
    if (!res.ok || !res.evaluation) {
      setResultText(res.error || 'خطا در اجرای Cyber Hi-Lo 3D');
      return;
    }

    const ev = res.evaluation;
    const nextCard = ev.hiloNextCard || ev.outcomeNumeric || 7;
    setDrawnCard(nextCard);
    setBaseCard(nextCard);
    plinkoSoundEngine.playBucketLand(ev.multiplier, ev.multiplier >= 5);
    setResultText(
      ev.won
        ? `🃏 کارت ${CARD_LABELS[nextCard]} آمد! برد +${formatActiveTmaAmount(ev.payoutUsdt)} (${ev.multiplier}x)`
        : `🃏 کارت ${CARD_LABELS[nextCard]} آمد — عدم تطابق (0x)`
    );
    onRoundSettled?.(ev, res.debitTransactionUuid || '');
  };

  return (
    <div data-testid="hilo-3d-arena" className="space-y-3" dir="ltr">
      <div className="w-full rounded-2xl bg-[#0b0716] border border-purple-500/25 p-5 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-6" style={{ perspective: '900px' }}>
          <motion.div
            key={baseCard}
            initial={{ rotateY: 90, scale: 0.9 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            className="w-28 h-40 rounded-2xl bg-gradient-to-br from-[#2e1065] via-[#1e1b4b] to-[#090612] border-2 border-[#00f59b] shadow-[0_0_25px_rgba(0,245,155,0.3)] flex flex-col items-center justify-between p-3"
          >
            <span className="self-start font-mono text-sm font-black text-[#00f59b]">
              {CARD_LABELS[baseCard]}♠
            </span>
            <span className="text-4xl font-black text-white font-mono">
              {CARD_LABELS[baseCard]}
            </span>
            <span className="self-end font-mono text-xs text-purple-300">#{baseCard}/13</span>
          </motion.div>
        </div>

        {resultText && (
          <div className="px-3 py-1.5 rounded-xl bg-[#130d24] border border-purple-500/30 text-xs font-bold text-[#fbbf24] text-center" dir="rtl">
            {resultText}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span>{activeTmaCurrency === 'TON' ? '💎' : '⭐'}</span>
            <input
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              value={betAmount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmount(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBetAmount(activeTmaCurrency === 'TON' ? 0.01 : 1)}
              className="h-7 px-2 text-[10px] font-mono font-bold rounded-lg bg-purple-950/80 text-emerald-300 cursor-pointer"
            >
              MIN
            </button>
            <button
              type="button"
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmount(
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number(avail.toFixed(2)))
                    : Math.max(1, Math.floor(avail))
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-[#fbbf24] cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            data-testid="hilo-higher-btn"
            onClick={() => handleGuess('HIGHER')}
            className="h-12 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/45 border border-[#00f59b]/50 text-xs font-bold text-white flex flex-col items-center justify-center cursor-pointer"
          >
            <span>⬆️ Higher / Same</span>
            <span className="text-[10px] font-mono text-[#00f59b]">{higherMult}x</span>
          </button>
          <button
            type="button"
            data-testid="hilo-same-btn"
            onClick={() => handleGuess('SAME')}
            className="h-12 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 border border-[#fbbf24]/50 text-xs font-bold text-white flex flex-col items-center justify-center cursor-pointer"
          >
            <span>🎯 Exact Same</span>
            <span className="text-[10px] font-mono text-[#fbbf24]">12.74x</span>
          </button>
          <button
            type="button"
            data-testid="hilo-lower-btn"
            onClick={() => handleGuess('LOWER')}
            className="h-12 rounded-xl bg-purple-600/35 hover:bg-purple-600/50 border border-purple-400/50 text-xs font-bold text-white flex flex-col items-center justify-center cursor-pointer"
          >
            <span>⬇️ Lower / Same</span>
            <span className="text-[10px] font-mono text-purple-200">{lowerMult}x</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. GOLDEN COIN FLIP 3D (پرتاب سکه طلایی سه‌بعدی TON با ضریب 1.96x)
   ============================================================================ */
export const GoldenCoin3DGameArena: React.FC<ExtraArenaProps> = ({ onRoundSettled }) => {
  const {
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    playInstantMiniGame,
    formatActiveTmaAmount,
  } = useLottery();

  const [betAmount, setBetAmount] = useState<number>(activeTmaCurrency === 'TON' ? 0.5 : 50);
  const [choice, setChoice] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [flipping, setFlipping] = useState<boolean>(false);
  const [outcomeSide, setOutcomeSide] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [banner, setBanner] = useState<string | null>(null);

  const handleFlipCoin = async () => {
    if (flipping) return;
    setFlipping(true);
    setBanner(null);
    HapticEngine.impactOccurred('medium');
    plinkoSoundEngine.playDrop();

    const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
    const wagerUsdt = tmaCurrencyToUsdt(
      Math.max(minBet, betAmount),
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate
    );

    const res = await playInstantMiniGame({
      gameId: 'GOLDEN_COIN',
      betAmountUsdt: wagerUsdt,
      coinSide: choice,
    });

    window.setTimeout(() => {
      setFlipping(false);
      if (!res.ok || !res.evaluation) {
        setBanner(res.error || 'خطا در چرخش سکه سه‌بعدی');
        return;
      }
      const ev = res.evaluation;
      const landed: 'HEADS' | 'TAILS' = ev.outcomeNumeric === 0 ? 'HEADS' : 'TAILS';
      setOutcomeSide(landed);
      plinkoSoundEngine.playBucketLand(ev.multiplier, false);
      setBanner(
        ev.won
          ? `🪙 سکه روی ${landed} ایستاد! برد +${formatActiveTmaAmount(ev.payoutUsdt)} (1.96x)`
          : `🪙 سکه روی ${landed} ایستاد (0x)`
      );
      onRoundSettled?.(ev, res.debitTransactionUuid || '');
    }, 450);
  };

  return (
    <div data-testid="golden-coin-3d-arena" className="space-y-3" dir="ltr">
      <div className="w-full rounded-2xl bg-[#0b0716] border border-purple-500/25 p-6 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotateY: flipping ? 1080 : 0, scale: flipping ? 1.12 : 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#b45309] border-4 border-[#fef08a] shadow-[0_0_35px_rgba(251,191,36,0.5)] flex flex-col items-center justify-center select-none"
        >
          <span className="text-3xl">{outcomeSide === 'HEADS' ? '💎' : '👑'}</span>
          <span className="text-xs font-mono font-black text-slate-950 mt-1">{outcomeSide}</span>
        </motion.div>

        {banner && (
          <div className="px-3 py-1.5 rounded-xl bg-[#130d24] border border-[#fbbf24]/40 text-xs font-bold text-[#fbbf24] text-center" dir="rtl">
            {banner}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span>{activeTmaCurrency === 'TON' ? '💎' : '⭐'}</span>
            <input
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              value={betAmount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmount(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBetAmount(activeTmaCurrency === 'TON' ? 0.01 : 1)}
              className="h-7 px-2 text-[10px] font-mono font-bold rounded-lg bg-purple-950/80 text-emerald-300 cursor-pointer"
            >
              MIN
            </button>
            <button
              type="button"
              onClick={() => {
                const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
                setBetAmount(
                  activeTmaCurrency === 'TON'
                    ? Math.max(0.01, Number(avail.toFixed(2)))
                    : Math.max(1, Math.floor(avail))
                );
              }}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 text-[#fbbf24] cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['HEADS', 'TAILS'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setChoice(side)}
              className={`h-10 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                choice === side
                  ? 'bg-[#fbbf24]/25 border-[#fbbf24] text-[#fbbf24]'
                  : 'bg-[#090612] border-purple-500/20 text-purple-300/70'
              }`}
            >
              {side === 'HEADS' ? '💎 HEADS (1.96x)' : '👑 TAILS (1.96x)'}
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="coin-flip-btn"
          disabled={flipping}
          onClick={handleFlipCoin}
          className="w-full h-12 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#fde047] to-[#f59e0b] shadow-[0_4px_0_#b45309] active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🪙 Flip 3D TON Coin (1.96x)</span>
          <span className="px-2 py-0.5 rounded-lg bg-black/20 text-xs font-mono">
            {formatTmaCurrency(betAmount, activeTmaCurrency)}
          </span>
        </button>
      </div>
    </div>
  );
};
