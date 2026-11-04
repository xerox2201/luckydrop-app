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
 * Localizes dynamic server-generated Persian strings (round titles, quest names, user defaults, syndicate names, PAM notes)
 * into the active language so non-Persian users never see raw Persian strings.
 */
export function localizeServerText(lang: Language | string | undefined, rawText: string): string {
  const locale = normalizeLocale(lang);
  const text = String(rawText || '').trim();
  if (!text || locale === 'fa') return text;

  // Default preview user name
  if (text === 'کاربر' || text === 'کاربر VIP') {
    if (locale === 'en') return 'VIP Member';
    if (locale === 'ru') return 'VIP Игрок';
    if (locale === 'ar') return 'عضو VIP';
    if (locale === 'es') return 'Miembro VIP';
  }

  // Official Brand Title
  if (text.includes('لاتاری و بازی‌های آنی اثبات‌پذیر بلاکچین TON') || text.includes('لاتاری بلاکچینی')) {
    if (locale === 'en') return 'LuckyDrop Official • Provably Fair TON Blockchain Lottery & Games';
    if (locale === 'ru') return 'LuckyDrop Official • Честная лотерея и игры в блокчейне TON';
    if (locale === 'ar') return 'LuckyDrop Official • يانصيب وألعاب بلوكتشين TON العادلة';
    if (locale === 'es') return 'LuckyDrop Official • Lotería y Juegos Provably Fair en TON';
  }

  // Round titles (covering both MULTI_LOTTERY_SPECS and server DB titles)
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

  // Syndicate Squad Names
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

  // PAM Ledger notes
  if (text.includes('پاداش خوش‌آمدگویی') || text.includes('موجودی اولیه')) {
    if (locale === 'en') return 'Welcome Bonus & Initial TMA Balance';
    if (locale === 'ru') return 'Приветственный бонус и начальный баланс TMA';
    if (locale === 'ar') return 'مكافأة الترحيب والرصيد الابتدائي';
    if (locale === 'es') return 'Bono de Bienvenida y Saldo Inicial TMA';
  }
  if (text.includes('خرید') && text.includes('بلیت')) {
    if (locale === 'en') return 'Lottery Ticket Mint (85% Prize Pool)';
    if (locale === 'ru') return 'Покупка лотерейного билета (85% в пул)';
    if (locale === 'ar') return 'شراء تذكرة يانصيب (85% لمجمع الجوائز)';
    if (locale === 'es') return 'Compra de Boleto de Lotería (85% al Pozo)';
  }
  if (text.includes('کش‌بک') || text.includes('ریک‌بک')) {
    if (locale === 'en') return 'Instant VIP Cashback Vault Claim';
    if (locale === 'ru') return 'Вывод мгновенного VIP кэшбэка';
    if (locale === 'ar') return 'سحب الاسترداد النقدي الفوري VIP';
    if (locale === 'es') return 'Retiro de Bóveda de Reembolso VIP';
  }

  // Growth Quests
  if (text.includes('عضویت در کانال رسمی')) {
    return tr(lang, text, 'Join Official LuckyDrop Telegram Channel');
  }
  if (text.includes('اولین مشارکت در سندیکای گروهی')) {
    return tr(lang, text, 'First Syndicate Squad Share');
  }
  if (text.includes('سفیر فعال')) {
    return tr(lang, text, 'Active Ambassador (Invite 1 Active Buyer)');
  }
  if (text.includes('لیدر VIP')) {
    return tr(lang, text, 'VIP Referral Leader (Invite 5 Active Buyers)');
  }

  return text;
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
