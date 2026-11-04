/**
 * Soft Trailing Light & Cascading Energy Orb Shader Helpers for Plinko
 */

export interface PlinkoTrailCoord {
  x: number;
  y: number;
}

/**
 * Renders a cascading 3D energy orb with a soft, multi-layered trailing light effect
 * and peripheral halo glow as it bounces down the golden peg pyramid.
 */
export function renderPlinkoEnergyOrbWithTrail(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  ballRadius: number,
  trail: PlinkoTrailCoord[],
  hueVariant: 'GOLD' | 'MAGENTA',
  nowMs: number
): void {
  const isGold = hueVariant === 'GOLD';

  // 1. Soft Outer Trailing Light Ribbon + Luminous Afterimage Nodes
  if (trail.length >= 2) {
    ctx.save();
    for (let t = 0; t < trail.length - 1; t++) {
      const p0 = trail[t];
      const p1 = trail[t + 1];
      const ratio = 1 - t / trail.length;
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;

      // Wide soft aura ribbon
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      ctx.strokeStyle = isGold
        ? `rgba(245, 158, 11, ${(ratio * 0.28).toFixed(3)})`
        : `rgba(16, 185, 129, ${(ratio * 0.28).toFixed(3)})`;
      ctx.lineWidth = Math.max(2, ballRadius * 2.1 * ratio);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Crisp inner energy filament
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      ctx.strokeStyle = isGold
        ? `rgba(253, 224, 71, ${(ratio * 0.68).toFixed(3)})`
        : `rgba(52, 211, 153, ${(ratio * 0.68).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, ballRadius * 1.15 * ratio);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Trailing light sparkle dots along the wake
      if (t % 2 === 1) {
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, Math.max(1, ballRadius * 0.42 * ratio), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(ratio * 0.75).toFixed(3)})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 2. Soft Radial Energy Corona around the cascading orb
  ctx.save();
  const pulse = 0.88 + 0.12 * Math.sin(nowMs * 0.018);
  const coronaRadius = ballRadius * 2.35 * pulse;
  const coronaGrad = ctx.createRadialGradient(bx, by, ballRadius * 0.2, bx, by, coronaRadius);
  if (isGold) {
    coronaGrad.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
    coronaGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
    coronaGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  } else {
    coronaGrad.addColorStop(0, 'rgba(110, 231, 183, 0.55)');
    coronaGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.22)');
    coronaGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  }
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(bx, by, coronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. 3D Sculpted Energy Sphere with Specular Glint
  ctx.shadowColor = isGold ? 'rgba(251, 191, 36, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  ctx.shadowBlur = 16;

  const sphereGrad = ctx.createRadialGradient(
    bx - ballRadius * 0.35,
    by - ballRadius * 0.35,
    ballRadius * 0.1,
    bx,
    by,
    ballRadius
  );
  if (isGold) {
    sphereGrad.addColorStop(0, '#FFFFFF');
    sphereGrad.addColorStop(0.28, '#FEF08A');
    sphereGrad.addColorStop(0.7, '#F59E0B');
    sphereGrad.addColorStop(1, '#B45309');
  } else {
    sphereGrad.addColorStop(0, '#FFFFFF');
    sphereGrad.addColorStop(0.28, '#A7F3D0');
    sphereGrad.addColorStop(0.7, '#10B981');
    sphereGrad.addColorStop(1, '#047857');
  }

  ctx.beginPath();
  ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  // Specular highlight dot
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(
    bx - ballRadius * 0.32,
    by - ballRadius * 0.32,
    ballRadius * 0.26,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.restore();
}
