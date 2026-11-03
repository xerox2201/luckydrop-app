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

test('11. Phase 3 Global Ban Guard blocks suspended accounts with 403 Forbidden', async () => {
  const { checkUserBannedGuard } = await import('./securityGuard.ts');
  const cleanUser = createCleanZeroUserProfile({
    telegramUserId: '888001',
    displayName: 'Active Player',
  });

  const activeCheck = checkUserBannedGuard(cleanUser);
  assert.equal(activeCheck.allowed, true);
  assert.equal(activeCheck.status, 200);

  cleanUser.isBanned = true;
  cleanUser.banReason = 'Multi-account exploit attempt';

  const bannedCheck = checkUserBannedGuard(cleanUser);
  assert.equal(bannedCheck.allowed, false);
  assert.equal(bannedCheck.status, 403);
  assert.equal(bannedCheck.error, 'Your account has been suspended by administration');
});

test('12. Phase 3 Admin Manual Balance Adjustment credits/debits TON, STARS, and FREE_TICKETS with immutable audit logs', async () => {
  const { executeAdminBalanceAdjustment } = await import('./securityGuard.ts');
  const user = createCleanZeroUserProfile({
    telegramUserId: '888002',
    displayName: 'VIP Tester',
  });

  const creditTon = executeAdminBalanceAdjustment({
    userAccount: user,
    currency: 'TON',
    deltaAmount: 12.5,
    reason: 'VIP Tournament Prize',
    adminUserId: '778899101',
  });
  assert.equal(creditTon.ok, true);
  assert.equal(user.tonBalance, 12.5);
  assert.equal(user.pamState.tonBalance, 12.5);
  assert.equal(creditTon.auditEntry?.deltaAmount, 12.5);
  assert.equal(user.pamState.ledger.length, 1);

  const debitTon = executeAdminBalanceAdjustment({
    userAccount: user,
    currency: 'TON',
    deltaAmount: -2.5,
    reason: 'Manual Chargeback Correction',
    adminUserId: '778899101',
  });
  assert.equal(debitTon.ok, true);
  assert.equal(user.tonBalance, 10);

  const creditStars = executeAdminBalanceAdjustment({
    userAccount: user,
    currency: 'STARS',
    deltaAmount: 250,
    reason: 'Stars Promo Credit',
    adminUserId: '778899101',
  });
  assert.equal(creditStars.ok, true);
  assert.equal(user.starsBalance, 250);

  const creditFreeTickets = executeAdminBalanceAdjustment({
    userAccount: user,
    currency: 'FREE_TICKETS',
    deltaAmount: 3,
    reason: 'Compensatory Free Tickets',
    adminUserId: '778899101',
  });
  assert.equal(creditFreeTickets.ok, true);
  assert.equal(user.freeLotteryTickets, 3);

  // Empty reason uses default Persian/English fallback and Persian digits normalize cleanly
  const { isMaskedOrPlaceholderBotToken } = await import('./securityGuard.ts');
  const emptyReasonCredit = executeAdminBalanceAdjustment({
    userAccount: user,
    currency: 'TON',
    deltaAmount: '۵.۵' as any,
    reason: '   ',
    adminUserId: '6176189129',
  });
  assert.equal(emptyReasonCredit.ok, true);
  assert.equal(user.tonBalance, 15.5);
  assert.equal(emptyReasonCredit.auditEntry?.reason, 'اصلاح دستی توسط ادمین (Admin Adjustment)');

  assert.equal(isMaskedOrPlaceholderBotToken('********'), true);
  assert.equal(isMaskedOrPlaceholderBotToken('•••••••••••• (CONFIGURED_IN_ENV)'), true);
  assert.equal(isMaskedOrPlaceholderBotToken('123456789:AAH_real_bot_token_secret'), false);
});

test('13. Phase 3 Hardened Admin Authentication rejects raw X-Telegram-User-Id header spoofing', async () => {
  const { evaluateHardenedAdminSession } = await import('./securityGuard.ts');

  // Case A: Bot token is configured, attacker sends raw X-Telegram-User-Id header without HMAC-verified initData
  const spoofedWithToken = evaluateHardenedAdminSession({
    verification: {
      valid: true,
      reason: 'DEV_BYPASS_NO_BOT_TOKEN',
      user: null,
    },
    botToken: '123456789:AAH_real_bot_token_secret',
    initDataUserId: null,
    adminTelegramUserIds: [778899101],
  });
  assert.equal(spoofedWithToken, false, 'Must reject unverified session when botToken is configured');

  // Case B: Bot token is configured and X-Telegram-Init-Data is cryptographically HMAC-verified for admin ID
  const verifiedAdminWithToken = evaluateHardenedAdminSession({
    verification: {
      valid: true,
      reason: 'VERIFIED_CRYPTOGRAPHICALLY',
      user: { id: 778899101 },
    },
    botToken: '123456789:AAH_real_bot_token_secret',
    initDataUserId: 778899101,
    adminTelegramUserIds: [778899101],
  });
  assert.equal(verifiedAdminWithToken, true);

  // Case C: Even without bot token, raw X-Telegram-User-Id header (initDataUserId === null) must never grant admin
  const spoofedHeaderWithoutToken = evaluateHardenedAdminSession({
    verification: {
      valid: true,
      reason: 'DEV_BYPASS_NO_BOT_TOKEN',
      user: null,
    },
    botToken: '',
    initDataUserId: null,
    adminTelegramUserIds: [778899101],
  });
  assert.equal(spoofedHeaderWithoutToken, false, 'Raw X-Telegram-User-Id header alone can never grant admin');
});

test('14. Strict 1:1 Native Currency Accounting Verification (100.00 TON -> Ticket 1.00 TON -> 99.00 TON -> Bet 2.00 TON -> 97.00 TON + exact 2.00 * multiplier TON)', async () => {
  const {
    resolveStrictNativeBetAmount,
    computeStrictNativePayout,
    resolveStrictNativeTicketCost,
  } = await import('./securityGuard.ts');

  const pam = new PAMSeamlessWalletEngine({
    playerId: 'tg_accounting_audit',
    genesisTonBalance: 100.0,
    tonBalance: 100.0,
    starsBalance: 1000,
    tonUsdRate: 5.0,
    starsUsdRate: 0.02,
  });

  assert.equal(pam.getState().tonBalance, 100.0, 'Initial balance must be strictly 100.00 TON');

  // Step 1: Buy 1 lottery ticket priced at 1.00 TON (5.00 USDT internal parity)
  const ticketCost = resolveStrictNativeTicketCost({
    currency: 'TON',
    ticketCount: 1,
    roundTicketPriceTon: 1.0,
    roundTicketPriceUsdt: 5.0,
    requestedAmountTon: 1.0,
    availableTonBalance: pam.getState().tonBalance,
    availableStarsBalance: pam.getState().starsBalance,
  });
  assert.equal(ticketCost.valid, true);
  assert.equal(ticketCost.currency, 'TON');
  assert.equal(ticketCost.totalTon, 1.0);

  const ticketDebit = pam.debit({
    transactionUuid: 'tx_ticket_1ton',
    roundId: '#RD-1048',
    vertical: 'LOTTERY_SINGLE',
    currency: 'TON',
    amountTon: ticketCost.totalTon,
  });
  assert.equal(ticketDebit.ok, true);
  assert.equal(
    pam.getState().tonBalance,
    99.0,
    'After buying 1 ticket at 1.00 TON, balance must be strictly 99.00 TON'
  );
  assert.equal(
    pam.getState().starsBalance,
    1000,
    'Stars balance must remain 100% independent and untouched (1000 ⭐)'
  );

  // Step 2: Place a 2.00 TON bet on Plinko / Crash / Mines
  const resolvedBet = resolveStrictNativeBetAmount({
    currency: 'TON',
    amountTon: 2.0,
    betAmountUsdt: 3.12, // Even if a mismatched USDT value was sent alongside, amountTon=2.0 wins 1:1!
    availableTonBalance: pam.getState().tonBalance,
    availableStarsBalance: pam.getState().starsBalance,
  });
  assert.equal(resolvedBet.valid, true);
  assert.equal(resolvedBet.currency, 'TON');
  assert.equal(resolvedBet.amountTon, 2.0, 'Must resolve strictly to 2.00 TON without USDT distortion');

  const betDebit = pam.debit({
    transactionUuid: 'tx_bet_2ton',
    roundId: 'MG-PLINKO-1',
    vertical: 'INSTANT_PLINKO',
    currency: 'TON',
    amountTon: resolvedBet.amountTon,
  });
  assert.equal(betDebit.ok, true);
  assert.equal(
    pam.getState().tonBalance,
    97.0,
    'After betting 2.00 TON from 99.00 TON, balance before payout must be strictly 97.00 TON'
  );

  // Step 3: Win with multiplier 1.96x -> must credit strictly 2.00 * 1.96 = 3.92 TON -> 97.00 + 3.92 = 100.92 TON
  const multiplier = 1.96;
  const payout = computeStrictNativePayout({
    currency: 'TON',
    betAmountTon: resolvedBet.amountTon,
    betAmountStars: 0,
    multiplier,
    won: true,
  });
  assert.equal(payout.payoutTon, 3.92, '2.00 TON * 1.96x must equal strictly 3.92 TON');

  const winCredit = pam.credit({
    transactionUuid: 'tx_win_2ton_196x',
    referenceTransactionUuid: 'tx_bet_2ton',
    roundId: 'MG-PLINKO-1',
    vertical: 'INSTANT_PLINKO',
    currency: 'TON',
    amountTon: payout.payoutTon,
  });
  assert.equal(winCredit.ok, true);
  assert.equal(
    pam.getState().tonBalance,
    100.92,
    'After winning 3.92 TON on 97.00 TON balance, balance must be strictly 100.92 TON'
  );

  // Step 4: Verify 1:1 STARS accounting is 100% independent of TON
  const starsBet = resolveStrictNativeBetAmount({
    currency: 'STARS',
    amountStars: 150,
    availableTonBalance: pam.getState().tonBalance,
    availableStarsBalance: pam.getState().starsBalance,
  });
  assert.equal(starsBet.valid, true);
  assert.equal(starsBet.amountStars, 150);

  pam.debit({
    transactionUuid: 'tx_stars_150',
    roundId: 'MG-MINES-1',
    vertical: 'INSTANT_MINES',
    currency: 'STARS',
    amountStars: starsBet.amountStars,
  });
  assert.equal(pam.getState().starsBalance, 850, '1000 - 150 Stars = strictly 850 Stars');
  assert.equal(pam.getState().tonBalance, 100.92, 'TON balance remains strictly 100.92 TON');

  const starsPayout = computeStrictNativePayout({
    currency: 'STARS',
    betAmountTon: 0,
    betAmountStars: 150,
    multiplier: 2.0,
    won: true,
  });
  assert.equal(starsPayout.payoutStars, 300);

  pam.credit({
    transactionUuid: 'tx_stars_win_300',
    referenceTransactionUuid: 'tx_stars_150',
    roundId: 'MG-MINES-1',
    vertical: 'INSTANT_MINES',
    currency: 'STARS',
    amountStars: starsPayout.payoutStars,
  });
  assert.equal(pam.getState().starsBalance, 1150, '850 + 300 Stars = strictly 1150 Stars');
  assert.equal(pam.getState().tonBalance, 100.92, 'TON balance remains strictly 100.92 TON');
});

test('15. Two-Way Live VIP Support scoping, unread badges, Telegram push formatting, and quick diagnostic chips', async () => {
  const {
    filterSupportMessagesForUser,
    formatUserSupportReplyTelegramPush,
    formatAdminSupportTelegramAlert,
    buildQuickDiagnosticSupportAttachment,
  } = await import('./securityGuard.ts');

  const sampleMessages = [
    {
      id: 1,
      sessionCode: 'TG-555001',
      telegramUserId: '555001',
      username: 'ali_vip',
      firstName: 'Ali',
      senderName: 'Ali (@ali_vip)',
      senderRole: 'USER',
      vipLevel: 'GOLD',
      tonBalance: 25.5,
      starsBalance: 500,
      subject: 'پیگیری واریز TON',
      message: 'سلام، واریز ۵ تون انجام دادم.',
      walletBalanceLabel: '25.50 TON | 500 ⭐',
      historySummary: '3 بلیت ثبت‌شده',
      readByUser: true,
      readByAdmin: false,
      createdAt: 'همین الان',
    },
    {
      id: 2,
      sessionCode: 'TG-555001',
      telegramUserId: '555001',
      username: 'ali_vip',
      firstName: 'Ali',
      senderName: 'اپراتور ارشد LuckyDrop',
      senderRole: 'OPERATOR',
      vipLevel: 'GOLD',
      tonBalance: 25.5,
      starsBalance: 500,
      subject: 'پاسخ پشتیبانی VIP',
      message: 'سلام علی عزیز، واریز شما تایید و به موجودی اضافه شد.',
      walletBalanceLabel: '25.50 TON | 500 ⭐',
      historySummary: '3 بلیت ثبت‌شده',
      readByUser: false,
      readByAdmin: true,
      createdAt: 'همین الان',
    },
    {
      id: 3,
      sessionCode: 'TG-999888',
      telegramUserId: '999888',
      username: 'other_user',
      firstName: 'Sara',
      senderName: 'Sara (@other_user)',
      senderRole: 'USER',
      vipLevel: 'MEMBER',
      tonBalance: 2,
      starsBalance: 0,
      subject: 'سوال',
      message: 'پیام کاربر دیگر',
      walletBalanceLabel: '2.00 TON | 0 ⭐',
      historySummary: '0 بلیت',
      readByUser: true,
      readByAdmin: false,
      createdAt: 'همین الان',
    },
  ];

  const user555View = filterSupportMessagesForUser(sampleMessages, '555001');
  assert.equal(user555View.messages.length, 2, 'User 555001 must only see their own 2 messages');
  assert.equal(user555View.unreadOperatorCount, 1, 'User 555001 has 1 unread operator reply');
  assert.equal(user555View.sessionCode, 'TG-555001');

  const user999View = filterSupportMessagesForUser(sampleMessages, 999888);
  assert.equal(user999View.messages.length, 1, 'User 999888 must only see their own 1 message');
  assert.equal(user999View.unreadOperatorCount, 0);

  const pushText = formatUserSupportReplyTelegramPush('واریز شما با موفقیت تایید شد 💎');
  assert.equal(
    pushText,
    '📩 پاسخ جدید از پشتیبانی LuckyDrop:\n\nواریز شما با موفقیت تایید شد 💎'
  );

  const adminAlert = formatAdminSupportTelegramAlert({
    firstName: 'Ali',
    username: 'ali_vip',
    telegramUserId: '555001',
    tonBalance: 25.5,
    starsBalance: 500,
    messageText: 'لطفاً واریز من را بررسی کنید',
    diagnosticMetadata: 'Wallet: UQ... | کد واریز: DEP-102938',
  });
  assert.ok(adminAlert.includes('Ali'));
  assert.ok(adminAlert.includes('@ali_vip'));
  assert.ok(adminAlert.includes('555001'));
  assert.ok(adminAlert.includes('25.50 TON'));
  assert.ok(adminAlert.includes('DEP-102938'));

  const depDiag = buildQuickDiagnosticSupportAttachment({
    chipType: 'DEPOSIT_TON',
    connectedWalletAddress: 'UQD932049203940239402934',
    latestDeposit: {
      depositCode: 'DEP-778899',
      status: 'PENDING_ADMIN',
      txHash: '0xabcdef1234567890abcdef1234567890',
    },
  });
  assert.ok(depDiag.diagnosticMetadata.includes('DEP-778899'));
  assert.ok(depDiag.prefilledMessageFa.includes('UQD932049203940239402934'));
});

test('16. Commercial Support Guide (zero house-cut disclosure) & Live Draw Ceremony sequential ticket matching', async () => {
  const {
    buildQuickDiagnosticSupportAttachment,
    evaluateSequentialTicketMatches,
    buildDrawCeremonyPayload,
  } = await import('./securityGuard.ts');

  const guideChip = buildQuickDiagnosticSupportAttachment({
    chipType: 'FAIRNESS_RTP',
    serverSeedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });
  assert.equal(guideChip.subjectFa, '🎁 راهنمای جوایز و بلیت‌ها');
  assert.equal(
    guideChip.instantGuideFa,
    '🛡️ تمامی قرعه‌کشی‌ها و بازی‌های LuckyDrop بر بستر الگوریتم رمزنگاری‌شده Provably Fair (SHA-256) اجرا شده و جوایز برندگان به صورت ۱۰۰٪ خودکار و آنی به کیف پول شما واریز می‌گردد.'
  );
  assert.equal(guideChip.instantGuideFa?.includes('۸۵٪'), false);
  assert.equal(guideChip.instantGuideFa?.includes('RTP'), false);
  assert.equal(guideChip.diagnosticMetadata.includes('85%'), false);

  // Step-by-step Stage 2 ball drop matching
  const step2Match = evaluateSequentialTicketMatches({
    ticketMain: [7, 14, 23, 38, 49],
    ticketGolden: 8,
    revealedMain: [7, 14, 30],
    revealedGolden: null,
  });
  assert.deepEqual(step2Match.matchedMainNumbers, [7, 14]);
  assert.equal(step2Match.matchedGoldenBall, false);
  assert.equal(step2Match.totalMatchedCount, 2);

  const finaleMatch = evaluateSequentialTicketMatches({
    ticketMain: [7, 14, 23, 38, 49],
    ticketGolden: 8,
    revealedMain: [7, 14, 23, 38, 49],
    revealedGolden: 8,
  });
  assert.deepEqual(finaleMatch.matchedMainNumbers, [7, 14, 23, 38, 49]);
  assert.equal(finaleMatch.matchedGoldenBall, true);
  assert.equal(finaleMatch.totalMatchedCount, 6);

  const ceremonyPayload = buildDrawCeremonyPayload({
    drawRecord: {
      drawId: 'DRAW-LDR-8493-1',
      roundCode: '#LDR-8493',
      roundTitleFa: 'مگا جک‌پات هفتگی LuckyDrop (۸۵٪ استخر کل)',
      drawnMain: [7, 14, 23, 38, 49],
      drawnGolden: 8,
      winnersCount: 4,
      ticketsEvaluatedCount: 40,
      totalPayoutUsdt: 500,
      primaryHmacHex: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    userTickets: [
      {
        ticketCode: 'LDR-990011',
        roundCode: '#LDR-8493',
        mainNumbers: '[7, 14, 23, 31, 45]',
        goldenBall: 8,
        costUsdt: '5.00',
        status: 'WON',
        prizeWonUsdt: '125.00',
      },
    ],
    tonUsdRate: 5.0,
  });

  assert.equal(ceremonyPayload.roundTitleFa, 'مگا جک‌پات هفتگی LuckyDrop');
  assert.equal(ceremonyPayload.userHasWinningTicket, true);
  assert.equal(ceremonyPayload.userWonTotalTon, 25.0);
  assert.equal(ceremonyPayload.userRoundTickets.length, 1);
  assert.deepEqual(ceremonyPayload.userRoundTickets[0].matchedMainNumbers, [7, 14, 23]);
  assert.equal(ceremonyPayload.userRoundTickets[0].matchedGoldenBall, true);
});

test('17. Instant VIP Rakeback & Cashback Vault: 85% Pool + 12% Net House + 3% User Cashback = 100% Gross Sales (< 0.000001 TON) & 1:1 PAM Claim', async () => {
  const {
    calculateSelfFundedTicketCashbackSplit,
    accrueLotteryTicketCashback,
    accrueMiniGameRakeback,
    normalizeRakebackVaultState,
  } = await import('./securityGuard.ts');

  const testGrossTonSamples = [0.2, 0.5, 1.0, 1.333333, 2.75, 5.0, 9.999999, 17.456789, 50.0, 123.456789];
  for (const grossTon of testGrossTonSamples) {
    const split = calculateSelfFundedTicketCashbackSplit({
      currency: 'TON',
      grossTon,
    });
    const exactSumTon = Number(
      (split.distributablePool85Ton + split.netHouseMargin12Ton + split.userCashback3Ton).toFixed(6)
    );
    const diffTon = Math.abs(exactSumTon - Number(grossTon.toFixed(6)));
    assert.ok(
      diffTon < 0.000001,
      `Conservation law violated for ${grossTon} TON: 85% (${split.distributablePool85Ton}) + 12% (${split.netHouseMargin12Ton}) + 3% (${split.userCashback3Ton}) = ${exactSumTon} (diff=${diffTon})`
    );
    assert.equal(
      split.distributablePool85Ton,
      Number((Number(grossTon.toFixed(6)) * 0.85).toFixed(6)),
      '85% distributable pool must remain 100% untouched'
    );
  }

  // Accrue 3% lottery ticket cashback + 1.5% mini-game turnover rakeback
  let vault = normalizeRakebackVaultState(null);
  const ticketAccrualTon = accrueLotteryTicketCashback(vault, {
    currency: 'TON',
    totalTon: 10.0,
    totalStars: 0,
  });
  vault = ticketAccrualTon.updatedVault;
  assert.equal(ticketAccrualTon.accruedTon, 0.3);
  assert.equal(vault.claimableTon, 0.3);
  assert.equal(vault.lifetimeEarnedTon, 0.3);

  const gameAccrualTon = accrueMiniGameRakeback(vault, {
    currency: 'TON',
    betAmountTon: 4.0,
    betAmountStars: 0,
  });
  vault = gameAccrualTon.updatedVault;
  assert.equal(gameAccrualTon.accruedTon, 0.06);
  assert.equal(vault.claimableTon, 0.36);
  assert.equal(vault.lifetimeEarnedTon, 0.36);

  const ticketAccrualStars = accrueLotteryTicketCashback(vault, {
    currency: 'STARS',
    totalTon: 0,
    totalStars: 500,
  });
  vault = ticketAccrualStars.updatedVault;
  assert.equal(ticketAccrualStars.accruedStars, 15);
  assert.equal(vault.claimableStars, 15);

  // 1:1 Instant Claim into PAM wallet with zero fees
  const pam = new PAMSeamlessWalletEngine({
    playerId: 'tg_rakeback_vip',
    genesisTonBalance: 5.0,
    tonBalance: 5.0,
    genesisStarsBalance: 100,
    starsBalance: 100,
  });

  const claimTonRes = pam.credit({
    transactionUuid: 'rakeback_claim_ton_1',
    roundId: '#RAKEBACK-VAULT-CLAIM',
    vertical: 'VIP_RAKEBACK_VAULT_CLAIM',
    currency: 'TON',
    amountTon: vault.claimableTon,
  });
  assert.equal(claimTonRes.ok, true);
  vault.claimableTon = 0;

  const claimStarsRes = pam.credit({
    transactionUuid: 'rakeback_claim_stars_1',
    roundId: '#RAKEBACK-VAULT-CLAIM',
    vertical: 'VIP_RAKEBACK_VAULT_CLAIM',
    currency: 'STARS',
    amountStars: vault.claimableStars,
  });
  assert.equal(claimStarsRes.ok, true);
  vault.claimableStars = 0;

  assert.equal(pam.getState().tonBalance, 5.36);
  assert.equal(pam.getState().starsBalance, 115);
  assert.equal(vault.claimableTon, 0);
  assert.equal(vault.claimableStars, 0);
  assert.equal(vault.lifetimeEarnedTon, 0.36);
  assert.equal(vault.lifetimeEarnedStars, 15);
  const recon = pam.reconcile();
  assert.equal(recon.ok, true);
});

test('18. Monthly VIP Super-Jackpot Strict All-or-Nothing (6/6 Only) & $1,000 Welcome Grand Lottery Self-Funded Reserve Guard', async () => {
  const {
    evaluateMonthlySuperJackpotAllOrNothing,
    normalizeWelcomeGrandLotteryState,
    accrueWelcomeLotteryReserveFromHouseMargin,
    evaluateWelcomeLotteryScheduleGuard,
    validateAndPrepareWelcomeTicketSelection,
    evaluateUserWelcomeTicketStatus,
  } = await import('./securityGuard.ts');

  // Part A: Monthly VIP All-or-Nothing — Tier 2/3/4/5 hits must receive 0 payout and 100% of pool must roll over
  const noJackpotEval = evaluateMonthlySuperJackpotAllOrNothing({
    accumulatedPoolTon: 1250.555555,
    accumulatedPoolStars: 312639,
    drawnMain: [7, 14, 23, 38, 49],
    drawnGolden: 8,
    tickets: [
      // 5 main matched, wrong golden -> Tier 2 in regular, but 0 in Monthly VIP
      { ticketCode: '#VIP-1', mainNumbers: [7, 14, 23, 38, 49], goldenBall: 1 },
      // 4 main + golden -> Tier 3 in regular, 0 in Monthly VIP
      { ticketCode: '#VIP-2', mainNumbers: [7, 14, 23, 38, 2], goldenBall: 8 },
    ],
  });
  assert.equal(noJackpotEval.tier1WinnersCount, 0);
  assert.equal(noJackpotEval.totalPaidOutTon, 0);
  assert.equal(noJackpotEval.totalPaidOutStars, 0);
  assert.equal(noJackpotEval.remainingRolloverTon, 1250.555555);
  assert.equal(noJackpotEval.remainingRolloverStars, 312639);

  // Exact Tier-1 Jackpot hit (all 5 main + golden ball) wins 100% of accumulated pool
  const hitJackpotEval = evaluateMonthlySuperJackpotAllOrNothing({
    accumulatedPoolTon: 1250.555555,
    accumulatedPoolStars: 312639,
    drawnMain: [7, 14, 23, 38, 49],
    drawnGolden: 8,
    tickets: [
      { ticketCode: '#VIP-WINNER', mainNumbers: [7, 14, 23, 38, 49], goldenBall: 8 },
      { ticketCode: '#VIP-NEAR', mainNumbers: [7, 14, 23, 38, 49], goldenBall: 3 },
    ],
  });
  assert.equal(hitJackpotEval.tier1WinnersCount, 1);
  assert.equal(hitJackpotEval.totalPaidOutTon, 1250.555555);
  assert.equal(hitJackpotEval.remainingRolloverTon, 0);
  assert.equal(hitJackpotEval.evaluations[0].prizeTon, 1250.555555);
  assert.equal(hitJackpotEval.evaluations[1].prizeTon, 0);

  // Part B: $1,000 Welcome Grand Lottery (#LD-WELCOME-1000) custom number picker + self-funding reserve guard
  const validPick = validateAndPrepareWelcomeTicketSelection({
    mainNumbers: [48, 7, 23, 14, 35],
    goldenBall: 8,
  });
  assert.equal(validPick.valid, true);
  assert.deepEqual(validPick.cleanMainNumbers, [7, 14, 23, 35, 48]);
  assert.equal(validPick.cleanGoldenBall, 8);

  const duplicatePick = validateAndPrepareWelcomeTicketSelection({
    mainNumbers: [7, 7, 23, 14, 35],
    goldenBall: 8,
  });
  assert.equal(duplicatePick.valid, false);

  const welcomeState = normalizeWelcomeGrandLotteryState(
    {
      targetPoolUsdt: 1000,
      fundedReserveTon: 50,
      nextDrawTimestampMs: 1000,
    },
    5.0
  );
  assert.equal(welcomeState.targetPoolTon, 200);
  assert.equal(welcomeState.isReserveFullyFunded, false);

  // Timer expired at nowMs=2000 while only 50 / 200 TON funded -> auto-extends by 7 days
  const guardUnfunded = evaluateWelcomeLotteryScheduleGuard(welcomeState, {
    nowMs: 2000,
    tonUsdRate: 5.0,
    isAdminForceDraw: false,
  });
  assert.equal(guardUnfunded.shouldExecuteDraw, false);
  assert.equal(guardUnfunded.autoExtended, true);
  assert.equal(guardUnfunded.updatedState.autoExtensionCount, 1);
  assert.equal(guardUnfunded.updatedState.nextDrawTimestampMs, 2000 + 7 * 24 * 60 * 60 * 1000);

  // Accrue reserve from net house margin until >= 200 TON
  const accrued = accrueWelcomeLotteryReserveFromHouseMargin(welcomeState, {
    netHouseMarginTon: 600, // 25% of 600 = 150 TON -> 50 + 150 = 200 TON
    tonUsdRate: 5.0,
  });
  assert.equal(accrued.allocatedReserveTon, 150);
  assert.equal(accrued.updatedState.fundedReserveTon, 200);
  assert.equal(accrued.updatedState.isReserveFullyFunded, true);

  const guardFunded = evaluateWelcomeLotteryScheduleGuard(accrued.updatedState, {
    nowMs: 2000,
    tonUsdRate: 5.0,
    isAdminForceDraw: false,
  });
  assert.equal(guardFunded.shouldExecuteDraw, true);
  assert.equal(guardFunded.autoExtended, false);

  const userStatusLocked = evaluateUserWelcomeTicketStatus({
    userAccount: {
      welcomeTicketUnlocked: false,
      welcomeTicketEntitlement: 0,
      welcomeTicketClaimed: false,
      welcomeTicketCode: null,
    },
    paidRegularTicketsCount: 0,
    existingWelcomeTicket: null,
  });
  assert.equal(userStatusLocked.welcomeTicketUnlocked, false);

  const userStatusUnlocked = evaluateUserWelcomeTicketStatus({
    userAccount: {
      welcomeTicketUnlocked: true,
      welcomeTicketEntitlement: 1,
      welcomeTicketClaimed: false,
      welcomeTicketCode: null,
    },
    paidRegularTicketsCount: 1,
    existingWelcomeTicket: null,
  });
  assert.equal(userStatusUnlocked.welcomeTicketUnlocked, true);
  assert.equal(userStatusUnlocked.welcomeTicketEntitlement, 1);
});


