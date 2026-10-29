/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TonConnectUI, TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import { LotteryProvider, useLottery } from './context/LotteryContext.tsx';
import {
  TON_CONNECT_WALLETS_LIST_CONFIG,
  filterNonCustodialTonWallets,
} from './utils/telegramTma.ts';
import { SplashScreen } from './components/SplashScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { PlayView } from './components/PlayView.tsx';
import { InstantMiniGamesView } from './components/InstantMiniGamesView.tsx';
import { EarnQuestsView } from './components/EarnQuestsView.tsx';
import { TmaWalletView } from './components/TmaWalletView.tsx';
import { DepositView } from './components/DepositView.tsx';
import { WithdrawView } from './components/WithdrawView.tsx';
import { MyTicketsView } from './components/MyTicketsView.tsx';
import { UserPanelView } from './components/UserPanelView.tsx';
import { TxStatusView } from './components/TxStatusView.tsx';
import { TransparencyView } from './components/TransparencyView.tsx';
import { CockpitView } from './components/CockpitView.tsx';
import { FinancesView } from './components/FinancesView.tsx';
import { LaunchOpsView } from './components/LaunchOpsView.tsx';
import { TermsRulesView } from './components/TermsRulesView.tsx';
import { Decoy404View } from './components/Decoy404View.tsx';
import { DepositModal } from './components/DepositModal.tsx';
import { WalletDrawer } from './components/WalletDrawer.tsx';
import { ViralTicketCardModal } from './components/ViralTicketCardModal.tsx';

// Ensure TonConnectUI modal strictly excludes built-in Telegram Wallet (`telegram-wallet`)
// and prioritizes non-custodial external wallets (`tonkeeper`, `mytonwallet`, `tonhub`).
if (typeof TonConnectUI !== 'undefined' && TonConnectUI.prototype) {
  const originalGetWallets = TonConnectUI.prototype.getWallets;
  if (typeof originalGetWallets === 'function' && !(TonConnectUI.prototype as any).__nonCustodialPatched) {
    (TonConnectUI.prototype as any).__nonCustodialPatched = true;
    TonConnectUI.prototype.getWallets = async function () {
      const list = await originalGetWallets.call(this);
      return filterNonCustodialTonWallets(list);
    };
  }
}

const MainRouter: React.FC = () => {
  const { activeRoute, isTelegramAdmin, splashState, retryHandshake } = useLottery();

  if (!splashState.ready) {
    return <SplashScreen state={splashState} onRetry={retryHandshake} />;
  }

  return (
    <div
      data-testid="tma-mobile-shell"
      className="tma-mobile-portrait-shell relative w-full max-w-[440px] min-h-[100dvh] mx-auto bg-[#070510] text-white antialiased flex flex-col selection:bg-purple-500 selection:text-white overflow-x-hidden"
    >
      {/* Fixed 3D Obsidian & Gold Vault Ambient Background */}
      <div className="fixed inset-0 max-w-[440px] mx-auto pointer-events-none z-0 overflow-hidden">
        <img
          src="/assets/3d/luckydrop-3d-splash-bg.png"
          alt="LuckyDrop 3D Vault Ambient Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-25 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070510]/82 via-[#090514]/88 to-[#070510]/95" />
      </div>
      <Navbar />
      <main className="relative z-10 flex-1 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full"
          >
            {activeRoute === 'lobby' && <LobbyView />}
            {activeRoute === 'play' && <PlayView />}
            {activeRoute === 'mini-games' && <InstantMiniGamesView />}
            {activeRoute === 'earn' && <EarnQuestsView />}
            {activeRoute === 'wallet' && <TmaWalletView />}
            {activeRoute === 'deposit' && <DepositView />}
            {activeRoute === 'withdraw' && <WithdrawView />}
            {activeRoute === 'my-tickets' && <MyTicketsView />}
            {activeRoute === 'user-panel' && <UserPanelView />}
            {activeRoute === 'status' && <TxStatusView />}
            {activeRoute === 'transparency' && <TransparencyView />}
            {activeRoute === 'terms' && <TermsRulesView />}
            {isTelegramAdmin && activeRoute === 'cockpit' && <CockpitView />}
            {isTelegramAdmin && activeRoute === 'finances' && <FinancesView />}
            {isTelegramAdmin && activeRoute === 'launch' && <LaunchOpsView />}
            {activeRoute === '404' && <Decoy404View />}
          </motion.div>
        </AnimatePresence>
      </main>
      <WalletDrawer />
      <DepositModal />
      <ViralTicketCardModal />
    </div>
  );
};

export default function App() {
  const manifestUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tonconnect-manifest.json`
      : 'https://luckydrop.vip/tonconnect-manifest.json';

  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      uiPreferences={{ theme: THEME.DARK }}
      walletsListConfiguration={TON_CONNECT_WALLETS_LIST_CONFIG as any}
    >
      <LotteryProvider>
        <MainRouter />
      </LotteryProvider>
    </TonConnectUIProvider>
  );
}
