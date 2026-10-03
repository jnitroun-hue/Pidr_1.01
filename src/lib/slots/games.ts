export type SlotSymbol = {
  id: string;
  name: string;
  weight: number;
  /** Выплата за 3, 4 и 5 одинаковых. Для линий — множитель ставки на линию. */
  pays: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
};

export type SlotGame = {
  id: string;
  title: string;
  mood: string;
  volatility: 'средняя' | 'высокая' | 'очень высокая';
  reels: number;
  rows: number;
  mode: 'lines' | 'ways';
  /** Индексы рядов слева направо. Ряд 0 — верх. */
  lines: number[][];
  symbols: SlotSymbol[];
  /** Редкий множитель всей выигрышной суммы. 1 значит «множителя нет». */
  multipliers: { value: number; weight: number }[];
  maxWinMultiplier: number;
  accent: string;
  felt: string;
  bonus: {
    title: string;
    rule: string;
    kind: 'wild-reel' | 'rising' | 'premium-only' | 'tide' | 'siren';
  };
};

const LINES_20: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 0, 2, 0, 1],
];

const NO_MULTIPLIER = [{ value: 1, weight: 1 }];

export const SLOT_GAMES: SlotGame[] = [
  {
    id: 'golden-must',
    title: 'Золотой муст',
    mood: 'Яркий классический автомат: фрукты, камни и корона. Частые небольшие выигрыши.',
    volatility: 'средняя',
    reels: 5,
    rows: 3,
    mode: 'lines',
    lines: LINES_20,
    accent: '#f5c518',
    felt: '#3a2410',
    maxWinMultiplier: 2500,
    bonus: {
      kind: 'wild-reel',
      title: 'Золотой дождь',
      rule: 'В каждом бесплатном спине один случайный барабан целиком становится диким.',
    },
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'cherry', name: 'Вишня', weight: 46, pays: [5, 15, 40] },
      { id: 'lemon', name: 'Лимон', weight: 40, pays: [7, 20, 55] },
      { id: 'grape', name: 'Виноград', weight: 30, pays: [11, 30, 91] },
      { id: 'bell', name: 'Колокол', weight: 18, pays: [20, 61, 178] },
      { id: 'gem', name: 'Изумруд', weight: 12, pays: [36, 102, 305] },
      { id: 'crown', name: 'Корона', weight: 7, pays: [61, 201, 636] },
      { id: 'wild', name: 'Дикий', weight: 4, pays: [102, 305, 1018], wild: true },
      { id: 'scatter', name: 'Звезда', weight: 3, pays: [11, 40, 153], scatter: true },
    ],
  },
  {
    id: 'hex-vault',
    title: 'Сундук гекса',
    mood: 'Тёмный металлический автомат. Выигрыши реже, зато крупнее.',
    volatility: 'высокая',
    reels: 5,
    rows: 3,
    mode: 'lines',
    lines: LINES_20.slice(0, 10),
    accent: '#f97316',
    felt: '#1a120c',
    maxWinMultiplier: 5000,
    bonus: {
      kind: 'rising',
      title: 'Сундук открыт',
      rule: 'Множитель растёт со спина: x1, x2 и дальше до x5.',
    },
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'coin', name: 'Монета', weight: 50, pays: [3, 8, 18] },
      { id: 'dagger', name: 'Кинжал', weight: 36, pays: [6, 16, 44] },
      { id: 'skull', name: 'Череп', weight: 22, pays: [12, 34, 94] },
      { id: 'rune', name: 'Руна', weight: 12, pays: [25, 74, 218] },
      { id: 'chest', name: 'Сундук', weight: 6, pays: [46, 155, 496] },
      { id: 'wild', name: 'Гекс', weight: 3, pays: [78, 280, 930], wild: true },
      { id: 'scatter', name: 'Ключ', weight: 2, pays: [12, 46, 155], scatter: true },
    ],
  },
  {
    id: 'oak-fortune',
    title: 'Дубовый клад',
    mood: 'Лесной автомат со средним ритмом: листья, жёлуди и золотой дуб.',
    volatility: 'средняя',
    reels: 5,
    rows: 3,
    mode: 'lines',
    lines: LINES_20.slice(0, 15),
    accent: '#84cc16',
    felt: '#14240f',
    maxWinMultiplier: 3000,
    bonus: {
      kind: 'premium-only',
      title: 'Лунная поляна',
      rule: 'Листья и жёлуди уходят с барабанов, остаются старшие символы.',
    },
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'leaf', name: 'Лист', weight: 44, pays: [3, 10, 31] },
      { id: 'acorn', name: 'Жёлудь', weight: 34, pays: [5, 16, 45] },
      { id: 'mushroom', name: 'Гриб', weight: 24, pays: [8, 24, 73] },
      { id: 'owl', name: 'Сова', weight: 14, pays: [17, 48, 137] },
      { id: 'oak', name: 'Дуб', weight: 8, pays: [31, 94, 312] },
      { id: 'wild', name: 'Клад', weight: 4, pays: [62, 187, 624], wild: true },
      { id: 'scatter', name: 'Луна', weight: 3, pays: [8, 31, 120], scatter: true },
    ],
  },
  {
    id: 'neon-river',
    title: 'Неоновая река',
    mood: 'Спокойный неон. Выигрыш идёт путями: одинаковые символы на соседних барабанах слева направо.',
    volatility: 'высокая',
    reels: 5,
    rows: 4,
    mode: 'ways',
    lines: [],
    accent: '#22d3ee',
    felt: '#071824',
    maxWinMultiplier: 4000,
    bonus: {
      kind: 'tide',
      title: 'Прилив',
      rule: 'На каждом барабане в каждом спине появляется дикий символ.',
    },
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'drop', name: 'Капля', weight: 42, pays: [1, 3, 8] },
      { id: 'fish', name: 'Рыба', weight: 30, pays: [2, 6, 16] },
      { id: 'lantern', name: 'Фонарь', weight: 18, pays: [4, 12, 36] },
      { id: 'pearl', name: 'Жемчуг', weight: 10, pays: [8, 24, 80] },
      { id: 'wave', name: 'Волна', weight: 6, pays: [16, 50, 160] },
      { id: 'wild', name: 'Неон', weight: 3, pays: [24, 80, 280], wild: true },
      { id: 'scatter', name: 'Лотос', weight: 2, pays: [6, 20, 80], scatter: true },
    ],
  },
  {
    id: 'limitless-city',
    title: 'Город без лимита',
    mood: 'Самый резкий автомат. Иногда на выигрыш падает честный множитель x2–x50.',
    volatility: 'очень высокая',
    reels: 5,
    rows: 3,
    mode: 'lines',
    lines: LINES_20.slice(0, 10),
    accent: '#e11d48',
    felt: '#1a0610',
    maxWinMultiplier: 8000,
    bonus: {
      kind: 'siren',
      title: 'Ночная сирена',
      rule: 'Каждый выигрышный бесплатный спин получает множитель не ниже x2.',
    },
    multipliers: [
      { value: 1, weight: 900 },
      { value: 2, weight: 60 },
      { value: 3, weight: 24 },
      { value: 5, weight: 10 },
      { value: 10, weight: 4 },
      { value: 25, weight: 1 },
      { value: 50, weight: 1 },
    ],
    symbols: [
      { id: 'ticket', name: 'Билет', weight: 55, pays: [2, 3, 9] },
      { id: 'neon', name: 'Вывеска', weight: 34, pays: [3, 10, 26] },
      { id: 'car', name: 'Машина', weight: 18, pays: [9, 24, 69] },
      { id: 'vault', name: 'Сейф', weight: 8, pays: [19, 60, 189] },
      { id: 'wild', name: 'Город', weight: 3, pays: [34, 120, 430], wild: true },
      { id: 'scatter', name: 'Сирена', weight: 2, pays: [9, 34, 129], scatter: true },
    ],
  },
];

export function getSlotGame(id: string): SlotGame | undefined {
  return SLOT_GAMES.find((game) => game.id === id);
}

export const COIN_BETS = [10, 25, 50, 100, 250, 500, 1000];
/** 1 единица = 0.01 GRAM. 10 единиц = 0.10 GRAM. */
export const GRAM_UNIT_BETS = [10, 25, 50, 100, 250, 500];
export const GRAM_UNITS_PER_COIN = 10;
export const DEMO_START_CHIPS = 2000;
