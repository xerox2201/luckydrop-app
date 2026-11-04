import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  toPersianDigits,
  calculateDynamicPariMutuelPool,
  getBlockchainExplorerTxUrl,
} from '../utils/lotteryEngine.ts';
import {
  LuxuryIconBadge,
  AiNeuralCoreIcon,
  TelemetryChartIcon,
  SecurityAuditRadarIcon,
  RoyalJackpotCrownIcon,
  SquadSyndicateIcon,
  VipConciergeHeadsetIcon,
  VipTicketIcon,
  TonCrystalIcon,
  ProvablyFairShieldIcon,
} from './ui/LuxuryIcons.tsx';
import type {
  AdminCopilotActionId,
  AdminExecutiveTelemetrySnapshot,
} from '../services/aiCopilotEngine.ts';
import { tr, normalizeLocale } from '../utils/i18n.ts';

type AdminMobileSectionTab =
  | 'ALL'
  | 'USERS'
  | 'OVERVIEW'
  | 'ROUNDS'
  | 'CASHIER'
  | 'CONFIG'
  | 'SHIELD';

interface AdminCrmUserItem {
  telegramUserId: string;
  username: string;
  firstName: string;
  displayName: string;
  vipTier: string;
  tonBalance: number;
  starsBalance: number;
  freeLotteryTickets: number;
  totalTicketsCount: number;
  totalWageredUsdt: number;
  totalWageredTon: number;
  connectedWalletAddress: string;
  isBanned: boolean;
  banReason: string;
  createdAt: string;
}

interface AdminAuditLogItem {
  id: string;
  timestamp: string;
  adminUserId: string;
  targetUserId: string;
  actionType: 'BALANCE_ADJUSTMENT' | 'USER_BAN_TOGGLE' | 'DB_RESTORE';
  currency?: 'TON' | 'STARS' | 'FREE_TICKETS';
  deltaAmount?: number;
  previousBalance?: number;
  newBalance?: number;
  reason: string;
}

interface TelegramWebhookStatusInfo {
  ok: boolean;
  configured?: boolean;
  botTokenConfigured: boolean;
  url: string;
  expectedWebhookUrl: string;
  pendingUpdateCount: number;
  lastErrorDate: number | null;
  lastErrorMessage: string;
}

const normalizeDigits = (val: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let out = String(val ?? '').trim();
  for (let i = 0; i < 10; i++) {
    out = out.replace(new RegExp(persianDigits[i], 'g'), String(i));
    out = out.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return out.replace(/[,٬]/g, '');
};

const isMaskedBotTokenInput = (val: string): boolean => {
  const trimmed = String(val || '').trim();
  if (!trimmed) return false;
  if (/^[*•]+/.test(trimmed) || trimmed.includes('CONFIGURED_IN_ENV')) return true;
  return !/^\d{5,}:[A-Za-z0-9_-]{10,}$/.test(trimmed);
};

export const CockpitView: React.FC = () => {
  const {
    lang,
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
    refreshSnapshot,
    markSupportMessagesRead,
    monthlySuperJackpot,
    updateMonthlySuperJackpotConfig,
    triggerMonthlySuperJackpotDraw,
    welcomeGrandLottery,
    updateWelcomeLotteryConfig,
    triggerWelcomeLotteryDraw,
    syndicatePools,
    referralProfile,
    growthQuests,
    referralEvents,
    sseConnected,
  } = useLottery();

  const [activeMobileTab, setActiveMobileTab] = useState<AdminMobileSectionTab>('ALL');
  const [minTicketsDraft, setMinTicketsDraft] = useState<string>(
    String(monthlySuperJackpot?.minTicketsRequired || 10)
  );
  const [minXpDraft, setMinXpDraft] = useState<string>(
    String(monthlySuperJackpot?.minXpRequired || 500)
  );
  const [seedMonthlyTonDraft, setSeedMonthlyTonDraft] = useState<string>('25');
  const [monthlyVaultBusy, setMonthlyVaultBusy] = useState<boolean>(false);
  const [monthlyVaultBanner, setMonthlyVaultBanner] = useState<string | null>(null);

  const [welcomeTargetUsdtDraft, setWelcomeTargetUsdtDraft] = useState<string>(
    String(welcomeGrandLottery?.targetPoolUsdt || 1000)
  );
  const [welcomeAddReserveTonDraft, setWelcomeAddReserveTonDraft] = useState<string>('0');
  const [welcomeExtendDaysDraft, setWelcomeExtendDaysDraft] = useState<string>('0');
  const [welcomeAdminBusy, setWelcomeAdminBusy] = useState<boolean>(false);
  const [welcomeAdminBanner, setWelcomeAdminBanner] = useState<string | null>(null);

  const getAdminFetchHeaders = React.useCallback((): Record<string, string> => {
    const rawWebAppInitData =
      typeof window !== 'undefined'
        ? String((window as any)?.Telegram?.WebApp?.initData || '').trim()
        : '';
    const previewInitData =
      rawWebAppInitData ||
      `user=${encodeURIComponent(
        JSON.stringify({
          id: telegramUser.id,
          first_name: telegramUser.first_name || 'Admin',
          username: telegramUser.username || `tg_${telegramUser.id}`,
        })
      )}`;
    return {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': previewInitData,
      'X-Telegram-User-Id': String(telegramUser.id || ''),
    };
  }, [telegramUser.id, telegramUser.first_name, telegramUser.username]);

  // =========================================================================
  // PHASE 3 STATES: USERS CRM, BALANCE ADJUST, BROADCAST, WEBHOOK & DB BACKUP
  // =========================================================================
  const [crmUsers, setCrmUsers] = useState<AdminCrmUserItem[]>([]);
  const [crmTotalCount, setCrmTotalCount] = useState<number>(0);
  const [crmSearch, setCrmSearch] = useState<string>('');
  const [crmLoading, setCrmLoading] = useState<boolean>(false);
  const [crmBanReasonDraft, setCrmBanReasonDraft] = useState<string>('');
  const [crmBanner, setCrmBanner] = useState<string | null>(null);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLogItem[]>([]);

  // Manual Balance Adjustment Form State
  const [adjustTargetUserId, setAdjustTargetUserId] = useState<string>('');
  const [adjustCurrency, setAdjustCurrency] = useState<'TON' | 'STARS' | 'FREE_TICKETS'>('TON');
  const [adjustDeltaAmount, setAdjustDeltaAmount] = useState<string>('10');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState<boolean>(false);
  const [adjustBanner, setAdjustBanner] = useState<string | null>(null);

  // Mass Telegram Bot Broadcast State
  const [broadcastMessageText, setBroadcastMessageText] = useState<string>('');
  const [broadcastButtonText, setBroadcastButtonText] = useState<string>('🎰 ورود به LuckyDrop');
  const [broadcastButtonUrl, setBroadcastButtonUrl] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin : 'https://luckydrop.com'
  );
  const [broadcastSending, setBroadcastSending] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    totalUsers: number;
    sentCount: number;
    failedCount: number;
  } | null>(null);

  // 1-Click Webhook Verifier & Auto-Setter State
  const [webhookStatus, setWebhookStatus] = useState<TelegramWebhookStatusInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState<boolean>(false);
  const [webhookBinding, setWebhookBinding] = useState<boolean>(false);
  const [webhookBanner, setWebhookBanner] = useState<string | null>(null);

  // 1-Click DB Backup & Restore State
  const [dbBackupDownloading, setDbBackupDownloading] = useState<boolean>(false);
  const [dbRestoring, setDbRestoring] = useState<boolean>(false);
  const [dbBackupBanner, setDbBackupBanner] = useState<string | null>(null);

  const fetchAdminUsersCrm = React.useCallback(
    async (searchQuery?: string) => {
      setCrmLoading(true);
      try {
        const q = encodeURIComponent((searchQuery ?? crmSearch).trim());
        const res = await fetch(`/api/admin/users?search=${q}&limit=100`, {
          headers: getAdminFetchHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setCrmUsers(Array.isArray(data.users) ? data.users : []);
          setCrmTotalCount(Number(data.totalCount || 0));
          if (Array.isArray(data.adminAuditLogs)) {
            setAdminAuditLogs(data.adminAuditLogs);
          }
        }
      } catch {
        // ignore network errors
      } finally {
        setCrmLoading(false);
      }
    },
    [crmSearch, getAdminFetchHeaders]
  );

  const fetchWebhookStatus = React.useCallback(async () => {
    setWebhookLoading(true);
    try {
      const res = await fetch('/api/admin/telegram/webhook-status', {
        headers: getAdminFetchHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (data) {
        setWebhookStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setWebhookLoading(false);
    }
  }, [getAdminFetchHeaders]);

  // Admin Executive AI Copilot & 24/7 Concierge Auto-Reply State
  const [aiAutoReplyEnabled, setAiAutoReplyEnabled] = useState<boolean>(true);
  const [activeCopilotAction, setActiveCopilotAction] =
    useState<AdminCopilotActionId>('BALANCE_SHEET');
  const [aiCopilotBusy, setAiCopilotBusy] = useState<boolean>(false);
  const [aiCopilotTitle, setAiCopilotTitle] = useState<string>(
    'گزارش جامع ترازنامه ۵-بخشی و سود خالص سایت (6-Decimal Precision)'
  );
  const [aiCopilotReport, setAiCopilotReport] = useState<string>('');
  const [aiCopilotTelemetry, setAiCopilotTelemetry] =
    useState<AdminExecutiveTelemetrySnapshot | null>(null);

  const executeAdminAiCopilotAction = React.useCallback(
    async (
      actionType: AdminCopilotActionId = 'BALANCE_SHEET',
      toggleAutoReply?: boolean
    ) => {
      setAiCopilotBusy(true);
      setActiveCopilotAction(actionType);
      try {
        const res = await fetch('/api/admin/ai-copilot', {
          method: 'POST',
          headers: getAdminFetchHeaders(),
          body: JSON.stringify({
            actionType,
            locale: normalizeLocale(lang),
            ...(typeof toggleAutoReply === 'boolean'
              ? { aiAutoReplyEnabled: toggleAutoReply }
              : {}),
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          if (typeof data.aiAutoReplyEnabled === 'boolean') {
            setAiAutoReplyEnabled(data.aiAutoReplyEnabled);
          }
          if (data.title || data.titleFa) setAiCopilotTitle(data.title || data.titleFa);
          if (data.report || data.reportFa) setAiCopilotReport(data.report || data.reportFa);
          if (data.telemetry) setAiCopilotTelemetry(data.telemetry);
        }
      } catch {
        // ignore network errors
      } finally {
        setAiCopilotBusy(false);
      }
    },
    [getAdminFetchHeaders, lang]
  );

  React.useEffect(() => {
    void fetchAdminUsersCrm('');
    void fetchWebhookStatus();
    void executeAdminAiCopilotAction('BALANCE_SHEET');
  }, [fetchAdminUsersCrm, fetchWebhookStatus, executeAdminAiCopilotAction]);

  const handleToggleUserBan = async (user: AdminCrmUserItem) => {
    try {
      const res = await fetch('/api/admin/users/toggle-ban', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({
          telegramUserId: user.telegramUserId,
          isBanned: !user.isBanned,
          reason:
            crmBanReasonDraft.trim() ||
            (!user.isBanned ? 'Suspended by administration' : 'Reinstated by administration'),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setCrmBanner(
          data.isBanned
            ? `🚫 حساب کاربر #${user.telegramUserId} مسدود (Banned) شد.`
            : `✅ مسدودیت حساب کاربر #${user.telegramUserId} رفع گردید.`
        );
        setTimeout(() => setCrmBanner(null), 4500);
        void fetchAdminUsersCrm();
        void refreshSnapshot();
      } else {
        setCrmBanner(`❌ خطا: ${data?.error || 'عدم دسترسی ادمین'}`);
        setTimeout(() => setCrmBanner(null), 4500);
      }
    } catch (err: any) {
      setCrmBanner(`❌ خطا: ${err?.message || 'Network Error'}`);
    }
  };

  const handleAdjustUserBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = normalizeDigits(adjustTargetUserId);
    const numericDelta = Number(normalizeDigits(adjustDeltaAmount));
    const cleanReason =
      String(adjustReason ?? '').trim() || 'اصلاح دستی توسط ادمین (Admin Adjustment)';

    if (!cleanTarget || !Number.isFinite(numericDelta) || numericDelta === 0) {
      const warnMsg = '⚠️ لطفاً آیدی کاربر هدف و مقدار عددی غیرصفر را وارد کنید.';
      setCrmBanner(warnMsg);
      setAdjustBanner(warnMsg);
      setTimeout(() => {
        setCrmBanner(null);
        setAdjustBanner(null);
      }, 4500);
      return;
    }
    setAdjustSubmitting(true);
    setAdjustBanner(null);
    try {
      const res = await fetch('/api/admin/users/adjust-balance', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({
          targetUserId: cleanTarget,
          currency: adjustCurrency,
          deltaAmount: numericDelta,
          reason: cleanReason,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const successMsg = `✅ موجودی کاربر #${cleanTarget} (${adjustCurrency}: ${
          numericDelta >= 0 ? `+${numericDelta}` : numericDelta
        }) با موفقیت تغییر یافت (موجودی جدید: ${data.newBalance}).`;
        setCrmBanner(successMsg);
        setAdjustBanner(successMsg);
        setAdjustReason('');
        if (Array.isArray(data.adminAuditLogs)) {
          setAdminAuditLogs(data.adminAuditLogs);
        }
        await Promise.all([fetchAdminUsersCrm(), refreshSnapshot()]);
      } else {
        const errMsg = `❌ خطا در تغییر موجودی: ${data?.error || 'خطای سرور'}`;
        setCrmBanner(errMsg);
        setAdjustBanner(errMsg);
      }
    } catch (err: any) {
      const errMsg = `❌ خطا: ${err?.message || 'Network Error'}`;
      setCrmBanner(errMsg);
      setAdjustBanner(errMsg);
    } finally {
      setAdjustSubmitting(false);
      setTimeout(() => {
        setCrmBanner(null);
        setAdjustBanner(null);
      }, 6500);
    }
  };

  const handleMassBroadcastUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessageText.trim()) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/admin/telegram/broadcast-users', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({
          messageText: broadcastMessageText,
          buttonText: broadcastButtonText,
          buttonUrl: broadcastButtonUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setBroadcastResult({
          totalUsers: Number(data.totalUsers || 0),
          sentCount: Number(data.sentCount || 0),
          failedCount: Number(data.failedCount || 0),
        });
        setTgBanner(
          `📢 ارسال همگانی به پایان رسید: ${data.sentCount} موفق از ${data.totalUsers} کاربر (${data.failedCount} ناموفق).`
        );
      } else {
        setTgBanner(`❌ خطا در ارسال همگانی: ${data?.error || 'خطای سرور'}`);
      }
    } catch (err: any) {
      setTgBanner(`❌ خطا: ${err?.message || 'Network Error'}`);
    } finally {
      setBroadcastSending(false);
      setTimeout(() => setTgBanner(null), 6500);
    }
  };

  const handleAutoBindWebhook = async () => {
    setWebhookBinding(true);
    setWebhookBanner(null);
    try {
      const res = await fetch('/api/admin/telegram/set-webhook', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({
          appDomain: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setWebhookBanner(`✅ وبهوک تلگرام با موفقیت روی ${data.webhookUrl} ثبت و فعال شد!`);
        await fetchWebhookStatus();
      } else {
        setWebhookBanner(`❌ خطا در ثبت وبهوک: ${data?.error || 'خطای تلگرام'}`);
      }
    } catch (err: any) {
      setWebhookBanner(`❌ خطا: ${err?.message || 'Network Error'}`);
    } finally {
      setWebhookBinding(false);
      setTimeout(() => setWebhookBanner(null), 6500);
    }
  };

  const handleDownloadDbBackup = async () => {
    setDbBackupDownloading(true);
    setDbBackupBanner(null);
    try {
      const res = await fetch('/api/admin/db/backup-to-telegram', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({ targetAdminId: String(telegramUser.id || '6176189129') }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setDbBackupBanner(`❌ خطا در تهیه بکاپ: ${data?.error || res.statusText}`);
        return;
      }

      const fileName = data.fileName || `luckydrop_backup_${Date.now()}.json`;
      const rawJson = JSON.stringify(data.backup || data, null, 2);
      const signedPath = String(data.downloadUrl || '');
      const fullDownloadUrl =
        typeof window !== 'undefined' && signedPath
          ? `${window.location.origin}${signedPath}`
          : '';

      const tgWebApp = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : null;
      const isInsideTelegramWebView = Boolean(tgWebApp?.initData);

      // Method B: Direct URL / Telegram WebApp downloadFile or openLink for Mobile WebView + Blob fallback for Desktop
      if (isInsideTelegramWebView && fullDownloadUrl) {
        if (typeof tgWebApp.downloadFile === 'function') {
          try {
            tgWebApp.downloadFile({ url: fullDownloadUrl, file_name: fileName });
          } catch {
            if (typeof tgWebApp.openLink === 'function') {
              tgWebApp.openLink(fullDownloadUrl);
            }
          }
        } else if (typeof tgWebApp.openLink === 'function') {
          tgWebApp.openLink(fullDownloadUrl);
        }
      } else {
        const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      if (data.telegramSent) {
        setDbBackupBanner(
          `✅ فایل پشتیبان (${fileName}) مستقیماً به پیوی تلگرام ادمین (#${data.recipientChatId}) ارسال شد و لینک دانلود مستقیم فعال گردید!`
        );
      } else {
        setDbBackupBanner(
          `✅ فایل پشتیبان آماده و دانلود شد (${data.telegramDescription || 'ذخیره محلی انجام شد'}).`
        );
      }
    } catch (err: any) {
      setDbBackupBanner(`❌ خطا در دانلود بکاپ: ${err?.message || 'Network Error'}`);
    } finally {
      setDbBackupDownloading(false);
      setTimeout(() => setDbBackupBanner(null), 7500);
    }
  };

  const handleRestoreDbBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDbRestoring(true);
    setDbBackupBanner(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/admin/db/restore', {
        method: 'POST',
        headers: getAdminFetchHeaders(),
        body: JSON.stringify({ backup: parsed }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setDbBackupBanner(
          `✅ دیتابیس با موفقیت بازیابی شد! (${data.restoredUsersCount} کاربر، ${data.restoredRoundsCount} دور، ${data.restoredTicketsCount} بلیت)`
        );
        await refreshSnapshot();
        await fetchAdminUsersCrm();
      } else {
        setDbBackupBanner(`❌ خطا در بازیابی دیتابیس: ${data?.error || 'ساختار فایل نامعتبر است'}`);
      }
    } catch (err: any) {
      setDbBackupBanner(`❌ خطا در خواندن فایل JSON: ${err?.message || 'Invalid JSON'}`);
    } finally {
      setDbRestoring(false);
      e.target.value = '';
      setTimeout(() => setDbBackupBanner(null), 6500);
    }
  };

  const effectiveTonRate = tonUsdRate > 0 ? tonUsdRate : 5.0;
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

  // Admin Telegram Bot Alert & Brand Identity State
  const [tgEnabled, setTgEnabled] = useState<boolean>(telegramBotConfig.enabled);
  const [tgBotToken, setTgBotToken] = useState<string>(telegramBotConfig.botToken);
  const [tgChatId, setTgChatId] = useState<string>(telegramBotConfig.adminChatId);
  const [tgSupportUsername, setTgSupportUsername] = useState<string>(
    telegramBotConfig.supportTelegramUsername || '@LuckyDrop_Support'
  );
  const [tgOfficialBrandTitle, setTgOfficialBrandTitle] = useState<string>(
    telegramBotConfig.officialBrandTitle ||
      '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol'
  );
  const [tgBanner, setTgBanner] = useState<string | null>(null);
  const [sendingTgTest, setSendingTgTest] = useState<boolean>(false);
  const [roundActionBanner, setRoundActionBanner] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);

  React.useEffect(() => {
    if (telegramBotConfig.botToken && !tgBotToken) setTgBotToken(telegramBotConfig.botToken);
    if (telegramBotConfig.adminChatId && !tgChatId) setTgChatId(telegramBotConfig.adminChatId);
    if (telegramBotConfig.supportTelegramUsername) {
      setTgSupportUsername(telegramBotConfig.supportTelegramUsername);
    }
    if (telegramBotConfig.officialBrandTitle) {
      setTgOfficialBrandTitle(telegramBotConfig.officialBrandTitle);
    }
  }, [
    telegramBotConfig.botToken,
    telegramBotConfig.adminChatId,
    telegramBotConfig.supportTelegramUsername,
    telegramBotConfig.officialBrandTitle,
  ]);

  const handleSaveTelegramBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeTokenToSend = isMaskedBotTokenInput(tgBotToken) ? '' : tgBotToken.trim();
    await updateTelegramBotConfig({
      enabled: tgEnabled,
      botToken: safeTokenToSend,
      adminChatId: tgChatId,
      supportTelegramUsername: tgSupportUsername.trim() || '@LuckyDrop_Support',
      officialBrandTitle:
        tgOfficialBrandTitle.trim() ||
        '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
    });
    await fetchWebhookStatus();
    setTgBanner(
      '✅ تنظیمات ربات تلگرام، آیدی پشتیبانی مستقیم و عنوان رسمی برند روی سرور ذخیره شد!'
    );
    setTimeout(() => setTgBanner(null), 5000);
  };

  const handleTestTelegramAlert = async () => {
    setSendingTgTest(true);
    const safeTokenToSend = isMaskedBotTokenInput(tgBotToken) ? '' : tgBotToken.trim();
    if (safeTokenToSend || tgChatId.trim() || tgSupportUsername.trim()) {
      await updateTelegramBotConfig({
        enabled: tgEnabled,
        botToken: safeTokenToSend,
        adminChatId: tgChatId,
        supportTelegramUsername: tgSupportUsername.trim() || '@LuckyDrop_Support',
        officialBrandTitle:
          tgOfficialBrandTitle.trim() ||
          '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
      });
    }
    const res = await sendTestTelegramAlert();
    await fetchWebhookStatus();
    setSendingTgTest(false);
    setTgBanner(res.message || res.note);
    setTimeout(() => setTgBanner(null), 8500);
  };

  // Draw execution state
  const [selectedRoundForDraw, setSelectedRoundForDraw] = useState<string>(
    rounds[0]?.roundCode || '#LD-8493'
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

  // Live VIP Customer Chat Console state (dynamically populated from supportMessages with rich user metadata)
  const dynamicSupportThreads = React.useMemo(() => {
    const map = new Map<
      string,
      {
        sessionCode: string;
        telegramUserId: string;
        displayName: string;
        username: string;
        tonBalance: number;
        starsBalance: number;
        walletBalanceLabel: string;
        unreadAdminCount: number;
        lastMessageAt: string;
      }
    >();

    for (const m of supportMessages) {
      const code = m.sessionCode || (m.telegramUserId ? `TG-${m.telegramUserId}` : 'TG-UNKNOWN');
      const extractedId =
        m.telegramUserId || code.replace(/^#?TG-/i, '').replace(/[^0-9]/g, '') || '';
      const crmMatch = crmUsers.find((u) => u.telegramUserId === extractedId);
      const isUnreadUserMsg =
        String(m.senderRole || '').toUpperCase() === 'USER' && m.readByAdmin === false;

      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          sessionCode: code,
          telegramUserId: extractedId || String(telegramUser.id),
          displayName:
            crmMatch?.displayName ||
            m.firstName ||
            (String(m.senderRole || '').toUpperCase() === 'USER' ? m.senderName : '') ||
            `User #${extractedId}`,
          username:
            crmMatch?.username ||
            (m.username ? `@${m.username.replace(/^@/, '')}` : `@user_${extractedId}`),
          tonBalance:
            typeof crmMatch?.tonBalance === 'number'
              ? crmMatch.tonBalance
              : typeof m.tonBalance === 'number'
              ? m.tonBalance
              : 0,
          starsBalance:
            typeof crmMatch?.starsBalance === 'number'
              ? crmMatch.starsBalance
              : typeof m.starsBalance === 'number'
              ? m.starsBalance
              : 0,
          walletBalanceLabel: m.walletBalanceLabel || '',
          unreadAdminCount: isUnreadUserMsg ? 1 : 0,
          lastMessageAt: m.createdAt,
        });
      } else if (isUnreadUserMsg) {
        existing.unreadAdminCount += 1;
      }
    }

    const currentTgCode = `TG-${telegramUser.id}`;
    if (!map.has(currentTgCode)) {
      const selfCrm = crmUsers.find((u) => u.telegramUserId === String(telegramUser.id));
      map.set(currentTgCode, {
        sessionCode: currentTgCode,
        telegramUserId: String(telegramUser.id),
        displayName: selfCrm?.displayName || telegramUser.first_name || 'Admin VIP',
        username: selfCrm?.username || `@${telegramUser.username || `tg_${telegramUser.id}`}`,
        tonBalance: selfCrm?.tonBalance ?? 0,
        starsBalance: selfCrm?.starsBalance ?? 0,
        walletBalanceLabel: `${(selfCrm?.tonBalance ?? 0).toFixed(2)} TON`,
        unreadAdminCount: 0,
        lastMessageAt: 'همین الان',
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const aIsTg = a.sessionCode.startsWith('TG-') ? 1 : 0;
      const bIsTg = b.sessionCode.startsWith('TG-') ? 1 : 0;
      if (aIsTg !== bIsTg) return bIsTg - aIsTg;
      return b.unreadAdminCount - a.unreadAdminCount;
    });
  }, [supportMessages, crmUsers, telegramUser.id, telegramUser.first_name, telegramUser.username]);

  const [activeSessionCode, setActiveSessionCode] = useState<string>(
    () => dynamicSupportThreads[0]?.sessionCode || `TG-${telegramUser.id}`
  );
  const [operatorReply, setOperatorReply] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [supportReplyBanner, setSupportReplyBanner] = useState<string | null>(null);

  React.useEffect(() => {
    if (
      dynamicSupportThreads.length > 0 &&
      !dynamicSupportThreads.some((t) => t.sessionCode === activeSessionCode)
    ) {
      setActiveSessionCode(dynamicSupportThreads[0].sessionCode);
    }
  }, [dynamicSupportThreads, activeSessionCode]);

  const activeThreadInfo =
    dynamicSupportThreads.find((t) => t.sessionCode === activeSessionCode) ||
    dynamicSupportThreads[0];

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
    setSupportReplyBanner(null);
    const targetUserId =
      activeThreadInfo?.telegramUserId ||
      activeSessionCode.replace(/^#?TG-/i, '').replace(/[^0-9]/g, '');
    const ok = await sendSupportMessage(
      activeSessionCode,
      operatorReply,
      'OPERATOR',
      'اپراتور ارشد LuckyDrop VIP',
      targetUserId
    );
    setSendingReply(false);
    if (ok) {
      setOperatorReply('');
      setSupportReplyBanner(
        `✅ پاسخ رسمی به کاربر #${targetUserId} در چت داخل برنامه ثبت شد و هم‌زمان به ربات تلگرام کاربر ارسال گردید!`
      );
      setTimeout(() => setSupportReplyBanner(null), 5000);
    }
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

  const MOBILE_TABS: Array<{
    id: AdminMobileSectionTab;
    label: string;
    variant: 'gold' | 'emerald' | 'cyan' | 'obsidian';
    renderIcon: () => React.ReactNode;
  }> = [
    {
      id: 'ALL',
      label: 'همه بخش‌ها',
      variant: 'gold',
      renderIcon: () => <RoyalJackpotCrownIcon size={12} />,
    },
    {
      id: 'USERS',
      label: `کاربران CRM (${toPersianDigits(crmTotalCount || crmUsers.length)})`,
      variant: 'emerald',
      renderIcon: () => <SquadSyndicateIcon size={12} />,
    },
    {
      id: 'ROUNDS',
      label: `مدیریت لاتاری (${toPersianDigits(rounds.length)})`,
      variant: 'gold',
      renderIcon: () => <VipTicketIcon size={12} />,
    },
    {
      id: 'CASHIER',
      label: `برداشت مبالغ بالا (${toPersianDigits(pendingHighValueWithdrawals.length)})`,
      variant: 'cyan',
      renderIcon: () => <TonCrystalIcon size={12} />,
    },
    {
      id: 'OVERVIEW',
      label: 'خزانه و نرخ TON',
      variant: 'emerald',
      renderIcon: () => <TelemetryChartIcon size={12} />,
    },
    {
      id: 'CONFIG',
      label: 'ربات، وبهوک و برادکست',
      variant: 'gold',
      renderIcon: () => <AiNeuralCoreIcon size={12} />,
    },
    {
      id: 'SHIELD',
      label: 'بکاپ دیتابیس و امنیت',
      variant: 'emerald',
      renderIcon: () => <ProvablyFairShieldIcon size={12} />,
    },
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
            مدیریت کاربران (Users CRM)، تغییر دستی موجودی با لاگ حسابرسی، ارسال پیام همگانی ربات، مدیریت ۱-کلیکی وبهوک و پشتیبان‌گیری دیتابیس.
          </p>
        </div>

        {/* Kill-Switch & Secure Exit in a Clean 2-Column Mobile Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="cockpit-kill-switch-btn"
            onClick={toggleKillSwitch}
            className={`h-10 px-2.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              killSwitchActive
                ? 'bg-[#00f59b] text-[#041f14]'
                : 'bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/50'
            }`}
          >
            <LuxuryIconBadge variant={killSwitchActive ? 'emerald' : 'crimson'} size="xs">
              <SecurityAuditRadarIcon size={12} />
            </LuxuryIconBadge>
            <span>{killSwitchActive ? 'رفع انسداد سیستم' : 'توقف اضطراری (Kill)'}</span>
          </button>

          <button
            type="button"
            data-testid="admin-secure-exit-btn"
            onClick={handleSecureAdminExit}
            className="h-10 px-2.5 rounded-xl bg-[#090612] hover:bg-purple-950/70 border border-[#fbbf24]/45 text-[#fbbf24] font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LuxuryIconBadge variant="gold" size="xs">
              <ProvablyFairShieldIcon size={12} />
            </LuxuryIconBadge>
            <span>خروج امن ادمین</span>
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
              className={`h-8 px-2.5 rounded-xl text-[11px] font-bold shrink-0 border transition-all cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-gradient-to-r from-[#9333ea] to-[#7e22ce] border-purple-300/60 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                  : 'bg-[#130d24]/90 border-purple-500/20 text-purple-200/80 hover:text-white'
              }`}
            >
              <LuxuryIconBadge variant={tab.variant} size="xs">
                {tab.renderIcon()}
              </LuxuryIconBadge>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ADMIN EXECUTIVE AI COPILOT & LIVE PAM RECONCILIATION VAULT
          ===================================================================== */}
      {(showSection('OVERVIEW') || showSection('SHIELD')) && (
        <section
          data-testid="admin-ai-copilot-section"
          className="rounded-2xl bg-gradient-to-br from-[#140E26] via-[#0D091A] to-[#081A17] border border-amber-400/35 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] space-y-3"
        >
          {/* Header + 24/7 User AI Auto-Reply Toggle */}
          <div className="flex items-center justify-between gap-2 border-b border-amber-400/20 pb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <LuxuryIconBadge variant="gold" size="md" glow>
                <AiNeuralCoreIcon size={20} />
              </LuxuryIconBadge>
              <div className="min-w-0">
                <h2 className="text-xs font-black text-amber-300 truncate">
                  {tr(
                    lang,
                    'دستیار هوشمند مدیر ارشد (AI Executive & Risk Copilot)',
                    'AI Executive & Risk Copilot'
                  )}
                </h2>
                <p className="text-[10px] text-emerald-300/90 font-mono truncate" dir="ltr">
                  PAM Discrepancy:{' '}
                  <span data-testid="copilot-pam-discrepancy">
                    {aiCopilotTelemetry?.totalPamDiscrepancyFormatted || '0.000000 TON'}
                  </span>{' '}
                  • 6-Decimal Engine
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="admin-ai-auto-reply-toggle"
              onClick={() =>
                executeAdminAiCopilotAction(activeCopilotAction, !aiAutoReplyEnabled)
              }
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                aiAutoReplyEnabled
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-800/80 border-slate-600/50 text-slate-400'
              }`}
            >
              <LuxuryIconBadge variant={aiAutoReplyEnabled ? 'emerald' : 'obsidian'} size="xs">
                <VipConciergeHeadsetIcon size={12} />
              </LuxuryIconBadge>
              <span>
                {aiAutoReplyEnabled
                  ? tr(lang, 'پاسخ خودکار AI: روشن', 'AI Auto-Reply: ON')
                  : tr(lang, 'پاسخ خودکار AI: خاموش', 'AI Auto-Reply: OFF')}
              </span>
            </button>
          </div>

          {/* Live 6-Decimal Executive Telemetry Strip */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-[#090612]/90 border border-emerald-400/25 p-2">
              <span className="text-[9px] text-emerald-300 block">
                {tr(lang, 'سود خالص سایت (7-9%)', 'Net House Profit (7-9%)')}
              </span>
              <span
                data-testid="copilot-net-house-profit-ton"
                className="text-[10px] font-mono font-black text-emerald-400"
                dir="ltr"
              >
                {(aiCopilotTelemetry?.netHouseProfitTon ?? 0).toFixed(6)} TON
              </span>
            </div>

            <div className="rounded-xl bg-[#090612]/90 border border-amber-400/25 p-2">
              <span className="text-[9px] text-amber-300 block">
                {tr(lang, 'استخر جوایز (85%)', 'Prize Pool (85%)')}
              </span>
              <span
                data-testid="copilot-locked-pool-85-ton"
                className="text-[10px] font-mono font-black text-amber-300"
                dir="ltr"
              >
                {(aiCopilotTelemetry?.lockedPrizePool85Ton ?? 0).toFixed(6)} TON
              </span>
            </div>

            <div className="rounded-xl bg-[#090612]/90 border border-cyan-400/25 p-2">
              <span className="text-[9px] text-cyan-300 block">
                {tr(lang, 'ذخیره ۱,۰۰۰ دلاری (3%)', '$1K Reserve (3%)')}
              </span>
              <span
                data-testid="copilot-welcome-reserve-progress"
                className="text-[10px] font-mono font-black text-cyan-300"
                dir="ltr"
              >
                {(
                  aiCopilotTelemetry?.welcomeReserveFundedTon ??
                  welcomeGrandLottery.fundedReserveTon ??
                  0
                ).toFixed(2)}{' '}
                /{' '}
                {(
                  aiCopilotTelemetry?.welcomeReserveTargetTon ??
                  welcomeGrandLottery.targetPoolTon ??
                  200
                ).toFixed(0)}{' '}
                TON
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="rounded-xl bg-[#090612]/80 border border-white/10 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-300">
                {tr(lang, 'تعهد کش‌بک ۳٪:', '3% Cashback Liability:')}
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300" dir="ltr">
                {(aiCopilotTelemetry?.unclaimedCashbackLiabilityTon ?? 0).toFixed(6)} TON
              </span>
            </div>
            <div className="rounded-xl bg-[#090612]/80 border border-white/10 px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-300">
                {tr(lang, 'تعهد رفرال ۲٪:', '2% Referral Liability:')}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300" dir="ltr">
                {(aiCopilotTelemetry?.unclaimedReferralLiabilityTon ?? 0).toFixed(6)} TON
              </span>
            </div>
          </div>

          {/* 4 One-Click Executive Action Buttons (Bespoke 3D SVG Icons inside LuxuryIconBadge — Zero Text Emojis) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="copilot-btn-balance-sheet"
              disabled={aiCopilotBusy}
              onClick={() => executeAdminAiCopilotAction('BALANCE_SHEET')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                activeCopilotAction === 'BALANCE_SHEET'
                  ? 'bg-emerald-500/15 border-emerald-400/60 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-[#090612]/90 hover:bg-white/5 border-white/10 text-slate-200'
              }`}
            >
              <LuxuryIconBadge variant="emerald" size="xs">
                <TelemetryChartIcon size={14} />
              </LuxuryIconBadge>
              <span className="text-[10px] font-black leading-tight">
                {tr(
                  lang,
                  'گزارش جامع ترازنامه و سود خالص سایت',
                  '5-Way Balance Sheet & Net Profit'
                )}
              </span>
            </button>

            <button
              type="button"
              data-testid="copilot-btn-pam-reconcile"
              disabled={aiCopilotBusy}
              onClick={() => executeAdminAiCopilotAction('PAM_RECONCILE')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                activeCopilotAction === 'PAM_RECONCILE'
                  ? 'bg-amber-500/15 border-amber-400/60 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#090612]/90 hover:bg-white/5 border-white/10 text-slate-200'
              }`}
            >
              <LuxuryIconBadge variant="gold" size="xs">
                <SecurityAuditRadarIcon size={14} />
              </LuxuryIconBadge>
              <span className="text-[10px] font-black leading-tight">
                {tr(
                  lang,
                  'ممیزی امنیتی کیف پولها (PAM Reconcile)',
                  'PAM Wallet Security Audit'
                )}
              </span>
            </button>

            <button
              type="button"
              data-testid="copilot-btn-reserve-vaults"
              disabled={aiCopilotBusy}
              onClick={() => executeAdminAiCopilotAction('RESERVE_VAULTS')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                activeCopilotAction === 'RESERVE_VAULTS'
                  ? 'bg-amber-500/15 border-amber-400/60 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#090612]/90 hover:bg-white/5 border-white/10 text-slate-200'
              }`}
            >
              <LuxuryIconBadge variant="gold" size="xs">
                <RoyalJackpotCrownIcon size={14} />
              </LuxuryIconBadge>
              <span className="text-[10px] font-black leading-tight">
                {tr(
                  lang,
                  'وضعیت ذخیره لاتاری ۱۰۰۰ دلاری و ابرجکپات',
                  '$1K Reserve & Monthly VIP Jackpot'
                )}
              </span>
            </button>

            <button
              type="button"
              data-testid="copilot-btn-syndicate-referral"
              disabled={aiCopilotBusy}
              onClick={() => executeAdminAiCopilotAction('SYNDICATE_REFERRAL')}
              className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                activeCopilotAction === 'SYNDICATE_REFERRAL'
                  ? 'bg-cyan-500/15 border-cyan-400/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-[#090612]/90 hover:bg-white/5 border-white/10 text-slate-200'
              }`}
            >
              <LuxuryIconBadge variant="cyan" size="xs">
                <SquadSyndicateIcon size={14} />
              </LuxuryIconBadge>
              <span className="text-[10px] font-black leading-tight">
                {tr(
                  lang,
                  'تحلیل عملکرد سندیکاها و شبکه رفرال',
                  'Syndicate Squads & Referral Analytics'
                )}
              </span>
            </button>
          </div>

          {/* Live AI Copilot Report Output Box */}
          <div
            data-testid="copilot-executive-report-box"
            className="rounded-xl bg-[#07050E]/95 border border-amber-400/30 p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-amber-300 truncate">
                {aiCopilotTitle}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 shrink-0" dir="ltr">
                {aiCopilotBusy ? 'ANALYZING...' : 'LIVE 6-DEC AUDIT'}
              </span>
            </div>
            <div className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {aiCopilotReport ||
                tr(
                  lang,
                  'یکی از دکمه‌های اجرایی بالا را لمس کنید تا گزارش تحلیلی ترازنامه و تطبیق کیف پول‌های PAM با دقت ۶ رقم اعشار صادر شود.',
                  'Tap one of the executive action buttons above to generate a 6-decimal PAM ledger and balance sheet report.'
                )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          PHASE 3 SECTION 1 & 2: USERS CRM, BAN/FREEZE & MANUAL BALANCE ADJUSTMENT
          ===================================================================== */}
      {showSection('USERS') && (
        <div className="space-y-3.5" data-testid="cockpit-users-crm-section">
          {crmBanner && (
            <div
              data-testid="cockpit-crm-banner"
              className="p-3 rounded-2xl bg-[#00f59b]/15 border border-[#00f59b]/45 text-[#00f59b] text-xs font-bold leading-relaxed"
            >
              {crmBanner}
            </div>
          )}

          {/* Users CRM Search & Inspection Card */}
          <section className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h2 className="text-xs font-extrabold text-white">
                👥 مدیریت کاربران، بازرسی حساب و مسدودسازی (Users CRM)
              </h2>
              <button
                type="button"
                data-testid="crm-refresh-users-btn"
                onClick={() => fetchAdminUsersCrm()}
                className="h-7 px-2.5 rounded-lg bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[10px] font-bold cursor-pointer"
              >
                {crmLoading ? '...' : '↻ بروزرسانی'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                data-testid="crm-user-search-input"
                value={crmSearch}
                onChange={(e) => {
                  setCrmSearch(e.target.value);
                  void fetchAdminUsersCrm(e.target.value);
                }}
                placeholder="جستجو با آیدی تلگرام، نام کاربری یا آدرس کیف پول TON..."
                className="flex-1 h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-3 text-xs text-white"
              />
            </div>

            <div>
              <input
                type="text"
                data-testid="crm-ban-reason-input"
                value={crmBanReasonDraft}
                onChange={(e) => setCrmBanReasonDraft(e.target.value)}
                placeholder="علت مسدودسازی (اختیاری — مثلاً: تخلف مولتی‌اکانت یا ربات)"
                className="w-full h-8 bg-[#090612] border border-purple-500/20 rounded-xl px-3 text-[11px] text-purple-200"
              />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
              {crmUsers.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#090612] border border-purple-500/15 text-center text-xs text-purple-300/75">
                  کاربری با این مشخصات یافت نشد.
                </div>
              ) : (
                crmUsers.map((u) => (
                  <div
                    key={u.telegramUserId}
                    data-testid={`crm-user-card-${u.telegramUserId}`}
                    className={`rounded-xl p-3 border space-y-2 ${
                      u.isBanned
                        ? 'bg-rose-950/35 border-rose-500/50'
                        : 'bg-[#090612] border-purple-500/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {u.displayName}{' '}
                          <span className="text-[10px] font-mono text-purple-300/80" dir="ltr">
                            (@{u.username.replace(/^@/, '')})
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#fbbf24]" dir="ltr">
                          ID: #{u.telegramUserId} • Joined: {u.createdAt.slice(0, 10)}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          u.isBanned
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                            : 'bg-[#00f59b]/15 text-[#00f59b]'
                        }`}
                      >
                        {u.isBanned ? '🚫 مسدود (BANNED)' : '✓ فعال'}
                      </span>
                    </div>

                    {u.isBanned && u.banReason && (
                      <div className="text-[10px] text-rose-300 bg-rose-950/50 rounded-lg px-2 py-1">
                        علت مسدودیت: {u.banReason}
                      </div>
                    )}

                    {/* Balances & Activity Metrics */}
                    <div className="grid grid-cols-4 gap-1.5 bg-[#130d24]/90 border border-purple-500/20 rounded-xl p-2 text-center">
                      <div>
                        <span className="text-[9px] text-cyan-300 block">موجودی TON</span>
                        <span className="text-[11px] font-mono font-bold text-white" dir="ltr">
                          {u.tonBalance.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#fbbf24] block">موجودی Stars</span>
                        <span className="text-[11px] font-mono font-bold text-[#fbbf24]" dir="ltr">
                          {u.starsBalance} ⭐
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-purple-300 block">بلیت‌ها / هدیه</span>
                        <span className="text-[11px] font-mono font-bold text-white" dir="ltr">
                          {u.totalTicketsCount} ({u.freeLotteryTickets}🎟️)
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#00f59b] block">گردش کل</span>
                        <span className="text-[11px] font-mono font-bold text-[#00f59b]" dir="ltr">
                          {u.totalWageredTon.toFixed(1)} TON
                        </span>
                      </div>
                    </div>

                    {u.connectedWalletAddress && (
                      <div className="text-[10px] font-mono text-cyan-300/85 truncate" dir="ltr">
                        💎 Wallet: {u.connectedWalletAddress}
                      </div>
                    )}

                    {/* 1-Tap Ban/Unban & Select for Balance Adjust */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        data-testid={`crm-select-adjust-btn-${u.telegramUserId}`}
                        onClick={() => setAdjustTargetUserId(u.telegramUserId)}
                        className="h-8 rounded-lg bg-purple-600/25 border border-purple-400/40 text-purple-100 text-[10px] font-bold cursor-pointer"
                      >
                        ⚖️ اصلاح موجودی #{u.telegramUserId}
                      </button>
                      <button
                        type="button"
                        data-testid={`crm-toggle-ban-btn-${u.telegramUserId}`}
                        onClick={() => handleToggleUserBan(u)}
                        className={`h-8 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          u.isBanned
                            ? 'bg-[#00f59b]/20 border-[#00f59b]/45 text-[#00f59b]'
                            : 'bg-rose-500/20 border-rose-500/45 text-rose-300'
                        }`}
                      >
                        {u.isBanned ? '✓ رفع مسدودیت (Unban)' : '🚫 مسدودسازی آنی (Ban)'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Manual Balance Credit / Debit with Immutable Audit Log */}
          <form
            onSubmit={handleAdjustUserBalance}
            data-testid="cockpit-adjust-balance-form"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <h3 className="text-xs font-extrabold text-white">
                ⚖️ افزایش / کسر دستی موجودی کاربر با ثبت در دفترکل حسابرسی
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] text-[10px] font-mono font-bold">
                AUDIT LOGGED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  آیدی عددی کاربر هدف (`targetUserId`):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  data-testid="adjust-target-user-id-input"
                  placeholder="مثلاً: 778899101"
                  value={adjustTargetUserId}
                  onChange={(e) => setAdjustTargetUserId(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  نوع ارز / دارایی (`currency`):
                </label>
                <select
                  data-testid="adjust-currency-select"
                  value={adjustCurrency}
                  onChange={(e) =>
                    setAdjustCurrency(e.target.value as 'TON' | 'STARS' | 'FREE_TICKETS')
                  }
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2 text-xs text-[#00f59b] font-bold"
                >
                  <option value="TON">💎 TON Balance</option>
                  <option value="STARS">⭐ Telegram Stars</option>
                  <option value="FREE_TICKETS">🎟️ بلیت رایگان لاتاری</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  مقدار تغییر (`+` افزایش / `-` کسر):
                </label>
                <input
                  type="number"
                  step="any"
                  dir="ltr"
                  data-testid="adjust-delta-amount-input"
                  value={adjustDeltaAmount}
                  onChange={(e) => setAdjustDeltaAmount(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-[#fbbf24] font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  دلیل حسابرسی (`reason` - اختیاری):
                </label>
                <input
                  type="text"
                  data-testid="adjust-reason-input"
                  placeholder="اصلاح دستی توسط ادمین (اختیاری)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white"
                />
              </div>
            </div>

            {adjustBanner && (
              <div
                data-testid="cockpit-adjust-balance-banner"
                className="p-2.5 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold"
              >
                {adjustBanner}
              </div>
            )}

            <button
              type="submit"
              data-testid="adjust-balance-submit-btn"
              disabled={adjustSubmitting}
              className="w-full h-10 rounded-xl stake-emerald-cta font-black text-xs text-[#041f14] cursor-pointer"
            >
              {adjustSubmitting
                ? 'در حال ثبت در دفترکل PAM و لاگ حسابرسی...'
                : '✓ اعمال تغییر موجودی و ثبت در لاگ غیرقابل تغییر'}
            </button>

            {adminAuditLogs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                <div className="text-[10px] font-bold text-purple-300">
                  📜 آخرین لاگ‌های حسابرسی ادمین (`dbState.adminAuditLogs`):
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                  {adminAuditLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      data-testid={`admin-audit-log-row-${log.id}`}
                      className="bg-[#090612] border border-purple-500/15 rounded-xl p-2 text-[10px] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">
                          [{log.actionType}] User #{log.targetUserId} — {log.reason}
                        </div>
                        <div className="text-[9px] font-mono text-purple-300/70" dir="ltr">
                          By Admin #{log.adminUserId} • {log.timestamp.slice(0, 19).replace('T', ' ')}
                        </div>
                      </div>
                      {typeof log.deltaAmount === 'number' && (
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            log.deltaAmount >= 0 ? 'text-[#00f59b]' : 'text-rose-400'
                          }`}
                          dir="ltr"
                        >
                          {log.deltaAmount >= 0 ? `+${log.deltaAmount}` : log.deltaAmount}{' '}
                          {log.currency}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

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

          {/* MONTHLY VIP LOYALTY SUPER-JACKPOT ROLLOVER VAULT ADMIN CONTROLLER */}
          <div
            data-testid="cockpit-monthly-super-pot-card"
            className="rounded-2xl bg-gradient-to-br from-[#1b1233] via-[#110b22] to-[#1e1508] border border-[#fbbf24]/45 p-3.5 space-y-3 shadow-[0_8px_28px_rgba(251,191,36,0.14)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#fbbf24]/25 pb-2">
              <div>
                <h3 className="text-xs font-extrabold text-[#fbbf24]">
                  👑 مدیریت خزانه ابر جک‌پات ماهانه وفاداری (`#LD-MONTHLY-VIP`)
                </h3>
                <p className="text-[10px] text-purple-200/80 mt-0.5">
                  سرریز خودکار جوایز برنده‌نشده دورهای عادی (`unclaimedRolloverTon`) + قانون انتقال بی‌نهایت به ماه بعد
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                {sseConnected ? '⚡ SSE LIVE' : 'SYNC READY'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#090612] border border-[#fbbf24]/25">
                <div className="text-[10px] text-purple-200/75">موجودی انباشته (TON)</div>
                <div
                  data-testid="cockpit-monthly-pot-ton"
                  className="font-mono text-sm font-black text-[#fbbf24] mt-0.5"
                  dir="ltr"
                >
                  {(monthlySuperJackpot?.accumulatedPoolTon || 0).toFixed(2)} TON
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090612] border border-purple-500/25">
                <div className="text-[10px] text-purple-200/75">معادل Stars</div>
                <div className="font-mono text-sm font-black text-[#00f59b] mt-0.5" dir="ltr">
                  {(monthlySuperJackpot?.accumulatedPoolStars || 0).toLocaleString('en-US')} ⭐
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090612] border border-purple-500/25">
                <div className="text-[10px] text-purple-200/75">شرط بلیت / XP</div>
                <div className="font-mono text-xs font-black text-white mt-0.5" dir="ltr">
                  {monthlySuperJackpot?.minTicketsRequired || 10}🎟️ / {monthlySuperJackpot?.minXpRequired || 500}XP
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  حداقل بلیت (`minTickets`):
                </label>
                <input
                  type="number"
                  min="1"
                  dir="ltr"
                  data-testid="cockpit-monthly-min-tickets-input"
                  value={minTicketsDraft}
                  onChange={(e) => setMinTicketsDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  حداقل امتیاز (`minXP`):
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  dir="ltr"
                  data-testid="cockpit-monthly-min-xp-input"
                  value={minXpDraft}
                  onChange={(e) => setMinXpDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#fbbf24] block mb-1">
                  افزودن TON به خزانه:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  data-testid="cockpit-monthly-seed-ton-input"
                  value={seedMonthlyTonDraft}
                  onChange={(e) => setSeedMonthlyTonDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-[#fbbf24]/35 rounded-xl px-2.5 text-xs text-[#fbbf24] font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={monthlyVaultBusy}
                data-testid="cockpit-monthly-save-seed-btn"
                onClick={async () => {
                  setMonthlyVaultBusy(true);
                  setMonthlyVaultBanner(null);
                  const addTon = Math.max(0, Number(normalizeDigits(seedMonthlyTonDraft)) || 0);
                  const minT = Math.max(1, Number(normalizeDigits(minTicketsDraft)) || 10);
                  const minX = Math.max(50, Number(normalizeDigits(minXpDraft)) || 500);
                  const ok = await updateMonthlySuperJackpotConfig({
                    minTicketsRequired: minT,
                    minXpRequired: minX,
                    addPoolTon: addTon > 0 ? addTon : undefined,
                  });
                  setMonthlyVaultBusy(false);
                  if (ok) {
                    setSeedMonthlyTonDraft('0');
                    setMonthlyVaultBanner(
                      `✅ تنظیمات خزانه ماهانه VIP ذخیره شد${
                        addTon > 0 ? ` و +${addTon.toFixed(2)} TON به استخر افزوده گردید!` : '!'
                      }`
                    );
                  }
                }}
                className="h-9 rounded-xl bg-[#fbbf24]/20 hover:bg-[#fbbf24]/30 border border-[#fbbf24]/50 text-[#fbbf24] text-[11px] font-black cursor-pointer"
              >
                💾 ذخیره شروط و شارژ خزانه ماهانه
              </button>

              <button
                type="button"
                disabled={monthlyVaultBusy}
                data-testid="cockpit-monthly-trigger-draw-btn"
                onClick={async () => {
                  setMonthlyVaultBusy(true);
                  setMonthlyVaultBanner(null);
                  const res = await triggerMonthlySuperJackpotDraw();
                  setMonthlyVaultBusy(false);
                  if (res) {
                    setMonthlyVaultBanner(
                      `🎉 قرعه‌کشی ابر جک‌پات ماهانه VIP انجام شد! شماره‌ها: [${res.drawnMain.join(
                        ', '
                      )}] + ★${res.drawnGolden} (${res.winnersCount || 0} برنده)`
                    );
                  }
                }}
                className="h-9 rounded-xl stake-emerald-cta text-[#041f14] text-[11px] font-black cursor-pointer"
              >
                👑 اجرای دستی قرعه‌کشی ماهانه VIP
              </button>
            </div>

            {monthlyVaultBanner && (
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                {monthlyVaultBanner}
              </div>
            )}

            {Array.isArray(monthlySuperJackpot?.rolloverHistory) &&
              monthlySuperJackpot.rolloverHistory.length > 0 && (
                <div className="space-y-1 pt-1.5 border-t border-purple-500/20">
                  <div className="text-[10px] font-bold text-purple-200">
                    📜 تاریخچه سرریزهای ورودی به ابر جک‌پات ماهانه (`rolloverHistory`):
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 no-scrollbar">
                    {monthlySuperJackpot.rolloverHistory.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#090612] border border-white/10 text-[10px]"
                      >
                        <span className="text-slate-300 truncate">
                          از دور <strong className="text-white">{item.sourceRoundCode}</strong> ({item.timestamp})
                        </span>
                        <span className="font-mono font-bold text-[#fbbf24] shrink-0" dir="ltr">
                          +{Number(item.rolloverTon || 0).toFixed(2)} TON
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* $1,000 WELCOME GRAND LOTTERY (#LD-WELCOME-1000) RESERVE & DRAW ADMIN CONTROLLER */}
          <div
            data-testid="cockpit-welcome-lottery-card"
            className="rounded-2xl bg-gradient-to-br from-[#1C1408]/95 via-[#120D22]/95 to-[#091815]/95 border border-[#fbbf24]/45 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <div>
                  <h3 className="text-xs font-extrabold text-[#fbbf24]">
                    مدیریت لاتاری خوش‌آمدگویی ۱,۰۰۰ دلاری (`#LD-WELCOME-1000`)
                  </h3>
                  <p className="text-[10px] text-purple-200/80">
                    تأمین خودکار از حاشیه سود خالص (۲۵٪ از ۱۲٪ سهم پلتفرم) + محافظ تمدید خودکار ۷ روزه تا تکمیل ۱۰۰٪ ذخیره
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-black">
                {welcomeGrandLottery?.isReserveFullyFunded
                  ? '✅ 100% FUNDED'
                  : `⏳ ${(welcomeGrandLottery?.reserveProgressPercent || 0).toFixed(1)}% FUNDED`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#090612] border border-[#fbbf24]/30">
                <div className="text-[10px] text-purple-200/75">هدف جایزه</div>
                <div className="font-mono text-xs font-black text-[#fbbf24] mt-0.5" dir="ltr">
                  ${(welcomeGrandLottery?.targetPoolUsdt || 1000).toLocaleString('en-US')} ({(welcomeGrandLottery?.targetPoolTon || 200).toFixed(2)} TON)
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090612] border border-emerald-500/30">
                <div className="text-[10px] text-purple-200/75">ذخیره تأمین‌شده (`fundedReserve`)</div>
                <div
                  data-testid="cockpit-welcome-funded-reserve-ton"
                  className="font-mono text-xs font-black text-emerald-300 mt-0.5"
                  dir="ltr"
                >
                  {(welcomeGrandLottery?.fundedReserveTon || 0).toFixed(6)} TON
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090612] border border-purple-500/25">
                <div className="text-[10px] text-purple-200/75">شرکت‌کنندگان</div>
                <div className="font-mono text-xs font-black text-white mt-0.5" dir="ltr">
                  {welcomeGrandLottery?.participantsCount || 0} نفر
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090612] border border-purple-500/25">
                <div className="text-[10px] text-purple-200/75">تمدید خودکار محافظ</div>
                <div className="font-mono text-xs font-black text-amber-300 mt-0.5" dir="ltr">
                  {welcomeGrandLottery?.autoExtensionCount || 0} بار
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  هدف دلاری (`targetPoolUsdt`):
                </label>
                <input
                  type="number"
                  min="10"
                  step="50"
                  dir="ltr"
                  data-testid="cockpit-welcome-target-usdt-input"
                  value={welcomeTargetUsdtDraft}
                  onChange={(e) => setWelcomeTargetUsdtDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-300 block mb-1">
                  شارژ دستی ذخیره (`+TON`):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  data-testid="cockpit-welcome-add-reserve-input"
                  value={welcomeAddReserveTonDraft}
                  onChange={(e) => setWelcomeAddReserveTonDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-emerald-500/35 rounded-xl px-2.5 text-xs text-emerald-300 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#fbbf24] block mb-1">
                  تمدید تایمر (`+Days`):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  dir="ltr"
                  data-testid="cockpit-welcome-extend-days-input"
                  value={welcomeExtendDaysDraft}
                  onChange={(e) => setWelcomeExtendDaysDraft(e.target.value)}
                  className="w-full h-9 bg-[#090612] border border-[#fbbf24]/35 rounded-xl px-2.5 text-xs text-[#fbbf24] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={welcomeAdminBusy}
                data-testid="cockpit-welcome-save-config-btn"
                onClick={async () => {
                  setWelcomeAdminBusy(true);
                  setWelcomeAdminBanner(null);
                  const targetUsdt = Math.max(
                    10,
                    Number(normalizeDigits(welcomeTargetUsdtDraft)) || 1000
                  );
                  const addResTon = Math.max(
                    0,
                    Number(normalizeDigits(welcomeAddReserveTonDraft)) || 0
                  );
                  const extDays = Math.max(
                    0,
                    Number(normalizeDigits(welcomeExtendDaysDraft)) || 0
                  );
                  const ok = await updateWelcomeLotteryConfig({
                    targetPoolUsdt: targetUsdt,
                    addReserveTon: addResTon > 0 ? addResTon : undefined,
                    resetCycleDays: extDays > 0 ? extDays : undefined,
                  });
                  setWelcomeAdminBusy(false);
                  if (ok) {
                    setWelcomeAddReserveTonDraft('0');
                    setWelcomeExtendDaysDraft('0');
                    setWelcomeAdminBanner(
                      `✅ تنظیمات لاتاری خوش‌آمدگویی ۱,۰۰۰ دلاری ذخیره شد!`
                    );
                  }
                }}
                className="h-9 rounded-xl bg-[#fbbf24]/20 hover:bg-[#fbbf24]/30 border border-[#fbbf24]/50 text-[#fbbf24] text-[11px] font-black cursor-pointer"
              >
                💾 ذخیره هدف، ذخیره و تایمر خوش‌آمدگویی
              </button>

              <button
                type="button"
                disabled={welcomeAdminBusy}
                data-testid="cockpit-welcome-trigger-draw-btn"
                onClick={async () => {
                  setWelcomeAdminBusy(true);
                  setWelcomeAdminBanner(null);
                  const res = await triggerWelcomeLotteryDraw();
                  setWelcomeAdminBusy(false);
                  if (res) {
                    setWelcomeAdminBanner(
                      `🎉 قرعه‌کشی خوش‌آمدگویی #LD-WELCOME-1000 انجام شد! شماره‌ها: [${res.drawnMain.join(
                        ', '
                      )}] + ★${res.drawnGolden} (${res.winnersCount || 0} برنده)`
                    );
                  }
                }}
                className="h-9 rounded-xl stake-emerald-cta text-[#041f14] text-[11px] font-black cursor-pointer"
              >
                🎁 اجرای دستی قرعه‌کشی ۱,۰۰۰ دلاری خوش‌آمدگویی
              </button>
            </div>

            {welcomeAdminBanner && (
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                {welcomeAdminBanner}
              </div>
            )}
          </div>

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

          {/* TELEGRAM SQUADS & SYNDICATE LOTTERY POOLS MONITOR (مانیتورینگ سندیکاهای گروهی) */}
          <div
            data-testid="admin-syndicate-pools-card"
            className="rounded-2xl p-4 bg-gradient-to-br from-[#140E26]/95 via-[#0B171E]/95 to-[#090612]/95 border border-emerald-400/35 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>🤝 مانیتورینگ سندیکاهای گروهی (Telegram Squad & Syndicate Pools)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px]">
                    {syndicatePools.length} Total
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  پایش زنده سهام فروخته‌شده، بلیت‌های مشترک صادرشده (Zero-Escrow) و تسویه خودکار جوایز به نسبت سهم (Pro-Rata 6-Decimal)
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                  OPEN/FULL: {syndicatePools.filter((s) => s.status !== 'SETTLED').length}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 font-bold">
                  SETTLED: {syndicatePools.filter((s) => s.status === 'SETTLED').length}
                </span>
              </div>
            </div>

            {syndicatePools.length === 0 ? (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center text-xs text-slate-400">
                هنوز هیچ سندیکای گروهی ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {syndicatePools.map((syn) => {
                  const pct = Math.min(
                    100,
                    Math.round((syn.filledShares / Math.max(1, syn.targetShares)) * 100)
                  );
                  return (
                    <div
                      key={syn.id}
                      data-testid={`admin-syndicate-row-${syn.id}`}
                      className="rounded-xl p-3 bg-black/50 border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black text-[#FFE066]">
                            #{syn.id}
                          </span>
                          <span className="text-xs font-black text-white">{syn.name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black ${
                            syn.status === 'OPEN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : syn.status === 'FULL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'bg-purple-500/20 text-purple-200 border border-purple-400/40'
                          }`}
                        >
                          {syn.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                        <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="text-slate-400">Round</div>
                          <div className="text-white font-bold">{syn.roundCode}</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="text-slate-400">Shares / Tickets</div>
                          <div className="text-emerald-300 font-bold">
                            {syn.filledShares}/{syn.targetShares} ({syn.ticketIds.length} 🎟️)
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="text-slate-400">Prize Won</div>
                          <div className="text-[#FFE066] font-bold">
                            {syn.totalPrizeWonTon.toFixed(6)} TON
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-[#FFE066]"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Leader: {syn.creatorUsername}</span>
                        <span>Members: {syn.members.length}</span>
                        <span>Invite: syn_{syn.inviteCode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SELF-FUNDING LIFETIME REFERRAL VAULT & ANTI-SYBIL QUESTS MONITOR */}
          <div
            data-testid="admin-referral-quests-card"
            className="rounded-2xl p-4 bg-gradient-to-br from-[#16102A]/95 via-[#0B171E]/95 to-[#090612]/95 border border-[#fbbf24]/35 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#fbbf24] flex items-center gap-2">
                  <span>🚀 مانیتورینگ باشگاه سفیران و مأموریت‌های ضد-ربات (Referral Vault & Anti-Sybil Quests)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px]">
                    2% Ticket / 0.5% Games
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تأمین ۱۰۰٪ پورسانت دعوت از حاشیه سود سایت (۸۵٪ استخر جایزه + ۳٪ کشبک خریدار + ۳٪ ذخیره خوش‌آمدگویی + ۲٪ پورسانت معرف + ۷٪ سود خالص سایت = ۱۰۰٪)
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                  Invited: {referralProfile?.invitedCount || 0}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 font-bold">
                  Active Buyers: {referralProfile?.activeBuyersCount || 0}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-slate-400">Admin Claimable TON</div>
                <div className="text-emerald-300 font-black">
                  {(referralProfile?.claimableReferralTon || 0).toFixed(6)} TON
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-slate-400">Lifetime Referral TON</div>
                <div className="text-[#FFE066] font-black">
                  {(referralProfile?.lifetimeReferralTon || 0).toFixed(6)} TON
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-slate-400">Growth Quests Claimed</div>
                <div className="text-white font-black">
                  {growthQuests.filter((q) => q.claimed).length} / {growthQuests.length}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-slate-400">Referral Ledger Events</div>
                <div className="text-cyan-300 font-black">{referralEvents.length} Events</div>
              </div>
            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    ✈️ آیدی تلگرام پشتیبانی زنده (`supportTelegramUsername`):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    data-testid="input-support-telegram-username"
                    placeholder="@LuckyDrop_Support"
                    value={tgSupportUsername}
                    onChange={(e) => setTgSupportUsername(e.target.value)}
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    🛡️ امضا و عنوان رسمی برند/کمپانی (`officialBrandTitle`):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    data-testid="input-official-brand-title"
                    placeholder="🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol"
                    value={tgOfficialBrandTitle}
                    onChange={(e) => setTgOfficialBrandTitle(e.target.value)}
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-[#FFE066] font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="save-telegram-config-btn"
                className="w-full h-9 rounded-xl bg-purple-600/35 border border-purple-400/40 text-white font-bold text-xs cursor-pointer"
              >
                ذخیره تنظیمات ربات، پشتیبانی تلگرام و عنوان رسمی برند
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

          {/* 1-Click Telegram Webhook Verifier & Auto-Setter */}
          <section
            data-testid="cockpit-webhook-manager-section"
            className="rounded-2xl bg-[#130d24]/95 border border-cyan-500/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div>
                <h2 className="text-xs font-extrabold text-white">
                  🔗 وضعیت زنده Webhook و اتصال ۱-کلیکی تلگرام
                </h2>
                <p className="text-[10px] text-purple-300/75 mt-0.5">
                  تنظیم خودکار وبهوک پرداخت Telegram Stars و دستورات ربات روی دامنه فعلی
                </p>
              </div>
              <button
                type="button"
                data-testid="cockpit-refresh-webhook-btn"
                onClick={() => fetchWebhookStatus()}
                disabled={webhookLoading}
                className="h-8 px-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-[10px] font-bold text-purple-200 cursor-pointer shrink-0"
              >
                {webhookLoading ? '...' : '↻ بررسی'}
              </button>
            </div>

            {webhookBanner && (
              <div
                data-testid="cockpit-webhook-banner"
                className="p-2.5 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold"
              >
                {webhookBanner}
              </div>
            )}

            <div className="bg-[#090612] border border-purple-500/20 rounded-xl p-2.5 space-y-1.5 text-[11px]" dir="ltr">
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-300/70">Bot Token Configured:</span>
                <span
                  data-testid="cockpit-webhook-token-status"
                  className={`font-mono font-bold ${
                    webhookStatus?.configured || webhookStatus?.botTokenConfigured || Boolean(telegramBotConfig.botToken)
                      ? 'text-[#00f59b]'
                      : 'text-rose-400'
                  }`}
                >
                  {webhookStatus?.configured || webhookStatus?.botTokenConfigured || Boolean(telegramBotConfig.botToken)
                    ? 'ACTIVE ✅'
                    : 'NO TOKEN'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-300/70">Current Webhook URL:</span>
                <span className="font-mono text-cyan-300 truncate max-w-[200px]">
                  {webhookStatus?.url || 'Not Bound'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-300/70">Pending Updates:</span>
                <span className="font-mono text-[#fbbf24] font-bold">
                  {webhookStatus?.pendingUpdateCount ?? 0}
                </span>
              </div>
              {webhookStatus?.lastErrorMessage && (
                <div className="text-[10px] text-rose-400 font-mono break-all pt-1 border-t border-purple-500/15">
                  Last Error: {webhookStatus.lastErrorMessage}
                </div>
              )}
            </div>

            <button
              type="button"
              data-testid="cockpit-auto-bind-webhook-btn"
              disabled={webhookBinding}
              onClick={handleAutoBindWebhook}
              className="w-full h-10 rounded-xl stake-emerald-cta font-black text-xs text-[#041f14] cursor-pointer"
            >
              {webhookBinding ? 'در حال ثبت Webhook در تلگرام...' : '🔗 Auto-Bind Webhook (اتصال خودکار ۱-کلیکی)'}
            </button>
          </section>

          {/* Mass Telegram Bot Broadcast to All Users */}
          <section
            data-testid="cockpit-mass-broadcast-section"
            className="rounded-2xl bg-[#130d24]/95 border border-[#fbbf24]/30 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div>
                <h2 className="text-xs font-extrabold text-white">
                  📢 ارسال پیام همگانی به تمام کاربران ربات (Mass Broadcast)
                </h2>
                <p className="text-[10px] text-purple-300/75 mt-0.5">
                  ارسال نوتیفیکیشن مستقیم همراه با دکمه شیشه‌ای Mini App با محافظت Rate-Limit (۲۰ پیام/ثانیه)
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#fbbf24]/15 text-[#fbbf24] text-[10px] font-mono font-bold shrink-0" dir="ltr">
                50ms Throttle
              </span>
            </div>

            <form onSubmit={handleMassBroadcastUsers} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-purple-200 block mb-1">
                  متن پیام همگانی (پشتیبانی از HTML):
                </label>
                <textarea
                  rows={3}
                  data-testid="cockpit-broadcast-message-input"
                  value={broadcastMessageText}
                  onChange={(e) => setBroadcastMessageText(e.target.value)}
                  placeholder="🔥 استخر جک‌پات امشب به ۵,۰۰۰ TON رسید! همین حالا شانست رو امتحان کن..."
                  className="w-full bg-[#090612] border border-purple-500/25 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    متن دکمه شیشه‌ای (Inline CTA):
                  </label>
                  <input
                    type="text"
                    data-testid="cockpit-broadcast-btn-text-input"
                    value={broadcastButtonText}
                    onChange={(e) => setBroadcastButtonText(e.target.value)}
                    placeholder="🎰 ورود به LuckyDrop"
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-purple-200 block mb-1">
                    لینک دکمه (URL / Mini App):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    data-testid="cockpit-broadcast-btn-url-input"
                    value={broadcastButtonUrl}
                    onChange={(e) => setBroadcastButtonUrl(e.target.value)}
                    placeholder="https://t.me/YourBot/app"
                    className="w-full h-9 bg-[#090612] border border-purple-500/25 rounded-xl px-2.5 text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="cockpit-send-broadcast-btn"
                disabled={broadcastSending || !broadcastMessageText.trim()}
                className="w-full h-10 rounded-xl tma-purple-cta font-black text-xs text-white cursor-pointer disabled:opacity-50"
              >
                {broadcastSending ? 'در حال ارسال به کاربران...' : '📢 ارسال همگانی به تمام کاربران ثبت‌نام‌شده'}
              </button>
            </form>

            {broadcastResult && (
              <div
                data-testid="cockpit-broadcast-result"
                className="p-2.5 rounded-xl bg-[#090612] border border-[#00f59b]/35 flex items-center justify-around text-[11px] font-mono"
                dir="ltr"
              >
                <span className="text-purple-200">Total: <b>{broadcastResult.totalUsers}</b></span>
                <span className="text-[#00f59b]">Sent: <b>{broadcastResult.sentCount}</b></span>
                <span className="text-rose-400">Failed: <b>{broadcastResult.failedCount}</b></span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          SECTION E: PLATFORM SECURITY AUDIT, DB BACKUP & VIP CONCIERGE CHAT
          ===================================================================== */}
      {showSection('SHIELD') && (
        <div className="space-y-3.5">
          {/* 1-Click Database Backup Export & Restore */}
          <section
            data-testid="cockpit-db-backup-section"
            className="rounded-2xl bg-[#130d24]/95 border border-cyan-500/35 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
              <div>
                <h2 className="text-xs font-extrabold text-white">
                  💾 پشتیبان‌گیری و بازیابی ۱-کلیکی دیتابیس (DB Backup & Restore)
                </h2>
                <p className="text-[10px] text-purple-300/75 mt-0.5">
                  دانلود کل وضعیت کاربران، بلیت‌ها، دفترکل مالی و لاگ حسابرسی یا انتقال به سرور جدید
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-mono font-bold shrink-0" dir="ltr">
                JSON Snapshot
              </span>
            </div>

            {dbBackupBanner && (
              <div
                data-testid="cockpit-db-backup-banner"
                className="p-2.5 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold"
              >
                {dbBackupBanner}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="cockpit-download-db-backup-btn"
                disabled={dbBackupDownloading}
                onClick={handleDownloadDbBackup}
                className="h-10 rounded-xl stake-emerald-cta font-black text-xs text-[#041f14] cursor-pointer flex items-center justify-center gap-1.5"
              >
                {dbBackupDownloading ? 'در حال آماده‌سازی...' : '💾 Download DB Backup'}
              </button>

              <label
                data-testid="cockpit-restore-db-backup-label"
                className="h-10 rounded-xl bg-purple-600/35 border border-purple-400/45 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 hover:bg-purple-600/50 transition"
              >
                <span>{dbRestoring ? 'در حال بازیابی...' : '📤 Restore DB Backup'}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  data-testid="cockpit-restore-db-backup-input"
                  disabled={dbRestoring}
                  onChange={handleRestoreDbBackupFile}
                  className="hidden"
                />
              </label>
            </div>
          </section>

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
                  title: '۵. ضد جعل هدر ادمین و مسدودسازی آنی (Anti-Spoof & Ban Guard)',
                  desc: 'هدرهای خام بدون امضای رمزنگاری تلگرام هرگز دسترسی ادمین نمی‌گیرند و حساب‌های مسدود در تمام مسیرها قفل می‌شوند.',
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

          {/* Live Two-Way VIP Customer Support Chat Console */}
          <section
            data-testid="cockpit-vip-support-console"
            className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xs font-extrabold text-white">
                  💬 کنسول پشتیبانی زنده دوطرفه VIP (همگام با ربات تلگرام)
                </h2>
                <p className="text-[10px] text-purple-300/75 mt-0.5">
                  پاسخ ادمین هم در چت داخل برنامه کاربر نمایش داده می‌شود و هم مستقیم به تلگرام کاربر Push می‌گردد.
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#00f59b]">
                ذخیره وفاداری: {usdtToTonFormatted(rolloverReservePoolUsdt)} ({toPersianDigits(chestsClaimedCount)} صندوقچه)
              </span>
            </div>

            {/* Thread Selector Cards with User Profile, Balance & Unread Badge */}
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {dynamicSupportThreads.map((thread) => {
                const isSelected = activeSessionCode === thread.sessionCode;
                return (
                  <button
                    key={thread.sessionCode}
                    type="button"
                    data-testid={`support-thread-btn-${thread.sessionCode}`}
                    onClick={() => {
                      setActiveSessionCode(thread.sessionCode);
                      if (thread.unreadAdminCount > 0) {
                        markSupportMessagesRead('ADMIN', thread.telegramUserId);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-purple-600/35 border-[#fbbf24] text-white shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                        : 'bg-[#090612] border-purple-500/20 text-purple-200/80 hover:border-purple-400/40'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-black text-[#fbbf24] flex items-center gap-1">
                        <span>{thread.displayName}</span>
                        <span className="font-mono text-[9px] text-cyan-300">
                          ({thread.username})
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-purple-300/80">
                        ID: {thread.telegramUserId} • {thread.tonBalance.toFixed(2)} TON |{' '}
                        {thread.starsBalance} ⭐
                      </div>
                    </div>
                    {thread.unreadAdminCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black">
                        {thread.unreadAdminCount} NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Selected User Telemetry Bar */}
            {activeThreadInfo && (
              <div
                data-testid="cockpit-active-support-user-bar"
                className="p-2.5 rounded-xl bg-[#090612] border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono"
                dir="ltr"
              >
                <div className="text-white font-bold">
                  👤 {activeThreadInfo.displayName}{' '}
                  <span className="text-cyan-300">({activeThreadInfo.username})</span> • TG ID:{' '}
                  <span className="text-[#fbbf24]">{activeThreadInfo.telegramUserId}</span>
                </div>
                <div className="text-[#00f59b] font-bold">
                  💎 {activeThreadInfo.tonBalance.toFixed(2)} TON • ⭐ {activeThreadInfo.starsBalance} Stars
                </div>
              </div>
            )}

            {supportReplyBanner && (
              <div
                data-testid="cockpit-support-reply-banner"
                className="p-2.5 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[#00f59b] text-[11px] font-bold"
              >
                {supportReplyBanner}
              </div>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {sessionMessages.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#090612] border border-purple-500/15 text-[11px] text-purple-300/70 text-center">
                  هنوز پیامی در سشن <span className="font-mono text-[#fbbf24]">{activeSessionCode}</span> ثبت نشده است.
                </div>
              ) : (
                [...sessionMessages]
                  .sort((a, b) => a.id - b.id)
                  .map((msg) => {
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
                        <div className="flex items-center justify-between font-bold gap-2">
                          <span>
                            {isOperator ? `👑 ${msg.senderName}` : `👤 ${msg.senderName}`}
                            {msg.username ? ` (@${msg.username.replace(/^@/, '')})` : ''}
                          </span>
                          <span className="text-[9px] font-mono text-[#fbbf24]" dir="ltr">
                            {msg.walletBalanceLabel || msg.vipLevel} • {msg.createdAt}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        {msg.diagnosticMetadata && (
                          <div
                            className="mt-1 px-2 py-1 rounded bg-black/40 border border-cyan-500/25 font-mono text-[9px] text-cyan-300 break-all"
                            dir="ltr"
                          >
                            📎 {msg.diagnosticMetadata}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <form onSubmit={handleSendOperatorReply} className="space-y-2">
              <textarea
                rows={2}
                data-testid="cockpit-support-reply-input"
                value={operatorReply}
                onChange={(e) => setOperatorReply(e.target.value)}
                placeholder={`پاسخ مستقیم به ${activeThreadInfo?.displayName || activeSessionCode} (ارسال در چت برنامه + ربات تلگرام)...`}
                className="w-full bg-[#090612] border border-purple-500/25 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={sendingReply || !operatorReply.trim()}
                data-testid="cockpit-send-reply-btn"
                className="w-full h-9 rounded-xl stake-emerald-cta font-bold text-xs text-[#041f14] cursor-pointer disabled:opacity-50"
              >
                {sendingReply
                  ? 'در حال ارسال به برنامه و تلگرام...'
                  : `📩 ارسال پاسخ به ${activeThreadInfo?.displayName || activeSessionCode} (چت + نوتیفیکیشن تلگرام)`}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
