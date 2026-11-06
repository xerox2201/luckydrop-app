import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAMSeamlessWalletEngine,
  type PAMLedgerEntry,
} from '../services/pamWalletEngine.ts';
import {
  roundTonClean,
  roundStarsClean,
  createCleanZeroUserProfile,
  computeServerAuthoritativeGameOutcome,
  accrueMiniGameRakeback,
  accrueReferralMiniGameCommission,
  calculateSyndicateProRataDistribution,
  evaluateWelcomeLotteryScheduleGuard,
  evaluateMonthlySuperJackpotAllOrNothing,
  WELCOME_GRAND_ROUND_ID,
} from '../services/securityGuard.ts';
import {
  localizeTransactionDescription,
  localizeServerText,
  localizeTierLabel,
  type SupportedLocale,
} from '../utils/i18n.ts';
import { generateUserConciergeReply } from '../services/aiCopilotEngine.ts';

import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  computeTelegramWebAppDataSecretKey,
  buildTelegramDataCheckString,
  loadServerSecurityConfig,
} from '../services/telegramBotSecurity.ts';

const API_BASE = 'http://localhost:3000';
const PERSIAN_REGEX = /[\u0600-\u06FF]/;

function detectServerBotTokenAndAdminId(): { botToken: string; adminId: string } {
  const cfg = loadServerSecurityConfig(process.env);
  let botToken = cfg.telegramBotToken || '';
  const adminId = String(cfg.adminTelegramUserIds[0] || 778899101);
  if (!botToken) {
    try {
      const raw = fs.readFileSync('data/luckydrop_persistent_db.json', 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed?.telegramBotConfig?.botToken && !String(parsed.telegramBotConfig.botToken).includes('*')) {
        botToken = String(parsed.telegramBotConfig.botToken).trim();
      }
    } catch {
      // ignore
    }
  }
  return { botToken, adminId };
}

const { botToken: SERVER_BOT_TOKEN, adminId: ADMIN_ID } = detectServerBotTokenAndAdminId();

function nextNumericUserId(offset: number): string {
  return String(880000000 + (Date.now() % 10000000) * 10 + offset);
}

function buildInitDataHeader(telegramUserId: string): string {
  const idNum = Number(telegramUserId) || Number(ADMIN_ID);
  const userJson = JSON.stringify({
    id: idNum,
    first_name: `User_${idNum}`,
    username: `user_${idNum}`,
  });
  const authDate = Math.floor(Date.now() / 1000);
  const sp = new URLSearchParams();
  sp.set('user', userJson);
  sp.set('auth_date', String(authDate));
  if (SERVER_BOT_TOKEN) {
    const dataCheckString = buildTelegramDataCheckString(sp);
    const secretKey = computeTelegramWebAppDataSecretKey(SERVER_BOT_TOKEN);
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    sp.set('hash', hash);
  }
  return sp.toString();
}

let e2eRequestSeq = 1;

async function apiPost(
  path: string,
  body: Record<string, any>,
  telegramUserId: string
): Promise<{ status: number; data: any }> {
  const seq = e2eRequestSeq++;
  const simulatedIp = `10.88.${Math.floor(seq / 250) % 250}.${(seq % 250) + 1}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': simulatedIp,
      'X-Telegram-User-Id': telegramUserId,
      'X-Telegram-Init-Data': buildInitDataHeader(telegramUserId),
    },
    body: JSON.stringify({ ...body, telegramUserId: Number(telegramUserId) || telegramUserId }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiGet(
  path: string,
  telegramUserId: string
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'X-Telegram-User-Id': telegramUserId,
      'X-Telegram-Init-Data': buildInitDataHeader(telegramUserId),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

test('PHASE 3.1: Wallet Deposit, Withdrawal, Atomic Rollback & Concurrent Double-Spend Stress Test', async () => {
  const testUserId = nextNumericUserId(1);
  const collectedMessages: string[] = [];

  // 1. Verify fresh account starts at 0.000000 TON & 0 STARS via /api/snapshot
  const sync0 = await apiGet(`/api/snapshot?tg_uid=${testUserId}`, testUserId);
  assert.equal(sync0.status, 200);
  assert.equal(Number(sync0.data.tonBalance).toFixed(6), '0.000000');
  assert.equal(Number(sync0.data.starsBalance), 0);

  // 2. Test TON & Stars 1:1 Credits with 6-decimal precision (`toFixed(6)`)
  const depTon = await apiPost(
    '/api/admin/users/adjust-balance',
    {
      targetUserId: testUserId,
      currency: 'TON',
      deltaAmount: 25.123456,
      reason: 'شارژ کیف پول (25.123456 TON)',
    },
    ADMIN_ID
  );
  assert.equal(depTon.status, 200);
  assert.equal(depTon.data.ok, true);
  assert.equal(Number(depTon.data.newBalance).toFixed(6), '25.123456');

  const depStars = await apiPost(
    '/api/admin/users/adjust-balance',
    {
      targetUserId: testUserId,
      currency: 'STARS',
      deltaAmount: 1500,
      reason: 'شارژ خودکار 1500 ⭐ Telegram Stars (DEP-1500)',
    },
    ADMIN_ID
  );
  assert.equal(depStars.status, 200);
  assert.equal(depStars.data.ok, true);
  assert.equal(Number(depStars.data.newBalance), 1500);

  // Also test manual crypto deposit submission + admin approval flow
  const manualDep = await apiPost(
    '/api/wallet/deposit',
    {
      amountUsdt: 10,
      network: 'TON Network',
      txHash: `0x_manual_audit_${testUserId}_${Date.now()}`,
      verificationMode: 'ADMIN_MANUAL',
    },
    testUserId
  );
  assert.equal(manualDep.status, 200);
  assert.equal(manualDep.data.ok, true);
  assert.equal(manualDep.data.queuedForAdmin, true);

  // 3. Test Minimum Withdrawal Guards & Insufficient Balance Rejection
  const minGuardTon = await apiPost(
    '/api/wallet/withdraw',
    {
      amountTon: 0.01, // below 0.1 TON min
      destinationAddress: 'UQ_TEST_DEST_WALLET_1234567890',
    },
    testUserId
  );
  assert.equal(minGuardTon.status, 400);
  assert.equal(minGuardTon.data.ok, false);
  collectedMessages.push(minGuardTon.data.error);

  const minGuardStars = await apiPost(
    '/api/wallet/withdraw-stars',
    {
      amountStars: 10, // below 50 Stars min
      destination: '@audit_stars_user',
    },
    testUserId
  );
  assert.equal(minGuardStars.status, 400);
  assert.equal(minGuardStars.data.ok, false);
  collectedMessages.push(minGuardStars.data.error);

  const insufficientTon = await apiPost(
    '/api/wallet/withdraw',
    {
      amountTon: 500.0, // user has 25.123456 TON
      destinationAddress: 'UQ_TEST_DEST_WALLET_1234567890',
    },
    testUserId
  );
  assert.equal(insufficientTon.status, 400);
  assert.equal(insufficientTon.data.ok, false);
  collectedMessages.push(insufficientTon.data.error);

  // 4. Test Valid TON & Stars Withdrawals
  const validWithdrawTon = await apiPost(
    '/api/wallet/withdraw',
    {
      amountTon: 5.123456,
      destinationAddress: 'UQ_TEST_DEST_WALLET_1234567890',
    },
    testUserId
  );
  assert.equal(validWithdrawTon.status, 200);
  assert.equal(validWithdrawTon.data.ok, true);
  assert.equal(Number(validWithdrawTon.data.tonBalance).toFixed(6), '20.000000');
  const tonWdCode = validWithdrawTon.data.withdrawal.withdrawalCode;

  const validWithdrawStars = await apiPost(
    '/api/wallet/withdraw-stars',
    {
      amountStars: 500,
      destination: '@audit_stars_user',
    },
    testUserId
  );
  assert.equal(validWithdrawStars.status, 200);
  assert.equal(validWithdrawStars.data.ok, true);
  assert.equal(Number(validWithdrawStars.data.starsBalance), 1000);
  const starsWdCode = validWithdrawStars.data.withdrawal.withdrawalCode;

  // 5. Test Atomic Rollback when Admin Rejects both TON and Stars Withdrawals!
  const rejectTonWd = await apiPost(
    '/api/admin/withdrawals/action',
    { withdrawalCode: tonWdCode, action: 'reject' },
    ADMIN_ID
  );
  assert.equal(rejectTonWd.status, 200);
  assert.equal(rejectTonWd.data.ok, true);

  const rejectStarsWd = await apiPost(
    '/api/admin/withdrawals/action',
    { withdrawalCode: starsWdCode, action: 'reject' },
    ADMIN_ID
  );
  assert.equal(rejectStarsWd.status, 200);
  assert.equal(rejectStarsWd.data.ok, true);

  // Verify balances were atomically restored 1:1 after rejection rollback
  const syncAfterReject = await apiGet(`/api/snapshot?tg_uid=${testUserId}`, testUserId);
  assert.equal(Number(syncAfterReject.data.tonBalance).toFixed(6), '25.123456');
  assert.equal(Number(syncAfterReject.data.starsBalance), 1500);

  // Set balance to exact 20.000000 TON before concurrent double-spend attack
  await apiPost(
    '/api/wallet/withdraw',
    {
      amountTon: 5.123456,
      destinationAddress: 'UQ_SETTLE_TO_20_TON',
    },
    testUserId
  );

  // 6. Concurrent Double-Spend Attack (`Promise.all` firing 10 simultaneous requests)
  // User has 20.000000 TON. We fire 10 simultaneous withdrawals + ticket purchases + cashback claims + referral claims
  const activeRoundCode = syncAfterReject.data.rounds?.[0]?.roundCode || '#LDR-8493';
  const concurrentAttacks = [
    apiPost(
      '/api/wallet/withdraw',
      { amountTon: 8.0, destinationAddress: 'UQ_ATTACK_1' },
      testUserId
    ),
    apiPost(
      '/api/wallet/withdraw',
      { amountTon: 8.0, destinationAddress: 'UQ_ATTACK_2' },
      testUserId
    ),
    apiPost(
      '/api/wallet/withdraw',
      { amountTon: 8.0, destinationAddress: 'UQ_ATTACK_3' },
      testUserId
    ),
    apiPost(
      '/api/tickets/purchase',
      {
        roundCode: activeRoundCode,
        currency: 'TON',
        amountTon: 5.0,
        slips: [
          { mainNumbers: [1, 2, 3, 4, 5], goldenBall: 1 },
          { mainNumbers: [6, 7, 8, 9, 10], goldenBall: 2 },
          { mainNumbers: [11, 12, 13, 14, 15], goldenBall: 3 },
          { mainNumbers: [16, 17, 18, 19, 20], goldenBall: 4 },
          { mainNumbers: [21, 22, 23, 24, 25], goldenBall: 5 },
        ],
      },
      testUserId
    ),
    apiPost(
      '/api/tickets/purchase',
      {
        roundCode: activeRoundCode,
        currency: 'TON',
        amountTon: 5.0,
        slips: [
          { mainNumbers: [2, 4, 6, 8, 10], goldenBall: 6 },
          { mainNumbers: [3, 6, 9, 12, 15], goldenBall: 7 },
          { mainNumbers: [5, 10, 15, 20, 25], goldenBall: 8 },
          { mainNumbers: [7, 14, 21, 28, 35], goldenBall: 9 },
          { mainNumbers: [9, 18, 27, 36, 45], goldenBall: 10 },
        ],
      },
      testUserId
    ),
    apiPost('/api/wallet/claim-rakeback', {}, testUserId),
    apiPost('/api/wallet/claim-rakeback', {}, testUserId),
    apiPost('/api/referral/claim', {}, testUserId),
    apiPost(
      '/api/wallet/withdraw',
      { amountTon: 6.0, destinationAddress: 'UQ_ATTACK_4' },
      testUserId
    ),
    apiPost(
      '/api/wallet/withdraw',
      { amountTon: 6.0, destinationAddress: 'UQ_ATTACK_5' },
      testUserId
    ),
  ];

  const attackResults = await Promise.all(concurrentAttacks);
  for (const r of attackResults) {
    if (r.data?.message) collectedMessages.push(r.data.message);
    if (r.data?.error) collectedMessages.push(r.data.error);
  }

  const postAttackSync = await apiGet(`/api/snapshot?tg_uid=${testUserId}`, testUserId);
  assert.equal(postAttackSync.status, 200);
  assert.ok(
    postAttackSync.data.tonBalance >= 0,
    `Balance must never go negative! Got: ${postAttackSync.data.tonBalance}`
  );

  // Reconcile the user's PAM state via live endpoint AND local PAM engine
  const reconcileRes = await apiPost('/api/pam/reconcile', {}, testUserId);
  assert.equal(reconcileRes.status, 200);
  const rec = reconcileRes.data.reconciliation || reconcileRes.data;
  assert.equal(rec.reconciled, true);
  assert.equal(Number(rec.discrepancyTon).toFixed(6), '0.000000');
  assert.equal(Number(rec.discrepancyStars), 0);
});

test('PHASE 3.2: All 4 Instant Mini-Games Real Cycle (Dice, Mines, Plinko, Crash) in TON & Stars + Edge Cases', async () => {
  const inviterId = nextNumericUserId(2);
  const playerId = nextNumericUserId(3);

  // Initialize inviter & player and bind referral
  await apiGet(`/api/snapshot?tg_uid=${inviterId}`, inviterId);
  await apiPost(
    '/api/referral/bind',
    { referralCode: `ref_${inviterId}` },
    playerId
  );

  // Fund player with 50 TON and 5000 Stars
  await apiPost(
    '/api/admin/users/adjust-balance',
    { targetUserId: playerId, currency: 'TON', deltaAmount: 50, reason: 'Mini-Game TON Test Fund' },
    ADMIN_ID
  );
  await apiPost(
    '/api/admin/users/adjust-balance',
    {
      targetUserId: playerId,
      currency: 'STARS',
      deltaAmount: 5000,
      reason: 'Mini-Game Stars Test Fund',
    },
    ADMIN_ID
  );

  // 1. DICE, PLINKO & CRASH in both TON and STARS via /api/games/play
  for (const currency of ['TON', 'STARS'] as const) {
    // DICE
    const diceBet = await apiPost(
      '/api/games/play',
      {
        gameId: 'DICE',
        currency,
        betAmountTon: currency === 'TON' ? 1.0 : undefined,
        betAmountStars: currency === 'STARS' ? 200 : undefined,
        diceRollUnder: 50,
        diceMode: 'UNDER',
      },
      playerId
    );
    assert.equal(diceBet.status, 200);
    assert.equal(diceBet.data.ok, true);
    assert.equal(diceBet.data.evaluation.hmacHex.length, 64);

    // PLINKO
    const plinkoBet = await apiPost(
      '/api/games/play',
      {
        gameId: 'PLINKO',
        currency,
        betAmountTon: currency === 'TON' ? 1.0 : undefined,
        betAmountStars: currency === 'STARS' ? 200 : undefined,
        plinkoRows: 12,
        plinkoRisk: 'MEDIUM',
      },
      playerId
    );
    assert.equal(plinkoBet.status, 200);
    assert.equal(plinkoBet.data.ok, true);
    assert.equal(plinkoBet.data.evaluation.hmacHex.length, 64);

    // CRASH
    const crashBet = await apiPost(
      '/api/games/play',
      {
        gameId: 'CRASH',
        currency,
        betAmountTon: currency === 'TON' ? 1.0 : undefined,
        betAmountStars: currency === 'STARS' ? 200 : undefined,
        crashAutoCashoutX: 1.5,
      },
      playerId
    );
    assert.equal(crashBet.status, 200);
    assert.equal(crashBet.data.ok, true);
    assert.equal(crashBet.data.evaluation.hmacHex.length, 64);
    if (crashBet.data.evaluation.won) {
      if (currency === 'TON') {
        assert.equal(
          Number(crashBet.data.payoutTon).toFixed(6),
          roundTonClean(1.0 * crashBet.data.evaluation.multiplier).toFixed(6)
        );
      } else {
        assert.equal(
          Number(crashBet.data.payoutStars),
          roundStarsClean(Math.round(200 * crashBet.data.evaluation.multiplier))
        );
      }
    }
  }

  // Verify Provably Fair Determinism across all 4 games (Dice, Mines, Plinko, Crash)
  for (const gameId of ['DICE_52', 'MINES', 'PLINKO', 'CRASH_X'] as const) {
    const out1 = computeServerAuthoritativeGameOutcome({
      gameId,
      serverSeed: 'audit_fixed_server_seed_2026',
      clientSeed: 'audit_fixed_client_seed_2026',
      nonce: 42,
      betAmountUsdt: 5.0,
      diceRollUnder: 50,
      diceMode: 'UNDER',
      minesCount: 3,
      selectedTiles: [0, 1, 2],
      plinkoRows: 12,
      plinkoRisk: 'MEDIUM',
      crashAutoCashoutX: 2.0,
    });
    const out2 = computeServerAuthoritativeGameOutcome({
      gameId,
      serverSeed: 'audit_fixed_server_seed_2026',
      clientSeed: 'audit_fixed_client_seed_2026',
      nonce: 42,
      betAmountUsdt: 5.0,
      diceRollUnder: 50,
      diceMode: 'UNDER',
      minesCount: 3,
      selectedTiles: [0, 1, 2],
      plinkoRows: 12,
      plinkoRisk: 'MEDIUM',
      crashAutoCashoutX: 2.0,
    });
    assert.equal(out1.hmacHex, out2.hmacHex);
    assert.equal(out1.multiplier.toFixed(6), out2.multiplier.toFixed(6));
    assert.equal(out1.payoutUsdt.toFixed(6), out2.payoutUsdt.toFixed(6));
  }

  // 2. MINES Multi-Step Session Cycle (Start -> Reveal Safe Tile -> Duplicate Tile Edge Case -> Cashout -> Double Cashout Edge Case)
  const minesPlayerId = nextNumericUserId(4);
  await apiPost(
    '/api/admin/users/adjust-balance',
    { targetUserId: minesPlayerId, currency: 'TON', deltaAmount: 30, reason: 'Mines Session TON' },
    ADMIN_ID
  );
  await apiPost(
    '/api/admin/users/adjust-balance',
    {
      targetUserId: minesPlayerId,
      currency: 'STARS',
      deltaAmount: 3000,
      reason: 'Mines Session Stars',
    },
    ADMIN_ID
  );

  let minesSessionCashtOut = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    const startMines = await apiPost(
      '/api/games/session/start',
      {
        gameId: 'MINES',
        currency: 'TON',
        betAmountTon: 1.0,
        minesCount: 1, // 24 out of 25 tiles are safe
      },
      minesPlayerId
    );
    assert.equal(startMines.status, 200);
    assert.equal(startMines.data.ok, true);

    const reveal0 = await apiPost(
      '/api/games/session/reveal',
      { tileIndex: 0 },
      minesPlayerId
    );
    assert.equal(reveal0.status, 200);

    if (reveal0.data.status === 'SAFE_GEM') {
      // Edge Case 1: Clicking an already-revealed Mines tile must be rejected with 400 TILE_ALREADY_REVEALED
      const duplicateReveal = await apiPost(
        '/api/games/session/reveal',
        { tileIndex: 0 },
        minesPlayerId
      );
      assert.equal(duplicateReveal.status, 400);
      assert.equal(duplicateReveal.data.ok, false);
      assert.ok(duplicateReveal.data.error.includes('TILE_ALREADY_REVEALED'));

      // Cashout the active Mines session
      const cashoutRes = await apiPost('/api/games/session/cashout', {}, minesPlayerId);
      assert.equal(cashoutRes.status, 200);
      assert.equal(cashoutRes.data.ok, true);
      assert.ok(cashoutRes.data.payoutTon > 1.0);

      // Edge Case 2: Double cashout attempt on the same Mines session must be rejected with 400 NO_ACTIVE_GAME_SESSION
      const doubleCashout = await apiPost('/api/games/session/cashout', {}, minesPlayerId);
      assert.equal(doubleCashout.status, 400);
      assert.equal(doubleCashout.data.ok, false);

      minesSessionCashtOut = true;
      break;
    }
  }
  assert.equal(minesSessionCashtOut, true, 'Mines session must complete a full cashout cycle');

  // Test Mines Session in STARS as well
  const startMinesStars = await apiPost(
    '/api/games/session/start',
    {
      gameId: 'MINES',
      currency: 'STARS',
      betAmountStars: 200,
      minesCount: 1,
    },
    minesPlayerId
  );
  assert.equal(startMinesStars.status, 200);
  const revStars = await apiPost('/api/games/session/reveal', { tileIndex: 2 }, minesPlayerId);
  if (revStars.data.status === 'SAFE_GEM') {
    const coStars = await apiPost('/api/games/session/cashout', {}, minesPlayerId);
    assert.equal(coStars.status, 200);
    assert.equal(coStars.data.ok, true);
  }

  // 3. Edge Case: Zero / Negative Bet Payload Injection
  const zeroBet = await apiPost(
    '/api/games/play',
    {
      gameId: 'DICE',
      currency: 'TON',
      betAmountTon: 0,
      diceRollUnder: 50,
    },
    minesPlayerId
  );
  assert.equal(zeroBet.status, 400);
  assert.equal(zeroBet.data.ok, false);

  const negativeBet = await apiPost(
    '/api/games/play',
    {
      gameId: 'PLINKO',
      currency: 'TON',
      betAmountTon: -5.5,
      plinkoRows: 12,
    },
    minesPlayerId
  );
  assert.equal(negativeBet.status, 400);
  assert.equal(negativeBet.data.ok, false);

  // 4. Verify 1.5% Buyer Mini-Game Rakeback Vault & 0.5% Inviter Referral Commission
  const playerSnap = await apiGet(`/api/snapshot?tg_uid=${playerId}`, playerId);
  const inviterSnap = await apiGet(`/api/snapshot?tg_uid=${inviterId}`, inviterId);

  assert.ok(
    playerSnap.data.rakebackVault.claimableTon > 0,
    'Player must accrue 1.5% TON mini-game rakeback'
  );
  assert.ok(
    playerSnap.data.rakebackVault.claimableStars > 0,
    'Player must accrue 1.5% STARS mini-game rakeback'
  );
  assert.ok(
    inviterSnap.data.referralProfile.claimableReferralTon > 0,
    'Inviter must accrue 0.5% TON mini-game referral commission'
  );
  assert.ok(
    inviterSnap.data.referralProfile.claimableReferralStars > 0,
    'Inviter must accrue 0.5% STARS mini-game referral commission'
  );
});

test('PHASE 3.3: Complete Lottery Lifecycle (Regular, Syndicate Squads, $1,000 Welcome, Monthly VIP)', async () => {
  const creatorId = nextNumericUserId(5);
  const member2Id = nextNumericUserId(6);
  const member3Id = nextNumericUserId(7);

  // 1. Sync users, bind referrals, and fund wallets
  await apiGet(`/api/snapshot?tg_uid=${creatorId}`, creatorId);
  for (const uid of [member2Id, member3Id]) {
    await apiGet(`/api/snapshot?tg_uid=${uid}`, uid);
    await apiPost('/api/referral/bind', { referralCode: `ref_${creatorId}` }, uid);
  }
  for (const uid of [creatorId, member2Id, member3Id]) {
    await apiPost(
      '/api/admin/users/adjust-balance',
      { targetUserId: uid, currency: 'TON', deltaAmount: 50, reason: 'Lottery Lifecycle Test Fund' },
      ADMIN_ID
    );
  }

  const snapInit = await apiGet(`/api/snapshot?tg_uid=${creatorId}`, creatorId);
  const roundCode = snapInit.data.rounds?.[0]?.roundCode || '#LDR-8493';

  // 2. Direct Ticket Purchase by Creator (unlocks Free $1,000 Welcome Ticket & accrues 3% Cashback)
  const directMint = await apiPost(
    '/api/tickets/purchase',
    {
      roundCode,
      currency: 'TON',
      amountTon: 2.0,
      slips: [
        { mainNumbers: [1, 2, 3, 4, 5], goldenBall: 1 },
        { mainNumbers: [6, 7, 8, 9, 10], goldenBall: 2 },
      ],
    },
    creatorId
  );
  assert.equal(directMint.status, 200);
  assert.equal(directMint.data.ok, true);
  assert.equal(directMint.data.tickets.length, 2);

  // Verify 5-Way Revenue Split on Ticket Purchase (85% Pool + 3% Cashback + 2% Referral + 3% Welcome Reserve + 7% Net House = 100%)
  const split = directMint.data.zeroLossSplit;
  const totalSplitSum = Number(
    (
      split.prizePoolUsdt +
      split.buyerCashbackUsdt +
      split.welcomeReserveUsdt +
      split.referralCommissionUsdt +
      split.netOperatorProfitUsdt
    ).toFixed(6)
  );
  assert.equal(
    totalSplitSum.toFixed(6),
    Number(split.grossSalesUsdt).toFixed(6),
    '5-way ticket revenue split (85% + 3% + 2% + 3% + 7-9%) must equal 100.000000% of gross sales'
  );

  // 3. Create Syndicate Squad & Have Multiple Members Join until 100% Filled -> Auto-Mint Tickets
  const createSynd = await apiPost(
    '/api/syndicates/create',
    {
      name: 'Audit Alpha Whales',
      roundCode,
      targetShares: 5,
      initialSharesToBuy: 2,
      currency: 'TON',
    },
    creatorId
  );
  assert.equal(createSynd.status, 200);
  assert.equal(createSynd.data.ok, true);
  const syndicateId = createSynd.data.syndicate.id;

  const joinM2 = await apiPost(
    '/api/syndicates/join',
    { syndicateId, sharesToBuy: 2, currency: 'TON' },
    member2Id
  );
  assert.equal(joinM2.status, 200);
  assert.equal(joinM2.data.ok, true);

  const joinM3 = await apiPost(
    '/api/syndicates/join',
    { syndicateId, sharesToBuy: 1, currency: 'TON' },
    member3Id
  );
  assert.equal(joinM3.status, 200);
  assert.equal(joinM3.data.ok, true);
  assert.equal(joinM3.data.syndicate.filledShares, 5);
  assert.equal(joinM3.data.syndicate.status, 'FULL');

  // Verify Pro-Rata Syndicate Prize Distribution Math (2/5 = 40%, 2/5 = 40%, 1/5 = 20%)
  const proRataDist = calculateSyndicateProRataDistribution({
    syndicate: joinM3.data.syndicate,
    totalPrizeTon: 10.0,
    tonUsdRate: 5.0,
  });
  assert.equal(proRataDist.payouts.length, 3);
  const cPayout = proRataDist.payouts.find((p) => p.userKey === creatorId)!;
  const m2Payout = proRataDist.payouts.find((p) => p.userKey === member2Id)!;
  const m3Payout = proRataDist.payouts.find((p) => p.userKey === member3Id)!;
  assert.equal(cPayout.payoutTon.toFixed(6), '4.000000');
  assert.equal(m2Payout.payoutTon.toFixed(6), '4.000000');
  assert.equal(m3Payout.payoutTon.toFixed(6), '2.000000');
  assert.equal(proRataDist.unallocatedDustTon.toFixed(6), '0.000000');

  // 4. Trigger Regular Lottery Draw (forcing winning numbers to match one of creator's slips & verify rollover)
  const monthlyPoolBefore = snapInit.data.monthlySuperJackpot?.accumulatedPoolTon || 0;
  const drawRes = await apiPost(
    '/api/admin/draw',
    {
      roundCode,
      forceWinningMain: [1, 2, 3, 4, 49], // 4 main balls match creator's first slip!
      forceWinningGolden: 9,
    },
    ADMIN_ID
  );
  assert.equal(drawRes.status, 200);
  assert.equal(drawRes.data.ok, true);
  assert.ok(
    drawRes.data.monthlySuperJackpot.accumulatedPoolTon >= monthlyPoolBefore,
    'Unclaimed Tier-1 pool must roll over into #LD-MONTHLY-VIP'
  );

  // 5. Unlock & Mint Free $1,000 Welcome Lottery Ticket with Custom Numbers
  const claimWelcome = await apiPost(
    '/api/lottery/welcome-1000/claim-ticket',
    {
      mainNumbers: [3, 11, 19, 27, 42],
      goldenBall: 7,
    },
    creatorId
  );
  assert.equal(claimWelcome.status, 200);
  assert.equal(claimWelcome.data.ok, true);
  assert.equal(claimWelcome.data.ticket.roundCode, WELCOME_GRAND_ROUND_ID);

  // Verify Self-Funding Reserve Guard (evaluateWelcomeLotteryScheduleGuard)
  const lowReserveState = evaluateWelcomeLotteryScheduleGuard(
    {
      roundId: WELCOME_GRAND_ROUND_ID,
      titleFa: 'لاتاری ۱۰۰۰ دلاری',
      titleEn: '$1,000 Welcome Lottery',
      targetPoolTon: 200,
      targetPoolStars: 50000,
      targetPoolUsdt: 1000,
      fundedReserveTon: 45, // < 200 TON target
      fundedReserveStars: 11250,
      fundedReserveUsdt: 225,
      fundingProgressPercent: 22.5,
      isReserveFullyFunded: false,
      houseMarginAllocationRatio: 0.2,
      cycleDurationDays: 15,
      autoExtendDaysIfUnfunded: 7,
      extensionsCount: 0,
      nextDrawTimestampMs: Date.now() - 1000, // expired timer
      status: 'COLLECTING_RESERVE',
      statusReasonFa: '',
      participantsCount: 10,
      totalPaidOutHistoryTon: 0,
      totalDrawsCompleted: 0,
      serverSeed: 'seed',
      serverSeedHash: 'hash',
      nonce: 1,
      lastWinnerSummary: undefined,
    } as any,
    {
      nowMs: Date.now(),
      tonUsdRate: 5.0,
    }
  );
  assert.equal(lowReserveState.shouldExecuteDraw, false);
  assert.equal(lowReserveState.autoExtended, true);

  // Fund Welcome Reserve & Execute Welcome Draw
  await apiPost(
    '/api/admin/welcome-lottery/config',
    { setReserveTon: 200 },
    ADMIN_ID
  );
  const welcomeDraw = await apiPost(
    '/api/admin/welcome-lottery/draw',
    { forceWinningMain: [3, 11, 19, 27, 42], forceWinningGolden: 7 },
    ADMIN_ID
  );
  assert.equal(welcomeDraw.status, 200);
  assert.equal(welcomeDraw.data.ok, true);

  // 6. Execute #LD-MONTHLY-VIP Draw & Verify Strict Tier-1 All-or-Nothing Rule
  const vipNoWinnerEval = evaluateMonthlySuperJackpotAllOrNothing({
    accumulatedPoolTon: 500,
    drawnMain: [1, 2, 3, 4, 5],
    drawnGolden: 1,
    tickets: [
      // Matched 5+0 (Tier 2 in regular draw, but in Monthly VIP All-or-Nothing only 5+1 wins!)
      {
        ticketCode: 'VIP-T2-ONLY',
        mainNumbers: [1, 2, 3, 4, 5],
        goldenBall: 9,
      },
    ],
  });
  assert.equal(vipNoWinnerEval.tier1WinnersCount, 0);
  assert.equal(vipNoWinnerEval.totalPaidOutTon, 0);
  assert.equal(vipNoWinnerEval.remainingRolloverTon.toFixed(6), '500.000000');

  const vipGrandWinnerEval = evaluateMonthlySuperJackpotAllOrNothing({
    accumulatedPoolTon: 500,
    drawnMain: [1, 2, 3, 4, 5],
    drawnGolden: 1,
    tickets: [
      {
        ticketCode: 'VIP-T1-WIN-A',
        mainNumbers: [1, 2, 3, 4, 5],
        goldenBall: 1,
      },
      {
        ticketCode: 'VIP-T1-WIN-B',
        mainNumbers: [1, 2, 3, 4, 5],
        goldenBall: 1,
      },
    ],
  });
  assert.equal(vipGrandWinnerEval.tier1WinnersCount, 2);
  assert.equal(vipGrandWinnerEval.totalPaidOutTon.toFixed(6), '500.000000');
  assert.equal(vipGrandWinnerEval.remainingRolloverTon, 0);
  assert.equal(vipGrandWinnerEval.evaluations[0].prizeTon.toFixed(6), '250.000000');
  assert.equal(vipGrandWinnerEval.evaluations[1].prizeTon.toFixed(6), '250.000000');

  const liveVipDraw = await apiPost('/api/admin/monthly-super-pot/draw', {}, ADMIN_ID);
  assert.equal(liveVipDraw.status, 200);
  assert.equal(liveVipDraw.data.ok, true);
});

test('PHASE 3.4: Strict Zero-Persian-Leakage Assertion Across EN, RU, and ES Locales', async () => {
  const nonRtlLocales: SupportedLocale[] = ['en', 'ru', 'es'];

  // 1. Collect every server-generated PAM ledger note pattern across the entire stack
  const exhaustiveLedgerSamples: Array<{ note: string; meta?: Record<string, any> }> = [
    { note: 'شارژ آنی تاییدشده بلاکچین TON (DEP-884120)' },
    { note: 'واریز آن‌چین تاییدشده TON (TonAPI • +25.50 TON • DEP-884120)' },
    { note: 'شارژ خودکار 1500 ⭐ Telegram Stars (DEP-991023)' },
    { note: 'تایید حواله واریز توسط ادمین (DEP-771234)' },
    { note: 'برداشت اتوماتیک آنی شبکه TON (5.25 TON) (WD-441290)' },
    { note: 'برداشت مبلغ بالا (120.00 TON) — در انتظار تایید ادمین (WD-551920)' },
    { note: 'برداشت آنی ستاره تلگرام (500 ⭐ به مقصد @vip_user) (WDS-331829)' },
    { note: 'برگشت وجه درخواست برداشت ردشده (WD-441290)' },
    { note: 'برگشت وجه درخواست برداشت ردشده (WDS-331829)' },
    { note: 'خرید 2 بلیت لاتاری در دور #LDR-8493 (2.00 TON • 85% استخر جایزه)' },
    { note: 'خرید 3 سهم در سندیکای گروهی نهنگ‌های طلایی TON (#SYN-4821) برای دور #LDR-8493' },
    { note: 'تسویه راس تایم استخر ۸۵٪ برای کوپن LDR-882910 (رتبه ششم (۳ گوی اصلی)) در دور #LDR-8493' },
    { note: 'سهم برنده سندیکای گروهی (#SYN-4821)' },
    { note: '🎉 جایزه لاتاری ویژه خوشآمدگویی ۱,۰۰۰ دلاری برای بلیت WLC-991823 (رتبه اول — جک‌پات بزرگ (۵ گوی + گوی طلایی ★))' },
    { note: '👑 جایزه جک‌پات مطلق ماهانه VIP برای بلیت VIP-771239 (رتبه اول — جک‌پات بزرگ (۵ گوی + گوی طلایی ★))' },
    { note: '💎 دریافت آنی کشبک و ریکبک VIP به کیف پول (+0.450000 TON)' },
    { note: '⭐ دریافت آنی کشبک و ریکبک VIP به کیف پول (+150 Stars)' },
    { note: 'برداشت آنی پورسانت دعوت دوستان به کیف پول (1.250000 TON • بدون کارمزد)' },
    { note: 'برداشت آنی پورسانت دعوت دوستان به کیف پول (300 ⭐ Stars • بدون کارمزد)' },
    { note: 'شرط بازی آنی DICE (MG-DICE-12 • 1 TON)' },
    { note: 'تسویه ضریب DICE (1.96x • 1.96 TON) — مرجع: mg_debit_12345' },
    { note: 'شرط بازی آنی PLINKO (MG-PLINKO-13 • 200 ⭐)' },
    { note: 'تسویه ضریب PLINKO (4.2x • 840 ⭐) — مرجع: mg_debit_67890' },
    { note: 'شرط بازی آنی CRASH (MG-CRASH-14 • 2 TON)' },
    { note: 'تسویه ضریب CRASH (2.5x • 5 TON) — مرجع: mg_debit_99887' },
    { note: 'شروع نشست بازی MINES (MG-MINES-15 • 1 TON)' },
    { note: 'برداشت موفق Mines (2.45x • 4💎)' },
    { note: 'برد کامل Mines (24.5x • 22💎)' },
    { note: 'پاداش صندوقچه وفاداری طلایی (رده نقره‌ای) از محل ۳٪ ذخیره سرریز' },
    { note: 'تسویه جایزه کوپن برنده LDR-449120 (TON Network)' },
    {
      note: 'تراکنش سیستمی جدید',
      meta: { txCategory: 'TICKET_PURCHASE', roundCode: '#LDR-8493', ticketCount: 3 },
    },
    {
      note: 'تراکنش جایزه لاتاری',
      meta: { txCategory: 'LOTTERY_WIN', roundCode: '#LDR-8493', ticketCode: 'LDR-112233', tier: 'رتبه سوم (۴ گوی + طلایی ★)' },
    },
    {
      note: 'تراکنش سندیکا',
      meta: {
        txCategory: 'SYNDICATE_WIN',
        roundCode: '#LDR-8493',
        syndicateId: 'SYN-4821',
      },
    },
  ];

  // 2. Collect server API responses, toast messages, tier labels, round titles & winner summaries
  const exhaustiveServerStrings: string[] = [
    'کیف پول شما با موفقیت شارژ شد.',
    'درخواست برداشت ثبت و از موجودی کسر شد.',
    'موجودی TON برای برداشت کافی نیست.',
    'موجودی قلک کشبک شما در حال حاضر صفر است.',
    '🎉 پاداش کشبک و ریکبک شما (+0.450000 TON) با کارمزد صفر به کیف پول اصلی واریز شد!',
    'NO_CLAIMABLE_REFERRAL_COMMISSION — موجودی قابل برداشت پورسانت دعوت دوستان در حال حاضر صفر است.',
    '🤝 سندیکای گروهی «نهنگ‌های طلایی TON» (#SYN-4821) با موفقیت ساخته شد و 2 بلیت واقعی برای شما صادر گردید!',
    '🎉 بلیت رایگان لاتاری ۱,۰۰۰ دلاری خوشآمدگویی شما با کد WLC-882910 و اعداد [3, 11, 19, 27, 42] + ★7 با موفقیت ثبت شد!',
    'رتبه اول — جک‌پات بزرگ (۵ گوی + گوی طلایی ★)',
    'رتبه دوم — جک‌پات نقره‌ای (۵ گوی اصلی)',
    'رتبه سوم (۴ گوی + طلایی ★)',
    'رتبه چهارم (۴ گوی اصلی)',
    'رتبه پنجم (۳ گوی + طلایی ★)',
    'رتبه ششم (۳ گوی اصلی)',
    'رتبه هفتم (۲ گوی اصلی + گوی طلایی ★)',
    'رتبه هشتم (تطابق گوی طلایی ★)',
    'بدون تطابق در این دور',
    'قرعه‌کشی بزرگ هفتگی #LDR-8493',
    'لاتاری رایگان ۱,۰۰۰ دلاری خوش‌آمدگویی',
    'ابرجک‌پات ماهانه VIP',
    'کاربر #4821',
    'کاربر تلگرام',
    'همین الان',
    'چند لحظه پیش',
    'تایید شده (On-Chain)',
    '۵ گوی از ۵۰ + ۱ گوی طلایی از ۱۵',
    'نهنگ‌های طلایی TON',
    'شکارچیان جک‌پات',
    'موج‌سواران الماس',
  ];

  for (const locale of nonRtlLocales) {
    // Check all PAM ledger descriptions
    for (const sample of exhaustiveLedgerSamples) {
      const localized = localizeTransactionDescription(sample.note, sample.meta, locale);
      assert.ok(localized.length > 0, `Empty localization for ${sample.note} in ${locale}`);
      assert.equal(
        PERSIAN_REGEX.test(localized),
        false,
        `Persian character leaked in localizeTransactionDescription (${locale}): "${localized}" from "${sample.note}"`
      );
    }

    // Check all Server messages, toast strings, round titles, and tier labels
    for (const raw of exhaustiveServerStrings) {
      const localizedMsg = localizeServerText(locale, raw);
      assert.equal(
        PERSIAN_REGEX.test(localizedMsg),
        false,
        `Persian character leaked in localizeServerText (${locale}): "${localizedMsg}" from "${raw}"`
      );

      const localizedTier = localizeTierLabel(locale, raw);
      assert.equal(
        PERSIAN_REGEX.test(localizedTier),
        false,
        `Persian character leaked in localizeTierLabel (${locale}): "${localizedTier}" from "${raw}"`
      );
    }

    // Check live synced server snapshot (drawHistory, syndicates, user ledger) localized for non-RTL locales
    const liveSnap = await apiGet(`/api/snapshot?tg_uid=${ADMIN_ID}`, ADMIN_ID);
    assert.equal(liveSnap.status, 200);

    for (const entry of (liveSnap.data.pamState?.ledger || []) as PAMLedgerEntry[]) {
      const renderedDesc = localizeTransactionDescription(entry.note, entry.meta, locale);
      assert.equal(
        PERSIAN_REGEX.test(renderedDesc),
        false,
        `Live PAM ledger entry leaked Persian in ${locale}: "${renderedDesc}"`
      );
    }

    for (const draw of liveSnap.data.drawHistory || []) {
      const renderedTitle = localizeServerText(locale, draw.roundTitleFa || draw.roundCode);
      assert.equal(
        PERSIAN_REGEX.test(renderedTitle),
        false,
        `Live drawHistory title leaked Persian in ${locale}: "${renderedTitle}"`
      );
    }

    // Check AI Concierge Replies under en, ru, es (even when user displayName is default Persian 'کاربر #9988')
    const conciergeReply = await generateUserConciergeReply({
      locale: locale.toLowerCase() as 'en' | 'ru' | 'es',
      userMessage: 'How does the lottery work, what is my balance and VIP rakeback?',
      userContext: {
        telegramUserId: '998877',
        displayName: 'کاربر #9988',
        tonBalance: 12.345678,
        starsBalance: 500,
        vipTier: 'GOLD',
        activeTicketsCount: 4,
        wonTicketsCount: 1,
        availableRakebackTon: 0.45,
        availableReferralTon: 0.25,
        welcomeTicketClaimed: false,
        monthlyVipTicketsCount: 2,
      },
    });
    assert.ok(conciergeReply.reply.length > 20);
    assert.equal(
      PERSIAN_REGEX.test(conciergeReply.reply),
      false,
      `AI Concierge reply leaked Persian in ${locale}: "${conciergeReply.reply}"`
    );
  }
});
