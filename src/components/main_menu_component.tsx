'use client'

import { motion } from 'framer-motion'
import { Play, User, Book, Store, Users } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { useTelegram } from '../hooks/useTelegram'
import { useWalletStore } from '../store/walletStore'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">Назад</button>
          <span className="menu-title">P.I.D.R.</span>
          <div style={{ width: '60px' }}></div> {/* Placeholder для симметрии */}
        </div>
        
        {/* Быстрые действия */}
        <div className="menu-actions-title">БЫСТРЫЕ ДЕЙСТВИЯ</div>
        <div className="menu-actions-grid">
          <button onClick={() => router.push('/game')} className="menu-action-card">
            <Play className="menu-action-icon" />
            <span className="menu-action-label">ИГРАТЬ</span>
          </button>
          <button onClick={() => router.push('/multiplayer')} className="menu-action-card multiplayer-card">
            <Users className="menu-action-icon" />
            <span className="menu-action-label">ОНЛАЙН</span>
          </button>
          <button onClick={() => router.push('/shop')} className="menu-action-card">
            <Store className="menu-action-icon" />
            <span className="menu-action-label">МАГАЗИН</span>
          </button>
          <button onClick={() => router.push('/profile')} className="menu-action-card">
            <User className="menu-action-icon" />
            <span className="menu-action-label">ПРОФИЛЬ</span>
          </button>
        </div>

        {/* Кнопка Правила игры */}
        <div className="rules-section">
          <button onClick={() => router.push('/rules')} className="rules-button">
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
