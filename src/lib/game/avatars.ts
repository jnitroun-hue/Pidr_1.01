// Генератор аватаров и имен для игроков

// Списки имен для рандомной генерации
export const MALE_NAMES = [
  'Александр', 'Михаил', 'Максим', 'Артём', 'Даниил', 'Иван', 'Дмитрий', 
  'Никита', 'Егор', 'Кирилл', 'Андрей', 'Алексей', 'Илья', 'Роман', 'Сергей',
  'Владимир', 'Ярослав', 'Тимофей', 'Арсений', 'Денис', 'Павел', 'Глеб',
  'Богдан', 'Марк', 'Давид', 'Матвей', 'Захар', 'Виктор', 'Степан', 'Лев'
];

export const FEMALE_NAMES = [
  'София', 'Мария', 'Анна', 'Алиса', 'Виктория', 'Полина', 'Варвара',
  'Елизавета', 'Александра', 'Екатерина', 'Ксения', 'Арина', 'Вероника',
  'Валерия', 'Милана', 'Ева', 'Злата', 'Ульяна', 'Кира', 'Вера', 'Маргарита',
  'Таисия', 'Алёна', 'Дарья', 'Диана', 'Юлия', 'Ольга', 'Эмилия', 'Камилла'
];

export const NICKNAMES = [
  'ProGamer', 'Shadow', 'Phoenix', 'Thunder', 'Ninja', 'Dragon', 'Wolf',
  'Eagle', 'Tiger', 'Lion', 'Hawk', 'Raven', 'Storm', 'Blaze', 'Frost',
  'Viper', 'Ghost', 'Phantom', 'Warrior', 'Knight', 'Wizard', 'Hunter',
  'Ace', 'King', 'Queen', 'Joker', 'Lucky', 'Flash', 'Turbo', 'Neo'
];

// Генерация SVG аватара с инициалами и цветом
export function generateAvatar(name: string, seed: number = 0): string {
  // Цвета для фона аватара
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#FF6B9D', '#C44569', '#66D9EF', '#AE81FF', '#A8E6CF', '#FFD3B6'
  ];
  
  // Выбираем цвет на основе имени
  const colorIndex = (name.charCodeAt(0) + seed) % colors.length;
  const bgColor = colors[colorIndex];
  
  // Получаем инициалы
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Создаем SVG data URL
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${bgColor}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `;
  
  // Конвертируем в data URL (используем encodeURIComponent для поддержки кириллицы)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Генерация случайного имени
export function generateRandomName(isBot: boolean = true, seed: number = 0): string {
  if (!isBot) return 'Вы';
  
  const allNames = [...MALE_NAMES, ...FEMALE_NAMES, ...NICKNAMES];
  const index = Math.floor(Math.random() * allNames.length);
  const name = allNames[index];
  
  // Иногда добавляем номер к имени для уникальности
  if (Math.random() > 0.7) {
    return `${name}${Math.floor(Math.random() * 99) + 1}`;
  }
  
  return name;
}

// Генерация набора уникальных имен для игры
export function generatePlayerNames(count: number, includeUser: boolean = true): string[] {
  const names: string[] = [];
  const usedNames = new Set<string>();
  
  if (includeUser) {
    names.push('Вы');
    count--;
  }
  
  while (names.length < count + (includeUser ? 1 : 0)) {
    const name = generateRandomName(true, names.length);
    if (!usedNames.has(name)) {
      usedNames.add(name);
      names.push(name);
    }
  }
  
  return names;
}

// Информация об игроке
export interface PlayerInfo {
  id: number;
  name: string;
  avatar: string;
  isBot: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Создание игроков для игры
export function createPlayers(count: number, userPosition: number = 0): PlayerInfo[] {
  const names = generatePlayerNames(count, true);
  const players: PlayerInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    const isUser = i === userPosition;
    const name = isUser ? 'Вы' : names[i] || `Игрок ${i + 1}`;
    
    players.push({
      id: i,
      name,
      avatar: generateAvatar(name, i),
      isBot: !isUser,
      difficulty: isUser ? undefined : ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard'
    });
  }
  
  return players;
}
