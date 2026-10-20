import React from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import { CurrencyLang, toPersianDigits } from '../utils/lotteryEngine.ts';

export const Navbar: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    lang,
    setLang,
    fxRates,
    formatAmount,
    balanceUsdt,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    setDepositModalOpen,
    setAiChatOpen,
    stealthCookieAuthorized,
    setStealthCookieAuthorized,
    killSwitchActive,
  } = useLottery();

  const navItems: { id: AppRoute; labelFa: string; labelEn: string; labelZh: string; icon: string; badge?: string }[] = [
    { id: 'lobby', labelFa: 'لابی', labelEn: 'Lobby', labelZh: '大厅', icon: 'casino' },
    { id: 'play', labelFa: 'خرید بلیت', labelEn: 'Play', labelZh: '购票', icon: 'confirmation_number' },
    { id: 'status', labelFa: 'رهگیری', labelEn: 'Tracker', labelZh: '追踪', icon: 'radar' },
    { id: 'transparency', labelFa: 'شفافیت', labelEn: 'Fairness', labelZh: '公平', icon: 'verified_user' },
    { id: 'terms', labelFa: 'قوانین و جوایز', labelEn: 'Rules & FAQ', labelZh: '规则与奖金', icon: 'gavel' },
    { id: 'cockpit', labelFa: 'کاکپیت', labelEn: 'Cockpit', labelZh: '控制台', icon: 'shield_lock', badge: 'OPS' },
    { id: 'finances', labelFa: 'خزانه', labelEn: 'Finances', labelZh: '金库', icon: 'account_balance', badge: '10%' },
    { id: 'launch', labelFa: 'لانچ و تلگرام', labelEn: 'Launch Ops', labelZh: '电报中心', icon: 'rocket_launch', badge: 'LIVE' },
  ];

  const getLabel = (item: typeof navItems[0]) => {
    if (lang === 'EN') return item.labelEn;
    if (lang === 'ZH') return item.labelZh;
    return item.labelFa;
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0a0e16]/90 backdrop-blur-2xl border-b border-amber-500/15 shadow-[0_10px_30px_rgba(0,0,0,0.65)]">
      {/* Top Crypto FX & Protocol Telemetry Strip */}
      <div className="bg-[#060911] border-b border-white/5 px-3 lg:px-6 py-1.5 text-[11px]">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {lang === 'FA' ? 'اوراکل نرخ لحظه‌ای:' : lang === 'ZH' ? '实时汇率预言机:' : 'LIVE FX ORACLE:'}
            </span>
            <span className="text-slate-400 font-mono shrink-0">
              USDT/IRT: <strong className="text-amber-400">{toPersianDigits(fxRates.TOMAN.toLocaleString('en-US'))} T</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400 font-mono shrink-0">
              BTC: <strong className="text-slate-200">${fxRates.BTC.toLocaleString('en-US')}</strong>
            </span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="hidden sm:inline text-slate-400 font-mono shrink-0">
              TON: <strong className="text-sky-400">${fxRates.TON}</strong>
            </span>
            <span className="hidden md:inline text-slate-700">|</span>
            <span className="hidden md:inline text-slate-400 font-mono shrink-0">
              TRX: <strong className="text-rose-400">${fxRates.TRX}</strong>
            </span>
            <span className="hidden lg:inline text-slate-700">|</span>
            <span className="hidden lg:inline text-slate-400 font-mono shrink-0">
              USDT/CNY: <strong className="text-emerald-300">¥{fxRates.CNY}</strong>
            </span>
          </div>

          {/* Security / Stealth Mode / Decoy Route Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {killSwitchActive && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 font-bold animate-pulse">
                🚨 KILL-SWITCH FROZEN
              </span>
            )}
            <button
              type="button"
              onClick={() => setAiChatOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold text-[11px] cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-xs">support_agent</span>
              <span>پشتیبانی VIP اختصاصی ۲۴/۷</span>
            </button>
            <button
              type="button"
              onClick={() => setStealthCookieAuthorized(!stealthCookieAuthorized)}
              data-testid="toggle-stealth-cookie"
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 ${
                stealthCookieAuthorized
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
              title="Toggle AES-256-GCM Encrypted Middleware Cookie (__Host_ld_ops_k82_vault)"
            >
              <span className="material-symbols-outlined text-xs">key</span>
              {stealthCookieAuthorized ? 'AES Cookie: ACTIVE' : 'AES Cookie: LOCKED'}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('admin_unauthorized')}
              data-testid="visit-decoy-admin"
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border border-white/10 transition-all"
              title="Test visiting /admin directly (Triggers Decoy 404)"
            >
              Test /admin (Decoy 404)
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-[1440px] mx-auto px-3 lg:px-5 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand Logo */}
        <div
          onClick={() => navigateTo('lobby')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl gold-gradient-cta flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.45)] group-hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-[#2a1700] text-lg sm:text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              toll
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-l from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                {lang === 'FA' ? 'زرین لاتاری' : lang === 'ZH' ? 'LuckyDrop 金运' : 'LuckyDrop VIP'}
              </span>
              <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                WEB3
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden 2xl:block">
              {lang === 'FA'
                ? 'پلتفرم قرعه‌کشی اثبات‌پذیر منصفانه (SHA-256)'
                : lang === 'ZH'
                ? '去中心化可证明公平加密彩票'
                : 'Provably Fair Decentralized Lottery'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#131824]/90 p-1 rounded-2xl border border-white/10">
          {navItems.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`nav-${item.id}`}
                onClick={() => navigateTo(item.id)}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
                <span>{getLabel(item)}</span>
                {item.badge && (
                  <span className="hidden 2xl:inline px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Language/FX Switcher + Wallet Balance + Deposit CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language & Currency Switcher */}
          <div
            className="flex items-center bg-[#151b28] p-0.5 sm:p-1 rounded-xl border border-white/10 text-[10px] sm:text-[11px] font-bold"
            role="group"
            aria-label="Multi-currency selector"
          >
            {(['FA', 'EN', 'ZH'] as CurrencyLang[]).map((code) => (
              <button
                key={code}
                type="button"
                data-testid={`lang-${code}`}
                onClick={() => setLang(code)}
                className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all ${
                  lang === code
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {code === 'FA' ? 'FA' : code === 'EN' ? 'EN' : 'ZH'}
              </button>
            ))}
          </div>

          {/* Live User Balance & Deposit Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#161b26] border border-amber-500/25 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 sm:pr-3">
            <div className="text-right px-1 sm:px-0">
              <span className="hidden sm:block text-[10px] text-slate-400">
                {lang === 'FA' ? 'موجودی کیف پول' : lang === 'ZH' ? '钱包余额' : 'Wallet Balance'}
              </span>
              <span className="hidden sm:inline text-xs font-black text-emerald-400 font-mono" data-testid="navbar-balance">
                {formatAmount(balanceUsdt)}
              </span>
              <span className="sm:hidden text-[10px] font-black text-emerald-400 font-mono" dir="ltr">
                ${Math.round(balanceUsdt).toLocaleString('en-US')}
              </span>
            </div>
            <button
              type="button"
              data-testid="open-deposit-modal"
              onClick={() => setDepositModalOpen(true)}
              className="gold-gradient-cta text-[#2a1700] font-black text-xs px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">add_card</span>
              <span className="hidden sm:inline">
                {lang === 'FA' ? 'شارژ آنی' : lang === 'ZH' ? '充值' : 'Deposit'}
              </span>
            </button>
          </div>

          {/* Auth Profile Pill */}
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="hidden xl:flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200"
              title="Sign Out"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="truncate max-w-[90px]">{firebaseUser.displayName || firebaseUser.email}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="hidden xl:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-xs text-slate-200 font-bold transition-all"
            >
              <span className="material-symbols-outlined text-base text-amber-400">account_circle</span>
              <span>{lang === 'FA' ? 'حساب VIP' : 'VIP'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Route Switcher */}
      <div className="lg:hidden flex flex-wrap items-center gap-1.5 px-3 py-2 bg-[#0d121d] border-t border-white/5">
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xs">{item.icon}</span>
              <span>{getLabel(item)}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
