// 🗑️ СКРИПТ ДЛЯ УДАЛЕНИЯ ВСЕХ КОМНАТ ЧЕРЕЗ API
// Запуск: node delete-rooms-api.js

const BASE_URL = 'http://localhost:3000'; // Измени на свой URL если нужно

async function deleteAllRooms() {
  try {
    console.log('🔍 Получаем статистику комнат...');
    
    // Сначала получаем статистику
    const statsResponse = await fetch(`${BASE_URL}/api/admin/delete-all-rooms`);
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      console.log('📊 ТЕКУЩАЯ СТАТИСТИКА:');
      console.log(`   Всего комнат: ${statsData.stats.totalRooms}`);
      console.log(`   Ожидающих: ${statsData.stats.waitingRooms}`);
      console.log(`   В игре: ${statsData.stats.playingRooms}`);
      console.log(`   Завершенных: ${statsData.stats.finishedRooms}`);
      console.log(`   Всего игроков в комнатах: ${statsData.stats.totalPlayers}`);
      
      if (statsData.stats.totalRooms === 0) {
        console.log('✅ Комнаты уже отсутствуют!');
        return;
      }
      
      console.log('\n🗑️ Удаляем ВСЕ комнаты...');
      
      // Удаляем все комнаты
      const deleteResponse = await fetch(`${BASE_URL}/api/admin/delete-all-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirm: 'DELETE_ALL_ROOMS'
        })
      });
      
      const deleteData = await deleteResponse.json();
      
      if (deleteData.success) {
        console.log('✅ УСПЕШНО УДАЛЕНО:');
        console.log(`   Комнат: ${deleteData.deletedRooms}`);
        console.log(`   Игроков: ${deleteData.deletedPlayers}`);
        console.log('\n📋 Удаленные комнаты:');
        deleteData.roomsDeleted.forEach(room => {
          console.log(`   - ${room.room_code}: ${room.name} (${room.status}, ${room.players} игроков)`);
        });
      } else {
        console.error('❌ Ошибка удаления:', deleteData.message);
      }
    } else {
      console.error('❌ Ошибка получения статистики:', statsData.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем
deleteAllRooms();
