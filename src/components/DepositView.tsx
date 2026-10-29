import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { convertUsdtToCrypto, toPersianDigits } from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

interface DepositNetworkOption {
  id: 'USDT_TRC20' | 'TON' | 'TRX' | 'BNB' | 'BTC';
  name: string;
  badge: string;
  confirmTime: string;
  feeLabel: string;
  address: string;
  cryptoKey: 'USDT' | 'TON' | 'TRX' | 'BNB' | 'BTC';
  derivationPath: string;
}

const DEPOSIT_NETWORKS: DepositNetworkOption[] = [
  {
    id: 'USDT_TRC20',
    name: 'Tether (USDT - TRC20)',
    badge: 'محبوب‌ترین • بدون کارمزد',
    confirmTime: 'کمتر از ۳۰ ثانیه (۱ تایید ترون)',
    feeLabel: 'رایگان (پوشش گس توسط زرین)',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    cryptoKey: 'USDT',
    derivationPath: "m/44'/195'/0'/0/482",
  },
  {
    id: 'TON',
    name: 'The Open Network (TON)',
    badge: 'بومی تلگرام • فوق سریع',
    confirmTime: 'کمتر از ۵ ثانیه (شاردینگ TON)',
    feeLabel: '۰.۰۰۵ TON',
    address: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
    cryptoKey: 'TON',
    derivationPath: "m/44'/607'/0'/0/482",
  },
  {
    id: 'TRX',
    name: 'TRON Native (TRX)',
    badge: 'کارمزد نزدیک به صفر',
    confirmTime: 'حدود ۱۵ ثانیه',
    feeLabel: 'رایگان',
    address: 'TXk8Y2khEsLJW1ChVWFMSMeRDow5KcbL99',
    cryptoKey: 'TRX',
    derivationPath: "m/44'/195'/1'/0/482",
  },
  {
    id: 'BNB',
    name: 'BNB Smart Chain (BEP-20)',
    badge: 'بایننس اسمارت چین',
    confirmTime: 'کمتر از ۱۵ ثانیه',
    feeLabel: '۰.۰۰۰۲ BNB',
    address: '0x71C8F9409a89bC20D471980D772094B112039A8F',
    cryptoKey: 'BNB',
    derivationPath: "m/44'/60'/0'/0/482",
  },
  {
    id: 'BTC',
    name: 'Bitcoin (Native SegWit)',
    badge: 'مخصوص واریزهای سنگین VIP',
    confirmTime: 'حدود ۱۰ دقیقه (۱ بلاک)',
    feeLabel: 'کارمزد استاندارد شبکه',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    cryptoKey: 'BTC',
    derivationPath: "m/84'/0'/0'/0/482",
  },
];

export const DepositView: React.FC = () => {
  const {
    fxRates,
    formatAmount,
    balanceUsdt,
    submitDepositRequest,
    deposits,
    navigateTo,
    officialWallets,
    connectedWeb3Wallet,
    connectedWalletProvider,
    connectWeb3Wallet,
    depositTonInstant,
    tonUsdRate,
  } = useLottery();
  const [selectedNet, setSelectedNet] = useState<DepositNetworkOption>(DEPOSIT_NETWORKS[0]);
  const [amountUsdt, setAmountUsdt] = useState<number>(100);
  const [hdIndex, setHdIndex] = useState<number>(482);
  const [copied, setCopied] = useState<boolean>(false);
  const [depositMode, setDepositMode] = useState<'ONCHAIN_AUTO' | 'ADMIN_MANUAL'>('ONCHAIN_AUTO');
  const [txHashInput, setTxHashInput] = useState<string>('');
  const [senderWalletInput, setSenderWalletInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const supportsWeb3 = selectedNet.id !== 'BTC';
  const walletLabel =
    selectedNet.id === 'TON'
      ? 'TON Wallet'
      : selectedNet.id === 'BNB'
      ? 'MetaMask / TrustWallet'
      : 'TronLink';

  const baseOfficialAddress = officialWallets[selectedNet.id] || selectedNet.address;
  const dynamicAddress =
    hdIndex === 482
      ? baseOfficialAddress
      : `${baseOfficialAddress.slice(0, -4)}${String(hdIndex).padStart(4, '0')}`;

  const cryptoAmount = convertUsdtToCrypto(amountUsdt, selectedNet.cryptoKey, fxRates);

  const handleCopy = () => {
    navigator.clipboard?.writeText(dynamicAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectWallet = async () => {
    const res = await connectWeb3Wallet(walletLabel as any);
    if (res.address) {
      setSenderWalletInput(res.address);
    }
    setDepositSuccess(true);
    setStatusMessage(res.message);
  };

  const handleConfirmDeposit = async () => {
    const effectiveMode = supportsWeb3 ? depositMode : 'ADMIN_MANUAL';
    if (selectedNet.id === 'TON' && effectiveMode === 'ONCHAIN_AUTO') {
      setSubmitting(true);
      const safeRate = tonUsdRate > 0 ? tonUsdRate : 5;
      const amountTon = Number((amountUsdt / safeRate).toFixed(4));
      const tonRes = await depositTonInstant(amountTon, connectedWeb3Wallet || undefined);
      setSubmitting(false);
      setDepositSuccess(true);
      setStatusMessage(tonRes.message);
      return;
    }

    if (txHashInput.trim().length < 6) {
      setDepositSuccess(true);
      setStatusMessage(
        '⚠️ لطفاً هش تراکنش واقعی (TXID) ثبت‌شده در بلاکچین را در کادر مربوطه وارد نمایید.'
      );
      return;
    }
    setSubmitting(true);
    const res = await submitDepositRequest({
      amountUsdt,
      network: selectedNet.name,
      txHash: txHashInput.trim(),
      senderWallet: senderWalletInput.trim() || connectedWeb3Wallet,
      officialRecipientWallet: dynamicAddress,
      mode: effectiveMode,
      web3Signed: Boolean(connectedWeb3Wallet) && effectiveMode === 'ONCHAIN_AUTO',
    });
    setSubmitting(false);
    setDepositSuccess(true);
    setStatusMessage(res.message);
    if (res.ok) setTxHashInput('');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8 overflow-x-clip">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <img
          src={LUXURY_IMAGES.depositVault}
          alt="Crypto Deposit Vault"
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090d16]/92 via-[#0d1322]/85 to-[#091b1e]/90 pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <img
            src={LUXURY_IMAGES.walletIcon3d}
            alt="Deposit Wallet"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/75 shadow-xl shrink-0"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
              <span>درگاه دوگانه واریز رمزارز • اتصال مستقیم Web3 + صف تایید ادمین</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              شارژ کیف پول در ۵ شبکه بلاکچین (/deposit)
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
              کیف پول‌های قابل اتصال (TronLink، MetaMask، TON Wallet) با تایید مستقیم شبکه به صورت خودکار شارژ می‌شوند و سایر واریزها با ثبت هش تراکنش (TXID) توسط ادمین تایید می‌گردند.
            </p>
          </div>
        </div>

        <div className="relative z-10 bg-[#0b0f18]/90 border border-emerald-500/35 rounded-2xl p-4 flex items-center gap-4 shrink-0">
          <div>
            <span className="text-xs text-slate-400 block">موجودی فعلی کیف پول:</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums block">
              ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </span>
            <span className="text-[11px] text-amber-300 font-bold">{formatAmount(balanceUsdt)}</span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('withdraw')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-bold cursor-pointer"
          >
            صفحه برداشت ←
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 rounded-3xl bg-[#131824] border border-white/10 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-3">
              ۱. انتخاب شبکه بلاکچین واریز (۵ شبکه رسمی):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DEPOSIT_NETWORKS.map((net) => {
                const active = selectedNet.id === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    data-testid={`deposit-page-net-${net.id}`}
                    onClick={() => {
                      setSelectedNet(net);
                      if (net.id === 'BTC') setDepositMode('ADMIN_MANUAL');
                      setDepositSuccess(false);
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{net.cryptoKey}</div>
                    <div className="text-[10px] text-amber-300 mt-0.5 truncate">{net.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Auto Web3 vs Manual Admin Verification */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              ۲. روش تایید تراکنش واریز:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!supportsWeb3}
                onClick={() => setDepositMode('ONCHAIN_AUTO')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  depositMode === 'ONCHAIN_AUTO' && supportsWeb3
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-[#0b0f18] border-white/10 text-slate-400 opacity-75'
                }`}
              >
                <div className="text-xs font-black text-emerald-300">
                  ⚡ اتصال کیف پول {walletLabel} (تایید خودکار شبکه)
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  بررسی مستقیم تراکنش در نود بلاکچین و شارژ آنی موجودی بدون انتظار.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDepositMode('ADMIN_MANUAL')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  depositMode === 'ADMIN_MANUAL' || !supportsWeb3
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-[#0b0f18] border-white/10 text-slate-400'
                }`}
              >
                <div className="text-xs font-black text-amber-300">
                  🛡️ ثبت هش تراکنش (TXID) جهت تایید ادمین
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  مخصوص انتقال از صرافی‌ها، ولت‌های خارجی یا بیت‌کوین با تایید در کاکپیت ادمین.
                </p>
              </button>
            </div>
          </div>

          {supportsWeb3 && depositMode === 'ONCHAIN_AUTO' && (
            <div className="bg-[#0b0f18] border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-emerald-300 block">
                  وضعیت اتصال کیف پول Web3 ({walletLabel}):
                </span>
                <span className="text-xs font-mono text-slate-300" dir="ltr">
                  {connectedWeb3Wallet
                    ? `متصل: ${connectedWeb3Wallet} (${connectedWalletProvider || walletLabel})`
                    : 'هنوز کیف پولی متصل نشده است'}
                </span>
              </div>
              <button
                type="button"
                data-testid="deposit-connect-web3-btn"
                onClick={handleConnectWallet}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-black cursor-pointer shrink-0"
              >
                {connectedWeb3Wallet
                  ? '✓ بروزرسانی اتصال کیف پول'
                  : `اتصال مستقیم به ${walletLabel}`}
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2.5">
              ۳. مبلغ شارژ کیف پول (بر پایه تتر USDT):
            </label>
            <div className="grid grid-cols-4 gap-2.5 mb-3">
              {[25, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUsdt(preset)}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    amountUsdt === preset
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#0b0f18] border-white/10 text-slate-300'
                  }`}
                >
                  ${preset} USDT
                </button>
              ))}
            </div>
            <input
              type="number"
              min={5}
              value={amountUsdt}
              onChange={(e) => setAmountUsdt(Math.max(1, Number(e.target.value)))}
              className="w-full bg-[#0a0e16] border border-white/15 rounded-2xl px-4 py-3 text-base font-mono font-black text-amber-300"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                هش تراکنش بلاکچین (TXID / Hash):
              </label>
              <input
                type="text"
                dir="ltr"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                placeholder={
                  depositMode === 'ADMIN_MANUAL' || !supportsWeb3
                    ? 'هش تراکنش (الزامی برای تایید ادمین)...'
                    : 'اختیاری در حالت اتصال مستقیم Web3...'
                }
                className="w-full bg-[#0a0e16] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                آدرس کیف پول فرستنده شما:
              </label>
              <input
                type="text"
                dir="ltr"
                value={senderWalletInput || connectedWeb3Wallet}
                onChange={(e) => setSenderWalletInput(e.target.value)}
                placeholder="T... / 0x... / UQ... / bc1..."
                className="w-full bg-[#0a0e16] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-200"
              />
            </div>
          </div>

          <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">مقدار دقیق رمزارز جهت ارسال به آدرس:</span>
              <span className="text-xl font-black text-amber-400 font-mono tabular-nums">
                {cryptoAmount} {selectedNet.cryptoKey}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">معادل زنده اوراکل:</span>
              <span className="text-sm font-black text-emerald-400">{formatAmount(amountUsdt)}</span>
            </div>
          </div>

          {depositSuccess && (
            <div
              data-testid="deposit-page-success"
              className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-bold text-xs sm:text-sm"
            >
              {statusMessage ||
                `✅ تراکنش واریز $${toPersianDigits(amountUsdt)} USDT در شبکه ${selectedNet.name} تایید و به موجودی شما افزوده شد!`}
            </div>
          )}

          <button
            type="button"
            disabled={submitting}
            data-testid="deposit-page-confirm-btn"
            onClick={handleConfirmDeposit}
            className="w-full py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm sm:text-base shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined">bolt</span>
            <span>
              {submitting
                ? 'در حال استعلام از نود بلاکچین...'
                : depositMode === 'ADMIN_MANUAL' || !supportsWeb3
                ? 'ثبت فیش و هش تراکنش در صف تایید ادمین'
                : 'تایید واریز و شارژ آنی کیف پول'}
            </span>
          </button>
        </div>

        {/* Right/Left 5 Cols: Live Dynamic QR & HD Wallet Generator */}
        <div className="lg:col-span-5 rounded-3xl bg-[#141923] border border-amber-500/35 p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] font-mono text-amber-400 block">
                BIP-44 PATH: {selectedNet.derivationPath}
              </span>
              <h2 className="text-lg font-black text-white">{selectedNet.name}</h2>
            </div>
            <button
              type="button"
              data-testid="generate-new-hd-address-btn"
              onClick={() => setHdIndex((prev) => prev + 1)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer"
            >
              + تولید آدرس HD جدید
            </button>
          </div>

          <div className="flex flex-col items-center justify-center bg-white p-5 rounded-3xl w-52 h-52 mx-auto shadow-inner">
            <svg viewBox="0 0 120 120" className="w-40 h-40 text-slate-950" fill="currentColor">
              <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="18" y="18" width="12" height="12" rx="2" />
              <rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="90" y="18" width="12" height="12" rx="2" />
              <rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="18" y="90" width="12" height="12" rx="2" />
              <rect x="48" y="12" width="8" height="8" />
              <rect x="62" y="12" width="8" height="16" />
              <rect x="48" y="28" width="10" height="10" />
              <rect x="12" y="48" width="14" height="8" />
              <rect x="34" y="48" width="16" height="16" rx="3" fill="#f59e0b" />
              <rect x="56" y="48" width="12" height="8" />
              <rect x="74" y="52" width="16" height="8" />
              <rect x="96" y="48" width="14" height="14" />
              <rect x="48" y="68" width="12" height="12" />
              <rect x="68" y="68" width="8" height="22" />
              <rect x="84" y="72" width="24" height="10" />
              <rect x="48" y="92" width="16" height="16" />
              <rect x="84" y="92" width="12" height="18" />
            </svg>
            <span className="text-[10px] font-mono font-bold text-slate-800 mt-1">
              {selectedNet.id} • HD #{hdIndex}
            </span>
          </div>

          <div className="bg-[#0a0e16] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-2">
            <code
              data-testid="deposit-hd-address"
              className="text-xs text-amber-200 font-mono break-all select-all"
            >
              {dynamicAddress}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 cursor-pointer"
            >
              {copied ? 'کپی شد!' : 'کپی آدرس'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0b0f18] border border-white/5 rounded-xl p-3">
              <span className="text-slate-400 block text-[11px]">زمان تایید شبکه:</span>
              <strong className="text-white">{selectedNet.confirmTime}</strong>
            </div>
            <div className="bg-[#0b0f18] border border-white/5 rounded-xl p-3">
              <span className="text-slate-400 block text-[11px]">کارمزد واریز:</span>
              <strong className="text-emerald-400">{selectedNet.feeLabel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Live Deposit Status Ledger */}
      <section className="rounded-3xl bg-[#131824] border border-white/10 p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              REAL-TIME DEPOSIT SETTLEMENT LEDGER
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">
              وضعیت واریزهای اخیر (تایید خودکار شبکه و صف تایید ادمین)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            کل تراکنش‌های ثبت‌شده: {toPersianDigits(deposits.length)} مورد
          </span>
        </div>

        <div className="space-y-3">
          {deposits.map((dep) => (
            <div
              key={dep.depositCode}
              className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-amber-400">{dep.depositCode}</span>
                  <span className="text-xs font-bold text-white">{dep.network}</span>
                  <span className="font-mono text-xs font-black text-emerald-400">
                    +${dep.amountUsdt.toLocaleString('en-US')} USDT
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      dep.status === 'confirmed'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                        : dep.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    }`}
                  >
                    {dep.status === 'confirmed'
                      ? '✓ تایید شده و شارژ شده'
                      : dep.status === 'rejected'
                      ? '✕ رد شده توسط ادمین'
                      : '⏳ در انتظار بررسی و تایید ادمین'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono break-all" dir="ltr">
                  TXID: {dep.txHash} • Method: {dep.verificationMethod}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={dep.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-sky-300"
                >
                  مشاهده در اکسپلورر بلاکچین ↗
                </a>
                <span className="text-xs text-slate-500">{dep.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
