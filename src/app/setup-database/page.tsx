'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DatabaseSetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDatabase = async () => {
    setLoading(true);
    addLog('Проверка статуса базы данных...');
    
    try {
      const response = await fetch('/api/setup-database');
      const data = await response.json();
      setStatus(data);
      
      if (data.success) {
        addLog(data.message);
      } else {
        addLog(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      addLog(`Ошибка проверки: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTables = async () => {
    setCreating(true);
    addLog('🚀 Начинаем создание таблиц...');
    
    try {
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`✅ ${data.message}`);
        addLog(`📊 Создано таблиц: ${data.created}`);
        
        if (data.ready) {
          addLog('🎉 База данных полностью готова к работе!');
        }
      } else {
        addLog(`❌ ${data.message}`);
        if (data.errors?.length > 0) {
          data.errors.forEach((err: any) => {
            addLog(`  - Ошибка: ${JSON.stringify(err)}`);
          });
        }
      }
      
      // Обновляем статус
      await checkDatabase();
    } catch (error) {
      addLog(`❌ Критическая ошибка: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🗄️ Настройка базы данных P.I.D.R.
          </h1>
          <p className="text-slate-300">
            Автоматическое создание и проверка таблиц
          </p>
        </motion.div>

        {/* Status Card */}
        {status && (
          <motion.div
            className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Статус базы данных
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.ready 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {status.ready ? '✅ Готова' : '⚠️ Требует настройки'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {status.summary?.existing || 0}
                </div>
                <div className="text-sm text-slate-400">Существует</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {status.summary?.missing || 0}
                </div>
                <div className="text-sm text-slate-400">Отсутствует</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {status.summary?.total || 0}
                </div>
                <div className="text-sm text-slate-400">Всего</div>
              </div>
            </div>

            {status.status && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(status.status).map(([table, exists]) => (
                  <div key={table} className="flex items-center gap-2">
                    <span className={exists ? '✅' : '❌'}>
                      {exists ? '✅' : '❌'}
                    </span>
                    <span className="text-slate-300">{table}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">Действия</h2>
          
          <div className="flex gap-4">
            <button
              onClick={checkDatabase}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Проверяем...' : '🔍 Проверить статус'}
            </button>
            
            <button
              onClick={createTables}
              disabled={creating || (status?.ready)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {creating ? '🚀 Создаем...' : '🛠️ Создать таблицы'}
            </button>
          </div>

          {status?.ready && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-medium">
                ✅ База данных полностью готова к работе! Можете переходить к игре.
              </p>
            </div>
          )}

          {!status?.ready && status?.summary && (
            <div className="mt-4 p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 font-medium mb-2">
                ⚠️ Автоматическое создание не работает! Нужно создать таблицы вручную.
              </p>
              <div className="text-sm text-orange-300 space-y-1">
                <p>📋 <strong>Как исправить:</strong></p>
                <p>1. Откройте <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-400 underline">Supabase Dashboard</a></p>
                <p>2. Перейдите в <strong>SQL Editor</strong></p>
                <p>3. Скопируйте SQL код из файла <code>СОЗДАТЬ-ТАБЛИЦЫ-ВРУЧНУЮ.md</code></p>
                <p>4. Выполните код в SQL Editor</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Logs */}
        <motion.div
          className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">Журнал событий</h2>
          
          <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-slate-400 text-sm">Журнал пуст...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm text-slate-300 mb-1 font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            🎮 Перейти к игре
          </a>
        </motion.div>
      </div>
    </div>
  );
}
