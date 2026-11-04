import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  InstantMiniGameId,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import { PlinkoGameArena } from './PlinkoGameArena.tsx';
import { CrashGameArena } from './CrashGameArena.tsx';
import { DiceGameArena } from './DiceGameArena.tsx';
import { MinesGameArena } from './MinesGameArena.tsx';
import { ScratchCardArena } from './ScratchCardArena.tsx';
import {
  Tower3DGameArena,
  Wheel3DGameArena,
  HiLo3DGameArena,
  GoldenCoin3DGameArena,
} from './Extra3DMiniGamesArena.tsx';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';
import { HapticEngine } from '../utils/telegramTma.ts';
import { tr } from '../utils/i18n.ts';
import {
  LuxuryIconBadge,
  LuxuryDiceCubeIcon,
  LuxuryMineBombIcon,
  MinesEmeraldGemIcon,
  LuxuryPlinkoPyramidIcon,
  LuxuryCrashMultiplierIcon,
  ProvablyFairShieldIcon,
  VipTicketIcon,
  RoyalJackpotCrownIcon,
  WelcomeGiftVaultIcon,
  TonCrystalIcon,
} from './ui/LuxuryIcons.tsx';

const renderMiniGameEmblem = (id: InstantMiniGameId, size = 18) => {
  switch (id) {
    case 'PLINKO':
      return <LuxuryPlinkoPyramidIcon size={size} />;
    case 'CRASH_X':
      return <LuxuryCrashMultiplierIcon size={size} />;
    case 'DICE_52':
      return <LuxuryDiceCubeIcon size={size} />;
    case 'MINES':
      return <LuxuryMineBombIcon size={size} />;
    case 'TOWER_3D':
      return <RoyalJackpotCrownIcon size={size} />;
    case 'WHEEL_3D':
      return <MinesEmeraldGemIcon size={size} />;
    case 'HILO_3D':
      return <VipTicketIcon size={size} />;
    case 'SCRATCH':
      return <WelcomeGiftVaultIcon size={size} />;
    case 'GOLDEN_COIN':
      return <TonCrystalIcon size={size} />;
    default:
      return <LuxuryDiceCubeIcon size={size} />;
  }
};

interface GameCardSpec {
  id: InstantMiniGameId;
  badge: string;
  label: string;
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  rtp: string;
  maxWin: string;
  accentGradient: string;
}

interface GameCategorySpec {
  categoryId: string;
  titleFa: string;
  titleEn: string;
  subtitleEn: string;
  descFa: string;
  descEn: string;
  bannerTheme: 'ARCADE' | 'STRATEGY' | 'WHEEL' | 'HOLO';
  games: GameCardSpec[];
}

const GAME_CATEGORIES_3D: GameCategorySpec[] = [
  {
    categoryId: 'ARCADE_3D',
    titleFa: '۱. بازی‌های فیزیکی و موشکی سه‌بعدی',
    titleEn: '1. 3D Physics & Rocket Arcade',
    subtitleEn: '3D Physics & Exponential Arcade',
    descFa: 'موتور فیزیک ۶۰ فریم بر ثانیه با ضرایب تا 1000x و بلیت رایگان در اسلات‌های طلایی',
    descEn: '60 FPS physics engine with up to 1000x multipliers and golden free-ticket slots',
    bannerTheme: 'ARCADE',
    games: [
      {
        id: 'PLINKO',
        badge: '🟢',
        label: 'Plinko',
        titleFa: 'پلینکو سه‌بعدی (Plinko 3D)',
        titleEn: 'Plinko 3D Pyramid',
        descFa: 'هرم ۸ تا ۱۶ ردیفه با برخوردهای واقعی و ضریب تا 1000x',
        descEn: '8 to 16 row pyramid with real pin collisions & up to 1000x',
        rtp: '99.0%',
        maxWin: '1,000x',
        accentGradient: 'from-emerald-500/30 via-purple-600/25 to-indigo-900/40',
      },
      {
        id: 'CRASH_X',
        badge: '🚀',
        label: 'Crash',
        titleFa: 'انفجار کوانتومی (Crash X 3D)',
        titleEn: 'Quantum Crash X 3D',
        descFa: 'پرواز موشک سه‌بعدی با نمایش زنده شرط و برداشت تمام بازیکنان',
        descEn: '3D rocket ascent with instant cashout before the crash point',
        rtp: '99.0%',
        maxWin: '10,000x',
        accentGradient: 'from-rose-500/30 via-amber-500/25 to-purple-900/40',
      },
    ],
  },
  {
    categoryId: 'STRATEGY_3D',
    titleFa: '۲. بازی‌های استراتژیک و برج کریستالی',
    titleEn: '2. Strategy Vaults & Crystal Tower',
    subtitleEn: '3D Tactical Vaults & Crystal Tower',
    descFa: 'انتخاب مرحله‌به‌مرحله با امکان برداشت آنی (Cash Out) در هر قدم',
    descEn: 'Step-by-step tactical reveals with instant Cash Out after every safe pick',
    bannerTheme: 'STRATEGY',
    games: [
      {
        id: 'MINES',
        badge: '💣',
        label: 'Mines',
        titleFa: 'میدان مین و الماس (Mines 5×5)',
        titleEn: 'Mines & Diamonds (5×5)',
        descFa: 'کشف الماس‌های سه‌بعدی در شبکه ۲۵ خانه‌ای با تنظیم ۱ تا ۱۶ مین',
        descEn: 'Uncover 3D diamonds on a 25-tile grid with 1 to 16 configurable mines',
        rtp: '98.0%',
        maxWin: '24.5x+',
        accentGradient: 'from-cyan-500/30 via-emerald-600/25 to-slate-900/40',
      },
      {
        id: 'TOWER_3D',
        badge: '🏰',
        label: 'Tower 3D',
        titleFa: 'برج کریستالی ۸ طبقه (Tower Rush 3D)',
        titleEn: '8-Floor Crystal Tower 3D',
        descFa: 'صعود سه‌بعدی از ۸ طبقه کریستالی در ۳ سطح آسان، متوسط و سخت',
        descEn: 'Climb 8 crystal floors across Easy, Medium, and Hard difficulty modes',
        rtp: '98.0%',
        maxWin: '250.8x',
        accentGradient: 'from-purple-500/35 via-fuchsia-600/25 to-indigo-950/40',
      },
    ],
  },
  {
    categoryId: 'WHEEL_DICE_3D',
    titleFa: '۳. گردونه رویال و تاس ۵۲ بیتی سه‌بعدی',
    titleEn: '3. Royale Wheel & 52-Bit Quantum Dice',
    subtitleEn: '3D Wheel of Fortune & 52-Bit Quantum Dice',
    descFa: 'تنظیم دقیق شانس برد و گردونه ۱۶ سگمنتی نئونی با جک‌پات 77.77',
    descEn: 'Precision win-chance slider & 16-segment neon wheel with 77.77 jackpot',
    bannerTheme: 'WHEEL',
    games: [
      {
        id: 'WHEEL_3D',
        badge: '🎡',
        label: 'Wheel 3D',
        titleFa: 'گردونه شانس رویال (Wheel Royale 3D)',
        titleEn: 'Wheel Royale 3D',
        descFa: 'چرخ سه‌بعدی ۱۶ سگمنتی با ۳ سطح ریسک و ضریب تا 50x',
        descEn: '16-segment 3D wheel with 3 risk levels and calibrated 98% RTP',
        rtp: '98.0%',
        maxWin: '15.68x',
        accentGradient: 'from-amber-500/35 via-purple-600/25 to-slate-950/40',
      },
      {
        id: 'DICE_52',
        badge: '🎲',
        label: '52-Bit Dice',
        titleFa: 'تاس کوانتومی ۵۲ بیتی (52-Bit Dice)',
        titleEn: '52-Bit Quantum Dice',
        descFa: 'اسلایدر سه‌بعدی با دقت ۰.۰۱ و بلیت رایگان لاتاری روی عدد 77.77',
        descEn: '0.01 precision slider with free lottery ticket bonus on roll 77.77',
        rtp: '99.0%',
        maxWin: '9,900x',
        accentGradient: 'from-emerald-500/30 via-teal-600/25 to-purple-950/40',
      },
    ],
  },
  {
    categoryId: 'CARDS_COIN_3D',
    titleFa: '۴. کارت‌های هولوگرافیک و سکه طلایی TON',
    titleEn: '4. Holographic Cards & Golden TON Coin',
    subtitleEn: '3D Holographic Cards & Golden Coin',
    descFa: 'بازی‌های فوق‌سریع با انیمیشن چرخش سه‌بعدی کارت و سکه طلایی',
    descEn: 'Ultra-fast instant games with 3D holographic cards and golden coin flip',
    bannerTheme: 'HOLO',
    games: [
      {
        id: 'HILO_3D',
        badge: '🃏',
        label: 'Hi-Lo 3D',
        titleFa: 'کارت سایبری بالاتر/پایین‌تر (Hi-Lo 3D)',
        titleEn: 'Cyber Hi-Lo Cards 3D',
        descFa: 'پیش‌بینی کارت بعدی با ضرایب پویا بر اساس احتمال دقیق ریاضی',
        descEn: 'Predict Higher, Lower, or Same with dynamic mathematical odds',
        rtp: '98.0%',
        maxWin: '12.74x',
        accentGradient: 'from-indigo-500/35 via-purple-600/25 to-slate-950/40',
      },
      {
        id: 'SCRATCH',
        badge: '✨',
        label: 'Scratch',
        titleFa: 'کارت اسکرچ هولوگرافیک (Scratch 3×3)',
        titleEn: 'Holographic Scratch 3×3',
        descFa: 'تراشیدن فویل نئونی ۳×۳ با شانس تطابق ۳ نماد و ضریب 100x',
        descEn: 'Scratch 3×3 neon foil to match 3 symbols up to 100x',
        rtp: '97.5%',
        maxWin: '100x',
        accentGradient: 'from-fuchsia-500/35 via-purple-600/25 to-indigo-950/40',
      },
      {
        id: 'GOLDEN_COIN',
        badge: '🪙',
        label: 'Coin 3D',
        titleFa: 'پرتاب سکه طلایی (Golden Coin 3D)',
        titleEn: 'Golden TON Coin Flip 3D',
        descFa: 'چرخش سه‌بعدی سکه طلایی TON (شیر یا خط) با ضریب دقیق 1.96x',
        descEn: '3D Golden TON Coin Flip (Heads or Tails) with exact 1.96x payout',
        rtp: '98.0%',
        maxWin: '1.96x',
        accentGradient: 'from-yellow-500/35 via-amber-600/25 to-slate-950/40',
      },
    ],
  },
];

/* Dedicated 8K Octane 3D Rendered Banner Artwork for each Category */
const Category3DBannerArtwork: React.FC<{ theme: GameCategorySpec['bannerTheme'] }> = ({
  theme,
}) => {
  const bannerImg =
    theme === 'ARCADE'
      ? LUXURY_IMAGES.gamesBanner3d
      : theme === 'STRATEGY'
      ? LUXURY_IMAGES.fairnessAudit
      : theme === 'WHEEL'
      ? LUXURY_IMAGES.poolHourlyFlash
      : LUXURY_IMAGES.userVipBanner;

  return (
    <div className="relative w-full h-24 rounded-xl overflow-hidden bg-[#080512]">
      <img
        src={bannerImg}
        alt={`LuckyDrop 3D ${theme} Arena`}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center opacity-85 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090612] via-[#090612]/35 to-transparent" />
    </div>
  );
};

export const InstantMiniGamesView: React.FC = () => {
  const {
    provablyFairSeeds,
    pamRollback,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
    navigateTo,
    formatActiveTmaAmount,
    tmaXpPoints,
    tickets,
    tonUsdRate,
    lang,
  } = useLottery();

  const [activeGame, setActiveGame] = useState<InstantMiniGameId>('PLINKO');
  const [showCategoryCatalog, setShowCategoryCatalog] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<MiniGameEvaluationResult | null>(null);
  const [lastDebitUuid, setLastDebitUuid] = useState<string | null>(null);
  const [clientSeedInput, setClientSeedInput] = useState<string>(provablyFairSeeds.clientSeed);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [showFairnessDrawer, setShowFairnessDrawer] = useState<boolean>(false);

  const handleRoundSettled = (
    evaluation: MiniGameEvaluationResult,
    debitUuid: string
  ) => {
    setLastResult(evaluation);
    setLastDebitUuid(debitUuid || null);
  };

  const handleVoidAndRollbackLastRound = async () => {
    if (!lastDebitUuid || !lastResult) return;
    HapticEngine.impactOccurred('medium');
    const rbRes = await pamRollback({
      referenceTransactionUuid: lastDebitUuid,
      roundId: lastResult.roundId,
      vertical: `INSTANT_${lastResult.gameId}`,
      note: `استرداد وجه دور باطل‌شده (${lastResult.roundId}) با ثبت Tombstone`,
    });
    if (rbRes.ok) {
      setStatusBanner(
        tr(
          lang,
          `↩️ دور ${lastResult.roundId} باطل و مبلغ شرط از طریق PAM Rollback مسترد شد!`,
          `↩️ Round ${lastResult.roundId} voided and refunded via PAM Rollback!`
        )
      );
      setLastDebitUuid(null);
    }
  };

  const MINI_GAME_TABS: Array<{
    id: InstantMiniGameId;
    badge: string;
    label: string;
  }> = [
    { id: 'PLINKO', badge: '🟢', label: 'Plinko' },
    { id: 'CRASH_X', badge: '🚀', label: 'Crash' },
    { id: 'DICE_52', badge: '🎲', label: '52-Bit Dice' },
    { id: 'MINES', badge: '💣', label: 'Mines' },
    { id: 'TOWER_3D', badge: '🏰', label: 'Tower 3D' },
    { id: 'WHEEL_3D', badge: '🎡', label: 'Wheel 3D' },
    { id: 'HILO_3D', badge: '🃏', label: 'Hi-Lo 3D' },
    { id: 'SCRATCH', badge: '✨', label: 'Scratch' },
    { id: 'GOLDEN_COIN', badge: '🪙', label: 'Coin 3D' },
  ];

  const xpProgressInCurrentCycle = tmaXpPoints % 100;

  return (
    <div className="space-y-3 px-3 pt-2 pb-28 max-w-[440px] mx-auto">
      {/* =====================================================================
          TOP HEADER BAR: QUICK PILL SWITCHER + CATEGORIZED 3D HUB TOGGLE
          ===================================================================== */}
      <div className="relative overflow-hidden flex items-center justify-between gap-2 rounded-2xl bg-[#130d24]/95 border border-amber-400/30 px-3.5 py-2.5 shadow-lg">
        <img
          src={LUXURY_IMAGES.gamesBanner3d}
          alt="LuckyDrop 3D Games Arena Banner"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#090514]/90 via-[#130d24]/82 to-[#090514]/90 pointer-events-none" />
        <div className="relative z-10 min-w-0 flex items-center gap-2.5">
          <LuxuryIconBadge variant="gold" size="sm" glow>
            <LuxuryDiceCubeIcon size={18} />
          </LuxuryIconBadge>
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-white flex items-center gap-1.5 flex-wrap">
              <span className="whitespace-nowrap">
                {tr(lang, 'آرنا سه‌بعدی LuckyDrop', 'LuckyDrop 3D Arena')}
              </span>
              <span
                dir="ltr"
                className="px-1.5 py-0.5 rounded-md bg-[#00f59b]/15 border border-[#00f59b]/30 text-[10px] font-mono text-[#00f59b] whitespace-nowrap shrink-0"
              >
                0.01 – ∞ TON
              </span>
            </div>
            <div className="text-[10px] text-purple-200/85 mt-0.5 font-mono truncate" dir="ltr">
              Free Ticket XP: {xpProgressInCurrentCycle}/100 • Tickets: {tickets.length}
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-games-category-hub-btn"
          onClick={() => {
            HapticEngine.selectionChanged();
            setShowCategoryCatalog((prev) => !prev);
          }}
          className={`relative z-10 h-8 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
            showCategoryCatalog
              ? 'bg-[#00f59b] text-[#041f14] border-[#00f59b]'
              : 'bg-purple-600/45 text-white border-amber-400/40 hover:bg-purple-600/60'
          }`}
        >
          {showCategoryCatalog ? (
            <LuxuryPlinkoPyramidIcon size={14} />
          ) : (
            <MinesEmeraldGemIcon size={14} />
          )}
          <span>
            {showCategoryCatalog
              ? tr(lang, 'بازگشت به بازی', 'Back to Game')
              : tr(lang, 'دسته‌بندی (۹ بازی)', 'All 9 Games')}
          </span>
        </button>
      </div>

      {/* =====================================================================
          GAME SELECTOR STRIP (Horizontal Scroller for all 9 3D Games)
          ===================================================================== */}
      <div
        className="overflow-x-auto no-scrollbar flex gap-2 py-1"
        dir="ltr"
      >
        {MINI_GAME_TABS.map((g) => {
          const isSelected = activeGame === g.id && !showCategoryCatalog;
          return (
            <motion.button
              whileTap={{ scale: 0.96 }}
              key={g.id}
              type="button"
              data-testid={`select-minigame-${g.id}`}
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveGame(g.id);
                setShowCategoryCatalog(false);
              }}
              className={`h-9 px-3.5 rounded-full border text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#9333ea] to-[#7e22ce] border-purple-400/60 text-white shadow-[0_0_16px_rgba(147,51,234,0.4)]'
                  : 'bg-[#130d24]/90 border-purple-500/20 text-purple-200/80 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center justify-center transition-transform duration-200">
                {renderMiniGameEmblem(g.id, 16)}
              </span>
              <span>{g.label}</span>
            </motion.button>
          );
        })}
      </div>

      {statusBanner && (
        <div className="p-3 rounded-2xl bg-[#130d24]/90 border border-purple-400/40 text-purple-100 text-xs font-semibold">
          {statusBanner}
        </div>
      )}

      {/* =====================================================================
          CATEGORIZED 3D GAMES SHOWCASE (۴ دسته مجزا با بنر سه‌بعدی اختصاصی)
          ===================================================================== */}
      <AnimatePresence mode="wait">
        {showCategoryCatalog ? (
          <motion.div
            key="category-catalog"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            data-testid="categorized-games-showcase"
            className="space-y-4"
          >
            {GAME_CATEGORIES_3D.map((cat) => (
              <div
                key={cat.categoryId}
                data-testid={`game-category-box-${cat.categoryId}`}
                className="rounded-2xl bg-[#130d24]/95 border border-purple-500/30 p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.45)] space-y-3"
              >
                {/* Dedicated 3D Category Artwork Cover */}
                <div className="relative rounded-xl overflow-hidden border border-purple-400/25">
                  <Category3DBannerArtwork theme={cat.bannerTheme} />
                  <div
                    dir="ltr"
                    className="absolute top-2 left-2.5 px-2 py-0.5 rounded-md bg-[#090612]/80 border border-purple-500/30 text-[9px] font-mono text-[#00f59b] backdrop-blur-sm"
                  >
                    {cat.subtitleEn}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#090612] via-[#090612]/85 to-transparent px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">
                      {tr(lang, cat.titleFa, cat.titleEn)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-purple-200/80 leading-relaxed">
                  {tr(lang, cat.descFa, cat.descEn)}
                </p>

                {/* Games Grid inside Category Frame */}
                <div className="grid grid-cols-1 gap-2.5">
                  {cat.games.map((gm) => {
                    const isCurrent = activeGame === gm.id;
                    return (
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        key={gm.id}
                        data-testid={`catalog-game-card-${gm.id}`}
                        onClick={() => {
                          HapticEngine.impactOccurred('light');
                          setActiveGame(gm.id);
                          setShowCategoryCatalog(false);
                        }}
                        className={`rounded-xl bg-gradient-to-r ${gm.accentGradient} border ${
                          isCurrent ? 'border-[#00f59b]' : 'border-purple-500/25'
                        } p-3 flex items-center justify-between gap-3 cursor-pointer`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <LuxuryIconBadge
                            variant={
                              gm.id === 'MINES'
                                ? 'crimson'
                                : gm.id === 'PLINKO' || gm.id === 'WHEEL_3D'
                                ? 'emerald'
                                : 'gold'
                            }
                            size="lg"
                            glow={isCurrent}
                          >
                            {renderMiniGameEmblem(gm.id, 24)}
                          </LuxuryIconBadge>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {tr(lang, gm.titleFa, gm.titleEn)}
                            </div>
                            <div className="text-[11px] text-purple-200/75 truncate mt-0.5">
                              {tr(lang, gm.descFa, gm.descEn)}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono" dir="ltr">
                              <span className="text-[#00f59b]">RTP {gm.rtp}</span>
                              <span className="text-purple-400">•</span>
                              <span className="text-[#fbbf24]">Max {gm.maxWin}</span>
                              <span className="text-purple-400">•</span>
                              <span className="text-purple-200">0.01–∞ TON</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="h-8 px-3 rounded-lg bg-[#00f59b] text-[#041f14] font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                          {tr(lang, 'ورود ↗', 'Play ↗')}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          /* =====================================================================
             ACTIVE MINI-GAME ARENA (150ms Fade & Slide Transition)
             ===================================================================== */
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {activeGame === 'PLINKO' && (
              <PlinkoGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'CRASH_X' && (
              <CrashGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'DICE_52' && (
              <DiceGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'MINES' && (
              <MinesGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'TOWER_3D' && (
              <Tower3DGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'WHEEL_3D' && (
              <Wheel3DGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'HILO_3D' && (
              <HiLo3DGameArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'SCRATCH' && (
              <ScratchCardArena onRoundSettled={handleRoundSettled} />
            )}
            {activeGame === 'GOLDEN_COIN' && (
              <GoldenCoin3DGameArena onRoundSettled={handleRoundSettled} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          PLAYER LOYALTY XP BAR & POST-GAME VERIFICATION RESULT
          (Pre-game hash is hidden; hash is displayed strictly AFTER round finishes)
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2.5">
        {/* Clean Player Loyalty XP Progress Bar */}
        <div className="rounded-xl bg-[#090612]/90 border border-purple-500/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#fbbf24] inline-flex items-center gap-1.5">
              <VipTicketIcon size={15} />
              <span>
                {tr(
                  lang,
                  'پاداش وفاداری LuckyDrop (بلیت رایگان لاتاری)',
                  'LuckyDrop Loyalty Reward (Free Lottery Ticket)'
                )}
              </span>
            </span>
            <span className="font-mono text-[10px] text-[#00f59b]" dir="ltr">
              {xpProgressInCurrentCycle} / 100 XP
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden" dir="ltr">
            <div
              className="h-full bg-gradient-to-r from-[#fbbf24] to-[#00f59b] transition-all duration-300"
              style={{ width: `${Math.min(100, xpProgressInCurrentCycle)}%` }}
            />
          </div>
          <p className="text-[10px] text-purple-200/75 leading-relaxed">
            {tr(
              lang,
              `با هر دور بازی امتیاز XP دریافت می‌کنید و با رسیدن به ۱۰۰ XP یک کوپن رایگان قرعه‌کشی به حساب شما اضافه می‌شود. (1 TON = $${tonUsdRate.toFixed(2)})`,
              `Earn XP on every mini-game wager; reaching 100 XP automatically awards a free lottery ticket. (1 TON = $${tonUsdRate.toFixed(2)})`
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-purple-200/80 inline-flex items-center gap-1.5">
            <ProvablyFairShieldIcon size={14} className="shrink-0" />
            <span>
              {tr(
                lang,
                'کد هش (hash) پس از پایان هر دست بازی نمایش داده می‌شود.',
                'Round HMAC-SHA256 hash is revealed immediately after each bet.'
              )}
            </span>
          </span>

          <div className="flex items-center gap-1 shrink-0" dir="ltr">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => setShowFairnessDrawer((prev) => !prev)}
              className="px-2 py-1 rounded-lg bg-[#090612] border border-purple-500/25 text-[10px] font-medium text-purple-200/80 hover:text-white cursor-pointer"
            >
              Client Seed
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => navigateTo('transparency')}
              className="px-2 py-1 rounded-lg bg-[#090612] border border-purple-500/25 text-[10px] font-medium text-[#fbbf24] cursor-pointer"
            >
              Verifier ↗
            </motion.button>
          </div>
        </div>

        {showFairnessDrawer && (
          <div className="pt-2 border-t border-purple-500/15 flex items-center gap-1.5" dir="ltr">
            <input
              type="text"
              value={clientSeedInput}
              onChange={(e) => setClientSeedInput(e.target.value)}
              placeholder="Client Seed"
              className="flex-1 h-8 rounded-lg bg-[#090612] border border-purple-500/25 px-2.5 text-xs font-mono text-white"
            />
            <button
              type="button"
              onClick={() => updateProvablyFairClientSeed(clientSeedInput)}
              className="h-8 px-2.5 rounded-lg bg-[#fbbf24] text-slate-950 font-bold text-[11px] cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => rotateProvablyFairServerSeed()}
              className="h-8 px-2.5 rounded-lg bg-[#00f59b] text-[#041f14] font-bold text-[11px] cursor-pointer"
            >
              Rotate ↻
            </button>
          </div>
        )}

        {lastResult && (
          <div
            data-testid="minigame-result-card"
            className="pt-2 border-t border-purple-500/15 space-y-1.5 text-xs"
            dir="ltr"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-semibold tabular-nums ${
                  lastResult.won ? 'text-[#00f59b]' : 'text-purple-300/60'
                }`}
              >
                {lastResult.payoutUsdt > 0
                  ? `+${formatActiveTmaAmount(lastResult.payoutUsdt)} (${lastResult.multiplier}x)`
                  : `Round ${lastResult.roundId} • 0x`}
              </span>

              {lastDebitUuid && (
                <button
                  type="button"
                  data-testid="minigame-rollback-round-btn"
                  onClick={handleVoidAndRollbackLastRound}
                  className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px] font-semibold cursor-pointer"
                >
                  ↩ PAM Rollback
                </button>
              )}
            </div>

            {/* Post-Game Cryptographic Hash revealed strictly AFTER round completion */}
            <div className="rounded-lg bg-[#090612] border border-purple-500/20 px-2.5 py-1.5 flex items-baseline gap-1.5">
              <span className="text-[10px] font-mono font-bold text-[#fbbf24] shrink-0">
                hash
              </span>
              <code
                data-testid="minigame-postbet-hash"
                className="text-[9.5px] font-mono text-purple-200/90 break-all select-all"
              >
                {lastResult.hmacHex}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

