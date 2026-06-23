'use client'
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  getWeeklyPlacePrize,
  getNextWeeklyPayoutDate,
  formatWeeklyPayoutDate,
  WEEKLY_TOP_PRIZES,
} from '@/lib/rating/weekly-prizes';
import { GRAM } from '@/lib/crypto/gram-brand';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import UserAvatarBadge from '@/components/UserAvatarBadge';
import AuthMethodBadge from '@/components/AuthMethodBadge';
import type { AuthMethod } from '@/lib/user/resolve-auth-method';

interface UserData {
  id: number;
  username: string;
  first_name: string;
  coins: number;
  rating: number;
  games_played: number;
  games_won: number;
  avatar_url: string | null;
  auth_method?: AuthMethod;
}

interface RatingEntry {
  id: number;
  username: string;
  rating: number;
  games_played: number;
  games_won: number;
  avatar_url: string | null;
  auth_method?: AuthMethod;
}

function getRankInfo(rating: number): { title: string; color: string; bg: string } {
  if (rating >= 5000) return { title: 'Легенда', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.12)' };
  if (rating >= 3000) return { title: 'Мастер', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
  if (rating >= 2000) return { title: 'Золотой игрок', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' };
  if (rating >= 1000) return { title: 'Серебряный игрок', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
  if (rating >= 500) return { title: 'Бронзовый игрок', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.12)' };
  return { title: 'Новичок', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' };
}

export default function RatingPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [topPlayers, setTopPlayers] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'top'>('my');
  const nextPayoutLabel = useMemo(
    () => formatWeeklyPayoutDate(getNextWeeklyPayoutDate()),
    []
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем данные текущего юзера
        const meRes = await fetch('/api/user/me', { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.user) {
            setUserData(meData.user);
          }
        }

        // Загружаем топ игроков (публичный API)
        const ratingRes = await fetch('/api/rating/top?limit=10', { credentials: 'include' });
        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          if (ratingData.success && ratingData.players) {
            setTopPlayers(ratingData.players);
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки рейтинга:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const rank = userData ? getRankInfo(userData.rating) : getRankInfo(0);
  const winrate = userData && userData.games_played > 0
    ? Math.round((userData.games_won / userData.games_played) * 100)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1520 50%, #0a1628 100%)',
      color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Хедер */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Назад
        </button>
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>Рейтинг</span>
        <div style={{ width: '60px' }} />
      </div>

      {/* Табы */}
      <div style={{
        display: 'flex', gap: '4px', padding: '12px 16px 0',
      }}>
        {(['my', 'top'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
              background: activeTab === tab ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.1)',
              color: activeTab === tab ? '#4ade80' : '#64748b',
              fontSize: '13px', fontWeight: activeTab === tab ? '700' : '500',
              cursor: 'pointer', transition: 'all 0.2s',
              borderBottom: activeTab === tab ? '2px solid #22c55e' : '2px solid transparent',
            }}
          >
            {tab === 'my' ? 'Мой рейтинг' : 'Топ игроков'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
        {loading ? (
          <PageLoadingScreen
            fullScreen={false}
            compact
            showProgress={false}
            title="Рейтинг"
            subtitle="Загрузка..."
          />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'my' ? (
              <motion.div
                key="my"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Карточка рейтинга */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%)',
                  borderRadius: '16px', padding: '20px',
                  border: `1px solid ${rank.color}30`,
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <UserAvatarBadge
                      username={userData?.username || userData?.first_name}
                      avatarUrl={userData?.avatar_url}
                      authMethod={userData?.auth_method || 'web'}
                      size="md"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
                          {userData?.username || userData?.first_name || 'Игрок'}
                        </span>
                        <AuthMethodBadge method={userData?.auth_method || 'web'} size="sm" />
                      </div>
                      <span style={{
                        display: 'inline-block', marginTop: '4px',
                        background: rank.bg, color: rank.color,
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: '700',
                        border: `1px solid ${rank.color}30`,
                      }}>
                        {rank.title}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '48px', fontWeight: '800', color: rank.color, lineHeight: '1' }}>
                      {userData?.rating || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Текущий рейтинг
                    </div>
                  </div>

                  {/* Прогресс-бар */}
                  <div style={{
                    background: 'rgba(100, 116, 139, 0.15)', borderRadius: '6px',
                    height: '6px', overflow: 'hidden', marginBottom: '6px',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, ((userData?.rating || 0) / 10000) * 100)}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      style={{
                        height: '100%', borderRadius: '6px',
                        background: `linear-gradient(90deg, ${rank.color}, ${rank.color}cc)`,
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '10px', color: '#475569',
                  }}>
                    <span>0</span><span>2500</span><span>5000</span><span>7500</span><span>10000</span>
                  </div>
                </div>

                {/* Статистика */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                  marginBottom: '12px',
                }}>
                  {[
                    { label: 'Игры', value: userData?.games_played || 0, color: '#6366f1' },
                    { label: 'Победы', value: userData?.games_won || 0, color: '#22c55e' },
                    { label: 'Винрейт', value: `${winrate}%`, color: '#eab308' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '12px', padding: '12px',
                      border: '1px solid rgba(100, 116, 139, 0.1)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: stat.color }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Монеты */}
                <div style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  borderRadius: '12px', padding: '14px 16px',
                  border: '1px solid rgba(234, 179, 8, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Баланс</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#eab308' }}>
                    {(userData?.coins || 0).toLocaleString()} монет
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="top"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Призы топ-10 */}
                <div style={{
                  marginBottom: '14px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fde68a', marginBottom: '4px' }}>
                    🏆 Еженедельные призы топ-10
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '10px' }}>
                    Итоги каждый понедельник · следующая раздача: {nextPayoutLabel}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {WEEKLY_TOP_PRIZES.slice(0, 3).map((p) => (
                      <div
                        key={p.place}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(15, 23, 42, 0.45)',
                          border: '1px solid rgba(100, 116, 139, 0.12)',
                        }}
                      >
                        <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: 600 }}>
                          {p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'} {p.place} место
                        </span>
                        <span style={{ color: p.type === 'ton' ? '#38bdf8' : '#eab308', fontSize: '12px', fontWeight: 800 }}>
                          {p.label}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.45)',
                        border: '1px solid rgba(100, 116, 139, 0.12)',
                      }}
                    >
                      <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>4–10 места</span>
                      <span style={{ color: '#eab308', fontSize: '12px', fontWeight: 800 }}>15 000 → 1 000 монет</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
                    Монеты начисляются автоматически. {GRAM.symbol} — на подключённый кошелёк (топ-3).
                  </div>
                </div>

                {/* Топ игроков */}
                {topPlayers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
                    Пока нет данных
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {topPlayers.map((player, index) => {
                      const pRank = getRankInfo(player.rating);
                      const isTop3 = index < 3;
                      const medals = ['#eab308', '#94a3b8', '#cd7f32'];
                      const place = index + 1;
                      const prize = getWeeklyPlacePrize(place);
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: isTop3
                              ? `linear-gradient(135deg, ${medals[index]}10 0%, rgba(15,23,42,0.6) 100%)`
                              : 'rgba(15, 23, 42, 0.5)',
                            borderRadius: '12px', padding: '10px 12px',
                            border: isTop3
                              ? `1px solid ${medals[index]}30`
                              : '1px solid rgba(100, 116, 139, 0.08)',
                          }}
                        >
                          {/* Позиция */}
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '800',
                            color: isTop3 ? medals[index] : '#475569',
                            background: isTop3 ? `${medals[index]}15` : 'rgba(100,116,139,0.1)',
                            flexShrink: 0,
                          }}>
                            {index + 1}
                          </div>

                          {/* Аватар */}
                          <UserAvatarBadge
                            username={player.username}
                            avatarUrl={player.avatar_url}
                            authMethod={player.auth_method || 'web'}
                            size="sm"
                          />

                          {/* Имя + ранг */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                              <div style={{
                                fontSize: '13px', fontWeight: '600', color: '#e2e8f0',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                flex: 1, minWidth: 0,
                              }}>
                                {player.username || 'Игрок'}
                              </div>
                              <AuthMethodBadge method={player.auth_method || 'web'} size="sm" />
                            </div>
                            <div style={{ fontSize: '10px', color: pRank.color }}>
                              {pRank.title}
                            </div>
                            {prize && (
                              <div style={{
                                marginTop: '3px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: prize.type === 'ton' ? '#38bdf8' : '#eab308',
                              }}>
                                🎁 {prize.label}
                              </div>
                            )}
                          </div>

                          {/* Рейтинг */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: pRank.color }}>
                              {player.rating}
                            </div>
                            <div style={{ fontSize: '9px', color: '#475569' }}>
                              {player.games_played} игр
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
