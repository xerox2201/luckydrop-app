import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  CurrencyLang,
  ExchangeRates,
  DEFAULT_FX_RATES,
  formatMultiCurrency,
} from '../utils/lotteryEngine.ts';

export type AppRoute =
  | 'lobby'
  | 'play'
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
  titleFa: string;
  titleEn: string;
  titleZh: string;
  subtitleFa: string;
  category: string;
  formatLabel: string;
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
  killSwitchActive: boolean;
  depositModalOpen: boolean;
  setDepositModalOpen: (open: boolean) => void;
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  selectedMainBalls: number[];
  setSelectedMainBalls: React.Dispatch<React.SetStateAction<number[]>>;
  selectedGoldenBall: number;
  setSelectedGoldenBall: React.Dispatch<React.SetStateAction<number>>;
  activeTrackingTicket: TicketItem | null;
  setActiveTrackingTicket: (t: TicketItem | null) => void;
  refreshSnapshot: () => Promise<void>;
  mintTicket: (network?: string) => Promise<{ ok: boolean; error?: string; ticket?: TicketItem }>;
  depositCrypto: (amountUsdt: number, network: string) => Promise<boolean>;
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
  toggleRoundSales: (roundCode: string) => Promise<void>;
  sendSupportMessage: (sessionCode: string, message: string, senderRole?: string, senderName?: string) => Promise<boolean>;
}

const LotteryContext = createContext<LotteryContextType | null>(null);

const resolveInitialRoute = (): AppRoute => {
  if (typeof window === 'undefined') return 'lobby';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/terms') || path.startsWith('/rules')) return 'terms';
  if (path.startsWith('/ops/launch')) return 'launch';
  if (path.startsWith('/ops-k82-cockpit')) return 'cockpit';
  if (path.startsWith('/admin/finances')) return 'finances';
  if (path === '/admin' || path.startsWith('/404')) return '404';
  if (path.startsWith('/transparency')) return 'transparency';
  if (path.startsWith('/status')) return 'status';
  if (path.startsWith('/play') || path.startsWith('/deposit')) return 'play';
  return 'lobby';
};

const ROUTE_TO_PATH: Record<AppRoute, string> = {
  lobby: '/',
  play: '/play',
  status: '/status/tx',
  transparency: '/transparency',
  cockpit: '/ops-k82-cockpit',
  finances: '/admin/finances',
  launch: '/ops/launch',
  terms: '/terms',
  '404': '/404',
};

export const LotteryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(resolveInitialRoute);
  const [stealthCookieAuthorized, setStealthCookieAuthorized] = useState<boolean>(true);
  const [lang, setLangState] = useState<CurrencyLang>('FA');
  const [fxRates, setFxRates] = useState<ExchangeRates>(DEFAULT_FX_RATES);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const authTokenRef = useRef<string | null>(null);

  const [balanceUsdt, setBalanceUsdt] = useState<number>(3030.3);
  const [vipTier, setVipTier] = useState<string>('DIAMOND VIP');
  const [displayName, setDisplayName] = useState<string>('کامران سهرابی (VIP)');
  const [rounds, setRounds] = useState<LotteryRoundItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessageItem[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);

  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [selectedMainBalls, setSelectedMainBalls] = useState<number[]>([7, 14, 23, 38, 49]);
  const [selectedGoldenBall, setSelectedGoldenBall] = useState<number>(3);
  const [activeTrackingTicket, setActiveTrackingTicket] = useState<TicketItem | null>(null);

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
      if (Array.isArray(data.rounds)) setRounds(data.rounds);
      if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        if (data.tickets.length > 0) {
          setActiveTrackingTicket((prev) => prev || data.tickets[0]);
        }
      }
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (Array.isArray(data.supportMessages)) setSupportMessages(data.supportMessages);
      if (typeof data.killSwitchActive === 'boolean') setKillSwitchActive(data.killSwitchActive);
      if (data.fxRates) setFxRates(data.fxRates);
    } catch (error) {
      console.error('Snapshot fetch error:', error);
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
    try {
      const headers = await getHeaders();
      const clientSeed = `zarrin-vip-${Math.random().toString(16).slice(2, 10)}`;
      const res = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roundCode: '#ZRN-8493',
          mainNumbers: selectedMainBalls,
          goldenBall: selectedGoldenBall,
          costUsdt: 5.0,
          currencyNetwork: network,
          clientSeed,
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
      }
      if (data.ticket) {
        setActiveTrackingTicket(data.ticket);
      }
      await refreshSnapshot();
      return { ok: true, ticket: data.ticket };
    } catch (err: any) {
      return { ok: false, error: err.message || 'خطا در ارتباط با سرور' };
    }
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
      }
      await refreshSnapshot();
      return true;
    } catch {
      return false;
    }
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
        killSwitchActive,
        depositModalOpen,
        setDepositModalOpen,
        aiChatOpen,
        setAiChatOpen,
        selectedMainBalls,
        setSelectedMainBalls,
        selectedGoldenBall,
        setSelectedGoldenBall,
        activeTrackingTicket,
        setActiveTrackingTicket,
        refreshSnapshot,
        mintTicket,
        depositCrypto,
        toggleKillSwitch,
        setKillSwitchState,
        triggerDraw,
        createNewRound,
        toggleRoundSales,
        sendSupportMessage,
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
