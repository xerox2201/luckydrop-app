import React, { useEffect, useRef, useState } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';

export const ViralTicketCardModal: React.FC = () => {
  const {
    viralCardTicket,
    setViralCardTicket,
    displayName,
    vipTier,
    referralCode,
  } = useLottery();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [downloadedToast, setDownloadedToast] = useState<boolean>(false);

  const referralUrl = `${
    typeof window !== 'undefined' ? window.location.origin : 'https://luckydrop.vip'
  }/?ref=${referralCode}`;

  useEffect(() => {
    if (!viralCardTicket || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Luxury Obsidian & Royal Gold Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090c15');
    bgGrad.addColorStop(0.5, '#161124');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Golden Glow Orbs
    const radialGold = ctx.createRadialGradient(width / 2, 320, 40, width / 2, 320, 480);
    radialGold.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    radialGold.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = radialGold;
    ctx.fillRect(0, 0, width, height);

    // 2. Outer Ornate Gold Frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(44, 44, width - 88, height - 88);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, width - 124, height - 124);

    // 3. Top Header Badge
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑 LUCKYDROP • ZARRIN LOTTERY VIP 👑', width / 2, 145);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 46px Vazirmatn, sans-serif';
    const prize = parseFloat(viralCardTicket.prizeWonUsdt) || 0;
    ctx.fillText(
      prize > 0
        ? `🎉 گواهی رسمی برنده جایزه $${prize.toLocaleString('en-US')} USDT 🎉`
        : '✨ کوپن رسمی شرکت در مگا جک‌پات زرین لاتاری ✨',
      width / 2,
      215
    );

    // 4. Ticket Code & Player Info Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(96, 265, width - 192, 210, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`COUPON ID: ${viralCardTicket.ticketCode}`, 135, 330);
    ctx.fillText(`ROUND: ${viralCardTicket.roundCode}`, 135, 385);
    ctx.fillText(`NETWORK: ${viralCardTicket.currencyNetwork}`, 135, 440);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`VIP HOLDER: ${displayName}`, width - 135, 330);
    ctx.fillStyle = '#34d399';
    ctx.fillText(`TIER: ${vipTier}`, width - 135, 385);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      prize > 0 ? `PRIZE WON: $${prize} USDT` : 'STATUS: PROVABLY FAIR VERIFIED',
      width - 135,
      440
    );

    // 5. Drawn / Selected Golden Balls Section
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 30px Vazirmatn, sans-serif';
    ctx.fillText('شماره‌های طلایی ثبت‌شده در بلاکچین (SHA-256)', width / 2, 550);

    const balls = viralCardTicket.mainNumbers
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const totalBallsCount = balls.length + (viralCardTicket.goldenBall > 0 ? 1 : 0);
    const spacing = 148;
    const startX = width / 2 - ((totalBallsCount - 1) * spacing) / 2;
    const ballY = 665;

    balls.forEach((b, idx) => {
      const cx = startX + idx * spacing;
      const g = ctx.createRadialGradient(cx - 16, ballY - 16, 8, cx, ballY, 58);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(0.55, '#f59e0b');
      g.addColorStop(1, '#78350f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, ballY, 56, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 42px Inter, monospace';
      ctx.fillText(String(b).padStart(2, '0'), cx, ballY + 15);
    });

    if (viralCardTicket.goldenBall > 0) {
      const gx = startX + balls.length * spacing;
      const pg = ctx.createRadialGradient(gx - 16, ballY - 16, 8, gx, ballY, 60);
      pg.addColorStop(0, '#e9d5ff');
      pg.addColorStop(0.55, '#9333ea');
      pg.addColorStop(1, '#3b0764');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(gx, ballY, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px Inter, monospace';
      ctx.fillText(`★${String(viralCardTicket.goldenBall).padStart(2, '0')}`, gx, ballY + 14);
    }

    // 6. Provably Fair Hash Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(96, 780, width - 192, 130, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 22px Inter, monospace';
    ctx.fillText('PROVABLY FAIR BLOCKCHAIN COMMITMENT HASH (HMAC-SHA256)', width / 2, 825);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px Inter, monospace';
    ctx.fillText((viralCardTicket.txHash || '').slice(0, 54) + '...', width / 2, 875);

    // 7. Bottom VIP Affiliate Invite Banner (Drives Viral Referrals!)
    const refGrad = ctx.createLinearGradient(96, 960, width - 96, 1220);
    refGrad.addColorStop(0, '#451a03');
    refGrad.addColorStop(0.5, '#78350f');
    refGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = refGrad;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(96, 955, width - 192, 275, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 34px Vazirmatn, sans-serif';
    ctx.fillText('🎁 با کد دعوت اختصاصی من وارد شوید و شانس خود را امتحان کنید!', width / 2, 1025);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Inter, monospace';
    ctx.fillText(`REFERRAL CODE: ${referralCode}`, width / 2, 1105);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 24px Inter, monospace';
    ctx.fillText(referralUrl, width / 2, 1175);
  }, [viralCardTicket, displayName, vipTier, referralCode, referralUrl]);

  if (!viralCardTicket) return null;

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `LuckyDrop-VIP-${viralCardTicket.ticketCode}-${referralCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadedToast(true);
    setTimeout(() => setDownloadedToast(false), 3000);
  };

  const shareText = `👑 کوپن رسمی من (${viralCardTicket.ticketCode}) در مگا جک‌پات زرین لاتاری VIP!\n✨ با کد معرف من وارد شوید: ${referralCode}\n🔗 ${referralUrl}`;

  const handleCopyShareCaption = () => {
    navigator.clipboard?.writeText(shareText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      data-testid="viral-ticket-card-modal"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#111622] border border-amber-500/45 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#1c1629] to-[#121724] border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-amber-400 font-bold block">
              VIRAL STORY & TELEGRAM CERTIFICATE GENERATOR
            </span>
            <h3 className="text-base sm:text-lg font-black text-white">
              کارت تصویری طلایی کوپن {viralCardTicket.ticketCode} (همراه با کد زیرمجموعه‌گیری شما)
            </h3>
          </div>
          <button
            type="button"
            data-testid="close-viral-card-modal"
            onClick={() => setViralCardTicket(null)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[84vh] overflow-y-auto">
          <div className="flex justify-center bg-[#080b12] border border-amber-500/30 rounded-2xl p-3">
            <canvas
              ref={canvasRef}
              data-testid="viral-ticket-canvas"
              className="w-full max-w-[340px] h-auto rounded-xl shadow-2xl border border-amber-400/30"
            />
          </div>

          {downloadedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold text-center">
              ✅ تصویر باکیفیت استوری (PNG) با کد معرف {referralCode} دانلود شد!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              data-testid="download-viral-ticket-png-btn"
              onClick={handleDownloadPng}
              className="py-3 px-4 rounded-xl gold-gradient-cta text-[#241300] font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>دانلود تصویر استوری (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareCaption}
              className="py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              <span>{copiedCaption ? '✅ متن دعوت کپی شد!' : 'کپی کپشن + لینک معرف'}</span>
            </button>

            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(
                shareText
              )}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-black text-xs flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>اشتراک مستقیم در تلگرام</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
