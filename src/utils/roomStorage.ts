// Утилиты для хранения и синхронизации комнат между вкладками

export interface StoredRoom {
  id: string;
  code: string;
  name: string;
  host: string;
  players: number;
  maxPlayers: number;
  gameMode: 'casual' | 'competitive';
  hasPassword: boolean;
  isPrivate: boolean;
  status: 'waiting' | 'playing' | 'full';
  ping: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  lastActivity: string;
}

const STORAGE_KEY = 'pidr_rooms';
const BROADCAST_CHANNEL = 'pidr_rooms_sync';

class RoomStorage {
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: ((rooms: StoredRoom[]) => void)[] = [];

  constructor() {
    // Инициализируем BroadcastChannel для синхронизации между вкладками
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'rooms_updated') {
          this.notifyListeners(event.data.rooms);
        }
      };
    }

    // Очищаем старые комнаты при инициализации
    this.cleanupOldRooms();
  }

  // Получить все комнаты из localStorage
  getRooms(): StoredRoom[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const rooms: StoredRoom[] = JSON.parse(stored);
      
      // Фильтруем старые комнаты (старше 10 минут)
      const now = new Date();
      const validRooms = rooms.filter(room => {
        const lastActivity = new Date(room.lastActivity);
        const ageMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        return ageMinutes < 10;
      });

      // Если количество изменилось, обновляем localStorage
      if (validRooms.length !== rooms.length) {
        this.saveRooms(validRooms);
      }

      return validRooms;
    } catch (error) {
      console.error('Error reading rooms from localStorage:', error);
      return [];
    }
  }

  // Сохранить комнаты в localStorage
  saveRooms(rooms: StoredRoom[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
      
      // Уведомляем другие вкладки об изменении
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'rooms_updated',
          rooms: rooms
        });
      }
      
      // Уведомляем локальных слушателей
      this.notifyListeners(rooms);
    } catch (error) {
      console.error('Error saving rooms to localStorage:', error);
    }
  }

  // Добавить новую комнату
  addRoom(room: Omit<StoredRoom, 'lastActivity'>): void {
    const rooms = this.getRooms();
    const newRoom: StoredRoom = {
      ...room,
      lastActivity: new Date().toISOString()
    };
    
    // Проверяем, нет ли уже комнаты с таким кодом
    const existingIndex = rooms.findIndex(r => r.code === room.code);
    if (existingIndex >= 0) {
      // Обновляем существующую комнату
      rooms[existingIndex] = newRoom;
    } else {
      // Добавляем новую комнату в начало списка
      rooms.unshift(newRoom);
    }
    
    this.saveRooms(rooms);
  }

  // Обновить комнату
  updateRoom(code: string, updates: Partial<StoredRoom>): void {
    const rooms = this.getRooms();
    const index = rooms.findIndex(r => r.code === code);
    
    if (index >= 0) {
      rooms[index] = {
        ...rooms[index],
        ...updates,
        lastActivity: new Date().toISOString()
      };
      this.saveRooms(rooms);
    }
  }

  // Удалить комнату
  removeRoom(code: string): void {
    const rooms = this.getRooms();
    const filteredRooms = rooms.filter(r => r.code !== code);
    this.saveRooms(filteredRooms);
  }

  // Найти комнату по коду
  findRoom(code: string): StoredRoom | null {
    const rooms = this.getRooms();
    return rooms.find(r => r.code.toUpperCase() === code.toUpperCase()) || null;
  }

  // Обновить активность комнаты
  updateActivity(code: string): void {
    this.updateRoom(code, { lastActivity: new Date().toISOString() });
  }

  // Присоединиться к комнате (увеличить счетчик игроков)
  joinRoom(code: string): boolean {
    const room = this.findRoom(code);
    if (!room) return false;
    
    if (room.players >= room.maxPlayers) return false;
    
    this.updateRoom(code, {
      players: room.players + 1,
      status: room.players + 1 >= room.maxPlayers ? 'full' : 'waiting'
    });
    
    return true;
  }

  // Покинуть комнату (уменьшить счетчик игроков)
  leaveRoom(code: string): boolean {
    const room = this.findRoom(code);
    if (!room) return false;
    
    const newPlayerCount = Math.max(0, room.players - 1);
    
    if (newPlayerCount === 0) {
      // Удаляем пустую комнату
      this.removeRoom(code);
    } else {
      this.updateRoom(code, {
        players: newPlayerCount,
        status: 'waiting'
      });
    }
    
    return true;
  }

  // Очистить старые комнаты
  cleanupOldRooms(): void {
    const rooms = this.getRooms();
    const now = new Date();
    
    const validRooms = rooms.filter(room => {
      const lastActivity = new Date(room.lastActivity);
      const ageMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
      return ageMinutes < 10; // Комнаты живут 10 минут
    });

    if (validRooms.length !== rooms.length) {
      this.saveRooms(validRooms);
      console.log(`🧹 Cleaned up ${rooms.length - validRooms.length} old rooms`);
    }
  }

  // Подписаться на изменения комнат
  subscribe(callback: (rooms: StoredRoom[]) => void): () => void {
    this.listeners.push(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Уведомить всех слушателей об изменениях
  private notifyListeners(rooms: StoredRoom[]): void {
    this.listeners.forEach(callback => {
      try {
        callback(rooms);
      } catch (error) {
        console.error('Error in room storage listener:', error);
      }
    });
  }

  // Очистить все комнаты (для отладки)
  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    this.saveRooms([]);
  }

  // Закрыть BroadcastChannel
  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners = [];
  }
}

// Singleton instance
export const roomStorage = new RoomStorage();

// Автоматическая очистка каждые 2 минуты
if (typeof window !== 'undefined') {
  setInterval(() => {
    roomStorage.cleanupOldRooms();
  }, 2 * 60 * 1000);
}
