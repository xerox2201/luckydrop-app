import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

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
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ state, onRetry }) => {
  const steps = [
    {
      threshold: 25,
      titleFa: '۱. راه‌اندازی هسته Telegram WebApp SDK',
      subtitleEn: 'Telegram.WebApp.ready() & expand() + initData extraction',
    },
    {
      threshold: 60,
      titleFa: '۲. احراز هویت سرور و همگام‌سازی دفترکل PAM',
      subtitleEn: 'GET /api/snapshot (X-Telegram-Init-Data) • Balances, Session & Admin Lock',
    },
    {
      threshold: 100,
      titleFa: '۳. اتصال پروتکل TON Connect 2.0 (Non-Custodial)',
      subtitleEn: 'TonConnectUIProvider session & manifest handshake',
    },
  ];

  return (
    <div
      data-testid="tma-splash-screen"
      className="fixed inset-0 z-[100] bg-[#070510] text-white flex flex-col items-center justify-center px-5 select-none"
    >
      <div className="w-full max-w-[390px] rounded-3xl bg-[#130d24]/95 border border-purple-500/25 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.75)] backdrop-blur-xl flex flex-col items-center gap-5">
        {/* Brand Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-500 p-[2px] shadow-[0_0_30px_rgba(147,51,234,0.45)]">
            <div className="w-full h-full rounded-2xl bg-[#090612] flex items-center justify-center text-2xl">
              💎
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00f59b] text-[#042416] flex items-center justify-center shadow-md">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-extrabold tracking-tight text-white">
            LuckyDrop VIP • TON &amp; Stars
          </h1>
          <p className="text-xs font-medium text-purple-200/75" dir="rtl">
            {state.stepTitleFa}
          </p>
          <p className="text-[11px] font-mono text-purple-300/60" dir="ltr">
            {state.stepSubtitleEn}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2" dir="ltr">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-200/80 font-semibold">HANDSHAKE PROGRESS</span>
            <span
              data-testid="splash-progress-pct"
              className="text-[#00f59b] font-bold tabular-nums"
            >
              {state.progress}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#070510] border border-purple-500/25 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: '10%' }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                state.errorStatus
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-purple-500 via-indigo-400 to-[#00f59b]'
              }`}
            />
          </div>
        </div>

        {/* Real 3-Step Checklist */}
        <div className="w-full space-y-2" dir="rtl">
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
                    ? 'bg-purple-950/40 border-purple-400/40 text-purple-100'
                    : 'bg-[#090612]/50 border-purple-500/15 text-purple-300/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{step.titleFa}</div>
                  <div className="text-[10px] font-mono text-purple-300/60 truncate" dir="ltr">
                    {step.subtitleEn}
                  </div>
                </div>
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00f59b]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-mono text-purple-300/40">
                      {step.threshold}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
              <span>Retry Connection • تلاش مجدد اتصال</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
