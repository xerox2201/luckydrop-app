import React, { useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  WithdrawalNetwork,
  validateCryptoWithdrawalAddress,
  calculateWithdrawalFeeAndNet,
  toPersianDigits,
} from '../utils/lotteryEngine.ts';
import { LUXURY_IMAGES } from './PageHeroBanner.tsx';

interface NetworkMeta {
  network: WithdrawalNetwork;
  shortLabel: string;
  sampleAddress: string;
  badge: string;
  minUsdt: number;
}

const WITHDRAW_NETWORKS: NetworkMeta[] = [
  {
    network: 'USDT (TRC-20)',
    shortLabel: 'USDT • TRC-20',
    sampleAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    badge: 'تسویه آنی زیر ۶۰ ثانیه',
    minUsdt: 10,
  },
  {
    network: 'TON Network',
    shortLabel: 'TON • Telegram',
    sampleAddress: 'UQDk8Y2khEsLJW1ChVWFMSMeRDow5KcbLSE_ZarrinVIP',
    badge: 'شاردینگ بومی تلگرام',
    minUsdt: 5,
  },
  {
    network: 'TRON (TRX)',
    shortLabel: 'TRX • Native',
    sampleAddress: 'TXk8Y2khEsLJW1ChVWFMSMeRDow5KcbL99',
    badge: 'کمترین کارمزد گس',
    minUsdt: 5,
  },
  {
    network: 'BNB (BEP-20)',
    shortLabel: 'BNB • BEP-20',
    sampleAddress: '0x71C8F9409a89bC20D471980D772094B112039A8F',
    badge: 'بایننس اسمارت چین',
    minUsdt: 10,
  },
  {
    network: 'Bitcoin (BTC)',
    shortLabel: 'BTC • SegWit',
    sampleAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    badge: 'تسویه سنگین VIP',
    minUsdt: 50,
  },
];

export const WithdrawView: React.FC = () => {
  const {
    balanceUsdt,
    fxRates,
    formatAmount,
    withdrawals,
    requestWithdrawal,
    killSwitchActive,
    navigateTo,
    isTelegramAdmin,
  } = useLottery();

  const [selectedNet, setSelectedNet] = useState<NetworkMeta>(WITHDRAW_NETWORKS[0]);
  const [destinationAddress, setDestinationAddress] = useState<string>(
    WITHDRAW_NETWORKS[0].sampleAddress
  );
  const [amountUsdt, setAmountUsdt] = useState<number>(150);
  const [step, setStep] = useState<'FORM' | '2FA_CONFIRM'>('FORM');
  const [pinCode, setPinCode] = useState<string>('123456');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const addressValidation = validateCryptoWithdrawalAddress(
    selectedNet.network,
    destinationAddress
  );
  const feeEstimate = calculateWithdrawalFeeAndNet(
    amountUsdt,
    selectedNet.network,
    fxRates
  );

  const handleSelectNetwork = (net: NetworkMeta) => {
    setSelectedNet(net);
    setDestinationAddress(net.sampleAddress);
    setErrorMsg(null);
    setSuccessMsg(null);
    setStep('FORM');
  };

  const handleProceedTo2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!addressValidation.valid) {
      setErrorMsg(addressValidation.errorFa || 'فرمت آدرس مقصد نامعتبر است.');
      return;
    }
    if (amountUsdt < selectedNet.minUsdt) {
      setErrorMsg(`حداقل مبلغ برداشت در شبکه ${selectedNet.network} برابر $${selectedNet.minUsdt} USDT است.`);
      return;
    }
    if (amountUsdt > balanceUsdt) {
      setErrorMsg('مبلغ درخواستی از موجودی قابل برداشت کیف پول شما بیشتر است.');
      return;
    }
    setStep('2FA_CONFIRM');
  };

  const handleConfirm2FAAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (pinCode.trim().length < 4) {
      setErrorMsg('لطفاً کد ۶ رقمی تایید دو مرحله‌ای (2FA / PIN) را وارد نمایید.');
      return;
    }
    setSubmitting(true);
    const res = await requestWithdrawal({
      network: selectedNet.network,
      destinationAddress: destinationAddress.trim(),
      amountUsdt,
    });
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'خطا در ثبت درخواست برداشت');
      return;
    }
    setStep('FORM');
    setSuccessMsg(
      `درخواست برداشت شما با کد رهگیری ${res.withdrawal?.withdrawalCode} ثبت شد و در صف پردازش خودکار قرار گرفت.`
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8 overflow-x-clip">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
        <img
          src={LUXURY_IMAGES.withdrawVault}
          alt="Instant Withdrawal Hardware Wallet"
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090d16]/92 via-[#0e1422]/85 to-[#091c18]/90 pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center gap-4">
          <img
            src={LUXURY_IMAGES.walletIcon3d}
            alt="Withdraw Wallet"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400/75 shadow-xl shrink-0"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">payments</span>
              <span>موتور تسویه آنی جوایز و برداشت رمزارز • Multi-Chain Cash-Out Engine</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              کنسول برداشت آنی جوایز و موجودی کیف پول (/withdraw)
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
              تسویه خودکار زیر ۹۰ ثانیه از طریق کیف پول گرم برای مبالغ زیر ۱۰,۰۰۰ دلار و تسویه چندامضایی Gnosis Safe برای جک‌پات‌های سنگین بدون نیاز به KYC.
            </p>
          </div>
        </div>

        <div className="relative z-10 bg-[#0b0f18]/90 border border-amber-500/35 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
          <div>
            <span className="text-xs text-slate-400 block">موجودی قابل برداشت شما:</span>
            <span
              data-testid="withdraw-available-balance"
              className="text-2xl font-black text-emerald-400 font-mono block mt-0.5"
            >
              ${balanceUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
            <span className="text-[11px] text-amber-300 font-bold block mt-0.5">
              معادل زنده: {formatAmount(balanceUsdt)}
            </span>
          </div>
          {isTelegramAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('cockpit')}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 text-xs text-amber-300 font-bold"
            >
              میز تایید ادمین ←
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Right 7 Cols: Multi-Chain Withdrawal Form & 2FA Confirmation */}
        <div className="lg:col-span-7 rounded-3xl bg-[#131824] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Network Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-3">
              ۱. شبکه مقصد برداشت رمزارز را انتخاب کنید (۵ شبکه فعال):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {WITHDRAW_NETWORKS.map((net) => {
                const isSelected = selectedNet.network === net.network;
                return (
                  <button
                    key={net.network}
                    type="button"
                    data-testid={`withdraw-net-${net.shortLabel.split(' ')[0]}`}
                    onClick={() => handleSelectNetwork(net)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-[#0b0f18] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{net.shortLabel}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 truncate">{net.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {step === 'FORM' ? (
            <form onSubmit={handleProceedTo2FA} className="space-y-5">
              {/* Destination Wallet Address Input + Format Validator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="withdraw-address-input" className="text-xs font-bold text-slate-300">
                    ۲. آدرس کیف پول مقصد در شبکه {selectedNet.network}:
                  </label>
                  <button
                    type="button"
                    onClick={() => setDestinationAddress(selectedNet.sampleAddress)}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    جایگذاری آدرس نمونه معتبر
                  </button>
                </div>
                <input
                  id="withdraw-address-input"
                  type="text"
                  data-testid="withdraw-address-input"
                  value={destinationAddress}
                  onChange={(e) => {
                    setDestinationAddress(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={`آدرس معتبر ${selectedNet.network} را وارد کنید...`}
                  className={`w-full bg-[#0a0e16] border rounded-2xl px-4 py-3 text-xs font-mono text-white focus:outline-none ${
                    addressValidation.valid
                      ? 'border-emerald-500/40 focus:border-emerald-400'
                      : 'border-rose-500/50 focus:border-rose-400'
                  }`}
                  dir="ltr"
                />
                <div className="flex items-center justify-between text-[11px]">
                  {addressValidation.valid ? (
                    <span
                      data-testid="address-valid-badge"
                      className="text-emerald-400 font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>فرمت آدرس شبکه {selectedNet.network} معتبر و تایید شده است.</span>
                    </span>
                  ) : (
                    <span
                      data-testid="address-invalid-badge"
                      className="text-rose-400 font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{addressValidation.errorFa}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Withdrawal Amount + Quick Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="withdraw-amount-input" className="text-xs font-bold text-slate-300">
                    ۳. مبلغ برداشت (بر پایه دلار تتر USDT):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[50, 150, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountUsdt(preset)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-[11px] font-mono text-amber-300 border border-white/10"
                      >
                        ${preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountUsdt(Math.floor(balanceUsdt))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-[11px] font-bold text-emerald-300 border border-emerald-500/30"
                    >
                      کل موجودی (MAX)
                    </button>
                  </div>
                </div>

                <input
                  id="withdraw-amount-input"
                  type="number"
                  min={1}
                  step="any"
                  data-testid="withdraw-amount-input"
                  value={amountUsdt}
                  onChange={(e) => setAmountUsdt(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#0a0e16] border border-white/15 rounded-2xl px-4 py-3 text-base font-mono font-black text-amber-300"
                  dir="ltr"
                />
              </div>

              {/* Live Dynamic Gas Fee Deduction Calculator */}
              <div className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>مبلغ ناخالص درخواستی:</span>
                  <span className="font-mono font-bold text-white">
                    ${feeEstimate.grossAmountUsdt.toFixed(2)} USDT ({formatAmount(feeEstimate.grossAmountUsdt)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>کارمزد لحظه‌ای گس شبکه ({selectedNet.network}):</span>
                  <span className="font-mono font-bold text-rose-400" data-testid="withdraw-gas-fee">
                    -${feeEstimate.networkFeeUsdt.toFixed(2)} USDT
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
                  <span className="font-black text-slate-200">خالص دریافتی در کیف پول مقصد:</span>
                  <div className="text-left">
                    <span
                      data-testid="withdraw-net-crypto"
                      className="font-mono font-black text-base text-emerald-400 block"
                    >
                      {feeEstimate.netAmountCrypto}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (${feeEstimate.netAmountUsdt.toFixed(2)} USDT • {feeEstimate.estimatedArrivalLabel})
                    </span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div
                  data-testid="withdraw-error-msg"
                  className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold"
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div
                  data-testid="withdraw-success-msg"
                  className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold"
                >
                  ✅ {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={killSwitchActive}
                data-testid="withdraw-step1-submit"
                className="w-full py-4 rounded-2xl gold-gradient-cta text-[#2a1700] font-black text-sm sm:text-base shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined">lock_open</span>
                <span>
                  {killSwitchActive
                    ? 'برداشت وجه توسط کلید اضطراری متوقف است'
                    : 'مرحله بعد: تایید امنیتی دو مرحله‌ای (2FA / PIN)'}
                </span>
              </button>
            </form>
          ) : (
            /* Step 2: 2FA / PIN Security Confirmation */
            <form
              onSubmit={handleConfirm2FAAndSubmit}
              data-testid="withdraw-2fa-step"
              className="bg-[#0b0f18] border-2 border-amber-500/40 rounded-3xl p-6 space-y-5 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-400 text-2xl">verified_user</span>
                  <div>
                    <h3 className="text-base font-black text-white">
                      تایید نهایی ۲ مرحله‌ای (2-Step Security Verification)
                    </h3>
                    <p className="text-xs text-slate-400">
                      انتقال خالص <strong className="text-emerald-400 font-mono">{feeEstimate.netAmountCrypto}</strong> به آدرس{' '}
                      <code className="text-amber-300 font-mono">{destinationAddress.slice(0, 12)}...</code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-xs text-slate-400 hover:text-white font-bold"
                >
                  بازگشت و ویرایش
                </button>
              </div>

              <div>
                <label htmlFor="withdraw-pin-input" className="block text-xs font-bold text-slate-300 mb-2">
                  کد ۶ رقمی Google Authenticator یا پین امنیتی VIP (کد آزمایشی: 123456):
                </label>
                <input
                  id="withdraw-pin-input"
                  type="text"
                  maxLength={6}
                  data-testid="withdraw-2fa-pin-input"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full bg-[#141923] border border-amber-500/40 rounded-2xl px-4 py-3 text-center text-xl font-mono font-black tracking-[0.4em] text-amber-300"
                  dir="ltr"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="withdraw-confirm-final-btn"
                  className="py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  <span>
                    {submitting
                      ? 'در حال ارسال به قرارداد هوشمند...'
                      : 'تایید نهایی و ثبت در صف پرداخت آنی'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right/Left 5 Cols: Pending Withdrawal Queue & Live Status Tracker */}
        <div className="lg:col-span-5 rounded-3xl bg-[#141923] border border-white/10 p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-400">LIVE WITHDRAWAL PIPELINE</span>
              <h2 className="text-lg font-black text-white mt-0.5">
                صف برداشت‌های اخیر و وضعیت شبکه ({toPersianDigits(withdrawals.length)})
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-mono font-bold">
              AUTO-SWEEP READY
            </span>
          </div>

          <div className="space-y-3" data-testid="withdrawal-queue-list">
            {withdrawals.map((item) => {
              const isCompleted = item.status === 'completed';
              const isBroadcasting = item.status === 'broadcasting';
              const isRejected = item.status === 'rejected';

              return (
                <div
                  key={item.withdrawalCode}
                  data-testid={`withdrawal-item-${item.withdrawalCode}`}
                  className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-amber-300">
                        {item.withdrawalCode}
                      </span>
                      <span className="text-[11px] text-slate-400">({item.network})</span>
                    </div>
                    <span
                      data-testid={`withdrawal-status-${item.withdrawalCode}`}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : isBroadcasting
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30 animate-pulse'
                          : isRejected
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isCompleted
                        ? 'Completed TXID (تکمیل شد)'
                        : isBroadcasting
                        ? 'Broadcasting (در حال مخابره)'
                        : isRejected
                        ? 'Rejected (لغو شده)'
                        : 'Pending Admin Review (در انتظار تایید)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">مبلغ خالص واریزی:</span>
                    <strong className="font-mono text-emerald-400">{item.netAmountCrypto}</strong>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 truncate" dir="ltr">
                    To: {item.destinationAddress}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>زمان: {item.createdAt}</span>
                    <span className="font-mono text-amber-400/90">
                      TX: {item.txHash.slice(0, 14)}...
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
