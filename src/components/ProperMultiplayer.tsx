'use client';

import React, { useState, useEffect } from 'react';
import MultiplayerLobby from './MultiplayerLobby'; // ✅ ИСПОЛЬЗУЕМ НОВЫЙ КОМПОНЕНТ!
import ReplaceRoomModal from './ReplaceRoomModal';
import MultiplayerAccessModal from './MultiplayerAccessModal';
import styles from './ProperMultiplayer.module.css';
import { supabase } from '../lib/supabase';
import { getApiHeaders, mergeApiHeaders } from '@/lib/api-headers';
import { resolveLobbyUserId } from '@/lib/multiplayer/public-user-id';
import { useLanguage } from './LanguageSwitcher';
import { useTranslations } from '@/lib/i18n/translations';
import PageLoadingScreen from '@/components/PageLoadingScreen';

interface Room {
  id: number;
  room_code: string;
  name: string;
  max_players: number;
  current_players: number;
  status: string;
  is_private: boolean;
  hasPassword?: boolean;
  created_at: string;
  users?: { username: string; avatar?: string };
  players?: any[];
}

interface RoomData {
  id: string;
  code: string;
  name: string;
  host: string;
  hostId: string;
  maxPlayers: number;
  gameMode: 'casual' | 'competitive'; // Точно как в WaitingRoomProfessional
  hasPassword: boolean;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'playing'; // Добавил 'starting'
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    isBot: boolean;
    avatar?: string;
    joinedAt: Date;
  }>;
  settings: { // Убрал ? - обязательное поле
    autoStart: boolean;
    allowBots: boolean;
    minPlayers: number;
  };
}

interface User {
  id?: number;
  telegramId?: string | number;
  first_name?: string;
  username?: string;
  avatar?: string;
}

type ViewType = 'lobby' | 'create' | 'join' | 'waiting';

export const ProperMultiplayer: React.FC = () => {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [view, setView] = useState<ViewType>('lobby');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null); // Для отслеживания текущей комнаты
  const [playerPosition, setPlayerPosition] = useState<number | null>(null); // Позиция игрока
  
  // ✅ ПРОВЕРКА ДОСТУПА К МУЛЬТИПЛЕЕРУ
  const [gamesPlayed, setGamesPlayed] = useState<number | null>(null);
  const [canPlayMultiplayer, setCanPlayMultiplayer] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Форма создания комнаты
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6); // ДЕФОЛТ 6 ИГРОКОВ
  const [gameMode, setGameMode] = useState('casual');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Форма присоединения
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  
  // Модалка замены комнаты
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingRoomData, setPendingRoomData] = useState<any>(null);
  const [existingRoom, setExistingRoom] = useState<{ name: string; code: string } | null>(null);

  // Загрузка пользователя при монтировании
  useEffect(() => {
    fetchUser();
  }, []);

  // ✅ ОБРАБОТКА ПРИГЛАШЕНИЯ В КОМНАТУ ИЗ URL
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;
    
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roomId');
    const roomCode = params.get('roomCode');
    
    if (roomId && roomCode) {
      console.log('🎮 [ProperMultiplayer] Обнаружено приглашение в комнату из URL:', { roomId, roomCode });
      // Автоматически присоединяемся к комнате
      handleJoinRoom(roomCode);
    }
  }, [user]);

  // Загрузка комнат в лобби и на экране присоединения
  useEffect(() => {
    if (view === 'lobby' || view === 'join') {
      if (view === 'lobby') {
        cleanupOldRooms();
      }
      fetchRooms();
      const interval = setInterval(fetchRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  // ✅ REALTIME ОБНОВЛЕНИЯ СПИСКА КОМНАТ
  useEffect(() => {
    if ((view !== 'lobby' && view !== 'join') || !accessChecked || !canPlayMultiplayer) {
      return;
    }

    const refreshRooms = () => {
      fetchRooms();
    };

    const channel = supabase
      .channel('multiplayer-lobby-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: '_pidr_rooms' }, refreshRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: '_pidr_room_players' }, refreshRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, accessChecked, canPlayMultiplayer]);

  // 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА СТАРЫХ КОМНАТ
  const cleanupOldRooms = async () => {
    try {
      console.log('🧹 [Multiplayer] Запускаем очистку комнат...');
      const telegramId = getTelegramId();
      const response = await fetch('/api/rooms/cleanup', {
        method: 'POST',
        credentials: 'include',
        headers: mergeApiHeaders(
          telegramId ? { 'x-telegram-id': telegramId } : undefined
        ),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Multiplayer] Очистка завершена! Удалено комнат: ${data.deleted_count}`);
      } else {
        console.error('❌ [Multiplayer] Ошибка очистки комнат');
      }
    } catch (error) {
      console.error('❌ [Multiplayer] Ошибка очистки:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: getApiHeaders(),
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

  const getTelegramId = () => {
    const telegramFromWebApp = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (telegramFromWebApp) {
      return String(telegramFromWebApp);
    }
    if (user?.telegramId) {
      return String(user.telegramId);
    }
    return '';
  };

  const fetchRooms = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms?type=public', {
        method: 'GET',
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store', // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
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
      setError(error.message || t.multiplayer.errLoadRooms);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Загружаем количество игр — НЕ ЖДЁМ fetchUser, сразу пробуем через Telegram headers
  useEffect(() => {
    const loadGamesCount = async () => {
      try {
        const response = await fetch('/api/user/bot-games', {
          method: 'GET',
          headers: getApiHeaders(),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGamesPlayed(data.gamesPlayed || 0);
            setCanPlayMultiplayer(Boolean(data.canPlayMultiplayer));
            if (!data.canPlayMultiplayer) {
              setShowAccessModal(true);
            }
          } else {
            setGamesPlayed(0);
            setCanPlayMultiplayer(false);
            setShowAccessModal(true);
          }
        } else {
          console.warn('⚠️ [ProperMultiplayer] bot-games вернул ошибку — блокируем доступ');
          setGamesPlayed(0);
          setCanPlayMultiplayer(false);
          setShowAccessModal(true);
        }
      } catch (error) {
        console.error('❌ [ProperMultiplayer] Ошибка загрузки игр:', error);
        setGamesPlayed(0);
        setCanPlayMultiplayer(false);
        setShowAccessModal(true);
      } finally {
        setAccessChecked(true);
      }
    };

    // Запускаем проверку сразу, не дожидаясь fetchUser
    loadGamesCount();
  }, []);

  const handleCreateRoom = async (forceReplace: boolean = false) => {
    if (!roomName.trim()) {
      setError(t.multiplayer.errNameRequired);
      return;
    }

    if (!user?.id) {
      setError(t.multiplayer.errAuth);
      return;
    }

    // ✅ ПРОВЕРКА ДОСТУПА
    if (!canPlayMultiplayer) {
      setShowAccessModal(true);
      return;
    }

    setLoading(true);
    setError('');

    console.log('🔍 ОТПРАВЛЯЕМ НА СЕРВЕР:', {
      action: 'create',
      name: roomName,
      maxPlayers,
      gameMode,
      type_maxPlayers: typeof maxPlayers,
      forceReplace
    });

    try {
      const telegramId = getTelegramId();
      const response = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: mergeApiHeaders(
          telegramId ? { 'x-telegram-id': telegramId } : undefined
        ),
        body: JSON.stringify({
          action: 'create',
          name: roomName,
          maxPlayers,
          gameMode,
          hasPassword,
          password: hasPassword ? password : null,
          isPrivate,
          forceReplace // ✅ ДОБАВЛЕНО для принудительной замены
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Комната создана:', data.room);

        // ✅ ЗАГРУЖАЕМ ВСЕ ДАННЫЕ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
        const roomId = data.room.id.toString();
        setCurrentRoomId(roomId);
        setPlayerPosition(data.room.position || 1);

        // Загружаем полные данные комнаты из БД
        const playersResponse = await fetch(`/api/rooms/${roomId}/players`, {
          method: 'GET',
          credentials: 'include',
          headers: mergeApiHeaders(),
          cache: 'no-store',
        });

        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          console.log('✅ Загружены игроки комнаты из БД:', playersData.players);
          
          // Загружаем информацию о комнате из БД
          const roomInfoResponse = await fetch(`/api/rooms/${roomId}`, {
            method: 'GET',
            credentials: 'include',
            headers: mergeApiHeaders(),
            cache: 'no-store',
          });

          let roomInfo: any = null;
          if (roomInfoResponse.ok) {
            const roomInfoData = await roomInfoResponse.json();
            roomInfo = roomInfoData.room;
          }

          const allPlayers = playersData.players.map((player: any) => ({
            id: player.user_id.toString(),
            name: player.username || 'Игрок',
            isHost: player.is_host || false,
            isReady: player.is_ready || false,
            isBot: false,
            avatar: player.avatar_url,
            joinedAt: new Date(player.joined_at || Date.now())
          }));

          const roomData: RoomData = {
            id: roomId,
            code: data.room.roomCode,
            name: roomInfo?.name || data.room.name || 'Новая комната',
            host: allPlayers.find((p: any) => p.isHost)?.name || user?.first_name || user?.username || 'Хост',
            hostId: allPlayers.find((p: any) => p.isHost)?.id || resolveLobbyUserId(user) || 'host',
            maxPlayers: roomInfo?.max_players || maxPlayers,
            gameMode: roomInfo?.settings?.gameMode === 'ranked' ? 'competitive' : 'casual',
            hasPassword: roomInfo?.password ? true : false,
            isPrivate: roomInfo?.is_private || false,
            status: roomInfo?.status || 'waiting',
            players: allPlayers, // ✅ ВСЕ ИГРОКИ ИЗ БД!
            settings: {
              autoStart: roomInfo?.settings?.autoStart || false,
              allowBots: roomInfo?.settings?.allowBots !== false,
              minPlayers: 4
            }
          };

          setCurrentRoom(roomData);
          setView('waiting');
          // ✅ ОБНОВЛЯЕМ СПИСОК КОМНАТ ПОСЛЕ СОЗДАНИЯ
          fetchRooms();
        } else {
          throw new Error(t.multiplayer.errRoomDb);
        }
      } else {
        const errorData = await response.json();
        
        // ✅ ПРОВЕРЯЕМ ЕСТЬ ЛИ АКТИВНАЯ КОМНАТА
        if (errorData.message && errorData.message.includes('уже есть активная комната') && errorData.currentRoom) {
          // Сохраняем данные для создания новой комнаты
          setPendingRoomData({
            name: roomName,
            maxPlayers,
            gameMode,
            hasPassword,
            password: hasPassword ? password : null,
            isPrivate
          });
          // Показываем модалку подтверждения
          setExistingRoom({
            name: errorData.currentRoom.name,
            code: errorData.currentRoom.room_code
          });
          setShowReplaceModal(true);
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.message || t.multiplayer.errCreateFallback);
      }
    } catch (error: any) {
      console.error('❌ Ошибка создания комнаты:', error);
      
      // Специальная обработка ошибки "уже в комнате"
      if (error.message && error.message.includes('уже есть активная комната')) {
        setError(error.message || t.multiplayer.errCreateFallback);
      } else {
        setError(error.message || t.multiplayer.errCreateFallback);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ ОБРАБОТЧИК ПОДТВЕРЖДЕНИЯ ЗАМЕНЫ КОМНАТЫ
  const handleConfirmReplace = async () => {
    setShowReplaceModal(false);
    if (pendingRoomData) {
      // Сначала выходим из текущей комнаты
      if (currentRoomId) {
        try {
          await fetch('/api/rooms', {
            method: 'POST',
            headers: mergeApiHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              action: 'leave',
              roomId: currentRoomId
            })
          });
        } catch (err) {
          console.error('❌ Ошибка выхода из комнаты:', err);
        }
      }
      // Затем создаем новую комнату
      await handleCreateRoom(true);
    }
    setPendingRoomData(null);
    setExistingRoom(null);
  };

  const handleJoinFromList = (room: Room) => {
    if (room.current_players >= room.max_players) return;

    if (room.hasPassword) {
      setJoinCode(room.room_code);
      setView('join');
      return;
    }

    void handleJoinRoom(room.room_code);
  };

  const renderOpenRoomsList = () => (
    <div className={styles.roomsList}>
      <div className={styles.roomsHeader}>
        <h3 className={styles.sectionTitle}>{t.multiplayer.openRooms}</h3>
        <button
          type="button"
          className={`${styles.button} ${styles.refresh}`}
          onClick={() => void fetchRooms()}
          disabled={loading}
          title={t.multiplayer.refreshTitle}
        >
          {loading ? `⏳ ${t.game.refresh}` : t.multiplayer.refresh}
        </button>
      </div>

      {loading && rooms.length === 0 ? (
        <PageLoadingScreen
          fullScreen={false}
          compact
          showProgress={false}
          title={t.multiplayer.pageTitle}
          subtitle={t.multiplayer.loadingRooms}
        />
      ) : rooms.length === 0 ? (
        <div className={styles.empty}>
          <p>{t.multiplayer.emptyTitle}</p>
          <p>{t.multiplayer.emptyHint}</p>
        </div>
      ) : (
        <div className={styles.rooms}>
          {rooms.map((room) => {
            const isFull = room.current_players >= room.max_players;
            return (
              <div key={room.id} className={styles.roomCard}>
                <div className={styles.roomInfo}>
                  <h4 className={styles.roomName}>
                    {room.name}
                    {room.is_private ? ' 🔒' : ''}
                    {room.hasPassword ? ' 🔑' : ''}
                  </h4>
                  <p className={styles.roomHost}>
                    {t.multiplayer.hostPrefix} {room.users?.username || t.multiplayer.unknownHost}
                  </p>
                  <p className={styles.roomDetails}>
                    👥 {room.current_players}/{room.max_players} {t.multiplayer.playersSuffix}
                  </p>
                  <p className={styles.roomCode}>{t.multiplayer.codeLabel} {room.room_code}</p>
                </div>

                <button
                  type="button"
                  className={`${styles.button} ${styles.join}`}
                  onClick={() => handleJoinFromList(room)}
                  disabled={loading || isFull}
                >
                  {isFull
                    ? t.multiplayer.roomFull
                    : room.hasPassword
                      ? `${t.multiplayer.join} 🔑`
                      : t.multiplayer.join}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const handleJoinRoom = async (roomCode?: string) => {
    const codeToUse = roomCode || joinCode;
    
    if (!codeToUse.trim()) {
      setError(t.multiplayer.errJoinCode);
      return;
    }

    // ✅ ПРОВЕРКА ДОСТУПА
    if (!canPlayMultiplayer) {
      setShowAccessModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const telegramId = getTelegramId();
      const response = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: mergeApiHeaders(
          telegramId ? { 'x-telegram-id': telegramId } : undefined
        ),
        body: JSON.stringify({
          action: 'join',
          roomCode: codeToUse.toUpperCase(),
          password: joinPassword || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Присоединились к комнате:', result.room);
        setJoinPassword('');
        
        // ✅ ЗАГРУЖАЕМ ВСЕ ДАННЫЕ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
        const roomId = result.room.id.toString();
        setCurrentRoomId(roomId);
        setPlayerPosition(result.room.position);

        // Загружаем всех игроков из БД
        const playersResponse = await fetch(`/api/rooms/${roomId}/players`, {
          method: 'GET',
          credentials: 'include',
          headers: mergeApiHeaders(),
          cache: 'no-store',
        });

        if (!playersResponse.ok) {
          throw new Error(t.multiplayer.errRoomDb);
        }

        const playersData = await playersResponse.json();
        console.log('✅ Загружены игроки комнаты из БД:', playersData.players);
        
        // Загружаем информацию о комнате из БД
        const roomInfoResponse = await fetch(`/api/rooms/${roomId}`, {
          method: 'GET',
          credentials: 'include',
          headers: mergeApiHeaders(),
          cache: 'no-store',
        });

        let roomInfo: any = null;
        if (roomInfoResponse.ok) {
          const roomInfoData = await roomInfoResponse.json();
          roomInfo = roomInfoData.room;
        }

        // ✅ ИСПРАВЛЕНО: Определяем ботов по user_id < 0 или is_bot из БД
        const allPlayers = playersData.players.map((player: any) => {
          const isBot = player.is_bot || (typeof player.user_id === 'number' && player.user_id < 0);
          return {
            id: player.user_id.toString(),
            name: player.username || 'Игрок',
            isHost: player.is_host || false, // ✅ ИСПОЛЬЗУЕМ is_host ИЗ БД!
            isReady: player.is_ready || false,
            isBot: isBot, // ✅ ИСПРАВЛЕНО: Определяем бота правильно
            avatar: player.avatar_url,
            joinedAt: new Date(player.joined_at || Date.now())
          };
        });

        const roomData: RoomData = {
          id: roomId,
          code: result.room.roomCode,
          name: roomInfo?.name || result.room.name || 'Комната',
          host: allPlayers.find((p: any) => p.isHost)?.name || 'Хост',
          hostId: allPlayers.find((p: any) => p.isHost)?.id || 'host_id',
          maxPlayers: roomInfo?.max_players || 6,
          gameMode: roomInfo?.settings?.gameMode === 'ranked' ? 'competitive' : 'casual',
          hasPassword: roomInfo?.password ? true : false,
          isPrivate: roomInfo?.is_private || false,
          status: roomInfo?.status || 'waiting',
          players: allPlayers, // ✅ ВСЕ ИГРОКИ ИЗ БД!
          settings: {
            autoStart: roomInfo?.settings?.autoStart || false,
            allowBots: roomInfo?.settings?.allowBots !== false,
            minPlayers: 4
          }
        };

        setCurrentRoom(roomData);
        setView('waiting');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || t.multiplayer.errJoinFallback);
      }
    } catch (error: any) {
      console.error('❌ Ошибка присоединения к комнате:', error);
      
      // Специальная обработка ошибок
      if (error.message && error.message.includes('уже находитесь в другой комнате')) {
        setError(`${error.message} ${t.multiplayer.inOtherRoomTail}`);
      } else if (error.message && error.message.includes('нет свободных мест')) {
        setError(t.multiplayer.errRoomFullMsg);
      } else {
        setError(error.message || t.multiplayer.errJoinFallback);
      }
    } finally {
      setLoading(false);
    }
  };

  // Обработчики для комнаты ожидания
  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    
    try {
      setLoading(true);
      
      // ОТПРАВЛЯЕМ ЗАПРОС НА ВЫХОД ИЗ КОМНАТЫ
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: mergeApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          action: 'leave',
          roomId: currentRoom.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Успешно вышли из комнаты');
      } else {
        console.error('❌ Ошибка выхода:', result.message);
      }
    } catch (error) {
      console.error('❌ Ошибка API выхода:', error);
    } finally {
      setLoading(false);
      // Очищаем состояние
      setCurrentRoom(null);
      setCurrentRoomId(null);
      setPlayerPosition(null);
      setView('lobby');
    }
  };
  
  // Функция для быстрого выхода из текущей комнаты
  const handleForceLeave = async () => {
    if (!currentRoomId) return;
    
    setLoading(true);
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: mergeApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          action: 'leave',
          roomId: currentRoomId
        })
      });
      
      setCurrentRoomId(null);
      setPlayerPosition(null);
      setError('');
      console.log('✅ Вышли из текущей комнаты');
    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (!currentRoom) return;
    const publicId = resolveLobbyUserId(user);
    const hostFlag = currentRoom.hostId === publicId ? '1' : '0';
    const params = new URLSearchParams({
      mode: 'multiplayer',
      roomId: String(currentRoom.id),
      roomCode: currentRoom.code,
      isHost: hostFlag,
    });
    window.location.href = `/game?${params.toString()}`;
  };

  const handleUpdateRoom = (updates: any) => {
    if (currentRoom) {
      setCurrentRoom({ ...currentRoom, ...updates });
    }
  };

  // ✅ БЛОКИРОВКА: Показываем ТОЛЬКО модалку доступа, если не прошли проверку
  if (!accessChecked) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8', fontSize: '16px' }}>
          ⏳ {t.multiplayer.accessChecking}
        </div>
      </div>
    );
  }

  if (!canPlayMultiplayer) {
    return (
      <div className={styles.container}>
        <MultiplayerAccessModal
          isOpen={true}
          gamesPlayed={gamesPlayed || 0}
          requiredGames={3}
          onClose={() => {
            if (typeof window !== 'undefined') window.history.back();
          }}
          onPlayBots={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
          }}
        />
      </div>
    );
  }

  // Рендер комнаты ожидания
  if (view === 'waiting' && currentRoom) {
    // ✅ isHost будет обновляться из БД в MultiplayerLobby через loadRoomPlayers
    return (
      <MultiplayerLobby
        roomId={currentRoom.id.toString()}
        roomCode={currentRoom.code}
        isHost={currentRoom.hostId === resolveLobbyUserId(user)}
        currentUserId={resolveLobbyUserId(user)}
        onGameStart={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => typeof window !== 'undefined' && window.history.back()}
        >
          {t.multiplayer.back}
        </button>
        <h1 className={styles.title}>{t.multiplayer.pageTitle}</h1>
        <p className={styles.subtitle}>{t.multiplayer.pageSubtitle}</p>
      </div>

      {error && (
        <div className={styles.error}>
          ❌ {error}
          {error.includes('уже находитесь в другой комнате') && currentRoomId && (
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleForceLeave}
              disabled={loading}
              style={{ marginTop: '10px', width: '100%' }}
            >
              {t.multiplayer.forceLeave}
            </button>
          )}
        </div>
      )}
      
      {playerPosition && (
        <div className={styles.info} style={{ 
          background: 'rgba(76, 175, 80, 0.1)', 
          padding: '12px', 
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center',
          color: '#4CAF50'
        }}>
          {t.multiplayer.yourPositionLabel} <strong>{playerPosition}</strong>
          {playerPosition === 1 && ` ${t.multiplayer.badgeHost}`}
        </div>
      )}

      {/* Лобби */}
      {view === 'lobby' && (
        <div className={styles.lobby}>
          <div className={styles.actions}>
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={() => {
                if (!canPlayMultiplayer) {
                  setShowAccessModal(true);
                  return;
                }
                setView('create');
              }}
              disabled={loading}
            >
              {t.multiplayer.lobbyCreateRoom}
            </button>
            
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => {
                if (!canPlayMultiplayer) {
                  setShowAccessModal(true);
                  return;
                }
                setView('join');
              }}
              disabled={loading}
            >
              {t.multiplayer.lobbyJoinRoom}
            </button>
          </div>

          {renderOpenRoomsList()}
        </div>
      )}

      {/* Создание комнаты */}
      {view === 'create' && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>{t.multiplayer.createTitle}</h3>
          
          <div className={styles.field}>
            <label className={styles.label}>{t.multiplayer.roomNameLabel}</label>
            <input
              type="text"
              className={styles.input}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t.multiplayer.roomNamePlaceholder}
              maxLength={50}
            />
          </div>

           <div className={styles.field}>
             <label className={styles.label}>{t.multiplayer.maxPlayersLabel}</label>
             <div className={styles.playerCards}>
               {[4, 5, 6, 7].map((num) => (
                 <button
                   key={num}
                   type="button"
                   className={`${styles.playerCard} ${maxPlayers === num ? styles.selected : ''}`}
                   onClick={() => setMaxPlayers(num)}
                 >
                   <div className={styles.cardNumber}>{num}</div>
                   <div className={styles.cardLabel}>{t.multiplayer.playersCardSuffix}</div>
                 </button>
               ))}
             </div>
           </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.multiplayer.gameModeLabel}</label>
            <select
              className={styles.select}
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
            >
              <option value="casual">{t.multiplayer.casual}</option>
              <option value="ranked">{t.multiplayer.ranked}</option>
              <option value="tournament">{t.multiplayer.tournament}</option>
            </select>
          </div>

          <div className={styles.checkboxes}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
              />
              <span>{t.multiplayer.setPassword}</span>
            </label>

            {hasPassword && (
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.multiplayer.passwordPlaceholder}
                maxLength={20}
              />
            )}

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span>{t.multiplayer.privateRoom}</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setView('lobby')}
              disabled={loading}
            >
              ← {t.common.back}
            </button>
            
            <button 
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => handleCreateRoom(false)}
              disabled={loading || !roomName.trim()}
            >
              {loading ? t.multiplayer.creating : t.multiplayer.createSubmit}
            </button>
          </div>
        </div>
      )}

      {/* Присоединение к комнате */}
      {view === 'join' && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>{t.multiplayer.joinTitle}</h3>
          
          <div className={styles.field}>
            <label className={styles.label}>{t.multiplayer.joinCodeLabel}</label>
            <input
              type="text"
              className={styles.input}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t.multiplayer.joinCodePlaceholder}
              maxLength={6}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.multiplayer.joinPassLabel}</label>
            <input
              type="password"
              className={styles.input}
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder={t.multiplayer.joinPassPlaceholder}
              maxLength={20}
            />
          </div>

          <div className={styles.formActions}>
            <button 
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setView('lobby')}
              disabled={loading}
            >
              ← {t.common.back}
            </button>
            
            <button 
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => handleJoinRoom()}
              disabled={loading || !joinCode.trim()}
            >
              {loading ? t.multiplayer.joining : t.multiplayer.joinSubmit}
            </button>
          </div>

          {renderOpenRoomsList()}
        </div>
      )}
      {showReplaceModal && existingRoom && (
        <ReplaceRoomModal
          isOpen={showReplaceModal}
          onClose={() => {
            setShowReplaceModal(false);
            setPendingRoomData(null);
            setExistingRoom(null);
          }}
          onConfirm={handleConfirmReplace}
          currentRoomName={existingRoom.name}
          currentRoomCode={existingRoom.code}
        />
      )}

      {/* ✅ МОДАЛКА БЛОКИРОВКИ ДОСТУПА К МУЛЬТИПЛЕЕРУ */}
      <MultiplayerAccessModal
        isOpen={showAccessModal}
        gamesPlayed={gamesPlayed || 0}
        requiredGames={3}
        onClose={() => {
          setShowAccessModal(false);
          if (!canPlayMultiplayer) {
            if (typeof window !== 'undefined') window.history.back();
          }
        }}
        onPlayBots={() => {
          setShowAccessModal(false);
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }}
      />
    </div>
  );
};

export default ProperMultiplayer;
