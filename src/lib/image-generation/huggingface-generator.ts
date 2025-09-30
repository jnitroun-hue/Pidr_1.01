/**
 * 🤗 HUGGING FACE IMAGE GENERATOR
 * Полностью бесплатная генерация изображений
 * Без лимитов, только нужна регистрация
 */

interface HuggingFaceRequest {
  inputs: string;
  parameters?: {
    width?: number;
    height?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
  };
}

export class HuggingFaceImageGenerator {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
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
      classic: `Professional playing card, ${value} of ${suit}, traditional design, elegant, white background, high quality illustration`,
      neon: `Cyberpunk playing card, ${value} of ${suit}, neon glow, futuristic, dark background, glowing edges`,
      minimal: `Minimalist playing card, ${value} of ${suit}, clean design, simple lines, modern typography`
    };

    const imageBlob = await this.generateImage({
      inputs: prompts[style],
      parameters: {
        width: 400,
        height: 600,
        num_inference_steps: 20,
        guidance_scale: 7.5
      }
    });

    return this.blobToDataURL(imageBlob);
  }

  /**
   * Генерация аватара игрока
   */
  async generateAvatar(
    description: string = 'friendly game character'
  ): Promise<string> {
    const prompt = `Portrait of a ${description}, cartoon style, colorful, game avatar, friendly face, clean background`;

    const imageBlob = await this.generateImage({
      inputs: prompt,
      parameters: {
        width: 256,
        height: 256,
        num_inference_steps: 15
      }
    });

    return this.blobToDataURL(imageBlob);
  }

  /**
   * Генерация фона для игры
   */
  async generateGameBackground(
    theme: 'casino' | 'space' | 'forest' = 'casino'
  ): Promise<string> {
    const prompts = {
      casino: 'Luxurious casino interior, poker table, elegant lighting, rich colors, professional photography',
      space: 'Space station interior, futuristic, neon lights, sci-fi atmosphere, dark background',
      forest: 'Magical forest clearing, mystical atmosphere, soft lighting, fantasy style'
    };

    const imageBlob = await this.generateImage({
      inputs: prompts[theme],
      parameters: {
        width: 1920,
        height: 1080,
        num_inference_steps: 30
      }
    });

    return this.blobToDataURL(imageBlob);
  }

  /**
   * Основная функция генерации
   */
  private async generateImage(request: HuggingFaceRequest): Promise<Blob> {
    if (!this.apiKey) {
      throw new Error('HUGGINGFACE_API_KEY не настроен. Получите бесплатный ключ на https://huggingface.co');
    }

    // Используем Stable Diffusion модель
    const modelUrl = `${this.baseUrl}/stabilityai/stable-diffusion-2-1`;

    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face error: ${response.status} ${error}`);
    }

    return await response.blob();
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Экспорт singleton
export const huggingFaceImageGenerator = new HuggingFaceImageGenerator();
