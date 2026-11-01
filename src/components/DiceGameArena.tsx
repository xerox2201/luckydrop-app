import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLottery, TicketItem } from '../context/LotteryContext.tsx';
import {
  DiceRollMode,
  DICE_RTP_PERCENT,
  DICE_MIN_WIN_CHANCE,
  DICE_MAX_WIN_CHANCE,
  DICE_TREASURY_MAX_PAYOUT_USDT,
  syncDiceFromWinChance,
  syncDiceFromTarget,
  syncDiceFromMultiplier,
  flipDiceRollMode,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import { diceSoundEngine } from '../utils/diceSoundEngine.ts';
import { tmaCurrencyToUsdt } from '../utils/telegramTma.ts';

interface DiceRollHistoryBadge {
  id: string;
  rollResult: number;
  won: boolean;
  multiplier: number;
  payoutUsdt: number;
  lucky7777: boolean;
  nonce: number;
}

interface CanvasShockwaveRing {
  xPct: number; // 0 to 100
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface CanvasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
}

interface DiceGameArenaProps {
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}

export const DiceGameArena: React.FC<DiceGameArenaProps> = ({ onRoundSettled }) => {
  const {
    balanceUsdt,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    activeTmaCurrency,
    formatCurrency,
    formatActiveTmaAmount,
    provablyFairSeeds,
    playInstantMiniGame,
    pamBonus,
    setWalletDrawerOpen,
    navigateTo,
  } = useLottery();

  // Sidebar Mode: Manual vs Auto (betAmount is in activeTmaCurrency: TON or STARS)
  const [controlTab, setControlTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [betAmount, setBetAmount] = useState<number>(() =>
    activeTmaCurrency === 'TON' ? 2 : 100
  );
  const [baseAutoBetAmount, setBaseAutoBetAmount] = useState<number>(() =>
    activeTmaCurrency === 'TON' ? 2 : 100
  );

  useEffect(() => {
    setBetAmount((prev) => {
      if (activeTmaCurrency === 'TON' && prev >= 50) return 2;
      if (activeTmaCurrency === 'STARS' && prev < 10) return 100;
      return prev;
    });
  }, [activeTmaCurrency]);

  // Bidirectional 99% RTP State (Mode, Target, Win Chance %, Multiplier)
  const [diceMode, setDiceMode] = useState<DiceRollMode>('OVER');
  const [targetValue, setTargetValue] = useState<number>(50.5);
  const [winChance, setWinChance] = useState<number>(49.5);
  const [multiplier, setMultiplier] = useState<number>(2.0);

  // Editable raw string states for the 3 synced bottom inputs so typing decimals feels effortless
  const [multiplierInputStr, setMultiplierInputStr] = useState<string>('2.0000');
  const [targetInputStr, setTargetInputStr] = useState<string>('50.50');
  const [winChanceInputStr, setWinChanceInputStr] = useState<string>('49.50');

  // Auto-Bet & Martingale Strategy State
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [autoTotalBets, setAutoTotalBets] = useState<number>(0); // 0 = infinite
  const [autoRemainingBets, setAutoRemainingBets] = useState<number>(0);
  const [onWinAction, setOnWinAction] = useState<'RESET' | 'INCREASE'>('RESET');
  const [onWinIncreasePct, setOnWinIncreasePct] = useState<number>(0);
  const [onLossAction, setOnLossAction] = useState<'RESET' | 'INCREASE'>('INCREASE');
  const [onLossIncreasePct, setOnLossIncreasePct] = useState<number>(100); // Classic 2x Martingale

  // Floating 3D Hexagon Marker State
  const [lastRollResult, setLastRollResult] = useState<number | null>(64.28);
  const [lastRollWon, setLastRollWon] = useState<boolean>(true);
  const [markerBounceActive, setMarkerBounceActive] = useState<boolean>(false);
  const [rollingNow, setRollingNow] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(diceSoundEngine.isMuted());
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lucky7777Banner, setLucky7777Banner] = useState<{
    rollResult: number;
    ticket: TicketItem | null;
  } | null>(null);

  // Top 12 Roll Outcomes Ribbon
  const [rollHistory, setRollHistory] = useState<DiceRollHistoryBadge[]>([
    { id: 'init-1', rollResult: 64.28, won: true, multiplier: 2.0, payoutUsdt: 20, lucky7777: false, nonce: 1 },
    { id: 'init-2', rollResult: 21.45, won: false, multiplier: 0, payoutUsdt: 0, lucky7777: false, nonce: 2 },
    { id: 'init-3', rollResult: 88.12, won: true, multiplier: 2.0, payoutUsdt: 20, lucky7777: false, nonce: 3 },
    { id: 'init-4', rollResult: 77.77, won: true, multiplier: 2.0, payoutUsdt: 20, lucky7777: true, nonce: 4 },
    { id: 'init-5', rollResult: 42.90, won: false, multiplier: 0, payoutUsdt: 0, lucky7777: false, nonce: 5 },
    { id: 'init-6', rollResult: 53.04, won: true, multiplier: 2.0, payoutUsdt: 20, lucky7777: false, nonce: 6 },
    { id: 'init-7', rollResult: 14.60, won: false, multiplier: 0, payoutUsdt: 0, lucky7777: false, nonce: 7 },
    { id: 'init-8', rollResult: 95.81, won: true, multiplier: 2.0, payoutUsdt: 20, lucky7777: false, nonce: 8 },
  ]);

  // Refs for 3D Slider Drag & 60fps Canvas Effects
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSliderRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shockwavesRef = useRef<CanvasShockwaveRing[]>([]);
  const particlesRef = useRef<CanvasParticle[]>([]);
  const autoTimerRef = useRef<number | null>(null);
  const betAmountRef = useRef<number>(betAmount);
  betAmountRef.current = betAmount;

  // Apply synchronized Dice parameters across state + input boxes
  const applySyncedParams = useCallback(
    (synced: { mode: DiceRollMode; target: number; winChance: number; multiplier: number }) => {
      setDiceMode(synced.mode);
      setTargetValue(synced.target);
      setWinChance(synced.winChance);
      setMultiplier(synced.multiplier);
      setMultiplierInputStr(synced.multiplier.toFixed(4));
      setTargetInputStr(synced.target.toFixed(2));
      setWinChanceInputStr(synced.winChance.toFixed(2));
    },
    []
  );

  // Handlers for Bidirectional Sync
  const handleWinChanceChange = (nextChance: number) => {
    const synced = syncDiceFromWinChance(nextChance, diceMode);
    applySyncedParams(synced);
  };

  const handleTargetChange = (nextTarget: number) => {
    const synced = syncDiceFromTarget(nextTarget, diceMode);
    applySyncedParams(synced);
  };

  const handleMultiplierChange = (nextMultiplier: number) => {
    const synced = syncDiceFromMultiplier(nextMultiplier, diceMode);
    applySyncedParams(synced);
  };

  const handleFlipRollMode = () => {
    const synced = flipDiceRollMode(targetValue, diceMode);
    applySyncedParams(synced);
    diceSoundEngine.playSliderTick(synced.winChance);
  };

  // Dragging the 3D Beveled Slider Handle
  const updateTargetFromPointerClientX = useCallback(
    (clientX: number) => {
      const trackEl = trackRef.current;
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = (clientX - rect.left) / rect.width;
      const rawPct = Math.max(2, Math.min(98, Number((ratio * 100).toFixed(2))));
      const synced = syncDiceFromTarget(rawPct, diceMode);
      applySyncedParams(synced);
      diceSoundEngine.playSliderTick(synced.winChance);
    },
    [applySyncedParams, diceMode]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingSliderRef.current) return;
      updateTargetFromPointerClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingSliderRef.current || !e.touches[0]) return;
      updateTargetFromPointerClientX(e.touches[0].clientX);
    };
    const onPointerUp = () => {
      isDraggingSliderRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [updateTargetFromPointerClientX]);

  // Spawn 30+ glowing green/gold particles + emerald shockwave on the 60fps canvas when a roll lands
  const triggerCanvasRollBurst = useCallback(
    (rollPct: number, won: boolean, isLucky7777: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      // Track horizontal padding matches the DOM slider container (px-8 = 32px)
      const padX = 44;
      const trackW = Math.max(200, W - padX * 2);
      const hitX = padX + (Math.max(0, Math.min(100, rollPct)) / 100) * trackW;
      const hitY = H * 0.52;

      shockwavesRef.current.push({
        xPct: rollPct,
        radius: 14,
        maxRadius: isLucky7777 ? 150 : won ? 110 : 55,
        alpha: 0.95,
        color: isLucky7777 ? '#fbbf24' : won ? '#00e701' : '#e9113c',
      });

      const count = isLucky7777 ? 55 : won ? 36 : 12;
      const palette = isLucky7777
        ? ['#fbbf24', '#fde047', '#00e701', '#ffffff']
        : won
        ? ['#00e701', '#4ade80', '#fbbf24', '#a7f3d0']
        : ['#e9113c', '#f43f5e'];

      for (let i = 0; i < count; i++) {
        const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const speed = (won ? 120 : 65) + Math.random() * (isLucky7777 ? 260 : 180);
        particlesRef.current.push({
          x: hitX,
          y: hitY - 18,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 90,
          vy: Math.sin(angle) * speed - Math.random() * 60,
          size: (won ? 4.5 : 3) + Math.random() * 4.5,
          color: palette[i % palette.length],
          alpha: 1,
          decay: 1.1 + Math.random() * 0.8,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 9,
        });
      }
    },
    []
  );

  // 60FPS High-DPI Canvas Render Loop for Ambient Particles, Shockwave Rings & 3D Isometric Cube/Hexagon Glow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rAF = 0;
    let lastTime = performance.now();

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.max(300, Math.floor(rect.width * dpr));
      const targetH = Math.max(260, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();
    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    resizeObs?.observe(canvas);

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      updateSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Subtle radial studio spotlight in the center of the arena
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.48, 20, W * 0.5, H * 0.48, W * 0.65);
      grad.addColorStop(0, 'rgba(30, 55, 72, 0.55)');
      grad.addColorStop(1, 'rgba(15, 33, 46, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const padX = 44;
      const trackW = Math.max(200, W - padX * 2);
      const centerY = H * 0.52;

      // Render expanding neon shockwave rings on the slider bar
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += (sw.maxRadius - sw.radius) * 8.5 * dt + 95 * dt;
        sw.alpha -= 1.85 * dt;
        if (sw.alpha <= 0.01) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }
        const sx = padX + (Math.max(0, Math.min(100, sw.xPct)) / 100) * trackW;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, centerY, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = 3.5;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      }

      // Render 30+ glowing green/gold confetti & spark particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 320 * dt; // gravity
        p.rotation += p.vRot * dt;
        p.alpha -= p.decay * dt;
        if (p.alpha <= 0.01) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }

      ctx.restore();
      rAF = window.requestAnimationFrame(render);
    };

    rAF = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rAF);
      resizeObs?.disconnect();
    };
  }, []);

  // Execute a Single 52-Bit Provably Fair Dice Roll connected 100% to PAM Seamless Wallet
  const executeSingleDiceRoll = useCallback(
    async (overrideBetAmount?: number): Promise<{ ok: boolean; won: boolean; nextBetAmount: number }> => {
      const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
      const currentBet =
        activeTmaCurrency === 'TON'
          ? Math.max(minBet, Number((overrideBetAmount ?? betAmountRef.current).toFixed(2)) || 0.01)
          : Math.max(minBet, Math.round(overrideBetAmount ?? betAmountRef.current) || 1);
      const wagerUsdt = tmaCurrencyToUsdt(
        currentBet,
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      setErrorBanner(null);
      setRollingNow(true);
      diceSoundEngine.playRollSlide();

      const res = await playInstantMiniGame({
        gameId: 'DICE_52',
        betAmountUsdt: wagerUsdt,
        betAmountNative: currentBet,
        currency: activeTmaCurrency,
        diceRollUnder: targetValue,
        diceTarget: targetValue,
        diceMode,
      });

      setRollingNow(false);

      if (!res.ok || !res.evaluation) {
        setErrorBanner(res.error || 'خطا در اجرای رول ۵۲ بیتی در کیف پول PAM');
        setAutoRunning(false);
        return { ok: false, won: false, nextBetAmount: currentBet };
      }

      const ev = res.evaluation;
      const rolledNum = ev.outcomeNumeric;
      const won = ev.won;
      const isLucky7777 = Boolean(ev.diceLucky7777Ticket);

      setLastRollResult(rolledNum);
      setLastRollWon(won);

      if (won) {
        setMarkerBounceActive(true);
        window.setTimeout(() => setMarkerBounceActive(false), 320);
        diceSoundEngine.playWin(ev.multiplier);
      } else {
        setMarkerBounceActive(false);
        diceSoundEngine.playLoss();
      }

      if (isLucky7777) {
        setLucky7777Banner({
          rollResult: rolledNum,
          ticket: res.bonusTicketAwarded || null,
        });
      }

      triggerCanvasRollBurst(rolledNum, won, isLucky7777);

      const badge: DiceRollHistoryBadge = {
        id: `${ev.roundId}-${Date.now()}`,
        rollResult: rolledNum,
        won,
        multiplier: ev.multiplier,
        payoutUsdt: ev.payoutUsdt,
        lucky7777: isLucky7777,
        nonce: ev.nonce,
      };
      setRollHistory((prev) => [badge, ...prev.slice(0, 11)]);

      if (onRoundSettled) {
        onRoundSettled(ev, res.debitTransactionUuid || '');
      }

      // Calculate next bet amount for Auto-Bet / Martingale strategy
      let nextBet = currentBet;
      if (controlTab === 'AUTO') {
        if (won) {
          if (onWinAction === 'RESET') {
            nextBet = baseAutoBetAmount;
          } else {
            nextBet = Number((currentBet * (1 + onWinIncreasePct / 100)).toFixed(2));
          }
        } else {
          if (onLossAction === 'RESET') {
            nextBet = baseAutoBetAmount;
          } else {
            nextBet = Number((currentBet * (1 + onLossIncreasePct / 100)).toFixed(2));
          }
        }
        nextBet = Math.max(0.5, Math.min(1000, nextBet));
        setBetAmount(nextBet);
      }

      return { ok: true, won, nextBetAmount: nextBet };
    },
    [
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate,
      baseAutoBetAmount,
      controlTab,
      diceMode,
      onLossAction,
      onLossIncreasePct,
      onRoundSettled,
      onWinAction,
      onWinIncreasePct,
      playInstantMiniGame,
      targetValue,
      triggerCanvasRollBurst,
    ]
  );

  // Manage Auto-Bet Loop
  useEffect(() => {
    if (!autoRunning) {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const stepAuto = async () => {
      if (cancelled) return;
      const result = await executeSingleDiceRoll(betAmountRef.current);
      if (!result.ok || cancelled) {
        setAutoRunning(false);
        return;
      }

      if (autoTotalBets > 0) {
        setAutoRemainingBets((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setAutoRunning(false);
            return 0;
          }
          return next;
        });
      }

      if (!cancelled) {
        autoTimerRef.current = window.setTimeout(stepAuto, 340);
      }
    };

    autoTimerRef.current = window.setTimeout(stepAuto, 120);
    return () => {
      cancelled = true;
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
      }
    };
  }, [autoRunning, autoTotalBets, executeSingleDiceRoll]);

  const handlePrimaryBetAction = () => {
    if (controlTab === 'MANUAL') {
      executeSingleDiceRoll(betAmount);
    } else {
      if (autoRunning) {
        setAutoRunning(false);
      } else {
        setBaseAutoBetAmount(betAmount);
        setAutoRemainingBets(autoTotalBets);
        setAutoRunning(true);
      }
    }
  };

  // Trigger a verifiable Lucky 77.77 Jackpot Synergy celebration + Free Lottery Ticket reward
  const handleSimulateLucky7777Roll = async () => {
    diceSoundEngine.playRollSlide();
    setLastRollResult(77.77);
    setLastRollWon(true);
    setMarkerBounceActive(true);
    window.setTimeout(() => setMarkerBounceActive(false), 360);
    diceSoundEngine.playWin(10);
    triggerCanvasRollBurst(77.77, true, true);

    await pamBonus({
      roundId: '#LUCKY-7777',
      vertical: 'INSTANT_DICE_52_JACKPOT',
      amountUsdt: 5,
      creditToRealBalance: false,
      note: 'پاداش بلیت رایگان لاتاری ویژه رول طلایی 77.77 در 52-Bit Dice',
    });

    setLucky7777Banner({
      rollResult: 77.77,
      ticket: null,
    });

    setRollHistory((prev) => [
      {
        id: `lucky7777-${Date.now()}`,
        rollResult: 77.77,
        won: true,
        multiplier,
        payoutUsdt: Number((betAmount * multiplier).toFixed(2)),
        lucky7777: true,
        nonce: provablyFairSeeds.nonce,
      },
      ...prev.slice(0, 11),
    ]);
  };

  const handleHalfBet = () => {
    setBetAmount((prev) =>
      activeTmaCurrency === 'TON'
        ? Math.max(0.01, Number((prev / 2).toFixed(2)))
        : Math.max(1, Math.floor(prev / 2))
    );
  };

  const handleDoubleBet = () => {
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    setBetAmount((prev) =>
      activeTmaCurrency === 'TON'
        ? Math.min(Math.max(0.01, avail), Number((prev * 2).toFixed(2)))
        : Math.min(Math.max(1, avail), prev * 2)
    );
  };

  const handleMaxBet = () => {
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    setBetAmount(
      activeTmaCurrency === 'TON'
        ? Math.max(0.01, Number(avail.toFixed(2)))
        : Math.max(1, Math.floor(avail))
    );
  };

  const handleToggleMute = () => {
    const nextMuted = diceSoundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const rawProfitOnWinCurrency =
    activeTmaCurrency === 'TON'
      ? Number((betAmount * (multiplier - 1)).toFixed(2))
      : Math.round(betAmount * (multiplier - 1));
  const profitOnWinCurrency = Math.max(0, rawProfitOnWinCurrency);
  const clampedTargetPct = Math.max(2, Math.min(98, targetValue));
  const markerLeftPct =
    lastRollResult !== null ? Math.max(1, Math.min(99, lastRollResult)) : clampedTargetPct;

  return (
    <div className="space-y-3" dir="ltr" data-testid="stake-dice-studio">
      {errorBanner && (
        <div
          className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-between"
          dir="rtl"
        >
          <span>⚠️ {errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-[11px] underline cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {lucky7777Banner && (
        <div
          data-testid="dice-lucky-7777-banner"
          className="p-3 rounded-2xl bg-[#130d24]/90 border border-[#fbbf24]/50 text-[#fbbf24] text-xs font-semibold flex items-center justify-between gap-2"
          dir="rtl"
        >
          <span>
            🎰 جک‌پات LUCKY {lucky7777Banner.rollResult.toFixed(2)} فعال شد! (+۱ بلیت رایگان لاتاری)
          </span>
          <button
            type="button"
            onClick={() => navigateTo('my-tickets')}
            className="px-2.5 py-1 rounded-lg bg-[#fbbf24] text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
          >
            مشاهده ↗
          </button>
        </div>
      )}

      {/* =====================================================================
          TOP: GAME CANVAS CONTAINER
          w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716]
          border border-purple-500/25 overflow-hidden relative
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716] border border-purple-500/25 overflow-hidden relative flex flex-col justify-between">
        {/* 60FPS Background Canvas for Shockwaves & Particle Bursts */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Top Bar: Floating Translucent Pills (Left: Recent Multipliers/Rolls, Right: Sound/Fairness) */}
        <div className="relative z-10 p-2.5 flex items-center justify-between gap-2">
          <div
            data-testid="dice-history-ribbon"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 max-w-[70%] overflow-x-auto no-scrollbar"
          >
            {rollHistory.slice(0, 5).map((item, idx) => (
              <span
                key={item.id}
                data-testid={`dice-history-pill-${idx}`}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tabular-nums shrink-0 ${
                  item.lucky7777
                    ? 'bg-[#fbbf24] text-slate-950'
                    : item.won
                    ? 'bg-[#00f59b] text-[#041f14]'
                    : 'bg-purple-950/90 text-purple-200'
                }`}
              >
                {item.rollResult.toFixed(2)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="dice-audio-mute-btn"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute Dice Audio' : 'Mute Dice Audio'}
              className="h-7 px-2.5 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-purple-200/90 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('transparency')}
              aria-label="Provably Fair Verifier"
              className="h-7 px-2.5 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[11px] font-mono text-[#00f59b] flex items-center gap-1 cursor-pointer"
            >
              <span>🛡️</span>
              <span>#{provablyFairSeeds.nonce}</span>
            </button>
          </div>
        </div>

        {/* CENTERPIECE: FLOATING 3D HEXAGON MARKER + 3D BEVELED SLIDER TRACK */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 select-none">
          <div className="w-full space-y-3">
            {/* Scale Tick Marks Above Track */}
            <div className="w-full px-2 flex items-center justify-between text-[11px] font-mono font-bold text-purple-300/60 tabular-nums">
              {[0, 25, 50, 75, 100].map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>

            <div className="relative pt-14 pb-2">
              {lastRollResult !== null && (
                <div
                  data-testid="dice-3d-hexagon-marker"
                  style={{
                    left: `${markerLeftPct}%`,
                    transition: 'left 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className="absolute top-0 -translate-x-1/2 z-20 pointer-events-none"
                >
                  <div
                    className={`relative flex flex-col items-center transition-transform duration-200 ${
                      markerBounceActive ? 'scale-[1.15]' : 'scale-100'
                    }`}
                  >
                    <div className="relative w-20 h-13 flex items-center justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.75)]">
                      <svg viewBox="0 0 120 84" className="absolute inset-0 w-full h-full">
                        <polygon
                          points="22,12 98,12 114,44 98,74 60,82 22,74 6,44"
                          fill="#475569"
                        />
                        <polygon
                          points="24,6 96,6 112,38 96,66 60,74 24,66 8,38"
                          fill="#f8fafc"
                          stroke={lastRollWon ? '#00f59b' : '#f43f5e'}
                          strokeWidth="4"
                        />
                      </svg>
                      <span
                        data-testid="dice-marker-roll-value"
                        className={`relative z-10 font-mono text-sm font-black tracking-tight tabular-nums ${
                          lastRollWon ? 'text-[#059669]' : 'text-[#e11d48]'
                        }`}
                      >
                        {lastRollResult.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3D BEVELED SLIDER TRACK */}
              <div
                ref={trackRef}
                data-testid="dice-3d-slider-track"
                onMouseDown={(e) => {
                  isDraggingSliderRef.current = true;
                  updateTargetFromPointerClientX(e.clientX);
                }}
                onTouchStart={(e) => {
                  if (!e.touches[0]) return;
                  isDraggingSliderRef.current = true;
                  updateTargetFromPointerClientX(e.touches[0].clientX);
                }}
                className="relative w-full h-12 rounded-full bg-[#070510] p-2 shadow-inner border border-purple-500/30 cursor-pointer flex items-center"
              >
                <div className="relative w-full h-full rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${clampedTargetPct}%` }}
                    className={`h-full transition-colors duration-150 ${
                      diceMode === 'UNDER' ? 'bg-[#00f59b]' : 'bg-[#f43f5e]'
                    }`}
                  />
                  <div
                    style={{ width: `${100 - clampedTargetPct}%` }}
                    className={`h-full transition-colors duration-150 ${
                      diceMode === 'OVER' ? 'bg-[#00f59b]' : 'bg-[#f43f5e]'
                    }`}
                  />
                </div>

                {/* 3D DRAG HANDLE */}
                <div
                  role="slider"
                  aria-label="52-Bit Dice Target Slider"
                  aria-valuemin={2}
                  aria-valuemax={98}
                  aria-valuenow={targetValue}
                  tabIndex={0}
                  data-testid="dice-3d-slider-handle"
                  style={{ left: `${clampedTargetPct}%` }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      handleTargetChange(Math.max(2, targetValue - 1));
                    } else if (e.key === 'ArrowRight') {
                      handleTargetChange(Math.min(98, targetValue + 1));
                    }
                  }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-10 rounded-xl bg-gradient-to-b from-purple-400 to-purple-700 border-2 border-purple-200 shadow-lg flex items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing z-30"
                >
                  <span className="w-0.5 h-4 rounded-full bg-white/80" />
                  <span className="w-0.5 h-4 rounded-full bg-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Canvas Info Bar: Multiplier, Roll Over/Under, Win Chance */}
        <div
          data-testid="dice-bottom-synced-bar"
          className="relative z-10 px-3 pb-3 grid grid-cols-3 gap-2"
        >
          <div className="rounded-xl bg-[#070510]/90 border border-purple-500/20 px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-purple-300/60 block">Multiplier</span>
            <input
              id="dice-multiplier-input"
              type="number"
              step="0.1"
              min="1.0102"
              max="9900"
              data-testid="dice-multiplier-input"
              value={multiplierInputStr}
              onChange={(e) => {
                setMultiplierInputStr(e.target.value);
                const num = parseFloat(e.target.value);
                if (Number.isFinite(num) && num >= 1.0102) {
                  const synced = syncDiceFromMultiplier(num, diceMode);
                  setDiceMode(synced.mode);
                  setTargetValue(synced.target);
                  setWinChance(synced.winChance);
                  setMultiplier(synced.multiplier);
                  setTargetInputStr(synced.target.toFixed(2));
                  setWinChanceInputStr(synced.winChance.toFixed(2));
                }
              }}
              onBlur={() => setMultiplierInputStr(multiplier.toFixed(4))}
              className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="rounded-xl bg-[#070510]/90 border border-purple-500/20 px-2.5 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-purple-300/60">
                {diceMode === 'OVER' ? 'Roll Over' : 'Roll Under'}
              </span>
              <button
                type="button"
                data-testid="dice-flip-mode-btn"
                onClick={handleFlipRollMode}
                className="text-[10px] font-bold text-[#00f59b] cursor-pointer"
              >
                ↻
              </button>
            </div>
            <input
              id="dice-target-input"
              type="number"
              step="0.5"
              min="0.01"
              max="99.99"
              data-testid="dice-target-input"
              value={targetInputStr}
              onChange={(e) => {
                setTargetInputStr(e.target.value);
                const num = parseFloat(e.target.value);
                if (Number.isFinite(num) && num >= 0.01 && num <= 99.99) {
                  const synced = syncDiceFromTarget(num, diceMode);
                  setDiceMode(synced.mode);
                  setTargetValue(synced.target);
                  setWinChance(synced.winChance);
                  setMultiplier(synced.multiplier);
                  setMultiplierInputStr(synced.multiplier.toFixed(4));
                  setWinChanceInputStr(synced.winChance.toFixed(2));
                }
              }}
              onBlur={() => setTargetInputStr(targetValue.toFixed(2))}
              className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="rounded-xl bg-[#070510]/90 border border-purple-500/20 px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-purple-300/60 block">Win Chance %</span>
            <input
              id="dice-winchance-input"
              type="number"
              step="1"
              min={DICE_MIN_WIN_CHANCE}
              max={DICE_MAX_WIN_CHANCE}
              data-testid="dice-winchance-input"
              value={winChanceInputStr}
              onChange={(e) => {
                setWinChanceInputStr(e.target.value);
                const num = parseFloat(e.target.value);
                if (
                  Number.isFinite(num) &&
                  num >= DICE_MIN_WIN_CHANCE &&
                  num <= DICE_MAX_WIN_CHANCE
                ) {
                  const synced = syncDiceFromWinChance(num, diceMode);
                  setDiceMode(synced.mode);
                  setTargetValue(synced.target);
                  setWinChance(synced.winChance);
                  setMultiplier(synced.multiplier);
                  setMultiplierInputStr(synced.multiplier.toFixed(4));
                  setTargetInputStr(synced.target.toFixed(2));
                }
              }}
              onBlur={() => setWinChanceInputStr(winChance.toFixed(2))}
              className="w-full bg-transparent text-xs font-mono font-bold text-[#00f59b] focus:outline-none tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DECK
          rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        {/* ROW 1: Bet Amount Input (h-11 rounded-xl bg-[#090612] px-3) with 1/2, 2x, MAX */}
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              data-testid="dice-sidebar-balance"
              className="text-sm shrink-0"
              title={formatActiveTmaAmount(balanceUsdt)}
            >
              {activeTmaCurrency === 'TON' ? '💎' : '⭐'}
            </span>
            <input
              id="dice-bet-input"
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              data-testid="dice-bet-input"
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

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="dice-bet-half"
              onClick={handleHalfBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              data-testid="dice-bet-double"
              onClick={handleDoubleBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              data-testid="dice-bet-max"
              onClick={handleMaxBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-[#fbbf24] transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Roll Mode & Quick Win-Chance Presets in uniform h-10 rounded-xl selector */}
        <div className="h-10 rounded-xl bg-[#090612] px-2.5 border border-purple-500/20 flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="dice-target-flip-icon-btn"
            onClick={handleFlipRollMode}
            className="h-7 px-2.5 rounded-lg bg-purple-600/35 border border-purple-400/40 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>↻ {diceMode === 'OVER' ? 'Over' : 'Under'} {targetValue.toFixed(0)}</span>
          </button>

          <div className="flex items-center gap-1">
            {[25, 50, 75].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleWinChanceChange(pct)}
                className={`h-7 px-2 rounded-lg font-mono text-[11px] font-semibold cursor-pointer tabular-nums ${
                  Math.abs(winChance - pct) < 1
                    ? 'bg-purple-600/40 text-[#00f59b] border border-purple-400/40'
                    : 'bg-purple-950/60 text-purple-300/70 hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <span
            data-testid="dice-profit-on-win"
            className="text-[11px] font-mono font-semibold text-[#00f59b] tabular-nums truncate"
          >
            +{formatCurrency(profitOnWinCurrency)}
          </span>
        </div>

        {/* ROW 3: Full-Width Tactile Primary CTA Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="dice-roll-bet-btn"
            onClick={handlePrimaryBetAction}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{rollingNow ? 'Rolling 52-Bit...' : `Roll Dice (${multiplier.toFixed(2)}x)`}</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
              {formatCurrency(betAmount)}
            </span>
          </button>

          <button
            type="button"
            data-testid="dice-test-lucky7777-btn"
            onClick={handleSimulateLucky7777Roll}
            title="Test Lucky 77.77 Free Ticket"
            className="h-12 px-3 rounded-xl bg-[#090612] hover:bg-purple-950/80 border border-purple-500/25 text-xs font-mono font-bold text-[#fbbf24] shrink-0 cursor-pointer"
          >
            🎰77
          </button>
        </div>
      </div>
    </div>
  );
};
