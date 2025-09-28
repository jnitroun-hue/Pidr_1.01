'use client';

import { useState, useEffect } from 'react';

export default function WalletDebugPage() {
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Загружаем пользователя из localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('👤 Пользователь загружен:', parsedUser);
    }
  }, []);

  const checkConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wallet/unified?action=validate_config');
      const data = await response.json();
      setConfig(data);
      console.log('🏦 Конфигурация кошельков:', data);
    } catch (error) {
      console.error('❌ Ошибка проверки конфигурации:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAddress = async (network: string) => {
    if (!user?.id) {
      alert('Нет ID пользователя');
      return;
    }

    setLoading(true);
    try {
      console.log(`🔄 Генерируем адрес для ${network}...`);
      
      const response = await fetch('/api/wallet/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          network: network,
          userId: user.id
        })
      });

      const result = await response.json();
      console.log(`📝 Результат для ${network}:`, result);

      if (result.success) {
        setAddresses(prev => [...prev, { network, ...result.address }]);
        alert(`✅ Адрес ${network} создан: ${result.address.address}`);
      } else {
        alert(`❌ Ошибка: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка генерации ${network}:`, error);
      alert(`❌ Ошибка: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Отладка кошельков</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>👤 Пользователь</h3>
        {user ? (
          <div>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Coins:</strong> {user.coins}</p>
          </div>
        ) : (
          <p>❌ Пользователь не найден в localStorage</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkConfig}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? '⏳ Проверяем...' : '🔍 Проверить конфигурацию'}
        </button>
      </div>

      {config && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e8', borderRadius: '8px' }}>
          <h3>🏦 Конфигурация кошельков</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>🎯 Генерация адресов</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['BTC', 'ETH', 'TON', 'SOL', 'USDT_TRC20', 'USDT_ERC20'].map(network => (
            <button
              key={network}
              onClick={() => generateAddress(network)}
              disabled={loading || !user?.id}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {network}
            </button>
          ))}
        </div>
      </div>

      {addresses.length > 0 && (
        <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
          <h3>📋 Сгенерированные адреса</h3>
          {addresses.map((addr, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '5px' }}>
              <p><strong>{addr.network}:</strong></p>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                {addr.address}
              </p>
              <button
                onClick={() => navigator.clipboard?.writeText(addr.address)}
                style={{ padding: '5px 10px', fontSize: '12px' }}
              >
                📋 Копировать
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
