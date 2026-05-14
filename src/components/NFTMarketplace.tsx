'use client'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Package, TrendingUp, Filter, Search, X, Check, Loader2, Heart } from 'lucide-react';
import Image from 'next/image';
import { BuyTab, SellTab, MyNFTsTab, SellModal } from './MarketplaceTabs';
import { getApiHeaders } from '@/lib/api-headers';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';

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
  price_rub?: number | null;
  fiat_payment_method?: string | null;
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
  const [sellCategory, setSellCategory] = useState<'coins' | 'crypto' | 'fiat'>('coins');
  const [sellCrypto, setSellCrypto] = useState<'TON' | 'SOL'>('TON');
  const [sellFiatMethod, setSellFiatMethod] = useState<'bank_card' | 'sbp' | 'yoo_money' | 'sberbank'>('sbp');
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

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
      } else if (data.code !== 'MARKETPLACE_DB_MIGRATION_REQUIRED' && retryCount < 2) {
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
    } else if (listing.price_ton || listing.price_sol) {
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
    } else if (listing.price_rub) {
      if (!confirm(`Купить за ${listing.price_rub} ₽ через ЮКассу?\n\nОткроется оплата (способ задан продавцом при выставлении лота).`)) {
        return;
      }
      try {
        const response = await fetch('/api/marketplace/create-rub-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders(),
          },
          body: JSON.stringify({ listing_id: listing.id }),
        });
        const data = await response.json();
        if (data.success && data.payment?.confirmationUrl) {
          window.location.href = data.payment.confirmationUrl;
          loadMarketplace();
        } else {
          alert(`❌ ${data.error || data.message || 'Не удалось создать платёж'}`);
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка при создании платежа');
      }
    } else {
      alert('Цена не указана!');
    }
  };

  const handleSellNFT = async () => {
    if (!selectedNFT || isSubmittingSell) return;

    const price = parseFloat(sellPrice);

    if (!price || price <= 0) {
      alert('Укажите корректную цену!');
      return;
    }

    setIsSubmittingSell(true);
    try {
      if (sellCategory === 'crypto') {
        const walletType = sellCrypto === 'TON' ? 'ton' : 'sol';

        const checkResponse = await fetch('/api/wallet/check', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders(),
          },
          body: JSON.stringify({ wallet_type: walletType }),
        });

        const checkData = await checkResponse.json();

        if (!checkData.success || !checkData.wallet) {
          alert(
            `❌ Для продажи за ${sellCrypto} подключите кошелёк!\n\nРаздел «Кошелёк» или коллекция NFT — подключите ${sellCrypto === 'TON' ? 'TON' : 'Solana'}.`
          );
          return;
        }

        if (
          !confirm(
            `💰 Оплата за NFT придёт на ваш ${sellCrypto} кошелёк:\n\n${checkData.wallet.wallet_address}\n\nПродолжить?`
          )
        ) {
          return;
        }
      }

      const requestBody: Record<string, unknown> = {
        nft_card_id: selectedNFT.id,
        price_coins: null,
        price_ton: null,
        price_sol: null,
        price_rub: null,
        fiat_payment_method: null,
        crypto_currency: null,
      };

      if (sellCategory === 'coins') {
        requestBody.price_coins = Math.floor(price);
      } else if (sellCategory === 'crypto') {
        if (sellCrypto === 'TON') {
          requestBody.price_ton = price;
          requestBody.crypto_currency = 'TON';
        } else {
          requestBody.price_sol = price;
          requestBody.crypto_currency = 'SOL';
        }
      } else {
        requestBody.price_rub = Math.round(price * 100) / 100;
        requestBody.fiat_payment_method = sellFiatMethod;
      }

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
        setSellCategory('coins');
        setSellCrypto('TON');
        setSellFiatMethod('sbp');
        
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
    } finally {
      setIsSubmittingSell(false);
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
    <div
      style={{
        minHeight: '600px',
        background: `linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgMain} 45%, ${T.bgElevated} 100%)`,
        borderRadius: T.radiusLg,
        border: `1px solid ${T.borderGold}`,
        padding: 'clamp(16px, 4vw, 28px)',
        boxShadow: T.shadowCard,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2
          style={{
            fontSize: 'clamp(1.35rem, 5vw, 2rem)',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: T.accentGold,
            marginBottom: '8px',
            textAlign: 'center',
            textTransform: 'uppercase',
            textShadow: `0 0 28px ${T.borderGold}`,
          }}
        >
          NFT Marketplace
        </h2>
        <p style={{ textAlign: 'center', color: T.textMuted, fontSize: '15px', maxWidth: 520, margin: '0 auto' }}>
          Торговая площадка игровых NFT карт
        </p>

        <div
          style={{
            maxWidth: 560,
            margin: '18px auto 0',
            padding: '14px 16px',
            borderRadius: T.radiusMd,
            background: T.warningBg,
            border: `1px solid ${T.warningBorder}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.warningTitle, fontSize: '12px', fontWeight: 800, marginBottom: 4 }}>
                Внимание
              </div>
              <div style={{ color: T.warningBody, fontSize: '12px', lineHeight: 1.55 }}>
                Проверьте кошельки и адреса перед сделкой. Потерянные средства или NFT восстановить нельзя.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '26px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'buy', label: 'Купить', icon: <ShoppingCart size={18} /> },
          { id: 'sell', label: 'Продать', icon: <DollarSign size={18} /> },
          { id: 'my-nfts', label: 'Мои NFT', icon: <Package size={18} /> },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.id as 'buy' | 'sell' | 'my-nfts')}
            style={{
              padding: '11px 20px',
              borderRadius: 999,
              border:
                activeTab === tab.id
                  ? `1px solid ${T.borderGoldStrong}`
                  : `1px solid ${T.borderSubtle}`,
              background:
                activeTab === tab.id
                  ? `linear-gradient(135deg, ${T.accentGold} 0%, ${T.accentGoldMid} 100%)`
                  : T.bgElevated,
              color: activeTab === tab.id ? T.bgDeep : T.text,
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeTab === tab.id ? `0 8px 24px ${T.borderGold}33` : 'none',
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
          <Loader2 size={44} className="animate-spin" style={{ color: T.accentGold, margin: '0 auto' }} />
          <p style={{ color: T.textMuted, marginTop: '20px' }}>Загрузка...</p>
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
          sellCategory={sellCategory}
          setSellCategory={setSellCategory}
          sellCrypto={sellCrypto}
          setSellCrypto={setSellCrypto}
          sellFiatMethod={sellFiatMethod}
          setSellFiatMethod={setSellFiatMethod}
          isSubmitting={isSubmittingSell}
          onClose={() => {
            if (isSubmittingSell) return;
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

