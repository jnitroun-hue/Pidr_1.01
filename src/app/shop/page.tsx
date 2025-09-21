'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, ChevronLeft, ChevronRight, Star, Sparkles, Layers, Gift, Crown } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

// Типы для товаров
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  preview?: string;
  owned?: boolean;
}

export default function ModernShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('skins');
  const [coins, setCoins] = useState(1500);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);

  // Категории магазина
  const categories = [
    { id: 'skins', name: 'СКИНЫ', icon: '🎨' },
    { id: 'effects', name: 'ЭФФЕКТЫ', icon: '✨' },
    { id: 'cards', name: 'НАБОРЫ КАРТ', icon: '🃏' },
    { id: 'bundles', name: 'НАБОРЫ', icon: '📦' },
    { id: 'avatars', name: 'РАМКИ АВАТАРА', icon: '🖼️' },
  ];

  // Курсы криптовалют (1 USDT = 150 монет)
  const cryptoRates = {
    USDT: 150,
    TON: 750,   // ~$5
    ETH: 375000, // ~$2500
    SOL: 30000,  // ~$200
  };

  // Пример товаров (позже заменим на реальные)
  const shopItems: ShopItem[] = [
    // Скины
    {
      id: 'royal-skin',
      name: 'Королевский стиль',
      description: 'Элегантные карты в королевском стиле с золотыми узорами',
      price: 750,
      category: 'skins',
      rarity: 'legendary',
      image: '/images/skins/royal-preview.jpg', // Нужно добавить
      preview: '/images/skins/royal-full.jpg'
    },
    {
      id: 'neon-skin',
      name: 'Неоновое свечение',
      description: 'Яркие неоновые карты с эффектом свечения',
      price: 500,
      category: 'skins',
      rarity: 'epic',
      image: '/images/skins/neon-preview.jpg'
    },
    {
      id: 'classic-skin',
      name: 'Классический винтаж',
      description: 'Стильные винтажные карты в ретро стиле',
      price: 300,
      category: 'skins',
      rarity: 'rare',
      image: '/images/skins/vintage-preview.jpg'
    },
    // Эффекты
    {
      id: 'fire-effect',
      name: 'Пламенный взрыв',
      description: 'Эффект огня при победных комбинациях',
      price: 400,
      category: 'effects',
      rarity: 'epic',
      image: '/images/effects/fire-preview.gif'
    },
    {
      id: 'sparkle-effect',
      name: 'Звездная пыль',
      description: 'Мерцающие звезды при каждом ходе',
      price: 250,
      category: 'effects',
      rarity: 'rare',
      image: '/images/effects/sparkle-preview.gif'
    },
    // Наборы карт
    {
      id: 'premium-deck',
      name: 'Премиум колода',
      description: 'Полная колода карт с уникальным дизайном',
      price: 1200,
      category: 'cards',
      rarity: 'legendary',
      image: '/images/cards/premium-deck.jpg'
    },
    {
      id: 'cyber-deck',
      name: 'Киберпанк колода',
      description: 'Футуристические карты в стиле киберпанк',
      price: 800,
      category: 'cards',
      rarity: 'epic',
      image: '/images/cards/cyber-deck.jpg'
    },
    // Наборы
    {
      id: 'starter-bundle',
      name: 'Стартовый набор',
      description: 'Скин + эффект + 1000 монет',
      price: 600,
      category: 'bundles',
      rarity: 'rare',
      image: '/images/bundles/starter-bundle.jpg'
    },
    // Рамки аватара
    {
      id: 'diamond-frame',
      name: 'Алмазная рамка',
      description: 'Сверкающая алмазная рамка для аватара',
      price: 600,
      category: 'avatars',
      rarity: 'legendary',
      image: '/images/frames/diamond-frame.png'
    },
    {
      id: 'gold-frame',
      name: 'Золотая рамка',
      description: 'Элегантная золотая рамка',
      price: 400,
      category: 'avatars',
      rarity: 'epic',
      image: '/images/frames/gold-frame.png'
    }
  ];

  useEffect(() => {
    loadUserBalance();
    const handleCoinsUpdate = (event: CustomEvent) => {
      setCoins(event.detail.newBalance);
    };
    window.addEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    return () => window.removeEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
  }, []);

  const loadUserBalance = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setCoins(data.user.coins || 0);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки баланса:', error);
    }
  };

  const filteredItems = shopItems.filter(item => item.category === selectedCategory);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % filteredItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 via-orange-500 to-red-500';
      case 'epic': return 'from-purple-400 via-pink-500 to-indigo-500';
      case 'rare': return 'from-blue-400 via-cyan-500 to-teal-500';
      default: return 'from-gray-400 via-gray-500 to-gray-600';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-2xl shadow-yellow-500/50';
      case 'epic': return 'shadow-2xl shadow-purple-500/50';
      case 'rare': return 'shadow-xl shadow-blue-500/50';
      default: return 'shadow-lg shadow-gray-500/30';
    }
  };

  const convertPrice = (coins: number, crypto: keyof typeof cryptoRates) => {
    return (coins / cryptoRates[crypto]).toFixed(crypto === 'ETH' ? 6 : 3);
  };

  const handlePurchase = async (item: ShopItem, paymentMethod: 'coins' | keyof typeof cryptoRates) => {
    if (paymentMethod === 'coins') {
      if (coins >= item.price && !purchasedItems.includes(item.id)) {
        try {
          const response = await fetch('/api/shop/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ itemId: item.id, price: item.price })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setCoins(data.newBalance);
              setPurchasedItems(prev => [...prev, item.id]);
              window.dispatchEvent(new CustomEvent('coinsUpdated', {
                detail: { newBalance: data.newBalance }
              }));
            }
          }
        } catch (error) {
          console.error('Ошибка покупки:', error);
        }
      }
    } else {
      // Здесь будет логика криптоплатежей
      console.log(`Покупка ${item.name} за ${convertPrice(item.price, paymentMethod)} ${paymentMethod}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-sm">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold">Назад</span>
          </button>
          
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            МАГАЗИН
          </h1>
          
          <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl border border-yellow-400/30">
            <Coins className="text-yellow-400" size={24} />
            <span className="text-yellow-400 font-bold text-lg">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Categories - Плоские кнопки сверху */}
        <div className="px-6 py-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setCurrentSlide(0);
                }}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl border transition-all duration-300 whitespace-nowrap font-semibold ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="text-xl">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Slider */}
        <div className="px-6 flex-1">
          {filteredItems.length > 0 ? (
            <div className="relative">
              {/* Navigation arrows */}
              {filteredItems.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Product Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedCategory}-${currentSlide}`}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  {filteredItems[currentSlide] && (
                    <div className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl border border-white/20 p-8 ${getRarityGlow(filteredItems[currentSlide].rarity)}`}>
                      {/* Rarity Badge */}
                      <div className="flex justify-center mb-6">
                        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r ${getRarityColor(filteredItems[currentSlide].rarity)} text-white font-bold text-sm shadow-lg`}>
                          <Star size={16} />
                          <span>{filteredItems[currentSlide].rarity.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Product Image Placeholder */}
                      <div className="w-full h-64 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border border-white/10 mb-6 flex items-center justify-center">
                        <div className="text-center text-white/50">
                          <div className="text-6xl mb-4">
                            {selectedCategory === 'skins' && '🎨'}
                            {selectedCategory === 'effects' && '✨'}
                            {selectedCategory === 'cards' && '🃏'}
                            {selectedCategory === 'bundles' && '📦'}
                            {selectedCategory === 'avatars' && '🖼️'}
                          </div>
                          <p className="text-sm">Превью товара</p>
                          <p className="text-xs mt-1 opacity-70">
                            Формат: PNG/JPG (512x512px)
                            <br />
                            Для анимаций: GIF/WebP
                          </p>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-white mb-3">
                          {filteredItems[currentSlide].name}
                        </h2>
                        <p className="text-white/70 text-lg leading-relaxed">
                          {filteredItems[currentSlide].description}
                        </p>
                      </div>

                      {/* Purchase Options */}
                      <div className="space-y-4">
                        {/* Coins Purchase - Long Button */}
                        <button
                          onClick={() => handlePurchase(filteredItems[currentSlide], 'coins')}
                          disabled={coins < filteredItems[currentSlide].price || purchasedItems.includes(filteredItems[currentSlide].id)}
                          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                            purchasedItems.includes(filteredItems[currentSlide].id)
                              ? 'bg-green-500/20 border-2 border-green-400/50 text-green-300 cursor-not-allowed'
                              : coins >= filteredItems[currentSlide].price
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-transparent'
                              : 'bg-gray-500/20 border-2 border-gray-400/30 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {purchasedItems.includes(filteredItems[currentSlide].id) ? (
                            <span className="flex items-center justify-center space-x-2">
                              <span>✓</span>
                              <span>КУПЛЕНО</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center space-x-3">
                              <Coins size={24} />
                              <span>{filteredItems[currentSlide].price.toLocaleString()} МОНЕТ</span>
                            </span>
                          )}
                        </button>

                        {/* Crypto Options - Round Icons */}
                        <div className="flex justify-center space-x-4">
                          {/* USDT */}
                          <button
                            onClick={() => handlePurchase(filteredItems[currentSlide], 'USDT')}
                            className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm rounded-full border border-green-400/30 flex flex-col items-center justify-center text-green-400 hover:bg-green-500/30 transition-all duration-300 hover:scale-110 group"
                          >
                            <span className="text-xs font-bold">💵</span>
                            <span className="text-xs font-bold mt-1">{convertPrice(filteredItems[currentSlide].price, 'USDT')}</span>
                          </button>

                          {/* TON */}
                          <button
                            onClick={() => handlePurchase(filteredItems[currentSlide], 'TON')}
                            className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-sm rounded-full border border-blue-400/30 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-500/30 transition-all duration-300 hover:scale-110"
                          >
                            <span className="text-xs font-bold">💎</span>
                            <span className="text-xs font-bold mt-1">{convertPrice(filteredItems[currentSlide].price, 'TON')}</span>
                          </button>

                          {/* ETH */}
                          <button
                            onClick={() => handlePurchase(filteredItems[currentSlide], 'ETH')}
                            className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-sm rounded-full border border-indigo-400/30 flex flex-col items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-all duration-300 hover:scale-110"
                          >
                            <span className="text-xs font-bold">🦄</span>
                            <span className="text-xs font-bold mt-1">{convertPrice(filteredItems[currentSlide].price, 'ETH')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Slide Indicators */}
                      {filteredItems.length > 1 && (
                        <div className="flex justify-center space-x-2 mt-6">
                          {filteredItems.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentSlide(index)}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentSlide
                                  ? 'bg-purple-400 w-8'
                                  : 'bg-white/30 hover:bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-2xl font-bold text-white mb-2">Скоро здесь появятся товары!</h3>
              <p className="text-white/70">В этой категории пока нет доступных товаров</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}