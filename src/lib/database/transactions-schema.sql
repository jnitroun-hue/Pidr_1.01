-- =====================================================
-- TRANSACTIONS TABLE FOR P.I.D.R. GAME
-- Таблица для хранения всех финансовых операций
-- =====================================================

-- Транзакции пользователей (депозиты, бонусы, покупки, выводы)
CREATE TABLE IF NOT EXISTS _pidr_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Тип транзакции
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'deposit',    -- Депозит (пополнение)
        'withdrawal', -- Вывод средств
        'bonus',      -- Бонус
        'purchase',   -- Покупка в магазине
        'game_win',   -- Выигрыш в игре
        'game_loss',  -- Проигрыш в игре
        'referral',   -- Реферальный бонус
        'penalty'     -- Штраф
    )),
    
    -- Сумма (положительная для пополнения, отрицательная для списания)
    amount INTEGER NOT NULL,
    
    -- Описание операции
    description TEXT NOT NULL,
    
    -- Дополнительные поля
    bonus_type VARCHAR(20), -- Тип бонуса (daily, referral, rank_up)
    game_id UUID,           -- ID игры (если связано с игрой)
    item_id VARCHAR(50),    -- ID товара (если покупка)
    
    -- Статус транзакции
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending',    -- В обработке
        'completed',  -- Завершена
        'failed',     -- Не удалась
        'cancelled'   -- Отменена
    )),
    
    -- Внешние данные
    external_tx_id VARCHAR(255), -- ID транзакции во внешней системе
    crypto_address VARCHAR(255), -- Адрес криптокошелька
    crypto_currency VARCHAR(10), -- Валюта (TON, USDT, etc.)
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы
    INDEX idx_pidr_transactions_user_id (user_id),
    INDEX idx_pidr_transactions_type (type),
    INDEX idx_pidr_transactions_status (status),
    INDEX idx_pidr_transactions_created_at (created_at),
    INDEX idx_pidr_transactions_bonus_type (bonus_type)
);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_pidr_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pidr_transactions_updated_at
    BEFORE UPDATE ON _pidr_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_pidr_transactions_updated_at();

-- RLS (Row Level Security) политики
ALTER TABLE _pidr_transactions ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои транзакции
CREATE POLICY "Users can view own transactions" ON _pidr_transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Пользователи не могут напрямую создавать транзакции (только через API)
CREATE POLICY "No direct inserts" ON _pidr_transactions
    FOR INSERT WITH CHECK (false);

-- Пользователи не могут изменять транзакции
CREATE POLICY "No direct updates" ON _pidr_transactions
    FOR UPDATE WITH CHECK (false);

-- Пользователи не могут удалять транзакции
CREATE POLICY "No direct deletes" ON _pidr_transactions
    FOR DELETE USING (false);

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С БАЛАНСОМ
-- =====================================================

-- Функция для безопасного обновления баланса
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(20),
    p_description TEXT,
    p_bonus_type VARCHAR(20) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Получаем текущий баланс
    SELECT coins INTO v_current_balance
    FROM _pidr_users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Рассчитываем новый баланс
    v_new_balance := v_current_balance + p_amount;
    
    -- Проверяем, что баланс не уходит в минус
    IF v_new_balance < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient balance'
        );
    END IF;
    
    -- Начинаем транзакцию
    BEGIN
        -- Обновляем баланс пользователя
        UPDATE _pidr_users
        SET coins = v_new_balance,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Создаем запись транзакции
        INSERT INTO _pidr_transactions (
            user_id,
            type,
            amount,
            description,
            bonus_type,
            status
        ) VALUES (
            p_user_id,
            p_type,
            p_amount,
            p_description,
            p_bonus_type,
            'completed'
        ) RETURNING id INTO v_transaction_id;
        
        -- Возвращаем успешный результат
        RETURN json_build_object(
            'success', true,
            'old_balance', v_current_balance,
            'new_balance', v_new_balance,
            'amount', p_amount,
            'transaction_id', v_transaction_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Откатываем изменения в случае ошибки
        ROLLBACK;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения баланса пользователя
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_data JSON;
BEGIN
    SELECT json_build_object(
        'id', id,
        'username', username,
        'coins', coins,
        'rating', rating,
        'games_played', games_played,
        'games_won', games_won
    ) INTO v_user_data
    FROM _pidr_users
    WHERE id = p_user_id;
    
    IF v_user_data IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'data', v_user_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- КОММЕНТАРИИ И ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- =====================================================

/*
ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:

1. Начисление ежедневного бонуса:
   SELECT update_user_balance(
       'user-uuid-here',
       100,
       'bonus',
       'Ежедневный бонус',
       'daily'
   );

2. Покупка в магазине:
   SELECT update_user_balance(
       'user-uuid-here',
       -50,
       'purchase',
       'Покупка скина карт'
   );

3. Выигрыш в игре:
   SELECT update_user_balance(
       'user-uuid-here',
       200,
       'game_win',
       'Выигрыш в игре P.I.D.R.'
   );

4. Получение баланса:
   SELECT get_user_balance('user-uuid-here');
*/