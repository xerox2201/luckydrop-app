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
    provablyFairSeeds,
    playInstantMiniGame,
    setDepositModalOpen,
    setWalletDrawerOpen,
    navigateTo,
  } = useLottery();

  // Stake Left Control Sidebar State
  const [controlTab, setControlTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [betAmount, setBetAmount] = useState<number>(5);
  const [risk, setRisk] = useState<PlinkoRiskLevel>('MEDIUM');
  const [rows, setRows] = useState<PlinkoRowCount>(16);
  const [autoBetCount, setAutoBetCount] = useState<number>(10); // 0 = infinite
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
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

  useEffect(() => {
    onRoundSettledRef.current = onRoundSettled;
  }, [onRoundSettled]);

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
    const cleanBet = Math.max(0.5, Number(betAmount.toFixed(2)) || 1);
    if (balanceUsdt < cleanBet) {
      setDepositModalOpen(true);
      setErrorBanner('موجودی کیف پول PAM کافی نیست. لطفاً ابتدا کیف پول را شارژ کنید.');
      setAutoRunning(false);
      return false;
    }

    // Immediate pneumatic drop audio
    plinkoSoundEngine.playDrop();

    const currentRows = rowsRef.current;
    const currentRisk = riskRef.current;

    const res = await playInstantMiniGame({
      gameId: 'PLINKO',
      betAmountUsdt: cleanBet,
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
      betAmountUsdt: cleanBet,
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
  }, [betAmount, balanceUsdt, playInstantMiniGame, setDepositModalOpen]);

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
        W * 0.48,
        H * 0.44,
        18,
        W * 0.48,
        H * 0.46,
        Math.max(W, H) * 0.65
      );
      spotGrad.addColorStop(0, '#1e3748');
      spotGrad.addColorStop(0.58, '#132836');
      spotGrad.addColorStop(1, '#0f212e');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle studio grid / light beams at the top chute
      const chuteCenterX = W * 0.475; // Slightly left of center to leave room for right-edge Live History Strip
      const topNozzleY = 26;

      // 2. FLOATING AMBIENT DUST PARTICLES
      for (const p of dustRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0.02) {
          p.y = 0.96;
          p.x = Math.random();
        }
        if (p.x < 0.02) p.x = 0.94;
        if (p.x > 0.94) p.x = 0.02;

        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`;
        ctx.fill();
      }

      // 3. PYRAMID GEOMETRY CALCULATION (8, 12, or 16 rows)
      const activeRows = rowsRef.current;
      const activeRisk = riskRef.current;
      const multipliers = PLINKO_MULTIPLIER_TABLES[activeRows][activeRisk];

      if (morphAlphaRef.current < 1) {
        morphAlphaRef.current = Math.min(1, morphAlphaRef.current + dt * 4.5);
      }

      // Reserve right 66px on desktop (52px on mobile) for the Live History Strip
      const rightReserve = W > 620 ? 74 : 52;
      const usableW = W - rightReserve - 24;
      const centerX = 12 + usableW / 2;

      const pyramidTopY = 58;
      const bucketRowHeight = W > 620 ? 38 : 32;
      const bucketBottomMargin = 22;
      const bucketTopY = H - bucketRowHeight - bucketBottomMargin;
      const pyramidBottomY = bucketTopY - 26;
      const pyramidHeight = Math.max(180, pyramidBottomY - pyramidTopY);

      const rowSpacingY = pyramidHeight / Math.max(1, activeRows - 1);
      // Max pegs in bottom row is activeRows + 2 (so gaps = activeRows + 1 = buckets count)
      const maxColsBottom = activeRows + 2;
      const pegSpacingX = Math.min(
        rowSpacingY * 1.16,
        usableW / (maxColsBottom + 0.6)
      );
      const pegRadius = activeRows === 8 ? 6.2 : activeRows === 12 ? 5.0 : 4.1;

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

      // 6. RENDER 3D BEVELED MULTIPLIER BUCKETS AT BOTTOM ROW
      const totalBuckets = activeRows + 1;
      const bucketGap = activeRows === 16 ? 3 : 4;
      const bucketW = Math.max(18, pegSpacingX - bucketGap);
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
        const lipDepth = Math.max(2, 5 - depressY * 0.5);

        ctx.save();

        // Outer pulsing neon glow for high-multiplier slots (>= 10x) or Bonus Ticket slots
        if (mult >= 10 || isBonusSlot) {
          ctx.shadowColor = isBonusSlot
            ? `rgba(251, 191, 36, ${0.5 + 0.4 * pulseGlow})`
            : colors.glowColor;
          ctx.shadowBlur = 12 + 6 * pulseGlow;
        }

        // a) 3D Physical Bottom Shadow Lip
        drawRoundedBeveledRect(ctx, bx, by + 3, bucketW, bucketRowHeight + lipDepth - 2, 6);
        ctx.fillStyle = isBonusSlot ? '#92400e' : colors.lipColor;
        ctx.fill();

        // b) Main Beveled Face Gradient
        const faceGrad = ctx.createLinearGradient(bx, by, bx, by + bucketRowHeight);
        faceGrad.addColorStop(0, colors.topStop);
        faceGrad.addColorStop(1, colors.bottomStop);

        drawRoundedBeveledRect(ctx, bx, by, bucketW, bucketRowHeight, 6);
        ctx.fillStyle = faceGrad;
        ctx.fill();

        // Top inner specular bevel highlight
        ctx.strokeStyle = isBonusSlot
          ? 'rgba(253, 224, 71, 0.85)'
          : 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = isBonusSlot ? 1.6 : 1;
        ctx.stroke();

        // Landing brightness flash overlay
        if (flashAlpha > 0.01) {
          drawRoundedBeveledRect(ctx, bx, by, bucketW, bucketRowHeight, 6);
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.78})`;
          ctx.fill();
        }

        ctx.restore();

        // c) Special "LOTTERY TICKET" Bonus Badge above/on designated bonus slots
        if (isBonusSlot) {
          ctx.save();
          const badgeW = Math.min(bucketW + 6, 42);
          const badgeH = 12;
          const badgeX = bxCenter - badgeW / 2;
          const badgeY = by - 13;
          drawRoundedBeveledRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = '900 7.5px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👑 TICKET', bxCenter, badgeY + badgeH / 2 + 0.5);
          ctx.restore();
        }

        // d) Crisp Multiplier Label inside Bucket
        ctx.save();
        ctx.fillStyle = colors.textColor;
        const fontSize =
          activeRows === 16 ? (mult >= 100 ? 8.5 : 9.5) : activeRows === 12 ? 10.5 : 11.5;
        ctx.font = `900 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelText = mult >= 100 ? `${mult}x` : `${mult}x`;
        ctx.fillText(labelText, bxCenter, by + bucketRowHeight / 2 + 0.5);
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

            // 3. Float +$WinAmount popup upward
            popupsRef.current.push({
              id: ball.id,
              x: bucketCoords.x,
              y: bucketTopY - 8,
              vy: -58,
              text: `+$${ball.payoutUsdt.toFixed(2)}`,
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
                `👑 تبریک! توپ شما وارد اسلات ویژه LOTTERY TICKET شد و علاوه بر برد نقدی $${ball.payoutUsdt.toFixed(
                  2
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

      // 9. RENDER FLOATING +$WinAmount POPUPS
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
    setBetAmount((prev) => Math.max(0.5, Number((prev / 2).toFixed(2))));
  };

  const handleDoubleBet = () => {
    setBetAmount((prev) => Math.min(Math.max(0.5, balanceUsdt), Number((prev * 2).toFixed(2))));
  };

  const handleMaxBet = () => {
    setBetAmount(Math.max(0.5, Math.min(1000, Number(balanceUsdt.toFixed(2)))));
  };

  const handleToggleMute = () => {
    const nextMuted = plinkoSoundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="space-y-4">
      {bonusBanner && (
        <div
          data-testid="plinko-bonus-ticket-banner"
          className="p-4 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-lg"
        >
          <span>{bonusBanner}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('my-tickets')}
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              مشاهده بلیت رایگان ↗
            </button>
            <button
              type="button"
              onClick={() => setBonusBanner(null)}
              className="text-xs text-amber-300 underline cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

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

      {/* STAKE-STYLE SPLIT STUDIO CONTAINER:
          Desktop: Left Control Sidebar (#1a2c38) + Right Game Arena (#0f212e)
          Mobile: Game Arena on top, Controls below (flex-col-reverse lg:flex-row) */}
      <div
        dir="ltr"
        data-testid="stake-plinko-studio"
        className="rounded-3xl overflow-hidden border border-white/15 bg-[#0f212e] shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col-reverse lg:flex-row"
      >
        {/* LEFT CONTROL PANEL (#1a2c38) */}
        <aside className="w-full lg:w-[330px] xl:w-[350px] shrink-0 bg-[#1a2c38] border-t lg:border-t-0 lg:border-r border-white/10 p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            {/* Manual / Auto Mode Tabs */}
            <div className="grid grid-cols-2 bg-[#0f212e] p-1 rounded-full border border-white/10">
              <button
                type="button"
                data-testid="plinko-tab-manual"
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
                data-testid="plinko-tab-auto"
                onClick={() => setControlTab('AUTO')}
                className={`py-2.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${
                  controlTab === 'AUTO'
                    ? 'bg-[#2f4553] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto
              </button>
            </div>

            {/* Bet Amount Input with 1/2, 2x, and Max inside the input box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <label htmlFor="plinko-bet-input">Bet Amount (USDT)</label>
                <span className="font-mono text-emerald-400" data-testid="plinko-sidebar-balance">
                  Bal: ${balanceUsdt.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center bg-[#0f212e] border-2 border-[#2f4553] focus-within:border-[#557086] rounded-xl overflow-hidden p-1">
                <div className="pl-2.5 pr-1 flex items-center">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    $
                  </span>
                </div>
                <input
                  id="plinko-bet-input"
                  type="number"
                  min={0.5}
                  max={1000}
                  step={0.5}
                  data-testid="plinko-bet-input"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0.5, Number(e.target.value) || 0.5))}
                  className="w-full bg-transparent px-2 py-2 text-sm font-mono font-black text-white focus:outline-none"
                />
                <div className="flex items-center gap-1 pr-1 shrink-0">
                  <button
                    type="button"
                    data-testid="plinko-bet-half"
                    onClick={handleHalfBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    data-testid="plinko-bet-double"
                    onClick={handleDoubleBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    data-testid="plinko-bet-max"
                    onClick={handleMaxBet}
                    className="px-2.5 py-1.5 rounded-lg bg-[#2f4553] hover:bg-[#3d5666] text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            {/* Risk Selector (Low, Medium, High) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">Risk Level</span>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as PlinkoRiskLevel[]).map((level) => {
                  const active = risk === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      data-testid={`plinko-risk-${level}`}
                      onClick={() => setRisk(level)}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#2f4553] border-emerald-400 text-white shadow-md'
                          : 'bg-[#0f212e] border-[#2f4553] text-slate-400 hover:text-white'
                      }`}
                    >
                      {level === 'LOW' ? 'Low' : level === 'MEDIUM' ? 'Medium' : 'High'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rows Selector (8, 12, 16) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">Rows Pyramid</span>
              <div className="grid grid-cols-3 gap-2">
                {([8, 12, 16] as PlinkoRowCount[]).map((rCount) => {
                  const active = rows === rCount;
                  return (
                    <button
                      key={rCount}
                      type="button"
                      data-testid={`plinko-rows-${rCount}`}
                      onClick={() => setRows(rCount)}
                      className={`py-2.5 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#2f4553] border-amber-400 text-amber-300 shadow-md'
                          : 'bg-[#0f212e] border-[#2f4553] text-slate-400 hover:text-white'
                      }`}
                    >
                      {rCount} Rows
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-Bet Count Selector (Visible in AUTO mode) */}
            {controlTab === 'AUTO' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <label htmlFor="plinko-autobet-count">Number of Bets</label>
                  <span className="text-[11px] text-slate-400">0 = ∞</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    id="plinko-autobet-count"
                    type="number"
                    min={0}
                    max={500}
                    value={autoBetCount}
                    onChange={(e) => setAutoBetCount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-[#0f212e] border-2 border-[#2f4553] rounded-xl px-3 py-2 text-sm font-mono font-black text-white"
                  />
                  {[10, 25, 0].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAutoBetCount(cnt)}
                      className="px-2.5 py-2 rounded-xl bg-[#2f4553] hover:bg-[#3d5666] text-xs font-mono font-bold text-white cursor-pointer"
                    >
                      {cnt === 0 ? '∞' : cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROMINENT EMERALD-GREEN #00e701 "Bet / Drop Ball" BUTTON WITH 3D TACTILE PRESS EFFECT */}
            {controlTab === 'MANUAL' ? (
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  data-testid="plinko-drop-ball-btn"
                  onClick={handleDropSingleBall}
                  className="w-full py-4 rounded-xl bg-[#00e701] hover:bg-[#1fff20] text-[#051c08] font-black text-base tracking-wide shadow-[0_5px_0_#009901,0_10px_25px_rgba(0,231,1,0.35)] active:translate-y-[3px] active:shadow-[0_2px_0_#009901] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Bet / Drop Ball</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/15">
                    ${betAmount.toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="plinko-burst-5-btn"
                  onClick={handleDropBurst5}
                  className="w-full py-2.5 rounded-xl bg-[#2f4553] hover:bg-[#3b5566] border border-amber-400/40 text-amber-300 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Multi-Ball Rapid Burst (×5 Balls)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="plinko-autobet-toggle-btn"
                onClick={() => setAutoRunning((prev) => !prev)}
                className={`w-full py-4 rounded-xl font-black text-base tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  autoRunning
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_5px_0_#9f1239]'
                    : 'bg-[#00e701] hover:bg-[#1fff20] text-[#051c08] shadow-[0_5px_0_#009901]'
                }`}
              >
                <span>{autoRunning ? 'Stop Autobet' : 'Start Autobet'}</span>
              </button>
            )}
          </div>

          {/* Bottom Provably Fair & PAM Ledger Footer inside Sidebar */}
          <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs">
            <div className="bg-[#0f212e] rounded-xl p-3 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">🔒 HMAC-SHA256 Nonce:</span>
                <span className="font-mono font-bold text-amber-300">
                  #{provablyFairSeeds.nonce}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                Hash: {provablyFairSeeds.serverSeedHash.slice(0, 24)}...
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWalletDrawerOpen(true)}
                className="py-2 px-3 rounded-xl bg-[#0f212e] hover:bg-[#243b4a] border border-white/10 text-emerald-300 font-bold text-[11px] cursor-pointer text-center"
              >
                PAM Ledger ↗
              </button>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="py-2 px-3 rounded-xl bg-[#0f212e] hover:bg-[#243b4a] border border-white/10 text-amber-300 font-bold text-[11px] cursor-pointer text-center"
              >
                Fairness Verifier ↗
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT GAME ARENA (#0f212e) WITH 2.5D/3D CANVAS & LIVE HISTORY STRIP */}
        <div className="relative flex-1 min-h-[450px] sm:min-h-[510px] lg:min-h-[550px] bg-[#0f212e] flex flex-col justify-between overflow-hidden">
          {/* Top Overlay Utility Bar: Active Balls Badge, Bonus Slot Legend & Mute/Unmute Web Audio Synth */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-3 pointer-events-none">
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
              <span className="px-3 py-1 rounded-full bg-[#1a2c38]/90 border border-white/10 text-[11px] font-mono font-bold text-slate-200">
                STAKE ORIGINALS PLINKO • {rows} ROWS • {risk}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold text-amber-300">
                👑 Slot #2 & #{rows} = Bonus VIP Lottery Ticket
              </span>
              {activeBallsCount > 0 && (
                <span
                  data-testid="plinko-active-balls-badge"
                  className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-mono font-bold text-emerald-300"
                >
                  ● {activeBallsCount} Balls in Flight
                </span>
              )}
            </div>

            {/* Mute / Unmute Procedural Web Audio Synthesizer Button */}
            <button
              type="button"
              data-testid="plinko-audio-mute-btn"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute Plinko Audio' : 'Mute Plinko Audio'}
              className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#1a2c38] hover:bg-[#263f50] border border-white/15 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer shadow"
            >
              <span className="material-symbols-outlined text-base text-amber-300">
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Synth Audio'}</span>
            </button>
          </div>

          {/* 60FPS Retina HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            data-testid="plinko-3d-canvas"
            className="w-full flex-1 h-[410px] sm:h-[470px] lg:h-[505px] block select-none"
          />

          {/* LIVE HISTORY STRIP ON THE RIGHT EDGE (Last 6 Landed Multipliers with Spring Slide) */}
          <div
            data-testid="plinko-live-history-strip"
            className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 w-12 sm:w-14 pointer-events-none"
          >
            {landedHistory.map((item, idx) => {
              const colors = getBucketColors(item.multiplier);
              return (
                <div
                  key={item.id}
                  data-testid={`plinko-history-badge-${idx}`}
                  style={{
                    background: `linear-gradient(180deg, ${colors.topStop} 0%, ${colors.bottomStop} 100%)`,
                    color: colors.textColor,
                    boxShadow: `0 3px 0 ${colors.lipColor}, 0 6px 14px rgba(0,0,0,0.45)`,
                  }}
                  className="h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center font-mono font-black text-xs border border-white/25 transition-all duration-300 animate-[fadeIn_0.22s_ease-out]"
                >
                  <span>{item.multiplier}x</span>
                  {item.bonusTicket && <span className="text-[8px] leading-none">👑TKT</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
