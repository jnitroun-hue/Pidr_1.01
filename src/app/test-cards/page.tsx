'use client';

import { useState, useEffect } from 'react';
import { CanvasImageGenerator } from '@/lib/image-generation/canvas-generator';

/**
 * 🎴 ТЕСТОВАЯ СТРАНИЦА ДЛЯ ГЕНЕРАЦИИ КАРТ
 * Проверяем работу Canvas генератора карт
 */

type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type CardStyle = 'classic' | 'neon' | 'minimal';

interface GeneratedCard {
  suit: CardSuit;
  value: string;
  style: CardStyle;
  imageUrl: string;
  timestamp: number;
}

export default function TestCardsPage() {
  const [generator, setGenerator] = useState<CanvasImageGenerator | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('classic');

  // Инициализация генератора
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const canvasGen = new CanvasImageGenerator();
      setGenerator(canvasGen);
      console.log('🎨 Canvas генератор инициализирован');
    }
  }, []);

  // Генерация одной карты
  const generateSingleCard = async (suit: CardSuit, value: string, style: CardStyle) => {
    if (!generator) {
      console.error('❌ Генератор не инициализирован');
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`🎴 Генерируем карту: ${value} ${suit} (${style})`);
      const imageUrl = await generator.generateCard(suit, value, style);
      
      const newCard: GeneratedCard = {
        suit,
        value,
        style,
        imageUrl,
        timestamp: Date.now()
      };

      setGeneratedCards(prev => [newCard, ...prev.slice(0, 11)]); // Оставляем только 12 карт
      console.log('✅ Карта сгенерирована успешно');
    } catch (error) {
      console.error('❌ Ошибка генерации карты:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация полной колоды
  const generateFullDeck = async () => {
    if (!generator) return;

    setIsGenerating(true);
    setGeneratedCards([]);

    const suits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    try {
      console.log('🎯 Генерируем полную колоду...');
      const cards: GeneratedCard[] = [];

      for (const suit of suits) {
        for (const value of values) {
          const imageUrl = await generator.generateCard(suit, value, selectedStyle);
          cards.push({
            suit,
            value,
            style: selectedStyle,
            imageUrl,
            timestamp: Date.now()
          });

          // Небольшая задержка для визуального эффекта
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setGeneratedCards(cards);
      console.log('✅ Полная колода сгенерирована!');
    } catch (error) {
      console.error('❌ Ошибка генерации колоды:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Очистка карт
  const clearCards = () => {
    setGeneratedCards([]);
    console.log('🗑️ Карты очищены');
  };

  const suitSymbols = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️'
  };

  const suitNames = {
    hearts: 'Червы',
    diamonds: 'Бубны',
    clubs: 'Трефы',
    spades: 'Пики'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎴 Тестирование генерации карт
          </h1>
          <p className="text-gray-300">
            Canvas генератор карт для Telegram игры
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/20">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Выбор стиля */}
            <div className="flex items-center gap-2">
              <label className="text-white font-medium">Стиль:</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as CardStyle)}
                className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                disabled={isGenerating}
              >
                <option value="classic">Классический</option>
                <option value="neon">Неон</option>
                <option value="minimal">Минимальный</option>
              </select>
            </div>

            {/* Кнопки управления */}
            <div className="flex gap-2">
              <button
                onClick={generateFullDeck}
                disabled={isGenerating || !generator}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isGenerating ? '⏳ Генерируем...' : '🎯 Полная колода'}
              </button>
              
              <button
                onClick={clearCards}
                disabled={isGenerating}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                🗑️ Очистить
              </button>
            </div>
          </div>

          {/* Быстрая генерация отдельных карт */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['hearts', 'diamonds', 'clubs', 'spades'] as CardSuit[]).map((suit) => (
              <div key={suit} className="text-center">
                <h3 className="text-white font-medium mb-2">
                  {suitSymbols[suit]} {suitNames[suit]}
                </h3>
                <div className="flex flex-wrap gap-1 justify-center">
                  {['A', 'K', 'Q', 'J'].map((value) => (
                    <button
                      key={`${suit}-${value}`}
                      onClick={() => generateSingleCard(suit, value, selectedStyle)}
                      disabled={isGenerating || !generator}
                      className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-2 py-1 rounded text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-4 mb-8 border border-purple-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-white">
              <span className="font-medium">Сгенерировано карт:</span> {generatedCards.length}
            </div>
            <div className="text-white">
              <span className="font-medium">Статус генератора:</span>{' '}
              <span className={generator ? 'text-green-400' : 'text-red-400'}>
                {generator ? '✅ Готов' : '❌ Не готов'}
              </span>
            </div>
            <div className="text-white">
              <span className="font-medium">Текущий стиль:</span>{' '}
              <span className="text-purple-400 font-medium">
                {selectedStyle === 'classic' ? 'Классический' :
                 selectedStyle === 'neon' ? 'Неон' : 'Минимальный'}
              </span>
            </div>
          </div>
        </div>

        {/* Галерея сгенерированных карт */}
        {generatedCards.length > 0 && (
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              🎨 Сгенерированные карты
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {generatedCards.map((card, index) => (
                <div key={`${card.suit}-${card.value}-${card.timestamp}`} className="group">
                  <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                    {/* Изображение карты */}
                    <div className="aspect-[3/4] mb-2 rounded-lg overflow-hidden bg-gray-900/50">
                      <img
                        src={card.imageUrl}
                        alt={`${card.value} of ${card.suit}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Информация о карте */}
                    <div className="text-center">
                      <div className="text-white font-medium text-sm">
                        {card.value} {suitSymbols[card.suit]}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {card.style}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Инструкции */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mt-8 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-4">📋 Инструкции</h2>
          <div className="text-gray-300 space-y-2">
            <p>• <strong>Полная колода:</strong> Генерирует все 52 карты в выбранном стиле</p>
            <p>• <strong>Отдельные карты:</strong> Нажмите на значение карты для быстрой генерации</p>
            <p>• <strong>Стили:</strong> Классический (белый фон), Неон (темный + свечение), Минимальный (простой)</p>
            <p>• <strong>Размер карт:</strong> 180x240px - оптимально для игры</p>
            <p>• <strong>Формат:</strong> PNG с прозрачностью, готов для использования в игре</p>
          </div>
        </div>
      </div>
    </div>
  );
}
