'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Settings, 
  Shield, 
  TrendingUp, 
  Coins, 
  Gamepad2,
  LogOut,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Ticket,
  CreditCard,
  Sparkles,
  Plus
} from 'lucide-react';

interface User {
  telegram_id: string;
  username: string | null;
  coins: number;
  total_games: number;
  wins: number;
  losses: number;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

type TabType = 'users' | 'promocodes' | 'transactions' | 'card-generator';

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Promocodes state
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [promocodesPage, setPromocodesPage] = useState(1);
  const [promocodesTotalPages, setPromocodesTotalPages] = useState(1);
  const [showPromocodeModal, setShowPromocodeModal] = useState(false);
  const [newPromocode, setNewPromocode] = useState({
    code: '',
    description: '',
    reward_type: 'coins',
    reward_value: 0,
    max_uses: null as number | null,
    expires_at: ''
  });
  
  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState({
    user_id: '',
    type: '',
    status: ''
  });
  
  // Card Generator state
  const [cardGenerator, setCardGenerator] = useState({
    user_id: '',
    rank: 'A',
    suit: 'hearts',
    rarity: 'common',
    wallet_address: '',
    network: 'TON'
  });
  const [generating, setGenerating] = useState(false);

  // Проверка прав администратора
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/admin/check', {
          credentials: 'include'
        });

        const data = await response.json();
        
        if (!data.success || !data.isAdmin) {
          router.push('/');
          return;
        }

        setIsAdmin(true);
        loadUsers();
        if (activeTab === 'promocodes') loadPromocodes();
        if (activeTab === 'transactions') loadTransactions();
      } catch (error) {
        console.error('❌ Ошибка проверки админ-прав:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  // Загрузка пользователей
  const loadUsers = async (page: number = 1) => {
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=20`, {
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователей:', error);
    }
  };

  // Обновление пользователя
  const updateUser = async (userId: string, updates: any) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId, updates })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadUsers(currentPage);
        setSelectedUser(null);
      } else {
        alert('Ошибка обновления: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления:', error);
      alert('Ошибка обновления пользователя');
    } finally {
      setUpdating(false);
    }
  };

  // Загрузка промокодов
  const loadPromocodes = async (page: number = 1) => {
    try {
      const response = await fetch(`/api/admin/promocodes?page=${page}&limit=20`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setPromocodes(data.promocodes || []);
        setPromocodesPage(data.pagination.page);
        setPromocodesTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки промокодов:', error);
    }
  };

  // Загрузка транзакций
  const loadTransactions = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      if (transactionFilter.user_id) params.append('user_id', transactionFilter.user_id);
      if (transactionFilter.type) params.append('type', transactionFilter.type);
      if (transactionFilter.status) params.append('status', transactionFilter.status);

      const response = await fetch(`/api/admin/transactions?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setTransactionsPage(data.pagination.page);
        setTransactionsTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки транзакций:', error);
    }
  };

  // Создание промокода
  const createPromocode = async () => {
    try {
      const response = await fetch('/api/admin/promocodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newPromocode)
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Промокод создан!');
        setShowPromocodeModal(false);
        setNewPromocode({
          code: '',
          description: '',
          reward_type: 'coins',
          reward_value: 0,
          max_uses: null,
          expires_at: ''
        });
        loadPromocodes();
      } else {
        alert('❌ Ошибка: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка создания промокода:', error);
      alert('❌ Ошибка создания промокода');
    }
  };

  // Генерация карты
  const generateCard = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cardGenerator)
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ NFT карта создана! ID: ${data.nft_card.id}`);
        setCardGenerator({
          user_id: '',
          rank: 'A',
          suit: 'hearts',
          rarity: 'common',
          wallet_address: '',
          network: 'TON'
        });
      } else {
        alert('❌ Ошибка: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка генерации карты:', error);
      alert('❌ Ошибка генерации карты');
    } finally {
      setGenerating(false);
    }
  };

  // Загрузка данных при смене таба
  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'promocodes') loadPromocodes();
      if (activeTab === 'transactions') loadTransactions();
    }
  }, [activeTab, isAdmin]);

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.telegram_id.toString().includes(query)
    );
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={48} color="white" />
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '20px',
      color: '#e2e8f0'
    }}>
      {/* Заголовок */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              marginBottom: '8px'
            }}>
              🔐 Админ Панель
            </h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              Управление пользователями и системой
            </p>
          </div>
          <motion.button
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 24px',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            <ChevronLeft size={20} />
            Главное меню
          </motion.button>
        </div>

        {/* Табы */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '30px',
          borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
          paddingBottom: '12px'
        }}>
          {(['users', 'promocodes', 'transactions', 'card-generator'] as TabType[]).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '12px 24px',
                background: activeTab === tab 
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'rgba(100, 116, 139, 0.2)',
                border: `2px solid ${activeTab === tab ? 'rgba(99, 102, 241, 0.5)' : 'rgba(100, 116, 139, 0.3)'}`,
                borderRadius: '12px',
                color: activeTab === tab ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {tab === 'users' && <Users size={18} />}
              {tab === 'promocodes' && <Ticket size={18} />}
              {tab === 'transactions' && <CreditCard size={18} />}
              {tab === 'card-generator' && <Sparkles size={18} />}
              {tab === 'users' && 'Пользователи'}
              {tab === 'promocodes' && 'Промокоды'}
              {tab === 'transactions' && 'Транзакции'}
              {tab === 'card-generator' && 'Генератор карт'}
            </motion.button>
          ))}
        </div>

        {/* Статистика */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Users size={32} color="#6366f1" />
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1' }}>
                {users.length}
              </div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>Пользователей</div>
            </div>
          </motion.div>
          {activeTab === 'promocodes' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Ticket size={32} color="#fbbf24" />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#fbbf24' }}>
                  {promocodes.length}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Промокодов</div>
              </div>
            </motion.div>
          )}
          {activeTab === 'transactions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <CreditCard size={32} color="#22c55e" />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>
                  {transactions.length}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Транзакций</div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Поиск */}
        <div style={{
          marginBottom: '20px',
          position: 'relative'
        }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b'
            }}
          />
          <input
            type="text"
            placeholder="Поиск по имени или ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              color: '#e2e8f0',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        {/* Таблица пользователей */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '2px solid rgba(100, 116, 139, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
            gap: '16px',
            padding: '16px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
            fontWeight: '700',
            fontSize: '14px',
            color: '#94a3b8'
          }}>
            <div>ID</div>
            <div>Имя</div>
            <div>Монеты</div>
            <div>Игры</div>
            <div>Победы</div>
            <div>Статус</div>
            <div>Действия</div>
          </div>

          {filteredUsers.map((user) => (
            <motion.div
              key={user.telegram_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
                gap: '16px',
                padding: '16px',
                borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                alignItems: 'center'
              }}
            >
              <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                {user.telegram_id}
              </div>
              <div style={{ color: '#e2e8f0', fontWeight: '600' }}>
                {user.username || 'Без имени'}
              </div>
              <div style={{ color: '#fbbf24', fontWeight: '600' }}>
                {user.coins.toLocaleString()}
              </div>
              <div style={{ color: '#cbd5e1' }}>
                {user.total_games || 0}
              </div>
              <div style={{ color: '#10b981', fontWeight: '600' }}>
                {user.wins || 0}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.is_admin && (
                  <span style={{
                    padding: '4px 8px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Админ
                  </span>
                )}
                {user.is_active ? (
                  <Check size={16} color="#10b981" />
                ) : (
                  <X size={16} color="#ef4444" />
                )}
              </div>
              <div>
                <motion.button
                  onClick={() => setSelectedUser(user)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    color: '#6366f1',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Изменить
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Пагинация */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px'
        }}>
          <motion.button
            onClick={() => loadUsers(currentPage - 1)}
            disabled={currentPage === 1}
            whileHover={{ scale: currentPage > 1 ? 1.05 : 1 }}
            whileTap={{ scale: currentPage > 1 ? 0.95 : 1 }}
            style={{
              padding: '10px 16px',
              background: currentPage === 1 ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.2)',
              border: `2px solid ${currentPage === 1 ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
              borderRadius: '10px',
              color: currentPage === 1 ? '#64748b' : '#6366f1',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ChevronLeft size={18} />
            Назад
          </motion.button>
          
          <span style={{ color: '#cbd5e1', fontSize: '16px' }}>
            Страница {currentPage} из {totalPages}
          </span>
          
          <motion.button
            onClick={() => loadUsers(currentPage + 1)}
            disabled={currentPage >= totalPages}
            whileHover={{ scale: currentPage < totalPages ? 1.05 : 1 }}
            whileTap={{ scale: currentPage < totalPages ? 0.95 : 1 }}
            style={{
              padding: '10px 16px',
              background: currentPage >= totalPages ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.2)',
              border: `2px solid ${currentPage >= totalPages ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
              borderRadius: '10px',
              color: currentPage >= totalPages ? '#64748b' : '#6366f1',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Вперед
            <ChevronRight size={18} />
          </motion.button>
        </div>

        {/* Контент табов */}
        {activeTab === 'users' && (
          <>
            {/* Поиск */}
            <div style={{
              marginBottom: '20px',
              position: 'relative'
            }}>
              <Search 
                size={20} 
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }}
              />
              <input
                type="text"
                placeholder="Поиск по имени или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Таблица пользователей */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
                gap: '16px',
                padding: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
                fontWeight: '700',
                fontSize: '14px',
                color: '#94a3b8'
              }}>
                <div>ID</div>
                <div>Имя</div>
                <div>Монеты</div>
                <div>Игры</div>
                <div>Победы</div>
                <div>Статус</div>
                <div>Действия</div>
              </div>

              {filteredUsers.map((user) => (
                <motion.div
                  key={user.telegram_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto',
                    gap: '16px',
                    padding: '16px',
                    borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                    {user.telegram_id}
                  </div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>
                    {user.username || 'Без имени'}
                  </div>
                  <div style={{ color: '#fbbf24', fontWeight: '600' }}>
                    {user.coins.toLocaleString()}
                  </div>
                  <div style={{ color: '#cbd5e1' }}>
                    {user.total_games || 0}
                  </div>
                  <div style={{ color: '#10b981', fontWeight: '600' }}>
                    {user.wins || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user.is_admin && (
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        Админ
                      </span>
                    )}
                    {user.is_active ? (
                      <Check size={16} color="#10b981" />
                    ) : (
                      <X size={16} color="#ef4444" />
                    )}
                  </div>
                  <div>
                    <motion.button
                      onClick={() => setSelectedUser(user)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '8px',
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      Изменить
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Пагинация пользователей */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '20px'
            }}>
              <motion.button
                onClick={() => loadUsers(currentPage - 1)}
                disabled={currentPage === 1}
                whileHover={{ scale: currentPage > 1 ? 1.05 : 1 }}
                whileTap={{ scale: currentPage > 1 ? 0.95 : 1 }}
                style={{
                  padding: '10px 16px',
                  background: currentPage === 1 ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                  border: `2px solid ${currentPage === 1 ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
                  borderRadius: '10px',
                  color: currentPage === 1 ? '#64748b' : '#6366f1',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ChevronLeft size={18} />
                Назад
              </motion.button>
              
              <span style={{ color: '#cbd5e1', fontSize: '16px' }}>
                Страница {currentPage} из {totalPages}
              </span>
              
              <motion.button
                onClick={() => loadUsers(currentPage + 1)}
                disabled={currentPage >= totalPages}
                whileHover={{ scale: currentPage < totalPages ? 1.05 : 1 }}
                whileTap={{ scale: currentPage < totalPages ? 0.95 : 1 }}
                style={{
                  padding: '10px 16px',
                  background: currentPage >= totalPages ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                  border: `2px solid ${currentPage >= totalPages ? 'rgba(100, 116, 139, 0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
                  borderRadius: '10px',
                  color: currentPage >= totalPages ? '#64748b' : '#6366f1',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Вперед
                <ChevronRight size={18} />
              </motion.button>
            </div>
          </>
        )}

        {activeTab === 'promocodes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: '700' }}>Промокоды</h2>
              <motion.button
                onClick={() => setShowPromocodeModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <Plus size={18} />
                Создать промокод
              </motion.button>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr auto',
                gap: '16px',
                padding: '16px',
                background: 'rgba(251, 191, 36, 0.1)',
                borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
                fontWeight: '700',
                fontSize: '14px',
                color: '#94a3b8'
              }}>
                <div>Код</div>
                <div>Описание</div>
                <div>Тип награды</div>
                <div>Значение</div>
                <div>Использовано</div>
                <div>Статус</div>
                <div>Действия</div>
              </div>

              {promocodes.map((promo) => (
                <div key={promo.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr auto',
                  gap: '16px',
                  padding: '16px',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  alignItems: 'center'
                }}>
                  <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '16px' }}>{promo.code}</div>
                  <div style={{ color: '#cbd5e1' }}>{promo.description || '-'}</div>
                  <div style={{ color: '#e2e8f0' }}>{promo.reward_type}</div>
                  <div style={{ color: '#10b981', fontWeight: '600' }}>{promo.reward_value}</div>
                  <div style={{ color: '#cbd5e1' }}>{promo.used_count} / {promo.max_uses || '∞'}</div>
                  <div>{promo.is_active ? <Check size={16} color="#10b981" /> : <X size={16} color="#ef4444" />}</div>
                  <div>
                    <motion.button
                      onClick={() => {
                        setNewPromocode({ ...promo, expires_at: promo.expires_at ? new Date(promo.expires_at).toISOString().split('T')[0] : '' });
                        setShowPromocodeModal(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '8px',
                        color: '#6366f1',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      Изменить
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <h2 style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: '700', marginBottom: '20px' }}>Транзакции</h2>
            
            {/* Фильтры */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="ID пользователя"
                value={transactionFilter.user_id}
                onChange={(e) => setTransactionFilter({ ...transactionFilter, user_id: e.target.value })}
                style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <select
                value={transactionFilter.type}
                onChange={(e) => setTransactionFilter({ ...transactionFilter, type: e.target.value })}
                style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Все типы</option>
                <option value="purchase">Покупка</option>
                <option value="reward">Награда</option>
                <option value="refund">Возврат</option>
                <option value="bonus">Бонус</option>
                <option value="promocode">Промокод</option>
                <option value="nft_mint">NFT минт</option>
              </select>
              <select
                value={transactionFilter.status}
                onChange={(e) => setTransactionFilter({ ...transactionFilter, status: e.target.value })}
                style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Все статусы</option>
                <option value="pending">Ожидает</option>
                <option value="completed">Завершено</option>
                <option value="failed">Ошибка</option>
                <option value="cancelled">Отменено</option>
              </select>
            </div>

            <motion.button
              onClick={() => loadTransactions(1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '12px 24px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                color: '#6366f1',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '20px'
              }}
            >
              Применить фильтры
            </motion.button>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                gap: '16px',
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderBottom: '2px solid rgba(100, 116, 139, 0.3)',
                fontWeight: '700',
                fontSize: '14px',
                color: '#94a3b8'
              }}>
                <div>ID</div>
                <div>Пользователь</div>
                <div>Тип</div>
                <div>Сумма</div>
                <div>Статус</div>
                <div>Дата</div>
              </div>

              {transactions.map((tx) => (
                <div key={tx.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '16px',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  alignItems: 'center'
                }}>
                  <div style={{ color: '#cbd5e1', fontSize: '14px' }}>#{tx.id}</div>
                  <div style={{ color: '#e2e8f0' }}>{tx.user_id}</div>
                  <div style={{ color: '#cbd5e1' }}>{tx.transaction_type}</div>
                  <div style={{ 
                    color: parseFloat(tx.amount) >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: '600'
                  }}>
                    {parseFloat(tx.amount) >= 0 ? '+' : ''}{tx.amount} {tx.currency}
                  </div>
                  <div>
                    {tx.status === 'completed' && <Check size={16} color="#10b981" />}
                    {tx.status === 'failed' && <X size={16} color="#ef4444" />}
                    {tx.status === 'pending' && <span style={{ color: '#fbbf24' }}>⏳</span>}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {new Date(tx.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'card-generator' && (
          <div>
            <h2 style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: '700', marginBottom: '20px' }}>Генератор карт</h2>
            
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  ID пользователя *
                </label>
                <input
                  type="text"
                  value={cardGenerator.user_id}
                  onChange={(e) => setCardGenerator({ ...cardGenerator, user_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                    Ранг
                  </label>
                  <select
                    value={cardGenerator.rank}
                    onChange={(e) => setCardGenerator({ ...cardGenerator, rank: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    {['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                    Масть
                  </label>
                  <select
                    value={cardGenerator.suit}
                    onChange={(e) => setCardGenerator({ ...cardGenerator, suit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    <option value="hearts">♥ Червы</option>
                    <option value="diamonds">♦ Бубны</option>
                    <option value="clubs">♣ Трефы</option>
                    <option value="spades">♠ Пики</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                    Редкость
                  </label>
                  <select
                    value={cardGenerator.rarity}
                    onChange={(e) => setCardGenerator({ ...cardGenerator, rarity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    <option value="common">Обычная</option>
                    <option value="rare">Редкая</option>
                    <option value="epic">Эпическая</option>
                    <option value="legendary">Легендарная</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                    Сеть
                  </label>
                  <select
                    value={cardGenerator.network}
                    onChange={(e) => setCardGenerator({ ...cardGenerator, network: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(100, 116, 139, 0.3)',
                      borderRadius: '10px',
                      color: '#e2e8f0',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  >
                    <option value="TON">TON</option>
                    <option value="SOL">Solana</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  Адрес кошелька (опционально)
                </label>
                <input
                  type="text"
                  value={cardGenerator.wallet_address}
                  onChange={(e) => setCardGenerator({ ...cardGenerator, wallet_address: e.target.value })}
                  placeholder="Оставьте пустым, если не нужно привязывать"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <motion.button
                onClick={generateCard}
                disabled={!cardGenerator.user_id || generating}
                whileHover={{ scale: generating ? 1 : 1.02 }}
                whileTap={{ scale: generating ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: generating ? 'rgba(100, 116, 139, 0.2)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: generating || !cardGenerator.user_id ? 'not-allowed' : 'pointer',
                  opacity: generating || !cardGenerator.user_id ? 0.6 : 1
                }}
              >
                {generating ? 'Генерация...' : '🎴 Сгенерировать карту'}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка создания/редактирования промокода */}
      {showPromocodeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPromocodeModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              borderRadius: '24px',
              border: '4px solid rgba(251, 191, 36, 0.6)',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#e2e8f0', marginBottom: '24px' }}>
              Создать промокод
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                Код *
              </label>
              <input
                type="text"
                value={newPromocode.code}
                onChange={(e) => setNewPromocode({ ...newPromocode, code: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                Описание
              </label>
              <textarea
                value={newPromocode.description}
                onChange={(e) => setNewPromocode({ ...newPromocode, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '16px',
                  outline: 'none',
                  minHeight: '80px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  Тип награды
                </label>
                <select
                  value={newPromocode.reward_type}
                  onChange={(e) => setNewPromocode({ ...newPromocode, reward_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                >
                  <option value="coins">Монеты</option>
                  <option value="nft">NFT</option>
                  <option value="item">Предмет</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  Значение *
                </label>
                <input
                  type="number"
                  value={newPromocode.reward_value}
                  onChange={(e) => setNewPromocode({ ...newPromocode, reward_value: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  Макс. использований
                </label>
                <input
                  type="number"
                  value={newPromocode.max_uses || ''}
                  onChange={(e) => setNewPromocode({ ...newPromocode, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Безлимит"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: '600' }}>
                  Срок действия
                </label>
                <input
                  type="date"
                  value={newPromocode.expires_at}
                  onChange={(e) => setNewPromocode({ ...newPromocode, expires_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '2px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <motion.button
                onClick={createPromocode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Создать
              </motion.button>
              <motion.button
                onClick={() => setShowPromocodeModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '14px 24px',
                  background: 'rgba(100, 116, 139, 0.2)',
                  border: '2px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '12px',
                  color: '#cbd5e1',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Модалка редактирования пользователя */}
      {selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={(updates) => updateUser(selectedUser.telegram_id, updates)}
          updating={updating}
        />
      )}
    </div>
  );
}

// Модалка редактирования пользователя
function UserEditModal({ 
  user, 
  onClose, 
  onSave, 
  updating 
}: { 
  user: User; 
  onClose: () => void; 
  onSave: (updates: any) => void;
  updating: boolean;
}) {
  const [coins, setCoins] = useState(user.coins.toString());
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [isActive, setIsActive] = useState(user.is_active);

  const handleSave = () => {
    const updates: any = {};
    
    const newCoins = parseInt(coins);
    if (!isNaN(newCoins) && newCoins !== user.coins) {
      updates.coins = newCoins;
    }
    
    if (isAdmin !== user.is_admin) {
      updates.is_admin = isAdmin;
    }
    
    if (isActive !== user.is_active) {
      updates.is_active = isActive;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '24px',
          border: '4px solid rgba(99, 102, 241, 0.6)',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <h2 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#e2e8f0',
          marginBottom: '24px'
        }}>
          Редактирование пользователя
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            ID: {user.telegram_id}
          </label>
          <label style={{
            display: 'block',
            color: '#94a3b8',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            Имя: {user.username || 'Без имени'}
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: '#cbd5e1',
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            Монеты
          </label>
          <input
            type="number"
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#cbd5e1',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <span>Администратор</span>
          </label>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#cbd5e1',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <span>Активен</span>
          </label>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <motion.button
            onClick={handleSave}
            disabled={updating}
            whileHover={{ scale: updating ? 1 : 1.02 }}
            whileTap={{ scale: updating ? 1 : 0.98 }}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.6 : 1
            }}
          >
            {updating ? 'Сохранение...' : 'Сохранить'}
          </motion.button>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '14px 24px',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '2px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              color: '#cbd5e1',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Отмена
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

