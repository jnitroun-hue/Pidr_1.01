'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Gamepad2, Users, Info, BookOpen, Coins, Settings, Wallet, Trophy, Store, User, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  side: 'left' | 'right'
  user?: any
}

export default function BurgerMenu({ isOpen, onClose, side, user }: BurgerMenuProps) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadedUser, setLoadedUser] = useState<any>(user)

  // ✅ ИСПРАВЛЕНО: Загружаем данные пользователя из API если user не передан
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        setLoadedUser(user)
        return
      }

      try {
        console.log('👤 [BurgerMenu] Загружаем данные пользователя из API...')
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.user) {
            console.log('✅ [BurgerMenu] Данные пользователя загружены:', result.user.username)
            setLoadedUser({
              id: result.user.id,
              username: result.user.username,
              coins: result.user.coins || 0,
              photoUrl: result.user.avatar_url || ''
            })
          }
        }
      } catch (error) {
        console.warn('⚠️ [BurgerMenu] Не удалось загрузить данные пользователя:', error)
      }
    }

    loadUserData()
  }, [user])

  // Проверка прав администратора
  useEffect(() => {
    if (loadedUser?.id) {
      fetch('/api/admin/check', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.isAdmin) {
            setIsAdmin(true)
          }
        })
        .catch(() => {
          setIsAdmin(false)
        })
    }
  }, [loadedUser?.id])

  // Левое меню - навигация
  const leftMenuItems = [
    {
      icon: <Gamepad2 size={24} />,
      label: 'Игра',
      emoji: '🎮',
      onClick: () => {
        router.push('/game')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    {
      icon: <Users size={24} />,
      label: 'Сообщество',
      emoji: '👥',
      onClick: () => {
        router.push('/multiplayer')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    },
    {
      icon: <Info size={24} />,
      label: 'О игре',
      emoji: 'ℹ️',
      onClick: () => {
        router.push('/welcome')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: <BookOpen size={24} />,
      label: 'Правила',
      emoji: '📖',
      onClick: () => {
        router.push('/rules')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
    },
    {
      icon: <Coins size={24} />,
      label: 'Зарабатывай на NFT',
      emoji: '💰',
      onClick: () => {
        router.push('/nft-collection')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    }
  ]

  // Правое меню - профиль и настройки
  const rightMenuItems = loadedUser ? [
    {
      icon: <User size={24} />,
      label: 'Профиль',
      emoji: '👤',
      onClick: () => {
        router.push('/profile')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    },
    {
      icon: <Store size={24} />,
      label: 'Магазин',
      emoji: '🛒',
      onClick: () => {
        router.push('/shop')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    },
    {
      icon: <Trophy size={24} />,
      label: 'Рейтинг',
      emoji: '🏆',
      onClick: () => {
        router.push('/rating')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    {
      icon: <Wallet size={24} />,
      label: 'Кошелек',
      emoji: '💳',
      onClick: () => {
        router.push('/wallet')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: <Settings size={24} />,
      label: 'Настройки',
      emoji: '⚙️',
      onClick: () => {
        router.push('/settings')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
    },
    // Админ-панель (только для админов)
    ...(isAdmin ? [{
      icon: <Shield size={24} />,
      label: 'Админ Панель',
      emoji: '🔐',
      onClick: () => {
        router.push('/admin')
        onClose()
      },
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    }] : [])
  ] : []

  const menuItems = side === 'left' ? leftMenuItems : rightMenuItems

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 9998
            }}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: side === 'left' ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: side === 'left' ? -400 : 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              [side]: 0,
              bottom: 0,
              width: '320px',
              maxWidth: '85vw',
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              borderRight: side === 'left' ? '2px solid rgba(99, 102, 241, 0.3)' : 'none',
              borderLeft: side === 'right' ? '2px solid rgba(99, 102, 241, 0.3)' : 'none',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '900',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {side === 'left' ? 'Меню' : 'Профиль'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Menu Items */}
            <div style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1
            }}>
              {menuItems.length > 0 ? (
                menuItems.map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ x: side === 'left' ? -20 : 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: side === 'left' ? 5 : -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={item.onClick}
                    style={{
                      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
                      border: '2px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Gradient Background on Hover */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: item.gradient,
                        opacity: 0.1,
                        zIndex: 0
                      }}
                    />
                    
                    {/* Icon */}
                    <div style={{
                      fontSize: '28px',
                      zIndex: 1
                    }}>
                      {item.emoji}
                    </div>
                    
                    {/* Label */}
                    <span style={{
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: '600',
                      zIndex: 1,
                      flex: 1,
                      textAlign: 'left'
                    }}>
                      {item.label}
                    </span>

                    {/* Arrow */}
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: side === 'left' ? 5 : -5 }}
                      style={{
                        color: '#6366f1',
                        zIndex: 1
                      }}
                    >
                      →
                    </motion.div>
                  </motion.button>
                ))
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  <p>Войдите, чтобы увидеть меню</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {loadedUser && side === 'right' && (
              <div style={{
                padding: '20px',
                borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                background: 'rgba(99, 102, 241, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {loadedUser.photoUrl ? (
                      <img src={loadedUser.photoUrl} alt={loadedUser.username} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>
                      {loadedUser.username || 'Игрок'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {(loadedUser.coins || 0).toLocaleString()} монет
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

