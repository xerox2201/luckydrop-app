import React, { useState, useEffect } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';

export const FooterAndChat: React.FC = () => {
  const { navigateTo, aiChatOpen, setAiChatOpen } = useLottery();
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ sender: 'AI' | 'USER'; text: string }[]>([
    {
      sender: 'AI',
      text: 'سلام! من پشتیبان هوشمند ۲۴ ساعته LuckyDrop هستم. هر سوالی درباره نحوه واریز تون‌کوین (TON) و Telegram Stars، الگوریتم اثبات‌پذیر منصفانه SHA-256 یا محاسبه ضریب برد دارید بپرسید.',
    },
  ]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setShowScrollTop(currentScrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = prompt.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { sender: 'USER', text: q }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          text:
            data.reply ||
            'پاسخ از سرور دریافت شد. تمام جوایز به صورت خودکار به کیف پول شخصی شما واریز می‌شوند.',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: 'در پلتفرم LuckyDrop، ۸۵٪ کل فروش بلیت در قالب استخر جوایز (RTP) به برندگان پرداخت شده و تمامی قرعه‌کشی‌ها با هش SHA-256 قابل راستی‌آزمایی هستند.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <footer className="mt-20 border-t border-white/10 bg-[#080b12] py-12 px-4 lg:px-8 text-xs text-slate-400">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gold-gradient-cta flex items-center justify-center text-[#2a1700] font-black">
                ★
              </div>
              <span className="text-base font-black text-white">LuckyDrop — Web3 TMA VIP</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              اولین پلتفرم قرعه‌کشی غیرمتمرکز Web3 با تسویه آنی روی شبکه‌های TRON و TON، بدون نیاز به احراز هویت (No-KYC) و تضمین بازگشت ۸۵٪ جوایز در قرارداد هوشمند.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-white text-sm mb-2">دسترسی سریع به بخش‌ها</h4>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={() => navigateTo('lobby')} className="hover:text-amber-400 cursor-pointer">
                  • لابی اصلی و جک‌پات ۱۵.۲ میلیاردی
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('play')} className="hover:text-amber-400 cursor-pointer">
                  • ترمینال انتخاب اعداد و خرید بلیط
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('status')} className="hover:text-amber-400 cursor-pointer">
                  • رهگیری زنده ممپول و تایید بلاکچین
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('transparency')} className="hover:text-amber-400 cursor-pointer">
                  • ماشین‌حساب احتمال دوجمله‌ای و شفافیت
                </button>
              </li>
              <li>
                <button
                  type="button"
                  data-testid="footer-link-terms"
                  onClick={() => navigateTo('terms')}
                  className="hover:text-amber-400 text-amber-300/90 font-semibold cursor-pointer"
                >
                  • قوانین رسمی، جدول جوایز و سوالات متداول (/terms)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-white text-sm mb-2">مینی‌گیم‌ها و راستی‌آزمایی Provably Fair</h4>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={() => navigateTo('mini-games')} className="hover:text-amber-400 cursor-pointer">
                  • بازی‌های آنی نقدی ۵۲ بیتی (/mini-games)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('transparency')} className="hover:text-amber-400 cursor-pointer">
                  • راستی‌آزمای مستقل HMAC-SHA256 (/transparency)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('my-tickets')} className="hover:text-amber-400 cursor-pointer">
                  • استعلام کوپن‌های فعال و برنده (/my-tickets)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateTo('status')} className="hover:text-amber-400 cursor-pointer">
                  • کاوشگر تراکنش‌ها و دفترکل PAM (/status)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-white text-sm">گواهی امنیت قرارداد هوشمند</h4>
            <div className="bg-[#111622] border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>CertiK &amp; PeckShield Verified v4.8</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Multi-Sig Solvency: 100% Backed on Tron &amp; TON
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © ۱۴۰۳ LuckyDrop Web3 Gaming. تمامی حقوق معنوی، قرعه‌کشی‌ها و مارک‌های تجاری محفوظ است.
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigateTo('terms')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              شرایط استفاده و قوانین رسمی VIP
            </button>
            <button
              type="button"
              onClick={() => navigateTo('terms')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              حریم خصوصی داده‌ها (Zero-KYC)
            </button>
            <button
              type="button"
              onClick={() => navigateTo('transparency')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              ممیزی ریاضیاتی Provably Fair
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Scroll-to-Top Button for Mobile & Desktop */}
      <button
        type="button"
        data-testid="scroll-to-top-btn"
        onClick={scrollToTop}
        aria-label="بازگشت به بالای صفحه"
        title="بازگشت به بالای صفحه"
        className={`fixed bottom-20 lg:bottom-5 left-4 lg:left-5 z-40 min-w-[44px] min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-[#181c24]/95 border border-amber-500/45 text-amber-300 hover:bg-amber-500 hover:text-[#241300] shadow-[0_12px_32px_rgba(0,0,0,0.75)] backdrop-blur-md flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
          showScrollTop && !aiChatOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-lg leading-none">keyboard_arrow_up</span>
        <span className="hidden sm:inline text-xs font-bold whitespace-nowrap">بالای صفحه</span>
      </button>

      {/* 24/7 Gemini Flash AI Concierge Drawer (Triggered via Top Bar, CTA, or Footer) */}
      {aiChatOpen && (
        <div className="fixed inset-x-4 bottom-20 md:inset-x-auto md:bottom-5 md:left-5 z-50">
          <div className="w-80 sm:w-96 rounded-3xl bg-[#121724] border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#1d2538] to-[#141926] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">smart_toy</span>
                <div>
                  <div className="text-xs font-black text-white">پشتیبان هوشمند ۲۴ ساعته VIP</div>
                  <div className="text-[10px] text-emerald-400">پاسخگویی آنی رمزارز و قوانین</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiChatOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-64 overflow-y-auto text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'USER'
                      ? 'bg-amber-500/20 border border-amber-500/35 text-amber-100 mr-6'
                      : 'bg-[#0a0e16] border border-white/10 text-slate-200 ml-6'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="text-[11px] text-amber-300 animate-pulse">
                  در حال پردازش پاسخ هوشمند...
                </div>
              )}
            </div>

            <form onSubmit={handleAskAi} className="p-3 border-t border-white/10 flex gap-2 bg-[#0c1018]">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="سوال خود را بنویسید..."
                className="flex-1 bg-[#151b28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-2 rounded-xl gold-gradient-cta text-[#2a1700] font-black text-xs cursor-pointer"
              >
                ارسال
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
