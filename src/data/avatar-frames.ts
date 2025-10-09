// Данные рамок аватаров для магазина
export interface AvatarFrame {
  id: string;
  name: string;
  description: string;
  preview: string; // Путь к изображению
  price: number;
  unlocked: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

export const avatarFrames: AvatarFrame[] = [
  {
    id: 'default',
    name: 'Стандартная',
    description: 'Базовая рамка без украшений',
    preview: '⭕',
    price: 0,
    unlocked: true,
    rarity: 'common'
  },
  {
    id: 'frame_common_gold',
    name: 'Золотая Простая',
    description: 'Простая золотая рамка с легким блеском',
    preview: '/avatars/frame_common_gold.svg',
    price: 1000,
    unlocked: false,
    rarity: 'common'
  },
  {
    id: 'frame_uncommon_silver',
    name: 'Серебряный Гексагон',
    description: 'Серебряная шестиугольная рамка с синими кристаллами',
    preview: '/avatars/frame_uncommon_silver.svg',
    price: 5000,
    unlocked: false,
    rarity: 'uncommon'
  },
  {
    id: 'frame_rare_fire',
    name: 'Огненная Эпическая',
    description: 'Эпическая огненная рамка с пылающими углями',
    preview: '/avatars/frame_rare_fire.svg',
    price: 15000,
    unlocked: false,
    rarity: 'rare'
  },
  {
    id: 'frame_legendary_diamond',
    name: 'Легендарный Алмаз',
    description: 'Легендарная алмазная рамка с радужными искрами',
    preview: '/avatars/frame_legendary_diamond.svg',
    price: 35000,
    unlocked: false,
    rarity: 'legendary'
  },
  {
    id: 'frame_mythic_nature',
    name: 'Мифическая Природа',
    description: 'Мифическая природная рамка с космическими лозами',
    preview: '/avatars/frame_mythic_nature.svg',
    price: 50000,
    unlocked: false,
    rarity: 'mythic'
  }
];

// Функция для получения цвета редкости
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#9ca3af'; // Серый
    case 'uncommon': return '#10b981'; // Зеленый
    case 'rare': return '#3b82f6'; // Синий
    case 'epic': return '#a855f7'; // Фиолетовый
    case 'legendary': return '#f59e0b'; // Оранжевый
    case 'mythic': return '#ec4899'; // Розовый
    default: return '#9ca3af';
  }
}

// Функция для получения названия редкости на русском
export function getRarityName(rarity: string): string {
  switch (rarity) {
    case 'common': return 'Обычная';
    case 'uncommon': return 'Необычная';
    case 'rare': return 'Редкая';
    case 'epic': return 'Эпическая';
    case 'legendary': return 'Легендарная';
    case 'mythic': return 'Мифическая';
    default: return 'Неизвестная';
  }
}

