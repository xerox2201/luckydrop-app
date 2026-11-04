import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAMSeamlessWalletEngine,
  type PAMCurrency,
} from '../services/pamWalletEngine.ts';
import {
  distributePoolAmongWinners,
} from '../utils/lotteryEngine.ts';
import {
  roundTonClean,
  roundStarsClean,
  createCleanZeroUserProfile,
  bindUserReferralAntiSybil,
  resolveStrictNativeTicketCost,
  resolveStrictNativeBetAmount,
  computeStrictNativePayout,
  calculateUnclaimedRolloverTransfer,
  evaluateMonthlyVipQualification,
  evaluateMonthlySuperJackpotAllOrNothing,
  computeServerAuthoritativeLotteryDraw,
  computeServerAuthoritativeGameOutcome,
  accrueLotteryTicketCashback,
  accrueMiniGameRakeback,
  normalizeRakebackVaultState,
  normalizeWelcomeGrandLotteryState,
  evaluateWelcomeLotteryScheduleGuard,
  validateAndPrepareWelcomeTicketSelection,
  evaluateUserWelcomeTicketStatus,
  validateSyndicateCreationInput,
  validateSyndicateJoinInput,
  applySyndicateSharePurchase,
  calculateSyndicateProRataDistribution,
  accrueReferralTicketCommission,
  accrueReferralMiniGameCommission,
  executeAtomicReferralVaultClaim,
  verifyAndClaimGrowthQuest,
  WELCOME_GRAND_ROUND_ID,
  type IsolatedUserAccountRecord,
  type SyndicatePoolRecord,
  type MonthlySuperJackpotRolloverItem,
  type AntiSybilGrowthQuestId,
} from '../services/securityGuard.ts';
import {
  evaluateTicketPrizeTier,
  deriveProvablyFairLotteryDraw,
  sha256Hex,
  type InstantMiniGameId,
} from '../utils/provablyFair.ts';

interface SimulatedTicket {
  ticketCode: string;
  botId: string;
  roundCode: string;
  mainNumbers: number[];
  goldenBall: number;
  costTon: number;
  costStars: number;
  costUsdt: number;
  currency: PAMCurrency;
  transactionUuid: string;
  syndicateId?: string;
  status: 'ACTIVE' | 'WON' | 'LOST';
  prizeWonTon: number;
}

interface SimulatedBot {
  botId: string;
  account: IsolatedUserAccountRecord;
  pam: PAMSeamlessWalletEngine;
  regularTicketsBought: number;
  vipSuperTicketsEarned: number;
  questBonusVipTickets: number;
}

/**
 * Deterministic Fast PRNG (Mulberry32) for reproducible Monte Carlo stress testing
 */
function createDeterministicPrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('30-Day Time-Compressed Full-Ecosystem Monte Carlo Stress Test (1,000 Bots / 30 Virtual Days / < 5s)', () => {
  const startTimeMs = performance.now();
  const rand = createDeterministicPrng(20261103);

  const TOTAL_BOTS = 1000;
  const TOTAL_DAYS = 30;
  const MONTHLY_VIP_ROUND_ID = '#LD-MONTHLY-VIP';

  // =========================================================================
  // 1. SPAWN 1,000 ISOLATED BOTS & BIND 60% REFERRAL NETWORK (ANTI-SYBIL AUDIT)
  // =========================================================================
  const bots: SimulatedBot[] = [];
  const usersMap: Record<string, IsolatedUserAccountRecord> = {};
  let totalInitialDepositTon = 0;
  let totalInitialDepositStars = 0;

  for (let i = 1; i <= TOTAL_BOTS; i++) {
    const botId = `bot_${String(i).padStart(4, '0')}`;
    const account = createCleanZeroUserProfile({
      telegramUserId: botId,
      displayName: `Bot #${i}`,
      username: botId,
    });

    const initTon = roundTonClean(35 + Math.floor(rand() * 165)); // 35 to 200 TON
    const initStars = roundStarsClean(3000 + Math.floor(rand() * 12000)); // 3,000 to 15,000 Stars

    const pam = new PAMSeamlessWalletEngine(account.pamState);

    pam.credit({
      transactionUuid: `tx_init_dep_ton_${botId}`,
      referenceTransactionUuid: null,
      roundId: '#GENESIS-DEP-TON',
      vertical: 'CRYPTO_TREASURY',
      currency: 'TON',
      amountTon: initTon,
      amountUsdt: roundTonClean(initTon * 5.0),
      note: 'Initial Stress Test TON Deposit',
    });

    pam.credit({
      transactionUuid: `tx_init_dep_stars_${botId}`,
      referenceTransactionUuid: null,
      roundId: '#GENESIS-DEP-STARS',
      vertical: 'TELEGRAM_STARS_INVOICE',
      currency: 'STARS',
      amountStars: initStars,
      amountUsdt: roundTonClean(initStars * 0.02),
      note: 'Initial Stress Test Stars Deposit',
    });

    account.pamState = pam.getState();
    account.tonBalance = roundTonClean(account.pamState.tonBalance);
    account.starsBalance = roundStarsClean(account.pamState.starsBalance);

    totalInitialDepositTon = roundTonClean(totalInitialDepositTon + initTon);
    totalInitialDepositStars = roundStarsClean(totalInitialDepositStars + initStars);

    usersMap[botId] = account;
    bots.push({
      botId,
      account,
      pam,
      regularTicketsBought: 0,
      vipSuperTicketsEarned: 0,
      questBonusVipTickets: 0,
    });
  }

  // Verify Anti-Self-Referral Guard on Bot #1
  const selfRefAttempt = bindUserReferralAntiSybil({
    userAccount: bots[0].account,
    rawReferralInput: `ref_${bots[0].botId}`,
    usersMap,
  });
  assert.equal(selfRefAttempt.ok, false);
  assert.equal(selfRefAttempt.reason, 'SELF_REFERRAL_FORBIDDEN');

  // Bind 60% of the 1,000 bots (600 bots: indices 400..999) to inviters in indices 0..399
  let boundReferralsCount = 0;
  for (let i = 400; i < TOTAL_BOTS; i++) {
    const inviterBot = bots[i % 250]; // Concentrated inviters so many hit 1+ and 5+ active referrals
    const bindRes = bindUserReferralAntiSybil({
      userAccount: bots[i].account,
      rawReferralInput: inviterBot.account.referralCode,
      usersMap,
    });
    assert.equal(bindRes.ok, true, `Bot ${bots[i].botId} referral bind must succeed`);
    boundReferralsCount += 1;
  }
  assert.equal(boundReferralsCount, 600, 'Exactly 60% (600 of 1,000) bots must be bound via referral codes');

  // Verify Immutable Referral Overwrite Guard (cannot re-bind once referred)
  const overwriteAttempt = bindUserReferralAntiSybil({
    userAccount: bots[400].account,
    rawReferralInput: bots[10].account.referralCode,
    usersMap,
  });
  assert.equal(overwriteAttempt.ok, false);
  assert.equal(overwriteAttempt.reason, 'ALREADY_REFERRED_IMMUTABLE');

  // Verify Circular Referral Guard (Bot #151 [index 150] was inviter of Bot #401 [index 400]; index 150 cannot bind to index 400)
  const circularAttempt = bindUserReferralAntiSybil({
    userAccount: bots[150].account,
    rawReferralInput: bots[400].account.referralCode,
    usersMap,
  });
  assert.equal(circularAttempt.ok, false);
  assert.equal(circularAttempt.reason, 'CIRCULAR_REFERRAL_FORBIDDEN');

  // =========================================================================
  // 2. IN-MEMORY SIMULATION STATE & MASTER TELEMETRY COUNTERS
  // =========================================================================
  const allTickets: SimulatedTicket[] = [];
  const vipSuperTickets: SimulatedTicket[] = [];
  const welcomeTickets: SimulatedTicket[] = [];
  const syndicatePools: SyndicatePoolRecord[] = [];
  const rolloverHistory: MonthlySuperJackpotRolloverItem[] = [];

  let monthlyVaultAccumulatedTon = 0;
  let monthlyVaultNonce = 1;
  const monthlyVaultServerSeed = sha256Hex('luckydrop_monte_carlo_monthly_vip_seed_v2');

  const baseVirtualTimestampMs = Date.now();
  let welcomeLotteryState = normalizeWelcomeGrandLotteryState(
    {
      targetPoolUsdt: 1000,
      fundedReserveTon: 0,
      houseMarginAllocationRatio: 0.25,
      nextDrawTimestampMs: baseVirtualTimestampMs + 30 * 24 * 60 * 60 * 1000,
      autoExtendDaysIfUnfunded: 7,
      autoExtensionCount: 0,
    },
    5.0,
    0
  );

  // Master Financial & Conservation Counters
  let totalTransactionsCount = TOTAL_BOTS * 2; // Initial TON + Stars deposits
  let totalTicketsMintedAll = 0;
  let totalDirectTicketsSold = 0;
  let totalSyndicateSharesSold = 0;
  let totalTonTicketsSold = 0;
  let totalStarsTicketsSold = 0;
  let totalVipSuperTicketsMinted = 0;
  let totalWelcomeTicketsClaimed = 0;

  let totalGrossSalesTon = 0;
  let totalTicketSalesTonDirect = 0;
  let totalTicketSalesStarsDirect = 0;

  // 5-Way Self-Funding Split Accumulators (Must sum to 100.000000% of totalGrossSalesTon)
  let totalSplitDistributable85Ton = 0;
  let totalSplitBuyerCashback3Ton = 0;
  let totalSplitInviterReferral2Ton = 0;
  let totalSplitWelcomeReserve3Ton = 0;
  let totalSplitNetHouseProfitTon = 0;
  let maxSinglePurchaseSplitDeltaTon = 0;

  // Syndicate Counters
  let totalSyndicatesCreated = 0;
  let totalSyndicateJoins = 0;
  let totalSyndicatesWonCount = 0;
  let totalSyndicatePrizesDistributedTon = 0;
  let totalSyndicateUnallocatedDustTon = 0;

  // Vault & Quest Claim Counters
  let totalCashbackClaimsExecuted = 0;
  let totalCashbackClaimedTon = 0;
  let totalCashbackClaimedStars = 0;

  let totalReferralClaimsExecuted = 0;
  let totalReferralClaimedTon = 0;
  let totalReferralClaimedStars = 0;

  let totalQuestsClaimedCount = 0;
  let totalQuestXpAwarded = 0;
  let totalQuestVipTicketsAwarded = 0;

  // Regular & Mini-Game Counters
  let totalRegularPrizesPaidTon = 0;
  let totalRegularWinnersCount = 0;
  let totalRolloversToMonthlyVaultTon = 0;

  let totalMiniGamesPlayed = 0;
  let totalMiniGamesWon = 0;
  let totalMiniGameVolumeTon = 0;
  let totalMiniGameVolumeStars = 0;
  let totalMiniGamePayoutTon = 0;
  let totalMiniGamePayoutStars = 0;
  let totalMiniGameRakebackTon = 0;
  let totalMiniGameRakebackStars = 0;
  let totalMiniGameReferralTon = 0;
  let totalMiniGameReferralStars = 0;

  const miniGameIds: InstantMiniGameId[] = ['DICE_52', 'MINES', 'PLINKO', 'CRASH_X'];

  // Helper to process any ticket purchase (Direct or Syndicate Share) through the atomic 5-way pipeline
  const processSimulatedTicketPurchase = (params: {
    bot: SimulatedBot;
    qty: number;
    currency: PAMCurrency;
    roundCode: string;
    day: number;
    liveOracleTonUsdRate: number;
    syndicateId?: string;
    roundTickets: SimulatedTicket[];
  }): {
    ok: boolean;
    mintedCodes: string[];
    grossTonEquiv: number;
    distributable85Ton: number;
  } => {
    const { bot, qty, currency, roundCode, day, liveOracleTonUsdRate, syndicateId, roundTickets } =
      params;
    const pamState = bot.pam.getState();

    const costSpec = resolveStrictNativeTicketCost({
      currency,
      ticketCount: qty,
      roundTicketPriceTon: 1.0, // 1 TON or 250 Stars per ticket/share
      availableTonBalance: pamState.tonBalance,
      availableStarsBalance: pamState.starsBalance,
    });

    if (!costSpec.valid) {
      return { ok: false, mintedCodes: [], grossTonEquiv: 0, distributable85Ton: 0 };
    }

    const txUuid = `tx_tkt_d${day}_${bot.botId}_${totalTransactionsCount}`;
    const debitRes = bot.pam.debit({
      transactionUuid: txUuid,
      roundId: roundCode,
      vertical: 'LUCKYDROP_LOTTERY',
      currency,
      amountTon: currency === 'TON' ? costSpec.totalTon : undefined,
      amountStars: currency === 'STARS' ? costSpec.totalStars : undefined,
      amountUsdt: costSpec.nominalTotalUsdt,
      note: syndicateId
        ? `Day ${day} syndicate ${syndicateId} purchase (${qty} shares)`
        : `Day ${day} direct purchase (${qty} tickets)`,
    });

    assert.equal(debitRes.ok, true, `Ticket debit must succeed for ${bot.botId}`);
    bot.account.pamState = bot.pam.getState();
    bot.account.tonBalance = roundTonClean(bot.account.pamState.tonBalance);
    bot.account.starsBalance = roundStarsClean(bot.account.pamState.starsBalance);
    totalTransactionsCount += 1;

    const grossTonEquiv =
      currency === 'TON' ? costSpec.totalTon : roundTonClean(costSpec.totalStars / 250);

    // 1) Execute 5-Way Self-Funding Split & Credit 2% Inviter Referral Commission (if referred)
    const refComm = accrueReferralTicketCommission({
      buyerAccount: bot.account,
      usersMap,
      currency,
      grossTon: grossTonEquiv,
      grossStars: costSpec.totalStars,
      tonUsdRate: liveOracleTonUsdRate,
    });

    const split = refComm.split;
    assert.ok(
      split.conservationDeltaTon < 0.000001,
      `Single purchase 5-way split conservation failed: delta=${split.conservationDeltaTon}`
    );
    maxSinglePurchaseSplitDeltaTon = Math.max(
      maxSinglePurchaseSplitDeltaTon,
      split.conservationDeltaTon
    );

    totalGrossSalesTon = roundTonClean(totalGrossSalesTon + split.grossTon);
    totalSplitDistributable85Ton = roundTonClean(
      totalSplitDistributable85Ton + split.distributablePool85Ton
    );
    totalSplitBuyerCashback3Ton = roundTonClean(
      totalSplitBuyerCashback3Ton + split.buyerCashback3Ton
    );
    totalSplitInviterReferral2Ton = roundTonClean(
      totalSplitInviterReferral2Ton + split.inviterReferral2Ton
    );
    totalSplitWelcomeReserve3Ton = roundTonClean(
      totalSplitWelcomeReserve3Ton + split.welcomeReserve3Ton
    );
    totalSplitNetHouseProfitTon = roundTonClean(
      totalSplitNetHouseProfitTon + split.netHouseProfitTon
    );

    // 2) Accrue 3% Instant Cashback into Buyer's Rakeback Vault
    const cashbackAccrual = accrueLotteryTicketCashback(bot.account.rakebackVault, {
      currency,
      totalTon: costSpec.totalTon,
      totalStars: costSpec.totalStars,
    });
    bot.account.rakebackVault = cashbackAccrual.updatedVault;

    // 3) Accrue 3% (25% of 12% house margin) into Welcome $1,000 Lottery Reserve
    welcomeLotteryState = normalizeWelcomeGrandLotteryState(
      {
        ...welcomeLotteryState,
        fundedReserveTon: roundTonClean(
          welcomeLotteryState.fundedReserveTon + split.welcomeReserve3Ton
        ),
      },
      liveOracleTonUsdRate,
      welcomeTickets.length
    );

    if (currency === 'TON') {
      totalTicketSalesTonDirect = roundTonClean(totalTicketSalesTonDirect + costSpec.totalTon);
      totalTonTicketsSold += qty;
    } else {
      totalTicketSalesStarsDirect = roundStarsClean(
        totalTicketSalesStarsDirect + costSpec.totalStars
      );
      totalStarsTicketsSold += qty;
    }

    // 4) Mint Real Lottery Tickets Immediately (Zero-Escrow)
    const mintedCodes: string[] = [];
    for (let s = 0; s < qty; s++) {
      totalTicketsMintedAll += 1;
      if (syndicateId) {
        totalSyndicateSharesSold += 1;
      } else {
        totalDirectTicketsSold += 1;
      }

      const pickedSet = new Set<number>();
      while (pickedSet.size < 5) {
        pickedSet.add(1 + Math.floor(rand() * 50));
      }
      const mainNumbers = Array.from(pickedSet).sort((a, b) => a - b);
      const goldenBall = 1 + Math.floor(rand() * 15);
      const ticketCode = syndicateId
        ? `SYN-D${day}-${totalTicketsMintedAll}`
        : `LDR-D${day}-${totalTicketsMintedAll}`;

      const tkt: SimulatedTicket = {
        ticketCode,
        botId: bot.botId,
        roundCode,
        mainNumbers,
        goldenBall,
        costTon: currency === 'TON' ? 1.0 : 0,
        costStars: currency === 'STARS' ? 250 : 0,
        costUsdt: liveOracleTonUsdRate,
        currency,
        transactionUuid: s === 0 ? txUuid : `${txUuid}_${s + 1}`,
        syndicateId,
        status: 'ACTIVE',
        prizeWonTon: 0,
      };
      roundTickets.push(tkt);
      allTickets.push(tkt);
      bot.account.myTickets.push(ticketCode);
      mintedCodes.push(ticketCode);
    }

    // 5) First-Purchase $1,000 Welcome Lottery Entitlement & Auto-Pick Registration
    const wasFirstPaidPurchase = bot.regularTicketsBought === 0;
    bot.regularTicketsBought += qty;
    bot.account.xp += qty * 25;

    if (wasFirstPaidPurchase && !bot.account.welcomeTicketClaimed) {
      bot.account.welcomeTicketUnlocked = true;
      bot.account.welcomeTicketEntitlement = 1;

      const welcomeStatus = evaluateUserWelcomeTicketStatus({
        userAccount: bot.account,
        paidRegularTicketsCount: bot.regularTicketsBought,
        existingWelcomeTicket: null,
      });
      assert.equal(welcomeStatus.statusCode, 'UNLOCKED_READY_TO_PICK');

      const wSet = new Set<number>();
      while (wSet.size < 5) {
        wSet.add(1 + Math.floor(rand() * 50));
      }
      const wPick = validateAndPrepareWelcomeTicketSelection({
        mainNumbers: Array.from(wSet),
        goldenBall: 1 + Math.floor(rand() * 15),
      });
      assert.equal(wPick.valid, true);

      const wCode = `WLC-${bot.botId.toUpperCase()}`;
      bot.account.welcomeTicketClaimed = true;
      bot.account.welcomeTicketEntitlement = 0;
      bot.account.welcomeTicketCode = wCode;

      welcomeTickets.push({
        ticketCode: wCode,
        botId: bot.botId,
        roundCode: WELCOME_GRAND_ROUND_ID,
        mainNumbers: wPick.cleanMainNumbers,
        goldenBall: wPick.cleanGoldenBall,
        costTon: 0,
        costStars: 0,
        costUsdt: 0,
        currency: 'TON',
        transactionUuid: `${txUuid}_wlc`,
        status: 'ACTIVE',
        prizeWonTon: 0,
      });
      totalWelcomeTicketsClaimed += 1;
    }

    // 6) Monthly VIP Super-Ticket Progress (1 VIP ticket per 5 regular/syndicate tickets)
    const vipQual = evaluateMonthlyVipQualification({
      regularTicketsBoughtCount: bot.regularTicketsBought,
      userXp: bot.account.xp,
      minTicketsRequired: 10,
      minXpRequired: 500,
      existingVipSuperTicketsCount: bot.vipSuperTicketsEarned,
    });

    if (vipQual.newlyEarnedVipSuperTicketsCount > 0) {
      for (let v = 0; v < vipQual.newlyEarnedVipSuperTicketsCount; v++) {
        const vipNonce = monthlyVaultNonce++;
        const vipPick = deriveProvablyFairLotteryDraw({
          serverSeed: monthlyVaultServerSeed,
          clientSeed: `${bot.botId}:vip_${vipNonce}`,
          nonce: vipNonce,
          roundCode: MONTHLY_VIP_ROUND_ID,
          mainCount: 5,
          mainMax: 50,
          goldenMax: 15,
        });
        vipSuperTickets.push({
          ticketCode: `VIP-D${day}-${vipSuperTickets.length + 1}`,
          botId: bot.botId,
          roundCode: MONTHLY_VIP_ROUND_ID,
          mainNumbers: vipPick.drawnMain,
          goldenBall: vipPick.drawnGolden,
          costTon: 0,
          costStars: 0,
          costUsdt: 0,
          currency: 'TON',
          transactionUuid: `${txUuid}_vip_${v + 1}`,
          status: 'ACTIVE',
          prizeWonTon: 0,
        });
        totalVipSuperTicketsMinted += 1;
      }
      bot.vipSuperTicketsEarned = vipQual.vipSuperTicketsEarnedTotal;
    }

    return {
      ok: true,
      mintedCodes,
      grossTonEquiv: split.grossTon,
      distributable85Ton: split.distributablePool85Ton,
    };
  };

  // =========================================================================
  // 3. SIMULATE 30 CONSECUTIVE VIRTUAL DAYS
  // =========================================================================
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const virtualNowMs = baseVirtualTimestampMs + day * 24 * 60 * 60 * 1000;
    const roundCode = `#LDR-DAY-${String(day).padStart(2, '0')}`;
    const liveOracleTonUsdRate = Number((2.2 + rand() * 2.8).toFixed(4));
    const roundServerSeed = sha256Hex(`round_seed_${roundCode}_${virtualNowMs}`);

    const roundTickets: SimulatedTicket[] = [];
    const roundSyndicates: SyndicatePoolRecord[] = [];
    let roundDistributablePool85Ton = 0;

    // A) Create 4 Syndicate Squad Pools (5 to 20 target shares) for this round
    for (let sIdx = 1; sIdx <= 4; sIdx++) {
      const creatorBot = bots[Math.floor(rand() * TOTAL_BOTS)];
      const targetShares = 5 + Math.floor(rand() * 16); // 5 to 20 shares
      const initialShares = 1 + Math.floor(rand() * Math.min(3, targetShares - 1));

      const creationCheck = validateSyndicateCreationInput({
        name: `Squad D${day}-${sIdx}`,
        targetShares,
        initialSharesToBuy: initialShares,
      });
      assert.equal(creationCheck.valid, true);

      const pamState = creatorBot.pam.getState();
      const useStars = rand() < 0.25 && pamState.starsBalance >= initialShares * 250;
      const currency: PAMCurrency = useStars ? 'STARS' : 'TON';
      const synId = `SYN-D${day}-${sIdx}`;

      const purchaseRes = processSimulatedTicketPurchase({
        bot: creatorBot,
        qty: creationCheck.cleanInitialShares,
        currency,
        roundCode,
        day,
        liveOracleTonUsdRate,
        syndicateId: synId,
        roundTickets,
      });

      if (!purchaseRes.ok) continue;

      roundDistributablePool85Ton = roundTonClean(
        roundDistributablePool85Ton + purchaseRes.distributable85Ton
      );

      let synRecord: SyndicatePoolRecord = {
        id: synId,
        name: creationCheck.cleanName,
        creatorUserKey: creatorBot.botId,
        creatorUsername: creatorBot.account.username,
        roundCode,
        targetShares: creationCheck.cleanTargetShares,
        filledShares: 0,
        sharePriceUsdt: liveOracleTonUsdRate,
        members: [],
        ticketIds: [],
        totalPrizeWonTon: 0,
        totalPrizeWonUsdt: 0,
        status: 'OPEN',
        inviteCode: `squad_${synId.toLowerCase()}`,
      };

      const applied = applySyndicateSharePurchase({
        syndicate: synRecord,
        buyerUserKey: creatorBot.botId,
        buyerUsername: creatorBot.account.username,
        sharesBought: creationCheck.cleanInitialShares,
        contributedTon: purchaseRes.grossTonEquiv,
        mintedTicketCodes: purchaseRes.mintedCodes,
        nowMs: virtualNowMs,
      });
      synRecord = applied.updatedSyndicate;
      totalSyndicatesCreated += 1;

      // Have 3 to 7 other bots join this Syndicate Squad Pool
      const joinAttempts = 3 + Math.floor(rand() * 5);
      for (let j = 0; j < joinAttempts; j++) {
        if (synRecord.status === 'FULL') break;
        const joinerBot = bots[Math.floor(rand() * TOTAL_BOTS)];
        const remaining = synRecord.targetShares - synRecord.filledShares;
        if (remaining <= 0) break;
        const sharesToBuy = Math.min(remaining, 1 + Math.floor(rand() * 3));

        const joinCheck = validateSyndicateJoinInput({
          syndicate: synRecord,
          sharesToBuy,
        });
        if (!joinCheck.valid) continue;

        const jPam = joinerBot.pam.getState();
        const jUseStars = rand() < 0.25 && jPam.starsBalance >= joinCheck.cleanSharesToBuy * 250;
        const jCurrency: PAMCurrency = jUseStars ? 'STARS' : 'TON';

        const joinPurchase = processSimulatedTicketPurchase({
          bot: joinerBot,
          qty: joinCheck.cleanSharesToBuy,
          currency: jCurrency,
          roundCode,
          day,
          liveOracleTonUsdRate,
          syndicateId: synId,
          roundTickets,
        });

        if (!joinPurchase.ok) continue;

        roundDistributablePool85Ton = roundTonClean(
          roundDistributablePool85Ton + joinPurchase.distributable85Ton
        );

        const joinApplied = applySyndicateSharePurchase({
          syndicate: synRecord,
          buyerUserKey: joinerBot.botId,
          buyerUsername: joinerBot.account.username,
          sharesBought: joinCheck.cleanSharesToBuy,
          contributedTon: joinPurchase.grossTonEquiv,
          mintedTicketCodes: joinPurchase.mintedCodes,
          nowMs: virtualNowMs + j * 1000,
        });
        synRecord = joinApplied.updatedSyndicate;
        totalSyndicateJoins += 1;

        // Grant +15 XP Squad Synergy Bonus to creator when another bot joins
        if (joinApplied.creatorSynergyXpBonus > 0) {
          creatorBot.account.xp += joinApplied.creatorSynergyXpBonus;
        }
      }

      roundSyndicates.push(synRecord);
      syndicatePools.push(synRecord);
    }

    // B) Direct Daily Lottery Ticket Purchases across bots
    for (let bIdx = 0; bIdx < TOTAL_BOTS; bIdx++) {
      if (rand() > 0.20) continue;
      const bot = bots[bIdx];
      const qty = rand() < 0.65 ? 1 : rand() < 0.9 ? 2 : 5;
      const pamState = bot.pam.getState();
      const useStars = rand() < 0.35 && pamState.starsBalance >= qty * 250;
      const currency: PAMCurrency = useStars ? 'STARS' : 'TON';

      const directRes = processSimulatedTicketPurchase({
        bot,
        qty,
        currency,
        roundCode,
        day,
        liveOracleTonUsdRate,
        roundTickets,
      });

      if (directRes.ok) {
        roundDistributablePool85Ton = roundTonClean(
          roundDistributablePool85Ton + directRes.distributable85Ton
        );
      }
    }

    // C) Instant Mini-Games (with 1.5% Buyer Rakeback + 0.5% Inviter Referral Turnover Commission)
    for (let m = 0; m < 120; m++) {
      const bot = bots[Math.floor(rand() * TOTAL_BOTS)];
      const gameId = miniGameIds[Math.floor(rand() * miniGameIds.length)];
      const pamState = bot.pam.getState();
      const useStars = rand() < 0.3 && pamState.starsBalance >= 100;
      const currency: PAMCurrency = useStars ? 'STARS' : 'TON';

      const rawBetTon = roundTonClean(0.2 + rand() * 1.2);
      const rawBetStars = roundStarsClean(50 + Math.floor(rand() * 200));

      const resolvedBet = resolveStrictNativeBetAmount({
        currency,
        amountTon: currency === 'TON' ? rawBetTon : undefined,
        amountStars: currency === 'STARS' ? rawBetStars : undefined,
        availableTonBalance: pamState.tonBalance,
        availableStarsBalance: pamState.starsBalance,
      });

      if (!resolvedBet.valid) continue;

      const debitUuid = `tx_mg_debit_d${day}_${m}_${bot.botId}`;
      const debitRes = bot.pam.debit({
        transactionUuid: debitUuid,
        roundId: `#MG-${gameId}-D${day}-${m}`,
        vertical: `INSTANT_${gameId}`,
        currency,
        amountTon: currency === 'TON' ? resolvedBet.amountTon : undefined,
        amountStars: currency === 'STARS' ? resolvedBet.amountStars : undefined,
        amountUsdt: resolvedBet.nominalUsdt,
        note: `Mini-game ${gameId} wager`,
      });
      if (!debitRes.ok) continue;

      totalTransactionsCount += 1;
      totalMiniGamesPlayed += 1;

      if (currency === 'TON') {
        totalMiniGameVolumeTon = roundTonClean(totalMiniGameVolumeTon + resolvedBet.amountTon);
      } else {
        totalMiniGameVolumeStars = roundStarsClean(
          totalMiniGameVolumeStars + resolvedBet.amountStars
        );
      }

      // 1.5% Mini-Game Rakeback into player's rakebackVault
      const mgRake = accrueMiniGameRakeback(bot.account.rakebackVault, {
        currency,
        betAmountTon: resolvedBet.amountTon,
        betAmountStars: resolvedBet.amountStars,
      });
      bot.account.rakebackVault = mgRake.updatedVault;
      totalMiniGameRakebackTon = roundTonClean(totalMiniGameRakebackTon + mgRake.accruedTon);
      totalMiniGameRakebackStars = roundStarsClean(
        totalMiniGameRakebackStars + mgRake.accruedStars
      );

      // 0.5% Mini-Game Turnover Commission into inviter's referralProfile
      const mgRef = accrueReferralMiniGameCommission({
        playerAccount: bot.account,
        usersMap,
        currency,
        betAmountTon: resolvedBet.amountTon,
        betAmountStars: resolvedBet.amountStars,
      });
      totalMiniGameReferralTon = roundTonClean(totalMiniGameReferralTon + mgRef.creditedTon);
      totalMiniGameReferralStars = roundStarsClean(
        totalMiniGameReferralStars + mgRef.creditedStars
      );

      const evaluation = computeServerAuthoritativeGameOutcome({
        gameId,
        betAmountUsdt: resolvedBet.nominalUsdt,
        serverSeed: pamState.seeds.serverSeed,
        clientSeed: pamState.seeds.clientSeed,
        nonce: pamState.seeds.nonce,
        diceTarget: 50,
        diceMode: 'UNDER',
        crashAutoCashoutX: 1.85,
        plinkoRows: 12,
        plinkoRisk: 'MEDIUM',
        minesCount: 3,
        minesRevealedSafeCount: 2,
        selectedTiles: [0, 6],
      });

      const nativePayout = computeStrictNativePayout({
        currency,
        betAmountTon: resolvedBet.amountTon,
        betAmountStars: resolvedBet.amountStars,
        won: evaluation.won,
        multiplier: evaluation.multiplier,
      });

      if (evaluation.won && (nativePayout.payoutTon > 0 || nativePayout.payoutStars > 0)) {
        totalMiniGamesWon += 1;
        const creditRes = bot.pam.credit({
          transactionUuid: `tx_mg_win_d${day}_${m}_${bot.botId}`,
          referenceTransactionUuid: debitUuid,
          roundId: `#MG-${gameId}-D${day}-${m}`,
          vertical: `INSTANT_${gameId}`,
          currency,
          amountTon: currency === 'TON' ? nativePayout.payoutTon : undefined,
          amountStars: currency === 'STARS' ? nativePayout.payoutStars : undefined,
          amountUsdt: nativePayout.payoutNominalUsdt,
          note: `Mini-game ${gameId} win (${evaluation.multiplier}x)`,
        });
        assert.equal(creditRes.ok, true);
        totalTransactionsCount += 1;

        if (currency === 'TON') {
          totalMiniGamePayoutTon = roundTonClean(totalMiniGamePayoutTon + nativePayout.payoutTon);
        } else {
          totalMiniGamePayoutStars = roundStarsClean(
            totalMiniGamePayoutStars + nativePayout.payoutStars
          );
        }
      }

      bot.account.pamState = bot.pam.getState();
      bot.account.tonBalance = roundTonClean(bot.account.pamState.tonBalance);
      bot.account.starsBalance = roundStarsClean(bot.account.pamState.starsBalance);
    }

    // D) End-of-Day Regular Lottery Draw + Pro-Rata Syndicate Distribution + Unclaimed Rollover
    const distributablePool85Usdt = Number(
      (roundDistributablePool85Ton * liveOracleTonUsdRate).toFixed(6)
    );

    const drawProof = computeServerAuthoritativeLotteryDraw({
      serverSeed: roundServerSeed,
      clientSeed: `luckydrop_daily_client_seed_d${day}`,
      nonce: day,
      roundCode,
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
    });

    const candidateEvals = roundTickets.map((tkt) => ({
      ticket: tkt,
      evalResult: evaluateTicketPrizeTier({
        ticketMain: tkt.mainNumbers,
        ticketGolden: tkt.goldenBall,
        drawnMain: drawProof.drawnMain,
        drawnGolden: drawProof.drawnGolden,
        ticketCostUsdt: liveOracleTonUsdRate,
        jackpotUsdt: Math.max(50, distributablePool85Usdt),
      }),
    }));

    const rawWeights = candidateEvals.map((c) => (c.evalResult.won ? c.evalResult.prizeUsdt : 0));
    const distributedPrizesUsdt = distributePoolAmongWinners(distributablePool85Usdt, rawWeights);
    const hasTier1Winner = candidateEvals.some(
      (c) => c.evalResult.won && c.evalResult.tierCode === 'TIER_1_JACKPOT'
    );

    let roundTotalPaidUsdt = 0;
    let roundTotalPaidTon = 0;
    const syndicateWinTotalsTon = new Map<string, number>();

    for (let idx = 0; idx < candidateEvals.length; idx++) {
      const { ticket, evalResult } = candidateEvals[idx];
      const cappedPrizeUsdt = hasTier1Winner
        ? distributedPrizesUsdt[idx] || 0
        : Math.min(evalResult.prizeUsdt, distributedPrizesUsdt[idx] || 0);
      const finalPrizeTon = roundTonClean(cappedPrizeUsdt / liveOracleTonUsdRate);
      const finalPrizeUsdt = Number((finalPrizeTon * liveOracleTonUsdRate).toFixed(6));

      if (evalResult.won && finalPrizeTon > 0) {
        ticket.status = 'WON';
        ticket.prizeWonTon = finalPrizeTon;
        totalRegularWinnersCount += 1;

        if (ticket.syndicateId) {
          // Accumulate syndicate prize for pro-rata squad distribution
          const prevSynPrize = syndicateWinTotalsTon.get(ticket.syndicateId) || 0;
          syndicateWinTotalsTon.set(
            ticket.syndicateId,
            roundTonClean(prevSynPrize + finalPrizeTon)
          );
        } else {
          // Direct ticket winner credit
          roundTotalPaidTon = roundTonClean(roundTotalPaidTon + finalPrizeTon);
          roundTotalPaidUsdt = Number((roundTotalPaidUsdt + finalPrizeUsdt).toFixed(6));
          totalRegularPrizesPaidTon = roundTonClean(totalRegularPrizesPaidTon + finalPrizeTon);

          const winnerBot = bots.find((b) => b.botId === ticket.botId)!;
          const creditRes = winnerBot.pam.credit({
            transactionUuid: `tx_lotto_win_${ticket.ticketCode}`,
            referenceTransactionUuid: ticket.transactionUuid,
            roundId: roundCode,
            vertical: 'LUCKYDROP_LOTTERY',
            currency: 'TON',
            amountTon: finalPrizeTon,
            amountUsdt: finalPrizeUsdt,
            note: `Direct Lottery Win in ${roundCode}`,
          });
          assert.equal(creditRes.ok, true);
          winnerBot.account.pamState = winnerBot.pam.getState();
          winnerBot.account.tonBalance = roundTonClean(winnerBot.account.pamState.tonBalance);
          totalTransactionsCount += 1;
        }
      } else {
        ticket.status = 'LOST';
      }
    }

    // Settle all syndicates for this round & execute Pro-Rata Distribution for winning squads
    for (const syn of roundSyndicates) {
      const synPrizeTon = syndicateWinTotalsTon.get(syn.id) || 0;
      syn.status = 'SETTLED';

      if (synPrizeTon > 0) {
        const proRata = calculateSyndicateProRataDistribution({
          syndicate: syn,
          totalPrizeTon: synPrizeTon,
          tonUsdRate: liveOracleTonUsdRate,
        });

        // Verify zero over-distribution leakage: totalDistributedTon + unallocatedDustTon === totalPrizeTon
        assert.equal(
          roundTonClean(proRata.totalDistributedTon + proRata.unallocatedDustTon),
          proRata.totalPrizeTon,
          `Syndicate ${syn.id} pro-rata distribution must conserve 100% of prize`
        );

        syn.totalPrizeWonTon = proRata.totalDistributedTon;
        syn.totalPrizeWonUsdt = proRata.totalDistributedUsdt;
        totalSyndicatesWonCount += 1;
        totalSyndicatePrizesDistributedTon = roundTonClean(
          totalSyndicatePrizesDistributedTon + proRata.totalDistributedTon
        );
        totalSyndicateUnallocatedDustTon = roundTonClean(
          totalSyndicateUnallocatedDustTon + proRata.unallocatedDustTon
        );

        for (const payout of proRata.payouts) {
          if (payout.payoutTon <= 0) continue;
          const memberBot = bots.find((b) => b.botId === payout.userKey)!;
          const creditRes = memberBot.pam.credit({
            transactionUuid: `tx_syn_win_${syn.id}_${memberBot.botId}`,
            referenceTransactionUuid: null,
            roundId: roundCode,
            vertical: 'LUCKYDROP_LOTTERY',
            currency: 'TON',
            amountTon: payout.payoutTon,
            amountUsdt: payout.payoutUsdt,
            note: payout.descriptionFa,
          });
          assert.equal(creditRes.ok, true);
          memberBot.account.pamState = memberBot.pam.getState();
          memberBot.account.tonBalance = roundTonClean(memberBot.account.pamState.tonBalance);
          totalTransactionsCount += 1;

          roundTotalPaidTon = roundTonClean(roundTotalPaidTon + payout.payoutTon);
          roundTotalPaidUsdt = Number(
            (roundTotalPaidUsdt + payout.payoutTon * liveOracleTonUsdRate).toFixed(6)
          );
          totalRegularPrizesPaidTon = roundTonClean(totalRegularPrizesPaidTon + payout.payoutTon);
        }
      }
    }

    // Transfer unclaimed round prize pool (including any sub-microTON syndicate rounding dust) into Monthly VIP Super-Jackpot Vault
    const rolloverCalc = calculateUnclaimedRolloverTransfer({
      distributablePoolUsdt: roundDistributablePool85Ton * liveOracleTonUsdRate,
      actualTotalPaidOutUsdt: roundTotalPaidTon * liveOracleTonUsdRate,
      currentAccumulatedPoolTon: monthlyVaultAccumulatedTon,
      tonUsdRate: liveOracleTonUsdRate,
    });

    monthlyVaultAccumulatedTon = rolloverCalc.nextAccumulatedPoolTon;
    totalRolloversToMonthlyVaultTon = roundTonClean(
      totalRolloversToMonthlyVaultTon + rolloverCalc.unclaimedRolloverTon
    );

    rolloverHistory.push({
      id: `rollover_d${day}`,
      sourceRoundCode: roundCode,
      sourceRoundTitleFa: `قرعه‌کشی روز ${day}`,
      distributablePoolTon: rolloverCalc.distributablePoolTon,
      paidOutTon: rolloverCalc.actualTotalPaidOutTon,
      rolloverTon: rolloverCalc.unclaimedRolloverTon,
      rolloverUsdt: rolloverCalc.unclaimedRolloverUsdt,
      rolloverStars: rolloverCalc.unclaimedRolloverStars,
      timestamp: `Day ${day}`,
    });

    // E) Random Daily Vault Claims (`claim-rakeback`, `referrals/claim`, and `quests/claim`)
    const questIdsOrder: AntiSybilGrowthQuestId[] = [
      'QUEST_JOIN_CHANNEL',
      'QUEST_FIRST_SYNDICATE',
      'QUEST_ACTIVE_REFERRAL_1',
      'QUEST_ACTIVE_REFERRALS_5',
    ];

    for (let cIdx = 0; cIdx < TOTAL_BOTS; cIdx++) {
      // On Day 30, sweep all remaining claimable vaults & eligible quests across all bots; on days 1..29 sample 15%
      if (day < TOTAL_DAYS && rand() > 0.15) continue;
      const bot = bots[cIdx];

      // 1) Atomic Cashback Vault Claim (`claim-rakeback`)
      const rVault = normalizeRakebackVaultState(bot.account.rakebackVault);
      if (rVault.claimableTon > 0 || rVault.claimableStars > 0) {
        if (rVault.claimableTon > 0) {
          const cTon = rVault.claimableTon;
          bot.pam.credit({
            transactionUuid: `tx_rake_claim_ton_d${day}_${bot.botId}_${totalTransactionsCount}`,
            referenceTransactionUuid: null,
            roundId: `#RAKE-D${day}`,
            vertical: 'VIP_CASHBACK_VAULT',
            currency: 'TON',
            amountTon: cTon,
            amountUsdt: Number((cTon * liveOracleTonUsdRate).toFixed(4)),
            note: 'Instant VIP Cashback TON Claim',
          });
          totalTransactionsCount += 1;
          totalCashbackClaimedTon = roundTonClean(totalCashbackClaimedTon + cTon);
        }
        if (rVault.claimableStars > 0) {
          const cStars = rVault.claimableStars;
          bot.pam.credit({
            transactionUuid: `tx_rake_claim_stars_d${day}_${bot.botId}_${totalTransactionsCount}`,
            referenceTransactionUuid: null,
            roundId: `#RAKE-D${day}`,
            vertical: 'VIP_CASHBACK_VAULT',
            currency: 'STARS',
            amountStars: cStars,
            amountUsdt: Number((cStars * 0.02).toFixed(4)),
            note: 'Instant VIP Cashback Stars Claim',
          });
          totalTransactionsCount += 1;
          totalCashbackClaimedStars = roundStarsClean(totalCashbackClaimedStars + cStars);
        }
        rVault.claimableTon = 0;
        rVault.claimableStars = 0;
        rVault.totalClaimsCount += 1;
        bot.account.rakebackVault = rVault;
        bot.account.pamState = bot.pam.getState();
        bot.account.tonBalance = roundTonClean(bot.account.pamState.tonBalance);
        bot.account.starsBalance = roundStarsClean(bot.account.pamState.starsBalance);
        totalCashbackClaimsExecuted += 1;
      }

      // 2) Atomic Referral Commission Vault Claim (`POST /api/referrals/claim`)
      const refClaim = executeAtomicReferralVaultClaim({
        userAccount: bot.account,
        userPam: bot.pam,
        tonUsdRate: liveOracleTonUsdRate,
      });
      if (refClaim.ok) {
        totalReferralClaimsExecuted += 1;
        totalReferralClaimedTon = roundTonClean(totalReferralClaimedTon + refClaim.claimedTon);
        totalReferralClaimedStars = roundStarsClean(
          totalReferralClaimedStars + refClaim.claimedStars
        );
        if (refClaim.claimedTon > 0) totalTransactionsCount += 1;
        if (refClaim.claimedStars > 0) totalTransactionsCount += 1;
      }

      // 3) Social & Growth Quests Claim (`POST /api/quests/claim`)
      for (const qId of questIdsOrder) {
        if (bot.account.completedQuests.includes(qId)) continue;
        const qRes = verifyAndClaimGrowthQuest({
          userAccount: bot.account,
          questId: qId,
          syndicatePools,
          channelJoinedVerified: true,
        });
        if (qRes.ok) {
          totalQuestsClaimedCount += 1;
          totalQuestXpAwarded += qRes.xpAwarded;

          if (qRes.vipSuperTicketsAwarded > 0) {
            for (let v = 0; v < qRes.vipSuperTicketsAwarded; v++) {
              const vipNonce = monthlyVaultNonce++;
              const vipPick = deriveProvablyFairLotteryDraw({
                serverSeed: monthlyVaultServerSeed,
                clientSeed: `${bot.botId}:quest_${qId}_${vipNonce}`,
                nonce: vipNonce,
                roundCode: MONTHLY_VIP_ROUND_ID,
                mainCount: 5,
                mainMax: 50,
                goldenMax: 15,
              });
              vipSuperTickets.push({
                ticketCode: `VIP-QST-${vipSuperTickets.length + 1}`,
                botId: bot.botId,
                roundCode: MONTHLY_VIP_ROUND_ID,
                mainNumbers: vipPick.drawnMain,
                goldenBall: vipPick.drawnGolden,
                costTon: 0,
                costStars: 0,
                costUsdt: 0,
                currency: 'TON',
                transactionUuid: `tx_qst_vip_${bot.botId}_${qId}_${v + 1}`,
                status: 'ACTIVE',
                prizeWonTon: 0,
              });
              totalVipSuperTicketsMinted += 1;
              totalQuestVipTicketsAwarded += 1;
              bot.questBonusVipTickets += 1;
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // 4. DAY 30: MONTHLY VIP SUPER-JACKPOT DRAW (STRICT TIER-1 ALL-OR-NOTHING)
  // =========================================================================
  const monthlyVaultBeforeDrawTon = monthlyVaultAccumulatedTon;
  const day30TonRate = 5.0;

  const monthlyDrawProof = computeServerAuthoritativeLotteryDraw({
    serverSeed: monthlyVaultServerSeed,
    clientSeed: 'luckydrop_monthly_vip_vault_seed_day30',
    nonce: 1,
    roundCode: MONTHLY_VIP_ROUND_ID,
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
  });

  const qualifiedBotsCount = bots.filter(
    (b) => b.regularTicketsBought >= 10 || b.account.xp >= 500
  ).length;

  const allOrNothingResult = evaluateMonthlySuperJackpotAllOrNothing({
    tickets: vipSuperTickets.map((t) => ({
      ticketCode: t.ticketCode,
      mainNumbers: t.mainNumbers,
      goldenBall: t.goldenBall,
    })),
    drawnMain: monthlyDrawProof.drawnMain,
    drawnGolden: monthlyDrawProof.drawnGolden,
    accumulatedPoolTon: monthlyVaultBeforeDrawTon,
    tonUsdRate: day30TonRate,
  });

  // Verify Tier-1 All-or-Nothing conservation: totalPaidOutTon + remainingRolloverTon === monthlyVaultBeforeDrawTon
  assert.equal(
    roundTonClean(allOrNothingResult.totalPaidOutTon + allOrNothingResult.remainingRolloverTon),
    monthlyVaultBeforeDrawTon,
    'Monthly VIP Super-Jackpot All-or-Nothing rule must conserve 100% of vault balance'
  );

  const monthlyVipPaidOutTon = allOrNothingResult.totalPaidOutTon;
  const monthlyVipWinnersCount = allOrNothingResult.tier1WinnersCount;
  const finalRemainingMonthlyVaultTon = allOrNothingResult.remainingRolloverTon;

  for (let idx = 0; idx < allOrNothingResult.evaluations.length; idx++) {
    const ev = allOrNothingResult.evaluations[idx];
    const tkt = vipSuperTickets[idx];
    tkt.status = ev.status;
    tkt.prizeWonTon = ev.prizeTon;

    if (ev.isTier1JackpotWinner && ev.prizeTon > 0) {
      const winnerBot = bots.find((b) => b.botId === tkt.botId)!;
      const creditRes = winnerBot.pam.credit({
        transactionUuid: `tx_monthly_vip_win_${tkt.ticketCode}`,
        referenceTransactionUuid: tkt.transactionUuid,
        roundId: MONTHLY_VIP_ROUND_ID,
        vertical: 'LUCKYDROP_LOTTERY',
        currency: 'TON',
        amountTon: ev.prizeTon,
        amountUsdt: ev.prizeUsdt,
        note: `Monthly VIP Super-Jackpot Tier-1 Win (${tkt.ticketCode})`,
      });
      assert.equal(creditRes.ok, true);
      winnerBot.account.pamState = winnerBot.pam.getState();
      winnerBot.account.tonBalance = roundTonClean(winnerBot.account.pamState.tonBalance);
      totalTransactionsCount += 1;
    }
  }

  // =========================================================================
  // 5. DAY 30: $1,000 WELCOME GRAND LOTTERY SCHEDULE GUARD & DRAW AUDIT
  // =========================================================================
  const day30ExpiredMs = welcomeLotteryState.nextDrawTimestampMs + 1000;

  // 5A) Verify Auto-Extension Guard when reserve is artificially below $1,000 target
  const underfundedGuardCheck = evaluateWelcomeLotteryScheduleGuard(
    {
      ...welcomeLotteryState,
      fundedReserveTon: 10, // Only $50 out of $1,000 target
    },
    {
      nowMs: day30ExpiredMs,
      tonUsdRate: day30TonRate,
      participantsCount: welcomeTickets.length,
    }
  );
  assert.equal(underfundedGuardCheck.shouldExecuteDraw, false);
  assert.equal(underfundedGuardCheck.autoExtended, true);
  assert.equal(underfundedGuardCheck.updatedState.autoExtensionCount, 1);

  // 5B) Evaluate actual Day-30 Welcome Lottery Reserve state
  const actualWelcomeScheduleCheck = evaluateWelcomeLotteryScheduleGuard(welcomeLotteryState, {
    nowMs: day30ExpiredMs,
    tonUsdRate: day30TonRate,
    participantsCount: welcomeTickets.length,
  });

  let welcomeLotteryPaidTon = 0;
  let welcomeLotteryRemainingReserveTon = welcomeLotteryState.fundedReserveTon;
  let welcomeLotteryWinnersCount = 0;

  if (actualWelcomeScheduleCheck.shouldExecuteDraw) {
    const welcomeTargetTon = welcomeLotteryState.targetPoolTon; // 200 TON ($1,000 at $5/TON)
    const welcomeDrawProof = computeServerAuthoritativeLotteryDraw({
      serverSeed: welcomeLotteryState.serverSeed,
      clientSeed: welcomeLotteryState.clientSeed,
      nonce: welcomeLotteryState.nonce,
      roundCode: WELCOME_GRAND_ROUND_ID,
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
    });

    const wEvals = welcomeTickets.map((tkt) => ({
      ticket: tkt,
      evalResult: evaluateTicketPrizeTier({
        ticketMain: tkt.mainNumbers,
        ticketGolden: tkt.goldenBall,
        drawnMain: welcomeDrawProof.drawnMain,
        drawnGolden: welcomeDrawProof.drawnGolden,
        ticketCostUsdt: 5.0,
        jackpotUsdt: welcomeLotteryState.targetPoolUsdt,
      }),
    }));

    const wWeights = wEvals.map((c) => (c.evalResult.won ? c.evalResult.prizeUsdt : 0));
    const wDistributedUsdt = distributePoolAmongWinners(
      welcomeLotteryState.targetPoolUsdt,
      wWeights
    );
    const wHasTier1 = wEvals.some(
      (c) => c.evalResult.won && c.evalResult.tierCode === 'TIER_1_JACKPOT'
    );

    for (let idx = 0; idx < wEvals.length; idx++) {
      const { ticket, evalResult } = wEvals[idx];
      const cappedUsdt = wHasTier1
        ? wDistributedUsdt[idx] || 0
        : Math.min(evalResult.prizeUsdt, wDistributedUsdt[idx] || 0);
      const prizeTon = roundTonClean(cappedUsdt / day30TonRate);
      const prizeUsdt = Number((prizeTon * day30TonRate).toFixed(6));

      if (evalResult.won && prizeTon > 0) {
        ticket.status = 'WON';
        ticket.prizeWonTon = prizeTon;
        welcomeLotteryPaidTon = roundTonClean(welcomeLotteryPaidTon + prizeTon);
        welcomeLotteryWinnersCount += 1;

        const winnerBot = bots.find((b) => b.botId === ticket.botId)!;
        const creditRes = winnerBot.pam.credit({
          transactionUuid: `tx_welcome_win_${ticket.ticketCode}`,
          referenceTransactionUuid: ticket.transactionUuid,
          roundId: WELCOME_GRAND_ROUND_ID,
          vertical: 'LUCKYDROP_LOTTERY',
          currency: 'TON',
          amountTon: prizeTon,
          amountUsdt: prizeUsdt,
          note: `$1,000 Welcome Grand Lottery Win (${ticket.ticketCode})`,
        });
        assert.equal(creditRes.ok, true);
        winnerBot.account.pamState = winnerBot.pam.getState();
        winnerBot.account.tonBalance = roundTonClean(winnerBot.account.pamState.tonBalance);
        totalTransactionsCount += 1;
      } else {
        ticket.status = 'LOST';
      }
    }

    welcomeLotteryRemainingReserveTon = roundTonClean(
      Math.max(0, welcomeLotteryState.fundedReserveTon - welcomeLotteryPaidTon)
    );
    assert.ok(
      welcomeLotteryPaidTon <= welcomeTargetTon + 0.000001,
      'Welcome draw payout cannot exceed target pool'
    );
  }

  // =========================================================================
  // 6. FINAL 100% CONSERVATION LAWS & 1,000-BOT PAM RECONCILIATION
  // =========================================================================
  let reconciledBotsCount = 0;
  let maxBotDiscrepancyTon = 0;
  let maxBotDiscrepancyStars = 0;

  for (const bot of bots) {
    const reconRes = bot.pam.reconcile();
    const rep = reconRes.reconciliation!;
    if (rep.reconciled) {
      reconciledBotsCount += 1;
    }
    maxBotDiscrepancyTon = Math.max(maxBotDiscrepancyTon, Math.abs(rep.discrepancyTon));
    maxBotDiscrepancyStars = Math.max(maxBotDiscrepancyStars, Math.abs(rep.discrepancyStars));

    // Verify 1-per-5 VIP ticket entitlement + quest bonus VIP tickets
    assert.equal(
      bot.vipSuperTicketsEarned,
      Math.floor(bot.regularTicketsBought / 5),
      `Bot ${bot.botId} purchase-based VIP tickets must equal floor(regularTicketsBought / 5)`
    );
  }

  assert.equal(
    reconciledBotsCount,
    TOTAL_BOTS,
    'All 1,000 bots must reconcile with 0 ledger discrepancy'
  );
  assert.equal(maxBotDiscrepancyTon, 0, 'Max TON wallet discrepancy must be 0.000000');
  assert.equal(maxBotDiscrepancyStars, 0, 'Max Stars wallet discrepancy must be 0');

  // Verify 5-Way Gross Sales Split Conservation Law across the entire 30-day simulation
  const fiveWaySumTon = roundTonClean(
    totalSplitDistributable85Ton +
      totalSplitBuyerCashback3Ton +
      totalSplitInviterReferral2Ton +
      totalSplitWelcomeReserve3Ton +
      totalSplitNetHouseProfitTon
  );
  const fiveWayConservationDeltaTon = roundTonClean(Math.abs(totalGrossSalesTon - fiveWaySumTon));
  assert.ok(
    fiveWayConservationDeltaTon < 0.000001,
    `30-Day 5-Way Gross Sales Split Conservation Law violated: delta=${fiveWayConservationDeltaTon}`
  );

  // Verify 85% Distributable Pool Conservation Law:
  // totalSplitDistributable85Ton === totalRegularPrizesPaidTon + monthlyVipPaidOutTon + finalRemainingMonthlyVaultTon
  const accounted85PoolTon = roundTonClean(
    totalRegularPrizesPaidTon + monthlyVipPaidOutTon + finalRemainingMonthlyVaultTon
  );
  const pool85ConservationDeltaTon = roundTonClean(
    Math.abs(totalSplitDistributable85Ton - accounted85PoolTon)
  );
  assert.ok(
    pool85ConservationDeltaTon < 0.00001,
    `85% Prize Pool Conservation Law violated: delta=${pool85ConservationDeltaTon}`
  );

  // Verify Welcome Reserve Conservation Law:
  // totalSplitWelcomeReserve3Ton === welcomeLotteryPaidTon + welcomeLotteryRemainingReserveTon
  const welcomeReserveDeltaTon = roundTonClean(
    Math.abs(
      totalSplitWelcomeReserve3Ton -
        roundTonClean(welcomeLotteryPaidTon + welcomeLotteryRemainingReserveTon)
    )
  );
  assert.ok(
    welcomeReserveDeltaTon < 0.000001,
    `Welcome 3% Reserve Conservation Law violated: delta=${welcomeReserveDeltaTon}`
  );

  const executionDurationMs = Number((performance.now() - startTimeMs).toFixed(2));

  console.log('\n================================================================================');
  console.log('📊 جدول اجرایی حسابرسی ۳۰ روزه مونت‌کارلو (Persian Executive Audit Table)');
  console.log('================================================================================');
  console.log(`⏱️ زمان اجرای شبیه‌سازی:             ${executionDurationMs.toFixed(2)} ms (< 5,000 ms)`);
  console.log(`🤖 تعداد ربات‌های مستقل (PAM):        ${reconciledBotsCount} / ${TOTAL_BOTS} (Discrepancy: 0.000000 TON | 0 ⭐)`);
  console.log(`🔗 شبکه دعوت ضدتقلب (Anti-Sybil):     ${boundReferralsCount} ربات متصل (60.0%) | قفل Self/Circular تایید شد`);
  console.log(`🧾 کل تراکنش‌های اتمیک دفترکل:         ${totalTransactionsCount.toLocaleString('en-US')} تراکنش`);
  console.log('--------------------------------------------------------------------------------');
  console.log('💎 ۱. قانون پایستگی ۱۰۰٪ تفکیک ۵گانه فروش بلیت (5-Way Conservation Law):');
  console.log(`   • کل فروش ناخالص بلیت (Gross):     ${totalGrossSalesTon.toFixed(6)} TON (${totalTicketsMintedAll} بلیت: ${totalDirectTicketsSold} مستقیم + ${totalSyndicateSharesSold} سهم سندیکا)`);
  console.log(`   • استخر جوایز دورها (۸۵٪):          ${totalSplitDistributable85Ton.toFixed(6)} TON (85.000000%)`);
  console.log(`   • کشبک آنی خریداران (۳٪):          ${totalSplitBuyerCashback3Ton.toFixed(6)} TON (3.000000%)`);
  console.log(`   • ذخیره لاتاری ۱۰۰۰$ خوشآمد (۳٪):  ${totalSplitWelcomeReserve3Ton.toFixed(6)} TON (3.000000%)`);
  console.log(`   • پورسانت معرف‌ها (۲٪ فروش معرفی):  ${totalSplitInviterReferral2Ton.toFixed(6)} TON (${((totalSplitInviterReferral2Ton / totalGrossSalesTon) * 100).toFixed(6)}%)`);
  console.log(`   • سود خالص خانه (۷٪ تا ۹٪):        ${totalSplitNetHouseProfitTon.toFixed(6)} TON (${((totalSplitNetHouseProfitTon / totalGrossSalesTon) * 100).toFixed(6)}%)`);
  console.log(`   • جمع کل ۵ بخش (Sum Check):        ${fiveWaySumTon.toFixed(6)} TON | انحراف (Delta): ${fiveWayConservationDeltaTon.toFixed(6)} TON`);
  console.log('--------------------------------------------------------------------------------');
  console.log('🤝 ۲. عملکرد سندیکاهای گروهی (Syndicate Squad Pools):');
  console.log(`   • سندیکاهای ساخته‌شده / مشارکت‌ها:  ${totalSyndicatesCreated} اسکواد / ${totalSyndicateJoins} مشارکت گروهی`);
  console.log(`   • سندیکاهای برنده / جوایز توزیعی:   ${totalSyndicatesWonCount} اسکواد / ${totalSyndicatePrizesDistributedTon.toFixed(6)} TON (Pro-Rata)`);
  console.log(`   • غبار رندینگ جذب‌شده در Rollover:  ${totalSyndicateUnallocatedDustTon.toFixed(6)} TON`);
  console.log('--------------------------------------------------------------------------------');
  console.log('🏦 ۳. برداشت‌های خزانه کشبک، رفرال و ماموریت‌ها (Vaults & Quests):');
  console.log(`   • برداشت خزانه کشبک (Rakeback):     ${totalCashbackClaimsExecuted} برداشت | ${totalCashbackClaimedTon.toFixed(6)} TON + ${totalCashbackClaimedStars} ⭐`);
  console.log(`   • برداشت خزانه رفرال (Referrals):   ${totalReferralClaimsExecuted} برداشت | ${totalReferralClaimedTon.toFixed(6)} TON + ${totalReferralClaimedStars} ⭐`);
  console.log(`   • ماموریت‌های اجتماعی (Quests):      ${totalQuestsClaimedCount} تکمیل | +${totalQuestXpAwarded} XP | +${totalQuestVipTicketsAwarded} سوپربلیت VIP`);
  console.log('--------------------------------------------------------------------------------');
  console.log('👑 ۴. قرعه‌کشی‌های روزانه، ابر جک‌پات VIP و لاتاری ۱,۰۰۰ دلاری:');
  console.log(`   • جوایز پرداخت‌شده ۳۰ دور روزانه:   ${totalRegularPrizesPaidTon.toFixed(6)} TON (${totalRegularWinnersCount} بلیت برنده)`);
  console.log(`   • انباشت خزانه VIP ماهانه (Rollover): ${monthlyVaultBeforeDrawTon.toFixed(6)} TON | برنده Tier-1: ${monthlyVipWinnersCount} | انتقالی ماه بعد: ${finalRemainingMonthlyVaultTon.toFixed(6)} TON`);
  console.log(`   • انحراف پایستگی استخر ۸۵٪:        ${pool85ConservationDeltaTon.toFixed(6)} TON`);
  console.log(`   • لاتاری ۱۰۰۰$ خوشآمدگویی:         ذخیره: ${welcomeLotteryState.fundedReserveTon.toFixed(6)} TON | پرداختی به ${welcomeLotteryWinnersCount} برنده: ${welcomeLotteryPaidTon.toFixed(6)} TON | مازاد ذخیره: ${welcomeLotteryRemainingReserveTon.toFixed(6)} TON`);
  console.log('================================================================================\n');

  assert.ok(
    executionDurationMs < 5000,
    `Full-ecosystem simulation must complete in under 5 seconds (took ${executionDurationMs}ms)`
  );
});
