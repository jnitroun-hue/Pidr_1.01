'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Search, Check, X, User, Users, Gamepad2, Share, Copy } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { useTelegramShare } from '../../hooks/useTelegramShare';

interface Friend {
  id: string;
  name: string;
  status: string;
  avatar: string;
  lastSeen?: string;
  isOnline?: boolean;
  currentRoom?: string;
}

interface FriendRequest {
  id: string;
  userId: string;
  name: string;
  message: string;
  avatar: string;
  date: string;
}

interface SuggestedFriend {
  id: string;
  name: string;
  avatar: string;
  mutualFriends: number;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>([]);
  const [addingFriend, setAddingFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [userReferralCode, setUserReferralCode] = useState<string>('');
  
  const { inviteFriend, shareReferral } = useTelegramShare();

  // Загрузка данных друзей
  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Загружаем онлайн друзей
      const onlineResponse = await fetch('/api/friends?type=online', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (onlineResponse.ok) {
        const { friends } = await onlineResponse.json();
        setOnlineFriends(friends || []);
      }

      // Загружаем всех друзей
      const allResponse = await fetch('/api/friends?type=all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (allResponse.ok) {
        const { friends } = await allResponse.json();
        setAllFriends(friends || []);
      }

      // Загружаем запросы в друзья
      const requestsResponse = await fetch('/api/friends?type=requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (requestsResponse.ok) {
        const { requests } = await requestsResponse.json();
        setFriendRequests(requests || []);
      }

      // Загружаем предложения
      const suggestedResponse = await fetch('/api/friends?type=suggested', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (suggestedResponse.ok) {
        const { suggested } = await suggestedResponse.json();
        setSuggestedFriends(suggested || []);
      }

      // Загружаем реферальный код пользователя
      const referralResponse = await fetch('/api/referral?action=get_code', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (referralResponse.ok) {
        const { referralCode } = await referralResponse.json();
        setUserReferralCode(referralCode || '');
      }

    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавить друга
  const handleAddFriend = async (username: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add',
          username: username.trim()
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setNewFriendName('');
        setAddingFriend(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      alert('Ошибка при добавлении друга');
    }
  };

  // Принять запрос в друзья
  const handleAcceptRequest = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'accept',
          friendId: userId
        })
      });

      const result = await response.json();
      if (result.success) {
        // Обновляем списки
        loadFriendsData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  // Отклонить запрос в друзья
  const handleDeclineRequest = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'decline',
          friendId: userId
        })
      });

      const result = await response.json();
      if (result.success) {
        // Обновляем списки
        loadFriendsData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  // Пригласить в игру
  const handleInviteToGame = (friend: Friend) => {
    // TODO: Интеграция с системой комнат
    if (friend.currentRoom) {
      // Если друг уже в игре, можно присоединиться к его комнате
      alert(`${friend.name} уже играет! Хотите присоединиться к их игре?`);
    } else {
      // Создать новую игру и пригласить друга
      alert(`Приглашение в игру отправлено ${friend.name}!`);
    }
  };

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">ДРУЗЬЯ</span>
          <div className="flex gap-2">
            <button 
              onClick={() => userReferralCode && shareReferral(userReferralCode)}
              disabled={!userReferralCode}
              className={`p-2 rounded-lg border transition-all ${
                userReferralCode 
                  ? 'border-blue-400 text-blue-200 hover:bg-blue-400/10' 
                  : 'border-gray-600 text-gray-500 cursor-not-allowed'
              }`}
              title="Пригласить друзей через Telegram"
            >
              <Share className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setAddingFriend(true)}
              className="friends-add-btn"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Friend Modal */}
        {addingFriend && (
          <motion.div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Добавить друга</h3>
              <input
                type="text"
                placeholder="Введите имя пользователя..."
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setAddingFriend(false);
                    setNewFriendName('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (newFriendName.trim()) {
                      handleAddFriend(newFriendName);
                    }
                  }}
                  disabled={!newFriendName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Добавить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Search */}
        <motion.div 
          className="friends-search"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="search-container">
            <Search className="search-icon" />
            <input 
              type="text" 
              placeholder="Поиск друзей..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-white text-lg">Загрузка друзей...</div>
          </div>
        )}

        {/* Online Friends */}
        <motion.div 
          className="friends-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="friends-section-title">
            <span className="online-indicator">🟢</span>
            ОНЛАЙН ({onlineFriends.length})
          </h3>
          <div className="friends-list">
            {onlineFriends.map((friend, index) => (
              <motion.div 
                key={friend.id}
                className="friend-card online"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="friend-avatar">
                  <span className="friend-avatar-emoji">{friend.avatar}</span>
                </div>
                <div className="friend-info">
                  <h4 className="friend-name">{friend.name}</h4>
                  <p className={`friend-status ${friend.status === 'В игре' ? 'in-game' : 'online'}`}>
                    {friend.status}
                  </p>
                </div>
                <motion.button 
                  className="friend-action-btn play"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInviteToGame(friend)}
                >
                  <Gamepad2 className="action-icon" />
                  Играть
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* All Friends */}
        <motion.div 
          className="friends-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="friends-section-title">
            <Users className="section-icon" />
            ВСЕ ДРУЗЬЯ ({allFriends.length})
          </h3>
          <div className="friends-list">
            {allFriends.map((friend, index) => (
              <motion.div 
                key={friend.id}
                className="friend-card offline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="friend-avatar">
                  <span className="friend-avatar-emoji">{friend.avatar}</span>
                </div>
                <div className="friend-info">
                  <h4 className="friend-name">{friend.name}</h4>
                  <p className="friend-status offline">{friend.status}</p>
                </div>
                <motion.button 
                  className="friend-action-btn profile"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <User className="action-icon" />
                  Профиль
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Friend Requests */}
        <motion.div 
          className="friends-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="friends-section-title">
            <UserPlus className="section-icon" />
            ЗАПРОСЫ В ДРУЗЬЯ ({friendRequests.length})
          </h3>
          <div className="friends-list">
            {friendRequests.map((request, index) => (
              <motion.div 
                key={request.id}
                className="friend-card request"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="friend-avatar">
                  <span className="friend-avatar-emoji">{request.avatar}</span>
                </div>
                <div className="friend-info">
                  <h4 className="friend-name">{request.name}</h4>
                  <p className="friend-status request">{request.message}</p>
                </div>
                <div className="request-actions">
                  <motion.button 
                    className="request-btn accept"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAcceptRequest(request.userId)}
                  >
                    <Check className="request-icon" />
                  </motion.button>
                  <motion.button 
                    className="request-btn decline"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeclineRequest(request.userId)}
                  >
                    <X className="request-icon" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Invite from Telegram Section */}
        <motion.div 
          className="friends-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <h3 className="friends-section-title">
            <Share className="section-icon" />
            ПРИГЛАСИТЬ ИЗ TELEGRAM
          </h3>
          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-400/30 p-4">
            <h4 className="text-white font-bold text-lg mb-3 text-center">
              🎁 Приглашай друзей за монеты
            </h4>
            
            <div className="flex gap-3 mb-3">
              {/* НАСТОЯЩАЯ КНОПКА ПОДЕЛИТЬСЯ */}
              <motion.button 
                onClick={() => {
                  const fallbackCode = userReferralCode || 'DEMO123';
                  shareReferral(fallbackCode);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-4 rounded-lg shadow-xl border-2 border-blue-400 transition-all duration-200 transform hover:scale-105 active:scale-95"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 8px 25px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Share className="w-5 h-5" />
                  <span>Поделиться</span>
                </div>
              </motion.button>

              {/* НАСТОЯЩАЯ КНОПКА КОПИРОВАНИЯ */}
              <motion.button 
                onClick={() => {
                  const fallbackCode = userReferralCode || 'DEMO123';
                  const referralUrl = `${window.location.origin}?ref=${fallbackCode}`;
                  navigator.clipboard.writeText(referralUrl).then(() => {
                    const notification = document.createElement('div');
                    notification.innerHTML = '✅ Скопировано!';
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                    document.body.appendChild(notification);
                    setTimeout(() => document.body.removeChild(notification), 2000);
                  });
                }}
                className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white p-4 rounded-lg shadow-xl border-2 border-gray-400 transition-all duration-200 transform hover:scale-105 active:scale-95"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                style={{
                  background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                  boxShadow: '0 8px 25px rgba(75, 85, 99, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
                title="Скопировать ссылку"
              >
                <Copy className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Только код, без лишнего текста */}
            {userReferralCode && (
              <div className="bg-black/40 rounded-lg p-2 text-center">
                <span className="text-blue-400 font-mono text-sm">
                  {userReferralCode}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Suggested Friends */}
        <motion.div 
          className="friends-section suggested"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className="friends-section-title">
            <Search className="section-icon" />
            ВОЗМОЖНЫЕ ДРУЗЬЯ
          </h3>
          <div className="suggested-grid">
            {suggestedFriends.map((suggestion, index) => (
              <motion.div 
                key={suggestion.id}
                className="suggested-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="suggested-avatar">
                  <span className="suggested-avatar-emoji">{suggestion.avatar}</span>
                </div>
                <h4 className="suggested-name">{suggestion.name}</h4>
                <p className="suggested-mutual">
                  {suggestion.mutualFriends} общ{suggestion.mutualFriends === 1 ? 'ий друг' : 'их друга'}
                </p>
                <motion.button 
                  className="suggested-add-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddFriend(suggestion.name)}
                >
                  <UserPlus className="add-icon" />
                  Добавить
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <BottomNav />
      </div>
    </div>
  );
}
