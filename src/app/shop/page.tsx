'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Star, Sparkles, Zap, Gift, Crown, Palette, Wand2, ShoppingBag, Wallet, ChevronLeft, ChevronRight, Plus, Flame } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

// Профессиональные типы для товаров
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'skins' | 'effects' | 'boosters' | 'bundles' | 'crypto';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image: string;
  owned?: boolean;
  discount?: number;
  featured?: boolean;
  new?: boolean;
  popular?: boolean;
}

interface CryptoPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  bonus?: number;
  popular?: boolean;
  bestValue?: boolean;
  icon: string;
  gradient: string;
}

export default function PremiumShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const [coins, setCoins] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [purchasedItems, setPurchasedItems] = useState<string[]>(['golden-skin']);

  // Категории с профессиональными иконками
  const categories = [
    { id: 'featured', name: 'РЕКОМЕНДУЕМОЕ', icon: Star, gradient: 'from-yellow-400 to-orange-500' },
    { id: 'skins', name: 'СКИНЫ', icon: Palette, gradient: 'from-purple-400 to-pink-500' },
    { id: 'effects', name: 'ЭФФЕКТЫ', icon: Wand2, gradient: 'from-blue-400 to-cyan-500' },
    { id: 'boosters', name: 'БУСТЕРЫ', icon: Zap, gradient: 'from-green-400 to-emerald-500' },
    { id: 'bundles', name: 'НАБОРЫ', icon: Gift, gradient: 'from-red-400 to-rose-500' },
    { id: 'crypto', name: 'МОНЕТЫ', icon: Wallet, gradient: 'from-indigo-400 to-purple-500' },
  ];

  // Премиум товары
  const shopItems: ShopItem[] = [
    // Рекомендуемые
    {
      id: 'mythic-royal',
      name: 'Королевская Легенда',
      description: 'Эксклюзивная коллекция с уникальными анимациями и эффектами',
      price: 2500,
      originalPrice: 3500,
      category: 'bundles',
      rarity: 'mythic',
      image: '/shop/mythic-royal.webp',
      discount: 30,
      featured: true,
      new: true
    },
    {
      id: 'diamond-skin',
      name: 'Алмазная Колода',
      description: 'Сверкающие карты с 3D эффектами и звуковым сопровождением',
      price: 1200,
      category: 'skins',
      rarity: 'legendary',
      image: '/shop/diamond-skin.webp',
      featured: true,
      popular: true
    },
    
    // Скины
    {
      id: 'golden-skin',
      name: 'Золотая Империя',
      description: 'Роскошные золотые карты с анимированными узорами',
      price: 800,
      category: 'skins',
      rarity: 'epic',
      image: '/shop/golden-skin.webp',
      owned: true
    },
    {
      id: 'neon-cyber',
      name: 'Кибер Неон',
      description: 'Футуристический дизайн с неоновой подсветкой',
      price: 600,
      category: 'skins',
      rarity: 'epic',
      image: '/shop/neon-cyber.webp'
    },
    {
      id: 'nature-magic',
      name: 'Магия Природы',
      description: 'Органические узоры с живыми элементами',
      price: 450,
      category: 'skins',
      rarity: 'rare',
      image: '/shop/nature-magic.webp'
    },
    
    // Эффекты
    {
      id: 'phoenix-flames',
      name: 'Пламя Феникса',
      description: 'Огненные крылья появляются при победе',
      price: 900,
      category: 'effects',
      rarity: 'legendary',
      image: '/shop/phoenix-flames.webp',
      new: true
    },
    {
      id: 'ice-storm',
      name: 'Ледяная Буря',
      description: 'Ледяные кристаллы окружают ваши карты',
      price: 650,
      category: 'effects',
      rarity: 'epic',
      image: '/shop/ice-storm.webp'
    },
    {
      id: 'lightning-strike',
      name: 'Удар Молнии',
      description: 'Электрические разряды при розыгрыше карт',
      price: 400,
      category: 'effects',
      rarity: 'rare',
      image: '/shop/lightning-strike.webp'
    },
    
    // Бустеры
    {
      id: 'mega-multiplier',
      name: 'Мега Множитель',
      description: 'x5 монет за победу в течение 2 часов',
      price: 300,
      category: 'boosters',
      rarity: 'epic',
      image: '/shop/mega-multiplier.webp',
      popular: true
    },
    {
      id: 'lucky-charm',
      name: 'Талисман Удачи',
      description: 'Повышенный шанс редких карт на 1 час',
      price: 200,
      category: 'boosters',
      rarity: 'rare',
      image: '/shop/lucky-charm.webp'
    },
    {
      id: 'xp-rocket',
      name: 'Ракета Опыта',
      description: 'x3 опыта за все действия на 30 минут',
      price: 150,
      category: 'boosters',
      rarity: 'common',
      image: '/shop/xp-rocket.webp'
    }
  ];

  // Криптопакеты с профессиональным дизайном
  const cryptoPackages: CryptoPackage[] = [
    {
      id: 'starter',
      name: 'Стартовый',
      coins: 1000,
      price: 0.99,
      icon: '🪙',
      gradient: 'from-gray-400 to-gray-600'
    },
    {
      id: 'popular',
      name: 'Популярный',
      coins: 2500,
      price: 1.99,
      bonus: 15,
      popular: true,
      icon: '💰',
      gradient: 'from-blue-400 to-blue-600'
    },
    {
      id: 'best-value',
      name: 'Лучшее предложение',
      coins: 6000,
      price: 3.99,
      bonus: 25,
      bestValue: true,
      icon: '💎',
      gradient: 'from-purple-400 to-purple-600'
    },
    {
      id: 'mega',
      name: 'Мега пакет',
      coins: 12000,
      price: 6.99,
      bonus: 35,
      icon: '👑',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'ultimate',
      name: 'Ультимативный',
      coins: 30000,
      price: 14.99,
      bonus: 50,
      icon: '🔥',
      gradient: 'from-red-400 to-pink-500'
    }
  ];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
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
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Слушаем обновления баланса
    const handleCoinsUpdate = (event: CustomEvent) => {
      setCoins(event.detail.newBalance);
    };

    window.addEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    return () => window.removeEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
  }, []);

  const filteredItems = selectedCategory === 'featured' 
    ? shopItems.filter(item => item.featured)
    : selectedCategory === 'crypto'
    ? []
    : shopItems.filter(item => item.category === selectedCategory);

  const handlePurchase = async (itemId: string, price: number) => {
    if (coins >= price && !purchasedItems.includes(itemId)) {
      try {
        const response = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ itemId, price })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCoins(data.newBalance);
            setPurchasedItems(prev => [...prev, itemId]);
            window.dispatchEvent(new CustomEvent('coinsUpdated', {
              detail: { newBalance: data.newBalance }
            }));
          }
        }
      } catch (error) {
        console.error('Ошибка покупки:', error);
      }
    }
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return {
          border: 'border-2 border-pink-400 shadow-pink-400/50',
          bg: 'bg-gradient-to-br from-pink-900/50 to-purple-900/50',
          text: 'text-pink-300',
          glow: 'shadow-2xl shadow-pink-400/30'
        };
      case 'legendary':
        return {
          border: 'border-2 border-yellow-400 shadow-yellow-400/50',
          bg: 'bg-gradient-to-br from-yellow-900/50 to-orange-900/50',
          text: 'text-yellow-300',
          glow: 'shadow-2xl shadow-yellow-400/30'
        };
      case 'epic':
        return {
          border: 'border-2 border-purple-400 shadow-purple-400/50',
          bg: 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50',
          text: 'text-purple-300',
          glow: 'shadow-xl shadow-purple-400/20'
        };
      case 'rare':
        return {
          border: 'border-2 border-blue-400 shadow-blue-400/50',
          bg: 'bg-gradient-to-br from-blue-900/50 to-cyan-900/50',
          text: 'text-blue-300',
          glow: 'shadow-lg shadow-blue-400/20'
        };
      default:
        return {
          border: 'border border-gray-400 shadow-gray-400/30',
          bg: 'bg-gradient-to-br from-gray-800/50 to-gray-900/50',
          text: 'text-gray-300',
          glow: 'shadow-md'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          {/* Профессиональная анимация загрузки */}
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-purple-400/30 rounded-full animate-spin">
              <div className="w-6 h-6 bg-purple-400 rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Загружаем магазин</h2>
          <p className="text-purple-300">Подготавливаем лучшие предложения...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Премиум хедер */}
      <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft size={20} />
              <span className="font-semibold">Назад</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                ПРЕМИУМ МАГАЗИН
              </h1>
              <p className="text-sm text-purple-300">Эксклюзивные предметы для настоящих игроков</p>
            </div>
            
            <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl border border-yellow-400/30">
              <Coins className="text-yellow-400 animate-pulse" size={24} />
              <span className="text-2xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Стильные категории */}
        <div className="flex space-x-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-3 px-6 py-4 rounded-2xl border transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? `bg-gradient-to-r ${category.gradient} border-white/30 text-white shadow-lg shadow-purple-500/25`
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <Icon size={20} />
                <span className="font-bold">{category.name}</span>
                {isActive && <Sparkles size={16} className="animate-pulse" />}
              </motion.button>
            );
          })}
        </div>

        {/* Контент магазина */}
        {selectedCategory === 'crypto' ? (
          /* Криптопакеты */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cryptoPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-6 bg-gradient-to-br ${pkg.gradient} rounded-3xl border border-white/20 shadow-2xl overflow-hidden group hover:scale-105 transition-transform duration-300`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                    ПОПУЛЯРНЫЙ
                  </div>
                )}
                {pkg.bestValue && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    ВЫГОДНО
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">{pkg.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                  <div className="text-4xl font-black text-white mb-2">
                    {pkg.coins.toLocaleString()} <span className="text-lg">монет</span>
                  </div>
                  {pkg.bonus && (
                    <div className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-sm font-bold mb-4">
                      +{pkg.bonus}% БОНУС
                    </div>
                  )}
                  <div className="text-3xl font-bold text-white mb-6">
                    ${pkg.price}
                  </div>
                  <button className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/30">
                    Купить сейчас
                  </button>
                </div>
                
                {/* Декоративные элементы */}
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Товары */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => {
              const styles = getRarityStyles(item.rarity);
              const isOwned = purchasedItems.includes(item.id);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative ${styles.bg} ${styles.border} ${styles.glow} rounded-3xl p-6 overflow-hidden group hover:scale-105 transition-all duration-300`}
                >
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col space-y-1">
                    {item.new && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                        НОВОЕ
                      </span>
                    )}
                    {item.popular && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        ТОП
                      </span>
                    )}
                    {item.discount && (
                      <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        -{item.discount}%
                      </span>
                    )}
                  </div>

                  {/* Rarity badge */}
                  <div className={`absolute top-3 right-3 ${styles.text} text-xs font-bold uppercase tracking-wider`}>
                    {item.rarity}
                  </div>

                  {/* Image placeholder */}
                  <div className="w-full h-32 bg-black/20 rounded-2xl mb-4 flex items-center justify-center border border-white/10">
                    <div className="text-4xl">
                      {item.category === 'skins' ? '🎨' : 
                       item.category === 'effects' ? '✨' : 
                       item.category === 'boosters' ? '⚡' : '🎁'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-purple-200 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Coins className="text-yellow-400" size={20} />
                        <span className="text-2xl font-bold text-yellow-400">
                          {item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-gray-400 line-through">
                            {item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Purchase button */}
                    {isOwned ? (
                      <button
                        disabled
                        className="w-full bg-green-500/20 text-green-300 font-bold py-3 px-4 rounded-2xl cursor-not-allowed border border-green-500/30"
                      >
                        ✓ В коллекции
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item.id, item.price)}
                        disabled={coins < item.price}
                        className={`w-full font-bold py-3 px-4 rounded-2xl transition-all duration-300 ${
                          coins >= item.price
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg'
                            : 'bg-gray-600/30 text-gray-400 cursor-not-allowed border border-gray-600/50'
                        }`}
                      >
                        {coins >= item.price ? 'Купить' : 'Недостаточно монет'}
                      </button>
                    )}
                  </div>

                  {/* Декоративные элементы */}
                  <div className="absolute -top-5 -right-5 w-10 h-10 bg-white/5 rounded-full blur-xl"></div>
                  <div className="absolute -bottom-5 -left-5 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl"></div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}