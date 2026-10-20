import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('کاربر ویژه VIP'),
  balanceUsdt: numeric('balance_usdt', { precision: 18, scale: 2 }).notNull().default('3030.30'),
  vipTier: text('vip_tier').notNull().default('DIAMOND VIP'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lotteryRounds = pgTable('lottery_rounds', {
  id: serial('id').primaryKey(),
  roundCode: text('round_code').notNull().unique(),
  titleFa: text('title_fa').notNull(),
  titleEn: text('title_en').notNull(),
  titleZh: text('title_zh').notNull(),
  subtitleFa: text('subtitle_fa').notNull(),
  category: text('category').notNull(), // 'weekly' | 'turbo' | 'vip'
  formatLabel: text('format_label').notNull(),
  jackpotUsdt: numeric('jackpot_usdt', { precision: 18, scale: 2 }).notNull(),
  ticketPriceUsdt: numeric('ticket_price_usdt', { precision: 18, scale: 2 }).notNull(),
  rtpPercent: numeric('rtp_percent', { precision: 5, scale: 2 }).notNull().default('85.00'),
  soldPercent: integer('sold_percent').notNull().default(78),
  remainingLabel: text('remaining_label').notNull(),
  drawTimeLabel: text('draw_time_label').notNull(),
  serverSeedHash: text('server_seed_hash').notNull(),
  clientSeed: text('client_seed').notNull(),
  winningNumbers: text('winning_numbers').notNull().default('[]'),
  winningGoldenBall: integer('winning_golden_ball').notNull().default(8),
  totalSalesUsdt: numeric('total_sales_usdt', { precision: 18, scale: 2 }).notNull().default('0'),
  totalPayoutUsdt: numeric('total_payout_usdt', { precision: 18, scale: 2 }).notNull().default('0'),
  operatorProfitUsdt: numeric('operator_profit_usdt', { precision: 18, scale: 2 }).notNull().default('0'),
  rolloverReserveUsdt: numeric('rollover_reserve_usdt', { precision: 18, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('active'), // 'active' | 'settled' | 'paused'
  createdAt: timestamp('created_at').defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  ticketCode: text('ticket_code').notNull().unique(),
  userUid: text('user_uid').notNull(),
  roundCode: text('round_code').notNull(),
  mainNumbers: text('main_numbers').notNull(), // JSON array e.g. "[7,14,23,38,49]"
  goldenBall: integer('golden_ball').notNull(),
  costUsdt: numeric('cost_usdt', { precision: 18, scale: 2 }).notNull(),
  currencyNetwork: text('currency_network').notNull().default('USDT (TRC-20)'),
  txHash: text('tx_hash').notNull(),
  clientSeed: text('client_seed').notNull(),
  serverSeedHash: text('server_seed_hash').notNull(),
  commitHash: text('commit_hash').notNull(),
  status: text('status').notNull().default('minted'), // 'mempool' | 'confirming' | 'minted' | 'won'
  confirmations: integer('confirmations').notNull().default(3),
  prizeWonUsdt: numeric('prize_won_usdt', { precision: 18, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  txHash: text('tx_hash').notNull().unique(),
  userUid: text('user_uid').notNull(),
  type: text('type').notNull(), // 'deposit' | 'ticket_purchase' | 'payout' | 'cold_sweep'
  network: text('network').notNull(),
  amountUsdt: numeric('amount_usdt', { precision: 18, scale: 2 }).notNull(),
  amountCrypto: text('amount_crypto').notNull(),
  winnerName: text('winner_name').notNull().default(''),
  winnerLocation: text('winner_location').notNull().default(''),
  lotteryTitle: text('lottery_title').notNull().default(''),
  winningCombo: text('winning_combo').notNull().default(''),
  timeAgoLabel: text('time_ago_label').notNull().default('آنی'),
  status: text('status').notNull().default('confirmed'),
  blockNumber: integer('block_number').notNull().default(61902842),
  confirmations: integer('confirmations').notNull().default(19),
  createdAt: timestamp('created_at').defaultNow(),
});

export const supportMessages = pgTable('support_messages', {
  id: serial('id').primaryKey(),
  sessionCode: text('session_code').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(), // 'user' | 'admin'
  vipLevel: text('vip_level').notNull().default('سطح VIP طلا'),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  walletBalanceLabel: text('wallet_balance_label').notNull().default('250M تومان'),
  historySummary: text('history_summary').notNull().default('سابقه: ۳۸ بلیت در دوره ۱۴۲ | برنده ۳۸۰,۰۰۰,۰۰۰ تومان'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  transactions: many(transactions),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userUid],
    references: [users.uid],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userUid],
    references: [users.uid],
  }),
}));
