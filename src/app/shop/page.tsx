'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Star, Sparkles, Zap, Gift, Crown, Palette, Wand2, ShoppingBag, Wallet, Plus, TrendingUp, Award, Flame, Diamond, Shield } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: 'featured' | 'skins' | 'effects' | 'boosters' | 'bundles' | 'crypto';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image: string;
  owned?: boolean;
  discount?: number;
  featured?: boolean;
  new?: boolean;
  popular?: boolean;
  limitedTime?: boolean;
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
  color: string;
  description: string;
}

export default function UltraPremiumShop() {
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const [coins, setCoins] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<string[]>(['golden-skin']);

  // Ультра-премиум категории
  const categories = [
    { 
      id: 'featured', 
      name: 'Featured', 
      icon: Star, 
      color: 'from-yellow-400 via-orange-400 to-red-500',
      description: 'Handpicked exclusives'
    },
    { 
      id: 'skins', 
      name: 'Skins', 
      icon: Palette, 
      color: 'from-purple-400 via-pink-400 to-rose-500',
      description: 'Visual masterpieces'
    },
    { 
      id: 'effects', 
      name: 'Effects', 
      icon: Wand2, 
      color: 'from-blue-400 via-cyan-400 to-teal-500',
      description: 'Magical powers'
    },
    { 
      id: 'boosters', 
      name: 'Boosters', 
      icon: Zap, 
      color: 'from-green-400 via-emerald-400 to-lime-500',
      description: 'Performance enhancers'
    },
    { 
      id: 'bundles', 
      name: 'Bundles', 
      icon: Gift, 
      color: 'from-indigo-400 via-purple-400 to-pink-500',
      description: 'Value collections'
    },
    { 
      id: 'crypto', 
      name: 'Currency', 
      icon: Wallet, 
      color: 'from-amber-400 via-yellow-400 to-orange-500',
      description: 'Premium coins'
    },
  ];

  // Премиум товары с реальными описаниями
  const shopItems: ShopItem[] = [
    {
      id: 'mythic-royal',
      name: 'Royal Ascendancy',
      description: 'Legendary collection featuring golden animations, particle effects, and exclusive victory celebrations',
      price: 2500,
      originalPrice: 3500,
      category: 'featured',
      rarity: 'mythic',
      image: '/shop/mythic-royal.webp',
      discount: 30,
      featured: true,
      new: true,
      limitedTime: true
    },
    {
      id: 'diamond-prestige',
      name: 'Diamond Prestige',
      description: 'Crystalline card designs with holographic effects and premium sound design',
      price: 1800,
      category: 'featured',
      rarity: 'legendary',
      image: '/shop/diamond-prestige.webp',
      featured: true,
      popular: true
    },
    {
      id: 'neon-cyberpunk',
      name: 'Cyberpunk 2077',
      description: 'Futuristic neon aesthetics with glitch effects and electronic soundtracks',
      price: 1200,
      category: 'skins',
      rarity: 'epic',
      image: '/shop/cyberpunk.webp',
      new: true
    },
    {
      id: 'phoenix-flames',
      name: 'Phoenix Rising',
      description: 'Majestic fire effects with wing animations and epic victory sequences',
      price: 1400,
      category: 'effects',
      rarity: 'legendary',
      image: '/shop/phoenix.webp',
      popular: true
    },
    {
      id: 'quantum-boost',
      name: 'Quantum Accelerator',
      description: '5x coin multiplier with particle effects and time distortion visuals',
      price: 800,
      category: 'boosters',
      rarity: 'epic',
      image: '/shop/quantum.webp'
    },
    {
      id: 'ultimate-collection',
      name: 'Ultimate Collection',
      description: 'Complete premium package with all skins, effects, and exclusive content',
      price: 4999,
      originalPrice: 7500,
      category: 'bundles',
      rarity: 'mythic',
      image: '/shop/ultimate.webp',
      discount: 35,
      limitedTime: true
    }
  ];

  // Премиум крипто-пакеты
  const cryptoPackages: CryptoPackage[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      coins: 1000,
      price: 0.99,
      icon: '💫',
      color: 'from-slate-400 to-slate-600',
      description: 'Perfect for beginners'
    },
    {
      id: 'gamer',
      name: 'Gamer Pack',
      coins: 2500,
      price: 1.99,
      bonus: 15,
      icon: '🎮',
      color: 'from-blue-400 to-blue-600',
      description: 'Most popular choice'
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      coins: 6000,
      price: 3.99,
      bonus: 25,
      bestValue: true,
      icon: '💎',
      color: 'from-purple-400 to-purple-600',
      description: 'Best value for money'
    },
    {
      id: 'elite',
      name: 'Elite Pack',
      coins: 12000,
      price: 6.99,
      bonus: 35,
      popular: true,
      icon: '👑',
      color: 'from-yellow-400 to-orange-500',
      description: 'For serious players'
    },
    {
      id: 'legendary',
      name: 'Legendary',
      coins: 30000,
      price: 14.99,
      bonus: 50,
      icon: '🔥',
      color: 'from-red-400 to-pink-500',
      description: 'Ultimate experience'
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
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

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
        console.error('Purchase error:', error);
      }
    }
  };

  const getRarityConfig = (rarity: string) => {
    const configs = {
      mythic: {
        gradient: 'from-pink-500 via-purple-500 to-indigo-500',
        glow: 'shadow-2xl shadow-pink-500/50',
        border: 'border-pink-400/50',
        text: 'text-pink-300',
        bg: 'bg-gradient-to-br from-pink-900/20 to-purple-900/20'
      },
      legendary: {
        gradient: 'from-yellow-500 via-orange-500 to-red-500',
        glow: 'shadow-2xl shadow-yellow-500/50',
        border: 'border-yellow-400/50',
        text: 'text-yellow-300',
        bg: 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20'
      },
      epic: {
        gradient: 'from-purple-500 via-indigo-500 to-blue-500',
        glow: 'shadow-xl shadow-purple-500/30',
        border: 'border-purple-400/50',
        text: 'text-purple-300',
        bg: 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20'
      },
      rare: {
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        glow: 'shadow-lg shadow-blue-500/20',
        border: 'border-blue-400/50',
        text: 'text-blue-300',
        bg: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20'
      },
      common: {
        gradient: 'from-gray-500 to-gray-600',
        glow: 'shadow-md shadow-gray-500/10',
        border: 'border-gray-400/30',
        text: 'text-gray-300',
        bg: 'bg-gradient-to-br from-gray-900/20 to-gray-800/20'
      }
    };
    return configs[rarity as keyof typeof configs] || configs.common;
  };

  if (loading) {
    return (
      <div className="main-menu-container">
        <div className="main-menu-inner">
          <div className="text-center space-y-8" style={{ marginTop: '200px' }}>
            <div className="relative">
              <div className="w-20 h-20 border-4 border-purple-500/30 rounded-full animate-spin mx-auto">
                <div className="absolute top-0 left-1/2 w-4 h-4 bg-purple-500 rounded-full transform -translate-x-1/2"></div>
              </div>
              <ShoppingBag className="absolute inset-0 m-auto w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Загрузка магазина</h2>
              <p className="text-gray-400">Подготавливаем эксклюзивные товары...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="balance-amount">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Shop Categories */}
        <div style={{ width: '100%', margin: '20px 0' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            padding: '0 20px'
          }}>
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  onClick={() => {
                    console.log('Выбрана категория:', category.id);
                    setSelectedCategory(category.id);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: isActive ? 
                      'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)' : 
                      'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(255, 215, 0, 0.6)' : 'rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    boxShadow: isActive ? 
                      '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.2)' : 
                      '0 4px 20px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: 'white'
                  }}
                >
                  <Icon style={{ 
                    fontSize: '1.2rem', 
                    color: isActive ? '#ffd700' : '#22c55e',
                    transition: 'all 0.3s ease'
                  }} />
                  <span style={{ 
                    color: isActive ? '#ffd700' : '#e2e8f0',
                    fontSize: '0.7rem', 
                    fontWeight: '600', 
                    letterSpacing: '0.5px',
                    transition: 'color 0.3s ease'
                  }}>
                    {category.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Special Offers Section */}
        {selectedCategory === 'crypto' && (
          <div className="special-offers-section">
            <div className="offers-title">
              <Sparkles className="offers-icon" />
              <span>СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ</span>
            </div>
            <div className="offers-grid">
              {cryptoPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className={`offer-card ${pkg.popular ? 'featured' : ''}`}
                >
                  {pkg.popular && (
                    <div className="offer-badge">ПОПУЛЯРНЫЙ</div>
                  )}
                  {pkg.bestValue && (
                    <div className="offer-badge">ЛУЧШАЯ ЦЕНА</div>
                  )}
                  
                  <div className="offer-header">
                    <div className="offer-icon-container">
                      <span className="offer-icon">{pkg.icon}</span>
                    </div>
                    <div className="offer-info">
                      <h3 className="offer-name">{pkg.name}</h3>
                      <p className="offer-description">{pkg.description}</p>
                    </div>
                  </div>
                  
                  <div className="offer-pricing">
                    <div className="current-price">
                      <Coins className="price-icon" />
                      <span>{pkg.coins.toLocaleString()}</span>
                    </div>
                    <div className="text-2xl font-bold text-white">${pkg.price}</div>
                  </div>
                  
                  {pkg.bonus && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22c55e',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      textAlign: 'center' as const,
                      margin: '16px 0'
                    }}>
                      +{pkg.bonus}% БОНУС
                    </div>
                  )}
                  
                  <button className="offer-btn">
                    Купить сейчас
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Shop Items Section */}
        {selectedCategory !== 'crypto' && (
          <div className="shop-items-section">
            <div className="shop-items-grid">
              <AnimatePresence>
                {filteredItems.map((item, index) => {
                  const isOwned = purchasedItems.includes(item.id);
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className={`shop-item-card ${item.rarity} ${isOwned ? 'purchased' : ''}`}
                    >
                      {/* Item Header */}
                      <div className="item-header">
                        <div className={`item-icon-container ${item.rarity}`} style={{
                          background: item.rarity === 'legendary' ? 'linear-gradient(135deg, #ffd700, #f59e0b)' :
                                     item.rarity === 'epic' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' :
                                     item.rarity === 'rare' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' :
                                     item.rarity === 'mythic' ? 'linear-gradient(135deg, #ec4899, #be185d)' :
                                     'linear-gradient(135deg, #22c55e, #16a34a)'
                        }}>
                          <div className="item-icon">
                            {item.category === 'skins' ? '🎨' : 
                             item.category === 'effects' ? '✨' : 
                             item.category === 'boosters' ? '⚡' : 
                             item.category === 'bundles' ? '🎁' : '💎'}
                          </div>
                        </div>
                        <div className={`rarity-badge ${item.rarity}`}>
                          {item.rarity.toUpperCase()}
                        </div>
                      </div>

                      {/* Item Content */}
                      <div className="item-content">
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-description">{item.description}</p>
                        
                        <div className="item-footer">
                          <div className="item-price">
                            <Coins className="price-icon" />
                            <span className="price-value">{item.price.toLocaleString()}</span>
                            {item.originalPrice && (
                              <span className="text-sm text-gray-500 line-through ml-2">
                                {item.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          {isOwned ? (
                            <button className="purchase-btn purchased">
                              Куплено
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePurchase(item.id, item.price)}
                              disabled={coins < item.price}
                              className={`purchase-btn ${coins >= item.price ? 'available' : 'disabled'}`}
                            >
                              {coins >= item.price ? 'Купить' : 'Недостаточно'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Purchased Overlay */}
                      {isOwned && (
                        <div className="purchased-overlay">
                          <Shield className="purchased-icon" />
                        </div>
                      )}

                      {/* Item Badges */}
                      {(item.new || item.popular || item.limitedTime || item.discount) && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          {item.new && (
                            <span className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                              НОВОЕ
                            </span>
                          )}
                          {item.popular && (
                            <span className="bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                              ТОП
                            </span>
                          )}
                          {item.limitedTime && (
                            <span className="bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                              ЛИМИТ
                            </span>
                          )}
                          {item.discount && (
                            <span className="bg-purple-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                              -{item.discount}%
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
        <BottomNav />
      </div>
    </div>
  );
}