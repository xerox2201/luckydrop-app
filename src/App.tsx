/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LotteryProvider, useLottery } from './context/LotteryContext.tsx';
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

const MainRouter: React.FC = () => {
  const { activeRoute } = useLottery();

  return (
    <div
      data-testid="tma-mobile-shell"
      className="tma-mobile-portrait-shell w-full max-w-[440px] min-h-[100dvh] mx-auto bg-[#070510] text-white antialiased flex flex-col selection:bg-purple-500 selection:text-white"
    >
      <Navbar />
      <main className="flex-1 w-full overflow-x-hidden">
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
            {activeRoute === 'cockpit' && <CockpitView />}
            {activeRoute === 'finances' && <FinancesView />}
            {activeRoute === 'launch' && <LaunchOpsView />}
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
  return (
    <LotteryProvider>
      <MainRouter />
    </LotteryProvider>
  );
}
