/**
 * Dynamic Neon-Emerald Parabolic Trail & Golden Twin-Thruster Spacecraft Shader Helpers for Crash
 */

export interface CrashCurvePoint {
  x: number;
  y: number;
}

/**
 * Renders a multi-layered glowing neon-emerald & gold parabolic trail behind the ascending rocket
 * with a pulsing plasma core and luxury obsidian-emerald under-curve gradient fill.
 */
export function renderCrashNeonEmeraldParabolicTrail(
  ctx: CanvasRenderingContext2D,
  pts: CrashCurvePoint[],
  plotBottomY: number,
  multiplier: number,
  isCrashed: boolean,
  nowMs: number
): void {
  if (pts.length < 2) return;
  const tipPt = pts[pts.length - 1];
  const pulse = 0.75 + 0.25 * Math.sin(nowMs * 0.008);

  // 1. Luxury Translucent Area Gradient Fill beneath the parabolic trajectory
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, plotBottomY);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const midX = (pts[i - 1].x + pts[i].x) / 2;
    const midY = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
  }
  ctx.lineTo(tipPt.x, tipPt.y);
  ctx.lineTo(tipPt.x, plotBottomY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, tipPt.y, 0, plotBottomY);
  if (isCrashed) {
    areaGrad.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
    areaGrad.addColorStop(0.6, 'rgba(190, 18, 60, 0.12)');
    areaGrad.addColorStop(1, 'rgba(15, 23, 42, 0.01)');
  } else if (multiplier >= 10) {
    areaGrad.addColorStop(0, 'rgba(253, 224, 71, 0.36)');
    areaGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.18)');
    areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
  } else {
    areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.34)');
    areaGrad.addColorStop(0.55, 'rgba(52, 211, 153, 0.14)');
    areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
  }
  ctx.fillStyle = areaGrad;
  ctx.fill();
  ctx.restore();

  // 2. Outer Neon-Emerald & Gold Parabolic Bloom Trail
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const midX = (pts[i - 1].x + pts[i].x) / 2;
    const midY = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
  }
  ctx.lineTo(tipPt.x, tipPt.y);

  const trailGrad = ctx.createLinearGradient(pts[0].x, pts[0].y, tipPt.x, tipPt.y);
  if (isCrashed) {
    trailGrad.addColorStop(0, '#991B1B');
    trailGrad.addColorStop(0.5, '#F43F5E');
    trailGrad.addColorStop(1, '#FDA4AF');
  } else {
    trailGrad.addColorStop(0, '#059669');
    trailGrad.addColorStop(0.45, '#10B981');
    trailGrad.addColorStop(0.82, '#34D399');
    trailGrad.addColorStop(1, '#FDE047');
  }

  ctx.strokeStyle = trailGrad;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = isCrashed
    ? 'rgba(244, 63, 94, 0.9)'
    : `rgba(16, 185, 129, ${(0.75 * pulse).toFixed(2)})`;
  ctx.shadowBlur = 22 * pulse;
  ctx.stroke();

  // 3. Inner High-Energy Specular Core Line
  ctx.shadowBlur = 6;
  ctx.strokeStyle = isCrashed ? 'rgba(255, 228, 230, 0.7)' : 'rgba(236, 253, 245, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the 3D Golden & Obsidian Twin-Thruster Rocket with pulsing emerald/gold plasma plume.
 */
export function renderGoldenRocketShip3D(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  tangentAngle: number,
  nowMs: number
): void {
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(tangentAngle);

  const pulse = 0.8 + 0.2 * Math.sin(nowMs * 0.025);

  // 1. Outer Neon-Emerald & Gold Thruster Halo
  const haloGrad = ctx.createRadialGradient(-14, 0, 2, -14, 0, 24 * pulse);
  haloGrad.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
  haloGrad.addColorStop(0.45, 'rgba(16, 185, 129, 0.45)');
  haloGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(-14, 0, 24 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Pulsing Twin-Thruster Plasma Cone
  const flameLen = 20 + Math.sin(nowMs * 0.04) * 6 + Math.random() * 5;
  const coneGrad = ctx.createLinearGradient(-12, 0, -14 - flameLen, 0);
  coneGrad.addColorStop(0, '#FFFFFF');
  coneGrad.addColorStop(0.28, '#FDE047');
  coneGrad.addColorStop(0.62, '#10B981');
  coneGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

  ctx.beginPath();
  ctx.moveTo(-11, -5.2);
  ctx.lineTo(-14 - flameLen, 0);
  ctx.lineTo(-11, 5.2);
  ctx.closePath();
  ctx.fillStyle = coneGrad;
  ctx.fill();

  // 3. Swept Emerald-Gold Delta Fins
  const finGrad = ctx.createLinearGradient(-6, -13, -15, 13);
  finGrad.addColorStop(0, '#34D399');
  finGrad.addColorStop(0.5, '#059669');
  finGrad.addColorStop(1, '#F59E0B');

  ctx.fillStyle = finGrad;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(-16, -14);
  ctx.lineTo(-12.5, -4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.lineTo(-16, 14);
  ctx.lineTo(-12.5, 4);
  ctx.closePath();
  ctx.fill();

  // 4. 3D Sculpted Golden Metallic Fuselage
  ctx.shadowColor = 'rgba(245, 158, 11, 0.75)';
  ctx.shadowBlur = 14;
  const bodyGrad = ctx.createLinearGradient(0, -8, 0, 8);
  bodyGrad.addColorStop(0, '#FFFBEB');
  bodyGrad.addColorStop(0.35, '#FDE047');
  bodyGrad.addColorStop(0.75, '#F59E0B');
  bodyGrad.addColorStop(1, '#92400E');

  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.quadraticCurveTo(11, -8, -12, -6.2);
  ctx.lineTo(-12, 6.2);
  ctx.quadraticCurveTo(11, 8, 20, 0);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 5. Glowing Obsidian-Emerald Cockpit Canopy
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#064E3B';
  ctx.strokeStyle = '#6EE7B7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(3.5, -0.8, 5.4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#A7F3D0';
  ctx.beginPath();
  ctx.ellipse(4.8, -1.6, 2.2, 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
