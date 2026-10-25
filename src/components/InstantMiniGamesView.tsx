import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  InstantMiniGameId,
  MiniGameEvaluationResult,
} from '../utils/provablyFair.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';
import { PlinkoGameArena } from './PlinkoGameArena.tsx';
import { CrashGameArena } from './CrashGameArena.tsx';

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

  const [activeGame, setActiveGame] = useState<InstantMiniGameId>('PLINKO');
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

  const diceMultiplier = Number((97 / diceTarget).toFixed(4));
  const currentPotentialPayout =
    activeGame === 'DICE_52'
      ? Number((betAmount * diceMultiplier).toFixed(2))
      : activeGame === 'GOLDEN_COIN'
      ? Number((betAmount * 1.94).toFixed(2))
      : Number((betAmount * crashTargetX).toFixed(2));

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
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-4 space-y-4">
      {/* Compact Studio Header + Game Mode Selector Strip */}
      <div className="rounded-2xl bg-[#141923] border border-amber-500/35 px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e701]" />
            <span>استودیو بازی‌های آرکید ۶۰ فریم (Stake Originals Plinko 3D & Crash 3D)</span>
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400" dir="ltr">
            <span className="text-amber-300">52-Bit HMAC-SHA256</span>
            <span>·</span>
            <span className="text-emerald-300">Max 1000x</span>
            <span>·</span>
            <span data-testid="minigames-pam-balance" className="text-white font-bold">
              PAM: ${balanceUsdt.toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* 4 Mini-Game Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2" dir="ltr">
          {[
            {
              id: 'PLINKO' as const,
              titleFa: '🟢 Plinko 3D (1000x)',
            },
            {
              id: 'CRASH_X' as const,
              titleFa: '🚀 Crash 3D (98% RTP)',
            },
            {
              id: 'DICE_52' as const,
              titleFa: '🎲 52-Bit Dice',
            },
            {
              id: 'GOLDEN_COIN' as const,
              titleFa: '🪙 Golden Coin',
            },
          ].map((g) => (
            <button
              key={g.id}
              type="button"
              data-testid={`select-minigame-${g.id}`}
              onClick={() => setActiveGame(g.id)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeGame === g.id
                  ? 'bg-[#1a2c38] border-[#00e701] text-white shadow-[0_0_15px_rgba(0,231,1,0.25)]'
                  : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {g.titleFa}
            </button>
          ))}
        </div>
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

      {/* WHEN OTHER MINI-GAMES ARE SELECTED OR BELOW PLINKO/CRASH: SEED & PROVABLY FAIR VERIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 space-y-6 shadow-xl">
          {/* Pre-Bet Commitment Strip */}
          <div className="bg-[#090d16] border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-emerald-400 font-bold">
                🔒 تعهد SHA-256 بذر سرور قبل از شرط (Pre-Bet Server Seed Hash):
              </span>
              <span className="font-mono text-amber-300" dir="ltr">
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

          {activeGame !== 'PLINKO' && activeGame !== 'CRASH_X' && (
            <>
              {/* Bet Amount + Game Specific Parameter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    مبلغ شرط (PAM Debit Amount — USDT):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      data-testid="minigame-bet-input"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#141923] border border-white/15 rounded-xl px-3 py-2 text-sm font-mono font-black text-amber-300"
                      dir="ltr"
                    />
                    {[5, 10, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBetAmount(preset)}
                        className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 cursor-pointer"
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                {activeGame === 'DICE_52' && (
                  <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">شرط کمتر از (Roll Under):</span>
                      <span className="font-mono font-black text-emerald-400" dir="ltr">
                        &lt; {diceTarget} (Multiplier: {diceMultiplier}x)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={diceTarget}
                      onChange={(e) => setDiceTarget(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500" dir="ltr">
                      <span>10% Win (9.70x)</span>
                      <span>50% Win (1.94x)</span>
                      <span>90% Win (1.077x)</span>
                    </div>
                  </div>
                )}

                {activeGame === 'GOLDEN_COIN' && (
                  <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">
                      انتخاب روی سکه طلایی (ضریب برد: 1.94x):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCoinSide('HEADS')}
                        className={`py-2.5 rounded-xl font-black text-xs border cursor-pointer ${
                          coinSide === 'HEADS'
                            ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                            : 'bg-[#141923] border-white/10 text-slate-400'
                        }`}
                      >
                        👑 شیر طلایی (HEADS)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoinSide('TAILS')}
                        className={`py-2.5 rounded-xl font-black text-xs border cursor-pointer ${
                          coinSide === 'TAILS'
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                            : 'bg-[#141923] border-white/10 text-slate-400'
                        }`}
                      >
                        💎 خط سلطنتی (TAILS)
                      </button>
                    </div>
                  </div>
                )}

                {activeGame === 'CRASH_X' && (
                  <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      ضریب برداشت اتوماتیک (Target Multiplier X):
                    </label>
                    <div className="flex items-center gap-2">
                      {[1.5, 2.0, 3.0, 5.0, 10.0].map((mult) => (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setCrashTargetX(mult)}
                          className={`flex-1 py-2 rounded-xl font-mono font-bold text-xs border cursor-pointer ${
                            crashTargetX === mult
                              ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                              : 'bg-[#141923] border-white/10 text-slate-400'
                          }`}
                        >
                          {mult}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Execute Bet Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b0f18] border border-amber-500/30 rounded-2xl p-4">
                <div className="text-xs space-y-0.5">
                  <span className="text-slate-400 block">جایزه احتمالی در صورت برد (PAM Instant Credit):</span>
                  <strong className="text-xl font-black text-emerald-400 font-mono" dir="ltr">
                    +${currentPotentialPayout.toFixed(2)} USDT
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={playing}
                  data-testid="play-instant-minigame-btn"
                  onClick={handlePlayRound}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl gold-gradient-cta text-[#241300] font-black text-sm shadow-xl hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">bolt</span>
                  <span>
                    {playing
                      ? 'در حال استخراج ۵۲ بیت HMAC-SHA256...'
                      : `ثبت شرط $${betAmount} USDT و اجرای آنی`}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Latest Round Cryptographic Breakdown */}
          {lastResult ? (
            <div
              data-testid="minigame-result-card"
              className={`rounded-2xl p-5 border space-y-3 ${
                lastResult.won
                  ? 'bg-emerald-500/10 border-emerald-400/50'
                  : 'bg-rose-500/10 border-rose-400/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-black ${
                      lastResult.won
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-500/30 text-rose-200'
                    }`}
                  >
                    {lastResult.payoutUsdt > 0
                      ? `🎉 تسویه آنی PAM: +$${lastResult.payoutUsdt.toFixed(2)} USDT (${lastResult.multiplier}x)`
                      : 'نتیجه دور: بدون برد'}
                  </span>
                  <span className="font-mono text-xs font-bold text-white" dir="ltr">
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

              <div className="bg-[#090d16]/90 border border-white/10 rounded-xl p-3 font-mono text-[11px] space-y-1 text-slate-300" dir="ltr">
                <div>
                  <span className="text-slate-500">Round ID:</span>{' '}
                  <span className="text-amber-300">{lastResult.roundId}</span> |{' '}
                  <span className="text-slate-500">Nonce:</span> #{lastResult.nonce}
                </div>
                <div className="truncate">
                  <span className="text-slate-500">HMAC-SHA256:</span>{' '}
                  <span className="text-emerald-300">{lastResult.hmacHex.slice(0, 13)}</span>
                  <span className="text-slate-500">{lastResult.hmacHex.slice(13)}</span>
                </div>
                <div>
                  <span className="text-slate-500">First 52-Bit Hex (13 chars):</span>{' '}
                  <span className="text-amber-300">0x{lastResult.first52BitHex}</span> →{' '}
                  <span className="text-sky-300">
                    Uniform Float X = {lastResult.uniformFloatX.toFixed(12)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-[#0b0f18] border border-white/10 text-xs text-slate-400">
              با رها کردن هر توپ در Plinko، جزئیات کامل هش <code className="text-emerald-300">HMAC-SHA256</code>، آرایه بیت‌های مسیر چپ/راست (<code className="text-amber-300">L/R Bit Array</code>) و شناسه تراکنش کیف پول PAM در این بخش نمایش داده می‌شود.
            </div>
          )}
        </div>

        {/* Right 5 Cols: Seed Customization & Recent Verifiable Rounds */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">تنظیم بذر کلاینت و چرخش بذر سرور</h3>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="text-xs font-bold text-amber-300 hover:underline cursor-pointer"
              >
                باز کردن راستی‌آزمای کامل ↗
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 block">
                Client Seed (قابل ویرایش توسط بازیکن قبل از هر پرتاب توپ):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={clientSeedInput}
                  onChange={(e) => setClientSeedInput(e.target.value)}
                  className="flex-1 bg-[#0b0f18] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => updateProvablyFairClientSeed(clientSeedInput)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  ذخیره
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => rotateProvablyFairServerSeed()}
              className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-black text-xs cursor-pointer"
            >
              چرخش Server Seed و افشای بذر قبلی برای راستی‌آزمایی
            </button>
          </div>

          <div className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-3">
            <h3 className="text-base font-black text-white">تاریخچه دورهای اخیر شما (۵۲ بیت HMAC)</h3>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                هنوز دوری اجرا نشده است. دکمه سبز رنگ Bet / Drop Ball را بزنید تا توپ‌ها در هرم Plinko رها شوند.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div
                    key={`${item.evaluation.roundId}-${idx}`}
                    className="bg-[#0b0f18] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs font-mono"
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
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
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
