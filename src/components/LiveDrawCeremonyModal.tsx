import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Rocket,
  CheckCircle2,
  Ticket,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { buildDrawCeremonyPayload } from '../services/securityGuard';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import { tr, localizeServerText } from '../utils/i18n';

type CeremonyStage = 'MIXING' | 'DROPPING' | 'FINALE';

// Web Audio API Synthesizer for Pneumatic Drumroll, Ball Drop Chimes & Winner Fanfare
class CeremonySoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playDrumrollPulse(intensity: number = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85 + intensity * 55, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);

      gain.gain.setValueAtTime(0.08 * Math.min(1, intensity + 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // ignore audio context restrictions
    }
  }

  public playBallDropChime(stepIndex: number, isPowerBall: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const scaleFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const baseFreq = isPowerBall
        ? 1046.5
        : scaleFreqs[stepIndex % scaleFreqs.length] || 659.25;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = isPowerBall ? 'triangle' : 'sine';

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

      const duration = isPowerBall ? 0.65 : 0.32;
      gain.gain.setValueAtTime(isPowerBall ? 0.16 : 0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // ignore
    }
  }

  public playWinnerFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.13, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.46);
      });
    } catch {
      // ignore
    }
  }
}

export const LiveDrawCeremonyModal: React.FC = () => {
  const {
    lang,
    activeCeremonyDraw,
    setActiveCeremonyDraw,
    activeRound,
    tickets,
    tonUsdRate,
    formatActiveTmaAmount,
    navigateTo,
  } = useLottery();

  const [stage, setStage] = useState<CeremonyStage>('MIXING');
  const [revealedMainCount, setRevealedMainCount] = useState<number>(0);
  const [revealGolden, setRevealGolden] = useState<boolean>(false);
  const [powerBallShockwave, setPowerBallShockwave] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [replayNonce, setReplayNonce] = useState<number>(0);

  const soundRef = useRef<CeremonySoundEngine>(new CeremonySoundEngine());
  const chamberCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    soundRef.current.muted = muted;
  }, [muted]);

  const ceremonyData = useMemo(() => {
    if (!activeCeremonyDraw) return null;
    return buildDrawCeremonyPayload({
      drawRecord: activeCeremonyDraw,
      fallbackRound: activeRound,
      userTickets: tickets,
      revealedMainCount,
      revealGolden,
      tonUsdRate,
    });
  }, [
    activeCeremonyDraw,
    activeRound,
    tickets,
    revealedMainCount,
    revealGolden,
    tonUsdRate,
  ]);

  // Orchestrate Stage 1 (2.5s Mixing) -> Stage 2 (0.8s Sequential Ball Drop) -> Stage 3 (Grand Finale)
  useEffect(() => {
    if (!activeCeremonyDraw) return;

    const totalMain = Array.isArray(activeCeremonyDraw.drawnMain)
      ? activeCeremonyDraw.drawnMain.length
      : 5;
    const hasGolden = (activeCeremonyDraw.drawnGolden ?? 8) > 0;

    setStage('MIXING');
    setRevealedMainCount(0);
    setRevealGolden(false);
    setPowerBallShockwave(false);

    HapticEngine.impactOccurred('medium');

    // Drumroll pulses during Stage 1 (2.5 seconds)
    let pulseStep = 0;
    const drumTimer = setInterval(() => {
      pulseStep += 1;
      soundRef.current.playDrumrollPulse(Math.min(1, pulseStep / 12));
      if (pulseStep % 4 === 0) {
        HapticEngine.impactOccurred('light');
      }
    }, 180);

    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // Transition to Stage 2 at 2500ms
    const stage2Timer = setTimeout(() => {
      clearInterval(drumTimer);
      setStage('DROPPING');
      HapticEngine.impactOccurred('medium');

      for (let i = 1; i <= totalMain; i++) {
        const ballTimer = setTimeout(() => {
          setRevealedMainCount(i);
          soundRef.current.playBallDropChime(i - 1, false);
          HapticEngine.selectionChanged();
        }, (i - 1) * 800);
        timers.push(ballTimer);
      }

      if (hasGolden) {
        const goldenDelay = totalMain * 800;
        const goldenTimer = setTimeout(() => {
          setRevealGolden(true);
          setPowerBallShockwave(true);
          soundRef.current.playBallDropChime(totalMain, true);
          HapticEngine.impactOccurred('heavy');
        }, goldenDelay);
        timers.push(goldenTimer);
      }

      const finaleDelay = (totalMain + (hasGolden ? 1 : 0)) * 800 + 650;
      const finaleTimer = setTimeout(() => {
        setStage('FINALE');
        HapticEngine.notificationOccurred('success');
        soundRef.current.playWinnerFanfare();
      }, finaleDelay);
      timers.push(finaleTimer);
    }, 2500);

    timers.push(stage2Timer);

    return () => {
      clearInterval(drumTimer);
      timers.forEach(clearTimeout);
    };
  }, [activeCeremonyDraw?.drawId, replayNonce]);

  // 3D-Styled Pneumatic Glass Chamber Swirling Golden Balls Canvas (Stage 1 & Stage 2)
  useEffect(() => {
    if (!activeCeremonyDraw || stage === 'FINALE') return;
    const canvas = chamberCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 240);
    const height = (canvas.height = 170);
    const cx = width / 2;
    const cy = height / 2;
    const domeRadius = 74;

    const balls = Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2;
      const dist = 14 + (i % 4) * 14;
      return {
        num: ((i * 7 + 3) % 50) + 1,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.cos(angle + 1.2) * (stage === 'MIXING' ? 5.2 : 3.1)) + (i % 2 ? 1.5 : -1.5),
        vy: (Math.sin(angle + 1.2) * (stage === 'MIXING' ? 5.2 : 3.1)) - 1.8,
        r: i % 5 === 0 ? 11.5 : 9.5,
        isCyan: i % 5 === 0,
      };
    });

    let rafId = 0;
    const renderChamber = () => {
      ctx.clearRect(0, 0, width, height);

      // Outer ambient golden aura
      const aura = ctx.createRadialGradient(cx, cy, 12, cx, cy, domeRadius + 14);
      aura.addColorStop(0, 'rgba(255, 224, 102, 0.16)');
      aura.addColorStop(0.65, 'rgba(0, 245, 212, 0.08)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, domeRadius + 14, 0, Math.PI * 2);
      ctx.fill();

      // Pneumatic Glass Sphere Clipping
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, domeRadius, 0, Math.PI * 2);
      ctx.clip();

      // Pneumatic air-jet updraft lines
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.14)';
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(cx + k * 20, cy + domeRadius);
        ctx.lineTo(cx + k * 10, cy - domeRadius);
        ctx.stroke();
      }

      // Update & draw swirling 3D spheres
      const speedMult = stage === 'MIXING' ? 1.15 : 0.75;
      for (const b of balls) {
        // Upward pneumatic jet + vortex swirl
        b.vy -= 0.12;
        b.x += b.vx * speedMult;
        b.y += b.vy * speedMult;

        const dx = b.x - cx;
        const dy = b.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist + b.r > domeRadius - 2) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.94 - ny * 0.65;
          b.vy = (b.vy - 2 * dot * ny) * 0.94 + nx * 0.65;
          b.x = cx + nx * (domeRadius - b.r - 2);
          b.y = cy + ny * (domeRadius - b.r - 2);
        }

        const grad = ctx.createRadialGradient(
          b.x - b.r * 0.35,
          b.y - b.r * 0.35,
          1,
          b.x,
          b.y,
          b.r
        );
        if (b.isCyan) {
          grad.addColorStop(0, '#E0FFFF');
          grad.addColorStop(0.45, '#00F5D4');
          grad.addColorStop(1, '#006080');
        } else {
          grad.addColorStop(0, '#FFFBEB');
          grad.addColorStop(0.4, '#FFE066');
          grad.addColorStop(0.85, '#D4AF37');
          grad.addColorStop(1, '#6B4C00');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#090614';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.num), b.x, b.y + 0.5);
      }

      ctx.restore();

      // Glass Dome Specular Rim & Reflection
      ctx.strokeStyle = 'rgba(255, 224, 102, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, domeRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, domeRadius - 5, Math.PI * 1.12, Math.PI * 1.62);
      ctx.stroke();

      rafId = requestAnimationFrame(renderChamber);
    };

    rafId = requestAnimationFrame(renderChamber);
    return () => cancelAnimationFrame(rafId);
  }, [activeCeremonyDraw?.drawId, stage, replayNonce]);

  // Multi-Layered Gold, Emerald & Cyan Confetti Explosion in Stage 3 (FINALE)
  useEffect(() => {
    if (!activeCeremonyDraw || stage !== 'FINALE') return;
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 420);
    const height = (canvas.height = 560);
    const palette = ['#FFE066', '#FFD700', '#00F59B', '#00F5D4', '#0098EA', '#FFFFFF'];

    const particles = Array.from({ length: 75 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height * 0.28 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 8 - 2,
      size: 4 + (i % 5),
      color: palette[i % palette.length],
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      alpha: 1,
    }));

    let rafId = 0;
    let frames = 0;
    const renderConfetti = () => {
      frames += 1;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.rot += p.vRot;
        if (frames > 95) {
          p.alpha = Math.max(0, p.alpha - 0.015);
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
      if (frames < 160) {
        rafId = requestAnimationFrame(renderConfetti);
      }
    };

    rafId = requestAnimationFrame(renderConfetti);
    return () => cancelAnimationFrame(rafId);
  }, [activeCeremonyDraw?.drawId, stage, replayNonce]);

  if (!activeCeremonyDraw || !ceremonyData) return null;

  const handleClose = () => {
    HapticEngine.selectionChanged();
    setActiveCeremonyDraw(null);
  };

  const handleReplay = () => {
    HapticEngine.impactOccurred('medium');
    setReplayNonce((n) => n + 1);
  };

  const handleSkipToFinale = () => {
    HapticEngine.selectionChanged();
    setRevealedMainCount(ceremonyData.drawnMain.length);
    setRevealGolden(ceremonyData.drawnGolden > 0);
    setStage('FINALE');
  };

  const handleJoinNextRound = () => {
    HapticEngine.impactOccurred('medium');
    setActiveCeremonyDraw(null);
    navigateTo('lobby');
  };

  return (
    <div
      data-testid="live-draw-ceremony-modal"
      data-stage={stage}
      className="fixed inset-0 z-50 bg-[#05030C]/92 backdrop-blur-xl flex items-center justify-center p-3 overflow-y-auto select-none animate-in fade-in duration-200"
    >
      {/* Foreground Confetti Canvas during Grand Finale */}
      {stage === 'FINALE' && (
        <canvas
          ref={confettiCanvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-50"
        />
      )}

      <div className="relative w-full max-w-[430px] rounded-3xl luckydrop-obsidian-glass luckydrop-specular-gold luckydrop-microgrid-watermark p-4 space-y-3.5 shadow-[0_0_70px_rgba(255,215,0,0.22)] border border-[#FFE066]/45 overflow-hidden">
        {/* Ambient radial spotlights */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#FFE066]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-56 h-40 bg-[#00F59B]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <LuckyDropLogo size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#FFE066] truncate">
                  {tr(
                    lang,
                    '🎬 مراسم زنده قرعه‌کشی و معرفی برندگان',
                    '🎬 Live Lottery Draw & Winner Reveal'
                  )}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-300 truncate" dir="ltr">
                {ceremonyData.roundCode} •{' '}
                {lang === 'FA'
                  ? ceremonyData.roundTitleFa
                  : localizeServerText(lang, ceremonyData.roundTitleFa || ceremonyData.roundTitleEn)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={tr(lang, 'قطع/وصل صدا', 'Toggle Sound')}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#00F5D4]" />}
            </button>
            <button
              type="button"
              data-testid="close-draw-ceremony-btn"
              onClick={handleClose}
              aria-label={tr(lang, 'بستن مراسم قرعه‌کشی', 'Close Ceremony')}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage Indicator Pill */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-[#0D091A]/90 border border-[#FFE066]/25">
          <div className="flex items-center gap-1.5 text-[11px] font-black">
            {stage === 'MIXING' && (
              <span className="text-[#FFE066]" data-testid="ceremony-stage-label">
                {tr(
                  lang,
                  '🌪️ مرحله ۱: چرخش گوی‌ها در محفظه پنوماتیک...',
                  '🌪️ Stage 1: Pneumatic Chamber Mixing...'
                )}
              </span>
            )}
            {stage === 'DROPPING' && (
              <span className="text-[#00F5D4]" data-testid="ceremony-stage-label">
                {tr(
                  lang,
                  `🎯 مرحله ۲: خروج گوی‌های برنده (${
                    revealedMainCount + (revealGolden ? 1 : 0)
                  } از ${
                    ceremonyData.drawnMain.length + (ceremonyData.drawnGolden > 0 ? 1 : 0)
                  })`,
                  `🎯 Stage 2: Sequential Ball Drop (${
                    revealedMainCount + (revealGolden ? 1 : 0)
                  }/${
                    ceremonyData.drawnMain.length + (ceremonyData.drawnGolden > 0 ? 1 : 0)
                  })`
                )}
              </span>
            )}
            {stage === 'FINALE' && (
              <span className="text-[#00f59b]" data-testid="ceremony-stage-label">
                {tr(
                  lang,
                  '🏆 مرحله ۳: نتیجه نهایی و تسویه آنی برندگان',
                  '🏆 Stage 3: Grand Finale & Instant Payouts'
                )}
              </span>
            )}
          </div>

          {stage !== 'FINALE' ? (
            <button
              type="button"
              data-testid="ceremony-skip-finale-btn"
              onClick={handleSkipToFinale}
              className="text-[10px] font-bold text-[#FFE066] hover:underline cursor-pointer shrink-0"
            >
              {tr(lang, 'نمایش فوری نتیجه ⏭', 'Skip to Result ⏭')}
            </button>
          ) : (
            <button
              type="button"
              data-testid="ceremony-replay-btn"
              onClick={handleReplay}
              className="flex items-center gap-1 text-[10px] font-bold text-[#00F5D4] hover:underline cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{tr(lang, 'پخش مجدد', 'Replay')}</span>
            </button>
          )}
        </div>

        {/* STAGE 1 & 2: PNEUMATIC CHAMBER MIXING + SEQUENTIAL BALL DROP RACK */}
        {stage !== 'FINALE' && (
          <div className="relative z-10 flex flex-col items-center justify-center py-2">
            <canvas
              ref={chamberCanvasRef}
              data-testid="pneumatic-chamber-canvas"
              className="w-[240px] h-[170px] mx-auto"
            />
            <div className="text-[10px] font-mono text-slate-400 mt-1 text-center">
              {stage === 'MIXING'
                ? tr(
                    lang,
                    'در حال استخراج آنتروپی رمزنگاری‌شده SHA-256 و ترکیب گوی‌های طلایی...',
                    'Mixing golden spheres with verifiable SHA-256 cryptographic entropy...'
                  )
                : tr(
                    lang,
                    'گوی‌های برنده یک‌به‌یک خارج شده و با بلیت‌های شما تطبیق داده می‌شوند!',
                    'Winning balls drop every 0.8s with live neon-emerald ticket matching!'
                  )}
            </div>
          </div>
        )}

        {/* SEQUENTIAL WINNING BALLS RACK (VISIBLE IN ALL STAGES) */}
        <div
          data-testid="ceremony-winning-balls-rack"
          className="relative z-10 rounded-2xl bg-[#0B0718]/95 border border-[#FFE066]/35 p-3 space-y-2 shadow-inner"
        >
          <div className="flex items-center justify-between text-[10px] text-slate-300">
            <span className="font-bold">
              {tr(lang, 'گوی‌های برنده دور:', 'Official Winning Balls:')}
            </span>
            <span className="font-mono text-[#FFE066]">{ceremonyData.roundCode}</span>
          </div>

          <div className="flex items-center justify-center gap-2 py-1" dir="ltr">
            {ceremonyData.drawnMain.map((num, idx) => {
              const isRevealed = stage === 'FINALE' || idx < revealedMainCount;
              return (
                <div
                  key={idx}
                  data-testid={`ceremony-ball-slot-${idx}`}
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-mono text-sm font-black transition-all duration-300 ${
                    isRevealed
                      ? 'bg-gradient-to-br from-[#FFF9DB] via-[#FFE066] to-[#B8860B] text-slate-950 scale-100 ring-2 ring-[#FFE066] shadow-[0_0_20px_rgba(255,215,0,0.65)]'
                      : 'bg-white/5 border border-dashed border-white/20 text-slate-600 scale-90'
                  }`}
                >
                  {isRevealed ? String(num).padStart(2, '0') : '?'}
                </div>
              );
            })}

            {ceremonyData.drawnGolden > 0 && (
              <div className="relative flex items-center justify-center">
                {(revealGolden || stage === 'FINALE') && powerBallShockwave && (
                  <span
                    data-testid="powerball-shockwave"
                    className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#00f59b] to-[#FFE066] opacity-55 animate-ping pointer-events-none"
                  />
                )}
                <div
                  data-testid="ceremony-golden-powerball"
                  className={`relative z-10 w-12 h-12 rounded-full flex flex-col items-center justify-center font-mono transition-all duration-300 ${
                    revealGolden || stage === 'FINALE'
                      ? 'bg-gradient-to-br from-[#00f59b] via-[#FFE066] to-[#D4AF37] text-slate-950 scale-105 ring-2 ring-[#00f59b] shadow-[0_0_28px_rgba(0,245,155,0.85)]'
                      : 'bg-purple-950/40 border border-dashed border-purple-400/30 text-purple-400/50 scale-90'
                  }`}
                >
                  <span className="text-[8px] font-black leading-none">POWER</span>
                  <span className="text-xs font-black leading-tight">
                    {revealGolden || stage === 'FINALE'
                      ? `★${ceremonyData.drawnGolden}`
                      : '★?'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LIVE USER TICKET MATCHING SECTION (HIGHLIGHTS MATCHING NUMBERS IN NEON EMERALD #00f59b) */}
        {ceremonyData.userRoundTickets.length > 0 && (
          <div
            data-testid="ceremony-live-user-tickets"
            className="relative z-10 rounded-2xl bg-[#100B22]/95 border border-[#00f59b]/35 p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-black text-white flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-[#00f59b]" />
                {tr(
                  lang,
                  `تطبیق زنده بلیت‌های شما (${ceremonyData.userRoundTickets.length})`,
                  `Your Live Tickets (${ceremonyData.userRoundTickets.length})`
                )}
              </span>
              <span className="text-[10px] font-mono text-[#00f59b]">
                {tr(lang, 'تطابق = سبز نئونی', 'Match = Neon Emerald')}
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ceremonyData.userRoundTickets.map((t) => (
                <div
                  key={t.ticketCode}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/10"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-black text-[#FFE066] truncate">
                      {t.ticketCode}
                    </div>
                    <div className="text-[9px] font-bold text-[#00f59b]">
                      {t.totalMatchedCount > 0
                        ? tr(
                            lang,
                            `✨ ${t.totalMatchedCount} شماره منطبق شد!`,
                            `✨ ${t.totalMatchedCount} Ball(s) Matched!`
                          )
                        : tr(lang, 'در انتظار تطابق...', 'Checking numbers...')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1" dir="ltr">
                    {t.mainNumbers.map((num, idx) => {
                      const isMatched = t.matchedMainNumbers.includes(num);
                      return (
                        <span
                          key={idx}
                          data-matched={isMatched ? 'true' : 'false'}
                          className={`w-6 h-6 rounded-lg font-mono text-[10px] font-black flex items-center justify-center transition-all duration-300 ${
                            isMatched
                              ? 'bg-[#00f59b] text-slate-950 ring-2 ring-[#00f59b] shadow-[0_0_12px_#00f59b] scale-110'
                              : 'bg-white/10 text-slate-300 border border-white/10'
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                    {t.goldenBall > 0 && (
                      <span
                        data-matched={t.matchedGoldenBall ? 'true' : 'false'}
                        className={`w-6 h-6 rounded-lg font-mono text-[10px] font-black flex items-center justify-center transition-all duration-300 ${
                          t.matchedGoldenBall
                            ? 'bg-[#00f59b] text-slate-950 ring-2 ring-[#FFE066] shadow-[0_0_14px_#00f59b] scale-110'
                            : 'bg-[#FFE066]/20 text-[#FFE066] border border-[#FFE066]/40'
                        }`}
                      >
                        ★{t.goldenBall}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: GRAND FINALE — HOLOGRAPHIC WINNER BANNER + OFFICIAL DRAW SUMMARY CARD */}
        {stage === 'FINALE' && (
          <div className="relative z-10 space-y-3 animate-in fade-in zoom-in-95 duration-300">
            {/* Holographic Winner Banner (When user won any prize in the draw) */}
            {ceremonyData.userHasWinningTicket ? (
              <div
                data-testid="ceremony-holographic-winner-banner"
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#063B28] via-[#0B5239] to-[#2C2108] border-2 border-[#00f59b] luckydrop-holographic-shimmer text-center shadow-[0_0_30px_rgba(0,245,155,0.35)]"
              >
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00f59b]/20 text-[#00f59b] text-[10px] font-black mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{tr(lang, 'واریز آنی به کیف پول انجام شد', 'INSTANT WALLET PAYOUT CREDITED')}</span>
                </div>
                <div className="text-sm font-black text-white">
                  {tr(
                    lang,
                    `🎉 تبریک! شما برنده +${ceremonyData.userWonTotalTon.toFixed(2)} TON شدید!`,
                    `🎉 Congratulations! You Won +${ceremonyData.userWonTotalTon.toFixed(2)} TON!`
                  )}
                </div>
              </div>
            ) : (
              <div
                data-testid="ceremony-pool-celebration-banner"
                className="p-3 rounded-2xl bg-gradient-to-r from-[#1A1230] via-[#130D26] to-[#1E1510] border border-[#FFE066]/40 luckydrop-holographic-shimmer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#FFE066]/15 border border-[#FFE066]/40 flex items-center justify-center text-[#FFE066] shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      {tr(
                        lang,
                        '🎉 قرعه‌کشی با موفقیت انجام و جوایز واریز شد!',
                        '🎉 Official Draw Completed & Prizes Distributed!'
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300">
                      {tr(
                        lang,
                        'جوایز برندگان به صورت ۱۰۰٪ خودکار به کیف پول واریز گردید.',
                        'All winning slips were automatically settled to player wallets.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Official Draw Summary Card */}
            <div
              data-testid="ceremony-draw-summary-card"
              className="rounded-2xl bg-[#0D091C]/95 border border-white/15 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-black text-[#FFE066] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00f59b]" />
                  {tr(lang, 'گزارش رسمی قرعه‌کشی', 'Official Draw Summary')}
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  {ceremonyData.roundCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[10px] text-slate-400">
                    {tr(lang, 'تعداد کل برندگان دور:', 'Total Winners Count:')}
                  </div>
                  <div className="text-sm font-black font-mono text-[#00f59b] mt-0.5">
                    {ceremonyData.winnersCount}{' '}
                    <span className="text-[10px] font-sans text-slate-300">
                      {tr(lang, 'نفر', 'Winners')}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[10px] text-slate-400">
                    {tr(lang, 'مجموع جوایز توزیع‌شده:', 'Total Prize Distributed:')}
                  </div>
                  <div
                    className="text-sm font-black font-mono text-[#FFE066] mt-0.5 truncate"
                    dir="ltr"
                  >
                    {formatActiveTmaAmount(ceremonyData.totalPayoutUsdt)}
                  </div>
                </div>
              </div>

              {/* Provably Fair Hash Verification Badge */}
              <div className="p-2.5 rounded-xl bg-[#070510] border border-[#00F5D4]/30 flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#00F5D4] shrink-0" />
                  <span className="font-mono text-slate-300 truncate" dir="ltr">
                    SHA-256: {ceremonyData.provablyFairHash.slice(0, 24)}...
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#00F5D4]/15 text-[#00F5D4] font-mono text-[9px] font-bold shrink-0">
                  VERIFIED
                </span>
              </div>

              {/* CTA Button: Join Next Round */}
              <button
                type="button"
                data-testid="ceremony-join-next-round-btn"
                onClick={handleJoinNextRound}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FFE066] via-[#FFD700] to-[#B8860B] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_6px_25px_rgba(255,215,0,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Rocket className="w-4 h-4" />
                <span>
                  {tr(
                    lang,
                    '🚀 شرکت در دور جدید / Join Next Round',
                    '🚀 Join Next Round'
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
