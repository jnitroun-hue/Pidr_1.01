'use client';

import { useState, useEffect, useRef } from 'react';
import { avatarCanvasGenerator } from '@/lib/image-generation/avatar-generator';
import { tableCanvasGenerator } from '@/lib/image-generation/table-generator';
import { gameAnimationSystem } from '@/lib/animations/game-animations';

/**
 * 🎬 ТЕСТОВАЯ СТРАНИЦА ДЛЯ АВАТАРОВ И АНИМАЦИЙ
 * Демонстрация всех возможностей системы
 */

type AvatarTheme = 'classic' | 'neon' | 'retro' | 'cartoon' | 'robot';
type TableStyle = 'classic' | 'neon' | 'luxury';

interface GeneratedAvatar {
  name: string;
  theme: AvatarTheme;
  imageUrl: string;
  timestamp: number;
}

interface GeneratedTable {
  style: TableStyle;
  imageUrl: string;
  timestamp: number;
}

export default function TestAnimationsPage() {
  const [generatedAvatars, setGeneratedAvatars] = useState<GeneratedAvatar[]>([]);
  const [generatedTables, setGeneratedTables] = useState<GeneratedTable[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<AvatarTheme>('classic');
  const [selectedTableStyle, setSelectedTableStyle] = useState<TableStyle>('luxury');
  
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const testCardRef = useRef<HTMLDivElement>(null);
  const testTableRef = useRef<HTMLDivElement>(null);

  // Генерация аватара
  const generateAvatar = async (name: string, theme: AvatarTheme) => {
    setIsGenerating(true);
    try {
      console.log(`🎨 Генерируем аватар для ${name} в стиле ${theme}`);
      const imageUrl = await avatarCanvasGenerator.generateCoolAvatar(name, { theme });
      
      const newAvatar: GeneratedAvatar = {
        name,
        theme,
        imageUrl,
        timestamp: Date.now()
      };

      setGeneratedAvatars(prev => [newAvatar, ...prev.slice(0, 7)]); // Оставляем 8 аватаров
      console.log('✅ Аватар сгенерирован успешно');
    } catch (error) {
      console.error('❌ Ошибка генерации аватара:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация стола
  const generateTable = async (style: TableStyle) => {
    setIsGenerating(true);
    try {
      console.log(`🎲 Генерируем стол в стиле ${style}`);
      const imageUrl = await tableCanvasGenerator.generatePremiumTable(800, 500, style);
      
      const newTable: GeneratedTable = {
        style,
        imageUrl,
        timestamp: Date.now()
      };

      setGeneratedTables(prev => [newTable, ...prev.slice(0, 2)]); // Оставляем 3 стола
      console.log('✅ Стол сгенерирован успешно');
    } catch (error) {
      console.error('❌ Ошибка генерации стола:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация команды ботов
  const generateBotTeam = async () => {
    const botNames = ['AI-Destroyer', 'CyberBot', 'QuantumPlayer', 'NeuralNet', 'DeepMind', 'AlphaCard'];
    
    setIsGenerating(true);
    try {
      const avatars: GeneratedAvatar[] = [];
      
      for (const name of botNames) {
        const imageUrl = await avatarCanvasGenerator.generateBotAvatar(name);
        avatars.push({
          name,
          theme: 'robot',
          imageUrl,
          timestamp: Date.now()
        });
        
        // Небольшая задержка для визуального эффекта
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setGeneratedAvatars(avatars);
      console.log('🤖 Команда ботов создана!');
    } catch (error) {
      console.error('❌ Ошибка создания команды ботов:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Тестовые анимации
  const testCardFlip = async () => {
    if (testCardRef.current) {
      await gameAnimationSystem.animateCardFlip(testCardRef.current, true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await gameAnimationSystem.animateCardFlip(testCardRef.current, false);
    }
  };

  const testTablePulse = () => {
    if (testTableRef.current) {
      gameAnimationSystem.animateTablePulse(testTableRef.current, '#ffd700');
      setTimeout(() => {
        if (testTableRef.current) {
          gameAnimationSystem.stopTablePulse(testTableRef.current);
        }
      }, 3000);
    }
  };

  const testFireworks = async () => {
    if (animationContainerRef.current) {
      await gameAnimationSystem.animateFireworks(animationContainerRef.current, 4000);
    }
  };

  const testConfetti = async () => {
    if (animationContainerRef.current) {
      await gameAnimationSystem.animateConfetti(animationContainerRef.current, 4000);
    }
  };

  const testVictoryGlow = async () => {
    const avatarElements = document.querySelectorAll('.test-avatar');
    if (avatarElements.length > 0) {
      await gameAnimationSystem.animateVictoryGlow(avatarElements[0] as HTMLElement);
    }
  };

  const playerNames = ['Игрок1', 'Player2', 'Геймер', 'ProGamer', 'Champion', 'Winner'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Контейнер для анимаций */}
      <div 
        ref={animationContainerRef}
        className="fixed inset-0 pointer-events-none z-50"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎬 Тестирование аватаров и анимаций
          </h1>
          <p className="text-gray-300">
            Canvas генераторы и система анимаций для игры
          </p>
        </div>

        {/* Панель управления аватарами */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">🎨 Генерация аватаров</h2>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Выбор темы */}
            <div className="flex items-center gap-2">
              <label className="text-white font-medium">Тема:</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as AvatarTheme)}
                className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                disabled={isGenerating}
              >
                <option value="classic">Классическая</option>
                <option value="neon">Неон</option>
                <option value="retro">Ретро</option>
                <option value="cartoon">Мультяшная</option>
                <option value="robot">Робот</option>
              </select>
            </div>

            {/* Кнопки управления */}
            <div className="flex gap-2">
              <button
                onClick={generateBotTeam}
                disabled={isGenerating}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isGenerating ? '⏳ Создаем...' : '🤖 Команда ботов'}
              </button>
              
              <button
                onClick={() => setGeneratedAvatars([])}
                disabled={isGenerating}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                🗑️ Очистить
              </button>
            </div>
          </div>

          {/* Быстрая генерация для игроков */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {playerNames.map((name) => (
              <button
                key={name}
                onClick={() => generateAvatar(name, selectedTheme)}
                disabled={isGenerating}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Панель управления столами */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">🎲 Генерация столов</h2>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-white font-medium">Стиль:</label>
              <select
                value={selectedTableStyle}
                onChange={(e) => setSelectedTableStyle(e.target.value as TableStyle)}
                className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                disabled={isGenerating}
              >
                <option value="luxury">Роскошный</option>
                <option value="neon">Неоновый</option>
                <option value="classic">Классический</option>
              </select>
            </div>

            <button
              onClick={() => generateTable(selectedTableStyle)}
              disabled={isGenerating}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isGenerating ? '⏳ Генерируем...' : '🎯 Создать стол'}
            </button>
          </div>
        </div>

        {/* Панель тестирования анимаций */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">🎬 Тестирование анимаций</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              onClick={testCardFlip}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              🎴 Переворот карты
            </button>
            
            <button
              onClick={testTablePulse}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              🎲 Пульсация стола
            </button>
            
            <button
              onClick={testFireworks}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              🎆 Фейерверки
            </button>
            
            <button
              onClick={testConfetti}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              🎊 Конфетти
            </button>
            
            <button
              onClick={testVictoryGlow}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
            >
              ✨ Свечение победы
            </button>
          </div>

          {/* Тестовые элементы */}
          <div className="flex items-center justify-center gap-8 mt-6">
            <div
              ref={testCardRef}
              className="w-20 h-28 bg-gradient-to-b from-white to-gray-200 rounded-lg border-2 border-gray-400 flex items-center justify-center text-2xl font-bold text-gray-800 cursor-pointer hover:scale-105 transition-transform"
            >
              🎴
            </div>
            
            <div
              ref={testTableRef}
              className="w-32 h-20 bg-gradient-to-b from-green-600 to-green-800 rounded-xl border-4 border-yellow-500 flex items-center justify-center text-white font-bold cursor-pointer"
            >
              СТОЛ
            </div>
          </div>
        </div>

        {/* Галерея сгенерированных столов */}
        {generatedTables.length > 0 && (
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">🎲 Сгенерированные столы</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedTables.map((table, index) => (
                <div key={`${table.style}-${table.timestamp}`} className="group">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                    <div className="aspect-[8/5] mb-3 rounded-lg overflow-hidden bg-gray-900/50">
                      <img
                        src={table.imageUrl}
                        alt={`${table.style} table`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-white font-medium">
                        {table.style.toUpperCase()} стол
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Галерея сгенерированных аватаров */}
        {generatedAvatars.length > 0 && (
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              👥 Сгенерированные аватары ({generatedAvatars.length})
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {generatedAvatars.map((avatar, index) => (
                <div key={`${avatar.name}-${avatar.timestamp}`} className="group test-avatar">
                  <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                    {/* Аватар */}
                    <div className="aspect-square mb-2 rounded-lg overflow-hidden bg-gray-900/50">
                      <img
                        src={avatar.imageUrl}
                        alt={`${avatar.name} avatar`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Информация */}
                    <div className="text-center">
                      <div className="text-white font-medium text-sm truncate">
                        {avatar.name}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {avatar.theme}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
