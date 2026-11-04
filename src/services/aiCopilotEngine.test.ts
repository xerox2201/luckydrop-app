import test from 'node:test';
import assert from 'node:assert/strict';
import { PAMSeamlessWalletEngine } from './pamWalletEngine.ts';
import {
  createCleanZeroUserProfile,
  normalizeWelcomeGrandLotteryState,
  normalizeRakebackVaultState,
  normalizeReferralProfileState,
  evaluateUserWelcomeTicketStatus,
  evaluateMonthlyVipQualification,
  type IsolatedUserAccountRecord,
  type MonthlySuperJackpotState,
  type SyndicatePoolRecord,
} from './securityGuard.ts';
import {
  detectUserConciergeIntent,
  buildDeterministicUserConciergeReply,
  generateUserConciergeReply,
  computeAdminExecutiveTelemetry,
  generateAdminCopilotReport,
  type UserConciergeTelemetryInput,
} from './aiCopilotEngine.ts';

function buildSampleMonthlyJackpotState(accumulatedPoolTon: number): MonthlySuperJackpotState {
  return {
    roundId: '#LD-MONTHLY-VIP',
    titleFa: 'ابرجک‌پات وفاداری ماهانه VIP',
    accumulatedPoolTon,
    accumulatedPoolStars: Math.round(accumulatedPoolTon * 250),
    accumulatedPoolUsdt: Number((accumulatedPoolTon * 5.0).toFixed(2)),
    nextMonthlyDrawTimestampMs: Date.now() + 14 * 24 * 60 * 60 * 1000,
    minTicketsRequired: 10,
    minXpRequired: 500,
    serverSeedHash: 'f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f',
    clientSeed: 'luckydrop_monthly_vip_seed',
    nonce: 1,
    rolloverHistory: [],
  };
}

function buildSampleUserConciergeInput(): UserConciergeTelemetryInput {
  const welcomeGrandLottery = normalizeWelcomeGrandLotteryState({
    fundedReserveTon: 64.25,
    targetPoolTon: 200.0,
    participantsCount: 18,
  });
  const monthlySuperJackpot = buildSampleMonthlyJackpotState(312.875);
  const welcomeTicketStatus = evaluateUserWelcomeTicketStatus({
    paidRegularTicketsCount: 3,
    existingWelcomeTicket: null,
  });
  const monthlyVipQualification = evaluateMonthlyVipQualification({
    regularTicketsBoughtCount: 12,
    userXp: 2500,
  });

  return {
    userKey: '99887766',
    displayName: 'Aria Whale VIP',
    username: 'aria_whale',
    vipTier: 'WHALE',
    tonBalance: 14.523891,
    starsBalance: 450,
    xp: 2500,
    activeTicketsCount: 4,
    totalTicketsCount: 12,
    rakebackClaimableTon: 0.48125,
    rakebackClaimableStars: 12,
    rakebackLifetimeTon: 1.925,
    referralCode: 'LD-99887766',
    referredByUserKey: '11223344',
    invitedCount: 9,
    activeBuyersCount: 6,
    claimableReferralTon: 0.8425,
    claimableReferralStars: 20,
    lifetimeReferralTon: 3.125,
    welcomeTicketStatus,
    welcomeGrandLottery,
    monthlySuperJackpot,
    monthlyVipQualification,
    activeSyndicatesCount: 2,
    userSyndicateSharesCount: 7,
    userSyndicateContributedTon: 2.8,
    serverSeedHash: 'a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8',
    clientSeed: 'aria_vip_seed_2026',
    nonce: 14,
  };
}

test('24/7 VIP User AI Concierge: classifies all 5 Quick-Ask chips & natural Persian queries accurately', () => {
  assert.equal(detectUserConciergeIntent('', 'ACCOUNT_STATUS'), 'ACCOUNT_STATUS');
  assert.equal(detectUserConciergeIntent('', 'WELCOME_1000_GUIDE'), 'WELCOME_1000_GUIDE');
  assert.equal(detectUserConciergeIntent('', 'SYNDICATE_REFERRAL_GUIDE'), 'SYNDICATE_REFERRAL_GUIDE');
  assert.equal(detectUserConciergeIntent('', 'PROVABLY_FAIR_AUDIT'), 'PROVABLY_FAIR_AUDIT');
  assert.equal(detectUserConciergeIntent('', 'HUMAN_ESCALATION'), 'HUMAN_ESCALATION');

  assert.equal(detectUserConciergeIntent('وضعیت حساب، کش‌بک و بلیت‌های من چقدر است؟'), 'ACCOUNT_STATUS');
  assert.equal(detectUserConciergeIntent('راهنمای بلیت رایگان ۱,۰۰۰ دلاری خوشآمدگویی'), 'WELCOME_1000_GUIDE');
  assert.equal(detectUserConciergeIntent('نحوه عملکرد سندیکا و پورسانت ۲٪ دعوت دوستان'), 'SYNDICATE_REFERRAL_GUIDE');
  assert.equal(detectUserConciergeIntent('اثبات عدالت قرعه‌کشی Provably Fair و هش سید'), 'PROVABLY_FAIR_AUDIT');
  assert.equal(detectUserConciergeIntent('ارتباط مستقیم با مدیر ارشد و ثبت تیکت انسانی'), 'HUMAN_ESCALATION');
});

test('24/7 VIP User AI Concierge: renders exact 6-decimal telemetry with zero Unicode emojis across all 5 chips', async () => {
  const sampleInput = buildSampleUserConciergeInput();
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  const r1 = await generateUserConciergeReply(sampleInput, 'وضعیت حساب', 'ACCOUNT_STATUS');
  assert.equal(r1.detectedIntent, 'ACCOUNT_STATUS');
  assert.equal(r1.escalatedToHuman, false);
  assert.ok(r1.replyTextFa.includes('14.523891 TON'), 'Must include exact 6-decimal TON balance');
  assert.ok(r1.replyTextFa.includes('0.481250 TON'), 'Must include exact 6-decimal claimable cashback');
  assert.equal(emojiRegex.test(r1.replyTextFa), false, 'Must not contain Unicode text emojis');

  const r2 = buildDeterministicUserConciergeReply(sampleInput, '', 'WELCOME_1000_GUIDE');
  assert.equal(r2.detectedIntent, 'WELCOME_1000_GUIDE');
  assert.ok(r2.replyTextFa.includes('64.250000 TON'), 'Must include exact 6-decimal Welcome Reserve');
  assert.ok(r2.replyTextFa.includes('200.000000 TON'), 'Must include exact 6-decimal Welcome Target');
  assert.equal(emojiRegex.test(r2.replyTextFa), false);

  const r3 = buildDeterministicUserConciergeReply(sampleInput, '', 'SYNDICATE_REFERRAL_GUIDE');
  assert.equal(r3.detectedIntent, 'SYNDICATE_REFERRAL_GUIDE');
  assert.ok(r3.replyTextFa.includes('0.842500 TON'), 'Must include exact 6-decimal claimable referral TON');
  assert.ok(r3.replyTextFa.includes('2.800000 TON'), 'Must include exact 6-decimal syndicate contribution');
  assert.equal(emojiRegex.test(r3.replyTextFa), false);

  const r4 = buildDeterministicUserConciergeReply(sampleInput, '', 'PROVABLY_FAIR_AUDIT');
  assert.equal(r4.detectedIntent, 'PROVABLY_FAIR_AUDIT');
  assert.ok(r4.replyTextFa.includes('312.875000 TON'), 'Must include exact 6-decimal Monthly VIP pool');
  assert.ok(r4.replyTextFa.includes('All-or-Nothing'));
  assert.equal(emojiRegex.test(r4.replyTextFa), false);

  const r5 = buildDeterministicUserConciergeReply(sampleInput, '', 'HUMAN_ESCALATION');
  assert.equal(r5.detectedIntent, 'HUMAN_ESCALATION');
  assert.equal(r5.escalatedToHuman, true);
  assert.ok(r5.replyTextFa.includes('TG-99887766'));
  assert.equal(emojiRegex.test(r5.replyTextFa), false);
});

test('Admin Executive AI Copilot: verifies 0.000000 TON PAM reconciliation and 5-way split balance sheet', async () => {
  const user1 = createCleanZeroUserProfile({
    telegramUserId: '1001',
    displayName: 'User One',
    username: 'user_one',
  });
  const pam1 = new PAMSeamlessWalletEngine(user1.pamState);
  pam1.credit({
    currency: 'TON',
    amountTon: 50,
    vertical: 'CRYPTO_TREASURY',
    roundId: 'DEP-1',
    transactionUuid: 'dep-test-1',
    note: 'Initial VIP Deposit',
  });
  pam1.debit({
    currency: 'TON',
    amountTon: 10,
    vertical: 'LUCKYDROP_LOTTERY',
    roundId: '#LD-2026-0327',
    transactionUuid: 'bet-test-1',
    note: 'Buy 5 Tickets ($50 USDT)',
  });
  user1.pamState = pam1.getState();
  user1.tonBalance = user1.pamState.tonBalance;
  user1.rakebackVault = normalizeRakebackVaultState({
    claimableTon: 0.3,
    claimableStars: 0,
    lifetimeEarnedTon: 0.3,
    lifetimeEarnedStars: 0,
  });
  user1.referralProfile = normalizeReferralProfileState({
    telegramUserId: '1001',
    referralProfile: {
      referralCode: 'LD-1001',
      referredByUserKey: null,
      invitedCount: 1,
      activeBuyersCount: 1,
      activeBuyerUserKeys: ['1002'],
      claimableReferralTon: 0.2,
      claimableReferralStars: 0,
      lifetimeReferralTon: 0.2,
      lifetimeReferralStars: 0,
      totalClaimsCount: 0,
      lastUpdatedIso: new Date().toISOString(),
    },
  });

  const user2 = createCleanZeroUserProfile({
    telegramUserId: '1002',
    displayName: 'User Two',
    username: 'user_two',
  });
  const pam2 = new PAMSeamlessWalletEngine(user2.pamState);
  pam2.credit({
    currency: 'TON',
    amountTon: 25,
    vertical: 'CRYPTO_TREASURY',
    roundId: 'DEP-2',
    transactionUuid: 'dep-test-2',
    note: 'Initial Member Deposit',
  });
  pam2.debit({
    currency: 'TON',
    amountTon: 10,
    vertical: 'LUCKYDROP_LOTTERY',
    roundId: '#LD-2026-0327',
    transactionUuid: 'bet-test-2',
    note: 'Buy 5 Tickets ($50 USDT)',
  });
  user2.pamState = pam2.getState();
  user2.tonBalance = user2.pamState.tonBalance;
  user2.rakebackVault = normalizeRakebackVaultState({
    claimableTon: 0.3,
    claimableStars: 0,
    lifetimeEarnedTon: 0.3,
    lifetimeEarnedStars: 0,
  });
  user2.referralProfile = normalizeReferralProfileState({
    telegramUserId: '1002',
    referralProfile: {
      referralCode: 'LD-1002',
      referredByUserKey: '1001',
      invitedCount: 0,
      activeBuyersCount: 0,
      activeBuyerUserKeys: [],
      claimableReferralTon: 0,
      claimableReferralStars: 0,
      lifetimeReferralTon: 0,
      lifetimeReferralStars: 0,
      totalClaimsCount: 0,
      lastUpdatedIso: new Date().toISOString(),
    },
  });

  const usersMap: Record<string, IsolatedUserAccountRecord> = {
    '1001': user1,
    '1002': user2,
  };

  // 20 TON gross sales ($100 USDT at $5/TON):
  // 85% Pool = 17.000000 TON
  // 3% Cashback = 0.600000 TON
  // 2% Referral = 0.200000 TON (User 2 was referred by User 1 on 10 TON purchase)
  // 3% Welcome Reserve = 0.600000 TON
  // Net House Profit = 20 - 17 - 0.6 - 0.2 - 0.6 = 1.600000 TON (8%)
  const tickets = [
    { roundCode: '#LD-2026-0327', costUsdt: '50.00', currencyNetwork: 'TON_MAINNET', status: 'ACTIVE' },
    { roundCode: '#LD-2026-0327', costUsdt: '50.00', currencyNetwork: 'TON_MAINNET', status: 'ACTIVE' },
  ];

  const syndicatePools: SyndicatePoolRecord[] = [
    {
      id: 'SYN-1001',
      name: 'Whale Alpha Squad',
      creatorUserKey: '1001',
      creatorUsername: 'user_one',
      roundCode: '#LD-2026-0327',
      targetShares: 10,
      filledShares: 6,
      sharePriceUsdt: 2.0,
      members: [
        { userKey: '1001', username: 'user_one', sharesCount: 6, contributedTon: 2.4, joinedAtMs: Date.now() },
      ],
      ticketIds: ['T-SYN-1', 'T-SYN-2'],
      totalPrizeWonTon: 0,
      totalPrizeWonUsdt: 0,
      status: 'OPEN',
      inviteCode: 'SYN1001',
    },
  ];

  const welcomeGrandLottery = normalizeWelcomeGrandLotteryState({
    fundedReserveTon: 0.6,
    targetPoolTon: 200.0,
  });
  const monthlySuperJackpot = buildSampleMonthlyJackpotState(120.5);

  const telemetry = computeAdminExecutiveTelemetry({
    usersMap,
    tickets,
    syndicatePools,
    welcomeGrandLottery,
    monthlySuperJackpot,
    tonUsdRate: 5.0,
  });

  assert.equal(telemetry.allWalletsReconciledClean, true);
  assert.equal(telemetry.totalPamDiscrepancyFormatted, '0.000000 TON');
  assert.equal(telemetry.grossTicketSalesTon, 20);
  assert.equal(telemetry.lockedPrizePool85Ton, 17);
  assert.equal(telemetry.buyerCashback3PercentTon, 0.6);
  assert.equal(telemetry.referralCommission2PercentTon, 0.2);
  assert.equal(telemetry.welcomeLotteryReserve3PercentTon, 0.6);
  assert.equal(telemetry.netHouseProfitTon, 1.6);

  // Conservation law check: 85% Pool + 3% Cashback + Referral + 3% Welcome Reserve + Net House == 100% Gross Sales
  const sumSplit = Number(
    (
      telemetry.lockedPrizePool85Ton +
      telemetry.buyerCashback3PercentTon +
      telemetry.referralCommission2PercentTon +
      telemetry.welcomeLotteryReserve3PercentTon +
      telemetry.netHouseProfitTon
    ).toFixed(6)
  );
  assert.equal(sumSplit, telemetry.grossTicketSalesTon);

  for (const actionType of ['BALANCE_SHEET', 'PAM_RECONCILE', 'RESERVE_VAULTS', 'SYNDICATE_REFERRAL'] as const) {
    for (const locale of ['fa', 'en', 'ru', 'ar', 'es'] as const) {
      const report = await generateAdminCopilotReport({
        actionType,
        locale,
        usersMap,
        tickets,
        syndicatePools,
        welcomeGrandLottery,
        monthlySuperJackpot,
        tonUsdRate: 5.0,
      });
      assert.equal(report.ok, true);
      assert.equal(report.actionType, actionType);
      assert.equal(report.locale, locale);
      assert.ok(report.report.length > 50);
      if (actionType === 'BALANCE_SHEET') {
        assert.ok(report.report.includes('20.000000 TON'), `Must include 6-decimal gross sales in ${locale}`);
        assert.ok(report.report.includes('17.000000 TON'), `Must include 6-decimal 85% pool in ${locale}`);
        assert.ok(report.report.includes('1.600000 TON'), `Must include 6-decimal net house profit in ${locale}`);
      } else if (actionType === 'PAM_RECONCILE') {
        assert.ok(report.report.includes('0.000000 TON'), `Must include 0.000000 TON discrepancy in ${locale}`);
      }
    }
  }
});

test('Multi-Lingual 5-Language (fa, en, ru, ar, es) User AI Concierge & i18n Engine Verification', async () => {
  const sampleInput = buildSampleUserConciergeInput();
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  const expectedGreetingSnippet: Record<'fa' | 'en' | 'ru' | 'ar' | 'es', string> = {
    fa: 'درود بر شما',
    en: 'Greetings Aria Whale VIP',
    ru: 'Приветствуем, Aria Whale VIP',
    ar: 'مرحباً بك Aria Whale VIP',
    es: 'Saludos Aria Whale VIP',
  };

  for (const locale of ['fa', 'en', 'ru', 'ar', 'es'] as const) {
    const res = await generateUserConciergeReply(
      sampleInput,
      'Account Status',
      'ACCOUNT_STATUS',
      locale
    );
    assert.equal(res.locale, locale);
    assert.equal(res.detectedIntent, 'ACCOUNT_STATUS');
    assert.ok(
      res.replyText.includes(expectedGreetingSnippet[locale]),
      `Expected localized greeting in ${locale}: got ${res.replyText}`
    );
    // Strict 6-decimal preservation across all 5 languages
    assert.ok(res.replyText.includes('14.523891 TON'));
    assert.ok(res.replyText.includes('0.481250 TON'));
    assert.ok(res.replyText.includes('2.800000 TON'));
    assert.equal(emojiRegex.test(res.replyText), false, `Zero Unicode emojis in ${locale}`);
  }
});

