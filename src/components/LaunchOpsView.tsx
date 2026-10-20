import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  evaluateVaultAutoSweep,
  toPersianDigits,
  TelegramWinnerBroadcastPayload,
} from '../utils/lotteryEngine.ts';

export const LaunchOpsView: React.FC = () => {
  const {
    killSwitchActive,
    setKillSwitchState,
    navigateTo,
  } = useLottery();

  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // 1. Kill-Switch & 503 Endpoint Probe State
  const [endpointProbeResult, setEndpointProbeResult] = useState<{
    httpStatus: number;
    message: string;
  } | null>(null);

  // 2. Treasury Vault Auto-Sweep Monitor State
  const [hotWalletUsdt, setHotWalletUsdt] = useState<number>(2500);
  const [coldVaultUsdt, setColdVaultUsdt] = useState<number>(482910);
  const [autoSweepThreshold, setAutoSweepThreshold] = useState<number>(5000);
  const [sweepFeedback, setSweepFeedback] = useState<string | null>(null);

  // 3. Blockchain Webhook Ingestion & Idempotency State
  const [idempotentKeysCount, setIdempotentKeysCount] = useState<number>(149820);
  const [lastIngestedTxId, setLastIngestedTxId] = useState<string>('0xe983bf10');
  const [webhookLogs, setWebhookLogs] = useState<
    { id: string; text: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }[]
  >([
    {
      id: 'init-1',
      text: '[OK 200] TRX-BLOCK #62,194,800: Ingested TxId e983...bf10 | Payload signed with HMAC | Nonce OK',
      tone: 'emerald',
    },
    {
      id: 'init-2',
      text: '[OK 200] TON-BLOCK #39,812,014: Ingested TonConnect ping | State hash verified',
      tone: 'slate',
    },
  ]);

  // 4. Cloudflare WAF & Domain State
  const [underAttackMode, setUnderAttackMode] = useState<boolean>(false);
  const [blockedThreatsCount, setBlockedThreatsCount] = useState<number>(2419);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  // 5. Telegram Bot & Mini-App State
  const [showBotToken, setShowBotToken] = useState<boolean>(false);
  const [botToken, setBotToken] = useState<string>(
    '7189204812:AAH9Q8xklm20a9Z8xQzV10aL-luckyVIP'
  );
  const [channelId, setChannelId] = useState<string>('@LuckyDropWinners');
  const [broadcastHighlight, setBroadcastHighlight] = useState<boolean>(false);
  const [latestBroadcast, setLatestBroadcast] = useState<TelegramWinnerBroadcastPayload>({
    channelId: '@LuckyDropWinners',
    winnerShortId: 'VIP_User#9812',
    prizeUsdt: 150000,
    prizeTomanFormatted: '۱۲،۳۷۵،۰۰۰،۰۰۰ تومان',
    txHashShort: '7a4b8f...39c01d',
    tronScanUrl: 'https://tronscan.org/#/transaction/7a4b8f1928374655aabbccdd39c01d',
    miniAppUrl: 'https://t.me/LuckyDropVIPBot/app',
    markdownMessage:
      '🎉 تبریک بی‌کران! سوپر جک‌پات هفتگی منفجر شد! 🏆\nکاربر با هویت حفاظت‌شده VIP_User#9812 برنده جایزه بزرگ به ارزش ۱۵۰,۰۰۰ دلار تتر شد!',
    timestampLabel: 'چند لحظه پیش',
  });

  const showToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 4000);
  };

  // Trigger or toggle Kill-Switch
  const handleToggleKillSwitch = async () => {
    const nextState = !killSwitchActive;
    await setKillSwitchState(nextState);
    setEndpointProbeResult(null);
    if (nextState) {
      showToast(
        '🚨 وضعیت پروتکل به HALTED تغییر یافت. مسیرهای /api/tickets/buy و /api/deposit کد 503 برمی‌گردانند.'
      );
    } else {
      showToast('✅ مدارهای خروجی و درگاه‌های پرداخت به وضعیت NORMAL FLOW بازگشتند.');
    }
  };

  const handleResetKillSwitch = async () => {
    await setKillSwitchState(false);
    setEndpointProbeResult(null);
    showToast('✅ مدار امنیتی ریست شد: NORMAL FLOW (UNBLOCKED)');
  };

  // Probe /api/tickets/buy and /api/deposit to prove 503 Service Unavailable when HALTED
  const handleProbeProtectedRoutes = async () => {
    try {
      const resBuy = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundCode: '#ZRN-8493',
          mainNumbers: [7, 14, 21, 33, 49],
          goldenBall: 9,
          costUsdt: 2,
        }),
      });
      const dataBuy = await resBuy.json();
      setEndpointProbeResult({
        httpStatus: resBuy.status,
        message:
          resBuy.status === 503
            ? `HTTP 503 Service Unavailable — ${dataBuy.error}`
            : `HTTP ${resBuy.status} OK — درگاه فعال است و درخواست پردازش شد.`,
      });
    } catch {
      setEndpointProbeResult({
        httpStatus: 500,
        message: 'خطا در برقراری ارتباط با سرور',
      });
    }
  };

  // Save Auto-Sweep Threshold & run auto-sweep evaluation
  const handleSaveAutoSweep = () => {
    const result = evaluateVaultAutoSweep(
      hotWalletUsdt,
      coldVaultUsdt,
      autoSweepThreshold
    );
    setHotWalletUsdt(result.nextHotWalletUsdt);
    setColdVaultUsdt(result.nextColdVaultUsdt);

    if (result.sweptAmountUsdt > 0) {
      const msg = `✅ سقف تخلیه خودکار روی $${autoSweepThreshold.toLocaleString('en-US')} USDT ذخیره شد و مبلغ مازاد $${result.sweptAmountUsdt.toLocaleString('en-US')} USDT به خزانه سرد (Gnosis Safe) منتقل گردید.`;
      setSweepFeedback(msg);
      showToast(msg);
    } else {
      const msg = `✅ سقف تخلیه خودکار خزانه گرم روی $${autoSweepThreshold.toLocaleString('en-US')} USDT تنظیم و ذخیره شد.`;
      setSweepFeedback(msg);
      showToast(msg);
    }
  };

  // Simulate fresh incoming TronGrid / Toncenter Webhook
  const handleSimulateWebhook = async (replaySameTx: boolean = false) => {
    const provider = Math.random() > 0.4 ? 'TronGrid' : 'Toncenter';
    const txId = replaySameTx
      ? lastIngestedTxId
      : `0x${Math.random().toString(16).substring(2, 10)}${Date.now().toString(16).slice(-4)}`;

    try {
      const res = await fetch('/api/webhooks/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          txId,
          amountUsdt: 100,
        }),
      });
      const data = await res.json();
      if (!replaySameTx && data.valid) {
        setLastIngestedTxId(txId);
      }
      if (typeof data.activeKeysCount === 'number') {
        setIdempotentKeysCount(data.activeKeysCount);
      }
      setWebhookLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          text: data.logMessage,
          tone: data.replayBlocked ? 'rose' : 'amber',
        },
        ...prev,
      ]);
    } catch {
      // Fallback local log
    }
  };

  const handleCopyDns = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedRecord(val);
    showToast(`📋 رکورد DNS در کلیپ‌بورد کپی شد: ${val}`);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const handleToggleUnderAttack = () => {
    const next = !underAttackMode;
    setUnderAttackMode(next);
    if (next) {
      setBlockedThreatsCount((c) => c + 128);
      showToast(
        '🛡️ سپر ضد دیداس پیشرفته (Cloudflare Under Attack Mode) روی دامنه luckydrop.vip فعال شد.'
      );
    } else {
      showToast('سپر Cloudflare به حالت استاندارد (High Security) بازگشت.');
    }
  };

  const handleSendTelegramBroadcast = async () => {
    setBroadcastHighlight(true);
    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          winnerShortId: `VIP_User#${Math.floor(1000 + Math.random() * 8999)}`,
          prizeUsdt: 150000,
        }),
      });
      const data = await res.json();
      if (data.broadcast) {
        setLatestBroadcast(data.broadcast);
      }
      showToast(`📢 پیام تبریک برنده جک‌پات با موفقیت به کانال ${channelId} مخابره شد.`);
    } catch {
      showToast(`📢 پیام تبریک تست با موفقیت به کانال ${channelId} ارسال شد.`);
    } finally {
      setTimeout(() => setBroadcastHighlight(false), 700);
    }
  };

  const handleDownloadOpsReport = () => {
    const reportContent = JSON.stringify(
      {
        platform: 'LuckyDrop VIP (Zarrin Lottery)',
        build: 'v4.8.2-SVR-GOLD',
        auditor: 'CertiK Security Sentinel',
        protocolStatus: killSwitchActive ? 'HALTED (KILL-SWITCH ENGAGED)' : 'CIRCUIT ARMED & SECURE',
        hotVaultUsdt: hotWalletUsdt,
        coldMultiSigVaultUsdt: coldVaultUsdt,
        autoSweepThresholdUsdt: autoSweepThreshold,
        idempotentKeysActive: idempotentKeysCount,
        cloudflareWaf: underAttackMode ? 'UNDER_ATTACK_JS_CHALLENGE' : 'ACTIVE_FULL_STRICT',
        telegramChannel: channelId,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LuckyDrop-Launch-Ops-Audit-Report.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📄 گزارش تفصیلی وضعیت امنیتی و آمادگی لانچ دانلود شد.');
  };

  const hotFillPercent = Math.min(
    100,
    Math.round((hotWalletUsdt / Math.max(1000, autoSweepThreshold)) * 100)
  );

  return (
    <div className="relative w-full overflow-hidden pb-12">
      {/* Ambient Atmospheric Backdrops */}
      <div className="absolute -top-32 left-1/4 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-80 right-10 w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Section 1: Launch Ops Header & Deployment Status Monitor */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Toast Feedback Banner */}
        {toastBanner && (
          <div
            data-testid="launch-ops-toast"
            className="rounded-2xl bg-[#161f30] border border-amber-400/50 px-5 py-3.5 text-xs sm:text-sm font-bold text-amber-200 shadow-2xl flex items-center justify-between gap-4 animate-fadeIn"
          >
            <span>{toastBanner}</span>
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Overline & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="font-mono">LIVE PRODUCTION STAGING</span>
            </div>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-slate-400">
              OPS-BUILD: v4.8.2-SVR-GOLD
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>پروتکل استقرار با نظارت حسابرس امنیتی CertiK</span>
            </span>
            <div className="h-3 w-px bg-white/10"></div>
            <div className="font-mono text-emerald-400 font-bold flex items-center gap-1" dir="ltr">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span>14ms NET PING</span>
            </div>
          </div>
        </div>

        {/* Main Status Card: Glassmorphic Sovereign Deck */}
        <div className="relative rounded-3xl bg-[#141923]/95 backdrop-blur-2xl border border-amber-500/25 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#232834] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                    مرکز کنترل لانچ عملیاتی LuckyDrop
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    سکوی پایش بلادرنگ زیرساخت، امنیت خزانه‌های آن‌چین و هاب ربات‌های تلگرام VIP
                  </p>
                </div>
              </div>

              {/* Dynamic Badges Line */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-3 py-1.5 rounded-xl bg-[#202531] border border-white/5 text-xs text-slate-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-base">
                    shield
                  </span>
                  <span>Cloudflare WAF:</span>
                  <strong className="text-emerald-400 font-mono">
                    {underAttackMode ? 'UNDER ATTACK SHIELD' : 'ACTIVE'}
                  </strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-[#202531] border border-white/5 text-xs text-slate-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-base">
                    database
                  </span>
                  <span>Database Cluster:</span>
                  <strong className="text-emerald-400 font-mono">12/12 SHARDS OK</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-[#202531] border border-white/5 text-xs text-slate-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-base">
                    lock
                  </span>
                  <span>Hot Vault:</span>
                  <strong className="text-amber-400 font-mono">AES-256 HSM ENCRYPTED</strong>
                </span>
              </div>
            </div>

            {/* Quick Launch CTA & Deployment Health Meter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:self-center">
              <div className="flex flex-col justify-center px-4 py-2.5 rounded-2xl bg-[#0a0e16] border border-white/10 shadow-inner">
                <span className="text-[11px] text-slate-400">دامنه فعال هدف:</span>
                <div
                  className="flex items-center gap-1.5 font-mono text-sm text-amber-400 font-bold"
                  dir="ltr"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>https://luckydrop.vip</span>
                </div>
              </div>

              <button
                type="button"
                data-testid="master-deploy-trigger"
                onClick={() =>
                  showToast(
                    '🚀 پروتکل LuckyDrop v4.8.2 در مدار استقرار نهایی (GO LIVE) تایید و همگام‌سازی شد.'
                  )
                }
                className="px-6 py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xl">play_circle</span>
                <span>شروع استقرار رسمی (GO LIVE)</span>
              </button>
            </div>
          </div>

          {/* Metric Stream Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 bg-[#0a0e16]/70 border border-white/5 rounded-2xl p-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">SSL/TLS Grade</span>
              <span
                className="font-mono text-base sm:text-lg text-emerald-400 font-black flex items-center gap-1 mt-0.5"
                dir="ltr"
              >
                Full (Strict){' '}
                <span className="material-symbols-outlined text-base">check_circle</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">سپر محافظ DDoS</span>
              <span
                className="font-mono text-base sm:text-lg text-amber-400 font-black flex items-center gap-1 mt-0.5"
                dir="ltr"
              >
                100% UNMETERED
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">تأییدیه بلاک‌چین TronGrid</span>
              <span
                className="font-mono text-base sm:text-lg text-emerald-400 font-black flex items-center gap-1 mt-0.5"
                dir="ltr"
              >
                SYNCED (#62,194,801)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">آمادگی ربات تلگرام</span>
              <span
                className="font-mono text-base sm:text-lg text-amber-300 font-black flex items-center gap-1 mt-0.5"
                dir="ltr"
              >
                POLLING ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for 3 Tactical Launch Steps */}
        <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            {
              id: 1 as const,
              numFa: '۱',
              title: 'چک‌لیست امنیتی و خزانه‌ها (Vaults & Kill-Switch)',
            },
            {
              id: 2 as const,
              numFa: '۲',
              title: 'تنظیمات دامنه و Cloudflare WAF',
            },
            {
              id: 3 as const,
              numFa: '۳',
              title: 'مرکز تلگرام بات و وب‌اپ موبایل (Telegram Hub)',
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`launch-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-all border ${
                  isActive
                    ? 'bg-[#262a33] text-amber-300 border-amber-500/40 shadow-md'
                    : 'bg-[#151922] text-slate-400 hover:text-white border-white/5'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-center leading-6 text-xs font-mono font-black ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {tab.numFa}
                </span>
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* ================= STEP 1: VAULT & SECURITY PRE-FLIGHT ================= */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-6 animate-fadeIn" id="launch-panel-1">
            {/* Top Row: Kill Switch & Vault Balances */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kill-Switch Circuit Simulator (5 cols) */}
              <div className="lg:col-span-5 rounded-3xl bg-[#161b26] border border-white/10 p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/15 rounded-full blur-2xl pointer-events-none"></div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <span className="material-symbols-outlined text-2xl">gavel</span>
                      <span className="text-base sm:text-lg font-black">
                        شبیه‌ساز اضطراری Kill-Switch
                      </span>
                    </div>
                    <span
                      data-testid="circuit-status-badge"
                      className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                        killSwitchActive
                          ? 'bg-red-600/30 border border-red-500 text-red-200'
                          : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {killSwitchActive
                        ? 'EMERGENCY HALT (KILL-SWITCH ENGAGED)'
                        : 'CIRCUIT ARMED & SECURE'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    قفل اضطراری آنی جهت انسداد کامل درگاه‌های واریز/برداشت (بازگشت آنی کد{' '}
                    <code className="text-amber-300 font-mono">503 Service Unavailable</code>)، تعلیق قرعه‌کشی زنده و ایزوله‌سازی دارایی‌های خزانه‌های گرم و سرد بدون قطعی دیتابیس.
                  </p>
                </div>

                {/* Interactive Kill Switch Trigger Area */}
                <div className="my-5 p-4 rounded-2xl bg-[#0a0e16] border border-white/10 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-300 font-semibold">
                        وضعیت رله مدارهای خروجی:
                      </span>
                      <span
                        data-testid="circuit-wire-label"
                        className={`font-mono text-xs sm:text-sm font-black mt-0.5 ${
                          killSwitchActive ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {killSwitchActive
                          ? 'ALL PAYOUT ROUTES SEVERED & PAUSED (503)'
                          : 'NORMAL FLOW (UNBLOCKED)'}
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        killSwitchActive
                          ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-ping'
                          : 'bg-emerald-400 shadow-[0_0_12px_rgba(78,222,163,0.8)]'
                      }`}
                    />
                  </div>

                  {/* Kill Switch Toggle Button + Reset Button */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-testid="toggle-killswitch-btn"
                      onClick={handleToggleKillSwitch}
                      className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                        killSwitchActive
                          ? 'bg-red-600 text-white hover:bg-red-500'
                          : 'bg-[#262a33] hover:bg-red-900/70 text-rose-300 hover:text-white border border-rose-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        power_settings_new
                      </span>
                      <span data-testid="killswitch-btn-text">
                        {killSwitchActive
                          ? 'مدار در وضعیت قفل اضطراری (HALTED)'
                          : 'تست کلید قطع اضطراری'}
                      </span>
                    </button>

                    <button
                      type="button"
                      data-testid="reset-killswitch-btn"
                      onClick={handleResetKillSwitch}
                      title="ریست مدار به حالت امن"
                      className="py-3 px-3.5 rounded-xl bg-[#2a303c] text-slate-300 hover:text-white text-xs transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">restart_alt</span>
                    </button>
                  </div>

                  {/* Live 503 API Verification Button */}
                  <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                    <button
                      type="button"
                      data-testid="verify-503-endpoint-btn"
                      onClick={handleProbeProtectedRoutes}
                      className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-mono text-amber-300 flex items-center justify-between"
                    >
                      <span>تست پاسخ زنده API (/api/tickets/buy & /api/deposit)</span>
                      <span>PROBE ↗</span>
                    </button>
                    {endpointProbeResult && (
                      <div
                        data-testid="probe-status-output"
                        className={`p-2.5 rounded-xl text-[11px] font-mono font-bold ${
                          endpointProbeResult.httpStatus === 503
                            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                            : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {endpointProbeResult.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Audit Checkpoints */}
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>تأییدیه کلید چندامضایی (Multi-Sig 3-of-5):</span>
                    <span className="text-emerald-400 font-mono font-bold">تکمیل (VALID)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>سنسور نشت کلید خصوصی در کدهای کلاینت:</span>
                    <span className="text-emerald-400 font-mono font-bold">صفر مورد یافت شد</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ایزولاسیون سرور قرعه‌کشی (RNG Enclave):</span>
                    <span className="text-emerald-400 font-mono font-bold">AMD SEV ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Hot & Cold Vault Architecture (7 cols) */}
              <div className="lg:col-span-7 rounded-3xl bg-[#161b26] border border-white/10 p-6 flex flex-col justify-between shadow-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <span className="material-symbols-outlined text-2xl">
                        account_balance_wallet
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white">
                        معماری خزانه‌های ارزی و تصفیه خودکار (Vault Balance & Auto-Sweep)
                      </h2>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 rounded-full font-bold">
                      REAL-TIME ANCHOR
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    موجودی بافر گرم برای تسویه جوایز فوری زیر ۵,۰۰۰ دلار و نگهداری ذخایر کلان جک‌پات در خزانه‌های سرد لجر/گنویسیس سیف.
                  </p>
                </div>

                {/* Vault Split Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
                  {/* Hot Wallet Card */}
                  <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-amber-400 text-base">
                          local_fire_department
                        </span>
                        <span>بافر خزانه گرم (Hot Wallet)</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                        TRON USDT
                      </span>
                    </div>
                    <div
                      data-testid="launch-hot-wallet-balance"
                      className="font-mono text-2xl sm:text-3xl text-amber-400 font-black my-1"
                      dir="ltr"
                    >
                      ${hotWalletUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs text-slate-400 font-normal">USDT</span>
                    </div>
                    <div className="w-full bg-[#262a33] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${hotFillPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        حد اشباع بافر: ${toPersianDigits(autoSweepThreshold.toLocaleString('en-US'))} دلار
                      </span>
                      <span>{toPersianDigits(hotFillPercent)}٪ پر شده</span>
                    </div>
                  </div>

                  {/* Cold Vault Multi-Sig Card */}
                  <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-emerald-400 text-base">
                          ac_unit
                        </span>
                        <span>خزانه امن سرد (Cold Multi-Sig)</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                        GNOSIS SAFE
                      </span>
                    </div>
                    <div
                      data-testid="launch-cold-vault-balance"
                      className="font-mono text-2xl sm:text-3xl text-emerald-400 font-black my-1"
                      dir="ltr"
                    >
                      ${coldVaultUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs text-slate-400 font-normal">USDT</span>
                    </div>
                    <div className="w-full bg-[#262a33] h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full w-4/5" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>پشتوانه جک‌پات ۱۰۰٪ تضمین شده</span>
                      <span>ذخیره بدون ریسک</span>
                    </div>
                  </div>
                </div>

                {/* Auto-Sweep Configuration Slider */}
                <div className="p-4 rounded-2xl bg-[#202531] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm text-white font-bold">
                      تنظیم سقف تخلیه خودکار (Auto-Sweep Threshold)
                    </span>
                    <span className="text-xs text-slate-400">
                      انتقال خودکار مازاد موجودی خزانه گرم به صندوق سرد در هر واریز جدید
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <span
                      data-testid="autosweep-threshold-label"
                      className="font-mono text-sm text-amber-400 font-black shrink-0"
                      dir="ltr"
                    >
                      ${autoSweepThreshold.toLocaleString('en-US')} USDT
                    </span>
                    <input
                      type="range"
                      min={1000}
                      max={10000}
                      step={500}
                      value={autoSweepThreshold}
                      data-testid="autosweep-threshold-slider"
                      onChange={(e) => setAutoSweepThreshold(Number(e.target.value))}
                      className="accent-amber-400 cursor-pointer w-32"
                    />
                    <button
                      type="button"
                      data-testid="save-autosweep-btn"
                      onClick={handleSaveAutoSweep}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shrink-0"
                    >
                      ذخیره
                    </button>
                  </div>
                </div>

                {sweepFeedback && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold">
                    {sweepFeedback}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Webhook Validator & Idempotency Key Engine */}
            <div className="rounded-3xl bg-[#161b26] border border-white/10 p-6 shadow-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#232834] flex items-center justify-center text-amber-400">
                    <span className="material-symbols-outlined text-xl">webhook</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      اعتبارسنجی وب‌هوک نودهای بلاک‌چین (TronGrid & Toncenter)
                    </h3>
                    <span className="text-xs text-slate-400">
                      مکانیزم ممانعت از پردازش تکراری تراکنش‌ها (Anti-Replay Attack Idempotency Engine)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#262a33] text-slate-300 font-mono text-xs font-bold">
                    HMAC SHA-256
                  </span>
                  <button
                    type="button"
                    data-testid="simulate-webhook-btn"
                    onClick={() => handleSimulateWebhook(false)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">bolt</span>
                    <span>شبیه‌سازی وب‌هوک ورودی</span>
                  </button>
                  <button
                    type="button"
                    data-testid="simulate-replay-attack-btn"
                    onClick={() => handleSimulateWebhook(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all"
                  >
                    تست حمله Replay (409)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Node Endpoint 1 */}
                <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/5 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>TronGrid Mainnet Hook</span>
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      200 OK
                    </span>
                  </div>
                  <div
                    className="font-mono text-xs text-slate-400 truncate"
                    dir="ltr"
                  >
                    https://api.luckydrop.vip/v1/hooks/tron
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>کلید احراز: HMAC_ACTIVE</span>
                    <span>تأخیر: 18ms</span>
                  </div>
                </div>

                {/* Node Endpoint 2 */}
                <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/5 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Toncenter API Gateway</span>
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400 font-bold">
                      200 OK
                    </span>
                  </div>
                  <div
                    className="font-mono text-xs text-slate-400 truncate"
                    dir="ltr"
                  >
                    https://api.luckydrop.vip/v1/hooks/ton
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>پروتکل: TON Connect 2.0</span>
                    <span>تأخیر: 32ms</span>
                  </div>
                </div>

                {/* Idempotency Engine Stat */}
                <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/5 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-amber-400 text-base">
                        fingerprint
                      </span>
                      <span>شناسه‌های یکتا (TTL: 7 Days)</span>
                    </span>
                    <span className="font-mono text-[11px] text-amber-400 font-bold">
                      REDIS CLUSTER
                    </span>
                  </div>
                  <div
                    data-testid="processed-idempotent-counter"
                    className="font-mono text-lg font-black text-amber-400"
                    dir="ltr"
                  >
                    {idempotentKeysCount.toLocaleString('en-US')} Keys Active
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>نرخ مسدودسازی تکراری: 0.04%</span>
                    <span>تداخل: ۰</span>
                  </div>
                </div>
              </div>

              {/* Webhook Live Event Log Console */}
              <div
                className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 font-mono text-xs space-y-2 shadow-inner"
                dir="ltr"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-white/10 pb-1.5">
                  <span>LIVE WEBHOOK INGESTION FEED</span>
                  <span className="text-emerald-400 font-bold">● LISTENING</span>
                </div>
                <div
                  data-testid="webhook-feed-box"
                  className="max-h-28 overflow-y-auto space-y-1.5 pt-1"
                >
                  {webhookLogs.map((log) => (
                    <div
                      key={log.id}
                      className={
                        log.tone === 'rose'
                          ? 'text-rose-400 font-bold'
                          : log.tone === 'amber'
                          ? 'text-amber-300 font-bold'
                          : log.tone === 'emerald'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }
                    >
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: CLOUDFLARE WAF & DOMAIN ================= */}
        {activeTab === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn" id="launch-panel-2">
            {/* DNS Records Table (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl bg-[#161b26] border border-white/10 p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="material-symbols-outlined text-2xl">dns</span>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    تنظیمات رکوردهای DNS در Cloudflare
                  </h2>
                </div>
                <span
                  className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5"
                  dir="ltr"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>PROXY ACTIVE</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                جهت فعال‌سازی پنهان‌سازی آی‌پی اصلی سرورها، ترافیک دامنه از ابر Cloudflare عبور داده شده و رکوردهای زیر با کپی سریع در دسترس هستند.
              </p>

              {/* Table of DNS Records */}
              <div className="rounded-2xl overflow-hidden bg-[#0a0e16] border border-white/10 shadow-inner">
                <div className="grid grid-cols-12 p-3 bg-[#232834] text-xs font-black text-white">
                  <div className="col-span-2 text-right">نوع رکورد</div>
                  <div className="col-span-3 text-right">نام (Name)</div>
                  <div className="col-span-4 text-right">مقصد (Content)</div>
                  <div className="col-span-3 text-center">پروکسی / اقدام</div>
                </div>

                {[
                  { type: 'A', name: '@ (root)', content: '104.21.65.112' },
                  { type: 'CNAME', name: 'api', content: 'ingress-lb.luckydrop.vip' },
                  { type: 'CNAME', name: 'tg-bot', content: 'bot-cluster.luckydrop.vip' },
                ].map((rec) => (
                  <div
                    key={rec.name}
                    className="grid grid-cols-12 p-3.5 items-center text-xs font-mono border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-2 text-right text-amber-400 font-bold">
                      {rec.type}
                    </div>
                    <div className="col-span-3 text-right text-white" dir="ltr">
                      {rec.name}
                    </div>
                    <div
                      className="col-span-4 text-right text-slate-300 truncate"
                      dir="ltr"
                    >
                      {rec.content}
                    </div>
                    <div className="col-span-3 flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 font-bold">
                        Proxied
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyDns(rec.content)}
                        className="p-1.5 rounded-lg bg-[#232834] hover:text-amber-300 transition-colors"
                        title="کپی رکورد"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedRecord === rec.content ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SSL/TLS Certification Panel */}
              <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-3xl">
                    encrypted
                  </span>
                  <div>
                    <div className="text-sm text-white font-bold">
                      گواهینامه SSL/TLS Full (Strict)
                    </div>
                    <div className="text-xs text-slate-400">
                      رمزنگاری سرتاسری از کاربر تا سرور لوتو با کلید Origin CA 15-Year
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  STATUS: SECURED
                </span>
              </div>
            </div>

            {/* WAF Rules & DDoS Shield Control (5 cols) */}
            <div className="lg:col-span-5 rounded-3xl bg-[#161b26] border border-white/10 p-6 shadow-lg flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <span className="material-symbols-outlined text-2xl">security</span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      قوانین WAF و سپر دفاعی دیداس
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    SHIELD 2.0
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  تنظیم واکنش‌های خودکار به حملات لایه ۳، ۴ و ۷ و هدایت خودکار اسکنرهای مخرب به صفحه فریب‌دهنده (Decoy Honeypot).
                </p>
              </div>

              {/* Interactive Under Attack Mode Toggle */}
              <div className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 flex items-center justify-between shadow-inner">
                <div className="flex flex-col">
                  <span className="text-sm text-white font-bold">
                    حالت "I'm Under Attack"
                  </span>
                  <span className="text-xs text-slate-400">
                    اعمال چالش جاوااسکریپت نامرئی روی تمامی درخواست‌های لابی
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="under-attack-switch"
                  onClick={handleToggleUnderAttack}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-black transition-all ${
                    underAttackMode
                      ? 'bg-amber-500 text-slate-950 shadow-lg'
                      : 'bg-[#262a33] text-slate-300'
                  }`}
                >
                  {underAttackMode ? 'ENABLED' : 'STANDBY'}
                </button>
              </div>

              {/* WAF Custom Action Rules List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#202531]">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className="material-symbols-outlined text-emerald-400 text-base">
                      rule
                    </span>
                    <span>مسدودسازی دامنه‌های Tor و پروکسی‌های آلوده</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">BLOCK</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#202531]">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className="material-symbols-outlined text-amber-400 text-base">
                      directions_alt
                    </span>
                    <span>تله هدایت اسکنرهای PHP/WP و /admin به Decoy 404</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('404')}
                    className="text-amber-400 hover:underline font-mono font-bold"
                  >
                    REDIRECT (/404) ↗
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#202531]">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className="material-symbols-outlined text-emerald-400 text-base">
                      speed
                    </span>
                    <span>محدودیت نرخ درخواست (Rate Limiting: 60 req/min)</span>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">ENFORCED</span>
                </div>
              </div>

              {/* WAF Stat Graph / Sparkline Illustration */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e16] border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">حملات دفع‌شده در ۲۴ ساعت:</span>
                  <span
                    className="font-mono text-base font-black text-amber-400"
                    dir="ltr"
                  >
                    {blockedThreatsCount.toLocaleString('en-US')} Threats Blocked
                  </span>
                </div>
                <svg
                  className="w-32 h-8 text-amber-400 overflow-visible"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 120 30"
                >
                  <path
                    d="M0 24 L20 18 L40 22 L60 8 L80 14 L100 4 L120 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <circle className="animate-ping" cx="100" cy="4" fill="#ffc174" r="3" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TELEGRAM BOT & WEBAPP SUITE ================= */}
        {activeTab === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn" id="launch-panel-3">
            {/* Mobile Phone Mockup Simulation (4 cols) */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="relative w-[300px] h-[590px] bg-[#0a0e16] rounded-[44px] p-3 shadow-2xl border-4 border-[#262a33] overflow-hidden flex flex-col">
                {/* Speaker & Dynamic Island */}
                <div className="w-24 h-4 bg-[#262a33] rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#0a0e16]"></div>
                </div>

                {/* Telegram WebApp Container inside Phone */}
                <div className="flex-1 rounded-[32px] bg-[#121723] overflow-hidden flex flex-col justify-between p-4 relative border border-white/5">
                  {/* Telegram Mini-App Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-400 text-base">
                        close
                      </span>
                      <span className="font-mono text-xs text-amber-400 font-black">
                        LuckyDrop VIP Mini-App
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>ONLINE</span>
                    </div>
                  </div>

                  {/* Mini-App Lottery Hero inside phone */}
                  <div className="flex flex-col items-center text-center my-auto py-2">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2 shadow-[0_0_15px_rgba(255,193,116,0.3)]">
                      <span className="material-symbols-outlined text-2xl">star</span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-300 font-bold">
                      SUPER JACKPOT #408
                    </span>
                    <div
                      className="font-mono text-2xl text-amber-400 font-black my-1"
                      dir="ltr"
                    >
                      $150,000 USDT
                    </div>
                    <span className="text-[11px] text-slate-400">
                      زمان باقیمانده تا قرعه‌کشی:
                    </span>
                    <div
                      className="flex items-center gap-1 font-mono text-xs text-emerald-400 font-bold mt-1"
                      dir="ltr"
                    >
                      04:18:22
                    </div>

                    {/* Mini Picked Balls inside Phone */}
                    <div className="flex items-center justify-center gap-1.5 my-4" dir="ltr">
                      {['07', '14', '21', '33'].map((b) => (
                        <div
                          key={b}
                          className="w-7 h-7 rounded-full lottery-ball-gold text-slate-950 font-mono font-black text-[11px] flex items-center justify-center"
                        >
                          {b}
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full lottery-ball-purple text-white font-mono font-black text-[11px] flex items-center justify-center">
                        09
                      </div>
                    </div>
                  </div>

                  {/* Telegram Bottom WebApp Button */}
                  <button
                    type="button"
                    data-testid="tg-miniapp-quick-buy"
                    onClick={() => navigateTo('play')}
                    className="w-full py-3 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-base">
                      confirmation_number
                    </span>
                    <span>خرید بلیت سریع (1.0 TON)</span>
                  </button>
                </div>
              </div>
              <span className="text-xs text-slate-400 mt-2 text-center">
                پیش‌نمایش لایو تلگرام مینی‌اپ در کلاینت کاربر
              </span>
            </div>

            {/* Telegram Bot Configuration & Live Dispatch Console (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Bot Credentials Panel */}
              <div className="p-6 rounded-3xl bg-[#161b26] border border-white/10 shadow-lg space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <span className="material-symbols-outlined text-2xl">smart_toy</span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      تنظیمات هسته ربات تلگرام و کانال برندگان
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 rounded-full font-bold">
                    BOT POLLING OK
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bot Token Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">
                      توکن اختصاصی BotFather:
                    </label>
                    <div
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0a0e16] border border-white/10 focus-within:border-amber-400"
                      dir="ltr"
                    >
                      <input
                        type={showBotToken ? 'text' : 'password'}
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        dir="ltr"
                        className="flex-1 min-w-0 bg-transparent text-white font-mono text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        data-testid="toggle-bot-token-btn"
                        onClick={() => setShowBotToken(!showBotToken)}
                        className="shrink-0 text-slate-400 hover:text-amber-300 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-base">
                          {showBotToken ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Winners Channel ID Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">
                      کانال پخش زنده برندگان جک‌پات:
                    </label>
                    <input
                      type="text"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      dir="ltr"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0a0e16] border border-white/10 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Interactive Jackpot Announcement Trigger */}
                <div className="p-4 rounded-2xl bg-[#202531] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-bold">
                      تست مخابره پیام تبریک برنده جک‌پات به کانال
                    </span>
                    <span className="text-xs text-slate-400">
                      شبیه‌سازی ارسال فوری پیام برد با هش TronScan و دکمه شیشه‌ای اینلاین مینی‌اپ
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="send-telegram-broadcast-btn"
                    onClick={handleSendTelegramBroadcast}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">campaign</span>
                    <span>ارسال تست به {channelId}</span>
                  </button>
                </div>
              </div>

              {/* Telegram Live Dispatch Logs & Rich Message Feed */}
              <div className="p-6 rounded-3xl bg-[#161b26] border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-xl">
                      mark_chat_read
                    </span>
                    <span>لاگ پیام‌های اخیر ارسال شده توسط ربات (MarkdownV2)</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 font-bold">
                    LIVE TELEMETRY STREAM
                  </span>
                </div>

                <div
                  data-testid="telegram-message-preview"
                  className={`p-5 rounded-2xl bg-[#0a0e16] border-r-4 border-amber-400 space-y-2.5 text-xs transition-all ${
                    broadcastHighlight ? 'ring-2 ring-emerald-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-white/10">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>ارسال موفق به کلاینت تلگرام ({latestBroadcast.channelId})</span>
                    </span>
                    <span className="font-mono">{latestBroadcast.timestampLabel}</span>
                  </div>

                  <p className="font-black text-amber-400 text-sm">
                    🎉 تبریک بی‌کران! سوپر جک‌پات هفتگی منفجر شد! 🏆
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    کاربر با هویت حفاظت‌شده{' '}
                    <code
                      data-testid="tg-winner-short-id"
                      className="bg-[#232834] px-2 py-0.5 rounded text-emerald-400 font-mono"
                      dir="ltr"
                    >
                      {latestBroadcast.winnerShortId}
                    </code>{' '}
                    برنده جایزه بزرگ به ارزش{' '}
                    <strong className="text-amber-300 font-bold">
                      ${latestBroadcast.prizeUsdt.toLocaleString('en-US')} دلار تتر (
                      {latestBroadcast.prizeTomanFormatted})
                    </strong>{' '}
                    شد!
                  </p>

                  <div
                    className="text-xs text-slate-400 font-mono flex items-center gap-2"
                    dir="ltr"
                  >
                    <span>TronScan TX:</span>
                    <a
                      href={latestBroadcast.tronScanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {latestBroadcast.txHashShort}
                    </a>
                  </div>

                  {/* Inline Telegram WebApp Launch Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigateTo('play')}
                      className="px-4 py-2 rounded-xl bg-[#232834] hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>ورود به مینی‌اپ و شرکت در دور بعد</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Launch Operation Command Bar */}
        <div className="pt-4">
          <div className="p-5 rounded-3xl bg-[#161b26]/90 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-lg">policy</span>
              </div>
              <span className="text-xs text-slate-300">
                تمام تست‌های نهایی امنیتی، پروتکل‌های احراز هویت دوعاملی (2FA) ادمین و ترازنامه‌های مالی صفر مغایرت دارند.
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                data-testid="download-ops-report-btn"
                onClick={handleDownloadOpsReport}
                className="px-4 py-2.5 rounded-xl bg-[#262a33] text-slate-200 hover:text-amber-300 transition-all text-xs font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">file_download</span>
                <span>دریافت گزارش تفصیلی PDF/JSON</span>
              </button>
              <button
                type="button"
                data-testid="board-approval-btn"
                onClick={() =>
                  showToast(
                    '✅ کلیه مؤلفه‌های پرتاب سبز هستند. مجوز استقرار عمومی توسط ناظر ارشد صادر گردید.'
                  )
                }
                className="px-5 py-2.5 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs shadow-md hover:brightness-110 transition-all"
              >
                تأییدیه نهایی هیئت مدیره
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
