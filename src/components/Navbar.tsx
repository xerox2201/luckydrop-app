import React, { useState } from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import { CurrencyLang, toPersianDigits, getCnyToTomanRate } from '../utils/lotteryEngine.ts';

export const Navbar: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    lang,
    setLang,
    fxRates,
    oracleCountdownSec,
    refreshPriceOracleNow,
    formatAmount,
    balanceUsdt,
    displayName,
    tickets,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    setDepositModalOpen,
    setAiChatOpen,
    stealthCookieAuthorized,
    setStealthCookieAuthorized,
    killSwitchActive,
  } = useLottery();

  const [moreDrawerOpen, setMoreDrawerOpen] = useState<boolean>(false);

  const cnyToman = getCnyToTomanRate(fxRates);

  const primaryDesktopNav: {
    id: AppRoute;
    labelFa: string;
    labelEn: string;
    labelZh: string;
  }[] = [
    { id: 'lobby', labelFa: 'لابی', labelEn: 'Lobby', labelZh: '大厅' },
    { id: 'play', labelFa: 'خرید بلیت', labelEn: 'Buy Ticket', labelZh: '购票' },
    { id: 'my-tickets', labelFa: 'بلیت‌های من', labelEn: 'My Tickets', labelZh: '我的彩票' },
    { id: 'deposit', labelFa: 'واریز', labelEn: 'Deposit', labelZh: '充值' },
    { id: 'withdraw', labelFa: 'برداشت', labelEn: 'Withdraw', labelZh: '提现' },
    { id: 'transparency', labelFa: 'شفافیت', labelEn: 'Fairness', labelZh: '公平验证' },
    { id: 'terms', labelFa: 'قوانین', labelEn: 'Rules', labelZh: '规则' },
  ];

  const allRoutes: {
    id: AppRoute;
    labelFa: string;
    labelEn: string;
    labelZh: string;
    subFa: string;
    icon: string;
    badge?: string;
  }[] = [
    { id: 'lobby', labelFa: 'لابی اصلی و جک‌پات', labelEn: 'Main VIP Lobby', labelZh: '贵宾大厅', subFa: '۴ استخر همزمان و نرخ لحظه‌ای', icon: 'home' },
    { id: 'play', labelFa: 'خرید بلیت تکی و دسته‌ای', labelEn: 'Bulk Ticket Terminal', labelZh: '批量购票终端', subFa: 'انتخاب هوشمند AI و سبد چندشانسه', icon: 'confirmation_number', badge: 'BULK' },
    { id: 'my-tickets', labelFa: 'بلیت‌های من و جوایز', labelEn: 'My Tickets & Winnings', labelZh: '我的彩票与奖金', subFa: 'مدیریت کوپن‌ها و دریافت آنی جایزه', icon: 'redeem' },
    { id: 'deposit', labelFa: 'واریز ارز دیجیتال', labelEn: 'Crypto Deposit', labelZh: '加密货币充值', subFa: 'پشتیبانی ۵ شبکه با تایید آنی', icon: 'account_balance_wallet' },
    { id: 'withdraw', labelFa: 'برداشت ارز دیجیتال', labelEn: 'Instant Withdrawal', labelZh: '即时提现', subFa: 'تسویه مستقیم با کد امنیتی 2FA', icon: 'payments' },
    { id: 'status', labelFa: 'تاریخچه و رهگیری تراکنش‌ها', labelEn: 'Transaction Tracker', labelZh: '交易记录追踪', subFa: 'استعلام زنده هش در بلاکچین', icon: 'receipt_long' },
    { id: 'transparency', labelFa: 'شفافیت و اثبات منصفانه', labelEn: 'Provably Fair Audit', labelZh: '可证明公平审计', subFa: 'ماشین‌حساب رمزنگاری SHA-256', icon: 'verified_user' },
    { id: 'terms', labelFa: 'قوانین و شرایط رسمی', labelEn: 'Official VIP Rules', labelZh: '官方规则条款', subFa: 'تضمین ۱۰۰٪ توزیع جوایز راس تایمر', icon: 'gavel' },
    { id: 'cockpit', labelFa: 'کاکپیت فرماندهی اپراتور', labelEn: 'Operator Cockpit', labelZh: '管理员控制台', subFa: 'مدیریت استخرها، بنرها و تسویه 2FA', icon: 'shield_lock', badge: 'OPS' },
    { id: 'finances', labelFa: 'داشبورد مالی و خزانه سرد', labelEn: 'Waterfall Treasury', labelZh: '瀑布流金库', subFa: 'تفکیک آبشاری ۸۵٪ جایزه / ۱۰٪ سود', icon: 'account_balance', badge: '10%' },
    { id: 'launch', labelFa: 'مینی‌اپ و ربات تلگرام', labelEn: 'Telegram Mini-App', labelZh: '电报小程序', subFa: 'اتصال WebApp و نوتیفیکیشن آنی', icon: 'send', badge: 'BOT' },
  ];

  const getLabel = (item: { labelFa: string; labelEn: string; labelZh: string }) => {
    if (lang === 'EN') return item.labelEn;
    if (lang === 'ZH') return item.labelZh;
    return item.labelFa;
  };

  const totalWinningsUsdt = tickets.reduce((acc, t) => acc + (parseFloat(t.prizeWonUsdt) || 0), 0);

  const handleNavigateFromDrawer = (route: AppRoute) => {
    setMoreDrawerOpen(false);
    navigateTo(route);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#07090e]/92 backdrop-blur-2xl border-b border-amber-500/20 shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
        {/* 1. MAIN TOP BAR (Adaptive: Minimal Native Bar on Mobile, Sleek 3-Zone Bar on Desktop) */}
        <div className="max-w-[1440px] mx-auto px-3.5 lg:px-8 h-14 lg:h-[72px] flex items-center justify-between gap-3">
          {/* Zone 1: Royal Crown Brand Mark + Desktop Hamburger Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMoreDrawerOpen(true)}
              aria-label="منوی کامل دسترسی و پروفایل VIP"
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-[#131824] hover:bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
              title="منوی کامل پلتفرم (۱۱ بخش)"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>

            <div
              onClick={() => navigateTo('lobby')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              {/* 3D Gold Crown Circle Emblem matching reference images */}
              <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-b from-[#231b0c] to-[#0d0a04] border-2 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 18H21V20H3V18ZM3 15L5 7L9.5 11.5L12 5L14.5 11.5L19 7L21 15H3Z"
                    fill="url(#crownGoldGrad)"
                  />
                  <defs>
                    <linearGradient id="crownGoldGrad" x1="3" y1="5" x2="21" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FEF08A" />
                      <stop offset="0.5" stopColor="#F59E0B" />
                      <stop offset="1" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="leading-tight" dir="ltr">
                <div className="text-base lg:text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  LuckyDrop
                </div>
                <div className="text-[9px] lg:text-[10px] font-bold tracking-[0.18em] text-amber-300/80 uppercase">
                  VIP LOTTERY
                </div>
              </div>
            </div>
          </div>

          {/* Zone 2: Clean Desktop Horizontal Navigation with Glowing Gold Underline (Matches Desktop Reference) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {primaryDesktopNav.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => navigateTo(item.id)}
                  className={`relative px-3.5 py-2 text-xs xl:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-amber-300 font-black'
                      : 'text-slate-300 hover:text-amber-200'
                  }`}
                >
                  <span>{getLabel(item)}</span>
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-[19px] h-[3px] rounded-t-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b]" />
                  )}
                </button>
              );
            })}

            {/* Operator Quick Access Links in Desktop Nav for Automated Testing & Instant Admin Reach */}
            <div className="hidden 2xl:flex items-center gap-1 pl-2 border-r border-white/10 mr-1">
              <button
                type="button"
                data-testid="nav-status"
                onClick={() => navigateTo('status')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  activeRoute === 'status' ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'FA' ? 'رهگیری' : 'Tracker'}
              </button>
              <button
                type="button"
                data-testid="nav-cockpit"
                onClick={() => navigateTo('cockpit')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  activeRoute === 'cockpit' ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                {lang === 'FA' ? 'کاکپیت' : 'Cockpit'}
              </button>
              <button
                type="button"
                data-testid="nav-finances"
                onClick={() => navigateTo('finances')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  activeRoute === 'finances' ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                {lang === 'FA' ? 'خزانه' : 'Vault'}
              </button>
              <button
                type="button"
                data-testid="nav-launch"
                onClick={() => navigateTo('launch')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  activeRoute === 'launch' ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                {lang === 'FA' ? 'تلگرام' : 'Bot'}
              </button>
            </div>
          </nav>

          {/* Zone 3: Language Switcher + Smart Wallet Pill + Notification Bell + VIP Profile Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selector Pill (FA / EN / ZH) */}
            <div
              className="flex items-center bg-[#121722] p-0.5 rounded-xl border border-amber-500/25 text-[10px] sm:text-[11px] font-bold"
              role="group"
              aria-label="Multi-currency selector"
            >
              {(['FA', 'EN', 'ZH'] as CurrencyLang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  data-testid={`lang-${code}`}
                  onClick={() => setLang(code)}
                  className={`px-1.5 sm:px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    lang === code
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">
                    {code === 'FA' ? '🇮🇷 FA' : code === 'EN' ? '🇬🇧 EN' : '🇨🇳 ZH'}
                  </span>
                  <span className="sm:hidden">{code}</span>
                </button>
              ))}
            </div>

            {/* Smart Wallet Balance Pill + Quick Deposit/Withdraw */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#121722] border border-amber-500/30 rounded-xl p-1 sm:px-2.5 sm:py-1">
              <div className="text-right px-1">
                <span className="hidden xl:block text-[9px] text-slate-400">
                  {lang === 'FA' ? 'موجودی کیف پول' : lang === 'ZH' ? '钱包余额' : 'Wallet Balance'}
                </span>
                <span
                  className="hidden sm:inline text-xs font-black text-amber-300 font-mono whitespace-nowrap"
                  data-testid="navbar-balance"
                >
                  {formatAmount(balanceUsdt)}
                </span>
                <span
                  className="sm:hidden text-[10px] font-black text-amber-300 font-mono whitespace-nowrap"
                  dir="ltr"
                >
                  ${Math.round(balanceUsdt).toLocaleString('en-US')}
                </span>
              </div>
              <button
                type="button"
                data-testid="open-deposit-modal"
                onClick={() => setDepositModalOpen(true)}
                className="emerald-gradient-cta font-black text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span className="hidden sm:inline">
                  {lang === 'FA' ? 'واریز' : lang === 'ZH' ? '充值' : 'Deposit'}
                </span>
              </button>
              <button
                type="button"
                data-testid="navbar-withdraw-btn"
                onClick={() => navigateTo('withdraw')}
                className="hidden md:flex bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-black text-[11px] px-2.5 py-1.5 rounded-lg transition-all items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>{lang === 'FA' ? 'برداشت' : lang === 'ZH' ? '提现' : 'Withdraw'}</span>
              </button>
            </div>

            {/* Notification / Support Trigger Bell (Matches Mobile & Desktop Reference) */}
            <button
              type="button"
              onClick={() => setAiChatOpen(true)}
              aria-label="اعلانات و پشتیبانی آنلاین"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#121722] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/35 text-amber-300 flex items-center justify-center relative cursor-pointer transition-colors shrink-0"
              title="پشتیبانی ۲۴/۷ و اعلانات قرعه‌کشی"
            >
              <span className="material-symbols-outlined text-base sm:text-lg">notifications</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" />
            </button>

            {/* Desktop VIP Profile Pill (Matches Top-Right of Desktop Reference Image) */}
            <button
              type="button"
              onClick={() => (firebaseUser ? signOutUser() : setMoreDrawerOpen(true))}
              className="hidden md:flex items-center gap-2 bg-[#121722] hover:bg-[#181f2e] border border-amber-500/30 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full gold-gradient-cta flex items-center justify-center text-[#241300] font-black text-xs">
                👑
              </div>
              <div className="text-right leading-tight">
                <div className="text-xs font-bold text-white truncate max-w-[100px]">
                  {firebaseUser?.displayName || displayName.split(' ')[0] || 'AliErfani'}
                </div>
                <div className="text-[9px] font-black px-1.5 rounded bg-amber-500/20 text-amber-300 inline-block">
                  VIP GOLD
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. SUB-HEADER LIVE 15s PRICE ORACLE RIBBON (Matches Desktop Reference Ticker Bar) */}
        <div className="bg-[#05070b]/95 border-t border-white/5 px-3.5 lg:px-8 py-1.5 text-[11px]">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Crypto & Fiat Live Pills */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0" dir="ltr">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  ₿
                </span>
                <span className="text-slate-300 font-bold">BTC</span>
                <span className="font-mono text-white font-bold">${fxRates.BTC.toLocaleString('en-US')}</span>
                <span className="text-[10px] text-emerald-400 font-mono">▲ 1.24%</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  💎
                </span>
                <span className="text-slate-300 font-bold">TON</span>
                <span className="font-mono text-sky-300 font-bold">${fxRates.TON}</span>
                <span className="text-[10px] text-emerald-400 font-mono">▲ 2.41%</span>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center">
                  T
                </span>
                <span className="text-slate-300 font-bold">TRX</span>
                <span className="font-mono text-rose-300 font-bold">${fxRates.TRX}</span>
                <span className="text-[10px] text-emerald-400 font-mono">▲ 0.98%</span>
              </div>

              <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-yellow-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  B
                </span>
                <span className="text-slate-300 font-bold">BNB</span>
                <span className="font-mono text-amber-300 font-bold">${fxRates.BNB}</span>
                <span className="text-[10px] text-emerald-400 font-mono">▲ 1.56%</span>
              </div>

              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25"
                data-testid="oracle-toman-rate"
              >
                <span className="text-slate-300 font-bold">USDT/IRT:</span>
                <strong className="text-amber-300 font-mono">
                  {toPersianDigits(fxRates.TOMAN.toLocaleString('en-US'))} T
                </strong>
              </div>

              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
                data-testid="oracle-cny-rate"
              >
                <span className="text-slate-300 font-bold">CNY:</span>
                <strong className="text-emerald-300 font-mono">
                  {toPersianDigits(cnyToman.toLocaleString('en-US'))} T
                </strong>
                <span className="text-slate-400 font-mono">(¥{fxRates.CNY})</span>
              </div>
            </div>

            {/* Right Oracle Status & Stealth Middleware Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {killSwitchActive && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 font-bold animate-pulse">
                  🚨 KILL-SWITCH FROZEN
                </span>
              )}

              <button
                type="button"
                onClick={() => setStealthCookieAuthorized(!stealthCookieAuthorized)}
                data-testid="toggle-stealth-cookie"
                className={`hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-mono border transition-all items-center gap-1 cursor-pointer ${
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
                className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border border-white/10 transition-all cursor-pointer"
                title="Test visiting /admin directly (Triggers Decoy 404)"
              >
                Test /admin (Decoy 404)
              </button>

              <button
                type="button"
                onClick={refreshPriceOracleNow}
                data-testid="live-oracle-indicator"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shrink-0 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                title="Click to force immediate TetherLand / Wallex / Binance Oracle refresh"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Oracle Connected</span>
                <span
                  data-testid="oracle-countdown"
                  className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200"
                >
                  00:{String(oracleCountdownSec).padStart(2, '0')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3. NATIVE MOBILE 5-TAB BOTTOM GLASS DOCK (Matches Mobile App Showcase Image 100%) */}
      <nav
        aria-label="منوی پایین اپلیکیشن موبایل"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#080b12]/95 backdrop-blur-2xl border-t border-amber-500/25 shadow-[0_-10px_30px_rgba(0,0,0,0.85)] grid grid-cols-5 items-center px-1"
      >
        {[
          {
            id: 'lobby' as AppRoute,
            labelFa: 'خانه',
            labelEn: 'Home',
            labelZh: '首页',
            icon: 'home',
            activeMatch: activeRoute === 'lobby',
          },
          {
            id: 'play' as AppRoute,
            labelFa: 'بلیت‌ها',
            labelEn: 'Tickets',
            labelZh: '彩票',
            icon: 'confirmation_number',
            activeMatch: activeRoute === 'play' || activeRoute === 'my-tickets',
          },
          {
            id: 'deposit' as AppRoute,
            labelFa: 'واریز',
            labelEn: 'Deposit',
            labelZh: '充值',
            icon: 'add_card',
            activeMatch: activeRoute === 'deposit',
          },
          {
            id: 'withdraw' as AppRoute,
            labelFa: 'برداشت',
            labelEn: 'Withdraw',
            labelZh: '提现',
            icon: 'payments',
            activeMatch: activeRoute === 'withdraw',
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.id)}
            className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              tab.activeMatch ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.activeMatch && (
              <span className="absolute top-0 inset-x-4 h-[2.5px] rounded-b-full bg-amber-400 shadow-[0_2px_12px_#f59e0b]" />
            )}
            <span
              className="material-symbols-outlined text-[21px]"
              style={tab.activeMatch ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold tracking-tight">
              {lang === 'EN' ? tab.labelEn : lang === 'ZH' ? tab.labelZh : tab.labelFa}
            </span>
          </button>
        ))}

        {/* 5th Tab: بیشتر ☰ (Opens Full Native VIP Profile & 11-Route Sheet) */}
        <button
          type="button"
          onClick={() => setMoreDrawerOpen(true)}
          className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            moreDrawerOpen ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {moreDrawerOpen && (
            <span className="absolute top-0 inset-x-4 h-[2.5px] rounded-b-full bg-amber-400 shadow-[0_2px_12px_#f59e0b]" />
          )}
          <span className="material-symbols-outlined text-[21px]">menu</span>
          <span className="text-[10px] font-bold tracking-tight">
            {lang === 'EN' ? 'More' : lang === 'ZH' ? '更多' : 'بیشتر'}
          </span>
        </button>
      </nav>

      {/* 4. SLIDE-OVER / MOBILE FULL-SCREEN VIP "بیشتر ☰" DRAWER (Matches Mobile Screen 7 & 11-Route Menu) */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-[#090c14] border-r border-amber-500/30 h-full overflow-y-auto p-5 flex flex-col justify-between space-y-6 shadow-[0_0_80px_rgba(0,0,0,0.95)]">
            <div className="space-y-5">
              {/* Top Profile Header matching Mobile Showcase Row 2 Col 3 */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    <div className="w-full h-full rounded-full bg-[#101420] flex items-center justify-center text-lg">
                      👑
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{displayName}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                      VIP GOLD
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreDrawerOpen(false)}
                  aria-label="بستن منو"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* VIP Level & 3-Column Stats Card (Matches Mobile Screen 7) */}
              <div className="luxury-marble-card rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      ★
                    </span>
                    <div>
                      <span className="text-[11px] text-slate-400 block">سطح حساب کاربری</span>
                      <span className="text-sm font-black text-amber-300">VIP Gold (۸۶٪)</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">موجودی کل</span>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="bg-[#0c101a] rounded-xl p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">تعداد بلیت‌ها</span>
                    <span className="text-sm font-black text-white font-mono">{tickets.length}</span>
                  </div>
                  <div className="bg-[#0c101a] rounded-xl p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">مجموع بردها</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      ${totalWinningsUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-[#0c101a] rounded-xl p-2 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">رتبه شما</span>
                    <span className="text-sm font-black text-amber-400 font-mono">#873</span>
                  </div>
                </div>
              </div>

              {/* Full 11-Route Interactive List */}
              <div className="space-y-1.5">
                {allRoutes.map((item) => {
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigateFromDrawer(item.id)}
                      className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/40 text-amber-300'
                          : 'bg-[#101521]/80 hover:bg-[#161d2d] border border-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-right">
                        <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                          <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        </span>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>{getLabel(item)}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.subFa}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-sm text-slate-500">chevron_left</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    setAiChatOpen(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">support_agent</span>
                  <span>چت آنلاین ۲۴/۷</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    if (firebaseUser) signOutUser();
                    else signInWithGoogle();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">account_circle</span>
                  <span>{firebaseUser ? 'خروج از حساب' : 'اتصال گوگل VIP'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
