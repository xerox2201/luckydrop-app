import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MULTI_LOTTERY_SPECS,
  WithdrawalNetwork,
  computeDeterministicHash,
} from '../utils/lotteryEngine.ts';

const supabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;
const supabaseAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    : undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 15
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface WithdrawalRecord {
  id: number;
  withdrawalCode: string;
  userUid: string;
  userDisplayName: string;
  network: WithdrawalNetwork;
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

const LOCAL_STORAGE_KEY = 'luckydrop_vip_persistent_state_v5';

export interface PersistentLocalState {
  withdrawals: WithdrawalRecord[];
  claimedTicketCodes: string[];
  customRoundsCreated: any[];
}

const INITIAL_WITHDRAWALS: WithdrawalRecord[] = [
  {
    id: 901,
    withdrawalCode: 'WD-884120',
    userUid: 'vip-demo-user',
    userDisplayName: 'کامران سهرابی (VIP)',
    network: 'TON Network',
    destinationAddress: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
    grossAmountUsdt: 450.0,
    networkFeeUsdt: 0.25,
    netAmountUsdt: 449.75,
    netAmountCrypto: '86.49 TON',
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

export function loadLocalState(): PersistentLocalState {
  if (typeof window === 'undefined') {
    return {
      withdrawals: INITIAL_WITHDRAWALS,
      claimedTicketCodes: [],
      customRoundsCreated: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seed: PersistentLocalState = {
        withdrawals: INITIAL_WITHDRAWALS,
        claimedTicketCodes: [],
        customRoundsCreated: [],
      };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return {
      withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : INITIAL_WITHDRAWALS,
      claimedTicketCodes: Array.isArray(parsed.claimedTicketCodes) ? parsed.claimedTicketCodes : [],
      customRoundsCreated: Array.isArray(parsed.customRoundsCreated) ? parsed.customRoundsCreated : [],
    };
  } catch {
    return {
      withdrawals: INITIAL_WITHDRAWALS,
      claimedTicketCodes: [],
      customRoundsCreated: [],
    };
  }
}

export function saveLocalState(state: PersistentLocalState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export const SUPABASE_SQL_SCHEMA_DDL = `-- LuckyDrop (زرین لاتاری VIP) — Supabase Production Schema & RLS
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'کاربر ویژه VIP',
  balance_usdt NUMERIC(18, 2) NOT NULL DEFAULT 3030.30 CHECK (balance_usdt >= 0),
  vip_tier TEXT NOT NULL DEFAULT 'DIAMOND VIP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lottery_rounds (
  id BIGSERIAL PRIMARY KEY,
  round_code TEXT NOT NULL UNIQUE,
  lottery_type TEXT NOT NULL DEFAULT 'MEGA_WEEKLY',
  title_fa TEXT NOT NULL,
  jackpot_usdt NUMERIC(18, 2) NOT NULL DEFAULT 150000.00,
  ticket_price_usdt NUMERIC(18, 2) NOT NULL DEFAULT 5.00,
  rtp_percent NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  winning_numbers TEXT NOT NULL DEFAULT '[]',
  winning_golden_ball INT NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  batch_id TEXT,
  user_uid TEXT NOT NULL REFERENCES public.users(uid),
  round_code TEXT NOT NULL REFERENCES public.lottery_rounds(round_code),
  main_numbers TEXT NOT NULL,
  golden_ball INT NOT NULL DEFAULT 0,
  cost_usdt NUMERIC(18, 2) NOT NULL,
  currency_network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'minted',
  prize_won_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL,
  type TEXT NOT NULL,
  network TEXT NOT NULL,
  amount_usdt NUMERIC(18, 2) NOT NULL,
  amount_crypto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  block_number BIGINT NOT NULL DEFAULT 61902842,
  confirmations INT NOT NULL DEFAULT 19,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id BIGSERIAL PRIMARY KEY,
  withdrawal_code TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL REFERENCES public.users(uid),
  network TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  gross_amount_usdt NUMERIC(18, 2) NOT NULL,
  network_fee_usdt NUMERIC(18, 2) NOT NULL,
  net_amount_usdt NUMERIC(18, 2) NOT NULL,
  net_amount_crypto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;`;

export { MULTI_LOTTERY_SPECS, computeDeterministicHash };
