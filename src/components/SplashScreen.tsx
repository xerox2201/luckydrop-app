import React from 'react';
import { LuckyDropLogo } from './LuckyDropLogo';
import { RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { detectInitialLanguage, tr } from '../utils/i18n';

export interface SplashHandshakeState {
  progress: 25 | 60 | 100;
  stepTitleFa: string;
  stepSubtitleEn: string;
  errorStatus: string | null;
  ready: boolean;
}

interface SplashScreenProps {
  state: SplashHandshakeState;
  onRetry: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ state, onRetry }) => {
  const { progress, stepTitleFa, stepSubtitleEn, errorStatus } = state;
  const lang = detectInitialLanguage();

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between px-6 py-10 overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 28%, rgba(0, 152, 234, 0.22) 0%, rgba(124, 58, 237, 0.14) 38%, #070510 78%)',
        backgroundColor: '#070510',
      }}
    >
      {/* Ambient 3D Luxury Glow Orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-[#0098EA]/20 blur-[110px]" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-[#FFD700]/15 blur-[95px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[340px] h-[240px] rounded-full bg-[#00F5D4]/12 blur-[100px]" />

      {/* Top Protocol Badge */}
      <div className="relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
        <span
          className={`w-2 h-2 rounded-full ${
            errorStatus ? 'bg-rose-500' : 'bg-[#00F5D4] animate-pulse'
          }`}
        />
        <span className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase">
          TON Web3 • Provably Fair iLottery
        </span>
      </div>

      {/* Center 3D Brand Emblem + Title */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs w-full my-auto">
        <div className="relative mb-7 flex items-center justify-center">
          {/* Outer Rotating Ring */}
          <div
            className="w-44 h-44 rounded-full border border-[#FFD700]/25 flex items-center justify-center"
            style={{ animation: 'spin 16s linear infinite' }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFE066] shadow-[0_0_12px_#FFD700] -mt-44" />
          </div>

          {/* Inner Counter-Rotating Cyan Ring */}
          <div
            className="absolute w-36 h-36 rounded-full border border-dashed border-[#00F5D4]/35"
            style={{ animation: 'spin 10s linear infinite reverse' }}
          />

          {/* Core 3D Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <LuckyDropLogo size={112} animated />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white mb-1.5">
          Lucky<span className="text-[#FFE066]">Drop</span>{' '}
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0098EA]/25 text-[#38BDF8] border border-[#0098EA]/40 align-middle">
            TON
          </span>
        </h1>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">
          {tr(
            lang,
            'قرعه‌کشی آن‌چین و بازی‌های آنی تلگرام با اثبات ریاضی ۵۲ بیتی',
            'On-Chain Telegram iLottery & 52-Bit Provably Fair Instant Games'
          )}
        </p>

        {/* Feature Pills */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#FFD700]/10 text-[#FFE066] border border-[#FFD700]/25">
            💎 TON Connect 2.0
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#00F5D4]/10 text-[#00F5D4] border border-[#00F5D4]/25">
            ⭐ Telegram Stars
          </span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/25">
            🎲 HMAC-SHA256
          </span>
        </div>
      </div>

      {/* Bottom Real Handshake Progress Bar & Error / Retry Box */}
      <div className="relative z-10 w-full max-w-xs space-y-3">
        {errorStatus ? (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 backdrop-blur-md space-y-2.5 text-right">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                {tr(
                  lang,
                  'خطا در اتصال اولیه به سرور (Handshake Failed)',
                  'Server Handshake Failed'
                )}
              </span>
            </div>
            <div
              className="text-[10px] font-mono text-rose-200/90 bg-black/40 p-2 rounded-xl border border-rose-500/20 break-all"
              dir="ltr"
            >
              {errorStatus}
            </div>
            <button
              onClick={onRetry}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {tr(lang, 'تلاش مجدد اتصال (Retry Handshake)', 'Retry Handshake')}
              </span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold px-1">
              <span className="text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00F5D4]" />
                {tr(lang, stepTitleFa, stepSubtitleEn)}
              </span>
              <span className="font-mono text-[#00F5D4] tabular-nums" dir="ltr">
                {progress}%
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    'linear-gradient(90deg, #0098EA 0%, #00F5D4 52%, #FFE066 100%)',
                  boxShadow: '0 0 16px rgba(0, 245, 212, 0.55)',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>{stepSubtitleEn}</span>
              <span>v3.5 Production TMA</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
