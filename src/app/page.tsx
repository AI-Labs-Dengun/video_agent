'use client'; // Required for hooks like useState, useEffect, useTheme

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // Import Link for navigation
import { useTheme } from 'next-themes'; // Import useTheme hook

// Icons (simple SVGs for demonstration)
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

// Renamed from SignIn to HomePage
const HomePage = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using theme to avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Define toggle button style separately as it's complex
  const toggleButtonStyle = `
    absolute top-4 right-4 p-2 rounded-lg transition-colors duration-300
    text-gray-600 dark:text-white
    bg-white/50 dark:bg-black/30
    hover:bg-white/70 dark:hover:bg-black/50
  `;

  if (!mounted) {
    // Render a placeholder or null to prevent hydration mismatch for the button
    // Use the classes directly here too for consistency
    return <div className="invisible flex items-center justify-center min-h-screen bg-gradient-to-br from-skin-gradient-start to-skin-gradient-end p-4 transition-colors duration-300" />;
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-skin-gradient-start to-skin-gradient-end p-4 transition-colors duration-300">
      <button
        onClick={toggleTheme}
        className={toggleButtonStyle} // Keep this as a variable for readability
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="bg-skin-card rounded-lg p-8 shadow-2xl w-full max-w-sm text-skin-primary transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-2 text-center">Bem-vindo de volta</h1>
        <p className="text-sm text-center text-skin-secondary mb-6 transition-colors duration-300">Iniciar sessão com o seu email</p>
        <form>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-skin-secondary mb-1 transition-colors duration-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="john@example.com"
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 bg-skin-input border border-skin-input-border text-skin-input-text placeholder:text-skin-placeholder focus:ring-purple-400 dark:focus:ring-indigo-500 transition-colors duration-300"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out bg-skin-button text-skin-button-text hover:opacity-90"
          >
            Iniciar Sessão
          </button>
        </form>
        {/* Apply classes directly, handle margin logic */}
        <p className="mt-6 text-center text-sm text-skin-secondary transition-colors duration-300">
          Não tem uma conta?{' '}
          <Link href="/sign-up" className="font-medium text-skin-link hover:underline transition-colors duration-300">
            Registe-se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default HomePage;
