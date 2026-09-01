'use client'

import { motion } from 'framer-motion'
import { Play, User, Book, Store, Users, Image, LogIn, UserPlus, Crown } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useTelegram } from '../hooks/useTelegram'
import { useWalletStore } from '../store/walletStore'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LanguageSwitcher, { useLanguage } from './LanguageSwitcher'
import { useTranslations } from '../lib/i18n/translations'
import OnlineIndicator from './OnlineIndicator'
import CardDealerHero from './CardDealerHero'
import { GRAM } from '@/lib/crypto/gram-brand'
import { CRYPTO_TOKENS } from '@/lib/crypto/crypto-assets'
import CryptoIcon from './CryptoIcon'
import { getApiHeaders } from '@/lib/api-headers'
import { parseJsonResponse } from '@/lib/api/parse-json-response'
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

const tokens = [
  { name: GRAM.name, symbol: GRAM.symbol, color: GRAM.color, icon: CRYPTO_TOKENS.GRAM.icon },
  { name: 'SOLANA', symbol: 'SOL', color: CRYPTO_TOKENS.SOL.color, icon: CRYPTO_TOKENS.SOL.icon },
  { name: 'ETHEREUM', symbol: 'ETH', color: CRYPTO_TOKENS.ETH.color, icon: CRYPTO_TOKENS.ETH.icon },
]

interface MainMenuProps {
  user?: any
  onLogout?: () => void
}

export default function MainMenu({ user, onLogout }: MainMenuProps) {
  const { stats } = useGameStore()
  const { hapticFeedback } = useTelegram()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuThemeId, setMenuThemeId] = useState<MenuThemeId>(DEFAULT_MENU_THEME)
  const { language } = useLanguage()
  const t = useTranslations(language)
  const { 
    tonAddress, tonBalance, isTonConnected,
    solanaAddress, solanaBalance, isSolanaConnected,
    ethereumAddress, ethereumBalance, isEthereumConnected,
    connectTonWallet, connectSolanaWallet, connectEthereumWallet,
    disconnectTonWallet, disconnectSolanaWallet, disconnectEthereumWallet
  } = useWalletStore()

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

  const handleWalletAction = async (type: 'ton' | 'solana' | 'ethereum', fromBurger = false) => {
    hapticFeedback('medium')
    
    // Закрываем бургер меню если действие из него
    if (fromBurger) {
      setMenuOpen(false)
    }
    
    try {
      switch (type) {
        case 'ton':
          if (isTonConnected) {
            disconnectTonWallet()
          } else {
            await connectTonWallet()
          }
          break
        case 'solana':
          if (isSolanaConnected) {
            disconnectSolanaWallet()
          } else {
            await connectSolanaWallet()
          }
          break
        case 'ethereum':
          if (isEthereumConnected) {
            disconnectEthereumWallet()
          } else {
            await connectEthereumWallet()
          }
          break
      }
    } catch (error: unknown) {
      console.error('Wallet connection error:', error)
    }
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
        paddingTop: '80px',
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
          top: '76px',
          left: '20px',
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
          top: '76px',
          right: '20px',
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

        {/* Компактные кошельки */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: '40px',
            background: 'var(--menu-card-bg)',
            border: '2px solid var(--menu-wallet-border)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: 'var(--menu-shadow)'
          }}
        >
          <div style={{
            color: 'var(--menu-text-muted)',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {language === 'en' ? 'WALLET' : 'КОШЕЛЕК'}
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                hapticFeedback('medium');
                // Открываем Telegram Wallet через deep link
                const tgWebApp = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
                if (tgWebApp) {
                  // Используем Telegram WebApp API для открытия кошелька
                  tgWebApp.openTelegramLink('https://t.me/wallet');
                } else {
                  // Fallback для браузера
                  window.open('https://t.me/wallet', '_blank');
                }
              }}
              style={{
                flex: 1,
                minWidth: '80px',
                background: isTonConnected 
                  ? 'linear-gradient(135deg, #0088ff 0%, #0066cc 100%)' 
                  : 'rgba(0, 136, 255, 0.2)',
                border: '2px solid rgba(0, 136, 255, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CryptoIcon src={CRYPTO_TOKENS.GRAM.icon} size={28} alt={GRAM.symbol} />
              <div style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: '600' 
              }}>
                {isTonConnected ? `✓ ${GRAM.symbol}` : GRAM.symbol}
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWalletAction('solana')}
              style={{
                flex: 1,
                minWidth: '80px',
                background: isSolanaConnected 
                  ? 'linear-gradient(135deg, #9945ff 0%, #7733cc 100%)' 
                  : 'rgba(153, 69, 255, 0.2)',
                border: '2px solid rgba(153, 69, 255, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CryptoIcon src={CRYPTO_TOKENS.SOL.icon} size={28} alt="SOL" />
              <div style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: '600' 
              }}>
                {isSolanaConnected ? '✓ SOL' : 'SOL'}
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWalletAction('ethereum')}
              style={{
                flex: 1,
                minWidth: '80px',
                background: isEthereumConnected 
                  ? 'linear-gradient(135deg, #627eea 0%, #4a5ecc 100%)' 
                  : 'rgba(98, 126, 234, 0.2)',
                border: '2px solid rgba(98, 126, 234, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CryptoIcon src={CRYPTO_TOKENS.ETH.icon} size={28} alt="ETH" />
              <div style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: '600' 
              }}>
                {isEthereumConnected ? '✓ ETH' : 'ETH'}
              </div>
            </motion.button>

          </div>
        </motion.div>
      </div>
    </div>
  )
}
