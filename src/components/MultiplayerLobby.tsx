'use client'
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, Crown, Play, Clock, Wifi, WifiOff, UserPlus, Settings } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTelegram } from '../hooks/useTelegram';

interface MultiplayerLobbyProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onGameStart: (gameSettings: any) => void;
  onLeaveRoom: () => void;
}

interface LobbyPlayer {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  isReady: boolean;
  isHost: boolean;
  joinTime: string;
  isBot?: boolean;
}

interface LobbyState {
  players: LobbyPlayer[];
  maxPlayers: number;
  gameInProgress: boolean;
  canStart: boolean;
}

export default function MultiplayerLobby({ 
  roomId, 
  roomCode, 
  isHost, 
  onGameStart, 
  onLeaveRoom 
}: MultiplayerLobbyProps) {
  const { user } = useTelegram();
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    players: [],
    maxPlayers: 9,
    gameInProgress: false,
    canStart: false
  });
  
  const [gameSettings, setGameSettings] = useState({
    gameMode: 'classic',
    maxPlayers: 9,
    timeLimit: 0, // 0 = без лимита времени
    allowBots: true
  });

  const [codeCopied, setCodeCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    isConnected,
    isConnecting,
    messages,
    onlineUsers,
    setPlayerReady,
    startGame,
    leaveRoom
  } = useWebSocket({
    userId: user?.id?.toString(),
    roomId: roomId,
    autoConnect: true
  });

  // Обработка сообщений WebSocket
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    console.log(`🎮 [MultiplayerLobby] Получено сообщение:`, latestMessage);

    switch (latestMessage.type) {
      case 'room-state':
        updateLobbyState(latestMessage.data);
        break;
        
      case 'player-joined':
        handlePlayerJoined(latestMessage.data);
        break;
        
      case 'player-left':
        handlePlayerLeft(latestMessage.data);
        break;
        
      case 'player-ready-sync':
        handlePlayerReadyUpdate(latestMessage.data);
        break;
        
      case 'game-started':
        handleGameStarted(latestMessage.data);
        break;
        
      default:
        console.log(`🎮 [MultiplayerLobby] Неизвестный тип сообщения:`, latestMessage.type);
    }
  }, [messages]);

  // Обновить состояние лобби
  const updateLobbyState = (roomData: any) => {
    console.log(`🏠 [MultiplayerLobby] Обновление состояния лобби:`, roomData);
    
    setLobbyState({
      players: roomData.players || [],
      maxPlayers: roomData.maxPlayers || 9,
      gameInProgress: roomData.gameInProgress || false,
      canStart: roomData.canStart || false
    });
  };

  // Обработка присоединения игрока
  const handlePlayerJoined = (data: any) => {
    console.log(`👥 [MultiplayerLobby] Игрок присоединился:`, data);
    
    if (data.roomInfo) {
      updateLobbyState(data.roomInfo);
    }
  };

  // Обработка покидания игроком лобби
  const handlePlayerLeft = (data: any) => {
    console.log(`👥 [MultiplayerLobby] Игрок покинул лобби:`, data);
    
    setLobbyState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.userId !== data.userId)
    }));
  };

  // Обработка обновления готовности игрока
  const handlePlayerReadyUpdate = (data: any) => {
    console.log(`✅ [MultiplayerLobby] Обновление готовности:`, data);
    
    setLobbyState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.userId === data.userId 
          ? { ...p, isReady: data.isReady }
          : p
      )
    }));
  };

  // Обработка начала игры
  const handleGameStarted = (gameData: any) => {
    console.log(`🚀 [MultiplayerLobby] Игра началась:`, gameData);
    
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onGameStart(gameData);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Скопировать код комнаты
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  // Изменить готовность игрока
  const toggleReady = () => {
    if (!user?.id) return;
    
    const currentPlayer = lobbyState.players.find(p => p.userId === user.id.toString());
    const newReadyState = !currentPlayer?.isReady;
    
    console.log(`🎯 [MultiplayerLobby] Изменение готовности на:`, newReadyState);
    setPlayerReady(newReadyState);
  };

  // Запустить игру (только хост)
  const handleStartGame = () => {
    if (!isHost || !lobbyState.canStart) return;
    
    console.log(`🚀 [MultiplayerLobby] Хост запускает игру`);
    
    const finalGameSettings = {
      ...gameSettings,
      roomId,
      roomCode,
      players: lobbyState.players,
      startTime: Date.now()
    };
    
    startGame(finalGameSettings);
  };

  // Покинуть лобби
  const handleLeaveRoom = () => {
    console.log(`🚪 [MultiplayerLobby] Покидаем лобби`);
    
    if (user?.id) {
      leaveRoom(roomId, user.id.toString());
    }
    
    onLeaveRoom();
  };

  // Добавить бота (только хост)
  const addBot = () => {
    if (!isHost || !gameSettings.allowBots) return;
    
    // TODO: Реализовать добавление бота
    console.log(`🤖 [MultiplayerLobby] Добавление бота`);
  };

  const currentPlayer = lobbyState.players.find(p => p.userId === user?.id?.toString());
  const readyPlayersCount = lobbyState.players.filter(p => p.isReady).length;

  return (
    <div className="multiplayer-lobby">
      {/* Заголовок */}
      <div className="lobby-header">
        <div className="lobby-title">
          <Users className="lobby-icon" />
          <span>Мультиплеер Лобби</span>
          {isConnected ? (
            <Wifi className="connection-icon connected" />
          ) : (
            <WifiOff className="connection-icon disconnected" />
          )}
        </div>
        
        {/* Код комнаты */}
        <motion.div 
          className="room-code-container"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyRoomCode}
        >
          <div className="room-code-label">Код комнаты:</div>
          <div className="room-code">
            {roomCode}
            {codeCopied ? (
              <Check className="copy-icon success" />
            ) : (
              <Copy className="copy-icon" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Список игроков */}
      <div className="players-section">
        <div className="players-header">
          <span>Игроки ({lobbyState.players.length}/{lobbyState.maxPlayers})</span>
          <span className="ready-count">
            Готовы: {readyPlayersCount}/{lobbyState.players.length}
          </span>
        </div>
        
        <div className="players-list">
          <AnimatePresence>
            {lobbyState.players.map((player, index) => (
              <motion.div
                key={player.userId}
                className={`player-item ${player.isReady ? 'ready' : 'not-ready'} ${player.isHost ? 'host' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="player-info">
                  {player.photoUrl && (
                    <img 
                      src={player.photoUrl} 
                      alt={player.firstName || player.username || 'Игрок'}
                      className="player-avatar"
                    />
                  )}
                  <div className="player-details">
                    <div className="player-name">
                      {player.firstName || player.username || `Игрок ${index + 1}`}
                      {player.isHost && <Crown className="host-crown" />}
                      {player.isBot && <span className="bot-badge">БОТ</span>}
                    </div>
                    <div className="player-status">
                      {player.isReady ? 'Готов' : 'Не готов'}
                    </div>
                  </div>
                </div>
                
                <div className="player-actions">
                  {player.isReady ? (
                    <div className="ready-indicator">
                      <Check className="ready-check" />
                    </div>
                  ) : (
                    <div className="waiting-indicator">
                      <Clock className="waiting-clock" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
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
      </div>

      {/* Настройки игры (только для хоста) */}
      {isHost && (
        <motion.div 
          className="game-settings"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="settings-header">
            <Settings className="settings-icon" />
            <span>Настройки игры</span>
          </div>
          
          <div className="settings-grid">
            <div className="setting-item">
              <label>Режим игры:</label>
              <select 
                value={gameSettings.gameMode}
                onChange={(e) => setGameSettings(prev => ({ ...prev, gameMode: e.target.value }))}
              >
                <option value="classic">Классический</option>
                <option value="fast">Быстрый</option>
                <option value="tournament">Турнир</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Макс. игроков:</label>
              <select 
                value={gameSettings.maxPlayers}
                onChange={(e) => setGameSettings(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
              >
                <option value={4}>4 игрока</option>
                <option value={5}>5 игроков</option>
                <option value={6}>6 игроков</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={gameSettings.allowBots}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, allowBots: e.target.checked }))}
                />
                Разрешить ботов
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* Кнопки управления */}
      <div className="lobby-actions">
        {/* Кнопка готовности */}
        <motion.button
          className={`ready-button ${currentPlayer?.isReady ? 'ready' : 'not-ready'}`}
          onClick={toggleReady}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isConnecting || !isConnected}
        >
          {currentPlayer?.isReady ? 'Не готов' : 'Готов!'}
        </motion.button>

        {/* Добавить бота (только хост) */}
        {isHost && gameSettings.allowBots && lobbyState.players.length < lobbyState.maxPlayers && (
          <motion.button
            className="add-bot-button"
            onClick={addBot}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Добавить бота
          </motion.button>
        )}

        {/* Запуск игры (только хост) */}
        {isHost && (
          <motion.button
            className={`start-game-button ${lobbyState.canStart ? 'can-start' : 'cannot-start'}`}
            onClick={handleStartGame}
            disabled={!lobbyState.canStart || isConnecting || !isConnected}
            whileHover={lobbyState.canStart ? { scale: 1.05 } : {}}
            whileTap={lobbyState.canStart ? { scale: 0.95 } : {}}
          >
            <Play className="start-icon" />
            {lobbyState.canStart ? 'Начать игру!' : `Ждем игроков (${readyPlayersCount}/${lobbyState.players.length})`}
          </motion.button>
        )}

        {/* Покинуть лобби */}
        <motion.button
          className="leave-button"
          onClick={handleLeaveRoom}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Покинуть лобби
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
          {isConnecting ? (
            <div className="connecting">Подключение к серверу...</div>
          ) : (
            <div className="disconnected">Нет соединения с сервером</div>
          )}
        </div>
      )}
    </div>
  );
}
