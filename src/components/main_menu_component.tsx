'use client'

import { motion } from 'framer-motion'
import { Play, User, Book, Store, Users, Image, LogIn, UserPlus, Crown } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useTelegram } from '../hooks/useTelegram'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LanguageSwitcher, { useLanguage } from './LanguageSwitcher'
import { useTranslations } from '../lib/i18n/translations'
import OnlineIndicator from './OnlineIndicator'
import CardDealerHero from './CardDealerHero'
import { getApiHeaders } from '@/lib/api-headers'
import { parseJsonResponse } from '@/lib/api/parse-json-response'
import { deckEntriesToNftMap } from '@/lib/game/cardAssets'
import { readCachedNftDeck, warmupNftDeck, writeCachedNftDeck } from '@/lib/game/preload-card-assets'
import {
  DEFAULT_MENU_THEME,
  isMenuThemeId,
  type MenuThemeId,
} from '@/lib/ui/menuThemes'
import {
  menuThemeStyleVars,
  readStoredMenuTheme,
  storeMenuTheme,
} from '@/lib/ui/menu-theme-client'

interface MainMenuProps {
  user?: any
  onLogout?: () => void
}

export default function MainMenu({ user, onLogout }: MainMenuProps) {
  const { stats } = useGameStore()
  const { hapticFeedback } = useTelegram()
  const router = useRouter()
  const [menuThemeId, setMenuThemeId] = useState<MenuThemeId>(DEFAULT_MENU_THEME)
  const { language } = useLanguage()
  const t = useTranslations(language)

  useEffect(() => {
    setMenuThemeId(readStoredMenuTheme())
  }, [])

  useEffect(() => {
    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent<{ themeId?: string }>).detail
      if (isMenuThemeId(detail?.themeId)) {
        setMenuThemeId(detail.themeId)
        storeMenuTheme(detail.themeId)
      }
    }
    window.addEventListener('pidr-menu-theme', onTheme as EventListener)
    return () => window.removeEventListener('pidr-menu-theme', onTheme as EventListener)
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const loadTheme = async () => {
      try {
        const res = await fetch('/api/user/menu-theme', {
          credentials: 'include',
          headers: getApiHeaders(),
          cache: 'no-store',
        })
        const parsed = await parseJsonResponse<{ success?: boolean; themeId?: string }>(res)
        if (cancelled) return
        if (parsed.data?.success && isMenuThemeId(parsed.data.themeId)) {
          setMenuThemeId(parsed.data.themeId)
          storeMenuTheme(parsed.data.themeId)
        }
      } catch {
        /* keep cached theme */
      }
    }
    void loadTheme()
    return () => {
      cancelled = true
    }
  }, [user])

  // Прогрев NFT-колоды ещё в меню: к началу партии карты уже собраны и лежат в кеше.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const warm = async () => {
      const cached = readCachedNftDeck()
      if (cached && Object.keys(cached).length > 0) void warmupNftDeck(cached)
      try {
        const res = await fetch('/api/user/deck', {
          credentials: 'include',
          headers: getApiHeaders(),
          cache: 'no-store',
        })
        const parsed = await parseJsonResponse<{ success?: boolean; deck?: unknown[] }>(res)
        if (cancelled || !parsed.data?.success || !Array.isArray(parsed.data.deck)) return
        const map = deckEntriesToNftMap(parsed.data.deck as Parameters<typeof deckEntriesToNftMap>[0])
        writeCachedNftDeck(map)
        if (Object.keys(map).length > 0) void warmupNftDeck(map)
      } catch {
        /* колода подгрузится в игре */
      }
    }
    const timer = window.setTimeout(() => void warm(), 800)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [user])

  const themeVars = menuThemeStyleVars(menuThemeId)

  const navigateSafely = (path: string) => {
    if (typeof window === 'undefined') return

    const currentPath = window.location.pathname

    try {
      router.push(path)
    } catch (error) {
      console.error('Navigation error, using hard redirect:', error)
      window.location.assign(path)
      return
    }

    window.setTimeout(() => {
      if (window.location.pathname === currentPath) {
        window.location.assign(path)
      }
    }, 450)
  }

  // Проверяем, авторизован ли пользователь
  const isAuthenticated = !!user;

  const menuButtons = isAuthenticated ? [
    {
      icon: <Play size={32} />,
      emoji: '🎮',
      label: t.mainMenu.play,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/game');
      }
    },
    {
      icon: <Users size={32} />,
      emoji: '👥',
      label: t.mainMenu.online,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/multiplayer');
      }
    },
    {
      icon: <Store size={32} />,
      emoji: '🏪',
      label: t.mainMenu.shop,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/shop');
      }
    },
    {
      icon: <Crown size={32} />,
      emoji: '👑',
      label: t.mainMenu.premiumShop,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/shop/premium');
      }
    },
    {
      icon: <Image size={32} />,
      emoji: '🎴',
      label: t.mainMenu.nftCollection,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/nft-collection');
      }
    },
    {
      icon: <User size={32} />,
      emoji: '👤',
      label: t.mainMenu.profile,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/profile');
      }
    },
    {
      icon: <Book size={32} />,
      emoji: '📖',
      label: t.mainMenu.rules,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/rules');
      }
    }
  ] : [
    {
      icon: <LogIn size={32} />,
      emoji: '🔐',
      label: t.mainMenu.login,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/auth/login');
      }
    },
    {
      icon: <UserPlus size={32} />,
      emoji: '✨',
      label: t.mainMenu.register,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/auth/register');
      }
    },
    {
      icon: <Book size={32} />,
      emoji: '📖',
      label: t.mainMenu.rules,
      onClick: () => {
        hapticFeedback('medium');
        navigateSafely('/rules');
      }
    }
  ];

  return (
    <div
      className={`main-menu-root menu-theme-${menuThemeId}`}
      style={{
        ...themeVars,
        minHeight: '100vh',
        background: 'var(--menu-bg-accent), var(--menu-bg)',
        padding: '20px',
        paddingTop: 'calc(var(--app-chrome-top, 12px) + 56px)',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        transition: 'background 0.35s ease',
      }}
    >
      {/* Автоматическое обновление онлайн статуса — глобально в Providers */}
      
      {/* Выбор языка */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          position: 'fixed',
          top: 'calc(var(--app-chrome-top, 12px) + 8px)',
          left: 'max(16px, env(safe-area-inset-left, 0px))',
          zIndex: 1100,
          maxWidth: 'calc(100vw - 40px)'
        }}
      >
        <LanguageSwitcher />
      </motion.div>

      {/* Индикатор онлайн игроков - перемещен ниже бургер-меню */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          position: 'fixed',
          top: 'calc(var(--app-chrome-top, 12px) + 56px)',
          right: 'max(16px, env(safe-area-inset-right, 0px))',
          zIndex: 1090
        }}
      >
        <OnlineIndicator />
      </motion.div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Заголовок */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <CardDealerHero />
          <p style={{
            color: 'var(--menu-text-muted)',
            fontSize: '16px',
            marginTop: '4px'
          }}>
            {language === 'en' ? 'Choose an action' : 'Выберите действие'}
          </p>
        </motion.div>

        {/* Кнопки меню */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {menuButtons.map((button, index) => (
            <motion.button
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                button.onClick();
              }}
              style={{
                width: '100%',
                background: 'var(--menu-card-bg)',
                border: '2px solid var(--menu-card-border)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--menu-shadow)'
              }}
            >
              <div style={{
                fontSize: '32px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}>
                {button.emoji}
              </div>
              <h3 style={{
                color: 'var(--menu-text)',
                fontSize: '20px',
                fontWeight: '700',
                margin: 0,
                flex: 1,
                textAlign: 'left'
              }}>
                {button.label}
              </h3>
              <div style={{ color: 'var(--menu-accent)' }}>
                {button.icon}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
