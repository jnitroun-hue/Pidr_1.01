'use client';

import { useState } from 'react';

/**
 * 🎬 ТЕСТОВАЯ СТРАНИЦА ДЛЯ АВАТАРОВ И АНИМАЦИЙ
 * Демонстрация всех возможностей системы
 */

export default function TestAnimationsPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎬 Тест анимаций
          </h1>
          <p className="text-gray-300">
            Страница для тестирования анимаций и генерации контента
          </p>
        </div>

        {/* Уведомление */}
        <div className="bg-blue-900/50 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20 text-center">
          <div className="text-2xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Страница в разработке
          </h2>
          <p className="text-gray-300 mb-4">
            Функции генерации и анимации будут доступны после полной настройки системы.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            ← Назад
          </button>
        </div>
      </div>
    </div>
  );
}