import en from './translations/en.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de';

export const languages: Language[] = ['en', 'es', 'pt', 'fr', 'de'];

export const translations = {
  en,
  es,
  pt,
  fr,
  de,
};

export function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0];
  return languages.includes(browserLang as Language) ? browserLang as Language : 'en';
}

export function getTranslation(key: string, lang: Language = 'en'): string {
  const keys = key.split('.');
  let current: any = translations[lang];

  for (const k of keys) {
    if (current[k] === undefined) {
      // Fallback to English if translation is missing
      current = translations['en'];
      for (const k of keys) {
        if (current[k] === undefined) return key;
        current = current[k];
      }
      return current;
    }
    current = current[k];
  }

  return current;
}

export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: string) => getTranslation(key, lang),
  };
} 