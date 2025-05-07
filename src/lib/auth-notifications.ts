import { showToast } from './toast';
import { useTranslation } from './i18n';
import type { Language } from './i18n';

// Mapeamento das mensagens de erro do Supabase para as chaves de tradução
const errorMessageMap: Record<string, string> = {
  'Invalid login credentials': 'auth.invalidCredentials',
  'Email not confirmed': 'auth.confirmEmailError',
  'User already registered': 'auth.userAlreadyRegistered',
  'Password should be at least 6 characters': 'auth.invalidPassword'
};

const getTranslatedErrorMessage = (errorMessage: string, language: Language): string => {
  const { t } = useTranslation(language);
  const translationKey = errorMessageMap[errorMessage];
  
  if (translationKey) {
    return t(translationKey);
  }
  
  // Se não encontrar uma tradução específica, retorna a mensagem padrão do idioma
  return t('auth.signInError');
};

export const showAuthNotification = {
  signInError: (language: Language, errorMessage?: string) => {
    const { t } = useTranslation(language);
    const message = errorMessage ? getTranslatedErrorMessage(errorMessage, language) : t('auth.signInError');
    return showToast.error(message);
  },

  signUpError: (language: Language, errorMessage?: string) => {
    const { t } = useTranslation(language);
    const message = errorMessage ? getTranslatedErrorMessage(errorMessage, language) : t('auth.signUpError');
    return showToast.error(message);
  },

  signInSuccess: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.success(t('auth.signInSuccess'));
  },

  signUpSuccess: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.success(t('auth.signUpSuccess'));
  },

  invalidEmail: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.error(t('auth.invalidEmail'));
  },

  invalidPassword: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.error(t('auth.invalidPassword'));
  },

  passwordsDontMatch: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.error(t('auth.passwordsDontMatch'));
  },

  confirmEmailError: (language: Language) => {
    const { t } = useTranslation(language);
    return showToast.error(t('auth.confirmEmailError'));
  }
};

export default showAuthNotification; 