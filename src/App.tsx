/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LotteryProvider, useLottery } from './context/LotteryContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { PlayView } from './components/PlayView.tsx';
import { DepositView } from './components/DepositView.tsx';
import { WithdrawView } from './components/WithdrawView.tsx';
import { MyTicketsView } from './components/MyTicketsView.tsx';
import { TxStatusView } from './components/TxStatusView.tsx';
import { TransparencyView } from './components/TransparencyView.tsx';
import { CockpitView } from './components/CockpitView.tsx';
import { FinancesView } from './components/FinancesView.tsx';
import { LaunchOpsView } from './components/LaunchOpsView.tsx';
import { TermsRulesView } from './components/TermsRulesView.tsx';
import { Decoy404View } from './components/Decoy404View.tsx';
import { DepositModal } from './components/DepositModal.tsx';
import { FooterAndChat } from './components/FooterAndChat.tsx';

const MainRouter: React.FC = () => {
  const { activeRoute } = useLottery();

  return (
    <div className="min-h-screen w-full overflow-x-clip flex flex-col bg-imperial-marble text-[#dfe2ef] selection:bg-amber-500 selection:text-slate-950 pb-16 lg:pb-0">
      <Navbar />
      <main className="flex-1">
        {activeRoute === 'lobby' && <LobbyView />}
        {activeRoute === 'play' && <PlayView />}
        {activeRoute === 'deposit' && <DepositView />}
        {activeRoute === 'withdraw' && <WithdrawView />}
        {activeRoute === 'my-tickets' && <MyTicketsView />}
        {activeRoute === 'status' && <TxStatusView />}
        {activeRoute === 'transparency' && <TransparencyView />}
        {activeRoute === 'terms' && <TermsRulesView />}
        {activeRoute === 'cockpit' && <CockpitView />}
        {activeRoute === 'finances' && <FinancesView />}
        {activeRoute === 'launch' && <LaunchOpsView />}
        {activeRoute === '404' && <Decoy404View />}
      </main>
      <DepositModal />
      <FooterAndChat />
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
