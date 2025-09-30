/**
 * 🎨 FAL.AI IMAGE GENERATOR
 * Бесплатная альтернатива Replicate для генерации изображений
 * Лимит: 100 изображений в месяц бесплатно
 */

interface FalImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  num_images?: number;
  model?: string;
}

interface FalImageResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export class FalImageGenerator {
  private apiKey: string;
  private baseUrl = 'https://fal.run/fal-ai';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FAL_KEY || '';
  }

  /**
   * Генерация изображения карты
   */
  async generateCard(
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
    value: string,
    style: 'classic' | 'neon' | 'minimal' = 'classic'
  ): Promise<string> {
    const prompts = {
      classic: `Professional playing card design, ${value} of ${suit}, elegant traditional style, high quality, white background, detailed artwork`,
      neon: `Futuristic neon playing card, ${value} of ${suit}, glowing edges, cyberpunk style, dark background with neon highlights`,
      minimal: `Minimalist playing card design, ${value} of ${suit}, clean lines, simple geometric shapes, modern typography`
    };

    const response = await this.generateImage({
      prompt: prompts[style],
      width: 400,
      height: 600,
      num_images: 1,
      model: 'fal-ai/flux/schnell' // Быстрая бесплатная модель
    });

    return response.images[0]?.url || '';
  }

  /**
   * Генерация аватара игрока
   */
  async generateAvatar(
    style: 'cartoon' | 'realistic' | 'pixel' = 'cartoon',
    gender?: 'male' | 'female'
  ): Promise<string> {
    const genderPrompt = gender ? `${gender} ` : '';
    const prompts = {
      cartoon: `Cute cartoon ${genderPrompt}character avatar, friendly face, colorful, game character style`,
      realistic: `Professional ${genderPrompt}portrait, clean background, photorealistic, gaming avatar`,
      pixel: `8-bit pixel art ${genderPrompt}character, retro gaming style, colorful pixels`
    };

    const response = await this.generateImage({
      prompt: prompts[style],
      width: 256,
      height: 256,
      num_images: 1
    });

    return response.images[0]?.url || '';
  }

  /**
   * Основная функция генерации
   */
  private async generateImage(request: FalImageRequest): Promise<FalImageResponse> {
    if (!this.apiKey) {
      throw new Error('FAL_KEY не настроен. Получите бесплатный ключ на https://fal.ai');
    }

    const response = await fetch(`${this.baseUrl}/fast-sdxl`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        image_size: `${request.width || 512}x${request.height || 512}`,
        num_images: request.num_images || 1,
        enable_safety_checker: true
      })
    });

    if (!response.ok) {
      throw new Error(`Fal.ai error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

// Экспорт singleton
export const falImageGenerator = new FalImageGenerator();
