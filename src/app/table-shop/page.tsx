'use client';

import { useState, useEffect } from 'react';
import { GameTable, TableShopCategory, TablePurchaseResult } from '@/types/tables';
import { GAME_TABLES, SHOP_CATEGORIES, getTablesByCategory, calculateTablePrice } from '@/data/tables';
// Динамический импорт для избежания SSR ошибок
// import { tableCanvasGenerator } from '@/lib/image-generation/table-generator';

/**
 * 🛍️ TABLE SHOP
 * Магазин столов для игры
 */

export default function TableShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const [userBalance, setUserBalance] = useState({ coins: 10000, gems: 100 }); // Mock данные
  const [ownedTables, setOwnedTables] = useState<string[]>(['classic-green']); // Mock данные
  const [equippedTable, setEquippedTable] = useState('classic-green');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tableImages, setTableImages] = useState<{[key: string]: string}>({});
  const [showPurchaseModal, setShowPurchaseModal] = useState<GameTable | null>(null);

  // Получаем столы текущей категории
  const currentTables = getTablesByCategory(selectedCategory);

  // Генерация превью столов
  useEffect(() => {
    const generateTablePreviews = async () => {
      // Проверяем, что мы в браузере
      if (typeof window === 'undefined') return;
      
      setIsGenerating(true);
      const images: {[key: string]: string} = {};
      
      try {
        // Генерация перенесена в отдельный проект pidr_generators
        // Используем статичные превью
        
        for (const table of currentTables) {
          if (!tableImages[table.id]) {
            try {
              // Используем статичное изображение или заглушку
              const imageUrl = table.imageUrl || '/images/table-placeholder.png';
              images[table.id] = imageUrl;
            } catch (error) {
              console.error(`Ошибка генерации превью для ${table.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка импорта генератора:', error);
      }
      
      setTableImages(prev => ({ ...prev, ...images }));
      setIsGenerating(false);
    };

    if (currentTables.length > 0 && typeof window !== 'undefined') {
      generateTablePreviews();
    }
  }, [selectedCategory, currentTables]);

  // Покупка стола
  const handlePurchaseTable = async (table: GameTable): Promise<TablePurchaseResult> => {
    // Проверяем, что мы в браузере
    if (typeof window === 'undefined') {
      return {
        success: false,
        message: 'Функция доступна только в браузере'
      };
    }

    // Проверяем требования
    if (table.requirements?.level && table.requirements.level > 1) {
      return {
        success: false,
        message: `Требуется ${table.requirements.level} уровень!`
      };
    }

    if (table.requirements?.previousTables) {
      const missingTables = table.requirements.previousTables.filter(
        tableId => !ownedTables.includes(tableId)
      );
      if (missingTables.length > 0) {
        return {
          success: false,
          message: 'Сначала купите предыдущие столы из коллекции!'
        };
      }
    }

    const price = calculateTablePrice(table, selectedCategory === 'featured');
    
    // Проверяем баланс
    if (table.currency === 'coins' && userBalance.coins < price) {
      return {
        success: false,
        message: 'Недостаточно монет!'
      };
    }
    
    if (table.currency === 'gems' && userBalance.gems < price) {
      return {
        success: false,
        message: 'Недостаточно кристаллов!'
      };
    }

    // Совершаем покупку
    const newBalance = { ...userBalance };
    if (table.currency === 'coins') {
      newBalance.coins -= price;
    } else {
      newBalance.gems -= price;
    }

    setUserBalance(newBalance);
    setOwnedTables(prev => [...prev, table.id]);
    
    return {
      success: true,
      message: `${table.name} успешно приобретен!`,
      table,
      newBalance
    };
  };

  // Экипировка стола
  const handleEquipTable = (tableId: string) => {
    setEquippedTable(tableId);
    // Здесь можно добавить сохранение в localStorage или API
    if (typeof window !== 'undefined') {
      localStorage.setItem('equippedTable', tableId);
    }
  };

  // Проверка доступности стола
  const isTableAvailable = (table: GameTable) => {
    if (!table.isUnlocked) return false;
    if (table.requirements?.level && table.requirements.level > 1) return false;
    return true;
  };

  const isTableOwned = (tableId: string) => ownedTables.includes(tableId);

  const getRarityColor = (rarity: GameTable['rarity']) => {
    const colors = {
      common: 'text-gray-400 border-gray-400',
      rare: 'text-blue-400 border-blue-400',
      epic: 'text-purple-400 border-purple-400',
      legendary: 'text-yellow-400 border-yellow-400',
      mythic: 'text-red-400 border-red-400'
    };
    return colors[rarity];
  };

  const getRarityGlow = (rarity: GameTable['rarity']) => {
    const glows = {
      common: 'shadow-gray-400/20',
      rare: 'shadow-blue-400/30',
      epic: 'shadow-purple-400/40',
      legendary: 'shadow-yellow-400/50',
      mythic: 'shadow-red-400/60'
    };
    return glows[rarity];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🛍️ Магазин столов
          </h1>
          <p className="text-gray-300">
            Выберите идеальный стол для своей игры
          </p>
        </div>

        {/* Баланс пользователя */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 mb-8 border border-blue-500/20">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                🪙
              </div>
              <span className="text-white font-bold text-lg">
                {userBalance.coins.toLocaleString()}
              </span>
              <span className="text-gray-400">монет</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                💎
              </div>
              <span className="text-white font-bold text-lg">
                {userBalance.gems}
              </span>
              <span className="text-gray-400">кристаллов</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                🎲
              </div>
              <span className="text-white font-medium">
                Столов: {ownedTables.length}/{GAME_TABLES.length}
              </span>
            </div>
          </div>
        </div>

        {/* Категории */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-blue-500/20">
          <div className="flex flex-wrap gap-4 justify-center">
            {SHOP_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <span>{category.name}</span>
                  {category.isNew && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                  {category.discount && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                      -{category.discount.percentage}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Описание категории */}
          <div className="mt-4 text-center">
            <p className="text-gray-300">
              {SHOP_CATEGORIES.find(cat => cat.id === selectedCategory)?.description}
            </p>
          </div>
        </div>

        {/* Столы */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTables.map((table) => {
            const isOwned = isTableOwned(table.id);
            const isEquipped = equippedTable === table.id;
            const isAvailable = isTableAvailable(table);
            const price = calculateTablePrice(table, selectedCategory === 'featured');
            const hasDiscount = selectedCategory === 'featured' && 
              SHOP_CATEGORIES.find(cat => cat.id === 'featured')?.tables.includes(table.id);

            return (
              <div
                key={table.id}
                className={`group relative bg-black/40 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-300 hover:scale-105 ${
                  getRarityColor(table.rarity)
                } ${getRarityGlow(table.rarity)} ${
                  isEquipped ? 'ring-2 ring-green-400' : ''
                }`}
              >
                {/* Статус badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {isEquipped && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ЭКИПИРОВАН
                    </span>
                  )}
                  {isOwned && !isEquipped && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      КУПЛЕН
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      СКИДКА
                    </span>
                  )}
                  {table.isNew && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      НОВИНКА
                    </span>
                  )}
                </div>

                {/* Превью стола */}
                <div className="aspect-[8/5] mb-4 rounded-lg overflow-hidden bg-gray-900/50 relative">
                  {isGenerating && !tableImages[table.id] ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : tableImages[table.id] ? (
                    <img
                      src={tableImages[table.id]}
                      alt={table.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      🎲
                    </div>
                  )}
                  
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl mb-2">🔒</div>
                        <div className="text-white text-sm">Заблокировано</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Информация о столе */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{table.name}</h3>
                    <p className="text-gray-400 text-sm">{table.description}</p>
                  </div>

                  {/* Редкость */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getRarityColor(table.rarity).split(' ')[0]}`}>
                      {table.rarity.toUpperCase()}
                    </span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${
                            i < (['common', 'rare', 'epic', 'legendary', 'mythic'].indexOf(table.rarity) + 1)
                              ? getRarityColor(table.rarity).split(' ')[0]
                              : 'text-gray-600'
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Статистики */}
                  {table.stats && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-green-400">🍀 {table.stats.luck}</div>
                        <div className="text-gray-400">Удача</div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-400">👑 {table.stats.prestige}</div>
                        <div className="text-gray-400">Престиж</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400">💰 {table.stats.winBonus}%</div>
                        <div className="text-gray-400">Бонус</div>
                      </div>
                    </div>
                  )}

                  {/* Цена и кнопки */}
                  <div className="space-y-3">
                    {!isOwned && isAvailable && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {hasDiscount && (
                            <span className="text-gray-400 line-through text-sm">
                              {table.price}
                            </span>
                          )}
                          <span className="text-white font-bold">
                            {price}
                          </span>
                          <span className="text-sm">
                            {table.currency === 'coins' ? '🪙' : '💎'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Кнопки действий */}
                    <div className="flex gap-2">
                      {!isOwned && isAvailable ? (
                        <button
                          onClick={() => setShowPurchaseModal(table)}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                        >
                          Купить
                        </button>
                      ) : isOwned && !isEquipped ? (
                        <button
                          onClick={() => handleEquipTable(table.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                        >
                          Экипировать
                        </button>
                      ) : isEquipped ? (
                        <button
                          disabled
                          className="flex-1 bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                        >
                          Экипирован
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                        >
                          Недоступен
                        </button>
                      )}

                      <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-200">
                        👁️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Модальное окно покупки */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">
                Подтвердите покупку
              </h3>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg text-white">{showPurchaseModal.name}</div>
                  <div className="text-gray-400">{showPurchaseModal.description}</div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xl">
                  <span className="text-white font-bold">
                    {calculateTablePrice(showPurchaseModal, selectedCategory === 'featured')}
                  </span>
                  <span>
                    {showPurchaseModal.currency === 'coins' ? '🪙' : '💎'}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPurchaseModal(null)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      const result = await handlePurchaseTable(showPurchaseModal);
                      if (result.success) {
                        alert(result.message);
                        setShowPurchaseModal(null);
                      } else {
                        alert(result.message);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    Купить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
