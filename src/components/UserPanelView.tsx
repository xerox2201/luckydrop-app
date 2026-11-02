import React, { useState } from 'react';
import {
  User,
  Wallet,
  ShieldCheck,
  Sparkles,
  Copy,
  CheckCircle2,
  Ticket,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Link2,
  Users,
  Gift,
  Coins,
  ArrowLeft,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { evaluateZeroLossLoyaltyChest } from '../utils/lotteryEngine';
import { HapticEngine } from '../utils/telegramTma';
import { tr } from '../utils/i18n';

export const UserPanelView: React.FC = () => {
  const {
    lang,
    navigateTo,
    telegramUser,
    displayName,
    vipTier,
    tonBalance,
    starsBalance,
    balanceUsdt,
    formatAmount,
    formatCurrency,
    tickets,
    withdrawals,
    deposits,
    connectedTonWallet,
    connectTonWalletOneTap,
    disconnectTonWallet,
    telegramUsername,
    referralCode,
    referredByCode,
    applyReferralCode,
    claimReferralEarningsToWallet,
    referralEarningsTon,
    referredTicketsCount,
    referralEvents,
    rolloverReservePoolUsdt,
    chestsClaimedCount,
    openLoyaltyChest,
    telegramBotConfig,
  } = useLottery();

  const [referralInput, setReferralInput] = useState(referredByCode || '');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const handleCopy = (key: string, text: string) => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const botUsernameClean = (
    telegramBotConfig?.botUsername || 'LuckyDrop_TON_Bot'
  ).replace(/^@/, '');
  const myReferralShareUrl = `https://t.me/${botUsernameClean}/app?startapp=ref_${telegramUser.id}`;

  const totalSpentUsdt = tickets.reduce((s, t) => s + (parseFloat(t.costUsdt) || 0), 0);
  const chestReport = evaluateZeroLossLoyaltyChest({
    totalTicketsPurchased: tickets.length,
    totalSpentUsdt,
    chestsClaimedCount,
    availableRolloverReservePoolUsdt: rolloverReservePoolUsdt,
    ticketsPerChest: 3,
  });

  return (
    <main
      data-testid="user-panel-view"
      className="w-full max-w-[440px] mx-auto px-3 pt-2 pb-24 space-y-3.5 select-none"
    >
      {/* Sticky Back Header */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <button
          type="button"
          data-testid="back-to-lobby-from-profile"
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('lobby');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_6px_14px_rgba(0,0,0,0.45)] text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr(lang, 'بازگشت به لابی', 'Back to Lobby')}
        </button>
        <div className="flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#FFE066]" />
          <span className="text-xs font-black text-white">
            {tr(lang, 'پروفایل VIP و صندوقچه وفاداری', 'VIP Profile & Loyalty Chest')}
          </span>
        </div>
      </div>

      {statusToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)] text-emerald-200 text-xs font-bold text-center">
          {statusToast}
        </div>
      )}

      {/* 1. USER PROFILE & BALANCE CARD */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#FFD700]/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_26px_rgba(0,0,0,0.55)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_6px_14px_rgba(0,0,0,0.45)] flex items-center justify-center text-slate-950 font-black text-base shrink-0">
              {displayName ? displayName.slice(0, 1).toUpperCase() : 'V'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white truncate">{displayName}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[9px] font-mono font-black text-[#FFE066]">
                  {vipTier}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate" dir="ltr">
                TG ID: #{telegramUser.id} • {telegramUsername}
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-black text-emerald-300 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            {tr(lang, 'حساب تلگرام تاییدشده', 'Telegram Verified')}
          </span>
        </div>

        {/* Real Wallet Balances */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'موجودی TON', 'TON Balance')}
            </div>
            <div className="text-sm font-mono font-black text-[#00F5D4] mt-0.5" dir="ltr">
              {formatCurrency(tonBalance, 'TON')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'موجودی ستاره‌ها', 'Stars Balance')}
            </div>
            <div className="text-sm font-mono font-black text-[#FFE066] mt-0.5" dir="ltr">
              {formatCurrency(starsBalance, 'STARS')}
            </div>
          </div>
        </div>

        {/* Deposit / Withdraw Quick Triggers */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigateTo('wallet')}
            className="py-2.5 rounded-2xl bg-[#00F5D4] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_8px_16px_rgba(0,0,0,0.45)] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            {tr(lang, 'شارژ آنی کیف پول', 'Deposit Now')}
          </button>
          <button
            onClick={() => navigateTo('wallet')}
            className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_8px_16px_rgba(0,0,0,0.45)] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-[#FFE066]" />
            {tr(lang, 'برداشت جوایز', 'Withdraw')}
          </button>
        </div>
      </section>

      {/* 2. REAL TON CONNECT 2.0 WALLET STATUS */}
      <section className="rounded-3xl p-3.5 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-[#0098EA]" />
            <h2 className="text-xs font-black text-white">
              {tr(lang, 'وضعیت کیف پول غیرحضانتی TON Connect', 'TON Connect 2.0 Wallet Status')}
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
              connectedTonWallet
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            {connectedTonWallet
              ? tr(lang, 'متصل (Connected)', 'Connected')
              : tr(lang, 'متصل نیست', 'Disconnected')}
          </span>
        </div>

        {connectedTonWallet ? (
          <div className="p-2.5 rounded-2xl bg-black/40 border border-emerald-500/25 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-300 font-bold">
                {connectedTonWallet.provider}
              </div>
              <div className="text-[11px] font-mono text-white truncate" dir="ltr">
                {connectedTonWallet.address}
              </div>
            </div>
            <button
              onClick={disconnectTonWallet}
              className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-400/30 shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),_0_6px_12px_rgba(0,0,0,0.4)] text-[10px] font-bold text-rose-300 cursor-pointer shrink-0"
            >
              {tr(lang, 'قطع اتصال', 'Disconnect')}
            </button>
          </div>
        ) : (
          <button
            onClick={async () => {
              const res = await connectTonWalletOneTap('Tonkeeper');
              showToast(res.message);
            }}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.55),_0_10px_20px_rgba(0,0,0,0.5)] font-black text-xs cursor-pointer"
          >
            {tr(
              lang,
              '💎 اتصال ۱-کلیکی کیف پول TON (Tonkeeper / MyTonWallet)',
              '💎 1-Tap Connect TON Wallet (Tonkeeper / MyTonWallet)'
            )}
          </button>
        )}
      </section>

      {/* 3. ZERO-LOSS VIP LOYALTY CHEST (3% ROLLOVER RESERVE) */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#1B1308] via-[#110C22] to-[#080512] border border-[#FFD700]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_26px_rgba(0,0,0,0.55)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#FFE066]" />
            <div>
              <h2 className="text-xs font-black text-white">
                {tr(lang, 'صندوقچه وفاداری طلایی (Loyalty Chest)', 'Golden VIP Loyalty Chest')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {tr(
                  lang,
                  'هر ۳ بلیت خریداری‌شده = ۱ کلید بازگشایی صندوقچه از محل ۳٪ ذخیره سرریز',
                  'Every 3 lottery tickets purchased unlocks 1 Loyalty Chest from the 3% reserve'
                )}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-black text-[#FFE066]" dir="ltr">
            {tickets.length % 3} / 3 🎟️
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-black/50 border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFE066] to-[#00F5D4] transition-all duration-300"
            style={{ width: `${chestReport.progressToNextChestPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[9px] text-slate-400">
              {tr(lang, 'صندوقچه آماده', 'Available Chests')}
            </div>
            <div className="text-xs font-mono font-black text-[#FFE066] mt-0.5">
              {chestReport.chestsAvailableToOpen}
            </div>
          </div>
          <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[9px] text-slate-400">
              {tr(lang, 'ذخیره استخر ۳٪', '3% Reserve Pool')}
            </div>
            <div className="text-xs font-mono font-black text-[#00F5D4] mt-0.5" dir="ltr">
              {formatAmount(rolloverReservePoolUsdt)}
            </div>
          </div>
          <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[9px] text-slate-400">
              {tr(lang, 'صندوقچه‌های بازشده', 'Chests Claimed')}
            </div>
            <div className="text-xs font-mono font-black text-white mt-0.5">
              {chestsClaimedCount}
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const res = await openLoyaltyChest();
            showToast(res.message);
          }}
          disabled={chestReport.chestsAvailableToOpen <= 0}
          className={`w-full py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            chestReport.chestsAvailableToOpen > 0
              ? 'bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_10px_20px_rgba(0,0,0,0.5)]'
              : 'bg-white/5 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12)] text-slate-500 cursor-not-allowed'
          }`}
        >
          {chestReport.chestsAvailableToOpen > 0
            ? tr(lang, '🎁 باز کردن صندوقچه طلایی و دریافت جایزه', '🎁 Open Golden Chest & Claim Bonus')
            : tr(
                lang,
                `🔒 ${chestReport.ticketsUntilNextChest} بلیت دیگر تا باز شدن صندوقچه بعدی`,
                `🔒 Buy ${chestReport.ticketsUntilNextChest} more ticket(s) to unlock next chest`
              )}
        </button>
      </section>

      {/* 4. AFFILIATE REFERRAL & INVITER CODE BINDING */}
      <section className="rounded-3xl p-4 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-xs font-black text-white">
              {tr(lang, 'سیستم دعوت و کد معرف (Anti-Sybil)', 'Affiliate & Referral Binding')}
            </h2>
          </div>
          <span className="font-mono text-[10px] text-[#00F5D4] font-bold">{referralCode}</span>
        </div>

        {/* Share Link Copy */}
        <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-[#38BDF8] truncate" dir="ltr">
            {myReferralShareUrl}
          </span>
          <button
            onClick={() => handleCopy('ref_link', myReferralShareUrl)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 shadow-[inset_0_2px_3px_rgba(255,255,255,0.25),_0_6px_12px_rgba(0,0,0,0.45)] text-[10px] font-bold text-white shrink-0 cursor-pointer"
          >
            {copiedKey === 'ref_link'
              ? tr(lang, 'کپی شد', 'Copied')
              : tr(lang, 'کپی لینک', 'Copy')}
          </button>
        </div>

        {/* Bind Inviter Code */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value)}
            placeholder={tr(lang, 'کد معرف (مثلاً ref_1001)', 'Enter inviter code (e.g. ref_1001)')}
            disabled={Boolean(referredByCode)}
            className="flex-1 bg-black/40 border border-white/15 rounded-2xl px-3 py-2 text-xs font-mono text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:border-[#00F5D4]"
            dir="ltr"
          />
          <button
            onClick={() => {
              const res = applyReferralCode(referralInput);
              showToast(res.message);
            }}
            disabled={Boolean(referredByCode)}
            className="px-3.5 py-2 rounded-2xl bg-[#00F5D4]/20 border border-[#00F5D4]/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_8px_16px_rgba(0,0,0,0.45)] text-[#00F5D4] text-xs font-black cursor-pointer disabled:opacity-50"
          >
            {referredByCode ? tr(lang, 'ثبت شده', 'Bound') : tr(lang, 'ثبت کد', 'Bind')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'زیرمجموعه‌های فعال', 'Active Referrals')}
            </div>
            <div className="text-xs font-mono font-black text-white mt-0.5">
              {referredTicketsCount}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'کمیسیون قابل برداشت', 'Claimable Commission')}
            </div>
            <div className="text-xs font-mono font-black text-[#00F5D4] mt-0.5" dir="ltr">
              {formatCurrency(referralEarningsTon, 'TON')}
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const res = await claimReferralEarningsToWallet();
            showToast(res.message);
          }}
          className="w-full py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_10px_20px_rgba(0,0,0,0.5)] text-emerald-300 font-black text-xs cursor-pointer"
        >
          {tr(lang, '💸 انتقال کمیسیون به موجودی اصلی', '💸 Claim Commission to Wallet')}
        </button>
      </section>

      {/* 5. ACCOUNT SUMMARY STATS */}
      <section className="grid grid-cols-3 gap-2 text-center">
        <div
          onClick={() => navigateTo('my-tickets')}
          className="p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <Ticket className="w-4 h-4 text-[#FFE066] mx-auto mb-1" />
          <div className="text-xs font-mono font-black text-white">{tickets.length}</div>
          <div className="text-[10px] text-slate-400">
            {tr(lang, 'کل بلیت‌ها', 'Total Tickets')}
          </div>
        </div>
        <div
          onClick={() => navigateTo('wallet')}
          className="p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <Coins className="w-4 h-4 text-[#00F5D4] mx-auto mb-1" />
          <div className="text-xs font-mono font-black text-white">{deposits.length}</div>
          <div className="text-[10px] text-slate-400">
            {tr(lang, 'واریزهای موفق', 'Deposits')}
          </div>
        </div>
        <div
          onClick={() => navigateTo('wallet')}
          className="p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <Send className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <div className="text-xs font-mono font-black text-white">{withdrawals.length}</div>
          <div className="text-[10px] text-slate-400">
            {tr(lang, 'برداشت‌ها', 'Withdrawals')}
          </div>
        </div>
      </section>
    </main>
  );
};
