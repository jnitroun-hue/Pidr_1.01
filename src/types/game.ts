export type Card = {
  id: string;
  image: string;
  open: boolean;
  rank?: number; // Ранг карты (2-14, где 11=J, 12=Q, 13=K, 14=A)
  suit?: string; // Масть карты
};

export type Player = {
  id: string; // ИСПРАВЛЕНО: должно быть string как в gameStore
  name: string;
  avatar: string;
  cards: Card[];
  penki: Card[]; // Пеньки (2 закрытые карты, доступны в 3-й стадии)
  isUser: boolean;
  isBot?: boolean; // Является ли игрок ботом
  difficulty?: 'easy' | 'medium' | 'hard'; // Сложность бота
  canReceiveCard?: boolean; // Может ли игрок получить карту на верхнюю
};

export type GameStage = 1 | 2 | 3; // Добавили 3-ю стадию

export type GameState = {
  players: Player[];
  stage: GameStage;
  currentPlayer: number;
  dropZoneActive: boolean;
  deck: Card[]; // Колода
  availableTargets: number[]; // Индексы игроков, на которых можно положить карту
  mustDrawFromDeck: boolean; // Должен ли игрок взять карту из колоды
  canPlaceOnSelf: boolean; // Может ли игрок положить карту себе
}; 