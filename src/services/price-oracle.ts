import { ExchangeRates, DEFAULT_FX_RATES, getCnyToTomanRate } from '../utils/lotteryEngine.ts';

export interface LiveOracleSnapshot {
  rates: ExchangeRates;
  cnyToTomanRate: number;
  tonUsdPrice: number;
  tonChange24hPercent: number;
  starsUsdPrice: number;
  starsPerTon: number;
  providerLabel: string;
  source:
    | 'TETHERLAND_WALLEX_BINANCE_LIVE'
    | 'BINANCE_AND_OPEN_FX'
    | 'COINGECKO_AND_OPEN_FX'
    | 'FALLBACK_ORACLE_FEED';
  lastUpdatedIso: string;
  adminMarkupPercent: number;
  baseTomanRate: number;
  baseCnyRate: number;
  changes24h: {
    BTC: number;
    TON: number;
    TRX: number;
    BNB: number;
  };
}

export interface OracleConfig {
  baseTomanRate?: number;
  baseCnyRate?: number;
  adminMarkupPercent: number;
}

const DEFAULT_ORACLE_CONFIG: OracleConfig = {
  baseTomanRate: DEFAULT_FX_RATES.TOMAN,
  baseCnyRate: DEFAULT_FX_RATES.CNY,
  adminMarkupPercent: 0,
};

/**
 * Pure calculation for applying admin markup and deriving live Fiat + Crypto rates
 */
export function computeOracleExchangeRates(
  rawCryptoPrices: { BTC: number; TON: number; TRX: number; BNB: number },
  config: OracleConfig = DEFAULT_ORACLE_CONFIG
): ExchangeRates {
  const safeMarkupMultiplier = 1 + Math.max(-10, Math.min(25, config.adminMarkupPercent || 0)) / 100;
  const rawToman = config.baseTomanRate ?? DEFAULT_FX_RATES.TOMAN;
  const rawCny = config.baseCnyRate ?? DEFAULT_FX_RATES.CNY;

  const effectiveToman = Math.round(Math.max(10000, rawToman) * safeMarkupMultiplier);
  const effectiveCny = Number((Math.max(1, rawCny) * safeMarkupMultiplier).toFixed(4));

  return {
    USD: 1,
    TOMAN: effectiveToman,
    CNY: effectiveCny,
    BTC: Number(Math.max(1, rawCryptoPrices.BTC).toFixed(2)),
    TON: Number(Math.max(0.01, rawCryptoPrices.TON).toFixed(4)),
    TRX: Number(Math.max(0.001, rawCryptoPrices.TRX).toFixed(4)),
    BNB: Number(Math.max(1, rawCryptoPrices.BNB).toFixed(2)),
  };
}

/**
 * Fetches live market prices from our CORS-free backend Oracle proxy (/api/oracle/prices & /api/oracle/live)
 * which polls TonAPI -> Binance -> CoinGecko every 30 seconds in the background.
 */
export async function fetchLivePriceOracle(
  config: Partial<OracleConfig> = {}
): Promise<LiveOracleSnapshot> {
  const markupPct = typeof config.adminMarkupPercent === 'number' ? config.adminMarkupPercent : 0;

  let btc = DEFAULT_FX_RATES.BTC;
  let ton = DEFAULT_FX_RATES.TON;
  let trx = DEFAULT_FX_RATES.TRX;
  let bnb = DEFAULT_FX_RATES.BNB;
  let starsUsdPrice = 0.016;
  let starsPerTon = 250;
  let providerLabel = 'TonAPI + Binance';
  let tomanBase = config.baseTomanRate || DEFAULT_FX_RATES.TOMAN;
  let cnyBase = config.baseCnyRate || DEFAULT_FX_RATES.CNY;
  let source: LiveOracleSnapshot['source'] = 'FALLBACK_ORACLE_FEED';
  let changes24h = {
    BTC: 1.42,
    TON: 2.15,
    TRX: 1.18,
    BNB: 0.94,
  };

  // 1. Primary: Query server-side /api/oracle/prices & /api/oracle/live
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const [pricesRes, liveRes] = await Promise.all([
      fetch('/api/oracle/prices', { signal: controller.signal }).catch(() => null),
      fetch('/api/oracle/live', { signal: controller.signal }).catch(() => null),
    ]);
    clearTimeout(timeout);

    const pricesData = pricesRes && pricesRes.ok ? await pricesRes.json().catch(() => null) : null;
    const data = liveRes && liveRes.ok ? await liveRes.json().catch(() => null) : pricesData;

    if (data || pricesData) {
      if (Number.isFinite(Number(data?.toman)) && Number(data.toman) > 50000) {
        tomanBase = Math.round(Number(data.toman));
      }
      if (Number.isFinite(Number(data?.cny)) && Number(data.cny) > 1) {
        cnyBase = Number(Number(data.cny).toFixed(4));
      }
      if (Number.isFinite(Number(data?.btc)) && Number(data.btc) > 100) {
        btc = Number(data.btc);
      }
      const resolvedTon = Number(pricesData?.tonUsdPrice ?? data?.tonUsdPrice ?? data?.ton);
      if (Number.isFinite(resolvedTon) && resolvedTon > 0.05) {
        ton = resolvedTon;
      }
      if (Number.isFinite(Number(pricesData?.starsUsdPrice ?? data?.starsUsdPrice))) {
        starsUsdPrice = Number(pricesData?.starsUsdPrice ?? data?.starsUsdPrice);
      }
      if (Number.isFinite(Number(pricesData?.starsPerTon ?? data?.starsPerTon))) {
        starsPerTon = Math.round(Number(pricesData?.starsPerTon ?? data?.starsPerTon));
      } else if (ton > 0 && starsUsdPrice > 0) {
        starsPerTon = Math.max(50, Math.round(ton / starsUsdPrice));
      }
      if (pricesData?.source || data?.source) {
        providerLabel = String(pricesData?.source || data?.source);
      }
      if (Number.isFinite(Number(data?.trx)) && Number(data.trx) > 0.005) {
        trx = Number(data.trx);
      }
      if (Number.isFinite(Number(data?.bnb)) && Number(data.bnb) > 10) {
        bnb = Number(data.bnb);
      }
      const tonDiff = Number(pricesData?.tonChange24hPercent ?? data?.tonChange24hPercent ?? data?.changes24h?.TON);
      changes24h = {
        BTC: Number(data?.changes24h?.BTC ?? changes24h.BTC),
        TON: Number.isFinite(tonDiff) ? tonDiff : changes24h.TON,
        TRX: Number(data?.changes24h?.TRX ?? changes24h.TRX),
        BNB: Number(data?.changes24h?.BNB ?? changes24h.BNB),
      };
      source = 'TETHERLAND_WALLEX_BINANCE_LIVE';

      const rates = computeOracleExchangeRates(
        { BTC: btc, TON: ton, TRX: trx, BNB: bnb },
        {
          baseTomanRate: tomanBase,
          baseCnyRate: cnyBase,
          adminMarkupPercent: markupPct,
        }
      );

      return {
        rates,
        cnyToTomanRate: getCnyToTomanRate(rates),
        tonUsdPrice: rates.TON,
        tonChange24hPercent: changes24h.TON,
        starsUsdPrice,
        starsPerTon,
        providerLabel,
        source,
        lastUpdatedIso:
          pricesData?.lastUpdatedIso || data?.timestamp || new Date().toISOString(),
        adminMarkupPercent: markupPct,
        baseTomanRate: tomanBase,
        baseCnyRate: cnyBase,
        changes24h,
      };
    }
  } catch {
    // Proceed to direct client-side public API calls if /api/oracle/prices is unreachable
  }

  // 2. Direct client-side fallback for Tether/Toman (TetherLand & Wallex & Nobitex)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const tlRes = await fetch('https://api.tetherland.com/currencies', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (tlRes.ok) {
      const tlData = await tlRes.json();
      const tlPrice = Number(tlData?.data?.currencies?.USDT?.price);
      if (Number.isFinite(tlPrice) && tlPrice > 50000) {
        tomanBase = Math.round(tlPrice);
      }
    }
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const nbRes = await fetch('https://apiv2.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls', {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (nbRes.ok) {
        const nbData = await nbRes.json();
        const rlsPrice = Number(nbData?.stats?.['usdt-rls']?.latest);
        if (Number.isFinite(rlsPrice) && rlsPrice > 500000) {
          tomanBase = Math.round(rlsPrice / 10);
        }
      }
    } catch {
      // Keep baseline Toman rate
    }
  }

  // 3. Direct client-side fallback for Crypto (TonAPI -> Binance -> CoinGecko)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const tonApiRes = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (tonApiRes.ok) {
      const tonData = await tonApiRes.json();
      const liveTon = Number(tonData?.rates?.TON?.prices?.USD);
      if (Number.isFinite(liveTon) && liveTon > 0.1) {
        ton = Number(liveTon.toFixed(4));
        source = 'BINANCE_AND_OPEN_FX';
      }
    }
  } catch {
    // ignore and try Binance/CoinGecko
  }

  try {
    const symbols = encodeURIComponent(JSON.stringify(['BTCUSDT', 'TONUSDT', 'TRXUSDT', 'BNBUSDT']));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbols}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (binanceRes.ok) {
      const items: Array<{ symbol: string; price: string }> = await binanceRes.json();
      for (const item of items) {
        const val = parseFloat(item.price);
        if (!Number.isFinite(val) || val <= 0) continue;
        if (item.symbol === 'BTCUSDT') btc = val;
        if (item.symbol === 'TONUSDT') ton = val;
        if (item.symbol === 'TRXUSDT') trx = val;
        if (item.symbol === 'BNBUSDT') bnb = val;
      }
      source = 'BINANCE_AND_OPEN_FX';
    }
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,the-open-network,tron,binancecoin&vs_currencies=usd',
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (cgRes.ok) {
        const data = await cgRes.json();
        if (data?.bitcoin?.usd) btc = Number(data.bitcoin.usd);
        if (data?.['the-open-network']?.usd) ton = Number(data['the-open-network'].usd);
        if (data?.tron?.usd) trx = Number(data.tron.usd);
        if (data?.binancecoin?.usd) bnb = Number(data.binancecoin.usd);
        source = 'COINGECKO_AND_OPEN_FX';
      }
    } catch {
      // Keep baseline crypto prices
    }
  }

  // 4. Direct client-side fallback for USD/CNY
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData?.rates?.CNY && Number.isFinite(Number(fxData.rates.CNY))) {
        cnyBase = Number(Number(fxData.rates.CNY).toFixed(4));
      }
    }
  } catch {
    // Keep baseline CNY rate
  }

  const rates = computeOracleExchangeRates(
    { BTC: btc, TON: ton, TRX: trx, BNB: bnb },
    {
      baseTomanRate: tomanBase,
      baseCnyRate: cnyBase,
      adminMarkupPercent: markupPct,
    }
  );

  return {
    rates,
    cnyToTomanRate: getCnyToTomanRate(rates),
    tonUsdPrice: rates.TON,
    tonChange24hPercent: changes24h.TON,
    starsUsdPrice,
    starsPerTon: Math.max(50, Math.round(rates.TON / starsUsdPrice)),
    providerLabel,
    source,
    lastUpdatedIso: new Date().toISOString(),
    adminMarkupPercent: markupPct,
    baseTomanRate: tomanBase,
    baseCnyRate: cnyBase,
    changes24h,
  };
}
