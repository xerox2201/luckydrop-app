import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  toPersianDigits,
  calculateDynamicPariMutuelPool,
  getBlockchainExplorerTxUrl,
} from '../utils/lotteryEngine.ts';

type AdminMobileSectionTab =
  | 'ALL'
  | 'OVERVIEW'
  | 'ROUNDS'
  | 'CASHIER'
  | 'CONFIG'
  | 'SHIELD';

export const CockpitView: React.FC = () => {
  const {
    rounds,
    deposits,
    withdrawals,
    supportMessages,
    killSwitchActive,
    toggleKillSwitch,
    triggerDraw,
    createNewRound,
    deleteLotteryRound,
    deleteAllLotteryRounds,
    toggleRoundSales,
    updateRoundTicketPrice,
    adminActionWithdrawal,
    sendSupportMessage,
    oracleSnapshot,
    oracleCountdownSec,
    refreshPriceOracleNow,
    firestoreConnected,
    setStealthCookieAuthorized,
    navigateTo,
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
    autoWithdrawLimitTon,
    setAutoWithdrawLimitTon,
  } = useLottery();

  const [activeMobileTab, setActiveMobileTab] = useState<AdminMobileSectionTab>('ALL');

  const effectiveTonRate = tonUsdRate > 0 ? tonUsdRate : 5.2;
  const usdtToTonFormatted = (usdt: number): string => {
    const ton = (Number(usdt) || 0) / effectiveTonRate;
    return `${ton.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} TON`;
  };

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

  // High-Value Withdrawal Threshold state
  const [withdrawLimitDraftTon, setWithdrawLimitDraftTon] = useState<number>(
    autoWithdrawLimitTon || 50
  );
  const [withdrawLimitSavedBanner, setWithdrawLimitSavedBanner] = useState<boolean>(false);

  React.useEffect(() => {
    setWithdrawLimitDraftTon(autoWithdrawLimitTon || 50);
  }, [autoWithdrawLimitTon]);

  const handleSaveWithdrawThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    await setAutoWithdrawLimitTon(withdrawLimitDraftTon);
    setWithdrawLimitSavedBanner(true);
    setTimeout(() => setWithdrawLimitSavedBanner(false), 3500);
  };

  // Admin Telegram Bot Alert State
  const [tgEnabled, setTgEnabled] = useState<boolean>(telegramBotConfig.enabled);
  const [tgBotToken, setTgBotToken] = useState<string>(telegramBotConfig.botToken);
  const [tgChatId, setTgChatId] = useState<string>(telegramBotConfig.adminChatId);
  const [tgBanner, setTgBanner] = useState<string | null>(null);
  const [sendingTgTest, setSendingTgTest] = useState<boolean>(false);
  const [roundActionBanner, setRoundActionBanner] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);

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
    setTgBanner(
      '✅ تنظیمات ربات و آیدی چنل/گروه تلگرام روی سرور ذخیره شد! اکنون دکمه «تست هشدار تلگرام» را بزنید.'
    );
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

  // Draw execution state
  const [selectedRoundForDraw, setSelectedRoundForDraw] = useState<string>(
    rounds[0]?.roundCode || '#ZRN-8493'
  );
  const [drawing, setDrawing] = useState<boolean>(false);
  const [drawnResult, setDrawnResult] = useState<{
    drawnMain: number[];
    drawnGolden: number;
    hash: string;
    ticketsEvaluatedCount?: number;
    winnersCount?: number;
    totalPayoutUsdt?: number;
  } | null>(null);

  React.useEffect(() => {
    if (rounds.length > 0 && !rounds.some((r) => r.roundCode === selectedRoundForDraw)) {
      setSelectedRoundForDraw(rounds[0].roundCode);
    }
  }, [rounds, selectedRoundForDraw]);

  // Create New Round state (Unlimited rounds, dynamic 85%/15% pool, TON pricing)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('TON_SPECIAL');
  const [newTicketPriceTon, setNewTicketPriceTon] = useState<number>(1);
  const [newInitialSeedTon, setNewInitialSeedTon] = useState<number>(0);
  const [newDurationMinutes, setNewDurationMinutes] = useState<number>(60);
  const [newBallFormat, setNewBallFormat] = useState<'5_50' | '5_40' | '5_35' | '4_25'>('5_50');
  const [creatingRound, setCreatingRound] = useState<boolean>(false);

  // Live VIP Customer Chat Console state
  const [activeSessionCode, setActiveSessionCode] = useState<string>('VIP-KAMRAN');
  const [operatorReply, setOperatorReply] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const handleExecuteDraw = async (explicitRoundCode?: string) => {
    const targetCode = explicitRoundCode || selectedRoundForDraw || rounds[0]?.roundCode;
    if (!targetCode) return;
    setDrawing(true);
    setSelectedRoundForDraw(targetCode);
    const res = await triggerDraw(targetCode);
    setDrawing(false);
    if (res) {
      setDrawnResult(res);
      setRoundActionBanner(
        `🎲 قرعه‌کشی دور ${targetCode} انجام شد! ۱۵٪ سهم سایت کسر گردید و ۸۵٪ استخر بین برندگان تقسیم شد.`
      );
      setTimeout(() => setRoundActionBanner(null), 5000);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRound(true);
    const formatMap = {
      '5_50': { mainCount: 5, mainMax: 50, goldenMax: 15 },
      '5_40': { mainCount: 5, mainMax: 40, goldenMax: 12 },
      '5_35': { mainCount: 5, mainMax: 35, goldenMax: 10 },
      '4_25': { mainCount: 4, mainMax: 25, goldenMax: 0 },
    }[newBallFormat];

    const autoTitle =
      newTitle.trim() ||
      `استخر قرعه‌کشی TON #${rounds.length + 1} (${formatMap.mainCount}/${formatMap.mainMax})`;

    const ok = await createNewRound({
      titleFa: autoTitle,
      category: newCategory,
      ticketPriceTon: Math.max(0.1, Number(newTicketPriceTon) || 1),
      initialSeedTon: Math.max(0, Number(newInitialSeedTon) || 0),
      durationMinutes: Math.max(1, Number(newDurationMinutes) || 60),
      mainCount: formatMap.mainCount,
      mainMax: formatMap.mainMax,
      goldenMax: formatMap.goldenMax,
    });
    setCreatingRound(false);
    if (ok) {
      setRoundActionBanner(
        `✅ دور جدید «${autoTitle}» با منطق ۸۵٪ استخر پویا و ۱۵٪ سهم محفوظ سایت ساخته و منتشر شد!`
      );
      setNewTitle('');
      setTimeout(() => setRoundActionBanner(null), 5000);
    }
  };

  const handleDeleteRound = async (roundCode: string, titleFa: string) => {
    await deleteLotteryRound(roundCode);
    setRoundActionBanner(`🗑️ دور «${titleFa} (${roundCode})» با موفقیت حذف گردید.`);
    setTimeout(() => setRoundActionBanner(null), 4000);
  };

  const handleDeleteAllRounds = async () => {
    await deleteAllLotteryRounds();
    setConfirmDeleteAll(false);
    setRoundActionBanner('🗑️ تمام دورهای قرعه‌کشی حذف شدند. اکنون می‌توانید دورهای دلخواه خود را بسازید.');
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

  const handleSecureAdminExit = () => {
    setStealthCookieAuthorized(false);
    navigateTo('lobby');
  };

  const sessionMessages = supportMessages.filter((m) => m.sessionCode === activeSessionCode);
  const pendingHighValueWithdrawals = withdrawals.filter(
    (w) => w.status === 'pending_review' || w.status === 'broadcasting'
  );

  // Real dynamic pool math across all active rounds
  const totalCollectedSalesUsdt = rounds.reduce(
    (acc, r) => acc + (parseFloat(r.totalSalesUsdt || '0') || 0),
    0
  );
  const globalPoolSplit = calculateDynamicPariMutuelPool(totalCollectedSalesUsdt, 15);

  const showSection = (tab: AdminMobileSectionTab) =>
    activeMobileTab === 'ALL' || activeMobileTab === tab;

  const MOBILE_TABS: Array<{ id: AdminMobileSectionTab; label: string }> = [
    { id: 'ALL', label: '⚡ همه بخش‌ها' },
    { id: 'ROUNDS', label: `🎰 مدیریت لاتاری (${toPersianDigits(rounds.length)})` },
    { id: 'CASHIER', label: `💎 برداشت مبالغ بالا (${toPersianDigits(pendingHighValueWithdrawals.length)})` },
    { id: 'OVERVIEW', label: '📊 خزانه و نرخ TON' },
    { id: 'CONFIG', label: '🤖 ربات و کانال تلگرام' },
    { id: 'SHIELD', label: '🛡️ امنیت و پشتیبانی' },
  ];

  return (
    <div
      data-testid="mobile-admin-cockpit-view"
      className="max-w-[440px] mx-auto px-3 pt-2 pb-28 space-y-3.5 overflow-x-hidden"
    >
      {/* =====================================================================
          1. COMPACT MOBILE ADMIN COMMAND HEADER + EMERGENCY KILL-SWITCH
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.45)] space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-lg bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[10px] font-mono font-bold">
            ADMIN COCKPIT • #{telegramUser.id}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-[#090612] border border-[#fbbf24]/35 text-[#fbbf24] text-[10px] font-mono">
            {firestoreConnected ? 'FIRESTORE + PAM SYNCED' : 'PAM ENGINE ACTIVE'}
          </span>
        </div>

        <div>
          <h1 className="text-base font-black text-white leading-snug">
            مرکز فرماندهی ادمین (TON & Telegram Stars)
          </h1>
          <p className="text-[11px] text-purple-200/80 mt-1 leading-relaxed">
            مدیریت نامحدود دورهای لاتاری (۸۵٪ جایزه راس تایم / ۱۵٪ سهم محفوظ سایت)، واریز و برداشت خودکار TON و تایید برداشت‌های مبالغ بالا.
          </p>
        </div>

        {/* Kill-Switch & Secure Exit in a Clean 2-Column Mobile Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="cockpit-kill-switch-btn"
            onClick={toggleKillSwitch}
            className={`h-10 px-2.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
              killSwitchActive
                ? 'bg-[#00f59b] text-[#041f14]'
                : 'bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/50'
            }`}
          >
            <span>{killSwitchActive ? '✓ رفع انسداد سیستم' : '🚨 توقف اضطراری (Kill)'}</span>
          </button>

          <button
            type="button"
            data-testid="admin-secure-exit-btn"
            onClick={handleSecureAdminExit}
            className="h-10 px-2.5 rounded-xl bg-[#090612] hover:bg-purple-950/70 border border-[#fbbf24]/45 text-[#fbbf24] font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🔒 خروج امن ادمین</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MOBILE SECTION FILTER PILLS (Horizontal Scroller — Zero Clipping)
          ===================================================================== */}
      <div className="overflow-x-auto no-scrollbar flex gap-1.5 py-0.5">
        {MOBILE_TABS.map((tab) => {
          const active = activeMobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`admin-mobile-tab-${tab.id}`}
              onClick={() => setActiveMobileTab(tab.id)}
              className={`h-8 px-3 rounded-xl text-[11px] font-bold shrink-0 border transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#9333ea] to-[#7e22ce] border-purple-300/60 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                  : 'bg-[#130d24]/90 border-purple-500/20 text-purple-200/80 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION B: UNLIMITED LOTTERY CREATION & PARI-MUTUEL POOL MANAGEMENT
          (Placed prominently so Admin can immediately create/delete/manage rounds)
          ===================================================================== */}
      {showSection('ROUNDS') && (
        <div className="space-y-3.5">
          {roundActionBanner && (
            <div
              data-testid="round-action-banner"
              className="p-3 rounded-2xl bg-[#00f59b]/20 border border-[#00f59b]/50 text-[#00f59b] text-xs font-bold leading-relaxed"
            >
              {roundActionBanner}
            </div>
          )}

          {/* Create New Lottery Round Form (Unlimited Creation + Dynamic 85%/15% Pool) */}
          <form
            onSubmit={handleCreateRound}
            data-testid="create-round-form"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h3 className="text-xs font-extrabold text-white">
                ➕ تعریف دور جدید قرعه‌کشی (بدون محدودیت تعداد)
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-[#00f59b]/15 text-[#00f59b] text-[10px] font-bold">
                ۸۵٪ جایزه / ۱۵٪ سایت
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#090612] border border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed">
              ⚖️ <strong className="text-[#fbbf24]">منطق استخر پویا (Pari-Mutuel):</strong> استخر هرچقدر از خرید بلیت بازیکنان پر شود، راس تایم قرعه‌کشی <strong className="text-[#00f59b]">۱۵٪ سهم سایت کسر و محفوظ شده</strong> و <strong className="text-white">۸۵٪ مابقی استخر</strong> بین برندگان تقسیم می‌گردد.
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  عنوان دور قرعه‌کشی (اختیاری — در صورت خالی بودن خودکار نام‌گذاری می‌شود):
                </label>
                <input
                  type="text"
                  data-testid="new-round-title-input"
                  placeholder="مثلاً: جک‌پات امشب TON یا بلیتز ویژه تلگرام"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-3 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    💎 قیمت هر بلیت (TON):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    data-testid="new-round-price-ton-input"
                    value={newTicketPriceTon}
                    onChange={(e) => setNewTicketPriceTon(Number(e.target.value))}
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-[#fbbf24] font-mono font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    ⏱ زمان قرعه‌کشی (راس تایم):
                  </label>
                  <select
                    data-testid="new-round-duration-select"
                    value={newDurationMinutes}
                    onChange={(e) => setNewDurationMinutes(Number(e.target.value))}
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2 text-[11px] text-[#00f59b] font-bold"
                  >
                    <option value={15}>هر ۱۵ دقیقه (توربو)</option>
                    <option value={60}>هر ۱ ساعت (ساعتی)</option>
                    <option value={360}>هر ۶ ساعت</option>
                    <option value={1440}>هر ۲۴ ساعت (روزانه)</option>
                    <option value={10080}>هفتگی (۷ روز)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    🎱 تعداد گوی‌های دور:
                  </label>
                  <select
                    data-testid="new-round-format-select"
                    value={newBallFormat}
                    onChange={(e) => setNewBallFormat(e.target.value as any)}
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2 text-[11px] text-white"
                  >
                    <option value="5_50">۵ گوی از ۵۰ + ۱ طلایی (۱۵)</option>
                    <option value="5_40">۵ گوی از ۴۰ + ۱ طلایی (۱۲)</option>
                    <option value="5_35">۵ گوی از ۳۵ + ۱ طلایی (۱۰)</option>
                    <option value="4_25">۴ گوی از ۲۵ (بدون طلایی)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    🌱 شارژ اولیه استخر (TON - اختیاری):
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    data-testid="new-round-seed-ton-input"
                    value={newInitialSeedTon}
                    onChange={(e) => setNewInitialSeedTon(Number(e.target.value))}
                    placeholder="0 TON"
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-cyan-300 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              data-testid="create-round-submit-btn"
              disabled={creatingRound}
              className="w-full h-10 rounded-xl stake-emerald-cta font-black text-xs text-[#041f14] cursor-pointer shadow-md"
            >
              {creatingRound ? 'در حال ساخت استخر...' : '+ ایجاد و انتشار استخر جدید قرعه‌کشی'}
            </button>
          </form>

          {/* Manage Existing Rounds (Unlimited Edit, Instant Draw, Pause, Delete Single or Delete All) */}
          <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-purple-500/20 pb-2">
              <h3 className="text-xs font-extrabold text-white">
                📋 مدیریت استخرهای فعال، قیمت بلیت و حذف ({toPersianDigits(rounds.length)})
              </h3>
              {rounds.length > 0 && (
                <div>
                  {!confirmDeleteAll ? (
                    <button
                      type="button"
                      data-testid="delete-all-rounds-trigger-btn"
                      onClick={() => setConfirmDeleteAll(true)}
                      className="h-7 px-2.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300 text-[10px] font-bold cursor-pointer"
                    >
                      🗑️ حذف همه دورها
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid="confirm-delete-all-rounds-btn"
                        onClick={handleDeleteAllRounds}
                        className="h-7 px-2.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        تایید حذف همه
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAll(false)}
                        className="h-7 px-2 rounded-lg bg-[#090612] text-purple-200 text-[10px] cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {rounds.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#090612] border border-purple-500/20 text-center text-xs text-purple-300/80">
                هیچ دور فعالی وجود ندارد. از فرم بالا یک یا چند دور قرعه‌کشی جدید ایجاد کنید.
              </div>
            ) : (
              <div className="space-y-2.5">
                {rounds.map((r) => {
                  const grossPoolUsdt = parseFloat(r.totalSalesUsdt || '0') || 0;
                  const poolSplit = calculateDynamicPariMutuelPool(grossPoolUsdt, 15);
                  const ticketPriceTon = Number(
                    ((parseFloat(r.ticketPriceUsdt) || 5) / effectiveTonRate).toFixed(2)
                  );
                  const remainSec = r.drawTargetTimestampMs
                    ? Math.max(0, Math.floor((r.drawTargetTimestampMs - Date.now()) / 1000))
                    : 3600;
                  const remH = Math.floor(remainSec / 3600);
                  const remM = Math.floor((remainSec % 3600) / 60);
                  const remS = remainSec % 60;
                  const countdownStr = `${String(remH).padStart(2, '0')}:${String(remM).padStart(
                    2,
                    '0'
                  )}:${String(remS).padStart(2, '0')}`;

                  return (
                    <div
                      key={r.roundCode}
                      data-testid={`manage-round-row-${r.roundCode}`}
                      className="bg-[#090612] border border-purple-500/25 rounded-xl p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-white truncate">
                            {r.titleFa}
                          </div>
                          <div className="text-[10px] text-purple-300/75 font-mono" dir="ltr">
                            {r.roundCode} • Format: {r.mainCount || 5}/{r.mainMax || 50}
                            {(r.goldenMax ?? 15) > 0 ? ` + ★${r.goldenMax ?? 15}` : ''} • ⏱{' '}
                            {countdownStr}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            r.status?.toUpperCase() === 'ACTIVE'
                              ? 'bg-[#00f59b]/15 text-[#00f59b]'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {r.status?.toUpperCase() === 'ACTIVE' ? 'در حال فروش' : 'متوقف'}
                        </span>
                      </div>

                      {/* Dynamic 85% / 15% Pool Breakdown in TON */}
                      <div className="grid grid-cols-3 gap-1.5 bg-[#130d24]/90 border border-purple-500/20 rounded-xl p-2 text-center">
                        <div>
                          <span className="text-[9px] text-purple-300/70 block">کل استخر جمع‌شده</span>
                          <span
                            className="text-[11px] font-mono font-bold text-white block mt-0.5"
                            dir="ltr"
                          >
                            {usdtToTonFormatted(poolSplit.grossCollectedUsdt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#fbbf24] block">سهم محفوظ سایت (۱۵٪)</span>
                          <span
                            className="text-[11px] font-mono font-bold text-[#fbbf24] block mt-0.5"
                            dir="ltr"
                          >
                            {usdtToTonFormatted(poolSplit.houseFee15Usdt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#00f59b] block">جایزه راس تایم (۸۵٪)</span>
                          <span
                            className="text-[11px] font-mono font-bold text-[#00f59b] block mt-0.5"
                            dir="ltr"
                          >
                            {usdtToTonFormatted(poolSplit.distributablePool85Usdt)}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Price in TON + Action Controls */}
                      <div className="grid grid-cols-4 gap-1.5 items-center">
                        <div className="flex items-center gap-1 bg-[#130d24] border border-purple-500/30 rounded-lg px-1.5 h-8">
                          <span className="text-[9px] font-mono text-cyan-300 shrink-0">💎TON</span>
                          <input
                            type="number"
                            min={0.1}
                            step={0.5}
                            aria-label={`قیمت بلیت TON ${r.roundCode}`}
                            value={ticketPriceTon}
                            onChange={(e) => {
                              const nextTon = Math.max(0.1, Number(e.target.value) || 0.5);
                              updateRoundTicketPrice(
                                r.roundCode,
                                Number((nextTon * effectiveTonRate).toFixed(2))
                              );
                            }}
                            className="w-full bg-transparent text-[11px] font-mono text-[#fbbf24] font-bold focus:outline-none text-center"
                          />
                        </div>

                        <button
                          type="button"
                          data-testid={`draw-now-btn-${r.roundCode}`}
                          onClick={() => handleExecuteDraw(r.roundCode)}
                          className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40 cursor-pointer truncate"
                        >
                          🎲 قرعه‌کشی
                        </button>

                        <button
                          type="button"
                          data-testid={`toggle-round-btn-${r.roundCode}`}
                          onClick={() => toggleRoundSales(r.roundCode)}
                          className={`h-8 px-1.5 rounded-lg text-[10px] font-bold border cursor-pointer truncate ${
                            r.status?.toUpperCase() === 'ACTIVE'
                              ? 'bg-[#00f59b]/15 text-[#00f59b] border-[#00f59b]/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {r.status?.toUpperCase() === 'ACTIVE' ? '⏸ توقف' : '▶ شروع'}
                        </button>

                        <button
                          type="button"
                          data-testid={`delete-round-btn-${r.roundCode}`}
                          onClick={() => handleDeleteRound(r.roundCode, r.titleFa)}
                          className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35 cursor-pointer truncate"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Provably Fair Manual Draw Trigger & Last Result Card */}
          <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-extrabold text-white">
                🎰 اجرای قرعه‌کشی راس تایم و تقسیم ۸۵٪ استخر (SHA-256)
              </h2>
              {rounds.length > 0 && (
                <select
                  value={selectedRoundForDraw}
                  onChange={(e) => setSelectedRoundForDraw(e.target.value)}
                  aria-label="انتخاب دور قرعه‌کشی"
                  className="h-8 bg-[#090612] border border-purple-500/30 rounded-xl px-2 text-[11px] text-[#fbbf24] font-mono max-w-[165px] truncate"
                >
                  {rounds.map((r) => (
                    <option key={r.roundCode} value={r.roundCode}>
                      {r.roundCode} — {r.titleFa}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              disabled={drawing || rounds.length === 0}
              data-testid="execute-provably-fair-draw"
              onClick={() => handleExecuteDraw()}
              className="w-full h-11 rounded-xl gold-gradient-cta font-black text-xs text-slate-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>
                {drawing
                  ? 'در حال استخراج هش و تقسیم ۸۵٪ استخر...'
                  : '🎲 اجرای قرعه‌کشی دور انتخابی (کسر ۱۵٪ سایت + واریز ۸۵٪ جایزه)'}
              </span>
            </button>

            {drawnResult && (
              <div
                data-testid="drawn-balls-result"
                className="bg-[#090612] border border-[#00f59b]/40 rounded-xl p-3 space-y-2"
              >
                <div className="text-[11px] text-[#00f59b] font-bold">
                  ✅ گوی‌های برنده دور {selectedRoundForDraw} استخراج شد:
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap" dir="ltr">
                  {drawnResult.drawnMain.map((num) => (
                    <span
                      key={num}
                      className="w-8 h-8 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-xs flex items-center justify-center tabular-nums"
                    >
                      {String(num).padStart(2, '0')}
                    </span>
                  ))}
                  {drawnResult.drawnGolden > 0 && (
                    <>
                      <span className="text-[#fbbf24] font-black">+</span>
                      <span className="w-9 h-9 rounded-full lottery-ball-purple text-white font-mono font-black text-xs flex items-center justify-center border border-[#fbbf24] tabular-nums">
                        ★{String(drawnResult.drawnGolden).padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[10px] font-mono text-purple-300/70 break-all" dir="ltr">
                  hash <span className="text-[#00f59b]">{drawnResult.hash.replace(/^0x/, '')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION C: AUTOMATED DEPOSITS & HIGH-VALUE WITHDRAWAL APPROVAL GATE
          (Manual deposit approval removed; Admin approval ONLY for high-value withdrawals)
          ===================================================================== */}
      {showSection('CASHIER') && (
        <div className="space-y-3.5">
          {/* High-Value Withdrawal Threshold Controller */}
          <section
            data-testid="high-value-withdrawal-threshold-card"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h2 className="text-xs font-extrabold text-white">
                🛡️ سقف برداشت اتوماتیک و فیلتر مبالغ بالا
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-[#fbbf24]/15 text-[#fbbf24] text-[10px] font-mono font-bold" dir="ltr">
                Auto &lt; {autoWithdrawLimitTon} TON
              </span>
            </div>

            <p className="text-[11px] text-purple-200/85 leading-relaxed">
              واریزها و برداشت‌های زیر سقف تعیین‌شده <strong className="text-[#00f59b]">۱۰۰٪ خودکار از طریق TON Connect و تلگرام</strong> انجام می‌شوند. فقط برداشت‌های با مبلغ بالا (<strong className="text-[#fbbf24]">{autoWithdrawLimitTon} TON و بیشتر</strong>) جهت امنیت خزانه نیازمند تایید ادمین هستند.
            </p>

            <form onSubmit={handleSaveWithdrawThreshold} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-[#090612] border border-purple-500/30 rounded-xl px-3 h-10">
                <span className="text-[11px] text-purple-200 whitespace-nowrap">سقف اتوماتیک:</span>
                <input
                  type="number"
                  min={1}
                  step={5}
                  data-testid="input-auto-withdraw-limit-ton"
                  value={withdrawLimitDraftTon}
                  onChange={(e) => setWithdrawLimitDraftTon(Math.max(1, Number(e.target.value) || 50))}
                  className="w-full bg-transparent text-xs font-mono font-black text-[#fbbf24] text-center focus:outline-none"
                  dir="ltr"
                />
                <span className="text-[11px] font-mono font-bold text-cyan-300">TON</span>
              </div>
              <button
                type="submit"
                data-testid="save-withdraw-threshold-btn"
                className="h-10 px-3.5 rounded-xl tma-purple-cta font-bold text-xs text-white cursor-pointer shrink-0"
              >
                ذخیره سقف
              </button>
            </form>

            {withdrawLimitSavedBanner && (
              <div className="p-2 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold text-center">
                ✅ سقف برداشت اتوماتیک روی {withdrawLimitDraftTon} TON تنظیم شد!
              </div>
            )}
          </section>

          {/* High-Value Withdrawal Approval Queue */}
          <section
            data-testid="cockpit-withdrawal-approval-section"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3"
          >
            <div className="space-y-2 border-b border-purple-500/15 pb-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold text-white">
                  📤 تایید برداشت‌های مبالغ بالا ({toPersianDigits(pendingHighValueWithdrawals.length)} در انتظار)
                </h2>
                <span className="text-[10px] font-mono text-[#fbbf24]" dir="ltr">
                  &ge; {autoWithdrawLimitTon} TON Gate
                </span>
              </div>
              {pendingHighValueWithdrawals.length > 0 && (
                <button
                  type="button"
                  data-testid="cockpit-sweep-withdrawals-btn"
                  onClick={() => adminActionWithdrawal('ALL', 'sweep_all')}
                  className="w-full h-9 rounded-xl stake-emerald-cta font-bold text-xs text-[#041f14] cursor-pointer"
                >
                  ⚡ تایید و ارسال دسته‌ای تمام برداشت‌های مبالغ بالا
                </button>
              )}
            </div>

            <div className="space-y-2">
              {withdrawals.map((w) => {
                const isPending = w.status !== 'completed' && w.status !== 'rejected';
                return (
                  <div
                    key={w.withdrawalCode}
                    className="bg-[#090612] border border-purple-500/20 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#fbbf24]">
                        {w.withdrawalCode} • {w.userDisplayName}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded bg-purple-500/15 text-cyan-300 text-[11px] font-mono font-bold"
                        dir="ltr"
                      >
                        💎 {usdtToTonFormatted(w.netAmountUsdt)}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-purple-300/70 break-all" dir="ltr">
                      TON Dest: {w.destinationAddress}
                    </div>
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => adminActionWithdrawal(w.withdrawalCode, 'approve')}
                          className="h-8 rounded-lg bg-[#00f59b]/20 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold cursor-pointer"
                        >
                          ✓ تایید ادمین و ارسال TON
                        </button>
                        <button
                          type="button"
                          onClick={() => adminActionWithdrawal(w.withdrawalCode, 'reject')}
                          className="h-8 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300 text-[11px] font-bold cursor-pointer"
                        >
                          ✕ رد و برگشت به حساب
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-[#00f59b]">
                        وضعیت:{' '}
                        {w.status === 'completed'
                          ? '✅ تسویه شده در شبکه TON'
                          : '❌ رد شده (مبلغ به حساب کاربر برگشت)'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Automated TON Connect & Telegram Stars Deposit Feed (No Manual Approval Needed) */}
          <section
            data-testid="cockpit-automated-deposits-log"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
              <h2 className="text-xs font-extrabold text-white">
                📥 تراکنش‌های واریز خودکار TON و Stars ({toPersianDigits(deposits.length)})
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#00f59b]/15 text-[#00f59b] text-[10px] font-bold">
                ۱۰۰٪ اتوماتیک
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
              {deposits.map((dep) => {
                const explorerUrl = getBlockchainExplorerTxUrl('TON Network', dep.txHash);
                return (
                  <div
                    key={dep.depositCode}
                    className="bg-[#090612] border border-purple-500/20 rounded-xl p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#fbbf24]">
                        {dep.depositCode} • {dep.userDisplayName}
                      </span>
                      <span
                        className="text-[11px] font-mono font-bold text-[#00f59b]"
                        dir="ltr"
                      >
                        +{usdtToTonFormatted(dep.amountUsdt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-purple-300/70" dir="ltr">
                      <span className="truncate max-w-[220px]">TX: {dep.txHash}</span>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline shrink-0"
                      >
                        [TON Explorer]
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          SECTION A: OVERVIEW, EXCLUSIVE TON/STARS ORACLE & TREASURY KPIs
          (Other currencies & markup slider completely purged per user request)
          ===================================================================== */}
      {showSection('OVERVIEW') && (
        <div className="space-y-3.5">
          {/* TMA TON Vault & Telegram Admin ID Lock Configuration */}
          <section
            data-testid="tma-admin-config-card"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h2 className="text-xs font-extrabold text-white">
                💎 خزانه رسمی TON و قفل آیدی ادمین تلگرام
              </h2>
              <span className="text-[10px] font-mono text-[#00f59b]" dir="ltr">
                TON Connect 2.0
              </span>
            </div>

            <form onSubmit={handleSaveTmaAdminSettings} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-200 block">
                  آدرس کیف پول مادر TON جهت واریز خودکار (`ADMIN_TON_WALLET_ADDRESS`):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="input-admin-ton-wallet"
                  value={tmaTonVaultDraft}
                  onChange={(e) => setTmaTonVaultDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-[11px] font-mono text-cyan-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-200 block">
                  آیدی‌های عددی مجاز ادمین تلگرام (`ADMIN_TELEGRAM_USER_IDS`):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="input-admin-telegram-ids"
                  value={tmaAdminIdsDraft}
                  onChange={(e) => setTmaAdminIdsDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-[11px] font-mono text-[#fbbf24]"
                />
              </div>

              <button
                type="submit"
                data-testid="save-tma-admin-config-btn"
                className="w-full h-10 rounded-xl tma-purple-cta font-bold text-xs cursor-pointer"
              >
                ذخیره آدرس خزانه TON و آیدی‌های ادمین
              </button>

              {tmaSavedBanner && (
                <div className="p-2 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold text-center">
                  ✅ تنظیمات خزانه TON و قفل آیدی ادمین تلگرام ذخیره شد!
                </div>
              )}
            </form>
          </section>

          {/* Exclusive TON & Telegram Stars Live Rate Card (Other currencies purged) */}
          <section className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/15 pb-2">
              <div>
                <h2 className="text-xs font-extrabold text-white">
                  📡 نرخ همگام‌سازی شبکه TON و Telegram Stars
                </h2>
                <span className="text-[10px] font-mono text-purple-300/70" dir="ltr">
                  {oracleSnapshot?.source || 'TonAPI Live Feed'} ({oracleCountdownSec}s)
                </span>
              </div>
              <button
                type="button"
                data-testid="admin-sync-ton-oracle-btn"
                onClick={() => refreshPriceOracleNow()}
                className="h-8 px-3 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold cursor-pointer shrink-0"
              >
                ↻ بروزرسانی TON
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5" dir="ltr">
              <div className="bg-[#090612] border border-purple-500/25 rounded-xl p-2.5 space-y-1">
                <span className="text-[10px] text-cyan-300 font-bold block">💎 TON Network Rate</span>
                <input
                  type="number"
                  step="0.01"
                  value={tonUsdRate}
                  onChange={(e) => setTonUsdRate(Math.max(0.5, Number(e.target.value) || 5.2))}
                  className="w-full h-8 bg-[#130d24] border border-purple-500/30 rounded-lg px-2 text-xs font-mono font-black text-[#00f59b]"
                />
              </div>
              <div className="bg-[#090612] border border-purple-500/25 rounded-xl p-2.5 space-y-1">
                <span className="text-[10px] text-[#fbbf24] font-bold block">⭐ Telegram Stars Rate</span>
                <input
                  type="number"
                  step="0.005"
                  value={starsUsdRate}
                  onChange={(e) => setStarsUsdRate(Math.max(0.005, Number(e.target.value) || 0.02))}
                  className="w-full h-8 bg-[#130d24] border border-purple-500/30 rounded-lg px-2 text-xs font-mono font-black text-[#fbbf24]"
                />
              </div>
            </div>
          </section>

          {/* 4 Executive Financial KPI Cards Strictly in TON */}
          <section className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3 space-y-1">
              <span className="text-[10px] text-purple-300/70 block">کل موجودی استخرهای فعال</span>
              <div className="text-sm font-black text-white font-mono tabular-nums" dir="ltr">
                💎 {usdtToTonFormatted(globalPoolSplit.grossCollectedUsdt)}
              </div>
              <span className="text-[9px] font-mono text-purple-300/80 block">
                {toPersianDigits(rounds.length)} دور فعال در مدار
              </span>
            </div>

            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3 space-y-1">
              <span className="text-[10px] text-purple-300/70 block">سهم محفوظ ۱۵٪ سایت</span>
              <div className="text-sm font-black text-[#00f59b] font-mono tabular-nums" dir="ltr">
                +{usdtToTonFormatted(globalPoolSplit.houseFee15Usdt)}
              </div>
              <span className="text-[9px] font-mono text-[#fbbf24] block" dir="ltr">
                15% House Share Locked
              </span>
            </div>

            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3 space-y-1">
              <span className="text-[10px] text-purple-300/70 block">جایزه قابل تقسیم (۸۵٪)</span>
              <div className="text-sm font-black text-[#fbbf24] font-mono tabular-nums" dir="ltr">
                💎 {usdtToTonFormatted(globalPoolSplit.distributablePool85Usdt)}
              </div>
              <span className="text-[9px] text-purple-300/70 block">
                تقسیم خودکار راس تایم
              </span>
            </div>

            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3 space-y-1">
              <span className="text-[10px] text-purple-300/70 block">حسابرسی دفترکل PAM</span>
              <div className="text-sm font-black text-white font-mono tabular-nums" dir="ltr">
                {pamReconciliation?.ledgerEntriesCount || 1} TXs
              </div>
              <button
                type="button"
                onClick={() => setWalletDrawerOpen(true)}
                className="text-[10px] font-bold text-[#00f59b] underline cursor-pointer"
              >
                مشاهده دفترکل ↗
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          SECTION D: TELEGRAM BOT, GROUP/CHANNEL NOTIFICATIONS & WEBHOOK CONFIG
          ===================================================================== */}
      {showSection('CONFIG') && (
        <div className="space-y-3.5">
          <section
            data-testid="cockpit-telegram-alert-bot-section"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-extrabold text-white">
                🤖 اتصال ربات تلگرام، نوتیفیکیشن و گروه/کانال
              </h2>
              <button
                type="button"
                data-testid="cockpit-test-telegram-alert-btn"
                disabled={sendingTgTest}
                onClick={handleTestTelegramAlert}
                className="h-8 px-3 rounded-xl bg-sky-500 text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
              >
                {sendingTgTest ? 'در حال ارسال...' : '✈️ تست هشدار تلگرام'}
              </button>
            </div>

            {tgBanner && (
              <div
                data-testid="cockpit-telegram-banner"
                className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-200 text-[11px] font-bold"
              >
                {tgBanner}
              </div>
            )}

            <form onSubmit={handleSaveTelegramBot} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  توکن ربات تلگرام از @BotFather (`TELEGRAM_BOT_TOKEN`):
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="123456789:AAH..."
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  آیدی گروه، کانال یا ادمین تلگرام (`@Channel` یا `-100...`):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="@LuckyDropVIP_Group or -100198237465"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-[#fbbf24] font-mono"
                />
              </div>
              <button
                type="submit"
                data-testid="save-telegram-config-btn"
                className="w-full h-9 rounded-xl bg-purple-600/35 border border-purple-400/40 text-white font-bold text-xs cursor-pointer"
              >
                ذخیره تنظیمات ربات و گروه تلگرام
              </button>
            </form>

            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
              {telegramAlertsLog.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  data-testid={`telegram-alert-item-${alert.id}`}
                  className="bg-[#090612] border border-purple-500/15 rounded-xl p-2.5 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{alert.titleFa}</div>
                    <div className="text-[10px] text-purple-300/70 truncate">{alert.summaryFa}</div>
                  </div>
                  <span className="font-mono text-[#00f59b] font-bold shrink-0" dir="ltr">
                    💎 {usdtToTonFormatted(alert.amountUsdt || 0)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          SECTION E: PLATFORM SECURITY AUDIT & VIP CONCIERGE CHAT
          ===================================================================== */}
      {showSection('SHIELD') && (
        <div className="space-y-3.5">
          {/* Platform Security & Zero-Loss Architecture Audit */}
          <section
            data-testid="cockpit-solvency-shield-section"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h2 className="text-xs font-extrabold text-white">
                🛡️ ممیزی امنیت سایت و سپر عدم ضرر (Security Audit)
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#00f59b]/15 text-[#00f59b] text-[10px] font-mono font-bold">
                6/6 SECURE
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-[11px]">
              {[
                {
                  title: '۱. قفل ۱۵٪ سهم سایت و ۸۵٪ استخر پویا (Zero-Loss Pool)',
                  desc: 'جوایز راس تایم منحصراً از ۸۵٪ کل فروش واقعی استخر پرداخت شده و ۱۵٪ سود سایت به صورت قطعی کسر می‌گردد.',
                },
                {
                  title: '۲. موتور رمزنگاری HMAC-SHA256 (Provably Fair)',
                  desc: 'تمام گوی‌های لاتاری و ضرایب مینی‌گیم‌ها با هش تعهد ۶۴ کاراکتری غیرقابل دستکاری تولید می‌شوند.',
                },
                {
                  title: '۳. دفترکل ضدتکرار PAM (Idempotent UUID Ledger)',
                  desc: 'جلوگیری ۱۰۰٪ از Double-Spend و ثبت مجدد تراکنش‌ها با شناسه یکتای تراکنش و قفل اتمیک.',
                },
                {
                  title: '۴. دروازه امنیتی برداشت مبالغ بالا (High-Value Gate)',
                  desc: `برداشت‌های کمتر از ${autoWithdrawLimitTon} TON خودکار و مبالغ بالاتر نیازمند تایید مستقیم ادمین هستند.`,
                },
                {
                  title: '۵. قوانین امنیتی دیتابیس ابری (Firestore RBAC Rules)',
                  desc: 'دسترسی نوشتن تنظیمات خزانه و تایید برداشت‌ها در دیتابیس صرفاً به ادمین محدود شده است.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-[#090612] border border-purple-500/20 rounded-xl p-2.5 space-y-1"
                >
                  <div className="font-bold text-[#00f59b]">{item.title}</div>
                  <div className="text-[10px] text-purple-200/80 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Live VIP Customer Support Chat Console */}
          <section className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-white">💬 کنسول گفتگوی زنده با VIP</h2>
              <span className="text-[10px] font-bold text-[#00f59b]">
                ذخیره وفاداری: {usdtToTonFormatted(rolloverReservePoolUsdt)} ({toPersianDigits(chestsClaimedCount)} صندوقچه)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5" dir="ltr">
              {['VIP-KAMRAN', 'VIP-NASTARAN', 'VIP-AMIR'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveSessionCode(code)}
                  className={`h-8 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                    activeSessionCode === code
                      ? 'bg-purple-600/35 border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#090612] border-purple-500/20 text-purple-300/60'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {sessionMessages.map((msg) => {
                const isOperator = msg.senderRole === 'OPERATOR';
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      isOperator
                        ? 'bg-[#fbbf24]/10 border-[#fbbf24]/35 text-amber-100'
                        : 'bg-[#090612] border-purple-500/20 text-purple-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{msg.senderName}</span>
                      <span className="text-[9px] font-mono text-[#fbbf24]">{msg.vipLevel}</span>
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendOperatorReply} className="space-y-2">
              <textarea
                rows={2}
                value={operatorReply}
                onChange={(e) => setOperatorReply(e.target.value)}
                placeholder={`پاسخ اپراتور به ${activeSessionCode}...`}
                className="w-full bg-[#090612] border border-purple-500/25 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={sendingReply}
                data-testid="cockpit-send-reply-btn"
                className="w-full h-9 rounded-xl stake-emerald-cta font-bold text-xs text-[#041f14] cursor-pointer"
              >
                {sendingReply ? 'در حال ارسال...' : 'ارسال پاسخ رسمی به بازیکن VIP'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
