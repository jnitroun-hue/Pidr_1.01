/**
 * 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА КОМНАТ
 * Вызывается при обычных запросах, не требует Vercel Cron
 */

import { supabase } from './supabase';

let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 минут

/**
 * Легкая очистка - выполняется быстро, не блокирует запросы
 */
export async function lightCleanup() {
  const now = Date.now();
  
  // Проверяем, прошло ли 5 минут с последней очистки
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return { skipped: true, message: 'Очистка еще не требуется' };
  }
  
  lastCleanup = now;
  
  console.log('🧹 [AUTO-CLEANUP] Запуск легкой очистки...');
  
  try {
    let deletedCount = 0;
    
    // 1️⃣ УДАЛЯЕМ ПУСТЫЕ КОМНАТЫ (БЕЗ ИГРОКОВ)
    const { data: emptyRooms, error: emptyError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code')
      .eq('status', 'waiting')
      .eq('current_players', 0);
    
    if (emptyRooms && emptyRooms.length > 0) {
      const { error: deleteError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', emptyRooms.map((r: { id: number; room_code: string }) => r.id));
      
      if (!deleteError) {
        deletedCount += emptyRooms.length;
        console.log(`✅ [AUTO-CLEANUP] Удалено ${emptyRooms.length} пустых комнат`);
      }
    }
    
    // 2️⃣ УДАЛЯЕМ СТАРЫЕ КОМНАТЫ (> 10 МИНУТ БЕЗ АКТИВНОСТИ)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: oldRooms, error: oldError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code')
      .eq('status', 'waiting')
      .or(`last_activity.lt.${tenMinutesAgo},last_activity.is.null`); // ✅ ИСПОЛЬЗУЕМ last_activity
    
    if (oldRooms && oldRooms.length > 0) {
      const { error: deleteError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', oldRooms.map((r: { id: number; room_code: string }) => r.id));
      
      if (!deleteError) {
        deletedCount += oldRooms.length;
        console.log(`✅ [AUTO-CLEANUP] Удалено ${oldRooms.length} старых комнат`);
      }
    }
    
    // 3️⃣ УДАЛЯЕМ ЗАВЕРШЕННЫЕ ИГРЫ (> 10 МИНУТ)
    const { data: finishedRooms, error: finError } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('status', 'finished')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
    
    if (finishedRooms && finishedRooms.length > 0) {
      const { error: deleteError } = await supabase
        .from('_pidr_rooms')
        .delete()
        .in('id', finishedRooms.map((r: { id: number }) => r.id));
      
      if (!deleteError) {
        deletedCount += finishedRooms.length;
        console.log(`✅ [AUTO-CLEANUP] Удалено ${finishedRooms.length} завершенных игр`);
      }
    }
    
    // 4️⃣ ОБНОВЛЯЕМ СТАТУС НА OFFLINE (неактивны > 3 МИНУТ)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { error: statusError } = await supabase
      .from('_pidr_users')
      .update({ status: 'offline' })
      .eq('status', 'online')
      .lt('last_seen', threeMinutesAgo);
    
    if (!statusError) {
      console.log(`✅ [AUTO-CLEANUP] Обновлен статус неактивных пользователей на offline`);
    }
    
    console.log(`✅ [AUTO-CLEANUP] Очистка завершена! Удалено комнат: ${deletedCount}`);
    
    return {
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('❌ [AUTO-CLEANUP] Ошибка:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Удаление офлайн игроков из комнат
 * Вызывается при присоединении к комнате
 */
export async function cleanupOfflinePlayers() {
  try {
    console.log('🧹 [AUTO-CLEANUP] Удаление офлайн игроков...');
    
    const { data: offlineUsers } = await supabase
      .from('_pidr_users')
      .select('telegram_id')
      .lt('last_seen', new Date(Date.now() - 3 * 60 * 1000).toISOString())
      .neq('status', 'online');
    
    if (offlineUsers && offlineUsers.length > 0) {
      const { error } = await supabase
        .from('_pidr_room_players')
        .delete()
        .in('user_id', offlineUsers.map((u: any) => u.telegram_id));
      
      if (!error) {
        console.log(`✅ [AUTO-CLEANUP] Удалено ${offlineUsers.length} офлайн игроков`);
        return { success: true, count: offlineUsers.length };
      }
    }
    
    return { success: true, count: 0 };
  } catch (error: any) {
    console.error('❌ [AUTO-CLEANUP] Ошибка удаления офлайн игроков:', error);
    return { success: false, error: error.message };
  }
}

