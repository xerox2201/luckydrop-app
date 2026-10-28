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

export interface TonConnectWalletSpec {
  id: string;
  name: string;
  icon: string;
  badge: string;
  badgeFa: string;
  protocol: 'TON Connect 2.0 (Auto-Sign)';
  universalLink: string;
  samplePrefix: string;
}

/**
 * Standard Automated TON Blockchain Wallets (TON Connect 2.0 Standard)
 * Strictly excludes Telegram's built-in software wallet (@wallet) per operator policy.
 */
export const TON_CONNECT_STANDARD_WALLETS: TonConnectWalletSpec[] = [
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    icon: '💎',
    badge: 'TON Connect 2.0 • Auto-Sign',
    badgeFa: 'امضای خودکار آن‌چین (پیشنهادی)',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    samplePrefix: 'UQB_TK_',
  },
  {
    id: 'mytonwallet',
    name: 'MyTonWallet',
    icon: '🛡️',
    badge: 'Official TON Web3 • Auto-Sign',
    badgeFa: 'کیف پول رسمی وب۳ تون',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://connect.mytonwallet.org',
    samplePrefix: 'UQB_MTW_',
  },
  {
    id: 'tonhub',
    name: 'Tonhub',
    icon: '⚡',
    badge: 'Smart Contract Vault • Auto-Sign',
    badgeFa: 'تسویه آنی قرارداد هوشمند',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://tonhub.com/ton-connect',
    samplePrefix: 'UQB_TH_',
  },
  {
    id: 'dewallet',
    name: 'DeWallet',
    icon: '🌐',
    badge: 'Non-Custodial TON • Auto-Sign',
    badgeFa: 'استاندارد غیرحضانتی TON',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://dewallet.pro',
    samplePrefix: 'UQB_DW_',
  },
  {
    id: 'bitget_ton',
    name: 'Bitget TON Wallet',
    icon: '🚀',
    badge: 'DeFi TON Bridge • Auto-Sign',
    badgeFa: 'اتصال مستقیم دیفای TON',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://web3.bitget.com',
    samplePrefix: 'UQB_BG_',
  },
  {
    id: 'okx_ton',
    name: 'OKX Web3 TON',
    icon: '🔷',
    badge: 'Direct Node Signer • Auto-Sign',
    badgeFa: 'تایید خودکار نود بلاکچین',
    protocol: 'TON Connect 2.0 (Auto-Sign)',
    universalLink: 'https://www.okx.com/web3',
    samplePrefix: 'UQB_OKX_',
  },
];

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
    subtitleFa: 'اتصال Tonkeeper، MyTonWallet، Tonhub، DeWallet، Bitget یا OKX',
    rewardLabelFa: '+2 Free Plinko Drops (Play-Only Bonus)',
    mathRationaleFa:
      'هدف: حذف اصطکاک واریز اولیه (Onboarding). پاداش به صورت توکن بازی غیرقابل برداشت مستقیم (Play-Only) از محل ۳٪ استخر ذخیره تبلیغاتی تامین می‌شود؛ بنابراین خروجی نقدی مستقیم خزانه دقیقاً ۰.۰۰ TON است.',
    rewardType: 'FREE_PLINKO_DROPS',
    rewardAmount: 2,
    progress: 0,
    target: 1,
    claimed: false,
  },
  {
    id: 'JOIN_TELEGRAM_CHANNEL',
    titleFa: 'عضویت در کامیونیتی رسمی تلگرام LuckyDrop',
    titleEn: 'Join Official LuckyDrop Telegram Channel',
    subtitleFa: 'عضویت در @LuckyDrop_TON_Official و تایید آنی عضویت',
    rewardLabelFa: '+1 Free Lottery Ticket (Turnover-Locked)',
    mathRationaleFa:
      'هدف: رشد ارگانیک کانال و کاهش هزینه جذب کاربر (CAC = $0). بلیت هدیه از نوع Turnover-Locked است و جایزه آن صرفاً از استخر ۸۵٪ فروش واقعی دور پرداخت می‌شود (بدون یک سنت کسر از سرمایه ادمین).',
    rewardType: 'FREE_LOTTERY_TICKET',
    rewardAmount: 1,
    progress: 0,
    target: 1,
    claimed: false,
  },
  {
    id: 'DAILY_STREAK_7',
    titleFa: 'چک‌این روزانه ۷ روزه (Daily Retention Streak)',
    titleEn: 'Daily Streak Check-In (7 Days)',
    subtitleFa: 'ورود روزانه برای دریافت کارت اسکرچ رایگان و XP وفاداری',
    rewardLabelFa: '+1 Free Scratch Card + 35 XP',
    mathRationaleFa:
      'هدف: افزایش نرخ بازگشت روزانه (D1/D7 Retention). کارت اسکرچ رایگان دارای سقف جایزه کنترل‌شده از استخر ۳٪ سرریز وفاداری (Rollover Reserve) است و هرگز از اصل خزانه برداشت نمی‌کند.',
    rewardType: 'FREE_SCRATCH_CARD',
    rewardAmount: 1,
    progress: 1,
    target: 7,
    claimed: false,
    streakDay: 3,
  },
  {
    id: 'PLAY_10_MINIGAMES',
    titleFa: 'انجام ۱۰ دور گردش واقعی در بازی‌های آرکید',
    titleEn: 'Play 10 Rounds in Mini-Games',
    subtitleFa: 'Plinko، Crash، Dice، Mines، Tower، Wheel یا Hi-Lo',
    rewardLabelFa: '+100 XP (شارژ نوار بلیت رایگان Turnover)',
    mathRationaleFa:
      'هدف: ایجاد گردش مالی (Liquidity Velocity). با ۱۰ دور بازی، کارمزد خانه (۱٪ تا ۳٪ House Edge) سود قطعی ایجاد می‌کند و بخشی از همین سود به صورت XP به بازیکن برمی‌گردد (۱۰۰٪ بدون ضرر).',
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
