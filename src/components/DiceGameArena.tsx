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
    provablyFairSeeds,
    playInstantMiniGame,
    pamBonus,
    setWalletDrawerOpen,
    navigateTo,
  } = useLottery();

  // Sidebar Mode: Manual vs Auto (with Martingale strategy)
  const [controlTab, setControlTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [betAmount, setBetAmount] = useState<number>(10);
  const [baseAutoBetAmount, setBaseAutoBetAmount] = useState<number>(10);

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
      const currentBet = Number((overrideBetAmount ?? betAmountRef.current).toFixed(2));
      setErrorBanner(null);
      setRollingNow(true);
      diceSoundEngine.playRollSlide();

      const res = await playInstantMiniGame({
        gameId: 'DICE_52',
        betAmountUsdt: currentBet,
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
    setBetAmount((prev) => Math.max(0.5, Number((prev / 2).toFixed(2))));
  };

  const handleDoubleBet = () => {
    setBetAmount((prev) => Math.min(Math.max(0.5, balanceUsdt), Number((prev * 2).toFixed(2))));
  };

  const handleMaxBet = () => {
    setBetAmount(Math.max(0.5, Math.min(1000, Number(balanceUsdt.toFixed(2)))));
  };

  const handleToggleMute = () => {
    const nextMuted = diceSoundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const rawProfitOnWin = Number((betAmount * (multiplier - 1)).toFixed(2));
  const profitOnWin = Math.min(DICE_TREASURY_MAX_PAYOUT_USDT, Math.max(0, rawProfitOnWin));
  const clampedTargetPct = Math.max(2, Math.min(98, targetValue));
  const markerLeftPct =
    lastRollResult !== null ? Math.max(1, Math.min(99, lastRollResult)) : clampedTargetPct;

  return (
    <div className="space-y-4">
      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs font-bold flex items-center justify-between">
          <span>⚠️ {errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-xs underline cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {lucky7777Banner && (
        <div
          data-testid="dice-lucky-7777-banner"
          className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎰</span>
            <div>
              <div className="text-sm font-black text-amber-300">
                جک‌پات ویژه LUCKY {lucky7777Banner.rollResult.toFixed(2)} فعال شد! (+۱ بلیت رایگان لاتاری LuckyDrop)
              </div>
              <div className="text-xs text-slate-200">
                رول ۵۲ بیتی روی عدد طلایی {lucky7777Banner.rollResult.toFixed(2)} فرود آمد و یک کوپن رسمی لاتاری به حساب شما اضافه شد.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('my-tickets')}
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              مشاهده بلیت‌های من ↗
            </button>
            <button
              type="button"
              onClick={() => setLucky7777Banner(null)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* STAKE-STYLE 3-ZONE 52-BIT DICE STUDIO:
          Left Control Sidebar (#1a2c38) + Right 3D Tactile Slider Arena (#0f212e) */}
      <div
        dir="ltr"
        data-testid="stake-dice-studio"
        className="rounded-3xl overflow-hidden border border-white/15 bg-[#0f212e] shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col-reverse lg:flex-row"
      >
        {/* ZONE 1: LEFT CONTROL SIDEBAR (#1a2c38) */}
        <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-[#1a2c38] border-t lg:border-t-0 lg:border-r border-white/10 p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            {/* Manual / Auto Mode Switcher */}
            <div className="grid grid-cols-2 bg-[#0f212e] p-1 rounded-full border border-white/10">
              <button
                type="button"
                data-testid="dice-tab-manual"
                onClick={() => {
                  setControlTab('MANUAL');
                  setAutoRunning(false);
                }}
                className={`py-2.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${
                  controlTab === 'MANUAL'
                    ? 'bg-[#2f4553] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                data-testid="dice-tab-auto"
                onClick={() => setControlTab('AUTO')}
                className={`py-2.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${
                  controlTab === 'AUTO'
                    ? 'bg-[#2f4553] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto (Martingale)
              </button>
            </div>

            {/* Bet Amount Input (#213743) with 1/2, 2x, Max */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <label htmlFor="dice-bet-input">Bet Amount (USDT)</label>
                <span className="font-mono text-emerald-400" data-testid="dice-sidebar-balance">
                  Bal: ${balanceUsdt.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center bg-[#213743] border-2 border-[#2f4553] focus-within:border-[#557086] rounded-xl overflow-hidden p-1">
                <div className="pl-2.5 pr-1 flex items-center">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    $
                  </span>
                </div>
                <input
                  id="dice-bet-input"
                  type="number"
                  min={0.5}
                  max={1000}
                  step={0.5}
                  data-testid="dice-bet-input"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0.5, Number(e.target.value) || 0.5))}
                  className="w-full bg-transparent px-2 py-2 text-sm font-mono font-black text-white focus:outline-none tabular-nums"
                />
                <div className="flex items-center gap-1 pr-1 shrink-0">
                  <button
                    type="button"
                    data-testid="dice-bet-half"
                    onClick={handleHalfBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    data-testid="dice-bet-double"
                    onClick={handleDoubleBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    data-testid="dice-bet-max"
                    onClick={handleMaxBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            {/* Profit on Win Readout (#213743) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Profit on Win</span>
                <span className="font-mono text-[11px] text-slate-400">
                  99% RTP (1% Edge)
                </span>
              </div>
              <div className="flex items-center justify-between bg-[#213743] border-2 border-[#2f4553] rounded-xl px-3.5 py-2.5">
                <span
                  data-testid="dice-profit-on-win"
                  className="font-mono text-sm font-black text-[#00e701] tabular-nums"
                >
                  +${profitOnWin.toFixed(2)} USDT
                </span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  Payout: ${(betAmount + profitOnWin).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Auto-Bet & Martingale Controls */}
            {controlTab === 'AUTO' && (
              <div className="space-y-3 bg-[#0f212e]/90 border border-white/10 rounded-2xl p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <label htmlFor="dice-auto-bets-input">Number of Bets (0 = ∞)</label>
                    {autoRunning && autoTotalBets > 0 && (
                      <span className="text-emerald-400 font-mono">
                        Rem: {autoRemainingBets}
                      </span>
                    )}
                  </div>
                  <input
                    id="dice-auto-bets-input"
                    type="number"
                    min={0}
                    max={1000}
                    value={autoTotalBets}
                    onChange={(e) => setAutoTotalBets(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-[#213743] border border-[#2f4553] rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white"
                  />
                </div>

                {/* On Win Strategy */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-300 block">On Win</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOnWinAction('RESET')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        onWinAction === 'RESET'
                          ? 'bg-[#2f4553] text-white'
                          : 'bg-[#213743] text-slate-400'
                      }`}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnWinAction('INCREASE')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        onWinAction === 'INCREASE'
                          ? 'bg-[#2f4553] text-white'
                          : 'bg-[#213743] text-slate-400'
                      }`}
                    >
                      Increase by %
                    </button>
                    <input
                      type="number"
                      disabled={onWinAction === 'RESET'}
                      value={onWinIncreasePct}
                      onChange={(e) => setOnWinIncreasePct(Number(e.target.value) || 0)}
                      className="w-full bg-[#213743] border border-[#2f4553] rounded-lg px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                    />
                  </div>
                </div>

                {/* On Loss Strategy (Martingale) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span>On Loss</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOnLossAction('INCREASE');
                        setOnLossIncreasePct(100);
                      }}
                      className="text-[10px] font-mono text-amber-300 hover:underline cursor-pointer"
                    >
                      Preset: 2x Martingale (+100%)
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOnLossAction('RESET')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        onLossAction === 'RESET'
                          ? 'bg-[#2f4553] text-white'
                          : 'bg-[#213743] text-slate-400'
                      }`}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnLossAction('INCREASE')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        onLossAction === 'INCREASE'
                          ? 'bg-[#2f4553] text-white'
                          : 'bg-[#213743] text-slate-400'
                      }`}
                    >
                      Increase by %
                    </button>
                    <input
                      type="number"
                      disabled={onLossAction === 'RESET'}
                      value={onLossIncreasePct}
                      onChange={(e) => setOnLossIncreasePct(Number(e.target.value) || 0)}
                      className="w-full bg-[#213743] border border-[#2f4553] rounded-lg px-2 py-1 text-xs font-mono text-white disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Massive Tactile Action Button (#00e701) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                data-testid="dice-roll-bet-btn"
                onClick={handlePrimaryBetAction}
                className={`w-full py-4 rounded-xl font-black text-base tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  autoRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_5px_0_#9f1239]'
                    : 'bg-[#00e701] hover:bg-[#1fff20] text-[#051c08] shadow-[0_5px_0_#009901,0_10px_25px_rgba(0,231,1,0.35)] active:translate-y-[3px] active:shadow-[0_2px_0_#009901]'
                }`}
              >
                <span>
                  {controlTab === 'AUTO'
                    ? autoRunning
                      ? 'Stop Autobet'
                      : 'Start Autobet'
                    : rollingNow
                    ? 'Rolling 52-Bit...'
                    : 'Bet'}
                </span>
              </button>

              {/* Lucky 77.77 Lottery Jackpot Synergy Quick Test Button */}
              <button
                type="button"
                data-testid="dice-test-lucky7777-btn"
                onClick={handleSimulateLucky7777Roll}
                className="w-full py-2 rounded-xl bg-[#213743] hover:bg-[#2f4553] border border-amber-400/40 text-amber-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎰 Lucky 77.77 Jackpot Synergy (+1 Free Lottery Ticket)</span>
              </button>
            </div>
          </div>

          {/* Footer: Treasury Cap & Provably Fair Info */}
          <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs">
            <div className="bg-[#0f212e] rounded-xl p-3 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">🛡️ Treasury Max Payout:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${DICE_TREASURY_MAX_PAYOUT_USDT.toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">🔒 52-Bit Nonce:</span>
                <span className="font-mono font-bold text-amber-300">
                  #{provablyFairSeeds.nonce}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                Commit: {provablyFairSeeds.serverSeedHash.slice(0, 24)}...
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setWalletDrawerOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#213743] hover:bg-[#2f4553] text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
              >
                PAM Ledger ↗
              </button>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="flex-1 py-2 px-3 rounded-xl bg-[#213743] hover:bg-[#2f4553] text-[11px] font-bold text-amber-300 transition-colors cursor-pointer"
              >
                Fairness Verifier ↗
              </button>
            </div>
          </div>
        </aside>

        {/* ZONE 2: RIGHT 3D TACTILE SLIDER ARENA (#0f212e) */}
        <div className="flex-1 flex flex-col justify-between bg-[#0f212e] min-h-[540px] lg:min-h-[600px] relative overflow-hidden">
          {/* 60FPS Background Canvas for Shockwaves & 30+ Emerald/Gold Particle Bursts */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
          />

          {/* Top Bar: Last 12 Roll Outcomes Ribbon + Audio Mute Toggle */}
          <div className="relative z-10 bg-[#0b1924]/90 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
            <div
              data-testid="dice-history-ribbon"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
            >
              {rollHistory.slice(0, 12).map((item, idx) => {
                const badgeStyle = item.lucky7777
                  ? 'bg-[#fbbf24] text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : item.won
                  ? 'bg-[#00e701] text-[#041e06] border-emerald-300 shadow-[0_0_12px_rgba(0,231,1,0.35)]'
                  : 'bg-[#2f4553] text-slate-200 border-white/10';
                return (
                  <div
                    key={item.id}
                    data-testid={`dice-history-pill-${idx}`}
                    className={`px-3.5 py-1.5 rounded-full border font-mono text-xs font-black tracking-tight shrink-0 transition-all duration-300 tabular-nums ${badgeStyle} ${
                      idx === 0 ? 'scale-105 ring-2 ring-white/30' : 'opacity-90'
                    }`}
                  >
                    {item.lucky7777 ? `🎰 ${item.rollResult.toFixed(2)}` : item.rollResult.toFixed(2)}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="dice-audio-mute-btn"
              onClick={handleToggleMute}
              className="px-3 py-1.5 rounded-xl bg-[#1a2c38] hover:bg-[#243b4a] border border-white/15 text-xs font-bold text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-amber-300">
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Synth Audio'}</span>
            </button>
          </div>

          {/* CENTERPIECE: FLOATING 3D HEXAGON MARKER + 3D BEVELED SLIDER TRACK */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-10 select-none">
            <div className="w-full max-w-4xl space-y-6">
              {/* Scale Tick Marks Above Track (0, 25, 50, 75, 100) */}
              <div className="relative w-full px-3 flex items-center justify-between text-xs font-mono font-black text-slate-400 tabular-nums">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="flex flex-col items-center gap-1">
                    <span>{tick}</span>
                    <span className="w-0.5 h-2 rounded-full bg-slate-600" />
                  </div>
                ))}
              </div>

              {/* Track & Floating 3D Hexagon Marker Wrapper */}
              <div className="relative pt-16 pb-4">
                {/* FLOATING 3D HEXAGON / ISOMETRIC CUBE MARKER */}
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
                        markerBounceActive ? 'scale-[1.18]' : 'scale-100'
                      }`}
                    >
                      {/* 3D Isometric Hexagon Prism SVG + Tabular Rolled Number */}
                      <div className="relative w-24 h-16 flex items-center justify-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.75)]">
                        <svg
                          viewBox="0 0 120 84"
                          className="absolute inset-0 w-full h-full"
                        >
                          <defs>
                            <linearGradient id="hex3dBody" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="65%" stopColor="#e2e8f0" />
                              <stop offset="100%" stopColor="#94a3b8" />
                            </linearGradient>
                            <linearGradient id="hex3dBevel" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#cbd5e1" />
                              <stop offset="100%" stopColor="#64748b" />
                            </linearGradient>
                          </defs>
                          {/* 3D Bottom Extrusion Bevel */}
                          <polygon
                            points="22,12 98,12 114,44 98,74 60,82 22,74 6,44"
                            fill="url(#hex3dBevel)"
                          />
                          {/* 3D Top Face */}
                          <polygon
                            points="24,6 96,6 112,38 96,66 60,74 24,66 8,38"
                            fill="url(#hex3dBody)"
                            stroke={lastRollWon ? '#00e701' : '#e9113c'}
                            strokeWidth="3.5"
                          />
                        </svg>
                        <span
                          data-testid="dice-marker-roll-value"
                          className={`relative z-10 font-mono text-lg font-black tracking-tight tabular-nums ${
                            lastRollWon ? 'text-[#00aa01]' : 'text-[#e9113c]'
                          }`}
                        >
                          {lastRollResult.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3D BEVELED SLIDER TRACK (height: 56px, dark outer bevel #0a161f, inner shadow) */}
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
                  className="relative w-full h-[56px] rounded-full bg-[#0a161f] p-2.5 shadow-[inset_0_5px_12px_rgba(0,0,0,0.9),0_4px_0_rgba(255,255,255,0.06)] border-2 border-[#1e3444] cursor-pointer flex items-center"
                >
                  {/* Inner Two-Tone Neon Bar */}
                  <div className="relative w-full h-full rounded-full overflow-hidden flex">
                    {/* Left Segment (0% to target%) */}
                    <div
                      style={{ width: `${clampedTargetPct}%` }}
                      className={`h-full transition-colors duration-150 ${
                        diceMode === 'UNDER'
                          ? 'bg-[#00e701] shadow-[0_0_22px_rgba(0,231,1,0.7),inset_0_3px_6px_rgba(255,255,255,0.45)]'
                          : 'bg-[#e9113c] shadow-[0_0_18px_rgba(233,17,60,0.55),inset_0_3px_6px_rgba(255,255,255,0.3)]'
                      }`}
                    />
                    {/* Right Segment (target% to 100%) */}
                    <div
                      style={{ width: `${100 - clampedTargetPct}%` }}
                      className={`h-full transition-colors duration-150 ${
                        diceMode === 'OVER'
                          ? 'bg-[#00e701] shadow-[0_0_22px_rgba(0,231,1,0.7),inset_0_3px_6px_rgba(255,255,255,0.45)]'
                          : 'bg-[#e9113c] shadow-[0_0_18px_rgba(233,17,60,0.55),inset_0_3px_6px_rgba(255,255,255,0.3)]'
                      }`}
                    />
                  </div>

                  {/* 3D TACTILE DRAG HANDLE (#3b82f6 with grip ridges & drop shadow) */}
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
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-12 rounded-xl bg-gradient-to-b from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] border-2 border-sky-200 shadow-[0_6px_0_#1e3a8a,0_10px_22px_rgba(0,0,0,0.8)] flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing z-30 hover:brightness-110 transition-transform"
                  >
                    <span className="w-0.5 h-5 rounded-full bg-white/75" />
                    <span className="w-0.5 h-5 rounded-full bg-white/75" />
                    <span className="w-0.5 h-5 rounded-full bg-white/75" />
                  </div>
                </div>
              </div>

              {/* Sub-bar helper summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00e701]" />
                  <span>
                    Winning Zone:{' '}
                    <strong className="text-white font-mono">
                      {diceMode === 'OVER'
                        ? `${targetValue.toFixed(2)} – 100.00`
                        : `0.00 – ${targetValue.toFixed(2)}`}
                    </strong>
                  </span>
                </div>
                <div className="font-mono text-[11px] text-amber-300">
                  Formula: floor(X × 10001) / 100 • 77.77 = Free Lottery Ticket
                </div>
              </div>
            </div>
          </div>

          {/* ZONE 3: BOTTOM SYNCED STATS BAR (STAKE SIGNATURE PANEL #213743) */}
          <div className="relative z-10 p-4 sm:p-6 pt-0">
            <div
              data-testid="dice-bottom-synced-bar"
              className="bg-[#213743] border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-inner"
            >
              {/* 1) Multiplier Input Box */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dice-multiplier-input"
                  className="text-xs font-bold text-slate-300 flex items-center justify-between"
                >
                  <span>Multiplier</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {DICE_RTP_PERCENT} / WinChance
                  </span>
                </label>
                <div className="flex items-center bg-[#0f212e] border-2 border-[#2f4553] focus-within:border-[#557086] rounded-xl px-3 py-2">
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
                    className="w-full bg-transparent text-sm font-mono font-black text-white focus:outline-none tabular-nums"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label="Decrease Multiplier"
                      onClick={() => handleMultiplierChange(Math.max(1.0102, multiplier - 0.5))}
                      className="px-2 py-0.5 rounded bg-[#213743] hover:bg-[#2f4553] text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label="Increase Multiplier"
                      onClick={() => handleMultiplierChange(Math.min(9900, multiplier + 0.5))}
                      className="px-2 py-0.5 rounded bg-[#213743] hover:bg-[#2f4553] text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-slate-400 font-mono font-black text-sm pl-1">×</span>
                  </div>
                </div>
              </div>

              {/* 2) Roll Over / Roll Under Flip Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <label htmlFor="dice-target-input">
                    {diceMode === 'OVER' ? 'Roll Over' : 'Roll Under'}
                  </label>
                  <button
                    type="button"
                    data-testid="dice-flip-mode-btn"
                    onClick={handleFlipRollMode}
                    className="text-[11px] font-bold text-[#00e701] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>↻ Swap Mode</span>
                  </button>
                </div>
                <div className="flex items-center bg-[#0f212e] border-2 border-[#2f4553] focus-within:border-[#557086] rounded-xl px-3 py-2">
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
                    className="w-full bg-transparent text-sm font-mono font-black text-white focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    aria-label="Flip Roll Over or Roll Under"
                    data-testid="dice-target-flip-icon-btn"
                    onClick={handleFlipRollMode}
                    className="px-2.5 py-1 rounded-lg bg-[#00e701]/20 hover:bg-[#00e701]/35 border border-[#00e701]/50 text-[#00e701] font-black text-xs transition-all cursor-pointer shrink-0"
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* 3) Win Chance (%) Input Box */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dice-winchance-input"
                  className="text-xs font-bold text-slate-300 flex items-center justify-between"
                >
                  <span>Win Chance</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {DICE_MIN_WIN_CHANCE}% – {DICE_MAX_WIN_CHANCE}%
                  </span>
                </label>
                <div className="flex items-center bg-[#0f212e] border-2 border-[#2f4553] focus-within:border-[#557086] rounded-xl px-3 py-2">
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
                    className="w-full bg-transparent text-sm font-mono font-black text-white focus:outline-none tabular-nums"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleWinChanceChange(25)}
                      className="px-1.5 py-0.5 rounded bg-[#213743] hover:bg-[#2f4553] text-[10px] font-mono font-bold text-slate-300 cursor-pointer"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWinChanceChange(50)}
                      className="px-1.5 py-0.5 rounded bg-[#213743] hover:bg-[#2f4553] text-[10px] font-mono font-bold text-slate-300 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWinChanceChange(75)}
                      className="px-1.5 py-0.5 rounded bg-[#213743] hover:bg-[#2f4553] text-[10px] font-mono font-bold text-slate-300 cursor-pointer"
                    >
                      75%
                    </button>
                    <span className="text-slate-400 font-mono font-black text-sm pl-1">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
