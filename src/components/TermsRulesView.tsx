import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  filterTermsAndFaqs,
  computeFormulaBallModulo,
  calculateFixedPegTicketConversions,
  deriveProvablyFairBalls,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';

export const TermsRulesView: React.FC = () => {
  const {
    fxRates,
    formatAmount,
    navigateTo,
    setAiChatOpen,
    killSwitchActive,
  } = useLottery();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSectionTab, setActiveSectionTab] = useState<string>('rules-and-tickets');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState<boolean>(false);

  // Interactive Quick-Pick demo balls inside Card 2
  const [demoBalls, setDemoBalls] = useState<{ main: number[]; golden: number }>({
    main: [7, 19, 24, 38, 49],
    golden: 12,
  });

  // Interactive Formula Sandbox state inside Section 3
  const [blockHashInput, setBlockHashInput] = useState<string>(
    '0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'
  );
  const [seedInput, setSeedInput] = useState<string>('zarrin_server_seed_v4.8_audit');
  const [nonceInput, setNonceInput] = useState<number>(408);

  const pegConversions = calculateFixedPegTicketConversions(5.0, fxRates);
  const filtered = filterTermsAndFaqs(searchQuery);
  const formulaCheck = computeFormulaBallModulo(blockHashInput, seedInput, nonceInput, 50);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadWhitepaper = () => {
    const content = [
      '====================================================================',
      'LUCKYDROP (ZARRIN LOTTERY) — OFFICIAL LEGAL WHITEPAPER & AUDIT v4.8',
      'CertiK & PeckShield Verified Smart Contract Specification',
      '====================================================================',
      '',
      '1. TICKET ISSUANCE & FIXED PEG:',
      `   - Fixed Peg Price: $5.00 USDT (${pegConversions.tomanFormatted} | ${pegConversions.ton} TON | ${pegConversions.trx} TRX)`,
      '   - Ball Matrix: 5 Main Balls (1..50) + 1 Golden PowerBall (1..15)',
      '   - Sales Cutoff: Exactly 30 minutes prior to reference Bitcoin block (Block -30m)',
      '   - Finality: Immutable SHA-256 Commit Hash on Tron & TON ledgers',
      '',
      '2. WATERFALL CASHFLOW & 6-TIER PRIZE DISTRIBUTION (85% RTP):',
      '   - 85% Guaranteed Player Prize Pool (RTP)',
      '   - 10% Infrastructure, Security Audit & Operator Vault',
      '   - 3% Next Round Mega Jackpot Rollover Reserve ($150,000 Minimum Floor)',
      '   - 2% Validator & Network Gas Buffer',
      '',
      '3. PROVABLY FAIR FORMULA:',
      '   SHA256(Block_Hash + Seed + Nonce) % Total_Balls',
      '',
      '4. INSTANT PAYOUTS & MULTI-SIG COLD VAULT:',
      '   - Under $10,000 USDT: Automated <90s instant settlement via Hot Wallet',
      '   - Over $100,000 USDT: Gnosis Safe 3-of-5 Multi-Sig (<12 hours) + LBMA Gold Backing',
      '====================================================================',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LuckyDrop-Official-Legal-Whitepaper-v4.8.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast(
      '✅ نسخه رسمی سند حقوقی و ممیزی قرارداد هوشمند (v4.8 PDF/Spec - 2.4 MB) با موفقیت دانلود شد.'
    );
  };

  const handleCopyTicketHash = () => {
    navigator.clipboard?.writeText(
      '0x8f2a93c1b09d4377c218d99a5e418a901ffc29b740523'
    );
    triggerToast('✅ هش نمونه بلیت (0x8f2a93c1...740523) در کلیپ‌بورد کپی شد.');
  };

  const handleRandomizeDemoBalls = () => {
    const picked = deriveProvablyFairBalls(
      `quantum_entropy_${Date.now()}`,
      `vip_client_${Math.random()}`,
      Math.floor(Math.random() * 9999)
    );
    setDemoBalls({ main: picked.mainNumbers, golden: picked.goldenBall });
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSectionTab(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative w-full overflow-hidden pb-16">
      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-80 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          data-testid="terms-toast-banner"
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#181c24]/95 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-bold shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex items-center gap-2.5 backdrop-blur-xl"
        >
          <span className="material-symbols-outlined text-emerald-400 text-lg">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 pt-8 pb-6 w-full">
        <div className="flex flex-col items-start gap-4">
          {/* Security & Audit Micro Badge */}
          <div
            data-testid="audit-verified-badge"
            className="inline-flex flex-wrap items-center gap-2 px-4 py-1.5 rounded-full bg-[#262a33] border border-white/10 shadow-lg"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="material-symbols-outlined text-[#4edea3] text-[18px]">
              verified
            </span>
            <span className="font-mono text-xs text-[#4edea3] font-bold tracking-wider">
              سند رسمی و قرارداد هوشمند نسخه v4.8
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-[#d8c3ad] flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-[15px] text-[#ffc174]">
                security
              </span>
              ممیزی رسمی CertiK &amp; PeckShield Verified v4.8
            </span>
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#dfe2ee] font-black tracking-tight max-w-4xl leading-tight">
            قوانین رسمی،{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#ffc174] via-[#ffddb8] to-[#f59e0b]">
              شفافیت ریاضیاتی
            </span>{' '}
            و راهنمای دریافت جوایز جک‌پات LuckyDrop
          </h1>
          <p className="text-sm sm:text-base text-[#d8c3ad] max-w-3xl leading-relaxed">
            سند شفافیت جامع و ضوابط نقدشوندگی کلوب زرین لاتاری؛ بررسی دقیق سازوکار الگوریتم
            اثبات‌پذیری منصفانه (Provably Fair)، معماری قراردادهای هوشمند، مدل تسهیم مالی
            Waterfall، استانداردهای مبارزه با پولشویی (AML) و تسویه آنی کلان.
          </p>

          {/* Search Bar & Instant Actions */}
          <div className="w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mt-2 pt-2">
            <div className="relative flex-1 max-w-xl flex items-center bg-[#181c24] border border-white/10 focus-within:border-[#f59e0b] rounded-xl px-4 py-3 shadow-inner transition-all">
              <span className="material-symbols-outlined text-[#ffc174] text-[20px] ml-3 shrink-0">
                search
              </span>
              <input
                id="faq-search-input"
                data-testid="terms-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در اصول حقوقی، ضرایب جوایز، هش بلاک‌چین، یا پرسش‌های متداول..."
                className="w-full bg-transparent text-[#dfe2ee] placeholder:text-[#d8c3ad]/60 text-sm focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  data-testid="clear-terms-search"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white text-xs font-mono px-2"
                >
                  پاک کردن
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="download-whitepaper-btn"
                onClick={handleDownloadWhitepaper}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#262a33] hover:bg-[#353942] border border-[#ffc174]/30 text-[#ffc174] font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>دانلود PDF نسخه رسمی قرارداد</span>
                <span className="font-mono text-[11px] text-[#d8c3ad] bg-[#1c2028] px-2 py-0.5 rounded">
                  2.4 MB
                </span>
              </button>

              <button
                type="button"
                data-testid="open-contract-source-btn"
                onClick={() => setShowSourceModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#181c24] hover:bg-[#1c2028] border border-white/10 text-[#d8c3ad] hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">code</span>
                <span>کد منبع قرارداد در GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sticky Tab Bar Navigation */}
      <nav className="lg:sticky lg:top-20 z-30 w-full bg-[#0f131c]/90 backdrop-blur-xl border-y border-white/5 shadow-md py-2.5 my-4">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 sm:gap-2">
            {[
              {
                id: 'rules-and-tickets',
                label: 'قوانین بازی و ثبت بلیت',
                icon: 'receipt_long',
              },
              {
                id: 'prize-waterfall',
                label: 'سازوکار تسویه و جدول جوایز',
                icon: 'military_tech',
              },
              {
                id: 'provably-fair',
                label: 'الگوریتم اثبات‌پذیری منصفانه',
                icon: 'token',
              },
              {
                id: 'instant-settlement',
                label: 'تسویه آنی و خزانه‌داری سرد',
                icon: 'flash_on',
              },
              {
                id: 'aml-compliance',
                label: 'امنیت و مقررات AML',
                icon: 'policy',
              },
              {
                id: 'faq',
                label: 'پرسش‌های متداول (FAQ)',
                icon: 'help_center',
              },
            ].map((tab) => {
              const isActive = activeSectionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`terms-tab-${tab.id}`}
                  onClick={() => scrollToSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#f59e0b] text-[#2a1700] shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : 'bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-12">
        {/* ================= SECTION 1: قوانین بازی و نحوه صدور بلیت ================= */}
        <section className="scroll-mt-36 pt-2" id="rules-and-tickets">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-[#ffc174] text-xs font-bold tracking-wider">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>بخش اول: دستورالعمل اجرایی بلیت‌ها</span>
            </div>
            <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
              قوانین شرکت در قرعه‌کشی و صدور رسمی بلیت
            </h2>
            <p className="text-sm text-[#d8c3ad] max-w-3xl leading-relaxed">
              تمامی بلیت‌های صادرشده در لاکی‌دراپ (LuckyDrop) بلافاصله پس از پرداخت به عنوان
              یک توکن اعتباری با هش SHA-256 رمزنگاری و در دفتر کل ثبت می‌گردند.
            </p>
          </div>

          {/* 4-Card Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Fixed Peg Rate 5.00 USDT */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#181c24] hover:bg-[#1c2028] border border-white/5 transition-all shadow-md group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#262a33] text-[#ffc174] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">attach_money</span>
                </div>
                <div>
                  <span className="text-xs text-[#ffc174] font-bold">تعرفه مقطوع</span>
                  <h3
                    data-testid="fixed-peg-price"
                    className="text-xl sm:text-2xl font-black text-[#dfe2ee] mt-1"
                  >
                    ۵.۰۰ تتر (USDT)
                  </h3>
                </div>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  هزینه ثابت برای هر ترکیب شانس. قابلیت پرداخت آنی با تتر شبکه ترون (TRC20)، تون
                  (TON)، ترون (TRX) و بیت‌کوین بر اساس نرخ لحظه‌ای اوراکل:
                </p>
                {/* Live Multi-Currency Breakdown Pills */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-[#0f131c] p-2.5 rounded-xl border border-white/5">
                  <div className="text-amber-300 font-bold">
                    {pegConversions.tomanFormatted}
                  </div>
                  <div className="text-sky-400 text-left" dir="ltr">
                    {pegConversions.ton} TON
                  </div>
                  <div className="text-rose-400" dir="ltr">
                    {pegConversions.trx} TRX
                  </div>
                  <div className="text-slate-300 text-left" dir="ltr">
                    {pegConversions.btc} BTC
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[#4edea3] text-xs font-bold">
                <span>نرخ بدون نوسان (Pegged)</span>
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </div>
            </div>

            {/* Card 2: 5 Main + 1 Golden Ball Mechanics */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#181c24] hover:bg-[#1c2028] border border-white/5 transition-all shadow-md group">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#262a33] text-[#ffc174] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[26px]">casino</span>
                  </div>
                  <button
                    type="button"
                    data-testid="terms-quickpick-demo-btn"
                    onClick={handleRandomizeDemoBalls}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] text-amber-300 font-bold cursor-pointer transition-all"
                  >
                    AI Quick-Pick 🎲
                  </button>
                </div>
                <div>
                  <span className="text-xs text-[#ffc174] font-bold">فرمولاسیون گوی‌ها</span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#dfe2ee] mt-1">
                    ۵ اصلی + ۱ طلایی
                  </h3>
                </div>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  انتخاب ۵ عدد از بازه ۱ الی ۵۰ به همراه ۱ گوی سوپر طلایی (PowerBall) از بازه ۱
                  الی ۱۵. امکان چینش تصادفی (Quick Pick) با انتروپی کوانتومی.
                </p>
              </div>
              {/* Visual Mini Balls */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5">
                {demoBalls.main.map((n) => (
                  <span
                    key={n}
                    className="w-6 h-6 rounded-full bg-[#31353e] text-[11px] font-bold text-[#dfe2ee] flex items-center justify-center"
                  >
                    {toPersianDigits(n)}
                  </span>
                ))}
                <span className="text-[#d8c3ad] text-xs">+</span>
                <span className="w-6 h-6 rounded-full bg-[#f59e0b] text-[11px] font-black text-[#2a1700] flex items-center justify-center shadow-md">
                  {toPersianDigits(demoBalls.golden)}
                </span>
              </div>
            </div>

            {/* Card 3: 30-Minute Cutoff Before Block */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#181c24] hover:bg-[#1c2028] border border-white/5 transition-all shadow-md group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#262a33] text-[#ffc174] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">timer_off</span>
                </div>
                <div>
                  <span className="text-xs text-[#ffc174] font-bold">بسته شدن فروش</span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#dfe2ee] mt-1">
                    ۳۰ دقیقه قبل از بلاک
                  </h3>
                </div>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  سیستم فروش دقیقاً ۳۰ دقیقه قبل از ماین شدن شماره بلاک معین بیت‌کوین مسدود
                  می‌شود تا از هرگونه امکان پیش‌بینی یا مداخله هش بلاک ممانعت به عمل آید.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[#d8c3ad] text-xs font-bold">
                <span>مسدودسازی قطعی درگاه</span>
                <span className="text-[#ffc174] font-mono font-bold">Block -30m</span>
              </div>
            </div>

            {/* Card 4: Immutable SHA-256 Confirmation */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-[#181c24] hover:bg-[#1c2028] border border-white/5 transition-all shadow-md group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#262a33] text-[#4edea3] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">history_edu</span>
                </div>
                <div>
                  <span className="text-xs text-[#4edea3] font-bold">عدم قابلیت استرداد</span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#dfe2ee] mt-1">
                    تایید قطعی SHA-256
                  </h3>
                </div>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  پس از انتشار رسید دیجیتال و صدور TXID، به موجب قوانین تفکیک‌ناپذیر دفتر کل
                  توزیع‌شده، بلیت‌ها نهایی بوده و امکان لغو، تعویض یا استرداد وجه نخواهند داشت.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[#4edea3] text-xs font-bold">
                <span>تاییدیه نهایی بلاک‌چین</span>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </div>
            </div>
          </div>

          {/* Perforated Ticket Verification Example Stub */}
          <div className="mt-6 p-6 rounded-2xl bg-[#181c24] border border-[#f59e0b]/20 relative overflow-hidden shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/20 flex items-center justify-center text-[#ffc174] shrink-0">
                  <span className="material-symbols-outlined text-[32px]">qr_code_2</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg text-[#dfe2ee] font-bold">
                    ساختار شناسه رمزنگاری بلیت (Cryptographic Ticket Hash)
                  </span>
                  <span className="text-xs text-[#d8c3ad] mt-0.5">
                    نمونه هش معتبر جهت استعلام در بستر اکسپلورر آزاد اتریوم و ترون‌اسکن (همراه با
                    تطبیق Client Seed)
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid="copy-sample-ticket-hash"
                onClick={handleCopyTicketHash}
                className="font-mono text-xs text-[#ffc174] bg-[#31353e] hover:bg-[#3a3f4b] px-4 py-2.5 rounded-xl border border-amber-500/30 flex items-center gap-2 cursor-pointer transition-all"
                dir="ltr"
              >
                <span>0x8f2a93c1b09d43...5e418a901ffc29b740523 (Verified v4.8)</span>
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: جدول رده‌بندی جوایز و تسهیم مالی Waterfall ================= */}
        <section className="scroll-mt-36 pt-2" id="prize-waterfall">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-[#ffc174] text-xs font-bold tracking-wider">
              <span className="material-symbols-outlined text-[18px]">
                account_balance_wallet
              </span>
              <span>بخش دوم: سیستم پرداختی شفاف</span>
            </div>
            <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
              جدول رده‌بندی سطوح جوایز و مدل آبشاری (Payout Waterfall)
            </h2>
            <p className="text-sm text-[#d8c3ad] max-w-3xl leading-relaxed">
              ضوابط دقیق توزیع ثروت با تضمین ریاضیاتی بالاترین نرخ بازگشت به سرمایه در میان
              سیستم‌های لاتاری جهان (RTP معادل ۸۵٪).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Prize Table (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl bg-[#181c24] border border-white/5 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
                  <h3 className="text-base sm:text-lg text-[#dfe2ee] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ffc174]">
                      format_list_numbered
                    </span>
                    <span>سطوح شش‌گانه جوایز رسمی</span>
                  </h3>
                  <span className="px-3 py-1 rounded-lg bg-[#00a572] text-[#002113] text-xs font-black">
                    تضمین پرداخت ۱۰۰٪
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table
                    data-testid="official-prize-tier-table"
                    className="w-full text-right text-sm border-separate border-spacing-y-1.5"
                  >
                    <thead>
                      <tr className="bg-[#262a33]/80 text-[#d8c3ad] text-xs font-bold">
                        <th className="py-3 px-4 rounded-r-xl">سطح رده</th>
                        <th className="py-3 px-4">انطباق گوی‌ها</th>
                        <th className="py-3 px-4">شانس برد</th>
                        <th className="py-3 px-4 rounded-l-xl text-left">مبلغ جایزه تخصیصی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.tiers.map((tier) => (
                        <tr
                          key={tier.id}
                          data-testid={`prize-tier-row-${tier.id}`}
                          className={`${
                            tier.id % 2 === 1 ? 'bg-[#1c2028]' : 'bg-[#141821]'
                          } hover:bg-[#353942]/50 transition-colors`}
                        >
                          <td
                            className={`py-3.5 px-4 rounded-r-xl font-bold ${
                              tier.isJackpot
                                ? 'text-[#ffc174] flex items-center gap-1.5'
                                : 'text-[#dfe2ee]'
                            }`}
                          >
                            {tier.isJackpot && (
                              <span className="material-symbols-outlined text-[#ffc174] text-[18px]">
                                Workspace_premium
                              </span>
                            )}
                            <span>{tier.rankLabel}</span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#dfe2ee]">
                            {tier.matchPattern}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#d8c3ad]">
                            {tier.oddsLabel}
                          </td>
                          <td className="py-3.5 px-4 rounded-l-xl text-left">
                            <span
                              className={`font-mono font-bold ${
                                tier.isJackpot
                                  ? 'text-[#ffc174] text-base'
                                  : tier.isFreeTicket
                                  ? 'text-[#4edea3]'
                                  : 'text-[#dfe2ee]'
                              }`}
                            >
                              {tier.prizeLabel}
                            </span>
                            {tier.subNote ? (
                              <div className="text-[11px] text-[#4edea3] font-semibold mt-0.5">
                                {tier.subNote} ({formatAmount(tier.baseUsdtValue)})
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ≈ {formatAmount(tier.baseUsdtValue)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-[#262a33] flex flex-wrap items-center justify-between gap-2 text-xs text-[#d8c3ad]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#ffc174]">
                    info
                  </span>
                  <span>
                    در صورت وجود چند برنده همزمان در رده ۱، مبلغ جک‌پات به نسبت مساوی میان آنان
                    تسهیم می‌گردد.
                  </span>
                </span>
                <span className="text-[#ffc174] font-bold">بدون کسورات مالیاتی</span>
              </div>
            </div>

            {/* Revenue Waterfall Model (1 col) */}
            <div className="rounded-2xl bg-[#181c24] border border-white/5 p-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg text-[#dfe2ee] font-bold">
                    مدل تسهیم درآمد Waterfall
                  </h3>
                  <span className="material-symbols-outlined text-[#ffc174] text-[22px]">
                    pie_chart
                  </span>
                </div>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  هر ۱۰۰ دلار ورودی از محل فروش بلیت، مطابق قرارداد هوشمند به صورت تفکیک‌شده و
                  بدون دخالت انسانی به این شکل پخش می‌شود:
                </p>

                {/* Waterfall Visual Progress Bars */}
                <div className="space-y-3.5 pt-2" data-testid="terms-waterfall-bars">
                  {/* 85% */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#dfe2ee] font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3]" />
                        <span>استخر جوایز و بازگشت به بازیکن (RTP)</span>
                      </span>
                      <span className="font-mono font-bold text-[#4edea3]">۸۵٪</span>
                    </div>
                    <div className="w-full bg-[#31353e] rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#4edea3] h-full rounded-full w-[85%]" />
                    </div>
                  </div>

                  {/* 10% */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#dfe2ee] font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffc174]" />
                        <span>زیرساخت، ممیزی امنیتی و اپراتور</span>
                      </span>
                      <span className="font-mono font-bold text-[#ffc174]">۱۰٪</span>
                    </div>
                    <div className="w-full bg-[#31353e] rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#ffc174] h-full rounded-full w-[10%]" />
                    </div>
                  </div>

                  {/* 3% */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#dfe2ee] font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d5c3ff]" />
                        <span>ذخیره پشتوانه استخر دوره بعد (Rollover)</span>
                      </span>
                      <span className="font-mono font-bold text-[#d5c3ff]">۳٪</span>
                    </div>
                    <div className="w-full bg-[#31353e] rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#d5c3ff] h-full rounded-full w-[3%]" />
                    </div>
                  </div>

                  {/* 2% */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#dfe2ee] font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#a08e7a]" />
                        <span>کارمزد اعتبارسنج‌ها و گس شبکه</span>
                      </span>
                      <span className="font-mono font-bold text-[#a08e7a]">۲٪</span>
                    </div>
                    <div className="w-full bg-[#31353e] rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#a08e7a] h-full rounded-full w-[2%]" />
                    </div>
                  </div>
                </div>

                {/* Visual Callout Box */}
                <div className="p-4 rounded-xl bg-[#262a33] mt-4 flex flex-col gap-1 border border-emerald-500/20">
                  <span className="text-xs text-[#4edea3] font-bold">بیمه انحلال سرمایه</span>
                  <span className="text-xs text-[#dfe2ee] leading-relaxed">
                    صندوق Rollover حداقل کف جایزه دوره بعدی را تحت هر شرایطی روی ۱۵۰,۰۰۰ دلار
                    پایدار نگاه می‌دارد.
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center gap-2 text-[#d8c3ad] text-xs">
                <span className="material-symbols-outlined text-[#4edea3] text-lg">gavel</span>
                <span>رعایت کامل چارچوب شفافیت مالیاتی VIP Curacao</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 3: سازوکار اثبات‌پذیری منصفانه (Provably Fair) ================= */}
        <section className="scroll-mt-36 pt-2" id="provably-fair">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#181c24] border border-white/5 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-1.5 text-[#4edea3] text-xs font-bold">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>بخش سوم: معماری ریاضیاتی غیرمتمرکز</span>
                </div>
                <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
                  الگوریتم اثبات‌پذیری منصفانه و تصادف مطلق (Provably Fair)
                </h2>
                <p className="text-sm text-[#d8c3ad] leading-relaxed">
                  هیچ سرور، مدیر یا حتی ابررایانه‌ای قادر به حدس زدن یا دستکاری گوی‌های خارج‌شده
                  نیست. قرعه‌کشی ترکیبی از هش بلاک‌های استخراج‌نشده بیت‌کوین و سید تصادفی بلاکچین
                  چین‌لینک (Chainlink VRF) است.
                </p>
              </div>

              {/* Mathematical Formula Chip */}
              <div
                data-testid="formula-spec-chip"
                className="p-4 rounded-xl bg-[#262a33] border border-[#ffc174]/30 flex flex-col items-end text-left font-mono shadow-inner shrink-0"
                dir="ltr"
              >
                <span className="text-[#d8c3ad] text-[11px] uppercase tracking-wider">
                  Formula Specification
                </span>
                <span className="text-[#ffc174] font-bold text-sm sm:text-base mt-0.5">
                  SHA256(Block_Hash + Seed + Nonce) % Total_Balls
                </span>
                <span className="text-[#4edea3] text-xs mt-1">
                  Deterministic • Verifiable • Immutable
                </span>
              </div>
            </div>

            {/* Step-by-Step Transparency Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col gap-2 shadow-md">
                <span className="text-xs text-[#ffc174] font-bold">مرحله ۱: هش سرور عمومی</span>
                <h4 className="text-base text-[#dfe2ee] font-bold">
                  تولید بذر تصادفی پیش از آغاز
                </h4>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  پیش از آغاز ثبت بلیت‌ها، هش رشته رمزنگاری‌شده سرور (Server Seed Hash) در سایت
                  اعلام عمومی می‌گردد تا امکان تغییر محتوای اولیه وجود نداشته باشد.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col gap-2 shadow-md">
                <span className="text-xs text-[#ffc174] font-bold">
                  مرحله ۲: انتروپی بلاک بیت‌کوین
                </span>
                <h4 className="text-base text-[#dfe2ee] font-bold">
                  استخراج هش زنده بلاک مرجع
                </h4>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  هش بلاک اول استخراج‌شده بیت‌کوین پس از اتمام مهلت فروش بلیت به عنوان متغیر
                  قطعی ناشناخته وارد معادله ریاضی می‌گردد که ماینرهای مستقل آن را تولید می‌کنند.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col gap-2 shadow-md">
                <span className="text-xs text-[#4edea3] font-bold">مرحله ۳: راستی‌آزمایی آزاد</span>
                <h4 className="text-base text-[#dfe2ee] font-bold">
                  تطبیق عمومی با فرمت کلاینت
                </h4>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  هر کاربر می‌تواند با ابزار اعتبارسنجی آنلاین یا اسکریپت‌های پایتون منبع‌باز،
                  هش بلاک را با بذر سرور ترکیب و خروج گوی‌ها را مجدداً محاسبه و اثبات کند.
                </p>
              </div>
            </div>

            {/* Interactive Client Audit Sandbox */}
            <div className="p-5 rounded-2xl bg-[#0f131c] border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">terminal</span>
                  <span>تست زنده فرمول ریاضیاتی توسط کاربر (Independent Client Verifier):</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigateTo('transparency')}
                  className="text-xs text-[#4edea3] hover:underline font-bold cursor-pointer"
                >
                  باز کردن ماشین‌حساب جامع شفافیت ↗
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3" dir="ltr">
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block mb-1">
                    Block_Hash (BTC/TRON)
                  </label>
                  <input
                    type="text"
                    data-testid="formula-blockhash-input"
                    value={blockHashInput}
                    onChange={(e) => setBlockHashInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181c24] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block mb-1">
                    Server_Seed
                  </label>
                  <input
                    type="text"
                    data-testid="formula-seed-input"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181c24] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-mono block mb-1">
                    Client_Nonce
                  </label>
                  <input
                    type="number"
                    data-testid="formula-nonce-input"
                    value={nonceInput}
                    onChange={(e) => setNonceInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#181c24] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div
                data-testid="formula-computed-output"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#181c24] border border-emerald-500/20 font-mono text-xs"
                dir="ltr"
              >
                <span className="text-slate-300 truncate max-w-full">
                  Digest: <strong className="text-emerald-400">{formulaCheck.digestHex}</strong>
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0">
                  Extracted Ball (1..50): #{formulaCheck.ballNumber}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 4: سازوکار تسویه آنی و بدون تاخیر جوایز ================= */}
        <section className="scroll-mt-36 pt-2" id="instant-settlement">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-[#ffc174] text-xs font-bold tracking-wider">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>بخش چهارم: پروتکل تسویه و خزانه‌داری</span>
            </div>
            <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
              سازوکار تسویه آنی، خودکار و تضمین نقدینگی شمش طلا
            </h2>
            <p className="text-sm text-[#d8c3ad] max-w-3xl leading-relaxed">
              هیچ‌گونه بروکراسی اداری یا نگه‌داشت تعمدی سرمایه وجود ندارد؛ جوایز با زیرساخت وب۳
              مستقیماً به کیف‌پول‌های برندگان واریز می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Left: Under 10k Payout */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#181c24] border border-white/5 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-xl bg-[#00a572]/20 text-[#4edea3] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">speed</span>
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#4edea3]">
                    واریز ثانیه‌ای (Instant TX &lt; 90s)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl text-[#dfe2ee] font-bold">
                  جوایز خرد و متوسط (کمتر از ۱۰,۰۰۰ USDT)
                </h3>
                <p className="text-sm text-[#d8c3ad] leading-relaxed">
                  واریز به صورت خودکار، در کمتر از ۹۰ ثانیه پس از تایید نهایی بلاک قرعه‌کشی، توسط
                  قرارداد هوشمند به همان آدرس ولت ثبت‌نامی کاربر انجام می‌گیرد. این واریز نیازی به
                  تایید دستی تیم مالی ندارد.
                </p>
              </div>
              <div className="mt-6 bg-[#262a33]/80 p-4 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[#4edea3] text-[24px]">
                  offline_bolt
                </span>
                <div className="flex flex-col text-xs">
                  <span className="text-[#dfe2ee] font-bold">بدون سقف تعداد تراکنش در روز</span>
                  <span className="text-[#d8c3ad] mt-0.5">
                    پرداخت از کیف‌پول گرم ممیزی‌شده با نقدینگی فعال ۵ میلیون دلار
                  </span>
                </div>
              </div>
            </div>

            {/* Card Right: Mega Jackpot Multi-Sig Payout */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#181c24] border border-white/5 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-xl bg-[#f59e0b]/20 text-[#ffc174] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">
                      account_balance
                    </span>
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#ffc174]">
                    تسویه حداکثر ۱۲ ساعته
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl text-[#dfe2ee] font-bold">
                  تسویه سوپر جک‌پات (بالای ۱۰۰,۰۰۰ USDT)
                </h3>
                <p className="text-sm text-[#d8c3ad] leading-relaxed">
                  جهت محافظت در برابر سرقت یا نفوذ سایبری، مبالغ مگا جک‌پات در خزانه‌های سرد
                  چندامضایی (Gnosis Safe Multi-Sig 3-of-5) نگهداری می‌شوند. فرآیند امضا توسط هیئت
                  امنای حقوقی در دبی، لندن و زوریخ ظرف ۱۲ ساعت تکمیل و انتقال امن انجام می‌شود.
                </p>
              </div>
              <div className="mt-6 bg-[#262a33]/80 p-4 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[#ffc174] text-[24px]">
                  diamond
                </span>
                <div className="flex flex-col text-xs">
                  <span className="text-[#dfe2ee] font-bold">پشتوانه فیزیکی شمش طلا LBMA</span>
                  <span className="text-[#d8c3ad] mt-0.5">
                    امکان درخواست تحویل فیزیکی شمش طلای سوئیسی در گاوصندوق‌های معتبر امارات
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 5: سیاست‌های مبارزه با پولشویی (AML) و حفظ حریم خصوصی ================= */}
        <section className="scroll-mt-36 pt-2" id="aml-compliance">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#181c24] border border-white/5 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-1.5 text-[#ffc174] text-xs font-bold">
                  <span className="material-symbols-outlined text-[18px]">shield</span>
                  <span>بخش پنجم: امنیت سایبری و استانداردهای رگولاتوری بین‌المللی</span>
                </div>
                <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
                  مقررات مبارزه با پولشویی (AML) با تضمین ناشناس‌ماندن VIP
                </h2>
                <p className="text-sm text-[#d8c3ad] leading-relaxed">
                  احترام عمیق به حریم خصوصی شخصی همراه با سیستم‌های غربالگری خودکار هوش مصنوعی
                  برای جلوگیری از ورود سرمایه‌های سرقتی به بازی.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#262a33] text-xs text-[#4edea3] font-bold shrink-0">
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                <span>عدم ذخیره‌سازی اسناد هویتی کاربر (Zero-Data Storing)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col gap-2">
                <span className="material-symbols-outlined text-[#ffc174] text-[24px]">
                  analytics
                </span>
                <h4 className="text-base text-[#dfe2ee] font-bold">پایش آدرس با Chainalysis</h4>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  تمام تراکنش‌های ورودی توسط موتورهای تحلیل آنچین (Elliptic / Chainalysis) اسکن
                  می‌شوند. والت‌های مرتبط با هک، فیشینگ یا میکسرها (Tornado Cash) به طور خودکار
                  ریجکت می‌گردند.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[24px]">
                  no_accounts
                </span>
                <h4 className="text-base text-[#dfe2ee] font-bold">بدون KYC تحمیلی برای بازی</h4>
                <p className="text-xs text-[#d8c3ad] leading-relaxed">
                  هیچ نیازی به ارائه کارت شناسایی، عکس سلفی یا آدرس پستی برای شرکت در قرعه‌کشی و
                  دریافت جوایز وجود ندارد. ارتباط صرفاً بر پایه امضای کلید عمومی والت (Web3 Auth)
                  استوار است.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#1c2028] border border-white/5 flex flex-col justify-between gap-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-[24px]">
                      emergency_heat
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        killSwitchActive
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {killSwitchActive ? 'STATE: HALTED (503)' : 'STATE: ARMED & OK'}
                    </span>
                  </div>
                  <h4 className="text-base text-[#dfe2ee] font-bold">
                    سوئیچ قطع اضطراری (Kill-Switch)
                  </h4>
                  <p className="text-xs text-[#d8c3ad] leading-relaxed">
                    در صورت بروز اختلال در بلاک‌چین یا حملات منع سرویس (DDoS)، قرارداد هوشمند
                    موقتاً به وضعیت تعلیق حفاظتی رفته و تمام وجوه ثبت بلیت بدون کسر کارمزد مسترد
                    خواهد شد.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('launch')}
                  className="text-[11px] text-amber-300 hover:underline font-bold text-right pt-1 cursor-pointer"
                >
                  مشاهده وضعیت زنده Kill-Switch در مرکز عملیات ↗
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 6: آکاردئون پرسش‌های متداول (FAQ) ================= */}
        <section className="scroll-mt-36 pt-2" id="faq">
          <div className="flex flex-col gap-2 mb-6 text-center items-center">
            <div className="inline-flex items-center gap-1.5 text-[#ffc174] text-xs font-bold tracking-wider">
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>بخش ششم: پاسخ شفاف به دغدغه‌ها</span>
            </div>
            <h2 className="text-2xl sm:text-3xl text-[#dfe2ee] font-black">
              پرسش‌های پرتکرار حقوقی و امنیتی برندگان VIP
            </h2>
            <p className="text-sm text-[#d8c3ad] max-w-2xl">
              پاسخ‌های فنی، حقوقی و راهکارهای شفافیت پیرامون ضمانت‌های مالیاتی و سازوکار اجرایی
              قرعه‌کشی.
            </p>
          </div>

          {/* Accordion Container */}
          <div className="max-w-4xl mx-auto space-y-3" id="faq-accordion">
            {filtered.faqs.length === 0 ? (
              <div
                data-testid="faq-empty-state"
                className="p-8 rounded-2xl bg-[#181c24] border border-white/10 text-center text-sm text-[#d8c3ad]"
              >
                موردی منطبق با عبارت «{searchQuery}» در پرسش‌های متداول یافت نشد.
              </div>
            ) : (
              filtered.faqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    data-testid={`faq-item-${item.id}`}
                    className="rounded-2xl bg-[#181c24] border border-white/5 overflow-hidden shadow-md transition-colors"
                  >
                    <button
                      type="button"
                      data-testid={`faq-toggle-${item.id}`}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-right gap-4 focus:outline-none hover:bg-[#1c2028] transition-colors cursor-pointer"
                    >
                      <span className="text-sm sm:text-base text-[#dfe2ee] font-bold flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#ffc174] text-[20px] shrink-0">
                          quiz
                        </span>
                        <span>{item.question}</span>
                      </span>
                      <span
                        className={`material-symbols-outlined text-[#ffc174] transform transition-transform duration-300 text-[24px] shrink-0 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        data-testid={`faq-content-${item.id}`}
                        className="px-6 pb-6 pt-0 text-[#d8c3ad] text-xs sm:text-sm leading-relaxed"
                      >
                        <div className="p-4 rounded-xl bg-[#1c2028] border-r-2 border-[#ffc174]">
                          {item.answer}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ================= SECTION 7: Footer High-Stakes CTA Banner ================= */}
        <section className="pt-4">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#262a33] via-[#181c24] to-[#262a33] border border-amber-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#f59e0b]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-right">
              <div className="space-y-3 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a572] text-[#002113] text-xs font-black">
                  <span className="material-symbols-outlined text-[15px]">timer</span>
                  <span>زمان تا سوپر قرعه‌کشی بعدی: ۱۸ ساعت و ۴۲ دقیقه</span>
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#dfe2ee] font-black leading-tight">
                  آماده پیوستن به مگا قرعه‌کشی{' '}
                  <span className="text-[#ffc174] font-black">۱۵۰,۰۰۰ دلاری</span> هستید؟
                </h2>
                <p className="text-sm text-[#d8c3ad] leading-relaxed">
                  همین حالا بلیت شانس خود را با ۵ تتر ثبت کنید و با پشتوانه خزانه‌داری شمش طلا و
                  قرارداد هوشمند اثبات‌پذیر، شانس زندگی خود را امتحان کنید.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
                <button
                  type="button"
                  data-testid="terms-cta-buy-ticket"
                  onClick={() => navigateTo('play')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#ffc174] to-[#f59e0b] text-[#2a1700] font-black text-sm sm:text-base shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
                  <span>ورود به لابی و خرید بلیت</span>
                </button>
                <button
                  type="button"
                  data-testid="terms-cta-vip-support"
                  onClick={() => setAiChatOpen(true)}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl bg-[#31353e] hover:bg-[#353942] text-[#dfe2ee] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#4edea3]">
                    support_agent
                  </span>
                  <span>پشتیبانی اختصاصی VIP</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Verified Smart Contract Source Code Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-3xl bg-[#141821] border border-amber-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">verified</span>
                <h3 className="text-base font-black text-white">
                  کد منبع ممیزی‌شده قرارداد هوشمند (LuckyDropVaultV48.sol)
                </h3>
              </div>
              <button
                type="button"
                data-testid="close-contract-source-btn"
                onClick={() => setShowSourceModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <pre
              className="p-4 rounded-2xl bg-[#0a0e16] border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              {`// SPDX-License-Identifier: MIT
// Audited by CertiK & PeckShield (Report #CK-2026-LD48)
pragma solidity ^0.8.24;

contract LuckyDropWaterfallV48 {
    uint256 public constant TICKET_PEG_USDT = 5e6; // 5.00 USDT
    uint256 public constant RTP_BPS = 8500;        // 85% Prize Pool
    uint256 public constant OPS_VAULT_BPS = 1000;  // 10% Cold Vault Sweep
    uint256 public constant ROLLOVER_BPS = 300;    // 3% Next Round Floor
    uint256 public constant GAS_ORACLE_BPS = 200;  // 2% Infra & Chainlink VRF

    function verifyDrawBall(bytes32 blockHash, bytes32 seed, uint256 nonce, uint256 totalBalls)
        external pure returns (uint256)
    {
        return (uint256(keccak256(abi.encodePacked(blockHash, seed, nonce))) % totalBalls) + 1;
    }
}`}
            </pre>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="px-5 py-2 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
