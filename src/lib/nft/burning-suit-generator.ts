/**
 * Генератор горящих мастей для NFT карт
 * Использует Canvas 2D для динамической генерации уникального огня
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface BurningSuitParams {
  suit: Suit;
  intensity: number; // 0-100
  fireColor: string; // hex color
  glowIntensity: number; // 0-100
  sparkles: boolean;
  animated: boolean;
}

export interface BurningSuitResult {
  imageDataUrl: string;
  metadata: {
    suit: Suit;
    intensity: number;
    fireColor: string;
    glowIntensity: number;
    sparkles: boolean;
    generatedAt: number;
  };
}

/**
 * Генерация уникального горящего эффекта для масти
 */
export async function generateBurningSuit(params: BurningSuitParams): Promise<BurningSuitResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Размер карты
  canvas.width = 400;
  canvas.height = 600;
  
  // Заливка фона
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Рисуем масть с огненным эффектом
  await drawBurningSuit(ctx, params);
  
  // Если нужны искры
  if (params.sparkles) {
    drawSparkles(ctx, params.intensity);
  }
  
  // Конвертируем в data URL
  const imageDataUrl = canvas.toDataURL('image/png');
  
  return {
    imageDataUrl,
    metadata: {
      suit: params.suit,
      intensity: params.intensity,
      fireColor: params.fireColor,
      glowIntensity: params.glowIntensity,
      sparkles: params.sparkles,
      generatedAt: Date.now(),
    },
  };
}

/**
 * Рисование горящей масти
 */
async function drawBurningSuit(ctx: CanvasRenderingContext2D, params: BurningSuitParams) {
  const centerX = ctx.canvas.width / 2;
  const centerY = ctx.canvas.height / 2;
  const size = 200;
  
  // Создаем градиент для свечения
  const glowGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, size * 1.5
  );
  
  // Цвета огня
  const fireAlpha = params.glowIntensity / 100;
  glowGradient.addColorStop(0, `${params.fireColor}${Math.floor(fireAlpha * 255).toString(16).padStart(2, '0')}`);
  glowGradient.addColorStop(0.3, `${params.fireColor}${Math.floor(fireAlpha * 0.6 * 255).toString(16).padStart(2, '0')}`);
  glowGradient.addColorStop(0.6, `${params.fireColor}${Math.floor(fireAlpha * 0.3 * 255).toString(16).padStart(2, '0')}`);
  glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
  
  // Рисуем свечение
  ctx.fillStyle = glowGradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Рисуем саму масть
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Масштаб в зависимости от интенсивности
  const scale = 1 + (params.intensity / 200);
  ctx.scale(scale, scale);
  
  // Рисуем символ масти
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = params.fireColor;
  ctx.shadowBlur = 20 + (params.intensity / 5);
  
  drawSuitSymbol(ctx, params.suit, size);
  
  ctx.restore();
  
  // Добавляем огненные языки
  if (params.intensity > 30) {
    drawFlames(ctx, centerX, centerY, size, params);
  }
}

/**
 * Рисование символа масти
 */
function drawSuitSymbol(ctx: CanvasRenderingContext2D, suit: Suit, size: number) {
  const scale = size / 100;
  
  ctx.beginPath();
  
  switch (suit) {
    case 'hearts':
      // Сердце
      ctx.moveTo(0, -20 * scale);
      ctx.bezierCurveTo(-25 * scale, -45 * scale, -50 * scale, -25 * scale, -50 * scale, -10 * scale);
      ctx.bezierCurveTo(-50 * scale, 10 * scale, -25 * scale, 30 * scale, 0, 50 * scale);
      ctx.bezierCurveTo(25 * scale, 30 * scale, 50 * scale, 10 * scale, 50 * scale, -10 * scale);
      ctx.bezierCurveTo(50 * scale, -25 * scale, 25 * scale, -45 * scale, 0, -20 * scale);
      break;
      
    case 'diamonds':
      // Бубна
      ctx.moveTo(0, -50 * scale);
      ctx.lineTo(30 * scale, 0);
      ctx.lineTo(0, 50 * scale);
      ctx.lineTo(-30 * scale, 0);
      ctx.closePath();
      break;
      
    case 'clubs':
      // Трефа
      ctx.arc(0, -20 * scale, 15 * scale, 0, Math.PI * 2);
      ctx.arc(-15 * scale, 5 * scale, 15 * scale, 0, Math.PI * 2);
      ctx.arc(15 * scale, 5 * scale, 15 * scale, 0, Math.PI * 2);
      ctx.moveTo(-10 * scale, 15 * scale);
      ctx.lineTo(-10 * scale, 40 * scale);
      ctx.lineTo(10 * scale, 40 * scale);
      ctx.lineTo(10 * scale, 15 * scale);
      break;
      
    case 'spades':
      // Пика
      ctx.moveTo(0, -50 * scale);
      ctx.bezierCurveTo(-20 * scale, -30 * scale, -35 * scale, -10 * scale, -35 * scale, 10 * scale);
      ctx.bezierCurveTo(-35 * scale, 25 * scale, -20 * scale, 35 * scale, 0, 35 * scale);
      ctx.bezierCurveTo(20 * scale, 35 * scale, 35 * scale, 25 * scale, 35 * scale, 10 * scale);
      ctx.bezierCurveTo(35 * scale, -10 * scale, 20 * scale, -30 * scale, 0, -50 * scale);
      ctx.moveTo(-10 * scale, 30 * scale);
      ctx.lineTo(-10 * scale, 50 * scale);
      ctx.lineTo(10 * scale, 50 * scale);
      ctx.lineTo(10 * scale, 30 * scale);
      break;
  }
  
  ctx.fill();
}

/**
 * Рисование языков пламени
 */
function drawFlames(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  params: BurningSuitParams
) {
  const flameCount = Math.floor(params.intensity / 10);
  
  for (let i = 0; i < flameCount; i++) {
    const angle = (Math.PI * 2 * i) / flameCount + Math.random() * 0.5;
    const distance = size * 0.6 + Math.random() * (size * 0.4);
    const flameX = x + Math.cos(angle) * distance;
    const flameY = y + Math.sin(angle) * distance;
    
    const gradient = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, 20);
    gradient.addColorStop(0, params.fireColor);
    gradient.addColorStop(0.5, `${params.fireColor}aa`);
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flameX, flameY, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Рисование искр
 */
function drawSparkles(ctx: CanvasRenderingContext2D, intensity: number) {
  const sparkleCount = Math.floor(intensity / 2);
  
  for (let i = 0; i < sparkleCount; i++) {
    const x = Math.random() * ctx.canvas.width;
    const y = Math.random() * ctx.canvas.height;
    const radius = Math.random() * 3 + 1;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, '#ffff00');
    gradient.addColorStop(0.5, '#ff6600');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Генерация случайных параметров горения
 */
export function generateRandomBurningParams(): Omit<BurningSuitParams, 'suit'> {
  const fireColors = [
    '#ff0000', // Красный
    '#ff6600', // Оранжевый
    '#ffaa00', // Желто-оранжевый
    '#00ff00', // Зеленый (мистический)
    '#0000ff', // Синий (холодный огонь)
    '#ff00ff', // Пурпурный
    '#00ffff', // Голубой
  ];
  
  return {
    intensity: Math.floor(Math.random() * 70) + 30, // 30-100
    fireColor: fireColors[Math.floor(Math.random() * fireColors.length)],
    glowIntensity: Math.floor(Math.random() * 50) + 50, // 50-100
    sparkles: Math.random() > 0.5,
    animated: true,
  };
}

/**
 * Анимированная версия (для отображения в UI)
 */
export class BurningSuitAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private params: BurningSuitParams;
  private animationFrame: number | null = null;
  private time: number = 0;
  
  constructor(canvas: HTMLCanvasElement, params: BurningSuitParams) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.params = params;
  }
  
  start() {
    const animate = () => {
      this.time += 0.05;
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }
  
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  private render() {
    // Очищаем canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Анимируем интенсивность огня
    const animatedIntensity = this.params.intensity + Math.sin(this.time) * 10;
    
    // Перерисовываем с анимированными параметрами
    drawBurningSuit(this.ctx, {
      ...this.params,
      intensity: animatedIntensity,
    });
    
    if (this.params.sparkles) {
      drawSparkles(this.ctx, animatedIntensity);
    }
  }
}

