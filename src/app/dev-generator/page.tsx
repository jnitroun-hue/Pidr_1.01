'use client';

import { useState } from 'react';

/**
 * 🛠️ DEVELOPER GENERATOR TOOL
 * Профессиональный инструмент для создания NFT ресурсов
 */

export default function DevGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🛠️ Генератор ресурсов
          </h1>
          <p className="text-gray-300">
            Профессиональный инструмент для создания NFT ресурсов
          </p>
        </div>

        {/* Уведомление */}
        <div className="bg-purple-900/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center">
          <div className="text-2xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Инструмент в разработке
          </h2>
          <p className="text-gray-300 mb-4">
            Генератор NFT ресурсов будет доступен после полной настройки системы.
          </p>
          <div className="space-y-2 text-sm text-gray-400 mb-6">
            <p>• Генерация рамок для аватаров</p>
            <p>• Создание колод карт</p>
            <p>• Премиум столы для игры</p>
            <p>• Экспорт в различных форматах</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            ← Назад
          </button>
        </div>
      </div>
    </div>
  );
}