'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Globe2, Languages } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const languages = useMemo(() => ([
    { code: 'ru' as Language, name: 'Русский', short: 'RU', flag: '🇷🇺', mode: 'native' as const },
    { code: 'en' as Language, name: 'English', short: 'EN', flag: '🇺🇸', mode: 'native' as const },
  ]), []);

  const translateTargets = [
    { code: 'de', name: 'Deutsch', short: 'DE', flag: '🇩🇪' },
    { code: 'es', name: 'Español', short: 'ES', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', short: 'FR', flag: '🇫🇷' },
  ];

  const currentLang = languages.find((lang) => lang.code === currentLanguage) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyPageLanguage = (language: Language) => {
    const root = document.documentElement;
    root.lang = language;
    root.setAttribute('translate', 'yes');
    root.setAttribute('data-ui-language', language);
    document.body?.setAttribute('translate', 'yes');
  };

  const handleNativeLanguageChange = (language: Language) => {
    onLanguageChange(language);
    localStorage.setItem('pidr_language', language);
    applyPageLanguage(language);
    setIsOpen(false);
  };

  const openBrowserTranslator = (targetLanguage: string) => {
    const sourceLanguage = currentLanguage === 'ru' ? 'ru' : 'en';
    const currentUrl = window.location.href;
    const translateUrl = `https://translate.google.com/translate?sl=${sourceLanguage}&tl=${targetLanguage}&u=${encodeURIComponent(currentUrl)}`;
    window.open(translateUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-4 py-2.5 text-white shadow-[0_8px_30px_rgba(15,23,42,0.55)] backdrop-blur-md transition-all duration-200 hover:border-cyan-300/60 hover:bg-slate-800/95 active:scale-95"
        aria-label="Выбор языка"
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
          <Globe2 size={16} />
        </div>
        <div className="text-left leading-tight">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{currentLang.flag}</span>
            <span>{currentLang.name}</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Interface
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[1200] w-[280px] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_20px_50px_rgba(2,6,23,0.75)] backdrop-blur-xl">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Languages size={16} className="text-cyan-300" />
              Основные языки
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Русский и English встроены в интерфейс.
            </p>
          </div>

          <div className="p-2">
            {languages.map((language) => {
              const isActive = currentLanguage === language.code;

              return (
                <button
                  key={language.code}
                  onClick={() => handleNativeLanguageChange(language.code)}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-400/30'
                      : 'text-slate-200 hover:bg-slate-800/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{language.flag}</span>
                    <div>
                      <div className="text-sm font-semibold">{language.name}</div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        {language.short}
                      </div>
                    </div>
                  </div>
                  {isActive && <span className="text-xs font-semibold text-cyan-300">ACTIVE</span>}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Через переводчик страницы
            </div>
            <div className="grid grid-cols-1 gap-2">
              {translateTargets.map((language) => (
                <button
                  key={language.code}
                  onClick={() => openBrowserTranslator(language.code)}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3 text-left text-slate-200 transition-all hover:border-cyan-400/30 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{language.flag}</span>
                    <div>
                      <div className="text-sm font-semibold">{language.name}</div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {language.short}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    Translate
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
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
      setLanguage(browserLanguage.startsWith('ru') ? 'ru' : 'en');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.lang = language;
    document.documentElement.setAttribute('translate', 'yes');
    document.documentElement.setAttribute('data-ui-language', language);
    document.body?.setAttribute('translate', 'yes');
  }, [language]);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('pidr_language', newLanguage);
  };

  return { language, changeLanguage };
}
