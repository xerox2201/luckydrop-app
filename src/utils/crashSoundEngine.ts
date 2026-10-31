/**
 * PROCEDURAL WEB AUDIO TURBINE & SYNTH ENGINE FOR STAKE-STYLE CRASH
 * -----------------------------------------------------------------
 * Zero external MP3 dependencies. Uses browser AudioContext to synthesize:
 * - startFlightSound() / updateFlightPitch(multiplier) / stopFlightSound():
 *   Continuous low-pass filtered oscillator + filtered noise thruster hum whose
 *   pitch frequency (120Hz -> 880Hz) and harmonic tension modulate upward with M(t).
 * - playTick(): Subtle countdown beep during the 5.0s betting window.
 * - playCashout(): Crisp, gratifying emerald coin/synth chord (C5 -> E5 -> G5 -> C6).
 * - playCrashExplosion(): Deep sub-bass drop + white-noise burst with exponential decay.
 */

export class CrashSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  // Continuous flight thruster nodes
  private flightOscMain: OscillatorNode | null = null;
  private flightOscHarmonic: OscillatorNode | null = null;
  private flightNoiseNode: AudioBufferSourceNode | null = null;
  private flightFilter: BiquadFilterNode | null = null;
  private flightMasterGain: GainNode | null = null;
  private isFlying: boolean = false;

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
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    if (mute) {
      this.stopFlightSound();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted());
    return this.muted;
  }

  /**
   * Starts the continuous low-pass filtered turbine oscillator + noise thruster hum.
   */
  public startFlightSound(): void {
    this.stopFlightSound();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.085, now + 0.18);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(340, now);
      lowpass.Q.setValueAtTime(2.4, now);

      const oscMain = ctx.createOscillator();
      oscMain.type = 'sawtooth';
      oscMain.frequency.setValueAtTime(120, now);

      const oscHarmonic = ctx.createOscillator();
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(180, now);

      // Subtle pink/white noise loop for jet turbine air rush
      const bufferSize = ctx.sampleRate * 1.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.22;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      oscMain.connect(lowpass);
      oscHarmonic.connect(lowpass);
      noiseSource.connect(lowpass);
      lowpass.connect(masterGain);
      masterGain.connect(ctx.destination);

      oscMain.start(now);
      oscHarmonic.start(now);
      noiseSource.start(now);

      this.flightOscMain = oscMain;
      this.flightOscHarmonic = oscHarmonic;
      this.flightNoiseNode = noiseSource;
      this.flightFilter = lowpass;
      this.flightMasterGain = masterGain;
      this.isFlying = true;
    } catch {
      // Ignore autoplay errors
    }
  }

  /**
   * Smoothly modulates turbine pitch frequency (120Hz up to 880Hz) and filter cutoff in real time with M(t).
   */
  public updateFlightPitch(multiplier: number): void {
    if (!this.isFlying || this.muted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Logarithmic mapping from 1.00x -> 100.00x into [0, 1]
      const norm = Math.max(0, Math.min(1, Math.log10(Math.max(1, multiplier)) / 2));
      const baseFreq = 120 + norm * 760; // 120Hz -> 880Hz
      const cutoffFreq = 340 + norm * 2400;

      this.flightOscMain?.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.flightOscHarmonic?.frequency.setTargetAtTime(baseFreq * 1.498, now, 0.05); // Fifth harmonic tension
      this.flightFilter?.frequency.setTargetAtTime(cutoffFreq, now, 0.05);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Stops the continuous turbine flight sound.
   */
  public stopFlightSound(): void {
    this.isFlying = false;
    try {
      if (this.flightMasterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.flightMasterGain.gain.setTargetAtTime(0.0001, now, 0.02);
      }
      this.flightOscMain?.stop();
      this.flightOscHarmonic?.stop();
      this.flightNoiseNode?.stop();
    } catch {
      // Ignore already stopped nodes
    }
    this.flightOscMain = null;
    this.flightOscHarmonic = null;
    this.flightNoiseNode = null;
    this.flightFilter = null;
    this.flightMasterGain = null;
  }

  /**
   * Subtle countdown beep during the 5-second betting window.
   */
  public playTick(urgent = false): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(urgent ? 880 : 660, now);
      osc.frequency.exponentialRampToValueAtTime(urgent ? 440 : 520, now + 0.055);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Crisp, gratifying emerald coin/synth chord (C5 -> E5 -> G5 -> C6) on player cashout.
   */
  public playCashout(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(freq * 2, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.34);

        osc.connect(gain);
        harmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.36);
        harmonic.start(start);
        harmonic.stop(start + 0.36);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Deep sub-bass drop + white-noise burst with exponential decay when the rocket explodes.
   */
  public playCrashExplosion(): void {
    this.stopFlightSound();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Sub-bass impact drop (135Hz -> 28Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(135, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.48);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.26, now + 0.012);
      subGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.54);

      // 2. Filtered White-Noise Explosion Burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.45);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(620, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.42);
      filter.Q.setValueAtTime(1.1, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.45);
    } catch {
      // Ignore audio errors
    }
  }
}

export const crashSoundEngine = new CrashSoundEngine(false);
