import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MULTI_LOTTERY_SPECS,
  generateBulkQuickPickSlips,
  calculateBulkCartSummary,
  validateCryptoWithdrawalAddress,
  calculateWithdrawalFeeAndNet,
  evaluateTicketWinTier,
  calculateWaterfallCashflow,
  deriveProvablyFairBalls,
  DEFAULT_FX_RATES,
  getCnyToTomanRate,
  calculateZeroLossTicketSplit,
  evaluateZeroLossDrawSolvency,
  getBlockchainExplorerTxUrl,
  evaluateZeroLossLoyaltyChest,
  formatTelegramAdminAlertText,
  generateUniqueUserReferralLink,
  calculateReferralDeductionFromNetProfit,
} from './lotteryEngine.ts';
import { computeOracleExchangeRates } from '../services/price-oracle.ts';

test('Price Oracle computeOracleExchangeRates applies exact 0% spot by default and calculates CNY to Toman', () => {
  const spotRates = computeOracleExchangeRates(
    { BTC: 81344, TON: 1.6, TRX: 0.3283, BNB: 731.07 },
    { baseTomanRate: 271600, baseCnyRate: 6.68, adminMarkupPercent: 0 }
  );
  assert.equal(spotRates.TOMAN, 271600);
  assert.equal(spotRates.CNY, 6.68);
  assert.equal(getCnyToTomanRate(spotRates), Math.round(271600 / 6.68));

  const rates = computeOracleExchangeRates(
    { BTC: 90000, TON: 6.0, TRX: 0.25, BNB: 650 },
    { baseTomanRate: 270000, baseCnyRate: 6.68, adminMarkupPercent: 1.0 }
  );
  assert.equal(rates.BTC, 90000);
  assert.equal(rates.TON, 6.0);
  assert.equal(rates.TOMAN, 272700); // 270000 * 1.01
  assert.equal(rates.CNY, 6.7468);
});

test('Multi-Lottery engine defines 4 concurrent active lotteries with distinct rules', () => {
  assert.equal(MULTI_LOTTERY_SPECS.length, 4);
  const mega = MULTI_LOTTERY_SPECS.find((s) => s.id === 'MEGA_WEEKLY');
  const blitz = MULTI_LOTTERY_SPECS.find((s) => s.id === 'DAILY_BLITZ');
  const flash = MULTI_LOTTERY_SPECS.find((s) => s.id === 'HOURLY_FLASH');
  const ton = MULTI_LOTTERY_SPECS.find((s) => s.id === 'TON_SPECIAL');

  assert.ok(mega && mega.mainCount === 5 && mega.mainMax === 50 && mega.ticketPriceUsdt === 5.0);
  assert.ok(blitz && blitz.mainCount === 5 && blitz.mainMax === 35 && blitz.ticketPriceUsdt === 2.0);
  assert.ok(flash && flash.mainCount === 4 && flash.mainMax === 25 && flash.goldenMax === 0 && flash.ticketPriceUsdt === 1.0);
  assert.ok(ton && ton.mainCount === 5 && ton.mainMax === 40 && ton.ticketPriceUsdt === 3.0);
});

test('generateBulkQuickPickSlips generates distinct randomized winning ticket slips', () => {
  const slips = generateBulkQuickPickSlips(5, 5, 50, 15);
  assert.equal(slips.length, 5);
  const signatures = new Set(slips.map((s) => `${s.mainNumbers.join(',')}:${s.goldenBall}`));
  assert.equal(signatures.size, 5);
  for (const slip of slips) {
    assert.equal(slip.mainNumbers.length, 5);
    assert.ok(slip.goldenBall >= 1 && slip.goldenBall <= 15);
  }
});

test('calculateBulkCartSummary computes multi-ticket totals and bundle discounts', () => {
  const single = calculateBulkCartSummary(1, 5.0, DEFAULT_FX_RATES);
  assert.equal(single.totalUsdt, 5.0);
  assert.equal(single.discountPercent, 0);

  const five = calculateBulkCartSummary(5, 5.0, DEFAULT_FX_RATES);
  assert.equal(five.subtotalUsdt, 25.0);
  assert.equal(five.discountPercent, 5);
  assert.equal(five.totalUsdt, 23.75);

  const ten = calculateBulkCartSummary(10, 5.0, DEFAULT_FX_RATES);
  assert.equal(ten.subtotalUsdt, 50.0);
  assert.equal(ten.discountPercent, 10);
  assert.equal(ten.totalUsdt, 45.0);
});

test('validateCryptoWithdrawalAddress validates per-network address formats strictly', () => {
  assert.equal(
    validateCryptoWithdrawalAddress('USDT (TRC-20)', 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE').valid,
    true
  );
  assert.equal(
    validateCryptoWithdrawalAddress('USDT (TRC-20)', '0x71C8F9409a89bC20D471980D772094B112039A8F').valid,
    false
  );
  assert.equal(
    validateCryptoWithdrawalAddress('TON Network', 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP').valid,
    true
  );
  assert.equal(
    validateCryptoWithdrawalAddress('BNB (BEP-20)', '0x71C8F9409a89bC20D471980D772094B112039A8F').valid,
    true
  );
  assert.equal(
    validateCryptoWithdrawalAddress('Bitcoin (BTC)', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh').valid,
    true
  );
});

test('calculateWithdrawalFeeAndNet deducts dynamic gas fee accurately', () => {
  const trc = calculateWithdrawalFeeAndNet(100, 'USDT (TRC-20)', DEFAULT_FX_RATES);
  assert.equal(trc.grossAmountUsdt, 100);
  assert.equal(trc.networkFeeUsdt, 1.0);
  assert.equal(trc.netAmountUsdt, 99.0);

  const ton = calculateWithdrawalFeeAndNet(50, 'TON Network', DEFAULT_FX_RATES);
  assert.equal(ton.networkFeeUsdt, 0.25);
  assert.equal(ton.netAmountUsdt, 49.75);
});

test('evaluateTicketWinTier identifies jackpot and lower prize tiers accurately', () => {
  const tier1 = evaluateTicketWinTier([7, 14, 23, 38, 49], 8, [7, 14, 23, 38, 49], 8, 184500);
  assert.equal(tier1.isWinner, true);
  assert.equal(tier1.tierCode, 'TIER_1');
  assert.equal(tier1.prizeUsdt, 184500);

  const tier5 = evaluateTicketWinTier([7, 14, 23, 1, 2], 8, [7, 14, 23, 38, 49], 8, 184500);
  assert.equal(tier5.isWinner, true);
  assert.equal(tier5.tierCode, 'TIER_5');
  assert.equal(tier5.prizeUsdt, 25);

  const none = evaluateTicketWinTier([1, 2, 3, 4, 5], 1, [7, 14, 23, 38, 49], 8, 184500);
  assert.equal(none.isWinner, false);
  assert.equal(none.prizeUsdt, 0);
});

test('calculateWaterfallCashflow and deriveProvablyFairBalls remain deterministic', () => {
  const wf = calculateWaterfallCashflow(1000, 85);
  assert.equal(wf.prizePoolUsdt, 850);
  assert.equal(wf.operatorProfitUsdt, 100);
  assert.equal(wf.rolloverReserveUsdt, 30);
  assert.equal(wf.infraGasBufferUsdt, 20);

  const d1 = deriveProvablyFairBalls('seedA', 'clientB', 482, 4, 25, 0);
  const d2 = deriveProvablyFairBalls('seedA', 'clientB', 482, 4, 25, 0);
  assert.deepEqual(d1.mainNumbers, d2.mainNumbers);
  assert.equal(d1.mainNumbers.length, 4);
});

test('calculateZeroLossTicketSplit guarantees 100% zero-loss house math with and without referrer', () => {
  const noRef = calculateZeroLossTicketSplit(100, false);
  assert.equal(noRef.prizePoolUsdt, 85);
  assert.equal(noRef.referralCommissionUsdt, 0);
  assert.equal(noRef.netOperatorProfitUsdt, 10);
  assert.equal(noRef.rolloverReserveUsdt, 3);
  assert.equal(noRef.gasBufferUsdt, 2);
  assert.equal(noRef.houseDeficitPossible, false);

  const withRef = calculateZeroLossTicketSplit(100, true);
  assert.equal(withRef.prizePoolUsdt, 85);
  assert.equal(withRef.referralCommissionUsdt, 2);
  assert.equal(withRef.netOperatorProfitUsdt, 8);
  assert.equal(withRef.rolloverReserveUsdt, 3);
  assert.equal(withRef.gasBufferUsdt, 2);
  assert.equal(withRef.houseDeficitPossible, false);
  assert.equal(
    withRef.prizePoolUsdt +
      withRef.referralCommissionUsdt +
      withRef.netOperatorProfitUsdt +
      withRef.rolloverReserveUsdt +
      withRef.gasBufferUsdt,
    100
  );
});

test('evaluateZeroLossDrawSolvency prevents house loss when ticket sales are below advertised jackpot', () => {
  const underCovered = evaluateZeroLossDrawSolvency({
    realCollectedSalesUsdt: 500,
    targetJackpotUsdt: 10000,
    rolloverReserveUsdt: 0,
    rtpPercent: 85,
    solvencyMode: 'AUTO_EXTEND',
  });
  assert.equal(underCovered.realCollectedSalesUsdt, 500);
  assert.equal(underCovered.authorizedMaxPayoutUsdt, 425);
  assert.equal(underCovered.isFullyFundedForTarget, false);
  assert.equal(underCovered.recommendedAction, 'AUTO_EXTEND_TIMER');
  assert.equal(underCovered.guaranteedHouseNetProfitUsdt, 40);
  assert.equal(underCovered.platformLossUsdt, 0);

  const proportional = evaluateZeroLossDrawSolvency({
    realCollectedSalesUsdt: 500,
    targetJackpotUsdt: 10000,
    rolloverReserveUsdt: 0,
    rtpPercent: 85,
    solvencyMode: 'PROPORTIONAL_POOL',
  });
  assert.equal(proportional.recommendedAction, 'EXECUTE_CAPPED_AT_REAL_POOL');
  assert.equal(proportional.authorizedMaxPayoutUsdt, 425);
  assert.equal(proportional.platformLossUsdt, 0);
  assert.ok(getBlockchainExplorerTxUrl('USDT_TRC20', 'abc123').includes('tronscan.org'));
});

test('evaluateZeroLossLoyaltyChest strictly caps rewards within the 3% Rollover Reserve with 0 platform loss', () => {
  const eligible = evaluateZeroLossLoyaltyChest({
    totalTicketsPurchased: 6,
    totalSpentUsdt: 30,
    chestsClaimedCount: 1,
    availableRolloverReservePoolUsdt: 15.0,
    seedNonce: 1,
  });
  assert.equal(eligible.chestsUnlockedTotal, 2);
  assert.equal(eligible.chestsAvailableToOpen, 1);
  assert.ok(eligible.safeRewardUsdt > 0 && eligible.safeRewardUsdt <= 15.0);
  assert.equal(eligible.houseProfitUntouched, true);
  assert.equal(eligible.platformLossUsdt, 0);

  const emptyReserve = evaluateZeroLossLoyaltyChest({
    totalTicketsPurchased: 9,
    totalSpentUsdt: 45,
    chestsClaimedCount: 0,
    availableRolloverReservePoolUsdt: 0,
    seedNonce: 2,
  });
  assert.equal(emptyReserve.safeRewardUsdt, 0);
  assert.equal(emptyReserve.platformLossUsdt, 0);

  const alertMsg = formatTelegramAdminAlertText({
    eventType: 'DEPOSIT',
    userDisplayName: 'امیرحسین',
    amountUsdt: 250,
    network: 'USDT_TRC20',
    details: 'واریز ۲۵۰ تتر',
  });
  assert.ok(alertMsg.includes('امیرحسین'));
  assert.ok(alertMsg.includes('$250.00 USDT'));
  assert.ok(alertMsg.includes('Zero-Loss Active'));
});

test('generateUniqueUserReferralLink and calculateReferralDeductionFromNetProfit enforce Firestore-compatible codes and 100% zero-loss profit deduction', () => {
  const bundle = generateUniqueUserReferralLink({
    uidOrIdentity: 'uid_abc_12345',
    customAlias: 'SOVEREIGN',
    originUrl: 'https://luckydrop.vip',
  });
  assert.ok(bundle.referralCode.startsWith('VIP-SOVEREIGN-'));
  assert.equal(bundle.referralUrl, `https://luckydrop.vip/?ref=${bundle.referralCode}`);

  const ledger = calculateReferralDeductionFromNetProfit({
    ticketGrossUsdt: 50,
    hasValidReferrer: true,
    commissionRateFromSalesPercent: 2,
  });
  assert.equal(ledger.prizePool85Usdt, 42.5);
  assert.equal(ledger.grossLotteryProfit10Usdt, 5.0);
  assert.equal(ledger.commissionDeductedFromProfit2Usdt, 1.0);
  assert.equal(ledger.netHouseProfitRetained8Usdt, 4.0);
  assert.equal(ledger.deductedStrictlyFromNetProfit, true);
  assert.equal(ledger.prizePoolUntouched, true);
  assert.equal(ledger.platformLossUsdt, 0);
});



