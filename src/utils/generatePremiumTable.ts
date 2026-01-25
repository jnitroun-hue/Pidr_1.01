/**
 * 🎲 PREMIUM TABLE UTILITY (SIMPLIFIED)
 * Упрощенная утилита для стола без генерации
 */

// Роскошный стол SVG (сгенерированный через MCP Stable Diffusion)
export const LUXURY_TABLE_SVG = '/images/luxury-table.svg';

// Функция для получения премиум стола (теперь статичная)
export async function getPremiumTable(): Promise<string> {
  // Возвращаем роскошный SVG стол
  return LUXURY_TABLE_SVG;
}

// Удаленная функция генерации (перенесена в отдельный проект)
export async function generateAndSavePremiumTable(): Promise<string> {
  console.warn('⚠️ Генерация столов перенесена в отдельный проект pidr_generators');
  return LUXURY_TABLE_SVG;
}