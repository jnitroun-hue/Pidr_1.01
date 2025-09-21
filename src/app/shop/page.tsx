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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-500/30 rounded-full animate-spin">
              <div className="absolute top-0 left-1/2 w-4 h-4 bg-purple-500 rounded-full transform -translate-x-1/2"></div>
            </div>
            <ShoppingBag className="absolute inset-0 m-auto w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Loading Premium Store</h2>
            <p className="text-gray-400">Preparing exclusive content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white">
      {/* Ultra Premium Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-4xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Premium Store
              </h1>
              <p className="text-sm text-gray-400 mt-1">Exclusive items for elite players</p>
            </div>
            
            <div className="flex items-center space-x-4 px-6 py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Premium Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            
            return (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-6 rounded-3xl border transition-all duration-500 overflow-hidden group ${
                  isActive
                    ? `bg-gradient-to-br ${category.color} border-white/20 shadow-2xl`
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                </div>
                
                <div className="relative z-10 text-center space-y-3">
                  <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isActive ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{category.name}</h3>
                    <p className="text-xs text-white/70">{category.description}</p>
                  </div>
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Content Area */}
        {selectedCategory === 'crypto' ? (
          /* Crypto Packages */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {cryptoPackages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className={`relative p-8 rounded-3xl bg-gradient-to-br ${pkg.color} shadow-2xl border border-white/20 overflow-hidden group cursor-pointer`}
              >
                {/* Badges */}
                {pkg.popular && (
                  <div className="absolute -top-3 -right-3 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    POPULAR
                  </div>
                )}
                {pkg.bestValue && (
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    BEST VALUE
                  </div>
                )}
                
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 text-center space-y-6">
                  <div className="text-6xl animate-bounce">{pkg.icon}</div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                    <p className="text-white/80 text-sm">{pkg.description}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-4xl font-black text-white">
                      {pkg.coins.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/80">Premium Coins</div>
                  </div>
                  
                  {pkg.bonus && (
                    <div className="bg-green-400/20 border border-green-400/30 text-green-300 px-4 py-2 rounded-full text-sm font-bold">
                      +{pkg.bonus}% BONUS
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-white">${pkg.price}</div>
                    <button className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/30 group-hover:scale-105">
                      Purchase Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Premium Items Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence>
              {filteredItems.map((item, index) => {
                const rarity = getRarityConfig(item.rarity);
                const isOwned = purchasedItems.includes(item.id);
                const isHovered = hoveredItem === item.id;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -8 }}
                    onHoverStart={() => setHoveredItem(item.id)}
                    onHoverEnd={() => setHoveredItem(null)}
                    className={`relative p-8 rounded-3xl ${rarity.bg} ${rarity.glow} border-2 ${rarity.border} overflow-hidden group cursor-pointer transition-all duration-500`}
                  >
                    {/* Premium Badges */}
                    <div className="absolute top-4 left-4 flex flex-col space-y-2 z-20">
                      {item.new && (
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                          NEW
                        </span>
                      )}
                      {item.popular && (
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          POPULAR
                        </span>
                      )}
                      {item.limitedTime && (
                        <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                          LIMITED
                        </span>
                      )}
                      {item.discount && (
                        <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          -{item.discount}%
                        </span>
                      )}
                    </div>

                    {/* Rarity Badge */}
                    <div className={`absolute top-4 right-4 ${rarity.text} text-xs font-bold uppercase tracking-wider z-20`}>
                      {item.rarity}
                    </div>

                    {/* Background Effects */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${rarity.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Item Preview */}
                    <div className="relative z-10 space-y-6">
                      <div className="w-full h-40 bg-black/20 rounded-2xl border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all duration-500">
                        <div className="text-6xl group-hover:scale-110 transition-transform duration-500">
                          {item.category === 'skins' ? '🎨' : 
                           item.category === 'effects' ? '✨' : 
                           item.category === 'boosters' ? '⚡' : 
                           item.category === 'bundles' ? '🎁' : '💎'}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white group-hover:text-purple-200 transition-colors duration-300">
                            {item.name}
                          </h3>
                          <p className="text-gray-400 text-sm leading-relaxed mt-2">
                            {item.description}
                          </p>
                        </div>

                        {/* Price Section */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Coins className="text-yellow-400 w-6 h-6" />
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl font-bold text-yellow-400">
                                {item.price.toLocaleString()}
                              </span>
                              {item.originalPrice && (
                                <span className="text-lg text-gray-500 line-through">
                                  {item.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        {isOwned ? (
                          <button
                            disabled
                            className="w-full bg-green-500/20 text-green-300 font-bold py-4 px-6 rounded-2xl cursor-not-allowed border border-green-500/30 flex items-center justify-center space-x-2"
                          >
                            <Shield className="w-5 h-5" />
                            <span>Owned</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchase(item.id, item.price)}
                            disabled={coins < item.price}
                            className={`w-full font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                              coins >= item.price
                                ? `bg-gradient-to-r ${rarity.gradient} hover:scale-105 text-white shadow-lg hover:shadow-xl`
                                : 'bg-gray-600/30 text-gray-500 cursor-not-allowed border border-gray-600/50'
                            }`}
                          >
                            {coins >= item.price ? (
                              <>
                                <span>Purchase</span>
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                              </>
                            ) : (
                              <>
                                <span>Insufficient Coins</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hover Effects */}
                    {isHovered && (
                      <>
                        <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/30 rounded-full animate-ping"></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}