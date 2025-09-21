'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Hash, Crown, Clock, Zap, 
  Shield, ShieldOff, Play, Copy, Share2,
  ArrowLeft, Bot, Star, Gamepad2, Trophy,
  Wifi, WifiOff, Eye, EyeOff
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useWebSocket } from '../hooks/useWebSocket';
import styles from './NeonMainMenu.module.css';

interface ProfessionalMultiplayerProps {
  onBack: () => void;
}

interface Room {
  id: string;
  code: string;
  name: string;
  host: string;
  players: number;
  maxPlayers: number;
  gameMode: 'casual' | 'competitive' | 'pro' | 'blitz';
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
    color: '#39ff14',
    gradient: 'linear-gradient(135deg, #39ff14, #2ecc71)',
    description: 'Для новичков',
    maxPlayers: 6,
    difficulty: 'easy' as const
  },
  competitive: {
    name: 'Соревновательный', 
    icon: <Trophy size={24} />,
    color: '#00ffff',
    gradient: 'linear-gradient(135deg, #00ffff, #3498db)',
    description: 'С рейтингом',
    maxPlayers: 8,
    difficulty: 'medium' as const
  },
  pro: {
    name: 'Профессиональный',
    icon: <Crown size={24} />,
    color: '#ff6600',
    gradient: 'linear-gradient(135deg, #ff6600, #e67e22)',
    description: 'Для мастеров',
    maxPlayers: 8,
    difficulty: 'hard' as const
  },
  blitz: {
    name: 'Блиц',
    icon: <Zap size={24} />,
    color: '#ff0080',
    gradient: 'linear-gradient(135deg, #ff0080, #e91e63)',
    description: 'Молниеносно',
    maxPlayers: 9,
    difficulty: 'hard' as const
  }
};

export default function ProfessionalMultiplayer({ onBack }: ProfessionalMultiplayerProps) {
  const { user } = useTelegram();
  const { socket, isConnected } = useWebSocket({ autoConnect: true });
  
  const [view, setView] = useState<'lobby' | 'create' | 'join'>('lobby');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Load rooms
  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRooms(data.rooms || []);
          }
        }
      } catch (err) {
        console.warn('Using fallback data:', err);
        // Fallback mock data
        setRooms([
          {
            id: '1',
            code: 'GAME01',
            name: 'Комната Новичков',
            host: 'Алекс',
            players: 3,
            maxPlayers: 6,
            gameMode: 'casual',
            hasPassword: false,
            isPrivate: false,
            status: 'waiting',
            ping: 45,
            difficulty: 'easy'
          },
          {
            id: '2', 
            code: 'PRO777',
            name: 'Турнир Мастеров',
            host: 'Мария',
            players: 6,
            maxPlayers: 8,
            gameMode: 'pro',
            hasPassword: true,
            isPrivate: false,
            status: 'playing',
            ping: 23,
            difficulty: 'hard'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

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
        setView('lobby');
      } else {
        throw new Error(result.error || 'Не удалось создать комнату');
      }
      
    } catch (err: any) {
      setError(err.message || 'Ошибка создания комнаты');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, password?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // ИСПРАВЛЕНО: Используем основную базу данных
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
        console.log('✅ Joined room:', result.room);
        setView('lobby');
      } else {
        throw new Error(result.error || 'Не удалось войти в комнату');
      }
      
    } catch (err: any) {
      setError(err.message || 'Ошибка входа в комнату');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#39ff14';
      case 'medium': return '#00ffff'; 
      case 'hard': return '#ff0080';
      default: return '#ffffff';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#39ff14';
      case 'playing': return '#ff6600';
      case 'full': return '#ff0080';
      default: return '#ffffff';
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
    <div className={styles.neonContainer}>
      <div className={styles.particles} />
      
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <button 
            onClick={view === 'lobby' ? onBack : () => setView('lobby')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
            <span>{view === 'lobby' ? 'Главное меню' : 'Назад'}</span>
          </button>
          <h1 className={styles.title}>
            {view === 'lobby' && 'Мультиплеер'}
            {view === 'create' && 'Создать комнату'}
            {view === 'join' && 'Присоединиться'}
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi size={20} className="text-green-400" />
            ) : (
              <WifiOff size={20} className="text-red-400" />
            )}
          </div>
        </div>

        {/* Create Room View */}
        {view === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6 mt-6"
          >
            {/* Room Name */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Название комнаты</h3>
              <input
                type="text"
                placeholder="Введите название комнаты"
                value={createData.name}
                onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                maxLength={30}
              />
            </div>

            {/* Game Mode */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Режим игры</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(gameModesConfig).map(([mode, config]) => (
                  <button
                    key={mode}
                    onClick={() => setCreateData(prev => ({ 
                      ...prev, 
                      gameMode: mode as any,
                      maxPlayers: config.maxPlayers 
                    }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      createData.gameMode === mode
                        ? 'border-white bg-white/20 scale-105'
                        : 'border-white/30 hover:border-white/50 hover:bg-white/10'
                    }`}
                    style={{ 
                      background: createData.gameMode === mode ? config.gradient : undefined,
                      opacity: createData.gameMode === mode ? 0.9 : 1
                    }}
                  >
                    <div className="flex items-center gap-3 text-white">
                      {config.icon}
                      <div className="text-left">
                        <div className="font-semibold">{config.name}</div>
                        <div className="text-sm opacity-80">{config.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Настройки</h3>
              
              <div className="space-y-4">
                {/* Max Players */}
                <div>
                  <label className="text-white/80 text-sm mb-2 block">
                    Максимум игроков: {createData.maxPlayers}
                  </label>
                  <input
                    type="range"
                    min="4"
                    max={gameModesConfig[createData.gameMode].maxPlayers}
                    value={createData.maxPlayers}
                    onChange={(e) => setCreateData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Password Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-white">Защитить паролем</span>
                  <button
                    onClick={() => setCreateData(prev => ({ ...prev, hasPassword: !prev.hasPassword }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      createData.hasPassword ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      createData.hasPassword ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {createData.hasPassword && (
                  <input
                    type="password"
                    placeholder="Пароль (4-12 символов)"
                    value={createData.password}
                    onChange={(e) => setCreateData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={12}
                  />
                )}
              </div>
            </div>

            {/* Create Button */}
            <motion.button
              onClick={handleCreateRoom}
              disabled={loading || !createData.name.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                  Создание...
                </>
              ) : (
                <>
                  <Play size={24} />
                  Создать комнату
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Join Room View */}
        {view === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6 mt-6"
          >
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Код комнаты</h3>
              <input
                type="text"
                placeholder="Введите код комнаты"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>

            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Пароль (если требуется)</h3>
              <input
                type="password"
                placeholder="Введите пароль"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <motion.button
              onClick={() => handleJoinRoom(joinCode, joinPassword)}
              disabled={loading || joinCode.length < 4}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                  Подключение...
                </>
              ) : (
                <>
                  <Hash size={24} />
                  Присоединиться
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Main Lobby View */}
        {view === 'lobby' && (
          <>
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full grid grid-cols-2 gap-4 mt-6"
            >
              <motion.button
                onClick={() => setView('create')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Plus size={24} />
                Создать комнату
              </motion.button>

              <motion.button
                onClick={() => setView('join')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Hash size={24} />
                По коду
              </motion.button>
            </motion.div>

            {/* Rooms List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-xl">Активные комнаты</h2>
                <div className="text-white/60 text-sm">{rooms.length} комнат</div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {rooms.map((room, index) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleJoinRoom(room.code)}
                      className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer hover:bg-black/60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Game Mode Icon */}
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: gameModesConfig[room.gameMode].gradient }}
                          >
                            {gameModesConfig[room.gameMode].icon}
                          </div>

                          {/* Room Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold">{room.name}</h3>
                              {room.hasPassword && <Shield size={16} className="text-orange-400" />}
                              {room.isPrivate && <EyeOff size={16} className="text-purple-400" />}
                            </div>
                            <div className="text-white/60 text-sm">
                              Хост: {room.host} • {gameModesConfig[room.gameMode].name}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="text-white/80 text-sm">
                                {room.players}/{room.maxPlayers} игроков
                              </div>
                              <div 
                                className="text-sm font-medium"
                                style={{ color: getStatusColor(room.status) }}
                              >
                                {getStatusText(room.status)}
                              </div>
                              <div className="text-white/60 text-sm">
                                {room.ping}ms
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Room Code */}
                        <div className="text-right">
                          <div className="bg-white/20 px-3 py-1 rounded-lg font-mono text-white text-sm">
                            {room.code}
                          </div>
                          <div 
                            className="text-xs mt-1"
                            style={{ color: getDifficultyColor(room.difficulty) }}
                          >
                            {room.difficulty === 'easy' && 'Легкий'}
                            {room.difficulty === 'medium' && 'Средний'}
                            {room.difficulty === 'hard' && 'Сложный'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {rooms.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Gamepad2 size={64} className="text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">Нет активных комнат</p>
                  <p className="text-white/40 text-sm">Создайте первую комнату!</p>
                </motion.div>
              )}
            </motion.div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-red-500/20 border border-red-500 rounded-xl p-4 mt-4"
          >
            <p className="text-red-300 text-center">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}