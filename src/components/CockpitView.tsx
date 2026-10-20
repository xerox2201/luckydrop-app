import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { toPersianDigits } from '../utils/lotteryEngine.ts';

export const CockpitView: React.FC = () => {
  const {
    rounds,
    supportMessages,
    killSwitchActive,
    toggleKillSwitch,
    triggerDraw,
    createNewRound,
    toggleRoundSales,
    sendSupportMessage,
    formatAmount,
  } = useLottery();

  // Draw execution state
  const [selectedRoundForDraw, setSelectedRoundForDraw] = useState<string>('#ZRN-8493');
  const [drawing, setDrawing] = useState<boolean>(false);
  const [drawnResult, setDrawnResult] = useState<{
    drawnMain: number[];
    drawnGolden: number;
    hash: string;
  } | null>(null);

  // Create New Round state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('weekly');
  const [newPrice, setNewPrice] = useState<number>(5);
  const [newRtp, setNewRtp] = useState<number>(85);
  const [newJackpot, setNewJackpot] = useState<number>(250000);
  const [creatingRound, setCreatingRound] = useState<boolean>(false);

  // Live VIP Customer Chat Console state
  const [activeSessionCode, setActiveSessionCode] = useState<string>('VIP-KAMRAN');
  const [operatorReply, setOperatorReply] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  const handleExecuteDraw = async () => {
    setDrawing(true);
    const res = await triggerDraw(selectedRoundForDraw);
    setDrawing(false);
    if (res) {
      setDrawnResult(res);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingRound(true);
    await createNewRound({
      titleFa: newTitle,
      category: newCategory,
      ticketPriceUsdt: newPrice,
      rtpPercent: newRtp,
      jackpotUsdt: newJackpot,
    });
    setCreatingRound(false);
    setNewTitle('');
  };

  const handleSendOperatorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorReply.trim()) return;
    setSendingReply(true);
    await sendSupportMessage(
      activeSessionCode,
      operatorReply,
      'OPERATOR',
      'اپراتور ارشد کاکپیت (Stealth Admin)'
    );
    setSendingReply(false);
    setOperatorReply('');
  };

  const sessionMessages = supportMessages.filter((m) => m.sessionCode === activeSessionCode);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Stealth Security Header & Emergency Kill-Switch */}
      <div className="rounded-3xl bg-gradient-to-r from-[#181224] via-[#131824] to-[#20131a] border border-amber-500/40 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-mono font-bold">
              STEALTH ROUTE: /ops-k82-cockpit
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono">
              COOKIE: __Host_ld_ops_k82_vault (AES-256-GCM VERIFIED)
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            کاکپیت مخفی اپراتور ارشد (Stealth Solo Operator Cockpit)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            مدیریت یک‌نفره خزانه‌های سرد و گرم، اجرای قرعه‌کشی Provably Fair و پاسخگویی مستقیم به بازیکنان VIP.
          </p>
        </div>

        {/* Emergency Kill-Switch Box */}
        <div
          className={`rounded-2xl p-4 border flex items-center gap-4 shrink-0 ${
            killSwitchActive
              ? 'bg-red-500/20 border-red-500 text-red-200'
              : 'bg-[#0c1018] border-red-500/35 text-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-black text-red-400 block">
              کلید اضطراری توقف قرارداد هوشمند (Kill-Switch)
            </span>
            <span className="text-[11px] text-slate-400 block">
              {killSwitchActive
                ? 'وضعیت: فروش بلیط و برداشت کیف پول گرم مسدود است'
                : 'وضعیت: پروتکل در مدار عملیاتی نرمال قرار دارد'}
            </span>
          </div>
          <button
            type="button"
            data-testid="cockpit-kill-switch-btn"
            onClick={toggleKillSwitch}
            className={`px-5 py-3 rounded-xl font-black text-xs transition-all ${
              killSwitchActive
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_25px_rgba(220,38,38,0.5)]'
            }`}
          >
            {killSwitchActive ? 'رفع انسداد و فعال‌سازی مجدد' : '🚨 توقف اضطراری (FREEZE)'}
          </button>
        </div>
      </div>

      {/* Live Hot & Cold Treasury Vault Balances (USDT, TON, TRX, BTC) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'موجودی کیف‌پول گرم و سرد USDT (TRC-20)',
            crypto: '482,910.00 USDT',
            sub: 'Cold: $410,000 • Hot: $72,910',
            badge: 'TRON MULTI-SIG',
            color: 'emerald',
          },
          {
            label: 'خزانه شبکه تون تلگرام (TON Vault)',
            crypto: '28,450.00 TON',
            sub: 'معادل $148,509 USDT',
            badge: 'TON SHARDED',
            color: 'sky',
          },
          {
            label: 'موجودی گس و نقدینگی ترون (TRX Gas Pool)',
            crypto: '640,000 TRX',
            sub: 'معادل $154,880 USDT • استیک‌شده برای گس رایگان',
            badge: 'ENERGY STAKED',
            color: 'rose',
          },
          {
            label: 'ذخیره استراتژیک بیت‌کوین (Ledger Cold)',
            crypto: '3.42 BTC',
            sub: 'معادل $305,235 USDT • آفلاین',
            badge: 'HARDWARE VAULT',
            color: 'amber',
          },
        ].map((vault) => (
          <div
            key={vault.label}
            className="rounded-3xl bg-[#141923] border border-white/10 p-5 space-y-2 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                {vault.badge}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-xs text-slate-400">{vault.label}</div>
            <div className="text-xl font-black text-white font-mono">{vault.crypto}</div>
            <div className="text-[11px] text-slate-400">{vault.sub}</div>
          </div>
        ))}
      </section>

      {/* Provably Fair Draw Execution Trigger + Create New Lottery Round */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Right 7 Cols: Provably Fair Draw Execution Trigger & Active Rounds Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Provably Fair Animated Draw Trigger */}
          <div className="rounded-3xl bg-[#141923] border border-amber-500/35 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400">PROVABLY FAIR DRAW ENGINE</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  اجرای قرعه‌کشی و استخراج گوی‌های برنده (SHA-256)
                </h2>
              </div>
              <select
                value={selectedRoundForDraw}
                onChange={(e) => setSelectedRoundForDraw(e.target.value)}
                className="bg-[#0b0f18] border border-white/15 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
              >
                {rounds.map((r) => (
                  <option key={r.roundCode} value={r.roundCode}>
                    {r.roundCode} — {r.titleFa}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              با فشردن دکمه زیر، موتور HMAC-SHA256 بذر سرور و هش بلاک فعلی را ترکیب کرده و ۵ گوی اصلی + ۱ گوی طلایی را بدون دخالت انسانی استخراج و در دیتابیس ثبت می‌کند.
            </p>

            <button
              type="button"
              disabled={drawing}
              data-testid="execute-provably-fair-draw"
              onClick={handleExecuteDraw}
              className="w-full py-3.5 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">casino</span>
              <span>
                {drawing
                  ? 'در حال استخراج هش بلاک و گوی‌های برنده...'
                  : 'اجرای رسمی قرعه‌کشی و انتشار هش در بلاکچین'}
              </span>
            </button>

            {drawnResult && (
              <div
                data-testid="drawn-balls-result"
                className="bg-[#0a0e16] border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-fadeIn"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">✅ نتیجه قرعه‌کشی با موفقیت در بلاکچین ثبت شد:</span>
                  <span className="font-mono text-slate-400">{selectedRoundForDraw}</span>
                </div>
                <div className="flex items-center justify-center gap-2.5 py-1" dir="ltr">
                  {drawnResult.drawnMain.map((num) => (
                    <span
                      key={num}
                      className="w-10 h-10 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-sm flex items-center justify-center"
                    >
                      {String(num).padStart(2, '0')}
                    </span>
                  ))}
                  <span className="text-amber-400 font-black">+</span>
                  <span className="w-11 h-11 rounded-full lottery-ball-purple text-white font-mono font-black text-sm flex items-center justify-center border border-amber-300">
                    ★{String(drawnResult.drawnGolden).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 break-all">
                  Audit Hash: <span className="text-emerald-300">{drawnResult.hash}</span>
                </div>
              </div>
            )}
          </div>

          {/* Create New Lottery Round Form */}
          <form
            onSubmit={handleCreateRound}
            className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-4"
          >
            <h3 className="text-lg font-black text-white">تعریف دور جدید قرعه‌کشی در قرارداد هوشمند</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">عنوان قرعه‌کشی:</label>
                <input
                  type="text"
                  placeholder="مثلاً: جک‌پات ویژه نوروز (۱۰ شمش طلا)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">دسته‌بندی استخر:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                >
                  <option value="WEEKLY">هفتگی (Super Gold)</option>
                  <option value="TURBO">توربو ۱۵ دقیقه‌ای (Fast Turbo)</option>
                  <option value="VIP_PHYSICAL">جوایز فیزیکی VIP (خودرو و طلا)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">قیمت بلیط (USDT):</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">جایزه کل استخر (USDT):</label>
                <input
                  type="number"
                  value={newJackpot}
                  onChange={(e) => setNewJackpot(Number(e.target.value))}
                  className="w-full bg-[#0b0f18] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-emerald-300 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                نرخ RTP بازگشت جوایز: <strong className="text-emerald-400">{newRtp}%</strong> (سود خالص اپراتور: ۱۰٪)
              </span>
              <button
                type="submit"
                disabled={creatingRound}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                {creatingRound ? 'در حال ثبت...' : '+ ایجاد و انتشار استخر جدید'}
              </button>
            </div>
          </form>

          {/* Manage Existing Rounds Status */}
          <div className="rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-3">
            <h3 className="text-base font-black text-white">وضعیت استخرهای فعال ({toPersianDigits(rounds.length)})</h3>
            <div className="space-y-2">
              {rounds.map((r) => (
                <div
                  key={r.roundCode}
                  className="bg-[#0b0f18] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-black text-white">
                      {r.titleFa} <span className="font-mono text-amber-400">({r.roundCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      جک‌پات: {formatAmount(Number(r.jackpotUsdt))} • اعداد برنده فعلی:{' '}
                      <span className="font-mono text-emerald-300">
                        [{r.winningNumbers}] + ★{r.winningGoldenBall}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRoundSales(r.roundCode)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
                      r.status?.toUpperCase() === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {r.status?.toUpperCase() === 'ACTIVE' ? 'فعال (توقف فروش)' : 'متوقف (فعال‌سازی)'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right/Left 5 Cols: Live VIP Customer Support Chat Console */}
        <div className="lg:col-span-5 rounded-3xl bg-[#141923] border border-white/10 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400">DIRECT VIP CONCIERGE DESK</span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  کنسول گفتگوی زنده با بازیکنان VIP
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                ۳ تیکت فعال
              </span>
            </div>

            {/* Session Selector Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {['VIP-KAMRAN', 'VIP-NASTARAN', 'VIP-AMIR'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveSessionCode(code)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                    activeSessionCode === code
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sessionMessages.map((msg) => {
                const isOperator = msg.senderRole === 'OPERATOR';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      isOperator
                        ? 'bg-amber-500/10 border-amber-500/35 text-amber-100 mr-6'
                        : 'bg-[#0b0f18] border-white/10 text-slate-200 ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{msg.senderName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-amber-300 font-mono">
                        {msg.vipLevel}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                      <span>{msg.walletBalanceLabel}</span>
                      <span>{msg.historySummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operator Direct Reply Box */}
          <form onSubmit={handleSendOperatorReply} className="space-y-3 pt-3 border-t border-white/10">
            <textarea
              rows={3}
              value={operatorReply}
              onChange={(e) => setOperatorReply(e.target.value)}
              placeholder={`ارسال پاسخ مستقیم اپراتور به نشست ${activeSessionCode}...`}
              className="w-full bg-[#0b0f18] border border-white/15 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={sendingReply}
              data-testid="cockpit-send-reply-btn"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>{sendingReply ? 'در حال ارسال...' : 'ارسال پاسخ رسمی و ثبت در پرونده VIP'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
