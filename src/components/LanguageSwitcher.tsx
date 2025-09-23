'use client';

import { useState, useEffect } from 'react';
import { Language } from '../lib/i18n/translations';

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  className?: string;
}

export default function LanguageSwitcher({ 
  currentLanguage, 
  onLanguageChange, 
  className = '' 
}: LanguageSwitcherProps) {
  const languages = [
    { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageToggle = () => {
    // Переключаем между русским и английским
    const newLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    onLanguageChange(newLanguage);
    
    // Сохраняем выбранный язык в localStorage
    localStorage.setItem('pidr_language', newLanguage);
  };

  return (
    <button
      onClick={handleLanguageToggle}
      className={`flex items-center gap-2 px-3 py-2 bg-green-800/90 hover:bg-green-700/90 
                 rounded-lg border border-green-600/50 transition-all duration-200
                 backdrop-blur-sm text-white hover:border-green-400/70 shadow-lg
                 hover:shadow-green-500/20 active:scale-95 ${className}`}
    >
      <span className="text-lg">{currentLang.flag}</span>
      <span className="text-sm font-medium">{currentLang.code.toUpperCase()}</span>
    </button>
  );
}

// Хук для управления языком
export function useLanguage() {
  const [language, setLanguage] = useState<Language>('ru');

  useEffect(() => {
    // Загружаем сохраненный язык из localStorage
    const savedLanguage = localStorage.getItem('pidr_language') as Language;
    if (savedLanguage && ['ru', 'en'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    } else {
      // Определяем язык по браузеру
      const browserLanguage = navigator.language.toLowerCase();
      if (browserLanguage.startsWith('ru')) {
        setLanguage('ru');
      } else {
        setLanguage('en');
      }
    }
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('pidr_language', newLanguage);
  };

  return { language, changeLanguage };
}
