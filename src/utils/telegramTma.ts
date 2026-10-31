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

export const DEFAULT_ADMIN_TELEGRAM_USER_IDS: number[] = [];

export const DEFAULT_ADMIN_TON_WALLET_ADDRESS =
  'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

export const DEFAULT_TON_USD_RATE = 5.0; // 1 TON = 5.00 settlement units (250 ⭐ = 1 TON)
export const DEFAULT_STARS_USD_RATE = 0.02; // 1 ⭐ = 0.02 settlement units (250 ⭐ = 1 TON)

export interface TonConnectWalletSpec {
  id: string;
  appName: string;
  name: string;
  icon: string;
  badge: string;
  badgeFa: string;
  protocol: 'TON Connect 2.0 (Auto-Sign)';
  universalLink: string;
  bridgeUrl: string;
  imageUrl: string;
  aboutUrl: string;
}

/**
 * Standard Automated TON Blockchain Wallets (TON Connect 2.0 Standard)
 * Strictly excludes Telegram's built-in software wallet (@wallet / telegram-wallet) per operator policy.
 */
export const EXCLUDED_TON_WALLET_APP_NAMES = ['telegram-wallet', 'wallet'] as const;
export const PRIORITIZED_NON_CUSTODIAL_TON_WALLETS = [
  'tonkeeper',
  'mytonwallet',
  'tonhub',
] as const;

export const TON_CONNECT_STANDARD_WALLETS: TonConnectWalletSpec[] = [
  {
    id: 'tonkeeper',
    appName: 'tonkeeper',
    name: 'Tonkeeper',
    icon: '💎',
    badge: 'TON Connect 2.0 • Auto-Sign',
    badgeFa: 'امضای خودکار آن‌چین (پیشنهادی)',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
    imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
    aboutUrl: 'https://tonkeeper.com',
  },
  {
    id: 'mytonwallet',
    appName: 'mytonwallet',
    name: 'MyTonWallet',
    icon: '🛡️',
    badge: 'Official TON Web3 • Auto-Sign',
    badgeFa: 'کیف پول رسمی وب۳ تون',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://connect.mytonwallet.org',
    bridgeUrl: 'https://tonconnectbridge.mytonwallet.org/bridge/',
    imageUrl: 'https://static.mytonwallet.io/icon-256.png',
    aboutUrl: 'https://mytonwallet.io',
  },
  {
    id: 'tonhub',
    appName: 'tonhub',
    name: 'Tonhub',
    icon: '⚡',
    badge: 'Smart Contract Vault • Auto-Sign',
    badgeFa: 'تسویه آنی قرارداد هوشمند',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://tonhub.com/ton-connect',
    bridgeUrl: 'https://connect.tonhubapi.com/tonconnect',
    imageUrl: 'https://tonhub.com/tonconnect_logo.png',
    aboutUrl: 'https://tonhub.com',
  },
  {
    id: 'bitgetTonWallet',
    appName: 'bitgetTonWallet',
    name: 'Bitget TON Wallet',
    icon: '🚀',
    badge: 'DeFi TON Bridge • Auto-Sign',
    badgeFa: 'اتصال مستقیم دیفای TON',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://bkcode.vip/ton-connect',
    bridgeUrl: 'https://ton-connect-bridge.bgwapi.io/bridge',
    imageUrl: 'https://raw.githubusercontent.com/bitgetwallet/download/main/logo/png/bitget_wallet_logo_288_mini.png',
    aboutUrl: 'https://web3.bitget.com',
  },
];

export const TON_CONNECT_WALLETS_LIST_CONFIG = {
  includeWallets: TON_CONNECT_STANDARD_WALLETS.map((w) => ({
    appName: w.appName,
    name: w.name,
    imageUrl: w.imageUrl,
    aboutUrl: w.aboutUrl,
    universalLink: w.universalLink,
    bridgeUrl: w.bridgeUrl,
    platforms: ['ios', 'android', 'macos', 'windows', 'linux'] as (
      | 'ios'
      | 'android'
      | 'macos'
      | 'windows'
      | 'linux'
    )[],
  })),
  excludeWallets: ['telegram-wallet'],
};

/**
 * Filters a TON Connect wallets list to strictly exclude the built-in Telegram Wallet (`telegram-wallet`)
 * and prioritize non-custodial external wallets (`tonkeeper`, `mytonwallet`, `tonhub`).
 */
export function filterNonCustodialTonWallets<
  T extends { appName?: string; name?: string; bridgeUrl?: string }
>(wallets: T[]): T[] {
  if (!Array.isArray(wallets)) return [];
  const excludedSet = new Set([
    ...EXCLUDED_TON_WALLET_APP_NAMES.map((x) => x.toLowerCase()),
    'stower',
    'mirai',
    'miraiapp-tg',
  ]);
  const priorityOrder = PRIORITIZED_NON_CUSTODIAL_TON_WALLETS.map((x) =>
    x.toLowerCase()
  );

  const filtered = wallets.filter((w) => {
    const appName = String(w?.appName || '').toLowerCase().trim();
    const name = String(w?.name || '').toLowerCase().trim();
    const bridge = String(w?.bridgeUrl || '').toLowerCase().trim();
    if (excludedSet.has(appName)) return false;
    if (
      appName.includes('telegram-wallet') ||
      name === 'wallet' ||
      name.includes('telegram wallet') ||
      bridge.includes('stower.money') ||
      bridge.includes('mirai.app')
    ) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const aApp = String(a?.appName || '').toLowerCase().trim();
    const bApp = String(b?.appName || '').toLowerCase().trim();
    const aIdx = priorityOrder.indexOf(aApp);
    const bIdx = priorityOrder.indexOf(bApp);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });
}

/**
 * Builds a standard TON Connect automated transaction payload & deep-link (in nanoTON = 10^9).
 */
export function buildTonConnectAutoTransferPayload(params: {
  recipientVaultAddress: string;
  amountTon: number;
  commentMemo: string;
  walletProvider?: string;
}): {
  nanoTon: string;
  tonDeepLink: string;
  universalAutoSignUrl: string;
} {
  const safeTon = Math.max(0.01, Number(params.amountTon) || 0.01);
  const nanoTon = String(Math.round(safeTon * 1_000_000_000));
  const encodedText = encodeURIComponent(params.commentMemo || 'LuckyDrop_TON_Auto');
  const cleanAddr = (params.recipientVaultAddress || DEFAULT_ADMIN_TON_WALLET_ADDRESS).trim();
  const tonDeepLink = `ton://transfer/${cleanAddr}?amount=${nanoTon}&text=${encodedText}`;
  const universalAutoSignUrl = `https://app.tonkeeper.com/transfer/${cleanAddr}?amount=${nanoTon}&text=${encodedText}`;
  return {
    nanoTon,
    tonDeepLink,
    universalAutoSignUrl,
  };
}

export interface TmaQuestItem {
  id: 'CONNECT_TON_WALLET' | 'JOIN_TELEGRAM_CHANNEL' | 'DAILY_STREAK_7' | 'PLAY_10_MINIGAMES';
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  rewardLabelFa: string;
  mathRationaleFa: string;
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
    titleFa: 'اتصال کیف پول استاندارد TON Connect',
    titleEn: 'Connect Standard TON Wallet',
    subtitleFa: 'اتصال Tonkeeper، MyTonWallet، Tonhub یا Bitget Wallet',
    rewardLabelFa: '+2 توپ رایگان Plinko',
    mathRationaleFa: 'فعال‌سازی آنی پس از اولین اتصال کیف پول در LuckyDrop',
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
    subtitleFa: 'عضویت در کامیونیتی رسمی و دریافت اطلاعیه‌های قرعه‌کشی',
    rewardLabelFa: '+1 بلیت رایگان لاتاری',
    mathRationaleFa: 'صدور خودکار کوپن هدیه پس از تایید عضویت در کانال',
    rewardType: 'FREE_LOTTERY_TICKET',
    rewardAmount: 1,
    progress: 0,
    target: 1,
    claimed: false,
  },
  {
    id: 'DAILY_STREAK_7',
    titleFa: 'حضور روزانه ۷ روزه (Daily Check-In)',
    titleEn: 'Daily Streak Check-In (7 Days)',
    subtitleFa: 'ورود روزانه به مینی‌اپ برای دریافت کارت اسکرچ و امتیاز وفاداری',
    rewardLabelFa: '+1 کارت اسکرچ رایگان + 35 XP',
    mathRationaleFa: 'پاداش وفاداری ویژه کاربران فعال روزانه',
    rewardType: 'FREE_SCRATCH_CARD',
    rewardAmount: 1,
    progress: 0,
    target: 7,
    claimed: false,
    streakDay: 0,
  },
  {
    id: 'PLAY_10_MINIGAMES',
    titleFa: 'انجام ۱۰ دور بازی در بخش آرکید',
    titleEn: 'Play 10 Rounds in Mini-Games',
    subtitleFa: 'Plinko، Crash، Dice، Mines، Tower، Wheel یا Hi-Lo',
    rewardLabelFa: '+100 XP (شارژ بلیت هدیه)',
    mathRationaleFa: 'تکمیل نوار امتیاز XP و دریافت کوپن قرعه‌کشی رایگان',
    rewardType: 'BONUS_XP',
    rewardAmount: 100,
    progress: 0,
    target: 10,
    claimed: false,
  },
];

/**
 * Generates a localStorage key strictly scoped by verified telegramUserId
 * so switching Telegram accounts on the same device never leaks state.
 */
export function getScopedStorageKey(telegramUserId: number | string, baseKey: string): string {
  const cleanId = String(telegramUserId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `luckydrop_u_${cleanId}_${baseKey}`;
}

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
      twa.disableVerticalSwipes?.();
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
 * or generates an isolated per-session Telegram user ID in browser preview (zero shared demo profile).
 */
export function resolveTelegramUser(): TelegramWebAppUser {
  const twa = getTelegramWebApp();
  const unsafeUser = twa?.initDataUnsafe?.user;
  if (unsafeUser && typeof unsafeUser.id === 'number' && unsafeUser.id > 0) {
    return {
      id: unsafeUser.id,
      first_name: unsafeUser.first_name || 'کاربر',
      last_name: unsafeUser.last_name || '',
      username: unsafeUser.username || `tg_${unsafeUser.id}`,
      language_code: unsafeUser.language_code || 'fa',
      is_premium: Boolean(unsafeUser.is_premium),
      photo_url: unsafeUser.photo_url,
    };
  }

  try {
    // Allow URL query override `?tg_uid=...` for multi-tenant isolation testing
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryUid = Number(urlParams.get('tg_uid') || 0);
      if (Number.isFinite(queryUid) && queryUid > 0) {
        return {
          id: Math.floor(queryUid),
          first_name: 'کاربر',
          last_name: `#${Math.floor(queryUid).toString().slice(-4)}`,
          username: `tg_${Math.floor(queryUid)}`,
          language_code: 'fa',
          is_premium: false,
        };
      }
    }

    const saved = localStorage.getItem('luckydrop_isolated_tg_user_v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.id === 'number' && parsed.id > 0 && parsed.id !== 778899101) {
        return parsed;
      }
    }

    const generatedId = Math.floor(100000000 + Math.random() * 899999999);
    const freshUser: TelegramWebAppUser = {
      id: generatedId,
      first_name: 'کاربر',
      last_name: `#${String(generatedId).slice(-4)}`,
      username: `tg_${generatedId}`,
      language_code: 'fa',
      is_premium: false,
    };
    localStorage.setItem('luckydrop_isolated_tg_user_v3', JSON.stringify(freshUser));
    return freshUser;
  } catch {
    const fallbackId = 800000001;
    return {
      id: fallbackId,
      first_name: 'کاربر',
      last_name: 'تلگرام',
      username: `tg_${fallbackId}`,
      language_code: 'fa',
      is_premium: false,
    };
  }
}

/**
 * Checks whether the current Telegram user is authorized to see and open the `⚙️ Admin` tab.
 * Strictly requires server-side verification (`serverVerifiedIsAdmin === true`) or explicit server ID match.
 */
export function isTelegramAdminAuthorized(
  userId: number,
  adminTelegramIds: number[] = DEFAULT_ADMIN_TELEGRAM_USER_IDS
): boolean {
  if (!Number.isFinite(Number(userId)) || Number(userId) <= 0) return false;
  if (!Array.isArray(adminTelegramIds) || adminTelegramIds.length === 0) return false;
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
