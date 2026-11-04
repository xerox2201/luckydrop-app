import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useLottery } from '../context/LotteryContext';
import {
  buildQuickDiagnosticSupportAttachment,
  SupportDiagnosticChipType,
} from '../services/securityGuard';
import type { UserConciergeQuickChipId } from '../services/aiCopilotEngine';
import { HapticEngine } from '../utils/telegramTma';
import { tr, localizeServerText } from '../utils/i18n';
import {
  LuxuryIconBadge,
  AiNeuralCoreIcon,
  TelemetryChartIcon,
  WelcomeGiftVaultIcon,
  SquadSyndicateIcon,
  ProvablyFairShieldIcon,
  VipConciergeHeadsetIcon,
  RoyalJackpotCrownIcon,
  TonCrystalIcon,
  CashbackEmeraldVaultIcon,
} from './ui/LuxuryIcons';

interface QuickAskSuggestionSpec {
  id: UserConciergeQuickChipId;
  testId: string;
  labelFa: string;
  labelEn: string;
  variant: 'gold' | 'emerald' | 'cyan' | 'obsidian';
  renderIcon: () => React.ReactNode;
}

const VIP_QUICK_ASK_CHIPS: QuickAskSuggestionSpec[] = [
  {
    id: 'ACCOUNT_STATUS',
    testId: 'concierge-chip-account-status',
    labelFa: 'وضعیت حساب، کشبک و بلیتهای من',
    labelEn: 'Account Status, Cashback & My Tickets',
    variant: 'emerald',
    renderIcon: () => <TelemetryChartIcon size={14} />,
  },
  {
    id: 'WELCOME_1000_GUIDE',
    testId: 'concierge-chip-welcome-1000',
    labelFa: 'راهنمای بلیت رایگان ۱,۰۰۰ دلاری',
    labelEn: 'Free $1,000 Welcome Ticket Guide',
    variant: 'gold',
    renderIcon: () => <WelcomeGiftVaultIcon size={14} />,
  },
  {
    id: 'SYNDICATE_REFERRAL_GUIDE',
    testId: 'concierge-chip-syndicate-referral',
    labelFa: 'قوانین سندیکا و پورسانت ۲٪ دعوت',
    labelEn: 'Syndicate Pools & 2% Referral Rules',
    variant: 'cyan',
    renderIcon: () => <SquadSyndicateIcon size={14} />,
  },
  {
    id: 'PROVABLY_FAIR_AUDIT',
    testId: 'concierge-chip-provably-fair',
    labelFa: 'بررسی عدالت قرعهکشی (Provably Fair)',
    labelEn: 'Provably Fair Cryptographic Audit',
    variant: 'emerald',
    renderIcon: () => <ProvablyFairShieldIcon size={14} />,
  },
  {
    id: 'HUMAN_ESCALATION',
    testId: 'concierge-chip-human-escalation',
    labelFa: 'ارتباط مستقیم با مدیر ارشد (تیکت انسانی)',
    labelEn: 'Direct Senior Admin Escalation (Human Ticket)',
    variant: 'gold',
    renderIcon: () => <VipConciergeHeadsetIcon size={14} />,
  },
];

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
  const [activeQuickAskId, setActiveQuickAskId] = useState<UserConciergeQuickChipId | null>(null);
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

  const handleQuickAskChipTap = async (chip: QuickAskSuggestionSpec) => {
    if (sending) return;
    HapticEngine.impactOccurred('medium');
    setActiveQuickAskId(chip.id);
    setSending(true);
    setSendFeedback(null);

    const textToSend = tr(lang, chip.labelFa, chip.labelEn);
    const res = await sendUserSupportMessage({
      message: textToSend,
      subject: chip.labelFa,
      quickAskChip: chip.id,
      diagnosticType: null,
      diagnosticMetadata: `QUICK_ASK_CHIP:${chip.id}`,
    });

    setSending(false);
    setActiveQuickAskId(null);

    if (res.ok) {
      HapticEngine.notificationOccurred('success');
      setSendFeedback({
        type: 'ok',
        text: tr(
          lang,
          'پاسخ آنی کنسیرج هوشمند VIP با ارقام دقیق ۶ رقم اعشاری حساب شما صادر شد.',
          'Instant 24/7 VIP AI Concierge reply generated with your live 6-decimal account telemetry.'
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
          tr(lang, 'خطا در دریافت پاسخ کنسیرج هوشمند.', 'Failed to reach VIP AI Concierge.'),
      });
    }
  };

  const handleQuickDiagnosticTap = (chipType: SupportDiagnosticChipType) => {
    HapticEngine.selectionChanged();
    const latestDeposit = deposits[0]
      ? {
          depositCode: deposits[0].depositCode,
          amountCrypto:
            deposits[0].amountCrypto ||
            `${Number((Number(deposits[0].amountUsdt || 0) / 5.0).toFixed(6))} TON`,
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
            withdrawals[0].netAmountCrypto ||
            `${Number((Number(withdrawals[0].netAmountUsdt || withdrawals[0].grossAmountUsdt || 0) / 5.0).toFixed(6))} TON`,
          netAmountUsdt: Number(withdrawals[0].netAmountUsdt || withdrawals[0].grossAmountUsdt || 0),
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
        tr(lang, 'گفتگوی زنده کنسیرج هوشمند VIP', 'VIP AI Concierge Live Support'),
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
          'پیام شما ثبت شد و کنسیرج هوشمند ۲۴/۷ بر اساس اطلاعات لحظه‌ای کیف پول شما پاسخ داد.',
          'Your message has been logged and answered live by our 24/7 VIP AI Concierge.'
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

  const orderedMessages = [...mySupportMessages].sort((a, b) => a.id - b.id);
  const cleanBrandFooter = localizeServerText(
    lang,
    String(officialBrandTitle || '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .trim()
  );

  return (
    <>
      {/* LUXURY 24/7 VIP AI CONCIERGE & TWO-WAY LIVE SUPPORT DRAWER (Opened via Single Header Support Icon) */}
      {aiChatOpen && (
        <div
          data-testid="vip-support-drawer"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-[440px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl luckydrop-obsidian-glass luckydrop-specular-gold flex flex-col overflow-hidden shadow-[0_-16px_60px_rgba(0,0,0,0.92)]">
            {/* Drawer Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#160F29] via-[#100A20] to-[#1A1130] border-b border-[#FFE066]/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <LuxuryIconBadge variant="gold" size="md" glow>
                  <AiNeuralCoreIcon size={20} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      {tr(
                        lang,
                        'کنسیرج هوشمند ۲۴/۷ و پشتیبانی VIP',
                        '24/7 VIP AI Concierge & Live Support'
                      )}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[8px] font-black">
                      AI + LIVE
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-300 truncate" dir="ltr">
                    ID: {telegramUser.id} • {telegramUsername} • {tonBalance.toFixed(6)} TON
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

            {/* Direct Telegram Support Banner Button */}
            <div className="px-3.5 py-2 bg-[#0E091D] border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <LuxuryIconBadge variant="cyan" size="xs">
                  <VipConciergeHeadsetIcon size={13} />
                </LuxuryIconBadge>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-200 truncate">
                    {tr(
                      lang,
                      'پشتیبانی مستقیم تلگرام و کنسیرج هوشمند ۲۴/۷',
                      'Direct Telegram Support & 24/7 AI Concierge'
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-[#00F5D4] truncate" dir="ltr">
                    {supportTelegramUsername}
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="direct-telegram-support-btn"
                onClick={handleOpenDirectTelegramSupport}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00F5D4] text-slate-950 font-black text-[10px] shadow-[0_0_16px_rgba(0,152,234,0.4)] hover:brightness-110 cursor-pointer"
              >
                <span>
                  {tr(
                    lang,
                    'چت مستقیم در تلگرام',
                    'Open Telegram Support'
                  )}
                </span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Persistent Two-Way AI Concierge & Operator Chat Thread */}
            <div
              data-testid="support-messages-list"
              className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-2.5 min-h-[190px] max-h-[290px] luckydrop-microgrid-watermark"
            >
              {/* Welcome System Card */}
              <div className="p-3 rounded-2xl bg-[#130D26]/95 border border-[#FFE066]/25 text-[11px] text-slate-200 leading-relaxed">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-[#FFE066] flex items-center gap-1.5">
                    <LuxuryIconBadge variant="gold" size="xs">
                      <AiNeuralCoreIcon size={13} />
                    </LuxuryIconBadge>
                    <span>
                      {tr(lang, 'کنسیرج هوشمند LuckyDrop VIP', 'LuckyDrop VIP AI Concierge')}
                    </span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400" dir="ltr">
                    6-DEC TELEMETRY
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]" data-testid="vip-welcome-greeting">
                  {tr(
                    lang,
                    'به کنسیرج هوشمند ۲۴ ساعته LuckyDrop خوش آمدید. یکی از دکمه‌های استعلام آنی زیر را لمس کنید یا سوال خود را بنویسید تا وضعیت دقیق حساب شما با دقت ۶ رقم اعشار بررسی شود.',
                    'Welcome to the 24/7 LuckyDrop VIP AI Concierge. Tap any quick-ask chip below or write your question for an instant 6-decimal telemetry check.'
                  )}
                </p>
              </div>

              {instantGuideBanner && (
                <div
                  data-testid="support-instant-rtp-guide"
                  className="p-3 rounded-2xl bg-[#16102C]/95 border border-[#FFE066]/40 text-[11px] text-amber-50 leading-relaxed shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-[#FFE066] flex items-center gap-1.5">
                      <LuxuryIconBadge variant="gold" size="xs">
                        <WelcomeGiftVaultIcon size={12} />
                      </LuxuryIconBadge>
                      <span>
                        {tr(
                          lang,
                          'راهنمای جوایز و بلیت‌ها',
                          'Prizes & Tickets Guide'
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInstantGuideBanner(null)}
                      className="text-[10px] text-amber-200/70 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                  <p>{instantGuideBanner}</p>
                </div>
              )}

              {orderedMessages.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-slate-400">
                  {tr(
                    lang,
                    'برای دریافت گزارش آنی موجودی، کش‌بک، بلیت ۱,۰۰۰ دلاری یا سندیکا، یکی از کلیدهای هوشمند زیر را لمس کنید.',
                    'Tap a smart concierge chip below or type your message to get started.'
                  )}
                </div>
              ) : (
                orderedMessages.map((msg) => {
                  const isUser = String(msg.senderRole || '').toUpperCase() === 'USER';
                  const cleanMessageBody = String(msg.message || '');
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
                          className={`font-black flex items-center gap-1.5 ${
                            isUser ? 'text-[#00F5D4]' : 'text-[#FFE066]'
                          }`}
                        >
                          {!isUser && (
                            <LuxuryIconBadge variant="gold" size="xs">
                              {String(msg.senderName || '').includes('AI') ||
                              String(msg.senderName || '').includes('هوشمند') ? (
                                <AiNeuralCoreIcon size={12} />
                              ) : (
                                <RoyalJackpotCrownIcon size={12} />
                              )}
                            </LuxuryIconBadge>
                          )}
                          <span>
                            {isUser
                              ? `${msg.senderName} (${tr(lang, 'شما', 'You', 'Вы', 'أنت', 'Tú')})`
                              : String(msg.senderName || '').includes('AI') ||
                                String(msg.senderName || '').includes('هوشمند') ||
                                !msg.senderName
                              ? tr(
                                  lang,
                                  'کنسیرج هوشمند VIP',
                                  '24/7 VIP AI Concierge',
                                  '24/7 VIP ИИ-Консьерж',
                                  'كونسيرج الذكاء الاصطناعي VIP 24/7',
                                  'Conserje IA VIP 24/7'
                                )
                              : msg.senderName}
                          </span>
                        </span>
                        <span className="font-mono text-[9px] text-slate-400" dir="ltr">
                          {msg.createdAt}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-[11px]">
                        {cleanMessageBody}
                      </div>
                      {msg.diagnosticMetadata && (
                        <div
                          className="mt-2 px-2 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-[9px] text-slate-300 break-all"
                          dir="ltr"
                        >
                          {msg.diagnosticMetadata}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 5 VIP AI Concierge Quick-Ask Suggestion Chips (Bespoke SVG Icons inside LuxuryIconBadge — Zero Text Emojis) */}
            <div
              data-testid="vip-concierge-quick-ask-section"
              className="px-3.5 pt-2.5 pb-2 bg-[#0B0716] border-t border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <LuxuryIconBadge variant="gold" size="xs">
                    <AiNeuralCoreIcon size={12} />
                  </LuxuryIconBadge>
                  <span className="text-[10px] font-black text-[#FFE066]">
                    {tr(
                      lang,
                      'پاسخگوی هوشمند ۲۴/۷ (انتخاب سریع موضوع):',
                      '24/7 VIP AI Concierge Quick-Ask:'
                    )}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-emerald-400" dir="ltr">
                  LIVE 6-DECIMAL
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-[152px] overflow-y-auto no-scrollbar pr-0.5">
                {VIP_QUICK_ASK_CHIPS.map((chip) => {
                  const isBusy = sending && activeQuickAskId === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      disabled={sending}
                      data-testid={chip.testId}
                      onClick={() => handleQuickAskChipTap(chip)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#16102A] to-[#0F0A1E] hover:from-[#1F1638] hover:to-[#150E2A] border border-amber-400/25 hover:border-amber-400/60 text-right transition-all cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LuxuryIconBadge variant={chip.variant} size="xs">
                          {chip.renderIcon()}
                        </LuxuryIconBadge>
                        <span className="text-[10px] font-extrabold text-slate-100 truncate">
                          {tr(lang, chip.labelFa, chip.labelEn)}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-300/90 shrink-0" dir="ltr">
                        {isBusy ? '...' : 'ASK AI'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3 One-Tap Quick Diagnostic Attachment Chips (Zero Text Emojis) */}
              <div className="pt-1 border-t border-white/10">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    data-testid="diag-chip-deposit"
                    onClick={() => handleQuickDiagnosticTap('DEPOSIT_TON')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl border text-[9px] font-black transition-all cursor-pointer ${
                      selectedDiagnosticChip === 'DEPOSIT_TON'
                        ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <LuxuryIconBadge variant="cyan" size="xs">
                      <TonCrystalIcon size={11} />
                    </LuxuryIconBadge>
                    <span className="truncate">
                      {tr(lang, 'پیگیری واریز TON', 'Track Deposit')}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="diag-chip-withdraw"
                    onClick={() => handleQuickDiagnosticTap('WITHDRAWAL')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl border text-[9px] font-black transition-all cursor-pointer ${
                      selectedDiagnosticChip === 'WITHDRAWAL'
                        ? 'bg-[#FFE066]/20 border-[#FFE066] text-[#FFE066]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <LuxuryIconBadge variant="gold" size="xs">
                      <CashbackEmeraldVaultIcon size={11} />
                    </LuxuryIconBadge>
                    <span className="truncate">
                      {tr(lang, 'پیگیری برداشت', 'Track Withdraw')}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="diag-chip-rtp"
                    onClick={() => handleQuickDiagnosticTap('FAIRNESS_RTP')}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl border text-[9px] font-black transition-all cursor-pointer ${
                      selectedDiagnosticChip === 'FAIRNESS_RTP'
                        ? 'bg-[#FFE066]/20 border-[#FFE066] text-[#FFE066]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                    }`}
                  >
                    <LuxuryIconBadge variant="emerald" size="xs">
                      <WelcomeGiftVaultIcon size={11} />
                    </LuxuryIconBadge>
                    <span className="truncate">
                      {tr(lang, 'راهنمای جوایز', 'Prizes Guide')}
                    </span>
                  </button>
                </div>

                {diagnosticMetadata && (
                  <div
                    data-testid="support-attached-metadata-preview"
                    className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#140E28] border border-[#00F5D4]/30 flex items-center justify-between gap-2 text-[9px] font-mono text-[#00F5D4]"
                    dir="ltr"
                  >
                    <span className="truncate">{diagnosticMetadata}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDiagnosticChip(null);
                        setDiagnosticMetadata('');
                        setDiagnosticSubject('');
                      }}
                      className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
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
                  'سوال خود را از کنسیرج هوشمند یا مدیر ارشد بپرسید...',
                  'Ask VIP AI Concierge or Senior Support Operator...'
                )}
                className="flex-1 bg-[#140F26] border border-white/15 focus:border-[#FFE066]/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="support-send-submit-btn"
                disabled={sending || !messageInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFE066] to-[#D4AF37] text-slate-950 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(255,215,0,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? '...' : tr(lang, 'ارسال', 'Send')}</span>
              </button>
            </form>

            {/* Proprietary Official Brand Footer inside Drawer */}
            <div className="px-3.5 py-1.5 bg-[#06040C] border-t border-white/5 text-center text-[9px] font-mono text-slate-400 truncate">
              {cleanBrandFooter || 'LuckyDrop Official • Verified Provably Fair Web3 Protocol'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
