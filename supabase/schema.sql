-- ============================================================================
-- LuckyDrop (زرین لاتاری VIP) — Complete Supabase PostgreSQL Schema & RLS
-- Tables: users, lottery_rounds, tickets, transactions, withdrawals
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'کاربر ویژه VIP',
  balance_usdt NUMERIC(18, 2) NOT NULL DEFAULT 3030.30 CHECK (balance_usdt >= 0),
  vip_tier TEXT NOT NULL DEFAULT 'DIAMOND VIP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. LOTTERY ROUNDS TABLE (Supports Concurrent Multi-Lottery Engine)
CREATE TABLE IF NOT EXISTS public.lottery_rounds (
  id BIGSERIAL PRIMARY KEY,
  round_code TEXT NOT NULL UNIQUE,
  lottery_type TEXT NOT NULL DEFAULT 'MEGA_WEEKLY', -- 'MEGA_WEEKLY' | 'DAILY_BLITZ' | 'HOURLY_FLASH' | 'TON_SPECIAL'
  title_fa TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  subtitle_fa TEXT NOT NULL,
  category TEXT NOT NULL,
  format_label TEXT NOT NULL,
  main_ball_count INT NOT NULL DEFAULT 5,
  main_ball_max INT NOT NULL DEFAULT 50,
  golden_ball_max INT NOT NULL DEFAULT 15,
  jackpot_usdt NUMERIC(18, 2) NOT NULL DEFAULT 150000.00,
  ticket_price_usdt NUMERIC(18, 2) NOT NULL DEFAULT 5.00,
  rtp_percent NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
  sold_percent INT NOT NULL DEFAULT 78,
  remaining_label TEXT NOT NULL,
  draw_time_label TEXT NOT NULL,
  countdown_seconds INT NOT NULL DEFAULT 225529,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  winning_numbers TEXT NOT NULL DEFAULT '[]',
  winning_golden_ball INT NOT NULL DEFAULT 8,
  total_sales_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_payout_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  operator_profit_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  rollover_reserve_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'settled' | 'paused'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TICKETS TABLE (Supports Single & Bulk Multi-Chance Slips + Prize Claiming)
CREATE TABLE IF NOT EXISTS public.tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  batch_id TEXT,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  round_code TEXT NOT NULL REFERENCES public.lottery_rounds(round_code) ON DELETE CASCADE,
  main_numbers TEXT NOT NULL, -- JSON array e.g. "[7,14,23,38,49]"
  golden_ball INT NOT NULL DEFAULT 0,
  cost_usdt NUMERIC(18, 2) NOT NULL,
  currency_network TEXT NOT NULL DEFAULT 'USDT (TRC-20)',
  tx_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'minted', -- 'mempool' | 'confirming' | 'minted' | 'won' | 'claimed'
  win_tier TEXT DEFAULT 'NONE',
  confirmations INT NOT NULL DEFAULT 19,
  prize_won_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL,
  type TEXT NOT NULL, -- 'deposit' | 'ticket_purchase' | 'payout' | 'withdrawal' | 'cold_sweep'
  network TEXT NOT NULL,
  amount_usdt NUMERIC(18, 2) NOT NULL,
  amount_crypto TEXT NOT NULL,
  winner_name TEXT NOT NULL DEFAULT '',
  winner_location TEXT NOT NULL DEFAULT '',
  lottery_title TEXT NOT NULL DEFAULT '',
  winning_combo TEXT NOT NULL DEFAULT '',
  time_ago_label TEXT NOT NULL DEFAULT 'آنی',
  status TEXT NOT NULL DEFAULT 'confirmed',
  block_number BIGINT NOT NULL DEFAULT 61902842,
  confirmations INT NOT NULL DEFAULT 19,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WITHDRAWALS TABLE (Comprehensive Multi-Chain Cash-Out Engine)
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id BIGSERIAL PRIMARY KEY,
  withdrawal_code TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  user_display_name TEXT NOT NULL DEFAULT 'کاربر ویژه VIP',
  network TEXT NOT NULL, -- 'USDT (TRC-20)' | 'TON Network' | 'TRON (TRX)' | 'BNB (BEP-20)' | 'Bitcoin (BTC)'
  destination_address TEXT NOT NULL,
  gross_amount_usdt NUMERIC(18, 2) NOT NULL CHECK (gross_amount_usdt > 0),
  network_fee_usdt NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_amount_usdt NUMERIC(18, 2) NOT NULL,
  net_amount_crypto TEXT NOT NULL,
  two_factor_verified BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review' | 'broadcasting' | 'completed' | 'rejected'
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Public read access for active lottery rounds & on-chain ledger transparency
CREATE POLICY "Public can view lottery rounds"
  ON public.lottery_rounds FOR SELECT
  USING (true);

CREATE POLICY "Public can view verified transactions"
  ON public.transactions FOR SELECT
  USING (true);

-- Authenticated users can view & manage their own profile, tickets, and withdrawals
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = uid OR uid = 'vip-demo-user');

CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid()::text = user_uid OR user_uid = 'vip-demo-user');

CREATE POLICY "Users can insert own tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid()::text = user_uid OR user_uid = 'vip-demo-user');

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid()::text = user_uid OR user_uid = 'vip-demo-user');

CREATE POLICY "Users can request own withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid()::text = user_uid OR user_uid = 'vip-demo-user');
