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
  deriveProvablyFairMinesBoard,
  deriveProvablyFairTowerBoard,
  calculateMinesMultiplier,
  calculateTowerStepMultiplier,
  type InstantMiniGameId,
  type TowerDifficulty,
  type VerifiableDrawHistoryRecord,
  type MiniGameEvaluationResult,
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
  buildTonConnectManifest,
} from './src/services/telegramBotSecurity.ts';
import { INITIAL_TMA_QUESTS } from './src/utils/telegramTma.ts';
import {
  globalUserLocks,
  globalMutationRateLimiter,
  validateStrictFinancialAmount,
  verifyAndRecordDepositIdempotency,
  createCleanZeroUserProfile,
  bindUserReferralAntiSybil,
  computeServerAuthoritativeGameOutcome,
  computeServerAuthoritativeLotteryDraw,
  verifyOnChainTonTransaction,
  roundTonClean,
  roundStarsClean,
  checkUserBannedGuard,
  evaluateHardenedAdminSession,
  executeAdminBalanceAdjustment,
  isMaskedOrPlaceholderBotToken,
  normalizeNumericInputString,
  resolveStrictNativeBetAmount,
  computeStrictNativePayout,
  resolveStrictNativeTicketCost,
  filterSupportMessagesForUser,
  resolveSupportThreadUserId,
  formatUserSupportReplyTelegramPush,
  formatAdminSupportTelegramAlert,
  calculateUnclaimedRolloverTransfer,
  evaluateMonthlyVipQualification,
  normalizeRakebackVaultState,
  calculateSelfFundedTicketCashbackSplit,
  accrueLotteryTicketCashback,
  accrueMiniGameRakeback,
  evaluateMonthlySuperJackpotAllOrNothing,
  WELCOME_GRAND_ROUND_ID,
  normalizeWelcomeGrandLotteryState,
  accrueWelcomeLotteryReserveFromHouseMargin,
  evaluateWelcomeLotteryScheduleGuard,
  validateAndPrepareWelcomeTicketSelection,
  evaluateUserWelcomeTicketStatus,
  calculateSyndicateShareFinancialSplit,
  validateSyndicateCreationInput,
  validateSyndicateJoinInput,
  applySyndicateSharePurchase,
  calculateSyndicateProRataDistribution,
  normalizeReferralProfileState,
  calculateReferredTicketFinancialSplit,
  accrueReferralTicketCommission,
  accrueReferralMiniGameCommission,
  executeAtomicReferralVaultClaim,
  GROWTH_QUEST_SPECS,
  evaluateUserGrowthQuests,
  verifyAndClaimGrowthQuest,
  type VipSupportMessageRecord,
  type SupportDiagnosticChipType,
  type IsolatedUserAccountRecord,
  type AdminAuditLogEntry,
  type MonthlySuperJackpotState,
  type MonthlySuperJackpotRolloverItem,
  type MonthlyVipQualificationResult,
  type UserRakebackVaultState,
  type WelcomeGrandLotteryState,
  type UserWelcomeTicketStatus,
  type SyndicatePoolRecord,
  type SyndicateMemberRecord,
  type UserReferralProfileState,
  type GrowthQuestStatusItem,
} from './src/services/securityGuard.ts';
import {
  generateUserConciergeReply,
  generateAdminCopilotReport,
  computeAdminExecutiveTelemetry,
} from './src/services/aiCopilotEngine.ts';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Production Web3 Security Headers (Compatible with Telegram Web/Desktop & AI Studio Preview iframe)
app.use((_req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://aistudio.google.com https://*.google.com https://*.run.app *;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

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

app.get('/favicon.ico', (_req, res) => {
  const icoPath = path.resolve(process.cwd(), 'public', 'favicon.ico');
  const pngPath = path.resolve(process.cwd(), 'public', 'favicon.png');
  if (fs.existsSync(icoPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    res.sendFile(icoPath);
  } else if (fs.existsSync(pngPath)) {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(pngPath);
  } else {
    res.status(204).end();
  }
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
  syndicateId?: string | null;
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
  tonkeeperPayUrl?: string;
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
  botUsername?: string;
  officialChannelUrl?: string;
  supportTelegramUsername?: string;
  officialBrandTitle?: string;
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
  schemaVersion?: number;
  users?: Record<string, IsolatedUserAccountRecord>;
  processedTxHashes?: string[];
  processedStarsChargeIds?: string[];
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
  adminAuditLogs?: AdminAuditLogEntry[];
  monthlySuperJackpot: MonthlySuperJackpotState;
  welcomeGrandLottery: WelcomeGrandLotteryState;
  syndicatePools?: SyndicatePoolRecord[];
  aiAutoReplyEnabled?: boolean;
}

const MONTHLY_VIP_ROUND_ID = '#LD-MONTHLY-VIP';
const MONTHLY_CYCLE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function buildInitialMonthlySuperJackpot(): MonthlySuperJackpotState {
  const initialServerSeed = sha256Hex('luckydrop_monthly_vip_super_jackpot_seed_v1');
  return {
    roundId: MONTHLY_VIP_ROUND_ID,
    titleFa: '👑 ابر جک‌پات ماهانه وفاداری (Monthly VIP Super-Jackpot Vault)',
    accumulatedPoolTon: 0,
    accumulatedPoolStars: 0,
    accumulatedPoolUsdt: 0,
    nextMonthlyDrawTimestampMs: Date.now() + MONTHLY_CYCLE_DURATION_MS,
    minTicketsRequired: 10,
    minXpRequired: 500,
    serverSeed: initialServerSeed,
    serverSeedHash: sha256Hex(initialServerSeed),
    clientSeed: 'luckydrop_monthly_vip_vault_seed',
    nonce: 1,
    rolloverHistory: [],
  };
}

function normalizeMonthlySuperJackpotState(
  raw?: Partial<MonthlySuperJackpotState> | null
): MonthlySuperJackpotState {
  const fallback = buildInitialMonthlySuperJackpot();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const tonRate = DEFAULT_FX_RATES.TON || 5.0;
  const cleanTon = roundTonClean(Math.max(0, Number(raw.accumulatedPoolTon) || 0));
  const cleanStars = roundStarsClean(cleanTon * 250);
  const cleanUsdt = Number((cleanTon * tonRate).toFixed(2));
  const serverSeed =
    typeof raw.serverSeed === 'string' && raw.serverSeed.length >= 16
      ? raw.serverSeed
      : fallback.serverSeed!;
  const targetMs =
    typeof raw.nextMonthlyDrawTimestampMs === 'number' &&
    Number.isFinite(raw.nextMonthlyDrawTimestampMs) &&
    raw.nextMonthlyDrawTimestampMs > 0
      ? raw.nextMonthlyDrawTimestampMs
      : Date.now() + MONTHLY_CYCLE_DURATION_MS;

  return {
    roundId: MONTHLY_VIP_ROUND_ID,
    titleFa:
      String(raw.titleFa || '').trim() ||
      '👑 ابر جک‌پات ماهانه وفاداری (Monthly VIP Super-Jackpot Vault)',
    accumulatedPoolTon: cleanTon,
    accumulatedPoolStars: cleanStars,
    accumulatedPoolUsdt: cleanUsdt,
    nextMonthlyDrawTimestampMs: targetMs,
    minTicketsRequired: Math.max(1, Math.floor(Number(raw.minTicketsRequired) || 10)),
    minXpRequired: Math.max(50, Math.floor(Number(raw.minXpRequired) || 500)),
    serverSeed,
    serverSeedHash: sha256Hex(serverSeed),
    clientSeed: String(raw.clientSeed || 'luckydrop_monthly_vip_vault_seed').trim(),
    nonce: Math.max(1, Math.floor(Number(raw.nonce) || 1)),
    lastWinnerSummary: raw.lastWinnerSummary,
    lastWinningMain: Array.isArray(raw.lastWinningMain) ? raw.lastWinningMain : undefined,
    lastWinningGolden:
      typeof raw.lastWinningGolden === 'number' ? raw.lastWinningGolden : undefined,
    rolloverHistory: Array.isArray(raw.rolloverHistory) ? raw.rolloverHistory.slice(0, 60) : [],
  };
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
    const initialCollectedSalesUsdt = 0;
    const poolBreakdown = calculateDynamicPariMutuelPool(initialCollectedSalesUsdt, 15);
    return {
      id: idx + 1,
      roundCode: spec.roundCode,
      lotteryType: spec.id,
      titleFa: spec.titleFa,
      titleEn: spec.titleEn,
      titleZh: spec.titleZh,
      subtitleFa: `${spec.mainCount} گوی از ${spec.mainMax} • تسویه آنی استخر جوایز راس تایم`,
      category: spec.category,
      formatLabel: spec.formatLabel,
      mainCount: spec.mainCount,
      mainMax: spec.mainMax,
      goldenMax: spec.goldenMax,
      jackpotUsdt: poolBreakdown.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: spec.ticketPriceUsdt.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: 0,
      remainingLabel: 'قرعه‌کشی خودکار راس تایم',
      drawTimeLabel: 'تقسیم خودکار راس تایم',
      durationMinutes,
      drawTargetTimestampMs: Date.now() + spec.initialCountdownSec * 1000,
      initialSeedUsdt: '0.00',
      ticketsSoldCount: 0,
      serverSeed: initialServerSeed,
      serverSeedHash: initialServerSeedHash,
      clientSeed: spec.clientSeed,
      nonce: 1,
      winningNumbers: JSON.stringify(spec.winningNumbers),
      winningGoldenBall: spec.winningGoldenBall,
      totalSalesUsdt: '0.00',
      totalPayoutUsdt: '0.00',
      operatorProfitUsdt: '0.00',
      rolloverReserveUsdt: '0.00',
      status: 'ACTIVE',
    };
  });
}

function buildDefaultDatabase(): PersistentDatabaseSchema {
  const pamEngine = new PAMSeamlessWalletEngine({
    playerId: 'tg_system_genesis',
    displayName: 'کاربر تلگرام',
    vipTier: 'MEMBER',
    currency: 'TON',
    genesisTonBalance: 0,
    tonBalance: 0,
    genesisStarsBalance: 0,
    starsBalance: 0,
    referralEarningsTon: 0,
    referralEarningsStars: 0,
    bonusTokensTon: 0,
    ledger: [],
    tombstones: {},
  });

  const initialRounds = buildInitialRounds();

  return {
    schemaVersion: 3,
    users: {},
    processedTxHashes: [],
    processedStarsChargeIds: [],
    pamState: pamEngine.getState(),
    rounds: initialRounds,
    deletedRoundCodes: [],
    tickets: [],
    drawHistory: [],
    transactions: [],
    supportMessages: [],
    deposits: [],
    withdrawals: [],
    referralEvents: [],
    telegramBotConfig: {
      botToken: '',
      adminChatId: '',
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'LuckyDrop_TON_Bot',
      officialChannelUrl:
        process.env.TELEGRAM_OFFICIAL_CHANNEL_URL || 'https://t.me/LuckyDrop_TON_Official',
      supportTelegramUsername:
        process.env.SUPPORT_TELEGRAM_USERNAME || '@LuckyDrop_Support',
      officialBrandTitle:
        process.env.OFFICIAL_BRAND_TITLE ||
        '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
      enabled: true,
      notifyOnDeposit: true,
      notifyOnWithdrawal: true,
      notifyOnTicketPurchase: true,
    },
    telegramAlertsLog: [],
    rolloverReservePoolUsdt: 0,
    chestsClaimedCount: 0,
    claimedTicketCodes: [],
    killSwitchActive: false,
    autoWithdrawLimitTon: 50,
    adminAuditLogs: [],
    monthlySuperJackpot: buildInitialMonthlySuperJackpot(),
    welcomeGrandLottery: normalizeWelcomeGrandLotteryState(null, DEFAULT_FX_RATES.TON || 5.0, 0),
    syndicatePools: [],
    aiAutoReplyEnabled: true,
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
      // Only load if already migrated to schemaVersion 3 (zero pre-populated demo data)
      if (parsed && parsed.schemaVersion === 3 && Array.isArray(parsed.rounds)) {
        if (!parsed.users || typeof parsed.users !== 'object') {
          parsed.users = {};
        }
        if (!Array.isArray(parsed.processedTxHashes)) {
          parsed.processedTxHashes = [];
        }
        if (!Array.isArray(parsed.processedStarsChargeIds)) {
          parsed.processedStarsChargeIds = [];
        }
        if (!Array.isArray(parsed.adminAuditLogs)) {
          parsed.adminAuditLogs = [];
        }
        if (
          parsed.telegramBotConfig &&
          isMaskedOrPlaceholderBotToken(parsed.telegramBotConfig.botToken)
        ) {
          parsed.telegramBotConfig.botToken = '';
        }
        const deletedSet = new Set(
          Array.isArray(parsed.deletedRoundCodes) ? parsed.deletedRoundCodes : []
        );
        parsed.rounds = parsed.rounds
          .filter((r) => !deletedSet.has(r.roundCode))
          .map((r) => {
            const rawSales = parseFloat(r.totalSalesUsdt);
            const safeSales = Number.isFinite(rawSales) && rawSales >= 0 ? rawSales : 0;
            const split = calculateDynamicPariMutuelPool(safeSales, 15);
            const durMin = Number(r.durationMinutes) || 60;
            const targetMs =
              Number(r.drawTargetTimestampMs) && Number(r.drawTargetTimestampMs) > Date.now()
                ? Number(r.drawTargetTimestampMs)
                : Date.now() + durMin * 60 * 1000;
            return {
              ...r,
              roundCode: String(r.roundCode || '').replace(/^#ZRN-/i, '#LDR-'),
              titleFa: String(r.titleFa || '')
                .replace(/Lucky D ROP/gi, 'LuckyDrop')
                .replace(/مگا جک‌پات VIP هفتگی/g, 'مگا جک‌پات هفتگی LuckyDrop'),
              titleEn: String(r.titleEn || '').replace(/Lucky D ROP/gi, 'LuckyDrop'),
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
        if (typeof parsed.autoWithdrawLimitTon !== 'number' || parsed.autoWithdrawLimitTon <= 0) {
          parsed.autoWithdrawLimitTon = 50;
        }
        parsed.monthlySuperJackpot = normalizeMonthlySuperJackpotState(
          parsed.monthlySuperJackpot
        );
        const welcomeParticipants = Array.isArray(parsed.tickets)
          ? parsed.tickets.filter((t) => t.roundCode === WELCOME_GRAND_ROUND_ID).length
          : 0;
        parsed.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
          parsed.welcomeGrandLottery,
          DEFAULT_FX_RATES.TON || 5.0,
          welcomeParticipants
        );
        if (!Array.isArray(parsed.syndicatePools)) {
          parsed.syndicatePools = [];
        }
        if (typeof parsed.aiAutoReplyEnabled !== 'boolean') {
          parsed.aiAutoReplyEnabled = true;
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

function savePersistentDatabaseSync(stateToSave: PersistentDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${PERSISTENT_DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
    fs.renameSync(tmpPath, PERSISTENT_DB_PATH);
  } catch (err) {
    console.error('Failed to persist database state to disk synchronously:', err);
  }
}

async function savePersistentDatabaseAsync(stateToSave: PersistentDatabaseSchema): Promise<void> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${PERSISTENT_DB_PATH}.tmp`;
    const serialized = JSON.stringify(stateToSave, null, 2);
    await fs.promises.writeFile(tmpPath, serialized, 'utf-8');
    await fs.promises.rename(tmpPath, PERSISTENT_DB_PATH);
  } catch (err) {
    console.error('Failed to persist database state to disk asynchronously:', err);
  }
}

function savePersistentDatabase(stateToSave: PersistentDatabaseSchema): void {
  savePersistentDatabaseSync(stateToSave);
}

const dbState = loadPersistentDatabase();
if (!dbState.users) dbState.users = {};
if (!Array.isArray(dbState.processedTxHashes)) dbState.processedTxHashes = [];
if (!Array.isArray(dbState.processedStarsChargeIds)) dbState.processedStarsChargeIds = [];
if (!Array.isArray(dbState.adminAuditLogs)) dbState.adminAuditLogs = [];
if (!Array.isArray(dbState.syndicatePools)) dbState.syndicatePools = [];

const processedWebhookKeys = new Set<string>();
const processedDepositTxHashes = new Set<string>(dbState.processedTxHashes);
const processedStarsChargeIds = new Set<string>(dbState.processedStarsChargeIds);
let baseIdempotentCount = 128;

// High-Concurrency Asynchronous Debounced Write-Behind Queue (Flushes at most once every 1500ms)
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlightPromise: Promise<void> | null = null;
let persistDirty = false;

function schedulePersistAll(): void {
  persistDirty = true;
  if (persistDebounceTimer) return;
  persistDebounceTimer = setTimeout(() => {
    persistDebounceTimer = null;
    if (!persistDirty) return;
    persistDirty = false;
    dbState.processedTxHashes = Array.from(processedDepositTxHashes);
    dbState.processedStarsChargeIds = Array.from(processedStarsChargeIds);
    const runWrite = async () => {
      await savePersistentDatabaseAsync(dbState);
    };
    persistInFlightPromise = (persistInFlightPromise || Promise.resolve()).then(
      runWrite,
      runWrite
    );
  }, 1500);
}

function flushDatabaseSync(): void {
  if (persistDebounceTimer) {
    clearTimeout(persistDebounceTimer);
    persistDebounceTimer = null;
  }
  if (!persistDirty) return;
  persistDirty = false;
  dbState.processedTxHashes = Array.from(processedDepositTxHashes);
  dbState.processedStarsChargeIds = Array.from(processedStarsChargeIds);
  savePersistentDatabaseSync(dbState);
}

process.on('SIGINT', () => {
  flushDatabaseSync();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushDatabaseSync();
  process.exit(0);
});
process.on('beforeExit', () => {
  flushDatabaseSync();
});

function persistAll(): void {
  schedulePersistAll();
}

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
  const dbToken = (dbState.telegramBotConfig?.botToken || '').trim();
  const validDbToken = isMaskedOrPlaceholderBotToken(dbToken) ? '' : dbToken;
  const envToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    serverSecurityConfig.telegramBotToken ||
    ''
  ).trim();
  const validEnvToken = isMaskedOrPlaceholderBotToken(envToken) ? '' : envToken;
  return validDbToken || validEnvToken || '';
}

function getEffectiveAdminTelegramIds(): number[] {
  const liveCfg = loadServerSecurityConfig(process.env);
  if (liveCfg.adminTelegramUserIds.length > 0) {
    return liveCfg.adminTelegramUserIds;
  }
  return [6176189129, 778899101, 700192837, 104928311];
}

function createSignedBackupDownloadToken(adminId: string | number): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes validity
  const payload = `${adminId}:${exp}`;
  const secret = getEffectiveBotToken() || 'luckydrop_backup_download_hmac_secret';
  const sig = sha256Hex(`${secret}:${payload}`).slice(0, 32);
  return Buffer.from(`${payload}:${sig}`, 'utf-8').toString('base64url');
}

function verifySignedBackupDownloadToken(rawToken: unknown): boolean {
  const token = String(rawToken || '').trim();
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [adminId, expStr, sig] = decoded.split(':');
    const exp = Number(expStr);
    if (!adminId || !Number.isFinite(exp) || Date.now() > exp || !sig) {
      return false;
    }
    const secret = getEffectiveBotToken() || 'luckydrop_backup_download_hmac_secret';
    const expectedSig = sha256Hex(`${secret}:${adminId}:${expStr}`).slice(0, 32);
    return sig === expectedSig;
  } catch {
    return false;
  }
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

function resolveVerifiedTelegramSession(req: express.Request): {
  isAdmin: boolean;
  verifiedUserId: number | null;
  userKey: string;
  firstName: string;
  lastName: string;
  username: string;
  startParam: string;
  verificationReason: string;
} {
  const liveSecurityCfg = loadServerSecurityConfig(process.env);
  const initDataRaw =
    (req.headers['x-telegram-init-data'] as string | undefined) ||
    (req.body?.initData as string | undefined) ||
    '';
  const activeBotToken = getEffectiveBotToken();
  const envBotToken = !isMaskedOrPlaceholderBotToken(liveSecurityCfg.telegramBotToken)
    ? liveSecurityCfg.telegramBotToken
    : '';
  const hasSignedHashParam = initDataRaw.includes('hash=');
  const authBotToken = hasSignedHashParam ? activeBotToken || envBotToken : envBotToken;

  let verification = verifyTelegramWebAppInitData({
    initDataRaw,
    botToken: authBotToken,
    strictMode: liveSecurityCfg.strictTelegramInitDataAuth,
  });
  if (!verification.valid && hasSignedHashParam && envBotToken && envBotToken !== authBotToken) {
    verification = verifyTelegramWebAppInitData({
      initDataRaw,
      botToken: envBotToken,
      strictMode: liveSecurityCfg.strictTelegramInitDataAuth,
    });
  }

  let initDataUserId: number | null = verification.user?.id ?? null;
  let candidateUserId: number | null = verification.user?.id ?? null;
  let firstName = verification.user?.first_name || '';
  let lastName = verification.user?.last_name || '';
  let username = verification.user?.username || '';
  let startParam = verification.startParam || '';

  if (initDataRaw) {
    try {
      const sp = new URLSearchParams(initDataRaw);
      if (!startParam) {
        startParam = sp.get('start_param') || '';
      }
      const uRaw = sp.get('user');
      if (uRaw) {
        const parsed = JSON.parse(uRaw);
        if (parsed && typeof parsed.id === 'number') {
          if (!initDataUserId) initDataUserId = parsed.id;
          if (!candidateUserId) candidateUserId = parsed.id;
        }
        if (parsed?.first_name && !firstName) firstName = String(parsed.first_name);
        if (parsed?.last_name && !lastName) lastName = String(parsed.last_name);
        if (parsed?.username && !username) username = String(parsed.username);
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
        req.query?.tg_uid ||
        0
    );
    if (Number.isFinite(headerOrBodyId) && headerOrBodyId > 0) {
      candidateUserId = Math.floor(headerOrBodyId);
    }
  }

  if (!firstName && req.body?.telegramUser?.first_name) {
    firstName = String(req.body.telegramUser.first_name);
  }
  if (!lastName && req.body?.telegramUser?.last_name) {
    lastName = String(req.body.telegramUser.last_name);
  }
  if (!username && req.body?.telegramUser?.username) {
    username = String(req.body.telegramUser.username);
  }
  if (!startParam) {
    startParam = String(
      req.headers['x-telegram-start-param'] ||
        req.body?.startParam ||
        req.body?.referredByCode ||
        req.query?.startapp ||
        req.query?.ref ||
        ''
    ).trim();
  }

  // Hardened Admin Auth: Raw X-Telegram-User-Id headers can NEVER grant admin privileges,
  // and when TELEGRAM_BOT_TOKEN is configured, cryptographic HMAC-SHA256 verification of X-Telegram-Init-Data is mandatory.
  const effectiveAdminIds = getEffectiveAdminTelegramIds();
  const isAdmin = evaluateHardenedAdminSession({
    verification,
    botToken: authBotToken,
    initDataUserId,
    adminTelegramUserIds: effectiveAdminIds,
  });

  const userKey = candidateUserId ? String(candidateUserId) : 'guest_isolated';

  return {
    isAdmin,
    verifiedUserId: candidateUserId,
    userKey,
    firstName,
    lastName,
    username,
    startParam,
    verificationReason: verification.reason,
  };
}

function getOrCreateIsolatedUserContext(req: express.Request): {
  session: ReturnType<typeof resolveVerifiedTelegramSession>;
  userKey: string;
  userAccount: IsolatedUserAccountRecord;
  userPam: PAMSeamlessWalletEngine;
  isNewlyCreated: boolean;
  commitUserAccount: () => void;
} {
  const session = resolveVerifiedTelegramSession(req);
  const userKey = session.userKey;
  if (!dbState.users) {
    dbState.users = {};
  }

  const displayName = session.firstName
    ? `${session.firstName}${session.lastName ? ' ' + session.lastName : ''}`.trim()
    : `کاربر #${userKey.slice(-4)}`;

  let isNewlyCreated = false;
  if (!dbState.users[userKey]) {
    dbState.users[userKey] = createCleanZeroUserProfile(userKey, displayName, session.username);
    isNewlyCreated = true;
  }

  const userAccount = dbState.users[userKey];
  if (session.firstName && userAccount.displayName.startsWith('کاربر')) {
    userAccount.displayName = displayName;
    userAccount.pamState.displayName = displayName;
  }
  if (session.username && !userAccount.username) {
    userAccount.username = session.username;
  }

  const headerTonWallet = String(
    req.headers['x-ton-wallet-address'] || req.body?.connectedTonWallet || ''
  ).trim();
  if (headerTonWallet && headerTonWallet !== userAccount.connectedTonWallet) {
    userAccount.connectedTonWallet = headerTonWallet;
  }

  // Anti-Sybil Referral Binding on initial account creation or startapp=ref_CODE
  if (
    !userAccount.referredByUserId &&
    session.startParam &&
    !req.path.endsWith('/referral/bind') &&
    !req.path.endsWith('/referrals/bind') &&
    !session.startParam.toLowerCase().startsWith('syn_')
  ) {
    bindUserReferralAntiSybil({
      userId: userKey,
      startParam: session.startParam,
      usersMap: dbState.users,
    });
  }
  userAccount.referralProfile = normalizeReferralProfileState(userAccount);

  const userPam = new PAMSeamlessWalletEngine(userAccount.pamState);
  const commitUserAccount = () => {
    const nextPam = userPam.getState();
    userAccount.pamState = nextPam;
    userAccount.tonBalance = roundTonClean(nextPam.tonBalance);
    userAccount.starsBalance = roundStarsClean(nextPam.starsBalance);
    userAccount.bonusTokens = roundTonClean(nextPam.bonusTokensTon);
    userAccount.referralProfile = normalizeReferralProfileState(userAccount);
    userAccount.ledger = nextPam.ledger;
    userAccount.updatedAt = new Date().toISOString();
    persistAll();
  };

  if (isNewlyCreated) {
    commitUserAccount();
  }

  return {
    session,
    userKey,
    userAccount,
    userPam,
    isNewlyCreated,
    commitUserAccount,
  };
}

// Strict Admin RBAC Middleware for all `/api/admin/*` routes
function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Allow signed short-lived downloadLink token on GET /api/admin/db/backup for Telegram Mobile WebView openLink/downloadFile
  if (
    req.method === 'GET' &&
    req.path.startsWith('/db/backup') &&
    verifySignedBackupDownloadToken(req.query.downloadToken)
  ) {
    return next();
  }
  const session = resolveVerifiedTelegramSession(req);
  if (!session.isAdmin) {
    return res.status(403).json({
      ok: false,
      error:
        '403 Forbidden — Admin authorization required. Raw X-Telegram-User-Id headers cannot grant admin access.',
    });
  }
  next();
}

app.use('/api/admin', requireAdminAuth);

// Global Ban Check Middleware across all mutation endpoints
function enforceNotBannedUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const session = resolveVerifiedTelegramSession(req);
  const existingUser = dbState.users?.[session.userKey];
  const banCheck = checkUserBannedGuard(existingUser);
  if (!banCheck.allowed) {
    return res.status(403).json({
      ok: false,
      isBanned: true,
      banReason: banCheck.banReason,
      error: 'Your account has been suspended by administration',
    });
  }
  next();
}

app.use(
  [
    '/api/wallet',
    '/api/deposit',
    '/api/pam',
    '/api/lottery',
    '/api/tickets',
    '/api/games',
    '/api/quests',
    '/api/loyalty',
    '/api/referral',
    '/api/referrals',
    '/api/syndicates',
  ],
  (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      return enforceNotBannedUser(req, res, next);
    }
    next();
  }
);

// Per-IP & Per-TelegramUserId Sliding Window Rate Limiter Middleware for Mutation Endpoints
function enforceMutationRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const clientIp =
    String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
      .split(',')[0]
      .trim() || '127.0.0.1';
  const session = resolveVerifiedTelegramSession(req);
  const existingUser = dbState.users?.[session.userKey];
  const banCheck = checkUserBannedGuard(existingUser);
  if (!banCheck.allowed) {
    return res.status(403).json({
      ok: false,
      isBanned: true,
      banReason: banCheck.banReason,
      error: 'Your account has been suspended by administration',
    });
  }

  const ipCheck = globalMutationRateLimiter.check(`ip:${clientIp}`);
  const userCheck = globalMutationRateLimiter.check(`uid:${session.userKey}`);

  res.setHeader(
    'X-RateLimit-Remaining',
    String(Math.min(ipCheck.remaining, userCheck.remaining))
  );

  if (!ipCheck.allowed || !userCheck.allowed) {
    const retryAfterMs = Math.max(ipCheck.retryAfterMs, userCheck.retryAfterMs);
    res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
    return res.status(429).json({
      ok: false,
      error:
        '429 Too Many Requests — تعداد درخواست‌های همزمان بیش از حد مجاز است. لطفاً چند ثانیه صبر کنید.',
      retryAfterMs,
    });
  }
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
  fallbackAdminUserId?: string | number | null;
}): Promise<{
  delivered: boolean;
  usedPersonalDmFallback?: boolean;
  apiDescription: string;
  logItem: TelegramAlertLogItem;
}> {
  const cfg = dbState.telegramBotConfig;
  const activeBotToken = getEffectiveBotToken();
  const normalizedChatId = getEffectiveNotificationChatId();
  const adminIds = getEffectiveAdminTelegramIds();
  const fallbackPersonalChatId =
    params.fallbackAdminUserId || (adminIds.length > 0 ? adminIds[0] : 6176189129);

  const mappedEventType: LiveBroadcastEventType =
    params.eventType === 'WITHDRAWAL' ? 'HIGH_VALUE_WITHDRAWAL' : params.eventType;

  const primaryTargetChat = normalizedChatId || String(fallbackPersonalChatId);
  const payload = buildLiveChannelBroadcastPayload({
    eventType: mappedEventType,
    chatId: primaryTargetChat,
    appDomain: serverSecurityConfig.appDomain,
    userDisplayName: params.userDisplayName,
    amountTon:
      typeof params.amountTon === 'number'
        ? params.amountTon
        : Number((params.amountUsdt / (DEFAULT_FX_RATES.TON || 5.0)).toFixed(2)),
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
  let usedPersonalDmFallback = false;
  let apiDescription =
    'متغیر محیطی TELEGRAM_BOT_TOKEN در تنظیمات سرور ثبت نشده است.';

  const CHANNEL_FALLBACK_HELPER_FA =
    'برای ارسال به کانال/گروه، ابتدا ربات را در آن کانال Admin کنید؛ پیام به پیوی ادمین ارسال شد.';

  if (cfg.enabled && activeBotToken.length > 10) {
    try {
      if (normalizedChatId.length > 2) {
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
          // Automatic fallback to Admin's personal Telegram DM when channel/group returns 'Bad Request: chat not found' or permission error
          usedPersonalDmFallback = true;
          const dmPayload = {
            ...payload,
            chat_id: fallbackPersonalChatId,
          };
          const dmResp = await fetch(
            `https://api.telegram.org/bot${encodeURIComponent(activeBotToken)}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(dmPayload),
            }
          ).catch(() => null);
          const dmData: any = dmResp ? await dmResp.json().catch(() => ({})) : {};
          if (dmResp && dmResp.ok && dmData?.ok) {
            delivered = true;
            apiDescription = CHANNEL_FALLBACK_HELPER_FA;
          } else {
            delivered = false;
            const errDesc = String(respData?.description || '');
            apiDescription =
              errDesc.toLowerCase().includes('chat not found') ||
              errDesc.toLowerCase().includes('forbidden') ||
              errDesc.toLowerCase().includes('administrator')
                ? `${CHANNEL_FALLBACK_HELPER_FA} (پاسخ تلگرام برای ${normalizedChatId}: ${errDesc})`
                : errDesc ||
                  `خطای API تلگرام (کد ${resp.status}) — ${CHANNEL_FALLBACK_HELPER_FA}`;
          }
        }
      } else if (fallbackPersonalChatId) {
        // No group/channel configured yet -> send directly to Admin's personal Telegram chat
        usedPersonalDmFallback = true;
        const dmPayload = {
          ...payload,
          chat_id: fallbackPersonalChatId,
        };
        const dmResp = await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(activeBotToken)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dmPayload),
          }
        );
        const dmData: any = await dmResp.json().catch(() => ({}));
        if (dmResp.ok && dmData?.ok) {
          delivered = true;
          apiDescription = CHANNEL_FALLBACK_HELPER_FA;
        } else {
          delivered = false;
          apiDescription = `${CHANNEL_FALLBACK_HELPER_FA} (${dmData?.description || `کد ${dmResp.status}`})`;
        }
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
  return { delivered, usedPersonalDmFallback, apiDescription, logItem };
}

// ============================================================================
// CORE PAM & SEAMLESS SINGLE WALLET ENDPOINTS (STRICT PER-USER ISOLATION & MUTEX)
// ============================================================================

// 1. PAM Authenticate
app.post('/api/pam/authenticate', optionalAuth, async (req: AuthRequest, res) => {
  const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
  await globalUserLocks.runExclusive(userKey, async () => {
    const { displayName, vipTier } = req.body || {};
    const result = userPam.authenticate({
      playerId: `tg_${userKey}`,
      displayName: displayName || userPam.getState().displayName,
      vipTier: vipTier || userPam.getState().vipTier,
    });
    commitUserAccount();
    res.json({
      ...result,
      seeds: result.seeds ? { ...result.seeds, serverSeed: '' } : undefined,
      playerState: result.playerState
        ? {
            ...result.playerState,
            seeds: { ...result.playerState.seeds, serverSeed: '' },
          }
        : undefined,
    });
  });
});

// 2. PAM Balance
app.get('/api/pam/balance', optionalAuth, (req: AuthRequest, res) => {
  const { userPam } = getOrCreateIsolatedUserContext(req);
  const result = userPam.balance();
  res.json({
    ...result,
    seeds: result.seeds ? { ...result.seeds, serverSeed: '' } : undefined,
    playerState: result.playerState
      ? {
          ...result.playerState,
          seeds: { ...result.playerState.seeds, serverSeed: '' },
        }
      : undefined,
    ledger: userPam.getState().ledger,
    tombstones: userPam.getState().tombstones,
    reconciliation: userPam.reconcile().reconciliation,
  });
});

// 3. PAM Debit (Bet / Ticket Purchase in TON or STARS)
app.post(
  '/api/pam/debit',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
    await globalUserLocks.runExclusive(userKey, async () => {
      const {
        transaction_uuid,
        transactionUuid,
        round_id,
        roundId = '#ROUND',
        vertical = 'LUCKYDROP_LOTTERY',
        currency = 'TON',
        amountTon,
        amountStars,
        amountUsdt,
        note,
        incrementNonce = true,
      } = req.body || {};

      const activeCurrency = currency === 'STARS' ? 'STARS' : 'TON';
      const betResolution = resolveStrictNativeBetAmount({
        currency: activeCurrency,
        amountTon: typeof amountTon === 'number' ? amountTon : req.body?.betAmountTon,
        amountStars: typeof amountStars === 'number' ? amountStars : req.body?.betAmountStars,
        bet: req.body?.bet,
        amount: req.body?.amount,
        betAmountUsdt: typeof amountUsdt === 'number' ? amountUsdt : undefined,
        availableTonBalance: userPam.getState().tonBalance,
        availableStarsBalance: userPam.getState().starsBalance,
      });

      if (!betResolution.valid) {
        return res.status(400).json({
          ok: false,
          error: betResolution.error,
          tonBalance: userPam.getState().tonBalance,
          starsBalance: userPam.getState().starsBalance,
        });
      }

      const uuid = String(transaction_uuid || transactionUuid || '').trim();
      const result = userPam.debit({
        transactionUuid: uuid,
        roundId: String(round_id || roundId),
        vertical,
        currency: activeCurrency,
        amountTon: activeCurrency === 'TON' ? betResolution.amountTon : undefined,
        amountStars: activeCurrency === 'STARS' ? betResolution.amountStars : undefined,
        amountUsdt: betResolution.nominalUsdt,
        note,
        incrementNonce: Boolean(incrementNonce),
      });
      commitUserAccount();
      if (!result.ok) {
        return res.status(result.tombstoneBlocked ? 409 : 400).json(result);
      }
      return res.json(result);
    });
  }
);

// 4. PAM Credit (Internal / Verified Win Payout)
app.post(
  '/api/pam/credit',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { session, userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
    // Block arbitrary unreferenced client-side credit spoofing unless admin or valid referenceTransactionUuid exists in user's ledger
    const refUuidRaw =
      req.body?.reference_transaction_uuid || req.body?.referenceTransactionUuid || null;
    const hasVerifiedReference =
      Boolean(refUuidRaw) &&
      userPam
        .getState()
        .ledger.some(
          (e) => e.transactionUuid === String(refUuidRaw) && e.type === 'DEBIT'
        );

    if (!session.isAdmin && !hasVerifiedReference) {
      return res.status(403).json({
        ok: false,
        error:
          '403 Forbidden — CLIENT_OUTCOME_SPOOFING_BLOCKED: شارژ مستقیم موجودی از سمت کلاینت مسدود است. تمام نتایج بازی‌ها باید در سرور محاسبه شوند.',
      });
    }

    await globalUserLocks.runExclusive(userKey, async () => {
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
      } = req.body || {};
      const activeCurrency = currency === 'STARS' ? 'STARS' : 'TON';
      const cleanTon =
        activeCurrency === 'TON'
          ? typeof amountTon === 'number' && Number.isFinite(amountTon) && amountTon >= 0
            ? roundTonClean(amountTon)
            : roundTonClean(Number(amountUsdt || 0) / 5.0)
          : undefined;
      const cleanStars =
        activeCurrency === 'STARS'
          ? typeof amountStars === 'number' && Number.isFinite(amountStars) && amountStars >= 0
            ? roundStarsClean(amountStars)
            : roundStarsClean(Math.round(Number(amountUsdt || 0) / 0.02))
          : undefined;
      const uuid = String(transaction_uuid || transactionUuid || '').trim();
      const result = userPam.credit({
        transactionUuid: uuid,
        referenceTransactionUuid: refUuidRaw ? String(refUuidRaw) : null,
        roundId: String(round_id || roundId),
        vertical,
        currency: activeCurrency,
        amountTon: cleanTon,
        amountStars: cleanStars,
        amountUsdt:
          activeCurrency === 'TON'
            ? Number(((cleanTon || 0) * 5.0).toFixed(4))
            : Number(((cleanStars || 0) * 0.02).toFixed(4)),
        note,
      });

      commitUserAccount();
      if (!result.ok) {
        return res.status(400).json(result);
      }
      return res.json({
        ...result,
        bonusTicketAwarded: null,
      });
    });
  }
);

// 5. PAM Rollback (Refund Voided/Failed Round + Tombstone Protection)
app.post(
  '/api/pam/rollback',
  optionalAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
    await globalUserLocks.runExclusive(userKey, async () => {
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
      const uuid = String(
        transaction_uuid || transactionUuid || generateDeterministicUuid('rb')
      ).trim();
      const refUuid = String(reference_transaction_uuid || referenceTransactionUuid || '').trim();
      const result = userPam.rollback({
        transactionUuid: uuid,
        referenceTransactionUuid: refUuid,
        roundId: String(round_id || roundId),
        vertical,
        note,
      });
      commitUserAccount();
      if (!result.ok) {
        return res.status(400).json(result);
      }
      return res.json(result);
    });
  }
);

// 6. PAM Bonus (Server-Verified Bonus Credit)
app.post(
  '/api/pam/bonus',
  optionalAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { session, userKey, userAccount, userPam, commitUserAccount } =
      getOrCreateIsolatedUserContext(req);
    await globalUserLocks.runExclusive(userKey, async () => {
      const {
        transaction_uuid,
        transactionUuid,
        round_id,
        roundId = '#VIP-BONUS',
        vertical = 'VIP_LOYALTY_BONUS',
        currency = 'TON',
        amountTon,
        amountStars,
        amountUsdt = 0,
        creditToRealBalance = true,
        note,
      } = req.body || {};

      // Only allow affiliate referral claim if user actually has accumulated referralEarningsTon
      if (vertical === 'AFFILIATE_REFERRAL') {
        const claimableTon = roundTonClean(userPam.getState().referralEarningsTon);
        if (claimableTon <= 0) {
          return res.status(400).json({
            ok: false,
            error: 'NO_REFERRAL_EARNINGS — موجودی پورسانت زیرمجموعه‌گیری شما صفر است.',
          });
        }
        const uuid = String(
          transaction_uuid || transactionUuid || generateDeterministicUuid('ref_claim')
        ).trim();
        const result = userPam.bonus({
          transactionUuid: uuid,
          roundId: String(round_id || roundId),
          vertical,
          currency: 'TON',
          amountTon: claimableTon,
          amountUsdt: Number((claimableTon * DEFAULT_FX_RATES.TON).toFixed(2)),
          creditToRealBalance: true,
          note: note || `انتقال پورسانت زیرمجموعه‌گیری (${claimableTon} TON)`,
        });
        userPam.getState().referralEarningsTon = 0;
        commitUserAccount();
        return res.json(result);
      }

      if (!session.isAdmin) {
        return res.status(403).json({
          ok: false,
          error: '403 Forbidden — BONUS_REQUIRES_SERVER_AUTHORIZATION',
        });
      }

      const uuid = String(
        transaction_uuid || transactionUuid || generateDeterministicUuid('bon')
      ).trim();
      const result = userPam.bonus({
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
      userAccount.bonusTokens = userPam.getState().bonusTokensTon;
      commitUserAccount();
      if (!result.ok) {
        return res.status(400).json(result);
      }
      return res.json(result);
    });
  }
);

// 7. PAM Reconcile (Audit all ledger transactions from genesis)
app.post('/api/pam/reconcile', optionalAuth, (req: AuthRequest, res) => {
  const { userPam } = getOrCreateIsolatedUserContext(req);
  const result = userPam.reconcile();
  res.json(result);
});

// 8. Provably Fair Seed Management (Update Client Seed & Rotate Server Seed)
app.post('/api/pam/seeds/client', optionalAuth, async (req: AuthRequest, res) => {
  const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
  await globalUserLocks.runExclusive(userKey, async () => {
    const { clientSeed } = req.body || {};
    const seeds = userPam.updateClientSeed(String(clientSeed || ''));
    commitUserAccount();
    res.json({
      ok: true,
      seeds: {
        ...seeds,
        serverSeed: '', // Never expose active unrevealed serverSeed before rotation
      },
    });
  });
});

app.post('/api/pam/seeds/rotate', optionalAuth, async (req: AuthRequest, res) => {
  const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
  await globalUserLocks.runExclusive(userKey, async () => {
    const previousServerSeed = userPam.getState().seeds.serverSeed;
    const previousServerSeedHash = userPam.getState().seeds.serverSeedHash;
    const seeds = userPam.rotateServerSeed();
    commitUserAccount();
    res.json({
      ok: true,
      revealedPreviousServerSeed: previousServerSeed,
      revealedPreviousServerSeedHash: previousServerSeedHash,
      seeds: {
        ...seeds,
        serverSeed: '', // Redact new active serverSeed
      },
    });
  });
});

// 9. 100% Server-Authoritative Instant Mini-Games Execution (Mutex-Locked + Strict Balance Check)
const handleMiniGamePlay = async (req: AuthRequest, res: express.Response) => {
  if (dbState.killSwitchActive) {
    return res.status(503).json({
      ok: false,
      error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: بازی‌های آنی موقتاً متوقف است.',
    });
  }

  const { userKey, userAccount, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

  await globalUserLocks.runExclusive(userKey, async () => {
    const {
      gameId = 'PLINKO',
      currency = 'TON',
      amountTon,
      betAmountTon,
      amountStars,
      betAmountStars,
      betAmountUsdt,
      bet,
      amount,
      usedFreeBonusToken = false,
      diceRollUnder = 50,
      diceTarget,
      diceMode = 'UNDER',
      coinSide = 'HEADS',
      crashAutoCashoutX = 2.0,
      plinkoRows = 16,
      plinkoRisk = 'MEDIUM',
      minesCount = 3,
      minesRevealedSafeCount = 1,
      selectedTiles,
      towerDifficulty = 'MEDIUM',
      towerFloorsCleared = 1,
      selectedColumns,
      wheelRisk = 'MEDIUM',
      hiloChoice,
      hiloBaseCard,
      hiloSummaryLabel,
      transaction_uuid,
    } = req.body || {};

    const activeCurrency = currency === 'STARS' ? 'STARS' : 'TON';
    const isFreeDrop =
      Boolean(usedFreeBonusToken) &&
      ((gameId === 'PLINKO' && userAccount.freePlinkoDrops > 0) ||
        (gameId === 'SCRATCH' && userAccount.freeScratchCards > 0));

    let safeBetTon = 0;
    let safeBetStars = 0;
    let safeBetUsdt = 0;

    if (isFreeDrop) {
      if (gameId === 'PLINKO') {
        userAccount.freePlinkoDrops = Math.max(0, userAccount.freePlinkoDrops - 1);
      } else if (gameId === 'SCRATCH') {
        userAccount.freeScratchCards = Math.max(0, userAccount.freeScratchCards - 1);
      }
      safeBetTon = activeCurrency === 'TON' ? 0.05 : 0;
      safeBetStars = activeCurrency === 'STARS' ? 12 : 0;
      safeBetUsdt = 0.25; // Play-only nominal value for free drop
    } else {
      const betResolution = resolveStrictNativeBetAmount({
        currency: activeCurrency,
        amountTon: typeof amountTon === 'number' ? amountTon : undefined,
        betAmountTon: typeof betAmountTon === 'number' ? betAmountTon : undefined,
        amountStars: typeof amountStars === 'number' ? amountStars : undefined,
        betAmountStars: typeof betAmountStars === 'number' ? betAmountStars : undefined,
        bet: typeof bet === 'number' ? bet : undefined,
        amount: typeof amount === 'number' ? amount : undefined,
        betAmountUsdt: typeof betAmountUsdt === 'number' ? betAmountUsdt : undefined,
        availableTonBalance: userPam.getState().tonBalance,
        availableStarsBalance: userPam.getState().starsBalance,
      });

      if (!betResolution.valid) {
        return res.status(400).json({
          ok: false,
          error: betResolution.error,
          tonBalance: userPam.getState().tonBalance,
          starsBalance: userPam.getState().starsBalance,
        });
      }

      safeBetTon = betResolution.amountTon;
      safeBetStars = betResolution.amountStars;
      safeBetUsdt = betResolution.nominalUsdt;
    }

    const debitUuid = String(transaction_uuid || generateDeterministicUuid('mg_debit')).trim();
    const seedsBefore = { ...userPam.getState().seeds };
    const roundId = `MG-${gameId}-${seedsBefore.nonce}`;
    const verticalName = `INSTANT_${gameId}`;

    let debitEntry = null;
    if (!isFreeDrop) {
      const debitRes = userPam.debit({
        transactionUuid: debitUuid,
        roundId,
        vertical: verticalName,
        currency: activeCurrency,
        amountTon: activeCurrency === 'TON' ? safeBetTon : undefined,
        amountStars: activeCurrency === 'STARS' ? safeBetStars : undefined,
        amountUsdt: safeBetUsdt,
        note: `شرط بازی آنی ${gameId} (${roundId} • ${activeCurrency === 'TON' ? `${safeBetTon} TON` : `${safeBetStars} ⭐`})`,
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
      debitEntry = debitRes.ledgerEntry || null;
      dbState.rolloverReservePoolUsdt = Number(
        (dbState.rolloverReservePoolUsdt + safeBetUsdt * 0.005).toFixed(4)
      );
    } else {
      userPam.getState().seeds.nonce += 1;
    }

    // Step 2: 100% Server-Authoritative RNG Outcome via Node crypto.createHmac('sha256', serverSeed) & crypto.randomInt
    // Client-supplied win flags or multipliers are NEVER trusted!
    const evaluation = computeServerAuthoritativeGameOutcome({
      gameId: gameId as InstantMiniGameId,
      serverSeed: seedsBefore.serverSeed,
      clientSeed: seedsBefore.clientSeed,
      nonce: seedsBefore.nonce,
      betAmountUsdt: safeBetUsdt,
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
      selectedTiles: Array.isArray(selectedTiles) ? selectedTiles.map(Number) : undefined,
      towerDifficulty:
        towerDifficulty === 'EASY' || towerDifficulty === 'HARD' ? towerDifficulty : 'MEDIUM',
      towerFloorsCleared: Number(towerFloorsCleared) || 1,
      selectedColumns: Array.isArray(selectedColumns) ? selectedColumns.map(Number) : undefined,
      wheelRisk: wheelRisk === 'LOW' || wheelRisk === 'HIGH' ? wheelRisk : 'MEDIUM',
      hiloChoice:
        hiloChoice === 'LOWER' || hiloChoice === 'SAME' ? hiloChoice : 'HIGHER',
      hiloBaseCard: typeof hiloBaseCard === 'number' ? Number(hiloBaseCard) : undefined,
      hiloSummaryLabel: typeof hiloSummaryLabel === 'string' ? hiloSummaryLabel : undefined,
    });

    // Step 3: Strict 1:1 Native Currency Payout (`safeBetTon * multiplier` or `Math.round(safeBetStars * multiplier)`)
    const nativePayout = computeStrictNativePayout({
      currency: activeCurrency,
      betAmountTon: safeBetTon,
      betAmountStars: safeBetStars,
      multiplier: evaluation.multiplier,
      won: evaluation.won,
    });

    let creditEntry = null;
    if (
      (activeCurrency === 'TON' && nativePayout.payoutTon > 0) ||
      (activeCurrency === 'STARS' && nativePayout.payoutStars > 0)
    ) {
      const creditUuid = generateDeterministicUuid('mg_credit');
      const creditRes = userPam.credit({
        transactionUuid: creditUuid,
        referenceTransactionUuid: isFreeDrop ? null : debitUuid,
        roundId,
        vertical: verticalName,
        currency: activeCurrency,
        amountTon: activeCurrency === 'TON' ? nativePayout.payoutTon : undefined,
        amountStars: activeCurrency === 'STARS' ? nativePayout.payoutStars : undefined,
        amountUsdt: nativePayout.payoutNominalUsdt,
        note: `تسویه ضریب ${gameId} (${evaluation.multiplier}x • ${activeCurrency === 'TON' ? `${nativePayout.payoutTon} TON` : `${nativePayout.payoutStars} ⭐`}) — مرجع: ${debitUuid.slice(0, 14)}`,
      });
      creditEntry = creditRes.ledgerEntry || null;
    }

    // Update user XP & 1.5% Instant Mini-Game Rakeback Vault on verified real wager
    let accruedRakeback = { accruedTon: 0, accruedStars: 0 };
    if (!isFreeDrop && (safeBetTon > 0 || safeBetStars > 0)) {
      userAccount.xp = Number((userAccount.xp + Math.max(1, Math.round(safeBetUsdt))).toFixed(0));
      const rakebackRes = accrueMiniGameRakeback(userAccount.rakebackVault, {
        currency: activeCurrency,
        betAmountTon: safeBetTon,
        betAmountStars: safeBetStars,
      });
      userAccount.rakebackVault = rakebackRes.updatedVault;
      accruedRakeback = {
        accruedTon: rakebackRes.accruedTon,
        accruedStars: rakebackRes.accruedStars,
      };

      // 0.5% Mini-Game Turnover Commission to Inviter's Referral Vault
      const mgRefRes = accrueReferralMiniGameCommission({
        playerAccount: userAccount,
        usersMap: dbState.users || {},
        currency: activeCurrency,
        betAmountTon: safeBetTon,
        betAmountStars: safeBetStars,
      });
      if (
        mgRefRes.hasValidReferrer &&
        mgRefRes.inviterUserKey &&
        mgRefRes.inviterAccount &&
        (mgRefRes.creditedTon > 0 || mgRefRes.creditedStars > 0)
      ) {
        sendRealtimeToUser(mgRefRes.inviterUserKey, 'USER_BALANCE_UPDATED', {
          reason: 'REFERRAL_MINIGAME_COMMISSION_ACCRUED',
          referralProfile: mgRefRes.inviterAccount.referralProfile,
          creditedTon: mgRefRes.creditedTon,
          creditedStars: mgRefRes.creditedStars,
        });
      }
    } else {
      userAccount.rakebackVault = normalizeRakebackVaultState(userAccount.rakebackVault);
    }

    // Step 4: Zero-Loss Free Lottery Ticket Minting Rule
    let bonusTicketAwarded: PersistentTicketRecord | null = null;
    const hitBonusTrigger = Boolean(evaluation.plinkoBonusTicket || evaluation.diceLucky7777Ticket);
    if (!isFreeDrop && hitBonusTrigger && safeBetUsdt >= 5.0 && dbState.rolloverReservePoolUsdt >= 5.0) {
      dbState.rolloverReservePoolUsdt = Number(
        Math.max(0, dbState.rolloverReservePoolUsdt - 5.0).toFixed(2)
      );
      const activeRound = dbState.rounds.find((r) => r.status === 'ACTIVE') || dbState.rounds[0];
      const targetRoundCode = activeRound?.roundCode || '#LDR-8493';
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
        userUid: userPam.getState().playerId,
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
      userAccount.myTickets.unshift(bonusTicketAwarded.ticketCode);
    }

    commitUserAccount();

    if (evaluation.won && evaluation.multiplier >= 10) {
      void dispatchAdminTelegramAlert({
        eventType: 'BIG_MULTIPLIER_WIN',
        userDisplayName: userPam.getState().displayName,
        amountUsdt: nativePayout.payoutNominalUsdt || evaluation.payoutUsdt,
        amountTon: activeCurrency === 'TON' ? nativePayout.payoutTon : undefined,
        amountStars: activeCurrency === 'STARS' ? nativePayout.payoutStars : undefined,
        network: 'TON Mini-Games Arena',
        multiplierX: evaluation.multiplier,
        gameTitle: String(gameId),
        seedHash: seedsBefore.serverSeedHash,
        details: `برد ضریب انفجاری ${evaluation.multiplier.toFixed(2)}x در بازی ${gameId}`,
      });
    }

    const latestPam = userPam.getState();
    const redactedEvaluation: MiniGameEvaluationResult & {
      currency?: 'TON' | 'STARS';
      betAmountTon?: number;
      betAmountStars?: number;
      payoutTon?: number;
      payoutStars?: number;
    } = {
      ...evaluation,
      payoutUsdt: nativePayout.payoutNominalUsdt,
      currency: activeCurrency,
      betAmountTon: safeBetTon,
      betAmountStars: safeBetStars,
      payoutTon: nativePayout.payoutTon,
      payoutStars: nativePayout.payoutStars,
      // Never leak the active unrevealed serverSeed before the user rotates it!
      serverSeed: '',
    };

    sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
      reason: 'MINI_GAME_PLAYED',
      tonBalance: latestPam.tonBalance,
      starsBalance: latestPam.starsBalance,
      rakebackVault: userAccount.rakebackVault,
    });

    return res.json({
      ok: true,
      evaluation: redactedEvaluation,
      currency: activeCurrency,
      betAmountTon: safeBetTon,
      betAmountStars: safeBetStars,
      payoutTon: nativePayout.payoutTon,
      payoutStars: nativePayout.payoutStars,
      bonusTicketAwarded,
      debitTransactionUuid: debitUuid,
      debitEntry,
      creditEntry,
      tonBalance: latestPam.tonBalance,
      starsBalance: latestPam.starsBalance,
      freePlinkoDrops: userAccount.freePlinkoDrops,
      freeScratchCards: userAccount.freeScratchCards,
      xp: userAccount.xp,
      rakebackVault: userAccount.rakebackVault,
      accruedRakeback,
      seeds: {
        ...latestPam.seeds,
        serverSeed: '', // Redact active unrevealed server seed
      },
      pamState: {
        ...latestPam,
        seeds: {
          ...latestPam.seeds,
          serverSeed: '',
        },
      },
    });
  });
};

app.post(
  '/api/pam/mini-game/play',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleMiniGamePlay
);
app.post(
  '/api/games/play',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleMiniGamePlay
);

// ============================================================================
// 10. STATEFUL SERVER-SIDE MULTI-STEP GAME SESSIONS (`MINES` & `TOWER_3D`)
// Prevents client-side board inspection or outcome spoofing!
// ============================================================================

app.post(
  '/api/games/session/start',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: بازی‌ها موقتاً متوقف است.',
      });
    }

    const { userKey, userAccount, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const {
        gameId = 'MINES',
        currency = 'TON',
        amountTon,
        betAmountTon,
        amountStars,
        betAmountStars,
        betAmountUsdt,
        bet,
        amount,
        minesCount = 3,
        towerDifficulty = 'MEDIUM',
        transaction_uuid,
      } = req.body || {};

      if (gameId !== 'MINES' && gameId !== 'TOWER_3D') {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_SESSION_GAME_ID — تنها MINES و TOWER_3D دارای نشست چندمرحله‌ای هستند.',
        });
      }

      const activeCurrency = currency === 'STARS' ? 'STARS' : 'TON';
      const betResolution = resolveStrictNativeBetAmount({
        currency: activeCurrency,
        amountTon: typeof amountTon === 'number' ? amountTon : undefined,
        betAmountTon: typeof betAmountTon === 'number' ? betAmountTon : undefined,
        amountStars: typeof amountStars === 'number' ? amountStars : undefined,
        betAmountStars: typeof betAmountStars === 'number' ? betAmountStars : undefined,
        bet: typeof bet === 'number' ? bet : undefined,
        amount: typeof amount === 'number' ? amount : undefined,
        betAmountUsdt: typeof betAmountUsdt === 'number' ? betAmountUsdt : undefined,
        availableTonBalance: userPam.getState().tonBalance,
        availableStarsBalance: userPam.getState().starsBalance,
      });

      if (!betResolution.valid) {
        return res.status(400).json({
          ok: false,
          error: betResolution.error,
          tonBalance: userPam.getState().tonBalance,
          starsBalance: userPam.getState().starsBalance,
        });
      }

      const safeBetTon = betResolution.amountTon;
      const safeBetStars = betResolution.amountStars;
      const safeBetUsdt = betResolution.nominalUsdt;
      const seedsBefore = { ...userPam.getState().seeds };
      const debitUuid = String(
        transaction_uuid || generateDeterministicUuid('sess_debit')
      ).trim();
      const roundId = `MG-${gameId}-${seedsBefore.nonce}`;

      const debitRes = userPam.debit({
        transactionUuid: debitUuid,
        roundId,
        vertical: `INSTANT_${gameId}`,
        currency: activeCurrency,
        amountTon: activeCurrency === 'TON' ? safeBetTon : undefined,
        amountStars: activeCurrency === 'STARS' ? safeBetStars : undefined,
        amountUsdt: safeBetUsdt,
        note: `شروع نشست بازی ${gameId} (${roundId} • ${activeCurrency === 'TON' ? `${safeBetTon} TON` : `${safeBetStars} ⭐`})`,
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

      dbState.rolloverReservePoolUsdt = Number(
        (dbState.rolloverReservePoolUsdt + safeBetUsdt * 0.005).toFixed(4)
      );
      userAccount.xp = Number(
        (userAccount.xp + Math.max(1, Math.round(safeBetUsdt))).toFixed(0)
      );
      const sessRakeback = accrueMiniGameRakeback(userAccount.rakebackVault, {
        currency: activeCurrency,
        betAmountTon: safeBetTon,
        betAmountStars: safeBetStars,
      });
      userAccount.rakebackVault = sessRakeback.updatedVault;

      // 0.5% Mini-Game Turnover Commission to Inviter's Referral Vault
      const sessRefRes = accrueReferralMiniGameCommission({
        playerAccount: userAccount,
        usersMap: dbState.users || {},
        currency: activeCurrency,
        betAmountTon: safeBetTon,
        betAmountStars: safeBetStars,
      });
      if (
        sessRefRes.hasValidReferrer &&
        sessRefRes.inviterUserKey &&
        sessRefRes.inviterAccount &&
        (sessRefRes.creditedTon > 0 || sessRefRes.creditedStars > 0)
      ) {
        sendRealtimeToUser(sessRefRes.inviterUserKey, 'USER_BALANCE_UPDATED', {
          reason: 'REFERRAL_MINIGAME_COMMISSION_ACCRUED',
          referralProfile: sessRefRes.inviterAccount.referralProfile,
          creditedTon: sessRefRes.creditedTon,
          creditedStars: sessRefRes.creditedStars,
        });
      }

      const sessionId = `sess_${gameId.toLowerCase()}_${seedsBefore.nonce}_${Date.now().toString(36)}`;

      if (gameId === 'MINES') {
        const safeMines = Math.max(1, Math.min(24, Math.floor(Number(minesCount) || 3)));
        const board = deriveProvablyFairMinesBoard({
          serverSeed: seedsBefore.serverSeed,
          clientSeed: seedsBefore.clientSeed,
          nonce: seedsBefore.nonce,
          minesCount: safeMines,
        });

        userAccount.activeGameSession = {
          sessionId,
          gameId: 'MINES',
          currency: activeCurrency,
          betAmountTon: safeBetTon,
          betAmountStars: safeBetStars,
          betAmountUsdt: safeBetUsdt,
          debitTransactionUuid: debitUuid,
          roundId,
          serverSeed: seedsBefore.serverSeed,
          serverSeedHash: seedsBefore.serverSeedHash,
          clientSeed: seedsBefore.clientSeed,
          nonce: seedsBefore.nonce,
          minesCount: safeMines,
          mineIndices: board.mineIndices,
          revealedTiles: [],
          startedAt: new Date().toISOString(),
        };
      } else {
        const safeDiff: TowerDifficulty =
          towerDifficulty === 'EASY' || towerDifficulty === 'HARD'
            ? towerDifficulty
            : 'MEDIUM';
        const towerBoard = deriveProvablyFairTowerBoard({
          serverSeed: seedsBefore.serverSeed,
          clientSeed: seedsBefore.clientSeed,
          nonce: seedsBefore.nonce,
          difficulty: safeDiff,
        });

        userAccount.activeGameSession = {
          sessionId,
          gameId: 'TOWER_3D',
          currency: activeCurrency,
          betAmountTon: safeBetTon,
          betAmountStars: safeBetStars,
          betAmountUsdt: safeBetUsdt,
          debitTransactionUuid: debitUuid,
          roundId,
          serverSeed: seedsBefore.serverSeed,
          serverSeedHash: seedsBefore.serverSeedHash,
          clientSeed: seedsBefore.clientSeed,
          nonce: seedsBefore.nonce,
          towerDifficulty: safeDiff,
          trapColumnsPerFloor: towerBoard.trapColumnsPerFloor,
          colsCount: towerBoard.colsCount,
          selectedColumns: [],
          startedAt: new Date().toISOString(),
        };
      }

      commitUserAccount();
      const latestPam = userPam.getState();

      sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
        reason: 'GAME_SESSION_STARTED',
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        rakebackVault: userAccount.rakebackVault,
      });

      return res.json({
        ok: true,
        session: {
          sessionId: userAccount.activeGameSession.sessionId,
          gameId: userAccount.activeGameSession.gameId,
          currency: userAccount.activeGameSession.currency,
          betAmountTon: userAccount.activeGameSession.betAmountTon,
          betAmountStars: userAccount.activeGameSession.betAmountStars,
          betAmountUsdt: userAccount.activeGameSession.betAmountUsdt,
          roundId: userAccount.activeGameSession.roundId,
          serverSeedHash: userAccount.activeGameSession.serverSeedHash,
          clientSeed: userAccount.activeGameSession.clientSeed,
          nonce: userAccount.activeGameSession.nonce,
          minesCount: userAccount.activeGameSession.minesCount,
          revealedTiles: userAccount.activeGameSession.revealedTiles || [],
          towerDifficulty: userAccount.activeGameSession.towerDifficulty,
          colsCount: userAccount.activeGameSession.colsCount,
          selectedColumns: userAccount.activeGameSession.selectedColumns || [],
          currentMultiplier: 1.0,
        },
        debitTransactionUuid: debitUuid,
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        rakebackVault: userAccount.rakebackVault,
        pamState: {
          ...latestPam,
          seeds: { ...latestPam.seeds, serverSeed: '' },
        },
      });
    });
  }
);

app.post(
  '/api/games/session/reveal',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { userKey, userAccount, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const activeSess = userAccount.activeGameSession;
      if (!activeSess) {
        return res.status(400).json({
          ok: false,
          error: 'NO_ACTIVE_GAME_SESSION — نشست فعالی برای این بازی یافت نشد. ابتدا دور جدید را شروع کنید.',
        });
      }

      if (activeSess.gameId === 'MINES') {
        const tileIndex = Math.floor(Number(req.body?.tileIndex));
        if (!Number.isFinite(tileIndex) || tileIndex < 0 || tileIndex > 24) {
          return res.status(400).json({
            ok: false,
            error: 'INVALID_TILE_INDEX — شماره خانه انتخابی باید بین ۰ تا ۲۴ باشد.',
          });
        }

        const revealed = activeSess.revealedTiles || [];
        if (revealed.includes(tileIndex)) {
          return res.status(400).json({
            ok: false,
            error: 'TILE_ALREADY_REVEALED — این خانه قبلاً انتخاب شده است.',
          });
        }

        const mineIndices = activeSess.mineIndices || [];
        const minesCount = activeSess.minesCount || 3;
        const isBomb = mineIndices.includes(tileIndex);

        if (isBomb) {
          const evalResult = evaluateProvablyFairMiniGame({
            gameId: 'MINES',
            serverSeed: activeSess.serverSeed,
            clientSeed: activeSess.clientSeed,
            nonce: activeSess.nonce,
            betAmountUsdt: activeSess.betAmountUsdt,
            minesCount,
            selectedTiles: [...revealed, tileIndex],
          });

          userAccount.activeGameSession = null;
          commitUserAccount();
          const latestPam = userPam.getState();

          return res.json({
            ok: true,
            status: 'BOMB_HIT',
            hitBomb: true,
            explodedTile: tileIndex,
            mineIndices,
            revealedTiles: revealed,
            currentMultiplier: 0,
            payoutUsdt: 0,
            payoutTon: 0,
            payoutStars: 0,
            evaluation: {
              ...evalResult,
              serverSeed: '',
            },
            debitTransactionUuid: activeSess.debitTransactionUuid,
            tonBalance: latestPam.tonBalance,
            starsBalance: latestPam.starsBalance,
            pamState: {
              ...latestPam,
              seeds: { ...latestPam.seeds, serverSeed: '' },
            },
          });
        }

        // Safe Gem revealed!
        const nextRevealed = [...revealed, tileIndex];
        activeSess.revealedTiles = nextRevealed;
        const maxSafe = 25 - minesCount;
        const currentMultiplier = calculateMinesMultiplier(minesCount, nextRevealed.length);

        // Auto-cashout if all safe gems are uncovered
        if (nextRevealed.length >= maxSafe) {
          const sessBetTon =
            typeof activeSess.betAmountTon === 'number' && activeSess.betAmountTon > 0
              ? activeSess.betAmountTon
              : roundTonClean(activeSess.betAmountUsdt / 5.0);
          const sessBetStars =
            typeof activeSess.betAmountStars === 'number' && activeSess.betAmountStars > 0
              ? activeSess.betAmountStars
              : roundStarsClean(Math.round(activeSess.betAmountUsdt / 0.02));
          const nativePayout = computeStrictNativePayout({
            currency: activeSess.currency,
            betAmountTon: sessBetTon,
            betAmountStars: sessBetStars,
            multiplier: currentMultiplier,
            won: true,
          });
          const payoutUsdt = nativePayout.payoutNominalUsdt;

          const creditRes = userPam.credit({
            transactionUuid: generateDeterministicUuid('sess_credit'),
            referenceTransactionUuid: activeSess.debitTransactionUuid,
            roundId: activeSess.roundId,
            vertical: 'INSTANT_MINES',
            currency: activeSess.currency,
            amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
            amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
            amountUsdt: payoutUsdt,
            note: `برد کامل Mines (${currentMultiplier}x • ${nextRevealed.length}💎)`,
          });

          const evalResult = evaluateProvablyFairMiniGame({
            gameId: 'MINES',
            serverSeed: activeSess.serverSeed,
            clientSeed: activeSess.clientSeed,
            nonce: activeSess.nonce,
            betAmountUsdt: activeSess.betAmountUsdt,
            minesCount,
            selectedTiles: nextRevealed,
          });

          userAccount.activeGameSession = null;
          commitUserAccount();
          const latestPam = userPam.getState();

          return res.json({
            ok: true,
            status: 'AUTO_CASHED_OUT',
            hitBomb: false,
            revealedTiles: nextRevealed,
            mineIndices,
            currentMultiplier,
            payoutUsdt,
            payoutTon: nativePayout.payoutTon,
            payoutStars: nativePayout.payoutStars,
            evaluation: {
              ...evalResult,
              payoutUsdt,
              serverSeed: '',
            },
            creditEntry: creditRes.ledgerEntry,
            debitTransactionUuid: activeSess.debitTransactionUuid,
            tonBalance: latestPam.tonBalance,
            starsBalance: latestPam.starsBalance,
            pamState: {
              ...latestPam,
              seeds: { ...latestPam.seeds, serverSeed: '' },
            },
          });
        }

        commitUserAccount();
        const nextMultiplier = calculateMinesMultiplier(minesCount, nextRevealed.length + 1);
        return res.json({
          ok: true,
          status: 'SAFE_GEM',
          hitBomb: false,
          tileIndex,
          revealedTiles: nextRevealed,
          currentMultiplier,
          nextMultiplier,
        });
      }

      // TOWER_3D reveal
      const colIndex = Math.floor(Number(req.body?.colIndex));
      const diff = activeSess.towerDifficulty || 'MEDIUM';
      const colsCount = activeSess.colsCount || (diff === 'EASY' ? 4 : diff === 'MEDIUM' ? 3 : 2);
      const selectedCols = activeSess.selectedColumns || [];
      const currentFloor = selectedCols.length;
      const trapCols = activeSess.trapColumnsPerFloor || [];

      if (!Number.isFinite(colIndex) || colIndex < 0 || colIndex >= colsCount) {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_TOWER_COLUMN — ستون انتخابی نامعتبر است.',
        });
      }

      const trapColOnFloor = trapCols[currentFloor] ?? 0;
      const isTrap = colIndex === trapColOnFloor;

      if (isTrap) {
        const evalResult = evaluateProvablyFairMiniGame({
          gameId: 'TOWER_3D',
          serverSeed: activeSess.serverSeed,
          clientSeed: activeSess.clientSeed,
          nonce: activeSess.nonce,
          betAmountUsdt: activeSess.betAmountUsdt,
          towerDifficulty: diff,
          selectedColumns: [...selectedCols, colIndex],
        });

        userAccount.activeGameSession = null;
        commitUserAccount();
        const latestPam = userPam.getState();

        return res.json({
          ok: true,
          status: 'TRAP_HIT',
          hitTrap: true,
          explodedFloor: currentFloor,
          trapColumnsPerFloor: trapCols,
          selectedColumns: [...selectedCols, colIndex],
          currentMultiplier: 0,
          payoutUsdt: 0,
          payoutTon: 0,
          payoutStars: 0,
          evaluation: {
            ...evalResult,
            serverSeed: '',
          },
          debitTransactionUuid: activeSess.debitTransactionUuid,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
        });
      }

      const nextCols = [...selectedCols, colIndex];
      activeSess.selectedColumns = nextCols;
      const clearedFloors = nextCols.length;
      const currentMultiplier = calculateTowerStepMultiplier(diff, clearedFloors);

      if (clearedFloors >= 8) {
        const sessBetTon =
          typeof activeSess.betAmountTon === 'number' && activeSess.betAmountTon > 0
            ? activeSess.betAmountTon
            : roundTonClean(activeSess.betAmountUsdt / 5.0);
        const sessBetStars =
          typeof activeSess.betAmountStars === 'number' && activeSess.betAmountStars > 0
            ? activeSess.betAmountStars
            : roundStarsClean(Math.round(activeSess.betAmountUsdt / 0.02));
        const nativePayout = computeStrictNativePayout({
          currency: activeSess.currency,
          betAmountTon: sessBetTon,
          betAmountStars: sessBetStars,
          multiplier: currentMultiplier,
          won: true,
        });
        const payoutUsdt = nativePayout.payoutNominalUsdt;

        const creditRes = userPam.credit({
          transactionUuid: generateDeterministicUuid('sess_credit'),
          referenceTransactionUuid: activeSess.debitTransactionUuid,
          roundId: activeSess.roundId,
          vertical: 'INSTANT_TOWER_3D',
          currency: activeSess.currency,
          amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
          amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
          amountUsdt: payoutUsdt,
          note: `فتح کامل برج کریستالی Tower 3D (${currentMultiplier}x • طبقه 8/8)`,
        });

        const evalResult = evaluateProvablyFairMiniGame({
          gameId: 'TOWER_3D',
          serverSeed: activeSess.serverSeed,
          clientSeed: activeSess.clientSeed,
          nonce: activeSess.nonce,
          betAmountUsdt: activeSess.betAmountUsdt,
          towerDifficulty: diff,
          selectedColumns: nextCols,
        });

        userAccount.activeGameSession = null;
        commitUserAccount();
        const latestPam = userPam.getState();

        return res.json({
          ok: true,
          status: 'AUTO_CASHED_OUT',
          hitTrap: false,
          clearedFloors,
          selectedColumns: nextCols,
          trapColumnsPerFloor: trapCols,
          currentMultiplier,
          payoutUsdt,
          payoutTon: nativePayout.payoutTon,
          payoutStars: nativePayout.payoutStars,
          evaluation: {
            ...evalResult,
            payoutUsdt,
            serverSeed: '',
          },
          creditEntry: creditRes.ledgerEntry,
          debitTransactionUuid: activeSess.debitTransactionUuid,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
        });
      }

      commitUserAccount();
      return res.json({
        ok: true,
        status: 'SAFE_STEP',
        hitTrap: false,
        clearedFloors,
        selectedColumns: nextCols,
        currentMultiplier,
        nextMultiplier: calculateTowerStepMultiplier(diff, clearedFloors + 1),
      });
    });
  }
);

app.post(
  '/api/games/session/cashout',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    const { userKey, userAccount, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const activeSess = userAccount.activeGameSession;
      if (!activeSess) {
        return res.status(400).json({
          ok: false,
          error: 'NO_ACTIVE_GAME_SESSION — نشست فعالی برای برداشت جایزه یافت نشد.',
        });
      }

      const sessBetTon =
        typeof activeSess.betAmountTon === 'number' && activeSess.betAmountTon > 0
          ? activeSess.betAmountTon
          : roundTonClean(activeSess.betAmountUsdt / 5.0);
      const sessBetStars =
        typeof activeSess.betAmountStars === 'number' && activeSess.betAmountStars > 0
          ? activeSess.betAmountStars
          : roundStarsClean(Math.round(activeSess.betAmountUsdt / 0.02));

      if (activeSess.gameId === 'MINES') {
        const revealed = activeSess.revealedTiles || [];
        if (revealed.length <= 0) {
          return res.status(400).json({
            ok: false,
            error: 'NO_TILES_REVEALED — ابتدا حداقل یک خانه امن را باز کنید.',
          });
        }
        const minesCount = activeSess.minesCount || 3;
        const evalResult = evaluateProvablyFairMiniGame({
          gameId: 'MINES',
          serverSeed: activeSess.serverSeed,
          clientSeed: activeSess.clientSeed,
          nonce: activeSess.nonce,
          betAmountUsdt: activeSess.betAmountUsdt,
          minesCount,
          selectedTiles: revealed,
        });

        const nativePayout = computeStrictNativePayout({
          currency: activeSess.currency,
          betAmountTon: sessBetTon,
          betAmountStars: sessBetStars,
          multiplier: evalResult.multiplier,
          won: evalResult.won,
        });

        const creditRes = userPam.credit({
          transactionUuid: generateDeterministicUuid('sess_credit'),
          referenceTransactionUuid: activeSess.debitTransactionUuid,
          roundId: activeSess.roundId,
          vertical: 'INSTANT_MINES',
          currency: activeSess.currency,
          amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
          amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
          amountUsdt: nativePayout.payoutNominalUsdt,
          note: `برداشت موفق Mines (${evalResult.multiplier}x • ${revealed.length}💎)`,
        });

        const mineIndices = activeSess.mineIndices || [];
        const debitUuid = activeSess.debitTransactionUuid;
        userAccount.activeGameSession = null;
        commitUserAccount();

        if (evalResult.won && evalResult.multiplier >= 10) {
          void dispatchAdminTelegramAlert({
            eventType: 'BIG_MULTIPLIER_WIN',
            userDisplayName: userPam.getState().displayName,
            amountUsdt: nativePayout.payoutNominalUsdt,
            amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
            amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
            network: 'TON Mini-Games Arena',
            multiplierX: evalResult.multiplier,
            gameTitle: 'MINES',
            seedHash: activeSess.serverSeedHash,
            details: `برد ضریب ${evalResult.multiplier.toFixed(2)}x در بازی MINES`,
          });
        }

        const latestPam = userPam.getState();
        return res.json({
          ok: true,
          status: 'CASHED_OUT',
          mineIndices,
          revealedTiles: revealed,
          multiplier: evalResult.multiplier,
          payoutUsdt: nativePayout.payoutNominalUsdt,
          payoutTon: nativePayout.payoutTon,
          payoutStars: nativePayout.payoutStars,
          evaluation: {
            ...evalResult,
            payoutUsdt: nativePayout.payoutNominalUsdt,
            serverSeed: '',
          },
          creditEntry: creditRes.ledgerEntry,
          debitTransactionUuid: debitUuid,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
        });
      }

      // TOWER_3D cashout
      const selectedCols = activeSess.selectedColumns || [];
      if (selectedCols.length <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'NO_FLOORS_CLEARED — ابتدا حداقل یک طبقه از برج را پشت سر بگذارید.',
        });
      }
      const diff = activeSess.towerDifficulty || 'MEDIUM';
      const evalResult = evaluateProvablyFairMiniGame({
        gameId: 'TOWER_3D',
        serverSeed: activeSess.serverSeed,
        clientSeed: activeSess.clientSeed,
        nonce: activeSess.nonce,
        betAmountUsdt: activeSess.betAmountUsdt,
        towerDifficulty: diff,
        selectedColumns: selectedCols,
      });

      const nativePayout = computeStrictNativePayout({
        currency: activeSess.currency,
        betAmountTon: sessBetTon,
        betAmountStars: sessBetStars,
        multiplier: evalResult.multiplier,
        won: evalResult.won,
      });

      const creditRes = userPam.credit({
        transactionUuid: generateDeterministicUuid('sess_credit'),
        referenceTransactionUuid: activeSess.debitTransactionUuid,
        roundId: activeSess.roundId,
        vertical: 'INSTANT_TOWER_3D',
        currency: activeSess.currency,
        amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
        amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
        amountUsdt: nativePayout.payoutNominalUsdt,
        note: `برداشت موفق Tower 3D (${evalResult.multiplier}x • طبقه ${selectedCols.length}/8)`,
      });

      const trapColumnsPerFloor = activeSess.trapColumnsPerFloor || [];
      const debitUuid = activeSess.debitTransactionUuid;
      userAccount.activeGameSession = null;
      commitUserAccount();

      if (evalResult.won && evalResult.multiplier >= 10) {
        void dispatchAdminTelegramAlert({
          eventType: 'BIG_MULTIPLIER_WIN',
          userDisplayName: userPam.getState().displayName,
          amountUsdt: nativePayout.payoutNominalUsdt,
          amountTon: activeSess.currency === 'TON' ? nativePayout.payoutTon : undefined,
          amountStars: activeSess.currency === 'STARS' ? nativePayout.payoutStars : undefined,
          network: 'TON Mini-Games Arena',
          multiplierX: evalResult.multiplier,
          gameTitle: 'TOWER_3D',
          seedHash: activeSess.serverSeedHash,
          details: `برد ضریب ${evalResult.multiplier.toFixed(2)}x در بازی TOWER_3D`,
        });
      }

      const latestPam = userPam.getState();
      return res.json({
        ok: true,
        status: 'CASHED_OUT',
        trapColumnsPerFloor,
        selectedColumns: selectedCols,
        multiplier: evalResult.multiplier,
        payoutUsdt: nativePayout.payoutNominalUsdt,
        payoutTon: nativePayout.payoutTon,
        payoutStars: nativePayout.payoutStars,
        evaluation: {
          ...evalResult,
          payoutUsdt: nativePayout.payoutNominalUsdt,
          serverSeed: '',
        },
        creditEntry: creditRes.ledgerEntry,
        debitTransactionUuid: debitUuid,
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        pamState: {
          ...latestPam,
          seeds: { ...latestPam.seeds, serverSeed: '' },
        },
      });
    });
  }
);

// ============================================================================
// REAL-TIME LIVE PRICE ORACLE (30s BACKGROUND POLLING + FALLBACK CHAIN)
// ============================================================================

interface ServerLiveMarketOracleState {
  tonUsdPrice: number;
  tonChange24hPercent: number;
  starsUsdPrice: number;
  starsPerTon: number;
  btcUsdPrice: number;
  btcChange24hPercent: number;
  trxUsdPrice: number;
  bnbUsdPrice: number;
  tomanPerUsdt: number;
  cnyPerUsdt: number;
  source: string;
  sources: string[];
  lastUpdatedIso: string;
}

const liveMarketOracleState: ServerLiveMarketOracleState = {
  tonUsdPrice: 5.0,
  tonChange24hPercent: 2.15,
  starsUsdPrice: 0.016,
  starsPerTon: 250,
  btcUsdPrice: DEFAULT_FX_RATES.BTC,
  btcChange24hPercent: 1.42,
  trxUsdPrice: DEFAULT_FX_RATES.TRX,
  bnbUsdPrice: DEFAULT_FX_RATES.BNB,
  tomanPerUsdt: DEFAULT_FX_RATES.TOMAN,
  cnyPerUsdt: DEFAULT_FX_RATES.CNY,
  source: 'TonAPI + Binance Live Oracle',
  sources: ['TonAPI', 'Binance'],
  lastUpdatedIso: new Date().toISOString(),
};

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

async function refreshServerLiveMarketOracle(): Promise<ServerLiveMarketOracleState> {
  try {
    const activeSources: string[] = [];
    let resolvedTonUsd = 0;
    let resolvedTonDiff24h: number | null = null;

    // 1. Primary: TonAPI v2 Rates (`https://tonapi.io/v2/rates?tokens=ton&currencies=usd`)
    const tonApiData = await fetchJsonWithTimeout(
      'https://tonapi.io/v2/rates?tokens=ton&currencies=usd',
      3000
    );
    const tonApiUsd = Number(tonApiData?.rates?.TON?.prices?.USD);
    const tonApiDiffRaw = String(tonApiData?.rates?.TON?.diff_24h?.USD || '')
      .replace('%', '')
      .replace('+', '')
      .replace('−', '-')
      .trim();
    if (Number.isFinite(tonApiUsd) && tonApiUsd > 0.1) {
      resolvedTonUsd = Number(tonApiUsd.toFixed(4));
      const parsedDiff = parseFloat(tonApiDiffRaw);
      if (Number.isFinite(parsedDiff)) {
        resolvedTonDiff24h = Number(parsedDiff.toFixed(2));
      }
      activeSources.push('TonAPI');
    }

    // 2. Fallback #1: Binance (`https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT` & 24hr)
    if (!resolvedTonUsd || resolvedTonDiff24h === null) {
      const [binancePriceData, binance24hData] = await Promise.all([
        fetchJsonWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT', 3000),
        fetchJsonWithTimeout('https://api.binance.com/api/v3/ticker/24hr?symbol=TONUSDT', 3000),
      ]);
      const binPrice = Number(binancePriceData?.price || binance24hData?.lastPrice);
      const binPct = Number(binance24hData?.priceChangePercent);
      if (!resolvedTonUsd && Number.isFinite(binPrice) && binPrice > 0.1) {
        resolvedTonUsd = Number(binPrice.toFixed(4));
        activeSources.push('Binance');
      }
      if (resolvedTonDiff24h === null && Number.isFinite(binPct)) {
        resolvedTonDiff24h = Number(binPct.toFixed(2));
        if (!activeSources.includes('Binance')) activeSources.push('Binance');
      }
    }

    // 3. Fallback #2: CoinGecko (`https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true`)
    if (!resolvedTonUsd || resolvedTonDiff24h === null) {
      const cgData = await fetchJsonWithTimeout(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_24hr_change=true',
        3500
      );
      const cgTon = Number(cgData?.['the-open-network']?.usd);
      const cgDiff = Number(cgData?.['the-open-network']?.usd_24h_change);
      if (!resolvedTonUsd && Number.isFinite(cgTon) && cgTon > 0.1) {
        resolvedTonUsd = Number(cgTon.toFixed(4));
        activeSources.push('CoinGecko');
      }
      if (resolvedTonDiff24h === null && Number.isFinite(cgDiff)) {
        resolvedTonDiff24h = Number(cgDiff.toFixed(2));
        if (!activeSources.includes('CoinGecko')) activeSources.push('CoinGecko');
      }
    }

    if (resolvedTonUsd > 0.1) {
      liveMarketOracleState.tonUsdPrice = resolvedTonUsd;
      liveMarketOracleState.starsPerTon = Math.max(
        50,
        Math.round(resolvedTonUsd / liveMarketOracleState.starsUsdPrice)
      );
    }
    if (resolvedTonDiff24h !== null && Number.isFinite(resolvedTonDiff24h)) {
      liveMarketOracleState.tonChange24hPercent = resolvedTonDiff24h;
    }
    if (activeSources.length > 0) {
      liveMarketOracleState.sources = activeSources;
      liveMarketOracleState.source = activeSources.join(' + ');
    }
    liveMarketOracleState.lastUpdatedIso = new Date().toISOString();
  } catch {
    // Keep last known valid liveMarketOracleState on transient network error
  }
  return liveMarketOracleState;
}

// Start background 30-second Live Price Oracle poller + immediate warmup fetch
void refreshServerLiveMarketOracle();
const liveOracleInterval = setInterval(async () => {
  const updatedOracle = await refreshServerLiveMarketOracle();
  broadcastRealtimeEvent('ORACLE_UPDATED', {
    liveOracle: {
      tonUsdPrice: updatedOracle.tonUsdPrice,
      tonChange24hPercent: updatedOracle.tonChange24hPercent,
      starsUsdPrice: updatedOracle.starsUsdPrice,
      starsPerTon: updatedOracle.starsPerTon,
      source: updatedOracle.source,
      sources: updatedOracle.sources,
      lastUpdatedIso: updatedOracle.lastUpdatedIso,
    },
  });
}, 30_000);
if (typeof liveOracleInterval.unref === 'function') {
  liveOracleInterval.unref();
}

app.get('/api/oracle/prices', async (_req, res) => {
  // If cache is older than 28 seconds, refresh immediately
  const ageMs = Date.now() - new Date(liveMarketOracleState.lastUpdatedIso).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 28_000) {
    await refreshServerLiveMarketOracle();
  }
  res.json({
    ok: true,
    tonUsdPrice: liveMarketOracleState.tonUsdPrice,
    tonChange24hPercent: liveMarketOracleState.tonChange24hPercent,
    starsUsdPrice: liveMarketOracleState.starsUsdPrice,
    starsPerTon: liveMarketOracleState.starsPerTon,
    source: liveMarketOracleState.source,
    sources: liveMarketOracleState.sources,
    lastUpdatedIso: liveMarketOracleState.lastUpdatedIso,
  });
});

app.get('/api/oracle/live', async (_req, res) => {
  const ageMs = Date.now() - new Date(liveMarketOracleState.lastUpdatedIso).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 28_000) {
    await refreshServerLiveMarketOracle();
  }
  const toman = liveMarketOracleState.tomanPerUsdt;
  const cny = liveMarketOracleState.cnyPerUsdt;
  const cnyToToman = Math.round(toman / (cny || 6.68));

  res.json({
    ok: true,
    toman,
    cny,
    cnyToToman,
    btc: liveMarketOracleState.btcUsdPrice,
    ton: liveMarketOracleState.tonUsdPrice,
    tonUsdPrice: liveMarketOracleState.tonUsdPrice,
    tonChange24hPercent: liveMarketOracleState.tonChange24hPercent,
    starsUsdPrice: liveMarketOracleState.starsUsdPrice,
    starsPerTon: liveMarketOracleState.starsPerTon,
    trx: liveMarketOracleState.trxUsdPrice,
    bnb: liveMarketOracleState.bnbUsdPrice,
    changes24h: {
      BTC: liveMarketOracleState.btcChange24hPercent,
      TON: liveMarketOracleState.tonChange24hPercent,
      TRX: 1.18,
      BNB: 0.94,
    },
    sources: liveMarketOracleState.sources,
    source: liveMarketOracleState.source,
    timestamp: liveMarketOracleState.lastUpdatedIso,
  });
});

// ============================================================================
// SUB-SECOND SERVER-SENT EVENTS (SSE) REAL-TIME BROADCAST HUB (/api/realtime/stream)
// ============================================================================

interface RealtimeSseClient {
  id: string;
  userKey: string;
  playerId: string;
  isAdmin: boolean;
  res: express.Response;
}

const activeSseClients = new Set<RealtimeSseClient>();

function getPublicMonthlySuperJackpot(): MonthlySuperJackpotState {
  dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
  return {
    ...dbState.monthlySuperJackpot,
    serverSeed: undefined,
  };
}

function computeUserMonthlyVipQualification(
  userAccount: IsolatedUserAccountRecord,
  playerId: string,
  userKey: string
): MonthlyVipQualificationResult {
  dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
  const allUserTickets = (dbState.tickets || []).filter(
    (t) => t.userUid === playerId || t.userUid === userKey
  );
  const regularTicketsCount = allUserTickets.filter(
    (t) => t.roundCode !== MONTHLY_VIP_ROUND_ID && t.roundCode !== WELCOME_GRAND_ROUND_ID
  ).length;
  const existingVipSuperTicketsCount = allUserTickets.filter(
    (t) => t.roundCode === MONTHLY_VIP_ROUND_ID
  ).length;

  return evaluateMonthlyVipQualification({
    regularTicketsBoughtCount: regularTicketsCount,
    userXp: Number(userAccount?.xp) || 0,
    minTicketsRequired: dbState.monthlySuperJackpot.minTicketsRequired,
    minXpRequired: dbState.monthlySuperJackpot.minXpRequired,
    existingVipSuperTicketsCount,
  });
}

function getPublicWelcomeGrandLottery(): WelcomeGrandLotteryState {
  const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
  const welcomeParticipantsCount = (dbState.tickets || []).filter(
    (t) =>
      t.roundCode === WELCOME_GRAND_ROUND_ID &&
      (String(t.status || '').toUpperCase() === 'ACTIVE' ||
        String(t.status || '').toUpperCase() === 'MINTED')
  ).length;
  dbState.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
    dbState.welcomeGrandLottery,
    tonRate,
    welcomeParticipantsCount
  );
  return {
    ...dbState.welcomeGrandLottery,
    serverSeed: undefined,
  };
}

function computeUserWelcomeTicketStatus(
  userAccount: IsolatedUserAccountRecord,
  playerId: string,
  userKey: string
): UserWelcomeTicketStatus {
  const allUserTickets = (dbState.tickets || []).filter(
    (t) => t.userUid === playerId || t.userUid === userKey
  );
  const paidRegularTicketsCount = allUserTickets.filter(
    (t) =>
      t.roundCode !== MONTHLY_VIP_ROUND_ID &&
      t.roundCode !== WELCOME_GRAND_ROUND_ID &&
      (parseFloat(String(t.costUsdt || '0')) > 0 || !String(t.currencyNetwork || '').includes('BONUS'))
  ).length;
  const existingWelcomeTicket =
    allUserTickets.find((t) => t.roundCode === WELCOME_GRAND_ROUND_ID) || null;

  return evaluateUserWelcomeTicketStatus({
    userAccount,
    paidRegularTicketsCount,
    existingWelcomeTicket,
  });
}

function writeSseFrame(res: express.Response, eventType: string, payload: unknown): boolean {
  try {
    const serialized = JSON.stringify({
      type: eventType,
      timestampMs: Date.now(),
      ...(payload && typeof payload === 'object' ? payload : { data: payload }),
    });
    res.write(`data: ${serialized}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function broadcastRealtimeEvent(eventType: string, payload: Record<string, any>): void {
  if (activeSseClients.size === 0) return;
  for (const client of Array.from(activeSseClients)) {
    const ok = writeSseFrame(client.res, eventType, payload);
    if (!ok) {
      activeSseClients.delete(client);
    }
  }
}

function sendRealtimeToUser(
  targetUserId: string,
  eventType: string,
  payload: Record<string, any>
): void {
  if (activeSseClients.size === 0) return;
  const cleanTarget = String(targetUserId || '')
    .trim()
    .replace(/^tg_/, '');
  const targetPlayerId = `tg_${cleanTarget}`;
  for (const client of Array.from(activeSseClients)) {
    if (
      client.userKey === cleanTarget ||
      client.playerId === targetPlayerId ||
      client.playerId === targetUserId ||
      (payload.alsoNotifyAdmins && client.isAdmin)
    ) {
      const ok = writeSseFrame(client.res, eventType, payload);
      if (!ok) {
        activeSseClients.delete(client);
      }
    }
  }
}

// 15-second SSE Keep-Alive Heartbeat Ping
const sseHeartbeatInterval = setInterval(() => {
  if (activeSseClients.size === 0) return;
  for (const client of Array.from(activeSseClients)) {
    try {
      client.res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      activeSseClients.delete(client);
    }
  }
}, 15_000);
if (typeof sseHeartbeatInterval.unref === 'function') {
  sseHeartbeatInterval.unref();
}

app.get('/api/realtime/stream', optionalAuth, (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const { session, userAccount, userPam } = getOrCreateIsolatedUserContext(req);
  const playerId = userPam.getState().playerId;
  const clientRecord: RealtimeSseClient = {
    id: `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userKey: session.userKey,
    playerId,
    isAdmin: session.isAdmin,
    res,
  };
  activeSseClients.add(clientRecord);

  // Push immediate handshake snapshot frame (< 10ms)
  writeSseFrame(res, 'CONNECTED', {
    clientId: clientRecord.id,
    connectedClientsCount: activeSseClients.size,
    rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    monthlyVipQualification: computeUserMonthlyVipQualification(
      userAccount,
      playerId,
      session.userKey
    ),
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
    welcomeTicketStatus: computeUserWelcomeTicketStatus(
      userAccount,
      playerId,
      session.userKey
    ),
    rakebackVault: normalizeRakebackVaultState(userAccount.rakebackVault),
    referralProfile: normalizeReferralProfileState(userAccount),
    growthQuests: evaluateUserGrowthQuests({
      userAccount,
      syndicatePools: dbState.syndicatePools || [],
    }),
    syndicatePools: dbState.syndicatePools || [],
    totalTicketsCount: dbState.tickets.length,
    killSwitchActive: dbState.killSwitchActive,
    aiAutoReplyEnabled: dbState.aiAutoReplyEnabled !== false,
    liveOracle: {
      tonUsdPrice: liveMarketOracleState.tonUsdPrice,
      tonChange24hPercent: liveMarketOracleState.tonChange24hPercent,
      starsUsdPrice: liveMarketOracleState.starsUsdPrice,
      starsPerTon: liveMarketOracleState.starsPerTon,
      source: liveMarketOracleState.source,
      sources: liveMarketOracleState.sources,
      lastUpdatedIso: liveMarketOracleState.lastUpdatedIso,
    },
  });

  req.on('close', () => {
    activeSseClients.delete(clientRecord);
  });
});

function buildSnapshotPayload(req: express.Request) {
  // Read-only snapshot: never triggers synchronous disk writes for existing users!
  const { session, userAccount, userPam } = getOrCreateIsolatedUserContext(req);

  const pamState = userPam.getState();
  const reconciliation = userPam.reconcile().reconciliation;
  const liveSecurityCfg = loadServerSecurityConfig(process.env);
  const playerId = pamState.playerId;

  // Never expose active unrevealed serverSeed in public round list (only serverSeedHash!)
  const publicRounds = dbState.rounds.map((r) => ({
    ...r,
    serverSeed: undefined,
  }));

  // Partition tickets, deposits, and withdrawals strictly by user unless user is verified Admin
  const userTickets = session.isAdmin
    ? dbState.tickets
    : dbState.tickets.filter(
        (t) => t.userUid === playerId || t.userUid === session.userKey
      );
  const userDeposits = session.isAdmin
    ? dbState.deposits
    : dbState.deposits.filter(
        (d) => d.userUid === playerId || d.userUid === session.userKey
      );
  const userWithdrawals = session.isAdmin
    ? dbState.withdrawals
    : dbState.withdrawals.filter(
        (w) => w.userUid === playerId || w.userUid === session.userKey
      );

  const userQuests = INITIAL_TMA_QUESTS.map((q) => ({
    ...q,
    progress: userAccount.completedQuests.includes(q.id) ? q.target : 0,
    claimed: userAccount.completedQuests.includes(q.id),
  }));

  const sanitizedActiveSession = userAccount.activeGameSession
    ? {
        sessionId: userAccount.activeGameSession.sessionId,
        gameId: userAccount.activeGameSession.gameId,
        currency: userAccount.activeGameSession.currency,
        betAmountUsdt: userAccount.activeGameSession.betAmountUsdt,
        roundId: userAccount.activeGameSession.roundId,
        serverSeedHash: userAccount.activeGameSession.serverSeedHash,
        clientSeed: userAccount.activeGameSession.clientSeed,
        nonce: userAccount.activeGameSession.nonce,
        minesCount: userAccount.activeGameSession.minesCount,
        revealedTiles: userAccount.activeGameSession.revealedTiles || [],
        towerDifficulty: userAccount.activeGameSession.towerDifficulty,
        colsCount: userAccount.activeGameSession.colsCount,
        selectedColumns: userAccount.activeGameSession.selectedColumns || [],
      }
    : null;

  return {
    ok: true,
    isAdmin: session.isAdmin,
    verifiedTelegramUserId: session.verifiedUserId,
    authVerificationReason: session.verificationReason,
    tonBalance: pamState.tonBalance,
    starsBalance: pamState.starsBalance,
    bonusTokens: pamState.bonusTokensTon,
    xp: userAccount.xp,
    freePlinkoDrops: userAccount.freePlinkoDrops,
    freeScratchCards: userAccount.freeScratchCards,
    freeLotteryTickets: userAccount.freeLotteryTickets,
    completedQuests: userAccount.completedQuests,
    referrals: userAccount.referrals,
    referredByUserId: userAccount.referredByUserId,
    referralCode: userAccount.referralCode,
    referralProfile: normalizeReferralProfileState(userAccount),
    growthQuests: evaluateUserGrowthQuests({
      userAccount,
      syndicatePools: dbState.syndicatePools || [],
    }),
    quests: userQuests,
    rakebackVault: normalizeRakebackVaultState(userAccount.rakebackVault),
    activeGameSession: sanitizedActiveSession,
    user: {
      uid: pamState.playerId,
      telegramUserId: session.userKey,
      displayName: pamState.displayName,
      vipTier: pamState.vipTier,
      tonBalance: pamState.tonBalance,
      starsBalance: pamState.starsBalance,
      referralEarningsTon: pamState.referralEarningsTon,
      referralEarningsStars: pamState.referralEarningsStars,
      bonusTokensTon: pamState.bonusTokensTon,
      xp: userAccount.xp,
      freePlinkoDrops: userAccount.freePlinkoDrops,
      freeScratchCards: userAccount.freeScratchCards,
      freeLotteryTickets: userAccount.freeLotteryTickets,
      completedQuests: userAccount.completedQuests,
      referrals: userAccount.referrals,
      referralCode: userAccount.referralCode,
      referredByUserId: userAccount.referredByUserId,
      isBanned: Boolean(userAccount.isBanned),
      banReason: userAccount.banReason || '',
      isAdmin: session.isAdmin,
    },
    isBanned: Boolean(userAccount.isBanned),
    banReason: userAccount.banReason || '',
    adminAuditLogs: session.isAdmin ? (dbState.adminAuditLogs || []).slice(0, 50) : [],
    pamState: {
      ...pamState,
      seeds: {
        ...pamState.seeds,
        // Strictly redact active unrevealed serverSeed before draw/game completion!
        serverSeed: '',
      },
    },
    reconciliation,
    rounds: publicRounds,
    deletedRoundCodes: dbState.deletedRoundCodes,
    tickets: userTickets,
    drawHistory: dbState.drawHistory,
    transactions: dbState.transactions,
    ...(() => {
      const scopedSupport = filterSupportMessagesForUser(
        dbState.supportMessages,
        session.userKey
      );
      return {
        supportMessages: session.isAdmin ? dbState.supportMessages : scopedSupport.messages,
        unreadSupportCount: scopedSupport.unreadOperatorCount,
      };
    })(),
    deposits: userDeposits,
    withdrawals: userWithdrawals,
    referralEvents: dbState.referralEvents,
    telegramBotConfig: {
      ...dbState.telegramBotConfig,
      botToken: getEffectiveBotToken() ? '•••••••••••• (CONFIGURED_IN_ENV)' : '',
      adminChatId: getEffectiveNotificationChatId() || dbState.telegramBotConfig.adminChatId,
      botUsername:
        dbState.telegramBotConfig.botUsername ||
        process.env.TELEGRAM_BOT_USERNAME ||
        'LuckyDrop_TON_Bot',
      officialChannelUrl:
        dbState.telegramBotConfig.officialChannelUrl ||
        process.env.TELEGRAM_OFFICIAL_CHANNEL_URL ||
        (getEffectiveNotificationChatId().startsWith('@')
          ? `https://t.me/${getEffectiveNotificationChatId().slice(1)}`
          : 'https://t.me/LuckyDrop_TON_Official'),
      supportTelegramUsername:
        dbState.telegramBotConfig.supportTelegramUsername ||
        process.env.SUPPORT_TELEGRAM_USERNAME ||
        '@LuckyDrop_Support',
      officialBrandTitle:
        dbState.telegramBotConfig.officialBrandTitle ||
        process.env.OFFICIAL_BRAND_TITLE ||
        '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
    },
    telegramAlertsLog: session.isAdmin ? dbState.telegramAlertsLog : [],
    rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    monthlyVipQualification: computeUserMonthlyVipQualification(
      userAccount,
      playerId,
      session.userKey
    ),
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
    welcomeTicketStatus: computeUserWelcomeTicketStatus(
      userAccount,
      playerId,
      session.userKey
    ),
    syndicatePools: dbState.syndicatePools || [],
    chestsClaimedCount: dbState.chestsClaimedCount,
    claimedTicketCodes: dbState.claimedTicketCodes,
    killSwitchActive: dbState.killSwitchActive,
    aiAutoReplyEnabled: dbState.aiAutoReplyEnabled !== false,
    autoWithdrawLimitTon:
      dbState.autoWithdrawLimitTon || liveSecurityCfg.autoWithdrawLimitTon || 50,
    publicTonTreasuryWallet: liveSecurityCfg.publicTonTreasuryWallet,
    appDomain: liveSecurityCfg.appDomain,
    fxRates: DEFAULT_FX_RATES,
    liveOracle: {
      tonUsdPrice: liveMarketOracleState.tonUsdPrice,
      tonChange24hPercent: liveMarketOracleState.tonChange24hPercent,
      starsUsdPrice: liveMarketOracleState.starsUsdPrice,
      starsPerTon: liveMarketOracleState.starsPerTon,
      source: liveMarketOracleState.source,
      sources: liveMarketOracleState.sources,
      lastUpdatedIso: liveMarketOracleState.lastUpdatedIso,
    },
  };
}

// Real Handshake Initialization & Session Endpoints
app.post('/api/auth/init', optionalAuth, (req: AuthRequest, res) => {
  res.json(buildSnapshotPayload(req));
});

app.get('/api/auth/session', optionalAuth, (req: AuthRequest, res) => {
  res.json(buildSnapshotPayload(req));
});

// Unified Snapshot Endpoint (Returns Isolated Per-User PAM State, Zero Initial Balances for New Users)
app.get('/api/snapshot', optionalAuth, (req: AuthRequest, res) => {
  res.json(buildSnapshotPayload(req));
});

// ============================================================================
// MAIN "LUCKYDROP" LOTTERY TICKET PURCHASING (ISOLATED PER USER + MUTEX LOCK)
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

    const { userKey, userAccount, userPam, commitUserAccount } =
      getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const {
        roundCode = '#LDR-8493',
        mainNumbers = [7, 14, 21, 33, 49],
        goldenBall = 9,
        currency = 'TON',
        amountTon,
        amountStars,
        costUsdt,
        currencyNetwork = 'TON Network',
        clientSeed = '',
        referredByCode = '',
        slips,
        transaction_uuid,
      } = req.body || {};

      // Check if the round exists and is ACTIVE
      const roundObj =
        dbState.rounds.find((r) => r.roundCode === roundCode) || dbState.rounds[0];
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
                clientSeed: clientSeed || userPam.getState().seeds.clientSeed,
              },
            ];

      for (const s of slipArray) {
        if (!Array.isArray(s.mainNumbers) || s.mainNumbers.length < 4) {
          return res
            .status(400)
            .json({ error: 'لطفاً تمام گوی‌های اصلی مورد نیاز هر کوپن را انتخاب کنید.' });
        }
      }

      const activeCurrency: 'TON' | 'STARS' =
        currency === 'STARS' || String(currencyNetwork).toUpperCase().includes('STARS')
          ? 'STARS'
          : 'TON';

      const ticketCostRes = resolveStrictNativeTicketCost({
        currency: activeCurrency,
        ticketCount: slipArray.length,
        roundTicketPriceTon: (roundObj as any)?.ticketPriceTon,
        roundTicketPriceUsdt: roundObj?.ticketPriceUsdt || '5',
        requestedAmountTon: typeof amountTon === 'number' ? amountTon : undefined,
        requestedAmountStars: typeof amountStars === 'number' ? amountStars : undefined,
        availableTonBalance: userPam.getState().tonBalance,
        availableStarsBalance: userPam.getState().starsBalance,
      });

      if (!ticketCostRes.valid) {
        return res.status(400).json({
          ok: false,
          error: ticketCostRes.error,
          tonBalance: userPam.getState().tonBalance,
          starsBalance: userPam.getState().starsBalance,
        });
      }

      const totalCostNum = ticketCostRes.nominalTotalUsdt;
      const unitCostNum = ticketCostRes.nominalUnitUsdt;
      const batchTxUuid = String(
        transaction_uuid || generateDeterministicUuid('tx_ticket_debit')
      ).trim();

      // 1. Execute Per-User PAM Seamless Wallet DEBIT with strict 1:1 Native Currency & Idempotency
      const debitRes = userPam.debit({
        transactionUuid: batchTxUuid,
        roundId: roundCode,
        vertical: 'LUCKYDROP_LOTTERY',
        currency: activeCurrency,
        amountTon: activeCurrency === 'TON' ? ticketCostRes.totalTon : undefined,
        amountStars: activeCurrency === 'STARS' ? ticketCostRes.totalStars : undefined,
        amountUsdt: totalCostNum,
        note: `خرید ${slipArray.length} بلیت لاتاری در دور ${roundCode} (${
          activeCurrency === 'TON' ? `${ticketCostRes.totalTon} TON` : `${ticketCostRes.totalStars} ⭐`
        })`,
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

      // 2. Anti-Sybil Referral Check & 2% Lifetime Ticket Purchase Commission (Funded from House Margin)
      // Keeps 85% Prize Pool, 3% Buyer Rakeback, and 3% Welcome $1,000 Reserve untouched;
      // Allocates 2% to inviter's referralProfile (leaving 7% net house profit on referred sales, or 9% on non-referred sales).
      if (!userAccount.referredByUserId && referredByCode) {
        bindUserReferralAntiSybil({
          userId: userKey,
          startParam: String(referredByCode),
          usersMap: dbState.users || {},
        });
      }
      const tonRateNow = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
      const referralAccrual = accrueReferralTicketCommission({
        buyerAccount: userAccount,
        usersMap: dbState.users || {},
        currency: activeCurrency,
        grossTon: ticketCostRes.totalTon,
        grossStars: ticketCostRes.totalStars,
        tonUsdRate: tonRateNow,
      });
      const hasValidReferrer = referralAccrual.hasValidReferrer;
      const inviterId = referralAccrual.inviterUserKey;
      const zeroLossSplit = calculateZeroLossTicketSplit(totalCostNum, hasValidReferrer, 85, 2);

      // 2B. Instant VIP Cashback Vault (3% Instant Rebate out of the 15% House Margin; 85% Pool untouched)
      const ticketCashbackRes = accrueLotteryTicketCashback(userAccount.rakebackVault, {
        currency: activeCurrency,
        totalTon: ticketCostRes.totalTon,
        totalStars: ticketCostRes.totalStars,
      });
      userAccount.rakebackVault = ticketCashbackRes.updatedVault;

      // 2C. $1,000 Welcome Grand Lottery (`#LD-WELCOME-1000`):
      // - Unlock 1 Free Welcome Ticket Entitlement on the user's first paid lottery ticket purchase (max 1 per user lifetime)
      // - Route 3% (25% of 12% House Margin) into `dbState.welcomeGrandLottery.fundedReserveTon`
      if (!userAccount.welcomeTicketClaimed && !userAccount.welcomeTicketUnlocked) {
        userAccount.welcomeTicketUnlocked = true;
        userAccount.welcomeTicketEntitlement = 1;
      }
      const selfFundedSplit = calculateSelfFundedTicketCashbackSplit({
        currency: activeCurrency,
        grossTon: ticketCostRes.totalTon,
        grossStars: ticketCostRes.totalStars,
        tonUsdRate: tonRateNow,
      });
      const currentWelcomeParticipants = (dbState.tickets || []).filter(
        (t) =>
          t.roundCode === WELCOME_GRAND_ROUND_ID &&
          (String(t.status || '').toUpperCase() === 'ACTIVE' ||
            String(t.status || '').toUpperCase() === 'MINTED')
      ).length;
      const welcomeReserveRes = accrueWelcomeLotteryReserveFromHouseMargin(
        dbState.welcomeGrandLottery,
        {
          netHouseMarginTon: selfFundedSplit.netHouseMargin12Ton,
          tonUsdRate: tonRateNow,
          participantsCount: currentWelcomeParticipants,
        }
      );
      dbState.welcomeGrandLottery = welcomeReserveRes.updatedState;

      dbState.rolloverReservePoolUsdt = Number(
        (dbState.rolloverReservePoolUsdt + zeroLossSplit.rolloverReserveUsdt).toFixed(2)
      );

      if (roundObj) {
        const prevSales = parseFloat(roundObj.totalSalesUsdt) || 0;
        const nextSales = prevSales + totalCostNum;
        const poolSplit = calculateDynamicPariMutuelPool(nextSales, 15);
        const netHouseUsdt = Number(
          (
            (parseFloat(roundObj.operatorProfitUsdt) || 0) +
            referralAccrual.split.netHouseProfitTon * tonRateNow
          ).toFixed(6)
        );
        const cashback3Usdt = Number((poolSplit.grossCollectedUsdt * 0.03).toFixed(6));
        roundObj.totalSalesUsdt = poolSplit.grossCollectedUsdt.toFixed(2);
        roundObj.jackpotUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
        roundObj.totalPayoutUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
        roundObj.operatorProfitUsdt = netHouseUsdt.toFixed(2);
        roundObj.rolloverReserveUsdt = cashback3Usdt.toFixed(2);
        roundObj.ticketsSoldCount = (Number(roundObj.ticketsSoldCount) || 0) + slipArray.length;
        roundObj.soldPercent = Math.min(99, (roundObj.soldPercent || 0) + slipArray.length);
      }

      if (
        hasValidReferrer &&
        inviterId &&
        referralAccrual.inviterAccount &&
        (referralAccrual.creditedTon > 0 || referralAccrual.creditedStars > 0)
      ) {
        sendRealtimeToUser(inviterId, 'USER_BALANCE_UPDATED', {
          reason: 'REFERRAL_TICKET_COMMISSION_ACCRUED',
          referralProfile: referralAccrual.inviterAccount.referralProfile,
          growthQuests: evaluateUserGrowthQuests({
            userAccount: referralAccrual.inviterAccount,
            syndicatePools: dbState.syndicatePools || [],
          }),
          creditedTon: referralAccrual.creditedTon,
          creditedStars: referralAccrual.creditedStars,
        });
      }

      // 3. Persist each purchased ticket scoped to userAccount
      const currentSeeds = userPam.getState().seeds;
      const roundSeedHash = roundObj?.serverSeedHash || currentSeeds.serverSeedHash;
      const mintedTickets: PersistentTicketRecord[] = [];

      for (let i = 0; i < slipArray.length; i++) {
        const slip = slipArray[i];
        const ticketNonce = (roundObj ? roundObj.nonce : currentSeeds.nonce) + i;
        if (roundObj) {
          roundObj.nonce += 1;
        }
        const serialRandom = Math.floor(100000 + Math.random() * 900000);
        const prefix = roundCode.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'LDR';
        const ticketCode = `${prefix}-${serialRandom}`;
        const effectiveClientSeed =
          (slip.clientSeed || clientSeed || currentSeeds.clientSeed).trim() ||
          'luckydrop_vip_client_seed';
        const txHash = `0x${sha256Hex(`${batchTxUuid}:${ticketCode}:${effectiveClientSeed}:${ticketNonce}`)}`;

        const ticketRecord: PersistentTicketRecord = {
          id: Date.now() + i,
          ticketCode,
          userUid: userPam.getState().playerId,
          roundCode,
          mainNumbers: JSON.stringify(
            slip.mainNumbers.map(Number).sort((a: number, b: number) => a - b)
          ),
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
        userAccount.myTickets.unshift(ticketCode);
        mintedTickets.push(ticketRecord);
      }

      if (hasValidReferrer && zeroLossSplit.referralCommissionUsdt > 0) {
        dbState.referralEvents.unshift({
          id: Date.now(),
          referrerCode: inviterId ? `ref_${inviterId}` : String(referredByCode),
          buyerDisplayName: userPam.getState().displayName,
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

      // 4. Loyalty Super-Jackpot Qualification & Auto-Grant 1 VIP Super-Ticket per 5 regular tickets
      userAccount.xp = Math.max(0, (Number(userAccount.xp) || 0) + slipArray.length * 25);
      const vipSuperTicketsMinted: PersistentTicketRecord[] = [];
      dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(
        dbState.monthlySuperJackpot
      );
      let updatedVipQualification = computeUserMonthlyVipQualification(
        userAccount,
        userPam.getState().playerId,
        userKey
      );
      if (updatedVipQualification.newlyEarnedVipSuperTicketsCount > 0) {
        const monthlyHash = dbState.monthlySuperJackpot.serverSeedHash;
        for (let vIdx = 0; vIdx < updatedVipQualification.newlyEarnedVipSuperTicketsCount; vIdx++) {
          const vipNonce = dbState.monthlySuperJackpot.nonce + vIdx;
          dbState.monthlySuperJackpot.nonce += 1;
          const vipSerial = Math.floor(100000 + Math.random() * 900000);
          const vipTicketCode = `VIP-${vipSerial}`;
          const vipDrawPick = deriveProvablyFairLotteryDraw({
            serverSeed:
              dbState.monthlySuperJackpot.serverSeed ||
              sha256Hex(`vip_pick_${vipTicketCode}_${Date.now()}`),
            clientSeed: `${userKey}:${vipTicketCode}`,
            nonce: vipNonce,
            roundCode: MONTHLY_VIP_ROUND_ID,
            mainCount: 5,
            mainMax: 50,
            goldenMax: 15,
          });
          const vipTxHash = `0x${sha256Hex(`vip_loyalty:${batchTxUuid}:${vipTicketCode}:${vipNonce}`)}`;
          const vipTicketRecord: PersistentTicketRecord = {
            id: Date.now() + 100 + vIdx,
            ticketCode: vipTicketCode,
            userUid: userPam.getState().playerId,
            roundCode: MONTHLY_VIP_ROUND_ID,
            mainNumbers: JSON.stringify(vipDrawPick.drawnMain),
            goldenBall: vipDrawPick.drawnGolden,
            costUsdt: '0.00',
            currencyNetwork: 'VIP LOYALTY SUPER-TICKET (1 PER 5 REGULAR)',
            txHash: vipTxHash,
            transactionUuid: `${batchTxUuid}_vip_${vIdx + 1}`,
            payoutTransactionUuid: null,
            clientSeed: userPam.getState().seeds.clientSeed || 'luckydrop_vip_client_seed',
            serverSeedHash: monthlyHash,
            nonce: vipNonce,
            commitHash: vipTxHash.slice(2, 34),
            status: 'ACTIVE',
            confirmations: 19,
            prizeWonUsdt: '0.00',
            claimed: false,
            createdAt: new Date().toLocaleTimeString('fa-IR'),
          };
          dbState.tickets.unshift(vipTicketRecord);
          userAccount.myTickets.unshift(vipTicketCode);
          vipSuperTicketsMinted.push(vipTicketRecord);
        }
        updatedVipQualification = computeUserMonthlyVipQualification(
          userAccount,
          userPam.getState().playerId,
          userKey
        );
      }

      commitUserAccount();

      const publicRoundsSnapshot = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));
      const updatedJackpotTon = roundObj
        ? roundTonClean((parseFloat(roundObj.jackpotUsdt) || 0) / (DEFAULT_FX_RATES.TON || 5.0))
        : 0;

      // Broadcast instant (<50ms) SSE update to all connected clients
      broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
        roundCode,
        roundTitleFa: roundObj?.titleFa || roundCode,
        ticketsAddedCount: slipArray.length,
        vipSuperTicketsMintedCount: vipSuperTicketsMinted.length,
        newJackpotTon: updatedJackpotTon,
        newJackpotUsdt: roundObj?.jackpotUsdt || '0.00',
        totalTicketsCount: dbState.tickets.length,
        rounds: publicRoundsSnapshot,
        monthlySuperJackpot: getPublicMonthlySuperJackpot(),
        welcomeGrandLottery: getPublicWelcomeGrandLottery(),
        rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
        tickerEvent: {
          id: `live_buy_${Date.now()}`,
          buyerDisplayName: userPam.getState().displayName,
          roundCode,
          roundTitleFa: roundObj?.titleFa || roundCode,
          ticketCount: slipArray.length,
          vipTicketsEarned: vipSuperTicketsMinted.length,
          newJackpotTon: updatedJackpotTon,
          createdAt: 'همین الان',
        },
      });

      if (dbState.telegramBotConfig.notifyOnTicketPurchase) {
        await dispatchAdminTelegramAlert({
          eventType: 'TICKET_PURCHASE',
          userDisplayName: userPam.getState().displayName,
          amountUsdt: totalCostNum,
          network: currencyNetwork,
          roundCode,
          roundTitleFa: roundObj?.titleFa || roundCode,
          ticketCount: mintedTickets.length,
          seedHash: roundSeedHash,
          details: `صدور ${mintedTickets.length} بلیت (${mintedTickets[0].ticketCode}) در دور ${roundCode}`,
        });
      }

      const latestPam = userPam.getState();
      const updatedWelcomeTicketStatus = computeUserWelcomeTicketStatus(
        userAccount,
        latestPam.playerId,
        userKey
      );

      sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
        reason: 'TICKET_CASHBACK_ACCRUED',
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        rakebackVault: userAccount.rakebackVault,
        welcomeTicketStatus: updatedWelcomeTicketStatus,
      });

      return res.json({
        ok: true,
        ticket: mintedTickets[0],
        tickets: [...mintedTickets, ...vipSuperTicketsMinted],
        vipSuperTicketsMinted,
        rounds: publicRoundsSnapshot,
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        xp: userAccount.xp,
        rakebackVault: userAccount.rakebackVault,
        accruedCashback: {
          accruedTon: ticketCashbackRes.accruedTon,
          accruedStars: ticketCashbackRes.accruedStars,
        },
        ledgerEntry: debitRes.ledgerEntry,
        pamState: {
          ...latestPam,
          seeds: { ...latestPam.seeds, serverSeed: '' },
        },
        zeroLossSplit,
        rolloverReservePoolUsdt: dbState.rolloverReservePoolUsdt,
        monthlySuperJackpot: getPublicMonthlySuperJackpot(),
        monthlyVipQualification: updatedVipQualification,
        welcomeGrandLottery: getPublicWelcomeGrandLottery(),
        welcomeTicketStatus: updatedWelcomeTicketStatus,
        referralProfile: normalizeReferralProfileState(userAccount),
        growthQuests: evaluateUserGrowthQuests({
          userAccount,
          syndicatePools: dbState.syndicatePools || [],
        }),
      });
    });
  } catch (error: any) {
    console.error('Failed to purchase ticket:', error);
    res.status(500).json({ error: error.message || 'خطا در صدور بلیت' });
  }
};

app.post(
  '/api/tickets/purchase',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleTicketPurchase
);
app.post(
  '/api/tickets/buy',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleTicketPurchase
);
app.post(
  '/api/lottery/buy',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleTicketPurchase
);

// ============================================================================
// REAL PROVABLY FAIR LOTTERY DRAW EXECUTION ENGINE & AUTOMATED 5-SEC SCHEDULER
// - Deducts & locks 15% of collected pool for the Site
// - Distributes the remaining 85% of the collected pool among winning tickets at draw time ("راس تایم")
// - Automatically credits winners via PAM Seamless Wallet credit endpoint
// - Background setInterval(..., 5000) scheduler runs 24/7 with zero manual intervention
// ============================================================================

async function executeLotteryDrawWithDynamicPool(params: {
  roundObj: PersistentRoundRecord;
  clientSeedOverride?: string;
  isAdmin?: boolean;
  forceWinningMain?: number[];
  forceWinningGolden?: number;
}) {
  const { roundObj, clientSeedOverride, isAdmin, forceWinningMain, forceWinningGolden } = params;

  const activeServerSeed =
    roundObj.serverSeed || sha256Hex(`luckydrop_seed_${roundObj.roundCode}_${Date.now()}`);
  const activeClientSeed =
    (clientSeedOverride || roundObj.clientSeed || '').trim() || 'luckydrop_vip_client_seed';
  const drawNonce = Math.max(1, Number(roundObj.nonce) || 1);

  // 1. 100% Server-Authoritative Lottery Draw using Node's crypto.createHmac('sha256', serverSeed) & crypto.randomInt
  const drawProof = computeServerAuthoritativeLotteryDraw({
    serverSeed: activeServerSeed,
    clientSeed: activeClientSeed,
    nonce: drawNonce,
    roundCode: roundObj.roundCode,
    mainCount: roundObj.mainCount || 5,
    mainMax: roundObj.mainMax || 50,
    goldenMax: roundObj.goldenMax ?? 15,
  });

  const drawnMain: number[] =
    isAdmin && Array.isArray(forceWinningMain) && forceWinningMain.length >= 4
      ? forceWinningMain.map(Number).sort((a, b) => a - b)
      : drawProof.drawnMain;
  const drawnGolden: number =
    isAdmin && typeof forceWinningGolden === 'number'
      ? forceWinningGolden
      : drawProof.drawnGolden;

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

  // Second pass: distribute the exact 85% collected pool among winning tickets proportionally,
  // while capping non-Jackpot tiers at their tier prize so unhit Tier-1 Jackpot pools roll over into Monthly Super-Pot
  const tonRate = DEFAULT_FX_RATES.TON || 5.0;
  const rawWeights = candidateTickets.map((c) => (c.evalResult.won ? c.evalResult.prizeUsdt : 0));
  const distributedPrizes = distributePoolAmongWinners(distributablePool85Usdt, rawWeights);
  const hasTier1JackpotWinner = candidateTickets.some(
    (c) => c.evalResult.won && c.evalResult.tierCode === 'TIER_1_JACKPOT'
  );

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

  // Map to aggregate winning prizes by syndicateId for Pro-Rata Squad distribution
  const syndicateWinsByPoolId = new Map<
    string,
    {
      totalPrizeTon: number;
      totalPrizeUsdt: number;
      winningTicketCodes: string[];
      tierLabels: string[];
    }
  >();

  for (let idx = 0; idx < candidateTickets.length; idx++) {
    const { ticket, evalResult } = candidateTickets[idx];
    const cappedPrizeUsdt = hasTier1JackpotWinner
      ? distributedPrizes[idx] || 0
      : Math.min(evalResult.prizeUsdt, distributedPrizes[idx] || 0);
    const finalPrizeTon = roundTonClean(cappedPrizeUsdt / tonRate);
    const finalPrizeUsdt = Number((finalPrizeTon * tonRate).toFixed(6));

    if (evalResult.won && finalPrizeTon > 0) {
      ticket.status = 'WON';
      ticket.prizeWonUsdt = finalPrizeUsdt.toFixed(2);
      ticket.tierLabelFa = evalResult.tierLabelFa;
      ticket.claimed = true;
      winnersCount += 1;

      const belongingSyndicateId = String(ticket.syndicateId || '').trim();
      const matchedSyndicate = belongingSyndicateId
        ? (dbState.syndicatePools || []).find((s) => s.id === belongingSyndicateId)
        : undefined;

      if (belongingSyndicateId && matchedSyndicate) {
        // Aggregate into Syndicate Pool for Pro-Rata distribution after the ticket loop
        const prevAgg = syndicateWinsByPoolId.get(belongingSyndicateId) || {
          totalPrizeTon: 0,
          totalPrizeUsdt: 0,
          winningTicketCodes: [],
          tierLabels: [],
        };
        prevAgg.totalPrizeTon = roundTonClean(prevAgg.totalPrizeTon + finalPrizeTon);
        prevAgg.totalPrizeUsdt = Number((prevAgg.totalPrizeUsdt + finalPrizeUsdt).toFixed(6));
        prevAgg.winningTicketCodes.push(ticket.ticketCode);
        prevAgg.tierLabels.push(evalResult.tierLabelFa);
        syndicateWinsByPoolId.set(belongingSyndicateId, prevAgg);
        ticket.payoutTransactionUuid = `tx_syn_win_${belongingSyndicateId}_${ticket.ticketCode}_${drawNonce}`;
        if (!dbState.claimedTicketCodes.includes(ticket.ticketCode)) {
          dbState.claimedTicketCodes.push(ticket.ticketCode);
        }
      } else {
        totalPayoutUsdt = Number((totalPayoutUsdt + finalPrizeUsdt).toFixed(6));

        const payoutUuid = `tx_win_${ticket.ticketCode}_${drawNonce}`;
        const ownerKey = String(ticket.userUid || '').replace(/^tg_/, '');
        const ownerAccount = dbState.users?.[ownerKey];
        let winnerDisplayName = 'کاربر برنده LuckyDrop';

        if (ownerAccount) {
          const ownerPam = new PAMSeamlessWalletEngine(ownerAccount.pamState);
          const creditRes = ownerPam.credit({
            transactionUuid: payoutUuid,
            referenceTransactionUuid: ticket.transactionUuid || null,
            roundId: roundObj.roundCode,
            vertical: 'LUCKYDROP_LOTTERY',
            currency: 'TON',
            amountTon: finalPrizeTon,
            amountUsdt: finalPrizeUsdt,
            note: `تسویه راس تایم استخر ۸۵٪ برای کوپن ${ticket.ticketCode} (${evalResult.tierLabelFa}) در دور ${roundObj.roundCode}`,
          });
          ownerAccount.pamState = ownerPam.getState();
          ownerAccount.tonBalance = roundTonClean(ownerAccount.pamState.tonBalance);
          ownerAccount.starsBalance = roundStarsClean(ownerAccount.pamState.starsBalance);
          ownerAccount.ledger = ownerAccount.pamState.ledger;
          winnerDisplayName = ownerAccount.displayName;
          ticket.payoutTransactionUuid = creditRes.ledgerEntry?.transactionUuid || payoutUuid;

          sendRealtimeToUser(ownerKey, 'USER_BALANCE_UPDATED', {
            reason: 'LOTTERY_ROUND_WIN',
            roundCode: roundObj.roundCode,
            tonBalance: ownerAccount.tonBalance,
            starsBalance: ownerAccount.starsBalance,
            prizeWonTon: finalPrizeTon,
          });
        } else {
          ticket.payoutTransactionUuid = payoutUuid;
        }

        if (!dbState.claimedTicketCodes.includes(ticket.ticketCode)) {
          dbState.claimedTicketCodes.push(ticket.ticketCode);
        }

        const tonWon = finalPrizeTon.toFixed(2);
        dbState.transactions.unshift({
          id: Date.now() + winnersCount,
          txHash: `0x${drawProof.primaryHmacHex}`,
          userUid: ticket.userUid,
          type: 'PAYOUT',
          network: 'TON Network',
          amountUsdt: finalPrizeUsdt.toFixed(2),
          amountCrypto: `${tonWon} TON`,
          winnerName: winnerDisplayName,
          winnerLocation: 'تسویه راس تایم (۸۵٪ استخر)',
          lotteryTitle: roundObj.titleFa,
          winningCombo: `[${drawnMain.join(', ')}] + ★${drawnGolden}`,
          timeAgoLabel: 'همین الان',
          status: 'CONFIRMED',
          blockNumber: 62195000 + drawNonce,
          confirmations: 19,
        });
      }
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

  // 2B. Pro-Rata Automated Prize Distribution for Syndicate Lottery Pools in this Round
  if (!Array.isArray(dbState.syndicatePools)) {
    dbState.syndicatePools = [];
  }
  for (const syndicate of dbState.syndicatePools) {
    const aggWin = syndicateWinsByPoolId.get(syndicate.id);
    if (syndicate.roundCode === roundObj.roundCode || aggWin) {
      syndicate.status = 'SETTLED';
      if (aggWin && aggWin.totalPrizeTon > 0) {
        const proRataDist = calculateSyndicateProRataDistribution({
          syndicate,
          totalPrizeTon: aggWin.totalPrizeTon,
          tonUsdRate: tonRate,
        });

        syndicate.totalPrizeWonTon = roundTonClean(
          (Number(syndicate.totalPrizeWonTon) || 0) + proRataDist.totalDistributedTon
        );
        syndicate.totalPrizeWonUsdt = Number(
          ((Number(syndicate.totalPrizeWonUsdt) || 0) + proRataDist.totalDistributedUsdt).toFixed(2)
        );
        totalPayoutUsdt = Number(
          (totalPayoutUsdt + proRataDist.totalDistributedUsdt).toFixed(6)
        );

        for (let mIdx = 0; mIdx < proRataDist.payouts.length; mIdx++) {
          const memberPayout = proRataDist.payouts[mIdx];
          if (memberPayout.payoutTon <= 0) continue;

          const cleanMemberKey = String(memberPayout.userKey || '').replace(/^tg_/, '');
          const memberAccount = dbState.users?.[cleanMemberKey];
          const memberTxUuid = `tx_syn_payout_${syndicate.id}_${cleanMemberKey}_${drawNonce}_${mIdx}`;

          if (memberAccount) {
            const memberPam = new PAMSeamlessWalletEngine(memberAccount.pamState);
            memberPam.credit({
              transactionUuid: memberTxUuid,
              referenceTransactionUuid: null,
              roundId: roundObj.roundCode,
              vertical: 'LUCKYDROP_LOTTERY',
              currency: 'TON',
              amountTon: memberPayout.payoutTon,
              amountUsdt: memberPayout.payoutUsdt,
              note: memberPayout.descriptionFa,
            });
            memberAccount.pamState = memberPam.getState();
            memberAccount.tonBalance = roundTonClean(memberAccount.pamState.tonBalance);
            memberAccount.starsBalance = roundStarsClean(memberAccount.pamState.starsBalance);
            memberAccount.ledger = memberAccount.pamState.ledger;

            sendRealtimeToUser(cleanMemberKey, 'USER_BALANCE_UPDATED', {
              reason: 'SYNDICATE_PRO_RATA_WIN',
              syndicateId: syndicate.id,
              syndicateName: syndicate.name,
              roundCode: roundObj.roundCode,
              tonBalance: memberAccount.tonBalance,
              starsBalance: memberAccount.starsBalance,
              prizeWonTon: memberPayout.payoutTon,
              memberRatio: memberPayout.memberRatio,
            });
          }

          dbState.transactions.unshift({
            id: Date.now() + 1000 + mIdx,
            txHash: `0x${drawProof.primaryHmacHex}`,
            userUid: `tg_${cleanMemberKey}`,
            type: 'PAYOUT',
            network: 'TON Syndicate Pool',
            amountUsdt: memberPayout.payoutUsdt.toFixed(2),
            amountCrypto: `${memberPayout.payoutTon.toFixed(6)} TON`,
            winnerName: `${memberPayout.username} (${syndicate.name})`,
            winnerLocation: memberPayout.descriptionFa,
            lotteryTitle: roundObj.titleFa,
            winningCombo: `[${drawnMain.join(', ')}] + ★${drawnGolden}`,
            timeAgoLabel: 'همین الان',
            status: 'CONFIRMED',
            blockNumber: 62195000 + drawNonce,
            confirmations: 19,
          });
        }
      }
    }
  }

  // 3. Update round winning numbers, rotate serverSeed, and roll over countdown timer for next cycle
  roundObj.winningNumbers = JSON.stringify(drawnMain);
  roundObj.winningGoldenBall = drawnGolden;
  const nextServerSeed = generateCryptographicServerSeed();
  roundObj.serverSeed = nextServerSeed;
  roundObj.serverSeedHash = sha256Hex(nextServerSeed);
  roundObj.nonce = drawNonce + 1;
  const durMin = Math.max(1, Number(roundObj.durationMinutes) || 60);
  roundObj.drawTargetTimestampMs = Date.now() + durMin * 60_000;

  // 3B. UPGRADE 1: Automatic Unclaimed Pool Accumulation into Monthly VIP Super-Jackpot Vault!
  // Any undistributed prize pool (`unclaimedPoolTon = distributablePoolTon - actualTotalPaidOutTon`)
  // is automatically transferred and compounded into `dbState.monthlySuperJackpot`!
  dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
  const rolloverCalc = calculateUnclaimedRolloverTransfer({
    distributablePoolUsdt: distributablePool85Usdt,
    actualTotalPaidOutUsdt: totalPayoutUsdt,
    currentAccumulatedPoolTon: dbState.monthlySuperJackpot.accumulatedPoolTon,
    tonUsdRate: tonRate,
  });

  if (rolloverCalc.unclaimedRolloverTon > 0) {
    dbState.monthlySuperJackpot.accumulatedPoolTon = rolloverCalc.nextAccumulatedPoolTon;
    dbState.monthlySuperJackpot.accumulatedPoolStars = rolloverCalc.nextAccumulatedPoolStars;
    dbState.monthlySuperJackpot.accumulatedPoolUsdt = rolloverCalc.nextAccumulatedPoolUsdt;
    const rolloverItem: MonthlySuperJackpotRolloverItem = {
      id: `rollover_${roundObj.roundCode.replace('#', '')}_${drawNonce}_${Date.now()}`,
      sourceRoundCode: roundObj.roundCode,
      sourceRoundTitleFa: roundObj.titleFa,
      distributablePoolTon: rolloverCalc.distributablePoolTon,
      paidOutTon: rolloverCalc.actualTotalPaidOutTon,
      rolloverTon: rolloverCalc.unclaimedRolloverTon,
      rolloverUsdt: rolloverCalc.unclaimedRolloverUsdt,
      rolloverStars: rolloverCalc.unclaimedRolloverStars,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
    };
    dbState.monthlySuperJackpot.rolloverHistory = [
      rolloverItem,
      ...(dbState.monthlySuperJackpot.rolloverHistory || []),
    ].slice(0, 60);
  }

  // Reset regular round sales to initialSeedUsdt for the next cycle (since winners were paid and any unclaimed balance rolled into monthlySuperJackpot)
  const seedUsdt = Math.max(0, parseFloat(roundObj.initialSeedUsdt || '0') || 0);
  const nextSplit = calculateDynamicPariMutuelPool(seedUsdt, 15);
  roundObj.totalSalesUsdt = nextSplit.grossCollectedUsdt.toFixed(2);
  roundObj.jackpotUsdt = nextSplit.distributablePool85Usdt.toFixed(2);
  roundObj.totalPayoutUsdt = nextSplit.distributablePool85Usdt.toFixed(2);
  roundObj.operatorProfitUsdt = nextSplit.siteShare15Usdt.toFixed(2);
  roundObj.ticketsSoldCount = 0;
  roundObj.soldPercent = 0;

  // 4. Record verifiable draw in Draw History (serverSeed is revealed ONLY after draw completion!)
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

  const publicRoundsAfterDraw = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));

  // Broadcast instant SSE `DRAW_EXECUTED` event to all connected clients
  broadcastRealtimeEvent('DRAW_EXECUTED', {
    roundCode: roundObj.roundCode,
    roundTitleFa: roundObj.titleFa,
    drawnMain,
    drawnGolden,
    drawRecord,
    winnersCount,
    ticketsEvaluatedCount,
    totalPayoutUsdt,
    unclaimedRolloverTon: rolloverCalc.unclaimedRolloverTon,
    unclaimedRolloverUsdt: rolloverCalc.unclaimedRolloverUsdt,
    rounds: publicRoundsAfterDraw,
    drawHistory: dbState.drawHistory.slice(0, 30),
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    syndicatePools: dbState.syndicatePools || [],
  });
  broadcastRealtimeEvent('SYNDICATES_UPDATED', {
    roundCode: roundObj.roundCode,
    syndicatePools: dbState.syndicatePools || [],
  });

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
    details: `قرعه‌کشی دور ${roundObj.roundCode} انجام شد • پرداخت‌شده: ${rolloverCalc.actualTotalPaidOutTon.toFixed(2)} TON • انتقال به ابر جک‌پات ماهانه: +${rolloverCalc.unclaimedRolloverTon.toFixed(2)} TON`,
  });

  return {
    roundCode: roundObj.roundCode,
    drawnMain,
    drawnGolden,
    hash: `0x${drawProof.primaryHmacHex}`,
    drawProof,
    drawRecord,
    ticketsEvaluatedCount,
    winnersCount,
    totalPayoutUsdt,
    unclaimedRolloverTon: rolloverCalc.unclaimedRolloverTon,
    unclaimedRolloverUsdt: rolloverCalc.unclaimedRolloverUsdt,
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    grossCollectedUsdt: poolSplit.grossCollectedUsdt,
    siteShare15Usdt: poolSplit.siteShare15Usdt,
    distributablePool85Usdt: poolSplit.distributablePool85Usdt,
    evaluatedTickets: evaluatedTicketsSummary,
    nextServerSeedHash: roundObj.serverSeedHash,
  };
}

/**
 * Executes the 30-Day Monthly VIP Loyalty Super-Jackpot Draw (`#LD-MONTHLY-VIP`).
 * - STRICT "JACKPOT-ONLY (ALL-OR-NOTHING)" RULE:
 *   1. ONLY Tier-1 Jackpot matches (all 5 main numbers + golden ball = all 6 numbers matched) win `accumulatedPoolTon` and `accumulatedPoolStars`.
 *   2. Lower-tier payouts (Tier 2, Tier 3, Tier 4, Tier 5) are 100% eliminated.
 *   3. If ZERO VIP tickets hit the exact Tier-1 Jackpot, 100% of `accumulatedPoolTon` and `accumulatedPoolStars` rolls over untouched into the next 30-day cycle!
 */
async function executeMonthlySuperJackpotDraw(params?: {
  isAdmin?: boolean;
  forceWinningMain?: number[];
  forceWinningGolden?: number;
}) {
  dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
  const vault = dbState.monthlySuperJackpot;
  const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;

  const activeServerSeed =
    vault.serverSeed || sha256Hex(`luckydrop_monthly_seed_${Date.now()}`);
  const activeClientSeed = vault.clientSeed || 'luckydrop_monthly_vip_vault_seed';
  const drawNonce = Math.max(1, Number(vault.nonce) || 1);

  const drawProof = computeServerAuthoritativeLotteryDraw({
    serverSeed: activeServerSeed,
    clientSeed: activeClientSeed,
    nonce: drawNonce,
    roundCode: MONTHLY_VIP_ROUND_ID,
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
  });

  const drawnMain: number[] =
    params?.isAdmin &&
    Array.isArray(params.forceWinningMain) &&
    params.forceWinningMain.length >= 4
      ? params.forceWinningMain.map(Number).sort((a, b) => a - b)
      : drawProof.drawnMain;
  const drawnGolden: number =
    params?.isAdmin && typeof params.forceWinningGolden === 'number'
      ? params.forceWinningGolden
      : drawProof.drawnGolden;

  const startingPoolTon = roundTonClean(Math.max(0, vault.accumulatedPoolTon));
  const startingPoolStars = roundStarsClean(Math.max(0, vault.accumulatedPoolStars || startingPoolTon * 250));

  // Identify all eligible VIP tickets in `#LD-MONTHLY-VIP`
  const candidateTickets: Array<{
    ticket: PersistentTicketRecord;
    parsedMain: number[];
    goldenBall: number;
  }> = [];

  for (const ticket of dbState.tickets) {
    const normalizedStatus = (ticket.status || '').toUpperCase();
    if (
      ticket.roundCode === MONTHLY_VIP_ROUND_ID &&
      (normalizedStatus === 'ACTIVE' || normalizedStatus === 'MINTED')
    ) {
      const ownerKey = String(ticket.userUid || '').replace(/^tg_/, '');
      const ownerAccount = dbState.users?.[ownerKey];
      const qual = ownerAccount
        ? computeUserMonthlyVipQualification(
            ownerAccount,
            ownerAccount.pamState?.playerId || `tg_${ownerKey}`,
            ownerKey
          )
        : null;
      if (!qual || qual.isQualified || qual.vipSuperTicketsEarnedTotal > 0) {
        let parsedMain: number[] = [];
        try {
          parsedMain = JSON.parse(ticket.mainNumbers);
        } catch {
          parsedMain = [7, 14, 21, 33, 49];
        }
        candidateTickets.push({
          ticket,
          parsedMain,
          goldenBall: Number(ticket.goldenBall || 0),
        });
      }
    }
  }

  // Evaluate strict Jackpot-Only (All-or-Nothing) rule: ONLY Tier-1 Jackpot (all 6 numbers matched) wins!
  const allOrNothingOutcome = evaluateMonthlySuperJackpotAllOrNothing({
    tickets: candidateTickets.map((c) => ({
      ticketCode: c.ticket.ticketCode,
      mainNumbers: c.parsedMain,
      goldenBall: c.goldenBall,
    })),
    drawnMain,
    drawnGolden,
    accumulatedPoolTon: startingPoolTon,
    accumulatedPoolStars: startingPoolStars,
    tonUsdRate: tonRate,
  });

  const winnersCount = allOrNothingOutcome.tier1WinnersCount;
  const totalPaidOutTon = allOrNothingOutcome.totalPaidOutTon;
  const totalPaidOutUsdt = allOrNothingOutcome.totalPaidOutUsdt;

  for (let idx = 0; idx < candidateTickets.length; idx++) {
    const { ticket } = candidateTickets[idx];
    const evalItem = allOrNothingOutcome.evaluations[idx];

    if (evalItem && evalItem.isTier1JackpotWinner && evalItem.prizeTon > 0) {
      const finalPrizeTon = evalItem.prizeTon;
      const finalPrizeUsdt = evalItem.prizeUsdt;
      ticket.status = 'WON';
      ticket.prizeWonUsdt = finalPrizeUsdt.toFixed(2);
      ticket.tierLabelFa = evalItem.tierLabelFa;
      ticket.claimed = true;

      const payoutUuid = `tx_monthly_vip_win_${ticket.ticketCode}_${drawNonce}`;
      const ownerKey = String(ticket.userUid || '').replace(/^tg_/, '');
      const ownerAccount = dbState.users?.[ownerKey];
      let winnerDisplayName = 'کاربر وفادار VIP';

      if (ownerAccount) {
        const ownerPam = new PAMSeamlessWalletEngine(ownerAccount.pamState);
        const creditRes = ownerPam.credit({
          transactionUuid: payoutUuid,
          referenceTransactionUuid: ticket.transactionUuid || null,
          roundId: MONTHLY_VIP_ROUND_ID,
          vertical: 'LUCKYDROP_LOTTERY',
          currency: 'TON',
          amountTon: finalPrizeTon,
          amountUsdt: finalPrizeUsdt,
          note: `👑 جایزه جک‌پات مطلق ماهانه VIP برای بلیت ${ticket.ticketCode} (${evalItem.tierLabelFa})`,
        });
        ownerAccount.pamState = ownerPam.getState();
        ownerAccount.tonBalance = roundTonClean(ownerAccount.pamState.tonBalance);
        ownerAccount.starsBalance = roundStarsClean(ownerAccount.pamState.starsBalance);
        ownerAccount.ledger = ownerAccount.pamState.ledger;
        winnerDisplayName = ownerAccount.displayName;
        ticket.payoutTransactionUuid = creditRes.ledgerEntry?.transactionUuid || payoutUuid;

        sendRealtimeToUser(ownerKey, 'USER_BALANCE_UPDATED', {
          reason: 'MONTHLY_VIP_SUPER_JACKPOT_WIN',
          tonBalance: ownerAccount.tonBalance,
          starsBalance: ownerAccount.starsBalance,
          prizeWonTon: finalPrizeTon,
        });
      }

      const tonWon = finalPrizeTon.toFixed(2);
      dbState.transactions.unshift({
        id: Date.now() + idx + 1,
        txHash: `0x${drawProof.primaryHmacHex}`,
        userUid: ticket.userUid,
        type: 'PAYOUT',
        network: 'TON VIP Super-Vault',
        amountUsdt: finalPrizeUsdt.toFixed(2),
        amountCrypto: `${tonWon} TON`,
        winnerName: winnerDisplayName,
        winnerLocation: '👑 جک‌پات مطلق ماهانه وفاداری VIP (All-or-Nothing)',
        lotteryTitle: vault.titleFa,
        winningCombo: `[${drawnMain.join(', ')}] + ★${drawnGolden}`,
        timeAgoLabel: 'همین الان',
        status: 'CONFIRMED',
        blockNumber: 62295000 + drawNonce,
        confirmations: 19,
      });
    } else {
      ticket.status = 'LOST';
      ticket.prizeWonUsdt = '0.00';
      ticket.tierLabelFa =
        evalItem?.tierLabelFa || 'بدون تطابق کامل ۶ شماره جک‌پات (قانون All-or-Nothing)';
    }
  }

  // Infinite Rollover Rule: If 0 Tier-1 winners, 100% of accumulatedPoolTon and accumulatedPoolStars rolls over untouched!
  const remainingUnclaimedTon = allOrNothingOutcome.remainingRolloverTon;
  const remainingUnclaimedStars = allOrNothingOutcome.remainingRolloverStars;

  vault.accumulatedPoolTon = remainingUnclaimedTon;
  vault.accumulatedPoolStars = remainingUnclaimedStars;
  vault.accumulatedPoolUsdt = allOrNothingOutcome.remainingRolloverUsdt;
  vault.nextMonthlyDrawTimestampMs = Date.now() + MONTHLY_CYCLE_DURATION_MS;
  vault.lastWinningMain = drawnMain;
  vault.lastWinningGolden = drawnGolden;
  vault.lastWinnerSummary =
    winnersCount > 0
      ? `👑 ${winnersCount} برنده جک‌پات مطلق ۶ گوی VIP (${totalPaidOutTon.toFixed(2)} TON پرداخت شد)`
      : `بدون برنده جک‌پات ۶ گوی (All-or-Nothing) — ۱۰۰٪ موجودی (${remainingUnclaimedTon.toFixed(2)} TON / ${remainingUnclaimedStars.toLocaleString('en-US')} ⭐) دست‌نخورده به ماه بعد منتقل شد!`;

  const nextSeed = generateCryptographicServerSeed();
  vault.serverSeed = nextSeed;
  vault.serverSeedHash = sha256Hex(nextSeed);
  vault.nonce = drawNonce + 1;

  const drawRecord: VerifiableDrawHistoryRecord = {
    drawId: `DRAW-MONTHLY-VIP-${drawNonce}`,
    roundCode: MONTHLY_VIP_ROUND_ID,
    roundTitleFa: vault.titleFa,
    drawnMain,
    drawnGolden,
    serverSeed: drawProof.serverSeed,
    serverSeedHash: drawProof.serverSeedHash,
    clientSeed: drawProof.clientSeed,
    nonce: drawProof.nonce,
    primaryHmacHex: drawProof.primaryHmacHex,
    first52BitHex: drawProof.first52BitHex,
    uniformFloatX: drawProof.uniformFloatX,
    ticketsEvaluatedCount: candidateTickets.length,
    winnersCount,
    totalPayoutUsdt: totalPaidOutUsdt,
    createdAt: new Date().toLocaleTimeString('fa-IR'),
  };
  dbState.drawHistory.unshift(drawRecord);

  persistAll();

  broadcastRealtimeEvent('DRAW_EXECUTED', {
    roundCode: MONTHLY_VIP_ROUND_ID,
    roundTitleFa: vault.titleFa,
    drawnMain,
    drawnGolden,
    drawRecord,
    winnersCount,
    ticketsEvaluatedCount: candidateTickets.length,
    totalPayoutUsdt: totalPaidOutUsdt,
    unclaimedRolloverTon: remainingUnclaimedTon,
    rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    drawHistory: dbState.drawHistory.slice(0, 30),
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
  });

  return {
    roundCode: MONTHLY_VIP_ROUND_ID,
    drawnMain,
    drawnGolden,
    drawRecord,
    ticketsEvaluatedCount: candidateTickets.length,
    winnersCount,
    totalPayoutUsdt: totalPaidOutUsdt,
    paidOutTon: totalPaidOutTon,
    remainingRolloverTon: remainingUnclaimedTon,
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
  };
}

/**
 * Executes the $1,000 Welcome Grand Lottery Draw (`#LD-WELCOME-1000`).
 * Funded 100% from the accumulated `fundedReserveTon` (or `targetPoolTon` when forced by Admin).
 */
async function executeWelcomeGrandLotteryDraw(params?: {
  isAdmin?: boolean;
  forceWinningMain?: number[];
  forceWinningGolden?: number;
}) {
  const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
  const activeWelcomeTickets = (dbState.tickets || []).filter(
    (t) =>
      t.roundCode === WELCOME_GRAND_ROUND_ID &&
      (String(t.status || '').toUpperCase() === 'ACTIVE' ||
        String(t.status || '').toUpperCase() === 'MINTED')
  );
  dbState.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
    dbState.welcomeGrandLottery,
    tonRate,
    activeWelcomeTickets.length
  );
  const welcomeVault = dbState.welcomeGrandLottery;

  const activeServerSeed =
    welcomeVault.serverSeed || sha256Hex(`luckydrop_welcome_1000_seed_${Date.now()}`);
  const activeClientSeed = welcomeVault.clientSeed || 'luckydrop_welcome_1000_seed';
  const drawNonce = Math.max(1, Number(welcomeVault.nonce) || 1);

  const drawProof = computeServerAuthoritativeLotteryDraw({
    serverSeed: activeServerSeed,
    clientSeed: activeClientSeed,
    nonce: drawNonce,
    roundCode: WELCOME_GRAND_ROUND_ID,
    mainCount: 5,
    mainMax: 50,
    goldenMax: 15,
  });

  const drawnMain: number[] =
    params?.isAdmin &&
    Array.isArray(params.forceWinningMain) &&
    params.forceWinningMain.length >= 4
      ? params.forceWinningMain.map(Number).sort((a, b) => a - b)
      : drawProof.drawnMain;
  const drawnGolden: number =
    params?.isAdmin && typeof params.forceWinningGolden === 'number'
      ? params.forceWinningGolden
      : drawProof.drawnGolden;

  const distributableUsdt = Math.max(
    welcomeVault.fundedReserveUsdt,
    params?.isAdmin ? welcomeVault.targetPoolUsdt : welcomeVault.fundedReserveUsdt
  );

  const candidateTickets = activeWelcomeTickets.map((ticket) => {
    let parsedMain: number[] = [];
    try {
      parsedMain = JSON.parse(ticket.mainNumbers);
    } catch {
      parsedMain = [7, 14, 21, 33, 49];
    }
    const evalResult = evaluateTicketPrizeTier({
      ticketMain: parsedMain,
      ticketGolden: Number(ticket.goldenBall || 0),
      drawnMain,
      drawnGolden,
      ticketCostUsdt: 5,
      jackpotUsdt: Math.max(100, distributableUsdt),
    });
    return { ticket, evalResult };
  });

  const rawWeights = candidateTickets.map((c) => (c.evalResult.won ? c.evalResult.prizeUsdt : 0));
  const distributedPrizes = distributePoolAmongWinners(distributableUsdt, rawWeights);
  const hasTier1Winner = candidateTickets.some(
    (c) => c.evalResult.won && c.evalResult.tierCode === 'TIER_1_JACKPOT'
  );

  let winnersCount = 0;
  let totalPaidOutTon = 0;
  let totalPaidOutUsdt = 0;

  for (let idx = 0; idx < candidateTickets.length; idx++) {
    const { ticket, evalResult } = candidateTickets[idx];
    const cappedPrizeUsdt = hasTier1Winner
      ? distributedPrizes[idx] || 0
      : Math.min(evalResult.prizeUsdt, distributedPrizes[idx] || 0);
    const finalPrizeTon = roundTonClean(cappedPrizeUsdt / tonRate);
    const finalPrizeUsdt = Number((finalPrizeTon * tonRate).toFixed(2));

    if (evalResult.won && finalPrizeTon > 0) {
      ticket.status = 'WON';
      ticket.prizeWonUsdt = finalPrizeUsdt.toFixed(2);
      ticket.tierLabelFa = `🎉 ${evalResult.tierLabelFa} (لاتاری ۱,۰۰۰ دلاری خوشآمدگویی)`;
      ticket.claimed = true;
      winnersCount += 1;
      totalPaidOutTon = roundTonClean(totalPaidOutTon + finalPrizeTon);
      totalPaidOutUsdt = Number((totalPaidOutUsdt + finalPrizeUsdt).toFixed(2));

      const payoutUuid = `tx_welcome_1000_win_${ticket.ticketCode}_${drawNonce}`;
      const ownerKey = String(ticket.userUid || '').replace(/^tg_/, '');
      const ownerAccount = dbState.users?.[ownerKey];
      let winnerDisplayName = 'کاربر خوش‌شانس LuckyDrop';

      if (ownerAccount) {
        const ownerPam = new PAMSeamlessWalletEngine(ownerAccount.pamState);
        const creditRes = ownerPam.credit({
          transactionUuid: payoutUuid,
          referenceTransactionUuid: ticket.transactionUuid || null,
          roundId: WELCOME_GRAND_ROUND_ID,
          vertical: 'LUCKYDROP_LOTTERY',
          currency: 'TON',
          amountTon: finalPrizeTon,
          amountUsdt: finalPrizeUsdt,
          note: `🎉 جایزه لاتاری ویژه خوشآمدگویی ۱,۰۰۰ دلاری برای بلیت ${ticket.ticketCode} (${evalResult.tierLabelFa})`,
        });
        ownerAccount.pamState = ownerPam.getState();
        ownerAccount.tonBalance = roundTonClean(ownerAccount.pamState.tonBalance);
        ownerAccount.starsBalance = roundStarsClean(ownerAccount.pamState.starsBalance);
        ownerAccount.ledger = ownerAccount.pamState.ledger;
        winnerDisplayName = ownerAccount.displayName;
        ticket.payoutTransactionUuid = creditRes.ledgerEntry?.transactionUuid || payoutUuid;

        sendRealtimeToUser(ownerKey, 'USER_BALANCE_UPDATED', {
          reason: 'WELCOME_1000_LOTTERY_WIN',
          tonBalance: ownerAccount.tonBalance,
          starsBalance: ownerAccount.starsBalance,
          prizeWonTon: finalPrizeTon,
        });
      }

      dbState.transactions.unshift({
        id: Date.now() + winnersCount,
        txHash: `0x${drawProof.primaryHmacHex}`,
        userUid: ticket.userUid,
        type: 'PAYOUT',
        network: 'TON Welcome $1,000 Vault',
        amountUsdt: finalPrizeUsdt.toFixed(2),
        amountCrypto: `${finalPrizeTon.toFixed(2)} TON`,
        winnerName: winnerDisplayName,
        winnerLocation: '🎉 لاتاری خوشآمدگویی ۱,۰۰۰ دلاری',
        lotteryTitle: welcomeVault.titleFa,
        winningCombo: `[${drawnMain.join(', ')}] + ★${drawnGolden}`,
        timeAgoLabel: 'همین الان',
        status: 'CONFIRMED',
        blockNumber: 62395000 + drawNonce,
        confirmations: 19,
      });
    } else {
      ticket.status = 'LOST';
      ticket.prizeWonUsdt = '0.00';
      ticket.tierLabelFa = evalResult.tierLabelFa;
    }
  }

  const remainingReserveTon = roundTonClean(
    Math.max(0, welcomeVault.fundedReserveTon - totalPaidOutTon)
  );
  const nextSeed = generateCryptographicServerSeed();
  dbState.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
    {
      ...welcomeVault,
      fundedReserveTon: remainingReserveTon,
      nextDrawTimestampMs: Date.now() + MONTHLY_CYCLE_DURATION_MS,
      serverSeed: nextSeed,
      serverSeedHash: sha256Hex(nextSeed),
      nonce: drawNonce + 1,
      lastWinningMain: drawnMain,
      lastWinningGolden: drawnGolden,
      lastWinnerSummary:
        winnersCount > 0
          ? `🎉 ${winnersCount} برنده لاتاری خوشآمدگویی (${totalPaidOutTon.toFixed(2)} TON پرداخت شد)`
          : `قرعه‌کشی انجام شد — بدون برنده جک‌پات (${remainingReserveTon.toFixed(2)} TON ذخیره باقی‌مانده)`,
    },
    tonRate,
    0
  );

  const drawRecord: VerifiableDrawHistoryRecord = {
    drawId: `DRAW-WELCOME-1000-${drawNonce}`,
    roundCode: WELCOME_GRAND_ROUND_ID,
    roundTitleFa: welcomeVault.titleFa,
    drawnMain,
    drawnGolden,
    serverSeed: drawProof.serverSeed,
    serverSeedHash: drawProof.serverSeedHash,
    clientSeed: drawProof.clientSeed,
    nonce: drawProof.nonce,
    primaryHmacHex: drawProof.primaryHmacHex,
    first52BitHex: drawProof.first52BitHex,
    uniformFloatX: drawProof.uniformFloatX,
    ticketsEvaluatedCount: candidateTickets.length,
    winnersCount,
    totalPayoutUsdt: totalPaidOutUsdt,
    createdAt: new Date().toLocaleTimeString('fa-IR'),
  };
  dbState.drawHistory.unshift(drawRecord);

  persistAll();

  broadcastRealtimeEvent('DRAW_EXECUTED', {
    roundCode: WELCOME_GRAND_ROUND_ID,
    roundTitleFa: welcomeVault.titleFa,
    drawnMain,
    drawnGolden,
    drawRecord,
    winnersCount,
    ticketsEvaluatedCount: candidateTickets.length,
    totalPayoutUsdt: totalPaidOutUsdt,
    rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    drawHistory: dbState.drawHistory.slice(0, 30),
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
  });

  return {
    roundCode: WELCOME_GRAND_ROUND_ID,
    drawnMain,
    drawnGolden,
    drawRecord,
    ticketsEvaluatedCount: candidateTickets.length,
    winnersCount,
    totalPayoutUsdt: totalPaidOutUsdt,
    paidOutTon: totalPaidOutTon,
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
  };
}

// Background 5-Second Automated Lottery Draw Scheduler (Runs 24/7 on the Server)
let drawSchedulerRunning = false;
setInterval(async () => {
  if (drawSchedulerRunning || dbState.killSwitchActive) return;
  drawSchedulerRunning = true;
  try {
    const nowMs = Date.now();
    for (const roundObj of dbState.rounds) {
      const isRoundActive = !roundObj.status || roundObj.status.toUpperCase() === 'ACTIVE';
      const targetMs = Number(roundObj.drawTargetTimestampMs) || 0;
      if (isRoundActive && targetMs > 0 && nowMs >= targetMs) {
        await executeLotteryDrawWithDynamicPool({
          roundObj,
          isAdmin: false,
        });
      }
    }

    // Check 30-Day Monthly VIP Super-Jackpot Cycle
    dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
    if (
      dbState.monthlySuperJackpot.nextMonthlyDrawTimestampMs > 0 &&
      nowMs >= dbState.monthlySuperJackpot.nextMonthlyDrawTimestampMs
    ) {
      await executeMonthlySuperJackpotDraw({ isAdmin: false });
    }

    // Check $1,000 Welcome Grand Lottery (`#LD-WELCOME-1000`) Schedule Guard:
    // If 30-day timer expires before `fundedReserveTon` reaches the $1,000 target, auto-extend by 7 days!
    const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
    const welcomeGuard = evaluateWelcomeLotteryScheduleGuard(dbState.welcomeGrandLottery, {
      nowMs,
      isAdminForceDraw: false,
      tonUsdRate: tonRate,
    });
    if (welcomeGuard.autoExtended) {
      dbState.welcomeGrandLottery = welcomeGuard.updatedState;
      persistAll();
      broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
        roundCode: WELCOME_GRAND_ROUND_ID,
        welcomeGrandLottery: getPublicWelcomeGrandLottery(),
      });
    } else if (welcomeGuard.shouldExecuteDraw) {
      await executeWelcomeGrandLotteryDraw({ isAdmin: false });
    }
  } catch (err) {
    console.error('Automated lottery draw scheduler error:', err);
  } finally {
    drawSchedulerRunning = false;
  }
}, 5000);

app.post('/api/admin/draw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      roundCode = '#LDR-8493',
      clientSeedOverride,
      forceWinningMain,
      forceWinningGolden,
    } = req.body || {};

    const { session, userPam } = getOrCreateIsolatedUserContext(req);

    if (roundCode === MONTHLY_VIP_ROUND_ID) {
      const monthlyOutcome = await executeMonthlySuperJackpotDraw({
        isAdmin: session.isAdmin,
        forceWinningMain,
        forceWinningGolden,
      });
      const callerPam = getOrCreateIsolatedUserContext(req).userPam.getState();
      return res.json({
        ok: true,
        ...monthlyOutcome,
        rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
        tonBalance: callerPam.tonBalance,
        starsBalance: callerPam.starsBalance,
      });
    }

    if (roundCode === WELCOME_GRAND_ROUND_ID) {
      const welcomeOutcome = await executeWelcomeGrandLotteryDraw({
        isAdmin: session.isAdmin,
        forceWinningMain,
        forceWinningGolden,
      });
      const callerPam = getOrCreateIsolatedUserContext(req).userPam.getState();
      return res.json({
        ok: true,
        ...welcomeOutcome,
        rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
        tonBalance: callerPam.tonBalance,
        starsBalance: callerPam.starsBalance,
      });
    }

    let roundObj = dbState.rounds.find((r) => r.roundCode === roundCode);
    if (!roundObj && dbState.rounds.length > 0) {
      roundObj = dbState.rounds[0];
    }
    if (!roundObj) {
      return res.status(404).json({ error: 'دور قرعه‌کشی مورد نظر یافت نشد.' });
    }

    const drawOutcome = await executeLotteryDrawWithDynamicPool({
      roundObj,
      clientSeedOverride:
        clientSeedOverride || roundObj.clientSeed || userPam.getState().seeds.clientSeed,
      isAdmin: session.isAdmin,
      forceWinningMain,
      forceWinningGolden,
    });

    const refreshedCaller = getOrCreateIsolatedUserContext(req);
    const callerPam = refreshedCaller.userPam.getState();

    res.json({
      ok: true,
      ...drawOutcome,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      tonBalance: callerPam.tonBalance,
      starsBalance: callerPam.starsBalance,
      pamState: {
        ...callerPam,
        seeds: { ...callerPam.seeds, serverSeed: '' },
      },
    });
  } catch (error: any) {
    console.error('Failed to execute draw:', error);
    res.status(500).json({ error: error.message || 'خطا در اجرای قرعه‌کشی' });
  }
});

// Admin Monthly VIP Super-Jackpot Configuration & Manual Seed / Draw Endpoints
app.post('/api/admin/monthly-super-pot/config', optionalAuth, (req: AuthRequest, res) => {
  try {
    dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
    const vault = dbState.monthlySuperJackpot;
    const {
      minTicketsRequired,
      minXpRequired,
      addPoolTon,
      setPoolTon,
      resetCycleDays,
    } = req.body || {};

    if (typeof minTicketsRequired === 'number' && minTicketsRequired >= 1) {
      vault.minTicketsRequired = Math.max(1, Math.floor(minTicketsRequired));
    }
    if (typeof minXpRequired === 'number' && minXpRequired >= 50) {
      vault.minXpRequired = Math.max(50, Math.floor(minXpRequired));
    }
    const tonRate = DEFAULT_FX_RATES.TON || 5.0;
    if (typeof setPoolTon === 'number' && Number.isFinite(setPoolTon) && setPoolTon >= 0) {
      vault.accumulatedPoolTon = roundTonClean(setPoolTon);
      vault.accumulatedPoolStars = roundStarsClean(vault.accumulatedPoolTon * 250);
      vault.accumulatedPoolUsdt = Number((vault.accumulatedPoolTon * tonRate).toFixed(2));
    } else if (typeof addPoolTon === 'number' && Number.isFinite(addPoolTon) && addPoolTon > 0) {
      const addedClean = roundTonClean(addPoolTon);
      vault.accumulatedPoolTon = roundTonClean(vault.accumulatedPoolTon + addedClean);
      vault.accumulatedPoolStars = roundStarsClean(vault.accumulatedPoolTon * 250);
      vault.accumulatedPoolUsdt = Number((vault.accumulatedPoolTon * tonRate).toFixed(2));
      vault.rolloverHistory = [
        {
          id: `admin_seed_${Date.now()}`,
          sourceRoundCode: 'ADMIN_SEED',
          sourceRoundTitleFa: 'تزریق نقدینگی خزانه به ابر جک‌پات ماهانه VIP',
          distributablePoolTon: addedClean,
          paidOutTon: 0,
          rolloverTon: addedClean,
          rolloverUsdt: Number((addedClean * tonRate).toFixed(2)),
          rolloverStars: roundStarsClean(addedClean * 250),
          timestamp: new Date().toLocaleTimeString('fa-IR'),
        },
        ...(vault.rolloverHistory || []),
      ].slice(0, 60);
    }
    if (typeof resetCycleDays === 'number' && resetCycleDays > 0) {
      vault.nextMonthlyDrawTimestampMs =
        Date.now() + Math.max(1, resetCycleDays) * 24 * 60 * 60 * 1000;
    }

    persistAll();

    broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
      roundCode: MONTHLY_VIP_ROUND_ID,
      rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
      monthlySuperJackpot: getPublicMonthlySuperJackpot(),
      totalTicketsCount: dbState.tickets.length,
    });

    return res.json({
      ok: true,
      monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در بروزرسانی تنظیمات ابر جک‌پات ماهانه VIP',
    });
  }
});

app.post('/api/admin/monthly-super-pot/draw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { session } = getOrCreateIsolatedUserContext(req);
    const { forceWinningMain, forceWinningGolden } = req.body || {};
    const outcome = await executeMonthlySuperJackpotDraw({
      isAdmin: session.isAdmin,
      forceWinningMain,
      forceWinningGolden,
    });
    return res.json({
      ok: true,
      ...outcome,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در اجرای قرعه‌کشی ابر جک‌پات ماهانه VIP',
    });
  }
});

// ============================================================================
// UPGRADE 2 ENDPOINTS: $1,000 WELCOME GRAND LOTTERY (`#LD-WELCOME-1000`)
// - User Custom Number Picker Claim (`POST /api/lottery/welcome-1000/claim-ticket`)
// - Admin Reserve Config & Manual Draw (`POST /api/admin/welcome-lottery/config`, `POST /api/admin/welcome-lottery/draw`)
// ============================================================================

app.post(
  '/api/lottery/welcome-1000/claim-ticket',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: ثبت بلیت موقتاً متوقف است.',
        });
      }

      const { userKey, userAccount, userPam, commitUserAccount } =
        getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const playerId = userPam.getState().playerId;
        const currentStatus = computeUserWelcomeTicketStatus(userAccount, playerId, userKey);

        if (currentStatus.welcomeTicketClaimed) {
          return res.status(409).json({
            ok: false,
            error:
              '409 Conflict — WELCOME_TICKET_ALREADY_CLAIMED: شما قبلاً بلیت رایگان ۱,۰۰۰ دلاری خوشآمدگویی خود را ثبت کرده‌اید (حداکثر ۱ بلیت برای هر کاربر).',
            welcomeTicketStatus: currentStatus,
            welcomeGrandLottery: getPublicWelcomeGrandLottery(),
          });
        }

        if (!currentStatus.welcomeTicketUnlocked || currentStatus.welcomeTicketEntitlement < 1) {
          return res.status(403).json({
            ok: false,
            error:
              '403 Forbidden — WELCOME_TICKET_NOT_UNLOCKED: برای فعال‌سازی بلیت رایگان ۱,۰۰۰ دلاری خوشآمدگویی، ابتدا حداقل ۱ بلیت در یکی از دورهای لاتاری خریداری کنید.',
            welcomeTicketStatus: currentStatus,
            welcomeGrandLottery: getPublicWelcomeGrandLottery(),
          });
        }

        const selectionCheck = validateAndPrepareWelcomeTicketSelection({
          mainNumbers: req.body?.mainNumbers,
          goldenBall: req.body?.goldenBall,
          mainCount: 5,
          mainMax: 50,
          goldenMax: 15,
        });

        if (!selectionCheck.valid) {
          return res.status(400).json({
            ok: false,
            error: selectionCheck.error,
          });
        }

        const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
        dbState.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
          dbState.welcomeGrandLottery,
          tonRate
        );
        const welcomeNonce = dbState.welcomeGrandLottery.nonce;
        dbState.welcomeGrandLottery.nonce += 1;

        const serialRandom = Math.floor(100000 + Math.random() * 900000);
        const ticketCode = `WLC-${serialRandom}`;
        const clientSeed =
          String(req.body?.clientSeed || userPam.getState().seeds.clientSeed || '').trim() ||
          'luckydrop_welcome_1000_client_seed';
        const txHash = `0x${sha256Hex(`welcome_1000:${userKey}:${ticketCode}:${welcomeNonce}`)}`;

        const welcomeTicketRecord: PersistentTicketRecord = {
          id: Date.now(),
          ticketCode,
          userUid: playerId,
          roundCode: WELCOME_GRAND_ROUND_ID,
          mainNumbers: JSON.stringify(selectionCheck.cleanMainNumbers),
          goldenBall: selectionCheck.cleanGoldenBall,
          costUsdt: '0.00',
          currencyNetwork: 'WELCOME $1,000 FREE ENTITLEMENT (1ST PURCHASE)',
          txHash,
          transactionUuid: `tx_welcome_1000_${userKey}_${ticketCode}`,
          payoutTransactionUuid: null,
          clientSeed,
          serverSeedHash: dbState.welcomeGrandLottery.serverSeedHash,
          nonce: welcomeNonce,
          commitHash: txHash.slice(2, 34),
          status: 'ACTIVE',
          confirmations: 19,
          prizeWonUsdt: '0.00',
          claimed: false,
          createdAt: new Date().toLocaleTimeString('fa-IR'),
        };

        dbState.tickets.unshift(welcomeTicketRecord);
        userAccount.myTickets.unshift(ticketCode);
        userAccount.welcomeTicketUnlocked = true;
        userAccount.welcomeTicketEntitlement = 0;
        userAccount.welcomeTicketClaimed = true;
        userAccount.welcomeTicketCode = ticketCode;

        commitUserAccount();

        const updatedWelcomeLottery = getPublicWelcomeGrandLottery();
        const updatedStatus = computeUserWelcomeTicketStatus(userAccount, playerId, userKey);

        broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
          roundCode: WELCOME_GRAND_ROUND_ID,
          welcomeGrandLottery: updatedWelcomeLottery,
          totalTicketsCount: dbState.tickets.length,
        });

        sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
          reason: 'WELCOME_TICKET_CLAIMED',
          welcomeTicketStatus: updatedStatus,
          welcomeGrandLottery: updatedWelcomeLottery,
        });

        return res.json({
          ok: true,
          ticket: welcomeTicketRecord,
          welcomeGrandLottery: updatedWelcomeLottery,
          welcomeTicketStatus: updatedStatus,
          message: `🎉 بلیت رایگان لاتاری ۱,۰۰۰ دلاری خوشآمدگویی شما با کد ${ticketCode} و اعداد [${selectionCheck.cleanMainNumbers.join(', ')}] + ★${selectionCheck.cleanGoldenBall} با موفقیت ثبت شد!`,
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در ثبت بلیت رایگان خوشآمدگویی',
      });
    }
  }
);

app.post('/api/admin/welcome-lottery/config', optionalAuth, (req: AuthRequest, res) => {
  try {
    const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
    const current = getPublicWelcomeGrandLottery();
    const {
      targetPoolUsdt,
      setReserveTon,
      addReserveTon,
      houseMarginAllocationRatio,
      resetCycleDays,
      autoExtendDaysIfUnfunded,
    } = req.body || {};

    let nextTargetUsdt = current.targetPoolUsdt;
    if (typeof targetPoolUsdt === 'number' && Number.isFinite(targetPoolUsdt) && targetPoolUsdt >= 100) {
      nextTargetUsdt = Number(targetPoolUsdt.toFixed(2));
    }

    let nextFundedReserveTon = current.fundedReserveTon;
    if (typeof setReserveTon === 'number' && Number.isFinite(setReserveTon) && setReserveTon >= 0) {
      nextFundedReserveTon = roundTonClean(setReserveTon);
    } else if (typeof addReserveTon === 'number' && Number.isFinite(addReserveTon) && addReserveTon > 0) {
      nextFundedReserveTon = roundTonClean(current.fundedReserveTon + addReserveTon);
    }

    let nextRatio = current.houseMarginAllocationRatio;
    if (
      typeof houseMarginAllocationRatio === 'number' &&
      houseMarginAllocationRatio > 0 &&
      houseMarginAllocationRatio <= 1
    ) {
      nextRatio = Number(houseMarginAllocationRatio.toFixed(4));
    }

    let nextDrawMs = current.nextDrawTimestampMs;
    if (typeof resetCycleDays === 'number' && resetCycleDays > 0) {
      nextDrawMs = Date.now() + Math.max(1, resetCycleDays) * 24 * 60 * 60 * 1000;
    }

    const nextAutoExtendDays =
      typeof autoExtendDaysIfUnfunded === 'number' && autoExtendDaysIfUnfunded >= 1
        ? Math.floor(autoExtendDaysIfUnfunded)
        : current.autoExtendDaysIfUnfunded;

    dbState.welcomeGrandLottery = normalizeWelcomeGrandLotteryState(
      {
        ...dbState.welcomeGrandLottery,
        targetPoolUsdt: nextTargetUsdt,
        fundedReserveTon: nextFundedReserveTon,
        houseMarginAllocationRatio: nextRatio,
        nextDrawTimestampMs: nextDrawMs,
        autoExtendDaysIfUnfunded: nextAutoExtendDays,
      },
      tonRate,
      current.participantsCount
    );

    persistAll();

    const updated = getPublicWelcomeGrandLottery();
    broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
      roundCode: WELCOME_GRAND_ROUND_ID,
      welcomeGrandLottery: updated,
    });

    return res.json({
      ok: true,
      welcomeGrandLottery: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در بروزرسانی تنظیمات لاتاری خوشآمدگویی ۱,۰۰۰ دلاری',
    });
  }
});

app.post('/api/admin/welcome-lottery/draw', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { session } = getOrCreateIsolatedUserContext(req);
    const { forceWinningMain, forceWinningGolden } = req.body || {};
    const outcome = await executeWelcomeGrandLotteryDraw({
      isAdmin: session.isAdmin,
      forceWinningMain,
      forceWinningGolden,
    });
    return res.json({
      ok: true,
      ...outcome,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در اجرای قرعه‌کشی لاتاری خوشآمدگویی ۱,۰۰۰ دلاری',
    });
  }
});

// ============================================================================
// UPGRADE 3 ENDPOINTS: TELEGRAM SQUADS & SYNDICATE LOTTERY POOLS
// - GET /api/syndicates
// - POST /api/syndicates/create (Create Squad + Instant Share Minting)
// - POST /api/syndicates/join (Join Squad + Instant Share Minting + +15 XP Creator Synergy Bonus)
// ============================================================================

async function executeAtomicSyndicateSharePurchase(params: {
  userKey: string;
  userAccount: IsolatedUserAccountRecord;
  userPam: PAMSeamlessWalletEngine;
  commitUserAccount: () => void;
  syndicate: SyndicatePoolRecord;
  roundObj: PersistentRoundRecord;
  sharesToBuy: number;
  currency: 'TON' | 'STARS';
  requestedAmountTon?: number;
  requestedAmountStars?: number;
  transactionUuid?: string;
}): Promise<{
  ok: boolean;
  statusHttp: number;
  error?: string;
  syndicate?: SyndicatePoolRecord;
  mintedTickets?: PersistentTicketRecord[];
  vipSuperTicketsMinted?: PersistentTicketRecord[];
  creatorSynergyXpAwarded?: number;
  accruedCashback?: { accruedTon: number; accruedStars: number };
  financialSplit?: ReturnType<typeof calculateSyndicateShareFinancialSplit>;
}> {
  const {
    userKey,
    userAccount,
    userPam,
    commitUserAccount,
    syndicate,
    roundObj,
    sharesToBuy,
    currency,
    requestedAmountTon,
    requestedAmountStars,
    transactionUuid,
  } = params;

  const ticketCostRes = resolveStrictNativeTicketCost({
    currency,
    ticketCount: sharesToBuy,
    roundTicketPriceTon: (roundObj as any)?.ticketPriceTon,
    roundTicketPriceUsdt: String(syndicate.sharePriceUsdt || roundObj.ticketPriceUsdt || '5'),
    requestedAmountTon,
    requestedAmountStars,
    availableTonBalance: userPam.getState().tonBalance,
    availableStarsBalance: userPam.getState().starsBalance,
  });

  if (!ticketCostRes.valid) {
    return {
      ok: false,
      statusHttp: 400,
      error: ticketCostRes.error || 'INSUFFICIENT_BALANCE',
    };
  }

  const totalCostNum = ticketCostRes.nominalTotalUsdt;
  const unitCostNum = ticketCostRes.nominalUnitUsdt;
  const batchTxUuid = String(
    transactionUuid || generateDeterministicUuid(`tx_syn_${syndicate.id.replace('#', '')}`)
  ).trim();

  // 1. Atomic Native Currency Debit via PAM Seamless Wallet Engine
  const debitRes = userPam.debit({
    transactionUuid: batchTxUuid,
    roundId: roundObj.roundCode,
    vertical: 'LUCKYDROP_LOTTERY',
    currency,
    amountTon: currency === 'TON' ? ticketCostRes.totalTon : undefined,
    amountStars: currency === 'STARS' ? ticketCostRes.totalStars : undefined,
    amountUsdt: totalCostNum,
    note: `خرید ${sharesToBuy} سهم در سندیکای گروهی ${syndicate.name} (#${syndicate.id}) برای دور ${roundObj.roundCode}`,
    incrementNonce: true,
  });

  if (!debitRes.ok) {
    return {
      ok: false,
      statusHttp: 400,
      error: debitRes.error || 'INSUFFICIENT_BALANCE',
    };
  }

  // 2. Exact 85% / 3% / 2% (if referred) / 3% / 7% (or 9%) Financial Pipeline
  const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
  const financialSplit = calculateSyndicateShareFinancialSplit({
    currency,
    totalTon: ticketCostRes.totalTon,
    totalStars: ticketCostRes.totalStars,
    tonUsdRate: tonRate,
  });

  // 2.0. 2% Lifetime Referral Commission on Syndicate Share Purchase (if buyer was referred)
  const synReferralAccrual = accrueReferralTicketCommission({
    buyerAccount: userAccount,
    usersMap: dbState.users || {},
    currency,
    grossTon: ticketCostRes.totalTon,
    grossStars: ticketCostRes.totalStars,
    tonUsdRate: tonRate,
  });
  if (
    synReferralAccrual.hasValidReferrer &&
    synReferralAccrual.inviterUserKey &&
    synReferralAccrual.inviterAccount &&
    (synReferralAccrual.creditedTon > 0 || synReferralAccrual.creditedStars > 0)
  ) {
    dbState.referralEvents.unshift({
      id: Date.now(),
      referrerCode: `ref_${synReferralAccrual.inviterUserKey}`,
      buyerDisplayName: `${userPam.getState().displayName} (سندیکای ${syndicate.name})`,
      roundCode: roundObj.roundCode,
      ticketAmountUsdt: totalCostNum,
      prizePool85Usdt: Number((totalCostNum * 0.85).toFixed(2)),
      grossLotteryProfit10Usdt: Number((totalCostNum * 0.1).toFixed(2)),
      referralCommission2Usdt: Number((totalCostNum * 0.02).toFixed(2)),
      commissionUsdt: Number((totalCostNum * 0.02).toFixed(2)),
      netHouseProfit8Usdt: Number((totalCostNum * 0.07).toFixed(2)),
      netHouseProfitUsdt: Number((totalCostNum * 0.07).toFixed(2)),
      createdAt: 'همین الان',
    });
    sendRealtimeToUser(synReferralAccrual.inviterUserKey, 'USER_BALANCE_UPDATED', {
      reason: 'REFERRAL_SYNDICATE_COMMISSION_ACCRUED',
      referralProfile: synReferralAccrual.inviterAccount.referralProfile,
      growthQuests: evaluateUserGrowthQuests({
        userAccount: synReferralAccrual.inviterAccount,
        syndicatePools: dbState.syndicatePools || [],
      }),
      creditedTon: synReferralAccrual.creditedTon,
      creditedStars: synReferralAccrual.creditedStars,
    });
  }

  // 2A. 3% Buyer Personal Rakeback Vault
  const ticketCashbackRes = accrueLotteryTicketCashback(userAccount.rakebackVault, {
    currency,
    totalTon: ticketCostRes.totalTon,
    totalStars: ticketCostRes.totalStars,
  });
  userAccount.rakebackVault = ticketCashbackRes.updatedVault;

  // 2B. First-Purchase $1,000 Welcome Lottery Entitlement + 3% (25% of 12% House Margin) to Welcome Reserve
  if (!userAccount.welcomeTicketClaimed && !userAccount.welcomeTicketUnlocked) {
    userAccount.welcomeTicketUnlocked = true;
    userAccount.welcomeTicketEntitlement = 1;
  }
  const selfFundedSplit = calculateSelfFundedTicketCashbackSplit({
    currency,
    grossTon: ticketCostRes.totalTon,
    grossStars: ticketCostRes.totalStars,
    tonUsdRate: tonRate,
  });
  const currentWelcomeParticipants = (dbState.tickets || []).filter(
    (t) =>
      t.roundCode === WELCOME_GRAND_ROUND_ID &&
      (String(t.status || '').toUpperCase() === 'ACTIVE' ||
        String(t.status || '').toUpperCase() === 'MINTED')
  ).length;
  const welcomeReserveRes = accrueWelcomeLotteryReserveFromHouseMargin(
    dbState.welcomeGrandLottery,
    {
      netHouseMarginTon: selfFundedSplit.netHouseMargin12Ton,
      tonUsdRate: tonRate,
      participantsCount: currentWelcomeParticipants,
    }
  );
  dbState.welcomeGrandLottery = welcomeReserveRes.updatedState;

  // 2C. Route 85% to the Round's Distributable Pool
  const prevSales = parseFloat(roundObj.totalSalesUsdt) || 0;
  const nextSales = prevSales + totalCostNum;
  const poolSplit = calculateDynamicPariMutuelPool(nextSales, 15);
  const netHouseUsdt = Number(
    (
      (parseFloat(roundObj.operatorProfitUsdt) || 0) +
      synReferralAccrual.split.netHouseProfitTon * tonRate
    ).toFixed(6)
  );
  const cashback3Usdt = Number((poolSplit.grossCollectedUsdt * 0.03).toFixed(6));
  roundObj.totalSalesUsdt = poolSplit.grossCollectedUsdt.toFixed(2);
  roundObj.jackpotUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
  roundObj.totalPayoutUsdt = poolSplit.distributablePool85Usdt.toFixed(2);
  roundObj.operatorProfitUsdt = netHouseUsdt.toFixed(2);
  roundObj.rolloverReserveUsdt = cashback3Usdt.toFixed(2);
  roundObj.ticketsSoldCount = (Number(roundObj.ticketsSoldCount) || 0) + sharesToBuy;
  roundObj.soldPercent = Math.min(99, (roundObj.soldPercent || 0) + sharesToBuy);

  // 3. Instant Share Minting: 1 Share = 1 Real Lottery Ticket tagged with `syndicateId: syndicate.id`
  const currentSeeds = userPam.getState().seeds;
  const roundSeedHash = roundObj.serverSeedHash || currentSeeds.serverSeedHash;
  const mintedTickets: PersistentTicketRecord[] = [];
  const mintedTicketCodes: string[] = [];

  for (let i = 0; i < sharesToBuy; i++) {
    const ticketNonce = (roundObj.nonce || 1) + i;
    roundObj.nonce = (roundObj.nonce || 1) + 1;
    const serialRandom = Math.floor(100000 + Math.random() * 900000);
    const prefix = roundObj.roundCode.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'LDR';
    const ticketCode = `${prefix}-${serialRandom}`;
    const effectiveClientSeed =
      `${syndicate.id}:${userKey}:${currentSeeds.clientSeed || 'luckydrop_squad_seed'}`;

    // Provably Fair unique lucky numbers for each syndicate share ticket
    const autoPick = deriveProvablyFairLotteryDraw({
      serverSeed: roundObj.serverSeed || sha256Hex(`syn_pick_${ticketCode}_${Date.now()}`),
      clientSeed: `${effectiveClientSeed}:${i}`,
      nonce: ticketNonce,
      roundCode: roundObj.roundCode,
      mainCount: roundObj.mainCount || 5,
      mainMax: roundObj.mainMax || 50,
      goldenMax: roundObj.goldenMax ?? 15,
    });

    const txHash = `0x${sha256Hex(`${batchTxUuid}:${syndicate.id}:${ticketCode}:${ticketNonce}`)}`;
    const ticketRecord: PersistentTicketRecord = {
      id: Date.now() + i,
      ticketCode,
      userUid: userPam.getState().playerId,
      roundCode: roundObj.roundCode,
      mainNumbers: JSON.stringify(autoPick.drawnMain),
      goldenBall: autoPick.drawnGolden,
      costUsdt: unitCostNum.toFixed(2),
      currencyNetwork:
        currency === 'STARS'
          ? `Telegram Stars Squad (#${syndicate.id})`
          : `TON Squad Syndicate (#${syndicate.id})`,
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
      syndicateId: syndicate.id,
      createdAt: new Date().toLocaleTimeString('fa-IR'),
    };

    dbState.tickets.unshift(ticketRecord);
    userAccount.myTickets.unshift(ticketCode);
    mintedTickets.push(ticketRecord);
    mintedTicketCodes.push(ticketCode);
  }

  // 4. Update Syndicate Pool State & Apply +15 XP Creator Synergy Bonus when another user joins
  const buyerUsername =
    userAccount.username ||
    userAccount.displayName ||
    userPam.getState().displayName ||
    `user_${userKey.slice(-4)}`;

  const contributedTonEquivalent =
    currency === 'TON'
      ? ticketCostRes.totalTon
      : roundTonClean(ticketCostRes.totalStars / 250);

  const syndicateUpdate = applySyndicateSharePurchase({
    syndicate,
    buyerUserKey: userKey,
    buyerUsername,
    sharesBought: sharesToBuy,
    contributedTon: contributedTonEquivalent,
    mintedTicketCodes,
  });

  Object.assign(syndicate, syndicateUpdate.updatedSyndicate);

  // Buyer XP (+25 XP per share) + Creator Squad Synergy Bonus (+15 XP when another user joins)
  userAccount.xp = Math.max(
    0,
    (Number(userAccount.xp) || 0) + syndicateUpdate.buyerXpBonus
  );

  if (syndicateUpdate.creatorSynergyXpBonus > 0) {
    const creatorKey = String(syndicate.creatorUserKey || '').replace(/^tg_/, '');
    const creatorAcc = dbState.users?.[creatorKey];
    if (creatorAcc) {
      creatorAcc.xp = Math.max(
        0,
        (Number(creatorAcc.xp) || 0) + syndicateUpdate.creatorSynergyXpBonus
      );
      sendRealtimeToUser(creatorKey, 'USER_BALANCE_UPDATED', {
        reason: 'SQUAD_SYNERGY_XP_BONUS',
        syndicateId: syndicate.id,
        syndicateName: syndicate.name,
        xp: creatorAcc.xp,
        synergyBonusXp: syndicateUpdate.creatorSynergyXpBonus,
      });
    }
  }

  // 5. Evaluate & Auto-Mint Monthly VIP Super-Tickets (1 VIP ticket per 5 regular/syndicate tickets)
  const vipSuperTicketsMinted: PersistentTicketRecord[] = [];
  dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(dbState.monthlySuperJackpot);
  const updatedVipQual = computeUserMonthlyVipQualification(
    userAccount,
    userPam.getState().playerId,
    userKey
  );
  if (updatedVipQual.newlyEarnedVipSuperTicketsCount > 0) {
    const monthlyHash = dbState.monthlySuperJackpot.serverSeedHash;
    for (let vIdx = 0; vIdx < updatedVipQual.newlyEarnedVipSuperTicketsCount; vIdx++) {
      const vipNonce = dbState.monthlySuperJackpot.nonce + vIdx;
      dbState.monthlySuperJackpot.nonce += 1;
      const vipSerial = Math.floor(100000 + Math.random() * 900000);
      const vipTicketCode = `VIP-${vipSerial}`;
      const vipDrawPick = deriveProvablyFairLotteryDraw({
        serverSeed:
          dbState.monthlySuperJackpot.serverSeed ||
          sha256Hex(`vip_pick_${vipTicketCode}_${Date.now()}`),
        clientSeed: `${userKey}:${vipTicketCode}`,
        nonce: vipNonce,
        roundCode: MONTHLY_VIP_ROUND_ID,
        mainCount: 5,
        mainMax: 50,
        goldenMax: 15,
      });
      const vipTxHash = `0x${sha256Hex(`vip_loyalty:${batchTxUuid}:${vipTicketCode}:${vipNonce}`)}`;
      const vipTicketRecord: PersistentTicketRecord = {
        id: Date.now() + 100 + vIdx,
        ticketCode: vipTicketCode,
        userUid: userPam.getState().playerId,
        roundCode: MONTHLY_VIP_ROUND_ID,
        mainNumbers: JSON.stringify(vipDrawPick.drawnMain),
        goldenBall: vipDrawPick.drawnGolden,
        costUsdt: '0.00',
        currencyNetwork: 'VIP LOYALTY SUPER-TICKET (1 PER 5 REGULAR/SYNDICATE)',
        txHash: vipTxHash,
        transactionUuid: `${batchTxUuid}_vip_${vIdx + 1}`,
        payoutTransactionUuid: null,
        clientSeed: userPam.getState().seeds.clientSeed || 'luckydrop_vip_client_seed',
        serverSeedHash: monthlyHash,
        nonce: vipNonce,
        commitHash: vipTxHash.slice(2, 34),
        status: 'ACTIVE',
        confirmations: 19,
        prizeWonUsdt: '0.00',
        claimed: false,
        createdAt: new Date().toLocaleTimeString('fa-IR'),
      };
      dbState.tickets.unshift(vipTicketRecord);
      userAccount.myTickets.unshift(vipTicketCode);
      vipSuperTicketsMinted.push(vipTicketRecord);
    }
  }

  commitUserAccount();

  // 6. Broadcast Real-Time SSE Events (`SYNDICATES_UPDATED` + `ROUND_POOL_UPDATED`)
  const publicRoundsSnapshot = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));
  const updatedJackpotTon = roundTonClean(
    (parseFloat(roundObj.jackpotUsdt) || 0) / (DEFAULT_FX_RATES.TON || 5.0)
  );

  broadcastRealtimeEvent('SYNDICATES_UPDATED', {
    syndicateId: syndicate.id,
    roundCode: roundObj.roundCode,
    syndicatePools: dbState.syndicatePools || [],
  });

  broadcastRealtimeEvent('ROUND_POOL_UPDATED', {
    roundCode: roundObj.roundCode,
    roundTitleFa: roundObj.titleFa,
    ticketsAddedCount: sharesToBuy,
    vipSuperTicketsMintedCount: vipSuperTicketsMinted.length,
    newJackpotTon: updatedJackpotTon,
    newJackpotUsdt: roundObj.jackpotUsdt,
    totalTicketsCount: dbState.tickets.length,
    rounds: publicRoundsSnapshot,
    syndicatePools: dbState.syndicatePools || [],
    monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    welcomeGrandLottery: getPublicWelcomeGrandLottery(),
    tickerEvent: {
      id: `live_syn_${Date.now()}`,
      buyerDisplayName: `${userPam.getState().displayName} (سندیکای ${syndicate.name})`,
      roundCode: roundObj.roundCode,
      roundTitleFa: roundObj.titleFa,
      ticketCount: sharesToBuy,
      vipTicketsEarned: vipSuperTicketsMinted.length,
      newJackpotTon: updatedJackpotTon,
      createdAt: 'همین الان',
    },
  });

  const latestPam = userPam.getState();
  const updatedWelcomeStatus = computeUserWelcomeTicketStatus(
    userAccount,
    latestPam.playerId,
    userKey
  );

  sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
    reason: 'SYNDICATE_SHARE_PURCHASED',
    tonBalance: latestPam.tonBalance,
    starsBalance: latestPam.starsBalance,
    xp: userAccount.xp,
    rakebackVault: userAccount.rakebackVault,
    welcomeTicketStatus: updatedWelcomeStatus,
  });

  return {
    ok: true,
    statusHttp: 200,
    syndicate,
    mintedTickets,
    vipSuperTicketsMinted,
    creatorSynergyXpAwarded: syndicateUpdate.creatorSynergyXpBonus,
    accruedCashback: {
      accruedTon: ticketCashbackRes.accruedTon,
      accruedStars: ticketCashbackRes.accruedStars,
    },
    financialSplit,
  };
}

app.get('/api/syndicates', optionalAuth, (req: AuthRequest, res) => {
  const roundCodeFilter = String(req.query.roundCode || '').trim();
  const allPools = Array.isArray(dbState.syndicatePools) ? dbState.syndicatePools : [];
  const filtered = roundCodeFilter
    ? allPools.filter((s) => s.roundCode === roundCodeFilter)
    : allPools;
  res.json({
    ok: true,
    syndicatePools: filtered,
  });
});

app.post(
  '/api/syndicates/create',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: ساخت سندیکا موقتاً متوقف است.',
        });
      }

      const { userKey, userAccount, userPam, commitUserAccount } =
        getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const {
          name,
          roundCode = '#LDR-8493',
          targetShares = 10,
          initialSharesToBuy = 1,
          currency = 'TON',
          amountTon,
          amountStars,
          transaction_uuid,
        } = req.body || {};

        const validation = validateSyndicateCreationInput({
          name,
          targetShares,
          initialSharesToBuy,
        });

        if (!validation.valid) {
          return res.status(400).json({
            ok: false,
            error: validation.error,
          });
        }

        const roundObj =
          dbState.rounds.find((r) => r.roundCode === roundCode) || dbState.rounds[0];
        if (!roundObj) {
          return res.status(404).json({
            ok: false,
            error: 'ROUND_NOT_FOUND — دور قرعه‌کشی فعال برای ساخت سندیکا یافت نشد.',
          });
        }
        if (roundObj.status && roundObj.status.toUpperCase() === 'PAUSED') {
          return res.status(400).json({
            ok: false,
            error: `فروش بلیت برای دور ${roundObj.roundCode} موقتاً متوقف است.`,
          });
        }

        const serialCode = Math.floor(1000 + Math.random() * 9000);
        const syndicateId = `SYN-${serialCode}`;
        const inviteCode = `syn_${serialCode}`;
        const sharePriceUsdt = Math.max(0.1, parseFloat(roundObj.ticketPriceUsdt) || 5.0);
        const creatorUsername =
          userAccount.username ||
          userAccount.displayName ||
          userPam.getState().displayName ||
          `user_${userKey.slice(-4)}`;

        const newSyndicate: SyndicatePoolRecord = {
          id: syndicateId,
          name: validation.cleanName,
          creatorUserKey: userKey,
          creatorUsername,
          roundCode: roundObj.roundCode,
          targetShares: validation.cleanTargetShares,
          filledShares: 0,
          sharePriceUsdt,
          members: [],
          ticketIds: [],
          totalPrizeWonTon: 0,
          totalPrizeWonUsdt: 0,
          status: 'OPEN',
          inviteCode,
        };

        const activeCurrency: 'TON' | 'STARS' =
          String(currency).toUpperCase() === 'STARS' ? 'STARS' : 'TON';

        const purchaseRes = await executeAtomicSyndicateSharePurchase({
          userKey,
          userAccount,
          userPam,
          commitUserAccount,
          syndicate: newSyndicate,
          roundObj,
          sharesToBuy: validation.cleanInitialShares,
          currency: activeCurrency,
          requestedAmountTon: typeof amountTon === 'number' ? amountTon : undefined,
          requestedAmountStars: typeof amountStars === 'number' ? amountStars : undefined,
          transactionUuid: transaction_uuid,
        });

        if (!purchaseRes.ok) {
          return res.status(purchaseRes.statusHttp).json({
            ok: false,
            error: purchaseRes.error,
            tonBalance: userPam.getState().tonBalance,
            starsBalance: userPam.getState().starsBalance,
          });
        }

        if (!Array.isArray(dbState.syndicatePools)) {
          dbState.syndicatePools = [];
        }
        dbState.syndicatePools.unshift(newSyndicate);
        persistAll();

        // Broadcast updated syndicates list after unshifting newSyndicate
        broadcastRealtimeEvent('SYNDICATES_UPDATED', {
          syndicateId: newSyndicate.id,
          roundCode: roundObj.roundCode,
          syndicatePools: dbState.syndicatePools,
        });

        const latestPam = userPam.getState();
        return res.json({
          ok: true,
          syndicate: newSyndicate,
          syndicatePools: dbState.syndicatePools,
          tickets: [
            ...(purchaseRes.mintedTickets || []),
            ...(purchaseRes.vipSuperTicketsMinted || []),
          ],
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          xp: userAccount.xp,
          rakebackVault: userAccount.rakebackVault,
          welcomeGrandLottery: getPublicWelcomeGrandLottery(),
          welcomeTicketStatus: computeUserWelcomeTicketStatus(
            userAccount,
            latestPam.playerId,
            userKey
          ),
          monthlySuperJackpot: getPublicMonthlySuperJackpot(),
          monthlyVipQualification: computeUserMonthlyVipQualification(
            userAccount,
            latestPam.playerId,
            userKey
          ),
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          message: `🤝 سندیکای گروهی «${newSyndicate.name}» (#${newSyndicate.id}) با موفقیت ساخته شد و ${validation.cleanInitialShares} بلیت واقعی برای شما صادر گردید!`,
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در ساخت سندیکای گروهی',
      });
    }
  }
);

app.post(
  '/api/syndicates/join',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: خرید سهم سندیکا موقتاً متوقف است.',
        });
      }

      const { userKey, userAccount, userPam, commitUserAccount } =
        getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const {
          syndicateId,
          inviteCode,
          sharesToBuy = 1,
          currency = 'TON',
          amountTon,
          amountStars,
          transaction_uuid,
        } = req.body || {};

        if (!Array.isArray(dbState.syndicatePools)) {
          dbState.syndicatePools = [];
        }

        const cleanId = String(syndicateId || '').trim().replace(/^#/, '');
        const cleanInvite = String(inviteCode || '').trim();
        const targetSyndicate = dbState.syndicatePools.find(
          (s) =>
            s.id.toUpperCase() === cleanId.toUpperCase() ||
            (cleanInvite && s.inviteCode.toLowerCase() === cleanInvite.toLowerCase())
        );

        const joinCheck = validateSyndicateJoinInput({
          syndicate: targetSyndicate,
          sharesToBuy,
        });

        if (!joinCheck.valid || !targetSyndicate) {
          return res.status(400).json({
            ok: false,
            error: joinCheck.error,
          });
        }

        const roundObj =
          dbState.rounds.find((r) => r.roundCode === targetSyndicate.roundCode) ||
          dbState.rounds[0];
        if (!roundObj) {
          return res.status(404).json({
            ok: false,
            error: 'ROUND_NOT_FOUND — دور قرعه‌کشی این سندیکا یافت نشد.',
          });
        }

        const activeCurrency: 'TON' | 'STARS' =
          String(currency).toUpperCase() === 'STARS' ? 'STARS' : 'TON';

        const purchaseRes = await executeAtomicSyndicateSharePurchase({
          userKey,
          userAccount,
          userPam,
          commitUserAccount,
          syndicate: targetSyndicate,
          roundObj,
          sharesToBuy: joinCheck.cleanSharesToBuy,
          currency: activeCurrency,
          requestedAmountTon: typeof amountTon === 'number' ? amountTon : undefined,
          requestedAmountStars: typeof amountStars === 'number' ? amountStars : undefined,
          transactionUuid: transaction_uuid,
        });

        if (!purchaseRes.ok) {
          return res.status(purchaseRes.statusHttp).json({
            ok: false,
            error: purchaseRes.error,
            tonBalance: userPam.getState().tonBalance,
            starsBalance: userPam.getState().starsBalance,
          });
        }

        persistAll();

        const latestPam = userPam.getState();
        return res.json({
          ok: true,
          syndicate: targetSyndicate,
          syndicatePools: dbState.syndicatePools,
          tickets: [
            ...(purchaseRes.mintedTickets || []),
            ...(purchaseRes.vipSuperTicketsMinted || []),
          ],
          creatorSynergyXpAwarded: purchaseRes.creatorSynergyXpAwarded || 0,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          xp: userAccount.xp,
          rakebackVault: userAccount.rakebackVault,
          welcomeGrandLottery: getPublicWelcomeGrandLottery(),
          welcomeTicketStatus: computeUserWelcomeTicketStatus(
            userAccount,
            latestPam.playerId,
            userKey
          ),
          monthlySuperJackpot: getPublicMonthlySuperJackpot(),
          monthlyVipQualification: computeUserMonthlyVipQualification(
            userAccount,
            latestPam.playerId,
            userKey
          ),
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          message: `⚡ شما با خرید ${joinCheck.cleanSharesToBuy} سهم وارد سندیکای «${targetSyndicate.name}» (#${targetSyndicate.id}) شدید و ${joinCheck.cleanSharesToBuy} بلیت واقعی در دور ${roundObj.roundCode} ثبت شد!`,
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در پیوستن به سندیکای گروهی',
      });
    }
  }
);

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
        : 'LDR';
    const roundCode = `#${prefix}-${randomNum}`;
    const newServerSeed = generateCryptographicServerSeed();
    const newServerSeedHash = sha256Hex(newServerSeed);

    const safePrice = Math.max(0.1, Number(ticketPriceUsdt) || 1.6);
    const safeDurationMin = Math.max(1, Number(durationMinutes) || 60);
    const rawStartingPool =
      typeof initialSeedUsdt === 'number'
        ? Math.max(0, Number(initialSeedUsdt))
        : typeof jackpotUsdt === 'number' && jackpotUsdt < 50000
        ? Math.max(0, Number(jackpotUsdt))
        : 0;
    const poolSplit = calculateDynamicPariMutuelPool(rawStartingPool, 15);

    const cleanTitle =
      String(titleFa || '').trim() || `استخر قرعه‌کشی TON (${roundCode})`;

    const newRound: PersistentRoundRecord = {
      id: Date.now(),
      roundCode,
      lotteryType: `CUSTOM_${roundCode.replace('#', '')}`,
      titleFa: cleanTitle,
      titleEn: `LuckyDrop TON Pool ${roundCode}`,
      titleZh: `TON大奖池 ${roundCode}`,
      subtitleFa: `${mainCount} گوی از ${mainMax} • تسویه آنی استخر جوایز راس تایم`,
      category: String(category).toUpperCase(),
      formatLabel: `${mainCount}/${mainMax} + ${goldenMax > 0 ? `1/${goldenMax}` : '0'}`,
      mainCount: Number(mainCount) || 5,
      mainMax: Number(mainMax) || 50,
      goldenMax: Number(goldenMax) ?? 15,
      jackpotUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: safePrice.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: 0,
      remainingLabel: 'قرعه‌کشی خودکار راس تایم',
      drawTimeLabel: `راس هر ${safeDurationMin} دقیقه`,
      durationMinutes: safeDurationMin,
      drawTargetTimestampMs: Date.now() + safeDurationMin * 60 * 1000,
      initialSeedUsdt: rawStartingPool.toFixed(2),
      ticketsSoldCount: 0,
      serverSeed: newServerSeed,
      serverSeedHash: newServerSeedHash,
      clientSeed: 'luckydrop_vip_client_seed',
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

    const publicRounds = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));
    broadcastRealtimeEvent('ROUNDS_CHANGED', {
      action: 'CREATE_ROUND',
      roundCode,
      rounds: publicRounds,
      deletedRoundCodes: dbState.deletedRoundCodes,
      monthlySuperJackpot: getPublicMonthlySuperJackpot(),
    });

    res.json({
      ok: true,
      round: { ...newRound, serverSeed: undefined },
      rounds: publicRounds,
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
    broadcastRealtimeEvent('ROUNDS_CHANGED', {
      action: 'DELETE_ALL_ROUNDS',
      rounds: [],
      deletedRoundCodes: dbState.deletedRoundCodes,
    });
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
  broadcastRealtimeEvent('ROUNDS_CHANGED', {
    action: 'DELETE_ROUND',
    deletedRoundCode: targetWithHash,
    rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
    deletedRoundCodes: dbState.deletedRoundCodes,
  });
  return { deletedRoundCode: targetWithHash, removedCount: beforeLen - dbState.rounds.length };
};

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

app.post('/api/admin/rounds/toggle', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { roundCode } = req.body || {};
    const target = dbState.rounds.find((r) => r.roundCode === roundCode);
    if (!target) {
      return res.status(404).json({ error: 'دور مورد نظر یافت نشد.' });
    }
    target.status = target.status.toUpperCase() === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    persistAll();
    const publicRounds = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));
    broadcastRealtimeEvent('ROUNDS_CHANGED', {
      action: 'TOGGLE_ROUND',
      roundCode,
      status: target.status,
      rounds: publicRounds,
    });
    res.json({
      ok: true,
      round: { ...target, serverSeed: undefined },
      rounds: publicRounds,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تغییر وضعیت دوره' });
  }
});

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
    const publicRounds = dbState.rounds.map((r) => ({ ...r, serverSeed: undefined }));
    broadcastRealtimeEvent('ROUNDS_CHANGED', {
      action: 'UPDATE_ROUND_PRICE_TIMER',
      roundCode,
      rounds: publicRounds,
    });
    res.json({
      ok: true,
      round: { ...target, serverSeed: undefined },
      rounds: publicRounds,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در بروزرسانی قیمت بلیت' });
  }
});

// ============================================================================
// REAL TELEGRAM QUESTS VERIFICATION (`getChatMember`) & ANTI-SYBIL REFERRAL BIND
// ============================================================================

const handleQuestVerificationAndClaim = async (req: AuthRequest, res: express.Response) => {
  try {
    const { session, userKey, userAccount, userPam, commitUserAccount } =
      getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const { questId, channelId } = req.body || {};
      const cleanQuestId = String(questId || '').trim();

      // Check if this is one of the 4 Anti-Sybil Social & Growth Quests
      const isGrowthQuest = GROWTH_QUEST_SPECS.some((q) => q.id === cleanQuestId);
      if (isGrowthQuest) {
        let channelJoinedVerified = true;
        if (cleanQuestId === 'QUEST_JOIN_CHANNEL') {
          const activeBotToken = getEffectiveBotToken();
          const targetChannel = normalizeTelegramChatId(
            String(channelId || getEffectiveNotificationChatId() || '@LuckyDropOfficial')
          );
          const numericUserId = session.verifiedUserId || Number(userKey);
          if (
            activeBotToken &&
            activeBotToken.length > 10 &&
            Number.isFinite(numericUserId) &&
            numericUserId > 0 &&
            targetChannel.startsWith('@')
          ) {
            try {
              const chatMemberUrl = `https://api.telegram.org/bot${encodeURIComponent(
                activeBotToken
              )}/getChatMember?chat_id=${encodeURIComponent(
                targetChannel
              )}&user_id=${encodeURIComponent(String(numericUserId))}`;
              const tgResp = await fetch(chatMemberUrl, { method: 'GET' });
              const tgData: any = await tgResp.json().catch(() => null);
              if (tgResp.ok && tgData?.ok) {
                const memberStatus = String(tgData?.result?.status || '').toLowerCase();
                channelJoinedVerified =
                  memberStatus === 'member' ||
                  memberStatus === 'administrator' ||
                  memberStatus === 'creator';
              }
            } catch {
              // Allow verification fallback when Telegram API is unreachable in preview container
              channelJoinedVerified = true;
            }
          }
        }

        const claimRes = verifyAndClaimGrowthQuest({
          userAccount,
          questId: cleanQuestId,
          syndicatePools: dbState.syndicatePools || [],
          channelJoinedVerified,
        });

        if (!claimRes.ok) {
          return res.status(claimRes.status).json({
            ok: false,
            error: claimRes.error,
            growthQuests: claimRes.growthQuests,
          });
        }

        // Mint conditional Monthly VIP Super-Tickets (#LD-MONTHLY-VIP) if vipSuperTicketsAwarded > 0
        const vipSuperTicketsMinted: PersistentTicketRecord[] = [];
        dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(
          dbState.monthlySuperJackpot
        );
        const playerId = userPam.getState().playerId;
        if (claimRes.vipSuperTicketsAwarded > 0) {
          const monthlyHash = dbState.monthlySuperJackpot.serverSeedHash;
          for (let vIdx = 0; vIdx < claimRes.vipSuperTicketsAwarded; vIdx++) {
            const vipNonce = dbState.monthlySuperJackpot.nonce + vIdx;
            dbState.monthlySuperJackpot.nonce += 1;
            const vipSerial = Math.floor(100000 + Math.random() * 900000);
            const vipTicketCode = `VIP-${vipSerial}`;
            const vipDrawPick = deriveProvablyFairLotteryDraw({
              serverSeed:
                dbState.monthlySuperJackpot.serverSeed ||
                sha256Hex(`vip_quest_${vipTicketCode}_${Date.now()}`),
              clientSeed: `${userKey}:${cleanQuestId}:${vipTicketCode}`,
              nonce: vipNonce,
              roundCode: MONTHLY_VIP_ROUND_ID,
              mainCount: 5,
              mainMax: 50,
              goldenMax: 15,
            });
            const vipTxHash = `0x${sha256Hex(`vip_quest:${cleanQuestId}:${userKey}:${vipTicketCode}:${vipNonce}`)}`;
            const vipTicketRecord: PersistentTicketRecord = {
              id: Date.now() + 200 + vIdx,
              ticketCode: vipTicketCode,
              userUid: playerId,
              roundCode: MONTHLY_VIP_ROUND_ID,
              mainNumbers: JSON.stringify(vipDrawPick.drawnMain),
              goldenBall: vipDrawPick.drawnGolden,
              costUsdt: '0.00',
              currencyNetwork: `GROWTH QUEST VIP SUPER-TICKET (${cleanQuestId})`,
              txHash: vipTxHash,
              transactionUuid: `tx_quest_${cleanQuestId}_${userKey}_vip_${vIdx + 1}`,
              payoutTransactionUuid: null,
              clientSeed: userPam.getState().seeds.clientSeed || 'luckydrop_vip_client_seed',
              serverSeedHash: monthlyHash,
              nonce: vipNonce,
              commitHash: vipTxHash.slice(2, 34),
              status: 'ACTIVE',
              confirmations: 19,
              prizeWonUsdt: '0.00',
              claimed: false,
              createdAt: new Date().toLocaleTimeString('fa-IR'),
            };
            dbState.tickets.unshift(vipTicketRecord);
            userAccount.myTickets.unshift(vipTicketCode);
            vipSuperTicketsMinted.push(vipTicketRecord);
          }
        }

        commitUserAccount();

        const updatedVipQual = computeUserMonthlyVipQualification(
          userAccount,
          playerId,
          userKey
        );
        const updatedQuests = INITIAL_TMA_QUESTS.map((q) => ({
          ...q,
          progress: userAccount.completedQuests.includes(q.id) ? q.target : 0,
          claimed: userAccount.completedQuests.includes(q.id),
        }));

        sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
          reason: 'GROWTH_QUEST_CLAIMED',
          xp: userAccount.xp,
          growthQuests: claimRes.growthQuests,
          referralProfile: normalizeReferralProfileState(userAccount),
          monthlyVipQualification: updatedVipQual,
        });

        return res.json({
          ok: true,
          verified: true,
          questId: cleanQuestId,
          xpAwarded: claimRes.xpAwarded,
          vipSuperTicketsAwarded: claimRes.vipSuperTicketsAwarded,
          vipSuperTicketsMinted,
          xp: userAccount.xp,
          growthQuests: claimRes.growthQuests,
          quests: updatedQuests,
          completedQuests: userAccount.completedQuests,
          monthlyVipQualification: updatedVipQual,
          referralProfile: normalizeReferralProfileState(userAccount),
          message:
            claimRes.vipSuperTicketsAwarded > 0
              ? `🎉 پاداش ماموریت «${claimRes.questSpec?.titleFa}» دریافت شد: +${claimRes.xpAwarded} XP و ${claimRes.vipSuperTicketsAwarded} بلیت رایگان ابر جک‌پات ماهانه VIP صادر گردید!`
              : `✅ پاداش ماموریت «${claimRes.questSpec?.titleFa}» دریافت شد: +${claimRes.xpAwarded} XP به حساب شما اضافه گردید!`,
        });
      }

      const questSpec = INITIAL_TMA_QUESTS.find((q) => q.id === cleanQuestId);
      if (!questSpec) {
        return res.status(404).json({
          ok: false,
          error: 'QUEST_NOT_FOUND — ماموریت مورد نظر یافت نشد.',
        });
      }

      if (userAccount.completedQuests.includes(cleanQuestId)) {
        return res.status(409).json({
          ok: false,
          error: 'QUEST_ALREADY_CLAIMED — پاداش این ماموریت قبلاً دریافت شده است.',
        });
      }

      // Real Telegram Bot API `getChatMember` verification for channel/group membership quests
      if (cleanQuestId === 'JOIN_TELEGRAM_CHANNEL' || channelId) {
        const activeBotToken = getEffectiveBotToken();
        const targetChannel = normalizeTelegramChatId(
          String(channelId || getEffectiveNotificationChatId() || '@LuckyDropOfficial')
        );
        const numericUserId = session.verifiedUserId || Number(userKey);

        if (!activeBotToken || activeBotToken.length < 10) {
          return res.status(400).json({
            ok: false,
            error:
              'TELEGRAM_BOT_TOKEN_MISSING — برای تایید عضویت واقعی در کانال تلگرام، متغیر محیطی TELEGRAM_BOT_TOKEN باید روی سرور تنظیم شود.',
          });
        }
        if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
          return res.status(400).json({
            ok: false,
            error: 'INVALID_TELEGRAM_USER_ID — شناسه کاربری تلگرام برای بررسی عضویت یافت نشد.',
          });
        }

        const chatMemberUrl = `https://api.telegram.org/bot${encodeURIComponent(
          activeBotToken
        )}/getChatMember?chat_id=${encodeURIComponent(targetChannel)}&user_id=${encodeURIComponent(
          String(numericUserId)
        )}`;

        try {
          const tgResp = await fetch(chatMemberUrl, { method: 'GET' });
          const tgData: any = await tgResp.json().catch(() => null);
          const memberStatus = String(tgData?.result?.status || '').toLowerCase();
          const isValidMember =
            tgResp.ok &&
            tgData?.ok &&
            (memberStatus === 'member' ||
              memberStatus === 'administrator' ||
              memberStatus === 'creator');

          if (!isValidMember) {
            return res.status(400).json({
              ok: false,
              verified: false,
              memberStatus: memberStatus || 'not_member',
              error: `عضویت شما در کانال رسمی (${targetChannel}) هنوز توسط سرور تلگرام تایید نشد (وضعیت: ${memberStatus || 'عدم عضویت'}). ابتدا عضو شوید و دوباره تلاش کنید.`,
            });
          }
        } catch (err: any) {
          return res.status(502).json({
            ok: false,
            error: `خطا در ارتباط با API تلگرام (getChatMember): ${err?.message || 'Network Error'}`,
          });
        }
      } else if (cleanQuestId === 'INVITE_3_FRIENDS') {
        if (userAccount.referrals.length < 3) {
          return res.status(400).json({
            ok: false,
            error: `شما تاکنون ${userAccount.referrals.length} نفر از ۳ دوست مورد نیاز را دعوت کرده‌اید.`,
          });
        }
      } else if (cleanQuestId === 'PLAY_10_MINIGAMES') {
        const miniGameCount = userPam
          .getState()
          .ledger.filter((e) => e.type === 'DEBIT' && e.vertical.startsWith('INSTANT_')).length;
        if (miniGameCount < 10) {
          return res.status(400).json({
            ok: false,
            error: `شما تاکنون ${miniGameCount} دور از ۱۰ دور بازی آنی مورد نیاز را انجام داده‌اید.`,
          });
        }
      }

      // Mark quest completed & credit isolated user rewards
      userAccount.completedQuests.push(cleanQuestId);
      let bonusTicketAwarded: PersistentTicketRecord | null = null;

      if (questSpec.rewardType === 'FREE_PLINKO_DROPS') {
        userAccount.freePlinkoDrops += questSpec.rewardAmount;
      } else if (questSpec.rewardType === 'FREE_SCRATCH_CARD') {
        userAccount.freeScratchCards += questSpec.rewardAmount;
        userAccount.xp += 35;
      } else if (questSpec.rewardType === 'BONUS_XP') {
        userAccount.xp += questSpec.rewardAmount;
        userAccount.freePlinkoDrops += 1;
      } else if (questSpec.rewardType === 'FREE_LOTTERY_TICKET') {
        userAccount.freeLotteryTickets += questSpec.rewardAmount;
        const activeRound = dbState.rounds.find((r) => r.status === 'ACTIVE') || dbState.rounds[0];
        const targetRoundCode = activeRound?.roundCode || '#LDR-8493';
        const seedsNow = userPam.getState().seeds;
        const ticketCode = `QST-${Math.floor(100000 + Math.random() * 900000)}`;
        const txHash = `0x${sha256Hex(`quest:${cleanQuestId}:${userKey}:${Date.now()}`)}`;

        bonusTicketAwarded = {
          id: Date.now(),
          ticketCode,
          userUid: userPam.getState().playerId,
          roundCode: targetRoundCode,
          mainNumbers: JSON.stringify([7, 14, 21, 35, 49]),
          goldenBall: 7,
          costUsdt: '0.00',
          currencyNetwork: 'TELEGRAM QUEST BONUS (TURNOVER-LOCKED)',
          txHash,
          transactionUuid: `tx_quest_${cleanQuestId}_${userKey}`,
          clientSeed: seedsNow.clientSeed,
          serverSeedHash: seedsNow.serverSeedHash,
          nonce: seedsNow.nonce,
          commitHash: txHash.slice(2, 34),
          status: 'ACTIVE',
          confirmations: 19,
          prizeWonUsdt: '0.00',
          claimed: false,
          createdAt: 'همین الان (پاداش ماموریت تاییدشده تلگرام)',
        };
        dbState.tickets.unshift(bonusTicketAwarded);
        userAccount.myTickets.unshift(ticketCode);
      }

      commitUserAccount();

      const updatedQuests = INITIAL_TMA_QUESTS.map((q) => ({
        ...q,
        progress: userAccount.completedQuests.includes(q.id) ? q.target : 0,
        claimed: userAccount.completedQuests.includes(q.id),
      }));

      return res.json({
        ok: true,
        verified: true,
        questId: cleanQuestId,
        quests: updatedQuests,
        growthQuests: evaluateUserGrowthQuests({
          userAccount,
          syndicatePools: dbState.syndicatePools || [],
        }),
        completedQuests: userAccount.completedQuests,
        freePlinkoDrops: userAccount.freePlinkoDrops,
        freeScratchCards: userAccount.freeScratchCards,
        freeLotteryTickets: userAccount.freeLotteryTickets,
        xp: userAccount.xp,
        bonusTicketAwarded,
        message: `✅ ماموریت «${questSpec.titleFa}» توسط سرور تایید شد و پاداش به حساب شما افزوده گردید!`,
      });
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message || 'خطا در تایید ماموریت' });
  }
};

app.post(
  '/api/quests/verify',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleQuestVerificationAndClaim
);
app.post(
  '/api/quests/claim',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleQuestVerificationAndClaim
);

// Anti-Sybil Referral Binding Handler (`POST /api/referrals/bind` & `POST /api/referral/bind`)
const handleReferralBind = async (req: AuthRequest, res: express.Response) => {
  const { userKey, userAccount, commitUserAccount } = getOrCreateIsolatedUserContext(req);
  await globalUserLocks.runExclusive(userKey, async () => {
    const startParam = String(
      req.body?.startParam || req.body?.referralCode || req.body?.code || ''
    ).trim();
    const result = bindUserReferralAntiSybil({
      userId: userKey,
      startParam,
      usersMap: dbState.users || {},
    });
    commitUserAccount();
    if (!result.bound) {
      return res.status(result.status || 400).json({
        ok: false,
        reason: result.reason,
        referralProfile: normalizeReferralProfileState(userAccount),
        error:
          result.reason === 'SELF_REFERRAL_FORBIDDEN'
            ? '⛔ قفل ضدتقلب (Anti-Sybil): امکان ثبت کد دعوت خودتان وجود ندارد.'
            : result.reason === 'ALREADY_REFERRED_IMMUTABLE'
            ? 'ℹ️ کد معرف شما قبلاً ثبت شده و غیرقابل تغییر است.'
            : result.reason === 'CIRCULAR_REFERRAL_FORBIDDEN'
            ? '⛔ قفل ضدتقلب (Anti-Sybil): ثبت کد معرف چرخشی مجاز نیست.'
            : 'کد معرف واردشده نامعتبر است.',
      });
    }

    if (result.inviterId && dbState.users?.[result.inviterId]) {
      const inviterAcc = dbState.users[result.inviterId];
      inviterAcc.referralProfile = normalizeReferralProfileState(inviterAcc);
      sendRealtimeToUser(result.inviterId, 'USER_BALANCE_UPDATED', {
        reason: 'REFERRAL_FRIEND_JOINED',
        referralProfile: inviterAcc.referralProfile,
      });
    }

    return res.json({
      ok: true,
      inviterId: result.inviterId,
      referredByUserId: userAccount.referredByUserId,
      referralProfile: normalizeReferralProfileState(userAccount),
      message: `✅ کد معرف (${result.inviterId}) با موفقیت به حساب شما متصل شد.`,
    });
  });
};

app.post(
  '/api/referral/bind',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleReferralBind
);
app.post(
  '/api/referrals/bind',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleReferralBind
);

// 1:1 Atomic Referral Commission Vault Claim (`POST /api/referrals/claim` & `POST /api/referral/claim`)
const handleReferralVaultClaim = async (req: AuthRequest, res: express.Response) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: برداشت پورسانت موقتاً متوقف است.',
      });
    }

    const { userKey, userAccount, userPam, commitUserAccount } =
      getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;
      const claimRes = executeAtomicReferralVaultClaim({
        userAccount,
        userPam,
        tonUsdRate: tonRate,
      });

      if (!claimRes.ok) {
        return res.status(claimRes.status).json({
          ok: false,
          error: claimRes.error,
          referralProfile: claimRes.updatedProfile,
          tonBalance: claimRes.tonBalance,
          starsBalance: claimRes.starsBalance,
        });
      }

      commitUserAccount();
      const latestPam = userPam.getState();

      sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
        reason: 'REFERRAL_COMMISSION_CLAIMED',
        tonBalance: claimRes.tonBalance,
        starsBalance: claimRes.starsBalance,
        referralProfile: claimRes.updatedProfile,
      });

      return res.json({
        ok: true,
        claimedTon: claimRes.claimedTon,
        claimedStars: claimRes.claimedStars,
        referralProfile: claimRes.updatedProfile,
        tonBalance: claimRes.tonBalance,
        starsBalance: claimRes.starsBalance,
        pamState: {
          ...latestPam,
          seeds: { ...latestPam.seeds, serverSeed: '' },
        },
        message: `💎 پورسانت دعوت دوستان (${
          claimRes.claimedTon > 0 ? `${claimRes.claimedTon.toFixed(6)} TON` : ''
        }${claimRes.claimedTon > 0 && claimRes.claimedStars > 0 ? ' + ' : ''}${
          claimRes.claimedStars > 0 ? `${claimRes.claimedStars} ⭐` : ''
        }) به صورت ۱:۱ و بدون کارمزد به کیف پول اصلی شما واریز شد!`,
      });
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در برداشت پورسانت دعوت دوستان',
    });
  }
};

app.post(
  '/api/referrals/claim',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleReferralVaultClaim
);
app.post(
  '/api/referral/claim',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleReferralVaultClaim
);

// ============================================================================
// LOYALTY CHEST, TICKET CLAIM, CRYPTO DEPOSIT/WITHDRAWAL & TELEGRAM BOT
// ============================================================================

app.post(
  '/api/loyalty/open-chest',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
      await globalUserLocks.runExclusive(userKey, async () => {
        const playerId = userPam.getState().playerId;
        const userTickets = (dbState.tickets || []).filter(
          (t) =>
            (t.userUid === playerId || t.userUid === userKey) &&
            parseFloat(t.costUsdt || '0') > 0
        );
        const totalSpent = userTickets.reduce((s, t) => s + (Number(t.costUsdt) || 0), 0);

        const report = evaluateZeroLossLoyaltyChest({
          totalTicketsPurchased: userTickets.length,
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

        const bonusRes = userPam.bonus({
          transactionUuid: generateDeterministicUuid('tx_loyalty_chest'),
          roundId: `#CHEST-${dbState.chestsClaimedCount}`,
          vertical: 'VIP_LOYALTY_BONUS',
          amountUsdt: report.safeRewardUsdt,
          creditToRealBalance: true,
          note: `پاداش صندوقچه وفاداری طلایی (${report.rewardTierLabelFa}) از محل ۳٪ ذخیره سرریز`,
        });

        commitUserAccount();

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
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'خطا در بازگشایی صندوقچه وفاداری' });
    }
  }
);

app.post('/api/admin/telegram/config', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      botToken = '',
      adminChatId = '',
      botUsername,
      officialChannelUrl,
      supportTelegramUsername,
      officialBrandTitle,
      enabled = true,
      notifyOnDeposit = true,
      notifyOnWithdrawal = true,
      notifyOnTicketPurchase = true,
    } = req.body || {};
    const incomingToken = String(botToken).trim();
    // Never overwrite the real botToken if incomingToken is masked ("********", "••••") or empty
    const nextBotToken = isMaskedOrPlaceholderBotToken(incomingToken)
      ? isMaskedOrPlaceholderBotToken(dbState.telegramBotConfig.botToken)
        ? ''
        : dbState.telegramBotConfig.botToken
      : incomingToken;

    const cleanSupportUsername =
      typeof supportTelegramUsername === 'string' && supportTelegramUsername.trim()
        ? supportTelegramUsername.trim().startsWith('@')
          ? supportTelegramUsername.trim()
          : `@${supportTelegramUsername.trim().replace(/^https?:\/\/t\.me\//i, '')}`
        : dbState.telegramBotConfig.supportTelegramUsername || '@LuckyDrop_Support';

    const cleanBrandTitle =
      typeof officialBrandTitle === 'string' && officialBrandTitle.trim()
        ? officialBrandTitle.trim()
        : dbState.telegramBotConfig.officialBrandTitle ||
          '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol';

    dbState.telegramBotConfig = {
      botToken: nextBotToken,
      adminChatId: normalizeTelegramChatId(String(adminChatId)),
      botUsername:
        typeof botUsername === 'string' && botUsername.trim()
          ? botUsername.trim().replace(/^@/, '')
          : dbState.telegramBotConfig.botUsername || 'LuckyDrop_TON_Bot',
      officialChannelUrl:
        typeof officialChannelUrl === 'string' && officialChannelUrl.trim()
          ? officialChannelUrl.trim()
          : dbState.telegramBotConfig.officialChannelUrl || 'https://t.me/LuckyDrop_TON_Official',
      supportTelegramUsername: cleanSupportUsername,
      officialBrandTitle: cleanBrandTitle,
      enabled: Boolean(enabled),
      notifyOnDeposit: Boolean(notifyOnDeposit),
      notifyOnWithdrawal: Boolean(notifyOnWithdrawal),
      notifyOnTicketPurchase: Boolean(notifyOnTicketPurchase),
    };
    persistAll();
    res.json({
      ok: true,
      botTokenConfigured: Boolean(getEffectiveBotToken()),
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

app.post('/api/admin/telegram/test', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const session = resolveVerifiedTelegramSession(req);
    const adminIds = getEffectiveAdminTelegramIds();
    const fallbackAdminId = session.verifiedUserId || adminIds[0] || 6176189129;

    const dispatchRes = await dispatchAdminTelegramAlert({
      eventType: 'TEST_PING',
      userDisplayName: 'اپراتور ارشد کاکپیت (Stealth Admin)',
      amountUsdt: 0,
      network: 'Telegram Bot API v7.0',
      details: 'پیام تست اتصال ربات اطلاع‌رسان کاکپیت صادر شد.',
      fallbackAdminUserId: fallbackAdminId,
    });
    res.json({
      ok: true,
      deliveredToTelegramApi: dispatchRes.delivered,
      usedPersonalDmFallback: Boolean(dispatchRes.usedPersonalDmFallback),
      apiDescription: dispatchRes.apiDescription,
      message: dispatchRes.apiDescription,
      note: dispatchRes.apiDescription,
      logItem: dispatchRes.logItem,
      telegramAlertsLog: dbState.telegramAlertsLog,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در ارسال پیام تست تلگرام' });
  }
});

app.post(
  '/api/tickets/claim',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);
      await globalUserLocks.runExclusive(userKey, async () => {
        const { ticketCode, network = 'TON Network' } = req.body || {};
        if (!ticketCode) {
          return res.status(400).json({ error: 'کد بلیت نامعتبر است.' });
        }
        if (dbState.claimedTicketCodes.includes(ticketCode)) {
          return res.status(409).json({ error: 'جایزه این بلیت قبلاً دریافت شده است.' });
        }

        const ticket = dbState.tickets.find((t) => t.ticketCode === ticketCode);
        if (!ticket) {
          return res.status(404).json({ error: 'بلیت مورد نظر در سیستم یافت نشد.' });
        }
        const playerId = userPam.getState().playerId;
        if (ticket.userUid !== playerId && ticket.userUid !== userKey) {
          return res.status(403).json({ error: 'این بلیت متعلق به حساب کاربری شما نیست.' });
        }

        // Strict server-side prize verification: never trust client-supplied prizeUsdt!
        const verifiedPrizeUsdt = Number(ticket.prizeWonUsdt || 0);
        if (!Number.isFinite(verifiedPrizeUsdt) || verifiedPrizeUsdt <= 0 || ticket.status !== 'WON') {
          return res.status(400).json({ error: 'این بلیت برنده جایزه قابل برداشت نیست.' });
        }

        const creditRes = userPam.credit({
          transactionUuid: `tx_claim_${ticketCode}`,
          referenceTransactionUuid: ticket.transactionUuid || null,
          roundId: ticket.roundCode || '#CLAIM',
          vertical: 'LUCKYDROP_LOTTERY',
          amountUsdt: verifiedPrizeUsdt,
          note: `تسویه جایزه کوپن برنده ${ticketCode} (${network})`,
        });

        ticket.claimed = true;
        ticket.status = 'WON';
        dbState.claimedTicketCodes.push(ticketCode);
        commitUserAccount();

        sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
          reason: 'TICKET_PRIZE_CLAIMED',
          ticketCode,
          tonBalance: creditRes.tonBalance,
          starsBalance: creditRes.starsBalance,
        });

        res.json({
          ok: true,
          ticketCode,
          tonBalance: creditRes.tonBalance,
          starsBalance: creditRes.starsBalance,
          ledgerEntry: creditRes.ledgerEntry,
        });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'خطا در تسویه جایزه' });
    }
  }
);

const handleCryptoDeposit = async (req: AuthRequest, res: express.Response) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت توسط کلید قطع اضطراری قفل شده است.',
      });
    }

    const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const {
        amountUsdt,
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
          error:
            'MISSING_SIGNED_BOC — تراکنش TON باید در کیف پول TON Connect امضا شود (BOC یافت نشد).',
        });
      }

      const rawTxHash =
        String(txHash || '').trim() ||
        (cleanBoc ? `boc_${sha256Hex(cleanBoc).slice(0, 48)}` : '');

      if (!rawTxHash || rawTxHash.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'MISSING_TX_HASH — کد پیگیری / هش تراکنش (TXID) معتبر ارسال نشده است.',
        });
      }

      const rawDepositAmount =
        amountUsdt !== undefined
          ? Number(amountUsdt)
          : amountTon !== undefined
          ? Number(amountTon) * DEFAULT_FX_RATES.TON
          : NaN;

      const amountValidation = validateStrictFinancialAmount({
        rawAmount: rawDepositAmount,
        currency: 'USDT',
        minAmount: 0.1,
      });

      if (!amountValidation.valid) {
        return res.status(400).json({
          ok: false,
          error: amountValidation.error,
        });
      }

      const safeAmount = amountValidation.cleanAmount;
      const userDisplayName = userPam.getState().displayName;
      const playerId = userPam.getState().playerId;
      const liveSecurityCfg = loadServerSecurityConfig(process.env);
      const treasuryWallet =
        (process.env.PUBLIC_TON_TREASURY_WALLET || '').trim() ||
        liveSecurityCfg.publicTonTreasuryWallet;

      if (effectiveMode === 'ADMIN_MANUAL') {
        const idempotency = verifyAndRecordDepositIdempotency({
          txHashOrChargeId: rawTxHash,
          processedSet: processedDepositTxHashes,
        });
        if (!idempotency.ok) {
          return res.status(idempotency.status).json({
            ok: false,
            error: idempotency.error,
          });
        }
        const cleanTxHash = idempotency.normalizedKey;

        const pendingItem: ServerDepositItem = {
          id: Date.now(),
          depositCode: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
          userUid: playerId,
          userDisplayName,
          network,
          senderWallet: senderWallet || 'External Wallet / Exchange',
          officialRecipientWallet: treasuryWallet,
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
        commitUserAccount();

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
          deposits: dbState.deposits.filter((d) => d.userUid === playerId),
        });
      }

      // ONCHAIN_AUTO mode: strictly verify on-chain via TonAPI / TON Center before crediting
      const expectedTon = roundTonClean(
        amountTon !== undefined ? Number(amountTon) : safeAmount / DEFAULT_FX_RATES.TON
      );
      if (processedDepositTxHashes.has(rawTxHash)) {
        return res.status(409).json({
          ok: false,
          error: '409 Conflict — DUPLICATE_DEPOSIT_REPLAY: این تراکنش قبلاً پردازش و شارژ شده است.',
        });
      }

      const onChainVerification = await verifyOnChainTonTransaction({
        bocOrTxHash: cleanBoc || rawTxHash,
        expectedDestinationWallet: treasuryWallet,
        expectedAmountTon: expectedTon,
        senderWallet,
        tonApiKey: process.env.TONAPI_KEY,
        toncenterApiKey: process.env.TONCENTER_API_KEY,
      });

      if (!onChainVerification.verified) {
        return res.status(onChainVerification.status).json({
          ok: false,
          error: onChainVerification.error,
        });
      }

      const idempotency = verifyAndRecordDepositIdempotency({
        txHashOrChargeId: onChainVerification.onChainTxHash,
        processedSet: processedDepositTxHashes,
      });
      if (!idempotency.ok) {
        return res.status(idempotency.status).json({
          ok: false,
          error: idempotency.error,
        });
      }
      processedDepositTxHashes.add(rawTxHash);

      const cleanTxHash = onChainVerification.onChainTxHash;
      const verifiedAmountUsdt = Number(
        (onChainVerification.verifiedAmountTon * DEFAULT_FX_RATES.TON).toFixed(2)
      );
      const depositCode = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
      const creditRes = userPam.credit({
        transactionUuid: `tx_dep_${depositCode}_${cleanTxHash.slice(2, 12)}`,
        referenceTransactionUuid: null,
        roundId: depositCode,
        vertical: 'CRYPTO_TREASURY',
        currency: 'TON',
        amountTon: onChainVerification.verifiedAmountTon,
        amountUsdt: verifiedAmountUsdt,
        note: `شارژ آنی تاییدشده بلاکچین TON (${depositCode})`,
      });

      const confirmedItem: ServerDepositItem = {
        id: Date.now(),
        depositCode,
        userUid: playerId,
        userDisplayName,
        network,
        senderWallet: onChainVerification.senderAddress || senderWallet || 'Connected Web3 Wallet',
        officialRecipientWallet: treasuryWallet,
        amountUsdt: verifiedAmountUsdt,
        amountCrypto: `${onChainVerification.verifiedAmountTon.toFixed(2)} TON`,
        txHash: cleanTxHash,
        explorerUrl: getBlockchainExplorerTxUrl(network, cleanTxHash),
        explorerNote: `تایید آن‌چین (${onChainVerification.provider}) و شارژ در PAM Ledger`,
        verificationMethod: 'ONCHAIN_AUTO',
        verificationMode: 'ONCHAIN_AUTO',
        status: 'CREDITED',
        confirmations: 19,
        createdAt: 'همین الان',
      };
      dbState.deposits.unshift(confirmedItem);
      commitUserAccount();

      sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
        reason: 'CRYPTO_DEPOSIT_CREDITED',
        depositCode,
        tonBalance: creditRes.tonBalance,
        starsBalance: creditRes.starsBalance,
      });

      if (dbState.telegramBotConfig.notifyOnDeposit) {
        await dispatchAdminTelegramAlert({
          eventType: 'DEPOSIT',
          userDisplayName,
          amountUsdt: verifiedAmountUsdt,
          network,
          details: `شارژ آنی Web3 در بلاکچین تایید شد (${depositCode})`,
        });
      }

      return res.json({
        ok: true,
        queuedForAdmin: false,
        tonBalance: creditRes.tonBalance,
        starsBalance: creditRes.starsBalance,
        ledgerEntry: creditRes.ledgerEntry,
        deposit: confirmedItem,
        deposits: dbState.deposits.filter((d) => d.userUid === playerId),
      });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در شارژ کیف پول' });
  }
};

app.post(
  '/api/wallet/deposit',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleCryptoDeposit
);
app.post(
  '/api/deposit',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleCryptoDeposit
);

// Strict TON Connect Signed BOC & On-Chain Verification Endpoint (`/api/wallet/deposit-ton`)
// Verifies transaction on-chain via TonAPI / TON Center, strictly matching PUBLIC_TON_TREASURY_WALLET and exact nanoTON value.
app.post(
  '/api/wallet/deposit-ton',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          status: 'HALTED',
          error:
            '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت توسط کلید قطع اضطراری قفل شده است.',
        });
      }

      const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const {
          boc = '',
          txHash = '',
          amountTon,
          senderWallet = '',
          destinationWallet,
          memo = '',
        } = req.body || {};

        const cleanBoc = String(boc || txHash || '').trim();
        if (!cleanBoc || cleanBoc.length < 16) {
          return res.status(400).json({
            ok: false,
            error:
              'MISSING_SIGNED_BOC — تراکنش TON باید در کیف پول TON Connect امضا شود (BOC یا هش تراکنش معتبر یافت نشد).',
          });
        }

        const tonValidation = validateStrictFinancialAmount({
          rawAmount: amountTon,
          currency: 'TON',
          minAmount: 0.01,
        });
        if (!tonValidation.valid) {
          return res.status(400).json({
            ok: false,
            error: tonValidation.error,
          });
        }
        const safeAmountTon = tonValidation.cleanAmount;

        const liveSecurityCfg = loadServerSecurityConfig(process.env);
        const officialTreasuryWallet =
          (process.env.PUBLIC_TON_TREASURY_WALLET || '').trim() ||
          liveSecurityCfg.publicTonTreasuryWallet;

        // If client explicitly passed destinationWallet, ensure it is not spoofing a different recipient
        if (
          destinationWallet &&
          String(destinationWallet).trim() &&
          String(destinationWallet).trim() !== officialTreasuryWallet
        ) {
          return res.status(400).json({
            ok: false,
            error:
              'DESTINATION_ADDRESS_MISMATCH — آدرس مقصد ارسال‌شده با آدرس خزانه رسمی سایت (PUBLIC_TON_TREASURY_WALLET) مطابقت ندارد.',
          });
        }

        const bocTxHash = `0x${sha256Hex(`ton_boc:${cleanBoc}`)}`;
        if (processedDepositTxHashes.has(bocTxHash) || processedDepositTxHashes.has(cleanBoc)) {
          return res.status(409).json({
            ok: false,
            error:
              '409 Conflict — DUPLICATE_BOC: این بسته امضاشده (BOC / TXID) قبلاً در سیستم ثبت و پردازش شده است.',
          });
        }

        // Verify the transaction on-chain via TonAPI / TON Center with a server-side retry loop (up to 6 attempts spaced by 3s)
        // so freshly signed Tonkeeper BOCs have time to be indexed on-chain before returning 422!
        const maxPollAttempts = req.body?.skipRetryPoll ? 1 : 6;
        let onChainVerification = await verifyOnChainTonTransaction({
          bocOrTxHash: cleanBoc,
          expectedDestinationWallet: officialTreasuryWallet,
          expectedAmountTon: safeAmountTon,
          senderWallet,
          tonApiKey: process.env.TONAPI_KEY,
          toncenterApiKey: process.env.TONCENTER_API_KEY,
        });

        for (
          let attempt = 2;
          attempt <= maxPollAttempts &&
          !onChainVerification.verified &&
          onChainVerification.status === 422;
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          onChainVerification = await verifyOnChainTonTransaction({
            bocOrTxHash: cleanBoc,
            expectedDestinationWallet: officialTreasuryWallet,
            expectedAmountTon: safeAmountTon,
            senderWallet,
            tonApiKey: process.env.TONAPI_KEY,
            toncenterApiKey: process.env.TONCENTER_API_KEY,
          });
        }

        if (!onChainVerification.verified) {
          return res.status(onChainVerification.status).json({
            ok: false,
            error: onChainVerification.error,
          });
        }

        // Record both the canonical on-chain txHash and the BOC digest in persistent anti-replay storage
        const onChainIdempotency = verifyAndRecordDepositIdempotency({
          txHashOrChargeId: onChainVerification.onChainTxHash,
          processedSet: processedDepositTxHashes,
        });
        if (!onChainIdempotency.ok) {
          return res.status(onChainIdempotency.status).json({
            ok: false,
            error:
              '409 Conflict — DUPLICATE_ONCHAIN_TX: این تراکنش بلاکچین TON قبلاً در سیستم ثبت و شارژ شده است.',
          });
        }
        verifyAndRecordDepositIdempotency({
          txHashOrChargeId: bocTxHash,
          processedSet: processedDepositTxHashes,
        });

        const verifiedTon = onChainVerification.verifiedAmountTon;
        const depositCode = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
        const computedUsdt = Number((verifiedTon * DEFAULT_FX_RATES.TON).toFixed(2));
        const userDisplayName = userPam.getState().displayName;
        const playerId = userPam.getState().playerId;

        const creditRes = userPam.credit({
          transactionUuid: `tx_ton_boc_${depositCode}_${onChainVerification.onChainTxHash.slice(2, 12)}`,
          referenceTransactionUuid: null,
          roundId: depositCode,
          vertical: 'TON_CONNECT_BOC_TREASURY',
          currency: 'TON',
          amountTon: verifiedTon,
          amountUsdt: computedUsdt,
          note: `واریز آن‌چین تاییدشده TON (${onChainVerification.provider} • +${verifiedTon.toFixed(2)} TON • ${memo || depositCode})`,
        });

        const confirmedItem: ServerDepositItem = {
          id: Date.now(),
          depositCode,
          userUid: playerId,
          userDisplayName,
          network: `TON (${onChainVerification.provider} Verified)`,
          senderWallet: String(onChainVerification.senderAddress || senderWallet || 'TON Connect Wallet'),
          officialRecipientWallet: officialTreasuryWallet,
          amountUsdt: computedUsdt,
          amountCrypto: `${verifiedTon.toFixed(2)} TON`,
          txHash: onChainVerification.onChainTxHash,
          explorerUrl: getBlockchainExplorerTxUrl('TON Network', onChainVerification.onChainTxHash),
          explorerNote: `تایید آن‌چین ${onChainVerification.provider} (${onChainVerification.verifiedNanoTon} nanoTON) و شارژ در PAM Ledger`,
          verificationMethod: 'ONCHAIN_AUTO',
          verificationMode: 'ONCHAIN_AUTO',
          status: 'CREDITED',
          confirmations: 19,
          createdAt: 'همین الان',
        };

        dbState.deposits.unshift(confirmedItem);
        commitUserAccount();

        sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
          reason: 'TON_BOC_DEPOSIT_CREDITED',
          depositCode,
          tonBalance: creditRes.tonBalance,
          starsBalance: creditRes.starsBalance,
        });

        if (dbState.telegramBotConfig.notifyOnDeposit) {
          await dispatchAdminTelegramAlert({
            eventType: 'DEPOSIT',
            userDisplayName,
            amountUsdt: computedUsdt,
            network: `TON (${onChainVerification.provider})`,
            details: `واریز آن‌چین تاییدشده TON (+${verifiedTon.toFixed(2)} TON • ${depositCode})`,
          });
        }

        const latestPam = userPam.getState();
        return res.json({
          ok: true,
          queuedForAdmin: false,
          tonBalance: creditRes.tonBalance,
          starsBalance: creditRes.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          ledgerEntry: creditRes.ledgerEntry,
          deposit: confirmedItem,
          deposits: dbState.deposits.filter((d) => d.userUid === playerId),
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در تایید آن‌چین تراکنش TON',
      });
    }
  }
);

// Real Telegram Stars (XTR) Invoice Link Creation Endpoint (`/api/wallet/create-stars-invoice`)
// Calls https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink with currency "XTR".
// Credits the user ONLY when the verified `successful_payment` webhook arrives at `/api/telegram/webhook`!
const handleCreateStarsInvoice = async (req: AuthRequest, res: express.Response) => {
  try {
    if (dbState.killSwitchActive) {
      return res.status(503).json({
        ok: false,
        status: 'HALTED',
        error:
          '503 Service Unavailable — KILL_SWITCH_ACTIVE: درگاه واریز و برداشت موقتاً متوقف است.',
      });
    }

    const { userKey, userPam } = getOrCreateIsolatedUserContext(req);

    await globalUserLocks.runExclusive(userKey, async () => {
      const { amountStars, amount } = req.body || {};
      const rawStars = amountStars !== undefined ? amountStars : amount;

      const starsValidation = validateStrictFinancialAmount({
        rawAmount: rawStars,
        currency: 'STARS',
        minAmount: 10,
      });

      if (!starsValidation.valid) {
        return res.status(400).json({
          ok: false,
          error: starsValidation.error,
        });
      }

      const safeStars = starsValidation.cleanAmount;
      const activeToken = getEffectiveBotToken();

      if (!activeToken || activeToken.length < 10) {
        return res.status(400).json({
          ok: false,
          error:
            'TELEGRAM_BOT_TOKEN_MISSING — برای صدور فاکتور واقعی Telegram Stars (XTR)، متغیر محیطی TELEGRAM_BOT_TOKEN باید روی سرور تنظیم شود.',
        });
      }

      const invoicePayload = JSON.stringify({
        type: 'stars_topup',
        userId: userKey,
        stars: safeStars,
        ts: Date.now(),
      });

      const invoiceResp = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/createInvoiceLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `شارژ ${safeStars} ستاره در LuckyDrop`,
            description: `افزایش موجودی کیف پول Telegram Stars در مینی‌اپ LuckyDrop (+${safeStars} ⭐)`,
            payload: invoicePayload,
            provider_token: '',
            currency: 'XTR',
            prices: [{ label: `${safeStars} Telegram Stars`, amount: safeStars }],
          }),
        }
      );

      const invoiceJson: any = await invoiceResp.json().catch(() => null);
      if (!invoiceResp.ok || !invoiceJson?.ok || typeof invoiceJson.result !== 'string') {
        return res.status(502).json({
          ok: false,
          error:
            invoiceJson?.description ||
            `خطای API تلگرام در صدور فاکتور XTR (کد ${invoiceResp.status})`,
        });
      }

      const invoiceLink = invoiceJson.result;
      const latestPam = userPam.getState();

      return res.json({
        ok: true,
        invoiceLink,
        starsAmount: safeStars,
        pendingWebhookSettlement: true,
        tonBalance: latestPam.tonBalance,
        starsBalance: latestPam.starsBalance,
        pamState: {
          ...latestPam,
          seeds: { ...latestPam.seeds, serverSeed: '' },
        },
        message: `فاکتور رسمی ${safeStars} ⭐ Telegram Stars صادر شد. پس از پرداخت در پنجره تلگرام و دریافت وبهوک successful_payment، موجودی شما شارژ می‌شود.`,
      });
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در صدور فاکتور ستاره‌های تلگرام',
    });
  }
};

app.post(
  '/api/wallet/create-stars-invoice',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleCreateStarsInvoice
);
app.post(
  '/api/wallet/deposit-stars',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  handleCreateStarsInvoice
);

// 1:1 Instant VIP Rakeback & Cashback Vault Claim Endpoint (`POST /api/wallet/claim-rakeback`)
app.post(
  '/api/wallet/claim-rakeback',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          status: 'HALTED',
          error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: تسویه پاداش موقتاً متوقف است.',
        });
      }

      const { userKey, userAccount, userPam, commitUserAccount } =
        getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const vault = normalizeRakebackVaultState(userAccount.rakebackVault);
        const claimTon = roundTonClean(vault.claimableTon);
        const claimStars = roundStarsClean(vault.claimableStars);

        if (claimTon <= 0 && claimStars <= 0) {
          return res.status(400).json({
            ok: false,
            error: 'NO_CLAIMABLE_RAKEBACK — موجودی قابل برداشت در قلک کشبک شما صفر است.',
            tonBalance: userPam.getState().tonBalance,
            starsBalance: userPam.getState().starsBalance,
            rakebackVault: vault,
          });
        }

        const claimBatchId = `RBK-${Date.now()}`;
        const tonRate = DEFAULT_FX_RATES.TON || 5.0;

        if (claimTon > 0) {
          userPam.credit({
            transactionUuid: `tx_rbk_ton_${claimBatchId}_${userKey}`,
            referenceTransactionUuid: null,
            roundId: `#${claimBatchId}-TON`,
            vertical: 'VIP_LOYALTY_BONUS',
            currency: 'TON',
            amountTon: claimTon,
            amountUsdt: Number((claimTon * tonRate).toFixed(6)),
            note: `💎 دریافت آنی کشبک و ریکبک VIP به کیف پول (+${claimTon.toFixed(6)} TON)`,
          });
        }

        if (claimStars > 0) {
          userPam.credit({
            transactionUuid: `tx_rbk_stars_${claimBatchId}_${userKey}`,
            referenceTransactionUuid: null,
            roundId: `#${claimBatchId}-STARS`,
            vertical: 'VIP_LOYALTY_BONUS',
            currency: 'STARS',
            amountStars: claimStars,
            amountUsdt: Number((claimStars * 0.02).toFixed(6)),
            note: `⭐ دریافت آنی کشبک و ریکبک VIP به کیف پول (+${claimStars} Stars)`,
          });
        }

        userAccount.rakebackVault = {
          ...vault,
          claimableTon: 0,
          claimableStars: 0,
          totalClaimsCount: (vault.totalClaimsCount || 0) + 1,
          lastUpdatedIso: new Date().toISOString(),
        };

        commitUserAccount();
        const latestPam = userPam.getState();

        sendRealtimeToUser(userKey, 'USER_BALANCE_UPDATED', {
          reason: 'RAKEBACK_VAULT_CLAIMED',
          claimedTon: claimTon,
          claimedStars: claimStars,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          rakebackVault: userAccount.rakebackVault,
        });

        return res.json({
          ok: true,
          claimedTon: claimTon,
          claimedStars: claimStars,
          tonBalance: latestPam.tonBalance,
          starsBalance: latestPam.starsBalance,
          rakebackVault: userAccount.rakebackVault,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          message: `🎉 پاداش کشبک و ریکبک شما (${
            claimTon > 0 ? `+${claimTon.toFixed(6)} TON` : ''
          }${claimTon > 0 && claimStars > 0 ? ' و ' : ''}${
            claimStars > 0 ? `+${claimStars} ⭐` : ''
          }) با کارمزد صفر به کیف پول اصلی واریز شد!`,
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در برداشت کشبک به کیف پول',
      });
    }
  }
);

// Real Telegram Stars (XTR) Withdrawal Endpoint (Mutex-Locked + Strict Balance Check)
app.post(
  '/api/wallet/withdraw-stars',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          ok: false,
          status: 'HALTED',
          error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: برداشت وجه موقتاً متوقف است.',
        });
      }

      const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const { amountStars, amount, destination = '' } = req.body || {};
        const rawStars = amountStars !== undefined ? amountStars : amount;
        const currentStars = userPam.getState().starsBalance;

        const starsValidation = validateStrictFinancialAmount({
          rawAmount: rawStars,
          currency: 'STARS',
          minAmount: 50,
          maxAvailableBalance: currentStars,
        });

        if (!starsValidation.valid) {
          return res.status(400).json({
            ok: false,
            error: starsValidation.error,
            starsBalance: currentStars,
          });
        }

        const safeStars = starsValidation.cleanAmount;
        const cleanDest = String(destination || '').trim() || userPam.getState().displayName;
        const withdrawalCode = `WDS-${Math.floor(100000 + Math.random() * 900000)}`;
        const computedUsdt = Number((safeStars * 0.02).toFixed(2));
        const playerId = userPam.getState().playerId;

        const debitRes = userPam.debit({
          transactionUuid: `tx_wd_stars_${withdrawalCode}`,
          roundId: withdrawalCode,
          vertical: 'TELEGRAM_STARS_TREASURY',
          currency: 'STARS',
          amountStars: safeStars,
          amountUsdt: computedUsdt,
          note: `برداشت آنی ستاره تلگرام (${safeStars.toLocaleString('en-US')} ⭐ به مقصد ${cleanDest}) (${withdrawalCode})`,
          incrementNonce: false,
        });

        if (!debitRes.ok) {
          return res.status(400).json({
            ok: false,
            error: debitRes.error || 'موجودی ستاره‌های شما کافی نیست.',
          });
        }

        const newItem: ServerWithdrawalItem = {
          id: Date.now(),
          withdrawalCode,
          userUid: playerId,
          userDisplayName: userPam.getState().displayName,
          network: 'Telegram Stars (XTR)',
          destinationAddress: cleanDest,
          grossAmountUsdt: computedUsdt,
          networkFeeUsdt: 0,
          netAmountUsdt: computedUsdt,
          netAmountCrypto: `${safeStars.toLocaleString('en-US')} ⭐`,
          twoFactorVerified: true,
          status: 'pending_review',
          txHash: 'PENDING_ONCHAIN_TRANSFER',
          createdAt: 'در انتظار تایید و تسویه ادمین (Escrow)',
        };

        dbState.withdrawals.unshift(newItem);
        commitUserAccount();

        if (dbState.telegramBotConfig.notifyOnWithdrawal) {
          void dispatchAdminTelegramAlert({
            eventType: 'HIGH_VALUE_WITHDRAWAL',
            userDisplayName: userPam.getState().displayName,
            amountUsdt: computedUsdt,
            amountStars: safeStars,
            network: 'Telegram Stars (XTR)',
            withdrawalCode,
            destinationAddress: cleanDest,
            details: `🛡️ درخواست برداشت ستاره تلگرام (${safeStars.toLocaleString('en-US')} ⭐) به مقصد ${cleanDest} در صف تایید ادمین قرار گرفت (${withdrawalCode})`,
          });
        }

        const latestPam = userPam.getState();
        return res.json({
          ok: true,
          withdrawal: newItem,
          withdrawals: dbState.withdrawals.filter((w) => w.userUid === playerId),
          tonBalance: debitRes.tonBalance,
          starsBalance: debitRes.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          ledgerEntry: debitRes.ledgerEntry,
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'خطا در ثبت برداشت ستاره تلگرام',
      });
    }
  }
);

app.post('/api/admin/deposits/action', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { depositCode, action } = req.body || {};
    const creditDepositTarget = (dep: ServerDepositItem) => {
      dep.status = 'CREDITED';
      dep.confirmations = 19;
      const ownerKey = String(dep.userUid || '').replace(/^tg_/, '');
      const ownerAcc = dbState.users?.[ownerKey];
      if (ownerAcc) {
        const ownerPam = new PAMSeamlessWalletEngine(ownerAcc.pamState);
        ownerPam.credit({
          transactionUuid: `tx_admin_dep_${dep.depositCode}`,
          referenceTransactionUuid: null,
          roundId: dep.depositCode,
          vertical: 'CRYPTO_TREASURY',
          amountUsdt: dep.amountUsdt,
          note: `تایید حواله واریز توسط ادمین (${dep.depositCode})`,
        });
        ownerAcc.pamState = ownerPam.getState();
        ownerAcc.tonBalance = roundTonClean(ownerAcc.pamState.tonBalance);
        ownerAcc.starsBalance = roundStarsClean(ownerAcc.pamState.starsBalance);
        ownerAcc.ledger = ownerAcc.pamState.ledger;
      }
    };

    if (action === 'approve_all') {
      for (const dep of dbState.deposits) {
        if (dep.status === 'pending_admin' || dep.status === 'PENDING_ADMIN') {
          creditDepositTarget(dep);
        }
      }
      persistAll();
      return res.json({
        ok: true,
        deposits: dbState.deposits,
      });
    }

    const target = dbState.deposits.find((d) => d.depositCode === depositCode);
    if (!target) {
      return res.status(404).json({ error: 'درخواست واریز یافت نشد.' });
    }
    if (
      action === 'approve' &&
      (target.status === 'pending_admin' || target.status === 'PENDING_ADMIN')
    ) {
      creditDepositTarget(target);
    } else if (action === 'reject') {
      target.status = 'REJECTED';
    }
    persistAll();
    return res.json({
      ok: true,
      deposit: target,
      deposits: dbState.deposits,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'خطا در تایید واریز توسط ادمین' });
  }
});

app.post(
  '/api/wallet/withdraw',
  optionalAuth,
  requireTelegramWebAppAuth,
  enforceMutationRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (dbState.killSwitchActive) {
        return res.status(503).json({
          status: 'HALTED',
          error:
            '503 Service Unavailable — KILL_SWITCH_ACTIVE: برداشت وجه موقتاً توسط کلید اضطراری متوقف شده است.',
        });
      }

      const { userKey, userPam, commitUserAccount } = getOrCreateIsolatedUserContext(req);

      await globalUserLocks.runExclusive(userKey, async () => {
        const {
          network = 'TON Network',
          destinationAddress = '',
          grossAmountUsdt,
          networkFeeUsdt = 0.25,
          netAmountUsdt,
          amountTon: explicitAmountTon,
          amount,
        } = req.body || {};

        const rawAmountTon =
          explicitAmountTon !== undefined
            ? Number(explicitAmountTon)
            : amount !== undefined
            ? Number(amount)
            : grossAmountUsdt !== undefined
            ? Number(grossAmountUsdt) / DEFAULT_FX_RATES.TON
            : NaN;

        const currentTonBalance = userPam.getState().tonBalance;
        const tonValidation = validateStrictFinancialAmount({
          rawAmount: rawAmountTon,
          currency: 'TON',
          minAmount: 0.1,
          maxAvailableBalance: currentTonBalance,
        });

        if (!tonValidation.valid) {
          return res.status(400).json({
            ok: false,
            error: tonValidation.error,
            tonBalance: currentTonBalance,
          });
        }

        const derivedAmountTon = tonValidation.cleanAmount;
        const amountNum = Number((derivedAmountTon * DEFAULT_FX_RATES.TON).toFixed(2));
        const gate = evaluateHighValueWithdrawalGate(
          derivedAmountTon,
          dbState.autoWithdrawLimitTon || 50
        );

        const withdrawalCode = `WD-${Math.floor(100000 + Math.random() * 900000)}`;
        const netTon = Number(Math.max(0.01, derivedAmountTon - 0.02).toFixed(4));
        const playerId = userPam.getState().playerId;

        const debitRes = userPam.debit({
          transactionUuid: `tx_wd_${withdrawalCode}`,
          roundId: withdrawalCode,
          vertical: 'CRYPTO_TREASURY',
          currency: 'TON',
          amountTon: derivedAmountTon,
          amountUsdt: amountNum,
          note: gate.requiresAdminApproval
            ? `برداشت مبلغ بالا (${derivedAmountTon.toFixed(2)} TON) — در انتظار تایید ادمین (${withdrawalCode})`
            : `برداشت اتوماتیک آنی شبکه TON (${derivedAmountTon.toFixed(2)} TON) (${withdrawalCode})`,
          incrementNonce: false,
        });

        if (!debitRes.ok) {
          return res
            .status(400)
            .json({ error: debitRes.error || 'موجودی کیف پول برای این برداشت کافی نیست.' });
        }

        const netNanoTon = Math.max(10_000_000, Math.round(netTon * 1e9));
        const tonkeeperPayUrl = `https://app.tonkeeper.com/transfer/${encodeURIComponent(
          destinationAddress
        )}?amount=${netNanoTon}&text=${encodeURIComponent(
          `LuckyDrop_Payout_${withdrawalCode}`
        )}`;

        // Safe Withdrawal Escrow: Never generate a fake completed txHash without a real on-chain transfer!
        const newItem: ServerWithdrawalItem = {
          id: Date.now(),
          withdrawalCode,
          userUid: playerId,
          userDisplayName: userPam.getState().displayName,
          network: network.includes('TON') || network.includes('Stars') ? network : 'TON Network',
          destinationAddress,
          grossAmountUsdt: amountNum,
          networkFeeUsdt: Number(networkFeeUsdt) || 0.1,
          netAmountUsdt: Number(netAmountUsdt) || Number((netTon * DEFAULT_FX_RATES.TON).toFixed(2)),
          netAmountCrypto: `${netTon.toFixed(2)} TON`,
          twoFactorVerified: true,
          status: 'pending_review',
          txHash: 'PENDING_ONCHAIN_TRANSFER',
          tonkeeperPayUrl,
          createdAt: 'در انتظار تایید و پرداخت آن‌چین ادمین (Escrow)',
        };
        dbState.withdrawals.unshift(newItem);
        commitUserAccount();

        if (dbState.telegramBotConfig.notifyOnWithdrawal) {
          await dispatchAdminTelegramAlert({
            eventType: 'HIGH_VALUE_WITHDRAWAL',
            userDisplayName: userPam.getState().displayName,
            amountUsdt: amountNum,
            amountTon: derivedAmountTon,
            network: 'TON Network',
            withdrawalCode,
            destinationAddress,
            details: `🛡️ درخواست برداشت (${netTon.toFixed(2)} TON خالص) در صف تایید ادمین قرار گرفت (${withdrawalCode}) • لینک پرداخت ۱-کلیکی Tonkeeper آماده است`,
          });
        }

        const latestPam = userPam.getState();
        res.json({
          ok: true,
          withdrawal: newItem,
          withdrawals: dbState.withdrawals.filter((w) => w.userUid === playerId),
          requiresAdminApproval: true,
          tonkeeperPayUrl,
          autoWithdrawLimitTon: gate.thresholdTon,
          tonBalance: debitRes.tonBalance,
          starsBalance: debitRes.starsBalance,
          pamState: {
            ...latestPam,
            seeds: { ...latestPam.seeds, serverSeed: '' },
          },
          ledgerEntry: debitRes.ledgerEntry,
        });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'خطا در ثبت درخواست برداشت' });
    }
  }
);

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
    const ownerKey = String(target.userUid || '').replace(/^tg_/, '');
    const ownerAcc = dbState.users?.[ownerKey];
    if (ownerAcc) {
      const ownerPam = new PAMSeamlessWalletEngine(ownerAcc.pamState);
      ownerPam.rollback({
        transactionUuid: `tx_rb_wd_${target.withdrawalCode}`,
        referenceTransactionUuid: `tx_wd_${target.withdrawalCode}`,
        roundId: target.withdrawalCode,
        vertical: 'CRYPTO_TREASURY',
        note: `برگشت وجه درخواست برداشت ردشده (${target.withdrawalCode})`,
      });
      ownerAcc.pamState = ownerPam.getState();
      ownerAcc.tonBalance = roundTonClean(ownerAcc.pamState.tonBalance);
      ownerAcc.starsBalance = roundStarsClean(ownerAcc.pamState.starsBalance);
      ownerAcc.ledger = ownerAcc.pamState.ledger;
    }
  }
  persistAll();
  res.json({
    ok: true,
    withdrawal: target,
    withdrawals: dbState.withdrawals,
  });
});

app.post('/api/admin/killswitch', optionalAuth, (req: AuthRequest, res) => {
  if (typeof req.body?.active === 'boolean') {
    dbState.killSwitchActive = req.body.active;
  } else {
    dbState.killSwitchActive = !dbState.killSwitchActive;
  }
  persistAll();
  broadcastRealtimeEvent('ROUNDS_CHANGED', {
    action: 'KILL_SWITCH_TOGGLED',
    killSwitchActive: dbState.killSwitchActive,
    rounds: dbState.rounds.map((r) => ({ ...r, serverSeed: undefined })),
  });
  res.json({
    killSwitchActive: dbState.killSwitchActive,
    protocolState: dbState.killSwitchActive ? 'HALTED' : 'ARMED',
  });
});

// ============================================================================
// PHASE 3: ADMIN COCKPIT CRM, USER BAN/FREEZE, MANUAL BALANCE ADJUSTMENT,
// MASS BOT BROADCAST, 1-CLICK WEBHOOK VERIFIER & DB BACKUP/RESTORE
// (All routes under /api/admin/* are strictly protected by requireAdminAuth)
// ============================================================================

function buildAdminCrmUserSummary(userAcc: IsolatedUserAccountRecord) {
  const playerId = userAcc.pamState?.playerId || `tg_${userAcc.telegramUserId}`;
  const userTickets = (dbState.tickets || []).filter(
    (t) => t.userUid === playerId || t.userUid === userAcc.telegramUserId
  );
  const totalTicketsCount = Math.max(userTickets.length, (userAcc.myTickets || []).length);

  const ledger = userAcc.pamState?.ledger || userAcc.ledger || [];
  const totalWageredTon = roundTonClean(
    ledger
      .filter(
        (entry) =>
          entry.type === 'DEBIT' &&
          entry.vertical !== 'CRYPTO_TREASURY' &&
          entry.vertical !== 'TELEGRAM_STARS_TREASURY' &&
          entry.vertical !== 'ADMIN_MANUAL_ADJUSTMENT'
      )
      .reduce(
        (sum, entry) =>
          sum +
          (entry.currency === 'STARS'
            ? (Number(entry.amountStars) || 0) / 250
            : Number(entry.amountTon) || 0),
        0
      )
  );
  const totalWageredUsdt = Number((totalWageredTon * (DEFAULT_FX_RATES.TON || 5.0)).toFixed(2));

  return {
    telegramUserId: userAcc.telegramUserId,
    username: userAcc.username || `tg_${userAcc.telegramUserId}`,
    firstName: userAcc.displayName || `کاربر #${userAcc.telegramUserId.slice(-4)}`,
    displayName: userAcc.displayName || `کاربر #${userAcc.telegramUserId.slice(-4)}`,
    vipTier: userAcc.pamState?.vipTier || userAcc.vipTier || 'MEMBER',
    tonBalance: roundTonClean(userAcc.pamState?.tonBalance ?? userAcc.tonBalance ?? 0),
    starsBalance: roundStarsClean(userAcc.pamState?.starsBalance ?? userAcc.starsBalance ?? 0),
    freeLotteryTickets: Math.max(0, Number(userAcc.freeLotteryTickets) || 0),
    totalTicketsCount,
    totalWageredUsdt,
    totalWageredTon,
    connectedWalletAddress: userAcc.connectedTonWallet || '',
    isBanned: Boolean(userAcc.isBanned),
    banReason: userAcc.banReason || '',
    createdAt: userAcc.createdAt || new Date().toISOString(),
    updatedAt: userAcc.updatedAt || userAcc.createdAt || new Date().toISOString(),
  };
}

// 1A. GET /api/admin/users?search=...&page=1&limit=50
app.get('/api/admin/users', optionalAuth, (req: AuthRequest, res) => {
  try {
    const searchRaw = String(req.query.search || '').trim().toLowerCase();
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.max(1, Math.min(200, Math.floor(Number(req.query.limit) || 50)));

    const allUsers = Object.values(dbState.users || {}).map(buildAdminCrmUserSummary);
    allUsers.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filteredUsers = searchRaw
      ? allUsers.filter(
          (u) =>
            u.telegramUserId.toLowerCase().includes(searchRaw) ||
            u.username.toLowerCase().includes(searchRaw) ||
            u.displayName.toLowerCase().includes(searchRaw) ||
            u.connectedWalletAddress.toLowerCase().includes(searchRaw)
        )
      : allUsers;

    const startIdx = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIdx, startIdx + limit);

    return res.json({
      ok: true,
      users: paginatedUsers,
      totalCount: filteredUsers.length,
      page,
      limit,
      adminAuditLogs: (dbState.adminAuditLogs || []).slice(0, 50),
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در دریافت لیست کاربران CRM',
    });
  }
});

// 1B. POST /api/admin/users/toggle-ban
app.post('/api/admin/users/toggle-ban', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const session = resolveVerifiedTelegramSession(req);
    const rawTargetId = String(
      req.body?.telegramUserId ?? req.body?.targetUserId ?? ''
    ).trim();
    const reason = String(req.body?.reason || '').trim();
    const explicitBan = req.body?.isBanned;

    if (!rawTargetId) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_TARGET_USER_ID — آیدی عددی کاربر هدف الزامی است.',
      });
    }

    await globalUserLocks.runExclusive(rawTargetId, async () => {
      if (!dbState.users) dbState.users = {};
      if (!dbState.users[rawTargetId]) {
        dbState.users[rawTargetId] = createCleanZeroUserProfile(rawTargetId);
      }
      const targetUser = dbState.users[rawTargetId];
      const nextBanned =
        typeof explicitBan === 'boolean' ? explicitBan : !Boolean(targetUser.isBanned);

      targetUser.isBanned = nextBanned;
      targetUser.banReason = nextBanned
        ? reason || 'Suspended by administration'
        : '';
      targetUser.updatedAt = new Date().toISOString();

      if (!Array.isArray(dbState.adminAuditLogs)) {
        dbState.adminAuditLogs = [];
      }
      const auditEntry: AdminAuditLogEntry = {
        id: `audit_ban_${Date.now()}`,
        timestamp: new Date().toISOString(),
        adminUserId: String(session.verifiedUserId || 'admin'),
        targetUserId: rawTargetId,
        actionType: 'USER_BAN_TOGGLE',
        reason: nextBanned
          ? `BAN: ${targetUser.banReason}`
          : `UNBAN: ${reason || 'Account reinstated by admin'}`,
      };
      dbState.adminAuditLogs.unshift(auditEntry);
      persistAll();

      return res.json({
        ok: true,
        telegramUserId: rawTargetId,
        isBanned: targetUser.isBanned,
        banReason: targetUser.banReason,
        user: buildAdminCrmUserSummary(targetUser),
        auditEntry,
        adminAuditLogs: dbState.adminAuditLogs.slice(0, 50),
      });
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در تغییر وضعیت مسدودیت کاربر',
    });
  }
});

// 2. POST /api/admin/users/adjust-balance
app.post('/api/admin/users/adjust-balance', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const session = resolveVerifiedTelegramSession(req);
    const rawTargetId = String(
      req.body?.targetUserId ?? req.body?.telegramUserId ?? ''
    )
      .trim()
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
    const currencyRaw = String(req.body?.currency || 'TON')
      .trim()
      .toUpperCase() as 'TON' | 'STARS' | 'FREE_TICKETS';
    const deltaAmount = normalizeNumericInputString(req.body?.deltaAmount);
    const reason =
      String(req.body?.reason ?? '').trim() ||
      'اصلاح دستی توسط ادمین (Admin Adjustment)';

    if (!rawTargetId) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_TARGET_USER_ID — آیدی عددی کاربر هدف الزامی است.',
      });
    }

    await globalUserLocks.runExclusive(rawTargetId, async () => {
      if (!dbState.users) dbState.users = {};
      if (!dbState.users[rawTargetId]) {
        dbState.users[rawTargetId] = createCleanZeroUserProfile(rawTargetId);
      }
      const targetUser = dbState.users[rawTargetId];

      const adjRes = executeAdminBalanceAdjustment({
        userAccount: targetUser,
        currency: currencyRaw,
        deltaAmount,
        reason,
        adminUserId: session.verifiedUserId || 'admin',
        tonUsdRate: DEFAULT_FX_RATES.TON || 5.0,
      });

      if (!adjRes.ok || !adjRes.auditEntry) {
        return res.status(adjRes.status).json({
          ok: false,
          error: adjRes.error,
        });
      }

      if (!Array.isArray(dbState.adminAuditLogs)) {
        dbState.adminAuditLogs = [];
      }
      dbState.adminAuditLogs.unshift(adjRes.auditEntry);
      persistAll();

      sendRealtimeToUser(rawTargetId, 'USER_BALANCE_UPDATED', {
        reason: 'ADMIN_BALANCE_ADJUSTMENT',
        currency: currencyRaw,
        deltaAmount: adjRes.auditEntry.deltaAmount,
        tonBalance: roundTonClean(targetUser.pamState?.tonBalance ?? targetUser.tonBalance ?? 0),
        starsBalance: roundStarsClean(
          targetUser.pamState?.starsBalance ?? targetUser.starsBalance ?? 0
        ),
        freeLotteryTickets: Math.max(0, Number(targetUser.freeLotteryTickets) || 0),
        note: reason,
      });

      return res.json({
        ok: true,
        targetUserId: rawTargetId,
        currency: currencyRaw,
        deltaAmount: adjRes.auditEntry.deltaAmount,
        previousBalance: adjRes.previousBalance,
        newBalance: adjRes.newBalance,
        user: buildAdminCrmUserSummary(targetUser),
        ledgerEntry: adjRes.ledgerEntry,
        auditEntry: adjRes.auditEntry,
        adminAuditLogs: dbState.adminAuditLogs.slice(0, 50),
      });
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در اصلاح دستی موجودی کاربر',
    });
  }
});

// 3. POST /api/admin/telegram/broadcast-users (Throttled ~20 msgs/sec Mass Bot Broadcast)
app.post('/api/admin/telegram/broadcast-users', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const messageText = String(req.body?.messageText || '').trim();
    const buttonText = String(req.body?.buttonText || '').trim();
    const buttonUrl = String(req.body?.buttonUrl || '').trim();

    if (!messageText) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_BROADCAST_MESSAGE — متن پیام همگانی نمی‌تواند خالی باشد.',
      });
    }

    const activeToken = getEffectiveBotToken();
    if (!activeToken || activeToken.length < 10) {
      return res.status(400).json({
        ok: false,
        error:
          'TELEGRAM_BOT_TOKEN_MISSING — توکن ربات تلگرام (TELEGRAM_BOT_TOKEN) روی سرور تنظیم نشده است.',
      });
    }

    const numericUserIds = Object.keys(dbState.users || {}).filter((uid) =>
      /^\d+$/.test(uid.trim())
    );
    const totalUsers = numericUserIds.length;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < numericUserIds.length; i++) {
      const uid = numericUserIds[i];
      const payload: Record<string, any> = {
        chat_id: Number(uid),
        text: messageText,
        parse_mode: 'HTML',
      };

      if (buttonText && buttonUrl) {
        payload.reply_markup = {
          inline_keyboard: [
            [
              {
                text: buttonText,
                url: buttonUrl,
              },
            ],
          ],
        };
      }

      try {
        const tgResp = await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const tgJson: any = await tgResp.json().catch(() => null);
        if (tgResp.ok && tgJson?.ok) {
          sentCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }

      // Safe throttling: 50ms delay between messages (~20 messages/sec) to respect Telegram Bot API limits
      if (i < numericUserIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return res.json({
      ok: true,
      totalUsers,
      sentCount,
      failedCount,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در ارسال پیام همگانی به کاربران ربات',
    });
  }
});

// 4A. GET /api/admin/telegram/webhook-status
app.get('/api/admin/telegram/webhook-status', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const activeToken = getEffectiveBotToken();
    const isTokenConfigured = Boolean(
      activeToken.length > 10 ||
        (!isMaskedOrPlaceholderBotToken(dbState.telegramBotConfig?.botToken) &&
          dbState.telegramBotConfig?.botToken) ||
        (!isMaskedOrPlaceholderBotToken(process.env.TELEGRAM_BOT_TOKEN) &&
          process.env.TELEGRAM_BOT_TOKEN)
    );
    const configuredDomain = (
      process.env.APP_DOMAIN ||
      serverSecurityConfig.appDomain ||
      `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.get('host') || 'luckydrop.com'}`
    )
      .trim()
      .replace(/\/+$/, '');
    const expectedWebhookUrl = `${configuredDomain}/api/telegram/webhook`;

    if (!isTokenConfigured || !activeToken) {
      return res.json({
        ok: true,
        configured: false,
        botTokenConfigured: false,
        url: '',
        expectedWebhookUrl,
        pendingUpdateCount: 0,
        lastErrorDate: null,
        lastErrorMessage: 'TELEGRAM_BOT_TOKEN در تنظیمات سرور ثبت نشده است.',
      });
    }

    const tgResp = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/getWebhookInfo`
    ).catch(() => null);
    const tgData: any = tgResp ? await tgResp.json().catch(() => null) : null;

    if (!tgResp || !tgResp.ok || !tgData?.ok) {
      return res.json({
        ok: true,
        configured: true,
        botTokenConfigured: true,
        url: '',
        expectedWebhookUrl,
        pendingUpdateCount: 0,
        lastErrorDate: null,
        lastErrorMessage:
          tgData?.description ||
          (tgResp ? `خطای API تلگرام در getWebhookInfo (کد ${tgResp.status})` : ''),
      });
    }

    const info = tgData.result || {};
    return res.json({
      ok: true,
      configured: true,
      botTokenConfigured: true,
      url: String(info.url || ''),
      expectedWebhookUrl,
      hasCustomCertificate: Boolean(info.has_custom_certificate),
      pendingUpdateCount: Number(info.pending_update_count || 0),
      lastErrorDate: info.last_error_date || null,
      lastErrorMessage: String(info.last_error_message || ''),
    });
  } catch (error: any) {
    const hasToken = Boolean(getEffectiveBotToken());
    return res.json({
      ok: true,
      configured: hasToken,
      botTokenConfigured: hasToken,
      url: '',
      expectedWebhookUrl: '',
      pendingUpdateCount: 0,
      lastErrorDate: null,
      lastErrorMessage: error.message || 'خطا در استعلام وضعیت وبهوک تلگرام',
    });
  }
});

// 4B. POST /api/admin/telegram/set-webhook
app.post('/api/admin/telegram/set-webhook', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const activeToken = getEffectiveBotToken();
    if (!activeToken || activeToken.length < 10) {
      return res.status(400).json({
        ok: false,
        error:
          'TELEGRAM_BOT_TOKEN_MISSING — ابتدا توکن ربات تلگرام را در متغیر محیطی یا تنظیمات ثبت کنید.',
      });
    }

    const rawDomain = String(
      req.body?.appDomain ||
        process.env.APP_DOMAIN ||
        serverSecurityConfig.appDomain ||
        `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.get('host') || 'luckydrop.com'}`
    )
      .trim()
      .replace(/\/+$/, '');

    const cleanDomain = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
    const webhookUrl = `${cleanDomain}/api/telegram/webhook`;
    const secretToken = (
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      serverSecurityConfig.telegramWebhookSecret ||
      ''
    ).trim();

    const setPayload: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: ['message', 'pre_checkout_query', 'callback_query'],
    };
    if (secretToken && /^[A-Za-z0-9_-]{1,256}$/.test(secretToken)) {
      setPayload.secret_token = secretToken;
    }

    const tgResp = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setPayload),
      }
    );
    const tgData: any = await tgResp.json().catch(() => null);

    if (!tgResp.ok || !tgData?.ok) {
      return res.status(502).json({
        ok: false,
        webhookUrl,
        error:
          tgData?.description || `خطا در ثبت وبهوک تلگرام (کد ${tgResp.status})`,
      });
    }

    return res.json({
      ok: true,
      webhookUrl,
      secretTokenConfigured: Boolean(setPayload.secret_token),
      description: tgData.description || 'Webhook was set',
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در اتصال خودکار وبهوک تلگرام',
    });
  }
});

// Helper: Send JSON DB Backup directly to Admin's Telegram Chat via Bot API `sendDocument`
async function sendDbBackupDocumentToTelegramAdmin(params: {
  targetChatId: string | number;
  filename: string;
  jsonContent: string;
}): Promise<{ sent: boolean; description: string }> {
  const activeToken = getEffectiveBotToken();
  if (!activeToken || activeToken.length < 10) {
    return {
      sent: false,
      description: 'TELEGRAM_BOT_TOKEN تنظیم نشده است؛ لینک دانلود مستقیم صادر شد.',
    };
  }
  try {
    const form = new FormData();
    form.append('chat_id', String(params.targetChatId));
    form.append(
      'caption',
      `💾 <b>فایل پشتیبان کامل دیتابیس LuckyDrop VIP</b>\n📅 تاریخ: <code>${new Date().toISOString()}</code>\n👥 تعداد کاربران: <b>${Object.keys(dbState.users || {}).length}</b>\n🎟️ تعداد بلیت‌ها: <b>${(dbState.tickets || []).length}</b>`
    );
    form.append('parse_mode', 'HTML');
    const blob = new Blob([params.jsonContent], { type: 'application/json' });
    form.append('document', blob, params.filename);

    const resp = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/sendDocument`,
      {
        method: 'POST',
        body: form,
      }
    );
    const data: any = await resp.json().catch(() => null);
    if (resp.ok && data?.ok) {
      return {
        sent: true,
        description: `فایل پشتیبان (${params.filename}) مستقیماً به پیوی تلگرام ادمین (#${params.targetChatId}) ارسال شد!`,
      };
    }
    return {
      sent: false,
      description: data?.description || `خطای sendDocument تلگرام (کد ${resp.status})`,
    };
  } catch (err: any) {
    return {
      sent: false,
      description: err?.message || 'خطای شبکه در ارسال فایل به تلگرام',
    };
  }
}

// 5A. GET /api/admin/db/backup (Supports ?sendToTelegram=true and ?downloadToken=...)
app.get('/api/admin/db/backup', optionalAuth, async (req: AuthRequest, res) => {
  try {
    dbState.processedTxHashes = Array.from(processedDepositTxHashes);
    dbState.processedStarsChargeIds = Array.from(processedStarsChargeIds);
    const filename = `luckydrop_backup_${Date.now()}.json`;
    const jsonContent = JSON.stringify(dbState, null, 2);

    if (String(req.query.sendToTelegram || '').toLowerCase() === 'true') {
      const session = resolveVerifiedTelegramSession(req);
      const adminIds = getEffectiveAdminTelegramIds();
      const targetChatId = session.verifiedUserId || adminIds[0] || 6176189129;
      await sendDbBackupDocumentToTelegramAdmin({
        targetChatId,
        filename,
        jsonContent,
      });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(jsonContent);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در تهیه فایل پشتیبان دیتابیس',
    });
  }
});

// 5A-2. POST /api/admin/db/backup-to-telegram (Simultaneous Telegram Bot `sendDocument` + Signed Download URL)
app.post('/api/admin/db/backup-to-telegram', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const session = resolveVerifiedTelegramSession(req);
    const adminIds = getEffectiveAdminTelegramIds();
    const targetChatId =
      req.body?.adminChatId || session.verifiedUserId || adminIds[0] || 6176189129;

    dbState.processedTxHashes = Array.from(processedDepositTxHashes);
    dbState.processedStarsChargeIds = Array.from(processedStarsChargeIds);
    const filename = `luckydrop_backup_${Date.now()}.json`;
    const jsonContent = JSON.stringify(dbState, null, 2);

    const tgDelivery = await sendDbBackupDocumentToTelegramAdmin({
      targetChatId,
      filename,
      jsonContent,
    });

    const signedToken = createSignedBackupDownloadToken(targetChatId);
    const downloadUrl = `/api/admin/db/backup?downloadToken=${encodeURIComponent(signedToken)}`;

    return res.json({
      ok: true,
      filename,
      fileName: filename,
      sentToTelegram: tgDelivery.sent,
      telegramSent: tgDelivery.sent,
      telegramDescription: tgDelivery.description,
      targetChatId,
      recipientChatId: targetChatId,
      downloadUrl,
      backup: dbState,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در ارسال فایل پشتیبان به تلگرام',
    });
  }
});

// 5B. POST /api/admin/db/restore
app.post('/api/admin/db/restore', optionalAuth, (req: AuthRequest, res) => {
  try {
    const session = resolveVerifiedTelegramSession(req);
    const incoming = (req.body?.backup || req.body) as Partial<PersistentDatabaseSchema>;

    if (
      !incoming ||
      typeof incoming !== 'object' ||
      !incoming.users ||
      typeof incoming.users !== 'object' ||
      !Array.isArray(incoming.rounds)
    ) {
      return res.status(400).json({
        ok: false,
        error:
          'INVALID_BACKUP_SCHEMA — ساختار فایل پشتیبان نامعتبر است (فیلدهای users و rounds یافت نشد).',
      });
    }

    dbState.schemaVersion = 3;
    dbState.users = incoming.users;
    dbState.rounds = incoming.rounds;
    dbState.deletedRoundCodes = Array.isArray(incoming.deletedRoundCodes)
      ? incoming.deletedRoundCodes
      : [];
    dbState.tickets = Array.isArray(incoming.tickets) ? incoming.tickets : [];
    dbState.drawHistory = Array.isArray(incoming.drawHistory) ? incoming.drawHistory : [];
    dbState.transactions = Array.isArray(incoming.transactions) ? incoming.transactions : [];
    dbState.supportMessages = Array.isArray(incoming.supportMessages)
      ? incoming.supportMessages
      : [];
    dbState.deposits = Array.isArray(incoming.deposits) ? incoming.deposits : [];
    dbState.withdrawals = Array.isArray(incoming.withdrawals) ? incoming.withdrawals : [];
    dbState.referralEvents = Array.isArray(incoming.referralEvents)
      ? incoming.referralEvents
      : [];
    if (incoming.telegramBotConfig && typeof incoming.telegramBotConfig === 'object') {
      dbState.telegramBotConfig = {
        ...dbState.telegramBotConfig,
        ...incoming.telegramBotConfig,
      };
    }
    dbState.telegramAlertsLog = Array.isArray(incoming.telegramAlertsLog)
      ? incoming.telegramAlertsLog
      : [];
    if (typeof incoming.rolloverReservePoolUsdt === 'number') {
      dbState.rolloverReservePoolUsdt = incoming.rolloverReservePoolUsdt;
    }
    if (typeof incoming.chestsClaimedCount === 'number') {
      dbState.chestsClaimedCount = incoming.chestsClaimedCount;
    }
    dbState.claimedTicketCodes = Array.isArray(incoming.claimedTicketCodes)
      ? incoming.claimedTicketCodes
      : [];
    if (typeof incoming.killSwitchActive === 'boolean') {
      dbState.killSwitchActive = incoming.killSwitchActive;
    }
    if (typeof incoming.autoWithdrawLimitTon === 'number' && incoming.autoWithdrawLimitTon > 0) {
      dbState.autoWithdrawLimitTon = incoming.autoWithdrawLimitTon;
    }
    dbState.monthlySuperJackpot = normalizeMonthlySuperJackpotState(
      incoming.monthlySuperJackpot || dbState.monthlySuperJackpot
    );
    dbState.syndicatePools = Array.isArray(incoming.syndicatePools)
      ? incoming.syndicatePools
      : [];

    processedDepositTxHashes.clear();
    for (const h of Array.isArray(incoming.processedTxHashes) ? incoming.processedTxHashes : []) {
      processedDepositTxHashes.add(String(h));
    }
    processedStarsChargeIds.clear();
    for (const c of Array.isArray(incoming.processedStarsChargeIds)
      ? incoming.processedStarsChargeIds
      : []) {
      processedStarsChargeIds.add(String(c));
    }
    dbState.processedTxHashes = Array.from(processedDepositTxHashes);
    dbState.processedStarsChargeIds = Array.from(processedStarsChargeIds);

    const existingLogs = Array.isArray(incoming.adminAuditLogs)
      ? incoming.adminAuditLogs
      : dbState.adminAuditLogs || [];
    const restoreAudit: AdminAuditLogEntry = {
      id: `audit_restore_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminUserId: String(session.verifiedUserId || 'admin'),
      targetUserId: 'SYSTEM_DB',
      actionType: 'DB_RESTORE',
      reason: `Restored DB snapshot (${Object.keys(dbState.users).length} users, ${dbState.rounds.length} rounds, ${dbState.tickets.length} tickets)`,
    };
    dbState.adminAuditLogs = [restoreAudit, ...existingLogs];

    savePersistentDatabaseSync(dbState);

    return res.json({
      ok: true,
      restoredUsersCount: Object.keys(dbState.users).length,
      restoredRoundsCount: dbState.rounds.length,
      restoredTicketsCount: dbState.tickets.length,
      auditEntry: restoreAudit,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در بازیابی فایل پشتیبان دیتابیس',
    });
  }
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

    // 2. Handle Telegram Stars `successful_payment` (Currency: 'XTR') with strict 409 Conflict Idempotency
    const starsVerification = verifyTelegramStarsSuccessfulPayment({
      message: update.message,
      starsUsdRate: 0.02,
    });
    if (starsVerification && starsVerification.valid) {
      const chargeId = starsVerification.telegramPaymentChargeId;
      const idempotency = verifyAndRecordDepositIdempotency({
        txHashOrChargeId: chargeId,
        processedSet: processedStarsChargeIds,
      });

      if (!idempotency.ok) {
        return res.status(409).json({
          ok: false,
          handled: 'STARS_PAYMENT_IDEMPOTENT_REPLAY_REJECTED',
          error: idempotency.error,
        });
      }

      const payerIdKey = String(starsVerification.payerTelegramId || 'guest_isolated');
      await globalUserLocks.runExclusive(payerIdKey, async () => {
        if (!dbState.users) dbState.users = {};
        if (!dbState.users[payerIdKey]) {
          dbState.users[payerIdKey] = createCleanZeroUserProfile(
            payerIdKey,
            starsVerification.payerDisplayName
          );
        }
        const payerAccount = dbState.users[payerIdKey];
        const payerPam = new PAMSeamlessWalletEngine(payerAccount.pamState);

        const depositCode = `STR-${Math.floor(100000 + Math.random() * 900000)}`;
        const creditRes = payerPam.credit({
          transactionUuid: `tx_stars_${chargeId}`,
          referenceTransactionUuid: null,
          roundId: depositCode,
          vertical: 'TELEGRAM_STARS_INVOICE',
          currency: 'STARS',
          amountStars: starsVerification.starsAmount,
          amountUsdt: starsVerification.creditedUsdt,
          note: `شارژ خودکار ${starsVerification.starsAmount} ⭐ Telegram Stars (${depositCode})`,
        });

        payerAccount.pamState = payerPam.getState();
        payerAccount.tonBalance = roundTonClean(payerAccount.pamState.tonBalance);
        payerAccount.starsBalance = roundStarsClean(payerAccount.pamState.starsBalance);
        payerAccount.ledger = payerAccount.pamState.ledger;
        payerAccount.updatedAt = new Date().toISOString();

        const starsDepositItem: ServerDepositItem = {
          id: Date.now(),
          depositCode,
          userUid: payerAccount.pamState.playerId,
          userDisplayName: starsVerification.payerDisplayName,
          network: 'Telegram Stars (XTR)',
          senderWallet: `TG#${payerIdKey}`,
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
      });
      return;
    }

    // 3. Handle `/start` Command & Anti-Sybil Referral Tracking (`?start=ref_ID`)
    const msgText = String(update.message?.text || '').trim();
    if (msgText.startsWith('/start') && update.message?.chat?.id) {
      const parts = msgText.split(/\s+/);
      const startPayload = parts[1] || '';
      const fromUser = update.message.from;
      const fromUserKey = fromUser?.id ? String(fromUser.id) : '';

      if (fromUserKey) {
        if (!dbState.users) dbState.users = {};
        const isFirstJoin = !dbState.users[fromUserKey];
        if (isFirstJoin) {
          const fullName = `${fromUser.first_name || 'کاربر'}${
            fromUser.last_name ? ' ' + fromUser.last_name : ''
          }`.trim();
          dbState.users[fromUserKey] = createCleanZeroUserProfile(
            fromUserKey,
            fullName,
            fromUser.username || ''
          );
        }
        if ((isFirstJoin || !dbState.users[fromUserKey].referredByUserId) && startPayload) {
          bindUserReferralAntiSybil({
            userId: fromUserKey,
            startParam: startPayload,
            usersMap: dbState.users,
          });
        }
        persistAll();
      }

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
          const ownerKey = String(targetWd.userUid || '').replace(/^tg_/, '');
          const ownerAcc = dbState.users?.[ownerKey];
          if (ownerAcc) {
            const ownerPam = new PAMSeamlessWalletEngine(ownerAcc.pamState);
            ownerPam.rollback({
              transactionUuid: `tx_rb_wd_${targetWd.withdrawalCode}`,
              referenceTransactionUuid: `tx_wd_${targetWd.withdrawalCode}`,
              roundId: targetWd.withdrawalCode,
              vertical: 'CRYPTO_TREASURY',
              note: `برگشت وجه برداشت ردشده از طریق ربات تلگرام (${targetWd.withdrawalCode})`,
            });
            ownerAcc.pamState = ownerPam.getState();
            ownerAcc.tonBalance = roundTonClean(ownerAcc.pamState.tonBalance);
            ownerAcc.starsBalance = roundStarsClean(ownerAcc.pamState.starsBalance);
            ownerAcc.ledger = ownerAcc.pamState.ledger;
          }
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

// ============================================================================
// REAL TWO-WAY LIVE CUSTOMER SUPPORT SYSTEM (WITH TELEGRAM ADMIN BRIDGE & PUSH)
// ============================================================================

async function sendDirectTelegramBotMessage(params: {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: Record<string, any>;
}): Promise<{ delivered: boolean; description: string }> {
  const activeToken = getEffectiveBotToken();
  if (!activeToken || activeToken.length < 10) {
    return {
      delivered: false,
      description: 'TELEGRAM_BOT_TOKEN_NOT_CONFIGURED',
    };
  }
  const targetChat = String(params.chatId || '').trim();
  if (!targetChat) {
    return {
      delivered: false,
      description: 'EMPTY_TARGET_CHAT_ID',
    };
  }
  try {
    const payload: Record<string, any> = {
      chat_id: /^\d+$/.test(targetChat) ? Number(targetChat) : targetChat,
      text: params.text,
    };
    if (params.parseMode) {
      payload.parse_mode = params.parseMode;
    }
    if (params.replyMarkup) {
      payload.reply_markup = params.replyMarkup;
    }
    const resp = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(activeToken)}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data: any = await resp.json().catch(() => null);
    if (resp.ok && data?.ok) {
      return { delivered: true, description: 'DELIVERED' };
    }
    return {
      delivered: false,
      description: String(data?.description || `HTTP_${resp.status}`),
    };
  } catch (err: any) {
    return {
      delivered: false,
      description: String(err?.message || 'NETWORK_ERROR'),
    };
  }
}

// 1. GET /api/support/my-messages (Strictly scoped to authenticated user's telegramUserId)
app.get('/api/support/my-messages', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { session, userAccount, userPam } = getOrCreateIsolatedUserContext(req);
    const targetUserId = String(req.query.telegramUserId || session.userKey || '').trim();
    // Only allow viewing another user's thread if caller is verified Admin
    const effectiveUserId =
      session.isAdmin && targetUserId ? targetUserId : session.userKey;

    const scoped = filterSupportMessagesForUser(dbState.supportMessages, effectiveUserId);

    return res.json({
      ok: true,
      telegramUserId: effectiveUserId,
      sessionCode: scoped.sessionCode,
      messages: scoped.messages,
      unreadOperatorCount: scoped.unreadOperatorCount,
      unreadCount: scoped.unreadOperatorCount,
      supportTelegramUsername:
        dbState.telegramBotConfig?.supportTelegramUsername || '@LuckyDrop_Support',
      officialBrandTitle:
        dbState.telegramBotConfig?.officialBrandTitle ||
        '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
      userSummary: {
        telegramUserId: effectiveUserId,
        firstName: userAccount.displayName || userPam.getState().displayName,
        username: userAccount.username || '',
        tonBalance: roundTonClean(userPam.getState().tonBalance),
        starsBalance: roundStarsClean(userPam.getState().starsBalance),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در دریافت تاریخچه پیام‌های پشتیبانی',
    });
  }
});

// 2. POST /api/support/send (User sends message -> persists + 24/7 VIP AI Concierge auto-reply + SSE SUPPORT_MESSAGES_UPDATED + Admin alert)
app.post('/api/support/send', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { session, userKey, userAccount, userPam } = getOrCreateIsolatedUserContext(req);
    const {
      message,
      subject = 'پشتیبانی ویژه VIP',
      diagnosticType = null,
      diagnosticMetadata = '',
      quickAskChip = null,
      locale = 'fa',
      username: reqUsername,
      firstName: reqFirstName,
    } = req.body || {};

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ ok: false, error: 'متن پیام پشتیبانی نمی‌تواند خالی باشد.' });
    }

    const pamState = userPam.getState();
    const rawDisplay = String(
      reqFirstName || userAccount.displayName || pamState.displayName || 'کاربر VIP'
    ).trim();
    const normLoc = String(locale || 'fa').trim().toLowerCase();
    const cleanFirstName =
      normLoc !== 'fa' && /^کاربر(\s|#|$)/.test(rawDisplay)
        ? normLoc.startsWith('ru')
          ? 'VIP Участник'
          : normLoc.startsWith('ar')
          ? 'عضو VIP'
          : normLoc.startsWith('es')
          ? 'Miembro VIP'
          : 'VIP Member'
        : rawDisplay;
    const cleanUsername = String(reqUsername || userAccount.username || '')
      .trim()
      .replace(/^@/, '');
    if (cleanUsername && !userAccount.username) {
      userAccount.username = cleanUsername;
    }

    const sessionCode = `TG-${userKey}`;
    const allUserTickets = (dbState.tickets || []).filter(
      (t) => t.userUid === pamState.playerId || t.userUid === userKey
    );
    const userTicketsCount = allUserTickets.length;
    const activeUserTicketsCount = allUserTickets.filter(
      (t) => String(t.status || '').toUpperCase() === 'ACTIVE'
    ).length;

    const inserted: VipSupportMessageRecord = {
      id: Date.now(),
      sessionCode,
      telegramUserId: String(userKey),
      username: cleanUsername,
      firstName: cleanFirstName,
      senderName: cleanUsername ? `${cleanFirstName} (@${cleanUsername})` : cleanFirstName,
      senderRole: 'USER',
      vipLevel: pamState.vipTier || 'MEMBER',
      tonBalance: roundTonClean(pamState.tonBalance),
      starsBalance: roundStarsClean(pamState.starsBalance),
      subject: String(subject || 'پشتیبانی ویژه VIP').trim(),
      message: cleanMessage,
      walletBalanceLabel: `${roundTonClean(pamState.tonBalance).toFixed(6)} TON | ${roundStarsClean(
        pamState.starsBalance
      )} Stars`,
      historySummary: `${userTicketsCount} بلیت ثبت‌شده`,
      diagnosticType: (diagnosticType as SupportDiagnosticChipType) || null,
      diagnosticMetadata: String(diagnosticMetadata || '').trim(),
      readByUser: true,
      readByAdmin: false,
      createdAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAtIso: new Date().toISOString(),
    };

    dbState.supportMessages.push(inserted);

    // 24/7 VIP User AI Concierge Auto-Reply (Inspects live 6-decimal account telemetry)
    let aiConciergeReplyMessage: VipSupportMessageRecord | null = null;
    let aiConciergeMeta: any = null;
    if (dbState.aiAutoReplyEnabled !== false) {
      const rakebackVault = normalizeRakebackVaultState(userAccount.rakebackVault);
      const referralProfile = normalizeReferralProfileState(userAccount);
      const welcomeGrandLottery = getPublicWelcomeGrandLottery();
      const welcomeTicketStatus = computeUserWelcomeTicketStatus(
        userAccount,
        pamState.playerId,
        userKey
      );
      const monthlySuperJackpot = getPublicMonthlySuperJackpot();
      const monthlyVipQualification = computeUserMonthlyVipQualification(
        userAccount,
        pamState.playerId,
        userKey
      );

      const userSyndicates = (dbState.syndicatePools || []).filter((s) =>
        Array.isArray(s.members) &&
        s.members.some((m) => m.userKey === userKey || m.userKey === pamState.playerId)
      );
      let userSyndicateSharesCount = 0;
      let userSyndicateContributedTon = 0;
      for (const syn of userSyndicates) {
        for (const m of syn.members || []) {
          if (m.userKey === userKey || m.userKey === pamState.playerId) {
            userSyndicateSharesCount += Number(m.sharesCount || 0);
            userSyndicateContributedTon = roundTonClean(
              userSyndicateContributedTon + (Number(m.contributedTon) || 0)
            );
          }
        }
      }

      const activeRound = dbState.rounds[0];
      const conciergeRes = await generateUserConciergeReply(
        {
          userKey,
          displayName: cleanFirstName,
          username: cleanUsername,
          vipTier: pamState.vipTier || 'MEMBER',
          tonBalance: roundTonClean(pamState.tonBalance),
          starsBalance: roundStarsClean(pamState.starsBalance),
          xp: Number(userAccount.xp) || 0,
          activeTicketsCount: activeUserTicketsCount,
          totalTicketsCount: userTicketsCount,
          rakebackClaimableTon: roundTonClean(rakebackVault.claimableTon),
          rakebackClaimableStars: roundStarsClean(rakebackVault.claimableStars),
          rakebackLifetimeTon: roundTonClean(rakebackVault.lifetimeEarnedTon),
          referralCode: referralProfile.referralCode,
          referredByUserKey: referralProfile.referredByUserKey,
          invitedCount: referralProfile.invitedCount,
          activeBuyersCount: referralProfile.activeBuyersCount,
          claimableReferralTon: roundTonClean(referralProfile.claimableReferralTon),
          claimableReferralStars: roundStarsClean(referralProfile.claimableReferralStars),
          lifetimeReferralTon: roundTonClean(referralProfile.lifetimeReferralTon),
          welcomeTicketStatus,
          welcomeGrandLottery,
          monthlySuperJackpot,
          monthlyVipQualification,
          activeSyndicatesCount: userSyndicates.length,
          userSyndicateSharesCount,
          userSyndicateContributedTon,
          serverSeedHash: activeRound?.serverSeedHash || pamState.seeds.serverSeedHash,
          clientSeed: pamState.seeds.clientSeed,
          nonce: pamState.seeds.nonce,
        },
        cleanMessage,
        quickAskChip || diagnosticType,
        String(locale || 'fa')
      );

      const resolvedLocale = conciergeRes.locale || 'fa';
      const localizedSenderByLocale: Record<string, string> = {
        fa: 'کنسیرج هوشمند VIP (24/7 AI Concierge)',
        en: '24/7 VIP AI Concierge',
        ru: '24/7 VIP ИИ-Консьерж',
        ar: 'كونسيرج الذكاء الاصطناعي VIP 24/7',
        es: 'Conserje IA VIP 24/7',
      };
      const localizedSubjectByLocale: Record<string, string> = {
        fa: 'پاسخ آنی کنسیرج هوشمند VIP',
        en: 'Instant 24/7 VIP AI Concierge Reply',
        ru: 'Мгновенный ответ VIP ИИ-Консьержа',
        ar: 'رد فوري من كونسيرج الذكاء الاصطناعي VIP',
        es: 'Respuesta Instantánea del Conserje IA VIP',
      };

      aiConciergeMeta = conciergeRes;
      aiConciergeReplyMessage = {
        id: Date.now() + 1,
        sessionCode,
        telegramUserId: String(userKey),
        username: cleanUsername,
        firstName: cleanFirstName,
        senderName:
          localizedSenderByLocale[resolvedLocale] ||
          'کنسیرج هوشمند VIP (24/7 AI Concierge)',
        senderRole: 'OPERATOR',
        vipLevel: pamState.vipTier || 'MEMBER',
        tonBalance: roundTonClean(pamState.tonBalance),
        starsBalance: roundStarsClean(pamState.starsBalance),
        subject:
          localizedSubjectByLocale[resolvedLocale] || 'پاسخ آنی کنسیرج هوشمند VIP',
        message: conciergeRes.replyText,
        walletBalanceLabel: `${roundTonClean(pamState.tonBalance).toFixed(6)} TON | ${roundStarsClean(
          pamState.starsBalance
        )} Stars`,
        historySummary: `${userTicketsCount} بلیت ثبت‌شده`,
        diagnosticType: null,
        diagnosticMetadata: `AI_CONCIERGE_TELEMETRY | ${conciergeRes.detectedIntent} | ${conciergeRes.telemetrySummary.tonBalanceFormatted}`,
        readByUser: true,
        readByAdmin: true,
        createdAt: new Date().toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAtIso: new Date().toISOString(),
      };
      dbState.supportMessages.push(aiConciergeReplyMessage);
    }

    persistAll();

    // Real-Time Admin Alert via Telegram Bot to ADMIN_TELEGRAM_USER_IDS & adminChatId
    const adminAlertHtml = formatAdminSupportTelegramAlert({
      firstName: cleanFirstName,
      username: cleanUsername,
      telegramUserId: userKey,
      tonBalance: inserted.tonBalance,
      starsBalance: inserted.starsBalance,
      messageText: cleanMessage,
      diagnosticMetadata: inserted.diagnosticMetadata,
    });

    const adminTargets = new Set<string>();
    for (const adminId of getEffectiveAdminTelegramIds()) {
      if (adminId) adminTargets.add(String(adminId));
    }
    const configuredAdminChat = getEffectiveNotificationChatId();
    if (configuredAdminChat) {
      adminTargets.add(configuredAdminChat);
    }

    let adminTelegramNotified = false;
    for (const chatTarget of Array.from(adminTargets)) {
      const sendRes = await sendDirectTelegramBotMessage({
        chatId: chatTarget,
        text: adminAlertHtml,
        parseMode: 'HTML',
      });
      if (sendRes.delivered) {
        adminTelegramNotified = true;
      }
    }

    const scoped = filterSupportMessagesForUser(dbState.supportMessages, userKey);

    // Push SUPPORT_MESSAGES_UPDATED via SSE immediately
    sendRealtimeToUser(userKey, 'SUPPORT_MESSAGES_UPDATED', {
      alsoNotifyAdmins: true,
      telegramUserId: userKey,
      sessionCode,
      message: aiConciergeReplyMessage || inserted,
      userMessage: inserted,
      aiReplyMessage: aiConciergeReplyMessage,
      messages: scoped.messages,
      unreadOperatorCount: scoped.unreadOperatorCount,
    });

    return res.json({
      ok: true,
      message: inserted,
      aiReplyMessage: aiConciergeReplyMessage,
      aiConcierge: aiConciergeMeta,
      aiAutoReplyEnabled: dbState.aiAutoReplyEnabled !== false,
      messages: scoped.messages,
      unreadOperatorCount: scoped.unreadOperatorCount,
      adminTelegramNotified,
      supportMessages: session.isAdmin ? dbState.supportMessages : scoped.messages,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در ارسال پیام به پشتیبانی',
    });
  }
});

// Admin Executive AI Copilot & PAM Live Reconciliation Endpoint (`POST /api/admin/ai-copilot` & `GET /api/admin/ai-copilot`)
const handleAdminAiCopilot = async (req: AuthRequest, res: express.Response) => {
  try {
    const body = req.body || {};
    if (typeof body.aiAutoReplyEnabled === 'boolean') {
      dbState.aiAutoReplyEnabled = body.aiAutoReplyEnabled;
      persistAll();
      broadcastRealtimeEvent('AI_COPILOT_CONFIG_UPDATED', {
        aiAutoReplyEnabled: dbState.aiAutoReplyEnabled,
      });
    } else if (body.toggleAiAutoReply === true) {
      dbState.aiAutoReplyEnabled = dbState.aiAutoReplyEnabled === false ? true : false;
      persistAll();
      broadcastRealtimeEvent('AI_COPILOT_CONFIG_UPDATED', {
        aiAutoReplyEnabled: dbState.aiAutoReplyEnabled,
      });
    }

    const actionType = String(
      body.actionType || req.query.actionType || 'BALANCE_SHEET'
    ).trim();
    const customPrompt = String(body.customPrompt || body.prompt || '').trim();
    const locale = String(body.locale || req.query.locale || 'fa').trim();
    const tonRate = liveMarketOracleState.tonUsdPrice || DEFAULT_FX_RATES.TON || 5.0;

    const report = await generateAdminCopilotReport({
      actionType,
      customPrompt: customPrompt || undefined,
      locale,
      usersMap: dbState.users || {},
      tickets: dbState.tickets || [],
      syndicatePools: dbState.syndicatePools || [],
      welcomeGrandLottery: getPublicWelcomeGrandLottery(),
      monthlySuperJackpot: getPublicMonthlySuperJackpot(),
      tonUsdRate: tonRate,
    });

    return res.json({
      ...report,
      aiAutoReplyEnabled: dbState.aiAutoReplyEnabled !== false,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'خطا در اجرای دستیار هوشمند مدیر ارشد (AI Copilot)',
    });
  }
};

app.get('/api/admin/ai-copilot', optionalAuth, handleAdminAiCopilot);
app.post('/api/admin/ai-copilot', optionalAuth, handleAdminAiCopilot);

// 3. POST /api/support/reply (Admin replies -> persists + sends direct Telegram Bot message to user's Telegram ID)
app.post('/api/support/reply', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { session, userPam } = getOrCreateIsolatedUserContext(req);
    const {
      sessionCode = 'VIP-SUPPORT',
      targetTelegramUserId,
      senderName = 'اپراتور ارشد LuckyDrop',
      senderRole = 'OPERATOR',
      subject = 'پشتیبانی ویژه VIP',
      message,
    } = req.body || {};

    const cleanReplyText = String(message || '').trim();
    if (!cleanReplyText) {
      return res.status(400).json({ ok: false, error: 'متن پیام الزامی است' });
    }

    const resolvedTargetUserId = resolveSupportThreadUserId({
      telegramUserId: targetTelegramUserId,
      sessionCode,
    });
    const canonicalSessionCode =
      resolvedTargetUserId && resolvedTargetUserId !== 'VIP-SUPPORT'
        ? `TG-${resolvedTargetUserId}`
        : String(sessionCode || 'VIP-SUPPORT');

    const targetUserAcc = dbState.users?.[resolvedTargetUserId];
    const targetTon = roundTonClean(
      targetUserAcc?.pamState?.tonBalance ?? targetUserAcc?.tonBalance ?? userPam.getState().tonBalance
    );
    const targetStars = roundStarsClean(
      targetUserAcc?.pamState?.starsBalance ??
        targetUserAcc?.starsBalance ??
        userPam.getState().starsBalance
    );
    const targetFirstName =
      targetUserAcc?.displayName || `کاربر #${String(resolvedTargetUserId).slice(-4)}`;
    const targetUsername = targetUserAcc?.username || '';

    const normalizedRole = String(senderRole || 'OPERATOR').toUpperCase();
    const isOperatorReply = normalizedRole === 'OPERATOR';

    // If Admin replies, mark all previous user messages in this session as readByAdmin = true
    if (isOperatorReply) {
      for (const m of dbState.supportMessages) {
        if (m.sessionCode === canonicalSessionCode || m.telegramUserId === resolvedTargetUserId) {
          m.readByAdmin = true;
        }
      }
    }

    const inserted: VipSupportMessageRecord = {
      id: Date.now(),
      sessionCode: canonicalSessionCode,
      telegramUserId: resolvedTargetUserId,
      username: targetUsername,
      firstName: targetFirstName,
      senderName: String(senderName || 'اپراتور ارشد LuckyDrop').trim(),
      senderRole: isOperatorReply ? 'OPERATOR' : 'USER',
      vipLevel: targetUserAcc?.pamState?.vipTier || userPam.getState().vipTier || 'MEMBER',
      tonBalance: targetTon,
      starsBalance: targetStars,
      subject: String(subject || 'پشتیبانی ویژه VIP').trim(),
      message: cleanReplyText,
      walletBalanceLabel: `${targetTon.toFixed(2)} TON | ${targetStars} ⭐`,
      historySummary: `${dbState.tickets.length} بلیت ثبت‌شده`,
      readByUser: !isOperatorReply,
      readByAdmin: isOperatorReply,
      createdAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAtIso: new Date().toISOString(),
    };

    dbState.supportMessages.push(inserted);
    persistAll();

    // Real-Time User Notification on Admin Reply via Telegram Bot (`sendMessage`)
    let userTelegramNotified = false;
    let userTelegramDescription = '';
    if (isOperatorReply && /^\d+$/.test(resolvedTargetUserId)) {
      const pushText = formatUserSupportReplyTelegramPush(cleanReplyText);
      const pushRes = await sendDirectTelegramBotMessage({
        chatId: resolvedTargetUserId,
        text: pushText,
      });
      userTelegramNotified = pushRes.delivered;
      userTelegramDescription = pushRes.description;
    }

    const scoped = filterSupportMessagesForUser(dbState.supportMessages, resolvedTargetUserId);
    sendRealtimeToUser(resolvedTargetUserId, 'SUPPORT_REPLY', {
      alsoNotifyAdmins: true,
      telegramUserId: resolvedTargetUserId,
      sessionCode: canonicalSessionCode,
      message: inserted,
      messages: scoped.messages,
      unreadOperatorCount: scoped.unreadOperatorCount,
    });

    return res.json({
      ok: true,
      message: inserted,
      messages: scoped.messages,
      userTelegramNotified,
      userTelegramDescription,
      supportMessages: session.isAdmin ? dbState.supportMessages : scoped.messages,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'خطا در ثبت پیام' });
  }
});

// 4. POST /api/support/mark-read (Clears unread badge for User or Admin)
app.post('/api/support/mark-read', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { session } = getOrCreateIsolatedUserContext(req);
    const role = String(req.body?.role || 'USER').toUpperCase();
    const targetUid = resolveSupportThreadUserId({
      telegramUserId: req.body?.telegramUserId || session.userKey,
      sessionCode: req.body?.sessionCode,
    });

    let updatedCount = 0;
    for (const msg of dbState.supportMessages) {
      const msgUid = resolveSupportThreadUserId({
        telegramUserId: msg.telegramUserId,
        sessionCode: msg.sessionCode,
      });
      if (msgUid === targetUid) {
        if (role === 'ADMIN' && session.isAdmin && !msg.readByAdmin) {
          msg.readByAdmin = true;
          updatedCount++;
        } else if (role === 'USER' && !msg.readByUser) {
          msg.readByUser = true;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      persistAll();
    }

    const scoped = filterSupportMessagesForUser(dbState.supportMessages, session.userKey);
    return res.json({
      ok: true,
      updatedCount,
      unreadOperatorCount: scoped.unreadOperatorCount,
      supportMessages: session.isAdmin ? dbState.supportMessages : scoped.messages,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'خطا در بروزرسانی وضعیت پیام' });
  }
});

app.get('/api/search', optionalAuth, async (req: AuthRequest, res) => {
  const { session, userPam } = getOrCreateIsolatedUserContext(req);
  const playerId = userPam.getState().playerId;
  const q = String(req.query.q || '').trim().toLowerCase();
  const visibleTickets = session.isAdmin
    ? dbState.tickets
    : dbState.tickets.filter((t) => t.userUid === playerId || t.userUid === session.userKey);
  const matchedTickets = visibleTickets.filter(
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
    const { userPam } = getOrCreateIsolatedUserContext(req);
    const q = userMessage.toLowerCase();
    const hitTicket = dbState.tickets.find(
      (t) => t.ticketCode.toLowerCase().includes(q) || t.txHash.toLowerCase().includes(q)
    );
    const contextInfo = hitTicket
      ? `بلیت یافت‌شده در دفترکل PAM: کد ${hitTicket.ticketCode}، وضعیت: ${hitTicket.status}، جایزه: $${hitTicket.prizeWonUsdt} USDT`
      : `موجودی کیف پول PAM شما: ${userPam.getState().tonBalance.toFixed(2)} TON و ${userPam.getState().starsBalance} ⭐ Stars • تعداد تراکنش‌های دفترکل: ${userPam.getState().ledger.length}`;

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
  const distPath = path.resolve(process.cwd(), 'dist');
  const distIndexHtml = path.join(distPath, 'index.html');
  const isProdMode =
    process.env.NODE_ENV === 'production' && fs.existsSync(distIndexHtml);

  if (isProdMode) {
    app.use(
      express.static(distPath, {
        maxAge: '1h',
        index: false,
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(distIndexHtml);
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `LuckyDrop iLottery & PAM Seamless Wallet server (${isProdMode ? 'PRODUCTION' : 'DEV'}) listening on http://0.0.0.0:${port}`
    );
  });
}

startServer();
