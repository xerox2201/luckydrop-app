import React, { useState, useEffect, useRef } from 'react';
import {
  Headset,
  Send,
  X,
  ExternalLink,
  Search,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import {
  buildQuickDiagnosticSupportAttachment,
  SupportDiagnosticChipType,
} from '../services/securityGuard';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import { tr } from '../utils/i18n';

export const FooterAndChat: React.FC = () => {
  const {
    lang,
    aiChatOpen,
    setAiChatOpen,
    telegramUser,
    telegramUsername,
    tonBalance,
    starsBalance,
    connectedTonWallet,
    deposits,
    withdrawals,
    mySupportMessages,
    unreadSupportCount,
    supportTelegramUsername,
    officialBrandTitle,
    fetchMySupportMessages,
    sendUserSupportMessage,
    markSupportMessagesRead,
  } = useLottery();

  const [messageInput, setMessageInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDiagnosticChip, setSelectedDiagnosticChip] =
    useState<SupportDiagnosticChipType | null>(null);
  const [diagnosticMetadata, setDiagnosticMetadata] = useState<string>('');
  const [diagnosticSubject, setDiagnosticSubject] = useState<string>('');
  const [instantGuideBanner, setInstantGuideBanner] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Background poll every 15s when closed (for unread badge) and every 5s when drawer is open
  useEffect(() => {
    fetchMySupportMessages();
    const intervalMs = aiChatOpen ? 5000 : 15000;
    const timer = setInterval(() => {
      fetchMySupportMessages();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [aiChatOpen, fetchMySupportMessages]);

  // Mark operator replies as read when drawer opens or new messages arrive while open
  useEffect(() => {
    if (aiChatOpen && unreadSupportCount > 0) {
      markSupportMessagesRead('USER');
    }
  }, [aiChatOpen, unreadSupportCount, markSupportMessagesRead]);

  const handleOpenDrawer = () => {
    HapticEngine.impactOccurred('medium');
    setAiChatOpen(true);
    fetchMySupportMessages();
    if (unreadSupportCount > 0) {
      markSupportMessagesRead('USER');
    }
  };

  const handleOpenDirectTelegramSupport = () => {
    HapticEngine.impactOccurred('medium');
    const cleanHandle = (supportTelegramUsername || '@LuckyDrop_Support')
      .trim()
      .replace(/^https?:\/\/t\.me\//i, '')
      .replace(/^@/, '');
    const tgUrl = `https://t.me/${cleanHandle || 'LuckyDrop_Support'}`;
    try {
      const tgWebApp = (window as any)?.Telegram?.WebApp;
      if (tgWebApp && typeof tgWebApp.openTelegramLink === 'function') {
        tgWebApp.openTelegramLink(tgUrl);
        return;
      }
    } catch {
      // fallback below
    }
    const anchor = document.createElement('a');
    anchor.href = tgUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleQuickDiagnosticTap = (chipType: SupportDiagnosticChipType) => {
    HapticEngine.selectionChanged();
    const latestDeposit = deposits[0]
      ? {
          depositCode: deposits[0].depositCode,
          amountCrypto:
            deposits[0].amountCrypto ||
            `${Number((Number(deposits[0].amountUsdt || 0) / 5.0).toFixed(2))} TON`,
          amountUsdt: Number(deposits[0].amountUsdt || 0),
          status: deposits[0].status,
          txHash: deposits[0].txHash,
        }
      : null;

    const latestWithdrawal = withdrawals[0]
      ? {
          withdrawalCode:
            (withdrawals[0] as any).withdrawalCode || `WDR-${withdrawals[0].id}`,
          netAmountCrypto:
            (withdrawals[0] as any).netAmountCrypto ||
            `${Number((Number(withdrawals[0].amountUsdt || 0) / 5.0).toFixed(2))} TON`,
          netAmountUsdt: Number(withdrawals[0].amountUsdt || 0),
          status: withdrawals[0].status,
          destinationAddress:
            (withdrawals[0] as any).destinationAddress ||
            (withdrawals[0] as any).walletAddress ||
            '',
        }
      : null;

    const attachment = buildQuickDiagnosticSupportAttachment({
      chipType,
      connectedWalletAddress: connectedTonWallet?.address || '',
      latestDeposit,
      latestWithdrawal,
    });

    setSelectedDiagnosticChip(chipType);
    setDiagnosticMetadata(attachment.diagnosticMetadata);
    setDiagnosticSubject(attachment.subjectFa);
    setMessageInput(attachment.prefilledMessageFa);
    if (attachment.instantGuideFa) {
      setInstantGuideBanner(attachment.instantGuideFa);
    } else {
      setInstantGuideBanner(null);
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = messageInput.trim();
    if (!cleanText || sending) return;

    HapticEngine.impactOccurred('medium');
    setSending(true);
    setSendFeedback(null);

    const res = await sendUserSupportMessage({
      message: cleanText,
      subject:
        diagnosticSubject ||
        tr(lang, 'گفتگوی زنده پشتیبانی VIP', 'VIP Concierge Live Support'),
      diagnosticType: selectedDiagnosticChip,
      diagnosticMetadata,
    });

    setSending(false);
    if (res.ok) {
      HapticEngine.notificationOccurred('success');
      setMessageInput('');
      setSelectedDiagnosticChip(null);
      setDiagnosticMetadata('');
      setDiagnosticSubject('');
      setSendFeedback({
        type: 'ok',
        text: tr(
          lang,
          '✅ پیام شما ثبت و هم‌زمان به تلگرام ادمین ارسال شد. پاسخ اپراتور در همینجا و در ربات تلگرام برای شما ارسال می‌شود.',
          '✅ Message logged & pushed to Admin Telegram! Operator reply will appear here & in your Telegram bot.'
        ),
      });
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      HapticEngine.notificationOccurred('error');
      setSendFeedback({
        type: 'err',
        text:
          res.error ||
          tr(lang, 'خطا در ارسال پیام پشتیبانی.', 'Failed to send support message.'),
      });
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    HapticEngine.selectionChanged();
    await fetchMySupportMessages();
    if (unreadSupportCount > 0) {
      await markSupportMessagesRead('USER');
    }
    setRefreshing(false);
  };

  // Chronological order (oldest at top, newest at bottom) for natural chat reading
  const orderedMessages = [...mySupportMessages].sort((a, b) => a.id - b.id);

  return (
    <>
      {/* FLOATING VIP CONCIERGE & LIVE SUPPORT BUTTON (WITH UNREAD RED BADGE) */}
      {!aiChatOpen && (
        <button
          type="button"
          onClick={handleOpenDrawer}
          data-testid="floating-vip-support-btn"
          aria-label={tr(lang, 'پشتیبانی زنده VIP', 'VIP Concierge & Live Support')}
          className="fixed bottom-20 right-3.5 z-40 flex items-center gap-2 px-3 py-2.5 rounded-2xl luckydrop-obsidian-glass luckydrop-specular-gold text-white shadow-[0_12px_32px_rgba(0,0,0,0.85)] hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-[#FFE066] to-[#B8860B] text-slate-950 shadow-[0_0_15px_rgba(255,215,0,0.45)]">
            <Headset className="w-4 h-4" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B0716]" />
          </div>
          <div className="text-right leading-tight hidden min-[370px]:block">
            <div className="text-[10px] font-black text-[#FFE066]">
              {tr(lang, 'پشتیبانی زنده VIP', 'VIP Support')}
            </div>
            <div className="text-[8px] font-mono text-slate-300">
              {tr(lang, 'چت دوطرفه + تلگرام', '24/7 Live Concierge')}
            </div>
          </div>

          {unreadSupportCount > 0 && (
            <span
              data-testid="support-unread-badge"
              className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-bounce"
            >
              {unreadSupportCount}
            </span>
          )}
        </button>
      )}

      {/* LUXURY VIP CONCIERGE & TWO-WAY LIVE SUPPORT DRAWER */}
      {aiChatOpen && (
        <div
          data-testid="vip-support-drawer"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-[440px] max-h-[88vh] rounded-t-3xl sm:rounded-3xl luckydrop-obsidian-glass luckydrop-specular-gold flex flex-col overflow-hidden shadow-[0_-16px_60px_rgba(0,0,0,0.92)]">
            {/* Drawer Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#160F29] via-[#100A20] to-[#1A1130] border-b border-[#FFE066]/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuckyDropLogo size={32} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      {tr(
                        lang,
                        '💎 کنسیرج VIP و پشتیبانی زنده',
                        '💎 VIP Concierge & Live Support'
                      )}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[8px] font-black">
                      ONLINE
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate" dir="ltr">
                    ID: {telegramUser.id} • {telegramUsername} • {tonBalance.toFixed(2)} TON
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  title={tr(lang, 'بروزرسانی پیام‌ها', 'Refresh Messages')}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00F5D4]' : ''}`} />
                </button>
                <button
                  type="button"
                  data-testid="close-vip-support-btn"
                  onClick={() => setAiChatOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode B: Direct Telegram Support Banner Button */}
            <div className="px-3.5 pt-2.5 pb-2 bg-[#0E091D] border-b border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-200 truncate">
                  {tr(
                    lang,
                    'پشتیبانی مستقیم تلگرام یا چت زنده داخل برنامه',
                    'Direct Telegram Support or In-App Operator Chat'
                  )}
                </div>
                <div className="text-[9px] font-mono text-[#00F5D4] truncate" dir="ltr">
                  {supportTelegramUsername}
                </div>
              </div>
              <button
                type="button"
                data-testid="direct-telegram-support-btn"
                onClick={handleOpenDirectTelegramSupport}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 font-black text-[10px] shadow-[0_0_16px_rgba(0,152,234,0.4)] hover:brightness-110 cursor-pointer"
              >
                <span>
                  {tr(
                    lang,
                    '✈️ چت مستقیم در تلگرام',
                    '✈️ Open Telegram Support'
                  )}
                </span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Mode A: Persistent Two-Way Operator Chat Thread */}
            <div
              data-testid="support-messages-list"
              className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[220px] max-h-[340px] luckydrop-microgrid-watermark"
            >
              {/* Welcome System Card */}
              <div className="p-3 rounded-2xl bg-[#130D26]/95 border border-[#FFE066]/25 text-[11px] text-slate-200 leading-relaxed">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-[#FFE066] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00F5D4]" />
                    {tr(lang, 'اپراتور ارشد LuckyDrop VIP', 'LuckyDrop VIP Concierge')}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">24/7 Live Bridge</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  {tr(
                    lang,
                    'خوش آمدید! هر پیام شما مستقیماً به پنل مدیریت و تلگرام ادمین ارسال می‌شود. به محض پاسخگویی اپراتور، هم در این گفتگو و هم از طریق ربات تلگرام نوتیفیکیشن دریافت خواهید کرد.',
                    'Welcome! Every message is bridged live to the Admin Cockpit and Admin Telegram. Operator replies appear here and push directly to your Telegram account.'
                  )}
                </p>
              </div>

              {instantGuideBanner && (
                <div
                  data-testid="support-instant-rtp-guide"
                  className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-400/40 text-[11px] text-emerald-100 leading-relaxed"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-emerald-300">
                      {tr(
                        lang,
                        '🎰 خلاصه آنی ضرایب و عدالت بازی (RTP)',
                        '🎰 Instant Provably Fair & RTP Guide'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInstantGuideBanner(null)}
                      className="text-[10px] text-emerald-300/70 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p>{instantGuideBanner}</p>
                </div>
              )}

              {orderedMessages.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-slate-400">
                  {tr(
                    lang,
                    'هنوز تیکتی ثبت نکرده‌اید. از دکمه‌های عیب‌یابی سریع پایین یا کادر پیام استفاده کنید.',
                    'No support tickets yet. Tap a quick diagnostic chip below or type your message.'
                  )}
                </div>
              ) : (
                orderedMessages.map((msg) => {
                  const isUser = String(msg.senderRole || '').toUpperCase() === 'USER';
                  return (
                    <div
                      key={msg.id}
                      data-testid={`support-msg-${isUser ? 'user' : 'operator'}`}
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-br from-[#1C1438] to-[#120C24] border border-[#00F5D4]/30 text-white ml-4'
                          : 'bg-gradient-to-br from-[#23190B] to-[#140F08] border border-[#FFE066]/45 text-amber-50 mr-4 shadow-[0_0_20px_rgba(255,215,0,0.1)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-[10px]">
                        <span
                          className={`font-black ${
                            isUser ? 'text-[#00F5D4]' : 'text-[#FFE066]'
                          }`}
                        >
                          {isUser
                            ? `${msg.senderName} (شما)`
                            : `👑 ${msg.senderName || 'پشتیبانی رسمی LuckyDrop'}`}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400" dir="ltr">
                          {msg.createdAt}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-[11px]">
                        {msg.message}
                      </div>
                      {msg.diagnosticMetadata && (
                        <div
                          className="mt-2 px-2 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px] text-slate-300 break-all"
                          dir="ltr"
                        >
                          📎 {msg.diagnosticMetadata}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Directive 4: 3 One-Tap Quick Diagnostic Chips */}
            <div className="px-3.5 pt-2.5 pb-1.5 bg-[#0B0716] border-t border-white/10">
              <div className="text-[9px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>
                  {tr(
                    lang,
                    '⚡ عیب‌یابی هوشمند ۱-کلیکی (پیوست خودکار اطلاعات حساب):',
                    '⚡ 1-Tap Quick Diagnostics (Auto-attaches account telemetry):'
                  )}
                </span>
                {selectedDiagnosticChip && (
                  <span className="text-[#00F5D4] font-mono text-[9px]">
                    ✓ {selectedDiagnosticChip}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  data-testid="diag-chip-deposit"
                  onClick={() => handleQuickDiagnosticTap('DEPOSIT_TON')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                    selectedDiagnosticChip === 'DEPOSIT_TON'
                      ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                  }`}
                >
                  <Search className="w-3 h-3 shrink-0 text-[#00F5D4]" />
                  <span className="truncate">
                    {tr(lang, '🔍 پیگیری واریز TON', '🔍 Track Deposit')}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="diag-chip-withdraw"
                  onClick={() => handleQuickDiagnosticTap('WITHDRAWAL')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                    selectedDiagnosticChip === 'WITHDRAWAL'
                      ? 'bg-[#FFE066]/20 border-[#FFE066] text-[#FFE066]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3 shrink-0 text-[#FFE066]" />
                  <span className="truncate">
                    {tr(lang, '💸 پیگیری برداشت', '💸 Track Withdraw')}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="diag-chip-rtp"
                  onClick={() => handleQuickDiagnosticTap('FAIRNESS_RTP')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                    selectedDiagnosticChip === 'FAIRNESS_RTP'
                      ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 shrink-0 text-purple-300" />
                  <span className="truncate">
                    {tr(lang, '🎰 راهنمای بازی و ضرایب', '🎰 Game & RTP Guide')}
                  </span>
                </button>
              </div>

              {diagnosticMetadata && (
                <div
                  data-testid="support-attached-metadata-preview"
                  className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#140E28] border border-[#00F5D4]/30 flex items-center justify-between gap-2 text-[9px] font-mono text-[#00F5D4]"
                  dir="ltr"
                >
                  <span className="truncate">📎 {diagnosticMetadata}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiagnosticChip(null);
                      setDiagnosticMetadata('');
                      setDiagnosticSubject('');
                    }}
                    className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {sendFeedback && (
              <div
                data-testid="support-send-feedback"
                className={`mx-3.5 my-1 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 ${
                  sendFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-400/40 text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{sendFeedback.text}</span>
              </div>
            )}

            {/* Message Input Form */}
            <form
              onSubmit={handleSendSupport}
              className="p-3 bg-[#090612] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                data-testid="support-message-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={tr(
                  lang,
                  'پیام خود را برای اپراتور پشتیبانی بنویسید...',
                  'Write your message to VIP Support Operator...'
                )}
                className="flex-1 bg-[#140F26] border border-white/15 focus:border-[#FFE066]/60 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="support-send-submit-btn"
                disabled={sending || !messageInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFE066] to-[#D4AF37] text-slate-950 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(255,215,0,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? '...' : tr(lang, 'ارسال', 'Send')}</span>
              </button>
            </form>

            {/* Proprietary Official Brand Footer inside Drawer */}
            <div className="px-3.5 py-1.5 bg-[#06040C] border-t border-white/5 text-center text-[9px] font-mono text-slate-400 truncate">
              {officialBrandTitle}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
