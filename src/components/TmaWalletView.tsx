import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  History,
  Unlink,
  Zap,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import {
  HapticEngine,
  TON_CONNECT_STANDARD_WALLETS,
} from '../utils/telegramTma';
import { tr } from '../utils/i18n';

export const TmaWalletView: React.FC = () => {
  const {
    lang,
    activeTmaCurrency,
    setActiveTmaCurrency,
    tonBalance,
    starsBalance,
    formatCurrency,
    connectedTonWallet,
    connectTonWalletOneTap,
    disconnectTonWallet,
    depositTonInstant,
    depositTelegramStarsInstant,
    withdrawTonOrStars,
    adminTonWalletAddress,
    pamLedger,
    telegramUser,
    liveTonUsdPrice,
    tonChange24hPercent,
    liveStarsUsdPrice,
    liveStarsPerTon,
    portfolioUsdValue,
    liveOracleSnapshot,
    oracleRefreshing,
    refreshPriceOracleNow,
    rakebackVault,
    claimRakebackVault,
  } = useLottery();

  const [subTab, setSubTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>('DEPOSIT');
  const [selectedWalletProvider, setSelectedWalletProvider] = useState<string>('Tonkeeper');
  const [tonDepositInput, setTonDepositInput] = useState<string>('5');
  const [manualTxProofInput, setManualTxProofInput] = useState<string>('');
  const [starsDepositInput, setStarsDepositInput] = useState<number>(250);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('5');
  const [withdrawDestination, setWithdrawDestination] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  const handleCopyVault = () => {
    HapticEngine.impactOccurred('light');
    navigator.clipboard.writeText(adminTonWalletAddress).catch(() => {});
    setCopiedAddr(true);
    showToast(
      tr(
        lang,
        '📋 آدرس کیف پول TON سایت کپی شد!',
        '📋 Official TON Treasury address copied!'
      )
    );
    setTimeout(() => setCopiedAddr(false), 2500);
  };

  const handleConnectWallet = async (providerName: string) => {
    setBusy(true);
    setSelectedWalletProvider(providerName);
    const res = await connectTonWalletOneTap(providerName);
    setBusy(false);
    showToast(res.message);
  };

  const handleTonDeposit = async () => {
    const val = parseFloat(tonDepositInput);
    if (!Number.isFinite(val) || val < 0.1) {
      showToast(
        tr(
          lang,
          '⚠️ حداقل مقدار شارژ در شبکه TON معادل 0.10 TON است.',
          '⚠️ Minimum TON deposit amount is 0.10 TON.'
        )
      );
      return;
    }
    setBusy(true);

    const trimmedProof = manualTxProofInput.trim();
    const senderOrProof = trimmedProof
      ? `tx_${trimmedProof}`
      : connectedTonWallet?.address;
    const res = await depositTonInstant(
      val,
      senderOrProof,
      `LD-${telegramUser.id}-${selectedWalletProvider.replace(/\s+/g, '')}`
    );
    setBusy(false);
    if (res.ok && trimmedProof) {
      setManualTxProofInput('');
    }
    showToast(res.message);
  };

  const handleStarsDeposit = async (pkgStars: number) => {
    setStarsDepositInput(pkgStars);
    setBusy(true);
    const res = await depositTelegramStarsInstant(pkgStars);
    setBusy(false);
    showToast(res.message);
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmountInput);
    setBusy(true);
    const res = await withdrawTonOrStars({
      currency: activeTmaCurrency,
      amount: amt,
      destination:
        withdrawDestination.trim() ||
        connectedTonWallet?.address ||
        `@${telegramUser.username || telegramUser.first_name}`,
    });
    setBusy(false);
    showToast(res.message);
  };

  return (
    <main className="w-full px-3 pt-3 pb-8 space-y-4 select-none">
      {/* 1. UNIFIED DUAL-CURRENCY WALLET HERO CARD */}
      <section className="relative overflow-hidden rounded-3xl p-4 luckydrop-obsidian-glass luckydrop-specular-gold luckydrop-microgrid-watermark luckydrop-holographic-shimmer">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#0098EA]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0098EA]/20 border border-[#0098EA]/40 text-[#38BDF8] text-[10px] font-black">
            <Wallet className="w-3.5 h-3.5" />
            <span>{tr(lang, 'کیف پول یکپارچه TON Connect 2.0', 'TON Connect 2.0 Seamless Wallet')}</span>
          </div>
          <span
            data-testid="wallet-total-portfolio-usd"
            className="text-[10px] font-mono font-bold text-[#00F5D4] bg-[#00F5D4]/15 px-2.5 py-0.5 rounded-lg border border-[#00F5D4]/30"
            dir="ltr"
          >
            Total Portfolio ≈ ${portfolioUsdValue.toFixed(2)} USD
          </span>
        </div>

        {/* Dual Balance Display Cards */}
        <div className="relative z-10 grid grid-cols-2 gap-2.5 my-2">
          <div
            onClick={() => setActiveTmaCurrency('TON')}
            data-testid="wallet-ton-card"
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeTmaCurrency === 'TON'
                ? 'bg-[#0098EA]/20 border-[#0098EA] shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_10px_20px_rgba(0,0,0,0.5)]'
                : 'bg-black/40 border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),_0_6px_14px_rgba(0,0,0,0.45)] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Toncoin (TON)</span>
              <span>💎</span>
            </div>
            <div className="font-mono text-lg font-black text-white mt-1" dir="ltr">
              {tonBalance.toFixed(2)} TON
            </div>
            <div className="text-[10px] font-mono text-[#38BDF8] mt-0.5" dir="ltr">
              ≈ ${(tonBalance * liveTonUsdPrice).toFixed(2)} USD
            </div>
          </div>

          <div
            onClick={() => setActiveTmaCurrency('STARS')}
            data-testid="wallet-stars-card"
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeTmaCurrency === 'STARS'
                ? 'bg-[#FFD700]/15 border-[#FFE066] shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_10px_20px_rgba(0,0,0,0.5)]'
                : 'bg-black/40 border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12),_0_6px_14px_rgba(0,0,0,0.45)] opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Telegram Stars</span>
              <span>⭐</span>
            </div>
            <div className="font-mono text-lg font-black text-[#FFE066] mt-1" dir="ltr">
              {starsBalance.toLocaleString('en-US')} ⭐
            </div>
            <div className="text-[10px] font-mono text-amber-200/80 mt-0.5" dir="ltr">
              ≈ ${(starsBalance * liveStarsUsdPrice).toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* LIVE MARKET ORACLE TICKER CARD */}
        <div
          data-testid="wallet-live-oracle-ticker"
          className="relative z-10 mt-2.5 p-2.5 rounded-2xl bg-[#070510]/85 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_8px_16px_rgba(0,0,0,0.45)] space-y-1.5"
          dir="ltr"
        >
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse shrink-0" />
              <span className="font-black text-white">
                TON/USD: ${liveTonUsdPrice.toFixed(3)}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                  tonChange24hPercent >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {tonChange24hPercent >= 0 ? '+' : ''}
                {tonChange24hPercent.toFixed(2)}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => refreshPriceOracleNow()}
              className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono text-[#00F5D4] cursor-pointer shrink-0"
            >
              {oracleRefreshing ? 'Syncing...' : '↻ Refresh Oracle'}
            </button>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>
              1 ⭐ ≈ ${liveStarsUsdPrice.toFixed(4)} • 1 TON ≈ {liveStarsPerTon} ⭐
            </span>
            <span className="truncate max-w-[155px]">
              {liveOracleSnapshot?.providerLabel || 'Live Oracle'} •{' '}
              {liveOracleSnapshot?.lastUpdatedIso
                ? new Date(liveOracleSnapshot.lastUpdatedIso).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Live'}
            </span>
          </div>
        </div>

        {/* Standard Automated TON Connect 2.0 Bar */}
        <div className="relative z-10 mt-3 pt-3 border-t border-white/10 space-y-2.5">
          {connectedTonWallet ? (
            <div className="flex items-center justify-between bg-emerald-500/12 border border-emerald-400/35 rounded-2xl p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-emerald-200 font-bold">
                    {tr(
                      lang,
                      `متصل به ${connectedTonWallet.provider} (TON Connect 2.0)`,
                      `Connected to ${connectedTonWallet.provider} (TON Connect 2.0)`
                    )}
                  </div>
                  <div className="font-mono text-xs font-black text-white truncate" dir="ltr">
                    {connectedTonWallet.address}
                  </div>
                </div>
              </div>
              <button
                onClick={disconnectTonWallet}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 cursor-pointer shrink-0"
                title={tr(lang, 'قطع اتصال کیف پول', 'Disconnect Wallet')}
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-300 px-0.5">
                <span className="font-bold">
                  {tr(
                    lang,
                    'اتصال استاندارد و اتوماتیک کیف پول‌های شبکه TON:',
                    'Connect Standard Non-Custodial TON Wallet:'
                  )}
                </span>
                <span className="font-mono text-[#00F5D4]">TON Connect 2.0</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5" dir="ltr">
                {TON_CONNECT_STANDARD_WALLETS.map((w) => (
                  <button
                    key={w.id}
                    disabled={busy}
                    onClick={() => handleConnectWallet(w.name)}
                    className="flex items-center gap-2 p-2 rounded-2xl bg-[#141A35]/90 hover:bg-[#1B2448] border border-[#0098EA]/40 hover:border-[#00F5D4] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)] transition-all cursor-pointer active:scale-95 text-left"
                  >
                    <span className="text-base shrink-0">{w.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-white truncate">
                        {w.name}
                      </div>
                      <div className="text-[8px] font-mono text-[#00F5D4] truncate">
                        {w.badge}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {feedbackToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_8px_16px_rgba(0,0,0,0.45)] text-emerald-200 text-xs font-bold text-center">
          {feedbackToast}
        </div>
      )}

      {/* 1.5 INSTANT VIP RAKEBACK & CASHBACK VAULT BANNER */}
      <section
        data-testid="wallet-cashback-vault-card"
        className="rounded-3xl p-3.5 bg-gradient-to-br from-[#0D1A22] via-[#0B121E] to-[#19130A] border border-emerald-400/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_10px_24px_rgba(0,0,0,0.5)] space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-black text-emerald-200 truncate">
            {tr(
              lang,
              '💎 قلک کشبک و پاداش برگشتی (Instant VIP Cashback Vault)',
              '💎 Instant VIP Cashback Vault'
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#FFE066]/15 border border-[#FFE066]/40 text-[#FFE066] text-[9px] font-black shrink-0">
            {tr(lang, '۳٪ کشبک آنی بلیت + ۱.۵٪ ریکبک بازی‌ها', '3% Ticket + 1.5% Game Rebate')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-xs" dir="ltr">
          <div className="p-2 rounded-2xl bg-[#090614]/85 border border-emerald-400/25 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">TON:</span>
            <span className="font-black text-emerald-300">
              💎 {(rakebackVault?.claimableTon || 0).toFixed(6)}
            </span>
          </div>
          <div className="p-2 rounded-2xl bg-[#090614]/85 border border-[#FFE066]/25 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">STARS:</span>
            <span className="font-black text-[#FFE066]">
              ⭐ {Math.round(rakebackVault?.claimableStars || 0).toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={
            busy ||
            ((rakebackVault?.claimableTon || 0) <= 0 && (rakebackVault?.claimableStars || 0) <= 0)
          }
          onClick={async () => {
            setBusy(true);
            const res = await claimRakebackVault();
            setBusy(false);
            showToast(res.message);
          }}
          className={`w-full py-2 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
            (rakebackVault?.claimableTon || 0) > 0 || (rakebackVault?.claimableStars || 0) > 0
              ? 'bg-gradient-to-r from-emerald-400 via-[#00F5D4] to-[#FFE066] text-slate-950 border border-emerald-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.65),_0_8px_18px_rgba(16,185,129,0.35)]'
              : 'bg-white/5 text-slate-400 border border-white/10 opacity-75 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            {tr(
              lang,
              'دریافت آنی به کیف پول (Claim Now)',
              'Claim Instant Cashback to Wallet (Claim Now)'
            )}
          </span>
        </button>
      </section>

      {/* 2. SUB-NAVIGATION: DEPOSIT / WITHDRAW / LEDGER */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#110C22] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_8px_16px_rgba(0,0,0,0.45)]">
        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            setSubTab('DEPOSIT');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'DEPOSIT'
              ? 'bg-[#00F5D4] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_6px_14px_rgba(0,0,0,0.45)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>{tr(lang, 'شارژ حساب', 'Deposit')}</span>
        </button>

        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            setSubTab('WITHDRAW');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'WITHDRAW'
              ? 'bg-[#FFE066] text-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_6px_14px_rgba(0,0,0,0.45)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>{tr(lang, 'برداشت آنی', 'Withdraw')}</span>
        </button>

        <button
          onClick={() => {
            HapticEngine.selectionChanged();
            setSubTab('HISTORY');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            subTab === 'HISTORY'
              ? 'bg-white/15 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_6px_14px_rgba(0,0,0,0.45)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{tr(lang, 'دفترکل PAM', 'PAM Ledger')}</span>
        </button>
      </div>

      {/* 3A. DEPOSIT VIEW (TON CONNECT + TELEGRAM STARS) */}
      {subTab === 'DEPOSIT' && (
        <div className="space-y-3.5">
          {/* TON Automated On-Chain Deposit Card */}
          <section className="rounded-3xl p-4 bg-[#110C22]/90 border border-[#0098EA]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💎</span>
                <div>
                  <h2 className="text-xs font-black text-white">
                    {tr(
                      lang,
                      'شارژ اتوماتیک شبکه TON (Tonkeeper / MyTonWallet / Tonhub)',
                      'Automated On-Chain TON Deposit'
                    )}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    {tr(
                      lang,
                      'پرداخت مستقیم با قرارداد هوشمند TON Connect 2.0 بدون کارمزد پلتفرم',
                      '1-Tap TON Connect 2.0 Smart Contract Transfer (0% Platform Fee)'
                    )}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#38BDF8] font-bold">
                0% Fee
              </span>
            </div>

            {/* Preset TON Amounts */}
            <div className="grid grid-cols-4 gap-1.5" dir="ltr">
              {[2, 5, 10, 25].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTonDepositInput(String(amt))}
                  className={`py-2 rounded-2xl font-mono text-xs font-black border transition-all cursor-pointer ${
                    Number(tonDepositInput) === amt
                      ? 'bg-[#0098EA] text-white border-[#38BDF8] shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),_0_8px_16px_rgba(0,0,0,0.45)]'
                      : 'bg-white/5 text-slate-300 border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_6px_14px_rgba(0,0,0,0.4)] hover:text-white'
                  }`}
                >
                  {amt} TON
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={tonDepositInput}
                onChange={(e) => setTonDepositInput(e.target.value)}
                className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-3 py-2.5 font-mono text-sm font-black text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:border-[#0098EA]"
                dir="ltr"
                placeholder="Amount in TON"
              />
              <button
                disabled={busy}
                onClick={handleTonDeposit}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {connectedTonWallet
                    ? tr(
                        lang,
                        `پرداخت خودکار (${connectedTonWallet.provider})`,
                        `Auto-Pay (${connectedTonWallet.provider})`
                      )
                    : tr(lang, 'اتصال و شارژ خودکار TON', 'Connect & Deposit TON')}
                </span>
              </button>
            </div>

            {/* Direct Vault Address + Manual TXID Verification */}
            <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {tr(
                    lang,
                    'آدرس خزانه رسمی TON (واریز مستقیم از هر کیف پول):',
                    'Official TON Treasury Vault Address:'
                  )}
                </span>
                <button
                  onClick={handleCopyVault}
                  className="flex items-center gap-1 text-[#00F5D4] font-bold cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>
                    {copiedAddr ? tr(lang, 'کپی شد', 'Copied') : tr(lang, 'کپی آدرس', 'Copy')}
                  </span>
                </button>
              </div>
              <div className="font-mono text-[10px] text-slate-300 truncate" dir="ltr">
                {adminTonWalletAddress}
              </div>
              <div className="pt-1 border-t border-white/10 flex items-center gap-1.5">
                <input
                  type="text"
                  value={manualTxProofInput}
                  onChange={(e) => setManualTxProofInput(e.target.value)}
                  placeholder={tr(
                    lang,
                    'کد پیگیری / هش تراکنش (TXID یا BOC) جهت تایید مستقیم',
                    'Paste TXID or signed BOC for on-chain verification'
                  )}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 font-mono text-[10px] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:border-[#00F5D4]"
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          {/* Telegram Stars Instant Invoice Card */}
          <section className="rounded-3xl p-4 bg-[#110C22]/90 border border-[#FFD700]/35 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <div>
                  <h2 className="text-xs font-black text-white">
                    {tr(
                      lang,
                      'شارژ ۱-کلیکی با ستاره‌های تلگرام (Telegram Stars)',
                      '1-Tap Top-Up with Telegram Stars (XTR)'
                    )}
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    {tr(
                      lang,
                      'پرداخت درون‌برنامه‌ای رسمی تلگرام بدون نیاز به کیف پول خارجی',
                      'Official in-app Telegram Stars invoice — no external wallet needed'
                    )}
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-[#FFE066]" />
            </div>

            <div className="grid grid-cols-2 gap-2" dir="ltr">
              {[
                { stars: 100, label: tr(lang, 'بسته استارتر', 'Starter Pack') },
                { stars: 250, label: tr(lang, 'محبوب‌ترین', 'Most Popular') },
                { stars: 500, label: tr(lang, 'بسته حرفه‌ای', 'Pro Pack') },
                { stars: 1250, label: tr(lang, 'بسته VIP', 'VIP Whale Pack') },
              ].map((pkg) => (
                <button
                  key={pkg.stars}
                  disabled={busy}
                  onClick={() => handleStarsDeposit(pkg.stars)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                    starsDepositInput === pkg.stars
                      ? 'bg-gradient-to-br from-[#FFE066]/25 to-[#B8860B]/20 border-[#FFE066] shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),_0_10px_20px_rgba(0,0,0,0.5)]'
                      : 'bg-white/[0.03] border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.14),_0_8px_16px_rgba(0,0,0,0.45)] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#FFE066]">
                      ⭐ {pkg.stars} Stars
                    </span>
                    <span className="text-[9px] font-sans text-slate-300">
                      {pkg.label}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300 mt-1">
                    {tr(lang, 'شارژ آنی درون تلگرام', 'Instant Telegram Invoice')}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 3B. WITHDRAW VIEW */}
      {subTab === 'WITHDRAW' && (
        <section className="rounded-3xl p-4 bg-[#110C22]/90 border border-white/15 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white">
              {tr(
                lang,
                `برداشت آنی جوایز (${activeTmaCurrency === 'TON' ? '💎 TON' : '⭐ Stars'})`,
                `Instant Prize Withdrawal (${activeTmaCurrency === 'TON' ? '💎 TON' : '⭐ Stars'})`
              )}
            </h2>
            <span className="font-mono text-xs font-bold text-[#00F5D4]" dir="ltr">
              {tr(lang, 'موجودی:', 'Available:')}{' '}
              {activeTmaCurrency === 'TON'
                ? formatCurrency(tonBalance, 'TON')
                : formatCurrency(starsBalance, 'STARS')}
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-300">
              {tr(
                lang,
                `مبلغ برداشت (${activeTmaCurrency}):`,
                `Withdrawal Amount (${activeTmaCurrency}):`
              )}
            </label>
            <input
              type="number"
              value={withdrawAmountInput}
              onChange={(e) => setWithdrawAmountInput(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-2xl px-3 py-2.5 font-mono text-sm font-black text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:border-[#FFE066]"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-300">
              {activeTmaCurrency === 'TON'
                ? tr(
                    lang,
                    'آدرس کیف پول مقصد TON (UQ... یا EQ...):',
                    'Destination TON Wallet Address (UQ... or EQ...):'
                  )
                : tr(lang, 'آیدی تلگرام مقصد (@username):', 'Destination Telegram Handle (@username):')}
            </label>
            <input
              type="text"
              value={
                withdrawDestination ||
                (activeTmaCurrency === 'TON'
                  ? connectedTonWallet?.address || ''
                  : `@${telegramUser.username || telegramUser.first_name}`)
              }
              onChange={(e) => setWithdrawDestination(e.target.value)}
              placeholder={
                activeTmaCurrency === 'TON' ? 'UQ...' : '@telegram_username'
              }
              className="w-full bg-black/50 border border-white/15 rounded-2xl px-3 py-2.5 font-mono text-xs text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:outline-none focus:border-[#00F5D4]"
              dir="ltr"
            />
          </div>

          <button
            disabled={busy}
            onClick={handleWithdraw}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 font-black text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_10px_20px_rgba(0,0,0,0.5)] cursor-pointer active:scale-98"
          >
            {tr(
              lang,
              '🚀 ثبت و تسویه آنی برداشت در بلاکچین TON',
              '🚀 Submit & Settle On-Chain TON Withdrawal'
            )}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#00F5D4] shrink-0" />
            <span>
              {tr(
                lang,
                'تسویه خودکار مبالغ خرد در کمتر از ۱۰ ثانیه انجام می‌شود.',
                'Standard withdrawals are processed swiftly with cryptographic escrow verification.'
              )}
            </span>
          </div>
        </section>
      )}

      {/* 3C. PAM LEDGER HISTORY */}
      {subTab === 'HISTORY' && (
        <section className="rounded-3xl p-3.5 bg-[#110C22]/90 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_10px_20px_rgba(0,0,0,0.5)] space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-white">
              {tr(
                lang,
                'تراکنش‌های اخیر دفترکل یکپارچه (PAM Ledger)',
                'Recent PAM Seamless Wallet Ledger'
              )}
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              {pamLedger.length} TXs
            </span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
            {pamLedger.slice(0, 15).map((entry) => {
              const isCredit = entry.type === 'CREDIT' || entry.type === 'BONUS';
              const entryCur = entry.currency || 'TON';
              const displayAmt =
                entryCur === 'STARS' && typeof entry.amountStars === 'number'
                  ? formatCurrency(entry.amountStars, 'STARS')
                  : formatCurrency(entry.amountTon ?? 0, 'TON');
              return (
                <div
                  key={entry.transactionUuid}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.16),_0_8px_16px_rgba(0,0,0,0.45)]"
                >
                  <div className="min-w-0 pr-1">
                    <div className="text-xs font-bold text-white truncate">
                      {entry.note}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5" dir="ltr">
                      {entry.vertical} • {entry.roundId}
                    </div>
                  </div>
                  <div
                    className={`font-mono text-xs font-black shrink-0 ${
                      isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                    dir="ltr"
                  >
                    {isCredit ? '+' : '-'}
                    {displayAmt}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};
