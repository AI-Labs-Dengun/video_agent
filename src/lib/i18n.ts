import pt from './translations/pt.json';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

export type Language = 'pt' | 'en' | 'es' | 'fr' | 'de';

export const translations = {
  pt,
  en,
  es,
  fr,
  de,
};

export const languageNames: Record<Language, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language.split('-')[0];
  return ['pt', 'en', 'es', 'fr', 'de'].includes(browserLang) ? browserLang as Language : 'en';
};

export const useTranslation = (language: Language) => {
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
}; 