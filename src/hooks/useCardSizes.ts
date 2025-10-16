import { useState, useEffect } from 'react';

/**
 * Хук для определения адаптивных размеров карт на основе ширины экрана
 */
export function useCardSizes() {
  const [cardSizes, setCardSizes] = useState({
    // Карты вокруг стола
    tableCard: { width: 60, height: 90 },
    // Карты в руке игрока
    handCard: { width: 70, height: 105 },
    // Колода
    deckCard: { width: 36, height: 54 },
    // Аватары
    avatar: { width: 40, height: 40 },
  });

  useEffect(() => {
    const updateCardSizes = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;

      // LARGE DESKTOP (>1200px)
      if (width > 1200) {
        setCardSizes({
          tableCard: { width: 95, height: 138 },
          handCard: { width: 90, height: 135 },
          deckCard: { width: 50, height: 75 },
          avatar: { width: 50, height: 50 },
        });
      }
      // MEDIUM DESKTOP (769px - 1200px)
      else if (width > 768) {
        setCardSizes({
          tableCard: { width: 80, height: 116 },
          handCard: { width: 82, height: 123 },
          deckCard: { width: 45, height: 67 },
          avatar: { width: 44, height: 44 },
        });
      }
      // TABLET (481px - 768px)
      else if (width > 480) {
        setCardSizes({
          tableCard: { width: 70, height: 102 },
          handCard: { width: 75, height: 112 },
          deckCard: { width: 40, height: 60 },
          avatar: { width: 38, height: 38 },
        });
      }
      // MOBILE (до 480px)
      else {
        setCardSizes({
          tableCard: { width: 60, height: 90 },
          handCard: { width: 70, height: 105 },
          deckCard: { width: 36, height: 54 },
          avatar: { width: 40, height: 40 },
        });
      }
    };

    // Обновляем сразу
    updateCardSizes();

    // Слушаем изменения размера окна
    window.addEventListener('resize', updateCardSizes);
    window.addEventListener('orientationchange', updateCardSizes);

    return () => {
      window.removeEventListener('resize', updateCardSizes);
      window.removeEventListener('orientationchange', updateCardSizes);
    };
  }, []);

  return cardSizes;
}

