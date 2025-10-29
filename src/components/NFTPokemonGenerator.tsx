'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SUITS = [
  { value: 'hearts', label: '♥', color: '#ef4444', symbol: '♥' },
  { value: 'diamonds', label: '♦', color: '#ef4444', symbol: '♦' },
  { value: 'clubs', label: '♣', color: '#1f2937', symbol: '♣' },
  { value: 'spades', label: '♠', color: '#000000', symbol: '♠' }
];

const RANKS = [
  { value: '2', display: '2', cost: 1000 },
  { value: '3', display: '3', cost: 1000 },
  { value: '4', display: '4', cost: 1000 },
  { value: '5', display: '5', cost: 1000 },
  { value: '6', display: '6', cost: 1000 },
  { value: '7', display: '7', cost: 1000 },
  { value: '8', display: '8', cost: 1000 },
  { value: '9', display: '9', cost: 1000 },
  { value: '10', display: '10', cost: 2500 },
  { value: 'j', display: 'J', cost: 2500 },
  { value: 'q', display: 'Q', cost: 5000 },
  { value: 'k', display: 'K', cost: 5000 },
  { value: 'a', display: 'A', cost: 8000 }
];

// ✅ СИСТЕМА ЦЕНЫ: Ранг + Масть
const SUIT_COSTS: Record<string, number> = {
  'hearts': 500,
  'diamonds': 500,
  'clubs': 500,
  'spades': 1000
};

interface NFTPokemonGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTPokemonGenerator({ userCoins, onBalanceUpdate }: NFTPokemonGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState('hearts');
  const [selectedRank, setSelectedRank] = useState('a');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string>('');

  // ✅ Вычисляем цену: Ранг + Масть
  const rankCost = RANKS.find(r => r.value === selectedRank)?.cost || 1000;
  const suitCost = SUIT_COSTS[selectedSuit] || 500;
  const currentCost = rankCost + suitCost;

  useEffect(() => {
    fetchUserCards();
  }, []);

  // ✅ Обновляем превью при изменении выбора
  useEffect(() => {
    generatePreview();
  }, [selectedSuit, selectedRank]);

  const fetchUserCards = async () => {
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const response = await fetch('/api/nft/generate-pokemon', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId,
          'x-username': username
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserCards(data.cards || []);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки карт:', error);
    }
  };

  const generatePreview = () => {
    // Генерируем превью карты
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // ✅ БЕЛЫЙ ФОН
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ✅ РАМКА
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    const suit = SUITS.find(s => s.value === selectedSuit);
    const rank = RANKS.find(r => r.value === selectedRank);

    if (!suit || !rank) return;

    // ✅ ВЕРХНИЙ ЛЕВЫЙ УГОЛ (Ранг + Масть)
    ctx.fillStyle = suit.color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rank.display, 20, 50);
    
    ctx.font = '50px Arial';
    ctx.fillText(suit.symbol, 20, 100);

    // ✅ НИЖНИЙ ПРАВЫЙ УГОЛ (Ранг + Масть - ПЕРЕВЁРНУТО)
    ctx.save();
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    
    ctx.fillStyle = suit.color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rank.display, 20, 50);
    
    ctx.font = '50px Arial';
    ctx.fillText(suit.symbol, 20, 100);
    ctx.restore();

    // ✅ ПРЕВЬЮ ПРОСТОЙ КАРТЫ - ЦЕНТРАЛЬНЫЙ СИМВОЛ МАСТИ
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.font = 'bold 140px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suit.symbol, canvas.width / 2, canvas.height / 2);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    setPreviewImage(canvas.toDataURL('image/png'));
  };

  // 🎨 ПАЛИТРА ИЗ 60 КРАСИВЫХ ГРАДИЕНТОВ (без красного и черного)
  const GRADIENT_COLORS = [
    // СИНИЕ
    ['#3b82f6', '#1d4ed8'], ['#60a5fa', '#2563eb'], ['#38bdf8', '#0284c7'], ['#06b6d4', '#0891b2'],
    // ФИОЛЕТОВЫЕ
    ['#8b5cf6', '#6366f1'], ['#a78bfa', '#7c3aed'], ['#c084fc', '#9333ea'], ['#d946ef', '#a21caf'],
    // ЗЕЛЕНЫЕ
    ['#22c55e', '#16a34a'], ['#4ade80', '#22c55e'], ['#34d399', '#10b981'], ['#2dd4bf', '#14b8a6'],
    // ЖЕЛТЫЕ/ЗОЛОТЫЕ
    ['#fbbf24', '#f59e0b'], ['#fcd34d', '#fbbf24'], ['#fde047', '#facc15'], ['#fef08a', '#fde047'],
    // ОРАНЖЕВЫЕ
    ['#fb923c', '#f97316'], ['#fdba74', '#fb923c'], ['#fed7aa', '#fdba74'], ['#ffedd5', '#fed7aa'],
    // РОЗОВЫЕ
    ['#ec4899', '#db2777'], ['#f472b6', '#ec4899'], ['#f9a8d4', '#f472b6'], ['#fbcfe8', '#f9a8d4'],
    // БИРЮЗОВЫЕ
    ['#06b6d4', '#0891b2'], ['#22d3ee', '#06b6d4'], ['#67e8f9', '#22d3ee'], ['#a5f3fc', '#67e8f9'],
    // ИНДИГО
    ['#6366f1', '#4f46e5'], ['#818cf8', '#6366f1'], ['#a5b4fc', '#818cf8'], ['#c7d2fe', '#a5b4fc'],
    // ИЗУМРУДНЫЕ
    ['#10b981', '#059669'], ['#34d399', '#10b981'], ['#6ee7b7', '#34d399'], ['#a7f3d0', '#6ee7b7'],
    // ЛАЙМОВЫЕ
    ['#84cc16', '#65a30d'], ['#a3e635', '#84cc16'], ['#bef264', '#a3e635'], ['#d9f99d', '#bef264'],
    // ЯНТАРНЫЕ
    ['#f59e0b', '#d97706'], ['#fbbf24', '#f59e0b'], ['#fcd34d', '#fbbf24'], ['#fde68a', '#fcd34d'],
    // ПУРПУРНЫЕ
    ['#a855f7', '#9333ea'], ['#c084fc', '#a855f7'], ['#d8b4fe', '#c084fc'], ['#e9d5ff', '#d8b4fe'],
    // ГОЛУБЫЕ
    ['#0ea5e9', '#0284c7'], ['#38bdf8', '#0ea5e9'], ['#7dd3fc', '#38bdf8'], ['#bae6fd', '#7dd3fc'],
    // МЯТНЫЕ
    ['#14b8a6', '#0d9488'], ['#2dd4bf', '#14b8a6'], ['#5eead4', '#2dd4bf'], ['#99f6e4', '#5eead4'],
    // СЕРЫЕ (светлые)
    ['#94a3b8', '#64748b'], ['#cbd5e1', '#94a3b8'], ['#e2e8f0', '#cbd5e1'], ['#f1f5f9', '#e2e8f0']
  ];

  // 🎨 ГЕНЕРАЦИЯ ПРОСТОЙ КАРТЫ С ГРАДИЕНТОМ (БЕЗ ПОКЕМОНА)
  const generateSimpleCardImage = (suit: string, rank: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    const suitData = SUITS.find(s => s.value === suit);
    const rankData = RANKS.find(r => r.value === rank);

    if (!suitData || !rankData) return '';

    // ✅ РАНДОМНЫЙ ГРАДИЕНТ
    const randomGradient = GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, randomGradient[0]);
    gradient.addColorStop(1, randomGradient[1]);

    // ✅ ФОН С ГРАДИЕНТОМ
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ✅ БЕЛАЯ РАМКА
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // ✅ ТЕНЬ ДЛЯ ТЕКСТА
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // ✅ ВЕРХНИЙ ЛЕВЫЙ УГОЛ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rankData.display, 25, 60);
    
    ctx.font = '60px Arial';
    ctx.fillText(suitData.symbol, 25, 125);

    // ✅ НИЖНИЙ ПРАВЫЙ УГОЛ (ПЕРЕВЁРНУТО)
    ctx.save();
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rankData.display, 25, 60);
    
    ctx.font = '60px Arial';
    ctx.fillText(suitData.symbol, 25, 125);
    ctx.restore();

    // ✅ ЦЕНТРАЛЬНЫЙ СИМВОЛ МАСТИ (ПОЛУПРОЗРАЧНЫЙ, БОЛЬШОЙ)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suitData.symbol, canvas.width / 2, canvas.height / 2);

    // Сброс теней
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    return canvas.toDataURL('image/png');
  };

  // ⚡ ГЕНЕРАЦИЯ КАРТЫ С ПОКЕМОНОМ (для специальной кнопки)
  const generatePokemonCardImage = (suit: string, rank: string, pokemonId: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // ✅ БЕЛЫЙ ФОН
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ✅ РАМКА
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    const suitData = SUITS.find(s => s.value === suit);
    const rankData = RANKS.find(r => r.value === rank);

    if (!suitData || !rankData) return '';

    // ✅ ВЕРХНИЙ ЛЕВЫЙ УГОЛ (Ранг + Масть)
    ctx.fillStyle = suitData.color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rankData.display, 20, 50);
    
    ctx.font = '50px Arial';
    ctx.fillText(suitData.symbol, 20, 100);

    // ✅ НИЖНИЙ ПРАВЫЙ УГОЛ (Ранг + Масть - ПЕРЕВЁРНУТО)
    ctx.save();
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    
    ctx.fillStyle = suitData.color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(rankData.display, 20, 50);
    
    ctx.font = '50px Arial';
    ctx.fillText(suitData.symbol, 20, 100);
    ctx.restore();

    // ✅ ЗАГРУЖАЕМ ПОКЕМОНА
    return new Promise<string>((resolve) => {
      const pokemonImg = new Image();
      pokemonImg.crossOrigin = 'anonymous';
      pokemonImg.onload = () => {
        const imgWidth = 200;
        const imgHeight = 200;
        const imgX = (canvas.width - imgWidth) / 2;
        const imgY = (canvas.height - imgHeight) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(imgX - 5, imgY - 5, imgWidth + 10, imgHeight + 10);
        ctx.drawImage(pokemonImg, imgX, imgY, imgWidth, imgHeight);

        resolve(canvas.toDataURL('image/png'));
      };
      pokemonImg.onerror = () => {
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(50, 110, 200, 200);
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`ПОКЕМОН #${pokemonId}`, canvas.width / 2, canvas.height / 2);
        resolve(canvas.toDataURL('image/png'));
      };
      pokemonImg.src = `/pokemon/${pokemonId}.png`;
    });
  };

  const handleGenerateSingle = async () => {
    if (userCoins < currentCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${currentCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    try {
      setIsGenerating(true);
      console.log('🎨 Генерация ПРОСТОЙ NFT карты С ГРАДИЕНТОМ (БЕЗ покемона)...');

      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      // ✅ ГЕНЕРАЦИЯ ПРОСТОЙ КАРТЫ С ГРАДИЕНТОМ (БЕЗ ПОКЕМОНА!)
      const imageDataUrl = generateSimpleCardImage(selectedSuit, selectedRank);

      console.log('✅ Простое изображение с градиентом сгенерировано, отправляем на сервер...');

      const response = await fetch('/api/nft/generate-pokemon', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId,
          'x-username': username
        },
        body: JSON.stringify({
          action: 'simple',
          suit: selectedSuit,
          rank: selectedRank,
          rankCost,
          suitCost,
          totalCost: currentCost,
          pokemonId: null, // ✅ НЕТ ПОКЕМОНА!
          imageData: imageDataUrl
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации NFT');
      }

      console.log('✅ NFT карта успешно создана!');
      
      // Обновляем баланс
      if (result.newBalance !== undefined) {
        onBalanceUpdate(result.newBalance);
      }

      // Перезагружаем список карт
      await fetchUserCards();

      alert(`✅ NFT карта создана!\n\n${RANKS.find(r => r.value === selectedRank)?.display} ${SUITS.find(s => s.value === selectedSuit)?.label}\n\nСпискано: ${currentCost.toLocaleString()} монет\nОстаток: ${result.newBalance?.toLocaleString()} монет`);

    } catch (error: any) {
      console.error('❌ Ошибка генерации NFT:', error);
      alert(`❌ Ошибка генерации NFT:\n${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRandom = async () => {
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)].value;
    const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)].value;
    
    setSelectedSuit(randomSuit);
    setSelectedRank(randomRank);
    
    // Небольшая задержка для визуального эффекта
    setTimeout(() => {
      handleGenerateSingle();
    }, 300);
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Рандомная карта с покемоном за 10000 монет
  const handleRandomPokemon = async () => {
    const cost = 10000;
    
    if (userCoins < cost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${cost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)].value;
    const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)].value;
    
    setSelectedSuit(randomSuit);
    setSelectedRank(randomRank);
    
    // Используем фиксированную цену 10000
    try {
      setIsGenerating(true);
      console.log('🎲 Генерация РАНДОМНОЙ карты с покемоном за 10000 монет...');

      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const randomPokemonId = Math.floor(Math.random() * 52) + 1;
      console.log(`🎲 Выбран покемон #${randomPokemonId}`);

      const imageDataUrl = await generatePokemonCardImage(randomSuit, randomRank, randomPokemonId);

      const response = await fetch('/api/nft/generate-pokemon', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId,
          'x-username': username
        },
        body: JSON.stringify({
          action: 'random',
          suit: randomSuit,
          rank: randomRank,
          rankCost: 0,
          suitCost: 0,
          totalCost: cost,
          pokemonId: randomPokemonId,
          imageData: imageDataUrl
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации NFT');
      }

      if (result.newBalance !== undefined) {
        onBalanceUpdate(result.newBalance);
      }

      await fetchUserCards();

      alert(`🎲 РАНДОМНАЯ ПОКЕМОН КАРТА!\n\n${RANKS.find(r => r.value === randomRank)?.display} ${SUITS.find(s => s.value === randomSuit)?.label}\nПокемон #${randomPokemonId}\n\nСпискано: ${cost.toLocaleString()} монет\nОстаток: ${result.newBalance?.toLocaleString()} монет`);

    } catch (error: any) {
      console.error('❌ Ошибка генерации:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Полная колода Покемонов (52 карты) за 400000 монет
  const handleFullDeck = async () => {
    const cost = 400000;
    
    if (userCoins < cost) {
      alert(`❌ Недостаточно монет!\n\nНужно: ${cost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    const confirmed = confirm(`🎴 СОЗДАТЬ ПОЛНУЮ КОЛОДУ?\n\n52 уникальные карты с покемонами\nСтоимость: ${cost.toLocaleString()} монет\n\nЭто займет ~1-2 минуты.\nПродолжить?`);
    
    if (!confirmed) return;

    setIsGenerating(true);

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
      const username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'User';

      if (!telegramId) {
        throw new Error('Telegram ID не найден');
      }

      let generatedCount = 0;
      const totalCards = 52;
      
      // Показываем прогресс
      alert(`⏳ Начинаем генерацию ${totalCards} карт...\n\nЭто может занять 1-2 минуты.\nПожалуйста, не закрывайте страницу!`);

      // Генерируем все 52 карты (все комбинации мастей и рангов)
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          const randomPokemonId = Math.floor(Math.random() * 52) + 1;
          
          try {
            const imageDataUrl = await generatePokemonCardImage(suit.value, rank.value, randomPokemonId);

            const response = await fetch('/api/nft/generate-pokemon', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'x-telegram-id': telegramId,
                'x-username': username
              },
              body: JSON.stringify({
                action: 'deck',
                suit: suit.value,
                rank: rank.value,
                rankCost: 0,
                suitCost: 0,
                totalCost: 0, // Стоимость списывается один раз в конце
                pokemonId: randomPokemonId,
                imageData: imageDataUrl
              })
            });

            const result = await response.json();

            if (response.ok && result.success) {
              generatedCount++;
              console.log(`✅ Создана карта ${generatedCount}/${totalCards}: ${rank.display}${suit.label}`);
            } else {
              console.error(`❌ Ошибка создания карты: ${rank.display}${suit.label}`, result.error);
            }

            // Небольшая задержка чтобы не перегружать API
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (cardError) {
            console.error(`❌ Ошибка генерации карты ${rank.display}${suit.label}:`, cardError);
          }
        }
      }

      // После генерации всех карт списываем монеты
      const deductResponse = await fetch('/api/user/add-coins', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId,
          'x-username': username
        },
        body: JSON.stringify({
          amount: -cost,
          reason: `Покупка полной колоды Покемонов (${generatedCount} карт)`
        })
      });

      const deductResult = await deductResponse.json();

      if (!deductResponse.ok || !deductResult.success) {
        throw new Error('Не удалось списать монеты');
      }

      if (deductResult.newBalance !== undefined) {
        onBalanceUpdate(deductResult.newBalance);
      }

      await fetchUserCards();

      alert(`🎉 КОЛОДА СОЗДАНА!\n\n✅ Создано карт: ${generatedCount}/${totalCards}\n💰 Списано: ${cost.toLocaleString()} монет\n💎 Остаток: ${deductResult.newBalance?.toLocaleString()} монет\n\nПроверьте свою коллекцию!`);

    } catch (error: any) {
      console.error('❌ Ошибка генерации колоды:', error);
      alert(`❌ Ошибка создания колоды: ${error.message}\n\nМонеты не были списаны.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // УДАЛЕННАЯ ФУНКЦИЯ: handleRandomNaruto (больше не нужна)
  const handleRandomNaruto_REMOVED = async () => {
    const cost = 10000;
    
    if (userCoins < cost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${cost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)].value;
    const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)].value;
    
    setSelectedSuit(randomSuit);
    setSelectedRank(randomRank);
    
    try {
      setIsGenerating(true);
      console.log('🎲 Генерация РАНДОМНОЙ карты с героем Наруто за 10000 монет...');

      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const randomNarutoId = Math.floor(Math.random() * 52) + 1;
      console.log(`🎲 Выбран герой Наруто #${randomNarutoId}`);

      // Генерируем карту с Наруто (используем /naruto/ вместо /pokemon/)
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas не поддерживается');

      // Белый фон
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Рамка
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

      const suitData = SUITS.find(s => s.value === randomSuit);
      const rankData = RANKS.find(r => r.value === randomRank);

      if (!suitData || !rankData) throw new Error('Некорректные данные карты');

      // Верхний левый угол
      ctx.fillStyle = suitData.color;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(rankData.display, 20, 50);
      ctx.font = '50px Arial';
      ctx.fillText(suitData.symbol, 20, 100);

      // Нижний правый угол (перевёрнуто)
      ctx.save();
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      ctx.fillStyle = suitData.color;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(rankData.display, 20, 50);
      ctx.font = '50px Arial';
      ctx.fillText(suitData.symbol, 20, 100);
      ctx.restore();

      // Загружаем героя Наруто
      const imageDataUrl = await new Promise<string>((resolve) => {
        const narutoImg = new Image();
        narutoImg.crossOrigin = 'anonymous';
        narutoImg.onload = () => {
          const imgWidth = 200;
          const imgHeight = 200;
          const imgX = (canvas.width - imgWidth) / 2;
          const imgY = (canvas.height - imgHeight) / 2;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(imgX - 5, imgY - 5, imgWidth + 10, imgHeight + 10);
          ctx.drawImage(narutoImg, imgX, imgY, imgWidth, imgHeight);

          resolve(canvas.toDataURL('image/png'));
        };
        narutoImg.onerror = () => {
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(50, 110, 200, 200);
          ctx.fillStyle = '#9ca3af';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`НАРУТО #${randomNarutoId}`, canvas.width / 2, canvas.height / 2);
          resolve(canvas.toDataURL('image/png'));
        };
        narutoImg.src = `/naruto/${randomNarutoId}.svg`;
      });

      const response = await fetch('/api/nft/generate-pokemon', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId,
          'x-username': username
        },
        body: JSON.stringify({
          action: 'random_naruto',
          suit: randomSuit,
          rank: randomRank,
          rankCost: 0,
          suitCost: 0,
          totalCost: cost,
          pokemonId: randomNarutoId, // используем то же поле для ID героя
          imageData: imageDataUrl
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации NFT');
      }

      if (result.newBalance !== undefined) {
        onBalanceUpdate(result.newBalance);
      }

      await fetchUserCards();

      alert(`🍥 РАНДОМНАЯ НАРУТО КАРТА!\n\n${RANKS.find(r => r.value === randomRank)?.display} ${SUITS.find(s => s.value === randomSuit)?.label}\nГерой Наруто #${randomNarutoId}\n\nСпискано: ${cost.toLocaleString()} монет\nОстаток: ${result.newBalance?.toLocaleString()} монет`);

    } catch (error: any) {
      console.error('❌ Ошибка генерации:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      borderRadius: '16px',
      padding: '20px',
      color: '#e2e8f0'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: '700',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        🎴 Генератор NFT карт с ПОКЕМОНАМИ
      </h3>

      {/* ПРЕВЬЮ КАРТЫ */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '200px',
          height: '280px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '3px solid #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}>
          {previewImage && (
            <img 
              src={previewImage} 
              alt={`${selectedRank} of ${selectedSuit}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          )}
        </div>
      </div>

      {/* ВЫБОР МАСТИ */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#94a3b8' }}>Масть ({suitCost.toLocaleString()} монет)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {SUITS.map((suit) => (
            <motion.button
              key={suit.value}
              onClick={() => setSelectedSuit(suit.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '15px',
                borderRadius: '12px',
                border: selectedSuit === suit.value ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedSuit === suit.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.6)',
                cursor: 'pointer',
                fontSize: '24px',
                color: suit.color,
                transition: 'all 0.3s ease'
              }}
            >
              {suit.symbol}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ВЫБОР РАНГА */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#94a3b8' }}>Ранг ({rankCost.toLocaleString()} монет)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {RANKS.map((rank) => (
            <motion.button
              key={rank.value}
              onClick={() => setSelectedRank(rank.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: selectedRank === rank.value ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedRank === rank.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.6)',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                color: '#e2e8f0',
                transition: 'all 0.3s ease'
              }}
            >
              {rank.display}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ЦЕНА */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '5px' }}>Итоговая стоимость:</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fbbf24' }}>
          💰 {currentCost.toLocaleString()} монет
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>
          У вас: {userCoins.toLocaleString()} монет
        </div>
        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px', fontWeight: '600' }}>
          🎲 Рандомный покемон из 52 вариантов!
        </div>
      </div>

      {/* КНОПКА СОЗДАНИЯ КАРТЫ */}
      <motion.button
        onClick={handleGenerateSingle}
        disabled={isGenerating || userCoins < currentCost}
        whileHover={userCoins >= currentCost && !isGenerating ? { scale: 1.02 } : {}}
        whileTap={userCoins >= currentCost && !isGenerating ? { scale: 0.98 } : {}}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: userCoins >= currentCost && !isGenerating
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'rgba(55, 65, 81, 0.6)',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: '700',
          cursor: userCoins >= currentCost && !isGenerating ? 'pointer' : 'not-allowed',
          opacity: userCoins >= currentCost && !isGenerating ? 1 : 0.6,
          transition: 'all 0.3s ease',
          marginBottom: '16px'
        }}
      >
        {isGenerating ? '⏳ Генерация...' : '✅ Создать карту'}
      </motion.button>

      {/* СПЕЦИАЛЬНЫЕ КНОПКИ */}
      <div style={{ 
        background: 'rgba(251, 191, 36, 0.05)',
        border: '2px solid rgba(251, 191, 36, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h4 style={{ 
          fontSize: '0.9rem', 
          color: '#fbbf24', 
          marginBottom: '12px', 
          textAlign: 'center',
          fontWeight: '700'
        }}>
          ⭐ СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ ⭐
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* РАНДОМНАЯ ПОКЕМОН КАРТА - 10К */}
          <motion.button
            onClick={handleRandomPokemon}
            disabled={isGenerating || userCoins < 10000}
            whileHover={userCoins >= 10000 && !isGenerating ? { scale: 1.02 } : {}}
            whileTap={userCoins >= 10000 && !isGenerating ? { scale: 0.98 } : {}}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: userCoins >= 10000 && !isGenerating
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: userCoins >= 10000 && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: userCoins >= 10000 && !isGenerating ? 1 : 0.6,
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>⚡</div>
            <div>РАНДОМНАЯ ПОКЕМОН КАРТА</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>💰 10 000 монет</div>
          </motion.button>

          {/* ПОЛНАЯ КОЛОДА ПОКЕМОНОВ - 400К */}
          <motion.button
            onClick={handleFullDeck}
            disabled={isGenerating || userCoins < 400000}
            whileHover={userCoins >= 400000 && !isGenerating ? { scale: 1.02 } : {}}
            whileTap={userCoins >= 400000 && !isGenerating ? { scale: 0.98 } : {}}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: 'none',
              background: userCoins >= 400000 && !isGenerating
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)'
                : 'rgba(55, 65, 81, 0.6)',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: userCoins >= 400000 && !isGenerating ? 'pointer' : 'not-allowed',
              opacity: userCoins >= 400000 && !isGenerating ? 1 : 0.6,
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              boxShadow: userCoins >= 400000 && !isGenerating 
                ? '0 8px 32px rgba(139, 92, 246, 0.4)' 
                : 'none'
            }}
          >
            <div style={{ fontSize: '2rem' }}>🎴✨</div>
            <div>ПОЛНАЯ КОЛОДА ПОКЕМОНОВ</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>52 уникальные карты</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fbbf24' }}>💎 400 000 монет</div>
          </motion.button>
        </div>
      </div>

    </div>
  );
}

