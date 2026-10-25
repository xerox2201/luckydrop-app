import React, { useState, useMemo } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  InstantMiniGameId,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import { PlinkoGameArena } from './PlinkoGameArena.tsx';
import { CrashGameArena } from './CrashGameArena.tsx';
import { DiceGameArena } from './DiceGameArena.tsx';

export const InstantMiniGamesView: React.FC = () => {
  const {
    balanceUsdt,
    provablyFairSeeds,
    playInstantMiniGame,
    pamRollback,
    setWalletDrawerOpen,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
    navigateTo,
  } = useLottery();

  const [activeGame, setActiveGame] = useState<InstantMiniGameId>('DICE_52');
  const [betAmount, setBetAmount] = useState<number>(5);
  const [diceTarget, setDiceTarget] = useState<number>(50);
  const [coinSide, setCoinSide] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [crashTargetX, setCrashTargetX] = useState<number>(2.0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<MiniGameEvaluationResult | null>(null);
  const [lastDebitUuid, setLastDebitUuid] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ evaluation: MiniGameEvaluationResult; debitUuid: string }>
  >([]);
  const [clientSeedInput, setClientSeedInput] = useState<string>(provablyFairSeeds.clientSeed);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [showFairnessBar, setShowFairnessBar] = useState<boolean>(false);

  const diceMultiplier = Number((99 / diceTarget).toFixed(4));
  const currentPotentialPayout =
    activeGame === 'DICE_52'
      ? Number((betAmount * diceMultiplier).toFixed(2))
      : activeGame === 'GOLDEN_COIN'
      ? Number((betAmount * 1.94).toFixed(2))
      : Number((betAmount * crashTargetX).toFixed(2));

  // Live Session Telemetry (Wagered, Payout, Net Profit, Win Count)
  const sessionStats = useMemo(() => {
    let wagered = 0;
    let payout = 0;
    let wins = 0;
    for (const item of history) {
      wagered += item.evaluation.betAmountUsdt || 0;
      payout += item.evaluation.payoutUsdt || 0;
      if (item.evaluation.won) wins += 1;
    }
    return {
      wagered,
      payout,
      netProfit: payout - wagered,
      wins,
      rounds: history.length,
    };
  }, [history]);

  const handlePlayRound = async () => {
    setPlaying(true);
    setStatusBanner(null);
    const res = await playInstantMiniGame({
      gameId: activeGame,
      betAmountUsdt: betAmount,
      diceRollUnder: diceTarget,
      coinSide,
      crashAutoCashoutX: crashTargetX,
    });
    setPlaying(false);

    if (!res.ok || !res.evaluation) {
      setStatusBanner(`⚠️ ${res.error || 'خطا در اجرای دور بازی'}`);
      return;
    }

    setLastResult(res.evaluation);
    setLastDebitUuid(res.debitTransactionUuid || null);
    setHistory((prev) => [
      { evaluation: res.evaluation!, debitUuid: res.debitTransactionUuid || '' },
      ...prev.slice(0, 14),
    ]);
  };

  const handlePlinkoRoundSettled = (
    evaluation: MiniGameEvaluationResult,
    debitUuid: string
  ) => {
    setLastResult(evaluation);
    setLastDebitUuid(debitUuid || null);
    setHistory((prev) => [
      { evaluation, debitUuid: debitUuid || '' },
      ...prev.slice(0, 14),
    ]);
  };

  const handleVoidAndRollbackLastRound = async () => {
    if (!lastDebitUuid || !lastResult) return;
    const rbRes = await pamRollback({
      referenceTransactionUuid: lastDebitUuid,
      roundId: lastResult.roundId,
      vertical: `INSTANT_${lastResult.gameId}`,
      note: `استرداد وجه دور باطل‌شده (${lastResult.roundId}) با ثبت Tombstone`,
    });
    if (rbRes.ok) {
      setStatusBanner(
        `↩️ دور ${lastResult.roundId} باطل و مبلغ شرط از طریق PAM Rollback (مرجع: ${lastDebitUuid.slice(
          0,
          14
        )}...) مسترد شد!`
      );
      setLastDebitUuid(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-4 pb-24 lg:pb-12 space-y-4">
      {/* =====================================================================
          CATEGORY 3: PRO CASINO STUDIO FRAME — TOP LIVE STATS & MODE SWITCHER BAR
          ===================================================================== */}
      <div className="studio-arena-frame rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Studio Title & PAM Balance */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#00e701]/15 border border-[#00e701]/40 text-[#00e701] font-mono text-xs font-black">
                60FPS STUDIO
              </span>
              <h1 className="text-base sm:text-lg font-black text-white">
                استودیو بازی‌های آرکید (Stake Originals Plinko 3D • Crash 3D • 52-Bit Dice 3D)
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums" dir="ltr">
              <span className="text-[#fbbf24]">52-Bit HMAC-SHA256</span>
              <span>·</span>
              <span className="text-[#00e701]">99% RTP</span>
              <span>·</span>
              <span data-testid="minigames-pam-balance" className="text-white font-bold">
                PAM: ${balanceUsdt.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Right: 4 Mini-Game Mode Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#1a2c38] p-1 rounded-xl border border-white/[0.07]" dir="ltr">
            {[
              {
                id: 'DICE_52' as const,
                titleFa: '🎲 52-Bit Dice 3D (99% RTP)',
              },
              {
                id: 'PLINKO' as const,
                titleFa: '🟢 Plinko 3D (1000x)',
              },
              {
                id: 'CRASH_X' as const,
                titleFa: '🚀 Crash 3D (98% RTP)',
              },
              {
                id: 'GOLDEN_COIN' as const,
                titleFa: '🪙 Golden Coin 3D',
              },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                data-testid={`select-minigame-${g.id}`}
                onClick={() => setActiveGame(g.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeGame === g.id
                    ? 'bg-[#213743] border-[#00e701] text-white shadow-[0_0_14px_rgba(0,231,1,0.22)]'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {g.titleFa}
              </button>
            ))}
          </div>
        </div>

        {/* Unified Studio Telemetry Sub-Bar: Live Session Profit/Wagered + Recent Outcome Pills + Instant Provably Fair Seed */}
        <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Live Session Profit / Wagered Mini-Tracker */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums" dir="ltr">
            <div className="px-2.5 py-1 rounded-lg bg-[#1a2c38] border border-white/[0.07]">
              <span className="text-slate-400">Session Wagered: </span>
              <strong className="text-white">${sessionStats.wagered.toFixed(2)}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[#1a2c38] border border-white/[0.07]">
              <span className="text-slate-400">Net Profit: </span>
              <strong
                className={
                  sessionStats.netProfit >= 0 ? 'text-[#00e701]' : 'text-[#e9113c]'
                }
              >
                {sessionStats.netProfit >= 0 ? '+' : ''}${sessionStats.netProfit.toFixed(2)}
              </strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[#1a2c38] border border-white/[0.07]">
              <span className="text-slate-400">Wins: </span>
              <strong className="text-[#fbbf24]">
                {sessionStats.wins}/{sessionStats.rounds}
              </strong>
            </div>
          </div>

          {/* Recent Outcome Pills Strip + Provably Fair Seed Drawer Toggle */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" dir="ltr">
            {history.slice(0, 5).map((h, i) => (
              <span
                key={`${h.evaluation.roundId}-${i}`}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-black tabular-nums whitespace-nowrap ${
                  h.evaluation.won
                    ? 'bg-[#00e701]/20 border border-[#00e701]/50 text-[#00e701]'
                    : 'bg-[#213743] border border-white/10 text-slate-400'
                }`}
              >
                {h.evaluation.multiplier}x
              </span>
            ))}

            <button
              type="button"
              onClick={() => setShowFairnessBar((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-[#213743] hover:bg-[#2f4553] border border-[#00e701]/40 text-[#00e701] font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>🛡️ Provably Fair Seed</span>
              <span className="text-[#fbbf24]">#{provablyFairSeeds.nonce}</span>
            </button>

            <button
              type="button"
              onClick={() => setWalletDrawerOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#1a2c38] hover:bg-[#213743] border border-white/10 text-slate-200 font-mono text-[11px] font-bold cursor-pointer whitespace-nowrap"
            >
              Ledger ↗
            </button>
          </div>
        </div>

        {/* Collapsible Instant Provably Fair Seed & Client Seed Editor Strip */}
        {showFairnessBar && (
          <div className="p-3 rounded-xl bg-[#1a2c38] border border-[#00e701]/30 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
            <div className="lg:col-span-6 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">
                Server Seed SHA-256 Commitment (ثبت‌شده قبل از شرط):
              </span>
              <code className="text-[11px] font-mono text-[#00e701] break-all block" dir="ltr">
                {provablyFairSeeds.serverSeedHash}
              </code>
            </div>
            <div className="lg:col-span-6 flex flex-wrap items-center gap-2" dir="ltr">
              <input
                type="text"
                value={clientSeedInput}
                onChange={(e) => setClientSeedInput(e.target.value)}
                placeholder="Client Seed"
                className="flex-1 studio-input-well rounded-lg px-3 py-1.5 text-xs font-mono text-white"
              />
              <button
                type="button"
                onClick={() => updateProvablyFairClientSeed(clientSeedInput)}
                className="px-3 py-1.5 rounded-lg bg-[#fbbf24] text-slate-950 font-black text-xs cursor-pointer"
              >
                Save Client Seed
              </button>
              <button
                type="button"
                onClick={() => rotateProvablyFairServerSeed()}
                className="px-3 py-1.5 rounded-lg bg-[#00e701] text-[#051c08] font-black text-xs cursor-pointer"
              >
                Rotate Seed Pair ↻
              </button>
            </div>
          </div>
        )}
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-sky-200 text-xs font-bold">
          {statusBanner}
        </div>
      )}

      {/* WHEN PLINKO IS ACTIVE: RENDER THE FULL STAKE-STYLE 60FPS 2.5D/3D STUDIO ARENA */}
      {activeGame === 'PLINKO' && (
        <PlinkoGameArena onRoundSettled={handlePlinkoRoundSettled} />
      )}

      {/* WHEN CRASH_X IS ACTIVE: RENDER THE FULL STAKE-STYLE 60FPS 2.5D/3D CRASH STUDIO ARENA */}
      {activeGame === 'CRASH_X' && (
        <CrashGameArena onRoundSettled={handlePlinkoRoundSettled} />
      )}

      {/* WHEN DICE_52 IS ACTIVE: RENDER THE FULL STAKE-STYLE 60FPS 2.5D/3D 52-BIT DICE STUDIO ARENA */}
      {activeGame === 'DICE_52' && (
        <DiceGameArena onRoundSettled={handlePlinkoRoundSettled} />
      )}

      {/* WHEN GOLDEN COIN IS ACTIVE: STAKE-STYLE SPLIT STUDIO ARENA (Left Sidebar #1a2c38 + Right 3D Coin Stage #0f212e) */}
      {activeGame === 'GOLDEN_COIN' && (
        <div className="rounded-3xl overflow-hidden border border-white/[0.07] bg-[#0f212e] grid grid-cols-1 lg:grid-cols-12 shadow-2xl">
          {/* Left Control Sidebar (#1a2c38) */}
          <div className="lg:col-span-4 bg-[#1a2c38] border-b lg:border-b-0 lg:border-l border-white/[0.07] p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <span className="text-xs font-black text-white">🪙 تنظیمات شرط سکه طلایی ۵۲ بیتی</span>
                <span className="text-[11px] font-mono text-[#00e701] font-bold" dir="ltr">
                  1.94x Payout
                </span>
              </div>

              {/* Bet Amount Input Well (#213743) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300">مبلغ شرط (USDT):</label>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums" dir="ltr">
                    Win: +${currentPotentialPayout.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    data-testid="minigame-bet-input"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 studio-input-well rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setBetAmount((prev) => Math.max(1, Math.floor(prev / 2)))}
                    className="px-3 py-2.5 rounded-xl bg-[#213743] hover:bg-[#2f4553] text-xs font-mono font-bold text-slate-200 cursor-pointer"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetAmount((prev) => Math.min(1000, prev * 2))}
                    className="px-3 py-2.5 rounded-xl bg-[#213743] hover:bg-[#2f4553] text-xs font-mono font-bold text-slate-200 cursor-pointer"
                  >
                    2×
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1" dir="ltr">
                  {[5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBetAmount(preset)}
                      className="py-1.5 rounded-lg bg-[#213743] hover:bg-[#2f4553] text-xs font-mono font-bold text-slate-300 cursor-pointer tabular-nums"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heads / Tails Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  انتخاب روی سکه طلایی (ضریب برد: 1.94x):
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCoinSide('HEADS')}
                    className={`py-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      coinSide === 'HEADS'
                        ? 'bg-[#213743] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                        : 'bg-[#0f212e] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👑 شیر طلایی (HEADS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinSide('TAILS')}
                    className={`py-3 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      coinSide === 'TAILS'
                        ? 'bg-[#213743] border-[#00e701] text-[#00e701] shadow-[0_0_15px_rgba(0,231,1,0.2)]'
                        : 'bg-[#0f212e] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    💎 خط سلطنتی (TAILS)
                  </button>
                </div>
              </div>
            </div>

            {/* Tactile Stake Emerald Action Button */}
            <button
              type="button"
              disabled={playing}
              data-testid="play-instant-minigame-btn"
              onClick={handlePlayRound}
              className="w-full py-4 rounded-xl stake-emerald-cta font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">bolt</span>
              <span>
                {playing
                  ? 'در حال پرتاب سکه ۵۲ بیتی...'
                  : `پرتاب سکه ($${betAmount} USDT)`}
              </span>
            </button>
          </div>

          {/* Right 3D Coin Arena (#0f212e) */}
          <div
            className="lg:col-span-8 p-8 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 50% 45%, #1e3748 0%, #0f212e 72%)',
            }}
          >
            <div
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 shadow-[0_20px_50px_rgba(0,0,0,0.75)] transition-transform duration-500 ${
                playing ? 'animate-spin' : 'hover:scale-105'
              } ${
                coinSide === 'HEADS'
                  ? 'lottery-ball-gold border-[#fef08a] text-slate-950'
                  : 'lottery-ball-purple border-purple-300 text-white'
              }`}
            >
              <span className="text-4xl">{coinSide === 'HEADS' ? '👑' : '💎'}</span>
              <span className="font-mono font-black text-sm mt-1 tracking-wider">
                {coinSide}
              </span>
              <span className="font-mono text-[11px] font-bold opacity-80">1.94x</span>
            </div>

            {lastResult && lastResult.gameId === 'GOLDEN_COIN' && (
              <div
                className={`mt-6 px-5 py-2.5 rounded-xl font-mono text-sm font-black border tabular-nums ${
                  lastResult.won
                    ? 'bg-[#00e701]/20 border-[#00e701] text-[#00e701]'
                    : 'bg-[#e9113c]/20 border-[#e9113c] text-rose-300'
                }`}
                dir="ltr"
              >
                {lastResult.outcomeLabel} —{' '}
                {lastResult.won ? `WON +$${lastResult.payoutUsdt.toFixed(2)}` : 'NO WIN'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PROVABLY FAIR PRE-BET COMMITMENT & RECENT 52-BIT ROUNDS AUDIT FOOTER
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 studio-arena-frame rounded-3xl p-6 space-y-5">
          {/* Pre-Bet Commitment Strip */}
          <div className="bg-[#1a2c38] border border-[#00e701]/30 rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#00e701] font-bold">
                🔒 تعهد SHA-256 بذر سرور قبل از شرط (Pre-Bet Server Seed Hash):
              </span>
              <span className="font-mono text-[#fbbf24] tabular-nums" dir="ltr">
                Nonce #{provablyFairSeeds.nonce}
              </span>
            </div>
            <code
              data-testid="minigame-prebet-seed-hash"
              className="text-[11px] font-mono text-slate-300 break-all block"
              dir="ltr"
            >
              {provablyFairSeeds.serverSeedHash}
            </code>
          </div>

          {/* Latest Round Cryptographic Breakdown */}
          {lastResult ? (
            <div
              data-testid="minigame-result-card"
              className={`rounded-2xl p-5 border space-y-3 ${
                lastResult.won
                  ? 'bg-[#00e701]/10 border-[#00e701]/50'
                  : 'bg-[#e9113c]/10 border-[#e9113c]/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-black font-mono tabular-nums ${
                      lastResult.won
                        ? 'bg-[#00e701] text-[#051c08]'
                        : 'bg-[#e9113c]/30 text-rose-200'
                    }`}
                  >
                    {lastResult.payoutUsdt > 0
                      ? `🎉 تسویه آنی PAM: +$${lastResult.payoutUsdt.toFixed(2)} USDT (${lastResult.multiplier}x)`
                      : 'نتیجه دور: بدون برد'}
                  </span>
                  <span className="font-mono text-xs font-bold text-white tabular-nums" dir="ltr">
                    {lastResult.outcomeLabel}
                  </span>
                </div>

                {lastDebitUuid && (
                  <button
                    type="button"
                    data-testid="minigame-rollback-round-btn"
                    onClick={handleVoidAndRollbackLastRound}
                    className="px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[11px] font-bold cursor-pointer"
                  >
                    ↩ تست ابطال و استرداد وجه این دور (PAM Rollback)
                  </button>
                )}
              </div>

              <div
                className="bg-[#0b1620]/90 border border-white/10 rounded-xl p-3 font-mono text-[11px] space-y-1 text-slate-300 tabular-nums"
                dir="ltr"
              >
                <div>
                  <span className="text-slate-500">Round ID:</span>{' '}
                  <span className="text-[#fbbf24]">{lastResult.roundId}</span> |{' '}
                  <span className="text-slate-500">Nonce:</span> #{lastResult.nonce}
                </div>
                <div className="truncate">
                  <span className="text-slate-500">HMAC-SHA256:</span>{' '}
                  <span className="text-[#00e701]">{lastResult.hmacHex.slice(0, 13)}</span>
                  <span className="text-slate-500">{lastResult.hmacHex.slice(13)}</span>
                </div>
                <div>
                  <span className="text-slate-500">First 52-Bit Hex (13 chars):</span>{' '}
                  <span className="text-[#fbbf24]">0x{lastResult.first52BitHex}</span> →{' '}
                  <span className="text-sky-300">
                    Uniform Float X = {lastResult.uniformFloatX.toFixed(12)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-[#1a2c38] border border-white/[0.07] text-xs text-slate-300">
              با اجرای هر دور در Dice، Plinko، Crash یا Golden Coin، جزئیات کامل هش{' '}
              <code className="text-[#00e701]">HMAC-SHA256</code>، خروجی ۵۲ بیتی و شناسه تراکنش کیف پول PAM در این بخش نمایش داده می‌شود.
            </div>
          )}
        </div>

        {/* Right 5 Cols: Seed Customization & Recent Verifiable Rounds */}
        <div className="lg:col-span-5 space-y-6">
          <div className="studio-arena-frame rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">تنظیم بذر کلاینت و چرخش بذر سرور</h3>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="text-xs font-bold text-[#fbbf24] hover:underline cursor-pointer"
              >
                باز کردن راستی‌آزمای کامل ↗
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 block">
                Client Seed (قابل ویرایش توسط بازیکن قبل از هر دور):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={clientSeedInput}
                  onChange={(e) => setClientSeedInput(e.target.value)}
                  className="flex-1 studio-input-well rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => updateProvablyFairClientSeed(clientSeedInput)}
                  className="px-4 py-2 rounded-xl gold-gradient-cta font-black text-xs cursor-pointer"
                >
                  ذخیره
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => rotateProvablyFairServerSeed()}
              className="w-full py-2.5 rounded-xl bg-[#1a2c38] hover:bg-[#213743] border border-[#00e701]/40 text-[#00e701] font-black text-xs cursor-pointer"
            >
              چرخش Server Seed و افشای بذر قبلی برای راستی‌آزمایی
            </button>
          </div>

          <div className="studio-arena-frame rounded-3xl p-6 space-y-3">
            <h3 className="text-base font-black text-white">تاریخچه دورهای اخیر شما (۵۲ بیت HMAC)</h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                هنوز دوری اجرا نشده است. دکمه سبز رنگ اجرای بازی را بزنید تا خروجی ۵۲ بیتی ثبت شود.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scroll">
                {history.map((item, idx) => (
                  <div
                    key={`${item.evaluation.roundId}-${idx}`}
                    className="bg-[#1a2c38] border border-white/[0.07] rounded-xl p-3 flex items-center justify-between text-xs font-mono tabular-nums"
                    dir="ltr"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-white truncate">{item.evaluation.outcomeLabel}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        X = {item.evaluation.uniformFloatX.toFixed(8)} (0x{item.evaluation.first52BitHex})
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black shrink-0 ${
                        item.evaluation.multiplier >= 1
                          ? 'bg-[#00e701]/20 text-[#00e701]'
                          : 'bg-[#fbbf24]/15 text-[#fbbf24]'
                      }`}
                    >
                      +${item.evaluation.payoutUsdt.toFixed(2)} ({item.evaluation.multiplier}x)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
