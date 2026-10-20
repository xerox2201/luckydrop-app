import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';

export const Decoy404View: React.FC = () => {
  const { navigateTo, tickets, transactions, setActiveTrackingTicket } = useLottery();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    message: string;
    detail?: string;
  } | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Check local state first, then backend /api/search
    const matchedTicket = tickets.find(
      (t) =>
        t.ticketCode.toLowerCase().includes(q.toLowerCase()) ||
        t.txHash.toLowerCase().includes(q.toLowerCase())
    );
    if (matchedTicket) {
      setSearchResult({
        found: true,
        message: `کوپن بلیط ${matchedTicket.ticketCode} در بلاکچین یافت شد! وضعیت: ${matchedTicket.status}`,
        detail: `اعداد: [${matchedTicket.mainNumbers}] + ★${matchedTicket.goldenBall} • TX: ${matchedTicket.txHash}`,
      });
      setActiveTrackingTicket(matchedTicket);
      return;
    }

    const matchedTx = transactions.find(
      (tx) =>
        tx.txHash.toLowerCase().includes(q.toLowerCase()) ||
        (tx.winnerName && tx.winnerName.includes(q))
    );
    if (matchedTx) {
      setSearchResult({
        found: true,
        message: `تراکنش بلاکچین در شبکه ${matchedTx.network} تایید شده است (${matchedTx.status})`,
        detail: `مبلغ: $${matchedTx.amountUsdt} USDT • بلاک: #${matchedTx.blockNumber}`,
      });
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tickets?.length > 0) {
          const t = data.tickets[0];
          setSearchResult({
            found: true,
            message: `کوپن بلیط ${t.ticketCode} در دیتابیس یافت شد (${t.status})`,
            detail: `اعداد: [${t.mainNumbers}] + ★${t.goldenBall}`,
          });
          return;
        }
        if (data.transactions?.length > 0) {
          const tx = data.transactions[0];
          setSearchResult({
            found: true,
            message: `تراکنش ${tx.txHash.slice(0, 14)}... تایید شد (${tx.status})`,
            detail: `شبکه: ${tx.network} • مبلغ: $${tx.amountUsdt} USDT`,
          });
          return;
        }
      }
    } catch {
      // Fallback below
    }

    setSearchResult({
      found: false,
      message: 'هیچ کوپن یا هش تراکنشی با این مشخصات در بلاکچین یافت نشد.',
      detail: 'لطفاً کد بلیط (مثلاً LD-98412-X) یا هش TXID را به درستی وارد نمایید.',
    });
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-12">
      <div className="rounded-[2.5rem] bg-gradient-to-b from-[#151b29] to-[#0c1018] border border-amber-500/30 p-8 sm:p-12 text-center space-y-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span data-testid="decoy-status-code">ERROR 404 // STATUS: LOST_IN_ORBIT</span>
        </div>

        {/* Animated Lucky Wheel Graphic */}
        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-500/40 animate-spin" style={{ animationDuration: '18s' }}></div>
          <div className="w-28 h-28 rounded-full gold-gradient-cta flex flex-col items-center justify-center text-[#2a1700] shadow-[0_0_40px_rgba(245,158,11,0.5)]">
            <span className="text-3xl font-black font-mono">404</span>
            <span className="text-[10px] font-black uppercase">DECOY NODE</span>
          </div>
        </div>

        <div className="space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            مسیر مورد نظر در مدار بلاکچین یافت نشد!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            صفحه‌ای که به دنبال آن هستید وجود ندارد یا دسترسی به آن نیازمند امضای رمزنگاری‌شده سخت‌افزاری است. در صورتی که قصد استعلام وضعیت کوپن بلیط یا هش تراکنش (TXID) خود را دارید، از سامانه جستجوی زیر استفاده کنید:
          </p>
        </div>

        {/* Built-in Transaction Hash & Ticket Code Lookup Bar */}
        <form onSubmit={handleLookup} className="max-w-2xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#090d14] border border-amber-500/35 rounded-2xl p-2">
            <input
              type="text"
              data-testid="decoy-lookup-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="کد بلیط (مثلاً LD-98412-X) یا هش تراکنش (TXID) را وارد کنید..."
              className="flex-1 bg-transparent px-4 py-3 text-xs sm:text-sm text-white font-mono focus:outline-none"
            />
            <button
              type="submit"
              data-testid="decoy-lookup-submit"
              className="gold-gradient-cta text-[#2a1700] font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-base">manage_search</span>
              <span>استعلام آنی از بلاکچین</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>نمونه کدهای فعال جهت تست سریع:</span>
            {['ZR-884920', 'TKT-9042X', 'TX-GLD-004291840'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setSearchQuery(sample)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-amber-300 font-mono"
              >
                {sample}
              </button>
            ))}
          </div>
        </form>

        {searchResult && (
          <div
            data-testid="decoy-lookup-result"
            className={`max-w-xl mx-auto p-4 rounded-2xl border text-right text-xs space-y-1.5 ${
              searchResult.found
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="font-black text-sm">{searchResult.message}</div>
            {searchResult.detail && (
              <div className="font-mono text-[11px] text-slate-300">{searchResult.detail}</div>
            )}
            {searchResult.found && (
              <button
                type="button"
                onClick={() => navigateTo('status')}
                className="mt-2 inline-block text-amber-300 underline font-bold"
              >
                مشاهده جزئیات کامل در پایپ‌لاین رهگیری بلاکچین ←
              </button>
            )}
          </div>
        )}

        {/* Quick Recovery Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigateTo('lobby')}
            className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">home</span>
            <span>بازگشت به لابی اصلی قرعه‌کشی</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('play')}
            className="px-6 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold text-xs transition-all"
          >
            ورود به ترمینال خرید بلیط
          </button>
        </div>
      </div>
    </div>
  );
};
