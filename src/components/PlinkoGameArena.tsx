import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  PlinkoRiskLevel,
  PlinkoRowCount,
  PLINKO_MULTIPLIER_TABLES,
  isPlinkoBonusTicketSlot,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import { plinkoSoundEngine } from '../utils/plinkoSoundEngine.ts';
import { tmaCurrencyToUsdt } from '../utils/telegramTma.ts';

interface TrailPoint {
  x: number;
  y: number;
}

interface ActivePlinkoBall {
  id: string;
  rows: PlinkoRowCount;
  risk: PlinkoRiskLevel;
  directions: Array<0 | 1>;
  targetBucketIndex: number;
  multiplier: number;
  betAmountUsdt: number;
  payoutUsdt: number;
  bonusTicket: boolean;
  roundId: string;
  debitUuid: string;
  evaluation: MiniGameEvaluationResult;
  // Physics state along the pyramid segments:
  // segmentIndex = -1 is nozzle -> row 0 peg;
  // segmentIndex = 0 .. rows - 2 is row r -> row r+1;
  // segmentIndex = rows - 1 is last peg row -> bucket landing
  segmentIndex: number;
  segmentProgress: number; // 0..1 within current segment
  currentCol: number; // peg index in current row (starts at 1 in row 0 which has 3 pegs: 0, 1, 2)
  x: number;
  y: number;
  jitterPhase: number;
  hueVariant: 'GOLD' | 'MAGENTA';
  trail: TrailPoint[];
}

interface PegRipple {
  x: number;
  y: number;
  baseRadius: number;
  progress: number; // 0 -> 1
  color: string;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  tiltAngle: number;
  vTilt: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingWinPopup {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  subText?: string;
  color: string;
  alpha: number;
  scale: number;
}

interface AmbientDust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

interface LandedHistoryBadge {
  id: string;
  multiplier: number;
  payoutUsdt: number;
  bonusTicket: boolean;
  roundId: string;
  bucketCategory: 'LOW' | 'MID' | 'HIGH';
  timestamp: number;
}

function getBucketCategory(multiplier: number): 'LOW' | 'MID' | 'HIGH' {
  if (multiplier < 1) return 'LOW';
  if (multiplier < 10) return 'MID';
  return 'HIGH';
}

function getBucketColors(multiplier: number): {
  topStop: string;
  bottomStop: string;
  lipColor: string;
  textColor: string;
  glowColor: string;
} {
  if (multiplier < 1) {
    // Center slots (< 1x): Warm Amber/Yellow (#f59e0b to #fbbf24)
    return {
      topStop: '#fbbf24',
      bottomStop: '#f59e0b',
      lipColor: '#b45309',
      textColor: '#0f172a',
      glowColor: 'rgba(251, 191, 36, 0.35)',
    };
  }
  if (multiplier < 10) {
    // Mid slots (1x - 9x): Vibrant Orange (#f97316 to #ea580c)
    return {
      topStop: '#f97316',
      bottomStop: '#ea580c',
      lipColor: '#9a3412',
      textColor: '#ffffff',
      glowColor: 'rgba(249, 115, 22, 0.45)',
    };
  }
  // Outer High-Multiplier slots (10x - 1000x): Electric Crimson/Rose Neon (#ef4444 to #e11d48)
  return {
    topStop: '#ef4444',
    bottomStop: '#e11d48',
    lipColor: '#881337',
    textColor: '#ffffff',
    glowColor: 'rgba(225, 29, 72, 0.85)',
  };
}

function drawRoundedBeveledRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export const PlinkoGameArena: React.FC<{
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}> = ({ onRoundSettled }) => {
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
    setDepositModalOpen,
    setWalletDrawerOpen,
    navigateTo,
  } = useLottery();

  // Stake Left Control Sidebar State (betAmount is in activeTmaCurrency: TON or STARS)
  const [controlTab, setControlTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [betAmount, setBetAmount] = useState<number>(() =>
    activeTmaCurrency === 'TON' ? 1 : 50
  );
  const [risk, setRisk] = useState<PlinkoRiskLevel>('MEDIUM');
  const [rows, setRows] = useState<PlinkoRowCount>(16);
  const [autoBetCount, setAutoBetCount] = useState<number>(10); // 0 = infinite
  const [autoRunning, setAutoRunning] = useState<boolean>(false);

  useEffect(() => {
    setBetAmount((prev) => {
      if (activeTmaCurrency === 'TON' && prev >= 50) return 1;
      if (activeTmaCurrency === 'STARS' && prev < 10) return 50;
      return prev;
    });
  }, [activeTmaCurrency]);
  const [isMuted, setIsMuted] = useState<boolean>(() => plinkoSoundEngine.isMuted());
  const [activeBallsCount, setActiveBallsCount] = useState<number>(0);
  const [landedHistory, setLandedHistory] = useState<LandedHistoryBadge[]>([]);
  const [bonusBanner, setBonusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Refs for 60fps Canvas Loop (zero React state re-render overhead inside rAF)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rowsRef = useRef<PlinkoRowCount>(rows);
  const riskRef = useRef<PlinkoRiskLevel>(risk);
  const ballsRef = useRef<ActivePlinkoBall[]>([]);
  const ripplesRef = useRef<PegRipple[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const popupsRef = useRef<FloatingWinPopup[]>([]);
  const dustRef = useRef<AmbientDust[]>([]);
  // Peg elastic scale map: key = `${row}-${col}`, value = { scale, velocity }
  const pegScalesRef = useRef<Map<string, { scale: number; vScale: number }>>(new Map());
  // Bucket depression map: key = `${bucketIndex}`, value = { offsetY, vOffset, flashAlpha }
  const bucketAnimRef = useRef<
    Map<number, { offsetY: number; vOffset: number; flashAlpha: number }>
  >(new Map());
  // Smooth morph animation when switching rows/risk
  const morphAlphaRef = useRef<number>(1);
  const onRoundSettledRef = useRef(onRoundSettled);
  const formatActiveTmaAmountRef = useRef(formatActiveTmaAmount);

  useEffect(() => {
    onRoundSettledRef.current = onRoundSettled;
    formatActiveTmaAmountRef.current = formatActiveTmaAmount;
  }, [onRoundSettled, formatActiveTmaAmount]);

  useEffect(() => {
    rowsRef.current = rows;
    riskRef.current = risk;
    morphAlphaRef.current = 0.25; // Triggers smooth fade/scale morph transition on pyramid change
  }, [rows, risk]);

  // Initialize ambient floating studio dust particles once
  useEffect(() => {
    const dust: AmbientDust[] = [];
    for (let i = 0; i < 36; i++) {
      dust.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.018,
        vy: -0.008 - Math.random() * 0.015,
        radius: 1.0 + Math.random() * 1.8,
        alpha: 0.12 + Math.random() * 0.28,
      });
    }
    dustRef.current = dust;
  }, []);

  // Spawn 35+ 3D-styled spark & confetti particles on bucket win >= 2x or bonus ticket
  const spawnWinConfetti = useCallback((x: number, y: number, isHighWin: boolean) => {
    const count = isHighWin ? 52 : 38;
    const palette = [
      '#fbbf24',
      '#00e701',
      '#f43f5e',
      '#38bdf8',
      '#a855f7',
      '#ffffff',
      '#f97316',
    ];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
      const speed = 130 + Math.random() * (isHighWin ? 290 : 210);
      confettiRef.current.push({
        x,
        y: y - 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 4 + Math.random() * 4.5,
        color: palette[i % palette.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 11,
        tiltAngle: Math.random() * Math.PI * 2,
        vTilt: 6 + Math.random() * 10,
        alpha: 1,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.55,
      });
    }
  }, []);

  // Drop a single Provably Fair ball connected to the PAM Seamless Wallet
  const handleDropSingleBall = useCallback(async () => {
    setErrorBanner(null);
    const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
    const cleanBetCurrency =
      activeTmaCurrency === 'TON'
        ? Math.max(minBet, Number(betAmount.toFixed(2)) || 0.01)
        : Math.max(minBet, Math.round(betAmount) || 1);
    const wagerUsdt = tmaCurrencyToUsdt(
      cleanBetCurrency,
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate
    );
    const availInCurrency = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;

    if (availInCurrency < cleanBetCurrency || balanceUsdt < wagerUsdt) {
      setDepositModalOpen(true);
      setErrorBanner('موجودی کیف پول کافی نیست. لطفاً ابتدا کیف پول را شارژ کنید.');
      setAutoRunning(false);
      return false;
    }

    // Immediate pneumatic drop audio
    plinkoSoundEngine.playDrop();

    const currentRows = rowsRef.current;
    const currentRisk = riskRef.current;

    const res = await playInstantMiniGame({
      gameId: 'PLINKO',
      betAmountUsdt: wagerUsdt,
      plinkoRows: currentRows,
      plinkoRisk: currentRisk,
    });

    if (!res.ok || !res.evaluation) {
      setErrorBanner(res.error || 'خطا در ثبت شرط Plinko');
      setAutoRunning(false);
      return false;
    }

    const ev = res.evaluation;
    const directions =
      ev.plinkoDirections && ev.plinkoDirections.length === currentRows
        ? ev.plinkoDirections
        : Array.from({ length: currentRows }, () => (Math.random() >= 0.5 ? 1 : 0));
    const targetBucket =
      typeof ev.plinkoBucketIndex === 'number'
        ? ev.plinkoBucketIndex
        : directions.reduce<number>((acc, d) => acc + d, 0);

    const newBall: ActivePlinkoBall = {
      id: `${ev.roundId}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      rows: currentRows,
      risk: currentRisk,
      directions,
      targetBucketIndex: targetBucket,
      multiplier: ev.multiplier,
      betAmountUsdt: wagerUsdt,
      payoutUsdt: ev.payoutUsdt,
      bonusTicket: Boolean(ev.plinkoBonusTicket),
      roundId: ev.roundId,
      debitUuid: res.debitTransactionUuid || '',
      evaluation: ev,
      segmentIndex: -1,
      segmentProgress: 0,
      currentCol: 1, // Middle peg of row 0 (which has 3 pegs: col 0, 1, 2)
      x: 0,
      y: 0,
      jitterPhase: (ev.nonce * 1.73 + Math.random()) * Math.PI,
      hueVariant: ev.nonce % 2 === 0 ? 'GOLD' : 'MAGENTA',
      trail: [],
    };

    ballsRef.current.push(newBall);
    setActiveBallsCount(ballsRef.current.length);
    return true;
  }, [
    betAmount,
    activeTmaCurrency,
    tonUsdRate,
    starsUsdRate,
    tonBalance,
    starsBalance,
    balanceUsdt,
    playInstantMiniGame,
    setDepositModalOpen,
  ]);

  // Rapid multi-ball burst helper (drops 5 balls spaced by 110ms)
  const handleDropBurst5 = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      window.setTimeout(() => {
        handleDropSingleBall();
      }, i * 110);
    }
  }, [handleDropSingleBall]);

  // Auto-Bet Interval Loop
  useEffect(() => {
    if (!autoRunning) return;
    let remaining = autoBetCount;
    const timer = window.setInterval(async () => {
      if (autoBetCount > 0 && remaining <= 0) {
        setAutoRunning(false);
        return;
      }
      const ok = await handleDropSingleBall();
      if (!ok) {
        setAutoRunning(false);
        return;
      }
      if (autoBetCount > 0) {
        remaining -= 1;
        setAutoBetCount(remaining);
        if (remaining <= 0) {
          setAutoRunning(false);
        }
      }
    }, 240);

    return () => window.clearInterval(timer);
  }, [autoRunning, autoBetCount, handleDropSingleBall]);

  // Main 60FPS HTML5 Canvas 2.5D/3D Studio Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let lastTime = performance.now();

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.max(320, Math.floor(rect.width * dpr));
      const targetH = Math.max(360, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateCanvasSize();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCanvasSize) : null;
    resizeObserver?.observe(canvas);

    const renderFrame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      updateCanvasSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. STAKE STUDIO ARENA BACKGROUND & RADIAL SPOTLIGHT (#1e3748 -> #0f212e)
      ctx.fillStyle = '#0f212e';
      ctx.fillRect(0, 0, W, H);

      const spotGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.44,
        18,
        W * 0.5,
        H * 0.46,
        Math.max(W, H) * 0.65
      );
      spotGrad.addColorStop(0, '#1e3748');
      spotGrad.addColorStop(0.58, '#132836');
      spotGrad.addColorStop(1, '#0f212e');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, W, H);

      // Perfectly centered top chute
      const topNozzleY = 36;

      // 2. FLOATING AMBIENT DUST PARTICLES
      for (const p of dustRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0.02) {
          p.y = 0.96;
          p.x = Math.random();
        }
        if (p.x < 0.02) p.x = 0.98;
        if (p.x > 0.98) p.x = 0.02;

        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
        ctx.fill();
      }

      // 3. PYRAMID GEOMETRY CALCULATION (8, 12, or 16 rows) — 100% HORIZONTALLY CENTERED & NON-OVERLAPPING
      const activeRows = rowsRef.current;
      const activeRisk = riskRef.current;
      const multipliers = PLINKO_MULTIPLIER_TABLES[activeRows][activeRisk];

      if (morphAlphaRef.current < 1) {
        morphAlphaRef.current = Math.min(1, morphAlphaRef.current + dt * 4.5);
      }

      const sidePadding = activeRows === 16 ? 8 : 16;
      const usableW = Math.max(280, W - sidePadding);
      const centerX = W / 2;

      const pyramidTopY = 54;
      const bucketRowHeight = W > 620 ? 36 : activeRows === 16 ? 28 : 31;
      const bucketBottomMargin = 16;
      const bucketTopY = H - bucketRowHeight - bucketBottomMargin;
      const pyramidBottomY = bucketTopY - 24;
      const pyramidHeight = Math.max(170, pyramidBottomY - pyramidTopY);

      const rowSpacingY = pyramidHeight / Math.max(1, activeRows - 1);
      // Total buckets is activeRows + 1; bottom row has activeRows + 2 pegs (activeRows + 1 intervals)
      const pegSpacingX = Math.min(
        rowSpacingY * 1.24,
        usableW / (activeRows + 1.15)
      );
      const pegRadius = activeRows === 8 ? 5.8 : activeRows === 12 ? 4.6 : 3.6;

      const getPegCoords = (r: number, c: number, totalR: number = activeRows) => {
        const pegsInRow = r + 3;
        const rowWidth = (pegsInRow - 1) * pegSpacingX;
        const startX = centerX - rowWidth / 2;
        return {
          x: startX + c * pegSpacingX,
          y: pyramidTopY + r * rowSpacingY,
        };
      };

      const getBucketCenterCoords = (bIdx: number) => {
        // Bucket bIdx sits directly below the gap between peg bIdx and peg bIdx+1 of the last row (activeRows - 1)
        const totalBuckets = activeRows + 1;
        const totalBucketsWidth = (totalBuckets - 1) * pegSpacingX;
        const startX = centerX - totalBucketsWidth / 2;
        return {
          x: startX + bIdx * pegSpacingX,
          y: bucketTopY + bucketRowHeight / 2,
        };
      };

      // Render Top Metallic Ball Spawner Nozzle
      ctx.save();
      const nozzleW = 36;
      const nozzleH = 14;
      const nozzleGrad = ctx.createLinearGradient(
        centerX - nozzleW / 2,
        topNozzleY - 8,
        centerX + nozzleW / 2,
        topNozzleY + 8
      );
      nozzleGrad.addColorStop(0, '#334155');
      nozzleGrad.addColorStop(0.5, '#94a3b8');
      nozzleGrad.addColorStop(1, '#1e293b');
      drawRoundedBeveledRect(
        ctx,
        centerX - nozzleW / 2,
        topNozzleY - 8,
        nozzleW,
        nozzleH,
        5
      );
      ctx.fillStyle = nozzleGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 4. RENDER EXPANDING NEON SHOCKWAVE RIPPLES AROUND HIT PEGS
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rip = ripplesRef.current[i];
        rip.progress += dt * 2.9;
        if (rip.progress >= 1) {
          ripplesRef.current.splice(i, 1);
          continue;
        }
        const alpha = 0.8 * (1 - rip.progress);
        const radius = rip.baseRadius * (1 + rip.progress * 1.65); // Expands to >2.5x
        ctx.save();
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rip.color.replace('ALPHA', alpha.toFixed(3));
        ctx.lineWidth = 2.2 * (1 - rip.progress * 0.5);
        ctx.shadowColor = rip.color.replace('ALPHA', '0.9');
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }

      // 5. RENDER 3D-SHADED METALLIC/PEARL PEGS WITH ELASTIC SCALE BOUNCE
      ctx.save();
      ctx.globalAlpha = morphAlphaRef.current;
      for (let r = 0; r < activeRows; r++) {
        const pegsInRow = r + 3;
        for (let c = 0; c < pegsInRow; c++) {
          const { x, y } = getPegCoords(r, c, activeRows);
          const key = `${r}-${c}`;
          let anim = pegScalesRef.current.get(key);
          let currentScale = 1.0;

          if (anim) {
            // Spring physics back to 1.0
            const force = (1.0 - anim.scale) * 48;
            anim.vScale = (anim.vScale + force * dt) * Math.pow(0.08, dt);
            anim.scale += anim.vScale * dt;
            if (Math.abs(anim.scale - 1.0) < 0.005 && Math.abs(anim.vScale) < 0.01) {
              pegScalesRef.current.delete(key);
              currentScale = 1.0;
            } else {
              currentScale = Math.max(0.85, Math.min(1.65, anim.scale));
            }
          }

          const rad = pegRadius * currentScale;

          // a) Dark ambient shadow underneath peg
          ctx.beginPath();
          ctx.arc(x, y + 2.4, rad * 1.05, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
          ctx.fill();

          // b) 3D Polished Metallic/Pearl Cylinder Radial Gradient
          const pegGrad = ctx.createRadialGradient(
            x - rad * 0.36,
            y - rad * 0.36,
            rad * 0.08,
            x,
            y,
            rad
          );
          pegGrad.addColorStop(0, '#ffffff');
          pegGrad.addColorStop(0.35, '#e2e8f0');
          pegGrad.addColorStop(0.72, '#cbd5e1');
          pegGrad.addColorStop(1, '#64748b');

          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fillStyle = pegGrad;
          ctx.fill();

          // If peg is actively bouncing from impact, add a subtle luminous halo
          if (currentScale > 1.06) {
            ctx.beginPath();
            ctx.arc(x, y, rad * 1.25, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(0.85, (currentScale - 1) * 2.2)})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 6. RENDER 3D BEVELED MULTIPLIER BUCKETS AT BOTTOM ROW (STRICTLY NON-OVERLAPPING)
      const totalBuckets = activeRows + 1;
      const bucketGap = activeRows === 16 ? 1.6 : activeRows === 12 ? 2.4 : 3.5;
      // Never allow bucketW to exceed pegSpacingX - bucketGap so adjacent buckets NEVER collide
      const bucketW = Math.max(10, pegSpacingX - bucketGap);
      const bucketCornerRadius = activeRows === 16 ? 4 : 6;
      const pulseGlow = 0.55 + 0.45 * Math.sin(now * 0.005);

      for (let bIdx = 0; bIdx < totalBuckets; bIdx++) {
        const mult = multipliers[bIdx] ?? 1.0;
        const colors = getBucketColors(mult);
        const isBonusSlot = isPlinkoBonusTicketSlot(bIdx, activeRows);
        const { x: bxCenter } = getBucketCenterCoords(bIdx);

        // Spring compression state when a ball lands
        let bAnim = bucketAnimRef.current.get(bIdx);
        let depressY = 0;
        let flashAlpha = 0;
        if (bAnim) {
          const springF = (0 - bAnim.offsetY) * 55;
          bAnim.vOffset = (bAnim.vOffset + springF * dt) * Math.pow(0.06, dt);
          bAnim.offsetY += bAnim.vOffset * dt;
          bAnim.flashAlpha = Math.max(0, bAnim.flashAlpha - dt * 3.2);
          depressY = Math.max(-2, Math.min(8, bAnim.offsetY));
          flashAlpha = bAnim.flashAlpha;
          if (
            Math.abs(bAnim.offsetY) < 0.05 &&
            Math.abs(bAnim.vOffset) < 0.05 &&
            bAnim.flashAlpha <= 0.01
          ) {
            bucketAnimRef.current.delete(bIdx);
          }
        }

        const bx = bxCenter - bucketW / 2;
        const by = bucketTopY + depressY;
        const lipDepth = Math.max(2, 4.5 - depressY * 0.5);

        ctx.save();

        // Outer pulsing neon glow for high-multiplier slots (>= 10x) or Bonus Ticket slots
        if (mult >= 10 || isBonusSlot) {
          ctx.shadowColor = isBonusSlot
            ? `rgba(251, 191, 36, ${0.45 + 0.35 * pulseGlow})`
            : colors.glowColor;
          ctx.shadowBlur = activeRows === 16 ? 6 + 3 * pulseGlow : 10 + 5 * pulseGlow;
        }

        // a) 3D Physical Bottom Shadow Lip
        drawRoundedBeveledRect(
          ctx,
          bx,
          by + 2.5,
          bucketW,
          bucketRowHeight + lipDepth - 2,
          bucketCornerRadius
        );
        ctx.fillStyle = isBonusSlot ? '#92400e' : colors.lipColor;
        ctx.fill();

        // b) Main Beveled Face Gradient
        const faceGrad = ctx.createLinearGradient(bx, by, bx, by + bucketRowHeight);
        faceGrad.addColorStop(0, colors.topStop);
        faceGrad.addColorStop(1, colors.bottomStop);

        drawRoundedBeveledRect(ctx, bx, by, bucketW, bucketRowHeight, bucketCornerRadius);
        ctx.fillStyle = faceGrad;
        ctx.fill();

        // Top inner specular bevel highlight
        ctx.strokeStyle = isBonusSlot
          ? 'rgba(253, 224, 71, 0.85)'
          : 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = isBonusSlot ? 1.3 : 0.9;
        ctx.stroke();

        // Landing brightness flash overlay
        if (flashAlpha > 0.01) {
          drawRoundedBeveledRect(ctx, bx, by, bucketW, bucketRowHeight, bucketCornerRadius);
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.78})`;
          ctx.fill();
        }

        ctx.restore();

        // c) Compact "VIP TICKET" Crown Badge strictly bounded to bucketW so it never overlaps neighbors
        if (isBonusSlot) {
          ctx.save();
          const compactCrownOnly = bucketW < 28;
          const badgeW = compactCrownOnly ? Math.max(12, bucketW - 1) : Math.min(bucketW + 2, 36);
          const badgeH = compactCrownOnly ? 10 : 11;
          const badgeX = bxCenter - badgeW / 2;
          const badgeY = by - badgeH - 1.5;
          drawRoundedBeveledRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
          ctx.shadowBlur = 4;
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = compactCrownOnly
            ? '900 7px "Plus Jakarta Sans", sans-serif'
            : '900 6.5px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            compactCrownOnly ? '👑' : '👑 VIP',
            bxCenter,
            badgeY + badgeH / 2 + 0.5,
            badgeW - 1
          );
          ctx.restore();
        }

        // d) Crisp, Auto-Fitted Multiplier Label inside Bucket (zero overlap guaranteed)
        ctx.save();
        ctx.fillStyle = colors.textColor;
        const isNarrowBucket = bucketW < 23;
        let labelText: string;
        if (mult >= 1000) {
          labelText = isNarrowBucket ? '1K' : '1Kx';
        } else if (mult >= 100) {
          labelText = isNarrowBucket ? `${mult}` : `${mult}x`;
        } else if (mult < 1 && isNarrowBucket) {
          // Format 0.5 -> .5, 0.3 -> .3, 0.2 -> .2 for crystal clarity inside narrow 16R buckets
          labelText = `${mult}`.replace(/^0/, '');
        } else if (isNarrowBucket) {
          labelText = `${mult}`;
        } else {
          labelText = `${mult}x`;
        }

        const fontSize =
          activeRows === 16
            ? labelText.length >= 3
              ? 7.5
              : 8.5
            : activeRows === 12
            ? labelText.length >= 4
              ? 8.5
              : 9.5
            : 10.5;
        ctx.font = `800 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, bxCenter, by + bucketRowHeight / 2 + 0.5, Math.max(8, bucketW - 2));
        ctx.restore();
      }

      // 7. UPDATE & RENDER SIMULTANEOUS MULTI-BALL PARABOLIC PHYSICS + 10-FRAME GLOWING MOTION TRAILS
      const ballRadius = activeRows === 8 ? 7.5 : activeRows === 12 ? 6.4 : 5.4;
      // Speed tuned so a ball traverses each row in ~0.13s with parabolic gravity acceleration
      const segmentSpeed = activeRows === 16 ? 7.8 : activeRows === 12 ? 6.8 : 5.8;

      for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const ball = ballsRef.current[i];
        ball.segmentProgress += dt * segmentSpeed;

        // Advance across segments when segmentProgress >= 1
        while (ball.segmentProgress >= 1) {
          ball.segmentProgress -= 1;

          if (ball.segmentIndex === -1) {
            // Ball just hit top peg (row 0, col 1)
            const hitCoords = getPegCoords(0, 1, activeRows);
            pegScalesRef.current.set('0-1', { scale: 1.45, vScale: 0 });
            ripplesRef.current.push({
              x: hitCoords.x,
              y: hitCoords.y,
              baseRadius: pegRadius,
              progress: 0,
              color:
                ball.hueVariant === 'GOLD'
                  ? 'rgba(251, 191, 36, ALPHA)'
                  : 'rgba(244, 63, 94, ALPHA)',
            });
            plinkoSoundEngine.playPegHit(0, activeRows);
            ball.segmentIndex = 0;
          } else if (ball.segmentIndex < activeRows - 1) {
            // Ball finished moving from row = segmentIndex to nextRow = segmentIndex + 1
            const dir = ball.directions[ball.segmentIndex] ?? 0;
            ball.currentCol += dir;
            const hitRow = ball.segmentIndex + 1;
            const hitCol = ball.currentCol;
            const hitCoords = getPegCoords(hitRow, hitCol, activeRows);

            // Trigger 1.45x elastic peg bounce + neon shockwave ring
            pegScalesRef.current.set(`${hitRow}-${hitCol}`, { scale: 1.45, vScale: 0 });
            ripplesRef.current.push({
              x: hitCoords.x,
              y: hitCoords.y,
              baseRadius: pegRadius,
              progress: 0,
              color:
                hitRow > activeRows * 0.65
                  ? 'rgba(0, 231, 1, ALPHA)'
                  : ball.hueVariant === 'GOLD'
                  ? 'rgba(251, 191, 36, ALPHA)'
                  : 'rgba(56, 189, 248, ALPHA)',
            });
            plinkoSoundEngine.playPegHit(hitRow, activeRows);
            ball.segmentIndex += 1;
          } else {
            // Ball reached the final bucket!
            const finalDir = ball.directions[activeRows - 1] ?? 0;
            const landedBucket = Math.max(
              0,
              Math.min(activeRows, ball.currentCol + finalDir - 1)
            );
            const bucketCoords = getBucketCenterCoords(landedBucket);

            // 1. Depress bucket downward by 6px with spring return & flash brightness
            bucketAnimRef.current.set(landedBucket, {
              offsetY: 6,
              vOffset: 18,
              flashAlpha: 1.0,
            });

            // 2. Play procedural Web Audio bucket landing sound
            plinkoSoundEngine.playBucketLand(ball.multiplier, ball.bonusTicket);

            // 3. Float +WinAmount popup upward
            popupsRef.current.push({
              id: ball.id,
              x: bucketCoords.x,
              y: bucketTopY - 8,
              vy: -58,
              text: `+${formatActiveTmaAmountRef.current(ball.payoutUsdt)}`,
              subText: ball.bonusTicket ? '👑 +1 VIP LOTTERY TICKET!' : `${ball.multiplier}x`,
              color:
                ball.multiplier >= 10 || ball.bonusTicket
                  ? '#fbbf24'
                  : ball.multiplier >= 1
                  ? '#00e701'
                  : '#cbd5e1',
              alpha: 1.0,
              scale: ball.multiplier >= 2 || ball.bonusTicket ? 1.2 : 1.0,
            });

            // 4. Erupt 35+ 3D confetti particles on any win >= 2x or Bonus Ticket
            if (ball.multiplier >= 2 || ball.bonusTicket) {
              spawnWinConfetti(
                bucketCoords.x,
                bucketTopY,
                ball.multiplier >= 10 || ball.bonusTicket
              );
            }

            // 5. Push to Live History Strip (last 6 landed multipliers)
            setLandedHistory((prev) => [
              {
                id: ball.id,
                multiplier: ball.multiplier,
                payoutUsdt: ball.payoutUsdt,
                bonusTicket: ball.bonusTicket,
                roundId: ball.roundId,
                bucketCategory: getBucketCategory(ball.multiplier),
                timestamp: Date.now(),
              },
              ...prev.slice(0, 5),
            ]);

            if (ball.bonusTicket) {
              setBonusBanner(
                `👑 تبریک! توپ شما وارد اسلات ویژه LOTTERY TICKET شد و علاوه بر برد ${formatActiveTmaAmountRef.current(
                  ball.payoutUsdt
                )}، یک بلیت رایگان VIP لاتاری برای شما صادر گردید!`
              );
            }

            onRoundSettledRef.current?.(ball.evaluation, ball.debitUuid);

            // Remove landed ball
            ballsRef.current.splice(i, 1);
            setActiveBallsCount(ballsRef.current.length);
            break;
          }
        }

        // If ball is still active, compute its parabolic position (x, y)
        if (!ballsRef.current[i]) continue;

        const u = ball.segmentProgress;
        let startPos: { x: number; y: number };
        let endPos: { x: number; y: number };
        let arcBounceHeight = rowSpacingY * 0.28;

        if (ball.segmentIndex === -1) {
          startPos = { x: centerX, y: topNozzleY + 4 };
          endPos = getPegCoords(0, 1, activeRows);
          endPos.y -= pegRadius + ballRadius * 0.6;
          arcBounceHeight = 4;
        } else if (ball.segmentIndex < activeRows - 1) {
          const r = ball.segmentIndex;
          const dir = ball.directions[r] ?? 0;
          startPos = getPegCoords(r, ball.currentCol, activeRows);
          startPos.y -= pegRadius + ballRadius * 0.5;
          endPos = getPegCoords(r + 1, ball.currentCol + dir, activeRows);
          endPos.y -= pegRadius + ballRadius * 0.5;
        } else {
          const r = activeRows - 1;
          const dir = ball.directions[r] ?? 0;
          startPos = getPegCoords(r, ball.currentCol, activeRows);
          startPos.y -= pegRadius + ballRadius * 0.5;
          const targetB = Math.max(0, Math.min(activeRows, ball.currentCol + dir - 1));
          endPos = getBucketCenterCoords(targetB);
        }

        // Parabolic gravity arc: smooth horizontal easing + slight micro-jitter + quadratic gravity y(u)
        const microJitter =
          Math.sin(u * Math.PI) * Math.sin(ball.jitterPhase + ball.segmentIndex * 2.1) * 1.6;
        const bx = startPos.x + (endPos.x - startPos.x) * u + microJitter;
        // Parabolic bounce: rises slightly after peg impact (4*u*(1-u)) while accelerating downward under gravity (u*u)
        const by =
          startPos.y +
          (endPos.y - startPos.y) * (u * u) -
          arcBounceHeight * 4 * u * (1 - u);

        ball.x = bx;
        ball.y = by;

        // Maintain 10-frame motion trail
        ball.trail.unshift({ x: bx, y: by });
        if (ball.trail.length > 10) {
          ball.trail.pop();
        }

        // Render 10-frame glowing quadraticCurveTo motion ribbon behind the ball
        if (ball.trail.length >= 2) {
          ctx.save();
          for (let t = 0; t < ball.trail.length - 1; t++) {
            const p0 = ball.trail[t];
            const p1 = ball.trail[t + 1];
            const ratio = 1 - t / ball.trail.length;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
            ctx.strokeStyle =
              ball.hueVariant === 'GOLD'
                ? `rgba(251, 191, 36, ${(ratio * 0.52).toFixed(3)})`
                : `rgba(244, 63, 94, ${(ratio * 0.52).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.2, ballRadius * 1.35 * ratio);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.restore();
        }

        // Render 3D Glowing Sphere with shadowBlur: 18 bloom & specular highlight dot
        ctx.save();
        ctx.shadowColor =
          ball.hueVariant === 'GOLD' ? 'rgba(251, 191, 36, 0.95)' : 'rgba(244, 63, 94, 0.95)';
        ctx.shadowBlur = 18;

        const sphereGrad = ctx.createRadialGradient(
          bx - ballRadius * 0.35,
          by - ballRadius * 0.35,
          ballRadius * 0.1,
          bx,
          by,
          ballRadius
        );
        if (ball.hueVariant === 'GOLD') {
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.28, '#fde047');
          sphereGrad.addColorStop(0.7, '#f59e0b');
          sphereGrad.addColorStop(1, '#b45309');
        } else {
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.28, '#fda4af');
          sphereGrad.addColorStop(0.7, '#f43f5e');
          sphereGrad.addColorStop(1, '#9f1239');
        }

        ctx.beginPath();
        ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Crisp specular dot
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(
          bx - ballRadius * 0.32,
          by - ballRadius * 0.32,
          ballRadius * 0.24,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fill();
        ctx.restore();
      }

      // 8. RENDER 3D CONFETTI & SPARK PARTICLE BURSTS
      for (let i = confettiRef.current.length - 1; i >= 0; i--) {
        const c = confettiRef.current[i];
        c.life += dt;
        if (c.life >= c.maxLife) {
          confettiRef.current.splice(i, 1);
          continue;
        }
        c.vy += 420 * dt; // Gravity acceleration
        c.vx *= Math.pow(0.45, dt); // Air drag
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotation += c.vRot * dt;
        c.tiltAngle += c.vTilt * dt;
        c.alpha = Math.max(0, 1 - c.life / c.maxLife);

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        const scaleY = Math.cos(c.tiltAngle);
        ctx.scale(1, scaleY);
        ctx.globalAlpha = c.alpha;
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.68);
        ctx.restore();
      }

      // 9. RENDER FLOATING +WinAmount POPUPS
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.y += pop.vy * dt;
        pop.vy *= Math.pow(0.25, dt);
        pop.alpha -= dt * 0.88;
        if (pop.alpha <= 0) {
          popupsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.font = `900 ${Math.round(13 * pop.scale)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);

        if (pop.subText) {
          ctx.font = '800 9.5px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#fde047';
          ctx.fillText(pop.subText, pop.x, pop.y - 14);
        }
        ctx.restore();
      }

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [spawnWinConfetti]);

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
    const nextMuted = plinkoSoundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="space-y-3" dir="ltr" data-testid="stake-plinko-studio">
      {bonusBanner && (
        <div
          data-testid="plinko-bonus-ticket-banner"
          className="p-3 rounded-2xl bg-[#130d24]/90 border border-[#fbbf24]/50 text-[#fbbf24] text-xs font-semibold flex items-center justify-between gap-2"
          dir="rtl"
        >
          <span>{bonusBanner}</span>
          <button
            type="button"
            onClick={() => navigateTo('my-tickets')}
            className="px-2.5 py-1 rounded-lg bg-[#fbbf24] text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
          >
            مشاهده ↗
          </button>
        </div>
      )}

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

      {/* =====================================================================
          TOP: GAME CANVAS CONTAINER
          w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716]
          border border-purple-500/25 overflow-hidden relative
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716] border border-purple-500/25 overflow-hidden relative">
        {/* Top-Left: Minimal Floating Translucent Pill for Recent Multipliers */}
        <div
          data-testid="plinko-live-history-strip"
          className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 max-w-[72%] overflow-x-auto no-scrollbar"
        >
          {landedHistory.length === 0 ? (
            <span className="text-[11px] font-medium text-purple-300/60 tabular-nums">
              {rows}R • {risk}
              {activeBallsCount > 0 ? ` • ${activeBallsCount}●` : ''}
            </span>
          ) : (
            landedHistory.slice(0, 5).map((item, idx) => (
              <span
                key={item.id}
                data-testid={`plinko-history-badge-${idx}`}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tabular-nums shrink-0 ${
                  item.multiplier >= 10
                    ? 'bg-[#fbbf24] text-slate-950'
                    : item.multiplier >= 2
                    ? 'bg-[#00f59b] text-[#041f14]'
                    : 'bg-purple-950/90 text-purple-200'
                }`}
              >
                {item.multiplier}x
              </span>
            ))
          )}
        </div>

        {/* Top-Right: Minimal Floating Translucent Pill for Sound & Fairness Icons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button
            type="button"
            data-testid="plinko-audio-mute-btn"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute Plinko Audio' : 'Mute Plinko Audio'}
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

        {/* 60FPS Retina HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          data-testid="plinko-3d-canvas"
          className="w-full h-full block select-none"
        />
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DECK
          rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        {/* ROW 1: Bet Amount Input (0.01 TON to ∞ Balance) with 1/2, 2x, MAX */}
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              data-testid="plinko-sidebar-balance"
              className="text-sm shrink-0"
              title={formatActiveTmaAmount(balanceUsdt)}
            >
              {activeTmaCurrency === 'TON' ? '💎' : '⭐'}
            </span>
            <input
              id="plinko-bet-input"
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              data-testid="plinko-bet-input"
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
              data-testid="plinko-bet-half"
              onClick={() => {
                const minB = activeTmaCurrency === 'TON' ? 0.01 : 1;
                setBetAmount(minB);
              }}
              className="h-7 px-2 text-[10px] font-mono font-bold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-emerald-300 transition-colors cursor-pointer"
              title="Minimum Bet (0.01 TON)"
            >
              MIN
            </button>
            <button
              type="button"
              onClick={handleHalfBet}
              className="h-7 px-2 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              data-testid="plinko-bet-double"
              onClick={handleDoubleBet}
              className="h-7 px-2 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              data-testid="plinko-bet-max"
              onClick={handleMaxBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-[#fbbf24] transition-colors cursor-pointer"
              title="Bet Full Balance (∞)"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Game-Specific Secondary Controls (Risk & Rows in uniform h-10 rounded-xl segmented selectors) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Risk Segmented Selector */}
          <div className="h-10 rounded-xl bg-[#090612] p-1 border border-purple-500/20 grid grid-cols-3 gap-1">
            {(['LOW', 'MEDIUM', 'HIGH'] as PlinkoRiskLevel[]).map((level) => {
              const active = risk === level;
              return (
                <button
                  key={level}
                  type="button"
                  data-testid={`plinko-risk-${level}`}
                  onClick={() => setRisk(level)}
                  className={`rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-purple-600/40 text-white border border-purple-400/40'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  {level === 'LOW' ? 'Low' : level === 'MEDIUM' ? 'Med' : 'High'}
                </button>
              );
            })}
          </div>

          {/* Rows Segmented Selector */}
          <div className="h-10 rounded-xl bg-[#090612] p-1 border border-purple-500/20 grid grid-cols-3 gap-1">
            {([8, 12, 16] as PlinkoRowCount[]).map((rCount) => {
              const active = rows === rCount;
              return (
                <button
                  key={rCount}
                  type="button"
                  data-testid={`plinko-rows-${rCount}`}
                  onClick={() => setRows(rCount)}
                  className={`rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer tabular-nums ${
                    active
                      ? 'bg-purple-600/40 text-[#fbbf24] border border-purple-400/40'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  {rCount}R
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 3: Full-Width Tactile Primary CTA Button + Compact Burst/Auto Triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="plinko-drop-ball-btn"
            onClick={handleDropSingleBall}
            className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Drop Ball</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
              {formatCurrency(betAmount)}
            </span>
          </button>

          <button
            type="button"
            data-testid="plinko-burst-5-btn"
            onClick={handleDropBurst5}
            title="Multi-Ball Burst (5x)"
            className="h-12 px-3 rounded-xl bg-[#090612] hover:bg-purple-950/80 border border-purple-500/25 text-xs font-mono font-bold text-[#fbbf24] shrink-0 cursor-pointer"
          >
            ⚡5x
          </button>
        </div>
      </div>
    </div>
  );
};
