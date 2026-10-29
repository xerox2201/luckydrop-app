import React, { useState, useEffect } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  HapticEngine,
  TON_CONNECT_STANDARD_WALLETS,
  buildTonConnectAutoTransferPayload,
  formatCurrency,
  truncateTonAddress,
} from '../utils/telegramTma.ts';

export const TmaWalletView: React.FC = () => {
  const {
    activeTmaCurrency,
    setActiveTmaCurrency,
    tonBalance,
    starsBalance,
    adminTonWalletAddress,
    telegramUser,
    depositTonInstant,
    depositTelegramStarsInstant,
    withdrawTonOrStars,
    pamLedger,
    deposits,
    withdrawals,
    autoWithdrawLimitTon,
    connectedTonWallet,
    connectTonWalletOneTap,
    disconnectTonWallet,
    navigateTo,
  } = useLottery();

  const [subTab, setSubTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'LEDGER'>('DEPOSIT');

  // Smooth string-backed inputs so users can type multi-digit or decimal values freely
  const [tonDepositInput, setTonDepositInput] = useState<string>('5');
  const [starsDepositInput, setStarsDepositInput] = useState<string>('500');
  const [manualTonTxInput, setManualTonTxInput] = useState<string>('');
  const [showManualTxBox, setShowManualTxBox] = useState<boolean>(false);

  const [withdrawTonInput, setWithdrawTonInput] = useState<string>('10');
  const [withdrawStarsInput, setWithdrawStarsInput] = useState<string>('500');
  const [withdrawDestination, setWithdrawDestination] = useState<string>(
    connectedTonWallet?.address || ''
  );

  const [selectedWalletId, setSelectedWalletId] = useState<string>('tonkeeper');
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedVault, setCopiedVault] = useState<boolean>(false);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);
  const [copiedConnectedAddr, setCopiedConnectedAddr] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync default TON destination when wallet connects
  useEffect(() => {
    if (activeTmaCurrency === 'TON' && connectedTonWallet?.address && !withdrawDestination) {
      setWithdrawDestination(connectedTonWallet.address);
    }
  }, [activeTmaCurrency, connectedTonWallet, withdrawDestination]);

  const userMemoTag = `LD-TG-${telegramUser.id}`;
  const activeWalletSpec =
    TON_CONNECT_STANDARD_WALLETS.find((w) => w.id === selectedWalletId) ||
    TON_CONNECT_STANDARD_WALLETS[0];

  const parsedTonDeposit = Math.max(0, parseFloat(tonDepositInput) || 0);
  const parsedStarsDeposit = Math.max(0, Math.round(Number(starsDepositInput) || 0));
  const parsedWithdrawTon = Math.max(0, parseFloat(withdrawTonInput) || 0);
  const parsedWithdrawStars = Math.max(0, Math.round(Number(withdrawStarsInput) || 0));

  const autoTransferPayload = buildTonConnectAutoTransferPayload({
    recipientVaultAddress: adminTonWalletAddress,
    amountTon: parsedTonDeposit || 1,
    commentMemo: userMemoTag,
    walletProvider: activeWalletSpec.name,
  });

  const handleCopyVault = () => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard?.writeText(adminTonWalletAddress);
    setCopiedVault(true);
    setTimeout(() => setCopiedVault(false), 2000);
  };

  const handleCopyMemo = () => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard?.writeText(userMemoTag);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleCopyConnected = () => {
    if (!connectedTonWallet?.address) return;
    HapticEngine.impactOccurred('light');
    navigator.clipboard?.writeText(connectedTonWallet.address);
    setCopiedConnectedAddr(true);
    setTimeout(() => setCopiedConnectedAddr(false), 2000);
  };

  const handleTonAutoDeposit = async () => {
    if (parsedTonDeposit < 0.1) {
      HapticEngine.notificationOccurred('error');
      setToast({ ok: false, text: '⚠️ لطفاً حداقل 0.10 TON برای شارژ وارد کنید.' });
      return;
    }
    setSubmitting(true);
    setToast(null);
    const res = await depositTonInstant(
      parsedTonDeposit,
      connectedTonWallet?.address || activeWalletSpec.name,
      userMemoTag
    );
    setSubmitting(false);
    setToast({ ok: res.ok, text: res.message });
  };

  const handleManualTonTxVerify = async () => {
    const cleanTx = manualTonTxInput.trim();
    if (parsedTonDeposit < 0.1) {
      HapticEngine.notificationOccurred('error');
      setToast({ ok: false, text: '⚠️ لطفاً مبلغ واریزشده (حداقل 0.10 TON) را وارد کنید.' });
      return;
    }
    if (cleanTx.length < 8) {
      HapticEngine.notificationOccurred('error');
      setToast({
        ok: false,
        text: '⚠️ لطفاً هش تراکنش (TXID) یا کد پیگیری کیف پول خود را وارد نمایید.',
      });
      return;
    }
    setSubmitting(true);
    setToast(null);
    const res = await depositTonInstant(parsedTonDeposit, `tx_${cleanTx}`, userMemoTag);
    setSubmitting(false);
    if (res.ok) {
      setManualTonTxInput('');
      setShowManualTxBox(false);
    }
    setToast({ ok: res.ok, text: res.message });
  };

  const handleStarsDeposit = async (amountOverride?: number) => {
    const targetStars = amountOverride ?? parsedStarsDeposit;
    if (!Number.isFinite(targetStars) || targetStars < 10) {
      HapticEngine.notificationOccurred('error');
      setToast({ ok: false, text: '⚠️ حداقل مقدار شارژ ستاره تلگرام ۱۰ ⭐ است.' });
      return;
    }
    setSubmitting(true);
    setToast(null);
    const res = await depositTelegramStarsInstant(targetStars);
    setSubmitting(false);
    setToast({ ok: res.ok, text: res.message });
  };

  const handleSetWithdrawPercent = (pct: number) => {
    HapticEngine.selectionChanged();
    if (activeTmaCurrency === 'TON') {
      const computed = Number(((tonBalance * pct) / 100).toFixed(2));
      setWithdrawTonInput(String(Math.max(0.1, computed)));
    } else {
      const computed = Math.floor((starsBalance * pct) / 100);
      setWithdrawStarsInput(String(Math.max(50, computed)));
    }
  };

  const handleWithdraw = async () => {
    setToast(null);
    if (activeTmaCurrency === 'TON') {
      if (parsedWithdrawTon < 0.1) {
        HapticEngine.notificationOccurred('error');
        setToast({ ok: false, text: '⚠️ حداقل مقدار برداشت 0.10 TON است.' });
        return;
      }
      const dest = withdrawDestination.trim() || connectedTonWallet?.address || '';
      if (!dest) {
        HapticEngine.notificationOccurred('warning');
        setToast({
          ok: false,
          text: '💎 لطفاً آدرس کیف پول TON مقصد را در کادر زیر وارد کنید یا کیف پول خود را متصل نمایید.',
        });
        return;
      }
      setSubmitting(true);
      const res = await withdrawTonOrStars({
        currency: 'TON',
        amount: parsedWithdrawTon,
        destination: dest,
      });
      setSubmitting(false);
      setToast({ ok: res.ok, text: res.message });
    } else {
      if (parsedWithdrawStars < 50) {
        HapticEngine.notificationOccurred('error');
        setToast({ ok: false, text: '⚠️ حداقل مقدار برداشت ستاره تلگرام ۵۰ ⭐ است.' });
        return;
      }
      const dest =
        withdrawDestination.trim() || `@${telegramUser.username || telegramUser.first_name || 'VIP'}`;
      setSubmitting(true);
      const res = await withdrawTonOrStars({
        currency: 'STARS',
        amount: parsedWithdrawStars,
        destination: dest,
      });
      setSubmitting(false);
      setToast({ ok: res.ok, text: res.message });
    }
  };

  return (
    <div
      data-testid="tma-wallet-view"
      className="max-w-[440px] mx-auto px-4 pt-3 pb-28 space-y-4 select-none"
    >
      {/* Top Dual-Currency Balance Summary Card with 3D Vault Backdrop */}
      <div className="relative overflow-hidden rounded-2xl bg-[#130d24]/95 border border-amber-400/30 p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        <img
          src="/assets/aistudio/Gemini_Generated_Image___8__b9a70753.jpg"
          alt="LuckyDrop 3D Crypto Vault"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090514]/82 via-[#130d24]/86 to-[#090514]/94 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00f59b] block">
              LUCKYDROP • INSTANT 3D CASHIER
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              کیف پول آنی TON و Telegram Stars
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
            ⚡ تسویه آنی
          </span>
        </div>

        {/* Clickable Currency Cards */}
        <div className="relative z-10 grid grid-cols-2 gap-3" dir="ltr">
          <button
            type="button"
            data-testid="wallet-select-ton-card"
            onClick={() => {
              HapticEngine.selectionChanged();
              setActiveTmaCurrency('TON');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTmaCurrency === 'TON'
                ? 'bg-[#090612] border-[#00f59b] ring-1 ring-[#00f59b]/40 shadow-[0_0_20px_rgba(0,245,155,0.15)]'
                : 'bg-[#090612]/70 border-purple-500/20 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-purple-300/70">💎 موجودی TON</span>
              {activeTmaCurrency === 'TON' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00f59b]/20 text-[#00f59b]">
                  فعال
                </span>
              )}
            </div>
            <span
              data-testid="wallet-ton-balance"
              className="text-lg font-extrabold tracking-wide text-white tabular-nums mt-1 block"
            >
              {formatCurrency(tonBalance, 'TON')}
            </span>
          </button>

          <button
            type="button"
            data-testid="wallet-select-stars-card"
            onClick={() => {
              HapticEngine.selectionChanged();
              setActiveTmaCurrency('STARS');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTmaCurrency === 'STARS'
                ? 'bg-[#090612] border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                : 'bg-[#090612]/70 border-purple-500/20 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-purple-300/70">⭐ موجودی Stars</span>
              {activeTmaCurrency === 'STARS' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  فعال
                </span>
              )}
            </div>
            <span
              data-testid="wallet-stars-balance"
              className="text-lg font-extrabold tracking-wide text-amber-300 tabular-nums mt-1 block"
            >
              {formatCurrency(starsBalance, 'STARS')}
            </span>
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {(
            [
              { id: 'DEPOSIT', label: '➕ شارژ آنی' },
              { id: 'WITHDRAW', label: '📤 برداشت' },
              { id: 'LEDGER', label: '📜 تراکنش‌ها' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`wallet-tab-${t.id.toLowerCase()}`}
              onClick={() => {
                HapticEngine.selectionChanged();
                setToast(null);
                setSubTab(t.id);
              }}
              className={`h-11 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subTab === t.id
                  ? 'bg-gradient-to-r from-[#00f59b] to-[#10b981] text-[#042416] shadow-md'
                  : 'bg-[#090612]/90 text-purple-200/80 border border-purple-500/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div
          data-testid="wallet-toast"
          className={`p-3.5 rounded-2xl border text-xs font-bold leading-relaxed ${
            toast.ok
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* DEPOSIT TAB */}
      {subTab === 'DEPOSIT' && (
        <div className="space-y-4">
          {/* Currency Switcher inside Deposit Tab */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#130d24]/95 border border-purple-500/25">
            <button
              type="button"
              data-testid="deposit-mode-ton-btn"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveTmaCurrency('TON');
              }}
              className={`h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTmaCurrency === 'TON'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white'
              }`}
            >
              <span>💎 شارژ TON</span>
            </button>
            <button
              type="button"
              data-testid="deposit-mode-stars-btn"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveTmaCurrency('STARS');
              }}
              className={`h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTmaCurrency === 'STARS'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white'
              }`}
            >
              <span>⭐ شارژ Telegram Stars</span>
            </button>
          </div>

          {activeTmaCurrency === 'TON' ? (
            /* 1. TON DEPOSIT PANEL */
            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 block">
                    TON CONNECT 2.0 • DIRECT BLOCKCHAIN TOP-UP
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    💎 واریز و شارژ آنی تون‌کوین (TON)
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-400/30 text-[10px] font-bold text-sky-300">
                  Auto-Credit
                </span>
              </div>

              {/* Connected TON Wallet State */}
              {connectedTonWallet ? (
                <div
                  data-testid="wallet-connected-ton-card"
                  className="p-3.5 rounded-2xl bg-[#090612]/90 border border-[#00f59b]/35 flex items-center justify-between gap-2"
                  dir="ltr"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 flex items-center justify-center text-base shrink-0">
                      💎
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-[#00f59b] block">
                        CONNECTED ({connectedTonWallet.provider.toUpperCase()})
                      </span>
                      <span className="text-xs font-bold text-white tabular-nums truncate block">
                        {truncateTonAddress(connectedTonWallet.address)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyConnected}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-[10px] font-bold text-purple-100 cursor-pointer"
                    >
                      {copiedConnectedAddr ? 'کپی شد' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      data-testid="wallet-disconnect-ton-btn"
                      onClick={disconnectTonWallet}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-[10px] font-bold text-rose-300 cursor-pointer"
                    >
                      قطع اتصال
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#090612]/90 border border-purple-500/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      اتصال کیف پول استاندارد TON Connect
                    </span>
                    <span className="text-[11px] font-medium text-purple-300/60 block">
                      Tonkeeper، MyTonWallet، Tonhub یا Bitget
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="wallet-open-tonconnect-btn"
                    onClick={() => {
                      connectTonWalletOneTap(activeWalletSpec.name);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shrink-0 cursor-pointer"
                  >
                    💎 Connect TON
                  </button>
                </div>
              )}

              {/* Custom TON Deposit Input + Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200/80 font-bold">مقدار شارژ (TON):</span>
                  <span className="text-[11px] font-medium text-purple-300/60" dir="ltr">
                    Min: 0.10 TON
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="ton-deposit-custom-input"
                  value={tonDepositInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setTonDepositInput(val);
                  }}
                  placeholder="مثلاً 5 یا 12.5"
                  className="w-full bg-[#090612] border border-purple-500/30 focus:border-sky-400 rounded-xl px-4 py-3 text-base font-extrabold text-white tabular-nums outline-none"
                  dir="ltr"
                />
                <div className="grid grid-cols-5 gap-1.5" dir="ltr">
                  {[1, 5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      data-testid={`ton-preset-${amt}`}
                      onClick={() => {
                        HapticEngine.selectionChanged();
                        setTonDepositInput(String(amt));
                      }}
                      className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer tabular-nums ${
                        parsedTonDeposit === amt
                          ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.35)]'
                          : 'bg-[#090612] text-purple-200/80 border-purple-500/20'
                      }`}
                    >
                      {amt} TON
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary 1-Click TON Connect Deposit Button */}
              <button
                type="button"
                disabled={submitting}
                data-testid="ton-instant-deposit-btn"
                onClick={handleTonAutoDeposit}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-[0_8px_24px_rgba(14,165,233,0.3)] active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>💎</span>
                <span>
                  {submitting
                    ? 'در حال پردازش تراکنش TON...'
                    : `پرداخت آنی ${formatCurrency(parsedTonDeposit || 0, 'TON')} با TON Connect`}
                </span>
              </button>

              {/* Direct Wallet Transfer & TXID Verification Option */}
              <div className="bg-[#090612]/90 border border-purple-500/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-200/80">
                    آدرس خزانه رسمی TON و شناسه Memo شما:
                  </span>
                  <button
                    type="button"
                    data-testid="toggle-manual-ton-tx-btn"
                    onClick={() => setShowManualTxBox((prev) => !prev)}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    {showManualTxBox ? 'بستن ثبت کد پیگیری' : 'ثبت مستقیم هش تراکنش (TXID)'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2" dir="ltr">
                  <code
                    data-testid="admin-ton-vault-address"
                    className="text-[11px] font-mono text-sky-300 truncate flex-1"
                  >
                    {adminTonWalletAddress}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyVault}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    {copiedVault ? '✅ کپی شد' : 'کپی آدرس'}
                  </button>
                </div>

                <div
                  className="flex items-center justify-between gap-2 pt-2 border-t border-purple-500/15"
                  dir="ltr"
                >
                  <span className="text-[10px] font-medium text-purple-300/60">
                    Memo Tag: <strong className="text-amber-300 font-mono">{userMemoTag}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={autoTransferPayload.universalAutoSignUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-200 text-[10px] font-bold"
                    >
                      باز کردن Tonkeeper ↗
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyMemo}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0 cursor-pointer"
                    >
                      {copiedMemo ? '✅ کپی شد' : 'کپی Memo'}
                    </button>
                  </div>
                </div>

                {showManualTxBox && (
                  <div className="pt-2.5 border-t border-purple-500/20 space-y-2">
                    <label className="text-[11px] font-medium text-purple-200/80 block">
                      اگر مبلغ را مستقیماً به آدرس بالا ارسال کرده‌اید، هش تراکنش (TXID) یا کد پیگیری را وارد کنید:
                    </label>
                    <div className="flex items-center gap-2" dir="ltr">
                      <input
                        type="text"
                        data-testid="manual-ton-tx-input"
                        value={manualTonTxInput}
                        onChange={(e) => setManualTonTxInput(e.target.value)}
                        placeholder="Paste TON TXID / BOC hash..."
                        className="flex-1 bg-[#130d24] border border-purple-500/30 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        data-testid="submit-manual-ton-tx-btn"
                        onClick={handleManualTonTxVerify}
                        className="px-3.5 py-2 rounded-xl bg-[#00f59b] text-[#042416] font-extrabold text-xs shrink-0 cursor-pointer"
                      >
                        تایید و شارژ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. TELEGRAM STARS DEPOSIT PANEL */
            <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block">
                    TELEGRAM STARS (XTR) • INSTANT IN-APP TOP-UP
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    ⭐ شارژ آنی با ستاره‌های تلگرام (Stars)
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                  بدون کارمزد شبکه
                </span>
              </div>

              {/* Custom Stars Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200/80 font-bold">مقدار شارژ (Stars ⭐):</span>
                  <span className="text-[11px] font-medium text-purple-300/60" dir="ltr">
                    Min: 10 ⭐
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="stars-deposit-custom-input"
                  value={starsDepositInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setStarsDepositInput(val);
                  }}
                  placeholder="مثلاً 500"
                  className="w-full bg-[#090612] border border-purple-500/30 focus:border-amber-400 rounded-xl px-4 py-3 text-base font-extrabold text-amber-300 tabular-nums outline-none"
                  dir="ltr"
                />
              </div>

              {/* Quick Stars Packages */}
              <div className="grid grid-cols-4 gap-2" dir="ltr">
                {[100, 500, 1000, 2500].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    data-testid={`stars-preset-${stars}`}
                    onClick={() => {
                      HapticEngine.selectionChanged();
                      setStarsDepositInput(String(stars));
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      parsedStarsDeposit === stars
                        ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                        : 'bg-[#090612] text-purple-200/80 border-purple-500/20'
                    }`}
                  >
                    <span className="text-xs font-extrabold block tabular-nums">
                      ⭐ {stars.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] opacity-80 block mt-0.5 font-semibold tabular-nums">
                      ≈ {(stars / 250).toFixed(2)} TON
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={submitting}
                data-testid="stars-instant-deposit-btn"
                onClick={() => handleStarsDeposit()}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#00f59b] to-[#10b981] text-[#042416] font-extrabold text-xs sm:text-sm shadow-[0_8px_24px_rgba(0,245,155,0.28)] active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>⭐</span>
                <span>
                  {submitting
                    ? 'در حال شارژ کیف پول ستاره...'
                    : `شارژ آنی +${formatCurrency(parsedStarsDeposit || 0, 'STARS')}`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* WITHDRAW TAB */}
      {subTab === 'WITHDRAW' && (
        <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          {/* Currency Selector inside Withdraw Tab */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#090612] border border-purple-500/25">
            <button
              type="button"
              data-testid="withdraw-mode-ton-btn"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveTmaCurrency('TON');
                if (connectedTonWallet?.address) {
                  setWithdrawDestination(connectedTonWallet.address);
                }
              }}
              className={`h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTmaCurrency === 'TON'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white'
              }`}
            >
              <span>💎 برداشت TON</span>
            </button>
            <button
              type="button"
              data-testid="withdraw-mode-stars-btn"
              onClick={() => {
                HapticEngine.selectionChanged();
                setActiveTmaCurrency('STARS');
                if (!withdrawDestination || withdrawDestination.startsWith('UQ') || withdrawDestination.startsWith('EQ')) {
                  setWithdrawDestination(`@${telegramUser.username || telegramUser.first_name || 'VIP'}`);
                }
              }}
              className={`h-10 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTmaCurrency === 'STARS'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-purple-200/80 hover:text-white'
              }`}
            >
              <span>⭐ برداشت Stars</span>
            </button>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#00f59b] block">
              INSTANT PAYOUT ENGINE ({activeTmaCurrency})
            </span>
            <h2 className="text-base font-extrabold text-white">
              {activeTmaCurrency === 'TON'
                ? '📤 برداشت آنی تون‌کوین (TON)'
                : '📤 برداشت آنی ستاره‌های تلگرام (Stars ⭐)'}
            </h2>
            <p className="text-xs font-medium text-purple-200/80 mt-1">
              {activeTmaCurrency === 'TON'
                ? `موجودی قابل برداشت: ${formatCurrency(tonBalance, 'TON')} • برداشت‌های زیر ${autoWithdrawLimitTon} TON به صورت آنی و اتوماتیک تسویه می‌شوند.`
                : `موجودی قابل برداشت: ${formatCurrency(starsBalance, 'STARS')} • تسویه آنی به حساب تلگرام شما بدون کارمزد.`}
            </p>
          </div>

          {/* Destination Input (Editable for both TON and Stars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-purple-200/80 font-semibold block">
                {activeTmaCurrency === 'TON'
                  ? 'آدرس کیف پول مقصد TON (با پیشوند UQ یا EQ):'
                  : 'نام کاربری یا شناسه تلگرام مقصد (@username):'}
              </label>
              {activeTmaCurrency === 'TON' && connectedTonWallet?.address && (
                <button
                  type="button"
                  onClick={() => setWithdrawDestination(connectedTonWallet.address)}
                  className="text-[10px] font-bold text-[#00f59b] underline cursor-pointer"
                >
                  استفاده از کیف پول متصل
                </button>
              )}
            </div>
            <input
              type="text"
              data-testid="tma-withdraw-destination"
              value={withdrawDestination}
              onChange={(e) => setWithdrawDestination(e.target.value)}
              placeholder={
                activeTmaCurrency === 'TON'
                  ? 'UQ... یا EQ... (آدرس کیف پول TON خود را وارد کنید)'
                  : `@${telegramUser.username || 'TelegramUsername'}`
              }
              className="w-full bg-[#090612] border border-purple-500/30 focus:border-[#00f59b] rounded-xl px-3.5 py-3 text-xs font-mono text-white outline-none"
              dir="ltr"
            />
          </div>

          {/* Smooth Multi-Digit / Decimal Withdrawal Amount Input + Percentage Quick Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-purple-200/80 font-semibold block">
                مبلغ برداشت ({activeTmaCurrency === 'TON' ? '💎 TON' : '⭐ Stars'}):
              </label>
              <span className="text-[11px] font-mono text-purple-300/70" dir="ltr">
                {activeTmaCurrency === 'TON'
                  ? `Available: ${formatCurrency(tonBalance, 'TON')}`
                  : `Available: ${formatCurrency(starsBalance, 'STARS')}`}
              </span>
            </div>

            <input
              type="text"
              inputMode="decimal"
              data-testid="tma-withdraw-amount"
              value={activeTmaCurrency === 'TON' ? withdrawTonInput : withdrawStarsInput}
              onChange={(e) => {
                if (activeTmaCurrency === 'TON') {
                  setWithdrawTonInput(e.target.value.replace(/[^0-9.]/g, ''));
                } else {
                  setWithdrawStarsInput(e.target.value.replace(/[^0-9]/g, ''));
                }
              }}
              placeholder={activeTmaCurrency === 'TON' ? 'مثلاً 15.5' : 'مثلاً 500'}
              className="w-full bg-[#090612] border border-purple-500/30 focus:border-[#00f59b] rounded-xl px-4 py-3 text-base font-extrabold text-white tabular-nums outline-none"
              dir="ltr"
            />

            {/* Quick Percentage Buttons (25%, 50%, 75%, MAX) */}
            <div className="grid grid-cols-4 gap-2" dir="ltr">
              {[
                { label: '25%', pct: 25 },
                { label: '50%', pct: 50 },
                { label: '75%', pct: 75 },
                { label: 'MAX', pct: 100 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  data-testid={`withdraw-pct-${btn.pct}`}
                  onClick={() => handleSetWithdrawPercent(btn.pct)}
                  className="py-2 rounded-xl bg-[#090612] hover:bg-purple-950/50 border border-purple-500/25 text-xs font-extrabold text-[#00f59b] cursor-pointer transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            data-testid="tma-submit-withdraw-btn"
            onClick={handleWithdraw}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#00f59b] to-[#10b981] text-[#042416] font-extrabold text-xs sm:text-sm shadow-[0_8px_24px_rgba(0,245,155,0.28)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-60"
          >
            {submitting
              ? 'در حال ثبت و تسویه برداشت...'
              : `⚡ ثبت و تسویه آنی برداشت (${
                  activeTmaCurrency === 'TON'
                    ? formatCurrency(parsedWithdrawTon, 'TON')
                    : formatCurrency(parsedWithdrawStars, 'STARS')
                })`}
          </button>

          {/* Recent Withdrawals List */}
          {withdrawals.length > 0 && (
            <div className="pt-3 border-t border-purple-500/20 space-y-2">
              <span className="text-xs font-extrabold text-white block">
                آخرین برداشت‌های ثبت‌شده شما:
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {withdrawals.slice(0, 5).map((w) => (
                  <div
                    key={w.withdrawalCode}
                    className="p-2.5 rounded-xl bg-[#090612]/90 border border-purple-500/20 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate" dir="ltr">
                        {w.netAmountCrypto} → {truncateTonAddress(w.destinationAddress)}
                      </span>
                      <span className="text-[10px] text-purple-300/60 block">
                        کد: {w.withdrawalCode} • {w.createdAt}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                        w.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : w.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {w.status === 'completed'
                        ? 'تسویه‌شده'
                        : w.status === 'rejected'
                        ? 'برگشت‌خورده'
                        : 'در حال بررسی'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEDGER & SECURITY LINKS TAB */}
      {subTab === 'LEDGER' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-5 space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white">
                📜 تاریخچه تراکنش‌های کیف پول ({pamLedger.length})
              </h2>
              <span className="text-[10px] font-semibold text-[#00f59b]">
                ثبت آنی در حساب کاربری
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {pamLedger.slice(0, 20).map((entry) => {
                const entryCurrency = entry.currency === 'STARS' ? 'STARS' : 'TON';
                const rawDelta =
                  entryCurrency === 'STARS'
                    ? Number(entry.amountStars ?? Math.round((entry.amountTon || 0) * 250))
                    : Number(entry.amountTon ?? 0);
                const formattedDelta = formatCurrency(Math.abs(rawDelta), entryCurrency);
                const formattedBalanceAfter =
                  entryCurrency === 'STARS'
                    ? formatCurrency(Number(entry.starsBalanceAfter ?? starsBalance), 'STARS')
                    : formatCurrency(Number(entry.tonBalanceAfter ?? tonBalance), 'TON');

                return (
                  <div
                    key={entry.transactionUuid}
                    className="p-3 rounded-xl bg-[#090612]/90 border border-purple-500/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {entry.note}
                      </span>
                      <span
                        className="text-[10px] font-medium text-purple-300/50 block truncate"
                        dir="ltr"
                      >
                        {entry.type} • {entry.roundId}
                      </span>
                    </div>
                    <div className="text-left shrink-0" dir="ltr">
                      <span
                        className={`text-xs font-bold tabular-nums block ${
                          rawDelta >= 0 ? 'text-[#00f59b]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {rawDelta >= 0 ? '+' : '-'}
                        {formattedDelta}
                      </span>
                      <span className="text-[10px] font-medium text-purple-300/50 tabular-nums block">
                        موجودی: {formattedBalanceAfter}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Public Launch Security & Legal Quick Links */}
          <div className="rounded-2xl bg-[#130d24]/95 border border-purple-500/25 p-4 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-extrabold text-white block">
                🛡️ مرکز امنیت، قوانین و بررسی نتایج LuckyDrop
              </span>
              <span className="text-[11px] text-purple-300/65 block">
                مشاهده قوانین رسمی، حریم خصوصی و بررسی هش قرعه‌کشی‌های انجام‌شده
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigateTo('terms')}
                className="px-3 py-2 rounded-xl bg-[#090612] border border-purple-500/30 text-[11px] font-bold text-purple-200 hover:text-white cursor-pointer"
              >
                قوانین و امنیت
              </button>
              <button
                type="button"
                onClick={() => navigateTo('transparency')}
                className="px-3 py-2 rounded-xl bg-[#00f59b]/15 border border-[#00f59b]/40 text-[11px] font-bold text-[#00f59b] cursor-pointer"
              >
                بررسی نتایج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
