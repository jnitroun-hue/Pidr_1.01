'use client'

/**
 * 🎴 ГАЛЕРЕЯ NFT КАРТ P.I.D.R. - КОМПАКТНЫЙ ПРЕМИУМ ДИЗАЙН
 * Отображает заминченные карты игрока в виде компактной сетки
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

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

      const result = await response.json();
      console.log('📦 Результат загрузки коллекции:', result);

      if (result.success && result.collection) {
        setCollection(result.collection || []);
        console.log(`✅ Загружено ${result.collection.length} NFT карт`);
      } else {
        console.error('❌ Ошибка загрузки коллекции:', result.error);
        setCollection([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
      setCollection([]);
    } finally {
      setIsLoading(false);
    }
  };

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
        <p className="mt-4 text-gray-400">Загружаем коллекцию...</p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="text-6xl mb-4">😔</div>
        <h3 className="text-2xl font-bold text-white mb-2">Коллекция пуста</h3>
        <p className="text-gray-400 text-center">Создайте свою первую NFT карту!</p>
      </div>
    );
  }

  return (
    <div className="w-full" data-nft-gallery-component="unique-v3">
      {/* Заголовок - КОМПАКТНЫЙ */}
      <div className="mb-3 text-center">
        <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center justify-center gap-2">
          <Sparkles className="text-yellow-400" size={16} />
          <span>МОЯ NFT КОЛЛЕКЦИЯ</span>
          <Sparkles className="text-yellow-400" size={16} />
        </h3>
        <p className="text-xs text-gray-400">
          Всего: <span className="text-blue-400 font-semibold">{collection.length}</span>
        </p>
      </div>

      {/* НОРМАЛЬНАЯ СЕТКА КАРТ */}
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-4 p-4">
        {collection.map((card, index) => {
          const suitColor = getSuitColor(card.suit);
          
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCard(card)}
              className="relative group focus:outline-none touch-manipulation"
              style={{
                borderRadius: '12px',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                border: `3px solid ${suitColor}`,
                boxShadow: `0 8px 24px ${suitColor}40, 0 4px 12px rgba(0,0,0,0.15)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                aspectRatio: '2/3',
                minWidth: 0,
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              {/* Глянцевый эффект сверху */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none"
                style={{ borderRadius: '10px' }}
              />

              {/* Изображение карты */}
              <img
                src={card.image_url}
                alt={`${card.rank} ${getSuitSymbol(card.suit)}`}
                className="w-full h-full object-contain"
                loading="lazy"
                style={{
                  display: 'block',
                  padding: '4px'
                }}
              />
              
              {/* Значок масти - крупный */}
              <div 
                className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base font-bold text-white shadow-lg"
                style={{
                  background: getSuitGradient(card.suit),
                  boxShadow: `0 4px 12px ${suitColor}80, inset 0 1px 3px rgba(255,255,255,0.3)`
                }}
              >
                {getSuitSymbol(card.suit)}
              </div>

              {/* Ранг карты - крупный и читаемый */}
              <div 
                className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-sm sm:text-base font-black text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${suitColor}ee 0%, ${suitColor}aa 100%)`,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {card.rank?.toUpperCase()}
              </div>

              {/* Hover эффект с информацией */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-3 pointer-events-none"
              >
                <span className="text-white text-xs sm:text-sm font-bold drop-shadow-lg mb-1">
                  {card.rank?.toUpperCase()} {getSuitSymbol(card.suit)}
                </span>
                <span className="text-white/90 text-[10px] sm:text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  {getRarityLabel(card.rarity)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* МОДАЛЬНОЕ ОКНО С ИНФОРМАЦИЕЙ О КАРТЕ */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              zIndex: 999999, // ✅ КРИТИЧНО: МАКСИМАЛЬНЫЙ Z-INDEX!
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[95vw] sm:max-w-md rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                border: `2px solid ${getSuitColor(selectedCard.suit)}`,
                boxShadow: `0 20px 60px ${getSuitColor(selectedCard.suit)}60, 0 0 80px ${getSuitColor(selectedCard.suit)}40`,
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-xl transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.6)'
                }}
              >
                <X size={20} strokeWidth={3} />
              </button>

              <div className="p-4 sm:p-6">
                {/* Изображение карты - МОБИЛЬНАЯ ОПТИМИЗАЦИЯ */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6"
                  style={{
                    border: `2px solid ${getSuitColor(selectedCard.suit)}`,
                    boxShadow: `0 15px 40px ${getSuitColor(selectedCard.suit)}60`,
                    aspectRatio: '2/3',
                    maxWidth: 'min(280px, 80vw)',
                    margin: '0 auto'
                  }}
                >
                  <img
                    src={selectedCard.image_url}
                    alt={`${selectedCard.rank} ${getSuitSymbol(selectedCard.suit)}`}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Информация - МОБИЛЬНАЯ ОПТИМИЗАЦИЯ */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Ранг и масть */}
                  <div className="text-center">
                    <h2 
                      className="text-3xl sm:text-4xl font-black text-white mb-2 flex items-center justify-center gap-2 sm:gap-3 flex-wrap"
                      style={{ textShadow: `0 3px 12px ${getSuitColor(selectedCard.suit)}` }}
                    >
                      <span className="text-2xl sm:text-4xl">{selectedCard.rank?.toUpperCase()}</span>
                      <span style={{ color: getSuitColor(selectedCard.suit) }} className="text-3xl sm:text-4xl">
                        {getSuitSymbol(selectedCard.suit)}
                      </span>
                    </h2>

                    {/* Название героя */}
                    {getCharacterName(selectedCard) && (
                      <p className="text-lg font-bold text-gray-300 mb-2">
                        {getCharacterName(selectedCard)}
                      </p>
                    )}

                    {/* Тип карты */}
                    <div 
                      className="inline-block px-4 py-2 rounded-lg font-bold text-sm"
                      style={{
                        background: getSuitGradient(selectedCard.suit),
                        boxShadow: `0 4px 12px ${getSuitColor(selectedCard.suit)}50`
                      }}
                    >
                      {getRarityLabel(selectedCard.rarity)}
                    </div>
                  </div>

                  {/* Дата создания */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Создано</p>
                    <p className="text-sm font-bold text-gray-300">
                      {new Date(selectedCard.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Кнопки действий */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {/* Кнопка "Добавить в колоду" */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        try {
                          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
                          const response = await fetch('/api/nft/add-to-deck', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-telegram-id': telegramUser?.id?.toString() || selectedCard.user_id,
                              'x-username': telegramUser?.username || 'User'
                            },
                            body: JSON.stringify({
                              nftId: selectedCard.id,
                              suit: selectedCard.suit,
                              rank: selectedCard.rank,
                              imageUrl: selectedCard.image_url
                            })
                          });

                          const result = await response.json();

                          if (response.ok && result.success) {
                            alert(`✅ Карта добавлена в игровую колоду!\n\nТеперь эта карта будет видна всем игрокам когда вы побьете верхнюю карту!`);
                            setSelectedCard(null);
                          } else {
                            throw new Error(result.error || 'Ошибка добавления');
                          }
                        } catch (error: any) {
                          alert(`❌ Ошибка: ${error.message}`);
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all duration-200"
                      style={{
                        background: getSuitGradient(selectedCard.suit),
                        boxShadow: `0 8px 24px ${getSuitColor(selectedCard.suit)}50`
                      }}
                    >
                      🎴 В колоду
                    </motion.button>

                    {/* Кнопка "Продать" - НОВАЯ! */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        // Перенаправляем в магазин с автоматическим открытием модалки продажи
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('nft_to_sell', JSON.stringify({
                            id: selectedCard.id,
                            suit: selectedCard.suit,
                            rank: selectedCard.rank,
                            image_url: selectedCard.image_url,
                            rarity: selectedCard.rarity
                          }));
                          window.location.href = '/shop';
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        boxShadow: '0 8px 24px rgba(251, 191, 36, 0.5)'
                      }}
                    >
                      💰 Продать
                    </motion.button>

                  </div>

                  {/* Кнопка "Закрыть" - ОТДЕЛЬНО НА ВСЮ ШИРИНУ */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCard(null)}
                    className="w-full py-3 px-6 rounded-xl font-bold text-base text-white transition-all duration-200 mt-2"
                    style={{
                      background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                      boxShadow: '0 8px 24px rgba(100, 116, 139, 0.4)'
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
