/**
 * ============================================================
 * TON ADDRESS UTILITIES
 * ============================================================
 * Утилиты для работы с TON адресами (EQ/UQ форматы)
 */

/**
 * Конвертировать UQ адрес (non-bounceable) в EQ (bounceable)
 * Trust Wallet использует UQ, TonCenter API работает с EQ
 */
export function convertToBounceable(address: string): string {
  if (address.startsWith('EQ')) {
    return address; // Уже bounceable
  }
  
  if (address.startsWith('UQ')) {
    // Заменяем первые 2 символа UQ на EQ
    return 'EQ' + address.substring(2);
  }
  
  return address; // Неизвестный формат, возвращаем как есть
}

/**
 * Конвертировать EQ адрес (bounceable) в UQ (non-bounceable)
 */
export function convertToNonBounceable(address: string): string {
  if (address.startsWith('UQ')) {
    return address; // Уже non-bounceable
  }
  
  if (address.startsWith('EQ')) {
    // Заменяем первые 2 символа EQ на UQ
    return 'UQ' + address.substring(2);
  }
  
  return address;
}

/**
 * Проверить валидность TON адреса
 */
export function isValidTonAddress(address: string): boolean {
  // TON адрес должен начинаться с EQ или UQ и иметь 48 символов
  const tonAddressRegex = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/;
  return tonAddressRegex.test(address);
}

/**
 * Получить оба формата адреса
 */
export function getTonAddressFormats(address: string): {
  bounceable: string;
  nonBounceable: string;
} {
  return {
    bounceable: convertToBounceable(address),
    nonBounceable: convertToNonBounceable(address)
  };
}

/**
 * Сравнить два TON адреса (игнорируя формат EQ/UQ)
 */
export function isSameTonAddress(address1: string, address2: string): boolean {
  const addr1Normalized = convertToBounceable(address1);
  const addr2Normalized = convertToBounceable(address2);
  return addr1Normalized === addr2Normalized;
}

/**
 * Форматировать TON адрес для отображения (сокращенный)
 */
export function formatTonAddressShort(address: string): string {
  if (!address || address.length < 10) return address;
  
  const prefix = address.substring(0, 6);
  const suffix = address.substring(address.length - 4);
  
  return `${prefix}...${suffix}`;
}

// Примеры использования:
// const eq = convertToBounceable('UQD_xpChGjZcen4D_QuvRE-fY2I7Q-TLI-eCwBCjv52qOByw');
// const uq = convertToNonBounceable('EQD_xpChGjZcen4D_QuvRE-fY2I7Q-TLI-eCwBCjv52qOByw');
// const valid = isValidTonAddress('UQD_xpChGjZcen4D_QuvRE-fY2I7Q-TLI-eCwBCjv52qOByw');

