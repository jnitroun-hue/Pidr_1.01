/**
 * ============================================================
 * WEBSOCKET ROOM UPDATES API
 * ============================================================
 * Server-Sent Events (SSE) для real-time обновлений комнаты
 * Альтернатива WebSocket, работает через HTTP/REST
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoomPlayers, getRoomDetails } from '@/lib/multiplayer/player-state-manager';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: {
    roomId: string;
  };
}

// Кеш для предотвращения излишних запросов
const updateCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3000; // 3 секунды

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { roomId } = params;

  if (!roomId) {
    return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
  }

  console.log(`⚡ [SSE] Новое подключение для комнаты ${roomId}`);

  // Создаем stream для Server-Sent Events
  const encoder = new TextEncoder();
  let updateCount = 0;
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          updateCount++;
          
          // Проверяем кеш
          const cacheKey = `room_${roomId}`;
          const cached = updateCache.get(cacheKey);
          const now = Date.now();
          
          if (cached && (now - cached.timestamp) < CACHE_TTL) {
            // Используем кешированные данные
            const data = `data: ${JSON.stringify(cached.data)}\n\n`;
            controller.enqueue(encoder.encode(data));
            return;
          }
          
          // Получаем игроков из Redis
          const redisPlayers = await getRoomPlayers(roomId);
          
          // Получаем детальную информацию из БД
          const { data: roomPlayersData, error: roomPlayersError } = await supabase
            .from('_pidr_room_players')
            .select('user_id, position, is_ready, is_host, username, joined_at')
            .eq('room_id', roomId)
            .order('position', { ascending: true });

          if (roomPlayersError) {
            throw roomPlayersError;
          }

          const userIds = (roomPlayersData || []).map((p: { user_id: string }) => p.user_id);

          // Получаем данные пользователей
          const { data: usersData, error: usersError } = await supabase
            .from('_pidr_users')
            .select('id, username, avatar_url')
            .in('id', userIds);

          if (usersError) {
            throw usersError;
          }

          const usersMap = new Map((usersData || []).map((user: { id: string; username: string; avatar_url: string | null }) => [user.id, user]));

          // Объединяем данные
          const players = (roomPlayersData || []).map((rp: { user_id: string; position: number; is_ready: boolean; is_host: boolean; username: string; joined_at: string }) => {
            const user = usersMap.get(rp.user_id);
            return {
              user_id: rp.user_id,
              username: user?.username || rp.username || 'Неизвестный игрок',
              avatar_url: user?.avatar_url || null,
              position: rp.position,
              is_ready: rp.is_ready,
              is_host: rp.is_host,
              joined_at: rp.joined_at,
            };
          });

          // Получаем информацию о комнате
          const { data: roomData } = await supabase
            .from('_pidr_rooms')
            .select('max_players, status, game_mode')
            .eq('id', roomId)
            .single();

          const update = {
            type: 'room_update',
            roomId,
            players,
            maxPlayers: roomData?.max_players || 8,
            status: roomData?.status || 'waiting',
            gameMode: roomData?.game_mode || 'casual',
            timestamp: now,
          };

          // Сохраняем в кеш
          updateCache.set(cacheKey, { data: update, timestamp: now });

          // Отправляем SSE event
          const data = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(data));
          
          // Логируем только каждое 5-е обновление (чтобы не засорять логи)
          if (updateCount % 5 === 0) {
            console.log(`⚡ [SSE] Отправлено ${updateCount} обновлений для комнаты ${roomId}`);
          }

        } catch (error: any) {
          console.error('❌ Ошибка отправки обновления:', error);
          const errorData = `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        }
      };

      // Первое обновление сразу
      await sendUpdate();

      // Обновления каждые 5 секунд (оптимизация нагрузки на Redis/Supabase)
      const interval = setInterval(sendUpdate, 5000);

      // Очистка при закрытии соединения
      req.signal.addEventListener('abort', () => {
        console.log(`⚡ [SSE] Отключение для комнаты ${roomId} (отправлено ${updateCount} обновлений)`);
        clearInterval(interval);
        controller.close();
        // Очищаем кеш при отключении
        updateCache.delete(`room_${roomId}`);
      });
    },
  });

  // Возвращаем SSE stream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

