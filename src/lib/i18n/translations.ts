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
      play: 'Играть',
      wallet: 'Кошелек',
      shop: 'Магазин',
      rating: 'Рейтинг',
      friends: 'Друзья',
      settings: 'Настройки',
      profile: 'Профиль'
    },
    game: {
      findRoom: 'Найти комнату',
      createRoom: 'Создать комнату',
      joinRoom: 'Войти в комнату',
      waiting: 'Ожидание игроков',
      playing: 'Игра идет',
      finished: 'Игра завершена',
      winner: 'Победитель',
      coins: 'Монеты',
      players: 'Игроки'
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
      initializing: 'Инициализация игры...',
      connecting: 'Подключение к серверу...',
      loadingGame: 'Загрузка игровых данных...',
      preparingCards: 'Подготовка карт...',
      almostReady: 'Почти готово...'
    }
  },
  en: {
    mainMenu: {
      title: 'P.I.D.R. GAME',
      play: 'Play',
      wallet: 'Wallet',
      shop: 'Shop',
      rating: 'Rating',
      friends: 'Friends',
      settings: 'Settings',
      profile: 'Profile'
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
      players: 'Players'
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
      initializing: 'Initializing game...',
      connecting: 'Connecting to server...',
      loadingGame: 'Loading game data...',
      preparingCards: 'Preparing cards...',
      almostReady: 'Almost ready...'
    }
  }
};

// Хук для использования переводов
export function useTranslations(language: Language = 'ru'): Translations {
  return translations[language];
}
