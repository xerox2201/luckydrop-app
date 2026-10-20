import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWaterfallCashflow,
  formatMultiCurrency,
  convertUsdtToCrypto,
  computeDeterministicHash,
  deriveProvablyFairBalls,
  calculateBinomialOddsAndEV,
  evaluateVaultAutoSweep,
  verifyWebhookHmacAndIdempotency,
  formatTelegramWinnerBroadcast,
  OFFICIAL_PRIZE_TIERS_V48,
  filterTermsAndFaqs,
  computeFormulaBallModulo,
  calculateFixedPegTicketConversions,
} from './lotteryEngine.ts';

test('Automated Waterfall Cashflow splits 100 USDT into 85/10/3/2', () => {
  const res = calculateWaterfallCashflow(100, 85);
  assert.equal(res.grossVolumeUsdt, 100);
  assert.equal(res.prizePoolUsdt, 85);
  assert.equal(res.operatorProfitUsdt, 10);
  assert.equal(res.rolloverReserveUsdt, 3);
  assert.equal(res.infraGasBufferUsdt, 2);
});

test('Admin Margin Simulator calculates profit accurately for $3.5M volume at 85% RTP', () => {
  const res = calculateWaterfallCashflow(3500000, 85);
  assert.equal(res.operatorProfitUsdt, 350000);
  assert.equal(res.prizePoolUsdt, 2975000);
});

test('Multi-Currency Engine formats FA Toman, EN USDT, and ZH CNY accurately', () => {
  const en = formatMultiCurrency(10, 'EN');
  assert.equal(en, '$10.00 USDT');

  const zh = formatMultiCurrency(10, 'ZH');
  assert.equal(zh, '¥72.40 CNY');

  const fa = formatMultiCurrency(1, 'FA');
  assert.ok(fa.includes('۸۲'));
  assert.ok(fa.includes('تومان'));
});

test('Crypto conversion computes TRX and TON equivalents', () => {
  const conv = convertUsdtToCrypto(5);
  assert.equal(conv.usdt, 5);
  assert.equal(conv.trx, 20.66);
  assert.equal(conv.ton, 0.912);
});

test('Provably Fair deterministic ball generator produces 5 sorted unique balls (1-50) and 1 golden ball (1-15)', () => {
  const draw1 = deriveProvablyFairBalls('server_seed_alpha', 'client_seed_beta', 482);
  const draw2 = deriveProvablyFairBalls('server_seed_alpha', 'client_seed_beta', 482);

  assert.deepEqual(draw1, draw2);
  assert.equal(draw1.mainNumbers.length, 5);
  assert.ok(draw1.mainNumbers.every((n) => n >= 1 && n <= 50));
  assert.ok(draw1.goldenBall >= 1 && draw1.goldenBall <= 15);
  assert.ok(draw1.hash.startsWith('0x'));
  assert.equal(draw1.hash.length, 66);
});

test('Binomial EV & probability calculator computes 10-ticket odds (~37.5%) and 85% EV', () => {
  const calc = calculateBinomialOddsAndEV(10, 3.030303, 0.85, 82500);
  assert.equal(calc.tickets, 10);
  assert.equal(calc.jackpotMultiplier, 10);
  assert.equal(calc.midTierOddsDenominator, 241);
  assert.ok(calc.anyPrizeWinProbPercent > 37 && calc.anyPrizeWinProbPercent < 38);
  assert.equal(calc.totalInvestmentToman, 2500000);
  assert.equal(calc.expectedValueToman, 2125000);
});

test('Treasury Vault Auto-Sweep sweeps excess above threshold from Hot Wallet to Cold Multi-Sig', () => {
  const noSweep = evaluateVaultAutoSweep(2500, 482910, 5000);
  assert.equal(noSweep.sweptAmountUsdt, 0);
  assert.equal(noSweep.nextHotWalletUsdt, 2500);
  assert.equal(noSweep.nextColdVaultUsdt, 482910);
  assert.equal(noSweep.fillPercentage, 50);

  const triggeredSweep = evaluateVaultAutoSweep(2500, 482910, 1500);
  assert.equal(triggeredSweep.sweptAmountUsdt, 1000);
  assert.equal(triggeredSweep.nextHotWalletUsdt, 1500);
  assert.equal(triggeredSweep.nextColdVaultUsdt, 483910);
  assert.equal(triggeredSweep.fillPercentage, 100);
});

test('Blockchain Webhook Ingestion verifies HMAC-SHA256 and blocks replay attacks via Idempotency Key', () => {
  const processed = new Set<string>();
  const first = verifyWebhookHmacAndIdempotency({
    provider: 'TronGrid',
    txId: '0xe983bf10aa2299',
    blockNumber: 62194801,
    amountUsdt: 100,
    secretKey: 'hmac_secret_v4',
    processedKeys: processed,
  });
  assert.equal(first.valid, true);
  assert.equal(first.replayBlocked, false);
  assert.equal(first.status, 200);

  // Replay exact same txId
  const replay = verifyWebhookHmacAndIdempotency({
    provider: 'TronGrid',
    txId: '0xe983bf10aa2299',
    blockNumber: 62194801,
    amountUsdt: 100,
    secretKey: 'hmac_secret_v4',
    processedKeys: processed,
  });
  assert.equal(replay.valid, false);
  assert.equal(replay.replayBlocked, true);
  assert.equal(replay.status, 409);
});

test('Telegram Winner Broadcast formats short wallet, USDT/Toman prize, and TronScan TX link', () => {
  const msg = formatTelegramWinnerBroadcast({
    winnerShortId: 'VIP_User#9812',
    prizeUsdt: 150000,
    txHash: '7a4b8f1928374655aabbccdd39c01d',
  });
  assert.equal(msg.channelId, '@LuckyDropWinners');
  assert.equal(msg.txHashShort, '7a4b8f...39c01d');
  assert.ok(msg.tronScanUrl.includes('7a4b8f1928374655aabbccdd39c01d'));
  assert.ok(msg.markdownMessage.includes('VIP_User#9812'));
});

test('Official Rules v4.8 6-tier table, FAQ search filter, 5.00 USDT peg conversions, and SHA256 modulo formula', () => {
  assert.equal(OFFICIAL_PRIZE_TIERS_V48.length, 6);
  assert.equal(OFFICIAL_PRIZE_TIERS_V48[0].baseUsdtValue, 150000);
  assert.equal(OFFICIAL_PRIZE_TIERS_V48[5].baseUsdtValue, 5);

  const searchRes = filterTermsAndFaqs('Chainlink');
  assert.equal(searchRes.faqs.length, 1);
  assert.equal(searchRes.faqs[0].id, 'faq-1');

  const peg = calculateFixedPegTicketConversions(5.0);
  assert.equal(peg.usdt, 5);
  assert.equal(peg.toman, 412500);
  assert.equal(peg.ton, 0.912);
  assert.equal(peg.trx, 20.66);

  const formula = computeFormulaBallModulo('0x000000000019d6689c085ae165831e93', 'zarrin_server_seed_v48', 408, 50);
  assert.ok(formula.ballNumber >= 1 && formula.ballNumber <= 50);
  assert.ok(formula.digestHex.startsWith('0x'));
});


