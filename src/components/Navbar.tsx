import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Gamepad2,
  Gift,
  Wallet,
  ShieldCheck,
  Plus,
  Ticket,
  Menu,
  X,
  Trophy,
  UserCheck,
  HelpCircle,
  FileText,
  Target,
  Headset,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useLottery, AppRoute } from '../context/LotteryContext';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import {
  tr,
  localizeServerText,
  GLOBAL_LANGUAGE_OPTIONS,
  getLanguageOptionMeta,
} from '../utils/i18n';
import {
  TonCrystalIcon,
  TelegramStarIcon,
  VipTicketIcon,
  AmbassadorRocketIcon,
  CashbackEmeraldVaultIcon,
  LuxuryFlagIcon,
} from './ui/LuxuryIcons';

export const Navbar: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    lang,
    setLang,
    activeTmaCurrency,
    setActiveTmaCurrency,
    tonBalance,
    starsBalance,
    formatCurrency,
    telegramUser,
    isTelegramAdmin,
    tickets,
    portfolioUsdValue,
    unreadSupportCount,
    aiChatOpen,
    setAiChatOpen,
    officialBrandTitle,
  } = useLottery();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const activeLangMeta = getLanguageOptionMeta(lang);

  useEffect(() => {
    if (!langMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [langMenuOpen]);

  const handleTabNav = (route: AppRoute) => {
    HapticEngine.selectionChanged();
    setMoreMenuOpen(false);
    setLangMenuOpen(false);
    navigateTo(route);
  };

  return (
    <>
      {/* TOP TELEGRAM MINI APP COMPACT HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[#0B0E14]/95 border-b border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_12px_28px_rgba(0,0,0,0.75)] select-none">
        <div className="max-w-[440px] mx-auto px-2 h-14 flex items-center justify-between gap-1">
          {/* Brand + Language Switcher + Admin Trigger */}
          <div className="flex items-center gap-1 min-w-0 shrink-0">
            <div
              onClick={() => handleTabNav('lobby')}
              className="flex items-center gap-1 cursor-pointer group shrink-0"
            >
              <LuckyDropLogo size={32} />
              <div className="leading-tight hidden min-[390px]:block">
                <div className="flex items-center gap-0.5">
                  <span className="font-black text-[11px] tracking-tight text-white">
                    Lucky<span className="text-[#F5D061]">Drop</span>
                  </span>
                </div>
                <div className="text-[8px] text-slate-400 font-medium truncate max-w-[58px]">
                  {localizeServerText(lang, telegramUser.first_name)}
                </div>
              </div>
            </div>

            {/* Compact 5-Language Vector Flag Dropdown Menu */}
            <div ref={langDropdownRef} className="relative z-30 shrink-0" dir="ltr">
              <button
                type="button"
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setMoreMenuOpen(false);
                  setLangMenuOpen((prev) => !prev);
                }}
                title={tr(lang, 'تغییر زبان', 'Switch Language')}
                data-testid="language-selector-dropdown"
                className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_4px_12px_rgba(0,0,0,0.5)] text-[10px] font-mono font-black text-white transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <LuxuryFlagIcon lang={activeLangMeta.locale} size={14} />
                <span className="text-[#F5D061] tracking-tight">{activeLangMeta.code}</span>
                <ChevronDown
                  className={`w-2.5 h-2.5 text-slate-300 transition-transform duration-150 ${
                    langMenuOpen ? 'rotate-180 text-[#F5D061]' : ''
                  }`}
                />
              </button>

              {langMenuOpen && (
                <div
                  data-testid="language-selector-menu"
                  className="absolute left-0 top-full mt-1.5 w-36 rounded-2xl p-1 bg-[#0B0E14]/98 backdrop-blur-2xl border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_16px_36px_rgba(0,0,0,0.85)] space-y-0.5 z-50"
                >
                  {GLOBAL_LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = activeLangMeta.locale === opt.locale;
                    return (
                      <button
                        key={opt.locale}
                        type="button"
                        data-testid={`language-option-${opt.locale}`}
                        onClick={() => {
                          HapticEngine.selectionChanged();
                          setLang(opt.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#F5D061]/20 to-emerald-500/15 border border-[#D4AF37]/50 text-[#F5D061]'
                            : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <LuxuryFlagIcon lang={opt.locale} size={16} />
                          <span className="truncate">{opt.nativeName}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-[9px] text-slate-400">{opt.code}</span>
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isTelegramAdmin && (
              <button
                type="button"
                data-testid="navbar-admin-cockpit-btn"
                onClick={() => handleTabNav('cockpit')}
                title={tr(lang, 'پنل مدیریت ادمین', 'Admin Cockpit')}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded-xl text-[9px] font-black transition-all cursor-pointer shrink-0 ${
                  activeRoute === 'cockpit'
                    ? 'bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] text-[#090B10] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_12px_rgba(212,175,55,0.4)]'
                    : 'bg-[#D4AF37]/15 text-[#F5D061] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/25'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden min-[380px]:inline">Admin</span>
              </button>
            )}
          </div>

          {/* Right Controls: Dual-Currency Switcher + Live Balance + My Tickets + Single Support Icon + More Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Dual-Currency Toggle: TON vs STARS */}
            <div
              className="flex items-center p-0.5 rounded-xl bg-[#07090E] border border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              dir="ltr"
            >
              <button
                type="button"
                aria-label="TON Currency"
                onClick={() => setActiveTmaCurrency('TON')}
                className={`px-1 py-1 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                  activeTmaCurrency === 'TON'
                    ? 'bg-[#0098EA]/25 text-white border border-[#0098EA]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'text-slate-400 hover:text-white opacity-70 hover:opacity-100'
                }`}
              >
                <TonCrystalIcon size={13} />
              </button>
              <button
                type="button"
                aria-label="Telegram Stars Currency"
                onClick={() => setActiveTmaCurrency('STARS')}
                className={`px-1 py-1 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                  activeTmaCurrency === 'STARS'
                    ? 'bg-[#D4AF37]/25 text-white border border-[#F5D061]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]'
                    : 'text-slate-400 hover:text-white opacity-70 hover:opacity-100'
                }`}
              >
                <TelegramStarIcon size={13} />
              </button>
            </div>

            {/* Balance Pill + Quick Top-Up */}
            <button
              type="button"
              onClick={() => handleTabNav('wallet')}
              data-testid="navbar-balance-pill"
              className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#111622] border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_6px_14px_rgba(0,0,0,0.5)] hover:border-emerald-400/50 transition-all cursor-pointer"
            >
              {activeTmaCurrency === 'TON' ? (
                <TonCrystalIcon size={12} />
              ) : (
                <TelegramStarIcon size={12} />
              )}
              <div className="text-right leading-none tabular-nums" dir="ltr">
                <div className="text-[9.5px] font-mono font-black text-white tabular-nums">
                  {activeTmaCurrency === 'TON'
                    ? formatCurrency(tonBalance, 'TON')
                    : formatCurrency(starsBalance, 'STARS')}
                </div>
                <div className="text-[7.5px] font-mono text-emerald-400 tabular-nums">
                  ≈ ${portfolioUsdValue.toFixed(2)}
                </div>
              </div>
              <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Plus className="w-2.5 h-2.5" />
              </div>
            </button>

            {/* Quick My Tickets Pill */}
            <button
              type="button"
              onClick={() => handleTabNav('my-tickets')}
              title={tr(lang, 'بلیت‌های من', 'My Tickets')}
              data-testid="header-my-tickets-btn"
              className={`relative p-1.5 rounded-xl border shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] transition-all cursor-pointer ${
                activeRoute === 'my-tickets'
                  ? 'bg-[#D4AF37]/20 border-[#F5D061]/50 text-[#F5D061]'
                  : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <VipTicketIcon size={15} />
              {tickets.length > 0 && (
                <span
                  dir="ltr"
                  className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-400 text-[#090B10] font-mono text-[9px] font-black tabular-nums flex items-center justify-center"
                >
                  {tickets.length}
                </span>
              )}
            </button>

            {/* Single Clean VIP Support Entry Point with Unread Red Badge */}
            <button
              type="button"
              onClick={() => {
                HapticEngine.selectionChanged();
                setMoreMenuOpen(false);
                setAiChatOpen(!aiChatOpen);
              }}
              title={tr(lang, 'پشتیبانی زنده VIP', 'VIP Live Support')}
              data-testid="header-support-btn"
              className={`relative p-1.5 rounded-xl border shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] transition-all cursor-pointer ${
                aiChatOpen
                  ? 'bg-[#D4AF37]/25 border-[#F5D061]/60 text-[#F5D061]'
                  : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:text-[#F5D061]'
              }`}
            >
              <Headset className="w-3.5 h-3.5" />
              {unreadSupportCount > 0 && (
                <span
                  dir="ltr"
                  data-testid="header-support-unread-badge"
                  className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black tabular-nums flex items-center justify-center animate-pulse"
                >
                  {unreadSupportCount}
                </span>
              )}
            </button>

            {/* Quick More / Profile / Info Menu Button */}
            <button
              type="button"
              onClick={() => {
                HapticEngine.selectionChanged();
                setMoreMenuOpen((prev) => !prev);
              }}
              title={tr(lang, 'منوی امکانات و پروفایل', 'More Views & Profile')}
              data-testid="more-menu-btn"
              className={`p-1.5 rounded-xl border shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] transition-all cursor-pointer ${
                moreMenuOpen
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              {moreMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Quick-Navigation Sheet (440px Constrained) */}
        {moreMenuOpen && (
          <div
            data-testid="more-menu-dropdown"
            className="max-w-[440px] mx-auto px-3 pb-3 pt-2 bg-[#0B0E14]/98 border-t border-white/[0.08] rounded-b-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.85)] animate-in fade-in duration-150"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-testid="more-nav-play"
                onClick={() => handleTabNav('play')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#F5D061] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'انتخاب دستی شماره‌ها', 'Custom Ball Picker')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-my-tickets"
                onClick={() => handleTabNav('my-tickets')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <VipTicketIcon size={16} />
                <span className="truncate">
                  {tr(lang, `بلیت‌های من (${tickets.length})`, `My Tickets (${tickets.length})`)}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-user-panel"
                onClick={() => handleTabNav('user-panel')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {tr(lang, 'پروفایل VIP و صندوقچه', 'VIP Profile & Chest')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-winners"
                onClick={() => handleTabNav('winners')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#F5D061] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'برندگان و نتایج ادوار', 'Winners & Draws')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-transparency"
                onClick={() => handleTabNav('transparency')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {tr(lang, 'اثبات عدالت (RNG)', 'Provably Fair RNG')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-how-it-works"
                onClick={() => handleTabNav('how-it-works')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-white/[0.08] text-xs font-bold text-white cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#38BDF8] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'راهنمای بازی و قوانین', 'How It Works')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-support"
                onClick={() => {
                  HapticEngine.selectionChanged();
                  setMoreMenuOpen(false);
                  setAiChatOpen(true);
                }}
                className="col-span-2 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#111622] hover:bg-[#161D2C] border border-[#D4AF37]/40 text-xs font-black text-[#F5D061] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CashbackEmeraldVaultIcon size={16} />
                  <span>
                    {tr(
                      lang,
                      'کنسیرج VIP و پشتیبانی دوطرفه زنده (چت + تلگرام)',
                      '24/7 VIP Concierge & Two-Way Live Support'
                    )}
                  </span>
                </div>
                {unreadSupportCount > 0 && (
                  <span
                    dir="ltr"
                    className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black tabular-nums"
                  >
                    {unreadSupportCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                data-testid="more-nav-terms"
                onClick={() => handleTabNav('terms')}
                className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-bold text-slate-300 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {tr(
                    lang,
                    'قوانین، مقررات و حریم خصوصی (Terms & Rules)',
                    'Terms, Rules & Provably Fair Policy'
                  )}
                </span>
              </button>
            </div>
            {/* Official Proprietary Brand Signature Badge inside Header Menu */}
            <div
              data-testid="header-menu-brand-badge"
              className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-[#F5D061]/90 text-center"
            >
              <LuckyDropLogo size={16} />
              <span className="truncate">{localizeServerText(lang, officialBrandTitle)}</span>
            </div>
          </div>
        )}
      </header>

      {/* FLOATING GLASSMORPHIC TMA DOCK WITH RAISED GOLDEN CENTER ACTION BUTTON */}
      <nav
        data-testid="bottom-floating-tma-dock"
        className="fixed bottom-0 inset-x-0 z-50 px-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none select-none"
      >
        <div className="max-w-[430px] mx-auto rounded-3xl border border-white/[0.1] bg-[#0B0E14]/94 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_-12px_36px_rgba(0,0,0,0.85)] px-2 h-16 grid grid-cols-5 gap-1 items-center pointer-events-auto relative">
          <BottomTabButton
            testId="nav-tab-lobby"
            active={activeRoute === 'lobby'}
            onClick={() => handleTabNav('lobby')}
            icon={<VipTicketIcon size={18} />}
            label={tr(lang, 'لابی', 'Lobby')}
            subLabel={tr(lang, 'لاتاری', 'Draws')}
            accent="gold"
          />
          <BottomTabButton
            testId="nav-tab-games"
            active={activeRoute === 'mini-games'}
            onClick={() => handleTabNav('mini-games')}
            icon={<Gamepad2 className="w-4 h-4" />}
            label={tr(lang, 'بازی‌ها', 'Games')}
            subLabel="Plinko • Crash"
            accent="cyan"
          />

          {/* RAISED BRUSHED METALLIC GOLD CIRCULAR CENTER ACTION BUTTON */}
          <div className="relative flex flex-col items-center justify-center -mt-6">
            <button
              type="button"
              data-testid="nav-center-play-btn"
              onClick={() => handleTabNav(activeRoute === 'lobby' ? 'play' : 'lobby')}
              aria-label={tr(lang, 'خرید بلیت و قرعه‌کشی', 'Play Lottery')}
              className="w-14 h-14 rounded-full bg-gradient-to-b from-[#F5D061] via-[#D4AF37] to-[#9A7418] border border-[#FFF6D6]/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.85),0_8px_22px_rgba(212,175,55,0.45)] flex flex-col items-center justify-center text-[#090B10] active:scale-95 transition-transform cursor-pointer"
            >
              <VipTicketIcon size={22} />
              <span className="font-mono text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-[#090B10]">
                PLAY
              </span>
            </button>
          </div>

          <BottomTabButton
            testId="nav-tab-earn"
            active={activeRoute === 'earn'}
            onClick={() => handleTabNav('earn')}
            icon={<AmbassadorRocketIcon size={18} />}
            label={tr(lang, 'ماموریت', 'Earn')}
            subLabel={tr(lang, 'پاداش', 'Quests')}
            accent="emerald"
          />
          <BottomTabButton
            testId="nav-tab-wallet"
            active={
              activeRoute === 'wallet' ||
              activeRoute === 'deposit' ||
              activeRoute === 'withdraw'
            }
            onClick={() => handleTabNav('wallet')}
            icon={<TonCrystalIcon size={18} />}
            label={tr(lang, 'کیف پول', 'Wallet')}
            subLabel="TON & Stars"
            accent="blue"
          />
        </div>
      </nav>
    </>
  );
};

interface BottomTabButtonProps {
  testId?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  accent: 'gold' | 'cyan' | 'emerald' | 'blue';
}

const BottomTabButton: React.FC<BottomTabButtonProps> = ({
  testId,
  active,
  onClick,
  icon,
  label,
  subLabel,
  accent,
}) => {
  const activeColorMap = {
    gold: 'text-[#FFE066] bg-[#FFD700]/15 border-[#FFD700]/40',
    cyan: 'text-[#00F5D4] bg-[#00F5D4]/15 border-[#00F5D4]/40',
    emerald: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40',
    blue: 'text-[#38BDF8] bg-[#0098EA]/20 border-[#0098EA]/45',
  };

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl border transition-all cursor-pointer ${
        active
          ? `${activeColorMap[accent]} shadow-[inset_0_2px_4px_rgba(255,255,255,0.22),_0_8px_16px_rgba(0,0,0,0.5)] scale-[1.02]`
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
      }`}
    >
      {icon}
      <span className="text-[10.5px] font-black mt-0.5 leading-tight truncate max-w-full">{label}</span>
      <span className="text-[7.5px] font-mono opacity-75 leading-none mt-0.5 truncate max-w-full">{subLabel}</span>
    </button>
  );
};
