import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAMSeamlessWalletEngine,
  type PAMCurrency,
} from '../services/pamWalletEngine.ts';
import {
  calculateDynamicPariMutuelPool,
  distributePoolAmongWinners,
} from '../utils/lotteryEngine.ts';
import {
  roundTonClean,
  roundStarsClean,
  resolveStrictNativeTicketCost,
  resolveStrictNativeBetAmount,
  computeStrictNativePayout,
  calculateUnclaimedRolloverTransfer,
  evaluateMonthlyVipQualification,
  computeServerAuthoritativeLotteryDraw,
  computeServerAuthoritativeGameOutcome,
  type MonthlySuperJackpotRolloverItem,
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
  status: 'ACTIVE' | 'WON' | 'LOST';
  prizeWonTon: number;
}

interface SimulatedBot {
  botId: string;
  pam: PAMSeamlessWalletEngine;
  xp: number;
  regularTicketsBought: number;
  vipSuperTicketsEarned: number;
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

test('30-Day Time-Compressed Monte Carlo Stress Test (1,000 Bots / 30 Virtual Days / Zero Leakage Audit)', () => {
  const startTimeMs = performance.now();
  const rand = createDeterministicPrng(20261103);

  const TOTAL_BOTS = 1000;
  const TOTAL_DAYS = 30;
  const MONTHLY_VIP_ROUND_ID = '#LD-MONTHLY-VIP';

  // 1. Spawn 1,000 isolated autonomous bots in memory
  const bots: SimulatedBot[] = [];
  let totalInitialDepositTon = 0;
  let totalInitialDepositStars = 0;

  for (let i = 1; i <= TOTAL_BOTS; i++) {
    const botId = `tg_bot_${String(i).padStart(4, '0')}`;
    const initTon = roundTonClean(25 + Math.floor(rand() * 175)); // 25 to 200 TON
    const initStars = roundStarsClean(2500 + Math.floor(rand() * 12500)); // 2,500 to 15,000 Stars

    const pam = new PAMSeamlessWalletEngine({
      playerId: botId,
      displayName: `Bot #${i}`,
      vipTier: 'MEMBER',
      genesisTonBalance: 0,
      tonBalance: 0,
      genesisStarsBalance: 0,
      starsBalance: 0,
    });

    // Credit initial TON & Stars deposits via PAM ledger so reconcile() audits from 0 genesis + deposits
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

    totalInitialDepositTon = roundTonClean(totalInitialDepositTon + initTon);
    totalInitialDepositStars = roundStarsClean(totalInitialDepositStars + initStars);

    bots.push({
      botId,
      pam,
      xp: 0,
      regularTicketsBought: 0,
      vipSuperTicketsEarned: 0,
    });
  }

  // In-memory simulation state
  const allTickets: SimulatedTicket[] = [];
  const vipSuperTickets: SimulatedTicket[] = [];
  const rolloverHistory: MonthlySuperJackpotRolloverItem[] = [];

  let monthlyVaultAccumulatedTon = 0;
  let monthlyVaultNonce = 1;
  const monthlyVaultServerSeed = sha256Hex('luckydrop_monte_carlo_monthly_vip_seed_v1');

  // Master Telemetry Counters
  let totalTransactionsCount = TOTAL_BOTS * 2; // Initial deposits
  let totalRegularTicketsSold = 0;
  let totalTonTicketsSold = 0;
  let totalStarsTicketsSold = 0;
  let totalVipSuperTicketsMinted = 0;

  let totalTicketSalesTonEquivalent = 0;
  let totalTicketSalesTonDirect = 0;
  let totalTicketSalesStarsDirect = 0;

  let totalHouseMargin15Ton = 0;
  let totalRegularPrizesPaidTon = 0;
  let totalRegularWinnersCount = 0;
  let totalRolloversToMonthlyVaultTon = 0;

  let totalMiniGamesPlayed = 0;
  let totalMiniGamesWon = 0;
  let totalMiniGameVolumeTon = 0;
  let totalMiniGameVolumeStars = 0;
  let totalMiniGamePayoutTon = 0;
  let totalMiniGamePayoutStars = 0;

  const miniGameIds: InstantMiniGameId[] = ['DICE_52', 'MINES', 'PLINKO', 'CRASH_X'];

  // 2. Simulate 30 consecutive virtual days
  const baseVirtualTimestampMs = Date.now();

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const virtualNowMs = baseVirtualTimestampMs + day * 24 * 60 * 60 * 1000;
    const roundCode = `#LDR-DAY-${String(day).padStart(2, '0')}`;

    // Fluctuate live Oracle rate between $1.50 and $5.20 across the 30 days
    const liveOracleTonUsdRate = Number((1.5 + rand() * 3.7).toFixed(4));
    const roundServerSeed = sha256Hex(`round_seed_${roundCode}_${virtualNowMs}`);

    const roundTickets: SimulatedTicket[] = [];
    let roundGrossSalesTon = 0;

    // A) Daily Lottery Ticket Purchases (Single & Bulk, TON & Stars)
    // Each day ~220 active bots buy between 1 and 5 tickets
    for (let bIdx = 0; bIdx < TOTAL_BOTS; bIdx++) {
      if (rand() > 0.22) continue;
      const bot = bots[bIdx];
      const qty = rand() < 0.65 ? 1 : rand() < 0.9 ? 2 : 5;
      const pamState = bot.pam.getState();
      const useStars = rand() < 0.35 && pamState.starsBalance >= qty * 250;
      const currency: PAMCurrency = useStars ? 'STARS' : 'TON';

      const costSpec = resolveStrictNativeTicketCost({
        currency,
        ticketCount: qty,
        roundTicketPriceTon: 1.0, // 1 TON or 250 Stars per ticket
        availableTonBalance: pamState.tonBalance,
        availableStarsBalance: pamState.starsBalance,
      });

      if (!costSpec.valid) continue;

      const txUuid = `tx_tkt_d${day}_${bot.botId}_${totalTransactionsCount}`;
      const debitRes = bot.pam.debit({
        transactionUuid: txUuid,
        roundId: roundCode,
        vertical: 'LUCKYDROP_LOTTERY',
        currency,
        amountTon: currency === 'TON' ? costSpec.totalTon : undefined,
        amountStars: currency === 'STARS' ? costSpec.totalStars : undefined,
        amountUsdt: costSpec.nominalTotalUsdt,
        note: `Day ${day} purchase of ${qty} ticket(s) in ${roundCode}`,
      });

      assert.equal(debitRes.ok, true, `Ticket debit must succeed for ${bot.botId}`);
      totalTransactionsCount += 1;

      const ticketTonEquiv =
        currency === 'TON' ? costSpec.totalTon : roundTonClean(costSpec.totalStars / 250);
      roundGrossSalesTon = roundTonClean(roundGrossSalesTon + ticketTonEquiv);
      totalTicketSalesTonEquivalent = roundTonClean(totalTicketSalesTonEquivalent + ticketTonEquiv);

      if (currency === 'TON') {
        totalTicketSalesTonDirect = roundTonClean(totalTicketSalesTonDirect + costSpec.totalTon);
        totalTonTicketsSold += qty;
      } else {
        totalTicketSalesStarsDirect = roundStarsClean(
          totalTicketSalesStarsDirect + costSpec.totalStars
        );
        totalStarsTicketsSold += qty;
      }

      for (let s = 0; s < qty; s++) {
        totalRegularTicketsSold += 1;
        // Generate 5 unique main balls (1..50) + 1 golden ball (1..15)
        const pickedSet = new Set<number>();
        while (pickedSet.size < 5) {
          pickedSet.add(1 + Math.floor(rand() * 50));
        }
        const mainNumbers = Array.from(pickedSet).sort((a, b) => a - b);
        const goldenBall = 1 + Math.floor(rand() * 15);
        const tkt: SimulatedTicket = {
          ticketCode: `LDR-D${day}-${totalRegularTicketsSold}`,
          botId: bot.botId,
          roundCode,
          mainNumbers,
          goldenBall,
          costTon: currency === 'TON' ? 1.0 : 0,
          costStars: currency === 'STARS' ? 250 : 0,
          costUsdt: liveOracleTonUsdRate,
          currency,
          transactionUuid: s === 0 ? txUuid : `${txUuid}_${s + 1}`,
          status: 'ACTIVE',
          prizeWonTon: 0,
        };
        roundTickets.push(tkt);
        allTickets.push(tkt);
      }

      // Update XP & evaluate Monthly VIP Qualification (1 VIP Super-Ticket per 5 regular tickets)
      bot.regularTicketsBought += qty;
      bot.xp += qty * 25;

      const vipQual = evaluateMonthlyVipQualification({
        regularTicketsBoughtCount: bot.regularTicketsBought,
        userXp: bot.xp,
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
    }

    // B) Instant Mini-Games (Dice, Mines, Plinko, Crash) across bots on Day `day`
    for (let m = 0; m < 150; m++) {
      const bot = bots[Math.floor(rand() * TOTAL_BOTS)];
      const gameId = miniGameIds[Math.floor(rand() * miniGameIds.length)];
      const pamState = bot.pam.getState();
      const useStars = rand() < 0.3 && pamState.starsBalance >= 100;
      const currency: PAMCurrency = useStars ? 'STARS' : 'TON';

      const rawBetTon = roundTonClean(0.2 + rand() * 1.3);
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
    }

    // C) End-of-Day Regular Lottery Draw & Unclaimed Rollover into Monthly Super-Jackpot Vault
    const roundGrossSalesUsdt = Number((roundGrossSalesTon * liveOracleTonUsdRate).toFixed(6));
    const poolSplit = calculateDynamicPariMutuelPool(roundGrossSalesUsdt, 15);
    const distributablePool85Usdt = poolSplit.distributablePool85Usdt;

    // Exact 15% house share & 85% distributable pool in TON
    const distributablePoolTonExact = roundTonClean(distributablePool85Usdt / liveOracleTonUsdRate);
    const houseShare15TonExact = roundTonClean(roundGrossSalesTon - distributablePoolTonExact);
    totalHouseMargin15Ton = roundTonClean(totalHouseMargin15Ton + houseShare15TonExact);

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
        roundTotalPaidTon = roundTonClean(roundTotalPaidTon + finalPrizeTon);
        roundTotalPaidUsdt = Number((roundTotalPaidUsdt + finalPrizeUsdt).toFixed(6));
        totalRegularPrizesPaidTon = roundTonClean(totalRegularPrizesPaidTon + finalPrizeTon);
        totalRegularWinnersCount += 1;

        const winnerBot = bots.find((b) => b.botId === ticket.botId)!;
        const creditRes = winnerBot.pam.credit({
          transactionUuid: `tx_lotto_win_${ticket.ticketCode}`,
          referenceTransactionUuid: ticket.transactionUuid,
          roundId: roundCode,
          vertical: 'LUCKYDROP_LOTTERY',
          currency: 'TON',
          amountTon: finalPrizeTon,
          amountUsdt: finalPrizeUsdt,
          note: `Lottery Win in ${roundCode}`,
        });
        assert.equal(creditRes.ok, true);
        totalTransactionsCount += 1;
      } else {
        ticket.status = 'LOST';
      }
    }

    // Transfer unclaimed prize pool into Monthly VIP Super-Jackpot Vault using exact liveOracleTonUsdRate
    const rolloverCalc = calculateUnclaimedRolloverTransfer({
      distributablePoolUsdt: distributablePool85Usdt,
      actualTotalPaidOutUsdt: roundTotalPaidUsdt,
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
  }

  // 3. Day 30: Execute Monthly VIP Super-Jackpot Draw among qualified VIP bots
  const monthlyVaultBeforeDrawTon = monthlyVaultAccumulatedTon;
  const day30TonRate = 5.0;
  const startingMonthlyPoolUsdt = Number((monthlyVaultBeforeDrawTon * day30TonRate).toFixed(6));

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
    (b) => b.regularTicketsBought >= 10 || b.xp >= 500
  ).length;

  const monthlyCandidates = vipSuperTickets.map((tkt) => ({
    ticket: tkt,
    evalResult: evaluateTicketPrizeTier({
      ticketMain: tkt.mainNumbers,
      ticketGolden: tkt.goldenBall,
      drawnMain: monthlyDrawProof.drawnMain,
      drawnGolden: monthlyDrawProof.drawnGolden,
      ticketCostUsdt: 5.0,
      jackpotUsdt: Math.max(100, startingMonthlyPoolUsdt),
    }),
  }));

  const monthlyWeights = monthlyCandidates.map((c) =>
    c.evalResult.won ? c.evalResult.prizeUsdt : 0
  );
  const monthlyDistributedUsdt = distributePoolAmongWinners(
    startingMonthlyPoolUsdt,
    monthlyWeights
  );
  const monthlyHasTier1 = monthlyCandidates.some(
    (c) => c.evalResult.won && c.evalResult.tierCode === 'TIER_1_JACKPOT'
  );

  let monthlyVipPaidOutTon = 0;
  let monthlyVipWinnersCount = 0;

  for (let idx = 0; idx < monthlyCandidates.length; idx++) {
    const { ticket, evalResult } = monthlyCandidates[idx];
    const cappedPrizeUsdt = monthlyHasTier1
      ? monthlyDistributedUsdt[idx] || 0
      : Math.min(evalResult.prizeUsdt, monthlyDistributedUsdt[idx] || 0);
    const finalPrizeTon = roundTonClean(cappedPrizeUsdt / day30TonRate);
    const finalPrizeUsdt = Number((finalPrizeTon * day30TonRate).toFixed(6));

    if (evalResult.won && finalPrizeTon > 0) {
      ticket.status = 'WON';
      ticket.prizeWonTon = finalPrizeTon;
      monthlyVipPaidOutTon = roundTonClean(monthlyVipPaidOutTon + finalPrizeTon);
      monthlyVipWinnersCount += 1;

      const winnerBot = bots.find((b) => b.botId === ticket.botId)!;
      const creditRes = winnerBot.pam.credit({
        transactionUuid: `tx_monthly_vip_win_${ticket.ticketCode}`,
        referenceTransactionUuid: ticket.transactionUuid,
        roundId: MONTHLY_VIP_ROUND_ID,
        vertical: 'LUCKYDROP_LOTTERY',
        currency: 'TON',
        amountTon: finalPrizeTon,
        amountUsdt: finalPrizeUsdt,
        note: `Monthly VIP Super-Jackpot Win (${ticket.ticketCode})`,
      });
      assert.equal(creditRes.ok, true);
      totalTransactionsCount += 1;
    } else {
      ticket.status = 'LOST';
    }
  }

  // Infinite Rollover Rule: Any unclaimed balance in the Monthly Super-Pot remains in the vault for Month 2
  const finalRemainingMonthlyVaultTon = roundTonClean(
    Math.max(0, monthlyVaultBeforeDrawTon - monthlyVipPaidOutTon)
  );
  monthlyVaultAccumulatedTon = finalRemainingMonthlyVaultTon;

  // 4. Strict Financial Conservation Law Audit & 1,000-Bot PAM Wallet Reconciliation
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

    // Also verify VIP ticket 1-per-5 rule for every single bot
    assert.equal(
      bot.vipSuperTicketsEarned,
      Math.floor(bot.regularTicketsBought / 5),
      `Bot ${bot.botId} VIP Super-Tickets must equal floor(regularTicketsBought / 5)`
    );
  }

  assert.equal(
    reconciledBotsCount,
    TOTAL_BOTS,
    'All 1,000 bots must reconcile with 0 ledger discrepancy'
  );

  // Master Conservation Equation:
  // Total Gross Ticket Sales (TON) = Total Prizes Paid Out (Regular + Monthly VIP) + Total 15% House Margin + Final Remaining Monthly Super-Jackpot Vault
  const totalAllLotteryPrizesPaidTon = roundTonClean(
    totalRegularPrizesPaidTon + monthlyVipPaidOutTon
  );
  const accountedTotalTon = roundTonClean(
    totalAllLotteryPrizesPaidTon + totalHouseMargin15Ton + finalRemainingMonthlyVaultTon
  );
  const masterConservationDeltaTon = roundTonClean(
    Math.abs(totalTicketSalesTonEquivalent - accountedTotalTon)
  );

  const executionDurationMs = Number((performance.now() - startTimeMs).toFixed(2));

  console.log('\n================================================================');
  console.log('📊 30-DAY MONTE CARLO STRESS TEST TELEMETRY SUMMARY');
  console.log('================================================================');
  console.log(
    JSON.stringify(
      {
        executionDurationMs,
        totalBots: TOTAL_BOTS,
        reconciledBotsCount,
        maxBotDiscrepancyTon,
        maxBotDiscrepancyStars,
        totalTransactionsCount,
        totalRegularTicketsSold,
        totalTonTicketsSold,
        totalStarsTicketsSold,
        totalVipSuperTicketsMinted,
        qualifiedBotsCount,
        totalTicketSalesTonEquivalent,
        totalTicketSalesTonDirect,
        totalTicketSalesStarsDirect,
        totalHouseMargin15Ton,
        totalRegularPrizesPaidTon,
        totalRegularWinnersCount,
        monthlyVaultPeakBeforeDrawTon: monthlyVaultBeforeDrawTon,
        monthlyVipPaidOutTon,
        monthlyVipWinnersCount,
        finalRemainingMonthlyVaultTon,
        totalAllLotteryPrizesPaidTon,
        accountedTotalTon,
        masterConservationDeltaTon,
        totalMiniGamesPlayed,
        totalMiniGamesWon,
        totalMiniGameVolumeTon,
        totalMiniGameVolumeStars,
        totalMiniGamePayoutTon,
        totalMiniGamePayoutStars,
      },
      null,
      2
    )
  );
  console.log('================================================================\n');

  assert.ok(
    masterConservationDeltaTon < 0.00001,
    `Master Conservation Law violated: delta=${masterConservationDeltaTon} TON`
  );
  assert.ok(
    executionDurationMs < 10_000,
    `Simulation must complete in under 10 seconds (took ${executionDurationMs}ms)`
  );
});
