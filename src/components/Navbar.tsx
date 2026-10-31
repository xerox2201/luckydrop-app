import React, { useState } from 'react';
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
  Globe,
} from 'lucide-react';
import { useLottery, AppRoute } from '../context/LotteryContext';
import { HapticEngine } from '../utils/telegramTma';
import { LuckyDropLogo } from './LuckyDropLogo';
import { tr } from '../utils/i18n';

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
    connectedTonWallet,
    tickets,
  } = useLottery();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleTabNav = (route: AppRoute) => {
    HapticEngine.selectionChanged();
    setMoreMenuOpen(false);
    navigateTo(route);
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'EN' ? 'FA' : 'EN';
    setLang(nextLang);
  };

  return (
    <>
      {/* TOP TELEGRAM MINI APP COMPACT HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[#070510]/90 border-b border-white/10 select-none">
        <div className="max-w-[440px] mx-auto px-2.5 h-14 flex items-center justify-between gap-1">
          {/* Brand + Language Switcher + Admin Trigger */}
          <div className="flex items-center gap-1 min-w-0 shrink-0">
            <div
              onClick={() => handleTabNav('lobby')}
              className="flex items-center gap-1 cursor-pointer group shrink-0"
            >
              <LuckyDropLogo size={28} />
              <div className="leading-tight hidden min-[410px]:block">
                <div className="flex items-center gap-0.5">
                  <span className="font-black text-[11px] tracking-tight text-white">
                    Lucky<span className="text-[#FFE066]">Drop</span>
                  </span>
                </div>
                <div className="text-[8px] text-slate-400 font-medium truncate max-w-[64px]">
                  {telegramUser.first_name}
                </div>
              </div>
            </div>

            {/* Bilingual Language Toggle Pill (FA | EN) */}
            <button
              type="button"
              onClick={toggleLanguage}
              title={tr(lang, 'تغییر زبان (FA / EN)', 'Switch Language (FA / EN)')}
              data-testid="lang-toggle-btn"
              className="relative z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] font-mono font-black text-white transition-all cursor-pointer shrink-0"
            >
              <Globe className="w-2.5 h-2.5 text-[#00F5D4]" />
              <span className={lang !== 'EN' ? 'text-[#FFE066]' : 'text-slate-400'}>FA</span>
              <span className="text-white/25">|</span>
              <span className={lang === 'EN' ? 'text-[#00F5D4]' : 'text-slate-400'}>EN</span>
            </button>

            {isTelegramAdmin && (
              <button
                type="button"
                onClick={() => handleTabNav('cockpit')}
                title={tr(lang, 'پنل مدیریت ادمین', 'Admin Cockpit')}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer shrink-0 ${
                  activeRoute === 'cockpit'
                    ? 'bg-[#FFD700] text-slate-950 shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                    : 'bg-[#FFD700]/15 text-[#FFE066] border border-[#FFD700]/40 hover:bg-[#FFD700]/25'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden min-[380px]:inline">Admin</span>
              </button>
            )}
          </div>

          {/* Right Controls: Dual-Currency Switcher + Live Balance + My Tickets + More Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Dual-Currency Toggle: TON vs STARS */}
            <div
              className="flex items-center p-0.5 rounded-xl bg-[#120D24] border border-white/10"
              dir="ltr"
            >
              <button
                type="button"
                onClick={() => setActiveTmaCurrency('TON')}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer ${
                  activeTmaCurrency === 'TON'
                    ? 'bg-[#0098EA] text-white shadow-[0_0_10px_rgba(0,152,234,0.45)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💎
              </button>
              <button
                type="button"
                onClick={() => setActiveTmaCurrency('STARS')}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer ${
                  activeTmaCurrency === 'STARS'
                    ? 'bg-gradient-to-r from-[#FFE066] to-[#B8860B] text-slate-950 shadow-[0_0_10px_rgba(255,215,0,0.45)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⭐
              </button>
            </div>

            {/* Balance Pill + Quick Top-Up */}
            <button
              type="button"
              onClick={() => handleTabNav('wallet')}
              className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-gradient-to-r from-[#140F28] to-[#1C1436] border border-white/15 hover:border-[#00F5D4]/50 transition-all cursor-pointer"
            >
              <div className="text-right leading-none" dir="ltr">
                <div className="text-[10px] font-mono font-black text-white">
                  {activeTmaCurrency === 'TON'
                    ? formatCurrency(tonBalance, 'TON')
                    : formatCurrency(starsBalance, 'STARS')}
                </div>
                <div className="text-[8px] font-mono text-[#00F5D4]">
                  {connectedTonWallet ? connectedTonWallet.truncated : tr(lang, '+ شارژ', '+ Top Up')}
                </div>
              </div>
              <div className="w-4 h-4 rounded-md bg-[#00F5D4]/20 border border-[#00F5D4]/40 flex items-center justify-center text-[#00F5D4]">
                <Plus className="w-2.5 h-2.5" />
              </div>
            </button>

            {/* Quick My Tickets Pill */}
            <button
              type="button"
              onClick={() => handleTabNav('my-tickets')}
              title={tr(lang, 'بلیت‌های من', 'My Tickets')}
              data-testid="header-my-tickets-btn"
              className={`relative p-1.5 rounded-xl border transition-all cursor-pointer ${
                activeRoute === 'my-tickets'
                  ? 'bg-[#FFE066]/20 border-[#FFE066]/50 text-[#FFE066]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {tickets.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#00F5D4] text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                  {tickets.length}
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
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                moreMenuOpen
                  ? 'bg-[#00F5D4]/20 border-[#00F5D4]/50 text-[#00F5D4]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {moreMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Quick-Navigation Sheet (440px Constrained) */}
        {moreMenuOpen && (
          <div
            data-testid="more-menu-dropdown"
            className="max-w-[440px] mx-auto px-3 pb-3 pt-1.5 bg-[#0B0818]/98 border-t border-white/10 animate-in fade-in duration-150"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-testid="more-nav-play"
                onClick={() => handleTabNav('play')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#FFE066] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'انتخاب دستی شماره‌ها', 'Custom Ball Picker')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-my-tickets"
                onClick={() => handleTabNav('my-tickets')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-[#00F5D4] shrink-0" />
                <span className="truncate">
                  {tr(lang, `بلیت‌های من (${tickets.length})`, `My Tickets (${tickets.length})`)}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-user-panel"
                onClick={() => handleTabNav('user-panel')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">
                  {tr(lang, 'پروفایل VIP و صندوقچه', 'VIP Profile & Chest')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-winners"
                onClick={() => handleTabNav('winners')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#FFE066] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'برندگان و نتایج ادوار', 'Winners & Draws')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-transparency"
                onClick={() => handleTabNav('transparency')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#00F5D4] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'اثبات عدالت (RNG)', 'Provably Fair RNG')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-how-it-works"
                onClick={() => handleTabNav('how-it-works')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#38BDF8] shrink-0" />
                <span className="truncate">
                  {tr(lang, 'راهنمای بازی و قوانین', 'How It Works')}
                </span>
              </button>
              <button
                type="button"
                data-testid="more-nav-terms"
                onClick={() => handleTabNav('terms')}
                className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 cursor-pointer"
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
          </div>
        )}
      </header>

      {/* BOTTOM 4-TAB MOBILE NAVIGATION BAR (TMA STANDARD) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#070510]/95 backdrop-blur-2xl border-t border-white/10 select-none pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-[440px] mx-auto px-2 h-16 grid grid-cols-4 gap-1 items-center">
          <BottomTabButton
            active={activeRoute === 'lobby' || activeRoute === 'play'}
            onClick={() => handleTabNav('lobby')}
            icon={<Sparkles className="w-5 h-5" />}
            label={tr(lang, 'لابی لاتاری', 'Lottery')}
            subLabel={tr(lang, 'قرعه‌کشی', 'Draws')}
            accent="gold"
          />
          <BottomTabButton
            active={activeRoute === 'mini-games'}
            onClick={() => handleTabNav('mini-games')}
            icon={<Gamepad2 className="w-5 h-5" />}
            label={tr(lang, 'بازی‌های آنی', 'Games')}
            subLabel="Plinko • Crash"
            accent="cyan"
          />
          <BottomTabButton
            active={activeRoute === 'earn'}
            onClick={() => handleTabNav('earn')}
            icon={<Gift className="w-5 h-5" />}
            label={tr(lang, 'ماموریت و دعوت', 'Earn')}
            subLabel={tr(lang, 'پاداش رایگان', 'Quests')}
            accent="emerald"
          />
          <BottomTabButton
            active={
              activeRoute === 'wallet' ||
              activeRoute === 'deposit' ||
              activeRoute === 'withdraw'
            }
            onClick={() => handleTabNav('wallet')}
            icon={<Wallet className="w-5 h-5" />}
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
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  accent: 'gold' | 'cyan' | 'emerald' | 'blue';
}

const BottomTabButton: React.FC<BottomTabButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  subLabel,
  accent,
}) => {
  const activeColorMap = {
    gold: 'text-[#FFE066] bg-[#FFD700]/12 border-[#FFD700]/35',
    cyan: 'text-[#00F5D4] bg-[#00F5D4]/12 border-[#00F5D4]/35',
    emerald: 'text-emerald-300 bg-emerald-500/12 border-emerald-400/35',
    blue: 'text-[#38BDF8] bg-[#0098EA]/15 border-[#0098EA]/40',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl border transition-all cursor-pointer ${
        active
          ? `${activeColorMap[accent]} shadow-sm scale-[1.02]`
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
      }`}
    >
      {icon}
      <span className="text-[11px] font-black mt-0.5 leading-tight">{label}</span>
      <span className="text-[8px] font-mono opacity-75 leading-none mt-0.5">{subLabel}</span>
    </button>
  );
};
