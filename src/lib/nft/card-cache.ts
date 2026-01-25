/**
 * ✅ БЕЗОПАСНОЕ IndexedDB кеширование для NFT карт
 * 
 * ВАЖНО: Хранит ТОЛЬКО публичные UI данные:
 * - Изображения карт (base64)
 * - Публичные метаданные
 * - НЕ хранит приватные ключи
 * - НЕ хранит NFT ownership (только в блокчейне)
 * - Используется ТОЛЬКО для ускорения UI
 */

const DB_NAME = 'pidr_nft_ui_cache';
const STORE_NAME = 'card_images';
const DB_VERSION = 1;

interface CachedCardUI {
  id: string;
  rank: string;
  suit: string;
  rarity: string;
  imageData: string; // base64 - ТОЛЬКО UI изображение
  publicMetadata: {
    name: string;
    description: string;
    attributes: any[];
  };
  timestamp: number;
}

class CardCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('rank', 'rank', { unique: false });
          store.createIndex('suit', 'suit', { unique: false });
          store.createIndex('rarity', 'rarity', { unique: false });
        }
      };
    });
  }

  /**
   * ✅ Получить UI кеш карты (ТОЛЬКО изображение)
   */
  async getCard(id: string): Promise<CachedCardUI | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const card = request.result as CachedCardUI | undefined;
        // Проверяем, не устарела ли карта (7 дней)
        if (card && Date.now() - card.timestamp < 7 * 24 * 60 * 60 * 1000) {
          resolve(card);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * ✅ Сохранить UI кеш (ТОЛЬКО публичные данные)
   */
  async saveCard(card: CachedCardUI): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    // ⚠️ БЕЗОПАСНОСТЬ: Убеждаемся, что НЕТ приватных данных
    const safeCard: CachedCardUI = {
      id: card.id,
      rank: card.rank,
      suit: card.suit,
      rarity: card.rarity,
      imageData: card.imageData,
      publicMetadata: card.publicMetadata,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(safeCard);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCardsByRarity(rarity: string): Promise<CachedCardUI[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('rarity');
      const request = index.getAll(rarity);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as CachedCardUI[]);
    });
  }

  /**
   * ✅ Очистить UI кеш
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const cardCache = new CardCache();

