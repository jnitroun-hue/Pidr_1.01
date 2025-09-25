# 🎮 Professional Game Table Components

Профессиональные компоненты игрового стола для P.I.D.R. с прямоугольной рассадкой игроков.

## 📋 Компоненты

### 1. `RectangularGameTable`
Основной игровой стол с правильной рассадкой игроков:
- **2 игрока сверху**
- **3 игрока слева** 
- **3 игрока справа**
- **1 игрок внизу** (основной - вы)

### 2. `PlayerHand`
Компонент руки игрока с:
- Интерактивными картами
- Анимациями выбора и игры
- Подсказками по правилам
- Адаптивной прокруткой

### 3. `ProfessionalGameTable`
Главный компонент, объединяющий стол и руку игрока:
- Уведомления
- Игровые действия
- Информационная панель
- Эффекты и анимации

## 🚀 Использование

### Базовый пример:

```tsx
import ProfessionalGameTable from './components/GameTable/ProfessionalGameTable';

function GamePage() {
  const [players, setPlayers] = useState<Player[]>([...]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('1');
  const [gameStage, setGameStage] = useState<1 | 2 | 3>(1);
  
  return (
    <ProfessionalGameTable
      players={players}
      currentPlayerId={currentPlayerId}
      gameStage={gameStage}
      playedCards={playedCards}
      deckCount={deckCount}
      onPlayerClick={handlePlayerClick}
      onCardSelect={handleCardSelect}
      onCardPlay={handleCardPlay}
      canPlayCard={canPlayCard}
      selectedCardIndex={selectedCardIndex}
      gameActions={{
        onTakeFromDeck: handleTakeFromDeck,
        onPassTurn: handlePassTurn,
        onDeclareOneCard: handleDeclareOneCard
      }}
    />
  );
}
```

### Структура Player:

```tsx
interface Player {
  id: string;
  name: string;
  isUser: boolean;
  hand: Card[];
  coins?: number;
  avatar?: string;
  status?: 'thinking' | 'waiting' | 'ready' | 'disconnected';
}
```

### Структура Card:

```tsx
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}
```

## 🎨 Особенности дизайна

### Цветовая схема:
- **Фон**: Градиент темно-синих оттенков
- **Стол**: Зеленый градиент (имитация покерного стола)
- **Акценты**: Золотой (#ffd700) для важных элементов
- **Статусы**: Зеленый (активный), желтый (ожидание), красный (ошибка)

### Анимации:
- **Framer Motion** для плавных переходов
- **Пульсация** для активных элементов
- **Hover-эффекты** для интерактивности
- **Частицы** для атмосферы

### Адаптивность:
- **Desktop**: Полный функционал
- **Tablet**: Адаптированные размеры
- **Mobile**: Оптимизированный интерфейс

## 🎯 Позиционирование игроков

Система автоматически рассаживает игроков в зависимости от их количества:

### 2-4 игрока:
- Простое распределение вокруг стола

### 5-9 игроков:
- 2 сверху (35%, 65% от ширины)
- 3 слева (25%, 50%, 75% от высоты)
- 3 справа (25%, 50%, 75% от высоты)
- 1 внизу по центру (основной игрок)

## 📱 Мобильная адаптация

### Размеры карт:
- **Desktop**: 80x112px
- **Tablet**: 60x84px  
- **Mobile**: 50x70px

### Интерфейс:
- Кнопки действий перемещаются вниз на мобильных
- Уведомления адаптируются под размер экрана
- Прокрутка карт для маленьких экранов

## 🔧 Настройка

### Изображения карт:
Поместите изображения карт в `/public/cards/` с именами:
- `hearts_A.png`, `hearts_K.png`, etc.
- `diamonds_A.png`, `diamonds_K.png`, etc.
- `clubs_A.png`, `clubs_K.png`, etc.
- `spades_A.png`, `spades_K.png`, etc.
- `back.png` (рубашка карты)

### Аватары:
Поместите аватары в `/public/avatars/`:
- `player.png` (основной игрок)
- `bot1.png`, `bot2.png`, etc. (боты)
- `default.png` (по умолчанию)

## 🎪 Демо

Запустите демо-страницу для тестирования:
```bash
npm run dev
# Перейдите на /game-demo
```

## 🎮 Интеграция с существующей игрой

Для интеграции с текущей игровой логикой:

1. Замените существующий компонент стола на `ProfessionalGameTable`
2. Адаптируйте структуру данных игроков
3. Подключите обработчики событий
4. Настройте логику `canPlayCard`

## 🌟 Преимущества

- ✅ **Профессиональный внешний вид**
- ✅ **Правильная рассадка игроков** 
- ✅ **Интуитивный интерфейс**
- ✅ **Плавные анимации**
- ✅ **Полная адаптивность**
- ✅ **Модульная архитектура**
- ✅ **TypeScript поддержка**

Компоненты готовы к продакшену и легко интегрируются с существующей игровой логикой P.I.D.R.!
