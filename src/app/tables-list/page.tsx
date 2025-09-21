'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, Users, Lock, Unlock, Play, Eye, Crown, Clock, Gamepad2 } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { CreateRoomModal, JoinRoomModal } from '../../components/RoomModals';
import { useTelegramShare } from '../../hooks/useTelegramShare';
import TelegramInvitations from '../../components/TelegramInvitations';

interface GameRoom {
  id: string;
  room_code: string;
  name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  is_private: boolean;
  created_at: string;
  users?: {
    username: string;
    avatar: string;
  };
}

export default function TablesListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing' | 'telegram'>('waiting');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [newRoomData, setNewRoomData] = useState({
    name: 'P.I.D.R. Игра',
    maxPlayers: 4,
    isPrivate: false,
    password: ''
  });

  const { inviteToGame } = useTelegramShare();

  useEffect(() => {
    loadRooms();
  }, [filter]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || 'no-auth-token';
      
      console.log('🔄 Загружаем комнаты с фильтром:', filter);

      const response = await fetch(`/api/rooms?type=${filter === 'all' ? 'public' : 'joinable'}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const { rooms } = await response.json();
        const filteredRooms = filter === 'all' 
          ? rooms 
          : rooms.filter((room: GameRoom) => room.status === filter);
        setRooms(filteredRooms || []);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem('auth_token') || 'no-auth-token';
      console.log('🏗️ Создаем комнату:', newRoomData);

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'create',
          roomName: newRoomData.name,
          maxPlayers: newRoomData.maxPlayers,
          isPrivate: newRoomData.isPrivate,
          password: newRoomData.password
        })
      });

      const result = await response.json();
      if (result.success) {
        setCreatingRoom(false);
        window.location.href = `/game?room=${result.room.roomCode}`;
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Ошибка при создании комнаты');
    }
  };

  const handleJoinRoom = async (roomCodeToJoin?: string) => {
    try {
      const token = localStorage.getItem('auth_token') || 'no-auth-token';
      console.log('🚪 Присоединяемся к комнате:', roomCodeToJoin || roomCode);

      const codeToUse = roomCodeToJoin || roomCode;
      if (!codeToUse) return;

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'join',
          roomCode: codeToUse.toUpperCase()
        })
      });

      const result = await response.json();
      if (result.success) {
        setJoiningRoom(false);
        setRoomCode('');
        window.location.href = `/game?room=${codeToUse}`;
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Ошибка при присоединении к комнате');
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.room_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">СТОЛЫ</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setJoiningRoom(true)}
              className="p-2 rounded-lg border border-green-400 text-green-200 hover:bg-green-400/10 transition-all"
              title="Присоединиться по коду"
            >
              <Play className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCreatingRoom(true)}
              className="p-2 rounded-lg border border-blue-400 text-blue-200 hover:bg-blue-400/10 transition-all"
              title="Создать комнату"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modals */}
        <CreateRoomModal 
          isOpen={creatingRoom}
          onClose={() => setCreatingRoom(false)}
          roomData={newRoomData}
          setRoomData={setNewRoomData}
          onCreateRoom={handleCreateRoom}
        />

        <JoinRoomModal 
          isOpen={joiningRoom}
          onClose={() => {
            setJoiningRoom(false);
            setRoomCode('');
          }}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          onJoinRoom={() => handleJoinRoom()}
        />

        {/* Filters */}
        <motion.div 
          className="flex gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { key: 'waiting', label: 'Ожидают', icon: Clock },
            { key: 'playing', label: 'В игре', icon: Gamepad2 },
            { key: 'telegram', label: 'Telegram', icon: Users },
            { key: 'all', label: 'Все', icon: Eye }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div 
          className="friends-search mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="search-container">
            <Search className="search-icon" />
            <input 
              type="text" 
              placeholder="Поиск комнат..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-white text-lg">Загрузка комнат...</div>
          </div>
        )}

        {/* Telegram Invitations */}
        {filter === 'telegram' && !loading && (
          <TelegramInvitations 
            onJoinRoom={(roomId, roomCode) => {
              window.location.href = `/game?roomId=${roomId}&roomCode=${roomCode}`;
            }}
          />
        )}

        {/* Rooms List */}
        {filter !== 'telegram' && !loading && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">Комнаты не найдены</div>
                <div className="text-gray-500">Создайте новую комнату или попробуйте другой фильтр</div>
              </div>
            ) : (
              filteredRooms.map((room, index) => (
                <motion.div 
                  key={room.id}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {room.is_private ? (
                          <Lock className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-green-400" />
                        )}
                        {room.status === 'playing' && (
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-white text-lg">{room.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                            {room.room_code}
                          </span>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{room.current_players}/{room.max_players}</span>
                          </div>
                          {room.users && (
                            <div className="flex items-center gap-1">
                              <Crown className="w-4 h-4 text-yellow-400" />
                              <span>{room.users.username}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => inviteToGame({
                          roomCode: room.room_code,
                          roomName: room.name,
                          playerCount: room.current_players,
                          maxPlayers: room.max_players
                        })}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        title="Поделиться"
                      >
                        <Users className="w-4 h-4" />
                      </button>

                      {room.status === 'waiting' && (
                        <button
                          onClick={() => handleJoinRoom(room.room_code)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            room.current_players < room.max_players
                              ? 'bg-green-600 text-white hover:bg-green-500'
                              : 'bg-yellow-600 text-white hover:bg-yellow-500'
                          }`}
                          title={room.current_players >= room.max_players ? 'Комната заполнена, но админ может войти' : 'Присоединиться к игре'}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {room.current_players >= room.max_players ? 'Войти (Админ)' : 'Играть'}
                        </button>
                      )}

                      {room.status === 'playing' && (
                        <button
                          className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg cursor-not-allowed"
                          disabled
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Смотреть
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

      <BottomNav />
      </div>
    </div>
  );
} 
