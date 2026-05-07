#!/usr/bin/env node

/**
 * MCP Server для генерации NFT карт через Canvas
 * Интеграция с Supabase для сохранения данных
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema,
  ListToolsRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const { createClient } = require('@supabase/supabase-js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

// Supabase конфигурация
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase подключен к MCP серверу');
} else {
  console.warn('⚠️ Supabase не настроен для MCP сервера');
}

// Константы для генерации карт
const CARD_WIDTH = 500;
const CARD_HEIGHT = 700;
const CARD_RADIUS = 30;
const NFT_STORAGE_BUCKET = 'nft-card';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

const RARITY_LEVELS = {
  common: { name: 'Common', color: '#94a3b8', glow: false },
  rare: { name: 'Rare', color: '#3b82f6', glow: true },
  epic: { name: 'Epic', color: '#a855f7', glow: true },
  legendary: { name: 'Legendary', color: '#f59e0b', glow: true },
  mythic: { name: 'Mythic', color: '#ef4444', glow: true }
};

/**
 * Генерация карты через Canvas
 */
async function generateCard(suit, rank, rarity = 'common', style = 'classic') {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  const rarityConfig = RARITY_LEVELS[rarity] || RARITY_LEVELS.common;

  // Фон карты
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  ctx.fill();

  // Градиент для редкости
  if (rarityConfig.glow) {
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, `${rarityConfig.color}33`);
    gradient.addColorStop(1, `${rarityConfig.color}11`);
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();
  }

  // Рамка
  ctx.strokeStyle = rarityConfig.color;
  ctx.lineWidth = rarityConfig.glow ? 8 : 4;
  roundRect(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS - 5);
  ctx.stroke();

  // Масть и ранг (большой текст по центру)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const rankDisplay = rank.toUpperCase();
  ctx.fillText(rankDisplay, CARD_WIDTH / 2, CARD_HEIGHT / 2 - 50);

  // Символ масти
  ctx.font = 'bold 80px Arial';
  const suitSymbol = getSuitSymbol(suit);
  ctx.fillStyle = getSuitColor(suit);
  ctx.fillText(suitSymbol, CARD_WIDTH / 2, CARD_HEIGHT / 2 + 80);

  // Редкость внизу
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = rarityConfig.color;
  ctx.fillText(rarityConfig.name, CARD_WIDTH / 2, CARD_HEIGHT - 40);

  // Маленькие символы по углам
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(rankDisplay, 30, 50);
  ctx.textAlign = 'right';
  ctx.fillText(rankDisplay, CARD_WIDTH - 30, CARD_HEIGHT - 30);

  return canvas;
}

/**
 * Вспомогательная функция для рисования скругленного прямоугольника
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Получить символ масти
 */
function getSuitSymbol(suit) {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit] || '?';
}

/**
 * Получить цвет масти
 */
function getSuitColor(suit) {
  return (suit === 'hearts' || suit === 'diamonds') ? '#ef4444' : '#000000';
}

/**
 * Загрузка изображения карты в Supabase Storage
 */
async function uploadCardImage(userId, suit, rank, canvas) {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }

  // Конвертируем canvas в Buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Генерируем уникальное имя файла
  const fileName = `${userId}/${suit}_${rank}_${Date.now()}.png`;

  // Загружаем в Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(NFT_STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('❌ Ошибка загрузки в Storage:', uploadError);
    throw uploadError;
  }

  // Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from(NFT_STORAGE_BUCKET)
    .getPublicUrl(fileName);

  console.log('✅ Карта загружена в Storage:', publicUrl);
  return { fileName, publicUrl };
}

/**
 * Сохранение сгенерированной карты в БД
 */
async function saveCardToDB(userId, suit, rank, rarity, imageUrl, fileName, metadata = {}) {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }

  const { data, error } = await supabase
    .from('_pidr_nft_cards')
    .insert([{
      user_id: userId,
      suit: suit,
      rank: rank,
      rarity: rarity,
      image_url: imageUrl,
      storage_path: fileName,
      metadata: metadata,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Ошибка сохранения карты в БД:', error);
    throw error;
  }

  console.log('✅ Карта сохранена в БД:', data.id);
  return data;
}

/**
 * Получение всех карт пользователя
 */
async function getUserCards(userId, limit = 50) {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }

  const { data, error } = await supabase
    .from('_pidr_nft_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Ошибка получения карт пользователя:', error);
    throw error;
  }

  return data || [];
}

/**
 * Генерация полной колоды (52 карты)
 */
async function generateFullDeck(userId, rarity = 'common') {
  const results = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      try {
        const canvas = await generateCard(suit, rank, rarity);
        
        // Загружаем в Storage
        const { fileName, publicUrl } = await uploadCardImage(userId, suit, rank, canvas);
        
        // Сохраняем в БД
        const saved = await saveCardToDB(userId, suit, rank, rarity, publicUrl, fileName, {
          generated_at: new Date().toISOString(),
          generator: 'canvas',
          version: '1.0'
        });
        
        results.push({
          success: true,
          card: saved
        });
      } catch (error) {
        console.error(`❌ Ошибка генерации ${rank} of ${suit}:`, error);
        results.push({
          success: false,
          error: error.message,
          suit,
          rank
        });
      }
    }
  }
  
  return results;
}

// Создание MCP сервера
const server = new Server(
  {
    name: 'nft-card-generator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Регистрация инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_single_card',
        description: 'Генерирует одну NFT карту через Canvas',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID пользователя',
            },
            suit: {
              type: 'string',
              enum: SUITS,
              description: 'Масть карты',
            },
            rank: {
              type: 'string',
              enum: RANKS,
              description: 'Ранг карты',
            },
            rarity: {
              type: 'string',
              enum: Object.keys(RARITY_LEVELS),
              description: 'Редкость карты',
              default: 'common'
            }
          },
          required: ['userId', 'suit', 'rank'],
        },
      },
      {
        name: 'generate_full_deck',
        description: 'Генерирует полную колоду (52 карты)',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID пользователя',
            },
            rarity: {
              type: 'string',
              enum: Object.keys(RARITY_LEVELS),
              description: 'Редкость всех карт',
              default: 'common'
            }
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_user_cards',
        description: 'Получает все NFT карты пользователя из БД',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'ID пользователя',
            },
            limit: {
              type: 'number',
              description: 'Максимальное количество карт',
              default: 50
            }
          },
          required: ['userId'],
        },
      },
      {
        name: 'check_database_connection',
        description: 'Проверяет подключение к Supabase',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Обработка вызовов инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_single_card': {
        const { userId, suit, rank, rarity = 'common' } = args;
        
        console.log(`🎴 Генерация карты: ${rank} of ${suit} (${rarity})`);
        
        const canvas = await generateCard(suit, rank, rarity);
        
        // Загружаем в Storage
        const { fileName, publicUrl } = await uploadCardImage(userId, suit, rank, canvas);
        
        // Сохраняем в БД
        const saved = await saveCardToDB(userId, suit, rank, rarity, publicUrl, fileName, {
          generated_at: new Date().toISOString(),
          generator: 'canvas',
          version: '1.0'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                card: saved,
                imageUrl: publicUrl,
                message: `Карта ${rank} of ${suit} успешно сгенерирована!`
              }, null, 2),
            },
          ],
        };
      }

      case 'generate_full_deck': {
        const { userId, rarity = 'common' } = args;
        
        console.log(`🎴 Генерация полной колоды для пользователя ${userId} (${rarity})`);
        
        const results = await generateFullDeck(userId, rarity);
        const successCount = results.filter(r => r.success).length;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                total: results.length,
                successful: successCount,
                failed: results.length - successCount,
                results: results,
                message: `Колода сгенерирована! Успешно: ${successCount}/${results.length}`
              }, null, 2),
            },
          ],
        };
      }

      case 'get_user_cards': {
        const { userId, limit = 50 } = args;
        
        console.log(`📋 Получение карт пользователя ${userId}`);
        
        const cards = await getUserCards(userId, limit);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                count: cards.length,
                cards: cards,
                message: `Найдено ${cards.length} карт`
              }, null, 2),
            },
          ],
        };
      }

      case 'check_database_connection': {
        const isConnected = supabase !== null;
        
        if (isConnected) {
          // Тестовый запрос
          const { error } = await supabase.from('_pidr_users').select('id').limit(1);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  connected: true,
                  error: error ? error.message : null,
                  message: error ? 'Supabase подключен, но есть ошибка запроса' : 'Supabase подключен и работает!'
                }, null, 2),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                connected: false,
                message: 'Supabase не настроен. Проверьте переменные окружения.'
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Неизвестный инструмент: ${name}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка выполнения ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Запуск сервера
async function main() {
  console.log('🚀 Запуск NFT Card Generator MCP Server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('✅ NFT Card Generator MCP Server запущен!');
  console.log(`📊 Supabase: ${supabase ? 'подключен' : 'не настроен'}`);
}

main().catch((error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

