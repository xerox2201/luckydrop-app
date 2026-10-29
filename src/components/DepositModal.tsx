import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  formatCurrency,
  truncateTonAddress,
  HapticEngine,
} from '../utils/telegramTma.ts';

export const DepositModal: React.FC = () => {
  const {
    depositModalOpen,
    setDepositModalOpen,
    activeTmaCurrency,
    setActiveTmaCurrency,
    connectedTonWallet,
    connectTonWalletOneTap,
    depositTonInstant,
    depositTelegramStarsInstant,
    navigateTo,
  } = useLottery();

  const [tonAmount, setTonAmount] = useState<number>(5);
  const [starsAmount, setStarsAmount] = useState<number>(500);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!depositModalOpen) return null;

  const handleConfirm = async () => {
    HapticEngine.impactOccurred('medium');
    if (activeTmaCurrency === 'TON') {
      if (!connectedTonWallet) {
        await connectTonWalletOneTap();
        return;
      }
      setSubmitting(true);
      const res = await depositTonInstant(tonAmount, connectedTonWallet.address);
      setSubmitting(false);
      setStatusMessage(res.message);
      if (res.ok) {
        setTimeout(() => {
          setStatusMessage(null);
          setDepositModalOpen(false);
          navigateTo('wallet');
        }, 1200);
      }
      return;
    }

    setSubmitting(true);
    const res = await depositTelegramStarsInstant(starsAmount);
    setSubmitting(false);
    setStatusMessage(res.message);
    if (res.ok) {
      setTimeout(() => {
        setStatusMessage(null);
        setDepositModalOpen(false);
        navigateTo('wallet');
      }, 1200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={() => setDepositModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-2xl bg-[#130d24]/90 border border-purple-500/20 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] backdrop-blur-md flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold tracking-wide text-white">
            شارژ کیف پول (TON &amp; Stars)
          </h3>
          <button
            type="button"
            onClick={() => setDepositModalOpen(false)}
            className="p-1.5 rounded-xl bg-purple-500/15 text-purple-200/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Currency Switcher */}
        <div className="grid grid-cols-2 gap-2" dir="ltr">
          <button
            type="button"
            onClick={() => setActiveTmaCurrency('TON')}
            className={`h-10 rounded-xl border text-xs font-semibold cursor-pointer ${
              activeTmaCurrency === 'TON'
                ? 'bg-purple-600/35 border-purple-400/50 text-white'
                : 'bg-[#070510] border-purple-500/20 text-purple-200/80'
            }`}
          >
            💎 TON Connect
          </button>
          <button
            type="button"
            onClick={() => setActiveTmaCurrency('STARS')}
            className={`h-10 rounded-xl border text-xs font-semibold cursor-pointer ${
              activeTmaCurrency === 'STARS'
                ? 'bg-purple-600/35 border-purple-400/50 text-white'
                : 'bg-[#070510] border-purple-500/20 text-purple-200/80'
            }`}
          >
            ⭐ Telegram Stars
          </button>
        </div>

        {activeTmaCurrency === 'TON' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-[#070510] border border-purple-500/20 px-3 py-2" dir="ltr">
              <span className="text-xs font-semibold text-purple-200/80">TON Wallet</span>
              <span className="text-[11px] font-medium text-purple-300/50 tabular-nums">
                {connectedTonWallet
                  ? truncateTonAddress(connectedTonWallet.address)
                  : 'Not Connected'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2" dir="ltr">
              {[2, 5, 10, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTonAmount(preset)}
                  className={`h-9 rounded-xl border text-xs font-semibold tabular-nums cursor-pointer ${
                    tonAmount === preset
                      ? 'bg-purple-600/35 border-purple-400/50 text-white'
                      : 'bg-[#070510] border-purple-500/20 text-purple-200/80'
                  }`}
                >
                  {formatCurrency(preset, 'TON')}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2" dir="ltr">
            {[250, 500, 1000, 2500].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStarsAmount(preset)}
                className={`h-10 rounded-xl border text-xs font-semibold tabular-nums cursor-pointer ${
                  starsAmount === preset
                    ? 'bg-purple-600/35 border-purple-400/50 text-white'
                    : 'bg-[#070510] border-purple-500/20 text-purple-200/80'
                }`}
              >
                {formatCurrency(preset, 'STARS')}
              </button>
            ))}
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-[#070510] border border-[#00f59b]/40 text-xs font-semibold text-[#00f59b] text-center">
            {statusMessage}
          </div>
        )}

        <button
          type="button"
          disabled={submitting}
          data-testid="confirm-crypto-deposit"
          onClick={handleConfirm}
          className="w-full h-11 rounded-xl stake-emerald-cta text-xs font-semibold text-[#042416] cursor-pointer"
        >
          {submitting
            ? 'در حال پردازش...'
            : activeTmaCurrency === 'TON'
            ? connectedTonWallet
              ? `💎 واریز +${formatCurrency(tonAmount, 'TON')}`
              : '💎 اتصال کیف پول TON (One-Tap Connect)'
            : `⭐ پرداخت +${formatCurrency(starsAmount, 'STARS')}`}
        </button>
      </div>
    </div>
  );
};
