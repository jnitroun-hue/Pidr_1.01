'use client'

import { motion } from 'framer-motion'
import { Play, User, Book, Store, Users, Image } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useTelegram } from '../hooks/useTelegram'
import { useWalletStore } from '../store/walletStore'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import LanguageSwitcher, { useLanguage } from './LanguageSwitcher'
import { useTranslations } from '../lib/i18n/translations'
import OnlineIndicator from './OnlineIndicator'
import OnlineHeartbeat from './OnlineHeartbeat'

const tokens = [
  { name: 'TON', symbol: 'TON', color: '#0088ff' },
  { name: 'SOLANA', symbol: 'SOL', color: '#9945ff' },
  { name: 'ETHEREUM', symbol: 'ETH', color: '#627eea' },
]

interface MainMenuProps {
  user?: any
  onLogout?: () => void
}

export default function MainMenu({ user, onLogout }: MainMenuProps) {
  const { startGame, stats } = useGameStore()
  const { hapticFeedback } = useTelegram()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const { language, changeLanguage } = useLanguage()
  const t = useTranslations(language)
  const { 
    tonAddress, tonBalance, isTonConnected,
    solanaAddress, solanaBalance, isSolanaConnected,
    ethereumAddress, ethereumBalance, isEthereumConnected,
    connectTonWallet, connectSolanaWallet, connectEthereumWallet,
    disconnectTonWallet, disconnectSolanaWallet, disconnectEthereumWallet
  } = useWalletStore()

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
    } catch (error) {
      console.error('Wallet connection error:', error)
    }
  }

  const menuButtons = [
    {
      icon: <Play size={32} />,
      emoji: '🎮',
      label: t.mainMenu.play,
      onClick: () => {
        hapticFeedback('medium');
        startGame('single', 7);
        setTimeout(() => router.push('/game'), 100);
      }
    },
    {
      icon: <Users size={32} />,
      emoji: '👥',
      label: t.mainMenu.online,
      onClick: () => {
        hapticFeedback('medium');
        router.push('/multiplayer');
      }
    },
    {
      icon: <Store size={32} />,
      emoji: '🏪',
      label: t.mainMenu.shop,
      onClick: () => {
        hapticFeedback('medium');
        router.push('/shop');
      }
    },
    {
      icon: <Image size={32} />,
      emoji: '🎴',
      label: 'NFT Коллекция',
      onClick: () => {
        hapticFeedback('medium');
        router.push('/nft-collection');
      }
    },
    {
      icon: <User size={32} />,
      emoji: '👤',
      label: t.mainMenu.profile,
      onClick: () => {
        hapticFeedback('medium');
        router.push('/profile');
      }
    },
    {
      icon: <Book size={32} />,
      emoji: '📖',
      label: t.mainMenu.rules,
      onClick: () => {
        hapticFeedback('medium');
        router.push('/rules');
      }
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px'
    }}>
      {/* Автоматическое обновление онлайн статуса */}
      <OnlineHeartbeat />
      
      {/* Выбор языка */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 100
        }}
      >
        <LanguageSwitcher 
          currentLanguage={language}
          onLanguageChange={changeLanguage}
        />
      </motion.div>

      {/* Индикатор онлайн игроков */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100
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
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              fontSize: '64px',
              marginBottom: '15px'
            }}
          >
            🎴
          </motion.div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            {t.mainMenu.title}
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '16px'
          }}>
            Выберите действие
          </p>
        </motion.div>

        {/* 5 кнопок вертикально */}
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
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{
                fontSize: '32px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}>
                {button.emoji}
              </div>
              <h3 style={{
                color: '#f1f5f9',
                fontSize: '20px',
                fontWeight: '700',
                margin: 0,
                flex: 1,
                textAlign: 'left'
              }}>
                {button.label}
              </h3>
              <div style={{ color: '#6366f1' }}>
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
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            КОШЕЛЕК
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWalletAction('ton')}
              style={{
                flex: 1,
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
              <div style={{ fontSize: '24px' }}>💎</div>
              <div style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: '600' 
              }}>
                {isTonConnected ? '✓ TON' : 'TON'}
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleWalletAction('solana')}
              style={{
                flex: 1,
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
              <div style={{ fontSize: '24px' }}>⚡</div>
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
              <div style={{ fontSize: '24px' }}>🦄</div>
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
