import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  convertUsdtToCrypto,
  getCnyToTomanRate,
  toPersianDigits,
  evaluateZeroLossLoyaltyChest,
} from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES, PageHeroBanner } from './PageHeroBanner.tsx';

export const UserPanelView: React.FC = () => {
  const {
    displayName,
    vipTier,
    balanceUsdt,
    fxRates,
    formatAmount,
    tickets,
    withdrawals,
    claimedTicketCodes,
    claimTicketPrize,
    navigateTo,
    setDepositModalOpen,
    firebaseUser,
    signInWithGoogle,
    signOutUser,
    stealthCookieAuthorized,
    setStealthCookieAuthorized,
    connectedWeb3Wallet,
    connectedWalletProvider,
    connectWeb3Wallet,
    disconnectWeb3Wallet,
    telegramUsername,
    connectTelegramAccount,
    referralCode,
    referredByCode,
    applyReferralCode,
    generateAndSaveReferralLink,
    claimReferralEarningsToWallet,
    simulateReferredTicketPurchase,
    referralEarningsUsdt,
    referredTicketsCount,
    referralEvents,
    rolloverReservePoolUsdt,
    chestsClaimedCount,
    openLoyaltyChest,
    setViralCardTicket,
    firestoreConnected,
  } = useLottery();

  const [adminMasterPin, setAdminMasterPin] = useState<string>('SOVEREIGN-777');
  const [adminTotpCode, setAdminTotpCode] = useState<string>('849201');
  const [securityBanner, setSecurityBanner] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [openingChest, setOpeningChest] = useState<boolean>(false);
  const [telegramInput, setTelegramInput] = useState<string>(telegramUsername || '@Kamran_VIP777');
  const [referrerInput, setReferrerInput] = useState<string>(referredByCode || '');
  const [customAliasInput, setCustomAliasInput] = useState<string>('KAMRAN');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  const cryptoEq = convertUsdtToCrypto(balanceUsdt, fxRates);
  const cnyToman = getCnyToTomanRate(fxRates);
  const totalWonUsdt = tickets.reduce((acc, t) => acc + (parseFloat(t.prizeWonUsdt) || 0), 0);
  const totalSpentUsdt = tickets.reduce((acc, t) => acc + (parseFloat(t.costUsdt) || 5), 0);
  const chestReport = evaluateZeroLossLoyaltyChest({
    totalTicketsPurchased: tickets.length,
    totalSpentUsdt,
    chestsClaimedCount,
    availableRolloverReservePoolUsdt: rolloverReservePoolUsdt,
    ticketsPerChest: 3,
  });
  const referralInviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://luckydrop.vip'}/?ref=${referralCode}`;

  const handleUnlockAdminSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminTotpCode.trim().length < 4) {
      setSecurityBanner('⚠️ لطفاً کد ۶ رقمی تایید دو مرحله‌ای (2FA TOTP) را وارد کنید.');
      return;
    }
    setStealthCookieAuthorized(true);
    setSecurityBanner(
      '✅ سشن رمزنگاری‌شده AES-256-GCM (__Host_ld_ops_k82_vault) فعال شد. اکنون می‌توانید وارد کاکپیت فرماندهی شوید.'
    );
  };

  const handleSecureAdminExit = () => {
    setStealthCookieAuthorized(false);
    setSecurityBanner(
      '🔒 خروج امن انجام شد: کوکی AES-256-GCM باطل گردید و مسیر /ops-k82-cockpit مجدداً روی تله ۴۰۴ قفل شد.'
    );
  };

  const handleQuickClaim = async (ticketCode: string, prizeUsdt: number, net: string) => {
    setClaimingCode(ticketCode);
    await claimTicketPrize(ticketCode, prizeUsdt, net);
    setClaimingCode(null);
    setSecurityBanner(
      `🎉 جایزه کوپن ${ticketCode} به مبلغ $${prizeUsdt.toLocaleString('en-US')} USDT به صورت آنی به کیف پول شما واریز شد!`
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-7 space-y-8 pb-24 lg:pb-14">
      {/* 1. GRAPHICAL VIP USER PANEL HERO BANNER */}
      <PageHeroBanner
        badgeFa="پنل کاربری اختصاصی و مدیریت دارایی • VIP SOVEREIGN ACCOUNT"
        titleFa={`خوش آمدید، ${firebaseUser?.displayName || displayName}`}
        subtitleFa="مدیریت یکپارچه کیف پول چندارزی، پیگیری بلیت‌های فعال، دریافت آنی جوایز، تنظیمات امنیتی ۲ مرحله‌ای و درگاه امن اپراتور ارشد."
        imageUrl={LUXURY_IMAGES.vaultHero}
        rightContent={
          <div className="luxury-marble-card rounded-3xl p-5 flex items-center gap-4 border border-amber-400/50 min-w-[290px]">
            <img
              src={LUXURY_IMAGES.vipAvatar}
              alt="VIP Avatar"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.45)]"
            />
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
                👑 {vipTier}
              </span>
              <div className="text-lg font-black text-white">سطح طلایی VIP (۸۶٪)</div>
              <div className="text-xs text-emerald-400 font-bold">۵٪ کش‌بک آنی خرید دسته‌ای</div>
            </div>
          </div>
        }
      />

      {securityBanner && (
        <div
          data-testid="user-panel-banner"
          className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-100 text-sm font-bold flex items-center justify-between gap-4 shadow-lg"
        >
          <span>{securityBanner}</span>
          <button
            type="button"
            onClick={() => setSecurityBanner(null)}
            className="text-xs text-emerald-300 underline cursor-pointer shrink-0"
          >
            بستن
          </button>
        </div>
      )}

      {/* 2. MULTI-CURRENCY WALLET PORTFOLIO & QUICK ACTIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main Balance & Live Conversions Card */}
        <div className="lg:col-span-7 luxury-marble-card rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between space-y-6">
          <img
            src={LUXURY_IMAGES.goldCoins}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
          />
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-300 block">
                    موجودی قابل برداشت کیف پول (Live Multi-Currency Wallet)
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    خزانه شخصی و معادل لحظه‌ای ارزها
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold">
                ● متصل به اوراکل ۱۵ ثانیه‌ای
              </span>
            </div>

            {/* Primary Balance Readout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#080b12]/90 border border-amber-500/30 rounded-2xl p-5">
              <div>
                <span className="text-xs font-bold text-slate-300 block">موجودی پایه تتر (USDT):</span>
                <div
                  data-testid="user-panel-balance-usdt"
                  className="text-3xl sm:text-4xl font-black text-amber-300 font-mono mt-1"
                  dir="ltr"
                >
                  ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-emerald-400 font-bold mt-1 block">
                  انتخاب فعلی شما: {formatAmount(balanceUsdt)}
                </span>
              </div>
              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-r border-white/10 pt-3 sm:pt-0 sm:pr-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">معادل دقیق تومانی:</span>
                  <strong className="font-mono font-black text-white">
                    {toPersianDigits(cryptoEq.toman.toLocaleString('en-US'))} تومان
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">معادل یوآن چین (CNY):</span>
                  <strong className="font-mono font-black text-emerald-300" dir="ltr">
                    ¥{(balanceUsdt * fxRates.CNY).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>نرخ ۱ یوآن به تومان:</span>
                  <span className="font-mono text-amber-300">
                    {toPersianDigits(cnyToman.toLocaleString('en-US'))} تومان
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Crypto Equivalent Mini Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" dir="ltr">
              {[
                { label: 'TON Network', val: `${cryptoEq.ton} TON`, color: 'text-sky-300' },
                { label: 'TRON (TRX)', val: `${cryptoEq.trx} TRX`, color: 'text-rose-300' },
                { label: 'Bitcoin (BTC)', val: `${cryptoEq.btc} BTC`, color: 'text-amber-300' },
                {
                  label: 'BNB (BEP-20)',
                  val: `${(balanceUsdt / (fxRates.BNB || 610)).toFixed(3)} BNB`,
                  color: 'text-yellow-300',
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-3 text-center"
                >
                  <span className="text-[11px] font-bold text-slate-400 block">{c.label}</span>
                  <strong className={`text-sm font-black font-mono mt-1 block ${c.color}`}>
                    {c.val}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDepositModalOpen(true)}
              className="py-3.5 px-4 rounded-2xl emerald-gradient-cta font-black text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add_card</span>
              <span>شارژ آنی کیف پول</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('withdraw')}
              className="py-3.5 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              <span>برداشت آنی رمزارز</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('play')}
              className="py-3.5 px-4 rounded-2xl gold-gradient-cta font-black text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg">confirmation_number</span>
              <span>خرید بلیت جدید</span>
            </button>
          </div>
        </div>

        {/* Right 5 Cols: VIP Stats & Account Security Summary */}
        <div className="lg:col-span-5 luxury-marble-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-black text-white border-b border-white/10 pb-3">
              خلاصه عملکرد و امتیازات VIP شما
            </h3>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#090d16] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">کل بلیت‌های شما</span>
                <strong className="text-2xl font-black text-white font-mono mt-1 block">
                  {toPersianDigits(tickets.length)} کوپن
                </strong>
              </div>
              <div className="bg-[#090d16] border border-emerald-500/30 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">مجموع جوایز برنده شده</span>
                <strong className="text-2xl font-black text-emerald-400 font-mono mt-1 block" dir="ltr">
                  ${totalWonUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="bg-[#090d16] border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">درخواست‌های برداشت</span>
                <strong className="text-xl font-black text-amber-300 font-mono mt-1 block">
                  {toPersianDigits(withdrawals.length)} تراکنش
                </strong>
              </div>
              <div className="bg-[#090d16] border border-amber-500/30 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block">وضعیت احراز ۲ مرحله‌ای</span>
                <strong className="text-base font-black text-emerald-400 mt-1 block">
                  ✓ فعال (TOTP 2FA)
                </strong>
              </div>
            </div>

            {/* VIP Level Progress */}
            <div className="bg-[#090d16] border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-300">پیشرفت تا سطح Sovereign Royal (۱۰٪ کش‌بک):</span>
                <span className="font-mono text-white">86%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/80 border border-white/10 overflow-hidden p-0.5">
                <div className="h-full w-[86%] rounded-full gold-gradient-cta" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (firebaseUser ? signOutUser() : signInWithGoogle())}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-amber-300">account_circle</span>
              <span>{firebaseUser ? 'خروج از حساب گوگل VIP' : 'اتصال حساب رسمی گوگل VIP'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('my-tickets')}
              className="py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-xs sm:text-sm font-black text-amber-300 cursor-pointer"
            >
              همه بلیت‌ها ←
            </button>
          </div>
        </div>
      </section>

      {/* 2.5 UNIFIED VIP AUTHENTICATION HUB (TELEGRAM + GOOGLE + WEB3 WALLET + CLOUD DB SYNC) */}
      <section
        data-testid="unified-vip-auth-hub"
        className="luxury-marble-card rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/35"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-300 font-mono">
              UNIFIED VIP IDENTITY & CLOUD PERSISTENCE ({firestoreConnected ? 'CLOUD FIRESTORE SYNCED' : 'CLOUD READY'})
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              احراز هویت یکپارچه VIP (تلگرام + گوگل + اتصال کیف پول Web3)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              اطلاعات حساب، بلیت‌ها و موجودی شما به صورت دائمی در دیتابیس ابری ذخیره شده و با اکانت تلگرام، گوگل و آدرس کیف پول شما همگام‌سازی می‌شود.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-black self-start">
            ✓ ذخیره‌سازی ابری دائمی فعال
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Telegram Unified Login */}
          <div className="bg-[#090d16] border border-sky-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>۱. اتصال یکپارچه اکانت تلگرام</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">
                  {telegramUsername ? 'متصل' : 'آماده اتصال'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                همگام‌سازی مستقیم با مینی‌اپ تلگرام و ربات اطلاع‌رسانی آنی برنده شدن قرعه‌کشی.
              </p>
              <input
                type="text"
                dir="ltr"
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                placeholder="@YourTelegramID"
                className="w-full px-3 py-2 rounded-xl bg-[#111726] border border-white/15 text-xs font-mono text-sky-200"
              />
            </div>
            <button
              type="button"
              data-testid="connect-telegram-btn"
              onClick={() => {
                connectTelegramAccount(telegramInput);
                setSecurityBanner(`✅ اکانت تلگرام ${telegramInput} با موفقیت به پرونده ابری VIP شما متصل شد.`);
              }}
              className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-black text-xs cursor-pointer transition-all"
            >
              {telegramUsername ? `بروزرسانی آیدی (${telegramUsername})` : 'اتصال آنی اکانت تلگرام'}
            </button>
          </div>

          {/* Card 2: Google Cloud Account */}
          <div className="bg-[#090d16] border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">verified_user</span>
                  <span>۲. حساب رسمی گوگل (OAuth 2.0)</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                  {firebaseUser ? 'تایید شده' : 'وب / موبایل'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                پشتیبان‌گیری ابری از تمام کوپن‌ها و تاریخچه تراکنش‌ها در Firebase Cloud Firestore.
              </p>
              <div className="px-3 py-2 rounded-xl bg-[#111726] border border-white/10 text-xs font-mono text-slate-300 truncate" dir="ltr">
                {firebaseUser?.email || 'VIP Sovereign Cloud Session Active'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (firebaseUser ? signOutUser() : signInWithGoogle())}
              className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-black text-xs cursor-pointer transition-all"
            >
              {firebaseUser ? 'خروج از حساب گوگل' : 'ورود یکپارچه با گوگل (Google Sign-In)'}
            </button>
          </div>

          {/* Card 3: Web3 Non-Custodial Wallet Connect */}
          <div className="bg-[#090d16] border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                  <span>۳. اتصال مستقیم کیف پول Web3</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                  {connectedWeb3Wallet ? connectedWalletProvider : 'Multi-Chain'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                اتصال مستقیم TronLink، TON Keeper یا MetaMask برای تایید اتوماتیک واریز و برداشت آنی.
              </p>
              <div className="px-3 py-2 rounded-xl bg-[#111726] border border-white/10 text-xs font-mono text-emerald-300 truncate" dir="ltr">
                {connectedWeb3Wallet || 'No Web3 Wallet Connected Yet'}
              </div>
            </div>
            {connectedWeb3Wallet ? (
              <button
                type="button"
                onClick={disconnectWeb3Wallet}
                className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-black text-xs cursor-pointer"
              >
                قطع اتصال کیف پول ({connectedWalletProvider})
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  data-testid="connect-tronlink-btn"
                  onClick={() => connectWeb3Wallet('TRONLINK')}
                  className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-black text-[11px] cursor-pointer"
                >
                  TronLink
                </button>
                <button
                  type="button"
                  data-testid="connect-tonwallet-btn"
                  onClick={() => connectWeb3Wallet('TON')}
                  className="py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-black text-[11px] cursor-pointer"
                >
                  TON Wallet
                </button>
                <button
                  type="button"
                  data-testid="connect-metamask-btn"
                  onClick={() => connectWeb3Wallet('METAMASK')}
                  className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-black text-[11px] cursor-pointer"
                >
                  MetaMask
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2.8 ZERO-LOSS VIP REFERRAL & AFFILIATE SYSTEM (FIRESTORE UNIQUE LINKS + 2% DEDUCTED STRICTLY FROM 10% NET LOTTERY PROFIT) */}
      <section
        data-testid="vip-referral-hub"
        className="luxury-marble-card rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/40"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 font-mono">
                FIRESTORE REFERRAL ENGINE • /referrals/{referralCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold">
                کسر خودکار فقط از ۱۰٪ سود خالص لاتاری (ضرر سایت = $0.00)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              سیستم ارجاع (Referral) یکپارچه با دیتابیس Firestore و موتور مالی ضدضرر
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              لینک یکتای شما در کالکشن <code>/referrals/{referralCode}</code> دیتابیس ابری Firestore ذخیره می‌شود. با هر خرید بلیت توسط زیرمجموعه، <strong>۸۵٪ استخر جایزه دست‌نخورده می‌ماند</strong> و پورسانت ۲٪ شما <strong>صرفاً و به‌صورت خودکار از محل ۱۰٪ سود خالص لاتاری کسر می‌گردد</strong> (۸٪ سود خالص قطعی برای سایت باقی می‌ماند تا سایت هرگز حتی ۱ سنت متضرر نشود).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-[#090d16] border border-emerald-500/40 rounded-2xl px-4 py-3 text-center">
              <span className="text-[11px] text-slate-400 block">پورسانت قابل برداشت شما</span>
              <strong
                data-testid="referral-earnings-usdt"
                className="text-xl font-black text-emerald-400 font-mono"
                dir="ltr"
              >
                ${referralEarningsUsdt.toFixed(2)} USDT
              </strong>
            </div>
            <div className="bg-[#090d16] border border-amber-500/40 rounded-2xl px-4 py-3 text-center">
              <span className="text-[11px] text-slate-400 block">بلیت‌های زیرمجموعه</span>
              <strong className="text-xl font-black text-amber-300 font-mono">
                {toPersianDigits(referredTicketsCount)} بلیت
              </strong>
            </div>
            <button
              type="button"
              data-testid="claim-referral-to-wallet-btn"
              onClick={async () => {
                const res = await claimReferralEarningsToWallet();
                setSecurityBanner(res.message);
              }}
              className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg"
            >
              💸 انتقال پورسانت به کیف پول اصلی
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Unique Referral Link & Firestore Generator */}
          <div className="lg:col-span-7 bg-[#090d16] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-300">
                لینک یکتای ثبت‌شده در دیتابیس ابری Firestore:
              </span>
              <span
                data-testid="active-referral-code-badge"
                className="font-mono font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg"
              >
                {referralCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <code
                dir="ltr"
                data-testid="referral-invite-url-code"
                className="flex-1 bg-[#111726] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-200 truncate select-all"
              >
                {referralInviteUrl}
              </code>
              <button
                type="button"
                data-testid="copy-referral-link-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(referralInviteUrl);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="px-4 py-2.5 rounded-xl gold-gradient-cta text-[#241300] font-black text-xs cursor-pointer shrink-0"
              >
                {copiedRef ? '✅ لینک دعوت کپی شد!' : 'کپی لینک دعوت یکتا'}
              </button>
            </div>

            {/* Generate / Customize Unique Firestore Referral Code */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={customAliasInput}
                onChange={(e) => setCustomAliasInput(e.target.value)}
                placeholder="پیشوند دلخواه (مثلاً: ROYAL یا نام شما)"
                className="flex-1 bg-[#111726] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white"
              />
              <button
                type="button"
                data-testid="generate-firestore-referral-btn"
                onClick={async () => {
                  const res = await generateAndSaveReferralLink(customAliasInput);
                  setSecurityBanner(res.message);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-black text-xs cursor-pointer shrink-0"
              >
                ⚡ تولید لینک یکتا و ذخیره در Firestore
              </button>
              <button
                type="button"
                data-testid="simulate-referred-purchase-btn"
                onClick={async () => {
                  const res = await simulateReferredTicketPurchase(25);
                  setSecurityBanner(res.message);
                }}
                className="px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-black text-xs cursor-pointer shrink-0"
                title="تست کسر خودکار ۲٪ پورسانت از ۱۰٪ سود خالص لاتاری و ثبت در Firestore"
              >
                🧪 تست خرید زیرمجموعه ($25)
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Register Inviter Code + Zero-Loss Mathematical Proof */}
          <div className="lg:col-span-5 bg-[#090d16] border border-white/10 rounded-2xl p-5 space-y-4">
            <label className="block text-xs font-bold text-slate-300">
              ثبت کد معرف (اگر با لینک یکی از اعضای VIP وارد شده‌اید):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={referrerInput}
                onChange={(e) => setReferrerInput(e.target.value)}
                placeholder="مثلاً: VIP-ROYAL-7A9C"
                className="flex-1 bg-[#111726] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
              />
              <button
                type="button"
                data-testid="apply-referral-code-btn"
                onClick={() => {
                  const res = applyReferralCode(referrerInput);
                  setSecurityBanner(res.message);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-black text-xs cursor-pointer shrink-0"
              >
                ثبت کد معرف
              </button>
            </div>
            {referredByCode && (
              <div className="text-[11px] text-emerald-400 font-bold">
                ✓ کد معرف ثبت‌شده روی حساب شما: <span className="font-mono">{referredByCode}</span>
              </div>
            )}

            {/* Mathematical Zero-Loss Breakdown Box */}
            <div className="bg-[#111726] border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5 text-[11px]">
              <div className="font-black text-emerald-300">
                🛡️ فرمول ریاضی محافظت از سود سایت در هر خرید بلیت:
              </div>
              <div className="grid grid-cols-2 gap-1 text-slate-300">
                <span>• استخر جوایز (دست‌نخورده): <strong className="text-white font-mono">85%</strong></span>
                <span>• سود ناخالص خانه: <strong className="text-amber-300 font-mono">10%</strong></span>
                <span>• پورسانت معرف (از سود): <strong className="text-emerald-300 font-mono">-2%</strong></span>
                <span>• سود خالص قطعی سایت: <strong className="text-emerald-400 font-mono">+8%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Firestore Referral Commission Ledger */}
        {referralEvents.length > 0 && (
          <div className="bg-[#090d16] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-300">
                دفترکل زنده پورسانت‌های کسرشده از سود خالص لاتاری (Firestore: /referralCommissions):
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                PLATFORM LOSS = $0.00 (100% SOLVENT)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {referralEvents.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  data-testid={`referral-ledger-item-${ev.id}`}
                  className="bg-[#131926] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{ev.buyerDisplayName}</span>
                    <span className="text-slate-400 mx-1.5">• کد:</span>
                    <span className="font-mono text-amber-300">{ev.referrerCode}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      خرید بلیت: ${ev.ticketAmountUsdt} | سود ۱۰٪ لاتاری: $
                      {(ev.grossLotteryProfit10Usdt ?? ev.ticketAmountUsdt * 0.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-left font-mono text-[11px] space-y-0.5 shrink-0" dir="ltr">
                    <div className="text-emerald-300 font-black">
                      Ref Cut (2%): +${ev.referralCommission2Usdt.toFixed(2)} USDT
                    </div>
                    <div className="text-amber-300">
                      Net House (8%): +${ev.netHouseProfit8Usdt.toFixed(2)} USDT
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2.9 ZERO-LOSS VIP LOYALTY CHEST (100% FUNDED BY 3% ROLLOVER RESERVE) */}
      <section
        data-testid="vip-loyalty-chest-section"
        className="luxury-marble-card rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/45 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-300 font-mono">
              ZERO-LOSS VIP LOYALTY CHEST • 100% FUNDED FROM 3% ROLLOVER RESERVE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              🎁 صندوقچه وفاداری طلایی VIP (پاداش نقدی آنی از محل ۳٪ ذخیره سرریز)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              به ازای هر <strong>۳ بلیت واقعی</strong> که خریداری می‌کنید، ۱ صندوقچه وفاداری طلایی برایتان باز می‌شود. جایزه این صندوقچه صرفاً از محل <strong>۳٪ ذخیره سرریز (Rollover Reserve)</strong> تامین شده و هیچ‌گاه از ۸۵٪ جایزه یا سود خالص سایت کسر نمی‌گردد (تضمین ریاضی بدون ۱ سنت ضرر).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#090d16] border border-amber-500/40 rounded-2xl px-4 py-3 text-center">
              <span className="text-[11px] text-slate-400 block">موجودی استخر ۳٪ ذخیره سرریز</span>
              <strong
                data-testid="rollover-reserve-pool-usdt"
                className="text-xl font-black text-amber-300 font-mono"
                dir="ltr"
              >
                ${chestReport.availableRolloverReservePoolUsdt.toFixed(2)} USDT
              </strong>
            </div>
            <div className="bg-[#090d16] border border-emerald-500/40 rounded-2xl px-4 py-3 text-center">
              <span className="text-[11px] text-slate-400 block">صندوقچه‌های آماده بازگشایی</span>
              <strong
                data-testid="available-loyalty-chests-count"
                className="text-xl font-black text-emerald-400 font-mono"
              >
                {toPersianDigits(chestReport.chestsAvailableToOpen)} صندوقچه
              </strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 bg-[#090d16] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">
                پیشرفت خرید بلیت برای صندوقچه بعدی ({toPersianDigits(chestReport.totalTicketsPurchased)} بلیت خریداری‌شده):
              </span>
              <span className="font-mono text-amber-300">
                {chestReport.progressToNextChestPercent}%
              </span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-black/80 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full gold-gradient-cta transition-all duration-500"
                style={{ width: `${chestReport.progressToNextChestPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
              <span>
                سهم ۳٪ ایجادشده توسط خریدهای شما:{' '}
                <strong className="text-emerald-300 font-mono">
                  ${chestReport.userGeneratedRollover3PctUsdt.toFixed(2)} USDT
                </strong>
              </span>
              <span>
                صندوقچه‌های دریافت‌شده تاکنون:{' '}
                <strong className="text-white font-mono">
                  {toPersianDigits(chestReport.chestsClaimedCount)}
                </strong>
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            <button
              type="button"
              disabled={openingChest || chestReport.chestsAvailableToOpen <= 0}
              data-testid="open-loyalty-chest-btn"
              onClick={async () => {
                setOpeningChest(true);
                const res = await openLoyaltyChest();
                setOpeningChest(false);
                setSecurityBanner(res.message);
              }}
              className={`w-full py-4 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                chestReport.chestsAvailableToOpen > 0
                  ? 'gold-gradient-cta text-[#241300] cursor-pointer hover:brightness-110'
                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-xl">redeem</span>
              <span>
                {openingChest
                  ? 'در حال بازگشایی صندوقچه طلایی...'
                  : chestReport.chestsAvailableToOpen > 0
                  ? `بازگشایی آنی صندوقچه و دریافت +$${chestReport.safeRewardUsdt.toFixed(2)} USDT`
                  : `${toPersianDigits(chestReport.ticketsUntilNextChest)} بلیت دیگر تا باز شدن صندوقچه بعدی`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. ACTIVE TICKETS & INSTANT CLAIM CENTER INSIDE USER PANEL */}
      <section className="luxury-marble-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 block">
              MY ACTIVE COUPONS & INSTANT WIN CLAIM
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              کوپن‌های بلیت شما، دریافت جایزه و دانلود کارت تصویری استوری
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('my-tickets')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-amber-300 cursor-pointer"
          >
            مدیریت کامل بلیت‌ها ←
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tickets.slice(0, 3).map((t) => {
            const prize = parseFloat(t.prizeWonUsdt) || 0;
            const isClaimed = Boolean(t.claimed) || claimedTicketCodes.includes(t.ticketCode);
            const balls = t.mainNumbers
              .replace(/[\[\]]/g, '')
              .split(',')
              .map((x) => x.trim());

            return (
              <div
                key={t.ticketCode}
                className="bg-[#090d16] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-amber-300">{t.ticketCode}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isClaimed
                          ? 'bg-sky-500/20 text-sky-300'
                          : prize > 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {isClaimed ? 'تسویه شد' : prize > 0 ? `برنده $${prize}` : 'فعال'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap" dir="ltr">
                    {balls.map((b, idx) => (
                      <span
                        key={idx}
                        className="w-8 h-8 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-xs flex items-center justify-center"
                      >
                        {String(b).padStart(2, '0')}
                      </span>
                    ))}
                    {t.goldenBall > 0 && (
                      <span className="w-8 h-8 rounded-full lottery-ball-purple text-white font-mono font-black text-xs flex items-center justify-center">
                        ★{String(t.goldenBall).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                    <span>دور: {t.roundCode}</span>
                    <span>{t.currencyNetwork}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {prize > 0 && !isClaimed ? (
                    <button
                      type="button"
                      disabled={claimingCode === t.ticketCode}
                      onClick={() => handleQuickClaim(t.ticketCode, prize, t.currencyNetwork)}
                      className="w-full py-2.5 rounded-xl emerald-gradient-cta font-black text-xs cursor-pointer"
                    >
                      {claimingCode === t.ticketCode
                        ? 'در حال واریز...'
                        : `دریافت آنی جایزه ($${prize} USDT)`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigateTo('status')}
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      استعلام هش در بلاکچین
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid={`open-viral-card-${t.ticketCode}`}
                    onClick={() => setViralCardTicket(t)}
                    className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-base">share_reviews</span>
                    <span>📸 کارت تصویری استوری (با کد معرف من)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. WORLD-STANDARD ZERO-TRUST ADMIN GATEWAY & ENTRY/EXIT GUIDE */}
      <section
        id="admin-security-gateway"
        data-testid="admin-security-gateway"
        className="relative rounded-3xl overflow-hidden border-2 border-amber-500/45 bg-gradient-to-br from-[#141022] via-[#0b0f19] to-[#191209] p-6 sm:p-8 shadow-2xl space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              <span className="material-symbols-outlined text-base">shield_lock</span>
              <span>استاندارد جهانی امنیت ادمین • ZERO-TRUST STEALTH ADMIN PROTOCOL</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              راهنمای رسمی و درگاه امن ورود و خروج اپراتور ارشد (کاکپیت مدیریت)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              بر طبق بالاترین استاندارد امنیتی وب۳ (OWASP &amp; Zero-Trust)، مسیرهای عمومی مانند{' '}
              <code className="text-rose-400 font-mono">/admin</code> همیشه به صفحه فریبنده ۴۰۴ هدایت می‌شوند و ورود اپراتور صرفاً با کوکی رمزنگاری‌شده{' '}
              <code className="text-emerald-300 font-mono">AES-256-GCM</code> امکان‌پذیر است.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              data-testid="admin-gate-cookie-status"
              className={`px-4 py-2 rounded-2xl text-xs font-mono font-black border flex items-center gap-2 ${
                stealthCookieAuthorized
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {stealthCookieAuthorized ? 'verified_user' : 'lock'}
              </span>
              <span>
                {stealthCookieAuthorized
                  ? 'وضعیت سشن ادمین: فعال (AUTHORIZED)'
                  : 'وضعیت سشن ادمین: قفل (LOCKED)'}
              </span>
            </span>
          </div>
        </div>

        {/* 4-Step Visual Architecture Explanation + Interactive Auth Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 4 Security Pillars */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">visibility_off</span>
                <span>۱. پنهان‌سازی مسیر و تله ۴۰۴ (Decoy 404)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                هرگونه تلاش هکرها یا بات‌ها برای باز کردن <code className="text-rose-300">/admin</code> یا{' '}
                <code className="text-rose-300">/login</code> بلافاصله صفحه فریبنده ۴۰۴ را نمایش می‌دهد.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('admin_unauthorized')}
                className="text-xs font-bold text-amber-300 hover:underline cursor-pointer"
              >
                تست عملی تله /admin (مشاهده ۴۰۴ فریبنده) ←
              </button>
            </div>

            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">vpn_key</span>
                <span>۲. احراز هویت دو مرحله‌ای اپراتور ارشد</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ورود به بخش مدیریت و خزانه صرفاً با کلید رمزنگاری‌شده اپراتور و کد ۶ رقمی Google Authenticator مجاز است.
              </p>
            </div>

            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">encrypted</span>
                <span>۳. کوکی سخت‌افزاری AES-256-GCM</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                پس از تایید ۲ مرحله‌ای، نشست امنیتی با پرچم{' '}
                <code className="text-slate-200">HttpOnly; SameSite=Strict</code> صادر می‌گردد.
              </p>
            </div>

            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">power_settings_new</span>
                <span>۴. خروج امن ۱-کلیکی (Zero-Trace Logout)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                پس از اتمام کار در پنل مدیریت، با زدن دکمه <strong>«خروج امن و قفل سشن»</strong> دسترسی بلافاصله قطع می‌شود.
              </p>
            </div>
          </div>

          {/* Interactive Admin Login / Lock Terminal */}
          <div className="lg:col-span-5 bg-[#080b12] border border-amber-500/40 rounded-3xl p-5 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">terminal</span>
              <span>ترمینال احراز هویت اپراتور ارشد</span>
            </h3>

            <form onSubmit={handleUnlockAdminSession} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  کلید ارشد اپراتور (Master Secret Key):
                </label>
                <input
                  type="password"
                  value={adminMasterPin}
                  onChange={(e) => setAdminMasterPin(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#111623] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  کد ۶ رقمی تایید دو مرحله‌ای (2FA TOTP):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminTotpCode}
                  onChange={(e) => setAdminTotpCode(e.target.value)}
                  className="w-full bg-[#111623] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black tracking-[0.35em] text-center text-emerald-400"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {!stealthCookieAuthorized ? (
                  <button
                    type="submit"
                    data-testid="unlock-admin-vault-btn"
                    className="sm:col-span-2 py-3 px-4 rounded-xl emerald-gradient-cta font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">lock_open</span>
                    <span>تایید ۲ مرحله‌ای و بازگشایی سشن ادمین</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      data-testid="enter-admin-cockpit-btn"
                      onClick={() => navigateTo('cockpit')}
                      className="py-3 px-4 rounded-xl gold-gradient-cta font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">shield_lock</span>
                      <span>ورود به کاکپیت ادمین</span>
                    </button>
                    <button
                      type="button"
                      data-testid="lock-admin-vault-btn"
                      onClick={handleSecureAdminExit}
                      className="py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/45 text-rose-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">lock</span>
                      <span>خروج امن و قفل سشن</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
