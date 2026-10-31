/**
 * Procedural Web Audio Synth Engine for Stake-Style 52-Bit Dice (DiceSoundEngine)
 * Built with Web Audio API (AudioContext) — zero external MP3 dependencies.
 */

export class DiceSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastTickTimeMs: number = 0;

  constructor(initialMuted = false) {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('luckydrop_audio_muted');
        this.muted = stored !== null ? stored === 'true' : initialMuted;
      } catch {
        this.muted = initialMuted;
      }
    } else {
      this.muted = initialMuted;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.isMuted()) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('luckydrop_audio_muted');
        if (stored !== null) {
          this.muted = stored === 'true';
        }
      } catch {
        // ignore
      }
    }
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('luckydrop_audio_muted', String(mute));
      } catch {
        // ignore
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted());
    return this.muted;
  }

  /**
   * 1. playSliderTick(winChance):
   * Ultra-crisp mechanical micro-click as the user drags the 3D slider handle,
   * with pitch shifting smoothly from low (200Hz at 98% chance) to high (900Hz at 1% chance).
   */
  public playSliderTick(winChance: number): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTickTimeMs < 24) return;
    this.lastTickTimeMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const clampedChance = Math.max(0.01, Math.min(98, winChance));
      // Normalized 0 at 98% chance -> 1 at 1% chance
      const t = (98 - clampedChance) / 97;
      const freq = 200 + t * 700; // 200Hz (at 98%) up to 900Hz (at 1%)

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.022);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.026);
    } catch {
      // Ignore audio context restrictions
    }
  }

  /**
   * 2. playRollSlide():
   * Fast, airy whoosh/synth sweep as the 3D hexagon marker glides to its destination over 280ms.
   */
  public playRollSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Ignore audio context restrictions
    }
  }

  /**
   * 3. playWin(multiplier):
   * Crisp emerald harmonic chime (scaling into a richer 4-note chord if multiplier >= 5x).
   */
  public playWin(multiplier: number = 2.0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes =
        multiplier >= 5.0
          ? [523.25, 659.25, 783.99, 1046.5] // C5 -> E5 -> G5 -> C6 rich chord
          : [587.33, 880.0]; // D5 -> A5 crisp chime

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        const startT = now + idx * 0.045;
        osc.frequency.setValueAtTime(freq, startT);

        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.linearRampToValueAtTime(0.11, startT + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, startT + 0.34);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startT);
        osc.stop(startT + 0.36);
      });
    } catch {
      // Ignore audio context restrictions
    }
  }

  /**
   * 4. playLoss():
   * Soft, muted low-frequency thud (110Hz) so rapid rolls never sound harsh or fatiguing.
   */
  public playLoss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio context restrictions
    }
  }
}

export const diceSoundEngine = new DiceSoundEngine();
