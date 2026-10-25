/**
 * CORE PAM (PLAYER ACCOUNT MANAGEMENT) & SEAMLESS SINGLE WALLET ENGINE
 * ---------------------------------------------------------------------
 * Production-grade iGaming & iLottery Seamless Single Wallet + Ledger Engine.
 * Implements the 7 standard iGaming PAM wallet operations:
 *   1. authenticate
 *   2. balance
 *   3. debit      (Bet / Lottery Ticket Purchase)
 *   4. credit     (Win Payout / Deposit)
 *   5. rollback   (Refund voided / failed rounds with Tombstone protection)
 *   6. bonus      (Free bet / Loyalty / Referral credit tokens)
 *   7. reconcile  (Full mathematical audit of ledger from genesis balance)
 *
 * Features:
 * - Strict Idempotency via `transaction_uuid` and `reference_transaction_uuid`
 * - Out-of-order Rollback Tombstone protection (`tombstonedUuids`) so delayed
 *   debits arriving after a rollback are rejected without corrupting balances
 * - Browser IndexedDB + LocalStorage persistence + Backend API synchronization
 */

import {
  ProvablyFairSeedState,
  generateCryptographicServerSeed,
  sha256Hex,
} from '../utils/provablyFair.ts';

export type PAMTransactionType = 'DEBIT' | 'CREDIT' | 'ROLLBACK' | 'BONUS';

export type PAMGameVertical =
  | 'LUCKYDROP_LOTTERY'
  | 'INSTANT_DICE_52'
  | 'INSTANT_GOLDEN_COIN'
  | 'INSTANT_CRASH_X'
  | 'CRYPTO_TREASURY'
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
  amountUsdt: number;
  balanceBeforeUsdt: number;
  balanceAfterUsdt: number;
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
  genesisBalanceUsdt: number;
  totalDebitsUsdt: number;
  totalCreditsUsdt: number;
  totalRollbacksUsdt: number;
  totalBonusesUsdt: number;
  computedLedgerBalanceUsdt: number;
  actualWalletBalanceUsdt: number;
  discrepancyUsdt: number;
  ledgerEntriesCount: number;
  tombstonesCount: number;
  auditedAt: string;
}

export interface PAMPlayerState {
  playerId: string;
  displayName: string;
  vipTier: string;
  currency: 'USDT';
  genesisBalanceUsdt: number;
  balanceUsdt: number;
  bonusTokensUsdt: number;
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
  balanceUsdt: number;
  bonusTokensUsdt: number;
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

function roundUsdt(val: number): number {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

/**
 * Pure, deterministic PAM Seamless Wallet & Ledger Engine.
 * Can be instantiated on the server (backed by disk/SQLite) or on the client (backed by IndexedDB).
 */
export class PAMSeamlessWalletEngine {
  private state: PAMPlayerState;

  constructor(initialState?: Partial<PAMPlayerState>) {
    const initialServerSeed =
      initialState?.seeds?.serverSeed ||
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    const initialClientSeed = initialState?.seeds?.clientSeed || 'luckydrop_vip_client_seed_777';
    const genesis =
      typeof initialState?.genesisBalanceUsdt === 'number'
        ? roundUsdt(initialState.genesisBalanceUsdt)
        : 3030.3;
    const startingBalance =
      typeof initialState?.balanceUsdt === 'number'
        ? roundUsdt(initialState.balanceUsdt)
        : genesis;

    this.state = {
      playerId: initialState?.playerId || 'vip-demo-user',
      displayName: initialState?.displayName || 'کامران سهرابی (VIP)',
      vipTier: initialState?.vipTier || 'DIAMOND VIP',
      currency: 'USDT',
      genesisBalanceUsdt: genesis,
      balanceUsdt: startingBalance,
      bonusTokensUsdt: roundUsdt(initialState?.bonusTokensUsdt ?? 25.0),
      sessionToken: initialState?.sessionToken || `pam_sess_${sha256Hex(initialServerSeed).slice(0, 24)}`,
      authenticatedAt: initialState?.authenticatedAt || new Date().toISOString(),
      seeds: initialState?.seeds || {
        serverSeed: initialServerSeed,
        serverSeedHash: sha256Hex(initialServerSeed),
        clientSeed: initialClientSeed,
        nonce: 1,
      },
      ledger: Array.isArray(initialState?.ledger) ? [...initialState!.ledger] : [],
      tombstones: initialState?.tombstones ? { ...initialState.tombstones } : {},
    };
  }

  public getState(): PAMPlayerState {
    return this.state;
  }

  public hydrateState(nextState: PAMPlayerState): void {
    this.state = nextState;
  }

  // --------------------------------------------------------------------------
  // OPERATION 1: AUTHENTICATE
  // --------------------------------------------------------------------------
  public authenticate(params?: {
    playerId?: string;
    displayName?: string;
    vipTier?: string;
  }): PAMOperationResponse {
    if (params?.playerId) this.state.playerId = params.playerId;
    if (params?.displayName) this.state.displayName = params.displayName;
    if (params?.vipTier) this.state.vipTier = params.vipTier;
    this.state.authenticatedAt = new Date().toISOString();

    return {
      ok: true,
      operation: 'AUTHENTICATE',
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      seeds: this.state.seeds,
      playerState: this.state,
    };
  }

  // --------------------------------------------------------------------------
  // OPERATION 2: BALANCE
  // --------------------------------------------------------------------------
  public balance(): PAMOperationResponse {
    return {
      ok: true,
      operation: 'BALANCE',
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      seeds: this.state.seeds,
    };
  }

  // --------------------------------------------------------------------------
  // OPERATION 3: DEBIT (Bet / Lottery Ticket Purchase)
  // --------------------------------------------------------------------------
  public debit(params: {
    transactionUuid: string;
    roundId: string;
    vertical: PAMGameVertical | string;
    amountUsdt: number;
    note?: string;
    incrementNonce?: boolean;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return {
        ok: false,
        operation: 'DEBIT',
        error: 'MISSING_TRANSACTION_UUID',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    const amount = roundUsdt(params.amountUsdt);
    if (amount <= 0) {
      return {
        ok: false,
        operation: 'DEBIT',
        error: 'INVALID_DEBIT_AMOUNT',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    // 1. Tombstone Check: Has an out-of-order ROLLBACK already tombstoned this transactionUuid?
    if (this.state.tombstones[txUuid]) {
      return {
        ok: false,
        operation: 'DEBIT',
        tombstoneBlocked: true,
        error: 'TRANSACTION_TOMBSTONED_BY_PRIOR_ROLLBACK',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    // 2. Strict Idempotency Check: Has this exact transactionUuid already been processed?
    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      if (existing.type !== 'DEBIT') {
        return {
          ok: false,
          operation: 'DEBIT',
          error: 'TRANSACTION_UUID_TYPE_CONFLICT',
          balanceUsdt: this.state.balanceUsdt,
          bonusTokensUsdt: this.state.bonusTokensUsdt,
        };
      }
      return {
        ok: true,
        operation: 'DEBIT',
        idempotentReplay: true,
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
        ledgerEntry: existing,
      };
    }

    // 3. Sufficient Funds Check
    if (this.state.balanceUsdt < amount) {
      return {
        ok: false,
        operation: 'DEBIT',
        error: 'INSUFFICIENT_BALANCE',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    const balanceBefore = this.state.balanceUsdt;
    const balanceAfter = roundUsdt(balanceBefore - amount);
    this.state.balanceUsdt = balanceAfter;

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
      amountUsdt: amount,
      balanceBeforeUsdt: balanceBefore,
      balanceAfterUsdt: balanceAfter,
      status: 'COMPLETED',
      note: params.note || `Debit for ${params.vertical} (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return {
      ok: true,
      operation: 'DEBIT',
      idempotentReplay: false,
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      ledgerEntry: entry,
      seeds: this.state.seeds,
    };
  }

  // --------------------------------------------------------------------------
  // OPERATION 4: CREDIT (Win Payout / Deposit Settlement)
  // --------------------------------------------------------------------------
  public credit(params: {
    transactionUuid: string;
    referenceTransactionUuid?: string | null;
    roundId: string;
    vertical: PAMGameVertical | string;
    amountUsdt: number;
    note?: string;
    allowZeroWinRecord?: boolean;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return {
        ok: false,
        operation: 'CREDIT',
        error: 'MISSING_TRANSACTION_UUID',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    const amount = roundUsdt(params.amountUsdt);
    if (amount < 0 || (amount === 0 && !params.allowZeroWinRecord)) {
      return {
        ok: false,
        operation: 'CREDIT',
        error: 'INVALID_CREDIT_AMOUNT',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    // 1. Strict Idempotency Check
    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      if (existing.type !== 'CREDIT') {
        return {
          ok: false,
          operation: 'CREDIT',
          error: 'TRANSACTION_UUID_TYPE_CONFLICT',
          balanceUsdt: this.state.balanceUsdt,
          bonusTokensUsdt: this.state.bonusTokensUsdt,
        };
      }
      return {
        ok: true,
        operation: 'CREDIT',
        idempotentReplay: true,
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
        ledgerEntry: existing,
      };
    }

    // 2. Reference Transaction Validation (if linked to a prior DEBIT bet/ticket)
    const refUuid = params.referenceTransactionUuid ? params.referenceTransactionUuid.trim() : null;
    if (refUuid) {
      if (this.state.tombstones[refUuid]) {
        return {
          ok: false,
          operation: 'CREDIT',
          tombstoneBlocked: true,
          error: 'REFERENCED_DEBIT_WAS_ROLLED_BACK',
          balanceUsdt: this.state.balanceUsdt,
          bonusTokensUsdt: this.state.bonusTokensUsdt,
        };
      }
    }

    const balanceBefore = this.state.balanceUsdt;
    const balanceAfter = roundUsdt(balanceBefore + amount);
    this.state.balanceUsdt = balanceAfter;

    const entry: PAMLedgerEntry = {
      id: Date.now() + this.state.ledger.length,
      timestamp: new Date().toISOString(),
      playerId: this.state.playerId,
      vertical: params.vertical,
      roundId: params.roundId || '#ROUND',
      transactionUuid: txUuid,
      referenceTransactionUuid: refUuid,
      type: 'CREDIT',
      amountUsdt: amount,
      balanceBeforeUsdt: balanceBefore,
      balanceAfterUsdt: balanceAfter,
      status: 'COMPLETED',
      note: params.note || `Credit win/settlement for ${params.vertical} (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return {
      ok: true,
      operation: 'CREDIT',
      idempotentReplay: false,
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      ledgerEntry: entry,
    };
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
      return {
        ok: false,
        operation: 'ROLLBACK',
        error: 'MISSING_ROLLBACK_OR_REFERENCE_UUID',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    // 1. Idempotency: Has this rollback transactionUuid or referenceTransactionUuid already been rolled back?
    const existingRollback = this.state.ledger.find(
      (e) =>
        e.type === 'ROLLBACK' &&
        (e.transactionUuid === txUuid || e.referenceTransactionUuid === refUuid)
    );
    if (existingRollback) {
      return {
        ok: true,
        operation: 'ROLLBACK',
        idempotentReplay: true,
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
        ledgerEntry: existingRollback,
      };
    }

    // 2. Look up the original DEBIT entry
    const originalDebit = this.state.ledger.find(
      (e) => e.transactionUuid === refUuid && e.type === 'DEBIT'
    );

    if (!originalDebit) {
      // Out-of-order arrival! The DEBIT hasn't arrived yet.
      // Register a preemptive Tombstone so that if the delayed DEBIT arrives later, it is blocked!
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
        amountUsdt: 0,
        balanceBeforeUsdt: this.state.balanceUsdt,
        balanceAfterUsdt: this.state.balanceUsdt,
        status: 'TOMBSTONED_NOOP',
        note:
          params.note ||
          `Preemptive Tombstone registered for unseen Debit (${refUuid}) — Balance untouched`,
      };

      this.state.ledger.unshift(tombstoneEntry);
      return {
        ok: true,
        operation: 'ROLLBACK',
        idempotentReplay: false,
        tombstoneBlocked: true,
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
        ledgerEntry: tombstoneEntry,
      };
    }

    // 3. Original DEBIT exists -> refund exact debited amount and tombstone refUuid
    const refundAmount = roundUsdt(originalDebit.amountUsdt);
    const balanceBefore = this.state.balanceUsdt;
    const balanceAfter = roundUsdt(balanceBefore + refundAmount);
    this.state.balanceUsdt = balanceAfter;

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
      amountUsdt: refundAmount,
      balanceBeforeUsdt: balanceBefore,
      balanceAfterUsdt: balanceAfter,
      status: 'COMPLETED',
      note: params.note || `Rollback refund of Debit ${refUuid}`,
    };

    this.state.ledger.unshift(rollbackEntry);
    return {
      ok: true,
      operation: 'ROLLBACK',
      idempotentReplay: false,
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      ledgerEntry: rollbackEntry,
    };
  }

  // --------------------------------------------------------------------------
  // OPERATION 6: BONUS (Free Bet / Loyalty Chest / Referral Credit)
  // --------------------------------------------------------------------------
  public bonus(params: {
    transactionUuid: string;
    roundId: string;
    vertical: PAMGameVertical | string;
    amountUsdt: number;
    creditToRealBalance?: boolean;
    note?: string;
  }): PAMOperationResponse {
    const txUuid = (params.transactionUuid || '').trim();
    if (!txUuid) {
      return {
        ok: false,
        operation: 'BONUS',
        error: 'MISSING_TRANSACTION_UUID',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    const amount = roundUsdt(params.amountUsdt);
    if (amount <= 0) {
      return {
        ok: false,
        operation: 'BONUS',
        error: 'INVALID_BONUS_AMOUNT',
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
      };
    }

    const existing = this.state.ledger.find((e) => e.transactionUuid === txUuid);
    if (existing) {
      return {
        ok: true,
        operation: 'BONUS',
        idempotentReplay: true,
        balanceUsdt: this.state.balanceUsdt,
        bonusTokensUsdt: this.state.bonusTokensUsdt,
        ledgerEntry: existing,
      };
    }

    const balanceBefore = this.state.balanceUsdt;
    const creditReal = params.creditToRealBalance !== false;
    const balanceAfter = creditReal ? roundUsdt(balanceBefore + amount) : balanceBefore;

    if (creditReal) {
      this.state.balanceUsdt = balanceAfter;
    } else {
      this.state.bonusTokensUsdt = roundUsdt(this.state.bonusTokensUsdt + amount);
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
      amountUsdt: amount,
      balanceBeforeUsdt: balanceBefore,
      balanceAfterUsdt: balanceAfter,
      status: 'COMPLETED',
      note: params.note || `VIP Bonus / Loyalty Credit (${params.roundId})`,
    };

    this.state.ledger.unshift(entry);
    return {
      ok: true,
      operation: 'BONUS',
      idempotentReplay: false,
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      ledgerEntry: entry,
    };
  }

  // --------------------------------------------------------------------------
  // OPERATION 7: RECONCILE (Mathematical Audit of Ledger from Genesis)
  // --------------------------------------------------------------------------
  public reconcile(): PAMOperationResponse {
    let totalDebitsUsdt = 0;
    let totalCreditsUsdt = 0;
    let totalRollbacksUsdt = 0;
    let totalBonusesUsdt = 0;

    for (const entry of this.state.ledger) {
      if (entry.type === 'DEBIT') {
        totalDebitsUsdt = roundUsdt(totalDebitsUsdt + entry.amountUsdt);
      } else if (entry.type === 'CREDIT') {
        totalCreditsUsdt = roundUsdt(totalCreditsUsdt + entry.amountUsdt);
      } else if (entry.type === 'ROLLBACK') {
        totalRollbacksUsdt = roundUsdt(totalRollbacksUsdt + entry.amountUsdt);
      } else if (entry.type === 'BONUS') {
        // Only count bonuses that changed balanceAfterUsdt
        if (entry.balanceAfterUsdt > entry.balanceBeforeUsdt) {
          totalBonusesUsdt = roundUsdt(totalBonusesUsdt + entry.amountUsdt);
        }
      }
    }

    const computedLedgerBalanceUsdt = roundUsdt(
      this.state.genesisBalanceUsdt -
        totalDebitsUsdt +
        totalCreditsUsdt +
        totalRollbacksUsdt +
        totalBonusesUsdt
    );

    const discrepancyUsdt = roundUsdt(this.state.balanceUsdt - computedLedgerBalanceUsdt);
    const reconciled = Math.abs(discrepancyUsdt) < 0.001;

    const report: PAMReconciliationReport = {
      reconciled,
      playerId: this.state.playerId,
      genesisBalanceUsdt: this.state.genesisBalanceUsdt,
      totalDebitsUsdt,
      totalCreditsUsdt,
      totalRollbacksUsdt,
      totalBonusesUsdt,
      computedLedgerBalanceUsdt,
      actualWalletBalanceUsdt: this.state.balanceUsdt,
      discrepancyUsdt,
      ledgerEntriesCount: this.state.ledger.length,
      tombstonesCount: Object.keys(this.state.tombstones).length,
      auditedAt: new Date().toISOString(),
    };

    return {
      ok: reconciled,
      operation: 'RECONCILE',
      balanceUsdt: this.state.balanceUsdt,
      bonusTokensUsdt: this.state.bonusTokensUsdt,
      reconciliation: report,
    };
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

const IDB_DB_NAME = 'LuckyDrop_PAM_Database_v1';
const IDB_STORE_NAME = 'pam_wallet_state';
const IDB_KEY = 'primary_player_pam_state';
const LS_FALLBACK_KEY = 'luckydrop_pam_wallet_state_v1';

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
    if (fromIdb && typeof fromIdb.balanceUsdt === 'number') {
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
