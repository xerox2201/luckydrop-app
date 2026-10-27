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
import { HapticEngine } from '../utils/telegramTma.ts';

export const InstantMiniGamesView: React.FC = () => {
  const {
    provablyFairSeeds,
    pamRollback,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
    navigateTo,
    formatActiveTmaAmount,
  } = useLottery();

  const [activeGame, setActiveGame] = useState<InstantMiniGameId>('PLINKO');
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
    { id: 'SCRATCH', badge: '✨', label: 'Scratch' },
  ];

  return (
    <div className="space-y-3 px-3 pt-2 pb-24 max-w-[440px] mx-auto">
      {/* =====================================================================
          GAME SELECTOR STRIP
          Clean horizontal pill scroller to switch between Plinko, Crash,
          52-Bit Dice, Mines, and Scratch.
          ===================================================================== */}
      <div
        className="overflow-x-auto no-scrollbar flex gap-2 py-2"
        dir="ltr"
      >
        {MINI_GAME_TABS.map((g) => {
          const isSelected = activeGame === g.id;
          return (
            <motion.button
              whileTap={{ scale: 0.96 }}
              key={g.id}
              type="button"
              data-testid={`select-minigame-${g.id}`}
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveGame(g.id);
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
          ACTIVE MINI-GAME ARENA (150ms Fade & Slide Transition)
          ===================================================================== */}
      <AnimatePresence mode="wait">
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
          {activeGame === 'SCRATCH' && (
            <ScratchCardArena onRoundSettled={handleRoundSettled} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* =====================================================================
          COMPACT PROVABLY FAIR SEED & LAST ROUND AUDIT BAR
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md space-y-2">
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
