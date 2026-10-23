import React, { useState } from 'react';
import { useLottery, AppRoute } from '../context/LotteryContext.tsx';
import { CurrencyLang, toPersianDigits, getCnyToTomanRate } from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

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
    { id: 'lobby', labelFa: 'لابی اصلی', labelEn: 'Lobby', labelZh: '大厅' },
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
    { id: 'user-panel', labelFa: 'پنل کاربری VIP و امنیت', labelEn: 'User VIP Panel', labelZh: '贵宾用户中心', subFa: 'کیف پول، جوایز، ارتقای سطح و درگاه امن ادمین', icon: 'workspace_premium', badge: 'VIP' },
    { id: 'lobby', labelFa: 'لابی اصلی و جک‌پات ۳ بعدی', labelEn: 'Main VIP Lobby', labelZh: '贵宾大厅', subFa: '۴ استخر همزمان و نرخ لحظه‌ای اوراکل', icon: 'home' },
    { id: 'play', labelFa: 'خرید بلیت تکی و دسته‌ای', labelEn: 'Bulk Ticket Terminal', labelZh: '批量购票终端', subFa: 'انتخاب هوشمند AI و سبد چندشانسه', icon: 'confirmation_number', badge: 'BULK' },
    { id: 'my-tickets', labelFa: 'بلیت‌های من و دریافت جوایز', labelEn: 'My Tickets & Winnings', labelZh: '我的彩票与奖金', subFa: 'مدیریت کوپن‌ها و تسویه آنی جایزه', icon: 'redeem' },
    { id: 'deposit', labelFa: 'واریز ارز دیجیتال', labelEn: 'Crypto Deposit', labelZh: '加密货币充值', subFa: 'پشتیبانی ۵ شبکه با تایید آنی', icon: 'account_balance_wallet' },
    { id: 'withdraw', labelFa: 'برداشت ارز دیجیتال', labelEn: 'Instant Withdrawal', labelZh: '即时提现', subFa: 'تسویه مستقیم با کد امنیتی 2FA', icon: 'payments' },
    { id: 'status', labelFa: 'تاریخچه و رهگیری تراکنش‌ها', labelEn: 'Transaction Tracker', labelZh: '交易记录追踪', subFa: 'استعلام زنده هش در بلاکچین', icon: 'receipt_long' },
    { id: 'transparency', labelFa: 'شفافیت و اثبات منصفانه', labelEn: 'Provably Fair Audit', labelZh: '可证明公平审计', subFa: 'ماشین‌حساب رمزنگاری SHA-256', icon: 'verified_user' },
    { id: 'terms', labelFa: 'قوانین و شرایط رسمی', labelEn: 'Official VIP Rules', labelZh: '官方规则条款', subFa: 'تضمین ۱۰۰٪ توزیع جوایز راس تایمر', icon: 'gavel' },
    { id: 'cockpit', labelFa: 'کاکپیت فرماندهی اپراتور', labelEn: 'Operator Cockpit', labelZh: '管理员控制台', subFa: 'مدیریت استخرها، بنرها و تسویه 2FA', icon: 'shield_lock', badge: 'ADMIN' },
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
      <header className="sticky top-0 z-40 bg-[#07090e]/95 backdrop-blur-2xl border-b border-amber-500/25 shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        {/* 1. ULTRA-CLEAN TOP BAR (No duplicate balance or language clutter in header — moved inside Hamburger Menu) */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 h-16 lg:h-[74px] flex items-center justify-between gap-3">
          {/* Zone 1: Hamburger Trigger (Contains Wallet Balance + Language Switcher + Full Navigation) + Royal Brand Mark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              data-testid="hamburger-menu-btn"
              onClick={() => setMoreDrawerOpen(true)}
              aria-label="منوی همبرگری، موجودی کیف پول و تغییر زبان"
              className="h-10 lg:h-11 px-3 lg:px-3.5 rounded-2xl bg-[#131824] hover:bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              title="مشاهده موجودی کیف پول، تغییر زبان (FA/EN/ZH) و منوی کامل"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
              <span className="text-xs sm:text-sm font-black text-white">
                {lang === 'EN' ? 'Menu & Wallet' : lang === 'ZH' ? '菜单与钱包' : 'منو و کیف پول'}
              </span>
            </button>

            <div
              onClick={() => navigateTo('lobby')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <img
                src={LUXURY_IMAGES.brandCrownLogo}
                alt="LuckyDrop Crown Logo"
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.45)] group-hover:scale-105 transition-transform"
              />
              <div className="leading-tight" dir="ltr">
                <div className="text-lg lg:text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  LuckyDrop
                </div>
                <div className="text-[10px] font-bold tracking-[0.18em] text-amber-300/85 uppercase">
                  VIP LOTTERY
                </div>
              </div>
            </div>
          </div>

          {/* Zone 2: Clean Desktop Horizontal Navigation with Large Legible Fonts */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {primaryDesktopNav.map((item) => {
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`nav-${item.id}`}
                  onClick={() => navigateTo(item.id)}
                  className={`relative px-3.5 py-2 text-sm font-black whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-amber-300'
                      : 'text-slate-200 hover:text-amber-200'
                  }`}
                >
                  <span>{getLabel(item)}</span>
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-[19px] h-[3px] rounded-t-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Quick Deposit + Support Bell + Dedicated User VIP Panel Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="open-deposit-modal"
              onClick={() => setDepositModalOpen(true)}
              className="emerald-gradient-cta font-black text-xs sm:text-sm px-3.5 py-2 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-base">add_card</span>
              <span>{lang === 'FA' ? 'شارژ سریع' : lang === 'ZH' ? '快速充值' : 'Quick Deposit'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAiChatOpen(true)}
              aria-label="اعلانات و پشتیبانی آنلاین"
              className="w-10 h-10 rounded-xl bg-[#121722] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/35 text-amber-300 flex items-center justify-center relative cursor-pointer transition-colors shrink-0"
              title="پشتیبانی ۲۴/۷ و اعلانات قرعه‌کشی"
            >
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" />
            </button>

            {/* Dedicated User VIP Panel Button */}
            <button
              type="button"
              data-testid="nav-user-panel"
              onClick={() => navigateTo('user-panel')}
              className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                activeRoute === 'user-panel'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-[#121722] hover:bg-[#181f2e] border-amber-500/35 text-white'
              }`}
            >
              <img
                src={LUXURY_IMAGES.vipAvatar}
                alt="VIP Profile"
                className="w-7 h-7 rounded-full object-cover border border-amber-400"
              />
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-xs font-black text-white truncate max-w-[110px]">
                  {lang === 'FA' ? 'پنل کاربری VIP' : lang === 'ZH' ? '贵宾中心' : 'VIP Panel'}
                </div>
                <div className="text-[10px] font-bold text-amber-300">
                  {firebaseUser?.displayName || displayName.split(' ')[0] || 'VIP GOLD'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. SUB-HEADER LIVE 15s PRICE ORACLE RIBBON */}
        <div className="bg-[#05070b]/95 border-t border-white/5 px-4 lg:px-8 py-1.5 text-xs">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0" dir="ltr">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  ₿
                </span>
                <span className="text-slate-300 font-bold">BTC</span>
                <span className="font-mono text-white font-black">${fxRates.BTC.toLocaleString('en-US')}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                  💎
                </span>
                <span className="text-slate-300 font-bold">TON</span>
                <span className="font-mono text-sky-300 font-black">${fxRates.TON}</span>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#101520] border border-white/5">
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center">
                  T
                </span>
                <span className="text-slate-300 font-bold">TRX</span>
                <span className="font-mono text-rose-300 font-black">${fxRates.TRX}</span>
              </div>

              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25"
                data-testid="oracle-toman-rate"
              >
                <span className="text-slate-200 font-bold">USDT/IRT:</span>
                <strong className="text-amber-300 font-mono">
                  {toPersianDigits(fxRates.TOMAN.toLocaleString('en-US'))} T
                </strong>
              </div>

              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
                data-testid="oracle-cny-rate"
              >
                <span className="text-slate-200 font-bold">CNY:</span>
                <strong className="text-emerald-300 font-mono">
                  {toPersianDigits(cnyToman.toLocaleString('en-US'))} T
                </strong>
                <span className="text-slate-400 font-mono">(¥{fxRates.CNY})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {killSwitchActive && (
                <span className="px-2.5 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 font-black animate-pulse">
                  🚨 KILL-SWITCH FROZEN
                </span>
              )}

              <button
                type="button"
                onClick={refreshPriceOracleNow}
                data-testid="live-oracle-indicator"
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shrink-0 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                title="Click to force immediate TetherLand / Wallex / Binance Oracle refresh"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Oracle Connected</span>
                <span
                  data-testid="oracle-countdown"
                  className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200"
                >
                  00:{String(oracleCountdownSec).padStart(2, '0')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3. NATIVE MOBILE 5-TAB BOTTOM GLASS DOCK */}
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
            labelFa: 'خرید بلیت',
            labelEn: 'Tickets',
            labelZh: '购票',
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
            id: 'user-panel' as AppRoute,
            labelFa: 'پنل VIP',
            labelEn: 'VIP Panel',
            labelZh: '贵宾',
            icon: 'workspace_premium',
            activeMatch: activeRoute === 'user-panel',
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.id)}
            className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              tab.activeMatch ? 'text-amber-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.activeMatch && (
              <span className="absolute top-0 inset-x-4 h-[2.5px] rounded-b-full bg-amber-400 shadow-[0_2px_12px_#f59e0b]" />
            )}
            <span
              className="material-symbols-outlined text-[22px]"
              style={tab.activeMatch ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[11px] font-black tracking-tight">
              {lang === 'EN' ? tab.labelEn : lang === 'ZH' ? tab.labelZh : tab.labelFa}
            </span>
          </button>
        ))}

        {/* 5th Tab: منو و کیف پول ☰ */}
        <button
          type="button"
          onClick={() => setMoreDrawerOpen(true)}
          className={`relative h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            moreDrawerOpen ? 'text-amber-400' : 'text-slate-300 hover:text-white'
          }`}
        >
          {moreDrawerOpen && (
            <span className="absolute top-0 inset-x-4 h-[2.5px] rounded-b-full bg-amber-400 shadow-[0_2px_12px_#f59e0b]" />
          )}
          <span className="material-symbols-outlined text-[22px]">menu</span>
          <span className="text-[11px] font-black tracking-tight">
            {lang === 'EN' ? 'Menu' : lang === 'ZH' ? '菜单' : 'منو ☰'}
          </span>
        </button>
      </nav>

      {/* 4. UNIFIED HAMBURGER DRAWER (Exclusive Home of Wallet Balance + Language Switcher + Full Navigation) */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-[#090c14] border-r border-amber-500/35 h-full overflow-y-auto p-5 flex flex-col justify-between space-y-6 shadow-[0_0_80px_rgba(0,0,0,0.95)]">
            <div className="space-y-5">
              {/* Top Profile Header inside Drawer */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div
                  onClick={() => handleNavigateFromDrawer('user-panel')}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={LUXURY_IMAGES.vipAvatar}
                    alt={displayName}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  />
                  <div>
                    <div className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                      {displayName}
                    </div>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                      👑 VIP GOLD (مشاهده پنل کاربری ←)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreDrawerOpen(false)}
                  aria-label="بستن منو"
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* EXCLUSIVE SECTION 1: WALLET BALANCE CARD INSIDE HAMBURGER MENU */}
              <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 p-5 space-y-4 shadow-xl">
                <img
                  src={LUXURY_IMAGES.goldCoins}
                  alt="Wallet Background"
                  className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#161c2e]/95 via-[#0d111c]/95 to-[#1a1306]/95 pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                      <span>موجودی کیف پول چندارزی شما</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold">
                      آماده برداشت آنی
                    </span>
                  </div>

                  <div className="bg-[#080b12]/90 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-300 font-bold">موجودی به واحد انتخابی:</div>
                      <div
                        data-testid="navbar-balance"
                        className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-0.5"
                      >
                        {formatAmount(balanceUsdt)}
                      </div>
                    </div>
                    <div className="text-left" dir="ltr">
                      <div className="text-xs text-slate-400">USDT Value</div>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreDrawerOpen(false);
                        setDepositModalOpen(true);
                      }}
                      className="emerald-gradient-cta font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add_card</span>
                      <span>+ افزایش موجودی (واریز)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="navbar-withdraw-btn"
                      onClick={() => handleNavigateFromDrawer('withdraw')}
                      className="gold-gradient-cta font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">payments</span>
                      <span>برداشت آنی جوایز</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                    <div className="bg-[#090c14]/90 rounded-xl p-2 border border-white/5">
                      <span className="text-[11px] text-slate-300 block">بلیت‌های شما</span>
                      <span className="text-sm font-black text-white font-mono">{tickets.length}</span>
                    </div>
                    <div className="bg-[#090c14]/90 rounded-xl p-2 border border-white/5">
                      <span className="text-[11px] text-slate-300 block">مجموع بردها</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        ${totalWinningsUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-[#090c14]/90 rounded-xl p-2 border border-white/5">
                      <span className="text-[11px] text-slate-300 block">سطح VIP</span>
                      <span className="text-sm font-black text-amber-400">Gold ۸۶٪</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXCLUSIVE SECTION 2: LANGUAGE & LIVE CURRENCY SWITCHER INSIDE HAMBURGER MENU */}
              <div className="luxury-marble-card rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-base">translate</span>
                    <span>ترجمه زبان سایت و واحد پول زنده</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{lang}</span>
                </div>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label="Multi-currency selector"
                >
                  {(['FA', 'EN', 'ZH'] as CurrencyLang[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      data-testid={`lang-${code}`}
                      onClick={() => setLang(code)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                        lang === code
                          ? 'gold-gradient-cta text-[#241300] border-amber-300 shadow-lg'
                          : 'bg-[#0c101a] text-slate-200 border-white/10 hover:border-amber-500/40'
                      }`}
                    >
                      <span>
                        {code === 'FA' ? '🇮🇷 فارسی (تومان)' : code === 'EN' ? '🇬🇧 English ($)' : '🇨🇳 中文 (¥)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: FULL 12-ROUTE NAVIGATION */}
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-300 px-1">دسترسی سریع به تمام بخش‌های پلتفرم:</div>
                {allRoutes.map((item) => {
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`drawer-nav-${item.id}`}
                      onClick={() => handleNavigateFromDrawer(item.id)}
                      className={`w-full min-h-[54px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/25 to-transparent border border-amber-400/60 text-amber-300'
                          : 'bg-[#101521]/90 hover:bg-[#161d2d] border border-white/10 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-right">
                        <span className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        </span>
                        <div>
                          <div className="text-sm font-black flex items-center gap-1.5">
                            <span>{getLabel(item)}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/35">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">{item.subFa}</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-base text-slate-400">chevron_left</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Security & Support Controls inside Drawer */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              {/* Zero-Trust Admin Security Quick Bar */}
              <div className="bg-[#111623] border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-amber-400">security</span>
                    <span>وضعیت سشن امن ادمین:</span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      stealthCookieAuthorized ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {stealthCookieAuthorized ? 'UNLOCKED (ACTIVE)' : 'LOCKED'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="toggle-stealth-cookie"
                    onClick={() => setStealthCookieAuthorized(!stealthCookieAuthorized)}
                    className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-amber-300 cursor-pointer"
                  >
                    {stealthCookieAuthorized ? '🔒 قفل فوری سشن ادمین' : '🔑 بازگشایی سشن ادمین'}
                  </button>
                  <button
                    type="button"
                    data-testid="visit-decoy-admin"
                    onClick={() => handleNavigateFromDrawer('admin_unauthorized')}
                    className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 cursor-pointer"
                  >
                    تست تله امنیتی /admin
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    setAiChatOpen(true);
                  }}
                  className="py-3 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">support_agent</span>
                  <span>پشتیبانی آنلاین ۲۴/۷</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreDrawerOpen(false);
                    if (firebaseUser) signOutUser();
                    else signInWithGoogle();
                  }}
                  className="py-3 px-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
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
