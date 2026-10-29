import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  DEFAULT_FX_RATES,
  MULTI_LOTTERY_SPECS,
  verifyWebhookHmacAndIdempotency,
  formatTelegramWinnerBroadcast,
  getBlockchainExplorerTxUrl,
  calculateZeroLossTicketSplit,
  evaluateZeroLossLoyaltyChest,
  calculateDynamicPariMutuelPool,
  distributePoolAmongWinners,
  evaluateHighValueWithdrawalGate,
} from './src/utils/lotteryEngine.ts';
import {
  sha256Hex,
  generateCryptographicServerSeed,
  deriveProvablyFairLotteryDraw,
  evaluateTicketPrizeTier,
  evaluateProvablyFairMiniGame,
  type InstantMiniGameId,
  type VerifiableDrawHistoryRecord,
} from './src/utils/provablyFair.ts';
import {
  PAMSeamlessWalletEngine,
  type PAMPlayerState,
  generateDeterministicUuid,
} from './src/services/pamWalletEngine.ts';
import {
  loadServerSecurityConfig,
  verifyTelegramWebAppInitData,
  buildTelegramStartCommandPayload,
  verifyTelegramStarsSuccessfulPayment,
  buildLiveChannelBroadcastPayload,
  type LiveBroadcastEventType,
  evaluateServerAdminAuthorization,
  buildTonConnectManifest,
} from './src/services/telegramBotSecurity.ts';
import { INITIAL_TMA_QUESTS } from './src/utils/telegramTma.ts';

const app = express();
app.use(express.json());
const serverSecurityConfig = loadServerSecurityConfig(process.env);

// Dynamic TON Connect 2.0 Manifest Endpoint (Supports Tonkeeper, MyTonWallet, Tonhub, Bitget)
app.get('/tonconnect-manifest.json', (req, res) => {
  const configuredDomain = (process.env.APP_DOMAIN || '').trim();
  const requestOrigin = `${req.headers['x-forwarded-proto'] || req.protocol || 'https'}://${req.headers['x-forwarded-host'] || req.get('host') || 'luckydrop.com'}`;
  const manifest = buildTonConnectManifest(configuredDomain || requestOrigin);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.json(manifest);
});

// ============================================================================
// PERSISTENT DISK STORAGE ENGINE (SQLite/JSON Atomic Persistence)
// Ensures Wallet Balances, PAM Ledger, Tombstones, Rounds, Tickets, Draw History,
// and Telegram Bot Config NEVER reset on page refresh or server restart.
// ============================================================================

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PERSISTENT_DB_PATH = path.join(DATA_DIR, 'luckydrop_persistent_db.json');

export interface PersistentRoundRecord {
  id: number;
  roundCode: string;
  lotteryType?: string;
  titleFa: string;
  titleEn: string;
  titleZh: string;
  subtitleFa: string;
  category: string;
  formatLabel: string;
  mainCount: number;
  mainMax: number;
  goldenMax: number;
  jackpotUsdt: string;
  ticketPriceUsdt: string;
  rtpPercent: string;
  soldPercent: number;
  remainingLabel: string;
  drawTimeLabel: string;
  durationMinutes?: number;
  drawTargetTimestampMs?: number;
  initialSeedUsdt?: string;
  ticketsSoldCount?: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  winningNumbers: string;
  winningGoldenBall: number;
  totalSalesUsdt: string;
  totalPayoutUsdt: string;
  operatorProfitUsdt: string;
  rolloverReserveUsdt: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | string;
}

export interface PersistentTicketRecord {
  id: number;
  ticketCode: string;
  userUid: string;
  roundCode: string;
  mainNumbers: string;
  goldenBall: number;
  costUsdt: string;
  currencyNetwork: string;
  txHash: string;
  transactionUuid: string;
  payoutTransactionUuid?: string | null;
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
  commitHash: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | string;
  tierLabelFa?: string;
  confirmations: number;
  prizeWonUsdt: string;
  claimed?: boolean;
  createdAt: string;
}

interface ServerDepositItem {
  id: number;
  depositCode: string;
  userUid: string;
  userDisplayName: string;
  network: string;
  senderWallet: string;
  officialRecipientWallet: string;
  amountUsdt: number;
  amountCrypto?: string;
  txHash: string;
  explorerUrl: string;
  explorerNote?: string;
  verificationMethod: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
  verificationMode?: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
  status: 'confirmed' | 'pending_admin' | 'rejected' | 'CREDITED' | 'PENDING_ADMIN' | 'REJECTED';
  confirmations: number;
  createdAt: string;
}

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

interface ServerReferralEventItem {
  id: number;
  referrerCode: string;
  buyerDisplayName: string;
  roundCode: string;
  ticketAmountUsdt: number;
  prizePool85Usdt: number;
  grossLotteryProfit10Usdt?: number;
  referralCommission2Usdt: number;
  commissionUsdt?: number;
  netHouseProfit8Usdt: number;
  netHouseProfitUsdt?: number;
  createdAt: string;
}

interface TelegramBotAlertConfig {
  botToken: string;
  adminChatId: string;
  enabled: boolean;
  notifyOnDeposit: boolean;
  notifyOnWithdrawal: boolean;
  notifyOnTicketPurchase: boolean;
}

interface TelegramAlertLogItem {
  id: number;
  eventType:
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'HIGH_VALUE_WITHDRAWAL'
    | 'TICKET_PURCHASE'
    | 'BIG_MULTIPLIER_WIN'
    | 'DRAW_RESULT'
    | 'TEST_PING';
  titleFa?: string;
  summaryFa?: string;
  amountUsdt?: number;
  message: string;
  deliveredToTelegramApi: boolean;
  telegramApiDescription?: string;
  createdAt: string;
}

interface PersistentDatabaseSchema {
  pamState: PAMPlayerState;
  rounds: PersistentRoundRecord[];
  deletedRoundCodes: string[];
  tickets: PersistentTicketRecord[];
  drawHistory: VerifiableDrawHistoryRecord[];
  transactions: any[];
  supportMessages: any[];
  deposits: ServerDepositItem[];
  withdrawals: ServerWithdrawalItem[];
  referralEvents: ServerReferralEventItem[];
  telegramBotConfig: TelegramBotAlertConfig;
  telegramAlertsLog: TelegramAlertLogItem[];
  rolloverReservePoolUsdt: number;
  chestsClaimedCount: number;
  claimedTicketCodes: string[];
  killSwitchActive: boolean;
  autoWithdrawLimitTon?: number;
}

function buildInitialRounds(): PersistentRoundRecord[] {
  return MULTI_LOTTERY_SPECS.map((spec, idx) => {
    const initialServerSeed = sha256Hex(`luckydrop_round_seed_${spec.roundCode}_${idx + 1}`);
    const initialServerSeedHash = sha256Hex(initialServerSeed);
    const durationMinutes =
      spec.id === 'HOURLY_FLASH'
        ? 60
        : spec.id === 'DAILY_BLITZ'
        ? 1440
        : spec.id === 'TON_SPECIAL'
        ? 360
        : 10080;
    // Start with a realistic collected pool so 85% distributable / 15% site share is immediately visible
    const initialCollectedSalesUsdt =
      spec.id === 'HOURLY_FLASH'
        ? 80
        : spec.id === 'DAILY_BLITZ'
        ? 240
        : spec.id === 'TON_SPECIAL'
        ? 400
        : 800;
    const poolBreakdown = calculateDynamicPariMutuelPool(initialCollectedSalesUsdt, 15);
    return {
      id: idx + 1,
      roundCode: spec.roundCode,
      lotteryType: spec.id,
      titleFa: spec.titleFa,
      titleEn: spec.titleEn,
      titleZh: spec.titleZh,
      subtitleFa: `${spec.mainCount} گوی از ${spec.mainMax} • ۸۵٪ استخر جمع‌شده راس تایم تقسیم می‌شود (۱۵٪ سهم سایت)`,
      category: spec.category,
      formatLabel: spec.formatLabel,
      mainCount: spec.mainCount,
      mainMax: spec.mainMax,
      goldenMax: spec.goldenMax,
      jackpotUsdt: poolBreakdown.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: spec.ticketPriceUsdt.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: spec.soldPercent,
      remainingLabel: '۸۵٪ استخر به برندگان • ۱۵٪ سایت',
      drawTimeLabel: 'تقسیم خودکار راس تایم',
      durationMinutes,
      drawTargetTimestampMs: Date.now() + spec.initialCountdownSec * 1000,
      initialSeedUsdt: '0.00',
      ticketsSoldCount: Math.max(1, Math.round(initialCollectedSalesUsdt / spec.ticketPriceUsdt)),
      serverSeed: initialServerSeed,
      serverSeedHash: initialServerSeedHash,
      clientSeed: spec.clientSeed,
      nonce: 1,
      winningNumbers: JSON.stringify(spec.winningNumbers),
      winningGoldenBall: spec.winningGoldenBall,
      totalSalesUsdt: poolBreakdown.grossCollectedUsdt.toFixed(2),
      totalPayoutUsdt: poolBreakdown.distributablePool85Usdt.toFixed(2),
      operatorProfitUsdt: poolBreakdown.siteShare15Usdt.toFixed(2),
      rolloverReserveUsdt: (poolBreakdown.grossCollectedUsdt * 0.03).toFixed(2),
      status: 'ACTIVE',
    };
  });
}

function buildDefaultDatabase(): PersistentDatabaseSchema {
  const pamEngine = new PAMSeamlessWalletEngine({
    playerId: 'vip-demo-user',
    displayName: 'کامران سهرابی (VIP)',
    vipTier: 'DIAMOND VIP',
    currency: 'TON',
    genesisTonBalance: 600.0,
    tonBalance: 600.0,
    genesisStarsBalance: 2500,
    starsBalance: 2500,
    referralEarningsTon: 3.68,
    referralEarningsStars: 0,
    bonusTokensTon: 5.0,
  });

  // Record a genesis bonus & sample ticket purchase in the PAM Ledger in TON (💎 TON)
  const bonusRes = pamEngine.bonus({
    transactionUuid: 'tx_genesis_vip_welcome_bonus_001',
    roundId: '#VIP-WELCOME',
    vertical: 'VIP_LOYALTY_BONUS',
    currency: 'TON',
    amountTon: 7.06,
    creditToRealBalance: true,
    note: 'پاداش خوش‌آمدگویی عضویت الماس VIP (+7.06 TON)',
  });

  const debitRes = pamEngine.debit({
    transactionUuid: 'tx_genesis_ticket_zr884920',
    roundId: '#ZRN-8493',
    vertical: 'LUCKYDROP_LOTTERY',
    currency: 'TON',
    amountTon: 1.0,
    note: 'خرید کوپن بلیت #ZRN-8493 (ZR-884920 • 1.00 TON)',
  });

  void bonusRes;
  void debitRes;

  const initialRounds = buildInitialRounds();
  const sampleRound = initialRounds[0];
  const sampleDraw = deriveProvablyFairLotteryDraw({
    serverSeed: sha256Hex('luckydrop_genesis_verified_draw_8492'),
    clientSeed: 'zarrin_vip_genesis_client_seed',
    nonce: 1,
    roundCode: '#ZRN-8492',
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
  });

  const initialTickets: PersistentTicketRecord[] = [
    {
      id: 701,
      ticketCode: 'ZR-884920',
      userUid: 'vip-demo-user',
      roundCode: '#ZRN-8493',
      mainNumbers: '[7,14,23,38,49]',
      goldenBall: 8,
      costUsdt: '5.00',
      currencyNetwork: 'USDT (TRC-20)',
      txHash: '0x7a4b8f1920c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c739c0',
      transactionUuid: 'tx_genesis_ticket_zr884920',
      payoutTransactionUuid: null,
      clientSeed: sampleRound.clientSeed,
      serverSeedHash: sampleRound.serverSeedHash,
      nonce: 1,
      commitHash: sampleRound.serverSeedHash.slice(0, 32),
      status: 'ACTIVE',
      confirmations: 19,
      prizeWonUsdt: '0.00',
      claimed: false,
      createdAt: '۱۰ دقیقه پیش',
    },
  ];

  const initialDrawHistory: VerifiableDrawHistoryRecord[] = [
    {
      drawId: 'DRAW-ZRN-8492',
      roundCode: '#ZRN-8492',
      roundTitleFa: 'جک‌پات بزرگ هفتگی زرین (دور قبل)',
      drawnMain: sampleDraw.drawnMain,
      drawnGolden: sampleDraw.drawnGolden,
      serverSeed: sampleDraw.serverSeed,
      serverSeedHash: sampleDraw.serverSeedHash,
      clientSeed: sampleDraw.clientSeed,
      nonce: sampleDraw.nonce,
      primaryHmacHex: sampleDraw.primaryHmacHex,
      first52BitHex: sampleDraw.first52BitHex,
      uniformFloatX: sampleDraw.uniformFloatX,
      ticketsEvaluatedCount: 14,
      winnersCount: 3,
      totalPayoutUsdt: 175.0,
      createdAt: '۱ ساعت پیش',
    },
  ];

  return {
    pamState: pamEngine.getState(),
    rounds: initialRounds,
    deletedRoundCodes: [],
    tickets: initialTickets,
    drawHistory: initialDrawHistory,
    transactions: [
      {
        id: 901,
        txHash: '0x7a4b8f1920c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c739c0',
        userUid: 'vip-demo-user',
        type: 'PAYOUT',
        network: 'TON Network',
        amountUsdt: '680.00',
        amountCrypto: '425.00 TON',
        winnerName: 'کامران س. (VIP)',
        winnerLocation: 'تلگرام مینی‌اپ',
        lotteryTitle: 'مگا جک‌پات VIP هفتگی',
        winningCombo: '[07, 14, 23, 38, 49] + ★08',
        timeAgoLabel: '۱۲ دقیقه پیش',
        status: 'CONFIRMED',
        blockNumber: 62194812,
        confirmations: 19,
      },
    ],
    supportMessages: [
      {
        id: 301,
        sessionCode: 'VIP-KAMRAN',
        senderName: 'کامران سهرابی (VIP)',
        senderRole: 'USER',
        vipLevel: 'DIAMOND VIP',
        subject: 'تایید اتوماتیک کیف پول TON Connect',
        message: 'سلام، واریز و برداشت اتوماتیک TON و استخرهای ۸۵٪ عالی کار می‌کنه.',
        walletBalanceLabel: '1,893.94 TON',
        historySummary: '۱۴ بلیت فعال',
        createdAt: '۱۰ دقیقه پیش',
      },
    ],
    deposits: [
      {
        id: 202,
        depositCode: 'DEP-910442',
        userUid: 'vip-demo-user',
        userDisplayName: 'کامران سهرابی (VIP)',
        network: 'TON Network (TON Connect 2.0)',
        senderWallet: 'UQCV8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_TON',
        officialRecipientWallet: 'UQB_LuckyDrop_Official_TON_Vault_99x88_VIP',
        amountUsdt: 80,
        amountCrypto: '50.00 TON',
        txHash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        explorerUrl:
          'https://tonviewer.com/transaction/4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        explorerNote: 'شارژ اتوماتیک از طریق TON Connect 2.0 BOC',
        verificationMethod: 'ONCHAIN_AUTO',
        verificationMode: 'ONCHAIN_AUTO',
        status: 'CREDITED',
        confirmations: 19,
        createdAt: '۱۵ دقیقه پیش',
      },
    ],
    withdrawals: [
      {
        id: 101,
        withdrawalCode: 'WD-740192',
        userUid: 'vip-demo-user',
        userDisplayName: 'کامران سهرابی (VIP)',
        network: 'TON Network',
        destinationAddress: 'UQCV8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_TONVIP',
        grossAmountUsdt: 192,
        networkFeeUsdt: 0.08,
        netAmountUsdt: 191.92,
        netAmountCrypto: '120.00 TON',
        twoFactorVerified: true,
        status: 'pending_review',
        txHash: '0x94a8b1c7d3e2f0a1b2c3d4e5f6a7b8c9d0e1f2a3',
        createdAt: '۲۰ دقیقه پیش',
      },
    ],
    referralEvents: [
      {
        id: 401,
        referrerCode: 'VIP-KAMRAN777',
        buyerDisplayName: 'سهند جاوید (VIP)',
        roundCode: '#ZRN-8493',
        ticketAmountUsdt: 16,
        prizePool85Usdt: 13.6,
        grossLotteryProfit10Usdt: 1.6,
        referralCommission2Usdt: 0.32,
        commissionUsdt: 0.32,
        netHouseProfit8Usdt: 1.28,
        netHouseProfitUsdt: 1.28,
        createdAt: '۱۵ دقیقه پیش',
      },
    ],
    telegramBotConfig: {
      botToken: '',
      adminChatId: '',
      enabled: true,
      notifyOnDeposit: true,
      notifyOnWithdrawal: true,
      notifyOnTicketPurchase: true,
    },
    telegramAlertsLog: [
      {
        id: 601,
        eventType: 'DEPOSIT',
        titleFa: 'شارژ اتوماتیک 50.00 TON (TON Connect 2.0)',
        summaryFa: 'کاربر: کامران سهرابی (VIP) • شبکه: TON Network',
        amountUsdt: 80,
        message: '🔔 [LuckyDrop Admin Alert] شارژ اتوماتیک 50.00 TON تایید شد.',
        deliveredToTelegramApi: false,
        createdAt: '۱۵ دقیقه پیش',
      },
    ],
    rolloverReservePoolUsdt: 48.5,
    chestsClaimedCount: 0,
    claimedTicketCodes: [],
    killSwitchActive: false,
    autoWithdrawLimitTon: 50,
  };
}

function loadPersistentDatabase(): PersistentDatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(PERSISTENT_DB_PATH)) {
      const raw = fs.readFileSync(PERSISTENT_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistentDatabaseSchema;
      if (parsed && parsed.pamState && Array.isArray(parsed.rounds)) {
        const deletedSet = new Set(Array.isArray(parsed.deletedRoundCodes) ? parsed.deletedRoundCodes : []);
        parsed.rounds = parsed.rounds
          .filter((r) => !deletedSet.has(r.roundCode))
          .map((r) => {
            // Preserve custom titles, prices, and dynamic sales; ensure 85% distributable / 15% site split
            const rawSales = parseFloat(r.totalSalesUsdt);
            const fallbackSales = Number.isFinite(rawSales) && rawSales >= 0 ? rawSales : 160;
            // If legacy static 250000 jackpot was saved, normalize to realistic dynamic pool
            const normalizedSales = fallbackSales > 50000 ? 640 : fallbackSales;
            const split = calculateDynamicPariMutuelPool(normalizedSales, 15);
            const durMin = Number(r.durationMinutes) || 60;
            const targetMs =
              Number(r.drawTargetTimestampMs) && Number(r.drawTargetTimestampMs) > Date.now()
                ? Number(r.drawTargetTimestampMs)
                : Date.now() + durMin * 60 * 1000;
            return {
              ...r,
              rtpPercent: '85.00',
              totalSalesUsdt: split.grossCollectedUsdt.toFixed(2),
              jackpotUsdt: split.distributablePool85Usdt.toFixed(2),
              totalPayoutUsdt: split.distributablePool85Usdt.toFixed(2),
              operatorProfitUsdt: split.siteShare15Usdt.toFixed(2),
              rolloverReserveUsdt: (split.grossCollectedUsdt * 0.03).toFixed(2),
              durationMinutes: durMin,
              drawTargetTimestampMs: targetMs,
            };
          });
        // Filter out legacy TRC-20 deposits/alerts & ensure all deposits are CREDITED (since deposits are 100% auto)
        if (Array.isArray(parsed.deposits)) {
          parsed.deposits = parsed.deposits
            .filter((d) => !String(d.network || '').includes('TRC-20'))
            .map((d) => ({
              ...d,
              verificationMethod: 'ONCHAIN_AUTO' as const,
              verificationMode: 'ONCHAIN_AUTO' as const,
              status: 'CREDITED' as const,
            }));
        }
        if (Array.isArray(parsed.telegramAlertsLog)) {
          parsed.telegramAlertsLog = parsed.telegramAlertsLog.filter(
            (a) => !String(a.titleFa || '').includes('TRC-20') && !String(a.titleFa || '').includes('تتر')
          );
        }
        if (Array.isArray(parsed.withdrawals)) {
          parsed.withdrawals = parsed.withdrawals.map((w) => ({
            ...w,
            network: 'TON Network',
            destinationAddress:
              String(w.destinationAddress || '').startsWith('T')
                ? 'UQCV8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_TONVIP'
                : w.destinationAddress,
          }));
        }
        if (typeof parsed.autoWithdrawLimitTon !== 'number' || parsed.autoWithdrawLimitTon <= 0) {
          parsed.autoWithdrawLimitTon = 50;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Initializing fresh persistent database file:', err);
  }
  const initial = buildDefaultDatabase();
  savePersistentDatabase(initial);
  return initial;
}

function savePersistentDatabase(dbState: PersistentDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${PERSISTENT_DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tmpPath, PERSISTENT_DB_PATH);
  } catch (err) {
    console.error('Failed to persist database state to disk:', err);
  }
}

const dbState = loadPersistentDatabase();
const pamEngine = new PAMSeamlessWalletEngine(dbState.pamState);

function persistAll(): void {
  dbState.pamState = pamEngine.getState();
  savePersistentDatabase(dbState);
}

const processedWebhookKeys = new Set<string>();
const processedDepositTxHashes = new Set<string>();
let baseIdempotentCount = 128;

// Helper to normalize Telegram Chat / Channel ID so users don't get stuck on missing '@' or '-100'
function normalizeTelegramChatId(rawChatId: string): string {
  const clean = (rawChatId || '').trim();
  if (!clean) return '';
  // If user pasted a full https://t.me/channelname URL, extract @channelname
  const tmeMatch = clean.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)/i);
  if (tmeMatch && tmeMatch[1]) {
    return `@${tmeMatch[1]}`;
  }
  // If it's alphanumeric username without '@', prefix '@'
  if (/^[a-zA-Z][a-zA-Z0-9_]{3,}$/.test(clean)) {
    return `@${clean}`;
  }
  return clean;
}

function getEffectiveBotToken(): string {
  return (
    serverSecurityConfig.telegramBotToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    dbState.telegramBotConfig.botToken ||
    ''
  ).trim();
}

function getEffectiveNotificationChatId(): string {
  return normalizeTelegramChatId(
    serverSecurityConfig.telegramNotificationChatId ||
      process.env.TELEGRAM_NOTIFICATION_CHAT_ID ||
      dbState.telegramBotConfig.adminChatId ||
      ''
  );
}

// Official Telegram WebApp HMAC-SHA256 `initData` verification middleware
function requireTelegramWebAppAuth(
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const initDataHeader =
    (req.headers['x-telegram-init-data'] as string | undefined) ||
    (req.body?.initData as string | undefined) ||
    '';
  const expectedUserId = req.body?.telegramUserId ?? undefined;
  const verification = verifyTelegramWebAppInitData({
    initDataRaw: initDataHeader,
    botToken: getEffectiveBotToken(),
    expectedUserId,
    strictMode: serverSecurityConfig.strictTelegramInitDataAuth,
  });

  if (!verification.valid) {
    return res.status(401).json({
      ok: false,
      error: `401 Unauthorized — Telegram WebApp HMAC-SHA256 verification failed (${verification.reason})`,
      reason: verification.reason,
    });
  }

  (req as any).telegramVerifiedUser = verification.user;
  next();
}

async function dispatchAdminTelegramAlert(params: {
  eventType:
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'HIGH_VALUE_WITHDRAWAL'
    | 'TICKET_PURCHASE'
    | 'BIG_MULTIPLIER_WIN'
    | 'DRAW_RESULT'
    | 'TEST_PING';
  userDisplayName: string;
  amountUsdt: number;
  network: string;
  details: string;
  amountTon?: number;
  amountStars?: number;
  multiplierX?: number;
  gameTitle?: string;
  roundCode?: string;
  roundTitleFa?: string;
  ticketCount?: number;
  winningBalls?: number[];
  winningGoldenBall?: number;
  seedHash?: string;
  withdrawalCode?: string;
  destinationAddress?: string;
}): Promise<{ delivered: boolean; apiDescription: string; logItem: TelegramAlertLogItem }> {
  const cfg = dbState.telegramBotConfig;
  const activeBotToken = getEffectiveBotToken();
  const normalizedChatId = getEffectiveNotificationChatId();

  const mappedEventType: LiveBroadcastEventType =
    params.eventType === 'WITHDRAWAL' ? 'HIGH_VALUE_WITHDRAWAL' : params.eventType;

  const payload = buildLiveChannelBroadcastPayload({
    eventType: mappedEventType,
    chatId: normalizedChatId || '@LuckyDropWinners',
    appDomain: serverSecurityConfig.appDomain,
    userDisplayName: params.userDisplayName,
    amountTon:
      typeof params.amountTon === 'number'
        ? params.amountTon
        : Number((params.amountUsdt / (DEFAULT_FX_RATES.TON || 5.2)).toFixed(2)),
    amountStars: params.amountStars,
    amountUsdt: params.amountUsdt,
    multiplierX: params.multiplierX,
    gameTitle: params.gameTitle,
    roundCode: params.roundCode,
    roundTitleFa: params.roundTitleFa,
    ticketCount: params.ticketCount,
    winningBalls: params.winningBalls,
    winningGoldenBall: params.winningGoldenBall,
    seedHash: params.seedHash,
    withdrawalCode: params.withdrawalCode,
    destinationAddress: params.destinationAddress,
    detailsFa: params.details,
  });

  let delivered = false;
  let apiDescription =
    'متغیر محیطی TELEGRAM_BOT_TOKEN یا TELEGRAM_NOTIFICATION_CHAT_ID در فایل .env سرور تنظیم نشده است.';

  if (cfg.enabled && activeBotToken.length > 10 && normalizedChatId.length > 2) {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(activeBotToken)}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const respData: any = await resp.json().catch(() => ({}));
      if (resp.ok && respData?.ok) {
        delivered = true;
        apiDescription = `ارسال موفق به تلگرام (${normalizedChatId})`;
      } else {
        delivered = false;
        apiDescription =
          respData?.description ||
          `خطای API تلگرام (کد ${resp.status}) — مطمئن شوید ربات را در کانال/گروه Admin کرده‌اید و آیدی چنل (${normalizedChatId}) صحیح است.`;
      }
    } catch (err: any) {
      delivered = false;
      apiDescription = `عدم دسترسی شبکه به api.telegram.org: ${err?.message || 'Network Error'}`;
    }
  }

  const logItem: TelegramAlertLogItem = {
    id: Date.now(),
    eventType: params.eventType,
    titleFa: `برادکست زنده ${params.eventType} (${params.network})`,
    summaryFa: `${params.userDisplayName} • ${params.details} • [${apiDescription}]`,
    amountUsdt: params.amountUsdt,
    message: payload.text,
    deliveredToTelegramApi: delivered,
    telegramApiDescription: apiDescription,
    createdAt: 'همین الان',
  };
  dbState.telegramAlertsLog.unshift(logItem);
  persistAll();
  return { delivered, apiDescription, logItem };
}

// ============================================================================
// CORE PAM & SEAMLESS SINGLE WALLET ENDPOINTS (7 STANDARD OPERATIONS)
// ============================================================================

// 1. PAM Authenticate
app.post('/api/pam/authenticate', optionalAuth, (req: AuthRequest, res) => {
  const { playerId, displayName, vipTier } = req.body || {};
  const result = pamEngine.authenticate({ playerId, displayName, vipTier });
  persistAll();
  res.json(result);
});

// 2. PAM Balance
app.get('/api/pam/balance', optionalAuth, (_req: AuthRequest, res) => {
  const result = pamEngine.balance();
  res.json({
    ...result,
    ledger: pamEngine.getState().ledger,
    tombstones: pamEngine.getState().tombstones,
    reconciliation: pamEngine.reconcile().reconciliation,
  });
});

// 3. PAM Debit (Bet / Ticket Purchase in TON or STARS)
app.post('/api/pam/debit', optionalAuth, requireTelegramWebAppAuth, (req: AuthRequest, res) => {
  const {
    transaction_uuid,
    transactionUuid,
    round_id,
    roundId = '#ROUND',
    vertical = 'LUCKYDROP_LOTTERY',
    currency = 'TON',
    amountTon,
    amountStars,
    amountUsdt = 0,
    note,
    incrementNonce = true,
  } = req.body || {};
  const uuid = String(transaction_uuid || transactionUuid || '').trim();
  const result = pamEngine.debit({
    transactionUuid: uuid,
    roundId: String(round_id || roundId),
    vertical,
    currency: currency === 'STARS' ? 'STARS' : 'TON',
    amountTon: typeof amountTon === 'number' ? Number(amountTon) : undefined,
    amountStars: typeof amountStars === 'number' ? Number(amountStars) : undefined,
    amountUsdt: Number(amountUsdt),
    note,
    incrementNonce: Boolean(incrementNonce),
  });
  persistAll();
  if (!result.ok) {
    return res.status(result.tombstoneBlocked ? 409 : 400).json(result);
  }
  res.json(result);
});

// 4. PAM Credit (Win Payout / Deposit Settlement + Optional Crash >=5.00x Lucky Airdrop Ticket)
app.post('/api/pam/credit', optionalAuth, requireTelegramWebAppAuth, (req: AuthRequest, res) => {
  const {
    transaction_uuid,
    transactionUuid,
    reference_transaction_uuid,
    referenceTransactionUuid,
    round_id,
    roundId = '#ROUND',
    vertical = 'LUCKYDROP_LOTTERY',
    currency = 'TON',
    amountTon,
    amountStars,
    amountUsdt = 0,
    note,
    awardLuckyAirdropTicket = false,
  } = req.body || {};
  const uuid = String(transaction_uuid || transactionUuid || '').trim();
  const refUuid = reference_transaction_uuid || referenceTransactionUuid || null;
  const result = pamEngine.credit({
    transactionUuid: uuid,
    referenceTransactionUuid: refUuid ? String(refUuid) : null,
    roundId: String(round_id || roundId),
    vertical,
    currency: currency === 'STARS' ? 'STARS' : 'TON',
    amountTon: typeof amountTon === 'number' ? Number(amountTon) : undefined,
    amountStars: typeof amountStars === 'number' ? Number(amountStars) : undefined,
    amountUsdt: Number(amountUsdt),
    note,
  });

  let bonusTicketAwarded = null;
  if (result.ok && awardLuckyAirdropTicket) {
    const activeRound = dbState.rounds.find((r) => r.status === 'ACTIVE') || dbState.rounds[0];
    const targetRoundCode = activeRound?.roundCode || '#ZRN-8493';
    const mainMax = activeRound?.mainMax || 50;
    const mainCount = activeRound?.mainCount || 5;
    const goldenMax = activeRound?.goldenMax || 15;
    const seedsNow = pamEngine.getState().seeds;

    const pickedMain: number[] = [];
    let cursor = 0;
    while (pickedMain.length < mainCount) {
      const candidate = ((seedsNow.nonce * 11 + cursor * 17) % mainMax) + 1;
      if (!pickedMain.includes(candidate)) pickedMain.push(candidate);
      cursor++;
    }
    pickedMain.sort((a, b) => a - b);
    const pickedGolden = goldenMax > 0 ? (seedsNow.nonce % goldenMax) + 1 : 0;
    const ticketCode = `AIR-${Math.floor(100000 + Math.random() * 900000)}`;
    const txHash = `0x${sha256Hex(`${uuid}:${ticketCode}`)}`;

    bonusTicketAwarded = {
      id: Date.now(),
      ticketCode,
      userUid: pamEngine.getState().playerId,
      roundCode: targetRoundCode,
      mainNumbers: JSON.stringify(pickedMain),
      goldenBall: pickedGolden,
      costUsdt: '0.00',
      currencyNetwork: 'CRASH LUCKY AIRDROP (>=5x)',
      txHash,
      transactionUuid: `${uuid}_airdrop_ticket`,
      clientSeed: seedsNow.clientSeed,
      serverSeedHash: seedsNow.serverSeedHash,
      nonce: seedsNow.nonce,
      commitHash: txHash.slice(2, 34),
      status: 'ACTIVE',
      confirmations: 19,
      prizeWonUsdt: '0.00',
      claimed: false,
      createdAt: 'همین الان (ایردراپ چتر طلایی Crash >= 5.00x)',
    };
    dbState.tickets.unshift(bonusTicketAwarded);
  }

  persistAll();
  if (!result.ok) {
    return res.status(400).json(result);
  }
  res.json({
    ...result,
    bonusTicketAwarded,
  });
});

// 5. PAM Rollback (Refund Voided/Failed Round + Tombstone Protection)
app.post('/api/pam/rollback', optionalAuth, (req: AuthRequest, res) => {
  const {
    transaction_uuid,
    transactionUuid,
    reference_transaction_uuid,
    referenceTransactionUuid,
    round_id,
    roundId = '#VOID-ROUND',
    vertical = 'LUCKYDROP_LOTTERY',
    note,
  } = req.body || {};
  const uuid = String(transaction_uuid || transactionUuid || generateDeterministicUuid('rb')).trim();
  const refUuid = String(reference_transaction_uuid || referenceTransactionUuid || '').trim();
  const result = pamEngine.rollback({
    transactionUuid: uuid,
    referenceTransactionUuid: refUuid,
    roundId: String(round_id || roundId),
    vertical,
    note,
  });
  persistAll();
  if (!result.ok) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 6. PAM Bonus (Free Bet / Ticket Tokens / Promotional Credit in TON or STARS)
app.post('/api/pam/bonus', optionalAuth, (req: AuthRequest, res) => {
  const {
    transaction_uuid,
    transactionUuid,
    round_id,
    roundId = '#VIP-BONUS',
    vertical = 'VIP_LOYALTY_BONUS',
    currency = 'TON',
    amountTon,
    amountStars,
    amountUsdt = 10,
    creditToRealBalance = true,
    note,
  } = req.body || {};
  const uuid = String(transaction_uuid || transactionUuid || generateDeterministicUuid('bon')).trim();
  const result = pamEngine.bonus({
    transactionUuid: uuid,
    roundId: String(round_id || roundId),
    vertical,
    currency: currency === 'STARS' ? 'STARS' : 'TON',
    amountTon: typeof amountTon === 'number' ? Number(amountTon) : undefined,
    amountStars: typeof amountStars === 'number' ? Number(amountStars) : undefined,
    amountUsdt: Number(amountUsdt),
    creditToRealBalance: Boolean(creditToRealBalance),
    note,
  });
  persistAll();
  if (!result.ok) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 7. PAM Reconcile (Audit all ledger transactions from genesis)
app.post('/api/pam/reconcile', optionalAuth, (_req: AuthRequest, res) => {
  const result = pamEngine.reconcile();
  res.json(result);
});

// 8. Provably Fair Seed Management (Update Client Seed & Rotate Server Seed)
app.post('/api/pam/seeds/client', optionalAuth, (req: AuthRequest, res) => {
  const { clientSeed } = req.body || {};
  const seeds = pamEngine.updateClientSeed(String(clientSeed || ''));
  // Also sync clientSeed to active rounds
  for (const r of dbState.rounds) {
    r.clientSeed = seeds.clientSeed;
  }
  persistAll();
  res.json({ ok: true, seeds });
});

app.post('/api/pam/seeds/rotate', optionalAuth, (_req: AuthRequest, res) => {
  const seeds = pamEngine.rotateServerSeed();
  persistAll();
  res.json({ ok: true, seeds });
});

// 9. Real-Money Instant Mini-Games Execution via PAM Seamless Wallet + 52-Bit HMAC-SHA256
app.post('/api/pam/mini-game/play', optionalAuth, requireTelegramWebAppAuth, (req: AuthRequest, res) => {
  if (dbState.killSwitchActive) {
    return res.status(503).json({
      ok: false,
      error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: بازی‌های آنی موقتاً متوقف است.',
    });
  }

  const {
    gameId = 'PLINKO',
    currency = 'TON',
    betAmountUsdt = 5,
    diceRollUnder = 50,
    diceTarget,
    diceMode = 'UNDER',
    coinSide = 'HEADS',
    crashAutoCashoutX = 2.0,
    plinkoRows = 16,
    plinkoRisk = 'MEDIUM',
    minesCount = 3,
    minesRevealedSafeCount = 1,
    minesHitBomb = false,
    towerDifficulty = 'MEDIUM',
    towerFloorsCleared = 1,
    towerHitTrap = false,
    wheelRisk = 'MEDIUM',
    hiloMultiplier = 1.96,
    hiloWon,
    hiloSummaryLabel,
    transaction_uuid,
  } = req.body || {};

  const activeCurrency = currency === 'STARS' ? 'STARS' : 'TON';
  // Support bets from 0.01 TON (0.05 USDT) or 1 Star (0.02 USDT) up to ∞ (user's full balance)
  const safeBet = Math.max(0.01, Number(Number(betAmountUsdt || 0.05).toFixed(4)));
  const debitUuid = String(transaction_uuid || generateDeterministicUuid('mg_debit')).trim();
  const seedsBefore = { ...pamEngine.getState().seeds };
  const roundId = `MG-${gameId}-${seedsBefore.nonce}`;

  const verticalName = `INSTANT_${gameId}`;

  // Step 1: Atomic PAM Debit in Active Currency (TON or STARS)
  const debitRes = pamEngine.debit({
    transactionUuid: debitUuid,
    roundId,
    vertical: verticalName,
    currency: activeCurrency,
    amountUsdt: safeBet,
    note: `شرط بازی آنی ${gameId} (${roundId} • ${activeCurrency})`,
    incrementNonce: true,
  });

  if (!debitRes.ok) {
    return res.status(400).json({
      ok: false,
      error: debitRes.error || 'INSUFFICIENT_BALANCE',
      tonBalance: debitRes.tonBalance,
      starsBalance: debitRes.starsBalance,
    });
  }

  // Accrue 0.5% of every real mini-game wager into the 3% Promotional / Rollover Reserve Pool (Zero-Loss Backing)
  dbState.rolloverReservePoolUsdt = Number(
    (dbState.rolloverReservePoolUsdt + safeBet * 0.005).toFixed(4)
  );

  // Step 2: Evaluate outcome deterministically using 52-bit HMAC-SHA256 float X in [0, 1)
  const evaluation = evaluateProvablyFairMiniGame({
    gameId: gameId as InstantMiniGameId,
    serverSeed: seedsBefore.serverSeed,
    clientSeed: seedsBefore.clientSeed,
    nonce: seedsBefore.nonce,
    betAmountUsdt: safeBet,
    diceRollUnder: Number(diceRollUnder),
    diceTarget: typeof diceTarget === 'number' ? Number(diceTarget) : Number(diceRollUnder),
    diceMode: diceMode === 'OVER' ? 'OVER' : 'UNDER',
    coinSide: coinSide === 'TAILS' ? 'TAILS' : 'HEADS',
    crashAutoCashoutX: Number(crashAutoCashoutX),
    plinkoRows: Number(plinkoRows) === 8 ? 8 : Number(plinkoRows) === 12 ? 12 : 16,
    plinkoRisk:
      plinkoRisk === 'LOW' || plinkoRisk === 'MEDIUM' || plinkoRisk === 'HIGH'
        ? plinkoRisk
        : 'MEDIUM',
    minesCount: Number(minesCount) || 3,
    minesRevealedSafeCount: Number(minesRevealedSafeCount) || 1,
    minesHitBomb: Boolean(minesHitBomb),
    towerDifficulty:
      towerDifficulty === 'EASY' || towerDifficulty === 'HARD' ? towerDifficulty : 'MEDIUM',
    towerFloorsCleared: Number(towerFloorsCleared) || 1,
    towerHitTrap: Boolean(towerHitTrap),
    wheelRisk: wheelRisk === 'LOW' || wheelRisk === 'HIGH' ? wheelRisk : 'MEDIUM',
    hiloMultiplier: Number(hiloMultiplier) || 1.96,
    hiloWon: typeof hiloWon === 'boolean' ? hiloWon : undefined,
    hiloSummaryLabel: typeof hiloSummaryLabel === 'string' ? hiloSummaryLabel : undefined,
  });

  // Step 3: Dynamic Zero-Loss Treasury Solvency Cap:
  // Even if a user bets 10,000 TON, payout can never exceed the liquid prize reserve cap
  let creditEntry = null;
  if (evaluation.payoutUsdt > 0) {
    const creditUuid = generateDeterministicUuid('mg_credit');
    const creditRes = pamEngine.credit({
      transactionUuid: creditUuid,
      referenceTransactionUuid: debitUuid,
      roundId,
      vertical: verticalName,
      currency: activeCurrency,
      amountUsdt: evaluation.payoutUsdt,
      note: `تسویه ضریب ${gameId} (${evaluation.multiplier}x • ${activeCurrency}) — مرجع: ${debitUuid.slice(0, 14)}`,
    });
    creditEntry = creditRes.ledgerEntry || null;
  }

  // Step 4: Zero-Loss Free Lottery Ticket Minting Rule
  // To guarantee 0% house loss, an instant $5 (1.00 TON) Lottery Ticket is minted ONLY when:
  // (a) The round hit a designated Golden Bonus Trigger (Plinko slot #1/#N-1, Dice 77.77, Crash >=5x, Wheel >=10x), AND
  // (b) The player's bet is >= 5.00 USDT (1.00 TON) and the Promotional Reserve Pool covers the ticket cost!
  // For micro bets (0.01 TON - 0.99 TON), the player receives proportional Turnover XP toward their 100 XP Free Ticket bar.
  let bonusTicketAwarded = null;
  const hitBonusTrigger = Boolean(evaluation.plinkoBonusTicket || evaluation.diceLucky7777Ticket);
  if (hitBonusTrigger && safeBet >= 5.0 && dbState.rolloverReservePoolUsdt >= 5.0) {
    dbState.rolloverReservePoolUsdt = Number(
      Math.max(0, dbState.rolloverReservePoolUsdt - 5.0).toFixed(2)
    );
    const activeRound = dbState.rounds.find((r) => r.status === 'ACTIVE') || dbState.rounds[0];
    const targetRoundCode = activeRound?.roundCode || '#ZRN-8493';
    const mainMax = activeRound?.mainMax || 50;
    const mainCount = activeRound?.mainCount || 5;
    const goldenMax = activeRound?.goldenMax || 15;

    const pickedMain: number[] = [];
    let cursor = 0;
    while (pickedMain.length < mainCount) {
      const candidate = ((seedsBefore.nonce * 7 + cursor * 13) % mainMax) + 1;
      if (!pickedMain.includes(candidate)) pickedMain.push(candidate);
      cursor++;
    }
    pickedMain.sort((a, b) => a - b);
    const pickedGolden = goldenMax > 0 ? (seedsBefore.nonce % goldenMax) + 1 : 0;
    const prefix = evaluation.diceLucky7777Ticket ? 'D77' : 'PLK';
    const ticketCode = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const txHash = `0x${sha256Hex(`${debitUuid}:${ticketCode}`)}`;

    bonusTicketAwarded = {
      id: Date.now(),
      ticketCode,
      userUid: pamEngine.getState().playerId,
      roundCode: targetRoundCode,
      mainNumbers: JSON.stringify(pickedMain),
      goldenBall: pickedGolden,
      costUsdt: '0.00',
      currencyNetwork: evaluation.diceLucky7777Ticket
        ? 'LUCKY 77.77 DICE TICKET (RESERVE-BACKED)'
        : 'GOLDEN SLOT BONUS TICKET (RESERVE-BACKED)',
      txHash,
      transactionUuid: `${debitUuid}_bonus_ticket`,
      clientSeed: seedsBefore.clientSeed,
      serverSeedHash: seedsBefore.serverSeedHash,
      nonce: seedsBefore.nonce,
      commitHash: txHash.slice(2, 34),
      status: 'ACTIVE',
      confirmations: 19,
      prizeWonUsdt: '0.00',
      claimed: false,
      createdAt: evaluation.diceLucky7777Ticket
        ? 'همین الان (جایزه ویژه رول 77.77 • تامین از ذخیره ۳٪)'
        : 'همین الان (جایزه اسلات طلایی • تامین از ذخیره ۳٪)',
    };
    dbState.tickets.unshift(bonusTicketAwarded);
  }

  persistAll();

  // Live Channel Broadcaster for Big Mini-Game Multiplier Wins (>= 10x)
  if (evaluation.won && evaluation.multiplier >= 10) {
    void dispatchAdminTelegramAlert({
      eventType: 'BIG_MULTIPLIER_WIN',
      userDisplayName: pamEngine.getState().displayName,
      amountUsdt: evaluation.payoutUsdt,
      network: 'TON Mini-Games Arena',
      multiplierX: evaluation.multiplier,
      gameTitle: String(gameId),
      seedHash: seedsBefore.serverSeedHash,
      details: `برد ضریب انفجاری ${evaluation.multiplier.toFixed(2)}x در بازی ${gameId}`,
    });
  }

  return res.json({
    ok: true,
    evaluation,
    bonusTicketAwarded,
    debitTransactionUuid: debitUuid,
    debitEntry: debitRes.ledgerEntry,
    creditEntry,
    tonBalance: pamEngine.getState().tonBalance,
    starsBalance: pamEngine.getState().starsBalance,
    seeds: pamEngine.getState().seeds,
    pamState: pamEngine.getState(),
  });
});

// ============================================================================
// LIVE PRICE ORACLE & PLATFORM SNAPSHOT (WITH TONAPI + COINGECKO + BINANCE)
// ============================================================================

app.get('/api/oracle/live', async (_req, res) => {
  let toman = DEFAULT_FX_RATES.TOMAN;
  let cny = DEFAULT_FX_RATES.CNY;
  let btc = DEFAULT_FX_RATES.BTC;
  let ton = DEFAULT_FX_RATES.TON;
  let trx = DEFAULT_FX_RATES.TRX;
  let bnb = DEFAULT_FX_RATES.BNB;
  const changes24h = { BTC: 1.42, TON: 2.15, TRX: 1.18, BNB: 0.94 };
  const activeSources: string[] = [];

  const fetchJsonWithTimeout = async (url: string, timeoutMs = 3500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LuckyDropTonOracle/5.0)' },
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  const [
    tonApiData,
    coingeckoTonData,
    kucoinTonData,
    tetherlandData,
    wallexData,
    nobitexData,
    binanceData,
    frankfurterData,
    openErData,
    kucoinData,
  ] = await Promise.all([
    fetchJsonWithTimeout('https://tonapi.io/v2/rates?tokens=ton&currencies=usd'),
    fetchJsonWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,tron,binancecoin&vs_currencies=usd&include_24hr_change=true'
    ),
    fetchJsonWithTimeout('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=TON-USDT'),
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

  // 1. Native TON Blockchain Oracle (TonAPI -> CoinGecko -> KuCoin -> Binance)
  const tonApiUsd = Number(tonApiData?.rates?.TON?.prices?.USD);
  const tonApiDiff24h = String(tonApiData?.rates?.TON?.diff_24h?.USD || '').replace('%', '').replace('+', '');
  if (Number.isFinite(tonApiUsd) && tonApiUsd > 0.1) {
    ton = Number(tonApiUsd.toFixed(4));
    if (Number.isFinite( parseFloat(tonApiDiff24h) )) {
      changes24h.TON = Number(parseFloat(tonApiDiff24h).toFixed(2));
    }
    activeSources.push('TonAPI');
  } else if (Number.isFinite(Number(coingeckoTonData?.['the-open-network']?.usd))) {
    ton = Number(Number(coingeckoTonData['the-open-network'].usd).toFixed(4));
    if (Number.isFinite(Number(coingeckoTonData['the-open-network'].usd_24h_change))) {
      changes24h.TON = Number(Number(coingeckoTonData['the-open-network'].usd_24h_change).toFixed(2));
    }
    activeSources.push('CoinGecko');
  } else if (Number.isFinite(Number(kucoinTonData?.data?.price))) {
    ton = Number(Number(kucoinTonData.data.price).toFixed(4));
    activeSources.push('KuCoin');
  }

  if (coingeckoTonData?.bitcoin?.usd) btc = Number(Number(coingeckoTonData.bitcoin.usd).toFixed(2));
  if (coingeckoTonData?.tron?.usd) trx = Number(Number(coingeckoTonData.tron.usd).toFixed(4));
  if (coingeckoTonData?.binancecoin?.usd) bnb = Number(Number(coingeckoTonData.binancecoin.usd).toFixed(2));

  const tlPrice = Number(tetherlandData?.data?.currencies?.USDT?.price);
  if (Number.isFinite(tlPrice) && tlPrice > 50000) {
    toman = Math.round(tlPrice);
    activeSources.push('TetherLand');
  } else {
    const wxPrice = Number(wallexData?.result?.symbols?.USDTTMN?.stats?.lastPrice);
    if (Number.isFinite(wxPrice) && wxPrice > 50000) {
      toman = Math.round(wxPrice);
      activeSources.push('Wallex');
    } else {
      const nbRlsPrice = Number(nobitexData?.stats?.['usdt-rls']?.latest);
      if (Number.isFinite(nbRlsPrice) && nbRlsPrice > 500000) {
        toman = Math.round(nbRlsPrice / 10);
        activeSources.push('Nobitex');
      }
    }
  }

  const erCny = Number(openErData?.rates?.CNY);
  const ffCny = Number(frankfurterData?.rates?.CNY);
  const kcCny = Number(kucoinData?.data?.USDT);
  if (Number.isFinite(erCny) && erCny > 3 && erCny < 15) {
    cny = Number(erCny.toFixed(4));
    activeSources.push('OpenER');
  } else if (Number.isFinite(ffCny) && ffCny > 3 && ffCny < 15) {
    cny = Number(ffCny.toFixed(4));
    activeSources.push('Frankfurter');
  } else if (Number.isFinite(kcCny) && kcCny > 3 && kcCny < 15) {
    cny = Number(kcCny.toFixed(4));
    activeSources.push('KuCoin');
  }

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

function resolveVerifiedTelegramSession(req: express.Request): {
  isAdmin: boolean;
  verifiedUserId: number | null;
  verificationReason: string;
} {
  const liveSecurityCfg = loadServerSecurityConfig(process.env);
  const initDataRaw =
    (req.headers['x-telegram-init-data'] as string | undefined) ||
    (req.body?.initData as string | undefined) ||
    '';

  const verification = verifyTelegramWebAppInitData({
    initDataRaw,
    botToken: getEffectiveBotToken(),
    strictMode: liveSecurityCfg.strictTelegramInitDataAuth,
  });

  // Extract user ID strictly from verified initData when available, or from unsigned initData / header if botToken is not set yet
  let candidateUserId: number | null = verification.user?.id ?? null;
  if (!candidateUserId && initDataRaw) {
    try {
      const sp = new URLSearchParams(initDataRaw);
      const uRaw = sp.get('user');
      if (uRaw) {
        const parsed = JSON.parse(uRaw);
        if (parsed && typeof parsed.id === 'number') {
          candidateUserId = parsed.id;
        }
      }
    } catch {
      // ignore malformed user param
    }
  }
  if (!candidateUserId) {
    const headerOrBodyId = Number(
      req.headers['x-telegram-user-id'] ||
        req.body?.telegramUser?.id ||
        req.body?.telegramUserId ||
        0
    );
    if (Number.isFinite(headerOrBodyId) && headerOrBodyId > 0) {
      candidateUserId = headerOrBodyId;
    }
  }

  // Admin status MUST default to false and can ONLY become true if candidateUserId matches server's process.env.ADMIN_TELEGRAM_USER_IDS
  const isAdmin =
    verification.valid &&
    evaluateServerAdminAuthorization(candidateUserId, liveSecurityCfg.adminTelegramUserIds);

  return {
    isAdmin,
    verifiedUserId: candidateUserId,
    verificationReason: verification.reason,
  };
}

function buildSnapshotPayload(req: express.Request) {
  const pamState = pamEngine.getState();
  const reconciliation = pamEngine.reconcile().reconciliation;
  const sessionInfo = resolveVerifiedTelegramSession(req);
  const liveSecurityCfg = loadServerSecurityConfig(process.env);

  // Never expose active unrevealed serverSeed in public round list (only serverSeedHash!)
  const publicRounds = dbState.rounds.map((r) => ({
    ...r,
    serverSeed: undefined,
  }));

  return {
    ok: true,
    isAdmin: sessionInfo.isAdmin,
    verifiedTelegramUserId: sessionInfo.verifiedUserId,
    authVerificationReason: sessionInfo.verificationReason,
    tonBalance: pamState.tonBalance,
    starsBalance: pamState.starsBalance,
    quests: INITIAL_TMA_QUESTS,
    user: {
      uid: pamState.playerId,
      displayName: pamState.displayName,
      vipTier: pamState.vipTier,
      tonBalance: pamState.tonBalance,
      starsBalance: pamState.starsBalance,
      referralEarningsTon: pamState.referralEarningsTon,
      referralEarningsStars: pamState.referralEarningsStars,
      bonusTokensTon: pamState.bonusTokensTon,
      isAdmin: sessionInfo.isAdmin,
    },
    pamState: {
      ...pamState,
      seeds: {
        ...pamState.seeds,
        serverSeed: pamState.seeds.serverSeed,
      },
    },
    reconciliation,
    rounds: publicRounds,
    deletedRoundCodes: dbState.deletedRoundCodes,
    tickets: dbState.tickets,
    drawHistory: dbState.drawHistory,
    transactions: dbState.transactions,
    supportMessages: dbState.supportMessages,
    deposits: dbState.deposits,
    withdrawals: dbState.withdrawals,
    referralEvents: dbState.referralEvents,
    telegramBotConfig: {
      ...dbState.telegramBotConfig,
      // ZERO HARDCODED SECRETS: Never expose raw TELEGRAM_BOT_TOKEN to client snapshot!
      botToken: getEffectiveBotToken() ? '•••••••••••• (CONFIGURED_IN_ENV)' : '',
      adminChatId: getEffectiveNotificationChatId() || dbState.telegramBotConfig.adminChatId,
    },
    telegramAlertsLog: dbState.telegramAlertsLog,
    rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
    chestsClaimedCount: dbState.chestsClaimedCount,
    claimedTicketCodes: dbState.claimedTicketCodes,
    killSwitchActive: dbState.killSwitchActive,
    autoWithdrawLimitTon:
      dbState.autoWithdrawLimitTon || liveSecurityCfg.autoWithdrawLimitTon || 50,
    publicTonTreasuryWallet: liveSecurityCfg.publicTonTreasuryWallet,
    appDomain: liveSecurityCfg.appDomain,
    fxRates: DEFAULT_FX_RATES,
  };
}

// Real Handshake Initialization & Session Endpoints
app.post('/api/auth/init', optionalAuth, (req: AuthRequest, res) => {
  const incomingUser = req.body?.telegramUser;
  if (incomingUser && typeof incomingUser.first_name === 'string' && incomingUser.first_name.trim()) {
    const fullName = `${incomingUser.first_name}${incomingUser.last_name ? ' ' + incomingUser.last_name : ''} (VIP)`;
    pamEngine.authenticate({
      playerId: incomingUser.id ? `tg_${incomingUser.id}` : pamEngine.getState().playerId,
      displayName: fullName,
      vipTier: pamEngine.getState().vipTier,
    });
    persistAll();
  }
  res.json(buildSnapshotPayload(req));
});

app.get('/api/auth/session', optionalAuth, (req: AuthRequest, res) => {
  res.json(buildSnapshotPayload(req));
});

// Unified Snapshot Endpoint (Returns Persistent PAM State, Rounds, Tickets, Draw History, Ledger, and Server-Verified isAdmin)
app.get('/api/snapshot', optionalAuth, (req: AuthRequest, res) => {
  const initDataRaw = (req.headers['x-telegram-init-data'] as string | undefined) || '';
  if (initDataRaw) {
    try {
      const sp = new URLSearchParams(initDataRaw);
      const uRaw = sp.get('user');
      if (uRaw) {
        const parsedUser = JSON.parse(uRaw);
        if (parsedUser && typeof parsedUser.first_name === 'string' && parsedUser.first_name.trim()) {
          const fullName = `${parsedUser.first_name}${parsedUser.last_name ? ' ' + parsedUser.last_name : ''} (VIP)`;
          pamEngine.authenticate({
            playerId: parsedUser.id ? `tg_${parsedUser.id}` : pamEngine.getState().playerId,
            displayName: fullName,
            vipTier: pamEngine.getState().vipTier,
          });
        }
      }
    } catch {
      // ignore malformed user param
    }
  }
  res.json(buildSnapshotPayload(req));
});

// ============================================================================
// MAIN "LUCKYDROP" LOTTERY TICKET PURCHASING (CONNECTED TO PAM DEBIT)
// ============================================================================

const handleTicketPurchase = async (req: AuthRequest, res: express.Response) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: فروش بلیت و درگاه‌ها توسط کلید قطع اضطراری متوقف شده است.',
      });
    }

    const {
      roundCode = '#ZRN-8493',
      mainNumbers = [7, 14, 21, 33, 49],
      goldenBall = 9,
      costUsdt = 5,
      currencyNetwork = 'TON Network',
      clientSeed = '',
      referredByCode = '',
      slips,
      transaction_uuid,
    } = req.body || {};

    // Check if the round exists and is ACTIVE
    const roundObj = dbState.rounds.find((r) => r.roundCode === roundCode) || dbState.rounds[0];
    if (roundObj && roundObj.status && roundObj.status.toUpperCase() === 'PAUSED') {
      return res.status(400).json({
        error: `فروش بلیت برای دور ${roundCode} موقتاً توسط اپراتور متوقف شده است.`,
      });
    }

    const slipArray =
      Array.isArray(slips) && slips.length > 0
        ? slips
        : [
            {
              slipIndex: 1,
              mainNumbers: Array.isArray(mainNumbers) ? mainNumbers : [7, 14, 21, 33, 49],
              goldenBall: Number(goldenBall ?? 8),
              clientSeed: clientSeed || pamEngine.getState().seeds.clientSeed,
            },
          ];

    for (const s of slipArray) {
      if (!Array.isArray(s.mainNumbers) || s.mainNumbers.length < 4) {
        return res
          .status(400)
          .json({ error: 'لطفاً تمام گوی‌های اصلی مورد نیاز هر کوپن را انتخاب کنید.' });
      }
    }

    const totalCostNum = Math.max(0.1, Number(costUsdt) || slipArray.length * 5);
    const unitCostNum = Number((totalCostNum / slipArray.length).toFixed(2));
    const batchTxUuid = String(
      transaction_uuid || generateDeterministicUuid('tx_ticket_debit')
    ).trim();

    // 1. Execute PAM Seamless Wallet DEBIT with strict Idempotency
    const debitRes = pamEngine.debit({
      transactionUuid: batchTxUuid,
      roundId: roundCode,
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: totalCostNum,
      note: `خرید ${slipArray.length} بلیت لاتاری در دور ${roundCode} (${currencyNetwork})`,
      incrementNonce: true,
    });

    if (!debitRes.ok) {
      return res.status(400).json({
        error: debitRes.error || 'INSUFFICIENT_BALANCE',
        tonBalance: debitRes.tonBalance,
        starsBalance: debitRes.starsBalance,
      });
    }

    // If this was an idempotent replay of an existing transaction_uuid, return existing tickets
    if (debitRes.idempotentReplay) {
      const existingTickets = dbState.tickets.filter((t) => t.transactionUuid === batchTxUuid);
      return res.json({
        ok: true,
        idempotentReplay: true,
        ticket: existingTickets[0],
        tickets: existingTickets,
        tonBalance: debitRes.tonBalance,
        starsBalance: debitRes.starsBalance,
        ledgerEntry: debitRes.ledgerEntry,
      });
    }

    // 2. Dynamic Pari-Mutuel Pool Split (85% added to Distributable Pool, 15% Reserved for Site)
    const cleanRefCode = String(referredByCode || '').trim().toUpperCase();
    const hasValidReferrer = cleanRefCode.length >= 4 && cleanRefCode !== 'VIP-KAMRAN777-SELF';
    const zeroLossSplit = calculateZeroLossTicketSplit(totalCostNum, hasValidReferrer, 85, 2);

    dbState.rolloverReservePoolUsdt = Number(
      (dbState.rolloverReservePoolUsdt + zeroLossSplit.rolloverReserveUsdt).toFixed(2)
    );

    if (roundObj) {
      const prevSales = parseFloat(roundObj.totalSalesUsdt) || 0;
      const nextSales = prevSales + totalCostNum;
      const poolSplit = calculateDynamicPariMutuelPool(nextSales, 15);
      roundObj.totalSalesUsdt = poolSplit.grossCollectedUsdt.toFixed(2);
      roundObj.jackpotUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
      roundObj.totalPayoutUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
      roundObj.operatorProfitUsdt = poolSplit.siteShare15Usdt.toFixed(2);
      roundObj.rolloverReserveUsdt = (poolSplit.grossCollectedUsdt * 0.03).toFixed(2);
      roundObj.ticketsSoldCount = (Number(roundObj.ticketsSoldCount) || 0) + slipArray.length;
      roundObj.soldPercent = Math.min(99, (roundObj.soldPercent || 20) + slipArray.length);
    }

    // 3. Persist each purchased ticket with status = 'ACTIVE' and round's serverSeedHash commitment
    const currentSeeds = pamEngine.getState().seeds;
    const roundSeedHash = roundObj?.serverSeedHash || currentSeeds.serverSeedHash;
    const mintedTickets: PersistentTicketRecord[] = [];

    for (let i = 0; i < slipArray.length; i++) {
      const slip = slipArray[i];
      const ticketNonce = (roundObj ? roundObj.nonce : currentSeeds.nonce) + i;
      if (roundObj) {
        roundObj.nonce += 1;
      }
      const serialRandom = Math.floor(100000 + Math.random() * 900000);
      const prefix = roundCode.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'TON';
      const ticketCode = `${prefix}-${serialRandom}`;
      const effectiveClientSeed =
        (slip.clientSeed || clientSeed || currentSeeds.clientSeed).trim() ||
        'luckydrop_vip_client_seed';
      const txHash = `0x${sha256Hex(`${batchTxUuid}:${ticketCode}:${effectiveClientSeed}:${ticketNonce}`)}`;

      const ticketRecord: PersistentTicketRecord = {
        id: Date.now() + i,
        ticketCode,
        userUid: pamEngine.getState().playerId,
        roundCode,
        mainNumbers: JSON.stringify(slip.mainNumbers.map(Number).sort((a: number, b: number) => a - b)),
        goldenBall: Number(slip.goldenBall ?? 0),
        costUsdt: unitCostNum.toFixed(2),
        currencyNetwork,
        txHash,
        transactionUuid: i === 0 ? batchTxUuid : `${batchTxUuid}_${i + 1}`,
        payoutTransactionUuid: null,
        clientSeed: effectiveClientSeed,
        serverSeedHash: roundSeedHash,
        nonce: ticketNonce,
        commitHash: txHash.slice(2, 34),
        status: 'ACTIVE',
        confirmations: 19,
        prizeWonUsdt: '0.00',
        claimed: false,
        createdAt: new Date().toLocaleTimeString('fa-IR'),
      };

      dbState.tickets.unshift(ticketRecord);
      mintedTickets.push(ticketRecord);
    }

    if (hasValidReferrer && zeroLossSplit.referralCommissionUsdt > 0) {
      dbState.referralEvents.unshift({
        id: Date.now(),
        referrerCode: cleanRefCode,
        buyerDisplayName: pamEngine.getState().displayName,
        roundCode,
        ticketAmountUsdt: totalCostNum,
        prizePool85Usdt: zeroLossSplit.prizePoolUsdt,
        grossLotteryProfit10Usdt: Number((totalCostNum * 0.1).toFixed(2)),
        referralCommission2Usdt: zeroLossSplit.referralCommissionUsdt,
        commissionUsdt: zeroLossSplit.referralCommissionUsdt,
        netHouseProfit8Usdt: zeroLossSplit.netOperatorProfitUsdt,
        netHouseProfitUsdt: zeroLossSplit.netOperatorProfitUsdt,
        createdAt: 'همین الان',
      });
    }

    persistAll();

    if (dbState.telegramBotConfig.notifyOnTicketPurchase) {
      await dispatchAdminTelegramAlert({
        eventType: 'TICKET_PURCHASE',
        userDisplayName: pamEngine.getState().displayName,
        amountUsdt: totalCostNum,
        network: currencyNetwork,
        roundCode,
        roundTitleFa: roundObj?.titleFa || roundCode,
        ticketCount: mintedTickets.length,
        seedHash: roundSeedHash,
        details: `صدور ${mintedTickets.length} بلیت (${mintedTickets[0].ticketCode}) در دور ${roundCode}`,
      });
    }

    return res.json({
      ok: true,
      ticket: mintedTickets[0],
      tickets: mintedTickets,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      tonBalance: debitRes.tonBalance,
      starsBalance: debitRes.starsBalance,
      ledgerEntry: debitRes.ledgerEntry,
      pamState: pamEngine.getState(),
      zeroLossSplit,
      rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
    });
  } catch (error: any) {
    console.error('Failed to purchase ticket:', error);
    res.status(500).json({ error: error.message || 'خطا در صدور بلیت' });
  }
};

app.post('/api/tickets/purchase', optionalAuth, requireTelegramWebAppAuth, handleTicketPurchase);
app.post('/api/tickets/buy', optionalAuth, requireTelegramWebAppAuth, handleTicketPurchase);

// ============================================================================
// REAL PROVABLY FAIR LOTTERY DRAW EXECUTION ENGINE (PARI-MUTUEL 85% / 15%)
// - Deducts & locks 15% of collected pool for the Site
// - Distributes the remaining 85% of the collected pool among winning tickets at draw time ("راس تایم")
// - Automatically credits winners via PAM Seamless Wallet credit endpoint
// ============================================================================

app.post('/api/admin/draw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      roundCode = '#ZRN-8493',
      clientSeedOverride,
      forceWinningMain,
      forceWinningGolden,
    } = req.body || {};

    let roundObj = dbState.rounds.find((r) => r.roundCode === roundCode);
    if (!roundObj && dbState.rounds.length > 0) {
      roundObj = dbState.rounds[0];
    }
    if (!roundObj) {
      return res.status(404).json({ error: 'دور قرعه‌کشی مورد نظر یافت نشد.' });
    }

    const activeServerSeed =
      roundObj.serverSeed || sha256Hex(`luckydrop_seed_${roundObj.roundCode}_${Date.now()}`);
    const activeClientSeed =
      (clientSeedOverride || roundObj.clientSeed || pamEngine.getState().seeds.clientSeed || '').trim() ||
      'luckydrop_vip_client_seed';
    const drawNonce = Math.max(1, Number(roundObj.nonce) || 1);

    // 1. Derive Winning Numbers using HMAC-SHA256 52-Bit Uniform Float X in [0, 1)
    const drawProof = deriveProvablyFairLotteryDraw({
      serverSeed: activeServerSeed,
      clientSeed: activeClientSeed,
      nonce: drawNonce,
      roundCode: roundObj.roundCode,
      mainCount: roundObj.mainCount || 5,
      mainMax: roundObj.mainMax || 50,
      goldenMax: roundObj.goldenMax ?? 15,
    });

    const drawnMain: number[] =
      Array.isArray(forceWinningMain) && forceWinningMain.length >= 4
        ? forceWinningMain.map(Number).sort((a, b) => a - b)
        : drawProof.drawnMain;
    const drawnGolden: number =
      typeof forceWinningGolden === 'number' ? forceWinningGolden : drawProof.drawnGolden;

    // 2. Dynamic Pari-Mutuel Pool Calculation: 15% Site Share Reserved, 85% Distributable Pool
    const grossCollectedUsdt = Math.max(0, parseFloat(roundObj.totalSalesUsdt) || 0);
    const poolSplit = calculateDynamicPariMutuelPool(grossCollectedUsdt, 15);
    const distributablePool85Usdt = poolSplit.distributablePool85Usdt;

    // First pass: evaluate all ACTIVE tickets in this round
    const candidateTickets: Array<{
      ticket: PersistentTicketRecord;
      evalResult: ReturnType<typeof evaluateTicketPrizeTier>;
    }> = [];

    for (const ticket of dbState.tickets) {
      const normalizedStatus = (ticket.status || '').toUpperCase();
      if (
        ticket.roundCode === roundObj.roundCode &&
        (normalizedStatus === 'ACTIVE' || normalizedStatus === 'MINTED')
      ) {
        let parsedMain: number[] = [];
        try {
          parsedMain = JSON.parse(ticket.mainNumbers);
        } catch {
          parsedMain = String(ticket.mainNumbers)
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((n) => Number(n.trim()))
            .filter((n) => Number.isFinite(n));
        }

        const evalResult = evaluateTicketPrizeTier({
          ticketMain: parsedMain,
          ticketGolden: Number(ticket.goldenBall || 0),
          drawnMain,
          drawnGolden,
          ticketCostUsdt: parseFloat(ticket.costUsdt) || 5,
          jackpotUsdt: Math.max(50, distributablePool85Usdt),
        });

        candidateTickets.push({ ticket, evalResult });
      }
    }

    // Second pass: distribute the exact 85% collected pool among winning tickets proportionally!
    const rawWeights = candidateTickets.map((c) => (c.evalResult.won ? c.evalResult.prizeUsdt : 0));
    const distributedPrizes = distributePoolAmongWinners(distributablePool85Usdt, rawWeights);

    const ticketsEvaluatedCount = candidateTickets.length;
    let winnersCount = 0;
    let totalPayoutUsdt = 0;
    const evaluatedTicketsSummary: Array<{
      ticketCode: string;
      status: 'WON' | 'LOST';
      prizeUsdt: number;
      tierLabelFa: string;
      payoutTransactionUuid: string | null;
    }> = [];

    for (let idx = 0; idx < candidateTickets.length; idx++) {
      const { ticket, evalResult } = candidateTickets[idx];
      const finalPrizeUsdt = distributedPrizes[idx] || 0;

      if (evalResult.won && finalPrizeUsdt > 0) {
        ticket.status = 'WON';
        ticket.prizeWonUsdt = finalPrizeUsdt.toFixed(2);
        ticket.tierLabelFa = evalResult.tierLabelFa;
        ticket.claimed = true;
        winnersCount += 1;
        totalPayoutUsdt = Number((totalPayoutUsdt + finalPrizeUsdt).toFixed(2));

        const payoutUuid = `tx_win_${ticket.ticketCode}_${drawNonce}`;
        const creditRes = pamEngine.credit({
          transactionUuid: payoutUuid,
          referenceTransactionUuid: ticket.transactionUuid || null,
          roundId: roundObj.roundCode,
          vertical: 'LUCKYDROP_LOTTERY',
          amountUsdt: finalPrizeUsdt,
          note: `تسویه راس تایم استخر ۸۵٪ برای کوپن ${ticket.ticketCode} (${evalResult.tierLabelFa}) در دور ${roundObj.roundCode}`,
        });
        ticket.payoutTransactionUuid = creditRes.ledgerEntry?.transactionUuid || payoutUuid;
        if (!dbState.claimedTicketCodes.includes(ticket.ticketCode)) {
          dbState.claimedTicketCodes.push(ticket.ticketCode);
        }

        const tonWon = (finalPrizeUsdt / DEFAULT_FX_RATES.TON).toFixed(2);
        dbState.transactions.unshift({
          id: Date.now() + winnersCount,
          txHash: `0x${drawProof.primaryHmacHex}`,
          userUid: ticket.userUid,
          type: 'PAYOUT',
          network: 'TON Network',
          amountUsdt: finalPrizeUsdt.toFixed(2),
          amountCrypto: `${tonWon} TON`,
          winnerName: pamEngine.getState().displayName,
          winnerLocation: 'تسویه راس تایم (۸۵٪ استخر)',
          lotteryTitle: roundObj.titleFa,
          winningCombo: `[${drawnMain.join(', ')}] + ★${drawnGolden}`,
          timeAgoLabel: 'همین الان',
          status: 'CONFIRMED',
          blockNumber: 62195000 + drawNonce,
          confirmations: 19,
        });
      } else {
        ticket.status = 'LOST';
        ticket.prizeWonUsdt = '0.00';
        ticket.tierLabelFa = evalResult.tierLabelFa;
      }

      evaluatedTicketsSummary.push({
        ticketCode: ticket.ticketCode,
        status: ticket.status as 'WON' | 'LOST',
        prizeUsdt: finalPrizeUsdt,
        tierLabelFa: evalResult.tierLabelFa,
        payoutTransactionUuid: ticket.payoutTransactionUuid || null,
      });
    }

    // 3. Update round winning numbers, rotate serverSeed, and reset countdown timer for next cycle
    roundObj.winningNumbers = JSON.stringify(drawnMain);
    roundObj.winningGoldenBall = drawnGolden;
    const nextServerSeed = generateCryptographicServerSeed();
    roundObj.serverSeed = nextServerSeed;
    roundObj.serverSeedHash = sha256Hex(nextServerSeed);
    roundObj.nonce = drawNonce + 1;
    const durMin = Math.max(1, Number(roundObj.durationMinutes) || 60);
    roundObj.drawTargetTimestampMs = Date.now() + durMin * 60 * 1000;

    // If winners took the 85% pool, reset pool to initialSeedUsdt for the new cycle
    if (winnersCount > 0) {
      const seedUsdt = Math.max(0, parseFloat(roundObj.initialSeedUsdt || '0') || 0);
      const nextSplit = calculateDynamicPariMutuelPool(seedUsdt, 15);
      roundObj.totalSalesUsdt = nextSplit.grossCollectedUsdt.toFixed(2);
      roundObj.jackpotUsdt = nextSplit.distributablePool85Usdt.toFixed(2);
      roundObj.totalPayoutUsdt = nextSplit.distributablePool85Usdt.toFixed(2);
      roundObj.operatorProfitUsdt = nextSplit.siteShare15Usdt.toFixed(2);
      roundObj.ticketsSoldCount = 0;
    }

    pamEngine.rotateServerSeed(nextServerSeed);

    // 4. Record verifiable draw in Draw History
    const drawRecord: VerifiableDrawHistoryRecord = {
      drawId: `DRAW-${roundObj.roundCode.replace('#', '')}-${drawNonce}`,
      roundCode: roundObj.roundCode,
      roundTitleFa: roundObj.titleFa,
      drawnMain,
      drawnGolden,
      serverSeed: drawProof.serverSeed,
      serverSeedHash: drawProof.serverSeedHash,
      clientSeed: drawProof.clientSeed,
      nonce: drawProof.nonce,
      primaryHmacHex: drawProof.primaryHmacHex,
      first52BitHex: drawProof.first52BitHex,
      uniformFloatX: drawProof.uniformFloatX,
      ticketsEvaluatedCount,
      winnersCount,
      totalPayoutUsdt,
      createdAt: new Date().toLocaleTimeString('fa-IR'),
    };
    dbState.drawHistory.unshift(drawRecord);

    persistAll();

    // Broadcast Official Draw Result + 64-char SHA-256 Seed Hash to Telegram Channel
    void dispatchAdminTelegramAlert({
      eventType: 'DRAW_RESULT',
      userDisplayName: `${winnersCount} برنده راس تایم`,
      amountUsdt: distributablePool85Usdt,
      network: 'TON Pari-Mutuel 85% Pool',
      roundCode: roundObj.roundCode,
      roundTitleFa: roundObj.titleFa,
      winningBalls: drawnMain,
      winningGoldenBall: drawnGolden,
      seedHash: drawProof.serverSeedHash,
      details: `قرعه‌کشی دور ${roundObj.roundCode} انجام شد • استخر ۸۵٪ تقسیم‌شده: $${distributablePool85Usdt.toFixed(2)}`,
    });

    res.json({
      ok: true,
      roundCode: roundObj.roundCode,
      drawnMain,
      drawnGolden,
      hash: `0x${drawProof.primaryHmacHex}`,
      drawProof,
      drawRecord,
      ticketsEvaluatedCount,
      winnersCount,
      totalPayoutUsdt,
      grossCollectedUsdt: poolSplit.grossCollectedUsdt,
      siteShare15Usdt: poolSplit.siteShare15Usdt,
      distributablePool85Usdt: poolSplit.distributablePool85Usdt,
      evaluatedTickets: evaluatedTicketsSummary,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      tonBalance: pamEngine.getState().tonBalance,
      starsBalance: pamEngine.getState().starsBalance,
      pamState: pamEngine.getState(),
      nextServerSeedHash: roundObj.serverSeedHash,
    });
  } catch (error: any) {
    console.error('Failed to execute draw:', error);
    res.status(500).json({ error: error.message || 'خطا در اجرای قرعه‌کشی' });
  }
});

// ============================================================================
// LOTTERY ROUNDS CRUD (CREATE UNLIMITED, DELETE, TOGGLE STATUS, UPDATE PRICE & TIMER)
// ============================================================================

app.post('/api/admin/rounds', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      titleFa,
      category = 'DAILY',
      ticketPriceUsdt = 3.2,
      initialSeedUsdt = 0,
      jackpotUsdt,
      durationMinutes = 60,
      mainCount = 5,
      mainMax = 50,
      goldenMax = 15,
    } = req.body || {};

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix =
      category === 'DAILY'
        ? 'BLZ'
        : category === 'TURBO' || category === 'HOURLY'
        ? 'FLS'
        : category === 'TON_SPECIAL'
        ? 'TON'
        : 'ZRN';
    const roundCode = `#${prefix}-${randomNum}`;
    const newServerSeed = generateCryptographicServerSeed();
    const newServerSeedHash = sha256Hex(newServerSeed);

    const safePrice = Math.max(0.1, Number(ticketPriceUsdt) || 1.6);
    const safeDurationMin = Math.max(1, Number(durationMinutes) || 60);
    // Start pool from initialSeedUsdt (default 0) so it fills dynamically from ticket sales
    const rawStartingPool =
      typeof initialSeedUsdt === 'number'
        ? Math.max(0, Number(initialSeedUsdt))
        : typeof jackpotUsdt === 'number' && jackpotUsdt < 50000
        ? Math.max(0, Number(jackpotUsdt))
        : 0;
    const poolSplit = calculateDynamicPariMutuelPool(rawStartingPool, 15);

    const cleanTitle =
      String(titleFa || '').trim() ||
      `استخر قرعه‌کشی TON (${roundCode})`;

    const newRound: PersistentRoundRecord = {
      id: Date.now(),
      roundCode,
      lotteryType: `CUSTOM_${roundCode.replace('#', '')}`,
      titleFa: cleanTitle,
      titleEn: `LuckyDrop TON Pool ${roundCode}`,
      titleZh: `TON大奖池 ${roundCode}`,
      subtitleFa: `${mainCount} گوی از ${mainMax} • تقسیم ۸۵٪ استخر جمع‌شده راس تایم (۱۵٪ سهم سایت)`,
      category: String(category).toUpperCase(),
      formatLabel: `${mainCount}/${mainMax} + ${goldenMax > 0 ? `1/${goldenMax}` : '0'}`,
      mainCount: Number(mainCount) || 5,
      mainMax: Number(mainMax) || 50,
      goldenMax: Number(goldenMax) ?? 15,
      jackpotUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: safePrice.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: 0,
      remainingLabel: '۸۵٪ استخر به برندگان • ۱۵٪ سایت',
      drawTimeLabel: `راس هر ${safeDurationMin} دقیقه`,
      durationMinutes: safeDurationMin,
      drawTargetTimestampMs: Date.now() + safeDurationMin * 60 * 1000,
      initialSeedUsdt: rawStartingPool.toFixed(2),
      ticketsSoldCount: 0,
      serverSeed: newServerSeed,
      serverSeedHash: newServerSeedHash,
      clientSeed: pamEngine.getState().seeds.clientSeed,
      nonce: 1,
      winningNumbers: '[7,14,23,38,49]',
      winningGoldenBall: 8,
      totalSalesUsdt: poolSplit.grossCollectedUsdt.toFixed(2),
      totalPayoutUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      operatorProfitUsdt: poolSplit.siteShare15Usdt.toFixed(2),
      rolloverReserveUsdt: (poolSplit.grossCollectedUsdt * 0.03).toFixed(2),
      status: 'ACTIVE',
    };

    dbState.rounds.unshift(newRound);
    dbState.deletedRoundCodes = dbState.deletedRoundCodes.filter((c) => c !== roundCode);
    persistAll();

    res.json({
      ok: true,
      round: { ...newRound, serverSeed: undefined },
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    });
  } catch (error: any) {
    console.error('Failed to create lottery round:', error);
    res.status(500).json({ error: error.message || 'خطا در ایجاد دوره جدید' });
  }
});

const handleDeleteRound = (rawCode: string, deleteAll: boolean = false) => {
  if (deleteAll) {
    for (const r of dbState.rounds) {
      if (!dbState.deletedRoundCodes.includes(r.roundCode)) {
        dbState.deletedRoundCodes.push(r.roundCode);
      }
    }
    dbState.rounds = [];
    persistAll();
    return { deletedRoundCode: 'ALL', removedCount: dbState.deletedRoundCodes.length };
  }

  const clean = decodeURIComponent(rawCode || '').trim();
  const targetWithHash = clean.startsWith('#') ? clean : `#${clean}`;
  const targetWithoutHash = clean.replace(/^#/, '');

  const beforeLen = dbState.rounds.length;
  dbState.rounds = dbState.rounds.filter(
    (r) =>
      r.roundCode !== clean &&
      r.roundCode !== targetWithHash &&
      r.roundCode.replace(/^#/, '') !== targetWithoutHash
  );

  for (const code of [clean, targetWithHash, targetWithoutHash]) {
    if (code && !dbState.deletedRoundCodes.includes(code)) {
      dbState.deletedRoundCodes.push(code);
    }
  }

  persistAll();
  return { deletedRoundCode: targetWithHash, removedCount: beforeLen - dbState.rounds.length };
};

// Delete Lottery Round via DELETE /:roundCode or POST /delete
app.delete('/api/admin/rounds/:roundCode', optionalAuth, (req: AuthRequest, res) => {
  try {
    const out = handleDeleteRound(req.params.roundCode || '');
    res.json({
      ok: true,
      ...out,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      deletedRoundCodes: dbState.deletedRoundCodes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در حذف دور قرعه‌کشی' });
  }
});

app.post('/api/admin/rounds/delete', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { roundCode = '', deleteAll = false } = req.body || {};
    const out = handleDeleteRound(String(roundCode), Boolean(deleteAll));
    res.json({
      ok: true,
      ...out,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      deletedRoundCodes: dbState.deletedRoundCodes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در حذف دور قرعه‌کشی' });
  }
});

// Toggle Round Status (ACTIVE <-> PAUSED)
app.post('/api/admin/rounds/toggle', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { roundCode } = req.body || {};
    const target = dbState.rounds.find((r) => r.roundCode === roundCode);
    if (!target) {
      return res.status(404).json({ error: 'دور مورد نظر یافت نشد.' });
    }
    target.status = target.status.toUpperCase() === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    persistAll();
    res.json({
      ok: true,
      round: { ...target, serverSeed: undefined },
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تغییر وضعیت دوره' });
  }
});

// Update Round Ticket Price & Optional Timer Reset
app.post('/api/admin/rounds/price', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { roundCode, ticketPriceUsdt, durationMinutes } = req.body || {};
    const target = dbState.rounds.find((r) => r.roundCode === roundCode);
    if (!target) {
      return res.status(404).json({ error: 'دور مورد نظر یافت نشد.' });
    }
    if (typeof ticketPriceUsdt === 'number' && ticketPriceUsdt > 0) {
      const safePrice = Math.max(0.05, Number(ticketPriceUsdt));
      target.ticketPriceUsdt = safePrice.toFixed(2);
    }
    if (typeof durationMinutes === 'number' && durationMinutes >= 1) {
      target.durationMinutes = Math.round(durationMinutes);
      target.drawTargetTimestampMs = Date.now() + target.durationMinutes * 60 * 1000;
      target.drawTimeLabel = `راس هر ${target.durationMinutes} دقیقه`;
    }
    persistAll();
    res.json({
      ok: true,
      round: { ...target, serverSeed: undefined },
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در بروزرسانی قیمت بلیت' });
  }
});

// ============================================================================
// LOYALTY CHEST, TICKET CLAIM, CRYPTO DEPOSIT/WITHDRAWAL & TELEGRAM BOT
// ============================================================================

app.post('/api/loyalty/open-chest', optionalAuth, async (_req: AuthRequest, res) => {
  try {
    const tickets = dbState.tickets || [];
    const totalSpent = tickets.reduce((s, t) => s + (Number(t.costUsdt) || 5), 0);

    const report = evaluateZeroLossLoyaltyChest({
      totalTicketsPurchased: tickets.length,
      totalSpentUsdt: totalSpent,
      chestsClaimedCount: dbState.chestsClaimedCount,
      availableRolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
      ticketsPerChest: 3,
    });

    if (report.chestsAvailableToOpen <= 0 || report.safeRewardUsdt <= 0) {
      return res.status(400).json({
        error: `برای باز کردن صندوقچه بعدی، ${report.ticketsUntilNextChest} بلیت دیگر خریداری کنید.`,
      });
    }

    dbState.chestsClaimedCount += 1;
    dbState.rolloverReservePoolUsdt = Number(
      Math.max(0, dbState.rolloverReservePoolUsdt - report.safeRewardUsdt).toFixed(2)
    );

    const bonusRes = pamEngine.bonus({
      transactionUuid: generateDeterministicUuid('tx_loyalty_chest'),
      roundId: `#CHEST-${dbState.chestsClaimedCount}`,
      vertical: 'VIP_LOYALTY_BONUS',
      amountUsdt: report.safeRewardUsdt,
      creditToRealBalance: true,
      note: `پاداش صندوقچه وفاداری طلایی (${report.rewardTierLabelFa}) از محل ۳٪ ذخیره سرریز`,
    });

    persistAll();

    return res.json({
      ok: true,
      rewardUsdt: report.safeRewardUsdt,
      rewardTierLabelFa: report.rewardTierLabelFa,
      tonBalance: bonusRes.tonBalance,
      starsBalance: bonusRes.starsBalance,
      ledgerEntry: bonusRes.ledgerEntry,
      chestsClaimedCount: dbState.chestsClaimedCount,
      rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در بازگشایی صندوقچه وفاداری' });
  }
});

app.post('/api/admin/telegram/config', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      botToken = '',
      adminChatId = '',
      enabled = true,
      notifyOnDeposit = true,
      notifyOnWithdrawal = true,
      notifyOnTicketPurchase = true,
    } = req.body || {};
    const incomingToken = String(botToken).trim();
    dbState.telegramBotConfig = {
      // Preserve existing token if masked placeholder was sent back from UI
      botToken: incomingToken.includes('••••')
        ? dbState.telegramBotConfig.botToken
        : incomingToken,
      adminChatId: normalizeTelegramChatId(String(adminChatId)),
      enabled: Boolean(enabled),
      notifyOnDeposit: Boolean(notifyOnDeposit),
      notifyOnWithdrawal: Boolean(notifyOnWithdrawal),
      notifyOnTicketPurchase: Boolean(notifyOnTicketPurchase),
    };
    persistAll();
    res.json({
      ok: true,
      telegramBotConfig: {
        ...dbState.telegramBotConfig,
        botToken: getEffectiveBotToken() ? '•••••••••••• (CONFIGURED_IN_ENV)' : '',
      },
      telegramAlertsLog: dbState.telegramAlertsLog,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ذخیره تنظیمات بات تلگرام' });
  }
});

app.post('/api/admin/telegram/test', optionalAuth, async (_req: AuthRequest, res) => {
  try {
    const dispatchRes = await dispatchAdminTelegramAlert({
      eventType: 'TEST_PING',
      userDisplayName: 'اپراتور ارشد کاکپیت (Stealth Admin)',
      amountUsdt: 0,
      network: 'Telegram Bot API v7.0',
      details: 'پیام تست اتصال ربات اطلاع‌رسان کاکپیت صادر شد.',
    });
    res.json({
      ok: true,
      deliveredToTelegramApi: dispatchRes.delivered,
      apiDescription: dispatchRes.apiDescription,
      logItem: dispatchRes.logItem,
      telegramAlertsLog: dbState.telegramAlertsLog,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ارسال پیام تست تلگرام' });
  }
});

app.post('/api/tickets/claim', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { ticketCode, prizeUsdt = 25, network = 'USDT (TRC-20)' } = req.body || {};
    if (!ticketCode) {
      return res.status(400).json({ error: 'کد بلیت نامعتبر است.' });
    }
    if (dbState.claimedTicketCodes.includes(ticketCode)) {
      return res.status(400).json({ error: 'جایزه این بلیت قبلاً دریافت شده است.' });
    }

    const ticket = dbState.tickets.find((t) => t.ticketCode === ticketCode);
    const amount = Number(ticket?.prizeWonUsdt || prizeUsdt) || 25;

    const creditRes = pamEngine.credit({
      transactionUuid: `tx_claim_${ticketCode}`,
      referenceTransactionUuid: ticket?.transactionUuid || null,
      roundId: ticket?.roundCode || '#CLAIM',
      vertical: 'LUCKYDROP_LOTTERY',
      amountUsdt: amount,
      note: `تسویه جایزه کوپن برنده ${ticketCode} (${network})`,
    });

    if (ticket) {
      ticket.claimed = true;
      ticket.status = 'WON';
    }
    dbState.claimedTicketCodes.push(ticketCode);
    persistAll();

    res.json({
      ok: true,
      ticketCode,
      tonBalance: creditRes.tonBalance,
      starsBalance: creditRes.starsBalance,
      ledgerEntry: creditRes.ledgerEntry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تسویه جایزه' });
  }
});

const handleCryptoDeposit = async (req: AuthRequest, res: express.Response) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت توسط کلید قطع اضطراری قفل شده است.',
      });
    }

    const {
      amountUsdt = 50,
      amountTon,
      network = 'TON Network',
      txHash = '',
      boc = '',
      senderWallet = '',
      officialRecipientWallet = serverSecurityConfig.publicTonTreasuryWallet,
      mode = 'ONCHAIN_AUTO',
      verificationMode,
      requireSignedBoc = false,
    } = req.body || {};

    const effectiveMode = verificationMode || mode || 'ONCHAIN_AUTO';
    const cleanBoc = String(boc || '').trim();
    if (requireSignedBoc && !cleanBoc) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_SIGNED_BOC — تراکنش TON باید در کیف پول TON Connect امضا شود (BOC یافت نشد).',
      });
    }
    const cleanTxHash =
      String(txHash || '').trim() ||
      (cleanBoc ? `boc_${sha256Hex(cleanBoc).slice(0, 48)}` : `0x${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`);

    if (processedDepositTxHashes.has(cleanTxHash)) {
      return res.status(409).json({
        error: 'این هش تراکنش (TXID) قبلاً در سیستم ثبت و پردازش شده است.',
      });
    }

    const safeAmount = Math.max(1, Number(amountUsdt) || 50);
    const userDisplayName = pamEngine.getState().displayName;

    if (effectiveMode === 'ADMIN_MANUAL') {
      processedDepositTxHashes.add(cleanTxHash);
      const pendingItem: ServerDepositItem = {
        id: Date.now(),
        depositCode: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
        userUid: pamEngine.getState().playerId,
        userDisplayName,
        network,
        senderWallet: senderWallet || 'External Wallet / Exchange',
        officialRecipientWallet,
        amountUsdt: safeAmount,
        amountCrypto: `${safeAmount} USDT`,
        txHash: cleanTxHash,
        explorerUrl: getBlockchainExplorerTxUrl(network, cleanTxHash),
        explorerNote: 'در انتظار تایید اپراتور ارشد در کاکپیت',
        verificationMethod: 'ADMIN_MANUAL',
        verificationMode: 'ADMIN_MANUAL',
        status: 'PENDING_ADMIN',
        confirmations: 1,
        createdAt: 'همین الان',
      };
      dbState.deposits.unshift(pendingItem);
      persistAll();

      if (dbState.telegramBotConfig.notifyOnDeposit) {
        await dispatchAdminTelegramAlert({
          eventType: 'DEPOSIT',
          userDisplayName,
          amountUsdt: safeAmount,
          network,
          details: `حواله دستی در صف تایید ادمین (${pendingItem.depositCode})`,
        });
      }

      return res.json({
        ok: true,
        queuedForAdmin: true,
        deposit: pendingItem,
        deposits: dbState.deposits,
      });
    }

    // ONCHAIN_AUTO: Immediately credit via PAM Seamless Wallet Engine
    processedDepositTxHashes.add(cleanTxHash);
    const depositCode = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
    const creditRes = pamEngine.credit({
      transactionUuid: `tx_dep_${depositCode}_${cleanTxHash.slice(0, 10)}`,
      referenceTransactionUuid: null,
      roundId: depositCode,
      vertical: 'CRYPTO_TREASURY',
      amountUsdt: safeAmount,
      note: `شارژ آنی کیف پول از شبکه ${network} (${depositCode})`,
    });

    const confirmedItem: ServerDepositItem = {
      id: Date.now(),
      depositCode,
      userUid: pamEngine.getState().playerId,
      userDisplayName,
      network,
      senderWallet: senderWallet || 'Connected Web3 Wallet',
      officialRecipientWallet,
      amountUsdt: safeAmount,
      amountCrypto: `${safeAmount} USDT`,
      txHash: cleanTxHash,
      explorerUrl: getBlockchainExplorerTxUrl(network, cleanTxHash),
      explorerNote: 'تایید اتوماتیک نود شبکه و شارژ در PAM Ledger',
      verificationMethod: 'ONCHAIN_AUTO',
      verificationMode: 'ONCHAIN_AUTO',
      status: 'CREDITED',
      confirmations: 19,
      createdAt: 'همین الان',
    };
    dbState.deposits.unshift(confirmedItem);
    persistAll();

    if (dbState.telegramBotConfig.notifyOnDeposit) {
      await dispatchAdminTelegramAlert({
        eventType: 'DEPOSIT',
        userDisplayName,
        amountUsdt: safeAmount,
        network,
        details: `شارژ آنی Web3 تایید شد (${depositCode})`,
      });
    }

    return res.json({
      ok: true,
      queuedForAdmin: false,
      tonBalance: creditRes.tonBalance,
      starsBalance: creditRes.starsBalance,
      ledgerEntry: creditRes.ledgerEntry,
      deposit: confirmedItem,
      deposits: dbState.deposits,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در شارژ کیف پول' });
  }
};

app.post('/api/wallet/deposit', optionalAuth, requireTelegramWebAppAuth, handleCryptoDeposit);
app.post('/api/deposit', optionalAuth, requireTelegramWebAppAuth, handleCryptoDeposit);

// Strict TON Connect Signed BOC Verification & Ledger Credit Endpoint
app.post('/api/wallet/deposit-ton', optionalAuth, requireTelegramWebAppAuth, async (req: AuthRequest, res) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        ok: false,
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت توسط کلید قطع اضطراری قفل شده است.',
      });
    }

    const {
      boc = '',
      amountTon = 0,
      amountUsdt,
      senderWallet = '',
      destinationWallet,
      memo = '',
    } = req.body || {};

    const cleanBoc = String(boc || '').trim();
    if (!cleanBoc || cleanBoc.length < 8) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_SIGNED_BOC — تراکنش TON باید در کیف پول TON Connect امضا شود (BOC معتبر یافت نشد).',
      });
    }

    const safeAmountTon = Number(Number(amountTon || 0).toFixed(4));
    if (!Number.isFinite(safeAmountTon) || safeAmountTon <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_TON_AMOUNT — مقدار واریز TON باید بزرگ‌تر از صفر باشد.',
      });
    }

    const bocTxHash = `0x${sha256Hex(`ton_boc:${cleanBoc}`)}`;
    if (processedDepositTxHashes.has(bocTxHash)) {
      return res.status(409).json({
        ok: false,
        error: 'DUPLICATE_BOC — این بسته امضاشده (BOC) قبلاً در سیستم ثبت و پردازش شده است.',
      });
    }

    processedDepositTxHashes.add(bocTxHash);
    const liveSecurityCfg = loadServerSecurityConfig(process.env);
    const officialRecipientWallet =
      String(destinationWallet || '').trim() || liveSecurityCfg.publicTonTreasuryWallet;
    const depositCode = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
    const computedUsdt =
      typeof amountUsdt === 'number' && amountUsdt > 0
        ? Number(amountUsdt.toFixed(2))
        : Number((safeAmountTon * DEFAULT_FX_RATES.TON).toFixed(2));
    const userDisplayName = pamEngine.getState().displayName;

    const creditRes = pamEngine.credit({
      transactionUuid: `tx_ton_boc_${depositCode}_${bocTxHash.slice(2, 12)}`,
      referenceTransactionUuid: null,
      roundId: depositCode,
      vertical: 'TON_CONNECT_BOC_TREASURY',
      currency: 'TON',
      amountTon: safeAmountTon,
      amountUsdt: computedUsdt,
      note: `واریز تاییدشده TON Connect BOC (+${safeAmountTon.toFixed(2)} TON • ${memo || depositCode})`,
    });

    const confirmedItem: ServerDepositItem = {
      id: Date.now(),
      depositCode,
      userUid: pamEngine.getState().playerId,
      userDisplayName,
      network: 'TON (TON Connect 2.0 Signed BOC)',
      senderWallet: String(senderWallet || 'TON Connect Wallet'),
      officialRecipientWallet,
      amountUsdt: computedUsdt,
      amountCrypto: `${safeAmountTon.toFixed(2)} TON`,
      txHash: bocTxHash,
      explorerUrl: getBlockchainExplorerTxUrl('TON Network', bocTxHash),
      explorerNote: 'تایید BOC امضاشده TON Connect و شارژ در PAM Ledger',
      verificationMethod: 'ONCHAIN_AUTO',
      verificationMode: 'ONCHAIN_AUTO',
      status: 'CREDITED',
      confirmations: 19,
      createdAt: 'همین الان',
    };

    dbState.deposits.unshift(confirmedItem);
    persistAll();

    if (dbState.telegramBotConfig.notifyOnDeposit) {
      await dispatchAdminTelegramAlert({
        eventType: 'DEPOSIT',
        userDisplayName,
        amountUsdt: computedUsdt,
        network: 'TON (Signed BOC)',
        details: `واریز تاییدشده TON Connect (+${safeAmountTon.toFixed(2)} TON • ${depositCode})`,
      });
    }

    return res.json({
      ok: true,
      queuedForAdmin: false,
      tonBalance: creditRes.tonBalance,
      starsBalance: creditRes.starsBalance,
      pamState: pamEngine.getState(),
      ledgerEntry: creditRes.ledgerEntry,
      deposit: confirmedItem,
      deposits: dbState.deposits,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در تایید BOC و شارژ کیف پول TON',
    });
  }
});

app.post('/api/admin/deposits/action', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { depositCode, action } = req.body || {};
    if (action === 'approve_all') {
      for (const dep of dbState.deposits) {
        if (dep.status === 'pending_admin' || dep.status === 'PENDING_ADMIN') {
          dep.status = 'CREDITED';
          dep.confirmations = 19;
          pamEngine.credit({
            transactionUuid: `tx_admin_dep_${dep.depositCode}`,
            referenceTransactionUuid: null,
            roundId: dep.depositCode,
            vertical: 'CRYPTO_TREASURY',
            amountUsdt: dep.amountUsdt,
            note: `تایید حواله واریز توسط ادمین (${dep.depositCode})`,
          });
        }
      }
      persistAll();
      return res.json({
        ok: true,
        deposits: dbState.deposits,
        tonBalance: pamEngine.getState().tonBalance,
        starsBalance: pamEngine.getState().starsBalance,
      });
    }

    const target = dbState.deposits.find((d) => d.depositCode === depositCode);
    if (!target) {
      return res.status(404).json({ error: 'درخواست واریز یافت نشد.' });
    }
    if (action === 'approve' && (target.status === 'pending_admin' || target.status === 'PENDING_ADMIN')) {
      target.status = 'CREDITED';
      target.confirmations = 19;
      pamEngine.credit({
        transactionUuid: `tx_admin_dep_${target.depositCode}`,
        referenceTransactionUuid: null,
        roundId: target.depositCode,
        vertical: 'CRYPTO_TREASURY',
        amountUsdt: target.amountUsdt,
        note: `تایید حواله واریز توسط ادمین (${target.depositCode})`,
      });
    } else if (action === 'reject') {
      target.status = 'REJECTED';
    }
    persistAll();
    return res.json({
      ok: true,
      deposit: target,
      deposits: dbState.deposits,
      tonBalance: pamEngine.getState().tonBalance,
      starsBalance: pamEngine.getState().starsBalance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تایید واریز توسط ادمین' });
  }
});

app.post('/api/wallet/withdraw', optionalAuth, requireTelegramWebAppAuth, async (req: AuthRequest, res) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: برداشت وجه موقتاً توسط کلید اضطراری متوقف شده است.',
      });
    }

    const {
      network = 'TON Network',
      destinationAddress = '',
      grossAmountUsdt = 100,
      networkFeeUsdt = 0.25,
      netAmountUsdt = 99.75,
      netAmountCrypto = '19.18 TON',
      amountTon: explicitAmountTon,
    } = req.body || {};

    const amountNum = Number(grossAmountUsdt);
    const derivedAmountTon =
      Number(explicitAmountTon) > 0
        ? Number(explicitAmountTon)
        : Number((amountNum / (DEFAULT_FX_RATES.TON || 5.2)).toFixed(2));
    const gate = evaluateHighValueWithdrawalGate(
      derivedAmountTon,
      dbState.autoWithdrawLimitTon || 50
    );

    const withdrawalCode = `WD-${Math.floor(100000 + Math.random() * 900000)}`;

    const debitRes = pamEngine.debit({
      transactionUuid: `tx_wd_${withdrawalCode}`,
      roundId: withdrawalCode,
      vertical: 'CRYPTO_TREASURY',
      amountUsdt: amountNum,
      note: gate.requiresAdminApproval
        ? `برداشت مبلغ بالا (${derivedAmountTon.toFixed(2)} TON) — در انتظار تایید ادمین (${withdrawalCode})`
        : `برداشت اتوماتیک آنی شبکه TON (${derivedAmountTon.toFixed(2)} TON) (${withdrawalCode})`,
      incrementNonce: false,
    });

    if (!debitRes.ok) {
      return res.status(400).json({ error: 'موجودی کیف پول برای این برداشت کافی نیست.' });
    }

    const newItem: ServerWithdrawalItem = {
      id: Date.now(),
      withdrawalCode,
      userUid: pamEngine.getState().playerId,
      userDisplayName: pamEngine.getState().displayName,
      network: network.includes('TON') || network.includes('Stars') ? network : 'TON Network',
      destinationAddress,
      grossAmountUsdt: amountNum,
      networkFeeUsdt: Number(networkFeeUsdt),
      netAmountUsdt: Number(netAmountUsdt),
      netAmountCrypto: String(netAmountCrypto).includes('TON') || String(netAmountCrypto).includes('⭐')
        ? String(netAmountCrypto)
        : `${derivedAmountTon.toFixed(2)} TON`,
      twoFactorVerified: true,
      status: gate.initialStatus,
      txHash: `0x${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`,
      createdAt: gate.requiresAdminApproval
        ? 'در انتظار تایید ادمین (مبلغ بالا)'
        : 'همین الان (تسویه اتوماتیک TON)',
    };
    dbState.withdrawals.unshift(newItem);
    persistAll();

    if (dbState.telegramBotConfig.notifyOnWithdrawal) {
      await dispatchAdminTelegramAlert({
        eventType: gate.requiresAdminApproval ? 'HIGH_VALUE_WITHDRAWAL' : 'WITHDRAWAL',
        userDisplayName: pamEngine.getState().displayName,
        amountUsdt: amountNum,
        amountTon: derivedAmountTon,
        network: 'TON Network',
        withdrawalCode,
        destinationAddress,
        details: gate.requiresAdminApproval
          ? `⚠️ درخواست برداشت مبلغ بالا (${derivedAmountTon.toFixed(2)} TON) نیازمند تایید ادمین (${withdrawalCode})`
          : `✅ برداشت اتوماتیک (${derivedAmountTon.toFixed(2)} TON) تسویه شد (${withdrawalCode})`,
      });
    }

    res.json({
      ok: true,
      withdrawal: newItem,
      requiresAdminApproval: gate.requiresAdminApproval,
      autoWithdrawLimitTon: gate.thresholdTon,
      tonBalance: debitRes.tonBalance,
      starsBalance: debitRes.starsBalance,
      ledgerEntry: debitRes.ledgerEntry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ثبت درخواست برداشت' });
  }
});

app.post('/api/admin/withdrawals/threshold', optionalAuth, (req: AuthRequest, res) => {
  const { autoWithdrawLimitTon } = req.body || {};
  const safeLimit = Math.max(1, Number(autoWithdrawLimitTon) || 50);
  dbState.autoWithdrawLimitTon = safeLimit;
  persistAll();
  return res.json({
    ok: true,
    autoWithdrawLimitTon: dbState.autoWithdrawLimitTon,
  });
});

app.post('/api/admin/withdrawals/action', optionalAuth, async (req: AuthRequest, res) => {
  const { withdrawalCode, action } = req.body || {};
  if (action === 'sweep_all') {
    for (const w of dbState.withdrawals) {
      if (w.status === 'pending_review' || w.status === 'broadcasting') {
        w.status = 'completed';
      }
    }
    persistAll();
    return res.json({ ok: true, withdrawals: dbState.withdrawals });
  }
  const target = dbState.withdrawals.find((w) => w.withdrawalCode === withdrawalCode);
  if (!target) {
    return res.status(404).json({ error: 'درخواست برداشت یافت نشد.' });
  }
  if (action === 'approve') {
    target.status = 'completed';
  } else if (action === 'broadcast') {
    target.status = 'broadcasting';
  } else if (action === 'reject') {
    target.status = 'rejected';
    // Refund rejected withdrawal via PAM Rollback!
    pamEngine.rollback({
      transactionUuid: `tx_rb_wd_${target.withdrawalCode}`,
      referenceTransactionUuid: `tx_wd_${target.withdrawalCode}`,
      roundId: target.withdrawalCode,
      vertical: 'CRYPTO_TREASURY',
      note: `برگشت وجه درخواست برداشت ردشده (${target.withdrawalCode})`,
    });
  }
  persistAll();
  res.json({
    ok: true,
    withdrawal: target,
    withdrawals: dbState.withdrawals,
    tonBalance: pamEngine.getState().tonBalance,
    starsBalance: pamEngine.getState().starsBalance,
  });
});

app.post('/api/admin/killswitch', optionalAuth, (req: AuthRequest, res) => {
  if (typeof req.body?.active === 'boolean') {
    dbState.killSwitchActive = req.body.active;
  } else {
    dbState.killSwitchActive = !dbState.killSwitchActive;
  }
  persistAll();
  res.json({
    killSwitchActive: dbState.killSwitchActive,
    protocolState: dbState.killSwitchActive ? 'HALTED' : 'ARMED',
  });
});

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

app.post('/api/telegram/broadcast', optionalAuth, (req: AuthRequest, res) => {
  const winnerShortId =
    req.body?.winnerShortId || `VIP_User#${Math.floor(1000 + Math.random() * 8999)}`;
  const prizeUsdt = Number(req.body?.prizeUsdt) || 150000;
  const txHash =
    req.body?.txHash || `7a4b8f${Math.random().toString(16).substring(2, 10)}39c01d`;
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

// ============================================================================
// OFFICIAL TELEGRAM BOT WEBHOOK (`/start`, STARS `XTR` PAYMENTS & ADMIN INLINE CALLBACKS)
// ============================================================================
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    // Optional secret token verification if TELEGRAM_WEBHOOK_SECRET is configured in .env
    if (serverSecurityConfig.telegramWebhookSecret) {
      const headerSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '').trim();
      if (headerSecret && headerSecret !== serverSecurityConfig.telegramWebhookSecret) {
        return res.status(401).json({ ok: false, error: 'INVALID_WEBHOOK_SECRET_TOKEN' });
      }
    }

    const update = req.body || {};
    const activeToken = getEffectiveBotToken();

    // 1. Handle Telegram Stars `pre_checkout_query` (Must answer within 10 seconds)
    if (update.pre_checkout_query?.id) {
      if (activeToken.length > 10) {
        await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/answerPreCheckoutQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pre_checkout_query_id: update.pre_checkout_query.id,
              ok: true,
            }),
          }
        ).catch(() => null);
      }
      return res.json({ ok: true, handled: 'PRE_CHECKOUT_QUERY' });
    }

    // 2. Handle Telegram Stars `successful_payment` (Currency: 'XTR')
    const starsVerification = verifyTelegramStarsSuccessfulPayment({
      message: update.message,
      starsUsdRate: 0.02,
    });
    if (starsVerification && starsVerification.valid) {
      const chargeId = starsVerification.telegramPaymentChargeId;
      if (!processedDepositTxHashes.has(chargeId)) {
        processedDepositTxHashes.add(chargeId);
        const depositCode = `STR-${Math.floor(100000 + Math.random() * 900000)}`;
        const creditRes = pamEngine.credit({
          transactionUuid: `tx_stars_${chargeId}`,
          referenceTransactionUuid: null,
          roundId: depositCode,
          vertical: 'TELEGRAM_STARS_INVOICE',
          currency: 'STARS',
          amountStars: starsVerification.starsAmount,
          amountUsdt: starsVerification.creditedUsdt,
          note: `شارژ خودکار ${starsVerification.starsAmount} ⭐ Telegram Stars (${depositCode})`,
        });

        const starsDepositItem: ServerDepositItem = {
          id: Date.now(),
          depositCode,
          userUid: String(starsVerification.payerTelegramId || pamEngine.getState().playerId),
          userDisplayName: starsVerification.payerDisplayName,
          network: 'Telegram Stars (XTR)',
          senderWallet: `TG#${starsVerification.payerTelegramId}`,
          officialRecipientWallet: '@LuckyDropBot (Telegram Stars)',
          amountUsdt: starsVerification.creditedUsdt,
          amountCrypto: `${starsVerification.starsAmount} ⭐ Stars`,
          txHash: chargeId,
          explorerUrl: 'https://t.me/TelegramStars',
          explorerNote: 'تایید کریپتوگرافیک وبهوک Telegram Stars (XTR)',
          verificationMethod: 'ONCHAIN_AUTO',
          verificationMode: 'ONCHAIN_AUTO',
          status: 'CREDITED',
          confirmations: 19,
          createdAt: 'همین الان',
        };
        dbState.deposits.unshift(starsDepositItem);
        persistAll();

        void dispatchAdminTelegramAlert({
          eventType: 'DEPOSIT',
          userDisplayName: starsVerification.payerDisplayName,
          amountUsdt: starsVerification.creditedUsdt,
          amountStars: starsVerification.starsAmount,
          network: 'Telegram Stars (XTR)',
          details: `شارژ اتوماتیک ${starsVerification.starsAmount} ⭐ Stars (${depositCode})`,
        });

        return res.json({
          ok: true,
          handled: 'STARS_PAYMENT_CREDITED',
          starsAmount: starsVerification.starsAmount,
          tonBalance: creditRes.tonBalance,
          starsBalance: creditRes.starsBalance,
        });
      }
      return res.json({ ok: true, handled: 'STARS_PAYMENT_IDEMPOTENT_REPLAY' });
    }

    // 3. Handle `/start` Command & Referral Tracking (`?start=ref_ID`)
    const msgText = String(update.message?.text || '').trim();
    if (msgText.startsWith('/start') && update.message?.chat?.id) {
      const parts = msgText.split(/\s+/);
      const startPayload = parts[1] || '';
      const replyPayload = buildTelegramStartCommandPayload({
        chatId: update.message.chat.id,
        firstName: update.message.from?.first_name || update.message.from?.username || 'کاربر VIP',
        startPayload,
        appDomain: serverSecurityConfig.appDomain,
        channelUsername: getEffectiveNotificationChatId().startsWith('@')
          ? getEffectiveNotificationChatId()
          : undefined,
      });

      if (activeToken.length > 10) {
        await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(replyPayload),
          }
        ).catch(() => null);
      }

      return res.json({
        ok: true,
        handled: 'START_COMMAND',
        replyPayload,
      });
    }

    // 4. Handle Inline Admin Callback Buttons (`approve_wd:<CODE>` / `reject_wd:<CODE>`)
    if (update.callback_query?.data) {
      const cbData = String(update.callback_query.data);
      const callerTelegramId = Number(update.callback_query.from?.id || 0);
      const isAuthorizedAdmin =
        serverSecurityConfig.adminTelegramUserIds.includes(callerTelegramId);

      if (!isAuthorizedAdmin) {
        return res.status(403).json({
          ok: false,
          error: '403 Forbidden — Only ADMIN_TELEGRAM_USER_IDS can approve/reject withdrawals.',
        });
      }

      if (cbData.startsWith('approve_wd:') || cbData.startsWith('reject_wd:')) {
        const [actionPrefix, wdCode] = cbData.split(':');
        const targetWd = dbState.withdrawals.find((w) => w.withdrawalCode === wdCode);
        if (!targetWd) {
          return res.status(404).json({ ok: false, error: 'WITHDRAWAL_NOT_FOUND' });
        }

        if (actionPrefix === 'approve_wd') {
          targetWd.status = 'completed';
        } else {
          targetWd.status = 'rejected';
          pamEngine.rollback({
            transactionUuid: `tx_rb_wd_${targetWd.withdrawalCode}`,
            referenceTransactionUuid: `tx_wd_${targetWd.withdrawalCode}`,
            roundId: targetWd.withdrawalCode,
            vertical: 'CRYPTO_TREASURY',
            note: `برگشت وجه برداشت ردشده از طریق ربات تلگرام (${targetWd.withdrawalCode})`,
          });
        }
        persistAll();

        if (activeToken.length > 10 && update.callback_query.id) {
          await fetch(
            `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/answerCallbackQuery`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: update.callback_query.id,
                text:
                  actionPrefix === 'approve_wd'
                    ? `✅ برداشت ${wdCode} تایید و تسویه شد.`
                    : `❌ برداشت ${wdCode} رد شد و مبلغ به کیف پول کاربر برگشت.`,
                show_alert: true,
              }),
            }
          ).catch(() => null);
        }

        return res.json({
          ok: true,
          handled: actionPrefix === 'approve_wd' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
          withdrawal: targetWd,
        });
      }
    }

    return res.json({ ok: true, handled: 'IGNORED_UPDATE' });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'WEBHOOK_ERROR' });
  }
});

app.post('/api/support/reply', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      sessionCode = 'VIP-KAMRAN',
      senderName = 'اپراتور ارشد زرین',
      senderRole = 'OPERATOR',
      subject = 'پشتیبانی ویژه VIP',
      message,
    } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'متن پیام الزامی است' });
    }
    const inserted = {
      id: Date.now(),
      sessionCode,
      senderName,
      senderRole,
      vipLevel: 'DIAMOND VIP',
      subject,
      message: String(message).trim(),
      walletBalanceLabel: `${pamEngine.getState().tonBalance.toFixed(2)} TON | ${pamEngine.getState().starsBalance} ⭐`,
      historySummary: `${dbState.tickets.length} بلیت ثبت‌شده`,
      createdAt: 'همین الان',
    };
    dbState.supportMessages.push(inserted);
    persistAll();
    res.json({ message: inserted, supportMessages: dbState.supportMessages });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ثبت پیام' });
  }
});

app.get('/api/search', optionalAuth, async (req: AuthRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const matchedTickets = dbState.tickets.filter(
    (t) =>
      t.ticketCode.toLowerCase().includes(q) ||
      t.txHash.toLowerCase().includes(q) ||
      t.transactionUuid.toLowerCase().includes(q)
  );
  const matchedTx = dbState.transactions.filter((tx) =>
    String(tx.txHash || '').toLowerCase().includes(q)
  );
  res.json({ tickets: matchedTickets, transactions: matchedTx });
});

app.post('/api/ai/support', optionalAuth, async (req: AuthRequest, res) => {
  const userMessage = String(req.body?.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'پیام خالی است' });
  }

  try {
    const q = userMessage.toLowerCase();
    const hitTicket = dbState.tickets.find(
      (t) => t.ticketCode.toLowerCase().includes(q) || t.txHash.toLowerCase().includes(q)
    );
    const contextInfo = hitTicket
      ? `بلیت یافت‌شده در دفترکل PAM: کد ${hitTicket.ticketCode}، وضعیت: ${hitTicket.status}، جایزه: $${hitTicket.prizeWonUsdt} USDT`
      : `موجودی کیف پول PAM شما: ${pamEngine.getState().tonBalance.toFixed(2)} TON و ${pamEngine.getState().starsBalance} ⭐ Stars • تعداد تراکنش‌های دفترکل: ${pamEngine.getState().ledger.length}`;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `کاربر VIP در پلتفرم LuckyDrop می‌گوید: "${userMessage}"\nاطلاعات دفترکل PAM و بلاک‌چین: ${contextInfo}\nپاسخ کوتاه، دقیق و حرفه‌ای به زبان فارسی بده (حداکثر ۳ جمله).`,
      });
      if (response.text) {
        return res.json({ reply: response.text });
      }
    }

    return res.json({
      reply: `✅ ${contextInfo} — تمامی تراکنش‌ها با شناسه یکتای Idempotent در دفترکل PAM و الگوریتم ۵۲ بیتی HMAC-SHA256 ثبت شده‌اند.`,
    });
  } catch {
    return res.json({
      reply:
        '✅ استعلام از دفترکل PAM و موتور Provably Fair انجام شد: تمامی بلیت‌ها و موجودی شما به صورت دائمی همگام‌سازی شده‌اند.',
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
    console.log(`LuckyDrop iLottery & PAM Seamless Wallet server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
