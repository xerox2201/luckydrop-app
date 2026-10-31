import crypto from 'node:crypto';

// ============================================================================
// 1. CENTRALIZED ENVIRONMENT VARIABLES CONFIG LOADER (ZERO HARDCODED SECRETS)
// ============================================================================

export interface ServerSecurityConfig {
  telegramBotToken: string;
  telegramWebhookSecret: string;
  adminTelegramUserIds: number[];
  telegramNotificationChatId: string;
  publicTonTreasuryWallet: string;
  appDomain: string;
  autoWithdrawLimitTon: number;
  strictTelegramInitDataAuth: boolean;
}

export function loadServerSecurityConfig(
  env: Record<string, string | undefined> = process.env
): ServerSecurityConfig {
  const rawAdminIds = (env.ADMIN_TELEGRAM_USER_IDS || '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const rawDomain = (
    env.APP_DOMAIN ||
    env.APP_URL ||
    'https://luckydrop.com'
  )
    .trim()
    .replace(/\/+$/, '');

  const normalizedDomain = rawDomain.startsWith('http')
    ? rawDomain
    : `https://${rawDomain}`;

  return {
    telegramBotToken: (env.TELEGRAM_BOT_TOKEN || '').trim(),
    telegramWebhookSecret: (env.TELEGRAM_WEBHOOK_SECRET || '').trim(),
    adminTelegramUserIds: rawAdminIds,
    telegramNotificationChatId: (env.TELEGRAM_NOTIFICATION_CHAT_ID || '').trim(),
    publicTonTreasuryWallet: (
      env.PUBLIC_TON_TREASURY_WALLET || 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ'
    ).trim(),
    appDomain: normalizedDomain,
    autoWithdrawLimitTon: Math.max(1, Number(env.AUTO_WITHDRAW_LIMIT_TON) || 50),
    strictTelegramInitDataAuth:
      String(env.STRICT_TELEGRAM_INITDATA_AUTH || '').toLowerCase() === 'true',
  };
}

export function evaluateServerAdminAuthorization(
  telegramUserId: number | string | null | undefined,
  adminTelegramUserIds: number[]
): boolean {
  const numericId = Number(telegramUserId);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;
  if (!Array.isArray(adminTelegramUserIds) || adminTelegramUserIds.length === 0) return false;
  return adminTelegramUserIds.includes(numericId);
}

export interface TonConnectManifestPayload {
  url: string;
  name: string;
  iconUrl: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
}

export function buildTonConnectManifest(rawOriginOrDomain?: string): TonConnectManifestPayload {
  const clean = (rawOriginOrDomain || process.env.APP_DOMAIN || 'https://luckydrop.com')
    .trim()
    .replace(/\/+$/, '');
  const baseUrl = clean.startsWith('http') ? clean : `https://${clean}`;
  return {
    url: baseUrl,
    name: 'LuckyDrop VIP — TON Lottery & 3D Games',
    iconUrl: `${baseUrl}/favicon.ico`,
    termsOfUseUrl: `${baseUrl}/rules`,
    privacyPolicyUrl: `${baseUrl}/transparency`,
  };
}

// ============================================================================
// 2. OFFICIAL TELEGRAM WEBAPP `initData` HMAC-SHA256 CRYPTOGRAPHIC VERIFIER
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret_key = HMAC_SHA256(key: "WebAppData", msg: TELEGRAM_BOT_TOKEN)
// hash       = HMAC_SHA256_HEX(key: secret_key, msg: sorted_data_check_string)
// ============================================================================

export interface VerifiedTelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramInitDataVerificationResult {
  valid: boolean;
  reason:
    | 'VERIFIED_CRYPTOGRAPHICALLY'
    | 'DEV_BYPASS_NO_BOT_TOKEN'
    | 'MISSING_INIT_DATA'
    | 'MISSING_HASH'
    | 'INVALID_HMAC_SIGNATURE'
    | 'EXPIRED_AUTH_DATE'
    | 'USER_ID_MISMATCH';
  user: VerifiedTelegramWebAppUser | null;
  authDateSec: number | null;
  startParam?: string;
  computedHash?: string;
}

export function computeTelegramWebAppDataSecretKey(botToken: string): Buffer {
  return crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
}

export function buildTelegramDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`);
    }
  });
  pairs.sort((a, b) => a.localeCompare(b));
  return pairs.join('\n');
}

export function verifyTelegramWebAppInitData(params: {
  initDataRaw: string | undefined | null;
  botToken: string | undefined | null;
  maxAgeSeconds?: number;
  expectedUserId?: number | string | null;
  strictMode?: boolean;
  nowUnixSec?: number;
}): TelegramInitDataVerificationResult {
  const cleanToken = (params.botToken || '').trim();
  const rawInitData = (params.initDataRaw || '').trim();
  const strict = Boolean(params.strictMode);
  const maxAge = params.maxAgeSeconds ?? 86400; // 24 hours default
  const nowSec = params.nowUnixSec ?? Math.floor(Date.now() / 1000);

  // If no botToken is configured on the server and strictMode is off (e.g. AI Studio preview),
  // allow non-forged preview requests while still flagging if someone passes a tampered hash when token exists.
  if (!cleanToken) {
    if (strict) {
      return {
        valid: false,
        reason: 'MISSING_INIT_DATA',
        user: null,
        authDateSec: null,
      };
    }
    return {
      valid: true,
      reason: 'DEV_BYPASS_NO_BOT_TOKEN',
      user: null,
      authDateSec: null,
    };
  }

  if (!rawInitData) {
    if (!strict) {
      return {
        valid: true,
        reason: 'DEV_BYPASS_NO_BOT_TOKEN',
        user: null,
        authDateSec: null,
      };
    }
    return {
      valid: false,
      reason: 'MISSING_INIT_DATA',
      user: null,
      authDateSec: null,
    };
  }

  const searchParams = new URLSearchParams(rawInitData);
  const providedHash = (searchParams.get('hash') || '').trim().toLowerCase();
  if (!providedHash || providedHash.length !== 64 || !/^[0-9a-f]{64}$/.test(providedHash)) {
    return {
      valid: false,
      reason: 'MISSING_HASH',
      user: null,
      authDateSec: null,
    };
  }

  const dataCheckString = buildTelegramDataCheckString(searchParams);
  const secretKey = computeTelegramWebAppDataSecretKey(cleanToken);
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
    .toLowerCase();

  const providedBuf = Buffer.from(providedHash, 'hex');
  const computedBuf = Buffer.from(computedHash, 'hex');
  const signaturesMatch =
    providedBuf.length === computedBuf.length &&
    crypto.timingSafeEqual(providedBuf, computedBuf);

  if (!signaturesMatch) {
    return {
      valid: false,
      reason: 'INVALID_HMAC_SIGNATURE',
      user: null,
      authDateSec: null,
      computedHash,
    };
  }

  const authDateSec = Number(searchParams.get('auth_date') || 0);
  if (!Number.isFinite(authDateSec) || authDateSec <= 0 || nowSec - authDateSec > maxAge) {
    return {
      valid: false,
      reason: 'EXPIRED_AUTH_DATE',
      user: null,
      authDateSec: authDateSec || null,
      computedHash,
    };
  }

  let parsedUser: VerifiedTelegramWebAppUser | null = null;
  const userJson = searchParams.get('user');
  if (userJson) {
    try {
      const obj = JSON.parse(userJson);
      if (obj && typeof obj.id === 'number') {
        parsedUser = {
          id: obj.id,
          first_name: String(obj.first_name || 'VIP'),
          last_name: obj.last_name ? String(obj.last_name) : undefined,
          username: obj.username ? String(obj.username) : undefined,
          language_code: obj.language_code ? String(obj.language_code) : undefined,
          is_premium: Boolean(obj.is_premium),
        };
      }
    } catch {
      parsedUser = null;
    }
  }

  if (
    params.expectedUserId !== undefined &&
    params.expectedUserId !== null &&
    String(params.expectedUserId).trim() !== '' &&
    parsedUser &&
    String(parsedUser.id) !== String(params.expectedUserId).trim()
  ) {
    return {
      valid: false,
      reason: 'USER_ID_MISMATCH',
      user: parsedUser,
      authDateSec,
      computedHash,
    };
  }

  return {
    valid: true,
    reason: 'VERIFIED_CRYPTOGRAPHICALLY',
    user: parsedUser,
    authDateSec,
    startParam: searchParams.get('start_param') || undefined,
    computedHash,
  };
}

/**
 * Helper for unit tests & cryptographic diagnostics: generates a valid signed Telegram WebApp initData string
 */
export function createSignedTelegramInitData(params: {
  botToken: string;
  user: VerifiedTelegramWebAppUser;
  authDateSec?: number;
  queryId?: string;
  startParam?: string;
}): string {
  const authDate = params.authDateSec ?? Math.floor(Date.now() / 1000);
  const search = new URLSearchParams();
  if (params.queryId) search.set('query_id', params.queryId);
  search.set('user', JSON.stringify(params.user));
  search.set('auth_date', String(authDate));
  if (params.startParam) search.set('start_param', params.startParam);

  const dataCheckString = buildTelegramDataCheckString(search);
  const secretKey = computeTelegramWebAppDataSecretKey(params.botToken);
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
    .toLowerCase();

  search.set('hash', hash);
  return search.toString();
}

// ============================================================================
// 3. TELEGRAM BOT `/start`, STARS WEBHOOK & INLINE ADMIN CALLBACK HANDLERS
// ============================================================================

export interface TelegramSendMessagePayload {
  chat_id: string | number;
  text: string;
  parse_mode: 'HTML';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: Array<
      Array<{
        text: string;
        web_app?: { url: string };
        url?: string;
        callback_data?: string;
      }>
    >;
  };
}

export function buildTelegramStartCommandPayload(params: {
  chatId: number | string;
  firstName?: string;
  startPayload?: string;
  appDomain: string;
  channelUsername?: string;
}): TelegramSendMessagePayload {
  const rawStart = (params.startPayload || '').trim();
  const cleanDomain = params.appDomain.replace(/\/+$/, '');
  const refCode = rawStart.startsWith('ref_')
    ? rawStart.replace(/^ref_/, '').trim()
    : rawStart;

  const launchUrl = refCode
    ? `${cleanDomain}/?ref=${encodeURIComponent(refCode)}&startapp=${encodeURIComponent(rawStart)}`
    : cleanDomain;

  const greetingName = (params.firstName || 'کاربر VIP').replace(/[<>&]/g, '');

  const text = [
    `👑 <b>خوش آمدید ${greetingName} به مینی‌اپ رسمی LuckyDrop!</b>`,
    ``,
    `💎 <b>ویژگی‌های پلتفرم Web3 تلگرام:</b>`,
    `• 🎰 <b>لاتاری‌های بزرگ راس تایم:</b> جوایز استخر قرعه‌کشی راس تایم به صورت آنی بین برندگان تقسیم می‌شود!`,
    `• 🎮 <b>مینی‌گیم‌های ۳ بعدی:</b> Plinko، Crash، Tower 3D، Mines و Dice با بررسی رمزنگاری پس از پایان هر دور`,
    `• ⚡ <b>واریز و برداشت آنی:</b> اتصال مستقیم به تمامی کیف پول‌های استاندارد <b>TON Connect 2.0</b> و <b>Telegram Stars (⭐)</b>`,
    refCode ? `\n🎁 <b>کد دعوت فعال‌شده شما:</b> <code>${refCode}</code>` : '',
    ``,
    `👇 برای ورود به مینی‌اپ روی دکمه زیر کلیک کنید:`,
  ]
    .filter(Boolean)
    .join('\n');

  const inlineKeyboard: Array<
    Array<{
      text: string;
      web_app?: { url: string };
      url?: string;
    }>
  > = [
    [
      {
        text: '🚀 ورود به مینی‌اپ LuckyDrop (TON & ⭐)',
        web_app: { url: launchUrl },
      },
    ],
  ];

  if (params.channelUsername && params.channelUsername.startsWith('@')) {
    inlineKeyboard.push([
      {
        text: '📢 کانال رسمی و نتایج زنده قرعه‌کشی',
        url: `https://t.me/${params.channelUsername.replace(/^@/, '')}`,
      },
    ]);
  }

  return {
    chat_id: params.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  };
}

export interface StarsPaymentVerificationResult {
  valid: boolean;
  starsAmount: number;
  creditedUsdt: number;
  telegramPaymentChargeId: string;
  invoicePayload: string;
  payerTelegramId: number;
  payerDisplayName: string;
}

export function verifyTelegramStarsSuccessfulPayment(params: {
  message: any;
  starsUsdRate?: number;
}): StarsPaymentVerificationResult | null {
  const payment = params.message?.successful_payment;
  if (!payment) return null;

  // Telegram Stars currency code is strictly 'XTR'
  const currency = String(payment.currency || '').toUpperCase();
  const totalAmount = Number(payment.total_amount || 0);
  if (currency !== 'XTR' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return null;
  }

  const starsRate = params.starsUsdRate && params.starsUsdRate > 0 ? params.starsUsdRate : 0.02;
  const creditedUsdt = Number((totalAmount * starsRate).toFixed(2));
  const fromUser = params.message?.from || {};

  return {
    valid: true,
    starsAmount: Math.round(totalAmount),
    creditedUsdt,
    telegramPaymentChargeId: String(
      payment.telegram_payment_charge_id || `xtr_${Date.now()}`
    ),
    invoicePayload: String(payment.invoice_payload || 'stars_topup'),
    payerTelegramId: Number(fromUser.id || 0),
    payerDisplayName: String(
      fromUser.first_name || fromUser.username || 'Telegram Stars User'
    ),
  };
}

// ============================================================================
// 4. LIVE CHANNEL & ADMIN NOTIFICATION BROADCASTER (WITH INLINE APPROVE/REJECT)
// ============================================================================

export type LiveBroadcastEventType =
  | 'DEPOSIT'
  | 'BIG_MULTIPLIER_WIN'
  | 'TICKET_PURCHASE'
  | 'DRAW_RESULT'
  | 'HIGH_VALUE_WITHDRAWAL'
  | 'TEST_PING';

export interface LiveBroadcastEventParams {
  eventType: LiveBroadcastEventType;
  chatId: string | number;
  appDomain: string;
  userDisplayName?: string;
  amountTon?: number;
  amountStars?: number;
  amountUsdt?: number;
  multiplierX?: number;
  gameTitle?: string;
  roundCode?: string;
  roundTitleFa?: string;
  ticketCount?: number;
  winningBalls?: number[];
  winningGoldenBall?: number;
  seedHash?: string;
  withdrawalCode?: string;
  destinationAddress?: string;
  detailsFa?: string;
}

export function buildLiveChannelBroadcastPayload(
  params: LiveBroadcastEventParams
): TelegramSendMessagePayload {
  const cleanDomain = (params.appDomain || 'https://luckydrop.com').replace(/\/+$/, '');
  const safeUser = (params.userDisplayName || 'بازیکن VIP').replace(/[<>&]/g, '');
  const tonStr =
    typeof params.amountTon === 'number'
      ? `${params.amountTon.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} TON`
      : `${((params.amountUsdt || 0) / 5.0).toFixed(2)} TON`;

  let header = '📣 <b>گزارش زنده شبکه LuckyDrop</b>';
  const lines: string[] = [];

  if (params.eventType === 'DEPOSIT') {
    header = '💎 <b>واریز آنی جدید در خزانه (TON / Stars)</b>';
    lines.push(`👤 <b>کاربر:</b> ${safeUser}`);
    lines.push(
      `💰 <b>مبلغ شارژ:</b> <code>${
        params.amountStars ? `${params.amountStars} ⭐` : tonStr
      }</code>`
    );
    if (params.detailsFa) lines.push(`📝 <b>وضعیت:</b> ${params.detailsFa}`);
  } else if (params.eventType === 'BIG_MULTIPLIER_WIN') {
    header = `🚀 <b>برد سنگین ضریب بالا (${(params.multiplierX || 10).toFixed(2)}x)!</b>`;
    lines.push(`👤 <b>برنده:</b> ${safeUser}`);
    lines.push(`🎮 <b>بازی:</b> ${params.gameTitle || 'Mini-Game 3D'}`);
    lines.push(`⚡ <b>ضریب برد:</b> <code>${(params.multiplierX || 10).toFixed(2)}x</code>`);
    lines.push(`💎 <b>مبلغ جایزه:</b> <code>+${tonStr}</code>`);
  } else if (params.eventType === 'TICKET_PURCHASE') {
    header = '🎟️ <b>ورود بلیت جدید به استخر قرعه‌کشی</b>';
    lines.push(`👤 <b>خریدار:</b> ${safeUser}`);
    lines.push(
      `🎰 <b>استخر:</b> ${params.roundTitleFa || params.roundCode || 'LuckyDrop'} (${
        params.ticketCount || 1
      } بلیت)`
    );
    lines.push(`💎 <b>افزایش استخر جایزه:</b> <code>+${tonStr}</code>`);
  } else if (params.eventType === 'DRAW_RESULT') {
    header = `🏆 <b>نتیجه رسمی قرعه‌کشی راس تایم (${params.roundCode || '#LDR'})</b>`;
    if (params.roundTitleFa) lines.push(`🎰 <b>دور:</b> ${params.roundTitleFa}`);
    if (params.winningBalls && params.winningBalls.length > 0) {
      const ballsStr = params.winningBalls.map((n) => String(n).padStart(2, '0')).join(' - ');
      const starStr =
        params.winningGoldenBall && params.winningGoldenBall > 0
          ? ` + ★${String(params.winningGoldenBall).padStart(2, '0')}`
          : '';
      lines.push(`🎱 <b>گوی‌های برنده:</b> <code>[${ballsStr}]${starStr}</code>`);
    }
    lines.push(`💎 <b>جایزه تقسیم‌شده استخر:</b> <code>${tonStr}</code>`);
    if (params.seedHash) {
      lines.push(`🔐 <b>هش تایید دوره:</b> <code>${params.seedHash.replace(/^0x/, '')}</code>`);
    }
  } else if (params.eventType === 'HIGH_VALUE_WITHDRAWAL') {
    header = '🛡️ <b>درخواست برداشت وجه — نیازمند تایید و تسویه ادمین</b>';
    lines.push(`🆔 <b>کد برداشت:</b> <code>${params.withdrawalCode || 'WD-000'}</code>`);
    lines.push(`👤 <b>کاربر:</b> ${safeUser}`);
    lines.push(
      `💎 <b>مبلغ خالص:</b> <code>${
        params.amountStars ? `${params.amountStars} ⭐` : tonStr
      }</code>`
    );
    if (params.destinationAddress) {
      lines.push(`📬 <b>مقصد:</b> <code>${params.destinationAddress}</code>`);
    }
  } else {
    header = '✅ <b>تست اتصال ربات و کانال نوتیفیکیشن LuckyDrop</b>';
    lines.push(`📡 اتصال سرور به API تلگرام و درگاه TON / Stars کاملاً برقرار است.`);
  }

  const text = `${header}\n\n${lines.join('\n')}`;

  // For Withdrawals, attach 1-Click Tonkeeper Payout URL + Approve / Reject inline callback buttons for the Admin!
  if (params.eventType === 'HIGH_VALUE_WITHDRAWAL' && params.withdrawalCode) {
    const netNanoTon = Math.max(
      10_000_000,
      Math.round(
        ((typeof params.amountTon === 'number'
          ? params.amountTon
          : (params.amountUsdt || 0) / 5.0) -
          0.02) *
          1e9
      )
    );
    const tonkeeperDeepLink =
      params.destinationAddress && !params.amountStars
        ? `https://app.tonkeeper.com/transfer/${encodeURIComponent(
            params.destinationAddress
          )}?amount=${netNanoTon}&text=${encodeURIComponent(
            `LuckyDrop_Payout_${params.withdrawalCode}`
          )}`
        : null;

    const keyboardRows: Array<
      Array<{
        text: string;
        web_app?: { url: string };
        url?: string;
        callback_data?: string;
      }>
    > = [];

    if (tonkeeperDeepLink) {
      keyboardRows.push([
        {
          text: `💎 پرداخت ۱-کلیکی با Tonkeeper (${params.withdrawalCode})`,
          url: tonkeeperDeepLink,
        },
      ]);
    }

    keyboardRows.push(
      [
        {
          text: `✅ تایید نهایی پرداخت (${params.withdrawalCode})`,
          callback_data: `approve_wd:${params.withdrawalCode}`,
        },
        {
          text: `❌ رد و برگشت وجه به کاربر`,
          callback_data: `reject_wd:${params.withdrawalCode}`,
        },
      ],
      [
        {
          text: '🔐 باز کردن پنل ادمین مینی‌اپ',
          web_app: { url: `${cleanDomain}/?vault=sovereign-gate-777` },
        },
      ]
    );

    return {
      chat_id: params.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: keyboardRows,
      },
    };
  }

  return {
    chat_id: params.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🎰 ورود به لاتاری و بازی‌ها (LuckyDrop)',
            web_app: { url: cleanDomain },
          },
        ],
      ],
    },
  };
}
