'use client'
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, Crown, Play, Clock, Wifi, WifiOff, UserPlus, Settings, Bot } from 'lucide-react';
import { RoomManager } from '../lib/multiplayer/room-manager';
import { useTelegram } from '../hooks/useTelegram';

interface MultiplayerLobbyProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onGameStart: (gameSettings: any) => void;
  onLeaveRoom: () => void;
}

interface LobbyPlayer {
  user_id: string;
  username: string;
  position: number;
  is_ready: boolean;
  is_host?: boolean; // ✅ ДОБАВЛЕНО!
  avatar_url?: string;
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
  isHost: initialIsHost, // ✅ ПЕРЕИМЕНОВАЛИ В initialIsHost
  onGameStart, 
  onLeaveRoom 
}: MultiplayerLobbyProps) {
  const { user } = useTelegram();
  const roomManagerRef = useRef<RoomManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(initialIsHost); // ✅ ЛОКАЛЬНЫЙ STATE ДЛЯ isHost
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    players: [],
    maxPlayers: 9,
    gameInProgress: false,
    canStart: false
  });
  
  const [gameSettings, setGameSettings] = useState({
    gameMode: 'classic',
    maxPlayers: 9,
    timeLimit: 0,
    allowBots: true
  });

  const [codeCopied, setCodeCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAddingBot, setIsAddingBot] = useState(false);

  // ✅ ИНИЦИАЛИЗАЦИЯ RoomManager при монтировании
  useEffect(() => {
    if (!roomManagerRef.current) {
      roomManagerRef.current = new RoomManager();
    }

    const roomManager = roomManagerRef.current;

    console.log('📡 [MultiplayerLobby] Подписываемся на комнату:', roomId);

    // Подписываемся на обновления комнаты
    roomManager.subscribeToRoom(roomId, {
      onPlayerJoin: (player) => {
        console.log('👥 [MultiplayerLobby] Игрок присоединился:', player);
        // ✅ ЗАГРУЖАЕМ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
        loadRoomPlayers();
      },
      onPlayerLeave: (userId) => {
        console.log('👋 [MultiplayerLobby] Игрок покинул:', userId);
        // ✅ ЗАГРУЖАЕМ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
        loadRoomPlayers();
      },
      onPlayerReady: (userId, isReady) => {
        console.log('✅ [MultiplayerLobby] Готовность обновлена:', userId, isReady);
        // ✅ ЗАГРУЖАЕМ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
        loadRoomPlayers();
      },
      onGameStart: () => {
        console.log('🚀 [MultiplayerLobby] Игра началась!');
        handleGameStarted({});
      }
    });

    setIsConnected(true);

    // ✅ ЗАГРУЖАЕМ ИЗ БД ПРИ МОНТИРОВАНИИ
    loadRoomPlayers();

    // ✅ АВТООБНОВЛЕНИЕ КАЖДЫЕ 2 СЕКУНДЫ (НА СЛУЧАЙ ЕСЛИ REALTIME НЕ СРАБОТАЛ)
    const interval = setInterval(() => {
      console.log('🔄 [MultiplayerLobby] Автообновление из БД...');
      loadRoomPlayers();
    }, 2000);

    // Очистка при размонтировании
    return () => {
      console.log('🔌 [MultiplayerLobby] Отключаемся от комнаты');
      clearInterval(interval);
      roomManager.unsubscribe();
    };
  }, [roomId]);

  // ✅ ЗАГРУЗКА СПИСКА ИГРОКОВ ИЗ БД
  const loadRoomPlayers = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/players`);
      
      // ✅ ПРОВЕРЯЕМ СТАТУС ОТВЕТА!
      if (!response.ok) {
        console.error('❌ [MultiplayerLobby] API вернул ошибку:', response.status, response.statusText);
        
        // ЕСЛИ 404 - КОМНАТА НЕ НАЙДЕНА, ВЫХОДИМ!
        if (response.status === 404) {
          console.error('🚪 [MultiplayerLobby] Комната не найдена! Выходим...');
          onLeaveRoom(); // ⚠️ ВОТ ГДЕ ВЫКИДЫВАЕТ!
          return;
        }
        return;
      }
      
      const data = await response.json();

      if (data.success && data.players) {
        console.log('📋 [MultiplayerLobby] Игроки загружены:', data.players);
        console.log('📋 [MultiplayerLobby] max_players:', data.maxPlayers);
        
        // ✅ ОБНОВЛЯЕМ isHost ИЗ БД!
        const myPlayer = data.players.find((p: LobbyPlayer) => p.user_id === user?.id?.toString());
        if (myPlayer && myPlayer.is_host !== undefined) {
          console.log('👑 [MultiplayerLobby] Обновляем isHost:', myPlayer.is_host);
          setIsHost(myPlayer.is_host);
        }
        
        setLobbyState(prev => ({
          ...prev,
          players: data.players,
          maxPlayers: data.maxPlayers || 9, // ✅ ОБНОВЛЯЕМ max_players ИЗ БД!
          canStart: data.players.length >= 2 && data.players.every((p: LobbyPlayer) => p.is_ready)
        }));
      } else {
        console.error('❌ [MultiplayerLobby] API вернул ошибку:', data.message);
      }
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка загрузки игроков:', error);
    }
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

  // ✅ ИЗМЕНИТЬ ГОТОВНОСТЬ ЧЕРЕЗ API
  const toggleReady = async () => {
    if (!user?.id) return;
    
    const currentPlayer = lobbyState.players.find(p => p.user_id === user.id.toString());
    const newReadyState = !currentPlayer?.is_ready;
    
    console.log(`🎯 [MultiplayerLobby] Изменение готовности на:`, newReadyState);

    try {
      const roomManager = roomManagerRef.current;
      if (!roomManager) return;

      await roomManager.setPlayerReady(roomId, user.id.toString(), newReadyState);
      
      // ✅ ПЕРЕЗАГРУЖАЕМ ИЗ БД (ИСТОЧНИК ИСТИНЫ!)
      await loadRoomPlayers();

      console.log('✅ [MultiplayerLobby] Готовность обновлена');
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка обновления готовности:', error);
    }
  };

  // ✅ ЗАПУСК ИГРЫ ЧЕРЕЗ API
  const handleStartGame = async () => {
    if (!isHost || !lobbyState.canStart) return;
    
    console.log(`🚀 [MultiplayerLobby] Хост запускает игру`);

    try {
      const roomManager = roomManagerRef.current;
      if (!roomManager || !user?.id) return;

      await roomManager.startGame(roomId, user.id.toString());
      
      console.log('✅ [MultiplayerLobby] Игра запущена');
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка запуска игры:', error);
    }
  };

  // ✅ ПОКИНУТЬ ЛОББИ ЧЕРЕЗ API
  const handleLeaveRoom = async () => {
    console.log(`🚪 [MultiplayerLobby] Покидаем лобби`);

    try {
      if (!user?.id) return;

      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': user.id.toString()
        }
      });

      if (!response.ok) {
        console.error('❌ [MultiplayerLobby] Ошибка покидания комнаты');
      }
    } catch (error) {
      console.error('❌ [MultiplayerLobby] Ошибка покидания комнаты:', error);
    } finally {
      onLeaveRoom();
    }
  };

  // ✅ ДОБАВИТЬ БОТА ЧЕРЕЗ API
  const addBot = async () => {
    if (!isHost || !gameSettings.allowBots || isAddingBot) return;
    
    setIsAddingBot(true);
    console.log(`🤖 Добавляем бота от пользователя ${user?.id}...`);

    try {
      const response = await fetch(`/api/rooms/${roomId}/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': user?.id?.toString() || ''
        },
        body: JSON.stringify({ action: 'add' })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Бот добавлен:', data.bot);
        // ✅ Realtime INSERT event вызовет onPlayerJoin → loadRoomPlayers()
      } else {
        console.error('❌ Ошибка добавления бота:', data.message);
        alert(`Ошибка добавления бота: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Ошибка добавления бота:', error);
    } finally {
      setIsAddingBot(false);
    }
  };

  const currentPlayer = lobbyState.players.find(p => p.user_id === user?.id?.toString());
  const readyPlayersCount = lobbyState.players.filter(p => p.is_ready).length;

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
            {lobbyState.players.map((player, index) => {
              const userIdStr = String(player.user_id || ''); // ✅ КОНВЕРТИРУЕМ В СТРОКУ!
              const isBot = userIdStr.startsWith('-') || parseInt(userIdStr) < 0;
              const isCurrentUser = userIdStr === user?.id?.toString();
              const isHostPlayer = index === 0; // Первый игрок = хост

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
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '14px'
                }}
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
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                <option value={4}>4 игрока</option>
                <option value={5}>5 игроков</option>
                <option value={6}>6 игроков</option>
                <option value={7}>7 игроков</option>
                <option value={8}>8 игроков</option>
                <option value={9}>9 игроков</option>
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
          className={`ready-button ${currentPlayer?.is_ready ? 'ready' : 'not-ready'}`}
          onClick={toggleReady}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!isConnected}
        >
          {currentPlayer?.is_ready ? '❌ Не готов' : '✅ Готов!'}
        </motion.button>

        {/* Добавить бота (только хост) */}
        {isHost && gameSettings.allowBots && lobbyState.players.length < lobbyState.maxPlayers && (
          <motion.button
            className="add-bot-button"
            onClick={addBot}
            disabled={isAddingBot}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isAddingBot ? '⏳ Добавление...' : '🤖 Добавить бота'}
          </motion.button>
        )}

        {/* Запуск игры (только хост) */}
        {isHost && (
          <motion.button
            className={`start-game-button ${lobbyState.canStart ? 'can-start' : 'cannot-start'}`}
            onClick={handleStartGame}
            disabled={!lobbyState.canStart || !isConnected}
            whileHover={lobbyState.canStart ? { scale: 1.05 } : {}}
            whileTap={lobbyState.canStart ? { scale: 0.95 } : {}}
          >
            <Play className="start-icon" />
            {lobbyState.canStart ? '🚀 Начать игру!' : `⏳ Ждем готовности (${readyPlayersCount}/${lobbyState.players.length})`}
          </motion.button>
        )}

        {/* Покинуть лобби */}
        <motion.button
          className="leave-button"
          onClick={handleLeaveRoom}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
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
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .lobby-header {
          margin-bottom: 30px;
        }

        .lobby-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .connection-icon {
          width: 20px;
          height: 20px;
        }

        .connection-icon.connected {
          color: #10b981;
        }

        .connection-icon.disconnected {
          color: #ef4444;
        }

        .room-code-container {
          cursor: pointer;
          padding: 15px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .room-code {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .players-section {
          margin-bottom: 30px;
        }

        .players-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: bold;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .player-item {
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 2px solid transparent;
        }

        .player-item.ready {
          border-color: #10b981;
        }

        .player-item.not-ready {
          border-color: #ef4444;
        }

        .player-item.host {
          background: rgba(251, 191, 36, 0.1);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .player-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .player-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
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
          background: #3b82f6;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
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
          gap: 15px;
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
    </div>
  );
}
