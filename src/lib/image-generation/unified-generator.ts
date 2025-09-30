/**
 * 🎨 UNIFIED IMAGE GENERATOR
 * Объединяет все методы генерации изображений
 * Автоматически выбирает лучший доступный сервис
 */

import { FalImageGenerator } from './fal-generator';
import { CanvasImageGenerator } from './canvas-generator';
import { HuggingFaceImageGenerator } from './huggingface-generator';

type ImageProvider = 'fal' | 'huggingface' | 'canvas';
type CardStyle = 'classic' | 'neon' | 'minimal';
type AvatarStyle = 'cartoon' | 'realistic' | 'pixel';

export class UnifiedImageGenerator {
  private fal: FalImageGenerator;
  private canvas: CanvasImageGenerator;
  private huggingface: HuggingFaceImageGenerator;
  private preferredProvider: ImageProvider;

  constructor(preferredProvider: ImageProvider = 'canvas') {
    this.fal = new FalImageGenerator();
    this.canvas = new CanvasImageGenerator();
    this.huggingface = new HuggingFaceImageGenerator();
    this.preferredProvider = preferredProvider;
  }

  /**
   * Генерация карты с fallback
   */
  async generateCard(
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
    value: string,
    style: CardStyle = 'classic'
  ): Promise<string> {
    console.log(`🎨 Генерируем карту ${value} ${suit} в стиле ${style}`);

    try {
      switch (this.preferredProvider) {
        case 'fal':
          return await this.fal.generateCard(suit, value, style);
        case 'huggingface':
          return await this.huggingface.generateCard(suit, value, style);
        case 'canvas':
        default:
          return await this.canvas.generateCard(suit, value, style);
      }
    } catch (error) {
      console.warn(`❌ Ошибка ${this.preferredProvider}:`, error);
      console.log('🔄 Переключаемся на Canvas...');
      return await this.canvas.generateCard(suit, value, style);
    }
  }

  /**
   * Генерация аватара с fallback
   */
  async generateAvatar(
    name: string,
    style: AvatarStyle = 'cartoon'
  ): Promise<string> {
    console.log(`🎨 Генерируем аватар для ${name} в стиле ${style}`);

    try {
      switch (this.preferredProvider) {
        case 'fal':
          return await this.fal.generateAvatar(style);
        case 'huggingface':
          return await this.huggingface.generateAvatar(`${style} character named ${name}`);
        case 'canvas':
        default:
          return await this.canvas.generateAvatar(name, this.getRandomColor());
      }
    } catch (error) {
      console.warn(`❌ Ошибка ${this.preferredProvider}:`, error);
      console.log('🔄 Переключаемся на Canvas...');
      return await this.canvas.generateAvatar(name, this.getRandomColor());
    }
  }

  /**
   * Генерация QR кода
   */
  async generateQRCode(address: string, size: number = 256): Promise<string> {
    // QR коды генерируем только локально
    return await this.canvas.generateQRCode(address, size);
  }

  /**
   * Проверка доступности провайдера
   */
  async checkProviderAvailability(provider: ImageProvider): Promise<boolean> {
    try {
      switch (provider) {
        case 'fal':
          // Проверяем наличие API ключа
          return !!process.env.FAL_KEY;
        case 'huggingface':
          // Проверяем наличие API ключа
          return !!process.env.HUGGINGFACE_API_KEY;
        case 'canvas':
          // Canvas всегда доступен в браузере
          return typeof document !== 'undefined';
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Автоматический выбор лучшего провайдера
   */
  async selectBestProvider(): Promise<ImageProvider> {
    const providers: ImageProvider[] = ['fal', 'huggingface', 'canvas'];
    
    for (const provider of providers) {
      if (await this.checkProviderAvailability(provider)) {
        console.log(`✅ Выбран провайдер: ${provider}`);
        this.preferredProvider = provider;
        return provider;
      }
    }

    // Fallback на canvas
    this.preferredProvider = 'canvas';
    return 'canvas';
  }

  /**
   * Смена провайдера
   */
  setProvider(provider: ImageProvider): void {
    this.preferredProvider = provider;
    console.log(`🔄 Провайдер изменен на: ${provider}`);
  }

  /**
   * Получение случайного цвета для аватара
   */
  private getRandomColor(): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Получение статистики использования
   */
  getStats(): { provider: ImageProvider; available: boolean }[] {
    return [
      { provider: 'canvas', available: typeof document !== 'undefined' },
      { provider: 'fal', available: !!process.env.FAL_KEY },
      { provider: 'huggingface', available: !!process.env.HUGGINGFACE_API_KEY }
    ];
  }
}

// Экспорт singleton
export const unifiedImageGenerator = new UnifiedImageGenerator();

// Автоматически выбираем лучший провайдер при загрузке
if (typeof window !== 'undefined') {
  unifiedImageGenerator.selectBestProvider();
}
