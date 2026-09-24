import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { atomicJoinRoom, atomicLeaveRoom, removePlayerFromAllRooms } from '@/lib/multiplayer/player-state-manager';
import { idsEqual, isRoomHostUser } from '@/lib/multiplayer/room-host';
import {
  characterAvatarPublicPath,
  isGeneratedCharacterAvatar,
  type CharacterAvatarStyle,
} from '@/lib/avatars/character-avatars';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT_AVATAR_STYLES: CharacterAvatarStyle[] = ['adventurer', 'avataaars', 'lorelei'];

function botPortrait(botId: number): string {
  const style = BOT_AVATAR_STYLES[Math.abs(botId) % BOT_AVATAR_STYLES.length];
  return characterAvatarPublicPath(style, `bot-${Math.abs(botId)}`);
}

function isUsableBotAvatar(url: string | null | undefined): boolean {
  return isGeneratedCharacterAvatar(url) || Boolean(url && /^https?:\/\//.test(url));
}

// 🤖 API ДЛЯ УПРАВЛЕНИЯ БОТАМИ В КОМНАТЕ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId, environment } = auth;
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }
    
    const telegramId = userId; // Для совместимости с остальным кодом
    const roomId = params.roomId;
    const body = await request.json();
    const { action } = body; // 'add' или 'remove'

    console.log(`🤖 Управление ботами: userId=${userId} (${environment}), roomId=${roomId}, action=${action}`);

    // ✅ ИСПОЛЬЗУЕМ dbUserId из getUserIdFromDatabase
    const userUUID = dbUserId;
    console.log(`👤 [BOTS] Пользователь найден: UUID=${userUUID}, userId=${userId}`);

    // ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ КОМНАТЫ И ПРАВА ХОСТА
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
    }

    const userIsHost = await isRoomHostUser(supabase, roomId, {
      dbUserId: userUUID,
      telegramId: dbUser.telegram_id ?? telegramId,
      vkId: dbUser.vk_id,
    });

    console.log(`🔍 [BOTS] Проверка хоста:`, {
      roomHostId: room.host_id,
      dbUserId: userUUID,
      telegramId,
      idsEqual: idsEqual(room.host_id, userUUID),
      userIsHost,
    });

    if (!userIsHost) {
      console.error(
        `❌ [BOTS] Пользователь ${telegramId} (db id: ${userUUID}) не хост комнаты (host_id: ${room.host_id})`
      );
      return NextResponse.json({ success: false, message: 'Только хост может управлять ботами' }, { status: 403 });
    }

    console.log(`✅ [BOTS] Пользователь ${telegramId} (db id: ${userUUID}) — хост комнаты ${roomId}`);

    if (action === 'add') {
      // ✅ ДОБАВЛЯЕМ БОТА: СНАЧАЛА ИЩЕМ СВОБОДНОГО ИЗ БД, ПОТОМ СОЗДАЁМ НОВОГО
      
      // ПОЛУЧАЕМ ТЕКУЩИХ ИГРОКОВ В КОМНАТЕ
      const { data: currentPlayers, error: playersError } = await supabase
        .from('_pidr_room_players')
        .select('position, user_id')
        .eq('room_id', roomId)
        .order('position', { ascending: false });

      if (playersError) {
        console.error('❌ Ошибка получения игроков:', playersError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения игроков: ' + playersError.message 
        }, { status: 500 });
      }

      // ПРОВЕРЯЕМ ЛИМИТ
      if (currentPlayers.length >= room.max_players) {
        return NextResponse.json({ 
          success: false, 
          message: `Достигнут максимум игроков: ${room.max_players}` 
        }, { status: 400 });
      }

      const maxPosition = currentPlayers[0]?.position || 0;
      const nextPosition = maxPosition + 1;
      
      // Боты уже в этой комнате (user_id хранится как telegram_id, отрицательная строка)
      const usedBotIds = new Set(
        currentPlayers
          .map((p: { user_id: string | number }) => String(p.user_id))
          .filter((id: string) => Number(id) < 0)
      );
      console.log(`🤖 [ADD BOT] Боты уже в комнате:`, [...usedBotIds]);

      // ✅ ШАГ 1: СВОБОДНЫЙ БОТ ИЗ БД.
      // «Занят» = сидит в комнате, которая реально живая (waiting/playing).
      // Раньше занятыми считались боты из ЛЮБЫХ комнат, включая давно завершённые,
      // поэтому свободных никогда не находилось и каждый раз создавался новый бот.
      const { data: activeRooms, error: activeRoomsError } = await supabase
        .from('_pidr_rooms')
        .select('id')
        .in('status', ['waiting', 'playing']);

      if (activeRoomsError) {
        console.warn('⚠️ [ADD BOT] Не удалось получить активные комнаты:', activeRoomsError);
      }

      const activeRoomIds = (activeRooms || []).map((r: { id: number }) => r.id);
      const busyBotIds = new Set<string>();

      if (activeRoomIds.length > 0) {
        const { data: busyRows, error: busyError } = await supabase
          .from('_pidr_room_players')
          .select('user_id, room_id')
          .in('room_id', activeRoomIds)
          .like('user_id', '-%');

        if (busyError) {
          console.warn('⚠️ [ADD BOT] Не удалось получить занятых ботов:', busyError);
        }
        for (const row of busyRows || []) {
          if (Number(row.user_id) < 0) busyBotIds.add(String(row.user_id));
        }
      }
      console.log(`🤖 [ADD BOT] Занятые боты (в живых комнатах):`, [...busyBotIds]);

      // telegram_id — VARCHAR, поэтому сравнение по числу делаем в коде, а не в SQL.
      const botColumns = 'telegram_id, username, first_name, avatar_url, is_bot';
      const byFlag = await supabase
        .from('_pidr_users')
        .select(botColumns)
        .eq('is_bot', true)
        .order('created_at', { ascending: true })
        .limit(500);
      const byId = await supabase
        .from('_pidr_users')
        .select('telegram_id, username, first_name, avatar_url')
        .like('telegram_id', '-%')
        .order('created_at', { ascending: true })
        .limit(500);

      if (byFlag.error) {
        console.warn('⚠️ [ADD BOT] Выборка is_bot:', byFlag.error.message);
      }
      if (byId.error) {
        console.error('❌ Ошибка получения ботов из БД:', byId.error);
      }

      const botMap = new Map<string, { telegram_id: string | number; username?: string | null; first_name?: string | null; avatar_url?: string | null }>();
      for (const row of [...(byFlag.data || []), ...(byId.data || [])]) {
        botMap.set(String(row.telegram_id), row);
      }
      const allBots = [...botMap.values()];

      const freeBots = (allBots || []).filter((b: { telegram_id: string | number }) => {
        const id = String(b.telegram_id);
        return Number(id) < 0 && !busyBotIds.has(id) && !usedBotIds.has(id);
      });

      console.log(`🤖 [ADD BOT] Ботов в БД: ${(allBots || []).length}, свободных: ${freeBots.length}`);

      let botId: number;
      let botName: string;
      let botAvatar: string | null;

      if (freeBots.length > 0) {
        // ✅ НАШЛИ СВОБОДНОГО БОТА — берём случайного, чтобы соперники не повторялись
        const selectedBot = freeBots[Math.floor(Math.random() * freeBots.length)];
        botId = Number(selectedBot.telegram_id);
        botName = selectedBot.username || selectedBot.first_name || `Бот_${Math.abs(botId) % 1000}`;
        botAvatar = isUsableBotAvatar(selectedBot.avatar_url)
          ? selectedBot.avatar_url!
          : botPortrait(botId);

        // Хвосты в завершённых/отменённых комнатах и Redis — чистим, иначе atomicJoinRoom
        // решит, что бот «уже в другой комнате».
        try {
          await removePlayerFromAllRooms(String(botId));
        } catch (cleanupError) {
          console.warn('⚠️ [ADD BOT] Очистка старых комнат бота:', cleanupError);
        }

        console.log(`✅ [ADD BOT] Используем бота из БД: ${botName} (ID: ${botId})`);
      } else {
        // ❌ СВОБОДНЫХ БОТОВ НЕТ — только теперь создаём нового
        console.log(`⚠️ [ADD BOT] Свободных ботов нет (все ${busyBotIds.size} заняты), создаём нового...`);

        botId = -(Date.now() + Math.floor(Math.random() * 1000));

        const botFirstNames = [
          'Александр', 'Дмитрий', 'Максим', 'Артём', 'Никита',
          'Владислав', 'Андрей', 'Иван', 'Егор', 'Михаил',
          'Даниил', 'Кирилл', 'Сергей', 'Павел', 'Роман'
        ];

        const randomName = botFirstNames[Math.floor(Math.random() * botFirstNames.length)];
        botName = `${randomName}_БОТ`;
        botAvatar = botPortrait(botId);

        const nowIso = new Date().toISOString();
        const botRow = {
          telegram_id: String(botId),
          username: botName,
          first_name: randomName,
          last_name: 'БОТ',
          coins: 5000,
          rating: 1000 + Math.floor(Math.random() * 500),
          games_played: Math.floor(Math.random() * 100),
          games_won: Math.floor(Math.random() * 50),
          status: 'online',
          online_status: 'in_room',
          last_seen: nowIso,
          is_bot: true,
          avatar_url: botAvatar,
        };
        let { error: createBotError } = await supabase.from('_pidr_users').insert(botRow);
        if (createBotError && /is_bot|online_status/i.test(createBotError.message || '')) {
          const { is_bot: _bot, online_status: _online, ...withoutFlags } = botRow;
          ({ error: createBotError } = await supabase.from('_pidr_users').insert(withoutFlags));
        }

        if (createBotError) {
          console.error('❌ Ошибка создания бота в _pidr_users:', createBotError);
          return NextResponse.json({ 
            success: false, 
            message: 'Ошибка создания бота: ' + createBotError.message 
          }, { status: 500 });
        }

        console.log(`✅ [ADD BOT] Создан новый бот: ${botName} (ID: ${botId})`);
      }

      // ✅ ИСПРАВЛЕНО: ДОБАВЛЯЕМ БОТА ЧЕРЕЗ atomicJoinRoom для синхронизации с Redis
      console.log(`🤖 [ADD BOT] Добавляем бота ${botName} (ID: ${botId}) в комнату ${roomId}`);
      
      const joinResult = await atomicJoinRoom({
        userId: String(botId), // ✅ telegram_id бота (отрицательное число)
        username: botName,
        roomId: String(roomId),
        roomCode: room.room_code,
        maxPlayers: room.max_players,
        isHost: false, // Боты не могут быть хостами
      });

      if (!joinResult.success) {
        console.error('❌ [ADD BOT] Ошибка добавления бота через atomicJoinRoom:', joinResult.error);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка добавления бота: ' + (joinResult.error || 'Неизвестная ошибка')
        }, { status: 500 });
      }

      // ✅ ОБНОВЛЯЕМ avatar_url для бота (atomicJoinRoom не устанавливает его)
      const seenAt = new Date().toISOString();
      await supabase
        .from('_pidr_users')
        .update({
          avatar_url: botAvatar,
          status: 'online',
          online_status: 'in_room',
          last_seen: seenAt,
        })
        .eq('telegram_id', String(botId));

      const { error: avatarError } = await supabase
        .from('_pidr_room_players')
        .update({ avatar_url: botAvatar, is_bot: true })
        .eq('room_id', roomId)
        .eq('user_id', String(botId));

      if (avatarError) {
        console.warn('⚠️ [ADD BOT] Ошибка обновления avatar_url (не критично):', avatarError);
      }

      // atomicJoinRoom уже синхронизирует current_players через БД.
      // Здесь только актуализируем last_activity, без ручного инкремента.
      await supabase
        .from('_pidr_rooms')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);

      console.log(`✅ [ADD BOT] Бот ${botName} успешно добавлен в комнату ${roomId} на позицию ${joinResult.position}`);

      try {
        const channel = supabase.channel(`room:${roomId}`);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 1500);
          channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              channel
                .send({
                  type: 'broadcast',
                  event: 'player-joined',
                  payload: {
                    userId: String(botId),
                    username: botName,
                    position: joinResult.position,
                    isHost: false,
                    isBot: true,
                    timestamp: Date.now(),
                  },
                })
                .finally(() => {
                  supabase.removeChannel(channel);
                  resolve();
                });
            }
          });
        });
        console.log(`📡 [ADD BOT] Broadcast отправлен для синхронизации клиентов`);
      } catch (broadcastError) {
        console.warn(`⚠️ [ADD BOT] Ошибка отправки broadcast (не критично):`, broadcastError);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Бот ${botName} добавлен`,
        bot: {
          id: botId,
          name: botName,
          position: joinResult.position || nextPosition
        }
      });

    } else if (action === 'remove') {
      // УДАЛЯЕМ ПОСЛЕДНЕГО БОТА
      
      const { data: bots, error: botsError } = await supabase
        .from('_pidr_room_players')
        .select('*')
        .eq('room_id', roomId)
        .lt('user_id', '0') // ОТРИЦАТЕЛЬНЫЕ ID = БОТЫ
        .order('position', { ascending: false })
        .limit(1);

      if (botsError || !bots || bots.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Нет ботов для удаления' 
        }, { status: 400 });
      }

      const botToRemove = bots[0];
      console.log(`🤖 Удаляем бота: ${botToRemove.username}`);

      const leaveResult = await atomicLeaveRoom({
        userId: String(botToRemove.user_id),
        roomId: String(roomId),
      });

      if (!leaveResult.success) {
        console.error('❌ Ошибка удаления бота через atomicLeaveRoom:', leaveResult.error);
        return NextResponse.json({
          success: false,
          message: leaveResult.error || 'Ошибка удаления бота',
        }, { status: 500 });
      }

      console.log(`✅ Бот ${botToRemove.username} удален из комнаты ${roomId}`);

      return NextResponse.json({
        success: true,
        message: `Бот ${botToRemove.username} удален`,
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Неизвестное действие. Используйте "add" или "remove"' 
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('❌ Ошибка API ботов:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
