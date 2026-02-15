'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, DollarSign, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NFTMarketplace from '../../components/NFTMarketplace';

interface User {
  telegram_id: number;
  username: string;
  first_name: string;
  coins: number;
  rating: number;
  wins: number;
  losses: number;
}

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalSales: 0,
    avgPrice: 0,
    activeUsers: 0
  });

  // Telegram WebApp headers - FIXED TypeScript
  // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers для всех платформ
  const getApiHeaders = (): Record<string, string> => {
    const { getApiHeaders: getUniversalHeaders } = require('../../lib/api-headers');
    const headers = getUniversalHeaders();
    return headers as Record<string, string>;
  };

  // Загрузка пользователя
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/user/me', {
          headers: getApiHeaders()
        });
        const data = await response.json();
        
        if (data.success && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Загрузка статистики маркетплейса
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/marketplace/list?limit=1000', {
          headers: getApiHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
          const listings = data.listings || [];
          const avgPrice = listings.length > 0
            ? Math.floor(
                listings
                  .filter((l: any) => l.price_coins)
                  .reduce((sum: number, l: any) => sum + l.price_coins, 0) / listings.length
              )
            : 0;

          setStats({
            totalListings: listings.length,
            totalSales: 0, // TODO: добавить подсчёт продаж
            avgPrice,
            activeUsers: new Set(listings.map((l: any) => l.seller_user_id)).size
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
      }
    };

    loadStats();
  }, []);

  const handleBalanceUpdate = (newBalance: number) => {
    if (user) {
      setUser({ ...user, coins: newBalance });
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(251, 191, 36, 0.3)',
            borderTop: '4px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#94a3b8' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px',
      paddingBottom: '100px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Back Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              try {
                router.back();
              } catch (error) {
                console.error('Ошибка навигации:', error);
                window.location.href = '/';
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(51, 65, 85, 0.6)',
              color: '#e2e8f0',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
            Назад
          </motion.button>

          {/* User Info */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '12px 20px',
              borderRadius: '12px',
              border: '2px solid rgba(251, 191, 36, 0.3)'
            }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
                  @{user.username || user.first_name}
                </p>
                <p style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '18px' }}>
                  💰 {user.coins.toLocaleString()} монет
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <StatCard
            icon={<TrendingUp size={32} />}
            label="Активных лотов"
            value={stats.totalListings}
            color="#10b981"
          />
          <StatCard
            icon={<DollarSign size={32} />}
            label="Средняя цена"
            value={`${stats.avgPrice.toLocaleString()} 💰`}
            color="#fbbf24"
          />
          <StatCard
            icon={<Users size={32} />}
            label="Активных продавцов"
            value={stats.activeUsers}
            color="#3b82f6"
          />
        </div>

        {/* Marketplace Component */}
        <NFTMarketplace
          userCoins={user?.coins || 0}
          onBalanceUpdate={handleBalanceUpdate}
        />
      </div>

      {/* Animated Background */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        border: `2px solid ${color}40`,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: `0 4px 20px ${color}20`
      }}
    >
      <div style={{ color, opacity: 0.9 }}>
        {icon}
      </div>
      <div>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
          {label}
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 'bold' }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}
