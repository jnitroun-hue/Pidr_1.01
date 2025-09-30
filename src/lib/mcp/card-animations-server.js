#!/usr/bin/env node

/**
 * 🎮 MCP SERVER FOR CARD ANIMATIONS
 * Сервер для создания анимаций карт в игре
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

class CardAnimationsServer {
  constructor() {
    this.server = new Server(
      {
        name: 'card-animations-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Список доступных инструментов
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_card_flip_animation',
          description: 'Генерирует CSS анимацию переворота карты',
          inputSchema: {
            type: 'object',
            properties: {
              duration: { type: 'number', description: 'Длительность анимации в секундах' },
              easing: { type: 'string', description: 'Функция сглаживания' },
              direction: { type: 'string', enum: ['horizontal', 'vertical'] }
            }
          }
        },
        {
          name: 'generate_card_deal_animation',
          description: 'Генерирует анимацию раздачи карт',
          inputSchema: {
            type: 'object',
            properties: {
              playerCount: { type: 'number', description: 'Количество игроков' },
              delay: { type: 'number', description: 'Задержка между картами' },
              startPosition: { type: 'object', description: 'Начальная позиция (x, y)' }
            }
          }
        },
        {
          name: 'generate_card_hover_animation',
          description: 'Генерирует анимацию наведения на карту',
          inputSchema: {
            type: 'object',
            properties: {
              scale: { type: 'number', description: 'Масштаб при наведении' },
              glowColor: { type: 'string', description: 'Цвет свечения' },
              duration: { type: 'number', description: 'Длительность анимации' }
            }
          }
        },
        {
          name: 'generate_table_layout_positions',
          description: 'Генерирует позиции игроков за прямоугольным столом',
          inputSchema: {
            type: 'object',
            properties: {
              playerCount: { type: 'number', description: 'Количество игроков (до 9)' },
              tableWidth: { type: 'number', description: 'Ширина стола' },
              tableHeight: { type: 'number', description: 'Высота стола' }
            }
          }
        }
      ]
    }));

    // Обработчик вызовов инструментов
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'generate_card_flip_animation':
          return this.generateCardFlipAnimation(args);
        case 'generate_card_deal_animation':
          return this.generateCardDealAnimation(args);
        case 'generate_card_hover_animation':
          return this.generateCardHoverAnimation(args);
        case 'generate_table_layout_positions':
          return this.generateTableLayoutPositions(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  generateCardFlipAnimation(args) {
    const { duration = 0.6, easing = 'ease-in-out', direction = 'horizontal' } = args;
    
    const axis = direction === 'horizontal' ? 'Y' : 'X';
    
    const css = `
/* 🎴 Card Flip Animation */
.card-flip {
  perspective: 1000px;
  transform-style: preserve-3d;
  transition: transform ${duration}s ${easing};
}

.card-flip.flipped {
  transform: rotate${axis}(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 12px;
}

.card-back {
  transform: rotate${axis}(180deg);
}

/* Анимация с эффектом свечения */
.card-flip:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 255, 136, 0.3);
}
`;

    const js = `
// JavaScript для управления переворотом карт
export const flipCard = (cardElement, showFront = true) => {
  if (showFront) {
    cardElement.classList.add('flipped');
  } else {
    cardElement.classList.remove('flipped');
  }
};

export const flipAllCards = (cardElements, delay = 100) => {
  cardElements.forEach((card, index) => {
    setTimeout(() => flipCard(card, true), index * delay);
  });
};
`;

    return {
      content: [
        {
          type: 'text',
          text: `Generated card flip animation:\n\nCSS:\n${css}\n\nJavaScript:\n${js}`
        }
      ]
    };
  }

  generateCardDealAnimation(args) {
    const { playerCount = 4, delay = 200, startPosition = { x: 50, y: 50 } } = args;
    
    const css = `
/* 🎯 Card Deal Animation */
@keyframes dealCard {
  0% {
    transform: translate(${startPosition.x}px, ${startPosition.y}px) rotate(0deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--target-x), var(--target-y)) rotate(var(--target-rotation, 0deg));
    opacity: 1;
  }
}

.card-dealing {
  animation: dealCard 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  z-index: 100;
}

.card-dealing:nth-child(1) { animation-delay: 0ms; }
.card-dealing:nth-child(2) { animation-delay: ${delay}ms; }
.card-dealing:nth-child(3) { animation-delay: ${delay * 2}ms; }
.card-dealing:nth-child(4) { animation-delay: ${delay * 3}ms; }
.card-dealing:nth-child(5) { animation-delay: ${delay * 4}ms; }
.card-dealing:nth-child(6) { animation-delay: ${delay * 5}ms; }
.card-dealing:nth-child(7) { animation-delay: ${delay * 6}ms; }
.card-dealing:nth-child(8) { animation-delay: ${delay * 7}ms; }
.card-dealing:nth-child(9) { animation-delay: ${delay * 8}ms; }

/* Эффект полета карты */
.card-flying {
  position: absolute;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
`;

    const js = `
// JavaScript для анимации раздачи карт
export const dealCardsToPlayers = (cards, playerPositions) => {
  cards.forEach((card, index) => {
    const playerIndex = index % ${playerCount};
    const targetPos = playerPositions[playerIndex];
    
    card.style.setProperty('--target-x', targetPos.x + 'px');
    card.style.setProperty('--target-y', targetPos.y + 'px');
    card.style.setProperty('--target-rotation', (Math.random() - 0.5) * 10 + 'deg');
    
    card.classList.add('card-dealing');
    
    setTimeout(() => {
      card.classList.remove('card-dealing');
    }, 800 + (index * ${delay}));
  });
};
`;

    return {
      content: [
        {
          type: 'text',
          text: `Generated card deal animation for ${playerCount} players:\n\nCSS:\n${css}\n\nJavaScript:\n${js}`
        }
      ]
    };
  }

  generateCardHoverAnimation(args) {
    const { scale = 1.1, glowColor = '#00ff88', duration = 0.3 } = args;
    
    const css = `
/* ✨ Card Hover Animation */
.card-interactive {
  transition: all ${duration}s ease;
  cursor: pointer;
  position: relative;
}

.card-interactive:hover {
  transform: scale(${scale}) translateY(-10px);
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.3),
    0 0 30px ${glowColor}40,
    inset 0 0 20px ${glowColor}20;
  z-index: 10;
}

.card-interactive:active {
  transform: scale(${scale * 0.95}) translateY(-5px);
  transition: all 0.1s ease;
}

/* Эффект пульсации для выбранной карты */
.card-selected {
  animation: cardPulse 2s infinite;
}

@keyframes cardPulse {
  0%, 100% {
    box-shadow: 0 0 20px ${glowColor}60;
  }
  50% {
    box-shadow: 0 0 40px ${glowColor}80, 0 0 60px ${glowColor}40;
  }
}

/* Анимация появления карты */
.card-appear {
  animation: cardAppear 0.5s ease-out forwards;
}

@keyframes cardAppear {
  0% {
    opacity: 0;
    transform: scale(0.8) rotateY(-90deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotateY(0deg);
  }
}
`;

    return {
      content: [
        {
          type: 'text',
          text: `Generated card hover animation:\n\nCSS:\n${css}`
        }
      ]
    };
  }

  generateTableLayoutPositions(args) {
    const { playerCount = 9, tableWidth = 800, tableHeight = 400 } = args;
    
    // Позиции для прямоугольного стола (3-2-3-1 расположение)
    const positions = this.calculateRectanglePositions(playerCount, tableWidth, tableHeight);
    
    const css = `
/* 🎲 Rectangle Table Layout for ${playerCount} players */
.game-table-container {
  position: relative;
  width: ${tableWidth}px;
  height: ${tableHeight}px;
  margin: 50px auto;
}

.rectangular-table {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0f4c3a 0%, #1a5f4a 50%, #0f4c3a 100%);
  border: 8px solid #d4af37;
  border-radius: 20px;
  box-shadow: 
    inset 0 0 50px rgba(212, 175, 55, 0.3),
    0 20px 40px rgba(0, 0, 0, 0.4);
  position: relative;
}

.rectangular-table::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;
  border: 2px solid #d4af37;
  border-radius: 12px;
  opacity: 0.6;
}

${positions.map((pos, index) => `
.player-seat-${index} {
  position: absolute;
  left: ${pos.x}px;
  top: ${pos.y}px;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #2c5f4a 0%, #1a4a3a 100%);
  border: 3px solid #d4af37;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  transition: all 0.3s ease;
}

.player-seat-${index}:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.6);
}
`).join('\n')}

/* Карты игроков */
.player-cards {
  position: absolute;
  display: flex;
  gap: 5px;
}

${positions.map((pos, index) => `
.player-${index}-cards {
  left: ${pos.cardX}px;
  top: ${pos.cardY}px;
  transform: translate(-50%, -50%);
}
`).join('\n')}
`;

    const js = `
// JavaScript для управления расположением игроков
export const getPlayerPositions = () => {
  return ${JSON.stringify(positions, null, 2)};
};

export const animatePlayerJoin = (playerIndex) => {
  const seat = document.querySelector(\`.player-seat-\${playerIndex}\`);
  if (seat) {
    seat.style.animation = 'playerJoin 0.5s ease-out';
  }
};

// CSS анимация появления игрока
const playerJoinCSS = \`
@keyframes playerJoin {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
\`;
`;

    return {
      content: [
        {
          type: 'text',
          text: `Generated rectangle table layout for ${playerCount} players:\n\nPositions: ${JSON.stringify(positions, null, 2)}\n\nCSS:\n${css}\n\nJavaScript:\n${js}`
        }
      ]
    };
  }

  calculateRectanglePositions(playerCount, width, height) {
    const positions = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const margin = 100; // Отступ от края стола

    if (playerCount <= 9) {
      // 3 слева
      for (let i = 0; i < 3 && positions.length < playerCount; i++) {
        positions.push({
          x: margin,
          y: (height / 4) * (i + 1),
          cardX: margin + 60,
          cardY: (height / 4) * (i + 1),
          side: 'left'
        });
      }

      // 2 сверху
      for (let i = 0; i < 2 && positions.length < playerCount; i++) {
        positions.push({
          x: (width / 3) * (i + 1),
          y: margin,
          cardX: (width / 3) * (i + 1),
          cardY: margin + 60,
          side: 'top'
        });
      }

      // 3 справа
      for (let i = 0; i < 3 && positions.length < playerCount; i++) {
        positions.push({
          x: width - margin,
          y: (height / 4) * (i + 1),
          cardX: width - margin - 60,
          cardY: (height / 4) * (i + 1),
          side: 'right'
        });
      }

      // 1 снизу (главный игрок)
      if (positions.length < playerCount) {
        positions.push({
          x: centerX,
          y: height - margin,
          cardX: centerX,
          cardY: height - margin - 60,
          side: 'bottom',
          isMainPlayer: true
        });
      }
    }

    return positions.slice(0, playerCount);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🎮 Card Animations MCP Server running');
  }
}

const server = new CardAnimationsServer();
server.run().catch(console.error);
