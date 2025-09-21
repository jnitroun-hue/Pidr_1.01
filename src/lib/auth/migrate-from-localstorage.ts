// Утилита для миграции данных с localStorage на базу данных
// Используется только при первом запуске для существующих пользователей

export interface LocalStorageUserData {
  id?: string;
  telegram_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  coins?: number;
  rating?: number;
  games_played?: number;
  games_won?: number;
}

export class LocalStorageMigration {
  
  /**
   * Проверяет, есть ли данные в localStorage, которые нужно мигрировать
   */
  static hasLocalStorageData(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userData = localStorage.getItem('user') || localStorage.getItem('current_user');
    const authToken = localStorage.getItem('auth_token');
    
    return !!(userData || authToken);
  }

  /**
   * Получает данные пользователя из localStorage
   */
  static getLocalStorageUserData(): LocalStorageUserData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = localStorage.getItem('user') || localStorage.getItem('current_user');
      if (!userData) return null;
      
      return JSON.parse(userData);
    } catch (error) {
      console.warn('Ошибка парсинга данных из localStorage:', error);
      return null;
    }
  }

  /**
   * Получает токен авторизации из localStorage
   */
  static getLocalStorageToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Очищает все данные P.I.D.R. из localStorage после успешной миграции
   */
  static clearLocalStorageData(): void {
    if (typeof window === 'undefined') return;
    
    const keysToRemove = [
      'user',
      'current_user', 
      'auth_token',
      'pidr-coins',
      'pidr-purchases',
      'pidr-settings',
      'pidr-theme',
      'pidr-color-scheme',
      'lastDailyBonus',
      'pending_referral_code',
      'userAvatar',
      'wallet_transactions',
      'multiplayer_game_data'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Данные P.I.D.R. очищены из localStorage');
  }

  /**
   * Мигрирует данные пользователя в базу данных через API
   */
  static async migrateUserData(userData: LocalStorageUserData): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/migrate-from-localstorage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'migrate_user_data',
          userData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Данные пользователя успешно мигрированы в БД');
        return true;
      } else {
        console.error('❌ Ошибка миграции:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка миграции данных:', error);
      return false;
    }
  }

  /**
   * Полная миграция: проверяет localStorage, мигрирует данные, очищает localStorage
   */
  static async performFullMigration(): Promise<{
    migrated: boolean;
    userData?: LocalStorageUserData;
    message: string;
  }> {
    // Проверяем, есть ли данные для миграции
    if (!this.hasLocalStorageData()) {
      return {
        migrated: false,
        message: 'Нет данных для миграции в localStorage'
      };
    }

    const userData = this.getLocalStorageUserData();
    if (!userData) {
      return {
        migrated: false,
        message: 'Не удалось получить данные пользователя из localStorage'
      };
    }

    // Пытаемся мигрировать данные
    const migrationSuccess = await this.migrateUserData(userData);
    
    if (migrationSuccess) {
      // Очищаем localStorage только после успешной миграции
      this.clearLocalStorageData();
      
      return {
        migrated: true,
        userData,
        message: 'Данные успешно мигрированы из localStorage в базу данных'
      };
    } else {
      return {
        migrated: false,
        userData,
        message: 'Ошибка миграции данных в базу данных'
      };
    }
  }

  /**
   * Показывает уведомление пользователю о миграции
   */
  static showMigrationNotification(migrationResult: any): void {
    if (typeof window === 'undefined') return;
    
    if (migrationResult.migrated) {
      // Можно показать toast или модальное окно
      console.log('🎉 Ваши данные успешно перенесены в облачную базу данных!');
    } else if (migrationResult.userData) {
      console.warn('⚠️ Не удалось перенести данные. Обратитесь в поддержку.');
    }
  }
}

// Автоматическая миграция при загрузке приложения (опционально)
export async function autoMigrateOnAppStart(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Проверяем, была ли уже выполнена миграция
  const migrationCompleted = localStorage.getItem('migration_completed');
  if (migrationCompleted) return;
  
  try {
    const result = await LocalStorageMigration.performFullMigration();
    
    if (result.migrated) {
      localStorage.setItem('migration_completed', 'true');
      LocalStorageMigration.showMigrationNotification(result);
    }
  } catch (error) {
    console.error('❌ Ошибка автоматической миграции:', error);
  }
}
