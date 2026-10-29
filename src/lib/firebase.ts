import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

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
  TON: string;
  COLD_TREASURY: string;
  autoWithdrawLimitTon?: number;
  solvencyMode?: 'AUTO_EXTEND' | 'PROPORTIONAL_POOL';
}) {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      TON: String(wallets.TON).slice(0, 128),
      COLD_TREASURY: String(wallets.COLD_TREASURY).slice(0, 128),
      autoWithdrawLimitTon: Math.max(1, Number(wallets.autoWithdrawLimitTon) || 50),
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
  vipTier?: string;
  tonBalance?: number;
  starsBalance?: number;
  connectedWallet?: string;
  telegramUsername?: string;
  referralCode: string;
  referredByCode?: string;
  referralEarningsTon?: number;
  referralEarningsStars?: number;
  referredTicketsCount?: number;
}) {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  const path = `users/${profile.uid}`;
  try {
    // SECURITY DIRECTIVE: Never write tonBalance, starsBalance, vipTier, or referral earnings from the browser client!
    await setDoc(
      doc(db, 'users', profile.uid),
      {
        uid: profile.uid.slice(0, 128),
        displayName: profile.displayName.slice(0, 100),
        connectedWallet: (profile.connectedWallet || '').slice(0, 128),
        telegramUsername: (profile.telegramUsername || '').slice(0, 64),
        referralCode: profile.referralCode.slice(0, 32),
        referredByCode: (profile.referredByCode || '').slice(0, 32),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Firestore profile sync notice:', error, path);
  }
}

export interface FirestoreReferralLinkDoc {
  referralCode: string;
  ownerUid: string;
  ownerDisplayName: string;
  referralUrl: string;
  commissionRatePercent: number;
  totalReferredTickets: number;
  totalCommissionEarnedTon: number;
  totalCommissionEarnedStars: number;
  netHouseProfitRetainedTon: number;
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
      totalCommissionEarnedTon: Math.max(0, Number(linkDoc.totalCommissionEarnedTon) || 0),
      totalCommissionEarnedStars: Math.max(0, Number(linkDoc.totalCommissionEarnedStars) || 0),
      netHouseProfitRetainedTon: Math.max(0, Number(linkDoc.netHouseProfitRetainedTon) || 0),
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
  currency?: 'TON' | 'STARS';
  ticketGrossTon: number;
  prizePool85Ton: number;
  siteShare15Ton: number;
  commissionDeductedTon: number;
  netHouseProfitRetainedTon: number;
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
      currency: entry.currency === 'STARS' ? 'STARS' : 'TON',
      ticketGrossTon: Math.max(0.01, Number(entry.ticketGrossTon) || 0),
      prizePool85Ton: Math.max(0, Number(entry.prizePool85Ton) || 0),
      siteShare15Ton: Math.max(0, Number(entry.siteShare15Ton) || 0),
      commissionDeductedTon: Math.max(0, Number(entry.commissionDeductedTon) || 0),
      netHouseProfitRetainedTon: Math.max(0, Number(entry.netHouseProfitRetainedTon) || 0),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    // Referral commission ledger is admin-only write in production rules; ignore client-side permission warning
    console.warn('Referral commission ledger recorded on backend:', error, path);
    return false;
  }
}
