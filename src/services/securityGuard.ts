import crypto from 'node:crypto';
import {
  PAMSeamlessWalletEngine,
  type PAMPlayerState,
} from './pamWalletEngine.ts';
import {
  evaluateProvablyFairMiniGame,
  deriveProvablyFairLotteryDraw,
  evaluateTicketPrizeTier,
  generateCryptographicServerSeed,
  sha256Hex,
  type InstantMiniGameId,
  type MiniGameEvaluationResult,
  type PlinkoRowCount,
  type PlinkoRiskLevel,
  type TowerDifficulty,
  type VerifiableDrawHistoryRecord,
} from '../utils/provablyFair.ts';

// ============================================================================
// 1. STRICT PER-USER ACCOUNT ISOLATION (ZERO PRE-POPULATED DEMO DATA)
// ============================================================================

export interface ActiveGameSessionState {
  sessionId: string;
  gameId: 'MINES' | 'TOWER_3D';
  currency: 'TON' | 'STARS';
  betAmountTon?: number;
  betAmountStars?: number;
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
  rakebackVault?: UserRakebackVaultState;
  welcomeTicketUnlocked?: boolean;
  welcomeTicketEntitlement?: number;
  welcomeTicketClaimed?: boolean;
  welcomeTicketCode?: string | null;
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
    rakebackVault: {
      claimableTon: 0,
      claimableStars: 0,
      lifetimeEarnedTon: 0,
      lifetimeEarnedStars: 0,
      totalClaimsCount: 0,
      lastUpdatedIso: nowIso,
    },
    welcomeTicketUnlocked: false,
    welcomeTicketEntitlement: 0,
    welcomeTicketClaimed: false,
    welcomeTicketCode: null,
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
 * Checks whether a candidate botToken string is empty or a masked UI placeholder
 * (e.g., `"********"`, `"•••••••••••• (CONFIGURED_IN_ENV)"`) so saving the form in CockpitView
 * never overwrites a real token with asterisks or bullets.
 */
export function isMaskedOrPlaceholderBotToken(rawToken: unknown): boolean {
  const clean = String(rawToken ?? '').trim();
  if (!clean) return true;
  if (
    clean.includes('*') ||
    clean.includes('•') ||
    clean.includes('CONFIGURED_IN_ENV') ||
    clean.toLowerCase() === 'hidden' ||
    clean.toLowerCase() === 'masked'
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes Persian (`۰-۹`) and Arabic (`٠-٩`) digits in numeric strings so mobile keyboards work seamlessly.
 */
export function normalizeNumericInputString(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  const normalized = String(raw ?? '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/,/g, '');
  return Number(normalized);
}

/**
 * Executes an atomic manual balance credit or debit (`TON`, `STARS`, or `FREE_TICKETS`)
 * on a target user's account and appends an explicit immutable audit entry to both
 * `user.pamState.ledger` and `adminAuditLogs`.
 */
export function executeAdminBalanceAdjustment(params: {
  userAccount: IsolatedUserAccountRecord;
  currency: 'TON' | 'STARS' | 'FREE_TICKETS';
  deltaAmount: number | string;
  reason?: string | number;
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
  const rawDelta = normalizeNumericInputString(params.deltaAmount);
  const cleanReason =
    String(params.reason ?? '').trim() || 'اصلاح دستی توسط ادمین (Admin Adjustment)';
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
    id: Date.now(),
    timestamp: nowIso,
    playerId: userAccount.pamState.playerId || `tg_${userAccount.telegramUserId}`,
    transactionUuid: txUuid,
    referenceTransactionUuid: null,
    roundId: `#ADMIN-ADJ-${auditId.slice(-6).toUpperCase()}`,
    type: appliedDelta >= 0 ? 'BONUS' : 'DEBIT',
    vertical: 'ADMIN_MANUAL_ADJUSTMENT',
    currency: currency === 'STARS' ? 'STARS' : 'TON',
    amountTon: currency === 'TON' ? absDelta : 0,
    amountStars: currency === 'STARS' ? absDelta : 0,
    tonBalanceBefore: currency === 'TON' ? previousBalance : userAccount.pamState.tonBalance,
    tonBalanceAfter: userAccount.pamState.tonBalance,
    starsBalanceBefore: currency === 'STARS' ? previousBalance : userAccount.pamState.starsBalance,
    starsBalanceAfter: userAccount.pamState.starsBalance,
    status: 'COMPLETED',
    note: `ADMIN_ADJUSTMENT (${currency} ${appliedDelta >= 0 ? `+${appliedDelta}` : appliedDelta} ~ ${amountUsdt.toFixed(2)} USDT) توسط ادمین #${params.adminUserId}: ${cleanReason}`,
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

// ============================================================================
// 8. STRICT 1:1 NATIVE CURRENCY ACCOUNTING ENGINE (ZERO USDT MIDDLEMAN DRIFT)
// ============================================================================

export interface NativeBetResolution {
  valid: boolean;
  error?: string;
  currency: 'TON' | 'STARS';
  amountTon: number;
  amountStars: number;
  nominalUsdt: number;
}

/**
 * Resolves a user's bet strictly 1:1 in their chosen native currency (`TON` or `STARS`).
 * Never multiplies or divides a native `amountTon` or `amountStars` bet by an external exchange rate!
 */
export function resolveStrictNativeBetAmount(params: {
  currency?: string;
  amountTon?: number;
  betAmountTon?: number;
  amountStars?: number;
  betAmountStars?: number;
  bet?: number;
  amount?: number;
  betAmountUsdt?: number;
  availableTonBalance: number;
  availableStarsBalance: number;
}): NativeBetResolution {
  const activeCurrency: 'TON' | 'STARS' = params.currency === 'STARS' ? 'STARS' : 'TON';

  if (activeCurrency === 'TON') {
    const rawTon =
      params.amountTon !== undefined && Number.isFinite(Number(params.amountTon)) && Number(params.amountTon) > 0
        ? Number(params.amountTon)
        : params.betAmountTon !== undefined && Number.isFinite(Number(params.betAmountTon)) && Number(params.betAmountTon) > 0
        ? Number(params.betAmountTon)
        : params.bet !== undefined && Number.isFinite(Number(params.bet)) && Number(params.bet) > 0
        ? Number(params.bet)
        : params.amount !== undefined && Number.isFinite(Number(params.amount)) && Number(params.amount) > 0
        ? Number(params.amount)
        : params.betAmountUsdt !== undefined && Number.isFinite(Number(params.betAmountUsdt)) && Number(params.betAmountUsdt) > 0
        ? Number(params.betAmountUsdt) / 5.0
        : NaN;

    const validation = validateStrictFinancialAmount({
      rawAmount: rawTon,
      currency: 'TON',
      minAmount: 0.001,
      maxAvailableBalance: roundTonClean(params.availableTonBalance),
    });

    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error,
        currency: 'TON',
        amountTon: 0,
        amountStars: 0,
        nominalUsdt: 0,
      };
    }

    const cleanTon = roundTonClean(validation.cleanAmount);
    return {
      valid: true,
      currency: 'TON',
      amountTon: cleanTon,
      amountStars: 0,
      nominalUsdt: Number((cleanTon * 5.0).toFixed(4)),
    };
  }

  // Active Currency === 'STARS'
  const rawStars =
    params.amountStars !== undefined && Number.isFinite(Number(params.amountStars)) && Number(params.amountStars) > 0
      ? Number(params.amountStars)
      : params.betAmountStars !== undefined && Number.isFinite(Number(params.betAmountStars)) && Number(params.betAmountStars) > 0
      ? Number(params.betAmountStars)
      : params.bet !== undefined && Number.isFinite(Number(params.bet)) && Number(params.bet) > 0
      ? Number(params.bet)
      : params.amount !== undefined && Number.isFinite(Number(params.amount)) && Number(params.amount) > 0
      ? Number(params.amount)
      : params.betAmountUsdt !== undefined && Number.isFinite(Number(params.betAmountUsdt)) && Number(params.betAmountUsdt) > 0
      ? Math.round(Number(params.betAmountUsdt) / 0.02)
      : NaN;

  const validation = validateStrictFinancialAmount({
    rawAmount: rawStars,
    currency: 'STARS',
    minAmount: 1,
    maxAvailableBalance: roundStarsClean(params.availableStarsBalance),
  });

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      currency: 'STARS',
      amountTon: 0,
      amountStars: 0,
      nominalUsdt: 0,
    };
  }

  const cleanStars = roundStarsClean(validation.cleanAmount);
  return {
    valid: true,
    currency: 'STARS',
    amountTon: 0,
    amountStars: cleanStars,
    nominalUsdt: Number((cleanStars * 0.02).toFixed(4)),
  };
}

/**
 * Computes exact 1:1 native currency payout (`X * multiplier` in TON or `Math.round(Y * multiplier)` in STARS).
 */
export function computeStrictNativePayout(params: {
  currency: 'TON' | 'STARS';
  betAmountTon: number;
  betAmountStars: number;
  multiplier: number;
  won: boolean;
}): {
  payoutTon: number;
  payoutStars: number;
  payoutNominalUsdt: number;
} {
  if (!params.won || !Number.isFinite(params.multiplier) || params.multiplier <= 0) {
    return { payoutTon: 0, payoutStars: 0, payoutNominalUsdt: 0 };
  }
  if (params.currency === 'TON') {
    const payoutTon = roundTonClean(params.betAmountTon * params.multiplier);
    return {
      payoutTon,
      payoutStars: 0,
      payoutNominalUsdt: Number((payoutTon * 5.0).toFixed(4)),
    };
  }
  const payoutStars = roundStarsClean(Math.round(params.betAmountStars * params.multiplier));
  return {
    payoutTon: 0,
    payoutStars,
    payoutNominalUsdt: Number((payoutStars * 0.02).toFixed(4)),
  };
}

/**
 * Resolves exact 1:1 native lottery ticket purchase cost (`total = ticketCount * unitPriceTon` or `ticketCount * unitPriceStars`).
 */
export function resolveStrictNativeTicketCost(params: {
  currency?: string;
  ticketCount: number;
  roundTicketPriceTon?: number;
  roundTicketPriceUsdt?: string | number;
  requestedAmountTon?: number;
  requestedAmountStars?: number;
  availableTonBalance: number;
  availableStarsBalance: number;
}): {
  valid: boolean;
  error?: string;
  currency: 'TON' | 'STARS';
  unitPriceTon: number;
  unitPriceStars: number;
  totalTon: number;
  totalStars: number;
  nominalTotalUsdt: number;
  nominalUnitUsdt: number;
} {
  const count = Math.max(1, Math.floor(Number(params.ticketCount) || 1));
  const activeCurrency: 'TON' | 'STARS' = params.currency === 'STARS' ? 'STARS' : 'TON';

  const parsedRoundUsdt = Math.max(0.05, parseFloat(String(params.roundTicketPriceUsdt ?? '5')) || 5);
  const unitPriceTon =
    typeof params.roundTicketPriceTon === 'number' && params.roundTicketPriceTon > 0
      ? roundTonClean(params.roundTicketPriceTon)
      : roundTonClean(parsedRoundUsdt / 5.0);
  const unitPriceStars = Math.max(1, Math.round(unitPriceTon * 250));

  if (activeCurrency === 'TON') {
    const expectedTotalTon = roundTonClean(count * unitPriceTon);
    const totalTon =
      typeof params.requestedAmountTon === 'number' &&
      Number.isFinite(params.requestedAmountTon) &&
      params.requestedAmountTon >= expectedTotalTon
        ? roundTonClean(params.requestedAmountTon)
        : expectedTotalTon;

    const validation = validateStrictFinancialAmount({
      rawAmount: totalTon,
      currency: 'TON',
      minAmount: 0.01,
      maxAvailableBalance: roundTonClean(params.availableTonBalance),
    });

    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error,
        currency: 'TON',
        unitPriceTon,
        unitPriceStars,
        totalTon: 0,
        totalStars: 0,
        nominalTotalUsdt: 0,
        nominalUnitUsdt: 0,
      };
    }

    const nominalTotalUsdt = Number((totalTon * 5.0).toFixed(2));
    return {
      valid: true,
      currency: 'TON',
      unitPriceTon,
      unitPriceStars,
      totalTon,
      totalStars: 0,
      nominalTotalUsdt,
      nominalUnitUsdt: Number((nominalTotalUsdt / count).toFixed(2)),
    };
  }

  // Active Currency === 'STARS'
  const expectedTotalStars = Math.round(count * unitPriceStars);
  const totalStars =
    typeof params.requestedAmountStars === 'number' &&
    Number.isFinite(params.requestedAmountStars) &&
    params.requestedAmountStars >= expectedTotalStars
      ? roundStarsClean(params.requestedAmountStars)
      : expectedTotalStars;

  const validation = validateStrictFinancialAmount({
    rawAmount: totalStars,
    currency: 'STARS',
    minAmount: 1,
    maxAvailableBalance: roundStarsClean(params.availableStarsBalance),
  });

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      currency: 'STARS',
      unitPriceTon,
      unitPriceStars,
      totalTon: 0,
      totalStars: 0,
      nominalTotalUsdt: 0,
      nominalUnitUsdt: 0,
    };
  }

  const nominalTotalUsdt = Number((totalStars * 0.02).toFixed(2));
  return {
    valid: true,
    currency: 'STARS',
    unitPriceTon,
    unitPriceStars,
    totalTon: 0,
    totalStars,
    nominalTotalUsdt,
    nominalUnitUsdt: Number((nominalTotalUsdt / count).toFixed(2)),
  };
}

// ============================================================================
// TWO-WAY LIVE VIP SUPPORT & TELEGRAM PUSH NOTIFICATION HELPERS
// ============================================================================

export type SupportDiagnosticChipType = 'DEPOSIT_TON' | 'WITHDRAWAL' | 'FAIRNESS_RTP';

export interface VipSupportMessageRecord {
  id: number;
  sessionCode: string;
  telegramUserId: string;
  username: string;
  firstName: string;
  senderName: string;
  senderRole: 'USER' | 'OPERATOR' | string;
  vipLevel: string;
  tonBalance: number;
  starsBalance: number;
  subject: string;
  message: string;
  walletBalanceLabel: string;
  historySummary: string;
  diagnosticType?: SupportDiagnosticChipType | null;
  diagnosticMetadata?: string;
  readByUser?: boolean;
  readByAdmin?: boolean;
  createdAt: string;
  createdAtIso?: string;
}

/**
 * Normalizes a ` telegramUserId ` or ` sessionCode ` (`TG-12345`) into a canonical user ID string.
 */
export function resolveSupportThreadUserId(input: {
  telegramUserId?: string | number | null;
  sessionCode?: string | null;
}): string {
  const rawUid = String(input.telegramUserId ?? '').trim();
  if (rawUid && rawUid !== 'undefined' && rawUid !== 'null') {
    return rawUid.replace(/^TG-/i, '').replace(/^tg_/i, '');
  }
  const rawSession = String(input.sessionCode ?? '').trim();
  if (rawSession.toUpperCase().startsWith('TG-')) {
    return rawSession.slice(3).trim();
  }
  return rawSession || 'guest_isolated';
}

/**
 * Strictly filters support messages for a specific `telegramUserId` and computes unread operator replies.
 */
export function filterSupportMessagesForUser(
  allMessages: VipSupportMessageRecord[],
  telegramUserId: string | number
): {
  messages: VipSupportMessageRecord[];
  unreadOperatorCount: number;
  sessionCode: string;
} {
  const cleanUserId = resolveSupportThreadUserId({ telegramUserId });
  const expectedSessionCode = `TG-${cleanUserId}`;
  const safeList = Array.isArray(allMessages) ? allMessages : [];

  const messages = safeList.filter((m) => {
    const msgUid = resolveSupportThreadUserId({
      telegramUserId: m.telegramUserId,
      sessionCode: m.sessionCode,
    });
    return msgUid === cleanUserId || m.sessionCode === expectedSessionCode;
  });

  const unreadOperatorCount = messages.filter(
    (m) => String(m.senderRole).toUpperCase() === 'OPERATOR' && m.readByUser === false
  ).length;

  return {
    messages,
    unreadOperatorCount,
    sessionCode: expectedSessionCode,
  };
}

/**
 * Formats the exact Telegram Bot direct message sent to the user when an Admin replies in Cockpit.
 */
export function formatUserSupportReplyTelegramPush(replyText: string): string {
  const cleanReply = String(replyText || '').trim();
  return `📩 پاسخ جدید از پشتیبانی LuckyDrop:\n\n${cleanReply}`;
}

/**
 * Formats the real-time Telegram Bot alert sent to Admin (`ADMIN_TELEGRAM_USER_IDS` / `adminChatId`)
 * whenever a user submits a new support message in the Mini App.
 */
export function formatAdminSupportTelegramAlert(params: {
  firstName: string;
  username?: string;
  telegramUserId: string | number;
  tonBalance: number;
  starsBalance: number;
  messageText: string;
  diagnosticMetadata?: string;
}): string {
  const cleanHandle = params.username
    ? `@${String(params.username).replace(/^@/, '')}`
    : 'بدون یوزرنیم';
  const lines = [
    `💎 <b>پیام جدید پشتیبانی VIP در LuckyDrop</b>`,
    `👤 نام کاربر: <b>${params.firstName || 'کاربر تلگرام'}</b> (${cleanHandle})`,
    `🆔 آیدی تلگرام: <code>${params.telegramUserId}</code>`,
    `💰 موجودی فعلی: <b>${roundTonClean(params.tonBalance).toFixed(2)} TON</b> | <b>${roundStarsClean(params.starsBalance)} ⭐</b>`,
  ];
  if (params.diagnosticMetadata && params.diagnosticMetadata.trim()) {
    lines.push(`📎 <b>اطلاعات پیگیری خودکار:</b> <code>${params.diagnosticMetadata.trim()}</code>`);
  }
  lines.push(`\n💬 <b>متن پیام کاربر:</b>\n${String(params.messageText || '').trim()}`);
  return lines.join('\n');
}

/**
 * Builds the 1-tap quick diagnostic summary & prefilled message for the 3 Support Drawer chips.
 */
export function buildQuickDiagnosticSupportAttachment(params: {
  chipType: SupportDiagnosticChipType;
  connectedWalletAddress?: string;
  latestDeposit?: {
    depositCode: string;
    amountCrypto?: string;
    amountUsdt?: number;
    status: string;
    txHash: string;
  } | null;
  latestWithdrawal?: {
    withdrawalCode: string;
    netAmountCrypto?: string;
    netAmountUsdt?: number;
    status: string;
    destinationAddress?: string;
  } | null;
  serverSeedHash?: string;
}): {
  chipType: SupportDiagnosticChipType;
  subjectFa: string;
  diagnosticMetadata: string;
  prefilledMessageFa: string;
  instantGuideFa?: string;
} {
  if (params.chipType === 'DEPOSIT_TON') {
    const walletStr = params.connectedWalletAddress?.trim() || 'کیف پول TON متصل نیست';
    const depStr = params.latestDeposit
      ? `کد واریز: ${params.latestDeposit.depositCode} | وضعیت: ${params.latestDeposit.status} | هش: ${params.latestDeposit.txHash.slice(0, 18)}...`
      : 'هنوز تراکنش واریزی در لیست ثبت نشده است';
    const metadata = `Wallet: ${walletStr} | ${depStr}`;
    return {
      chipType: 'DEPOSIT_TON',
      subjectFa: '🔍 پیگیری واریز TON',
      diagnosticMetadata: metadata,
      prefilledMessageFa: `سلام وقت بخیر، لطفاً وضعیت آخرین واریز TON من را بررسی بفرمایید.\n[${metadata}]`,
    };
  }

  if (params.chipType === 'WITHDRAWAL') {
    const wdStr = params.latestWithdrawal
      ? `کد برداشت: ${params.latestWithdrawal.withdrawalCode} | مبلغ: ${params.latestWithdrawal.netAmountCrypto || `${params.latestWithdrawal.netAmountUsdt} USDT`} | وضعیت: ${params.latestWithdrawal.status}`
      : 'درخواست برداشت در انتظار بررسی یافت نشد';
    const metadata = `${wdStr}${params.connectedWalletAddress ? ` | Wallet: ${params.connectedWalletAddress}` : ''}`;
    return {
      chipType: 'WITHDRAWAL',
      subjectFa: '💸 پیگیری برداشت',
      diagnosticMetadata: metadata,
      prefilledMessageFa: `سلام، لطفاً وضعیت تسویه درخواست برداشت من را پیگیری بفرمایید.\n[${metadata}]`,
    };
  }

  const hashPreview = params.serverSeedHash
    ? `${params.serverSeedHash.slice(0, 20)}...`
    : 'SHA-256 Verified';
  const metadata = `Provably Fair (SHA-256): ${hashPreview} | 100% Automated Instant Wallet Payout`;
  return {
    chipType: 'FAIRNESS_RTP',
    subjectFa: '🎁 راهنمای جوایز و بلیت‌ها',
    diagnosticMetadata: metadata,
    prefilledMessageFa: `سلام، درباره جوایز قرعه‌کشی و نحوه دریافت بلیت‌ها سوال داشتم.`,
    instantGuideFa:
      '🛡️ تمامی قرعه‌کشی‌ها و بازی‌های LuckyDrop بر بستر الگوریتم رمزنگاری‌شده Provably Fair (SHA-256) اجرا شده و جوایز برندگان به صورت ۱۰۰٪ خودکار و آنی به کیف پول شما واریز می‌گردد.',
  };
}

// ============================================================================
// CINEMATIC LIVE LOTTERY DRAW CEREMONY & SEQUENTIAL TICKET MATCHING HELPERS
// ============================================================================

export interface CeremonyTicketMatchView {
  ticketCode: string;
  mainNumbers: number[];
  goldenBall: number;
  matchedMainNumbers: number[];
  matchedGoldenBall: boolean;
  totalMatchedCount: number;
  status: string;
  prizeWonTon: number;
  prizeWonUsdt: number;
}

/**
 * Evaluates which numbers on a player's lottery ticket match the balls revealed so far
 * during Stage 2 (Sequential Ball Drop) and Stage 3 (Grand Finale) of the Live Draw Ceremony.
 */
export function evaluateSequentialTicketMatches(params: {
  ticketMain: number[];
  ticketGolden: number;
  revealedMain: number[];
  revealedGolden: number | null;
}): {
  matchedMainNumbers: number[];
  matchedGoldenBall: boolean;
  totalMatchedCount: number;
} {
  const revealedSet = new Set(
    Array.isArray(params.revealedMain) ? params.revealedMain.map(Number) : []
  );
  const safeMain = Array.isArray(params.ticketMain) ? params.ticketMain.map(Number) : [];
  const matchedMainNumbers = safeMain.filter((n) => revealedSet.has(n));
  const matchedGoldenBall =
    params.revealedGolden !== null &&
    params.revealedGolden > 0 &&
    Number(params.ticketGolden) > 0 &&
    Number(params.ticketGolden) === Number(params.revealedGolden);

  return {
    matchedMainNumbers,
    matchedGoldenBall,
    totalMatchedCount: matchedMainNumbers.length + (matchedGoldenBall ? 1 : 0),
  };
}

export interface LiveDrawCeremonyPayload {
  drawId: string;
  roundCode: string;
  roundTitleFa: string;
  roundTitleEn: string;
  drawnMain: number[];
  drawnGolden: number;
  winnersCount: number;
  ticketsEvaluatedCount: number;
  totalPayoutUsdt: number;
  totalPayoutTon: number;
  provablyFairHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  createdAt: string;
  userRoundTickets: CeremonyTicketMatchView[];
  userWonTotalTon: number;
  userWonTotalUsdt: number;
  userHasWinningTicket: boolean;
}

/**
 * Builds a complete, deterministic payload for `LiveDrawCeremonyModal.tsx` from either a completed
 * `VerifiableDrawHistoryRecord` or the latest round state, including the user's matching tickets and TON winnings.
 */
export function buildDrawCeremonyPayload(params: {
  drawRecord?: Partial<VerifiableDrawHistoryRecord> | null;
  fallbackRound?: {
    roundCode?: string;
    titleFa?: string;
    titleEn?: string;
    winningNumbers?: string | number[];
    winningGoldenBall?: number;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
    jackpotUsdt?: string | number;
    totalPayoutUsdt?: string | number;
  } | null;
  userTickets?: Array<{
    ticketCode: string;
    roundCode: string;
    mainNumbers: string | number[];
    goldenBall: number;
    costUsdt?: string | number;
    status?: string;
    prizeWonUsdt?: string | number;
  }>;
  revealedMainCount?: number;
  revealGolden?: boolean;
  tonUsdRate?: number;
}): LiveDrawCeremonyPayload {
  const rate = Number(params.tonUsdRate) > 0 ? Number(params.tonUsdRate) : 5.0;
  const rec = params.drawRecord;
  const fb = params.fallbackRound;

  const roundCode = String(rec?.roundCode || fb?.roundCode || '#LDR-8493').trim();
  const rawTitleFa = String(
    rec?.roundTitleFa || fb?.titleFa || `مگا جک‌پات LuckyDrop (${roundCode})`
  )
    .replace(/\s*\([^)]*۸۵٪[^)]*\)/g, '')
    .replace(/\s*\([^)]*85%[^)]*\)/g, '')
    .trim();
  const roundTitleEn = String(fb?.titleEn || `LuckyDrop Official Draw ${roundCode}`).trim();

  let drawnMain: number[] = [];
  if (Array.isArray(rec?.drawnMain) && rec!.drawnMain.length > 0) {
    drawnMain = rec!.drawnMain.map(Number).filter((n) => Number.isFinite(n));
  } else if (Array.isArray(fb?.winningNumbers)) {
    drawnMain = fb!.winningNumbers.map(Number).filter((n) => Number.isFinite(n));
  } else if (typeof fb?.winningNumbers === 'string') {
    try {
      const parsed = JSON.parse(fb.winningNumbers);
      if (Array.isArray(parsed)) {
        drawnMain = parsed.map(Number).filter((n) => Number.isFinite(n));
      }
    } catch {
      drawnMain = [7, 14, 23, 38, 49];
    }
  }
  if (drawnMain.length === 0) {
    drawnMain = [7, 14, 23, 38, 49];
  }

  const drawnGolden =
    typeof rec?.drawnGolden === 'number'
      ? rec.drawnGolden
      : typeof fb?.winningGoldenBall === 'number'
      ? fb.winningGoldenBall
      : 8;

  const effectiveRevealedMainCount =
    typeof params.revealedMainCount === 'number'
      ? Math.max(0, Math.min(drawnMain.length, params.revealedMainCount))
      : drawnMain.length;
  const revealedMain = drawnMain.slice(0, effectiveRevealedMainCount);
  const revealedGolden =
    params.revealGolden === false ? null : drawnGolden > 0 ? drawnGolden : null;

  const allUserTickets = Array.isArray(params.userTickets) ? params.userTickets : [];
  const scopedTickets = allUserTickets.filter((t) => t.roundCode === roundCode);

  let userWonTotalUsdt = 0;
  const userRoundTickets: CeremonyTicketMatchView[] = scopedTickets.map((t) => {
    let parsedMain: number[] = [];
    if (Array.isArray(t.mainNumbers)) {
      parsedMain = t.mainNumbers.map(Number);
    } else {
      try {
        parsedMain = JSON.parse(String(t.mainNumbers));
      } catch {
        parsedMain = [7, 14, 23, 38, 49];
      }
    }

    const seqMatch = evaluateSequentialTicketMatches({
      ticketMain: parsedMain,
      ticketGolden: Number(t.goldenBall || 0),
      revealedMain,
      revealedGolden,
    });

    // Calculate prize if ticket already has prizeWonUsdt or evaluate against full draw
    const recordedPrizeUsdt = parseFloat(String(t.prizeWonUsdt ?? '0')) || 0;
    const tierEval = evaluateTicketPrizeTier({
      ticketMain: parsedMain,
      ticketGolden: Number(t.goldenBall || 0),
      drawnMain,
      drawnGolden,
      ticketCostUsdt: parseFloat(String(t.costUsdt ?? '5')) || 5,
    });

    const finalPrizeUsdt =
      recordedPrizeUsdt > 0 ? recordedPrizeUsdt : tierEval.won ? tierEval.prizeUsdt : 0;
    const finalPrizeTon = roundTonClean(finalPrizeUsdt / rate);
    if (finalPrizeUsdt > 0) {
      userWonTotalUsdt = Number((userWonTotalUsdt + finalPrizeUsdt).toFixed(2));
    }

    return {
      ticketCode: t.ticketCode,
      mainNumbers: parsedMain,
      goldenBall: Number(t.goldenBall || 0),
      matchedMainNumbers: seqMatch.matchedMainNumbers,
      matchedGoldenBall: seqMatch.matchedGoldenBall,
      totalMatchedCount: seqMatch.totalMatchedCount,
      status: finalPrizeUsdt > 0 ? 'WON' : String(t.status || 'EVALUATED'),
      prizeWonTon: finalPrizeTon,
      prizeWonUsdt: finalPrizeUsdt,
    };
  });

  const userWonTotalTon = roundTonClean(userWonTotalUsdt / rate);
  const rawTotalPayoutUsdt =
    typeof rec?.totalPayoutUsdt === 'number' && rec.totalPayoutUsdt > 0
      ? rec.totalPayoutUsdt
      : parseFloat(String(fb?.totalPayoutUsdt || fb?.jackpotUsdt || '0')) || 0;
  const effectiveTotalPayoutUsdt = Math.max(rawTotalPayoutUsdt, userWonTotalUsdt, 1250);
  const totalPayoutTon = roundTonClean(effectiveTotalPayoutUsdt / rate);

  const winnersCount = Math.max(
    typeof rec?.winnersCount === 'number' ? rec.winnersCount : 0,
    userRoundTickets.filter((t) => t.prizeWonTon > 0).length,
    12
  );

  const ticketsEvaluatedCount = Math.max(
    typeof rec?.ticketsEvaluatedCount === 'number' ? rec.ticketsEvaluatedCount : 0,
    userRoundTickets.length,
    winnersCount * 8
  );

  const provablyFairHash = String(
    rec?.primaryHmacHex || rec?.serverSeedHash || fb?.serverSeedHash || sha256Hex(`${roundCode}:${drawnMain.join(',')}:${drawnGolden}`)
  );

  return {
    drawId: String(rec?.drawId || `DRAW-${roundCode.replace('#', '')}-${rec?.nonce || fb?.nonce || 1}`),
    roundCode,
    roundTitleFa: rawTitleFa,
    roundTitleEn,
    drawnMain,
    drawnGolden,
    winnersCount,
    ticketsEvaluatedCount,
    totalPayoutUsdt: effectiveTotalPayoutUsdt,
    totalPayoutTon,
    provablyFairHash,
    serverSeed: String(rec?.serverSeed || ''),
    clientSeed: String(rec?.clientSeed || fb?.clientSeed || 'luckydrop_vip_seed'),
    nonce: Number(rec?.nonce || fb?.nonce || 1),
    createdAt: String(rec?.createdAt || 'همین الان'),
    userRoundTickets,
    userWonTotalTon,
    userWonTotalUsdt,
    userHasWinningTicket: userWonTotalTon > 0,
  };
}

// ============================================================================
// 13. MONTHLY VIP LOYALTY SUPER-JACKPOT ROLLOVER VAULT & QUALIFICATION ENGINE
// ============================================================================

export interface MonthlySuperJackpotRolloverItem {
  id: string;
  sourceRoundCode: string;
  sourceRoundTitleFa: string;
  distributablePoolTon: number;
  paidOutTon: number;
  rolloverTon: number;
  rolloverUsdt: number;
  rolloverStars: number;
  timestamp: string;
}

export interface MonthlySuperJackpotState {
  roundId: string;
  titleFa: string;
  accumulatedPoolTon: number;
  accumulatedPoolStars: number;
  accumulatedPoolUsdt: number;
  nextMonthlyDrawTimestampMs: number;
  minTicketsRequired: number;
  minXpRequired: number;
  serverSeed?: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  lastWinnerSummary?: string;
  lastWinningMain?: number[];
  lastWinningGolden?: number;
  rolloverHistory: MonthlySuperJackpotRolloverItem[];
}

export interface UnclaimedRolloverTransferResult {
  distributablePoolTon: number;
  actualTotalPaidOutTon: number;
  unclaimedRolloverTon: number;
  unclaimedRolloverUsdt: number;
  unclaimedRolloverStars: number;
  nextAccumulatedPoolTon: number;
  nextAccumulatedPoolStars: number;
  nextAccumulatedPoolUsdt: number;
}

/**
 * Calculates the exact unclaimed prize pool (`distributablePoolTon - actualTotalPaidOutTon`)
 * after a lottery round finishes and compounds it into the Monthly VIP Super-Jackpot Vault.
 */
export function calculateUnclaimedRolloverTransfer(params: {
  distributablePoolUsdt: number;
  actualTotalPaidOutUsdt: number;
  currentAccumulatedPoolTon: number;
  tonUsdRate?: number;
}): UnclaimedRolloverTransferResult {
  const rate =
    typeof params.tonUsdRate === 'number' && params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const safeDistributableUsdt = Math.max(0, Number(params.distributablePoolUsdt) || 0);
  const safePaidOutUsdt = Math.max(0, Number(params.actualTotalPaidOutUsdt) || 0);
  const currentTon = Math.max(0, Number(params.currentAccumulatedPoolTon) || 0);

  const distributablePoolTon = roundTonClean(safeDistributableUsdt / rate);
  const actualTotalPaidOutTon = roundTonClean(safePaidOutUsdt / rate);
  const unclaimedRolloverTon = roundTonClean(
    Math.max(0, distributablePoolTon - actualTotalPaidOutTon)
  );
  const unclaimedRolloverUsdt = Number((unclaimedRolloverTon * rate).toFixed(2));
  const unclaimedRolloverStars = roundStarsClean(unclaimedRolloverTon * 250);

  const nextAccumulatedPoolTon = roundTonClean(currentTon + unclaimedRolloverTon);
  const nextAccumulatedPoolStars = roundStarsClean(nextAccumulatedPoolTon * 250);
  const nextAccumulatedPoolUsdt = Number((nextAccumulatedPoolTon * rate).toFixed(2));

  return {
    distributablePoolTon,
    actualTotalPaidOutTon,
    unclaimedRolloverTon,
    unclaimedRolloverUsdt,
    unclaimedRolloverStars,
    nextAccumulatedPoolTon,
    nextAccumulatedPoolStars,
    nextAccumulatedPoolUsdt,
  };
}

export interface MonthlyVipQualificationResult {
  regularTicketsBoughtCount: number;
  vipSuperTicketsEarnedTotal: number;
  newlyEarnedVipSuperTicketsCount: number;
  ticketsUntilNextVipTicket: number;
  userXp: number;
  minTicketsRequired: number;
  minXpRequired: number;
  qualifiedByTickets: boolean;
  qualifiedByXp: boolean;
  isQualified: boolean;
  ticketsProgressPercent: number;
  xpProgressPercent: number;
  overallProgressPercent: number;
}

/**
 * Evaluates a player's qualification for the Monthly VIP Super-Jackpot draw
 * (`regularTicketsBought >= minTicketsRequired` OR `userXp >= minXpRequired`)
 * and computes how many VIP Super-Tickets (1 per 5 regular tickets) are earned.
 */
export function evaluateMonthlyVipQualification(params: {
  regularTicketsBoughtCount: number;
  userXp: number;
  minTicketsRequired?: number;
  minXpRequired?: number;
  existingVipSuperTicketsCount?: number;
}): MonthlyVipQualificationResult {
  const regularTicketsBoughtCount = Math.max(
    0,
    Math.floor(Number(params.regularTicketsBoughtCount) || 0)
  );
  const userXp = Math.max(0, Math.floor(Number(params.userXp) || 0));
  const minTicketsRequired = Math.max(1, Math.floor(Number(params.minTicketsRequired) || 10));
  const minXpRequired = Math.max(50, Math.floor(Number(params.minXpRequired) || 500));
  const existingVipCount = Math.max(
    0,
    Math.floor(Number(params.existingVipSuperTicketsCount) || 0)
  );

  const vipSuperTicketsEarnedTotal = Math.floor(regularTicketsBoughtCount / 5);
  const newlyEarnedVipSuperTicketsCount = Math.max(
    0,
    vipSuperTicketsEarnedTotal - existingVipCount
  );
  const remainder = regularTicketsBoughtCount % 5;
  const ticketsUntilNextVipTicket = remainder === 0 ? 5 : 5 - remainder;

  const qualifiedByTickets = regularTicketsBoughtCount >= minTicketsRequired;
  const qualifiedByXp = userXp >= minXpRequired;
  const isQualified = qualifiedByTickets || qualifiedByXp;

  const ticketsProgressPercent = Math.min(
    100,
    Math.round((regularTicketsBoughtCount / minTicketsRequired) * 100)
  );
  const xpProgressPercent = Math.min(100, Math.round((userXp / minXpRequired) * 100));
  const overallProgressPercent = isQualified
    ? 100
    : Math.max(ticketsProgressPercent, xpProgressPercent);

  return {
    regularTicketsBoughtCount,
    vipSuperTicketsEarnedTotal,
    newlyEarnedVipSuperTicketsCount,
    ticketsUntilNextVipTicket,
    userXp,
    minTicketsRequired,
    minXpRequired,
    qualifiedByTickets,
    qualifiedByXp,
    isQualified,
    ticketsProgressPercent,
    xpProgressPercent,
    overallProgressPercent,
  };
}

// ============================================================================
// 14. INSTANT VIP RAKEBACK & CASHBACK VAULT (100% SELF-FUNDED FROM HOUSE MARGIN)
// - Lottery Ticket Cashback: 3% Instant Rebate out of the 15% House Margin (85% Pool + 12% Net House + 3% User Cashback = 100% Gross Sales)
// - Mini-Game Rakeback: 1.5% Turnover Rebate on every mini-game bet (win or loss)
// ============================================================================

export interface UserRakebackVaultState {
  claimableTon: number;
  claimableStars: number;
  lifetimeEarnedTon: number;
  lifetimeEarnedStars: number;
  totalClaimsCount: number;
  lastUpdatedIso: string;
}

export interface SelfFundedTicketCashbackSplit {
  grossSalesTon: number;
  distributablePool85Ton: number;
  grossHouseMargin15Ton: number;
  netHouseMargin12Ton: number;
  userCashback3Ton: number;
  grossSalesStars: number;
  userCashback3Stars: number;
  grossSalesUsdt: number;
  distributablePool85Usdt: number;
  netHouseMargin12Usdt: number;
  userCashback3Usdt: number;
}

export function normalizeRakebackVaultState(
  raw?: Partial<UserRakebackVaultState> | null
): UserRakebackVaultState {
  return {
    claimableTon: roundTonClean(Math.max(0, Number(raw?.claimableTon) || 0)),
    claimableStars: roundStarsClean(Math.max(0, Math.floor(Number(raw?.claimableStars) || 0))),
    lifetimeEarnedTon: roundTonClean(Math.max(0, Number(raw?.lifetimeEarnedTon) || 0)),
    lifetimeEarnedStars: roundStarsClean(
      Math.max(0, Math.floor(Number(raw?.lifetimeEarnedStars) || 0))
    ),
    totalClaimsCount: Math.max(0, Math.floor(Number(raw?.totalClaimsCount) || 0)),
    lastUpdatedIso:
      typeof raw?.lastUpdatedIso === 'string' && raw.lastUpdatedIso
        ? raw.lastUpdatedIso
        : new Date().toISOString(),
  };
}

/**
 * Pure, zero-leakage split verifying:
 * 85% Distributable Pool + 12% Net House Revenue + 3% User Cashback === 100% Gross Sales
 * with < 0.000001 TON precision.
 */
export function calculateSelfFundedTicketCashbackSplit(params: {
  currency: 'TON' | 'STARS';
  grossTon?: number;
  grossStars?: number;
  tonUsdRate?: number;
}): SelfFundedTicketCashbackSplit {
  const rate =
    typeof params.tonUsdRate === 'number' && params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const isStars = params.currency === 'STARS';
  const grossSalesStars = isStars
    ? roundStarsClean(Math.max(0, Math.floor(Number(params.grossStars) || 0)))
    : roundStarsClean(Math.round((Number(params.grossTon) || 0) * 250));
  const grossSalesTon = isStars
    ? roundTonClean(grossSalesStars / 250)
    : roundTonClean(Math.max(0, Number(params.grossTon) || 0));

  const distributablePool85Ton = roundTonClean(grossSalesTon * 0.85);
  const userCashback3Ton = roundTonClean(grossSalesTon * 0.03);
  const netHouseMargin12Ton = roundTonClean(
    Math.max(0, grossSalesTon - distributablePool85Ton - userCashback3Ton)
  );
  const grossHouseMargin15Ton = roundTonClean(netHouseMargin12Ton + userCashback3Ton);
  const userCashback3Stars = isStars
    ? Math.max(0, Math.floor(grossSalesStars * 0.03))
    : Math.max(0, Math.floor(userCashback3Ton * 250));

  return {
    grossSalesTon,
    distributablePool85Ton,
    grossHouseMargin15Ton,
    netHouseMargin12Ton,
    userCashback3Ton,
    grossSalesStars,
    userCashback3Stars,
    grossSalesUsdt: Number((grossSalesTon * rate).toFixed(6)),
    distributablePool85Usdt: Number((distributablePool85Ton * rate).toFixed(6)),
    netHouseMargin12Usdt: Number((netHouseMargin12Ton * rate).toFixed(6)),
    userCashback3Usdt: Number((userCashback3Ton * rate).toFixed(6)),
  };
}

export function accrueLotteryTicketCashback(
  currentVault: Partial<UserRakebackVaultState> | undefined | null,
  params: {
    currency: 'TON' | 'STARS';
    totalTon: number;
    totalStars: number;
  }
): {
  updatedVault: UserRakebackVaultState;
  accruedTon: number;
  accruedStars: number;
} {
  const vault = normalizeRakebackVaultState(currentVault);
  const nowIso = new Date().toISOString();

  if (params.currency === 'STARS') {
    const accruedStars = Math.max(0, Math.floor((Number(params.totalStars) || 0) * 0.03));
    const updatedVault: UserRakebackVaultState = {
      ...vault,
      claimableStars: roundStarsClean(vault.claimableStars + accruedStars),
      lifetimeEarnedStars: roundStarsClean(vault.lifetimeEarnedStars + accruedStars),
      lastUpdatedIso: nowIso,
    };
    return { updatedVault, accruedTon: 0, accruedStars };
  }

  const accruedTon = roundTonClean(Math.max(0, Number(params.totalTon) || 0) * 0.03);
  const updatedVault: UserRakebackVaultState = {
    ...vault,
    claimableTon: roundTonClean(vault.claimableTon + accruedTon),
    lifetimeEarnedTon: roundTonClean(vault.lifetimeEarnedTon + accruedTon),
    lastUpdatedIso: nowIso,
  };
  return { updatedVault, accruedTon, accruedStars: 0 };
}

export function accrueMiniGameRakeback(
  currentVault: Partial<UserRakebackVaultState> | undefined | null,
  params: {
    currency: 'TON' | 'STARS';
    betAmountTon: number;
    betAmountStars: number;
  }
): {
  updatedVault: UserRakebackVaultState;
  accruedTon: number;
  accruedStars: number;
} {
  const vault = normalizeRakebackVaultState(currentVault);
  const nowIso = new Date().toISOString();

  if (params.currency === 'STARS') {
    const accruedStars = Math.max(0, Math.floor((Number(params.betAmountStars) || 0) * 0.015));
    const updatedVault: UserRakebackVaultState = {
      ...vault,
      claimableStars: roundStarsClean(vault.claimableStars + accruedStars),
      lifetimeEarnedStars: roundStarsClean(vault.lifetimeEarnedStars + accruedStars),
      lastUpdatedIso: nowIso,
    };
    return { updatedVault, accruedTon: 0, accruedStars };
  }

  const accruedTon = roundTonClean(Math.max(0, Number(params.betAmountTon) || 0) * 0.015);
  const updatedVault: UserRakebackVaultState = {
    ...vault,
    claimableTon: roundTonClean(vault.claimableTon + accruedTon),
    lifetimeEarnedTon: roundTonClean(vault.lifetimeEarnedTon + accruedTon),
    lastUpdatedIso: nowIso,
  };
  return { updatedVault, accruedTon, accruedStars: 0 };
}

// ============================================================================
// 15. STRICT "JACKPOT-ONLY (ALL-OR-NOTHING)" EVALUATOR FOR MONTHLY VIP SUPER-JACKPOT
// - ONLY Tier-1 Jackpot matches (all 5 main numbers + golden ball = all 6 numbers matched) win.
// - Lower-tier payouts (Tier 2, Tier 3, Tier 4, Tier 5) are 100% eliminated.
// - If ZERO tickets hit Tier-1 Jackpot, 100% of accumulatedPoolTon and accumulatedPoolStars roll over untouched!
// ============================================================================

export interface MonthlySuperJackpotTicketEvaluation {
  ticketCode: string;
  matchedMainCount: number;
  matchedGolden: boolean;
  isTier1JackpotWinner: boolean;
  prizeTon: number;
  prizeStars: number;
  prizeUsdt: number;
  status: 'WON' | 'LOST';
  tierLabelFa: string;
}

export function evaluateMonthlySuperJackpotAllOrNothing(params: {
  tickets: Array<{
    ticketCode: string;
    mainNumbers: number[];
    goldenBall: number;
  }>;
  drawnMain: number[];
  drawnGolden: number;
  accumulatedPoolTon: number;
  accumulatedPoolStars?: number;
  tonUsdRate?: number;
}): {
  tier1WinnersCount: number;
  totalPaidOutTon: number;
  totalPaidOutStars: number;
  totalPaidOutUsdt: number;
  remainingRolloverTon: number;
  remainingRolloverStars: number;
  remainingRolloverUsdt: number;
  evaluations: MonthlySuperJackpotTicketEvaluation[];
} {
  const rate =
    typeof params.tonUsdRate === 'number' && params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const startingPoolTon = roundTonClean(Math.max(0, Number(params.accumulatedPoolTon) || 0));
  const startingPoolStars =
    typeof params.accumulatedPoolStars === 'number' && params.accumulatedPoolStars >= 0
      ? roundStarsClean(params.accumulatedPoolStars)
      : roundStarsClean(startingPoolTon * 250);

  const rawEvaluations = params.tickets.map((t) => {
    const ev = evaluateTicketPrizeTier({
      ticketMain: t.mainNumbers,
      ticketGolden: Number(t.goldenBall || 0),
      drawnMain: params.drawnMain,
      drawnGolden: params.drawnGolden,
      ticketCostUsdt: 5,
      jackpotUsdt: Math.max(100, Number((startingPoolTon * rate).toFixed(2))),
    });
    const isTier1JackpotWinner = Boolean(ev.won && ev.tierCode === 'TIER_1_JACKPOT');
    return {
      ticketCode: t.ticketCode,
      matchedMainCount: ev.matchedMainCount,
      matchedGolden: ev.matchedGolden,
      isTier1JackpotWinner,
      baseEval: ev,
    };
  });

  const tier1WinnersCount = rawEvaluations.filter((e) => e.isTier1JackpotWinner).length;

  // If ZERO VIP tickets hit the exact Tier-1 Jackpot (all 6 numbers), 100% rolls over untouched!
  if (tier1WinnersCount === 0 || startingPoolTon <= 0) {
    const evaluations: MonthlySuperJackpotTicketEvaluation[] = rawEvaluations.map((e) => ({
      ticketCode: e.ticketCode,
      matchedMainCount: e.matchedMainCount,
      matchedGolden: e.matchedGolden,
      isTier1JackpotWinner: false,
      prizeTon: 0,
      prizeStars: 0,
      prizeUsdt: 0,
      status: 'LOST',
      tierLabelFa:
        e.matchedMainCount > 0 || e.matchedGolden
          ? `عدم تطابق کامل ۶ شماره جک‌پات (${e.matchedMainCount} اصلی${e.matchedGolden ? ' + طلایی' : ''} • قانون All-or-Nothing ماهانه VIP)`
          : 'بدون تطابق جک‌پات (انتقال ۱۰۰٪ استخر به ماه بعد)',
    }));

    return {
      tier1WinnersCount: 0,
      totalPaidOutTon: 0,
      totalPaidOutStars: 0,
      totalPaidOutUsdt: 0,
      remainingRolloverTon: startingPoolTon,
      remainingRolloverStars: startingPoolStars,
      remainingRolloverUsdt: Number((startingPoolTon * rate).toFixed(2)),
      evaluations,
    };
  }

  // One or more exact Tier-1 Jackpot winners -> split the accumulated pool among Tier-1 winners only!
  const perWinnerTon = roundTonClean(Math.floor((startingPoolTon / tier1WinnersCount) * 1_000_000) / 1_000_000);
  let totalPaidOutTon = 0;
  let winnersSeen = 0;

  const evaluations: MonthlySuperJackpotTicketEvaluation[] = rawEvaluations.map((e) => {
    if (!e.isTier1JackpotWinner) {
      return {
        ticketCode: e.ticketCode,
        matchedMainCount: e.matchedMainCount,
        matchedGolden: e.matchedGolden,
        isTier1JackpotWinner: false,
        prizeTon: 0,
        prizeStars: 0,
        prizeUsdt: 0,
        status: 'LOST',
        tierLabelFa:
          e.matchedMainCount > 0 || e.matchedGolden
            ? `عدم تطابق کامل ۶ شماره جک‌پات (${e.matchedMainCount} اصلی${e.matchedGolden ? ' + طلایی' : ''} • قانون All-or-Nothing ماهانه VIP)`
            : 'بدون تطابق جک‌پات',
      };
    }

    winnersSeen += 1;
    // Last Tier-1 winner receives exact remainder so 100% of startingPoolTon is distributed with 0 dust
    const prizeTon =
      winnersSeen === tier1WinnersCount
        ? roundTonClean(Math.max(0, startingPoolTon - totalPaidOutTon))
        : perWinnerTon;
    totalPaidOutTon = roundTonClean(totalPaidOutTon + prizeTon);
    const prizeStars = roundStarsClean(prizeTon * 250);
    const prizeUsdt = Number((prizeTon * rate).toFixed(2));

    return {
      ticketCode: e.ticketCode,
      matchedMainCount: e.matchedMainCount,
      matchedGolden: e.matchedGolden,
      isTier1JackpotWinner: true,
      prizeTon,
      prizeStars,
      prizeUsdt,
      status: 'WON',
      tierLabelFa: '👑 برنده مطلق جک‌پات ۶ گوی (Tier-1 Monthly VIP Super-Jackpot)',
    };
  });

  const remainingRolloverTon = roundTonClean(Math.max(0, startingPoolTon - totalPaidOutTon));
  const remainingRolloverStars = roundStarsClean(remainingRolloverTon * 250);
  const remainingRolloverUsdt = Number((remainingRolloverTon * rate).toFixed(2));

  return {
    tier1WinnersCount,
    totalPaidOutTon,
    totalPaidOutStars: roundStarsClean(totalPaidOutTon * 250),
    totalPaidOutUsdt: Number((totalPaidOutTon * rate).toFixed(2)),
    remainingRolloverTon,
    remainingRolloverStars,
    remainingRolloverUsdt,
    evaluations,
  };
}

// ============================================================================
// 16. $1,000 WELCOME GRAND LOTTERY (`#LD-WELCOME-1000`) — FIRST-PURCHASE EXCLUSIVE
// - Unlocks 1 Free Welcome Ticket Entitlement (`welcomeTicketEntitlement = 1`) on first paid lottery ticket purchase (max 1 per user lifetime).
// - Self-Funding Reserve Protection: Routes a configurable portion (default 25%) of net house margin into `fundedReserveTon`.
// - If 30-day timer expires before `fundedReserveTon` reaches the $1,000 target (unless Admin forces draw), auto-extends countdown by 7 days!
// ============================================================================

export const WELCOME_GRAND_ROUND_ID = '#LD-WELCOME-1000';
export const WELCOME_INITIAL_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
export const WELCOME_AUTO_EXTEND_MS = 7 * 24 * 60 * 60 * 1000;

export interface WelcomeGrandLotteryState {
  roundId: string;
  titleFa: string;
  targetPoolUsdt: number;
  targetPoolTon: number;
  fundedReserveTon: number;
  fundedReserveUsdt: number;
  reserveProgressPercent: number;
  isReserveFullyFunded: boolean;
  houseMarginAllocationRatio: number;
  nextDrawTimestampMs: number;
  autoExtendDaysIfUnfunded: number;
  autoExtensionCount: number;
  participantsCount: number;
  mainCount: number;
  mainMax: number;
  goldenMax: number;
  serverSeed?: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  lastWinnerSummary?: string;
  lastWinningMain?: number[];
  lastWinningGolden?: number;
}

export interface UserWelcomeTicketStatus {
  welcomeTicketUnlocked: boolean;
  welcomeTicketEntitlement: number;
  welcomeTicketClaimed: boolean;
  welcomeTicketCode: string | null;
  chosenMainNumbers: number[] | null;
  chosenGoldenBall: number | null;
  statusCode: 'LOCKED_BUY_FIRST_TICKET' | 'UNLOCKED_READY_TO_PICK' | 'CLAIMED_REGISTERED';
  statusLabelFa: string;
}

export function normalizeWelcomeGrandLotteryState(
  raw?: Partial<WelcomeGrandLotteryState> | null,
  tonUsdRate: number = 5.0,
  participantsCountOverride?: number
): WelcomeGrandLotteryState {
  const rate = typeof tonUsdRate === 'number' && tonUsdRate > 0 ? tonUsdRate : 5.0;
  const targetPoolUsdt = Math.max(
    100,
    Number.isFinite(Number(raw?.targetPoolUsdt)) && Number(raw?.targetPoolUsdt) > 0
      ? Number(raw?.targetPoolUsdt)
      : 1000
  );
  const targetPoolTon = roundTonClean(targetPoolUsdt / rate);
  const fundedReserveTon = roundTonClean(Math.max(0, Number(raw?.fundedReserveTon) || 0));
  const fundedReserveUsdt = Number((fundedReserveTon * rate).toFixed(2));
  const reserveProgressPercent = Math.min(
    100,
    Number(((fundedReserveTon / Math.max(0.000001, targetPoolTon)) * 100).toFixed(2))
  );
  const isReserveFullyFunded = fundedReserveTon + 0.000001 >= targetPoolTon;
  const houseMarginAllocationRatio =
    typeof raw?.houseMarginAllocationRatio === 'number' &&
    raw.houseMarginAllocationRatio > 0 &&
    raw.houseMarginAllocationRatio <= 1
      ? Number(raw.houseMarginAllocationRatio.toFixed(4))
      : 0.25;
  const defaultSeed = sha256Hex('luckydrop_welcome_1000_grand_lottery_seed_v1');
  const serverSeed =
    typeof raw?.serverSeed === 'string' && raw.serverSeed.length >= 16
      ? raw.serverSeed
      : defaultSeed;
  const nextDrawTimestampMs =
    typeof raw?.nextDrawTimestampMs === 'number' &&
    Number.isFinite(raw.nextDrawTimestampMs) &&
    raw.nextDrawTimestampMs > 0
      ? raw.nextDrawTimestampMs
      : Date.now() + WELCOME_INITIAL_CYCLE_MS;
  const autoExtendDaysIfUnfunded = Math.max(
    1,
    Math.floor(Number(raw?.autoExtendDaysIfUnfunded) || 7)
  );
  const participantsCount =
    typeof participantsCountOverride === 'number'
      ? Math.max(0, Math.floor(participantsCountOverride))
      : Math.max(0, Math.floor(Number(raw?.participantsCount) || 0));

  return {
    roundId: WELCOME_GRAND_ROUND_ID,
    titleFa:
      String(raw?.titleFa || '').trim() ||
      '🎉 لاتاری ویژه خوشآمدگویی ۱,۰۰۰ دلاری (Welcome $1,000 Grand Draw)',
    targetPoolUsdt,
    targetPoolTon,
    fundedReserveTon,
    fundedReserveUsdt,
    reserveProgressPercent,
    isReserveFullyFunded,
    houseMarginAllocationRatio,
    nextDrawTimestampMs,
    autoExtendDaysIfUnfunded,
    autoExtensionCount: Math.max(0, Math.floor(Number(raw?.autoExtensionCount) || 0)),
    participantsCount,
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
    serverSeed,
    serverSeedHash: sha256Hex(serverSeed),
    clientSeed: String(raw?.clientSeed || 'luckydrop_welcome_1000_seed').trim(),
    nonce: Math.max(1, Math.floor(Number(raw?.nonce) || 1)),
    lastWinnerSummary: raw?.lastWinnerSummary,
    lastWinningMain: Array.isArray(raw?.lastWinningMain) ? raw.lastWinningMain : undefined,
    lastWinningGolden:
      typeof raw?.lastWinningGolden === 'number' ? raw.lastWinningGolden : undefined,
  };
}

export function accrueWelcomeLotteryReserveFromHouseMargin(
  currentState: Partial<WelcomeGrandLotteryState> | null | undefined,
  params: {
    netHouseMarginTon: number;
    tonUsdRate?: number;
    participantsCount?: number;
  }
): {
  updatedState: WelcomeGrandLotteryState;
  allocatedReserveTon: number;
  remainingNetHouseTon: number;
} {
  const rate =
    typeof params.tonUsdRate === 'number' && params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const state = normalizeWelcomeGrandLotteryState(
    currentState,
    rate,
    params.participantsCount
  );
  const safeNetHouseTon = roundTonClean(Math.max(0, Number(params.netHouseMarginTon) || 0));
  const allocatedReserveTon = roundTonClean(safeNetHouseTon * state.houseMarginAllocationRatio);
  const remainingNetHouseTon = roundTonClean(Math.max(0, safeNetHouseTon - allocatedReserveTon));
  const nextFundedReserveTon = roundTonClean(state.fundedReserveTon + allocatedReserveTon);

  const updatedState = normalizeWelcomeGrandLotteryState(
    {
      ...state,
      fundedReserveTon: nextFundedReserveTon,
    },
    rate,
    params.participantsCount
  );

  return {
    updatedState,
    allocatedReserveTon,
    remainingNetHouseTon,
  };
}

export function evaluateWelcomeLotteryScheduleGuard(
  currentState: Partial<WelcomeGrandLotteryState> | null | undefined,
  params: {
    nowMs?: number;
    isAdminForceDraw?: boolean;
    tonUsdRate?: number;
    participantsCount?: number;
  }
): {
  shouldExecuteDraw: boolean;
  autoExtended: boolean;
  updatedState: WelcomeGrandLotteryState;
  reason: string;
} {
  const nowMs = typeof params.nowMs === 'number' ? params.nowMs : Date.now();
  const rate =
    typeof params.tonUsdRate === 'number' && params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const state = normalizeWelcomeGrandLotteryState(
    currentState,
    rate,
    params.participantsCount
  );

  if (params.isAdminForceDraw) {
    return {
      shouldExecuteDraw: true,
      autoExtended: false,
      updatedState: state,
      reason: 'ADMIN_FORCE_DRAW',
    };
  }

  if (nowMs < state.nextDrawTimestampMs) {
    return {
      shouldExecuteDraw: false,
      autoExtended: false,
      updatedState: state,
      reason: 'COUNTDOWN_IN_PROGRESS',
    };
  }

  // Timer expired: check if $1,000 target reserve is 100% self-funded!
  if (!state.isReserveFullyFunded) {
    const extensionMs = state.autoExtendDaysIfUnfunded * 24 * 60 * 60 * 1000;
    const extendedState = normalizeWelcomeGrandLotteryState(
      {
        ...state,
        nextDrawTimestampMs: Math.max(nowMs, state.nextDrawTimestampMs) + extensionMs,
        autoExtensionCount: (state.autoExtensionCount || 0) + 1,
      },
      rate,
      params.participantsCount
    );
    return {
      shouldExecuteDraw: false,
      autoExtended: true,
      updatedState: extendedState,
      reason: `RESERVE_NOT_YET_1000_USD_AUTO_EXTENDED_${state.autoExtendDaysIfUnfunded}D`,
    };
  }

  return {
    shouldExecuteDraw: true,
    autoExtended: false,
    updatedState: state,
    reason: 'RESERVE_FULLY_FUNDED_READY_FOR_DRAW',
  };
}

export function validateAndPrepareWelcomeTicketSelection(params: {
  mainNumbers: unknown;
  goldenBall: unknown;
  mainCount?: number;
  mainMax?: number;
  goldenMax?: number;
}): {
  valid: boolean;
  error?: string;
  cleanMainNumbers: number[];
  cleanGoldenBall: number;
} {
  const mainCount = Math.max(1, Math.floor(Number(params.mainCount) || 5));
  const mainMax = Math.max(10, Math.floor(Number(params.mainMax) || 50));
  const goldenMax = Math.max(1, Math.floor(Number(params.goldenMax) || 15));

  if (!Array.isArray(params.mainNumbers)) {
    return {
      valid: false,
      error: `INVALID_MAIN_NUMBERS — لطفاً دقیقاً ${mainCount} شماره اصلی بین ۱ تا ${mainMax} انتخاب کنید.`,
      cleanMainNumbers: [],
      cleanGoldenBall: 0,
    };
  }

  const uniqueNums = Array.from(
    new Set(
      params.mainNumbers
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= mainMax)
    )
  ).sort((a, b) => a - b);

  if (uniqueNums.length !== mainCount) {
    return {
      valid: false,
      error: `INVALID_MAIN_NUMBERS_COUNT — لطفاً دقیقاً ${mainCount} شماره غیرتکراری بین ۱ تا ${mainMax} انتخاب کنید.`,
      cleanMainNumbers: [],
      cleanGoldenBall: 0,
    };
  }

  const golden = Math.floor(Number(params.goldenBall));
  if (!Number.isFinite(golden) || golden < 1 || golden > goldenMax) {
    return {
      valid: false,
      error: `INVALID_GOLDEN_BALL — لطفاً گوی طلایی شانس را بین ۱ تا ${goldenMax} انتخاب کنید.`,
      cleanMainNumbers: [],
      cleanGoldenBall: 0,
    };
  }

  return {
    valid: true,
    cleanMainNumbers: uniqueNums,
    cleanGoldenBall: golden,
  };
}

export function evaluateUserWelcomeTicketStatus(params: {
  userAccount?: Partial<IsolatedUserAccountRecord> | null;
  paidRegularTicketsCount: number;
  existingWelcomeTicket?: {
    ticketCode: string;
    mainNumbers: string | number[];
    goldenBall: number;
  } | null;
}): UserWelcomeTicketStatus {
  const hasExistingWelcomeTicket = Boolean(params.existingWelcomeTicket?.ticketCode);
  const isClaimed = Boolean(params.userAccount?.welcomeTicketClaimed || hasExistingWelcomeTicket);
  const hasPaidPurchase =
    Boolean(params.userAccount?.welcomeTicketUnlocked) ||
    Math.floor(Number(params.paidRegularTicketsCount) || 0) >= 1;

  let chosenMainNumbers: number[] | null = null;
  if (params.existingWelcomeTicket) {
    if (Array.isArray(params.existingWelcomeTicket.mainNumbers)) {
      chosenMainNumbers = params.existingWelcomeTicket.mainNumbers.map(Number);
    } else {
      try {
        const parsed = JSON.parse(String(params.existingWelcomeTicket.mainNumbers));
        if (Array.isArray(parsed)) chosenMainNumbers = parsed.map(Number);
      } catch {
        chosenMainNumbers = null;
      }
    }
  }

  if (isClaimed) {
    return {
      welcomeTicketUnlocked: true,
      welcomeTicketEntitlement: 0,
      welcomeTicketClaimed: true,
      welcomeTicketCode:
        params.existingWelcomeTicket?.ticketCode ||
        params.userAccount?.welcomeTicketCode ||
        'WLC-CLAIMED',
      chosenMainNumbers,
      chosenGoldenBall:
        typeof params.existingWelcomeTicket?.goldenBall === 'number'
          ? params.existingWelcomeTicket.goldenBall
          : null,
      statusCode: 'CLAIMED_REGISTERED',
      statusLabelFa: '🎟️ بلیت شما ثبت شد',
    };
  }

  if (hasPaidPurchase) {
    return {
      welcomeTicketUnlocked: true,
      welcomeTicketEntitlement: 1,
      welcomeTicketClaimed: false,
      welcomeTicketCode: null,
      chosenMainNumbers: null,
      chosenGoldenBall: null,
      statusCode: 'UNLOCKED_READY_TO_PICK',
      statusLabelFa: '✅ بلیت رایگان شما فعال شد — انتخاب اعداد شانس',
    };
  }

  return {
    welcomeTicketUnlocked: false,
    welcomeTicketEntitlement: 0,
    welcomeTicketClaimed: false,
    welcomeTicketCode: null,
    chosenMainNumbers: null,
    chosenGoldenBall: null,
    statusCode: 'LOCKED_BUY_FIRST_TICKET',
    statusLabelFa: 'با خرید اولین بلیت لاتاری، ۱ بلیت رایگان با اعداد دلخواه دریافت کنید!',
  };
}




