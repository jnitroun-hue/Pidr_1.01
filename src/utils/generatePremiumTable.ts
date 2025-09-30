/**
 * 🎲 PREMIUM TABLE GENERATOR UTILITY
 * Утилита для генерации и сохранения премиум стола
 */

import { tableCanvasGenerator } from '@/lib/image-generation/table-generator';

export async function generateAndSavePremiumTable(): Promise<string> {
  try {
    console.log('🎨 Генерируем премиум стол...');
    
    // Генерируем стол в высоком разрешении для игры
    const tableImage = await tableCanvasGenerator.generatePremiumTable(
      1200, // Ширина для высокого качества
      750,  // Высота для игры
      'luxury' // Роскошный стиль
    );

    console.log('✅ Премиум стол сгенерирован успешно!');
    return tableImage;
  } catch (error) {
    console.error('❌ Ошибка генерации стола:', error);
    throw error;
  }
}

// Предварительно сгенерированный стол в base64 (будет заменен динамически)
export const PREMIUM_TABLE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Функция для получения премиум стола
export async function getPremiumTable(): Promise<string> {
  if (typeof window === 'undefined') {
    // На сервере возвращаем заглушку
    return PREMIUM_TABLE_BASE64;
  }

  try {
    // В браузере генерируем стол
    return await generateAndSavePremiumTable();
  } catch (error) {
    console.error('Fallback to placeholder table:', error);
    return PREMIUM_TABLE_BASE64;
  }
}
