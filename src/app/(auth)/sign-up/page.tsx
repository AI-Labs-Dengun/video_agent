"use client";
import React, { useState } from 'react';
import { useTheme } from "../../providers/ThemeProvider";
import { useSupabase } from "../../providers/SupabaseProvider";
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../lib/LanguageContext';
import { useTranslation } from '../../../lib/i18n';

export default function SignUp() {
  const { dark, toggleTheme } = useTheme();
  const { signUp } = useSupabase();
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await signUp(email, password, name, company);
      
      if (error) {
        setError(error.message || t('auth.signUpError'));
      } else {
        // Redirect to chat page on successful sign up
        router.push('/chat');
      }
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient relative">
      <div className="auth-card">
        <h1 className="text-3xl font-semibold mb-2 text-white">{t('auth.signUp')}</h1>
        <p className="mb-6 text-white/80">{t('auth.signUpWithGoogle')}</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-white/90 text-sm font-medium" htmlFor="name">{t('auth.name')}</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          
          <label className="text-white/90 text-sm font-medium" htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <label className="text-white/90 text-sm font-medium" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <label className="text-white/90 text-sm font-medium" htmlFor="company">{t('auth.company')}</label>
          <input
            id="company"
            type="text"
            placeholder={t('auth.companyPlaceholder')}
            className="auth-input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('auth.signUp')}
          </button>
        </form>
        
        <p className="mt-6 text-white/80 text-sm">
          {t('auth.haveAccount')}{' '}
          <a href="/sign-in" className="text-white underline font-medium hover:text-blue-200">{t('auth.signIn')}</a>
        </p>
      </div>
      
      <button
        className="absolute top-4 right-4 bg-white/40 rounded-full p-2 hover:bg-white/60 transition-colors"
        onClick={toggleTheme}
        aria-label={t('settings.darkMode')}
        type="button"
      >
        {dark ? (
          // Sun icon (for switching to light mode)
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l-1.414-1.414M6.05 6.05L4.636 4.636" />
            <circle cx="12" cy="12" r="5" fill="currentColor" />
          </svg>
        ) : (
          // Moon icon (for switching to dark mode)
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
          </svg>
        )}
      </button>
    </div>
  );
} 