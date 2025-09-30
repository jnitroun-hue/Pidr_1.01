'use client';

import { useState } from 'react';

/**
 * 🃏 ТЕСТОВАЯ СТРАНИЦА ДЛЯ КАРТ
 * Демонстрация генерации карт
 */

export default function TestCardsPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🃏 Тест карт
          </h1>
          <p className="text-gray-300">
            Страница для тестирования генерации игральных карт
          </p>
        </div>

        {/* Уведомление */}
        <div className="bg-green-900/50 backdrop-blur-lg rounded-2xl p-6 border border-green-500/20 text-center">
          <div className="text-2xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Страница в разработке
          </h2>
          <p className="text-gray-300 mb-4">
            Функции генерации карт будут доступны после полной настройки системы.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            ← Назад
          </button>
        </div>
      </div>
    </div>
  );
}