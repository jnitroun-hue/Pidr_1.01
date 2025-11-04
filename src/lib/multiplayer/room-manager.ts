import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Room {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  current_players: number;
  game_mode: string;
  created_at: string;
}

interface RoomPlayer {
  room_id: string;
  user_id: string;
  username: string;
  position: number;
  is_ready: boolean;
  avatar_url?: string;
}

export class RoomManager {
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;

  /**
   * Создать новую комнату
   */
  async createRoom(hostId: string, gameMode: string = 'multiplayer', maxPlayers: number = 9): Promise<{ roomId: string; roomCode: string }> {
    try {
      console.log('🏠 [RoomManager] Создаем комнату:', { hostId, gameMode, maxPlayers });

      // Генерируем уникальный код комнаты
      const roomCode = this.generateRoomCode();

      // Создаем комнату в БД
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          code: roomCode,
          host_id: hostId,
          status: 'waiting',
          max_players: maxPlayers,
          current_players: 1,
          game_mode: gameMode,
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (roomError || !room) {
        console.error('❌ [RoomManager] Ошибка создания комнаты:', roomError);
        throw new Error('Не удалось создать комнату');
      }

      console.log('✅ [RoomManager] Комната создана:', room);

      // Получаем данные пользователя
      const { data: user } = await supabase
        .from('_pidr_users')
        .select('username, avatar_url')
        .eq('telegram_id', hostId)
        .single();

      // Добавляем хоста как игрока
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: hostId,
          username: user?.username || 'Host',
          position: 0,
          is_ready: false,
          avatar_url: user?.avatar_url
        });

      if (playerError) {
        console.error('❌ [RoomManager] Ошибка добавления хоста:', playerError);
        // Откатываем создание комнаты
        await supabase.from('_pidr_rooms').delete().eq('id', room.id);
        throw new Error('Не удалось добавить хоста в комнату');
      }

      return {
        roomId: room.id,
        roomCode: room.code
      };
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка создания комнаты:', error);
      throw error;
    }
  }

  /**
   * Присоединиться к комнате по коду
   */
  async joinRoom(roomCode: string, userId: string): Promise<{ roomId: string; isHost: boolean }> {
    try {
      console.log('🚪 [RoomManager] Присоединение к комнате:', { roomCode, userId });

      // Находим комнату по коду
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .select('*')
        .eq('code', roomCode)
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        console.error('❌ [RoomManager] Комната не найдена:', roomError);
        throw new Error('Комната не найдена или уже началась игра');
      }

      // Проверяем количество игроков
      if (room.current_players >= room.max_players) {
        throw new Error('Комната заполнена');
      }

      // Проверяем что игрок еще не в комнате
      const { data: existingPlayer } = await supabase
        .from('_pidr_room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single();

      if (existingPlayer) {
        console.log('✅ [RoomManager] Игрок уже в комнате');
        return {
          roomId: room.id,
          isHost: room.host_id === userId
        };
      }

      // Получаем данные пользователя
      const { data: user } = await supabase
        .from('_pidr_users')
        .select('username, avatar_url')
        .eq('telegram_id', userId)
        .single();

      // Добавляем игрока в комнату
      const { error: playerError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          username: user?.username || 'Player',
          position: room.current_players,
          is_ready: false,
          avatar_url: user?.avatar_url
        });

      if (playerError) {
        console.error('❌ [RoomManager] Ошибка добавления игрока:', playerError);
        throw new Error('Не удалось присоединиться к комнате');
      }

      // Обновляем количество игроков
      await supabase
        .from('_pidr_rooms')
        .update({
          current_players: room.current_players + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', room.id);

      console.log('✅ [RoomManager] Игрок присоединился к комнате');

      return {
        roomId: room.id,
        isHost: room.host_id === userId
      };
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка присоединения к комнате:', error);
      throw error;
    }
  }

  /**
   * Подписаться на обновления комнаты (REAL-TIME)
   */
  subscribeToRoom(roomId: string, callbacks: {
    onPlayerJoin?: (player: RoomPlayer) => void;
    onPlayerLeave?: (userId: string) => void;
    onPlayerReady?: (userId: string, isReady: boolean) => void;
    onGameStart?: () => void;
    onGameStateUpdate?: (gameState: any) => void;
    onPlayerMove?: (moveData: any) => void; // ✅ НОВОЕ: Колбэк для ходов
  }): void {
    console.log('📡 [RoomManager] Подписка на комнату:', roomId);
    this.roomId = roomId;

    // Создаем канал для комнаты
    this.channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: '_pidr_room_players',
        filter: `room_id=eq.${roomId}`
      }, (payload: any) => {
        console.log('✅ [RoomManager] Игрок присоединился:', payload.new);
        if (callbacks.onPlayerJoin) {
          callbacks.onPlayerJoin(payload.new as RoomPlayer);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: '_pidr_room_players',
        filter: `room_id=eq.${roomId}`
      }, (payload: any) => {
        console.log('👋 [RoomManager] Игрок покинул комнату:', payload.old);
        if (callbacks.onPlayerLeave && payload.old) {
          callbacks.onPlayerLeave((payload.old as any).user_id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: '_pidr_room_players',
        filter: `room_id=eq.${roomId}`
      }, (payload: any) => {
        console.log('🔄 [RoomManager] Игрок обновил статус:', payload.new);
        if (callbacks.onPlayerReady && payload.new) {
          const player = payload.new as RoomPlayer;
          callbacks.onPlayerReady(player.user_id, player.is_ready);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: '_pidr_rooms',
        filter: `id=eq.${roomId}`
      }, (payload: any) => {
        console.log('🎮 [RoomManager] Комната обновлена:', payload.new);
        const room = payload.new as Room;
        if (room.status === 'playing' && callbacks.onGameStart) {
          callbacks.onGameStart();
        }
      })
      .on('broadcast', { event: 'game-state' }, (payload: any) => {
        console.log('🔄 [RoomManager] Обновление состояния игры:', payload);
        if (callbacks.onGameStateUpdate) {
          callbacks.onGameStateUpdate(payload.payload);
        }
      })
      .on('broadcast', { event: 'player-move' }, (payload: any) => {
        console.log('🎮 [RoomManager] Получен ход игрока:', payload);
        if (callbacks.onPlayerMove) {
          callbacks.onPlayerMove(payload.payload);
        }
      })
      .subscribe();

    console.log('✅ [RoomManager] Подписка активна');
  }

  /**
   * Отправить состояние игры (broadcast)
   */
  broadcastGameState(gameState: any): void {
    if (!this.channel) {
      console.error('❌ [RoomManager] Канал не инициализирован');
      return;
    }

    console.log('📤 [RoomManager] Отправка состояния игры:', gameState);
    this.channel.send({
      type: 'broadcast',
      event: 'game-state',
      payload: gameState
    });
  }

  /**
   * ✅ НОВОЕ: Отправить ход игрока (broadcast)
   */
  async broadcastMove(roomId: string, moveData: any): Promise<void> {
    if (!this.channel && this.roomId !== roomId) {
      console.warn('❌ [RoomManager] Канал не инициализирован или не та комната');
      return;
    }

    console.log('📤 [RoomManager] Отправка хода игрока:', moveData);
    
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player-move',
        payload: moveData
      });
    }
  }

  /**
   * Установить готовность игрока
   */
  async setPlayerReady(roomId: string, userId: string, isReady: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('_pidr_room_players')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [RoomManager] Ошибка обновления готовности:', error);
        throw error;
      }

      console.log('✅ [RoomManager] Готовность обновлена:', { userId, isReady });
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка setPlayerReady:', error);
      throw error;
    }
  }

  /**
   * Начать игру (только хост)
   */
  async startGame(roomId: string, hostId: string): Promise<void> {
    try {
      // Проверяем что пользователь - хост
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

      if (!room || room.host_id !== hostId) {
        throw new Error('Только хост может начать игру');
      }

      // Обновляем статус комнаты
      const { error } = await supabase
        .from('_pidr_rooms')
        .update({
          status: 'playing',
          last_activity: new Date().toISOString()
        })
        .eq('id', roomId);

      if (error) {
        console.error('❌ [RoomManager] Ошибка начала игры:', error);
        throw error;
      }

      console.log('✅ [RoomManager] Игра началась');
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка startGame:', error);
      throw error;
    }
  }

  /**
   * Покинуть комнату
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      // Удаляем игрока из комнаты
      const { error } = await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [RoomManager] Ошибка выхода из комнаты:', error);
        throw error;
      }

      // Обновляем количество игроков
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('current_players, host_id')
        .eq('id', roomId)
        .single();

      if (room) {
        await supabase
          .from('_pidr_rooms')
          .update({
            current_players: Math.max(0, room.current_players - 1),
            last_activity: new Date().toISOString()
          })
          .eq('id', roomId);

        // Если хост покинул комнату, удаляем комнату
        if (room.host_id === userId) {
          await supabase.from('_pidr_rooms').delete().eq('id', roomId);
          console.log('🗑️ [RoomManager] Комната удалена (хост покинул)');
        }
      }

      console.log('✅ [RoomManager] Игрок покинул комнату');
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка leaveRoom:', error);
      throw error;
    }
  }

  /**
   * Отписаться от обновлений
   */
  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      console.log('✅ [RoomManager] Отписка от комнаты');
    }
  }

  /**
   * Генерировать уникальный код комнаты
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Получить список игроков в комнате
   */
  async getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
    try {
      const { data: players, error } = await supabase
        .from('_pidr_room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('position', { ascending: true });

      if (error) {
        console.error('❌ [RoomManager] Ошибка получения игроков:', error);
        throw error;
      }

      return players || [];
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка getRoomPlayers:', error);
      throw error;
    }
  }

  /**
   * Получить информацию о комнате
   */
  async getRoomInfo(roomId: string): Promise<Room | null> {
    try {
      const { data: room, error } = await supabase
        .from('_pidr_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        console.error('❌ [RoomManager] Ошибка получения комнаты:', error);
        return null;
      }

      return room;
    } catch (error) {
      console.error('❌ [RoomManager] Ошибка getRoomInfo:', error);
      return null;
    }
  }
}

// Экспортируем singleton instance
export const roomManager = new RoomManager();

