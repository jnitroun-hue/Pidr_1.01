/**
 * ============================================================
 * PROFESSIONAL MULTIPLAYER ROOMS API
 * ============================================================
 * API для управления игровыми комнатами с использованием
 * профессиональной архитектуры: Redis + PostgreSQL
 * 
 * Гарантии:
 * - Один игрок = одна комната (строгая проверка)
 * - Атомарные операции с distributed locks
 * - Правильное управление счетчиками
 * - Автоматическая очистка и синхронизация
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth-utils';
import {
  atomicJoinRoom,
  atomicLeaveRoom,
  canPlayerJoinRoom,
  getPlayerRoom,
  removePlayerFromAllRooms,
  getRoomDetails,
  healthCheck,
} from '../../../lib/multiplayer/player-state-manager';

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
// GET /api/rooms - Получить список комнат
// ============================================================

export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/rooms - загружаем комнаты');
  
  try {
    // Получаем параметры запроса
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'public';
    
    // Базовый запрос
    let query = supabase
      .from('_pidr_rooms')
      .select('*')
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Фильтр по типу
    if (type === 'public') {
      query = query.eq('is_private', false);
    }
    
    const { data: rooms, error } = await query;
    
    if (error) {
      console.error('❌ Ошибка загрузки комнат:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка загрузки комнат: ' + error.message 
      }, { status: 500 });
    }
    
    // Обогащаем данные о хостах
    const roomsWithHosts = await Promise.all((rooms || []).map(async (room: any) => {
      const { data: hostUser } = await supabase
        .from('_pidr_users')
        .select('username, avatar_url')
        .eq('id', room.host_id)
        .single();
      
      // Получаем реальное количество игроков из Redis
      const roomDetails = await getRoomDetails(room.id);
      const actualPlayerCount = roomDetails?.playerCount || room.current_players;
      
      return {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        max_players: room.max_players,
        current_players: actualPlayerCount, // Реальное количество из Redis
        status: room.status,
        is_private: room.is_private,
        created_at: room.created_at,
        users: { 
          username: hostUser?.username || 'Хост', 
          avatar: hostUser?.avatar_url || null 
        },
      };
    }));
    
    console.log(`✅ Загружено комнат: ${roomsWithHosts.length}`);
    
    return NextResponse.json({ 
      success: true, 
      rooms: roomsWithHosts
    });
    
  } catch (error: any) {
    console.error('❌ Rooms GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

// ============================================================
// POST /api/rooms - Создание / Присоединение / Выход
// ============================================================

export async function POST(req: NextRequest) {
  console.log('🏠 POST /api/rooms');
  
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ 
        success: false, 
        message: auth.error 
      }, { status: 401 });
    }
    
    const userId = auth.userId as string;
    const body = await req.json();
    const { action } = body;
    
    console.log(`📋 Action: ${action}, User: ${userId}`);
    
    // ============================================================
    // ACTION: CREATE - Создание комнаты
    // ============================================================
    
    if (action === 'create') {
      const { name, maxPlayers, gameMode, hasPassword, password, isPrivate } = body;
      
      console.log('🆕 Создание новой комнаты...');
      
      // 1. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК СОЗДАТЬ КОМНАТУ
      const currentRoomId = await getPlayerRoom(userId);
      
      if (currentRoomId) {
        // Проверяем существует ли эта комната в БД
        const { data: existingRoom } = await supabase
          .from('_pidr_rooms')
          .select('id, name, room_code')
          .eq('id', currentRoomId)
          .eq('host_id', userId)
          .in('status', ['waiting', 'playing'])
          .single();
        
        if (existingRoom) {
          return NextResponse.json({ 
            success: false, 
            message: `У вас уже есть активная комната "${existingRoom.name}" (${existingRoom.room_code}). Закройте её сначала.`,
            currentRoom: existingRoom
          }, { status: 400 });
        } else {
          // Комната есть в Redis но не в БД - очищаем Redis
          await removePlayerFromAllRooms(userId);
        }
      }
      
      // 2. ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      const { data: userData, error: userError } = await supabase
        .from('_pidr_users')
        .select('username')
        .eq('id', userId)
        .single();
      
      if (userError || !userData?.username) {
        console.error('❌ Не удалось получить данные пользователя:', userError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }
      
      // 3. СОЗДАЕМ КОМНАТУ В БД
      const roomCode = generateRoomCode();
      const roomSettings = {
        gameMode: gameMode || 'casual',
        isRanked: gameMode === 'ranked',
        allowBots: true,
        maxPlayers: maxPlayers || 6,
        hasPassword: hasPassword || false
      };
      
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          room_code: roomCode,
          name: name || 'Новая комната',
          host_id: userId,
          max_players: maxPlayers || 6,
          current_players: 0, // Будет обновлено atomicJoinRoom
          status: 'waiting',
          is_private: isPrivate || false,
          password: hasPassword ? password : null,
          settings: roomSettings,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (roomError) {
        console.error('❌ Ошибка создания комнаты:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты: ' + roomError.message 
        }, { status: 500 });
      }
      
      // 4. АТОМАРНО ДОБАВЛЯЕМ ХОСТА В КОМНАТУ
      const joinResult = await atomicJoinRoom({
        userId,
        username: userData.username,
        roomId: room.id,
        roomCode,
        maxPlayers: maxPlayers || 6,
        isHost: true, // Создатель = хост
      });
      
      if (!joinResult.success) {
        // Откатываем создание комнаты
        await supabase.from('_pidr_rooms').delete().eq('id', room.id);
        
        return NextResponse.json({ 
          success: false, 
          message: joinResult.error || 'Ошибка добавления хоста в комнату' 
        }, { status: 500 });
      }
      
      console.log(`✅ Комната создана: ${roomCode}, хост на позиции ${joinResult.position}`);
      
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode,
          name: room.name,
          status: room.status,
          position: joinResult.position,
          isHost: true
        }
      });
    }
    
    // ============================================================
    // ACTION: JOIN - Присоединение к комнате
    // ============================================================
    
    if (action === 'join') {
      const { roomCode, password } = body;
      
      if (!roomCode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Код комнаты обязателен' 
        }, { status: 400 });
      }
      
      console.log(`🚪 Присоединение к комнате: ${roomCode}`);
      
      // 1. НАХОДИМ КОМНАТУ В БД
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .in('status', ['waiting', 'playing'])
        .single();
      
      if (roomError || !room) {
        console.error('❌ Комната не найдена:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Комната не найдена или уже закрыта' 
        }, { status: 404 });
      }
      
      // 2. ПРОВЕРЯЕМ ПАРОЛЬ
      if (room.password && room.password !== password) {
        return NextResponse.json({ 
          success: false, 
          message: 'Неверный пароль' 
        }, { status: 403 });
      }
      
      // 3. ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      const { data: userData, error: userError } = await supabase
        .from('_pidr_users')
        .select('username')
        .eq('id', userId)
        .single();
      
      if (userError || !userData?.username) {
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }
      
      // 4. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК ПРИСОЕДИНИТЬСЯ
      const canJoin = await canPlayerJoinRoom(userId, room.id);
      
      if (!canJoin.canJoin && canJoin.currentRoomId !== room.id) {
        // Игрок уже в другой комнате
        const { data: currentRoom } = await supabase
          .from('_pidr_rooms')
          .select('name, room_code')
          .eq('id', canJoin.currentRoomId)
          .single();
        
        return NextResponse.json({ 
          success: false, 
          message: `Вы уже находитесь в комнате "${currentRoom?.name || 'Неизвестная'}" (${currentRoom?.room_code || '?'}). Покиньте её сначала.`,
          currentRoomId: canJoin.currentRoomId
        }, { status: 400 });
      }
      
      // 5. ОПРЕДЕЛЯЕМ ЯВЛЯЕТСЯ ЛИ ИГРОК ХОСТОМ
      const isHost = room.host_id === userId;
      
      // 6. АТОМАРНО ПРИСОЕДИНЯЕМСЯ К КОМНАТЕ
      const joinResult = await atomicJoinRoom({
        userId,
        username: userData.username,
        roomId: room.id,
        roomCode: room.room_code,
        maxPlayers: room.max_players,
        isHost,
      });
      
      if (!joinResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: joinResult.error || 'Не удалось присоединиться к комнате',
          currentRoomId: joinResult.currentRoomId
        }, { status: 400 });
      }
      
      console.log(`✅ Игрок ${userId} присоединился к комнате ${room.room_code} на позиции ${joinResult.position}`);
      
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          position: joinResult.position,
          isHost
        }
      });
    }
    
    // ============================================================
    // ACTION: LEAVE - Выход из комнаты
    // ============================================================
    
    if (action === 'leave') {
      const { roomId } = body;
      
      if (!roomId) {
        return NextResponse.json({ 
          success: false, 
          message: 'ID комнаты обязателен' 
        }, { status: 400 });
      }
      
      console.log(`🚶 Выход из комнаты: ${roomId}`);
      
      // АТОМАРНО ВЫХОДИМ ИЗ КОМНАТЫ
      const leaveResult = await atomicLeaveRoom({
        userId,
        roomId,
      });
      
      if (!leaveResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: leaveResult.error || 'Не удалось выйти из комнаты' 
        }, { status: 500 });
      }
      
      console.log(`✅ Игрок ${userId} вышел из комнаты ${roomId}`);
      
      // Проверяем нужно ли удалить комнату (если хост вышел и комната пустая)
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('host_id, current_players')
        .eq('id', roomId)
        .single();
      
      if (room && room.host_id === userId && room.current_players === 0) {
        console.log(`🗑️ Удаляем пустую комнату хоста ${roomId}`);
        await supabase
          .from('_pidr_rooms')
          .delete()
          .eq('id', roomId);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Вы вышли из комнаты' 
      });
    }
    
    // ============================================================
    // ACTION: HEALTH - Проверка здоровья системы
    // ============================================================
    
    if (action === 'health') {
      const health = await healthCheck();
      
      return NextResponse.json({
        success: health.redis && health.database,
        health,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Неизвестное действие: ' + action 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Rooms POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/rooms - Удаление комнаты (только хост)
// ============================================================

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ 
        success: false, 
        message: auth.error 
      }, { status: 401 });
    }
    
    const userId = auth.userId as string;
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Room ID required' 
      }, { status: 400 });
    }
    
    // Проверяем что пользователь - хост комнаты
    const { data: room } = await supabase
      .from('_pidr_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();
    
    if (!room) {
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена' 
      }, { status: 404 });
    }
    
    if (room.host_id !== userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Только хост может удалить комнату' 
      }, { status: 403 });
    }
    
    // Удаляем комнату (каскадно удалятся все связанные записи)
    const { error: deleteError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .eq('id', roomId);
    
    if (deleteError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнаты: ' + deleteError.message 
      }, { status: 500 });
    }
    
    console.log(`✅ Комната ${roomId} удалена хостом ${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Комната удалена' 
    });
    
  } catch (error: any) {
    console.error('❌ Rooms DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
