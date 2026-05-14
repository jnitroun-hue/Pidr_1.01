'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Globe2, Languages, Sparkles } from 'lucide-react';
import { Language } from '../lib/i18n/translations';

const LANGUAGE_COOKIE_KEY = 'pidr_language';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null;
}

function writeCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ru';
  const saved = readCookie(LANGUAGE_COOKIE_KEY) as Language | null;
  if (saved === 'ru' || saved === 'en') return saved;
  const browserLanguage = navigator.language.toLowerCase();
  return browserLanguage.startsWith('ru') ? 'ru' : 'en';
}

type LanguageContextValue = {
  language: Language;
  changeLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => readInitialLanguage());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.setAttribute('translate', 'yes');
    document.documentElement.setAttribute('data-ui-language', language);
    document.body?.setAttribute('translate', 'yes');
  }, [language]);

  const changeLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    writeCookie(LANGUAGE_COOKIE_KEY, newLanguage);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLanguage;
      document.documentElement.setAttribute('data-ui-language', newLanguage);
    }
  }, []);

  const value = useMemo(
    () => ({ language, changeLanguage }),
    [language, changeLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language: currentLanguage, changeLanguage: onLanguageChange } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const languages = useMemo(
    () => [
      { code: 'ru' as Language, name: 'Русский', short: 'RU', flag: '🇷🇺', mode: 'native' as const },
      { code: 'en' as Language, name: 'English', short: 'EN', flag: '🇺🇸', mode: 'native' as const },
    ],
    []
  );

  const translateTargets = [
    { code: 'de', name: 'Deutsch', short: 'DE', flag: '🇩🇪' },
    { code: 'es', name: 'Español', short: 'ES', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', short: 'FR', flag: '🇫🇷' },
  ];

  const currentLang = languages.find((lang) => lang.code === currentLanguage) || languages[0];
  const ui =
    currentLanguage === 'en'
      ? {
          aria: 'Language selection',
          uiLang: 'Interface language',
          title: 'Language selection',
          hint: '`RU` and `EN` are built-in. Others open via translator.',
        }
      : {
          aria: 'Выбор языка',
          uiLang: 'Язык интерфейса',
          title: 'Выбор языка',
          hint: '`RU` и `EN` встроены. Остальные открываются через переводчик.',
        };

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateMobileState();
    window.addEventListener('resize', updateMobileState);

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateMobileState);
    };
  }, []);

  const applyPageLanguage = (lang: Language) => {
    const root = document.documentElement;
    root.lang = lang;
    root.setAttribute('translate', 'yes');
    root.setAttribute('data-ui-language', lang);
    document.body?.setAttribute('translate', 'yes');
  };

  const handleNativeLanguageChange = (lang: Language) => {
    onLanguageChange(lang);
    applyPageLanguage(lang);
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
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          minWidth: isMobile ? '150px' : '190px',
          borderRadius: isMobile ? '12px' : '14px',
          border: '1px solid rgba(129, 140, 248, 0.45)',
          background: 'rgba(2, 6, 23, 0.9)',
          color: '#f8fafc',
          padding: isMobile ? '8px 10px' : '10px 12px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 24px rgba(2, 6, 23, 0.45)',
          cursor: 'pointer'
        }}
        aria-label={ui.aria}
        aria-expanded={isOpen}
      >
        <div
          style={{
            width: isMobile ? '28px' : '34px',
            height: isMobile ? '28px' : '34px',
            borderRadius: isMobile ? '8px' : '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,211,238,0.2))',
            color: '#bae6fd'
          }}
        >
          <Globe2 size={isMobile ? 15 : 17} />
        </div>
        <div style={{ minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600
            }}
          >
            <span>{currentLang.flag}</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentLang.name}
            </span>
          </div>
          <div
            style={{
              marginTop: '2px',
              fontSize: isMobile ? '9px' : '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#94a3b8'
            }}
          >
            {ui.uiLang}
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: '#cbd5e1'
          }}
        >
          <ChevronDown size={16} />
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 'calc(100% + 10px)',
            zIndex: 1200,
            width: isMobile ? '240px' : '280px',
            borderRadius: isMobile ? '12px' : '14px',
            overflow: 'hidden',
            border: '1px solid rgba(51, 65, 85, 0.9)',
            background: 'rgba(2, 6, 23, 0.96)',
            boxShadow: '0 20px 46px rgba(2, 6, 23, 0.75)',
            backdropFilter: 'blur(14px)'
          }}
        >
          <div
            style={{
              borderBottom: '1px solid rgba(30, 41, 59, 0.9)',
              padding: '12px 14px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              <Languages size={16} color="#a5b4fc" />
              {ui.title}
            </div>
            <p style={{ marginTop: '6px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.35 }}>
              {ui.hint}
            </p>
          </div>

          <div style={{ padding: '8px' }}>
            {languages.map((language) => {
              const isActive = currentLanguage === language.code;

              return (
                <button
                  type="button"
                  key={language.code}
                  onClick={() => handleNativeLanguageChange(language.code)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: '10px',
                    border: isActive ? '1px solid rgba(129, 140, 248, 0.45)' : '1px solid transparent',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.24), rgba(6,182,212,0.16))'
                      : 'transparent',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    color: '#e2e8f0',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{language.flag}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{language.name}</div>
                      <div
                        style={{
                          fontSize: '11px',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: '#94a3b8'
                        }}
                      >
                        {language.short}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        borderRadius: '8px',
                        background: 'rgba(129, 140, 248, 0.2)',
                        color: '#c7d2fe',
                        fontSize: '10px',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        padding: '4px 8px'
                      }}
                    >
                      {currentLanguage === 'en' ? 'Active' : 'Активно'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(30, 41, 59, 0.9)',
              padding: '12px'
            }}
          >
            <div
              style={{
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase'
              }}
            >
              <Sparkles size={12} color="#fcd34d" />
              {currentLanguage === 'en' ? 'Translate page' : 'Перевести страницу'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '8px'
              }}
            >
              {translateTargets.map((language) => (
                <button
                  type="button"
                  key={language.code}
                  onClick={() => openBrowserTranslator(language.code)}
                  style={{
                    borderRadius: '10px',
                    border: '1px solid rgba(51, 65, 85, 0.85)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#e2e8f0',
                    textAlign: 'center',
                    padding: '10px 6px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{language.flag}</span>
                  <span style={{ marginTop: '4px', display: 'block', fontSize: '12px', fontWeight: 700 }}>{language.short}</span>
                  <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>{language.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
