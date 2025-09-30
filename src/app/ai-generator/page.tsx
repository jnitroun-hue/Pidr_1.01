'use client';

import { useState, useRef } from 'react';

/**
 * 🤖 AI IMAGE GENERATOR
 * Генератор изображений по текстовому описанию (как Stable Diffusion)
 */

type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x768' | '768x1024';
type ImageStyle = 'realistic' | 'artistic' | 'cartoon' | 'pixel-art' | 'concept-art' | 'photo';
type AIProvider = 'huggingface' | 'fal' | 'replicate' | 'local';

interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl: string;
  provider: AIProvider;
  size: ImageSize;
  style: ImageStyle;
  timestamp: number;
  filename: string;
}

interface PromptTemplate {
  name: string;
  category: 'avatar' | 'card' | 'table' | 'background' | 'ui' | 'nft';
  prompt: string;
  negativePrompt?: string;
  suggestedSize: ImageSize;
  suggestedStyle: ImageStyle;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Аватары
  {
    name: 'Королевский аватар',
    category: 'avatar',
    prompt: 'Royal portrait of a majestic king with golden crown, detailed face, noble expression, ornate clothing, digital art, high quality',
    negativePrompt: 'blurry, low quality, distorted face, multiple heads',
    suggestedSize: '512x512',
    suggestedStyle: 'artistic'
  },
  {
    name: 'Киберпанк персонаж',
    category: 'avatar',
    prompt: 'Cyberpunk character portrait, neon lights, futuristic clothing, glowing eyes, high-tech accessories, digital art',
    negativePrompt: 'blurry, low quality, vintage, old-fashioned',
    suggestedSize: '512x512',
    suggestedStyle: 'concept-art'
  },
  {
    name: 'Фэнтези маг',
    category: 'avatar',
    prompt: 'Fantasy wizard portrait, magical robes, glowing staff, mystical aura, detailed face, fantasy art style',
    negativePrompt: 'modern clothing, realistic photo, blurry',
    suggestedSize: '512x512',
    suggestedStyle: 'artistic'
  },

  // Карты
  {
    name: 'Магическая карта',
    category: 'card',
    prompt: 'Magical playing card design, ornate borders, mystical symbols, gold details, elegant typography, fantasy style',
    negativePrompt: 'simple, plain, modern, minimalist',
    suggestedSize: '512x768',
    suggestedStyle: 'artistic'
  },
  {
    name: 'Неоновая карта',
    category: 'card',
    prompt: 'Futuristic neon playing card, glowing edges, cyberpunk style, electric blue and pink colors, high-tech design',
    negativePrompt: 'traditional, classic, vintage, dull colors',
    suggestedSize: '512x768',
    suggestedStyle: 'concept-art'
  },
  {
    name: 'Королевская карта',
    category: 'card',
    prompt: 'Luxury royal playing card, gold foil details, precious gems, ornate patterns, premium quality, regal design',
    negativePrompt: 'cheap, simple, plain, low quality',
    suggestedSize: '512x768',
    suggestedStyle: 'realistic'
  },

  // Столы
  {
    name: 'VIP казино стол',
    category: 'table',
    prompt: 'Luxury VIP casino poker table, leather surface, gold details, crystal decorations, premium lighting, top view',
    negativePrompt: 'cheap, plastic, simple, low quality',
    suggestedSize: '1024x768',
    suggestedStyle: 'realistic'
  },
  {
    name: 'Космический стол',
    category: 'table',
    prompt: 'Futuristic space station poker table, holographic interface, neon lights, sci-fi design, metallic surface',
    negativePrompt: 'wooden, traditional, vintage, earth-like',
    suggestedSize: '1024x768',
    suggestedStyle: 'concept-art'
  },

  // Фоны
  {
    name: 'Казино зал',
    category: 'background',
    prompt: 'Luxury casino interior, elegant chandeliers, marble columns, red carpet, golden details, atmospheric lighting',
    negativePrompt: 'empty, simple, bright daylight, outdoor',
    suggestedSize: '1024x768',
    suggestedStyle: 'realistic'
  },
  {
    name: 'Киберпанк город',
    category: 'background',
    prompt: 'Cyberpunk cityscape at night, neon signs, flying cars, tall buildings, rain, atmospheric mood',
    negativePrompt: 'sunny, daytime, nature, vintage',
    suggestedSize: '1024x768',
    suggestedStyle: 'concept-art'
  },

  // UI элементы
  {
    name: 'Кнопка премиум',
    category: 'ui',
    prompt: 'Luxury game UI button, gold gradient, ornate borders, glowing effects, premium design, high quality',
    negativePrompt: 'simple, flat, plain, low quality',
    suggestedSize: '512x256',
    suggestedStyle: 'artistic'
  },

  // NFT
  {
    name: 'NFT коллекция персонаж',
    category: 'nft',
    prompt: 'Unique NFT character, distinctive traits, colorful design, digital art, collectible style, high resolution',
    negativePrompt: 'generic, common, low quality, blurry',
    suggestedSize: '1024x1024',
    suggestedStyle: 'artistic'
  }
];

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState<ImageSize>('512x512');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('artistic');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('huggingface');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Генерация изображения
  const generateImage = async () => {
    if (!prompt.trim()) {
      alert('Введите описание изображения!');
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`🎨 Генерируем изображение: "${prompt}"`);
      
      let imageUrl = '';
      
      switch (selectedProvider) {
        case 'huggingface':
          imageUrl = await generateWithHuggingFace();
          break;
        case 'fal':
          imageUrl = await generateWithFal();
          break;
        case 'replicate':
          imageUrl = await generateWithReplicate();
          break;
        case 'local':
          imageUrl = await generateWithLocal();
          break;
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          prompt,
          negativePrompt: negativePrompt || undefined,
          imageUrl,
          provider: selectedProvider,
          size: selectedSize,
          style: selectedStyle,
          timestamp: Date.now(),
          filename: `generated_${Date.now()}.png`
        };

        setGeneratedImages(prev => [newImage, ...prev]);
        console.log('✅ Изображение сгенерировано успешно!');
      }
    } catch (error) {
      console.error('❌ Ошибка генерации:', error);
      alert('Ошибка генерации изображения. Проверьте настройки API.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация через Hugging Face
  const generateWithHuggingFace = async (): Promise<string> => {
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    if (!API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY не настроен');
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: negativePrompt,
            width: parseInt(selectedSize.split('x')[0]),
            height: parseInt(selectedSize.split('x')[1]),
            num_inference_steps: 50,
            guidance_scale: 7.5,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Генерация через Fal.ai
  const generateWithFal = async (): Promise<string> => {
    const API_KEY = process.env.NEXT_PUBLIC_FAL_KEY;
    if (!API_KEY) {
      throw new Error('FAL_KEY не настроен');
    }

    const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt,
        image_size: selectedSize,
        num_images: 1,
        enable_safety_checker: true
      })
    });

    if (!response.ok) {
      throw new Error(`Fal.ai error: ${response.status}`);
    }

    const result = await response.json();
    return result.images[0]?.url || '';
  };

  // Генерация через Replicate
  const generateWithReplicate = async (): Promise<string> => {
    const API_KEY = process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
    if (!API_KEY) {
      throw new Error('REPLICATE_API_TOKEN не настроен');
    }

    // Здесь был бы код для Replicate API
    throw new Error('Replicate интеграция в разработке');
  };

  // Локальная генерация (заглушка)
  const generateWithLocal = async (): Promise<string> => {
    // Симуляция генерации
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Создаем placeholder изображение с текстом промпта
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const [width, height] = selectedSize.split('x').map(Number);
    
    canvas.width = width;
    canvas.height = height;

    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Текст
    ctx.fillStyle = 'white';
    ctx.font = `${Math.min(width, height) / 20}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Разбиваем длинный текст на строки
    const words = prompt.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width * 0.8 && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const lineHeight = Math.min(width, height) / 15;
    const startY = height / 2 - (lines.length - 1) * lineHeight / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });

    return canvas.toDataURL('image/png');
  };

  // Применение шаблона
  const applyTemplate = (template: PromptTemplate) => {
    setPrompt(template.prompt);
    setNegativePrompt(template.negativePrompt || '');
    setSelectedSize(template.suggestedSize);
    setSelectedStyle(template.suggestedStyle);
  };

  // Скачивание изображения
  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = image.filename;
    link.click();
  };

  // Сохранение в проект
  const saveToProject = (image: GeneratedImage) => {
    // Здесь можно добавить логику сохранения в папку проекта
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    
    // Копируем URL в буфер обмена
    navigator.clipboard.writeText(image.imageUrl);
    alert('URL изображения скопирован в буфер обмена!');
  };

  // Фильтрация шаблонов
  const filteredTemplates = selectedCategory === 'all' 
    ? PROMPT_TEMPLATES 
    : PROMPT_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🤖 AI Image Generator
          </h1>
          <p className="text-gray-300">
            Генератор изображений по описанию (как Stable Diffusion)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая панель - Настройки */}
          <div className="lg:col-span-1">
            {/* Промпт */}
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">✍️ Описание изображения</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Основной промпт:</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите изображение которое хотите получить..."
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                    rows={4}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Негативный промпт (что исключить):</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, low quality, distorted..."
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                    rows={2}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            {/* Настройки */}
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">⚙️ Настройки</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">AI Провайдер:</label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    disabled={isGenerating}
                  >
                    <option value="local">Local (Demo)</option>
                    <option value="huggingface">Hugging Face (Free)</option>
                    <option value="fal">Fal.ai (Fast)</option>
                    <option value="replicate">Replicate (Premium)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Размер изображения:</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value as ImageSize)}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    disabled={isGenerating}
                  >
                    <option value="256x256">256×256 (Быстро)</option>
                    <option value="512x512">512×512 (Стандарт)</option>
                    <option value="1024x1024">1024×1024 (Высокое качество)</option>
                    <option value="1024x768">1024×768 (Альбомная)</option>
                    <option value="768x1024">768×1024 (Портретная)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Стиль:</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    disabled={isGenerating}
                  >
                    <option value="realistic">Реалистичный</option>
                    <option value="artistic">Художественный</option>
                    <option value="cartoon">Мультяшный</option>
                    <option value="pixel-art">Пиксель-арт</option>
                    <option value="concept-art">Концепт-арт</option>
                    <option value="photo">Фотография</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isGenerating ? '⏳ Генерируем...' : '🎨 Создать изображение'}
              </button>
            </div>

            {/* Шаблоны */}
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">📋 Шаблоны промптов</h2>
              
              <div className="mb-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">Все категории</option>
                  <option value="avatar">Аватары</option>
                  <option value="card">Карты</option>
                  <option value="table">Столы</option>
                  <option value="background">Фоны</option>
                  <option value="ui">UI элементы</option>
                  <option value="nft">NFT</option>
                </select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left bg-gray-800/50 hover:bg-gray-700/50 text-white p-3 rounded-lg border border-gray-600/30 hover:border-purple-500/50 transition-all duration-200"
                    disabled={isGenerating}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-gray-400 text-xs mt-1 truncate">
                      {template.prompt.substring(0, 60)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Правая панель - Результаты */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  🖼️ Сгенерированные изображения ({generatedImages.length})
                </h2>
                {generatedImages.length > 0 && (
                  <button
                    onClick={() => setGeneratedImages([])}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    🗑️ Очистить
                  </button>
                )}
              </div>

              {generatedImages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🎨</div>
                  <p>Здесь будут отображаться ваши сгенерированные изображения</p>
                  <p className="text-sm mt-2">Введите описание и нажмите "Создать изображение"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="group">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300">
                        {/* Изображение */}
                        <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gray-900/50">
                          <img
                            src={image.imageUrl}
                            alt={image.prompt}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        
                        {/* Информация */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-white font-medium text-sm mb-1">Промпт:</h3>
                            <p className="text-gray-300 text-xs line-clamp-2">
                              {image.prompt}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="bg-purple-600 text-white px-2 py-1 rounded">
                              {image.provider.toUpperCase()}
                            </span>
                            <span className="bg-blue-600 text-white px-2 py-1 rounded">
                              {image.size}
                            </span>
                            <span className="bg-green-600 text-white px-2 py-1 rounded">
                              {image.style}
                            </span>
                          </div>
                          
                          {/* Кнопки действий */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadImage(image)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                            >
                              💾 Скачать
                            </button>
                            <button
                              onClick={() => saveToProject(image)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                            >
                              📁 В проект
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Скрытый input для файлов */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={() => {}}
        />
      </div>
    </div>
  );
}
