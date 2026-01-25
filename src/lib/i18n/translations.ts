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
    // Detailed rule descriptions
    gameDescription: string;
    playersCount: string;
    goalDescription: string;
    cardsDescription: string;
    hierarchyDescription: string;
    specialRuleDescription: string;
    suitsDescription: string;
    stage1Description: string;
    stage1Moves: string;
    stage1Beat: string;
    stage1Suits: string;
    stage1Transition: string;
    stage2Description: string;
    stage2SpadesRule: string;
    stage2Moves: string;
    stage2Beat: string;
    stage2Transition: string;
    stage3Description: string;
    stage3FoolRules: string;
    stage3Moves: string;
    stage3Beat: string;
    stage3Algorithm: string;
    oneCardDescription: string;
    oneCardRule: string;
    strategyDescription: string;
    strategyTips: string;
    suitNames: {
      spades: string;
      hearts: string;
      diamonds: string;
      clubs: string;
    };
    algorithmStage2: string;
    trump: string;
    important: string;
    noThrowing: string;
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
  
  // Профиль
  profile: {
    title: string;
    back: string;
    online: string;
    coins: string;
    avatar: string;
    friends: string;
    statistics: string;
    achievements: string;
    wallet: string;
    skins: string;
    effects: string;
    bonuses: string;
    rating: string;
    gamesPlayed: string;
    wins: string;
    losses: string;
    winRate: string;
    // Достижения
    firstWin: string;
    firstWinDesc: string;
    veteran: string;
    veteranDesc: string;
    master: string;
    masterDesc: string;
    legend: string;
    legendDesc: string;
    // Бонусы
    dailyBonus: string;
    weeklyBonus: string;
    monthlyBonus: string;
    unavailable: string;
    // Кастомизация
    customization: string;
    changeAvatar: string;
    selectSkin: string;
    selectEffect: string;
    classic: string;
    premium: string;
    vip: string;
    none: string;
    fire: string;
    ice: string;
    lightning: string;
    // Кнопки
    close: string;
    apply: string;
    purchase: string;
    equipped: string;
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
    // Categories
    featured: string;
    skins: string;
    effects: string;
    boosters: string;
    bundles: string;
    crypto: string;
    themes: string;
    cards: string;
    avatars: string;
    // Items
    darkTheme: string;
    neonTheme: string;
    retroTheme: string;
    goldenCard: string;
    rainbowCard: string;
    crystalCard: string;
    crownAvatar: string;
    fireAvatar: string;
    starAvatar: string;
    coinBooster: string;
    expBooster: string;
    // Descriptions
    darkThemeDesc: string;
    neonThemeDesc: string;
    retroThemeDesc: string;
    goldenCardDesc: string;
    rainbowCardDesc: string;
    crystalCardDesc: string;
    crownAvatarDesc: string;
    fireAvatarDesc: string;
    starAvatarDesc: string;
    coinBoosterDesc: string;
    expBoosterDesc: string;
    // Actions
    buy: string;
    purchased: string;
    notEnoughCoins: string;
    insufficient: string;
    duration: string;
    // Rarity
    common: string;
    rare: string;
    epic: string;
    legendary: string;
    mythic: string;
    // Badges
    new: string;
    popular: string;
    limitedTime: string;
    discount: string;
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
    profile: {
      title: 'ПРОФИЛЬ',
      back: 'Назад',
      online: 'Онлайн',
      coins: 'монет',
      avatar: 'АВАТАР',
      friends: 'ДРУЗЬЯ',
      statistics: 'СТАТИСТИКА',
      achievements: 'ДОСТИЖЕНИЯ',
      wallet: 'КОШЕЛЕК',
      skins: 'СКИНЫ',
      effects: 'ЭФФЕКТЫ',
      bonuses: 'БОНУСЫ',
      rating: 'Рейтинг',
      gamesPlayed: 'Игр сыграно',
      wins: 'Побед',
      losses: 'Поражений',
      winRate: 'Процент побед',
      // Достижения
      firstWin: 'Первая победа',
      firstWinDesc: 'Выиграйте свою первую игру',
      veteran: 'Ветеран',
      veteranDesc: 'Сыграйте 100 игр',
      master: 'Мастер',
      masterDesc: 'Выиграйте 50 игр',
      legend: 'Легенда',
      legendDesc: 'Достигните рейтинга 2000',
      // Бонусы
      dailyBonus: 'Ежедневный бонус',
      weeklyBonus: 'Недельный бонус',
      monthlyBonus: 'Месячный бонус',
      unavailable: 'НЕДОСТУПНО',
      // Кастомизация
      customization: 'КАСТОМИЗАЦИЯ',
      changeAvatar: 'Сменить аватар',
      selectSkin: 'Выбрать скин',
      selectEffect: 'Выбрать эффект',
      classic: 'Классический',
      premium: 'Премиум',
      vip: 'VIP',
      none: 'Нет',
      fire: 'Огонь',
      ice: 'Лед',
      lightning: 'Молния',
      // Кнопки
      close: 'Закрыть',
      apply: 'Применить',
      purchase: 'Купить',
      equipped: 'Экипировано'
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
      visualGuides: 'ВИЗУАЛЬНЫЕ ПОДСКАЗКИ',
      // Detailed rule descriptions
      gameDescription: 'P.I.D.R. - это увлекательная карточная игра на основе классического "Дурака" с уникальными механиками и стадиями.',
      playersCount: '4-9 человек',
      goalDescription: 'Избавиться от всех карт первым',
      cardsDescription: 'Стандартная колода 52 карты',
      hierarchyDescription: 'От младшей к старшей:',
      specialRuleDescription: 'Двойка (2) может побить только Туз (A)',
      suitsDescription: 'В первой стадии масти не важны. Во второй стадии действует правило: "Пики только Пикями!"',
      stage1Description: 'Простые правила',
      stage1Moves: 'Только верхней (открытой) картой',
      stage1Beat: 'Карта должна быть на 1 ранг выше',
      stage1Suits: 'Не важны в первой стадии',
      stage1Transition: 'Переход во вторую стадию когда у игрока остается 1 карта',
      stage2Description: 'Правила "Дурака"',
      stage2SpadesRule: '"Пики только Пикями!" - пики можно бить только пиками',
      stage2Moves: 'Можно ходить любыми картами с руки',
      stage2Beat: 'Бить по правилам "Дурака" + масти важны',
      stage2Transition: 'Переход в третью стадию когда открываются "пеньки"',
      stage3Description: 'Открытие "пеньков"',
      stage3FoolRules: 'Все правила "Дурака" + можно использовать закрытые карты',
      stage3Moves: 'Ходы любыми доступными картами',
      stage3Beat: 'Полные правила "Дурака" с мастями',
      stage3Algorithm: 'Алгоритм определения очередности хода',
      oneCardDescription: 'Когда у игрока остается одна карта, он должен объявить "ОДНА КАРТА!"',
      oneCardRule: 'Если не объявил - штраф: берет дополнительную карту из колоды',
      strategyDescription: 'Основные стратегические принципы игры в P.I.D.R.',
      strategyTips: 'Следите за картами противников, планируйте переходы между стадиями, используйте особенности каждой стадии',
      algorithmStage2: 'Алгоритм битья P.I.D.R.:',
      trump: 'Козырь',
      important: 'ВАЖНО',
      noThrowing: 'Никакого подкидывания карт нет!',
      suitNames: {
        spades: 'Пики',
        hearts: 'Червы',
        diamonds: 'Бубны',
        clubs: 'Трефы'
      }
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
      error: 'Ошибка покупки',
      // Categories
      featured: 'Рекомендуемые',
      skins: 'Скины',
      effects: 'Эффекты',
      boosters: 'Бустеры',
      bundles: 'Наборы',
      crypto: 'Криптопакеты',
      themes: 'Темы',
      cards: 'Карты',
      avatars: 'Аватары',
      // Items
      darkTheme: 'Темная тема',
      neonTheme: 'Неоновая тема',
      retroTheme: 'Ретро тема',
      goldenCard: 'Золотая карта',
      rainbowCard: 'Радужная карта',
      crystalCard: 'Кристальная карта',
      crownAvatar: 'Аватар с короной',
      fireAvatar: 'Огненный аватар',
      starAvatar: 'Звездный аватар',
      coinBooster: 'Бустер монет',
      expBooster: 'Бустер опыта',
      // Descriptions
      darkThemeDesc: 'Стильная темная тема для комфортной игры',
      neonThemeDesc: 'Яркая неоновая тема с эффектами',
      retroThemeDesc: 'Винтажная тема в стиле 80-х',
      goldenCardDesc: 'Эксклюзивная золотая карта',
      rainbowCardDesc: 'Переливающаяся всеми цветами карта',
      crystalCardDesc: 'Прозрачная карта с кристаллическим эффектом',
      crownAvatarDesc: 'Королевский аватар',
      fireAvatarDesc: 'Пылающий аватар',
      starAvatarDesc: 'Сияющий звездный аватар',
      coinBoosterDesc: 'Удваивает получение монет на 24 часа',
      expBoosterDesc: 'Увеличивает получение опыта в 1.5 раза на 12 часов',
      // Actions
      buy: 'Купить',
      purchased: 'Куплено',
      notEnoughCoins: 'Недостаточно монет',
      insufficient: 'Недостаточно',
      duration: 'Длительность',
      // Rarity
      common: 'Обычный',
      rare: 'Редкий',
      epic: 'Эпический',
      legendary: 'Легендарный',
      mythic: 'Мифический',
      // Badges
      new: 'Новинка',
      popular: 'Популярное',
      limitedTime: 'Ограниченное время',
      discount: 'Скидка'
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
    profile: {
      title: 'PROFILE',
      back: 'Back',
      online: 'Online',
      coins: 'coins',
      avatar: 'AVATAR',
      friends: 'FRIENDS',
      statistics: 'STATISTICS',
      achievements: 'ACHIEVEMENTS',
      wallet: 'WALLET',
      skins: 'SKINS',
      effects: 'EFFECTS',
      bonuses: 'BONUSES',
      rating: 'Rating',
      gamesPlayed: 'Games Played',
      wins: 'Wins',
      losses: 'Losses',
      winRate: 'Win Rate',
      // Достижения
      firstWin: 'First Victory',
      firstWinDesc: 'Win your first game',
      veteran: 'Veteran',
      veteranDesc: 'Play 100 games',
      master: 'Master',
      masterDesc: 'Win 50 games',
      legend: 'Legend',
      legendDesc: 'Reach rating 2000',
      // Бонусы
      dailyBonus: 'Daily Bonus',
      weeklyBonus: 'Weekly Bonus',
      monthlyBonus: 'Monthly Bonus',
      unavailable: 'UNAVAILABLE',
      // Кастомизация
      customization: 'CUSTOMIZATION',
      changeAvatar: 'Change Avatar',
      selectSkin: 'Select Skin',
      selectEffect: 'Select Effect',
      classic: 'Classic',
      premium: 'Premium',
      vip: 'VIP',
      none: 'None',
      fire: 'Fire',
      ice: 'Ice',
      lightning: 'Lightning',
      // Кнопки
      close: 'Close',
      apply: 'Apply',
      purchase: 'Purchase',
      equipped: 'Equipped'
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
      visualGuides: 'VISUAL GUIDES',
      // Detailed rule descriptions
      gameDescription: 'P.I.D.R. is an exciting card game based on the classic "Fool" with unique mechanics and stages.',
      playersCount: '4-9 people',
      goalDescription: 'Get rid of all cards first',
      cardsDescription: 'Standard 52-card deck',
      hierarchyDescription: 'From lowest to highest:',
      specialRuleDescription: 'Two (2) can only beat Ace (A)',
      suitsDescription: 'In the first stage, suits don\'t matter. In the second stage, the rule applies: "Spades only with Spades!"',
      stage1Description: 'Simple rules',
      stage1Moves: 'Only with the top (open) card',
      stage1Beat: 'Card must be 1 rank higher',
      stage1Suits: 'Not important in the first stage',
      stage1Transition: 'Transition to the second stage when player has 1 card left',
      stage2Description: '"Fool" rules',
      stage2SpadesRule: '"Spades only with Spades!" - spades can only be beaten by spades',
      stage2Moves: 'Can move with any cards from hand',
      stage2Beat: 'Beat according to "Fool" rules + suits matter',
      stage2Transition: 'Transition to third stage when "stumps" are revealed',
      stage3Description: 'Opening "stumps"',
      stage3FoolRules: 'All "Fool" rules + can use hidden cards',
      stage3Moves: 'Moves with any available cards',
      stage3Beat: 'Full "Fool" rules with suits',
      stage3Algorithm: 'Algorithm for determining turn order',
      oneCardDescription: 'When a player has one card left, they must declare "ONE CARD!"',
      oneCardRule: 'If not declared - penalty: takes an additional card from the deck',
      strategyDescription: 'Basic strategic principles of P.I.D.R. gameplay',
      strategyTips: 'Watch opponents\' cards, plan transitions between stages, use the features of each stage',
      algorithmStage2: 'P.I.D.R. beating algorithm:',
      trump: 'Trump',
      important: 'IMPORTANT',
      noThrowing: 'No card throwing allowed!',
      suitNames: {
        spades: 'Spades',
        hearts: 'Hearts',
        diamonds: 'Diamonds',
        clubs: 'Clubs'
      }
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
      error: 'Purchase error',
      // Categories
      featured: 'Featured',
      skins: 'Skins',
      effects: 'Effects',
      boosters: 'Boosters',
      bundles: 'Bundles',
      crypto: 'Crypto Packages',
      themes: 'Themes',
      cards: 'Cards',
      avatars: 'Avatars',
      // Items
      darkTheme: 'Dark Theme',
      neonTheme: 'Neon Theme',
      retroTheme: 'Retro Theme',
      goldenCard: 'Golden Card',
      rainbowCard: 'Rainbow Card',
      crystalCard: 'Crystal Card',
      crownAvatar: 'Crown Avatar',
      fireAvatar: 'Fire Avatar',
      starAvatar: 'Star Avatar',
      coinBooster: 'Coin Booster',
      expBooster: 'EXP Booster',
      // Descriptions
      darkThemeDesc: 'Stylish dark theme for comfortable gameplay',
      neonThemeDesc: 'Bright neon theme with effects',
      retroThemeDesc: 'Vintage 80s style theme',
      goldenCardDesc: 'Exclusive golden card',
      rainbowCardDesc: 'Card shimmering with all colors',
      crystalCardDesc: 'Transparent card with crystalline effect',
      crownAvatarDesc: 'Royal avatar',
      fireAvatarDesc: 'Flaming avatar',
      starAvatarDesc: 'Shining star avatar',
      coinBoosterDesc: 'Doubles coin earnings for 24 hours',
      expBoosterDesc: 'Increases EXP gain by 1.5x for 12 hours',
      // Actions
      buy: 'Buy',
      purchased: 'Purchased',
      notEnoughCoins: 'Not enough coins',
      insufficient: 'Insufficient',
      duration: 'Duration',
      // Rarity
      common: 'Common',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
      mythic: 'Mythic',
      // Badges
      new: 'New',
      popular: 'Popular',
      limitedTime: 'Limited Time',
      discount: 'Discount'
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
