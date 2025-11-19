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
import { lightCleanup, cleanupOfflinePlayers } from '../../../lib/auto-cleanup';

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
  
  // 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА (не блокирует запрос)
  lightCleanup().catch(err => console.error('❌ Ошибка автоочистки:', err));
  
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
      
      // 🧹 Легкая очистка перед созданием комнаты
      lightCleanup().catch(err => console.error('❌ Ошибка автоочистки:', err));
      
      // 1. ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      // ✅ userId может быть либо UUID (из JWT), либо telegram_id (из headers)
      // Сначала пробуем найти по telegram_id, потом по id
      let userData: any = null;
      let userError: any = null;
      
      // Попытка 1: ищем по telegram_id
      const telegramIdResult = await supabase
        .from('_pidr_users')
        .select('id, username, telegram_id')
        .eq('telegram_id', userId)
        .maybeSingle();
      
      if (telegramIdResult.data) {
        userData = telegramIdResult.data;
      } else {
        // Попытка 2: ищем по UUID (если userId это UUID)
        const uuidResult = await supabase
          .from('_pidr_users')
          .select('id, username, telegram_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (uuidResult.data) {
          userData = uuidResult.data;
        } else {
          userError = telegramIdResult.error || uuidResult.error;
        }
      }
      
      if (!userData || !userData.username) {
        console.error('❌ Не удалось получить данные пользователя:', userError);
        console.error('❌ userId:', userId);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }
      
      const userUUID = userData.id;
      const userTelegramId = userData.telegram_id;
      console.log(`👤 Пользователь найден: UUID=${userUUID}, telegram_id=${userTelegramId}`);
      
      // 2. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК СОЗДАТЬ КОМНАТУ
      // ✅ Используем telegram_id для Redis (string)
      const currentRoomId = await getPlayerRoom(userTelegramId.toString());
      
      if (currentRoomId) {
        // Проверяем существует ли эта комната в БД (СРАВНИВАЕМ UUID С UUID!)
        const { data: existingRoom } = await supabase
          .from('_pidr_rooms')
          .select('id, name, room_code')
          .eq('id', currentRoomId)
          .eq('host_id', userUUID) // ✅ Используем UUID!
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
          await removePlayerFromAllRooms(userTelegramId.toString());
        }
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
          host_id: userUUID, // ✅ ИСПОЛЬЗУЕМ UUID, А НЕ TELEGRAM_ID!
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
      // ✅ Используем telegram_id для Redis
      const joinResult = await atomicJoinRoom({
        userId: userTelegramId.toString(),
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
      
      // 🧹 Удаляем офлайн игроков перед присоединением
      await cleanupOfflinePlayers();
      
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
      // ✅ userId может быть либо UUID, либо telegram_id
      let userData2: any = null;
      
      const telegramIdResult2 = await supabase
        .from('_pidr_users')
        .select('id, username, telegram_id')
        .eq('telegram_id', userId)
        .maybeSingle();
      
      if (telegramIdResult2.data) {
        userData2 = telegramIdResult2.data;
      } else {
        const uuidResult2 = await supabase
          .from('_pidr_users')
          .select('id, username, telegram_id')
          .eq('id', userId)
          .maybeSingle();
        
        userData2 = uuidResult2.data;
      }
      
      if (!userData2 || !userData2.username) {
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }
      
      const userUUID2 = userData2.id;
      const userTelegramId2 = userData2.telegram_id;
      console.log(`👤 Пользователь найден: UUID=${userUUID2}, telegram_id=${userTelegramId2}`);
      
      // 4. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК ПРИСОЕДИНИТЬСЯ
      // ✅ Используем telegram_id для Redis
      const canJoin = await canPlayerJoinRoom(userTelegramId2.toString(), room.id);
      
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
      
      // 5. ОПРЕДЕЛЯЕМ ЯВЛЯЕТСЯ ЛИ ИГРОК ХОСТОМ (СРАВНИВАЕМ UUID С UUID!)
      const isHost = room.host_id === userUUID2; // ✅ Сравниваем UUID с UUID!
      
      // 6. АТОМАРНО ПРИСОЕДИНЯЕМСЯ К КОМНАТЕ
      // ✅ Используем telegram_id для Redis
      const joinResult = await atomicJoinRoom({
        userId: userTelegramId2.toString(),
        username: userData2.username,
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
      
      console.log(`✅ Игрок ${userTelegramId2} присоединился к комнате ${room.room_code} на позиции ${joinResult.position}`);
      
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
      
      // ✅ ПОЛУЧАЕМ telegram_id для Redis
      let userTelegramId3: string = userId;
      
      // Если userId это UUID, получаем telegram_id
      const uuidCheck = await supabase
        .from('_pidr_users')
        .select('telegram_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (uuidCheck.data) {
        userTelegramId3 = uuidCheck.data.telegram_id.toString();
      }
      
      // АТОМАРНО ВЫХОДИМ ИЗ КОМНАТЫ
      // ✅ Используем telegram_id для Redis
      const leaveResult = await atomicLeaveRoom({
        userId: userTelegramId3,
        roomId,
      });
      
      if (!leaveResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: leaveResult.error || 'Не удалось выйти из комнаты' 
        }, { status: 500 });
      }
      
      console.log(`✅ Игрок ${userTelegramId3} вышел из комнаты ${roomId}`);
      
      // Проверяем нужно ли удалить комнату (если хост вышел и комната пустая)
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('host_id, current_players')
        .eq('id', roomId)
        .single();
      
      if (room && room.current_players === 0) {
        // ✅ ПОЛУЧАЕМ UUID ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID ДЛЯ СРАВНЕНИЯ
        const { data: userData } = await supabase
          .from('_pidr_users')
          .select('id')
          .eq('telegram_id', userId)
          .single();
        
        if (userData && room.host_id === userData.id) { // ✅ Сравниваем UUID с UUID!
          console.log(`🗑️ Удаляем пустую комнату хоста ${roomId}`);
          await supabase
            .from('_pidr_rooms')
            .delete()
            .eq('id', roomId);
        }
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
    
    const telegramId = auth.userId as string; // ✅ Это telegram_id!
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Room ID required' 
      }, { status: 400 });
    }
    
    // ✅ ПОЛУЧАЕМ UUID ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const userUUID = userData.id;
    
    // Проверяем что пользователь - хост комнаты (СРАВНИВАЕМ UUID С UUID!)
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
    
    if (room.host_id !== userUUID) { // ✅ Сравниваем UUID с UUID!
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
    
    console.log(`✅ Комната ${roomId} удалена хостом ${telegramId} (UUID: ${userUUID})`);
    
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
