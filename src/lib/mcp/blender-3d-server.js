#!/usr/bin/env node

/**
 * 🎨 MCP BLENDER 3D SERVER
 * Генерирует 3D анимации, рендеры и 2D картинки для P.I.D.R. игры
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Конфигурация Blender
const BLENDER_PATH = process.env.BLENDER_PATH || 'blender';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated', 'blender');

// Убеждаемся что папка существует
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

class BlenderServer {
  constructor() {
    this.server = new Server(
      {
        name: 'blender-3d',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Обработка ошибок
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_card_render',
          description: 'Генерирует 3D рендер игральной карты P.I.D.R.',
          inputSchema: {
            type: 'object',
            properties: {
              cardType: {
                type: 'string',
                enum: ['front', 'back', 'special'],
                description: 'Тип карты'
              },
              suit: {
                type: 'string',
                enum: ['hearts', 'diamonds', 'clubs', 'spades'],
                description: 'Масть карты'
              },
              rank: {
                type: 'string',
                description: 'Ранг карты (2-10, J, Q, K, A)'
              },
              style: {
                type: 'string',
                enum: ['realistic', 'fantasy', 'neon', 'classic'],
                description: 'Стиль рендера'
              },
              quality: {
                type: 'string',
                enum: ['draft', 'preview', 'final'],
                description: 'Качество рендера'
              }
            },
            required: ['cardType', 'style']
          }
        },
        {
          name: 'generate_table_animation',
          description: 'Создает 3D анимацию игрового стола P.I.D.R.',
          inputSchema: {
            type: 'object',
            properties: {
              animationType: {
                type: 'string',
                enum: ['card_deal', 'card_flip', 'victory_celebration', 'penalty_animation'],
                description: 'Тип анимации'
              },
              playerCount: {
                type: 'number',
                minimum: 2,
                maximum: 9,
                description: 'Количество игроков'
              },
              style: {
                type: 'string',
                enum: ['luxury', 'neon', 'medieval', 'space'],
                description: 'Стиль стола'
              },
              duration: {
                type: 'number',
                default: 3.0,
                description: 'Длительность анимации в секундах'
              }
            },
            required: ['animationType', 'playerCount']
          }
        },
        {
          name: 'generate_game_asset',
          description: 'Генерирует 2D/3D ассеты для игры',
          inputSchema: {
            type: 'object',
            properties: {
              assetType: {
                type: 'string',
                enum: ['coin', 'chip', 'avatar_frame', 'background', 'ui_element'],
                description: 'Тип ассета'
              },
              renderMode: {
                type: 'string',
                enum: ['2D', '3D'],
                description: 'Режим рендера'
              },
              style: {
                type: 'string',
                description: 'Описание стиля'
              },
              dimensions: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              }
            },
            required: ['assetType', 'renderMode']
          }
        },
        {
          name: 'create_particle_effect',
          description: 'Создает эффекты частиц для игры',
          inputSchema: {
            type: 'object',
            properties: {
              effectType: {
                type: 'string',
                enum: ['win_fireworks', 'card_sparkle', 'coin_shower', 'magic_burst'],
                description: 'Тип эффекта'
              },
              color: {
                type: 'string',
                description: 'Основной цвет эффекта'
              },
              intensity: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Интенсивность эффекта'
              }
            },
            required: ['effectType']
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'generate_card_render':
          return this.generateCardRender(request.params.arguments);
        case 'generate_table_animation':
          return this.generateTableAnimation(request.params.arguments);
        case 'generate_game_asset':
          return this.generateGameAsset(request.params.arguments);
        case 'create_particle_effect':
          return this.createParticleEffect(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async generateCardRender(args) {
    const { cardType = 'front', suit, rank, style = 'realistic', quality = 'preview' } = args;
    
    const timestamp = Date.now();
    const filename = `card_${cardType}_${suit || 'back'}_${rank || 'generic'}_${timestamp}`;
    
    // Python скрипт для Blender
    const blenderScript = this.createCardRenderScript({
      cardType,
      suit,
      rank,
      style,
      quality,
      outputPath: path.join(OUTPUT_DIR, `${filename}.png`)
    });
    
    const scriptPath = path.join(OUTPUT_DIR, `${filename}_script.py`);
    fs.writeFileSync(scriptPath, blenderScript);
    
    try {
      await this.runBlender(scriptPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ 3D рендер карты создан успешно!
            
📄 **Детали:**
- Тип: ${cardType}
- Масть: ${suit || 'N/A'}
- Ранг: ${rank || 'N/A'}
- Стиль: ${style}
- Качество: ${quality}

📁 **Файл:** \`/public/generated/blender/${filename}.png\`

🎨 **Использование в игре:**
\`\`\`jsx
<img src="/generated/blender/${filename}.png" alt="3D Card" />
\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Ошибка при создании рендера карты: ${error.message}`
      );
    }
  }

  async generateTableAnimation(args) {
    const { animationType, playerCount, style = 'luxury', duration = 3.0 } = args;
    
    const timestamp = Date.now();
    const filename = `table_${animationType}_${playerCount}p_${timestamp}`;
    
    const blenderScript = this.createTableAnimationScript({
      animationType,
      playerCount,
      style,
      duration,
      outputPath: path.join(OUTPUT_DIR, `${filename}.mp4`)
    });
    
    const scriptPath = path.join(OUTPUT_DIR, `${filename}_script.py`);
    fs.writeFileSync(scriptPath, blenderScript);
    
    try {
      await this.runBlender(scriptPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `🎬 Анимация игрового стола создана!
            
📄 **Детали:**
- Тип: ${animationType}
- Игроков: ${playerCount}
- Стиль: ${style}
- Длительность: ${duration}с

📁 **Файл:** \`/public/generated/blender/${filename}.mp4\`

🎮 **Использование:**
\`\`\`jsx
<video autoPlay loop>
  <source src="/generated/blender/${filename}.mp4" type="video/mp4" />
</video>
\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Ошибка при создании анимации: ${error.message}`
      );
    }
  }

  async generateGameAsset(args) {
    const { assetType, renderMode, style, dimensions } = args;
    
    const timestamp = Date.now();
    const filename = `asset_${assetType}_${renderMode}_${timestamp}`;
    
    const blenderScript = this.createAssetScript({
      assetType,
      renderMode,
      style,
      dimensions,
      outputPath: path.join(OUTPUT_DIR, `${filename}.png`)
    });
    
    const scriptPath = path.join(OUTPUT_DIR, `${filename}_script.py`);
    fs.writeFileSync(scriptPath, blenderScript);
    
    try {
      await this.runBlender(scriptPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `🎨 Игровой ассет создан!
            
📄 **Детали:**
- Тип: ${assetType}
- Режим: ${renderMode}
- Стиль: ${style || 'Стандартный'}

📁 **Файл:** \`/public/generated/blender/${filename}.png\``
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Ошибка при создании ассета: ${error.message}`
      );
    }
  }

  async createParticleEffect(args) {
    const { effectType, color = '#FFD700', intensity = 'medium' } = args;
    
    const timestamp = Date.now();
    const filename = `effect_${effectType}_${timestamp}`;
    
    const blenderScript = this.createParticleScript({
      effectType,
      color,
      intensity,
      outputPath: path.join(OUTPUT_DIR, `${filename}.mp4`)
    });
    
    const scriptPath = path.join(OUTPUT_DIR, `${filename}_script.py`);
    fs.writeFileSync(scriptPath, blenderScript);
    
    try {
      await this.runBlender(scriptPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `✨ Эффект частиц создан!
            
📄 **Детали:**
- Тип: ${effectType}
- Цвет: ${color}
- Интенсивность: ${intensity}

📁 **Файл:** \`/public/generated/blender/${filename}.mp4\``
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Ошибка при создании эффекта: ${error.message}`
      );
    }
  }

  createCardRenderScript({ cardType, suit, rank, style, quality, outputPath }) {
    const renderSamples = quality === 'draft' ? 32 : quality === 'preview' ? 128 : 512;
    
    return `
import bpy
import bmesh
import os

# Очистка сцены
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Настройка рендера
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = ${renderSamples}
bpy.context.scene.render.resolution_x = 512
bpy.context.scene.render.resolution_y = 768
bpy.context.scene.render.filepath = "${outputPath.replace(/\\/g, '/')}"

# Создание карты
bpy.ops.mesh.primitive_cube_add(size=2)
card = bpy.context.active_object
card.name = "Card"

# Масштабирование карты (пропорции игральной карты)
card.scale = (0.7, 1.0, 0.02)

# Создание материала карты
mat = bpy.data.materials.new(name="CardMaterial")
mat.use_nodes = True
card.data.materials.append(mat)

# Настройка освещения
bpy.ops.object.light_add(type='SUN', location=(2, 2, 5))
sun = bpy.context.active_object
sun.data.energy = 3

# Камера
bpy.ops.object.camera_add(location=(0, -3, 1))
camera = bpy.context.active_object
bpy.context.scene.camera = camera

# Поворот камеры на карту
camera.rotation_euler = (1.1, 0, 0)

# Рендер
bpy.ops.render.render(write_still=True)

print("✅ Рендер карты завершен: ${outputPath}")
`;
  }

  createTableAnimationScript({ animationType, playerCount, style, duration, outputPath }) {
    return `
import bpy
import mathutils
import math

# Очистка сцены
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Настройка анимации
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = ${Math.floor(duration * 24)}  # 24 FPS
bpy.context.scene.render.fps = 24

# Создание стола
bpy.ops.mesh.primitive_cylinder_add(radius=3, depth=0.1, location=(0, 0, 0))
table = bpy.context.active_object
table.name = "PokerTable"

# Материал стола
mat = bpy.data.materials.new(name="TableMaterial")
mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (0.1, 0.5, 0.1, 1.0)  # Зеленый
table.data.materials.append(mat)

# Создание позиций игроков
for i in range(${playerCount}):
    angle = i * (2 * math.pi / ${playerCount})
    x = 2.5 * math.cos(angle)
    y = 2.5 * math.sin(angle)
    
    bpy.ops.mesh.primitive_cube_add(size=0.3, location=(x, y, 0.2))
    player_marker = bpy.context.active_object
    player_marker.name = f"Player_{i+1}"

# Анимация раздачи карт (пример)
if "${animationType}" == "card_deal":
    for i in range(${playerCount}):
        angle = i * (2 * math.pi / ${playerCount})
        x = 2.5 * math.cos(angle)
        y = 2.5 * math.sin(angle)
        
        # Создание карты
        bpy.ops.mesh.primitive_cube_add(size=0.1, location=(0, 0, 0.5))
        card = bpy.context.active_object
        card.name = f"Card_{i+1}"
        
        # Анимация движения карты к игроку
        card.keyframe_insert(data_path="location", frame=1)
        card.location = (x, y, 0.3)
        card.keyframe_insert(data_path="location", frame=12 + i*3)

# Освещение
bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))

# Камера
bpy.ops.object.camera_add(location=(0, -6, 4))
camera = bpy.context.active_object
bpy.context.scene.camera = camera
camera.rotation_euler = (1.0, 0, 0)

# Настройка видео рендера
bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
bpy.context.scene.render.ffmpeg.format = 'MPEG4'
bpy.context.scene.render.ffmpeg.codec = 'H264'
bpy.context.scene.render.filepath = "${outputPath.replace(/\\/g, '/')}"

# Рендер анимации
bpy.ops.render.render(animation=True)

print("🎬 Анимация стола завершена: ${outputPath}")
`;
  }

  createAssetScript({ assetType, renderMode, style, dimensions, outputPath }) {
    return `
import bpy

# Очистка сцены
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Создание ассета в зависимости от типа
if "${assetType}" == "coin":
    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.1)
    obj = bpy.context.active_object
    
    # Золотой материал
    mat = bpy.data.materials.new(name="GoldMaterial")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (1.0, 0.8, 0.0, 1.0)
    mat.node_tree.nodes["Principled BSDF"].inputs[4].default_value = 1.0  # Metallic
    obj.data.materials.append(mat)

elif "${assetType}" == "chip":
    bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.05)
    obj = bpy.context.active_object

elif "${assetType}" == "avatar_frame":
    bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.1)
    obj = bpy.context.active_object

# Освещение и камера
bpy.ops.object.light_add(type='SUN', location=(2, 2, 5))
bpy.ops.object.camera_add(location=(0, -3, 2))
camera = bpy.context.active_object
bpy.context.scene.camera = camera
camera.rotation_euler = (1.1, 0, 0)

# Рендер
bpy.context.scene.render.filepath = "${outputPath.replace(/\\/g, '/')}"
bpy.ops.render.render(write_still=True)

print("🎨 Ассет создан: ${outputPath}")
`;
  }

  createParticleScript({ effectType, color, intensity, outputPath }) {
    const particleCount = intensity === 'low' ? 100 : intensity === 'medium' ? 500 : 1000;
    
    return `
import bpy

# Очистка сцены
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Создание эмиттера частиц
bpy.ops.mesh.primitive_plane_add(size=0.1, location=(0, 0, 0))
emitter = bpy.context.active_object

# Система частиц
bpy.ops.object.particle_system_add()
psys = emitter.particle_systems[0]
psys.settings.count = ${particleCount}
psys.settings.frame_start = 1
psys.settings.frame_end = 60
psys.settings.lifetime = 60

# Настройка в зависимости от эффекта
if "${effectType}" == "win_fireworks":
    psys.settings.physics_type = 'NEWTON'
    psys.settings.normal_factor = 5.0
    psys.settings.factor_random = 2.0

# Анимация 60 кадров
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 60

# Освещение и камера
bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
bpy.ops.object.camera_add(location=(0, -5, 3))
camera = bpy.context.active_object
bpy.context.scene.camera = camera

# Рендер видео
bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
bpy.context.scene.render.ffmpeg.format = 'MPEG4'
bpy.context.scene.render.filepath = "${outputPath.replace(/\\/g, '/')}"
bpy.ops.render.render(animation=True)

print("✨ Эффект частиц создан: ${outputPath}")
`;
  }

  async runBlender(scriptPath) {
    return new Promise((resolve, reject) => {
      const blender = spawn(BLENDER_PATH, [
        '--background',
        '--python', scriptPath
      ]);

      let output = '';
      let error = '';

      blender.stdout.on('data', (data) => {
        output += data.toString();
      });

      blender.stderr.on('data', (data) => {
        error += data.toString();
      });

      blender.on('close', (code) => {
        // Удаляем временный скрипт
        fs.unlinkSync(scriptPath);
        
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Blender завершился с кодом ${code}: ${error}`));
        }
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🎨 Blender 3D MCP Server запущен');
  }
}

const server = new BlenderServer();
server.run().catch(console.error);
