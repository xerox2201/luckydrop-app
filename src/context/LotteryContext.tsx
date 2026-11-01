import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  auth,
  googleAuthProvider,
  testFirestoreConnection,
  syncOfficialWalletsToFirestore,
  fetchOfficialWalletsFromFirestore,
  syncUserProfileToFirestore,
  syncReferralLinkToFirestore,
  recordReferralCommissionInFirestore,
} from '../lib/firebase.ts';
import {
  CurrencyLang,
  ExchangeRates,
  DEFAULT_FX_RATES,
  formatMultiCurrency,
  LotteryTypeId,
  MultiLotterySpec,
  MULTI_LOTTERY_SPECS,
  BulkTicketSlip,
  generateBulkQuickPickSlips,
  WithdrawalNetwork,
  calculateWithdrawalFeeAndNet,
  SolvencyProtectionMode,
  calculateZeroLossTicketSplit,
  calculateDynamicPariMutuelPool,
  evaluateHighValueWithdrawalGate,
  getBlockchainExplorerTxUrl,
  generateUniqueUserReferralLink,
  calculateReferralDeductionFromNetProfit,
} from '../utils/lotteryEngine.ts';
import {
  ProvablyFairSeedState,
  VerifiableDrawHistoryRecord,
  InstantMiniGameId,
  MiniGameEvaluationResult,
  PlinkoRowCount,
  PlinkoRiskLevel,
  TowerDifficulty,
  calculateZeroLossTurnoverXp,
  deriveProvablyFairLotteryDraw,
  evaluateTicketPrizeTier,
  evaluateProvablyFairMiniGame,
  sha256Hex,
  generateCryptographicServerSeed,
} from '../utils/provablyFair.ts';
import {
  PAMSeamlessWalletEngine,
  PAMPlayerState,
  PAMLedgerEntry,
  PAMReconciliationReport,
  PAMOperationResponse,
  generateDeterministicUuid,
  savePAMStateToIndexedDB,
  loadPAMStateFromIndexedDB,
} from '../services/pamWalletEngine.ts';
import {
  fetchLivePriceOracle,
  LiveOracleSnapshot,
} from '../services/price-oracle.ts';
import {
  WithdrawalRecord,
  loadLocalState,
  saveLocalState,
  isSupabaseConfigured,
} from '../services/supabase.ts';

import {
   useTonConnectUI,
  useTonAddress,
  useTonWallet,
} from '@tonconnect/ui-react';
import { SplashHandshakeState } from '../components/SplashScreen.tsx';
import {
  ActiveTmaCurrency,
  TelegramWebAppUser,
  TmaQuestItem,
  INITIAL_TMA_QUESTS,
  TON_CONNECT_STANDARD_WALLETS,
  buildTonConnectAutoTransferPayload,
  DEFAULT_ADMIN_TELEGRAM_USER_IDS,
  DEFAULT_ADMIN_TON_WALLET_ADDRESS,
  DEFAULT_TON_USD_RATE,
  DEFAULT_STARS_USD_RATE,
  initTelegramMiniAppSdk,
  getScopedStorageKey,
  tmaCurrencyToUsdt,
  usdtToTmaCurrency,
  formatTmaCurrency,
  formatCurrency as rawFormatCurrency,
  truncateTonAddress,
  HapticEngine,
} from '../utils/telegramTma.ts';

import {
  detectInitialLanguage,
  persistLanguageSelection,
  tr,
} from '../utils/i18n.ts';

export type AppRoute =
  | 'lobby'
  | 'play'
  | 'mini-games'
  | 'earn'
  | 'wallet'
  | 'deposit'
  | 'withdraw'
  | 'my-tickets'
  | 'user-panel'
  | 'winners'
  | 'how-it-works'
  | 'status'
  | 'transparency'
  | 'cockpit'
  | 'finances'
  | 'launch'
  | 'terms'
  | '404';

export interface LotteryRoundItem {
  id: number;
  roundCode: string;
  lotteryType?: LotteryTypeId;
  titleFa: string;
  titleEn: string;
  titleZh: string;
  subtitleFa: string;
  category: string;
  formatLabel: string;
  mainCount?: number;
  mainMax?: number;
  goldenMax?: number;
  jackpotUsdt: string;
  ticketPriceUsdt: string;
  rtpPercent: string;
  soldPercent: number;
  remainingLabel: string;
  drawTimeLabel: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce?: number;
  winningNumbers: string;
  winningGoldenBall: number;
  totalSalesUsdt: string;
  totalPayoutUsdt: string;
  operatorProfitUsdt: string;
  rolloverReserveUsdt: string;
  durationMinutes?: number;
  drawTargetTimestampMs?: number;
  initialSeedUsdt?: string;
  ticketsSoldCount?: number;
  status: string;
}

export interface TicketItem {
  id: number;
  ticketCode: string;
  userUid: string;
  roundCode: string;
  mainNumbers: string;
  goldenBall: number;
  costUsdt: string;
  currencyNetwork: string;
  txHash: string;
  transactionUuid?: string;
  payoutTransactionUuid?: string | null;
  clientSeed: string;
  serverSeedHash: string;
  nonce?: number;
  commitHash: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | string;
  tierLabelFa?: string;
  confirmations: number;
  prizeWonUsdt: string;
  claimed?: boolean;
  createdAt: string;
}

export interface TransactionItem {
  id: number;
  txHash: string;
  userUid: string;
  type: string;
  network: string;
  amountUsdt: string;
  amountCrypto: string;
  winnerName: string;
  winnerLocation: string;
  lotteryTitle: string;
  winningCombo: string;
  timeAgoLabel: string;
  status: string;
  blockNumber: number;
  confirmations: number;
}

export interface SupportMessageItem {
  id: number;
  sessionCode: string;
  telegramUserId?: string;
  username?: string;
  firstName?: string;
  senderName: string;
  senderRole: string;
  vipLevel: string;
  subject: string;
  message: string;
  walletBalanceLabel: string;
  tonBalance?: number;
  starsBalance?: number;
  historySummary: string;
  diagnosticType?: string | null;
  diagnosticMetadata?: string;
  readByUser?: boolean;
  readByAdmin?: boolean;
  createdAt: string;
}

export interface DepositRecordItem {
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

export interface ReferralEventItem {
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

export interface TelegramBotAlertConfig {
  botToken: string;
  adminChatId: string;
  botUsername?: string;
  officialChannelUrl?: string;
  supportTelegramUsername?: string;
  officialBrandTitle?: string;
  enabled: boolean;
  notifyOnDeposit?: boolean;
  notifyOnWithdrawal?: boolean;
  notifyOnTicketPurchase?: boolean;
}

export interface TelegramAlertLogItem {
  id: number;
  eventType: 'DEPOSIT' | 'WITHDRAWAL' | 'TICKET_PURCHASE' | 'TEST_PING';
  titleFa?: string;
  summaryFa?: string;
  amountUsdt?: number;
  message: string;
  deliveredToTelegramApi: boolean;
  telegramApiDescription?: string;
  createdAt: string;
}

export type Web3WalletProviderType =
  | 'TronLink'
  | 'MetaMask / TrustWallet'
  | 'TON Wallet'
  | 'TRONLINK'
  | 'TON'
  | 'METAMASK';

export interface DrawExecutionResult {
  drawnMain: number[];
  drawnGolden: number;
  hash: string;
  ticketsEvaluatedCount?: number;
  winnersCount?: number;
  totalPayoutUsdt?: number;
  drawRecord?: VerifiableDrawHistoryRecord;
}

interface LotteryContextType {
  activeRoute: AppRoute;
  navigateTo: (route: AppRoute | 'admin_unauthorized') => void;
  stealthCookieAuthorized: boolean;
  setStealthCookieAuthorized: (val: boolean) => void;
  lang: CurrencyLang;
  setLang: (lang: CurrencyLang) => void;
  fxRates: ExchangeRates;
  oracleSnapshot: LiveOracleSnapshot | null;
  oracleCountdownSec: number;
  oracleMarkupPercent: number;
  setOracleMarkupPercent: (pct: number) => void;
  refreshPriceOracleNow: () => Promise<void>;
  liveTonUsdPrice: number;
  tonChange24hPercent: number;
  liveStarsUsdPrice: number;
  liveStarsPerTon: number;
  portfolioUsdValue: number;
  formatAmount: (usdt: number) => string;
  formatCurrency: (amount: number, currency?: ActiveTmaCurrency) => string;
  firebaseUser: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  // Unified Auth: Web3 Wallet & Telegram
  connectedWeb3Wallet: string;
  connectedWalletProvider: Web3WalletProviderType | null;
  connectWeb3Wallet: (
    providerType: Web3WalletProviderType,
    manualAddressOverride?: string
  ) => Promise<{ ok: boolean; address: string; message: string }>;
  disconnectWeb3Wallet: () => void;
  connectedTonWallet: { address: string; provider: string; truncated: string } | null;
  connectTonWalletOneTap: (
    providerLabel?: string
  ) => Promise<{ ok: boolean; address: string; message: string }>;
  disconnectTonWallet: () => void;
  tonConnectModalOpen: boolean;
  setTonConnectModalOpen: (open: boolean) => void;
  telegramUsername: string;
  connectTelegramAccount: (customHandle?: string) => string;
  // Core PAM & Seamless Single Wallet Engine
  balanceUsdt: number;
  bonusTokensUsdt: number;
  pamState: PAMPlayerState;
  pamLedger: PAMLedgerEntry[];
  pamReconciliation: PAMReconciliationReport | null;
  provablyFairSeeds: ProvablyFairSeedState;
  walletDrawerOpen: boolean;
  setWalletDrawerOpen: (open: boolean) => void;
  pamAuthenticate: () => Promise<PAMOperationResponse>;
  pamFetchBalance: () => Promise<PAMOperationResponse>;
  pamDebit: (params: {
    transactionUuid?: string;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    amountTon?: number;
    amountStars?: number;
    currency?: ActiveTmaCurrency;
    note?: string;
  }) => Promise<PAMOperationResponse>;
  pamCredit: (params: {
    transactionUuid?: string;
    referenceTransactionUuid?: string | null;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    amountTon?: number;
    amountStars?: number;
    currency?: ActiveTmaCurrency;
    note?: string;
    awardLuckyAirdropTicket?: boolean;
  }) => Promise<PAMOperationResponse & { bonusTicketAwarded?: TicketItem | null }>;
  pamRollback: (params: {
    transactionUuid?: string;
    referenceTransactionUuid: string;
    roundId: string;
    vertical: string;
    note?: string;
  }) => Promise<PAMOperationResponse>;
  pamBonus: (params: {
    transactionUuid?: string;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    creditToRealBalance?: boolean;
    note?: string;
  }) => Promise<PAMOperationResponse>;
  pamReconcile: () => Promise<PAMOperationResponse>;
  updateProvablyFairClientSeed: (nextClientSeed: string) => Promise<ProvablyFairSeedState>;
  rotateProvablyFairServerSeed: () => Promise<ProvablyFairSeedState>;
  playInstantMiniGame: (params: {
    gameId: InstantMiniGameId;
    betAmountUsdt: number;
    betAmountNative?: number;
    amountTon?: number;
    amountStars?: number;
    diceRollUnder?: number;
    diceTarget?: number;
    diceMode?: 'OVER' | 'UNDER';
    coinSide?: 'HEADS' | 'TAILS';
    crashAutoCashoutX?: number;
    plinkoRows?: PlinkoRowCount;
    plinkoRisk?: PlinkoRiskLevel;
    minesCount?: number;
    minesRevealedSafeCount?: number;
    minesHitBomb?: boolean;
    selectedTiles?: number[];
    towerDifficulty?: TowerDifficulty;
    towerFloorsCleared?: number;
    towerHitTrap?: boolean;
    selectedColumns?: number[];
    wheelRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
    hiloChoice?: 'HIGHER' | 'LOWER' | 'SAME';
    hiloBaseCard?: number;
    hiloMultiplier?: number;
    hiloWon?: boolean;
    hiloSummaryLabel?: string;
    usedFreeBonusToken?: boolean;
  }) => Promise<{
    ok: boolean;
    error?: string;
    evaluation?: MiniGameEvaluationResult & {
      payoutTon?: number;
      payoutStars?: number;
      betAmountTon?: number;
      betAmountStars?: number;
    };
    payoutTon?: number;
    payoutStars?: number;
    bonusTicketAwarded?: TicketItem | null;
    debitTransactionUuid?: string;
    tonBalance: number;
    starsBalance: number;
  }>;
  startGameSession: (params: {
    gameId: 'MINES' | 'TOWER_3D';
    betAmountUsdt: number;
    betAmountNative?: number;
    amountTon?: number;
    amountStars?: number;
    minesCount?: number;
    towerDifficulty?: TowerDifficulty;
  }) => Promise<{
    ok: boolean;
    error?: string;
    session?: any;
    debitTransactionUuid?: string;
    tonBalance: number;
    starsBalance: number;
  }>;
  revealGameSessionStep: (params: {
    tileIndex?: number;
    colIndex?: number;
  }) => Promise<{
    ok: boolean;
    error?: string;
    status?: 'SAFE_GEM' | 'BOMB_HIT' | 'SAFE_STEP' | 'TRAP_HIT' | 'AUTO_CASHED_OUT';
    hitBomb?: boolean;
    hitTrap?: boolean;
    explodedTile?: number;
    explodedFloor?: number;
    mineIndices?: number[];
    revealedTiles?: number[];
    trapColumnsPerFloor?: number[];
    selectedColumns?: number[];
    clearedFloors?: number;
    currentMultiplier?: number;
    nextMultiplier?: number;
    payoutUsdt?: number;
    evaluation?: MiniGameEvaluationResult;
    debitTransactionUuid?: string;
  }>;
  cashoutGameSession: () => Promise<{
    ok: boolean;
    error?: string;
    status?: 'CASHED_OUT';
    mineIndices?: number[];
    revealedTiles?: number[];
    trapColumnsPerFloor?: number[];
    selectedColumns?: number[];
    multiplier?: number;
    payoutUsdt?: number;
    evaluation?: MiniGameEvaluationResult;
    debitTransactionUuid?: string;
  }>;
  // Telegram Mini App (TMA) Dual-Currency, Quests & Admin ID Lock
  activeTmaCurrency: ActiveTmaCurrency;
  setActiveTmaCurrency: (currency: ActiveTmaCurrency) => void;
  tonBalance: number;
  starsBalance: number;
  tonUsdRate: number;
  setTonUsdRate: (rate: number) => void;
  starsUsdRate: number;
  setStarsUsdRate: (rate: number) => void;
  formatActiveTmaAmount: (usdtAmount: number) => string;
  telegramUser: TelegramWebAppUser;
  adminTelegramUserIds: number[];
  setAdminTelegramUserIds: (ids: number[]) => void;
  adminTonWalletAddress: string;
  setAdminTonWalletAddress: (addr: string) => void;
  isTelegramAdmin: boolean;
  splashState: SplashHandshakeState;
  retryHandshake: () => Promise<void>;
  freePlinkoDrops: number;
  freeScratchCards: number;
  freeLotteryTickets: number;
  tmaXpPoints: number;
  tmaQuests: TmaQuestItem[];
  completeAndClaimTmaQuest: (questId: TmaQuestItem['id']) => {
    ok: boolean;
    message: string;
  };
  consumeFreePlinkoDrop: () => boolean;
  consumeFreeScratchCard: () => boolean;
  depositTonInstant: (
    amountTon: number,
    senderWallet?: string,
    memo?: string
  ) => Promise<{ ok: boolean; message: string }>;
  depositTelegramStarsInstant: (
    amountStars: number
  ) => Promise<{ ok: boolean; message: string }>;
  withdrawTonOrStars: (params: {
    currency: ActiveTmaCurrency;
    amount: number;
    destination: string;
  }) => Promise<{ ok: boolean; message: string }>;
  vipTier: string;
  displayName: string;
  rounds: LotteryRoundItem[];
  tickets: TicketItem[];
  drawHistory: VerifiableDrawHistoryRecord[];
  transactions: TransactionItem[];
  supportMessages: SupportMessageItem[];
  mySupportMessages: SupportMessageItem[];
  unreadSupportCount: number;
  supportTelegramUsername: string;
  officialBrandTitle: string;
  fetchMySupportMessages: () => Promise<SupportMessageItem[]>;
  sendUserSupportMessage: (params: {
    message: string;
    subject?: string;
    diagnosticType?: string | null;
    diagnosticMetadata?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  markSupportMessagesRead: (
    role?: 'USER' | 'ADMIN',
    targetTelegramUserId?: string
  ) => Promise<void>;
  deposits: DepositRecordItem[];
  withdrawals: WithdrawalRecord[];
  claimedTicketCodes: string[];
  killSwitchActive: boolean;
  depositModalOpen: boolean;
  setDepositModalOpen: (open: boolean) => void;
  withdrawModalOpen: boolean;
  setWithdrawModalOpen: (open: boolean) => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  // Multi-Lottery Concurrent Engine & Dynamic Admin Rounds
  activeLotteryId: LotteryTypeId;
  setActiveLotteryId: (id: LotteryTypeId) => void;
  activeRoundCode: string;
  setActiveRoundCode: (roundCode: string) => void;
  activeRound: LotteryRoundItem | null;
  activeLotterySpec: MultiLotterySpec;
  lotteryTimers: Record<LotteryTypeId, number>;
  autoWithdrawLimitTon: number;
  setAutoWithdrawLimitTon: (limitTon: number) => Promise<boolean>;
  // Single & Bulk Ticket Cart State
  selectedMainBalls: number[];
  setSelectedMainBalls: React.Dispatch<React.SetStateAction<number[]>>;
  selectedGoldenBall: number;
  setSelectedGoldenBall: React.Dispatch<React.SetStateAction<number>>;
  bulkSlips: BulkTicketSlip[];
  setBulkSlips: React.Dispatch<React.SetStateAction<BulkTicketSlip[]>>;
  activeSlipIndex: number;
  setActiveSlipIndex: (idx: number) => void;
  setBulkTicketCount: (count: number) => void;
  triggerBulkAiQuickPick: (count?: number) => void;
  activeTrackingTicket: TicketItem | null;
  setActiveTrackingTicket: (t: TicketItem | null) => void;
  refreshSnapshot: () => Promise<void>;
  mintTicket: (network?: string) => Promise<{ ok: boolean; error?: string; ticket?: TicketItem }>;
  mintBulkTickets: (
    slips: BulkTicketSlip[],
    roundCode: string,
    totalCostUsdt: number,
    network: string,
    nativeOptions?: {
      currency?: ActiveTmaCurrency;
      amountTon?: number;
      amountStars?: number;
    }
  ) => Promise<{ ok: boolean; error?: string; tickets?: TicketItem[] }>;
  claimTicketPrize: (ticketCode: string, prizeUsdt: number, network?: string) => Promise<boolean>;
  depositCrypto: (amountUsdt: number, network: string) => Promise<boolean>;
  submitDepositRequest: (params: {
    amountUsdt: number;
    network: string;
    cryptoKey?: string;
    txHash: string;
    senderWallet?: string;
    officialRecipientWallet?: string;
    mode?: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
    verificationMode?: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
    web3Signed?: boolean;
    boc?: string;
    requireSignedBoc?: boolean;
  }) => Promise<{
    ok: boolean;
    queuedForAdmin?: boolean;
    status?: string;
    message: string;
    deposit?: DepositRecordItem;
  }>;
  adminActionDeposit: (
    depositCode: string,
    action: 'approve' | 'reject' | 'approve_all'
  ) => Promise<boolean>;
  requestWithdrawal: (params: {
    network: WithdrawalNetwork;
    destinationAddress: string;
    amountUsdt: number;
  }) => Promise<{ ok: boolean; error?: string; withdrawal?: WithdrawalRecord }>;
  adminActionWithdrawal: (
    withdrawalCode: string,
    action: 'approve' | 'broadcast' | 'reject' | 'sweep_all'
  ) => Promise<boolean>;
  toggleKillSwitch: () => Promise<void>;
  setKillSwitchState: (active?: boolean) => Promise<void>;
  triggerDraw: (roundCode: string) => Promise<DrawExecutionResult | null>;
  createNewRound: (input: {
    titleFa?: string;
    category: string;
    ticketPriceUsdt?: number;
    ticketPriceTon?: number;
    rtpPercent?: number;
    jackpotUsdt?: number;
    initialSeedTon?: number;
    durationMinutes?: number;
    mainCount?: number;
    mainMax?: number;
    goldenMax?: number;
  }) => Promise<boolean>;
  deleteLotteryRound: (roundCode: string) => Promise<boolean>;
  deleteAllLotteryRounds: () => Promise<boolean>;
  updateRoundTicketPrice: (
    roundCode: string,
    newPriceUsdt: number,
    durationMinutes?: number
  ) => void;
  toggleRoundSales: (roundCode: string) => Promise<void>;
  sendSupportMessage: (
    sessionCode: string,
    message: string,
    senderRole?: string,
    senderName?: string,
    targetTelegramUserId?: string
  ) => Promise<boolean>;
  officialWallets: OfficialSiteWallets;
  updateOfficialWallets: (next: Partial<OfficialSiteWallets>) => void;
  // Zero-Loss Solvency & Firestore Referral System
  solvencyMode: SolvencyProtectionMode;
  setSolvencyMode: (mode: SolvencyProtectionMode) => void;
  referralCode: string;
  referredByCode: string;
  applyReferralCode: (code: string) => { ok: boolean; message: string };
  generateAndSaveReferralLink: (customAlias?: string) => Promise<{
    ok: boolean;
    referralCode: string;
    referralUrl: string;
    message: string;
  }>;
  claimReferralEarningsToWallet: () => Promise<{
    ok: boolean;
    claimedUsdt: number;
    message: string;
  }>;
  simulateReferredTicketPurchase: (ticketGrossUsdt?: number) => Promise<{
    ok: boolean;
    commissionUsdt: number;
    netHouseProfitUsdt: number;
    message: string;
  }>;
  referralEarningsTon: number;
  referralEarningsStars: number;
  referredTicketsCount: number;
  referralEvents: ReferralEventItem[];
  // Zero-Loss VIP Loyalty Chest (3% Rollover Reserve)
  rolloverReservePoolUsdt: number;
  chestsClaimedCount: number;
  openLoyaltyChest: () => Promise<{
    ok: boolean;
    rewardUsdt?: number;
    rewardTierLabelFa?: string;
    message: string;
  }>;
  // Admin Telegram Bot Alert System
  telegramBotConfig: TelegramBotAlertConfig;
  telegramAlertsLog: TelegramAlertLogItem[];
  updateTelegramBotConfig: (next: TelegramBotAlertConfig) => Promise<boolean>;
  sendTestTelegramAlert: () => Promise<{ ok: boolean; message: string; note: string }>;
  // Viral Shareable Golden Ticket & Win Certificate Modal
  viralCardTicket: TicketItem | null;
  setViralCardTicket: (ticket: TicketItem | null) => void;
  firestoreConnected: boolean;
  supabaseConnected: boolean;
}

export interface OfficialSiteWallets {
  USDT_TRC20: string;
  TON: string;
  TRX: string;
  BNB: string;
  BTC: string;
  COLD_TREASURY: string;
}

export const DEFAULT_OFFICIAL_WALLETS: OfficialSiteWallets = {
  USDT_TRC20: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  TON: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
  TRX: 'TXk8Y2khEsLJW1ChVWFMSMeRDow5KcbL99',
  BNB: '0x71C8F9409a89bC20D471980D772094B112039A8F',
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  COLD_TREASURY: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
};

const LotteryContext = createContext<LotteryContextType | null>(null);

const resolveInitialRoute = (): AppRoute => {
  if (typeof window === 'undefined') return 'lobby';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/earn') || path.startsWith('/quests')) return 'earn';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/mini-games') || path.startsWith('/instant')) return 'mini-games';
  if (path.startsWith('/user-panel') || path.startsWith('/profile')) return 'user-panel';
  if (path.startsWith('/winners')) return 'winners';
  if (path.startsWith('/how-it-works') || path.startsWith('/guide')) return 'how-it-works';
  if (path.startsWith('/terms') || path.startsWith('/rules')) return 'terms';
  if (path === '/admin' || path.startsWith('/404')) return '404';
  if (path.startsWith('/transparency') || path.startsWith('/verifier')) return 'transparency';
  if (path.startsWith('/status')) return 'status';
  if (path.startsWith('/withdraw')) return 'withdraw';
  if (path.startsWith('/my-tickets')) return 'my-tickets';
  if (path.startsWith('/deposit')) return 'deposit';
  if (path.startsWith('/play')) return 'play';
  return 'lobby';
};

const ROUTE_TO_PATH: Record<AppRoute, string> = {
  lobby: '/',
  play: '/play',
  'mini-games': '/mini-games',
  earn: '/earn',
  wallet: '/wallet',
  deposit: '/deposit',
  withdraw: '/withdraw',
  'my-tickets': '/my-tickets',
  'user-panel': '/user-panel',
  winners: '/winners',
  'how-it-works': '/how-it-works',
  status: '/status/tx',
  transparency: '/transparency',
  cockpit: '/ops-k82-cockpit',
  finances: '/admin/finances',
  launch: '/ops/launch',
  terms: '/rules',
  '404': '/404',
};

const buildDefaultConcurrentRounds = (): LotteryRoundItem[] => {
  const nowMs = Date.now();
  return MULTI_LOTTERY_SPECS.map((spec, idx) => {
    const initialCollectedUsdt = 0;
    const poolSplit = calculateDynamicPariMutuelPool(initialCollectedUsdt, 15);
    const durMin = Math.max(5, Math.round(spec.initialCountdownSec / 60));
    return {
      id: idx + 1,
      roundCode: spec.roundCode,
      lotteryType: spec.id,
      titleFa: spec.titleFa,
      titleEn: spec.titleEn,
      titleZh: spec.titleZh,
      subtitleFa: spec.subtitleFa,
      category: spec.category,
      formatLabel: spec.formatLabel,
      mainCount: spec.mainCount,
      mainMax: spec.mainMax,
      goldenMax: spec.goldenMax,
      jackpotUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: spec.ticketPriceUsdt.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: 0,
      remainingLabel: 'قرعه‌کشی خودکار راس تایم',
      drawTimeLabel: spec.drawTimeLabel,
      serverSeedHash: spec.serverSeedHash,
      clientSeed: spec.clientSeed,
      nonce: 1,
      winningNumbers: JSON.stringify(spec.winningNumbers),
      winningGoldenBall: spec.winningGoldenBall,
      totalSalesUsdt: poolSplit.grossCollectedUsdt.toFixed(2),
      totalPayoutUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      operatorProfitUsdt: poolSplit.houseFee15Usdt.toFixed(2),
      rolloverReserveUsdt: '0.00',
      durationMinutes: durMin,
      drawTargetTimestampMs: nowMs + durMin * 60 * 1000,
      initialSeedUsdt: '0.00',
      ticketsSoldCount: 0,
      status: 'ACTIVE',
    };
  });
};

export const LotteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tonConnectUI] = useTonConnectUI();
  const realTonAddress = useTonAddress();
  const realTonWallet = useTonWallet();

  // Telegram Mini App (TMA) SDK Identity — resolved first so all state and storage keys are strictly scoped per user
  const [telegramUser, setTelegramUser] = useState<TelegramWebAppUser>(() =>
    initTelegramMiniAppSdk()
  );

  const [activeRoute, setActiveRoute] = useState<AppRoute>(resolveInitialRoute);
  const [stealthCookieAuthorized, setStealthCookieAuthorized] = useState<boolean>(false);
  const [lang, setLangState] = useState<CurrencyLang>(detectInitialLanguage);
  const [walletDrawerOpen, setWalletDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    persistLanguageSelection(lang);
  }, [lang]);

  // Local PAM Seamless Wallet Engine Fallback & IndexedDB Synchronizer (Zero-Balance Clean Init)
  const localPamEngineRef = useRef<PAMSeamlessWalletEngine>(
    new PAMSeamlessWalletEngine({
      playerId: `tg_${telegramUser.id}`,
      displayName: `${telegramUser.first_name || 'کاربر تلگرام'}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`,
      vipTier: 'MEMBER',
      genesisTonBalance: 0,
      tonBalance: 0,
      genesisStarsBalance: 0,
      starsBalance: 0,
      referralEarningsTon: 0,
      referralEarningsStars: 0,
      bonusTokensTon: 0,
    })
  );
  const [pamState, setPamState] = useState<PAMPlayerState>(() => localPamEngineRef.current.getState());
  const [pamReconciliation, setPamReconciliation] = useState<PAMReconciliationReport | null>(
    () => localPamEngineRef.current.reconcile().reconciliation || null
  );

  // Live Price Oracle State (Refreshes every 15s)
  const [fxRates, setFxRates] = useState<ExchangeRates>(DEFAULT_FX_RATES);
  const [oracleSnapshot, setOracleSnapshot] = useState<LiveOracleSnapshot | null>(null);
  const [oracleCountdownSec, setOracleCountdownSec] = useState<number>(15);
  const [oracleMarkupPercent, setOracleMarkupPercentState] = useState<number>(0);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const authTokenRef = useRef<string | null>(null);

  // Strict Zero-Balance Initial State for Every New User
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [bonusTokensTon, setBonusTokensTon] = useState<number>(0);
  const [vipTier, setVipTier] = useState<string>('MEMBER');
  const [displayName, setDisplayName] = useState<string>(
    () => `${telegramUser.first_name || 'کاربر تلگرام'}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`
  );
  const [rounds, setRounds] = useState<LotteryRoundItem[]>(buildDefaultConcurrentRounds);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [drawHistory, setDrawHistory] = useState<VerifiableDrawHistoryRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessageItem[]>([]);
  const [mySupportMessages, setMySupportMessages] = useState<SupportMessageItem[]>([]);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);
  const [deposits, setDeposits] = useState<DepositRecordItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(
    () => loadLocalState(telegramUser.id).withdrawals
  );
  const [claimedTicketCodes, setClaimedTicketCodes] = useState<string[]>(
    () => loadLocalState(telegramUser.id).claimedTicketCodes
  );
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  // Unified Web3 Wallet & Telegram Identity State (Strictly bound to real @tonconnect/ui-react useTonAddress)
  const [connectedWeb3Wallet, setConnectedWeb3Wallet] = useState<string>('');
  const [connectedWalletProvider, setConnectedWalletProvider] = useState<Web3WalletProviderType | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string>(() => {
    try {
      const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.username) return `@${tgUser.username}`;
      if (telegramUser.username) return `@${telegramUser.username.replace(/^@/, '')}`;
      return (
        localStorage.getItem(getScopedStorageKey(telegramUser.id, 'luckydrop_tg_username')) ||
        `@user_${telegramUser.id}`
      );
    } catch {
      return `@user_${telegramUser.id}`;
    }
  });

  const [activeTmaCurrency, setActiveTmaCurrencyState] = useState<ActiveTmaCurrency>(() => {
    try {
      const saved = localStorage.getItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_active_tma_currency')
      );
      return saved === 'STARS' ? 'STARS' : 'TON';
    } catch {
      return 'TON';
    }
  });
  // Internal settlement parity is strictly locked: 1 TON = 5.00 internal settlement units, 1 Star = 0.02 units (250 Stars = 1 TON).
  // Live market oracle prices (liveTonUsdPrice, liveStarsUsdPrice) are tracked separately so bets & ticket prices NEVER drift!
  const [tonUsdRate, setTonUsdRateState] = useState<number>(DEFAULT_TON_USD_RATE);
  const [starsUsdRate, setStarsUsdRateState] = useState<number>(DEFAULT_STARS_USD_RATE);
  const [liveTonUsdPrice, setLiveTonUsdPrice] = useState<number>(5.0);
  const [tonChange24hPercent, setTonChange24hPercent] = useState<number>(2.15);
  const [liveStarsUsdPrice, setLiveStarsUsdPrice] = useState<number>(0.016);
  const [liveStarsPerTon, setLiveStarsPerTon] = useState<number>(250);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [adminTelegramUserIds, setAdminTelegramUserIdsState] = useState<number[]>(
    DEFAULT_ADMIN_TELEGRAM_USER_IDS
  );
  const [adminTonWalletAddress, setAdminTonWalletAddressState] = useState<string>(
    DEFAULT_ADMIN_TON_WALLET_ADDRESS
  );
  // Strict Server-Verified Admin Lock: defaults strictly to false and only turns true if backend verifies Telegram user ID
  const [isTelegramAdmin, setIsTelegramAdmin] = useState<boolean>(false);
  const [splashState, setSplashState] = useState<SplashHandshakeState>({
    progress: 25,
    stepTitleFa: 'برقراری اتصال امن با حساب تلگرام',
    stepSubtitleEn: 'Connecting Telegram Account',
    errorStatus: null,
    ready: false,
  });
  const [freePlinkoDrops, setFreePlinkoDrops] = useState<number>(0);
  const [freeScratchCards, setFreeScratchCards] = useState<number>(0);
  const [freeLotteryTickets, setFreeLotteryTickets] = useState<number>(0);
  const [tmaXpPoints, setTmaXpPoints] = useState<number>(0);
  const [tmaQuests, setTmaQuests] = useState<TmaQuestItem[]>(() => {
    try {
      const raw = localStorage.getItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_tma_quests_v3')
      );
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_TMA_QUESTS;
  });

  // Primary wallet balances are strictly tonBalance (💎 TON) & starsBalance (⭐ Stars);
  // Internal unit helpers use locked 5.0 parity, while portfolioUsdValue uses the live market oracle!
  const effectiveTonUsdRate = DEFAULT_TON_USD_RATE;
  const balanceUsdt = Number(
    (
      activeTmaCurrency === 'STARS'
        ? starsBalance * DEFAULT_STARS_USD_RATE
        : tonBalance * DEFAULT_TON_USD_RATE
    ).toFixed(2)
  );
  const bonusTokensUsdt = Number((bonusTokensTon * DEFAULT_TON_USD_RATE).toFixed(2));
  const portfolioUsdValue = Number(
    (tonBalance * liveTonUsdPrice + starsBalance * liveStarsUsdPrice).toFixed(2)
  );

  const setActiveTmaCurrency = (currency: ActiveTmaCurrency) => {
    HapticEngine.selectionChanged();
    setActiveTmaCurrencyState(currency);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_active_tma_currency'),
        currency
      );
    } catch {
      // ignore
    }
  };

  const setTonUsdRate = (_rate: number) => {
    // Keep internal settlement parity locked at DEFAULT_TON_USD_RATE (5.0)
    setTonUsdRateState(DEFAULT_TON_USD_RATE);
  };

  const setStarsUsdRate = (_rate: number) => {
    // Keep internal settlement parity locked at DEFAULT_STARS_USD_RATE (0.02)
    setStarsUsdRateState(DEFAULT_STARS_USD_RATE);
  };

  const setAdminTelegramUserIds = (ids: number[]) => {
    const clean = ids.filter((n) => Number.isFinite(n) && n > 0);
    setAdminTelegramUserIdsState(clean);
  };

  const setAdminTonWalletAddress = (addr: string) => {
    const clean = (addr || '').trim() || DEFAULT_ADMIN_TON_WALLET_ADDRESS;
    setAdminTonWalletAddressState(clean);
  };

  const formatCurrency = useCallback(
    (amount: number, currency?: ActiveTmaCurrency): string => {
      return rawFormatCurrency(amount, currency || activeTmaCurrency);
    },
    [activeTmaCurrency]
  );

  const formatActiveTmaAmount = useCallback(
    (usdtAmount: number): string => {
      const converted = usdtToTmaCurrency(
        usdtAmount,
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      return rawFormatCurrency(converted, activeTmaCurrency);
    },
    [activeTmaCurrency, tonUsdRate, starsUsdRate]
  );

  const consumeFreePlinkoDrop = (): boolean => {
    if (freePlinkoDrops <= 0) return false;
    const next = freePlinkoDrops - 1;
    setFreePlinkoDrops(next);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_free_plinko_drops_v3'),
        String(next)
      );
    } catch {
      // ignore
    }
    return true;
  };

  const consumeFreeScratchCard = (): boolean => {
    if (freeScratchCards <= 0) return false;
    const next = freeScratchCards - 1;
    setFreeScratchCards(next);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_free_scratch_cards_v3'),
        String(next)
      );
    } catch {
      // ignore
    }
    return true;
  };

  const completeAndClaimTmaQuest = (
    questId: TmaQuestItem['id']
  ): { ok: boolean; message: string } => {
    const existingQuest = tmaQuests.find((q) => q.id === questId);
    if (existingQuest?.claimed) {
      return {
        ok: false,
        message: tr(
          lang,
          'ℹ️ این ماموریت قبلاً دریافت شده است.',
          'ℹ️ This quest reward has already been claimed.'
        ),
      };
    }

    // Trigger real server-authoritative quest verification & claim (/api/quests/claim)
    (async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data':
            typeof window !== 'undefined'
              ? String((window as any)?.Telegram?.WebApp?.initData || '').trim()
              : '',
          'X-Telegram-User-Id': String(telegramUser.id),
        };
        const res = await fetch('/api/quests/claim', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            questId,
            walletConnected: Boolean(realTonAddress),
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          HapticEngine.notificationOccurred('success');
          if (typeof data.xp === 'number') setTmaXpPoints(data.xp);
          if (typeof data.freePlinkoDrops === 'number') setFreePlinkoDrops(data.freePlinkoDrops);
          if (typeof data.freeScratchCards === 'number') setFreeScratchCards(data.freeScratchCards);
          if (typeof data.freeLotteryTickets === 'number') setFreeLotteryTickets(data.freeLotteryTickets);
          if (data.bonusTicketAwarded) {
            setTickets((prev) => [data.bonusTicketAwarded, ...prev]);
          }
          if (Array.isArray(data.quests)) {
            setTmaQuests(data.quests);
            try {
              localStorage.setItem(
                getScopedStorageKey(telegramUser.id, 'luckydrop_tma_quests_v3'),
                JSON.stringify(data.quests)
              );
            } catch {}
          } else if (Array.isArray(data.completedQuests)) {
            setTmaQuests((prev) => {
              const next = prev.map((q) =>
                data.completedQuests.includes(q.id)
                  ? { ...q, progress: q.target, claimed: true }
                  : q
              );
              try {
                localStorage.setItem(
                  getScopedStorageKey(telegramUser.id, 'luckydrop_tma_quests_v3'),
                  JSON.stringify(next)
                );
              } catch {}
              return next;
            });
          }
        } else {
          HapticEngine.notificationOccurred('error');
        }
      } catch {
        // ignore network errors
      }
    })();

    if (questId === 'JOIN_TELEGRAM_CHANNEL') {
      return {
        ok: true,
        message: tr(
          lang,
          '🔍 درخواست بررسی عضویت در کانال رسمی تلگرام به سرور ارسال شد (در صورت تایید عضویت، پاداش اعمال می‌شود).',
          '🔍 Channel membership verification sent to server (reward credits once confirmed).'
        ),
      };
    }

    return {
      ok: true,
      message: tr(
        lang,
        '✅ ماموریت در سرور ثبت و پاداش به حساب شما افزوده شد!',
        '✅ Quest verified on server and reward credited to your account!'
      ),
    };
  };

  // Zero-Loss Solvency & Referral State
  const [solvencyMode, setSolvencyModeState] = useState<SolvencyProtectionMode>('AUTO_EXTEND');
  const [referralCode, setReferralCodeState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(
          getScopedStorageKey(telegramUser.id, 'luckydrop_my_referral_code_v3')
        ) || `ref_${telegramUser.id}`
      );
    } catch {
      return `ref_${telegramUser.id}`;
    }
  });
  const [referredByCode, setReferredByCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('ref') || params.get('start_param') || params.get('tgWebAppStartParam');
      if (fromUrl && fromUrl.trim().length >= 4) {
        const clean = fromUrl.trim();
        localStorage.setItem(
          getScopedStorageKey(telegramUser.id, 'luckydrop_referred_by_v3'),
          clean
        );
        return clean;
      }
      return (
        localStorage.getItem(
          getScopedStorageKey(telegramUser.id, 'luckydrop_referred_by_v3')
        ) || ''
      );
    } catch {
      return '';
    }
  });
  const [referralEarningsTon, setReferralEarningsTon] = useState<number>(0);
  const [referralEarningsStars, setReferralEarningsStars] = useState<number>(0);
  const [referredTicketsCount, setReferredTicketsCount] = useState<number>(0);
  const [referralEvents, setReferralEvents] = useState<ReferralEventItem[]>([]);

  // Zero-Loss VIP Loyalty Chest (3% Rollover Reserve) & Telegram Bot Alert State
  const [rolloverReservePoolUsdt, setRolloverReservePoolUsdt] = useState<number>(0);
  const [chestsClaimedCount, setChestsClaimedCount] = useState<number>(0);
  const [telegramBotConfig, setTelegramBotConfig] = useState<TelegramBotAlertConfig>({
    botToken: '',
    adminChatId: '',
    botUsername: 'LuckyDrop_TON_Bot',
    officialChannelUrl: 'https://t.me/LuckyDrop_TON_Official',
    supportTelegramUsername: '@LuckyDrop_Support',
    officialBrandTitle: '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol',
    enabled: true,
    notifyOnDeposit: true,
    notifyOnWithdrawal: true,
    notifyOnTicketPurchase: true,
  });
  const [telegramAlertsLog, setTelegramAlertsLog] = useState<TelegramAlertLogItem[]>([]);
  const [viralCardTicket, setViralCardTicket] = useState<TicketItem | null>(null);
  const supportTelegramUsername =
    telegramBotConfig.supportTelegramUsername?.trim() || '@LuckyDrop_Support';
  const officialBrandTitle =
    telegramBotConfig.officialBrandTitle?.trim() ||
    '🛡️ LuckyDrop Official • Verified Provably Fair Web3 Protocol';

  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [tonConnectModalOpen, setTonConnectModalOpen] = useState<boolean>(false);
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);

  // Multi-Lottery Concurrent State & Dynamic Active Round Selection
  const [activeLotteryId, setActiveLotteryIdState] = useState<LotteryTypeId>('MEGA_WEEKLY');
  const [activeRoundCode, setActiveRoundCodeState] = useState<string>('#LDR-8493');
  const [autoWithdrawLimitTon, setAutoWithdrawLimitTonState] = useState<number>(50);
  const [lotteryTimers, setLotteryTimers] = useState<Record<LotteryTypeId, number>>(() => ({
    MEGA_WEEKLY: MULTI_LOTTERY_SPECS[0].initialCountdownSec,
    DAILY_BLITZ: MULTI_LOTTERY_SPECS[1].initialCountdownSec,
    HOURLY_FLASH: MULTI_LOTTERY_SPECS[2].initialCountdownSec,
    TON_SPECIAL: MULTI_LOTTERY_SPECS[3].initialCountdownSec,
  }));

  const activeRound =
    rounds.find((r) => r.roundCode === activeRoundCode) ||
    rounds.find((r) => r.lotteryType === activeLotteryId) ||
    rounds[0] ||
    null;

  const baseSpec =
    MULTI_LOTTERY_SPECS.find((s) => s.id === (activeRound?.lotteryType || activeLotteryId)) ||
    MULTI_LOTTERY_SPECS[0];

  const activeLotterySpec: MultiLotterySpec = activeRound
    ? {
        ...baseSpec,
        roundCode: activeRound.roundCode,
        titleFa: activeRound.titleFa,
        subtitleFa: activeRound.subtitleFa || baseSpec.subtitleFa,
        formatLabel: activeRound.formatLabel || baseSpec.formatLabel,
        mainCount: Number(activeRound.mainCount) || baseSpec.mainCount,
        mainMax: Number(activeRound.mainMax) || baseSpec.mainMax,
        goldenMax:
          typeof activeRound.goldenMax === 'number' ? activeRound.goldenMax : baseSpec.goldenMax,
        jackpotUsdt: Number(activeRound.jackpotUsdt) || 0,
        ticketPriceUsdt: Number(activeRound.ticketPriceUsdt) || baseSpec.ticketPriceUsdt,
        rtpPercent: Number(activeRound.rtpPercent) || 85,
        serverSeedHash: activeRound.serverSeedHash || baseSpec.serverSeedHash,
        clientSeed: activeRound.clientSeed || baseSpec.clientSeed,
      }
    : baseSpec;

  const setActiveRoundCode = (roundCode: string) => {
    setActiveRoundCodeState(roundCode);
    const target = rounds.find((r) => r.roundCode === roundCode);
    if (target) {
      if (target.lotteryType) {
        setActiveLotteryIdState(target.lotteryType);
      }
      const mCount = Number(target.mainCount) || 5;
      const mMax = Number(target.mainMax) || 50;
      const gMax = typeof target.goldenMax === 'number' ? target.goldenMax : 15;
      const generated = generateBulkQuickPickSlips(
        bulkSlips.length || 1,
        mCount,
        mMax,
        gMax,
        roundCode.replace('#', '').toLowerCase()
      );
      setBulkSlips(generated);
      setActiveSlipIndex(0);
      setSelectedMainBalls(generated[0].mainNumbers);
      setSelectedGoldenBall(generated[0].goldenBall);
    }
  };

  // Single & Bulk Ticket Cart State
  const [selectedMainBalls, setSelectedMainBalls] = useState<number[]>([7, 14, 23, 38, 49]);
  const [selectedGoldenBall, setSelectedGoldenBall] = useState<number>(8);
  const [bulkSlips, setBulkSlips] = useState<BulkTicketSlip[]>(() => [
    {
      slipIndex: 1,
      mainNumbers: [7, 14, 23, 38, 49],
      goldenBall: 8,
      clientSeed: 'luckydrop_slip_1',
    },
  ]);
  const [activeSlipIndex, setActiveSlipIndex] = useState<number>(0);
  const [activeTrackingTicket, setActiveTrackingTicket] = useState<TicketItem | null>(null);

  const syncPamStateEverywhere = useCallback(
    (nextPam: PAMPlayerState, recon?: PAMReconciliationReport) => {
      localPamEngineRef.current.hydrateState(nextPam);
      const hydrated = localPamEngineRef.current.getState();
      setPamState({ ...hydrated });
      setTonBalance(hydrated.tonBalance);
      setBonusTokensTon(hydrated.bonusTokensTon);
      if (typeof hydrated.referralEarningsTon === 'number') {
        setReferralEarningsTon(hydrated.referralEarningsTon);
      }
      if (typeof hydrated.referralEarningsStars === 'number') {
        setReferralEarningsStars(hydrated.referralEarningsStars);
      }
      if (typeof hydrated.starsBalance === 'number') {
        setStarsBalance(hydrated.starsBalance);
        try {
          localStorage.setItem(
            getScopedStorageKey(telegramUser.id, 'luckydrop_stars_balance_v3'),
            String(hydrated.starsBalance)
          );
        } catch {}
      }
      const computedRecon = recon || localPamEngineRef.current.reconcile().reconciliation || null;
      setPamReconciliation(computedRecon);
      savePAMStateToIndexedDB(hydrated, telegramUser.id);
    },
    [telegramUser.id]
  );

  // Hydrate from per-user IndexedDB on initial mount before network snapshot arrives
  useEffect(() => {
    loadPAMStateFromIndexedDB(telegramUser.id).then((cached) => {
      if (cached && typeof cached.tonBalance === 'number') {
        localPamEngineRef.current.hydrateState(cached);
        const hydrated = localPamEngineRef.current.getState();
        setPamState(hydrated);
        setTonBalance(hydrated.tonBalance);
        setBonusTokensTon(hydrated.bonusTokensTon || 0);
        if (typeof hydrated.starsBalance === 'number') {
          setStarsBalance(hydrated.starsBalance);
        }
        setPamReconciliation(localPamEngineRef.current.reconcile().reconciliation || null);
      }
    });
  }, [telegramUser.id]);

  const setActiveLotteryId = (id: LotteryTypeId) => {
    setActiveLotteryIdState(id);
    const matchingRound = rounds.find((r) => r.lotteryType === id);
    if (matchingRound) {
      setActiveRoundCodeState(matchingRound.roundCode);
    }
    const spec = MULTI_LOTTERY_SPECS.find((s) => s.id === id) || MULTI_LOTTERY_SPECS[0];
    const generated = generateBulkQuickPickSlips(
      bulkSlips.length || 1,
      matchingRound?.mainCount || spec.mainCount,
      matchingRound?.mainMax || spec.mainMax,
      typeof matchingRound?.goldenMax === 'number' ? matchingRound.goldenMax : spec.goldenMax,
      id.toLowerCase()
    );
    setBulkSlips(generated);
    setActiveSlipIndex(0);
    setSelectedMainBalls(generated[0].mainNumbers);
    setSelectedGoldenBall(generated[0].goldenBall);
  };

  const setBulkTicketCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(25, count));
    const current = [...bulkSlips];
    if (safeCount > current.length) {
      const extra = generateBulkQuickPickSlips(
        safeCount - current.length,
        activeLotterySpec.mainCount,
        activeLotterySpec.mainMax,
        activeLotterySpec.goldenMax,
        'slip'
      ).map((s, idx) => ({ ...s, slipIndex: current.length + idx + 1 }));
      const next = [...current, ...extra];
      setBulkSlips(next);
    } else if (safeCount < current.length) {
      const next = current.slice(0, safeCount);
      setBulkSlips(next);
      if (activeSlipIndex >= safeCount) {
        setActiveSlipIndex(0);
        setSelectedMainBalls(next[0].mainNumbers);
        setSelectedGoldenBall(next[0].goldenBall);
      }
    }
  };

  const triggerBulkAiQuickPick = (count: number = 5) => {
    const generated = generateBulkQuickPickSlips(
      count,
      activeLotterySpec.mainCount,
      activeLotterySpec.mainMax,
      activeLotterySpec.goldenMax,
      'quantum_ai'
    );
    setBulkSlips(generated);
    setActiveSlipIndex(0);
    setSelectedMainBalls(generated[0].mainNumbers);
    setSelectedGoldenBall(generated[0].goldenBall);
  };

  useEffect(() => {
    setBulkSlips((prev) => {
      if (!prev[activeSlipIndex]) return prev;
      const copy = [...prev];
      copy[activeSlipIndex] = {
        ...copy[activeSlipIndex],
        mainNumbers: selectedMainBalls,
        goldenBall: selectedGoldenBall,
      };
      return copy;
    });
  }, [selectedMainBalls, selectedGoldenBall, activeSlipIndex]);

  const refreshPriceOracleNow = useCallback(async () => {
    const snap = await fetchLivePriceOracle({
      adminMarkupPercent: oracleMarkupPercent,
    });
    setOracleSnapshot(snap);
    setFxRates(snap.rates);
    if (Number.isFinite(snap.tonUsdPrice) && snap.tonUsdPrice > 0.1) {
      setLiveTonUsdPrice(Number(snap.tonUsdPrice.toFixed(4)));
    } else if (Number.isFinite(snap.rates.TON) && snap.rates.TON > 0.1) {
      setLiveTonUsdPrice(Number(snap.rates.TON.toFixed(4)));
    }
    if (Number.isFinite(snap.tonChange24hPercent)) {
      setTonChange24hPercent(Number(snap.tonChange24hPercent.toFixed(2)));
    } else if (Number.isFinite(snap.changes24h?.TON)) {
      setTonChange24hPercent(Number(snap.changes24h.TON.toFixed(2)));
    }
    if (Number.isFinite(snap.starsUsdPrice) && snap.starsUsdPrice > 0.001) {
      setLiveStarsUsdPrice(Number(snap.starsUsdPrice.toFixed(4)));
    }
    if (Number.isFinite(snap.starsPerTon) && snap.starsPerTon > 10) {
      setLiveStarsPerTon(Math.round(snap.starsPerTon));
    }
    setOracleCountdownSec(30);
  }, [oracleMarkupPercent]);

  const setOracleMarkupPercent = (pct: number) => {
    setOracleMarkupPercentState(pct);
  };

  useEffect(() => {
    refreshPriceOracleNow();
  }, [refreshPriceOracleNow]);

  const getHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const tgInitData =
      typeof window !== 'undefined'
        ? String((window as any)?.Telegram?.WebApp?.initData || '').trim()
        : '';
    const unsafeUserId =
      typeof window !== 'undefined'
        ? (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id
        : undefined;
    const effectiveUid = Number(unsafeUserId || telegramUser.id || 0);
    headers['X-Telegram-Init-Data'] =
      tgInitData ||
      (effectiveUid > 0
        ? `user=${encodeURIComponent(
            JSON.stringify({
              id: effectiveUid,
              first_name: telegramUser.first_name || 'User',
              username: telegramUser.username || `tg_${effectiveUid}`,
            })
          )}`
        : '');
    headers['X-Telegram-User-Id'] = String(effectiveUid || '');
    if (realTonAddress) {
      headers['X-Ton-Wallet-Address'] = realTonAddress;
    }
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        authTokenRef.current = token;
      } catch {
        // Ignore token refresh errors
      }
    }
    if (authTokenRef.current) {
      headers['Authorization'] = `Bearer ${authTokenRef.current}`;
    }
    return headers;
  }, [telegramUser.id, realTonAddress]);

  const refreshSnapshot = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/snapshot', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState, data.reconciliation);
      }
      if (data.user) {
        if (typeof data.user.tonBalance === 'number') {
          setTonBalance(data.user.tonBalance);
        }
        if (typeof data.user.starsBalance === 'number') {
          setStarsBalance(data.user.starsBalance);
        }
        if (typeof data.user.bonusTokens === 'number') {
          setBonusTokensTon(data.user.bonusTokens);
        }
        if (typeof data.user.xp === 'number') {
          setTmaXpPoints(data.user.xp);
        }
        if (typeof data.user.freePlinkoDrops === 'number') {
          setFreePlinkoDrops(data.user.freePlinkoDrops);
        }
        if (typeof data.user.freeScratchCards === 'number') {
          setFreeScratchCards(data.user.freeScratchCards);
        }
        if (typeof data.user.freeLotteryTickets === 'number') {
          setFreeLotteryTickets(data.user.freeLotteryTickets);
        }
        if (typeof data.user.referralCode === 'string' && data.user.referralCode) {
          setReferralCodeState(data.user.referralCode);
        }
        if (typeof data.user.referredBy === 'string' && data.user.referredBy) {
          setReferredByCode(data.user.referredBy);
        }
        if (typeof data.user.referralEarningsTon === 'number') {
          setReferralEarningsTon(data.user.referralEarningsTon);
        }
        if (typeof data.user.referralEarningsStars === 'number') {
          setReferralEarningsStars(data.user.referralEarningsStars);
        }
        if (Array.isArray(data.user.referrals)) {
          setReferredTicketsCount(data.user.referrals.length);
        }
        setVipTier(data.user.vipTier || 'MEMBER');
        if (data.user.displayName) {
          setDisplayName(data.user.displayName);
        }
        if (Array.isArray(data.user.completedQuests)) {
          const completedIds: string[] = data.user.completedQuests;
          setTmaQuests((prev) =>
            prev.map((q) =>
              completedIds.includes(q.id) ? { ...q, progress: q.target, claimed: true } : q
            )
          );
        }
      }
      if (Array.isArray(data.rounds)) {
        setRounds(data.rounds);
        if (
          data.rounds.length > 0 &&
          !data.rounds.some((r: LotteryRoundItem) => r.roundCode === activeRoundCode)
        ) {
          setActiveRoundCodeState(data.rounds[0].roundCode);
        }
      }
      if (typeof data.autoWithdrawLimitTon === 'number' && data.autoWithdrawLimitTon > 0) {
        setAutoWithdrawLimitTonState(data.autoWithdrawLimitTon);
      }
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        if (data.tickets.length > 0) {
          setActiveTrackingTicket((prev) => {
            if (!prev) return data.tickets[0];
            const updatedPrev = data.tickets.find((t: TicketItem) => t.ticketCode === prev.ticketCode);
            return updatedPrev || data.tickets[0];
          });
        } else {
          setActiveTrackingTicket(null);
        }
      }
      if (Array.isArray(data.drawHistory)) {
        setDrawHistory(data.drawHistory);
      }
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.supportMessages)) {
        setSupportMessages(data.supportMessages);
        const myIdStr = String(telegramUser.id);
        const myScoped = data.supportMessages.filter(
          (m: SupportMessageItem) =>
            String(m.telegramUserId || '') === myIdStr ||
            String(m.sessionCode || '').includes(myIdStr)
        );
        if (myScoped.length > 0 || !data.isAdmin) {
          setMySupportMessages(myScoped);
        }
      }
      if (typeof data.unreadSupportCount === 'number') {
        setUnreadSupportCount(data.unreadSupportCount);
      }
      if (Array.isArray(data.deposits)) setDeposits(data.deposits);
      if (Array.isArray(data.referralEvents)) setReferralEvents(data.referralEvents);
      if (data.telegramBotConfig && typeof data.telegramBotConfig === 'object') {
        setTelegramBotConfig((prev) => ({ ...prev, ...data.telegramBotConfig }));
      }
      if (typeof data.supportTelegramUsername === 'string' && data.supportTelegramUsername.trim()) {
        setTelegramBotConfig((prev) => ({
          ...prev,
          supportTelegramUsername: data.supportTelegramUsername.trim(),
        }));
      }
      if (typeof data.officialBrandTitle === 'string' && data.officialBrandTitle.trim()) {
        setTelegramBotConfig((prev) => ({
          ...prev,
          officialBrandTitle: data.officialBrandTitle.trim(),
        }));
      }
      if (Array.isArray(data.telegramAlertsLog)) {
        setTelegramAlertsLog(data.telegramAlertsLog);
      }
      if (typeof data.rolloverReservePoolUsdt === 'number') {
        setRolloverReservePoolUsdt(data.rolloverReservePoolUsdt);
      }
      if (typeof data.chestsClaimedCount === 'number') {
        setChestsClaimedCount(data.chestsClaimedCount);
      }
      if (Array.isArray(data.withdrawals)) {
        setWithdrawals(data.withdrawals);
      }
      if (Array.isArray(data.claimedTicketCodes)) {
        setClaimedTicketCodes(data.claimedTicketCodes);
      }
      if (typeof data.isAdmin === 'boolean') {
        const verifiedAdmin = data.isAdmin === true;
        setIsTelegramAdmin(verifiedAdmin);
        setStealthCookieAuthorized(verifiedAdmin);
      }
      if (typeof data.publicTonTreasuryWallet === 'string' && data.publicTonTreasuryWallet.trim()) {
        setAdminTonWalletAddressState(data.publicTonTreasuryWallet.trim());
      }
      if (data.liveOracle && typeof data.liveOracle === 'object') {
        if (Number.isFinite(Number(data.liveOracle.tonUsdPrice)) && Number(data.liveOracle.tonUsdPrice) > 0.1) {
          setLiveTonUsdPrice(Number(Number(data.liveOracle.tonUsdPrice).toFixed(4)));
        }
        if (Number.isFinite(Number(data.liveOracle.tonChange24hPercent))) {
          setTonChange24hPercent(Number(Number(data.liveOracle.tonChange24hPercent).toFixed(2)));
        }
        if (Number.isFinite(Number(data.liveOracle.starsUsdPrice)) && Number(data.liveOracle.starsUsdPrice) > 0.001) {
          setLiveStarsUsdPrice(Number(Number(data.liveOracle.starsUsdPrice).toFixed(4)));
        }
        if (Number.isFinite(Number(data.liveOracle.starsPerTon)) && Number(data.liveOracle.starsPerTon) > 10) {
          setLiveStarsPerTon(Math.round(Number(data.liveOracle.starsPerTon)));
        }
      }
      if (typeof data.killSwitchActive === 'boolean') setKillSwitchActive(data.killSwitchActive);
    } catch (error) {
      console.error('Snapshot fetch error:', error);
    }
  }, [getHeaders, syncPamStateEverywhere, activeRoundCode]);

  const executeRealHandshake = useCallback(async () => {
    try {
      // Step 1 (25%): Initialize Telegram.WebApp.ready(), expand(), and extract real initData & user profile
      setSplashState({
        progress: 25,
        stepTitleFa: 'برقراری اتصال امن با حساب تلگرام',
        stepSubtitleEn: 'Connecting Telegram Account',
        errorStatus: null,
        ready: false,
      });

      const user = initTelegramMiniAppSdk();
      setTelegramUser(user);
      if (user.username) {
        setTelegramUsername(`@${user.username.replace(/^@/, '')}`);
      }
      if (user.first_name) {
        setDisplayName(`${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`);
      }

      const rawInitData =
        typeof window !== 'undefined'
          ? String((window as any)?.Telegram?.WebApp?.initData || '').trim()
          : '';

      // Step 2 (60%): Fetch verified user data, balances, and session state from /api/snapshot using X-Telegram-Init-Data
      setSplashState({
        progress: 60,
        stepTitleFa: 'همگام‌سازی استخرهای قرعه‌کشی و کیف پول',
        stepSubtitleEn: 'Syncing Prize Pools & Wallet',
        errorStatus: null,
        ready: false,
      });

      const baseHeaders = await getHeaders();
      const fallbackInitData =
        user.id > 0
          ? `user=${encodeURIComponent(
              JSON.stringify({
                id: user.id,
                first_name: user.first_name || 'User',
                username: user.username || `tg_${user.id}`,
              })
            )}`
          : '';
      const snapshotHeaders: Record<string, string> = {
        ...baseHeaders,
        'X-Telegram-Init-Data': rawInitData || fallbackInitData || baseHeaders['X-Telegram-Init-Data'] || '',
        'X-Telegram-User-Id': String(user.id || ''),
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/snapshot', {
        method: 'GET',
        headers: snapshotHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let serverErr = `HTTP ${res.status} ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) serverErr = `${serverErr} — ${errJson.error}`;
        } catch {
          // ignore
        }
        setIsTelegramAdmin(false);
        setStealthCookieAuthorized(false);
        setSplashState({
          progress: 60,
          stepTitleFa: 'خطا در تایید نشست امنیتی سرور',
          stepSubtitleEn: 'GET /api/snapshot failed',
          errorStatus: serverErr,
          ready: false,
        });
        return;
      }

      const data = await res.json();
      const verifiedAdmin = data.isAdmin === true;
      setIsTelegramAdmin(verifiedAdmin);
      setStealthCookieAuthorized(verifiedAdmin);

      if (typeof data.publicTonTreasuryWallet === 'string' && data.publicTonTreasuryWallet.trim()) {
        setAdminTonWalletAddressState(data.publicTonTreasuryWallet.trim());
      }
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState, data.reconciliation);
      } else {
        if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
        if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
      }
      if (data.user) {
        if (typeof data.user.xp === 'number') setTmaXpPoints(data.user.xp);
        if (typeof data.user.freePlinkoDrops === 'number') setFreePlinkoDrops(data.user.freePlinkoDrops);
        if (typeof data.user.freeScratchCards === 'number') setFreeScratchCards(data.user.freeScratchCards);
        if (typeof data.user.freeLotteryTickets === 'number') setFreeLotteryTickets(data.user.freeLotteryTickets);
        if (typeof data.user.referralCode === 'string' && data.user.referralCode) {
          setReferralCodeState(data.user.referralCode);
        }
        if (typeof data.user.referredBy === 'string' && data.user.referredBy) {
          setReferredByCode(data.user.referredBy);
        }
        if (typeof data.user.referralEarningsTon === 'number') {
          setReferralEarningsTon(data.user.referralEarningsTon);
        }
        if (typeof data.user.referralEarningsStars === 'number') {
          setReferralEarningsStars(data.user.referralEarningsStars);
        }
        if (Array.isArray(data.user.referrals)) {
          setReferredTicketsCount(data.user.referrals.length);
        }
        setVipTier(data.user.vipTier || 'MEMBER');
        if (data.user.displayName) setDisplayName(data.user.displayName);
        if (Array.isArray(data.user.completedQuests)) {
          const completedIds: string[] = data.user.completedQuests;
          setTmaQuests((prev) =>
            prev.map((q) =>
              completedIds.includes(q.id) ? { ...q, progress: q.target, claimed: true } : q
            )
          );
        }
      }
      if (Array.isArray(data.rounds)) setRounds(data.rounds);
      if (Array.isArray(data.tickets)) setTickets(data.tickets);
      if (Array.isArray(data.drawHistory)) setDrawHistory(data.drawHistory);
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.supportMessages)) {
        setSupportMessages(data.supportMessages);
        const myIdStr = String(user.id || telegramUser.id);
        const myScoped = data.supportMessages.filter(
          (m: SupportMessageItem) =>
            String(m.telegramUserId || '') === myIdStr ||
            String(m.sessionCode || '').includes(myIdStr)
        );
        setMySupportMessages(myScoped);
      }
      if (typeof data.unreadSupportCount === 'number') {
        setUnreadSupportCount(data.unreadSupportCount);
      }
      if (data.telegramBotConfig && typeof data.telegramBotConfig === 'object') {
        setTelegramBotConfig((prev) => ({ ...prev, ...data.telegramBotConfig }));
      }
      if (typeof data.supportTelegramUsername === 'string' && data.supportTelegramUsername.trim()) {
        setTelegramBotConfig((prev) => ({
          ...prev,
          supportTelegramUsername: data.supportTelegramUsername.trim(),
        }));
      }
      if (typeof data.officialBrandTitle === 'string' && data.officialBrandTitle.trim()) {
        setTelegramBotConfig((prev) => ({
          ...prev,
          officialBrandTitle: data.officialBrandTitle.trim(),
        }));
      }
      if (Array.isArray(data.deposits)) setDeposits(data.deposits);
      if (Array.isArray(data.withdrawals)) setWithdrawals(data.withdrawals);
      if (typeof data.killSwitchActive === 'boolean') setKillSwitchActive(data.killSwitchActive);

      // If URL contains a referral parameter (?ref= or start_param), bind it once on the backend
      const params = new URLSearchParams(window.location.search);
      const startRef =
        params.get('ref') ||
        params.get('start_param') ||
        params.get('tgWebAppStartParam') ||
        String((window as any)?.Telegram?.WebApp?.initDataUnsafe?.start_param || '').trim();
      if (startRef && startRef.length >= 4 && !data.user?.referredBy) {
        fetch('/api/referral/bind', {
          method: 'POST',
          headers: snapshotHeaders,
          body: JSON.stringify({ startParam: startRef }),
        }).catch(() => {});
      }

      // Step 3 (100%): Await real TonConnectUIProvider connection restoration (zero fake setTimeout)
      setSplashState({
        progress: 100,
        stepTitleFa: 'آماده‌سازی تالار قرعه‌کشی زنده LuckyDrop',
        stepSubtitleEn: 'Ready',
        errorStatus: null,
        ready: false,
      });

      if (tonConnectUI?.connectionRestored) {
        try {
          await tonConnectUI.connectionRestored;
        } catch {
          // ignore if no prior wallet session was stored
        }
      }

      setSplashState({
        progress: 100,
        stepTitleFa: 'اتصال امن برقرار شد',
        stepSubtitleEn: 'Handshake Complete',
        errorStatus: null,
        ready: true,
      });
    } catch (err: any) {
      setIsTelegramAdmin(false);
      setStealthCookieAuthorized(false);
      const msg =
        err?.name === 'AbortError'
          ? 'TIMEOUT: Server handshake timed out after 8000ms'
          : err?.message || 'NETWORK_ERROR: Failed to reach /api/snapshot';
      setSplashState({
        progress: 60,
        stepTitleFa: 'خطا در ارتباط با سرور',
        stepSubtitleEn: 'GET /api/snapshot error',
        errorStatus: msg,
        ready: false,
      });
    }
  }, [getHeaders, syncPamStateEverywhere, tonConnectUI]);

  useEffect(() => {
    executeRealHandshake();
  }, [executeRealHandshake]);

  const triggerDraw = useCallback(
    async (roundCode: string): Promise<DrawExecutionResult | null> => {
      try {
        const headers = await getHeaders();
        const res = await fetch('/api/admin/draw', {
          method: 'POST',
          headers,
          body: JSON.stringify({ roundCode }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.pamState) {
            syncPamStateEverywhere(data.pamState);
          }
          await refreshSnapshot();
          return {
            drawnMain: data.drawnMain,
            drawnGolden: data.drawnGolden,
            hash: data.hash,
            ticketsEvaluatedCount: data.ticketsEvaluatedCount,
            winnersCount: data.winnersCount,
            totalPayoutUsdt: data.totalPayoutUsdt,
            drawRecord: data.drawRecord,
          };
        }
      } catch {
        // Offline / local fallback execution using Provably Fair HMAC-SHA256 engine
      }

      const localSeeds = localPamEngineRef.current.getState().seeds;
      const drawProof = deriveProvablyFairLotteryDraw({
        serverSeed: localSeeds.serverSeed,
        clientSeed: localSeeds.clientSeed,
        nonce: localSeeds.nonce,
        roundCode,
        mainCount: 5,
        mainMax: 50,
        goldenMax: 15,
      });

      let evaluatedCount = 0;
      let winnersCount = 0;
      let totalPayout = 0;

      setTickets((prev) =>
        prev.map((t) => {
          if (t.roundCode !== roundCode || t.status.toUpperCase() !== 'ACTIVE') return t;
          evaluatedCount += 1;
          let mainArr: number[] = [];
          try {
            mainArr = JSON.parse(t.mainNumbers);
          } catch {
            mainArr = [7, 14, 23, 38, 49];
          }
          const ev = evaluateTicketPrizeTier({
            ticketMain: mainArr,
            ticketGolden: t.goldenBall,
            drawnMain: drawProof.drawnMain,
            drawnGolden: drawProof.drawnGolden,
            ticketCostUsdt: parseFloat(t.costUsdt) || 5,
          });
          if (ev.won && ev.prizeUsdt > 0) {
            winnersCount += 1;
            totalPayout += ev.prizeUsdt;
            localPamEngineRef.current.credit({
              transactionUuid: `tx_win_${t.ticketCode}_${drawProof.nonce}`,
              referenceTransactionUuid: t.transactionUuid || null,
              roundId: roundCode,
              vertical: 'LUCKYDROP_LOTTERY',
              amountUsdt: ev.prizeUsdt,
              note: `برد قرعه‌کشی ${roundCode} (${ev.tierLabelFa})`,
            });
            return {
              ...t,
              status: 'WON',
              prizeWonUsdt: ev.prizeUsdt.toFixed(2),
              tierLabelFa: ev.tierLabelFa,
              claimed: true,
            };
          }
          return { ...t, status: 'LOST', prizeWonUsdt: '0.00', tierLabelFa: ev.tierLabelFa };
        })
      );

      localPamEngineRef.current.rotateServerSeed();
      syncPamStateEverywhere(localPamEngineRef.current.getState());

      const localRecord: VerifiableDrawHistoryRecord = {
        drawId: `DRAW-${roundCode.replace('#', '')}-${drawProof.nonce}`,
        roundCode,
        roundTitleFa: `قرعه‌کشی ${roundCode}`,
        drawnMain: drawProof.drawnMain,
        drawnGolden: drawProof.drawnGolden,
        serverSeed: drawProof.serverSeed,
        serverSeedHash: drawProof.serverSeedHash,
        clientSeed: drawProof.clientSeed,
        nonce: drawProof.nonce,
        primaryHmacHex: drawProof.primaryHmacHex,
        first52BitHex: drawProof.first52BitHex,
        uniformFloatX: drawProof.uniformFloatX,
        ticketsEvaluatedCount: evaluatedCount,
        winnersCount,
        totalPayoutUsdt: totalPayout,
        createdAt: 'همین الان',
      };
      setDrawHistory((prev) => [localRecord, ...prev]);

      return {
        drawnMain: drawProof.drawnMain,
        drawnGolden: drawProof.drawnGolden,
        hash: `0x${drawProof.primaryHmacHex}`,
        ticketsEvaluatedCount: evaluatedCount,
        winnersCount,
        totalPayoutUsdt: totalPayout,
        drawRecord: localRecord,
      };
    },
    [getHeaders, refreshSnapshot, syncPamStateEverywhere]
  );

  // 1-second global ticker for the 15s Oracle countdown + dynamic round timers
  // When any active round's drawTargetTimestampMs is reached ("راس تایم"), triggers Provably Fair Draw Engine (85% Pool Distributed / 15% Site Share)!
  const autoDrawingRoundsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const interval = setInterval(() => {
      setOracleCountdownSec((prev) => {
        if (prev <= 1) {
          refreshPriceOracleNow();
          return 15;
        }
        return prev - 1;
      });

      const nowMs = Date.now();
      for (const r of rounds) {
        if (
          r.status?.toUpperCase() === 'ACTIVE' &&
          r.drawTargetTimestampMs &&
          r.drawTargetTimestampMs <= nowMs &&
          !autoDrawingRoundsRef.current.has(r.roundCode)
        ) {
          autoDrawingRoundsRef.current.add(r.roundCode);
          const syncTask = isTelegramAdmin
            ? triggerDraw(r.roundCode)
            : refreshSnapshot();
          Promise.resolve(syncTask).finally(() => {
            setTimeout(() => {
              autoDrawingRoundsRef.current.delete(r.roundCode);
            }, 5000);
          });
        }
      }

      setLotteryTimers((prev) => {
        const next = { ...prev };
        for (const spec of MULTI_LOTTERY_SPECS) {
          const id = spec.id;
          const matching = rounds.find((r) => r.lotteryType === id);
          if (matching?.drawTargetTimestampMs) {
            next[id] = Math.max(0, Math.floor((matching.drawTargetTimestampMs - nowMs) / 1000));
          } else if (prev[id] <= 1) {
            next[id] = spec.initialCountdownSec;
          } else {
            next[id] = prev[id] - 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshPriceOracleNow, triggerDraw, refreshSnapshot, isTelegramAdmin, rounds]);

  useEffect(() => {
    const onPopState = () => {
      setActiveRoute(resolveInitialRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setLang = (nextLang: CurrencyLang) => {
    HapticEngine.selectionChanged();
    setLangState(nextLang);
    persistLanguageSelection(nextLang);
  };

  const navigateTo = (target: AppRoute | 'admin_unauthorized') => {
    HapticEngine.selectionChanged();
    if (target === 'admin_unauthorized') {
      setActiveRoute('404');
      window.history.pushState({}, '', '/404');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if ((target === 'cockpit' || target === 'finances' || target === 'launch') && !isTelegramAdmin) {
      HapticEngine.notificationOccurred('error');
      setActiveRoute('lobby');
      window.history.pushState({}, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveRoute(target);
    window.history.pushState({}, '', ROUTE_TO_PATH[target] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================================================
  // 7 STANDARD PAM SEAMLESS WALLET OPERATIONS (CLIENT <-> SERVER + INDEXEDDB)
  // ==========================================================================

  const pamAuthenticate = async (): Promise<PAMOperationResponse> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/authenticate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          playerId: firebaseUser?.uid || pamState.playerId,
          displayName: firebaseUser?.displayName || displayName,
          vipTier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.playerState) syncPamStateEverywhere(data.playerState);
        return data;
      }
    } catch {
      // Fallback to local engine
    }
    const localRes = localPamEngineRef.current.authenticate({
      playerId: firebaseUser?.uid || pamState.playerId,
      displayName: firebaseUser?.displayName || displayName,
      vipTier,
    });
    syncPamStateEverywhere(localPamEngineRef.current.getState());
    return localRes;
  };

  const pamFetchBalance = async (): Promise<PAMOperationResponse> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/balance', { headers });
      if (res.ok) {
        const data = await res.json();
        await refreshSnapshot();
        return data;
      }
    } catch {
      // Fallback
    }
    return localPamEngineRef.current.balance();
  };

  const pamDebit = async (params: {
    transactionUuid?: string;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    amountTon?: number;
    amountStars?: number;
    currency?: ActiveTmaCurrency;
    note?: string;
  }): Promise<PAMOperationResponse> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_debit');
    const effectiveCurrency: ActiveTmaCurrency = params.currency || activeTmaCurrency;
    const exactTon =
      effectiveCurrency === 'TON'
        ? typeof params.amountTon === 'number' && params.amountTon > 0
          ? Number(params.amountTon.toFixed(4))
          : Number((params.amountUsdt / 5.0).toFixed(4))
        : undefined;
    const exactStars =
      effectiveCurrency === 'STARS'
        ? typeof params.amountStars === 'number' && params.amountStars > 0
          ? Math.round(params.amountStars)
          : Math.round(params.amountUsdt / 0.02)
        : undefined;

    if (effectiveCurrency === 'STARS' && exactStars !== undefined && starsBalance < exactStars) {
      return {
        ok: false,
        operation: 'DEBIT',
        error: `موجودی ستاره‌های تلگرام شما (${starsBalance} ⭐) کافی نیست.`,
        currency: 'STARS',
        tonBalance,
        starsBalance,
        referralEarningsTon,
        referralEarningsStars,
        bonusTokensTon,
      };
    }
    if (effectiveCurrency === 'TON' && exactTon !== undefined && tonBalance < exactTon) {
      return {
        ok: false,
        operation: 'DEBIT',
        error: `موجودی TON شما (${tonBalance.toFixed(2)} TON) کافی نیست.`,
        currency: 'TON',
        tonBalance,
        starsBalance,
        referralEarningsTon,
        referralEarningsStars,
        bonusTokensTon,
      };
    }

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/debit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uuid: txUuid,
          round_id: params.roundId,
          vertical: params.vertical,
          currency: effectiveCurrency,
          amountTon: exactTon,
          amountStars: exactStars,
          amountUsdt:
            effectiveCurrency === 'TON'
              ? Number(((exactTon || 0) * 5.0).toFixed(4))
              : Number(((exactStars || 0) * 0.02).toFixed(4)),
          note: params.note,
        }),
      });
      const data = await res.json();
      if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
      if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.debit({
        transactionUuid: txUuid,
        roundId: params.roundId,
        vertical: params.vertical,
        currency: effectiveCurrency,
        amountTon: exactTon,
        amountStars: exactStars,
        amountUsdt: params.amountUsdt,
        note: params.note,
      });
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      return localRes;
    }
  };

  const pamCredit = async (params: {
    transactionUuid?: string;
    referenceTransactionUuid?: string | null;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    amountTon?: number;
    amountStars?: number;
    currency?: ActiveTmaCurrency;
    note?: string;
    awardLuckyAirdropTicket?: boolean;
  }): Promise<PAMOperationResponse & { bonusTicketAwarded?: TicketItem | null }> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_credit');
    const effectiveCurrency: ActiveTmaCurrency = params.currency || activeTmaCurrency;
    const exactTon =
      effectiveCurrency === 'TON'
        ? typeof params.amountTon === 'number' && params.amountTon >= 0
          ? Number(params.amountTon.toFixed(4))
          : Number((params.amountUsdt / 5.0).toFixed(4))
        : undefined;
    const exactStars =
      effectiveCurrency === 'STARS'
        ? typeof params.amountStars === 'number' && params.amountStars >= 0
          ? Math.round(params.amountStars)
          : Math.round(params.amountUsdt / 0.02)
        : undefined;

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/credit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uuid: txUuid,
          reference_transaction_uuid: params.referenceTransactionUuid || null,
          round_id: params.roundId,
          vertical: params.vertical,
          currency: effectiveCurrency,
          amountTon: exactTon,
          amountStars: exactStars,
          amountUsdt:
            effectiveCurrency === 'TON'
              ? Number(((exactTon || 0) * 5.0).toFixed(4))
              : Number(((exactStars || 0) * 0.02).toFixed(4)),
          note: params.note,
          awardLuckyAirdropTicket: Boolean(params.awardLuckyAirdropTicket),
        }),
      });
      const data = await res.json();
      if (data.bonusTicketAwarded) {
        setTickets((prev) => [data.bonusTicketAwarded, ...prev]);
      }
      if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
      if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.credit({
        transactionUuid: txUuid,
        referenceTransactionUuid: params.referenceTransactionUuid || null,
        roundId: params.roundId,
        vertical: params.vertical,
        currency: effectiveCurrency,
        amountTon: exactTon,
        amountStars: exactStars,
        amountUsdt: params.amountUsdt,
        note: params.note,
      });
      let bonusTicketAwarded: TicketItem | null = null;
      if (localRes.ok && params.awardLuckyAirdropTicket) {
        const seedsNow = localPamEngineRef.current.getState().seeds;
        const ticketCode = `AIR-${Math.floor(100000 + Math.random() * 900000)}`;
        const txHash = `0x${sha256Hex(`${txUuid}:${ticketCode}`)}`;
        bonusTicketAwarded = {
          id: Date.now(),
          ticketCode,
          userUid: localPamEngineRef.current.getState().playerId,
          roundCode: '#LDR-8493',
          mainNumbers: JSON.stringify([5, 12, 23, 34, 48]),
          goldenBall: 5,
          costUsdt: '0.00',
          currencyNetwork: 'CRASH LUCKY AIRDROP (>=5x)',
          txHash,
          transactionUuid: `${txUuid}_airdrop_ticket`,
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
        setTickets((prev) => [bonusTicketAwarded!, ...prev]);
      }
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      return { ...localRes, bonusTicketAwarded };
    }
  };

  const pamRollback = async (params: {
    transactionUuid?: string;
    referenceTransactionUuid: string;
    roundId: string;
    vertical: string;
    note?: string;
  }): Promise<PAMOperationResponse> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_rollback');
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/rollback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uuid: txUuid,
          reference_transaction_uuid: params.referenceTransactionUuid,
          round_id: params.roundId,
          vertical: params.vertical,
          note: params.note,
        }),
      });
      const data = await res.json();
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.rollback({
        transactionUuid: txUuid,
        referenceTransactionUuid: params.referenceTransactionUuid,
        roundId: params.roundId,
        vertical: params.vertical,
        note: params.note,
      });
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      return localRes;
    }
  };

  const pamBonus = async (params: {
    transactionUuid?: string;
    roundId: string;
    vertical: string;
    amountUsdt: number;
    creditToRealBalance?: boolean;
    note?: string;
  }): Promise<PAMOperationResponse> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_bonus');
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/bonus', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uuid: txUuid,
          round_id: params.roundId,
          vertical: params.vertical,
          amountUsdt: params.amountUsdt,
          creditToRealBalance: params.creditToRealBalance ?? true,
          note: params.note,
        }),
      });
      const data = await res.json();
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.bonus({
        transactionUuid: txUuid,
        roundId: params.roundId,
        vertical: params.vertical,
        amountUsdt: params.amountUsdt,
        creditToRealBalance: params.creditToRealBalance ?? true,
        note: params.note,
      });
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      return localRes;
    }
  };

  const pamReconcile = async (): Promise<PAMOperationResponse> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/reconcile', {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reconciliation) setPamReconciliation(data.reconciliation);
        return data;
      }
    } catch {
      // Fallback
    }
    const localRes = localPamEngineRef.current.reconcile();
    if (localRes.reconciliation) setPamReconciliation(localRes.reconciliation);
    return localRes;
  };

  const updateProvablyFairClientSeed = async (nextClientSeed: string): Promise<ProvablyFairSeedState> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/seeds/client', {
        method: 'POST',
        headers,
        body: JSON.stringify({ clientSeed: nextClientSeed }),
      });
      if (res.ok) {
        const data = await res.json();
        await refreshSnapshot();
        return data.seeds;
      }
    } catch {
      // Fallback
    }
    const seeds = localPamEngineRef.current.updateClientSeed(nextClientSeed);
    syncPamStateEverywhere(localPamEngineRef.current.getState());
    return seeds;
  };

  const rotateProvablyFairServerSeed = async (): Promise<ProvablyFairSeedState> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/seeds/rotate', {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        await refreshSnapshot();
        return data.seeds;
      }
    } catch {
      // Fallback
    }
    const seeds = localPamEngineRef.current.rotateServerSeed();
    syncPamStateEverywhere(localPamEngineRef.current.getState());
    return seeds;
  };

  const playInstantMiniGame = async (params: {
    gameId: InstantMiniGameId;
    betAmountUsdt: number;
    betAmountNative?: number;
    amountTon?: number;
    amountStars?: number;
    diceRollUnder?: number;
    diceTarget?: number;
    diceMode?: 'OVER' | 'UNDER';
    coinSide?: 'HEADS' | 'TAILS';
    crashAutoCashoutX?: number;
    plinkoRows?: PlinkoRowCount;
    plinkoRisk?: PlinkoRiskLevel;
    minesCount?: number;
    minesRevealedSafeCount?: number;
    minesHitBomb?: boolean;
    selectedTiles?: number[];
    towerDifficulty?: TowerDifficulty;
    towerFloorsCleared?: number;
    towerHitTrap?: boolean;
    selectedColumns?: number[];
    wheelRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
    hiloChoice?: 'HIGHER' | 'LOWER' | 'SAME';
    hiloBaseCard?: number;
    hiloMultiplier?: number;
    hiloWon?: boolean;
    hiloSummaryLabel?: string;
    usedFreeBonusToken?: boolean;
  }) => {
    if (killSwitchActive) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: بازی‌های آنی موقتاً متوقف است.',
        tonBalance,
        starsBalance,
      };
    }

    const isFreeBonusRound = Boolean(params.usedFreeBonusToken);
    const numericBetUsdt = Number(params.betAmountUsdt);

    const exactBetTon =
      activeTmaCurrency === 'TON'
        ? typeof params.amountTon === 'number' && params.amountTon > 0
          ? Number(params.amountTon.toFixed(4))
          : typeof params.betAmountNative === 'number' && params.betAmountNative > 0
          ? Number(params.betAmountNative.toFixed(4))
          : Number((numericBetUsdt / 5.0).toFixed(4))
        : 0;

    const exactBetStars =
      activeTmaCurrency === 'STARS'
        ? typeof params.amountStars === 'number' && params.amountStars > 0
          ? Math.round(params.amountStars)
          : typeof params.betAmountNative === 'number' && params.betAmountNative > 0
          ? Math.round(params.betAmountNative)
          : Math.round(numericBetUsdt / 0.02)
        : 0;

    if (
      !isFreeBonusRound &&
      ((activeTmaCurrency === 'TON' && (!Number.isFinite(exactBetTon) || exactBetTon <= 0)) ||
        (activeTmaCurrency === 'STARS' && (!Number.isFinite(exactBetStars) || exactBetStars <= 0)))
    ) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        error: '400 Bad Request — INVALID_BET_AMOUNT: مبلغ شرط نامعتبر است.',
        tonBalance,
        starsBalance,
      };
    }

    const effectiveDebitUsdt = isFreeBonusRound
      ? 0
      : activeTmaCurrency === 'TON'
      ? Number((exactBetTon * 5.0).toFixed(4))
      : Number((exactBetStars * 0.02).toFixed(4));

    if (!isFreeBonusRound && activeTmaCurrency === 'STARS') {
      if (starsBalance < exactBetStars) {
        HapticEngine.notificationOccurred('error');
        setDepositModalOpen(true);
        return {
          ok: false,
          error: `موجودی ستاره‌های تلگرام شما (${starsBalance} ⭐) کافی نیست. لطفاً حساب خود را شارژ کنید.`,
          tonBalance,
          starsBalance,
        };
      }
    }

    const currentLiveTonBalance = localPamEngineRef.current.getState().tonBalance;
    if (
      !isFreeBonusRound &&
      activeTmaCurrency === 'TON' &&
      currentLiveTonBalance < exactBetTon &&
      tonBalance < exactBetTon
    ) {
      HapticEngine.notificationOccurred('error');
      setDepositModalOpen(true);
      return {
        ok: false,
        error: 'موجودی کیف پول TON/PAM شما کافی نیست.',
        tonBalance,
        starsBalance,
      };
    }

    const txUuid = generateDeterministicUuid('mg_debit');

    // 100% Server-Authoritative RNG & 1:1 Native Currency Execution
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/mini-game/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameId: params.gameId,
          currency: activeTmaCurrency,
          amountTon: activeTmaCurrency === 'TON' ? exactBetTon : undefined,
          betAmountTon: activeTmaCurrency === 'TON' ? exactBetTon : undefined,
          amountStars: activeTmaCurrency === 'STARS' ? exactBetStars : undefined,
          betAmountStars: activeTmaCurrency === 'STARS' ? exactBetStars : undefined,
          betAmountUsdt: effectiveDebitUsdt,
          usedFreeBonusToken: isFreeBonusRound,
          transaction_uuid: txUuid,
          diceRollUnder: params.diceRollUnder,
          diceTarget: params.diceTarget,
          diceMode: params.diceMode,
          coinSide: params.coinSide,
          crashAutoCashoutX: params.crashAutoCashoutX,
          plinkoRows: params.plinkoRows,
          plinkoRisk: params.plinkoRisk,
          minesCount: params.minesCount,
          minesRevealedSafeCount: params.minesRevealedSafeCount,
          selectedTiles: params.selectedTiles,
          towerDifficulty: params.towerDifficulty,
          towerFloorsCleared: params.towerFloorsCleared,
          selectedColumns: params.selectedColumns,
          wheelRisk: params.wheelRisk,
          hiloChoice: params.hiloChoice,
          hiloBaseCard: params.hiloBaseCard,
          hiloSummaryLabel: params.hiloSummaryLabel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        } else {
          await refreshSnapshot();
        }
        if (typeof data.tonBalance === 'number') {
          setTonBalance(data.tonBalance);
        }
        if (typeof data.starsBalance === 'number') {
          setStarsBalance(data.starsBalance);
        }
        if (data.bonusTicketAwarded) {
          setTickets((prev) => [data.bonusTicketAwarded, ...prev]);
        }

        // Progress Quest #4 (Play 10 Rounds in Mini-Games) after verified server round
        setTmaQuests((prev) => {
          const next = prev.map((q) =>
            q.id === 'PLAY_10_MINIGAMES' && !q.claimed
              ? { ...q, progress: Math.min(q.target, q.progress + 1) }
              : q
          );
          try {
            localStorage.setItem(
              getScopedStorageKey(telegramUser.id, 'luckydrop_tma_quests_v3'),
              JSON.stringify(next)
            );
          } catch {}
          return next;
        });

        const xpCalc = calculateZeroLossTurnoverXp(effectiveDebitUsdt, false);
        if (xpCalc.xpEarned > 0) {
          setTmaXpPoints((xp) => xp + xpCalc.xpEarned);
        }

        if (data.evaluation?.won) HapticEngine.notificationOccurred('success');
        else HapticEngine.impactOccurred('light');

        return {
          ok: true,
          evaluation: data.evaluation,
          payoutTon: data.payoutTon,
          payoutStars: data.payoutStars,
          bonusTicketAwarded: data.bonusTicketAwarded || null,
          debitTransactionUuid: data.debitTransactionUuid || txUuid,
          tonBalance: data.tonBalance ?? tonBalance,
          starsBalance: data.starsBalance ?? starsBalance,
        };
      }
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        error: data.error || 'خطا در اجرای بازی آنی در سرور',
        tonBalance: data.tonBalance ?? tonBalance,
        starsBalance: data.starsBalance ?? starsBalance,
      };
    } catch (err: any) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        error: err?.message || 'خطا در ارتباط با سرور RNG (/api/pam/mini-game/play)',
        tonBalance,
        starsBalance,
      };
    }
  };

  const startGameSession = async (params: {
    gameId: 'MINES' | 'TOWER_3D';
    betAmountUsdt: number;
    betAmountNative?: number;
    amountTon?: number;
    amountStars?: number;
    minesCount?: number;
    towerDifficulty?: TowerDifficulty;
  }) => {
    const exactBetTon =
      activeTmaCurrency === 'TON'
        ? typeof params.amountTon === 'number' && params.amountTon > 0
          ? Number(params.amountTon.toFixed(4))
          : typeof params.betAmountNative === 'number' && params.betAmountNative > 0
          ? Number(params.betAmountNative.toFixed(4))
          : Number((params.betAmountUsdt / 5.0).toFixed(4))
        : undefined;
    const exactBetStars =
      activeTmaCurrency === 'STARS'
        ? typeof params.amountStars === 'number' && params.amountStars > 0
          ? Math.round(params.amountStars)
          : typeof params.betAmountNative === 'number' && params.betAmountNative > 0
          ? Math.round(params.betAmountNative)
          : Math.round(params.betAmountUsdt / 0.02)
        : undefined;

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/games/session/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gameId: params.gameId,
          currency: activeTmaCurrency,
          amountTon: exactBetTon,
          betAmountTon: exactBetTon,
          amountStars: exactBetStars,
          betAmountStars: exactBetStars,
          betAmountUsdt: Number(params.betAmountUsdt.toFixed(4)),
          minesCount: params.minesCount,
          towerDifficulty: params.towerDifficulty,
          transaction_uuid: generateDeterministicUuid('sess_debit'),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        }
        if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
        if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
        return {
          ok: true,
          session: data.session,
          debitTransactionUuid: data.debitTransactionUuid,
          tonBalance: data.tonBalance ?? tonBalance,
          starsBalance: data.starsBalance ?? starsBalance,
        };
      }
      return {
        ok: false,
        error: data.error || 'خطا در شروع نشست بازی در سرور',
        tonBalance: data.tonBalance ?? tonBalance,
        starsBalance: data.starsBalance ?? starsBalance,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'خطا در ارتباط با سرور (/api/games/session/start)',
        tonBalance,
        starsBalance,
      };
    }
  };

  const revealGameSessionStep = async (params: { tileIndex?: number; colIndex?: number }) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/games/session/reveal', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        }
        if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
        if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
        return {
          ok: true,
          ...data,
        };
      }
      return {
        ok: false,
        error: data.error || 'خطا در بررسی انتخاب در سرور',
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'خطا در ارتباط با سرور (/api/games/session/reveal)',
      };
    }
  };

  const cashoutGameSession = async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/games/session/cashout', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        }
        if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
        if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
        return {
          ok: true,
          ...data,
        };
      }
      return {
        ok: false,
        error: data.error || 'خطا در تسویه جایزه در سرور',
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'خطا در ارتباط با سرور (/api/games/session/cashout)',
      };
    }
  };

  const depositTonInstant = async (
    amountTon: number,
    senderWalletOrTxHash?: string,
    memo?: string
  ): Promise<{ ok: boolean; message: string }> => {
    const safeTon = Number(Number(amountTon || 0).toFixed(4));
    if (!Number.isFinite(safeTon) || safeTon < 0.1) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: '⚠️ حداقل مقدار شارژ در شبکه TON معادل 0.10 TON است.',
      };
    }

    const activeTonAddr = realTonAddress || (senderWalletOrTxHash || '').trim();
    const treasuryDestination = (adminTonWalletAddress || DEFAULT_ADMIN_TON_WALLET_ADDRESS).trim();

    // If user passed an explicit TXID/BOC string from manual transfer, verify directly on server
    const manualProof =
      senderWalletOrTxHash && senderWalletOrTxHash.startsWith('tx_')
        ? senderWalletOrTxHash.replace(/^tx_/, '').trim()
        : '';

    let signedBoc = manualProof;

    if (!signedBoc) {
      if (!realTonAddress) {
        HapticEngine.notificationOccurred('warning');
        try {
          await tonConnectUI.openModal();
        } catch {
          // ignore modal open errors
        }
        return {
          ok: false,
          message:
            '💎 برای پرداخت اتوماتیک ۱-کلیکی ابتدا کیف پول TON خود را متصل کنید، یا پس از انتقال به آدرس خزانه، کد پیگیری/هش تراکنش را ثبت نمایید.',
        };
      }

      const nanoTonStr = String(Math.floor(safeTon * 1e9));
      HapticEngine.impactOccurred('medium');
      try {
        const txResult = await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: treasuryDestination,
              amount: nanoTonStr,
            },
          ],
        });
        signedBoc = String(txResult?.boc || '').trim();
      } catch (txErr: any) {
        HapticEngine.notificationOccurred('error');
        const errDetail = txErr?.message || 'تراکنش در کیف پول لغو شد';
        return {
          ok: false,
          message: `⚠️ تراکنش در کیف پول TON امضا نشد: ${errDetail}`,
        };
      }
    }

    if (!signedBoc || signedBoc.length < 8) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: '⚠️ امضای دیجیتال (BOC / TXID) معتبر دریافت نشد. موجودی تغییر نکرد.',
      };
    }

    const amountUsdt = tmaCurrencyToUsdt(safeTon, 'TON', tonUsdRate, starsUsdRate);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/deposit-ton', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          boc: signedBoc,
          amountTon: safeTon,
          amountUsdt,
          senderWallet: activeTonAddr || 'TON Wallet',
          destinationWallet: treasuryDestination,
          memo: memo || `LD-TG-${telegramUser.id}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        HapticEngine.notificationOccurred('error');
        return {
          ok: false,
          message: data.error || 'خطا در تایید واریز TON در سرور',
        };
      }
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState);
      } else if (typeof data.tonBalance === 'number') {
        setTonBalance(data.tonBalance);
      }
      if (Array.isArray(data.deposits)) {
        setDeposits(data.deposits);
      }
      await refreshSnapshot();
      HapticEngine.notificationOccurred('success');
      return {
        ok: true,
        message: `💎 واریز +${rawFormatCurrency(
          safeTon,
          'TON'
        )} با موفقیت در سرور تایید و به موجودی شما اضافه شد!`,
      };
    } catch (err: any) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: err?.message || 'خطا در ارتباط با سرور (/api/wallet/deposit-ton)',
      };
    }
  };

  const depositTelegramStarsInstant = async (
    amountStars: number
  ): Promise<{ ok: boolean; message: string }> => {
    const safeStars = Math.round(Number(amountStars) || 0);
    if (!Number.isFinite(safeStars) || safeStars < 10) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: '⚠️ حداقل مقدار شارژ ستاره تلگرام ۱۰ ⭐ است.',
      };
    }

    HapticEngine.impactOccurred('medium');
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/create-stars-invoice', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amountStars: safeStars,
          memo: `STARS-TG-${telegramUser.id}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.invoiceLink) {
        HapticEngine.notificationOccurred('error');
        return {
          ok: false,
          message:
            data.error ||
            'خطا در صدور فاکتور رسمی Telegram Stars (TELEGRAM_BOT_TOKEN بررسی شود)',
        };
      }

      const twa = (window as any)?.Telegram?.WebApp;
      if (twa?.openInvoice) {
        try {
          twa.openInvoice(data.invoiceLink, async (status: string) => {
            if (status === 'paid') {
              await refreshSnapshot();
              HapticEngine.notificationOccurred('success');
            }
          });
        } catch {
          // ignore if outside native Telegram client
        }
      }

      return {
        ok: true,
        message: `⭐ فاکتور رسمی ${safeStars.toLocaleString(
          'en-US'
        )} Stars (XTR) صادر شد. به محض پرداخت در پنجره تلگرام و تایید وبهوک (successful_payment)، موجودی شما به صورت خودکار شارژ می‌شود.`,
      };
    } catch (err: any) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: err?.message || 'خطا در ارتباط با سرور جهت صدور فاکتور Telegram Stars',
      };
    }
  };

  const withdrawTonOrStars = async (params: {
    currency: ActiveTmaCurrency;
    amount: number;
    destination: string;
  }): Promise<{ ok: boolean; message: string }> => {
    HapticEngine.impactOccurred('medium');
    const numericAmount = Number(params.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      HapticEngine.notificationOccurred('error');
      return { ok: false, message: 'لطفاً یک مبلغ معتبر وارد کنید.' };
    }

    if (params.currency === 'STARS') {
      const safeStars = Math.round(numericAmount);
      if (safeStars < 50) {
        HapticEngine.notificationOccurred('error');
        return { ok: false, message: 'حداقل مقدار برداشت ستاره تلگرام ۵۰ ⭐ است.' };
      }
      if (safeStars > starsBalance) {
        HapticEngine.notificationOccurred('error');
        return {
          ok: false,
          message: `موجودی ستاره‌های شما (${starsBalance.toLocaleString('en-US')} ⭐) برای برداشت ${safeStars.toLocaleString('en-US')} ⭐ کافی نیست.`,
        };
      }
      const targetDest =
        params.destination.trim() || `@${telegramUser.username || telegramUser.first_name || 'VIP'}`;
      try {
        const headers = await getHeaders();
        const res = await fetch('/api/wallet/withdraw-stars', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amountStars: safeStars,
            destination: targetDest,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          HapticEngine.notificationOccurred('error');
          return {
            ok: false,
            message: data.error || 'خطا در ثبت برداشت ستاره تلگرام',
          };
        }
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        } else if (typeof data.starsBalance === 'number') {
          setStarsBalance(data.starsBalance);
        }
        if (Array.isArray(data.withdrawals)) {
          setWithdrawals(data.withdrawals);
        }
        await refreshSnapshot();
        HapticEngine.notificationOccurred('success');
        return {
          ok: true,
          message: `⭐ برداشت ${rawFormatCurrency(
            safeStars,
            'STARS'
          )} به حساب تلگرام (${targetDest}) با موفقیت ثبت و تسویه شد!`,
        };
      } catch (err: any) {
        HapticEngine.notificationOccurred('error');
        return {
          ok: false,
          message: err?.message || 'خطا در ارتباط با سرور جهت برداشت Stars',
        };
      }
    }

    // TON Withdrawal
    const safeTon = Number(numericAmount.toFixed(4));
    if (safeTon < 0.1) {
      HapticEngine.notificationOccurred('error');
      return { ok: false, message: 'حداقل مقدار برداشت در شبکه TON معادل 0.10 TON است.' };
    }
    if (safeTon > tonBalance) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        message: `موجودی TON شما (${rawFormatCurrency(tonBalance, 'TON')}) برای برداشت ${rawFormatCurrency(safeTon, 'TON')} کافی نیست.`,
      };
    }

    const targetDest = (params.destination || '').trim() || realTonAddress;
    if (!targetDest || targetDest.length < 10) {
      HapticEngine.notificationOccurred('warning');
      return {
        ok: false,
        message: '💎 لطفاً آدرس کیف پول TON مقصد (با پیشوند UQ یا EQ) را وارد کنید یا کیف پول خود را متصل نمایید.',
      };
    }

    const amountUsdt = tmaCurrencyToUsdt(safeTon, 'TON', tonUsdRate, starsUsdRate);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          network: 'TON Network',
          destinationAddress: targetDest,
          amountTon: safeTon,
          grossAmountUsdt: amountUsdt,
          networkFeeUsdt: 0.1,
          netAmountUsdt: Math.max(0.05, amountUsdt - 0.1),
          netAmountCrypto: `${Math.max(0.01, safeTon - 0.02).toFixed(2)} TON`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        HapticEngine.notificationOccurred('error');
        return { ok: false, message: data.error || 'خطا در ثبت برداشت TON' };
      }
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState);
      } else if (typeof data.tonBalance === 'number') {
        setTonBalance(data.tonBalance);
      }
      if (Array.isArray(data.withdrawals)) {
        setWithdrawals(data.withdrawals);
      }
      await refreshSnapshot();
      HapticEngine.notificationOccurred('success');
      if (data.requiresAdminApproval || data.withdrawal?.status === 'pending_review') {
        return {
          ok: true,
          message: `⏳ درخواست برداشت مبلغ بالا (${rawFormatCurrency(
            safeTon,
            'TON'
          )}) ثبت شد و جهت امنیت در صف تایید قرار گرفت.`,
        };
      }
      return {
        ok: true,
        message: `💎 برداشت اتوماتیک ${rawFormatCurrency(
          safeTon,
          'TON'
        )} به آدرس (${truncateTonAddress(targetDest)}) با موفقیت ثبت و تسویه شد!`,
      };
    } catch (err: any) {
      HapticEngine.notificationOccurred('error');
      return { ok: false, message: err?.message || 'خطا در ارتباط با سرور جهت برداشت TON' };
    }
  };

  useEffect(() => {
    testFirestoreConnection().then((ok) => setFirestoreConnected(ok));
    fetchOfficialWalletsFromFirestore().then((cloudWallets) => {
      if (cloudWallets && typeof cloudWallets === 'object') {
        setOfficialWallets((prev) => ({ ...prev, ...(cloudWallets as Partial<OfficialSiteWallets>) }));
        if (
          cloudWallets.solvencyMode === 'AUTO_EXTEND' ||
          cloudWallets.solvencyMode === 'PROPORTIONAL_POOL'
        ) {
          setSolvencyModeState(cloudWallets.solvencyMode);
        }
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const token = await user.getIdToken();
        authTokenRef.current = token;
      } else {
        authTokenRef.current = null;
      }
      refreshSnapshot();
    });
    return () => unsubscribe();
  }, [refreshSnapshot]);

  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      authTokenRef.current = token;
      await refreshSnapshot();
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      authTokenRef.current = null;
      await refreshSnapshot();
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const formatAmount = useCallback(
    (usdt: number) => {
      const converted = usdtToTmaCurrency(usdt, activeTmaCurrency, tonUsdRate, starsUsdRate);
      return rawFormatCurrency(converted, activeTmaCurrency);
    },
    [activeTmaCurrency, tonUsdRate, starsUsdRate]
  );

  const mintTicket = async (network: string = 'USDT (TRC-20)') => {
    return mintBulkTickets(
      [
        {
          slipIndex: 1,
          mainNumbers: selectedMainBalls,
          goldenBall: selectedGoldenBall,
          clientSeed: pamState.seeds.clientSeed || `luckydrop-vip-${Math.random().toString(16).slice(2, 10)}`,
        },
      ],
      activeLotterySpec.roundCode,
      activeLotterySpec.ticketPriceUsdt,
      network
    ).then((res) => ({
      ok: res.ok,
      error: res.error,
      ticket: res.tickets?.[0],
    }));
  };

  const mintBulkTickets = async (
    slips: BulkTicketSlip[],
    roundCode: string,
    totalCostUsdt: number,
    network: string = 'USDT (TRC-20)',
    nativeOptions?: {
      currency?: ActiveTmaCurrency;
      amountTon?: number;
      amountStars?: number;
    }
  ) => {
    if (killSwitchActive) {
      return {
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: فروش بلیت موقتاً متوقف است.',
      };
    }

    const effectiveCurrency: ActiveTmaCurrency =
      nativeOptions?.currency ||
      (String(network).toUpperCase().includes('STARS') ? 'STARS' : activeTmaCurrency);

    const roundObj = rounds.find((r) => r.roundCode === roundCode) || activeRound;
    const roundUnitPriceUsdt = Math.max(
      0.1,
      parseFloat(String(roundObj?.ticketPriceUsdt || totalCostUsdt / Math.max(1, slips.length))) || 5
    );
    const unitPriceTon = Number((roundUnitPriceUsdt / 5.0).toFixed(4));
    const unitPriceStars = Math.max(1, Math.round(unitPriceTon * 250));

    const exactTotalTon =
      effectiveCurrency === 'TON'
        ? typeof nativeOptions?.amountTon === 'number' && nativeOptions.amountTon > 0
          ? Number(nativeOptions.amountTon.toFixed(4))
          : Number((slips.length * unitPriceTon).toFixed(4))
        : 0;
    const exactTotalStars =
      effectiveCurrency === 'STARS'
        ? typeof nativeOptions?.amountStars === 'number' && nativeOptions.amountStars > 0
          ? Math.round(nativeOptions.amountStars)
          : Math.round(slips.length * unitPriceStars)
        : 0;

    if (
      (effectiveCurrency === 'TON' && tonBalance < exactTotalTon) ||
      (effectiveCurrency === 'STARS' && starsBalance < exactTotalStars)
    ) {
      setDepositModalOpen(true);
      return {
        ok: false,
        error: 'موجودی کیف پول شما کافی نیست. لطفاً ابتدا حساب خود را شارژ کنید.',
      };
    }

    const txUuid = generateDeterministicUuid('tx_ticket_debit');
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uuid: txUuid,
          roundCode,
          mainNumbers: slips[0].mainNumbers,
          goldenBall: slips[0].goldenBall,
          currency: effectiveCurrency,
          amountTon: effectiveCurrency === 'TON' ? exactTotalTon : undefined,
          amountStars: effectiveCurrency === 'STARS' ? exactTotalStars : undefined,
          costUsdt: totalCostUsdt,
          currencyNetwork: network,
          clientSeed: slips[0].clientSeed || pamState.seeds.clientSeed,
          referredByCode,
          slips,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_BALANCE') {
          setDepositModalOpen(true);
        }
        return { ok: false, error: data.error || 'خطا در خرید بلیت' };
      }
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState);
      } else {
        if (typeof data.tonBalance === 'number') setTonBalance(data.tonBalance);
        if (typeof data.starsBalance === 'number') setStarsBalance(data.starsBalance);
      }
      if (referredByCode && referredByCode !== referralCode) {
        const split = calculateZeroLossTicketSplit(totalCostUsdt, true, 85, 2);
        const commTon = Number((split.referralCommissionUsdt / effectiveTonUsdRate).toFixed(4));
        setReferralEarningsTon((prev) => Number((prev + commTon).toFixed(4)));
        setReferredTicketsCount((prev) => prev + slips.length);
      }
      const mintedList: TicketItem[] = Array.isArray(data.tickets)
        ? data.tickets
        : data.ticket
        ? [data.ticket]
        : [];
      if (mintedList.length > 0) {
        setActiveTrackingTicket(mintedList[0]);
      }
      await refreshSnapshot();
      return { ok: true, tickets: mintedList };
    } catch {
      // Local PAM Seamless Wallet Debit fallback
      const debitRes = localPamEngineRef.current.debit({
        transactionUuid: txUuid,
        roundId: roundCode,
        vertical: 'LUCKYDROP_LOTTERY',
        currency: effectiveCurrency,
        amountTon: effectiveCurrency === 'TON' ? exactTotalTon : undefined,
        amountStars: effectiveCurrency === 'STARS' ? exactTotalStars : undefined,
        amountUsdt: totalCostUsdt,
        note: `خرید ${slips.length} کوپن لاتاری (${roundCode})`,
      });
      if (!debitRes.ok) {
        return { ok: false, error: debitRes.error || 'INSUFFICIENT_BALANCE' };
      }
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      const fallbackTickets: TicketItem[] = slips.map((slip, idx) => {
        const ticketCode = `LDR-${Math.floor(100000 + Math.random() * 900000)}`;
        const txHash = `0x${sha256Hex(`${txUuid}:${ticketCode}:${idx}`)}`;
        return {
          id: Date.now() + idx,
          ticketCode,
          userUid: pamState.playerId,
          roundCode,
          mainNumbers: JSON.stringify(slip.mainNumbers),
          goldenBall: slip.goldenBall,
          costUsdt: (totalCostUsdt / slips.length).toFixed(2),
          currencyNetwork: network,
          txHash,
          transactionUuid: idx === 0 ? txUuid : `${txUuid}_${idx + 1}`,
          clientSeed: slip.clientSeed,
          serverSeedHash: pamState.seeds.serverSeedHash,
          nonce: pamState.seeds.nonce + idx,
          commitHash: txHash.slice(2, 34),
          status: 'ACTIVE',
          confirmations: 19,
          prizeWonUsdt: '0.00',
          claimed: false,
          createdAt: 'همین الان',
        };
      });
      setTickets((prev) => [...fallbackTickets, ...prev]);
      setRounds((prev) =>
        prev.map((r) => {
          if (r.roundCode !== roundCode) return r;
          const nextCollected = (parseFloat(r.totalSalesUsdt || '0') || 0) + totalCostUsdt;
          const split = calculateDynamicPariMutuelPool(nextCollected, 15);
          return {
            ...r,
            totalSalesUsdt: split.grossCollectedUsdt.toFixed(2),
            jackpotUsdt: split.distributablePool85Usdt.toFixed(2),
            totalPayoutUsdt: split.distributablePool85Usdt.toFixed(2),
            operatorProfitUsdt: split.houseFee15Usdt.toFixed(2),
            ticketsSoldCount: (r.ticketsSoldCount || 0) + slips.length,
          };
        })
      );
      setActiveTrackingTicket(fallbackTickets[0]);
      return { ok: true, tickets: fallbackTickets };
    }
  };

  const claimTicketPrize = async (
    ticketCode: string,
    prizeUsdt: number,
    network: string = 'USDT (TRC-20)'
  ) => {
    if (claimedTicketCodes.includes(ticketCode)) return false;
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/tickets/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ticketCode, prizeUsdt, network }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (typeof data.tonBalance === 'number') {
        setTonBalance(data.tonBalance);
      }
    } catch {
      return false;
    }
    const nextClaimed = Array.from(new Set([...claimedTicketCodes, ticketCode]));
    setClaimedTicketCodes(nextClaimed);
    const local = loadLocalState(telegramUser.id);
    saveLocalState({ ...local, claimedTicketCodes: nextClaimed }, telegramUser.id);
    await refreshSnapshot();
    return true;
  };

  const depositCrypto = async (amountUsdt: number, network: string) => {
    const safeRate = tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE;
    const amountTon = Number((amountUsdt / safeRate).toFixed(4));
    if (network.toUpperCase().includes('TON')) {
      const tonRes = await depositTonInstant(amountTon);
      return tonRes.ok;
    }
    return false;
  };

  const submitDepositRequest = async (params: {
    amountUsdt: number;
    network: string;
    cryptoKey?: string;
    txHash: string;
    senderWallet?: string;
    officialRecipientWallet?: string;
    mode?: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
    verificationMode?: 'ONCHAIN_AUTO' | 'ADMIN_MANUAL';
    web3Signed?: boolean;
  }) => {
    if (killSwitchActive) {
      return {
        ok: false,
        queuedForAdmin: false,
        message: 'درگاه واریز توسط کلید اضطراری (Kill-Switch) موقتاً مسدود است.',
      };
    }

    const effectiveMode = params.verificationMode || params.mode || 'ONCHAIN_AUTO';
    if (params.network.toUpperCase().includes('TON') && effectiveMode === 'ONCHAIN_AUTO') {
      const safeRate = tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE;
      const amountTon = Number((params.amountUsdt / safeRate).toFixed(4));
      const tonRes = await depositTonInstant(amountTon, params.senderWallet);
      return {
        ok: tonRes.ok,
        queuedForAdmin: false,
        status: tonRes.ok ? ('CREDITED' as const) : undefined,
        message: tonRes.message,
      };
    }

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...params, mode: effectiveMode, verificationMode: effectiveMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          queuedForAdmin: false,
          message: data.error || 'خطا در بررسی تراکنش واریز در سرور',
        };
      }
      if (Array.isArray(data.deposits)) {
        setDeposits(data.deposits);
      }
      await refreshSnapshot();

      if (data.queuedForAdmin) {
        return {
          ok: true,
          queuedForAdmin: true,
          status: 'PENDING_ADMIN' as const,
          deposit: data.deposit,
          message:
            '📋 فیش و هش تراکنش (TXID) شما با موفقیت در «صف تایید ادمین در کاکپیت» ثبت شد. پس از تایید اپراتور به موجودی شما افزوده می‌شود.',
        };
      }

      return {
        ok: true,
        queuedForAdmin: false,
        status: 'CREDITED' as const,
        deposit: data.deposit,
        message: `✅ تراکنش شما در شبکه ${params.network} تایید شد و مبلغ ${formatActiveTmaAmount(
          params.amountUsdt
        )} به صورت آنی در دفترکل PAM شارژ گردید!`,
      };
    } catch (err: any) {
      return {
        ok: false,
        queuedForAdmin: false,
        message: err?.message || 'خطا در ارتباط با سرور جهت تایید تراکنش واریز',
      };
    }
  };

  const adminActionDeposit = async (
    depositCode: string,
    action: 'approve' | 'reject' | 'approve_all'
  ) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/deposits/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ depositCode, action }),
      });
      if (res.ok) {
        await refreshSnapshot();
        return true;
      }
    } catch {
      // Fallback
    }
    return true;
  };

  const requestWithdrawal = async (params: {
    network: WithdrawalNetwork;
    destinationAddress: string;
    amountUsdt: number;
  }) => {
    if (killSwitchActive) {
      return {
        ok: false,
        error: 'برداشت وجه توسط کلید اضطراری پروتکل (Kill-Switch) موقتاً مسدود است.',
      };
    }
    if (params.amountUsdt <= 0 || params.amountUsdt > balanceUsdt) {
      return {
        ok: false,
        error: 'مبلغ درخواستی بیشتر از موجودی قابل برداشت کیف پول شما است.',
      };
    }

    const feeCalc = calculateWithdrawalFeeAndNet(params.amountUsdt, params.network, fxRates);

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          network: params.network,
          destinationAddress: params.destinationAddress,
          grossAmountUsdt: feeCalc.grossAmountUsdt,
          networkFeeUsdt: feeCalc.networkFeeUsdt,
          netAmountUsdt: feeCalc.netAmountUsdt,
          netAmountCrypto: feeCalc.netAmountCrypto,
        }),
      });
      const data = await res.json();
      if (res.ok && data.withdrawal) {
        await refreshSnapshot();
        return { ok: true, withdrawal: data.withdrawal };
      }
    } catch {
      // Fallback
    }
    return { ok: false, error: 'خطا در ثبت برداشت' };
  };

  const adminActionWithdrawal = async (
    withdrawalCode: string,
    action: 'approve' | 'broadcast' | 'reject' | 'sweep_all'
  ) => {
    try {
      const headers = await getHeaders();
      await fetch('/api/admin/withdrawals/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ withdrawalCode, action }),
      });
      await refreshSnapshot();
    } catch {
      // ignore
    }
    return true;
  };

  const setAutoWithdrawLimitTon = async (limitTon: number): Promise<boolean> => {
    const safeLimit = Math.max(1, Number(limitTon) || 50);
    setAutoWithdrawLimitTonState(safeLimit);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/withdrawals/threshold', {
        method: 'POST',
        headers,
        body: JSON.stringify({ autoWithdrawLimitTon: safeLimit }),
      });
      if (res.ok) {
        await refreshSnapshot();
        return true;
      }
    } catch {
      // fallback
    }
    return true;
  };

  const setKillSwitchState = async (active?: boolean) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/killswitch', {
        method: 'POST',
        headers,
        body: JSON.stringify(typeof active === 'boolean' ? { active } : {}),
      });
      if (res.ok) {
        const data = await res.json();
        setKillSwitchActive(Boolean(data.killSwitchActive));
      }
    } catch (err) {
      console.error('Killswitch state error:', err);
    }
  };

  const toggleKillSwitch = async () => {
    await setKillSwitchState();
  };

  const createNewRound = async (input: {
    titleFa?: string;
    category: string;
    ticketPriceUsdt?: number;
    ticketPriceTon?: number;
    rtpPercent?: number;
    jackpotUsdt?: number;
    initialSeedTon?: number;
    durationMinutes?: number;
    mainCount?: number;
    mainMax?: number;
    goldenMax?: number;
  }) => {
    const effectiveTonRate = tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE;
    const priceUsdt =
      typeof input.ticketPriceTon === 'number' && input.ticketPriceTon > 0
        ? Number((input.ticketPriceTon * effectiveTonRate).toFixed(2))
        : Math.max(0.1, Number(input.ticketPriceUsdt) || effectiveTonRate);
    const seedUsdt =
      typeof input.initialSeedTon === 'number' && input.initialSeedTon >= 0
        ? Number((input.initialSeedTon * effectiveTonRate).toFixed(2))
        : Math.max(0, Number(input.jackpotUsdt) || 0);
    const durMin = Math.max(1, Number(input.durationMinutes) || 60);
    const cleanTitle =
      (input.titleFa || '').trim() || `دور ویژه TON #${rounds.length + 1}`;

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/rounds', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titleFa: cleanTitle,
          category: input.category,
          ticketPriceUsdt: priceUsdt,
          rtpPercent: 85,
          jackpotUsdt: seedUsdt,
          initialSeedUsdt: seedUsdt,
          durationMinutes: durMin,
          mainCount: input.mainCount || 5,
          mainMax: input.mainMax || 50,
          goldenMax: typeof input.goldenMax === 'number' ? input.goldenMax : 15,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rounds)) {
          setRounds(data.rounds);
          if (data.round?.roundCode) {
            setActiveRoundCodeState(data.round.roundCode);
          }
        } else {
          await refreshSnapshot();
        }
        return true;
      }
    } catch {
      // Local fallback if offline
    }
    const fallbackCode = `#LDR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSeed = generateCryptographicServerSeed();
    const poolSplit = calculateDynamicPariMutuelPool(seedUsdt, 15);
    const mCount = input.mainCount || 5;
    const mMax = input.mainMax || 50;
    const gMax = typeof input.goldenMax === 'number' ? input.goldenMax : 15;
    const fallbackRound: LotteryRoundItem = {
      id: Date.now(),
      roundCode: fallbackCode,
      lotteryType: 'MEGA_WEEKLY',
      titleFa: cleanTitle,
      titleEn: cleanTitle,
      titleZh: cleanTitle,
      subtitleFa: `${mCount} گوی از ${mMax}${gMax > 0 ? ` + ۱ گوی طلایی از ${gMax}` : ''}`,
      category: input.category,
      formatLabel: `${mCount}/${mMax}${gMax > 0 ? ` + 1/${gMax}` : ''}`,
      mainCount: mCount,
      mainMax: mMax,
      goldenMax: gMax,
      jackpotUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      ticketPriceUsdt: priceUsdt.toFixed(2),
      rtpPercent: '85.00',
      soldPercent: 0,
      remainingLabel: 'تقسیم ۸۵٪ استخر راس تایم (۱۵٪ سهم سایت)',
      drawTimeLabel: `قرعه‌کشی راس ${durMin} دقیقه`,
      serverSeedHash: sha256Hex(newSeed),
      clientSeed: pamState.seeds.clientSeed,
      winningNumbers: '[7,14,23,38,49]',
      winningGoldenBall: 8,
      totalSalesUsdt: poolSplit.grossCollectedUsdt.toFixed(2),
      totalPayoutUsdt: poolSplit.distributablePool85Usdt.toFixed(2),
      operatorProfitUsdt: poolSplit.houseFee15Usdt.toFixed(2),
      rolloverReserveUsdt: '0.00',
      durationMinutes: durMin,
      drawTargetTimestampMs: Date.now() + durMin * 60 * 1000,
      initialSeedUsdt: seedUsdt.toFixed(2),
      ticketsSoldCount: 0,
      status: 'ACTIVE',
    };
    setRounds((prev) => [fallbackRound, ...prev]);
    setActiveRoundCodeState(fallbackRound.roundCode);
    return true;
  };

  const deleteLotteryRound = async (roundCode: string): Promise<boolean> => {
    setRounds((prev) => {
      const next = prev.filter((r) => r.roundCode !== roundCode);
      if (activeRoundCode === roundCode && next[0]) {
        setActiveRoundCodeState(next[0].roundCode);
      }
      return next;
    });
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/rounds/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rounds)) {
          setRounds(data.rounds);
        }
        return true;
      }
    } catch {
      // Already removed in local state
    }
    return true;
  };

  const deleteAllLotteryRounds = async (): Promise<boolean> => {
    setRounds([]);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/rounds/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ deleteAll: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rounds)) {
          setRounds(data.rounds);
        }
        return true;
      }
    } catch {
      // Already cleared in local state
    }
    return true;
  };

  const updateRoundTicketPrice = (
    roundCode: string,
    newPriceUsdt: number,
    durationMinutes?: number
  ) => {
    const safePrice = Math.max(0.1, Number(newPriceUsdt) || 5);
    setRounds((prev) =>
      prev.map((r) => {
        if (r.roundCode !== roundCode) return r;
        const nextDur =
          typeof durationMinutes === 'number' && durationMinutes > 0
            ? durationMinutes
            : r.durationMinutes;
        return {
          ...r,
          ticketPriceUsdt: safePrice.toFixed(2),
          durationMinutes: nextDur,
          drawTargetTimestampMs:
            typeof durationMinutes === 'number' && durationMinutes > 0
              ? Date.now() + durationMinutes * 60 * 1000
              : r.drawTargetTimestampMs,
        };
      })
    );
    getHeaders().then((headers) => {
      fetch('/api/admin/rounds/price', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode, ticketPriceUsdt: safePrice, durationMinutes }),
      }).catch(() => {});
    });
  };

  const toggleRoundSales = async (roundCode: string) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.roundCode === roundCode
          ? { ...r, status: r.status?.toUpperCase() === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : r
      )
    );
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/rounds/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rounds)) {
          setRounds(data.rounds);
          return;
        }
      }
      await refreshSnapshot();
    } catch (err) {
      console.error('Toggle round error:', err);
    }
  };

  const fetchMySupportMessages = useCallback(async (): Promise<SupportMessageItem[]> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/support/my-messages', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMySupportMessages(data.messages);
      }
      if (typeof data.unreadCount === 'number') {
        setUnreadSupportCount(data.unreadCount);
      }
      if (typeof data.supportTelegramUsername === 'string' && data.supportTelegramUsername.trim()) {
        setTelegramBotConfig((prev) =>
          prev.supportTelegramUsername === data.supportTelegramUsername.trim()
            ? prev
            : { ...prev, supportTelegramUsername: data.supportTelegramUsername.trim() }
        );
      }
      if (typeof data.officialBrandTitle === 'string' && data.officialBrandTitle.trim()) {
        setTelegramBotConfig((prev) =>
          prev.officialBrandTitle === data.officialBrandTitle.trim()
            ? prev
            : { ...prev, officialBrandTitle: data.officialBrandTitle.trim() }
        );
      }
      return Array.isArray(data.messages) ? data.messages : [];
    } catch {
      return [];
    }
  }, [getHeaders]);

  const sendUserSupportMessage = useCallback(
    async (params: {
      message: string;
      subject?: string;
      diagnosticType?: string | null;
      diagnosticMetadata?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const headers = await getHeaders();
        const res = await fetch('/api/support/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: params.message,
            subject: params.subject,
            diagnosticType: params.diagnosticType || null,
            diagnosticMetadata: params.diagnosticMetadata || '',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return {
            ok: false,
            error: data.error || 'خطا در ارسال پیام به پشتیبانی VIP.',
          };
        }
        if (Array.isArray(data.messages)) {
          setMySupportMessages(data.messages);
        }
        await refreshSnapshot();
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'خطا در ارتباط شبکه با سرور پشتیبانی.',
        };
      }
    },
    [getHeaders, refreshSnapshot]
  );

  const markSupportMessagesRead = useCallback(
    async (role: 'USER' | 'ADMIN' = 'USER', targetTelegramUserId?: string): Promise<void> => {
      try {
        const headers = await getHeaders();
        await fetch('/api/support/mark-read', {
          method: 'POST',
          headers,
          body: JSON.stringify({ role, targetTelegramUserId }),
        });
        if (role === 'USER') {
          setUnreadSupportCount(0);
          setMySupportMessages((prev) => prev.map((m) => ({ ...m, readByUser: true })));
        } else {
          await refreshSnapshot();
        }
      } catch {
        // ignore
      }
    },
    [getHeaders, refreshSnapshot]
  );

  const sendSupportMessage = async (
    sessionCode: string,
    message: string,
    senderRole: string = 'OPERATOR',
    senderName: string = 'اپراتور ارشد LuckyDrop',
    targetTelegramUserId?: string
  ) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/support/reply', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionCode,
          targetTelegramUserId,
          message,
          senderRole,
          senderName,
        }),
      });
      if (!res.ok) return false;
      await refreshSnapshot();
      return true;
    } catch {
      return false;
    }
  };

  const [officialWallets, setOfficialWallets] = useState<OfficialSiteWallets>(() => {
    try {
      const raw = localStorage.getItem('luckydrop_official_wallets_v1');
      if (raw) {
        return { ...DEFAULT_OFFICIAL_WALLETS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_OFFICIAL_WALLETS;
  });

  const updateOfficialWallets = (next: Partial<OfficialSiteWallets>) => {
    setOfficialWallets((prev) => {
      const updated = { ...prev, ...next };
      try {
        localStorage.setItem('luckydrop_official_wallets_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      syncOfficialWalletsToFirestore({
        TON: updated.TON,
        COLD_TREASURY: updated.COLD_TREASURY,
        autoWithdrawLimitTon,
        solvencyMode,
      });
      return updated;
    });
  };

  const setSolvencyMode = (mode: SolvencyProtectionMode) => {
    setSolvencyModeState(mode);
    syncOfficialWalletsToFirestore({
      TON: officialWallets.TON,
      COLD_TREASURY: officialWallets.COLD_TREASURY,
      autoWithdrawLimitTon,
      solvencyMode: mode,
    });
  };

  const connectWeb3Wallet = async (
    _providerType: Web3WalletProviderType,
    _manualAddressOverride?: string
  ): Promise<{ ok: boolean; address: string; message: string }> => {
    HapticEngine.impactOccurred('medium');
    try {
      await tonConnectUI.openModal();
    } catch (err: any) {
      return {
        ok: false,
        address: '',
        message: err?.message || 'خطا در باز کردن پنجره TON Connect',
      };
    }

    if (realTonAddress) {
      return {
        ok: true,
        address: realTonAddress,
        message: `✅ کیف پول TON با آدرس ${truncateTonAddress(realTonAddress)} متصل است.`,
      };
    }

    return {
      ok: false,
      address: '',
      message: '💎 پنجره رسمی TON Connect باز شد. لطفاً در کیف پول خود اتصال را تایید کنید.',
    };
  };

  const disconnectWeb3Wallet = () => {
    tonConnectUI.disconnect().catch(() => {});
    setConnectedWeb3Wallet('');
    setConnectedWalletProvider(null);
  };

  // Real @tonconnect/ui-react wallet state: strictly derived from useTonAddress() & useTonWallet()
  useEffect(() => {
    if (realTonAddress) {
      setConnectedWeb3Wallet(realTonAddress);
      const appName = realTonWallet?.device?.appName || 'TON Wallet';
      setConnectedWalletProvider(appName as Web3WalletProviderType);
      completeAndClaimTmaQuest('CONNECT_TON_WALLET');
    } else {
      setConnectedWeb3Wallet('');
      setConnectedWalletProvider(null);
    }
  }, [realTonAddress, realTonWallet]);

  const connectedTonWallet = realTonAddress
    ? {
        address: realTonAddress,
        provider: String(realTonWallet?.device?.appName || 'Tonkeeper'),
        truncated: truncateTonAddress(realTonAddress),
      }
    : null;

  const connectTonWalletOneTap = async (providerLabel?: string) => {
    HapticEngine.impactOccurred('medium');
    setTonConnectModalOpen(false);
    try {
      if (providerLabel) {
        const cleanProvider = providerLabel.toLowerCase().trim();
        const matchedSpec = TON_CONNECT_STANDARD_WALLETS.find(
          (w) =>
            w.name.toLowerCase() === cleanProvider ||
            w.id.toLowerCase() === cleanProvider ||
            w.appName.toLowerCase() === cleanProvider
        );
        if (matchedSpec && typeof tonConnectUI.openSingleWalletModal === 'function') {
          await tonConnectUI.openSingleWalletModal(matchedSpec.appName);
          return {
            ok: Boolean(realTonAddress),
            address: realTonAddress || '',
            message: '💎 پنجره اتصال کیف پول TON Connect باز شد. لطفاً در کیف پول خود تایید کنید.',
          };
        }
      }
      await tonConnectUI.openModal();
      return {
        ok: Boolean(realTonAddress),
        address: realTonAddress || '',
        message: '💎 پنجره رسمی TON Connect باز شد. لطفاً کیف پول خود را انتخاب و امضا کنید.',
      };
    } catch (err: any) {
      return {
        ok: false,
        address: '',
        message: err?.message || 'خطا در باز کردن پنجره TON Connect',
      };
    }
  };

  const disconnectTonWallet = () => {
    HapticEngine.impactOccurred('light');
    tonConnectUI.disconnect().catch(() => {});
    disconnectWeb3Wallet();
  };

  const connectTelegramAccount = (customHandle?: string): string => {
    const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    const rawHandle =
      customHandle?.trim() || (tgUser?.username ? `@${tgUser.username}` : `@user_${telegramUser.id}`);
    const formatted = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    setTelegramUsername(formatted);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_tg_username'),
        formatted
      );
    } catch {
      // ignore
    }
    return formatted;
  };

  const applyReferralCode = (code: string): { ok: boolean; message: string } => {
    const clean = (code || '').trim();
    if (clean.length < 4) {
      return { ok: false, message: 'کد معرف واردشده نامعتبر است.' };
    }
    const cleanInviter = clean.replace(/^ref_/i, '');
    if (
      clean.toUpperCase() === referralCode.toUpperCase() ||
      cleanInviter === String(telegramUser.id)
    ) {
      return {
        ok: false,
        message: '⛔ قفل ضدتقلب (Anti-Sybil): شما نمی‌توانید کد دعوت خودتان را ثبت کنید.',
      };
    }
    if (referredByCode && referredByCode.length >= 4) {
      return {
        ok: false,
        message: '⛔ قفل ضدتقلب (Anti-Sybil): کد معرف فقط یک‌بار هنگام ثبت‌نام قابل ثبت است.',
      };
    }

    setReferredByCode(clean);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_referred_by_v3'),
        clean
      );
    } catch {
      // ignore
    }

    // Bind on server with anti-Sybil verification
    getHeaders().then((headers) => {
      fetch('/api/referral/bind', {
        method: 'POST',
        headers,
        body: JSON.stringify({ startParam: clean }),
      }).catch(() => {});
    });

    return {
      ok: true,
      message: `✅ کد معرف ${clean} فعال شد! در هر خرید واقعی بلیت، ۲٪ پورسانت صرفاً از محل ۱۰٪ سود خالص لاتاری به معرف واریز می‌شود.`,
    };
  };

  const generateAndSaveReferralLink = async (
    customAlias?: string
  ): Promise<{ ok: boolean; referralCode: string; referralUrl: string; message: string }> => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://luckydrop.vip';
    const uidSeed =
      firebaseUser?.uid ||
      connectedWeb3Wallet ||
      String(telegramUser.id) ||
      `VIP-${Date.now().toString(36)}`;
    const bundle = generateUniqueUserReferralLink({
      uidOrIdentity: uidSeed,
      customAlias: customAlias || `ref_${telegramUser.id}`,
      originUrl: origin,
    });

    setReferralCodeState(bundle.referralCode);
    try {
      localStorage.setItem(
        getScopedStorageKey(telegramUser.id, 'luckydrop_my_referral_code_v3'),
        bundle.referralCode
      );
    } catch {
      // ignore
    }

    if (firebaseUser) {
      await syncReferralLinkToFirestore({
        referralCode: bundle.referralCode,
        ownerUid: firebaseUser.uid,
        ownerDisplayName: firebaseUser.displayName || displayName,
        referralUrl: bundle.referralUrl,
        commissionRatePercent: 2,
        totalReferredTickets: referredTicketsCount,
        totalCommissionEarnedTon: referralEarningsTon,
        totalCommissionEarnedStars: referralEarningsStars,
        netHouseProfitRetainedTon: Number((referralEarningsTon * 6.5).toFixed(4)),
      });
    }

    return {
      ok: true,
      referralCode: bundle.referralCode,
      referralUrl: bundle.referralUrl,
      message: `✅ لینک و کد یکتای زیرمجموعه‌گیری شما (${bundle.referralCode}) تولید شد!`,
    };
  };

  const claimReferralEarningsToWallet = async (): Promise<{
    ok: boolean;
    claimedUsdt: number;
    message: string;
  }> => {
    if (referralEarningsTon <= 0 && referralEarningsStars <= 0) {
      return {
        ok: false,
        claimedUsdt: 0,
        message: 'موجودی پورسانت زیرمجموعه‌گیری شما در حال حاضر ۰.۰۰ TON است.',
      };
    }
    const claimedTon = Number(referralEarningsTon.toFixed(4));
    const claimedUsdt = Number((claimedTon * effectiveTonUsdRate).toFixed(2));
    await pamBonus({
      transactionUuid: generateDeterministicUuid('tx_ref_claim'),
      roundId: referralCode,
      vertical: 'AFFILIATE_REFERRAL',
      amountUsdt: claimedUsdt,
      creditToRealBalance: true,
      note: `انتقال پورسانت زیرمجموعه‌گیری (${referralCode} • ${claimedTon} TON) به کیف پول PAM`,
    });
    setReferralEarningsTon(0);
    setReferralEarningsStars(0);

    return {
      ok: true,
      claimedUsdt,
      message: `💸 مبلغ ${claimedTon.toFixed(2)} TON پورسانت زیرمجموعه‌گیری در دفترکل PAM ثبت و به موجودی کیف پول شما اضافه شد!`,
    };
  };

  const simulateReferredTicketPurchase = async (
    ticketGrossUsdt: number = 25
  ): Promise<{
    ok: boolean;
    commissionUsdt: number;
    netHouseProfitUsdt: number;
    message: string;
  }> => {
    const ledger = calculateReferralDeductionFromNetProfit({
      ticketGrossUsdt,
      hasValidReferrer: true,
      commissionRateFromSalesPercent: 2,
    });

    const commTon = Number((ledger.commissionDeductedFromProfit2Usdt / effectiveTonUsdRate).toFixed(4));
    const nextEarningsTon = Number((referralEarningsTon + commTon).toFixed(4));
    const nextTickets = referredTicketsCount + Math.max(1, Math.round(ticketGrossUsdt / 5));
    setReferralEarningsTon(nextEarningsTon);
    setReferredTicketsCount(nextTickets);

    const eventItem: ReferralEventItem = {
      id: Date.now(),
      referrerCode: referralCode,
      buyerDisplayName: 'کاربر دعوت‌شده VIP (Referral Link)',
      roundCode: activeLotterySpec.roundCode,
      ticketAmountUsdt: ledger.ticketGrossUsdt,
      prizePool85Usdt: ledger.prizePool85Usdt,
      grossLotteryProfit10Usdt: ledger.grossLotteryProfit10Usdt,
      referralCommission2Usdt: ledger.commissionDeductedFromProfit2Usdt,
      commissionUsdt: ledger.commissionDeductedFromProfit2Usdt,
      netHouseProfit8Usdt: ledger.netHouseProfitRetained8Usdt,
      netHouseProfitUsdt: ledger.netHouseProfitRetained8Usdt,
      createdAt: 'همین الان (Firestore Synced)',
    };
    setReferralEvents((prev) => [eventItem, ...prev]);

    if (firebaseUser) {
      const effectiveTonRate = tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE;
      await recordReferralCommissionInFirestore({
        commissionId: `COM_${Date.now()}`,
        referrerCode: referralCode,
        buyerUid: firebaseUser.uid,
        buyerDisplayName: eventItem.buyerDisplayName,
        roundCode: activeLotterySpec.roundCode,
        currency: activeTmaCurrency,
        ticketGrossTon: Number((ledger.ticketGrossUsdt / effectiveTonRate).toFixed(4)),
        prizePool85Ton: Number((ledger.prizePool85Usdt / effectiveTonRate).toFixed(4)),
        siteShare15Ton: Number(((ledger.ticketGrossUsdt * 0.15) / effectiveTonRate).toFixed(4)),
        commissionDeductedTon: Number((ledger.commissionDeductedFromProfit2Usdt / effectiveTonRate).toFixed(4)),
        netHouseProfitRetainedTon: Number((ledger.netHouseProfitRetained8Usdt / effectiveTonRate).toFixed(4)),
      });
    }

    return {
      ok: true,
      commissionUsdt: ledger.commissionDeductedFromProfit2Usdt,
      netHouseProfitUsdt: ledger.netHouseProfitRetained8Usdt,
      message: `✅ خرید ${formatActiveTmaAmount(ledger.ticketGrossUsdt)} بلیت توسط زیرمجموعه ثبت شد! پورسانت ۲٪ معادل ${formatActiveTmaAmount(
        ledger.commissionDeductedFromProfit2Usdt
      )} به شما اختصاص یافت و ۸٪ سود خالص قطعی سایت باقی ماند.`,
    };
  };

  const openLoyaltyChest = async (): Promise<{
    ok: boolean;
    rewardUsdt?: number;
    rewardTierLabelFa?: string;
    message: string;
  }> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/loyalty/open-chest', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          message: data.error || 'صندوقچه وفاداری فعلاً در دسترس نیست.',
        };
      }
      await refreshSnapshot();
      return {
        ok: true,
        rewardUsdt: data.rewardUsdt,
        rewardTierLabelFa: data.rewardTierLabelFa,
        message: `🎁 تبریک! ${data.rewardTierLabelFa} باز شد و مبلغ ${formatActiveTmaAmount(
          Number(data.rewardUsdt)
        )} از محل ۳٪ ذخیره سرریز به کیف پول PAM شما واریز گردید!`,
      };
    } catch {
      return {
        ok: false,
        message: 'خطا در ارتباط با سرور صندوقچه وفاداری.',
      };
    }
  };

  const updateTelegramBotConfig = async (next: TelegramBotAlertConfig): Promise<boolean> => {
    setTelegramBotConfig(next);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/telegram/config', {
        method: 'POST',
        headers,
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.telegramBotConfig) {
          setTelegramBotConfig(data.telegramBotConfig);
        }
        if (Array.isArray(data.telegramAlertsLog)) {
          setTelegramAlertsLog(data.telegramAlertsLog);
        }
        return true;
      }
    } catch {
      // ignore
    }
    return true;
  };

  const sendTestTelegramAlert = async (): Promise<{ ok: boolean; message: string; note: string }> => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (Array.isArray(data.telegramAlertsLog)) {
        setTelegramAlertsLog(data.telegramAlertsLog);
      }
      const rawDesc = String(data.apiDescription || '');
      const msg = data.deliveredToTelegramApi
        ? rawDesc.includes('پیام به پیوی ادمین ارسال شد')
          ? `✅ ${rawDesc}`
          : `✅ پیام هشدار با موفقیت به تلگرام (${rawDesc}) ارسال شد!`
        : rawDesc.includes('پیام به پیوی ادمین ارسال شد')
        ? `ℹ️ ${rawDesc}`
        : `⚠️ نتیجه اتصال به API تلگرام: ${rawDesc || 'لطفاً Bot Token و آیدی چنل (@ChannelName یا -100...) را بررسی کرده و ربات را در کانال Admin کنید.'}`;
      return {
        ok: Boolean(data.deliveredToTelegramApi),
        message: msg,
        note: msg,
      };
    } catch {
      const errMsg = 'خطا در ارسال پیام تست تلگرام.';
      return {
        ok: false,
        message: errMsg,
        note: errMsg,
      };
    }
  };

  return (
    <LotteryContext.Provider
      value={{
        activeRoute,
        navigateTo,
        stealthCookieAuthorized,
        setStealthCookieAuthorized,
        lang,
        setLang,
        fxRates,
        oracleSnapshot,
        oracleCountdownSec,
        oracleMarkupPercent,
        setOracleMarkupPercent,
        refreshPriceOracleNow,
        liveTonUsdPrice,
        tonChange24hPercent,
        liveStarsUsdPrice,
        liveStarsPerTon,
        portfolioUsdValue,
        formatAmount,
        formatCurrency,
        firebaseUser,
        signInWithGoogle,
        signOutUser,
        connectedWeb3Wallet,
        connectedWalletProvider,
        connectWeb3Wallet,
        disconnectWeb3Wallet,
        connectedTonWallet,
        connectTonWalletOneTap,
        disconnectTonWallet,
        tonConnectModalOpen,
        setTonConnectModalOpen,
        telegramUsername,
        connectTelegramAccount,
        balanceUsdt,
        bonusTokensUsdt,
        pamState,
        pamLedger: pamState.ledger,
        pamReconciliation,
        provablyFairSeeds: pamState.seeds,
        walletDrawerOpen,
        setWalletDrawerOpen,
        pamAuthenticate,
        pamFetchBalance,
        pamDebit,
        pamCredit,
        pamRollback,
        pamBonus,
        pamReconcile,
        updateProvablyFairClientSeed,
        rotateProvablyFairServerSeed,
        playInstantMiniGame,
        startGameSession,
        revealGameSessionStep,
        cashoutGameSession,
        activeTmaCurrency,
        setActiveTmaCurrency,
        tonBalance,
        starsBalance,
        tonUsdRate,
        setTonUsdRate,
        starsUsdRate,
        setStarsUsdRate,
        formatActiveTmaAmount,
        telegramUser,
        adminTelegramUserIds,
        setAdminTelegramUserIds,
        adminTonWalletAddress,
        setAdminTonWalletAddress,
        isTelegramAdmin,
        splashState,
        retryHandshake: executeRealHandshake,
        freePlinkoDrops,
        freeScratchCards,
        freeLotteryTickets,
        tmaXpPoints,
        tmaQuests,
        completeAndClaimTmaQuest,
        consumeFreePlinkoDrop,
        consumeFreeScratchCard,
        depositTonInstant,
        depositTelegramStarsInstant,
        withdrawTonOrStars,
        vipTier,
        displayName,
        rounds,
        tickets,
        drawHistory,
        transactions,
        supportMessages,
        mySupportMessages,
        unreadSupportCount,
        supportTelegramUsername,
        officialBrandTitle,
        fetchMySupportMessages,
        sendUserSupportMessage,
        markSupportMessagesRead,
        deposits,
        withdrawals,
        claimedTicketCodes,
        killSwitchActive,
        depositModalOpen,
        setDepositModalOpen,
        withdrawModalOpen,
        setWithdrawModalOpen,
        aiChatOpen,
        setAiChatOpen,
        activeLotteryId,
        setActiveLotteryId,
        activeRoundCode,
        setActiveRoundCode,
        activeRound,
        activeLotterySpec,
        lotteryTimers,
        autoWithdrawLimitTon,
        setAutoWithdrawLimitTon,
        selectedMainBalls,
        setSelectedMainBalls,
        selectedGoldenBall,
        setSelectedGoldenBall,
        bulkSlips,
        setBulkSlips,
        activeSlipIndex,
        setActiveSlipIndex,
        setBulkTicketCount,
        triggerBulkAiQuickPick,
        activeTrackingTicket,
        setActiveTrackingTicket,
        refreshSnapshot,
        mintTicket,
        mintBulkTickets,
        claimTicketPrize,
        depositCrypto,
        submitDepositRequest,
        adminActionDeposit,
        requestWithdrawal,
        adminActionWithdrawal,
        toggleKillSwitch,
        setKillSwitchState,
        triggerDraw,
        createNewRound,
        deleteLotteryRound,
        deleteAllLotteryRounds,
        updateRoundTicketPrice,
        toggleRoundSales,
        sendSupportMessage,
        officialWallets,
        updateOfficialWallets,
        solvencyMode,
        setSolvencyMode,
        referralCode,
        referredByCode,
        applyReferralCode,
        generateAndSaveReferralLink,
        claimReferralEarningsToWallet,
        simulateReferredTicketPurchase,
        referralEarningsTon,
        referralEarningsStars,
        referredTicketsCount,
        referralEvents,
        rolloverReservePoolUsdt,
        chestsClaimedCount,
        openLoyaltyChest,
        telegramBotConfig,
        telegramAlertsLog,
        updateTelegramBotConfig,
        sendTestTelegramAlert,
        viralCardTicket,
        setViralCardTicket,
        firestoreConnected,
        supabaseConnected: isSupabaseConfigured,
      }}
    >
      {children}
    </LotteryContext.Provider>
  );
};

export const useLottery = () => {
  const ctx = useContext(LotteryContext);
  if (!ctx) throw new Error('useLottery must be used within LotteryProvider');
  return ctx;
};
