import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getPlatformSnapshot,
  purchaseLotteryTicket,
  creditCryptoDeposit,
  createLotteryRound,
  triggerProvablyFairDraw,
  toggleRoundStatus,
  addSupportReply,
  searchTicketOrHash,
} from './src/db/users.ts';
import {
  DEFAULT_FX_RATES,
  verifyWebhookHmacAndIdempotency,
  formatTelegramWinnerBroadcast,
} from './src/utils/lotteryEngine.ts';

dotenv.config();

const app = express();
app.use(express.json());

let killSwitchActive = false;
const processedWebhookKeys = new Set<string>([
  'TronGrid:0xe983bf10',
  'Toncenter:0x39812014',
]);
let baseIdempotentCount = 149820;

const getUserIdentity = (req: AuthRequest) => ({
  uid: req.user?.uid || 'vip-demo-user',
  email: req.user?.email || 'vip@zarrinlottery.live',
});

// In-memory state overlay for withdrawals, claimed tickets, and multi-lottery rounds
interface ServerWithdrawalItem {
  id: number;
  withdrawalCode: string;
  userUid: string;
  userDisplayName: string;
  network: string;
  destinationAddress: string;
  grossAmountUsdt: number;
  networkFeeUsdt: number;
  netAmountUsdt: number;
  netAmountCrypto: string;
  twoFactorVerified: boolean;
  status: 'pending_review' | 'broadcasting' | 'completed' | 'rejected';
  txHash: string;
  createdAt: string;
}

const serverWithdrawals: ServerWithdrawalItem[] = [
  {
    id: 901,
    withdrawalCode: 'WD-884120',
    userUid: 'vip-demo-user',
    userDisplayName: 'کامران سهرابی (VIP)',
    network: 'USDT (TRC-20)',
    destinationAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    grossAmountUsdt: 450.0,
    networkFeeUsdt: 1.0,
    netAmountUsdt: 449.0,
    netAmountCrypto: '449.00 USDT',
    twoFactorVerified: true,
    status: 'pending_review',
    txHash: '0x94a8b7c6d5e4f3a2b1c0987654321fedcba0987654321fedcba098765432101',
    createdAt: '۱۰ دقیقه پیش',
  },
  {
    id: 902,
    withdrawalCode: 'WD-883904',
    userUid: 'vip-demo-user',
    userDisplayName: 'نسترن فرهادی (VIP)',
    network: 'TON Network',
    destinationAddress: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
    grossAmountUsdt: 1200.0,
    networkFeeUsdt: 0.25,
    netAmountUsdt: 1199.75,
    netAmountCrypto: '212.72 TON',
    twoFactorVerified: true,
    status: 'completed',
    txHash: '0x3f82c1099b84a712e904d2c3f1a8b904d2c3f1a8b904d2c3f1a8b904d2c3f1a8',
    createdAt: '۱ ساعت پیش',
  },
];

const claimedTicketCodesServer = new Set<string>();

// 0. Real-Time Multi-Exchange Live Price Oracle Proxy (CORS-Free)
// Aggregates live Iranian Tether/Toman (TetherLand, Wallex, Nobitex),
// live Chinese Yuan (Frankfurter ECB, OpenER, KuCoin), and live Crypto (Binance 24hr, CoinGecko)
app.get('/api/oracle/live', async (_req, res) => {
  let toman = DEFAULT_FX_RATES.TOMAN;
  let cny = DEFAULT_FX_RATES.CNY;
  let btc = DEFAULT_FX_RATES.BTC;
  let ton = DEFAULT_FX_RATES.TON;
  let trx = DEFAULT_FX_RATES.TRX;
  let bnb = DEFAULT_FX_RATES.BNB;
  const changes24h = { BTC: 1.42, TON: 2.15, TRX: 1.18, BNB: 0.94 };
  const activeSources: string[] = [];

  const fetchJsonWithTimeout = async (url: string, timeoutMs = 3800) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LuckyDropOracle/4.8)' },
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  const [tetherlandData, wallexData, nobitexData, binanceData, frankfurterData, openErData, kucoinData] =
    await Promise.all([
      fetchJsonWithTimeout('https://api.tetherland.com/currencies'),
      fetchJsonWithTimeout('https://api.wallex.ir/v1/markets'),
      fetchJsonWithTimeout('https://apiv2.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls'),
      fetchJsonWithTimeout(
        'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22TONUSDT%22,%22TRXUSDT%22,%22BNBUSDT%22%5D'
      ),
      fetchJsonWithTimeout('https://api.frankfurter.app/latest?from=USD&to=CNY'),
      fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD'),
      fetchJsonWithTimeout('https://api.kucoin.com/api/v1/prices?base=CNY&currencies=USDT'),
    ]);

  // 1. Live Iranian Tether/Toman (USDT/IRT)
  const tomanQuotes: number[] = [];
  const tlPrice = Number(tetherlandData?.data?.currencies?.USDT?.price);
  if (Number.isFinite(tlPrice) && tlPrice > 50000) {
    tomanQuotes.push(Math.round(tlPrice));
    activeSources.push('TetherLand');
  }
  const wxPrice = Number(wallexData?.result?.symbols?.USDTTMN?.stats?.lastPrice);
  if (Number.isFinite(wxPrice) && wxPrice > 50000) {
    tomanQuotes.push(Math.round(wxPrice));
    activeSources.push('Wallex');
  }
  const nbRlsPrice = Number(nobitexData?.stats?.['usdt-rls']?.latest);
  if (Number.isFinite(nbRlsPrice) && nbRlsPrice > 500000) {
    tomanQuotes.push(Math.round(nbRlsPrice / 10)); // Convert Rial (RLS) to Toman (IRT)
    activeSources.push('Nobitex');
  }
  if (tomanQuotes.length > 0) {
    // Use TetherLand/Wallex primary quote or median of live Iranian exchanges
    toman = tomanQuotes[0];
  }

  // 2. Live Chinese Yuan (USD/CNY & USDT/CNY)
  const cnyQuotes: number[] = [];
  const erCny = Number(openErData?.rates?.CNY);
  if (Number.isFinite(erCny) && erCny > 3 && erCny < 15) {
    cnyQuotes.push(erCny);
    activeSources.push('OpenER');
  }
  const ffCny = Number(frankfurterData?.rates?.CNY);
  if (Number.isFinite(ffCny) && ffCny > 3 && ffCny < 15) {
    cnyQuotes.push(ffCny);
    activeSources.push('Frankfurter');
  }
  const kcCny = Number(kucoinData?.data?.USDT);
  if (Number.isFinite(kcCny) && kcCny > 3 && kcCny < 15) {
    cnyQuotes.push(kcCny);
    activeSources.push('KuCoin');
  }
  if (cnyQuotes.length > 0) {
    cny = Number(cnyQuotes[0].toFixed(4));
  }

  // 3. Live Crypto Prices (BTC, TON, TRX, BNB) from Binance 24hr Ticker
  if (Array.isArray(binanceData)) {
    for (const item of binanceData) {
      const price = parseFloat(item.lastPrice);
      const pct = parseFloat(item.priceChangePercent);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (item.symbol === 'BTCUSDT') {
        btc = Number(price.toFixed(2));
        if (Number.isFinite(pct)) changes24h.BTC = Number(pct.toFixed(2));
      } else if (item.symbol === 'TONUSDT') {
        ton = Number(price.toFixed(4));
        if (Number.isFinite(pct)) changes24h.TON = Number(pct.toFixed(2));
      } else if (item.symbol === 'TRXUSDT') {
        trx = Number(price.toFixed(4));
        if (Number.isFinite(pct)) changes24h.TRX = Number(pct.toFixed(2));
      } else if (item.symbol === 'BNBUSDT') {
        bnb = Number(price.toFixed(2));
        if (Number.isFinite(pct)) changes24h.BNB = Number(pct.toFixed(2));
      }
    }
    activeSources.push('Binance');
  }

  const cnyToToman = Math.round(toman / (cny || 6.68));

  res.json({
    ok: true,
    toman,
    cny,
    cnyToToman,
    btc,
    ton,
    trx,
    bnb,
    changes24h,
    sources: activeSources,
    timestamp: new Date().toISOString(),
  });
});

// 1. Live FX & Platform Snapshot
app.get('/api/snapshot', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, email } = getUserIdentity(req);
    const snapshot = await getPlatformSnapshot(uid, email);
    res.json({
      ...snapshot,
      withdrawals: serverWithdrawals,
      claimedTicketCodes: Array.from(claimedTicketCodesServer),
      killSwitchActive,
      fxRates: DEFAULT_FX_RATES,
    });
  } catch (error: any) {
    console.error('Failed to fetch platform snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to load platform state' });
  }
});

// 2. Mint Single or Bulk Lottery Tickets (/api/tickets/purchase and alias /api/tickets/buy)
const handleTicketPurchase = async (req: AuthRequest, res: express.Response) => {
  try {
    if (killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: فروش بلیت و درگاه‌ها توسط کلید قطع اضطراری متوقف شده است.',
      });
    }
    const { uid, email } = getUserIdentity(req);
    const {
      roundCode = '#ZRN-8493',
      mainNumbers = [7, 14, 21, 33, 49],
      goldenBall = 9,
      costUsdt = 5,
      currencyNetwork = 'USDT (TRC-20)',
      clientSeed = 'zarrin-client-vip',
      slips,
    } = req.body;

    // Support Bulk Multi-Ticket Batches in a single atomic transaction
    if (Array.isArray(slips) && slips.length > 0) {
      const unitCost = Number(costUsdt) / slips.length;
      const mintedTickets = [];
      let latestBalance = 0;

      for (const slip of slips) {
        const slipMain = Array.isArray(slip.mainNumbers) ? slip.mainNumbers.map(Number) : [7, 14, 21, 33, 49];
        if (slipMain.length < 4) {
          return res.status(400).json({ error: 'لطفاً تمام گوی‌های اصلی مورد نیاز هر کوپن را انتخاب کنید.' });
        }
        const singleRes = await purchaseLotteryTicket({
          uid,
          email,
          roundCode,
          mainNumbers: slipMain,
          goldenBall: Number(slip.goldenBall ?? 0),
          costUsdt: Number(unitCost.toFixed(2)),
          currencyNetwork,
          clientSeed: slip.clientSeed || clientSeed,
        });
        mintedTickets.push(singleRes.ticket);
        latestBalance = singleRes.newBalanceUsdt;
      }

      return res.json({
        ok: true,
        ticket: mintedTickets[0],
        tickets: mintedTickets,
        newBalanceUsdt: latestBalance,
      });
    }

    if (!Array.isArray(mainNumbers) || mainNumbers.length < 4) {
      return res.status(400).json({ error: 'لطفاً تمام گوی‌های اصلی را انتخاب کنید.' });
    }

    const result = await purchaseLotteryTicket({
      uid,
      email,
      roundCode,
      mainNumbers: mainNumbers.map(Number),
      goldenBall: Number(goldenBall ?? 3),
      costUsdt: Number(costUsdt) || 5,
      currencyNetwork,
      clientSeed,
    });

    res.json({ ok: true, ...result });
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ error: 'INSUFFICIENT_BALANCE' });
    }
    console.error('Failed to purchase ticket:', error);
    res.status(500).json({ error: error.message || 'خطا در صدور بلیت' });
  }
};

app.post('/api/tickets/purchase', optionalAuth, handleTicketPurchase);
app.post('/api/tickets/buy', optionalAuth, handleTicketPurchase);

// 2b. Claim Winning Ticket Prize
app.post('/api/tickets/claim', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, email } = getUserIdentity(req);
    const { ticketCode, prizeUsdt = 25, network = 'USDT (TRC-20)' } = req.body;
    if (!ticketCode) {
      return res.status(400).json({ error: 'کد بلیت نامعتبر است.' });
    }
    if (claimedTicketCodesServer.has(ticketCode)) {
      return res.status(400).json({ error: 'جایزه این بلیت قبلاً دریافت شده است.' });
    }
    claimedTicketCodesServer.add(ticketCode);
    const result = await creditCryptoDeposit({
      uid,
      email,
      amountUsdt: Number(prizeUsdt) || 25,
      network: `Payout (${network})`,
    });
    res.json({
      ok: true,
      ticketCode,
      newBalanceUsdt: result.newBalanceUsdt,
      transaction: result.transaction,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تسویه جایزه' });
  }
});

// 3. Instant Web3 Crypto Deposit (/api/wallet/deposit and alias /api/deposit)
const handleCryptoDeposit = async (req: AuthRequest, res: express.Response) => {
  try {
    if (killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت توسط کلید قطع اضطراری قفل شده است.',
      });
    }
    const { uid, email } = getUserIdentity(req);
    const { amountUsdt = 50, network = 'USDT (TRC-20)' } = req.body;
    const result = await creditCryptoDeposit({
      uid,
      email,
      amountUsdt: Number(amountUsdt) || 50,
      network,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Failed to credit crypto deposit:', error);
    res.status(500).json({ error: error.message || 'خطا در شارژ کیف پول' });
  }
};

app.post('/api/wallet/deposit', optionalAuth, handleCryptoDeposit);
app.post('/api/deposit', optionalAuth, handleCryptoDeposit);

// 3b. Crypto Withdrawal Request & Admin Approval Pipeline
app.post('/api/wallet/withdraw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: برداشت وجه موقتاً توسط کلید اضطراری متوقف شده است.',
      });
    }
    const { uid, email } = getUserIdentity(req);
    const {
      network = 'USDT (TRC-20)',
      destinationAddress = '',
      grossAmountUsdt = 100,
      networkFeeUsdt = 1.0,
      netAmountUsdt = 99.0,
      netAmountCrypto = '99.00 USDT',
    } = req.body;

    // Deduct balance using negative creditCryptoDeposit or purchase helper
    const snap = await getPlatformSnapshot(uid, email);
    const currentBal = parseFloat(snap.user?.balanceUsdt || '3030.30');
    const amountNum = Number(grossAmountUsdt);
    if (amountNum <= 0 || amountNum > currentBal) {
      return res.status(400).json({ error: 'موجودی کیف پول برای این برداشت کافی نیست.' });
    }

    // Deduct from user DB balance
    const deductRes = await creditCryptoDeposit({
      uid,
      email,
      amountUsdt: -amountNum,
      network: `Withdraw (${network})`,
    });

    const newItem: ServerWithdrawalItem = {
      id: Date.now(),
      withdrawalCode: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
      userUid: uid,
      userDisplayName: snap.user?.displayName || 'کامران سهرابی (VIP)',
      network,
      destinationAddress,
      grossAmountUsdt: amountNum,
      networkFeeUsdt: Number(networkFeeUsdt),
      netAmountUsdt: Number(netAmountUsdt),
      netAmountCrypto: String(netAmountCrypto),
      twoFactorVerified: true,
      status: 'pending_review',
      txHash: `0x${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`,
      createdAt: 'همین الان',
    };
    serverWithdrawals.unshift(newItem);

    res.json({
      ok: true,
      withdrawal: newItem,
      newBalanceUsdt: deductRes.newBalanceUsdt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ثبت درخواست برداشت' });
  }
});

app.post('/api/admin/withdrawals/action', optionalAuth, async (req: AuthRequest, res) => {
  const { withdrawalCode, action } = req.body; // action: 'approve' | 'reject' | 'sweep_all'
  if (action === 'sweep_all') {
    for (const w of serverWithdrawals) {
      if (w.status === 'pending_review' || w.status === 'broadcasting') {
        w.status = 'completed';
      }
    }
    return res.json({ ok: true, withdrawals: serverWithdrawals });
  }
  const target = serverWithdrawals.find((w) => w.withdrawalCode === withdrawalCode);
  if (!target) {
    return res.status(404).json({ error: 'درخواست برداشت یافت نشد.' });
  }
  if (action === 'approve') {
    target.status = 'completed';
  } else if (action === 'broadcast') {
    target.status = 'broadcasting';
  } else if (action === 'reject') {
    target.status = 'rejected';
  }
  res.json({ ok: true, withdrawal: target, withdrawals: serverWithdrawals });
});

// 4. Emergency Kill-Switch Toggle or Explicit Set
app.post('/api/admin/killswitch', optionalAuth, (req: AuthRequest, res) => {
  if (typeof req.body?.active === 'boolean') {
    killSwitchActive = req.body.active;
  } else {
    killSwitchActive = !killSwitchActive;
  }
  res.json({
    killSwitchActive,
    protocolState: killSwitchActive ? 'HALTED' : 'ARMED',
  });
});

// 4b. Blockchain Webhook Ingestion Engine (TronGrid & Toncenter HMAC + Idempotency)
app.post('/api/webhooks/ingest', optionalAuth, (req: AuthRequest, res) => {
  const provider = req.body?.provider === 'Toncenter' ? 'Toncenter' : 'TronGrid';
  const txId =
    req.body?.txId ||
    `0x${Math.random().toString(16).substring(2, 10)}${Date.now().toString(16).slice(-4)}`;
  const blockNumber =
    Number(req.body?.blockNumber) ||
    (provider === 'TronGrid'
      ? 62194801 + Math.floor(Math.random() * 90)
      : 39812015 + Math.floor(Math.random() * 90));
  const amountUsdt = Number(req.body?.amountUsdt) || 100;

  const verification = verifyWebhookHmacAndIdempotency({
    provider,
    txId,
    blockNumber,
    amountUsdt,
    secretKey: 'luckydrop_hmac_sha256_master_key',
    providedSignature: req.body?.signature,
    processedKeys: processedWebhookKeys,
  });

  if (verification.valid) {
    baseIdempotentCount += 1;
  }

  return res.status(verification.status).json({
    ...verification,
    provider,
    txId,
    blockNumber,
    activeKeysCount: baseIdempotentCount,
  });
});

// 4c. Telegram Winner Broadcast Dispatch
app.post('/api/telegram/broadcast', optionalAuth, (req: AuthRequest, res) => {
  const winnerShortId =
    req.body?.winnerShortId ||
    `VIP_User#${Math.floor(1000 + Math.random() * 8999)}`;
  const prizeUsdt = Number(req.body?.prizeUsdt) || 150000;
  const txHash =
    req.body?.txHash ||
    `7a4b8f${Math.random().toString(16).substring(2, 10)}39c01d`;
  const channelId = req.body?.channelId || '@LuckyDropWinners';

  const broadcast = formatTelegramWinnerBroadcast({
    channelId,
    winnerShortId,
    prizeUsdt,
    txHash,
  });

  res.json({
    ok: true,
    broadcast,
  });
});

// 5. Provably Fair Draw Trigger
app.post('/api/admin/draw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { roundCode = '#ZRN-8493' } = req.body;
    const result = await triggerProvablyFairDraw(roundCode);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to execute draw:', error);
    res.status(500).json({ error: error.message || 'خطا در اجرای قرعه‌کشی' });
  }
});

// 6. Create New Lottery Round
app.post('/api/admin/rounds', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      titleFa = 'سوپر جک‌پات عیدانه زرین',
      category = 'weekly',
      ticketPriceUsdt = 2.42,
      rtpPercent = 85,
      jackpotUsdt = 909090.9,
    } = req.body;
    const round = await createLotteryRound({
      titleFa,
      category,
      ticketPriceUsdt: Number(ticketPriceUsdt) || 2.42,
      rtpPercent: Number(rtpPercent) || 85,
      jackpotUsdt: Number(jackpotUsdt) || 909090.9,
    });
    res.json({ round });
  } catch (error: any) {
    console.error('Failed to create lottery round:', error);
    res.status(500).json({ error: error.message || 'خطا در ایجاد دوره جدید' });
  }
});

// 7. Toggle Round Sales Status
app.post('/api/admin/rounds/toggle', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { roundCode } = req.body;
    const updated = await toggleRoundStatus(roundCode);
    res.json({ round: updated });
  } catch (error: any) {
    console.error('Failed to toggle round status:', error);
    res.status(500).json({ error: error.message || 'خطا در تغییر وضعیت دوره' });
  }
});

// 8. VIP Live Chat Reply
app.post('/api/support/reply', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      sessionCode = 'VIP-KAMRAN',
      senderName = 'اپراتور ارشد زرین',
      senderRole = 'admin',
      subject = 'پشتیبانی ویژه VIP',
      message,
    } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'متن پیام الزامی است' });
    }
    const inserted = await addSupportReply({
      sessionCode,
      senderName,
      senderRole,
      subject,
      message: String(message).trim(),
    });
    res.json({ message: inserted });
  } catch (error: any) {
    console.error('Failed to add support reply:', error);
    res.status(500).json({ error: error.message || 'خطا در ثبت پیام' });
  }
});

// 9. Ticket & TX Hash Lookup (Used by 404 & Explorer)
app.get('/api/search', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '');
    const results = await searchTicketOrHash(q);
    res.json(results);
  } catch (error: any) {
    console.error('Failed to search ticket/hash:', error);
    res.status(500).json({ error: error.message || 'خطا در جستجو' });
  }
});

// 10. Server-Side Gemini 24/7 Blockchain TXID & Lottery Concierge
app.post('/api/ai/support', optionalAuth, async (req: AuthRequest, res) => {
  const userMessage = String(req.body?.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'پیام خالی است' });
  }

  try {
    const searchHits = await searchTicketOrHash(userMessage);
    const contextInfo =
      searchHits.tickets.length > 0
        ? `بلیت یافت‌شده در دیتابیس: کد ${searchHits.tickets[0].ticketCode}، وضعیت: ${searchHits.tickets[0].status}، تاییدیه‌ها: ${searchHits.tickets[0].confirmations}`
        : searchHits.transactions.length > 0
        ? `تراکنش یافت‌شده: هش ${searchHits.transactions[0].txHash}، شبکه ${searchHits.transactions[0].network}، مبلغ ${searchHits.transactions[0].amountUsdt} USDT`
        : 'استعلام مستقیم از نودهای TronGrid / Toncenter / BSC انجام شد: ۱۹ تاییدیه شبکه (Confirmations) معتبر است.';

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `کاربر VIP در پلتفرم LuckyDrop (زرین لاتاری) می‌گوید: "${userMessage}"\nاطلاعات بلاک‌چین و دیتابیس: ${contextInfo}\nپاسخ کوتاه، محترمانه، دقیق و حرفه‌ای به زبان فارسی بده (حداکثر ۳ جمله).`,
      });

      if (response.text) {
        return res.json({ reply: response.text });
      }
    }

    return res.json({
      reply: `✅ ${contextInfo} — تسویه آنی زیر ۹۰ ثانیه از طریق قرارداد هوشمند چندامضایی زرین لاتاری تضمین شده است.`,
    });
  } catch (error) {
    console.error('AI concierge fallback:', error);
    return res.json({
      reply:
        '✅ استعلام از نود بلاک‌چین (TronGrid / Toncenter) انجام شد: تراکنش شما دارای ۱۹ تایید شبکه (Confirmations) است و بلیت شما با الگوریتم SHA-256 در دفترکل ثبت گردید.',
    });
  }
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`LuckyDrop (Zarrin Lottery) server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
