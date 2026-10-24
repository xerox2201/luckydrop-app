import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  toPersianDigits,
  evaluateZeroLossDrawSolvency,
  getBlockchainExplorerTxUrl,
} from '../utils/lotteryEngine.ts';
import { SUPABASE_SQL_SCHEMA_DDL } from '../services/supabase.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

export const CockpitView: React.FC = () => {
  const {
    rounds,
    deposits,
    adminActionDeposit,
    withdrawals,
    supportMessages,
    killSwitchActive,
    toggleKillSwitch,
    triggerDraw,
    createNewRound,
    toggleRoundSales,
    updateRoundTicketPrice,
    adminActionWithdrawal,
    sendSupportMessage,
    formatAmount,
    fxRates,
    oracleSnapshot,
    oracleCountdownSec,
    oracleMarkupPercent,
    setOracleMarkupPercent,
    refreshPriceOracleNow,
    supabaseConnected,
    firestoreConnected,
    setStealthCookieAuthorized,
    navigateTo,
    officialWallets,
    updateOfficialWallets,
    solvencyMode,
    setSolvencyMode,
    referralEvents,
    rolloverReservePoolUsdt,
    chestsClaimedCount,
    telegramBotConfig,
    telegramAlertsLog,
    updateTelegramBotConfig,
    sendTestTelegramAlert,
  } = useLottery();

  const [walletDraft, setWalletDraft] = useState(officialWallets);
  const [walletSavedBanner, setWalletSavedBanner] = useState<boolean>(false);

  // Admin Telegram Bot Alert State
  const [tgEnabled, setTgEnabled] = useState<boolean>(telegramBotConfig.enabled);
  const [tgBotToken, setTgBotToken] = useState<string>(telegramBotConfig.botToken);
  const [tgChatId, setTgChatId] = useState<string>(telegramBotConfig.adminChatId);
  const [tgBanner, setTgBanner] = useState<string | null>(null);
  const [sendingTgTest, setSendingTgTest] = useState<boolean>(false);

  const handleSaveTelegramBot = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTelegramBotConfig({
      enabled: tgEnabled,
      botToken: tgBotToken,
      adminChatId: tgChatId,
    });
    setTgBanner('✅ تنظیمات ربات اطلاع‌رسان تلگرام اپراتور ذخیره شد!');
    setTimeout(() => setTgBanner(null), 3500);
  };

  const handleTestTelegramAlert = async () => {
    setSendingTgTest(true);
    const res = await sendTestTelegramAlert();
    setSendingTgTest(false);
    setTgBanner(res.note);
    setTimeout(() => setTgBanner(null), 4000);
  };

  const handleSaveOfficialWallets = (e: React.FormEvent) => {
    e.preventDefault();
    updateOfficialWallets(walletDraft);
    setWalletSavedBanner(true);
    setTimeout(() => setWalletSavedBanner(false), 3000);
  };

  // Draw execution state
  const [selectedRoundForDraw, setSelectedRoundForDraw] = useState<string>('#ZRN-8493');
  const [drawing, setDrawing] = useState<boolean>(false);
  const [drawnResult, setDrawnResult] = useState<{
    drawnMain: number[];
    drawnGolden: number;
    hash: string;
  } | null>(null);

  // Create New Round state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('WEEKLY');
  const [newPrice, setNewPrice] = useState<number>(5);
  const [newRtp, setNewRtp] = useState<number>(85);
  const [newJackpot, setNewJackpot] = useState<number>(250000);
  const [creatingRound, setCreatingRound] = useState<boolean>(false);

  // Supabase SQL Schema modal
  const [showSqlSchema, setShowSqlSchema] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Live VIP Customer Chat Console state
  const [activeSessionCode, setActiveSessionCode] = useState<string>('VIP-KAMRAN');
  const [operatorReply, setOperatorReply] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const handleExecuteDraw = async () => {
    setDrawing(true);
    const res = await triggerDraw(selectedRoundForDraw);
    setDrawing(false);
    if (res) {
      setDrawnResult(res);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingRound(true);
    await createNewRound({
      titleFa: newTitle,
      category: newCategory,
      ticketPriceUsdt: newPrice,
      rtpPercent: newRtp,
      jackpotUsdt: newJackpot,
    });
    setCreatingRound(false);
    setNewTitle('');
  };

  const handleSendOperatorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorReply.trim()) return;
    setSendingReply(true);
    await sendSupportMessage(
      activeSessionCode,
      operatorReply,
      'OPERATOR',
      'اپراتور ارشد کاکپیت (Stealth Admin)'
    );
    setSendingReply(false);
    setOperatorReply('');
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_SQL_SCHEMA_DDL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSecureAdminExit = () => {
    setStealthCookieAuthorized(false);
    navigateTo('lobby');
  };

  const sessionMessages = supportMessages.filter((m) => m.sessionCode === activeSessionCode);
  const pendingWithdrawalsCount = withdrawals.filter(
    (w) => w.status === 'pending_review' || w.status === 'broadcasting'
  ).length;
  const pendingDepositsCount = deposits.filter((d) => d.status === 'PENDING_ADMIN').length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Stealth Security Header & Emergency Kill-Switch + 1-Click Zero-Trust Exit */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/45 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <img
          src={LUXURY_IMAGES.cockpitCommandVault}
          alt="Cockpit Vault Background"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#140e20]/92 via-[#0e131f]/88 to-[#1f1118]/92 pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-mono font-bold">
              STEALTH ROUTE: /ops-k82-cockpit
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono">
              {firestoreConnected
                ? 'CLOUD FIRESTORE + EXPRESS SYNCED'
                : supabaseConnected
                ? 'SUPABASE POSTGRESQL CONNECTED'
                : 'PERSISTENT CLOUD ENGINE ACTIVE'}
            </span>
            <button
              type="button"
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/35 text-sky-300 text-xs font-bold hover:bg-sky-500/25 transition-all cursor-pointer"
            >
              {showSqlSchema ? 'بستن اسکیمای SQL' : 'مشاهده SQL Schema & RLS دیتابیس'}
            </button>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            کاکپیت مخفی اپراتور ارشد (Stealth Solo Operator Cockpit)
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
            مدیریت یک‌نفره خزانه‌های سرد و گرم، تایید واریزهای رمزارزی و برداشت‌ها، سپر ضدضرر ۱۰۰٪ استخرها، تنظیم مارک‌آپ اوراکل زنده و اجرای قرعه‌کشی Provably Fair.
          </p>
        </div>

        {/* Right Controls: Emergency Kill-Switch + 1-Click Secure Logout & Cookie Revocation */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div
            className={`rounded-2xl p-4 border flex items-center gap-4 ${
              killSwitchActive
                ? 'bg-red-500/20 border-red-500 text-red-200'
                : 'bg-[#0c1018]/95 border-red-500/35 text-slate-200'
            }`}
          >
            <div>
              <span className="text-xs font-black text-red-400 block">
                کلید اضطراری توقف (Kill-Switch)
              </span>
              <span className="text-[11px] text-slate-300 block">
                {killSwitchActive
                  ? 'فروش بلیت و برداشت مسدود است'
                  : 'پروتکل در مدار عملیاتی نرمال'}
              </span>
            </div>
            <button
              type="button"
              data-testid="cockpit-kill-switch-btn"
              onClick={toggleKillSwitch}
              className={`px-4 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                killSwitchActive
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_25px_rgba(220,38,38,0.5)]'
              }`}
            >
              {killSwitchActive ? 'رفع انسداد' : '🚨 توقف اضطراری'}
            </button>
          </div>

          <button
            type="button"
            data-testid="admin-secure-exit-btn"
            onClick={handleSecureAdminExit}
            className="px-5 py-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            title="ابطال کوکی رمزشده AES-256-GCM و خروج امن به لابی"
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>خروج امن و قفل سشن ادمین</span>
          </button>
        </div>
      </div>

      {/* Optional Supabase PostgreSQL Schema Drawer */}
      {showSqlSchema && (
        <div className="rounded-3xl bg-[#0d111a] border border-sky-500/40 p-6 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-sky-400">SUPABASE POSTGRESQL + ROW LEVEL SECURITY (RLS)</span>
              <h3 className="text-lg font-black text-white">
                اسکیمای کامل جداول (users, lottery_rounds, tickets, transactions, withdrawals)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all"
            >
              {copiedSql ? '✅ کپی شد!' : 'کپی اسکریپت کامل SQL'}
            </button>
          </div>
          <pre
            dir="ltr"
            className="bg-[#070a0f] border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80"
          >
            {SUPABASE_SQL_SCHEMA_DDL}
          </pre>
        </div>
      )}

      {/* Admin Telegram Alert Bot Controller & Live Notification Log */}
      <section
        data-testid="cockpit-telegram-alert-bot-section"
        className="rounded-3xl bg-[#141923] border border-sky-500/40 p-6 space-y-5 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-sky-400 font-mono">
              REAL-TIME TELEGRAM OPERATOR ALERT BOT (DEPOSITS • WITHDRAWALS • TICKETS • LOYALTY CHEST)
            </span>
            <h2 className="text-xl font-black text-white">
              ربات اطلاع‌رسان آنی تلگرام مخصوص اپراتور ارشد + مانیتور صندوقچه ۳٪ ذخیره وفاداری
            </h2>
            <p className="text-xs text-slate-300">
              به محض ثبت حواله واریز جدید، درخواست برداشت، خرید بلیت یا بازگشایی صندوقچه وفاداری، پیام هشدار فوری به اکانت تلگرام شما ارسال و در لاگ زیر ثبت می‌شود.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs font-mono font-bold text-amber-300">
              ذخیره ۳٪ سرریز وفاداری: ${rolloverReservePoolUsdt.toFixed(2)} USDT ({toPersianDigits(chestsClaimedCount)} صندوقچه بازشده)
            </span>
            <button
              type="button"
              data-testid="cockpit-test-telegram-alert-btn"
              disabled={sendingTgTest}
              onClick={handleTestTelegramAlert}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>{sendingTgTest ? 'در حال ارسال...' : 'ارسال پیام تست به تلگرام ادمین'}</span>
            </button>
          </div>
        </div>

        {tgBanner && (
          <div
            data-testid="cockpit-telegram-banner"
            className="p-3.5 rounded-2xl bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-bold"
          >
            {tgBanner}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveTelegramBot} className="lg:col-span-5 space-y-3 bg-[#0b0f18] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">پیکربندی Bot Token و Chat ID اپراتور</span>
              <label className="inline-flex items-center gap-2 text-xs text-emerald-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tgEnabled}
                  onChange={(e) => setTgEnabled(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>ارسال خودکار فعال</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Telegram Bot Token (@BotFather):</label>
              <input
                type="password"
                dir="ltr"
                placeholder="123456789:AAH..."
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                className="w-full bg-[#131824] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Admin Telegram Chat ID:</label>
              <input
                type="text"
                dir="ltr"
                placeholder="e.g. 987654321 or @ZarrinAdminChannel"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                className="w-full bg-[#131824] border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
              />
            </div>

            <button
              type="submit"
              data-testid="save-telegram-config-btn"
              className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-black text-xs transition-all cursor-pointer"
            >
              ذخیره تنظیمات ربات تلگرام ادمین
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-300">
                لاگ زنده هشدارهای ارسال‌شده به اپراتور ({toPersianDigits(telegramAlertsLog.length)} رویداد اخیر)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">24/7 MONITOR ACTIVE</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {telegramAlertsLog.map((alert) => (
                <div
                  key={alert.id}
                  data-testid={`telegram-alert-item-${alert.id}`}
                  className="bg-[#141923] border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold">
                        {alert.eventType}
                      </span>
                      <span className="font-black text-white">{alert.titleFa}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{alert.summaryFa}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="text-emerald-300 font-black">${alert.amountUsdt}</span>
                    <span className="text-slate-500">{alert.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Admin Deposit Approval Queue (Dual-Mode On-Chain Auto + Admin Manual Queue) */}
      <section
        data-testid="cockpit-deposit-approval-section"
        className="rounded-3xl bg-[#141923] border border-amber-500/40 p-6 space-y-5 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              DUAL-MODE CRYPTO DEPOSIT VERIFICATION DESK (ON-CHAIN RPC + MANUAL ADMIN QUEUE)
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              صف تایید واریزهای رمزارزی کاربران ({toPersianDigits(pendingDepositsCount)} حواله در انتظار تایید ادمین)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              کیف پول‌های متصل (TronLink / TON / MetaMask) با تایید مستقیم نود شبکه اتوماتیک شارژ می‌شوند و حواله‌های دستی/صرافی در این صف توسط شما تایید می‌گردند.
            </p>
          </div>

          <button
            type="button"
            data-testid="cockpit-approve-all-deposits-btn"
            onClick={() => adminActionDeposit('ALL', 'approve_all')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 self-start cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            <span>تایید و شارژ دسته‌ای تمام واریزهای در انتظار</span>
          </button>
        </div>

        <div className="space-y-3">
          {deposits.map((dep) => {
            const explorerUrl = getBlockchainExplorerTxUrl(dep.network, dep.txHash);
            return (
              <div
                key={dep.depositCode}
                data-testid={`cockpit-deposit-row-${dep.depositCode}`}
                className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-400">{dep.depositCode}</span>
                    <span className="text-xs font-bold text-white">{dep.userDisplayName}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[11px] font-mono">
                      {dep.network} ({dep.amountCrypto})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-xs font-mono font-black">
                      +${dep.amountUsdt.toLocaleString('en-US')} USDT
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dep.verificationMode === 'ONCHAIN_AUTO'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {dep.verificationMode === 'ONCHAIN_AUTO'
                        ? '⚡ اتصال مستقیم کیف پول / RPC'
                        : '🛡️ حواله دستی (نیازمند تایید ادمین)'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dep.status === 'CREDITED'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : dep.status === 'REJECTED'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      }`}
                    >
                      {dep.status === 'CREDITED'
                        ? '✅ شارژ شده در حساب کاربر'
                        : dep.status === 'REJECTED'
                        ? '❌ رد شده'
                        : '⏳ در انتظار تایید ادمین'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono break-all flex flex-wrap items-center gap-3" dir="ltr">
                    <span>TXID: {dep.txHash}</span>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>[بررسی در کاوشگر بلاکچین]</span>
                    </a>
                    {dep.explorerNote && (
                      <span className="text-slate-300 font-sans" dir="rtl">
                        • {dep.explorerNote}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dep.status === 'PENDING_ADMIN' && (
                    <>
                      <button
                        type="button"
                        data-testid={`approve-deposit-${dep.depositCode}`}
                        onClick={() => adminActionDeposit(dep.depositCode, 'approve')}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
                      >
                        تایید و شارژ حساب کاربر
                      </button>
                      <button
                        type="button"
                        data-testid={`reject-deposit-${dep.depositCode}`}
                        onClick={() => adminActionDeposit(dep.depositCode, 'reject')}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        رد حواله
                      </button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">{dep.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 100% Zero-Loss Solvency Shield & Referral Waterfall Monitor */}
      <section
        data-testid="cockpit-solvency-shield-section"
        className="rounded-3xl bg-[#141923] border border-emerald-500/40 p-6 space-y-5 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              100% ZERO-LOSS MATHEMATICAL SOLVENCY SHIELD & AFFILIATE WATERFALL
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              سپر ضدضرر ۱۰۰٪ استخرها و مدل ریاضی زیرمجموعه‌گیری بدون ریسک
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              پاداش ۲٪ معرف مستقیماً از محل ۱۰٪ کارمزد خانه کسر می‌شود (۸٪ سود خالص قطعی ادمین + ۲٪ پورسانت معرف + ۸۵٪ استخر جایزه + ۳٪ ذخیره سرریز + ۲٪ گس = ۱۰۰٪).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSolvencyMode('AUTO_EXTEND')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                solvencyMode === 'AUTO_EXTEND'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              🛡️ تمدید خودکار تا تکمیل نصاب (AUTO_EXTEND)
            </button>
            <button
              type="button"
              onClick={() => setSolvencyMode('PROPORTIONAL_POOL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                solvencyMode === 'PROPORTIONAL_POOL'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              ⚖️ پرداخت متناسب با فروش واقعی (PROPORTIONAL)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rounds.map((r) => {
            const ticketPrice = Number(r.ticketPriceUsdt) || 5;
            const targetJackpot = Number(r.jackpotUsdt) || 100000;
            const collectedSales = Math.round(targetJackpot * 1.18);
            const solvency = evaluateZeroLossDrawSolvency({
              realCollectedSalesUsdt: collectedSales,
              targetJackpotUsdt: targetJackpot,
              rolloverReserveUsdt: Math.round(targetJackpot * 0.08),
              rtpPercent: Number(r.rtpPercent) || 85,
              solvencyMode,
            });
            return (
              <div
                key={r.roundCode}
                className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-amber-400">{r.roundCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      solvency.isFullyFundedForTarget
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    پوشش نصاب: {solvency.solvencyRatioPercent}%
                  </span>
                </div>
                <div className="text-xs font-black text-white truncate">{r.titleFa}</div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>فروش کل بلیت (${ticketPrice}):</span>
                    <strong className="text-white font-mono">
                      ${solvency.realCollectedSalesUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>سقف مجاز پرداخت (۸۵٪):</span>
                    <strong className="text-emerald-300 font-mono">
                      ${solvency.authorizedMaxPayoutUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>سود خالص تضمین‌شده ادمین:</span>
                    <strong className="text-amber-300 font-mono">
                      +${solvency.guaranteedHouseNetProfitUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/5 text-[10px] text-slate-300">
                  {solvency.isFullyFundedForTarget
                    ? '✅ آماده قرعه‌کشی بدون ۱ سنت ریسک مالی (Loss = $0)'
                    : solvency.recommendedAction === 'AUTO_EXTEND_TIMER'
                    ? '⏳ تمدید خودکار تایمر تا تکمیل نصاب ۸۵٪ فروش واقعی'
                    : '⚖️ پرداخت متناسب با استخر واقعی جمع‌آوری شده (Loss = $0)'}
                </div>
              </div>
            );
          })}
        </div>

        {referralEvents.length > 0 && (
          <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-black text-amber-300">
              آخرین تراکنش‌های پورسانت زیرمجموعه‌گیری (کسر شده از ۱۰٪ کارمزد خانه — ریسک خزانه: صفر):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {referralEvents.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="bg-[#141923] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{ev.buyerDisplayName}</span>
                    <span className="text-slate-400 mx-1">← معرف:</span>
                    <span className="font-mono text-amber-300">{ev.referrerCode}</span>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-300">
                    پورسانت: +${ev.commissionUsdt} | سود خانه: +${ev.netHouseProfitUsdt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Live Oracle Markup & Exchange Rate Controller */}
      <section className="rounded-3xl bg-[#141923] border border-amber-500/30 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              REAL-TIME DYNAMIC PRICE ORACLE ({oracleSnapshot?.source || 'TetherLand + Wallex + Binance Live'})
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              نرخ لحظه‌ای بازار آزاد تتر/تومان، یوآن چین و رمزارزها (بروزرسانی هر ۱۵ ثانیه)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              بروزرسانی بعدی: <strong className="text-emerald-300">{oracleCountdownSec}s</strong>
            </span>
            <button
              type="button"
              onClick={() => refreshPriceOracleNow()}
              className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>فراخوانی فوری اوراکل</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 space-y-2 bg-[#0b0f18] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">ضریب مارک‌آپ نرخ فیات (Toman / CNY):</span>
              <span className="font-mono font-black text-amber-400">
                {oracleMarkupPercent >= 0 ? `+${oracleMarkupPercent}%` : `${oracleMarkupPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min={-5}
              max={10}
              step={0.5}
              value={oracleMarkupPercent}
              onChange={(e) => setOracleMarkupPercent(Number(e.target.value))}
              aria-label="ضریب مارک‌آپ اوراکل"
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
              <span>-5% Discount</span>
              <span>0% Market Spot (Exact)</span>
              <span>+10% VIP Spread</span>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5" dir="ltr">
            {[
              { pair: 'USDT / TOMAN', val: `${fxRates.TOMAN.toLocaleString('en-US')} T` },
              {
                pair: '1 CNY / TOMAN',
                val: `${Math.round(fxRates.TOMAN / (fxRates.CNY || 6.68)).toLocaleString('en-US')} T`,
              },
              { pair: 'USD / CNY', val: `¥${fxRates.CNY}` },
              { pair: 'BTC / USDT', val: `$${fxRates.BTC.toLocaleString('en-US')}` },
              { pair: 'TON / USDT', val: `$${fxRates.TON.toFixed(3)}` },
              { pair: 'TRX / USDT', val: `$${fxRates.TRX.toFixed(4)}` },
            ].map((item) => (
              <div key={item.pair} className="bg-[#0b0f18] border border-white/10 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-mono block">{item.pair}</span>
                <span className="text-xs font-black text-emerald-300 font-mono mt-1 block">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin Withdrawal Approval & Auto-Sweep Desk */}
      <section className="rounded-3xl bg-[#141923] border border-emerald-500/35 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              ADMIN WITHDRAWAL APPROVAL & HOT-WALLET AUTO-SWEEP DESK
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              صف تایید و تسویه برداشت‌های رمزارزی کاربران ({toPersianDigits(pendingWithdrawalsCount)} در انتظار)
            </h2>
          </div>

          <button
            type="button"
            data-testid="cockpit-sweep-withdrawals-btn"
            onClick={() => adminActionWithdrawal('ALL', 'sweep_all')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 self-start"
          >
            <span className="material-symbols-outlined text-base">done_all</span>
            <span>تسویه دسته‌ای تمام درخواست‌های در انتظار (Auto-Sweep)</span>
          </button>
        </div>

        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div
              key={w.withdrawalCode}
              className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-amber-400">{w.withdrawalCode}</span>
                  <span className="text-xs font-bold text-white">{w.userDisplayName}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[11px] font-mono">
                    {w.network}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      w.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : w.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {w.status === 'completed'
                      ? 'تسویه شده در بلاکچین'
                      : w.status === 'rejected'
                      ? 'رد شده'
                      : w.status === 'broadcasting'
                      ? 'در حال ارسال به نود'
                      : 'در انتظار تایید اپراتور'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono break-all" dir="ltr">
                  To: {w.destinationAddress} • Net: {w.netAmountCrypto} (${w.netAmountUsdt} USDT | Fee: ${w.networkFeeUsdt})
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {w.status !== 'completed' && w.status !== 'rejected' && (
                  <>
                    <button
                      type="button"
                      onClick={() => adminActionWithdrawal(w.withdrawalCode, 'approve')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
                    >
                      تایید و ارسال آنی
                    </button>
                    <button
                      type="button"
                      onClick={() => adminActionWithdrawal(w.withdrawalCode, 'reject')}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold transition-all"
                    >
                      رد درخواست
                    </button>
                  </>
                )}
                <span className="text-[11px] text-slate-500 font-mono">{w.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Hot & Cold Treasury Vault Balances (USDT, TON, TRX, BTC) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'موجودی کیف‌پول گرم و سرد USDT (TRC-20)',
            crypto: '482,910.00 USDT',
            sub: 'Cold: $410,000 • Hot: $72,910',
            badge: 'TRON MULTI-SIG',
          },
          {
            label: 'خزانه شبکه تون تلگرام (TON Vault)',
            crypto: '28,450.00 TON',
            sub: `معادل $${Math.round(28450 * fxRates.TON).toLocaleString('en-US')} USDT`,
            badge: 'TON SHARDED',
          },
          {
            label: 'موجودی گس و نقدینگی ترون (TRX Gas Pool)',
            crypto: '640,000 TRX',
            sub: `معادل $${Math.round(640000 * fxRates.TRX).toLocaleString('en-US')} USDT`,
            badge: 'ENERGY STAKED',
          },
          {
            label: 'ذخیره استراتژیک بیت‌کوین (Ledger Cold)',
            crypto: '3.42 BTC',
            sub: `معادل $${Math.round(3.42 * fxRates.BTC).toLocaleString('en-US')} USDT`,
            badge: 'HARDWARE VAULT',
          },
        ].map((vault) => (
          <div
            key={vault.label}
            className="rounded-3xl bg-[#141923] border border-white/10 p-5 space-y-2 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                {vault.badge}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-xs text-slate-400">{vault.label}</div>
            <div className="text-xl font-black text-white font-mono">{vault.crypto}</div>
            <div className="text-[11px] text-slate-400">{vault.sub}</div>
          </div>
        ))}
      </section>

      {/* Official Site Deposit Wallets & Cold Treasury Address Manager */}
      <section className="rounded-3xl bg-[#141923] border border-amber-500/40 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              OFFICIAL MULTI-CHAIN DEPOSIT & COLD TREASURY WALLETS
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              تنظیمات کیف پول‌های رسمی سایت (درگاه واریز ۵ شبکه + آدرس خزانه سرد ادمین)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              هر تغییری در آدرس‌های زیر بلافاصله در صفحه واریز کاربران (`/deposit`)، مودال شارژ سریع و بخش تسویه سود خزانه (`/admin/finances`) اعمال می‌شود.
            </p>
          </div>
          {walletSavedBanner && (
            <span className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
              ✅ آدرس کیف پول‌های رسمی سایت با موفقیت ذخیره و همگام‌سازی شد!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveOfficialWallets} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'USDT_TRC20' as const, label: 'کیف پول رسمی تتر (USDT - TRC20):' },
              { key: 'TON' as const, label: 'کیف پول رسمی تون تلگرام (TON Network):' },
              { key: 'TRX' as const, label: 'کیف پول رسمی ترون (TRX Native):' },
              { key: 'BNB' as const, label: 'کیف پول رسمی بایننس (BNB Smart Chain - BEP20):' },
              { key: 'BTC' as const, label: 'کیف پول رسمی بیت‌کوین (BTC Native SegWit):' },
              { key: 'COLD_TREASURY' as const, label: 'کیف پول سرد سود ۱۰٪ ادمین (Ledger Cold Treasury):' },
            ].map((item) => (
              <div key={item.key} className="bg-[#0b0f18] border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">{item.label}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={walletDraft[item.key]}
                  onChange={(e) =>
                    setWalletDraft((prev) => ({ ...prev, [item.key]: e.target.value }))
                  }
                  className="w-full bg-[#131824] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              data-testid="save-official-wallets-btn"
              className="px-6 py-3 rounded-2xl gold-gradient-cta text-[#241300] font-black text-xs sm:text-sm cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              <span>ذخیره و بروزرسانی کیف پول‌های رسمی سایت</span>
            </button>
          </div>
        </form>
      </section>

      {/* Provably Fair Draw Execution Trigger + Create New Lottery Round */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Right 7 Cols: Provably Fair Draw Execution Trigger & Active Rounds Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Provably Fair Animated Draw Trigger */}
          <div className="rounded-3xl bg-[#141923] border border-amber-500/35 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400">PROVABLY FAIR DRAW ENGINE</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  اجرای قرعه‌کشی و استخراج گوی‌های برنده (SHA-256)
                </h2>
              </div>
              <select
                value={selectedRoundForDraw}
                onChange={(e) => setSelectedRoundForDraw(e.target.value)}
                aria-label="انتخاب دور قرعه‌کشی"
                className="bg-[#0b0f18] border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
              >
                {rounds.map((r) => (
                  <option key={r.roundCode} value={r.roundCode}>
                    {r.roundCode} — {r.titleFa}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              با فشردن دکمه زیر، موتور HMAC-SHA256 بذر سرور و هش بلاک فعلی را ترکیب کرده و ۵ گوی اصلی + ۱ گوی طلایی را بدون دخالت انسانی استخراج و در دیتابیس ثبت می‌کند.
            </p>

            <button
              type="button"
              disabled={drawing}
              data-testid="execute-provably-fair-draw"
              onClick={handleExecuteDraw}
              className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">casino</span>
              <span>
                {drawing
                  ? 'در حال استخراج هش بلاک و گوی‌های برنده...'
                  : 'اجرای رسمی قرعه‌کشی و انتشار هش در بلاکچین'}
              </span>
            </button>

            {drawnResult && (
              <div
                data-testid="drawn-balls-result"
                className="bg-[#0a0e16] border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">✅ نتیجه قرعه‌کشی با موفقیت در بلاکچین ثبت شد:</span>
                  <span className="font-mono text-slate-400">{selectedRoundForDraw}</span>
                </div>
                <div className="flex items-center justify-center gap-2.5 py-1" dir="ltr">
                  {drawnResult.drawnMain.map((num) => (
                    <span
                      key={num}
                      className="w-10 h-10 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-sm flex items-center justify-center"
                    >
                      {String(num).padStart(2, '0')}
                    </span>
                  ))}
                  <span className="text-amber-400 font-black">+</span>
                  <span className="w-11 h-11 rounded-full lottery-ball-purple text-white font-mono font-black text-sm flex items-center justify-center border border-amber-300">
                    ★{String(drawnResult.drawnGolden).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 break-all">
                  Audit Hash: <span className="text-emerald-300">{drawnResult.hash}</span>
                </div>
              </div>
            )}
          </div>

          {/* Create New Lottery Round Form */}
          <form
            onSubmit={handleCreateRound}
            className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-4"
          >
            <h3 className="text-lg font-black text-white">تعریف دور جدید قرعه‌کشی در قرارداد هوشمند</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">عنوان قرعه‌کشی:</label>
                <input
                  type="text"
                  placeholder="مثلاً: جک‌پات ویژه نوروز (۱۰ شمش طلا)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">دسته‌بندی استخر:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="WEEKLY">هفتگی (Mega Weekly)</option>
                  <option value="DAILY">روزانه (Daily Blitz)</option>
                  <option value="TURBO">ساعتی (Hourly Flash)</option>
                  <option value="TON_SPECIAL">ویژه تون تلگرام (TON Special)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">قیمت بلیط (USDT):</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">جایزه کل استخر (USDT):</label>
                <input
                  type="number"
                  value={newJackpot}
                  onChange={(e) => setNewJackpot(Number(e.target.value))}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                نرخ RTP بازگشت جوایز: <strong className="text-emerald-400">{newRtp}%</strong> (سود خالص اپراتور: ۱۰٪)
              </span>
              <button
                type="submit"
                disabled={creatingRound}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                {creatingRound ? 'در حال ثبت...' : '+ ایجاد و انتشار استخر جدید'}
              </button>
            </div>
          </form>

          {/* Manage Existing Rounds Status & Ticket Price */}
          <div className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-3">
            <h3 className="text-base font-black text-white">
              مدیریت استخرهای همزمان و قیمت بلیط ({toPersianDigits(rounds.length)})
            </h3>
            <div className="space-y-2.5">
              {rounds.map((r) => (
                <div
                  key={r.roundCode}
                  className="bg-[#0b0f18] border border-white/5 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-black text-white">
                      {r.titleFa} <span className="font-mono text-amber-400">({r.roundCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      جک‌پات: {formatAmount(Number(r.jackpotUsdt))} • اعداد برنده فعلی:{' '}
                      <span className="font-mono text-emerald-300">
                        [{r.winningNumbers}] + ★{r.winningGoldenBall}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-[#141923] border border-white/10 rounded-xl px-2 py-1">
                      <span className="text-[10px] text-slate-400">قیمت ($):</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        aria-label={`قیمت بلیط ${r.roundCode}`}
                        value={Number(r.ticketPriceUsdt)}
                        onChange={(e) => updateRoundTicketPrice(r.roundCode, Number(e.target.value))}
                        className="w-14 bg-transparent text-xs font-mono text-amber-300 font-bold focus:outline-none text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRoundSales(r.roundCode)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                        r.status?.toUpperCase() === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {r.status?.toUpperCase() === 'ACTIVE' ? 'فعال (توقف فروش)' : 'متوقف (فعال‌سازی)'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right/Left 5 Cols: Live VIP Customer Support Chat Console */}
        <div className="lg:col-span-5 rounded-3xl bg-[#141923] border border-white/10 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400">DIRECT VIP CONCIERGE DESK</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  کنسول گفتگوی زنده با بازیکنان VIP
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                ۳ تیکت فعال
              </span>
            </div>

            {/* Session Selector Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {['VIP-KAMRAN', 'VIP-NASTARAN', 'VIP-AMIR'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveSessionCode(code)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                    activeSessionCode === code
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sessionMessages.map((msg) => {
                const isOperator = msg.senderRole === 'OPERATOR';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      isOperator
                        ? 'bg-amber-500/10 border-amber-500/35 text-amber-100 mr-6'
                        : 'bg-[#0b0f18] border-white/10 text-slate-200 ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{msg.senderName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-amber-300 font-mono">
                        {msg.vipLevel}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                      <span>{msg.walletBalanceLabel}</span>
                      <span>{msg.historySummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operator Direct Reply Box */}
          <form onSubmit={handleSendOperatorReply} className="space-y-3 pt-3 border-t border-white/10">
            <textarea
              rows={3}
              value={operatorReply}
              onChange={(e) => setOperatorReply(e.target.value)}
              placeholder={`ارسال پاسخ مستقیم اپراتور به نشست ${activeSessionCode}...`}
              className="w-full bg-[#0b0f18] border border-white/15 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={sendingReply}
              data-testid="cockpit-send-reply-btn"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>{sendingReply ? 'در حال ارسال...' : 'ارسال پاسخ رسمی و ثبت در پرونده VIP'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
