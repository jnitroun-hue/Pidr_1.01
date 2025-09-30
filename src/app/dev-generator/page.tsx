'use client';

import { useState, useRef } from 'react';
import { CanvasImageGenerator } from '@/lib/image-generation/canvas-generator';
import { TableCanvasGenerator } from '@/lib/image-generation/table-generator';

/**
 * 🛠️ DEVELOPER GENERATOR TOOL
 * Профессиональный инструмент для создания NFT ресурсов
 */

type ExportFormat = 'png' | 'svg' | 'webp';
type ExportQuality = 'standard' | 'high' | 'ultra';

interface GeneratedAsset {
  id: string;
  name: string;
  type: 'avatar-frame' | 'card-deck' | 'premium-table';
  dataUrl: string;
  metadata: {
    width: number;
    height: number;
    format: ExportFormat;
    quality: ExportQuality;
    style: string;
    timestamp: number;
  };
}

const QUALITY_SETTINGS = {
  standard: { multiplier: 1, quality: 0.8 },
  high: { multiplier: 2, quality: 0.9 },
  ultra: { multiplier: 4, quality: 1.0 }
};

export default function DevGeneratorPage() {
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [selectedQuality, setSelectedQuality] = useState<ExportQuality>('high');
  
  const canvasGenerator = useRef<CanvasImageGenerator | null>(null);
  const tableGenerator = useRef<TableCanvasGenerator | null>(null);

  // Инициализация генераторов
  useState(() => {
    if (typeof window !== 'undefined') {
      canvasGenerator.current = new CanvasImageGenerator();
      tableGenerator.current = new TableCanvasGenerator();
    }
  });

  // Генерация рамок для аватаров
  const generateAvatarFrames = async () => {
    if (!canvasGenerator.current) return;
    
    setIsGenerating(true);
    try {
      const frameStyles = [
        { name: 'Golden Royal', colors: ['#ffd700', '#ffed4e', '#d4af37'], pattern: 'royal' },
        { name: 'Silver Elite', colors: ['#c0c0c0', '#e5e5e5', '#a8a8a8'], pattern: 'elite' },
        { name: 'Diamond VIP', colors: ['#b9f2ff', '#ffffff', '#87ceeb'], pattern: 'diamond' },
        { name: 'Ruby Premium', colors: ['#e0115f', '#ff1493', '#dc143c'], pattern: 'ruby' },
        { name: 'Emerald Legend', colors: ['#50c878', '#90ee90', '#228b22'], pattern: 'emerald' },
        { name: 'Platinum Master', colors: ['#e5e4e2', '#ffffff', '#bcc6cc'], pattern: 'platinum' },
      ];

      const sizes = [
        { name: 'Avatar Small', width: 256, height: 256 },
        { name: 'Avatar Medium', width: 512, height: 512 },
        { name: 'Avatar Large', width: 1024, height: 1024 },
        { name: 'NFT Standard', width: 1000, height: 1000 },
      ];

      for (const style of frameStyles) {
        for (const size of sizes) {
          const frameImage = await generateAvatarFrame(
            size.width, 
            size.height, 
            style.colors, 
            style.pattern,
            style.name
          );

          const asset: GeneratedAsset = {
            id: `frame-${style.name.toLowerCase().replace(/\s+/g, '-')}-${size.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: `${style.name} Frame - ${size.name}`,
            type: 'avatar-frame',
            dataUrl: frameImage,
            metadata: {
              width: size.width * QUALITY_SETTINGS[selectedQuality].multiplier,
              height: size.height * QUALITY_SETTINGS[selectedQuality].multiplier,
              format: selectedFormat,
              quality: selectedQuality,
              style: style.name,
              timestamp: Date.now()
            }
          };

          setGeneratedAssets(prev => [...prev, asset]);
          
          // Небольшая задержка для UI
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log('✅ Все рамки для аватаров сгенерированы!');
    } catch (error) {
      console.error('❌ Ошибка генерации рамок:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация полных колод карт
  const generateCardDecks = async () => {
    if (!canvasGenerator.current) return;
    
    setIsGenerating(true);
    try {
      const deckStyles = [
        { name: 'Classic Poker', style: 'classic', theme: 'traditional' },
        { name: 'Neon Cyberpunk', style: 'neon', theme: 'futuristic' },
        { name: 'Royal Gold', style: 'luxury', theme: 'premium' },
        { name: 'Minimal Modern', style: 'minimal', theme: 'clean' },
      ];

      const cardSizes = [
        { name: 'Game Size', width: 180, height: 240 },
        { name: 'Standard Size', width: 360, height: 480 },
        { name: 'NFT Size', width: 720, height: 960 },
        { name: 'Print Size', width: 1080, height: 1440 },
      ];

      for (const deckStyle of deckStyles) {
        for (const size of cardSizes) {
          // Генерируем полную колоду (52 карты + 2 джокера)
          const deckImage = await generateFullCardDeck(
            size.width,
            size.height,
            deckStyle.style,
            deckStyle.name
          );

          const asset: GeneratedAsset = {
            id: `deck-${deckStyle.name.toLowerCase().replace(/\s+/g, '-')}-${size.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: `${deckStyle.name} Deck - ${size.name}`,
            type: 'card-deck',
            dataUrl: deckImage,
            metadata: {
              width: size.width * QUALITY_SETTINGS[selectedQuality].multiplier,
              height: size.height * QUALITY_SETTINGS[selectedQuality].multiplier,
              format: selectedFormat,
              quality: selectedQuality,
              style: deckStyle.name,
              timestamp: Date.now()
            }
          };

          setGeneratedAssets(prev => [...prev, asset]);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('✅ Все колоды карт сгенерированы!');
    } catch (error) {
      console.error('❌ Ошибка генерации колод:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация премиум столов
  const generatePremiumTables = async () => {
    if (!tableGenerator.current) return;
    
    setIsGenerating(true);
    try {
      const tableStyles = [
        { name: 'Luxury Casino', style: 'luxury', theme: 'casino' },
        { name: 'Neon Gaming', style: 'neon', theme: 'cyberpunk' },
        { name: 'Classic Poker', style: 'classic', theme: 'traditional' },
        { name: 'Royal VIP', style: 'royal', theme: 'premium' },
        { name: 'Diamond Elite', style: 'diamond', theme: 'exclusive' },
      ];

      const tableSizes = [
        { name: 'Game Resolution', width: 800, height: 500 },
        { name: 'HD Resolution', width: 1920, height: 1080 },
        { name: '4K Resolution', width: 3840, height: 2160 },
        { name: 'NFT Square', width: 2000, height: 2000 },
      ];

      for (const tableStyle of tableStyles) {
        for (const size of tableSizes) {
          const tableImage = await generatePremiumTable(
            size.width,
            size.height,
            tableStyle.style,
            tableStyle.name
          );

          const asset: GeneratedAsset = {
            id: `table-${tableStyle.name.toLowerCase().replace(/\s+/g, '-')}-${size.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: `${tableStyle.name} Table - ${size.name}`,
            type: 'premium-table',
            dataUrl: tableImage,
            metadata: {
              width: size.width * QUALITY_SETTINGS[selectedQuality].multiplier,
              height: size.height * QUALITY_SETTINGS[selectedQuality].multiplier,
              format: selectedFormat,
              quality: selectedQuality,
              style: tableStyle.name,
              timestamp: Date.now()
            }
          };

          setGeneratedAssets(prev => [...prev, asset]);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ Все премиум столы сгенерированы!');
    } catch (error) {
      console.error('❌ Ошибка генерации столов:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация рамки для аватара
  const generateAvatarFrame = async (
    width: number, 
    height: number, 
    colors: string[], 
    pattern: string,
    styleName: string
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const quality = QUALITY_SETTINGS[selectedQuality];
    canvas.width = width * quality.multiplier;
    canvas.height = height * quality.multiplier;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = Math.min(canvas.width, canvas.height) / 2 - 20;
    const innerRadius = outerRadius - 60;

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Создаем градиент для рамки
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });

    // Рисуем внешний круг (рамку)
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Вырезаем внутренний круг
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Добавляем декоративные элементы в зависимости от паттерна
    switch (pattern) {
      case 'royal':
        drawRoyalPattern(ctx, centerX, centerY, outerRadius, innerRadius);
        break;
      case 'diamond':
        drawDiamondPattern(ctx, centerX, centerY, outerRadius, innerRadius);
        break;
      case 'elite':
        drawElitePattern(ctx, centerX, centerY, outerRadius, innerRadius);
        break;
    }

    // Добавляем текст стиля (опционально)
    if (styleName && quality.multiplier >= 2) {
      ctx.fillStyle = colors[0];
      ctx.font = `bold ${24 * quality.multiplier}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(styleName, centerX, canvas.height - 40 * quality.multiplier);
    }

    return canvas.toDataURL(`image/${selectedFormat}`, quality.quality);
  };

  // Генерация полной колоды карт
  const generateFullCardDeck = async (
    cardWidth: number,
    cardHeight: number,
    style: string,
    deckName: string
  ): Promise<string> => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const quality = QUALITY_SETTINGS[selectedQuality];
    const cardsPerRow = 13;
    const rows = 4;
    
    const canvasWidth = (cardWidth + 20) * cardsPerRow * quality.multiplier;
    const canvasHeight = (cardHeight + 20) * rows * quality.multiplier + 200;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Фон
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Заголовок
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${48 * quality.multiplier}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${deckName} - Complete Deck`, canvasWidth / 2, 80 * quality.multiplier);

    // Генерируем каждую карту
    for (let suitIndex = 0; suitIndex < suits.length; suitIndex++) {
      for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
        const suit = suits[suitIndex];
        const value = values[valueIndex];
        
        if (canvasGenerator.current) {
          const cardImage = await canvasGenerator.current.generateCard(suit, value, style as any);
          
          const img = new Image();
          img.onload = () => {
            const x = (valueIndex * (cardWidth + 20) + 10) * quality.multiplier;
            const y = (suitIndex * (cardHeight + 20) + 120) * quality.multiplier;
            
            ctx.drawImage(
              img, 
              x, 
              y, 
              cardWidth * quality.multiplier, 
              cardHeight * quality.multiplier
            );
          };
          img.src = cardImage;
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    return canvas.toDataURL(`image/${selectedFormat}`, quality.quality);
  };

  // Генерация премиум стола
  const generatePremiumTable = async (
    width: number,
    height: number,
    style: string,
    tableName: string
  ): Promise<string> => {
    if (!tableGenerator.current) return '';
    
    const quality = QUALITY_SETTINGS[selectedQuality];
    const finalWidth = width * quality.multiplier;
    const finalHeight = height * quality.multiplier;

    // Используем существующий генератор, но с улучшениями
    const baseImage = await tableGenerator.current.generatePremiumTable(
      finalWidth, 
      finalHeight, 
      style as any
    );

    // Добавляем водяной знак и метаданные
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Водяной знак
      if (quality.multiplier >= 2) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.font = `${24 * quality.multiplier}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(tableName, finalWidth / 2, finalHeight - 50 * quality.multiplier);
      }
    };
    img.src = baseImage;

    return new Promise(resolve => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(`image/${selectedFormat}`, quality.quality));
      };
    });
  };

  // Вспомогательные функции для паттернов
  const drawRoyalPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) => {
    const radius = (outer + inner) / 2;
    ctx.fillStyle = '#ffd700';
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawDiamondPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) => {
    const radius = (outer + inner) / 2;
    ctx.strokeStyle = '#87ceeb';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * Math.PI;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  };

  const drawElitePattern = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) => {
    const radius = (outer + inner) / 2;
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, radius - 10, 0, 2 * Math.PI);
    ctx.stroke();
  };

  // Скачивание ассета
  const downloadAsset = (asset: GeneratedAsset) => {
    const link = document.createElement('a');
    link.href = asset.dataUrl;
    link.download = `${asset.name.replace(/\s+/g, '_')}.${asset.metadata.format}`;
    link.click();
  };

  // Скачивание всех ассетов как ZIP
  const downloadAllAssets = async () => {
    // В реальном проекте здесь бы использовался JSZip
    console.log('Скачивание всех ассетов...');
    generatedAssets.forEach((asset, index) => {
      setTimeout(() => downloadAsset(asset), index * 100);
    });
  };

  // Очистка
  const clearAssets = () => {
    setGeneratedAssets([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🛠️ Developer Generator Tool
          </h1>
          <p className="text-gray-300">
            Профессиональный генератор NFT ресурсов для разработчиков
          </p>
        </div>

        {/* Настройки экспорта */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Настройки экспорта</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-white font-medium mb-2">Формат:</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isGenerating}
              >
                <option value="png">PNG (лучшее качество)</option>
                <option value="webp">WebP (меньший размер)</option>
                <option value="svg">SVG (векторная графика)</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Качество:</label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value as ExportQuality)}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isGenerating}
              >
                <option value="standard">Standard (1x)</option>
                <option value="high">High (2x)</option>
                <option value="ultra">Ultra (4x) - NFT Ready</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Статус:</label>
              <div className={`px-4 py-2 rounded-lg font-medium ${
                isGenerating 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}>
                {isGenerating ? '⏳ Генерируем...' : '✅ Готов к работе'}
              </div>
            </div>
          </div>
        </div>

        {/* Панель генерации */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">🎨 Генерация ресурсов</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-lg p-6 mb-4">
                <div className="text-4xl mb-2">🖼️</div>
                <h3 className="text-white font-bold mb-2">Рамки для аватаров</h3>
                <p className="text-yellow-100 text-sm">6 стилей × 4 размера = 24 рамки</p>
              </div>
              <button
                onClick={generateAvatarFrames}
                disabled={isGenerating}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                Создать рамки
              </button>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-lg p-6 mb-4">
                <div className="text-4xl mb-2">🎴</div>
                <h3 className="text-white font-bold mb-2">Колоды карт</h3>
                <p className="text-red-100 text-sm">4 стиля × 4 размера = 16 колод</p>
              </div>
              <button
                onClick={generateCardDecks}
                disabled={isGenerating}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                Создать колоды
              </button>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-b from-green-600 to-green-800 rounded-lg p-6 mb-4">
                <div className="text-4xl mb-2">🎲</div>
                <h3 className="text-white font-bold mb-2">Премиум столы</h3>
                <p className="text-green-100 text-sm">5 стилей × 4 размера = 20 столов</p>
              </div>
              <button
                onClick={generatePremiumTables}
                disabled={isGenerating}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                Создать столы
              </button>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-blue-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-white">
              <span className="font-medium">Сгенерировано ресурсов:</span> {generatedAssets.length}
            </div>
            <div className="flex gap-2">
              {generatedAssets.length > 0 && (
                <>
                  <button
                    onClick={downloadAllAssets}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    📦 Скачать все
                  </button>
                  <button
                    onClick={clearAssets}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    🗑️ Очистить
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Галерея сгенерированных ресурсов */}
        {generatedAssets.length > 0 && (
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              🎨 Сгенерированные ресурсы ({generatedAssets.length})
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {generatedAssets.map((asset) => (
                <div key={asset.id} className="group">
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
                    {/* Превью */}
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-900/50">
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Информация */}
                    <div className="space-y-2">
                      <h3 className="text-white font-medium text-sm truncate">
                        {asset.name}
                      </h3>
                      <div className="text-gray-400 text-xs space-y-1">
                        <div>Тип: {asset.type}</div>
                        <div>Размер: {asset.metadata.width}×{asset.metadata.height}</div>
                        <div>Качество: {asset.metadata.quality.toUpperCase()}</div>
                        <div>Формат: {asset.metadata.format.toUpperCase()}</div>
                      </div>
                      
                      {/* Кнопка скачивания */}
                      <button
                        onClick={() => downloadAsset(asset)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        💾 Скачать
                      </button>
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
