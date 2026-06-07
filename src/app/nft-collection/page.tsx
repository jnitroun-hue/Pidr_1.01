'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import NFTGallery from '../../components/NFTGallery'
import NFTThemeGenerator from '../../components/NFTThemeGenerator'
import { useTelegram } from '../../hooks/useTelegram'
import { getApiHeaders } from '@/lib/api-headers'
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme'
import PageLoadingScreen from '@/components/PageLoadingScreen'

export default function NFTCollectionPage() {
  const router = useRouter()
  const { hapticFeedback } = useTelegram()
  const [userCoins, setUserCoins] = useState<number>(0)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Загружаем данные пользователя
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders(),
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

  if (isLoadingUser) {
    return (
      <PageLoadingScreen
        title="NFT коллекция"
        subtitle="Загрузка..."
      />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgMain} 40%, #0e1520 100%)`,
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
          background: T.bgElevated,
          border: `1px solid ${T.borderGold}`,
          borderRadius: T.radiusMd,
          padding: '10px 18px',
          color: T.text,
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = T.borderGoldStrong;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = T.borderGold;
        }}
      >
        ← Назад
      </button>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* ✅ NFT Генератор - ПЕРЕМЕЩЕН ВВЕРХ (вместо заголовка) */}
        <div style={{
          marginBottom: '30px',
          background: `linear-gradient(165deg, ${T.bgCard} 0%, ${T.bgDeep} 100%)`,
          border: `1px solid ${T.borderGold}`,
          borderRadius: T.radiusLg,
          padding: '20px',
          boxShadow: T.shadowCard,
        }}>
          <h2 style={{
            color: T.accentGold,
            fontSize: 'clamp(1rem, 4vw, 1.35rem)',
            fontWeight: 800,
            marginBottom: '16px',
            textAlign: 'center',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Генератор NFT
          </h2>
          <NFTThemeGenerator 
            userCoins={userCoins} 
            onBalanceUpdate={handleBalanceUpdate}
          />
        </div>

        {/* NFT Галерея */}
        <NFTGallery />
      </div>
    </div>
  )
}

