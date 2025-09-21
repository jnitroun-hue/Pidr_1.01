'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Wand2, Zap, Gift, Coins, ShoppingBag, Star, Crown, Flame, Wallet } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import WalletManager from '../../components/WalletManager';

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [coins, setCoins] = useState(1500);
  const [purchasedItems, setPurchasedItems] = useState<string[]>(['golden-skin']);

  const categories = [
    { id: 'all', name: 'ВСЕ', icon: ShoppingBag },
    { id: 'skins', name: 'СКИНЫ', icon: Palette },
    { id: 'effects', name: 'ЭФФЕКТЫ', icon: Wand2 },
    { id: 'boosters', name: 'БУСТЕРЫ', icon: Zap },
    { id: 'wallet', name: 'КОШЕЛЕК', icon: Wallet },
  ];

  useEffect(() => {
    // Слушаем обновления баланса монет
    const handleCoinsUpdate = (event: CustomEvent) => {
      setCoins(event.detail.newBalance);
    };

    window.addEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    
    // Загружаем текущий баланс из localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.coins) {
      setCoins(user.coins);
    }

    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    };
  }, []);

  const shopItems = {
    skins: [
      { id: 'golden-skin', name: 'Золотой Профиль', description: 'Эксклюзивный золотой скин для вашего профиля', price: 500, icon: Crown, rarity: 'legendary' },
      { id: 'diamond-skin', name: 'Алмазный Блеск', description: 'Переливающийся алмазный эффект', price: 750, icon: Star, rarity: 'epic' },
      { id: 'fire-skin', name: 'Огненная Аура', description: 'Пылающий эффект вокруг аватара', price: 400, icon: Flame, rarity: 'rare' },
    ],
    effects: [
      { id: 'rainbow-trail', name: 'Радужный След', description: 'Оставляйте радужный след при движении', price: 300, icon: Wand2, rarity: 'epic' },
      { id: 'star-burst', name: 'Взрыв Звезд', description: 'Эффект взрыва звезд при победе', price: 250, icon: Star, rarity: 'rare' },
      { id: 'magic-aura', name: 'Магическая Аура', description: 'Мистическое свечение вокруг карт', price: 350, icon: Wand2, rarity: 'epic' },
    ],
    boosters: [
      { id: 'exp-booster', name: 'Ускоритель Опыта', description: 'x2 опыта на следующие 5 игр', price: 200, icon: Zap, rarity: 'common' },
      { id: 'coin-booster', name: 'Удвоитель Монет', description: 'x2 монеты за победы в течение 1 часа', price: 150, icon: Coins, rarity: 'common' },
      { id: 'lucky-charm', name: 'Талисман Удачи', description: '+20% шанс получить редкие награды', price: 300, icon: Star, rarity: 'rare' },
    ],
  };

  const getAllItems = () => {
    return [...shopItems.skins, ...shopItems.effects, ...shopItems.boosters];
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return getAllItems();
    return shopItems[selectedCategory as keyof typeof shopItems] || [];
  };

  const handlePurchase = (itemId: string, price: number) => {
    if (coins >= price && !purchasedItems.includes(itemId)) {
      setCoins(prev => prev - price);
      setPurchasedItems(prev => [...prev, itemId]);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      default: return '#22c55e';
    }
  };

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">МАГАЗИН</span>
          <div className="shop-balance">
            <Coins className="balance-icon" />
            <span className="balance-amount">{coins}</span>
          </div>
        </div>

        {/* Categories */}
        <motion.div 
          className="shop-categories"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="categories-grid">
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <motion.button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconComponent className="category-icon" />
                  <span className="category-name">{category.name}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Items Grid */}
        {selectedCategory !== 'wallet' && (
          <motion.div 
            className="shop-items-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="shop-items-grid">
              {getFilteredItems().map((item, index) => {
              const IconComponent = item.icon;
              const isPurchased = purchasedItems.includes(item.id);
              const canAfford = coins >= item.price;
              
              return (
                <motion.div
                  key={item.id}
                  className={`shop-item-card ${isPurchased ? 'purchased' : ''} ${item.rarity}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <div className="item-header" style={{ background: `linear-gradient(135deg, ${getRarityColor(item.rarity)}20, ${getRarityColor(item.rarity)}10)` }}>
                    <div className="item-icon-container" style={{ background: `linear-gradient(135deg, ${getRarityColor(item.rarity)}, ${getRarityColor(item.rarity)}80)` }}>
                      <IconComponent className="item-icon" />
                    </div>
                    <div className={`rarity-badge ${item.rarity}`}>
                      {item.rarity.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="item-content">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-description">{item.description}</p>
                    
                    <div className="item-footer">
                      <div className="item-price">
                        <Coins className="price-icon" />
                        <span className="price-value">{item.price}</span>
                      </div>
                      
                      <motion.button
                        className={`purchase-btn ${isPurchased ? 'purchased' : canAfford ? 'available' : 'disabled'}`}
                        onClick={() => handlePurchase(item.id, item.price)}
                        disabled={isPurchased || !canAfford}
                        whileHover={!isPurchased && canAfford ? { scale: 1.05 } : {}}
                        whileTap={!isPurchased && canAfford ? { scale: 0.95 } : {}}
                      >
                        {isPurchased ? 'КУПЛЕНО' : canAfford ? 'КУПИТЬ' : 'НЕ ХВАТАЕТ МОНЕТ'}
                      </motion.button>
                    </div>
                  </div>
                  
                  {isPurchased && (
                    <div className="purchased-overlay">
                      <Star className="purchased-icon" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            </div>
          </motion.div>
        )}

        {/* Wallet Section */}
        {selectedCategory === 'wallet' && (
          <motion.div 
            className="wallet-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ padding: '0 20px', marginBottom: '100px' }}
          >
            <WalletManager showExchange={true} onCoinsAdded={(amount) => setCoins(prev => prev + amount)} />
          </motion.div>
        )}

        {/* Special Offers */}
        {selectedCategory !== 'wallet' && (
          <motion.div 
            className="special-offers-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
          <h3 className="offers-title">
            <Gift className="offers-icon" />
            СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ
          </h3>
          
          <div className="offers-grid">
            <motion.div 
              className="offer-card featured"
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="offer-badge">-50%</div>
              <div className="offer-header">
                <div className="offer-icon-container">
                  <Gift className="offer-icon" />
                </div>
                <div className="offer-info">
                  <h4 className="offer-name">Набор Новичка</h4>
                  <p className="offer-description">3 скина + 2 эффекта + 1000 монет</p>
                </div>
              </div>
              
              <div className="offer-pricing">
                <span className="original-price">2000</span>
                <div className="current-price">
                  <Coins className="price-icon" />
                  <span>1000</span>
                </div>
              </div>
              
              <motion.button 
                className="offer-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                КУПИТЬ НАБОР
              </motion.button>
            </motion.div>
          </div>
          </motion.div>
        )}

        <BottomNav />
      </div>
    </div>
  );
} 