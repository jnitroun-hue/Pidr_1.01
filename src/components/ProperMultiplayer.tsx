'use client';

import React, { useState, useEffect } from 'react';
import { WaitingRoomProfessional } from './WaitingRoomProfessional';
import { roomStorage } from '../utils/roomStorage';
import styles from './ProperMultiplayer.module.css';

interface Room {
  id: number;
  room_code: string;
  name: string;
  max_players: number;
  current_players: number;
  status: string;
  is_private: boolean;
  created_at: string;
  users?: { username: string; avatar?: string };
  players?: any[];
}

interface RoomData {
  id: number;
  code: string;
  name: string;
  host: string;
  hostId: string;
  maxPlayers: number;
  gameMode: string;
  hasPassword: boolean;
  isPrivate: boolean;
  status: 'waiting' | 'playing';
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    isBot: boolean;
    joinedAt: Date;
  }>;
  settings?: {
    autoStart: boolean;
    allowBots: boolean;
    minPlayers: number;
  };
}

interface User {
  id?: number;
  first_name?: string;
  username?: string;
  avatar?: string;
}

type ViewType = 'lobby' | 'create' | 'join' | 'waiting';

export const ProperMultiplayer: React.FC = () => {
  const [view, setView] = useState<ViewType>('lobby');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);

  // Форма создания комнаты
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [gameMode, setGameMode] = useState('casual');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Форма присоединения
  const [joinCode, setJoinCode] = useState('');

  // Загрузка пользователя при монтировании
  useEffect(() => {
    fetchUser();
  }, []);

  // Загрузка комнат при открытии лобби
  useEffect(() => {
    if (view === 'lobby') {
      fetchRooms();
    }
  }, [view]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        console.error('❌ Не удалось загрузить пользователя');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователя:', error);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms?type=public', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Загружены комнаты:', data.rooms?.length || 0);
        setRooms(data.rooms || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки комнат');
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки комнат:', error);
      setError(error.message || 'Не удалось загрузить комнаты');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Введите название комнаты');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          name: roomName,
          maxPlayers,
          gameMode,
          hasPassword,
          password: hasPassword ? password : null,
          isPrivate
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Комната создана:', data.room);

        // Создаем данные для комнаты ожидания
        const roomData: RoomData = {
          id: data.room.id,
          code: data.room.roomCode,
          name: data.room.name,
          host: user?.first_name || user?.username || 'Хост',
          hostId: user?.id?.toString() || 'host',
          maxPlayers,
          gameMode,
          hasPassword,
          isPrivate,
          status: 'waiting',
          players: [
            {
              id: user?.id?.toString() || 'host',
              name: user?.first_name || user?.username || 'Хост',
              isHost: true,
              isReady: true,
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

        setCurrentRoom(roomData);
        setView('waiting');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось создать комнату');
      }
    } catch (error: any) {
      console.error('❌ Ошибка создания комнаты:', error);
      setError(error.message || 'Не удалось создать комнату');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode?: string) => {
    const codeToUse = roomCode || joinCode;
    
    if (!codeToUse.trim()) {
      setError('Введите код комнаты');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'join',
          roomCode: codeToUse.toUpperCase(),
          password: hasPassword ? password : null
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Присоединились к комнате:', result.room);

        // Создаем данные для комнаты ожидания
        const roomData: RoomData = {
          id: result.room.id,
          code: result.room.roomCode,
          name: result.room.name,
          host: 'Хост',
          hostId: 'host_id',
          maxPlayers: 6,
          gameMode: 'casual',
          hasPassword: false,
          isPrivate: false,
          status: 'waiting',
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
              id: user?.id?.toString() || 'player',
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

        setCurrentRoom(roomData);
        setView('waiting');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось присоединиться к комнате');
      }
    } catch (error: any) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      setError(error.message || 'Не удалось присоединиться к комнате');
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
    alert('Игра начинается! (В разработке)');
  };

  const handleUpdateRoom = (updates: any) => {
    if (currentRoom) {
      setCurrentRoom({ ...currentRoom, ...updates });
    }
  };

  // Рендер комнаты ожидания
  if (view === 'waiting' && currentRoom) {
    return (
      <WaitingRoomProfessional
        room={currentRoom}
        onLeave={handleLeaveRoom}
        onStart={handleStartGame}
        onUpdate={handleUpdateRoom}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🎮 Мультиплеер P.I.D.R.</h1>
        <p className={styles.subtitle}>Играйте с друзьями онлайн</p>
      </div>

      {error && (
        <div className={styles.error}>
          ❌ {error}
        </div>
      )}

      {/* Лобби */}
      {view === 'lobby' && (
        <div className={styles.lobby}>
          <div className={styles.actions}>
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={() => setView('create')}
              disabled={loading}
            >
              🏠 Создать комнату
            </button>
            
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setView('join')}
              disabled={loading}
            >
              🚪 Присоединиться
            </button>
          </div>

          <div className={styles.roomsList}>
            <h3 className={styles.sectionTitle}>Открытые комнаты</h3>
            
            {loading ? (
              <div className={styles.loading}>⏳ Загрузка комнат...</div>
            ) : rooms.length === 0 ? (
              <div className={styles.empty}>
                <p>🏚️ Нет открытых комнат</p>
                <p>Создайте первую комнату!</p>
              </div>
            ) : (
              <div className={styles.rooms}>
                {rooms.map((room) => (
                  <div key={room.id} className={styles.roomCard}>
                    <div className={styles.roomInfo}>
                      <h4 className={styles.roomName}>{room.name}</h4>
                      <p className={styles.roomDetails}>
                        👥 {room.current_players}/{room.max_players} игроков
                      </p>
                      <p className={styles.roomCode}>Код: {room.room_code}</p>
                    </div>
                    
                    <button 
                      className={`${styles.button} ${styles.join}`}
                      onClick={() => handleJoinRoom(room.room_code)}
                      disabled={loading || room.current_players >= room.max_players}
                    >
                      {room.current_players >= room.max_players ? '🔒 Заполнена' : '🚪 Войти'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Создание комнаты */}
      {view === 'create' && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>🏠 Создание комнаты</h3>
          
          <div className={styles.field}>
            <label className={styles.label}>Название комнаты</label>
            <input
              type="text"
              className={styles.input}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Моя крутая комната"
              maxLength={50}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Максимум игроков</label>
            <select
              className={styles.select}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              <option value={2}>2 игрока</option>
              <option value={3}>3 игрока</option>
              <option value={4}>4 игрока</option>
              <option value={5}>5 игроков</option>
              <option value={6}>6 игроков</option>
              <option value={7}>7 игроков</option>
              <option value={8}>8 игроков</option>
              <option value={9}>9 игроков</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Режим игры</label>
            <select
              className={styles.select}
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
            >
              <option value="casual">Обычная игра</option>
              <option value="ranked">Рейтинговая</option>
              <option value="tournament">Турнир</option>
            </select>
          </div>

          <div className={styles.checkboxes}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
              />
              <span>🔒 Установить пароль</span>
            </label>

            {hasPassword && (
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                maxLength={20}
              />
            )}

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span>👁️ Приватная комната</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setView('lobby')}
              disabled={loading}
            >
              ← Назад
            </button>
            
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={handleCreateRoom}
              disabled={loading || !roomName.trim()}
            >
              {loading ? '⏳ Создание...' : '🏠 Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Присоединение к комнате */}
      {view === 'join' && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>🚪 Присоединение к комнате</h3>
          
          <div className={styles.field}>
            <label className={styles.label}>Код комнаты</label>
            <input
              type="text"
              className={styles.input}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Введите код комнаты"
              maxLength={6}
            />
          </div>

          {hasPassword && (
            <div className={styles.field}>
              <label className={styles.label}>Пароль</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                maxLength={20}
              />
            </div>
          )}

          <div className={styles.formActions}>
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setView('lobby')}
              disabled={loading}
            >
              ← Назад
            </button>
            
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={() => handleJoinRoom()}
              disabled={loading || !joinCode.trim()}
            >
              {loading ? '⏳ Подключение...' : '🚪 Присоединиться'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProperMultiplayer;
