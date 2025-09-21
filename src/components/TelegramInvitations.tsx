'use client'
import React, { useEffect, useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';


interface TelegramInvitation {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  inviterName: string;
  inviterAvatar: string;
  playerCount: string;
  status: string;
  inviteUrl: string;
  createdAt: string;
}

interface TelegramInvitationsProps {
  onJoinRoom?: (roomId: string, roomCode: string) => void;
}

export default function TelegramInvitations({ onJoinRoom }: TelegramInvitationsProps) {
  const { user, webApp } = useTelegram();

  
  const [invitations, setInvitations] = useState<TelegramInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createRoomData, setCreateRoomData] = useState({
    maxPlayers: 4,
    name: ''
  });

  // Загрузка приглашений
  const loadInvitations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/telegram-multiplayer?type=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Ошибка загрузки приглашений:', error);
    } finally {
      setLoading(false);
    }
  };

  // Принять приглашение
  const acceptInvitation = async (invitation: TelegramInvitation) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/telegram-multiplayer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'accept-invitation',
          invitationId: invitation.id
        })
      });

      const data = await response.json();
      if (data.success) {
        // Переходим в игру
        if (onJoinRoom) {
          onJoinRoom(invitation.roomId, invitation.roomCode);
        } else {
          window.location.href = `/game?roomId=${invitation.roomId}&roomCode=${invitation.roomCode}`;
        }
      } else {
        alert(data.message || 'Ошибка принятия приглашения');
      }
    } catch (error) {
      console.error('Ошибка принятия приглашения:', error);
      alert('Ошибка принятия приглашения');
    }
  };

  // Создать комнату для Telegram
  const createTelegramRoom = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Генерируем код комнаты
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const response = await fetch('/api/telegram-multiplayer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'create-telegram-room',
          roomCode,
          gameSettings: {
            maxPlayers: createRoomData.maxPlayers,
            source: 'telegram'
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        // Поделиться комнатой через Telegram
        if (data.room.telegramShareUrl) {
          if (webApp && webApp.openTelegramLink) {
            webApp.openTelegramLink(data.room.telegramShareUrl);
          } else {
            window.open(data.room.telegramShareUrl, '_blank');
          }
        }
        
        // Переходим в созданную комнату
        if (onJoinRoom) {
          onJoinRoom(data.room.id, data.room.code);
        } else {
          window.location.href = `/game?roomId=${data.room.id}&roomCode=${data.room.code}&host=true`;
        }
      } else {
        alert(data.message || 'Ошибка создания комнаты');
      }
    } catch (error) {
      console.error('Ошибка создания комнаты:', error);
      alert('Ошибка создания комнаты');
    }
  };

  // Поделиться приглашением
  const shareInvitation = async (invitation: TelegramInvitation) => {
    try {
      if (webApp && webApp.openTelegramLink) {
        const shareText = `🎮 Присоединяйся к игре P.I.D.R.!\n\n` +
                         `🎯 Комната: ${invitation.roomCode}\n` +
                         `👤 Создатель: ${invitation.inviterName}\n` +
                         `👥 Игроков: ${invitation.playerCount}\n\n` +
                         `Нажми на ссылку чтобы играть!`;
        
        webApp.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(invitation.inviteUrl)}&text=${encodeURIComponent(shareText)}`
        );
      } else {
        // Копируем ссылку в буфер обмена
        await navigator.clipboard.writeText(invitation.inviteUrl);
        alert('Ссылка скопирована в буфер обмена!');
      }
    } catch (error) {
      console.error('Ошибка при поделке:', error);
    }
  };

  useEffect(() => {
    loadInvitations();
    
    // Обновляем приглашения каждые 30 секунд
    const interval = setInterval(loadInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Загрузка приглашений...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">🎮 Telegram Игры</h2>
        <p className="text-gray-300 text-sm">
          Играйте с друзьями через Telegram
        </p>
      </div>

      {/* Кнопка создания комнаты */}
      <button
        onClick={() => setShowCreateRoom(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium"
      >
        ➕ Создать игру и пригласить друзей
      </button>

      {/* Список приглашений */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">📨 Приглашения ({invitations.length})</h3>
        
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">🎭</div>
            <div className="text-gray-300">Нет активных приглашений</div>
            <div className="text-gray-500 text-sm mt-1">
              Создайте игру или попросите друзей пригласить вас
            </div>
          </div>
        ) : (
          invitations.map(invitation => (
            <div key={invitation.id} className="bg-gray-700 rounded-lg p-4 space-y-3">
              {/* Информация о приглашении */}
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{invitation.inviterAvatar}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{invitation.inviterName}</div>
                  <div className="text-gray-300 text-sm">приглашает в игру</div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-mono text-sm">{invitation.roomCode}</div>
                  <div className="text-gray-400 text-xs">{invitation.playerCount}</div>
                </div>
              </div>

              {/* Название комнаты */}
              <div className="text-gray-300 text-sm">
                🎯 {invitation.roomName}
              </div>

              {/* Кнопки действий */}
              <div className="flex space-x-2">
                <button
                  onClick={() => acceptInvitation(invitation)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm font-medium"
                >
                  ✅ Принять
                </button>
                <button
                  onClick={() => shareInvitation(invitation)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                >
                  📤
                </button>
              </div>

              {/* Время приглашения */}
              <div className="text-gray-500 text-xs">
                {new Date(invitation.createdAt).toLocaleString('ru')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно создания комнаты */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">🎮 Создать игру</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Название игры</label>
                <input
                  type="text"
                  value={createRoomData.name}
                  onChange={(e) => setCreateRoomData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Моя крутая игра"
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Максимум игроков</label>
                <select
                  value={createRoomData.maxPlayers}
                  onChange={(e) => setCreateRoomData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
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
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={createTelegramRoom}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium"
              >
                🚀 Создать и поделиться
              </button>
              <button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
