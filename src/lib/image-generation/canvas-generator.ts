/**
 * 🎨 CANVAS IMAGE GENERATOR
 * Полностью бесплатная локальная генерация изображений
 * Работает в браузере без внешних API
 */

export class CanvasImageGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Генерация карты с помощью Canvas
   */
  async generateCard(
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
    value: string,
    style: 'classic' | 'neon' | 'minimal' = 'classic'
  ): Promise<string> {
    this.canvas.width = 180;  // Размер карты для игры
    this.canvas.height = 240;

    // Очищаем canvas
    this.ctx.clearRect(0, 0, 180, 240);

    // Фон карты
    if (style === 'neon') {
      // Темный фон для neon
      const gradient = this.ctx.createLinearGradient(0, 0, 180, 240);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = '#ffffff';
    }
    this.ctx.fillRect(0, 0, 180, 240);

    // Рамка карты
    this.ctx.strokeStyle = style === 'neon' ? '#00ff88' : '#333333';
    this.ctx.lineWidth = style === 'neon' ? 3 : 2;
    
    // Скругленные углы
    this.ctx.beginPath();
    this.ctx.roundRect(5, 5, 170, 230, 15);
    this.ctx.stroke();

    // Стили для разных мастей
    const suitColors = {
      hearts: style === 'neon' ? '#ff0080' : '#e74c3c',
      diamonds: style === 'neon' ? '#ff0080' : '#e74c3c', 
      clubs: style === 'neon' ? '#00ff88' : '#2c3e50',
      spades: style === 'neon' ? '#00ff88' : '#2c3e50'
    };

    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };

    // Применяем эффект свечения для neon
    if (style === 'neon') {
      this.ctx.shadowColor = suitColors[suit];
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }

    // Значение карты в углах
    this.ctx.fillStyle = suitColors[suit];
    this.ctx.font = 'bold 24px serif';
    this.ctx.textAlign = 'left';
    
    // Верхний левый угол
    this.ctx.fillText(value, 15, 35);
    this.ctx.font = 'bold 16px serif';
    this.ctx.fillText(suitSymbols[suit], 15, 55);
    
    // Нижний правый угол (перевернуто)
    this.ctx.save();
    this.ctx.translate(180, 240);
    this.ctx.rotate(Math.PI);
    this.ctx.font = 'bold 24px serif';
    this.ctx.fillText(value, 15, 35);
    this.ctx.font = 'bold 16px serif';
    this.ctx.fillText(suitSymbols[suit], 15, 55);
    this.ctx.restore();

    // Центральный символ
    this.ctx.font = 'bold 80px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (style === 'neon') {
      // Усиленное свечение для центрального символа
      this.ctx.shadowBlur = 25;
    }
    
    this.ctx.fillText(suitSymbols[suit], 90, 120);

    // Убираем эффекты
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Генерация аватара игрока
   */
  async generateAvatar(
    name: string,
    color: string = '#3b82f6'
  ): Promise<string> {
    this.canvas.width = 256;
    this.canvas.height = 256;

    // Фон
    const gradient = this.ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, 256, 256);

    // Круглая рамка
    this.ctx.beginPath();
    this.ctx.arc(128, 128, 120, 0, 2 * Math.PI);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // Инициалы
    const initials = this.getInitials(name);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 64px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(initials, 128, 128);

    return this.canvas.toDataURL('image/png');
  }

  /**
   * Генерация QR кода для кошелька
   */
  async generateQRCode(
    address: string,
    size: number = 256
  ): Promise<string> {
    this.canvas.width = size;
    this.canvas.height = size;

    // Простая заглушка QR кода
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, size, size);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('QR Code', size/2, size/2);
    this.ctx.fillText(address.substring(0, 10) + '...', size/2, size/2 + 20);

    return this.canvas.toDataURL('image/png');
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
}

// Экспорт singleton
export const canvasImageGenerator = new CanvasImageGenerator();
