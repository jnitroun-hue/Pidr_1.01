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
    name: 'Золотая Классика',
    description: 'Простая золотая рамка с элегантным блеском',
    preview: '/avatars/frame_common_gold.svg',
    price: 1000,
    unlocked: false,
    rarity: 'common'
  },
  {
    id: 'frame_halloween',
    name: '🎃 Хэллоуин',
    description: 'Жуткая тыквенная рамка с оранжевым свечением и летучими мышами',
    preview: '/avatars/frame_halloween.svg',
    price: 5000,
    unlocked: false,
    rarity: 'rare'
  },
  {
    id: 'frame_newyear',
    name: '❄️ Новый Год',
    description: 'Ледяная рамка со снежинками и зимним волшебством',
    preview: '/avatars/frame_newyear.svg',
    price: 8000,
    unlocked: false,
    rarity: 'epic'
  },
  {
    id: 'frame_christmas',
    name: '🎄 Рождество',
    description: 'Золотая рамка с красными лентами, колокольчиками и праздничным декором',
    preview: '/avatars/frame_christmas.svg',
    price: 15000,
    unlocked: false,
    rarity: 'legendary'
  },
  {
    id: 'frame_valentine',
    name: '💖 День Влюблённых',
    description: 'Розовая алмазная рамка с сердечками и романтическими розами',
    preview: '/avatars/frame_valentine.svg',
    price: 25000,
    unlocked: false,
    rarity: 'mythic'
  },
  {
    id: 'frame_cyberpunk',
    name: '⚡ Киберпанк',
    description: 'Неоновая рамка со светящимися схемами и футуристическими технологиями',
    preview: '/avatars/frame_cyberpunk.svg',
    price: 35000,
    unlocked: false,
    rarity: 'legendary'
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

