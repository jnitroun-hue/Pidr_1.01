import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://your-app.com';

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// POST /api/telegram-multiplayer - Создать игру и пригласить друзей через Telegram
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, friendIds, roomId, roomCode, gameSettings } = await req.json();

    if (action === 'invite-friends') {
      // Отправляем приглашения друзьям
      const invitations = [];
      
      for (const friendId of friendIds) {
        // Создаем персональную ссылку-приглашение
        const inviteUrl = `${APP_URL}/game?roomId=${roomId}&roomCode=${roomCode}&invitedBy=${userId}`;
        
        // Создаем запись в базе данных
        const { data: invitation, error } = await supabase
          .from('game_invitations')
          .insert({
            room_id: roomId,
            inviter_id: userId,
            invited_id: friendId,
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
        }
      }

      return NextResponse.json({
        success: true,
        invitations,
        message: `Отправлено ${invitations.length} приглашений`
      });
    }

    if (action === 'accept-invitation') {
      const { invitationId } = await req.json();
      
      // Обновляем статус приглашения
      const { error } = await supabase
        .from('game_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', invitationId)
        .eq('invited_id', userId);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Приглашение принято'
      });
    }

    if (action === 'create-telegram-room') {
      // Создаем комнату специально для Telegram игры
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          name: `Telegram игра ${new Date().toLocaleTimeString()}`,
          host_id: userId,
          max_players: gameSettings?.maxPlayers || 4,
          current_players: 1,
          is_private: false,
          source: 'telegram',
          game_settings: {
            ...gameSettings,
            telegramIntegration: true
          }
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Добавляем хоста как первого игрока
      await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          position: 0,
          is_ready: true,
          source: 'telegram'
        });

      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          code: room.room_code,
          name: room.name,
          telegramShareUrl: `https://t.me/share/url?url=${encodeURIComponent(
            `${APP_URL}/game?roomId=${room.id}&roomCode=${room.room_code}&host=true`
          )}&text=${encodeURIComponent(
            `🎮 Присоединяйся к игре P.I.D.R.!\n\n` +
            `🎯 Комната: ${room.room_code}\n` +
            `👥 Игроков: ${room.current_players}/${room.max_players}\n\n` +
            `Нажми на ссылку чтобы играть!`
          )}`
        }
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Telegram multiplayer API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/telegram-multiplayer - Получить информацию о приглашениях
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'pending';

    if (type === 'pending') {
      // Получаем входящие приглашения
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select(`
          id, room_id, created_at, invitation_url,
          users!game_invitations_inviter_id_fkey (username, firstName, avatar),
          game_rooms (room_code, name, current_players, max_players, status)
        `)
        .eq('invited_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pendingInvitations = invitations?.map((inv: any) => ({
        id: inv.id,
        roomId: inv.room_id,
        inviterName: inv.users?.username || inv.users?.firstName || 'Игрок',
        inviterAvatar: inv.users?.avatar || '🎮',
        roomCode: inv.game_rooms?.room_code,
        roomName: inv.game_rooms?.name,
        playerCount: `${inv.game_rooms?.current_players}/${inv.game_rooms?.max_players}`,
        status: inv.game_rooms?.status,
        inviteUrl: inv.invitation_url,
        createdAt: inv.created_at
      })) || [];

      return NextResponse.json({
        success: true,
        invitations: pendingInvitations
      });
    }

    if (type === 'sent') {
      // Получаем отправленные приглашения
      const { data: invitations, error } = await supabase
        .from('game_invitations')
        .select(`
          id, room_id, status, created_at, accepted_at,
          users!game_invitations_invited_id_fkey (username, firstName, avatar),
          game_rooms (room_code, name, status)
        `)
        .eq('inviter_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const sentInvitations = invitations?.map((inv: any) => ({
        id: inv.id,
        roomId: inv.room_id,
        invitedName: inv.users?.username || inv.users?.firstName || 'Игрок',
        invitedAvatar: inv.users?.avatar || '🎮',
        roomCode: inv.game_rooms?.room_code,
        roomName: inv.game_rooms?.name,
        status: inv.status,
        createdAt: inv.created_at,
        acceptedAt: inv.accepted_at
      })) || [];

      return NextResponse.json({
        success: true,
        invitations: sentInvitations
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Telegram multiplayer GET error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
