/**
 * PROCEDURAL WEB AUDIO SYNTHESIZER FOR STAKE-STYLE PLINKO
 * -------------------------------------------------------
 * Zero external MP3 dependencies. Uses browser AudioContext to synthesize:
 * - playDrop(): Soft pneumatic air-tube pop when a ball spawns
 * - playPegHit(rowIndex, totalRows): Crisp marimba/metallic crystalline ping whose pitch
 *   scales upward slightly as rowIndex increases, creating rising musical tension
 * - playBucketLand(multiplier, isBonusTicket):
 *   * < 1x: Low-thud absorption sound
 *   * 1x - 9x: Cheerful dual-chord chime
 *   * >= 10x or Lottery Ticket bonus: Explosive arpeggiated synth fanfare
 */

export class PlinkoSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastPegHitTime: number = 0;

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

  private getAudioContext(): AudioContext | null {
    if (this.isMuted()) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
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
   * Soft pneumatic pop when a ball spawns from the top chute.
   */
  public playDrop(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.068);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.072);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // Ignore audio errors when autoplay policy restricts context
    }
  }

  /**
   * Crisp marimba/metallic crystalline ping whose pitch (frequency) scales upward
   * slightly as rowIndex increases, creating rising musical tension as the ball nears the bottom.
   */
  public playPegHit(rowIndex: number, totalRows: number): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Throttle ultra-dense simultaneous multi-ball hits within 14ms to prevent clipping
      if (now - this.lastPegHitTime < 0.014) return;
      this.lastPegHitTime = now;

      const progress = Math.max(0, Math.min(1, rowIndex / Math.max(1, totalRows - 1)));
      // Pentatonic / harmonic pitch curve from ~440Hz (A4) up to ~987Hz (B5)
      const jitter = 1 + (Math.random() - 0.5) * 0.018;
      const baseFreq = 440 * Math.pow(2, progress * 1.16) * jitter;

      // Primary marimba body (sine/triangle blend)
      const oscMain = ctx.createOscillator();
      const gainMain = ctx.createGain();
      oscMain.type = 'triangle';
      oscMain.frequency.setValueAtTime(baseFreq, now);
      oscMain.frequency.exponentialRampToValueAtTime(baseFreq * 0.985, now + 0.085);

      gainMain.gain.setValueAtTime(0.001, now);
      gainMain.gain.linearRampToValueAtTime(0.12, now + 0.004);
      gainMain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);

      // Crystalline metallic harmonic overtone (2.756x marimba bar mode)
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(baseFreq * 2.756, now);

      gainHarmonic.gain.setValueAtTime(0.001, now);
      gainHarmonic.gain.linearRampToValueAtTime(0.045, now + 0.002);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0005, now + 0.042);

      oscMain.connect(gainMain);
      gainMain.connect(ctx.destination);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);

      oscMain.start(now);
      oscMain.stop(now + 0.095);
      oscHarmonic.start(now);
      oscHarmonic.stop(now + 0.048);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Bucket landing sound:
   * - < 1x: Low-thud absorption sound
   * - 1x - 9x: Cheerful dual-chord chime
   * - >= 10x or Lottery Ticket wins: Explosive arpeggiated synth fanfare
   */
  public playBucketLand(multiplier: number, isBonusTicket = false): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (multiplier >= 10 || isBonusTicket) {
        // Explosive arpeggiated synth fanfare (C5 - E5 - G5 - B5 - C6 - E6)
        const arpNotes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
        arpNotes.forEach((freq, idx) => {
          const start = now + idx * 0.052;
          const osc = ctx.createOscillator();
          const subOsc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, start);

          subOsc.type = 'triangle';
          subOsc.frequency.setValueAtTime(freq * 0.5, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.14, start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.36);

          osc.connect(gain);
          subOsc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.38);
          subOsc.start(start);
          subOsc.stop(start + 0.38);
        });
        return;
      }

      if (multiplier >= 1) {
        // Cheerful dual-chord chime for 1x - 9x
        const chord = multiplier >= 3 ? [587.33, 880.0, 1174.66] : [523.25, 659.25];
        chord.forEach((freq, idx) => {
          const start = now + idx * 0.035;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.004, start + 0.24);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.14, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.27);
        });
        return;
      }

      // < 1x: Low-thud damped absorption sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.13);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore audio errors
    }
  }
}

export const plinkoSoundEngine = new PlinkoSoundEngine(false);
