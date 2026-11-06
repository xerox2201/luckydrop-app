import type { Language } from './lotteryEngine';

export type SupportedLocale = 'fa' | 'en' | 'ru' | 'ar' | 'es';
export type LanguageCodeUpper = 'FA' | 'EN' | 'RU' | 'AR' | 'ES';

export interface LanguageOptionMeta {
  locale: SupportedLocale;
  code: LanguageCodeUpper;
  nativeName: string;
  dir: 'rtl' | 'ltr';
}

export const GLOBAL_LANGUAGE_OPTIONS: LanguageOptionMeta[] = [
  { locale: 'fa', code: 'FA', nativeName: 'فارسی', dir: 'rtl' },
  { locale: 'en', code: 'EN', nativeName: 'English', dir: 'ltr' },
  { locale: 'ru', code: 'RU', nativeName: 'Русский', dir: 'ltr' },
  { locale: 'ar', code: 'AR', nativeName: 'العربية', dir: 'rtl' },
  { locale: 'es', code: 'ES', nativeName: 'Español', dir: 'ltr' },
];

export function normalizeLocale(lang?: string | null): SupportedLocale {
  const clean = String(lang || '')
    .trim()
    .toLowerCase();
  if (clean.startsWith('en')) return 'en';
  if (clean.startsWith('ru')) return 'ru';
  if (clean.startsWith('ar')) return 'ar';
  if (clean.startsWith('es')) return 'es';
  if (clean.startsWith('fa') || clean.startsWith('ir')) return 'fa';
  return 'fa';
}

export function normalizeLanguageUpper(lang?: string | null): LanguageCodeUpper {
  const locale = normalizeLocale(lang);
  return locale.toUpperCase() as LanguageCodeUpper;
}

export function isRtlLocale(lang?: string | null): boolean {
  const locale = normalizeLocale(lang);
  return locale === 'fa' || locale === 'ar';
}

export function getLanguageOptionMeta(lang?: string | null): LanguageOptionMeta {
  const locale = normalizeLocale(lang);
  return (
    GLOBAL_LANGUAGE_OPTIONS.find((opt) => opt.locale === locale) || GLOBAL_LANGUAGE_OPTIONS[0]
  );
}

interface MultiLangPhrase {
  ru: string;
  ar: string;
  es: string;
  en?: string;
}

/**
 * Master 5-Language Translation Dictionary keyed by English or Persian source phrase.
 * Guarantees 100% coverage across Navbar, Lobby, Jackpots, Syndicates, Cashback, Referrals,
 * Quests, Support Concierge, Admin Cockpit, Wallet, and Mini-Games.
 */
const GLOBAL_PHRASE_DICTIONARY: Record<string, MultiLangPhrase> = {
  // Navbar & Navigation
  'Switch Language': {
    ru: 'Сменить язык',
    ar: 'تغيير اللغة',
    es: 'Cambiar idioma',
  },
  'Switch Language (FA / EN)': {
    ru: 'Выбрать язык',
    ar: 'اختر اللغة',
    es: 'Seleccionar idioma',
  },
  'Admin Cockpit': {
    ru: 'Панель Админа',
    ar: 'لوحة تحكم المسؤول',
    es: 'Panel de Admin',
  },
  'My Tickets': {
    ru: 'Мои билеты',
    ar: 'تذاكري',
    es: 'Mis Boletos',
  },
  'VIP Live Support': {
    ru: 'VIP Поддержка 24/7',
    ar: 'دعم VIP المباشر',
    es: 'Soporte VIP en Vivo',
  },
  'More Views & Profile': {
    ru: 'Меню и Профиль',
    ar: 'القائمة والملف الشخصي',
    es: 'Menú y Perfil',
  },
  'Custom Ball Picker': {
    ru: 'Ручной выбор чисел',
    ar: 'اختيار الأرقام يدوياً',
    es: 'Selector Manual de Números',
  },
  'VIP Profile & Chest': {
    ru: 'VIP Профиль и Сундук',
    ar: 'ملف VIP والصندوق',
    es: 'Perfil VIP y Cofre',
  },
  'Winners & Draws': {
    ru: 'Победители и Тиражи',
    ar: 'الفائزون والسحوبات',
    es: 'Ganadores y Sorteos',
  },
  'Provably Fair RNG': {
    ru: 'Честная игра (RNG)',
    ar: 'عدالة السحب (RNG)',
    es: 'Sorteo Verificable (RNG)',
  },
  'How It Works': {
    ru: 'Как это работает',
    ar: 'كيف يعمل النظام',
    es: 'Cómo Funciona',
  },
  '24/7 VIP Concierge & Two-Way Live Support': {
    ru: 'VIP Консьерж 24/7 и Живой Чат',
    ar: 'كونسيرج VIP على مدار الساعة والدعم المباشر',
    es: 'Conserje VIP 24/7 y Soporte en Vivo',
  },
  'Terms, Rules & Provably Fair Policy': {
    ru: 'Правила и политика честной игры',
    ar: 'الشروط والقواعد وسياسة النزاهة',
    es: 'Términos, Reglas y Política Provably Fair',
  },
  Lottery: {
    ru: 'Лотерея',
    ar: 'اليانصيب',
    es: 'Lotería',
  },
  Draws: {
    ru: 'Тиражи',
    ar: 'السحوبات',
    es: 'Sorteos',
  },
  Games: {
    ru: 'Игры',
    ar: 'الألعاب',
    es: 'Juegos',
  },
  Earn: {
    ru: 'Доход',
    ar: 'اربح',
    es: 'Ganar',
  },
  Quests: {
    ru: 'Задания',
    ar: 'المهام',
    es: 'Misiones',
  },
  Wallet: {
    ru: 'Кошелёк',
    ar: 'المحفظة',
    es: 'Billetera',
  },

  // Lobby Sub-Tabs & Status Strip
  'Main Draw': {
    ru: 'Тираж',
    ar: 'السحب الرئيسي',
    es: 'Sorteo Principal',
  },
  Jackpots: {
    ru: 'Джекпоты',
    ar: 'الجوائز الكبرى',
    es: 'Jackpots',
  },
  Squads: {
    ru: 'Синдикаты',
    ar: 'النقابات',
    es: 'Escuadrones',
  },
  'Earn & Vault': {
    ru: 'Кэшбэк и Доход',
    ar: 'المكافآت والإحالة',
    es: 'Recompensas',
  },
  'Cashback:': {
    ru: 'Кэшбэк:',
    ar: 'استرداد نقدي:',
    es: 'Reembolso:',
  },
  Claim: {
    ru: 'Забрать',
    ar: 'استلام',
    es: 'Reclamar',
  },
  'Free $1K Ticket!': {
    ru: 'Бесплатный билет $1K!',
    ar: 'تذكرة 1,000$ مجانية!',
    es: '¡Boleto Gratis $1K!',
  },
  '$1,000 Draw': {
    ru: 'Розыгрыш $1,000',
    ar: 'سحب 1,000$',
    es: 'Sorteo $1,000',
  },

  // Lobby Main Draw Card
  '85% Prize Pool • Instant Payout': {
    ru: '85% Призовой пул • Мгновенные выплаты',
    ar: '85% مجمع الجوائز • دفع فوري',
    es: '85% Pozo de Premios • Pago Instantáneo',
  },
  'Ticket:': {
    ru: 'Билет:',
    ar: 'التذكرة:',
    es: 'Boleto:',
  },
  'Next Draw:': {
    ru: 'След. тираж:',
    ar: 'السحب القادم:',
    es: 'Próximo Sorteo:',
  },
  '1-Tap Quick Buy:': {
    ru: 'Быстрая покупка в 1 клик:',
    ar: 'شراء سريع بنقرة واحدة:',
    es: 'Compra Rápida 1-Clic:',
  },
  '+3% Instant Cashback': {
    ru: '+3% Мгновенный кэшбэк',
    ar: '+3% استرداد نقدي فوري',
    es: '+3% Reembolso Instantáneo',
  },
  'Minting...': {
    ru: 'Выпуск...',
    ar: 'جاري الإصدار...',
    es: 'Emitiendo...',
  },
  'Custom Numbers': {
    ru: 'Выбрать числа',
    ar: 'اختيار الأرقام',
    es: 'Elegir Números',
  },
  'View All →': {
    ru: 'Все билеты →',
    ar: 'عرض الكل ←',
    es: 'Ver Todos →',
  },
  'No tickets in this round yet. Use 1-Tap Quick Buy above.': {
    ru: 'У вас пока нет билетов в этом тираже. Купите билет в 1 клик выше.',
    ar: 'لا توجد تذاكر في هذه الجولة بعد. استخدم الشراء السريع أعلاه.',
    es: 'Aún no tienes boletos en esta ronda. Usa la Compra Rápida arriba.',
  },
  '🏆 WON': {
    ru: '🏆 ВЫИГРЫШ',
    ar: '🏆 فائز',
    es: '🏆 GANADOR',
  },
  ACTIVE: {
    ru: 'АКТИВЕН',
    ar: 'نشط',
    es: 'ACTIVO',
  },
  'SHA-256 Provably Fair • Auto Payout': {
    ru: 'SHA-256 Честная игра • Автовыплата',
    ar: 'عدالة SHA-256 • دفع تلقائي',
    es: 'SHA-256 Provably Fair • Pago Automático',
  },
  '🎬 Watch Draw': {
    ru: '🎬 Смотреть тираж',
    ar: '🎬 مشاهدة السحب',
    es: '🎬 Ver Sorteo',
  },

  // Welcome $1,000 Grand Lottery & Monthly VIP Super-Jackpot
  '$1,000 Welcome Grand Draw': {
    ru: 'Приветственный Джекпот $1,000',
    ar: 'سحب الترحيب الكبير بقيمة 1,000$',
    es: 'Gran Sorteo de Bienvenida $1,000',
  },
  'Free Ticket on Your 1st Purchase': {
    ru: 'Бесплатный билет за 1-ю покупку',
    ar: 'تذكرة مجانية عند أول عملية شراء',
    es: 'Boleto Gratis en tu 1.ª Compra',
  },
  Rules: {
    ru: 'Правила',
    ar: 'القواعد',
    es: 'Reglas',
  },
  Info: {
    ru: 'Инфо',
    ar: 'معلومات',
    es: 'Info',
  },
  '• Buy your first lottery slip to unlock 1 Free $1,000 ticket with custom numbers.': {
    ru: '• Купите свой первый лотерейный билет, чтобы открыть 1 бесплатный билет на $1,000 с выбором своих чисел.',
    ar: '• اشترِ أول تذكرة يانصيب لفتح تذكرة مجانية بقيمة 1,000$ بأرقامك المخصصة.',
    es: '• Compra tu primer boleto de lotería para desbloquear 1 boleto gratis de $1,000 con tus números.',
  },
  '• Paid in native TON directly to your wallet upon the 30-day draw.': {
    ru: '• Выплачивается в реальных TON прямо на ваш кошелёк по итогам 30-дневного розыгрыша.',
    ar: '• يتم الدفع بعملة TON الحقيقية مباشرة إلى محفظتك عند السحب الشهري.',
    es: '• Pagado en TON nativo directamente a tu billetera en el sorteo de 30 días.',
  },
  'Prize Pool:': {
    ru: 'Призовой фонд:',
    ar: 'مجمع الجوائز:',
    es: 'Pozo de Premios:',
  },
  'Draw In:': {
    ru: 'До розыгрыша:',
    ar: 'موعد السحب:',
    es: 'Sorteo en:',
  },
  'Free Ticket Registered': {
    ru: 'Бесплатный билет зарегистрирован',
    ar: 'تم تسجيل التذكرة المجانية',
    es: 'Boleto Gratis Registrado',
  },
  'Pick Free $1,000 Ticket Numbers': {
    ru: 'Выбрать числа билета на $1,000',
    ar: 'اختر أرقام تذكرة 1,000$ المجانية',
    es: 'Elegir Números del Boleto Gratis $1,000',
  },
  'Unlocks on 1st Ticket Purchase → Go to Main Draw': {
    ru: 'Открывается после 1-й покупки билета → К тиражу',
    ar: 'يُفتح عند شراء أول تذكرة ← انتقل للسحب الرئيسي',
    es: 'Se desbloquea con tu 1.ª compra → Ir al Sorteo',
  },
  'Monthly VIP Super-Jackpot': {
    ru: 'Ежемесячный VIP Супер-Джекпот',
    ar: 'سوبر جاكبوت VIP الشهري',
    es: 'Súper Jackpot Mensual VIP',
  },
  'Rollover Prize Vault • VIP Exclusive': {
    ru: 'Накопительный фонд • Эксклюзив для VIP',
    ar: 'خزينة الجوائز المتراكمة • حصري لكبار الشخصيات',
    es: 'Bóveda Acumulativa • Exclusivo VIP',
  },
  '• Every 5 regular or squad tickets automatically mints 1 Free VIP Super-Ticket.': {
    ru: '• Каждые 5 обычных или синдикатных билетов автоматически дают 1 бесплатный VIP Супер-билет.',
    ar: '• كل 5 تذاكر عادية أو جماعية تمنحك تلقائياً تذكرة سوبر VIP مجانية.',
    es: '• Cada 5 boletos regulares o de escuadrón generan automáticamente 1 Súper Boleto VIP gratis.',
  },
  '• Qualification: 10+ tickets bought OR 500+ XP earned from quests & games.': {
    ru: '• Квалификация: покупка 10+ билетов ИЛИ 500+ XP в играх и заданиях.',
    ar: '• التأهل: شراء 10 تذاكر أو أكثر أو كسب 500+ نقطة XP من المهام والألعاب.',
    es: '• Clasificación: 10+ boletos comprados O 500+ XP ganados en misiones y juegos.',
  },
  'Vault Pool:': {
    ru: 'Баланс фонда:',
    ar: 'رصيد الخزينة:',
    es: 'Pozo de Bóveda:',
  },
  'Monthly Draw:': {
    ru: 'Месячный тираж:',
    ar: 'السحب الشهري:',
    es: 'Sorteo Mensual:',
  },
  'VIP Status:': {
    ru: 'VIP Статус:',
    ar: 'أهلية VIP:',
    es: 'Estado VIP:',
  },
  Qualified: {
    ru: 'Квалифицирован',
    ar: 'مؤهل',
    es: 'Clasificado',
  },
  Tickets: {
    ru: 'Билеты',
    ar: 'التذاكر',
    es: 'Boletos',
  },
  'VIP Slips': {
    ru: 'VIP Билеты',
    ar: 'تذاكر VIP',
    es: 'Boletos VIP',
  },

  // Syndicate Squad Pools
  'Telegram Squad Pools': {
    ru: 'Командные Синдикаты Telegram',
    ar: 'نقابات التذاكر الجماعية',
    es: 'Escuadrones de Lotería Telegram',
  },
  'Pooled Tickets • Auto Pro-Rata Split': {
    ru: 'Совместная покупка • Авто-распределение',
    ar: 'شراء جماعي • توزيع تلقائي للأرباح',
    es: 'Boletos Grupales • Reparto Pro-Rata',
  },
  'Create Squad': {
    ru: 'Создать синдикат',
    ar: 'إنشاء نقابة',
    es: 'Crear Escuadrón',
  },
  '• Every share immediately mints 1 real ticket in the active round (Zero-Escrow).': {
    ru: '• Каждая доля мгновенно выпускает 1 реальный билет в активном тираже (Zero-Escrow).',
    ar: '• كل حصة تصدر فوراً تذكرة حقيقية في الجولة النشطة (بدون تجميد أموال).',
    es: '• Cada acción emite al instante 1 boleto real en la ronda activa (Zero-Escrow).',
  },
  '• Winning prizes split pro-rata to 6 decimals automatically (+15 XP Leader Bonus).': {
    ru: '• Выигрыши делятся пропорционально долям с точностью до 6 знаков (+15 XP бонус лидеру).',
    ar: '• تُقسم الجوائز تلقائياً بنسبة الحصص بدقة 6 منازل عشرية (+15 XP مكافأة القائد).',
    es: '• Los premios se dividen proporcionalmente con 6 decimales (+15 XP bono de líder).',
  },
  'No Active Squad Pools Yet': {
    ru: 'Активных синдикатов пока нет',
    ar: 'لا توجد نقابات نشطة حتى الآن',
    es: 'Aún no hay escuadrones activos',
  },
  'Launch the first squad and earn +15 XP per member join!': {
    ru: 'Создайте первый синдикат и получайте +15 XP за каждого участника!',
    ar: 'أنشئ أول نقابة واكسب +15 XP لكل عضو ينضم!',
    es: '¡Crea el primer escuadrón y gana +15 XP por cada miembro!',
  },
  OPEN: {
    ru: 'ОТКРЫТ',
    ar: 'مفتوح',
    es: 'ABIERTO',
  },
  FULL: {
    ru: 'ЗАПОЛНЕН',
    ar: 'مكتمل',
    es: 'LLENO',
  },
  SETTLED: {
    ru: 'РАССЧИТАН',
    ar: 'تمت التسوية',
    es: 'LIQUIDADO',
  },
  'Shares:': {
    ru: 'Доли:',
    ar: 'الحصص:',
    es: 'Acciones:',
  },
  share: {
    ru: 'доля',
    ar: 'حصة',
    es: 'acción',
  },
  '✓ Copied': {
    ru: '✓ Скопировано',
    ar: '✓ تم النسخ',
    es: '✓ Copiado',
  },
  'Copy Link': {
    ru: 'Копировать',
    ar: 'نسخ الرابط',
    es: 'Copiar Enlace',
  },
  Share: {
    ru: 'Поделиться',
    ar: 'مشاركة',
    es: 'Compartir',
  },
  'Joining...': {
    ru: 'Вход...',
    ar: 'جاري الانضمام...',
    es: 'Uniéndose...',
  },

  // Cashback & Referrals & Quests
  'Instant VIP Cashback Vault': {
    ru: 'Сейф мгновенного VIP кэшбэка',
    ar: 'خزينة الاسترداد النقدي الفوري VIP',
    es: 'Bóveda de Reembolso VIP Instantáneo',
  },
  '3% Tickets + 1.5% Games • Zero Fee': {
    ru: '3% с билетов + 1.5% с игр • Без комиссии',
    ar: '3% للتذاكر + 1.5% للألعاب • بدون رسوم',
    es: '3% Boletos + 1.5% Juegos • Sin Comisión',
  },
  'Claimable (TON):': {
    ru: 'Доступно (TON):',
    ar: 'قابل للسحب (TON):',
    es: 'Disponible (TON):',
  },
  'Claimable (Stars):': {
    ru: 'Доступно (Stars):',
    ar: 'قابل للسحب (Stars):',
    es: 'Disponible (Stars):',
  },
  'Total:': {
    ru: 'Всего:',
    ar: 'الإجمالي:',
    es: 'Total:',
  },
  'Claiming...': {
    ru: 'Выплата...',
    ar: 'جاري التحويل...',
    es: 'Reclamando...',
  },
  'Claim Cashback to Wallet': {
    ru: 'Вывести кэшбэк на кошелёк',
    ar: 'سحب الاسترداد النقدي إلى المحفظة',
    es: 'Reclamar Reembolso a la Billetera',
  },
  '2% Lifetime Referral Vault & Quests': {
    ru: 'Клуб Амбассадоров (2% Пожизненно) и Задания',
    ar: 'خزينة إحالة 2% مدى الحياة والمهام',
    es: 'Bóveda de Referidos 2% de por Vida y Misiones',
  },
  '2% Ticket Sales + 0.5% Mini-Games': {
    ru: '2% с билетов друзей + 0.5% с мини-игр',
    ar: '2% مبيعات التذاكر + 0.5% الألعاب الفورية',
    es: '2% Ventas de Boletos + 0.5% Mini-Juegos',
  },
  '• 2% commission is funded 100% from house margin without touching the 85% prize pool.': {
    ru: '• Комиссия 2% выплачивается полностью из доли платформы, не уменьшая 85% призовой пул.',
    ar: '• تُدفع عمولة 2% بالكامل من حصة المنصة دون المساس بمجمع الجوائز (85%).',
    es: '• La comisión del 2% se financia 100% del margen de la casa sin tocar el 85% del pozo.',
  },
  '• 1:1 instant transfer to your main TON/Stars wallet with zero fees.': {
    ru: '• Мгновенный перевод 1:1 на ваш основной кошелёк TON/Stars без комиссий.',
    ar: '• تحويل فوري بنسبة 1:1 إلى محفظتك الرئيسية بدون أي رسوم.',
    es: '• Transferencia instantánea 1:1 a tu billetera principal sin comisiones.',
  },
  'Personal Invite Link:': {
    ru: 'Ваша реферальная ссылка:',
    ar: 'رابط الدعوة الخاص بك:',
    es: 'Tu Enlace de Invitación:',
  },
  Bind: {
    ru: 'Привязать',
    ar: 'ربط',
    es: 'Vincular',
  },
  'Claimable TON': {
    ru: 'Доступно TON',
    ar: 'متاح TON',
    es: 'TON Disponible',
  },
  'Claimable Stars': {
    ru: 'Доступно Stars',
    ar: 'متاح Stars',
    es: 'Stars Disponibles',
  },
  'Invited / Active': {
    ru: 'Приглашено / Актив.',
    ar: 'المدعوون / النشطون',
    es: 'Invitados / Activos',
  },
  'Lifetime TON': {
    ru: 'Всего заработано',
    ar: 'إجمالي الأرباح',
    es: 'Total Ganado',
  },
  'Claim Commission to Wallet': {
    ru: 'Вывести комиссию на кошелёк',
    ar: 'سحب العمولة إلى المحفظة',
    es: 'Reclamar Comisión a la Billetera',
  },
  'Free Quests & VIP Tickets': {
    ru: 'Бесплатные задания и VIP билеты',
    ar: 'المهام المجانية وتذاكر VIP',
    es: 'Misiones Gratis y Boletos VIP',
  },
  Claimed: {
    ru: 'Получено',
    ar: 'تم الاستلام',
    es: 'Reclamado',
  },
  Locked: {
    ru: 'Закрыто',
    ar: 'مقفل',
    es: 'Bloqueado',
  },

  // Footer & Secondary Links
  '9 Instant Games': {
    ru: '9 Быстрых Игр',
    ar: '9 ألعاب فورية',
    es: '9 Juegos Instantáneos',
  },
  'Winners Hall': {
    ru: 'Зал Победителей',
    ar: 'قاعة الفائزين',
    es: 'Salón de Ganadores',
  },
  'Verified Payouts': {
    ru: 'Проверенные выплаты',
    ar: 'مدفوعات موثقة',
    es: 'Pagos Verificados',
  },
  'VIP Profile': {
    ru: 'VIP Профиль',
    ar: 'ملف VIP',
    es: 'Perfil VIP',
  },
  Guide: {
    ru: 'Гид',
    ar: 'الدليل',
    es: 'Guía',
  },
  'Verify RNG': {
    ru: 'Проверить RNG',
    ar: 'تحقق من RNG',
    es: 'Verificar RNG',
  },
  'Instant TON Settlement • 24/7 VIP Support': {
    ru: 'Мгновенные выплаты TON • Поддержка 24/7',
    ar: 'تسوية فورية بعملة TON • دعم VIP على مدار الساعة',
    es: 'Liquidación Instantánea TON • Soporte VIP 24/7',
  },
  'VIP Support': {
    ru: 'VIP Поддержка',
    ar: 'دعم VIP',
    es: 'Soporte VIP',
  },

  // Modals (Welcome Picker & Create Squad)
  'Pick Numbers for Free $1,000 Ticket': {
    ru: 'Выберите числа для бесплатного билета $1,000',
    ar: 'اختر أرقام تذكرة 1,000$ المجانية',
    es: 'Elige Números para el Boleto Gratis de $1,000',
  },
  '5 Main (1-50) + 1 Golden Ball (1-15)': {
    ru: '5 основных (1-50) + 1 Золотой шар (1-15)',
    ar: '5 أرقام رئيسية (1-50) + كرة ذهبية (1-15)',
    es: '5 Principales (1-50) + 1 Bola Dorada (1-15)',
  },
  'Quick Pick': {
    ru: 'Автовыбор',
    ar: 'اختيار عشوائي',
    es: 'Selección Rápida',
  },
  'Mint Free $1,000 Ticket': {
    ru: 'Получить бесплатный билет $1,000',
    ar: 'إصدار تذكرة 1,000$ المجانية',
    es: 'Emitir Boleto Gratis de $1,000',
  },
  Cancel: {
    ru: 'Отмена',
    ar: 'إلغاء',
    es: 'Cancelar',
  },
  'Create Telegram Squad': {
    ru: 'Создать Командный Синдикат',
    ar: 'إنشاء نقابة تيليجرام جديدة',
    es: 'Crear Escuadrón de Telegram',
  },
  '1 Share = 1 Ticket + 15 XP Synergy': {
    ru: '1 Доля = 1 Билет + 15 XP бонус лидеру',
    ar: 'حصة واحدة = تذكرة حقيقية + 15 XP مكافأة القائد',
    es: '1 Acción = 1 Boleto + 15 XP Bono de Líder',
  },
  'Squad Name:': {
    ru: 'Название синдиката:',
    ar: 'اسم النقابة:',
    es: 'Nombre del Escuadrón:',
  },
  'e.g., Golden TON Whales': {
    ru: 'напр., Золотые Киты TON',
    ar: 'مثال: حيتان TON الذهبية',
    es: 'ej., Ballenas Doradas TON',
  },
  'Target Shares:': {
    ru: 'Общее число долей:',
    ar: 'إجمالي الحصص المطلوبة:',
    es: 'Total de Acciones:',
  },
  'Target Round:': {
    ru: 'Целевой тираж:',
    ar: 'الجولة المستهدفة:',
    es: 'Ronda Objetivo:',
  },
  'Total Cost:': {
    ru: 'Сумма к оплате:',
    ar: 'إجمالي التكلفة:',
    es: 'Costo Total:',
  },
  'Creating...': {
    ru: 'Создание...',
    ar: 'جاري الإنشاء...',
    es: 'Creando...',
  },

  // Support Concierge & Quick-Ask Suggestion Chips
  'Account Status, Cashback & My Tickets': {
    ru: 'Статус аккаунта, кэшбэк и мои билеты',
    ar: 'حالة الحساب، الاسترداد النقدي وتذاكري',
    es: 'Estado de Cuenta, Reembolso y Mis Boletos',
  },
  'Free $1,000 Welcome Ticket Guide': {
    ru: 'Гид по бесплатному билету на $1,000',
    ar: 'دليل تذكرة الترحيب المجانية بقيمة 1,000$',
    es: 'Guía del Boleto Gratis de Bienvenida $1,000',
  },
  'Syndicate Pools & 2% Referral Rules': {
    ru: 'Правила синдикатов и 2% реферальных',
    ar: 'قواعد النقابات وعمولة الإحالة 2%',
    es: 'Reglas de Escuadrones y 2% de Referidos',
  },
  'Provably Fair Cryptographic Audit': {
    ru: 'Проверка честности (Provably Fair)',
    ar: 'التدقيق التشفيري لعدالة السحب (Provably Fair)',
    es: 'Auditoría Criptográfica Provably Fair',
  },
  'Direct Senior Admin Escalation (Human Ticket)': {
    ru: 'Связь со старшим администратором (Оператор)',
    ar: 'تواصل مباشر مع المدير الأول (تذكرة بشرية)',
    es: 'Contacto Directo con Admin Senior (Ticket Humano)',
  },
  '24/7 AI Concierge': {
    ru: 'AI Консьерж 24/7',
    ar: 'كونسيرج الذكاء الاصطناعي 24/7',
    es: 'Conserje IA 24/7',
  },
  'Live Telemetry Support': {
    ru: 'Живая поддержка 24/7',
    ar: 'دعم فوري مباشر 24/7',
    es: 'Soporte en Vivo 24/7',
  },
  '24/7 VIP AI Concierge & Live Support': {
    ru: 'VIP AI Консьерж 24/7 и Живая Поддержка',
    ar: 'كونسيرج الذكاء الاصطناعي VIP والدعم المباشر 24/7',
    es: 'Conserje IA VIP 24/7 y Soporte en Vivo',
  },
  'Refresh Messages': {
    ru: 'Обновить сообщения',
    ar: 'تحديث الرسائل',
    es: 'Actualizar Mensajes',
  },
  'Direct Telegram Support & 24/7 AI Concierge': {
    ru: 'Прямая поддержка в Telegram и AI Консьерж 24/7',
    ar: 'دعم تيليجرام المباشر وكونسيرج الذكاء الاصطناعي 24/7',
    es: 'Soporte Directo en Telegram y Conserje IA 24/7',
  },
  'Open Telegram Support': {
    ru: 'Чат в Telegram',
    ar: 'فتح دعم تيليجرام',
    es: 'Abrir Soporte Telegram',
  },
  'LuckyDrop VIP AI Concierge': {
    ru: 'VIP AI Консьерж LuckyDrop',
    ar: 'كونسيرج LuckyDrop VIP الذكي',
    es: 'Conserje IA VIP de LuckyDrop',
  },
  'Welcome to the 24/7 LuckyDrop VIP AI Concierge. Tap any quick-ask chip below or write your question for an instant 6-decimal telemetry check.': {
    ru: 'Добро пожаловать в круглосуточный VIP AI Консьерж LuckyDrop. Нажмите на любую быструю кнопку ниже или напишите вопрос для мгновенной проверки счёта с точностью до 6 знаков.',
    ar: 'مرحباً بك في كونسيرج LuckyDrop VIP الذكي على مدار الساعة. اضغط على أي زر استفسار سريع أدناه أو اكتب سؤالك لفحص حسابك بدقة 6 منازل عشرية.',
    es: 'Bienvenido al Conserje IA VIP 24/7 de LuckyDrop. Toca cualquier botón rápido abajo o escribe tu pregunta para una verificación instantánea con precisión de 6 decimales.',
  },
  'Prizes & Tickets Guide': {
    ru: 'Гид по призам и билетам',
    ar: 'دليل الجوائز والتذاكر',
    es: 'Guía de Premios y Boletos',
  },
  'Tap a smart concierge chip below or type your message to get started.': {
    ru: 'Нажмите на одну из умных кнопок ниже или введите сообщение.',
    ar: 'اضغط على أحد أزرار الاستعلام الذكية أدناه أو اكتب رسالتك للبدء.',
    es: 'Toca un botón inteligente abajo o escribe tu mensaje para comenzar.',
  },
  '24/7 VIP AI Concierge Quick-Ask:': {
    ru: 'Быстрые запросы к AI Консьержу 24/7:',
    ar: 'الاستعلام السريع من الكونسيرج الذكي 24/7:',
    es: 'Consultas Rápidas al Conserje IA 24/7:',
  },
  'Track Deposit': {
    ru: 'Статус депозита',
    ar: 'تتبع الإيداع',
    es: 'Rastrear Depósito',
  },
  'Track Withdraw': {
    ru: 'Статус вывода',
    ar: 'تتبع السحب',
    es: 'Rastrear Retiro',
  },
  'Prizes Guide': {
    ru: 'Гид по призам',
    ar: 'دليل الجوائز',
    es: 'Guía de Premios',
  },
  'Ask VIP AI Concierge or Senior Support Operator...': {
    ru: 'Задайте вопрос AI Консьержу или старшему оператору...',
    ar: 'اسأل الكونسيرج الذكي أو مدير الدعم الأول...',
    es: 'Pregunta al Conserje IA VIP o al Operador Senior...',
  },
  Send: {
    ru: 'Отправить',
    ar: 'إرسال',
    es: 'Enviar',
  },
  'Instant 24/7 VIP AI Concierge reply generated with your live 6-decimal account telemetry.': {
    ru: 'Мгновенный ответ VIP AI Консьержа сформирован на основе живых данных вашего счёта с точностью до 6 знаков.',
    ar: 'تم إنشاء رد فوري من كونسيرج الذكاء الاصطناعي VIP بناءً على بيانات حسابك المباشرة بدقة 6 منازل عشرية.',
    es: 'Respuesta instantánea del Conserje IA VIP generada con la telemetría en vivo de tu cuenta a 6 decimales.',
  },
  'Your message has been logged and answered live by our 24/7 VIP AI Concierge.': {
    ru: 'Ваше сообщение зарегистрировано, получен ответ от VIP AI Консьержа 24/7.',
    ar: 'تم تسجيل رسالتك والرد عليها مباشرة بواسطة كونسيرج الذكاء الاصطناعي VIP.',
    es: 'Tu mensaje ha sido registrado y respondido en vivo por nuestro Conserje IA VIP 24/7.',
  },

  // Growth Quests Titles
  'Join Official LuckyDrop Telegram Channel': {
    ru: 'Подписаться на официальный Telegram-канал LuckyDrop',
    ar: 'الانضمام إلى قناة LuckyDrop الرسمية على تيليجرام',
    es: 'Unirse al Canal Oficial de Telegram de LuckyDrop',
  },
  'First Syndicate Squad Share': {
    ru: 'Первая доля в командном синдикате',
    ar: 'أول حصة في نقابة جماعية',
    es: 'Primera Acción en Escuadrón Grupal',
  },
  'Active Ambassador (Invite 1 Active Buyer)': {
    ru: 'Активный Амбассадор (1 активный покупатель)',
    ar: 'سفير نشط (دعوة مشتري نشط واحد)',
    es: 'Embajador Activo (Invitar 1 Comprador Activo)',
  },
  'VIP Referral Leader (Invite 5 Active Buyers)': {
    ru: 'VIP Лидер Рефералов (5 активных покупателей)',
    ar: 'قائد إحالة VIP (دعوة 5 مشترين نشطين)',
    es: 'Líder de Referidos VIP (Invitar 5 Compradores Activos)',
  },

  // Instant Mini-Games Arena, Sound/Haptics & FX Labels
  'LuckyDrop 3D Arena': {
    ru: '3D Арена LuckyDrop',
    ar: 'ساحة LuckyDrop ثلاثية الأبعاد',
    es: 'Arena 3D LuckyDrop',
  },
  'Back to Game': {
    ru: 'К игре',
    ar: 'العودة للعبة',
    es: 'Volver al Juego',
  },
  'All 9 Games': {
    ru: 'Все 9 игр',
    ar: 'جميع الألعاب (9)',
    es: 'Los 9 Juegos',
  },
  'Sound On': {
    ru: 'Звук Вкл',
    ar: 'الصوت مفعل',
    es: 'Sonido Activo',
  },
  Muted: {
    ru: 'Без звука',
    ar: 'صامت',
    es: 'Silenciado',
  },
  'Mute Audio': {
    ru: 'Выключить звук',
    ar: 'كتم الصوت',
    es: 'Silenciar Audio',
  },
  'Unmute Audio': {
    ru: 'Включить звук',
    ar: 'تشغيل الصوت',
    es: 'Activar Audio',
  },
  'Start Mines': {
    ru: 'Начать Mines',
    ar: 'بدء لعبة الألغام',
    es: 'Iniciar Mines',
  },
  'Mines Count:': {
    ru: 'Число мин:',
    ar: 'عدد الألغام:',
    es: 'Cantidad de Minas:',
  },
  Pick: {
    ru: 'Случайно',
    ar: 'اختيار عشوائي',
    es: 'Elegir',
  },
  'Drop Ball': {
    ru: 'Бросить шар',
    ar: 'إسقاط الكرة',
    es: 'Lanzar Bola',
  },
  'Rolling 52-Bit...': {
    ru: 'Бросок 52-Bit...',
    ar: 'جاري الرمي...',
    es: 'Lanzando 52-Bit...',
  },
  Multiplier: {
    ru: 'Множитель',
    ar: 'المضاعف',
    es: 'Multiplicador',
  },
  'Roll Over': {
    ru: 'Больше',
    ar: 'أعلى من',
    es: 'Mayor que',
  },
  'Roll Under': {
    ru: 'Меньше',
    ar: 'أقل من',
    es: 'Menor que',
  },
  'Win Chance %': {
    ru: 'Шанс %',
    ar: 'فرصة الفوز %',
    es: 'Probabilidad %',
  },
  'Auto Cashout:': {
    ru: 'Авто-вывод:',
    ar: 'سحب تلقائي:',
    es: 'Auto Retiro:',
  },
  'Place Bet': {
    ru: 'Сделать ставку',
    ar: 'وضع رهان',
    es: 'Apostar',
  },
  'Cancel Bet': {
    ru: 'Отменить ставку',
    ar: 'إلغاء الرهان',
    es: 'Cancelar Apuesta',
  },
  'Cancel Queued Bet': {
    ru: 'Отменить очередь',
    ar: 'إلغاء الرهان القادم',
    es: 'Cancelar en Cola',
  },
  'Bet (Next Flight)': {
    ru: 'Ставка (След. раунд)',
    ar: 'رهان (الجولة القادمة)',
    es: 'Apostar (Próximo)',
  },
  'NEXT FLIGHT IN': {
    ru: 'СЛЕДУЮЩИЙ ВЗЛЁТ ЧЕРЕЗ',
    ar: 'الإقلاع القادم خلال',
    es: 'PRÓXIMO VUELO EN',
  },
  'CRASHED AT': {
    ru: 'ВЗРЫВ НА',
    ar: 'انفجر عند',
    es: 'ESTRELLADO EN',
  },
  'LuckyDrop Loyalty Reward (Free Lottery Ticket)': {
    ru: 'Награда лояльности LuckyDrop (Бесплатный билет)',
    ar: 'مكافأة ولاء LuckyDrop (تذكرة يانصيب مجانية)',
    es: 'Recompensa de Lealtad LuckyDrop (Boleto Gratis)',
  },
  'Round HMAC-SHA256 hash is revealed immediately after each bet.': {
    ru: 'Хэш раунда HMAC-SHA256 раскрывается сразу после каждой ставки.',
    ar: 'يتم كشف تجزئة HMAC-SHA256 للجولة فور انتهاء كل رهان.',
    es: 'El hash HMAC-SHA256 de la ronda se revela tras cada apuesta.',
  },
  Lobby: {
    ru: 'Лобби',
    ar: 'الردهة',
    es: 'Lobby',
  },
  'Play Lottery': {
    ru: 'Играть в лотерею',
    ar: 'العب اليانصيب',
    es: 'Jugar Lotería',
  },
  'Special Jackpots': {
    ru: 'Спец-Джекпоты',
    ar: 'الجوائز الخاصة',
    es: 'Jackpots Especiales',
  },
  Syndicates: {
    ru: 'Синдикаты',
    ar: 'النقابات',
    es: 'Sindicatos',
  },
  'Rewards & Earn': {
    ru: 'Награды',
    ar: 'المكافآت',
    es: 'Premios',
  },
  Rewards: {
    ru: 'Награды',
    ar: 'المكافآت',
    es: 'Premios',
  },
  '85% Prize Pool': {
    ru: '85% Призовой фонд',
    ar: '85% مجمع الجوائز',
    es: '85% Pozo de Premios',
  },
  Days: {
    ru: 'Дни',
    ar: 'أيام',
    es: 'Días',
  },
  Hours: {
    ru: 'Часы',
    ar: 'ساعات',
    es: 'Horas',
  },
  Minutes: {
    ru: 'Мин',
    ar: 'دقائق',
    es: 'Minutos',
  },
  Seconds: {
    ru: 'Сек',
    ar: 'ثواني',
    es: 'Segundos',
  },
  '1 Ticket': {
    ru: '1 Билет',
    ar: 'تذكرة واحدة',
    es: '1 Boleto',
  },
  '5 Tickets': {
    ru: '5 Билетов',
    ar: '5 تذاكر',
    es: '5 Boletos',
  },
  '10 Tickets': {
    ru: '10 Билетов',
    ar: '10 تذاكر',
    es: '10 Boletos',
  },
  'POPULAR • +1 VIP': {
    ru: 'ХИТ • +1 VIP',
    ar: 'الأكثر شعبية • +1 VIP',
    es: 'POPULAR • +1 VIP',
  },
  'STARTER': {
    ru: 'СТАРТ',
    ar: 'مبتدئ',
    es: 'INICIAL',
  },
  'WHALE • +2 VIP': {
    ru: 'КИТ • +2 VIP',
    ar: 'حوت • +2 VIP',
    es: 'BALLENA • +2 VIP',
  },
  '$1,000 Welcome Ticket': {
    ru: 'Билет на $1,000',
    ar: 'تذكرة ترحيب 1,000$',
    es: 'Boleto Bienvenida $1,000',
  },
  'CLAIM NOW': {
    ru: 'ЗАБРАТЬ',
    ar: 'استلام فوري',
    es: 'RECLAMAR',
  },
  'OPEN VAULT': {
    ru: 'ОТКРЫТЬ СЕЙФ',
    ar: 'فتح الخزينة',
    es: 'ABRIR BÓVEDA',
  },
  'Watch Draw': {
    ru: 'Смотреть тираж',
    ar: 'مشاهدة السحب',
    es: 'Ver Sorteo',
  },
  WON: {
    ru: 'ВЫИГРЫШ',
    ar: 'فائز',
    es: 'GANADOR',
  },
  'OPEN • Instant Share Mint': {
    ru: 'ОТКРЫТ • Мгновенная доля',
    ar: 'مفتوح • إصدار فوري للحصص',
    es: 'ABIERTO • Emisión Instantánea',
  },
  'FULL SQUAD': {
    ru: 'ЗАПОЛНЕН',
    ar: 'مكتمل العدد',
    es: 'ESCUADRÓN LLENO',
  },
  'Telegram Quests & Loyalty Rewards': {
    ru: 'Задания Telegram и Награды Лояльности',
    ar: 'مهام تيليجرام ومكافآت الولاء',
    es: 'Misiones de Telegram y Recompensas de Lealtad',
  },
  'Earn Free Drops & Invite Friends': {
    ru: 'Бесплатные призы и приглашение друзей',
    ar: 'اكسب جوائز مجانية وادعُ أصدقاءك',
    es: 'Gana Premios Gratis e Invita Amigos',
  },
  'XP Score': {
    ru: 'Очки XP',
    ar: 'نقاط XP',
    es: 'Puntos XP',
  },
  'Free Plinko Drops': {
    ru: 'Бесплатные шары Plinko',
    ar: 'كرات Plinko مجانية',
    es: 'Bolas Gratis de Plinko',
  },
  'Free Scratch Cards': {
    ru: 'Бесплатные скретч-карты',
    ar: 'بطاقات خدش مجانية',
    es: 'Tarjetas Rasca Gratis',
  },
  'Free Lottery Slips': {
    ru: 'Бесплатные билеты лотереи',
    ar: 'تذاكر يانصيب مجانية',
    es: 'Boletos de Lotería Gratis',
  },
  '7-Day Telegram Activity Streak': {
    ru: '7-дневная серия активности Telegram',
    ar: 'سلسلة النشاط لمدة 7 أيام في تيليجرام',
    es: 'Racha de Actividad de 7 Días en Telegram',
  },
  'Active Quests (Turnover-Locked Rewards)': {
    ru: 'Активные задания (Награды за оборот)',
    ar: 'المهام النشطة (مكافآت التداول)',
    es: 'Misiones Activas (Recompensas en Juego)',
  },
  Completed: {
    ru: 'Выполнено',
    ar: 'مكتمل',
    es: 'Completado',
  },
  'Join & Verify': {
    ru: 'Вступить и проверить',
    ar: 'انضم وتحقق',
    es: 'Unirse y Verificar',
  },
  'Claim Reward': {
    ru: 'Забрать награду',
    ar: 'استلام المكافأة',
    es: 'Reclamar Recompensa',
  },
  'Telegram Affiliate Program': {
    ru: 'Партнёрская программа Telegram',
    ar: 'برنامج الإحالة في تيليجرام',
    es: 'Programa de Afiliados de Telegram',
  },
  'Earn 10% of the house fee on every ticket & game played by your referrals': {
    ru: 'Получайте 10% комиссии платформы с каждого билета и игры ваших друзей',
    ar: 'اكسب 10% من رسوم المنصة على كل تذكرة ولعبة يلعبها أصدقاؤك',
    es: 'Gana el 10% de la comisión en cada boleto y juego de tus invitados',
  },
  'Copied!': {
    ru: 'Скопировано!',
    ar: 'تم النسخ!',
    es: '¡Copiado!',
  },
  'Share Invite Link in Telegram Chats': {
    ru: 'Отправить ссылку в чаты Telegram',
    ar: 'مشاركة رابط الدعوة في محادثات تيليجرام',
    es: 'Compartir Enlace en Chats de Telegram',
  },
  'Active Referrals': {
    ru: 'Активные рефералы',
    ar: 'الإحالات النشطة',
    es: 'Referidos Activos',
  },
  Users: {
    ru: 'Польз.',
    ar: 'مستخدمين',
    es: 'Usuarios',
  },
  'Claimable Commission': {
    ru: 'Доступная комиссия',
    ar: 'العمولة القابلة للسحب',
    es: 'Comisión Disponible',
  },
  '💸 Transfer Commission to Main Wallet': {
    ru: '💸 Перевести комиссию на кошелёк',
    ar: '💸 تحويل العمولة إلى المحفظة الرئيسية',
    es: '💸 Transferir Comisión a la Billetera',
  },
  'Connect Standard Non-Custodial TON Wallet': {
    ru: 'Подключить кошелёк TON (Tonkeeper / MyTonWallet)',
    ar: 'ربط محفظة TON القياسية (Tonkeeper / MyTonWallet)',
    es: 'Conectar Billetera TON Estándar',
  },
  'Connect Tonkeeper, MyTonWallet, Tonhub, or Bitget Wallet': {
    ru: 'Подключите Tonkeeper, MyTonWallet, Tonhub или Bitget Wallet',
    ar: 'اربط محفظة Tonkeeper أو MyTonWallet أو Tonhub أو Bitget',
    es: 'Conecta Tonkeeper, MyTonWallet, Tonhub o Bitget Wallet',
  },
  'Join the official community channel for draw alerts': {
    ru: 'Подпишитесь на официальный канал для уведомлений о тиражах',
    ar: 'انضم للقناة الرسمية لتلقي إشعارات السحب',
    es: 'Únete al canal oficial para alertas de sorteos',
  },
  '7-Day Daily Check-In Streak': {
    ru: 'Ежедневный вход (Серия 7 дней)',
    ar: 'تسجيل الدخول اليومي لمدة 7 أيام',
    es: 'Racha de Ingreso Diario de 7 Días',
  },
  'Check in daily to receive a free Scratch Card & XP': {
    ru: 'Заходите каждый день, чтобы получить скретч-карту и XP',
    ar: 'سجل دخولك يومياً للحصول على بطاقة خدش مجانية ونقاط XP',
    es: 'Ingresa a diario para recibir una tarjeta rasca gratis y XP',
  },
  'Play 10 Instant Mini-Game Rounds': {
    ru: 'Сыграть 10 раундов в быстрые мини-игры',
    ar: 'العب 10 جولات في الألعاب الفورية',
    es: 'Jugar 10 Rondas de Mini-Juegos Instantáneos',
  },
  'Play 10 rounds across any Instant Mini-Game': {
    ru: 'Сыграйте 10 раундов в любой мини-игре',
    ar: 'العب 10 جولات في أي لعبة فورية',
    es: 'Juega 10 rondas en cualquier mini-juego instantáneo',
  },
  '+2 Free Plinko Drops + 50 XP': {
    ru: '+2 бесплатных шара Plinko + 50 XP',
    ar: '+2 كرات Plinko مجانية + 50 XP',
    es: '+2 Bolas Plinko Gratis + 50 XP',
  },
  '+1 Free Lottery Ticket + 40 XP': {
    ru: '+1 бесплатный билет лотереи + 40 XP',
    ar: '+1 تذكرة يانصيب مجانية + 40 XP',
    es: '+1 Boleto de Lotería Gratis + 40 XP',
  },
  '+1 Free Scratch Card + 35 XP': {
    ru: '+1 бесплатная скретч-карта + 35 XP',
    ar: '+1 بطاقة خدش مجانية + 35 XP',
    es: '+1 Tarjeta Rasca Gratis + 35 XP',
  },
  '+3 Free Plinko Drops + 80 XP': {
    ru: '+3 бесплатных шара Plinko + 80 XP',
    ar: '+3 كرات Plinko مجانية + 80 XP',
    es: '+3 Bolas Plinko Gratis + 80 XP',
  },
  'TON Connect 2.0 Seamless Wallet': {
    ru: 'Единый кошелёк TON Connect 2.0',
    ar: 'محفظة TON Connect 2.0 المتكاملة',
    es: 'Billetera Integrada TON Connect 2.0',
  },
  'Connect Standard Non-Custodial TON Wallet:': {
    ru: 'Подключить стандартный кошелёк сети TON:',
    ar: 'ربط محفظة شبكة TON القياسية:',
    es: 'Conectar Billetera Estándar de Red TON:',
  },
  '💎 Instant VIP Cashback Vault': {
    ru: 'Сейф мгновенного VIP кэшбэка',
    ar: 'خزينة الاسترداد النقدي الفوري VIP',
    es: 'Bóveda de Reembolso VIP Instantáneo',
  },
  '3% Ticket + 1.5% Game Rebate': {
    ru: '3% с билетов + 1.5% с игр',
    ar: '3% للتذاكر + 1.5% للألعاب',
    es: '3% Boletos + 1.5% Juegos',
  },
  'Claim Instant Cashback to Wallet (Claim Now)': {
    ru: 'Вывести кэшбэк на кошелёк (Забрать)',
    ar: 'سحب الاسترداد النقدي فوراً للمحفظة',
    es: 'Reclamar Reembolso Instantáneo a la Billetera',
  },
  Deposit: {
    ru: 'Пополнить',
    ar: 'إيداع',
    es: 'Depositar',
  },
  Withdraw: {
    ru: 'Вывести',
    ar: 'سحب',
    es: 'Retirar',
  },
  'PAM Ledger': {
    ru: 'Реестр PAM',
    ar: 'سجل PAM',
    es: 'Libro PAM',
  },
  'Automated On-Chain TON Deposit': {
    ru: 'Автоматическое пополнение в сети TON',
    ar: 'إيداع تلقائي عبر شبكة TON',
    es: 'Depósito Automático en Red TON',
  },
  '1-Tap TON Connect 2.0 Smart Contract Transfer (0% Platform Fee)': {
    ru: 'Перевод через смарт-контракт TON Connect 2.0 в 1 клик (Комиссия 0%)',
    ar: 'تحويل مباشر عبر العقد الذكي TON Connect 2.0 (بدون عمولة)',
    es: 'Transferencia en 1 Clic vía Contrato Inteligente TON Connect 2.0 (0% Comisión)',
  },
  'Connect & Deposit TON': {
    ru: 'Подключить и пополнить TON',
    ar: 'ربط وإيداع TON',
    es: 'Conectar y Depositar TON',
  },
  'Official TON Treasury Vault Address:': {
    ru: 'Официальный адрес казначейства TON:',
    ar: 'عنوان خزينة TON الرسمية:',
    es: 'Dirección Oficial de Bóveda TON:',
  },
  Copied: {
    ru: 'Скопировано',
    ar: 'تم النسخ',
    es: 'Copiado',
  },
  Copy: {
    ru: 'Копировать',
    ar: 'نسخ',
    es: 'Copiar',
  },
  'Paste TXID or signed BOC for on-chain verification': {
    ru: 'Вставьте TXID или BOC для проверки транзакции в блокчейне',
    ar: 'الصق معرف المعاملة TXID أو BOC للتحقق المباشر',
    es: 'Pega el TXID o BOC firmado para verificación en cadena',
  },
  '1-Tap Top-Up with Telegram Stars (XTR)': {
    ru: 'Пополнение в 1 клик через Telegram Stars (XTR)',
    ar: 'شحن بنقرة واحدة عبر نجوم تيليجرام (Stars)',
    es: 'Recarga en 1 Clic con Telegram Stars (XTR)',
  },
  'Official in-app Telegram Stars invoice — no external wallet needed': {
    ru: 'Официальная оплата Telegram Stars внутри приложения — внешний кошелёк не нужен',
    ar: 'دفع رسمي داخل تيليجرام بدون الحاجة لمحفظة خارجية',
    es: 'Factura oficial de Telegram Stars en la app — sin billetera externa',
  },
  'Starter Pack': {
    ru: 'Стартовый',
    ar: 'باقة البداية',
    es: 'Paquete Inicial',
  },
  'Most Popular': {
    ru: 'Популярный',
    ar: 'الأكثر شعبية',
    es: 'Más Popular',
  },
  'Pro Pack': {
    ru: 'Профи',
    ar: 'باقة المحترفين',
    es: 'Paquete Pro',
  },
  'VIP Whale Pack': {
    ru: 'VIP Кит',
    ar: 'باقة كبار الشخصيات',
    es: 'Paquete Ballena VIP',
  },
  'Instant Telegram Invoice': {
    ru: 'Мгновенный счёт Telegram',
    ar: 'فاتورة تيليجرام فورية',
    es: 'Factura Instantánea de Telegram',
  },
  'Available:': {
    ru: 'Доступно:',
    ar: 'المتاح:',
    es: 'Disponible:',
  },
  'Destination TON Wallet Address (UQ... or EQ...):': {
    ru: 'Адрес TON кошелька получателя (UQ... или EQ...):',
    ar: 'عنوان محفظة TON المستلمة (UQ... أو EQ...):',
    es: 'Dirección de Billetera TON de Destino (UQ... o EQ...):',
  },
  'Destination Telegram Handle (@username):': {
    ru: 'Имя пользователя Telegram (@username):',
    ar: 'معرف تيليجرام المستلم (@username):',
    es: 'Usuario de Telegram de Destino (@username):',
  },
  '🚀 Submit & Settle On-Chain TON Withdrawal': {
    ru: '🚀 Отправить запрос на мгновенный вывод в сети TON',
    ar: '🚀 تأكيد وتسوية السحب الفوري عبر شبكة TON',
    es: '🚀 Enviar y Liquidar Retiro en Red TON',
  },
  'Standard withdrawals are processed swiftly with cryptographic escrow verification.': {
    ru: 'Стандартные выводы обрабатываются мгновенно с криптографической проверкой.',
    ar: 'تتم معالجة عمليات السحب القياسية بسرعة مع التحقق التشفيري.',
    es: 'Los retiros estándar se procesan rápidamente con verificación criptográfica.',
  },
  'Recent PAM Seamless Wallet Ledger': {
    ru: 'Последние транзакции единого реестра PAM',
    ar: 'أحدث معاملات سجل المحفظة الموحد PAM',
    es: 'Transacciones Recientes del Libro PAM',
  },
};

/**
 * Translates dynamic patterns (such as counts, round codes, slip quantities, etc.)
 * into Russian (`ru`), Arabic (`ar`), or Spanish (`es`) when an exact static match isn't found.
 */
function translateDynamicPattern(enText: string, faText: string, locale: SupportedLocale): string {
  if (locale === 'fa') return faText;
  if (locale === 'en') return enText;

  // Match: "My Tickets (N)" or "View My Tickets (N)"
  const myTicketsMatch = enText.match(/^(?:View )?My Tickets \((\d+)\)$/i);
  if (myTicketsMatch) {
    const n = myTicketsMatch[1];
    if (locale === 'ru') return `Мои билеты (${n})`;
    if (locale === 'ar') return `تذاكري (${n})`;
    if (locale === 'es') return `Mis Boletos (${n})`;
  }

  // Match: "My Tickets in This Round (N)"
  const roundTicketsMatch = enText.match(/^My Tickets in This Round \((\d+)\)$/i);
  if (roundTicketsMatch) {
    const n = roundTicketsMatch[1];
    if (locale === 'ru') return `Мои билеты в этом тираже (${n})`;
    if (locale === 'ar') return `تذاكري في هذه الجولة (${n})`;
    if (locale === 'es') return `Mis Boletos en Esta Ronda (${n})`;
  }

  // Match: "N Ticket(s)"
  const ticketsCountMatch = enText.match(/^(\d+)\s+Tickets?$/i);
  if (ticketsCountMatch) {
    const n = ticketsCountMatch[1];
    if (locale === 'ru') return `${n} билет${Number(n) === 1 ? '' : Number(n) < 5 ? 'а' : 'ов'}`;
    if (locale === 'ar') return `${n} ${Number(n) === 1 ? 'تذكرة' : 'تذاكر'}`;
    if (locale === 'es') return `${n} Boleto${Number(n) > 1 ? 's' : ''}`;
  }

  // Match: "N Slip(s)"
  const slipsMatch = enText.match(/^(\d+)\s+Slips?$/i);
  if (slipsMatch) {
    const n = slipsMatch[1];
    if (locale === 'ru') return `${n} билет${Number(n) === 1 ? '' : Number(n) < 5 ? 'а' : 'ов'}`;
    if (locale === 'ar') return `${n} تذاكر`;
    if (locale === 'es') return `${n} Boleto${Number(n) > 1 ? 's' : ''}`;
  }

  // Match: "Day N / 7"
  const dayStreakMatch = enText.match(/^Day (\d+)\s*\/\s*7$/i);
  if (dayStreakMatch) {
    const d = dayStreakMatch[1];
    if (locale === 'ru') return `День ${d} / 7`;
    if (locale === 'ar') return `اليوم ${d} من 7`;
    if (locale === 'es') return `Día ${d} / 7`;
  }

  // Match: "Your Referral Code: CODE • Instant Revenue Share Settlement"
  const refCodeFooterMatch = enText.match(/^Your Referral Code:\s*(.+?)\s*•/i);
  if (refCodeFooterMatch) {
    const code = refCodeFooterMatch[1];
    if (locale === 'ru') return `Ваш реферальный код: ${code} • Мгновенные выплаты`;
    if (locale === 'ar') return `رمز الإحالة الخاص بك: ${code} • تسوية فورية للأرباح`;
    if (locale === 'es') return `Tu Código de Referido: ${code} • Liquidación Instantánea`;
  }

  // Match: "Latest Draw (CODE)"
  const latestDrawMatch = enText.match(/^Latest Draw \((.+)\)$/i);
  if (latestDrawMatch) {
    const code = latestDrawMatch[1];
    if (locale === 'ru') return `Последний тираж (${code})`;
    if (locale === 'ar') return `آخر سحب (${code})`;
    if (locale === 'es') return `Último Sorteo (${code})`;
  }

  // Match: "N Joined"
  const joinedMatch = enText.match(/^(\d+)\s+Joined$/i);
  if (joinedMatch) {
    const n = joinedMatch[1];
    if (locale === 'ru') return `${n} участн.`;
    if (locale === 'ar') return `${n} مشارك`;
    if (locale === 'es') return `${n} Participantes`;
  }

  // Match: "Join (Nx)"
  const joinSharesMatch = enText.match(/^Join \((\d+)x\)$/i);
  if (joinSharesMatch) {
    const n = joinSharesMatch[1];
    if (locale === 'ru') return `Купить (${n}x)`;
    if (locale === 'ar') return `انضمام (${n}x)`;
    if (locale === 'es') return `Unirse (${n}x)`;
  }

  // Match: "Your Initial Shares (N):"
  const initSharesMatch = enText.match(/^Your Initial Shares \((\d+)\):$/i);
  if (initSharesMatch) {
    const n = initSharesMatch[1];
    if (locale === 'ru') return `Ваши начальные доли (${n}):`;
    if (locale === 'ar') return `حصصك الأولية (${n}):`;
    if (locale === 'es') return `Tus Acciones Iniciales (${n}):`;
  }

  // Match: "Launch (Nx)"
  const launchSquadMatch = enText.match(/^Launch \((\d+)x\)$/i);
  if (launchSquadMatch) {
    const n = launchSquadMatch[1];
    if (locale === 'ru') return `Создать (${n}x)`;
    if (locale === 'ar') return `إنشاء (${n}x)`;
    if (locale === 'es') return `Lanzar (${n}x)`;
  }

  // Match: "5 Main Numbers (N/5):"
  const mainNumsMatch = enText.match(/^5 Main Numbers \((\d+)\/5\):$/i);
  if (mainNumsMatch) {
    const n = mainNumsMatch[1];
    if (locale === 'ru') return `5 основных чисел (${n}/5):`;
    if (locale === 'ar') return `5 أرقام رئيسية (${n}/5):`;
    if (locale === 'es') return `5 Números Principales (${n}/5):`;
  }

  // Match: "Golden Ball (★N):"
  const goldenBallMatch = enText.match(/^Golden Ball \(★(\d+)\):$/i);
  if (goldenBallMatch) {
    const n = goldenBallMatch[1];
    if (locale === 'ru') return `Золотой шар (★${n}):`;
    if (locale === 'ar') return `الكرة الذهبية (★${n}):`;
    if (locale === 'es') return `Bola Dorada (★${n}):`;
  }

  // Match: "N ticket(s) minted in round CODE!"
  const mintedMatch = enText.match(/(\d+)\s+ticket\(s\)\s+minted in round\s+([^\s!]+)/i);
  if (mintedMatch) {
    const [, qty, code] = mintedMatch;
    if (locale === 'ru') return `Выпущено билетов: ${qty} в тираже ${code}!`;
    if (locale === 'ar') return `تم إصدار ${qty} تذكرة في الجولة ${code}!`;
    if (locale === 'es') return `¡${qty} boleto(s) emitidos en la ronda ${code}!`;
  }

  // Match: "NAME bought N slip(s) in CODE!"
  const tickerMatch = enText.match(/^(.+) bought (\d+) slip\(s\) in (.+)!$/i);
  if (tickerMatch) {
    const [, buyer, qty, code] = tickerMatch;
    if (locale === 'ru') return `${buyer} купил(а) ${qty} бил. в ${code}!`;
    if (locale === 'ar') return `اشترى ${buyer} عدد ${qty} تذكرة في ${code}!`;
    if (locale === 'es') return `¡${buyer} compró ${qty} boleto(s) en ${code}!`;
  }

  return enText;
}

/**
 * Primary multi-lingual translation helper supporting all 5 global languages (`fa`, `en`, `ru`, `ar`, `es`).
 * Backward-compatible with 2-arg `tr(lang, fa, en)` calls via `GLOBAL_PHRASE_DICTIONARY` and pattern matching,
 * while also accepting explicit `(lang, fa, en, ru, ar, es)` parameters.
 */
export function tr(
  lang: Language | string | undefined,
  fa: string,
  en: string,
  ru?: string,
  ar?: string,
  es?: string
): string {
  const locale = normalizeLocale(lang);
  if (locale === 'fa') return fa;
  if (locale === 'en') return en;

  if (locale === 'ru' && ru) return ru;
  if (locale === 'ar' && ar) return ar;
  if (locale === 'es' && es) return es;

  const dictHit = GLOBAL_PHRASE_DICTIONARY[en] || GLOBAL_PHRASE_DICTIONARY[fa];
  if (dictHit) {
    if (locale === 'ru') return dictHit.ru;
    if (locale === 'ar') return dictHit.ar;
    if (locale === 'es') return dictHit.es;
  }

  return translateDynamicPattern(en, fa, locale);
}

/**
 * Structured 5-language object translation helper.
 */
export function t5(
  lang: Language | string | undefined,
  translations: {
    fa: string;
    en: string;
    ru: string;
    ar: string;
    es: string;
  }
): string {
  const locale = normalizeLocale(lang);
  return translations[locale] || translations.en;
}

/**
 * Converts Persian/Arabic-Indic numerals and punctuation to standard ASCII digits.
 */
function normalizeAsciiDigits(input: string): string {
  return String(input || '')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٪/g, '%')
    .replace(/،/g, ',');
}

/**
 * Localizes any lottery prize tier label (`tierLabelFa`) into the active language (`fa`, `en`, `ru`, `ar`, `es`).
 */
export function localizeTierLabel(lang: Language | string | undefined, rawTierLabel: string): string {
  const locale = normalizeLocale(lang);
  const raw = String(rawTierLabel || '').trim();
  if (!raw || locale === 'fa') return raw;

  const text = normalizeAsciiDigits(raw);

  // Welcome $1,000 wrapper e.g. "🎉 رتبه ششم (۳ گوی اصلی) (لاتاری ۱,۰۰۰ دلاری خوشآمدگویی)"
  if (text.includes('لاتاری') && (text.includes('1,000') || text.includes('1000') || text.includes('خوشآمدگویی'))) {
    const innerRaw = raw
      .replace(/^🎉\s*/, '')
      .replace(/\s*\(لاتاری[^)]*\)\s*$/u, '')
      .trim();
    const innerLocalized = innerRaw && innerRaw !== raw ? localizeTierLabel(locale, innerRaw) : '';
    if (locale === 'en') return `🎉 ${innerLocalized || 'Welcome Prize'} ($1,000 Welcome Grand Draw)`;
    if (locale === 'ru') return `🎉 ${innerLocalized || 'Приз'} (Приветственный розыгрыш $1,000)`;
    if (locale === 'ar') return `🎉 ${innerLocalized || 'جائزة الترحيب'} (يانصيب الترحيب 1,000$)`;
    if (locale === 'es') return `🎉 ${innerLocalized || 'Premio'} (Gran Sorteo de Bienvenida $1,000)`;
  }

  // Monthly VIP Super-Jackpot Tier-1 Winner
  if (text.includes('برنده مطلق جک‌پات') || text.includes('Tier-1 Monthly VIP Super-Jackpot')) {
    if (locale === 'en') return '👑 Tier-1 Monthly VIP Super-Jackpot Winner (All 6 Balls)';
    if (locale === 'ru') return '👑 Победитель Ежемесячного VIP Супер-Джекпота (Все 6 шаров)';
    if (locale === 'ar') return '👑 الفائز بالجائزة الشهرية الكبرى VIP (تطابق 6 كرات)';
    if (locale === 'es') return '👑 Ganador del Súper Jackpot Mensual VIP (6 Bolas Exactas)';
  }

  // Monthly VIP All-or-Nothing Non-Winner
  if (text.includes('All-or-Nothing') || text.includes('بدون تطابق جک‌پات') || text.includes('عدم تطابق کامل')) {
    const mMatch = text.match(/\((\d+)\s*اصلی/);
    const hasGolden = text.includes('+ طلایی');
    const matchInfoEn = mMatch ? ` (${mMatch[1]} Main${hasGolden ? ' + Golden' : ''})` : '';
    const matchInfoRu = mMatch ? ` (${mMatch[1]} осн.${hasGolden ? ' + золотой' : ''})` : '';
    const matchInfoAr = mMatch ? ` (${mMatch[1]} رئيسية${hasGolden ? ' + ذهبية' : ''})` : '';
    const matchInfoEs = mMatch ? ` (${mMatch[1]} princ.${hasGolden ? ' + dorada' : ''})` : '';
    if (locale === 'en') return `No Full 6-Ball Jackpot Match${matchInfoEn} (VIP All-or-Nothing Rollover)`;
    if (locale === 'ru') return `Нет полного совпадения 6 шаров${matchInfoRu} (Правило All-or-Nothing VIP)`;
    if (locale === 'ar') return `عدم تطابق 6 كرات كاملة${matchInfoAr} (قاعدة الكل أو لا شيء VIP)`;
    if (locale === 'es') return `Sin acierto total de 6 bolas${matchInfoEs} (Regla Todo o Nada VIP)`;
  }

  // Tier 1: 5 Main + 1 Golden
  if (
    text.includes('جک‌پات الماس') ||
    text.includes('رده 1') ||
    (text.includes('5 گوی اصلی') && text.includes('طلایی'))
  ) {
    if (locale === 'en') return 'Diamond Grand Jackpot (5 Main + Golden Ball)';
    if (locale === 'ru') return 'Бриллиантовый Гранд-Джекпот (5 осн. + Золотой шар)';
    if (locale === 'ar') return 'الجاكبوت الماسي الكبير (5 كرات رئيسية + الكرة الذهبية)';
    if (locale === 'es') return 'Gran Jackpot Diamante (5 Principales + Bola Dorada)';
  }

  // Tier 2: 5 Main
  if (text.includes('رتبه دوم') || text.includes('رده 2') || text.includes('5 گوی اصلی')) {
    if (locale === 'en') return 'Tier 2 Prize (5 Main Balls)';
    if (locale === 'ru') return 'Приз 2-й категории (5 основных шаров)';
    if (locale === 'ar') return 'المستوى الثاني (5 كرات رئيسية)';
    if (locale === 'es') return 'Premio Nivel 2 (5 Bolas Principales)';
  }

  // Tier 3: 4 Main + Golden
  if (
    text.includes('رتبه سوم') ||
    text.includes('رده 3') ||
    (text.includes('4 گوی') && text.includes('طلایی'))
  ) {
    if (locale === 'en') return 'Tier 3 Prize (4 Main + Golden Ball)';
    if (locale === 'ru') return 'Приз 3-й категории (4 осн. + Золотой шар)';
    if (locale === 'ar') return 'المستوى الثالث (4 كرات رئيسية + الكرة الذهبية)';
    if (locale === 'es') return 'Premio Nivel 3 (4 Principales + Bola Dorada)';
  }

  // Tier 4: 4 Main
  if (text.includes('رتبه چهارم') || text.includes('رده 4') || text.includes('4 گوی اصلی')) {
    if (locale === 'en') return 'Tier 4 Prize (4 Main Balls)';
    if (locale === 'ru') return 'Приз 4-й категории (4 основных шара)';
    if (locale === 'ar') return 'المستوى الرابع (4 كرات رئيسية)';
    if (locale === 'es') return 'Premio Nivel 4 (4 Bolas Principales)';
  }

  // Tier 5: 3 Main + Golden
  if (
    text.includes('رتبه پنجم') ||
    text.includes('رده 5') ||
    (text.includes('3 گوی') && text.includes('طلایی'))
  ) {
    if (locale === 'en') return 'Tier 5 Prize (3 Main + Golden Ball)';
    if (locale === 'ru') return 'Приз 5-й категории (3 осн. + Золотой шар)';
    if (locale === 'ar') return 'المستوى الخامس (3 كرات رئيسية + الكرة الذهبية)';
    if (locale === 'es') return 'Premio Nivel 5 (3 Principales + Bola Dorada)';
  }

  // Tier 6: 3 Main
  if (text.includes('رتبه ششم') || text.includes('رده 6') || text.includes('3 گوی اصلی')) {
    if (locale === 'en') return 'Tier 6 Prize (3 Main Balls)';
    if (locale === 'ru') return 'Приз 6-й категории (3 основных шара)';
    if (locale === 'ar') return 'المستوى السادس (3 كرات رئيسية)';
    if (locale === 'es') return 'Premio Nivel 6 (3 Bolas Principales)';
  }

  // Tier 7: 2 Main + Golden
  if (
    text.includes('رتبه هفتم') ||
    text.includes('رده 7') ||
    (text.includes('2 گوی اصلی') && text.includes('طلایی'))
  ) {
    if (locale === 'en') return 'Tier 7 Prize (2 Main + Golden Ball)';
    if (locale === 'ru') return 'Приз 7-й категории (2 осн. + Золотой шар)';
    if (locale === 'ar') return 'المستوى السابع (كرتان رئيسيتان + الكرة الذهبية)';
    if (locale === 'es') return 'Premio Nivel 7 (2 Principales + Bola Dorada)';
  }

  // Tier 8: Golden Ball Match or 2 Main Balls
  if (text.includes('جایزه گوی طلایی') || text.includes('تطابق طلایی')) {
    if (locale === 'en') return 'Golden Ball Match Prize (★)';
    if (locale === 'ru') return 'Приз за совпадение Золотого шара (★)';
    if (locale === 'ar') return 'جائزة تطابق الكرة الذهبية (★)';
    if (locale === 'es') return 'Premio por Acierto de Bola Dorada (★)';
  }
  if (text.includes('جایزه 2 گوی اصلی') || text.includes('2 گوی اصلی')) {
    if (locale === 'en') return '2 Main Balls Match Prize';
    if (locale === 'ru') return 'Приз за 2 основных шара';
    if (locale === 'ar') return 'جائزة تطابق كرتين رئيسيتين';
    if (locale === 'es') return 'Premio por 2 Bolas Principales';
  }

  // No match
  if (text.includes('بدون تطابق')) {
    if (locale === 'en') return 'No Prize Match in This Draw';
    if (locale === 'ru') return 'Без выигрышного совпадения в этом тираже';
    if (locale === 'ar') return 'لا يوجد تطابق فائز في هذه الجولة';
    if (locale === 'es') return 'Sin combinación ganadora en este sorteo';
  }

  return stripResidualPersianForNonRtl(locale, text);
}

function stripResidualPersianForNonRtl(locale: SupportedLocale, input: string): string {
  if (locale === 'fa' || locale === 'ar') return input;
  const ascii = normalizeAsciiDigits(input);
  if (!/[\u0600-\u06FF]/.test(ascii)) return ascii;

  const dictionary: Array<[RegExp, Record<'en' | 'ru' | 'es', string>]> = [
    [/لاتاری/g, { en: 'Lottery', ru: 'Лотерея', es: 'Lotería' }],
    [/قرعه‌کشی|قرعه کشی/g, { en: 'Draw', ru: 'Тираж', es: 'Sorteo' }],
    [/بلیت|کوپن/g, { en: 'Ticket', ru: 'Билет', es: 'Boleto' }],
    [/جایزه|پاداش/g, { en: 'Prize', ru: 'Приз', es: 'Premio' }],
    [/برنده|برد/g, { en: 'Winner', ru: 'Выигрыш', es: 'Premio' }],
    [/سندیکای گروهی|سندیکا/g, { en: 'Syndicate Squad', ru: 'Синдикат', es: 'Sindicato' }],
    [/سهم|سهام/g, { en: 'Share', ru: 'Доля', es: 'Acción' }],
    [/کش‌بک|کشبک|ریک‌بک|ریکبک/g, { en: 'VIP Cashback', ru: 'VIP Кэшбэк', es: 'Cashback VIP' }],
    [/پورسانت|زیرمجموعه‌گیری|دعوت دوستان|معرف/g, { en: 'Referral Commission', ru: 'Реферальная комиссия', es: 'Comisión de Referidos' }],
    [/واریز|شارژ/g, { en: 'Deposit', ru: 'Депозит', es: 'Depósito' }],
    [/برداشت/g, { en: 'Withdrawal', ru: 'Вывод', es: 'Retiro' }],
    [/برگشت وجه/g, { en: 'Refund Rollback', ru: 'Возврат средств', es: 'Reembolso' }],
    [/کیف پول/g, { en: 'Wallet', ru: 'Кошелек', es: 'Billetera' }],
    [/کاربر/g, { en: 'VIP User', ru: 'VIP Игрок', es: 'Usuario VIP' }],
    [/دور/g, { en: 'Round', ru: 'Раунд', es: 'Ronda' }],
    [/همین الان/g, { en: 'Just now', ru: 'Только что', es: 'Ahora mismo' }],
    [/بدون کارمزد/g, { en: 'Zero Fee', ru: 'Без комиссии', es: 'Sin comisión' }],
    [/خوشآمدگویی|خوش‌آمدگویی/g, { en: 'Welcome', ru: 'Приветственный', es: 'Bienvenida' }],
    [/ماهانه/g, { en: 'Monthly', ru: 'Ежемесячный', es: 'Mensual' }],
    [/طلایی/g, { en: 'Golden', ru: 'Золотой', es: 'Dorado' }],
    [/اصلی/g, { en: 'Main', ru: 'Основной', es: 'Principal' }],
    [/گوی/g, { en: 'Ball', ru: 'Шар', es: 'Bola' }],
    [/طبقه/g, { en: 'Floor', ru: 'Этаж', es: 'Piso' }],
    [/مرجع/g, { en: 'Ref', ru: 'Реф', es: 'Ref' }],
    [/رایگان/g, { en: 'Free', ru: 'Бесплатно', es: 'Gratis' }],
  ];

  let cleaned = ascii;
  for (const [regex, map] of dictionary) {
    cleaned = cleaned.replace(regex, map[locale]);
  }
  cleaned = cleaned
    .replace(/[\u0600-\u06FF\u200C]+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || 'Verified PAM Transaction';
}

const KNOWN_LOCALE_CODES = new Set(['fa', 'en', 'ru', 'ar', 'es', 'FA', 'EN', 'RU', 'AR', 'ES']);

/**
 * Universal PAM Wallet Transaction Description Localizer.
 * Supports both `(description, meta, locale)` and `(locale, description, meta)` call signatures.
 * Ensures 100% of wallet ledger notes (Deposits, Withdrawals, Rollbacks, Ticket Purchases,
 * Regular Lottery Wins, Syndicate Pro-Rata Wins, Welcome $1,000 Wins, Monthly VIP Wins,
 * 3% Cashback Claims, 2% Referral Claims, and Mini-Game bets/wins) render in the active language (`fa`, `en`, `ru`, `ar`, `es`).
 */
export function localizeTransactionDescription(
  descriptionOrLang: string | Language | undefined,
  metaOrDescription?: Record<string, any> | string | null,
  maybeLocale?: Language | string
): string {
  let rawDescription = '';
  let meta: Record<string, any> | undefined;
  let targetLocaleRaw: Language | string | undefined = maybeLocale;

  if (maybeLocale !== undefined) {
    rawDescription = String(descriptionOrLang || '');
    meta = typeof metaOrDescription === 'object' && metaOrDescription ? metaOrDescription : undefined;
    targetLocaleRaw = maybeLocale;
  } else if (
    typeof metaOrDescription === 'string' &&
    KNOWN_LOCALE_CODES.has(metaOrDescription.trim()) &&
    !KNOWN_LOCALE_CODES.has(String(descriptionOrLang || '').trim())
  ) {
    rawDescription = String(descriptionOrLang || '');
    targetLocaleRaw = metaOrDescription;
  } else if (
    typeof descriptionOrLang === 'string' &&
    KNOWN_LOCALE_CODES.has(descriptionOrLang.trim()) &&
    typeof metaOrDescription === 'string'
  ) {
    targetLocaleRaw = descriptionOrLang;
    rawDescription = metaOrDescription;
  } else {
    rawDescription = String(descriptionOrLang || '');
    meta = typeof metaOrDescription === 'object' && metaOrDescription ? metaOrDescription : undefined;
    targetLocaleRaw = 'fa';
  }

  const locale = normalizeLocale(targetLocaleRaw);
  const raw = rawDescription.trim();
  if (!raw && !meta) return '';
  if (locale === 'fa') return raw;

  const text = normalizeAsciiDigits(raw);

  // 0. Structured Metadata Fast-Path (if meta.txCategory is provided)
  if (meta && typeof meta.txCategory === 'string') {
    const cat = meta.txCategory.toUpperCase();
    const roundCode = meta.roundCode || '#LDR-8493';
    const ticketCode = meta.ticketCode || '';
    const ticketCount = meta.ticketCount || 1;
    const gameName = meta.gameName || meta.gameId || 'Mini-Game';
    const syndicateId = meta.syndicateId || 'SYN';
    const tierLocalized = meta.tier ? localizeTierLabel(locale, String(meta.tier)) : '';

    if (cat === 'TICKET_PURCHASE') {
      if (locale === 'en') return `Lottery Ticket Purchase (${ticketCount} slip(s) • Round ${roundCode})`;
      if (locale === 'ru') return `Покупка лотерейных билетов (${ticketCount} шт. • Раунд ${roundCode})`;
      if (locale === 'ar') return `شراء تذاكر يانصيب (${ticketCount} تذكرة • الجولة ${roundCode})`;
      if (locale === 'es') return `Compra de Boletos de Lotería (${ticketCount} boleto(s) • Ronda ${roundCode})`;
    }
    if (cat === 'LOTTERY_WIN') {
      if (locale === 'en') return `85% Prize Pool Win Payout for Slip ${ticketCode} (${tierLocalized}) in ${roundCode}`;
      if (locale === 'ru') return `Выплата выигрыша из 85% пула по билету ${ticketCode} (${tierLocalized}) в ${roundCode}`;
      if (locale === 'ar') return `تسوية جائزة الفوز من مجمع 85% للتذكرة ${ticketCode} (${tierLocalized}) في ${roundCode}`;
      if (locale === 'es') return `Pago de Premio del Pozo 85% para Boleto ${ticketCode} (${tierLocalized}) en ${roundCode}`;
    }
    if (cat === 'SYNDICATE_WIN') {
      if (locale === 'en') return `Syndicate Squad Pro-Rata Prize Share (#${syndicateId})`;
      if (locale === 'ru') return `Доля выигрыша группового синдиката (#${syndicateId})`;
      if (locale === 'ar') return `حصة الفوز في النقابة الجماعية (#${syndicateId})`;
      if (locale === 'es') return `Cuota de Premio Pro-Rata de Sindicato (#${syndicateId})`;
    }
    if (cat === 'WELCOME_WIN') {
      if (locale === 'en') return `🎉 $1,000 Welcome Grand Lottery Prize for Slip ${ticketCode} (${tierLocalized})`;
      if (locale === 'ru') return `🎉 Приз Приветственной лотереи $1,000 по билету ${ticketCode} (${tierLocalized})`;
      if (locale === 'ar') return `🎉 جائزة يانصيب الترحيب 1,000$ للتذكرة ${ticketCode} (${tierLocalized})`;
      if (locale === 'es') return `🎉 Premio Gran Sorteo de Bienvenida $1,000 para Boleto ${ticketCode} (${tierLocalized})`;
    }
    if (cat === 'MONTHLY_VIP_WIN') {
      if (locale === 'en') return `👑 Monthly VIP Super-Jackpot Prize for Slip ${ticketCode} (${tierLocalized})`;
      if (locale === 'ru') return `👑 Приз Ежемесячного VIP Супер-Джекпота по билету ${ticketCode} (${tierLocalized})`;
      if (locale === 'ar') return `👑 جائزة السحب الشهري الكبير VIP للتذكرة ${ticketCode} (${tierLocalized})`;
      if (locale === 'es') return `👑 Premio Súper Jackpot Mensual VIP para Boleto ${ticketCode} (${tierLocalized})`;
    }
    if (cat === 'CASHBACK_CLAIM') {
      if (locale === 'en') return `Instant 3% VIP Cashback & Rakeback Vault Claim`;
      if (locale === 'ru') return `Мгновенный вывод 3% VIP кэшбэка и рейкбека`;
      if (locale === 'ar') return `سحب فوري لخزنة الاسترداد النقدي VIP 3%`;
      if (locale === 'es') return `Retiro Instantáneo de Bóveda de Cashback VIP 3%`;
    }
    if (cat === 'REFERRAL_CLAIM') {
      if (locale === 'en') return `Instant 2% Referral Commission Claim to Main Wallet (Zero Fee)`;
      if (locale === 'ru') return `Мгновенный вывод 2% реферальной комиссии на кошелек (Без комиссии)`;
      if (locale === 'ar') return `سحب فوري لعمولة الإحالة 2% إلى المحفظة (بدون رسوم)`;
      if (locale === 'es') return `Retiro Instantáneo de Comisión de Referidos 2% (Sin comisión)`;
    }
    if (cat === 'MINIGAME_BET') {
      if (locale === 'en') return `Instant Mini-Game Wager • ${gameName} (${roundCode})`;
      if (locale === 'ru') return `Ставка в мини-игре • ${gameName} (${roundCode})`;
      if (locale === 'ar') return `رهان لعبة فورية • ${gameName} (${roundCode})`;
      if (locale === 'es') return `Apuesta en Mini-Juego • ${gameName} (${roundCode})`;
    }
    if (cat === 'MINIGAME_WIN') {
      const mult = meta.multiplier ? `${meta.multiplier}x` : '';
      if (locale === 'en') return `Instant Mini-Game Win Payout • ${gameName} ${mult} (${roundCode})`.trim();
      if (locale === 'ru') return `Выигрыш в мини-игре • ${gameName} ${mult} (${roundCode})`.trim();
      if (locale === 'ar') return `ربح لعبة فورية • ${gameName} ${mult} (${roundCode})`.trim();
      if (locale === 'es') return `Premio de Mini-Juego • ${gameName} ${mult} (${roundCode})`.trim();
    }
  }

  // 1. Regular Lottery Draw Win Payout:
  // "تسویه راس تایم استخر ۸۵٪ برای کوپن TKT-123 (رتبه ششم (۳ گوی اصلی)) در دور #LDR-8493"
  if (text.includes('تسویه راس تایم استخر') || (text.includes('برای کوپن') && text.includes('در دور'))) {
    const ticketMatch = text.match(/برای کوپن\s+([A-Za-z0-9_-]+)/);
    const roundMatch = text.match(/در دور\s+(#[A-Za-z0-9_-]+)/);
    const tierMatch = text.match(/برای کوپن\s+[A-Za-z0-9_-]+\s*\((.+)\)\s*در دور/);
    const ticketCode = ticketMatch ? ticketMatch[1] : 'SLIP';
    const roundCode = roundMatch ? roundMatch[1] : '#LDR';
    const tierLocalized = tierMatch ? localizeTierLabel(locale, tierMatch[1]) : localizeTierLabel(locale, 'جایزه');
    if (locale === 'en') return `85% Prize Pool Win Payout for Slip ${ticketCode} (${tierLocalized}) in Round ${roundCode}`;
    if (locale === 'ru') return `Выплата выигрыша (85% пул) по билету ${ticketCode} (${tierLocalized}) в раунде ${roundCode}`;
    if (locale === 'ar') return `تسوية جائزة الفوز من مجمع 85% للتذكرة ${ticketCode} (${tierLocalized}) في الجولة ${roundCode}`;
    if (locale === 'es') return `Pago de Premio (Pozo 85%) para Boleto ${ticketCode} (${tierLocalized}) en Ronda ${roundCode}`;
  }

  // 1B. Generic Lottery Win / Prize Claim:
  if (
    text.includes('جایزه برنده لاتاری') ||
    text.includes('برد قرعه‌کشی') ||
    text.includes('تسویه جایزه کوپن برنده')
  ) {
    const ticketMatch = text.match(/([A-Z]{2,5}-[0-9A-Za-z-]+)/);
    const roundMatch = text.match(/(#[A-Za-z0-9_-]+)/);
    const codeStr = ticketMatch ? ` ${ticketMatch[1]}` : roundMatch ? ` ${roundMatch[1]}` : '';
    if (locale === 'en') return `Lottery Prize Payout${codeStr} Credited to Wallet`;
    if (locale === 'ru') return `Выплата выигрыша лотереи${codeStr} на кошелек`;
    if (locale === 'ar') return `إيداع جائزة الفوز في اليانصيب${codeStr} في المحفظة`;
    if (locale === 'es') return `Premio de Lotería${codeStr} Acreditado en Billetera`;
  }

  // 2. Syndicate Pro-Rata Win:
  if (text.includes('سهم برنده سندیکای گروهی') || (text.includes('سهم برنده') && text.includes('سندیکا'))) {
    const synMatch = text.match(/\((#[A-Za-z0-9_-]+)\)/) || text.match(/(#[A-Za-z0-9_-]+)/);
    const synId = synMatch ? synMatch[1] : '#SYNDICATE';
    if (locale === 'en') return `Syndicate Squad Pro-Rata Prize Share (${synId})`;
    if (locale === 'ru') return `Пропорциональная доля выигрыша синдиката (${synId})`;
    if (locale === 'ar') return `حصة الفوز النسبية في النقابة الجماعية (${synId})`;
    if (locale === 'es') return `Cuota de Premio Pro-Rata del Sindicato (${synId})`;
  }

  // 3. Welcome $1,000 Grand Lottery Win:
  if (text.includes('جایزه لاتاری ویژه خوشآمدگویی') || (text.includes('خوشآمدگویی') && text.includes('جایزه'))) {
    const ticketMatch = text.match(/برای بلیت\s+([A-Za-z0-9_-]+)/);
    const tierMatch = text.match(/برای بلیت\s+[A-Za-z0-9_-]+\s*\((.+)\)$/);
    const ticketCode = ticketMatch ? ticketMatch[1] : '#LD-WELCOME-1000';
    const tierLocalized = tierMatch ? ` (${localizeTierLabel(locale, tierMatch[1])})` : '';
    if (locale === 'en') return `🎉 $1,000 Welcome Grand Lottery Prize for Slip ${ticketCode}${tierLocalized}`;
    if (locale === 'ru') return `🎉 Приз Приветственной лотереи $1,000 по билету ${ticketCode}${tierLocalized}`;
    if (locale === 'ar') return `🎉 جائزة يانصيب الترحيب 1,000$ للتذكرة ${ticketCode}${tierLocalized}`;
    if (locale === 'es') return `🎉 Premio Sorteo de Bienvenida $1,000 para Boleto ${ticketCode}${tierLocalized}`;
  }

  // 4. Monthly VIP Super-Jackpot Win:
  if (text.includes('جایزه جک‌پات مطلق ماهانه VIP') || (text.includes('ماهانه VIP') && text.includes('جایزه'))) {
    const ticketMatch = text.match(/برای بلیت\s+([A-Za-z0-9_-]+)/);
    const ticketCode = ticketMatch ? ticketMatch[1] : '#LD-MONTHLY-VIP';
    if (locale === 'en') return `👑 Monthly VIP Super-Jackpot Prize for Slip ${ticketCode} (Tier-1 6-Ball Match)`;
    if (locale === 'ru') return `👑 Приз Ежемесячного VIP Супер-Джекпота по билету ${ticketCode} (6 из 6 шаров)`;
    if (locale === 'ar') return `👑 جائزة السحب الشهري الكبير VIP للتذكرة ${ticketCode} (تطابق 6 كرات)`;
    if (locale === 'es') return `👑 Premio Súper Jackpot Mensual VIP para Boleto ${ticketCode} (6 Bolas Exactas)`;
  }

  // 5. Syndicate Share Purchase:
  if (text.includes('سهم در سندیکای گروهی') || (text.includes('خرید') && text.includes('سندیکا'))) {
    const sharesMatch = text.match(/خرید\s+(\d+)\s+سهم/);
    const synIdMatch = text.match(/\((#[A-Za-z0-9_-]+)\)/);
    const roundMatch = text.match(/برای دور\s+(#[A-Za-z0-9_-]+)/);
    const shares = sharesMatch ? sharesMatch[1] : '1';
    const synId = synIdMatch ? synIdMatch[1] : '#SYN';
    const roundCode = roundMatch ? roundMatch[1] : '#LDR-8493';
    if (locale === 'en') return `Purchased ${shares} Share(s) in Syndicate Squad (${synId}) for Round ${roundCode}`;
    if (locale === 'ru') return `Покупка ${shares} долей в групповом синдикате (${synId}) для раунда ${roundCode}`;
    if (locale === 'ar') return `شراء ${shares} حصة في النقابة الجماعية (${synId}) للجولة ${roundCode}`;
    if (locale === 'es') return `Compra de ${shares} Acción(es) en Sindicato Grupal (${synId}) para Ronda ${roundCode}`;
  }

  // 6. Regular Lottery Ticket Purchase:
  if (text.includes('خرید') && (text.includes('بلیت') || text.includes('کوپن'))) {
    const countMatch = text.match(/خرید\s+(\d+)\s+(?:بلیت|کوپن)/);
    const roundMatch = text.match(/در دور\s+(#[A-Za-z0-9_-]+)/) || text.match(/(#[A-Za-z0-9_-]+)/);
    const amtMatch = text.match(/\(([0-9.,]+\s*(?:TON|⭐\s*Stars|Stars|⭐))/i);
    const count = countMatch ? countMatch[1] : '1';
    const roundCode = roundMatch ? ` in ${roundMatch[1]}` : '';
    const amtInfo = amtMatch ? ` (${amtMatch[1]} • 85% Prize Pool)` : ' (85% Prize Pool)';
    if (locale === 'en') return `Lottery Ticket Purchase (${count} slip(s))${roundCode}${amtInfo}`;
    if (locale === 'ru') return `Покупка лотерейных билетов (${count} шт.)${roundCode}${amtInfo.replace('Prize Pool', 'в призовой пул')}`;
    if (locale === 'ar') return `شراء تذاكر يانصيب (${count} تذكرة)${roundCode}${amtInfo.replace('Prize Pool', 'مجمع الجوائز')}`;
    if (locale === 'es') return `Compra de Boletos de Lotería (${count} boleto(s))${roundCode}${amtInfo.replace('Prize Pool', 'al Pozo')}`;
  }

  // 7. 3% Cashback & 1.5% Rakeback Vault Claim:
  if (
    text.includes('کشبک') ||
    text.includes('کش‌بک') ||
    text.includes('ریکبک') ||
    text.includes('ریک‌بک')
  ) {
    const parenMatch = text.match(/\(([^)]+)\)/);
    const amtSuffix = parenMatch ? ` (${parenMatch[1]})` : '';
    const icon = text.startsWith('⭐') ? '⭐ ' : '💎 ';
    if (locale === 'en') return `${icon}Instant VIP Cashback & Rakeback Vault Claim to Wallet${amtSuffix}`;
    if (locale === 'ru') return `${icon}Мгновенный вывод VIP кэшбэка и рейкбека на кошелек${amtSuffix}`;
    if (locale === 'ar') return `${icon}سحب فوري لخزنة الاسترداد النقدي VIP إلى المحفظة${amtSuffix}`;
    if (locale === 'es') return `${icon}Retiro Instantáneo de Bóveda Cashback VIP a Billetera${amtSuffix}`;
  }

  // 8. 2% Referral Commission Claim:
  if (
    text.includes('پورسانت دعوت') ||
    text.includes('پورسانت زیرمجموعه') ||
    text.includes('پورسانت رفرال') ||
    text.includes('برداشت پورسانت')
  ) {
    const amtMatch = text.match(/([0-9.,]+\s*(?:TON|⭐\s*Stars|Stars|⭐))/i);
    const amtStr = amtMatch ? ` (${amtMatch[1]} • Zero Fee)` : ' (Zero Fee)';
    if (locale === 'en') return `Instant Referral Commission Claim to Wallet${amtStr}`;
    if (locale === 'ru') return `Мгновенный вывод реферальной комиссии на кошелек${amtStr.replace('Zero Fee', 'Без комиссии')}`;
    if (locale === 'ar') return `سحب فوري لعمولة الإحالة إلى المحفظة${amtStr.replace('Zero Fee', 'بدون رسوم')}`;
    if (locale === 'es') return `Retiro Instantáneo de Comisión de Referidos a Billetera${amtStr.replace('Zero Fee', 'Sin comisión')}`;
  }

  // 9. Mini-Game Bet / Session Start:
  if (text.includes('شرط بازی آنی') || text.includes('شروع نشست بازی')) {
    const isSession = text.includes('شروع نشست بازی');
    const match = text.match(/(?:شرط بازی آنی|شروع نشست بازی)\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)/);
    if (match) {
      const gameId = match[1];
      const details = match[2];
      if (locale === 'en') return `${isSession ? 'Game Session Start' : 'Instant Game Wager'} • ${gameId} (${details})`;
      if (locale === 'ru') return `${isSession ? 'Старт игровой сессии' : 'Ставка в быстрой игре'} • ${gameId} (${details})`;
      if (locale === 'ar') return `${isSession ? 'بدء جلسة لعبة' : 'رهان لعبة فورية'} • ${gameId} (${details})`;
      if (locale === 'es') return `${isSession ? 'Inicio de Sesión de Juego' : 'Apuesta en Juego Instantáneo'} • ${gameId} (${details})`;
    }
  }

  // 10. Mini-Game Win / Cashout:
  if (text.includes('تسویه ضریب')) {
    const match = text.match(/تسویه ضریب\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)(?:\s*—\s*مرجع:\s*([A-Za-z0-9_-]+))?/);
    if (match) {
      const gameId = match[1];
      const details = match[2];
      const ref = match[3] ? ` — Ref: ${match[3]}` : '';
      if (locale === 'en') return `Multiplier Win Payout • ${gameId} (${details})${ref}`;
      if (locale === 'ru') return `Выплата по множителю • ${gameId} (${details})${ref.replace('Ref:', 'Реф:')}`;
      if (locale === 'ar') return `تسوية مضاعف الفوز • ${gameId} (${details})${ref.replace('Ref:', 'مرجع:')}`;
      if (locale === 'es') return `Pago de Multiplicador • ${gameId} (${details})${ref}`;
    }
  }

  if (text.includes('برد کامل Mines') || text.includes('برداشت موفق Mines')) {
    const isFull = text.includes('برد کامل');
    const parenMatch = text.match(/\(([^)]+)\)/);
    const details = parenMatch ? ` (${parenMatch[1]})` : '';
    if (locale === 'en') return `${isFull ? 'Mines Full Board Clear Win' : 'Mines Successful Cashout'}${details}`;
    if (locale === 'ru') return `${isFull ? 'Полная победа в Mines' : 'Успешный кэшаут в Mines'}${details}`;
    if (locale === 'ar') return `${isFull ? 'فوز كامل في Mines' : 'سحب أرباح ناجح في Mines'}${details}`;
    if (locale === 'es') return `${isFull ? 'Victoria Total en Mines' : 'Retiro Exitoso en Mines'}${details}`;
  }

  if (text.includes('Tower 3D')) {
    const isFull = text.includes('فتح کامل');
    const parenMatch = text.match(/\(([^)]+)\)/);
    const details = parenMatch
      ? ` (${parenMatch[1].replace('طبقه', locale === 'ru' ? 'Этаж' : locale === 'ar' ? 'طابق' : locale === 'es' ? 'Piso' : 'Floor')})`
      : '';
    if (locale === 'en') return `${isFull ? 'Tower 3D Full Summit Clear' : 'Tower 3D Cashout Win'}${details}`;
    if (locale === 'ru') return `${isFull ? 'Покорение вершины Tower 3D' : 'Успешный кэшаут Tower 3D'}${details}`;
    if (locale === 'ar') return `${isFull ? 'إتمام برج الكريستال Tower 3D' : 'سحب أرباح Tower 3D'}${details}`;
    if (locale === 'es') return `${isFull ? 'Cima Completa en Tower 3D' : 'Retiro Exitoso en Tower 3D'}${details}`;
  }

  // 11. Deposits (TON On-Chain & Stars & Admin Approved):
  if (
    text.includes('شارژ آنی تاییدشده بلاکچین TON') ||
    text.includes('واریز آن‌چین تاییدشده TON') ||
    text.includes('تایید حواله واریز')
  ) {
    const parenMatch = text.match(/\(([^)]+)\)/);
    const details = parenMatch ? ` (${parenMatch[1]})` : '';
    if (locale === 'en') return `Verified On-Chain TON Deposit${details}`;
    if (locale === 'ru') return `Подтвержденный ончейн-депозит TON${details}`;
    if (locale === 'ar') return `إيداع TON موثق عبر البلوكتشين${details}`;
    if (locale === 'es') return `Depósito TON On-Chain Verificado${details}`;
  }
  if (text.includes('شارژ خودکار') && text.includes('Stars')) {
    const starsMatch = text.match(/(\d+)\s*⭐/);
    const parenMatch = text.match(/\(([^)]+)\)/);
    const starsCount = starsMatch ? starsMatch[1] : '';
    const code = parenMatch ? ` (${parenMatch[1]})` : '';
    if (locale === 'en') return `Instant Telegram Stars Deposit (${starsCount} ⭐)${code}`;
    if (locale === 'ru') return `Мгновенное пополнение Telegram Stars (${starsCount} ⭐)${code}`;
    if (locale === 'ar') return `شحن فوري لنجوم تلغرام (${starsCount} ⭐)${code}`;
    if (locale === 'es') return `Recarga Instantánea de Telegram Stars (${starsCount} ⭐)${code}`;
  }

  // 12. Withdrawals & Rollbacks:
  if (text.includes('برگشت وجه درخواست برداشت') || text.includes('برگشت وجه برداشت ردشده')) {
    const codeMatch = text.match(/\(([^)]+)\)/);
    const code = codeMatch ? ` (${codeMatch[1]})` : '';
    if (locale === 'en') return `Atomic Refund Rollback for Rejected Withdrawal${code}`;
    if (locale === 'ru') return `Атомарный возврат средств по отклоненной заявке на вывод${code}`;
    if (locale === 'ar') return `استرداد تلقائي لطلب السحب المرفوض${code}`;
    if (locale === 'es') return `Reembolso Atómico por Retiro Rechazado${code}`;
  }
  if (text.includes('برداشت اتوماتیک آنی شبکه TON') || text.includes('برداشت مبلغ بالا')) {
    const isPending = text.includes('در انتظار تایید ادمین');
    const matches = [...text.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
    const info = matches.length > 0 ? ` (${matches.join(' • ')})` : '';
    if (locale === 'en') {
      return isPending
        ? `High-Value TON Withdrawal — Pending Security Review${info}`
        : `Instant On-Chain TON Withdrawal${info}`;
    }
    if (locale === 'ru') {
      return isPending
        ? `Крупный вывод TON — На проверке безопасности${info}`
        : `Мгновенный ончейн-вывод TON${info}`;
    }
    if (locale === 'ar') {
      return isPending
        ? `سحب TON بمبلغ كبير — قيد مراجعة الأمان${info}`
        : `سحب فوري عبر شبكة TON${info}`;
    }
    if (locale === 'es') {
      return isPending
        ? `Retiro TON de Alto Valor — En Revisión de Seguridad${info}`
        : `Retiro TON On-Chain Instantáneo${info}`;
    }
  }
  if (text.includes('برداشت آنی ستاره تلگرام')) {
    const starsMatch = text.match(/([0-9,]+\s*⭐)/);
    const destMatch = text.match(/به مقصد\s+([^\s)]+)/);
    const wdMatch = text.match(/\((WDS?-[^)]+)\)/);
    const detail = `${starsMatch ? starsMatch[1] : 'Stars'}${destMatch ? ` -> ${destMatch[1]}` : ''}${wdMatch ? ` • ${wdMatch[1]}` : ''}`;
    if (locale === 'en') return `Instant Telegram Stars Withdrawal (${detail})`;
    if (locale === 'ru') return `Мгновенный вывод Telegram Stars (${detail})`;
    if (locale === 'ar') return `سحب فوري لنجوم تلغرام (${detail})`;
    if (locale === 'es') return `Retiro Instantáneo de Telegram Stars (${detail})`;
  }

  // 13. Loyalty Chest & Welcome Bonus & Admin Adjustments:
  if (text.includes('پاداش صندوقچه وفاداری طلایی')) {
    if (locale === 'en') return 'Golden VIP Loyalty Chest Reward (3% Rollover Reserve)';
    if (locale === 'ru') return 'Награда Золотого VIP сундука лояльности (3% резерв)';
    if (locale === 'ar') return 'مكافأة صندوق الولاء الذهبي VIP (احتياطي 3%)';
    if (locale === 'es') return 'Premio Cofre de Lealtad Dorado VIP (Reserva 3%)';
  }
  if (text.includes('پاداش خوش‌آمدگویی') || text.includes('موجودی اولیه')) {
    if (locale === 'en') return 'Welcome Bonus & Initial TMA Balance';
    if (locale === 'ru') return 'Приветственный бонус и начальный баланс TMA';
    if (locale === 'ar') return 'مكافأة الترحيب والرصيد الابتدائي';
    if (locale === 'es') return 'Bono de Bienvenida y Saldo Inicial TMA';
  }
  if (text.startsWith('ADMIN_ADJUSTMENT')) {
    const cleaned = text.replace(/توسط ادمین/g, 'by Admin');
    return stripResidualPersianForNonRtl(locale, cleaned);
  }

  return stripResidualPersianForNonRtl(locale, text);
}

/**
 * Localizes dynamic server-generated Persian strings (round titles, quest names, user defaults, syndicate names,
 * PAM ledger notes, prize tier labels, draw winner summaries, and API messages/errors)
 * into the active language so non-Persian users never see raw Persian strings.
 */
export function localizeServerText(
  lang: Language | string | undefined,
  rawText: string,
  meta?: Record<string, any>
): string {
  const locale = normalizeLocale(lang);
  const raw = String(rawText || '').trim();
  if (!raw || locale === 'fa') return raw;

  const text = normalizeAsciiDigits(raw);

  // 1. Default preview & server user names
  if (
    text === 'کاربر' ||
    text === 'کاربر VIP' ||
    text === 'کاربر تلگرام' ||
    text === 'کاربر خوش‌شانس LuckyDrop' ||
    text === 'کاربر وفادار VIP' ||
    text === 'کاربر برنده LuckyDrop' ||
    /^کاربر\s*#?\d+$/.test(text)
  ) {
    const numMatch = text.match(/#?(\d+)/);
    const suffix = numMatch ? ` #${numMatch[1]}` : '';
    if (locale === 'en') return `VIP Member${suffix}`;
    if (locale === 'ru') return `VIP Игрок${suffix}`;
    if (locale === 'ar') return `عضو VIP${suffix}`;
    if (locale === 'es') return `Miembro VIP${suffix}`;
  }

  if (text === 'همین الان' || text.startsWith('همین الان')) {
    if (locale === 'en') return 'Just now';
    if (locale === 'ru') return 'Только что';
    if (locale === 'ar') return 'الآن';
    if (locale === 'es') return 'Ahora mismo';
  }

  // 2. Official Brand Title
  if (text.includes('لاتاری و بازی‌های آنی اثبات‌پذیر بلاکچین TON') || text.includes('لاتاری بلاکچینی')) {
    if (locale === 'en') return 'LuckyDrop Official • Provably Fair TON Blockchain Lottery & Games';
    if (locale === 'ru') return 'LuckyDrop Official • Честная лотерея и игры в блокчейне TON';
    if (locale === 'ar') return 'LuckyDrop Official • يانصيب وألعاب بلوكتشين TON العادلة';
    if (locale === 'es') return 'LuckyDrop Official • Lotería y Juegos Provably Fair en TON';
  }

  // 3. Round titles (including Monthly VIP & Welcome $1,000)
  if (text.includes('ابر جک‌پات ماهانه وفاداری') || text.includes('Monthly VIP Super-Jackpot')) {
    if (locale === 'en') return '👑 Monthly VIP Super-Jackpot Vault';
    if (locale === 'ru') return '👑 Ежемесячный VIP Супер-Джекпот';
    if (locale === 'ar') return '👑 خزنة الجائزة الشهرية الكبرى VIP';
    if (locale === 'es') return '👑 Bóveda Súper Jackpot Mensual VIP';
  }
  if (text.includes('لاتاری ویژه خوشآمدگویی') || text.includes('Welcome $1,000 Grand Draw')) {
    if (locale === 'en') return '🎉 Welcome $1,000 Grand Lottery';
    if (locale === 'ru') return '🎉 Приветственный Гранд-розыгрыш $1,000';
    if (locale === 'ar') return '🎉 يانصيب الترحيب الكبير 1,000$';
    if (locale === 'es') return '🎉 Gran Sorteo de Bienvenida $1,000';
  }
  if (
    text.includes('مگا جک‌پات هفتگی') ||
    text.includes('جک‌پات بزرگ TON') ||
    text.includes('استخر قرعه‌کشی TON') ||
    text.includes('قرعه‌کشی ویژه TON')
  ) {
    const codeMatch = text.match(/#[A-Z0-9-]+/);
    const code = codeMatch ? ` ${codeMatch[0]}` : '';
    if (locale === 'en') return `TON Mega Jackpot${code}`;
    if (locale === 'ru') return `Мега Джекпот TON${code}`;
    if (locale === 'ar') return `جاكبوت TON الكبير${code}`;
    if (locale === 'es') return `Mega Jackpot TON${code}`;
  }
  if (
    text.includes('قرعه‌کشی روزانه بلیتز') ||
    text.includes('بلیتز روزانه TON') ||
    text.includes('BLZ')
  ) {
    if (locale === 'en') return 'Daily Blitz Draw';
    if (locale === 'ru') return 'Ежедневный Блиц-тираж';
    if (locale === 'ar') return 'السحب اليومي السريع';
    if (locale === 'es') return 'Sorteo Diario Blitz';
  }
  if (text.includes('فلش ساعتی') || text.includes('FLS')) {
    if (locale === 'en') return 'Hourly Flash Pool';
    if (locale === 'ru') return 'Почасовой Флэш-пул';
    if (locale === 'ar') return 'سحب الفلاش الساعي';
    if (locale === 'es') return 'Sorteo Flash por Hora';
  }
  if (text.includes('استخر ویژه نهنگ‌های TON')) {
    if (locale === 'en') return 'TON Whales Special Pool';
    if (locale === 'ru') return 'Спец-пул Китов TON';
    if (locale === 'ar') return 'مجمع حيتان TON الخاص';
    if (locale === 'es') return 'Pozo Especial Ballenas TON';
  }

  // 4. Syndicate Squad Names
  if (text.includes('نهنگ‌های طلایی TON')) {
    if (locale === 'en') return 'Golden TON Whales';
    if (locale === 'ru') return 'Золотые Киты TON';
    if (locale === 'ar') return 'حيتان TON الذهبية';
    if (locale === 'es') return 'Ballenas Doradas TON';
  }
  if (text.includes('سندیکای الماس') || text.includes('اسکواد')) {
    if (locale === 'en') return 'Diamond VIP Syndicate';
    if (locale === 'ru') return 'Алмазный VIP Синдикат';
    if (locale === 'ar') return 'نقابة الماس VIP';
    if (locale === 'es') return 'Sindicato Diamante VIP';
  }

  // 5. Growth Quests
  if (text.includes('عضویت در کانال رسمی')) {
    return tr(lang, raw, 'Join Official LuckyDrop Telegram Channel');
  }
  if (text.includes('اولین مشارکت در سندیکای گروهی')) {
    return tr(lang, raw, 'First Syndicate Squad Share');
  }
  if (text.includes('سفیر فعال')) {
    return tr(lang, raw, 'Active Ambassador (Invite 1 Active Buyer)');
  }
  if (text.includes('لیدر VIP')) {
    return tr(lang, raw, 'VIP Referral Leader (Invite 5 Active Buyers)');
  }

  // 6. Draw Winner Summaries (`lastWinnerSummary`)
  if (text.includes('بدون برنده جک‌پات 6 گوی') || text.includes('به ماه بعد منتقل شد')) {
    const tonMatch = text.match(/([0-9.,]+\s*TON)/);
    const tonStr = tonMatch ? tonMatch[1] : 'Pool';
    if (locale === 'en') return `No 6-Ball Jackpot Winner (All-or-Nothing) — 100% of Pool (${tonStr}) Rolled Over to Next Month!`;
    if (locale === 'ru') return `Нет победителя 6 шаров (All-or-Nothing) — 100% пула (${tonStr}) перенесено на следующий месяц!`;
    if (locale === 'ar') return `لا يوجد فائز بـ 6 كرات (الكل أو لا شيء) — تم ترحيل 100% من المجمع (${tonStr}) للشهر القادم!`;
    if (locale === 'es') return `Sin ganador de 6 bolas (Todo o Nada) — ¡El 100% del pozo (${tonStr}) pasa al próximo mes!`;
  }
  if (text.includes('برنده جک‌پات مطلق 6 گوی VIP')) {
    const winMatch = text.match(/(\d+)\s*برنده/);
    const tonMatch = text.match(/([0-9.,]+\s*TON)/);
    const cnt = winMatch ? winMatch[1] : '1';
    const tonStr = tonMatch ? tonMatch[1] : '';
    if (locale === 'en') return `👑 ${cnt} Tier-1 Monthly VIP Jackpot Winner(s) (${tonStr} Paid Out)`;
    if (locale === 'ru') return `👑 ${cnt} победителей Ежемесячного VIP Джекпота (выплачено ${tonStr})`;
    if (locale === 'ar') return `👑 ${cnt} فائز بالجاكبوت الشهري VIP (تم دفع ${tonStr})`;
    if (locale === 'es') return `👑 ${cnt} Ganador(es) del Jackpot Mensual VIP (${tonStr} Pagados)`;
  }
  if (text.includes('برنده لاتاری خوشآمدگویی')) {
    const winMatch = text.match(/(\d+)\s*برنده/);
    const tonMatch = text.match(/([0-9.,]+\s*TON)/);
    const cnt = winMatch ? winMatch[1] : '1';
    const tonStr = tonMatch ? tonMatch[1] : '';
    if (locale === 'en') return `🎉 ${cnt} Welcome $1,000 Lottery Winner(s) (${tonStr} Paid Out)`;
    if (locale === 'ru') return `🎉 ${cnt} победителей Приветственной лотереи $1,000 (выплачено ${tonStr})`;
    if (locale === 'ar') return `🎉 ${cnt} فائز في يانصيب الترحيب 1,000$ (تم دفع ${tonStr})`;
    if (locale === 'es') return `🎉 ${cnt} Ganador(es) del Sorteo de Bienvenida $1,000 (${tonStr} Pagados)`;
  }
  if (text.includes('قرعه‌کشی انجام شد — بدون برنده جک‌پات')) {
    const tonMatch = text.match(/([0-9.,]+\s*TON)/);
    const tonStr = tonMatch ? tonMatch[1] : '0 TON';
    if (locale === 'en') return `Draw Completed — No Jackpot Winner (${tonStr} Remaining Reserve)`;
    if (locale === 'ru') return `Розыгрыш завершен — Без джекпота (Остаток резерва: ${tonStr})`;
    if (locale === 'ar') return `اكتمل السحب — بدون فائز بالجاكبوت (الاحتياطي المتبقي: ${tonStr})`;
    if (locale === 'es') return `Sorteo Completado — Sin Ganador de Jackpot (${tonStr} Reserva Restante)`;
  }

  // 7. Server API Toasts, Messages & Errors
  if (text.includes('پاداش کشبک و ریکبک شما') || text.includes('به کیف پول اصلی شما منتقل شد')) {
    if (locale === 'en') return '🎉 Your VIP Cashback & Rakeback reward has been credited to your main wallet!';
    if (locale === 'ru') return '🎉 Ваш VIP кэшбэк и рейкбек успешно зачислены на основной кошелек!';
    if (locale === 'ar') return '🎉 تمت إضافة مكافأة الاسترداد النقدي VIP إلى محفظتك الرئيسية بنجاح!';
    if (locale === 'es') return '🎉 ¡Tu recompensa de Cashback y Rakeback VIP se acreditó en tu billetera!';
  }
  if (text.includes('پورسانت دعوت دوستان') && text.includes('به کیف پول اصلی شما واریز شد')) {
    const parenMatch = text.match(/\(([^)]+)\)/);
    const amt = parenMatch ? ` (${parenMatch[1]})` : '';
    if (locale === 'en') return `💎 Referral Commission${amt} credited to your main wallet (Zero Fee)!`;
    if (locale === 'ru') return `💎 Реферальная комиссия${amt} зачислена на ваш основной кошелек!`;
    if (locale === 'ar') return `💎 تم إيداع عمولة الإحالة${amt} في محفظتك الرئيسية بنجاح!`;
    if (locale === 'es') return `💎 ¡Comisión de referidos${amt} acreditada en tu billetera principal!`;
  }
  if (text.includes('بلیت رایگان لاتاری') && text.includes('خوشآمدگویی') && text.includes('ثبت شد')) {
    const codeMatch = text.match(/\(([A-Za-z0-9_-]+)\)/);
    const code = codeMatch ? ` (${codeMatch[1]})` : '';
    if (locale === 'en') return `🎉 Your Free $1,000 Welcome Lottery Ticket${code} has been minted!`;
    if (locale === 'ru') return `🎉 Ваш бесплатный билет Приветственной лотереи $1,000${code} успешно выпущен!`;
    if (locale === 'ar') return `🎉 تم إصدار تذكرتك المجانية ليانصيب الترحيب 1,000$${code} بنجاح!`;
    if (locale === 'es') return `🎉 ¡Tu boleto gratis del Sorteo de Bienvenida de $1,000${code} ha sido emitido!`;
  }
  if (text.includes('سندیکای گروهی') && text.includes('ساخته شد')) {
    if (locale === 'en') return '🤝 Syndicate Squad created and official lottery tickets minted!';
    if (locale === 'ru') return '🤝 Групповой синдикат создан, официальные билеты выпущены!';
    if (locale === 'ar') return '🤝 تم إنشاء النقابة الجماعية وإصدار التذاكر الرسمية بنجاح!';
    if (locale === 'es') return '🤝 ¡Sindicato grupal creado y boletos oficiales emitidos!';
  }
  if (text.includes('سهم در سندیکای گروهی') && text.includes('خریداری کردید')) {
    if (locale === 'en') return '⚡ Syndicate Squad shares purchased and official tickets minted!';
    if (locale === 'ru') return '⚡ Доли в синдикате успешно куплены, билеты выпущены!';
    if (locale === 'ar') return '⚡ تم شراء حصص النقابة وإصدار التذاكر الرسمية بنجاح!';
    if (locale === 'es') return '⚡ ¡Acciones del sindicato compradas y boletos emitidos!';
  }
  if (text.includes('مأموریت تکمیل شد')) {
    const xpMatch = text.match(/\+(\d+)\s*XP/);
    const xp = xpMatch ? `+${xpMatch[1]} XP` : '+XP';
    if (locale === 'en') return `🎉 Quest Completed! ${xp} credited to your VIP account!`;
    if (locale === 'ru') return `🎉 Задание выполнено! ${xp} начислено на ваш VIP-аккаунт!`;
    if (locale === 'ar') return `🎉 اكتملت المهمة! تمت إضافة ${xp} إلى حسابك VIP!`;
    if (locale === 'es') return `🎉 ¡Misión completada! ¡${xp} acreditados en tu cuenta VIP!`;
  }
  if (text.includes('موجودی') && text.includes('کافی نیست')) {
    if (locale === 'en') return '⚠️ Insufficient wallet balance for this transaction.';
    if (locale === 'ru') return '⚠️ Недостаточно средств на балансе кошелька.';
    if (locale === 'ar') return '⚠️ رصيد المحفظة غير كافٍ لإتمام هذه العملية.';
    if (locale === 'es') return '⚠️ Saldo de billetera insuficiente para esta operación.';
  }

  // 8. Check if it's a prize tier label
  if (
    text.includes('رتبه ') ||
    text.includes('رده ') ||
    text.includes('جک‌پات الماس') ||
    text.includes('بدون تطابق') ||
    text.includes('جایزه گوی طلایی')
  ) {
    return localizeTierLabel(locale, raw);
  }

  // 9. Delegate to universal PAM transaction description localizer
  return localizeTransactionDescription(raw, meta, locale);
}

export function detectInitialLanguage(): LanguageCodeUpper {
  if (typeof window === 'undefined') return 'FA';
  try {
    const saved = window.localStorage.getItem('luckydrop_lang');
    if (saved) {
      return normalizeLanguageUpper(saved);
    }
    const tgLang = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (typeof tgLang === 'string' && tgLang.trim()) {
      return normalizeLanguageUpper(tgLang);
    }
  } catch {
    // ignore storage errors
  }
  return 'FA';
}

export function persistLanguageSelection(lang: Language | string): void {
  const locale = normalizeLocale(lang);
  const rtl = isRtlLocale(locale);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('luckydrop_lang', locale);
    } catch {
      // ignore
    }
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }
}
