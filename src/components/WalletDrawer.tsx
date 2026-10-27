import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLottery } from '../context/LotteryContext.tsx';
import { generateDeterministicUuid } from '../services/pamWalletEngine.ts';
import { formatCurrency, usdtToTmaCurrency } from '../utils/telegramTma.ts';

export const WalletDrawer: React.FC = () => {
  const {
    walletDrawerOpen,
    setWalletDrawerOpen,
    activeTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
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
    navigateTo,
  } = useLottery();

  const [clientSeedDraft, setClientSeedDraft] = useState<string>(provablyFairSeeds.clientSeed);
  const [opBanner, setOpBanner] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedTxUuid, setCopiedTxUuid] = useState<string | null>(null);

  if (!walletDrawerOpen) return null;

  const filteredLedger =
    filterType === 'ALL'
      ? pamLedger
      : pamLedger.filter((entry) => entry.type === filterType);

  const handleCopyUuid = (uuid: string) => {
    navigator.clipboard?.writeText(uuid);
    setCopiedTxUuid(uuid);
    setTimeout(() => setCopiedTxUuid(null), 2000);
  };

  const handleSaveClientSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSeedDraft.trim()) return;
    const seeds = await updateProvablyFairClientSeed(clientSeedDraft.trim());
    setClientSeedDraft(seeds.clientSeed);
    setOpBanner(`✅ Client Seed به "${seeds.clientSeed}" تغییر یافت.`);
    setTimeout(() => setOpBanner(null), 4000);
  };

  const handleRotateServerSeed = async () => {
    const seeds = await rotateProvablyFairServerSeed();
    setOpBanner(
      `🔐 بذر سرور چرخش یافت (${seeds.previousServerSeed?.slice(0, 14)}...) و تعهد SHA-256 جدید ثبت شد.`
    );
    setTimeout(() => setOpBanner(null), 4500);
  };

  const handleRunReconcile = async () => {
    const res = await pamReconcile();
    if (res.reconciliation?.reconciled) {
      setOpBanner(
        `✅ حسابرسی ریاضی PAM تایید شد: اختلاف 0.00 TON در ${res.reconciliation.ledgerEntriesCount} تراکنش.`
      );
    } else {
      setOpBanner('⚠️ هشدار حسابرسی در دفترکل.');
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
      note: 'VIP Loyalty Bonus',
    });
    if (res.ok) {
      setOpBanner(`✅ عملیات PAM BONUS: +${formatCurrency(1.92, 'TON')} ثبت شد.`);
      setTimeout(() => setOpBanner(null), 4000);
    }
  };

  const handleRollbackLatestDebit = async () => {
    const latestDebit = pamLedger.find(
      (e) => e.type === 'DEBIT' && !pamState.tombstones[e.transactionUuid]
    );
    if (!latestDebit) {
      const unseenDebitUuid = `tx_delayed_debit_${Date.now().toString().slice(-5)}`;
      await pamRollback({
        transactionUuid: generateDeterministicUuid('tx_rb_preemptive'),
        referenceTransactionUuid: unseenDebitUuid,
        roundId: '#OUT-OF-ORDER-TEST',
        vertical: 'LUCKYDROP_LOTTERY',
        note: `Preemptive Tombstone ${unseenDebitUuid}`,
      });
      const blockedDebit = await pamDebit({
        transactionUuid: unseenDebitUuid,
        roundId: '#OUT-OF-ORDER-TEST',
        vertical: 'LUCKYDROP_LOTTERY',
        amountUsdt: 25,
        note: 'Delayed debit test',
      });
      setOpBanner(
        blockedDebit.tombstoneBlocked
          ? `🛡️ سپر Tombstone اثبات شد: کسر تاخیری مسدود گردید!`
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
      note: `Rollback ${latestDebit.transactionUuid.slice(0, 16)}`,
    });

    if (res.ok) {
      const rbConverted = usdtToTmaCurrency(
        latestDebit.amountUsdt,
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      setOpBanner(
        `↩️ عملیات PAM ROLLBACK: +${formatCurrency(rbConverted, activeTmaCurrency)} مسترد شد!`
      );
      setTimeout(() => setOpBanner(null), 4500);
    }
  };

  return (
    <div
      data-testid="pam-wallet-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center"
      onClick={() => setWalletDrawerOpen(false)}
    >
      <div
        data-testid="pam-wallet-drawer"
        className="w-full max-w-[440px] bg-[#070510] border-x border-purple-500/20 h-full overflow-y-auto p-4 flex flex-col gap-4 custom-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-wide text-white">
              دفترکل PAM (TON &amp; Stars)
            </h2>
            <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
              Idempotent Ledger &amp; Seeds
            </span>
          </div>
          <button
            type="button"
            data-testid="close-wallet-drawer-btn"
            onClick={() => setWalletDrawerOpen(false)}
            className="p-2 rounded-xl bg-purple-500/15 text-purple-200/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {opBanner && (
          <div
            data-testid="pam-drawer-op-banner"
            className="rounded-2xl bg-[#130d24]/90 border border-[#00f59b]/40 p-4 text-xs font-semibold text-[#00f59b]"
          >
            {opBanner}
          </div>
        )}

        {/* Balance Card */}
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center justify-between" dir="ltr">
            <span className="text-xs font-semibold text-purple-200/80">💎 TON Balance</span>
            <strong
              data-testid="pam-drawer-balance-usdt"
              className="text-base font-bold tracking-wide text-white tabular-nums"
            >
              {formatCurrency(tonBalance, 'TON')}
            </strong>
          </div>
          <div className="flex items-center justify-between" dir="ltr">
            <span className="text-xs font-semibold text-purple-200/80">⭐ Stars Balance</span>
            <strong className="text-base font-bold tracking-wide text-white tabular-nums">
              {formatCurrency(starsBalance, 'STARS')}
            </strong>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-purple-500/20" dir="ltr">
            <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
              Reconcile Status
            </span>
            <strong
              data-testid="pam-reconcile-status"
              className="text-xs font-semibold text-[#00f59b] tabular-nums"
            >
              {pamReconciliation?.reconciled !== false ? '✓ 100% RECONCILED' : '⚠ AUDIT'}
            </strong>
          </div>
        </div>

        {/* PAM Operations */}
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setWalletDrawerOpen(false);
              setDepositModalOpen(true);
            }}
            className="h-10 rounded-xl stake-emerald-cta text-xs font-semibold text-[#042416] cursor-pointer"
          >
            Deposit (CREDIT)
          </button>
          <button
            type="button"
            onClick={() => {
              setWalletDrawerOpen(false);
              navigateTo('wallet');
            }}
            className="h-10 rounded-xl gold-gradient-cta text-xs font-semibold text-[#1c1002] cursor-pointer"
          >
            Withdraw (DEBIT)
          </button>
          <button
            type="button"
            data-testid="pam-trigger-rollback-btn"
            onClick={handleRollbackLatestDebit}
            className="h-10 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
          >
            ROLLBACK
          </button>
          <button
            type="button"
            data-testid="pam-trigger-bonus-reconcile-btn"
            onClick={handleClaimFreeBonusToken}
            className="h-10 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
          >
            +1.92 TON BONUS
          </button>
        </div>

        {/* Provably Fair Seeds */}
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold tracking-wide text-white">
              Provably Fair Seeds
            </span>
            <span
              data-testid="pam-current-nonce"
              className="text-[11px] font-medium text-purple-300/50 tabular-nums"
              dir="ltr"
            >
              Nonce #{provablyFairSeeds.nonce}
            </span>
          </div>
          <code
            data-testid="pam-server-seed-hash"
            className="text-[11px] font-medium text-purple-300/50 tabular-nums break-all bg-[#070510] p-2.5 rounded-xl border border-purple-500/20"
            dir="ltr"
          >
            {provablyFairSeeds.serverSeedHash}
          </code>
          <form onSubmit={handleSaveClientSeed} className="flex gap-2" dir="ltr">
            <input
              type="text"
              data-testid="pam-client-seed-input"
              value={clientSeedDraft}
              onChange={(e) => setClientSeedDraft(e.target.value)}
              className="flex-1 h-9 rounded-xl bg-[#070510] border border-purple-500/25 px-2.5 text-xs font-semibold text-white"
            />
            <button
              type="submit"
              data-testid="pam-save-client-seed-btn"
              className="px-3 h-9 rounded-xl stake-emerald-cta text-xs font-semibold text-[#042416] cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              data-testid="pam-rotate-server-seed-btn"
              onClick={handleRotateServerSeed}
              className="px-3 h-9 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
            >
              Rotate
            </button>
          </form>
          <button
            type="button"
            onClick={handleRunReconcile}
            className="h-9 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
          >
            Reconcile Ledger
          </button>
        </div>

        {/* Ledger Table */}
        <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center justify-between" dir="ltr">
            {(['ALL', 'DEBIT', 'CREDIT', 'ROLLBACK', 'BONUS'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums cursor-pointer ${
                  filterType === t
                    ? 'bg-purple-600/35 text-white'
                    : 'text-purple-300/50 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table
              data-testid="pam-transaction-ledger-table"
              className="w-full text-left text-xs border-collapse"
              dir="ltr"
            >
              <thead>
                <tr className="border-b border-purple-500/20 text-[11px] font-medium text-purple-300/50 tabular-nums">
                  <th className="py-2 pr-2">Vertical / UUID</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10 tabular-nums">
                {filteredLedger.map((row) => {
                  const isPositive =
                    row.type === 'CREDIT' || row.type === 'ROLLBACK' || row.type === 'BONUS';
                  const convertedAmt = usdtToTmaCurrency(
                    row.amountUsdt,
                    activeTmaCurrency,
                    tonUsdRate,
                    starsUsdRate
                  );
                  return (
                    <tr
                      key={row.transactionUuid}
                      data-testid={`pam-ledger-row-${row.type}`}
                    >
                      <td className="py-2.5 pr-2">
                        <div className="text-xs font-semibold text-purple-200/80">
                          {row.type} • {row.vertical}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyUuid(row.transactionUuid)}
                          className="text-[11px] font-medium text-purple-300/50 tabular-nums truncate max-w-[200px] block cursor-pointer"
                        >
                          {copiedTxUuid === row.transactionUuid
                            ? '✓ Copied!'
                            : row.transactionUuid}
                        </button>
                      </td>
                      <td
                        className={`py-2.5 text-right text-xs font-semibold tabular-nums ${
                          isPositive ? 'text-[#00f59b]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatCurrency(convertedAmt, activeTmaCurrency)}
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
