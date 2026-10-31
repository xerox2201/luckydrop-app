import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Wallet,
  Trophy,
  ArrowLeft,
  Ticket,
  Lock,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import { tr } from '../utils/i18n';
import { HapticEngine } from '../utils/telegramTma';

export const HowItWorksView: React.FC = () => {
  const { lang, navigateTo } = useLottery();

  const steps = [
    {
      num: '01',
      icon: <Wallet className="w-5 h-5 text-[#0098EA]" />,
      titleFa: 'اتصال کیف پول TON یا شارژ با Telegram Stars',
      titleEn: '1. Connect TON Wallet or Top-Up with Telegram Stars',
      descFa:
        'در تب «کیف پول»، کیف پول غیرحضانتی خود (Tonkeeper، MyTonWallet، Tonhub) را با پروتکل TON Connect 2.0 متصل کنید یا با ستاره‌های تلگرام (XTR) حساب خود را شارژ نمایید.',
      descEn:
        'In the Wallet tab, connect your non-custodial wallet (Tonkeeper, MyTonWallet, Tonhub) via TON Connect 2.0 or top up instantly using Telegram Stars (XTR).',
    },
    {
      num: '02',
      icon: <Ticket className="w-5 h-5 text-[#FFE066]" />,
      titleFa: 'انتخاب دستی گوی‌ها یا خرید سریع هوشمند (Quick Pick)',
      titleEn: '2. Manual Ball Selection or Quantum Quick Pick',
      descFa:
        'در لابی می‌توانید با ۱ کلیک بلیت تصادفی بخرید یا روی دکمه «انتخاب دستی شماره‌ها» بزنید و ۵ گوی اصلی + ۱ گوی طلایی دلخواه خود را به همراه Client Seed اختصاصی ثبت کنید.',
      descEn:
        'Buy a Quick Pick slip with 1 tap in the Lobby, or open the Custom Ball Picker to choose your own 5 Main Balls + 1 Golden Ball and set a custom Client Seed.',
    },
    {
      num: '03',
      icon: <Trophy className="w-5 h-5 text-[#00F5D4]" />,
      titleFa: 'تقسیم خودکار استخر ۸۵٪ راس تایم (Pari-Mutuel)',
      titleEn: '3. Automated 85% Pari-Mutuel Pool Settlement',
      descFa:
        '۸۵٪ از کل مبالغ بلیت‌های فروخته‌شده مستقیماً در استخر جایزه قفل می‌شود (۱۲٪ کارمزد عملیاتی + ۳٪ ذخیره صندوقچه وفاداری). راس پایان تایمر، استخر جایزه به صورت خودکار بین برندگان تقسیم و به کیف پول آن‌ها واریز می‌گردد.',
      descEn:
        '85% of all ticket sales are locked directly into the prize pool (12% operational fee + 3% Loyalty Chest reserve). When the timer hits zero, prizes are automatically credited to winning accounts.',
    },
    {
      num: '04',
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      titleFa: 'الگوریتم ۵۲ بیتی Provably Fair (HMAC-SHA256)',
      titleEn: '4. 52-Bit HMAC-SHA256 Provably Fair Verification',
      descFa:
        'پیش از شروع هر دور، هش SHA-256 مربوط به Server Seed منتشر می‌شود. پس از قرعه‌کشی یا پایان بازی آنی، می‌توانید در صفحه «اثبات عدالت» صحت ریاضی تمام نتایج را مستقلاً بررسی کنید.',
      descEn:
        'Before every draw or instant game, the SHA-256 hash of the Server Seed is committed. Afterwards, you can verify the exact 52-bit HMAC-SHA256 math in the Provably Fair Verifier.',
    },
  ];

  return (
    <main className="w-full max-w-[440px] mx-auto px-3 pt-2 pb-24 space-y-3.5 select-none">
      {/* Sticky Back Header */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#110C22]/90 border border-white/10 backdrop-blur-xl">
        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            navigateTo('lobby');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {tr(lang, 'بازگشت به لابی', 'Back to Lobby')}
        </button>
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-[#00F5D4]" />
          <span className="text-xs font-black text-white">
            {tr(lang, 'راهنمای کامل LuckyDrop', 'How LuckyDrop Works')}
          </span>
        </div>
      </div>

      {/* Hero Card */}
      <section className="rounded-3xl p-4 bg-gradient-to-br from-[#16102C] via-[#0E091E] to-[#080512] border border-[#00F5D4]/25 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[10px] font-black text-[#00F5D4]">
          <Sparkles className="w-3 h-3" />
          {tr(lang, 'معماری بدون ریسک کسری بودجه (Zero-Loss)', 'Zero-Loss Web3 iLottery Architecture')}
        </div>
        <h1 className="text-base font-black text-white">
          {tr(
            lang,
            'چگونه در قرعه‌کشی و بازی‌های آنی TON برنده شویم؟',
            'How to Play & Win on LuckyDrop TON'
          )}
        </h1>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {tr(
            lang,
            'تمام قرعه‌کشی‌ها و ۹ بازی کازینویی آنی با نرخ بازگشت (RTP) استاندارد ۹۷٪ تا ۹۹٪ و تایید کریپتوگرافیک سمت سرور اجرا می‌شوند.',
            'All lottery draws and 9 instant games run on strict 97%–99% RTP server-authoritative cryptographic math.'
          )}
        </p>
      </section>

      {/* Steps */}
      <section className="space-y-2.5">
        {steps.map((s) => (
          <div
            key={s.num}
            className="p-3.5 rounded-2xl bg-[#110C22]/90 border border-white/10 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {s.icon}
                </div>
                <h2 className="text-xs font-black text-white">
                  {tr(lang, s.titleFa, s.titleEn)}
                </h2>
              </div>
              <span className="font-mono text-xs font-black text-white/30">{s.num}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tr(lang, s.descFa, s.descEn)}
            </p>
          </div>
        ))}
      </section>

      {/* Quick Action Footer */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => navigateTo('play')}
          className="py-3 rounded-2xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Ticket className="w-4 h-4" />
          {tr(lang, 'انتخاب دستی شماره‌ها', 'Custom Ball Picker')}
        </button>
        <button
          onClick={() => navigateTo('transparency')}
          className="py-3 rounded-2xl bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          {tr(lang, 'ماشین‌حساب اثبات عدالت', 'Fairness Verifier')}
        </button>
      </div>
    </main>
  );
};
