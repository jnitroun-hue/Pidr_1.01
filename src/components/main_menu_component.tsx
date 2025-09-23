'use client'

import { motion } from 'framer-motion'
import { Play, User, Book, Store, Users } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useTelegram } from '../hooks/useTelegram'
import { useWalletStore } from '../store/walletStore'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import LanguageSwitcher, { useLanguage } from './LanguageSwitcher'
import { useTranslations } from '../lib/i18n/translations'

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

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Верхний бар */}
        <div className="menu-header" style={{ position: 'relative' }}>
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            {t.common.back}
          </button>
          <span className="menu-title">{t.mainMenu.title}</span>
          <LanguageSwitcher 
            currentLanguage={language}
            onLanguageChange={changeLanguage}
            className="ml-2"
          />
        </div>
        
        {/* Быстрые действия */}
        <div className="menu-actions-title">
          {language === 'ru' ? 'БЫСТРЫЕ ДЕЙСТВИЯ' : 'QUICK ACTIONS'}
        </div>
        <div className="menu-actions-grid">
          <button 
         onClick={() => {
           console.log('Кнопка ИГРАТЬ нажата');
           hapticFeedback('medium');
           try {
             // Сначала запускаем игру, потом переходим
             console.log('🎮 Запускаем игру перед переходом...');
             startGame('single', 9);
                
                // Небольшая задержка для инициализации
                setTimeout(() => {
                  router.push('/game');
                }, 100);
              } catch (error) {
                console.error('Ошибка запуска игры:', error);
                // Fallback - просто переходим на страницу
                router.push('/game');
              }
            }} 
            className="menu-action-card"
          >
            <Play className="menu-action-icon" />
            <span className="menu-action-label">{t.mainMenu.play.toUpperCase()}</span>
          </button>
          <button 
            onClick={() => {
              console.log('Кнопка ОНЛАЙН нажата');
              hapticFeedback('medium');
              try {
                router.push('/multiplayer');
              } catch (error) {
                console.error('Ошибка навигации к мультиплееру:', error);
                window.location.href = '/multiplayer';
              }
            }} 
            className="menu-action-card multiplayer-card"
          >
            <Users className="menu-action-icon" />
            <span className="menu-action-label">
              {language === 'ru' ? 'ОНЛАЙН' : 'ONLINE'}
            </span>
          </button>
          <button 
            onClick={() => {
              console.log('Кнопка МАГАЗИН нажата');
              hapticFeedback('medium');
              try {
                router.push('/shop');
              } catch (error) {
                console.error('Ошибка навигации к магазину:', error);
                window.location.href = '/shop';
              }
            }} 
            className="menu-action-card"
          >
            <Store className="menu-action-icon" />
            <span className="menu-action-label">МАГАЗИН</span>
          </button>
          <button 
            onClick={() => {
              console.log('Кнопка ПРОФИЛЬ нажата');
              hapticFeedback('medium');
              try {
                router.push('/profile');
              } catch (error) {
                console.error('Ошибка навигации к профилю:', error);
                window.location.href = '/profile';
              }
            }} 
            className="menu-action-card"
          >
            <User className="menu-action-icon" />
            <span className="menu-action-label">ПРОФИЛЬ</span>
          </button>
        </div>

        {/* Кнопка Правила игры */}
        <div className="rules-section">
          <button 
            onClick={() => {
              console.log('Кнопка ПРАВИЛА нажата');
              hapticFeedback('medium');
              try {
                router.push('/rules');
              } catch (error) {
                console.error('Ошибка навигации к правилам:', error);
                window.location.href = '/rules';
              }
            }} 
            className="rules-button"
          >
            <Book className="rules-icon" />
            <span className="rules-label">ПРАВИЛА ИГРЫ</span>
          </button>
        </div>

        {/* Компактные кошельки под основными кнопками */}
        <div className="wallet-connect-section-compact">
          <div className="wallet-connect-title-compact">КОШЕЛЕК</div>
          <div className="wallet-connect-grid-compact">
            <button 
              onClick={() => handleWalletAction('ton')} 
              className="wallet-connect-btn-compact ton-wallet-compact"
            >
              <div className="wallet-connect-icon-compact">💎</div>
              <div className="wallet-connect-label-compact">
                {isTonConnected ? '✓' : 'TON'}
              </div>
            </button>
            
            <button 
              onClick={() => handleWalletAction('solana')} 
              className="wallet-connect-btn-compact solana-wallet-compact"
            >
              <div className="wallet-connect-icon-compact">⚡</div>
              <div className="wallet-connect-label-compact">
                {isSolanaConnected ? '✓' : 'SOL'}
              </div>
            </button>
            
            <button 
              onClick={() => handleWalletAction('ethereum')} 
              className="wallet-connect-btn-compact ethereum-wallet-compact"
            >
              <div className="wallet-connect-icon-compact">🦄</div>
              <div className="wallet-connect-label-compact">
                {isEthereumConnected ? '✓' : 'ETH'}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
