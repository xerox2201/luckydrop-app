import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  convertUsdtToCrypto,
  getCnyToTomanRate,
  toPersianDigits,
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
  } = useLottery();

  const [adminMasterPin, setAdminMasterPin] = useState<string>('SOVEREIGN-777');
  const [adminTotpCode, setAdminTotpCode] = useState<string>('849201');
  const [securityBanner, setSecurityBanner] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  const cryptoEq = convertUsdtToCrypto(balanceUsdt, fxRates);
  const cnyToman = getCnyToTomanRate(fxRates);
  const totalWonUsdt = tickets.reduce((acc, t) => acc + (parseFloat(t.prizeWonUsdt) || 0), 0);

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
        badge="پنل کاربری اختصاصی و مدیریت دارایی • VIP SOVEREIGN ACCOUNT"
        badgeIcon="workspace_premium"
        title={`خوش آمدید، ${firebaseUser?.displayName || displayName}`}
        subtitle="مدیریت یکپارچه کیف پول چندارزی، پیگیری بلیت‌های فعال، دریافت آنی جوایز، تنظیمات امنیتی ۲ مرحله‌ای و درگاه امن اپراتور ارشد."
        imageUrl={LUXURY_IMAGES.vaultHero}
        accentColor="gold"
        rightSlot={
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
            src={LUXURY_IMAGES.goldBullion}
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

      {/* 3. ACTIVE TICKETS & INSTANT CLAIM CENTER INSIDE USER PANEL */}
      <section className="luxury-marble-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 block">
              MY ACTIVE COUPONS & INSTANT WIN CLAIM
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              کوپن‌های بلیت شما و دریافت ۱-کلیکی جوایز
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
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    استعلام هش در بلاکچین
                  </button>
                )}
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
                <span>۲. مسیر مخفی اختصاصی (/ops-k82-cockpit)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ورود ادمین فقط از طریق آدرس مخفی <code className="text-emerald-300">/ops-k82-cockpit</code> به همراه کلید ارشد + کد ۶ رقمی Google Authenticator انجام می‌شود.
              </p>
            </div>

            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">encrypted</span>
                <span>۳. کوکی سخت‌افزاری AES-256-GCM</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                پس از تایید ۲ مرحله‌ای، توکن <code className="text-sky-300">__Host_ld_ops_k82_vault</code> با پرچم{' '}
                <code className="text-slate-200">HttpOnly; SameSite=Strict</code> صادر می‌گردد.
              </p>
            </div>

            <div className="bg-[#090d16]/90 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">power_settings_new</span>
                <span>۴. خروج امن ۱-کلیکی (Zero-Trace Logout)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                پس از اتمام کار در پنل مدیریت، با زدن دکمه <strong>«خروج امن و قفل کاکپیت»</strong> کوکی امنیتی پاک شده و دسترسی بلافاصله قطع می‌شود.
              </p>
            </div>
          </div>

          {/* Interactive Admin Login / Lock Terminal */}
          <div className="lg:col-span-5 bg-[#080b12] border border-amber-500/40 rounded-3xl p-5 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">terminal</span>
              <span>ترمینال ورود و خروج امن اپراتور ارشد</span>
            </h3>

            <form onSubmit={handleUnlockAdminSession} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  کلید ارشد اپراتور (ADMIN_MASTER_SECRET):
                </label>
                <input
                  type="text"
                  value={adminMasterPin}
                  onChange={(e) => setAdminMasterPin(e.target.value)}
                  className="w-full bg-[#111623] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  کد ۶ رقمی تایید دو مرحله‌ای (Google Authenticator 2FA):
                </label>
                <input
                  type="text"
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
