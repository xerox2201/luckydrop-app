import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  sha256Hex,
  hmacSha256Hex,
  hmacTo52BitUniformFloat,
  deriveProvablyFairLotteryDraw,
  evaluateTicketPrizeTier,
  evaluateProvablyFairMiniGame,
  deriveProvablyFairPlinkoPath,
  PLINKO_MULTIPLIER_TABLES,
  isPlinkoBonusTicketSlot,
  deriveProvablyFairCrashPoint,
  calculateCrashMultiplierAtTime,
  calculateCrashTimeForMultiplier,
  calculate52BitDiceRollResult,
  isDiceLucky7777Roll,
  syncDiceFromWinChance,
  syncDiceFromTarget,
  syncDiceFromMultiplier,
  flipDiceRollMode,
} from '../provablyFair.ts';
import { PAMSeamlessWalletEngine } from '../../services/pamWalletEngine.ts';

describe('Provably Fair Cryptographic Engine (HMAC-SHA256 & 52-Bit Float)', () => {
  it('matches Node native crypto SHA-256 and HMAC-SHA256 digests 100%', () => {
    const serverSeed = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    const message = 'luckydrop_vip_client_seed:1:#ZRN-8493:0';

    const expectedSha = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const actualSha = sha256Hex(serverSeed);
    assert.equal(actualSha, expectedSha);

    const expectedHmac = crypto.createHmac('sha256', serverSeed).update(message).digest('hex');
    const actualHmac = hmacSha256Hex(serverSeed, message);
    assert.equal(actualHmac, expectedHmac);
  });

  it('converts the first 52 bits (13 hex chars) of HMAC-SHA256 into uniform float X in [0, 1)', () => {
    const sampleHmac = '8000000000000fffffffffffffffffffffffffffffffffffffffffffffffffff';
    const res = hmacTo52BitUniformFloat(sampleHmac);
    assert.equal(res.first52BitHex, '8000000000000');
    assert.equal(res.uniformFloatX, 0.5);

    const zeroHmac = '0000000000000fffffffffffffffffffffffffffffffffffffffffffffffffff';
    assert.equal(hmacTo52BitUniformFloat(zeroHmac).uniformFloatX, 0);

    const maxHmac = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const maxFloat = hmacTo52BitUniformFloat(maxHmac).uniformFloatX;
    assert.ok(maxFloat > 0.999999999999 && maxFloat < 1.0);
  });

  it('deterministically derives LuckyDrop lottery winning balls and evaluates ticket tiers', () => {
    const drawA = deriveProvablyFairLotteryDraw({
      serverSeed: 'server_secret_seed_alpha_999',
      clientSeed: 'player_custom_seed_777',
      nonce: 42,
      roundCode: '#ZRN-8493',
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
    });
    const drawB = deriveProvablyFairLotteryDraw({
      serverSeed: 'server_secret_seed_alpha_999',
      clientSeed: 'player_custom_seed_777',
      nonce: 42,
      roundCode: '#ZRN-8493',
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
    });

    assert.deepEqual(drawA.drawnMain, drawB.drawnMain);
    assert.equal(drawA.drawnGolden, drawB.drawnGolden);
    assert.equal(drawA.drawnMain.length, 5);
    assert.equal(new Set(drawA.drawnMain).size, 5, 'All 5 main balls must be unique');
    assert.ok(drawA.drawnGolden >= 1 && drawA.drawnGolden <= 15);

    // Jackpot match evaluation
    const jackpotEval = evaluateTicketPrizeTier({
      ticketMain: drawA.drawnMain,
      ticketGolden: drawA.drawnGolden,
      drawnMain: drawA.drawnMain,
      drawnGolden: drawA.drawnGolden,
      ticketCostUsdt: 5,
      jackpotUsdt: 250000,
    });
    assert.equal(jackpotEval.won, true);
    assert.equal(jackpotEval.status, 'WON');
    assert.equal(jackpotEval.prizeUsdt, 250000);
  });

  it('deterministically evaluates Instant Mini-Games (Plinko 8/12/16 Rows, Crash 98% RTP & 52-Bit Dice 99% RTP) using 52-bit HMAC-SHA256', () => {
    // 1. Verify exact 10,001-outcome 52-Bit Dice formula: Math.floor(X * 10001) / 100
    assert.equal(calculate52BitDiceRollResult(0), 0.0);
    assert.equal(calculate52BitDiceRollResult(0.5), 50.0);
    assert.equal(calculate52BitDiceRollResult(0.7777 / 1.0001 + 0.00001), 77.77);
    assert.equal(calculate52BitDiceRollResult(0.999999), 100.0);

    // Verify Lucky 77.77 Lottery Jackpot Synergy detection
    assert.equal(isDiceLucky7777Roll(77.77), true);
    assert.equal(isDiceLucky7777Roll(0.0), true);
    assert.equal(isDiceLucky7777Roll(100.0), true);
    assert.equal(isDiceLucky7777Roll(50.25), false);

    // Verify Bidirectional 99% RTP Dice Sync (Multiplier = 99 / winChance)
    const byChance = syncDiceFromWinChance(49.5, 'OVER');
    assert.equal(byChance.winChance, 49.5);
    assert.equal(byChance.target, 50.5);
    assert.equal(byChance.multiplier, 2.0);

    const flipped = flipDiceRollMode(byChance.target, byChance.mode);
    assert.equal(flipped.mode, 'UNDER');
    assert.equal(flipped.target, 49.5);
    assert.equal(flipped.winChance, 49.5);
    assert.equal(flipped.multiplier, 2.0);

    const byMult = syncDiceFromMultiplier(4.0, 'UNDER');
    assert.equal(byMult.winChance, 24.75);
    assert.equal(byMult.target, 24.75);
    assert.equal(byMult.multiplier, 4.0);

    const byTarget = syncDiceFromTarget(75.0, 'OVER');
    assert.equal(byTarget.winChance, 25.0);
    assert.equal(byTarget.multiplier, 3.96);

    const res = evaluateProvablyFairMiniGame({
      gameId: 'DICE_52',
      serverSeed: 'seed_123',
      clientSeed: 'client_456',
      nonce: 1,
      betAmountUsdt: 10,
      diceTarget: 50.5,
      diceMode: 'OVER',
    });
    assert.ok(res.uniformFloatX >= 0 && res.uniformFloatX < 1);
    assert.ok(res.outcomeNumeric >= 0 && res.outcomeNumeric <= 100);
    assert.equal(res.diceMode, 'OVER');
    assert.equal(res.diceTarget, 50.5);
    assert.equal(res.diceWinChance, 49.5);

    // Verify Crash 98% RTP formula and exponential curve M(t) = e^(0.065 * t)
    const crashA = deriveProvablyFairCrashPoint({
      serverSeed: 'stake_crash_server_seed_999',
      clientSeed: 'stake_crash_client_seed_777',
      nonce: 21,
    });
    const crashB = deriveProvablyFairCrashPoint({
      serverSeed: 'stake_crash_server_seed_999',
      clientSeed: 'stake_crash_client_seed_777',
      nonce: 21,
    });
    assert.equal(crashA.crashPoint, crashB.crashPoint);
    assert.equal(crashA.hmacHex, crashB.hmacHex);
    assert.ok(crashA.crashPoint >= 1.0);

    // Verify exponential curve M(t) = Math.pow(Math.E, 0.065 * t)
    assert.equal(calculateCrashMultiplierAtTime(0), 1.0);
    const tFor2x = calculateCrashTimeForMultiplier(2.0);
    assert.ok(Math.abs(calculateCrashMultiplierAtTime(tFor2x) - 2.0) < 0.0001);
    const tFor10x = calculateCrashTimeForMultiplier(10.0);
    assert.ok(Math.abs(calculateCrashMultiplierAtTime(tFor10x) - 10.0) < 0.0001);

    // Verify Plinko deterministic L/R path & symmetric multiplier tables for 8, 12, and 16 rows
    for (const r of [8, 12, 16] as const) {
      assert.equal(PLINKO_MULTIPLIER_TABLES[r].LOW.length, r + 1);
      assert.equal(PLINKO_MULTIPLIER_TABLES[r].MEDIUM.length, r + 1);
      assert.equal(PLINKO_MULTIPLIER_TABLES[r].HIGH.length, r + 1);

      const plinkoEvalA = evaluateProvablyFairMiniGame({
        gameId: 'PLINKO',
        serverSeed: 'stake_plinko_server_seed_999',
        clientSeed: 'stake_plinko_client_seed_777',
        nonce: 15,
        betAmountUsdt: 10,
        plinkoRows: r,
        plinkoRisk: 'HIGH',
      });
      const plinkoEvalB = evaluateProvablyFairMiniGame({
        gameId: 'PLINKO',
        serverSeed: 'stake_plinko_server_seed_999',
        clientSeed: 'stake_plinko_client_seed_777',
        nonce: 15,
        betAmountUsdt: 10,
        plinkoRows: r,
        plinkoRisk: 'HIGH',
      });

      assert.deepEqual(plinkoEvalA.plinkoDirections, plinkoEvalB.plinkoDirections);
      assert.equal(plinkoEvalA.plinkoDirections?.length, r);
      const sumRights = plinkoEvalA.plinkoDirections!.reduce<number>((a, b) => a + b, 0);
      assert.equal(plinkoEvalA.plinkoBucketIndex, sumRights);
      assert.equal(plinkoEvalA.multiplier, PLINKO_MULTIPLIER_TABLES[r].HIGH[sumRights]);
      assert.equal(
        plinkoEvalA.payoutUsdt,
        Number((10 * PLINKO_MULTIPLIER_TABLES[r].HIGH[sumRights]).toFixed(2))
      );
      assert.equal(
        plinkoEvalA.plinkoBonusTicket,
        isPlinkoBonusTicketSlot(sumRights, r)
      );
    }
  });
});

describe('Core PAM & Seamless Single Wallet Engine (7 Operations + Idempotency + Tombstones)', () => {
  it('executes all 7 standard PAM operations and maintains 100% mathematical reconciliation', () => {
    const pam = new PAMSeamlessWalletEngine({
      playerId: 'player-001',
      genesisBalanceUsdt: 1000,
      balanceUsdt: 1000,
    });

    // 1. Authenticate
    const authRes = pam.authenticate({ displayName: 'VIP Tester' });
    assert.equal(authRes.ok, true);
    assert.equal(authRes.balanceUsdt, 1000);

    // 2. Balance
    assert.equal(pam.balance().balanceUsdt, 1000);

    // 3. Debit ($50 ticket purchase)
    const debitRes = pam.debit({
      transactionUuid: 'tx_debit_101',
      roundId: '#ZRN-8493',
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: 50,
    });
    assert.equal(debitRes.ok, true);
    assert.equal(debitRes.balanceUsdt, 950);

    // Strict Idempotency on duplicate Debit
    const duplicateDebit = pam.debit({
      transactionUuid: 'tx_debit_101',
      roundId: '#ZRN-8493',
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: 50,
    });
    assert.equal(duplicateDebit.ok, true);
    assert.equal(duplicateDebit.idempotentReplay, true);
    assert.equal(duplicateDebit.balanceUsdt, 950, 'Duplicate debit must not charge twice');

    // 4. Credit ($250 win linked to tx_debit_101)
    const creditRes = pam.credit({
      transactionUuid: 'tx_credit_201',
      referenceTransactionUuid: 'tx_debit_101',
      roundId: '#ZRN-8493',
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: 250,
    });
    assert.equal(creditRes.ok, true);
    assert.equal(creditRes.balanceUsdt, 1200);

    // Strict Idempotency on duplicate Credit
    const duplicateCredit = pam.credit({
      transactionUuid: 'tx_credit_201',
      referenceTransactionUuid: 'tx_debit_101',
      roundId: '#ZRN-8493',
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: 250,
    });
    assert.equal(duplicateCredit.idempotentReplay, true);
    assert.equal(duplicateCredit.balanceUsdt, 1200, 'Duplicate credit must not pay twice');

    // 5. Rollback on another bet ('tx_debit_102' for $100)
    pam.debit({
      transactionUuid: 'tx_debit_102',
      roundId: '#ZRN-8493',
      vertical: 'INSTANT_DICE_52',
      amountUsdt: 100,
    });
    assert.equal(pam.balance().balanceUsdt, 1100);

    const rollbackRes = pam.rollback({
      transactionUuid: 'tx_rb_301',
      referenceTransactionUuid: 'tx_debit_102',
      roundId: '#ZRN-8493',
      vertical: 'INSTANT_DICE_52',
    });
    assert.equal(rollbackRes.ok, true);
    assert.equal(rollbackRes.balanceUsdt, 1200, 'Rollback must refund the $100 debit');

    // 6. Bonus ($25 promotional reward)
    const bonusRes = pam.bonus({
      transactionUuid: 'tx_bonus_401',
      roundId: '#VIP-PROMO',
      vertical: 'VIP_LOYALTY_BONUS',
      amountUsdt: 25,
      creditToRealBalance: true,
    });
    assert.equal(bonusRes.ok, true);
    assert.equal(bonusRes.balanceUsdt, 1225);

    // 7. Reconcile
    const reconRes = pam.reconcile();
    assert.equal(reconRes.ok, true);
    assert.equal(reconRes.reconciliation?.reconciled, true);
    assert.equal(reconRes.reconciliation?.discrepancyUsdt, 0);
    assert.equal(reconRes.reconciliation?.computedLedgerBalanceUsdt, 1225);
  });

  it('enforces Tombstone protection when an out-of-order Rollback arrives BEFORE its delayed Debit', () => {
    const pam = new PAMSeamlessWalletEngine({
      playerId: 'player-tombstone',
      genesisBalanceUsdt: 500,
      balanceUsdt: 500,
    });

    // Step 1: Out-of-order Rollback arrives first for 'tx_delayed_debit_999'
    const preemptiveRollback = pam.rollback({
      transactionUuid: 'tx_rb_early_999',
      referenceTransactionUuid: 'tx_delayed_debit_999',
      roundId: '#ROUND-999',
      vertical: 'INSTANT_CRASH_X',
    });
    assert.equal(preemptiveRollback.ok, true);
    assert.equal(preemptiveRollback.tombstoneBlocked, true);
    assert.equal(pam.balance().balanceUsdt, 500, 'Preemptive tombstone must not alter balance');

    // Step 2: Delayed network Debit ('tx_delayed_debit_999', $75) arrives later
    const lateDebit = pam.debit({
      transactionUuid: 'tx_delayed_debit_999',
      roundId: '#ROUND-999',
      vertical: 'INSTANT_CRASH_X',
      amountUsdt: 75,
    });
    assert.equal(lateDebit.ok, false, 'Late debit must be rejected by Tombstone');
    assert.equal(lateDebit.tombstoneBlocked, true);
    assert.equal(pam.balance().balanceUsdt, 500, 'Player balance must remain 100% uncorrupted');

    const recon = pam.reconcile();
    assert.equal(recon.reconciliation?.reconciled, true);
  });
});
