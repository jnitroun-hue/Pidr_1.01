/**
 * ============================================================
 * TELEGRAM MULTIPLAYER API
 * ============================================================
 * API для Telegram-интеграции мультиплеера
 * Использует реальные таблицы _pidr_rooms, _pidr_room_players
 * Redis для real-time состояний
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../lib/auth-utils';
import {
  atomicJoinRoom,
  atomicLeaveRoom,
  getPlayerRoom,
  removePlayerFromAllRooms,
  getRoomDetails,
} from '../../../lib/multiplayer/player-state-manager';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://your-app.com';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================
// POST /api/telegram-multiplayer
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // ✅ Универсальная авторизация через cookie/JWT
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, environment } = auth;

    // Получаем ID из БД
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
    if (!dbUserId || !user) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await req.json();
    const { action, friendIds, roomId, roomCode, gameSettings } = body;

    // ============================================================
    // ACTION: invite-friends — Отправить приглашения друзьям
    // ============================================================
    if (action === 'invite-friends') {
      if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
        return NextResponse.json({ success: false, message: 'Не указаны друзья для приглашения' }, { status: 400 });
      }

      if (!roomId || !roomCode) {
        return NextResponse.json({ success: false, message: 'Не указаны roomId/roomCode' }, { status: 400 });
      }

      const invitations = [];

      for (const friendId of friendIds) {
        const inviteUrl = `${APP_URL}/game?roomId=${roomId}&roomCode=${roomCode}&invitedBy=${dbUserId}`;

        // Сохраняем приглашение в _pidr_room_invites
        const { data: invitation, error } = await supabaseAdmin
          .from('_pidr_room_invites')
          .insert({
            room_id: roomId,
            from_user_id: String(dbUserId),
            to_user_id: String(friendId),
            invitation_url: inviteUrl,
            status: 'pending'
          })
          .select()
          .single();

        if (!error && invitation) {
          invitations.push({
            friendId,
            invitationId: invitation.id,
            inviteUrl
          });
        } else {
          console.error(`❌ [Invite] Ошибка создания приглашения для ${friendId}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        invitations,
        message: `Отправлено ${invitations.length} приглашений`
      });
    }

    // ============================================================
    // ACTION: accept-invitation — Принять приглашение
    // ============================================================
    if (action === 'accept-invitation') {
      const { invitationId } = body;

      if (!invitationId) {
        return NextResponse.json({ success: false, message: 'Не указан invitationId' }, { status: 400 });
      }

      // Обновляем статус приглашения
      const { data: invite, error } = await supabaseAdmin
        .from('_pidr_room_invites')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('to_user_id', String(dbUserId))
        .select('room_id')
        .single();

      if (error || !invite) {
        return NextResponse.json({ success: false, message: 'Приглашение не найдено или уже обработано' }, { status: 404 });
      }

      // Получаем комнату
      const { data: room } = await supabaseAdmin
        .from('_pidr_rooms')
        .select('id, room_code, max_players, status')
        .eq('id', invite.room_id)
        .in('status', ['waiting', 'playing'])
        .single();

      if (!room) {
        return NextResponse.json({ success: false, message: 'Комната не найдена или уже закрыта' }, { status: 404 });
      }

      // Атомарно присоединяемся через Redis
      const telegramId = user.telegram_id || String(dbUserId);
      const joinResult = await atomicJoinRoom({
        userId: telegramId,
        username: user.username || user.first_name || 'Игрок',
        roomId: room.id,
        roomCode: room.room_code,
        maxPlayers: room.max_players,
        isHost: false,
      });

      if (!joinResult.success) {
        return NextResponse.json({
          success: false,
          message: joinResult.error || 'Не удалось присоединиться к комнате'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Приглашение принято',
        room: {
          id: room.id,
          roomCode: room.room_code,
          position: joinResult.position
        }
      });
    }

    // ============================================================
    // ACTION: create-telegram-room — Создать комнату из Telegram
    // ============================================================
    if (action === 'create-telegram-room') {
      const telegramId = user.telegram_id || String(dbUserId);

      // Проверяем нет ли активной комнаты
      const currentRoomId = await getPlayerRoom(telegramId);
      if (currentRoomId) {
        // Проверяем существует ли комната в БД
        const { data: existingRoom } = await supabaseAdmin
          .from('_pidr_rooms')
          .select('id, name, room_code')
          .eq('id', currentRoomId)
          .in('status', ['waiting', 'playing'])
          .single();

        if (existingRoom) {
          return NextResponse.json({
            success: false,
            message: `У вас уже есть активная комната "${existingRoom.name}" (${existingRoom.room_code})`,
            currentRoom: existingRoom
          }, { status: 400 });
        } else {
          // Комната в Redis но не в БД — чистим
          await removePlayerFromAllRooms(telegramId);
        }
      }

      // Создаём комнату в БД
      const newRoomCode = roomCode || generateRoomCode();
      const now = new Date().toISOString();

      const { data: room, error: roomError } = await supabaseAdmin
        .from('_pidr_rooms')
        .insert({
          room_code: newRoomCode,
          name: `Telegram игра ${new Date().toLocaleTimeString('ru-RU')}`,
          host_id: dbUserId,
          max_players: gameSettings?.maxPlayers || 4,
          current_players: 0,
          status: 'waiting',
          is_private: false,
          settings: {
            ...(gameSettings || {}),
            source: 'telegram',
            telegramIntegration: true
          },
          created_at: now,
          updated_at: now,
          last_activity: now
        })
        .select()
        .single();

      if (roomError || !room) {
        console.error('❌ [Telegram Room] Ошибка создания комнаты:', roomError);
        return NextResponse.json({ success: false, message: 'Ошибка создания комнаты' }, { status: 500 });
      }

      // Атомарно добавляем хоста через Redis
      const joinResult = await atomicJoinRoom({
        userId: telegramId,
        username: user.username || user.first_name || 'Хост',
        roomId: room.id,
        roomCode: newRoomCode,
        maxPlayers: gameSettings?.maxPlayers || 4,
        isHost: true,
      });

      if (!joinResult.success) {
        // Откатываем
        await supabaseAdmin.from('_pidr_rooms').delete().eq('id', room.id);
        return NextResponse.json({
          success: false,
          message: joinResult.error || 'Ошибка добавления хоста в комнату'
        }, { status: 500 });
      }

      // Формируем Telegram Share URL
      const gameUrl = `${APP_URL}/game?roomId=${room.id}&roomCode=${newRoomCode}&host=true`;
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(
        `🎮 Присоединяйся к игре P.I.D.R.!\n\n` +
        `🎯 Комната: ${newRoomCode}\n` +
        `👥 Игроков: 1/${room.max_players}\n\n` +
        `Нажми на ссылку чтобы играть!`
      )}`;

      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          code: newRoomCode,
          name: room.name,
          position: joinResult.position,
          isHost: true,
          telegramShareUrl
        }
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });

  } catch (error: unknown) {
    console.error('❌ [Telegram Multiplayer] POST error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================
// GET /api/telegram-multiplayer — Получить приглашения
// ============================================================

export async function GET(req: NextRequest) {
  try {
    // ✅ Универсальная авторизация
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, environment } = auth;
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !user) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'pending';

    // ============================================================
    // type: pending — Входящие приглашения
    // ============================================================
    if (type === 'pending') {
      const { data: invites, error } = await supabaseAdmin
        .from('_pidr_room_invites')
        .select('id, room_id, from_user_id, invitation_url, status, created_at')
        .eq('to_user_id', String(dbUserId))
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ [Telegram Multiplayer] Ошибка загрузки приглашений:', error);
        return NextResponse.json({ success: false, message: 'Ошибка загрузки приглашений' }, { status: 500 });
      }

      // Обогащаем данными из БД
      const enrichedInvites = await Promise.all((invites || []).map(async (inv: any) => {
        // Получаем данные приглашающего
        const { data: inviter } = await supabaseAdmin
          .from('_pidr_users')
          .select('username, first_name, avatar_url')
          .or(`id.eq.${inv.from_user_id},telegram_id.eq.${inv.from_user_id}`)
          .single();

        // Получаем данные комнаты
        const { data: room } = await supabaseAdmin
          .from('_pidr_rooms')
          .select('room_code, name, current_players, max_players, status')
          .eq('id', inv.room_id)
          .single();

        // Обогащаем кол-вом игроков из Redis
        let actualPlayers = room?.current_players || 0;
        try {
          const details = await getRoomDetails(inv.room_id);
          if (details) actualPlayers = details.playerCount;
        } catch {}

        return {
          id: inv.id,
          roomId: inv.room_id,
          inviterName: inviter?.username || inviter?.first_name || 'Игрок',
          inviterAvatar: inviter?.avatar_url || '🎮',
          roomCode: room?.room_code,
          roomName: room?.name,
          playerCount: `${actualPlayers}/${room?.max_players || 4}`,
          status: room?.status,
          inviteUrl: inv.invitation_url,
          createdAt: inv.created_at
        };
      }));

      return NextResponse.json({
        success: true,
        invitations: enrichedInvites
      });
    }

    // ============================================================
    // type: sent — Отправленные приглашения
    // ============================================================
    if (type === 'sent') {
      const { data: invites, error } = await supabaseAdmin
        .from('_pidr_room_invites')
        .select('id, room_id, to_user_id, status, created_at, accepted_at')
        .eq('from_user_id', String(dbUserId))
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ [Telegram Multiplayer] Ошибка загрузки отправленных:', error);
        return NextResponse.json({ success: false, message: 'Ошибка загрузки приглашений' }, { status: 500 });
      }

      const enrichedSent = await Promise.all((invites || []).map(async (inv: any) => {
        const { data: invited } = await supabaseAdmin
          .from('_pidr_users')
          .select('username, first_name, avatar_url')
          .or(`id.eq.${inv.to_user_id},telegram_id.eq.${inv.to_user_id}`)
          .single();

        const { data: room } = await supabaseAdmin
          .from('_pidr_rooms')
          .select('room_code, name, status')
          .eq('id', inv.room_id)
          .single();

        return {
          id: inv.id,
          roomId: inv.room_id,
          invitedName: invited?.username || invited?.first_name || 'Игрок',
          invitedAvatar: invited?.avatar_url || '🎮',
          roomCode: room?.room_code,
          roomName: room?.name,
          status: inv.status,
          createdAt: inv.created_at,
          acceptedAt: inv.accepted_at
        };
      }));

      return NextResponse.json({
        success: true,
        invitations: enrichedSent
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });

  } catch (error: unknown) {
    console.error('❌ [Telegram Multiplayer] GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
