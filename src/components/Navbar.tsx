import React from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import { CurrencyLang } from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

const PRIMARY_VERTICAL_TABS: {
  id: AppRoute;
  labelFa: string;
  labelEn: string;
  icon: string;
}[] = [
  {
    id: 'lobby',
    labelFa: 'لاتاری اصلی (Main Lottery • LuckyDrop)',
    labelEn: 'Main Lottery (LuckyDrop)',
    icon: 'confirmation_number',
  },
  {
    id: 'mini-games',
    labelFa: 'مینی‌گیم‌های آنی (Instant Mini-Games)',
    labelEn: 'Instant Mini-Games',
    icon: 'bolt',
  },
  {
    id: 'transparency',
    labelFa: 'راستی‌آزمای Provably Fair',
    labelEn: 'Provably Fair Verifier',
    icon: 'verified',
  },
  {
    id: 'cockpit',
    labelFa: 'مدیریت و خزانه (Admin & Treasury)',
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
    formatAmount,
    setDepositModalOpen,
    setWalletDrawerOpen,
    killSwitchActive,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    pamLedger,
  } = useLottery();

  const cnyToToman = Math.round(fxRates.TOMAN / (fxRates.CNY || 6.68));

  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/30 bg-[#070a12]/95 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
      {killSwitchActive && (
        <div
          data-testid="killswitch-banner"
          className="bg-red-600/95 text-white text-center py-2 px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 border-b border-red-400"
        >
          <span className="material-symbols-outlined text-base">warning</span>
          <span>
            503 Service Unavailable — سیستم اضطراری توقف (Emergency Kill-Switch) فعال است؛ فروش بلیط و برداشت موقتاً متوقف شده است.
          </span>
        </div>
      )}

      {/* Top Live Price Oracle Ticker Bar */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-[#05080f] via-[#0c1220] to-[#05080f] px-3 lg:px-8 py-2">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE ORACLE</span>
            </span>
            <span className="text-slate-300 hidden md:inline font-medium">
              {oracleSnapshot?.source || 'TetherLand • Wallex • Binance Spot'}
            </span>
            <button
              type="button"
              onClick={() => refreshPriceOracleNow()}
              className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 font-mono transition-colors cursor-pointer"
            >
              ↻ {oracleCountdownSec}s
            </button>
          </div>

          <div
            data-testid="live-oracle-rates-strip"
            className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar font-mono text-xs"
            dir="ltr"
          >
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-slate-400">1 USDT =</span>
              <strong className="text-amber-300 font-black">
                {fxRates.TOMAN.toLocaleString('en-US')} Toman
              </strong>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-slate-400">1 CNY (¥) =</span>
              <strong className="text-rose-300 font-black">
                {cnyToToman.toLocaleString('en-US')} Toman
              </strong>
            </div>
            <span className="text-white/20 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1 whitespace-nowrap">
              <span className="text-slate-400">TON:</span>
              <strong className="text-sky-300">${fxRates.TON.toFixed(2)}</strong>
            </div>
            <span className="text-white/20 hidden md:inline">|</span>
            <div className="hidden md:flex items-center gap-1 whitespace-nowrap">
              <span className="text-slate-400">TRX:</span>
              <strong className="text-emerald-300">${fxRates.TRX.toFixed(4)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => navigateTo('lobby')}
          className="flex items-center gap-3 text-right group focus:outline-none shrink-0 cursor-pointer"
        >
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.45)] group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-950 fill-current drop-shadow">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                زرین <span className="gold-shimmer-text">لاتاری</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-400/50 font-black">
                PAM + SHA256
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block font-medium">
              پلتفرم یکپارچه iLottery و بازی‌های آنی Provably Fair
            </p>
          </div>
        </button>

        {/* Secondary Route Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1.5 bg-[#0e1320] p-1.5 rounded-2xl border border-white/10">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const active = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                data-testid={`nav-${item.route}`}
                onClick={() => navigateTo(item.route)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'gold-gradient-cta text-[#241300] shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Language Switcher + PAM Seamless Wallet Drawer Trigger + Quick Deposit */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Currency / Language Switcher */}
          <div
            className="flex items-center bg-[#111726] p-1 rounded-xl border border-amber-500/30"
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* PAM Wallet & Real-Time Transaction Ledger Drawer Button */}
          <button
            type="button"
            data-testid="open-pam-wallet-drawer-btn"
            onClick={() => setWalletDrawerOpen(true)}
            className="flex items-center gap-2.5 bg-[#111726] hover:bg-[#172033] border border-emerald-500/45 rounded-2xl px-3.5 py-2 transition-all cursor-pointer shadow-lg"
            title="مشاهده کیف پول یکپارچه PAM و دفترکل زنده تراکنش‌ها (Transaction Ledger)"
          >
            <span className="material-symbols-outlined text-emerald-400 text-xl">
              account_balance_wallet
            </span>
            <div className="text-right leading-tight">
              <span className="text-[10px] text-emerald-300 font-mono font-bold block">
                PAM WALLET ({pamLedger.length} TX)
              </span>
              <span
                data-testid="navbar-balance"
                className="text-xs sm:text-sm font-black text-amber-300 font-mono"
              >
                {formatAmount(balanceUsdt)}
              </span>
            </div>
          </button>

          {/* Instant Deposit Modal CTA */}
          <button
            type="button"
            data-testid="open-deposit-modal"
            onClick={() => setDepositModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl emerald-gradient-cta text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer font-black"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span className="hidden sm:inline">شارژ آنی</span>
          </button>

          {/* Google Cloud Auth Button */}
          {firebaseUser ? (
            <button
              type="button"
              onClick={signOutUser}
              title={`خروج (${firebaseUser.email || firebaseUser.displayName})`}
              className="hidden md:flex items-center gap-2 bg-[#111726] hover:bg-rose-950/50 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold text-emerald-300 max-w-[85px] truncate">
                {firebaseUser.displayName || 'VIP'}
              </span>
              <span className="material-symbols-outlined text-sm text-rose-400">logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="hidden md:flex items-center gap-1.5 bg-[#111726] hover:bg-white/10 border border-amber-400/40 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>ورود</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-PILLAR UNIFIED iLOTTERY & INSTANT MINI-GAMES TAB SWITCHER */}
      <div className="border-t border-white/10 bg-[#0a0f1c]/95 px-3 lg:px-8 py-2">
        <div
          data-testid="primary-vertical-tab-switcher"
          className="max-w-[1440px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2"
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
                className={`py-2.5 px-3.5 rounded-xl font-black text-xs flex items-center justify-between gap-2 border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/25 via-amber-400/20 to-emerald-500/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-[#111726]/80 border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`material-symbols-outlined text-base ${
                      isActive ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.labelFa}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300/90 hidden sm:inline shrink-0" dir="ltr">
                  {tab.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
