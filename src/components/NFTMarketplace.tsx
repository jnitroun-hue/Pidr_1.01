'use client'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Package, TrendingUp, Filter, Search, X, Check, Loader2, Heart } from 'lucide-react';
import Image from 'next/image';
import { BuyTab, SellTab, MyNFTsTab, SellModal } from './MarketplaceTabs';

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
  price_crypto: number | null;
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
  const [sellPriceCoins, setSellPriceCoins] = useState('');
  const [sellPriceCrypto, setSellPriceCrypto] = useState('');
  const [sellCurrency, setSellCurrency] = useState<'TON' | 'SOL'>('TON');

  // Helper функции
  const getTelegramWebAppHeaders = (): Record<string, string> => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        return {
          'x-telegram-id': user.id.toString(),
          'x-username': user.username || user.first_name || 'User'
        };
      }
    }
    return {
      'x-telegram-id': '',
      'x-username': ''
    };
  };

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

  // Загрузка данных
  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/list?sort=${sortBy}&filter=all`, {
        headers: getTelegramWebAppHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки маркетплейса:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  const loadMyNFTs = useCallback(async () => {
    try {
      const response = await fetch('/api/nft/collection', {
        headers: getTelegramWebAppHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setMyNFTs(data.collection || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки коллекции:', error);
    }
  }, []);

  const loadMySales = useCallback(async () => {
    try {
      const response = await fetch('/api/marketplace/my-sales', {
        headers: getTelegramWebAppHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setMySales({ active: data.active || [], sold: data.sold || [] });
      }
    } catch (error) {
      console.error('Ошибка загрузки продаж:', error);
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

  // ✅ АВТОМАТИЧЕСКОЕ ОТКРЫТИЕ МОДАЛКИ ПРОДАЖИ ИЗ КОЛЛЕКЦИИ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nftToSell = sessionStorage.getItem('nft_to_sell');
      if (nftToSell) {
        try {
          const nft = JSON.parse(nftToSell);
          setSelectedNFT(nft);
          setShowSellModal(true);
          setActiveTab('my-nfts');
          sessionStorage.removeItem('nft_to_sell');
        } catch (error) {
          console.error('Ошибка парсинга NFT для продажи:', error);
        }
      }
    }
  }, []);

  // Обработчики
  const handleBuyNFT = async (listing: Listing) => {
    if (!listing.price_coins) {
      alert('Покупка за крипту пока недоступна');
      return;
    }

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
          ...getTelegramWebAppHeaders()
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
  };

  const handleSellNFT = async () => {
    if (!selectedNFT) return;

    const priceCoins = parseInt(sellPriceCoins) || null;
    const priceCrypto = parseFloat(sellPriceCrypto) || null;

    if (!priceCoins && !priceCrypto) {
      alert('Укажите хотя бы одну цену!');
      return;
    }

    try {
      const response = await fetch('/api/marketplace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTelegramWebAppHeaders()
        },
        body: JSON.stringify({
          nft_card_id: selectedNFT.id,
          price_coins: priceCoins,
          price_crypto: priceCrypto,
          crypto_currency: priceCrypto ? sellCurrency : null
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ NFT выставлена на продажу!');
        setShowSellModal(false);
        setSelectedNFT(null);
        setSellPriceCoins('');
        setSellPriceCrypto('');
        loadMySales();
        loadMyNFTs();
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
          ...getTelegramWebAppHeaders()
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
          ...getTelegramWebAppHeaders()
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
          sellPriceCoins={sellPriceCoins}
          setSellPriceCoins={setSellPriceCoins}
          sellPriceCrypto={sellPriceCrypto}
          setSellPriceCrypto={setSellPriceCrypto}
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

