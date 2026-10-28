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
import { HapticEngine } from '../utils/telegramTma.ts';

interface GameCardSpec {
  id: InstantMiniGameId;
  badge: string;
  label: string;
  titleFa: string;
  descFa: string;
  rtp: string;
  maxWin: string;
  accentGradient: string;
}

interface GameCategorySpec {
  categoryId: string;
  titleFa: string;
  subtitleEn: string;
  descFa: string;
  bannerTheme: 'ARCADE' | 'STRATEGY' | 'WHEEL' | 'HOLO';
  games: GameCardSpec[];
}

const GAME_CATEGORIES_3D: GameCategorySpec[] = [
  {
    categoryId: 'ARCADE_3D',
    titleFa: '۱. بازی‌های فیزیکی و موشکی سه‌بعدی',
    subtitleEn: '3D Physics & Exponential Arcade',
    descFa: 'موتور فیزیک ۶۰ فریم بر ثانیه با ضرایب تا 1000x و بلیت رایگان در اسلات‌های طلایی',
    bannerTheme: 'ARCADE',
    games: [
      {
        id: 'PLINKO',
        badge: '🟢',
        label: 'Plinko',
        titleFa: 'پلینکو سه‌بعدی (Plinko 3D)',
        descFa: 'هرم ۸ تا ۱۶ ردیفه با برخوردهای واقعی و ضریب تا 1000x',
        rtp: '99.0%',
        maxWin: '1,000x',
        accentGradient: 'from-emerald-500/30 via-purple-600/25 to-indigo-900/40',
      },
      {
        id: 'CRASH_X',
        badge: '🚀',
        label: 'Crash',
        titleFa: 'انفجار کوانتومی (Crash X 3D)',
        descFa: 'پرواز موشک سه‌بعدی با نمایش زنده شرط و برداشت تمام بازیکنان',
        rtp: '99.0%',
        maxWin: '10,000x',
        accentGradient: 'from-rose-500/30 via-amber-500/25 to-purple-900/40',
      },
    ],
  },
  {
    categoryId: 'STRATEGY_3D',
    titleFa: '۲. بازی‌های استراتژیک و برج کریستالی',
    subtitleEn: '3D Tactical Vaults & Crystal Tower',
    descFa: 'انتخاب مرحله‌به‌مرحله با امکان برداشت آنی (Cash Out) در هر قدم',
    bannerTheme: 'STRATEGY',
    games: [
      {
        id: 'MINES',
        badge: '💣',
        label: 'Mines',
        titleFa: 'میدان مین و الماس (Mines 5×5)',
        descFa: 'کشف الماس‌های سه‌بعدی در شبکه ۲۵ خانه‌ای با تنظیم ۱ تا ۱۶ مین',
        rtp: '98.0%',
        maxWin: '24.5x+',
        accentGradient: 'from-cyan-500/30 via-emerald-600/25 to-slate-900/40',
      },
      {
        id: 'TOWER_3D',
        badge: '🏰',
        label: 'Tower 3D',
        titleFa: 'برج کریستالی ۸ طبقه (Tower Rush 3D)',
        descFa: 'صعود سه‌بعدی از ۸ طبقه کریستالی در ۳ سطح آسان، متوسط و سخت',
        rtp: '98.0%',
        maxWin: '250.8x',
        accentGradient: 'from-purple-500/35 via-fuchsia-600/25 to-indigo-950/40',
      },
    ],
  },
  {
    categoryId: 'WHEEL_DICE_3D',
    titleFa: '۳. گردونه رویال و تاس ۵۲ بیتی سه‌بعدی',
    subtitleEn: '3D Wheel of Fortune & 52-Bit Quantum Dice',
    descFa: 'تنظیم دقیق شانس برد و گردونه ۱۶ سگمنتی نئونی با جک‌پات 77.77',
    bannerTheme: 'WHEEL',
    games: [
      {
        id: 'WHEEL_3D',
        badge: '🎡',
        label: 'Wheel 3D',
        titleFa: 'گردونه شانس رویال (Wheel Royale 3D)',
        descFa: 'چرخ سه‌بعدی ۱۶ سگمنتی با ۳ سطح ریسک و ضریب تا 50x',
        rtp: '98.0%',
        maxWin: '50.0x',
        accentGradient: 'from-amber-500/35 via-purple-600/25 to-slate-950/40',
      },
      {
        id: 'DICE_52',
        badge: '🎲',
        label: '52-Bit Dice',
        titleFa: 'تاس کوانتومی ۵۲ بیتی (52-Bit Dice)',
        descFa: 'اسلایدر سه‌بعدی با دقت ۰.۰۱ و بلیت رایگان لاتاری روی عدد 77.77',
        rtp: '99.0%',
        maxWin: '9,900x',
        accentGradient: 'from-emerald-500/30 via-teal-600/25 to-purple-950/40',
      },
    ],
  },
  {
    categoryId: 'CARDS_COIN_3D',
    titleFa: '۴. کارت‌های هولوگرافیک و سکه طلایی TON',
    subtitleEn: '3D Holographic Cards & Golden Coin',
    descFa: 'بازی‌های فوق‌سریع با انیمیشن چرخش سه‌بعدی کارت و سکه طلایی',
    bannerTheme: 'HOLO',
    games: [
      {
        id: 'HILO_3D',
        badge: '🃏',
        label: 'Hi-Lo 3D',
        titleFa: 'کارت سایبری بالاتر/پایین‌تر (Hi-Lo 3D)',
        descFa: 'پیش‌بینی کارت بعدی با ضرایب پویا بر اساس احتمال دقیق ریاضی',
        rtp: '98.0%',
        maxWin: '12.74x',
        accentGradient: 'from-indigo-500/35 via-purple-600/25 to-slate-950/40',
      },
      {
        id: 'SCRATCH',
        badge: '✨',
        label: 'Scratch',
        titleFa: 'کارت اسکرچ هولوگرافیک (Scratch 3×3)',
        descFa: 'تراشیدن فویل نئونی ۳×۳ با شانس تطابق ۳ نماد و ضریب 100x',
        rtp: '97.5%',
        maxWin: '100x',
        accentGradient: 'from-fuchsia-500/35 via-purple-600/25 to-indigo-950/40',
      },
      {
        id: 'GOLDEN_COIN',
        badge: '🪙',
        label: 'Coin 3D',
        titleFa: 'پرتاب سکه طلایی (Golden Coin 3D)',
        descFa: 'چرخش سه‌بعدی سکه طلایی TON (شیر یا خط) با ضریب دقیق 1.96x',
        rtp: '98.0%',
        maxWin: '1.96x',
        accentGradient: 'from-yellow-500/35 via-amber-600/25 to-slate-950/40',
      },
    ],
  },
];

/* Dedicated 3D Isometric SVG Banner Artwork for each Category */
const Category3DBannerArtwork: React.FC<{ theme: GameCategorySpec['bannerTheme'] }> = ({
  theme,
}) => {
  if (theme === 'ARCADE') {
    return (
      <svg viewBox="0 0 400 96" className="w-full h-20 rounded-xl overflow-hidden block">
        <defs>
          <linearGradient id="arcBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e1038" />
            <stop offset="55%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <radialGradient id="orbGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#00f59b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00f59b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="96" fill="url(#arcBg)" />
        <circle cx="85" cy="48" r="42" fill="url(#orbGlow)" />
        {/* 3D Plinko Pyramid Pegs */}
        {[0, 1, 2, 3].map((r) =>
          Array.from({ length: r + 2 }, (_, c) => (
            <circle
              key={`${r}-${c}`}
              cx={65 - r * 10 + c * 20}
              cy={22 + r * 15}
              r="3.5"
              fill="#e2e8f0"
            />
          ))
        )}
        <circle cx="72" cy="42" r="6" fill="#fbbf24" />
        {/* 3D Exponential Crash Rocket Curve */}
        <path
          d="M 190 78 Q 265 74 335 20"
          fill="none"
          stroke="#00f59b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polygon points="342,15 326,20 334,30" fill="#fbbf24" />
      </svg>
    );
  }

  if (theme === 'STRATEGY') {
    return (
      <svg viewBox="0 0 400 96" className="w-full h-24 rounded-xl overflow-hidden block">
        <defs>
          <linearGradient id="stratBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#171033" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>
        </defs>
        <rect width="400" height="96" fill="url(#stratBg)" />
        {/* Isometric 3D Vault Tiles */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={34 + c * 22}
              y={14 + r * 20}
              width="17"
              height="16"
              rx="4"
              fill={r === 1 && c === 1 ? '#00f59b' : '#312e81'}
              stroke="#a855f7"
              strokeWidth="1"
            />
          ))
        )}
        {/* 3D Crystal Tower Layers */}
        {[0, 1, 2, 3].map((f) => (
          <rect
            key={f}
            x={265 - (3 - f) * 6}
            y={14 + f * 15}
            width={72 + (3 - f) * 12}
            height="11"
            rx="3"
            fill={f === 0 ? '#fbbf24' : '#7e22ce'}
            opacity={0.9 - f * 0.12}
          />
        ))}
      </svg>
    );
  }

  if (theme === 'WHEEL') {
    return (
      <svg viewBox="0 0 400 96" className="w-full h-24 rounded-xl overflow-hidden block">
        <defs>
          <linearGradient id="whlBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="55%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
        </defs>
        <rect width="400" height="96" fill="url(#whlBg)" />
        {/* 3D Wheel of Fortune Graphic */}
        <circle cx="72" cy="44" r="30" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="3" />
        <circle cx="72" cy="44" r="19" fill="none" stroke="#00f59b" strokeWidth="2" strokeDasharray="8 6" />
        <circle cx="72" cy="44" r="6" fill="#fbbf24" />
        {/* 3D Quantum Slider Track */}
        <rect x="165" y="36" width="195" height="14" rx="7" fill="#090612" stroke="#a855f7" strokeWidth="1.5" />
        <rect x="167" y="38" width="115" height="10" rx="5" fill="#00f59b" />
        <polygon points="282,22 294,31 282,40 270,31" fill="#fbbf24" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 96" className="w-full h-24 rounded-xl overflow-hidden block">
      <defs>
        <linearGradient id="holoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b0764" />
          <stop offset="50%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#422006" />
        </linearGradient>
      </defs>
      <rect width="400" height="96" fill="url(#holoBg)" />
      {/* 3D Holographic Playing Cards */}
      <rect x="38" y="14" width="38" height="52" rx="6" transform="rotate(-8 57 40)" fill="#1e1b4b" stroke="#00f59b" strokeWidth="2" />
      <rect x="66" y="14" width="38" height="52" rx="6" transform="rotate(8 85 40)" fill="#311042" stroke="#fbbf24" strokeWidth="2" />
      <text x="77" y="45" fill="#fbbf24" fontSize="14" fontWeight="900" fontFamily="monospace">
        A♠
      </text>
      {/* 3D Golden TON Coin */}
      <circle cx="325" cy="42" r="24" fill="#f59e0b" stroke="#fef08a" strokeWidth="2.5" />
      <text x="314" y="47" fill="#090612" fontSize="12" fontWeight="900" fontFamily="monospace">
        TON
      </text>
    </svg>
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
        `↩️ دور ${lastResult.roundId} باطل و مبلغ شرط از طریق PAM Rollback مسترد شد!`
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
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#130d24]/90 border border-purple-500/25 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-white flex items-center gap-1.5 flex-wrap">
            <span className="whitespace-nowrap">🎮 آرنا سه‌بعدی</span>
            <span
              dir="ltr"
              className="px-1.5 py-0.5 rounded-md bg-[#00f59b]/15 border border-[#00f59b]/30 text-[10px] font-mono text-[#00f59b] whitespace-nowrap shrink-0"
            >
              0.01 – ∞ TON
            </span>
          </div>
          <div className="text-[10px] text-purple-300/75 mt-0.5 font-mono truncate" dir="ltr">
            Free Ticket XP: {xpProgressInCurrentCycle}/100 • Tickets: {tickets.length}
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-games-category-hub-btn"
          onClick={() => {
            HapticEngine.selectionChanged();
            setShowCategoryCatalog((prev) => !prev);
          }}
          className={`h-8 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1 whitespace-nowrap ${
            showCategoryCatalog
              ? 'bg-[#00f59b] text-[#041f14] border-[#00f59b]'
              : 'bg-purple-600/35 text-white border-purple-400/40 hover:bg-purple-600/50'
          }`}
        >
          <span>{showCategoryCatalog ? '🎯 بازگشت به بازی' : '🗂️ دسته‌بندی (۹ بازی)'}</span>
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
              className={`h-9 px-3.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#9333ea] to-[#7e22ce] border-purple-400/60 text-white shadow-[0_0_16px_rgba(147,51,234,0.4)]'
                  : 'bg-[#130d24]/90 border-purple-500/20 text-purple-200/80 hover:text-white'
              }`}
            >
              <span>{g.badge}</span>
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
                    <span className="text-xs font-extrabold text-white">{cat.titleFa}</span>
                  </div>
                </div>

                <p className="text-[11px] text-purple-200/80 leading-relaxed">{cat.descFa}</p>

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
                          <div className="w-11 h-11 rounded-xl bg-[#090612]/90 border border-purple-400/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {gm.badge}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {gm.titleFa}
                            </div>
                            <div className="text-[11px] text-purple-200/75 truncate mt-0.5">
                              {gm.descFa}
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
                          ورود ↗
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
          COMPACT PROVABLY FAIR SEED, ZERO-LOSS FREE TICKET ENGINE & AUDIT BAR
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2.5">
        {/* Zero-Loss Free Lottery Ticket Progress Bar */}
        <div className="rounded-xl bg-[#090612]/90 border border-purple-500/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#fbbf24]">
              🎟️ موتور بلیت رایگان لاتاری (بدون ریسک ضرر خزانه)
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
            شرط‌های بالای <strong className="text-white">1.00 TON</strong> در اسلات‌های طلایی مستقیماً از محل{' '}
            <strong className="text-[#00f59b]">استخر ذخیره ۳٪ (Rollover Reserve)</strong> بلیت رایگان صادر می‌کنند و شرط‌های خرد (<strong className="text-white">0.01 تا 0.99 TON</strong>) امتیاز XP جمع می‌کنند تا در ۱۰۰ XP بلیت رایگان بدون کسری خزانه صادر شود. (نرخ زنده: 1 TON = ${tonUsdRate.toFixed(2)})
          </p>
        </div>

        <div className="flex items-start justify-between gap-2" dir="ltr">
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
            <span className="text-[11px] font-mono font-bold text-[#fbbf24] shrink-0">hash</span>
            <code
              data-testid="minigame-prebet-seed-hash"
              className="text-[10px] font-mono text-purple-200/90 break-all select-all leading-relaxed"
            >
              {provablyFairSeeds.serverSeedHash}
            </code>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => setShowFairnessDrawer((prev) => !prev)}
              className="px-2 py-1 rounded-lg bg-[#090612] border border-purple-500/25 text-[10px] font-medium text-purple-200/80 hover:text-white cursor-pointer"
            >
              Seeds
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
            className="pt-2 border-t border-purple-500/15 flex items-center justify-between gap-2 text-xs"
            dir="ltr"
          >
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
        )}
      </div>
    </div>
  );
};
