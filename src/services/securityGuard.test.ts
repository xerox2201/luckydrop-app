import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCleanZeroUserProfile,
  bindUserReferralAntiSybil,
  PerUserMutexRegistry,
  validateStrictFinancialAmount,
  verifyAndRecordDepositIdempotency,
  computeServerAuthoritativeGameOutcome,
  SlidingWindowRateLimiter,
  normalizeTonAddressToRaw,
  parseAndValidateTonBoc,
  verifyOnChainTonTransaction,
  type IsolatedUserAccountRecord,
} from './securityGuard.ts';
import { PAMSeamlessWalletEngine } from './pamWalletEngine.ts';
import { DEFAULT_FX_RATES } from '../utils/lotteryEngine.ts';
import { DEFAULT_TON_USD_RATE } from '../utils/telegramTma.ts';
import {
  WHEEL_SEGMENTS_16,
  calculateTowerStepMultiplier,
  deriveProvablyFairMinesBoard,
  deriveProvablyFairTowerBoard,
} from '../utils/provablyFair.ts';

test('1. Strict Per-User Account Isolation: new user starts with 100% clean zero state', () => {
  const userA = createCleanZeroUserProfile({
    telegramUserId: 100200301,
    displayName: 'Alice TG',
    username: 'alice_tg',
  });
  const userB = createCleanZeroUserProfile({
    telegramUserId: 100200302,
    displayName: 'Bob TG',
    username: 'bob_tg',
  });

  assert.equal(userA.tonBalance, 0);
  assert.equal(userA.starsBalance, 0);
  assert.equal(userA.bonusTokens, 0);
  assert.equal(userA.xp, 0);
  assert.deepEqual(userA.myTickets, []);
  assert.deepEqual(userA.ledger, []);
  assert.deepEqual(userA.completedQuests, []);
  assert.deepEqual(userA.referrals, []);
  assert.equal(userA.pamState.tonBalance, 0);
  assert.equal(userA.pamState.starsBalance, 0);

  // Mutating userA never leaks to userB
  userA.tonBalance = 25;
  assert.equal(userB.tonBalance, 0);
});

test('2. Per-User Atomic Mutex Lock prevents race-condition double-spend attacks', async () => {
  const mutex = new PerUserMutexRegistry();
  const pam = new PAMSeamlessWalletEngine({
    playerId: 'tg_999111',
    genesisTonBalance: 10,
    tonBalance: 10,
  });

  // Launch 10 concurrent 10 TON debit attempts simultaneously (race-condition attack)
  const attempts = Array.from({ length: 10 }, (_, idx) =>
    mutex.runExclusive('999111', async () => {
      // Simulate async DB/network delay inside critical section
      await new Promise((r) => setTimeout(r, 5));
      return pam.debit({
        transactionUuid: `race_tx_${idx}`,
        roundId: '#RACE-TEST',
        vertical: 'INSTANT_DICE_52',
        currency: 'TON',
        amountTon: 10,
      });
    })
  );

  const results = await Promise.all(attempts);
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  assert.equal(succeeded.length, 1, 'Exactly 1 debit must succeed');
  assert.equal(failed.length, 9, '9 concurrent race attempts must be rejected');
  assert.equal(pam.getState().tonBalance, 0, 'Final balance must be exactly 0 TON, never negative');
});

test('3. Strict Numeric Validation blocks NaN, Infinity, <= 0, negative bets, and over-balance wagers', () => {
  assert.equal(validateStrictFinancialAmount({ rawAmount: NaN }).valid, false);
  assert.equal(validateStrictFinancialAmount({ rawAmount: Infinity }).valid, false);
  assert.equal(validateStrictFinancialAmount({ rawAmount: -5 }).valid, false);
  assert.equal(validateStrictFinancialAmount({ rawAmount: 0 }).valid, false);
  assert.equal(validateStrictFinancialAmount({ rawAmount: 'abc' }).valid, false);
  assert.equal(
    validateStrictFinancialAmount({ rawAmount: 15, currency: 'TON', maxBalance: 10 }).valid,
    false
  );

  const validTon = validateStrictFinancialAmount({
    rawAmount: 0.1 + 0.2,
    currency: 'TON',
    maxBalance: 1.0,
  });
  assert.equal(validTon.valid, true);
  assert.equal(validTon.roundedAmount, 0.3);
});

test('4. Anti-Replay Deposit Idempotency Guard rejects duplicate TON BOC / Stars charge IDs with 409 Conflict', () => {
  const processedSet = new Set<string>();
  const persistedList: string[] = [];

  const first = verifyAndRecordDepositIdempotency({
    txIdentifier: '0x99887766554433221100aabbccddeeff',
    processedSet,
    persistedList,
  });
  assert.equal(first.allowed, true);
  assert.equal(first.status, 200);

  const replay = verifyAndRecordDepositIdempotency({
    txIdentifier: '0x99887766554433221100aabbccddeeff',
    processedSet,
    persistedList,
  });
  assert.equal(replay.allowed, false);
  assert.equal(replay.status, 409);
});

test('5. Server-Authoritative Game RNG ignores client-spoofed outcomes and multipliers', () => {
  const fixedSeed = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const result = computeServerAuthoritativeGameOutcome({
    gameId: 'HILO_3D',
    betAmountUsdt: 10,
    serverSeed: fixedSeed,
    clientSeed: 'player_seed',
    nonce: 1,
    hiloChoice: 'HIGHER',
    hiloBaseCard: 7,
    // Spoofed fields sent by an attacker:
    hiloWon: true,
    hiloMultiplier: 999999,
    won: true,
    multiplier: 999999,
    payoutUsdt: 9999990,
  });

  assert.ok(result.multiplier <= 12.74, 'Server must ignore spoofed 999999x multiplier');
  assert.equal(result.serverHmacVerified.length, 64);
});

test('6. Anti-Sybil Referral Tracking blocks self-referral and double-referral', () => {
  const usersMap: Record<string, IsolatedUserAccountRecord> = {};
  const inviter = createCleanZeroUserProfile({
    telegramUserId: '5001',
    displayName: 'Inviter',
  });
  const joiner = createCleanZeroUserProfile({
    telegramUserId: '5002',
    displayName: 'Joiner',
  });
  usersMap['5001'] = inviter;
  usersMap['5002'] = joiner;

  // Self-referral attempt must fail
  const selfAttempt = bindUserReferralAntiSybil({
    userAccount: joiner,
    rawReferralInput: 'ref_5002',
    usersMap,
  });
  assert.equal(selfAttempt.ok, false);
  assert.equal(selfAttempt.status, 400);

  // Valid first-time referral succeeds
  const validBind = bindUserReferralAntiSybil({
    userAccount: joiner,
    rawReferralInput: 'ref_5001',
    usersMap,
  });
  assert.equal(validBind.ok, true);
  assert.equal(joiner.referredByUserId, '5001');
  assert.deepEqual(inviter.referrals, ['5002']);

  // Second referral attempt on already-referred user fails with 409
  const duplicateBind = bindUserReferralAntiSybil({
    userAccount: joiner,
    rawReferralInput: 'ref_5003',
    usersMap,
  });
  assert.equal(duplicateBind.ok, false);
  assert.equal(duplicateBind.status, 409);
});

test('7. Sliding-Window Rate Limiter blocks burst spam with Retry-After', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 5000, maxRequests: 3 });
  assert.equal(limiter.check('ip:1.2.3.4', 1000).allowed, true);
  assert.equal(limiter.check('ip:1.2.3.4', 1100).allowed, true);
  assert.equal(limiter.check('ip:1.2.3.4', 1200).allowed, true);

  const blocked = limiter.check('ip:1.2.3.4', 1300);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
});

test('8. On-Chain TON Deposit Verifier rejects fake BOC strings, mismatched destination, and insufficient nanoTON', async () => {
  const treasuryFriendly = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';
  const treasuryRaw = '0:0000000000000000000000000000000000000000000000000000000000000000';

  assert.equal(normalizeTonAddressToRaw(treasuryFriendly), treasuryRaw);
  assert.equal(normalizeTonAddressToRaw(treasuryRaw), treasuryRaw);
  assert.equal(normalizeTonAddressToRaw('UQ_INVALID_ADDRESS'), null);

  // Fake non-empty BOC string must fail binary BOC validation
  const fakeBocCheck = parseAndValidateTonBoc('boc_fake_non_empty_string_1234567890');
  assert.equal(fakeBocCheck.valid, false);

  const fakeDepositAttempt = await verifyOnChainTonTransaction({
    boc: 'boc_fake_non_empty_string_1234567890',
    expectedDestinationWallet: treasuryFriendly,
    expectedAmountTon: 5,
  });
  assert.equal(fakeDepositAttempt.verified, false);
  assert.equal(fakeDepositAttempt.status, 400);

  const validTxHash = 'a'.repeat(64);

  // Mismatched destination wallet on-chain must be rejected
  const wrongDestAttempt = await verifyOnChainTonTransaction({
    txHash: validTxHash,
    expectedDestinationWallet: treasuryFriendly,
    expectedAmountTon: 5,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          hash: validTxHash,
          success: true,
          aborted: false,
          in_msg: {
            destination: { address: '0:' + 'f'.repeat(64) },
            source: { address: '0:' + '1'.repeat(64) },
            value: '5000000000',
          },
          out_msgs: [],
        }),
        { status: 200 }
      ),
  });
  assert.equal(wrongDestAttempt.verified, false);
  assert.ok(String(wrongDestAttempt.error || '').includes('DESTINATION_ADDRESS_MISMATCH'));

  // Insufficient nanoTON amount on-chain (e.g. sent 0.5 TON but claimed 5 TON) must be rejected
  const underpaidAttempt = await verifyOnChainTonTransaction({
    txHash: validTxHash,
    expectedDestinationWallet: treasuryFriendly,
    expectedAmountTon: 5,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          hash: validTxHash,
          success: true,
          aborted: false,
          in_msg: {
            destination: { address: treasuryRaw },
            source: { address: '0:' + '1'.repeat(64) },
            value: '500000000', // 0.5 TON in nanoTON instead of 5 TON (5_000_000_000)
          },
          out_msgs: [],
        }),
        { status: 200 }
      ),
  });
  assert.equal(underpaidAttempt.verified, false);
  assert.ok(String(underpaidAttempt.error || '').includes('NANOTON_AMOUNT_MISMATCH'));

  // Authentic on-chain transaction matching destination and exact nanoTON value succeeds
  const validOnChainAttempt = await verifyOnChainTonTransaction({
    txHash: validTxHash,
    expectedDestinationWallet: treasuryFriendly,
    expectedAmountTon: 5,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          hash: validTxHash,
          success: true,
          aborted: false,
          in_msg: {
            destination: { address: treasuryRaw },
            source: { address: '0:' + '2'.repeat(64) },
            value: '5000000000', // 5.000000000 TON
          },
          out_msgs: [],
        }),
        { status: 200 }
      ),
  });
  assert.equal(validOnChainAttempt.verified, true);
  assert.equal(validOnChainAttempt.status, 200);
  assert.equal(validOnChainAttempt.verifiedNanoTon, '5000000000');
  assert.equal(validOnChainAttempt.verifiedAmountTon, 5);
});

test('9. Phase 1 RTP Math Calibration: Wheel 3D (98%), Tower HARD (98%), Unified TON=5.0', () => {
  assert.equal(DEFAULT_TON_USD_RATE, 5.0);
  assert.equal(DEFAULT_FX_RATES.TON, 5.0);

  for (const risk of ['LOW', 'MEDIUM', 'HIGH'] as const) {
    const segments = WHEEL_SEGMENTS_16[risk];
    assert.equal(segments.length, 16);
    const sum = Number(segments.reduce((acc, v) => acc + v, 0).toFixed(2));
    assert.equal(sum, 15.68, `Wheel 3D ${risk} must sum to 15.68 (98.0% RTP)`);
  }

  // Tower HARD: 2 columns (1 safe, 1 trap) -> stepRatio = 2 -> 2^1 * 0.98 = 1.96x
  assert.equal(calculateTowerStepMultiplier('HARD', 1), 1.96);
  assert.equal(calculateTowerStepMultiplier('HARD', 2), 3.92);
});

test('10. Deterministic Mines & Tower Sequence Verification blocks bomb/trap picks from paying out', () => {
  const serverSeed = 'b1c2d3e4f5a60718293a4b5c6d7e8f90b1c2d3e4f5a60718293a4b5c6d7e8f90';
  const clientSeed = 'audit_player';
  const nonce = 42;

  const minesBoard = deriveProvablyFairMinesBoard({
    serverSeed,
    clientSeed,
    nonce,
    minesCount: 5,
  });
  const bombIndex = minesBoard.mineIndices[0];
  const safeIndices = Array.from({ length: 25 }, (_, i) => i).filter(
    (i) => !minesBoard.mineIndices.includes(i)
  );

  // Attempting to claim cashout with a bomb tile in selectedTiles must result in 0 payout
  const bombAttempt = computeServerAuthoritativeGameOutcome({
    gameId: 'MINES',
    betAmountUsdt: 10,
    serverSeed,
    clientSeed,
    nonce,
    minesCount: 5,
    selectedTiles: [safeIndices[0], bombIndex],
  });
  assert.equal(bombAttempt.won, false);
  assert.equal(bombAttempt.payoutUsdt, 0);

  // Valid safe tiles sequence succeeds
  const safeAttempt = computeServerAuthoritativeGameOutcome({
    gameId: 'MINES',
    betAmountUsdt: 10,
    serverSeed,
    clientSeed,
    nonce,
    minesCount: 5,
    selectedTiles: [safeIndices[0], safeIndices[1]],
  });
  assert.equal(safeAttempt.won, true);
  assert.ok(safeAttempt.payoutUsdt > 10);

  // Tower HARD deterministic column check
  const towerBoard = deriveProvablyFairTowerBoard({
    serverSeed,
    clientSeed,
    nonce,
    difficulty: 'HARD',
  });
  const floor0TrapCol = towerBoard.trapColumnsPerFloor[0];
  const floor0SafeCol = floor0TrapCol === 0 ? 1 : 0;

  const towerTrapAttempt = computeServerAuthoritativeGameOutcome({
    gameId: 'TOWER_3D',
    betAmountUsdt: 10,
    serverSeed,
    clientSeed,
    nonce,
    towerDifficulty: 'HARD',
    selectedColumns: [floor0TrapCol],
  });
  assert.equal(towerTrapAttempt.won, false);
  assert.equal(towerTrapAttempt.payoutUsdt, 0);

  const towerSafeAttempt = computeServerAuthoritativeGameOutcome({
    gameId: 'TOWER_3D',
    betAmountUsdt: 10,
    serverSeed,
    clientSeed,
    nonce,
    towerDifficulty: 'HARD',
    selectedColumns: [floor0SafeCol],
  });
  assert.equal(towerSafeAttempt.won, true);
  assert.equal(towerSafeAttempt.multiplier, 1.96);
  assert.equal(towerSafeAttempt.payoutUsdt, 19.6);
});


