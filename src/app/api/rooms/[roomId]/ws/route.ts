import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ✅ SSE ENDPOINT ДЛЯ REAL-TIME ОБНОВЛЕНИЙ КОМНАТЫ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  
  console.log(`🔌 [SSE] Подключение к комнате ${roomId}`);
  
  // ✅ СОЗДАЁМ SSE STREAM
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;
  
  const stream = new ReadableStream({
    async start(controller) {
      // Отправляем начальное подключение
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`));
      
      // ✅ ПОДПИСЫВАЕМСЯ НА ИЗМЕНЕНИЯ В КОМНАТЕ
      // Используем Supabase Realtime для получения обновлений
      const channel = supabase
        .channel(`room_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: '_pidr_room_players',
            filter: `room_id=eq.${roomId}`
          },
          async (payload: any) => {
            console.log(`📡 [SSE] Изменение в комнате ${roomId}:`, payload.eventType);
            
            // Получаем актуальные данные комнаты
            const { data: players, error } = await supabase
              .from('_pidr_room_players')
              .select('*')
              .eq('room_id', roomId)
              .order('position', { ascending: true });
            
            if (error) {
              console.error(`❌ [SSE] Ошибка получения игроков:`, error);
              return;
            }
            
            // Отправляем обновление всем подключенным клиентам
            const update = {
              type: 'room_update',
              roomId,
              players: players || [],
              timestamp: new Date().toISOString()
            };
            
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
            } catch (err) {
              console.error(`❌ [SSE] Ошибка отправки:`, err);
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 [SSE] Статус подписки для комнаты ${roomId}:`, status);
        });
      
      // ✅ ПЕРИОДИЧЕСКИ ОТПРАВЛЯЕМ HEARTBEAT
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (err) {
          console.error(`❌ [SSE] Ошибка heartbeat:`, err);
          clearInterval(intervalId);
          supabase.removeChannel(channel);
        }
      }, 30000); // Каждые 30 секунд
      
      // ✅ ОБРАБОТКА ЗАКРЫТИЯ СОЕДИНЕНИЯ
      request.signal.addEventListener('abort', () => {
        console.log(`🔌 [SSE] Отключение от комнаты ${roomId}`);
        clearInterval(intervalId);
        supabase.removeChannel(channel);
        try {
          controller.close();
        } catch (err) {
          // Уже закрыт
        }
      });
    },
    cancel() {
      console.log(`🔌 [SSE] Поток отменён для комнаты ${roomId}`);
      clearInterval(intervalId);
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Для nginx
    },
  });
}

