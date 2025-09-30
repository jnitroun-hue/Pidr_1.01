#!/usr/bin/env node

/**
 * 🤖 MCP SERVER FOR AI IMAGE GENERATION
 * Сервер для генерации изображений по текстовому описанию (как Stable Diffusion)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class AIImageGeneratorServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ai-image-generator-server',
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
          name: 'generate_image_huggingface',
          description: 'Генерирует изображение через Hugging Face Stable Diffusion',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Текстовое описание изображения' },
              negative_prompt: { type: 'string', description: 'Что исключить из изображения' },
              width: { type: 'number', description: 'Ширина изображения', default: 512 },
              height: { type: 'number', description: 'Высота изображения', default: 512 },
              num_inference_steps: { type: 'number', description: 'Количество шагов генерации', default: 50 },
              guidance_scale: { type: 'number', description: 'Сила следования промпту', default: 7.5 },
              model: { type: 'string', description: 'Модель для генерации', default: 'stabilityai/stable-diffusion-2-1' }
            },
            required: ['prompt']
          }
        },
        {
          name: 'generate_image_fal',
          description: 'Генерирует изображение через Fal.ai (быстрая генерация)',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Текстовое описание изображения' },
              negative_prompt: { type: 'string', description: 'Негативный промпт' },
              image_size: { type: 'string', description: 'Размер изображения', enum: ['256x256', '512x512', '1024x1024'] },
              num_images: { type: 'number', description: 'Количество изображений', default: 1 },
              enable_safety_checker: { type: 'boolean', description: 'Включить проверку безопасности', default: true }
            },
            required: ['prompt']
          }
        },
        {
          name: 'generate_avatar_frame',
          description: 'Генерирует рамку для аватара с AI стилизацией',
          inputSchema: {
            type: 'object',
            properties: {
              style_prompt: { type: 'string', description: 'Описание стиля рамки' },
              colors: { type: 'array', items: { type: 'string' }, description: 'Цветовая палитра' },
              size: { type: 'number', description: 'Размер рамки', default: 512 },
              ornate_level: { type: 'string', enum: ['simple', 'medium', 'ornate'], description: 'Уровень декоративности' }
            },
            required: ['style_prompt']
          }
        },
        {
          name: 'generate_game_asset',
          description: 'Генерирует игровой ассет (карта, фон, UI элемент)',
          inputSchema: {
            type: 'object',
            properties: {
              asset_type: { type: 'string', enum: ['card', 'background', 'ui_button', 'icon', 'character'] },
              prompt: { type: 'string', description: 'Описание ассета' },
              style: { type: 'string', enum: ['realistic', 'cartoon', 'pixel-art', 'fantasy', 'sci-fi'] },
              size: { type: 'string', description: 'Размер ассета' },
              color_scheme: { type: 'string', description: 'Цветовая схема' }
            },
            required: ['asset_type', 'prompt']
          }
        },
        {
          name: 'generate_nft_collection',
          description: 'Генерирует коллекцию NFT с различными трейтами',
          inputSchema: {
            type: 'object',
            properties: {
              base_prompt: { type: 'string', description: 'Базовое описание персонажа/объекта' },
              traits: { type: 'array', items: { type: 'object' }, description: 'Массив трейтов (название, варианты)' },
              collection_size: { type: 'number', description: 'Размер коллекции', default: 10 },
              rarity_distribution: { type: 'object', description: 'Распределение редкости трейтов' }
            },
            required: ['base_prompt', 'traits']
          }
        },
        {
          name: 'save_to_project',
          description: 'Сохраняет сгенерированное изображение в папку проекта',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: { type: 'string', description: 'URL изображения' },
              filename: { type: 'string', description: 'Имя файла' },
              folder: { type: 'string', description: 'Папка для сохранения', default: 'public/generated' },
              metadata: { type: 'object', description: 'Метаданные изображения' }
            },
            required: ['image_url', 'filename']
          }
        },
        {
          name: 'get_prompt_suggestions',
          description: 'Получает предложения по улучшению промпта',
          inputSchema: {
            type: 'object',
            properties: {
              user_prompt: { type: 'string', description: 'Пользовательский промпт' },
              category: { type: 'string', enum: ['avatar', 'card', 'background', 'nft', 'ui'] },
              style_preference: { type: 'string', description: 'Предпочитаемый стиль' }
            },
            required: ['user_prompt']
          }
        }
      ]
    }));

    // Обработчик вызовов инструментов
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'generate_image_huggingface':
          return this.generateImageHuggingFace(args);
        case 'generate_image_fal':
          return this.generateImageFal(args);
        case 'generate_avatar_frame':
          return this.generateAvatarFrame(args);
        case 'generate_game_asset':
          return this.generateGameAsset(args);
        case 'generate_nft_collection':
          return this.generateNFTCollection(args);
        case 'save_to_project':
          return this.saveToProject(args);
        case 'get_prompt_suggestions':
          return this.getPromptSuggestions(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async generateImageHuggingFace(args) {
    const {
      prompt,
      negative_prompt = '',
      width = 512,
      height = 512,
      num_inference_steps = 50,
      guidance_scale = 7.5,
      model = 'stabilityai/stable-diffusion-2-1'
    } = args;

    const API_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY не настроен в переменных окружения');
    }

    try {
      console.log(`🎨 Генерируем изображение через Hugging Face: "${prompt}"`);

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              negative_prompt,
              width,
              height,
              num_inference_steps,
              guidance_scale,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API Error: ${response.status} - ${errorText}`);
      }

      // Получаем изображение как blob и конвертируем в base64
      const imageBuffer = await response.buffer();
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      return {
        content: [
          {
            type: 'text',
            text: `✅ Изображение успешно сгенерировано через Hugging Face!\n\nПромпт: ${prompt}\nРазмер: ${width}x${height}\nМодель: ${model}\n\nИзображение готово для использования.`
          },
          {
            type: 'image',
            data: base64Image,
            mimeType: 'image/png'
          }
        ],
        metadata: {
          prompt,
          negative_prompt,
          width,
          height,
          model,
          provider: 'huggingface',
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Ошибка генерации через Hugging Face:', error);
      throw error;
    }
  }

  async generateImageFal(args) {
    const {
      prompt,
      negative_prompt = '',
      image_size = '512x512',
      num_images = 1,
      enable_safety_checker = true
    } = args;

    const API_KEY = process.env.FAL_KEY;
    if (!API_KEY) {
      throw new Error('FAL_KEY не настроен в переменных окружения');
    }

    try {
      console.log(`🚀 Генерируем изображение через Fal.ai: "${prompt}"`);

      const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          negative_prompt,
          image_size,
          num_images,
          enable_safety_checker
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fal.ai API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const imageUrl = result.images[0]?.url;

      if (!imageUrl) {
        throw new Error('Не получен URL изображения от Fal.ai');
      }

      // Загружаем изображение и конвертируем в base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.buffer();
      const base64Image = imageBuffer.toString('base64');

      return {
        content: [
          {
            type: 'text',
            text: `✅ Изображение успешно сгенерировано через Fal.ai!\n\nПромпт: ${prompt}\nРазмер: ${image_size}\nURL: ${imageUrl}\n\nИзображение готово для использования.`
          },
          {
            type: 'image',
            data: base64Image,
            mimeType: 'image/png'
          }
        ],
        metadata: {
          prompt,
          negative_prompt,
          image_size,
          provider: 'fal',
          original_url: imageUrl,
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Ошибка генерации через Fal.ai:', error);
      throw error;
    }
  }

  async generateAvatarFrame(args) {
    const { style_prompt, colors = ['#ffd700', '#ffed4e'], size = 512, ornate_level = 'medium' } = args;

    const ornateDescriptions = {
      simple: 'clean, minimal design',
      medium: 'decorative elements, balanced ornaments',
      ornate: 'highly detailed, baroque style, intricate patterns'
    };

    const enhancedPrompt = `Avatar frame border, ${style_prompt}, ${ornateDescriptions[ornate_level]}, circular frame, transparent center, golden details, high quality, digital art, ornate border design, ${colors.join(' and ')} color scheme`;

    // Используем Hugging Face для генерации рамки
    return this.generateImageHuggingFace({
      prompt: enhancedPrompt,
      negative_prompt: 'filled center, solid background, low quality, blurry',
      width: size,
      height: size,
      model: 'stabilityai/stable-diffusion-2-1'
    });
  }

  async generateGameAsset(args) {
    const { asset_type, prompt, style = 'fantasy', size = '512x512', color_scheme = 'vibrant' } = args;

    const assetPrompts = {
      card: `Playing card design, ${prompt}, ${style} style, ornate borders, ${color_scheme} colors, high detail, game asset`,
      background: `Game background, ${prompt}, ${style} environment, ${color_scheme} palette, atmospheric, detailed`,
      ui_button: `Game UI button, ${prompt}, ${style} interface, ${color_scheme} design, glossy, interactive element`,
      icon: `Game icon, ${prompt}, ${style} style, ${color_scheme}, simple, recognizable, high contrast`,
      character: `Game character, ${prompt}, ${style} art style, ${color_scheme} colors, detailed, full body`
    };

    const enhancedPrompt = assetPrompts[asset_type] || `${asset_type} ${prompt}`;
    const [width, height] = size.split('x').map(Number);

    return this.generateImageHuggingFace({
      prompt: enhancedPrompt,
      negative_prompt: 'low quality, blurry, distorted, amateur',
      width,
      height
    });
  }

  async generateNFTCollection(args) {
    const { base_prompt, traits, collection_size = 10, rarity_distribution = {} } = args;

    console.log(`🎨 Генерируем NFT коллекцию: ${collection_size} элементов`);

    const collection = [];

    for (let i = 0; i < collection_size; i++) {
      // Случайно выбираем трейты для каждого NFT
      const selectedTraits = {};
      let combinedPrompt = base_prompt;

      for (const trait of traits) {
        const traitValue = this.selectRandomTrait(trait.options, rarity_distribution[trait.name]);
        selectedTraits[trait.name] = traitValue;
        combinedPrompt += `, ${traitValue}`;
      }

      try {
        const result = await this.generateImageHuggingFace({
          prompt: `${combinedPrompt}, NFT art style, unique, collectible, high quality`,
          negative_prompt: 'duplicate, common, low quality, blurry',
          width: 1024,
          height: 1024
        });

        collection.push({
          id: i + 1,
          traits: selectedTraits,
          prompt: combinedPrompt,
          image: result.content[1]?.data,
          metadata: result.metadata
        });

        console.log(`✅ NFT #${i + 1} сгенерирован`);
      } catch (error) {
        console.error(`❌ Ошибка генерации NFT #${i + 1}:`, error);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ NFT коллекция сгенерирована!\n\nКоллекция: ${collection.length} из ${collection_size} элементов\nБазовый промпт: ${base_prompt}\nТрейты: ${traits.map(t => t.name).join(', ')}\n\nКоллекция готова для минтинга!`
        }
      ],
      collection: collection
    };
  }

  selectRandomTrait(options, rarityDistribution = {}) {
    if (!rarityDistribution || Object.keys(rarityDistribution).length === 0) {
      // Равномерное распределение
      return options[Math.floor(Math.random() * options.length)];
    }

    // Взвешенное распределение по редкости
    const totalWeight = Object.values(rarityDistribution).reduce((sum, weight) => sum + weight, 0);
    let randomValue = Math.random() * totalWeight;

    for (const [trait, weight] of Object.entries(rarityDistribution)) {
      randomValue -= weight;
      if (randomValue <= 0) {
        return trait;
      }
    }

    return options[0]; // fallback
  }

  async saveToProject(args) {
    const { image_url, filename, folder = 'public/generated', metadata = {} } = args;

    try {
      // Создаем папку если не существует
      const fullPath = path.join(process.cwd(), folder);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }

      let imageBuffer;

      if (image_url.startsWith('data:')) {
        // Base64 изображение
        const base64Data = image_url.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // URL изображения
        const response = await fetch(image_url);
        imageBuffer = await response.buffer();
      }

      const filePath = path.join(fullPath, filename);
      fs.writeFileSync(filePath, imageBuffer);

      // Сохраняем метаданные
      if (Object.keys(metadata).length > 0) {
        const metadataPath = path.join(fullPath, `${filename}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Изображение сохранено в проект!\n\nПуть: ${filePath}\nРазмер: ${imageBuffer.length} байт\nМетаданные: ${Object.keys(metadata).length > 0 ? 'сохранены' : 'отсутствуют'}`
          }
        ]
      };
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      throw new Error(`Не удалось сохранить изображение: ${error.message}`);
    }
  }

  getPromptSuggestions(args) {
    const { user_prompt, category = 'general', style_preference = 'artistic' } = args;

    const suggestions = {
      avatar: [
        'detailed portrait, high quality, professional lighting',
        'character design, unique features, expressive eyes',
        'fantasy character, magical elements, mystical aura'
      ],
      card: [
        'ornate borders, elegant design, premium quality',
        'playing card style, symmetrical layout, clear typography',
        'magical card design, glowing effects, mystical symbols'
      ],
      background: [
        'atmospheric lighting, depth of field, cinematic',
        'environmental concept art, detailed landscape',
        'game background, immersive environment, rich colors'
      ],
      nft: [
        'unique traits, collectible style, high resolution',
        'digital art, distinctive features, rare characteristics',
        'NFT collection style, varied attributes, premium quality'
      ],
      ui: [
        'game interface, polished design, user-friendly',
        'modern UI elements, clean aesthetics, functional',
        'interactive design, visual hierarchy, engaging'
      ]
    };

    const styleModifiers = {
      realistic: 'photorealistic, detailed textures, natural lighting',
      artistic: 'digital art, stylized, creative interpretation',
      cartoon: 'cartoon style, vibrant colors, playful design',
      fantasy: 'fantasy art, magical elements, otherworldly',
      'sci-fi': 'futuristic, high-tech, science fiction elements'
    };

    const categoryPrompts = suggestions[category] || suggestions.general || [];
    const styleModifier = styleModifiers[style_preference] || '';

    const enhancedPrompts = categoryPrompts.map(suggestion => 
      `${user_prompt}, ${suggestion}, ${styleModifier}`
    );

    return {
      content: [
        {
          type: 'text',
          text: `💡 Предложения по улучшению промпта для категории "${category}":\n\n${enhancedPrompts.map((prompt, i) => `${i + 1}. ${prompt}`).join('\n\n')}\n\nСтиль: ${style_preference}\nИсходный промпт: ${user_prompt}`
        }
      ],
      suggestions: enhancedPrompts
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🤖 AI Image Generator MCP Server running');
  }
}

const server = new AIImageGeneratorServer();
server.run().catch(console.error);
