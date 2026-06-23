'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, Crown, Play, Clock, Wifi, WifiOff, UserPlus, Bot } from 'lucide-react';
import { RoomManager } from '../lib/multiplayer/room-manager';
import InviteFriendsModal from './InviteFriendsModal';
import { getApiHeaders } from '@/lib/api-headers';
import lobbyStyles from './MultiplayerLobby.module.css';
import { canStartRoom } from '@/lib/multiplayer/room-rules';

interface MultiplayerLobbyProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  currentUserId: string;
  onGameStart: (gameSettings: any) => void;
  onLeaveRoom: () => void;
}

interface LobbyPlayer {
  user_id: string;
  username: string;
  position: number;
  is_ready: boolean;
  is_host?: boolean;
  is_bot?: boolean;
  avatar_url?: string;
}

function isBotPlayer(player: LobbyPlayer): boolean {
  const id = String(player.user_id ?? '');
  return player.is_bot === true || id.startsWith('-') || Number(id) < 0;
}

export default function MultiplayerLobby({ 
  roomId, 
  roomCode, 
  isHost: initialIsHost,
  currentUserId,
  onGameStart, 
  onLeaveRoom 
}: MultiplayerLobbyProps) {
  const roomManagerRef = useRef<RoomManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(initialIsHost); // ✅ ЛОКАЛЬНЫЙ STATE ДЛЯ isHost
  const [lobbyState, setLobbyState] = useState<{
    players: LobbyPlayer[];
    maxPlayers: number;
    gameInProgress: boolean;
    canStart: boolean;
  }>({
    players: [],
    maxPlayers: 6,
    gameInProgress: false,
    canStart: false,
  });
  
  const [gameSettings, setGameSettings] = useState({
    gameMode: 'classic',
    maxPlayers: 6,
    timeLimit: 0,
    allowBots: true
  });

  const [codeCopied, setCodeCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newlyJoinedIds, setNewlyJoinedIds] = useState<Set<string>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const prevPlayerIdsRef = useRef<Set<string>>(new Set());
  const gameStartedRef = useRef(false);
  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;

  const triggerGameStart = useCallback(() => {
    if (gameStartedRef.current) return;
    gameStartedRef.current = true;
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onGameStartRef.current({});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const loadRoomPlayers = useCallback(async (force = false) => {
    if (!force && refreshInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 350) return;

    refreshInFlightRef.current = true;
    lastRefreshAtRef.current = now;
    try {
      const response = await fetch(`/api/rooms/${roomId}/players`, {
        method: 'GET',
        headers: getApiHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        console.error('❌ [MultiplayerLobby] API вернул ошибку:', response.status, response.statusText);
        
        if (response.status === 404) {
          if (roomManagerRef.current) {
            roomManagerRef.current.unsubscribe();
          }
          onLeaveRoom();
          return;
        }
        return;
      }
      
      const data = await response.json();

      if (data.success && data.players) {
        const players = data.players as LobbyPlayer[];
        const currentIds = new Set(players.map((p) => String(p.user_id)));
        const joinedNow = [...currentIds].filter((id) => !prevPlayerIdsRef.current.has(id));
        if (joinedNow.length > 0 && prevPlayerIdsRef.current.size > 0) {
          setNewlyJoinedIds(new Set(joinedNow));
          setTimeout(() => setNewlyJoinedIds(new Set()), 2200);
        }
        prevPlayerIdsRef.current = currentIds;

        const myPlayer = players.find((p) => String(p.user_id) === String(currentUserId));
        if (myPlayer?.is_host !== undefined) {
          setIsHost(myPlayer.is_host);
        }
        
        setLobbyState((prev) => {
          const maxPlayers = data.maxPlayers || prev.maxPlayers || 6;
          return {
            ...prev,
            players,
            maxPlayers,
            canStart: canStartRoom(players.length, maxPlayers),
            gameInProgress: data.roomStatus === 'playing',
          };
        });

        if (data.roomStatus === 'playing') {
          triggerGameStart();
        }
      } else {
        console.error('❌ [MultiplayerLobby] API вернул ошибку:', data.message);
      }
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка загрузки игроков:', error);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [roomId, currentUserId, onLeaveRoom, triggerGameStart]);

  useEffect(() => {
    if (!roomManagerRef.current) {
      roomManagerRef.current = new RoomManager();
    }

    const roomManager = roomManagerRef.current;

    roomManager.subscribeToRoom(roomId, {
      onPlayerJoin: () => {
        loadRoomPlayers(true);
      },
      onPlayerLeave: () => {
        loadRoomPlayers(true);
      },
      onPlayerReady: () => {
        loadRoomPlayers(true);
      },
      onGameStart: () => {
        triggerGameStart();
      },
    });

    setIsConnected(true);
    loadRoomPlayers(true);

    const interval = setInterval(() => {
      loadRoomPlayers(true);
    }, 2000);

    return () => {
      clearInterval(interval);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      roomManager.unsubscribe();
    };
  }, [roomId, loadRoomPlayers, triggerGameStart]);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  // ✅ УПРОЩЕННАЯ ГОТОВНОСТЬ - РАБОТАЕТ ВСЕГДА
  const toggleReady = async () => {
    if (!currentUserId) {
      alert('Ошибка: не удалось определить ваш ID');
      return;
    }
    
    const currentReadyState = currentPlayer?.is_ready || false;
    const newReadyState = !currentReadyState;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ isReady: newReadyState }),
      });
      
      // ✅ ПРОВЕРЯЕМ ОТВЕТ ПЕРЕД ПАРСИНГОМ JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MultiplayerLobby] API вернул ошибку:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [MultiplayerLobby] Готовность изменена:', newReadyState);
        // Обновляем список игроков
        await loadRoomPlayers(true);
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
          credentials: 'include',
        }).catch(() => {});
      } else {
        console.error('❌ [MultiplayerLobby] Ошибка:', data.message);
        alert(`Ошибка: ${data.message || 'Не удалось изменить готовность'}`);
      }
    } catch (error: any) {
      console.error('❌ [MultiplayerLobby] Ошибка toggleReady:', error);
      alert(`Ошибка: ${error.message || 'Не удалось изменить готовность'}`);
    }
  };

  // ✅ ДОБАВЛЕНИЕ БОТА (ТОЛЬКО ХОСТОМ)
  const handleAddBot = async () => {
    if (!isHost) {
      alert('Добавлять ботов может только хост комнаты');
      return;
    }
    if (!currentUserId) {
      alert('Ошибка: не удалось определить ваш ID');
      return;
    }

    try {
      setIsAddingBot(true);
      console.log('🤖 [MultiplayerLobby] Добавляем бота в комнату', roomId);

      const response = await fetch(`/api/rooms/${roomId}/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'add' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MultiplayerLobby] Ошибка добавления бота:', response.status, errorText);
        alert(errorText || 'Не удалось добавить бота');
        return;
      }

      const data = await response.json();
      if (data.success) {
        console.log('✅ [MultiplayerLobby] Бот добавлен:', data.bot);
        // ✅ ИСПРАВЛЕНО: Ждём немного и обновляем список несколько раз
        await loadRoomPlayers();
        setTimeout(() => loadRoomPlayers(), 500);
        setTimeout(() => loadRoomPlayers(), 1500);
        // Обновим активность комнаты
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
          credentials: 'include',
        });
      } else {
        console.error('❌ [MultiplayerLobby] API вернул ошибку при добавлении бота:', data.message);
        alert(data.message || 'Не удалось добавить бота');
      }
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка добавления бота:', error);
      alert('Ошибка добавления бота');
    } finally {
      setIsAddingBot(false);
    }
  };

  // ✅ ЗАПУСК ИГРЫ ЧЕРЕЗ API
  const handleStartGame = async () => {
    if (!isHost || !lobbyState.canStart) return;

    try {
      const roomManager = roomManagerRef.current;
      if (!roomManager) return;

      await roomManager.startGame(roomId, currentUserId);
      triggerGameStart();
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка запуска игры:', error);
      alert(error instanceof Error ? error.message : 'Не удалось начать игру');
    }
  };

  const handleLeaveRoom = async () => {
    if (roomManagerRef.current) {
      roomManagerRef.current.unsubscribe();
    }
    onLeaveRoom();
  };

  // ✅ ИСПРАВЛЕНО: Нормализуем сравнение - приводим оба к строке
  const currentPlayer = lobbyState.players.find((p) => String(p.user_id) === String(currentUserId));
  const readyPlayersCount = lobbyState.players.filter(p => p.is_ready).length;

  return (
    <div className={`multiplayer-lobby ${lobbyStyles.lobbyRoot}`}>
      {/* ✅ ПРОФЕССИОНАЛЬНЫЙ ЗАГОЛОВОК С ОПИСАНИЕМ */}
      <motion.div 
        className="lobby-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="lobby-title-section">
          <div className="lobby-title">
            <div className="title-icon-wrapper">
              <Users className="lobby-icon" />
            </div>
            <div className="title-text">
              <h1>Мультиплеер Лобби</h1>
              <p className="lobby-description">
                Соберите команду и начните эпическую карточную битву!
              </p>
            </div>
            <div className="connection-status-badge">
              {isConnected ? (
                <Wifi className="connection-icon connected" />
              ) : (
                <WifiOff className="connection-icon disconnected" />
              )}
              <span className="connection-text">
                {isConnected ? 'Подключено' : 'Отключено'}
              </span>
            </div>
          </div>
        </div>
        
        {/* ✅ КРАСИВАЯ КАРТОЧКА С КОДОМ КОМНАТЫ */}
        <motion.div 
          className="room-code-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyRoomCode}
        >
          <div className="room-code-header">
            <span className="room-code-label">🎮 Код комнаты</span>
            {codeCopied ? (
              <Check className="copy-icon success" />
            ) : (
              <Copy className="copy-icon" />
            )}
          </div>
          <div className="room-code-value">
            {roomCode}
          </div>
          <div className="room-code-hint">
            {codeCopied ? '✅ Скопировано!' : 'Нажмите чтобы скопировать'}
          </div>
        </motion.div>
      </motion.div>

      {/* ✅ ПРОФЕССИОНАЛЬНАЯ СЕКЦИЯ ИГРОКОВ */}
      <motion.div 
        className="players-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="players-header">
          <div className="players-header-left">
            <Users className="players-header-icon" />
            <div>
              <h2 className="players-title">Игроки</h2>
              <p className="players-subtitle">
                {lobbyState.players.length} из {lobbyState.maxPlayers} игроков
              </p>
            </div>
          </div>
          <div className="ready-count-badge">
            <Check className="ready-icon" />
            <span>Готовы: {readyPlayersCount}/{lobbyState.players.length}</span>
          </div>
        </div>
        
        <div className={lobbyStyles.tableArena}>
          <div className={lobbyStyles.tableFelt} />
          <div className={lobbyStyles.tableCenter}>
            <div className={lobbyStyles.tableLabel}>🎮 СТОЛ</div>
            <div className={lobbyStyles.tableCode}>{roomCode}</div>
          </div>

          {Array.from({ length: lobbyState.maxPlayers }, (_, index) => {
            const position = index + 1;
            const player = lobbyState.players.find((p) => p.position === position);
            const isEmpty = !player;
            const angle = (360 / lobbyState.maxPlayers) * (position - 1) - 90;
            const radius = typeof window !== 'undefined' && window.innerWidth < 480 ? 118 : 148;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            const userIdStr = player ? String(player.user_id) : '';
            const isBot = player ? isBotPlayer(player) : false;
            const isCurrentUser = player && userIdStr === String(currentUserId);
            const isHostPlayer = Boolean(player?.is_host);
            const justJoined = player && newlyJoinedIds.has(userIdStr);

            return (
              <div
                key={`seat-${position}-${player?.user_id ?? 'empty'}`}
                className={lobbyStyles.seatWrap}
                style={{
                  top: `calc(50% + ${y}px)`,
                  left: `calc(50% + ${x}px)`,
                }}
              >
                {isEmpty ? (
                  <div className={lobbyStyles.seatEmpty}>
                    <UserPlus size={16} style={{ opacity: 0.45 }} />
                    <span>Место {position}</span>
                    <span style={{ opacity: 0.7 }}>Ждём игрока</span>
                  </div>
                ) : (
                  <motion.div
                    initial={justJoined ? { opacity: 0, scale: 0.5, y: 12 } : false}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className={`${lobbyStyles.seatPlayer} ${
                      player.is_ready ? lobbyStyles.seatPlayerReady : lobbyStyles.seatPlayerWaiting
                    } ${isCurrentUser ? lobbyStyles.seatPlayerSelf : ''}`}
                  >
                    {justJoined && <span className={lobbyStyles.waitingPulse} />}
                    {isHostPlayer && (
                      <span className={lobbyStyles.seatBadgeHost}>
                        <Crown size={13} color="#fff" />
                      </span>
                    )}
                    {isBot && (
                      <span className={lobbyStyles.seatBadgeBot}>
                        <Bot size={11} color="#fff" />
                      </span>
                    )}
                    {isCurrentUser && <span className={lobbyStyles.seatBadgeYou}>ВЫ</span>}
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt={player.username} className={lobbyStyles.seatAvatar} />
                    ) : (
                      <div className={lobbyStyles.seatAvatarFallback}>
                        {player.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className={lobbyStyles.seatName}>{player.username || `Игрок ${position}`}</div>
                    <div
                      className={`${lobbyStyles.seatStatus} ${
                        player.is_ready ? lobbyStyles.seatStatusReady : lobbyStyles.seatStatusWait
                      }`}
                    >
                      {player.is_ready ? '✅ Готов' : '⏳ Ждём'}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Список игроков под столом на узких экранах */}
        <div className="players-list">
          <AnimatePresence>
            {lobbyState.players.map((player, index) => {
              const userIdStr = String(player.user_id || '');
              const isBot = userIdStr.startsWith('-') || parseInt(userIdStr) < 0;
              const isCurrentUser = userIdStr === String(currentUserId);
              const isHostPlayer = player.is_host === true;

              return (
                <motion.div
                  key={player.user_id}
                  className={`player-item ${player.is_ready ? 'ready' : 'not-ready'} ${isHostPlayer ? 'host' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="player-info">
                    {player.avatar_url && (
                      <img 
                        src={player.avatar_url} 
                        alt={player.username}
                        className="player-avatar"
                      />
                    )}
                    <div className="player-details">
                      <div className="player-name">
                        {player.username || `Игрок ${index + 1}`}
                        {isHostPlayer && <Crown className="host-crown" />}
                        {isBot && <Bot className="bot-icon" />}
                        {isCurrentUser && <span className="you-badge">ВЫ</span>}
                      </div>
                      <div className="player-status">
                        {player.is_ready ? '✅ Готов' : '⏳ Не готов'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="player-actions">
                    {player.is_ready ? (
                      <div className="ready-indicator green">
                        <Check className="ready-check" />
                      </div>
                    ) : (
                      <div className="waiting-indicator red">
                        <Clock className="waiting-clock" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Пустые слоты */}
          {Array.from({ length: lobbyState.maxPlayers - lobbyState.players.length }, (_, index) => (
            <div key={`empty-${index}`} className="player-item empty-slot">
              <div className="empty-slot-content">
                <UserPlus className="empty-slot-icon" />
                <span>Ожидание игрока...</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ✅ УБРАЛИ НАСТРОЙКИ - ОНИ УЖЕ ВЫБРАНЫ ПРИ СОЗДАНИИ КОМНАТЫ! */}

      {/* ✅ ПРОФЕССИОНАЛЬНЫЕ КНОПКИ */}
      <div className="lobby-actions" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Кнопка готовности */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isConnected) {
              toggleReady();
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isConnected) {
              toggleReady();
            }
          }}
          disabled={!isConnected}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            background: currentPlayer?.is_ready 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            opacity: isConnected ? 1 : 0.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            userSelect: 'none',
            minHeight: '48px',
            width: '100%',
            position: 'relative',
            zIndex: 10
          }}
        >
          {currentPlayer?.is_ready ? '✅ Готов' : '⏳ Не готов'}
        </motion.button>

        {/* Добавить бота и пригласить друзей (ВСЕГДА ПОКАЗЫВАЕМ ХОСТУ) */}
        {isHost && (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                      <motion.button
                        onClick={handleAddBot}
              disabled={isAddingBot || lobbyState.players.length >= lobbyState.maxPlayers}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isAddingBot ? 'not-allowed' : 'pointer',
                opacity: isAddingBot ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {isAddingBot
                ? '⏳ Добавление...'
                : lobbyState.players.length >= lobbyState.maxPlayers
                  ? '🤖 Мест нет'
                  : '🤖 Добавить бота'}
            </motion.button>

            <motion.button
              onClick={() => setShowInviteModal(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              👥 Пригласить друзей
            </motion.button>
          </div>
        )}

        {/* Запуск игры (только хост) */}
        {isHost && (
          <motion.button
            onClick={handleStartGame}
            disabled={!lobbyState.canStart || !isConnected}
            whileHover={lobbyState.canStart ? { scale: 1.02, y: -2 } : {}}
            whileTap={lobbyState.canStart ? { scale: 0.98 } : {}}
            style={{
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              background: lobbyState.canStart
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: lobbyState.canStart ? 'pointer' : 'not-allowed',
              opacity: lobbyState.canStart ? 1 : 0.6,
              boxShadow: lobbyState.canStart ? '0 6px 16px rgba(245, 158, 11, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {lobbyState.canStart ? (
              <>
                <Play size={20} />
                🚀 Начать игру!
              </>
            ) : (
              `⏳ За столом ${lobbyState.players.length}/${lobbyState.maxPlayers}`
            )}
          </motion.button>
        )}

        {/* Покинуть лобби */}
        <motion.button
          onClick={handleLeaveRoom}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '14px 24px',
            borderRadius: '12px',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          🚪 Покинуть лобби
        </motion.button>
      </div>

      {/* Обратный отсчет до начала игры */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            className="game-countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">Игра начинается...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Статус подключения */}
      {!isConnected && (
        <div className="connection-status">
          <div className="disconnected">Нет соединения с сервером</div>
        </div>
      )}

      <style jsx>{`
        .multiplayer-lobby {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 16px;
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          overflow-x: hidden;
        }

        @media (max-width: 768px) {
          .multiplayer-lobby {
            padding: 12px;
          }
        }

        .multiplayer-lobby::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .multiplayer-lobby > * {
          position: relative;
          z-index: 1;
        }

        .lobby-header {
          margin-bottom: 32px;
        }

        .lobby-title-section {
          margin-bottom: 24px;
        }

        .lobby-title {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .title-icon-wrapper {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
        }

        .lobby-icon {
          width: 28px;
          height: 28px;
          color: white;
        }

        .title-text {
          flex: 1;
        }

        .title-text h1 {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .lobby-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          line-height: 1.5;
        }

        .connection-status-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .connection-icon {
          width: 24px;
          height: 24px;
        }

        .connection-icon.connected {
          color: #10b981;
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.5));
        }

        .connection-icon.disconnected {
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.5));
        }

        .connection-text {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        .room-code-card {
          cursor: pointer;
          padding: 24px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 2px solid rgba(16, 185, 129, 0.3);
          box-shadow: 
            0 8px 32px rgba(16, 185, 129, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .room-code-card:hover {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 
            0 12px 40px rgba(16, 185, 129, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .room-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .room-code-label {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .copy-icon {
          width: 20px;
          height: 20px;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.2s;
        }

        .copy-icon.success {
          color: #10b981;
        }

        .room-code-value {
          font-size: 36px;
          font-weight: 900;
          font-family: 'Courier New', monospace;
          letter-spacing: 4px;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
          margin: 8px 0;
        }

        .room-code-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 8px;
        }

        .players-section {
          margin-bottom: 32px;
        }

        .players-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .players-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .players-header-icon {
          width: 32px;
          height: 32px;
          color: #8b5cf6;
        }

        .players-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0 0 4px 0;
        }

        .players-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .ready-count-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          font-weight: 600;
          font-size: 14px;
        }

        .ready-icon {
          width: 18px;
          height: 18px;
          color: #10b981;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .player-item {
          padding: 18px 20px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 2px solid transparent;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .player-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .player-item.ready {
          border-color: rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
        }

        .player-item.not-ready {
          border-color: rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
        }

        .player-item.host {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%);
          border-color: rgba(251, 191, 36, 0.5);
          box-shadow: 0 4px 16px rgba(251, 191, 36, 0.3);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .player-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .player-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 16px;
          color: white;
        }

        .host-crown {
          color: #fbbf24;
          width: 16px;
          height: 16px;
        }

        .bot-icon {
          color: #8b5cf6;
          width: 16px;
          height: 16px;
        }

        .you-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }

        .ready-indicator, .waiting-indicator {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ready-indicator.green {
          background: #10b981;
        }

        .waiting-indicator.red {
          background: #ef4444;
        }

        .empty-slot {
          opacity: 0.5;
          border-style: dashed;
        }

        .lobby-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 768px) {
          .lobby-actions {
            padding: 12px;
            gap: 10px;
          }
        }

        .ready-button, .add-bot-button, .start-game-button, .leave-button {
          padding: 15px 30px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }

        .ready-button.not-ready {
          background: #10b981;
          color: white;
        }

        .ready-button.ready {
          background: #ef4444;
          color: white;
        }

        .add-bot-button {
          background: #8b5cf6;
          color: white;
        }

        .start-game-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .start-game-button.can-start {
          background: #10b981;
          color: white;
        }

        .start-game-button.cannot-start {
          background: #6b7280;
          color: white;
          cursor: not-allowed;
        }

        .leave-button {
          background: #ef4444;
          color: white;
        }

        .game-countdown {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          z-index: 1000;
        }

        .countdown-number {
          font-size: 72px;
          font-weight: bold;
          color: #10b981;
        }

        .connection-status {
          margin-top: 20px;
          padding: 15px;
          background: rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          text-align: center;
          color: #ef4444;
        }
      `}</style>
      
      {/* Модальное окно приглашения друзей */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
        roomCode={roomCode}
      />
    </div>
  );
}
