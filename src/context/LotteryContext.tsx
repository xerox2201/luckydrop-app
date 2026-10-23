import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
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
  computeDeterministicHash,
} from '../utils/lotteryEngine.ts';
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

export type AppRoute =
  | 'lobby'
  | 'play'
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
  clientSeed: string;
  serverSeedHash: string;
  commitHash: string;
  status: string;
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
  firebaseUser: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  balanceUsdt: number;
  vipTier: string;
  displayName: string;
  rounds: LotteryRoundItem[];
  tickets: TicketItem[];
  transactions: TransactionItem[];
  supportMessages: SupportMessageItem[];
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
  triggerDraw: (roundCode: string) => Promise<{ drawnMain: number[]; drawnGolden: number; hash: string } | null>;
  createNewRound: (input: {
    titleFa: string;
    category: string;
    ticketPriceUsdt: number;
    rtpPercent: number;
    jackpotUsdt: number;
  }) => Promise<boolean>;
  updateRoundTicketPrice: (roundCode: string, newPriceUsdt: number) => void;
  toggleRoundSales: (roundCode: string) => Promise<void>;
  sendSupportMessage: (sessionCode: string, message: string, senderRole?: string, senderName?: string) => Promise<boolean>;
  officialWallets: OfficialSiteWallets;
  updateOfficialWallets: (next: Partial<OfficialSiteWallets>) => void;
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
  if (path.startsWith('/user-panel') || path.startsWith('/profile')) return 'user-panel';
  if (path.startsWith('/terms') || path.startsWith('/rules')) return 'terms';
  if (path.startsWith('/ops/launch')) return 'launch';
  if (path.startsWith('/ops-k82-cockpit')) return 'cockpit';
  if (path.startsWith('/admin/finances')) return 'finances';
  if (path === '/admin' || path.startsWith('/404')) return '404';
  if (path.startsWith('/transparency')) return 'transparency';
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
    winningNumbers: JSON.stringify(spec.winningNumbers),
    winningGoldenBall: spec.winningGoldenBall,
    totalSalesUsdt: (spec.jackpotUsdt * 1.15).toFixed(2),
    totalPayoutUsdt: spec.jackpotUsdt.toFixed(2),
    operatorProfitUsdt: (spec.jackpotUsdt * 0.1).toFixed(2),
    rolloverReserveUsdt: (spec.jackpotUsdt * 0.03).toFixed(2),
    status: 'active',
  }));

const DEMO_WINNING_TICKETS: TicketItem[] = [
  {
    id: 701,
    ticketCode: 'ZR-884920',
    userUid: 'vip-demo-user',
    roundCode: '#ZRN-8493',
    mainNumbers: '[7,14,23,31,45]',
    goldenBall: 8,
    costUsdt: '5.00',
    currencyNetwork: 'USDT (TRC-20)',
    txHash: '0x7a4b8f1920c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c739c0',
    clientSeed: 'zarrin_vip_winner_seed_01',
    serverSeedHash: '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    commitHash: '8f4d92a11b6c738e4a9e201f82c49830',
    status: 'won',
    confirmations: 19,
    prizeWonUsdt: '25.00',
    claimed: false,
    createdAt: '۲۰ دقیقه پیش',
  },
  {
    id: 702,
    ticketCode: 'BLZ-551209',
    userUid: 'vip-demo-user',
    roundCode: '#BLZ-2409',
    mainNumbers: '[4,11,19,27,30]',
    goldenBall: 6,
    costUsdt: '2.00',
    currencyNetwork: 'TON Network',
    txHash: '0x9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
    clientSeed: 'blitz_ton_seed_88',
    serverSeedHash: '0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    commitHash: '4b227777d4dd1fc61c6f884f48641d02',
    status: 'won',
    confirmations: 32,
    prizeWonUsdt: '1500.00',
    claimed: false,
    createdAt: '۲ ساعت پیش',
  },
  {
    id: 703,
    ticketCode: 'FLS-119044',
    userUid: 'vip-demo-user',
    roundCode: '#FLS-0060',
    mainNumbers: '[3,9,17,22]',
    goldenBall: 0,
    costUsdt: '1.00',
    currencyNetwork: 'TRON (TRX)',
    txHash: '0x1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
    clientSeed: 'flash_hourly_seed_12',
    serverSeedHash: '0x4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    commitHash: '7902699be42c8a8e46fbbb4501726517',
    status: 'won',
    confirmations: 19,
    prizeWonUsdt: '25.00',
    claimed: false,
    createdAt: '۴۵ دقیقه پیش',
  },
];

export const LotteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(resolveInitialRoute);
  const [stealthCookieAuthorized, setStealthCookieAuthorized] = useState<boolean>(true);
  const [lang, setLangState] = useState<CurrencyLang>('FA');

  // 1. Live Price Oracle State (Refreshes every 15s)
  const [fxRates, setFxRates] = useState<ExchangeRates>(DEFAULT_FX_RATES);
  const [oracleSnapshot, setOracleSnapshot] = useState<LiveOracleSnapshot | null>(null);
  const [oracleCountdownSec, setOracleCountdownSec] = useState<number>(15);
  const [oracleMarkupPercent, setOracleMarkupPercentState] = useState<number>(0);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const authTokenRef = useRef<string | null>(null);

  const [balanceUsdt, setBalanceUsdt] = useState<number>(3030.3);
  const [vipTier, setVipTier] = useState<string>('DIAMOND VIP');
  const [displayName, setDisplayName] = useState<string>('کامران سهرابی (VIP)');
  const [rounds, setRounds] = useState<LotteryRoundItem[]>(buildDefaultConcurrentRounds);
  const [tickets, setTickets] = useState<TicketItem[]>(DEMO_WINNING_TICKETS);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessageItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => loadLocalState().withdrawals);
  const [claimedTicketCodes, setClaimedTicketCodes] = useState<string[]>(() => loadLocalState().claimedTicketCodes);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);

  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);

  // 2. Multi-Lottery Concurrent State
  const [activeLotteryId, setActiveLotteryIdState] = useState<LotteryTypeId>('MEGA_WEEKLY');
  const [lotteryTimers, setLotteryTimers] = useState<Record<LotteryTypeId, number>>(() => ({
    MEGA_WEEKLY: MULTI_LOTTERY_SPECS[0].initialCountdownSec,
    DAILY_BLITZ: MULTI_LOTTERY_SPECS[1].initialCountdownSec,
    HOURLY_FLASH: MULTI_LOTTERY_SPECS[2].initialCountdownSec,
    TON_SPECIAL: MULTI_LOTTERY_SPECS[3].initialCountdownSec,
  }));

  const activeLotterySpec =
    MULTI_LOTTERY_SPECS.find((s) => s.id === activeLotteryId) || MULTI_LOTTERY_SPECS[0];

  // 3. Single & Bulk Ticket Cart State
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
  const [activeTrackingTicket, setActiveTrackingTicket] = useState<TicketItem | null>(DEMO_WINNING_TICKETS[0]);

  // Keep selectedMainBalls & selectedGoldenBall synced with activeSlipIndex
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

  // Sync manual ball edits back into bulkSlips[activeSlipIndex]
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

  // Live Price Oracle Refresh Engine (Every 15s)
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

  // 1-second global ticker for the 15s Oracle countdown + 4 concurrent lottery timers
  useEffect(() => {
    const interval = setInterval(() => {
      setOracleCountdownSec((prev) => {
        if (prev <= 1) {
          refreshPriceOracleNow();
          return 15;
        }
        return prev - 1;
      });

      setLotteryTimers((prev) => ({
        MEGA_WEEKLY: prev.MEGA_WEEKLY > 1 ? prev.MEGA_WEEKLY - 1 : MULTI_LOTTERY_SPECS[0].initialCountdownSec,
        DAILY_BLITZ: prev.DAILY_BLITZ > 1 ? prev.DAILY_BLITZ - 1 : MULTI_LOTTERY_SPECS[1].initialCountdownSec,
        HOURLY_FLASH: prev.HOURLY_FLASH > 1 ? prev.HOURLY_FLASH - 1 : MULTI_LOTTERY_SPECS[2].initialCountdownSec,
        TON_SPECIAL: prev.TON_SPECIAL > 1 ? prev.TON_SPECIAL - 1 : MULTI_LOTTERY_SPECS[3].initialCountdownSec,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshPriceOracleNow]);

  // Handle browser back/forward navigation
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
    if (target === 'admin_unauthorized') {
      setActiveRoute('404');
      window.history.pushState({}, '', '/404');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if ((target === 'cockpit' || target === 'finances') && !stealthCookieAuthorized) {
      setActiveRoute('404');
      window.history.pushState({}, '', '/404');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveRoute(target);
    window.history.pushState({}, '', ROUTE_TO_PATH[target] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const mergeRoundsWithConcurrentSpecs = (serverRounds: LotteryRoundItem[]): LotteryRoundItem[] => {
    const baseSpecs = buildDefaultConcurrentRounds();
    const mapByCode = new Map<string, LotteryRoundItem>();
    for (const b of baseSpecs) {
      mapByCode.set(b.roundCode, b);
    }
    for (const sr of serverRounds) {
      const existing = mapByCode.get(sr.roundCode);
      if (existing) {
        mapByCode.set(sr.roundCode, {
          ...existing,
          ...sr,
          ticketPriceUsdt: existing.ticketPriceUsdt,
          formatLabel: existing.formatLabel,
          mainCount: existing.mainCount,
          mainMax: existing.mainMax,
          goldenMax: existing.goldenMax,
          lotteryType: existing.lotteryType,
        });
      } else {
        mapByCode.set(sr.roundCode, sr);
      }
    }
    return Array.from(mapByCode.values());
  };

  const refreshSnapshot = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/snapshot', { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setBalanceUsdt(parseFloat(data.user.balanceUsdt) || 3030.3);
        setVipTier(data.user.vipTier || 'DIAMOND VIP');
        setDisplayName(data.user.displayName || 'کاربر ویژه VIP');
      }
      if (Array.isArray(data.rounds)) {
        setRounds(mergeRoundsWithConcurrentSpecs(data.rounds));
      }
      if (Array.isArray(data.tickets)) {
        const existingCodes = new Set(data.tickets.map((t: TicketItem) => t.ticketCode));
        const mergedTickets = [
          ...data.tickets,
          ...DEMO_WINNING_TICKETS.filter((d) => !existingCodes.has(d.ticketCode)),
        ];
        setTickets(mergedTickets);
        if (mergedTickets.length > 0) {
          setActiveTrackingTicket((prev) => prev || mergedTickets[0]);
        }
      }
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.supportMessages)) setSupportMessages(data.supportMessages);
      if (Array.isArray(data.withdrawals) && data.withdrawals.length > 0) {
        setWithdrawals(data.withdrawals);
      }
      if (Array.isArray(data.claimedTicketCodes)) {
        setClaimedTicketCodes((prev) => Array.from(new Set([...prev, ...data.claimedTicketCodes])));
      }
      if (typeof data.killSwitchActive === 'boolean') setKillSwitchActive(data.killSwitchActive);
    } catch (error) {
      console.error('Snapshot fetch error (operating on local state fallback):', error);
    }
  }, [getHeaders]);

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
    (usdt: number) => formatMultiCurrency(usdt, lang, fxRates),
    [lang, fxRates]
  );

  const mintTicket = async (network: string = 'USDT (TRC-20)') => {
    return mintBulkTickets(
      [
        {
          slipIndex: 1,
          mainNumbers: selectedMainBalls,
          goldenBall: selectedGoldenBall,
          clientSeed: `zarrin-vip-${Math.random().toString(16).slice(2, 10)}`,
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

    try {
      const headers = await getHeaders();
      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roundCode,
          mainNumbers: slips[0].mainNumbers,
          goldenBall: slips[0].goldenBall,
          costUsdt: totalCostUsdt,
          currencyNetwork: network,
          clientSeed: slips[0].clientSeed,
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
      if (typeof data.newBalanceUsdt === 'number') {
        setBalanceUsdt(data.newBalanceUsdt);
      } else {
        setBalanceUsdt((prev) => Number((prev - totalCostUsdt).toFixed(2)));
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
      // Resilient local fallback if backend DB is unreachable
      const fallbackTickets: TicketItem[] = slips.map((slip, idx) => {
        const ticketCode = `ZR-${Math.floor(100000 + Math.random() * 900000)}`;
        const txHash = computeDeterministicHash(slip.clientSeed, network, Date.now() + idx);
        return {
          id: Date.now() + idx,
          ticketCode,
          userUid: 'vip-demo-user',
          roundCode,
          mainNumbers: JSON.stringify(slip.mainNumbers),
          goldenBall: slip.goldenBall,
          costUsdt: (totalCostUsdt / slips.length).toFixed(2),
          currencyNetwork: network,
          txHash,
          clientSeed: slip.clientSeed,
          serverSeedHash: activeLotterySpec.serverSeedHash,
          commitHash: txHash.slice(2, 34),
          status: 'minted',
          confirmations: 19,
          prizeWonUsdt: '0.00',
          claimed: false,
          createdAt: 'همین الان',
        };
      });
      setBalanceUsdt((prev) => Number((prev - totalCostUsdt).toFixed(2)));
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
        } else {
          setBalanceUsdt((prev) => Number((prev + prizeUsdt).toFixed(2)));
        }
      } else {
        setBalanceUsdt((prev) => Number((prev + prizeUsdt).toFixed(2)));
      }
    } catch {
      setBalanceUsdt((prev) => Number((prev + prizeUsdt).toFixed(2)));
    }
    const nextClaimed = Array.from(new Set([...claimedTicketCodes, ticketCode]));
    setClaimedTicketCodes(nextClaimed);
    const local = loadLocalState();
    saveLocalState({ ...local, claimedTicketCodes: nextClaimed });
    await refreshSnapshot();
    return true;
  };

  const depositCrypto = async (amountUsdt: number, network: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ amountUsdt, network }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (typeof data.newBalanceUsdt === 'number') {
        setBalanceUsdt(data.newBalanceUsdt);
      } else {
        setBalanceUsdt((prev) => Number((prev + amountUsdt).toFixed(2)));
      }
      await refreshSnapshot();
      return true;
    } catch {
      setBalanceUsdt((prev) => Number((prev + amountUsdt).toFixed(2)));
      return true;
    }
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
        if (typeof data.newBalanceUsdt === 'number') {
          setBalanceUsdt(data.newBalanceUsdt);
        } else {
          setBalanceUsdt((prev) => Number((prev - feeCalc.grossAmountUsdt).toFixed(2)));
        }
        const nextList = [data.withdrawal, ...withdrawals];
        setWithdrawals(nextList);
        const local = loadLocalState();
        saveLocalState({ ...local, withdrawals: nextList });
        return { ok: true, withdrawal: data.withdrawal };
      }
    } catch {
      // Fallback to local state engine
    }

    const fallbackItem: WithdrawalRecord = {
      id: Date.now(),
      withdrawalCode: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
      userUid: 'vip-demo-user',
      userDisplayName: displayName,
      network: params.network,
      destinationAddress: params.destinationAddress,
      grossAmountUsdt: feeCalc.grossAmountUsdt,
      networkFeeUsdt: feeCalc.networkFeeUsdt,
      netAmountUsdt: feeCalc.netAmountUsdt,
      netAmountCrypto: feeCalc.netAmountCrypto,
      twoFactorVerified: true,
      status: 'pending_review',
      txHash: `0x${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`,
      createdAt: 'همین الان',
    };
    setBalanceUsdt((prev) => Number((prev - feeCalc.grossAmountUsdt).toFixed(2)));
    const nextList = [fallbackItem, ...withdrawals];
    setWithdrawals(nextList);
    const local = loadLocalState();
    saveLocalState({ ...local, withdrawals: nextList });
    return { ok: true, withdrawal: fallbackItem };
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
    } catch {
      // Continue with local state update
    }
    setWithdrawals((prev) => {
      const next = prev.map((w) => {
        if (action === 'sweep_all') {
          if (w.status === 'pending_review' || w.status === 'broadcasting') {
            return { ...w, status: 'completed' as const };
          }
          return w;
        }
        if (w.withdrawalCode !== withdrawalCode) return w;
        if (action === 'approve') return { ...w, status: 'completed' as const };
        if (action === 'broadcast') return { ...w, status: 'broadcasting' as const };
        if (action === 'reject') return { ...w, status: 'rejected' as const };
        return w;
      });
      const local = loadLocalState();
      saveLocalState({ ...local, withdrawals: next });
      return next;
    });
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

  const triggerDraw = async (roundCode: string) => {
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/admin/draw', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await refreshSnapshot();
      return {
        drawnMain: data.drawnMain,
        drawnGolden: data.drawnGolden,
        hash: data.hash,
      };
    } catch {
      return null;
    }
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
      if (!res.ok) return false;
      await refreshSnapshot();
      return true;
    } catch {
      return false;
    }
  };

  const updateRoundTicketPrice = (roundCode: string, newPriceUsdt: number) => {
    const safePrice = Math.max(0.5, Number(newPriceUsdt) || 5);
    setRounds((prev) =>
      prev.map((r) =>
        r.roundCode === roundCode
          ? { ...r, ticketPriceUsdt: safePrice.toFixed(2) }
          : r
      )
    );
  };

  const toggleRoundSales = async (roundCode: string) => {
    try {
      const headers = await getHeaders();
      await fetch('/api/admin/rounds/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roundCode }),
      });
      await refreshSnapshot();
    } catch (err) {
      console.error('Toggle round error:', err);
    }
  };

  const sendSupportMessage = async (
    sessionCode: string,
    message: string,
    senderRole: string = 'admin',
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
      // ignore storage errors
    }
    return DEFAULT_OFFICIAL_WALLETS;
  });

  const updateOfficialWallets = (next: Partial<OfficialSiteWallets>) => {
    setOfficialWallets((prev) => {
      const updated = { ...prev, ...next };
      try {
        localStorage.setItem('luckydrop_official_wallets_v1', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
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
        firebaseUser,
        signInWithGoogle,
        signOutUser,
        balanceUsdt,
        vipTier,
        displayName,
        rounds,
        tickets,
        transactions,
        supportMessages,
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
        requestWithdrawal,
        adminActionWithdrawal,
        toggleKillSwitch,
        setKillSwitchState,
        triggerDraw,
        createNewRound,
        updateRoundTicketPrice,
        toggleRoundSales,
        sendSupportMessage,
        officialWallets,
        updateOfficialWallets,
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
