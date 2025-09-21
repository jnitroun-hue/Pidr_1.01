'use client'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Hash, Users, Crown, Play, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

interface MultiplayerMenuProps {
  onCreateRoom: (roomData: any) => void;
  onJoinRoom: (roomData: any) => void;
  onBack: () => void;
}

interface RoomData {
  roomId: string;
  roomCode: string;
  maxPlayers: number;
  hostUserId: string;
}

type MenuView = 'main' | 'create' | 'join';

export default function MultiplayerMenu({ onCreateRoom, onJoinRoom, onBack }: MultiplayerMenuProps) {
  const { user } = useTelegram();
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Состояние для создания комнаты
  const [createRoomData, setCreateRoomData] = useState({
    maxPlayers: 4,
    gameMode: 'classic',
    allowBots: true,
    isPrivate: false
  });

  // Состояние для присоединения к комнате
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Очистка сообщений через 5 секунд
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Создать новую комнату
  const handleCreateRoom = async () => {
    if (!user?.id) {
      setError('Не удалось получить информацию о пользователе');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏠 [MultiplayerMenu] Создание комнаты...');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostUserId: user.id.toString(),
          maxPlayers: createRoomData.maxPlayers,
          gameMode: createRoomData.gameMode,
          allowBots: createRoomData.allowBots,
          isPrivate: createRoomData.isPrivate
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания комнаты');
      }

      const roomData: RoomData = await response.json();
      console.log('✅ [MultiplayerMenu] Комната создана:', roomData);

      setSuccess(`Комната создана! Код: ${roomData.roomCode}`);
      
      // Переходим в лобби
      setTimeout(() => {
        onCreateRoom(roomData);
      }, 1000);

    } catch (err) {
      console.error('❌ [MultiplayerMenu] Ошибка создания комнаты:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Присоединиться к существующей комнате
  const handleJoinRoom = async () => {
    if (!user?.id || !joinRoomCode.trim()) {
      setError('Введите код комнаты');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🚪 [MultiplayerMenu] Присоединение к комнате: ${joinRoomCode}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: joinRoomCode.toUpperCase(),
          userId: user.id.toString(),
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          photoUrl: (user as any).photo_url
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка присоединения к комнате');
      }

      const roomData: RoomData = await response.json();
      console.log('✅ [MultiplayerMenu] Присоединились к комнате:', roomData);

      setSuccess(`Присоединились к комнате ${roomData.roomCode}!`);
      
      // Переходим в лобби
      setTimeout(() => {
        onJoinRoom(roomData);
      }, 1000);

    } catch (err) {
      console.error('❌ [MultiplayerMenu] Ошибка присоединения:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Обработка ввода кода комнаты
  const handleRoomCodeInput = (value: string) => {
    // Ограничиваем до 6 символов и только буквы/цифры
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinRoomCode(cleanValue);
  };

  return (
    <div className="multiplayer-menu">
      <div className="menu-container">
        {/* Заголовок */}
        <motion.div 
          className="menu-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Users className="menu-icon" />
          <h1 className="menu-title">Мультиплеер</h1>
          <p className="menu-subtitle">Играйте с друзьями в P.I.D.R. онлайн</p>
        </motion.div>

        {/* Главное меню */}
        {currentView === 'main' && (
          <motion.div 
            className="main-menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <motion.button
              className="menu-option create-room"
              onClick={() => setCurrentView('create')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="option-icon">
                <Plus />
              </div>
              <div className="option-content">
                <h3>Создать комнату</h3>
                <p>Создайте новую игру и пригласите друзей</p>
              </div>
              <Crown className="host-indicator" />
            </motion.button>

            <motion.button
              className="menu-option join-room"
              onClick={() => setCurrentView('join')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="option-icon">
                <Hash />
              </div>
              <div className="option-content">
                <h3>Присоединиться</h3>
                <p>Введите код комнаты от друга</p>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Создание комнаты */}
        {currentView === 'create' && (
          <motion.div 
            className="create-room-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="form-header">
              <h2>Создание комнаты</h2>
              <p>Настройте параметры игры</p>
            </div>

            <div className="form-content">
              <div className="form-group">
                <label>Максимум игроков:</label>
                <select 
                  value={createRoomData.maxPlayers}
                  onChange={(e) => setCreateRoomData(prev => ({ 
                    ...prev, 
                    maxPlayers: parseInt(e.target.value) 
                  }))}
                >
                  <option value={4}>4 игрока</option>
                  <option value={5}>5 игроков</option>
                  <option value={6}>6 игроков</option>
                  <option value={8}>8 игроков</option>
                  <option value={9}>9 игроков</option>
                </select>
              </div>

              <div className="form-group">
                <label>Режим игры:</label>
                <select 
                  value={createRoomData.gameMode}
                  onChange={(e) => setCreateRoomData(prev => ({ 
                    ...prev, 
                    gameMode: e.target.value 
                  }))}
                >
                  <option value="classic">Классический P.I.D.R.</option>
                  <option value="fast">Быстрая игра</option>
                  <option value="tournament">Турнирный режим</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createRoomData.allowBots}
                    onChange={(e) => setCreateRoomData(prev => ({ 
                      ...prev, 
                      allowBots: e.target.checked 
                    }))}
                  />
                  <span className="checkmark"></span>
                  Разрешить добавление ботов
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createRoomData.isPrivate}
                    onChange={(e) => setCreateRoomData(prev => ({ 
                      ...prev, 
                      isPrivate: e.target.checked 
                    }))}
                  />
                  <span className="checkmark"></span>
                  Приватная комната
                </label>
              </div>
            </div>

            <div className="form-actions">
              <motion.button
                className="create-button"
                onClick={handleCreateRoom}
                disabled={loading}
                whileHover={!loading ? { scale: 1.05 } : {}}
                whileTap={!loading ? { scale: 0.95 } : {}}
              >
                {loading ? (
                  <>
                    <Loader2 className="loading-spinner" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Plus />
                    Создать комнату
                  </>
                )}
              </motion.button>

              <motion.button
                className="back-button"
                onClick={() => setCurrentView('main')}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Назад
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Присоединение к комнате */}
        {currentView === 'join' && (
          <motion.div 
            className="join-room-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="form-header">
              <h2>Присоединиться к игре</h2>
              <p>Введите код комнаты от друга</p>
            </div>

            <div className="form-content">
              <div className="form-group">
                <label>Код комнаты:</label>
                <div className="room-code-input">
                  <Hash className="input-icon" />
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => handleRoomCodeInput(e.target.value)}
                    placeholder="ABC123"
                    maxLength={6}
                    className="code-input"
                  />
                </div>
                <p className="input-hint">Код состоит из 6 символов</p>
              </div>
            </div>

            <div className="form-actions">
              <motion.button
                className="join-button"
                onClick={handleJoinRoom}
                disabled={loading || joinRoomCode.length < 3}
                whileHover={!loading && joinRoomCode.length >= 3 ? { scale: 1.05 } : {}}
                whileTap={!loading && joinRoomCode.length >= 3 ? { scale: 0.95 } : {}}
              >
                {loading ? (
                  <>
                    <Loader2 className="loading-spinner" />
                    Подключение...
                  </>
                ) : (
                  <>
                    <Play />
                    Присоединиться
                  </>
                )}
              </motion.button>

              <motion.button
                className="back-button"
                onClick={() => setCurrentView('main')}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Назад
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Уведомления */}
        {error && (
          <motion.div 
            className="notification error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertCircle className="notification-icon" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            className="notification success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CheckCircle className="notification-icon" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Кнопка назад в главное меню */}
        {currentView === 'main' && (
          <motion.button
            className="main-back-button"
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            ← Главное меню
          </motion.button>
        )}
      </div>
    </div>
  );
}
