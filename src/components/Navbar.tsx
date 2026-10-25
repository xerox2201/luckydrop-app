import React from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import { CurrencyLang } from '../utils/lotteryEngine.ts';

const PRIMARY_VERTICAL_TABS: {
  id: AppRoute;
  badgeIcon: string;
  labelFa: string;
  labelEn: string;
  icon: string;
}[] = [
  {
    id: 'lobby',
    badgeIcon: '🎰',
    labelFa: 'لاتاری اصلی (LuckyDrop)',
    labelEn: 'Main Lottery',
    icon: 'confirmation_number',
  },
  {
    id: 'mini-games',
    badgeIcon: '⚡',
    labelFa: 'بازی‌های آنی (Instant)',
    labelEn: 'Instant Games',
    icon: 'bolt',
  },
  {
    id: 'transparency',
    badgeIcon: '🛡️',
    labelFa: 'راستی‌آزما (Fairness)',
    labelEn: 'Fairness & Verifier',
    icon: 'verified',
  },
  {
    id: 'cockpit',
    badgeIcon: '⚙️',
    labelFa: 'مدیریت و خزانه',
    labelEn: 'Admin & Treasury',
    icon: 'account_balance',
  },
];

const SECONDARY_NAV_ITEMS: { route: AppRoute; label: string; icon: string }[] = [
  { route: 'play', label: 'خرید بلیط', icon: 'local_activity' },
  { route: 'my-tickets', label: 'بلیت‌های من', icon: 'receipt_long' },
  { route: 'deposit', label: 'واریز رمزارز', icon: 'add_card' },
  { route: 'withdraw', label: 'برداشت وجه', icon: 'payments' },
  { route: 'user-panel', label: 'پنل VIP و کد معرف', icon: 'workspace_premium' },
];

export const Navbar: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    lang,
    setLang,
    fxRates,
    oracleSnapshot,
    oracleCountdownSec,
    refreshPriceOracleNow,
    balanceUsdt,
    bonusTokensUsdt,
    formatAmount,
    setDepositModalOpen,
    setWalletDrawerOpen,
    killSwitchActive,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    pamLedger,
    pamReconciliation,
  } = useLottery();

  const cnyToToman = Math.round(fxRates.TOMAN / (fxRates.CNY || 6.68));

  // Cross-Sell XP Progress toward next Free Lottery Ticket ($100 Wager Turnover cycle)
  const totalWageredUsdt = pamReconciliation?.totalDebitsUsdt || 65;
  const xpProgressPct = Math.min(100, Math.max(8, Math.round((totalWageredUsdt % 100))));
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset = ringCircumference - (xpProgressPct / 100) * ringCircumference;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b1620]/90 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
        {killSwitchActive && (
          <div
            data-testid="killswitch-banner"
            className="bg-[#e9113c] text-white text-center py-2 px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 border-b border-rose-300/30"
          >
            <span className="material-symbols-outlined text-base">warning</span>
            <span>
              503 Service Unavailable — سیستم اضطراری توقف (Emergency Kill-Switch) فعال است؛ فروش بلیط و برداشت موقتاً متوقف شده است.
            </span>
          </div>
        )}

        {/* Top Live Price Oracle & Sub-Navigation Utility Strip */}
        <div className="border-b border-white/[0.06] bg-[#0f212e]/90 px-3 lg:px-8 py-1.5">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#00e701]/15 border border-[#00e701]/40 text-[#00e701] font-mono font-bold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e701] animate-pulse" />
                <span>LIVE ORACLE</span>
              </span>
              <span className="text-slate-400 hidden md:inline font-medium text-[11px]">
                {oracleSnapshot?.source || 'TetherLand • Wallex • Binance Spot'}
              </span>
              <button
                type="button"
                onClick={() => refreshPriceOracleNow()}
                className="px-2 py-0.5 rounded-md bg-[#213743] hover:bg-[#2f4553] border border-white/10 text-slate-200 font-mono text-[11px] transition-colors cursor-pointer tabular-nums"
              >
                ↻ {oracleCountdownSec}s
              </button>
            </div>

            {/* Live FX Rates Strip */}
            <div
              data-testid="live-oracle-rates-strip"
              className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar font-mono text-[11px] tabular-nums"
              dir="ltr"
            >
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">1 USDT =</span>
                <strong className="text-[#fbbf24] font-black">
                  {fxRates.TOMAN.toLocaleString('en-US')} Toman
                </strong>
              </div>
              <span className="text-white/15">|</span>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">1 CNY =</span>
                <strong className="text-rose-300 font-black">
                  {cnyToToman.toLocaleString('en-US')} Toman
                </strong>
              </div>
              <span className="text-white/15 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">TON:</span>
                <strong className="text-sky-300">${fxRates.TON.toFixed(2)}</strong>
              </div>
              <span className="text-white/15 hidden md:inline">|</span>
              <div className="hidden md:flex items-center gap-1 whitespace-nowrap">
                <span className="text-slate-400">TRX:</span>
                <strong className="text-[#00e701]">${fxRates.TRX.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Main Studio Header Row: Left Brand + Center Categorized Switcher + Right Unified Wallet & XP Ring */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Left Zone: Brand Identity + Live Online Player Pulse */}
          <button
            type="button"
            onClick={() => navigateTo('lobby')}
            className="flex items-center gap-3 text-right group focus:outline-none shrink-0 cursor-pointer"
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-[#fbbf24]/60 bg-gradient-to-br from-[#fde68a] via-[#fbbf24] to-[#d97706] flex items-center justify-center shadow-[0_4px_18px_rgba(251,191,36,0.35)] group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#1c1002] fill-current drop-shadow">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                  Lucky<span className="gold-shimmer-text">Drop</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#213743] text-[#fbbf24] border border-[#fbbf24]/30 font-bold hidden sm:inline">
                  زرین لاتاری
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e701]" />
                <span>2,849 Online</span>
                <span className="hidden sm:inline text-white/20">·</span>
                <span className="hidden sm:inline text-slate-400">SHA-256</span>
              </div>
            </div>
          </button>

          {/* Center Zone (Desktop): Categorized 4-Pillar Navigation Switcher */}
          <div
            data-testid="primary-vertical-tab-switcher"
            className="hidden lg:flex items-center gap-1.5 bg-[#1a2c38] p-1.5 rounded-2xl border border-white/[0.07] shadow-inner"
          >
            {PRIMARY_VERTICAL_TABS.map((tab) => {
              const isActive =
                activeRoute === tab.id ||
                (tab.id === 'lobby' && (activeRoute === 'play' || activeRoute === 'my-tickets'));
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`vertical-tab-${tab.id}`}
                  onClick={() => navigateTo(tab.id)}
                  className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#213743] text-white border border-[#00e701]/60 shadow-[0_0_18px_rgba(0,231,1,0.18)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="text-sm leading-none">{tab.badgeIcon}</span>
                  <span>{tab.labelFa}</span>
                </button>
              );
            })}
          </div>

          {/* Right Zone: Currency Switcher + Unified Seamless Wallet Pill + Cross-Sell XP Progress Ring */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Currency / Language Switcher */}
            <div
              className="hidden sm:flex items-center bg-[#1a2c38] p-1 rounded-xl border border-white/[0.07]"
              role="group"
              aria-label="تغییر واحد پول و زبان"
            >
              {(['FA', 'EN', 'ZH'] as CurrencyLang[]).map((code) => {
                const isSelected = lang === code;
                const label = code === 'FA' ? 'تومان' : code === 'EN' ? 'USDT' : '¥ CNY';
                return (
                  <button
                    key={code}
                    type="button"
                    data-testid={`lang-${code}`}
                    onClick={() => setLang(code)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#fbbf24] text-[#1c1002] shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Unified Seamless Wallet Pill (Main Balance + Bonus Token Counter + Top-Up Trigger) */}
            <div className="flex items-center bg-[#1a2c38] border border-white/[0.09] rounded-xl p-1 shadow-inner">
              <button
                type="button"
                data-testid="open-pam-wallet-drawer-btn"
                onClick={() => setWalletDrawerOpen(true)}
                className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg hover:bg-[#213743] transition-colors cursor-pointer"
                title="مشاهده کیف پول یکپارچه PAM و دفترکل زنده تراکنش‌ها (Transaction Ledger)"
              >
                <div className="text-right leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#00e701] font-mono font-bold tabular-nums">
                      PAM ({pamLedger.length} TX)
                    </span>
                    <span className="text-[10px] font-mono text-[#fbbf24] bg-[#fbbf24]/15 px-1.5 py-0.2 rounded tabular-nums">
                      +${bonusTokensUsdt.toFixed(0)} Bonus
                    </span>
                  </div>
                  <span
                    data-testid="navbar-balance"
                    className="text-xs sm:text-sm font-black text-white font-mono tabular-nums block"
                  >
                    {formatAmount(balanceUsdt)}
                  </span>
                </div>
              </button>

              {/* Quick Top-Up CTA inside Wallet Pill */}
              <button
                type="button"
                data-testid="open-deposit-modal"
                onClick={() => setDepositModalOpen(true)}
                className="px-3 py-2 rounded-lg stake-emerald-cta text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base leading-none">add</span>
                <span className="hidden sm:inline">شارژ آنی</span>
              </button>
            </div>

            {/* Cross-Sell XP Progress Ring (Progress toward next Free Lottery Ticket) */}
            <button
              type="button"
              onClick={() => setWalletDrawerOpen(true)}
              title={`پیشرفت وفاداری لاتاری: ${xpProgressPct}% تا دریافت بلیت رایگان بعدی`}
              className="hidden md:flex items-center gap-2 bg-[#1a2c38] hover:bg-[#213743] border border-white/[0.07] rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r={ringRadius}
                    fill="none"
                    stroke="#213743"
                    strokeWidth="3.2"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r={ringRadius}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3.2"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringStrokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[9px] font-mono font-black text-[#fbbf24] tabular-nums">
                  {xpProgressPct}%
                </span>
              </div>
              <div className="text-right hidden xl:block leading-tight">
                <span className="text-[10px] font-bold text-slate-300 block">بلیت رایگان XP</span>
                <span className="text-[10px] font-mono text-[#00e701] tabular-nums block">
                  Free Drop Ring
                </span>
              </div>
            </button>

            {/* Google Cloud Auth Button */}
            {firebaseUser ? (
              <button
                type="button"
                onClick={signOutUser}
                title={`خروج (${firebaseUser.email || firebaseUser.displayName})`}
                className="hidden xl:flex items-center gap-1.5 bg-[#1a2c38] hover:bg-rose-950/50 border border-[#00e701]/40 rounded-xl px-2.5 py-2 transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-[#00e701] max-w-[75px] truncate">
                  {firebaseUser.displayName || 'VIP'}
                </span>
                <span className="material-symbols-outlined text-sm text-rose-400">logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="hidden xl:flex items-center gap-1 bg-[#1a2c38] hover:bg-[#213743] border border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-[#fbbf24] transition-all cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>ورود</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Bar: Secondary Quick Access Links + Tablet/Mobile Category Switcher */}
        <div className="border-t border-white/[0.06] bg-[#0f212e]/95 px-3 lg:px-8 py-1.5">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            {/* Secondary Route Links */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {SECONDARY_NAV_ITEMS.map((item) => {
                const active = activeRoute === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    data-testid={`nav-${item.route}`}
                    onClick={() => navigateTo(item.route)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-[#213743] text-[#fbbf24] border border-[#fbbf24]/50 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile/Tablet Currency Switcher */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              {(['FA', 'EN', 'ZH'] as CurrencyLang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer ${
                    lang === code ? 'bg-[#fbbf24] text-slate-950' : 'bg-[#1a2c38] text-slate-300'
                  }`}
                >
                  {code === 'FA' ? 'تومان' : code === 'EN' ? 'USDT' : 'CNY'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile-First Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="ناوبری پایین موبایل"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0f212e]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-[0_-10px_30px_rgba(0,0,0,0.75)]"
      >
        <button
          type="button"
          onClick={() => navigateTo('lobby')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${
            activeRoute === 'lobby' || activeRoute === 'play'
              ? 'text-[#fbbf24] bg-[#213743]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg leading-none">confirmation_number</span>
          <span className="mt-0.5 whitespace-nowrap">لاتاری</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('mini-games')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${
            activeRoute === 'mini-games'
              ? 'text-[#00e701] bg-[#213743]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg leading-none">bolt</span>
          <span className="mt-0.5 whitespace-nowrap">مینی‌گیم</span>
        </button>

        <button
          type="button"
          onClick={() => setWalletDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black bg-[#00e701] text-[#051c08] shadow-[0_2px_0_#00b801] cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg leading-none">account_balance_wallet</span>
          <span className="mt-0.5 whitespace-nowrap">کیف پول</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('transparency')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${
            activeRoute === 'transparency'
              ? 'text-[#00e701] bg-[#213743]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg leading-none">verified</span>
          <span className="mt-0.5 whitespace-nowrap">شفافیت</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('cockpit')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-black transition-colors cursor-pointer ${
            activeRoute === 'cockpit'
              ? 'text-[#fbbf24] bg-[#213743]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg leading-none">tune</span>
          <span className="mt-0.5 whitespace-nowrap">کاکپیت</span>
        </button>
      </nav>
    </>
  );
};
