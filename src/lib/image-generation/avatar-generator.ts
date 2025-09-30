/**
 * 😎 CANVAS GENERATOR FOR COOL PLAYER AVATARS
 * Генератор прикольных аватаров игроков
 */

interface AvatarStyle {
  background: string[];
  eyeType: 'normal' | 'wink' | 'cool' | 'angry' | 'happy';
  mouthType: 'smile' | 'laugh' | 'neutral' | 'smirk' | 'surprised';
  accessory?: 'glasses' | 'hat' | 'crown' | 'headphones' | 'mask';
  theme: 'classic' | 'neon' | 'retro' | 'cartoon' | 'robot';
}

export class AvatarCanvasGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Генерация прикольного аватара
   */
  async generateCoolAvatar(
    name: string,
    style?: Partial<AvatarStyle>,
    size: number = 256
  ): Promise<string> {
    this.canvas.width = size;
    this.canvas.height = size;

    // Очищаем canvas
    this.ctx.clearRect(0, 0, size, size);

    // Определяем стиль
    const avatarStyle = this.generateRandomStyle(name, style);
    
    // Рисуем аватар по слоям
    this.drawBackground(size, avatarStyle);
    this.drawFace(size, avatarStyle);
    this.drawEyes(size, avatarStyle);
    this.drawMouth(size, avatarStyle);
    this.drawAccessory(size, avatarStyle);
    this.drawBorder(size, avatarStyle);

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Генерация случайного стиля на основе имени
   */
  private generateRandomStyle(name: string, customStyle?: Partial<AvatarStyle>): AvatarStyle {
    // Используем имя как seed для консистентности
    const seed = this.stringToSeed(name);
    const random = this.seededRandom(seed);

    const themes: AvatarStyle['theme'][] = ['classic', 'neon', 'retro', 'cartoon', 'robot'];
    const eyeTypes: AvatarStyle['eyeType'][] = ['normal', 'wink', 'cool', 'angry', 'happy'];
    const mouthTypes: AvatarStyle['mouthType'][] = ['smile', 'laugh', 'neutral', 'smirk', 'surprised'];
    const accessories: AvatarStyle['accessory'][] = ['glasses', 'hat', 'crown', 'headphones', 'mask'];

    const theme = customStyle?.theme || themes[Math.floor(random() * themes.length)];
    
    const backgroundColors = this.getThemeColors(theme);
    
    return {
      background: customStyle?.background || backgroundColors,
      eyeType: customStyle?.eyeType || eyeTypes[Math.floor(random() * eyeTypes.length)],
      mouthType: customStyle?.mouthType || mouthTypes[Math.floor(random() * mouthTypes.length)],
      accessory: Math.random() > 0.3 ? accessories[Math.floor(random() * accessories.length)] : undefined,
      theme: theme,
      ...customStyle
    };
  }

  /**
   * Получение цветов для темы
   */
  private getThemeColors(theme: AvatarStyle['theme']): string[] {
    const colorSchemes = {
      classic: ['#3b82f6', '#1e40af'],
      neon: ['#00ff88', '#ff0080'],
      retro: ['#ff6b35', '#f7931e'],
      cartoon: ['#ff69b4', '#9370db'],
      robot: ['#64748b', '#334155']
    };
    
    return colorSchemes[theme];
  }

  /**
   * Фон аватара
   */
  private drawBackground(size: number, style: AvatarStyle): void {
    const gradient = this.ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, style.background[0]);
    gradient.addColorStop(1, style.background[1]);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(size / 2, size / 2, size / 2 - 4, 0, 2 * Math.PI);
    this.ctx.fill();

    // Дополнительные эффекты для разных тем
    if (style.theme === 'neon') {
      this.ctx.shadowColor = style.background[0];
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = style.background[0];
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Лицо персонажа
   */
  private drawFace(size: number, style: AvatarStyle): void {
    const centerX = size / 2;
    const centerY = size / 2;
    const faceRadius = size * 0.35;

    // Основа лица
    this.ctx.fillStyle = this.getFaceColor(style.theme);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, faceRadius, 0, 2 * Math.PI);
    this.ctx.fill();

    // Тени и блики для объема
    if (style.theme !== 'robot') {
      // Тень
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.beginPath();
      this.ctx.ellipse(centerX + 10, centerY + 10, faceRadius * 0.8, faceRadius * 0.9, 0, 0, 2 * Math.PI);
      this.ctx.fill();

      // Блик
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.beginPath();
      this.ctx.ellipse(centerX - 15, centerY - 15, faceRadius * 0.4, faceRadius * 0.3, 0, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  /**
   * Глаза
   */
  private drawEyes(size: number, style: AvatarStyle): void {
    const centerX = size / 2;
    const centerY = size / 2 - 20;
    const eyeSize = 15;
    const eyeSpacing = 35;

    if (style.theme === 'robot') {
      this.drawRobotEyes(centerX, centerY, eyeSpacing, style);
      return;
    }

    switch (style.eyeType) {
      case 'normal':
        this.drawNormalEyes(centerX, centerY, eyeSize, eyeSpacing);
        break;
      case 'wink':
        this.drawWinkEyes(centerX, centerY, eyeSize, eyeSpacing);
        break;
      case 'cool':
        this.drawCoolEyes(centerX, centerY, eyeSize, eyeSpacing);
        break;
      case 'angry':
        this.drawAngryEyes(centerX, centerY, eyeSize, eyeSpacing);
        break;
      case 'happy':
        this.drawHappyEyes(centerX, centerY, eyeSize, eyeSpacing);
        break;
    }
  }

  /**
   * Рот
   */
  private drawMouth(size: number, style: AvatarStyle): void {
    const centerX = size / 2;
    const centerY = size / 2 + 30;

    if (style.theme === 'robot') {
      this.drawRobotMouth(centerX, centerY);
      return;
    }

    switch (style.mouthType) {
      case 'smile':
        this.drawSmile(centerX, centerY);
        break;
      case 'laugh':
        this.drawLaugh(centerX, centerY);
        break;
      case 'neutral':
        this.drawNeutralMouth(centerX, centerY);
        break;
      case 'smirk':
        this.drawSmirk(centerX, centerY);
        break;
      case 'surprised':
        this.drawSurprised(centerX, centerY);
        break;
    }
  }

  /**
   * Аксессуары
   */
  private drawAccessory(size: number, style: AvatarStyle): void {
    const centerX = size / 2;
    const centerY = size / 2;

    if (!style.accessory) return;

    switch (style.accessory) {
      case 'glasses':
        this.drawGlasses(centerX, centerY - 20);
        break;
      case 'hat':
        this.drawHat(centerX, centerY - 80);
        break;
      case 'crown':
        this.drawCrown(centerX, centerY - 90);
        break;
      case 'headphones':
        this.drawHeadphones(centerX, centerY - 40);
        break;
      case 'mask':
        this.drawMask(centerX, centerY);
        break;
    }
  }

  /**
   * Рамка аватара
   */
  private drawBorder(size: number, style: AvatarStyle): void {
    this.ctx.strokeStyle = this.getBorderColor(style.theme);
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  // Вспомогательные методы для рисования элементов

  private getFaceColor(theme: AvatarStyle['theme']): string {
    const colors = {
      classic: '#fdbcb4',
      neon: '#2a2a3e',
      retro: '#ffdbac',
      cartoon: '#ffb3ba',
      robot: '#e2e8f0'
    };
    return colors[theme];
  }

  private getBorderColor(theme: AvatarStyle['theme']): string {
    const colors = {
      classic: '#1e40af',
      neon: '#00ff88',
      retro: '#8b4513',
      cartoon: '#ff1493',
      robot: '#64748b'
    };
    return colors[theme];
  }

  private drawNormalEyes(x: number, y: number, size: number, spacing: number): void {
    // Левый глаз
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(x - spacing/2, y, size, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(x - spacing/2, y, size * 0.6, 0, 2 * Math.PI);
    this.ctx.fill();

    // Правый глаз
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(x + spacing/2, y, size, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(x + spacing/2, y, size * 0.6, 0, 2 * Math.PI);
    this.ctx.fill();

    // Блики
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(x - spacing/2 - 3, y - 3, 3, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(x + spacing/2 - 3, y - 3, 3, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private drawWinkEyes(x: number, y: number, size: number, spacing: number): void {
    // Левый глаз (подмигивающий)
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x - spacing/2, y, size, 0.2 * Math.PI, 0.8 * Math.PI);
    this.ctx.stroke();

    // Правый глаз (нормальный)
    this.drawNormalEyes(x + spacing, y, size, 0);
  }

  private drawCoolEyes(x: number, y: number, size: number, spacing: number): void {
    // Прищуренные глаза
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(x - spacing/2 - size, y - 3, size * 2, 6);
    this.ctx.fillRect(x + spacing/2 - size, y - 3, size * 2, 6);
  }

  private drawAngryEyes(x: number, y: number, size: number, spacing: number): void {
    this.drawNormalEyes(x, y, size, spacing);
    
    // Нахмуренные брови
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(x - spacing/2 - size, y - size - 5);
    this.ctx.lineTo(x - spacing/2 + size, y - size + 5);
    this.ctx.moveTo(x + spacing/2 - size, y - size + 5);
    this.ctx.lineTo(x + spacing/2 + size, y - size - 5);
    this.ctx.stroke();
  }

  private drawHappyEyes(x: number, y: number, size: number, spacing: number): void {
    // Счастливые глаза (дуги)
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(x - spacing/2, y, size, 0.3 * Math.PI, 0.7 * Math.PI);
    this.ctx.arc(x + spacing/2, y, size, 0.3 * Math.PI, 0.7 * Math.PI);
    this.ctx.stroke();
  }

  private drawRobotEyes(x: number, y: number, spacing: number, style: AvatarStyle): void {
    this.ctx.fillStyle = style.background[0];
    this.ctx.fillRect(x - spacing/2 - 10, y - 8, 20, 16);
    this.ctx.fillRect(x + spacing/2 - 10, y - 8, 20, 16);
    
    // Свечение
    this.ctx.shadowColor = style.background[0];
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(x - spacing/2 - 5, y - 3, 10, 6);
    this.ctx.fillRect(x + spacing/2 - 5, y - 3, 10, 6);
    this.ctx.shadowBlur = 0;
  }

  private drawSmile(x: number, y: number): void {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, 0, Math.PI);
    this.ctx.stroke();
  }

  private drawLaugh(x: number, y: number): void {
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 25, 15, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Зубы
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(x - 20, y - 8, 40, 12);
  }

  private drawNeutralMouth(x: number, y: number): void {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 10, y);
    this.ctx.lineTo(x + 10, y);
    this.ctx.stroke();
  }

  private drawSmirk(x: number, y: number): void {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 15, y);
    this.ctx.quadraticCurveTo(x, y + 10, x + 15, y - 5);
    this.ctx.stroke();
  }

  private drawSurprised(x: number, y: number): void {
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private drawRobotMouth(x: number, y: number): void {
    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(x - 15, y - 3, 30, 6);
    
    // Линии
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i += 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + i, y - 3);
      this.ctx.lineTo(x + i, y + 3);
      this.ctx.stroke();
    }
  }

  private drawGlasses(x: number, y: number): void {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    
    // Левая линза
    this.ctx.beginPath();
    this.ctx.arc(x - 20, y, 18, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // Правая линза
    this.ctx.beginPath();
    this.ctx.arc(x + 20, y, 18, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // Перемычка
    this.ctx.beginPath();
    this.ctx.moveTo(x - 2, y);
    this.ctx.lineTo(x + 2, y);
    this.ctx.stroke();
  }

  private drawHat(x: number, y: number): void {
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(x - 35, y, 70, 15);
    this.ctx.fillRect(x - 25, y - 30, 50, 30);
    
    // Декор
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(x - 25, y - 5, 50, 5);
  }

  private drawCrown(x: number, y: number): void {
    this.ctx.fillStyle = '#ffd700';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 30, y + 10);
    this.ctx.lineTo(x - 20, y - 10);
    this.ctx.lineTo(x - 10, y);
    this.ctx.lineTo(x, y - 15);
    this.ctx.lineTo(x + 10, y);
    this.ctx.lineTo(x + 20, y - 10);
    this.ctx.lineTo(x + 30, y + 10);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Драгоценности
    this.ctx.fillStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 10, 3, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private drawHeadphones(x: number, y: number): void {
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 45, 0.8 * Math.PI, 0.2 * Math.PI);
    this.ctx.stroke();
    
    // Наушники
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(x - 50, y + 10, 15, 20);
    this.ctx.fillRect(x + 35, y + 10, 15, 20);
  }

  private drawMask(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 10, 40, 25, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Отверстия для глаз
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(x - 15, y, 8, 0, 2 * Math.PI);
    this.ctx.arc(x + 15, y, 8, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  // Утилиты для генерации случайных чисел на основе строки
  private stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number) {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Генерация аватара для бота
   */
  async generateBotAvatar(botName: string): Promise<string> {
    const botStyles: Partial<AvatarStyle>[] = [
      { theme: 'robot', eyeType: 'cool', accessory: 'glasses' },
      { theme: 'neon', eyeType: 'normal', accessory: 'headphones' },
      { theme: 'cartoon', eyeType: 'happy', mouthType: 'smile' },
      { theme: 'retro', eyeType: 'wink', accessory: 'hat' },
    ];
    
    const seed = this.stringToSeed(botName);
    const style = botStyles[seed % botStyles.length];
    
    return this.generateCoolAvatar(botName, style);
  }

  /**
   * Генерация аватара для человека
   */
  async generatePlayerAvatar(playerName: string, preferredTheme?: AvatarStyle['theme']): Promise<string> {
    return this.generateCoolAvatar(playerName, { 
      theme: preferredTheme || 'classic',
      eyeType: 'happy',
      mouthType: 'smile'
    });
  }
}

// Экспорт singleton
export const avatarCanvasGenerator = new AvatarCanvasGenerator();
