'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NFTGallery from '../../components/NFTGallery'
import NFTThemeGenerator from '../../components/NFTThemeGenerator'
import { useTelegram } from '../../hooks/useTelegram'

export default function NFTCollectionPage() {
  const router = useRouter()
  const { hapticFeedback } = useTelegram()
  const [userCoins, setUserCoins] = useState<number>(0)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Загружаем данные пользователя
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user
        const telegramId = telegramUser?.id?.toString() || ''
        
        if (!telegramId) {
          console.warn('⚠️ Telegram ID не найден')
          setIsLoadingUser(false)
          return
        }

        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId,
            'x-username': telegramUser?.username || 'User'
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.user) {
            setUserCoins(result.user.coins || 0)
          }
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUserData()
  }, [])

  const handleBalanceUpdate = (newBalance: number) => {
    setUserCoins(newBalance)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px'
    }}>
      {/* Кнопка назад */}
      <button
        onClick={() => {
          hapticFeedback('medium')
          router.back()
        }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 100,
          background: 'rgba(30, 41, 59, 0.95)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '12px',
          padding: '10px 20px',
          color: '#f1f5f9',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)'
        }}
      >
        ← Назад
      </button>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Заголовок */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            🎴 NFT Коллекция
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '16px'
          }}>
            Ваши уникальные карты
          </p>
        </div>

        {/* NFT Галерея */}
        <NFTGallery />

        {/* NFT Генератор */}
        <div style={{
          marginTop: '40px',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            color: '#f1f5f9',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            🎨 Генератор NFT карт
          </h2>
          <NFTThemeGenerator 
            userCoins={userCoins} 
            onBalanceUpdate={handleBalanceUpdate}
          />
        </div>
      </div>
    </div>
  )
}

