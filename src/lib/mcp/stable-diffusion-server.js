#!/usr/bin/env node

/**
 * 🎨 STABLE DIFFUSION MCP SERVER FOR CURSOR IDE
 * Генерация игровых ресурсов через Stable Diffusion API
 * Для использования в Cursor IDE как разработчик
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class StableDiffusionMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'stable-diffusion-game-assets',
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_game_table',
          description: 'Генерирует игровой стол через Stable Diffusion',
          inputSchema: {
            type: 'object',
            properties: {
              style: {
                type: 'string',
                enum: ['luxury', 'neon', 'classic', 'royal', 'cyberpunk', 'medieval'],
                description: 'Стиль стола'
              },
              description: {
                type: 'string',
                description: 'Дополнительное описание стола'
              },
              width: {
                type: 'number',
                default: 1024,
                description: 'Ширина изображения'
              },
              height: {
                type: 'number', 
                default: 768,
                description: 'Высота изображения'
              }
            },
            required: ['style']
          }
        },
        {
          name: 'generate_card_deck',
          description: 'Генерирует колоду карт через Stable Diffusion',
          inputSchema: {
            type: 'object',
            properties: {
              theme: {
                type: 'string',
                enum: ['classic', 'fantasy', 'cyberpunk', 'medieval', 'space', 'nature'],
                description: 'Тема колоды'
              },
              card_type: {
                type: 'string',
                enum: ['back', 'ace', 'king', 'queen', 'jack', 'number'],
                description: 'Тип карты'
              },
              suit: {
                type: 'string',
                enum: ['hearts', 'diamonds', 'clubs', 'spades'],
                description: 'Масть карты (для лицевых карт)'
              },
              description: {
                type: 'string',
                description: 'Дополнительное описание карты'
              }
            },
            required: ['theme', 'card_type']
          }
        },
        {
          name: 'generate_avatar_frame',
          description: 'Генерирует рамку для аватара через Stable Diffusion',
          inputSchema: {
            type: 'object',
            properties: {
              rarity: {
                type: 'string',
                enum: ['common', 'rare', 'epic', 'legendary', 'mythic'],
                description: 'Редкость рамки'
              },
              theme: {
                type: 'string',
                enum: ['gold', 'silver', 'diamond', 'fire', 'ice', 'nature', 'tech'],
                description: 'Тема рамки'
              },
              shape: {
                type: 'string',
                enum: ['circle', 'square', 'hexagon', 'ornate'],
                description: 'Форма рамки'
              },
              description: {
                type: 'string',
                description: 'Дополнительное описание рамки'
              }
            },
            required: ['rarity', 'theme']
          }
        },
        {
          name: 'generate_custom_asset',
          description: 'Генерирует кастомный игровой ресурс',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Полное описание того, что нужно сгенерировать'
              },
              negative_prompt: {
                type: 'string',
                description: 'Что НЕ должно быть на изображении'
              },
              width: {
                type: 'number',
                default: 512,
                description: 'Ширина изображения'
              },
              height: {
                type: 'number',
                default: 512,
                description: 'Высота изображения'
              },
              steps: {
                type: 'number',
                default: 20,
                description: 'Количество шагов генерации'
              },
              cfg_scale: {
                type: 'number',
                default: 7,
                description: 'CFG Scale (следование промпту)'
              }
            },
            required: ['prompt']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_game_table':
            return await this.generateGameTable(args);
          case 'generate_card_deck':
            return await this.generateCardDeck(args);
          case 'generate_avatar_frame':
            return await this.generateAvatarFrame(args);
          case 'generate_custom_asset':
            return await this.generateCustomAsset(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async generateGameTable(args) {
    const { style, description = '', width = 1024, height = 768 } = args;
    
    const stylePrompts = {
      luxury: 'luxury casino poker table, green felt surface, golden ornate edges, leather padding, crystal chandelier lighting, marble columns, opulent interior',
      neon: 'futuristic neon poker table, cyberpunk style, glowing blue and purple lights, holographic displays, metallic surface, dark ambient lighting',
      classic: 'classic wooden poker table, traditional green felt, simple elegant design, warm lighting, casino atmosphere',
      royal: 'royal palace poker table, gold and velvet, ornate decorations, crown motifs, jeweled details, regal atmosphere',
      cyberpunk: 'cyberpunk poker table, neon lights, holographic interface, metallic chrome surface, futuristic casino',
      medieval: 'medieval tavern poker table, rough wooden surface, iron details, candlelight, stone walls, fantasy atmosphere'
    };

    const prompt = `${stylePrompts[style]} ${description}, top-down view, game asset, high quality, detailed, professional lighting`.trim();
    const negativePrompt = 'people, characters, faces, text, watermark, blurry, low quality, distorted';

    const result = await this.callStableDiffusionAPI({
      prompt,
      negative_prompt: negativePrompt,
      width,
      height,
      steps: 25,
      cfg_scale: 8
    });

    if (result.success) {
      const filename = await this.saveImage(result.imageData, `table_${style}_${Date.now()}.png`);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Игровой стол "${style}" успешно сгенерирован!\n\n📁 Сохранен как: ${filename}\n\n🎨 Промпт: ${prompt}`
          }
        ]
      };
    } else {
      throw new Error(result.error);
    }
  }

  async generateCardDeck(args) {
    const { theme, card_type, suit, description = '' } = args;
    
    const themePrompts = {
      classic: 'classic playing card design, traditional ornate patterns, red and black colors',
      fantasy: 'fantasy playing card, magical symbols, dragons, wizards, mystical ornaments',
      cyberpunk: 'cyberpunk playing card, neon circuits, digital patterns, futuristic symbols',
      medieval: 'medieval playing card, heraldic symbols, gothic ornaments, parchment texture',
      space: 'space-themed playing card, stars, planets, cosmic patterns, sci-fi elements',
      nature: 'nature-themed playing card, leaves, flowers, organic patterns, earth tones'
    };

    const cardPrompts = {
      back: 'card back design, symmetrical pattern, ornate border',
      ace: 'ace card design, single large symbol in center',
      king: 'king card design, royal figure, crown, regal pose',
      queen: 'queen card design, elegant royal figure, jewels',
      jack: 'jack card design, knight or prince figure',
      number: 'number card design, multiple suit symbols arranged'
    };

    const suitSymbols = {
      hearts: '♥ hearts symbol',
      diamonds: '♦ diamonds symbol', 
      clubs: '♣ clubs symbol',
      spades: '♠ spades symbol'
    };

    let prompt = `${themePrompts[theme]}, ${cardPrompts[card_type]}`;
    if (suit && card_type !== 'back') {
      prompt += `, ${suitSymbols[suit]}`;
    }
    prompt += ` ${description}, playing card format, high quality, detailed artwork, professional design`.trim();

    const negativePrompt = 'blurry, low quality, distorted, multiple cards, text, watermark';

    const result = await this.callStableDiffusionAPI({
      prompt,
      negative_prompt: negativePrompt,
      width: 512,
      height: 768,
      steps: 20,
      cfg_scale: 7
    });

    if (result.success) {
      const filename = await this.saveImage(result.imageData, `card_${theme}_${card_type}_${Date.now()}.png`);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Карта "${card_type}" в стиле "${theme}" успешно сгенерирована!\n\n📁 Сохранена как: ${filename}\n\n🎨 Промпт: ${prompt}`
          }
        ]
      };
    } else {
      throw new Error(result.error);
    }
  }

  async generateAvatarFrame(args) {
    const { rarity, theme, shape = 'circle', description = '' } = args;
    
    const rarityPrompts = {
      common: 'simple frame, basic design, muted colors',
      rare: 'decorative frame, blue accents, moderate ornaments',
      epic: 'ornate frame, purple and gold, detailed decorations',
      legendary: 'magnificent frame, golden glow, intricate patterns, jeweled details',
      mythic: 'divine frame, rainbow aura, cosmic patterns, ultimate luxury'
    };

    const themePrompts = {
      gold: 'golden metallic frame, shiny gold texture, luxury finish',
      silver: 'silver metallic frame, polished chrome, elegant design',
      diamond: 'diamond-encrusted frame, crystal reflections, sparkling gems',
      fire: 'flame-themed frame, fire patterns, orange and red colors',
      ice: 'ice-themed frame, frost patterns, blue and white colors',
      nature: 'nature-themed frame, leaves and vines, green and brown colors',
      tech: 'technological frame, circuit patterns, neon accents'
    };

    const shapePrompts = {
      circle: 'circular frame, round border',
      square: 'square frame, geometric border',
      hexagon: 'hexagonal frame, six-sided border',
      ornate: 'ornate decorative frame, complex border design'
    };

    const prompt = `${rarityPrompts[rarity]}, ${themePrompts[theme]}, ${shapePrompts[shape]} ${description}, avatar frame, transparent background, game UI element, high quality`.trim();
    const negativePrompt = 'filled center, solid background, people, faces, text, watermark, low quality';

    const result = await this.callStableDiffusionAPI({
      prompt,
      negative_prompt: negativePrompt,
      width: 512,
      height: 512,
      steps: 25,
      cfg_scale: 8
    });

    if (result.success) {
      const filename = await this.saveImage(result.imageData, `frame_${rarity}_${theme}_${Date.now()}.png`);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Рамка для аватара "${rarity} ${theme}" успешно сгенерирована!\n\n📁 Сохранена как: ${filename}\n\n🎨 Промпт: ${prompt}`
          }
        ]
      };
    } else {
      throw new Error(result.error);
    }
  }

  async generateCustomAsset(args) {
    const { 
      prompt, 
      negative_prompt = 'low quality, blurry, distorted, text, watermark',
      width = 512,
      height = 512,
      steps = 20,
      cfg_scale = 7
    } = args;

    const result = await this.callStableDiffusionAPI({
      prompt,
      negative_prompt,
      width,
      height,
      steps,
      cfg_scale
    });

    if (result.success) {
      const filename = await this.saveImage(result.imageData, `custom_asset_${Date.now()}.png`);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Кастомный ресурс успешно сгенерирован!\n\n📁 Сохранен как: ${filename}\n\n🎨 Промпт: ${prompt}`
          }
        ]
      };
    } else {
      throw new Error(result.error);
    }
  }

  async callStableDiffusionAPI(params) {
    try {
      // Используем Hugging Face Inference API для Stable Diffusion
      const API_KEY = process.env.HUGGINGFACE_API_KEY;
      if (!API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY не найден в переменных окружения');
      }

      const response = await fetch(
        'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: params.prompt,
            parameters: {
              negative_prompt: params.negative_prompt,
              width: params.width,
              height: params.height,
              num_inference_steps: params.steps,
              guidance_scale: params.cfg_scale,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const imageBuffer = await response.buffer();
      const imageData = imageBuffer.toString('base64');

      return {
        success: true,
        imageData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async saveImage(base64Data, filename) {
    try {
      // Создаем папку для сгенерированных ресурсов
      const assetsDir = path.join(process.cwd(), 'generated-assets');
      await fs.mkdir(assetsDir, { recursive: true });

      // Сохраняем изображение
      const filepath = path.join(assetsDir, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(filepath, buffer);

      return filepath;
    } catch (error) {
      throw new Error(`Ошибка сохранения файла: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🎨 Stable Diffusion MCP Server запущен');
  }
}

const server = new StableDiffusionMCPServer();
server.run().catch(console.error);
