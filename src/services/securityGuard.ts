import crypto from 'node:crypto';
import {
  PAMSeamlessWalletEngine,
  type PAMPlayerState,
} from './pamWalletEngine.ts';
import {
  evaluateProvablyFairMiniGame,
  deriveProvablyFairLotteryDraw,
  generateCryptographicServerSeed,
  sha256Hex,
  type InstantMiniGameId,
  type MiniGameEvaluationResult,
  type PlinkoRowCount,
  type PlinkoRiskLevel,
  type TowerDifficulty,
} from '../utils/provablyFair.ts';

// ============================================================================
// 1. STRICT PER-USER ACCOUNT ISOLATION (ZERO PRE-POPULATED DEMO DATA)
// ============================================================================

export interface IsolatedUserAccountRecord {
  telegramUserId: string;
  displayName: string;
  username: string;
  vipTier: string;
  tonBalance: number;
  starsBalance: number;
  bonusTokens: number;
  xp: number;
  freePlinkoDrops: number;
  freeScratchCards: number;
  freeLotteryTickets: number;
  myTickets: string[];
  ledger: PAMPlayerState['ledger'];
  completedQuests: string[];
  referrals: string[];
  referredByUserId: string | null;
  referralCode: string;
  chestsClaimedCount: number;
  claimedTicketCodes: string[];
  lastDailyCheckInDate: string | null;
  connectedTonWallet: string;
  pamState: PAMPlayerState;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cleanly rounds TON amounts to 6 decimal places to eliminate IEEE-754 floating-point drift.
 */
export function roundTonClean(val: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 1_000_000) / 1_000_000;
}

/**
 * Cleanly rounds Telegram Stars amounts to whole integers.
 */
export function roundStarsClean(val: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Parses `start_param` (e.g. `ref_123456789` or `ref_LD-123456789`) into a normalized inviter ID.
 */
export function parseReferralStartParam(startParam: string | undefined | null): string | null {
  const raw = String(startParam || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^ref_/i, '')
    .replace(/^LD-/i, '')
    .replace(/^tg_/i, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned;
}

/**
 * Creates a 100% clean, zero-state user account profile partitioned strictly by `telegramUserId`.
 * Every new Telegram user starts with:
 * tonBalance: 0, starsBalance: 0, bonusTokens: 0, xp: 0,
 * myTickets: [], ledger: [], completedQuests: [], referrals: []
 */
export function createCleanZeroUserProfile(
  paramsOrId:
    | {
        telegramUserId: string | number;
        displayName?: string;
        username?: string;
        startParam?: string | null;
        existingUsers?: Record<string, IsolatedUserAccountRecord>;
      }
    | string
    | number,
  displayNameArg?: string,
  usernameArg?: string
): IsolatedUserAccountRecord {
  const params =
    typeof paramsOrId === 'object' && paramsOrId !== null
      ? paramsOrId
      : {
          telegramUserId: paramsOrId,
          displayName: displayNameArg,
          username: usernameArg,
        };

  const uid = String(params.telegramUserId || '').trim();
  if (!uid) {
    throw new Error('INVALID_TELEGRAM_USER_ID');
  }

  const displayName =
    (params.displayName || '').trim() || `کاربر #${uid.slice(-4)}`;
  const username = (params.username || '').trim() || `tg_${uid}`;
  const freshServerSeed = crypto.randomBytes(32).toString('hex');
  const freshClientSeed = `ld_client_${uid}_${crypto.randomInt(100000, 999999)}`;

  const pamEngine = new PAMSeamlessWalletEngine({
    playerId: `tg_${uid}`,
    displayName,
    vipTier: 'MEMBER',
    currency: 'TON',
    genesisTonBalance: 0,
    tonBalance: 0,
    genesisStarsBalance: 0,
    starsBalance: 0,
    referralEarningsTon: 0,
    referralEarningsStars: 0,
    bonusTokensTon: 0,
    seeds: {
      serverSeed: freshServerSeed,
      serverSeedHash: sha256Hex(freshServerSeed),
      clientSeed: freshClientSeed,
      nonce: 1,
    },
    ledger: [],
    tombstones: {},
  });

  let referredByUserId: string | null = null;
  const candidateInviter = parseReferralStartParam(params.startParam);
  if (
    candidateInviter &&
    candidateInviter !== uid &&
    candidateInviter !== `LD-${uid}` &&
    candidateInviter !== `ref_${uid}`
  ) {
    // Prevent circular 2-hop referral if existingUsers map is provided
    const inviterAccount = params.existingUsers?.[candidateInviter];
    if (!inviterAccount || inviterAccount.referredByUserId !== uid) {
      referredByUserId = candidateInviter;
      if (inviterAccount && !inviterAccount.referrals.includes(uid)) {
        inviterAccount.referrals.push(uid);
      }
    }
  }

  const nowIso = new Date().toISOString();
  const pamState = pamEngine.getState();

  return {
    telegramUserId: uid,
    displayName,
    username,
    vipTier: 'MEMBER',
    tonBalance: 0,
    starsBalance: 0,
    bonusTokens: 0,
    xp: 0,
    freePlinkoDrops: 0,
    freeScratchCards: 0,
    freeLotteryTickets: 0,
    myTickets: [],
    ledger: pamState.ledger,
    completedQuests: [],
    referrals: [],
    referredByUserId,
    referralCode: `ref_${uid}`,
    chestsClaimedCount: 0,
    claimedTicketCodes: [],
    lastDailyCheckInDate: null,
    connectedTonWallet: '',
    pamState,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Enforces Anti-Sybil Referral binding rules:
 * - Blocks self-referrals (inviterId === userId)
 * - Blocks overwriting an existing referrer (a user can only be referred once)
 * - Blocks circular referrals (A -> B -> A)
 */
export function bindUserReferralAntiSybil(params: {
  userAccount?: IsolatedUserAccountRecord;
  userId?: string;
  rawReferralInput?: string;
  startParam?: string;
  usersMap: Record<string, IsolatedUserAccountRecord>;
}): {
  ok: boolean;
  bound: boolean;
  status: number;
  reason?: string;
  error?: string;
  inviterUserId?: string;
  inviterId?: string;
} {
  const { usersMap } = params;
  const userAccount =
    params.userAccount || (params.userId ? usersMap[String(params.userId)] : undefined);
  const rawReferralInput = String(params.rawReferralInput ?? params.startParam ?? '').trim();

  if (!userAccount) {
    return {
      ok: false,
      bound: false,
      status: 400,
      reason: 'USER_NOT_FOUND',
      error: 'USER_NOT_FOUND — حساب کاربری یافت نشد.',
    };
  }

  const inviterId = parseReferralStartParam(rawReferralInput);
  if (!inviterId) {
    return {
      ok: false,
      bound: false,
      status: 400,
      reason: 'INVALID_REFERRAL_CODE',
      error: 'INVALID_REFERRAL_CODE — کد معرف نامعتبر است.',
    };
  }

  if (
    inviterId === userAccount.telegramUserId ||
    rawReferralInput.toUpperCase() === userAccount.referralCode.toUpperCase() ||
    rawReferralInput.toUpperCase() === `LD-${userAccount.telegramUserId}`.toUpperCase()
  ) {
    return {
      ok: false,
      bound: false,
      status: 400,
      reason: 'SELF_REFERRAL_FORBIDDEN',
      error: 'SELF_REFERRAL_FORBIDDEN — قفل ضدتقلب (Anti-Sybil): امکان ثبت کد دعوت خودتان وجود ندارد.',
    };
  }

  if (userAccount.referredByUserId) {
    return {
      ok: false,
      bound: false,
      status: 409,
      reason: 'ALREADY_REFERRED_IMMUTABLE',
      error: 'ALREADY_REFERRED — هر کاربر تنها یک بار در زمان ساخت حساب می‌تواند معرف ثبت کند.',
    };
  }

  const inviterRecord = usersMap[inviterId];
  if (inviterRecord && inviterRecord.referredByUserId === userAccount.telegramUserId) {
    return {
      ok: false,
      bound: false,
      status: 400,
      reason: 'CIRCULAR_REFERRAL_FORBIDDEN',
      error: 'CIRCULAR_REFERRAL_FORBIDDEN — ثبت معرف چرخشی مجاز نیست.',
    };
  }

  userAccount.referredByUserId = inviterId;
  if (inviterRecord && !inviterRecord.referrals.includes(userAccount.telegramUserId)) {
    inviterRecord.referrals.push(userAccount.telegramUserId);
  }

  return {
    ok: true,
    bound: true,
    status: 200,
    inviterUserId: inviterId,
    inviterId,
  };
}

// ============================================================================
// 2. ANTI-HACK FINANCIAL GUARDS (MUTEX LOCK, NUMERIC VALIDATION, REPLAY GUARD)
// ============================================================================

/**
 * Per-User Atomic Mutex Lock (`userLocks.get(telegramUserId)`).
 * Serializes concurrent rapid financial requests from the same Telegram user
 * so race-condition / double-spend attacks can never overdraw balances.
 */
export class PerUserMutexRegistry {
  private readonly userLocks = new Map<string, Promise<void>>();

  public get(telegramUserId: string | number): Promise<void> | undefined {
    return this.userLocks.get(String(telegramUserId));
  }

  public isLocked(telegramUserId: string | number): boolean {
    return this.userLocks.has(String(telegramUserId));
  }

  public async runExclusive<T>(
    telegramUserId: string | number,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const key = String(telegramUserId || 'anonymous').trim() || 'anonymous';
    const previousLock = this.userLocks.get(key) ?? Promise.resolve();

    let releaseCurrent!: () => void;
    const currentGate = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });

    const chainedLock = previousLock.then(() => currentGate);
    this.userLocks.set(key, chainedLock);

    await previousLock;
    try {
      return await operation();
    } finally {
      releaseCurrent();
      if (this.userLocks.get(key) === chainedLock) {
        this.userLocks.delete(key);
      }
    }
  }
}

export const globalUserLocks = new PerUserMutexRegistry();

export interface StrictAmountValidationResult {
  ok: boolean;
  valid: boolean;
  cleanAmount: number;
  roundedAmount: number;
  error?: string;
}

/**
 * Strict Numeric Validation for financial wagers, deposits, and withdrawals:
 * Rejects NaN, !Number.isFinite(), <= 0, negative numbers, or amounts exceeding maxBalance.
 */
export function validateStrictFinancialAmount(
  paramsOrRawAmount:
    | {
        rawAmount: unknown;
        currency?: 'TON' | 'STARS' | 'USDT';
        minAmount?: number;
        maxBalance?: number;
        allowZero?: boolean;
        label?: string;
      }
    | unknown,
  optionsArg?: {
    currency?: 'TON' | 'STARS' | 'USDT';
    min?: number;
    minAmount?: number;
    maxBalance?: number;
    allowZero?: boolean;
    label?: string;
  }
): StrictAmountValidationResult {
  const isConfigObject =
    typeof paramsOrRawAmount === 'object' &&
    paramsOrRawAmount !== null &&
    'rawAmount' in paramsOrRawAmount &&
    optionsArg === undefined;

  const rawAmount = isConfigObject ? (paramsOrRawAmount as any).rawAmount : paramsOrRawAmount;
  const currency: 'TON' | 'STARS' | 'USDT' = isConfigObject
    ? (paramsOrRawAmount as any).currency || 'TON'
    : optionsArg?.currency || 'TON';
  const minAmount: number | undefined = isConfigObject
    ? (paramsOrRawAmount as any).minAmount
    : optionsArg?.minAmount ?? optionsArg?.min;
  const maxBalance: number | undefined = isConfigObject
    ? (paramsOrRawAmount as any).maxBalance
    : optionsArg?.maxBalance;
  const allowZero: boolean = isConfigObject
    ? Boolean((paramsOrRawAmount as any).allowZero)
    : Boolean(optionsArg?.allowZero);

  if (
    rawAmount === null ||
    rawAmount === undefined ||
    rawAmount === '' ||
    typeof rawAmount === 'boolean' ||
    typeof rawAmount === 'object'
  ) {
    return {
      ok: false,
      valid: false,
      cleanAmount: 0,
      roundedAmount: 0,
      error: 'INVALID_NUMERIC_TYPE — مقدار واردشده عدد معتبر نیست.',
    };
  }

  const parsed = Number(rawAmount);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return {
      ok: false,
      valid: false,
      cleanAmount: 0,
      roundedAmount: 0,
      error: 'NON_FINITE_AMOUNT — مقدار تراکنش باید یک عدد متناهی معتبر باشد.',
    };
  }

  if (allowZero && parsed === 0) {
    return {
      ok: true,
      valid: true,
      cleanAmount: 0,
      roundedAmount: 0,
    };
  }

  if (parsed <= 0) {
    return {
      ok: false,
      valid: false,
      cleanAmount: 0,
      roundedAmount: 0,
      error: 'NON_POSITIVE_AMOUNT — مقدار شرط یا تراکنش باید بزرگ‌تر از صفر باشد.',
    };
  }

  const roundedAmount =
    currency === 'STARS' ? roundStarsClean(parsed) : roundTonClean(parsed);

  if (roundedAmount <= 0) {
    return {
      ok: false,
      valid: false,
      cleanAmount: 0,
      roundedAmount: 0,
      error: 'DUST_AMOUNT_REJECTED — مقدار واردشده پس از گرد کردن صفر است.',
    };
  }

  if (typeof minAmount === 'number' && roundedAmount < minAmount) {
    return {
      ok: false,
      valid: false,
      cleanAmount: roundedAmount,
      roundedAmount,
      error: `BELOW_MINIMUM_AMOUNT — حداقل مقدار مجاز ${minAmount} ${currency} است.`,
    };
  }

  if (typeof maxBalance === 'number') {
    const cleanMax =
      currency === 'STARS'
        ? roundStarsClean(maxBalance)
        : roundTonClean(maxBalance);
    if (roundedAmount > cleanMax) {
      return {
        ok: false,
        valid: false,
        cleanAmount: roundedAmount,
        roundedAmount,
        error: `INSUFFICIENT_VERIFIED_BALANCE — موجودی تاییدشده سرور (${cleanMax} ${currency}) برای این تراکنش (${roundedAmount} ${currency}) کافی نیست.`,
      };
    }
  }

  return {
    ok: true,
    valid: true,
    cleanAmount: roundedAmount,
    roundedAmount,
  };
}

/**
 * Persistent Anti-Replay Deposit Idempotency Guard.
 * Tracks every processed TON txHash / BOC hash and Telegram Stars `telegram_payment_charge_id`
 * and rejects any duplicate submission with HTTP 409 Conflict.
 */
export function verifyAndRecordDepositIdempotency(params: {
  txIdentifier?: string;
  txHashOrChargeId?: string;
  txHash?: string;
  chargeId?: string;
  processedSet?: Set<string>;
  persistedList?: string[];
  processedTxHashes?: string[];
  processedStarsChargeIds?: string[];
}): {
  ok: boolean;
  allowed: boolean;
  status: 200 | 400 | 409;
  normalizedHash: string;
  normalizedKey: string;
  error?: string;
} {
  const rawId =
    params.txIdentifier || params.txHashOrChargeId || params.txHash || params.chargeId || '';
  const clean = String(rawId).trim();
  if (!clean || clean.length < 4) {
    return {
      ok: false,
      allowed: false,
      status: 400,
      normalizedHash: '',
      normalizedKey: '',
      error: 'MISSING_TRANSACTION_HASH — شناسه تراکنش یا BOC معتبر ارسال نشده است.',
    };
  }

  const targetList = params.chargeId
    ? params.processedStarsChargeIds || params.persistedList || []
    : params.processedTxHashes || params.persistedList || [];

  if (params.processedSet?.has(clean) || targetList.includes(clean)) {
    return {
      ok: false,
      allowed: false,
      status: 409,
      normalizedHash: clean,
      normalizedKey: clean,
      error: '409 Conflict — DUPLICATE_DEPOSIT_REPLAY: این تراکنش قبلاً پردازش و شارژ شده است.',
    };
  }

  params.processedSet?.add(clean);
  targetList.push(clean);
  return {
    ok: true,
    allowed: true,
    status: 200,
    normalizedHash: clean,
    normalizedKey: clean,
  };
}

// ============================================================================
// 3. 100% SERVER-AUTHORITATIVE GAME RNG (NODE CRYPTO HMAC-SHA256 + RANDOMINT)
// ============================================================================

export interface ServerAuthoritativeGameInput {
  gameId: InstantMiniGameId;
  betAmountUsdt: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  rawClientPayload?: Record<string, any>;
  // Allowed player configuration inputs (NEVER outcomes or multipliers!)
  diceTarget?: number;
  diceRollUnder?: number;
  diceMode?: 'OVER' | 'UNDER';
  coinSide?: 'HEADS' | 'TAILS';
  crashAutoCashoutX?: number;
  plinkoRows?: PlinkoRowCount;
  plinkoRisk?: PlinkoRiskLevel;
  minesCount?: number;
  minesRevealedSafeCount?: number;
  towerDifficulty?: TowerDifficulty;
  towerFloorsCleared?: number;
  wheelRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  // Any spoofed client outcome fields passed in rawBody will be ignored
  [key: string]: unknown;
}

/**
 * Computes game outcomes exclusively on the backend using Node's `crypto.createHmac('sha256', serverSeed)`
 * and `crypto.randomInt`. Explicitly strips and ignores any client-supplied `won`, `multiplier`,
 * `payoutUsdt`, `minesHitBomb`, `towerHitTrap`, or `hiloWon` fields.
 */
export function computeServerAuthoritativeGameOutcome(
  input: ServerAuthoritativeGameInput
): MiniGameEvaluationResult & {
  evaluation: MiniGameEvaluationResult;
  serverHmacVerified: string;
} {
  const cleanServerSeed =
    (input.serverSeed || '').trim() || crypto.randomBytes(32).toString('hex');
  const cleanClientSeed =
    (input.clientSeed || '').trim() || `ld_client_${crypto.randomInt(100000, 999999)}`;
  const safeNonce = Math.max(1, Math.floor(Number(input.nonce) || 1));
  const raw = input.rawClientPayload || input;

  // Compute primary Node.js native HMAC-SHA256 signature for cryptographic audit trail
  const serverHmacVerified = crypto
    .createHmac('sha256', cleanServerSeed)
    .update(`${cleanClientSeed}:${safeNonce}:${input.gameId}`)
    .digest('hex');

  const evaluation = evaluateProvablyFairMiniGame({
    gameId: input.gameId,
    serverSeed: cleanServerSeed,
    clientSeed: cleanClientSeed,
    nonce: safeNonce,
    betAmountUsdt: input.betAmountUsdt,
    diceRollUnder: typeof raw.diceRollUnder === 'number' ? raw.diceRollUnder : undefined,
    diceTarget: typeof raw.diceTarget === 'number' ? raw.diceTarget : undefined,
    diceMode: raw.diceMode === 'OVER' ? 'OVER' : 'UNDER',
    coinSide: raw.coinSide === 'TAILS' ? 'TAILS' : 'HEADS',
    crashAutoCashoutX:
      typeof raw.crashAutoCashoutX === 'number' ? raw.crashAutoCashoutX : 2.0,
    plinkoRows:
      raw.plinkoRows === 8 || raw.plinkoRows === 12 || raw.plinkoRows === 16
        ? raw.plinkoRows
        : 16,
    plinkoRisk:
      raw.plinkoRisk === 'LOW' || raw.plinkoRisk === 'MEDIUM' || raw.plinkoRisk === 'HIGH'
        ? raw.plinkoRisk
        : 'MEDIUM',
    minesCount: typeof raw.minesCount === 'number' ? raw.minesCount : 3,
    minesRevealedSafeCount:
      typeof raw.minesRevealedSafeCount === 'number' ? raw.minesRevealedSafeCount : 1,
    towerDifficulty:
      raw.towerDifficulty === 'EASY' || raw.towerDifficulty === 'HARD'
        ? raw.towerDifficulty
        : 'MEDIUM',
    towerFloorsCleared:
      typeof raw.towerFloorsCleared === 'number' ? raw.towerFloorsCleared : 1,
    wheelRisk:
      raw.wheelRisk === 'LOW' || raw.wheelRisk === 'HIGH' ? raw.wheelRisk : 'MEDIUM',
  });

  return {
    ...evaluation,
    evaluation,
    serverHmacVerified,
  };
}

/**
 * Computes server-authoritative lottery draw numbers exclusively using Node's `crypto.createHmac('sha256', serverSeed)`
 * and `crypto.randomInt` entropy when rotating seeds.
 */
export function computeServerAuthoritativeLotteryDraw(params: {
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
  roundCode: string;
  mainCount?: number;
  mainMax?: number;
  goldenMax?: number;
}) {
  const effectiveServerSeed =
    (params.serverSeed || '').trim() ||
    crypto
      .createHmac('sha256', crypto.randomBytes(32))
      .update(`${params.roundCode}:${crypto.randomInt(1000000, 9999999)}`)
      .digest('hex');

  return deriveProvablyFairLotteryDraw({
    serverSeed: effectiveServerSeed,
    clientSeed: params.clientSeed,
    nonce: params.nonce,
    roundCode: params.roundCode,
    mainCount: params.mainCount ?? 5,
    mainMax: params.mainMax ?? 50,
    goldenMax: params.goldenMax ?? 15,
  });
}

// ============================================================================
// 4. API SLIDING-WINDOW RATE LIMITER (PER IP & PER TELEGRAM USER ID)
// ============================================================================

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options?: { windowMs?: number; maxRequests?: number }) {
    this.windowMs = options?.windowMs ?? 10_000; // 10 seconds default window
    this.maxRequests = options?.maxRequests ?? 25; // max 25 mutations per 10s per key
  }

  public check(key: string, nowMs: number = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSec: number;
    retryAfterMs: number;
  } {
    const cleanKey = (key || 'anon').trim();
    const cutoff = nowMs - this.windowMs;
    const prev = this.hits.get(cleanKey) || [];
    const active = prev.filter((ts) => ts > cutoff);

    if (active.length >= this.maxRequests) {
      const oldest = active[0] || nowMs;
      const retryAfterMs = Math.max(1000, oldest + this.windowMs - nowMs);
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      this.hits.set(cleanKey, active);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec,
        retryAfterMs,
      };
    }

    active.push(nowMs);
    this.hits.set(cleanKey, active);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterSec: 0,
      retryAfterMs: 0,
    };
  }

  public reset(): void {
    this.hits.clear();
  }
}

export const globalMutationRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 10_000,
  maxRequests: 30,
});
