/**
 * 🎬 GAME ANIMATIONS SYSTEM
 * Система анимаций для карт, стола и победы
 */

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface CardAnimation {
  element: HTMLElement;
  from: { x: number; y: number; rotation: number; scale: number };
  to: { x: number; y: number; rotation: number; scale: number };
  config: AnimationConfig;
}

export interface VictoryAnimation {
  type: 'fireworks' | 'confetti' | 'glow' | 'bounce';
  duration: number;
  intensity: number;
}

export class GameAnimationSystem {
  private animationQueue: (() => Promise<void>)[] = [];
  private isPlaying = false;

  /**
   * 🎴 АНИМАЦИИ КАРТ
   */

  // Анимация раздачи карт
  async animateCardDeal(
    cards: HTMLElement[],
    playerPositions: { x: number; y: number }[],
    deckPosition: { x: number; y: number }
  ): Promise<void> {
    const animations = cards.map((card, index) => {
      const playerIndex = index % playerPositions.length;
      const targetPos = playerPositions[playerIndex];
      
      return this.animateCard({
        element: card,
        from: { 
          x: deckPosition.x, 
          y: deckPosition.y, 
          rotation: 0, 
          scale: 0.8 
        },
        to: { 
          x: targetPos.x, 
          y: targetPos.y, 
          rotation: (Math.random() - 0.5) * 10, 
          scale: 1 
        },
        config: {
          duration: 800,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          delay: index * 150
        }
      });
    });

    await Promise.all(animations);
  }

  // Анимация переворота карты
  async animateCardFlip(card: HTMLElement, showFront: boolean = true): Promise<void> {
    return new Promise((resolve) => {
      const duration = 600;
      const halfDuration = duration / 2;

      // Первая половина - поворот на 90 градусов
      card.style.transition = `transform ${halfDuration}ms ease-in`;
      card.style.transform = `rotateY(90deg) scale(1.1)`;

      setTimeout(() => {
        // Меняем содержимое карты
        if (showFront) {
          card.classList.add('flipped');
        } else {
          card.classList.remove('flipped');
        }

        // Вторая половина - доворот до 180 или 0 градусов
        card.style.transition = `transform ${halfDuration}ms ease-out`;
        card.style.transform = showFront ? 'rotateY(0deg) scale(1)' : 'rotateY(180deg) scale(1)';

        setTimeout(() => {
          card.style.transition = '';
          resolve();
        }, halfDuration);
      }, halfDuration);
    });
  }

  // Анимация полета карты
  async animateCardFly(
    card: HTMLElement,
    from: { x: number; y: number },
    to: { x: number; y: number },
    config?: Partial<AnimationConfig>
  ): Promise<void> {
    const animConfig = {
      duration: 1000,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      ...config
    };

    return this.animateCard({
      element: card,
      from: { x: from.x, y: from.y, rotation: 0, scale: 1 },
      to: { 
        x: to.x, 
        y: to.y, 
        rotation: (Math.random() - 0.5) * 20,
        scale: 1.1 
      },
      config: animConfig
    });
  }

  // Базовая анимация карты
  private animateCard(animation: CardAnimation): Promise<void> {
    return new Promise((resolve) => {
      const { element, from, to, config } = animation;
      
      // Устанавливаем начальное состояние
      element.style.transform = `translate(${from.x}px, ${from.y}px) rotate(${from.rotation}deg) scale(${from.scale})`;
      element.style.transition = `transform ${config.duration}ms ${config.easing}`;
      
      if (config.delay) {
        setTimeout(() => {
          element.style.transform = `translate(${to.x}px, ${to.y}px) rotate(${to.rotation}deg) scale(${to.scale})`;
        }, config.delay);
      } else {
        element.style.transform = `translate(${to.x}px, ${to.y}px) rotate(${to.rotation}deg) scale(${to.scale})`;
      }

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, config.duration + (config.delay || 0));
    });
  }

  /**
   * 🎲 АНИМАЦИИ СТОЛА
   */

  // Появление стола
  async animateTableAppearance(table: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      table.style.opacity = '0';
      table.style.transform = 'scale(0.8) rotateX(45deg)';
      table.style.transition = 'all 1500ms cubic-bezier(0.34, 1.56, 0.64, 1)';

      requestAnimationFrame(() => {
        table.style.opacity = '1';
        table.style.transform = 'scale(1) rotateX(0deg)';
      });

      setTimeout(() => {
        table.style.transition = '';
        resolve();
      }, 1500);
    });
  }

  // Пульсация стола
  animateTablePulse(table: HTMLElement, color: string = '#00ff88'): void {
    table.style.animation = `tablePulse 2s infinite`;
    
    // Добавляем CSS анимацию если её нет
    if (!document.getElementById('tablePulseStyles')) {
      const style = document.createElement('style');
      style.id = 'tablePulseStyles';
      style.textContent = `
        @keyframes tablePulse {
          0%, 100% {
            box-shadow: 0 0 20px ${color}60;
            border-color: ${color}80;
          }
          50% {
            box-shadow: 0 0 40px ${color}80, 0 0 60px ${color}40;
            border-color: ${color}ff;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Остановка пульсации стола
  stopTablePulse(table: HTMLElement): void {
    table.style.animation = '';
  }

  /**
   * 🏆 АНИМАЦИИ ПОБЕДЫ
   */

  // Анимация фейерверков
  async animateFireworks(container: HTMLElement, duration: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      const fireworks: HTMLElement[] = [];
      const colors = ['#ff0080', '#00ff88', '#ffd700', '#ff6b35', '#9370db'];

      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          const firework = this.createFirework(colors[i % colors.length]);
          container.appendChild(firework);
          fireworks.push(firework);

          // Позиционируем случайно
          firework.style.left = Math.random() * container.offsetWidth + 'px';
          firework.style.top = Math.random() * container.offsetHeight + 'px';

          // Удаляем через 2 секунды
          setTimeout(() => {
            if (firework.parentNode) {
              firework.parentNode.removeChild(firework);
            }
          }, 2000);
        }, i * 200);
      }

      setTimeout(() => {
        // Очищаем оставшиеся элементы
        fireworks.forEach(fw => {
          if (fw.parentNode) {
            fw.parentNode.removeChild(fw);
          }
        });
        resolve();
      }, duration);
    });
  }

  // Анимация конфетти
  async animateConfetti(container: HTMLElement, duration: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      const confettiPieces: HTMLElement[] = [];
      const colors = ['#ff0080', '#00ff88', '#ffd700', '#ff6b35', '#9370db'];

      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const piece = this.createConfettiPiece(colors[i % colors.length]);
          container.appendChild(piece);
          confettiPieces.push(piece);

          // Анимация падения
          piece.style.left = Math.random() * container.offsetWidth + 'px';
          piece.style.top = '-20px';
          piece.style.transition = `transform ${2000 + Math.random() * 1000}ms linear`;
          
          requestAnimationFrame(() => {
            piece.style.transform = `translateY(${container.offsetHeight + 50}px) rotate(${360 * (Math.random() * 3 + 1)}deg)`;
          });

          setTimeout(() => {
            if (piece.parentNode) {
              piece.parentNode.removeChild(piece);
            }
          }, 3000);
        }, i * 60);
      }

      setTimeout(() => {
        confettiPieces.forEach(piece => {
          if (piece.parentNode) {
            piece.parentNode.removeChild(piece);
          }
        });
        resolve();
      }, duration);
    });
  }

  // Анимация свечения победителя
  async animateVictoryGlow(player: HTMLElement, color: string = '#ffd700'): Promise<void> {
    return new Promise((resolve) => {
      player.style.animation = `victoryGlow 1s ease-in-out 3`;
      
      // Добавляем CSS анимацию если её нет
      if (!document.getElementById('victoryGlowStyles')) {
        const style = document.createElement('style');
        style.id = 'victoryGlowStyles';
        style.textContent = `
          @keyframes victoryGlow {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 20px ${color}60;
              filter: brightness(1);
            }
            50% {
              transform: scale(1.1);
              box-shadow: 0 0 40px ${color}80, 0 0 60px ${color}40;
              filter: brightness(1.3);
            }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        player.style.animation = '';
        resolve();
      }, 3000);
    });
  }

  // Анимация подпрыгивания
  async animateVictoryBounce(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      element.style.animation = 'victoryBounce 0.6s ease-in-out 3';
      
      if (!document.getElementById('victoryBounceStyles')) {
        const style = document.createElement('style');
        style.id = 'victoryBounceStyles';
        style.textContent = `
          @keyframes victoryBounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0) scale(1);
            }
            40% {
              transform: translateY(-30px) scale(1.1);
            }
            60% {
              transform: translateY(-15px) scale(1.05);
            }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        element.style.animation = '';
        resolve();
      }, 1800);
    });
  }

  /**
   * 🎨 СОЗДАНИЕ ЭФФЕКТОВ
   */

  private createFirework(color: string): HTMLElement {
    const firework = document.createElement('div');
    firework.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: fireworkExplosion 2s ease-out forwards;
    `;

    // Добавляем CSS анимацию взрыва
    if (!document.getElementById('fireworkStyles')) {
      const style = document.createElement('style');
      style.id = 'fireworkStyles';
      style.textContent = `
        @keyframes fireworkExplosion {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          15% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return firework;
  }

  private createConfettiPiece(color: string): HTMLElement {
    const piece = document.createElement('div');
    const shapes = ['square', 'circle', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    piece.style.cssText = `
      position: absolute;
      width: ${8 + Math.random() * 6}px;
      height: ${8 + Math.random() * 6}px;
      background: ${color};
      pointer-events: none;
      z-index: 1000;
    `;

    if (shape === 'circle') {
      piece.style.borderRadius = '50%';
    } else if (shape === 'triangle') {
      piece.style.width = '0';
      piece.style.height = '0';
      piece.style.background = 'transparent';
      piece.style.borderLeft = '6px solid transparent';
      piece.style.borderRight = '6px solid transparent';
      piece.style.borderBottom = `12px solid ${color}`;
    }

    return piece;
  }

  /**
   * 🎵 УПРАВЛЕНИЕ ОЧЕРЕДЬЮ АНИМАЦИЙ
   */

  async playAnimationSequence(animations: (() => Promise<void>)[]): Promise<void> {
    for (const animation of animations) {
      await animation();
    }
  }

  async playAnimationParallel(animations: (() => Promise<void>)[]): Promise<void> {
    await Promise.all(animations.map(anim => anim()));
  }

  /**
   * 🎯 ГОТОВЫЕ КОМБИНАЦИИ АНИМАЦИЙ
   */

  // Полная анимация начала игры
  async animateGameStart(
    table: HTMLElement,
    cards: HTMLElement[],
    playerPositions: { x: number; y: number }[],
    deckPosition: { x: number; y: number }
  ): Promise<void> {
    // Сначала появляется стол
    await this.animateTableAppearance(table);
    
    // Затем раздача карт
    await this.animateCardDeal(cards, playerPositions, deckPosition);
    
    // Пульсация стола для готовности
    this.animateTablePulse(table, '#00ff88');
    setTimeout(() => this.stopTablePulse(table), 2000);
  }

  // Полная анимация победы
  async animateVictory(
    winner: HTMLElement,
    container: HTMLElement,
    victoryType: VictoryAnimation['type'] = 'fireworks'
  ): Promise<void> {
    const animations: (() => Promise<void>)[] = [];

    // Анимация победителя
    animations.push(() => this.animateVictoryGlow(winner));
    animations.push(() => this.animateVictoryBounce(winner));

    // Эффекты фона
    if (victoryType === 'fireworks') {
      animations.push(() => this.animateFireworks(container));
    } else if (victoryType === 'confetti') {
      animations.push(() => this.animateConfetti(container));
    }

    await this.playAnimationParallel(animations);
  }
}

// Экспорт singleton
export const gameAnimationSystem = new GameAnimationSystem();
