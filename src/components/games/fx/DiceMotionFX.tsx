import React from 'react';
import { LuxuryDiceCubeIcon } from '../../ui/LuxuryIcons.tsx';

/**
 * Renders a 3D motion-blur afterimage streak and metallic gold/emerald glint sweep
 * on the 60FPS Dice canvas whenever a roll lands or glides across the track.
 */
export function renderDiceMetallicGlintCanvasFX(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  rollPct: number | null,
  won: boolean,
  isRolling: boolean,
  nowMs: number
): void {
  const padX = 44;
  const trackW = Math.max(200, W - padX * 2);
  const centerY = H * 0.52;
  const targetX = padX + (Math.max(0, Math.min(100, rollPct ?? 50)) / 100) * trackW;

  // 1. Metallic Glint Sweep across the slider axis
  const sweepPhase = (nowMs * 0.00065) % 1;
  const glintX = padX + sweepPhase * trackW;
  const glintGrad = ctx.createRadialGradient(glintX, centerY, 4, glintX, centerY, 95);
  glintGrad.addColorStop(0, 'rgba(253, 224, 71, 0.16)');
  glintGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
  glintGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.save();
  ctx.fillStyle = glintGrad;
  ctx.fillRect(0, centerY - 70, W, 140);
  ctx.restore();

  // 2. 3D Motion-Blur Streak & Specular Halo beneath the Hexagon Marker
  if (rollPct !== null) {
    ctx.save();
    const pulse = 0.78 + 0.22 * Math.sin(nowMs * 0.012);
    const auraColor = won ? 'rgba(16, 185, 129, 0.32)' : 'rgba(244, 63, 94, 0.26)';
    const markerGrad = ctx.createRadialGradient(
      targetX,
      centerY - 26,
      4,
      targetX,
      centerY - 26,
      (isRolling ? 68 : 46) * pulse
    );
    markerGrad.addColorStop(0, won ? 'rgba(253, 224, 71, 0.42)' : 'rgba(251, 113, 133, 0.35)');
    markerGrad.addColorStop(0.5, auraColor);
    markerGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = markerGrad;
    ctx.beginPath();
    ctx.arc(targetX, centerY - 26, (isRolling ? 68 : 46) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export interface Dice3DMotionBadgeProps {
  rollingNow: boolean;
  lastRollWon: boolean;
  lastRollResult: number | null;
}

/**
 * 3D Isometric Cube & Metallic Glint Status Emblem displayed during/after Dice rolls.
 */
export const Dice3DMotionBadge: React.FC<Dice3DMotionBadgeProps> = ({
  rollingNow,
  lastRollWon,
  lastRollResult,
}) => {
  return (
    <div
      data-testid="dice-3d-motion-fx-badge"
      className={`relative overflow-hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md transition-all duration-300 ${
        rollingNow
          ? 'bg-amber-500/20 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.45)] scale-105'
          : lastRollWon
          ? 'bg-emerald-950/75 border-emerald-400/45 shadow-[0_0_14px_rgba(16,185,129,0.28)]'
          : 'bg-rose-950/75 border-rose-400/45 shadow-[0_0_14px_rgba(244,63,94,0.25)]'
      }`}
    >
      {/* Metallic Glint Sweep Layer */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 ${
          rollingNow ? 'translate-x-full animate-pulse' : '-translate-x-full'
        }`}
      />
      <span
        className={`inline-flex items-center justify-center transition-transform duration-300 ${
          rollingNow ? 'animate-spin drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]' : ''
        }`}
      >
        <LuxuryDiceCubeIcon size={15} />
      </span>
      <span className="font-mono text-[10px] font-extrabold tracking-tight text-white tabular-nums">
        {rollingNow
          ? '52-BIT ROLL...'
          : lastRollResult !== null
          ? `${lastRollResult.toFixed(2)}`
          : 'READY'}
      </span>
    </div>
  );
};
