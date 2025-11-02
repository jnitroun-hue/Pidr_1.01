/**
 * 🎲 TYPES FOR TABLE SYSTEM
 * Типы для системы столов
 */

export interface GameTable {
  id: string;
  name: string;
  description: string;
  style: 'luxury' | 'neon' | 'classic' | 'royal' | 'diamond' | 'space' | 'forest' | 'fantasy';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  price: number;
  currency: 'coins' | 'gems' | 'premium';
  imageUrl?: string;
  previewUrl?: string;
  isUnlocked: boolean;
  isPurchased: boolean;
  isEquipped: boolean;
  stats?: {
    luck: number;
    prestige: number;
    winBonus: number;
  };
  requirements?: {
    level?: number;
    achievements?: string[];
    previousTables?: string[];
  };
  effects?: {
    particleEffects?: boolean;
    soundEffects?: string[];
    animations?: string[];
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    category: string;
    tags: string[];
  };
}

export interface TableCollection {
  id: string;
  name: string;
  description: string;
  tables: string[]; // table IDs
  reward?: {
    type: 'coins' | 'gems' | 'table' | 'achievement';
    amount?: number;
    itemId?: string;
  };
  isCompleted: boolean;
}

export interface UserTableInventory {
  userId: string;
  ownedTables: string[]; // table IDs
  equippedTable: string; // current table ID
  favoritesTables: string[]; // favorite table IDs
  collections: {
    [collectionId: string]: {
      progress: number;
      isCompleted: boolean;
      claimedReward: boolean;
    };
  };
}

export interface TableShopCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  tables: string[]; // table IDs
  isNew?: boolean;
  discount?: {
    percentage: number;
    endDate: string;
  };
}

export interface TablePurchaseResult {
  success: boolean;
  message: string;
  table?: GameTable;
  newBalance?: {
    coins: number;
    gems: number;
  };
  unlockedAchievements?: string[];
}
