import React, { useState } from 'react';
import {
  Gift,
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Users,
  Wallet,
  MessageCircle,
  Calendar,
  Gamepad2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { HapticEngine, TmaQuestItem } from '../utils/telegramTma';
import { tr } from '../utils/i18n';

export const EarnQuestsView: React.FC = () => {
  const {
    lang,
    navigateTo,
    telegramUser,
    tmaQuests,
    completeAndClaimTmaQuest,
    freePlinkoDrops,
    freeScratchCards,
    freeLotteryTickets,
    tmaXpPoints,
    referralCode,
    referralEarningsTon,
    referralEarningsStars,
    referredTicketsCount,
    claimReferralEarningsToWallet,
    formatCurrency,
    connectedTonWallet,
    connectTonWalletOneTap,
    telegramBotConfig,
    tickets,
  } = useLottery();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const botUsernameClean = (
    telegramBotConfig?.botUsername || 'LuckyDrop_TON_Bot'
  ).replace(/^@/, '');
  const officialChannelUrl =
    telegramBotConfig?.officialChannelUrl || 'https://t.me/LuckyDrop_TON_Official';

  const tmaReferralUrl = `https://t.me/${botUsernameClean}/app?startapp=ref_${telegramUser.id}`;

  // Dynamic 7-Day Streak Progress derived from real user quest/activity state (Zero hardcoded Day 3/7)
  const completedQuestsCount = tmaQuests.filter((q) => q.claimed).length;
  const dailyStreakQuest = tmaQuests.find((q) => q.id === 'DAILY_STREAK_7');
  const activeStreakDays = Math.min(
    7,
    Math.max(
      dailyStreakQuest?.claimed ? 1 : 0,
      completedQuestsCount + (tickets.length > 0 ? 1 : 0)
    )
  );

  const handleCopyInviteLink = () => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard.writeText(tmaReferralUrl).catch(() => {});
    setCopiedLink(true);
    showToast(
      tr(
        lang,
        '🔗 لینک دعوت اختصاصی تلگرام شما کپی شد!',
        '🔗 Your Telegram referral link has been copied!'
      )
    );
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleTelegramNativeShare = () => {
    HapticEngine.impactOccurred('medium');
    const shareText = tr(
      lang,
      `🎰 در مینی‌اپ قرعه‌کشی و بازی‌های آنی LuckyDrop TON شرکت کن و با لینک من توپ رایگان Plinko و بلیت هدیه بگیر! 💎⭐`,
      `🎰 Join LuckyDrop TON Mini App for Provably Fair Lotteries & 9 Instant Games! Claim your free Plinko drops with my link! 💎⭐`
    );
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      tmaReferralUrl
    )}&text=${encodeURIComponent(shareText)}`;

    try {
      const twa = (window as any)?.Telegram?.WebApp;
      if (twa?.openTelegramLink) {
        twa.openTelegramLink(tgShareUrl);
        return;
      }
    } catch {
      // fallback
    }
    window.open(tgShareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleQuestAction = async (quest: TmaQuestItem) => {
    if (quest.claimed) {
      showToast(
        tr(
          lang,
          'ℹ️ پاداش این ماموریت قبلاً دریافت شده است.',
          'ℹ️ This quest reward has already been claimed.'
        )
      );
      return;
    }

    if (quest.id === 'CONNECT_TON_WALLET' && !connectedTonWallet) {
      const res = await connectTonWalletOneTap('Tonkeeper');
      if (res.ok) {
        showToast(res.message);
      }
      return;
    }

    if (quest.id === 'JOIN_TELEGRAM_CHANNEL') {
      try {
        const twa = (window as any)?.Telegram?.WebApp;
        if (twa?.openTelegramLink) {
          twa.openTelegramLink(officialChannelUrl);
        }
      } catch {
        // ignore
      }
    }

    const res = completeAndClaimTmaQuest(quest.id);
    showToast(res.message);
  };

  const getQuestIcon = (id: TmaQuestItem['id']) => {
    switch (id) {
      case 'CONNECT_TON_WALLET':
        return <Wallet className="w-5 h-5 text-[#38BDF8]" />;
      case 'JOIN_TELEGRAM_CHANNEL':
        return <MessageCircle className="w-5 h-5 text-[#00F5D4]" />;
      case 'DAILY_STREAK_7':
        return <Calendar className="w-5 h-5 text-[#FFE066]" />;
      case 'PLAY_10_MINIGAMES':
        return <Gamepad2 className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <main className="w-full px-3 pt-3 pb-8 space-y-4 select-none">
      {/* 1. HERO BONUS & TURNOVER-LOCKED REWARDS SUMMARY */}
      <section className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0F0A20] to-[#080512] border border-[#FFD700]/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_26px_rgba(0,0,0,0.55)]">
        <img
          src="/assets/3d/ton-chest-3d.png"
          alt="TON Bonus Chest 3D"
          className="absolute -left-4 -bottom-4 w-28 h-28 object-cover opacity-20 pointer-events-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-black mb-1">
              <Sparkles className="w-3 h-3" />
              <span>
                {tr(
                  lang,
                  'ماموریت‌های تلگرام و پاداش وفاداری',
                  'Telegram Quests & Loyalty Rewards'
                )}
              </span>
            </div>
            <h1 className="text-lg font-black text-white">
              {tr(lang, 'کسب جوایز رایگان و دعوت دوستان', 'Earn Free Drops & Invite Friends')}
            </h1>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_8px_16px_rgba(0,0,0,0.45)] text-center">
            <div className="text-[9px] text-slate-300">{tr(lang, 'امتیاز XP', 'XP Score')}</div>
            <div className="font-mono text-sm font-black text-[#FFE066]" dir="ltr">
              {tmaXpPoints.toLocaleString('en-US')} XP
            </div>
          </div>
        </div>

        {/* User's Active Bonus Inventory */}
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={() => navigateTo('mini-games')}
            className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_8px_16px_rgba(0,0,0,0.45)] text-center cursor-pointer hover:border-[#00F5D4]/40 transition-all"
          >
            <div className="text-base">🟣</div>
            <div className="font-mono text-sm font-black text-[#00F5D4] mt-0.5">
              {freePlinkoDrops}
            </div>
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'توپ رایگان Plinko', 'Free Plinko Drops')}
            </div>
          </div>

          <div
            onClick={() => navigateTo('mini-games')}
            className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_8px_16px_rgba(0,0,0,0.45)] text-center cursor-pointer hover:border-[#FFE066]/40 transition-all"
          >
            <div className="text-base">🎫</div>
            <div className="font-mono text-sm font-black text-[#FFE066] mt-0.5">
              {freeScratchCards}
            </div>
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'کارت اسکرچ هدیه', 'Free Scratch Cards')}
            </div>
          </div>

          <div
            onClick={() => navigateTo('lobby')}
            className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_8px_16px_rgba(0,0,0,0.45)] text-center cursor-pointer hover:border-emerald-400/40 transition-all"
          >
            <div className="text-base">🎟️</div>
            <div className="font-mono text-sm font-black text-emerald-300 mt-0.5">
              {freeLotteryTickets}
            </div>
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'بلیت رایگان لاتاری', 'Free Lottery Slips')}
            </div>
          </div>
        </div>
      </section>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)] text-emerald-200 text-xs font-bold text-center">
          {toastMessage}
        </div>
      )}

      {/* 2. DYNAMIC 7-DAY STREAK BAR (DRIVEN BY REAL USER QUEST/ACTIVITY STATE) */}
      <section className="rounded-3xl p-3.5 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#FFE066]" />
            <h2 className="text-xs font-black text-white">
              {tr(lang, 'استریک حضور ۷ روزه تلگرام', '7-Day Telegram Activity Streak')}
            </h2>
          </div>
          <span
            className="text-[10px] font-mono text-[#00F5D4] font-bold"
            data-testid="streak-counter-badge"
          >
            {tr(lang, `روز ${activeStreakDays} از ۷`, `Day ${activeStreakDays} / 7`)}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1" dir="ltr">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const done = day <= activeStreakDays;
            return (
              <div
                key={day}
                className={`p-1.5 rounded-2xl border text-center ${
                  done
                    ? 'bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFE066] shadow-[inset_0_2px_3px_rgba(255,255,255,0.25),_0_6px_12px_rgba(0,0,0,0.4)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]'
                }`}
              >
                <div className="text-[9px] font-mono font-bold">D{day}</div>
                <div className="text-xs my-0.5">{day === 7 ? '🎁' : done ? '✓' : '•'}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FOUR OFFICIAL TMA QUEST CARDS */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-white flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-[#00F5D4]" />
            <span>
              {tr(
                lang,
                'ماموریت‌های فعال (پاداش در گردش بازی)',
                'Active Quests (Turnover-Locked Rewards)'
              )}
            </span>
          </h2>
          <span className="text-[10px] text-slate-400">
            {tmaQuests.filter((q) => q.claimed).length}/{tmaQuests.length}{' '}
            {tr(lang, 'تکمیل‌شده', 'Completed')}
          </span>
        </div>

        {tmaQuests.map((quest) => (
          <div
            key={quest.id}
            className={`p-3.5 rounded-3xl border shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] transition-all ${
              quest.claimed
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-[#110C22]/90 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),_0_6px_12px_rgba(0,0,0,0.4)] flex items-center justify-center shrink-0">
                  {getQuestIcon(quest.id)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white">
                    {lang === 'EN' ? quest.titleEn : quest.titleFa}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {lang === 'EN'
                      ? quest.id === 'CONNECT_TON_WALLET'
                        ? 'Connect Tonkeeper, MyTonWallet, Tonhub, or Bitget Wallet'
                        : quest.id === 'JOIN_TELEGRAM_CHANNEL'
                        ? 'Join the official community channel for draw alerts'
                        : quest.id === 'DAILY_STREAK_7'
                        ? 'Check in daily to receive a free Scratch Card & XP'
                        : 'Play 10 rounds across any Instant Mini-Game'
                      : quest.subtitleFa}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-xl bg-[#FFD700]/12 border border-[#FFD700]/30 text-[10px] font-black text-[#FFE066]">
                    <span>
                      🎁{' '}
                      {lang === 'EN'
                        ? quest.id === 'CONNECT_TON_WALLET'
                          ? '+2 Free Plinko Drops + 50 XP'
                          : quest.id === 'JOIN_TELEGRAM_CHANNEL'
                          ? '+1 Free Lottery Ticket + 40 XP'
                          : quest.id === 'DAILY_STREAK_7'
                          ? '+1 Free Scratch Card + 35 XP'
                          : '+3 Free Plinko Drops + 80 XP'
                        : quest.rewardLabelFa}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleQuestAction(quest)}
                disabled={quest.claimed}
                data-testid={`quest-claim-btn-${quest.id}`}
                className={`shrink-0 px-3 py-2 rounded-2xl text-[11px] font-black transition-all cursor-pointer ${
                  quest.claimed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] cursor-default'
                    : 'bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_8px_16px_rgba(0,0,0,0.45)] active:scale-95'
                }`}
              >
                {quest.claimed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tr(lang, 'دریافت شد', 'Claimed')}
                  </span>
                ) : quest.id === 'JOIN_TELEGRAM_CHANNEL' ? (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {tr(lang, 'عضویت و بررسی', 'Join & Verify')}
                  </span>
                ) : (
                  tr(lang, 'دریافت پاداش', 'Claim Reward')
                )}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* 4. ZERO-DEFICIT AFFILIATE REFERRAL ENGINE (10% OF HOUSE EDGE) */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#10192E] via-[#0B1120] to-[#070510] border border-[#0098EA]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_12px_26px_rgba(0,0,0,0.55)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#0098EA]/20 border border-[#0098EA]/40 shadow-[inset_0_2px_3px_rgba(255,255,255,0.25),_0_6px_12px_rgba(0,0,0,0.45)] flex items-center justify-center text-[#38BDF8]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                {tr(lang, 'سیستم دعوت دوستان (Affiliate)', 'Telegram Affiliate Program')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {tr(
                  lang,
                  '۱۰٪ از کارمزد هر بازی دوستانتان مستقیماً به کیف پول شما واریز می‌شود',
                  'Earn 10% of the house fee on every ticket & game played by your referrals'
                )}
              </p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-xl bg-[#00F5D4]/15 border border-[#00F5D4]/30 text-[#00F5D4] font-mono text-[10px] font-black">
            10% RevShare
          </span>
        </div>

        {/* Shareable Telegram Mini App Deep Link */}
        <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-left font-mono text-[11px] text-[#38BDF8] truncate" dir="ltr">
            {tmaReferralUrl}
          </div>
          <button
            onClick={handleCopyInviteLink}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 shadow-[inset_0_2px_3px_rgba(255,255,255,0.25),_0_6px_12px_rgba(0,0,0,0.45)] text-white text-[11px] font-bold cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>
              {copiedLink
                ? tr(lang, 'کپی شد!', 'Copied!')
                : tr(lang, 'کپی لینک', 'Copy Link')}
            </span>
          </button>
        </div>

        {/* Native Telegram Share Button */}
        <button
          onClick={handleTelegramNativeShare}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0098EA] via-[#00B4D8] to-[#00F5D4] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.55),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>
            {tr(
              lang,
              'ارسال دعوت‌نامه مستقیم در چت‌های تلگرام',
              'Share Invite Link in Telegram Chats'
            )}
          </span>
        </button>

        {/* Referral Stats & Claim Commission */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'دوستان دعوت‌شده فعال', 'Active Referrals')}
            </div>
            <div className="font-mono text-sm font-black text-white mt-0.5">
              {referredTicketsCount} {tr(lang, 'نفر / تراکنش', 'Users')}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)]">
            <div className="text-[10px] text-slate-400">
              {tr(lang, 'کمیسیون قابل برداشت', 'Claimable Commission')}
            </div>
            <div className="font-mono text-sm font-black text-[#00F5D4] mt-0.5" dir="ltr">
              {formatCurrency(referralEarningsTon, 'TON')}
              {referralEarningsStars > 0 ? ` + ${referralEarningsStars} ⭐` : ''}
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const res = await claimReferralEarningsToWallet();
            showToast(res.message);
          }}
          className="w-full py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_10px_20px_rgba(0,0,0,0.5)] text-emerald-300 font-black text-xs transition-all cursor-pointer"
        >
          {tr(lang, '💸 انتقال کمیسیون به کیف پول اصلی', '💸 Transfer Commission to Main Wallet')}
        </button>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
          <span>
            {tr(
              lang,
              `کد معرف اختصاصی شما: ${referralCode} • تسویه آنی از کارمزد پلتفرم`,
              `Your Referral Code: ${referralCode} • Instant Revenue Share Settlement`
            )}
          </span>
        </div>
      </section>
    </main>
  );
};
