'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Crown, Play, Settings, UserPlus, UserX, 
  ArrowLeft, Copy, Check, Bot, Shield, Clock,
  Gamepad2, Zap, Trophy
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import './WaitingRoomProfessional-fixed.css';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  avatar?: string;
  joinedAt: Date;
}

interface RoomData {
  id: string;
  code: string;
  name: string;
  host: string;
  hostId: string;
  maxPlayers: number;
  gameMode: 'casual' | 'competitive';
  hasPassword: boolean;
  isPrivate: boolean;
  status: 'waiting' | 'starting' | 'playing';
  players: Player[];
  settings: {
    autoStart: boolean;
    allowBots: boolean;
    minPlayers: number;
  };
}

interface WaitingRoomProfessionalProps {
  roomData: RoomData;
  currentUserId: string;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onUpdateRoom: (updates: Partial<RoomData>) => void;
}

export default function WaitingRoomProfessional({
  roomData,
  currentUserId,
  onLeaveRoom,
  onStartGame,
  onUpdateRoom
}: WaitingRoomProfessionalProps) {
  const { user } = useTelegram();
  
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);
  const [localSettings, setLocalSettings] = useState(roomData.settings);
  const [isReady, setIsReady] = useState(false);
  const [isUpdatingReady, setIsUpdatingReady] = useState(false);

  const isHost = roomData.hostId === currentUserId;
  const currentPlayer = roomData.players.find(p => p.id === currentUserId);
  const readyPlayers = roomData.players.filter(p => p.isReady || p.isHost).length;
  
  // ОБНОВЛЯЕМ ЛОКАЛЬНОЕ СОСТОЯНИЕ ГОТОВНОСТИ
  useEffect(() => {
    if (currentPlayer) {
      setIsReady(currentPlayer.isReady || isHost);
    }
  }, [currentPlayer, isHost]);
  
  // ОТЛАДКА: Проверяем определение хоста
  console.log('🔍 [WaitingRoom] Отладка хоста:', {
    roomHostId: roomData.hostId,
    currentUserId: currentUserId,
    isHost: isHost,
    currentPlayer: currentPlayer,
    playersInRoom: roomData.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
  });
  const canStart = readyPlayers >= localSettings.minPlayers && readyPlayers === roomData.players.length;

  // РЕАЛ-ТАЙМ ОБНОВЛЕНИЕ СПИСКА ИГРОКОВ
  useEffect(() => {
    if (!roomData?.id) return;

    const updatePlayers = async () => {
      try {
        // Получаем игроков
        const playersResponse = await fetch(`/api/rooms/${roomData.id}/players`, {
          credentials: 'include'
        });
        
        // Получаем информацию о комнате (включая maxPlayers)
        const roomsResponse = await fetch('/api/rooms?type=public', {
          credentials: 'include'
        });
        
        if (playersResponse.ok && roomsResponse.ok) {
          const playersData = await playersResponse.json();
          const roomsData = await roomsResponse.json();
          
          if (playersData.success && playersData.players && roomsData.success) {
            console.log('🔄 Обновлен список игроков:', playersData.players);
            
            // Находим текущую комнату в списке
            const currentRoom = roomsData.rooms.find((r: any) => r.id.toString() === roomData.id);
            
            // Преобразуем данные из API в формат Player
            const updatedPlayers: Player[] = playersData.players.map((p: any) => ({
              id: p.user_id,
              name: p.username || 'Игрок',
              isHost: p.user_id === roomData.hostId,
              isReady: p.is_ready,
              isBot: false,
              avatar: p.avatar_url,
              joinedAt: new Date(p.joined_at)
            }));

            // Обновляем если что-то изменилось
            const needsUpdate = updatedPlayers.length !== roomData.players.length || 
                               (currentRoom && currentRoom.max_players !== roomData.maxPlayers);
            
            if (needsUpdate) {
              const updateData: any = { players: updatedPlayers };
              if (currentRoom && currentRoom.max_players !== roomData.maxPlayers) {
                updateData.maxPlayers = currentRoom.max_players;
                console.log(`🔄 Обновлен maxPlayers: ${roomData.maxPlayers} → ${currentRoom.max_players}`);
              }
              onUpdateRoom(updateData);
            }
          }
        }
      } catch (error) {
        console.error('❌ Ошибка обновления игроков:', error);
      }
    };

    // Обновляем каждые 3 секунды
    const interval = setInterval(updatePlayers, 3000);
    
    // Первое обновление сразу
    updatePlayers();

    return () => clearInterval(interval);
  }, [roomData?.id, roomData?.players.length, roomData?.hostId, onUpdateRoom]);

  // Автостарт при готовности всех игроков
  useEffect(() => {
    if (localSettings.autoStart && canStart && isHost && roomData.players.length >= localSettings.minPlayers) {
      setStartCountdown(5);
      const interval = setInterval(() => {
        setStartCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onStartGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [canStart, isHost, localSettings.autoStart, localSettings.minPlayers, roomData.players.length, onStartGame]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const handleKickPlayer = (playerId: string) => {
    if (!isHost || playerId === currentUserId) return;
    
    const updatedPlayers = roomData.players.filter(p => p.id !== playerId);
    onUpdateRoom({ players: updatedPlayers });
  };

  const handleAddBot = () => {
    if (!isHost || roomData.players.length >= roomData.maxPlayers) return;
    
    const botNames = ['Алекс', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена'];
    const usedNames = roomData.players.map(p => p.name);
    const availableName = botNames.find(name => !usedNames.includes(name)) || `Бот${Date.now()}`;
    
    const newBot: Player = {
      id: `bot_${Date.now()}`,
      name: availableName,
      isHost: false,
      isReady: true,
      isBot: true,
      joinedAt: new Date()
    };
    
    onUpdateRoom({ players: [...roomData.players, newBot] });
  };

  const handleUpdateSettings = () => {
    onUpdateRoom({ settings: localSettings });
    setShowSettings(false);
  };

  const handleDeleteRoom = async () => {
    if (!isHost) return;
    
    if (!confirm('Вы уверены что хотите удалить комнату?')) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomData.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('✅ Комната удалена');
        onLeaveRoom(); // Выходим после удаления
      } else {
        console.error('❌ Ошибка удаления комнаты');
        alert('Не удалось удалить комнату');
      }
    } catch (error) {
      console.error('❌ Ошибка API удаления:', error);
      alert('Ошибка удаления комнаты');
    }
  };

  // ФУНКЦИЯ ИЗМЕНЕНИЯ ГОТОВНОСТИ
  const handleToggleReady = async () => {
    if (isHost || isUpdatingReady) return; // ХОСТ ВСЕГДА ГОТОВ
    
    setIsUpdatingReady(true);
    const newReadyState = !isReady;
    
    try {
      const response = await fetch(`/api/rooms/${roomData.id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isReady: newReadyState })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Готовность обновлена:', data);
        setIsReady(newReadyState);
        
        // ОБНОВЛЯЕМ ДАННЫЕ КОМНАТЫ
        if (data.players) {
          onUpdateRoom({ 
            players: data.players.map((p: any) => ({
              id: p.user_id,
              name: p.username,
              isHost: p.user_id === roomData.hostId,
              isReady: p.is_ready,
              isBot: parseInt(p.user_id) < 0,
              avatar: p.avatar_url,
              joinedAt: new Date(p.joined_at)
            }))
          });
        }
      } else {
        console.error('❌ Ошибка обновления готовности');
      }
    } catch (error) {
      console.error('❌ Ошибка обновления готовности:', error);
    } finally {
      setIsUpdatingReady(false);
    }
  };

  // ФУНКЦИЯ ДОБАВЛЕНИЯ БОТА
  const handleAddBot = async () => {
    if (!isHost) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomData.id}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'add' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Бот добавлен:', data);
        
        // ОБНОВЛЯЕМ СПИСОК ИГРОКОВ (ПЕРЕЗАГРУЖАЕМ)
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('❌ Ошибка добавления бота:', errorData.message);
      }
    } catch (error) {
      console.error('❌ Ошибка добавления бота:', error);
    }
  };

  const getGameModeInfo = () => {
    switch (roomData.gameMode) {
      case 'casual':
        return { name: 'Обычный', icon: <Users size={20} />, color: '#22c55e' };
      case 'competitive':
        return { name: 'Рейтинговый', icon: <Trophy size={20} />, color: '#f59e0b' };
      default:
        return { name: 'Неизвестно', icon: <Gamepad2 size={20} />, color: '#6b7280' };
    }
  };

  const modeInfo = getGameModeInfo();

  return (
    <div className="waiting-room-container">
      {/* Header - Исправленный дизайн */}
      <div className="room-header">
        {/* Левый блок с кнопками управления */}
        <div className="header-controls">
          <button onClick={onLeaveRoom} className="back-button">
            <ArrowLeft size={24} />
            <span>Покинуть</span>
          </button>
          
          {isHost && (
            <button 
              onClick={handleDeleteRoom} 
              className="delete-room-button"
            >
              <UserX size={20} />
              <span>Удалить комнату</span>
            </button>
          )}
        </div>
        
        {/* Центральный блок с информацией о комнате */}
        <div className="room-info-center">
          <h1 className="room-name">{roomData.name}</h1>
          <div className="room-meta-center">
            <div className="room-code-section">
              <span className="room-code">{roomData.code}</span>
              <button 
                onClick={handleCopyCode}
                className={`copy-button ${copied ? 'copied' : ''}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <div className="room-mode" style={{ color: modeInfo.color }}>
              {modeInfo.icon}
              <span>{modeInfo.name}</span>
            </div>
          </div>
        </div>

        {/* Правый блок с настройками */}
        <div className="header-settings">
          {isHost && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="settings-button"
            >
              <Settings size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isHost && (
        <div className="settings-panel">
          <h3>Настройки комнаты</h3>
          
          <div className="setting-item">
            <div className="toggle-setting">
              <span>Автоматический старт</span>
              <button
                onClick={() => setLocalSettings(prev => ({ ...prev, autoStart: !prev.autoStart }))}
                className={`toggle-switch ${localSettings.autoStart ? 'active' : ''}`}
              >
                <div className="toggle-slider" />
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="toggle-setting">
              <span>Разрешить ботов</span>
              <button
                onClick={() => setLocalSettings(prev => ({ ...prev, allowBots: !prev.allowBots }))}
                className={`toggle-switch ${localSettings.allowBots ? 'active' : ''}`}
              >
                <div className="toggle-slider" />
              </button>
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              Минимум игроков: {localSettings.minPlayers}
            </label>
            <input
              type="range"
              min="2"
              max={roomData.maxPlayers}
              value={localSettings.minPlayers}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, minPlayers: parseInt(e.target.value) }))}
              className="range-input"
            />
            <div className="range-labels">
              <span>2</span>
              <span>{roomData.maxPlayers}</span>
            </div>
          </div>

          <div className="settings-actions">
            <button onClick={() => setShowSettings(false)} className="cancel-button">
              Отмена
            </button>
            <button onClick={handleUpdateSettings} className="save-button">
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="players-section">
        <div className="section-header">
          <h2>Игроки ({roomData.players.length}/{roomData.maxPlayers})</h2>
          <div className="ready-counter">
            Готовы: {readyPlayers}/{roomData.players.length}
          </div>
        </div>

        <div className="players-grid">
          {roomData.players.map((player) => (
            <div 
              key={player.id} 
              className={`player-card ${player.isReady || player.isHost ? 'ready' : 'not-ready'} ${player.isBot ? 'bot' : ''}`}
            >
              <div className="player-avatar">
                {player.isBot ? (
                  <Bot size={24} />
                ) : (
                  <div className="avatar-placeholder">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="player-info">
                <div className="player-name">
                  {player.name}
                  {player.isHost && <Crown size={16} className="host-crown" />}
                </div>
                <div className="player-status">
                  {player.isHost ? 'Хост' : player.isReady ? 'Готов' : 'Не готов'}
                </div>
              </div>

              {isHost && !player.isHost && (
                <button 
                  onClick={() => handleKickPlayer(player.id)}
                  className="kick-button"
                  title="Исключить игрока"
                >
                  <UserX size={16} />
                </button>
              )}

              <div className={`ready-indicator ${player.isReady || player.isHost ? 'ready' : ''}`} />
            </div>
          ))}

          {/* Empty Slots */}
          {Array.from({ length: roomData.maxPlayers - roomData.players.length }).map((_, index) => (
            <div key={`empty-${index}`} className="player-card empty">
              <div className="player-avatar empty">
                <UserPlus size={24} />
              </div>
              <div className="player-info">
                <div className="player-name">Ожидание игрока...</div>
                <div className="player-status">Свободно</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {isHost ? (
          <div className="host-actions">
            {localSettings.allowBots && roomData.players.length < roomData.maxPlayers && (
              <button 
                onClick={handleAddBot} 
                className="add-bot-button"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onClick={handleAddBot}
              >
                <Bot size={20} />
                🤖 Добавить бота
              </button>
            )}
            
            <button 
              onClick={onStartGame}
              disabled={!canStart}
              className={`start-game-button ${canStart ? 'ready' : 'disabled'}`}
            >
              {startCountdown > 0 ? (
                <>
                  <Clock size={20} />
                  Старт через {startCountdown}
                </>
              ) : (
                <>
                  <Play size={20} />
                  {canStart ? 'Начать игру' : `Ждем игроков (${readyPlayers}/${localSettings.minPlayers})`}
                </>
              )}
            </button>
          </div>
        ) : (
          <button 
            onClick={handleToggleReady}
            disabled={isHost || isUpdatingReady}
            className={`ready-button ${isReady ? 'ready' : 'not-ready'} ${isUpdatingReady ? 'updating' : ''}`}
          >
            {isUpdatingReady ? (
              <>
                <Clock size={20} className="animate-spin" />
                Обновление...
              </>
            ) : isReady ? (
              <>
                <Check size={20} />
                Готов
              </>
            ) : (
              <>
                <Clock size={20} />
                Не готов
              </>
            )}
          </button>
        )}
      </div>

      {/* Room Status */}
      <div className="room-status">
        <div className="status-item">
          <Shield size={16} />
          <span>{roomData.hasPassword ? 'Защищена паролем' : 'Открытая комната'}</span>
        </div>
        <div className="status-item">
          <Zap size={16} />
          <span>Статус: {roomData.status === 'waiting' ? 'Ожидание' : 'Запуск'}</span>
        </div>
      </div>

      <style jsx>{`
        .waiting-room-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #e2e8f0;
        }

        .room-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 25px;
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

        .room-info {
          flex: 1;
          text-align: center;
        }

        .room-name {
          font-size: 1.8rem;
          font-weight: bold;
          color: #ffd700;
          margin-bottom: 10px;
        }

        .room-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .room-code-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .room-code {
          background: rgba(34, 197, 94, 0.2);
          padding: 8px 16px;
          border-radius: 8px;
          font-family: monospace;
          font-weight: bold;
          color: #22c55e;
          font-size: 1.1rem;
        }

        .copy-button {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          color: #22c55e;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .copy-button:hover {
          background: rgba(34, 197, 94, 0.3);
          border-color: #22c55e;
        }

        .copy-button.copied {
          background: rgba(34, 197, 94, 0.4);
          color: #16a34a;
        }

        .room-mode {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .settings-button {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .settings-button:hover {
          color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
        }

        .settings-panel {
          margin-bottom: 30px;
          padding: 25px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .settings-panel h3 {
          color: #e2e8f0;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }

        .setting-item {
          margin-bottom: 20px;
        }

        .toggle-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
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

        .settings-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 25px;
        }

        .cancel-button, .save-button {
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-button {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .cancel-button:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }

        .save-button {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e;
        }

        .save-button:hover {
          background: rgba(34, 197, 94, 0.3);
          border-color: #22c55e;
        }

        .players-section {
          margin-bottom: 30px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .section-header h2 {
          color: #e2e8f0;
          font-size: 1.3rem;
        }

        .ready-counter {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        }

        .player-card {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 15px;
          transition: all 0.3s ease;
          position: relative;
        }

        .player-card.ready {
          border-color: rgba(34, 197, 94, 0.6);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%);
        }

        .player-card.not-ready {
          border-color: rgba(239, 68, 68, 0.4);
        }

        .player-card.bot {
          border-color: rgba(59, 130, 246, 0.4);
        }

        .player-card.empty {
          border-color: rgba(107, 114, 128, 0.4);
          opacity: 0.6;
        }

        .player-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .player-avatar.empty {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
        }

        .player-info {
          flex: 1;
        }

        .player-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 4px;
        }

        .host-crown {
          color: #ffd700;
        }

        .player-status {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .kick-button {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 8px;
          color: #fca5a5;
          padding: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .kick-button:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }

        .ready-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          transition: background 0.3s ease;
        }

        .ready-indicator.ready {
          background: #22c55e;
        }

        .action-buttons {
          margin-bottom: 30px;
          display: flex;
          justify-content: center;
        }

        .host-actions {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .add-bot-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 25px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          color: #60a5fa;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .add-bot-button:hover {
          background: rgba(59, 130, 246, 0.3);
          border-color: #3b82f6;
        }

        .start-game-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 35px;
          border-radius: 15px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .start-game-button.ready {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: none;
          color: white;
        }

        .start-game-button.ready:hover {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
        }

        .start-game-button.disabled {
          background: #374151;
          border: 1px solid #4b5563;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .ready-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 35px;
          border-radius: 15px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ready-button.ready {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: none;
          color: white;
        }

        .ready-button.not-ready {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .ready-button.not-ready:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: #ef4444;
        }

        .room-status {
          display: flex;
          justify-content: center;
          gap: 30px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .waiting-room-container {
            padding: 15px;
          }
          
          .players-grid {
            grid-template-columns: 1fr;
          }
          
          .room-meta {
            flex-direction: column;
            gap: 10px;
          }
          
          .host-actions {
            flex-direction: column;
            width: 100%;
          }
          
          .room-status {
            flex-direction: column;
            gap: 10px;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
