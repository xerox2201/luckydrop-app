/**
 * TELEGRAM MINI APP (TMA) SDK, HAPTIC ENGINE & DUAL-CURRENCY (TON + STARS) BRIDGE
 * -------------------------------------------------------------------------------
 * - Initializes `window.Telegram?.WebApp` (`ready()`, `expand()`, `#070510` Obsidian theme)
 * - Auto-authenticates user via `Telegram.WebApp.initDataUnsafe.user` (with rich preview fallback)
 * - Provides `HapticEngine` (`impactOccurred`, `notificationOccurred`, `selectionChanged`)
 * - Manages `ADMIN_TELEGRAM_USER_IDS` and `ADMIN_TON_WALLET_ADDRESS`
 * - Provides Dual-Currency (`💎 TON` & `⭐ STARS`) conversion & formatting helpers
 */

export type ActiveTmaCurrency = 'TON' | 'STARS';

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export const DEFAULT_ADMIN_TELEGRAM_USER_IDS: number[] = [123456789];

export const DEFAULT_ADMIN_TON_WALLET_ADDRESS =
  'UQB_LuckyDrop_Official_TON_Vault_99x88_VIP';

export const DEFAULT_TON_USD_RATE = 5.0; // 1 TON = 5.00 settlement units (250 ⭐ = 1 TON)
export const DEFAULT_STARS_USD_RATE = 0.02; // 1 ⭐ = 0.02 settlement units (250 ⭐ = 1 TON)

export interface TmaQuestItem {
  id: 'CONNECT_TON_WALLET' | 'JOIN_TELEGRAM_CHANNEL' | 'DAILY_STREAK_7' | 'PLAY_10_MINIGAMES';
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  rewardLabelFa: string;
  rewardType: 'FREE_PLINKO_DROPS' | 'FREE_LOTTERY_TICKET' | 'FREE_SCRATCH_CARD' | 'BONUS_XP';
  rewardAmount: number;
  progress: number;
  target: number;
  claimed: boolean;
  streakDay?: number;
}

export const INITIAL_TMA_QUESTS: TmaQuestItem[] = [
  {
    id: 'CONNECT_TON_WALLET',
    titleFa: 'اتصال کیف پول TON (One-Tap TON Connect)',
    titleEn: 'Connect Your TON Wallet',
    subtitleFa: 'اتصال Tonkeeper، @wallet تلگرام یا MyTonWallet',
    rewardLabelFa: '+2 Free Plinko Drops (بدون ریسک خزانه)',
    rewardType: 'FREE_PLINKO_DROPS',
    rewardAmount: 2,
    progress: 0,
    target: 1,
    claimed: false,
  },
  {
    id: 'JOIN_TELEGRAM_CHANNEL',
    titleFa: 'عضویت در کانال رسمی تلگرام LuckyDrop',
    titleEn: 'Join Official LuckyDrop Telegram Channel',
    subtitleFa: 'عضویت در @LuckyDrop_TON_Official و تایید آنی',
    rewardLabelFa: '+1 Free Lottery Ticket (Turnover-Locked)',
    rewardType: 'FREE_LOTTERY_TICKET',
    rewardAmount: 1,
    progress: 0,
    target: 1,
    claimed: false,
  },
  {
    id: 'DAILY_STREAK_7',
    titleFa: 'چک‌این روزانه ۷ روزه (Daily Streak Check-In)',
    titleEn: 'Daily Streak Check-In (7 Days)',
    subtitleFa: 'دریافت روزانه کارت اسکرچ رایگان و امتیاز XP بلیت لاتاری',
    rewardLabelFa: '+1 Free Scratch Card + 35 XP',
    rewardType: 'FREE_SCRATCH_CARD',
    rewardAmount: 1,
    progress: 1,
    target: 7,
    claimed: false,
    streakDay: 3,
  },
  {
    id: 'PLAY_10_MINIGAMES',
    titleFa: 'انجام ۱۰ دور بازی در مینی‌گیم‌های آرکید',
    titleEn: 'Play 10 Rounds in Mini-Games',
    subtitleFa: 'Plinko، Crash، 52-Bit Dice، Mines یا Scratch',
    rewardLabelFa: '+100 XP (صدور آنی کوپن رایگان لاتاری)',
    rewardType: 'BONUS_XP',
    rewardAmount: 100,
    progress: 4,
    target: 10,
    claimed: false,
  },
];

function getTelegramWebApp(): any {
  if (typeof window === 'undefined') return null;
  return (window as any)?.Telegram?.WebApp || null;
}

/**
 * Initializes the Telegram Mini App SDK viewport, theme colors, and expansion.
 */
export function initTelegramMiniAppSdk(): TelegramWebAppUser {
  const twa = getTelegramWebApp();
  if (twa) {
    try {
      twa.ready?.();
      twa.expand?.();
      twa.setHeaderColor?.('#070510');
      twa.setBackgroundColor?.('#070510');
      twa.enableClosingConfirmation?.();
    } catch {
      // ignore older WebApp client versions
    }
  }
  return resolveTelegramUser();
}

/**
 * Resolves the active Telegram user from `Telegram.WebApp.initDataUnsafe.user`,
 * or returns a realistic persisted Telegram VIP profile in AI Studio preview.
 */
export function resolveTelegramUser(): TelegramWebAppUser {
  const twa = getTelegramWebApp();
  const unsafeUser = twa?.initDataUnsafe?.user;
  if (unsafeUser && typeof unsafeUser.id === 'number') {
    return {
      id: unsafeUser.id,
      first_name: unsafeUser.first_name || 'VIP Player',
      last_name: unsafeUser.last_name || '',
      username: unsafeUser.username || `tg_user_${unsafeUser.id}`,
      language_code: unsafeUser.language_code || 'fa',
      is_premium: Boolean(unsafeUser.is_premium ?? true),
      photo_url: unsafeUser.photo_url,
    };
  }

  try {
    const saved = localStorage.getItem('luckydrop_tma_user_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.id === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return {
    id: 778899101,
    first_name: 'کامران',
    last_name: 'VIP',
    username: 'Kamran_TON_VIP',
    language_code: 'fa',
    is_premium: true,
  };
}

/**
 * Checks whether the current Telegram user is authorized to see and open the `⚙️ Admin` tab.
 */
export function isTelegramAdminAuthorized(
  userId: number,
  adminTelegramIds: number[] = DEFAULT_ADMIN_TELEGRAM_USER_IDS,
  isDevAdminPreviewEnabled: boolean = false
): boolean {
  if (isDevAdminPreviewEnabled) return true;
  return adminTelegramIds.includes(Number(userId));
}

/**
 * Native Telegram HapticFeedback wrapper (`HapticEngine`) with tactile fallback.
 */
export const HapticEngine = {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
    try {
      const twa = getTelegramWebApp();
      if (twa?.HapticFeedback?.impactOccurred) {
        twa.HapticFeedback.impactOccurred(style);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        const ms = style === 'heavy' || style === 'rigid' ? 22 : style === 'medium' ? 12 : 6;
        navigator.vibrate(ms);
      }
    } catch {
      // ignore haptic errors on unsupported devices
    }
  },

  notificationOccurred(type: 'error' | 'success' | 'warning' = 'success'): void {
    try {
      const twa = getTelegramWebApp();
      if (twa?.HapticFeedback?.notificationOccurred) {
        twa.HapticFeedback.notificationOccurred(type);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'success') navigator.vibrate([12, 30, 18]);
        else if (type === 'warning') navigator.vibrate([18, 40, 18]);
        else navigator.vibrate([30, 40, 30]);
      }
    } catch {
      // ignore
    }
  },

  selectionChanged(): void {
    try {
      const twa = getTelegramWebApp();
      if (twa?.HapticFeedback?.selectionChanged) {
        twa.HapticFeedback.selectionChanged();
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(4);
      }
    } catch {
      // ignore
    }
  },
};

/**
 * Converts an amount in the active TMA currency (`TON` or `STARS`) to internal PAM USDT settlement units.
 */
export function tmaCurrencyToUsdt(
  amountInActiveCurrency: number,
  currency: ActiveTmaCurrency,
  tonUsdRate: number = DEFAULT_TON_USD_RATE,
  starsUsdRate: number = DEFAULT_STARS_USD_RATE
): number {
  const safeVal = Math.max(0, Number(amountInActiveCurrency) || 0);
  if (currency === 'TON') {
    return Number((safeVal * (tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE)).toFixed(2));
  }
  return Number((safeVal * (starsUsdRate > 0 ? starsUsdRate : DEFAULT_STARS_USD_RATE)).toFixed(2));
}

/**
 * Converts internal PAM USDT settlement units into `TON` or `STARS`.
 */
export function usdtToTmaCurrency(
  amountUsdt: number,
  currency: ActiveTmaCurrency,
  tonUsdRate: number = DEFAULT_TON_USD_RATE,
  starsUsdRate: number = DEFAULT_STARS_USD_RATE
): number {
  const safeUsdt = Math.max(0, Number(amountUsdt) || 0);
  if (currency === 'TON') {
    const rate = tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE;
    return Number((safeUsdt / rate).toFixed(2));
  }
  const sRate = starsUsdRate > 0 ? starsUsdRate : DEFAULT_STARS_USD_RATE;
  return Math.round(safeUsdt / sRate);
}

/**
 * Global currency formatter utility that strictly outputs either `X.XX TON` or `X,XXX ⭐` everywhere.
 */
export function formatCurrency(
  amount: number,
  activeCurrency: ActiveTmaCurrency = 'TON'
): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  if (activeCurrency === 'TON') {
    const formatted = safe.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} TON`;
  }
  const starsInt = Math.round(safe);
  const formatted = starsInt.toLocaleString('en-US');
  return `${formatted} ⭐`;
}

/**
 * Formats an amount in the active TMA currency (`X.XX TON` or `X,XXX ⭐`).
 */
export function formatTmaCurrency(
  amount: number,
  currency: ActiveTmaCurrency,
  _includeSymbolIcon: boolean = true
): string {
  return formatCurrency(amount, currency);
}

/**
 * Truncates a TON wallet address cleanly (e.g. `UQBx...89aF`).
 */
export function truncateTonAddress(address: string): string {
  const clean = (address || '').trim();
  if (!clean) return '';
  if (clean.length <= 10) return clean;
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Opens native Telegram share dialog for viral referral links (`https://t.me/share/url?url=...`).
 */
export function openTelegramNativeShare(referralUrl: string, shareText: string): void {
  HapticEngine.impactOccurred('medium');
  const encodedUrl = encodeURIComponent(referralUrl);
  const encodedText = encodeURIComponent(shareText);
  const tgShareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

  const twa = getTelegramWebApp();
  if (twa?.openTelegramLink) {
    try {
      twa.openTelegramLink(tgShareLink);
      return;
    } catch {
      // fallback
    }
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(`${shareText}\n${referralUrl}`);
  }
}
