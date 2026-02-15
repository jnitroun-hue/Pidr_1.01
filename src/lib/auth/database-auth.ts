import { supabase } from '../supabase';
import { SessionManager } from './session-manager';

/**
 * Сервис авторизации ТОЛЬКО через базу данных
 * Никакого localStorage - только HTTP-only cookies и БД сессии
 */

export interface DatabaseUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  telegramId?: string;
  avatar?: string;
  coins: number;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  referralCode?: string;
}

export class DatabaseAuth {
  // ✅ УПРОЩЕНО: SessionManager теперь только статический, экземпляр не нужен

  /**
   * Авторизация через Telegram
   */
  async loginWithTelegram(telegramData: {
    id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  }): Promise<{ user: DatabaseUser; sessionId: string } | null> {
    
    console.log('🔍 Поиск/создание Telegram пользователя в БД:', telegramData.id);

    try {
      // Ищем пользователя в БД
      const { data: users, error } = await supabase
        .from('_pidr_users')
        .select('*')
        .eq('telegram_id', telegramData.id.toString());

      if (error) {
        console.error('❌ Ошибка поиска пользователя:', error);
        return null;
      }

      let user;

      if (!users || users.length === 0) {
        // Создаем нового пользователя
        console.log('👤 Создаем нового Telegram пользователя');
        
        const newUserData = {
          telegram_id: telegramData.id.toString(),
          username: telegramData.username || telegramData.first_name || `user${telegramData.id}`,
          first_name: telegramData.first_name || '',
          last_name: telegramData.last_name || '',
          avatar_url: telegramData.photo_url || null,
          auth_type: 'telegram',
          coins: 1000,
          rating: 1000,
          games_played: 0,
          games_won: 0,
          referral_code: 'TG' + Date.now().toString().slice(-4),
          created_at: new Date().toISOString()
        };

        const { data: newUser, error: createError } = await supabase
          .from('_pidr_users')
          .insert([newUserData])
          .select()
          .single();

        if (createError) {
          console.error('❌ Ошибка создания пользователя:', createError);
          return null;
        }

        user = newUser;
        console.log('✅ Новый пользователь создан:', user.username);

      } else {
        user = users[0];
        console.log('✅ Найден существующий пользователь:', user.username);

        // Обновляем данные если изменились
        const updateData: any = {};
        if (telegramData.first_name && telegramData.first_name !== user.first_name) {
          updateData.first_name = telegramData.first_name;
        }
        if (telegramData.last_name && telegramData.last_name !== user.last_name) {
          updateData.last_name = telegramData.last_name;
        }
        if (telegramData.photo_url && telegramData.photo_url !== user.avatar_url) {
          updateData.avatar_url = telegramData.photo_url;
        }
        if (telegramData.username && telegramData.username !== user.username) {
          updateData.username = telegramData.username;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('_pidr_users')
            .update(updateData)
            .eq('id', user.id);

          if (!updateError) {
            Object.assign(user, updateData);
            console.log('✅ Данные пользователя обновлены');
          }
        }
      }

      // Создаем сессию в БД
      const sessionInfo = await SessionManager.createSession(
        user.id.toString(),
        'telegram',
        {
          userAgent: 'TelegramWebApp',
          ipAddress: '127.0.0.1' // В реальности получим из request
        }
      );

      if (!sessionInfo) {
        console.error('❌ Не удалось создать сессию');
        return null;
      }

      // Обновляем статус пользователя
      await supabase
        .from('_pidr_user_status')
        .upsert({
          user_id: user.id,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      const dbUser: DatabaseUser = {
        id: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramId: user.telegram_id,
        avatar: user.avatar_url,
        coins: user.coins || 1000,
        rating: user.rating || 1000,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        referralCode: user.referral_code
      };

      console.log('✅ Успешная авторизация через БД:', dbUser.username);
      
      return {
        user: dbUser,
        sessionId: sessionInfo.sessionId
      };

    } catch (error) {
      console.error('❌ Ошибка авторизации через Telegram:', error);
      return null;
    }
  }

  /**
   * Авторизация по логину/паролю
   */
  async loginWithCredentials(username: string, password: string): Promise<{ user: DatabaseUser; sessionId: string } | null> {
    console.log('🔍 Авторизация по логину:', username);

    try {
      const { data: users, error } = await supabase
        .from('_pidr_users')
        .select('*')
        .eq('username', username)
        .limit(1);

      if (error || !users || users.length === 0) {
        console.log('❌ Пользователь не найден:', username);
        return null;
      }

      const user = users[0];

      // Проверка пароля (если есть хэш)
      if (user.password_hash) {
        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          console.log('❌ Неверный пароль');
          return null;
        }
      }

      // Создаем сессию в БД
      const sessionInfo = await SessionManager.createSession(
        user.id.toString(),
        'web',
        {
          userAgent: 'WebBrowser',
          ipAddress: '127.0.0.1'
        }
      );

      if (!sessionInfo) {
        console.error('❌ Не удалось создать сессию');
        return null;
      }

      // Обновляем статус
      await supabase
        .from('_pidr_user_status')
        .upsert({
          user_id: user.id,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      const dbUser: DatabaseUser = {
        id: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramId: user.telegram_id,
        avatar: user.avatar_url,
        coins: user.coins || 1000,
        rating: user.rating || 1000,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        referralCode: user.referral_code
      };

      console.log('✅ Успешная авторизация по логину:', dbUser.username);
      
      return {
        user: dbUser,
        sessionId: sessionInfo.sessionId
      };

    } catch (error) {
      console.error('❌ Ошибка авторизации по логину:', error);
      return null;
    }
  }

  /**
   * Проверка активной сессии
   * ✅ ИСПРАВЛЕНО: Используем validateToken вместо validateSession
   */
  async validateSession(sessionId: string): Promise<DatabaseUser | null> {
    console.log('🔍 Проверка сессии:', sessionId);

    try {
      // ✅ ИСПРАВЛЕНО: sessionId здесь - это JWT токен
      const validation = await SessionManager.validateToken(sessionId);
      
      if (!validation.valid || !validation.userId) {
        console.log('❌ Сессия недействительна');
        return null;
      }

      // Получаем данные пользователя из БД
      // ✅ ИСПРАВЛЕНО: userId из JWT может быть строкой или числом, приводим к строке
      const userIdStr = String(validation.userId);
      const { data: user, error } = await supabase
        .from('_pidr_users')
        .select('*')
        .eq('telegram_id', userIdStr)
        .single();

      if (error || !user) {
        console.error('❌ Пользователь не найден в БД:', validation.userId);
        return null;
      }

      const dbUser: DatabaseUser = {
        id: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramId: user.telegram_id,
        avatar: user.avatar_url,
        coins: user.coins || 1000,
        rating: user.rating || 1000,
        gamesPlayed: user.games_played || 0,
        gamesWon: user.games_won || 0,
        referralCode: user.referral_code
      };

      console.log('✅ Сессия действительна для:', dbUser.username);
      return dbUser;

    } catch (error) {
      console.error('❌ Ошибка проверки сессии:', error);
      return null;
    }
  }

  /**
   * Выход (отзыв сессии)
   */
  async logout(sessionId: string): Promise<boolean> {
    console.log('🚪 Выход из системы:', sessionId);

    try {
      await SessionManager.revokeSession(sessionId);
      console.log('✅ Сессия отозвана');
      return true;
    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
      return false;
    }
  }

  /**
   * Отзыв всех сессий пользователя
   */
  async logoutAll(userId: string): Promise<boolean> {
    console.log('🚪 Выход из всех устройств:', userId);

    try {
      // TODO: Implement revokeAllUserSessions in SessionManager
      console.log('⚠️ revokeAllUserSessions не реализован');
      return true;
    } catch (error) {
      console.error('❌ Ошибка выхода из всех устройств:', error);
      return false;
    }
  }
}
