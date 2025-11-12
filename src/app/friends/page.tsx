'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Search, User, Users, Share2, Trophy } from 'lucide-react';

interface Friend {
  telegram_id: number;
  username: string;
  first_name: string;
  avatar_url?: string;
  rating: number;
  games_played: number;
  wins: number;
  status: 'online' | 'offline';
  last_seen?: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);

  // Загрузка друзей из БД
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (!telegramUser) {
        console.error('❌ Telegram user не найден');
        return;
      }

      const response = await fetch('/api/friends/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser.id.toString(),
          'x-username': telegramUser.username || telegramUser.first_name
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFriends(result.friends || []);
          console.log('✅ Друзья загружены:', result.friends?.length);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки друзей:', error);
    } finally {
      setLoading(false);
    }
  };

  // Поиск пользователей
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      const response = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'x-telegram-id': telegramUser?.id?.toString() || '',
          'x-username': telegramUser?.username || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.users || []);
      }
    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
    } finally {
      setSearching(false);
    }
  };

  // Добавить в друзья
  const handleAddFriend = async (friendId: number) => {
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser?.id?.toString() || '',
          'x-username': telegramUser?.username || ''
        },
        body: JSON.stringify({ friend_id: friendId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('✅ Друг добавлен!');
          loadFriends();
        }
      }
    } catch (error) {
      console.error('❌ Ошибка добавления друга:', error);
    }
  };

  // Поделиться приглашением
  const handleShareInvite = () => {
    const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    const inviteLink = `https://t.me/NotPidrBot?start=invite_${telegramUser?.id}`;
    const shareText = `🎮 Присоединяйся ко мне в The Must! - карточной игре!\n\n${inviteLink}`;
    
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`);
    }
  };

  const onlineFriends = friends.filter(f => f.status === 'online');
  const offlineFriends = friends.filter(f => f.status === 'offline');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      {/* Кнопка назад */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/profile')}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.6) 100%)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '700',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          zIndex: 1000
        }}
      >
        <ArrowLeft size={20} />
        НАЗАД
      </motion.button>

      {/* Заголовок */}
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          fontSize: '32px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '2px'
        }}
      >
        👥 ДРУЗЬЯ
      </motion.h1>

      {/* Поиск */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          marginBottom: '24px'
        }}
      >
        <Search 
          size={20} 
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            zIndex: 2
          }}
        />
        <input
          type="text"
          placeholder="Поиск друзей..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px 14px 50px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            color: '#e2e8f0',
            fontSize: '16px',
            outline: 'none',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}
        />
      </motion.div>

      {/* Кнопка пригласить */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleShareInvite}
        style={{
          width: '100%',
          padding: '16px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
        }}
      >
        <Share2 size={20} />
        ПРИГЛАСИТЬ ДРУЗЕЙ
      </motion.button>

      {/* Результаты поиска */}
      {searchQuery.length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginBottom: '24px' }}
        >
          <h2 style={{
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '12px',
            letterSpacing: '1px'
          }}>
            🔍 РЕЗУЛЬТАТЫ ПОИСКА ({searchResults.length})
          </h2>
          {searching ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              Поиск...
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              Ничего не найдено
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {searchResults.map(user => (
                <motion.div
                  key={user.telegram_id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '16px' }}>
                      {user.first_name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '14px' }}>
                      @{user.username}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddFriend(user.telegram_id)}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <UserPlus size={16} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Онлайн друзья */}
      {onlineFriends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '24px' }}
        >
          <h2 style={{
            color: '#22c55e',
            fontSize: '14px',
            fontWeight: '700',
            marginBottom: '12px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 2s ease-in-out infinite'
            }}></div>
            ОНЛАЙН ({onlineFriends.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {onlineFriends.map(friend => (
              <FriendCard key={friend.telegram_id} friend={friend} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Все друзья */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{
          color: '#94a3b8',
          fontSize: '14px',
          fontWeight: '700',
          marginBottom: '12px',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Users size={16} />
          ВСЕ ДРУЗЬЯ ({friends.length})
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            Загрузка...
          </div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            <User size={48} style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              У вас пока нет друзей
            </div>
            <div style={{ fontSize: '14px' }}>
              Пригласите друзей через кнопку выше!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {friends.map(friend => (
              <FriendCard key={friend.telegram_id} friend={friend} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Компонент карточки друга
function FriendCard({ friend }: { friend: Friend }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: `2px solid ${friend.status === 'online' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px'
        }}>
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.username} style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }} />
          ) : (
            '👤'
          )}
        </div>
        {friend.status === 'online' && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #0f172a'
          }}></div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          color: '#e2e8f0',
          fontWeight: '700',
          fontSize: '16px',
          marginBottom: '4px'
        }}>
          {friend.first_name}
        </div>
        <div style={{
          color: '#64748b',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Trophy size={12} style={{ color: '#fbbf24' }} />
          {friend.rating} • {friend.wins}/{friend.games_played}
        </div>
      </div>
      {friend.status === 'online' && (
        <div style={{
          padding: '6px 12px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '700'
        }}>
          В сети
        </div>
      )}
    </motion.div>
  );
}
