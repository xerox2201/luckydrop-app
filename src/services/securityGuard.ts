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

export interface ActiveGameSessionState {
  sessionId: string;
  gameId: 'MINES' | 'TOWER_3D';
  currency: 'TON' | 'STARS';
  betAmountUsdt: number;
  debitTransactionUuid: string;
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  minesCount?: number;
  mineIndices?: number[];
  revealedTiles?: number[];
  towerDifficulty?: TowerDifficulty;
  trapColumnsPerFloor?: number[];
  colsCount?: number;
  selectedColumns?: number[];
  startedAt: string;
}

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
  isBanned?: boolean;
  banReason?: string;
  activeGameSession?: ActiveGameSessionState | null;
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
    isBanned: false,
    banReason: '',
    activeGameSession: null,
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
  selectedTiles?: number[];
  towerDifficulty?: TowerDifficulty;
  towerFloorsCleared?: number;
  selectedColumns?: number[];
  wheelRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  hiloChoice?: 'HIGHER' | 'LOWER' | 'SAME';
  hiloBaseCard?: number;
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
    selectedTiles: Array.isArray(raw.selectedTiles)
      ? raw.selectedTiles.map(Number)
      : undefined,
    towerDifficulty:
      raw.towerDifficulty === 'EASY' || raw.towerDifficulty === 'HARD'
        ? raw.towerDifficulty
        : 'MEDIUM',
    towerFloorsCleared:
      typeof raw.towerFloorsCleared === 'number' ? raw.towerFloorsCleared : 1,
    selectedColumns: Array.isArray(raw.selectedColumns)
      ? raw.selectedColumns.map(Number)
      : undefined,
    wheelRisk:
      raw.wheelRisk === 'LOW' || raw.wheelRisk === 'HIGH' ? raw.wheelRisk : 'MEDIUM',
    hiloChoice:
      raw.hiloChoice === 'LOWER' || raw.hiloChoice === 'SAME'
        ? raw.hiloChoice
        : 'HIGHER',
    hiloBaseCard: typeof raw.hiloBaseCard === 'number' ? raw.hiloBaseCard : undefined,
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

// ============================================================================
// 5. ON-CHAIN TON BOC & TRANSACTION VERIFIER (TONAPI + TON CENTER + BOC CELL)
// ============================================================================

/**
 * Computes CRC16-CCITT (XMODEM, poly 0x1021) used by TON user-friendly addresses (EQ... / UQ...).
 */
export function crc16Ton(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

/**
 * Normalizes any TON address (`UQ...`, `EQ...`, `kQ...`, `0Q...`, or raw `0:<64-hex>`)
 * into its canonical `<workchain>:<64-lowercase-hex>` representation and verifies CRC16 checksums.
 * Returns `null` if the address is malformed or fails CRC16 verification.
 */
export function normalizeTonAddressToRaw(address: string): string | null {
  const clean = String(address || '').trim();
  if (!clean) return null;

  // Case 1: Raw format "<workchain>:<64-hex>"
  const rawMatch = /^(-?\d+):([0-9a-fA-F]{64})$/.exec(clean);
  if (rawMatch) {
    return `${Number(rawMatch[1])}:${rawMatch[2].toLowerCase()}`;
  }

  // Case 2: 48-character user-friendly base64 / base64url format (EQ..., UQ..., kQ..., 0Q...)
  if (/^[A-Za-z0-9+/_-]{48}$/.test(clean)) {
    try {
      const stdBase64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      const buf = Buffer.from(stdBase64, 'base64');
      if (buf.length !== 36) return null;

      const tag = buf[0];
      // Valid TON address tags: 0x11 (EQ), 0x51 (UQ), 0x91 (kQ testnet), 0xd1 (0Q testnet)
      if (tag !== 0x11 && tag !== 0x51 && tag !== 0x91 && tag !== 0xd1) {
        return null;
      }

      const expectedCrc = crc16Ton(buf.subarray(0, 34));
      const actualCrc = (buf[34] << 8) | buf[35];
      if (expectedCrc !== actualCrc) {
        return null;
      }

      const workchain = buf.readInt8(1);
      const accountHex = buf.subarray(2, 34).toString('hex').toLowerCase();
      return `${workchain}:${accountHex}`;
    } catch {
      return null;
    }
  }

  return null;
}

export interface ParsedTonBocResult {
  valid: boolean;
  bocHashHex: string;
  cellCount: number;
  rootCount: number;
  byteLength: number;
  error?: string;
}

/**
 * Validates binary TON Bag-of-Cells (BOC) structure (magic prefix `0xb5ee9c72`).
 * Rejects arbitrary/fake strings that are not authentic TON BOC cells.
 */
export function parseAndValidateTonBoc(bocInput: string): ParsedTonBocResult {
  const clean = String(bocInput || '').trim();
  if (!clean || clean.length < 16) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: 0,
      error: 'BOC_TOO_SHORT — داده BOC ارسال‌شده کوتاه‌تر از حد مجاز است.',
    };
  }

  // Reject strings with characters outside base64/base64url/hex
  if (!/^[A-Za-z0-9+/=_-]+$/.test(clean)) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: 0,
      error: 'INVALID_BOC_ENCODING — فرمت Base64 بسته BOC نامعتبر است.',
    };
  }

  let buf: Buffer;
  try {
    const isHex = /^(0x)?[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0 && clean.toLowerCase().startsWith('b5ee9c72');
    if (isHex) {
      buf = Buffer.from(clean.replace(/^0x/i, ''), 'hex');
    } else {
      const normalizedB64 = clean.replace(/-/g, '+').replace(/_/g, '/');
      buf = Buffer.from(normalizedB64, 'base64');
    }
  } catch {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: 0,
      error: 'BOC_DECODE_FAILED — رمزگشایی بسته BOC ناموفق بود.',
    };
  }

  // Standard serialized TON BOC magic prefix: 0xb5ee9c72 (4 bytes) + at least 6 bytes header + cell payload
  if (
    buf.length < 12 ||
    buf[0] !== 0xb5 ||
    buf[1] !== 0xee ||
    buf[2] !== 0x9c ||
    buf[3] !== 0x72
  ) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: buf.length,
      error: 'INVALID_BOC_MAGIC — هدر باینری BOC (0xb5ee9c72) معتبر نیست.',
    };
  }

  const flagsAndSize = buf[4];
  const sizeBytes = flagsAndSize & 0x07;
  const offBytes = buf[5];
  if (sizeBytes < 1 || sizeBytes > 4 || offBytes < 1 || offBytes > 8) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: buf.length,
      error: 'INVALID_BOC_HEADER_PARAMS — پارامترهای سلول BOC نامعتبر است.',
    };
  }

  const minHeaderLen = 6 + 3 * sizeBytes + offBytes;
  if (buf.length < minHeaderLen) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount: 0,
      rootCount: 0,
      byteLength: buf.length,
      error: 'TRUNCATED_BOC_CELL — ساختار سلول BOC ناقص است.',
    };
  }

  const cellCount = buf.readUIntBE(6, sizeBytes);
  const rootCount = buf.readUIntBE(6 + sizeBytes, sizeBytes);
  if (cellCount < 1 || rootCount < 1 || rootCount > cellCount) {
    return {
      valid: false,
      bocHashHex: '',
      cellCount,
      rootCount,
      byteLength: buf.length,
      error: 'INVALID_BOC_CELL_COUNTS — تعداد سلول‌های ریشه BOC نامعتبر است.',
    };
  }

  const bocHashHex = crypto.createHash('sha256').update(buf).digest('hex');
  return {
    valid: true,
    bocHashHex,
    cellCount,
    rootCount,
    byteLength: buf.length,
  };
}

export interface OnChainTonVerificationResult {
  verified: boolean;
  status: 200 | 400 | 422 | 502;
  onChainTxHash: string;
  verifiedNanoTon: string;
  verifiedAmountTon: number;
  destinationAddress: string;
  senderAddress: string;
  provider: 'TONAPI' | 'TONCENTER' | 'NONE';
  error?: string;
}

/**
 * Verifies a TON deposit transaction on-chain via TonAPI (`tonapi.io`) and TON Center (`toncenter.com`).
 * Strictly enforces:
 * 1. Valid 64-char hex transaction hash OR structurally valid TON BOC cell (`0xb5ee9c72`) broadcast/confirmed on-chain.
 * 2. On-chain transaction `success === true` and `aborted === false`.
 * 3. On-chain destination address strictly matches `expectedDestinationWallet` (`PUBLIC_TON_TREASURY_WALLET`).
 * 4. On-chain transferred value in nanoTON is `>= expectedNanoTon` (`Math.round(expectedAmountTon * 1e9)`).
 */
export async function verifyOnChainTonTransaction(params: {
  bocOrTxHash?: string;
  boc?: string;
  txHash?: string;
  expectedDestinationWallet: string;
  expectedAmountTon: number;
  senderWallet?: string;
  tonApiKey?: string;
  toncenterApiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<OnChainTonVerificationResult> {
  const fetchFn = params.fetchImpl || fetch;
  const cleanInput = String(params.bocOrTxHash || params.boc || params.txHash || '').trim();
  const expectedTreasuryRaw = normalizeTonAddressToRaw(params.expectedDestinationWallet);

  if (!expectedTreasuryRaw) {
    return {
      verified: false,
      status: 400,
      onChainTxHash: '',
      verifiedNanoTon: '0',
      verifiedAmountTon: 0,
      destinationAddress: params.expectedDestinationWallet,
      senderAddress: params.senderWallet || '',
      provider: 'NONE',
      error:
        'INVALID_TREASURY_WALLET_CONFIG — آدرس خزانه مقصد (PUBLIC_TON_TREASURY_WALLET) در سرور معتبر نیست.',
    };
  }

  const amountCheck = validateStrictFinancialAmount({
    rawAmount: params.expectedAmountTon,
    currency: 'TON',
    minAmount: 0.01,
  });
  if (!amountCheck.valid) {
    return {
      verified: false,
      status: 400,
      onChainTxHash: '',
      verifiedNanoTon: '0',
      verifiedAmountTon: 0,
      destinationAddress: params.expectedDestinationWallet,
      senderAddress: params.senderWallet || '',
      provider: 'NONE',
      error: amountCheck.error,
    };
  }

  const expectedNanoTon = BigInt(Math.round(amountCheck.roundedAmount * 1e9));
  const isHexTxHash = /^(0x)?[0-9a-fA-F]{64}$/.test(cleanInput);
  let candidateTxHash = isHexTxHash ? cleanInput.replace(/^0x/i, '').toLowerCase() : '';

  if (!isHexTxHash) {
    const bocValidation = parseAndValidateTonBoc(cleanInput);
    if (!bocValidation.valid) {
      return {
        verified: false,
        status: 400,
        onChainTxHash: '',
        verifiedNanoTon: '0',
        verifiedAmountTon: 0,
        destinationAddress: params.expectedDestinationWallet,
        senderAddress: params.senderWallet || '',
        provider: 'NONE',
        error:
          bocValidation.error ||
          'INVALID_TON_BOC_OR_TXHASH — تراکنش ارسالی یک BOC معتبر یا هش تراکنش ۶۴ کاراکتری شبکه TON نیست.',
      };
    }

    // Broadcast signed BOC via TON Center `sendBocReturnHash` to obtain/verify its on-chain hash
    try {
      const tcHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (params.toncenterApiKey) {
        tcHeaders['X-API-Key'] = params.toncenterApiKey;
      }
      const sendRes = await fetchFn('https://toncenter.com/api/v2/sendBocReturnHash', {
        method: 'POST',
        headers: tcHeaders,
        body: JSON.stringify({ boc: cleanInput }),
      });
      if (sendRes.ok) {
        const sendData: any = await sendRes.json();
        const rawHash = String(sendData?.result?.hash || '').trim();
        if (rawHash) {
          candidateTxHash = /^[0-9a-fA-F]{64}$/.test(rawHash)
            ? rawHash.toLowerCase()
            : Buffer.from(rawHash, 'base64').toString('hex').toLowerCase();
        }
      }
    } catch {
      // Proceed to direct transaction lookup on TonAPI / TON Center
    }

    if (!candidateTxHash) {
      candidateTxHash = bocValidation.bocHashHex;
    }
  }

  const tonApiHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (params.tonApiKey) {
    tonApiHeaders['Authorization'] = `Bearer ${params.tonApiKey}`;
  }

  // Step 1: Query TonAPI for the specific transaction hash
  try {
    const txRes = await fetchFn(
      `https://tonapi.io/v2/blockchain/transactions/${encodeURIComponent(candidateTxHash)}`,
      { headers: tonApiHeaders }
    );
    if (txRes.ok) {
      const txData: any = await txRes.json();
      const txSuccess = txData?.success !== false && txData?.aborted !== true;
      if (!txSuccess) {
        return {
          verified: false,
          status: 422,
          onChainTxHash: candidateTxHash,
          verifiedNanoTon: '0',
          verifiedAmountTon: 0,
          destinationAddress: params.expectedDestinationWallet,
          senderAddress: params.senderWallet || '',
          provider: 'TONAPI',
          error: 'ONCHAIN_TX_ABORTED — تراکنش در بلاکچین TON ناموفق (Aborted) بوده است.',
        };
      }

      // Inspect in_msg and out_msgs for a transfer into expectedTreasuryRaw
      const candidateMessages: Array<{ dest: string; source: string; valueNano: bigint }> = [];
      if (txData?.in_msg?.destination) {
        const destAddr =
          typeof txData.in_msg.destination === 'string'
            ? txData.in_msg.destination
            : txData.in_msg.destination?.address || '';
        const srcAddr =
          typeof txData.in_msg.source === 'string'
            ? txData.in_msg.source
            : txData.in_msg.source?.address || '';
        const val = BigInt(String(txData.in_msg.value ?? '0'));
        candidateMessages.push({ dest: destAddr, source: srcAddr, valueNano: val });
      }
      if (Array.isArray(txData?.out_msgs)) {
        for (const msg of txData.out_msgs) {
          const destAddr =
            typeof msg?.destination === 'string'
              ? msg.destination
              : msg?.destination?.address || '';
          const srcAddr =
            typeof msg?.source === 'string' ? msg.source : msg?.source?.address || '';
          const val = BigInt(String(msg?.value ?? '0'));
          candidateMessages.push({ dest: destAddr, source: srcAddr, valueNano: val });
        }
      }

      const matchingTransfer = candidateMessages.find(
        (m) => normalizeTonAddressToRaw(m.dest) === expectedTreasuryRaw
      );

      if (!matchingTransfer) {
        return {
          verified: false,
          status: 400,
          onChainTxHash: candidateTxHash,
          verifiedNanoTon: '0',
          verifiedAmountTon: 0,
          destinationAddress: params.expectedDestinationWallet,
          senderAddress: params.senderWallet || '',
          provider: 'TONAPI',
          error:
            'DESTINATION_ADDRESS_MISMATCH — آدرس مقصد تراکنش در بلاکچین با آدرس خزانه رسمی سایت (PUBLIC_TON_TREASURY_WALLET) مطابقت ندارد.',
        };
      }

      if (matchingTransfer.valueNano < expectedNanoTon) {
        return {
          verified: false,
          status: 400,
          onChainTxHash: candidateTxHash,
          verifiedNanoTon: matchingTransfer.valueNano.toString(),
          verifiedAmountTon: Number(matchingTransfer.valueNano) / 1e9,
          destinationAddress: params.expectedDestinationWallet,
          senderAddress: matchingTransfer.source || params.senderWallet || '',
          provider: 'TONAPI',
          error: `NANOTON_AMOUNT_MISMATCH — مبلغ واقعی تراکنش در بلاکچین (${(
            Number(matchingTransfer.valueNano) / 1e9
          ).toFixed(4)} TON) کمتر از مبلغ ادعاشده (${amountCheck.roundedAmount} TON) است.`,
        };
      }

      const canonicalHash = String(txData?.hash || candidateTxHash)
        .replace(/^0x/i, '')
        .toLowerCase();

      return {
        verified: true,
        status: 200,
        onChainTxHash: `0x${canonicalHash}`,
        verifiedNanoTon: matchingTransfer.valueNano.toString(),
        verifiedAmountTon: roundTonClean(Number(matchingTransfer.valueNano) / 1e9),
        destinationAddress: params.expectedDestinationWallet,
        senderAddress: matchingTransfer.source || params.senderWallet || '',
        provider: 'TONAPI',
      };
    }
  } catch {
    // Fall through to TON Center v2 verification
  }

  // Step 2: Query TON Center v2 for transactions on the treasury address matching hash + nanoTON
  try {
    const tcHeaders: Record<string, string> = { Accept: 'application/json' };
    if (params.toncenterApiKey) {
      tcHeaders['X-API-Key'] = params.toncenterApiKey;
    }
    const tcUrl = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(
      params.expectedDestinationWallet
    )}&limit=25`;
    const tcRes = await fetchFn(tcUrl, { headers: tcHeaders });
    if (tcRes.ok) {
      const tcData: any = await tcRes.json();
      const txList: any[] = Array.isArray(tcData?.result) ? tcData.result : [];
      for (const tx of txList) {
        const rawB64Hash = String(tx?.transaction_id?.hash || '').trim();
        const txHexHash = rawB64Hash
          ? /^[0-9a-fA-F]{64}$/.test(rawB64Hash)
            ? rawB64Hash.toLowerCase()
            : Buffer.from(rawB64Hash, 'base64').toString('hex').toLowerCase()
          : '';

        if (txHexHash && txHexHash === candidateTxHash) {
          const inMsg = tx?.in_msg || {};
          const destRaw = normalizeTonAddressToRaw(String(inMsg.destination || ''));
          const valNano = BigInt(String(inMsg.value ?? '0'));

          if (destRaw !== expectedTreasuryRaw) {
            return {
              verified: false,
              status: 400,
              onChainTxHash: txHexHash,
              verifiedNanoTon: valNano.toString(),
              verifiedAmountTon: Number(valNano) / 1e9,
              destinationAddress: params.expectedDestinationWallet,
              senderAddress: String(inMsg.source || params.senderWallet || ''),
              provider: 'TONCENTER',
              error:
                'DESTINATION_ADDRESS_MISMATCH — آدرس مقصد تراکنش در TON Center با خزانه سایت مطابقت ندارد.',
            };
          }

          if (valNano < expectedNanoTon) {
            return {
              verified: false,
              status: 400,
              onChainTxHash: txHexHash,
              verifiedNanoTon: valNano.toString(),
              verifiedAmountTon: Number(valNano) / 1e9,
              destinationAddress: params.expectedDestinationWallet,
              senderAddress: String(inMsg.source || params.senderWallet || ''),
              provider: 'TONCENTER',
              error: `NANOTON_AMOUNT_MISMATCH — مقدار nanoTON تراکنش در TON Center (${valNano.toString()}) کمتر از مقدار مورد انتظار (${expectedNanoTon.toString()}) است.`,
            };
          }

          return {
            verified: true,
            status: 200,
            onChainTxHash: `0x${txHexHash}`,
            verifiedNanoTon: valNano.toString(),
            verifiedAmountTon: roundTonClean(Number(valNano) / 1e9),
            destinationAddress: params.expectedDestinationWallet,
            senderAddress: String(inMsg.source || params.senderWallet || ''),
            provider: 'TONCENTER',
          };
        }
      }
    }
  } catch {
    // Fall through to unverified rejection
  }

  return {
    verified: false,
    status: 422,
    onChainTxHash: candidateTxHash ? `0x${candidateTxHash}` : '',
    verifiedNanoTon: '0',
    verifiedAmountTon: 0,
    destinationAddress: params.expectedDestinationWallet,
    senderAddress: params.senderWallet || '',
    provider: 'NONE',
    error:
      'ONCHAIN_VERIFICATION_FAILED — تراکنش در بلاکچین TON (TonAPI / TON Center) یافت نشد یا هنوز به آدرس خزانه رسمی سایت نهایی (Confirmed) نشده است.',
  };
}

// ============================================================================
// 7. PHASE 3: USER BAN GUARD, MANUAL BALANCE ADJUSTMENT & HARDENED ADMIN AUTH
// ============================================================================

export interface AdminAuditLogEntry {
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

/**
 * Global Ban Check across all mutation endpoints:
 * If `user.isBanned === true`, rejects immediately with 403 Forbidden
 * ("Your account has been suspended by administration").
 */
export function checkUserBannedGuard(
  userAccount: Pick<IsolatedUserAccountRecord, 'isBanned' | 'banReason'> | null | undefined
): {
  allowed: boolean;
  status: 200 | 403;
  error?: string;
  banReason?: string;
} {
  if (userAccount && userAccount.isBanned === true) {
    return {
      allowed: false,
      status: 403,
      error: 'Your account has been suspended by administration',
      banReason: userAccount.banReason || 'Suspended by administration',
    };
  }
  return {
    allowed: true,
    status: 200,
  };
}

/**
 * Hardens Admin Authentication against header spoofing:
 * - Raw unverified `X-Telegram-User-Id` headers can NEVER grant admin privileges.
 * - When `TELEGRAM_BOT_TOKEN` is configured, `isAdmin` strictly requires cryptographic
 *   HMAC-SHA256 verification (`reason === 'VERIFIED_CRYPTOGRAPHICALLY'`) of `X-Telegram-Init-Data`.
 */
export function evaluateHardenedAdminSession(params: {
  verification: {
    valid: boolean;
    reason: string;
    user: { id: number } | null;
  };
  botToken: string | undefined | null;
  initDataUserId: number | null;
  adminTelegramUserIds: number[];
}): boolean {
  const cleanToken = String(params.botToken || '').trim();
  const allowedIds = Array.isArray(params.adminTelegramUserIds)
    ? params.adminTelegramUserIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  if (allowedIds.length === 0) {
    return false;
  }

  // When TELEGRAM_BOT_TOKEN is configured, strictly require cryptographic HMAC verification of X-Telegram-Init-Data
  if (cleanToken.length > 0) {
    if (
      !params.verification.valid ||
      params.verification.reason !== 'VERIFIED_CRYPTOGRAPHICALLY' ||
      !params.verification.user ||
      typeof params.verification.user.id !== 'number'
    ) {
      return false;
    }
    return allowedIds.includes(params.verification.user.id);
  }

  // Even when TELEGRAM_BOT_TOKEN is not configured, raw X-Telegram-User-Id headers can NEVER grant admin privileges;
  // only a user ID embedded inside X-Telegram-Init-Data can be checked against ADMIN_TELEGRAM_USER_IDS.
  if (
    !params.verification.valid ||
    params.initDataUserId === null ||
    !Number.isFinite(params.initDataUserId) ||
    params.initDataUserId <= 0
  ) {
    return false;
  }

  return allowedIds.includes(Math.floor(params.initDataUserId));
}

/**
 * Executes an atomic manual balance credit or debit (`TON`, `STARS`, or `FREE_TICKETS`)
 * on a target user's account and appends an explicit immutable audit entry to both
 * `user.pamState.ledger` and `adminAuditLogs`.
 */
export function executeAdminBalanceAdjustment(params: {
  userAccount: IsolatedUserAccountRecord;
  currency: 'TON' | 'STARS' | 'FREE_TICKETS';
  deltaAmount: number;
  reason: string;
  adminUserId: string | number;
  tonUsdRate?: number;
}): {
  ok: boolean;
  status: 200 | 400;
  error?: string;
  previousBalance?: number;
  newBalance?: number;
  ledgerEntry?: PAMPlayerState['ledger'][number];
  auditEntry?: AdminAuditLogEntry;
} {
  const { userAccount, currency } = params;
  const rawDelta = Number(params.deltaAmount);
  const cleanReason = String(params.reason || '').trim() || 'Manual Admin Balance Adjustment';
  const tonRate = Number(params.tonUsdRate) > 0 ? Number(params.tonUsdRate) : 5.0;

  if (!userAccount) {
    return { ok: false, status: 400, error: 'USER_NOT_FOUND — کاربر مورد نظر یافت نشد.' };
  }
  if (currency !== 'TON' && currency !== 'STARS' && currency !== 'FREE_TICKETS') {
    return {
      ok: false,
      status: 400,
      error: 'INVALID_CURRENCY — ارز انتخابی باید TON، STARS یا FREE_TICKETS باشد.',
    };
  }
  if (!Number.isFinite(rawDelta) || rawDelta === 0) {
    return {
      ok: false,
      status: 400,
      error: 'INVALID_DELTA_AMOUNT — مقدار تغییر موجودی باید یک عدد غیرصفر معتبر باشد.',
    };
  }

  const nowIso = new Date().toISOString();
  const auditId = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const txUuid = `tx_admin_adj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  let previousBalance = 0;
  let newBalance = 0;
  let appliedDelta = 0;

  if (currency === 'TON') {
    previousBalance = roundTonClean(userAccount.pamState.tonBalance);
    appliedDelta = roundTonClean(rawDelta);
    if (appliedDelta === 0) {
      return { ok: false, status: 400, error: 'DUST_DELTA_REJECTED — مقدار TON بسیار کوچک است.' };
    }
    newBalance = roundTonClean(Math.max(0, previousBalance + appliedDelta));
    userAccount.pamState.tonBalance = newBalance;
    userAccount.tonBalance = newBalance;
  } else if (currency === 'STARS') {
    previousBalance = roundStarsClean(userAccount.pamState.starsBalance);
    appliedDelta = roundStarsClean(rawDelta);
    if (appliedDelta === 0) {
      return {
        ok: false,
        status: 400,
        error: 'DUST_DELTA_REJECTED — مقدار Stars باید حداقل ۱ ستاره باشد.',
      };
    }
    newBalance = roundStarsClean(Math.max(0, previousBalance + appliedDelta));
    userAccount.pamState.starsBalance = newBalance;
    userAccount.starsBalance = newBalance;
  } else {
    previousBalance = Math.max(0, Math.round(Number(userAccount.freeLotteryTickets) || 0));
    appliedDelta = Math.round(rawDelta);
    if (appliedDelta === 0) {
      return {
        ok: false,
        status: 400,
        error: 'DUST_DELTA_REJECTED — تعداد بلیت رایگان باید عدد صحیح غیرصفر باشد.',
      };
    }
    newBalance = Math.max(0, previousBalance + appliedDelta);
    userAccount.freeLotteryTickets = newBalance;
  }

  const absDelta = Math.abs(appliedDelta);
  const amountUsdt =
    currency === 'TON'
      ? Number((absDelta * tonRate).toFixed(2))
      : currency === 'STARS'
      ? Number((absDelta * 0.02).toFixed(2))
      : 0;

  const ledgerEntry: PAMPlayerState['ledger'][number] = {
    transactionUuid: txUuid,
    referenceTransactionUuid: null,
    roundId: `#ADMIN-ADJ-${auditId.slice(-6).toUpperCase()}`,
    type: appliedDelta >= 0 ? 'BONUS' : 'DEBIT',
    vertical: 'ADMIN_MANUAL_ADJUSTMENT',
    currency: currency === 'STARS' ? 'STARS' : 'TON',
    amountTon: currency === 'TON' ? absDelta : 0,
    amountStars: currency === 'STARS' ? absDelta : 0,
    amountUsdt,
    balanceBeforeTon: currency === 'TON' ? previousBalance : userAccount.pamState.tonBalance,
    balanceAfterTon: userAccount.pamState.tonBalance,
    balanceBeforeStars: currency === 'STARS' ? previousBalance : userAccount.pamState.starsBalance,
    balanceAfterStars: userAccount.pamState.starsBalance,
    balanceBeforeUsdt: Number((userAccount.pamState.tonBalance * tonRate).toFixed(2)),
    balanceAfterUsdt: Number((userAccount.pamState.tonBalance * tonRate).toFixed(2)),
    clientSeed: userAccount.pamState.seeds.clientSeed,
    serverSeedHash: userAccount.pamState.seeds.serverSeedHash,
    nonce: userAccount.pamState.seeds.nonce,
    status: 'COMPLETED',
    createdAt: nowIso,
    note: `ADMIN_ADJUSTMENT (${currency} ${appliedDelta >= 0 ? `+${appliedDelta}` : appliedDelta}) توسط ادمین #${params.adminUserId}: ${cleanReason}`,
  };

  userAccount.pamState.ledger.unshift(ledgerEntry);
  userAccount.ledger = userAccount.pamState.ledger;
  userAccount.updatedAt = nowIso;

  const auditEntry: AdminAuditLogEntry = {
    id: auditId,
    timestamp: nowIso,
    adminUserId: String(params.adminUserId),
    targetUserId: userAccount.telegramUserId,
    actionType: 'BALANCE_ADJUSTMENT',
    currency,
    deltaAmount: appliedDelta,
    previousBalance,
    newBalance,
    reason: cleanReason,
  };

  return {
    ok: true,
    status: 200,
    previousBalance,
    newBalance,
    ledgerEntry,
    auditEntry,
  };
}


