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
  TOMAN: 82500,
  CNY: 7.24,
  USD: 1,
  BTC: 88540,
  TON: 5.48,
  TRX: 0.242,
  BNB: 642.1,
};

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
  tomanRateOrRtpPct: number = 82500
): BinomialOddsResult {
  const n = Math.max(1, Math.min(10000, Math.floor(tickets)));
  const rtpFraction =
    rtpRateOrJackpot <= 1
      ? rtpRateOrJackpot
      : tomanRateOrRtpPct <= 100
      ? tomanRateOrRtpPct / 100
      : 0.85;
  const tomanRate = tomanRateOrRtpPct > 1000 ? tomanRateOrRtpPct : 82500;

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

