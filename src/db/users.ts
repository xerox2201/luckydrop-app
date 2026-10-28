import { db } from './index.ts';
import {
  users,
  lotteryRounds,
  tickets,
  transactions,
  supportMessages,
} from './schema.ts';
import { eq, desc, or, ilike } from 'drizzle-orm';
import {
  calculateWaterfallCashflow,
  computeDeterministicHash,
  deriveProvablyFairBalls,
} from '../utils/lotteryEngine.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || 'کاربر ویژه VIP',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getPlatformSnapshot(uid: string, email: string) {
  try {
    const user = await getOrCreateUser(uid, email);
    const rounds = await db
      .select()
      .from(lotteryRounds)
      .orderBy(desc(lotteryRounds.id));
    const userTickets = await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.id));
    const recentTx = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.id));
    const messages = await db
      .select()
      .from(supportMessages)
      .orderBy(supportMessages.id);

    return {
      user,
      rounds,
      tickets: userTickets,
      transactions: recentTx,
      supportMessages: messages,
    };
  } catch (error) {
    console.error('Database query failed in getPlatformSnapshot:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function purchaseLotteryTicket(params: {
  uid: string;
  email: string;
  roundCode: string;
  mainNumbers: number[];
  goldenBall: number;
  costUsdt: number;
  currencyNetwork: string;
  clientSeed: string;
}) {
  try {
    const user = await getOrCreateUser(params.uid, params.email);
    const costTon = Number((params.costUsdt / 5.0).toFixed(4));
    const currentTonBalance = parseFloat(user.tonBalance);
    if (currentTonBalance < costTon) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    const newTonBalance = (currentTonBalance - costTon).toFixed(4);
    await db
      .update(users)
      .set({ tonBalance: newTonBalance })
      .where(eq(users.uid, params.uid));

    const roundRows = await db
      .select()
      .from(lotteryRounds)
      .where(eq(lotteryRounds.roundCode, params.roundCode));

    const round = roundRows[0];
    const serverSeedHash =
      round?.serverSeedHash ||
      '0x8f4d92a11b6c738e4a9e201f82c498302fbc573aa38792015df33240e512cba9';

    if (round) {
      const wf = calculateWaterfallCashflow(params.costUsdt, parseFloat(round.rtpPercent));
      const updatedJackpot = (parseFloat(round.jackpotUsdt) + wf.prizePoolUsdt).toFixed(2);
      const updatedSales = (parseFloat(round.totalSalesUsdt) + params.costUsdt).toFixed(2);
      const updatedProfit = (
        parseFloat(round.operatorProfitUsdt) + wf.operatorProfitUsdt
      ).toFixed(2);
      const updatedRollover = (
        parseFloat(round.rolloverReserveUsdt) + wf.rolloverReserveUsdt
      ).toFixed(2);

      await db
        .update(lotteryRounds)
        .set({
          jackpotUsdt: updatedJackpot,
          totalSalesUsdt: updatedSales,
          operatorProfitUsdt: updatedProfit,
          rolloverReserveUsdt: updatedRollover,
        })
        .where(eq(lotteryRounds.roundCode, params.roundCode));
    }

    const randSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketCode = `ZR-${randSuffix}`;
    const commitHash = computeDeterministicHash(
      serverSeedHash,
      params.clientSeed,
      ticketCode
    );
    const txHash = computeDeterministicHash(
      commitHash,
      params.currencyNetwork,
      Date.now()
    );

    const insertedTicket = await db
      .insert(tickets)
      .values({
        ticketCode,
        userUid: params.uid,
        roundCode: params.roundCode,
        mainNumbers: JSON.stringify(params.mainNumbers),
        goldenBall: params.goldenBall,
        costUsdt: params.costUsdt.toFixed(2),
        currencyNetwork: params.currencyNetwork,
        txHash,
        clientSeed: params.clientSeed,
        serverSeedHash,
        commitHash: commitHash.slice(2, 34),
        status: 'minted',
        confirmations: 3,
      })
      .returning();

    await db.insert(transactions).values({
      txHash,
      userUid: params.uid,
      type: 'ticket_purchase',
      network: params.currencyNetwork,
      amountUsdt: params.costUsdt.toFixed(2),
      amountCrypto: `${params.costUsdt.toFixed(2)} USDT`,
      winnerName: user.displayName,
      winnerLocation: 'ثبت مستقیم بلاک‌چین',
      lotteryTitle: round?.titleFa || 'سوپر جک‌پات هفتگی',
      winningCombo: `[ ${params.mainNumbers.join(' - ')} + ★${params.goldenBall} ]`,
      timeAgoLabel: 'همین الان',
      status: 'confirmed',
      blockNumber: 61902842 + Math.floor(Math.random() * 500),
      confirmations: 3,
    });

    return {
      ticket: insertedTicket[0],
      tonBalance: parseFloat(newTonBalance),
      starsBalance: user.starsBalance,
    };
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      throw error;
    }
    console.error('Database query failed in purchaseLotteryTicket:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function creditCryptoDeposit(params: {
  uid: string;
  email: string;
  amountUsdt: number;
  network: string;
}) {
  try {
    const user = await getOrCreateUser(params.uid, params.email);
    const addedTon = Number((params.amountUsdt / 5.0).toFixed(4));
    const updatedTonBalance = (parseFloat(user.tonBalance) + addedTon).toFixed(4);
    await db
      .update(users)
      .set({ tonBalance: updatedTonBalance })
      .where(eq(users.uid, params.uid));

    const txHash = computeDeterministicHash(
      params.uid,
      params.network,
      Date.now()
    );

    const tx = await db
      .insert(transactions)
      .values({
        txHash,
        userUid: params.uid,
        type: 'deposit',
        network: params.network,
        amountUsdt: params.amountUsdt.toFixed(2),
        amountCrypto: `${params.amountUsdt.toFixed(2)} USDT`,
        winnerName: user.displayName,
        winnerLocation: `شارژ آنی ${params.network}`,
        lotteryTitle: 'شارژ کیف پول HD',
        winningCombo: 'واریز مستقیم آنچین',
        timeAgoLabel: 'همین الان',
        status: 'confirmed',
        blockNumber: 61903100 + Math.floor(Math.random() * 200),
        confirmations: 19,
      })
      .returning();

    return {
      tonBalance: parseFloat(updatedTonBalance),
      starsBalance: user.starsBalance,
      transaction: tx[0],
    };
  } catch (error) {
    console.error('Database query failed in creditCryptoDeposit:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createLotteryRound(params: {
  titleFa: string;
  category: string;
  ticketPriceUsdt: number;
  rtpPercent: number;
  jackpotUsdt: number;
}) {
  try {
    const roundNum = Math.floor(8500 + Math.random() * 900);
    const roundCode = `#ZRN-${roundNum}`;
    const serverSeedHash = computeDeterministicHash('server-master', roundCode, Date.now());
    const clientSeed = `zarrin-block-seed-${roundNum}`;
    const derived = deriveProvablyFairBalls(serverSeedHash, clientSeed, roundNum);

    const inserted = await db
      .insert(lotteryRounds)
      .values({
        roundCode,
        titleFa: params.titleFa,
        titleEn: params.titleFa,
        titleZh: params.titleFa,
        subtitleFa: 'دوره جدید ایجادشده توسط اتاق فرمان تک‌اپراتوره',
        category: params.category,
        formatLabel: 'قالب: ۵ از ۵۰ + ستاره طلایی',
        jackpotUsdt: params.jackpotUsdt.toFixed(2),
        ticketPriceUsdt: params.ticketPriceUsdt.toFixed(2),
        rtpPercent: params.rtpPercent.toFixed(2),
        soldPercent: 12,
        remainingLabel: 'فروش بلیت آغاز شد',
        drawTimeLabel: 'جمعه ۲۲:۰۰',
        serverSeedHash,
        clientSeed,
        winningNumbers: JSON.stringify(derived.mainNumbers),
        winningGoldenBall: derived.goldenBall,
        status: 'active',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createLotteryRound:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function triggerProvablyFairDraw(roundCode: string) {
  try {
    const allRows = await db.select().from(lotteryRounds);
    const target = allRows.find((r) => r.roundCode === roundCode) || allRows[0];
    if (!target) {
      throw new Error('Round not found');
    }
    const newClientSeed = `eth-block-${Math.floor(19823412 + Math.random() * 9999)}`;
    const derived = deriveProvablyFairBalls(
      target.serverSeedHash,
      newClientSeed,
      target.roundCode
    );

    const updated = await db
      .update(lotteryRounds)
      .set({
        clientSeed: newClientSeed,
        winningNumbers: JSON.stringify(derived.mainNumbers),
        winningGoldenBall: derived.goldenBall,
        serverSeedHash: derived.hash,
      })
      .where(eq(lotteryRounds.roundCode, target.roundCode))
      .returning();

    return {
      round: updated[0],
      drawnMain: derived.mainNumbers,
      drawnGolden: derived.goldenBall,
      hash: derived.hash,
    };
  } catch (error) {
    console.error('Database query failed in triggerProvablyFairDraw:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function toggleRoundStatus(roundCode: string) {
  try {
    const allRows = await db.select().from(lotteryRounds);
    const round = allRows.find((r) => r.roundCode === roundCode) || allRows[0];
    if (!round) throw new Error('Round not found');
    const nextStatus = round.status === 'active' ? 'paused' : 'active';
    const updated = await db
      .update(lotteryRounds)
      .set({ status: nextStatus })
      .where(eq(lotteryRounds.roundCode, round.roundCode))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in toggleRoundStatus:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function addSupportReply(params: {
  sessionCode: string;
  senderName: string;
  senderRole: string;
  subject: string;
  message: string;
}) {
  try {
    const inserted = await db
      .insert(supportMessages)
      .values({
        sessionCode: params.sessionCode,
        senderName: params.senderName,
        senderRole: params.senderRole,
        subject: params.subject,
        message: params.message,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in addSupportReply:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function searchTicketOrHash(query: string) {
  try {
    const clean = query.trim();
    if (!clean) return { tickets: [], transactions: [], rounds: [] };
    const pattern = `%${clean}%`;

    const matchedTickets = await db
      .select()
      .from(tickets)
      .where(
        or(
          ilike(tickets.ticketCode, pattern),
          ilike(tickets.txHash, pattern),
          ilike(tickets.commitHash, pattern)
        )
      );

    const matchedTx = await db
      .select()
      .from(transactions)
      .where(
        or(
          ilike(transactions.txHash, pattern),
          ilike(transactions.winnerName, pattern),
          ilike(transactions.lotteryTitle, pattern)
        )
      );

    const matchedRounds = await db
      .select()
      .from(lotteryRounds)
      .where(
        or(
          ilike(lotteryRounds.roundCode, pattern),
          ilike(lotteryRounds.titleFa, pattern)
        )
      );

    return {
      tickets: matchedTickets,
      transactions: matchedTx,
      rounds: matchedRounds,
    };
  } catch (error) {
    console.error('Database query failed in searchTicketOrHash:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
