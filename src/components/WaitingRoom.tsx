'use client';

import { useState, useEffect } from 'react';
import { Users, Bot, Crown, Copy, Share2, Plus, Play, ArrowLeft, Clock, Wifi } from 'lucide-react';

interface WaitingRoomProps {
  roomCode: string;
  roomSettings: {
    hasPassword: boolean;
    maxPlayers: number;
    tableType: string;
    isHost: boolean;
  };
  players: Player[];
  onBack: () => void;
  onStartGame: () => void;
  onAddBot: () => void;
  onKickPlayer?: (playerId: string) => void;
  onLeaveRoom: () => void;
  onCloseRoom?: () => void; // Добавили функцию для закрытия комнаты
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isReady: boolean;
  isHost: boolean;
  isOnline: boolean;
}

export default function WaitingRoom({ 
  roomCode, 
  roomSettings, 
  players, 
  onBack, 
  onStartGame, 
  onAddBot, 
  onKickPlayer,
  onLeaveRoom,
  onCloseRoom 
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const shareRoom = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'P.I.D.R. - Присоединяйся к игре!',
          text: `Присоединяйся к моей комнате P.I.D.R.! Код: ${roomCode}`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyRoomCode();
    }
  };

  const canStartGame = players.length >= 4 && players.filter(p => !p.isReady && !p.isBot).length === 0;
  const emptySlots = roomSettings.maxPlayers - players.length;

  // Auto-start countdown when all players are ready
  useEffect(() => {
    if (canStartGame && roomSettings.isHost && countdown === null) {
      setCountdown(5);
    } else if (!canStartGame && countdown !== null) {
      setCountdown(null);
    }
  }, [canStartGame, roomSettings.isHost, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onStartGame();
    }
  }, [countdown, onStartGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Назад</span>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Комната ожидания</h1>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Wifi size={16} />
            <span>Онлайн</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {roomSettings.isHost && onCloseRoom && (
            <button 
              onClick={onCloseRoom}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              title="Закрыть комнату (только для создателя)"
            >
              Закрыть комнату
            </button>
          )}
          <button 
            onClick={onLeaveRoom}
            className="text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Room Info */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Room Code */}
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">Код комнаты</h3>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-xl font-mono text-2xl text-white tracking-widest">
                  {roomCode}
                </div>
                <button
                  onClick={copyRoomCode}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-xl transition-colors"
                  title="Копировать код"
                >
                  <Copy size={20} />
                </button>
                <button
                  onClick={shareRoom}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl transition-colors"
                  title="Поделиться"
                >
                  <Share2 size={20} />
                </button>
              </div>
              {copied && (
                <p className="text-green-300 text-sm mt-1">Код скопирован!</p>
              )}
            </div>

            {/* Room Settings */}
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">Настройки</h3>
              <div className="space-y-1 text-white/80 text-sm">
                <div>Стол: {roomSettings.tableType}</div>
                <div>Игроки: {players.length}/{roomSettings.maxPlayers}</div>
                <div>Пароль: {roomSettings.hasPassword ? '🔒 Да' : '🔓 Нет'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users size={20} />
              Игроки ({players.length}/{roomSettings.maxPlayers})
            </h3>
            
            {roomSettings.isHost && emptySlots > 0 && (
              <button
                onClick={onAddBot}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors"
              >
                <Bot size={16} />
                Добавить бота
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Existing Players */}
            {players.map((player) => (
              <div
                key={player.id}
                className={`relative bg-white/20 rounded-2xl p-4 border-2 transition-all ${
                  player.isReady 
                    ? 'border-green-400 bg-green-500/20' 
                    : 'border-white/30'
                }`}
              >
                {/* Host Crown */}
                {player.isHost && (
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-yellow-500 rounded-full p-1">
                      <Crown size={16} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Bot Indicator */}
                {player.isBot && (
                  <div className="absolute -top-2 -left-2">
                    <div className="bg-purple-500 rounded-full p-1">
                      <Bot size={16} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Avatar */}
                <div className="text-center mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto">
                    {player.avatar}
                  </div>
                  <div className={`w-3 h-3 rounded-full mx-auto mt-1 ${
                    player.isOnline ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                </div>

                {/* Name */}
                <div className="text-center">
                  <div className="text-white font-medium text-sm truncate">
                    {player.name}
                  </div>
                  <div className={`text-xs mt-1 ${
                    player.isReady ? 'text-green-300' : 'text-white/60'
                  }`}>
                    {player.isReady ? 'Готов' : 'Ожидает'}
                  </div>
                </div>

                {/* Kick Button (for host) */}
                {roomSettings.isHost && !player.isHost && onKickPlayer && (
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 hover:opacity-100 transition-opacity"
                    title="Исключить игрока"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: emptySlots }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-4 flex items-center justify-center"
              >
                <div className="text-center text-white/40">
                  <Plus size={24} className="mx-auto mb-2" />
                  <div className="text-xs">Ожидание</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game Start Section */}
      <div className="max-w-4xl mx-auto">
        {countdown !== null ? (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-center">
            <div className="text-white text-2xl font-bold mb-2 flex items-center justify-center gap-3">
              <Clock size={32} />
              Игра начнется через {countdown}
            </div>
            <p className="text-green-100">Все игроки готовы!</p>
          </div>
        ) : roomSettings.isHost ? (
          <div className="text-center">
            <button
              onClick={onStartGame}
              disabled={!canStartGame}
              className={`font-bold py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 mx-auto ${
                canStartGame
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Play size={24} />
              {canStartGame ? 'Начать игру' : `Нужно минимум 4 игрока (${players.length}/4)`}
            </button>
            
            {!canStartGame && players.length >= 4 && (
              <p className="text-white/60 text-sm mt-2">
                Ждем, пока все игроки будут готовы
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-white text-lg font-semibold mb-2">
                Ожидание хоста
              </div>
              <p className="text-white/60">
                Хост комнаты запустит игру, когда все будут готовы
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
