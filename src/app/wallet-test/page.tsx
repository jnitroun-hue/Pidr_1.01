'use client';

import { useState, useEffect } from 'react';

interface WalletAddress {
  network: string;
  address: string;
  derivationIndex?: number;
  isActive: boolean;
  balance: string;
  createdAt: string;
}

interface WalletStats {
  totalNetworks: number;
  activeWallets: number;
  totalAddresses: number;
  lastActivity: string | null;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export default function WalletTestPage() {
  const [userId, setUserId] = useState('test_user_' + Date.now());
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('BTC');
  const [logs, setLogs] = useState<string[]>([]);

  const supportedNetworks = ['BTC', 'ETH', 'TON', 'USDT_TRC20', 'USDT_ERC20', 'SOL'];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Загрузка конфигурации при старте
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      addLog('🔍 Загрузка конфигурации системы...');
      const response = await fetch('/api/wallet/unified?action=validate_config');
      const data = await response.json();
      
      setValidation(data.validation);
      addLog(`✅ Конфигурация загружена: ${data.validation.isValid ? 'Валидна' : 'Есть ошибки'}`);
      
      if (data.validation.errors.length > 0) {
        data.validation.errors.forEach((error: string) => addLog(`❌ Ошибка: ${error}`));
      }
      
      if (data.validation.warnings.length > 0) {
        data.validation.warnings.forEach((warning: string) => addLog(`⚠️ Предупреждение: ${warning}`));
      }
    } catch (error) {
      addLog(`❌ Ошибка загрузки конфигурации: ${error}`);
    }
  };

  const loadStats = async () => {
    try {
      addLog('📊 Загрузка статистики системы...');
      const response = await fetch('/api/wallet/unified?action=get_stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        addLog(`✅ Статистика загружена: ${data.stats.activeWallets} активных кошельков`);
      } else {
        addLog(`❌ Ошибка загрузки статистики: ${data.message}`);
      }
    } catch (error) {
      addLog(`❌ Ошибка загрузки статистики: ${error}`);
    }
  };

  const loadUserAddresses = async () => {
    try {
      setLoading(true);
      addLog(`🔍 Загрузка адресов пользователя ${userId}...`);
      
      const response = await fetch(`/api/wallet/unified?action=get_addresses&userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.addresses);
        addLog(`✅ Загружено ${data.addresses.length} адресов из ${data.totalNetworks} сетей`);
      } else {
        addLog(`❌ Ошибка загрузки адресов: ${data.message}`);
      }
    } catch (error) {
      addLog(`❌ Ошибка загрузки адресов: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAddress = async (network: string) => {
    try {
      setLoading(true);
      addLog(`🎯 Генерация ${network} адреса для пользователя ${userId}...`);
      
      const response = await fetch('/api/wallet/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          network,
          createPayment: true,
          amount: '0.001'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ ${network} адрес создан: ${data.address.address}`);
        await loadUserAddresses(); // Обновляем список
      } else {
        addLog(`❌ Ошибка генерации ${network} адреса: ${data.message}`);
      }
    } catch (error) {
      addLog(`❌ Ошибка генерации адреса: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAllAddresses = async () => {
    for (const network of supportedNetworks) {
      await generateAddress(network);
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const clearUserData = async () => {
    try {
      addLog(`🗑️ Очистка данных пользователя ${userId}...`);
      
      for (const network of supportedNetworks) {
        try {
          const response = await fetch(`/api/wallet/unified?network=${network}&userId=${userId}&force=true`, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          if (data.success) {
            addLog(`✅ ${network} адрес удален`);
          }
        } catch (error) {
          addLog(`⚠️ Ошибка удаления ${network} адреса: ${error}`);
        }
      }
      
      setAddresses([]);
      addLog('✅ Данные пользователя очищены');
    } catch (error) {
      addLog(`❌ Ошибка очистки данных: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏦 Unified Master Wallet</h1>
          <p className="text-gray-300">Тестирование новой системы кошельков</p>
        </div>

        {/* Статус конфигурации */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">🔧 Конфигурация</h3>
            {validation ? (
              <div>
                <div className={`text-sm ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {validation.isValid ? '✅ Валидна' : '❌ Есть ошибки'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Ошибок: {validation.errors.length}, Предупреждений: {validation.warnings.length}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">Загрузка...</div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">📊 Статистика</h3>
            {stats ? (
              <div className="text-sm">
                <div>Активных кошельков: {stats.activeWallets}</div>
                <div>Всего адресов: {stats.totalAddresses}</div>
                <div>Сетей: {stats.totalNetworks}</div>
              </div>
            ) : (
              <button 
                onClick={loadStats}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Загрузить статистику
              </button>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">👤 Пользователь</h3>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-gray-700 rounded px-2 py-1 text-sm"
              placeholder="User ID"
            />
          </div>
        </div>

        {/* Управление */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">🎮 Управление кошельками</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={loadUserAddresses}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded px-4 py-2"
            >
              📋 Загрузить адреса
            </button>
            
            <button
              onClick={generateAllAddresses}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded px-4 py-2"
            >
              🎯 Создать все адреса
            </button>
            
            <button
              onClick={clearUserData}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded px-4 py-2"
            >
              🗑️ Очистить данные
            </button>
            
            <button
              onClick={loadConfiguration}
              className="bg-purple-600 hover:bg-purple-700 rounded px-4 py-2"
            >
              🔄 Обновить конфигурацию
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {supportedNetworks.map(network => (
              <button
                key={network}
                onClick={() => generateAddress(network)}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded px-3 py-1 text-sm"
              >
                {network}
              </button>
            ))}
          </div>
        </div>

        {/* Адреса пользователя */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">💳 Адреса пользователя</h3>
            
            {loading && <div className="text-center text-gray-400">Загрузка...</div>}
            
            {addresses.length === 0 && !loading && (
              <div className="text-center text-gray-400">
                Нет адресов. Нажмите "Загрузить адреса" или создайте новые.
              </div>
            )}
            
            <div className="space-y-3">
              {addresses.map((addr, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-blue-400">{addr.network}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      addr.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {addr.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  
                  <div className="text-sm font-mono bg-gray-800 rounded p-2 mb-2">
                    {addr.address}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Баланс: {addr.balance || '0'}</span>
                    {addr.derivationIndex !== undefined && (
                      <span>Индекс: {addr.derivationIndex}</span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    Создан: {new Date(addr.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Логи */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">📝 Логи системы</h3>
              <button
                onClick={() => setLogs([])}
                className="text-gray-400 hover:text-white text-sm"
              >
                Очистить
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              <div className="space-y-1 text-sm font-mono">
                {logs.length === 0 ? (
                  <div className="text-gray-500">Логи появятся здесь...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-gray-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ошибки конфигурации */}
        {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">⚠️ Проблемы конфигурации</h3>
            
            {validation.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-red-400 font-semibold mb-2">Ошибки:</h4>
                <ul className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="text-red-300 text-sm">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div>
                <h4 className="text-yellow-400 font-semibold mb-2">Предупреждения:</h4>
                <ul className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-300 text-sm">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
