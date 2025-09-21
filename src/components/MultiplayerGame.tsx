'use client'
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGameStore } from '@/store/gameStore';
import { useTelegram } from '@/hooks/useTelegram';
import { useTelegramShare } from '@/hooks/useTelegramShare';

interface MultiplayerGameProps {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onGameStateUpdate?: (gameState: any) => void;
}

export default function MultiplayerGame({ 
  roomId, 
  roomCode, 
  isHost, 
  onGameStateUpdate 
}: MultiplayerGameProps) {
  const { user } = useTelegram();
  const { inviteToGame, inviteFriend } = useTelegramShare();
  
  // WebSocket подключение
  const {
    isConnected,
    isConnecting,
    messages,
    onlineUsers,
    updateGameState,
    sendPlayerMove,
    inviteFriend: inviteFriendWS,
    sendChatMessage,
    setPlayerReady,
    startGame,
    endGame
  } = useWebSocket({
    userId: user?.id?.toString(),
    roomId,
    autoConnect: true
  });

  // Игровое состояние
  const { 
    isGameActive,
    gameStage,
    players,
    currentPlayerId,
    tableStack,
    gameCoins,
    // Функции для изменения состояния
    makeMove,
    selectHandCard,
    playSelectedCard,
    takeTableCards,
    nextTurn
  } = useGameStore();

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Обработка WebSocket сообщений
  useEffect(() => {
    messages.forEach(message => {
      switch (message.type) {
        case 'game-state-sync':
          // Синхронизация состояния игры
          console.log('🔄 [Multiplayer] Синхронизация состояния:', message.data);
          if (onGameStateUpdate) {
            onGameStateUpdate(message.data);
          }
          break;

        case 'player-move-sync':
          // Синхронизация хода игрока
          console.log('🎯 [Multiplayer] Синхронизация хода:', message.data);
          // Здесь можно обновить состояние игры на основе хода другого игрока
          break;

        case 'friend-invitation':
          // Приглашение от друга
          console.log('💌 [Multiplayer] Приглашение от друга:', message.data);
          if (message.data.friendId === user?.id?.toString()) {
            // Показать уведомление о приглашении
            alert(`Вас пригласили в игру! Код комнаты: ${message.data.roomCode}`);
          }
          break;

        case 'game-chat-message':
          // Сообщение в чате
          setChatMessages(prev => [...prev, message.data]);
          break;

        case 'player-ready-sync':
          // Статус готовности игрока
          console.log('✅ [Multiplayer] Готовность игрока:', message.data);
          break;

        case 'game-started':
          // Игра началась
          console.log('🚀 [Multiplayer] Игра началась:', message.data);
          break;

        case 'game-ended':
          // Игра завершена
          console.log('🏁 [Multiplayer] Игра завершена:', message.data);
          break;
      }
    });
  }, [messages, onGameStateUpdate, user?.id]);

  // Автоматическая синхронизация состояния игры для хоста
  useEffect(() => {
    if (isHost && isConnected && isGameActive) {
      const gameState = {
        gameStage,
        players,
        currentPlayerId,
        tableStack,
        timestamp: Date.now()
      };
      updateGameState(gameState);
    }
  }, [isHost, isConnected, gameStage, players, currentPlayerId, tableStack, isGameActive]);

  // Отправка хода через WebSocket
  const handlePlayerMove = (moveData: any) => {
    console.log('🎯 [Multiplayer] Отправка хода:', moveData);
    sendPlayerMove({
      ...moveData,
      userId: user?.id?.toString(),
      timestamp: Date.now()
    });
  };

  // Переключение готовности
  const toggleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    setPlayerReady(newReadyState);
  };

  // Пригласить друга
  const handleInviteFriend = async (friendId: string) => {
    try {
      // Отправляем через WebSocket
      inviteFriendWS(friendId, roomCode);
      
      // Также отправляем через Telegram если доступно
      await inviteFriend(friendId);
      
      alert('Приглашение отправлено!');
    } catch (error) {
      console.error('Ошибка отправки приглашения:', error);
    }
  };

  // Поделиться комнатой
  const handleShareRoom = async () => {
    try {
      const result = inviteToGame({ 
        roomCode,
        roomName: `P.I.D.R. Игра`,
        playerCount: onlineUsers.length,
        maxPlayers: 4
      });
      if (!result) {
        console.error('Не удалось поделиться комнатой');
      }
    } catch (error) {
      console.error('Ошибка при поделке комнатой:', error);
    }
  };

  // Отправка сообщения в чат
  const handleSendMessage = (text: string) => {
    if (text.trim()) {
      sendChatMessage(text);
    }
  };

  // Начало игры (только для хоста)
  const handleStartGame = () => {
    if (isHost) {
      const gameSettings = {
        playerCount: players.length,
        startTime: Date.now()
      };
      startGame(gameSettings);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Мультиплеер</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-300">
              {isConnected ? 'Подключен' : isConnecting ? 'Подключение...' : 'Отключен'}
            </span>
          </div>
        </div>

        {/* Информация о комнате */}
        <div className="bg-gray-700 rounded p-3 mb-4">
          <div className="text-sm text-gray-300 mb-1">Код комнаты:</div>
          <div className="text-lg font-mono text-white">{roomCode}</div>
          <div className="text-sm text-gray-300 mt-2">
            Игроков онлайн: {onlineUsers.length}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="space-y-3 mb-4">
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!isConnected || isGameActive}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Начать игру
            </button>
          )}

          <button
            onClick={toggleReady}
            disabled={!isConnected}
            className={`w-full py-2 px-4 rounded text-white ${
              isReady 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-gray-600`}
          >
            {isReady ? '✅ Готов' : '⏱️ Не готов'}
          </button>

          <button
            onClick={handleShareRoom}
            disabled={!isConnected}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
          >
            📤 Поделиться комнатой
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!isConnected}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
          >
            👥 Пригласить друга
          </button>
        </div>

        {/* Мини-чат */}
        <div className="bg-gray-700 rounded p-3 h-32 overflow-y-auto mb-3">
          <div className="text-xs text-gray-400 mb-2">Чат игры:</div>
          {chatMessages.length === 0 ? (
            <div className="text-xs text-gray-500 italic">Сообщений пока нет...</div>
          ) : (
            chatMessages.slice(-5).map((msg, index) => (
              <div key={index} className="text-xs text-white mb-1">
                <span className="text-blue-400">{msg.userId}:</span> {msg.text}
              </div>
            ))
          )}
        </div>

        {/* Поле ввода чата */}
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Написать сообщение..."
            className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                handleSendMessage(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <button 
            onClick={() => {
              const input = document.querySelector('input[placeholder="Написать сообщение..."]') as HTMLInputElement;
              if (input?.value.trim()) {
                handleSendMessage(input.value);
                input.value = '';
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            💬
          </button>
        </div>

        {/* Модальное окно приглашения друзей */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-gray-800 rounded-lg p-4 max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-3">Пригласить друга</h3>
              <p className="text-gray-300 text-sm mb-4">
                Введите ID друга для отправки приглашения:
              </p>
              <input
                type="text"
                placeholder="ID друга"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-3"
                id="friend-id-input"
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const input = document.getElementById('friend-id-input') as HTMLInputElement;
                    if (input?.value.trim()) {
                      handleInviteFriend(input.value.trim());
                      setShowInviteModal(false);
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                >
                  Отправить
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
