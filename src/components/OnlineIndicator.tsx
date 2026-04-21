'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase'; // ✅ Добавлен импорт

interface OnlineStats {
  reallyActive: number;
  online30min: number;
  inRooms: number;
  total: number;
}

export default function OnlineIndicator() {
  const [stats, setStats] = useState<OnlineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadStats();
    
    // ✅ УЛУЧШЕНО: Обновляем каждые 5 секунд вместо 30
    const interval = setInterval(loadStats, 5000);
    
    // ✅ НОВОЕ: Подписываемся на изменения онлайн статуса через Realtime
    const channel = supabase
      .channel('online-status-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: '_pidr_users'
          // ✅ УБРАЛИ ФИЛЬТР - слушаем все изменения
        },
        (payload: any) => {
          console.log('🔄 [OnlineIndicator] Изменение статуса пользователя:', payload);
          // Перезагружаем статистику
          loadStats();
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats/online', {
        cache: 'no-store', // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.stats) {
        const onlineCount = data.stats.reallyActive || 0;
        console.log(`🟢 [OnlineIndicator] Онлайн игроков: ${onlineCount}`);
        
        setStats({
          reallyActive: onlineCount,
          online30min: data.stats.online30min || 0,
          inRooms: data.stats.inRooms || 0,
          total: data.stats.total || 0
        });
      } else {
        console.error('❌ [OnlineIndicator] Ошибка получения статистики:', data);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки онлайн статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '98px',
        justifyContent: 'center',
        padding: '8px 12px',
        background: 'rgba(2, 6, 23, 0.7)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '14px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#6b7280',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        <span style={{
          color: '#9ca3af',
          fontSize: '14px',
          fontWeight: '600'
        }}>...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '104px',
          justifyContent: 'center',
          padding: '8px 12px',
          background: 'rgba(2, 6, 23, 0.72)',
          borderRadius: '14px',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
        }}
      >
        {/* Пульсирующий зеленый индикатор */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.8)'
          }}
        />
        
        {/* Количество онлайн */}
        <span style={{ color: '#a7f3d0', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
          ONLINE
        </span>
        <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 800, textShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }}>
          {stats?.reallyActive || 0}
        </span>
      </motion.div>

      {/* Детальная информация */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.98)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              minWidth: '220px',
              zIndex: 1000
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 Онлайн статистика
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Активные сейчас */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>🟢</span>
                  Активны сейчас:
                </span>
                <span style={{
                  color: '#10b981',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {stats.reallyActive}
                </span>
              </div>

              {/* Онлайн 30 мин */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>⏱️</span>
                  За 30 минут:
                </span>
                <span style={{
                  color: '#3b82f6',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {stats.online30min}
                </span>
              </div>

              {/* В комнатах */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  <span style={{ marginRight: '6px' }}>🎮</span>
                  В комнатах:
                </span>
                <span style={{
                  color: '#f59e0b',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {stats.inRooms}
                </span>
              </div>

              {/* Разделитель */}
              <div style={{
                height: '1px',
                background: 'rgba(148, 163, 184, 0.2)',
                margin: '4px 0'
              }} />

              {/* Всего пользователей */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  <span style={{ marginRight: '6px' }}>👥</span>
                  Всего игроков:
                </span>
                <span style={{
                  color: '#94a3b8',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                  {stats.total}
                </span>
              </div>
            </div>

            {/* Стрелка вверх */}
            <div style={{
              position: 'absolute',
              top: '-6px',
              right: '20px',
              width: '12px',
              height: '12px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRight: 'none',
              borderBottom: 'none',
              transform: 'rotate(45deg)'
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

