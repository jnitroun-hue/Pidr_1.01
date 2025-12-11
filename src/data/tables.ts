/**
 * 🎲 TABLE DATA
 * Данные всех доступных столов
 */

import { GameTable, TableCollection, TableShopCategory } from '@/types/tables';

export const GAME_TABLES: GameTable[] = [
  // COMMON TABLES
  {
    id: 'classic-green',
    name: 'Классический зеленый',
    description: 'Традиционный покерный стол с зеленым сукном',
    style: 'classic',
    rarity: 'common',
    price: 0,
    currency: 'coins',
    isUnlocked: true,
    isPurchased: true,
    isEquipped: true,
    stats: {
      luck: 0,
      prestige: 1,
      winBonus: 0
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'starter',
      tags: ['classic', 'free', 'starter']
    }
  },
  {
    id: 'wooden-tavern',
    name: 'Деревянный трактир',
    description: 'Уютный деревянный стол из старого трактира',
    style: 'classic',
    rarity: 'common',
    price: 1000,
    currency: 'coins',
    isUnlocked: true,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 2,
      prestige: 3,
      winBonus: 5
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'classic',
      tags: ['wood', 'tavern', 'cozy']
    }
  },

  // RARE TABLES
  {
    id: 'luxury-casino',
    name: 'Роскошное казино',
    description: 'Премиум стол с кожаной поверхностью и золотыми деталями',
    style: 'luxury',
    rarity: 'rare',
    price: 5000,
    currency: 'coins',
    isUnlocked: true,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 5,
      prestige: 10,
      winBonus: 15
    },
    effects: {
      particleEffects: true,
      soundEffects: ['luxury_ambient'],
      animations: ['gold_shimmer']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'luxury',
      tags: ['luxury', 'casino', 'premium', 'leather', 'gold']
    }
  },
  {
    id: 'neon-cyberpunk',
    name: 'Неоновый киберпанк',
    description: 'Футуристический стол с неоновой подсветкой',
    style: 'neon',
    rarity: 'rare',
    price: 50,
    currency: 'gems',
    isUnlocked: true,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 8,
      prestige: 12,
      winBonus: 20
    },
    effects: {
      particleEffects: true,
      soundEffects: ['cyberpunk_ambient', 'neon_hum'],
      animations: ['neon_pulse', 'hologram_effects']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'futuristic',
      tags: ['neon', 'cyberpunk', 'futuristic', 'glow']
    }
  },

  // EPIC TABLES
  {
    id: 'royal-palace',
    name: 'Королевский дворец',
    description: 'Стол достойный королей с драгоценными камнями',
    style: 'royal',
    rarity: 'epic',
    price: 15000,
    currency: 'coins',
    isUnlocked: false,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 12,
      prestige: 25,
      winBonus: 35
    },
    requirements: {
      level: 10,
      achievements: ['high_roller', 'win_streak_10']
    },
    effects: {
      particleEffects: true,
      soundEffects: ['royal_fanfare', 'crystal_chimes'],
      animations: ['crown_glow', 'jewel_sparkle', 'royal_aura']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'royal',
      tags: ['royal', 'palace', 'jewels', 'crown', 'epic']
    }
  },
  {
    id: 'diamond-elite',
    name: 'Алмазная элита',
    description: 'Сверкающий стол с алмазными инкрустациями',
    style: 'diamond',
    rarity: 'epic',
    price: 100,
    currency: 'gems',
    isUnlocked: false,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 15,
      prestige: 30,
      winBonus: 40
    },
    requirements: {
      level: 15,
      achievements: ['diamond_collector', 'millionaire']
    },
    effects: {
      particleEffects: true,
      soundEffects: ['diamond_chime', 'crystal_resonance'],
      animations: ['diamond_refraction', 'light_prism', 'sparkle_burst']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'premium',
      tags: ['diamond', 'elite', 'crystal', 'sparkle', 'epic']
    }
  },

  // LEGENDARY TABLES
  {
    id: 'space-station',
    name: 'Космическая станция',
    description: 'Стол на космической станции с видом на звезды',
    style: 'space',
    rarity: 'legendary',
    price: 500,
    currency: 'gems',
    isUnlocked: false,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 20,
      prestige: 50,
      winBonus: 60
    },
    requirements: {
      level: 25,
      achievements: ['space_explorer', 'cosmic_winner', 'stellar_streak']
    },
    effects: {
      particleEffects: true,
      soundEffects: ['space_ambient', 'stellar_wind', 'cosmic_hum'],
      animations: ['star_field', 'planet_rotation', 'cosmic_energy', 'warp_effect']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'sci-fi',
      tags: ['space', 'cosmic', 'stars', 'futuristic', 'legendary']
    }
  },

  // MYTHIC TABLES
  {
    id: 'dragons-lair',
    name: 'Логово дракона',
    description: 'Легендарный стол в сокровищнице древнего дракона',
    style: 'fantasy',
    rarity: 'mythic',
    price: 1000,
    currency: 'gems',
    isUnlocked: false,
    isPurchased: false,
    isEquipped: false,
    stats: {
      luck: 30,
      prestige: 100,
      winBonus: 100
    },
    requirements: {
      level: 50,
      achievements: ['dragon_slayer', 'mythic_collector', 'legend_status'],
      previousTables: ['royal-palace', 'diamond-elite', 'space-station']
    },
    effects: {
      particleEffects: true,
      soundEffects: ['dragon_roar', 'fire_crackle', 'treasure_jingle', 'magic_whispers'],
      animations: ['dragon_breath', 'fire_aura', 'treasure_glow', 'magic_runes', 'mythic_power']
    },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      category: 'mythic',
      tags: ['dragon', 'fantasy', 'treasure', 'magic', 'mythic', 'ultimate']
    }
  }
];

export const TABLE_COLLECTIONS: TableCollection[] = [
  {
    id: 'starter-collection',
    name: 'Коллекция новичка',
    description: 'Соберите все базовые столы',
    tables: ['classic-green', 'wooden-tavern'],
    reward: {
      type: 'coins',
      amount: 2000
    },
    isCompleted: false
  },
  {
    id: 'luxury-collection',
    name: 'Роскошная коллекция',
    description: 'Соберите все премиум столы',
    tables: ['luxury-casino', 'royal-palace', 'diamond-elite'],
    reward: {
      type: 'gems',
      amount: 50
    },
    isCompleted: false
  },
  {
    id: 'futuristic-collection',
    name: 'Футуристическая коллекция',
    description: 'Соберите все футуристические столы',
    tables: ['neon-cyberpunk', 'space-station'],
    reward: {
      type: 'table',
      itemId: 'time-machine'
    },
    isCompleted: false
  },
  {
    id: 'master-collection',
    name: 'Коллекция мастера',
    description: 'Соберите ВСЕ столы в игре',
    tables: GAME_TABLES.map(table => table.id),
    reward: {
      type: 'achievement',
      itemId: 'table_master'
    },
    isCompleted: false
  }
];

export const SHOP_CATEGORIES: TableShopCategory[] = [
  {
    id: 'featured',
    name: 'Рекомендуемые',
    icon: '⭐',
    description: 'Лучшие предложения этой недели',
    tables: ['luxury-casino', 'neon-cyberpunk', 'royal-palace'],
    isNew: true,
    discount: {
      percentage: 20,
      endDate: '2024-12-31T23:59:59Z'
    }
  },
  {
    id: 'classic',
    name: 'Классические',
    icon: '🎲',
    description: 'Традиционные игровые столы',
    tables: ['classic-green', 'wooden-tavern']
  },
  {
    id: 'luxury',
    name: 'Роскошные',
    icon: '💎',
    description: 'Премиум столы для VIP игроков',
    tables: ['luxury-casino', 'royal-palace', 'diamond-elite']
  },
  {
    id: 'futuristic',
    name: 'Футуристические',
    icon: '🚀',
    description: 'Столы из будущего',
    tables: ['neon-cyberpunk', 'space-station']
  },
  {
    id: 'mythic',
    name: 'Мифические',
    icon: '🐉',
    description: 'Легендарные столы для избранных',
    tables: ['dragons-lair'],
    isNew: true
  }
];

// Вспомогательные функции
export const getTableById = (id: string): GameTable | undefined => {
  return GAME_TABLES.find(table => table.id === id);
};

export const getTablesByRarity = (rarity: GameTable['rarity']): GameTable[] => {
  return GAME_TABLES.filter(table => table.rarity === rarity);
};

export const getTablesByCategory = (categoryId: string): GameTable[] => {
  const category = SHOP_CATEGORIES.find(cat => cat.id === categoryId);
  if (!category) return [];
  
  return category.tables.map(tableId => getTableById(tableId)).filter(Boolean) as GameTable[];
};

export const calculateTablePrice = (table: GameTable, hasDiscount: boolean = false): number => {
  let price = table.price;
  
  if (hasDiscount) {
    // Применяем скидку из категории featured
    const featuredCategory = SHOP_CATEGORIES.find(cat => cat.id === 'featured');
    if (featuredCategory?.discount && featuredCategory.tables.includes(table.id)) {
      price = Math.floor(price * (1 - featuredCategory.discount.percentage / 100));
    }
  }
  
  return price;
};
