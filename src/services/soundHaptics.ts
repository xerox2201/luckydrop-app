import { useEffect, useState, useCallback } from 'react';
import { diceSoundEngine } from '../utils/diceSoundEngine.ts';
import { plinkoSoundEngine } from '../utils/plinkoSoundEngine.ts';
import { crashSoundEngine } from '../utils/crashSoundEngine.ts';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotificationType = 'success' | 'warning' | 'error';

const MUTE_STORAGE_KEY = 'luckydrop_audio_muted';
const MUTE_CHANGE_EVENT = 'luckydrop-audio-mute-changed';

interface TelegramHapticFeedbackBridge {
  impactOccurred?: (style: HapticImpactStyle) => void;
  notificationOccurred?: (type: HapticNotificationType) => void;
  selectionChanged?: () => void;
}

function getTelegramHapticBridge(): TelegramHapticFeedbackBridge | null {
  if (typeof window === 'undefined') return null;
  const tg = (
    window as unknown as {
      Telegram?: {
        WebApp?: {
          HapticFeedback?: TelegramHapticFeedbackBridge;
        };
      };
    }
  ).Telegram;
  return tg?.WebApp?.HapticFeedback || null;
}

/**
 * Unified Zero-Asset Web Audio Synthesizer & Telegram WebApp Haptic Feedback Service
 * Synchronizes global mute state across Dice, Mines, Plinko, and Crash.
 */
export class SoundHapticsService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();
  private lastTickMs: number = 0;

  constructor(initialMuted = false) {
    this.muted = this.readStoredMute(initialMuted);
    if (typeof window !== 'undefined') {
      window.addEventListener(MUTE_CHANGE_EVENT, ((e: CustomEvent<{ muted: boolean }>) => {
        if (typeof e.detail?.muted === 'boolean') {
          this.muted = e.detail.muted;
          this.notifyListeners();
        }
      }) as EventListener);
    }
  }

  private readStoredMute(fallback = false): boolean {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(MUTE_STORAGE_KEY);
      if (raw !== null) return raw === 'true';
    } catch {
      // ignore storage errors
    }
    return fallback;
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.isMuted()) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.muted);
      } catch {
        // ignore listener errors
      }
    }
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isMuted(): boolean {
    this.muted = this.readStoredMute(this.muted);
    return this.muted;
  }

  public setMuted(mute: boolean): boolean {
    this.muted = Boolean(mute);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted));
      } catch {
        // ignore storage errors
      }
    }

    // Keep legacy per-game sound engines synchronized
    diceSoundEngine.setMuted(this.muted);
    plinkoSoundEngine.setMuted(this.muted);
    crashSoundEngine.setMuted(this.muted);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent(MUTE_CHANGE_EVENT, { detail: { muted: this.muted } })
        );
      } catch {
        this.notifyListeners();
      }
    } else {
      this.notifyListeners();
    }

    return this.muted;
  }

  public toggleMute(): boolean {
    const next = !this.isMuted();
    this.setMuted(next);
    if (!next) {
      this.playClick('light');
    } else {
      this.selectionChanged();
    }
    return next;
  }

  // ===========================================================================
  // 1. TELEGRAM WEB APP HAPTIC FEEDBACK
  // ===========================================================================

  public impactOccurred(style: HapticImpactStyle = 'light'): void {
    try {
      const bridge = getTelegramHapticBridge();
      if (bridge?.impactOccurred) {
        bridge.impactOccurred(style);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        const ms =
          style === 'heavy' || style === 'rigid' ? 24 : style === 'medium' ? 14 : 7;
        navigator.vibrate(ms);
      }
    } catch {
      // ignore haptic errors in unsupported environments
    }
  }

  public notificationOccurred(type: HapticNotificationType): void {
    try {
      const bridge = getTelegramHapticBridge();
      if (bridge?.notificationOccurred) {
        bridge.notificationOccurred(type);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'success') navigator.vibrate([12, 35, 22]);
        else if (type === 'warning') navigator.vibrate([18, 40, 18]);
        else navigator.vibrate([32, 45, 38]);
      }
    } catch {
      // ignore haptic errors
    }
  }

  public selectionChanged(): void {
    try {
      const bridge = getTelegramHapticBridge();
      if (bridge?.selectionChanged) {
        bridge.selectionChanged();
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(5);
      }
    } catch {
      // ignore haptic errors
    }
  }

  // ===========================================================================
  // 2. ZERO-ASSET WEB AUDIO SYNTHESIZER
  // ===========================================================================

  /**
   * Crisp tactile casino UI click + light haptic feedback.
   */
  public playClick(hapticStyle: HapticImpactStyle | null = 'light'): void {
    if (hapticStyle) {
      this.impactOccurred(hapticStyle);
    }
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.025);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // ignore audio restrictions
    }
  }

  /**
   * Tactile obsidian tile tap for Mines vault grid.
   */
  public playTileTap(): void {
    this.impactOccurred('light');
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.038);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // ignore
    }
  }

  /**
   * Ascending crystalline emerald harmonic chime when a safe gem is revealed in Mines.
   */
  public playGemReveal(stepIndex: number, totalSafeSteps = 22): void {
    this.impactOccurred(stepIndex >= 5 ? 'medium' : 'light');
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const progress = Math.max(0, Math.min(1, stepIndex / Math.max(1, totalSafeSteps)));
      // Harmonic pentatonic ascent from 523.25Hz (C5) up to 1567.98Hz (G6)
      const baseFreq = 523.25 * Math.pow(2, progress * 1.58);

      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.032;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.012, start + 0.18);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.13 : 0.075, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.21);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Obsidian-ruby sub-bass shockwave + filtered detonation burst when a mine is hit.
   */
  public playMineExplosion(): void {
    this.notificationOccurred('error');
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Sub-bass impact drop (130Hz -> 32Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.38);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.22, now + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.44);

      // Filtered noise shockwave
      const bufferSize = Math.floor(ctx.sampleRate * 0.34);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.32);
      filter.Q.setValueAtTime(1.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.33);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.34);
    } catch {
      // ignore
    }
  }

  /**
   * Arpeggiated gold/emerald luxury casino win fanfare + success haptic notification.
   */
  public playWinChime(multiplier = 2.0, isBigWin = false): void {
    this.notificationOccurred('success');
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes =
        isBigWin || multiplier >= 5
          ? [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51]
          : [523.25, 659.25, 783.99, 1046.5];

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.044;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.14, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.34);

        osc.connect(gain);
        overtone.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.36);
        overtone.start(start);
        overtone.stop(start + 0.36);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Pneumatic golden energy orb drop for Plinko.
   */
  public playCoinDrop(): void {
    this.impactOccurred('medium');
    plinkoSoundEngine.playDrop();
  }

  /**
   * Crystalline peg bounce for Plinko.
   */
  public playPlinkoBounce(rowIndex: number, totalRows: number): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTickMs > 45) {
      this.lastTickMs = nowMs;
      if (rowIndex >= totalRows - 2) {
        this.impactOccurred('light');
      }
    }
    plinkoSoundEngine.playPegHit(rowIndex, totalRows);
  }

  /**
   * Bucket landing for Plinko.
   */
  public playPlinkoBucket(multiplier: number, isBonusTicket = false): void {
    if (multiplier >= 2 || isBonusTicket) {
      this.notificationOccurred('success');
    } else {
      this.impactOccurred('light');
    }
    plinkoSoundEngine.playBucketLand(multiplier, isBonusTicket);
  }

  /**
   * 52-Bit Dice slider drag tick + selection haptic.
   */
  public playDiceSliderTick(winChance: number): void {
    const nowMs = performance.now();
    if (nowMs - this.lastTickMs > 36) {
      this.lastTickMs = nowMs;
      this.selectionChanged();
    }
    diceSoundEngine.playSliderTick(winChance);
  }

  /**
   * 52-Bit Dice roll launch whoosh + medium haptic.
   */
  public playDiceRoll(): void {
    this.impactOccurred('medium');
    diceSoundEngine.playRollSlide();
  }

  /**
   * 52-Bit Dice roll outcome sound + matching haptic.
   */
  public playDiceOutcome(won: boolean, multiplier = 2.0, isLucky7777 = false): void {
    if (won || isLucky7777) {
      this.notificationOccurred('success');
      diceSoundEngine.playWin(isLucky7777 ? 10 : multiplier);
    } else {
      this.impactOccurred('light');
      diceSoundEngine.playLoss();
    }
  }

  /**
   * Quantum Crash rocket launch + thruster hum.
   */
  public playRocketLaunch(): void {
    this.impactOccurred('medium');
    crashSoundEngine.startFlightSound();
  }

  /**
   * Quantum Crash thruster pitch modulation.
   */
  public updateRocketThruster(multiplier: number): void {
    crashSoundEngine.updateFlightPitch(multiplier);
  }

  /**
   * Quantum Crash cashout chord + success haptic.
   */
  public playCrashCashout(_isBigWin = false): void {
    this.notificationOccurred('success');
    crashSoundEngine.playCashout();
  }

  /**
   * Quantum Crash explosion + error haptic.
   */
  public playCrashExplosion(): void {
    this.notificationOccurred('error');
    crashSoundEngine.playCrashExplosion();
  }
}

export const soundHaptics = new SoundHapticsService();

/**
 * Reactive React Hook for reading & toggling global game audio mute state.
 */
export function useSoundHaptics() {
  const [isMuted, setIsMutedState] = useState<boolean>(() => soundHaptics.isMuted());

  useEffect(() => {
    setIsMutedState(soundHaptics.isMuted());
    return soundHaptics.subscribe((muted) => {
      setIsMutedState(muted);
    });
  }, []);

  const toggleMute = useCallback(() => {
    const next = soundHaptics.toggleMute();
    setIsMutedState(next);
    return next;
  }, []);

  const setMuted = useCallback((mute: boolean) => {
    const next = soundHaptics.setMuted(mute);
    setIsMutedState(next);
    return next;
  }, []);

  return {
    isMuted,
    toggleMute,
    setMuted,
    soundHaptics,
    haptics: soundHaptics,
  };
}
