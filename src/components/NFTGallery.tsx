'use client'

/**
 * 🎴 ГАЛЕРЕЯ NFT КАРТ P.I.D.R. - ПРЕМИУМ ДИЗАЙН
 * Отображает заминченные карты игрока с красивой подсветкой
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Coins, Calendar, Hash } from 'lucide-react';

interface NFTCard {
  id: string;
  user_id: string;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
  storage_path?: string;
  metadata?: any;
  created_at: string;
}

export default function NFTGallery() {
  const [collection, setCollection] = useState<NFTCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);

  useEffect(() => {
    loadCollection();
  }, []);

  /**
   * 📦 Загружаем коллекцию NFT карт пользователя
   */
  const loadCollection = async () => {
    setIsLoading(true);
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      console.log('🎴 Загружаем NFT коллекцию...');

      const response = await fetch('/api/nft/collection', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ NFT коллекция загружена:', result);
        console.log('📦 Количество карт:', result.collection?.length || 0);
        if (result.success && result.collection) {
          setCollection(result.collection);
        } else {
          console.warn('⚠️ Коллекция пуста или не найдена');
          setCollection([]);
        }
      } else {
        console.error('❌ Ошибка загрузки, статус:', response.status);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 Цвета для мастей
  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = {
      'hearts': '#ef4444',
      'diamonds': '#f59e0b',
      'clubs': '#22c55e',
      'spades': '#3b82f6'
    };
    return colors[suit?.toLowerCase()] || '#94a3b8';
  };

  const getSuitGradient = (suit: string) => {
    const gradients: Record<string, string> = {
      'hearts': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      'diamonds': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'clubs': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      'spades': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    };
    return gradients[suit?.toLowerCase()] || 'linear-gradient(135deg, #64748b, #475569)';
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit?.toLowerCase()] || '?';
  };

  const getRarityLabel = (rarity: string) => {
    const labels: Record<string, string> = {
      'pokemon': '⚡ Покемон',
      'custom': '🎨 Кастом',
      'simple': '🃏 Базовая'
    };
    return labels[rarity?.toLowerCase()] || '🎴 NFT';
  };

  const getCharacterName = (card: NFTCard) => {
    const pokemonId = card.metadata?.pokemonId;
    if (!pokemonId) return null;
    
    if (card.rarity === 'pokemon') {
      return `Покемон #${pokemonId}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
        <p className="mt-4 text-gray-400 font-semibold">Загружаем вашу коллекцию...</p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Sparkles className="w-20 h-20 text-gray-600 mb-4" />
        <h3 className="text-2xl font-black text-white mb-2">Коллекция пуста</h3>
        <p className="text-gray-400">Создайте свою первую NFT карту!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Заголовок */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
          <Sparkles className="text-yellow-400" size={32} />
          🎴 МОЯ NFT КОЛЛЕКЦИЯ
          <Sparkles className="text-yellow-400" size={32} />
        </h2>
        <p className="text-lg text-gray-400 font-semibold">
          Всего карт: <span className="text-blue-400">{collection.length}</span>
        </p>
      </div>

      {/* Сетка карт - УМЕНЬШЕНЫ В 2 РАЗА */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 p-4">
        {collection.map((card, index) => {
          const suitColor = getSuitColor(card.suit);
          const suitGradient = getSuitGradient(card.suit);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -8 }}
              onClick={() => setSelectedCard(card)}
              className="cursor-pointer relative group"
              style={{
                borderRadius: '16px',
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: `2px solid ${suitColor}40`,
                boxShadow: `0 4px 20px ${suitColor}30, 0 0 0 1px ${suitColor}20`,
                transition: 'all 0.3s ease',
                overflow: 'hidden'
              }}
            >
              {/* Анимированный блик */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  background: [
                    `linear-gradient(45deg, transparent 30%, ${suitColor}40 50%, transparent 70%)`,
                    `linear-gradient(225deg, transparent 30%, ${suitColor}40 50%, transparent 70%)`
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />

              {/* Изображение карты */}
              <div className="relative aspect-[2/3] overflow-hidden">
                <img
                  src={card.image_url}
                  alt={`${card.rank} ${getSuitSymbol(card.suit)}`}
                  className="w-full h-full object-cover"
                  style={{
                    filter: 'brightness(0.95) contrast(1.1)'
                  }}
                />
                
                {/* Бейдж масти */}
                <div 
                  className="absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  style={{
                    background: suitGradient,
                    boxShadow: `0 4px 12px ${suitColor}60`
                  }}
                >
                  {getSuitSymbol(card.suit)}
                </div>

                {/* Бейдж типа */}
                <div 
                  className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-md"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {getRarityLabel(card.rarity)}
                </div>
              </div>

              {/* Информация о карте */}
              <div className="p-3 text-center">
                <h3 
                  className="text-xl font-black text-white mb-1"
                  style={{ textShadow: `0 2px 8px ${suitColor}` }}
                >
                  {card.rank?.toUpperCase()} {getSuitSymbol(card.suit)}
                </h3>
                <p className="text-xs text-gray-400 font-semibold">
                  {card.metadata?.cost ? `💰 ${card.metadata.cost} монет` : '🎴 NFT'}
                </p>
              </div>

              {/* Свечение при наведении */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at center, ${suitColor}20 0%, transparent 70%)`,
                  boxShadow: `inset 0 0 40px ${suitColor}40`
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Модальное окно с деталями */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
                border: `3px solid ${getSuitColor(selectedCard.suit)}`,
                boxShadow: `0 30px 80px ${getSuitColor(selectedCard.suit)}60, 0 0 100px ${getSuitColor(selectedCard.suit)}40`
              }}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(239, 68, 68, 0.8)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)'
                }}
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="grid md:grid-cols-2 gap-6 p-8">
                {/* Изображение карты - УВЕЛИЧЕНО В 2.5 РАЗА */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  animate={{ 
                    boxShadow: [
                      `0 0 40px ${getSuitColor(selectedCard.suit)}60`,
                      `0 0 60px ${getSuitColor(selectedCard.suit)}80`,
                      `0 0 40px ${getSuitColor(selectedCard.suit)}60`
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    border: `3px solid ${getSuitColor(selectedCard.suit)}`,
                    aspectRatio: '2/3',
                    transform: 'scale(1.25)' // ✅ УВЕЛИЧЕНО В 2.5 РАЗА (было 1, стало 2.5, но для баланса 1.25)
                  }}
                >
                  <img
                    src={selectedCard.image_url}
                    alt={`${selectedCard.rank} ${getSuitSymbol(selectedCard.suit)}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Информация */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 
                      className="text-4xl font-black text-white mb-2 flex items-center gap-3"
                      style={{ textShadow: `0 4px 16px ${getSuitColor(selectedCard.suit)}` }}
                    >
                      {selectedCard.rank?.toUpperCase()} 
                      <span style={{ color: getSuitColor(selectedCard.suit) }}>
                        {getSuitSymbol(selectedCard.suit)}
                      </span>
                    </h2>

                    {/* Название героя */}
                    {getCharacterName(selectedCard) && (
                      <h3 className="text-xl font-bold text-gray-300 mb-4">
                        {getCharacterName(selectedCard)}
                      </h3>
                    )}

                    <div className="space-y-3">
                      {/* Тип карты */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <Sparkles size={20} className="text-yellow-400" />
                        <div>
                          <p className="text-xs text-gray-400">Тип карты</p>
                          <p className="text-sm font-bold text-white">{getRarityLabel(selectedCard.rarity)}</p>
                        </div>
                      </div>

                      {/* Стоимость */}
                      {selectedCard.metadata?.cost && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                          <Coins size={20} className="text-yellow-400" />
                          <div>
                            <p className="text-xs text-gray-400">Стоимость</p>
                            <p className="text-sm font-bold text-white">{selectedCard.metadata.cost.toLocaleString()} монет</p>
                          </div>
                        </div>
                      )}

                      {/* Покемон/Наруто ID */}
                      {selectedCard.metadata?.pokemonId && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                          <Hash size={20} className="text-blue-400" />
                          <div>
                            <p className="text-xs text-gray-400">ID персонажа</p>
                            <p className="text-sm font-bold text-white">#{selectedCard.metadata.pokemonId}</p>
                          </div>
                        </div>
                      )}

                      {/* Дата создания */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <Calendar size={20} className="text-purple-400" />
                        <div>
                          <p className="text-xs text-gray-400">Создано</p>
                          <p className="text-sm font-bold text-white">
                            {new Date(selectedCard.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Кнопка закрыть */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCard(null)}
                    className="mt-6 w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all duration-200"
                    style={{
                      background: getSuitGradient(selectedCard.suit),
                      boxShadow: `0 8px 24px ${getSuitColor(selectedCard.suit)}40`
                    }}
                  >
                    Закрыть
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
