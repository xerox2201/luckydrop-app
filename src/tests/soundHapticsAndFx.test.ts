import test from 'node:test';
import assert from 'node:assert/strict';
import { soundHaptics } from '../services/soundHaptics.ts';
import { getMinesTileNormalizedCenter } from '../components/games/fx/MinesParticleFX.tsx';
import { GLOBAL_LANGUAGE_OPTIONS, tr } from '../utils/i18n.ts';

test('SoundHapticsService — global mute toggle & safe headless execution of Web Audio + Telegram Haptics', () => {
  const initialMuted = soundHaptics.isMuted();
  const toggled = soundHaptics.toggleMute();
  assert.equal(toggled, !initialMuted);
  assert.equal(soundHaptics.isMuted(), !initialMuted);

  soundHaptics.setMuted(true);
  assert.equal(soundHaptics.isMuted(), true);

  // Verify all audio & haptic triggers execute safely without throwing in headless / non-AudioContext env
  assert.doesNotThrow(() => {
    soundHaptics.impactOccurred('light');
    soundHaptics.impactOccurred('medium');
    soundHaptics.impactOccurred('heavy');
    soundHaptics.notificationOccurred('success');
    soundHaptics.notificationOccurred('warning');
    soundHaptics.notificationOccurred('error');
    soundHaptics.selectionChanged();

    soundHaptics.playClick();
    soundHaptics.playTileTap();
    soundHaptics.playGemReveal(3);
    soundHaptics.playMineExplosion();
    soundHaptics.playWinChime(5.5);
    soundHaptics.playCoinDrop();
    soundHaptics.playPlinkoBounce(6, 12);
    soundHaptics.playPlinkoBucket(10, true);
    soundHaptics.playDiceSliderTick(50);
    soundHaptics.playDiceRoll();
    soundHaptics.playDiceOutcome(true, 4.5, true);
    soundHaptics.playRocketLaunch();
    soundHaptics.updateRocketThruster(3.45);
    soundHaptics.playCrashCashout(true);
    soundHaptics.playCrashExplosion();
  });

  // Restore unmuted state and verify again
  soundHaptics.setMuted(false);
  assert.equal(soundHaptics.isMuted(), false);
  assert.doesNotThrow(() => {
    soundHaptics.playGemReveal(1);
    soundHaptics.playMineExplosion();
  });
});

test('getMinesTileNormalizedCenter — accurate normalized 5x5 grid coordinates', () => {
  // Top-left tile (index 0 -> col 0, row 0)
  const topLeft = getMinesTileNormalizedCenter(0);
  assert.equal(topLeft.nx, 0.1);
  assert.equal(topLeft.ny, 0.1);

  // Center tile (index 12 -> col 2, row 2)
  const center = getMinesTileNormalizedCenter(12);
  assert.equal(center.nx, 0.5);
  assert.equal(center.ny, 0.5);

  // Bottom-right tile (index 24 -> col 4, row 4)
  const bottomRight = getMinesTileNormalizedCenter(24);
  assert.equal(bottomRight.nx, 0.9);
  assert.equal(bottomRight.ny, 0.9);
});

test('5-language localization for Mini-Game Sound/Mute & FX status labels', () => {
  const testPairs: Array<[string, string]> = [
    ['صدا فعال', 'Sound On'],
    ['قطع صدا', 'Muted'],
    ['وصل صدا', 'Sound On'],
    ['جلوه‌های ویژه 60FPS', '60FPS FX Active'],
    ['در حال چرخش سه‌بعدی...', 'Rolling 3D...'],
    ['برداشت خودکار:', 'Auto Cashout:'],
    ['پرواز آنی', 'Now'],
  ];

  for (const [faText, enText] of testPairs) {
    for (const langSpec of GLOBAL_LANGUAGE_OPTIONS) {
      const translated = tr(langSpec.code, faText, enText);
      assert.ok(
        typeof translated === 'string' && translated.trim().length > 0,
        `Missing translation for "${enText}" in language "${langSpec.code}"`
      );
      if (langSpec.locale !== 'fa') {
        assert.notEqual(
          translated,
          faText,
          `Language "${langSpec.code}" should not fall back to raw Persian for "${enText}"`
        );
      }
    }
  }
});
