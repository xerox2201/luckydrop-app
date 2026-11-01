import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Gamepad2,
  Gift,
  Lock,
  Target,
  Ticket,
  Trophy,
  UserCheck,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { generateBulkQuickPickSlips, formatCountdownHMS } from '../utils/lotteryEngine';
import { HapticEngine } from '../utils/telegramTma';
import { tr } from '../utils/i18n';

export const LobbyView: React.FC = () => {
  const {
    lang,
    navigateTo,
    rounds,
    activeRoundCode,
    setActiveRoundCode,
    activeLotterySpec,
    lotteryTimers,
    activeTmaCurrency,
    tonUsdRate,
    starsUsdRate,
    formatActiveTmaAmount,
    mintBulkTickets,
    tickets,
    setViralCardTicket,
  } = useLottery();

  const [buyingQty, setBuyingQty] = useState<number | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  const activeRoundObj =
    rounds.find((r) => r.roundCode === activeRoundCode) || rounds[0] || null;

  const remainingSec = activeRoundObj?.drawTargetTimestampMs
    ? Math.max(0, Math.floor((activeRoundObj.drawTargetTimestampMs - Date.now()) / 1000))
    : lotteryTimers[activeLotterySpec.id] || 3600;

  const countdown = formatCountdownHMS(remainingSec);
  const unitPriceUsdt = activeLotterySpec.ticketPriceUsdt;

  const handleQuickBuy = async (qty: number) => {
    HapticEngine.impactOccurred('medium');
    setBuyingQty(qty);
    setPurchaseToast(null);

    const slips = generateBulkQuickPickSlips(
      qty,
      activeLotterySpec.mainCount,
      activeLotterySpec.mainMax,
      activeLotterySpec.goldenMax,
      `tma_qp_${Date.now()}`
    );
    const totalCostUsdt = Number((qty * unitPriceUsdt).toFixed(2));
    const unitPriceTon = Number((unitPriceUsdt / (tonUsdRate || 5)).toFixed(2));
    const unitPriceStars = Math.max(1, Math.round(unitPriceUsdt / (starsUsdRate || 0.02)));
    const exactCostTon = Number((qty * unitPriceTon).toFixed(2));
    const exactCostStars = Math.round(qty * unitPriceStars);

    const res = await mintBulkTickets(
      slips,
      activeLotterySpec.roundCode,
      totalCostUsdt,
      activeTmaCurrency === 'STARS' ? 'Telegram Stars' : 'TON Network',
      {
        currency: activeTmaCurrency,
        amountTon: exactCostTon,
        amountStars: exactCostStars,
      }
    );

    setBuyingQty(null);
    if (res.ok && res.tickets && res.tickets.length > 0) {
      HapticEngine.notificationOccurred('success');
      setPurchaseToast(
        tr(
          lang,
          `🎉 ${qty} بلیت در دور ${activeLotterySpec.roundCode} با موفقیت صادر شد!`,
          `🎉 ${qty} ticket(s) minted in round ${activeLotterySpec.roundCode}!`
        )
      );
      setTimeout(() => setPurchaseToast(null), 4000);
    } else if (res.error) {
      HapticEngine.notificationOccurred('error');
      setPurchaseToast(`⚠️ ${res.error}`);
      setTimeout(() => setPurchaseToast(null), 4000);
    }
  };

  const myActiveTicketsInRound = tickets.filter(
    (t) => t.roundCode === activeLotterySpec.roundCode
  );

  return (
    <main className="w-full px-3 pt-3 pb-6 space-y-3.5 select-none">
      {/* 1. COMPACT ROUND SELECTOR PILLS */}
      {rounds.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {rounds.map((r) => {
            const isSelected = r.roundCode === activeLotterySpec.roundCode;
            return (
              <button
                key={r.roundCode}
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setActiveRoundCode(r.roundCode);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0098EA]/25 to-[#FFD700]/20 border-[#FFD700]/60 text-white shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                    : 'bg-[#110C22]/80 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4] animate-pulse" />
                <span>{lang === 'EN' ? r.titleEn || r.titleFa : r.titleFa}</span>
                <span className="font-mono text-[10px] text-[#FFE066]">
                  {r.roundCode}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. HERO PARI-MUTUEL JACKPOT CARD WITH 3D VISUALS */}
      <section className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#FFD700]/30 shadow-[0_14px_35px_rgba(0,0,0,0.65)]">
        <img
          src="/assets/3d/hero-jackpot-3d.png"
          alt="3D TON Jackpot"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-[#0098EA]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badge Row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F5D4]/12 border border-[#00F5D4]/35 text-[#00F5D4] text-[10px] font-black">
            <Sparkles className="w-3 h-3" />
            <span>
              {tr(lang, 'استخر جوایز زنده (۸۵٪ توزیع مستقیم)', 'Live Pool (85% Direct Payout)')}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
            {activeLotterySpec.roundCode}
          </span>
        </div>

        {/*Round Title & Live Pool Amount */}
        <div className="relative z-10 text-center my-3">
          <div className="text-xs font-bold text-slate-300 mb-1">
            {lang === 'EN'
              ? activeRoundObj?.titleEn || activeLotterySpec.titleEn || activeLotterySpec.titleFa
              : activeLotterySpec.titleFa}
          </div>
          <div
            className="text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-[#FFF6D6] via-[#FFE066] to-[#00F5D4] bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,215,0,0.3)]"
            dir="ltr"
          >
            {formatActiveTmaAmount(activeLotterySpec.jackpotUsdt)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {tr(lang, 'قیمت هر بلیت:', 'Ticket Price:')}{' '}
            <span className="font-mono font-bold text-white" dir="ltr">
              {formatActiveTmaAmount(unitPriceUsdt)}
            </span>{' '}
            •{' '}
            {tr(
              lang,
              `${activeLotterySpec.mainCount} گوی از ${activeLotterySpec.mainMax}`,
              `${activeLotterySpec.mainCount}/${activeLotterySpec.mainMax} Balls`
            )}
          </div>
        </div>

        {/* Live Countdown Boxes */}
        <div className="relative z-10 flex items-center justify-between bg-[#090614]/85 border border-white/10 rounded-2xl p-2.5 mb-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Clock className="w-4 h-4 text-[#FFE066]" />
            <span>{tr(lang, 'قرعه‌کشی خودکار راس تایم:', 'Auto Draw In:')}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs font-black" dir="ltr">
            <span className="px-2 py-1 rounded-lg bg-white/10 text-white">
              {countdown.hours}h
            </span>
            <span className="text-[#FFE066]">:</span>
            <span className="px-2 py-1 rounded-lg bg-white/10 text-white">
              {countdown.minutes}m
            </span>
            <span className="text-[#FFE066]">:</span>
            <span className="px-2 py-1 rounded-lg bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/30">
              {countdown.seconds}s
            </span>
          </div>
        </div>

        {/* 1-TAP QUICK PICK BUTTONS */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
            <span className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#FFE066]" />
              {tr(lang, 'خرید سریع ۱-کلیکی (انتخاب تصادفی هوشمند):', '1-Tap Quick Pick (Auto Numbers):')}
            </span>
            <span className="font-mono text-[10px] text-[#00F5D4]">Provably Fair</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10].map((qty) => {
              const costUsdt = qty * unitPriceUsdt;
              const isBusy = buyingQty === qty;
              return (
                <button
                  key={qty}
                  disabled={buyingQty !== null}
                  onClick={() => handleQuickBuy(qty)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border font-bold transition-all cursor-pointer active:scale-95 ${
                    qty === 5
                      ? 'bg-gradient-to-b from-[#FFE066] to-[#B8860B] text-slate-950 border-[#FFE066] shadow-[0_6px_20px_rgba(255,215,0,0.3)]'
                      : 'bg-[#171130] hover:bg-[#1E163D] text-white border-white/15'
                  }`}
                >
                  <span className="text-xs font-black">
                    {isBusy
                      ? tr(lang, 'در حال صدور...', 'Minting...')
                      : tr(lang, `🎟️ ${qty} بلیت`, `🎟️ ${qty} Slip${qty > 1 ? 's' : ''}`)}
                  </span>
                  <span
                    className={`text-[10px] font-mono mt-0.5 ${
                      qty === 5 ? 'text-slate-900 font-black' : 'text-[#00F5D4]'
                    }`}
                    dir="ltr"
                  >
                    {formatActiveTmaAmount(costUsdt)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* PROMINENT CUSTOM BALL PICKER & MY TICKETS BUTTONS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                HapticEngine.selectionChanged();
                navigateTo('play');
              }}
              data-testid="custom-pick-btn"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#00F5D4]/15 hover:bg-[#00F5D4]/25 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Target className="w-4 h-4 shrink-0" />
              <span>{tr(lang, '🎯 انتخاب دستی شماره‌ها', '🎯 Custom Pick')}</span>
            </button>

            <button
              onClick={() => {
                HapticEngine.selectionChanged();
                navigateTo('my-tickets');
              }}
              data-testid="lobby-my-tickets-btn"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-100 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              <Ticket className="w-4 h-4 text-[#FFE066] shrink-0" />
              <span>
                {tr(
                  lang,
                  `🎟️ بلیت‌های من (${tickets.length})`,
                  `🎟️ My Tickets (${tickets.length})`
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Purchase Feedback Toast */}
        {purchaseToast && (
          <div className="relative z-10 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
            {purchaseToast}
          </div>
        )}
      </section>

      {/* 3. QUICK LAUNCHER FOR INSTANT GAMES & EARN QUESTS */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('mini-games');
          }}
          className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br from-[#121D38] to-[#0B1022] border border-[#00F5D4]/30 hover:border-[#00F5D4]/60 text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/plinko-3d.png"
            alt="Plinko & Crash 3D"
            className="w-11 h-11 rounded-xl object-cover border border-[#00F5D4]/40 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, '۹ بازی آنی کازینو', '9 Instant Games')}
            </div>
            <div className="text-[10px] text-[#00F5D4] font-mono mt-0.5 truncate">
              Plinko • Crash • Mines
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('earn');
          }}
          className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-br from-[#1A1530] to-[#0E0A1C] border border-[#FFD700]/30 hover:border-[#FFD700]/60 text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/ton-chest-3d.png"
            alt="TON Chest 3D"
            className="w-11 h-11 rounded-xl object-cover border border-[#FFD700]/40 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, 'ماموریت و دعوت', 'Quests & Invite')}
            </div>
            <div className="text-[10px] text-[#FFE066] font-mono mt-0.5 truncate">
              {tr(lang, '+۱۰٪ کمیسیون آنی', '+10% Referral')}
            </div>
          </div>
        </button>
      </div>

      {/* 4. USER'S ACTIVE TICKETS IN THIS ROUND */}
      <section className="rounded-2xl p-3.5 bg-[#110C22]/90 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-xs font-black text-white">
              {tr(
                lang,
                `بلیت‌های من در این دور (${myActiveTicketsInRound.length})`,
                `My Tickets in This Round (${myActiveTicketsInRound.length})`
              )}
            </h2>
          </div>
          <button
            onClick={() => navigateTo('my-tickets')}
            className="text-[10px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
          >
            {tr(lang, 'مشاهده همه ←', 'View All →')}
          </button>
        </div>

        {myActiveTicketsInRound.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            {tr(
              lang,
              'هنوز بلیتی در این دور ندارید. با دکمه‌های بالا در ۱ ثانیه بلیت خود را صادر کنید.',
              'No tickets in this round yet. Use Quick Pick or Custom Pick above to mint your slip.'
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
            {myActiveTicketsInRound.slice(0, 5).map((t) => {
              let mainNums: number[] = [];
              try {
                mainNums = JSON.parse(t.mainNumbers);
              } catch {
                mainNums = [7, 14, 21, 33, 49];
              }
              return (
                <div
                  key={t.ticketCode}
                  onClick={() => setViralCardTicket(t)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 cursor-pointer transition-all"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-[#FFE066]">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          t.status === 'WON'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-[#0098EA]/20 text-[#38BDF8]'
                        }`}
                      >
                        {t.status === 'WON'
                          ? tr(lang, 'برنده!', 'WON!')
                          : tr(lang, 'فعال', 'ACTIVE')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {tr(lang, 'ضربه برای اشتراک‌گذاری کارت بلیت', 'Tap to share viral ticket card')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" dir="ltr">
                    {mainNums.map((num, idx) => (
                      <span
                        key={idx}
                        className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-mono text-[10px] font-bold text-white"
                      >
                        {num}
                      </span>
                    ))}
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 flex items-center justify-center font-mono text-[10px] font-black">
                      {t.goldenBall}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. SECONDARY VIEWS QUICK ACCESS GRID (VIP PROFILE, WINNERS, HOW IT WORKS, FAIRNESS, RULES) */}
      <section className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigateTo('user-panel')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="truncate">
            {tr(lang, 'پروفایل VIP و صندوقچه', 'VIP Profile & Chest')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('winners')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <Trophy className="w-4 h-4 text-[#FFE066] shrink-0" />
          <span className="truncate">
            {tr(lang, 'تالار برندگان و نتایج', 'Winners & Results')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('how-it-works')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <span className="truncate">
            {tr(lang, 'راهنمای کامل بازی', 'How It Works')}
          </span>
        </button>
        <button
          onClick={() => navigateTo('terms')}
          className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">
            {tr(lang, 'قوانین و مقررات', 'Terms & Rules')}
          </span>
        </button>
      </section>

      {/* 6. PROVABLY FAIR SEED BADGE */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D091A] border border-white/10 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <Lock className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
          <span className="truncate font-mono" dir="ltr">
            SHA256: {activeLotterySpec.serverSeedHash.slice(0, 18)}...
          </span>
        </div>
        <button
          onClick={() => navigateTo('transparency')}
          className="shrink-0 flex items-center gap-1 text-[#00F5D4] font-bold hover:underline cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{tr(lang, 'اثبات عدالت', 'Verify RNG')}</span>
        </button>
      </div>
    </main>
  );
};
