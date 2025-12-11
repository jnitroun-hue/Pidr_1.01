'use client'
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Clock, Target, Award, Star, Zap, Crown } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface PlayerStatsProps {
  userId?: string;
  showCompact?: boolean;
}

interface PlayerStatsData {
  // Основная статистика
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  
  // Позиции
  first_places: number;
  second_places: number;
  third_places: number;
  fourth_places: number;
  
  // Игровая статистика
  total_cards_played: number;
  total_penalty_cards: number;
  total_one_card_declarations: number;
  total_penki_used: number;
  total_turns: number;
  
  // Временная статистика
  total_game_time_ms: number;
  average_game_time_ms: number;
  fastest_win_ms: number;
  longest_game_ms: number;
  
  // Достижения
  perfect_games: number;
  comeback_wins: number;
  fastest_declaration_ms: number;
  
  // Рейтинг
  rating: number;
  peak_rating: number;
  rating_games: number;
  
  // Достижения
  achievements?: Achievement[];
}

interface Achievement {
  id: number;
  achievement_type: string;
  achievement_data: any;
  unlocked_at: string;
}

export default function PlayerStats({ userId, showCompact = false }: PlayerStatsProps) {
  const { user } = useTelegram();
  const [stats, setStats] = useState<PlayerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id?.toString();

  useEffect(() => {
    if (targetUserId) {
      fetchPlayerStats();
    }
  }, [targetUserId]);

  const fetchPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/stats/${targetUserId}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }

      const statsData = await response.json();
      setStats(statsData);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    if (!ms) return '0м';
    
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`;
    }
    return `${minutes}м`;
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 2000) return '#ffd700'; // Золотой
    if (rating >= 1500) return '#e6e6fa'; // Серебряный
    if (rating >= 1000) return '#cd7f32'; // Бронзовый
    return '#8b7d6b'; // Обычный
  };

  const getRatingTitle = (rating: number): string => {
    if (rating >= 2000) return 'Легенда';
    if (rating >= 1800) return 'Мастер';
    if (rating >= 1500) return 'Профи';
    if (rating >= 1200) return 'Эксперт';
    if (rating >= 1000) return 'Любитель';
    return 'Новичок';
  };

  if (loading) {
    return (
      <div className="player-stats loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="loading-text">Загрузка статистики...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-stats error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <div>
            <div className="error-title">Ошибка</div>
            <div className="error-description">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="player-stats empty">
        <div className="empty-message">
          <span className="empty-icon">📊</span>
          <div>
            <div className="empty-title">Нет данных</div>
            <div className="empty-description">Статистика пока недоступна</div>
          </div>
        </div>
      </div>
    );
  }

  if (showCompact) {
    return (
      <motion.div 
        className="player-stats compact"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="compact-grid">
          <div className="compact-stat">
            <Trophy className="stat-icon" />
            <div className="stat-value">{stats.total_wins}</div>
            <div className="stat-label">Победы</div>
          </div>
          
          <div className="compact-stat">
            <Target className="stat-icon" />
            <div className="stat-value">{(stats.win_rate * 100).toFixed(1)}%</div>
            <div className="stat-label">Винрейт</div>
          </div>
          
          <div className="compact-stat">
            <Star className="stat-icon" style={{ color: getRatingColor(stats.rating) }} />
            <div className="stat-value">{stats.rating}</div>
            <div className="stat-label">Рейтинг</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="player-stats full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Заголовок с рейтингом */}
      <div className="stats-header">
        <div className="rating-section">
          <div className="rating-badge" style={{ borderColor: getRatingColor(stats.rating) }}>
            <Crown className="rating-icon" style={{ color: getRatingColor(stats.rating) }} />
            <div className="rating-info">
              <div className="rating-value" style={{ color: getRatingColor(stats.rating) }}>
                {stats.rating}
              </div>
              <div className="rating-title">{getRatingTitle(stats.rating)}</div>
            </div>
          </div>
          
          {stats.peak_rating > stats.rating && (
            <div className="peak-rating">
              Пик: {stats.peak_rating}
            </div>
          )}
        </div>
      </div>

      {/* Основная статистика */}
      <div className="stats-grid">
        <motion.div 
          className="stat-card wins"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <Trophy className="stat-icon" />
            <span className="stat-title">Победы</span>
          </div>
          <div className="stat-value">{stats.total_wins}</div>
          <div className="stat-details">
            Из {stats.total_games} игр
          </div>
        </motion.div>

        <motion.div 
          className="stat-card winrate"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <Target className="stat-icon" />
            <span className="stat-title">Винрейт</span>
          </div>
          <div className="stat-value">{(stats.win_rate * 100).toFixed(1)}%</div>
          <div className="stat-details">
            {stats.total_losses} поражений
          </div>
        </motion.div>

        <motion.div 
          className="stat-card games"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <Clock className="stat-icon" />
            <span className="stat-title">Время в игре</span>
          </div>
          <div className="stat-value">{formatTime(stats.total_game_time_ms)}</div>
          <div className="stat-details">
            Среднее: {formatTime(stats.average_game_time_ms)}
          </div>
        </motion.div>

        <motion.div 
          className="stat-card penki"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-header">
            <Zap className="stat-icon" />
            <span className="stat-title">Пеньки</span>
          </div>
          <div className="stat-value">{stats.total_penki_used}</div>
          <div className="stat-details">
            Активировано
          </div>
        </motion.div>
      </div>

      {/* Позиции в играх */}
      <div className="positions-section">
        <h3 className="section-title">Позиции в играх</h3>
        <div className="positions-grid">
          <div className="position-item first">
            <div className="position-icon">🥇</div>
            <div className="position-count">{stats.first_places}</div>
            <div className="position-label">1 место</div>
          </div>
          
          <div className="position-item second">
            <div className="position-icon">🥈</div>
            <div className="position-count">{stats.second_places}</div>
            <div className="position-label">2 место</div>
          </div>
          
          <div className="position-item third">
            <div className="position-icon">🥉</div>
            <div className="position-count">{stats.third_places}</div>
            <div className="position-label">3 место</div>
          </div>
          
          <div className="position-item fourth">
            <div className="position-icon">4️⃣</div>
            <div className="position-count">{stats.fourth_places}</div>
            <div className="position-label">4 место</div>
          </div>
        </div>
      </div>

      {/* Достижения */}
      {stats.achievements && stats.achievements.length > 0 && (
        <div className="achievements-section">
          <h3 className="section-title">
            <Award className="section-icon" />
            Достижения ({stats.achievements.length})
          </h3>
          <div className="achievements-grid">
            {stats.achievements.slice(0, 6).map((achievement, index) => (
              <motion.div 
                key={achievement.id}
                className="achievement-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="achievement-icon">🏆</div>
                <div className="achievement-info">
                  <div className="achievement-name">
                    {achievement.achievement_data?.name || achievement.achievement_type}
                  </div>
                  <div className="achievement-description">
                    {achievement.achievement_data?.description || 'Достижение разблокировано'}
                  </div>
                  <div className="achievement-date">
                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .player-stats {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 16px;
          padding: 1.5rem;
          color: #e2e8f0;
          min-height: 200px;
        }

        .loading, .error, .empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner-ring {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .error-message, .empty-message {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .error-icon, .empty-icon {
          font-size: 2rem;
        }

        .compact {
          padding: 1rem;
        }

        .compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .compact-stat {
          text-align: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .stat-icon {
          width: 20px;
          height: 20px;
          margin-bottom: 0.5rem;
          color: #6366f1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .stats-header {
          margin-bottom: 2rem;
        }

        .rating-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid;
          border-radius: 12px;
        }

        .rating-icon {
          width: 24px;
          height: 24px;
        }

        .rating-value {
          font-size: 1.8rem;
          font-weight: bold;
        }

        .rating-title {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .peak-rating {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .stat-title {
          font-weight: 500;
          color: #94a3b8;
        }

        .stat-card .stat-value {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .stat-details {
          font-size: 0.9rem;
          color: #64748b;
        }

        .wins .stat-icon { color: #22c55e; }
        .winrate .stat-icon { color: #3b82f6; }
        .games .stat-icon { color: #f59e0b; }
        .penki .stat-icon { color: #8b5cf6; }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #f1f5f9;
        }

        .section-icon {
          width: 20px;
          height: 20px;
        }

        .positions-section {
          margin-bottom: 2rem;
        }

        .positions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .position-item {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          transition: transform 0.2s ease;
        }

        .position-item:hover {
          transform: translateY(-2px);
        }

        .position-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .position-count {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .position-label {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .achievements-section {
          margin-bottom: 1rem;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .achievement-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .achievement-item:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        .achievement-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .achievement-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .achievement-description {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .achievement-date {
          font-size: 0.75rem;
          color: #64748b;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .player-stats {
            padding: 1rem;
          }

          .positions-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </motion.div>
  );
}
