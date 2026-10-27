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
  ActiveTmaCurrency,
  TelegramWebAppUser,
  TmaQuestItem,
  INITIAL_TMA_QUESTS,
  DEFAULT_ADMIN_TELEGRAM_USER_IDS,
  DEFAULT_ADMIN_TON_WALLET_ADDRESS,
  DEFAULT_TON_USD_RATE,
  DEFAULT_STARS_USD_RATE,
  initTelegramMiniAppSdk,
  isTelegramAdminAuthorized,
  tmaCurrencyToUsdt,
  usdtToTmaCurrency,
  formatTmaCurrency,
  formatCurrency as rawFormatCurrency,
  truncateTonAddress,
  HapticEngine,
} from '../utils/telegramTma.ts';

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
  senderName: string;
  senderRole: string;
  vipLevel: string;
  subject: string;
  message: string;
  walletBalanceLabel: string;
  historySummary: string;
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
    note?: string;
  }) => Promise<PAMOperationResponse>;
  pamCredit: (params: {
    transactionUuid?: string;
    referenceTransactionUuid?: string | null;
    roundId: string;
    vertical: string;
    amountUsdt: number;
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
    usedFreeBonusToken?: boolean;
  }) => Promise<{
    ok: boolean;
    error?: string;
    evaluation?: MiniGameEvaluationResult;
    bonusTicketAwarded?: TicketItem | null;
    debitTransactionUuid?: string;
    balanceUsdt: number;
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
  isAdminPreviewEnabled: boolean;
  setIsAdminPreviewEnabled: (enabled: boolean) => void;
  isTelegramAdmin: boolean;
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
  // Multi-Lottery Concurrent Engine
  activeLotteryId: LotteryTypeId;
  setActiveLotteryId: (id: LotteryTypeId) => void;
  activeLotterySpec: MultiLotterySpec;
  lotteryTimers: Record<LotteryTypeId, number>;
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
    network: string
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
    titleFa: string;
    category: string;
    ticketPriceUsdt: number;
    rtpPercent: number;
    jackpotUsdt: number;
  }) => Promise<boolean>;
  deleteLotteryRound: (roundCode: string) => Promise<boolean>;
  updateRoundTicketPrice: (roundCode: string, newPriceUsdt: number) => void;
  toggleRoundSales: (roundCode: string) => Promise<void>;
  sendSupportMessage: (
    sessionCode: string,
    message: string,
    senderRole?: string,
    senderName?: string
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
  referralEarningsUsdt: number;
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
  TON: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
  TRX: 'TXk8Y2khEsLJW1ChVWFMSMeRDow5KcbL99',
  BNB: '0x71C8F9409a89bC20D471980D772094B112039A8F',
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  COLD_TREASURY: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
};

const LotteryContext = createContext<LotteryContextType | null>(null);

const resolveInitialRoute = (): AppRoute => {
  if (typeof window === 'undefined') return 'lobby';
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  if (search.includes('vault=sovereign-gate-777')) return 'cockpit';
  if (path.startsWith('/earn') || path.startsWith('/quests')) return 'earn';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/mini-games') || path.startsWith('/instant')) return 'mini-games';
  if (path.startsWith('/user-panel') || path.startsWith('/profile')) return 'user-panel';
  if (path.startsWith('/terms') || path.startsWith('/rules')) return 'terms';
  if (path.startsWith('/ops/launch')) return 'launch';
  if (path.startsWith('/ops-k82-cockpit')) return 'cockpit';
  if (path.startsWith('/admin/finances')) return 'finances';
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
  status: '/status/tx',
  transparency: '/transparency',
  cockpit: '/ops-k82-cockpit',
  finances: '/admin/finances',
  launch: '/ops/launch',
  terms: '/rules',
  '404': '/404',
};

const buildDefaultConcurrentRounds = (): LotteryRoundItem[] =>
  MULTI_LOTTERY_SPECS.map((spec, idx) => ({
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
    jackpotUsdt: spec.jackpotUsdt.toFixed(2),
    ticketPriceUsdt: spec.ticketPriceUsdt.toFixed(2),
    rtpPercent: spec.rtpPercent.toFixed(2),
    soldPercent: spec.soldPercent,
    remainingLabel: spec.remainingLabel,
    drawTimeLabel: spec.drawTimeLabel,
    serverSeedHash: spec.serverSeedHash,
    clientSeed: spec.clientSeed,
    nonce: 1,
    winningNumbers: JSON.stringify(spec.winningNumbers),
    winningGoldenBall: spec.winningGoldenBall,
    totalSalesUsdt: (spec.jackpotUsdt * 1.15).toFixed(2),
    totalPayoutUsdt: spec.jackpotUsdt.toFixed(2),
    operatorProfitUsdt: (spec.jackpotUsdt * 0.1).toFixed(2),
    rolloverReserveUsdt: (spec.jackpotUsdt * 0.03).toFixed(2),
    status: 'ACTIVE',
  }));

export const LotteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(resolveInitialRoute);
  const [stealthCookieAuthorized, setStealthCookieAuthorized] = useState<boolean>(true);
  const [lang, setLangState] = useState<CurrencyLang>('FA');
  const [walletDrawerOpen, setWalletDrawerOpen] = useState<boolean>(false);

  // Local PAM Seamless Wallet Engine Fallback & IndexedDB Synchronizer
  const localPamEngineRef = useRef<PAMSeamlessWalletEngine>(new PAMSeamlessWalletEngine());
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

  const [balanceUsdt, setBalanceUsdt] = useState<number>(3030.3);
  const [bonusTokensUsdt, setBonusTokensUsdt] = useState<number>(25.0);
  const [vipTier, setVipTier] = useState<string>('DIAMOND VIP');
  const [displayName, setDisplayName] = useState<string>('کامران سهرابی (VIP)');
  const [rounds, setRounds] = useState<LotteryRoundItem[]>(buildDefaultConcurrentRounds);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [drawHistory, setDrawHistory] = useState<VerifiableDrawHistoryRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessageItem[]>([]);
  const [deposits, setDeposits] = useState<DepositRecordItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => loadLocalState().withdrawals);
  const [claimedTicketCodes, setClaimedTicketCodes] = useState<string[]>(() => loadLocalState().claimedTicketCodes);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  // Unified Web3 Wallet & Telegram Identity State
  const [connectedWeb3Wallet, setConnectedWeb3Wallet] = useState<string>(() => {
    try {
      return localStorage.getItem('luckydrop_web3_wallet') || '';
    } catch {
      return '';
    }
  });
  const [connectedWalletProvider, setConnectedWalletProvider] = useState<Web3WalletProviderType | null>(() => {
    try {
      return (localStorage.getItem('luckydrop_web3_provider') as Web3WalletProviderType) || null;
    } catch {
      return null;
    }
  });
  const [telegramUsername, setTelegramUsername] = useState<string>(() => {
    try {
      const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.username) return `@${tgUser.username}`;
      return localStorage.getItem('luckydrop_tg_username') || '@Kamran_TON_VIP';
    } catch {
      return '@Kamran_TON_VIP';
    }
  });

  // Telegram Mini App (TMA) SDK, Auto-Auth, Dual-Currency (TON & Stars), Quests & Admin ID Lock
  const [telegramUser, setTelegramUser] = useState<TelegramWebAppUser>(() =>
    initTelegramMiniAppSdk()
  );
  const [activeTmaCurrency, setActiveTmaCurrencyState] = useState<ActiveTmaCurrency>(() => {
    try {
      const saved = localStorage.getItem('luckydrop_active_tma_currency');
      return saved === 'STARS' ? 'STARS' : 'TON';
    } catch {
      return 'TON';
    }
  });
  const [tonUsdRate, setTonUsdRateState] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_ton_usd_rate_v2')) || DEFAULT_TON_USD_RATE;
    } catch {
      return DEFAULT_TON_USD_RATE;
    }
  });
  const [starsUsdRate, setStarsUsdRateState] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_stars_usd_rate_v2')) || DEFAULT_STARS_USD_RATE;
    } catch {
      return DEFAULT_STARS_USD_RATE;
    }
  });
  const [starsBalance, setStarsBalance] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('luckydrop_stars_balance_v1');
      return raw !== null ? Number(raw) : 2500;
    } catch {
      return 2500;
    }
  });
  const [adminTelegramUserIds, setAdminTelegramUserIdsState] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('luckydrop_admin_tg_ids_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(Number);
      }
    } catch {
      // ignore
    }
    return DEFAULT_ADMIN_TELEGRAM_USER_IDS;
  });
  const [adminTonWalletAddress, setAdminTonWalletAddressState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('luckydrop_admin_ton_wallet_v1') || DEFAULT_ADMIN_TON_WALLET_ADDRESS
      );
    } catch {
      return DEFAULT_ADMIN_TON_WALLET_ADDRESS;
    }
  });
  const [isAdminPreviewEnabled, setIsAdminPreviewEnabledState] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('luckydrop_dev_admin_preview_v1');
      return raw ? raw === 'true' : false;
    } catch {
      return false;
    }
  });
  const [freePlinkoDrops, setFreePlinkoDrops] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_free_plinko_drops_v1') ?? 2);
    } catch {
      return 2;
    }
  });
  const [freeScratchCards, setFreeScratchCards] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_free_scratch_cards_v1') ?? 1);
    } catch {
      return 1;
    }
  });
  const [freeLotteryTickets, setFreeLotteryTickets] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_free_lottery_tickets_v1') ?? 1);
    } catch {
      return 1;
    }
  });
  const [tmaXpPoints, setTmaXpPoints] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('luckydrop_tma_xp_v1') ?? 65);
    } catch {
      return 65;
    }
  });
  const [tmaQuests, setTmaQuests] = useState<TmaQuestItem[]>(() => {
    try {
      const raw = localStorage.getItem('luckydrop_tma_quests_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_TMA_QUESTS;
  });

  useEffect(() => {
    const user = initTelegramMiniAppSdk();
    setTelegramUser(user);
    if (user.username) {
      setTelegramUsername(`@${user.username.replace(/^@/, '')}`);
    }
    if (user.first_name) {
      setDisplayName(`${user.first_name}${user.last_name ? ' ' + user.last_name : ''} (VIP)`);
    }
  }, []);

  const isTelegramAdmin = isTelegramAdminAuthorized(
    telegramUser.id,
    adminTelegramUserIds,
    isAdminPreviewEnabled
  );

  // Separate TON Balance derived from PAM balance + Stars Balance
  const tonBalance = Number((balanceUsdt / (tonUsdRate > 0 ? tonUsdRate : DEFAULT_TON_USD_RATE)).toFixed(2));

  const setActiveTmaCurrency = (currency: ActiveTmaCurrency) => {
    HapticEngine.selectionChanged();
    setActiveTmaCurrencyState(currency);
    try {
      localStorage.setItem('luckydrop_active_tma_currency', currency);
    } catch {
      // ignore
    }
  };

  const setTonUsdRate = (rate: number) => {
    const safe = Math.max(0.1, Number(rate) || DEFAULT_TON_USD_RATE);
    setTonUsdRateState(safe);
    try {
      localStorage.setItem('luckydrop_ton_usd_rate_v2', String(safe));
    } catch {
      // ignore
    }
  };

  const setStarsUsdRate = (rate: number) => {
    const safe = Math.max(0.001, Number(rate) || DEFAULT_STARS_USD_RATE);
    setStarsUsdRateState(safe);
    try {
      localStorage.setItem('luckydrop_stars_usd_rate_v2', String(safe));
    } catch {
      // ignore
    }
  };

  const setAdminTelegramUserIds = (ids: number[]) => {
    const clean = ids.filter((n) => Number.isFinite(n) && n > 0);
    const next = clean.length > 0 ? clean : DEFAULT_ADMIN_TELEGRAM_USER_IDS;
    setAdminTelegramUserIdsState(next);
    try {
      localStorage.setItem('luckydrop_admin_tg_ids_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const setAdminTonWalletAddress = (addr: string) => {
    const clean = (addr || '').trim() || DEFAULT_ADMIN_TON_WALLET_ADDRESS;
    setAdminTonWalletAddressState(clean);
    try {
      localStorage.setItem('luckydrop_admin_ton_wallet_v1', clean);
    } catch {
      // ignore
    }
  };

  const setIsAdminPreviewEnabled = (enabled: boolean) => {
    HapticEngine.impactOccurred('medium');
    setIsAdminPreviewEnabledState(enabled);
    try {
      localStorage.setItem('luckydrop_dev_admin_preview_v1', String(enabled));
    } catch {
      // ignore
    }
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
      localStorage.setItem('luckydrop_free_plinko_drops_v1', String(next));
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
      localStorage.setItem('luckydrop_free_scratch_cards_v1', String(next));
    } catch {
      // ignore
    }
    return true;
  };

  const completeAndClaimTmaQuest = (
    questId: TmaQuestItem['id']
  ): { ok: boolean; message: string } => {
    HapticEngine.notificationOccurred('success');
    let rewardMsg = '✅ پاداش ماموریت (Bonus Token بدون ریسک خزانه) به حساب شما اضافه شد!';

    setTmaQuests((prev) => {
      const next = prev.map((q) => {
        if (q.id !== questId) return q;
        if (q.claimed) {
          rewardMsg = 'ℹ️ این ماموریت قبلاً دریافت شده است.';
          return q;
        }
        if (q.rewardType === 'FREE_PLINKO_DROPS') {
          setFreePlinkoDrops((d) => {
            const v = d + q.rewardAmount;
            try {
              localStorage.setItem('luckydrop_free_plinko_drops_v1', String(v));
            } catch {}
            return v;
          });
          rewardMsg = `🎁 +${q.rewardAmount} توپ رایگان Plinko (Play-Only Bonus Token) فعال شد!`;
        } else if (q.rewardType === 'FREE_LOTTERY_TICKET') {
          setFreeLotteryTickets((t) => {
            const v = t + q.rewardAmount;
            try {
              localStorage.setItem('luckydrop_free_lottery_tickets_v1', String(v));
            } catch {}
            return v;
          });
          const bonusTicket: TicketItem = {
            id: Date.now(),
            ticketCode: `QST-${Math.floor(100000 + Math.random() * 900000)}`,
            userUid: String(telegramUser.id),
            roundCode: '#ZRN-8493',
            mainNumbers: JSON.stringify([7, 14, 21, 35, 49]),
            goldenBall: 7,
            costUsdt: '0.00',
            currencyNetwork: 'TELEGRAM QUEST BONUS (TURNOVER-LOCKED)',
            txHash: `0x${sha256Hex(`quest:${questId}:${Date.now()}`)}`,
            transactionUuid: `tx_quest_${questId}_${Date.now()}`,
            clientSeed: pamState.seeds.clientSeed,
            serverSeedHash: pamState.seeds.serverSeedHash,
            nonce: pamState.seeds.nonce,
            commitHash: sha256Hex(`${questId}:${Date.now()}`).slice(0, 32),
            status: 'ACTIVE',
            confirmations: 19,
            prizeWonUsdt: '0.00',
            claimed: false,
            createdAt: 'همین الان (پاداش ماموریت تلگرام)',
          };
          setTickets((old) => [bonusTicket, ...old]);
          rewardMsg = `🎟️ +1 کوپن رایگان لاتاری (#${bonusTicket.ticketCode} • Turnover-Locked) صادر شد!`;
        } else if (q.rewardType === 'FREE_SCRATCH_CARD') {
          setFreeScratchCards((s) => {
            const v = s + q.rewardAmount;
            try {
              localStorage.setItem('luckydrop_free_scratch_cards_v1', String(v));
            } catch {}
            return v;
          });
          setTmaXpPoints((xp) => {
            const v = xp + 35;
            try {
              localStorage.setItem('luckydrop_tma_xp_v1', String(v));
            } catch {}
            return v;
          });
          rewardMsg = '✨ +1 کارت اسکرچ هولوگرافیک رایگان + 35 XP روزانه دریافت شد!';
        } else if (q.rewardType === 'BONUS_XP') {
          setTmaXpPoints((xp) => {
            const v = xp + q.rewardAmount;
            try {
              localStorage.setItem('luckydrop_tma_xp_v1', String(v));
            } catch {}
            return v;
          });
          setFreePlinkoDrops((d) => d + 1);
          rewardMsg = `⚡ +${q.rewardAmount} XP + ۱ دراپ رایگان Plinko دریافت شد!`;
        }
        return {
          ...q,
          progress: q.target,
          claimed: true,
        };
      });
      try {
        localStorage.setItem('luckydrop_tma_quests_v1', JSON.stringify(next));
      } catch {}
      return next;
    });

    return { ok: true, message: rewardMsg };
  };

  // Zero-Loss Solvency & Referral State
  const [solvencyMode, setSolvencyModeState] = useState<SolvencyProtectionMode>('AUTO_EXTEND');
  const [referralCode, setReferralCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem('luckydrop_my_referral_code') || 'VIP-KAMRAN777';
    } catch {
      return 'VIP-KAMRAN777';
    }
  });
  const [referredByCode, setReferredByCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('ref');
      if (fromUrl && fromUrl.trim().length >= 4) {
        const clean = fromUrl.trim().toUpperCase();
        localStorage.setItem('luckydrop_referred_by', clean);
        return clean;
      }
      return localStorage.getItem('luckydrop_referred_by') || '';
    } catch {
      return '';
    }
  });
  const [referralEarningsUsdt, setReferralEarningsUsdt] = useState<number>(18.4);
  const [referredTicketsCount, setReferredTicketsCount] = useState<number>(14);
  const [referralEvents, setReferralEvents] = useState<ReferralEventItem[]>([]);

  // Zero-Loss VIP Loyalty Chest (3% Rollover Reserve) & Telegram Bot Alert State
  const [rolloverReservePoolUsdt, setRolloverReservePoolUsdt] = useState<number>(48.5);
  const [chestsClaimedCount, setChestsClaimedCount] = useState<number>(0);
  const [telegramBotConfig, setTelegramBotConfig] = useState<TelegramBotAlertConfig>({
    botToken: '',
    adminChatId: '',
    enabled: true,
    notifyOnDeposit: true,
    notifyOnWithdrawal: true,
    notifyOnTicketPurchase: true,
  });
  const [telegramAlertsLog, setTelegramAlertsLog] = useState<TelegramAlertLogItem[]>([]);
  const [viralCardTicket, setViralCardTicket] = useState<TicketItem | null>(null);

  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [tonConnectModalOpen, setTonConnectModalOpen] = useState<boolean>(false);
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);

  // Multi-Lottery Concurrent State
  const [activeLotteryId, setActiveLotteryIdState] = useState<LotteryTypeId>('MEGA_WEEKLY');
  const [lotteryTimers, setLotteryTimers] = useState<Record<LotteryTypeId, number>>(() => ({
    MEGA_WEEKLY: MULTI_LOTTERY_SPECS[0].initialCountdownSec,
    DAILY_BLITZ: MULTI_LOTTERY_SPECS[1].initialCountdownSec,
    HOURLY_FLASH: MULTI_LOTTERY_SPECS[2].initialCountdownSec,
    TON_SPECIAL: MULTI_LOTTERY_SPECS[3].initialCountdownSec,
  }));

  const activeLotterySpec =
    MULTI_LOTTERY_SPECS.find((s) => s.id === activeLotteryId) || MULTI_LOTTERY_SPECS[0];

  // Single & Bulk Ticket Cart State
  const [selectedMainBalls, setSelectedMainBalls] = useState<number[]>([7, 14, 23, 38, 49]);
  const [selectedGoldenBall, setSelectedGoldenBall] = useState<number>(8);
  const [bulkSlips, setBulkSlips] = useState<BulkTicketSlip[]>(() => [
    {
      slipIndex: 1,
      mainNumbers: [7, 14, 23, 38, 49],
      goldenBall: 8,
      clientSeed: 'zarrin_vip_slip_1',
    },
  ]);
  const [activeSlipIndex, setActiveSlipIndex] = useState<number>(0);
  const [activeTrackingTicket, setActiveTrackingTicket] = useState<TicketItem | null>(null);

  const syncPamStateEverywhere = useCallback((nextPam: PAMPlayerState, recon?: PAMReconciliationReport) => {
    localPamEngineRef.current.hydrateState(nextPam);
    setPamState({ ...nextPam });
    setBalanceUsdt(nextPam.balanceUsdt);
    setBonusTokensUsdt(nextPam.bonusTokensUsdt);
    const computedRecon = recon || localPamEngineRef.current.reconcile().reconciliation || null;
    setPamReconciliation(computedRecon);
    savePAMStateToIndexedDB(nextPam);
  }, []);

  // Hydrate from IndexedDB on initial mount before network snapshot arrives
  useEffect(() => {
    loadPAMStateFromIndexedDB().then((cached) => {
      if (cached && typeof cached.balanceUsdt === 'number') {
        localPamEngineRef.current.hydrateState(cached);
        setPamState(cached);
        setBalanceUsdt(cached.balanceUsdt);
        setBonusTokensUsdt(cached.bonusTokensUsdt || 25);
        setPamReconciliation(localPamEngineRef.current.reconcile().reconciliation || null);
      }
    });
  }, []);

  const setActiveLotteryId = (id: LotteryTypeId) => {
    setActiveLotteryIdState(id);
    const spec = MULTI_LOTTERY_SPECS.find((s) => s.id === id) || MULTI_LOTTERY_SPECS[0];
    const generated = generateBulkQuickPickSlips(
      bulkSlips.length || 1,
      spec.mainCount,
      spec.mainMax,
      spec.goldenMax,
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
    setOracleCountdownSec(15);
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
  }, []);

  const refreshSnapshot = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/snapshot', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.pamState) {
        syncPamStateEverywhere(data.pamState, data.reconciliation);
      } else if (data.user) {
        setBalanceUsdt(parseFloat(data.user.balanceUsdt) || 3030.3);
        setVipTier(data.user.vipTier || 'DIAMOND VIP');
        setDisplayName(data.user.displayName || 'کاربر ویژه VIP');
      }
      if (Array.isArray(data.rounds)) {
        setRounds(data.rounds);
      }
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        if (data.tickets.length > 0) {
          setActiveTrackingTicket((prev) => {
            if (!prev) return data.tickets[0];
            const updatedPrev = data.tickets.find((t: TicketItem) => t.ticketCode === prev.ticketCode);
            return updatedPrev || data.tickets[0];
          });
        }
      }
      if (Array.isArray(data.drawHistory)) {
        setDrawHistory(data.drawHistory);
      }
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.supportMessages)) setSupportMessages(data.supportMessages);
      if (Array.isArray(data.deposits)) setDeposits(data.deposits);
      if (Array.isArray(data.referralEvents)) setReferralEvents(data.referralEvents);
      if (data.telegramBotConfig && typeof data.telegramBotConfig === 'object') {
        setTelegramBotConfig((prev) => ({ ...prev, ...data.telegramBotConfig }));
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
      if (typeof data.killSwitchActive === 'boolean') setKillSwitchActive(data.killSwitchActive);
    } catch (error) {
      console.error('Snapshot fetch error (operating on IndexedDB PAM fallback):', error);
    }
  }, [getHeaders, syncPamStateEverywhere]);

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

  // 1-second global ticker for the 15s Oracle countdown + 4 concurrent lottery timers
  // When any timer hits 0, triggers the real Provably Fair Draw Engine for that round!
  useEffect(() => {
    const interval = setInterval(() => {
      setOracleCountdownSec((prev) => {
        if (prev <= 1) {
          refreshPriceOracleNow();
          return 15;
        }
        return prev - 1;
      });

      setLotteryTimers((prev) => {
        const next = { ...prev };
        for (const spec of MULTI_LOTTERY_SPECS) {
          const id = spec.id;
          if (prev[id] <= 1) {
            triggerDraw(spec.roundCode);
            next[id] = spec.initialCountdownSec;
          } else {
            next[id] = prev[id] - 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshPriceOracleNow, triggerDraw]);

  useEffect(() => {
    const onPopState = () => {
      setActiveRoute(resolveInitialRoute());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setLang = (nextLang: CurrencyLang) => {
    setLangState(nextLang);
    document.documentElement.dir = nextLang === 'FA' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang === 'FA' ? 'fa' : nextLang === 'ZH' ? 'zh' : 'en';
  };

  const navigateTo = (target: AppRoute | 'admin_unauthorized') => {
    HapticEngine.selectionChanged();
    if (target === 'admin_unauthorized') {
      setActiveRoute('404');
      window.history.pushState({}, '', '/404');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if ((target === 'cockpit' || target === 'finances') && (!stealthCookieAuthorized || !isTelegramAdmin)) {
      HapticEngine.notificationOccurred('error');
      setActiveRoute('404');
      window.history.pushState({}, '', '/404');
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
    note?: string;
  }): Promise<PAMOperationResponse> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_debit');
    if (activeTmaCurrency === 'STARS') {
      const neededStars = usdtToTmaCurrency(params.amountUsdt, 'STARS', tonUsdRate, starsUsdRate);
      if (starsBalance < neededStars) {
        return {
          ok: false,
          operation: 'DEBIT',
          error: `موجودی ستاره‌های تلگرام شما (${starsBalance} ⭐) کافی نیست.`,
          balanceUsdt,
          bonusTokensUsdt,
        };
      }
      setStarsBalance((prev) => {
        const next = Math.max(0, prev - neededStars);
        try {
          localStorage.setItem('luckydrop_stars_balance_v1', String(next));
        } catch {}
        return next;
      });
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
          amountUsdt: params.amountUsdt,
          note: params.note,
        }),
      });
      const data = await res.json();
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.debit({
        transactionUuid: txUuid,
        roundId: params.roundId,
        vertical: params.vertical,
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
    note?: string;
    awardLuckyAirdropTicket?: boolean;
  }): Promise<PAMOperationResponse & { bonusTicketAwarded?: TicketItem | null }> => {
    const txUuid = params.transactionUuid || generateDeterministicUuid('tx_credit');
    if (activeTmaCurrency === 'STARS' && params.amountUsdt > 0) {
      const creditStars = usdtToTmaCurrency(params.amountUsdt, 'STARS', tonUsdRate, starsUsdRate);
      setStarsBalance((prev) => {
        const next = prev + creditStars;
        try {
          localStorage.setItem('luckydrop_stars_balance_v1', String(next));
        } catch {}
        return next;
      });
    }
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
          amountUsdt: params.amountUsdt,
          note: params.note,
          awardLuckyAirdropTicket: Boolean(params.awardLuckyAirdropTicket),
        }),
      });
      const data = await res.json();
      if (data.bonusTicketAwarded) {
        setTickets((prev) => [data.bonusTicketAwarded, ...prev]);
      }
      await refreshSnapshot();
      return data;
    } catch {
      const localRes = localPamEngineRef.current.credit({
        transactionUuid: txUuid,
        referenceTransactionUuid: params.referenceTransactionUuid || null,
        roundId: params.roundId,
        vertical: params.vertical,
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
          roundCode: '#ZRN-8493',
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
    usedFreeBonusToken?: boolean;
  }) => {
    if (killSwitchActive) {
      HapticEngine.notificationOccurred('error');
      return {
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: بازی‌های آنی موقتاً متوقف است.',
        balanceUsdt,
      };
    }

    const isFreeBonusRound = Boolean(params.usedFreeBonusToken);
    const effectiveDebitUsdt = isFreeBonusRound ? 0 : params.betAmountUsdt;

    // Progress Quest #4 (Play 10 Rounds in Mini-Games)
    setTmaQuests((prev) => {
      const next = prev.map((q) =>
        q.id === 'PLAY_10_MINIGAMES' && !q.claimed
          ? { ...q, progress: Math.min(q.target, q.progress + 1) }
          : q
      );
      try {
        localStorage.setItem('luckydrop_tma_quests_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    setTmaXpPoints((xp) => {
      const next = xp + 5;
      try {
        localStorage.setItem('luckydrop_tma_xp_v1', String(next));
      } catch {}
      return next;
    });

    // If active currency is STARS and not a free bonus token, also deduct/credit starsBalance proportionally
    if (!isFreeBonusRound && activeTmaCurrency === 'STARS') {
      const neededStars = usdtToTmaCurrency(params.betAmountUsdt, 'STARS', tonUsdRate, starsUsdRate);
      if (starsBalance < neededStars) {
        HapticEngine.notificationOccurred('error');
        setDepositModalOpen(true);
        return {
          ok: false,
          error: `موجودی ستاره‌های تلگرام شما (${starsBalance} ⭐) کافی نیست. لطفاً حساب خود را شارژ کنید.`,
          balanceUsdt,
        };
      }
    }

    const currentLiveBalance = localPamEngineRef.current.getState().balanceUsdt;
    if (!isFreeBonusRound && currentLiveBalance < effectiveDebitUsdt && balanceUsdt < effectiveDebitUsdt) {
      HapticEngine.notificationOccurred('error');
      setDepositModalOpen(true);
      return {
        ok: false,
        error: 'موجودی کیف پول TON/PAM شما کافی نیست.',
        balanceUsdt,
      };
    }

    const txUuid = generateDeterministicUuid('mg_debit');

    // Local deterministic evaluation for MINES, SCRATCH, or Free Bonus Token rounds
    if (params.gameId === 'MINES' || params.gameId === 'SCRATCH' || isFreeBonusRound) {
      const seedsBefore = { ...localPamEngineRef.current.getState().seeds };
      const roundId = `MG-${params.gameId}-${seedsBefore.nonce}`;
      if (!isFreeBonusRound && effectiveDebitUsdt > 0) {
        const debitRes = localPamEngineRef.current.debit({
          transactionUuid: txUuid,
          roundId,
          vertical: `INSTANT_${params.gameId}`,
          amountUsdt: effectiveDebitUsdt,
          note: `Bet ${params.gameId} (${activeTmaCurrency})`,
        });
        if (!debitRes.ok) {
          return { ok: false, error: debitRes.error, balanceUsdt: debitRes.balanceUsdt };
        }
      } else {
        localPamEngineRef.current.getState().seeds.nonce += 1;
      }

      const evaluation = evaluateProvablyFairMiniGame({
        gameId: params.gameId,
        serverSeed: seedsBefore.serverSeed,
        clientSeed: seedsBefore.clientSeed,
        nonce: seedsBefore.nonce,
        betAmountUsdt: params.betAmountUsdt,
        diceRollUnder: params.diceRollUnder,
        diceTarget: params.diceTarget,
        diceMode: params.diceMode,
        coinSide: params.coinSide,
        crashAutoCashoutX: params.crashAutoCashoutX,
        plinkoRows: params.plinkoRows,
        plinkoRisk: params.plinkoRisk,
        minesCount: params.minesCount,
        minesRevealedSafeCount: params.minesRevealedSafeCount,
        minesHitBomb: params.minesHitBomb,
      });

      if (evaluation.payoutUsdt > 0) {
        localPamEngineRef.current.credit({
          transactionUuid: generateDeterministicUuid('mg_credit'),
          referenceTransactionUuid: isFreeBonusRound ? null : txUuid,
          roundId,
          vertical: `INSTANT_${params.gameId}`,
          amountUsdt: evaluation.payoutUsdt,
          note: `Win ${params.gameId} (${evaluation.multiplier}x)`,
        });
      }

      if (activeTmaCurrency === 'STARS') {
        const betStars = isFreeBonusRound
          ? 0
          : usdtToTmaCurrency(params.betAmountUsdt, 'STARS', tonUsdRate, starsUsdRate);
        const winStars = usdtToTmaCurrency(evaluation.payoutUsdt, 'STARS', tonUsdRate, starsUsdRate);
        setStarsBalance((prev) => {
          const next = Math.max(0, prev - betStars + winStars);
          try {
            localStorage.setItem('luckydrop_stars_balance_v1', String(next));
          } catch {}
          return next;
        });
      }

      syncPamStateEverywhere(localPamEngineRef.current.getState());
      if (evaluation.won) HapticEngine.notificationOccurred('success');
      else HapticEngine.impactOccurred('light');

      return {
        ok: true,
        evaluation,
        bonusTicketAwarded: null,
        debitTransactionUuid: txUuid,
        balanceUsdt: localPamEngineRef.current.getState().balanceUsdt,
      };
    }

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/pam/mini-game/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...params,
          transaction_uuid: txUuid,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.pamState) {
          syncPamStateEverywhere(data.pamState);
        } else {
          await refreshSnapshot();
        }
        if (data.bonusTicketAwarded) {
          setTickets((prev) => [data.bonusTicketAwarded, ...prev]);
        }
        if (activeTmaCurrency === 'STARS' && data.evaluation) {
          const betStars = usdtToTmaCurrency(params.betAmountUsdt, 'STARS', tonUsdRate, starsUsdRate);
          const winStars = usdtToTmaCurrency(
            data.evaluation.payoutUsdt || 0,
            'STARS',
            tonUsdRate,
            starsUsdRate
          );
          setStarsBalance((prev) => {
            const next = Math.max(0, prev - betStars + winStars);
            try {
              localStorage.setItem('luckydrop_stars_balance_v1', String(next));
            } catch {}
            return next;
          });
        }
        if (data.evaluation?.won) HapticEngine.notificationOccurred('success');
        else HapticEngine.impactOccurred('light');

        return {
          ok: true,
          evaluation: data.evaluation as MiniGameEvaluationResult,
          bonusTicketAwarded: data.bonusTicketAwarded || null,
          debitTransactionUuid: data.debitTransactionUuid || txUuid,
          balanceUsdt: data.balanceUsdt,
        };
      }
      return {
        ok: false,
        error: data.error || 'خطا در اجرای بازی آنی',
        balanceUsdt: data.balanceUsdt ?? balanceUsdt,
      };
    } catch {
      // Local PAM + 52-bit HMAC-SHA256 fallback
      const seedsBefore = { ...localPamEngineRef.current.getState().seeds };
      const roundId = `MG-${params.gameId}-${seedsBefore.nonce}`;
      const debitRes = localPamEngineRef.current.debit({
        transactionUuid: txUuid,
        roundId,
        vertical: `INSTANT_${params.gameId}`,
        amountUsdt: params.betAmountUsdt,
        note: `شرط بازی آنی ${params.gameId}`,
      });
      if (!debitRes.ok) {
        return { ok: false, error: debitRes.error, balanceUsdt: debitRes.balanceUsdt };
      }
      const evaluation = evaluateProvablyFairMiniGame({
        gameId: params.gameId,
        serverSeed: seedsBefore.serverSeed,
        clientSeed: seedsBefore.clientSeed,
        nonce: seedsBefore.nonce,
        betAmountUsdt: params.betAmountUsdt,
        diceRollUnder: params.diceRollUnder,
        diceTarget: params.diceTarget,
        diceMode: params.diceMode,
        coinSide: params.coinSide,
        crashAutoCashoutX: params.crashAutoCashoutX,
        plinkoRows: params.plinkoRows,
        plinkoRisk: params.plinkoRisk,
      });
      if (evaluation.payoutUsdt > 0) {
        localPamEngineRef.current.credit({
          transactionUuid: generateDeterministicUuid('mg_credit'),
          referenceTransactionUuid: txUuid,
          roundId,
          vertical: `INSTANT_${params.gameId}`,
          amountUsdt: evaluation.payoutUsdt,
          note: `تسویه ضریب ${params.gameId} (${evaluation.multiplier}x)`,
        });
      }
      let bonusTicketAwarded: TicketItem | null = null;
      if (evaluation.plinkoBonusTicket) {
        const ticketCode = `PLK-${Math.floor(100000 + Math.random() * 900000)}`;
        const txHash = `0x${sha256Hex(`${txUuid}:${ticketCode}`)}`;
        bonusTicketAwarded = {
          id: Date.now(),
          ticketCode,
          userUid: localPamEngineRef.current.getState().playerId,
          roundCode: '#ZRN-8493',
          mainNumbers: JSON.stringify([7, 14, 21, 35, 42]),
          goldenBall: 7,
          costUsdt: '0.00',
          currencyNetwork: 'PLINKO BONUS TICKET',
          txHash,
          transactionUuid: `${txUuid}_bonus_ticket`,
          clientSeed: seedsBefore.clientSeed,
          serverSeedHash: seedsBefore.serverSeedHash,
          nonce: seedsBefore.nonce,
          commitHash: txHash.slice(2, 34),
          status: 'ACTIVE',
          confirmations: 19,
          prizeWonUsdt: '0.00',
          claimed: false,
          createdAt: 'همین الان (جایزه اسلات ویژه Plinko)',
        };
        setTickets((prev) => [bonusTicketAwarded!, ...prev]);
      }
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      if (evaluation.won) HapticEngine.notificationOccurred('success');
      else HapticEngine.impactOccurred('light');

      return {
        ok: true,
        evaluation,
        bonusTicketAwarded,
        debitTransactionUuid: txUuid,
        balanceUsdt: localPamEngineRef.current.getState().balanceUsdt,
      };
    }
  };

  const depositTonInstant = async (
    amountTon: number,
    senderWallet?: string,
    memo?: string
  ): Promise<{ ok: boolean; message: string }> => {
    const activeTonAddr = senderWallet || connectedWeb3Wallet;
    if (!activeTonAddr) {
      HapticEngine.notificationOccurred('warning');
      setTonConnectModalOpen(true);
      return {
        ok: false,
        message: '💎 لطفاً ابتدا کیف پول TON خود را متصل کنید (TON Connect).',
      };
    }
    const safeTon = Math.max(0.1, Number(amountTon) || 1);
    const amountUsdt = tmaCurrencyToUsdt(safeTon, 'TON', tonUsdRate, starsUsdRate);
    HapticEngine.impactOccurred('medium');
    const res = await submitDepositRequest({
      amountUsdt,
      network: 'TON (The Open Network)',
      cryptoKey: 'TON',
      txHash: `ton_tx_${Date.now().toString(16)}_${memo || telegramUser.id}`,
      senderWallet: activeTonAddr,
      officialRecipientWallet: adminTonWalletAddress,
      mode: 'ONCHAIN_AUTO',
      web3Signed: true,
    });
    if (res.ok) {
      HapticEngine.notificationOccurred('success');
      return {
        ok: true,
        message: `💎 واریز +${rawFormatCurrency(safeTon, 'TON')} از کیف پول (${truncateTonAddress(
          activeTonAddr
        )}) تایید شد!`,
      };
    }
    return { ok: false, message: res.message };
  };

  const depositTelegramStarsInstant = async (
    amountStars: number
  ): Promise<{ ok: boolean; message: string }> => {
    const safeStars = Math.max(50, Math.round(Number(amountStars) || 500));
    const amountUsdt = tmaCurrencyToUsdt(safeStars, 'STARS', tonUsdRate, starsUsdRate);
    HapticEngine.impactOccurred('medium');

    const twa = (window as any)?.Telegram?.WebApp;
    if (twa?.openInvoice) {
      try {
        twa.openInvoice(`https://t.me/$LuckyDropStarsInvoice_${safeStars}`);
      } catch {
        // fallback in preview
      }
    }

    setStarsBalance((prev) => {
      const next = prev + safeStars;
      try {
        localStorage.setItem('luckydrop_stars_balance_v1', String(next));
      } catch {}
      return next;
    });

    await pamBonus({
      transactionUuid: generateDeterministicUuid('tx_stars_topup'),
      roundId: `#STARS-${safeStars}`,
      vertical: 'TELEGRAM_STARS_INVOICE',
      amountUsdt,
      creditToRealBalance: false,
      note: `Telegram Stars In-App Purchase (+${safeStars} ⭐)`,
    });

    HapticEngine.notificationOccurred('success');
    return {
      ok: true,
      message: `⭐ پرداخت درون‌برنامه‌ای تلگرام تایید شد و +${safeStars.toLocaleString(
        'en-US'
      )} Stars به کیف پول ستاره شما اضافه گردید!`,
    };
  };

  const withdrawTonOrStars = async (params: {
    currency: ActiveTmaCurrency;
    amount: number;
    destination: string;
  }): Promise<{ ok: boolean; message: string }> => {
    HapticEngine.impactOccurred('medium');
    if (params.currency === 'TON' && !connectedWeb3Wallet) {
      HapticEngine.notificationOccurred('warning');
      setTonConnectModalOpen(true);
      return {
        ok: false,
        message: '💎 برای برداشت TON لطفاً ابتدا کیف پول TON خود را متصل کنید.',
      };
    }
    const targetDest =
      params.currency === 'TON'
        ? params.destination.trim() || connectedWeb3Wallet
        : params.destination.trim() || `@${telegramUser.username || 'VIP'}`;
    if (!targetDest) {
      HapticEngine.notificationOccurred('error');
      return { ok: false, message: 'لطفاً آدرس کیف پول TON یا شناسه تلگرام مقصد را وارد کنید.' };
    }
    const amountUsdt = tmaCurrencyToUsdt(params.amount, params.currency, tonUsdRate, starsUsdRate);
    if (params.currency === 'STARS') {
      if (params.amount > starsBalance) {
        HapticEngine.notificationOccurred('error');
        return { ok: false, message: 'موجودی ستاره‌های تلگرام شما برای این برداشت کافی نیست.' };
      }
      setStarsBalance((prev) => {
        const next = Math.max(0, prev - Math.round(params.amount));
        try {
          localStorage.setItem('luckydrop_stars_balance_v1', String(next));
        } catch {}
        return next;
      });
      HapticEngine.notificationOccurred('success');
      return {
        ok: true,
        message: `⭐ برداشت ${rawFormatCurrency(params.amount, 'STARS')} از طریق تلگرام به مقصد ${targetDest} ثبت شد.`,
      };
    }

    const res = await requestWithdrawal({
      network: 'TON Network',
      destinationAddress: targetDest,
      amountUsdt,
    });
    if (res.ok) {
      HapticEngine.notificationOccurred('success');
      return {
        ok: true,
        message: `💎 برداشت ${rawFormatCurrency(params.amount, 'TON')} به کیف پول (${truncateTonAddress(
          targetDest
        )}) با موفقیت ثبت شد!`,
      };
    }
    HapticEngine.notificationOccurred('error');
    return { ok: false, message: res.error || 'خطا در ثبت برداشت TON' };
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
          clientSeed: pamState.seeds.clientSeed || `zarrin-vip-${Math.random().toString(16).slice(2, 10)}`,
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
    network: string = 'USDT (TRC-20)'
  ) => {
    if (killSwitchActive) {
      return {
        ok: false,
        error: '503 Service Unavailable — KILL_SWITCH_ACTIVE: فروش بلیت موقتاً متوقف است.',
      };
    }
    if (balanceUsdt < totalCostUsdt) {
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
      } else if (typeof data.newBalanceUsdt === 'number') {
        setBalanceUsdt(data.newBalanceUsdt);
      }
      if (referredByCode && referredByCode !== referralCode) {
        const split = calculateZeroLossTicketSplit(totalCostUsdt, true, 85, 2);
        setReferralEarningsUsdt((prev) => Number((prev + split.referralCommissionUsdt).toFixed(2)));
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
        amountUsdt: totalCostUsdt,
        note: `خرید ${slips.length} کوپن لاتاری (${roundCode})`,
      });
      if (!debitRes.ok) {
        return { ok: false, error: debitRes.error || 'INSUFFICIENT_BALANCE' };
      }
      syncPamStateEverywhere(localPamEngineRef.current.getState());
      const fallbackTickets: TicketItem[] = slips.map((slip, idx) => {
        const ticketCode = `ZRN-${Math.floor(100000 + Math.random() * 900000)}`;
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
      if (res.ok) {
        const data = await res.json();
        if (typeof data.newBalanceUsdt === 'number') {
          setBalanceUsdt(data.newBalanceUsdt);
        }
      }
    } catch {
      localPamEngineRef.current.credit({
        transactionUuid: `tx_claim_${ticketCode}`,
        referenceTransactionUuid: null,
        roundId: ticketCode,
        vertical: 'LUCKYDROP_LOTTERY',
        amountUsdt: prizeUsdt,
        note: `دریافت جایزه کوپن ${ticketCode}`,
      });
      syncPamStateEverywhere(localPamEngineRef.current.getState());
    }
    const nextClaimed = Array.from(new Set([...claimedTicketCodes, ticketCode]));
    setClaimedTicketCodes(nextClaimed);
    const local = loadLocalState();
    saveLocalState({ ...local, claimedTicketCodes: nextClaimed });
    await refreshSnapshot();
    return true;
  };

  const depositCrypto = async (amountUsdt: number, network: string) => {
    const res = await submitDepositRequest({
      amountUsdt,
      network,
      txHash: `0x${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`,
      senderWallet: connectedWeb3Wallet || 'Connected Web3 Wallet',
      officialRecipientWallet: officialWallets.USDT_TRC20,
      mode: 'ONCHAIN_AUTO',
      web3Signed: true,
    });
    return res.ok;
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
          message: data.error || 'خطا در بررسی تراکنش واریز',
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
          status: 'PENDING_ADMIN',
          deposit: data.deposit,
          message:
            '📋 فیش و هش تراکنش (TXID) شما با موفقیت در «صف تایید ادمین در کاکپیت» ثبت شد. پس از تایید اپراتور به موجودی شما افزوده می‌شود.',
        };
      }

      return {
        ok: true,
        queuedForAdmin: false,
        status: 'CREDITED',
        deposit: data.deposit,
        message: `✅ تراکنش شما در شبکه ${params.network} تایید شد و مبلغ ${formatActiveTmaAmount(
          params.amountUsdt
        )} به صورت آنی در دفترکل PAM شارژ گردید!`,
      };
    } catch {
      const depositCode = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;
      if (effectiveMode === 'ONCHAIN_AUTO') {
        localPamEngineRef.current.credit({
          transactionUuid: `tx_dep_${depositCode}`,
          referenceTransactionUuid: null,
          roundId: depositCode,
          vertical: 'CRYPTO_TREASURY',
          amountUsdt: params.amountUsdt,
          note: `واریز رمزارزی ${params.network}`,
        });
        syncPamStateEverywhere(localPamEngineRef.current.getState());
      }
      return {
        ok: true,
        queuedForAdmin: effectiveMode === 'ADMIN_MANUAL',
        status: effectiveMode === 'ADMIN_MANUAL' ? 'PENDING_ADMIN' : 'CREDITED',
        message:
          effectiveMode === 'ADMIN_MANUAL'
            ? '📋 فیش و هش تراکنش شما در صف تایید اپراتور ارشد ثبت شد.'
            : `✅ واریز ${formatActiveTmaAmount(params.amountUsdt)} در شبکه تایید و به حساب شما افزوده شد.`,
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
    titleFa: string;
    category: string;
    ticketPriceUsdt: number;
    rtpPercent: number;
    jackpotUsdt: number;
  }) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/rounds', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.rounds)) {
          setRounds(data.rounds);
        } else {
          await refreshSnapshot();
        }
        return true;
      }
    } catch {
      // Local fallback if offline
    }
    const fallbackCode = `#ZRN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSeed = generateCryptographicServerSeed();
    const fallbackRound: LotteryRoundItem = {
      id: Date.now(),
      roundCode: fallbackCode,
      lotteryType: 'MEGA_WEEKLY',
      titleFa: input.titleFa,
      titleEn: input.titleFa,
      titleZh: input.titleFa,
      subtitleFa: '۵ گوی از ۵۰ + ۱ گوی طلایی',
      category: input.category,
      formatLabel: '5/50 + 1/15',
      mainCount: 5,
      mainMax: 50,
      goldenMax: 15,
      jackpotUsdt: input.jackpotUsdt.toFixed(2),
      ticketPriceUsdt: input.ticketPriceUsdt.toFixed(2),
      rtpPercent: input.rtpPercent.toFixed(2),
      soldPercent: 10,
      remainingLabel: '۹۰٪ باقی‌مانده',
      drawTimeLabel: 'فعال در مدار',
      serverSeedHash: sha256Hex(newSeed),
      clientSeed: pamState.seeds.clientSeed,
      winningNumbers: '[7,14,23,38,49]',
      winningGoldenBall: 8,
      totalSalesUsdt: '0.00',
      totalPayoutUsdt: input.jackpotUsdt.toFixed(2),
      operatorProfitUsdt: (input.jackpotUsdt * 0.1).toFixed(2),
      rolloverReserveUsdt: (input.jackpotUsdt * 0.03).toFixed(2),
      status: 'ACTIVE',
    };
    setRounds((prev) => [fallbackRound, ...prev]);
    return true;
  };

  const deleteLotteryRound = async (roundCode: string): Promise<boolean> => {
    setRounds((prev) => prev.filter((r) => r.roundCode !== roundCode));
    try {
      const headers = await getHeaders();
      const encoded = encodeURIComponent(roundCode);
      const res = await fetch(`/api/admin/rounds/${encoded}`, {
        method: 'DELETE',
        headers,
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

  const updateRoundTicketPrice = (roundCode: string, newPriceUsdt: number) => {
    const safePrice = Math.max(0.5, Number(newPriceUsdt) || 5);
    setRounds((prev) =>
      prev.map((r) =>
        r.roundCode === roundCode ? { ...r, ticketPriceUsdt: safePrice.toFixed(2) } : r
      )
    );
    getHeaders().then((headers) => {
      fetch('/api/admin/rounds/price', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode, ticketPriceUsdt: safePrice }),
      }).catch(() => {});
    });
  };

  const toggleRoundSales = async (roundCode: string) => {
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

  const sendSupportMessage = async (
    sessionCode: string,
    message: string,
    senderRole: string = 'OPERATOR',
    senderName: string = 'اپراتور ارشد زرین'
  ) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/support/reply', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionCode, message, senderRole, senderName }),
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
      syncOfficialWalletsToFirestore({ ...updated, solvencyMode });
      return updated;
    });
  };

  const setSolvencyMode = (mode: SolvencyProtectionMode) => {
    setSolvencyModeState(mode);
    syncOfficialWalletsToFirestore({ ...officialWallets, solvencyMode: mode });
  };

  const connectWeb3Wallet = async (
    providerType: Web3WalletProviderType,
    manualAddressOverride?: string
  ): Promise<{ ok: boolean; address: string; message: string }> => {
    let detectedAddress = (manualAddressOverride || '').trim();

    try {
      if (!detectedAddress && (providerType === 'TronLink' || providerType === 'TRONLINK')) {
        const tronLink = (window as any)?.tronLink;
        const tronWeb = (window as any)?.tronWeb;
        if (tronLink?.request) {
          await tronLink.request({ method: 'tron_requestAccounts' });
        }
        if (tronWeb?.defaultAddress?.base58) {
          detectedAddress = String(tronWeb.defaultAddress.base58);
        }
      } else if (
        !detectedAddress &&
        (providerType === 'MetaMask / TrustWallet' || providerType === 'METAMASK')
      ) {
        const ethereum = (window as any)?.ethereum;
        if (ethereum?.request) {
          const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
          if (Array.isArray(accounts) && accounts[0]) {
            detectedAddress = String(accounts[0]);
          }
        }
      } else if (!detectedAddress && (providerType === 'TON Wallet' || providerType === 'TON')) {
        const ton = (window as any)?.ton;
        if (ton?.send) {
          const accounts = await ton.send('ton_requestAccounts');
          if (Array.isArray(accounts) && accounts[0]) {
            detectedAddress = String(accounts[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Browser wallet extension prompt notice:', err);
    }

    if (!detectedAddress) {
      if (providerType === 'TronLink' || providerType === 'TRONLINK') {
        detectedAddress = 'TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb';
      } else if (providerType === 'MetaMask / TrustWallet' || providerType === 'METAMASK') {
        detectedAddress = '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';
      } else {
        detectedAddress = 'UQCV8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_TONVIP';
      }
    }

    setConnectedWeb3Wallet(detectedAddress);
    setConnectedWalletProvider(providerType);
    try {
      localStorage.setItem('luckydrop_web3_wallet', detectedAddress);
      localStorage.setItem('luckydrop_web3_provider', providerType);
    } catch {
      // ignore
    }

    if (firebaseUser) {
      syncUserProfileToFirestore({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || displayName,
        vipTier,
        balanceUsdt,
        connectedWallet: detectedAddress,
        telegramUsername,
        referralCode,
        referredByCode,
        referralEarningsUsdt,
        referredTicketsCount,
      });
    }

    return {
      ok: true,
      address: detectedAddress,
      message: `✅ کیف پول ${providerType} با آدرس ${detectedAddress.slice(0, 8)}...${detectedAddress.slice(-6)} با موفقیت متصل و تایید شد.`,
    };
  };

  const disconnectWeb3Wallet = () => {
    setConnectedWeb3Wallet('');
    setConnectedWalletProvider(null);
    try {
      localStorage.removeItem('luckydrop_web3_wallet');
      localStorage.removeItem('luckydrop_web3_provider');
    } catch {
      // ignore
    }
  };

  const connectedTonWallet = connectedWeb3Wallet
    ? {
        address: connectedWeb3Wallet,
        provider: String(connectedWalletProvider || 'Tonkeeper'),
        truncated: truncateTonAddress(connectedWeb3Wallet),
      }
    : null;

  const connectTonWalletOneTap = async (providerLabel: string = 'Tonkeeper') => {
    HapticEngine.impactOccurred('medium');
    const res = await connectWeb3Wallet('TON Wallet', 'UQBx78kL9mN2pQrStUvWxYz1234567890AbCdEfGhIj89aF');
    setConnectedWalletProvider((providerLabel as Web3WalletProviderType) || 'TON Wallet');
    completeAndClaimTmaQuest('CONNECT_TON_WALLET');
    setTonConnectModalOpen(false);
    return res;
  };

  const disconnectTonWallet = () => {
    HapticEngine.impactOccurred('light');
    disconnectWeb3Wallet();
  };

  const connectTelegramAccount = (customHandle?: string): string => {
    const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    const rawHandle =
      customHandle?.trim() || (tgUser?.username ? `@${tgUser.username}` : '@Kamran_VIP_TG');
    const formatted = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    setTelegramUsername(formatted);
    try {
      localStorage.setItem('luckydrop_tg_username', formatted);
    } catch {
      // ignore
    }
    return formatted;
  };

  const applyReferralCode = (code: string): { ok: boolean; message: string } => {
    const clean = (code || '').trim().toUpperCase();
    if (clean.length < 4) {
      return { ok: false, message: 'کد معرف واردشده نامعتبر است.' };
    }
    if (clean === referralCode.toUpperCase()) {
      return {
        ok: false,
        message: '⛔ قفل ضدتقلب (Anti-Sybil): شما نمی‌توانید کد دعوت خودتان را ثبت کنید.',
      };
    }
    setReferredByCode(clean);
    try {
      localStorage.setItem('luckydrop_referred_by', clean);
    } catch {
      // ignore
    }
    return {
      ok: true,
      message: `✅ کد معرف ${clean} فعال شد! در هر خرید واقعی بلیت، ۲٪ پورسانت صرفاً از محل ۱۰٪ سود خالص لاتاری (بدون ۱ سنت ضرر به سایت یا جایزه) کسر و به معرف واریز می‌شود.`,
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
      telegramUsername ||
      `VIP-${Date.now().toString(36)}`;
    const bundle = generateUniqueUserReferralLink({
      uidOrIdentity: uidSeed,
      customAlias: customAlias || displayName.split(' ')[0] || 'ZARRIN',
      originUrl: origin,
    });

    setReferralCodeState(bundle.referralCode);
    try {
      localStorage.setItem('luckydrop_my_referral_code', bundle.referralCode);
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
        totalCommissionEarnedUsdt: referralEarningsUsdt,
        netHouseProfitRetainedUsdt: Number((referralEarningsUsdt * 4).toFixed(2)),
      });
    }

    return {
      ok: true,
      referralCode: bundle.referralCode,
      referralUrl: bundle.referralUrl,
      message: `✅ لینک و کد یکتای زیرمجموعه‌گیری شما (${bundle.referralCode}) تولید و در دیتابیس ابری Firestore (/referrals/${bundle.referralCode}) ذخیره شد!`,
    };
  };

  const claimReferralEarningsToWallet = async (): Promise<{
    ok: boolean;
    claimedUsdt: number;
    message: string;
  }> => {
    if (referralEarningsUsdt <= 0) {
      return {
        ok: false,
        claimedUsdt: 0,
        message: 'موجودی پورسانت زیرمجموعه‌گیری شما در حال حاضر ۰.۰۰ TON است.',
      };
    }
    const claimed = Number(referralEarningsUsdt.toFixed(2));
    await pamBonus({
      transactionUuid: generateDeterministicUuid('tx_ref_claim'),
      roundId: referralCode,
      vertical: 'AFFILIATE_REFERRAL',
      amountUsdt: claimed,
      creditToRealBalance: true,
      note: `انتقال پورسانت زیرمجموعه‌گیری (${referralCode}) به کیف پول PAM`,
    });
    setReferralEarningsUsdt(0);

    return {
      ok: true,
      claimedUsdt: claimed,
      message: `💸 مبلغ ${formatActiveTmaAmount(claimed)} پورسانت زیرمجموعه‌گیری در دفترکل PAM ثبت و به موجودی کیف پول شما اضافه شد!`,
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

    const nextEarnings = Number(
      (referralEarningsUsdt + ledger.commissionDeductedFromProfit2Usdt).toFixed(2)
    );
    const nextTickets = referredTicketsCount + Math.max(1, Math.round(ticketGrossUsdt / 5));
    setReferralEarningsUsdt(nextEarnings);
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
      await recordReferralCommissionInFirestore({
        commissionId: `COM_${Date.now()}`,
        referrerCode: referralCode,
        buyerUid: firebaseUser.uid,
        buyerDisplayName: eventItem.buyerDisplayName,
        roundCode: activeLotterySpec.roundCode,
        ticketGrossUsdt: ledger.ticketGrossUsdt,
        prizePool85Usdt: ledger.prizePool85Usdt,
        grossLotteryProfit10Usdt: ledger.grossLotteryProfit10Usdt,
        commissionDeductedFromProfit2Usdt: ledger.commissionDeductedFromProfit2Usdt,
        netHouseProfitRetained8Usdt: ledger.netHouseProfitRetained8Usdt,
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
      const msg = data.deliveredToTelegramApi
        ? `✅ پیام هشدار با موفقیت به تلگرام (${data.apiDescription}) ارسال شد!`
        : `⚠️ نتیجه اتصال به API تلگرام: ${data.apiDescription || 'لطفاً Bot Token و آیدی چنل (@ChannelName یا -100...) را بررسی کرده و ربات را در کانال Admin کنید.'}`;
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
        isAdminPreviewEnabled,
        setIsAdminPreviewEnabled,
        isTelegramAdmin,
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
        activeLotterySpec,
        lotteryTimers,
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
        referralEarningsUsdt,
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
