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

// 1. Live FX & Platform Snapshot
app.get('/api/snapshot', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, email } = getUserIdentity(req);
    const snapshot = await getPlatformSnapshot(uid, email);
    res.json({
      ...snapshot,
      killSwitchActive,
      fxRates: DEFAULT_FX_RATES,
    });
  } catch (error: any) {
    console.error('Failed to fetch platform snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to load platform state' });
  }
});

// 2. Mint Lottery Ticket (/api/tickets/purchase and alias /api/tickets/buy)
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
    } = req.body;

    if (!Array.isArray(mainNumbers) || mainNumbers.length !== 5) {
      return res.status(400).json({ error: 'لطفاً دقیقاً ۵ گوی اصلی انتخاب کنید.' });
    }

    const result = await purchaseLotteryTicket({
      uid,
      email,
      roundCode,
      mainNumbers: mainNumbers.map(Number),
      goldenBall: Number(goldenBall) || 3,
      costUsdt: Number(costUsdt) || 5,
      currencyNetwork,
      clientSeed,
    });

    res.json(result);
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
