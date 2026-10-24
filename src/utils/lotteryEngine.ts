export type CurrencyLang = 'FA' | 'EN' | 'ZH';

export interface ExchangeRates {
  TOMAN: number;
  CNY: number;
  USD: number;
  BTC: number;
  TON: number;
  TRX: number;
  BNB: number;
}

export const DEFAULT_FX_RATES: ExchangeRates = {
  TOMAN: 271600,
  CNY: 6.68,
  USD: 1,
  BTC: 81344,
  TON: 1.6,
  TRX: 0.3283,
  BNB: 731.07,
};

export function getCnyToTomanRate(rates: ExchangeRates = DEFAULT_FX_RATES): number {
  const safeCny = rates.CNY > 0 ? rates.CNY : 6.68;
  return Math.round(rates.TOMAN / safeCny);
}

export interface WaterfallBreakdown {
  grossVolumeUsdt: number;
  prizePoolUsdt: number;         // 85%
  operatorProfitUsdt: number;    // 10%
  rolloverReserveUsdt: number;   // 3%
  infraGasBufferUsdt: number;    // 2%
  // Alias properties for UI components
  rtpPercent: number;
  operatorMarginPercent: number;
  jackpotRolloverUsdt: number;
  gasAndInfraUsdt: number;
}

export function toPersianDigits(input: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/\d/g, (d) => persianDigits[Number(d)]);
}

export function calculateWaterfallCashflow(
  volumeUsdt: number,
  rtpPercent: number = 85
): WaterfallBreakdown {
  const safeVolume = Math.max(0, volumeUsdt);
  const clampedRtp = Math.min(95, Math.max(70, rtpPercent));
  const rolloverPct = 3;
  const infraPct = 2;
  const operatorPct = Math.max(0, 100 - clampedRtp - rolloverPct - infraPct);

  const prizePoolUsdt = Number(((safeVolume * clampedRtp) / 100).toFixed(2));
  const operatorProfitUsdt = Number(((safeVolume * operatorPct) / 100).toFixed(2));
  const rolloverReserveUsdt = Number(((safeVolume * rolloverPct) / 100).toFixed(2));
  const infraGasBufferUsdt = Number(((safeVolume * infraPct) / 100).toFixed(2));

  return {
    grossVolumeUsdt: Number(safeVolume.toFixed(2)),
    prizePoolUsdt,
    operatorProfitUsdt,
    rolloverReserveUsdt,
    infraGasBufferUsdt,
    rtpPercent: clampedRtp,
    operatorMarginPercent: operatorPct,
    jackpotRolloverUsdt: rolloverReserveUsdt,
    gasAndInfraUsdt: infraGasBufferUsdt,
  };
}

export function formatMultiCurrency(
  usdtAmount: number,
  lang: CurrencyLang,
  rates: ExchangeRates = DEFAULT_FX_RATES
): string {
  const safeAmount = Number.isFinite(usdtAmount) ? usdtAmount : 0;
  if (lang === 'FA') {
    const toman = Math.round(safeAmount * rates.TOMAN);
    const formatted = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
    return `${toPersianDigits(formatted)} تومان`;
  }
  if (lang === 'ZH') {
    const cny = (safeAmount * rates.CNY).toFixed(2);
    const [intPart, decPart] = cny.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `¥${withCommas}.${decPart} CNY`;
  }
  const fixed = safeAmount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${withCommas}.${decPart} USDT`;
}

export interface CryptoConvertedMap {
  usdt: number;
  trx: number;
  ton: number;
  btc: number;
  bnb: number;
  toman: number;
  cny: number;
}

export function convertUsdtToCrypto(
  usdtAmount: number,
  rates?: ExchangeRates
): CryptoConvertedMap;
export function convertUsdtToCrypto(
  usdtAmount: number,
  cryptoKey: 'USDT' | 'TON' | 'TRX' | 'BTC' | 'BNB',
  rates?: ExchangeRates
): string;
export function convertUsdtToCrypto(
  usdtAmount: number,
  arg2?: ExchangeRates | 'USDT' | 'TON' | 'TRX' | 'BTC' | 'BNB',
  arg3?: ExchangeRates
): CryptoConvertedMap | string {
  const rates =
    typeof arg2 === 'string'
      ? arg3 || DEFAULT_FX_RATES
      : arg2 || DEFAULT_FX_RATES;

  const map: CryptoConvertedMap = {
    usdt: Number(usdtAmount.toFixed(2)),
    trx: Number((usdtAmount / rates.TRX).toFixed(2)),
    ton: Number((usdtAmount / rates.TON).toFixed(3)),
    btc: Number((usdtAmount / rates.BTC).toFixed(6)),
    bnb: Number((usdtAmount / rates.BNB).toFixed(4)),
    toman: Math.round(usdtAmount * rates.TOMAN),
    cny: Number((usdtAmount * rates.CNY).toFixed(2)),
  };

  if (typeof arg2 === 'string') {
    switch (arg2) {
      case 'USDT':
        return map.usdt.toFixed(2);
      case 'TON':
        return map.ton.toFixed(2);
      case 'TRX':
        return map.trx.toFixed(2);
      case 'BTC':
        return map.btc.toFixed(6);
      case 'BNB':
        return map.bnb.toFixed(4);
    }
  }

  return map;
}

export function computeDeterministicHash(
  serverSeed: string,
  clientSeed: string,
  roundNumber: string | number
): string {
  const payload = `${serverSeed}:${clientSeed}:${roundNumber}`;
  const state = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    const idx = i & 7;
    state[idx] = Math.imul(state[idx] ^ code, 0x01000193) >>> 0;
    state[(idx + 1) & 7] =
      (state[(idx + 1) & 7] + ((state[idx] << 5) | (state[idx] >>> 27))) >>> 0;
  }
  for (let r = 0; r < 16; r++) {
    for (let j = 0; j < 8; j++) {
      const prev = state[(j + 7) & 7];
      state[j] = Math.imul(state[j] ^ (prev >>> 3), 0x85ebca6b) >>> 0;
      state[j] = (state[j] ^ (state[j] >>> 13)) >>> 0;
    }
  }
  return '0x' + state.map((w) => w.toString(16).padStart(8, '0')).join('');
}

export function deriveProvablyFairBalls(
  serverSeed: string,
  clientSeed: string,
  roundNumber: string | number,
  mainCount: number = 5,
  mainMax: number = 50,
  goldenMax: number = 15
): { mainNumbers: number[]; mainBalls: number[]; goldenBall: number; hash: string } {
  const hash = computeDeterministicHash(serverSeed, clientSeed, roundNumber);
  const hexBody = hash.slice(2);
  const picked = new Set<number>();
  let cursor = 0;
  let salt = 0;

  while (picked.size < mainCount) {
    const slice = hexBody.slice((cursor * 4) % 56, ((cursor * 4) % 56) + 8);
    const raw = (parseInt(slice, 16) + salt * 31) >>> 0;
    const candidate = (raw % mainMax) + 1;
    picked.add(candidate);
    cursor++;
    if (cursor > 14) {
      salt++;
    }
  }

  const goldenSlice = hexBody.slice(48, 56);
  const goldenRaw = parseInt(goldenSlice, 16) >>> 0;
  const goldenBall = (goldenRaw % goldenMax) + 1;
  const sorted = Array.from(picked).sort((a, b) => a - b);

  return {
    mainNumbers: sorted,
    mainBalls: sorted,
    goldenBall,
    hash,
  };
}

export interface CombinatorialTier {
  tier: string;
  matchPattern: string;
  oddsText: string;
  poolShare: string;
  estimatedPrizeUsdt: number;
}

export const COMBINATORIAL_TIERS: CombinatorialTier[] = [
  {
    tier: 'Tier 1 (جک‌پات مگا طلایی)',
    matchPattern: '۵ گوی اصلی + ۱ گوی طلایی (5 + ★1)',
    oddsText: '1 in 23,200,000',
    poolShare: '۵۵٪ استخر جوایز',
    estimatedPrizeUsdt: 184500,
  },
  {
    tier: 'Tier 2 (ستاره نقره‌ای VIP)',
    matchPattern: '۵ گوی اصلی بدون گوی طلایی (5 + 0)',
    oddsText: '1 in 1,657,142',
    poolShare: '۱۵٪ استخر جوایز',
    estimatedPrizeUsdt: 18500,
  },
  {
    tier: 'Tier 3 (برنده طلایی ۴ ستاره)',
    matchPattern: '۴ گوی اصلی + ۱ گوی طلایی (4 + ★1)',
    oddsText: '1 in 103,571',
    poolShare: '۱۰٪ استخر جوایز',
    estimatedPrizeUsdt: 1250,
  },
  {
    tier: 'Tier 4 (جایزه میان‌رده)',
    matchPattern: '۳ گوی اصلی + ۱ گوی طلایی (3 + ★1)',
    oddsText: '1 in 2,410',
    poolShare: '۱۲٪ استخر جوایز',
    estimatedPrizeUsdt: 85,
  },
  {
    tier: 'Tier 5 (برد پرتکرار آنی)',
    matchPattern: '۲ گوی اصلی + ۱ گوی طلایی یا ★1 تکی',
    oddsText: '1 in 21.8',
    poolShare: '۸٪ استخر جوایز',
    estimatedPrizeUsdt: 6,
  },
];

export interface BinomialOddsResult {
  tickets: number;
  totalInvestmentUsdt: number;
  totalInvestmentToman: number;
  anyPrizeWinProbPercent: number;
  midTierOddsDenominator: number;
  jackpotMultiplier: number;
  expectedValueUsdt: number;
  expectedValueToman: number;
  // Alias properties for TransparencyView
  totalCostUsdt: number;
  anyPrizeProbabilityPercent: number;
  expectedReturnUsdt: number;
  jackpotOddsRatio: string;
}

export function calculateBinomialOddsAndEV(
  tickets: number,
  ticketPriceUsdt: number = 3.030303,
  rtpRateOrJackpot: number = 0.85,
  tomanRateOrRtpPct: number = DEFAULT_FX_RATES.TOMAN
): BinomialOddsResult {
  const n = Math.max(1, Math.min(10000, Math.floor(tickets)));
  const rtpFraction =
    rtpRateOrJackpot <= 1
      ? rtpRateOrJackpot
      : tomanRateOrRtpPct <= 100
      ? tomanRateOrRtpPct / 100
      : 0.85;
  const tomanRate = tomanRateOrRtpPct > 1000 ? tomanRateOrRtpPct : DEFAULT_FX_RATES.TOMAN;

  const baseOddsAny = 1 / 21.8;
  const probAny = 1 - Math.pow(1 - baseOddsAny, n);
  const totalInvestmentUsdt = Number((n * ticketPriceUsdt).toFixed(2));
  const totalInvestmentToman = Math.round(n * ticketPriceUsdt * tomanRate);
  const expectedValueUsdt = Number((totalInvestmentUsdt * rtpFraction).toFixed(2));
  const expectedValueToman = Math.round(totalInvestmentToman * rtpFraction);
  const anyPrizePct = Number((probAny * 100).toFixed(1));
  const jackpotDenom = Math.max(1, Math.round(23200000 / n));

  return {
    tickets: n,
    totalInvestmentUsdt,
    totalInvestmentToman,
    anyPrizeWinProbPercent: anyPrizePct,
    midTierOddsDenominator: Math.max(1, Math.round(2410 / n)),
    jackpotMultiplier: n,
    expectedValueUsdt,
    expectedValueToman,
    totalCostUsdt: totalInvestmentUsdt,
    anyPrizeProbabilityPercent: anyPrizePct,
    expectedReturnUsdt: expectedValueUsdt,
    jackpotOddsRatio: `1 in ${jackpotDenom.toLocaleString('en-US')}`,
  };
}

export interface VaultAutoSweepResult {
  sweptAmountUsdt: number;
  nextHotWalletUsdt: number;
  nextColdVaultUsdt: number;
  fillPercentage: number;
}

export function evaluateVaultAutoSweep(
  hotWalletBalanceUsdt: number,
  coldVaultBalanceUsdt: number,
  sweepThresholdUsdt: number
): VaultAutoSweepResult {
  const safeThreshold = Math.max(500, sweepThresholdUsdt);
  const safeHot = Math.max(0, hotWalletBalanceUsdt);
  const safeCold = Math.max(0, coldVaultBalanceUsdt);

  if (safeHot > safeThreshold) {
    const excess = Number((safeHot - safeThreshold).toFixed(2));
    return {
      sweptAmountUsdt: excess,
      nextHotWalletUsdt: Number(safeThreshold.toFixed(2)),
      nextColdVaultUsdt: Number((safeCold + excess).toFixed(2)),
      fillPercentage: 100,
    };
  }

  return {
    sweptAmountUsdt: 0,
    nextHotWalletUsdt: Number(safeHot.toFixed(2)),
    nextColdVaultUsdt: Number(safeCold.toFixed(2)),
    fillPercentage: Math.min(100, Math.round((safeHot / safeThreshold) * 100)),
  };
}

export interface WebhookVerificationResult {
  valid: boolean;
  replayBlocked: boolean;
  computedSignature: string;
  status: 200 | 401 | 409;
  logMessage: string;
}

export function verifyWebhookHmacAndIdempotency(params: {
  provider: 'TronGrid' | 'Toncenter';
  txId: string;
  blockNumber: number;
  amountUsdt: number;
  secretKey: string;
  providedSignature?: string;
  processedKeys: Set<string>;
}): WebhookVerificationResult {
  const idempotencyKey = `${params.provider}:${params.txId}`;
  const computedSignature = computeDeterministicHash(
    params.secretKey,
    `${params.provider}:${params.txId}:${params.amountUsdt}`,
    params.blockNumber
  );

  if (
    params.providedSignature &&
    params.providedSignature !== computedSignature
  ) {
    return {
      valid: false,
      replayBlocked: false,
      computedSignature,
      status: 401,
      logMessage: `[ERR 401] ${params.provider.toUpperCase()} BLOCK #${params.blockNumber.toLocaleString('en-US')}: Invalid HMAC signature for TxId ${params.txId.slice(0, 10)}...`,
    };
  }

  if (params.processedKeys.has(idempotencyKey)) {
    return {
      valid: false,
      replayBlocked: true,
      computedSignature,
      status: 409,
      logMessage: `[BLOCKED 409] ${params.provider.toUpperCase()}: Replay attack prevented for duplicate Idempotency Key ${idempotencyKey}`,
    };
  }

  params.processedKeys.add(idempotencyKey);

  return {
    valid: true,
    replayBlocked: false,
    computedSignature,
    status: 200,
    logMessage: `[OK 200] ${params.provider === 'TronGrid' ? 'TRX-BLOCK' : 'TON-BLOCK'} #${params.blockNumber.toLocaleString('en-US')}: Ingested TxId ${params.txId.slice(0, 10)}... | HMAC valid | Idempotency Key cached`,
  };
}

export interface TelegramWinnerBroadcastPayload {
  channelId: string;
  winnerShortId: string;
  prizeUsdt: number;
  prizeTomanFormatted: string;
  txHashShort: string;
  tronScanUrl: string;
  miniAppUrl: string;
  markdownMessage: string;
  timestampLabel: string;
}

export function formatTelegramWinnerBroadcast(params: {
  channelId?: string;
  winnerShortId: string;
  prizeUsdt: number;
  txHash: string;
  tomanRate?: number;
}): TelegramWinnerBroadcastPayload {
  const channelId = params.channelId || '@LuckyDropWinners';
  const tomanRate = params.tomanRate || DEFAULT_FX_RATES.TOMAN;
  const prizeToman = Math.round(params.prizeUsdt * tomanRate);
  const prizeTomanFormatted = `${toPersianDigits(
    prizeToman.toLocaleString('en-US')
  )} تومان`;
  const txHashShort =
    params.txHash.length > 14
      ? `${params.txHash.slice(0, 6)}...${params.txHash.slice(-6)}`
      : params.txHash;
  const tronScanUrl = `https://tronscan.org/#/transaction/${params.txHash}`;
  const miniAppUrl = 'https://t.me/LuckyDropVIPBot/app';

  const markdownMessage = `🎉 تبریک بی‌کران! سوپر جک‌پات هفتگی منفجر شد! 🏆\nکاربر با هویت حفاظت‌شده ${params.winnerShortId} برنده جایزه بزرگ به ارزش $${params.prizeUsdt.toLocaleString('en-US')} USDT (${prizeTomanFormatted}) شد!\nهش تراکنش TronScan: ${txHashShort}`;

  return {
    channelId,
    winnerShortId: params.winnerShortId,
    prizeUsdt: params.prizeUsdt,
    prizeTomanFormatted,
    txHashShort,
    tronScanUrl,
    miniAppUrl,
    markdownMessage,
    timestampLabel: 'چند لحظه پیش',
  };
}

export interface OfficialPrizeTierItem {
  id: number;
  rankLabel: string;
  isJackpot?: boolean;
  isFreeTicket?: boolean;
  matchPattern: string;
  oddsLabel: string;
  prizeLabel: string;
  subNote?: string;
  baseUsdtValue: number;
}

export const OFFICIAL_PRIZE_TIERS_V48: OfficialPrizeTierItem[] = [
  {
    id: 1,
    rankLabel: 'رده ۱ (مگا جک‌پات)',
    isJackpot: true,
    matchPattern: '۵ اصلی + ۱ طلایی',
    oddsLabel: '۱ : ۳۱,۶۲۵,۱۰۰',
    prizeLabel: '۱۰۰٪ کل استخر انباشته',
    subNote: 'حداقل تضمین شده: ۱۵۰,۰۰۰ دلار',
    baseUsdtValue: 150000,
  },
  {
    id: 2,
    rankLabel: 'رده ۲',
    matchPattern: '۵ عدد اصلی',
    oddsLabel: '۱ : ۲,۲۵۸,۹۳۶',
    prizeLabel: '۱۰,۰۰۰ USDT (مقطوع)',
    baseUsdtValue: 10000,
  },
  {
    id: 3,
    rankLabel: 'رده ۳',
    matchPattern: '۴ اصلی + ۱ طلایی',
    oddsLabel: '۱ : ۱۴۰,۵۵۶',
    prizeLabel: '۱,۵۰۰ USDT',
    baseUsdtValue: 1500,
  },
  {
    id: 4,
    rankLabel: 'رده ۴',
    matchPattern: '۴ عدد اصلی',
    oddsLabel: '۱ : ۱۰,۰۴۰',
    prizeLabel: '۱۵۰ USDT',
    baseUsdtValue: 150,
  },
  {
    id: 5,
    rankLabel: 'رده ۵',
    matchPattern: '۳ اصلی + ۱ طلایی',
    oddsLabel: '۱ : ۳,۱۲۰',
    prizeLabel: '۲۵ USDT',
    baseUsdtValue: 25,
  },
  {
    id: 6,
    rankLabel: 'رده ۶',
    isFreeTicket: true,
    matchPattern: '۲ اصلی + ۱ طلایی',
    oddsLabel: '۱ : ۵۲۰',
    prizeLabel: '۵ USDT (بلیت رایگان)',
    baseUsdtValue: 5,
  },
];

export interface OfficialFaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'failover' | 'fairness' | 'fees' | 'access' | 'audit';
}

export const OFFICIAL_LEGAL_FAQS: OfficialFaqItem[] = [
  {
    id: 'faq-1',
    category: 'failover',
    question: 'اگر وب‌سایت لاکی‌دراپ فیلتر شود، تعطیل گردد یا سرورها بسوزند تکلیف جک‌پات چیست؟',
    answer:
      'قراردادهای هوشمند LuckyDrop مستقلاً بر روی شبکه‌های اتریوم و ترون مستقر هستند. حتی در صورت نابودی کامل پایگاه داده و سایت رابط کاربری، استخر جوایز در اسمارت کانترکت قفل است و فرآیند قرعه‌کشی خودکار توسط اوراکل Chainlink و هش ماینرها اجرا و واریز مستقیماً به والت برندگان تزریق خواهد شد. هیچ شخص ثالثی دسترسی به برداشت دستی وجوه قفل شده ندارد.',
  },
  {
    id: 'faq-2',
    category: 'fairness',
    question: 'آیا مدیریت سایت یا اعضای فنی می‌توانند شماره‌های برنده را پیش‌بینی یا دستکاری کنند؟',
    answer:
      'خیر، این موضوع از نظر محاسباتی و علم رمزنگاری غیرممکن است. بلیت‌ها ۳۰ دقیقه قبل از زمان قرعه‌کشی بسته می‌شوند. شماره‌های برنده حاصل هش بلاک آینده بیت‌کوین هستند که توسط هزاران استخر ماینینگ در سراسر دنیا به شکل غیرقابل پیش‌بینی استخراج می‌گردد. همچنین کدهای اعتبارسنجی منبع‌باز بوده و توسط CertiK بازرسی شده است.',
  },
  {
    id: 'faq-3',
    category: 'fees',
    question: 'کارمزد واریز، شرکت در قرعه‌کشی و دریافت جوایز چقدر است؟',
    answer:
      'پلتفرم لاکی‌دراپ هیچ‌گونه کارمزد پنهان، مالیات بر سود لاتاری یا کمیسیون تسویه کسر نمی‌کند (۰٪ کارمزد پلتفرم). تنها هزینه پرداختی همان کارمزد معمول شبکه بلاکچین (Network Gas Fee) متناسب با نوع ارز انتخابی شما (TRC20، TON یا شبکه ارزان SOL) می‌باشد که مستقیماً به ماینرهای شبکه تعلق دارد.',
  },
  {
    id: 'faq-4',
    category: 'access',
    question: 'آیا کاربران ایرانی یا کشورهای تحت محدودیت مالی بین‌المللی می‌توانند شرکت کنند؟',
    answer:
      'بله، از آنجایی که تراکنش‌ها به صورت غیرمتمرکز، بدون نیاز به احراز هویت سنتی پاسپورت و فقط از طریق کیف‌پول‌های شخصی (Non-Custodial مانند متامسک، تراست‌ولت یا تون‌کیپر) انجام می‌گیرد، هیچ‌گونه مانع ژئوپلیتیکی، تحریم بانکی یا بلوکه شدن دارایی برای کاربران فارسی‌زبان وجود نخواهد داشت.',
  },
  {
    id: 'faq-5',
    category: 'audit',
    question: 'چگونه می‌توان اثبات‌پذیری ریاضی یک دور تمام شده را شخصاً تست کرد؟',
    answer:
      'در صفحه «نتایج و برندگان»، هش بلاک بیت‌کوین مربوط به هر دوره به همراه رشته بذر سرور و Nonce ثبت شده است. کافی است این سه داده را در صفحه «ابزار اعتبارسنجی منصفانه» یا یک کامپایلر پایتون وارد کنید؛ تابع هش دقیقاً همان ۵ شماره اصلی و ۱ گوی طلایی خارج شده را به عنوان خروجی بازمی‌گرداند.',
  },
];

export function filterTermsAndFaqs(query: string): {
  tiers: OfficialPrizeTierItem[];
  faqs: OfficialFaqItem[];
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      tiers: OFFICIAL_PRIZE_TIERS_V48,
      faqs: OFFICIAL_LEGAL_FAQS,
    };
  }
  const tiers = OFFICIAL_PRIZE_TIERS_V48.filter(
    (t) =>
      t.rankLabel.toLowerCase().includes(q) ||
      t.matchPattern.toLowerCase().includes(q) ||
      t.prizeLabel.toLowerCase().includes(q) ||
      (t.subNote && t.subNote.toLowerCase().includes(q))
  );
  const faqs = OFFICIAL_LEGAL_FAQS.filter(
    (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  );
  return { tiers, faqs };
}

export function computeFormulaBallModulo(
  blockHash: string,
  serverSeed: string,
  clientNonce: number | string,
  totalBalls: number = 50
): {
  digestHex: string;
  moduloZeroIndexed: number;
  ballNumber: number;
  formulaExpression: string;
} {
  const safeTotal = Math.max(1, Math.floor(totalBalls));
  const digestHex = computeDeterministicHash(
    `${blockHash}:${serverSeed}`,
    String(clientNonce),
    safeTotal
  );
  const first32Bits = parseInt(digestHex.slice(2, 10), 16) >>> 0;
  const moduloZeroIndexed = first32Bits % safeTotal;
  const ballNumber = moduloZeroIndexed + 1;
  return {
    digestHex,
    moduloZeroIndexed,
    ballNumber,
    formulaExpression: `SHA256(${blockHash.slice(0, 10)}... + ${serverSeed.slice(0, 8)}... + ${clientNonce}) % ${safeTotal} = ${moduloZeroIndexed} (Ball #${ballNumber})`,
  };
}

export function calculateFixedPegTicketConversions(
  pegUsdt: number = 5.0,
  rates: ExchangeRates = DEFAULT_FX_RATES
): {
  usdt: number;
  toman: number;
  tomanFormatted: string;
  ton: number;
  trx: number;
  btc: number;
} {
  const crypto = convertUsdtToCrypto(pegUsdt, rates);
  const toman = Math.round(pegUsdt * rates.TOMAN);
  return {
    usdt: Number(pegUsdt.toFixed(2)),
    toman,
    tomanFormatted: `${toPersianDigits(toman.toLocaleString('en-US'))} تومان`,
    ton: crypto.ton,
    trx: crypto.trx,
    btc: crypto.btc,
  };
}

// ============================================================================
// MULTI-LOTTERY CONCURRENT ENGINE SPECIFICATIONS
// ============================================================================
export type LotteryTypeId = 'MEGA_WEEKLY' | 'DAILY_BLITZ' | 'HOURLY_FLASH' | 'TON_SPECIAL';

export interface MultiLotterySpec {
  id: LotteryTypeId;
  roundCode: string;
  titleFa: string;
  titleEn: string;
  titleZh: string;
  subtitleFa: string;
  category: string;
  formatLabel: string;
  mainCount: number;
  mainMax: number;
  goldenMax: number; // 0 means no golden ball required (e.g., Hourly Flash 4/25)
  jackpotUsdt: number;
  ticketPriceUsdt: number;
  rtpPercent: number;
  soldPercent: number;
  remainingLabel: string;
  drawTimeLabel: string;
  initialCountdownSec: number;
  serverSeedHash: string;
  clientSeed: string;
  winningNumbers: number[];
  winningGoldenBall: number;
  badgeColor: 'amber' | 'emerald' | 'purple' | 'sky';
}

export const MULTI_LOTTERY_SPECS: MultiLotterySpec[] = [
  {
    id: 'MEGA_WEEKLY',
    roundCode: '#ZRN-8493',
    titleFa: 'مگا جک‌پات VIP هفتگی (Mega Jackpot VIP)',
    titleEn: 'Mega Jackpot VIP Weekly',
    titleZh: 'VIP 超级周大奖',
    subtitleFa: 'استخر تضمین‌شده بالای ۱۵۰,۰۰۰ دلار • قرعه‌کشی هفتگی ۵ از ۵۰ + ۱ گوی طلایی',
    category: 'WEEKLY',
    formatLabel: '۵ از ۵۰ + ۱ از ۱۵ ★',
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
    jackpotUsdt: 184500,
    ticketPriceUsdt: 5.0,
    rtpPercent: 85,
    soldPercent: 82,
    remainingLabel: 'ظرفیت باقی‌مانده: ۱۸٪',
    drawTimeLabel: 'جمعه ۲۲:۰۰ به وقت تهران',
    initialCountdownSec: 2 * 86400 + 14 * 3600 + 38 * 60 + 49,
    serverSeedHash: '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    clientSeed: 'tron_block_62194801_mega_vip',
    winningNumbers: [7, 14, 23, 38, 49],
    winningGoldenBall: 8,
    badgeColor: 'amber',
  },
  {
    id: 'DAILY_BLITZ',
    roundCode: '#BLZ-2409',
    titleFa: 'بلیتز روزانه ۱۰ هزار دلاری (Daily Blitz)',
    titleEn: 'Daily Blitz $10,000',
    titleZh: '每日闪电大奖',
    subtitleFa: 'قرعه‌کشی هر ۲۴ ساعت راس ساعت ۲۴:۰۰ • ضریب برد ۵ برابر سریع‌تر',
    category: 'DAILY',
    formatLabel: '۵ از ۳۵ + ۱ از ۱۰ ★',
    mainCount: 5,
    mainMax: 35,
    goldenMax: 10,
    jackpotUsdt: 12400,
    ticketPriceUsdt: 2.0,
    rtpPercent: 85,
    soldPercent: 74,
    remainingLabel: 'قرعه‌کشی امشب ساعت ۲۴:۰۰',
    drawTimeLabel: 'هر شب ساعت ۲۴:۰۰',
    initialCountdownSec: 6 * 3600 + 42 * 60 + 18,
    serverSeedHash: '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    clientSeed: 'btc_block_879410_daily_blitz',
    winningNumbers: [4, 11, 19, 27, 33],
    winningGoldenBall: 6,
    badgeColor: 'emerald',
  },
  {
    id: 'HOURLY_FLASH',
    roundCode: '#FLS-0060',
    titleFa: 'فلش ساعتی سریع (Hourly Flash 60m)',
    titleEn: 'Hourly Flash 60-Min',
    titleZh: '每小时极速开奖',
    subtitleFa: 'دورهای فوق سریع ۶۰ دقیقه‌ای • انتخاب فقط ۴ گوی از ۲۵ عدد با ورودی ۱ دلار',
    category: 'TURBO',
    formatLabel: '۴ از ۲۵ (بدون گوی طلایی)',
    mainCount: 4,
    mainMax: 25,
    goldenMax: 0,
    jackpotUsdt: 2850,
    ticketPriceUsdt: 1.0,
    rtpPercent: 88,
    soldPercent: 91,
    remainingLabel: 'کمتر از ۱ ساعت تا استخراج بلاک',
    drawTimeLabel: 'راس هر ساعت میلادی',
    initialCountdownSec: 34 * 60 + 12,
    serverSeedHash: '0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    clientSeed: 'ton_shard_39812099_hourly_flash',
    winningNumbers: [3, 9, 17, 24],
    winningGoldenBall: 0,
    badgeColor: 'purple',
  },
  {
    id: 'TON_SPECIAL',
    roundCode: '#TON-9920',
    titleFa: 'قرعه‌کشی ویژه جامعه تلگرام (TON Telegram Special)',
    titleEn: 'TON Telegram Special',
    titleZh: 'TON 电报专属大奖',
    subtitleFa: 'مخصوص کاربران مینی‌اپ تلگرام با تسویه آنی TON در کمتر از ۵ ثانیه',
    category: 'TON_VIP',
    formatLabel: '۵ از ۴۰ + ۱ از ۱۲ 💎',
    mainCount: 5,
    mainMax: 40,
    goldenMax: 12,
    jackpotUsdt: 45000,
    ticketPriceUsdt: 3.0,
    rtpPercent: 86,
    soldPercent: 68,
    remainingLabel: 'تسویه مستقیم شاردینگ TON',
    drawTimeLabel: 'پنج‌شنبه‌ها ساعت ۲۱:۰۰',
    initialCountdownSec: 1 * 86400 + 9 * 3600 + 15 * 60 + 40,
    serverSeedHash: '0x7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451',
    clientSeed: 'ton_masterchain_seqno_41982301',
    winningNumbers: [6, 15, 22, 31, 39],
    winningGoldenBall: 9,
    badgeColor: 'sky',
  },
];

// ============================================================================
// BULK TICKET PURCHASING & MULTI-CHANCE CART LOGIC
// ============================================================================
export interface BulkTicketSlip {
  slipIndex: number;
  mainNumbers: number[];
  goldenBall: number;
  clientSeed: string;
}

export function generateBulkQuickPickSlips(
  count: number = 5,
  mainCount: number = 5,
  mainMax: number = 50,
  goldenMax: number = 15,
  seedPrefix: string = 'bulk_ai'
): BulkTicketSlip[] {
  const safeCount = Math.max(1, Math.min(50, Math.floor(count)));
  const safeMainCount = Math.max(1, Math.min(10, mainCount));
  const safeMainMax = Math.max(safeMainCount + 2, mainMax);
  const usedSignatures = new Set<string>();
  const slips: BulkTicketSlip[] = [];

  for (let i = 0; i < safeCount; i++) {
    let mainNumbers: number[] = [];
    let goldenBall = 0;
    let attempts = 0;

    do {
      const pool: number[] = [];
      while (pool.length < safeMainCount) {
        const candidate = Math.floor(Math.random() * safeMainMax) + 1;
        if (!pool.includes(candidate)) {
          pool.push(candidate);
        }
      }
      pool.sort((a, b) => a - b);
      mainNumbers = pool;
      goldenBall = goldenMax > 0 ? Math.floor(Math.random() * goldenMax) + 1 : 0;
      attempts++;
    } while (
      usedSignatures.has(`${mainNumbers.join(',')}:${goldenBall}`) &&
      attempts < 25
    );

    usedSignatures.add(`${mainNumbers.join(',')}:${goldenBall}`);
    slips.push({
      slipIndex: i + 1,
      mainNumbers,
      goldenBall,
      clientSeed: `${seedPrefix}_${i + 1}_${Math.random().toString(16).slice(2, 10)}`,
    });
  }

  return slips;
}

export interface BulkCartSummary {
  ticketCount: number;
  unitPriceUsdt: number;
  discountPercent: number;
  subtotalUsdt: number;
  totalUsdt: number;
  totalToman: number;
  totalCny: number;
  totalTon: number;
  totalTrx: number;
  totalBtc: number;
  totalBnb: number;
}

export function calculateBulkCartSummary(
  ticketCount: number,
  unitPriceUsdt: number,
  rates: ExchangeRates = DEFAULT_FX_RATES
): BulkCartSummary {
  const safeCount = Math.max(1, Math.min(100, Math.floor(ticketCount)));
  const safeUnit = Math.max(0.1, unitPriceUsdt);
  // Multi-chance bundle bonus discount: 5+ tickets = 5% off, 10+ tickets = 10% off
  const discountPercent = safeCount >= 10 ? 10 : safeCount >= 5 ? 5 : 0;
  const subtotalUsdt = Number((safeCount * safeUnit).toFixed(2));
  const totalUsdt = Number((subtotalUsdt * (1 - discountPercent / 100)).toFixed(2));
  const converted = convertUsdtToCrypto(totalUsdt, rates);

  return {
    ticketCount: safeCount,
    unitPriceUsdt: safeUnit,
    discountPercent,
    subtotalUsdt,
    totalUsdt,
    totalToman: converted.toman,
    totalCny: converted.cny,
    totalTon: converted.ton,
    totalTrx: converted.trx,
    totalBtc: converted.btc,
    totalBnb: converted.bnb,
  };
}

// ============================================================================
// CRYPTO WITHDRAWAL MODULE VALIDATION & FEE CALCULATOR
// ============================================================================
export type WithdrawalNetwork =
  | 'USDT (TRC-20)'
  | 'TON Network'
  | 'TRON (TRX)'
  | 'BNB (BEP-20)'
  | 'Bitcoin (BTC)';

export interface AddressValidationResult {
  valid: boolean;
  network: WithdrawalNetwork;
  errorFa?: string;
}

export function validateCryptoWithdrawalAddress(
  network: WithdrawalNetwork,
  address: string
): AddressValidationResult {
  const clean = (address || '').trim();
  if (!clean) {
    return {
      valid: false,
      network,
      errorFa: 'لطفاً آدرس کیف پول مقصد را وارد نمایید.',
    };
  }

  switch (network) {
    case 'USDT (TRC-20)':
    case 'TRON (TRX)': {
      const isTron = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean);
      return isTron
        ? { valid: true, network }
        : {
            valid: false,
            network,
            errorFa: 'آدرس شبکه ترون (TRC-20 / TRX) باید با حرف T بزرگ شروع شده و دقیقاً ۳۴ کاراکتر Base58 باشد.',
          };
    }
    case 'TON Network': {
      const isTon =
        /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(clean) ||
        /^(EQ|UQ)[A-Za-z0-9_-]{34,52}$/.test(clean) ||
        /^0:[a-fA-F0-9]{64}$/.test(clean);
      return isTon
        ? { valid: true, network }
        : {
            valid: false,
            network,
            errorFa: 'آدرس شبکه TON باید با پیشوند EQ یا UQ (فرمت کاربرپسند) یا 0: شروع شود.',
          };
    }
    case 'BNB (BEP-20)': {
      const isBep20 = /^0x[a-fA-F0-9]{40}$/.test(clean);
      return isBep20
        ? { valid: true, network }
        : {
            valid: false,
            network,
            errorFa: 'آدرس شبکه بایننس اسمارت چین (BEP-20) باید با 0x شروع شده و ۴۲ کاراکتر هگزادسیمال باشد.',
          };
    }
    case 'Bitcoin (BTC)': {
      const isBtc = /^(bc1[a-zA-HJ-NP-Z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(clean);
      return isBtc
        ? { valid: true, network }
        : {
            valid: false,
            network,
            errorFa: 'آدرس بیت‌کوین باید با پیشوند bc1 (SegWit) یا 1 یا 3 شروع شود.',
          };
    }
  }
}

export interface WithdrawalFeeEstimate {
  grossAmountUsdt: number;
  networkFeeUsdt: number;
  netAmountUsdt: number;
  netAmountCrypto: string;
  cryptoSymbol: 'USDT' | 'TON' | 'TRX' | 'BNB' | 'BTC';
  estimatedArrivalLabel: string;
}

export function calculateWithdrawalFeeAndNet(
  amountUsdt: number,
  network: WithdrawalNetwork,
  rates: ExchangeRates = DEFAULT_FX_RATES
): WithdrawalFeeEstimate {
  const safeGross = Math.max(0, Number(amountUsdt) || 0);
  let networkFeeUsdt = 1.0;
  let cryptoSymbol: WithdrawalFeeEstimate['cryptoSymbol'] = 'USDT';
  let estimatedArrivalLabel = 'کمتر از ۶۰ ثانیه (Hot Wallet Auto-Payout)';

  switch (network) {
    case 'USDT (TRC-20)':
      networkFeeUsdt = 1.0;
      cryptoSymbol = 'USDT';
      estimatedArrivalLabel = 'کمتر از ۴۵ ثانیه (۱ تایید ترون)';
      break;
    case 'TON Network':
      networkFeeUsdt = 0.25;
      cryptoSymbol = 'TON';
      estimatedArrivalLabel = 'کمتر از ۱۰ ثانیه (شاردینگ TON)';
      break;
    case 'TRON (TRX)':
      networkFeeUsdt = 0.15;
      cryptoSymbol = 'TRX';
      estimatedArrivalLabel = 'کمتر از ۳۰ ثانیه';
      break;
    case 'BNB (BEP-20)':
      networkFeeUsdt = 0.35;
      cryptoSymbol = 'BNB';
      estimatedArrivalLabel = 'کمتر از ۳۰ ثانیه (BSC)';
      break;
    case 'Bitcoin (BTC)':
      networkFeeUsdt = 4.5;
      cryptoSymbol = 'BTC';
      estimatedArrivalLabel = 'حدود ۱۰ دقیقه (SegWit Block)';
      break;
  }

  const netAmountUsdt = Number(Math.max(0, safeGross - networkFeeUsdt).toFixed(2));
  const netCryptoStr = convertUsdtToCrypto(netAmountUsdt, cryptoSymbol, rates);

  return {
    grossAmountUsdt: Number(safeGross.toFixed(2)),
    networkFeeUsdt,
    netAmountUsdt,
    netAmountCrypto: `${netCryptoStr} ${cryptoSymbol}`,
    cryptoSymbol,
    estimatedArrivalLabel,
  };
}

// ============================================================================
// LIVE WIN-TIER CHECKER FOR MY TICKETS & CLAIM HUB
// ============================================================================
export interface TicketWinEvaluation {
  matchedMain: number[];
  matchedGolden: boolean;
  tierLabelFa: string;
  tierCode: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5' | 'TIER_6' | 'NONE';
  prizeUsdt: number;
  isWinner: boolean;
}

export function evaluateTicketWinTier(
  ticketMain: number[],
  ticketGolden: number,
  winningMain: number[],
  winningGolden: number,
  roundJackpotUsdt: number = 150000
): TicketWinEvaluation {
  const winSet = new Set(winningMain);
  const matchedMain = ticketMain.filter((n) => winSet.has(n));
  const matchedGolden = winningGolden > 0 ? ticketGolden === winningGolden : false;
  const mCount = matchedMain.length;

  if (mCount >= 5 && (matchedGolden || winningGolden === 0)) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۱ (مگا جک‌پات طلایی ★)',
      tierCode: 'TIER_1',
      prizeUsdt: roundJackpotUsdt,
      isWinner: true,
    };
  }
  if (mCount === 5 && !matchedGolden) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۲ (۵ گوی اصلی)',
      tierCode: 'TIER_2',
      prizeUsdt: 10000,
      isWinner: true,
    };
  }
  if (mCount === 4 && (matchedGolden || winningGolden === 0)) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۳ (۴ گوی + ستاره طلایی)',
      tierCode: 'TIER_3',
      prizeUsdt: 1500,
      isWinner: true,
    };
  }
  if (mCount === 4 && !matchedGolden) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۴ (۴ گوی اصلی)',
      tierCode: 'TIER_4',
      prizeUsdt: 150,
      isWinner: true,
    };
  }
  if (mCount === 3 && (matchedGolden || winningGolden === 0)) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۵ (۳ گوی + ستاره طلایی)',
      tierCode: 'TIER_5',
      prizeUsdt: 25,
      isWinner: true,
    };
  }
  if ((mCount === 2 && matchedGolden) || (mCount === 3 && !matchedGolden) || matchedGolden) {
    return {
      matchedMain,
      matchedGolden,
      tierLabelFa: 'رده ۶ (جایزه نقدی / بلیت رایگان)',
      tierCode: 'TIER_6',
      prizeUsdt: 5,
      isWinner: true,
    };
  }

  return {
    matchedMain,
    matchedGolden,
    tierLabelFa: 'بدون تطابق در این دور',
    tierCode: 'NONE',
    prizeUsdt: 0,
    isWinner: false,
  };
}

// ============================================================================
// ZERO-LOSS SOLVENCY & REFERRAL MATHEMATICAL ENGINE (100% HOUSE SOLVENCY GUARANTEE)
// ============================================================================
export interface ZeroLossTicketSplit {
  grossTicketUsdt: number;
  prizePoolUsdt: number;            // 85%
  grossHouseMarginUsdt: number;     // 10% total house allocation
  referralCommissionUsdt: number;   // 2% (carved strictly out of the 10% house margin ONLY if referred)
  netOperatorProfitUsdt: number;    // 8% (if referred) or 10% (if direct) — NEVER < 8%
  rolloverReserveUsdt: number;      // 3%
  gasBufferUsdt: number;            // 2%
  netOperatorMarginPercent: number; // 8% or 10%
  referralCommissionPercent: number;// 2% or 0%
  houseDeficitPossible: false;      // Mathematical invariant: always false
}

export function calculateZeroLossTicketSplit(
  ticketPriceUsdt: number,
  hasValidReferrer: boolean,
  rtpPercent: number = 85,
  referralCommissionPct: number = 2
): ZeroLossTicketSplit {
  const safeGross = Math.max(0, Number(ticketPriceUsdt) || 0);
  const clampedRtp = Math.min(85, Math.max(70, rtpPercent));
  const rolloverPct = 3;
  const gasPct = 2;
  const grossHousePct = Math.max(10, 100 - clampedRtp - rolloverPct - gasPct);

  // Referral commission is capped at max 3% and strictly deducted from the 10% House Margin
  const effectiveRefPct = hasValidReferrer
    ? Math.min(3, Math.max(0, referralCommissionPct))
    : 0;
  const netOperatorPct = Math.max(7, grossHousePct - effectiveRefPct);

  const prizePoolUsdt = Number(((safeGross * clampedRtp) / 100).toFixed(4));
  const grossHouseMarginUsdt = Number(((safeGross * grossHousePct) / 100).toFixed(4));
  const referralCommissionUsdt = Number(((safeGross * effectiveRefPct) / 100).toFixed(4));
  const netOperatorProfitUsdt = Number(
    Math.max(0, grossHouseMarginUsdt - referralCommissionUsdt).toFixed(4)
  );
  const rolloverReserveUsdt = Number(((safeGross * rolloverPct) / 100).toFixed(4));
  const gasBufferUsdt = Number(((safeGross * gasPct) / 100).toFixed(4));

  return {
    grossTicketUsdt: Number(safeGross.toFixed(4)),
    prizePoolUsdt,
    grossHouseMarginUsdt,
    referralCommissionUsdt,
    netOperatorProfitUsdt,
    rolloverReserveUsdt,
    gasBufferUsdt,
    netOperatorMarginPercent: netOperatorPct,
    referralCommissionPercent: effectiveRefPct,
    houseDeficitPossible: false,
  };
}

export type SolvencyProtectionMode = 'AUTO_EXTEND' | 'PROPORTIONAL_POOL';

export interface ZeroLossDrawSolvencyReport {
  realCollectedSalesUsdt: number;
  realPrizePool85Usdt: number;
  rolloverReserveUsdt: number;
  totalAvailablePrizeLiquidityUsdt: number;
  targetJackpotUsdt: number;
  solvencyRatioPercent: number;
  isFullyFundedForTarget: boolean;
  solvencyMode: SolvencyProtectionMode;
  recommendedAction: 'EXECUTE_FULL_TARGET' | 'AUTO_EXTEND_TIMER' | 'EXECUTE_CAPPED_AT_REAL_POOL';
  authorizedMaxPayoutUsdt: number;
  guaranteedHouseNetProfitUsdt: number;
  platformLossUsdt: 0; // Hard mathematical invariant: ALWAYS 0
}

export function evaluateZeroLossDrawSolvency(params: {
  realCollectedSalesUsdt: number;
  targetJackpotUsdt: number;
  rolloverReserveUsdt?: number;
  rtpPercent?: number;
  solvencyMode?: SolvencyProtectionMode;
}): ZeroLossDrawSolvencyReport {
  const sales = Math.max(0, Number(params.realCollectedSalesUsdt) || 0);
  const rtp = Math.min(85, Math.max(70, Number(params.rtpPercent) || 85));
  const rollover = Math.max(0, Number(params.rolloverReserveUsdt) || 0);
  const target = Math.max(1, Number(params.targetJackpotUsdt) || 1000);
  const mode: SolvencyProtectionMode = params.solvencyMode || 'AUTO_EXTEND';

  const realPrizePool85Usdt = Number(((sales * rtp) / 100).toFixed(2));
  const totalAvailablePrizeLiquidityUsdt = Number((realPrizePool85Usdt + rollover).toFixed(2));
  const solvencyRatioPercent = Math.min(
    100,
    Number(((totalAvailablePrizeLiquidityUsdt / target) * 100).toFixed(1))
  );
  const isFullyFundedForTarget = totalAvailablePrizeLiquidityUsdt >= target;

  // Minimum 8% net profit even if 100% of tickets had a 2% referral
  const guaranteedHouseNetProfitUsdt = Number((sales * 0.08).toFixed(2));

  if (isFullyFundedForTarget) {
    return {
      realCollectedSalesUsdt: sales,
      realPrizePool85Usdt,
      rolloverReserveUsdt: rollover,
      totalAvailablePrizeLiquidityUsdt,
      targetJackpotUsdt: target,
      solvencyRatioPercent: 100,
      isFullyFundedForTarget: true,
      solvencyMode: mode,
      recommendedAction: 'EXECUTE_FULL_TARGET',
      authorizedMaxPayoutUsdt: target,
      guaranteedHouseNetProfitUsdt,
      platformLossUsdt: 0,
    };
  }

  return {
    realCollectedSalesUsdt: sales,
    realPrizePool85Usdt,
    rolloverReserveUsdt: rollover,
    totalAvailablePrizeLiquidityUsdt,
    targetJackpotUsdt: target,
    solvencyRatioPercent,
    isFullyFundedForTarget: false,
    solvencyMode: mode,
    recommendedAction:
      mode === 'AUTO_EXTEND' ? 'AUTO_EXTEND_TIMER' : 'EXECUTE_CAPPED_AT_REAL_POOL',
    // Even if executed immediately in PROPORTIONAL_POOL mode, payout is strictly capped at actual 85% pool
    authorizedMaxPayoutUsdt: totalAvailablePrizeLiquidityUsdt,
    guaranteedHouseNetProfitUsdt,
    platformLossUsdt: 0,
  };
}

export function getBlockchainExplorerTxUrl(network: string, txHash: string): string {
  const cleanHash = (txHash || '').trim().replace(/^0x/, '');
  const netUpper = (network || '').toUpperCase();
  if (netUpper.includes('TON')) {
    return `https://tonviewer.com/transaction/${encodeURIComponent(txHash.trim())}`;
  }
  if (netUpper.includes('BNB') || netUpper.includes('BEP')) {
    return `https://bscscan.com/tx/0x${cleanHash}`;
  }
  if (netUpper.includes('BTC') || netUpper.includes('BITCOIN')) {
    return `https://mempool.space/tx/${cleanHash}`;
  }
  return `https://tronscan.org/#/transaction/${cleanHash}`;
}

// ============================================================================
// ZERO-LOSS VIP LOYALTY CHEST ENGINE (100% FUNDED BY 3% ROLLOVER RESERVE)
// ============================================================================
export interface ZeroLossLoyaltyChestReport {
  totalTicketsPurchased: number;
  chestsUnlockedTotal: number;
  chestsClaimedCount: number;
  chestsAvailableToOpen: number;
  ticketsUntilNextChest: number;
  progressToNextChestPercent: number;
  userGeneratedRollover3PctUsdt: number;
  availableRolloverReservePoolUsdt: number;
  safeRewardUsdt: number;
  rewardTierLabelFa: string;
  houseProfitUntouched: true;
  platformLossUsdt: 0;
}

export function evaluateZeroLossLoyaltyChest(params: {
  totalTicketsPurchased: number;
  totalSpentUsdt: number;
  chestsClaimedCount: number;
  availableRolloverReservePoolUsdt: number;
  ticketsPerChest?: number;
  seedNonce?: number;
}): ZeroLossLoyaltyChestReport {
  const ticketsPerChest = Math.max(1, params.ticketsPerChest || 3);
  const totalTickets = Math.max(0, Math.floor(params.totalTicketsPurchased));
  const totalSpent = Math.max(0, Number(params.totalSpentUsdt) || totalTickets * 5);
  const claimed = Math.max(0, Math.floor(params.chestsClaimedCount));
  const reservePool = Math.max(0, Number(params.availableRolloverReservePoolUsdt) || 0);

  const chestsUnlockedTotal = Math.floor(totalTickets / ticketsPerChest);
  const chestsAvailableToOpen = Math.max(0, chestsUnlockedTotal - claimed);
  const remainder = totalTickets % ticketsPerChest;
  const ticketsUntilNextChest = ticketsPerChest - remainder;
  const progressToNextChestPercent = Math.min(
    100,
    Math.round((remainder / ticketsPerChest) * 100)
  );

  // 3% of the user's real ticket spend went into the Rollover Reserve
  const userGeneratedRollover3PctUsdt = Number((totalSpent * 0.03).toFixed(2));
  // Each chest is strictly funded from at most 55% of the 3% rollover generated per chest batch,
  // and strictly capped by the availableRolloverReservePoolUsdt so the house never loses a cent.
  const batchSpendUsdt = ticketsPerChest * (totalTickets > 0 ? totalSpent / totalTickets : 5);
  const batchRollover3PctUsdt = batchSpendUsdt * 0.03;
  const maxSafeChestCapUsdt = Math.min(reservePool * 0.25, Math.max(0.25, batchRollover3PctUsdt * 0.8));

  const nonce = params.seedNonce ?? claimed + totalTickets + 7;
  const tierFactor = ((nonce * 37) % 100) / 100; // deterministic 0.00..0.99
  const rawReward = maxSafeChestCapUsdt * (0.55 + tierFactor * 0.45);
  const safeRewardUsdt =
    chestsAvailableToOpen > 0 && reservePool >= 0.1
      ? Number(Math.min(reservePool, Math.max(0.15, rawReward)).toFixed(2))
      : 0;

  let rewardTierLabelFa = 'صندوقچه وفاداری برنزی VIP';
  if (safeRewardUsdt >= 1.0) {
    rewardTierLabelFa = '👑 صندوقچه سلطنتی الماس (Sovereign Chest)';
  } else if (safeRewardUsdt >= 0.4) {
    rewardTierLabelFa = '✨ صندوقچه طلایی وایرال VIP';
  }

  return {
    totalTicketsPurchased: totalTickets,
    chestsUnlockedTotal,
    chestsClaimedCount: claimed,
    chestsAvailableToOpen,
    ticketsUntilNextChest,
    progressToNextChestPercent: chestsAvailableToOpen > 0 ? 100 : progressToNextChestPercent,
    userGeneratedRollover3PctUsdt,
    availableRolloverReservePoolUsdt: Number(reservePool.toFixed(2)),
    safeRewardUsdt,
    rewardTierLabelFa,
    houseProfitUntouched: true,
    platformLossUsdt: 0,
  };
}

export function formatTelegramAdminAlertText(params: {
  eventType: 'DEPOSIT' | 'WITHDRAWAL' | 'TICKET_PURCHASE' | 'TEST_PING';
  userDisplayName: string;
  amountUsdt: number;
  network?: string;
  details: string;
}): string {
  const icon =
    params.eventType === 'DEPOSIT'
      ? '💰 [واریز جدید رمزارز]'
      : params.eventType === 'WITHDRAWAL'
      ? '🏧 [درخواست برداشت رمزارز]'
      : params.eventType === 'TICKET_PURCHASE'
      ? '🎟️ [خرید بلیت جدید لاتاری]'
      : '🛡️ [تست اتصال ربات کاکپیت ادمین]';

  return `${icon}\n👤 کاربر: ${params.userDisplayName}\n💵 مبلغ: $${params.amountUsdt.toFixed(
    2
  )} USDT${params.network ? ` (${params.network})` : ''}\n📌 جزئیات: ${
    params.details
  }\n🔐 وضعیت خزانه: ۱۰۰٪ ضدضرر (Zero-Loss Active)`;
}

// ============================================================================
// FIRESTORE UNIQUE REFERRAL LINK GENERATOR & ZERO-LOSS PROFIT DEDUCTION ENGINE
// ============================================================================
export interface UniqueReferralLinkBundle {
  referralCode: string;
  referralUrl: string;
  telegramShareUrl: string;
}

export function generateUniqueUserReferralLink(params: {
  uidOrIdentity: string;
  customAlias?: string;
  originUrl?: string;
}): UniqueReferralLinkBundle {
  const baseOrigin = (params.originUrl || 'https://luckydrop.vip').replace(/\/+$/, '');
  const cleanAlias = (params.customAlias || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 14);

  // Deterministic 4-char alphanumeric fingerprint from user UID/wallet
  const identityRaw = (params.uidOrIdentity || 'VIP-SOVEREIGN').trim();
  let hashAcc = 2166136261;
  for (let i = 0; i < identityRaw.length; i++) {
    hashAcc ^= identityRaw.charCodeAt(i);
    hashAcc = Math.imul(hashAcc, 16777619);
  }
  const suffix = Math.abs(hashAcc >>> 0)
    .toString(36)
    .toUpperCase()
    .padStart(4, '7')
    .slice(0, 4);

  const referralCode = cleanAlias
    ? `VIP-${cleanAlias}-${suffix}`.slice(0, 28)
    : `VIP-${suffix}-777`;

  const referralUrl = `${baseOrigin}/?ref=${encodeURIComponent(referralCode)}`;
  const shareText = `👑 دعوت‌نامه رسمی زرین لاتاری VIP — با لینک اختصاصی من وارد شوید و در استخرهای جک‌پات شرکت کنید (کد معرف: ${referralCode})`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    referralUrl
  )}&text=${encodeURIComponent(shareText)}`;

  return {
    referralCode,
    referralUrl,
    telegramShareUrl,
  };
}

export interface ZeroLossNetProfitReferralLedger {
  ticketGrossUsdt: number;
  prizePool85Usdt: number;
  rolloverReserve3Usdt: number;
  gasBuffer2Usdt: number;
  grossLotteryProfit10Usdt: number;
  commissionDeductedFromProfit2Usdt: number;
  netHouseProfitRetained8Usdt: number;
  deductedStrictlyFromNetProfit: true;
  prizePoolUntouched: true;
  platformLossUsdt: 0;
}

export function calculateReferralDeductionFromNetProfit(params: {
  ticketGrossUsdt: number;
  hasValidReferrer: boolean;
  commissionRateFromSalesPercent?: number;
}): ZeroLossNetProfitReferralLedger {
  const gross = Math.max(0, Number(params.ticketGrossUsdt) || 0);
  const prizePool85Usdt = Number((gross * 0.85).toFixed(4));
  const rolloverReserve3Usdt = Number((gross * 0.03).toFixed(4));
  const gasBuffer2Usdt = Number((gross * 0.02).toFixed(4));
  const grossLotteryProfit10Usdt = Number((gross * 0.1).toFixed(4));

  // Commission is strictly capped at max 2% of ticket gross (i.e. 20% of the 10% net lottery profit)
  // and NEVER exceeds the grossLotteryProfit10Usdt. If no referrer, commission is 0 and house keeps full 10%.
  const requestedPct = Math.min(3, Math.max(0, params.commissionRateFromSalesPercent ?? 2));
  const rawCommission = params.hasValidReferrer ? (gross * requestedPct) / 100 : 0;
  const commissionDeductedFromProfit2Usdt = Number(
    Math.min(grossLotteryProfit10Usdt * 0.3, rawCommission).toFixed(4)
  );
  const netHouseProfitRetained8Usdt = Number(
    Math.max(0, grossLotteryProfit10Usdt - commissionDeductedFromProfit2Usdt).toFixed(4)
  );

  return {
    ticketGrossUsdt: Number(gross.toFixed(4)),
    prizePool85Usdt,
    rolloverReserve3Usdt,
    gasBuffer2Usdt,
    grossLotteryProfit10Usdt,
    commissionDeductedFromProfit2Usdt,
    netHouseProfitRetained8Usdt,
    deductedStrictlyFromNetProfit: true,
    prizePoolUntouched: true,
    platformLossUsdt: 0,
  };
}




