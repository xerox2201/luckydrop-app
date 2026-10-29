import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { LuckyDropLogo } from './LuckyDropLogo.tsx';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export interface SplashHandshakeState {
  ready: boolean;
  progress: 25 | 60 | 100;
  stepTitleFa: string;
  stepSubtitleEn: string;
  errorStatus: string | null;
}

interface SplashScreenProps {
  state: SplashHandshakeState;
  onRetry: () => void;
  onClosePreview?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  state,
  onRetry,
  onClosePreview,
}) => {
  const steps = [
    {
      threshold: 25,
      titleFa: 'برقراری اتصال امن با حساب تلگرام',
      subtitleFa: 'تایید خودکار نشست امنیتی بازیکن',
    },
    {
      threshold: 60,
      titleFa: 'همگام‌سازی استخرهای قرعه‌کشی و کیف پول',
      subtitleFa: 'بارگذاری موجودی لحظه‌ای TON و Telegram Stars',
    },
    {
      threshold: 100,
      titleFa: 'آماده‌سازی تالار قرعه‌کشی زنده LuckyDrop',
      subtitleFa: 'اتصال به شبکه بلاکچین و کیف پول‌های غیرحضانتی',
    },
  ];

  return (
    <div
      data-testid="tma-splash-screen"
      className="fixed inset-0 z-[100] bg-[#070510] text-white flex flex-col items-center justify-center px-4 py-6 select-none overflow-hidden"
    >
      {/* Realistic 3D Obsidian & Gold Splash Background with Measured Contrast Scrim */}
      <img
        src={LUXURY_IMAGES.splashBg3d}
        alt="LuckyDrop 3D Luxury Vault Splash"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070510]/85 via-[#0d071c]/75 to-[#070510]/92 pointer-events-none" />

      {/* Volumetric Gold & Sapphire Ambient Light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/20 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-purple-600/20 blur-[95px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[395px] rounded-3xl bg-[#120b22]/90 border border-amber-400/35 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.88)] backdrop-blur-2xl flex flex-col items-center gap-4">
        {/* Top Security Status Text & Centered Official 3D LuckyDrop Emblem */}
        <div className="flex flex-col items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200/90"
            dir="rtl"
          >
            <ShieldCheck className="w-4 h-4 text-[#00f59b] shrink-0" />
            <span>اتصال امن به شبکه TON و Telegram Stars</span>
          </div>
          <LuckyDropLogo size={76} animated variant="3d" />
        </div>

        {/* Realistic 3D Lottery Chamber & Animated Golden Drop Showcase */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-amber-400/35 bg-[#090514] shadow-inner flex items-center justify-center">
          <img
            src={LUXURY_IMAGES.jackpotHero3d}
            alt="LuckyDrop 3D Lottery Chamber"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-90 scale-105 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090514]/90 via-transparent to-[#090514]/50 pointer-events-none" />

          {/* Animated Falling Golden Liquid Drop Effect */}
          <motion.div
            animate={{
              y: [-48, 8, 8],
              opacity: [0, 1, 0],
              scale: [0.75, 1.08, 1.35],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-5 rounded-full bg-gradient-to-b from-[#FFFBEB] via-[#FBBF24] to-[#D97706] shadow-[0_0_20px_rgba(251,191,36,0.9)] pointer-events-none"
          />

          {/* Ripple Ring inside the 3D Chamber */}
          <motion.div
            animate={{
              scale: [0.6, 1.65],
              opacity: [0.55, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="relative z-10 w-28 h-28 rounded-full border-2 border-amber-300/60 pointer-events-none"
          />

          {/* Floating 3D Numbered Gold Balls */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-3.5 left-3.5 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#92400E] border border-amber-200/70 shadow-lg flex items-center justify-center text-[11px] font-black text-slate-950 tabular-nums"
          >
            07
          </motion.div>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#92400E] border border-amber-200/70 shadow-lg flex items-center justify-center text-[11px] font-black text-slate-950 tabular-nums"
          >
            24
          </motion.div>
        </div>

        {/* Brand Title & Current Step */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#FFF3B0] via-[#FBBF24] to-[#38BDF8] bg-clip-text text-transparent">
            LuckyDrop
          </h1>
          <p className="text-xs font-bold text-amber-100/95" dir="rtl">
            پلتفرم رسمی لاتاری و بازی‌های Web3 تلگرام
          </p>
          <p className="text-[11px] font-medium text-purple-200/75 pt-0.5" dir="rtl">
            {state.stepTitleFa}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-1.5" dir="rtl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-200/85 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>پیشرفت بارگذاری</span>
            </span>
            <span
              data-testid="splash-progress-pct"
              className="text-[#00f59b] font-bold font-mono tabular-nums"
              dir="ltr"
            >
              {state.progress}%
            </span>
          </div>
          <div
            className="w-full h-2.5 rounded-full bg-[#070510] border border-amber-400/25 overflow-hidden p-0.5"
            dir="ltr"
          >
            <motion.div
              initial={{ width: '12%' }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                state.errorStatus
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-[#F59E0B] via-[#38BDF8] to-[#00f59b]'
              }`}
            />
          </div>
        </div>

        {/* Clean 3-Step Player Checklist */}
        <div className="w-full space-y-1.5" dir="rtl">
          {steps.map((step) => {
            const isCompleted = !state.errorStatus && state.progress >= step.threshold;
            const isCurrent =
              !state.errorStatus &&
              ((step.threshold === 25 && state.progress === 25) ||
                (step.threshold === 60 && state.progress === 60));
            return (
              <div
                key={step.threshold}
                className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2.5 text-right transition-colors ${
                  isCompleted
                    ? 'bg-[#090612]/90 border-[#00f59b]/35 text-white'
                    : isCurrent
                    ? 'bg-purple-950/40 border-amber-400/40 text-amber-100'
                    : 'bg-[#090612]/50 border-purple-500/15 text-purple-300/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{step.titleFa}</div>
                  <div className="text-[10px] text-purple-200/65 truncate">
                    {step.subtitleFa}
                  </div>
                </div>
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00f59b]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-mono text-purple-300/40 tabular-nums" dir="ltr">
                      {step.threshold}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Close Button when previewing Splash Screen */}
        {onClosePreview && (
          <button
            type="button"
            data-testid="close-splash-preview-btn"
            onClick={onClosePreview}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span>بازگشت به لابی LuckyDrop</span>
          </button>
        )}

        {/* Real Error State & Functional Retry Connection Button */}
        {state.errorStatus && (
          <div
            data-testid="splash-error-box"
            className="w-full rounded-2xl bg-rose-950/40 border border-rose-500/40 p-3.5 space-y-3 text-right"
            dir="rtl"
          >
            <div className="flex items-start gap-2 text-rose-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div>خطا در ارتباط با سرور و تایید نشست امنیتی:</div>
                <div
                  data-testid="splash-error-status"
                  className="text-[11px] font-mono text-rose-300/90 break-all"
                  dir="ltr"
                >
                  {state.errorStatus}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-testid="splash-retry-btn"
              onClick={onRetry}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#10b981] text-[#042416] font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تلاش مجدد اتصال</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
