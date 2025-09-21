'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Wand2, Zap, Gift, Coins, ShoppingBag, Star, Crown, Flame, Wallet } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import WalletManager from '../../components/WalletManager';
import CryptoPayment from '../../components/CryptoPayment';

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [coins, setCoins] = useState(1500);
  const [purchasedItems, setPurchasedItems] = useState<string[]>(['golden-skin']);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'ВСЕ', icon: ShoppingBag },
    { id: 'skins', name: 'СКИНЫ', icon: Palette },
    { id: 'effects', name: 'ЭФФЕКТЫ', icon: Wand2 },
    { id: 'boosters', name: 'БУСТЕРЫ', icon: Zap },
    { id: 'wallet', name: 'КОШЕЛЕК', icon: Wallet },
  ];

  useEffect(() => {
    // Загружаем текущий баланс из БД через API
    const loadUserBalance = async () => {
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
        console.error('Ошибка загрузки баланса:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserBalance();

    // Слушаем обновления баланса монет
    const handleCoinsUpdate = (event: CustomEvent) => {
      setCoins(event.detail.newBalance);
    };

    window.addEventListener('coinsUpdated', handleCoinsUpdate as EventListener);

    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    };
  }, []);

  const shopItems = [
    // Скины
    { id: 'golden-skin', name: 'Золотая колода', description: 'Элитные золотые карты', price: 500, category: 'skins', rarity: 'legendary', icon: '👑' },
    { id: 'neon-skin', name: 'Неоновая колода', description: 'Светящиеся неоновые карты', price: 300, category: 'skins', rarity: 'epic', icon: '⚡' },
    { id: 'classic-skin', name: 'Классическая колода', description: 'Традиционные карты', price: 100, category: 'skins', rarity: 'common', icon: '🃏' },
    
    // Эффекты
    { id: 'sparkle-effect', name: 'Эффект искр', description: 'Искры при победе', price: 200, category: 'effects', rarity: 'rare', icon: '✨' },
    { id: 'fire-effect', name: 'Огненный эффект', description: 'Пламя вокруг карт', price: 400, category: 'effects', rarity: 'epic', icon: '🔥' },
    { id: 'ice-effect', name: 'Ледяной эффект', description: 'Ледяные кристаллы', price: 350, category: 'effects', rarity: 'epic', icon: '❄️' },
    
    // Бустеры
    { id: 'coin-booster', name: 'Удваиватель монет', description: 'x2 монеты за игру (1 час)', price: 150, category: 'boosters', rarity: 'common', icon: '💰' },
    { id: 'xp-booster', name: 'Ускоритель опыта', description: 'x2 опыта за игру (1 час)', price: 200, category: 'boosters', rarity: 'rare', icon: '📈' },
    { id: 'luck-booster', name: 'Талисман удачи', description: 'Повышенный шанс победы (30 мин)', price: 300, category: 'boosters', rarity: 'epic', icon: '🍀' },
  ];

  const coinPackages = [
    { id: 'small', name: 'Малый пакет', coins: 1000, price: 1, icon: '🪙' },
    { id: 'medium', name: 'Средний пакет', coins: 2500, price: 2, icon: '💰' },
    { id: 'large', name: 'Большой пакет', coins: 5000, price: 4, icon: '💎' },
    { id: 'mega', name: 'Мега пакет', coins: 12000, price: 8, icon: '👑' },
    { id: 'ultimate', name: 'Ультимативный', coins: 30000, price: 15, icon: '🔥' },
  ];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  const handlePurchase = async (itemId: string, price: number) => {
    if (coins >= price && !purchasedItems.includes(itemId)) {
      try {
        // Обновляем баланс в БД
        const response = await fetch('/api/shop/purchase', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ itemId, price })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCoins(data.newBalance);
            setPurchasedItems(prev => [...prev, itemId]);

            // Уведомляем о покупке
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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-indigo-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Загружаем магазин...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={20} />
            <span>Назад</span>
          </button>
          
          <h1 className="text-2xl font-bold text-white">Магазин</h1>
          
          <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
            <Coins className="text-yellow-400" size={20} />
            <span className="text-yellow-400 font-bold">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                    : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                }`}
              >
                <Icon size={18} />
                <span className="font-semibold">{category.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {selectedCategory === 'wallet' ? (
          <div className="space-y-6">
            <CryptoPayment />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coinPackages.map((coinPackage) => (
                <motion.div
                  key={coinPackage.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{coinPackage.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{coinPackage.name}</h3>
                    <div className="text-yellow-400 font-bold text-lg mb-4">
                      {coinPackage.coins.toLocaleString()} монет
                    </div>
                    <div className="text-green-400 font-bold text-xl mb-4">
                      ${coinPackage.price} USDT
                    </div>
                    <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all">
                      Купить
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 hover:bg-white/20 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRarityColor(item.rarity)} text-white mb-3`}>
                    {item.rarity.toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-yellow-400 font-bold text-lg">
                    <Coins size={20} />
                    <span>{item.price.toLocaleString()}</span>
                  </div>
                  
                  {purchasedItems.includes(item.id) ? (
                    <button
                      disabled
                      className="w-full bg-green-500/30 text-green-300 font-bold py-3 px-6 rounded-lg cursor-not-allowed"
                    >
                      ✓ Куплено
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item.id, item.price)}
                      disabled={coins < item.price}
                      className={`w-full font-bold py-3 px-6 rounded-lg transition-all ${
                        coins >= item.price
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                          : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {coins >= item.price ? 'Купить' : 'Недостаточно монет'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}