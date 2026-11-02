/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import { LotteryProvider, useLottery } from './context/LotteryContext';
import { TON_CONNECT_WALLETS_LIST_CONFIG } from './utils/telegramTma';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { PlayView } from './components/PlayView';
import { InstantMiniGamesView } from './components/InstantMiniGamesView';
import { EarnQuestsView } from './components/EarnQuestsView';
import { TmaWalletView } from './components/TmaWalletView';
import { TxStatusView } from './components/TxStatusView';
import { TransparencyView } from './components/TransparencyView';
import { CockpitView } from './components/CockpitView';
import { MyTicketsView } from './components/MyTicketsView';
import { UserPanelView } from './components/UserPanelView';
import { TermsRulesView } from './components/TermsRulesView';
import { WinnersView } from './components/WinnersView';
import { HowItWorksView } from './components/HowItWorksView';
import { ViralTicketCardModal } from './components/ViralTicketCardModal';
import { LiveDrawCeremonyModal } from './components/LiveDrawCeremonyModal';
import { FooterAndChat } from './components/FooterAndChat';
import { SplashScreen } from './components/SplashScreen';

const MainAppContent: React.FC = () => {
  const {
    activeRoute,
    navigateTo,
    isTelegramAdmin,
    splashState,
    retryHandshake,
  } = useLottery();

  // Bind native Telegram WebApp BackButton on any sub-view
  useEffect(() => {
    const backBtn = (window as any)?.Telegram?.WebApp?.BackButton;
    if (!backBtn) return;

    const handleBack = () => {
      navigateTo('lobby');
    };

    try {
      if (activeRoute !== 'lobby') {
        backBtn.show?.();
        backBtn.onClick?.(handleBack);
      } else {
        backBtn.hide?.();
      }
    } catch {
      // ignore outside Telegram environment
    }

    return () => {
      try {
        backBtn.offClick?.(handleBack);
      } catch {
        // ignore
      }
    };
  }, [activeRoute, navigateTo]);

  return (
    <>
      {!splashState.ready && (
        <SplashScreen state={splashState} onRetry={retryHandshake} />
      )}
      <div className="min-h-screen flex flex-col bg-[#070510] text-slate-100 selection:bg-[#00F5D4] selection:text-slate-950 overflow-x-hidden">
        {/* Global Ambient Obsidian & TON Glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[380px] h-[260px] bg-[#0098EA]/12 rounded-full blur-[110px]" />
          <div className="absolute top-1/3 right-0 w-[260px] h-[260px] bg-[#FFD700]/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-16 left-0 w-[280px] h-[280px] bg-[#00F5D4]/8 rounded-full blur-[100px]" />
        </div>

        {/* Sticky Top TMA Header + Fixed Bottom 4-Tab Dock */}
        <Navbar />

        {/* Constrained 440px Mobile TMA Viewport Container (Except Admin Cockpit which uses full width on desktop) */}
        <div
          className={`relative z-10 flex-1 w-full ${
            activeRoute === 'cockpit' && isTelegramAdmin
              ? 'max-w-[1440px] mx-auto pb-20'
              : 'max-w-[440px] mx-auto pb-20'
          }`}
        >
          {activeRoute === 'lobby' && <LobbyView />}
          {activeRoute === 'play' && <PlayView />}
          {activeRoute === 'mini-games' && <InstantMiniGamesView />}
          {activeRoute === 'earn' && <EarnQuestsView />}
          {(activeRoute === 'wallet' ||
            activeRoute === 'deposit' ||
            activeRoute === 'withdraw') && <TmaWalletView />}
          {activeRoute === 'my-tickets' && <MyTicketsView />}
          {activeRoute === 'user-panel' && <UserPanelView />}
          {activeRoute === 'winners' && <WinnersView />}
          {activeRoute === 'how-it-works' && <HowItWorksView />}
          {activeRoute === 'status' && <TxStatusView />}
          {activeRoute === 'transparency' && <TransparencyView />}
          {activeRoute === 'terms' && <TermsRulesView />}
          {activeRoute === 'cockpit' &&
            (isTelegramAdmin ? <CockpitView /> : <LobbyView />)}
          {(activeRoute === '404' ||
            activeRoute === 'finances' ||
            activeRoute === 'launch') && <LobbyView />}
        </div>

        {/* Viral Shareable Golden Ticket & Win Certificate Modal */}
        <ViralTicketCardModal />

        {/* Cinematic Live Lottery Draw & Winner Reveal Ceremony Modal */}
        <LiveDrawCeremonyModal />

        {/* Real Two-Way Live VIP Support Drawer & Floating Concierge Button */}
        <FooterAndChat />
      </div>
    </>
  );
};

export default function App() {
  const manifestUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tonconnect-manifest.json`
      : 'https://luckydrop.com/tonconnect-manifest.json';

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      uiPreferences={{ theme: THEME.DARK }}
      walletsListConfiguration={TON_CONNECT_WALLETS_LIST_CONFIG}
    >
      <LotteryProvider>
        <MainAppContent />
      </LotteryProvider>
    </TonConnectUIProvider>
  );
}
