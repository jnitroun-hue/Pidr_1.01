'use client'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Package, TrendingUp, Filter, Search, X, Check, Loader2, Heart } from 'lucide-react';
import Image from 'next/image';
import { BuyTab, SellTab, MyNFTsTab, SellModal } from './MarketplaceTabs';
import { getApiHeaders } from '@/lib/api-headers';

// Типы
interface NFTCard {
  id: number;
  suit: string;
  rank: string;
  rarity: string;
  image_url: string;
  metadata?: any;
}

interface Listing {
  id: number;
  nft_card_id: number;
  seller_user_id: number;
  price_coins: number | null;
  price_ton: number | null;
  price_sol: number | null;
  crypto_currency: string | null;
  status: string;
  created_at: string;
  views_count: number;
  nft_card: NFTCard;
  seller?: {
    telegram_id: number;
    username: string;
    first_name: string;
  };
  buyer?: {
    telegram_id: number;
    username: string;
    first_name: string;
  };
  sold_at?: string;
}

interface NFTMarketplaceProps {
  userCoins: number;
  onBalanceUpdate?: (newBalance: number) => void;
}

export default function NFTMarketplace({ userCoins, onBalanceUpdate }: NFTMarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-nfts'>('buy');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myNFTs, setMyNFTs] = useState<NFTCard[]>([]);
  const [mySales, setMySales] = useState<{ active: Listing[]; sold: Listing[] }>({ active: [], sold: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterSuit, setFilterSuit] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  // Модальные окна
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTCard | null>(null);
  // ✅ НОВАЯ СИСТЕМА: ОДИН ИНПУТ + ВАЛЮТА
  const [sellPrice, setSellPrice] = useState('');
  const [sellCurrency, setSellCurrency] = useState<'COINS' | 'TON' | 'SOL'>('COINS');

  // Helper функции

  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = {
      hearts: '#ef4444',
      diamonds: '#3b82f6',
      clubs: '#22c55e',
      spades: '#8b5cf6'
    };
    return colors[suit] || '#6b7280';
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || suit;
  };

  const getRankDisplay = (rank: string) => {
    const ranks: Record<string, string> = {
      'a': 'A', 'j': 'J', 'q': 'Q', 'k': 'K',
      'A': 'A', 'J': 'J', 'Q': 'Q', 'K': 'K'
    };
    return ranks[rank] || rank;
  };

  // Загрузка данных с retry механизмом
  const loadMarketplace = useCallback(async (retryCount = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/list?sort=${sortBy}&filter=all`, {
        headers: {
          ...getApiHeaders(),
          'Cache-Control': 'no-cache' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        },
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        setListings(data.listings || []);
      } else if (retryCount < 2) {
        // ✅ RETRY: Повторяем запрос если не получили данные
        setTimeout(() => loadMarketplace(retryCount + 1), 1000 * (retryCount + 1));
      }
    } catch (error) {
      console.error('Ошибка загрузки маркетплейса:', error);
      // ✅ RETRY: Повторяем запрос при ошибке
      if (retryCount < 2) {
        setTimeout(() => loadMarketplace(retryCount + 1), 1000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  const loadMyNFTs = useCallback(async (retryCount = 0) => {
    try {
      const response = await fetch('/api/nft/collection', {
        headers: {
          ...getApiHeaders(),
          'Cache-Control': 'no-cache' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        },
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        setMyNFTs(data.collection || []);
      } else if (retryCount < 2) {
        // ✅ RETRY: Повторяем запрос если не получили данные
        setTimeout(() => loadMyNFTs(retryCount + 1), 1000 * (retryCount + 1));
      }
    } catch (error) {
      console.error('Ошибка загрузки коллекции:', error);
      // ✅ RETRY: Повторяем запрос при ошибке
      if (retryCount < 2) {
        setTimeout(() => loadMyNFTs(retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  }, []);

  const loadMySales = useCallback(async (retryCount = 0) => {
    try {
      const response = await fetch('/api/marketplace/my-sales', {
        headers: {
          ...getApiHeaders(),
          'Cache-Control': 'no-cache' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        },
        cache: 'no-store'
      });
      const data = await response.json();
      if (data.success) {
        setMySales({ active: data.active || [], sold: data.sold || [] });
      } else if (retryCount < 2) {
        // ✅ RETRY: Повторяем запрос если не получили данные
        setTimeout(() => loadMySales(retryCount + 1), 1000 * (retryCount + 1));
      }
    } catch (error) {
      console.error('Ошибка загрузки продаж:', error);
      // ✅ RETRY: Повторяем запрос при ошибке
      if (retryCount < 2) {
        setTimeout(() => loadMySales(retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'buy') {
      loadMarketplace();
    } else if (activeTab === 'sell') {
      loadMySales();
    } else if (activeTab === 'my-nfts') {
      loadMyNFTs();
    }
  }, [activeTab, loadMarketplace, loadMySales, loadMyNFTs]);

  // ✅ СЛУШАЕМ СОБЫТИЯ ОБНОВЛЕНИЯ МАГАЗИНА И КОЛЛЕКЦИИ
  useEffect(() => {
    const handleMarketplaceUpdate = () => {
      console.log('🔄 [NFTMarketplace] Обновляем магазин...');
      if (activeTab === 'buy') {
        loadMarketplace();
      }
      loadMySales();
      loadMyNFTs();
    };
    
    const handleCollectionUpdate = () => {
      console.log('🔄 [NFTMarketplace] Обновляем коллекцию...');
      loadMyNFTs();
    };
    
    window.addEventListener('marketplace-updated', handleMarketplaceUpdate);
    window.addEventListener('nft-collection-updated', handleCollectionUpdate);
    
    return () => {
      window.removeEventListener('marketplace-updated', handleMarketplaceUpdate);
      window.removeEventListener('nft-collection-updated', handleCollectionUpdate);
    };
  }, [activeTab, loadMarketplace, loadMySales, loadMyNFTs]);

  // ✅ АВТОМАТИЧЕСКОЕ ОТКРЫТИЕ МОДАЛКИ ПРОДАЖИ — через URL-параметр ?sell=<id>
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sellId = params.get('sell');
      if (sellId) {
        // Ищем карту по id в списке NFT пользователя
        const nft = myNFTs.find((n: any) => String(n.id) === sellId);
        if (nft) {
          setSelectedNFT(nft);
          setShowSellModal(true);
          setActiveTab('my-nfts');
          // Убираем параметр из URL без перезагрузки
          const url = new URL(window.location.href);
          url.searchParams.delete('sell');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [myNFTs]);

  // Обработчики
  const handleBuyNFT = async (listing: Listing) => {
    // ✅ ПРОВЕРЯЕМ СПОСОБ ОПЛАТЫ
    const isCrypto = (listing.price_ton || listing.price_sol);
    
    if (listing.price_coins) {
      // ОПЛАТА МОНЕТАМИ
      if (userCoins < listing.price_coins) {
        alert(`Недостаточно монет! Требуется: ${listing.price_coins}, есть: ${userCoins}`);
        return;
      }

      if (!confirm(`Купить эту карту за ${listing.price_coins} монет?`)) {
        return;
      }

      try {
        const response = await fetch('/api/marketplace/buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders()
          },
          body: JSON.stringify({
            listing_id: listing.id,
            payment_method: 'coins'
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('✅ NFT успешно куплена!');
          const newBalance = userCoins - listing.price_coins;
          onBalanceUpdate?.(newBalance);
          loadMarketplace();
        } else {
          alert(`❌ Ошибка: ${data.error}`);
        }
      } catch (error) {
        console.error('Ошибка покупки:', error);
        alert('Ошибка при покупке');
      }
    } else if (isCrypto) {
      // ✅ ОПЛАТА КРИПТОВАЛЮТОЙ (TON/SOL)
      const currency = listing.price_ton ? 'TON' : 'SOL';
      const amount = listing.price_ton || listing.price_sol;

      if (!confirm(`Купить эту карту за ${amount} ${currency}?\n\nВы будете перенаправлены в ${currency === 'TON' ? 'Tonkeeper' : 'Phantom'} кошелёк для оплаты.`)) {
        return;
      }

      try {
        const response = await fetch('/api/marketplace/buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders()
          },
          body: JSON.stringify({
            listing_id: listing.id,
            payment_method: 'crypto'
          })
        });

        const data = await response.json();

        if (data.success && data.payment_url) {
          // ✅ ОТКРЫВАЕМ КОШЕЛЁК С ТОЧНОЙ СУММОЙ!
          console.log(`💎 [Marketplace] Открываем кошелёк ${data.crypto_currency}: ${data.payment_url}`);
          
          // ✅ ИСПРАВЛЕНО: Telegram WebApp не поддерживает внешние домены в openTelegramLink
          // Используем window.open для всех крипто-кошельков
          if (typeof window !== 'undefined') {
            // Для TON - используем Telegram deep link если в Telegram WebApp
            if (currency === 'TON' && window.Telegram?.WebApp?.openLink) {
              // Используем openLink вместо openTelegramLink для внешних URL
              window.Telegram.WebApp.openLink(data.payment_url);
            } else {
              // Для других валют или если не в Telegram - обычный window.open
              const opened = window.open(data.payment_url, '_blank');
              if (!opened) {
                // Если popup заблокирован, копируем ссылку
                navigator.clipboard.writeText(data.payment_url);
                alert(`🔗 Скопировано в буфер!\n\nОткройте ${currency === 'TON' ? 'Tonkeeper' : 'Phantom'} и вставьте ссылку для оплаты ${amount} ${currency}\n\n${data.payment_url}`);
              } else {
                alert(`🔗 Откройте ${currency === 'TON' ? 'Tonkeeper' : 'Phantom'} для завершения оплаты ${amount} ${currency}`);
              }
            }
          }
          
          loadMarketplace(); // ✅ ОБНОВЛЯЕМ МАРКЕТПЛЕЙС
        } else {
          alert(`❌ Ошибка: ${data.error}`);
        }
      } catch (error) {
        console.error('Ошибка покупки крипты:', error);
        alert('Ошибка при покупке');
      }
    } else {
      alert('Цена не указана!');
    }
  };

  const handleSellNFT = async () => {
    if (!selectedNFT) return;

    const price = parseFloat(sellPrice);
    
    if (!price || price <= 0) {
      alert('Укажите корректную цену!');
      return;
    }

    // ✅ ПРОВЕРКА ПОДКЛЮЧЕНИЯ КОШЕЛЬКА ДЛЯ КРИПТО-ПРОДАЖИ
    if (sellCurrency === 'TON' || sellCurrency === 'SOL') {
      // ИСПРАВЛЕНО: Проверяем кошелек в _pidr_player_wallets
      try {
        const walletType = sellCurrency.toLowerCase(); // 'TON' -> 'ton', 'SOL' -> 'sol'
        
        const checkResponse = await fetch('/api/wallet/check', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders()
          },
          body: JSON.stringify({ wallet_type: walletType })
        });
        
        const checkData = await checkResponse.json();
        
        if (!checkData.success || !checkData.wallet) {
          alert(`❌ Для продажи за ${sellCurrency} подключите ${sellCurrency} кошелек!\n\nПерейдите в раздел "Кошелёк" и подключите ${sellCurrency === 'TON' ? 'TON' : 'Solana'} кошелек.`);
          return;
        }
        
        // Предупреждаем что оплата пойдет на этот кошелек
        if (!confirm(`💰 Оплата за NFT придёт на ваш ${sellCurrency} кошелек:\n\n${checkData.wallet.wallet_address}\n\nПродолжить?`)) {
          return;
        }
      } catch (error) {
        console.error('Ошибка проверки кошелька:', error);
        alert('Ошибка проверки кошелька');
        return;
      }
    }

    // ✅ НОВАЯ ЛОГИКА: В зависимости от валюты заполняем нужное поле
    const requestBody: any = {
      nft_card_id: selectedNFT.id,
      price_coins: null,
      price_ton: null,
      price_sol: null,
      crypto_currency: null
    };

    if (sellCurrency === 'COINS') {
      requestBody.price_coins = Math.floor(price); // Монеты только целые
    } else if (sellCurrency === 'TON') {
      requestBody.price_ton = price;
      requestBody.crypto_currency = 'TON';
    } else if (sellCurrency === 'SOL') {
      requestBody.price_sol = price;
      requestBody.crypto_currency = 'SOL';
    }

    try {
      const response = await fetch('/api/marketplace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ NFT выставлена на продажу!');
        setShowSellModal(false);
        setSelectedNFT(null);
        setSellPrice('');
        setSellCurrency('COINS');
        
        // ✅ ОБНОВЛЯЕМ ВСЕ КОМПОНЕНТЫ МАГАЗИНА
        loadMarketplace(); // ✅ Обновляем список лотов в магазине
        loadMySales();
        loadMyNFTs();
        
        // ✅ ОТПРАВЛЯЕМ СОБЫТИЯ ДЛЯ ОБНОВЛЕНИЯ ДРУГИХ КОМПОНЕНТОВ
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('marketplace-updated'));
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка продажи:', error);
      alert('Ошибка при выставлении на продажу');
    }
  };

  const handleDeleteNFT = async (nft: NFTCard) => {
    if (!confirm(`⚠️ Вы уверены, что хотите УДАЛИТЬ эту карту?\n\n${nft.rank.toUpperCase()} ${getSuitSymbol(nft.suit)}\n\nЭто действие НЕОБРАТИМО!`)) {
      return;
    }

    try {
      const response = await fetch('/api/nft/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders()
        },
        body: JSON.stringify({
          nftId: nft.id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Карта успешно удалена!');
        loadMyNFTs();
        loadMySales();
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении карты');
    }
  };

  const handleCancelListing = async (listingId: number) => {
    if (!confirm('Снять карту с продажи?')) {
      return;
    }

    try {
      const response = await fetch('/api/marketplace/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders()
        },
        body: JSON.stringify({ listing_id: listingId })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Лот снят с продажи');
        loadMySales();
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка отмены:', error);
      alert('Ошибка при отмене');
    }
  };

  // Фильтрация
  const filteredListings = listings.filter(listing => {
    if (filterRarity !== 'all' && listing.nft_card.rarity !== filterRarity) return false;
    if (filterSuit !== 'all' && listing.nft_card.suit !== filterSuit) return false;
    return true;
  });

  return (
    <div style={{
      minHeight: '600px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
      borderRadius: '20px',
      border: '2px solid rgba(251, 191, 36, 0.3)',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          🎨 NFT MARKETPLACE
        </h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '16px' }}>
          Торговая площадка игровых NFT карт
        </p>
        
        {/* ✅ ПРЕДУПРЕЖДЕНИЕ О БЕЗОПАСНОСТИ КОШЕЛЬКОВ */}
        <div style={{
          maxWidth: '600px',
          margin: '20px auto 0',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px', color: '#ef4444' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: '700',
                marginBottom: '4px'
              }}>
                ВНИМАНИЕ!
              </div>
              <div style={{
                color: '#fca5a5',
                fontSize: '12px',
                lineHeight: '1.5'
              }}>
                Убедитесь, что ваши кошельки могут принимать NFT и адреса корректно прописаны! Потерянные средства или NFT мы вернуть не сможем!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'buy', label: 'Купить', icon: <ShoppingCart size={20} /> },
          { id: 'sell', label: 'Продать', icon: <DollarSign size={20} /> },
          { id: 'my-nfts', label: 'Мои NFT', icon: <Package size={20} /> }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                : 'rgba(51, 65, 85, 0.6)',
              color: activeTab === tab.id ? '#0f172a' : '#e2e8f0',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: '#fbbf24', margin: '0 auto' }} />
          <p style={{ color: '#94a3b8', marginTop: '20px' }}>Загрузка...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'buy' && (
            <BuyTab 
              listings={filteredListings} 
              onBuy={handleBuyNFT}
              userCoins={userCoins}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          )}
          {activeTab === 'sell' && (
            <SellTab
              mySales={mySales}
              onCancel={handleCancelListing}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          )}
          {activeTab === 'my-nfts' && (
            <MyNFTsTab
              nfts={myNFTs}
              onSellClick={(nft) => {
                setSelectedNFT(nft);
                setShowSellModal(true);
              }}
              onDeleteClick={handleDeleteNFT}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sell Modal */}
      {showSellModal && selectedNFT && (
        <SellModal
          nft={selectedNFT}
          sellPrice={sellPrice}
          setSellPrice={setSellPrice}
          sellCurrency={sellCurrency}
          setSellCurrency={setSellCurrency}
          onClose={() => {
            setShowSellModal(false);
            setSelectedNFT(null);
          }}
          onConfirm={handleSellNFT}
          getSuitColor={getSuitColor}
          getSuitSymbol={getSuitSymbol}
          getRankDisplay={getRankDisplay}
        />
      )}
    </div>
  );
}

