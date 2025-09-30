/**
 * 🎲 CANVAS GENERATOR FOR PREMIUM GAME TABLE
 * Генерация топового игрового стола с помощью Canvas
 */

export class TableCanvasGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Генерация премиум игрового стола
   */
  async generatePremiumTable(
    width: number = 800,
    height: number = 500,
    style: 'classic' | 'neon' | 'luxury' = 'luxury'
  ): Promise<string> {
    this.canvas.width = width;
    this.canvas.height = height;

    // Очищаем canvas
    this.ctx.clearRect(0, 0, width, height);

    switch (style) {
      case 'luxury':
        return this.generateLuxuryTable(width, height);
      case 'neon':
        return this.generateNeonTable(width, height);
      case 'classic':
      default:
        return this.generateClassicTable(width, height);
    }
  }

  /**
   * Роскошный стол с кожаной текстурой и золотыми элементами
   */
  private generateLuxuryTable(width: number, height: number): string {
    // Очищаем canvas
    this.ctx.clearRect(0, 0, width, height);

    // Основной фон стола с улучшенным градиентом
    const mainGradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    mainGradient.addColorStop(0, '#1a5f4a');
    mainGradient.addColorStop(0.4, '#0f4c3a');
    mainGradient.addColorStop(0.8, '#0a3d2e');
    mainGradient.addColorStop(1, '#051f1a');
    
    this.ctx.fillStyle = mainGradient;
    this.roundRect(0, 0, width, height, 32);
    this.ctx.fill();

    // Внешняя золотая рамка
    const outerGoldGradient = this.ctx.createLinearGradient(0, 0, width, height);
    outerGoldGradient.addColorStop(0, '#ffd700');
    outerGoldGradient.addColorStop(0.25, '#ffed4e');
    outerGoldGradient.addColorStop(0.5, '#d4af37');
    outerGoldGradient.addColorStop(0.75, '#b8860b');
    outerGoldGradient.addColorStop(1, '#ffd700');
    
    this.ctx.strokeStyle = outerGoldGradient;
    this.ctx.lineWidth = 12;
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 15;
    this.roundRect(6, 6, width - 12, height - 12, 28);
    this.ctx.stroke();

    // Сброс тени
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';

    // Внутренняя рамка
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 4;
    this.roundRect(20, 20, width - 40, height - 40, 20);
    this.ctx.stroke();

    // Улучшенная кожаная текстура
    this.generatePremiumLeatherTexture(24, 24, width - 48, height - 48);

    // Декоративные элементы
    this.generateLuxuryDecorations(width, height);

    // Центральная эмблема
    this.generatePremiumEmblem(width / 2, height / 2);

    // Позиции игроков с улучшенным дизайном
    this.generateLuxuryPlayerPositions(width, height);

    // Дополнительные световые эффекты
    this.addLightingEffects(width, height);

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Неоновый стол в киберпанк стиле
   */
  private generateNeonTable(width: number, height: number): string {
    // Темный фон
    const darkGradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    darkGradient.addColorStop(0, '#1a1a2e');
    darkGradient.addColorStop(0.7, '#16213e');
    darkGradient.addColorStop(1, '#0f0f23');
    
    this.ctx.fillStyle = darkGradient;
    this.roundRect(0, 0, width, height, 24);
    this.ctx.fill();

    // Неоновые рамки
    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 20;
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 4;
    this.roundRect(8, 8, width - 16, height - 16, 20);
    this.ctx.stroke();

    // Внутренняя неоновая рамка
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = '#ff0080';
    this.ctx.lineWidth = 2;
    this.roundRect(16, 16, width - 32, height - 32, 16);
    this.ctx.stroke();

    // Сброс тени
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';

    // Сетка в центре
    this.generateNeonGrid(width, height);

    // Неоновые позиции игроков
    this.generateNeonPlayerPositions(width, height);

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Классический зеленый стол
   */
  private generateClassicTable(width: number, height: number): string {
    // Зеленый фон
    const greenGradient = this.ctx.createLinearGradient(0, 0, width, height);
    greenGradient.addColorStop(0, '#228b22');
    greenGradient.addColorStop(0.5, '#32cd32');
    greenGradient.addColorStop(1, '#228b22');
    
    this.ctx.fillStyle = greenGradient;
    this.roundRect(0, 0, width, height, 20);
    this.ctx.fill();

    // Деревянная рамка
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 6;
    this.roundRect(6, 6, width - 12, height - 12, 16);
    this.ctx.stroke();

    // Внутренняя рамка
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 2;
    this.roundRect(12, 12, width - 24, height - 24, 12);
    this.ctx.stroke();

    // Классические позиции игроков
    this.generateClassicPlayerPositions(width, height);

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Генерация кожаной текстуры
   */
  private generateLeatherTexture(x: number, y: number, w: number, h: number): void {
    // Базовый цвет кожи
    this.ctx.fillStyle = '#1a5f4a';
    this.ctx.fillRect(x, y, w, h);

    // Текстура кожи
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 50; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const size = Math.random() * 3 + 1;
      
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Морщины на коже
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + Math.random() * w, y + Math.random() * h);
      this.ctx.lineTo(x + Math.random() * w, y + Math.random() * h);
      this.ctx.stroke();
    }
  }

  /**
   * Декоративные углы
   */
  private generateCornerDecorations(width: number, height: number): void {
    this.ctx.fillStyle = '#d4af37';
    const cornerSize = 30;

    // Верхний левый угол
    this.ctx.beginPath();
    this.ctx.moveTo(30, 30);
    this.ctx.lineTo(30 + cornerSize, 30);
    this.ctx.lineTo(30, 30 + cornerSize);
    this.ctx.closePath();
    this.ctx.fill();

    // Остальные углы аналогично
    // Верхний правый
    this.ctx.beginPath();
    this.ctx.moveTo(width - 30, 30);
    this.ctx.lineTo(width - 30 - cornerSize, 30);
    this.ctx.lineTo(width - 30, 30 + cornerSize);
    this.ctx.closePath();
    this.ctx.fill();

    // Нижний левый
    this.ctx.beginPath();
    this.ctx.moveTo(30, height - 30);
    this.ctx.lineTo(30 + cornerSize, height - 30);
    this.ctx.lineTo(30, height - 30 - cornerSize);
    this.ctx.closePath();
    this.ctx.fill();

    // Нижний правый
    this.ctx.beginPath();
    this.ctx.moveTo(width - 30, height - 30);
    this.ctx.lineTo(width - 30 - cornerSize, height - 30);
    this.ctx.lineTo(width - 30, height - 30 - cornerSize);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Центральная эмблема
   */
  private generateCenterEmblem(x: number, y: number): void {
    // Золотой круг
    this.ctx.fillStyle = '#d4af37';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 40, 0, 2 * Math.PI);
    this.ctx.fill();

    // Внутренний круг
    this.ctx.fillStyle = '#0f4c3a';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 32, 0, 2 * Math.PI);
    this.ctx.fill();

    // Символ в центре (♠)
    this.ctx.fillStyle = '#d4af37';
    this.ctx.font = 'bold 32px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('♠', x, y);
  }

  /**
   * Позиции игроков для роскошного стола
   */
  private generatePlayerPositions(width: number, height: number): void {
    const positions = [
      // Главный игрок снизу
      { x: width * 0.5, y: height * 0.85 },
      // Левая сторона
      { x: width * 0.08, y: height * 0.2 },
      { x: width * 0.08, y: height * 0.5 },
      { x: width * 0.08, y: height * 0.8 },
      // Верх
      { x: width * 0.3, y: height * 0.08 },
      { x: width * 0.7, y: height * 0.08 },
      // Правая сторона
      { x: width * 0.92, y: height * 0.2 },
      { x: width * 0.92, y: height * 0.5 },
      { x: width * 0.92, y: height * 0.8 },
    ];

    positions.forEach((pos, index) => {
      // Золотой круг для позиции
      this.ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 25, 0, 2 * Math.PI);
      this.ctx.fill();

      // Рамка
      this.ctx.strokeStyle = '#d4af37';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Номер позиции
      this.ctx.fillStyle = '#d4af37';
      this.ctx.font = 'bold 14px serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText((index + 1).toString(), pos.x, pos.y);
    });
  }

  /**
   * Неоновые позиции игроков
   */
  private generateNeonPlayerPositions(width: number, height: number): void {
    const positions = [
      { x: width * 0.5, y: height * 0.85 },
      { x: width * 0.08, y: height * 0.2 },
      { x: width * 0.08, y: height * 0.5 },
      { x: width * 0.08, y: height * 0.8 },
      { x: width * 0.3, y: height * 0.08 },
      { x: width * 0.7, y: height * 0.08 },
      { x: width * 0.92, y: height * 0.2 },
      { x: width * 0.92, y: height * 0.5 },
      { x: width * 0.92, y: height * 0.8 },
    ];

    positions.forEach((pos, index) => {
      this.ctx.shadowColor = index === 0 ? '#00ff88' : '#ff0080';
      this.ctx.shadowBlur = 15;
      
      // Неоновый круг
      this.ctx.strokeStyle = index === 0 ? '#00ff88' : '#ff0080';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Внутренний круг
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      this.ctx.stroke();
    });

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Классические позиции игроков
   */
  private generateClassicPlayerPositions(width: number, height: number): void {
    const positions = [
      { x: width * 0.5, y: height * 0.85 },
      { x: width * 0.08, y: height * 0.2 },
      { x: width * 0.08, y: height * 0.5 },
      { x: width * 0.08, y: height * 0.8 },
      { x: width * 0.3, y: height * 0.08 },
      { x: width * 0.7, y: height * 0.08 },
      { x: width * 0.92, y: height * 0.2 },
      { x: width * 0.92, y: height * 0.5 },
      { x: width * 0.92, y: height * 0.8 },
    ];

    positions.forEach((pos) => {
      // Деревянный круг
      this.ctx.fillStyle = '#8b4513';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
      this.ctx.fill();

      // Зеленый внутренний круг
      this.ctx.fillStyle = '#32cd32';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  /**
   * Неоновая сетка
   */
  private generateNeonGrid(width: number, height: number): void {
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
    this.ctx.lineWidth = 1;

    // Вертикальные линии
    for (let x = 50; x < width - 50; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 50);
      this.ctx.lineTo(x, height - 50);
      this.ctx.stroke();
    }

    // Горизонтальные линии
    for (let y = 50; y < height - 50; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(50, y);
      this.ctx.lineTo(width - 50, y);
      this.ctx.stroke();
    }
  }

  /**
   * Утилита для рисования скругленного прямоугольника
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // Новые методы для улучшенного стола

  private generatePremiumLeatherTexture(x: number, y: number, w: number, h: number): void {
    // Базовый цвет кожи
    const leatherGradient = this.ctx.createRadialGradient(
      x + w/2, y + h/2, 0,
      x + w/2, y + h/2, Math.max(w, h) / 2
    );
    leatherGradient.addColorStop(0, '#2a6b4a');
    leatherGradient.addColorStop(0.6, '#1a5f4a');
    leatherGradient.addColorStop(1, '#0f4c3a');
    
    this.ctx.fillStyle = leatherGradient;
    this.ctx.fillRect(x, y, w, h);

    // Текстура кожи - более детальная
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 100; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const size = Math.random() * 2 + 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Поры кожи
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 50; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      
      this.ctx.beginPath();
      this.ctx.arc(px, py, 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Швы и линии
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.lineWidth = 1;
    
    // Горизонтальные швы
    for (let i = 0; i < 3; i++) {
      const lineY = y + (h / 4) * (i + 1);
      this.ctx.beginPath();
      this.ctx.moveTo(x + 20, lineY);
      this.ctx.lineTo(x + w - 20, lineY);
      this.ctx.stroke();
    }
  }

  private generateLuxuryDecorations(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Декоративные углы с улучшенным дизайном
    this.ctx.fillStyle = '#ffd700';
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    
    const cornerSize = 40;
    const positions = [
      { x: 40, y: 40 }, // Верхний левый
      { x: width - 40, y: 40 }, // Верхний правый
      { x: 40, y: height - 40 }, // Нижний левый
      { x: width - 40, y: height - 40 } // Нижний правый
    ];
    
    positions.forEach((pos, index) => {
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      this.ctx.rotate((Math.PI / 2) * index);
      
      // Основной декоративный элемент
      this.ctx.beginPath();
      this.ctx.moveTo(-cornerSize/2, -cornerSize/2);
      this.ctx.lineTo(0, -cornerSize/2);
      this.ctx.lineTo(cornerSize/2, 0);
      this.ctx.lineTo(0, cornerSize/2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Дополнительные детали
      this.ctx.fillStyle = '#b8860b';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, 2 * Math.PI);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  private generatePremiumEmblem(x: number, y: number): void {
    // Основной золотой круг
    const emblemGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 60);
    emblemGradient.addColorStop(0, '#ffd700');
    emblemGradient.addColorStop(0.7, '#d4af37');
    emblemGradient.addColorStop(1, '#b8860b');
    
    this.ctx.fillStyle = emblemGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 50, 0, 2 * Math.PI);
    this.ctx.fill();

    // Внутренний круг
    this.ctx.fillStyle = '#0f4c3a';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 40, 0, 2 * Math.PI);
    this.ctx.fill();

    // Декоративная рамка
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Центральный символ - корона
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 24px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('♔', x, y - 2);

    // Дополнительные декоративные элементы
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const startX = x + Math.cos(angle) * 35;
      const startY = y + Math.sin(angle) * 35;
      const endX = x + Math.cos(angle) * 45;
      const endY = y + Math.sin(angle) * 45;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  private generateLuxuryPlayerPositions(width: number, height: number): void {
    const positions = [
      // Главный игрок снизу
      { x: width * 0.5, y: height * 0.9 },
      // Левая сторона
      { x: width * 0.1, y: height * 0.2 },
      { x: width * 0.1, y: height * 0.5 },
      { x: width * 0.1, y: height * 0.8 },
      // Верх
      { x: width * 0.3, y: height * 0.1 },
      { x: width * 0.7, y: height * 0.1 },
      // Правая сторона
      { x: width * 0.9, y: height * 0.2 },
      { x: width * 0.9, y: height * 0.5 },
      { x: width * 0.9, y: height * 0.8 },
    ];

    positions.forEach((pos, index) => {
      // Премиум дизайн позиций
      const posGradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 30);
      posGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
      posGradient.addColorStop(0.7, 'rgba(212, 175, 55, 0.3)');
      posGradient.addColorStop(1, 'rgba(184, 134, 11, 0.2)');
      
      this.ctx.fillStyle = posGradient;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 28, 0, 2 * Math.PI);
      this.ctx.fill();

      // Золотая рамка
      this.ctx.strokeStyle = '#ffd700';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // Внутренняя рамка
      this.ctx.strokeStyle = '#d4af37';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Номер позиции
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 16px serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      if (index === 0) {
        this.ctx.fillText('★', pos.x, pos.y); // Главный игрок
      } else {
        this.ctx.fillText(index.toString(), pos.x, pos.y);
      }
    });
  }

  private addLightingEffects(width: number, height: number): void {
    // Световые блики
    const lightGradient = this.ctx.createRadialGradient(
      width * 0.3, height * 0.3, 0,
      width * 0.3, height * 0.3, width * 0.4
    );
    lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    lightGradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = lightGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(width * 0.3, height * 0.3, width * 0.3, height * 0.2, 0, 0, 2 * Math.PI);
    this.ctx.fill();

    // Дополнительный блик
    const light2Gradient = this.ctx.createRadialGradient(
      width * 0.7, height * 0.6, 0,
      width * 0.7, height * 0.6, width * 0.3
    );
    light2Gradient.addColorStop(0, 'rgba(255, 215, 0, 0.05)');
    light2Gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = light2Gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(width * 0.7, height * 0.6, width * 0.2, height * 0.15, 0, 0, 2 * Math.PI);
    this.ctx.fill();
  }
}

// Экспорт singleton
export const tableCanvasGenerator = new TableCanvasGenerator();
