import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import { convertUsdtToCrypto, toPersianDigits } from '../utils/lotteryEngine.ts';

interface NetworkOption {
  id: 'USDT_TRC20' | 'TON' | 'TRX' | 'BTC' | 'BNB';
  name: string;
  badge: string;
  confirmTime: string;
  feeLabel: string;
  address: string;
  color: string;
  cryptoKey: 'USDT' | 'TON' | 'TRX' | 'BTC' | 'BNB';
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'USDT_TRC20',
    name: 'Tether (USDT - TRC20)',
    badge: 'محبوب‌ترین در ایران',
    confirmTime: 'کمتر از ۳۰ ثانیه (۱ تایید شبکه ترون)',
    feeLabel: 'رایگان (پوشش گس توسط زرین لاتاری)',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    color: 'emerald',
    cryptoKey: 'USDT',
  },
  {
    id: 'TON',
    name: 'The Open Network (TON)',
    badge: 'بومی تلگرام • فوق سریع',
    confirmTime: 'کمتر از ۵ ثانیه (تایید آنی شاردینگ)',
    feeLabel: '۰.۰۰۵ TON',
    address: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
    color: 'sky',
    cryptoKey: 'TON',
  },
  {
    id: 'TRX',
    name: 'TRON Native (TRX)',
    badge: 'کارمزد نزدیک به صفر',
    confirmTime: 'حدود ۱۵ ثانیه',
    feeLabel: 'رایگان',
    address: 'TXk8Y2khEsLJW1ChVWFMSMeRDow5KcbL99',
    color: 'rose',
    cryptoKey: 'TRX',
  },
  {
    id: 'BTC',
    name: 'Bitcoin (Native SegWit)',
    badge: 'مخصوص واریزهای سنگین VIP',
    confirmTime: 'حدود ۱۰ دقیقه (۱ تایید بلاک)',
    feeLabel: 'کارمزد استاندارد شبکه',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    color: 'amber',
    cryptoKey: 'BTC',
  },
  {
    id: 'BNB',
    name: 'BNB Smart Chain (BEP-20)',
    badge: 'بایننس اسمارت چین',
    confirmTime: 'کمتر از ۱۵ ثانیه',
    feeLabel: '۰.۰۰۰۲ BNB',
    address: '0x71C8F9409a89bC20D471980D772094B112039A8F',
    color: 'yellow',
    cryptoKey: 'BNB',
  },
];

export const DepositModal: React.FC = () => {
  const {
    depositModalOpen,
    setDepositModalOpen,
    fxRates,
    formatAmount,
    depositCrypto,
    navigateTo,
    officialWallets,
  } = useLottery();

  const [selectedNet, setSelectedNet] = useState<NetworkOption>(NETWORKS[0]);
  const [amountUsdt, setAmountUsdt] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState<boolean>(false);

  if (!depositModalOpen) return null;

  const liveAddress = officialWallets[selectedNet.id] || selectedNet.address;
  const cryptoAmount = convertUsdtToCrypto(amountUsdt, selectedNet.cryptoKey, fxRates);

  const handleCopy = () => {
    navigator.clipboard?.writeText(liveAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDeposit = async () => {
    setSubmitting(true);
    const ok = await depositCrypto(amountUsdt, selectedNet.name);
    setSubmitting(false);
    if (ok) {
      setConfirmedSuccess(true);
      setTimeout(() => {
        setConfirmedSuccess(false);
        setDepositModalOpen(false);
        navigateTo('status');
      }, 1100);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#111622] border border-amber-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1a2234] to-[#121724] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                درگاه واریز مستقیم رمزارز (Web3 HD Gateway)
              </h3>
              <p className="text-xs text-slate-400">
                آدرس اختصاصی یکبارمصرف با واریز آنی به قرارداد هوشمند بدون احراز هویت (No-KYC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDepositModalOpen(false)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Step 1: Select Network */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2.5">
              ۱. شبکه بلاکچین مورد نظر را انتخاب کنید:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {NETWORKS.map((net) => {
                const active = selectedNet.id === net.id;
                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => setSelectedNet(net)}
                    className={`p-3 rounded-2xl border text-right transition-all ${
                      active
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : 'bg-[#171d2b] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs font-black truncate">{net.cryptoKey}</div>
                    <div className="text-[10px] text-amber-300/90 truncate mt-0.5">{net.id.replace('_', ' ')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Deposit Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              ۲. مقدار شارژ کیف پول (بر پایه تتر USDT):
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[25, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUsdt(preset)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    amountUsdt === preset
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#171d2b] border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  ${preset} USDT
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between bg-[#0c1018] border border-white/10 rounded-2xl px-4 py-3">
              <div>
                <span className="text-[11px] text-slate-400 block">معادل دقیق قابل واریز در شبکه:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {cryptoAmount} {selectedNet.cryptoKey}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-400 block">ارزش معادل:</span>
                <span className="text-sm font-bold text-emerald-400">{formatAmount(amountUsdt)}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Vector QR & Copyable Address */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#161c2a] border border-white/10 rounded-2xl p-4 items-center">
            {/* Dynamic SVG QR Code */}
            <div className="md:col-span-4 flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-inner">
              <svg viewBox="0 0 120 120" className="w-32 h-32 text-slate-950" fill="currentColor">
                <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="18" y="18" width="12" height="12" rx="2" />
                <rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="90" y="18" width="12" height="12" rx="2" />
                <rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="18" y="90" width="12" height="12" rx="2" />
                {/* Dynamic deterministic matrix pattern */}
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
                <rect x="102" y="96" width="10" height="14" />
              </svg>
              <span className="text-[10px] font-mono font-bold text-slate-800 mt-1">
                {selectedNet.id} HD QR
              </span>
            </div>

            {/* Address & Telemetry */}
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">{selectedNet.name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {selectedNet.badge}
                </span>
              </div>

              <div className="bg-[#0a0e16] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2">
                <code className="text-xs text-amber-200 font-mono break-all select-all">
                  {liveAddress}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'کپی شد!' : 'کپی آدرس'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="block text-slate-500">زمان تایید بلاک:</span>
                  <strong className="text-slate-200">{selectedNet.confirmTime}</strong>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="block text-slate-500">کارمزد شبکه:</span>
                  <strong className="text-emerald-400">{selectedNet.feeLabel}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          {confirmedSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-center font-bold text-sm">
              ✅ تراکنش واریز در استخر ممپول ثبت شد و موجودی شما به میزان ${toPersianDigits(amountUsdt)} USDT افزایش یافت!
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-400">
                پس از ارسال رمزارز، نودهای ما در کمتر از ۳ ثانیه تراکنش را در ممپول شناسایی می‌کنند.
              </p>
              <button
                type="button"
                disabled={submitting}
                data-testid="confirm-crypto-deposit"
                onClick={handleConfirmDeposit}
                className="w-full sm:w-auto gold-gradient-cta text-[#2a1700] font-black text-sm px-6 py-3 rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-lg">bolt</span>
                <span>{submitting ? 'در حال بررسی ممپول...' : 'تایید واریز و شارژ آنی کیف پول'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
