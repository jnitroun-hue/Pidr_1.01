'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    telegramId: '',
    username: '',
    firstName: ''
  });

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/check-database');
      const result = await response.json();
      setDbStatus(result);
      console.log('Database status:', result);
    } catch (error) {
      console.error('Error checking database:', error);
      setDbStatus({ success: false, error: error });
    } finally {
      setLoading(false);
    }
  };

  const createTestUser = async () => {
    if (!createUserData.telegramId) {
      alert('Введите Telegram ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/debug/check-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createUserData)
      });

      const result = await response.json();
      alert(result.success ? 'Пользователь создан!' : `Ошибка: ${result.message}`);
      
      if (result.success) {
        // Обновляем статус БД
        await checkDatabase();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 Debug Panel - P.I.D.R. Database</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkDatabase} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Проверка...' : '🔍 Проверить БД'}
        </button>
      </div>

      {dbStatus && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: dbStatus.success ? '#d4edda' : '#f8d7da',
          border: '1px solid ' + (dbStatus.success ? '#c3e6cb' : '#f5c6cb'),
          borderRadius: '5px'
        }}>
          <h3>📊 Статус базы данных:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(dbStatus, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        border: '1px solid #ddd', 
        borderRadius: '5px' 
      }}>
        <h3>👤 Создать тестового пользователя:</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>Telegram ID:</label>
          <input
            type="text"
            value={createUserData.telegramId}
            onChange={(e) => setCreateUserData(prev => ({ ...prev, telegramId: e.target.value }))}
            placeholder="1758088907946"
            style={{ 
              marginLeft: '10px', 
              padding: '5px', 
              border: '1px solid #ddd',
              borderRadius: '3px',
              width: '200px'
            }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Username:</label>
          <input
            type="text"
            value={createUserData.username}
            onChange={(e) => setCreateUserData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="testuser"
            style={{ 
              marginLeft: '10px', 
              padding: '5px', 
              border: '1px solid #ddd',
              borderRadius: '3px',
              width: '200px'
            }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>First Name:</label>
          <input
            type="text"
            value={createUserData.firstName}
            onChange={(e) => setCreateUserData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="Test"
            style={{ 
              marginLeft: '10px', 
              padding: '5px', 
              border: '1px solid #ddd',
              borderRadius: '3px',
              width: '200px'
            }}
          />
        </div>
        <button
          onClick={createTestUser}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Создание...' : '🚀 Создать пользователя'}
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>💡 Этот инструмент поможет диагностировать проблемы с созданием пользователей в таблицах _pidr</p>
        <p>🔗 Перейти на: <a href="/">Главная</a> | <a href="/auth/login">Логин</a> | <a href="/wallet">Кошелек</a></p>
      </div>
    </div>
  );
}
