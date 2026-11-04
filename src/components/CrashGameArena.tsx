import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLottery } from '../context/LotteryContext.tsx';
import {
  deriveProvablyFairCrashPoint,
  calculateCrashMultiplierAtTime,
  CRASH_LUCKY_AIRDROP_THRESHOLD,
  MiniGameEvaluationResult,
  sha256Hex,
} from '../utils/provablyFair.ts';
import { crashSoundEngine } from '../utils/crashSoundEngine.ts';
import { generateDeterministicUuid } from '../services/pamWalletEngine.ts';
import { tmaCurrencyToUsdt } from '../utils/telegramTma.ts';
import {
  TonCrystalIcon,
  TelegramStarIcon,
  LuxuryCrashMultiplierIcon,
  LuxuryMineBombIcon,
  MinesEmeraldGemIcon,
  ProvablyFairShieldIcon,
} from './ui/LuxuryIcons.tsx';

export type CrashPhase = 'COUNTDOWN' | 'IN_PROGRESS' | 'CRASHED';

interface CrashHistoryItem {
  roundId: string;
  nonce: number;
  crashPoint: number;
  hmacHex: string;
  first52BitHex: string;
  serverSeedHash: string;
}

interface ThrusterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  kind: 'FLAME' | 'SMOKE' | 'DEBRIS' | 'CONFETTI';
  color: string;
  rotation: number;
  vRot: number;
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speedFactor: number;
}

interface SimulatedPeerBet {
  id: string;
  username: string;
  betUsdt: number;
  targetCashoutX: number;
  cashedOut: boolean;
  cashedOutAt?: number;
  payoutUsdt?: number;
}

interface PinnedCashoutMarker {
  elapsedSec: number;
  multiplier: number;
  payoutUsdt: number;
  luckyAirdrop: boolean;
  label: string;
}

const TREASURY_MAX_PAYOUT_CAP_USDT = 25000;
const COUNTDOWN_DURATION_SEC = 5.0;
const CRASH_COOLDOWN_SEC = 3.0;

function getFlightCurveColors(
  multiplier: number,
  isCrashed: boolean
): {
  stroke: string;
  glow: string;
  fillTop: string;
  fillBottom: string;
  badgeText: string;
} {
  if (isCrashed) {
    return {
      stroke: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.85)',
      fillTop: 'rgba(244, 63, 94, 0.34)',
      fillBottom: 'rgba(244, 63, 94, 0.01)',
      badgeText: '#fda4af',
    };
  }
  if (multiplier >= 100) {
    // 100.00x+: Supernova Crimson/Magenta (#f43f5e)
    return {
      stroke: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.9)',
      fillTop: 'rgba(244, 63, 94, 0.36)',
      fillBottom: 'rgba(244, 63, 94, 0.02)',
      badgeText: '#f43f5e',
    };
  }
  if (multiplier >= 10) {
    // 10.00x - 99.99x: Electric Gold (#fbbf24)
    return {
      stroke: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.88)',
      fillTop: 'rgba(251, 191, 36, 0.32)',
      fillBottom: 'rgba(251, 191, 36, 0.02)',
      badgeText: '#fbbf24',
    };
  }
  if (multiplier >= 2) {
    // 2.00x - 9.99x: Signature Stake Emerald (#00e701)
    return {
      stroke: '#00e701',
      glow: 'rgba(0, 231, 1, 0.82)',
      fillTop: 'rgba(0, 231, 1, 0.28)',
      fillBottom: 'rgba(0, 231, 1, 0.01)',
      badgeText: '#00e701',
    };
  }
  // 1.00x - 1.99x: Crisp Cyber White / Cyan (#38bdf8)
  return {
    stroke: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.8)',
    fillTop: 'rgba(56, 189, 248, 0.26)',
    fillBottom: 'rgba(56, 189, 248, 0.01)',
    badgeText: '#e2e8f0',
  };
}

function buildSimulatedPeers(nonce: number): SimulatedPeerBet[] {
  const names = [
    'Sovereign_Whale',
    'Aria_TON77',
    'Kourosh_BTC',
    'Nima_VIP',
    'Elena_TRC20',
    'Darius_X',
  ];
  return names.map((username, idx) => {
    const pseudo = ((nonce * 17 + (idx + 1) * 31) % 100) / 100;
    const betUsdt = [10, 25, 50, 15, 100, 40][idx % 6];
    const targetCashoutX = Number((1.35 + pseudo * 6.5).toFixed(2));
    return {
      id: `peer-${nonce}-${idx}`,
      username,
      betUsdt,
      targetCashoutX,
      cashedOut: false,
    };
  });
}

export const CrashGameArena: React.FC<{
  onRoundSettled?: (evaluation: MiniGameEvaluationResult, debitUuid: string) => void;
}> = ({ onRoundSettled }) => {
  const {
    balanceUsdt,
    tonBalance,
    starsBalance,
    tonUsdRate,
    starsUsdRate,
    activeTmaCurrency,
    formatCurrency,
    formatActiveTmaAmount,
    displayName,
    provablyFairSeeds,
    pamDebit,
    pamCredit,
    pamRollback,
    setDepositModalOpen,
    setWalletDrawerOpen,
    navigateTo,
  } = useLottery();

  // Left Control Sidebar State (betAmount is in activeTmaCurrency: TON or STARS)
  const [controlTab, setControlTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [betAmount, setBetAmount] = useState<number>(() =>
    activeTmaCurrency === 'TON' ? 2 : 100
  );
  const [autoCashoutX, setAutoCashoutX] = useState<number>(2.0);
  const [autoBetCount, setAutoBetCount] = useState<number>(10);
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => crashSoundEngine.isMuted());

  useEffect(() => {
    setBetAmount((prev) => {
      if (activeTmaCurrency === 'TON' && prev >= 50) return 2;
      if (activeTmaCurrency === 'STARS' && prev < 10) return 100;
      return prev;
    });
  }, [activeTmaCurrency]);

  // Game State Machine: COUNTDOWN -> IN_PROGRESS -> CRASHED
  const [phase, setPhase] = useState<CrashPhase>('COUNTDOWN');
  const [countdownRemaining, setCountdownRemaining] = useState<number>(COUNTDOWN_DURATION_SEC);
  const [liveMultiplier, setLiveMultiplier] = useState<number>(1.0);
  const [currentCrashPoint, setCurrentCrashPoint] = useState<number>(2.45);
  const [currentRoundId, setCurrentRoundId] = useState<string>('#CRASH-1');
  const [currentHmacHex, setCurrentHmacHex] = useState<string>('');

  // Player Active / Queued Bet State
  const [betPlacedForCurrentRound, setBetPlacedForCurrentRound] = useState<boolean>(false);
  const [betQueuedForNextRound, setBetQueuedForNextRound] = useState<boolean>(false);
  const [activeBetUsdt, setActiveBetUsdt] = useState<number>(0);
  const [activeBetAutoCashoutX, setActiveBetAutoCashoutX] = useState<number>(2.0);
  const [activeDebitUuid, setActiveDebitUuid] = useState<string | null>(null);
  const [playerCashedOutAt, setPlayerCashedOutAt] = useState<number | null>(null);
  const [playerWinAmountUsdt, setPlayerWinAmountUsdt] = useState<number | null>(null);
  const [playerWonLuckyAirdrop, setPlayerWonLuckyAirdrop] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Top Bar: Last 12 Crash Outcomes Ribbon
  const [crashHistory12, setCrashHistory12] = useState<CrashHistoryItem[]>(() => {
    const baseNonce = Math.max(12, provablyFairSeeds.nonce);
    const items: CrashHistoryItem[] = [];
    for (let i = 1; i <= 12; i++) {
      const n = baseNonce - i + 100;
      const derived = deriveProvablyFairCrashPoint({
        serverSeed: provablyFairSeeds.serverSeed,
        clientSeed: provablyFairSeeds.clientSeed,
        nonce: n,
      });
      items.push({
        roundId: `CR-${n}`,
        nonce: n,
        crashPoint: derived.crashPoint,
        hmacHex: derived.hmacHex,
        first52BitHex: derived.first52BitHex,
        serverSeedHash: provablyFairSeeds.serverSeedHash,
      });
    }
    return items;
  });

  // Live Players & Cashouts Feed
  const [peerBets, setPeerBets] = useState<SimulatedPeerBet[]>(() =>
    buildSimulatedPeers(provablyFairSeeds.nonce)
  );

  // Refs for 60FPS Canvas Animation & Exact Mathematical Synchronization
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<CrashPhase>('COUNTDOWN');
  const phaseStartTimeRef = useRef<number>(performance.now());
  const countdownDurationRef = useRef<number>(COUNTDOWN_DURATION_SEC);
  const roundNonceRef = useRef<number>(provablyFairSeeds.nonce);
  const crashPointRef = useRef<number>(2.45);
  const currentMultRef = useRef<number>(1.0);
  const elapsedFlightSecRef = useRef<number>(0);
  const roundHmacRef = useRef<string>('');
  const roundFirst52Ref = useRef<string>('');
  const roundUniformXRef = useRef<number>(0.5);
  const roundIdRef = useRef<string>('#CRASH-1');

  // Player bet refs accessible inside 60Hz loop without re-binding rAF
  const betPlacedRef = useRef<boolean>(false);
  const betQueuedRef = useRef<boolean>(false);
  const activeBetUsdtRef = useRef<number>(0);
  const activeBetNativeRef = useRef<number>(0);
  const activeBetCurrencyRef = useRef<'TON' | 'STARS'>(activeTmaCurrency);
  const activeAutoCashoutRef = useRef<number>(2.0);
  const activeDebitUuidRef = useRef<string | null>(null);
  const cashedOutMarkerRef = useRef<PinnedCashoutMarker | null>(null);
  const cashoutInFlightLockRef = useRef<boolean>(false);
  const shakeFramesRef = useRef<number>(0);
  const particlesRef = useRef<ThrusterParticle[]>([]);
  const starsRef = useRef<StarParticle[]>([]);
  const lastCountdownBeepSecRef = useRef<number>(6);
  const seedsRef = useRef(provablyFairSeeds);
  const onRoundSettledRef = useRef(onRoundSettled);
  const formatActiveTmaAmountRef = useRef(formatActiveTmaAmount);

  useEffect(() => {
    seedsRef.current = provablyFairSeeds;
  }, [provablyFairSeeds]);

  useEffect(() => {
    onRoundSettledRef.current = onRoundSettled;
  }, [onRoundSettled]);

  useEffect(() => {
    formatActiveTmaAmountRef.current = formatActiveTmaAmount;
  }, [formatActiveTmaAmount]);

  // Initialize parallax starfield once
  useEffect(() => {
    const stars: StarParticle[] = [];
    for (let i = 0; i < 48; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.35,
        speedFactor: 0.25 + Math.random() * 0.75,
      });
    }
    starsRef.current = stars;
  }, []);

  // Spawn 45+ emerald confetti particles on player cashout
  const spawnCashoutConfetti = useCallback((x: number, y: number, isAirdrop: boolean) => {
    const colors = isAirdrop
      ? ['#fbbf24', '#fde047', '#00e701', '#ffffff', '#38bdf8']
      : ['#00e701', '#34d399', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 210;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 4 + Math.random() * 4,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.55,
        kind: 'CONFETTI',
        color: colors[i % colors.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
      });
    }
  }, []);

  // Shatter rocket into 60+ fiery shockwave debris particles on Crash
  const spawnCrashExplosionParticles = useCallback((x: number, y: number) => {
    const colors = ['#f43f5e', '#ef4444', '#f97316', '#fbbf24', '#ffffff', '#fb7185'];
    for (let i = 0; i < 68; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 340;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5.5,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.65,
        kind: 'DEBRIS',
        color: colors[i % colors.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
      });
    }
  }, []);

  // Execute Player Cash-Out (Manual or Auto-Cashout) -> Credits PAM Seamless Wallet + Lucky Airdrop if >= 5.00x
  const executePlayerCashout = useCallback(
    async (cashoutMultiplier: number, elapsedSec: number) => {
      if (
        !betPlacedRef.current ||
        cashedOutMarkerRef.current ||
        cashoutInFlightLockRef.current
      ) {
        return;
      }
      cashoutInFlightLockRef.current = true;

      const clampedMult = Number(Math.max(1.01, cashoutMultiplier).toFixed(2));
      const wager = activeBetUsdtRef.current;
      const wagerNative = activeBetNativeRef.current;
      const wagerCurrency = activeBetCurrencyRef.current;
      // Enforce Treasury Payout Cap so house remains 100% solvent
      const rawPayout = Number((wager * clampedMult).toFixed(2));
      const finalPayoutUsdt = Math.min(TREASURY_MAX_PAYOUT_CAP_USDT, rawPayout);
      const finalPayoutTon =
        wagerCurrency === 'TON'
          ? Math.min(5000, Number((wagerNative * clampedMult).toFixed(2)))
          : undefined;
      const finalPayoutStars =
        wagerCurrency === 'STARS'
          ? Math.min(1250000, Math.round(wagerNative * clampedMult))
          : undefined;
      const isLuckyAirdrop = clampedMult >= CRASH_LUCKY_AIRDROP_THRESHOLD;

      // Pin marker onto the curve immediately
      cashedOutMarkerRef.current = {
        elapsedSec,
        multiplier: clampedMult,
        payoutUsdt: finalPayoutUsdt,
        luckyAirdrop: isLuckyAirdrop,
        label: `You Cashed Out @ ${clampedMult.toFixed(2)}x`,
      };
      setPlayerCashedOutAt(clampedMult);
      setPlayerWinAmountUsdt(finalPayoutUsdt);
      setPlayerWonLuckyAirdrop(isLuckyAirdrop);

      // Play emerald cashout synth chord
      crashSoundEngine.playCashout();

      // Credit PAM Seamless Wallet linked to activeDebitUuidRef with strict 1:1 native currency
      const creditUuid = generateDeterministicUuid('crash_credit');
      await pamCredit({
        transactionUuid: creditUuid,
        referenceTransactionUuid: activeDebitUuidRef.current,
        roundId: roundIdRef.current,
        vertical: 'INSTANT_CRASH_X',
        currency: wagerCurrency,
        amountTon: finalPayoutTon,
        amountStars: finalPayoutStars,
        amountUsdt: finalPayoutUsdt,
        note: `برداشت موفق Crash در ضریب ${clampedMult.toFixed(2)}x${
          isLuckyAirdrop ? ' + چتر طلایی بلیت رایگان لاتاری' : ''
        }`,
        awardLuckyAirdropTicket: isLuckyAirdrop,
      });

      const s = seedsRef.current;
      const evaluation: MiniGameEvaluationResult = {
        gameId: 'CRASH_X',
        roundId: roundIdRef.current,
        serverSeed: s.serverSeed,
        serverSeedHash: s.serverSeedHash,
        clientSeed: s.clientSeed,
        nonce: roundNonceRef.current,
        hmacHex: roundHmacRef.current,
        first52BitHex: roundFirst52Ref.current,
        uniformFloatX: roundUniformXRef.current,
        outcomeNumeric: crashPointRef.current,
        outcomeLabel: `Cashed Out @ ${clampedMult.toFixed(2)}x (Crash @ ${crashPointRef.current.toFixed(
          2
        )}x)${isLuckyAirdrop ? ' + 🪂 LUCKY AIRDROP TICKET' : ''}`,
        won: true,
        multiplier: clampedMult,
        payoutUsdt: finalPayoutUsdt,
        plinkoBonusTicket: isLuckyAirdrop,
        crashPoint: crashPointRef.current,
        crashCashedOutAt: clampedMult,
        crashLuckyAirdropTicket: isLuckyAirdrop,
      };

      onRoundSettledRef.current?.(evaluation, activeDebitUuidRef.current || '');
    },
    [pamCredit]
  );

  // Lock in Player Bet during COUNTDOWN (Debits PAM Seamless Wallet immediately)
  const lockBetForCurrentCountdown = useCallback(
    async (customBetAmount?: number, customAutoCashout?: number) => {
      setErrorBanner(null);
      const minBet = activeTmaCurrency === 'TON' ? 0.01 : 1;
      const wagerCurrency =
        activeTmaCurrency === 'TON'
          ? Math.max(minBet, Number((customBetAmount ?? betAmount).toFixed(2)) || 0.01)
          : Math.max(minBet, Math.round(customBetAmount ?? betAmount) || 1);
      const wager = tmaCurrencyToUsdt(
        wagerCurrency,
        activeTmaCurrency,
        tonUsdRate,
        starsUsdRate
      );
      const targetAuto = Math.max(
        1.01,
        Math.min(10000, Number((customAutoCashout ?? autoCashoutX).toFixed(2)) || 2.0)
      );

      const availInCurrency = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
      if (availInCurrency < wagerCurrency || balanceUsdt < wager) {
        setDepositModalOpen(true);
        setErrorBanner('موجودی کیف پول شما کافی نیست. لطفاً ابتدا حساب خود را شارژ کنید.');
        setAutoRunning(false);
        return false;
      }

      const debitUuid = generateDeterministicUuid('crash_debit');
      const rId = roundIdRef.current;
      const debitRes = await pamDebit({
        transactionUuid: debitUuid,
        roundId: rId,
        vertical: 'INSTANT_CRASH_X',
        currency: activeTmaCurrency,
        amountTon: activeTmaCurrency === 'TON' ? wagerCurrency : undefined,
        amountStars: activeTmaCurrency === 'STARS' ? Math.round(wagerCurrency) : undefined,
        amountUsdt: wager,
        note: `ثبت شرط Quantum Crash (${rId}) — Auto @ ${targetAuto.toFixed(2)}x`,
      });

      if (!debitRes.ok) {
        setErrorBanner(debitRes.error || 'خطا در کسر موجودی از کیف پول PAM');
        setAutoRunning(false);
        return false;
      }

      betPlacedRef.current = true;
      activeBetUsdtRef.current = wager;
      activeBetNativeRef.current = wagerCurrency;
      activeBetCurrencyRef.current = activeTmaCurrency;
      activeAutoCashoutRef.current = targetAuto;
      activeDebitUuidRef.current = debitUuid;
      cashedOutMarkerRef.current = null;
      cashoutInFlightLockRef.current = false;

      setBetPlacedForCurrentRound(true);
      setActiveBetUsdt(wager);
      setActiveBetAutoCashoutX(targetAuto);
      setActiveDebitUuid(debitUuid);
      setPlayerCashedOutAt(null);
      setPlayerWinAmountUsdt(null);
      setPlayerWonLuckyAirdrop(false);
      return true;
    },
    [
      betAmount,
      autoCashoutX,
      activeTmaCurrency,
      tonUsdRate,
      starsUsdRate,
      tonBalance,
      starsBalance,
      balanceUsdt,
      pamDebit,
      setDepositModalOpen,
    ]
  );

  // Cancel Placed Bet during COUNTDOWN -> Refunds via PAM Rollback
  const handleCancelPlacedBet = useCallback(async () => {
    if (phaseRef.current !== 'COUNTDOWN' || !betPlacedRef.current || !activeDebitUuidRef.current) {
      return;
    }
    const refUuid = activeDebitUuidRef.current;
    betPlacedRef.current = false;
    activeDebitUuidRef.current = null;
    setBetPlacedForCurrentRound(false);
    setActiveDebitUuid(null);

    await pamRollback({
      referenceTransactionUuid: refUuid,
      roundId: roundIdRef.current,
      vertical: 'INSTANT_CRASH_X',
      note: `لغو شرط توسط بازیکن قبل از شروع پرواز (${roundIdRef.current})`,
    });
  }, [pamRollback]);

  // Primary Action Button Handler (Place Bet / Queue Next Bet / Cancel Bet / Cash Out Now)
  const handlePrimaryActionClick = async () => {
    if (phase === 'IN_PROGRESS') {
      if (betPlacedForCurrentRound && !playerCashedOutAt) {
        // Manual instant cashout at current live multiplier!
        await executePlayerCashout(currentMultRef.current, elapsedFlightSecRef.current);
        return;
      }
      // Otherwise toggle queue for next round
      const nextQueued = !betQueuedRef.current;
      betQueuedRef.current = nextQueued;
      setBetQueuedForNextRound(nextQueued);
      return;
    }

    if (phase === 'COUNTDOWN') {
      if (betPlacedForCurrentRound) {
        await handleCancelPlacedBet();
      } else {
        await lockBetForCurrentCountdown();
      }
      return;
    }

    // During CRASHED cooldown: toggle queue for next round
    const nextQueued = !betQueuedRef.current;
    betQueuedRef.current = nextQueued;
    setBetQueuedForNextRound(nextQueued);
  };

  // Skip remaining countdown and launch the rocket immediately (great for fast solo play & testing)
  const handleSkipCountdownAndLaunchNow = async () => {
    if (phaseRef.current !== 'COUNTDOWN') return;
    if (!betPlacedRef.current) {
      const ok = await lockBetForCurrentCountdown();
      if (!ok) return;
    }
    // Force countdown elapsed to hit 0 on next animation frame
    phaseStartTimeRef.current = performance.now() - countdownDurationRef.current * 1000 - 50;
  };

  // Initialize a fresh COUNTDOWN phase with a new Provably Fair Crash Point
  const startNewCountdownRound = useCallback(
    (now: number, customDurationSec = COUNTDOWN_DURATION_SEC) => {
      roundNonceRef.current += 1;
      const nonce = roundNonceRef.current;
      const s = seedsRef.current;

      const derived = deriveProvablyFairCrashPoint({
        serverSeed: s.serverSeed,
        clientSeed: s.clientSeed,
        nonce,
      });

      const rId = `MG-CRASH-${nonce}-${derived.first52BitHex.slice(0, 5).toUpperCase()}`;
      roundIdRef.current = rId;
      crashPointRef.current = derived.crashPoint;
      roundHmacRef.current = derived.hmacHex;
      roundFirst52Ref.current = derived.first52BitHex;
      roundUniformXRef.current = derived.uniformFloatX;
      currentMultRef.current = 1.0;
      elapsedFlightSecRef.current = 0;
      cashedOutMarkerRef.current = null;
      cashoutInFlightLockRef.current = false;
      lastCountdownBeepSecRef.current = Math.ceil(customDurationSec) + 1;

      phaseRef.current = 'COUNTDOWN';
      phaseStartTimeRef.current = now;
      countdownDurationRef.current = customDurationSec;

      setPhase('COUNTDOWN');
      setCountdownRemaining(customDurationSec);
      setLiveMultiplier(1.0);
      setCurrentCrashPoint(derived.crashPoint);
      setCurrentRoundId(rId);
      setCurrentHmacHex(derived.hmacHex);
      setPlayerCashedOutAt(null);
      setPlayerWinAmountUsdt(null);
      setPlayerWonLuckyAirdrop(false);
      setPeerBets(buildSimulatedPeers(nonce));

      // Reset previous round's bet state
      betPlacedRef.current = false;
      activeDebitUuidRef.current = null;
      setBetPlacedForCurrentRound(false);
      setActiveDebitUuid(null);

      // If user queued a bet or Auto-Bet is active, automatically lock the bet for this countdown
      if (betQueuedRef.current || autoRunning) {
        betQueuedRef.current = false;
        setBetQueuedForNextRound(false);
        lockBetForCurrentCountdown();
      }
    },
    [autoRunning, lockBetForCurrentCountdown]
  );

  // Initialize first round on mount
  useEffect(() => {
    startNewCountdownRound(performance.now(), COUNTDOWN_DURATION_SEC);
    return () => {
      crashSoundEngine.stopFlightSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main 60FPS HTML5 Canvas Render & Exponential Flight Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rAF = 0;
    let lastTime = performance.now();
    let lastUiSyncTime = 0;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.max(320, Math.floor(rect.width * dpr));
      const targetH = Math.max(340, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateCanvasSize();
    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCanvasSize) : null;
    resizeObs?.observe(canvas);

    const renderLoop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      updateCanvasSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      // ----------------------------------------------------------------------
      // A. STATE MACHINE TIMING & TRANSITIONS
      // ----------------------------------------------------------------------
      if (phaseRef.current === 'COUNTDOWN') {
        const elapsed = (now - phaseStartTimeRef.current) / 1000;
        const rem = Math.max(0, countdownDurationRef.current - elapsed);

        const ceilRem = Math.ceil(rem);
        if (ceilRem > 0 && ceilRem < lastCountdownBeepSecRef.current) {
          lastCountdownBeepSecRef.current = ceilRem;
          crashSoundEngine.playTick(ceilRem <= 2);
        }

        if (now - lastUiSyncTime > 65) {
          setCountdownRemaining(rem);
          lastUiSyncTime = now;
        }

        if (rem <= 0) {
          // Transition COUNTDOWN -> IN_PROGRESS
          phaseRef.current = 'IN_PROGRESS';
          phaseStartTimeRef.current = now;
          elapsedFlightSecRef.current = 0;
          currentMultRef.current = 1.0;
          setPhase('IN_PROGRESS');
          setLiveMultiplier(1.0);
          crashSoundEngine.startFlightSound();
        }
      } else if (phaseRef.current === 'IN_PROGRESS') {
        const elapsedSec = (now - phaseStartTimeRef.current) / 1000;
        elapsedFlightSecRef.current = elapsedSec;

        // Exponential Growth Function: M(t) = Math.pow(Math.E, 0.065 * t)
        const rawMult = calculateCrashMultiplierAtTime(elapsedSec);
        const targetCrash = crashPointRef.current;

        // Check if player's Auto-Cashout threshold was reached BEFORE or AT crashPoint
        if (
          betPlacedRef.current &&
          !cashedOutMarkerRef.current &&
          !cashoutInFlightLockRef.current &&
          activeAutoCashoutRef.current <= targetCrash &&
          rawMult >= activeAutoCashoutRef.current
        ) {
          const autoMult = activeAutoCashoutRef.current;
          const autoSec = Math.log(autoMult) / 0.065;
          executePlayerCashout(autoMult, autoSec);
        }

        // Check simulated peer cashouts
        setPeerBets((prev) => {
          let changed = false;
          const next = prev.map((p) => {
            if (!p.cashedOut && p.targetCashoutX <= targetCrash && rawMult >= p.targetCashoutX) {
              changed = true;
              return {
                ...p,
                cashedOut: true,
                cashedOutAt: p.targetCashoutX,
                payoutUsdt: Number((p.betUsdt * p.targetCashoutX).toFixed(2)),
              };
            }
            return p;
          });
          return changed ? next : prev;
        });

        // Check if rocket reached crashPoint
        if (rawMult >= targetCrash) {
          currentMultRef.current = targetCrash;
          phaseRef.current = 'CRASHED';
          phaseStartTimeRef.current = now;
          shakeFramesRef.current = 15; // 15-frame damped camera shake

          setPhase('CRASHED');
          setLiveMultiplier(targetCrash);
          crashSoundEngine.playCrashExplosion();

          // Push to Top 12 Crash Outcomes Ribbon
          setCrashHistory12((prev) => [
            {
              roundId: roundIdRef.current,
              nonce: roundNonceRef.current,
              crashPoint: targetCrash,
              hmacHex: roundHmacRef.current,
              first52BitHex: roundFirst52Ref.current,
              serverSeedHash: seedsRef.current.serverSeedHash,
            },
            ...prev.slice(0, 11),
          ]);

          // If player had an active bet and did NOT cash out before crash, record loss in history
          if (betPlacedRef.current && !cashedOutMarkerRef.current) {
            const s = seedsRef.current;
            const lostEval: MiniGameEvaluationResult = {
              gameId: 'CRASH_X',
              roundId: roundIdRef.current,
              serverSeed: s.serverSeed,
              serverSeedHash: s.serverSeedHash,
              clientSeed: s.clientSeed,
              nonce: roundNonceRef.current,
              hmacHex: roundHmacRef.current,
              first52BitHex: roundFirst52Ref.current,
              uniformFloatX: roundUniformXRef.current,
              outcomeNumeric: targetCrash,
              outcomeLabel: `Crashed @ ${targetCrash.toFixed(2)}x (Target ${activeAutoCashoutRef.current.toFixed(
                2
              )}x)`,
              won: false,
              multiplier: 0,
              payoutUsdt: 0,
              crashPoint: targetCrash,
            };
            onRoundSettledRef.current?.(lostEval, activeDebitUuidRef.current || '');
          }
        } else {
          currentMultRef.current = rawMult;
          crashSoundEngine.updateFlightPitch(rawMult);
          if (now - lastUiSyncTime > 45) {
            setLiveMultiplier(rawMult);
            lastUiSyncTime = now;
          }
        }
      } else if (phaseRef.current === 'CRASHED') {
        const crashElapsed = (now - phaseStartTimeRef.current) / 1000;
        if (crashElapsed >= CRASH_COOLDOWN_SEC) {
          startNewCountdownRound(now, COUNTDOWN_DURATION_SEC);
        }
      }

      // ----------------------------------------------------------------------
      // B. CANVAS 2.5D/3D RENDER PIPELINE
      // ----------------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // 15-frame damped camera shake when CRASHED
      if (shakeFramesRef.current > 0) {
        const intensity = (shakeFramesRef.current / 15) * 9.5;
        const dx = (Math.random() - 0.5) * 2 * intensity;
        const dy = (Math.random() - 0.5) * 2 * intensity;
        ctx.translate(dx, dy);
        shakeFramesRef.current -= 1;
      }

      // 1. Deep Stake Arena Background (#0f212e with radial depth spotlight)
      ctx.fillStyle = '#0f212e';
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(
        W * 0.45,
        H * 0.45,
        20,
        W * 0.45,
        H * 0.45,
        Math.max(W, H) * 0.72
      );
      bgGrad.addColorStop(0, phaseRef.current === 'CRASHED' ? '#2a121d' : '#1b3344');
      bgGrad.addColorStop(0.6, '#122634');
      bgGrad.addColorStop(1, '#0f212e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Dynamic Camera Zoom & Coordinate System Setup
      const padLeft = 58;
      const padRight = W > 760 ? 235 : 32; // Leave room for translucent Live Players overlay on desktop
      const padTop = 38;
      const padBottom = 44;
      const plotW = Math.max(180, W - padLeft - padRight);
      const plotH = Math.max(180, H - padTop - padBottom);

      const curT = elapsedFlightSecRef.current;
      const curM = currentMultRef.current;

      // Dynamic rescaling axes: initial viewport is 10s x 2.0x; expands smoothly as t and M(t) grow
      const maxTimeAxis = Math.max(10, curT * 1.24);
      const maxMultAxis = Math.max(2.0, 1.0 + (curM - 1.0) * 1.28);

      const timeToX = (tSec: number) => padLeft + (tSec / maxTimeAxis) * plotW;
      const multToY = (mVal: number) =>
        padTop + plotH - ((mVal - 1.0) / (maxMultAxis - 1.0)) * plotH;

      // 3. Parallax Starfield (gliding downward & leftward as speed increases)
      const isFlying = phaseRef.current === 'IN_PROGRESS';
      const starSpeed = isFlying ? 18 + Math.min(180, (curM - 1) * 15) : 4;
      for (const star of starsRef.current) {
        star.x -= (starSpeed * star.speedFactor * dt) / W;
        star.y += (starSpeed * 0.45 * star.speedFactor * dt) / H;
        if (star.x < 0) star.x += 1;
        if (star.y > 1) star.y -= 1;

        ctx.beginPath();
        ctx.arc(star.x * W, star.y * H, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${star.alpha})`;
        ctx.fill();
      }

      // 4. Dynamic Rescaling X-Axis (Seconds) & Y-Axis (Multiplier) Grid Lines
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.11)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748b';
      ctx.font = '700 10.5px "JetBrains Mono", monospace';

      // Y-Axis Multiplier Ticks
      const multRange = maxMultAxis - 1.0;
      const rawStepY = multRange / 5;
      const magY = Math.pow(10, Math.floor(Math.log10(Math.max(0.1, rawStepY))));
      const residualY = rawStepY / magY;
      const niceStepY =
        residualY > 5 ? 10 * magY : residualY > 2 ? 5 * magY : residualY > 1 ? 2 * magY : magY;

      const firstTickM = Math.ceil(1.0 / niceStepY) * niceStepY;
      for (let mTick = Math.max(1.0, firstTickM); mTick <= maxMultAxis; mTick += niceStepY) {
        const yPos = multToY(mTick);
        if (yPos < padTop - 4 || yPos > padTop + plotH + 4) continue;

        ctx.beginPath();
        ctx.moveTo(padLeft, yPos);
        ctx.lineTo(padLeft + plotW, yPos);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${mTick >= 10 ? mTick.toFixed(0) : mTick.toFixed(1)}x`,
          padLeft - 8,
          yPos
        );
      }

      // X-Axis Time Ticks (Seconds)
      const rawStepX = maxTimeAxis / 5;
      const niceStepX = rawStepX > 20 ? 20 : rawStepX > 10 ? 10 : rawStepX > 5 ? 5 : 2;
      for (let tTick = 0; tTick <= maxTimeAxis; tTick += niceStepX) {
        const xPos = timeToX(tTick);
        if (xPos < padLeft - 4 || xPos > padLeft + plotW + 4) continue;

        ctx.beginPath();
        ctx.moveTo(xPos, padTop);
        ctx.lineTo(xPos, padTop + plotH);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${tTick}s`, xPos, padTop + plotH + 10);
      }

      // Outer L-shaped Plot Axis Border
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, padTop);
      ctx.lineTo(padLeft, padTop + plotH);
      ctx.lineTo(padLeft + plotW, padTop + plotH);
      ctx.stroke();
      ctx.restore();

      // 5. Lucky Airdrop 5.00x Milestone Guideline (when visible in viewport)
      if (maxMultAxis >= 3.2) {
        const airdropY = multToY(CRASH_LUCKY_AIRDROP_THRESHOLD);
        if (airdropY >= padTop && airdropY <= padTop + plotH) {
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(padLeft, airdropY);
          ctx.lineTo(padLeft + plotW, airdropY);
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.font = '800 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('🪂 5.00x LUCKY TICKET AIRDROP ZONE', padLeft + 10, airdropY - 6);
          ctx.restore();
        }
      }

      // 6. GLOWING EXPONENTIAL BEZIER FLIGHT CURVE, GRADIENT FILL & 2.5D/3D ROCKET
      if (phaseRef.current === 'IN_PROGRESS' || phaseRef.current === 'CRASHED') {
        const isCrashed = phaseRef.current === 'CRASHED';
        const palette = getFlightCurveColors(curM, isCrashed);

        // Sample 60 points along M(tau) = e^(0.065 * tau) for tau in [0, curT]
        const steps = 60;
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= steps; i++) {
          const tau = (curT * i) / steps;
          const mTau = calculateCrashMultiplierAtTime(tau);
          pts.push({
            x: timeToX(tau),
            y: multToY(mTau),
          });
        }

        const tipPt = pts[pts.length - 1] || { x: padLeft, y: padTop + plotH };
        const prevPt = pts[Math.max(0, pts.length - 4)] || {
          x: padLeft - 10,
          y: padTop + plotH,
        };
        const tangentAngle = Math.atan2(tipPt.y - prevPt.y, tipPt.x - prevPt.x);

        // a) Translucent Vertical Gradient Fill underneath the curve
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, padTop + plotH);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const midX = (pts[i - 1].x + pts[i].x) / 2;
          const midY = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(tipPt.x, tipPt.y);
        ctx.lineTo(tipPt.x, padTop + plotH);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, tipPt.y, 0, padTop + plotH);
        areaGrad.addColorStop(0, palette.fillTop);
        areaGrad.addColorStop(1, palette.fillBottom);
        ctx.fillStyle = areaGrad;
        ctx.fill();
        ctx.restore();

        // b) Thick Glowing Quadratic Flight Curve (lineWidth: 5, shadowBlur: 20)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const midX = (pts[i - 1].x + pts[i].x) / 2;
          const midY = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(tipPt.x, tipPt.y);
        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();

        // c) Pinned Green Cash-Out Marker & Lucky Airdrop Parachute on Curve
        if (cashedOutMarkerRef.current) {
          const marker = cashedOutMarkerRef.current;
          const mx = timeToX(marker.elapsedSec);
          const my = multToY(marker.multiplier);

          ctx.save();
          // Glowing emerald node on curve
          ctx.shadowColor = 'rgba(0, 231, 1, 0.95)';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(mx, my, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#00e701';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // If cashed out >= 5.00x, render Golden Parachute Airdrop Emblem above the marker!
          if (marker.luckyAirdrop) {
            ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(mx, my - 34, 13, Math.PI, 0, false);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(mx - 12, my - 34);
            ctx.lineTo(mx, my - 16);
            ctx.moveTo(mx + 12, my - 34);
            ctx.lineTo(mx, my - 16);
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.font = '900 10px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🪂 +1 VIP TICKET AIRDROP!', mx, my - 52);
          }

          // Pinned Callout Pill ("You Cashed Out @ X.XXx")
          const pillText = `${marker.label} (+${formatActiveTmaAmountRef.current(marker.payoutUsdt)})`;
          ctx.font = '800 11px "JetBrains Mono", monospace';
          const textW = ctx.measureText(pillText).width + 18;
          const pillX = Math.max(padLeft + 6, Math.min(padLeft + plotW - textW - 6, mx - textW / 2));
          const pillY = my + 12;

          ctx.fillStyle = 'rgba(5, 28, 12, 0.92)';
          ctx.strokeStyle = '#00e701';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, textW, 24, 7);
          ctx.fill();
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#00e701';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pillText, pillX + textW / 2, pillY + 12.5);
          ctx.restore();
        }

        // d) Emit continuous 40+ physics-driven thruster flame & smoke particles while flying
        if (!isCrashed) {
          const exhaustX = tipPt.x - Math.cos(tangentAngle) * 18;
          const exhaustY = tipPt.y - Math.sin(tangentAngle) * 18;
          const flamePalette = ['#ffffff', '#fde047', '#f97316', '#ef4444'];

          for (let p = 0; p < 3; p++) {
            const spread = (Math.random() - 0.5) * 0.65;
            const ejectAngle = tangentAngle + Math.PI + spread;
            const speed = 90 + Math.random() * 140;
            const isSmoke = Math.random() < 0.28;
            particlesRef.current.push({
              x: exhaustX + (Math.random() - 0.5) * 4,
              y: exhaustY + (Math.random() - 0.5) * 4,
              vx: Math.cos(ejectAngle) * speed,
              vy: Math.sin(ejectAngle) * speed,
              size: isSmoke ? 5 + Math.random() * 6 : 3.5 + Math.random() * 4.5,
              life: 0,
              maxLife: isSmoke ? 0.38 + Math.random() * 0.25 : 0.18 + Math.random() * 0.16,
              kind: isSmoke ? 'SMOKE' : 'FLAME',
              color: isSmoke
                ? 'rgba(148, 163, 184, 0.35)'
                : flamePalette[Math.floor(Math.random() * flamePalette.length)],
              rotation: 0,
              vRot: 0,
            });
          }
        } else if (shakeFramesRef.current === 14) {
          // Trigger 60+ fiery shockwave debris particles on exact crash frame
          spawnCrashExplosionParticles(tipPt.x, tipPt.y);
          if (cashedOutMarkerRef.current) {
            const m = cashedOutMarkerRef.current;
            spawnCashoutConfetti(timeToX(m.elapsedSec), multToY(m.multiplier), m.luckyAirdrop);
          }
        }

        // e) 3D-Shaded Metallic Rocket / Thruster Capsule tilted along Math.atan2
        if (!isCrashed) {
          ctx.save();
          ctx.translate(tipPt.x, tipPt.y);
          ctx.rotate(tangentAngle);

          // Outer thruster bloom
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = 18;

          // Afterburner core cone behind rocket nozzle
          const flameLen = 16 + Math.random() * 10;
          const coneGrad = ctx.createLinearGradient(-14, 0, -14 - flameLen, 0);
          coneGrad.addColorStop(0, '#ffffff');
          coneGrad.addColorStop(0.35, '#fde047');
          coneGrad.addColorStop(0.75, '#f97316');
          coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.beginPath();
          ctx.moveTo(-12, -4.5);
          ctx.lineTo(-14 - flameLen, 0);
          ctx.lineTo(-12, 4.5);
          ctx.closePath();
          ctx.fillStyle = coneGrad;
          ctx.fill();

          // Delta swept fins
          ctx.fillStyle = palette.stroke;
          ctx.beginPath();
          ctx.moveTo(-6, -5);
          ctx.lineTo(-15, -13);
          ctx.lineTo(-12, -4);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(-6, 5);
          ctx.lineTo(-15, 13);
          ctx.lineTo(-12, 4);
          ctx.closePath();
          ctx.fill();

          // 3D Cylindrical Metallic Fuselage
          const bodyGrad = ctx.createLinearGradient(0, -7, 0, 7);
          bodyGrad.addColorStop(0, '#ffffff');
          bodyGrad.addColorStop(0.45, '#e2e8f0');
          bodyGrad.addColorStop(0.8, '#94a3b8');
          bodyGrad.addColorStop(1, '#475569');

          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.quadraticCurveTo(10, -7.5, -12, -6);
          ctx.lineTo(-12, 6);
          ctx.quadraticCurveTo(10, 7.5, 18, 0);
          ctx.closePath();
          ctx.fillStyle = bodyGrad;
          ctx.fill();

          //Glowing cyan cockpit canopy window
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.ellipse(3, -1, 5.2, 2.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.ellipse(4.2, -1.8, 2.1, 1.0, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      // 7. UPDATE & RENDER THRUSTER FLAME, SMOKE, CONFETTI & EXPLOSION DEBRIS PARTICLES
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        if (pt.kind === 'DEBRIS' || pt.kind === 'CONFETTI') {
          pt.vy += 260 * dt; // Gravity
          pt.vx *= Math.pow(0.55, dt);
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.rotation += pt.vRot * dt;

        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (pt.kind === 'CONFETTI' || pt.kind === 'DEBRIS') {
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rotation);
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * (pt.kind === 'SMOKE' ? 1 + pt.life * 1.5 : alpha), 0, Math.PI * 2);
          ctx.fillStyle = pt.color;
          if (pt.kind === 'FLAME') {
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = 10;
          }
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      rAF = window.requestAnimationFrame(renderLoop);
    };

    rAF = window.requestAnimationFrame(renderLoop);
    return () => {
      window.cancelAnimationFrame(rAF);
      resizeObs?.disconnect();
    };
  }, [
    executePlayerCashout,
    spawnCashoutConfetti,
    spawnCrashExplosionParticles,
    startNewCountdownRound,
  ]);

  const handleHalfBet = () => {
    setBetAmount((prev) =>
      activeTmaCurrency === 'TON'
        ? Math.max(0.01, Number((prev / 2).toFixed(2)))
        : Math.max(1, Math.floor(prev / 2))
    );
  };

  const handleDoubleBet = () => {
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    setBetAmount((prev) =>
      activeTmaCurrency === 'TON'
        ? Math.min(Math.max(0.01, avail), Number((prev * 2).toFixed(2)))
        : Math.min(Math.max(1, avail), prev * 2)
    );
  };

  const handleMaxBet = () => {
    const avail = activeTmaCurrency === 'TON' ? tonBalance : starsBalance;
    setBetAmount(
      activeTmaCurrency === 'TON'
        ? Math.max(0.01, Number(avail.toFixed(2)))
        : Math.max(1, Math.floor(avail))
    );
  };

  const handleToggleMute = () => {
    const nextMuted = crashSoundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const curveColors = getFlightCurveColors(liveMultiplier, phase === 'CRASHED');
  const previewBetUsdt = betPlacedForCurrentRound
    ? activeBetUsdt
    : tmaCurrencyToUsdt(betAmount, activeTmaCurrency, tonUsdRate, starsUsdRate);
  const currentPotentialWin = Math.min(
    TREASURY_MAX_PAYOUT_CAP_USDT,
    Number((previewBetUsdt * liveMultiplier).toFixed(2))
  );
  const totalRoundPoolUsdt =
    peerBets.reduce((sum, p) => sum + p.betUsdt, 0) +
    (betPlacedForCurrentRound ? activeBetUsdt : 0);

  return (
    <div className="space-y-3" dir="ltr" data-testid="stake-crash-studio">
      {errorBanner && (
        <div
          className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-between"
          dir="rtl"
        >
          <span>⚠️ {errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-[11px] underline cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* =====================================================================
          TOP: GAME CANVAS CONTAINER
          w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716]
          border border-purple-500/25 overflow-hidden relative
          ===================================================================== */}
      <div className="w-full aspect-[4/3] sm:aspect-square rounded-2xl bg-[#0b0716] border border-purple-500/25 overflow-hidden relative">
        {/* Top-Left: Minimal Floating Translucent Pill for Recent Multipliers */}
        <div
          data-testid="crash-history-ribbon"
          className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 max-w-[70%] overflow-x-auto no-scrollbar"
        >
          {crashHistory12.slice(0, 5).map((h, idx) => {
            const isGold = h.crashPoint >= 10;
            const isGreen = h.crashPoint >= 2 && h.crashPoint < 10;
            return (
              <span
                key={`${h.roundId}-${idx}`}
                data-testid={`crash-history-pill-${idx}`}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tabular-nums shrink-0 ${
                  isGold
                    ? 'bg-[#fbbf24] text-slate-950'
                    : isGreen
                    ? 'bg-[#00f59b] text-[#041f14]'
                    : 'bg-purple-950/90 text-purple-200'
                }`}
              >
                {h.crashPoint.toFixed(2)}×
              </span>
            );
          })}
        </div>

        {/* Top-Right: Minimal Floating Translucent Pill for Sound & Fairness Icons */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            data-testid="crash-audio-mute-btn"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute Crash Audio' : 'Mute Crash Audio'}
            className="h-7 px-2.5 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-purple-200/90 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('transparency')}
            aria-label="Provably Fair Verifier"
            className="h-7 px-2.5 rounded-full bg-[#070510]/80 backdrop-blur-md border border-purple-500/25 text-[11px] font-mono text-[#00f59b] flex items-center gap-1 cursor-pointer active:scale-95 transition-transform duration-200"
          >
            <ProvablyFairShieldIcon size={14} />
            <span>#{roundNonceRef.current}</span>
          </button>
        </div>

        {/* High-DPI HTML5 Flight Canvas */}
        <canvas
          ref={canvasRef}
          data-testid="crash-3d-canvas"
          className="w-full h-full block select-none"
        />

        {/* CENTER HUD READOUT */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 px-4">
          {phase === 'COUNTDOWN' && (
            <div
              data-testid="crash-countdown-hud"
              className="bg-[#130d24]/90 backdrop-blur-md border border-purple-500/30 rounded-2xl px-6 py-4 text-center space-y-2 shadow-2xl max-w-[260px] w-full"
            >
              <div className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-widest">
                NEXT FLIGHT IN
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tabular-nums">
                {countdownRemaining.toFixed(1)}s
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#090612] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00f59b] to-purple-500 transition-all duration-75"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (countdownRemaining / COUNTDOWN_DURATION_SEC) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {phase === 'IN_PROGRESS' && (
            <div className="text-center select-none">
              <div
                data-testid="crash-live-multiplier-hud"
                style={{
                  color: curveColors.badgeText,
                  textShadow: `0 0 28px ${curveColors.glow}`,
                }}
                className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums leading-none tracking-tight"
              >
                {liveMultiplier.toFixed(2)}×
              </div>
              {betPlacedForCurrentRound && !playerCashedOutAt && (
                <div className="mt-1.5 text-xs font-mono font-semibold text-[#00f59b] tabular-nums">
                  +{formatActiveTmaAmount(currentPotentialWin)}
                </div>
              )}
            </div>
          )}

          {phase === 'CRASHED' && (
            <div
              data-testid="crash-crashed-hud"
              className="bg-rose-950/90 border border-rose-500/60 rounded-2xl px-5 py-3 text-center space-y-1 shadow-xl"
            >
              <div className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider inline-flex items-center justify-center gap-1">
                <LuxuryMineBombIcon size={13} />
                <span>CRASHED AT</span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-rose-400 tabular-nums leading-none">
                {currentCrashPoint.toFixed(2)}×
              </div>
            </div>
          )}

          {playerWinAmountUsdt !== null && playerCashedOutAt !== null && (
            <div
              data-testid="crash-player-win-banner"
              className="mt-3 px-4 py-2 rounded-xl bg-[#052e16]/95 border border-[#00f59b] text-white text-xs font-mono font-bold tabular-nums inline-flex items-center gap-1.5"
            >
              <MinesEmeraldGemIcon size={15} />
              <span>
                Cashed Out @ {playerCashedOutAt.toFixed(2)}x (+{formatActiveTmaAmount(playerWinAmountUsdt)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          BOTTOM CONTROL DECK
          rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3
          ===================================================================== */}
      <div className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-3">
        {/* ROW 1: Bet Amount Input (h-11 rounded-xl bg-[#090612] px-3) with 1/2, 2x, MAX */}
        <div className="h-11 rounded-xl bg-[#090612] px-3 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              data-testid="crash-sidebar-balance"
              className="text-sm shrink-0 inline-flex items-center"
              title={formatActiveTmaAmount(balanceUsdt)}
            >
              {activeTmaCurrency === 'TON' ? (
                <TonCrystalIcon size={16} />
              ) : (
                <TelegramStarIcon size={16} />
              )}
            </span>
            <input
              id="crash-bet-input"
              type="number"
              min={activeTmaCurrency === 'TON' ? 0.01 : 1}
              step="any"
              data-testid="crash-bet-input"
              value={betAmount}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                setBetAmount(
                  Number.isFinite(raw) ? Math.max(activeTmaCurrency === 'TON' ? 0.01 : 1, raw) : 0.01
                );
              }}
              className="w-full bg-transparent text-center text-sm font-mono font-bold text-white focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="crash-bet-half"
              onClick={handleHalfBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              data-testid="crash-bet-double"
              onClick={handleDoubleBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              data-testid="crash-bet-max"
              onClick={handleMaxBet}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-purple-950/80 hover:bg-purple-900/80 text-[#fbbf24] transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>
        </div>

        {/* ROW 2: Auto-Cashout Multiplier Input & Presets in uniform h-10 rounded-xl selector */}
        <div className="h-10 rounded-xl bg-[#090612] px-2.5 border border-purple-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium text-purple-300/60 whitespace-nowrap">
              Auto Cashout:
            </span>
            <input
              id="crash-autocashout-input"
              type="number"
              min={1.01}
              max={10000}
              step={0.1}
              data-testid="crash-autocashout-input"
              value={autoCashoutX}
              onChange={(e) => setAutoCashoutX(Math.max(1.01, Number(e.target.value) || 2.0))}
              className="w-16 bg-transparent text-xs font-mono font-bold text-[#00f59b] focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {[1.5, 2.0, 5.0, 10.0].map((preset) => {
              const active = Math.abs(autoCashoutX - preset) < 0.01;
              return (
                <button
                  key={preset}
                  type="button"
                  data-testid={`crash-preset-${preset}x`}
                  onClick={() => setAutoCashoutX(preset)}
                  className={`h-7 px-2 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer tabular-nums ${
                    active
                      ? 'bg-purple-600/40 text-white border border-purple-400/40'
                      : 'bg-purple-950/60 text-purple-300/70 hover:text-white'
                  }`}
                >
                  {preset.toFixed(1)}x
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 3: Full-Width Tactile Primary CTA Button */}
        <div className="flex items-center gap-2">
          {phase === 'IN_PROGRESS' && betPlacedForCurrentRound && !playerCashedOutAt ? (
            <button
              type="button"
              data-testid="crash-cashout-now-btn"
              onClick={handlePrimaryActionClick}
              className="w-full h-12 rounded-xl font-bold text-sm text-[#041f14] bg-[#00f59b] shadow-[0_4px_0_#059669] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Cash Out @ {liveMultiplier.toFixed(2)}x</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/15 text-xs font-mono tabular-nums">
                +{formatActiveTmaAmount(currentPotentialWin)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="crash-primary-bet-btn"
              onClick={handlePrimaryActionClick}
              className="w-full h-12 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#9333ea] to-[#7e22ce] shadow-[0_4px_0_#581c87] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LuxuryCrashMultiplierIcon size={17} />
              <span>
                {phase === 'COUNTDOWN'
                  ? betPlacedForCurrentRound
                    ? 'Cancel Bet'
                    : 'Place Bet'
                  : betQueuedForNextRound
                  ? 'Cancel Queued Bet'
                  : 'Bet (Next Flight)'}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-black/25 text-xs font-mono tabular-nums">
                {formatCurrency(betAmount)}
              </span>
            </button>
          )}

          {phase === 'COUNTDOWN' && (
            <button
              type="button"
              data-testid="crash-launch-now-btn"
              onClick={handleSkipCountdownAndLaunchNow}
              title="Launch Flight Now"
              className="h-12 px-3 rounded-xl bg-[#090612] hover:bg-purple-950/80 border border-purple-500/25 text-xs font-mono font-bold text-[#fbbf24] shrink-0 cursor-pointer inline-flex items-center gap-1 active:scale-95 transition-transform duration-200"
            >
              <LuxuryCrashMultiplierIcon size={15} />
              <span>Now</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          LIVE PLAYERS BETS & CASHOUTS BOARD (لیست زنده شرط‌ها و برداشت بازیکنان)
          ===================================================================== */}
      <div
        data-testid="crash-live-players-board"
        className="rounded-2xl bg-[#130d24] p-3.5 border border-purple-500/20 space-y-2.5"
      >
        <div className="flex items-center justify-between text-xs border-b border-purple-500/15 pb-2" dir="rtl">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-[#00f59b] animate-pulse" />
            <span>شرط‌ها و برداشت‌های زنده بازیکنان ({peerBets.length + (betPlacedForCurrentRound ? 1 : 0)})</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-[#fbbf24] tabular-nums" dir="ltr">
            Pool: {formatActiveTmaAmount(totalRoundPoolUsdt)}
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 text-[10px] font-semibold text-purple-300/60 px-2" dir="ltr">
          <span className="col-span-4">Player</span>
          <span className="col-span-3 text-right">Bet</span>
          <span className="col-span-2 text-center">Mult</span>
          <span className="col-span-3 text-right">Cashout</span>
        </div>

        {/* Live Players Rows */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar" dir="ltr">
          {/* Pinned Current User Row when bet is placed */}
          {betPlacedForCurrentRound && (
            <div
              data-testid="crash-live-player-self"
              className={`grid grid-cols-12 items-center px-2.5 py-2 rounded-xl border text-xs font-mono tabular-nums ${
                playerCashedOutAt !== null
                  ? 'bg-[#052e16]/60 border-[#00f59b]/50 text-white'
                  : phase === 'CRASHED'
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  : 'bg-purple-900/35 border-purple-400/50 text-white'
              }`}
            >
              <div className="col-span-4 flex items-center gap-1.5 truncate font-sans font-bold text-[#fbbf24]">
                <span>👤</span>
                <span className="truncate">{displayName || 'You'}</span>
              </div>
              <div className="col-span-3 text-right font-bold text-white">
                {formatActiveTmaAmount(activeBetUsdt)}
              </div>
              <div className="col-span-2 text-center">
                {playerCashedOutAt !== null ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#00f59b]/20 text-[#00f59b] font-bold text-[10px]">
                    {playerCashedOutAt.toFixed(2)}x
                  </span>
                ) : phase === 'CRASHED' ? (
                  <span className="text-rose-400 font-bold text-[10px] inline-flex items-center justify-center">
                    <LuxuryMineBombIcon size={13} />
                  </span>
                ) : (
                  <span className="text-purple-300 text-[10px]">Flying</span>
                )}
              </div>
              <div className="col-span-3 text-right font-bold">
                {playerCashedOutAt !== null && playerWinAmountUsdt !== null ? (
                  <span className="text-[#00f59b]">+{formatActiveTmaAmount(playerWinAmountUsdt)}</span>
                ) : phase === 'CRASHED' ? (
                  <span className="text-rose-400/80">0.00</span>
                ) : (
                  <span className="text-purple-300/60">...</span>
                )}
              </div>
            </div>
          )}

          {/* Simulated Multiplayer Peers */}
          {peerBets.map((peer) => {
            const isCrashedLoss = phase === 'CRASHED' && !peer.cashedOut;
            return (
              <div
                key={peer.id}
                data-testid={`crash-live-peer-${peer.username}`}
                className={`grid grid-cols-12 items-center px-2.5 py-1.5 rounded-xl border text-[11px] font-mono tabular-nums transition-colors ${
                  peer.cashedOut
                    ? 'bg-[#052e16]/40 border-[#00f59b]/30 text-white'
                    : isCrashedLoss
                    ? 'bg-rose-950/25 border-rose-500/20 text-purple-300/50'
                    : 'bg-[#090612]/90 border-purple-500/15 text-purple-100'
                }`}
              >
                <div className="col-span-4 flex items-center gap-1.5 truncate font-sans font-semibold">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      peer.cashedOut
                        ? 'bg-[#00f59b]'
                        : isCrashedLoss
                        ? 'bg-rose-500'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span className="truncate">{peer.username}</span>
                </div>
                <div className="col-span-3 text-right text-purple-200">
                  {formatActiveTmaAmount(peer.betUsdt)}
                </div>
                <div className="col-span-2 text-center">
                  {peer.cashedOut && peer.cashedOutAt ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#00f59b]/20 text-[#00f59b] font-bold text-[10px]">
                      {peer.cashedOutAt.toFixed(2)}x
                    </span>
                  ) : isCrashedLoss ? (
                    <span className="text-rose-400 text-[10px] inline-flex items-center justify-center">
                      <LuxuryMineBombIcon size={12} />
                    </span>
                  ) : phase === 'IN_PROGRESS' ? (
                    <span className="text-amber-300/80 text-[10px]">Flying</span>
                  ) : (
                    <span className="text-purple-400/50 text-[10px]">Ready</span>
                  )}
                </div>
                <div className="col-span-3 text-right font-bold">
                  {peer.cashedOut && peer.payoutUsdt ? (
                    <span className="text-[#00f59b]">+{formatActiveTmaAmount(peer.payoutUsdt)}</span>
                  ) : isCrashedLoss ? (
                    <span className="text-rose-400/60">-</span>
                  ) : (
                    <span className="text-purple-400/40">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
