import type { Language } from './lotteryEngine';

export function tr(lang: Language | undefined, fa: string, en: string): string {
  return lang === 'EN' ? en : fa;
}

export function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'FA';
  try {
    const saved = window.localStorage.getItem('luckydrop_lang');
    if (saved) {
      const upper = saved.toUpperCase();
      if (upper === 'EN' || upper === 'FA') {
        return upper as Language;
      }
    }
    const tgLang = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (typeof tgLang === 'string') {
      const lower = tgLang.toLowerCase();
      if (lower.startsWith('fa') || lower.startsWith('ir')) return 'FA';
      if (lower.startsWith('en')) return 'EN';
    }
  } catch {
    // ignore storage errors
  }
  return 'FA';
}

export function persistLanguageSelection(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('luckydrop_lang', lang.toLowerCase());
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    const isFa = lang !== 'EN';
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.documentElement.lang = isFa ? 'fa' : 'en';
  }
}
