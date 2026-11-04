import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Gift,
  Lock,
  Target,
  Ticket,
  Trophy,
  UserCheck,
  HelpCircle,
  FileText,
  Headset,
  Crown,
  Flame,
  Radio,
  Users,
  Plus,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { generateBulkQuickPickSlips, formatCountdownHMS } from '../utils/lotteryEngine';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import { tr, localizeServerText } from '../utils/i18n';
import {
  LuxuryIconBadge,
  TonCrystalIcon,
  TelegramStarIcon,
  VipTicketIcon,
  RoyalJackpotCrownIcon,
  WelcomeGiftVaultIcon,
  SquadSyndicateIcon,
  CashbackEmeraldVaultIcon,
  AmbassadorRocketIcon,
} from './ui/LuxuryIcons';

export type LobbySubTab = 'MAIN' | 'JACKPOTS' | 'SYNDICATES' | 'REWARDS';

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
    drawHistory,
    openLatestDrawCeremony,
    setViralCardTicket,
    officialBrandTitle,
    setAiChatOpen,
    unreadSupportCount,
    monthlySuperJackpot,
    monthlyVipQualification,
    rakebackVault,
    claimRakebackVault,
    welcomeGrandLottery,
    welcomeTicketStatus,
    claimWelcomeLotteryTicket,
    syndicatePools,
    createSyndicatePool,
    joinSyndicatePool,
    referralProfile,
    growthQuests,
    bindReferralCode,
    claimReferralCommissionVault,
    claimGrowthQuest,
    tmaXpPoints,
    telegramBotConfig,
    liveTickerEvent,
    poolPulseKey,
    sseConnected,
  } = useLottery();

  // Progressive Disclosure Sub-Tab State (Default: Main Draw)
  const [activeSubTab, setActiveSubTab] = useState<LobbySubTab>('MAIN');

  // Collapsible Rules / Help Drawers (Zero Wall-of-Text Clutter)
  const [showWelcomeRules, setShowWelcomeRules] = useState<boolean>(false);
  const [showMonthlyRules, setShowMonthlyRules] = useState<boolean>(false);
  const [showSyndicateRules, setShowSyndicateRules] = useState<boolean>(false);
  const [showReferralRules, setShowReferralRules] = useState<boolean>(false);

  const [buyingQty, setBuyingQty] = useState<number | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
  const [claimingRakeback, setClaimingRakeback] = useState<boolean>(false);
  const [rakebackToast, setRakebackToast] = useState<string | null>(null);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState<boolean>(false);
  const [welcomePickedMain, setWelcomePickedMain] = useState<number[]>([7, 14, 23, 35, 48]);
  const [welcomePickedGolden, setWelcomePickedGolden] = useState<number>(8);
  const [claimingWelcomeTicket, setClaimingWelcomeTicket] = useState<boolean>(false);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [createSquadModalOpen, setCreateSquadModalOpen] = useState<boolean>(false);
  const [squadNameInput, setSquadNameInput] = useState<string>('نهنگ‌های طلایی TON');
  const [squadTargetShares, setSquadTargetShares] = useState<5 | 10 | 20 | 50>(10);
  const [squadInitialShares, setSquadInitialShares] = useState<number>(2);
  const [creatingSquad, setCreatingSquad] = useState<boolean>(false);
  const [joinSharesBySyndicateId, setJoinSharesBySyndicateId] = useState<Record<string, number>>({});
  const [joiningSyndicateId, setJoiningSyndicateId] = useState<string | null>(null);
  const [syndicateToast, setSyndicateToast] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [copiedMyRefLink, setCopiedMyRefLink] = useState<boolean>(false);
  const [claimingReferralVault, setClaimingReferralVault] = useState<boolean>(false);
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [referralQuestToast, setReferralQuestToast] = useState<string | null>(null);
  const [manualReferrerInput, setManualReferrerInput] = useState<string>('');
  const [bindingReferrer, setBindingReferrer] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [pulseHighlight, setPulseHighlight] = useState<boolean>(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (poolPulseKey > 0) {
      setPulseHighlight(true);
      const timer = setTimeout(() => setPulseHighlight(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [poolPulseKey]);

  const activeRoundObj =
    rounds.find((r) => r.roundCode === activeRoundCode) || rounds[0] || null;

  const latestCompletedDraw =
    drawHistory.find((d) => d.roundCode === activeLotterySpec.roundCode) ||
    drawHistory[0] ||
    null;

  const latestWinningMain: number[] =
    latestCompletedDraw?.drawnMain && latestCompletedDraw.drawnMain.length > 0
      ? latestCompletedDraw.drawnMain
      : Array.isArray(activeLotterySpec.winningNumbers) &&
        activeLotterySpec.winningNumbers.length > 0
      ? activeLotterySpec.winningNumbers
      : [7, 14, 23, 38, 49];

  const latestWinningGolden: number =
    typeof latestCompletedDraw?.drawnGolden === 'number'
      ? latestCompletedDraw.drawnGolden
      : typeof activeLotterySpec.winningGoldenBall === 'number'
      ? activeLotterySpec.winningGoldenBall
      : 8;

  const cleanTitleFa = (raw: string) =>
    String(raw || '')
      .replace(/\s*\([^)]*۸۵٪[^)]*\)/g, '')
      .replace(/\s*\([^)]*85%[^)]*\)/g, '')
      .trim();

  const remainingSec = activeRoundObj?.drawTargetTimestampMs
    ? Math.max(0, Math.floor((activeRoundObj.drawTargetTimestampMs - nowMs) / 1000))
    : lotteryTimers[activeLotterySpec.id] || 3600;

  const countdown = formatCountdownHMS(remainingSec);
  const unitPriceUsdt = activeLotterySpec.ticketPriceUsdt;

  // 30-Day Monthly VIP Super-Jackpot Countdown calculation
  const monthlyRemainingSec = Math.max(
    0,
    Math.floor(((monthlySuperJackpot?.nextMonthlyDrawTimestampMs || nowMs) - nowMs) / 1000)
  );
  const monthlyDays = String(Math.floor(monthlyRemainingSec / 86400)).padStart(2, '0');
  const monthlyHours = String(Math.floor((monthlyRemainingSec % 86400) / 3600)).padStart(2, '0');
  const monthlyMinutes = String(Math.floor((monthlyRemainingSec % 3600) / 60)).padStart(2, '0');
  const monthlySeconds = String(monthlyRemainingSec % 60).padStart(2, '0');
  const lastRolloverItem = monthlySuperJackpot?.rolloverHistory?.[0] || null;

  // 30-Day $1,000 Welcome Grand Lottery (#LD-WELCOME-1000) Countdown calculation
  const welcomeRemainingSec = Math.max(
    0,
    Math.floor(((welcomeGrandLottery?.nextDrawTimestampMs || nowMs) - nowMs) / 1000)
  );
  const welcomeDays = String(Math.floor(welcomeRemainingSec / 86400)).padStart(2, '0');
  const welcomeHours = String(Math.floor((welcomeRemainingSec % 86400) / 3600)).padStart(2, '0');
  const welcomeMinutes = String(Math.floor((welcomeRemainingSec % 3600) / 60)).padStart(2, '0');
  const welcomeSeconds = String(welcomeRemainingSec % 60).padStart(2, '0');

  const toggleWelcomeMainNumber = (num: number) => {
    HapticEngine.selectionChanged();
    setWelcomePickedMain((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), num].sort((a, b) => a - b);
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const handleWelcomeQuickPick = () => {
    HapticEngine.impactOccurred('light');
    const [slip] = generateBulkQuickPickSlips(1, 5, 50, 15, `welcome_qp_${Date.now()}`);
    if (slip) {
      setWelcomePickedMain([...slip.mainNumbers].sort((a, b) => a - b));
      setWelcomePickedGolden(slip.goldenBall);
    }
  };

  const handleMintWelcomeTicket = async () => {
    if (welcomePickedMain.length !== 5) return;
    HapticEngine.impactOccurred('medium');
    setClaimingWelcomeTicket(true);
    setWelcomeToast(null);
    const res = await claimWelcomeLotteryTicket({
      mainNumbers: welcomePickedMain,
      goldenBall: welcomePickedGolden,
    });
    setClaimingWelcomeTicket(false);
    setWelcomeToast(res.message);
    if (res.ok) {
      HapticEngine.notificationOccurred('success');
      setTimeout(() => {
        setWelcomeModalOpen(false);
      }, 900);
    } else {
      HapticEngine.notificationOccurred('error');
    }
    setTimeout(() => setWelcomeToast(null), 5000);
  };

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
    const totalCostUsdt = Number((qty * unitPriceUsdt).toFixed(6));
    const unitPriceTon = Number((unitPriceUsdt / (tonUsdRate || 5)).toFixed(6));
    const unitPriceStars = Math.max(1, Math.round(unitPriceUsdt / (starsUsdRate || 0.02)));
    const exactCostTon = Number((qty * unitPriceTon).toFixed(6));
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
          `${qty} بلیت در دور ${activeLotterySpec.roundCode} صادر شد!`,
          `${qty} ticket(s) minted in round ${activeLotterySpec.roundCode}!`
        )
      );
      setTimeout(() => setPurchaseToast(null), 4000);
    } else if (res.error) {
      HapticEngine.notificationOccurred('error');
      setPurchaseToast(localizeServerText(lang, res.error));
      setTimeout(() => setPurchaseToast(null), 4000);
    }
  };

  const myActiveTicketsInRound = tickets.filter(
    (t) => t.roundCode === activeLotterySpec.roundCode
  );
  const myVipSuperTickets = tickets.filter((t) => t.roundCode === '#LD-MONTHLY-VIP');

  const hasClaimableCashback =
    (rakebackVault?.claimableTon || 0) > 0 || (rakebackVault?.claimableStars || 0) > 0;
  const isWelcomeFreeTicketReady =
    !welcomeTicketStatus?.welcomeTicketClaimed &&
    Boolean(welcomeTicketStatus?.welcomeTicketUnlocked) &&
    (welcomeTicketStatus?.welcomeTicketEntitlement || 0) > 0;
  const eligibleQuestsCount = growthQuests.filter((q) => q.eligibleToClaim && !q.claimed).length;

  const SUB_TABS: Array<{
    id: LobbySubTab;
    labelFa: string;
    labelEn: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'MAIN',
      labelFa: 'لاتاری اصلی',
      labelEn: 'Main Draw',
      icon: <VipTicketIcon size={15} />,
    },
    {
      id: 'JACKPOTS',
      labelFa: 'جک‌پات‌های ویژه',
      labelEn: 'Jackpots',
      icon: <RoyalJackpotCrownIcon size={15} />,
      badge: isWelcomeFreeTicketReady ? 'FREE' : null,
    },
    {
      id: 'SYNDICATES',
      labelFa: 'سندیکا',
      labelEn: 'Squads',
      icon: <SquadSyndicateIcon size={15} />,
      badge: syndicatePools.length > 0 ? String(syndicatePools.length) : null,
    },
    {
      id: 'REWARDS',
      labelFa: 'کسب درآمد',
      labelEn: 'Earn & Vault',
      icon: <AmbassadorRocketIcon size={15} />,
      badge:
        eligibleQuestsCount > 0
          ? String(eligibleQuestsCount)
          : hasClaimableCashback
          ? <CashbackEmeraldVaultIcon size={11} />
          : null,
    },
  ];

  return (
    <main className="w-full px-3 pt-3 pb-8 space-y-4 select-none">
      {/* LIVE REAL-TIME SSE TICKER FEED */}
      {liveTickerEvent && (
        <div
          data-testid="live-sse-ticker-banner"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#00F5D4]/15 via-[#171130] to-[#FFE066]/15 border border-[#00F5D4]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] text-[11px] transition-all"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className="w-3.5 h-3.5 text-[#00F5D4] animate-pulse shrink-0" />
            <span className="text-slate-200 font-bold truncate">
              {tr(
                lang,
                `${liveTickerEvent.buyerDisplayName} ${liveTickerEvent.ticketCount} بلیت در ${liveTickerEvent.roundCode} خرید!`,
                `${liveTickerEvent.buyerDisplayName} bought ${liveTickerEvent.ticketCount} slip(s) in ${liveTickerEvent.roundCode}!`
              )}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-black text-[#FFE066]" dir="ltr">
            {liveTickerEvent.newJackpotTon.toFixed(2)} TON
          </span>
        </div>
      )}

      {/* 0. ULTRA-COMPACT 1-LINE STATUS STRIP (Cashback Quick-Claim + Free $1,000 Welcome Ticket Alert) */}
      <div
        data-testid="lobby-compact-status-strip"
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#110C22]/95 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),_0_6px_14px_rgba(0,0,0,0.45)] text-[11px]"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CashbackEmeraldVaultIcon size={14} />
          <span className="text-slate-400 font-bold shrink-0">
            {tr(lang, 'کشبک آنی:', 'Cashback:')}
          </span>
          <span
            data-testid="compact-strip-cashback-ton"
            className="font-mono font-black text-emerald-300 truncate"
            dir="ltr"
          >
            {(rakebackVault?.claimableTon || 0).toFixed(6)} TON
          </span>
          {hasClaimableCashback && (
            <button
              type="button"
              data-testid="compact-strip-claim-cashback-btn"
              disabled={claimingRakeback}
              onClick={async () => {
                setClaimingRakeback(true);
                const res = await claimRakebackVault();
                setClaimingRakeback(false);
                setRakebackToast(res.message);
                setTimeout(() => setRakebackToast(null), 4000);
              }}
              className="px-2 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-black text-[10px] cursor-pointer active:scale-95 shrink-0"
            >
              {claimingRakeback ? '...' : tr(lang, 'برداشت آنی', 'Claim')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isWelcomeFreeTicketReady ? (
            <button
              type="button"
              data-testid="compact-strip-welcome-unlocked-btn"
              onClick={() => {
                HapticEngine.impactOccurred('medium');
                setWelcomeModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#FFE066] to-emerald-400 text-slate-950 font-black text-[10px] shadow-[0_0_12px_rgba(255,224,102,0.4)] cursor-pointer animate-pulse inline-flex items-center gap-1"
            >
              <WelcomeGiftVaultIcon size={13} />
              <span>{tr(lang, 'بلیت ۱۰۰۰$ آماده ثبت!', 'Free $1K Ticket!')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveSubTab('JACKPOTS');
              }}
              className="text-[10px] font-bold text-[#FFE066] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <WelcomeGiftVaultIcon size={13} />
              <span>{tr(lang, 'جک‌پات ۱,۰۰۰$', '$1,000 Draw')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. SLEEK 4-PILL PROGRESSIVE DISCLOSURE SUB-TAB SWITCHER */}
      <nav
        data-testid="lobby-sub-tabs-bar"
        aria-label="بخش‌های لابی"
        className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#0D091A]/95 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_8px_20px_rgba(0,0,0,0.5)]"
      >
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`lobby-tab-${tab.id}`}
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveSubTab(tab.id);
              }}
              className={`relative min-h-[48px] px-1 py-1.5 rounded-xl text-[10.5px] sm:text-xs leading-tight font-black transition-all flex items-center justify-center gap-1 text-center cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-b from-[#FFE066] to-[#B8860B] text-slate-950 shadow-[inset_0_2px_3px_rgba(255,255,255,0.65),_0_6px_14px_rgba(255,215,0,0.35)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tr(lang, tab.labelFa, tab.labelEn)}</span>
              {tab.badge && (
                <span
                  className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full font-mono text-[9px] leading-none font-black shadow-md flex items-center justify-center ${
                    isActive
                      ? 'bg-slate-950 text-[#FFE066] border border-[#FFE066]/40'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* =====================================================================
          TAB 1: لاتاری اصلی (MAIN DRAW — 100% Focused on Ticket Purchase)
          ===================================================================== */}
      {activeSubTab === 'MAIN' && (
        <div data-testid="lobby-panel-MAIN" className="space-y-4">
          {/* Round Selector Bar */}
          {rounds.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {rounds.map((r) => {
                const isSelected = r.roundCode === activeLotterySpec.roundCode;
                return (
                  <button
                    key={r.roundCode}
                    type="button"
                    onClick={() => {
                      HapticEngine.selectionChanged();
                      setActiveRoundCode(r.roundCode);
                    }}
                    className={`shrink-0 min-h-[42px] flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0098EA]/25 to-[#FFD700]/20 border-[#FFD700]/60 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_8px_18px_rgba(0,0,0,0.5)]'
                        : 'bg-[#110C22]/85 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse" />
                    <span>
                      {localizeServerText(lang, cleanTitleFa(r.titleFa))}
                    </span>
                    <span className="font-mono text-[10px] text-[#FFE066]">{r.roundCode}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Hero Grand Jackpot Card */}
          <section className="relative overflow-hidden rounded-3xl p-4 luckydrop-obsidian-glass luckydrop-specular-gold luckydrop-microgrid-watermark shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_14px_28px_rgba(0,0,0,0.6)] space-y-4">
            <img
              src="/assets/3d/hero-jackpot-3d.png"
              alt="3D TON Jackpot"
              className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-screen pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Clean Top Kicker Line */}
            <div className="relative z-10 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[#00F5D4] font-black">
                <LuckyDropLogo size={18} />
                <span>{tr(lang, 'استخر جوایز ۸۵٪ • تسویه آنی', '85% Prize Pool • Instant Payout')}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300" dir="ltr">
                <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
                <span>·</span>
                <span>{activeLotterySpec.roundCode}</span>
              </div>
            </div>

            {/* Center Jackpot Display */}
            <div className="relative z-10 text-center py-1">
              <div className="text-xs font-bold text-slate-300 mb-1">
                {localizeServerText(lang, cleanTitleFa(activeLotterySpec.titleFa))}
              </div>
              <div
                data-testid="hero-live-jackpot-amount"
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-[#FFF6D6] via-[#FFE066] to-[#00F5D4] bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(255,215,0,0.3)] transition-transform duration-300 ${
                  pulseHighlight ? 'scale-105 brightness-125' : 'scale-100'
                }`}
                dir="ltr"
              >
                {formatActiveTmaAmount(activeLotterySpec.jackpotUsdt)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                <span>{tr(lang, 'هر بلیت:', 'Ticket:')}</span>
                <span className="font-mono font-bold text-white inline-flex items-center gap-1" dir="ltr">
                  {activeTmaCurrency === 'TON' ? <TonCrystalIcon size={12} /> : <TelegramStarIcon size={12} />}
                  {formatActiveTmaAmount(unitPriceUsdt)}
                </span>
                <span>·</span>
                <span>
                  {tr(
                    lang,
                    `${activeLotterySpec.mainCount} از ${activeLotterySpec.mainMax}`,
                    `${activeLotterySpec.mainCount}/${activeLotterySpec.mainMax}`
                  )}
                </span>
              </div>
            </div>

            {/* Live Countdown Bar */}
            <div className="relative z-10 flex items-center justify-between bg-[#090614]/90 border border-white/10 rounded-2xl p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Clock className="w-4 h-4 text-[#FFE066]" />
                <span>{tr(lang, 'قرعه‌کشی بعدی:', 'Next Draw:')}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-black" dir="ltr">
                <span className="px-2 py-1 rounded-xl bg-white/10 text-white">
                  {countdown.hours}h
                </span>
                <span className="text-[#FFE066]">:</span>
                <span className="px-2 py-1 rounded-xl bg-white/10 text-white">
                  {countdown.minutes}m
                </span>
                <span className="text-[#FFE066]">:</span>
                <span className="px-2 py-1 rounded-xl bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/30">
                  {countdown.seconds}s
                </span>
              </div>
            </div>

            {/* 1-Tap Quick Pick Buttons (Thumb-Friendly min-h-[52px]) */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                <span className="font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FFE066]" />
                  {tr(lang, 'خرید سریع ۱-کلیکی:', '1-Tap Quick Buy:')}
                </span>
                <span className="font-mono text-[10px] text-emerald-300 inline-flex items-center gap-1">
                  <CashbackEmeraldVaultIcon size={12} />
                  {tr(lang, '+۳٪ کشبک آنی', '+3% Instant Cashback')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[1, 5, 10].map((qty) => {
                  const costUsdt = qty * unitPriceUsdt;
                  const isBusy = buyingQty === qty;
                  return (
                    <button
                      key={qty}
                      type="button"
                      disabled={buyingQty !== null}
                      onClick={() => handleQuickBuy(qty)}
                      className={`min-h-[54px] flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border font-bold transition-all cursor-pointer active:scale-95 ${
                        qty === 5
                          ? 'bg-gradient-to-b from-[#FFE066] to-[#B8860B] text-slate-950 border-[#FFE066] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_10px_20px_rgba(0,0,0,0.5)]'
                          : 'bg-[#171130] hover:bg-[#1E163D] text-white border-white/15 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)]'
                      }`}
                    >
                      <span className="text-xs font-black inline-flex items-center gap-1">
                        <VipTicketIcon size={14} />
                        {isBusy
                          ? tr(lang, 'در حال صدور...', 'Minting...')
                          : tr(lang, `${qty} بلیت`, `${qty} Slip${qty > 1 ? 's' : ''}`)}
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

              {/* Custom Ball Picker & My Tickets (min-h-[48px]) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    HapticEngine.selectionChanged();
                    navigateTo('play');
                  }}
                  data-testid="custom-pick-btn"
                  className="min-h-[48px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#00F5D4]/15 hover:bg-[#00F5D4]/25 border border-[#00F5D4]/40 text-[#00F5D4] text-xs font-black transition-all cursor-pointer active:scale-95"
                >
                  <Target className="w-4 h-4 shrink-0" />
                  <span>{tr(lang, 'انتخاب دستی اعداد', 'Custom Numbers')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    HapticEngine.selectionChanged();
                    navigateTo('my-tickets');
                  }}
                  data-testid="lobby-my-tickets-btn"
                  className="min-h-[48px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-100 text-xs font-black transition-all cursor-pointer active:scale-95"
                >
                  <VipTicketIcon size={16} />
                  <span>
                    {tr(
                      lang,
                      `بلیت‌های من (${tickets.length})`,
                      `My Tickets (${tickets.length})`
                    )}
                  </span>
                </button>
              </div>
            </div>

            {purchaseToast && (
              <div className="relative z-10 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
                {purchaseToast}
              </div>
            )}
          </section>

          {/* User's Active Tickets in This Round */}
          <section className="rounded-3xl p-4 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.18),_0_10px_20px_rgba(0,0,0,0.5)] space-y-3">
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
                type="button"
                onClick={() => navigateTo('my-tickets')}
                className="text-[11px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
              >
                {tr(lang, 'مشاهده همه ←', 'View All →')}
              </button>
            </div>

            {myActiveTicketsInRound.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                {tr(
                  lang,
                  'هنوز بلیتی در این دور ندارید. با ۱ کلیک بلیت خود را صادر کنید.',
                  'No tickets in this round yet. Use 1-Tap Quick Buy above.'
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
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[#FFE066]/25 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#FFE066]">
                          {t.ticketCode}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300">
                          {t.status === 'WON' ? tr(lang, 'برنده', 'WON') : tr(lang, 'فعال', 'ACTIVE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" dir="ltr">
                        {mainNums.map((num, idx) => (
                          <span
                            key={idx}
                            className="w-6 h-6 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-mono text-[10px] font-bold text-white"
                          >
                            {num}
                          </span>
                        ))}
                        <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 flex items-center justify-center font-mono text-[10px] font-black">
                          {t.goldenBall}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Latest Completed Draw Ceremony Replay */}
          <section
            data-testid="latest-completed-draw-card"
            className="rounded-3xl p-4 luckydrop-obsidian-glass luckydrop-specular-gold flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFE066] shrink-0" />
                  <span className="text-xs font-black text-white truncate">
                    {tr(
                      lang,
                      `آخرین شماره‌های برنده (${latestCompletedDraw?.roundCode || activeLotterySpec.roundCode})`,
                      `Latest Draw (${latestCompletedDraw?.roundCode || activeLotterySpec.roundCode})`
                    )}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {tr(lang, 'اثبات منصفانه SHA-256 • واریز خودکار', 'SHA-256 Provably Fair • Auto Payout')}
                </div>
              </div>

              <button
                type="button"
                data-testid="lobby-watch-draw-btn"
                onClick={() => openLatestDrawCeremony(latestCompletedDraw)}
                className="min-h-[42px] shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-[11px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] active:scale-95 transition-all cursor-pointer"
              >
                <RoyalJackpotCrownIcon size={13} />
                <span>{tr(lang, 'مراسم قرعه‌کشی', 'Watch Draw')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5" dir="ltr">
                {latestWinningMain.map((num, idx) => (
                  <span
                    key={idx}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFF9DB] via-[#FFE066] to-[#B8860B] text-slate-950 font-mono text-[11px] font-black flex items-center justify-center"
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                ))}
                {latestWinningGolden > 0 && (
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00f59b] to-[#00A86B] text-slate-950 font-mono text-[11px] font-black flex items-center justify-center ring-1 ring-[#FFE066]">
                    ★{latestWinningGolden}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#00f59b] font-bold">✓ SHA-256</span>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: جکپات‌های ویژه (SPECIAL JACKPOTS — Welcome $1,000 + Monthly VIP)
          ===================================================================== */}
      {activeSubTab === 'JACKPOTS' && (
        <div data-testid="lobby-panel-JACKPOTS" className="space-y-4">
          {/* 2.1 $1,000 WELCOME GRAND LOTTERY (#LD-WELCOME-1000) */}
          <section
            data-testid="welcome-grand-lottery-card"
            className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#1C1408] via-[#110C1F] to-[#0A1917] border border-[#FFE066]/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_28px_rgba(0,0,0,0.55)] space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <WelcomeGiftVaultIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-[#FFE066] truncate">
                    {tr(lang, 'جکپات ۱,۰۰۰ دلاری خوش‌آمدگویی', '$1,000 Welcome Grand Draw')}
                  </h2>
                  <p className="text-[11px] text-slate-300 truncate">
                    {tr(lang, 'هدیه رایگان اولین خرید بلیت شما', 'Free Ticket on Your 1st Purchase')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-welcome-rules-btn"
                onClick={() => setShowWelcomeRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3 h-3 text-[#FFE066]" />
                <span>{tr(lang, 'راهنما', 'Rules')}</span>
                {showWelcomeRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showWelcomeRules && (
              <div
                data-testid="welcome-rules-drawer"
                className="p-3 rounded-2xl bg-black/55 border border-[#FFE066]/25 text-[11px] text-slate-300 leading-relaxed space-y-1"
              >
                <div>
                  {tr(
                    lang,
                    '• با خرید اولین بلیت لاتاری، ۱ بلیت رایگان ۱,۰۰۰ دلاری با انتخاب اعداد دلخواه شما فعال می‌شود.',
                    '• Buy your first lottery slip to unlock 1 Free $1,000 ticket with custom numbers.'
                  )}
                </div>
                <div>
                  {tr(
                    lang,
                    '• جایزه به‌صورت TON واقعی پرداخت شده و استخر از محل ذخیره ویژه پلتفرم تأمین می‌گردد.',
                    '• Paid in native TON directly to your wallet upon the 30-day draw.'
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 bg-[#080511]/90 border border-[#FFE066]/25 rounded-2xl p-3">
              <div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'جایزه تضمین‌شده:', 'Prize Pool:')}
                </div>
                <div
                  data-testid="welcome-lottery-prize-usdt"
                  className="font-mono text-lg font-black text-[#FFE066] mt-0.5"
                  dir="ltr"
                >
                  ${(welcomeGrandLottery?.targetPoolUsdt || 1000).toLocaleString('en-US')} USDT
                </div>
                <div className="font-mono text-[10px] text-emerald-300 font-bold flex items-center gap-1" dir="ltr">
                  <TonCrystalIcon size={12} />
                  <span>≈ {(welcomeGrandLottery?.targetPoolTon || 200).toFixed(2)} TON</span>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FFE066]" />
                  <span>{tr(lang, 'زمان قرعه‌کشی:', 'Draw In:')}</span>
                </div>
                <div
                  data-testid="welcome-lottery-countdown"
                  className="flex items-center gap-1 font-mono text-[11px] font-black mt-1"
                  dir="ltr"
                >
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-[#FFE066]">
                    {welcomeDays}d
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white">
                    {welcomeHours}h
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white">
                    {welcomeMinutes}m
                  </span>
                </div>
                <div
                  data-testid="welcome-lottery-participants"
                  className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-[#FFE066]" />
                  <span>
                    {tr(
                      lang,
                      `${welcomeGrandLottery?.participantsCount || 0} شرکت‌کننده`,
                      `${welcomeGrandLottery?.participantsCount || 0} Joined`
                    )}
                  </span>
                </div>
              </div>
            </div>

            {welcomeTicketStatus?.welcomeTicketClaimed ? (
              <div
                data-testid="welcome-ticket-status-claimed"
                className="min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs"
              >
                <span className="font-black text-emerald-300 flex items-center gap-1.5">
                  <VipTicketIcon size={15} />
                  <span>{tr(lang, 'بلیت رایگان شما ثبت شد', 'Free Ticket Registered')}</span>
                </span>
                <span className="font-mono font-black text-[#FFE066]" dir="ltr">
                  {welcomeTicketStatus.welcomeTicketCode || '#LD-WELCOME-1000'}
                </span>
              </div>
            ) : welcomeTicketStatus?.welcomeTicketUnlocked &&
              (welcomeTicketStatus?.welcomeTicketEntitlement || 0) > 0 ? (
              <button
                type="button"
                data-testid="welcome-open-picker-modal-btn"
                onClick={() => {
                  HapticEngine.impactOccurred('medium');
                  setWelcomeModalOpen(true);
                }}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FFE066] via-[#F59E0B] to-emerald-400 text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.65),_0_10px_22px_rgba(245,158,11,0.35)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <WelcomeGiftVaultIcon size={16} />
                <span>
                  {tr(lang, 'انتخاب اعداد بلیت رایگان ۱,۰۰۰$', 'Pick Free $1,000 Ticket Numbers')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="welcome-ticket-status-locked"
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setActiveSubTab('MAIN');
                }}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#FFE066]/30 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#FFE066] shrink-0" />
                <span>
                  {tr(
                    lang,
                    'با خرید اولین بلیت لاتاری فعال می‌شود ← خرید بلیت',
                    'Unlocks on 1st Ticket Purchase → Go to Main Draw'
                  )}
                </span>
              </button>
            )}

            {welcomeToast && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
                {welcomeToast}
              </div>
            )}
          </section>

          {/* 2.2 MONTHLY VIP LOYALTY SUPER-JACKPOT ROLLOVER VAULT CARD */}
          <section
            data-testid="monthly-super-jackpot-vault-card"
            className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#19112E] via-[#0E091C] to-[#1E1409] border border-[#FFE066]/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_12px_28px_rgba(0,0,0,0.55)] space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <RoyalJackpotCrownIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-[#FFE066] truncate">
                    {tr(lang, 'ابر جکپات ماهانه VIP', 'Monthly VIP Super-Jackpot')}
                  </h2>
                  <p className="text-[11px] text-slate-300 truncate">
                    {tr(lang, 'خزانه سرریز جوایز • ویژه وفاداران', 'Rollover Prize Vault • VIP Exclusive')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-monthly-rules-btn"
                onClick={() => setShowMonthlyRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3 h-3 text-[#FFE066]" />
                <span>{tr(lang, 'راهنما', 'Rules')}</span>
                {showMonthlyRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showMonthlyRules && (
              <div
                data-testid="monthly-rules-drawer"
                className="p-3 rounded-2xl bg-black/55 border border-[#FFE066]/25 text-[11px] text-slate-300 leading-relaxed space-y-1"
              >
                <div>
                  {tr(
                    lang,
                    '• به ازای هر ۵ بلیت عادی یا سندیکا، ۱ سوپر بلیت رایگان ماهانه VIP صادر می‌شود.',
                    '• Every 5 regular or squad tickets automatically mints 1 Free VIP Super-Ticket.'
                  )}
                </div>
                <div>
                  {tr(
                    lang,
                    '• شرط ورود: خرید حداقل ۱۰ بلیت یا کسب ۵۰۰ امتیاز XP از بازی‌ها و مأموریت‌ها.',
                    '• Qualification: 10+ tickets bought OR 500+ XP earned from quests & games.'
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 bg-[#080511]/90 border border-[#FFE066]/25 rounded-2xl p-3">
              <div>
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'موجودی خزانه:', 'Vault Pool:')}
                </div>
                <div
                  data-testid="monthly-super-pot-ton"
                  className="font-mono text-xl font-black text-[#FFE066] mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TonCrystalIcon size={18} />
                  <span>{(monthlySuperJackpot.accumulatedPoolTon || 0).toFixed(2)} TON</span>
                </div>
                <div className="font-mono text-[10px] text-[#00F5D4] flex items-center gap-1 mt-0.5" dir="ltr">
                  <TelegramStarIcon size={12} />
                  <span>≈ {(monthlySuperJackpot.accumulatedPoolStars || 0).toLocaleString('en-US')} Stars</span>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FFE066]" />
                  <span>{tr(lang, 'قرعه‌کشی ماهانه:', 'Monthly Draw:')}</span>
                </div>
                <div
                  data-testid="monthly-super-pot-countdown"
                  className="flex items-center gap-1 font-mono text-[11px] font-black mt-1"
                  dir="ltr"
                >
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-[#FFE066]">
                    {monthlyDays}d
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white">
                    {monthlyHours}h
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white">
                    {monthlyMinutes}m
                  </span>
                </div>
                {lastRolloverItem && (
                  <div className="text-[10px] font-mono text-amber-300 mt-1" dir="ltr">
                    +{Number(lastRolloverItem.rolloverTon || 0).toFixed(2)} TON Rollover
                  </div>
                )}
              </div>
            </div>

            {/* Compact Qualification Progress */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#FFE066]" />
                  {tr(lang, 'صلاحیت VIP شما:', 'VIP Status:')}
                </span>
                <span
                  data-testid="monthly-vip-qualification-badge"
                  className={`font-black text-[11px] flex items-center gap-1 ${
                    monthlyVipQualification.isQualified ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {monthlyVipQualification.isQualified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tr(lang, 'واجد شرایط', 'Qualified')}</span>
                    </>
                  ) : (
                    `${monthlyVipQualification.overallProgressPercent}%`
                  )}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFE066] via-[#00F5D4] to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(6, monthlyVipQualification.overallProgressPercent)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                  <div className="text-slate-400">{tr(lang, 'بلیت‌ها', 'Tickets')}</div>
                  <div className="font-mono font-black text-white mt-0.5" dir="ltr">
                    {monthlyVipQualification.regularTicketsBoughtCount}/{monthlyVipQualification.minTicketsRequired}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                  <div className="text-slate-400">{tr(lang, 'امتیاز XP', 'XP')}</div>
                  <div className="font-mono font-black text-[#00F5D4] mt-0.5" dir="ltr">
                    {monthlyVipQualification.userXp}/{monthlyVipQualification.minXpRequired}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#FFE066]/10 border border-[#FFE066]/30 text-center">
                  <div className="text-amber-200">{tr(lang, 'سوپر بلیت', 'VIP Slips')}</div>
                  <div
                    data-testid="monthly-vip-super-tickets-count"
                    className="font-mono font-black text-[#FFE066] mt-0.5 flex items-center justify-center gap-1"
                    dir="ltr"
                  >
                    <RoyalJackpotCrownIcon size={13} />
                    <span>
                      {Math.max(myVipSuperTickets.length, monthlyVipQualification.vipSuperTicketsEarnedTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 3: سندیکا (SQUAD POOLS — Group Ticket Buying)
          ===================================================================== */}
      {activeSubTab === 'SYNDICATES' && (
        <div data-testid="lobby-panel-SYNDICATES" className="space-y-4">
          <section
            data-testid="syndicate-squad-pools-card"
            className="rounded-3xl p-4 bg-gradient-to-br from-[#130E24]/95 via-[#0B171E]/95 to-[#090612]/95 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_16px_36px_rgba(0,0,0,0.65)] flex flex-col gap-3.5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 relative z-10 flex-wrap">
              <div className="flex items-center gap-2.5">
                <LuxuryIconBadge variant="emerald" size="md">
                  <SquadSyndicateIcon size={20} />
                </LuxuryIconBadge>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-white">
                    {tr(lang, 'سندیکای گروهی بلیت', 'Telegram Squad Pools')}
                  </h2>
                  <p className="text-[11px] text-emerald-300 font-bold mt-0.5">
                    {tr(lang, 'خرید اشتراکی • تقسیم خودکار جایزه', 'Pooled Tickets • Auto Pro-Rata Split')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSyndicateRules((prev) => !prev)}
                  className="min-h-[42px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-[#FFE066]" />
                  <span>{tr(lang, 'راهنما', 'Info')}</span>
                </button>

                <button
                  type="button"
                  data-testid="open-create-squad-modal-btn"
                  onClick={() => {
                    HapticEngine.impactOccurred('medium');
                    setCreateSquadModalOpen(true);
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#FFE066] via-[#F59E0B] to-emerald-400 text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.65)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tr(lang, 'ساخت سندیکا', 'Create Squad')}</span>
                </button>
              </div>
            </div>

            {showSyndicateRules && (
              <div className="p-3 rounded-2xl bg-black/55 border border-emerald-400/30 text-[11px] text-slate-300 leading-relaxed space-y-1 relative z-10">
                <div>
                  {tr(
                    lang,
                    '• هر سهم بلافاصله ۱ بلیت واقعی در دور فعال صادر می‌کند (بدون قفل شدن وجه).',
                    '• Every share immediately mints 1 real ticket in the active round (Zero-Escrow).'
                  )}
                </div>
                <div>
                  {tr(
                    lang,
                    '• جوایز برنده به نسبت دقیق سهام هر عضو (Pro-Rata) به کیف پول واریز می‌شود (+15 XP پاداش لیدر).',
                    '• Winning prizes split pro-rata to 6 decimals automatically (+15 XP Leader Bonus).'
                  )}
                </div>
              </div>
            )}

            {/* Active Round Syndicate Pools List */}
            {(() => {
              const roundSyndicates = syndicatePools.filter(
                (s) => s.roundCode === activeLotterySpec.roundCode
              );
              const displayedSyndicates =
                roundSyndicates.length > 0 ? roundSyndicates : syndicatePools.slice(0, 6);
              const botHandleClean = (
                telegramBotConfig?.botUsername || 'LuckyDropTON_bot'
              ).replace(/^@/, '');

              if (displayedSyndicates.length === 0) {
                return (
                  <div
                    data-testid="syndicate-empty-state"
                    className="rounded-2xl p-5 bg-black/40 border border-white/10 text-center space-y-2 relative z-10"
                  >
                    <div className="text-xs font-black text-[#FFE066]">
                      {tr(lang, 'هنوز سندیکایی ساخته نشده است', 'No Active Squad Pools Yet')}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {tr(
                        lang,
                        'اولین اسکواد را بسازید و با دعوت دوستان +15 XP پاداش بگیرید.',
                        'Launch the first squad and earn +15 XP per member join!'
                      )}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3 relative z-10">
                  {displayedSyndicates.map((syn) => {
                    const progressPct = Math.min(
                      100,
                      Math.round((syn.filledShares / Math.max(1, syn.targetShares)) * 100)
                    );
                    const remainingShares = Math.max(0, syn.targetShares - syn.filledShares);
                    const selectedJoinShares = Math.min(
                      Math.max(1, remainingShares),
                      joinSharesBySyndicateId[syn.id] || 1
                    );
                    const inviteLink = `https://t.me/${botHandleClean}?startapp=syn_${syn.inviteCode}`;
                    const shareText = encodeURIComponent(
                      `به سندیکای لاتاری «${syn.name}» (${syn.id}) بپیوندید! ${syn.filledShares}/${syn.targetShares} سهم:`
                    );
                    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
                      inviteLink
                    )}&text=${shareText}`;

                    return (
                      <div
                        key={syn.id}
                        data-testid={`syndicate-pool-item-${syn.id}`}
                        className="rounded-2xl p-3.5 bg-[#090612]/90 border border-white/15 hover:border-[#FFE066]/45 flex flex-col gap-3 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-black text-[#FFE066]">
                              #{syn.id}
                            </span>
                            <span className="text-xs font-black text-white">{syn.name}</span>
                            <span className="text-[10px] font-bold text-emerald-300">
                              ·{' '}
                              {syn.status === 'OPEN'
                                ? tr(lang, 'باز', 'OPEN')
                                : syn.status === 'FULL'
                                ? tr(lang, 'تکمیل', 'FULL')
                                : tr(lang, 'تسویه‌شده', 'SETTLED')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                            <span className="text-emerald-300 flex items-center gap-1">
                              <VipTicketIcon size={12} />
                              <span>{syn.ticketIds.length}</span>
                            </span>
                            <span>·</span>
                            <span className="text-[#FFE066] flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{syn.members.length}</span>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-300">
                              {tr(lang, 'سهام:', 'Shares:')}{' '}
                              <strong className="text-[#FFE066] font-mono">
                                {syn.filledShares}/{syn.targetShares}
                              </strong>
                            </span>
                            <span className="text-emerald-300 font-mono flex items-center gap-1" dir="ltr">
                              {activeTmaCurrency === 'STARS' ? (
                                <TelegramStarIcon size={11} />
                              ) : (
                                <TonCrystalIcon size={11} />
                              )}
                              <span>
                                {formatActiveTmaAmount(syn.sharePriceUsdt)} / {tr(lang, 'سهم', 'share')}
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-black/70 border border-white/10 overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] transition-all duration-500"
                              style={{ width: `${Math.max(6, progressPct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Compact Member Avatars */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {syn.members.slice(0, 4).map((m) => {
                              const ratioPct =
                                syn.filledShares > 0
                                  ? ((m.sharesCount / syn.filledShares) * 100).toFixed(0)
                                  : '0';
                              return (
                                <span
                                  key={m.userKey}
                                  className="px-2 py-0.5 rounded-xl bg-white/[0.05] border border-white/10 text-[10px] text-slate-200 flex items-center gap-1"
                                >
                                  <span className="font-bold truncate max-w-[75px]">{m.username}</span>
                                  <span className="font-mono text-[#FFE066] font-black" dir="ltr">
                                    {m.sharesCount}x ({ratioPct}%)
                                  </span>
                                </span>
                              );
                            })}
                          </div>

                          {syn.totalPrizeWonTon > 0 && (
                            <div className="text-emerald-300 text-[11px] font-black font-mono flex items-center gap-1" dir="ltr">
                              <RoyalJackpotCrownIcon size={13} />
                              <span>+{syn.totalPrizeWonTon.toFixed(6)} TON</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/10">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`copy-syndicate-invite-btn-${syn.id}`}
                              onClick={() => {
                                HapticEngine.selectionChanged();
                                if (navigator.clipboard?.writeText) {
                                  navigator.clipboard.writeText(inviteLink).catch(() => {});
                                }
                                setCopiedInviteId(syn.id);
                                setTimeout(() => setCopiedInviteId(null), 2200);
                              }}
                              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#FFE066]" />
                              <span>
                                {copiedInviteId === syn.id
                                  ? tr(lang, '✓ کپی شد', '✓ Copied')
                                  : tr(lang, 'کپی لینک', 'Copy Link')}
                              </span>
                            </button>

                            <a
                              href={telegramShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-sky-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>{tr(lang, 'تلگرام', 'Share')}</span>
                            </a>
                          </div>

                          {syn.status === 'OPEN' && remainingShares > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-black/50 border border-white/15 rounded-xl p-1">
                                {[1, 2, 5]
                                  .filter((q) => q <= remainingShares)
                                  .map((qtyOpt) => (
                                    <button
                                      key={qtyOpt}
                                      type="button"
                                      onClick={() => {
                                        HapticEngine.selectionChanged();
                                        setJoinSharesBySyndicateId((prev) => ({
                                          ...prev,
                                          [syn.id]: qtyOpt,
                                        }));
                                      }}
                                      className={`px-2 py-1 rounded-lg font-mono text-[10px] font-black cursor-pointer ${
                                        selectedJoinShares === qtyOpt
                                          ? 'bg-[#FFE066] text-slate-950'
                                          : 'text-slate-300 hover:bg-white/10'
                                      }`}
                                    >
                                      {qtyOpt}x
                                    </button>
                                  ))}
                              </div>

                              <button
                                type="button"
                                data-testid={`join-syndicate-btn-${syn.id}`}
                                disabled={joiningSyndicateId === syn.id}
                                onClick={async () => {
                                  HapticEngine.impactOccurred('heavy');
                                  setJoiningSyndicateId(syn.id);
                                  setSyndicateToast(null);
                                  const res = await joinSyndicatePool({
                                    syndicateId: syn.id,
                                    sharesToBuy: selectedJoinShares,
                                    currency: activeTmaCurrency,
                                  });
                                  setJoiningSyndicateId(null);
                                  setSyndicateToast(res.message);
                                  setTimeout(() => setSyndicateToast(null), 4000);
                                }}
                                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 font-black text-xs shadow-[inset_0_2px_3px_rgba(255,255,255,0.65)] disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                <VipTicketIcon size={13} />
                                <span>
                                  {joiningSyndicateId === syn.id
                                    ? tr(lang, 'ثبت...', 'Joining...')
                                    : tr(lang, `خرید (${selectedJoinShares})`, `Join (${selectedJoinShares}x)`)}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {syndicateToast && (
              <div
                data-testid="syndicate-toast-banner"
                className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center relative z-10"
              >
                {syndicateToast}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 4: کسب درآمد (REWARDS, CASHBACK VAULT & 2% LIFETIME REFERRAL)
          ===================================================================== */}
      {activeSubTab === 'REWARDS' && (
        <div data-testid="lobby-panel-REWARDS" className="space-y-4">
          {/* 4.1 INSTANT VIP CASHBACK VAULT CARD */}
          <section
            data-testid="instant-vip-cashback-vault-card"
            className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#0D1A22] via-[#0B121E] to-[#19130A] border border-emerald-400/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_10px_24px_rgba(0,0,0,0.5)] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="emerald" size="md">
                  <CashbackEmeraldVaultIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-emerald-200 truncate">
                    {tr(lang, 'قلک کشبک و ریک‌بک آنی', 'Instant VIP Cashback Vault')}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {tr(lang, '۳٪ بلیت‌ها + ۱.۵٪ بازی‌ها • بدون کارمزد', '3% Tickets + 1.5% Games • Zero Fee')}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#090614]/85 border border-emerald-400/25 p-3">
                <div className="text-[10px] text-slate-400">
                  {tr(lang, 'قابل برداشت (TON):', 'Claimable (TON):')}
                </div>
                <div
                  data-testid="lobby-claimable-rakeback-ton"
                  className="text-sm font-black font-mono text-emerald-300 mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TonCrystalIcon size={15} />
                  <span>{(rakebackVault?.claimableTon || 0).toFixed(6)} TON</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5" dir="ltr">
                  {tr(lang, 'کل:', 'Total:')} {(rakebackVault?.lifetimeEarnedTon || 0).toFixed(6)} TON
                </div>
              </div>

              <div className="rounded-2xl bg-[#090614]/85 border border-[#FFE066]/25 p-3">
                <div className="text-[10px] text-slate-400">
                  {tr(lang, 'قابل برداشت (Stars):', 'Claimable (Stars):')}
                </div>
                <div
                  data-testid="lobby-claimable-rakeback-stars"
                  className="text-sm font-black font-mono text-[#FFE066] mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TelegramStarIcon size={15} />
                  <span>{Math.round(rakebackVault?.claimableStars || 0).toLocaleString('en-US')}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1" dir="ltr">
                  <span>{tr(lang, 'کل:', 'Total:')}</span>
                  <span>{Math.round(rakebackVault?.lifetimeEarnedStars || 0).toLocaleString('en-US')}</span>
                  <TelegramStarIcon size={10} />
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="lobby-claim-rakeback-btn"
              disabled={claimingRakeback || !hasClaimableCashback}
              onClick={async () => {
                setClaimingRakeback(true);
                setRakebackToast(null);
                const res = await claimRakebackVault();
                setClaimingRakeback(false);
                setRakebackToast(res.message);
                setTimeout(() => setRakebackToast(null), 4500);
              }}
              className={`w-full min-h-[48px] py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                hasClaimableCashback
                  ? 'bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.65)]'
                  : 'bg-white/5 text-slate-400 border border-white/10 opacity-75 cursor-not-allowed'
              }`}
            >
              <CashbackEmeraldVaultIcon size={16} />
              <span>
                {claimingRakeback
                  ? tr(lang, 'در حال واریز آنی...', 'Claiming...')
                  : tr(lang, 'دریافت آنی به کیف پول (Claim Now)', 'Claim Cashback to Wallet')}
              </span>
            </button>

            {rakebackToast && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center">
                {rakebackToast}
              </div>
            )}
          </section>

          {/* 4.2 2% LIFETIME REFERRAL VAULT & SOCIAL GROWTH QUESTS */}
          <section
            data-testid="vip-referral-quests-card"
            className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#16102A]/95 via-[#0A161A]/95 to-[#1B1308]/95 border border-[#FFE066]/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_14px_32px_rgba(0,0,0,0.65)] space-y-4"
          >
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <AmbassadorRocketIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-[#FFE066] truncate">
                    {tr(
                      lang,
                      'باشگاه سفیران (۲٪ پورسانت نقد مادام‌العمر)',
                      '2% Lifetime Referral Vault & Quests'
                    )}
                  </h2>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                    {tr(lang, '۲٪ خرید بلیت دوستان + ۰.۵٪ بازی‌های آنی', '2% Ticket Sales + 0.5% Mini-Games')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReferralRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3 h-3 text-[#FFE066]" />
                <span>{tr(lang, 'راهنما', 'Info')}</span>
              </button>
            </div>

            {showReferralRules && (
              <div className="relative z-10 p-3 rounded-2xl bg-black/55 border border-[#FFE066]/25 text-[11px] text-slate-300 leading-relaxed space-y-1">
                <div>
                  {tr(
                    lang,
                    '• پورسانت ۲٪ مستقیماً از کارمزد سایت پرداخت می‌شود و از استخر ۸۵٪ جایزه کسر نمی‌گردد.',
                    '• 2% commission is funded 100% from house margin without touching the 85% prize pool.'
                  )}
                </div>
                <div>
                  {tr(
                    lang,
                    '• انتقال به کیف پول اصلی ۱:۱، آنی و بدون هیچ کارمزدی است.',
                    '• 1:1 instant transfer to your main TON/Stars wallet with zero fees.'
                  )}
                </div>
              </div>
            )}

            {/* 1-Click Invite Link Copy & Direct Telegram Share */}
            {(() => {
              const botHandleClean = String(
                telegramBotConfig?.botUsername || 'LuckyDrop_TON_Bot'
              ).replace(/^@/, '');
              const myRefCode = referralProfile?.referralCode || 'ref_vip';
              const myInviteUrl = `https://t.me/${botHandleClean}?startapp=${myRefCode}`;
              const shareMsg = encodeURIComponent(
                'به لاتاری بلاکچینی LuckyDrop در تلگرام بپیوندید! استخرهای ۸۵٪ و جکپات ۱,۰۰۰ دلاری:'
              );
              const tgShareHref = `https://t.me/share/url?url=${encodeURIComponent(
                myInviteUrl
              )}&text=${shareMsg}`;

              return (
                <div className="relative z-10 rounded-2xl p-3 bg-[#090612]/90 border border-white/15 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-[#FFE066]" />
                      <span>{tr(lang, 'لینک دعوت اختصاصی شما:', 'Personal Invite Link:')}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#00F5D4] font-bold" dir="ltr">
                      {myRefCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      data-testid="copy-referral-link-btn"
                      onClick={() => {
                        HapticEngine.selectionChanged();
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(myInviteUrl).catch(() => {});
                        }
                        setCopiedMyRefLink(true);
                        setTimeout(() => setCopiedMyRefLink(false), 2200);
                      }}
                      className="flex-1 min-w-[180px] min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-[#FFE066]/35 text-left font-mono text-[11px] text-[#FFE066] flex items-center justify-between gap-2 cursor-pointer"
                      dir="ltr"
                    >
                      <span className="truncate">{myInviteUrl}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#FFE066]/20 text-[#FFE066] text-[10px] font-black flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        {copiedMyRefLink ? 'Copied!' : 'Copy'}
                      </span>
                    </button>

                    <a
                      href={tgShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="share-referral-telegram-btn"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#00F5D4] text-slate-950 font-black text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'ارسال تلگرام', 'Share')}</span>
                    </a>
                  </div>

                  {!referralProfile?.referredByUserKey && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        dir="ltr"
                        data-testid="bind-referral-code-input"
                        value={manualReferrerInput}
                        onChange={(e) => setManualReferrerInput(e.target.value)}
                        placeholder="ref_..."
                        className="flex-1 h-9 px-3 rounded-xl bg-black/60 border border-white/15 text-[11px] font-mono text-white outline-none focus:border-[#FFE066]"
                      />
                      <button
                        type="button"
                        data-testid="bind-referral-code-submit-btn"
                        disabled={bindingReferrer || manualReferrerInput.trim().length < 4}
                        onClick={async () => {
                          setBindingReferrer(true);
                          setReferralQuestToast(null);
                          const res = await bindReferralCode(manualReferrerInput.trim());
                          setBindingReferrer(false);
                          setReferralQuestToast(res.message);
                          if (res.ok) setManualReferrerInput('');
                          setTimeout(() => setReferralQuestToast(null), 4000);
                        }}
                        className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-[#FFE066] disabled:opacity-40 cursor-pointer"
                      >
                        {bindingReferrer ? '...' : tr(lang, 'ثبت معرف', 'Bind')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Live Referral Commission Vault Grid */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-2xl p-2.5 bg-[#090612]/90 border border-emerald-400/35 text-center">
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'قابل برداشت (TON)', 'Claimable TON')}
                </div>
                <div
                  data-testid="referral-claimable-ton"
                  className="font-mono text-xs sm:text-sm font-black text-emerald-300 mt-0.5 flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <TonCrystalIcon size={13} />
                  <span>{(referralProfile?.claimableReferralTon || 0).toFixed(6)} TON</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#090612]/90 border border-[#FFE066]/35 text-center">
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'قابل برداشت (Stars)', 'Claimable Stars')}
                </div>
                <div
                  data-testid="referral-claimable-stars"
                  className="font-mono text-xs sm:text-sm font-black text-[#FFE066] mt-0.5 flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <TelegramStarIcon size={13} />
                  <span>{Math.floor(referralProfile?.claimableReferralStars || 0)}</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#090612]/90 border border-white/15 text-center">
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'دعوت‌شده / فعال', 'Invited / Active')}
                </div>
                <div
                  data-testid="referral-invited-vs-active"
                  className="font-mono text-xs sm:text-sm font-black text-white mt-0.5"
                  dir="ltr"
                >
                  {referralProfile?.invitedCount || 0} /{' '}
                  <span className="text-[#00F5D4]">{referralProfile?.activeBuyersCount || 0}</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#090612]/90 border border-white/15 text-center">
                <div className="text-[10px] text-slate-400 font-bold">
                  {tr(lang, 'کل درآمد', 'Lifetime TON')}
                </div>
                <div
                  data-testid="referral-lifetime-earned"
                  className="font-mono text-xs sm:text-sm font-black text-[#FFE066] mt-0.5 flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <TonCrystalIcon size={13} />
                  <span>{(referralProfile?.lifetimeReferralTon || 0).toFixed(6)} TON</span>
                </div>
              </div>
            </div>

            {/* 1:1 Atomic Claim Referral Commission Button */}
            <button
              type="button"
              data-testid="claim-referral-commission-btn"
              disabled={
                claimingReferralVault ||
                ((referralProfile?.claimableReferralTon || 0) <= 0 &&
                  (referralProfile?.claimableReferralStars || 0) <= 0)
              }
              onClick={async () => {
                setClaimingReferralVault(true);
                setReferralQuestToast(null);
                const res = await claimReferralCommissionVault();
                setClaimingReferralVault(false);
                setReferralQuestToast(res.message);
                setTimeout(() => setReferralQuestToast(null), 4500);
              }}
              className="relative z-10 w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_8px_20px_rgba(16,185,129,0.35)] disabled:opacity-45 cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <CashbackEmeraldVaultIcon size={16} />
              <span>
                {claimingReferralVault
                  ? tr(lang, 'در حال واریز آنی...', 'Claiming...')
                  : tr(
                      lang,
                      'برداشت آنی پورسانت به کیف پول (Claim Commission)',
                      'Claim Commission to Wallet'
                    )}
              </span>
            </button>

            {/* 4 Social & Growth Quests Checklist */}
            <div className="relative z-10 space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <WelcomeGiftVaultIcon size={16} />
                  <span>{tr(lang, 'مأموریت‌های رایگان و سوپر بلیت', 'Free Quests & VIP Tickets')}</span>
                </div>
                <span className="font-mono text-[10px] font-black text-[#00F5D4]" dir="ltr">
                  XP: {monthlyVipQualification?.userXp ?? tmaXpPoints} /{' '}
                  {monthlySuperJackpot?.minXpRequired || 500}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {growthQuests.map((q) => {
                  const pct = Math.min(
                    100,
                    Math.round((q.currentProgress / Math.max(1, q.targetProgress)) * 100)
                  );
                  const isBusy = claimingQuestId === q.id;
                  const cleanFa = String(q.titleFa || '').replace(/^[^\w\u0600-\u06FF]+/, '').trim();
                  const cleanEn = String(q.titleEn || '').replace(/^[^\w\u0600-\u06FF]+/, '').trim();
                  const cleanTitle = tr(lang, cleanFa, cleanEn);
                  return (
                    <div
                      key={q.id}
                      data-testid={`growth-quest-item-${q.id}`}
                      className="rounded-2xl p-3 bg-[#090612]/90 border border-white/12 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div className="space-y-1.5 flex-1 min-w-[190px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <LuxuryIconBadge
                            variant={q.vipSuperTicketsReward > 0 ? 'gold' : 'emerald'}
                            size="xs"
                          >
                            {q.id.includes('squad') ? (
                              <SquadSyndicateIcon size={13} />
                            ) : q.id.includes('vip') ? (
                              <RoyalJackpotCrownIcon size={13} />
                            ) : (
                              <AmbassadorRocketIcon size={13} />
                            )}
                          </LuxuryIconBadge>
                          <span className="text-xs font-black text-white">{cleanTitle}</span>
                          <span
                            dir="ltr"
                            className="text-[#FFE066] font-mono text-[10px] font-black"
                          >
                            · +{q.xpReward} XP
                          </span>
                          {q.vipSuperTicketsReward > 0 && (
                            <span
                              dir="ltr"
                              className="text-emerald-300 font-mono text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <span>· +{q.vipSuperTicketsReward} VIP</span>
                              <VipTicketIcon size={12} />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-[#FFE066]"
                              style={{ width: `${Math.max(6, pct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-300" dir="ltr">
                            {q.currentProgress}/{q.targetProgress}
                          </span>
                        </div>
                      </div>

                      <div>
                        {q.claimed ? (
                          <span
                            data-testid={`growth-quest-claimed-${q.id}`}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {tr(lang, 'دریافت شد', 'Claimed')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-testid={`claim-growth-quest-btn-${q.id}`}
                            disabled={isBusy || !q.eligibleToClaim}
                            onClick={async () => {
                              setClaimingQuestId(q.id);
                              setReferralQuestToast(null);
                              const res = await claimGrowthQuest(q.id);
                              setClaimingQuestId(null);
                              setReferralQuestToast(res.message);
                              setTimeout(() => setReferralQuestToast(null), 4500);
                            }}
                            className={`min-h-[42px] px-3.5 py-2 rounded-xl font-black text-[11px] transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              q.eligibleToClaim
                                ? 'bg-gradient-to-r from-[#FFE066] to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(255,224,102,0.4)]'
                                : 'bg-white/5 border border-white/10 text-slate-400 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {isBusy ? (
                              tr(lang, 'ثبت...', 'Claiming...')
                            ) : q.eligibleToClaim ? (
                              <>
                                <WelcomeGiftVaultIcon size={13} />
                                <span>{tr(lang, 'دریافت پاداش', 'Claim')}</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>{tr(lang, 'قفل', 'Locked')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {referralQuestToast && (
              <div
                data-testid="referral-quest-toast-banner"
                className="relative z-10 p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center"
              >
                {referralQuestToast}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          SHARED FOOTER LINKS & PROVABLY FAIR SIGNATURE
          ===================================================================== */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('mini-games');
          }}
          className="min-h-[54px] flex items-center gap-2.5 p-3 rounded-3xl bg-gradient-to-br from-[#121D38] to-[#0B1022] border border-[#00F5D4]/30 hover:border-[#00F5D4]/60 text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/plinko-3d.png"
            alt="Plinko & Crash 3D"
            className="w-10 h-10 rounded-2xl object-cover border border-[#00F5D4]/40 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, '۹ بازی آنی کازینو', '9 Instant Games')}
            </div>
            <div className="text-[10px] text-[#00F5D4] font-mono mt-0.5 truncate">
              Plinko · Crash · Mines
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('winners');
          }}
          className="min-h-[54px] flex items-center gap-2.5 p-3 rounded-3xl bg-gradient-to-br from-[#1A1530] to-[#0E0A1C] border border-[#FFD700]/30 hover:border-[#FFD700]/60 text-right transition-all cursor-pointer"
        >
          <LuxuryIconBadge variant="gold" size="md">
            <RoyalJackpotCrownIcon size={20} />
          </LuxuryIconBadge>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              {tr(lang, 'تالار برندگان', 'Winners Hall')}
            </div>
            <div className="text-[10px] text-[#FFE066] font-mono mt-0.5 truncate">
              {tr(lang, 'اثبات پرداخت آنی', 'Verified Payouts')}
            </div>
          </div>
        </button>
      </div>

      {/* Compact Secondary Navigation Row */}
      <section className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => navigateTo('user-panel')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">{tr(lang, 'پروفایل VIP', 'VIP Profile')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('how-it-works')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span className="truncate">{tr(lang, 'راهنما', 'Guide')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('terms')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#110C22]/85 hover:bg-[#171130] border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{tr(lang, 'قوانین', 'Rules')}</span>
        </button>
      </section>

      {/* Provably Fair Seed & VIP Concierge Footer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-3xl luckydrop-obsidian-glass luckydrop-specular-purple text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-[#00F5D4] shrink-0" />
            <span className="truncate font-mono" dir="ltr">
              SHA256: {activeLotterySpec.serverSeedHash.slice(0, 18)}...
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('transparency')}
            className="shrink-0 flex items-center gap-1 text-[#00F5D4] font-bold hover:underline cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{tr(lang, 'اثبات عدالت', 'Verify RNG')}</span>
          </button>
        </div>

        <div
          data-testid="lobby-official-brand-signature"
          className="p-3 rounded-3xl luckydrop-obsidian-glass luckydrop-specular-gold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <LuckyDropLogo size={24} />
            <div className="min-w-0">
              <div className="text-[10px] font-black text-[#FFE066] truncate">
                {officialBrandTitle}
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate">
                {tr(lang, 'تسویه آنی TON • پشتیبانی ۲۴/۷', 'Instant TON Settlement • 24/7 VIP Support')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              HapticEngine.selectionChanged();
              setAiChatOpen(true);
            }}
            className="min-h-[40px] shrink-0 relative flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#FFE066]/15 hover:bg-[#FFE066]/25 border border-[#FFE066]/40 text-[#FFE066] text-[10px] font-black cursor-pointer"
          >
            <Headset className="w-3.5 h-3.5" />
            <span>{tr(lang, 'پشتیبانی VIP', 'VIP Support')}</span>
            {unreadSupportCount > 0 && (
              <span className="ml-0.5 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black">
                {unreadSupportCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODALS (Accessible from any Sub-Tab)
          ===================================================================== */}
      {/* 1. CUSTOM NUMBER PICKER MODAL FOR $1,000 WELCOME LOTTERY */}
      {welcomeModalOpen && (
        <div
          data-testid="welcome-number-picker-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3"
        >
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#17112B] via-[#0E0A1C] to-[#090612] border border-[#FFE066]/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_20px_50px_rgba(0,0,0,0.85)] p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <LuxuryIconBadge variant="gold" size="sm">
                  <WelcomeGiftVaultIcon size={16} />
                </LuxuryIconBadge>
                <div>
                  <h3 className="text-xs font-black text-[#FFE066]">
                    {tr(
                      lang,
                      'انتخاب اعداد بلیت رایگان ۱,۰۰۰ دلاری',
                      'Pick Numbers for Free $1,000 Ticket'
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tr(lang, '۵ عدد اصلی (۱ تا ۵۰) + ۱ گوی طلایی (۱ تا ۱۵)', '5 Main (1-50) + 1 Golden Ball (1-15)')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWelcomeModalOpen(false)}
                className="px-2.5 py-1 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#080511] border border-[#FFE066]/30 rounded-2xl p-2.5">
              <div className="flex items-center gap-1.5" dir="ltr">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const val = welcomePickedMain[idx];
                  return (
                    <span
                      key={idx}
                      className={`w-7 h-7 rounded-xl font-mono text-xs font-black flex items-center justify-center ${
                        val
                          ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200'
                          : 'bg-white/5 border border-white/15 text-slate-500'
                      }`}
                    >
                      {val ? String(val).padStart(2, '0') : '?'}
                    </span>
                  );
                })}
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 font-mono text-xs font-black flex items-center justify-center">
                  ★{welcomePickedGolden}
                </span>
              </div>

              <button
                type="button"
                data-testid="welcome-modal-quick-pick-btn"
                onClick={handleWelcomeQuickPick}
                className="px-2.5 py-1.5 rounded-xl bg-[#FFE066]/15 hover:bg-[#FFE066]/25 border border-[#FFE066]/40 text-[#FFE066] text-[10px] font-black cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{tr(lang, 'تصادفی', 'Quick Pick')}</span>
              </button>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-300 mb-1.5">
                {tr(
                  lang,
                  `۵ عدد اصلی (${welcomePickedMain.length}/5):`,
                  `5 Main Numbers (${welcomePickedMain.length}/5):`
                )}
              </div>
              <div className="grid grid-cols-10 gap-1" dir="ltr">
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => {
                  const selected = welcomePickedMain.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleWelcomeMainNumber(num)}
                      className={`h-7 rounded-lg font-mono text-[10px] font-black transition-all cursor-pointer ${
                        selected
                          ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.6)] scale-105'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[#FFE066] mb-1.5">
                {tr(lang, `گوی طلایی (★${welcomePickedGolden}):`, `Golden Ball (★${welcomePickedGolden}):`)}
              </div>
              <div className="grid grid-cols-8 gap-1.5" dir="ltr">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((gNum) => {
                  const selected = welcomePickedGolden === gNum;
                  return (
                    <button
                      key={gNum}
                      type="button"
                      onClick={() => {
                        HapticEngine.selectionChanged();
                        setWelcomePickedGolden(gNum);
                      }}
                      className={`h-7 rounded-lg font-mono text-[10px] font-black transition-all cursor-pointer ${
                        selected
                          ? 'bg-gradient-to-br from-[#FFE066] to-[#F59E0B] text-slate-950 shadow-[0_0_10px_rgba(255,224,102,0.6)] scale-105'
                          : 'bg-white/5 hover:bg-white/10 text-amber-200 border border-[#FFE066]/20'
                      }`}
                    >
                      ★{gNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                data-testid="welcome-modal-submit-btn"
                disabled={claimingWelcomeTicket || welcomePickedMain.length !== 5}
                onClick={handleMintWelcomeTicket}
                className="flex-1 min-h-[48px] py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.65)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <VipTicketIcon size={15} />
                <span>
                  {claimingWelcomeTicket
                    ? tr(lang, 'در حال صدور...', 'Minting...')
                    : tr(lang, 'ثبت بلیت رایگان ۱,۰۰۰$', 'Mint Free $1,000 Ticket')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWelcomeModalOpen(false)}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {tr(lang, 'انصراف', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE SQUAD MODAL (ساخت سندیکای جدید) */}
      {createSquadModalOpen && (
        <div
          data-testid="create-squad-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3"
        >
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#17112B] via-[#0E0A1C] to-[#090612] border border-emerald-400/45 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_20px_50px_rgba(0,0,0,0.85)] p-4 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <LuxuryIconBadge variant="emerald" size="sm">
                  <SquadSyndicateIcon size={16} />
                </LuxuryIconBadge>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[#FFE066]">
                    {tr(lang, 'ساخت سندیکای جدید', 'Create Telegram Squad')}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tr(lang, 'هر سهم = ۱ بلیت واقعی + ۱۵ XP پاداش لیدر', '1 Share = 1 Ticket + 15 XP Synergy')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateSquadModalOpen(false)}
                className="px-2.5 py-1 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-200 block">
                {tr(lang, 'نام سندیکا:', 'Squad Name:')}
              </label>
              <input
                type="text"
                data-testid="create-squad-name-input"
                value={squadNameInput}
                maxLength={42}
                onChange={(e) => setSquadNameInput(e.target.value)}
                placeholder={tr(lang, 'مثلاً: نهنگ‌های طلایی TON', 'e.g., Golden TON Whales')}
                className="w-full px-3 py-2.5 rounded-2xl bg-black/60 border border-white/15 focus:border-[#FFE066] text-xs font-bold text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-200 block">
                {tr(lang, 'ظرفیت کل سهام:', 'Target Shares:')}
              </label>
              <div className="grid grid-cols-4 gap-2" dir="ltr">
                {([5, 10, 20, 50] as const).map((targetOpt) => (
                  <button
                    key={targetOpt}
                    type="button"
                    data-testid={`squad-target-shares-${targetOpt}`}
                    onClick={() => {
                      HapticEngine.selectionChanged();
                      setSquadTargetShares(targetOpt);
                      if (squadInitialShares > targetOpt) {
                        setSquadInitialShares(targetOpt);
                      }
                    }}
                    className={`min-h-[42px] py-2 rounded-2xl font-mono text-xs font-black border transition-all cursor-pointer ${
                      squadTargetShares === targetOpt
                        ? 'bg-gradient-to-br from-[#FFE066] to-amber-500 text-slate-950 border-[#FFE066]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {targetOpt}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-200 block">
                {tr(
                  lang,
                  `سهام اولیه شما (${squadInitialShares} سهم):`,
                  `Your Initial Shares (${squadInitialShares}):`
                )}
              </label>
              <div className="grid grid-cols-5 gap-1.5" dir="ltr">
                {[1, 2, 3, 5, 10]
                  .filter((n) => n <= squadTargetShares)
                  .map((initOpt) => (
                    <button
                      key={initOpt}
                      type="button"
                      data-testid={`squad-initial-shares-${initOpt}`}
                      onClick={() => {
                        HapticEngine.selectionChanged();
                        setSquadInitialShares(initOpt);
                      }}
                      className={`min-h-[40px] py-1.5 rounded-xl font-mono text-xs font-black border transition-all cursor-pointer ${
                        squadInitialShares === initOpt
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {initOpt}x
                    </button>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl p-3 bg-black/50 border border-emerald-400/30 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span>{tr(lang, 'دور هدف:', 'Target Round:')}</span>
                <span className="font-mono font-bold text-white">
                  {localizeServerText(lang, cleanTitleFa(activeLotterySpec.titleFa))}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{tr(lang, 'مبلغ پرداختی:', 'Total Cost:')}</span>
                <span className="font-mono font-black text-[#FFE066] flex items-center gap-1" dir="ltr">
                  {activeTmaCurrency === 'STARS' ? (
                    <TelegramStarIcon size={12} />
                  ) : (
                    <TonCrystalIcon size={12} />
                  )}
                  <span>{formatActiveTmaAmount(activeLotterySpec.ticketPriceUsdt * squadInitialShares)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                data-testid="submit-create-squad-btn"
                disabled={creatingSquad || squadNameInput.trim().length < 2}
                onClick={async () => {
                  HapticEngine.impactOccurred('heavy');
                  setCreatingSquad(true);
                  const res = await createSyndicatePool({
                    name: squadNameInput.trim(),
                    roundCode: activeLotterySpec.roundCode,
                    targetShares: squadTargetShares,
                    initialSharesToBuy: squadInitialShares,
                    currency: activeTmaCurrency,
                  });
                  setCreatingSquad(false);
                  if (res.ok) {
                    HapticEngine.notificationOccurred('success');
                    setCreateSquadModalOpen(false);
                    setSyndicateToast(res.message);
                    setTimeout(() => setSyndicateToast(null), 4500);
                  } else {
                    HapticEngine.notificationOccurred('error');
                    setSyndicateToast(res.message);
                  }
                }}
                className="flex-1 min-h-[48px] py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.65)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AmbassadorRocketIcon size={15} />
                <span>
                  {creatingSquad
                    ? tr(lang, 'در حال ساخت...', 'Creating...')
                    : tr(lang, `ساخت و خرید ${squadInitialShares} سهم`, `Launch (${squadInitialShares}x)`)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCreateSquadModalOpen(false)}
                className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {tr(lang, 'انصراف', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
