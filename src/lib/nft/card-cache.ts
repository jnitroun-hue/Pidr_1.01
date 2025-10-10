/**
 * IndexedDB кеширование для NFT карт
 * Хранит базовые карты и метаданные для быстрого доступа
 */

const DB_NAME = 'pidr_nft_cache';
const STORE_NAME = 'cards';
const DB_VERSION = 1;

interface CachedCard {
  id: string;
  rank: string;
  suit: string;
  rarity: string;
  imageData: string; // base64
  metadata: any;
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

  async getCard(id: string): Promise<CachedCard | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const card = request.result as CachedCard | undefined;
        // Проверяем, не устарела ли карта (7 дней)
        if (card && Date.now() - card.timestamp < 7 * 24 * 60 * 60 * 1000) {
          resolve(card);
        } else {
          resolve(null);
        }
      };
    });
  }

  async saveCard(card: CachedCard): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        ...card,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCardsByRarity(rarity: string): Promise<CachedCard[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('rarity');
      const request = index.getAll(rarity);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as CachedCard[]);
    });
  }

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

