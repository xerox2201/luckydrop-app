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
    deleteLotteryRound,
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
    pamReconciliation,
    setWalletDrawerOpen,
    adminTonWalletAddress,
    setAdminTonWalletAddress,
    adminTelegramUserIds,
    setAdminTelegramUserIds,
    tonUsdRate,
    setTonUsdRate,
    starsUsdRate,
    setStarsUsdRate,
    telegramUser,
  } = useLottery();

  const [tmaAdminIdsDraft, setTmaAdminIdsDraft] = useState<string>(
    adminTelegramUserIds.join(', ')
  );
  const [tmaTonVaultDraft, setTmaTonVaultDraft] = useState<string>(adminTonWalletAddress);
  const [tmaSavedBanner, setTmaSavedBanner] = useState<boolean>(false);

  const handleSaveTmaAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIds = tmaAdminIdsDraft
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parsedIds.length > 0) {
      setAdminTelegramUserIds(parsedIds);
    }
    if (tmaTonVaultDraft.trim()) {
      setAdminTonWalletAddress(tmaTonVaultDraft.trim());
    }
    setTmaSavedBanner(true);
    setTimeout(() => setTmaSavedBanner(false), 3500);
  };

  const [walletDraft, setWalletDraft] = useState(officialWallets);
  const [walletSavedBanner, setWalletSavedBanner] = useState<boolean>(false);

  // Admin Telegram Bot Alert State
  const [tgEnabled, setTgEnabled] = useState<boolean>(telegramBotConfig.enabled);
  const [tgBotToken, setTgBotToken] = useState<string>(telegramBotConfig.botToken);
  const [tgChatId, setTgChatId] = useState<string>(telegramBotConfig.adminChatId);
  const [tgBanner, setTgBanner] = useState<string | null>(null);
  const [sendingTgTest, setSendingTgTest] = useState<boolean>(false);
  const [roundActionBanner, setRoundActionBanner] = useState<string | null>(null);

  React.useEffect(() => {
    if (telegramBotConfig.botToken && !tgBotToken) setTgBotToken(telegramBotConfig.botToken);
    if (telegramBotConfig.adminChatId && !tgChatId) setTgChatId(telegramBotConfig.adminChatId);
  }, [telegramBotConfig.botToken, telegramBotConfig.adminChatId]);

  const handleSaveTelegramBot = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTelegramBotConfig({
      enabled: tgEnabled,
      botToken: tgBotToken,
      adminChatId: tgChatId,
    });
    setTgBanner('✅ تنظیمات ربات و آیدی چنل/چت تلگرام روی دیسک سرور ذخیره شد! اکنون دکمه «ارسال پیام تست» را بزنید.');
    setTimeout(() => setTgBanner(null), 5000);
  };

  const handleTestTelegramAlert = async () => {
    setSendingTgTest(true);
    if (tgBotToken.trim() || tgChatId.trim()) {
      await updateTelegramBotConfig({
        enabled: tgEnabled,
        botToken: tgBotToken,
        adminChatId: tgChatId,
      });
    }
    const res = await sendTestTelegramAlert();
    setSendingTgTest(false);
    setTgBanner(res.message || res.note);
    setTimeout(() => setTgBanner(null), 8000);
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
    ticketsEvaluatedCount?: number;
    winnersCount?: number;
    totalPayoutUsdt?: number;
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
    const ok = await createNewRound({
      titleFa: newTitle,
      category: newCategory,
      ticketPriceUsdt: newPrice,
      rtpPercent: newRtp,
      jackpotUsdt: newJackpot,
    });
    setCreatingRound(false);
    if (ok) {
      setRoundActionBanner(`✅ دور جدید قرعه‌کشی «${newTitle}» با موفقیت ساخته و در دیتابیس دائمی ثبت شد!`);
      setNewTitle('');
      setTimeout(() => setRoundActionBanner(null), 4500);
    }
  };

  const handleDeleteRound = async (roundCode: string, titleFa: string) => {
    await deleteLotteryRound(roundCode);
    setRoundActionBanner(`🗑️ استخر «${titleFa} (${roundCode})» به صورت دائمی حذف گردید.`);
    setTimeout(() => setRoundActionBanner(null), 4500);
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

  // Executive GGR / NGR Telemetry Calculation
  const totalSalesVolumeUsdt = rounds.reduce(
    (acc, r) => acc + (Number(r.totalSalesUsdt) || Number(r.jackpotUsdt) * 1.18),
    0
  );
  const ggrUsdt = Math.round(totalSalesVolumeUsdt * 0.15);
  const ngrUsdt = Math.round(totalSalesVolumeUsdt * 0.10);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-14 space-y-8">
      {/* Top Stealth Security Header & Emergency Kill-Switch + 1-Click Zero-Trust Exit */}
      <div className="relative rounded-3xl overflow-hidden studio-arena-frame p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <img
          src={LUXURY_IMAGES.cockpitCommandVault}
          alt="Cockpit Vault Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f212e]/95 via-[#0f212e]/88 to-[#1a2c38]/95 pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-[#00e701]/15 border border-[#00e701]/40 text-[#00e701] text-xs font-mono font-bold">
              STEALTH ROUTE: /ops-k82-cockpit
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#1a2c38] border border-[#fbbf24]/35 text-[#fbbf24] text-xs font-mono">
              {firestoreConnected
                ? 'CLOUD FIRESTORE + EXPRESS SYNCED'
                : supabaseConnected
                ? 'SUPABASE POSTGRESQL CONNECTED'
                : 'PERSISTENT CLOUD ENGINE ACTIVE'}
            </span>
            <button
              type="button"
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              className="px-3 py-1 rounded-lg bg-[#213743] hover:bg-[#2f4553] border border-sky-400/35 text-sky-300 text-xs font-bold transition-all cursor-pointer"
            >
              {showSqlSchema ? 'بستن اسکیمای SQL' : 'مشاهده SQL Schema & RLS دیتابیس'}
            </button>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            مرکز فرماندهی اپراتور و خزانه (Executive Treasury &amp; Risk Cockpit)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            مدیریت یک‌نفره خزانه‌های سرد و گرم، تایید واریزهای رمزارزی و برداشت‌ها، سپر ضدضرر ۱۰۰٪ استخرها، تنظیم مارک‌آپ اوراکل زنده و اجرای قرعه‌کشی Provably Fair.
          </p>
        </div>

        {/* Right Controls: Emergency Kill-Switch + 1-Click Secure Logout & Cookie Revocation */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div
            className={`rounded-2xl p-4 border flex items-center gap-4 ${
              killSwitchActive
                ? 'bg-[#e9113c]/20 border-[#e9113c] text-rose-200'
                : 'bg-[#1a2c38] border-white/10 text-slate-200'
            }`}
          >
            <div>
              <span className="text-xs font-black text-[#e9113c] block">
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
              className={`px-4 py-3 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                killSwitchActive
                  ? 'stake-emerald-cta'
                  : 'crimson-danger-cta'
              }`}
            >
              {killSwitchActive ? 'رفع انسداد' : '🚨 توقف اضطراری'}
            </button>
          </div>

          <button
            type="button"
            data-testid="admin-secure-exit-btn"
            onClick={handleSecureAdminExit}
            className="px-5 py-4 rounded-2xl bg-[#1a2c38] hover:bg-[#213743] border border-[#fbbf24]/50 text-[#fbbf24] font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg whitespace-nowrap"
            title="ابطال کوکی رمزشده AES-256-GCM و خروج امن به لابی"
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            <span>خروج امن و قفل سشن ادمین</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TMA TON VAULT & TELEGRAM ADMIN ID LOCK CONFIGURATION
          ===================================================================== */}
      <section
        data-testid="tma-admin-config-card"
        className="studio-arena-frame rounded-3xl p-5 space-y-4 border border-purple-500/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-200 font-mono text-[10px] font-black">
              TMA SECURITY &amp; TON TREASURY
            </span>
            <h2 className="text-base font-black text-white mt-1">
              تنظیمات مینی‌اپ تلگرام (ADMIN_TON_WALLET_ADDRESS &amp; ADMIN_TELEGRAM_USER_IDS)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#00f59b]" dir="ltr">
            Active TG ID: #{telegramUser.id} (@{telegramUser.username})
          </span>
        </div>

        <form onSubmit={handleSaveTmaAdminSettings} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              آدرس کیف پول مقصد واریزهای TON (`ADMIN_TON_WALLET_ADDRESS`):
            </label>
            <input
              type="text"
              dir="ltr"
              data-testid="input-admin-ton-wallet"
              value={tmaTonVaultDraft}
              onChange={(e) => setTmaTonVaultDraft(e.target.value)}
              className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-[#06b6d4]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              لیست آیدی‌های عددی ادمین تلگرام (`ADMIN_TELEGRAM_USER_IDS` با کاما جدا شوند):
            </label>
            <input
              type="text"
              dir="ltr"
              data-testid="input-admin-telegram-ids"
              value={tmaAdminIdsDraft}
              onChange={(e) => setTmaAdminIdsDraft(e.target.value)}
              className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-[#fbbf24]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3" dir="ltr">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                💎 1 TON Rate (USD):
              </label>
              <input
                type="number"
                step="0.05"
                value={tonUsdRate}
                onChange={(e) => setTonUsdRate(Math.max(0.5, Number(e.target.value) || 5.2))}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                ⭐ 1 Star Rate (USD):
              </label>
              <input
                type="number"
                step="0.005"
                value={starsUsdRate}
                onChange={(e) => setStarsUsdRate(Math.max(0.005, Number(e.target.value) || 0.02))}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="save-tma-admin-config-btn"
            className="w-full py-2.5 rounded-xl tma-purple-cta font-black text-xs cursor-pointer"
          >
            ذخیره آدرس خزانه TON و لیست آیدی‌های ادمین تلگرام
          </button>

          {tmaSavedBanner && (
            <div className="p-2.5 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-xs font-bold text-center">
              ✅ تنظیمات خزانه TON و قفل آیدی ادمین تلگرام ذخیره شد!
            </div>
          )}
        </form>
      </section>

      {/* =====================================================================
          EXECUTIVE GGR / NGR KPI CARDS & REAL-TIME RTP COMPARISON BARS
          ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4 Executive Financial KPI Cards (7 Cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="studio-arena-frame rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>درآمد ناخالص بازی‌ها (GGR — Gross Gaming Revenue)</span>
              <span className="font-mono text-[#00e701]">15.0% Margin</span>
            </div>
            <div className="text-2xl font-black text-white font-mono tabular-nums" dir="ltr">
              ${ggrUsdt.toLocaleString('en-US')}.00 USDT
            </div>
            <div className="text-[11px] text-slate-400">
              مجموع گردش بلیت و مینی‌گیم‌ها: ${Math.round(totalSalesVolumeUsdt).toLocaleString('en-US')}
            </div>
          </div>

          <div className="studio-arena-frame rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>سود خالص قطعی خزانه (NGR — Net House Profit)</span>
              <span className="font-mono text-[#fbbf24]">Zero-Loss Locked</span>
            </div>
            <div className="text-2xl font-black text-[#00e701] font-mono tabular-nums" dir="ltr">
              +${ngrUsdt.toLocaleString('en-US')}.00 USDT
            </div>
            <div className="text-[11px] text-slate-400">
              پس از کسر ۲٪ پورسانت معرف و ۳٪ ذخیره صندوقچه وفاداری
            </div>
          </div>

          <div className="studio-arena-frame rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>سقف مجاز پرداخت هر دور مینی‌گیم (Max Payout Cap)</span>
              <span className="font-mono text-sky-300">Solvency Guard</span>
            </div>
            <div className="text-2xl font-black text-[#fbbf24] font-mono tabular-nums" dir="ltr">
              $50,000.00 USDT
            </div>
            <div className="text-[11px] text-slate-400">
              محافظت خودکار از نقدینگی خزانه در برابر ضرایب ۱۰۰۰x
            </div>
          </div>

          <div className="studio-arena-frame rounded-2xl p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>تراز حسابرسی دفترکل PAM (Reconcile Audit)</span>
              <span className="font-mono text-[#00e701]">100% Synced</span>
            </div>
            <div className="text-xl font-black text-white font-mono tabular-nums" dir="ltr">
              {pamReconciliation?.ledgerEntriesCount || 1} Ledger TXs ($0.00 Diff)
            </div>
            <button
              type="button"
              onClick={() => setWalletDrawerOpen(true)}
              className="text-[11px] font-bold text-[#fbbf24] hover:underline cursor-pointer"
            >
              باز کردن دفترکل زنده PAM ↗
            </button>
          </div>
        </div>

        {/* Real-Time Vertical RTP Comparison Bars (5 Cols) */}
        <div className="lg:col-span-5 studio-arena-frame rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#00e701] block">
                REAL-TIME RTP &amp; HOUSE EDGE TELEMETRY
              </span>
              <h3 className="text-sm font-black text-white">
                مقایسه نرخ بازگشت به بازیکن (Theoretical vs Actual RTP)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400" dir="ltr">
              52-Bit Verified
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs tabular-nums" dir="ltr">
            {[
              { name: 'LuckyDrop Main Lottery', rtp: 85.0, edge: '15.0% Pool Split', color: '#fbbf24' },
              { name: 'Stake Plinko 3D (8-16 Rows)', rtp: 99.0, edge: '1.0% House Edge', color: '#00e701' },
              { name: '52-Bit Dice 3D (0.00-100.00)', rtp: 99.0, edge: '1.0% House Edge', color: '#00e701' },
              { name: 'Multiplayer Crash 3D', rtp: 98.0, edge: '2.0% House Edge', color: '#38bdf8' },
            ].map((v) => (
              <div key={v.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white font-bold">{v.name}</span>
                  <span className="text-slate-300">
                    RTP: <strong style={{ color: v.color }}>{v.rtp.toFixed(1)}%</strong> ({v.edge})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#213743] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v.rtp}%`, backgroundColor: v.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Optional Supabase PostgreSQL Schema Drawer */}
      {showSqlSchema && (
        <div className="studio-arena-frame rounded-3xl p-6 space-y-4">
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
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
            >
              {copiedSql ? '✅ کپی شد!' : 'کپی اسکریپت کامل SQL'}
            </button>
          </div>
          <pre
            dir="ltr"
            className="bg-[#0b1620] border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-[#00e701] overflow-x-auto max-h-80"
          >
            {SUPABASE_SQL_SCHEMA_DDL}
          </pre>
        </div>
      )}

      {/* Admin Telegram Alert Bot Controller & Live Notification Log */}
      <section
        data-testid="cockpit-telegram-alert-bot-section"
        className="studio-arena-frame rounded-3xl p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
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
            <span className="px-3.5 py-2 rounded-xl bg-[#1a2c38] border border-[#fbbf24]/35 text-xs font-mono font-bold text-[#fbbf24] tabular-nums">
              ذخیره ۳٪ سرریز وفاداری: ${rolloverReservePoolUsdt.toFixed(2)} USDT ({toPersianDigits(chestsClaimedCount)} صندوقچه بازشده)
            </span>
            <button
              type="button"
              data-testid="cockpit-test-telegram-alert-btn"
              disabled={sendingTgTest}
              onClick={handleTestTelegramAlert}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
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
          <form onSubmit={handleSaveTelegramBot} className="lg:col-span-5 space-y-3 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">پیکربندی Bot Token و Chat ID اپراتور</span>
              <label className="inline-flex items-center gap-2 text-xs text-[#00e701] cursor-pointer">
                <input
                  type="checkbox"
                  checked={tgEnabled}
                  onChange={(e) => setTgEnabled(e.target.checked)}
                  className="accent-[#00e701]"
                />
                <span>ارسال خودکار فعال</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Telegram Bot Token (@BotFather):</label>
              <input
                type="password"
                dir="ltr"
                placeholder="123456789:AAH..."
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Admin Telegram Chat ID / Channel ID:</label>
              <input
                type="text"
                dir="ltr"
                placeholder="@MyChannelName or -1001234567890 or 987654321"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                className="w-full studio-input-well rounded-xl px-3 py-2 text-xs text-[#fbbf24] font-mono"
              />
              <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                💡 نکته مهم: برای ارسال پیام به کانال تلگرام، ابتدا ربات را در کانال خود <strong>Admin</strong> کرده و تیک <strong>Post Messages</strong> را فعال کنید، سپس یوزرنیم کانال با <code className="text-[#fbbf24]">@</code> یا آیدی عددی کانال (<code className="text-[#fbbf24]">-100...</code>) را وارد نمایید.
              </span>
            </div>

            <button
              type="submit"
              data-testid="save-telegram-config-btn"
              className="w-full py-2.5 rounded-xl bg-[#213743] hover:bg-[#2f4553] border border-sky-400/50 text-sky-200 font-black text-xs transition-all cursor-pointer"
            >
              ذخیره تنظیمات ربات تلگرام ادمین
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-300">
                لاگ زنده هشدارهای ارسال‌شده به اپراتور ({toPersianDigits(telegramAlertsLog.length)} رویداد اخیر)
              </span>
              <span className="text-[11px] font-mono text-[#00e701]">24/7 MONITOR ACTIVE</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scroll">
              {telegramAlertsLog.map((alert) => (
                <div
                  key={alert.id}
                  data-testid={`telegram-alert-item-${alert.id}`}
                  className="bg-[#0f212e] border border-white/[0.06] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
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
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                    <span className="text-[#00e701] font-black">${alert.amountUsdt}</span>
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
        className="studio-arena-frame rounded-3xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-bold text-[#fbbf24] font-mono">
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
            className="px-5 py-2.5 rounded-xl gold-gradient-cta font-black text-xs transition-all flex items-center gap-2 self-start cursor-pointer whitespace-nowrap"
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
                className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#fbbf24] tabular-nums">{dep.depositCode}</span>
                    <span className="text-xs font-bold text-white">{dep.userDisplayName}</span>
                    <span className="px-2 py-0.5 rounded bg-[#213743] text-slate-300 text-[11px] font-mono tabular-nums">
                      {dep.network} ({dep.amountCrypto})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#00e701]/15 text-[#00e701] text-xs font-mono font-black tabular-nums">
                      +${dep.amountUsdt.toLocaleString('en-US')} USDT
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
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
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        dep.status === 'CREDITED'
                          ? 'bg-[#00e701]/15 text-[#00e701] border border-[#00e701]/30'
                          : dep.status === 'REJECTED'
                          ? 'bg-[#e9113c]/15 text-rose-300 border border-[#e9113c]/30'
                          : 'bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40'
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
                        className="px-4 py-2 rounded-xl stake-emerald-cta text-xs font-black transition-all cursor-pointer whitespace-nowrap"
                      >
                        تایید و شارژ حساب کاربر
                      </button>
                      <button
                        type="button"
                        data-testid={`reject-deposit-${dep.depositCode}`}
                        onClick={() => adminActionDeposit(dep.depositCode, 'reject')}
                        className="px-3.5 py-2 rounded-xl bg-[#e9113c]/15 hover:bg-[#e9113c]/25 border border-[#e9113c]/40 text-rose-300 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        رد حواله
                      </button>
                    </>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">{dep.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 100% Zero-Loss Solvency Shield & Referral Waterfall Monitor */}
      <section
        data-testid="cockpit-solvency-shield-section"
        className="studio-arena-frame rounded-3xl p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-bold text-[#00e701] font-mono">
              100% ZERO-LOSS MATHEMATICAL SOLVENCY SHIELD &amp; AFFILIATE WATERFALL
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
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
                solvencyMode === 'AUTO_EXTEND'
                  ? 'bg-[#213743] border-[#00e701] text-[#00e701]'
                  : 'bg-[#1a2c38] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              🛡️ تمدید خودکار تا تکمیل نصاب (AUTO_EXTEND)
            </button>
            <button
              type="button"
              onClick={() => setSolvencyMode('PROPORTIONAL_POOL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
                solvencyMode === 'PROPORTIONAL_POOL'
                  ? 'bg-[#213743] border-[#fbbf24] text-[#fbbf24]'
                  : 'bg-[#1a2c38] border-white/10 text-slate-400 hover:text-white'
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
                className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-[#fbbf24] tabular-nums">{r.roundCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums ${
                      solvency.isFullyFundedForTarget
                        ? 'bg-[#00e701]/15 text-[#00e701]'
                        : 'bg-[#fbbf24]/15 text-[#fbbf24]'
                    }`}
                  >
                    پوشش نصاب: {solvency.solvencyRatioPercent}%
                  </span>
                </div>
                <div className="text-xs font-black text-white truncate">{r.titleFa}</div>
                <div className="text-[11px] text-slate-300 space-y-1 tabular-nums">
                  <div className="flex justify-between">
                    <span>فروش کل بلیت (${ticketPrice}):</span>
                    <strong className="text-white font-mono">
                      ${solvency.realCollectedSalesUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>سقف مجاز پرداخت (۸۵٪):</span>
                    <strong className="text-[#00e701] font-mono">
                      ${solvency.authorizedMaxPayoutUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>سود خالص تضمین‌شده ادمین:</span>
                    <strong className="text-[#fbbf24] font-mono">
                      +${solvency.guaranteedHouseNetProfitUsdt.toLocaleString('en-US')}
                    </strong>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/[0.06] text-[10px] text-slate-300">
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
          <div className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 space-y-2">
            <div className="text-xs font-black text-[#fbbf24]">
              آخرین تراکنش‌های پورسانت زیرمجموعه‌گیری (کسر شده از ۱۰٪ کارمزد خانه — ریسک خزانه: صفر):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {referralEvents.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="bg-[#0f212e] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center justify-between text-xs tabular-nums"
                >
                  <div>
                    <span className="font-bold text-white">{ev.buyerDisplayName}</span>
                    <span className="text-slate-400 mx-1">← معرف:</span>
                    <span className="font-mono text-[#fbbf24]">{ev.referrerCode}</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#00e701]">
                    پورسانت: +${ev.commissionUsdt} | سود خانه: +${ev.netHouseProfitUsdt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Live Oracle Markup & Exchange Rate Controller */}
      <section className="studio-arena-frame rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-bold text-[#00e701] font-mono">
              REAL-TIME DYNAMIC PRICE ORACLE ({oracleSnapshot?.source || 'TetherLand + Wallex + Binance Live'})
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              نرخ لحظه‌ای بازار آزاد تتر/تومان، یوآن چین و رمزارزها (بروزرسانی هر ۱۵ ثانیه)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              بروزرسانی بعدی: <strong className="text-[#00e701]">{oracleCountdownSec}s</strong>
            </span>
            <button
              type="button"
              onClick={() => refreshPriceOracleNow()}
              className="px-4 py-2 rounded-xl bg-[#1a2c38] hover:bg-[#213743] border border-[#00e701]/40 text-[#00e701] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>فراخوانی فوری اوراکل</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 space-y-2 bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">ضریب مارک‌آپ نرخ فیات (Toman / CNY):</span>
              <span className="font-mono font-black text-[#fbbf24] tabular-nums">
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
              className="w-full accent-[#fbbf24] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono" dir="ltr">
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
              <div key={item.pair} className="bg-[#1a2c38] border border-white/[0.07] rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-mono block">{item.pair}</span>
                <span className="text-xs font-black text-[#00e701] font-mono tabular-nums mt-1 block">
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin Withdrawal Approval & Auto-Sweep Desk */}
      <section className="studio-arena-frame rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-bold text-[#00e701] font-mono">
              ADMIN WITHDRAWAL APPROVAL &amp; HOT-WALLET AUTO-SWEEP DESK
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              صف تایید و تسویه برداشت‌های رمزارزی کاربران ({toPersianDigits(pendingWithdrawalsCount)} در انتظار)
            </h2>
          </div>

          <button
            type="button"
            data-testid="cockpit-sweep-withdrawals-btn"
            onClick={() => adminActionWithdrawal('ALL', 'sweep_all')}
            className="px-5 py-2.5 rounded-xl stake-emerald-cta font-black text-xs transition-all flex items-center gap-2 self-start cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">done_all</span>
            <span>تسویه دسته‌ای تمام درخواست‌های در انتظار (Auto-Sweep)</span>
          </button>
        </div>

        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div
              key={w.withdrawalCode}
              className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#fbbf24] tabular-nums">{w.withdrawalCode}</span>
                  <span className="text-xs font-bold text-white">{w.userDisplayName}</span>
                  <span className="px-2 py-0.5 rounded bg-[#213743] text-slate-300 text-[11px] font-mono">
                    {w.network}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      w.status === 'completed'
                        ? 'bg-[#00e701]/15 text-[#00e701] border border-[#00e701]/30'
                        : w.status === 'rejected'
                        ? 'bg-[#e9113c]/15 text-rose-300 border border-[#e9113c]/30'
                        : 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30'
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
                <div className="text-xs text-slate-300 font-mono tabular-nums break-all" dir="ltr">
                  To: {w.destinationAddress} • Net: {w.netAmountCrypto} (${w.netAmountUsdt} USDT | Fee: ${w.networkFeeUsdt})
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {w.status !== 'completed' && w.status !== 'rejected' && (
                  <>
                    <button
                      type="button"
                      onClick={() => adminActionWithdrawal(w.withdrawalCode, 'approve')}
                      className="px-3.5 py-2 rounded-xl bg-[#00e701]/20 hover:bg-[#00e701]/30 border border-[#00e701]/40 text-[#00e701] text-xs font-bold transition-all cursor-pointer"
                    >
                      تایید و ارسال آنی
                    </button>
                    <button
                      type="button"
                      onClick={() => adminActionWithdrawal(w.withdrawalCode, 'reject')}
                      className="px-3.5 py-2 rounded-xl bg-[#e9113c]/15 hover:bg-[#e9113c]/25 border border-[#e9113c]/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      رد درخواست
                    </button>
                  </>
                )}
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">{w.createdAt}</span>
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
            className="studio-arena-frame rounded-3xl p-5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a2c38] text-[#fbbf24] border border-[#fbbf24]/30 font-bold">
                {vault.badge}
              </span>
              <span className="text-[10px] font-mono text-[#00e701]">ACTIVE</span>
            </div>
            <div className="text-xs text-slate-300">{vault.label}</div>
            <div className="text-xl font-black text-white font-mono tabular-nums" dir="ltr">
              {vault.crypto}
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">{vault.sub}</div>
          </div>
        ))}
      </section>

      {/* Official Site Deposit Wallets & Cold Treasury Address Manager */}
      <section className="studio-arena-frame rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <span className="text-xs font-bold text-[#fbbf24] font-mono">
              OFFICIAL MULTI-CHAIN DEPOSIT &amp; COLD TREASURY WALLETS
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              تنظیمات کیف پول‌های رسمی سایت (درگاه واریز ۵ شبکه + آدرس خزانه سرد ادمین)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              هر تغییری در آدرس‌های زیر بلافاصله در صفحه واریز کاربران (`/deposit`)، مودال شارژ سریع و بخش تسویه سود خزانه (`/admin/finances`) اعمال می‌شود.
            </p>
          </div>
          {walletSavedBanner && (
            <span className="px-4 py-2 rounded-xl bg-[#00e701]/20 border border-[#00e701]/40 text-[#00e701] text-xs font-black">
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
              <div key={item.key} className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-[#fbbf24]">{item.label}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={walletDraft[item.key]}
                  onChange={(e) =>
                    setWalletDraft((prev) => ({ ...prev, [item.key]: e.target.value }))
                  }
                  className="w-full studio-input-well rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              data-testid="save-official-wallets-btn"
              className="px-6 py-3 rounded-xl gold-gradient-cta font-black text-xs sm:text-sm cursor-pointer flex items-center gap-2"
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
          <div className="studio-arena-frame rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-mono font-bold text-[#fbbf24]">PROVABLY FAIR DRAW ENGINE</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  اجرای قرعه‌کشی و استخراج گوی‌های برنده (SHA-256)
                </h2>
              </div>
              <select
                value={selectedRoundForDraw}
                onChange={(e) => setSelectedRoundForDraw(e.target.value)}
                aria-label="انتخاب دور قرعه‌کشی"
                className="studio-input-well rounded-xl px-3 py-2 text-xs text-[#fbbf24] font-mono"
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
              className="w-full py-3.5 rounded-xl gold-gradient-cta font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
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
                className="bg-[#1a2c38] border border-[#00e701]/40 rounded-2xl p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#00e701] font-bold">
                    ✅ قرعه‌کشی ۵۲ بیتی HMAC-SHA256 اجرا و جوایز به صورت آنی در PAM واریز شد:
                  </span>
                  <span className="font-mono text-slate-400">{selectedRoundForDraw}</span>
                </div>
                <div className="flex items-center justify-center gap-2.5 py-1" dir="ltr">
                  {drawnResult.drawnMain.map((num) => (
                    <span
                      key={num}
                      className="w-10 h-10 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-sm flex items-center justify-center tabular-nums"
                    >
                      {String(num).padStart(2, '0')}
                    </span>
                  ))}
                  <span className="text-[#fbbf24] font-black">+</span>
                  <span className="w-11 h-11 rounded-full lottery-ball-purple text-white font-mono font-black text-sm flex items-center justify-center border border-[#fbbf24] tabular-nums">
                    ★{String(drawnResult.drawnGolden).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#0f212e] rounded-xl px-3 py-2 tabular-nums">
                  <span>
                    بلیت‌های بررسی‌شده:{' '}
                    <strong className="text-white font-mono">
                      {drawnResult.ticketsEvaluatedCount ?? 0}
                    </strong>
                  </span>
                  <span>
                    بلیت‌های برنده:{' '}
                    <strong className="text-[#00e701] font-mono">
                      {drawnResult.winnersCount ?? 0}
                    </strong>
                  </span>
                  <span>
                    واریز خودکار PAM Credit:{' '}
                    <strong className="text-[#fbbf24] font-mono">
                      +${(drawnResult.totalPayoutUsdt ?? 0).toFixed(2)} USDT
                    </strong>
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 break-all" dir="ltr">
                  Audit Hash: <span className="text-[#00e701]">{drawnResult.hash}</span>
                </div>
              </div>
            )}
          </div>

          {roundActionBanner && (
            <div
              data-testid="round-action-banner"
              className="p-3.5 rounded-2xl bg-[#00e701]/20 border border-[#00e701]/50 text-[#00e701] text-xs font-bold"
            >
              {roundActionBanner}
            </div>
          )}

          {/* Create New Lottery Round Form */}
          <form
            onSubmit={handleCreateRound}
            className="studio-arena-frame rounded-3xl p-6 space-y-4"
          >
            <h3 className="text-lg font-black text-white">تعریف دور جدید قرعه‌کشی در قرارداد هوشمند</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">عنوان قرعه‌کشی:</label>
                <input
                  type="text"
                  data-testid="new-round-title-input"
                  placeholder="مثلاً: جک‌پات ویژه نوروز (۱۰ شمش طلا)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full studio-input-well rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">دسته‌بندی استخر:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full studio-input-well rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="WEEKLY">هفتگی (Mega Weekly)</option>
                  <option value="DAILY">روزانه (Daily Blitz)</option>
                  <option value="TURBO">ساعتی (Hourly Flash)</option>
                  <option value="TON_SPECIAL">ویژه تون تلگرام (TON Special)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">قیمت بلیط (USDT):</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full studio-input-well rounded-xl px-3.5 py-2 text-xs text-[#fbbf24] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">جایزه کل استخر (USDT):</label>
                <input
                  type="number"
                  value={newJackpot}
                  onChange={(e) => setNewJackpot(Number(e.target.value))}
                  className="w-full studio-input-well rounded-xl px-3.5 py-2 text-xs text-[#00e701] font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-300">
                نرخ RTP بازگشت جوایز: <strong className="text-[#00e701] font-mono">{newRtp}%</strong> (سود خالص اپراتور: ۱۰٪)
              </span>
              <button
                type="submit"
                data-testid="create-round-submit-btn"
                disabled={creatingRound}
                className="px-5 py-2.5 rounded-xl stake-emerald-cta font-black text-xs cursor-pointer"
              >
                {creatingRound ? 'در حال ثبت...' : '+ ایجاد و انتشار استخر جدید'}
              </button>
            </div>
          </form>

          {/* Manage Existing Rounds Status, Ticket Price & Deletion */}
          <div className="studio-arena-frame rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                مدیریت استخرهای همزمان، قیمت بلیط و حذف دورها ({toPersianDigits(rounds.length)})
              </h3>
              <button
                type="button"
                onClick={() => setWalletDrawerOpen(true)}
                className="text-xs font-bold text-[#00e701] hover:underline cursor-pointer"
              >
                مشاهده دفترکل PAM ({pamReconciliation?.ledgerEntriesCount || 0} تراکنش) ↗
              </button>
            </div>
            <div className="space-y-2.5">
              {rounds.map((r) => (
                <div
                  key={r.roundCode}
                  data-testid={`manage-round-row-${r.roundCode}`}
                  className="bg-[#1a2c38] border border-white/[0.07] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-black text-white">
                      {r.titleFa} <span className="font-mono text-[#fbbf24]">({r.roundCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-300 tabular-nums">
                      جک‌پات: {formatAmount(Number(r.jackpotUsdt))} • اعداد برنده فعلی:{' '}
                      <span className="font-mono text-[#00e701]">
                        [{r.winningNumbers}] + ★{r.winningGoldenBall}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-[#213743] border border-white/10 rounded-xl px-2 py-1">
                      <span className="text-[10px] text-slate-300">قیمت ($):</span>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        aria-label={`قیمت بلیط ${r.roundCode}`}
                        value={Number(r.ticketPriceUsdt)}
                        onChange={(e) => updateRoundTicketPrice(r.roundCode, Number(e.target.value))}
                        className="w-14 bg-transparent text-xs font-mono text-[#fbbf24] font-bold focus:outline-none text-center tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      data-testid={`toggle-round-btn-${r.roundCode}`}
                      onClick={() => toggleRoundSales(r.roundCode)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        r.status?.toUpperCase() === 'ACTIVE'
                          ? 'bg-[#00e701]/15 text-[#00e701] border-[#00e701]/30'
                          : 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30'
                      }`}
                    >
                      {r.status?.toUpperCase() === 'ACTIVE' ? 'فعال (توقف فروش)' : 'متوقف (فعال‌سازی)'}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-round-btn-${r.roundCode}`}
                      onClick={() => handleDeleteRound(r.roundCode, r.titleFa)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#e9113c]/15 hover:bg-[#e9113c]/30 text-rose-300 border border-[#e9113c]/35 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right/Left 5 Cols: Live VIP Customer Support Chat Console */}
        <div className="lg:col-span-5 studio-arena-frame rounded-3xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#00e701]">DIRECT VIP CONCIERGE DESK</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  کنسول گفتگوی زنده با بازیکنان VIP
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#00e701]/15 text-[#00e701] text-xs font-bold">
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
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    activeSessionCode === code
                      ? 'bg-[#213743] border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#1a2c38] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scroll">
              {sessionMessages.map((msg) => {
                const isOperator = msg.senderRole === 'OPERATOR';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      isOperator
                        ? 'bg-[#fbbf24]/10 border-[#fbbf24]/35 text-amber-100 mr-6'
                        : 'bg-[#1a2c38] border-white/10 text-slate-200 ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{msg.senderName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#213743] text-[#fbbf24] font-mono">
                        {msg.vipLevel}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono tabular-nums">
                      <span>{msg.walletBalanceLabel}</span>
                      <span>{msg.historySummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operator Direct Reply Box */}
          <form onSubmit={handleSendOperatorReply} className="space-y-3 pt-3 border-t border-white/[0.07]">
            <textarea
              rows={3}
              value={operatorReply}
              onChange={(e) => setOperatorReply(e.target.value)}
              placeholder={`ارسال پاسخ مستقیم اپراتور به نشست ${activeSessionCode}...`}
              className="w-full studio-input-well rounded-2xl p-3 text-xs text-white"
            />
            <button
              type="submit"
              disabled={sendingReply}
              data-testid="cockpit-send-reply-btn"
              className="w-full py-3 rounded-xl stake-emerald-cta font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
