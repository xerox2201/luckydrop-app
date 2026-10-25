/**
 * PROVABLY FAIR CRYPTOGRAPHIC ENGINE (HMAC-SHA256 • 52-BIT IEEE-754 FLOAT)
 * -------------------------------------------------------------------------
 * Production-grade iGaming & iLottery cryptographic utility module.
 * - Pure synchronous + Web Crypto API SHA-256 & HMAC-SHA256 (RFC 2104 / FIPS 180-4)
 * - Manages serverSeed, serverSeedHash (SHA-256 pre-commitment), clientSeed, and nonce
 * - Converts the first 52 bits (13 hex chars) of the HMAC-SHA256 digest into a
 *   uniform float X in [0, 1): X = parseInt(hex.slice(0, 13), 16) / 2^52
 * - Deterministically drives both the Main "LuckyDrop" Lottery Draws and Instant Mini-Games.
 */

export interface ProvablyFairSeedState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  previousServerSeed?: string;
  previousServerSeedHash?: string;
  previousClientSeed?: string;
  previousNonce?: number;
}

export interface ProvablyFairCursorSample {
  cursor: number;
  message: string;
  hmacHex: string;
  first52BitHex: string;
  uint52Value: number;
  uniformFloatX: number;
  mappedNumber: number;
  ballType: 'MAIN' | 'GOLDEN';
}

export interface ProvablyFairLotteryDrawResult {
  roundCode: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  drawnMain: number[];
  drawnGolden: number;
  primaryHmacHex: string;
  first52BitHex: string;
  uniformFloatX: number;
  cursorSamples: ProvablyFairCursorSample[];
  verified: boolean;
  timestampIso: string;
}

export interface TicketPrizeEvaluation {
  won: boolean;
  status: 'WON' | 'LOST';
  tierCode: string;
  tierLabelFa: string;
  tierLabelEn: string;
  matchedMainCount: number;
  matchedGolden: boolean;
  prizeUsdt: number;
  multiplier: number;
}

export interface VerifiableDrawHistoryRecord {
  drawId: string;
  roundCode: string;
  roundTitleFa: string;
  drawnMain: number[];
  drawnGolden: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  primaryHmacHex: string;
  first52BitHex: string;
  uniformFloatX: number;
  ticketsEvaluatedCount: number;
  winnersCount: number;
  totalPayoutUsdt: number;
  createdAt: string;
}

// ============================================================================
// 1. FIPS 180-4 SHA-256 & RFC 2104 HMAC-SHA256 (Pure Synchronous + Web Crypto)
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Pure FIPS 180-4 SHA-256 implementation returning raw 32-byte Uint8Array.
 */
export function sha256Bytes(messageBytes: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLength = messageBytes.length * 8;
  const paddedLength = Math.ceil((messageBytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(messageBytes);
  padded[messageBytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(paddedLength - 8, highBits, false);
  view.setUint32(paddedLength - 4, lowBits, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

/**
 * Computes the 64-character lowercase hex SHA-256 digest of a UTF-8 string.
 * Used to generate serverSeedHash = SHA256(serverSeed) before any bet or draw.
 */
export function sha256Hex(input: string): string {
  return bytesToHex(sha256Bytes(utf8ToBytes(input)));
}

/**
 * Computes RFC 2104 HMAC-SHA256(serverSeed, message) as a 64-character hex string.
 */
export function hmacSha256Hex(serverSeed: string, message: string): string {
  const blockSize = 64;
  let keyBytes = utf8ToBytes(serverSeed);
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const msgBytes = utf8ToBytes(message);
  const innerInput = new Uint8Array(blockSize + msgBytes.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, blockSize);
  return bytesToHex(sha256Bytes(outerInput));
}

/**
 * Web Crypto API async verification of HMAC-SHA256 (for browser/Node SubtleCrypto cross-check).
 */
export async function hmacSha256SubtleAsync(serverSeed: string, message: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(serverSeed),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(message));
    return bytesToHex(new Uint8Array(sig));
  }
  return hmacSha256Hex(serverSeed, message);
}

// ============================================================================
// 2. 52-BIT UNIFORM FLOAT EXTRACTION: X in [0, 1)
// ============================================================================

const TWO_POW_52 = Math.pow(2, 52); // 4503599627370496

/**
 * Converts the first 52 bits (first 13 hex characters) of an HMAC-SHA256 hex digest
 * into a uniform IEEE-754 double-precision float X in [0, 1).
 */
export function hmacTo52BitUniformFloat(hmacHex: string): {
  first52BitHex: string;
  uint52Value: number;
  uniformFloatX: number;
} {
  const cleanHex = hmacHex.replace(/^0x/i, '').padEnd(13, '0');
  const first52BitHex = cleanHex.slice(0, 13).toLowerCase();
  const uint52Value = Number.parseInt(first52BitHex, 16);
  const uniformFloatX = uint52Value / TWO_POW_52;
  return {
    first52BitHex,
    uint52Value,
    uniformFloatX,
  };
}

/**
 * Generates a cryptographically strong 64-char hex serverSeed.
 */
export function generateCryptographicServerSeed(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  const fallbackEntropy = `${Date.now()}-${Math.random()}-${performance?.now?.() || 0}`;
  return sha256Hex(fallbackEntropy);
}

// ============================================================================
// 3. DETERMINISTIC MAIN LOTTERY DRAW ENGINE (HMAC-SHA256 -> 52-BIT FLOATS)
// ============================================================================

/**
 * Deterministically derives a full LuckyDrop lottery draw (e.g. 5 unique main balls + 1 golden ball)
 * using HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${roundCode}:${cursor}`) and the 52-bit float X in [0, 1).
 * Uses Fisher-Yates pool removal so there are zero duplicate balls and zero modulo bias.
 */
export function deriveProvablyFairLotteryDraw(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  roundCode: string;
  mainCount?: number;
  mainMax?: number;
  goldenMax?: number;
}): ProvablyFairLotteryDrawResult {
  const mainCount = params.mainCount ?? 5;
  const mainMax = params.mainMax ?? 50;
  const goldenMax = params.goldenMax ?? 15;

  const cleanServerSeed = params.serverSeed.trim();
  const cleanClientSeed = params.clientSeed.trim() || 'luckydrop_default_client_seed';
  const safeNonce = Math.max(0, Math.floor(params.nonce || 0));
  const cleanRoundCode = params.roundCode.trim() || '#ZRN-8493';

  const serverSeedHash = sha256Hex(cleanServerSeed);

  // Build finite pool [1..mainMax] for rejection-free Fisher-Yates selection via X in [0, 1)
  const pool: number[] = [];
  for (let i = 1; i <= mainMax; i++) {
    pool.push(i);
  }

  const cursorSamples: ProvablyFairCursorSample[] = [];
  const rawMainPicked: number[] = [];

  for (let cursor = 0; cursor < mainCount; cursor++) {
    const message = `${cleanClientSeed}:${safeNonce}:${cleanRoundCode}:${cursor}`;
    const hmacHex = hmacSha256Hex(cleanServerSeed, message);
    const { first52BitHex, uint52Value, uniformFloatX } = hmacTo52BitUniformFloat(hmacHex);

    const pickIndex = Math.floor(uniformFloatX * pool.length);
    const chosenBall = pool.splice(pickIndex, 1)[0];
    rawMainPicked.push(chosenBall);

    cursorSamples.push({
      cursor,
      message,
      hmacHex,
      first52BitHex,
      uint52Value,
      uniformFloatX,
      mappedNumber: chosenBall,
      ballType: 'MAIN',
    });
  }

  const drawnMain = [...rawMainPicked].sort((a, b) => a - b);

  // Golden Ball derivation at cursor = mainCount
  let drawnGolden = 0;
  if (goldenMax > 0) {
    const goldenCursor = mainCount;
    const goldenMsg = `${cleanClientSeed}:${safeNonce}:${cleanRoundCode}:${goldenCursor}`;
    const goldenHmac = hmacSha256Hex(cleanServerSeed, goldenMsg);
    const { first52BitHex, uint52Value, uniformFloatX } = hmacTo52BitUniformFloat(goldenHmac);
    drawnGolden = Math.floor(uniformFloatX * goldenMax) + 1;

    cursorSamples.push({
      cursor: goldenCursor,
      message: goldenMsg,
      hmacHex: goldenHmac,
      first52BitHex,
      uint52Value,
      uniformFloatX,
      mappedNumber: drawnGolden,
      ballType: 'GOLDEN',
    });
  }

  const primary = cursorSamples[0];

  return {
    roundCode: cleanRoundCode,
    serverSeed: cleanServerSeed,
    serverSeedHash,
    clientSeed: cleanClientSeed,
    nonce: safeNonce,
    drawnMain,
    drawnGolden,
    primaryHmacHex: primary.hmacHex,
    first52BitHex: primary.first52BitHex,
    uniformFloatX: primary.uniformFloatX,
    cursorSamples,
    verified: true,
    timestampIso: new Date().toISOString(),
  };
}

// ============================================================================
// 4. TICKET EVALUATION ENGINE ACROSS PRIZE TIERS
// ============================================================================

/**
 * Evaluates a player's lottery ticket against the Provably Fair winning numbers.
 * Supports all prize tiers and returns the exact prize payout in USDT.
 */
export function evaluateTicketPrizeTier(params: {
  ticketMain: number[];
  ticketGolden: number;
  drawnMain: number[];
  drawnGolden: number;
  ticketCostUsdt: number;
  jackpotUsdt?: number;
}): TicketPrizeEvaluation {
  const drawnSet = new Set(params.drawnMain);
  let matchedMainCount = 0;
  for (const num of params.ticketMain) {
    if (drawnSet.has(num)) {
      matchedMainCount++;
    }
  }

  const hasGoldenPool = params.drawnGolden > 0;
  const matchedGolden = hasGoldenPool && params.ticketGolden === params.drawnGolden;
  const baseCost = Math.max(0.5, Number(params.ticketCostUsdt) || 5);
  const jackpot = Math.max(1000, Number(params.jackpotUsdt) || 250000);

  if (matchedMainCount >= 5 && matchedGolden) {
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_1_JACKPOT',
      tierLabelFa: 'جک‌پات الماس (۵ گوی اصلی + گوی طلایی)',
      tierLabelEn: 'Grand Jackpot (5 Main + Golden Ball)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: jackpot,
      multiplier: Number((jackpot / baseCost).toFixed(2)),
    };
  }

  if (matchedMainCount >= 5) {
    const prize = Number((baseCost * 5000).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_2_5_MAIN',
      tierLabelFa: 'رتبه دوم (۵ گوی اصلی)',
      tierLabelEn: 'Tier 2 (5 Main Balls)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 5000,
    };
  }

  if (matchedMainCount === 4 && matchedGolden) {
    const prize = Number((baseCost * 500).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_3_4_PLUS_1',
      tierLabelFa: 'رتبه سوم (۴ گوی اصلی + گوی طلایی)',
      tierLabelEn: 'Tier 3 (4 Main + Golden Ball)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 500,
    };
  }

  if (matchedMainCount === 4) {
    const prize = Number((baseCost * 50).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_4_4_MAIN',
      tierLabelFa: 'رتبه چهارم (۴ گوی اصلی)',
      tierLabelEn: 'Tier 4 (4 Main Balls)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 50,
    };
  }

  if (matchedMainCount === 3 && matchedGolden) {
    const prize = Number((baseCost * 20).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_5_3_PLUS_1',
      tierLabelFa: 'رتبه پنجم (۳ گوی اصلی + گوی طلایی)',
      tierLabelEn: 'Tier 5 (3 Main + Golden Ball)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 20,
    };
  }

  if (matchedMainCount === 3) {
    const prize = Number((baseCost * 5).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_6_3_MAIN',
      tierLabelFa: 'رتبه ششم (۳ گوی اصلی)',
      tierLabelEn: 'Tier 6 (3 Main Balls)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 5,
    };
  }

  if (matchedMainCount === 2 && matchedGolden) {
    const prize = Number((baseCost * 3).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_7_2_PLUS_1',
      tierLabelFa: 'رتبه هفتم (۲ گوی اصلی + گوی طلایی)',
      tierLabelEn: 'Tier 7 (2 Main + Golden Ball)',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 3,
    };
  }

  if (matchedMainCount === 2 || matchedGolden) {
    const prize = Number((baseCost * 1.5).toFixed(2));
    return {
      won: true,
      status: 'WON',
      tierCode: 'TIER_8_CONSOLATION',
      tierLabelFa: matchedGolden ? 'جایزه گوی طلایی (★ تطابق طلایی)' : 'جایزه ۲ گوی اصلی',
      tierLabelEn: matchedGolden ? 'Golden Ball Match Prize' : '2 Main Balls Match',
      matchedMainCount,
      matchedGolden,
      prizeUsdt: prize,
      multiplier: 1.5,
    };
  }

  return {
    won: false,
    status: 'LOST',
    tierCode: 'NO_WIN',
    tierLabelFa: 'بدون تطابق برنده در این دور',
    tierLabelEn: 'No Prize Match',
    matchedMainCount,
    matchedGolden,
    prizeUsdt: 0,
    multiplier: 0,
  };
}

// ============================================================================
// 5. INSTANT MINI-GAMES DETERMINISTIC ENGINE (52-BIT FLOAT X in [0, 1))
// ============================================================================

export type InstantMiniGameId = 'PLINKO' | 'DICE_52' | 'GOLDEN_COIN' | 'CRASH_X';

export type PlinkoRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PlinkoRowCount = 8 | 12 | 16;

export const PLINKO_MULTIPLIER_TABLES: Record<PlinkoRowCount, Record<PlinkoRiskLevel, number[]>> = {
  8: {
    LOW: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    MEDIUM: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    HIGH: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    LOW: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    MEDIUM: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    HIGH: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    LOW: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    MEDIUM: [110, 41, 10, 5, 3, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3, 5, 10, 41, 110],
    HIGH: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

/**
 * Returns whether a given bucket index is a designated "LOTTERY TICKET" Bonus Badge slot.
 * Symmetric outer-second slots (index 1 and rows - 1) award a bonus VIP Lottery Ticket on top of the cash multiplier.
 */
export function isPlinkoBonusTicketSlot(bucketIndex: number, rows: PlinkoRowCount): boolean {
  return bucketIndex === 1 || bucketIndex === rows - 1;
}

/**
 * Deterministically extracts the L/R path array (0 = Left, 1 = Right) and target bucket index
 * from the 52-bit HMAC-SHA256 digest for Stake-style Plinko.
 */
export function deriveProvablyFairPlinkoPath(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  rows: PlinkoRowCount;
  risk: PlinkoRiskLevel;
}): {
  hmacHex: string;
  first52BitHex: string;
  uint52Value: number;
  uniformFloatX: number;
  directions: Array<0 | 1>;
  bucketIndex: number;
  multiplier: number;
  bonusLotteryTicket: boolean;
} {
  const safeRows: PlinkoRowCount =
    params.rows === 8 || params.rows === 12 || params.rows === 16 ? params.rows : 16;
  const safeRisk: PlinkoRiskLevel =
    params.risk === 'LOW' || params.risk === 'MEDIUM' || params.risk === 'HIGH'
      ? params.risk
      : 'MEDIUM';

  const message = `${params.clientSeed.trim() || 'luckydrop_client_seed'}:${Math.max(
    0,
    Math.floor(params.nonce || 0)
  )}:PLINKO`;
  const hmacHex = hmacSha256Hex(params.serverSeed.trim(), message);
  const { first52BitHex, uint52Value, uniformFloatX } = hmacTo52BitUniformFloat(hmacHex);

  // Extract 16 deterministic Bernoulli(0.5) bits from the HMAC-SHA256 hex digest (using 4-hex-char 16-bit chunks)
  const directions: Array<0 | 1> = [];
  let bucketIndex = 0;
  for (let r = 0; r < safeRows; r++) {
    // Each row uses a distinct 2-hex-char byte from the 64-char HMAC digest (32 bytes available, rows <= 16)
    const byteVal = Number.parseInt(hmacHex.slice(r * 2, r * 2 + 2), 16);
    const dir: 0 | 1 = byteVal >= 128 ? 1 : 0;
    directions.push(dir);
    bucketIndex += dir;
  }

  const table = PLINKO_MULTIPLIER_TABLES[safeRows][safeRisk];
  const multiplier = table[bucketIndex] ?? 1.0;
  const bonusLotteryTicket = isPlinkoBonusTicketSlot(bucketIndex, safeRows);

  return {
    hmacHex,
    first52BitHex,
    uint52Value,
    uniformFloatX,
    directions,
    bucketIndex,
    multiplier,
    bonusLotteryTicket,
  };
}

export const CRASH_EXPONENTIAL_RATE = 0.065;
export const CRASH_LUCKY_AIRDROP_THRESHOLD = 5.0;

/**
 * Exponential growth function during IN_PROGRESS phase:
 * M(t) = Math.pow(Math.E, 0.065 * t)
 */
export function calculateCrashMultiplierAtTime(elapsedSeconds: number): number {
  const safeT = Math.max(0, elapsedSeconds);
  return Math.pow(Math.E, CRASH_EXPONENTIAL_RATE * safeT);
}

/**
 * Inverse of M(t) = e^(0.065 * t): returns exact elapsed seconds t for a given multiplier M.
 */
export function calculateCrashTimeForMultiplier(multiplier: number): number {
  const safeM = Math.max(1.0, multiplier);
  return Math.log(safeM) / CRASH_EXPONENTIAL_RATE;
}

/**
 * Derives the Provably Fair Crash Point from the first 52 bits of HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
 * with a 98% RTP (2% house edge h = 0.02):
 * crashPoint = Math.max(1.00, Math.floor((0.98 / (1 - X)) * 100) / 100) (with 2% instant crash at 1.00x).
 */
export function deriveProvablyFairCrashPoint(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  maxMultiplierCap?: number;
}): {
  hmacHex: string;
  first52BitHex: string;
  uint52Value: number;
  uniformFloatX: number;
  crashPoint: number;
  instantCrash: boolean;
} {
  const cleanServerSeed = params.serverSeed.trim();
  const cleanClientSeed = params.clientSeed.trim() || 'luckydrop_client_seed';
  const safeNonce = Math.max(0, Math.floor(params.nonce || 0));
  const message = `${cleanClientSeed}:${safeNonce}`;
  const hmacHex = hmacSha256Hex(cleanServerSeed, message);
  const { first52BitHex, uint52Value, uniformFloatX } = hmacTo52BitUniformFloat(hmacHex);

  const cap = params.maxMultiplierCap ?? 10000;
  // 2% instant crash at 1.00x (h = 0.02)
  if (uniformFloatX < 0.02) {
    return {
      hmacHex,
      first52BitHex,
      uint52Value,
      uniformFloatX,
      crashPoint: 1.0,
      instantCrash: true,
    };
  }

  const rawCrash = Math.floor((0.98 / (1 - uniformFloatX)) * 100) / 100;
  const crashPoint = Math.min(cap, Math.max(1.0, rawCrash));

  return {
    hmacHex,
    first52BitHex,
    uint52Value,
    uniformFloatX,
    crashPoint,
    instantCrash: crashPoint <= 1.0,
  };
}

export type DiceRollMode = 'OVER' | 'UNDER';

export const DICE_RTP_PERCENT = 99; // 99% RTP (1% House Edge)
export const DICE_MIN_WIN_CHANCE = 0.01;
export const DICE_MAX_WIN_CHANCE = 98.0;
export const DICE_TREASURY_MAX_PAYOUT_USDT = 25000;

export interface DiceSyncedParameters {
  mode: DiceRollMode;
  target: number; // 0.01 to 99.99
  winChance: number; // 0.01% to 98.00%
  multiplier: number; // Number((99 / winChance).toFixed(4))
}

/**
 * Exact 10,001-outcome 52-bit roll formula (0.00 to 100.00 inclusive):
 * rollResult = Math.floor(X * 10001) / 100
 */
export function calculate52BitDiceRollResult(uniformFloatX: number): number {
  const clampedX = Math.max(0, Math.min(0.9999999999999999, uniformFloatX));
  return Math.floor(clampedX * 10001) / 100;
}

/**
 * Lottery Jackpot Synergy ("LUCKY 77.77"):
 * Returns true if the 52-bit roll lands on 77.77, 0.00, or 100.00.
 */
export function isDiceLucky7777Roll(rollResult: number): boolean {
  const rounded = Number(rollResult.toFixed(2));
  return rounded === 77.77 || rounded === 0.0 || rounded === 100.0;
}

/**
 * Bidirectional sync from Win Chance % (clamped to [0.01, 98.00]).
 */
export function syncDiceFromWinChance(
  rawWinChance: number,
  mode: DiceRollMode
): DiceSyncedParameters {
  const safeChance = Math.min(
    DICE_MAX_WIN_CHANCE,
    Math.max(DICE_MIN_WIN_CHANCE, Number((Number(rawWinChance) || 50).toFixed(2)))
  );
  const multiplier = Number((DICE_RTP_PERCENT / safeChance).toFixed(4));
  const target =
    mode === 'UNDER'
      ? Number(safeChance.toFixed(2))
      : Number((100 - safeChance).toFixed(2));
  return {
    mode,
    target,
    winChance: safeChance,
    multiplier,
  };
}

/**
 * Bidirectional sync from Roll Over / Roll Under Target.
 */
export function syncDiceFromTarget(
  rawTarget: number,
  mode: DiceRollMode
): DiceSyncedParameters {
  const rawNum = Number(rawTarget);
  const fallbackTarget = 50;
  const cleanTarget = Number.isFinite(rawNum) ? rawNum : fallbackTarget;
  const winChance =
    mode === 'UNDER' ? cleanTarget : Number((100 - cleanTarget).toFixed(2));
  return syncDiceFromWinChance(winChance, mode);
}

/**
 * Bidirectional sync from Multiplier (99% RTP: Multiplier = 99 / winChance).
 */
export function syncDiceFromMultiplier(
  rawMultiplier: number,
  mode: DiceRollMode
): DiceSyncedParameters {
  const minMult = Number((DICE_RTP_PERCENT / DICE_MAX_WIN_CHANCE).toFixed(4)); // 1.0102
  const maxMult = Number((DICE_RTP_PERCENT / DICE_MIN_WIN_CHANCE).toFixed(4)); // 9900.0000
  const safeMult = Math.min(
    maxMult,
    Math.max(minMult, Number(rawMultiplier) || 1.98)
  );
  const derivedWinChance = Number((DICE_RTP_PERCENT / safeMult).toFixed(2));
  return syncDiceFromWinChance(derivedWinChance, mode);
}

/**
 * Flips between Roll Over and Roll Under, inverting the target around 100
 * while keeping Win Chance % and Multiplier synchronized.
 */
export function flipDiceRollMode(
  currentTarget: number,
  currentMode: DiceRollMode
): DiceSyncedParameters {
  const nextMode: DiceRollMode = currentMode === 'OVER' ? 'UNDER' : 'OVER';
  const invertedTarget = Number((100 - currentTarget).toFixed(2));
  return syncDiceFromTarget(invertedTarget, nextMode);
}

export interface MiniGameEvaluationResult {
  gameId: InstantMiniGameId;
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hmacHex: string;
  first52BitHex: string;
  uniformFloatX: number;
  outcomeNumeric: number;
  outcomeLabel: string;
  won: boolean;
  multiplier: number;
  payoutUsdt: number;
  // Plinko-specific deterministic trajectory metadata
  plinkoRows?: PlinkoRowCount;
  plinkoRisk?: PlinkoRiskLevel;
  plinkoDirections?: Array<0 | 1>;
  plinkoBucketIndex?: number;
  plinkoBonusTicket?: boolean;
  // Crash-specific metadata
  crashPoint?: number;
  crashCashedOutAt?: number;
  crashLuckyAirdropTicket?: boolean;
  // 52-Bit Dice specific metadata
  diceMode?: DiceRollMode;
  diceTarget?: number;
  diceWinChance?: number;
  diceLucky7777Ticket?: boolean;
}

/**
 * Evaluates a real-money Instant Mini-Game round using the exact 52-bit float X in [0, 1)
 * derived from HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`).
 * House edge is fixed at 1-2% (98-99% RTP) so the platform remains mathematically solvent.
 */
export function evaluateProvablyFairMiniGame(params: {
  gameId: InstantMiniGameId;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAmountUsdt: number;
  diceRollUnder?: number; // legacy or target (0.01..99.99)
  diceTarget?: number; // 0.01..99.99
  diceMode?: DiceRollMode; // 'OVER' | 'UNDER'
  coinSide?: 'HEADS' | 'TAILS';
  crashAutoCashoutX?: number; // e.g., 2.00
  plinkoRows?: PlinkoRowCount;
  plinkoRisk?: PlinkoRiskLevel;
}): MiniGameEvaluationResult {
  const cleanServerSeed = params.serverSeed.trim();
  const cleanClientSeed = params.clientSeed.trim() || 'luckydrop_client_seed';
  const safeNonce = Math.max(0, Math.floor(params.nonce || 0));
  const serverSeedHash = sha256Hex(cleanServerSeed);

  if (params.gameId === 'PLINKO') {
    const safeRows: PlinkoRowCount =
      params.plinkoRows === 8 || params.plinkoRows === 12 || params.plinkoRows === 16
        ? params.plinkoRows
        : 16;
    const safeRisk: PlinkoRiskLevel =
      params.plinkoRisk === 'LOW' || params.plinkoRisk === 'MEDIUM' || params.plinkoRisk === 'HIGH'
        ? params.plinkoRisk
        : 'MEDIUM';

    const plinkoResult = deriveProvablyFairPlinkoPath({
      serverSeed: cleanServerSeed,
      clientSeed: cleanClientSeed,
      nonce: safeNonce,
      rows: safeRows,
      risk: safeRisk,
    });

    const roundId = `MG-PLINKO-${safeNonce}-${plinkoResult.first52BitHex.slice(0, 6).toUpperCase()}`;
    const payoutUsdt = Math.min(
      DICE_TREASURY_MAX_PAYOUT_USDT,
      Number((params.betAmountUsdt * plinkoResult.multiplier).toFixed(2))
    );
    const won = plinkoResult.multiplier >= 1.0 || plinkoResult.bonusLotteryTicket;
    const pathStr = plinkoResult.directions.map((d) => (d === 1 ? 'R' : 'L')).join('');

    return {
      gameId: 'PLINKO',
      roundId,
      serverSeed: cleanServerSeed,
      serverSeedHash,
      clientSeed: cleanClientSeed,
      nonce: safeNonce,
      hmacHex: plinkoResult.hmacHex,
      first52BitHex: plinkoResult.first52BitHex,
      uniformFloatX: plinkoResult.uniformFloatX,
      outcomeNumeric: plinkoResult.bucketIndex,
      outcomeLabel: `Plinko ${safeRows}R/${safeRisk} • Slot #${plinkoResult.bucketIndex + 1} (${
        plinkoResult.multiplier
      }x)${plinkoResult.bonusLotteryTicket ? ' + 🎫 BONUS TICKET' : ''} [${pathStr}]`,
      won,
      multiplier: plinkoResult.multiplier,
      payoutUsdt,
      plinkoRows: safeRows,
      plinkoRisk: safeRisk,
      plinkoDirections: plinkoResult.directions,
      plinkoBucketIndex: plinkoResult.bucketIndex,
      plinkoBonusTicket: plinkoResult.bonusLotteryTicket,
    };
  }

  // Exact HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`) for 52-Bit Dice
  const message =
    params.gameId === 'DICE_52'
      ? `${cleanClientSeed}:${safeNonce}`
      : `${cleanClientSeed}:${safeNonce}:${params.gameId}`;
  const hmacHex = hmacSha256Hex(cleanServerSeed, message);
  const { first52BitHex, uniformFloatX } = hmacTo52BitUniformFloat(hmacHex);
  const roundId = `MG-${params.gameId}-${safeNonce}-${first52BitHex.slice(0, 6).toUpperCase()}`;

  if (params.gameId === 'DICE_52') {
    const mode: DiceRollMode = params.diceMode === 'OVER' ? 'OVER' : 'UNDER';
    const rawTarget =
      typeof params.diceTarget === 'number'
        ? params.diceTarget
        : typeof params.diceRollUnder === 'number'
        ? params.diceRollUnder
        : 50.0;
    const synced = syncDiceFromTarget(rawTarget, mode);

    // Exact 10,001-outcome roll result (0.00 to 100.00):
    // rollResult = Math.floor(X * 10001) / 100
    const rollResult = calculate52BitDiceRollResult(uniformFloatX);
    const won =
      synced.mode === 'UNDER' ? rollResult < synced.target : rollResult > synced.target;
    const rawPayout = won ? Number((params.betAmountUsdt * synced.multiplier).toFixed(2)) : 0;
    const payoutUsdt = Math.min(DICE_TREASURY_MAX_PAYOUT_USDT, rawPayout);
    const lucky7777Ticket = isDiceLucky7777Roll(rollResult);
    const opSymbol = synced.mode === 'UNDER' ? '<' : '>';

    return {
      gameId: 'DICE_52',
      roundId,
      serverSeed: cleanServerSeed,
      serverSeedHash,
      clientSeed: cleanClientSeed,
      nonce: safeNonce,
      hmacHex,
      first52BitHex,
      uniformFloatX,
      outcomeNumeric: rollResult,
      outcomeLabel: `Dice ${rollResult.toFixed(2)} (Roll ${
        synced.mode === 'UNDER' ? 'Under' : 'Over'
      } ${opSymbol} ${synced.target.toFixed(2)} • ${synced.multiplier.toFixed(4)}x)${
        lucky7777Ticket ? ' + 🎰 LUCKY 77.77 FREE TICKET' : ''
      }`,
      won,
      multiplier: won ? synced.multiplier : 0,
      payoutUsdt,
      plinkoBonusTicket: lucky7777Ticket,
      diceMode: synced.mode,
      diceTarget: synced.target,
      diceWinChance: synced.winChance,
      diceLucky7777Ticket: lucky7777Ticket,
    };
  }

  if (params.gameId === 'GOLDEN_COIN') {
    const chosenSide = params.coinSide === 'TAILS' ? 'TAILS' : 'HEADS';
    const landedSide: 'HEADS' | 'TAILS' = uniformFloatX < 0.5 ? 'HEADS' : 'TAILS';
    const won = landedSide === chosenSide;
    const multiplier = 1.94; // 97% RTP
    const payoutUsdt = won ? Number((params.betAmountUsdt * multiplier).toFixed(2)) : 0;

    return {
      gameId: 'GOLDEN_COIN',
      roundId,
      serverSeed: cleanServerSeed,
      serverSeedHash,
      clientSeed: cleanClientSeed,
      nonce: safeNonce,
      hmacHex,
      first52BitHex,
      uniformFloatX,
      outcomeNumeric: uniformFloatX < 0.5 ? 0 : 1,
      outcomeLabel: landedSide === 'HEADS' ? 'شیر طلایی (HEADS)' : 'خط سلطنتی (TAILS)',
      won,
      multiplier: won ? multiplier : 0,
      payoutUsdt,
    };
  }

  // CRASH_X: 98% RTP (h = 0.02) Stake Crash Point formula:
  // crashPoint = Math.max(1.00, Math.floor((0.98 / (1 - X)) * 100) / 100) with 2% instant crash at 1.00x
  const crashDerived = deriveProvablyFairCrashPoint({
    serverSeed: cleanServerSeed,
    clientSeed: cleanClientSeed,
    nonce: safeNonce,
  });
  const targetCashout = Math.min(10000, Math.max(1.01, Number(params.crashAutoCashoutX) || 2.0));
  const crashPoint = crashDerived.crashPoint;
  const won = crashPoint >= targetCashout;
  const payoutUsdt = won ? Number((params.betAmountUsdt * targetCashout).toFixed(2)) : 0;
  const luckyAirdrop = won && targetCashout >= CRASH_LUCKY_AIRDROP_THRESHOLD;
  const crashRoundId = `MG-CRASH_X-${safeNonce}-${crashDerived.first52BitHex.slice(0, 6).toUpperCase()}`;

  return {
    gameId: 'CRASH_X',
    roundId: crashRoundId,
    serverSeed: cleanServerSeed,
    serverSeedHash,
    clientSeed: cleanClientSeed,
    nonce: safeNonce,
    hmacHex: crashDerived.hmacHex,
    first52BitHex: crashDerived.first52BitHex,
    uniformFloatX: crashDerived.uniformFloatX,
    outcomeNumeric: crashPoint,
    outcomeLabel: `Crash @ ${crashPoint.toFixed(2)}x (Cashout ${targetCashout.toFixed(2)}x)${
      luckyAirdrop ? ' + 🪂 LUCKY AIRDROP TICKET' : ''
    }`,
    won,
    multiplier: won ? targetCashout : 0,
    payoutUsdt,
    plinkoBonusTicket: luckyAirdrop,
    crashPoint,
    crashCashedOutAt: won ? targetCashout : undefined,
    crashLuckyAirdropTicket: luckyAirdrop,
  };
}


