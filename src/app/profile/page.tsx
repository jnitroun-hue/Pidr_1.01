'use client'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Users, User, Star, Award, Target, Camera, Upload, Wallet, Palette, Sparkles, Gift } from 'lucide-react';
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

  // ✅ ИСПРАВЛЕНО: Загружаем данные пользователя из Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('👤 Загружаем данные пользователя из базы...');
        
        // Сначала берем базовые данные из localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          console.log('👤 Базовые данные пользователя загружены:', parsedUser.username);
        }
        
        // Затем загружаем актуальный баланс из базы
        const response = await fetch('/api/user/balance', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const { balance, user: userInfo } = result.data;
            console.log('💰 Актуальный баланс из базы:', balance);
            
            setUserCoins(balance);
            
            // Обновляем пользователя с актуальными данными
            if (userInfo) {
              setUser(prev => ({
                ...prev,
                ...userInfo,
                coins: balance
              }));
              
              // Синхронизируем localStorage с актуальными данными
              const updatedUser = { ...JSON.parse(userData || '{}'), coins: balance };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } else {
            console.warn('⚠️ Не удалось загрузить баланс:', result.message);
            // Используем баланс из localStorage как fallback
            if (userData) {
              const parsedUser = JSON.parse(userData);
              setUserCoins(parsedUser.coins || 1000);
            }
          }
        } else {
          console.warn('⚠️ API баланса недоступен, используем локальные данные');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUserCoins(parsedUser.coins || 1000);
          }
        }
        
      } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        // Fallback к localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setUserCoins(parsedUser.coins || 1000);
        }
      }
    };
    
    loadUserData();
  }, []);
  const [activeSection, setActiveSection] = useState('stats'); // 'stats', 'achievements', 'wallet'
  const [showModal, setShowModal] = useState<'skins' | 'effects' | 'bonuses' | null>(null);
  const [selectedSkin, setSelectedSkin] = useState('classic');
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [userCoins, setUserCoins] = useState(1000); // Начальный баланс

  // Скины для карт
  const cardSkins = [
    {
      id: 'classic',
      name: 'Классический',
      description: 'Стандартные карты',
      preview: '🂡',
      price: 0,
      unlocked: true,
      rarity: 'common'
    },
    {
      id: 'royal',
      name: 'Королевский',
      description: 'Элегантные золотые карты',
      preview: '👑',
      price: 500,
      unlocked: false,
      rarity: 'rare'
    },
    {
      id: 'neon',
      name: 'Неоновый',
      description: 'Светящиеся карты в стиле киберпанк',
      preview: '⚡',
      price: 750,
      unlocked: false,
      rarity: 'epic'
    },
    {
      id: 'cosmic',
      name: 'Космический',
      description: 'Карты с эффектом звездного неба',
      preview: '🌌',
      price: 1000,
      unlocked: false,
      rarity: 'legendary'
    }
  ];

  // Эффекты для игры
  const gameEffects = [
    {
      id: 'none',
      name: 'Без эффектов',
      description: 'Стандартная игра',
      preview: '🎴',
      price: 0,
      unlocked: true
    },
    {
      id: 'particles',
      name: 'Частицы',
      description: 'Красивые частицы при ходах',
      preview: '✨',
      price: 200,
      unlocked: false
    },
    {
      id: 'lightning',
      name: 'Молнии',
      description: 'Эффект молний при победе',
      preview: '⚡',
      price: 350,
      unlocked: false
    },
    {
      id: 'fire',
      name: 'Огонь',
      description: 'Огненные эффекты при взятии карт',
      preview: '🔥',
      price: 500,
      unlocked: false
    }
  ];

  // Бонусы
  const bonuses = [
    {
      id: 'daily',
      name: 'Ежедневный бонус',
      description: 'Получайте монеты каждый день',
      reward: '50-200 монет',
      icon: '📅',
      available: true,
      cooldown: '22:30:15'
    },
    {
      id: 'referral',
      name: 'Реферальная система',
      description: 'Приглашайте друзей и получайте бонусы',
      reward: '100 монет за друга',
      icon: '👥',
      available: true,
      referrals: 3
    },
    {
      id: 'rank_up',
      name: 'Повышение ранга',
      description: 'Бонусы за достижение новых рангов',
      reward: '500-2000 монет',
      icon: '🏆',
      available: false,
      nextRank: 'Серебро'
    }
  ];

  // ✅ ИСПРАВЛЕНО: Обработка получения бонусов через Supabase API
  const handleBonusClick = async (bonusId: string) => {
    console.log('🎁 Получение бонуса через API:', bonusId);
    
    try {
      // Получаем токен авторизации
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
        
      if (!token) {
        alert('❌ Ошибка авторизации. Перезапустите приложение.');
        return;
      }
      
      console.log('🔑 Отправляем запрос на получение бонуса...');
      
      // Отправляем запрос на API
      const response = await fetch('/api/bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Включаем cookies
        body: JSON.stringify({
          bonusType: bonusId
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Ошибка сервера');
      }
      
      if (result.success) {
        const { bonusAmount, newBalance, description } = result.data;
        
        console.log(`✅ Бонус получен: +${bonusAmount} монет`);
        
        // Обновляем локальный баланс для UI
        setUserCoins(newBalance);
        
        // Обновляем данные пользователя в localStorage (только для UI)
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          user.coins = newBalance;
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        // Отправляем событие обновления баланса
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: newBalance } 
        }));
        
        // Показываем уведомление
        alert(`🎉 ${description}!\nПолучено: ${bonusAmount} монет\nНовый баланс: ${newBalance.toLocaleString()}`);
        
        console.log(`✅ Бонус "${bonusId}" успешно получен через API`);
        
      } else {
        throw new Error(result.message || 'Неизвестная ошибка');
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка получения бонуса:', error);
      alert(`❌ Ошибка: ${error.message || 'Не удалось получить бонус'}`);
    }
  };

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
          <h2 className="profile-name">{user?.username || 'Игрок'}</h2>
          <p className="profile-status">🟢 Онлайн</p>
          <div style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            padding: '8px 16px',
            borderRadius: '12px',
            margin: '12px 0',
            textAlign: 'center',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            💰 {userCoins.toLocaleString()} монет
          </div>
          
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

        {/* Customization Buttons */}
        <motion.div 
          className="customization-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            width: '100%',
            margin: '20px 0',
            padding: '0 20px'
          }}
        >
          <h3 style={{
            color: '#b0b0b0',
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: '0 0 15px 0',
            letterSpacing: '1px',
            textAlign: 'center'
          }}>
            КАСТОМИЗАЦИЯ
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            width: '100%'
          }}>
            <motion.button
              onClick={() => setShowModal('skins')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(147, 51, 234, 0.6) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '16px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(126, 34, 206, 0.8) 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.8) 0%, rgba(147, 51, 234, 0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Palette style={{ fontSize: '1.5rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(168, 85, 247, 0.3))' }} />
              <span style={{ 
                color: '#e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                СКИНЫ
              </span>
            </motion.button>

            <motion.button
              onClick={() => setShowModal('effects')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '16px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(29, 78, 216, 0.8) 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Sparkles style={{ fontSize: '1.5rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }} />
              <span style={{ 
                color: '#e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                ЭФФЕКТЫ
              </span>
            </motion.button>

            <motion.button
              onClick={() => setShowModal('bonuses')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '16px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(22, 163, 74, 0.9) 0%, rgba(21, 128, 61, 0.8) 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Gift style={{ fontSize: '1.5rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.3))' }} />
              <span style={{ 
                color: '#e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                БОНУСЫ
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="profile-nav"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
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

      {/* Модальные окна */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Заголовок модального окна */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                {showModal === 'skins' && '🎨 СКИНЫ КАРТ'}
                {showModal === 'effects' && '✨ ИГРОВЫЕ ЭФФЕКТЫ'}
                {showModal === 'bonuses' && '🎁 БОНУСЫ'}
              </h3>
              <button
                onClick={() => setShowModal(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.8)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                Назад
              </button>
            </div>

            {/* Содержимое модального окна */}
            {showModal === 'skins' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {cardSkins.map((skin) => (
                  <motion.div
                    key={skin.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => skin.unlocked && setSelectedSkin(skin.id)}
                    style={{
                      background: selectedSkin === skin.id 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                        : skin.unlocked 
                          ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)'
                          : 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.4) 100%)',
                      border: selectedSkin === skin.id 
                        ? '2px solid rgba(34, 197, 94, 0.8)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: skin.unlocked ? 'pointer' : 'not-allowed',
                      opacity: skin.unlocked ? 1 : 0.6,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Индикатор редкости */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: skin.rarity === 'legendary' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                 skin.rarity === 'epic' ? 'linear-gradient(135deg, #a855f7, #9333ea)' :
                                 skin.rarity === 'rare' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                                 'linear-gradient(135deg, #6b7280, #4b5563)',
                      color: '#fff'
                    }}>
                      {skin.rarity === 'legendary' ? 'ЛЕГЕНДА' :
                       skin.rarity === 'epic' ? 'ЭПИК' :
                       skin.rarity === 'rare' ? 'РЕДКИЙ' : 'ОБЫЧНЫЙ'}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{skin.preview}</div>
                      <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                        {skin.name}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                        {skin.description}
                      </p>
                      
                      {skin.unlocked ? (
                        selectedSkin === skin.id ? (
                          <div style={{
                            background: 'rgba(34, 197, 94, 0.8)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            ✅ ВЫБРАН
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.8)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            👆 ВЫБРАТЬ
                          </div>
                        )
                      ) : (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          🔒 {skin.price} монет
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {showModal === 'effects' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {gameEffects.map((effect) => (
                  <motion.div
                    key={effect.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => effect.unlocked && setSelectedEffect(effect.id)}
                    style={{
                      background: selectedEffect === effect.id 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                        : effect.unlocked 
                          ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)'
                          : 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.4) 100%)',
                      border: selectedEffect === effect.id 
                        ? '2px solid rgba(34, 197, 94, 0.8)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: effect.unlocked ? 'pointer' : 'not-allowed',
                      opacity: effect.unlocked ? 1 : 0.6,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{effect.preview}</div>
                    <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                      {effect.name}
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                      {effect.description}
                    </p>
                    
                    {effect.unlocked ? (
                      selectedEffect === effect.id ? (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          ✅ АКТИВЕН
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(59, 130, 246, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          👆 ВЫБРАТЬ
                        </div>
                      )
                    ) : (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        🔒 {effect.price} монет
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {showModal === 'bonuses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bonuses.map((bonus) => (
                  <motion.div
                    key={bonus.id}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{ fontSize: '3rem' }}>{bonus.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#e2e8f0', fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                        {bonus.name}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 8px 0' }}>
                        {bonus.description}
                      </p>
                      <div style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: '600' }}>
                        💰 {bonus.reward}
                      </div>
                      
                      {bonus.id === 'daily' && bonus.available && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          ⏰ Следующий бонус через: {bonus.cooldown}
                        </div>
                      )}
                      
                      {bonus.id === 'referral' && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          👥 Приглашено друзей: {bonus.referrals}
                        </div>
                      )}
                      
                      {bonus.id === 'rank_up' && !bonus.available && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          🎯 Следующий ранг: {bonus.nextRank}
                        </div>
                      )}
                    </div>
                    <div>
                      {bonus.available ? (
                        <button
                          onClick={() => handleBonusClick(bonus.id)}
                          style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            borderRadius: '12px',
                            color: '#fff',
                            padding: '12px 20px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 1) 0%, rgba(22, 163, 74, 0.8) 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)';
                          }}
                        >
                          {bonus.id === 'daily' ? '🎁 ПОЛУЧИТЬ' : 
                           bonus.id === 'referral' ? '👥 ПРИГЛАСИТЬ' : 
                           '🏆 ПОЛУЧИТЬ'}
                        </button>
                      ) : (
                        <div style={{
                          background: 'rgba(55, 65, 81, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          color: '#94a3b8',
                          padding: '12px 20px',
                          fontWeight: '600',
                          fontSize: '0.9rem'
                        }}>
                          🔒 НЕДОСТУПНО
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
} 