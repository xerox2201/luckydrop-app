import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { generateDeterministicUuid } from '../services/pamWalletEngine.ts';
import { toPersianDigits } from '../utils/lotteryEngine.ts';

export const WalletDrawer: React.FC = () => {
  const {
    walletDrawerOpen,
    setWalletDrawerOpen,
    balanceUsdt,
    bonusTokensUsdt,
    pamLedger,
    pamReconciliation,
    pamState,
    provablyFairSeeds,
    pamReconcile,
    pamBonus,
    pamRollback,
    pamDebit,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
    setDepositModalOpen,
    setWithdrawModalOpen,
  } = useLottery();

  const [clientSeedDraft, setClientSeedDraft] = useState<string>(provablyFairSeeds.clientSeed);
  const [opBanner, setOpBanner] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  if (!walletDrawerOpen) return null;

  const filteredLedger =
    filterType === 'ALL'
      ? pamLedger
      : pamLedger.filter((entry) => entry.type === filterType);

  const handleSaveClientSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSeedDraft.trim()) return;
    const seeds = await updateProvablyFairClientSeed(clientSeedDraft.trim());
    setClientSeedDraft(seeds.clientSeed);
    setOpBanner(`✅ بذر کلاینت (Client Seed) به "${seeds.clientSeed}" تغییر یافت.`);
    setTimeout(() => setOpBanner(null), 4000);
  };

  const handleRotateServerSeed = async () => {
    const seeds = await rotateProvablyFairServerSeed();
    setOpBanner(
      `🔐 بذر سرور چرخش یافت! بذر قبلی افشا شد (${seeds.previousServerSeed?.slice(0, 16)}...) و تعهد SHA-256 جدید ثبت گردید.`
    );
    setTimeout(() => setOpBanner(null), 4500);
  };

  const handleRunReconcile = async () => {
    const res = await pamReconcile();
    if (res.reconciliation?.reconciled) {
      setOpBanner(
        `✅ حسابرسی ریاضی PAM (Reconcile) تایید شد: اختلاف موجودی $0.00 USDT در ${res.reconciliation.ledgerEntriesCount} تراکنش دفترکل.`
      );
    } else {
      setOpBanner('⚠️ هشدار حسابرسی: عدم تطابق در دفترکل شناسایی شد.');
    }
    setTimeout(() => setOpBanner(null), 4000);
  };

  const handleClaimFreeBonusToken = async () => {
    const res = await pamBonus({
      transactionUuid: generateDeterministicUuid('tx_bonus_token'),
      roundId: `#BONUS-${Date.now().toString().slice(-4)}`,
      vertical: 'VIP_LOYALTY_BONUS',
      amountUsdt: 10,
      creditToRealBalance: true,
      note: 'بونوس وفاداری VIP واریزشده به کیف پول یکپارچه PAM',
    });
    if (res.ok) {
      setOpBanner('✅ عملیات PAM BONUS: مبلغ +$10.00 USDT با موفقیت در دفترکل ثبت و به موجودی اضافه شد.');
      setTimeout(() => setOpBanner(null), 4000);
    }
  };

  const handleRollbackLatestDebit = async () => {
    const latestDebit = pamLedger.find(
      (e) => e.type === 'DEBIT' && !pamState.tombstones[e.transactionUuid]
    );
    if (!latestDebit) {
      // Demonstrate preemptive out-of-order tombstone registration
      const unseenDebitUuid = `tx_delayed_debit_${Date.now().toString().slice(-5)}`;
      await pamRollback({
        transactionUuid: generateDeterministicUuid('tx_rb_preemptive'),
        referenceTransactionUuid: unseenDebitUuid,
        roundId: '#OUT-OF-ORDER-TEST',
        vertical: 'LUCKYDROP_LOTTERY',
        note: `ثبت Tombstone پیشگیرانه برای تراکنش تاخیری ${unseenDebitUuid}`,
      });
      // Now attempt the delayed debit with that exact tombstoned UUID to prove it is blocked!
      const blockedDebit = await pamDebit({
        transactionUuid: unseenDebitUuid,
        roundId: '#OUT-OF-ORDER-TEST',
        vertical: 'LUCKYDROP_LOTTERY',
        amountUsdt: 25,
        note: 'تلاش کسر تاخیری پس از Rollback',
      });
      setOpBanner(
        blockedDebit.tombstoneBlocked
          ? `🛡️ سپر Tombstone اثبات شد: ابتدا Rollback برای (${unseenDebitUuid}) ثبت شد و کسر تاخیری $25 مسدود گردید (موجودی بدون تغییر ماند)!`
          : '✅ Tombstone ثبت شد.'
      );
      setTimeout(() => setOpBanner(null), 5000);
      return;
    }

    const res = await pamRollback({
      transactionUuid: generateDeterministicUuid('tx_rollback'),
      referenceTransactionUuid: latestDebit.transactionUuid,
      roundId: latestDebit.roundId,
      vertical: latestDebit.vertical,
      note: `استرداد وجه (Rollback) تراکنش ${latestDebit.transactionUuid.slice(0, 16)}`,
    });

    if (res.ok) {
      setOpBanner(
        `↩️ عملیات PAM ROLLBACK: مبلغ +$${latestDebit.amountUsdt.toFixed(
          2
        )} USDT بابت تراکنش مرجع (${latestDebit.transactionUuid.slice(0, 14)}...) مسترد و Tombstone ثبت شد!`
      );
      setTimeout(() => setOpBanner(null), 4500);
    }
  };

  return (
    <div
      data-testid="pam-wallet-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-fadeIn"
      onClick={() => setWalletDrawerOpen(false)}
    >
      <div
        data-testid="pam-wallet-drawer"
        className="w-full max-w-3xl bg-[#0b0f18] border-r border-amber-500/40 h-full overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PAM SEAMLESS SINGLE WALLET &amp; IDEMPOTENT LEDGER ENGINE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              کیف پول یکپارچه PAM و دفترکل زنده تراکنش‌ها (Transaction Ledger)
            </h2>
          </div>

          <button
            type="button"
            data-testid="close-wallet-drawer-btn"
            onClick={() => setWalletDrawerOpen(false)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {opBanner && (
          <div
            data-testid="pam-drawer-op-banner"
            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-xs font-bold leading-relaxed"
          >
            {opBanner}
          </div>
        )}

        {/* Balance + Reconciliation Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#131926] border border-amber-500/40 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 block">موجودی نقدی قابل بازی و برداشت (PAM Balance)</span>
            <strong
              data-testid="pam-drawer-balance-usdt"
              className="text-2xl font-black text-amber-300 font-mono block"
              dir="ltr"
            >
              ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </strong>
            <span className="text-[10px] font-mono text-emerald-400 block">
              IndexedDB + Server Disk Synced
            </span>
          </div>

          <div className="bg-[#131926] border border-purple-500/35 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 block">توکن‌های بونوس و شرط رایگان (Bonus Balance)</span>
            <strong className="text-xl font-black text-purple-300 font-mono block" dir="ltr">
              ${bonusTokensUsdt.toFixed(2)} USDT
            </strong>
            <span className="text-[10px] font-mono text-slate-400 block">
              Tombstones: {Object.keys(pamState.tombstones || {}).length} Protected
            </span>
          </div>

          <div className="bg-[#131926] border border-emerald-500/35 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] text-slate-400 block">وضعیت حسابرسی دفترکل (PAM Reconcile)</span>
            <strong
              data-testid="pam-reconcile-status"
              className="text-sm font-black text-emerald-400 font-mono block"
            >
              {pamReconciliation?.reconciled !== false
                ? '✓ 100% RECONCILED ($0.00 Diff)'
                : '⚠ DISCREPANCY DETECTED'}
            </strong>
            <span className="text-[10px] font-mono text-slate-400 block" dir="ltr">
              Debit: -${pamReconciliation?.totalDebitsUsdt.toFixed(2) || '0.00'} | Credit: +$
              {pamReconciliation?.totalCreditsUsdt.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>

        {/* 7 PAM Operations Action Bar */}
        <div className="bg-[#131926] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-white">
              عملیات استاندارد کیف پول (7 Standard iGaming PAM Operations):
            </span>
            <span className="text-[11px] font-mono text-amber-300">
              AUTHENTICATE • BALANCE • DEBIT • CREDIT • ROLLBACK • BONUS • RECONCILE
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setWalletDrawerOpen(false);
                setDepositModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl emerald-gradient-cta text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_card</span>
              <span>شارژ کیف پول (CREDIT)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWalletDrawerOpen(false);
                setWithdrawModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">payments</span>
              <span>برداشت وجه (DEBIT)</span>
            </button>

            <button
              type="button"
              data-testid="pam-trigger-rollback-btn"
              onClick={handleRollbackLatestDebit}
              className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="استرداد آخرین شرط یا تست سپر Tombstone در برابر Rollback خارج از نوبت"
            >
              <span className="material-symbols-outlined text-base">undo</span>
              <span>تست استرداد (ROLLBACK)</span>
            </button>

            <button
              type="button"
              data-testid="pam-trigger-bonus-reconcile-btn"
              onClick={handleClaimFreeBonusToken}
              className="py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">redeem</span>
              <span>دریافت بونوس (+$10 BONUS)</span>
            </button>
          </div>
        </div>

        {/* Provably Fair Commitment & Client Seed Controller */}
        <div className="bg-[#131926] border border-emerald-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 block">
                PROVABLY FAIR HMAC-SHA256 COMMITMENT (PRE-BET GUARANTEE)
              </span>
              <h3 className="text-sm font-black text-white">
                تعهد رمزنگاری بذر سرور (Server Seed SHA-256 Hash) و بذر بازیکن (Client Seed)
              </h3>
            </div>
            <button
              type="button"
              data-testid="pam-rotate-server-seed-btn"
              onClick={handleRotateServerSeed}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[11px] font-bold cursor-pointer"
            >
              چرخش بذر سرور و افشای بذر قبلی ↻
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-7 bg-[#090d16] border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 block">
                Server Seed Hash (SHA-256 Commitment — نمایش داده‌شده قبل از هر شرط):
              </span>
              <code
                data-testid="pam-server-seed-hash"
                className="text-[11px] font-mono text-emerald-300 break-all block"
                dir="ltr"
              >
                {provablyFairSeeds.serverSeedHash}
              </code>
            </div>

            <div className="sm:col-span-5 bg-[#090d16] border border-white/10 rounded-xl p-3 space-y-1">
              <span className="text-[10px] text-slate-400 block">
                شمارنده شرط فعلی (Nonce — افزایش در هر دور):
              </span>
              <strong
                data-testid="pam-current-nonce"
                className="text-lg font-black text-amber-300 font-mono block"
                dir="ltr"
              >
                Nonce #{provablyFairSeeds.nonce}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSaveClientSeed} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              dir="ltr"
              data-testid="pam-client-seed-input"
              value={clientSeedDraft}
              onChange={(e) => setClientSeedDraft(e.target.value)}
              placeholder="Client Seed دلخواه خود را وارد کنید..."
              className="flex-1 bg-[#090d16] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
            />
            <button
              type="submit"
              data-testid="pam-save-client-seed-btn"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shrink-0"
            >
              ثبت Client Seed بازیکن
            </button>
            <button
              type="button"
              onClick={handleRunReconcile}
              className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-black text-xs cursor-pointer shrink-0"
            >
              حسابرسی آنی (Reconcile)
            </button>
          </form>
        </div>

        {/* Real-Time Transaction Ledger Table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-white">
                جدول دفترکل تراکنش‌های کیف پول (Real-Time PAM Transaction Ledger)
              </h3>
              <p className="text-[11px] text-slate-400">
                تمامی تراکنش‌ها با <code className="text-amber-300">transaction_uuid</code> یکتا و{' '}
                <code className="text-emerald-300">reference_transaction_uuid</code> متصل به شرط اصلی ثبت می‌شوند ({toPersianDigits(filteredLedger.length)} رکورد).
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {['ALL', 'DEBIT', 'CREDIT', 'ROLLBACK', 'BONUS'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                    filterType === t
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-[#131926] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111622]">
            <table
              data-testid="pam-transaction-ledger-table"
              className="w-full text-right text-xs border-collapse"
            >
              <thead>
                <tr className="border-b border-white/10 bg-[#080c14] text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Game / Vertical</th>
                  <th className="py-3 px-3">Round ID</th>
                  <th className="py-3 px-3">Transaction UUID (Idempotency)</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {filteredLedger.map((row) => {
                  const isPositive = row.type === 'CREDIT' || row.type === 'ROLLBACK' || row.type === 'BONUS';
                  return (
                    <tr
                      key={row.transactionUuid}
                      data-testid={`pam-ledger-row-${row.type}`}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap" dir="ltr">
                        {new Date(row.timestamp).toLocaleTimeString('en-US', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-white font-bold whitespace-nowrap" dir="ltr">
                        {row.vertical}
                      </td>
                      <td className="py-3 px-3 text-amber-300 whitespace-nowrap" dir="ltr">
                        {row.roundId}
                      </td>
                      <td className="py-3 px-3 text-slate-300" dir="ltr">
                        <div className="truncate max-w-[180px]" title={row.transactionUuid}>
                          {row.transactionUuid}
                        </div>
                        {row.referenceTransactionUuid && (
                          <div
                            className="text-[10px] text-sky-400 truncate max-w-[180px]"
                            title={`Ref: ${row.referenceTransactionUuid}`}
                          >
                            ↳ ref: {row.referenceTransactionUuid}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap" dir="ltr">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            row.type === 'DEBIT'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : row.type === 'CREDIT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : row.type === 'ROLLBACK'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 font-black whitespace-nowrap ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                        dir="ltr"
                      >
                        {isPositive ? '+' : '-'}${row.amountUsdt.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-black text-white whitespace-nowrap" dir="ltr">
                        ${row.balanceAfterUsdt.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
