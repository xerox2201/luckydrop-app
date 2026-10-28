import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  HapticEngine,
  openTelegramNativeShare,
  formatTmaCurrency,
  usdtToTmaCurrency,
} from '../utils/telegramTma.ts';

export const EarnQuestsView: React.FC = () => {
  const {
    telegramUser,
    activeTmaCurrency,
    tonUsdRate,
    starsUsdRate,
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
    simulateReferredTicketPurchase,
    connectWeb3Wallet,
    navigateTo,
  } = useLottery();

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const botReferralUrl = `https://t.me/LuckyDrop_TON_Bot/app?startapp=${referralCode}`;
  const shareText = `🎰 بازی در مینی‌اپ تلگرامی LuckyDrop با TON و Telegram Stars! با لینک دعوت من وارد شو و +2 توپ رایگان Plinko بگیر:`;

  const handleQuestAction = async (questId: (typeof tmaQuests)[number]['id']) => {
    HapticEngine.impactOccurred('medium');
    if (questId === 'CONNECT_TON_WALLET') {
      await connectWeb3Wallet('TON Wallet');
    } else if (questId === 'JOIN_TELEGRAM_CHANNEL') {
      const twa = (window as any)?.Telegram?.WebApp;
      if (twa?.openTelegramLink) {
        try {
          twa.openTelegramLink('https://t.me/LuckyDrop_TON_Official');
        } catch {}
      }
    }
    const res = completeAndClaimTmaQuest(questId);
    setBannerMsg(res.message);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  const handleCopyInviteLink = () => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard?.writeText(botReferralUrl);
    setCopiedLink(true);
    setBannerMsg('✅ لینک دعوت تلگرام شما در کلیپ‌بورد کپی شد!');
    setTimeout(() => {
      setCopiedLink(false);
      setBannerMsg(null);
    }, 3000);
  };

  const handleClaimCommission = async () => {
    HapticEngine.impactOccurred('medium');
    const res = await claimReferralEarningsToWallet();
    setBannerMsg(res.message);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  const handleSimulateFriendBet = async () => {
    HapticEngine.impactOccurred('medium');
    const res = await simulateReferredTicketPurchase(25);
    setBannerMsg(res.message);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const referralCommissionInActiveCurr =
    activeTmaCurrency === 'STARS'
      ? referralEarningsStars > 0
        ? referralEarningsStars
        : usdtToTmaCurrency(referralEarningsTon * tonUsdRate, 'STARS', tonUsdRate, starsUsdRate)
      : referralEarningsTon;

  return (
    <div
      data-testid="tma-earn-quests-view"
      className="space-y-3 px-3 pt-2 pb-24 max-w-[440px] mx-auto"
    >
      {/* Top Bonus Inventory Card */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold tracking-wide text-white">
            🎁 ماموریت‌ها و دعوت دوستان
          </h1>
          <span className="text-xs font-semibold text-[#fbbf24] font-mono tabular-nums" dir="ltr">
            {tmaXpPoints} XP
          </span>
        </div>

        {/* 3 Bonus Token Pills */}
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => navigateTo('mini-games')}
            className="bg-[#090612] hover:bg-purple-950/60 border border-purple-500/20 rounded-xl p-2.5 text-center transition-colors cursor-pointer"
          >
            <strong className="font-mono text-xs font-bold text-[#00f59b] block tabular-nums">
              🟢 {freePlinkoDrops} Drops
            </strong>
            <span className="text-[10px] text-purple-300/60 block mt-0.5">Plinko</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => navigateTo('mini-games')}
            className="bg-[#090612] hover:bg-purple-950/60 border border-purple-500/20 rounded-xl p-2.5 text-center transition-colors cursor-pointer"
          >
            <strong className="font-mono text-xs font-bold text-[#fbbf24] block tabular-nums">
              ✨ {freeScratchCards} Cards
            </strong>
            <span className="text-[10px] text-purple-300/60 block mt-0.5">Scratch</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => navigateTo('lobby')}
            className="bg-[#090612] hover:bg-purple-950/60 border border-purple-500/20 rounded-xl p-2.5 text-center transition-colors cursor-pointer"
          >
            <strong className="font-mono text-xs font-bold text-purple-200 block tabular-nums">
              🎟️ {freeLotteryTickets} Tickets
            </strong>
            <span className="text-[10px] text-purple-300/60 block mt-0.5">Lottery</span>
          </motion.button>
        </div>
      </div>

      {bannerMsg && (
        <div
          data-testid="earn-quest-banner"
          className="p-3 rounded-2xl bg-[#130d24]/90 border border-[#00f59b]/50 text-[#00f59b] text-xs font-semibold"
        >
          {bannerMsg}
        </div>
      )}

      {/* 7-Day Daily Streak Visual Tracker */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-purple-200/80">🔥 استریک چک‌این ۷ روزه</span>
          <span className="font-mono text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
            Day 3 / 7
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5" dir="ltr">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const done = day <= 3;
            return (
              <div
                key={day}
                className={`rounded-xl py-1.5 text-center font-mono text-[10px] font-bold border ${
                  done
                    ? 'bg-purple-600/35 border-purple-400/50 text-white'
                    : 'bg-[#090612] border-purple-500/15 text-purple-300/50'
                }`}
              >
                <div>D{day}</div>
                <div className="text-xs mt-0.5">{day === 7 ? '🎟️' : done ? '✓' : '⭐'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Quests List with Zero-Loss Mathematical Rationale */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-wide text-white">📋 ماموریت‌های روزانه و منطق پاداش</h2>
          <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
            {tmaQuests.filter((q) => q.claimed).length}/{tmaQuests.length} Done
          </span>
        </div>

        <div className="space-y-2.5">
          {tmaQuests.map((quest) => (
            <div
              key={quest.id}
              data-testid={`quest-card-${quest.id}`}
              className="rounded-xl bg-[#090612] border border-purple-500/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white">{quest.titleFa}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#00f59b]">
                      {quest.rewardLabelFa}
                    </span>
                    <span className="text-[10px] font-mono text-purple-300/50 tabular-nums" dir="ltr">
                      ({quest.progress}/{quest.target})
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  data-testid={`claim-quest-${quest.id}`}
                  disabled={quest.claimed}
                  onClick={() => handleQuestAction(quest.id)}
                  className={`h-9 px-3 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                    quest.claimed
                      ? 'bg-purple-950/50 border border-purple-500/20 text-purple-300/50'
                      : 'bg-gradient-to-r from-[#9333ea] to-[#7e22ce] text-white shadow-[0_3px_0_#581c87]'
                  }`}
                >
                  {quest.claimed ? '✓ دریافت شد' : 'دریافت'}
                </motion.button>
              </div>

              {quest.mathRationaleFa && (
                <div className="pt-1.5 border-t border-purple-500/15 text-[10px] text-purple-200/75 leading-relaxed">
                  📐 <strong className="text-[#fbbf24]">منطق اقتصادی تسک:</strong> {quest.mathRationaleFa}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Loss Mathematical Proof Card (تضمین ریاضی عدم ضرر سایت در تسک‌ها، بلیت رایگان و بازی‌ها) */}
      <div
        data-testid="earn-zero-loss-math-audit"
        className="rounded-2xl bg-[#130d24]/90 border border-[#00f59b]/30 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-[#00f59b]">
            🛡️ اثبات ریاضی عدم ضرر پلتفرم (Zero-Loss Mathematical Proof)
          </h3>
          <span className="text-[10px] font-mono text-[#fbbf24]" dir="ltr">
            House Edge 1%–3%
          </span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-purple-100/85 leading-relaxed list-disc pr-4">
          <li>
            <strong className="text-white">فرمول صدور بلیت رایگان لاتاری در بازی‌ها:</strong> بلیت رایگان (به ارزش ۱ TON / $5) در اسلات‌های طلایی Plinko، پرواز بالای 5x در Crash یا عدد 77.77 در Dice تنها زمانی به صورت آنی صادر می‌شود که <strong className="text-[#00f59b]">مبلغ شرط دور حداقل 1.00 TON</strong> باشد و موجودی <strong className="text-[#00f59b]">استخر ذخیره ۳٪ (Rollover Reserve Pool)</strong> آن را پوشش دهد. برای شرط‌های خرد (<strong className="text-white">0.01 تا 0.99 TON</strong>)، به نسبت حاشیه سود کازینو (House Edge) امتیاز <strong className="text-[#fbbf24]">Turnover XP</strong> ذخیره شده و هر ۱۰۰ XP یک بلیت کاملاً پوشش‌داده‌شده صادر می‌گردد.
          </li>
          <li>
            <strong className="text-white">سقف پرداخت پویا بر اساس موجودی خزانه (Dynamic Solvency Cap):</strong> بازیکن می‌تواند از <strong className="text-[#00f59b]">0.01 TON تا بی‌نهایت (کل موجودی)</strong> شرط ببندد، اما حداکثر جایزه هر دور به سقف نقدینگی آزاد خزانه محدود می‌شود تا واریانس شرط‌های سنگین هرگز خزانه را وارد تراز منفی نکند.
          </li>
          <li>
            <strong className="text-white">کمیسیون دعوت دوستان (Referral):</strong> پورسانت دعوت دوستان ضریب ثابتی از اصل پول نیست، بلکه دقیقاً <strong className="text-[#00f59b]">۱۰٪ از سهم سود خالص پلتفرم (22% House Share)</strong> یعنی معادل ۲.۲٪ از فروش بلیت است؛ بنابراین ۱۸.۸٪ سود خالص همواره برای خزانه باقی می‌ماند.
          </li>
        </ul>
      </div>

      {/* Viral Telegram Referral Card */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold tracking-wide text-white">
            🚀 دعوت دوستان (۱۰٪ سهم سود)
          </h3>
          <span className="text-[11px] font-medium text-[#fbbf24] tabular-nums" dir="ltr">
            @{telegramUser.username || 'VIP'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2" dir="ltr">
          <div className="bg-[#090612] border border-purple-500/20 rounded-xl p-2.5">
            <span className="text-[10px] font-medium text-purple-300/50 block">INVITED</span>
            <strong className="text-sm font-mono font-bold text-white tabular-nums">
              {referredTicketsCount} Friends
            </strong>
          </div>
          <div className="bg-[#090612] border border-purple-500/20 rounded-xl p-2.5">
            <span className="text-[10px] font-medium text-purple-300/50 block">COMMISSION</span>
            <strong
              data-testid="referral-commission-balance"
              className="text-sm font-mono font-bold text-[#00f59b] tabular-nums"
            >
              {formatTmaCurrency(referralCommissionInActiveCurr, activeTmaCurrency)}
            </strong>
          </div>
        </div>

        {/* Invite Link Box */}
        <div
          className="h-10 bg-[#090612] border border-purple-500/20 rounded-xl px-3 flex items-center justify-between gap-2"
          dir="ltr"
        >
          <code className="text-[11px] font-mono text-purple-200/80 truncate">{botReferralUrl}</code>
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleCopyInviteLink}
            className="h-7 px-2.5 rounded-lg bg-purple-950/80 text-[11px] font-semibold text-white shrink-0 cursor-pointer"
          >
            {copiedLink ? '✓ Copied' : 'Copy'}
          </motion.button>
        </div>

        {/* Share & Claim Row */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid="telegram-native-share-btn"
            onClick={() => openTelegramNativeShare(botReferralUrl, shareText)}
            className="h-11 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✈️ ارسال دعوت</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid="claim-referral-commission-btn"
            onClick={handleClaimCommission}
            className="h-11 rounded-xl stake-emerald-cta font-bold text-xs text-[#041f14] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>💸 برداشت پورسانت</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={handleSimulateFriendBet}
          className="w-full h-9 rounded-xl bg-[#090612] border border-purple-500/20 text-[11px] font-medium text-purple-300/60 hover:text-white cursor-pointer"
        >
          ⚡ شبیه‌سازی شرط زیرمجموعه (+۱۰٪ کمیسیون)
        </motion.button>
      </div>
    </div>
  );
};
