import React, { useState } from 'react';
import {
  ShieldCheck,
  Scale,
  Lock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { tr } from '../utils/i18n';

export const TermsRulesView: React.FC = () => {
  const { lang, navigateTo } = useLottery();
  const [activeSection, setActiveSection] = useState<'FAIRNESS' | 'FINANCE' | 'PRIVACY'>('FAIRNESS');

  return (
    <main className="w-full max-w-[440px] mx-auto px-3 pt-2 pb-24 space-y-3.5 select-none">
      {/* Sticky Back Header */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 backdrop-blur-xl">
        <button
          onClick={() => navigateTo('lobby')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr(lang, 'بازگشت به لابی', 'Back to Lobby')}
        </button>
        <div className="flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-[#FFE066]" />
          <span className="text-xs font-black text-white">
            {tr(lang, 'قوانین و مقررات LuckyDrop', 'Terms & Rules')}
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#FFD700]/25 space-y-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[10px] font-black text-[#00F5D4]">
          <ShieldCheck className="w-3 h-3" />
          {tr(lang, 'منشور شفافیت و عدالت ریاضی LuckyDrop', 'LuckyDrop Fair Play Charter')}
        </span>
        <h1 className="text-base font-black text-white">
          {tr(
            lang,
            'قوانین رسمی قرعه‌کشی و بازی‌های آنی TON',
            'Official Rules, Payout Policy & RNG Audit'
          )}
        </h1>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {tr(
            lang,
            'تمامی دورهای قرعه‌کشی و ۹ بازی آنی بر پایه الگوریتم ۵۲ بیتی HMAC-SHA256 در سمت سرور و دفترکل اتمی PAM اجرا می‌شوند.',
            'All lottery draws and 9 instant games execute on 52-bit server-authoritative HMAC-SHA256 RNG and atomic PAM wallet accounting.'
          )}
        </p>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {(['FAIRNESS', 'FINANCE', 'PRIVACY'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                activeSection === sec
                  ? 'bg-[#FFE066] text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {sec === 'FAIRNESS' && tr(lang, 'عدالت ریاضی', 'Fairness')}
              {sec === 'FINANCE' && tr(lang, 'مالی و جوایز', 'Payouts')}
              {sec === 'PRIVACY' && tr(lang, 'امنیت حساب', 'Security')}
            </button>
          ))}
        </div>
      </section>

      {activeSection === 'FAIRNESS' && (
        <section className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#00F5D4]">
              <Lock className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۱. اثبات عدالت ۵۲ بیتی (Provably Fair HMAC-SHA256)',
                  '1. 52-Bit HMAC-SHA256 Provably Fair RNG'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'پیش از شروع هر دور، هش SHA-256 مربوط به Server Seed قفل می‌شود. ترکیب Server Seed و Client Seed شما نتیجه دقیق را بدون امکان دستکاری تعیین می‌کند.',
                'Before every draw or game round, the SHA-256 hash of the Server Seed is committed. Combining Server Seed + your Client Seed + Nonce deterministically produces the outcome.'
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#FFE066]">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۲. نرخ بازگشت به بازیکن (RTP 97%–99%)',
                  '2. Verified 97%–99% Return to Player (RTP)'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'در بازی‌های آنی (Plinko، Crash، Dice، Mines، Wheel، Tower، Hi-Lo، CoinFlip، Scratch)، نرخ بازگشت ریاضی بین ۹۷.۵٪ تا ۹۹.۰٪ قفل شده است.',
                'Across all 9 Instant Mini-Games (Plinko, Crash, Dice, Mines, Wheel, Tower, Hi-Lo, CoinFlip, Scratch), mathematical RTP is locked strictly between 97.5% and 99.0%.'
              )}
            </p>
          </div>
        </section>
      )}

      {activeSection === 'FINANCE' && (
        <section className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#FFE066]">
              <Coins className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۱. تقسیم استخر جوایز ۸۵٪ (Pari-Mutuel Pool)',
                  '1. 85% Pari-Mutuel Lottery Pool Distribution'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'از کل فروش بلیت هر دور، دقیقاً ۸۵٪ در استخر جوایز برندگان قرار می‌گیرد، ۱۲٪ سهم عملیاتی پلتفرم (شامل ۲٪ پورسانت معرف) و ۳٪ ذخیره صندوقچه وفاداری طلایی است.',
                '85% of gross ticket sales in every round are allocated directly to the winning prize pool, 12% covers platform operations (including 2% affiliate revshare), and 3% funds the VIP Loyalty Chest.'
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#00F5D4]">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۲. واریز و برداشت آن‌چین TON و Telegram Stars',
                  '2. On-Chain TON & Telegram Stars Settlement'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'تمامی واریزهای TON به صورت آن‌چین در شبکه تون تایید می‌شوند و در برابر حملات تکرار (Anti-Replay 409) محافظت شده‌اند.',
                'All TON deposits are verified on-chain against the official treasury address and protected with persistent anti-replay idempotency.'
              )}
            </p>
          </div>
        </section>
      )}

      {activeSection === 'PRIVACY' && (
        <section className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۱. ایزولاسیون کامل حساب‌های تلگرام',
                  '1. Strict Per-User Telegram Account Isolation'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'هر حساب کاربری بر اساس امضای رسمی X-Telegram-Init-Data تفکیک شده و دارای قفل اتمی تراکنش (Per-User Mutex Lock) است.',
                'Every account is strictly partitioned by verified X-Telegram-Init-Data signature and protected by a per-user atomic mutex lock.'
              )}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  '۲. قانون ضدتقلب زیرمجموعه‌گیری (Anti-Sybil)',
                  '2. Anti-Sybil Referral Protection'
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(
                lang,
                'ثبت کد معرف خود (Self-Referral) یا تغییر کد معرف پس از ثبت اولیه توسط سرور مسدود می‌شود.',
                'Self-referrals and retroactive referral modifications are strictly blocked by server-side anti-Sybil validation.'
              )}
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => navigateTo('transparency')}
          className="py-2.5 rounded-xl bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          {tr(lang, 'اثبات عدالت', 'Fairness Verifier')}
        </button>
        <button
          onClick={() => navigateTo('how-it-works')}
          className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#FFE066]" />
          {tr(lang, 'راهنمای بازی', 'How It Works')}
        </button>
      </div>
    </main>
  );
};
