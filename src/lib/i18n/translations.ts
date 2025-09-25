/**
 * 🌍 INTERNATIONALIZATION SYSTEM
 * Система интернационализации для P.I.D.R. игры
 */

export type Language = 'ru' | 'en';

export interface Translations {
  // Главное меню
  mainMenu: {
    title: string;
    play: string;
    wallet: string;
    shop: string;
    rating: string;
    friends: string;
    settings: string;
    profile: string;
    online: string;
    quickActions: string;
    rules: string;
  };
  
  // Игра
  game: {
    findRoom: string;
    createRoom: string;
    joinRoom: string;
    waiting: string;
    playing: string;
    finished: string;
    winner: string;
    coins: string;
    players: string;
    back: string;
    refresh: string;
    endGame: string;
  };
  
  // Правила игры
  rules: {
    title: string;
    basics: string;
    stages: string;
    oneCard: string;
    strategy: string;
    gameOverview: string;
    cardHierarchy: string;
    suits: string;
    stage1: string;
    stage2: string;
    stage3: string;
    players: string;
    goal: string;
    cards: string;
    specialRule: string;
    spades: string;
    hearts: string;
    diamonds: string;
    clubs: string;
    simpleRules: string;
    foolRules: string;
    openingPenki: string;
    moves: string;
    beatCards: string;
    suitsNotImportant: string;
    transition: string;
    algorithm: string;
    algorithmTitle: string;
    mandatory: string;
    penaltySystem: string;
    visualGuides: string;
  };
  
  // Кошелек
  wallet: {
    balance: string;
    deposit: string;
    withdraw: string;
    history: string;
    address: string;
    transaction: string;
    pending: string;
    confirmed: string;
    failed: string;
  };
  
  // Магазин
  shop: {
    title: string;
    buyCoins: string;
    packages: string;
    bonus: string;
    total: string;
    purchase: string;
    success: string;
    error: string;
  };
  
  // Общие
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    close: string;
    save: string;
    back: string;
    next: string;
    copy: string;
    copied: string;
  };
  
  // Загрузка
  loading: {
    initializing: string;
    connecting: string;
    loadingGame: string;
    preparingCards: string;
    almostReady: string;
  };
}

export const translations: Record<Language, Translations> = {
  ru: {
    mainMenu: {
      title: 'P.I.D.R. ИГРА',
      play: 'ИГРАТЬ',
      wallet: 'Кошелек',
      shop: 'МАГАЗИН',
      rating: 'Рейтинг',
      friends: 'Друзья',
      settings: 'Настройки',
      profile: 'ПРОФИЛЬ',
      online: 'ОНЛАЙН',
      quickActions: 'БЫСТРЫЕ ДЕЙСТВИЯ',
      rules: 'ПРАВИЛА ИГРЫ'
    },
    game: {
      findRoom: 'Найти комнату',
      createRoom: 'Создать комнату',
      joinRoom: 'Войти в комнату',
      waiting: 'Ожидание игроков',
      playing: 'Игра идет',
      finished: 'Игра завершена',
      winner: 'Победитель',
      coins: 'Монет',
      players: 'Игроки',
      back: 'Назад',
      refresh: 'Обновить',
      endGame: 'Закончить игру'
    },
    rules: {
      title: 'ПРАВИЛА ИГРЫ',
      basics: 'ОСНОВЫ',
      stages: 'СТАДИИ',
      oneCard: 'ОДНА КАРТА!',
      strategy: 'СТРАТЕГИЯ',
      gameOverview: 'ОБЗОР ИГРЫ',
      cardHierarchy: 'ИЕРАРХИЯ КАРТ',
      suits: 'МАСТИ',
      stage1: 'ПЕРВАЯ СТАДИЯ',
      stage2: 'ВТОРАЯ СТАДИЯ',
      stage3: 'ТРЕТЬЯ СТАДИЯ',
      players: 'Игроки',
      goal: 'Цель',
      cards: 'Карты',
      specialRule: 'Особое правило',
      spades: 'Пики',
      hearts: 'Червы',
      diamonds: 'Бубны',
      clubs: 'Трефы',
      simpleRules: 'Простые правила',
      foolRules: 'Правила "Дурака"',
      openingPenki: 'Открытие пеньков',
      moves: 'Ходы',
      beatCards: 'Бить карты',
      suitsNotImportant: 'Масти не важны',
      transition: 'Переход',
      algorithm: 'Алгоритм хода',
      algorithmTitle: 'Алгоритм',
      mandatory: 'ОБЯЗАТЕЛЬНОЕ ОБЪЯВЛЕНИЕ',
      penaltySystem: 'ШТРАФНАЯ СИСТЕМА',
      visualGuides: 'ВИЗУАЛЬНЫЕ ПОДСКАЗКИ'
    },
    wallet: {
      balance: 'Баланс',
      deposit: 'Пополнить',
      withdraw: 'Вывести',
      history: 'История',
      address: 'Адрес',
      transaction: 'Транзакция',
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      failed: 'Ошибка'
    },
    shop: {
      title: 'Магазин монет',
      buyCoins: 'Купить монеты',
      packages: 'Пакеты',
      bonus: 'Бонус',
      total: 'Итого',
      purchase: 'Купить',
      success: 'Покупка успешна',
      error: 'Ошибка покупки'
    },
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успешно',
      cancel: 'Отмена',
      confirm: 'Подтвердить',
      close: 'Закрыть',
      save: 'Сохранить',
      back: 'Назад',
      next: 'Далее',
      copy: 'Копировать',
      copied: 'Скопировано'
    },
    loading: {
      initializing: 'Тасуем колоду...',
      connecting: 'Подготавливаем покерный стол...',
      loadingGame: 'Раздаем карты игрокам...',
      preparingCards: 'Размещаем фишки...',
      almostReady: 'Добро пожаловать за стол!'
    }
  },
  en: {
    mainMenu: {
      title: 'P.I.D.R. GAME',
      play: 'PLAY',
      wallet: 'Wallet',
      shop: 'SHOP',
      rating: 'Rating',
      friends: 'Friends',
      settings: 'Settings',
      profile: 'PROFILE',
      online: 'ONLINE',
      quickActions: 'QUICK ACTIONS',
      rules: 'GAME RULES'
    },
    game: {
      findRoom: 'Find Room',
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      waiting: 'Waiting for players',
      playing: 'Game in progress',
      finished: 'Game finished',
      winner: 'Winner',
      coins: 'Coins',
      players: 'Players',
      back: 'Back',
      refresh: 'Refresh',
      endGame: 'End Game'
    },
    rules: {
      title: 'GAME RULES',
      basics: 'BASICS',
      stages: 'STAGES',
      oneCard: 'ONE CARD!',
      strategy: 'STRATEGY',
      gameOverview: 'GAME OVERVIEW',
      cardHierarchy: 'CARD HIERARCHY',
      suits: 'SUITS',
      stage1: 'FIRST STAGE',
      stage2: 'SECOND STAGE',
      stage3: 'THIRD STAGE',
      players: 'Players',
      goal: 'Goal',
      cards: 'Cards',
      specialRule: 'Special rule',
      spades: 'Spades',
      hearts: 'Hearts',
      diamonds: 'Diamonds',
      clubs: 'Clubs',
      simpleRules: 'Simple rules',
      foolRules: 'Fool rules',
      openingPenki: 'Opening penki',
      moves: 'Moves',
      beatCards: 'Beat cards',
      suitsNotImportant: 'Suits not important',
      transition: 'Transition',
      algorithm: 'Move algorithm',
      algorithmTitle: 'Algorithm',
      mandatory: 'MANDATORY DECLARATION',
      penaltySystem: 'PENALTY SYSTEM',
      visualGuides: 'VISUAL GUIDES'
    },
    wallet: {
      balance: 'Balance',
      deposit: 'Deposit',
      withdraw: 'Withdraw',
      history: 'History',
      address: 'Address',
      transaction: 'Transaction',
      pending: 'Pending',
      confirmed: 'Confirmed',
      failed: 'Failed'
    },
    shop: {
      title: 'Coin Shop',
      buyCoins: 'Buy Coins',
      packages: 'Packages',
      bonus: 'Bonus',
      total: 'Total',
      purchase: 'Purchase',
      success: 'Purchase successful',
      error: 'Purchase error'
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      save: 'Save',
      back: 'Back',
      next: 'Next',
      copy: 'Copy',
      copied: 'Copied'
    },
    loading: {
      initializing: 'Shuffling deck...',
      connecting: 'Preparing poker table...',
      loadingGame: 'Dealing cards to players...',
      preparingCards: 'Placing chips...',
      almostReady: 'Welcome to the table!'
    }
  }
};

// Хук для использования переводов
export function useTranslations(language: Language = 'ru'): Translations {
  return translations[language];
}
