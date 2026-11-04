import React, { useEffect, useRef } from 'react';

export interface MinesFxEvent {
  id: string;
  tileIndex: number; // 0..24 in 5x5 grid
  kind: 'GEM_REVEAL' | 'MINE_HIT' | 'CASHOUT_WIN';
}

interface MinesLightParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  shape: 'DIAMOND' | 'ORB' | 'EMBER';
}

interface MinesShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  secondaryColor: string;
  alpha: number;
  lineWidth: number;
  isRubyShockwave: boolean;
}

/**
 * Computes the normalized (0..1) center coordinates of a tile in the 5x5 Mines grid.
 */
export function getMinesTileNormalizedCenter(tileIndex: number): { nx: number; ny: number } {
  const clamped = Math.max(0, Math.min(24, Math.floor(tileIndex)));
  const row = Math.floor(clamped / 5);
  const col = clamped % 5;
  return {
    nx: (col + 0.5) / 5,
    ny: (row + 0.5) / 5,
  };
}

export interface MinesParticleOverlayProps {
  events: MinesFxEvent[];
}

/**
 * 60 FPS Zero-Dependency Canvas Particle & Shockwave Overlay for Mines 5×5 Grid:
 * - On safe emerald gem reveal: localized burst of floating emerald/gold light particles + harmonic halo.
 * - On mine hit: obsidian-ruby shockwave glow ring + crimson/obsidian ember sparks.
 */
export const MinesParticleOverlay: React.FC<MinesParticleOverlayProps> = ({ events }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<MinesLightParticle[]>([]);
  const ringsRef = useRef<MinesShockwaveRing[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Spawn particles whenever a new event arrives
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || events.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const W = Math.max(200, canvas.width / dpr || canvas.clientWidth || 240);
    const H = Math.max(200, canvas.height / dpr || canvas.clientHeight || 240);

    for (const ev of events) {
      if (processedIdsRef.current.has(ev.id)) continue;
      processedIdsRef.current.add(ev.id);

      const { nx, ny } = getMinesTileNormalizedCenter(ev.tileIndex);
      const cx = nx * W;
      const cy = ny * H;

      if (ev.kind === 'GEM_REVEAL') {
        // Localized emerald & gold halo ring
        ringsRef.current.push({
          x: cx,
          y: cy,
          radius: 8,
          maxRadius: 48,
          color: '#10B981',
          secondaryColor: '#FDE047',
          alpha: 0.95,
          lineWidth: 3,
          isRubyShockwave: false,
        });

        // 24 floating emerald & gold diamond light particles
        const gemPalette = ['#10B981', '#34D399', '#A7F3D0', '#FDE047', '#FFFFFF'];
        for (let i = 0; i < 24; i++) {
          const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.35;
          const speed = 35 + Math.random() * 95;
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * 8,
            y: cy + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * speed * 0.75,
            vy: Math.sin(angle) * speed * 0.75 - 32 - Math.random() * 28,
            size: 3.2 + Math.random() * 3.8,
            color: gemPalette[i % gemPalette.length],
            alpha: 1,
            life: 0,
            maxLife: 0.52 + Math.random() * 0.38,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 8,
            shape: i % 2 === 0 ? 'DIAMOND' : 'ORB',
          });
        }
      } else if (ev.kind === 'MINE_HIT') {
        // Primary & Secondary Obsidian-Ruby Shockwave Glow Rings
        ringsRef.current.push({
          x: cx,
          y: cy,
          radius: 10,
          maxRadius: 96,
          color: '#F43F5E',
          secondaryColor: '#1E1B4B',
          alpha: 1,
          lineWidth: 4.5,
          isRubyShockwave: true,
        });
        ringsRef.current.push({
          x: cx,
          y: cy,
          radius: 4,
          maxRadius: 64,
          color: '#FB7185',
          secondaryColor: '#881337',
          alpha: 0.88,
          lineWidth: 2.5,
          isRubyShockwave: true,
        });

        // 34 Obsidian-Ruby & Amber Detonation Sparks
        const bombPalette = ['#F43F5E', '#BE123C', '#FB7185', '#F59E0B', '#312E81'];
        for (let i = 0; i < 34; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 55 + Math.random() * 165;
          particlesRef.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3.5 + Math.random() * 4.5,
            color: bombPalette[i % bombPalette.length],
            alpha: 1,
            life: 0,
            maxLife: 0.48 + Math.random() * 0.42,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 12,
            shape: 'EMBER',
          });
        }
      } else if (ev.kind === 'CASHOUT_WIN') {
        // Grand Emerald & Gold Celebration Burst from Board Center
        ringsRef.current.push({
          x: W * 0.5,
          y: H * 0.5,
          radius: 14,
          maxRadius: 120,
          color: '#FDE047',
          secondaryColor: '#10B981',
          alpha: 0.95,
          lineWidth: 3.5,
          isRubyShockwave: false,
        });
        const winPalette = ['#FDE047', '#F59E0B', '#10B981', '#34D399', '#FFFFFF'];
        for (let i = 0; i < 36; i++) {
          const angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.25;
          const speed = 60 + Math.random() * 145;
          particlesRef.current.push({
            x: W * 0.5,
            y: H * 0.5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 40,
            size: 3.8 + Math.random() * 4.2,
            color: winPalette[i % winPalette.length],
            alpha: 1,
            life: 0,
            maxLife: 0.65 + Math.random() * 0.45,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 10,
            shape: 'DIAMOND',
          });
        }
      }
    }
  }, [events]);

  // 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rAF = 0;
    let lastTime = performance.now();

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.max(200, Math.floor(rect.width * dpr));
      const targetH = Math.max(200, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    syncCanvasSize();
    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncCanvasSize) : null;
    resizeObs?.observe(canvas);

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      syncCanvasSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // 1. Render Shockwave & Harmonic Halo Rings
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const r = ringsRef.current[i];
        r.radius += (r.maxRadius - r.radius) * 7.5 * dt + 45 * dt;
        r.alpha -= (r.isRubyShockwave ? 1.85 : 2.1) * dt;
        if (r.alpha <= 0.01) {
          ringsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha);

        if (r.isRubyShockwave) {
          // Subtle obsidian-ruby radial shockwave glow fill
          const shockGrad = ctx.createRadialGradient(
            r.x,
            r.y,
            r.radius * 0.1,
            r.x,
            r.y,
            r.radius
          );
          shockGrad.addColorStop(0, 'rgba(30, 27, 75, 0.35)');
          shockGrad.addColorStop(0.65, 'rgba(244, 63, 94, 0.28)');
          shockGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
          ctx.fillStyle = shockGrad;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lineWidth * r.alpha;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = r.isRubyShockwave ? 18 : 14;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render Floating Emerald Light Particles & Obsidian-Ruby Embers
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        if (p.shape === 'EMBER') {
          p.vy += 190 * dt; // Gravity on embers
          p.vx *= Math.pow(0.45, dt);
        } else {
          // Floating emerald light particles drift gently upward with subtle shimmer
          p.vy -= 28 * dt;
          p.vx *= Math.pow(0.55, dt);
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        if (p.shape === 'DIAMOND') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.72, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.72, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'ORB') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
        }
        ctx.restore();
      }

      ctx.restore();
      rAF = window.requestAnimationFrame(renderFrame);
    };

    rAF = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(rAF);
      resizeObs?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="mines-particle-fx-canvas"
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
};
