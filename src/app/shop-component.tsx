import React, { useState, useEffect } from 'react';
import { useLanguage } from '../components/LanguageSwitcher';
import { useTranslations } from '../lib/i18n/translations';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  type: string;
  duration?: string;
}

const Shop = () => {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [coins, setCoins] = useState<number>(100);
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'themes' | 'cards' | 'avatars' | 'boosters'>('themes');

  const shopItems: Record<'themes' | 'cards' | 'avatars' | 'boosters', ShopItem[]> = {
    themes: [
      { id: 'dark-theme', name: t.shop.darkTheme, description: t.shop.darkThemeDesc, price: 50, icon: '🌙', type: 'theme' },
      { id: 'neon-theme', name: t.shop.neonTheme, description: t.shop.neonThemeDesc, price: 75, icon: '🌈', type: 'theme' },
      { id: 'retro-theme', name: t.shop.retroTheme, description: t.shop.retroThemeDesc, price: 60, icon: '📼', type: 'theme' }
    ],
    cards: [
      { id: 'golden-card', name: t.shop.goldenCard, description: t.shop.goldenCardDesc, price: 100, icon: '🏆', type: 'card' },
      { id: 'rainbow-card', name: t.shop.rainbowCard, description: t.shop.rainbowCardDesc, price: 150, icon: '🌟', type: 'card' },
      { id: 'crystal-card', name: t.shop.crystalCard, description: t.shop.crystalCardDesc, price: 120, icon: '💎', type: 'card' }
    ],
    avatars: [
      { id: 'crown-avatar', name: t.shop.crownAvatar, description: t.shop.crownAvatarDesc, price: 80, icon: '👑', type: 'avatar' },
      { id: 'fire-avatar', name: t.shop.fireAvatar, description: t.shop.fireAvatarDesc, price: 90, icon: '🔥', type: 'avatar' },
      { id: 'star-avatar', name: t.shop.starAvatar, description: t.shop.starAvatarDesc, price: 70, icon: '⭐', type: 'avatar' }
    ],
    boosters: [
      { id: 'coin-booster', name: 'Удвоитель монет', description: 'Удваивает получаемые монеты на 1 час', price: 30, icon: '💰', type: 'booster', duration: '1 час' },
      { id: 'exp-booster', name: 'Ускоритель опыта', description: 'Удваивает получаемый опыт на 1 час', price: 25, icon: '⚡', type: 'booster', duration: '1 час' },
      { id: 'lucky-booster', name: 'Талисман удачи', description: 'Увеличивает шанс выигрыша на 30 минут', price: 40, icon: '🍀', type: 'booster', duration: '30 мин' }
    ]
  };

  const categories = [
    { id: 'themes', name: t.shop.themes, icon: '🎨' },
    { id: 'cards', name: t.shop.cards, icon: '🃏' },
    { id: 'avatars', name: t.shop.avatars, icon: '👤' },
    { id: 'boosters', name: t.shop.boosters, icon: '🚀' }
  ];

  useEffect(() => {
    // Загружаем баланс и покупки из БД
    loadUserDataFromDB();
  }, []);

  const loadUserDataFromDB = async () => {
    try {
      // Получаем данные пользователя из API (не из localStorage!)
      const authResponse = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        console.error('❌ Пользователь не авторизован');
        return;
      }
      
      const authResult = await authResponse.json();
      if (!authResult.success || !authResult.user) {
        console.error('❌ Нет данных пользователя');
        return;
      }
      
      const parsedUser = authResult.user;
      const userId = parsedUser.telegramId || parsedUser.id;

      // Получаем актуальный баланс из БД
      const balanceResponse = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_balance',
          userId: userId
        })
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.success) {
          setCoins(balanceData.balance || 0);
          console.log('✅ Баланс загружен из БД:', balanceData.balance);
        }
      }

      // Получаем покупки из БД через API
      const purchasesResponse = await fetch('/api/shop/inventory', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        if (purchasesData.success && purchasesData.data) {
          setPurchasedItems(purchasesData.data.purchased || []);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных из БД:', error);
      setCoins(0);
      setPurchasedItems([]);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (coins >= item.price && !purchasedItems.includes(item.id)) {
      try {
        console.log('🛒 Покупка товара:', item);
        
        // Используем новый API для покупки через БД
        const purchaseResponse = await fetch('/api/shop/purchase', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: item.id,
            item_type: item.type,
            item_name: item.name,
            price: item.price,
            metadata: {
              description: item.description,
              icon: item.icon,
              duration: item.duration
            }
          })
        });

        const purchaseData = await purchaseResponse.json();

        if (!purchaseResponse.ok || !purchaseData.success) {
          showNotification('❌ ' + (purchaseData.message || 'Ошибка покупки'), 'error');
          return;
        }

        // Обновляем локальное состояние
        const newCoins = purchaseData.new_balance || (coins - item.price);
        const newPurchases = [...purchasedItems, item.id];
        
        setCoins(newCoins);
        setPurchasedItems(newPurchases);
        
        // Баланс обновляется в БД через API - localStorage не используется!
        
        // Показать уведомление об успешной покупке
        showNotification(`✅ ${item.name} приобретен!`, 'success');
        
        console.log('✅ Покупка успешна:', {
          item: item.name,
          price: item.price,
          newBalance: newCoins
        });
      } catch (error) {
        console.error('❌ Ошибка покупки:', error);
        showNotification('❌ Ошибка при покупке', 'error');
      }
    } else if (coins < item.price) {
      showNotification(t.shop.notEnoughCoins, 'error');
    } else {
      showNotification('Предмет уже приобретен!', 'info');
    }
  };

  const showNotification = (message: string, type: string) => {
    // Простая реализация уведомлений
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 10px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e74c3c' : '#3498db'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1>Магазин</h1>
        <div className="coins-display">
          <span className="coins-icon">💰</span>
          <span className="coins-amount">{coins}</span>
        </div>
      </div>

      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id as 'themes' | 'cards' | 'avatars' | 'boosters')}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      <div className="shop-items">
        {shopItems[selectedCategory].map(item => (
          <div key={item.id} className="shop-item">
            <div className="item-icon">{item.icon}</div>
            <div className="item-info">
              <h3 className="item-name">{item.name}</h3>
              <p className="item-description">{item.description}</p>
              {item.duration && (
                <span className="item-duration">{t.shop.duration}: {item.duration}</span>
              )}
              <div className="item-footer">
                <span className="item-price">
                  <span className="price-icon">💰</span>
                  {item.price}
                </span>
                <button
                  className={`purchase-btn ${
                    purchasedItems.includes(item.id) ? 'purchased' : 
                    coins < item.price ? 'disabled' : ''
                  }`}
                  onClick={() => handlePurchase(item)}
                  disabled={purchasedItems.includes(item.id) || coins < item.price}
                >
                  {purchasedItems.includes(item.id) ? t.shop.purchased : 
                   coins < item.price ? t.shop.notEnoughCoins : t.shop.buy}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .shop-container {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
          color: var(--text-color, #333);
        }

        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: var(--card-bg, #fff);
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .shop-header h1 {
          margin: 0;
          font-size: 2rem;
          color: var(--primary-color, #6c5ce7);
        }

        .coins-display {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: var(--primary-color, #6c5ce7);
          color: white;
          border-radius: 25px;
          font-size: 1.2rem;
          font-weight: bold;
        }

        .coins-icon {
          font-size: 1.5rem;
        }

        .category-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          overflow-x: auto;
          padding-bottom: 10px;
        }

        .category-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--card-bg, #fff);
          border: 2px solid transparent;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .category-tab:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .category-tab.active {
          background: var(--primary-color, #6c5ce7);
          color: white;
          border-color: var(--primary-color, #6c5ce7);
        }

        .category-icon {
          font-size: 1.2rem;
        }

        .shop-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .shop-item {
          display: flex;
          gap: 15px;
          padding: 20px;
          background: var(--card-bg, #fff);
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .shop-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .item-icon {
          font-size: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          height: 80px;
          background: var(--bg-secondary, #f8f9fa);
          border-radius: 15px;
        }

        .item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .item-name {
          margin: 0 0 8px 0;
          font-size: 1.2rem;
          color: var(--text-color, #333);
        }

        .item-description {
          margin: 0 0 8px 0;
          color: var(--text-secondary, #666);
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .item-duration {
          font-size: 0.8rem;
          color: var(--primary-color, #6c5ce7);
          font-weight: bold;
          margin-bottom: 15px;
        }

        .item-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }

        .item-price {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--primary-color, #6c5ce7);
        }

        .price-icon {
          font-size: 1.2rem;
        }

        .purchase-btn {
          padding: 10px 20px;
          background: var(--primary-color, #6c5ce7);
          color: white;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .purchase-btn:hover:not(.disabled):not(.purchased) {
          background: var(--secondary-color, #a29bfe);
          transform: scale(1.05);
        }

        .purchase-btn.purchased {
          background: var(--success-color, #00b894);
          cursor: default;
        }

        .purchase-btn.disabled {
          background: var(--text-secondary, #666);
          cursor: not-allowed;
          opacity: 0.5;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .shop-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .category-tabs {
            justify-content: center;
          }

          .shop-items {
            grid-template-columns: 1fr;
          }

          .shop-item {
            flex-direction: column;
            text-align: center;
          }

          .item-footer {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default Shop;