export type SlotSymbol = {
  id: string;
  name: string;
  weight: number;
  /**
   * Выплата по трём порогам.
   * lines / both-ways: 3, 4, 5 в линии, множитель ставки на линию.
   * ways: 3, 4, 5 барабанов, множитель ставки на путь (ставка / WAYS_DIVISOR).
   * scatter-pays: 8–9, 10–11, 12+ символов где угодно, множитель всей ставки.
   * cluster: 5–7, 8–11, 12+ соединённых символов, множитель всей ставки.
   */
  pays: [number, number, number];
  wild?: boolean;
  scatter?: boolean;
  /** Дикий символ с множителем линии. */
  multiplier?: number;
  /** Монета Hold & Win: не платит по линиям, несёт номинал. */
  bonusCoin?: boolean;
  /** Шар-множитель для scatter-pays: не платит сам, умножает выигрыш каскада. */
  orb?: boolean;
  /** Мистический символ: перед подсчётом превращается в один общий символ. */
  mystery?: boolean;
  /** Выпадает только в бонусной игре. */
  bonusOnly?: boolean;
};

export type Mechanic = 'lines' | 'both-ways' | 'ways' | 'scatter-pays' | 'cluster';

export type BonusKind =
  | 'sticky-reels'
  | 'hold-win'
  | 'tumble-mult'
  | 'mystery'
  | 'wheel'
  | 'pick'
  | 'cluster-fs'
  | 'burn'
  | 'colossal'
  | 'slash';

export type SlotGame = {
  id: string;
  title: string;
  mood: string;
  volatility: 'средняя' | 'высокая' | 'очень высокая';
  reels: number;
  rows: number;
  mechanic: Mechanic;
  /** Индексы рядов слева направо. Ряд 0 — верх. Пусто для ways / scatter-pays / cluster. */
  lines: number[][];
  symbols: SlotSymbol[];
  /** Случайный множитель всего выигрыша спина в базовой игре. 1 — без множителя. */
  multipliers: { value: number; weight: number }[];
  maxWinMultiplier: number;
  accent: string;
  felt: string;
  /** Сколько символов-триггеров запускают бонус. */
  trigger: number;
  /** Сколько бесплатных спинов даёт бонус (если он на спинах). */
  freeSpins: number;
  bonus: {
    kind: BonusKind;
    title: string;
    rule: string;
    /** Чем отличается покупка «Топ». */
    top: string;
  };
  /** Короткие пункты для экрана правил. */
  features: string[];
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

/** 5×5, ряд 0 — верх. Середина поля — ряд 2. */
const LINES_25: number[][] = [
  [2, 2, 2, 2, 2],
  [1, 1, 1, 1, 1],
  [3, 3, 3, 3, 3],
  [0, 0, 0, 0, 0],
  [4, 4, 4, 4, 4],
  [0, 1, 2, 3, 4],
  [4, 3, 2, 1, 0],
  [0, 1, 2, 1, 0],
  [4, 3, 2, 3, 4],
  [1, 2, 3, 2, 1],
  [3, 2, 1, 2, 3],
  [1, 0, 0, 0, 1],
  [3, 4, 4, 4, 3],
  [2, 1, 0, 1, 2],
  [2, 3, 4, 3, 2],
  [0, 0, 1, 0, 0],
  [4, 4, 3, 4, 4],
  [0, 1, 1, 1, 0],
  [4, 3, 3, 3, 4],
  [2, 2, 1, 2, 2],
  [2, 2, 3, 2, 2],
  [1, 2, 2, 2, 1],
  [3, 2, 2, 2, 3],
  [0, 2, 4, 2, 0],
  [4, 2, 0, 2, 4],
];

/** Множители шторы. На линии складываются. */
export const CURTAIN_MULTIPLIERS = [2, 3, 5, 8, 10, 15, 25, 50, 100];

/** 10 исходов колеса перед бонусом уса: спины и минимальный множитель шторы. */
export const CURTAIN_WHEEL: { spins: number; min: number; weight: number; label: string }[] = [
  { spins: 6, min: 2, weight: 24, label: '6 FS · x2' },
  { spins: 8, min: 2, weight: 18, label: '8 FS · x2' },
  { spins: 8, min: 3, weight: 14, label: '8 FS · x3' },
  { spins: 10, min: 3, weight: 12, label: '10 FS · x3' },
  { spins: 10, min: 5, weight: 10, label: '10 FS · x5' },
  { spins: 12, min: 5, weight: 8, label: '12 FS · x5' },
  { spins: 12, min: 8, weight: 6, label: '12 FS · x8' },
  { spins: 15, min: 10, weight: 4, label: '15 FS · x10' },
  { spins: 15, min: 15, weight: 2.5, label: '15 FS · x15' },
  { spins: 15, min: 50, weight: 1.5, label: '15 FS · x50' },
];

const NO_MULTIPLIER = [{ value: 1, weight: 1 }];

/** Номиналы монет Hold & Win, множители ставки. Фиксированные призы, не джекпоты. */
export const HOLD_WIN_VALUES: { value: number; weight: number; pot?: 'mini' | 'minor' | 'major' }[] = [
  { value: 1, weight: 34 },
  { value: 2, weight: 26 },
  { value: 3, weight: 16 },
  { value: 5, weight: 11 },
  { value: 10, weight: 6 },
  { value: 15, weight: 3 },
  { value: 25, weight: 2 },
  { value: 20, weight: 2, pot: 'mini' },
  { value: 50, weight: 1, pot: 'minor' },
  { value: 200, weight: 0.3, pot: 'major' },
];
export const HOLD_WIN_GRAND = 1000;

/** Шары-множители scatter-pays. */
export const ORB_VALUES: { value: number; weight: number }[] = [
  { value: 2, weight: 40 },
  { value: 3, weight: 26 },
  { value: 4, weight: 16 },
  { value: 5, weight: 12 },
  { value: 6, weight: 8 },
  { value: 8, weight: 6 },
  { value: 10, weight: 5 },
  { value: 12, weight: 3 },
  { value: 15, weight: 2.5 },
  { value: 20, weight: 2 },
  { value: 25, weight: 1.5 },
  { value: 50, weight: 0.8 },
  { value: 100, weight: 0.4 },
  { value: 250, weight: 0.12 },
  { value: 500, weight: 0.04 },
];

export type WheelSegment = { kind: 'cash' | 'spins' | 'level'; value: number; spins?: number; label: string };

/** Колесо 1 уровня. Сектор выбирается равновероятно, рисунок честно совпадает с шансами. */
export const WHEEL_LEVEL_1: WheelSegment[] = [
  { kind: 'cash', value: 12, label: 'x12' },
  { kind: 'cash', value: 18, label: 'x18' },
  { kind: 'spins', value: 3, spins: 10, label: '10 FS x3' },
  { kind: 'cash', value: 24, label: 'x24' },
  { kind: 'cash', value: 30, label: 'x30' },
  { kind: 'level', value: 2, label: 'LEVEL UP' },
  { kind: 'cash', value: 35, label: 'x35' },
  { kind: 'cash', value: 45, label: 'x45' },
  { kind: 'spins', value: 5, spins: 12, label: '12 FS x5' },
  { kind: 'cash', value: 55, label: 'x55' },
  { kind: 'cash', value: 80, label: 'x80' },
  { kind: 'cash', value: 160, label: 'x160' },
];

export const WHEEL_LEVEL_2: WheelSegment[] = [
  { kind: 'cash', value: 25, label: 'x25' },
  { kind: 'cash', value: 40, label: 'x40' },
  { kind: 'spins', value: 8, spins: 15, label: '15 FS x8' },
  { kind: 'cash', value: 50, label: 'x50' },
  { kind: 'cash', value: 75, label: 'x75' },
  { kind: 'cash', value: 100, label: 'x100' },
  { kind: 'cash', value: 125, label: 'x125' },
  { kind: 'cash', value: 150, label: 'x150' },
  { kind: 'spins', value: 12, spins: 15, label: '15 FS x12' },
  { kind: 'cash', value: 200, label: 'x200' },
  { kind: 'cash', value: 250, label: 'x250' },
  { kind: 'cash', value: 500, label: 'x500' },
];

export type PickToken = { kind: 'mult' | 'miss'; value: number; weight: number };
export const PICK_BAG: PickToken[] = [
  { kind: 'miss', value: 0, weight: 26 },
  { kind: 'mult', value: 3, weight: 18 },
  { kind: 'mult', value: 5, weight: 16 },
  { kind: 'mult', value: 8, weight: 14 },
  { kind: 'mult', value: 15, weight: 10 },
  { kind: 'mult', value: 25, weight: 7 },
  { kind: 'mult', value: 40, weight: 4 },
  { kind: 'mult', value: 80, weight: 2 },
  { kind: 'mult', value: 150, weight: 0.6 },
];
export const PICK_TARGETS = 12;
export const PICK_MISSES = 3;

export const SLOT_GAMES: SlotGame[] = [
  {
    id: 'golden-must',
    title: 'Козырной ус',
    mood: 'Поле 5×5. Штора закрывает барабан целиком, из золота выходит Ус и показывает свой множитель.',
    volatility: 'высокая',
    reels: 5,
    rows: 5,
    mechanic: 'lines',
    lines: LINES_25,
    accent: '#f5c518',
    felt: '#3a2410',
    trigger: 3,
    freeSpins: 6,
    maxWinMultiplier: 15000,
    bonus: {
      kind: 'sticky-reels',
      title: 'Золотой дождь',
      rule: 'Три звезды — обычный бонус. Четыре — топовый, с одной шторой на старте. Пять, очень редко — Hot Mod: две шторы в случайных местах. Перед спинами колесо из 10 исходов выбирает 6–15 бесплатных спинов и минимальный множитель шторы от x2 до x50. Штора ниже минимума поднимается до него. На линии множители штор складываются, но не больше x10.',
      top: 'Покупка топа открывает четыре звезды. Колесо то же. Бонус начинается с одной шторы не ниже минимума колеса. Потолок раунда — x15000.',
    },
    features: [
      'Поле 5×5, 25 линий',
      '3 звезды — обычный бонус, 4 — топовый, 5 — Hot Mod с двумя шторами',
      'Колесо перед бонусом: 6–15 спинов и минимальный множитель шторы x2–x50',
      'Штора закрывает барабан целиком и липнет до конца бонуса',
      'На линии множители штор складываются, потолок x10',
    ],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'cherry', name: 'Вишня', weight: 46, pays: [4, 12, 31] },
      { id: 'lemon', name: 'Лимон', weight: 40, pays: [5, 16, 43] },
      { id: 'grape', name: 'Виноград', weight: 30, pays: [9, 23, 71] },
      { id: 'bell', name: 'Колокол', weight: 18, pays: [16, 48, 139] },
      { id: 'gem', name: 'Изумруд', weight: 12, pays: [28, 80, 238] },
      { id: 'crown', name: 'Корона', weight: 7, pays: [48, 157, 496] },
      { id: 'wild', name: 'Ус', weight: 4, pays: [80, 238, 794], wild: true },
      { id: 'scatter', name: 'Звезда', weight: 1.75, pays: [2, 6, 25], scatter: true },
    ],
  },
  {
    id: 'hex-vault',
    title: 'Сейф шулера',
    mood: 'Hold & Win. Монеты с номиналами липнут к полю, три респина, полное поле — гранд x1000.',
    volatility: 'высокая',
    reels: 5,
    rows: 3,
    mechanic: 'lines',
    lines: LINES_20.slice(0, 10),
    accent: '#f97316',
    felt: '#1a120c',
    trigger: 6,
    freeSpins: 0,
    maxWinMultiplier: 5000,
    bonus: {
      kind: 'hold-win',
      title: 'Сундук открыт',
      rule: '6 и больше монет запускают респины. Монеты остаются, каждая новая возвращает 3 респина. Полное поле из 15 монет даёт гранд x1000.',
      top: 'Старт с 9 монетами, номиналы впятеро больше, монеты падают чаще.',
    },
    features: ['10 линий', 'Дикие x2, x3, x5 умножают линию', 'Фиксированные призы Mini x20, Minor x50, Major x200', 'Гранд x1000 за полное поле'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'lock', name: 'Замок', weight: 46, pays: [1.1, 3.2, 6.5] },
      { id: 'dagger', name: 'Кинжал', weight: 36, pays: [2.1, 5.5, 15.5] },
      { id: 'skull', name: 'Череп', weight: 22, pays: [4.2, 12, 33] },
      { id: 'rune', name: 'Руна', weight: 12, pays: [8.3, 26, 76] },
      { id: 'chest', name: 'Сундук', weight: 6, pays: [15.5, 54, 174] },
      { id: 'wild', name: 'Гекс', weight: 3, pays: [27.5, 97, 325], wild: true },
      { id: 'm2', name: 'x2', weight: 2, pays: [3, 7, 20], wild: true, multiplier: 2 },
      { id: 'm3', name: 'x3', weight: 1.6, pays: [3, 7, 20], wild: true, multiplier: 3 },
      { id: 'm5', name: 'x5', weight: 0.8, pays: [3, 7, 20], wild: true, multiplier: 5 },
      { id: 'coin', name: 'Монета', weight: 14.5, pays: [0, 0, 0], bonusCoin: true },
    ],
  },
  {
    id: 'oak-fortune',
    title: 'Дуб-богатей',
    mood: 'Поле 6×5. Восемь одинаковых платят где угодно и лопаются. Шар заменяет любой символ и умножает те, с которыми сыграл.',
    volatility: 'очень высокая',
    reels: 6,
    rows: 5,
    mechanic: 'scatter-pays',
    lines: [],
    accent: '#84cc16',
    felt: '#14240f',
    trigger: 4,
    freeSpins: 20,
    maxWinMultiplier: 5000,
    bonus: {
      kind: 'tumble-mult',
      title: 'Лунная поляна',
      rule: '4 луны дают 20 бесплатных спинов. Шар заменяет любой символ и умножает выигрыш символов, с которыми сыграл.',
      top: 'Значения шаров удвоены, и на каждом спине гарантирован хотя бы один шар.',
    },
    features: ['Выплата за 8+ символов где угодно', 'Каскад: выигрыш подсвечивается и лопается, сверху падают новые', 'Шар — вайлд и множитель символов, с которыми сыграл', 'В бонусе шары выпадают чаще'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'leaf', name: 'Лист', weight: 13, pays: [0.13, 0.44, 1.1] },
      { id: 'fern', name: 'Папоротник', weight: 13, pays: [0.16, 0.5, 1.4] },
      { id: 'acorn', name: 'Жёлудь', weight: 12, pays: [0.22, 0.55, 1.65] },
      { id: 'beetle', name: 'Жук', weight: 12, pays: [0.28, 0.66, 2.2] },
      { id: 'mushroom', name: 'Гриб', weight: 9, pays: [0.44, 0.83, 3.3] },
      { id: 'owl', name: 'Сова', weight: 8, pays: [0.55, 1.1, 5.5] },
      { id: 'hoard', name: 'Клад', weight: 7, pays: [0.83, 1.65, 11] },
      { id: 'oak', name: 'Дуб', weight: 6, pays: [1.65, 4.4, 27.5] },
      { id: 'orb', name: 'Шар', weight: 1.6, pays: [0, 0, 0], orb: true },
      { id: 'scatter', name: 'Луна', weight: 1.4, pays: [3, 5, 100], scatter: true },
    ],
  },
  {
    id: 'neon-river',
    title: 'Река фишек',
    mood: '1024 пути и мистические фонари: все знаки «?» разом становятся одним символом.',
    volatility: 'высокая',
    reels: 5,
    rows: 4,
    mechanic: 'ways',
    lines: [],
    accent: '#22d3ee',
    felt: '#071824',
    trigger: 3,
    freeSpins: 10,
    maxWinMultiplier: 4000,
    bonus: {
      kind: 'mystery',
      title: 'Прилив',
      rule: '10 бесплатных спинов. Мистические символы раскрываются только в жемчуг, волну или дикий символ.',
      top: 'В каждом спине на поле добавляются четыре мистических символа, раскрытие только в волну или дикий.',
    },
    features: ['До 1024 путей слева направо', 'Выплата пути = коэффициент × ставка / 1000 × число путей', 'Мистика «?» превращается в один общий символ', 'Дикие x4 и x10 умножают путь'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'drop', name: 'Капля', weight: 42, pays: [1.15, 3.45, 9] },
      { id: 'fish', name: 'Рыба', weight: 30, pays: [2.3, 6.8, 18] },
      { id: 'lantern', name: 'Фонарь', weight: 18, pays: [4.6, 13.5, 40] },
      { id: 'pearl', name: 'Жемчуг', weight: 10, pays: [9, 27, 90] },
      { id: 'wave', name: 'Волна', weight: 6, pays: [18, 56, 180] },
      { id: 'wild', name: 'Неон', weight: 2.4, pays: [27, 90, 316], wild: true },
      { id: 'm4', name: 'x4', weight: 0.7, pays: [6, 16, 40], wild: true, multiplier: 4 },
      { id: 'm10', name: 'x10', weight: 0.35, pays: [6, 16, 40], wild: true, multiplier: 10 },
      { id: 'mystery', name: 'Мистика', weight: 5, pays: [0, 0, 0], mystery: true },
      { id: 'scatter', name: 'Лотос', weight: 1.6, pays: [2, 5, 20], scatter: true },
    ],
  },
  {
    id: 'limitless-city',
    title: 'Ва-банк сити',
    mood: 'Сирены крутят колесо: кэш до x500, бесплатные спины с множителем или новый уровень колеса.',
    volatility: 'очень высокая',
    reels: 5,
    rows: 3,
    mechanic: 'lines',
    lines: LINES_20.slice(0, 10),
    accent: '#e11d48',
    felt: '#1a0610',
    trigger: 3,
    freeSpins: 0,
    maxWinMultiplier: 8000,
    bonus: {
      kind: 'wheel',
      title: 'Ночная сирена',
      rule: '3 сирены запускают колесо с 12 секторами: кэш, бесплатные спины с фиксированным множителем или LEVEL UP на колесо второго уровня до x500.',
      top: 'Сразу колесо второго уровня, все сектора усилены в 2.25 раза.',
    },
    features: ['10 линий', 'Случайный множитель спина до x50', 'Дикие x50 и x100', 'Колесо двух уровней'],
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
      { id: 'ticket', name: 'Билет', weight: 55, pays: [1.8, 2.8, 6.5] },
      { id: 'neon', name: 'Вывеска', weight: 34, pays: [1.9, 7.4, 19.5] },
      { id: 'car', name: 'Машина', weight: 18, pays: [6.5, 17.7, 51] },
      { id: 'vault', name: 'Сейф', weight: 8, pays: [14, 44.6, 140] },
      { id: 'wild', name: 'Город', weight: 3, pays: [25, 89, 320], wild: true },
      { id: 'm50', name: 'x50', weight: 0.5, pays: [8, 24, 70], wild: true, multiplier: 50, bonusOnly: true },
      { id: 'm100', name: 'x100', weight: 0.25, pays: [8, 24, 70], wild: true, multiplier: 100, bonusOnly: true },
      { id: 'scatter', name: 'Сирена', weight: 2.15, pays: [2, 6, 20], scatter: true },
    ],
  },
  {
    id: 'green-arrow',
    title: 'Туз в яблочко',
    mood: 'Яблочко падает только на барабаны 2–5. Три открывают залп, четыре — тир 6×6.',
    volatility: 'высокая',
    reels: 5,
    rows: 3,
    mechanic: 'lines',
    lines: LINES_20.slice(0, 15),
    accent: '#65a30d',
    felt: '#14210c',
    trigger: 3,
    freeSpins: 15,
    maxWinMultiplier: 5000,
    bonus: {
      kind: 'pick',
      title: 'Залп',
      rule: '3 яблочка на барабанах 2–5 дают 15 спинов. Лучник бросает от 1 до 6 диких за спин. Стрела с множителем остаётся до конца бонуса.',
      top: '4 яблочка открывают тир 6×6. На поле ровно 6 промахов, третий заканчивает бонус. Множители от x10 до x2500.',
    },
    features: ['15 линий', 'Яблочко только на барабанах 2, 3, 4 и 5, не больше одного на барабан', '3 яблочка — 15 спинов и дикие от лучника', '4 яблочка — тир 6×6, множители x10–x2500'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'hood', name: 'Капюшон', weight: 40, pays: [1.9, 4.75, 11.4] },
      { id: 'target', name: 'Мишень', weight: 28, pays: [2.85, 7.6, 21] },
      { id: 'bag', name: 'Кошель', weight: 16, pays: [5.7, 16, 45.6] },
      { id: 'bow', name: 'Лук', weight: 8, pays: [12.4, 40, 114] },
      { id: 'wild', name: 'Стрела', weight: 4, pays: [22.8, 68, 205], wild: true },
      { id: 'scatter', name: 'Яблочко', weight: 1.1, pays: [2, 5, 15], scatter: true },
    ],
  },
  {
    id: 'fairy-glade',
    title: 'Фея на удаче',
    mood: 'Кластеры 6×6: пять и больше соседних символов лопаются, поле оседает, фея досыпает дикие.',
    volatility: 'средняя',
    reels: 6,
    rows: 6,
    mechanic: 'cluster',
    lines: [],
    accent: '#e879f9',
    felt: '#2a1030',
    trigger: 3,
    freeSpins: 8,
    maxWinMultiplier: 4000,
    bonus: {
      kind: 'cluster-fs',
      title: 'Хоровод',
      rule: '3 искры дают 8 бесплатных спинов. Каждый выигрышный каскад поднимает общий множитель на 1, и он не сбрасывается до конца бонуса.',
      top: 'Множитель начинается с x8 и растёт на 5 за каскад.',
    },
    features: ['Кластеры от 5 соединённых символов', 'Каскады с оседанием поля', 'Фея добавляет дикие после пустого каскада', 'Множитель бонуса растёт и не падает'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'bloom', name: 'Цветок', weight: 22, pays: [0.3, 0.9, 3.6] },
      { id: 'berry', name: 'Ягода', weight: 20, pays: [0.36, 1.16, 4.35] },
      { id: 'dew', name: 'Роса', weight: 18, pays: [0.44, 1.45, 5.8] },
      { id: 'firefly', name: 'Светлячок', weight: 14, pays: [0.72, 2.2, 8.7] },
      { id: 'moth', name: 'Мотылёк', weight: 9, pays: [1.45, 4.35, 17.4] },
      { id: 'wand', name: 'Жезл', weight: 5, pays: [2.9, 8.7, 43.5] },
      { id: 'wild', name: 'Крыло', weight: 1.4, pays: [0, 0, 0], wild: true },
      { id: 'scatter', name: 'Искра', weight: 0.54, pays: [1, 3, 10], scatter: true },
    ],
  },
  {
    id: 'ash-dragon',
    title: 'Дракон орёт',
    mood: 'Каждый выигрыш в бонусе сжигает самый дешёвый символ и поднимает множитель. К концу на поле одни сокровища.',
    volatility: 'очень высокая',
    reels: 5,
    rows: 3,
    mechanic: 'lines',
    lines: LINES_20.slice(0, 10),
    accent: '#f97316',
    felt: '#2a0c08',
    trigger: 3,
    freeSpins: 10,
    maxWinMultiplier: 8000,
    bonus: {
      kind: 'burn',
      title: 'Дыхание',
      rule: '10 бесплатных спинов с множителем от x2. Первый выигрышный спин сжигает самый дешёвый символ с барабанов, и каждый выигрышный спин поднимает множитель на 1.',
      top: 'Самый дешёвый символ сожжён заранее, множитель начинается с x3, дважды за бонус падают дикие x15 и x20.',
    },
    features: ['10 линий', 'Дракон случайно умножает выигрыш x2–x5', 'Дикие x15 и x20', 'Сжигание символов и растущий множитель в бонусе'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'ember', name: 'Уголь', weight: 48, pays: [1, 2, 5] },
      { id: 'scale', name: 'Чешуя', weight: 28, pays: [2, 6, 16] },
      { id: 'egg', name: 'Яйцо', weight: 14, pays: [5, 16, 45] },
      { id: 'horn', name: 'Рог', weight: 7, pays: [11, 36, 108] },
      { id: 'wild', name: 'Клык', weight: 3, pays: [18, 63, 189], wild: true },
      { id: 'm15', name: 'x15', weight: 0.5, pays: [4, 11, 32], wild: true, multiplier: 15, bonusOnly: true },
      { id: 'm20', name: 'x20', weight: 0.3, pays: [4, 11, 32], wild: true, multiplier: 20, bonusOnly: true },
      { id: 'scatter', name: 'Пламя', weight: 1.8, pays: [2, 6, 25], scatter: true },
    ],
  },
  {
    id: 'frost-queen',
    title: 'Ледяная дама',
    mood: 'Заморозка и респин в базе, а в бонусе на поле падает колоссальный символ 3×3.',
    volatility: 'высокая',
    reels: 5,
    rows: 3,
    mechanic: 'lines',
    lines: LINES_20.slice(0, 15),
    accent: '#7dd3fc',
    felt: '#0c1a28',
    trigger: 3,
    freeSpins: 10,
    maxWinMultiplier: 5000,
    bonus: {
      kind: 'colossal',
      title: 'Ледяной трон',
      rule: '10 бесплатных спинов. В каждом на поле встаёт колоссальный символ 3×3 из волка, диадемы или льда.',
      top: 'Колоссальный символ всегда дикий, выигрыши идут с x3, спинов на 2 больше.',
    },
    features: ['15 линий', 'Королева замораживает барабан и даёт респин', 'Колоссальный символ 3×3 в бонусе'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'snow', name: 'Снег', weight: 44, pays: [1, 4, 10] },
      { id: 'crystal', name: 'Кристалл', weight: 26, pays: [3, 8, 24] },
      { id: 'wolf', name: 'Волк', weight: 14, pays: [6, 18, 54] },
      { id: 'ice-crown', name: 'Диадема', weight: 7, pays: [13, 42, 126] },
      { id: 'wild', name: 'Лёд', weight: 4, pays: [22, 66, 204], wild: true },
      { id: 'scatter', name: 'Снежинка', weight: 1.85, pays: [2, 6, 20], scatter: true },
    ],
  },
  {
    id: 'blade-ronin',
    title: 'Катана на кону',
    mood: 'Платит в обе стороны. Ронин рубит ряды, каждый удар поднимает множитель.',
    volatility: 'очень высокая',
    reels: 5,
    rows: 3,
    mechanic: 'both-ways',
    lines: LINES_20.slice(0, 12),
    accent: '#ef4444',
    felt: '#1a0a0c',
    trigger: 3,
    freeSpins: 10,
    maxWinMultiplier: 7000,
    bonus: {
      kind: 'slash',
      title: 'Рассечение',
      rule: '10 бесплатных спинов с множителем от x2. Каждый спин ронин рубит три соседних барабана одного ряда в дикие символы, и каждый удар поднимает множитель на 2.',
      top: 'Два удара за спин, множитель начинается с x6 и растёт на 4.',
    },
    features: ['12 линий в обе стороны', 'Пятёрка на всю линию платит один раз, короче — может заплатить с двух сторон', 'Ронин рубит ряд в дикие в базовой игре', 'Растущий множитель за каждый удар'],
    multipliers: NO_MULTIPLIER,
    symbols: [
      { id: 'mask', name: 'Маска', weight: 46, pays: [0.3, 0.8, 2] },
      { id: 'fan', name: 'Веер', weight: 28, pays: [0.5, 2, 6] },
      { id: 'katana', name: 'Катана', weight: 12, pays: [2, 6, 21] },
      { id: 'crest', name: 'Герб', weight: 6, pays: [4, 16, 47] },
      { id: 'wild', name: 'Удар', weight: 2.2, pays: [8, 26, 78], wild: true },
      { id: 'scatter', name: 'Печать', weight: 1.75, pays: [2, 6, 25], scatter: true },
    ],
  },
];

export function getSlotGame(id: string): SlotGame | undefined {
  return SLOT_GAMES.find((game) => game.id === id);
}

/** Символ, который запускает бонус: скаттер или монета Hold & Win. */
export function triggerSymbol(game: SlotGame): SlotSymbol | undefined {
  return game.symbols.find((symbol) => symbol.scatter) ?? game.symbols.find((symbol) => symbol.bonusCoin);
}

/** Лестница ставки: минимум 10, максимум 25 000. Одинаковая для монет и единиц GRAM. */
export const BET_LEVELS = [
  10, 20, 30, 40, 50, 60, 80, 100,
  120, 160, 200, 250, 300, 400, 500,
  600, 800, 1000, 1200, 1600, 2000,
  2500, 3000, 4000, 5000, 6000, 8000,
  10000, 12000, 16000, 20000, 25000,
];
export const COIN_BETS = BET_LEVELS;
/** 1 единица = 0.01 GRAM. 10 единиц = 0.10 GRAM. 25 000 единиц = 250 GRAM. */
export const GRAM_UNIT_BETS = BET_LEVELS;
export const GRAM_UNITS_PER_COIN = 10;
export const DEMO_START_CHIPS = 100000;
/** Делитель ставки на один путь для ways. Не равен числу путей: максимум путей считается отдельно. */
export const WAYS_DIVISOR = 1000;

/** Выигрыш одной линии: коэффициент × ставка / число линий, до целой монеты. */
export function lineCoinWin(bet: number, lines: number, pay: number, factor = 1): number {
  if (lines <= 0 || pay <= 0 || factor <= 0) return 0;
  return Math.max(0, Math.round((bet * pay * factor) / lines));
}

/** Выигрыш ways: коэффициент × ставка / WAYS_DIVISOR × число путей, до целой монеты. */
export function wayCoinWin(bet: number, pay: number, ways = 1, factor = 1): number {
  if (pay <= 0 || ways <= 0 || factor <= 0) return 0;
  return Math.max(0, Math.round((bet * pay * ways * factor) / WAYS_DIVISOR));
}
