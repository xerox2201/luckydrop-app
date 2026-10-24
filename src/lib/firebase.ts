import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'platform'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

export async function syncOfficialWalletsToFirestore(wallets: {
  USDT_TRC20: string;
  TON: string;
  TRX: string;
  BNB: string;
  BTC: string;
  COLD_TREASURY: string;
  solvencyMode?: 'AUTO_EXTEND' | 'PROPORTIONAL_POOL';
}) {
  if (!auth.currentUser) return;
  const path = 'settings/platform';
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      USDT_TRC20: String(wallets.USDT_TRC20).slice(0, 128),
      TON: String(wallets.TON).slice(0, 128),
      TRX: String(wallets.TRX).slice(0, 128),
      BNB: String(wallets.BNB).slice(0, 128),
      BTC: String(wallets.BTC).slice(0, 128),
      COLD_TREASURY: String(wallets.COLD_TREASURY).slice(0, 128),
      solvencyMode: wallets.solvencyMode || 'AUTO_EXTEND',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Only verified admins can mutate global platform settings in Firestore
    console.warn('Firestore settings sync notice:', error);
  }
}

export async function fetchOfficialWalletsFromFirestore() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch {
    // Ignore read error when unauthenticated or offline
  }
  return null;
}

export async function syncUserProfileToFirestore(profile: {
  uid: string;
  displayName: string;
  vipTier: string;
  balanceUsdt: number;
  connectedWallet?: string;
  telegramUsername?: string;
  referralCode: string;
  referredByCode?: string;
  referralEarningsUsdt: number;
  referredTicketsCount: number;
}) {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      uid: profile.uid.slice(0, 128),
      displayName: profile.displayName.slice(0, 100),
      vipTier: profile.vipTier.slice(0, 40),
      balanceUsdt: Math.max(0, Number(profile.balanceUsdt) || 0),
      connectedWallet: (profile.connectedWallet || '').slice(0, 128),
      telegramUsername: (profile.telegramUsername || '').slice(0, 64),
      referralCode: profile.referralCode.slice(0, 32),
      referredByCode: (profile.referredByCode || '').slice(0, 32),
      referralEarningsUsdt: Math.max(0, Number(profile.referralEarningsUsdt) || 0),
      referredTicketsCount: Math.max(0, Number(profile.referredTicketsCount) || 0),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface FirestoreReferralLinkDoc {
  referralCode: string;
  ownerUid: string;
  ownerDisplayName: string;
  referralUrl: string;
  commissionRatePercent: number;
  totalReferredTickets: number;
  totalCommissionEarnedUsdt: number;
  netHouseProfitRetainedUsdt: number;
  updatedAt?: string;
}

export async function syncReferralLinkToFirestore(linkDoc: FirestoreReferralLinkDoc): Promise<boolean> {
  if (!auth.currentUser) return false;
  const cleanCode = linkDoc.referralCode.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  if (cleanCode.length < 4) return false;
  const path = `referrals/${cleanCode}`;
  try {
    await setDoc(doc(db, 'referrals', cleanCode), {
      referralCode: cleanCode,
      ownerUid: auth.currentUser.uid.slice(0, 128),
      ownerDisplayName: (linkDoc.ownerDisplayName || 'VIP Member').slice(0, 100),
      referralUrl: linkDoc.referralUrl.slice(0, 256),
      commissionRatePercent: Math.min(3, Math.max(0, Number(linkDoc.commissionRatePercent) || 2)),
      totalReferredTickets: Math.max(0, Math.floor(Number(linkDoc.totalReferredTickets) || 0)),
      totalCommissionEarnedUsdt: Math.max(0, Number(linkDoc.totalCommissionEarnedUsdt) || 0),
      netHouseProfitRetainedUsdt: Math.max(0, Number(linkDoc.netHouseProfitRetainedUsdt) || 0),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchReferralLinkFromFirestore(
  referralCode: string
): Promise<FirestoreReferralLinkDoc | null> {
  const cleanCode = (referralCode || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  if (cleanCode.length < 4) return null;
  try {
    const snap = await getDoc(doc(db, 'referrals', cleanCode));
    if (snap.exists()) {
      return snap.data() as FirestoreReferralLinkDoc;
    }
  } catch {
    // Public lookup or offline fallback
  }
  return null;
}

export async function recordReferralCommissionInFirestore(entry: {
  commissionId: string;
  referrerCode: string;
  buyerUid: string;
  buyerDisplayName: string;
  roundCode: string;
  ticketGrossUsdt: number;
  prizePool85Usdt: number;
  grossLotteryProfit10Usdt: number;
  commissionDeductedFromProfit2Usdt: number;
  netHouseProfitRetained8Usdt: number;
}): Promise<boolean> {
  if (!auth.currentUser) return false;
  const cleanId = entry.commissionId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  const path = `referralCommissions/${cleanId}`;
  try {
    await setDoc(doc(db, 'referralCommissions', cleanId), {
      commissionId: cleanId,
      referrerCode: entry.referrerCode.slice(0, 32),
      buyerUid: auth.currentUser.uid.slice(0, 128),
      buyerDisplayName: (entry.buyerDisplayName || 'VIP Player').slice(0, 100),
      roundCode: entry.roundCode.slice(0, 32),
      ticketGrossUsdt: Math.max(0.01, Number(entry.ticketGrossUsdt) || 0),
      prizePool85Usdt: Math.max(0, Number(entry.prizePool85Usdt) || 0),
      grossLotteryProfit10Usdt: Math.max(0, Number(entry.grossLotteryProfit10Usdt) || 0),
      commissionDeductedFromProfit2Usdt: Math.max(
        0,
        Number(entry.commissionDeductedFromProfit2Usdt) || 0
      ),
      netHouseProfitRetained8Usdt: Math.max(0, Number(entry.netHouseProfitRetained8Usdt) || 0),
      platformLossUsdt: 0,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

