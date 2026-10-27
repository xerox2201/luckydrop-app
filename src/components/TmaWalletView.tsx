import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, LogOut, ArrowDownToLine, ArrowUpFromLine, BookOpen, ShieldCheck } from 'lucide-react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  HapticEngine,
  formatCurrency,
  truncateTonAddress,
  usdtToTmaCurrency,
} from '../utils/telegramTma.ts';
import { generateDeterministicUuid } from '../services/pamWalletEngine.ts';

export const TmaWalletView: React.FC = () => {
  const {
    activeTmaCurrency,
    setActiveTmaCurrency,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    telegramUser,
    connectedTonWallet,
    connectTonWalletOneTap,
    disconnectTonWallet,
    setTonConnectModalOpen,
    depositTonInstant,
    depositTelegramStarsInstant,
    withdrawTonOrStars,
    pamLedger,
    pamReconciliation,
    pamReconcile,
    pamRollback,
    provablyFairSeeds,
    updateProvablyFairClientSeed,
    rotateProvablyFairServerSeed,
    navigateTo,
    isTelegramAdmin,
    isAdminPreviewEnabled,
    setIsAdminPreviewEnabled,
  } = useLottery();

  const [subTab, setSubTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'LEDGER'>('DEPOSIT');
  const [tonDepositAmount, setTonDepositAmount] = useState<number>(5);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(2);
  const [withdrawStarsAmount, setWithdrawStarsAmount] = useState<number>(500);
  const [clientSeedInput, setClientSeedInput] = useState<string>(provablyFairSeeds.clientSeed);
  const [walletBanner, setWalletBanner] = useState<string | null>(null);
  const [copiedWalletAddr, setCopiedWalletAddr] = useState<boolean>(false);

  const userMemo = `LD-TG-${telegramUser.id}`;

  const handleCopyConnectedAddress = () => {
    if (!connectedTonWallet?.address) return;
    HapticEngine.impactOccurred('light');
    navigator.clipboard?.writeText(connectedTonWallet.address);
    setCopiedWalletAddr(true);
    setTimeout(() => setCopiedWalletAddr(false), 2000);
  };

  const handleOneTapTonConnect = async (walletLabel: string) => {
    const res = await connectTonWalletOneTap(walletLabel);
    setWalletBanner(
      `💎 ${walletLabel} متصل شد (${truncateTonAddress(res.address)}) + ۲ دراپ رایگان Plinko!`
    );
    setTimeout(() => setWalletBanner(null), 4500);
  };

  const handleTonDeposit = async (amount: number) => {
    if (!connectedTonWallet) {
      HapticEngine.notificationOccurred('warning');
      setTonConnectModalOpen(true);
      setWalletBanner('💎 برای واریز TON ابتدا کیف پول TON خود را متصل کنید.');
      setTimeout(() => setWalletBanner(null), 3500);
      return;
    }
    const res = await depositTonInstant(amount, connectedTonWallet.address, userMemo);
    setWalletBanner(res.message);
    setTimeout(() => setWalletBanner(null), 4500);
  };

  const handleStarsTopUp = async (stars: number) => {
    const res = await depositTelegramStarsInstant(stars);
    setWalletBanner(res.message);
    setTimeout(() => setWalletBanner(null), 4500);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTmaCurrency === 'TON') {
      if (!connectedTonWallet) {
        HapticEngine.notificationOccurred('warning');
        setTonConnectModalOpen(true);
        setWalletBanner('💎 برای برداشت TON ابتدا کیف پول TON خود را متصل کنید.');
        setTimeout(() => setWalletBanner(null), 3500);
        return;
      }
      const res = await withdrawTonOrStars({
        currency: 'TON',
        amount: withdrawAmount,
        destination: connectedTonWallet.address,
      });
      setWalletBanner(res.message);
      setTimeout(() => setWalletBanner(null), 4500);
      return;
    }

    const res = await withdrawTonOrStars({
      currency: 'STARS',
      amount: withdrawStarsAmount,
      destination: `@${telegramUser.username || telegramUser.first_name}`,
    });
    setWalletBanner(res.message);
    setTimeout(() => setWalletBanner(null), 4500);
  };

  const handleRollbackLastDebit = async () => {
    HapticEngine.impactOccurred('medium');
    const latestDebit = pamLedger.find((e) => e.type === 'DEBIT');
    if (!latestDebit) {
      setWalletBanner('ℹ️ تراکنش DEBIT فعالی برای Rollback یافت نشد.');
      return;
    }
    const rb = await pamRollback({
      transactionUuid: generateDeterministicUuid('tx_rollback'),
      referenceTransactionUuid: latestDebit.transactionUuid,
      roundId: latestDebit.roundId,
      vertical: latestDebit.vertical,
      note: `TMA Rollback ${latestDebit.transactionUuid.slice(0, 12)}`,
    });
    if (rb.ok) {
      setWalletBanner(`↩️ تراکنش ${latestDebit.roundId} با موفقیت مسترد (Rollback + Tombstone) شد.`);
    }
  };

  return (
    <div
      data-testid="tma-wallet-view"
      className="px-4 py-4 pb-24 flex flex-col gap-4 max-w-[440px] mx-auto"
    >
      {/* Hero Portfolio Card */}
      <div
        data-testid="my-wallet-liquid-header"
        className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-4"
      >
        {/* Row 1: Title & Reconcile Badge (Max 2 data points) */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold tracking-wide text-white">
            کیف پول Web3 (TON &amp; Stars)
          </h1>
          <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
            {pamReconciliation?.reconciled !== false ? '✓ PAM Verified' : 'Audit'}
          </span>
        </div>

        {/* Active Currency Hero Display (Tier 1 Typography) */}
        <div className="flex items-center justify-between gap-2" dir="ltr">
          <div>
            <span className="text-xs font-semibold text-purple-200/80 block">
              {activeTmaCurrency === 'TON' ? '💎 Active TON Balance' : '⭐ Active Stars Balance'}
            </span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums text-white mt-1">
              {activeTmaCurrency === 'TON'
                ? formatCurrency(tonBalance, 'TON')
                : formatCurrency(starsBalance, 'STARS')}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              data-testid="wallet-select-ton-card"
              onClick={() => setActiveTmaCurrency('TON')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tabular-nums transition-all cursor-pointer border ${
                activeTmaCurrency === 'TON'
                  ? 'bg-purple-600/35 border-purple-400/50 text-white'
                  : 'bg-[#070510]/60 border-purple-500/20 text-purple-200/80'
              }`}
            >
              💎 {formatCurrency(tonBalance, 'TON')}
            </button>
            <button
              type="button"
              data-testid="wallet-select-stars-card"
              onClick={() => setActiveTmaCurrency('STARS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tabular-nums transition-all cursor-pointer border ${
                activeTmaCurrency === 'STARS'
                  ? 'bg-purple-600/35 border-purple-400/50 text-white'
                  : 'bg-[#070510]/60 border-purple-500/20 text-purple-200/80'
              }`}
            >
              ⭐ {formatCurrency(starsBalance, 'STARS')}
            </button>
          </div>
        </div>

        {/* Connected TON Wallet Address Pill (Truncated UQBx...89aF with Copy & Disconnect) */}
        <div className="pt-2 border-t border-purple-500/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200/80">
              کیف پول TON متصل:
            </span>
            <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
              {connectedTonWallet ? connectedTonWallet.provider : 'Not Connected'}
            </span>
          </div>

          {connectedTonWallet ? (
            <div
              data-testid="connected-ton-address-pill"
              className="flex items-center justify-between rounded-xl bg-[#070510]/90 border border-purple-500/25 px-3 py-2.5"
              dir="ltr"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#00f59b] tabular-nums">
                  💎 {truncateTonAddress(connectedTonWallet.address)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="wallet-copy-ton-addr-btn"
                  onClick={handleCopyConnectedAddress}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-xs font-semibold text-purple-200/80 flex items-center gap-1 cursor-pointer"
                >
                  {copiedWalletAddr ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00f59b]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  data-testid="wallet-disconnect-ton-btn"
                  onClick={disconnectTonWallet}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs font-semibold text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2" dir="ltr">
              {(['Tonkeeper', '@wallet', 'MyTonWallet'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  data-testid={`ton-connect-${w}`}
                  onClick={() => handleOneTapTonConnect(w)}
                  className="h-10 rounded-xl bg-[#070510]/90 hover:bg-purple-600/25 border border-purple-500/25 text-xs font-semibold text-purple-200/80 hover:text-white transition-colors cursor-pointer"
                >
                  💎 {w}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {walletBanner && (
        <div
          data-testid="tma-wallet-banner"
          className="rounded-2xl bg-[#130d24]/90 border border-[#00f59b]/40 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md text-xs font-semibold text-[#00f59b]"
        >
          {walletBanner}
        </div>
      )}

      {/* Segmented Sub-Navigation (Deposit | Withdraw | Ledger) */}
      <div
        className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md grid grid-cols-3 gap-1"
        dir="ltr"
      >
        {(
          [
            { id: 'DEPOSIT', label: 'Deposit', icon: ArrowDownToLine },
            { id: 'WITHDRAW', label: 'Withdraw', icon: ArrowUpFromLine },
            { id: 'LEDGER', label: `Ledger (${pamLedger.length})`, icon: BookOpen },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`wallet-subtab-${tab.id}`}
              onClick={() => {
                HapticEngine.selectionChanged();
                setSubTab(tab.id);
              }}
              className={`relative h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                active ? 'text-white' : 'text-purple-200/80 hover:text-white'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="wallet-subtab-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-purple-600/35 border border-purple-400/40 -z-10"
                />
              )}
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXCLUSIVE TON & TELEGRAM STARS DEPOSIT */}
      {subTab === 'DEPOSIT' && (
        <div className="flex flex-col gap-4">
          {/* 1) TON Deposit Card (Strictly requires connected TON wallet) */}
          <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-white">
                💎 واریز TON (TON Connect)
              </h2>
              <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
                {connectedTonWallet
                  ? truncateTonAddress(connectedTonWallet.address)
                  : 'Wallet Required'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2" dir="ltr">
              {[2, 5, 10, 25].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  data-testid={`quick-ton-deposit-${amt}`}
                  onClick={() => {
                    setTonDepositAmount(amt);
                    handleTonDeposit(amt);
                  }}
                  className={`h-10 rounded-xl border text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                    tonDepositAmount === amt
                      ? 'bg-purple-600/35 border-purple-400/50 text-white'
                      : 'bg-[#070510]/80 border-purple-500/20 text-purple-200/80 hover:text-white'
                  }`}
                >
                  +{formatCurrency(amt, 'TON')}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="confirm-ton-deposit-btn"
              onClick={() => handleTonDeposit(tonDepositAmount)}
              className="w-full h-11 rounded-xl stake-emerald-cta text-xs font-semibold text-[#042416] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {connectedTonWallet
                  ? `💎 واریز آنی +${formatCurrency(tonDepositAmount, 'TON')} از کیف پول متصل`
                  : '💎 اتصال کیف پول TON برای واریز'}
              </span>
            </button>
          </div>

          {/* 2) Native Telegram Stars (⭐) Top-Up Card */}
          <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-white">
                ⭐ شارژ ستاره تلگرام (Telegram Stars)
              </h2>
              <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
                Native Stars Flow
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5" dir="ltr">
              {[250, 500, 1000, 2500].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  data-testid={`buy-stars-${stars}`}
                  onClick={() => handleStarsTopUp(stars)}
                  className="p-3 rounded-xl bg-[#070510]/85 hover:bg-purple-600/25 border border-purple-500/20 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-white tabular-nums">
                    +{formatCurrency(stars, 'STARS')}
                  </span>
                  <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
                    Top Up
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCLUSIVE TON OR STARS WITHDRAWAL */}
      {subTab === 'WITHDRAW' && (
        <form
          onSubmit={handleWithdrawSubmit}
          className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-wide text-white">
              {activeTmaCurrency === 'TON' ? '💎 برداشت TON به کیف پول متصل' : '⭐ برداشت Stars به اکانت تلگرام'}
            </h2>
            <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
              {activeTmaCurrency === 'TON'
                ? formatCurrency(tonBalance, 'TON')
                : formatCurrency(starsBalance, 'STARS')}
            </span>
          </div>

          {activeTmaCurrency === 'TON' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-[#070510]/85 border border-purple-500/20 px-3 py-2.5" dir="ltr">
                <span className="text-xs font-semibold text-purple-200/80">Connected TON Wallet</span>
                <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
                  {connectedTonWallet
                    ? truncateTonAddress(connectedTonWallet.address)
                    : 'Not Connected'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-purple-200/80">
                  مقدار برداشت (TON):
                </label>
                <input
                  type="number"
                  dir="ltr"
                  min={0.5}
                  step="any"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Math.max(0.5, Number(e.target.value) || 1))}
                  className="w-full h-11 bg-[#070510] border border-purple-500/25 rounded-xl px-3 text-base font-bold tracking-wide text-white tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-[#070510]/85 border border-purple-500/20 px-3 py-2.5" dir="ltr">
                <span className="text-xs font-semibold text-purple-200/80">Telegram Account</span>
                <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
                  @{telegramUser.username || telegramUser.first_name}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-purple-200/80">
                  مقدار برداشت (Stars ⭐):
                </label>
                <input
                  type="number"
                  dir="ltr"
                  min={100}
                  step={50}
                  value={withdrawStarsAmount}
                  onChange={(e) =>
                    setWithdrawStarsAmount(Math.max(100, Math.round(Number(e.target.value) || 100)))
                  }
                  className="w-full h-11 bg-[#070510] border border-purple-500/25 rounded-xl px-3 text-base font-bold tracking-wide text-white tabular-nums"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            data-testid="submit-tma-withdraw-btn"
            className="w-full h-11 rounded-xl gold-gradient-cta text-xs font-semibold text-[#1c1002] cursor-pointer"
          >
            {activeTmaCurrency === 'TON'
              ? connectedTonWallet
                ? `ثبت برداشت ${formatCurrency(withdrawAmount, 'TON')}`
                : '💎 اتصال کیف پول TON برای برداشت'
              : `ثبت برداشت ${formatCurrency(withdrawStarsAmount, 'STARS')}`}
          </button>
        </form>
      )}

      {/* TAB 3: PAM LEDGER & PROVABLY FAIR VERIFIER */}
      {subTab === 'LEDGER' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-wide text-white">
                🛡️ Provably Fair (HMAC-SHA256)
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="text-xs font-semibold text-purple-200/80 hover:text-white underline cursor-pointer"
              >
                Verifier ↗
              </button>
            </div>

            <div
              className="rounded-xl bg-[#070510] border border-purple-500/20 p-2.5 text-[11px] font-medium text-purple-300/50 tabular-nums break-all"
              dir="ltr"
            >
              {provablyFairSeeds.serverSeedHash} (Nonce #{provablyFairSeeds.nonce})
            </div>

            <div className="flex gap-2" dir="ltr">
              <input
                type="text"
                value={clientSeedInput}
                onChange={(e) => setClientSeedInput(e.target.value)}
                className="flex-1 h-9 bg-[#070510] border border-purple-500/25 rounded-xl px-2.5 text-xs font-semibold text-purple-200/80"
              />
              <button
                type="button"
                onClick={() => {
                  updateProvablyFairClientSeed(clientSeedInput);
                  setWalletBanner('✅ Client Seed ذخیره شد.');
                }}
                className="px-3 h-9 rounded-xl bg-purple-600/40 border border-purple-400/40 text-xs font-semibold text-white cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  rotateProvablyFairServerSeed();
                  setWalletBanner('🔐 Server Seed چرخش یافت.');
                }}
                className="px-3 h-9 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
              >
                Rotate
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await pamReconcile();
                  setWalletBanner('✅ حسابرسی ریاضی PAM تایید شد.');
                }}
                className="h-9 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
              >
                ✓ Reconcile
              </button>
              <button
                type="button"
                onClick={handleRollbackLastDebit}
                className="h-9 rounded-xl bg-[#070510] border border-purple-500/25 text-xs font-semibold text-purple-200/80 cursor-pointer"
              >
                ↩ Rollback
              </button>
            </div>
          </div>

          {/* Ledger List (Formatted strictly in TON or Stars, max 2 data points per row) */}
          <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-wide text-white">
                دفترکل تراکنش‌ها
              </h3>
              <span className="text-[11px] font-medium text-purple-300/50 tabular-nums" dir="ltr">
                {pamLedger.length} TX
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scroll" dir="ltr">
              {pamLedger.slice(0, 12).map((row) => {
                const isPos = row.type !== 'DEBIT';
                const convertedAmt = usdtToTmaCurrency(
                  row.amountUsdt,
                  activeTmaCurrency,
                  tonUsdRate,
                  starsUsdRate
                );
                return (
                  <div
                    key={row.transactionUuid}
                    className="rounded-xl bg-[#070510]/85 border border-purple-500/15 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-purple-200/80 truncate">
                        {row.type} • {row.vertical}
                      </div>
                      <div className="text-[11px] font-medium text-purple-300/50 tabular-nums truncate">
                        {row.roundId}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        isPos ? 'text-[#00f59b]' : 'text-[#f43f5e]'
                      }`}
                    >
                      {isPos ? '+' : '-'}
                      {formatCurrency(convertedAmt, activeTmaCurrency)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Preview Access Toggle */}
          <div className="rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200/80 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>دسترسی پنل مدیریت تلگرام (Admin Gate)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdminPreviewEnabled(!isAdminPreviewEnabled)}
              className="px-3 py-1.5 rounded-xl bg-[#070510] border border-purple-500/25 text-[11px] font-medium text-purple-300/50 tabular-nums cursor-pointer"
              dir="ltr"
            >
              {isTelegramAdmin ? 'Admin: ON' : 'Admin: OFF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
