'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, DollarSign, Users, Sparkles, ShieldCheck, TimerReset, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NFTMarketplace from '../../components/NFTMarketplace';
import PremiumPromoBanner from '../../components/PremiumPromoBanner';
import PremiumPurchaseModal from '../../components/PremiumPurchaseModal';
import PremiumSuccessModal from '../../components/PremiumSuccessModal';
import type { PremiumStatus } from '@/lib/premium/premium-service';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { appConfirm, appAlert } from '@/lib/app-notice';
import { fetchPremiumStatus, isPremiumUsable } from '@/lib/premium/refresh-premium';
import { GRAM } from '@/lib/crypto/gram-brand';

interface User {
  telegram_id: number;
  username: string;
  first_name: string;
  coins: number;
  rating: number;
  wins: number;
  losses: number;
}

interface Listing {
  id: number;
  seller_user_id: number;
  price_coins?: number | null;
  price_ton?: number | null;
  price_sol?: number | null;
  price_rub?: number | null;
  nft_card?: {
    rank?: string;
    suit?: string;
    rarity?: string;
  };
}

interface PromoCard {
  listingId: number;
  cardTitle: string;
  originalRub: number;
  discountedRub: number;
  originalCoins?: number;
  discountedCoins?: number;
  tonPrice: number;
  solPrice: number;
  discountPercent: number;
  promoImageUrl?: string | null;
  isClonedImage?: boolean;
}

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [dailyPromo, setDailyPromo] = useState<PromoCard | null>(null);
  const [canClaimPromo, setCanClaimPromo] = useState(true);
  const [claimRemainingMs, setClaimRemainingMs] = useState(0);
  const [promoCooldownLabel, setPromoCooldownLabel] = useState('00:00:00');
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [premiumSuccessData, setPremiumSuccessData] = useState<PremiumStatus | null>(null);
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

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const loadDailyPromo = async () => {
    try {
      const response = await fetch('/api/marketplace/daily-offer', {
        method: 'GET',
        headers: getApiHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success) {
        setDailyPromo(data.offer || null);
        const remaining = Number(data.claim?.remainingMs || 0);
        setClaimRemainingMs(remaining);
        setCanClaimPromo(Boolean(data.claim?.canClaim));
        setPromoCooldownLabel(data.claim?.canClaim ? '00:00:00' : formatCountdown(remaining));
      }
    } catch (error) {
      console.error('Ошибка загрузки акции дня:', error);
    }
  };

  // Загрузка пользователя
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/user/me', {
          headers: getApiHeaders(),
          credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success && data.user) {
          setUser(data.user);
        }
        const prem = await fetchPremiumStatus();
        if (prem) setPremium(prem);
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    void loadDailyPromo();
  }, []);

  // Premium повторно после авторизации (Telegram WebApp иногда позже отдаёт initData)
  useEffect(() => {
    if (loading) return;
    void fetchPremiumStatus().then((p) => {
      if (p) setPremium(p);
    });
  }, [loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('show_premium_success') !== '1') return;

    const raw = sessionStorage.getItem('premium_success_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PremiumStatus;
        if (isPremiumUsable(parsed)) {
          sessionStorage.removeItem('show_premium_success');
          sessionStorage.removeItem('premium_success_data');
          setPremium(parsed);
          setPremiumSuccessData(parsed);
          setShowPremiumSuccess(true);
          return;
        }
      } catch { /* ignore */ }
    }

    if (isPremiumUsable(premium)) {
      sessionStorage.removeItem('show_premium_success');
      setPremiumSuccessData(premium);
      setShowPremiumSuccess(true);
    }
  }, [premium]);

  useEffect(() => {
    const refresh = () => {
      void fetchPremiumStatus().then((p) => { if (p) setPremium(p); });
      void loadDailyPromo();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Загрузка статистики маркетплейса
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/marketplace/list?limit=200', {
          headers: getApiHeaders(),
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();
        
        if (data.success) {
          const nextListings = (data.listings || []) as Listing[];
          setListings(nextListings);
          const avgPrice = nextListings.length > 0
            ? Math.floor(
                nextListings
                  .filter((l: any) => l.price_coins)
                  .reduce((sum: number, l: any) => sum + l.price_coins, 0) / nextListings.length
              )
            : 0;

          setStats({
            totalListings: nextListings.length,
            totalSales: 0, // TODO: добавить подсчёт продаж
            avgPrice,
            activeUsers: new Set(nextListings.map((l: any) => l.seller_user_id)).size
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    loadDailyPromo();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClaimRemainingMs((prev) => {
        const next = Math.max(0, prev - 1000);
        if (next <= 0) {
          setCanClaimPromo(true);
          setPromoCooldownLabel('00:00:00');
        } else {
          setCanClaimPromo(false);
          setPromoCooldownLabel(formatCountdown(next));
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleBalanceUpdate = (newBalance: number) => {
    if (user) {
      setUser({ ...user, coins: newBalance });
    }
  };

  const handleClaimPromo = async () => {
    if (!dailyPromo) return;
    if (!canClaimPromo) {
      await appAlert(`Акция уже использована. Новый шанс через ${promoCooldownLabel}`, {
        title: 'Подождите',
        type: 'warning',
      });
      return;
    }

    const coinPrice = dailyPromo.discountedCoins ?? Math.ceil(dailyPromo.discountedRub / 0.2);
    if ((user?.coins || 0) < coinPrice) {
      await appAlert(`Недостаточно монет. Нужно ${coinPrice.toLocaleString('ru-RU')} 🪙`, {
        title: 'Недостаточно монет',
        type: 'warning',
      });
      return;
    }

    if (!(await appConfirm(
      `Купить карту акции дня за ${coinPrice.toLocaleString('ru-RU')} монет?\n\n${dailyPromo.cardTitle}\nСкидка -${dailyPromo.discountPercent}%`,
      { confirmText: 'Купить', type: 'info' }
    ))) {
      return;
    }

    try {
      const response = await fetch('/api/marketplace/daily-offer', {
        method: 'POST',
        headers: getApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: 'buy_coins' }),
      });
      const data = await response.json();

      if (!data.success) {
        const remaining = Number(data.claim?.remainingMs || 0);
        if (remaining > 0) {
          setClaimRemainingMs(remaining);
          setCanClaimPromo(false);
          setPromoCooldownLabel(formatCountdown(remaining));
        }
        await appAlert(data.error || 'Не удалось купить акцию', { title: 'Ошибка', type: 'error' });
        return;
      }

      const remaining = Number(data.claim?.remainingMs || 0);
      setClaimRemainingMs(remaining);
      setCanClaimPromo(false);
      setPromoCooldownLabel(formatCountdown(remaining));

      if (typeof data.purchase?.newBalance === 'number') {
        handleBalanceUpdate(data.purchase.newBalance);
      }

      await loadDailyPromo();
      await appAlert('Карта акции дня куплена! Она уже в вашей NFT коллекции.', {
        title: 'Покупка успешна',
        type: 'success',
        confirmText: 'Отлично',
      });
    } catch (error) {
      console.error('Ошибка покупки акции:', error);
      await appAlert('Ошибка покупки акции дня', { title: 'Ошибка', type: 'error' });
    }
  };

  if (loading) {
    return (
      <PageLoadingScreen
        title="Магазин"
        subtitle="Загрузка..."
      />
    );
  }

  return (
      <div style={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 10% 20%, rgba(56,189,248,0.14) 0%, transparent 38%),
          radial-gradient(circle at 90% 10%, rgba(245,197,24,0.16) 0%, transparent 36%),
          linear-gradient(165deg, ${T.bgDeep} 0%, ${T.bgMain} 55%, #0d1219 100%)
        `,
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
              borderRadius: T.radiusMd,
              border: `1px solid ${T.borderSubtle}`,
              background: T.bgElevated,
              color: T.text,
              fontWeight: 700,
              fontSize: '15px',
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
              background: T.bgCard,
              padding: '12px 20px',
              borderRadius: '999px',
              border: `1px solid ${T.borderGold}`,
              boxShadow: '0 14px 34px rgba(0,0,0,0.38)',
            }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: T.textMuted, fontSize: '14px', marginBottom: '4px' }}>
                  @{user.username || user.first_name}
                </p>
                <p style={{ color: T.accentGold, fontWeight: 'bold', fontSize: '18px' }}>
                  💰 {user.coins.toLocaleString()} монет
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: '24px',
            padding: '24px',
            marginBottom: '18px',
            background: `
              linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(56,189,248,0.1) 40%, rgba(15,23,42,0.75) 100%),
              ${T.bgCard}
            `,
            border: `1px solid ${T.borderGold}`,
            boxShadow: T.shadowCard,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#fde68a', fontWeight: 700, fontSize: 12 }}>
                <Sparkles size={16} /> Премиум маркетплейс NFT
              </div>
              <h1 style={{ margin: 0, color: T.text, fontSize: 'clamp(1.6rem, 5vw, 2.3rem)', fontWeight: 900, lineHeight: 1.1 }}>
                Карты, которые хочется
                <span style={{ color: T.accentGold }}> покупать</span>
              </h1>
              <p style={{ color: T.textMuted, fontSize: 14, margin: '12px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
                Лоты за монеты, рубли, {GRAM.symbol} и SOL. Витрина обновляется в реальном времени, а акция дня теперь контролируется сервером и честно ограничена до 1 раза в 24 часа.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Badge icon={<ShieldCheck size={15} />} label="Безопасные сделки" />
              <Badge icon={<TimerReset size={15} />} label="Обновление 24/7" />
              <Badge icon={<Percent size={15} />} label="Акция дня -29%" />
            </div>
          </div>
        </motion.div>

        <PremiumPromoBanner
          premium={premium}
          compact
          onOpenPurchase={() => setShowPremiumModal(true)}
        />

        {/* Daily promo */}
        {dailyPromo && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              borderRadius: '20px',
              padding: '18px',
              marginBottom: '24px',
              background: 'linear-gradient(130deg, rgba(244,63,94,0.14) 0%, rgba(249,115,22,0.12) 45%, rgba(15,23,42,0.92) 100%)',
              border: '1px solid rgba(251,146,60,0.55)',
              boxShadow: '0 16px 42px rgba(249,115,22,0.16)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fed7aa', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Акция дня · серверный лимит 1/24ч
                </div>
                <h3 style={{ color: '#fff7ed', margin: '8px 0 6px', fontSize: 22 }}>
                  {dailyPromo.cardTitle}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {(dailyPromo.originalCoins ?? 0) > 0 && (
                    <span style={{ color: '#fdba74', fontSize: 14, textDecoration: 'line-through' }}>
                      {(dailyPromo.originalCoins ?? 0).toLocaleString('ru-RU')} 🪙
                    </span>
                  )}
                  <span style={{ color: '#fde047', fontSize: 26, fontWeight: 900 }}>
                    {(dailyPromo.discountedCoins ?? Math.ceil(dailyPromo.discountedRub / 0.2)).toLocaleString('ru-RU')} 🪙
                  </span>
                  <span style={{ color: '#fef08a', fontSize: 12, fontWeight: 800 }}>
                    -{dailyPromo.discountPercent}%
                  </span>
                </div>
                <p style={{ color: '#fed7aa', margin: '8px 0 0', fontSize: 12 }}>
                  Покупка за монеты · 1 раз в 24 часа · карта сразу в коллекцию
                </p>
              </div>

              <div style={{ minWidth: 230, textAlign: 'right' }}>
                {dailyPromo.promoImageUrl && (
                  <div
                    style={{
                      width: 94,
                      height: 132,
                      marginLeft: 'auto',
                      marginBottom: 10,
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid rgba(251,146,60,0.55)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src={dailyPromo.promoImageUrl}
                      alt="promo-card"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                )}
                <div style={{ color: '#ffedd5', fontSize: 12, marginBottom: 8 }}>
                  {canClaimPromo ? 'Доступна покупка за монеты' : `Новый шанс через ${promoCooldownLabel}`}
                </div>
                <motion.button
                  whileHover={{ scale: canClaimPromo ? 1.03 : 1 }}
                  whileTap={{ scale: canClaimPromo ? 0.97 : 1 }}
                  onClick={handleClaimPromo}
                  disabled={!canClaimPromo}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    background: canClaimPromo
                      ? 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'
                      : 'linear-gradient(135deg, rgba(100,116,139,0.7) 0%, rgba(71,85,105,0.7) 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: canClaimPromo ? 'pointer' : 'not-allowed',
                  }}
                >
                  {canClaimPromo
                    ? `Купить за ${(dailyPromo.discountedCoins ?? Math.ceil(dailyPromo.discountedRub / 0.2)).toLocaleString('ru-RU')} 🪙`
                    : 'Уже куплено сегодня'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

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
        <div id="marketplace-section">
          <NFTMarketplace
            userCoins={user?.coins || 0}
            onBalanceUpdate={handleBalanceUpdate}
          />
        </div>
      </div>

      <PremiumPurchaseModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        userCoins={user?.coins || 0}
        premium={premium}
        onSuccess={async (newPremium) => {
          if (!isPremiumUsable(newPremium)) {
            const fresh = await fetchPremiumStatus();
            if (!isPremiumUsable(fresh)) return;
            setPremium(fresh);
            setPremiumSuccessData(fresh);
          } else {
            setPremium(newPremium);
            setPremiumSuccessData(newPremium);
          }
          setShowPremiumSuccess(true);
          const meRes = await fetch('/api/user/me', { credentials: 'include', headers: getApiHeaders() });
          if (meRes.ok) {
            const me = await meRes.json();
            if (me.success) setUser(me.user);
          }
        }}
      />

      <PremiumSuccessModal
        open={showPremiumSuccess}
        onClose={() => setShowPremiumSuccess(false)}
        premium={premiumSuccessData}
      />

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

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 12px',
        borderRadius: '999px',
        background: 'rgba(15,23,42,0.75)',
        border: `1px solid ${T.borderSubtle}`,
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {icon}
      {label}
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
      whileHover={{ scale: 1.02, y: -3 }}
      style={{
        background: T.bgCard,
        borderRadius: T.radiusLg,
        border: `1px solid ${color}55`,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: `0 8px 28px ${color}18`,
      }}
    >
      <div style={{ color, opacity: 0.95 }}>
        {icon}
      </div>
      <div>
        <p style={{ color: T.textMuted, fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ color: T.text, fontSize: '22px', fontWeight: 800 }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}
