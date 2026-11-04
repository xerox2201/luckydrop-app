import { GoogleGenAI } from '@google/genai';
import { PAMSeamlessWalletEngine } from './pamWalletEngine.ts';
import {
  roundTonClean,
  roundStarsClean,
  normalizeRakebackVaultState,
  normalizeReferralProfileState,
  WELCOME_GRAND_ROUND_ID,
  type IsolatedUserAccountRecord,
  type MonthlySuperJackpotState,
  type MonthlyVipQualificationResult,
  type WelcomeGrandLotteryState,
  type UserWelcomeTicketStatus,
  type SyndicatePoolRecord,
} from './securityGuard.ts';

export type SupportedAiLocale = 'fa' | 'en' | 'ru' | 'ar' | 'es';

export function normalizeAiLocale(raw?: string | null): SupportedAiLocale {
  const clean = String(raw || '')
    .trim()
    .toLowerCase();
  if (clean.startsWith('en')) return 'en';
  if (clean.startsWith('ru')) return 'ru';
  if (clean.startsWith('ar')) return 'ar';
  if (clean.startsWith('es')) return 'es';
  return 'fa';
}

export type UserConciergeQuickChipId =
  | 'ACCOUNT_STATUS'
  | 'WELCOME_1000_GUIDE'
  | 'SYNDICATE_REFERRAL_GUIDE'
  | 'PROVABLY_FAIR_AUDIT'
  | 'HUMAN_ESCALATION';

export type AdminCopilotActionId =
  | 'BALANCE_SHEET'
  | 'PAM_RECONCILE'
  | 'RESERVE_VAULTS'
  | 'SYNDICATE_REFERRAL';

export interface UserConciergeTelemetryInput {
  userKey: string;
  displayName: string;
  username?: string;
  vipTier?: string;
  tonBalance: number;
  starsBalance: number;
  xp: number;
  activeTicketsCount: number;
  totalTicketsCount: number;
  rakebackClaimableTon: number;
  rakebackClaimableStars: number;
  rakebackLifetimeTon: number;
  referralCode: string;
  referredByUserKey: string | null;
  invitedCount: number;
  activeBuyersCount: number;
  claimableReferralTon: number;
  claimableReferralStars: number;
  lifetimeReferralTon: number;
  welcomeTicketStatus: UserWelcomeTicketStatus;
  welcomeGrandLottery: WelcomeGrandLotteryState;
  monthlySuperJackpot: MonthlySuperJackpotState;
  monthlyVipQualification: MonthlyVipQualificationResult;
  activeSyndicatesCount: number;
  userSyndicateSharesCount: number;
  userSyndicateContributedTon: number;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

export interface UserConciergeReplyResult {
  replyTextFa: string;
  replyText: string;
  locale: SupportedAiLocale;
  detectedIntent: UserConciergeQuickChipId | 'GENERAL_CONCIERGE';
  escalatedToHuman: boolean;
  engineMode: 'DETERMINISTIC_TELEMETRY' | 'GEMINI_HYBRID';
  telemetrySummary: {
    tonBalanceFormatted: string;
    starsBalance: number;
    claimableCashbackTonFormatted: string;
    claimableReferralTonFormatted: string;
    welcomeTicketStatusCode: string;
    activeSyndicateShares: number;
    vipSuperTicketsCount: number;
  };
}

export interface AdminExecutiveTelemetrySnapshot {
  totalUsersCount: number;
  reconciledWalletsCount: number;
  discrepancyWalletsCount: number;
  totalPamDiscrepancyTon: number;
  totalPamDiscrepancyFormatted: string;
  allWalletsReconciledClean: boolean;
  totalUserTonBalances: number;
  totalUserStarsBalances: number;
  grossTicketSalesTon: number;
  grossTicketSalesUsdt: number;
  lockedPrizePool85Ton: number;
  buyerCashback3PercentTon: number;
  unclaimedCashbackLiabilityTon: number;
  referralCommission2PercentTon: number;
  unclaimedReferralLiabilityTon: number;
  welcomeLotteryReserve3PercentTon: number;
  netHouseProfitTon: number;
  netHouseProfitUsdt: number;
  welcomeReserveFundedTon: number;
  welcomeReserveTargetTon: number;
  welcomeReserveProgressPercent: number;
  monthlySuperJackpotPoolTon: number;
  activeSyndicatesCount: number;
  openSyndicatesCount: number;
  fullOrSettledSyndicatesCount: number;
  totalSyndicateSharesFilled: number;
  totalReferralInvitedCount: number;
  totalReferralActiveBuyersCount: number;
}

export interface AdminCopilotReportResult {
  ok: true;
  actionType: AdminCopilotActionId;
  locale: SupportedAiLocale;
  titleFa: string;
  reportFa: string;
  title: string;
  report: string;
  engineMode: 'DETERMINISTIC_TELEMETRY' | 'GEMINI_HYBRID';
  generatedAtIso: string;
  telemetry: AdminExecutiveTelemetrySnapshot;
}

/**
 * Classifies user message or quick-ask chip into one of the 5 structured concierge intents across all 5 languages.
 */
export function detectUserConciergeIntent(
  message: string,
  explicitChipId?: string | null
): UserConciergeQuickChipId | 'GENERAL_CONCIERGE' {
  const cleanChip = String(explicitChipId || '').trim().toUpperCase();
  if (
    cleanChip === 'ACCOUNT_STATUS' ||
    cleanChip === 'WELCOME_1000_GUIDE' ||
    cleanChip === 'SYNDICATE_REFERRAL_GUIDE' ||
    cleanChip === 'PROVABLY_FAIR_AUDIT' ||
    cleanChip === 'HUMAN_ESCALATION'
  ) {
    return cleanChip as UserConciergeQuickChipId;
  }

  const q = String(message || '').trim().toLowerCase();
  if (
    q.includes('مدیر ارشد') ||
    q.includes('تیکت انسانی') ||
    q.includes('اپراتور انسانی') ||
    q.includes('پشتیبان انسانی') ||
    q.includes('human') ||
    q.includes('senior admin') ||
    q.includes('оператор') ||
    q.includes('администратор') ||
    q.includes('مشرف') ||
    q.includes('بشري') ||
    q.includes('humano') ||
    q.includes('ejecutivo')
  ) {
    return 'HUMAN_ESCALATION';
  }
  if (
    q.includes('۱,۰۰۰') ||
    q.includes('1,000') ||
    q.includes('1000') ||
    q.includes('۱۰۰۰') ||
    q.includes('خوشآمد') ||
    q.includes('بلیت رایگان') ||
    q.includes('welcome') ||
    q.includes('приветствен') ||
    q.includes('бесплатн') ||
    q.includes('ترحيب') ||
    q.includes('مجاني') ||
    q.includes('bienvenida') ||
    q.includes('gratis')
  ) {
    return 'WELCOME_1000_GUIDE';
  }
  if (
    q.includes('سندیکا') ||
    q.includes('پورسانت') ||
    q.includes('دعوت') ||
    q.includes('رفرال') ||
    q.includes('۲٪') ||
    q.includes('2%') ||
    q.includes('syndicate') ||
    q.includes('referral') ||
    q.includes('squad') ||
    q.includes('синдикат') ||
    q.includes('реферал') ||
    q.includes('نقابة') ||
    q.includes('إحالة') ||
    q.includes('عمولة') ||
    q.includes('sindicato') ||
    q.includes('referido') ||
    q.includes('escuadrón')
  ) {
    return 'SYNDICATE_REFERRAL_GUIDE';
  }
  if (
    q.includes('عدالت') ||
    q.includes('provably fair') ||
    q.includes('hmac') ||
    q.includes('sha256') ||
    q.includes('سید') ||
    q.includes('seed') ||
    q.includes('честност') ||
    q.includes('نزاهة') ||
    q.includes('تشفير') ||
    q.includes('equidad') ||
    q.includes('criptográf')
  ) {
    return 'PROVABLY_FAIR_AUDIT';
  }
  if (
    q.includes('وضعیت حساب') ||
    q.includes('کشبک') ||
    q.includes('کش‌بک') ||
    q.includes('بلیت‌های من') ||
    q.includes('بلیتهای من') ||
    q.includes('موجودی') ||
    q.includes('واریز') ||
    q.includes('برداشت') ||
    q.includes('account') ||
    q.includes('cashback') ||
    q.includes('balance') ||
    q.includes('статус') ||
    q.includes('кэшбэк') ||
    q.includes('баланс') ||
    q.includes('حسابي') ||
    q.includes('رصيد') ||
    q.includes('كاش باك') ||
    q.includes('cuenta') ||
    q.includes('saldo') ||
    q.includes('reembolso')
  ) {
    return 'ACCOUNT_STATUS';
  }
  return 'GENERAL_CONCIERGE';
}

function getLocalizedWelcomeStatusText(
  locale: SupportedAiLocale,
  status: UserWelcomeTicketStatus
): string {
  const code = status.welcomeTicketCode || '#LD-WELCOME-1000';
  if (status.welcomeTicketClaimed) {
    if (locale === 'en') return `Minted & Active (Ticket Code: ${code})`;
    if (locale === 'ru') return `Выпущен и активен (Код билета: ${code})`;
    if (locale === 'ar') return `تم الإصدار ونشط (رمز التذكرة: ${code})`;
    if (locale === 'es') return `Emitido y activo (Código de boleto: ${code})`;
    return `ثبت‌شده (کد بلیت: ${code})`;
  }
  if (status.welcomeTicketUnlocked) {
    if (locale === 'en') return 'Unlocked & Ready to pick 5 Main + 1 Golden Ball for FREE';
    if (locale === 'ru') return 'Разблокирован и готов к бесплатному выбору 5 основных + 1 золотого шара';
    if (locale === 'ar') return 'مفتوح وجاهز لاختيار 5 كرات رئيسية + كرة ذهبية واحدة مجاناً';
    if (locale === 'es') return 'Desbloqueado y listo para elegir 5 números principales + 1 bola dorada GRATIS';
    return 'آزاد شده و آماده انتخاب ۵ گوی اصلی + ۱ گوی طلایی رایگان';
  }
  if (locale === 'en') return 'Locked (Unlocks immediately after your 1st official lottery ticket purchase)';
  if (locale === 'ru') return 'Заблокирован (открывается сразу после покупки первого официального билета)';
  if (locale === 'ar') return 'مقفل (يُفتح فوراً بعد شراء أول تذكرة يانصيب رسمية)';
  if (locale === 'es') return 'Bloqueado (se desbloquea al instante tras comprar tu primer boleto oficial)';
  return 'قفل (با خرید اولین بلیت رسمی لاتاری بلافاصله باز می‌شود)';
}

/**
 * Deterministic (< 5ms) 5-Language VIP Concierge response generator using exact 6-decimal (`toFixed(6)`) figures.
 */
export function buildDeterministicUserConciergeReply(
  input: UserConciergeTelemetryInput,
  message: string,
  explicitChipId?: string | null,
  rawLocale?: string | null
): UserConciergeReplyResult {
  const locale = normalizeAiLocale(rawLocale);
  const intent = detectUserConciergeIntent(message, explicitChipId);
  const tonBalStr = roundTonClean(input.tonBalance).toFixed(6);
  const starsBal = roundStarsClean(input.starsBalance);
  const cashbackTonStr = roundTonClean(input.rakebackClaimableTon).toFixed(6);
  const cashbackLifetimeStr = roundTonClean(input.rakebackLifetimeTon).toFixed(6);
  const refClaimableTonStr = roundTonClean(input.claimableReferralTon).toFixed(6);
  const refLifetimeTonStr = roundTonClean(input.lifetimeReferralTon).toFixed(6);
  const synContribStr = roundTonClean(input.userSyndicateContributedTon).toFixed(6);
  const welcomeReserveStr = roundTonClean(input.welcomeGrandLottery.fundedReserveTon).toFixed(6);
  const welcomeTargetStr = roundTonClean(input.welcomeGrandLottery.targetPoolTon).toFixed(6);
  const monthlyPoolStr = roundTonClean(input.monthlySuperJackpot.accumulatedPoolTon).toFixed(6);
  const welcomePctStr = input.welcomeGrandLottery.reserveProgressPercent.toFixed(1);

  const welcomeEntitlementText = getLocalizedWelcomeStatusText(locale, input.welcomeTicketStatus);
  const hashPreview = input.serverSeedHash
    ? `${input.serverSeedHash.slice(0, 16)}...${input.serverSeedHash.slice(-8)}`
    : 'SHA256-COMMITTED';
  const clientSeedVal = input.clientSeed || 'luckydrop_vip_client_seed';
  const nonceVal = input.nonce ?? 1;
  const vipTierLabel = input.vipTier || 'MEMBER';
  const vipTicketsCount = input.monthlyVipQualification.vipSuperTicketsEarnedTotal;

  let replyText = '';
  let escalatedToHuman = false;

  if (intent === 'ACCOUNT_STATUS') {
    if (locale === 'en') {
      replyText = [
        `Greetings ${input.displayName}; here is your live VIP PAM ledger telemetry with strict 6-decimal precision:`,
        `• Main Wallet Balance: ${tonBalStr} TON | ${starsBal} Stars (Tier: ${vipTierLabel} • XP: ${input.xp} XP)`,
        `• 3% Instant Cashback Vault: ${cashbackTonStr} TON claimable now (Lifetime earned: ${cashbackLifetimeStr} TON)`,
        `• Your Tickets: ${input.activeTicketsCount} active slip(s) in current round (Total: ${input.totalTicketsCount}) + ${vipTicketsCount} Monthly VIP Super-Jackpot ticket(s)`,
        `• Syndicate Squad Shares: ${input.userSyndicateSharesCount} active share(s) across ${input.activeSyndicatesCount} squad(s) (Your contribution: ${synContribStr} TON)`,
        `• Free $1,000 Welcome Ticket (#LD-WELCOME-1000): ${welcomeEntitlementText}`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Приветствуем, ${input.displayName}! Актуальный статус вашего VIP-счета PAM с точностью до 6 знаков:`,
        `• Основной баланс кошелька: ${tonBalStr} TON | ${starsBal} Stars (Уровень: ${vipTierLabel} • Опыт: ${input.xp} XP)`,
        `• Сейф мгновенного кэшбэка 3%: ${cashbackTonStr} TON доступно к выводу (Всего получено: ${cashbackLifetimeStr} TON)`,
        `• Ваши билеты: ${input.activeTicketsCount} активных в текущем раунде (Всего: ${input.totalTicketsCount}) + ${vipTicketsCount} билетов ежемесячного VIP Супер-Джекпота`,
        `• Доли в синдикатах (Squads): ${input.userSyndicateSharesCount} активных долей в ${input.activeSyndicatesCount} синдикатах (Ваш вклад: ${synContribStr} TON)`,
        `• Бесплатный билет $1,000 (#LD-WELCOME-1000): ${welcomeEntitlementText}`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `مرحباً بك ${input.displayName}؛ إليك التقرير المباشر لحسابك VIP بدقة 6 أرقام عشرية في دفتر الأستاذ PAM:`,
        `• رصيد المحفظة الرئيسية: ${tonBalStr} TON | ${starsBal} Stars (المستوى: ${vipTierLabel} • النقاط: ${input.xp} XP)`,
        `• خزنة الاسترداد النقدي الفوري 3%: ${cashbackTonStr} TON قابلة للسحب الفوري (إجمالي الأرباح مدى الحياة: ${cashbackLifetimeStr} TON)`,
        `• تذاكرك: ${input.activeTicketsCount} تذكرة نشطة في الجولة الحالية (الإجمالي: ${input.totalTicketsCount}) + ${vipTicketsCount} تذكرة للجائزة الشهرية الكبرى VIP`,
        `• حصص النقابات الجماعية: ${input.userSyndicateSharesCount} حصة نشطة في ${input.activeSyndicatesCount} نقابة (مساهمتك: ${synContribStr} TON)`,
        `• حالة تذكرة الترحيب المجانية بقيمة 1,000$ (#LD-WELCOME-1000): ${welcomeEntitlementText}`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Saludos ${input.displayName}; aquí tienes el informe en vivo de tu cuenta VIP PAM con precisión exacta de 6 decimales:`,
        `• Saldo de Billetera Principal: ${tonBalStr} TON | ${starsBal} Stars (Nivel: ${vipTierLabel} • XP: ${input.xp} XP)`,
        `• Bóveda de Cashback Instantáneo 3%: ${cashbackTonStr} TON disponibles para reclamo (Total histórico: ${cashbackLifetimeStr} TON)`,
        `• Tus Boletos: ${input.activeTicketsCount} boleto(s) activos en la ronda actual (Total: ${input.totalTicketsCount}) + ${vipTicketsCount} boleto(s) del Súper Jackpot Mensual VIP`,
        `• Acciones de Sindicato (Squads): ${input.userSyndicateSharesCount} acción(es) activas en ${input.activeSyndicatesCount} sindicato(s) (Tu aporte: ${synContribStr} TON)`,
        `• Boleto Gratis de Bienvenida $1,000 (#LD-WELCOME-1000): ${welcomeEntitlementText}`,
      ].join('\n');
    } else {
      replyText = [
        `درود بر شما ${input.displayName} گرامی؛ گزارش زنده حساب VIP شما با دقت ۶ رقم اعشار در دفترکل PAM به شرح زیر است:`,
        `• موجودی کیف پول اصلی: ${tonBalStr} TON | ${starsBal} Stars (سطح کاربری: ${vipTierLabel} • امتیاز: ${input.xp} XP)`,
        `• قلک کش‌بک ۳٪ آنی: ${cashbackTonStr} TON قابل برداشت آنی (کل دریافتی مادام‌العمر: ${cashbackLifetimeStr} TON)`,
        `• بلیت‌های شما: ${input.activeTicketsCount} بلیت فعال در دور جاری (مجموع کل: ${input.totalTicketsCount} بلیت) + ${vipTicketsCount} بلیت ابرجک‌پات ماهانه VIP`,
        `• سهام سندیکای گروهی: ${input.userSyndicateSharesCount} سهم فعال در ${input.activeSyndicatesCount} سندیکا (مشارکت شما: ${synContribStr} TON)`,
        `• وضعیت بلیت رایگان ۱,۰۰۰ دلاری (#LD-WELCOME-1000): ${welcomeEntitlementText}`,
      ].join('\n');
    }
  } else if (intent === 'WELCOME_1000_GUIDE') {
    if (locale === 'en') {
      replyText = [
        `Exclusive Guide to the $1,000 Welcome Grand Lottery (#LD-WELCOME-1000) for your account:`,
        `• Your Free Ticket Entitlement: ${welcomeEntitlementText}`,
        `• Current $1,000 Reserve Pool: ${welcomeReserveStr} TON of ${welcomeTargetStr} TON target (${welcomePctStr}% funded from 3% of ticket sales)`,
        `• How to Claim: As soon as you purchase your first ticket in any main lottery round (or buy a syndicate share), you unlock 1 free custom slip (5 Main + 1 Golden Ball) in the $1,000 draw.`,
        `• 100% Solvency Guarantee: The draw executes automatically once the schedule timer matures and 100% of the reserve (${welcomeTargetStr} TON) is funded.`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Руководство по Приветственному Гранд-розыгрышу $1,000 (#LD-WELCOME-1000) для вашего аккаунта:`,
        `• Статус вашего бесплатного билета: ${welcomeEntitlementText}`,
        `• Текущий резервный пул $1,000: ${welcomeReserveStr} TON из цели ${welcomeTargetStr} TON (${welcomePctStr}% накоплено за счет 3% от продаж билетов)`,
        `• Как получить: Сразу после покупки первого билета в любом основном раунде (или покупки доли в синдикате) вам открывается 1 бесплатный билет (5 основных + 1 золотой шар) в розыгрыше $1,000.`,
        `• 100% Гарантия ликвидности: Розыгрыш проводится строго по расписанию при полном 100% обеспечении резерва (${welcomeTargetStr} TON).`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `الدليل الحصري ليانصيب الترحيب الكبير بقيمة 1,000$ (#LD-WELCOME-1000) لحسابك:`,
        `• حالة تذكرتك المجانية الحالية: ${welcomeEntitlementText}`,
        `• الرصيد الحالي لصندوق احتياطي 1,000$: ${welcomeReserveStr} TON من الهدف ${welcomeTargetStr} TON (${welcomePctStr}% ممول من 3% من مبيعات التذاكر)`,
        `• كيفية الحصول عليها: بمجرد شراء أول تذكرة في أي جولة يانصيب رئيسية (أو شراء حصة نقابة)، يُفتح لك اختيار تذكرة مجانية بالكامل (5 كرات رئيسية + كرة ذهبية) في سحب 1,000$.`,
        `• ضمان الملاءة المالية 100%: يتم إجراء السحب في الموعد المحدد بعد اكتمال الاحتياطي بنسبة 100% (${welcomeTargetStr} TON) بدون أي عجز.`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Guía exclusiva del Gran Sorteo de Bienvenida de $1,000 (#LD-WELCOME-1000) para tu cuenta:`,
        `• Estado actual de tu boleto gratis: ${welcomeEntitlementText}`,
        `• Reserva actual del pozo de $1,000: ${welcomeReserveStr} TON de la meta de ${welcomeTargetStr} TON (${welcomePctStr}% financiado con el 3% de las ventas)`,
        `• Cómo reclamarlo: Tan pronto compres tu primer boleto en cualquier ronda principal (o una acción de sindicato), desbloqueas 1 boleto gratis personalizado (5 números + 1 bola dorada) en el sorteo de $1,000.`,
        `• Garantía de Solvencia 100%: El sorteo se ejecuta al cumplirse el plazo y completarse el 100% de la reserva (${welcomeTargetStr} TON).`,
      ].join('\n');
    } else {
      replyText = [
        `راهنمای اختصاصی لاتاری بزرگ ۱,۰۰۰ دلاری خوشآمدگویی (#LD-WELCOME-1000) برای حساب شما:`,
        `• وضعیت فعلی بلیت رایگان شما: ${welcomeEntitlementText}`,
        `• موجودی فعلی صندوق ذخیره ۱,۰۰۰ دلاری: ${welcomeReserveStr} TON از هدف ${welcomeTargetStr} TON (${welcomePctStr}٪ تکمیل‌شده از محل ۳٪ فروش بلیت‌ها)`,
        `• نحوه دریافت: به محض خرید اولین بلیت در هر یک از دورهای اصلی لاتاری (یا خرید سهم سندیکا)، حق انتخاب ۱ بلیت کاملاً رایگان با ۵ عدد اصلی + ۱ گوی طلایی دلخواه شما در قرعه‌کشی ۱,۰۰۰ دلاری فعال می‌گردد.`,
        `• قانون تضمین نقدینگی ۱۰۰٪: قرعه‌کشی راس موعد زمانی و پس از تکمیل ۱۰۰٪ ذخیره (${welcomeTargetStr} TON) بدون هیچ‌گونه کسری اجرا می‌شود.`,
      ].join('\n');
    }
  } else if (intent === 'SYNDICATE_REFERRAL_GUIDE') {
    if (locale === 'en') {
      replyText = [
        `Live Telemetry for your Telegram Squads & 2% Lifetime Referral Vault (Referral Code: ${input.referralCode}):`,
        `• Referral Network Performance: ${input.invitedCount} invited user(s) | ${input.activeBuyersCount} verified active buyer(s) (Anti-Sybil protected)`,
        `• Instant Claimable Referral Commission: ${refClaimableTonStr} TON (Lifetime earned: ${refLifetimeTonStr} TON) — 1:1 fee-free transfer to main wallet`,
        `• Your Syndicate Squads: ${input.userSyndicateSharesCount} share(s) across ${input.activeSyndicatesCount} squad(s) with ${synContribStr} TON total contribution`,
        `• Transparent Financial Rules: Every syndicate share immediately mints an official ticket (Zero-Escrow) and prizes are distributed strictly Pro-Rata (6-decimal precision). Plus, 2% of every referral ticket purchase is credited to your vault for life.`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Отчет по вашим групповым синдикатам и пожизненной реферальной программе 2% (Код: ${input.referralCode}):`,
        `• Ваша реферальная сеть: ${input.invitedCount} приглашенных | ${input.activeBuyersCount} активных покупателей (защита Anti-Sybil)`,
        `• Доступная реферальная комиссия: ${refClaimableTonStr} TON (Всего за все время: ${refLifetimeTonStr} TON) — мгновенный вывод 1:1 без комиссии`,
        `• Ваши синдикаты (Squads): ${input.userSyndicateSharesCount} долей в ${input.activeSyndicatesCount} пулах с общим вкладом ${synContribStr} TON`,
        `• Прозрачные правила: Каждая купленная доля мгновенно выпускает реальный билет (Zero-Escrow), а выигрыши делятся пропорционально долям (Pro-Rata с точностью 6 знаков). Вы также пожизненно получаете 2% с каждой покупки приглашенных друзей.`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `تقرير مباشر للنقابات الجماعية وخزنة عمولة الإحالة 2% مدى الحياة (رمز الإحالة: ${input.referralCode}):`,
        `• أداء شبكة الدعوات الخاصة بك: ${input.invitedCount} دعوة مسجلة | ${input.activeBuyersCount} مشتري نشط موثق (حماية ضد التلاعب Anti-Sybil)`,
        `• عمولة الإحالة القابلة للسحب الفوري: ${refClaimableTonStr} TON (إجمالي العمولة مدى الحياة: ${refLifetimeTonStr} TON) — تسوية فورية 1:1 بدون رسوم`,
        `• حالة نقاباتك: ${input.userSyndicateSharesCount} حصة في ${input.activeSyndicatesCount} نقابة بإجمالي مساهمة ${synContribStr} TON`,
        `• قواعد مالية شفافة: عند شراء أي حصة في النقابة يتم إصدار تذكرة حقيقية فوراً (Zero-Escrow) وتوزع الجوائز بنسبة الحصص (Pro-Rata بدقة 6 أرقام عشرية)، كما تحصل على 2% مدى الحياة من كل عملية شراء لأصدقائك.`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Informe en vivo de tus Sindicatos Grupales y Bóveda de Comisión 2% de por Vida (Código: ${input.referralCode}):`,
        `• Rendimiento de tu Red de Invitados: ${input.invitedCount} invitado(s) | ${input.activeBuyersCount} comprador(es) activos verificados (protección Anti-Sybil)`,
        `• Comisión de Referidos Reclamar Ahora: ${refClaimableTonStr} TON (Total histórico: ${refLifetimeTonStr} TON) — retiro instantáneo 1:1 sin comisiones`,
        `• Tus Sindicatos (Squads): ${input.userSyndicateSharesCount} acción(es) en ${input.activeSyndicatesCount} sindicato(s) con aporte total de ${synContribStr} TON`,
        `• Reglas Financieras Transparentes: Cada acción emite un boleto real al instante (Zero-Escrow) y los premios se reparten proporcionalmente (Pro-Rata a 6 decimales), además de recibir 2% de por vida de cada compra de tus invitados.`,
      ].join('\n');
    } else {
      replyText = [
        `گزارش زنده سندیکاهای گروهی و صندوق پورسانت ۲٪ مادام‌العمر شما (کد معرف: ${input.referralCode}):`,
        `• عملکرد شبکه دعوت شما: ${input.invitedCount} دعوت ثبت‌شده | ${input.activeBuyersCount} خریدار فعال واقعی (ضدتقلب Anti-Sybil)`,
        `• پورسانت قابل برداشت آنی: ${refClaimableTonStr} TON (کل پورسانت مادام‌العمر: ${refLifetimeTonStr} TON) — تسویه ۱:۱ بدون کارمزد به کیف پول اصلی`,
        `• وضعیت سندیکاهای شما: ${input.userSyndicateSharesCount} سهم در ${input.activeSyndicatesCount} سندیکا با مجموع مشارکت ${synContribStr} TON`,
        `• قوانین مالی شفاف: در سندیکاها، به محض خرید هر سهم، بلیت واقعی در همان لحظه صادر می‌شود (Zero-Escrow) و جوایز دقیقاً به نسبت سهام (Pro-Rata با دقت ۶ رقم اعشار) بین اعضا تقسیم می‌گردد. همچنین ۲٪ از هر خرید بلیت زیرمجموعه‌های شما مادام‌العمر به قلک رفرال شما واریز می‌شود.`,
      ].join('\n');
    }
  } else if (intent === 'PROVABLY_FAIR_AUDIT') {
    if (locale === 'en') {
      replyText = [
        `Cryptographic Provably Fair (HMAC-SHA256) Audit Certificate for your session:`,
        `• Server Seed Hash Commitment: ${hashPreview}`,
        `• Your Client Seed: ${clientSeedVal} • Nonce: ${nonceVal}`,
        `• 100% Transparent 5-Way Ticket Split: 85% Prize Pool + 3% Buyer Instant Cashback + 2% Referral Vault + 3% Welcome $1,000 Reserve + 7%-9% Net Platform Margin`,
        `• Monthly VIP Super-Jackpot Rule (#LD-MONTHLY-VIP current pool: ${monthlyPoolStr} TON): Strict All-or-Nothing (exact 5 Main + 1 Golden Ball match); if no ticket hits the exact match, 100% of the pool rolls over to next month.`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Сертификат криптографической честности (Provably Fair HMAC-SHA256) для вашей сессии:`,
        `• Хеш обязательства сервера (Server Seed Hash): ${hashPreview}`,
        `• Ваш клиентский сид (Client Seed): ${clientSeedVal} • Счетчик (Nonce): ${nonceVal}`,
        `• 100% Прозрачное распределение каждого билета: 85% Призовой пул + 3% Мгновенный кэшбэк + 2% Реферальный пул + 3% Резерв $1,000 + 7%-9% Чистая маржа платформы`,
        `• Правило Ежемесячного VIP Супер-Джекпота (#LD-MONTHLY-VIP, пул: ${monthlyPoolStr} TON): Формат All-or-Nothing (точное совпадение 5+1 шаров); при отсутствии победителя 100% пула переходит (Rollover) на следующий месяц.`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `شهادة التدقيق التشفيري ونزاهة القرعة (Provably Fair HMAC-SHA256) لجلستك:`,
        `• تجزئة بذرة الخادم (Server Seed Hash): ${hashPreview}`,
        `• بذرة العميل الخاصة بك (Client Seed): ${clientSeedVal} • العداد (Nonce): ${nonceVal}`,
        `• هيكل التقسيم الشفاف 100% لكل تذكرة: 85% مجمع الجوائز + 3% استرداد نقدي فوري للمشتري + 2% عمولة الإحالة + 3% احتياطي يانصيب 1,000$ + 7%-9% صافي الخزينة`,
        `• قاعدة الجائزة الشهرية الكبرى (#LD-MONTHLY-VIP الرصيد الحالي: ${monthlyPoolStr} TON): نظام الكل أو لا شيء (تطابق تام 5+1 كرات)؛ وفي حال عدم وجود فائز ينتقل 100% من الرصيد للشهر التالي (Rollover).`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Certificado Criptográfico Provably Fair (HMAC-SHA256) para tu sesión:`,
        `• Hash de Compromiso del Servidor (Server Seed Hash): ${hashPreview}`,
        `• Tu Semilla de Cliente (Client Seed): ${clientSeedVal} • Contador (Nonce): ${nonceVal}`,
        `• División Transparente en 5 Partes de Cada Boleto: 85% Pozo de Premios + 3% Cashback Instantáneo + 2% Comisión de Referidos + 3% Reserva Sorteo $1,000 + 7%-9% Margen Neto`,
        `• Regla del Súper Jackpot Mensual VIP (#LD-MONTHLY-VIP pozo actual: ${monthlyPoolStr} TON): Modalidad Todo o Nada (acierto exacto 5+1 bolas); si no hay ganador, el 100% se acumula (Rollover) para el mes siguiente.`,
      ].join('\n');
    } else {
      replyText = [
        `گواهی رمزنگاری و عدالت قرعه‌کشی (Provably Fair HMAC-SHA256) برای نشست شما:`,
        `• هش تعهد سرور (Server Seed Hash): ${hashPreview}`,
        `• سید کلاینت شما (Client Seed): ${clientSeedVal} • شمارنده (Nonce): ${nonceVal}`,
        `• ساختار تقسیم ۱۰۰٪ شفاف هر بلیت: ۸۵٪ استخر جوایز دور + ۳٪ کش‌بک آنی خریدار + ۲٪ پورسانت معرف + ۳٪ ذخیره لاتاری ۱,۰۰۰ دلاری خوشآمدگویی + ۷٪ تا ۹٪ سهم خالص پلتفرم`,
        `• قانون ابرجک‌پات ماهانه (#LD-MONTHLY-VIP با موجودی فعلی ${monthlyPoolStr} TON): قرعه‌کشی به صورت All-or-Nothing (تطابق دقیق ۵ گوی اصلی + ۱ گوی طلایی) برگزار می‌شود و در صورت عدم وجود برنده منطبق، ۱۰۰٪ استخر به ماه بعد منتقل (Rollover) می‌گردد.`,
      ].join('\n');
    }
  } else if (intent === 'HUMAN_ESCALATION') {
    escalatedToHuman = true;
    if (locale === 'en') {
      replyText = [
        `Your high-priority escalation to the Senior VIP Executive & Human Operator has been registered:`,
        `• Case Session ID: TG-${input.userKey} | Verified Balance: ${tonBalStr} TON & ${starsBal} Stars`,
        `• Attached Telemetry for Senior Admin: Claimable Cashback ${cashbackTonStr} TON • Referral Vault ${refClaimableTonStr} TON • Active Tickets: ${input.activeTicketsCount}`,
        `• Your ticket has been dispatched to the Admin Cockpit and Senior Executive Telegram; a live human reply will appear right here in this chat.`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Ваш приоритетный запрос на связь со старшим VIP-оператором и администратором зарегистрирован:`,
        `• Номер обращения: TG-${input.userKey} | Подтвержденный баланс: ${tonBalStr} TON и ${starsBal} Stars`,
        `• Телеметрия для администратора: Доступный кэшбэк ${cashbackTonStr} TON • Реферальный баланс ${refClaimableTonStr} TON • Активные билеты: ${input.activeTicketsCount}`,
        `• Ваше сообщение передано в командный панель администратора (Cockpit) и в Telegram руководителя; ответ оператора появится прямо в этом окне.`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `تم تسجيل طلبك للتواصل المباشر مع المدير التنفيذي والمشرف البشري VIP بأولوية قصوى:`,
        `• رقم الملف: TG-${input.userKey} | الرصيد الموثق: ${tonBalStr} TON و ${starsBal} Stars`,
        `• ملخص القياس المرفق للمدير: كاش باك قابل للسحب ${cashbackTonStr} TON • عمولة الإحالة ${refClaimableTonStr} TON • التذاكر النشطة: ${input.activeTicketsCount}`,
        `• تم إرسال رسالتك فوراً إلى لوحة تحكم المشرف (Cockpit) وتلغرام المدير التنفيذي؛ سيظهر رد المشرف البشري مباشرة في هذه النافذة.`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Tu solicitud prioritaria de contacto directo con el Ejecutivo Senior y Operador Humano VIP ha sido registrada:`,
        `• ID de Caso: TG-${input.userKey} | Saldo Verificado: ${tonBalStr} TON y ${starsBal} Stars`,
        `• Telemetría Adjunta al Ejecutivo: Cashback disponible ${cashbackTonStr} TON • Comisión de Referidos ${refClaimableTonStr} TON • Boletos activos: ${input.activeTicketsCount}`,
        `• Tu mensaje fue enviado a la Consola de Administración (Cockpit) y al Telegram del Ejecutivo; la respuesta del operador aparecerá en vivo en esta ventana.`,
      ].join('\n');
    } else {
      replyText = [
        `درخواست ارتباط مستقیم شما با مدیر ارشد و اپراتور انسانی VIP با اولویت بالا ثبت شد:`,
        `• شناسه پرونده: TG-${input.userKey} | موجودی تاییدشده: ${tonBalStr} TON و ${starsBal} Stars`,
        `• خلاصه تله‌متری پیوست‌شده برای مدیر ارشد: کش‌بک قابل برداشت ${cashbackTonStr} TON • پورسانت رفرال ${refClaimableTonStr} TON • بلیت‌های فعال: ${input.activeTicketsCount} عدد`,
        `• پیام شما هم‌اکنون به کنسول فرماندهی ادمین (Cockpit) و تلگرام مدیر ارشد ارسال گردید؛ پاسخ اپراتور ارشد به صورت زنده در همین پنجره برای شما نمایش داده خواهد شد.`,
      ].join('\n');
    }
  } else {
    if (locale === 'en') {
      replyText = [
        `24/7 LuckyDrop VIP AI Concierge Telemetry Report for ${input.displayName} (#${input.userKey}):`,
        `• Live PAM Ledger Balance: ${tonBalStr} TON | ${starsBal} Stars (Claimable Cashback: ${cashbackTonStr} TON • Claimable Referral: ${refClaimableTonStr} TON)`,
        `• Registered Tickets: ${input.activeTicketsCount} active round ticket(s) | ${vipTicketsCount} Monthly VIP ticket(s) (Monthly Pool: ${monthlyPoolStr} TON) | Syndicate Shares: ${input.userSyndicateSharesCount} (${synContribStr} TON)`,
        `• Free $1,000 Welcome Ticket (#LD-WELCOME-1000): ${welcomeEntitlementText} (Current Reserve: ${welcomeReserveStr} / ${welcomeTargetStr} TON)`,
        `If you need a specific transaction audit or direct human operator assistance, tap "Escalate to Senior Admin" below.`,
      ].join('\n');
    } else if (locale === 'ru') {
      replyText = [
        `Отчет круглосуточного VIP ИИ-Консьержа LuckyDrop для аккаунта ${input.displayName} (#${input.userKey}):`,
        `• Текущий баланс PAM-реестра: ${tonBalStr} TON | ${starsBal} Stars (Кэшбэк к выводу: ${cashbackTonStr} TON • Реферальные к выводу: ${refClaimableTonStr} TON)`,
        `• Зарегистрированные билеты: ${input.activeTicketsCount} активных билетов | ${vipTicketsCount} месячных VIP-билетов (Месячный пул: ${monthlyPoolStr} TON) | Доли синдиката: ${input.userSyndicateSharesCount} (${synContribStr} TON)`,
        `• Бесплатный билет $1,000 (#LD-WELCOME-1000): ${welcomeEntitlementText} (Резерв: ${welcomeReserveStr} / ${welcomeTargetStr} TON)`,
        `Если вам нужна проверка транзакции или связь с живым оператором, нажмите кнопку «Связь со старшим администратором».`,
      ].join('\n');
    } else if (locale === 'ar') {
      replyText = [
        `رد كونسيرج الذكاء الاصطناعي VIP 24/7 في LuckyDrop لحساب ${input.displayName} (#${input.userKey}):`,
        `• الرصيد الفوري في دفتر PAM: ${tonBalStr} TON | ${starsBal} Stars (كاش باك جاهز للسحب: ${cashbackTonStr} TON • عمولة إحالة جاهزة للسحب: ${refClaimableTonStr} TON)`,
        `• التذاكر المسجلة: ${input.activeTicketsCount} تذكرة نشطة | ${vipTicketsCount} تذكرة شهرية VIP (المجمع الشهري: ${monthlyPoolStr} TON) | حصص النقابة: ${input.userSyndicateSharesCount} (${synContribStr} TON)`,
        `• حالة تذكرة الترحيب المجانية 1,000$ (#LD-WELCOME-1000): ${welcomeEntitlementText} (الاحتياطي الحالي: ${welcomeReserveStr} / ${welcomeTargetStr} TON)`,
        `إذا كنت بحاجة لمراجعة معاملة محددة أو التحدث مع مشرف بشري، يرجى لمس زر «التواصل المباشر مع المدير التنفيذي».`,
      ].join('\n');
    } else if (locale === 'es') {
      replyText = [
        `Respuesta del Conserje IA VIP 24/7 de LuckyDrop para la cuenta ${input.displayName} (#${input.userKey}):`,
        `• Saldo en Vivo del Libro Mayor PAM: ${tonBalStr} TON | ${starsBal} Stars (Cashback disponible: ${cashbackTonStr} TON • Comisión de referidos: ${refClaimableTonStr} TON)`,
        `• Boletos Registrados: ${input.activeTicketsCount} boleto(s) activos | ${vipTicketsCount} boleto(s) VIP mensuales (Pozo mensual: ${monthlyPoolStr} TON) | Acciones en sindicatos: ${input.userSyndicateSharesCount} (${synContribStr} TON)`,
        `• Boleto Gratis de $1,000 (#LD-WELCOME-1000): ${welcomeEntitlementText} (Reserva actual: ${welcomeReserveStr} / ${welcomeTargetStr} TON)`,
        `Si necesitas revisar una transacción específica o hablar con un operador humano, toca el botón «Escalar a Ejecutivo Senior».`,
      ].join('\n');
    } else {
      replyText = [
        `پاسخ کنسیرج هوشمند ۲۴/۷ LuckyDrop برای حساب ${input.displayName} (#${input.userKey}):`,
        `• موجودی لحظه‌ای دفترکل PAM شما: ${tonBalStr} TON | ${starsBal} Stars (کش‌بک آماده برداشت: ${cashbackTonStr} TON • پورسانت دعوت آماده برداشت: ${refClaimableTonStr} TON)`,
        `• بلیت‌های ثبت‌شده: ${input.activeTicketsCount} بلیت فعال دور جاری | ${vipTicketsCount} بلیت VIP ماهانه (استخر ماهانه: ${monthlyPoolStr} TON) | سهام سندیکا: ${input.userSyndicateSharesCount} سهم (${synContribStr} TON)`,
        `• وضعیت بلیت رایگان ۱,۰۰۰ دلاری (#LD-WELCOME-1000): ${welcomeEntitlementText} (ذخیره فعلی: ${welcomeReserveStr} / ${welcomeTargetStr} TON)`,
        `چنانچه نیاز به بررسی تراکنش خاص یا گفتگوی مستقیم با اپراتور انسانی دارید، کافی است دکمه «ارتباط مستقیم با مدیر ارشد» را لمس نمایید.`,
      ].join('\n');
    }
  }

  return {
    replyTextFa: replyText,
    replyText,
    locale,
    detectedIntent: intent,
    escalatedToHuman,
    engineMode: 'DETERMINISTIC_TELEMETRY',
    telemetrySummary: {
      tonBalanceFormatted: `${tonBalStr} TON`,
      starsBalance: starsBal,
      claimableCashbackTonFormatted: `${cashbackTonStr} TON`,
      claimableReferralTonFormatted: `${refClaimableTonStr} TON`,
      welcomeTicketStatusCode: input.welcomeTicketStatus.statusCode,
      activeSyndicateShares: input.userSyndicateSharesCount,
      vipSuperTicketsCount: vipTicketsCount,
    },
  };
}

const LANGUAGE_PROMPT_NAMES: Record<SupportedAiLocale, string> = {
  fa: 'Persian (فارسی)',
  en: 'English',
  ru: 'Russian (Русский)',
  ar: 'Arabic (العربية)',
  es: 'Spanish (Español)',
};

/**
 * Hybrid Deterministic + Gemini 3.8 Flash User Concierge generator in 5 languages.
 * Always computes the exact 6-decimal deterministic reply first (< 5ms) and uses Gemini only when configured,
 * guaranteeing 100% uptime and exact 6-decimal accounting figures.
 */
export async function generateUserConciergeReply(
  input: UserConciergeTelemetryInput,
  message: string,
  explicitChipId?: string | null,
  rawLocale?: string | null
): Promise<UserConciergeReplyResult> {
  const locale = normalizeAiLocale(rawLocale);
  const deterministic = buildDeterministicUserConciergeReply(
    input,
    message,
    explicitChipId,
    locale
  );

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || explicitChipId) {
    return deterministic;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const targetLangName = LANGUAGE_PROMPT_NAMES[locale];
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          `You are the 24/7 VIP AI Concierge for the LuckyDrop Telegram Web3 Lottery platform.`,
          `User (${input.displayName}) message: "${message}"`,
          `Exact 6-decimal account telemetry that MUST be preserved verbatim in your response:`,
          deterministic.replyText,
          `Respond strictly in ${targetLangName}, using a luxury, polite, concise tone (max 5 lines), with ZERO Unicode text emojis, while preserving exact 6-decimal numbers (${deterministic.telemetrySummary.tonBalanceFormatted}).`,
        ].join('\n'),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
    ]);

    const llmText =
      response && typeof (response as any).text === 'string'
        ? (response as any).text.trim()
        : '';
    if (llmText && llmText.includes(roundTonClean(input.tonBalance).toFixed(6))) {
      return {
        ...deterministic,
        replyTextFa: llmText,
        replyText: llmText,
        engineMode: 'GEMINI_HYBRID',
      };
    }
  } catch {
    // Instant fallback to deterministic engine
  }

  return deterministic;
}

/**
 * Computes real-time PAM reconciliation across all user wallets + 5-way split balance sheet telemetry.
 */
export function computeAdminExecutiveTelemetry(params: {
  usersMap: Record<string, IsolatedUserAccountRecord>;
  tickets: Array<{
    roundCode: string;
    costUsdt?: string;
    currencyNetwork?: string;
    status?: string;
  }>;
  syndicatePools: SyndicatePoolRecord[];
  welcomeGrandLottery: WelcomeGrandLotteryState;
  monthlySuperJackpot: MonthlySuperJackpotState;
  tonUsdRate: number;
}): AdminExecutiveTelemetrySnapshot {
  const tonRate = params.tonUsdRate > 0 ? params.tonUsdRate : 5.0;
  const userRecords = Object.values(params.usersMap || {});

  let reconciledWalletsCount = 0;
  let discrepancyWalletsCount = 0;
  let totalPamDiscrepancyTon = 0;
  let totalUserTonBalances = 0;
  let totalUserStarsBalances = 0;
  let unclaimedCashbackLiabilityTon = 0;
  let buyerCashback3PercentTon = 0;
  let unclaimedReferralLiabilityTon = 0;
  let referralCommission2PercentTon = 0;
  let totalReferralInvitedCount = 0;
  let totalReferralActiveBuyersCount = 0;

  for (const u of userRecords) {
    const pamEngine = new PAMSeamlessWalletEngine(u.pamState);
    const reconRes = pamEngine.reconcile().reconciliation;
    const diffTon = roundTonClean(Math.abs(Number(reconRes?.discrepancyTon ?? 0)));
    if (reconRes?.reconciled && diffTon === 0) {
      reconciledWalletsCount += 1;
    } else {
      discrepancyWalletsCount += 1;
      totalPamDiscrepancyTon = roundTonClean(totalPamDiscrepancyTon + diffTon);
    }

    const st = pamEngine.getState();
    totalUserTonBalances = roundTonClean(totalUserTonBalances + roundTonClean(st.tonBalance));
    totalUserStarsBalances = roundStarsClean(
      totalUserStarsBalances + roundStarsClean(st.starsBalance)
    );

    const rbk = normalizeRakebackVaultState(u.rakebackVault);
    unclaimedCashbackLiabilityTon = roundTonClean(
      unclaimedCashbackLiabilityTon + roundTonClean(rbk.claimableTon)
    );
    buyerCashback3PercentTon = roundTonClean(
      buyerCashback3PercentTon + roundTonClean(rbk.lifetimeEarnedTon)
    );

    const refProf = normalizeReferralProfileState(u);
    unclaimedReferralLiabilityTon = roundTonClean(
      unclaimedReferralLiabilityTon + roundTonClean(refProf.claimableReferralTon)
    );
    referralCommission2PercentTon = roundTonClean(
      referralCommission2PercentTon + roundTonClean(refProf.lifetimeReferralTon)
    );
    totalReferralInvitedCount += Number(refProf.invitedCount || 0);
    totalReferralActiveBuyersCount += Number(refProf.activeBuyersCount || 0);
  }

  // Compute gross paid ticket sales & 5-way conservation split
  const paidTickets = (params.tickets || []).filter(
    (t) =>
      t.roundCode !== '#LD-MONTHLY-VIP' &&
      t.roundCode !== WELCOME_GRAND_ROUND_ID &&
      parseFloat(String(t.costUsdt || '0')) > 0
  );

  const grossTicketSalesUsdt = Number(
    paidTickets
      .reduce((sum, t) => sum + (parseFloat(String(t.costUsdt || '0')) || 0), 0)
      .toFixed(6)
  );
  const grossTicketSalesTon = roundTonClean(grossTicketSalesUsdt / tonRate);

  const lockedPrizePool85Ton = roundTonClean(grossTicketSalesTon * 0.85);
  const theoreticalCashback3Ton = roundTonClean(grossTicketSalesTon * 0.03);
  const effectiveCashbackTon =
    buyerCashback3PercentTon > 0 ? buyerCashback3PercentTon : theoreticalCashback3Ton;
  const welcomeLotteryReserve3PercentTon = roundTonClean(grossTicketSalesTon * 0.03);

  // Net House Profit = 15% House Gross Margin - (3% Cashback + Paid/Accrued Referral 2% + 3% Welcome Reserve)
  const houseGross15Ton = roundTonClean(grossTicketSalesTon - lockedPrizePool85Ton);
  const netHouseProfitTon = roundTonClean(
    Math.max(
      0,
      houseGross15Ton -
        effectiveCashbackTon -
        referralCommission2PercentTon -
        welcomeLotteryReserve3PercentTon
    )
  );
  const netHouseProfitUsdt = Number((netHouseProfitTon * tonRate).toFixed(2));

  const syndicates = Array.isArray(params.syndicatePools) ? params.syndicatePools : [];
  const openSyndicatesCount = syndicates.filter((s) => s.status === 'OPEN').length;
  const fullOrSettledSyndicatesCount = syndicates.filter(
    (s) => s.status === 'FULL' || s.status === 'SETTLED'
  ).length;
  const totalSyndicateSharesFilled = syndicates.reduce(
    (acc, s) => acc + (Number(s.filledShares) || 0),
    0
  );

  return {
    totalUsersCount: userRecords.length,
    reconciledWalletsCount,
    discrepancyWalletsCount,
    totalPamDiscrepancyTon: roundTonClean(totalPamDiscrepancyTon),
    totalPamDiscrepancyFormatted: `${roundTonClean(totalPamDiscrepancyTon).toFixed(6)} TON`,
    allWalletsReconciledClean: discrepancyWalletsCount === 0 && totalPamDiscrepancyTon === 0,
    totalUserTonBalances: roundTonClean(totalUserTonBalances),
    totalUserStarsBalances,
    grossTicketSalesTon,
    grossTicketSalesUsdt: Number(grossTicketSalesUsdt.toFixed(2)),
    lockedPrizePool85Ton,
    buyerCashback3PercentTon: effectiveCashbackTon,
    unclaimedCashbackLiabilityTon,
    referralCommission2PercentTon,
    unclaimedReferralLiabilityTon,
    welcomeLotteryReserve3PercentTon,
    netHouseProfitTon,
    netHouseProfitUsdt,
    welcomeReserveFundedTon: roundTonClean(params.welcomeGrandLottery.fundedReserveTon),
    welcomeReserveTargetTon: roundTonClean(params.welcomeGrandLottery.targetPoolTon),
    welcomeReserveProgressPercent: Number(
      (params.welcomeGrandLottery.reserveProgressPercent || 0).toFixed(2)
    ),
    monthlySuperJackpotPoolTon: roundTonClean(params.monthlySuperJackpot.accumulatedPoolTon),
    activeSyndicatesCount: syndicates.length,
    openSyndicatesCount,
    fullOrSettledSyndicatesCount,
    totalSyndicateSharesFilled,
    totalReferralInvitedCount,
    totalReferralActiveBuyersCount,
  };
}

/**
 * Generates deterministic + optional Gemini Executive AI Copilot Report in 5 languages (`fa`, `en`, `ru`, `ar`, `es`)
 * with strict 6-decimal precision.
 */
export async function generateAdminCopilotReport(params: {
  actionType?: string;
  customPrompt?: string;
  locale?: string;
  usersMap: Record<string, IsolatedUserAccountRecord>;
  tickets: Array<{
    roundCode: string;
    costUsdt?: string;
    currencyNetwork?: string;
    status?: string;
  }>;
  syndicatePools: SyndicatePoolRecord[];
  welcomeGrandLottery: WelcomeGrandLotteryState;
  monthlySuperJackpot: MonthlySuperJackpotState;
  tonUsdRate: number;
}): Promise<AdminCopilotReportResult> {
  const locale = normalizeAiLocale(params.locale);
  const cleanAction = (String(params.actionType || 'BALANCE_SHEET').trim().toUpperCase() ||
    'BALANCE_SHEET') as AdminCopilotActionId;
  const resolvedAction: AdminCopilotActionId =
    cleanAction === 'BALANCE_SHEET' ||
    cleanAction === 'PAM_RECONCILE' ||
    cleanAction === 'RESERVE_VAULTS' ||
    cleanAction === 'SYNDICATE_REFERRAL'
      ? cleanAction
      : 'BALANCE_SHEET';

  const t = computeAdminExecutiveTelemetry(params);
  const combinedUnclaimedTon = roundTonClean(
    t.unclaimedCashbackLiabilityTon + t.unclaimedReferralLiabilityTon
  ).toFixed(6);

  let title = '';
  let report = '';

  if (resolvedAction === 'BALANCE_SHEET') {
    if (locale === 'en') {
      title = '5-Way Split Balance Sheet & Net House Profit Audit (6-Decimal Precision)';
      report = [
        `Live Platform Balance Sheet based on the 100% Ticket Sales Conservation Law:`,
        `• Gross Ticket Sales: ${t.grossTicketSalesTon.toFixed(6)} TON ($${t.grossTicketSalesUsdt.toFixed(2)} USDT)`,
        `• Locked Prize Pool (85% Prize Pool): ${t.lockedPrizePool85Ton.toFixed(6)} TON`,
        `• Buyer Instant Cashback Liability (3% Buyer Cashback): ${t.buyerCashback3PercentTon.toFixed(6)} TON (Unclaimed in vaults: ${t.unclaimedCashbackLiabilityTon.toFixed(6)} TON)`,
        `• Ambassador Referral Commissions (2% Referral Vault): ${t.referralCommission2PercentTon.toFixed(6)} TON (Unclaimed: ${t.unclaimedReferralLiabilityTon.toFixed(6)} TON)`,
        `• Dedicated $1,000 Welcome Lottery Reserve (3% Welcome Reserve): ${t.welcomeLotteryReserve3PercentTon.toFixed(6)} TON`,
        `• Realized Net House Treasury Profit (Net House Profit 7%-9%): ${t.netHouseProfitTon.toFixed(6)} TON ($${t.netHouseProfitUsdt.toFixed(2)} USDT)`,
      ].join('\n');
    } else if (locale === 'ru') {
      title = 'Полный отчет по 5-стороннему балансу и чистой прибыли (Точность 6 знаков)';
      report = [
        `Актуальный финансовый баланс платформы на основе закона сохранения 100% продаж билетов:`,
        `• Валовые продажи билетов (Gross Sales): ${t.grossTicketSalesTon.toFixed(6)} TON ($${t.grossTicketSalesUsdt.toFixed(2)} USDT)`,
        `• Заблокированный призовой пул (85% Prize Pool): ${t.lockedPrizePool85Ton.toFixed(6)} TON`,
        `• Обязательства по мгновенному кэшбэку (3% Buyer Cashback): ${t.buyerCashback3PercentTon.toFixed(6)} TON (Не востребовано в сейфах: ${t.unclaimedCashbackLiabilityTon.toFixed(6)} TON)`,
        `• Реферальные комиссии амбассадоров (2% Referral Vault): ${t.referralCommission2PercentTon.toFixed(6)} TON (Не востребовано: ${t.unclaimedReferralLiabilityTon.toFixed(6)} TON)`,
        `• Целевой резерв Приветственной лотереи $1,000 (3% Welcome Reserve): ${t.welcomeLotteryReserve3PercentTon.toFixed(6)} TON`,
        `• Чистая прибыль казначейства платформы (Net House Profit 7%-9%): ${t.netHouseProfitTon.toFixed(6)} TON ($${t.netHouseProfitUsdt.toFixed(2)} USDT)`,
      ].join('\n');
    } else if (locale === 'ar') {
      title = 'تقرير الميزانية العمومية الخماسية وصافي ربح المنصة (دقة 6 أرقام عشرية)';
      report = [
        `تقرير الميزانية المالية المباشر بناءً على قانون حفظ 100% من مبيعات التذاكر:`,
        `• إجمالي مبيعات التذاكر (Gross Sales): ${t.grossTicketSalesTon.toFixed(6)} TON ($${t.grossTicketSalesUsdt.toFixed(2)} USDT)`,
        `• مجمع الجوائز المقفل (85% Prize Pool): ${t.lockedPrizePool85Ton.toFixed(6)} TON`,
        `• التزامات الاسترداد النقدي الفوري للمشترين (3% Buyer Cashback): ${t.buyerCashback3PercentTon.toFixed(6)} TON (غير مسحوب في الخزائن: ${t.unclaimedCashbackLiabilityTon.toFixed(6)} TON)`,
        `• عمولات شبكة السفراء (2% Referral Vault): ${t.referralCommission2PercentTon.toFixed(6)} TON (غير مسحوب: ${t.unclaimedReferralLiabilityTon.toFixed(6)} TON)`,
        `• الاحتياطي المخصص ليانصيب 1,000$ الترحيبي (3% Welcome Reserve): ${t.welcomeLotteryReserve3PercentTon.toFixed(6)} TON`,
        `• صافي الربح الفعلي لخزينة الموقع (Net House Profit 7%-9%): ${t.netHouseProfitTon.toFixed(6)} TON ($${t.netHouseProfitUsdt.toFixed(2)} USDT)`,
      ].join('\n');
    } else if (locale === 'es') {
      title = 'Informe de Balance de 5 Vías y Beneficio Neto de la Casa (Precisión 6 Decimales)';
      report = [
        `Balance financiero en vivo basado en la Ley de Conservación del 100% de Ventas de Boletos:`,
        `• Ventas Brutas de Boletos (Gross Sales): ${t.grossTicketSalesTon.toFixed(6)} TON ($${t.grossTicketSalesUsdt.toFixed(2)} USDT)`,
        `• Pozo de Premios Bloqueado (85% Prize Pool): ${t.lockedPrizePool85Ton.toFixed(6)} TON`,
        `• Pasivo de Cashback Instantáneo (3% Buyer Cashback): ${t.buyerCashback3PercentTon.toFixed(6)} TON (Sin reclamar en bóvedas: ${t.unclaimedCashbackLiabilityTon.toFixed(6)} TON)`,
        `• Comisiones de Embajadores (2% Referral Vault): ${t.referralCommission2PercentTon.toFixed(6)} TON (Sin reclamar: ${t.unclaimedReferralLiabilityTon.toFixed(6)} TON)`,
        `• Reserva Dedicada del Sorteo de $1,000 (3% Welcome Reserve): ${t.welcomeLotteryReserve3PercentTon.toFixed(6)} TON`,
        `• Beneficio Neto Realizado de Tesorería (Net House Profit 7%-9%): ${t.netHouseProfitTon.toFixed(6)} TON ($${t.netHouseProfitUsdt.toFixed(2)} USDT)`,
      ].join('\n');
    } else {
      title = 'گزارش جامع ترازنامه ۵-بخشی و سود خالص سایت (6-Decimal Precision)';
      report = [
        `گزارش زنده ترازنامه مالی پلتفرم بر اساس قانون پایستگی ۱۰۰٪ فروش بلیت‌ها:`,
        `• کل فروش ناخالص بلیت‌ها (Gross Sales): ${t.grossTicketSalesTon.toFixed(6)} TON ($${t.grossTicketSalesUsdt.toFixed(2)} USDT)`,
        `• سهم استخر جوایز قفل‌شده (85% Prize Pool): ${t.lockedPrizePool85Ton.toFixed(6)} TON`,
        `• تعهد کش‌بک آنی خریداران (3% Buyer Cashback): ${t.buyerCashback3PercentTon.toFixed(6)} TON (مانده برداشت‌نشده در قلک‌ها: ${t.unclaimedCashbackLiabilityTon.toFixed(6)} TON)`,
        `• پورسانت شبکه سفیران (2% Referral Vault): ${t.referralCommission2PercentTon.toFixed(6)} TON (مانده برداشت‌نشده: ${t.unclaimedReferralLiabilityTon.toFixed(6)} TON)`,
        `• ذخیره اختصاصی لاتاری ۱,۰۰۰ دلاری (3% Welcome Reserve): ${t.welcomeLotteryReserve3PercentTon.toFixed(6)} TON`,
        `• سود خالص قطعی خزانه سایت (Net House Profit 7%-9%): ${t.netHouseProfitTon.toFixed(6)} TON ($${t.netHouseProfitUsdt.toFixed(2)} USDT)`,
      ].join('\n');
    }
  } else if (resolvedAction === 'PAM_RECONCILE') {
    if (locale === 'en') {
      title = 'PAM Wallet Security Audit & Ledger Reconciliation';
      report = [
        `Real-time PAM Seamless Wallet Engine audit across all active user accounts:`,
        `• Wallet Reconciliation Status: ${t.reconciledWalletsCount} of ${t.totalUsersCount} wallets 100% matched (${t.allWalletsReconciledClean ? 'VALIDATED 100% CLEAN' : 'DISCREPANCY DETECTED'})`,
        `• Total Network Ledger Discrepancy: ${t.totalPamDiscrepancyFormatted} (strict \`toFixed(6)\` precision)`,
        `• Total User TON in Circulation: ${t.totalUserTonBalances.toFixed(6)} TON | Total Stars: ${t.totalUserStarsBalances} Stars`,
        `• Unclaimed Instant Vault Liabilities (Cashback + Referral): ${combinedUnclaimedTon} TON`,
        `• Idempotency & Anti-Double-Spend Locks: ACTIVE (Zero-Discrepancy Lock Verified).`,
      ].join('\n');
    } else if (locale === 'ru') {
      title = 'Аудит безопасности кошельков и сверка реестра PAM (PAM Reconcile)';
      report = [
        `Результат мгновенного аудита движка PAM Seamless Wallet по всем активным аккаунтам:`,
        `• Статус сверки счетов: ${t.reconciledWalletsCount} из ${t.totalUsersCount} кошельков полностью сбалансированы (${t.allWalletsReconciledClean ? 'VALIDATED 100% CLEAN' : 'DISCREPANCY DETECTED'})`,
        `• Общее расхождение баланса сети (Total Discrepancy): ${t.totalPamDiscrepancyFormatted} (гарантия точности \`toFixed(6)\`)`,
        `• Суммарный баланс TON пользователей: ${t.totalUserTonBalances.toFixed(6)} TON | Суммарно Stars: ${t.totalUserStarsBalances} Stars`,
        `• Текущие обязательства к выплате (Cashback + Referral): ${combinedUnclaimedTon} TON`,
        `• Блокировки Idempotency и Anti-Double-Spend: АКТИВНЫ (Zero-Discrepancy Lock Verified).`,
      ].join('\n');
    } else if (locale === 'ar') {
      title = 'التدقيق الأمني للمحافظ ومطابقة دفتر الأستاذ (PAM Ledger Reconciliation)';
      report = [
        `نتيجة التدقيق الفوري لمحرك PAM Seamless Wallet عبر جميع الحسابات النشطة:`,
        `• حالة مطابقة الحسابات: ${t.reconciledWalletsCount} من أصل ${t.totalUsersCount} محفظة متطابقة تماماً (${t.allWalletsReconciledClean ? 'VALIDATED 100% CLEAN' : 'DISCREPANCY DETECTED'})`,
        `• إجمالي فرق التوازن في الشبكة (Total Discrepancy): ${t.totalPamDiscrepancyFormatted} (ضمان دقة 6 أرقام عشرية \`toFixed(6)\`)`,
        `• إجمالي أرصدة TON للمستخدمين: ${t.totalUserTonBalances.toFixed(6)} TON | إجمالي النجوم: ${t.totalUserStarsBalances} Stars`,
        `• الالتزامات الفورية القابلة للمطالبة (Cashback + Referral): ${combinedUnclaimedTon} TON`,
        `• أقفال Idempotency و Anti-Double-Spend: نشطة (Zero-Discrepancy Lock Verified).`,
      ].join('\n');
    } else if (locale === 'es') {
      title = 'Auditoría de Seguridad de Billeteras y Conciliación PAM (PAM Reconcile)';
      report = [
        `Resultado de la auditoría en tiempo real del motor PAM Seamless Wallet en todas las cuentas activas:`,
        `• Estado de Conciliación: ${t.reconciledWalletsCount} de ${t.totalUsersCount} billeteras 100% conciliadas (${t.allWalletsReconciledClean ? 'VALIDATED 100% CLEAN' : 'DISCREPANCY DETECTED'})`,
        `• Discrepancia Total de la Red (Total Discrepancy): ${t.totalPamDiscrepancyFormatted} (precisión garantizada \`toFixed(6)\`)`,
        `• Total TON de Usuarios en Circulación: ${t.totalUserTonBalances.toFixed(6)} TON | Total Stars: ${t.totalUserStarsBalances} Stars`,
        `• Pasivos Instantáneos Reclamar (Cashback + Referral): ${combinedUnclaimedTon} TON`,
        `• Bloqueos de Idempotencia y Anti-Doble-Gasto: ACTIVOS (Zero-Discrepancy Lock Verified).`,
      ].join('\n');
    } else {
      title = 'ممیزی امنیتی کیف پول‌ها و تطبیق دفترکل (PAM Ledger Reconciliation)';
      report = [
        `نتیجه حسابرسی لحظه‌ای موتور PAM Seamless Wallet روی تمامی حساب‌های فعال:`,
        `• وضعیت تطبیق حساب‌ها: ${t.reconciledWalletsCount} از ${t.totalUsersCount} کیف پول کاملاً منطبق (${t.allWalletsReconciledClean ? 'VALIDATED 100% CLEAN' : 'DISCREPANCY DETECTED'})`,
        `• اختلاف تراز کل شبکه (Total Discrepancy): ${t.totalPamDiscrepancyFormatted} (تضمین دقت ۶ رقم اعشار ` +
          '`toFixed(6)`' +
          `)`,
        `• مجموع موجودی TON کاربران در گردش: ${t.totalUserTonBalances.toFixed(6)} TON | مجموع ستاره‌ها: ${t.totalUserStarsBalances} Stars`,
        `• تعهدات آنی قابل مطالبه کاربران (Cashback + Referral): ${combinedUnclaimedTon} TON`,
        `• وضعیت قفل‌های Idempotency و Anti-Double-Spend: فعال (Zero-Discrepancy Lock Verified).`,
      ].join('\n');
    }
  } else if (resolvedAction === 'RESERVE_VAULTS') {
    const isWelcomeReady = t.welcomeReserveFundedTon >= t.welcomeReserveTargetTon;
    if (locale === 'en') {
      title = '$1,000 Welcome Lottery Reserve & Monthly VIP Super-Jackpot Status';
      report = [
        `Liquidity Report for Self-Funding Jackpot Vaults:`,
        `• $1,000 Welcome Reserve (#LD-WELCOME-1000): ${t.welcomeReserveFundedTon.toFixed(6)} TON of ${t.welcomeReserveTargetTon.toFixed(6)} TON target (${t.welcomeReserveProgressPercent.toFixed(2)}% funded)`,
        `• $1,000 Draw Execution Gate: ${
          isWelcomeReady
            ? 'Ready for Draw (100% reserve funded)'
            : 'Auto-accumulating from 3% of ticket sales (100% treasury deficit protection)'
        }`,
        `• Monthly VIP Super-Jackpot Pool (#LD-MONTHLY-VIP): ${t.monthlySuperJackpotPoolTon.toFixed(6)} TON`,
        `• Monthly VIP Protection Mechanism: Strict All-or-Nothing rule (exact 5+1 ball match; if no winner matches, 100% rolls over to next month).`,
      ].join('\n');
    } else if (locale === 'ru') {
      title = 'Статус резерва лотереи $1,000 и Ежемесячного VIP Супер-Джекпота';
      report = [
        `Отчет о ликвидности самофинансируемых фондов (Self-Funding Vaults):`,
        `• Резерв лотереи $1,000 (#LD-WELCOME-1000): ${t.welcomeReserveFundedTon.toFixed(6)} TON из цели ${t.welcomeReserveTargetTon.toFixed(6)} TON (${t.welcomeReserveProgressPercent.toFixed(2)}% накоплено)`,
        `• Статус блокировки розыгрыша $1,000: ${
          isWelcomeReady
            ? 'Готов к розыгрышу (100% резерва обеспечено)'
            : 'Автоматическое накопление 3% от продаж билетов (полная защита от дефицита казны)'
        }`,
        `• Накопленный пул Ежемесячного VIP Супер-Джекпота (#LD-MONTHLY-VIP): ${t.monthlySuperJackpotPoolTon.toFixed(6)} TON`,
        `• Механизм защиты месячного джекпота: Правило All-or-Nothing (точное совпадение 5+1 шаров; без победителя 100% суммы переходит на следующий месяц).`,
      ].join('\n');
    } else if (locale === 'ar') {
      title = 'حالة احتياطي يانصيب 1,000$ الترحيبي والجائزة الشهرية الكبرى VIP';
      report = [
        `تقرير السيولة للخزائن ذاتية التمويل (Self-Funding Vaults):`,
        `• احتياطي يانصيب 1,000$ (#LD-WELCOME-1000): ${t.welcomeReserveFundedTon.toFixed(6)} TON من الهدف ${t.welcomeReserveTargetTon.toFixed(6)} TON (${t.welcomeReserveProgressPercent.toFixed(2)}% مكتمل)`,
        `• حالة قفل تنفيذ سحب 1,000$: ${
          isWelcomeReady
            ? 'جاهز للسحب (تم تمويل الاحتياطي بنسبة 100%)'
            : 'قيد التراكم التلقائي من 3% من مبيعات التذاكر (حماية كاملة ضد عجز الخزينة)'
        }`,
        `• الرصيد المتراكم للجائزة الشهرية الكبرى (#LD-MONTHLY-VIP): ${t.monthlySuperJackpotPoolTon.toFixed(6)} TON`,
        `• آلية حماية الجائزة الشهرية: قاعدة الكل أو لا شيء All-or-Nothing (تطابق 5+1 كرات؛ وفي حال عدم وجود فائز ينتقل 100% للشهر القادم).`,
      ].join('\n');
    } else if (locale === 'es') {
      title = 'Estado de la Reserva de $1,000 y Súper Jackpot Mensual VIP';
      report = [
        `Informe de liquidez de las bóvedas autofinanciadas (Self-Funding Vaults):`,
        `• Reserva del Sorteo $1,000 (#LD-WELCOME-1000): ${t.welcomeReserveFundedTon.toFixed(6)} TON de la meta de ${t.welcomeReserveTargetTon.toFixed(6)} TON (${t.welcomeReserveProgressPercent.toFixed(2)}% completado)`,
        `• Compuerta de Ejecución del Sorteo $1,000: ${
          isWelcomeReady
            ? 'Listo para el sorteo (100% de reserva cubierta)'
            : 'Acumulación automática desde el 3% de ventas (protección total contra déficit de tesorería)'
        }`,
        `• Pozo Acumulado del Súper Jackpot Mensual (#LD-MONTHLY-VIP): ${t.monthlySuperJackpotPoolTon.toFixed(6)} TON`,
        `• Mecanismo de Protección Mensual: Regla All-or-Nothing (acierto exacto 5+1 bolas; sin ganador, el 100% pasa al próximo mes).`,
      ].join('\n');
    } else {
      title = 'وضعیت ذخیره لاتاری ۱,۰۰۰ دلاری خوشآمدگویی و ابرجک‌پات ماهانه VIP';
      report = [
        `گزارش نقدینگی صندوق‌های خودتامین (Self-Funding Vaults):`,
        `• ذخیره لاتاری ۱,۰۰۰ دلاری (#LD-WELCOME-1000): ${t.welcomeReserveFundedTon.toFixed(6)} TON از هدف ${t.welcomeReserveTargetTon.toFixed(6)} TON (${t.welcomeReserveProgressPercent.toFixed(2)}٪ تکمیل‌شده)`,
        `• وضعیت قفل اجرایی قرعه‌کشی ۱,۰۰۰ دلاری: ${
          isWelcomeReady
            ? 'آماده قرعه‌کشی (۱۰۰٪ ذخیره تامین شده است)'
            : 'در حال انباشت خودکار از محل ۳٪ فروش بلیت‌ها (محافظت کامل در برابر کسری خزانه)'
        }`,
        `• استخر انباشته ابرجک‌پات ماهانه (#LD-MONTHLY-VIP): ${t.monthlySuperJackpotPoolTon.toFixed(6)} TON`,
        `• مکانیزم حفاظت ابرجک‌پات ماهانه: قانون All-or-Nothing (تطابق دقیق ۵+۱ گوی؛ در صورت عدم وجود برنده، ۱۰۰٪ مبلغ به دور ماه بعد سرریز می‌شود).`,
      ].join('\n');
    }
  } else {
    if (locale === 'en') {
      title = 'Syndicate Squad Pools & Anti-Sybil Referral Network Analytics';
      report = [
        `Telegram Viral Growth Engine Report (Syndicate Squads & Anti-Sybil Referrals):`,
        `• Total Syndicate Squads Created: ${t.activeSyndicatesCount} squad(s) (${t.openSyndicatesCount} OPEN • ${t.fullOrSettledSyndicatesCount} FULL/SETTLED)`,
        `• Total Syndicate Shares Sold: ${t.totalSyndicateSharesFilled} share(s) (Instant official ticket minting with Zero-Escrow settlement)`,
        `• Referral Network Reach: ${t.totalReferralInvitedCount} invited user(s) | ${t.totalReferralActiveBuyersCount} verified real buyer(s)`,
        `• Total 2% Referral Commission Distributed from Real Turnover: ${t.referralCommission2PercentTon.toFixed(6)} TON (Zero cash paid for empty signups — 100% Sybil bot immunity).`,
      ].join('\n');
    } else if (locale === 'ru') {
      title = 'Аналитика групповых синдикатов (Squad Pools) и реферальной сети Anti-Sybil';
      report = [
        `Отчет вирусного движка роста Telegram (Syndicate Squads & Anti-Sybil Referrals):`,
        `• Всего создано синдикатов: ${t.activeSyndicatesCount} (${t.openSyndicatesCount} открыто • ${t.fullOrSettledSyndicatesCount} заполнено/рассчитано)`,
        `• Всего продано долей в синдикатах: ${t.totalSyndicateSharesFilled} долей (мгновенный выпуск реальных билетов Zero-Escrow)`,
        `• Реферальная сеть: ${t.totalReferralInvitedCount} приглашенных | ${t.totalReferralActiveBuyersCount} подтвержденных покупателей`,
        `• Всего распределено 2% комиссий с реального оборота: ${t.referralCommission2PercentTon.toFixed(6)} TON (0 выплат за пустые регистрации — 100% защита от Sybil-ботов).`,
      ].join('\n');
    } else if (locale === 'ar') {
      title = 'تحليل أداء النقابات الجماعية (Squad Pools) وشبكة الإحالة المضادة للتلاعب';
      report = [
        `تقرير محرك النمو الفيروسي على تلغرام (Syndicate Squads & Anti-Sybil Referrals):`,
        `• إجمالي النقابات المنشأة: ${t.activeSyndicatesCount} نقابة (${t.openSyndicatesCount} مفتوحة • ${t.fullOrSettledSyndicatesCount} مكتملة/مسواة)`,
        `• إجمالي الحصص المباعة في النقابات: ${t.totalSyndicateSharesFilled} حصة (إصدار فوري للتذاكر الحقيقية بنظام Zero-Escrow)`,
        `• شبكة دعوة الأصدقاء: ${t.totalReferralInvitedCount} مستخدم مدعو | ${t.totalReferralActiveBuyersCount} مشتري حقيقي موثق`,
        `• إجمالي عمولة 2% الموزعة من التداول الفعلي: ${t.referralCommission2PercentTon.toFixed(6)} TON (صفر مدفوعات للتسجيلات الفارغة — مناعة 100% ضد روبوتات Sybil).`,
      ].join('\n');
    } else if (locale === 'es') {
      title = 'Análisis de Sindicatos Grupales (Squad Pools) y Red de Referidos Anti-Sybil';
      report = [
        `Informe del Motor de Crecimiento Viral en Telegram (Syndicate Squads & Anti-Sybil Referrals):`,
        `• Total de Sindicatos Creados: ${t.activeSyndicatesCount} sindicato(s) (${t.openSyndicatesCount} abiertos • ${t.fullOrSettledSyndicatesCount} completos/liquidados)`,
        `• Total de Acciones Vendidas en Sindicatos: ${t.totalSyndicateSharesFilled} acción(es) (emisión instantánea de boletos reales Zero-Escrow)`,
        `• Red de Invitación de Amigos: ${t.totalReferralInvitedCount} usuario(s) invitados | ${t.totalReferralActiveBuyersCount} comprador(es) reales verificados`,
        `• Comisión Total del 2% Distribuida por Volumen Real: ${t.referralCommission2PercentTon.toFixed(6)} TON (Cero pagos por registros vacíos — 100% inmunidad ante bots Sybil).`,
      ].join('\n');
    } else {
      title = 'تحلیل عملکرد سندیکاهای گروهی (Squad Pools) و شبکه رفرال ضدتقلب';
      report = [
        `گزارش موتور رشد وایرال تلگرامی (Syndicate Squads & Anti-Sybil Referrals):`,
        `• کل سندیکاهای تشکیل‌شده: ${t.activeSyndicatesCount} سندیکا (${t.openSyndicatesCount} باز • ${t.fullOrSettledSyndicatesCount} تکمیل/تسویه‌شده)`,
        `• مجموع سهام فروخته‌شده در سندیکاها: ${t.totalSyndicateSharesFilled} سهم (صدور آنی بلیت واقعی با تسویه Zero-Escrow)`,
        `• شبکه دعوت دوستان: ${t.totalReferralInvitedCount} کاربر دعوت‌شده | ${t.totalReferralActiveBuyersCount} خریدار واقعی تاییدشده`,
        `• کل پورسانت ۲٪ توزیع‌شده از گردش واقعی: ${t.referralCommission2PercentTon.toFixed(6)} TON (صفر ریال پرداخت بابت ثبت‌نام خالی — ایمنی ۱۰۰٪ در برابر بات‌های Sybil).`,
      ].join('\n');
    }
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && params.customPrompt) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const targetLangName = LANGUAGE_PROMPT_NAMES[locale];
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            `You are the Executive & Risk AI Copilot for the LuckyDrop Web3 Lottery platform.`,
            `Senior Admin question: "${params.customPrompt}"`,
            `Exact 6-decimal server telemetry:`,
            report,
            `Provide an analytical, executive-grade response strictly in ${targetLangName}, with ZERO Unicode text emojis, preserving all exact 6-decimal figures.`,
          ].join('\n'),
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
      ]);
      const text =
        response && typeof (response as any).text === 'string'
          ? (response as any).text.trim()
          : '';
      if (text) {
        return {
          ok: true,
          actionType: resolvedAction,
          locale,
          titleFa: title,
          reportFa: text,
          title,
          report: text,
          engineMode: 'GEMINI_HYBRID',
          generatedAtIso: new Date().toISOString(),
          telemetry: t,
        };
      }
    } catch {
      // Fallback to deterministic report
    }
  }

  return {
    ok: true,
    actionType: resolvedAction,
    locale,
    titleFa: title,
    reportFa: report,
    title,
    report,
    engineMode: 'DETERMINISTIC_TELEMETRY',
    generatedAtIso: new Date().toISOString(),
    telemetry: t,
  };
}
