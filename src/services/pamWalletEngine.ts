/**
 * CORE PAM (PLAYER ACCOUNT MANAGEMENT) & SEAMLESS DUAL-CURRENCY WALLET ENGINE
 * ----------------------------------------------------------------------------
 * Production-grade iGaming & Telegram Mini App (TMA) Seamless Wallet + Ledger Engine.
 * Strictly tracks and enforces `tonBalance` (💎 TON) and `starsBalance` (⭐ Stars)
 * as the sole two wallet currencies across the backend and ledger:
 *   1. authenticate
 *   2. balance
 *   3. debit      (Bet / Lottery Ticket Purchase in TON or Stars)
 *   4. credit     (Win Payout / Deposit in TON or Stars)
 *   5. rollback   (Refund voided / failed rounds with Tombstone protection)
 *   6. bonus      (Free bet / Loyalty / Referral credit in TON or Stars)
 *   7. reconcile  (Full mathematical audit of TON & Stars ledger from genesis balances)
 */

import {
  ProvablyFairSeedState,
  generateCryptographicServerSeed,
  sha256Hex,
} from '../utils/provablyFair.ts';

export type PAMTransactionType = 'DEBIT' | 'CREDIT' | 'ROLLBACK' | 'BONUS';
export type PAMCurrency = 'TON' | 'STARS';

export type PAMGameVertical =
  | 'LUCKYDROP_LOTTERY'
  | 'INSTANT_DICE_52'
  | 'INSTANT_GOLDEN_COIN'
  | 'INSTANT_CRASH_X'
  | 'CRYPTO_TREASURY'
  | 'TELEGRAM_STARS_INVOICE'
  | 'VIP_LOYALTY_BONUS'
  | 'AFFILIATE_REFERRAL';

export interface PAMLedgerEntry {
  id: number;
  timestamp: string;
  playerId: string;
  vertical: PAMGameVertical | string;
  roundId: string;
  transactionUuid: string;
  referenceTransactionUuid: string | null;
  type: PAMTransactionType;
  currency: PAMCurrency;
  amountTon: number;
  amountStars: number;
  tonBalanceBefore: number;
  tonBalanceAfter: number;
  starsBalanceBefore: number;
  starsBalanceAfter: number;
  status: 'COMPLETED' | 'TOMBSTONED_NOOP' | 'IDEMPOTENT_REPLAY';
  note: string;
}

export interface PAMTombstoneRecord {
  referenceTransactionUuid: string;
  rollbackTransactionUuid: string;
  roundId: string;
  vertical: string;
  createdAt: string;
  reason: 'REFUNDED_EXISTING_DEBIT' | 'PREEMPTIVE_OUT_OF_ORDER_TOMBSTONE';
}

export interface PAMReconciliationReport {
  reconciled: boolean;
  playerId: string;
  genesisTonBalance: number;
  genesisStarsBalance: number;
  totalDebitsTon: number;
  totalCreditsTon: number;
  totalRollbacksTon: number;
  totalBonusesTon: number;
  computedLedgerTonBalance: number;
  actualTonBalance: number;
  discrepancyTon: number;
  totalDebitsStars: number;
  totalCreditsStars: number;
  totalRollbacksStars: number;
  totalBonusesStars: number;
  computedLedgerStarsBalance: number;
  actualStarsBalance: number;
  discrepancyStars: number;
  ledgerEntriesCount: number;
  tombstonesCount: number;
  auditedAt: string;
}

export interface PAMPlayerState {
  playerId: string;
  displayName: string;
  vipTier: string;
  currency: PAMCurrency;
  tonUsdRate: number;
  starsUsdRate: number;
  genesisTonBalance: number;
  genesisStarsBalance: number;
  tonBalance: number;
  starsBalance: number;
  referralEarningsTon: number;
  referralEarningsStars: number;
  bonusTokensTon: number;
  sessionToken: string;
  authenticatedAt: string;
  seeds: ProvablyFairSeedState;
  ledger: PAMLedgerEntry[];
  tombstones: Record<string, PAMTombstoneRecord>;
}

export interface PAMOperationResponse {
  ok: boolean;
  operation:
    | 'AUTHENTICATE'
    | 'BALANCE'
    | 'DEBIT'
    | 'CREDIT'
    | 'ROLLBACK'
    | 'BONUS'
    | 'RECONCILE';
  idempotentReplay?: boolean;
  tombstoneBlocked?: boolean;
  error?: string;
  currency: PAMCurrency;
  tonBalance: number;
  starsBalance: number;
  referralEarningsTon: number;
  referralEarningsStars: number;
  bonusTokensTon: number;
  ledgerEntry?: PAMLedgerEntry;
  reconciliation?: PAMReconciliationReport;
  seeds?: ProvablyFairSeedState;
  playerState?: PAMPlayerState;
}

export function generateDeterministicUuid(prefix: string = 'tx'): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random()
          .toString(16)
          .slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

function roundTon(val: number): number {
  return Math.round((Number(val) + Number.EPSILON) * 10000) / 10000;
}

function roundStars(val: number): number {
  return Math.max(0, Math.round(Number(val) || 0));
}

/**
 * Pure, deterministic PAM Dual-Currency (💎 TON & ⭐ Stars) Seamless Wallet & Ledger Engine.
 */
export class PAMSeamlessWalletEngine {
  private state: PAMPlayerState;

  constructor(initialState?: Partial<PAMPlayerState>) {
    const initialServerSeed =
      initialState?.seeds?.serverSeed ||
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    const initialClientSeed = initialState?.seeds?.clientSeed || 'luckydrop_vip_client_seed_777';

    const tonRate =
      typeof initialState?.tonUsdRate === 'number' && initialState.tonUsdRate > 0
        ? initialState.tonUsdRate
        : 5.0;
    const starsRate =
      typeof initialState?.starsUsdRate === 'number' && initialState.starsUsdRate > 0
        ? initialState.starsUsdRate
        : 0.02;

    const genesisTon =
      typeof initialState?.genesisTonBalance === 'number'
        ? roundTon(initialState.genesisTonBalance)
        : 606.06;

    const startingTon =
      typeof initialState?.tonBalance === 'number'
        ? roundTon(initialState.tonBalance)
        : genesisTon;

    const genesisStars =
      typeof initialState?.genesisStarsBalance === 'number'
        ? roundStars(initialState.genesisStarsBalance)
        : 2500;

    const startingStars =
      typeof initialState?.starsBalance === 'number'
        ? roundStars(initialState.starsBalance)
        : genesisStars;

    const normalizedLedger: PAMLedgerEntry[] = Array.isArray(initialState?.ledger)
      ? initialState!.ledger.map((e) => {
          const cur: PAMCurrency = e.currency === 'STARS' ? 'STARS' : 'TON';
          const amtTon = typeof e.amountTon === 'number' ? roundTon(e.amountTon) : 0;
          const amtStars = typeof e.amountStars === 'number' ? roundStars(e.amountStars) : 0;
          const tonBefore = typeof e.tonBalanceBefore === 'number' ? roundTon(e.tonBalanceBefore) : startingTon;
          const tonAfter = typeof e.tonBalanceAfter === 'number' ? roundTon(e.tonBalanceAfter) : startingTon;
          const starsBefore =
            typeof e.starsBalanceBefore === 'number' ? roundStars(e.starsBalanceBefore) : startingStars;
          const starsAfter =
            typeof e.starsBalanceAfter === 'number' ? roundStars(e.starsBalanceAfter) : startingStars;
          return {
            ...e,
            currency: cur,
            amountTon: amtTon,
            amountStars: amtStars,
            tonBalanceBefore: tonBefore,
            tonBalanceAfter: tonAfter,
            starsBalanceBefore: starsBefore,
            starsBalanceAfter: starsAfter,
          };
        })
      : [];

    this.state = {
      playerId: initialState?.playerId || 'vip-demo-user',
      displayName: initialState?.displayName || 'کامران سهرابی (VIP)',
      vipTier: initialState?.vipTier || 'DIAMOND VIP',
      currency: initialState?.currency === 'STARS' ? 'STARS' : 'TON',
      tonUsdRate: tonRate,
      starsUsdRate: starsRate,
      genesisTonBalance: genesisTon,
      genesisStarsBalance: genesisStars,
      tonBalance: startingTon,
      starsBalance: startingStars,
      referralEarningsTon: roundTon(initialState?.referralEarningsTon ?? 3.68),
      referralEarningsStars: roundStars(initialState?.referralEarningsStars ?? 0),
      bonusTokensTon: roundTon(initialState?.bonusTokensTon ?? 5.0),
      sessionToken:
        initialState?.sessionToken || `pam_sess_${sha256Hex(initialServerSeed).slice(0, 24)}`,
      authenticatedAt: initialState?.authenticatedAt || new Date().toISOString(),
      seeds: initialState?.seeds || {
        serverSeed: initialServerSeed,
        serverSeedHash: sha256Hex(initialServerSeed),
        clientSeed: initialClientSeed,
        nonce: 1,
      },
      ledger: normalizedLedger,
      tombstones: initialState?.tombstones ? { ...initialState.tombstones } : {},
    };
  }

  private buildResponse(
    ok: boolean,
    operation: PAMOperationResponse['operation'],
    extra?: Partial<PAMOperationResponse>
  ): PAMOperationResponse {
    return {
      ok,
      operation,
      currency: this.state.currency,
      tonBalance: this.state.tonBalance,
      starsBalance: this.state.starsBalance,
      referralEarningsTon: this.state.referralEarningsTon,
      referralEarningsStars: this.state.referralEarningsStars,
      bonusTokensTon: this.state.bonusTokensTon,
      ...extra,
    };
  }

  public getState(): PAMPlayerState {
    return this.state;
  }

  public hydrateState(nextState: PAMPlayerState): void {
    const hydrated = new PAMSeamlessWalletEngine(nextState);
    this.state = hydrated.getState();
  }

  // --------------------------------------------------------------------------
  // OPERATION 1: AUTHENTICATE
  // --------------------------------------------------------------------------
  public authenticate(params?: {
    playerId?: string;
    displayName?: string;
    vipTier?: string;
    currency?: PAMCurrency;
  }): PAMOperationResponse {
    if (params?.playerId) this.state.playerId = params.playerId;
    if (params?.displayName) this.state.displayName = params.displayName;
    if (params?.vipTier) this.state.vipTier = params.vipTier;
    if (params?.currency === 'TON' || params?.currency === 'STARS') {
      this.state.currency = params.currency;
    }
    this.state.authenticatedAt = new Date().toISOString();

    return this.buildResponse(true, 'AUTHENTICATE', {
      seeds: this.state.seeds,
      playerState: this.state,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 2: BALANCE
  // --------------------------------------------------------------------------
  public balance(): PAMOperationResponse {
    return this.buildResponse(true, 'BALANCE', {
      seeds: this.state.seeds,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 3: DEBIT (Bet / Lottery Ticket Purchase in TON or STARS)
  // --------------------------------------------------------------------------
  public debit(params: {
    transactionUuid: string;
    roundId: string;
    vertical: PAMGameVertical | string;
    currency?: PAMCurrency;
    amountTon?: number;
    amountStars?: number;
    amountUsdt?: number;
    note?: string;
    incrementNonce?: boolean;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return this.buildResponse(false, 'DEBIT', { error: 'MISSING_TRANSACTION_UUID' });
    }

    const activeCurrency: PAMCurrency = params.currency === 'STARS' ? 'STARS' : 'TON';
    const rawUsdt = Number(params.amountUsdt || 0);

    const debitTon =
      activeCurrency === 'TON'
        ? roundTon(
            typeof params.amountTon === 'number' && params.amountTon > 0
              ? params.amountTon
              : rawUsdt / this.state.tonUsdRate
          )
        : 0;

    const debitStars =
      activeCurrency === 'STARS'
        ? roundStars(
            typeof params.amountStars === 'number' && params.amountStars > 0
              ? params.amountStars
              : rawUsdt / this.state.starsUsdRate
          )
        : 0;

    if ((activeCurrency === 'TON' && debitTon <= 0) || (activeCurrency === 'STARS' && debitStars <= 0)) {
      return this.buildResponse(false, 'DEBIT', { error: 'INVALID_DEBIT_AMOUNT' });
    }

    // 1. Tombstone Check
    if (this.state.tombstones[txUuid]) {
      return this.buildResponse(false, 'DEBIT', {
        tombstoneBlocked: true,
        error: 'TRANSACTION_TOMBSTONED_BY_PRIOR_ROLLBACK',
      });
    }

    // 2. Strict Idempotency Check
    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      if (existing.type !== 'DEBIT') {
        return this.buildResponse(false, 'DEBIT', { error: 'TRANSACTION_UUID_TYPE_CONFLICT' });
      }
      return this.buildResponse(true, 'DEBIT', {
        idempotentReplay: true,
        ledgerEntry: existing,
      });
    }

    // 3. Sufficient Funds Check in Active Currency (TON or STARS)
    if (activeCurrency === 'TON' && this.state.tonBalance < debitTon) {
      return this.buildResponse(false, 'DEBIT', { error: 'INSUFFICIENT_BALANCE' });
    }
    if (activeCurrency === 'STARS' && this.state.starsBalance < debitStars) {
      return this.buildResponse(false, 'DEBIT', { error: 'INSUFFICIENT_STARS_BALANCE' });
    }

    const tonBefore = this.state.tonBalance;
    const starsBefore = this.state.starsBalance;
    const tonAfter = activeCurrency === 'TON' ? roundTon(tonBefore - debitTon) : tonBefore;
    const starsAfter = activeCurrency === 'STARS' ? roundStars(starsBefore - debitStars) : starsBefore;

    this.state.tonBalance = tonAfter;
    this.state.starsBalance = starsAfter;

    if (params.incrementNonce !== false) {
      this.state.seeds.nonce += 1;
    }

    const entry: PAMLedgerEntry = {
      id: Date.now() + this.state.ledger.length,
      timestamp: new Date().toISOString(),
      playerId: this.state.playerId,
      vertical: params.vertical,
      roundId: params.roundId || '#ROUND',
      transactionUuid: txUuid,
      referenceTransactionUuid: null,
      type: 'DEBIT',
      currency: activeCurrency,
      amountTon: debitTon,
      amountStars: debitStars,
      tonBalanceBefore: tonBefore,
      tonBalanceAfter: tonAfter,
      starsBalanceBefore: starsBefore,
      starsBalanceAfter: starsAfter,
      status: 'COMPLETED',
      note: params.note || `Debit (${activeCurrency}) for ${params.vertical} (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return this.buildResponse(true, 'DEBIT', {
      idempotentReplay: false,
      ledgerEntry: entry,
      seeds: this.state.seeds,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 4: CREDIT (Win Payout / Deposit Settlement in TON or STARS)
  // --------------------------------------------------------------------------
  public credit(params: {
    transactionUuid: string;
    referenceTransactionUuid?: string | null;
    roundId: string;
    vertical: PAMGameVertical | string;
    currency?: PAMCurrency;
    amountTon?: number;
    amountStars?: number;
    amountUsdt?: number;
    note?: string;
    allowZeroWinRecord?: boolean;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return this.buildResponse(false, 'CREDIT', { error: 'MISSING_TRANSACTION_UUID' });
    }

    const activeCurrency: PAMCurrency = params.currency === 'STARS' ? 'STARS' : 'TON';
    const rawUsdt = Number(params.amountUsdt || 0);

    const creditTon =
      activeCurrency === 'TON'
        ? roundTon(
            typeof params.amountTon === 'number' && params.amountTon >= 0
              ? params.amountTon
              : rawUsdt / this.state.tonUsdRate
          )
        : 0;

    const creditStars =
      activeCurrency === 'STARS'
        ? roundStars(
            typeof params.amountStars === 'number' && params.amountStars >= 0
              ? params.amountStars
              : rawUsdt / this.state.starsUsdRate
          )
        : 0;

    if (
      (activeCurrency === 'TON' && (creditTon < 0 || (creditTon === 0 && !params.allowZeroWinRecord))) ||
      (activeCurrency === 'STARS' && (creditStars < 0 || (creditStars === 0 && !params.allowZeroWinRecord)))
    ) {
      return this.buildResponse(false, 'CREDIT', { error: 'INVALID_CREDIT_AMOUNT' });
    }

    // 1. Strict Idempotency Check
    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      if (existing.type !== 'CREDIT') {
        return this.buildResponse(false, 'CREDIT', { error: 'TRANSACTION_UUID_TYPE_CONFLICT' });
      }
      return this.buildResponse(true, 'CREDIT', {
        idempotentReplay: true,
        ledgerEntry: existing,
      });
    }

    // 2. Reference Transaction Validation
    const refUuid = params.referenceTransactionUuid ? params.referenceTransactionUuid.trim() : null;
    if (refUuid && this.state.tombstones[refUuid]) {
      return this.buildResponse(false, 'CREDIT', {
        tombstoneBlocked: true,
        error: 'REFERENCED_DEBIT_WAS_ROLLED_BACK',
      });
    }

    const tonBefore = this.state.tonBalance;
    const starsBefore = this.state.starsBalance;
    const tonAfter = activeCurrency === 'TON' ? roundTon(tonBefore + creditTon) : tonBefore;
    const starsAfter = activeCurrency === 'STARS' ? roundStars(starsBefore + creditStars) : starsBefore;

    this.state.tonBalance = tonAfter;
    this.state.starsBalance = starsAfter;

    const entry: PAMLedgerEntry = {
      id: Date.now() + this.state.ledger.length,
      timestamp: new Date().toISOString(),
      playerId: this.state.playerId,
      vertical: params.vertical,
      roundId: params.roundId || '#ROUND',
      transactionUuid: txUuid,
      referenceTransactionUuid: refUuid,
      type: 'CREDIT',
      currency: activeCurrency,
      amountTon: creditTon,
      amountStars: creditStars,
      tonBalanceBefore: tonBefore,
      tonBalanceAfter: tonAfter,
      starsBalanceBefore: starsBefore,
      starsBalanceAfter: starsAfter,
      status: 'COMPLETED',
      note: params.note || `Credit (${activeCurrency}) for ${params.vertical} (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return this.buildResponse(true, 'CREDIT', {
      idempotentReplay: false,
      ledgerEntry: entry,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 5: ROLLBACK (Refund Voided/Failed Round + Tombstone Protection)
  // --------------------------------------------------------------------------
  public rollback(params: {
    transactionUuid: string;
    referenceTransactionUuid: string;
    roundId: string;
    vertical: PAMGameVertical | string;
    note?: string;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    const refUuid = (params.referenceTransactionUuid || '').trim();

    if (!txUuid || !refUuid) {
      return this.buildResponse(false, 'ROLLBACK', {
        error: 'MISSING_ROLLBACK_OR_REFERENCE_UUID',
      });
    }

    const existingRollback = this.state.ledger.find(
      (e) =>
        e.type === 'ROLLBACK' &&
        (e.transactionUuid === txUuid || e.referenceTransactionUuid === refUuid)
    );
    if (existingRollback) {
      return this.buildResponse(true, 'ROLLBACK', {
        idempotentReplay: true,
        ledgerEntry: existingRollback,
      });
    }

    const originalDebit = this.state.ledger.find(
      (e) => e.transactionUuid === refUuid && e.type === 'DEBIT'
    );

    if (!originalDebit) {
      this.state.tombstones[refUuid] = {
        referenceTransactionUuid: refUuid,
        rollbackTransactionUuid: txUuid,
        roundId: params.roundId || '#ROUND',
        vertical: params.vertical,
        createdAt: new Date().toISOString(),
        reason: 'PREEMPTIVE_OUT_OF_ORDER_TOMBSTONE',
      };

      const tombstoneEntry: PAMLedgerEntry = {
        id: Date.now() + this.state.ledger.length,
        timestamp: new Date().toISOString(),
        playerId: this.state.playerId,
        vertical: params.vertical,
        roundId: params.roundId || '#ROUND',
        transactionUuid: txUuid,
        referenceTransactionUuid: refUuid,
        type: 'ROLLBACK',
        currency: 'TON',
        amountTon: 0,
        amountStars: 0,
        tonBalanceBefore: this.state.tonBalance,
        tonBalanceAfter: this.state.tonBalance,
        starsBalanceBefore: this.state.starsBalance,
        starsBalanceAfter: this.state.starsBalance,
        status: 'TOMBSTONED_NOOP',
        note:
          params.note ||
          `Preemptive Tombstone registered for unseen Debit (${refUuid}) — Balance untouched`,
      };

      this.state.ledger.unshift(tombstoneEntry);
      return this.buildResponse(true, 'ROLLBACK', {
        idempotentReplay: false,
        tombstoneBlocked: true,
        ledgerEntry: tombstoneEntry,
      });
    }

    const refundCurrency: PAMCurrency = originalDebit.currency === 'STARS' ? 'STARS' : 'TON';
    const refundTon = refundCurrency === 'TON' ? roundTon(originalDebit.amountTon) : 0;
    const refundStars = refundCurrency === 'STARS' ? roundStars(originalDebit.amountStars) : 0;

    const tonBefore = this.state.tonBalance;
    const starsBefore = this.state.starsBalance;
    const tonAfter = refundCurrency === 'TON' ? roundTon(tonBefore + refundTon) : tonBefore;
    const starsAfter = refundCurrency === 'STARS' ? roundStars(starsBefore + refundStars) : starsBefore;

    this.state.tonBalance = tonAfter;
    this.state.starsBalance = starsAfter;

    this.state.tombstones[refUuid] = {
      referenceTransactionUuid: refUuid,
      rollbackTransactionUuid: txUuid,
      roundId: params.roundId || originalDebit.roundId,
      vertical: params.vertical || originalDebit.vertical,
      createdAt: new Date().toISOString(),
      reason: 'REFUNDED_EXISTING_DEBIT',
    };

    const rollbackEntry: PAMLedgerEntry = {
      id: Date.now() + this.state.ledger.length,
      timestamp: new Date().toISOString(),
      playerId: this.state.playerId,
      vertical: params.vertical || originalDebit.vertical,
      roundId: params.roundId || originalDebit.roundId,
      transactionUuid: txUuid,
      referenceTransactionUuid: refUuid,
      type: 'ROLLBACK',
      currency: refundCurrency,
      amountTon: refundTon,
      amountStars: refundStars,
      tonBalanceBefore: tonBefore,
      tonBalanceAfter: tonAfter,
      starsBalanceBefore: starsBefore,
      starsBalanceAfter: starsAfter,
      status: 'COMPLETED',
      note: params.note || `Rollback refund of Debit ${refUuid}`,
    };

    this.state.ledger.unshift(rollbackEntry);
    return this.buildResponse(true, 'ROLLBACK', {
      idempotentReplay: false,
      ledgerEntry: rollbackEntry,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 6: BONUS (Free Bet / Loyalty Chest / Referral Credit in TON or STARS)
  // --------------------------------------------------------------------------
  public bonus(params: {
    transactionUuid: string;
    roundId: string;
    vertical: PAMGameVertical | string;
    currency?: PAMCurrency;
    amountTon?: number;
    amountStars?: number;
    amountUsdt?: number;
    creditToRealBalance?: boolean;
    note?: string;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return this.buildResponse(false, 'BONUS', { error: 'MISSING_TRANSACTION_UUID' });
    }

    const activeCurrency: PAMCurrency =
      params.currency === 'STARS' || params.vertical === 'TELEGRAM_STARS_INVOICE' ? 'STARS' : 'TON';
    const rawUsdt = Number(params.amountUsdt || 0);

    const bonusTon =
      activeCurrency === 'TON'
        ? roundTon(
            typeof params.amountTon === 'number' && params.amountTon > 0
              ? params.amountTon
              : rawUsdt / this.state.tonUsdRate
          )
        : 0;

    const bonusStars =
      activeCurrency === 'STARS'
        ? roundStars(
            typeof params.amountStars === 'number' && params.amountStars > 0
              ? params.amountStars
              : rawUsdt / this.state.starsUsdRate
          )
        : 0;

    if ((activeCurrency === 'TON' && bonusTon <= 0) || (activeCurrency === 'STARS' && bonusStars <= 0)) {
      return this.buildResponse(false, 'BONUS', { error: 'INVALID_BONUS_AMOUNT' });
    }

    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      return this.buildResponse(true, 'BONUS', {
        idempotentReplay: true,
        ledgerEntry: existing,
      });
    }

    const creditReal = params.creditToRealBalance !== false;
    const tonBefore = this.state.tonBalance;
    const starsBefore = this.state.starsBalance;

    let tonAfter = tonBefore;
    let starsAfter = starsBefore;

    if (activeCurrency === 'STARS') {
      starsAfter = roundStars(starsBefore + bonusStars);
      this.state.starsBalance = starsAfter;
    } else if (creditReal) {
      tonAfter = roundTon(tonBefore + bonusTon);
      this.state.tonBalance = tonAfter;
    } else {
      this.state.bonusTokensTon = roundTon(this.state.bonusTokensTon + bonusTon);
    }

    const entry: PAMLedgerEntry = {
      id: Date.now() + this.state.ledger.length,
      timestamp: new Date().toISOString(),
      playerId: this.state.playerId,
      vertical: params.vertical,
      roundId: params.roundId || '#BONUS',
      transactionUuid: txUuid,
      referenceTransactionUuid: null,
      type: 'BONUS',
      currency: activeCurrency,
      amountTon: bonusTon,
      amountStars: bonusStars,
      tonBalanceBefore: tonBefore,
      tonBalanceAfter: tonAfter,
      starsBalanceBefore: starsBefore,
      starsBalanceAfter: starsAfter,
      status: 'COMPLETED',
      note: params.note || `VIP Bonus / Loyalty Credit (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return this.buildResponse(true, 'BONUS', {
      idempotentReplay: false,
      ledgerEntry: entry,
    });
  }

  // --------------------------------------------------------------------------
  // OPERATION 7: RECONCILE (Mathematical Audit of TON & Stars Ledger from Genesis)
  // --------------------------------------------------------------------------
  public reconcile(): PAMOperationResponse {
    let totalDebitsTon = 0;
    let totalCreditsTon = 0;
    let totalRollbacksTon = 0;
    let totalBonusesTon = 0;

    let totalDebitsStars = 0;
    let totalCreditsStars = 0;
    let totalRollbacksStars = 0;
    let totalBonusesStars = 0;

    for (const entry of this.state.ledger) {
      if (entry.currency === 'STARS') {
        if (entry.type === 'DEBIT') {
          totalDebitsStars = roundStars(totalDebitsStars + entry.amountStars);
        } else if (entry.type === 'CREDIT') {
          totalCreditsStars = roundStars(totalCreditsStars + entry.amountStars);
        } else if (entry.type === 'ROLLBACK') {
          totalRollbacksStars = roundStars(totalRollbacksStars + entry.amountStars);
        } else if (entry.type === 'BONUS' && entry.starsBalanceAfter > entry.starsBalanceBefore) {
          totalBonusesStars = roundStars(totalBonusesStars + entry.amountStars);
        }
      } else {
        if (entry.type === 'DEBIT') {
          totalDebitsTon = roundTon(totalDebitsTon + entry.amountTon);
        } else if (entry.type === 'CREDIT') {
          totalCreditsTon = roundTon(totalCreditsTon + entry.amountTon);
        } else if (entry.type === 'ROLLBACK') {
          totalRollbacksTon = roundTon(totalRollbacksTon + entry.amountTon);
        } else if (entry.type === 'BONUS' && entry.tonBalanceAfter > entry.tonBalanceBefore) {
          totalBonusesTon = roundTon(totalBonusesTon + entry.amountTon);
        }
      }
    }

    const computedLedgerTonBalance = roundTon(
      this.state.genesisTonBalance -
        totalDebitsTon +
        totalCreditsTon +
        totalRollbacksTon +
        totalBonusesTon
    );

    const computedLedgerStarsBalance = roundStars(
      this.state.genesisStarsBalance -
        totalDebitsStars +
        totalCreditsStars +
        totalRollbacksStars +
        totalBonusesStars
    );

    const discrepancyTon = roundTon(this.state.tonBalance - computedLedgerTonBalance);
    const discrepancyStars = roundStars(this.state.starsBalance - computedLedgerStarsBalance);
    const reconciled = Math.abs(discrepancyTon) < 0.01 && Math.abs(discrepancyStars) === 0;

    const report: PAMReconciliationReport = {
      reconciled,
      playerId: this.state.playerId,
      genesisTonBalance: this.state.genesisTonBalance,
      genesisStarsBalance: this.state.genesisStarsBalance,
      totalDebitsTon,
      totalCreditsTon,
      totalRollbacksTon,
      totalBonusesTon,
      computedLedgerTonBalance,
      actualTonBalance: this.state.tonBalance,
      discrepancyTon,
      totalDebitsStars,
      totalCreditsStars,
      totalRollbacksStars,
      totalBonusesStars,
      computedLedgerStarsBalance,
      actualStarsBalance: this.state.starsBalance,
      discrepancyStars,
      ledgerEntriesCount: this.state.ledger.length,
      tombstonesCount: Object.keys(this.state.tombstones).length,
      auditedAt: new Date().toISOString(),
    };

    return this.buildResponse(reconciled, 'RECONCILE', {
      reconciliation: report,
    });
  }

  // --------------------------------------------------------------------------
  // PROVABLY FAIR SEED COMMITMENT MANAGEMENT
  // --------------------------------------------------------------------------
  public updateClientSeed(newClientSeed: string): ProvablyFairSeedState {
    const clean = (newClientSeed || '').trim();
    if (clean.length >= 2) {
      this.state.seeds.clientSeed = clean;
    }
    return this.state.seeds;
  }

  public rotateServerSeed(customNewServerSeed?: string): ProvablyFairSeedState {
    const oldSeed = this.state.seeds.serverSeed;
    const oldHash = this.state.seeds.serverSeedHash;
    const oldClient = this.state.seeds.clientSeed;
    const oldNonce = this.state.seeds.nonce;

    const nextServerSeed = customNewServerSeed || generateCryptographicServerSeed();
    this.state.seeds = {
      serverSeed: nextServerSeed,
      serverSeedHash: sha256Hex(nextServerSeed),
      clientSeed: oldClient,
      nonce: 1,
      previousServerSeed: oldSeed,
      previousServerSeedHash: oldHash,
      previousClientSeed: oldClient,
      previousNonce: oldNonce,
    };
    return this.state.seeds;
  }
}

// ============================================================================
// BROWSER INDEXEDDB + LOCALSTORAGE PERSISTENCE LAYER
// ============================================================================

const IDB_DB_NAME = 'LuckyDrop_PAM_Database_v2';
const IDB_STORE_NAME = 'pam_wallet_state';
const IDB_KEY = 'primary_player_pam_state_ton_stars';
const LS_FALLBACK_KEY = 'luckydrop_pam_wallet_state_ton_stars_v2';

export async function savePAMStateToIndexedDB(state: PAMPlayerState): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // ignore quota error
  }

  if (typeof window.indexedDB === 'undefined') return;

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
          tx.objectStore(IDB_STORE_NAME).put(state, IDB_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadPAMStateFromIndexedDB(): Promise<PAMPlayerState | null> {
  if (typeof window === 'undefined') return null;

  if (typeof window.indexedDB !== 'undefined') {
    const fromIdb = await new Promise<PAMPlayerState | null>((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction(IDB_STORE_NAME, 'readonly');
            const getReq = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
            getReq.onsuccess = () => {
              db.close();
              resolve((getReq.result as PAMPlayerState) || null);
            };
            getReq.onerror = () => {
              db.close();
              resolve(null);
            };
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (fromIdb && typeof fromIdb.tonBalance === 'number') {
      return fromIdb;
    }
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      return JSON.parse(raw) as PAMPlayerState;
    }
  } catch {
    // ignore
  }
  return null;
}
