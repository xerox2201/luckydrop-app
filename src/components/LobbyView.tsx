import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Lock,
  Target,
  UserCheck,
  HelpCircle,
  FileText,
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
  const [squadNameInput, setSquadNameInput] = useState<string>('Golden TON Whales');
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

  const mainDays = String(Math.floor(remainingSec / 86400)).padStart(2, '0');
  const mainHours = String(Math.floor((remainingSec % 86400) / 3600)).padStart(2, '0');
  const mainMinutes = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, '0');
  const mainSeconds = String(remainingSec % 60).padStart(2, '0');
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
  const lastRolloverItem = monthlySuperJackpot?.rolloverHistory?.[0] || null;

  // 30-Day $1,000 Welcome Grand Lottery (#LD-WELCOME-1000) Countdown calculation
  const welcomeRemainingSec = Math.max(
    0,
    Math.floor(((welcomeGrandLottery?.nextDrawTimestampMs || nowMs) - nowMs) / 1000)
  );
  const welcomeDays = String(Math.floor(welcomeRemainingSec / 86400)).padStart(2, '0');
  const welcomeHours = String(Math.floor((welcomeRemainingSec % 86400) / 3600)).padStart(2, '0');
  const welcomeMinutes = String(Math.floor((welcomeRemainingSec % 3600) / 60)).padStart(2, '0');

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
    setWelcomeToast(localizeServerText(lang, res.message));
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
    badge?: string | null;
  }> = [
    {
      id: 'MAIN',
      labelFa: 'لاتاری اصلی',
      labelEn: 'Main Draw',
      icon: <VipTicketIcon size={14} />,
    },
    {
      id: 'JACKPOTS',
      labelFa: 'جک‌پات ویژه',
      labelEn: 'Jackpots',
      icon: <RoyalJackpotCrownIcon size={14} />,
      badge: isWelcomeFreeTicketReady ? 'FREE' : null,
    },
    {
      id: 'SYNDICATES',
      labelFa: 'سندیکا',
      labelEn: 'Syndicates',
      icon: <SquadSyndicateIcon size={14} />,
      badge: syndicatePools.length > 0 ? String(syndicatePools.length) : null,
    },
    {
      id: 'REWARDS',
      labelFa: 'کسب درآمد',
      labelEn: 'Rewards',
      icon: <AmbassadorRocketIcon size={14} />,
      badge: eligibleQuestsCount > 0 ? String(eligibleQuestsCount) : null,
    },
  ];

  return (
    <main className="w-full px-3 pt-3 pb-24 space-y-3.5 select-none">
      {/* LIVE REAL-TIME SSE TICKER FEED (When Active) */}
      {liveTickerEvent && (
        <div
          data-testid="live-sse-ticker-banner"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_12px_28px_rgba(0,0,0,0.7)] text-xs transition-all"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-slate-200 font-bold truncate">
              {tr(
                lang,
                `${localizeServerText(lang, liveTickerEvent.buyerDisplayName)} ${liveTickerEvent.ticketCount} بلیت در ${liveTickerEvent.roundCode} خرید!`,
                `${localizeServerText(lang, liveTickerEvent.buyerDisplayName)} bought ${liveTickerEvent.ticketCount} slip(s) in ${liveTickerEvent.roundCode}!`
              )}
            </span>
          </div>
          <span
            className="shrink-0 font-mono text-xs font-black text-[#F5D061] tabular-nums"
            dir="ltr"
          >
            {liveTickerEvent.newJackpotTon.toFixed(2)} TON
          </span>
        </div>
      )}

      {/* 1. COMPACT TEXTURED STATUS STRIP (Single-Row Brushed Obsidian Bar) */}
      <div
        data-testid="lobby-compact-status-strip"
        className="rounded-2xl px-3 py-2.5 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] flex items-center justify-between gap-2"
      >
        {/* Left/Start Side: Claimable Cashback TON + 1-Tap Claim Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <LuxuryIconBadge variant="emerald" size="xs">
            <CashbackEmeraldVaultIcon size={13} />
          </LuxuryIconBadge>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-400 font-medium shrink-0">
              {tr(lang, 'کش‌بک:', 'Cashback:')}
            </span>
            <span
              data-testid="compact-strip-cashback-ton"
              className="font-mono text-xs font-black text-emerald-300 tabular-nums truncate"
              dir="ltr"
            >
              {(rakebackVault?.claimableTon || 0).toFixed(6)} TON
            </span>
          </div>
          {hasClaimableCashback && (
            <button
              type="button"
              data-testid="compact-strip-claim-cashback-btn"
              disabled={claimingRakeback}
              onClick={async () => {
                setClaimingRakeback(true);
                const res = await claimRakebackVault();
                setClaimingRakeback(false);
                setRakebackToast(localizeServerText(lang, res.message));
                setTimeout(() => setRakebackToast(null), 4000);
              }}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600 text-[#090B10] font-black text-[10px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_4px_10px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95 shrink-0"
            >
              {claimingRakeback ? '...' : tr(lang, 'دریافت', 'Claim')}
            </button>
          )}
        </div>

        {/* Right/End Side: $1,000 Welcome Ticket Status Pill */}
        <div className="shrink-0">
          {isWelcomeFreeTicketReady ? (
            <button
              type="button"
              data-testid="compact-strip-welcome-unlocked-btn"
              onClick={() => {
                HapticEngine.impactOccurred('medium');
                setWelcomeModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-[10px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_4px_12px_rgba(212,175,55,0.4)] cursor-pointer inline-flex items-center gap-1"
            >
              <WelcomeGiftVaultIcon size={12} />
              <span>{tr(lang, 'بلیت ۱۰۰۰$ آماده!', 'Free $1K Ticket!')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveSubTab('JACKPOTS');
              }}
              className="px-2.5 py-1 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-[#D4AF37]/40 text-[10px] font-bold text-[#F5D061] cursor-pointer inline-flex items-center gap-1"
            >
              <WelcomeGiftVaultIcon size={12} />
              <span>{tr(lang, 'بلیت ۱,۰۰۰$', '$1,000 Draw')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CLEAN 4-TAB SEGMENTED SWITCHER (Brushed Metallic Gold Active State, Zero Truncation or Badge Overlap) */}
      <nav
        data-testid="lobby-sub-tabs-bar"
        aria-label={tr(lang, 'بخش‌های لابی', 'Lobby Sections')}
        className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)]"
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
              className={`relative min-h-[48px] px-1 py-1.5 rounded-xl text-[10.5px] leading-tight font-bold transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_6px_16px_rgba(212,175,55,0.35)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="shrink-0">{tab.icon}</span>
                {tab.badge && (
                  <span
                    dir="ltr"
                    className={`shrink-0 px-1 py-0.2 rounded font-mono text-[8.5px] leading-tight font-black tabular-nums ${
                      isActive
                        ? 'bg-[#090B10]/85 text-[#F5D061]'
                        : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {tr(lang, tab.labelFa, tab.labelEn)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* =====================================================================
          TAB 1: لاتاری اصلی (MAIN DRAW — 3-Tier Focused Vault Architecture)
          ===================================================================== */}
      {activeSubTab === 'MAIN' && (
        <div data-testid="lobby-panel-MAIN" className="space-y-3.5">
          {/* Compact Pill Selector for Active Round */}
          {rounds.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
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
                    className={`shrink-0 min-h-[38px] flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#111622] border-[#D4AF37]/70 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_8px_18px_rgba(0,0,0,0.6)]'
                        : 'bg-[#0B0E14] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-[#F5D061] animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span>{localizeServerText(lang, cleanTitleFa(r.titleFa))}</span>
                    <span className="font-mono text-[10px] text-[#F5D061] tabular-nums" dir="ltr">
                      {r.roundCode}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ONE MAJESTIC, TEXTURED MAIN JACKPOT VAULT CARD (3-Tier Hierarchy) */}
          <section className="relative overflow-hidden rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-4">
            <img
              src="/assets/3d/luckydrop-3d-jackpot-hero.png"
              alt="LuckyDrop TON Jackpot Vault"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.12] mix-blend-screen pointer-events-none"
            />

            {/* TIER 1 (TOP): Clean Round Title & 85% Prize Pool Badge */}
            <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 min-w-0">
                <LuckyDropLogo size={24} />
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white truncate">
                    {localizeServerText(lang, cleanTitleFa(activeLotterySpec.titleFa))}
                  </h1>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{tr(lang, 'هر بلیت:', 'Ticket:')}</span>
                    <span
                      className="font-mono font-bold text-slate-200 inline-flex items-center gap-1 tabular-nums"
                      dir="ltr"
                    >
                      {activeTmaCurrency === 'TON' ? (
                        <TonCrystalIcon size={11} />
                      ) : (
                        <TelegramStarIcon size={11} />
                      )}
                      {formatActiveTmaAmount(unitPriceUsdt)}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums" dir="ltr">
                      {activeLotterySpec.roundCode}
                    </span>
                  </div>
                </div>
              </div>

              <span className="shrink-0 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{tr(lang, 'استخر جوایز ۸۵٪', '85% Prize Pool')}</span>
              </span>
            </div>

            {/* TIER 2 (CENTER): Massive Tabular Prize Pool Counter + Clean 4-Box Digital Countdown Timer */}
            <div className="relative z-10 text-center space-y-3 py-1">
              <div>
                <div className="text-xs text-slate-400 font-medium mb-1">
                  {tr(lang, 'جایزه کل این دور • تسویه آنی', '85% Prize Pool • Instant Payout')}
                </div>
                <div
                  data-testid="hero-live-jackpot-amount"
                  className={`text-4xl font-black font-mono tracking-tight tabular-nums bg-gradient-to-b from-[#FFF6D6] via-[#F5D061] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(212,175,55,0.3)] transition-transform duration-300 ${
                    pulseHighlight ? 'scale-105 brightness-125' : 'scale-100'
                  }`}
                  dir="ltr"
                >
                  {formatActiveTmaAmount(activeLotterySpec.jackpotUsdt)}
                </div>
              </div>

              {/* Clean 4-Box Digital Countdown Timer (Days / Hours / Minutes / Seconds) */}
              <div className="grid grid-cols-4 gap-2 max-w-[340px] mx-auto" dir="ltr">
                {[
                  { val: mainDays, label: tr(lang, 'روز', 'Days') },
                  { val: mainHours || countdown.hours, label: tr(lang, 'ساعت', 'Hours') },
                  { val: mainMinutes || countdown.minutes, label: tr(lang, 'دقیقه', 'Minutes') },
                  { val: mainSeconds || countdown.seconds, label: tr(lang, 'ثانیه', 'Seconds'), highlight: true },
                ].map((box, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl py-2 px-1.5 bg-[#07090E] border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center ${
                      box.highlight ? 'border-[#D4AF37]/50' : 'border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`font-mono text-lg font-black tabular-nums leading-none ${
                        box.highlight ? 'text-[#F5D061]' : 'text-white'
                      }`}
                    >
                      {box.val}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">
                      {box.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TIER 3 (BOTTOM): 3 Sleek Metallic-Bordered Quick-Buy Buttons + 2 Clean Secondary Action Buttons */}
            <div className="relative z-10 space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#F5D061]" />
                  <span>{tr(lang, 'خرید سریع ۱-کلیکی:', '1-Tap Quick Buy:')}</span>
                </span>
                <span className="text-emerald-300 font-bold inline-flex items-center gap-1">
                  <CashbackEmeraldVaultIcon size={12} />
                  <span>{tr(lang, '+۳٪ کش‌بک آنی', '+3% Instant Cashback')}</span>
                </span>
              </div>

              {/* 3 Metallic Quick-Buy Buttons: 1 Ticket, 5 Tickets [Highlighted Gold], 10 Tickets */}
              <div data-testid="winroll-chest-packages-grid" className="grid grid-cols-3 gap-2">
                {[
                  {
                    qty: 1,
                    labelFa: '۱ بلیت',
                    labelEn: '1 Ticket',
                    tagFa: 'شروع',
                    tagEn: 'STARTER',
                    isGold: false,
                  },
                  {
                    qty: 5,
                    labelFa: '۵ بلیت',
                    labelEn: '5 Tickets',
                    tagFa: 'محبوب • +۱ VIP',
                    tagEn: 'POPULAR • +1 VIP',
                    isGold: true,
                  },
                  {
                    qty: 10,
                    labelFa: '۱۰ بلیت',
                    labelEn: '10 Tickets',
                    tagFa: 'نهنگ • +۲ VIP',
                    tagEn: 'WHALE • +2 VIP',
                    isGold: false,
                  },
                ].map((pkg) => {
                  const costUsdt = pkg.qty * unitPriceUsdt;
                  const isBusy = buyingQty === pkg.qty;
                  return (
                    <button
                      key={pkg.qty}
                      type="button"
                      data-testid={`quick-buy-chest-${pkg.qty}`}
                      disabled={buyingQty !== null}
                      onClick={() => handleQuickBuy(pkg.qty)}
                      className={`rounded-2xl p-2.5 flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        pkg.isGold
                          ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] border border-[#FFF6D6]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_10px_24px_rgba(212,175,55,0.35)]'
                          : 'bg-[#111622] hover:bg-[#161D2C] text-white border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_8px_20px_rgba(0,0,0,0.6)]'
                      }`}
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-black tracking-tight ${
                          pkg.isGold
                            ? 'bg-[#090B10]/85 text-[#F5D061]'
                            : 'bg-white/[0.06] text-slate-300 border border-white/[0.08]'
                        }`}
                      >
                        {tr(lang, pkg.tagFa, pkg.tagEn)}
                      </span>

                      <div
                        className={`text-base font-bold ${
                          pkg.isGold ? 'text-[#090B10] font-black' : 'text-white'
                        }`}
                      >
                        {isBusy
                          ? tr(lang, 'در حال صدور...', 'Minting...')
                          : tr(lang, pkg.labelFa, pkg.labelEn)}
                      </div>

                      <div
                        className={`w-full py-1 px-1.5 rounded-xl font-mono text-xs font-black tabular-nums flex items-center justify-center gap-1 ${
                          pkg.isGold
                            ? 'bg-[#090B10]/15 text-[#090B10]'
                            : 'bg-[#07090E] text-[#F5D061] border border-white/[0.08]'
                        }`}
                        dir="ltr"
                      >
                        {activeTmaCurrency === 'TON' ? (
                          <TonCrystalIcon size={11} />
                        ) : (
                          <TelegramStarIcon size={11} />
                        )}
                        <span>{formatActiveTmaAmount(costUsdt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 2 Clean Secondary Action Buttons: Custom Numbers & My Tickets */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    HapticEngine.selectionChanged();
                    navigateTo('play');
                  }}
                  data-testid="custom-pick-btn"
                  className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Target className="w-4 h-4 text-[#F5D061] shrink-0" />
                  <span>{tr(lang, 'انتخاب دستی اعداد', 'Custom Numbers')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    HapticEngine.selectionChanged();
                    navigateTo('my-tickets');
                  }}
                  data-testid="lobby-my-tickets-btn"
                  className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <VipTicketIcon size={15} />
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
          <section className="rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
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
                className="text-xs font-bold text-[#F5D061] hover:underline cursor-pointer"
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
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-black text-[#F5D061] tabular-nums"
                          dir="ltr"
                        >
                          {t.ticketCode}
                        </span>
                        <span className="text-xs font-bold text-emerald-300">
                          {t.status === 'WON'
                            ? tr(lang, 'برنده', 'WON')
                            : tr(lang, 'فعال', 'ACTIVE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 tabular-nums" dir="ltr">
                        {mainNums.map((num, idx) => (
                          <span
                            key={idx}
                            className="w-6 h-6 rounded-lg bg-[#07090E] border border-white/[0.1] flex items-center justify-center font-mono text-xs font-bold text-white"
                          >
                            {num}
                          </span>
                        ))}
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] flex items-center justify-center font-mono text-xs font-black">
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
            className="rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#F5D061] shrink-0" />
                  <h2 className="text-base font-bold text-white truncate">
                    {tr(
                      lang,
                      `آخرین قرعه‌کشی (${latestCompletedDraw?.roundCode || activeLotterySpec.roundCode})`,
                      `Latest Draw (${latestCompletedDraw?.roundCode || activeLotterySpec.roundCode})`
                    )}
                  </h2>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {tr(
                    lang,
                    'اثبات منصفانه SHA-256 • واریز خودکار',
                    'SHA-256 Provably Fair • Auto Payout'
                  )}
                </div>
              </div>

              <button
                type="button"
                data-testid="lobby-watch-draw-btn"
                onClick={() => openLatestDrawCeremony(latestCompletedDraw)}
                className="min-h-[40px] shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] active:scale-95 transition-all cursor-pointer"
              >
                <RoyalJackpotCrownIcon size={13} />
                <span>{tr(lang, 'مراسم قرعه‌کشی', 'Watch Draw')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.08]">
              <div className="flex items-center gap-1.5 tabular-nums" dir="ltr">
                {latestWinningMain.map((num, idx) => (
                  <span
                    key={idx}
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-mono text-xs font-black flex items-center justify-center"
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                ))}
                {latestWinningGolden > 0 && (
                  <span className="w-7 h-7 rounded-full bg-emerald-400 text-[#090B10] font-mono text-xs font-black flex items-center justify-center ring-1 ring-[#F5D061]">
                    ★{latestWinningGolden}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold" dir="ltr">
                ✓ SHA-256
              </span>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: جک‌پات‌های ویژه (SPECIAL JACKPOTS — Welcome $1,000 + Monthly VIP)
          ===================================================================== */}
      {activeSubTab === 'JACKPOTS' && (
        <div data-testid="lobby-panel-JACKPOTS" className="space-y-3.5">
          {/* 2.1 $1,000 WELCOME GRAND LOTTERY (#LD-WELCOME-1000) */}
          <section
            data-testid="welcome-grand-lottery-card"
            className="relative overflow-hidden rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <WelcomeGiftVaultIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#F5D061] truncate">
                    {tr(lang, 'جک‌پات ۱,۰۰۰ دلاری خوش‌آمدگویی', '$1,000 Welcome Grand Draw')}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {tr(lang, 'هدیه رایگان اولین خرید بلیت شما', 'Free Ticket on Your 1st Purchase')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-welcome-rules-btn"
                onClick={() => setShowWelcomeRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#F5D061]" />
                <span>{tr(lang, 'راهنما', 'Rules')}</span>
                {showWelcomeRules ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showWelcomeRules && (
              <div
                data-testid="welcome-rules-drawer"
                className="p-3 rounded-2xl bg-[#07090E] border border-white/[0.08] text-xs text-slate-300 leading-relaxed space-y-1"
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

            <div className="grid grid-cols-2 gap-2.5 bg-[#07090E] border border-white/[0.08] rounded-2xl p-3.5">
              <div>
                <div className="text-xs text-slate-400 font-medium">
                  {tr(lang, 'جایزه تضمین‌شده:', 'Prize Pool:')}
                </div>
                <div
                  data-testid="welcome-lottery-prize-usdt"
                  className="font-mono text-3xl font-black text-[#F5D061] tabular-nums mt-0.5"
                  dir="ltr"
                >
                  ${(welcomeGrandLottery?.targetPoolUsdt || 1000).toLocaleString('en-US')}
                </div>
                <div
                  className="font-mono text-xs text-emerald-300 font-bold flex items-center gap-1 tabular-nums mt-0.5"
                  dir="ltr"
                >
                  <TonCrystalIcon size={12} />
                  <span>≈ {(welcomeGrandLottery?.targetPoolTon || 200).toFixed(2)} TON</span>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#F5D061]" />
                  <span>{tr(lang, 'زمان قرعه‌کشی:', 'Draw In:')}</span>
                </div>
                <div
                  data-testid="welcome-lottery-countdown"
                  className="flex items-center gap-1 font-mono text-xs font-black tabular-nums mt-1"
                  dir="ltr"
                >
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-[#F5D061]">
                    {welcomeDays}d
                  </span>
                  <span>:</span>
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-white">
                    {welcomeHours}h
                  </span>
                  <span>:</span>
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-white">
                    {welcomeMinutes}m
                  </span>
                </div>
                <div
                  data-testid="welcome-lottery-participants"
                  className="text-xs font-mono text-slate-400 tabular-nums mt-1 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-[#F5D061]" />
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
                className="min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-xs"
              >
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <VipTicketIcon size={15} />
                  <span>{tr(lang, 'بلیت رایگان شما ثبت شد', 'Free Ticket Registered')}</span>
                </span>
                <span className="font-mono font-black text-[#F5D061] tabular-nums" dir="ltr">
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
                className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.75),0_8px_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-[#D4AF37]/35 text-xs font-bold text-[#F5D061] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#F5D061] shrink-0" />
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
            className="relative overflow-hidden rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <RoyalJackpotCrownIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#F5D061] truncate">
                    {tr(lang, 'ابر جک‌پات ماهانه VIP', 'Monthly VIP Super-Jackpot')}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {tr(lang, 'خزانه سرریز جوایز • ویژه وفاداران', 'Rollover Prize Vault • VIP Exclusive')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="toggle-monthly-rules-btn"
                onClick={() => setShowMonthlyRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#F5D061]" />
                <span>{tr(lang, 'راهنما', 'Rules')}</span>
                {showMonthlyRules ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showMonthlyRules && (
              <div
                data-testid="monthly-rules-drawer"
                className="p-3 rounded-2xl bg-[#07090E] border border-white/[0.08] text-xs text-slate-300 leading-relaxed space-y-1"
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

            <div className="grid grid-cols-2 gap-2.5 bg-[#07090E] border border-white/[0.08] rounded-2xl p-3.5">
              <div>
                <div className="text-xs text-slate-400 font-medium">
                  {tr(lang, 'موجودی خزانه:', 'Vault Pool:')}
                </div>
                <div
                  data-testid="monthly-super-pot-ton"
                  className="font-mono text-3xl font-black text-[#F5D061] tabular-nums mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TonCrystalIcon size={20} />
                  <span>{(monthlySuperJackpot.accumulatedPoolTon || 0).toFixed(2)}</span>
                </div>
                <div
                  className="font-mono text-xs text-emerald-300 tabular-nums flex items-center gap-1 mt-0.5"
                  dir="ltr"
                >
                  <TelegramStarIcon size={12} />
                  <span>
                    ≈ {(monthlySuperJackpot.accumulatedPoolStars || 0).toLocaleString('en-US')} Stars
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#F5D061]" />
                  <span>{tr(lang, 'قرعه‌کشی ماهانه:', 'Monthly Draw:')}</span>
                </div>
                <div
                  data-testid="monthly-super-pot-countdown"
                  className="flex items-center gap-1 font-mono text-xs font-black tabular-nums mt-1"
                  dir="ltr"
                >
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-[#F5D061]">
                    {monthlyDays}d
                  </span>
                  <span>:</span>
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-white">
                    {monthlyHours}h
                  </span>
                  <span>:</span>
                  <span className="px-2 py-1 rounded-lg bg-[#111622] border border-white/[0.08] text-white">
                    {monthlyMinutes}m
                  </span>
                </div>
                {lastRolloverItem && (
                  <div className="text-xs font-mono text-[#F5D061] tabular-nums mt-1" dir="ltr">
                    +{Number(lastRolloverItem.rolloverTon || 0).toFixed(2)} TON Rollover
                  </div>
                )}
              </div>
            </div>

            {/* Compact Qualification Progress */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#F5D061]" />
                  {tr(lang, 'صلاحیت VIP شما:', 'VIP Status:')}
                </span>
                <span
                  data-testid="monthly-vip-qualification-badge"
                  className={`font-black text-xs tabular-nums flex items-center gap-1 ${
                    monthlyVipQualification.isQualified ? 'text-emerald-300' : 'text-[#F5D061]'
                  }`}
                >
                  {monthlyVipQualification.isQualified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tr(lang, 'واجد شرایط', 'Qualified')}</span>
                    </>
                  ) : (
                    <span dir="ltr">{monthlyVipQualification.overallProgressPercent}%</span>
                  )}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#07090E] border border-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(6, monthlyVipQualification.overallProgressPercent)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-2xl bg-[#111622] border border-white/[0.08] text-center">
                  <div className="text-slate-400">{tr(lang, 'بلیت‌ها', 'Tickets')}</div>
                  <div className="font-mono font-black text-white tabular-nums mt-0.5" dir="ltr">
                    {monthlyVipQualification.regularTicketsBoughtCount}/
                    {monthlyVipQualification.minTicketsRequired}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#111622] border border-white/[0.08] text-center">
                  <div className="text-slate-400">XP</div>
                  <div className="font-mono font-black text-emerald-300 tabular-nums mt-0.5" dir="ltr">
                    {monthlyVipQualification.userXp}/{monthlyVipQualification.minXpRequired}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#111622] border border-[#D4AF37]/40 text-center">
                  <div className="text-[#F5D061]">{tr(lang, 'سوپر بلیت', 'VIP Slips')}</div>
                  <div
                    data-testid="monthly-vip-super-tickets-count"
                    className="font-mono font-black text-[#F5D061] tabular-nums mt-0.5 flex items-center justify-center gap-1"
                    dir="ltr"
                  >
                    <RoyalJackpotCrownIcon size={13} />
                    <span>
                      {Math.max(
                        myVipSuperTickets.length,
                        monthlyVipQualification.vipSuperTicketsEarnedTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 3: سندیکا (SYNDICATES — Group Ticket Buying)
          ===================================================================== */}
      {activeSubTab === 'SYNDICATES' && (
        <div data-testid="lobby-panel-SYNDICATES" className="space-y-3.5">
          <section
            data-testid="syndicate-squad-pools-card"
            className="rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <LuxuryIconBadge variant="emerald" size="md">
                  <SquadSyndicateIcon size={20} />
                </LuxuryIconBadge>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {tr(lang, 'سندیکای گروهی بلیت', 'Telegram Squad Pools')}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr(lang, 'خرید اشتراکی • تقسیم خودکار جایزه', 'Pooled Tickets • Auto Pro-Rata Split')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSyndicateRules((prev) => !prev)}
                  className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-[#F5D061]" />
                  <span>{tr(lang, 'راهنما', 'Info')}</span>
                </button>

                <button
                  type="button"
                  data-testid="open-create-squad-modal-btn"
                  onClick={() => {
                    HapticEngine.impactOccurred('medium');
                    setCreateSquadModalOpen(true);
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tr(lang, 'ساخت سندیکا', 'Create Squad')}</span>
                </button>
              </div>
            </div>

            {showSyndicateRules && (
              <div className="p-3 rounded-2xl bg-[#07090E] border border-white/[0.08] text-xs text-slate-300 leading-relaxed space-y-1">
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
                    className="rounded-2xl p-5 bg-[#07090E] border border-white/[0.08] text-center space-y-1.5"
                  >
                    <div className="text-base font-bold text-[#F5D061]">
                      {tr(lang, 'هنوز سندیکایی ساخته نشده است', 'No Active Squad Pools Yet')}
                    </div>
                    <p className="text-xs text-slate-400">
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
                <div className="grid grid-cols-1 gap-3">
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
                    const localizedSynName = localizeServerText(lang, syn.name);
                    const inviteLink = `https://t.me/${botHandleClean}?startapp=syn_${syn.inviteCode}`;
                    const shareText = encodeURIComponent(
                      `${localizedSynName} (${syn.id}) • ${syn.filledShares}/${syn.targetShares}:`
                    );
                    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
                      inviteLink
                    )}&text=${shareText}`;

                    return (
                      <div
                        key={syn.id}
                        data-testid={`syndicate-pool-item-${syn.id}`}
                        className="rounded-2xl p-3.5 bg-[#07090E] border border-white/[0.08] hover:border-[#D4AF37]/45 flex flex-col gap-3 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <LuxuryIconBadge
                              variant={syn.status === 'OPEN' ? 'emerald' : 'gold'}
                              size="sm"
                            >
                              <SquadSyndicateIcon size={16} />
                            </LuxuryIconBadge>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-mono text-xs font-black text-[#F5D061] tabular-nums"
                                  dir="ltr"
                                >
                                  #{syn.id}
                                </span>
                                <span className="text-base font-bold text-white">
                                  {localizedSynName}
                                </span>
                              </div>
                              <span className="text-xs text-emerald-300 font-medium">
                                {syn.status === 'OPEN'
                                  ? tr(lang, 'صندوق باز • آماده خرید سهام', 'OPEN • Instant Share Mint')
                                  : syn.status === 'FULL'
                                  ? tr(lang, 'تکمیل ظرفیت', 'FULL SQUAD')
                                  : tr(lang, 'تسویه‌شده', 'SETTLED')}
                              </span>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums"
                            dir="ltr"
                          >
                            <span className="text-emerald-300 flex items-center gap-1">
                              <VipTicketIcon size={12} />
                              <span>{syn.ticketIds.length}</span>
                            </span>
                            <span>·</span>
                            <span className="text-[#F5D061] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>{syn.members.length}</span>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {tr(lang, 'سهام:', 'Shares:')}{' '}
                              <strong className="text-[#F5D061] font-mono tabular-nums" dir="ltr">
                                {syn.filledShares}/{syn.targetShares}
                              </strong>
                            </span>
                            <span
                              className="text-emerald-300 font-mono tabular-nums flex items-center gap-1"
                              dir="ltr"
                            >
                              {activeTmaCurrency === 'STARS' ? (
                                <TelegramStarIcon size={11} />
                              ) : (
                                <TonCrystalIcon size={11} />
                              )}
                              <span>
                                {formatActiveTmaAmount(syn.sharePriceUsdt)} /{' '}
                                {tr(lang, 'سهم', 'share')}
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#111622] border border-white/[0.08] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#F5D061] transition-all duration-500"
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
                                  className="px-2 py-0.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-200 flex items-center gap-1"
                                >
                                  <span className="font-bold truncate max-w-[75px]">
                                    {localizeServerText(lang, m.username)}
                                  </span>
                                  <span
                                    className="font-mono text-[#F5D061] font-black tabular-nums"
                                    dir="ltr"
                                  >
                                    {m.sharesCount}x ({ratioPct}%)
                                  </span>
                                </span>
                              );
                            })}
                          </div>

                          {syn.totalPrizeWonTon > 0 && (
                            <div
                              className="text-emerald-300 text-xs font-black font-mono tabular-nums flex items-center gap-1"
                              dir="ltr"
                            >
                              <RoyalJackpotCrownIcon size={13} />
                              <span>+{syn.totalPrizeWonTon.toFixed(6)} TON</span>
                            </div>
                          )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/[0.08]">
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
                              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#F5D061]" />
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
                              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-slate-200 text-xs font-bold flex items-center gap-1"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                              <span>{tr(lang, 'تلگرام', 'Share')}</span>
                            </a>
                          </div>

                          {syn.status === 'OPEN' && remainingShares > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="flex items-center gap-1 bg-[#111622] border border-white/[0.08] rounded-xl p-1"
                                dir="ltr"
                              >
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
                                      className={`px-2 py-1 rounded-lg font-mono text-xs font-black tabular-nums cursor-pointer ${
                                        selectedJoinShares === qtyOpt
                                          ? 'bg-[#F5D061] text-[#090B10]'
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
                                  setSyndicateToast(localizeServerText(lang, res.message));
                                  setTimeout(() => setSyndicateToast(null), 4000);
                                }}
                                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                <VipTicketIcon size={13} />
                                <span>
                                  {joiningSyndicateId === syn.id
                                    ? tr(lang, 'ثبت...', 'Joining...')
                                    : tr(
                                        lang,
                                        `خرید (${selectedJoinShares})`,
                                        `Join (${selectedJoinShares}x)`
                                      )}
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
                className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center"
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
        <div data-testid="lobby-panel-REWARDS" className="space-y-3.5">
          {/* 4.1 INSTANT VIP CASHBACK VAULT CARD */}
          <section
            data-testid="instant-vip-cashback-vault-card"
            className="rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="emerald" size="md">
                  <CashbackEmeraldVaultIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">
                    {tr(lang, 'قلک کش‌بک و ریک‌بک آنی', 'Instant VIP Cashback Vault')}
                  </h2>
                  <div className="text-xs text-slate-400 truncate">
                    {tr(
                      lang,
                      '۳٪ بلیت‌ها + ۱.۵٪ بازی‌ها • بدون کارمزد',
                      '3% Tickets + 1.5% Games • Zero Fee'
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#07090E] border border-white/[0.08] p-3">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'قابل برداشت (TON):', 'Claimable (TON):')}
                </div>
                <div
                  data-testid="lobby-claimable-rakeback-ton"
                  className="text-base font-black font-mono text-emerald-300 tabular-nums mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TonCrystalIcon size={15} />
                  <span>{(rakebackVault?.claimableTon || 0).toFixed(6)} TON</span>
                </div>
                <div className="text-xs font-mono text-slate-400 tabular-nums mt-0.5" dir="ltr">
                  {tr(lang, 'کل:', 'Total:')} {(rakebackVault?.lifetimeEarnedTon || 0).toFixed(6)}{' '}
                  TON
                </div>
              </div>

              <div className="rounded-2xl bg-[#07090E] border border-white/[0.08] p-3">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'قابل برداشت (Stars):', 'Claimable (Stars):')}
                </div>
                <div
                  data-testid="lobby-claimable-rakeback-stars"
                  className="text-base font-black font-mono text-[#F5D061] tabular-nums mt-0.5 flex items-center gap-1.5"
                  dir="ltr"
                >
                  <TelegramStarIcon size={15} />
                  <span>
                    {Math.round(rakebackVault?.claimableStars || 0).toLocaleString('en-US')}
                  </span>
                </div>
                <div
                  className="text-xs font-mono text-slate-400 tabular-nums mt-0.5 flex items-center gap-1"
                  dir="ltr"
                >
                  <span>{tr(lang, 'کل:', 'Total:')}</span>
                  <span>
                    {Math.round(rakebackVault?.lifetimeEarnedStars || 0).toLocaleString('en-US')}
                  </span>
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
                setRakebackToast(localizeServerText(lang, res.message));
                setTimeout(() => setRakebackToast(null), 4500);
              }}
              className={`w-full min-h-[46px] py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                hasClaimableCashback
                  ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)]'
                  : 'bg-[#111622] text-slate-400 border border-white/[0.08] opacity-75 cursor-not-allowed'
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
            className="rounded-3xl p-4 bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_16px_36px_rgba(0,0,0,0.75)] space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md">
                  <AmbassadorRocketIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#F5D061] truncate">
                    {tr(
                      lang,
                      'باشگاه سفیران (۲٪ پورسانت نقد مادام‌العمر)',
                      '2% Lifetime Referral Vault & Quests'
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {tr(
                      lang,
                      '۲٪ خرید بلیت دوستان + ۰.۵٪ بازی‌های آنی',
                      '2% Ticket Sales + 0.5% Mini-Games'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReferralRules((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-[#F5D061]" />
                <span>{tr(lang, 'راهنما', 'Info')}</span>
              </button>
            </div>

            {showReferralRules && (
              <div className="p-3 rounded-2xl bg-[#07090E] border border-white/[0.08] text-xs text-slate-300 leading-relaxed space-y-1">
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
                tr(
                  lang,
                  'به لاتاری بلاکچینی LuckyDrop در تلگرام بپیوندید! استخرهای ۸۵٪ و جک‌پات ۱,۰۰۰ دلاری:',
                  'Join LuckyDrop TON Lottery! 85% Prize Pools & $1,000 Welcome Draw:'
                )
              );
              const tgShareHref = `https://t.me/share/url?url=${encodeURIComponent(
                myInviteUrl
              )}&text=${shareMsg}`;

              return (
                <div className="rounded-2xl p-3 bg-[#07090E] border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-[#F5D061]" />
                      <span>{tr(lang, 'لینک دعوت اختصاصی شما:', 'Personal Invite Link:')}</span>
                    </span>
                    <span className="font-mono text-xs text-emerald-300 font-bold" dir="ltr">
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
                      className="flex-1 min-w-[180px] min-h-[42px] px-3 py-2 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.1] text-left font-mono text-xs text-[#F5D061] flex items-center justify-between gap-2 cursor-pointer"
                      dir="ltr"
                    >
                      <span className="truncate">{myInviteUrl}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#D4AF37]/20 text-[#F5D061] text-[10px] font-black flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        {copiedMyRefLink
                          ? tr(lang, 'کپی شد!', 'Copied!')
                          : tr(lang, 'کپی', 'Copy')}
                      </span>
                    </button>

                    <a
                      href={tgShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="share-referral-telegram-btn"
                      className="min-h-[42px] px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'ارسال تلگرام', 'Share')}</span>
                    </a>
                  </div>

                  {!referralProfile?.referredByUserKey && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.08]">
                      <input
                        type="text"
                        dir="ltr"
                        data-testid="bind-referral-code-input"
                        value={manualReferrerInput}
                        onChange={(e) => setManualReferrerInput(e.target.value)}
                        placeholder="ref_..."
                        className="flex-1 h-9 px-3 rounded-xl bg-[#111622] border border-white/[0.1] text-xs font-mono text-white outline-none focus:border-[#F5D061]"
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
                          setReferralQuestToast(localizeServerText(lang, res.message));
                          if (res.ok) setManualReferrerInput('');
                          setTimeout(() => setReferralQuestToast(null), 4000);
                        }}
                        className="h-9 px-3 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.12] text-xs font-bold text-[#F5D061] disabled:opacity-40 cursor-pointer"
                      >
                        {bindingReferrer ? '...' : tr(lang, 'ثبت معرف', 'Bind')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Live Referral Commission Vault Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-2xl p-2.5 bg-[#07090E] border border-white/[0.08] text-center">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'قابل برداشت (TON)', 'Claimable TON')}
                </div>
                <div
                  data-testid="referral-claimable-ton"
                  className="font-mono text-xs sm:text-sm font-black text-emerald-300 tabular-nums mt-0.5 flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <TonCrystalIcon size={13} />
                  <span>{(referralProfile?.claimableReferralTon || 0).toFixed(6)} TON</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#07090E] border border-white/[0.08] text-center">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'قابل برداشت (Stars)', 'Claimable Stars')}
                </div>
                <div
                  data-testid="referral-claimable-stars"
                  className="font-mono text-xs sm:text-sm font-black text-[#F5D061] tabular-nums mt-0.5 flex items-center justify-center gap-1"
                  dir="ltr"
                >
                  <TelegramStarIcon size={13} />
                  <span>{Math.floor(referralProfile?.claimableReferralStars || 0)}</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#07090E] border border-white/[0.08] text-center">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'دعوت‌شده / فعال', 'Invited / Active')}
                </div>
                <div
                  data-testid="referral-invited-vs-active"
                  className="font-mono text-xs sm:text-sm font-black text-white tabular-nums mt-0.5"
                  dir="ltr"
                >
                  {referralProfile?.invitedCount || 0} /{' '}
                  <span className="text-emerald-300">{referralProfile?.activeBuyersCount || 0}</span>
                </div>
              </div>

              <div className="rounded-2xl p-2.5 bg-[#07090E] border border-white/[0.08] text-center">
                <div className="text-xs text-slate-400">
                  {tr(lang, 'کل درآمد', 'Lifetime TON')}
                </div>
                <div
                  data-testid="referral-lifetime-earned"
                  className="font-mono text-xs sm:text-sm font-black text-[#F5D061] tabular-nums mt-0.5 flex items-center justify-center gap-1"
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
                setReferralQuestToast(localizeServerText(lang, res.message));
                setTimeout(() => setReferralQuestToast(null), 4500);
              }}
              className="w-full min-h-[46px] px-4 py-3 rounded-2xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] disabled:opacity-45 cursor-pointer transition-all flex items-center justify-center gap-1.5"
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
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-base font-bold text-white flex items-center gap-1.5">
                  <WelcomeGiftVaultIcon size={16} />
                  <span>{tr(lang, 'مأموریت‌های رایگان و سوپر بلیت', 'Free Quests & VIP Tickets')}</span>
                </div>
                <span
                  className="font-mono text-xs font-black text-emerald-300 tabular-nums"
                  dir="ltr"
                >
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
                      className="rounded-2xl p-3 bg-[#07090E] border border-white/[0.08] flex items-center justify-between gap-3 flex-wrap"
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
                          <span className="text-xs font-bold text-white">{cleanTitle}</span>
                          <span
                            dir="ltr"
                            className="text-[#F5D061] font-mono text-xs font-black tabular-nums"
                          >
                            · +{q.xpReward} XP
                          </span>
                          {q.vipSuperTicketsReward > 0 && (
                            <span
                              dir="ltr"
                              className="text-emerald-300 font-mono text-xs font-black tabular-nums inline-flex items-center gap-1"
                            >
                              <span>· +{q.vipSuperTicketsReward} VIP</span>
                              <VipTicketIcon size={12} />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#111622] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-[#F5D061]"
                              style={{ width: `${Math.max(6, pct)}%` }}
                            />
                          </div>
                          <span
                            className="font-mono text-xs text-slate-400 tabular-nums"
                            dir="ltr"
                          >
                            {q.currentProgress}/{q.targetProgress}
                          </span>
                        </div>
                      </div>

                      <div>
                        {q.claimed ? (
                          <span
                            data-testid={`growth-quest-claimed-${q.id}`}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1"
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
                              setReferralQuestToast(localizeServerText(lang, res.message));
                              setTimeout(() => setReferralQuestToast(null), 4500);
                            }}
                            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                              q.eligibleToClaim
                                ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10]'
                                : 'bg-[#111622] border border-white/[0.08] text-slate-400 opacity-60 cursor-not-allowed'
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
                className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold text-center"
              >
                {referralQuestToast}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          SHARED FOOTER LINKS & PROVABLY FAIR SIGNATURE (No Duplicate Support Button)
          ===================================================================== */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('mini-games');
          }}
          className="min-h-[54px] flex items-center gap-2.5 p-3 rounded-2xl bg-[#0B0E14] border border-white/[0.08] hover:border-[#D4AF37]/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_12px_28px_rgba(0,0,0,0.7)] text-right transition-all cursor-pointer"
        >
          <img
            src="/assets/3d/luckydrop-3d-games-banner.png"
            alt="Plinko & Crash 3D"
            className="w-10 h-10 rounded-xl object-cover border border-white/[0.12] shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {tr(lang, '۹ بازی آنی کازینو', '9 Instant Games')}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate" dir="ltr">
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
          className="min-h-[54px] flex items-center gap-2.5 p-3 rounded-2xl bg-[#0B0E14] border border-white/[0.08] hover:border-[#D4AF37]/45 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_12px_28px_rgba(0,0,0,0.7)] text-right transition-all cursor-pointer"
        >
          <LuxuryIconBadge variant="gold" size="sm">
            <RoyalJackpotCrownIcon size={18} />
          </LuxuryIconBadge>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {tr(lang, 'تالار برندگان', 'Winners Hall')}
            </div>
            <div className="text-[10px] text-[#F5D061] font-mono mt-0.5 truncate">
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
          className="min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#0B0E14] hover:bg-[#111622] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{tr(lang, 'پروفایل VIP', 'VIP Profile')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('how-it-works')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#0B0E14] hover:bg-[#111622] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span className="truncate">{tr(lang, 'راهنما', 'Guide')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('terms')}
          className="min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#0B0E14] hover:bg-[#111622] border border-white/[0.08] text-xs font-bold text-slate-200 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{tr(lang, 'قوانین', 'Rules')}</span>
        </button>
      </section>

      {/* Provably Fair Seed & Official Brand Signature Footer (Zero Duplicate Support Buttons) */}
      <div
        data-testid="lobby-official-brand-signature"
        className="p-3 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] flex items-center justify-between gap-2 text-xs text-slate-400"
      >
        <div className="flex items-center gap-2 min-w-0">
          <LuckyDropLogo size={20} />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#F5D061] truncate">
              {localizeServerText(lang, officialBrandTitle)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate" dir="ltr">
              SHA256: {activeLotterySpec.serverSeedHash.slice(0, 16)}...
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('transparency')}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-emerald-300 font-bold text-xs cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{tr(lang, 'اثبات عدالت', 'Verify RNG')}</span>
        </button>
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
          <div className="w-full max-w-md rounded-3xl bg-[#0B0E14] border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_50px_rgba(0,0,0,0.9)] p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <LuxuryIconBadge variant="gold" size="sm">
                  <WelcomeGiftVaultIcon size={16} />
                </LuxuryIconBadge>
                <div>
                  <h3 className="text-base font-bold text-[#F5D061]">
                    {tr(
                      lang,
                      'انتخاب اعداد بلیت رایگان ۱,۰۰۰ دلاری',
                      'Pick Numbers for Free $1,000 Ticket'
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr(
                      lang,
                      '۵ عدد اصلی (۱ تا ۵۰) + ۱ گوی طلایی (۱ تا ۱۵)',
                      '5 Main (1-50) + 1 Golden Ball (1-15)'
                    )}
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

            <div className="flex items-center justify-between gap-2 bg-[#07090E] border border-white/[0.08] rounded-2xl p-2.5">
              <div className="flex items-center gap-1.5 tabular-nums" dir="ltr">
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
                <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-mono text-xs font-black flex items-center justify-center">
                  ★{welcomePickedGolden}
                </span>
              </div>

              <button
                type="button"
                data-testid="welcome-modal-quick-pick-btn"
                onClick={handleWelcomeQuickPick}
                className="px-2.5 py-1.5 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-[#D4AF37]/40 text-[#F5D061] text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>{tr(lang, 'تصادفی', 'Quick Pick')}</span>
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-300 mb-1.5">
                {tr(
                  lang,
                  `۵ عدد اصلی (${welcomePickedMain.length}/5):`,
                  `5 Main Numbers (${welcomePickedMain.length}/5):`
                )}
              </div>
              <div className="grid grid-cols-10 gap-1 tabular-nums" dir="ltr">
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => {
                  const selected = welcomePickedMain.includes(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleWelcomeMainNumber(num)}
                      className={`h-7 rounded-lg font-mono text-[10px] font-black transition-all cursor-pointer ${
                        selected
                          ? 'bg-emerald-400 text-[#090B10] scale-105'
                          : 'bg-[#111622] hover:bg-[#161D2C] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-[#F5D061] mb-1.5">
                {tr(
                  lang,
                  `گوی طلایی (★${welcomePickedGolden}):`,
                  `Golden Ball (★${welcomePickedGolden}):`
                )}
              </div>
              <div className="grid grid-cols-8 gap-1.5 tabular-nums" dir="ltr">
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
                          ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] scale-105'
                          : 'bg-[#111622] hover:bg-[#161D2C] text-[#F5D061] border border-white/[0.08]'
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
                className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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
                className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#111622] text-slate-300 font-bold text-xs cursor-pointer"
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
          <div className="w-full max-w-md rounded-3xl bg-[#0B0E14] border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_50px_rgba(0,0,0,0.9)] p-4 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <LuxuryIconBadge variant="emerald" size="sm">
                  <SquadSyndicateIcon size={16} />
                </LuxuryIconBadge>
                <div>
                  <h3 className="text-base font-bold text-[#F5D061]">
                    {tr(lang, 'ساخت سندیکای جدید', 'Create Telegram Squad')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr(
                      lang,
                      'هر سهم = ۱ بلیت واقعی + ۱۵ XP پاداش لیدر',
                      '1 Share = 1 Ticket + 15 XP Synergy'
                    )}
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
              <label className="text-xs font-bold text-slate-200 block">
                {tr(lang, 'نام سندیکا:', 'Squad Name:')}
              </label>
              <input
                type="text"
                data-testid="create-squad-name-input"
                value={squadNameInput}
                maxLength={42}
                onChange={(e) => setSquadNameInput(e.target.value)}
                placeholder={tr(lang, 'مثلاً: نهنگ‌های طلایی TON', 'e.g., Golden TON Whales')}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#07090E] border border-white/[0.1] focus:border-[#F5D061] text-xs font-bold text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                {tr(lang, 'ظرفیت کل سهام:', 'Target Shares:')}
              </label>
              <div className="grid grid-cols-4 gap-2 tabular-nums" dir="ltr">
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
                    className={`min-h-[40px] py-2 rounded-xl font-mono text-xs font-black border transition-all cursor-pointer ${
                      squadTargetShares === targetOpt
                        ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] border-[#FFF6D6]/50'
                        : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:bg-[#161D2C]'
                    }`}
                  >
                    {targetOpt}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                {tr(
                  lang,
                  `سهام اولیه شما (${squadInitialShares} سهم):`,
                  `Your Initial Shares (${squadInitialShares}):`
                )}
              </label>
              <div className="grid grid-cols-5 gap-1.5 tabular-nums" dir="ltr">
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
                      className={`min-h-[38px] py-1.5 rounded-xl font-mono text-xs font-black border transition-all cursor-pointer ${
                        squadInitialShares === initOpt
                          ? 'bg-emerald-400 text-[#090B10] border-emerald-300'
                          : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:bg-[#161D2C]'
                      }`}
                    >
                      {initOpt}x
                    </button>
                  ))}
              </div>
            </div>

            <div className="rounded-2xl p-3 bg-[#07090E] border border-white/[0.08] space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>{tr(lang, 'دور هدف:', 'Target Round:')}</span>
                <span className="font-mono font-bold text-white">
                  {localizeServerText(lang, cleanTitleFa(activeLotterySpec.titleFa))}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{tr(lang, 'مبلغ پرداختی:', 'Total Cost:')}</span>
                <span
                  className="font-mono font-black text-[#F5D061] tabular-nums flex items-center gap-1"
                  dir="ltr"
                >
                  {activeTmaCurrency === 'STARS' ? (
                    <TelegramStarIcon size={12} />
                  ) : (
                    <TonCrystalIcon size={12} />
                  )}
                  <span>
                    {formatActiveTmaAmount(activeLotterySpec.ticketPriceUsdt * squadInitialShares)}
                  </span>
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
                    setSyndicateToast(localizeServerText(lang, res.message));
                    setTimeout(() => setSyndicateToast(null), 4500);
                  } else {
                    HapticEngine.notificationOccurred('error');
                    setSyndicateToast(localizeServerText(lang, res.message));
                  }
                }}
                className="flex-1 min-h-[46px] py-2.5 rounded-2xl bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] font-black text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AmbassadorRocketIcon size={15} />
                <span>
                  {creatingSquad
                    ? tr(lang, 'در حال ساخت...', 'Creating...')
                    : tr(
                        lang,
                        `ساخت و خرید ${squadInitialShares} سهم`,
                        `Launch (${squadInitialShares}x)`
                      )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCreateSquadModalOpen(false)}
                className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#111622] text-slate-300 font-bold text-xs cursor-pointer"
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
