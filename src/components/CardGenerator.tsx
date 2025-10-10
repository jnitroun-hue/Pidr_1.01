'use client';

import { useState, useEffect, useRef } from 'react';
import { cardCache } from '../lib/nft/card-cache';

interface CardGeneratorProps {
  rank: string;
  suit: string;
  rarity: string;
  userAvatar?: string;
  customImage?: string;
  onGenerated?: (imageData: string) => void;
}

/**
 * Клиентский генератор NFT карт с Canvas API
 * Использует базовые карты + overlay для быстрой генерации
 */
export default function CardGenerator({
  rank,
  suit,
  rarity,
  userAvatar,
  customImage,
  onGenerated
}: CardGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateCard();
  }, [rank, suit, rarity, userAvatar, customImage]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const getBaseCardUrl = (rank: string, suit: string): string => {
    // Путь к прегенерированным базовым картам в Supabase Storage
    return `/api/nft/base-cards/${suit}/${rank}.png`;
  };

  const getRarityOverlay = (rarity: string): string => {
    // Оверлеи для разных редкостей
    const overlays: Record<string, string> = {
      common: '/img/nft/overlay-common.png',
      uncommon: '/img/nft/overlay-uncommon.png',
      rare: '/img/nft/overlay-rare.png',
      mythic: '/img/nft/overlay-mythic.png',
      legendary: '/img/nft/overlay-legendary.png'
    };
    return overlays[rarity] || overlays.common;
  };

  const generateCard = async () => {
    try {
      setLoading(true);
      setError(null);

      const cardId = `${suit}_${rank}_${rarity}`;

      // Проверяем кеш
      const cached = await cardCache.getCard(cardId);
      if (cached && !customImage && !userAvatar) {
        console.log('✅ Карта загружена из кеша:', cardId);
        setGeneratedImage(cached.imageData);
        onGenerated?.(cached.imageData);
        setLoading(false);
        return;
      }

      // Генерируем новую карту
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Размеры карты
      canvas.width = 400;
      canvas.height = 600;

      // 1. Загружаем базовую карту
      const baseCardUrl = getBaseCardUrl(rank, suit);
      const baseCard = await loadImage(baseCardUrl);
      ctx.drawImage(baseCard, 0, 0, 400, 600);

      // 2. Добавляем оверлей редкости
      const overlayUrl = getRarityOverlay(rarity);
      try {
        const overlay = await loadImage(overlayUrl);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(overlay, 0, 0, 400, 600);
        ctx.globalAlpha = 1.0;
      } catch (e) {
        console.warn('Оверлей не найден:', overlayUrl);
      }

      // 3. Добавляем кастомное изображение (если есть)
      if (customImage) {
        const custom = await loadImage(customImage);
        // Центральная позиция для кастомного изображения
        ctx.drawImage(custom, 100, 200, 200, 200);
      }

      // 4. Добавляем аватар пользователя (если есть)
      if (userAvatar) {
        const avatar = await loadImage(userAvatar);
        // Круглый аватар в углу
        ctx.save();
        ctx.beginPath();
        ctx.arc(350, 50, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 320, 20, 60, 60);
        ctx.restore();
      }

      // 5. Добавляем рамку редкости
      ctx.strokeStyle = getRarityColor(rarity);
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 392, 592);

      // 6. Добавляем текст ранга и масти
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(`${rank}${getSuitSymbol(suit)}`, 200, 550);

      // Получаем результат
      const imageData = canvas.toDataURL('image/png', 0.95);
      setGeneratedImage(imageData);
      onGenerated?.(imageData);

      // Сохраняем в кеш (только базовые карты без кастомизации)
      if (!customImage && !userAvatar) {
        await cardCache.saveCard({
          id: cardId,
          rank,
          suit,
          rarity,
          imageData,
          metadata: { rank, suit, rarity },
          timestamp: Date.now()
        });
        console.log('💾 Карта сохранена в кеш:', cardId);
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Ошибка генерации карты:', err);
      setError('Ошибка генерации карты');
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      common: '#9ca3af',
      uncommon: '#10b981',
      rare: '#3b82f6',
      mythic: '#a855f7',
      legendary: '#f59e0b'
    };
    return colors[rarity] || colors.common;
  };

  const getSuitSymbol = (suit: string): string => {
    const symbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || '';
  };

  return (
    <div className="card-generator">
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />
      
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center p-4">
          {error}
        </div>
      )}

      {generatedImage && !loading && (
        <div className="generated-card">
          <img 
            src={generatedImage} 
            alt={`${rank} of ${suit}`}
            className="w-full h-auto rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

