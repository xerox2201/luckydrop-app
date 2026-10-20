import React, { useState, useEffect } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  toPersianDigits,
  computeDeterministicHash,
  deriveProvablyFairBalls,
} from '../utils/lotteryEngine.ts';

export const LobbyView: React.FC = () => {
  const {
    rounds,
    transactions,
    formatAmount,
    navigateTo,
    setDepositModalOpen,
    setSelectedMainBalls,
    setSelectedGoldenBall,
  } = useLottery();

  // Live synchronized block countdown timer (in seconds: 02d 14h 38m 49s)
  const [countdownSec, setCountdownSec] = useState<number>(2 * 86400 + 14 * 3600 + 38 * 60 + 49);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'WEEKLY' | 'TURBO' | 'VIP_PHYSICAL'>('ALL');

  // Provably Fair interactive verification box state
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>('zarrin_server_secret_v4_round_482');
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>('0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069');
  const [verifyRoundNum, setVerifyRoundNum] = useState<number>(482);
  const [verifiedResult, setVerifiedResult] = useState<{
    hash: string;
    mainBalls: number[];
    goldenBall: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 1 ? prev - 1 : 2 * 86400 + 14 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = Math.floor(countdownSec / 86400);
  const hours = Math.floor((countdownSec % 86400) / 3600);
  const minutes = Math.floor((countdownSec % 3600) / 60);
  const seconds = countdownSec % 60;

  // Dynamic Hero Lottery Ball Rack (Golden numbers: 07, 15, 22, 34, 41, 49 + Purple Star ball: 08)
  const [heroBalls, setHeroBalls] = useState<number[]>([7, 15, 22, 34, 41, 49]);
  const [heroStarBall, setHeroStarBall] = useState<number>(8);

  const randomizeHeroRack = () => {
    const pool: number[] = [];
    while (pool.length < 6) {
      const n = Math.floor(Math.random() * 50) + 1;
      if (!pool.includes(n)) pool.push(n);
    }
    pool.sort((a, b) => a - b);
    const star = Math.floor(Math.random() * 15) + 1;
    setHeroBalls(pool);
    setHeroStarBall(star);
  };

  const applyHeroBallsToTerminal = () => {
    setSelectedMainBalls(heroBalls.slice(0, 5));
    setSelectedGoldenBall(heroStarBall);
    navigateTo('play');
  };

  const handleRunVerification = () => {
    const balls = deriveProvablyFairBalls(verifyServerSeed, verifyClientSeed, verifyRoundNum);
    setVerifiedResult(balls);
  };

  const filteredRounds = rounds.filter((r) =>
    activeCategory === 'ALL'
      ? true
      : r.category?.toUpperCase() === activeCategory.toUpperCase()
  );

  const jackpotWinners = transactions.filter(
    (t) =>
      t.type?.toLowerCase() === 'payout' ||
      t.type?.toUpperCase() === 'JACKPOT_PAYOUT' ||
      Boolean(t.winnerName)
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-16">
      {/* 1. HERO MEGA JACKPOT SHOWCASE */}
      <section className="relative rounded-[2rem] overflow-hidden border border-amber-500/30 bg-gradient-to-br from-[#171d2b] via-[#0f131c] to-[#1a1025] p-6 sm:p-10 lg:p-14 shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-amber-500/15 rounded-full blur-[130px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Right Column (RTL): Mega Jackpot Telemetry & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>جک‌پات مگا طلایی دور #۴۸۲ • استخر نقدینگی قفل‌شده در قرارداد هوشمند</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.15] text-white">
                جک‌پات بزرگ این هفته:{' '}
                <span
                  data-testid="hero-jackpot-amount"
                  className="block mt-2 text-transparent bg-clip-text bg-gradient-to-l from-amber-200 via-amber-400 to-amber-500 drop-shadow-[0_4px_30px_rgba(245,158,11,0.35)]"
                >
                  {formatAmount(184500)}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                معادل دقیق <strong className="text-amber-300 font-mono">$184,500 USDT</strong> (بیش از ۱۵.۲ میلیارد تومان نقد) با واریز مستقیم و اتوماتیک به کیف پول شخصی شما در کمتر از ۱۰ ثانیه پس از استخراج بلاک قرعه‌کشی.
              </p>
            </div>

            {/* Guaranteed Waterfall Split Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[11px] text-slate-400 block">سهم تضمینی جوایز (RTP)</span>
                <span className="text-lg font-black text-emerald-400">۸۵٪ کل فروش</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[11px] text-slate-400 block">قیمت هر بلیط</span>
                <span className="text-lg font-black text-amber-400">{formatAmount(2)}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[11px] text-slate-400 block">ذخیره جک‌پات دور بعد</span>
                <span className="text-lg font-black text-purple-300">۳٪ تصاعدی</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-[11px] text-slate-400 block">احراز هویت (KYC)</span>
                <span className="text-lg font-black text-sky-300">۱۰۰٪ ناشناس</span>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                data-testid="hero-buy-ticket-btn"
                onClick={() => navigateTo('play')}
                className="gold-gradient-cta text-[#2a1700] font-black text-base px-8 py-4 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2.5"
              >
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
                <span>انتخاب اعداد و خرید بلیط آنی</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-bold text-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-amber-400 text-lg">verified</span>
                <span>بررسی اثبات ریاضی و شانس برد</span>
              </button>
            </div>
          </div>

          {/* Left Column (RTL): Synchronized Block Countdown & Golden Ball Rack */}
          <div className="lg:col-span-5 bg-[#0b0f18]/90 border border-amber-500/25 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 block">زمان باقی‌مانده تا قفل بلاک قرعه‌کشی</span>
                <span className="text-[11px] text-slate-400 font-mono">Target Block: #21,492,800 (Tron/ETH)</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                LIVE SYNC
              </span>
            </div>

            {/* 4-Box Live Timer */}
            <div className="grid grid-cols-4 gap-3 text-center" dir="ltr">
              {[
                { val: days, label: 'DAYS / روز' },
                { val: hours, label: 'HRS / ساعت' },
                { val: minutes, label: 'MIN / دقیقه' },
                { val: seconds, label: 'SEC / ثانیه' },
              ].map((unit, idx) => (
                <div
                  key={idx}
                  className="bg-[#151b29] border border-amber-500/20 rounded-2xl py-3 px-2 shadow-inner"
                >
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                    {String(unit.val).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">{unit.label}</div>
                </div>
              ))}
            </div>

            {/* Dynamic 6 Golden Balls + 1 Purple Star Ball Rack */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  گوی‌های طلایی پیشنهادی الگوریتم (۶ عدد + گوی ستاره):
                </span>
                <button
                  type="button"
                  onClick={randomizeHeroRack}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">autorenew</span>
                  <span>تولید ترکیب تصادفی جدید</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 py-2" dir="ltr">
                {heroBalls.map((num) => (
                  <div
                    key={num}
                    className="w-11 h-11 rounded-full lottery-ball-gold flex items-center justify-center text-slate-950 font-black text-sm font-mono border border-amber-200/60"
                  >
                    {String(num).padStart(2, '0')}
                  </div>
                ))}
                <span className="text-amber-400 font-black text-lg">+</span>
                <div
                  className="w-12 h-12 rounded-full lottery-ball-purple flex items-center justify-center text-white font-black text-sm font-mono border-2 border-purple-300/60 relative"
                  title="Purple Star Golden Ball"
                >
                  {String(heroStarBall).padStart(2, '0')}
                  <span className="absolute -top-1.5 -right-1 text-[10px] bg-amber-400 text-slate-950 font-black px-1 rounded">
                    ★
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={applyHeroBallsToTerminal}
                className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all"
              >
                انتقال این ترکیب طلایی به ترمینال خرید بلیط ←
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE ACTIVE LOTTERY GAMES (SUPER GOLD, FAST 15-MIN TURBO, VIP HIGH ROLLER PORSCHE MACAN) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              ACTIVE SMART CONTRACT POOLS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              استخرهای قرعه‌کشی فعال زرین لاتاری
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#131824] p-1.5 rounded-2xl border border-white/10 self-start">
            {[
              { id: 'ALL', label: 'همه قرعه‌کشی‌ها (۳)' },
              { id: 'WEEKLY', label: 'سوپر گلد هفتگی' },
              { id: 'TURBO', label: 'توربو ۱۵ دقیقه‌ای' },
              { id: 'VIP_PHYSICAL', label: 'جوایز ویژه VIP (خودرو و شمش)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === tab.id
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredRounds.map((round) => {
            const jackpotNum = Number(round.jackpotUsdt) || 184500;
            const ticketPriceNum = Number(round.ticketPriceUsdt) || 2;
            const isTurbo = round.category === 'TURBO';
            const isVip = round.category === 'VIP_PHYSICAL';

            return (
              <div
                key={round.roundCode}
                className={`rounded-3xl bg-[#141923] border p-6 flex flex-col justify-between transition-all hover:-translate-y-1 ${
                  isVip
                    ? 'border-purple-500/40 shadow-[0_15px_40px_rgba(147,51,234,0.15)]'
                    : isTurbo
                    ? 'border-emerald-500/40 shadow-[0_15px_40px_rgba(16,185,129,0.12)]'
                    : 'border-amber-500/40 shadow-[0_15px_40px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isVip
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : isTurbo
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {round.formatLabel}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{round.roundCode}</span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-xl font-black text-white">{round.titleFa}</h3>
                    <p className="text-xs text-slate-400 mt-1">{round.subtitleFa}</p>
                  </div>

                  {/* Prize Pool Box */}
                  <div className="bg-[#0c1018] border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] text-slate-400 block">ارزش کل جایزه تضمین‌شده:</span>
                    <div className="text-2xl font-black text-amber-400">
                      {formatAmount(jackpotNum)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>معادل دلاری: ${jackpotNum.toLocaleString('en-US')} USDT</span>
                      <span className="text-emerald-400 font-bold">RTP: {round.rtpPercent}%</span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{round.remainingLabel}</span>
                      <span className="font-bold text-amber-300">
                        {toPersianDigits(round.soldPercent)}٪ تکمیل شده
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0a0e16] rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full ${
                          isVip
                            ? 'bg-gradient-to-r from-purple-500 to-amber-400'
                            : isTurbo
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-300'
                        }`}
                        style={{ width: `${round.soldPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ورودی هر بلیط:</span>
                    <span className="text-sm font-black text-white">
                      {formatAmount(ticketPriceNum)}{' '}
                      <span className="text-[11px] text-amber-400 font-mono">(${ticketPriceNum})</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('play')}
                    className="gold-gradient-cta text-[#2a1700] font-black text-xs px-5 py-3 rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    <span>خرید بلیط</span>
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. PROVABLY FAIR SHA-256 COMMIT HASH VERIFICATION BOX */}
      <section className="rounded-3xl bg-gradient-to-r from-[#131824] via-[#171d2c] to-[#131824] border border-emerald-500/30 p-6 sm:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <span className="material-symbols-outlined text-base">enhanced_encryption</span>
              <span>الگوریتم اثبات‌پذیر منصفانه (Provably Fair HMAC-SHA256)</span>
            </div>
            <h3 className="text-2xl font-black text-white">
              چگونه از عدم امکان دستکاری در قرعه‌کشی مطمئن شوید؟
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              پیش از شروع هر دور، هش رمزنگاری‌شده بذر سرور (<code className="text-amber-300">Server Seed Hash</code>) در بلاکچین منتشر می‌شود. اعداد برنده مستقیماً از ترکیب هش بلاک شبکه ترون/بیت‌کوین و بذر اختصاصی بلیط شما (<code className="text-emerald-300">Client Seed</code>) استخراج می‌شوند.
            </p>
            <div className="bg-[#0a0e16] border border-white/10 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 block font-mono">
                ACTIVE ROUND #482 PRE-COMMIT SHA-256 HASH:
              </span>
              <code className="text-xs text-emerald-400 font-mono break-all block">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </code>
            </div>
          </div>

          {/* Interactive Hash Verifier Widget */}
          <div className="lg:col-span-7 bg-[#0c1018] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400">
                ماشین‌حساب بازبینی مستقل هش (Live SHA-256 Audit Tool)
              </span>
              <span className="text-[11px] font-mono text-slate-400">HMAC_SHA256(ServerSeed : ClientSeed : Round)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Server Seed (بذر سرور):</label>
                <input
                  type="text"
                  value={verifyServerSeed}
                  onChange={(e) => setVerifyServerSeed(e.target.value)}
                  className="w-full bg-[#151b28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">شماره دور (Round):</label>
                <input
                  type="number"
                  value={verifyRoundNum}
                  onChange={(e) => setVerifyRoundNum(Number(e.target.value) || 482)}
                  className="w-full bg-[#151b28] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Client Seed / Block Hash (بذر کاربر یا هش بلاک):
              </label>
              <input
                type="text"
                value={verifyClientSeed}
                onChange={(e) => setVerifyClientSeed(e.target.value)}
                className="w-full bg-[#151b28] border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                data-testid="verify-fairness-btn"
                onClick={handleRunVerification}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">fact_check</span>
                <span>محاسبه و راستی‌آزمایی خروجی قرعه‌کشی</span>
              </button>

              {verifiedResult && (
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="text-[11px] text-slate-400 font-mono">Drawn:</span>
                  {verifiedResult.mainBalls.map((b) => (
                    <span
                      key={b}
                      className="w-7 h-7 rounded-full lottery-ball-gold text-slate-950 font-black text-xs flex items-center justify-center font-mono"
                    >
                      {b}
                    </span>
                  ))}
                  <span className="w-7 h-7 rounded-full lottery-ball-purple text-white font-black text-xs flex items-center justify-center font-mono">
                    ★{verifiedResult.goldenBall}
                  </span>
                </div>
              )}
            </div>

            {verifiedResult && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 break-all">
                Computed SHA-256: {verifiedResult.hash}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. REAL-TIME LIVE TICKER OF RECENT BILLION-TOMAN JACKPOT WINNERS + WEB3 GATEWAY */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Winners Table */}
        <div className="lg:col-span-7 bg-[#141923] border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-400">ON-CHAIN PAYOUT LEDGER</span>
              <h3 className="text-xl font-black text-white mt-0.5">
                برندگان اخیر جک‌پات‌های میلیاردی (قابل استعلام در بلاکچین)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('status')}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              رهگیری زنده تراکنش‌ها ←
            </button>
          </div>

          <div className="space-y-3">
            {jackpotWinners.map((win) => (
              <div
                key={win.txHash}
                className="bg-[#0d111a] border border-white/5 hover:border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">{win.winnerName}</span>
                    <span className="text-[11px] text-slate-400">({win.winnerLocation})</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                      پرداخت آنی تایید شد
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {win.lotteryTitle} • اعداد برنده:{' '}
                    <span className="font-mono text-amber-300">{win.winningCombo}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="text-base font-black text-emerald-400">
                    {formatAmount(Number(win.amountUsdt))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>{win.network}</span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => navigateTo('status')}
                      className="text-amber-400 hover:underline"
                    >
                      TX: {win.txHash.slice(0, 12)}...
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Web3 Instant Crypto Payment Gateway Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#171d2c] to-[#111520] border border-amber-500/25 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>درگاه اختصاصی رمزارز بدون تحریم</span>
            </div>
            <h3 className="text-xl font-black text-white">
              پشتیبانی بومی از ۵ شبکه محبوب کریپتو با تسویه آنی
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              واریز و برداشت جوایز مستقیماً از طریق تتر (TRC-20)، تون‌کوین تلگرام (TON)، ترون (TRX)، بیت‌کوین (SegWit) و بایننس اسمارت چین (BEP-20) بدون هیچ‌گونه محدودیت بانکی انجام می‌شود.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {[
                { name: 'USDT (TRC-20)', sub: 'تایید در ۳۰ ثانیه • بدون کارمزد', badge: 'محبوب‌ترین' },
                { name: 'TON Network', sub: 'اتصال مستقیم کیف پول تلگرام', badge: 'فوق سریع' },
                { name: 'TRON (TRX)', sub: 'حداقل واریز فقط ۲ دلار', badge: 'کارمزد صفر' },
                { name: 'Bitcoin SegWit', sub: 'مخصوص واریزهای سنگین VIP', badge: 'امنیت بالا' },
              ].map((net) => (
                <div key={net.name} className="bg-[#0c1018] border border-white/10 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{net.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {net.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{net.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDepositModalOpen(true)}
            className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">qr_code_2</span>
            <span>دریافت QR کد و آدرس واریز آنی</span>
          </button>
        </div>
      </section>
    </div>
  );
};
