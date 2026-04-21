'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Globe2, Languages, Sparkles } from 'lucide-react';
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
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => setIsOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: '190px',
          borderRadius: '14px',
          border: '1px solid rgba(129, 140, 248, 0.45)',
          background: 'rgba(2, 6, 23, 0.9)',
          color: '#f8fafc',
          padding: '10px 12px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 24px rgba(2, 6, 23, 0.45)',
          cursor: 'pointer'
        }}
        aria-label="Выбор языка"
        aria-expanded={isOpen}
      >
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(34,211,238,0.2))',
          color: '#bae6fd'
        }}>
          <Globe2 size={17} />
        </div>
        <div style={{ minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            <span>{currentLang.flag}</span>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{currentLang.name}</span>
          </div>
          <div style={{
            marginTop: '2px',
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#94a3b8'
          }}>
            Язык интерфейса
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: '#cbd5e1'
        }}>
          <ChevronDown size={16} />
        </div>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 'calc(100% + 10px)',
          zIndex: 1200,
          width: '280px',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(51, 65, 85, 0.9)',
          background: 'rgba(2, 6, 23, 0.96)',
          boxShadow: '0 20px 46px rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(14px)'
        }}>
          <div style={{
            borderBottom: '1px solid rgba(30, 41, 59, 0.9)',
            padding: '12px 14px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600
            }}>
              <Languages size={16} color="#a5b4fc" />
              Выбор языка
            </div>
            <p style={{ marginTop: '6px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.35 }}>
              `RU` и `EN` встроены. Остальные открываются через переводчик.
            </p>
          </div>

          <div style={{ padding: '8px' }}>
            {languages.map((language) => {
              const isActive = currentLanguage === language.code;

              return (
                <button
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
                      <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8' }}>
                        {language.short}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <span style={{
                      borderRadius: '8px',
                      background: 'rgba(129, 140, 248, 0.2)',
                      color: '#c7d2fe',
                      fontSize: '10px',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      padding: '4px 8px'
                    }}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            borderTop: '1px solid rgba(30, 41, 59, 0.9)',
            padding: '12px'
          }}>
            <div style={{
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase'
            }}>
              <Sparkles size={12} color="#fcd34d" />
              Перевести страницу
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px'
            }}>
              {translateTargets.map((language) => (
                <button
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
                  <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                    {language.name}
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
