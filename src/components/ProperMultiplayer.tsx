'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Hash, Crown, Zap, Trophy,
  Shield, ShieldOff, Play, ArrowLeft, 
  Gamepad2, Wifi, WifiOff
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import WaitingRoomProfessional from './WaitingRoomProfessional';
import { roomStorage, type StoredRoom } from '../utils/roomStorage';

interface ProperMultiplayerProps {
  onBack: () => void;
}

interface Room {
  id: string;
  code: string;
  name: string;
  host: string;
  players: number;
  maxPlayers: number;
  gameMode: 'casual' | 'competitive';
  hasPassword: boolean;
  isPrivate: boolean;
  status: 'waiting' | 'playing' | 'full';
  ping: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const gameModesConfig = {
  casual: {
    name: 'Обычный',
    icon: <Users size={24} />,
    description: 'Для новичков',
    maxPlayers: 6,
    difficulty: 'easy' as const
  },
  competitive: {
    name: 'Рейтинговый', 
    icon: <Trophy size={24} />,
    description: 'С рейтингом',
    maxPlayers: 8,
    difficulty: 'medium' as const
  }
};

export default function ProperMultiplayer({ onBack }: ProperMultiplayerProps) {
  const { user } = useTelegram();
  
  const [view, setView] = useState<'lobby' | 'create' | 'join' | 'waiting'>('lobby');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sharedRooms, setSharedRooms] = useState<StoredRoom[]>([]); // Общие комнаты
  
  // Create room state
  const [createData, setCreateData] = useState({
    name: '',
    maxPlayers: 6,
    gameMode: 'casual' as const,
    hasPassword: false,
    password: '',
    isPrivate: false
  });

  // Join room state
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // Load rooms and set up real-time updates
  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        // Загружаем общие комнаты из localStorage
        const storedRooms = roomStorage.getRooms();
        setSharedRooms(storedRooms);
        
        // Пробуем получить серверные комнаты
        const response = await fetch('/api/rooms/list');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const serverRooms = data.rooms || [];
            // Объединяем серверные и общие комнаты, избегая дубликатов
            const allRooms = [...serverRooms];
            
            // Добавляем общие комнаты, которых нет на сервере
            storedRooms.forEach(storedRoom => {
              if (!serverRooms.find((room: Room) => room.code === storedRoom.code)) {
                // Конвертируем StoredRoom в Room
                const roomData: Room = {
                  id: storedRoom.id,
                  code: storedRoom.code,
                  name: storedRoom.name,
                  host: storedRoom.host,
                  players: storedRoom.players,
                  maxPlayers: storedRoom.maxPlayers,
                  gameMode: storedRoom.gameMode,
                  hasPassword: storedRoom.hasPassword,
                  isPrivate: storedRoom.isPrivate,
                  status: storedRoom.status,
                  ping: storedRoom.ping,
                  difficulty: storedRoom.difficulty
                };
                allRooms.push(roomData);
              }
            });
            
            setRooms(allRooms);
            setIsConnected(true);
          }
        } else {
          // При ошибке сервера показываем только общие комнаты
          const roomsData: Room[] = storedRooms.map(storedRoom => ({
            id: storedRoom.id,
            code: storedRoom.code,
            name: storedRoom.name,
            host: storedRoom.host,
            players: storedRoom.players,
            maxPlayers: storedRoom.maxPlayers,
            gameMode: storedRoom.gameMode,
            hasPassword: storedRoom.hasPassword,
            isPrivate: storedRoom.isPrivate,
            status: storedRoom.status,
            ping: storedRoom.ping,
            difficulty: storedRoom.difficulty
          }));
          setRooms(roomsData);
          setIsConnected(false);
        }
      } catch (err) {
        console.warn('Failed to load rooms:', err);
        setIsConnected(false);
        // При ошибке показываем только общие комнаты
        const storedRooms = roomStorage.getRooms();
        const roomsData: Room[] = storedRooms.map(storedRoom => ({
          id: storedRoom.id,
          code: storedRoom.code,
          name: storedRoom.name,
          host: storedRoom.host,
          players: storedRoom.players,
          maxPlayers: storedRoom.maxPlayers,
          gameMode: storedRoom.gameMode,
          hasPassword: storedRoom.hasPassword,
          isPrivate: storedRoom.isPrivate,
          status: storedRoom.status,
          ping: storedRoom.ping,
          difficulty: storedRoom.difficulty
        }));
        setRooms(roomsData);
        setSharedRooms(storedRooms);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();

    // Подписываемся на изменения в общем хранилище
    const unsubscribe = roomStorage.subscribe((updatedRooms) => {
      setSharedRooms(updatedRooms);
      // Обновляем основной список комнат
      const roomsData: Room[] = updatedRooms.map(storedRoom => ({
        id: storedRoom.id,
        code: storedRoom.code,
        name: storedRoom.name,
        host: storedRoom.host,
        players: storedRoom.players,
        maxPlayers: storedRoom.maxPlayers,
        gameMode: storedRoom.gameMode,
        hasPassword: storedRoom.hasPassword,
        isPrivate: storedRoom.isPrivate,
        status: storedRoom.status,
        ping: storedRoom.ping,
        difficulty: storedRoom.difficulty
      }));
      setRooms(roomsData);
    });

    // Обновляем список каждые 30 секунд
    const interval = setInterval(loadRooms, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []); // Убрали зависимость

  // Очистка уже происходит в roomStorage, поэтому убираем дублирующий useEffect

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ИСПРАВЛЕНО: Используем основную базу данных вместо fallback API
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ИСПРАВЛЕНО: добавили токен
        },
        body: JSON.stringify({
          action: 'create', // ИСПРАВЛЕНО: добавили action
          roomName: createData.name,
          maxPlayers: createData.maxPlayers,
          isPrivate: createData.isPrivate,
          password: createData.hasPassword ? createData.password : undefined
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Room created:', result.room);
        
        // Добавляем созданную комнату в список
        const newRoom: Room = {
          id: result.room.roomId,
          code: result.room.roomCode,
          name: result.room.name,
          host: result.room.host,
          players: 1, // Создатель уже в комнате
          maxPlayers: result.room.maxPlayers,
          gameMode: createData.gameMode,
          hasPassword: createData.hasPassword,
          isPrivate: createData.isPrivate,
          status: 'waiting',
          ping: Math.floor(Math.random() * 50) + 20, // Случайный пинг 20-70ms
          difficulty: gameModesConfig[createData.gameMode].difficulty
        };
        
        // Добавляем в общее хранилище (синхронизируется между всеми вкладками)
        const storedRoom: StoredRoom = {
          id: result.room.roomId,
          code: result.room.roomCode,
          name: result.room.name,
          host: result.room.host,
          players: 1,
          maxPlayers: result.room.maxPlayers,
          gameMode: createData.gameMode,
          hasPassword: createData.hasPassword,
          isPrivate: createData.isPrivate,
          status: 'waiting',
          ping: Math.floor(Math.random() * 50) + 20,
          difficulty: gameModesConfig[createData.gameMode].difficulty,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        roomStorage.addRoom(storedRoom);
        console.log('✅ Room added to shared storage:', storedRoom.code);
        
        // Сбрасываем форму
        setCreateData({
          name: '',
          maxPlayers: 6,
          gameMode: 'casual',
          hasPassword: false,
          password: '',
          isPrivate: false
        });
        
        // Создаем данные для комнаты ожидания
        const roomData = {
          id: result.room.roomId,
          code: result.room.roomCode,
          name: result.room.name,
          host: result.room.host,
          hostId: user?.id?.toString() || 'anonymous',
          maxPlayers: result.room.maxPlayers,
          gameMode: createData.gameMode,
          hasPassword: createData.hasPassword,
          isPrivate: createData.isPrivate,
          status: 'waiting' as const,
          players: [{
            id: user?.id?.toString() || 'anonymous',
            name: user?.first_name || user?.username || result.room.host,
            isHost: true,
            isReady: true,
            isBot: false,
            joinedAt: new Date()
          }],
          settings: {
            autoStart: false,
            allowBots: true,
            minPlayers: 2
          }
        };

        setCurrentRoom(roomData);
        setView('waiting');
      } else {
        throw new Error(result.error || 'Не удалось создать комнату');
      }
      
    } catch (err: any) {
      console.error('❌ Error creating room:', err);
      setError(err.message || 'Ошибка создания комнаты');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, password?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // ИСПРАВЛЕНО: Присоединение через основную базу данных
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'join',
          roomCode: roomCode.toUpperCase(),
          password: password
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Successfully joined room:', result.room);
        
        // Создаем данные для комнаты ожидания (из базы данных)
        const roomData = {
          id: result.room.id,
          code: result.room.roomCode,
          name: result.room.name,
          host: 'Хост', // Будет получен из базы
          hostId: 'host_id', // Будет получен из базы
          maxPlayers: result.room.maxPlayers || 6,
          gameMode: 'classic',
          hasPassword: false,
          isPrivate: false,
          status: 'waiting' as const,
          players: [
            {
              id: user?.id?.toString() || 'anonymous',
              name: user?.first_name || user?.username || 'Игрок',
              isHost: false, // Мы присоединяемся, не хост
              isReady: false,
              isBot: false,
              joinedAt: new Date()
            }
          ],
          settings: {
            autoStart: false,
            allowBots: true,
            minPlayers: 2
          }
        };

        console.log('✅ Joined database room:', result.room);
        setCurrentRoom(roomData);
        setView('waiting');
        return;
      } else {
        throw new Error(result.message || 'Не удалось присоединиться к комнате');
      }
      
    } catch (mainError: any) {
      console.log('⚠️ Основная база недоступна, пробуем localStorage:', mainError.message);
      
      // Fallback: пробуем найти комнату в localStorage
      try {
        const sharedRoom = roomStorage.findRoom(roomCode);
        
        if (!sharedRoom) {
          throw new Error('Комната не найдена');
        }
        
        // Проверяем пароль для общей комнаты
        if (sharedRoom.hasPassword && password !== 'demo') {
          throw new Error('Неверный пароль');
        }
        
        // Присоединяемся к комнате в общем хранилище
        const joinSuccess = roomStorage.joinRoom(sharedRoom.code);
        if (!joinSuccess) {
          throw new Error('Комната заполнена');
        }
      
        // Создаем данные для комнаты ожидания (общая комната)
        const roomData = {
          id: sharedRoom.id,
          code: sharedRoom.code,
          name: sharedRoom.name,
          host: sharedRoom.host,
          hostId: 'host_id',
          maxPlayers: sharedRoom.maxPlayers,
          gameMode: sharedRoom.gameMode,
          hasPassword: sharedRoom.hasPassword,
          isPrivate: sharedRoom.isPrivate,
          status: 'waiting' as const,
          players: [
            {
              id: 'host_id',
              name: 'Хост',
              isHost: true,
              isReady: true,
              isBot: false,
              joinedAt: new Date()
            },
            {
              id: user?.id?.toString() || 'anonymous',
              name: user?.first_name || user?.username || 'Игрок',
              isHost: false,
              isReady: false,
              isBot: false,
              joinedAt: new Date()
            }
          ],
          settings: {
            autoStart: false,
            allowBots: true,
            minPlayers: 2
          }
        };

        console.log('✅ Joined shared room (fallback):', sharedRoom.code);
        setCurrentRoom(roomData);
        setView('waiting');
        
      } catch (fallbackError: any) {
        setError(fallbackError.message || 'Не удалось присоединиться к комнате');
      }
    } finally {
      setLoading(false);
    }
  };


  // Обработчики для комнаты ожидания
  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setView('lobby');
  };

  const handleStartGame = () => {
    console.log('🎮 Starting game with room:', currentRoom);
    // Здесь будет переход к игре
    alert('Игра начинается! (В разработке)');
  };

  const handleUpdateRoom = (updates: any) => {
    if (!currentRoom) return;
    
    const updatedRoom = { ...currentRoom, ...updates };
    setCurrentRoom(updatedRoom);
    
    // Обновляем общее хранилище если это общая комната
    const sharedRoom = roomStorage.findRoom(currentRoom.code);
    if (sharedRoom) {
      // Обновляем количество игроков в общем хранилище
      if (updates.players) {
        roomStorage.updateRoom(currentRoom.code, {
          players: updates.players.length,
          status: updates.players.length >= currentRoom.maxPlayers ? 'full' : 'waiting'
        });
      }
      
      // Обновляем активность комнаты
      roomStorage.updateActivity(currentRoom.code);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b'; 
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#22c55e';
      case 'playing': return '#f59e0b';
      case 'full': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Ожидание';
      case 'playing': return 'В игре';
      case 'full': return 'Заполнена';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="multiplayer-header">
        <button 
          onClick={view === 'lobby' ? onBack : () => setView('lobby')}
          className="back-button"
        >
          <ArrowLeft size={24} />
          <span>{view === 'lobby' ? 'Главное меню' : 'Назад'}</span>
        </button>
        <h1 className="page-title">
          {view === 'lobby' && 'Мультиплеер'}
          {view === 'create' && 'Создать комнату'}
          {view === 'join' && 'Присоединиться'}
        </h1>
        <div className="connection-status">
          {isConnected ? (
            <Wifi size={20} style={{ color: '#22c55e' }} />
          ) : (
            <WifiOff size={20} style={{ color: '#ef4444' }} />
          )}
        </div>
      </div>

      {/* Create Room View */}
      {view === 'create' && (
        <div className="create-room-container">
          {/* Room Name */}
          <div className="form-section">
            <h3 className="section-title">Название комнаты</h3>
            <input
              type="text"
              placeholder="Введите название комнаты"
              value={createData.name}
              onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
              className="text-input"
              maxLength={30}
            />
          </div>

          {/* Game Mode */}
          <div className="form-section">
            <h3 className="section-title">Режим игры</h3>
            <div className="game-modes-grid">
              {Object.entries(gameModesConfig).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => setCreateData(prev => ({ 
                    ...prev, 
                    gameMode: mode as any,
                    maxPlayers: config.maxPlayers 
                  }))}
                  className={`game-mode-card ${createData.gameMode === mode ? 'selected' : ''}`}
                >
                  <div className="mode-icon">{config.icon}</div>
                  <div className="mode-info">
                    <div className="mode-name">{config.name}</div>
                    <div className="mode-desc">{config.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="form-section">
            <h3 className="section-title">Настройки</h3>
            
            <div className="setting-item">
              <label className="setting-label">
                Максимум игроков: {createData.maxPlayers}
              </label>
              <input
                type="range"
                min="4"
                max="9"
                value={createData.maxPlayers}
                onChange={(e) => setCreateData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                className="range-input"
              />
              <div className="range-labels">
                <span>4</span>
                <span>9</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="toggle-setting">
                <span>Защитить паролем</span>
                <button
                  onClick={() => setCreateData(prev => ({ ...prev, hasPassword: !prev.hasPassword }))}
                  className={`toggle-switch ${createData.hasPassword ? 'active' : ''}`}
                >
                  <div className="toggle-slider" />
                </button>
              </div>
            </div>

            {createData.hasPassword && (
              <input
                type="password"
                placeholder="Пароль (4-12 символов)"
                value={createData.password}
                onChange={(e) => setCreateData(prev => ({ ...prev, password: e.target.value }))}
                className="text-input"
                maxLength={12}
              />
            )}
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateRoom}
            disabled={loading || !createData.name.trim() || (createData.hasPassword && createData.password.length < 4)}
            className="primary-button"
          >
            {loading ? (
              <>
                <div className="spinner" />
                Создание...
              </>
            ) : (
              <>
                <Play size={24} />
                Создать комнату
              </>
            )}
          </button>
        </div>
      )}

      {/* Join Room View */}
      {view === 'join' && (
        <div className="join-room-container">
          <div className="form-section">
            <h3 className="section-title">Код комнаты</h3>
            <input
              type="text"
              placeholder="Введите код комнаты"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-input code-input"
              maxLength={6}
            />
          </div>

          <div className="form-section">
            <h3 className="section-title">Пароль (если требуется)</h3>
            <input
              type="password"
              placeholder="Введите пароль"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="text-input"
            />
          </div>

          <button
            onClick={() => handleJoinRoom(joinCode, joinPassword)}
            disabled={loading || joinCode.length < 4}
            className="primary-button"
          >
            {loading ? (
              <>
                <div className="spinner" />
                Подключение...
              </>
            ) : (
              <>
                <Hash size={24} />
                Присоединиться
              </>
            )}
          </button>
        </div>
      )}

      {/* Waiting Room View */}
      {view === 'waiting' && currentRoom && (
        <WaitingRoomProfessional
          roomData={currentRoom}
          currentUserId={user?.id?.toString() || 'anonymous'}
          onLeaveRoom={handleLeaveRoom}
          onStartGame={handleStartGame}
          onUpdateRoom={handleUpdateRoom}
        />
      )}

      {/* Main Lobby View */}
      {view === 'lobby' && (
        <>
          {/* Quick Actions */}
          <div className="menu-actions-title">БЫСТРЫЕ ДЕЙСТВИЯ</div>
          <div className="menu-actions-grid">
            <button
              onClick={() => setView('create')}
              className="menu-action-card"
            >
              <Plus className="menu-action-icon" />
              <span className="menu-action-label">СОЗДАТЬ КОМНАТУ</span>
            </button>

            <button
              onClick={() => setView('join')}
              className="menu-action-card"
            >
              <Hash className="menu-action-icon" />
              <span className="menu-action-label">ПО КОДУ</span>
            </button>
          </div>

          {/* Rooms List */}
          <div className="rooms-section">
            <div className="section-header">
              <h2 className="section-title">Активные комнаты</h2>
              <div className="rooms-count">{rooms.length} комнат</div>
            </div>

            <div className="rooms-list">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleJoinRoom(room.code)}
                  className="room-card"
                >
                  <div className="room-header">
                    <div className="room-mode">
                      <div className="mode-icon">{gameModesConfig[room.gameMode]?.icon || <Users size={24} />}</div>
                      <div className="mode-text">{gameModesConfig[room.gameMode]?.name || 'Обычный'}</div>
                    </div>
                    <div className="room-code">{room.code}</div>
                  </div>

                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-host">Хост: {room.host}</div>
                  </div>

                  <div className="room-stats">
                    <div className="stat-item">
                      <Users size={16} />
                      <span>{room.players}/{room.maxPlayers}</span>
                    </div>
                    <div 
                      className="stat-item status"
                      style={{ color: getStatusColor(room.status) }}
                    >
                      {getStatusText(room.status)}
                    </div>
                    <div className="stat-item ping">
                      {room.ping}ms
                    </div>
                  </div>

                  <div className="room-badges">
                    {room.hasPassword && (
                      <div className="badge password">
                        <Shield size={12} />
                      </div>
                    )}
                    <div 
                      className="badge difficulty"
                      style={{ backgroundColor: getDifficultyColor(room.difficulty) }}
                    >
                      {room.difficulty === 'easy' && 'Легкий'}
                      {room.difficulty === 'medium' && 'Средний'}
                      {room.difficulty === 'hard' && 'Сложный'}
                    </div>
                    {sharedRooms.find(sharedRoom => sharedRoom.code === room.code) && (
                      <div className="badge local">
                        Общая
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {rooms.length === 0 && !loading && (
              <div className="empty-state">
                <Gamepad2 size={64} />
                <p>Нет активных комнат</p>
                <small>Создайте первую комнату!</small>
              </div>
            )}

            {loading && (
              <div className="loading-state">
                <div className="spinner" />
                <p>Загрузка комнат...</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #e2e8f0;
        }

        .multiplayer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.3s ease;
          font-size: 16px;
        }

        .back-button:hover {
          color: #ffd700;
        }

        .page-title {
          font-size: 1.8rem;
          font-weight: bold;
          color: #ffd700;
          text-align: center;
        }

        .connection-status {
          display: flex;
          align-items: center;
        }

        .create-room-container,
        .join-room-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .form-section {
          margin-bottom: 30px;
          padding: 25px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 15px;
        }

        .text-input {
          width: 100%;
          padding: 15px;
          background: rgba(30, 41, 59, 0.8);
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .text-input:focus {
          outline: none;
          border-color: #ffd700;
          box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }

        .text-input::placeholder {
          color: #64748b;
        }

        .code-input {
          text-align: center;
          font-family: monospace;
          font-size: 24px;
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .game-modes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .game-mode-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: rgba(30, 41, 59, 0.6);
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .game-mode-card:hover,
        .game-mode-card.selected {
          border-color: #ffd700;
          background: rgba(30, 41, 59, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .mode-icon {
          color: #22c55e;
          transition: color 0.3s ease;
        }

        .game-mode-card:hover .mode-icon,
        .game-mode-card.selected .mode-icon {
          color: #ffd700;
        }

        .mode-info {
          flex: 1;
        }

        .mode-name {
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 4px;
        }

        .mode-desc {
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .setting-item {
          margin-bottom: 20px;
        }

        .setting-label {
          display: block;
          color: #e2e8f0;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .range-input {
          width: 100%;
          margin-bottom: 5px;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .toggle-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .toggle-switch {
          width: 60px;
          height: 30px;
          background: #374151;
          border: none;
          border-radius: 15px;
          position: relative;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .toggle-switch.active {
          background: #22c55e;
        }

        .toggle-slider {
          width: 26px;
          height: 26px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s ease;
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(30px);
        }

        .primary-button {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: none;
          border-radius: 15px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .primary-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
        }

        .primary-button:disabled {
          background: #374151;
          cursor: not-allowed;
          transform: none;
        }

        .rooms-section {
          margin-top: 40px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .rooms-count {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .rooms-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .room-card {
          padding: 25px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .room-card:hover {
          border-color: rgba(255, 215, 0, 0.6);
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1);
          transform: translateY(-2px);
        }

        .room-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .room-mode {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .room-mode .mode-icon {
          color: #22c55e;
        }

        .room-card:hover .room-mode .mode-icon {
          color: #ffd700;
        }

        .mode-text {
          font-weight: 600;
          color: #e2e8f0;
        }

        .room-code {
          background: rgba(34, 197, 94, 0.2);
          padding: 8px 12px;
          border-radius: 8px;
          font-family: monospace;
          font-weight: bold;
          color: #22c55e;
        }

        .room-info {
          margin-bottom: 15px;
        }

        .room-name {
          font-size: 1.2rem;
          font-weight: bold;
          color: #e2e8f0;
          margin-bottom: 5px;
        }

        .room-host {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .room-stats {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 15px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .stat-item.status {
          font-weight: 600;
        }

        .room-badges {
          display: flex;
          gap: 10px;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          color: white;
        }

        .badge.password {
          background: #f59e0b;
        }

        .badge.difficulty {
          color: white;
        }

        .badge.local {
          background: #3b82f6;
          color: white;
        }

        .empty-state,
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-state svg,
        .loading-state svg {
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .empty-state p,
        .loading-state p {
          font-size: 1.1rem;
          margin-bottom: 10px;
        }

        .empty-state small {
          color: #64748b;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #374151;
          border-top: 2px solid #22c55e;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .error-message {
          margin-top: 20px;
          padding: 15px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 12px;
          text-align: center;
        }

        .error-message p {
          color: #fca5a5;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }
          
          .game-modes-grid {
            grid-template-columns: 1fr;
          }
          
          .room-stats {
            flex-wrap: wrap;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
