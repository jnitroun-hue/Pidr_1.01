'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

const TelegramBottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState(12345.6789);
  const [isVisible, setIsVisible] = useState(true);

  const navItems: NavItem[] = [
    { id: 'home', label: 'Главная', icon: '🏠', path: '/' },
    { id: 'game', label: 'Игра', icon: '🎮', path: '/game' },
    { id: 'friends', label: 'Друзья', icon: '👥', path: '/friends', badge: 3 },
    { id: 'shop', label: 'Магазин', icon: '🛒', path: '/shop' },
    { id: 'profile', label: 'Профиль', icon: '👤', path: '/profile' }
  ];

  // Hide/show nav based on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 100);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
    }
  };

  const handleNavClick = (item: NavItem) => {
    if (pathname === item.path) return;
    
    triggerHaptic('light');
    router.push(item.path);
  };

  const formatBalance = (value: number) => {
    return value.toLocaleString('ru-RU', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {/* Balance Display (only on main pages) */}
          {(pathname === '/' || pathname === '/game') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'var(--tg-theme-bg-color)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, var(--game-gold) 0%, #f5a623 100%)',
                  color: '#0f172a',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '16px',
                  fontWeight: '700',
                  boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)',
                  border: '1px solid rgba(255, 215, 0, 0.5)'
                }}
              >
                <Image 
                  src="/img/ton-icon.svg" 
                  alt="TON" 
                  width={20} 
                  height={20}
                />
                <span>{formatBalance(balance)}</span>
              </div>
            </motion.div>
          )}

          {/* Navigation Bar */}
          <div
            style={{
              background: 'var(--tg-theme-bg-color)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '8px 0 16px 0',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                maxWidth: '500px',
                margin: '0 auto',
                padding: '0 16px'
              }}
            >
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      position: 'relative',
                      minWidth: '48px',
                      transition: 'all 0.2s ease'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      background: isActive ? 
                        'linear-gradient(135deg, var(--game-primary) 0%, var(--game-secondary) 100%)' : 
                        'transparent'
                    }}
                  >
                    {/* Icon */}
                    <motion.div
                      style={{
                        fontSize: '20px',
                        position: 'relative'
                      }}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        rotateY: isActive ? [0, 360] : 0
                      }}
                      transition={{
                        rotateY: { duration: 0.6, ease: "easeInOut" }
                      }}
                    >
                      {item.icon}
                      
                      {/* Badge */}
                      {item.badge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'var(--game-danger)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            fontSize: '10px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--tg-theme-bg-color)'
                          }}
                        >
                          {item.badge}
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Label */}
                    <motion.span
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: isActive ? 'white' : 'var(--tg-theme-hint-color)',
                        lineHeight: 1,
                        textAlign: 'center'
                      }}
                      animate={{
                        color: isActive ? 'white' : 'var(--tg-theme-hint-color)'
                      }}
                    >
                      {item.label}
                    </motion.span>

                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '4px',
                          height: '4px',
                          background: 'white',
                          borderRadius: '50%'
                        }}
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default TelegramBottomNav;
