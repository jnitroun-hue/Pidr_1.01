'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Gift, Users } from 'lucide-react';

interface ReferralStats {
  referral_code: string;
  referral_count: number;
  total_bonus_earned: number;
  referrals: Array<{
    username: string;
    telegram_id: number;
    created_at: string;
    bonus_claimed: boolean;
  }>;
}

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';

      const response = await fetch('/api/referral/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId
        }
      });

      const result = await response.json();

      if (result.success) {
        setStats(result.stats);
      } else {
        console.error('Ошибка загрузки статистики:', result.error);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (stats?.referral_code) {
      navigator.clipboard.writeText(stats.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) {
      alert('Введите реферальный код!');
      return;
    }

    setApplying(true);
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';

      const response = await fetch('/api/referral/apply', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId
        },
        body: JSON.stringify({
          referralCode: applyCode.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setApplyCode('');
        onClose();
      } else {
        alert(`Ошибка: ${result.error}`);
      }
    } catch (error) {
      console.error('Ошибка применения кода:', error);
      alert('Произошла ошибка при применении кода');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '3px solid #fbbf24',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <X size={24} />
          </button>

          {/* Заголовок */}
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'black',
            color: '#fbbf24',
            marginBottom: '20px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <Gift size={32} /> РЕФЕРАЛЬНАЯ СИСТЕМА
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Загрузка...
            </div>
          ) : stats ? (
            <>
              {/* Реферальный код */}
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Ваш реферальный код:
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '1.2rem',
                    color: '#fbbf24',
                    fontWeight: 'bold'
                  }}>
                    {stats.referral_code}
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? '#22c55e' : '#fbbf24',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copied ? <Check size={24} color="#fff" /> : <Copy size={24} color="#0f172a" />}
                  </button>
                </div>
              </div>

              {/* Статистика */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  <Users size={24} style={{ color: '#3b82f6', marginBottom: '8px' }} />
                  <div style={{ fontSize: '2rem', fontWeight: 'black', color: '#fff' }}>
                    {stats.referral_count}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    Рефералов
                  </div>
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '2px solid #22c55e',
                  borderRadius: '12px',
                  padding: '15px',
                  textAlign: 'center'
                }}>
                  <Gift size={24} style={{ color: '#22c55e', marginBottom: '8px' }} />
                  <div style={{ fontSize: '2rem', fontWeight: 'black', color: '#fff' }}>
                    {stats.total_bonus_earned.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    Заработано монет
                  </div>
                </div>
              </div>

              {/* Применить код */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Применить реферальный код:
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value)}
                    placeholder="Введите код"
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={handleApplyCode}
                    disabled={applying}
                    style={{
                      background: applying ? '#64748b' : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      color: '#0f172a',
                      fontWeight: 'bold',
                      cursor: applying ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {applying ? 'Применение...' : 'Применить'}
                  </button>
                </div>
              </div>

              {/* Список рефералов */}
              {stats.referrals && stats.referrals.length > 0 && (
                <div>
                  <h3 style={{
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    marginBottom: '15px'
                  }}>
                    Ваши рефералы:
                  </h3>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {stats.referrals.map((ref, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ color: '#fff', fontWeight: 'bold' }}>
                            {ref.username}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {new Date(ref.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {ref.bonus_claimed && (
                          <div style={{
                            background: '#22c55e',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            color: '#fff',
                            fontWeight: 'bold'
                          }}>
                            +5000
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Не удалось загрузить статистику
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

