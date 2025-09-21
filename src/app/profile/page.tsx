'use client'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Users, User, Star, Award, Target, Camera, Upload, Wallet } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import GameWallet from '../../components/GameWallet';

export default function ProfilePage() {
  const [stats, setStats] = useState({
    rating: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    achievements: [
      { id: 1, name: 'Первая победа', description: 'Выиграйте свою первую игру', unlocked: false, icon: Trophy },
      { id: 2, name: 'Ветеран', description: 'Сыграйте 100 игр', unlocked: false, icon: Medal },
      { id: 3, name: 'Мастер', description: 'Выиграйте 50 игр', unlocked: false, icon: Award },
      { id: 4, name: 'Легенда', description: 'Достигните рейтинга 2000', unlocked: false, icon: Star }
    ]
  });

  const [user, setUser] = useState<any>(null);

  const [avatarUrl, setAvatarUrl] = useState('😎');
  const [activeSection, setActiveSection] = useState('stats'); // 'stats', 'achievements', 'wallet'

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Создаем URL для предварительного просмотра
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAvatarUrl(result);
        // Сохраняем в localStorage (в будущем будет загрузка на сервер и сохранение в БД)
        localStorage.setItem('userAvatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Загружаем сохраненный аватар и данные пользователя при инициализации
  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
    
    // Загружаем данные пользователя
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setStats(prev => ({
          ...prev,
          rating: parsedUser.rating || 0,
          gamesPlayed: parsedUser.gamesPlayed || 0,
          wins: parsedUser.gamesWon || 0,
          losses: Math.max(0, (parsedUser.gamesPlayed || 0) - (parsedUser.gamesWon || 0)),
          winRate: parsedUser.gamesPlayed > 0 
            ? Math.round(((parsedUser.gamesWon || 0) / parsedUser.gamesPlayed) * 100) 
            : 0
        }));
      } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
      }
    }
  }, []);
  
  const handleBalanceUpdate = (newBalance: number) => {
    // Обновляем баланс в localStorage и в состоянии пользователя
    if (user) {
      const updatedUser = { ...user, coins: newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Диспатчим событие для обновления в других компонентах
      window.dispatchEvent(new CustomEvent('coinsUpdated', { 
        detail: { coins: newBalance } 
      }));
    }
  };

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">ПРОФИЛЬ</span>
          <div className="w-6"></div>
        </div>

        {/* Profile Card */}
        <motion.div 
          className="profile-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="profile-avatar">
            {avatarUrl.startsWith('data:') || avatarUrl.startsWith('http') ? (
              <img src={avatarUrl} alt="Avatar" className="profile-avatar-image" />
            ) : (
              <span className="profile-avatar-emoji">{avatarUrl}</span>
            )}
          </div>
          <h2 className="profile-name">Игрок</h2>
          <p className="profile-status">🟢 Онлайн</p>
          
          {/* Avatar and Friends Buttons */}
          <div className="profile-buttons">
            {/* Friends Button */}
            <motion.button 
              className="friends-button"
              onClick={() => window.location.href = '/friends'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="friends-icon" />
              <span>ДРУЗЬЯ</span>
            </motion.button>

            {/* Change Avatar Button */}
            <motion.div className="avatar-change-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <motion.label
                htmlFor="avatar-upload"
                className="avatar-change-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Camera className="avatar-change-icon" />
                <span>АВАТАР</span>
              </motion.label>
            </motion.div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="profile-nav"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            margin: '20px 0',
            padding: '0 20px'
          }}
        >
          <button
            onClick={() => setActiveSection('stats')}
            className={`nav-tab ${activeSection === 'stats' ? 'active' : ''}`}
            style={{
              background: activeSection === 'stats' ? 
                'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'stats' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'stats' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Target size={16} />
            Статистика
          </button>
          
          <button
            onClick={() => setActiveSection('achievements')}
            className={`nav-tab ${activeSection === 'achievements' ? 'active' : ''}`}
            style={{
              background: activeSection === 'achievements' ? 
                'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'achievements' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'achievements' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Award size={16} />
            Достижения
          </button>
          
          <button
            onClick={() => setActiveSection('wallet')}
            className={`nav-tab ${activeSection === 'wallet' ? 'active' : ''}`}
            style={{
              background: activeSection === 'wallet' ? 
                'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'wallet' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'wallet' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Wallet size={16} />
            Кошелек
          </button>
        </motion.div>

        {/* Content Sections */}
        {activeSection === 'stats' && (
          <motion.div 
            className="stats-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="stats-title">СТАТИСТИКА</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value rating">{stats.rating}</div>
                <div className="stat-label">Рейтинг</div>
              </div>
              <div className="stat-card">
                <div className="stat-value games">{stats.gamesPlayed}</div>
                <div className="stat-label">Игр сыграно</div>
              </div>
              <div className="stat-card">
                <div className="stat-value wins">{stats.wins}</div>
                <div className="stat-label">Побед</div>
              </div>
              <div className="stat-card">
                <div className="stat-value losses">{stats.losses}</div>
                <div className="stat-label">Поражений</div>
              </div>
              <div className="stat-card full-width">
                <div className="stat-value winrate">{stats.winRate}%</div>
                <div className="stat-label">Процент побед</div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'achievements' && (
          <motion.div 
            className="achievements-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="achievements-header">
              <h3 className="achievements-title">ДОСТИЖЕНИЯ</h3>
            </div>
            
            <div className="achievements-grid">
              {stats.achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <motion.div 
                    key={achievement.id}
                    className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                  >
                    <div className="achievement-icon">
                      <IconComponent className="achievement-icon-svg" />
                    </div>
                    <div className="achievement-info">
                      <h4 className="achievement-name">{achievement.name}</h4>
                      <p className="achievement-description">{achievement.description}</p>
                    </div>
                    {achievement.unlocked && (
                      <div className="achievement-badge">✓</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSection === 'wallet' && (
          <motion.div 
            className="wallet-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '0 20px', marginBottom: '100px' }}
          >
            <GameWallet user={user} onBalanceUpdate={handleBalanceUpdate} />
          </motion.div>
        )}

        <BottomNav />
      </div>
    </div>
  );
} 