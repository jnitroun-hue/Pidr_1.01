'use client';

import { useState, useEffect } from 'react';
import { GameTable } from '@/types/tables';
import { getTableById } from '@/data/tables';
import { tableCanvasGenerator } from '@/lib/image-generation/table-generator';

/**
 * 🎲 TABLE SELECTOR COMPONENT
 * Компонент выбора стола в игре
 */

interface TableSelectorProps {
  userId: string;
  currentTableId: string;
  onTableChange: (tableId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function TableSelector({ 
  userId, 
  currentTableId, 
  onTableChange, 
  isOpen, 
  onClose 
}: TableSelectorProps) {
  const [ownedTables, setOwnedTables] = useState<string[]>(['classic-green']);
  const [tableImages, setTableImages] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем инвентарь пользователя
  useEffect(() => {
    const fetchUserTables = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tables?action=user_inventory&userId=${userId}`);
        const data = await response.json();
        
        if (data.success && data.inventory) {
          setOwnedTables(data.inventory.owned_tables || ['classic-green']);
        }
      } catch (error) {
        console.error('Error fetching user tables:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && userId) {
      fetchUserTables();
    }
  }, [isOpen, userId]);

  // Генерируем превью столов
  useEffect(() => {
    const generatePreviews = async () => {
      const images: {[key: string]: string} = {};
      
      for (const tableId of ownedTables) {
        if (!tableImages[tableId]) {
          const table = getTableById(tableId);
          if (table) {
            try {
              const imageUrl = await tableCanvasGenerator.generatePremiumTable(
                300, 200, table.style as any
              );
              images[tableId] = imageUrl;
            } catch (error) {
              console.error(`Error generating preview for ${tableId}:`, error);
            }
          }
        }
      }
      
      setTableImages(prev => ({ ...prev, ...images }));
    };

    if (ownedTables.length > 0) {
      generatePreviews();
    }
  }, [ownedTables]);

  // Выбор стола
  const handleTableSelect = async (tableId: string) => {
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'equip',
          userId,
          tableId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onTableChange(tableId);
        onClose();
      } else {
        alert(data.message || 'Ошибка при выборе стола');
      }
    } catch (error) {
      console.error('Error selecting table:', error);
      alert('Ошибка при выборе стола');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-blue-500/20">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">🎲 Выбор стола</h2>
            <p className="text-gray-300">Выберите стол для игры</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Загрузка */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-white">Загрузка столов...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedTables.map((tableId) => {
              const table = getTableById(tableId);
              if (!table) return null;

              const isSelected = currentTableId === tableId;
              
              return (
                <div
                  key={tableId}
                  className={`relative group cursor-pointer bg-black/40 backdrop-blur-lg rounded-xl p-4 border transition-all duration-200 hover:scale-105 ${
                    isSelected 
                      ? 'border-green-400 ring-2 ring-green-400/50' 
                      : 'border-gray-600 hover:border-blue-400'
                  }`}
                  onClick={() => handleTableSelect(tableId)}
                >
                  {/* Статус выбранного стола */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      АКТИВЕН
                    </div>
                  )}

                  {/* Превью стола */}
                  <div className="aspect-[3/2] mb-3 rounded-lg overflow-hidden bg-gray-900/50 relative">
                    {tableImages[tableId] ? (
                      <img
                        src={tableImages[tableId]}
                        alt={table.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Overlay при наведении */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="text-white font-medium">
                        {isSelected ? 'Выбран' : 'Выбрать'}
                      </div>
                    </div>
                  </div>

                  {/* Информация о столе */}
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-white font-medium text-sm">{table.name}</h3>
                      <p className="text-gray-400 text-xs">{table.description}</p>
                    </div>

                    {/* Редкость */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        table.rarity === 'common' ? 'text-gray-400' :
                        table.rarity === 'rare' ? 'text-blue-400' :
                        table.rarity === 'epic' ? 'text-purple-400' :
                        table.rarity === 'legendary' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {table.rarity.toUpperCase()}
                      </span>
                      
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-xs ${
                              i < (['common', 'rare', 'epic', 'legendary', 'mythic'].indexOf(table.rarity) + 1)
                                ? (table.rarity === 'common' ? 'text-gray-400' :
                                   table.rarity === 'rare' ? 'text-blue-400' :
                                   table.rarity === 'epic' ? 'text-purple-400' :
                                   table.rarity === 'legendary' ? 'text-yellow-400' :
                                   'text-red-400')
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
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="text-center">
                          <div className="text-green-400">🍀 {table.stats.luck}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-400">👑 {table.stats.prestige}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400">💰 +{table.stats.winBonus}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Кнопка перехода в магазин */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              onClose();
              window.location.href = '/table-shop';
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
          >
            🛍️ Купить новые столы
          </button>
        </div>
      </div>
    </div>
  );
}
