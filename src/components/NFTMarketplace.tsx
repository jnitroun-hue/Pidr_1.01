'use client'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, DollarSign, Package, TrendingUp, Filter, Search, X, Check, Heart } from 'lucide-react';
import Image from 'next/image';
import { BuyTab, SellTab, MyNFTsTab, SellModal } from './MarketplaceTabs';
import { BuyPaymentModal } from '@/components/BuyPaymentModal';
import { useNftSellModal } from '@/hooks/useNftSellModal';
import { getApiHeaders } from '@/lib/api-headers';
import { appAlert, appConfirm } from '@/lib/app-notice';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import PageLoadingScreen from '@/components/PageLoadingScreen';

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
  seller_wallet_address?: string | null;
  seller_wallet_network?: string | null;
  seller_fiat_phone?: string | null;
  seller_fiat_qr_url?: string | null;
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
  const [paymentModal, setPaymentModal] = useState<{
    listing: Listing;
    mode: 'crypto' | 'fiat_p2p';
  } | null>(null);

  const sellModal = useNftSellModal(() => {
    loadMarketplace();
    loadMySales();
    loadMyNFTs();
  });

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
        credentials: 'include',
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
          sellModal.openSellModal(nft);
          setActiveTab('my-nfts');
          // Убираем параметр из URL без перезагрузки
          const url = new URL(window.location.href);
          url.searchParams.delete('sell');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [myNFTs, sellModal.openSellModal]);

  const listingHasPrice = (listing: Listing) =>
    !!(
      (listing.price_coins && listing.price_coins > 0) ||
      (listing.price_ton && listing.price_ton > 0) ||
      (listing.price_sol && listing.price_sol > 0) ||
      (listing.price_rub != null && Number(listing.price_rub) > 0)
    );

  const isFiatP2P = (listing: Listing) =>
    (listing.fiat_payment_method === 'sbp' || listing.fiat_payment_method === 'sberbank') &&
    !!(listing.seller_fiat_phone || listing.seller_fiat_qr_url);

  const executeCryptoPurchase = async (listing: Listing) => {
    const currency = listing.price_ton ? 'TON' : 'SOL';
    const amount = listing.price_ton || listing.price_sol;

    try {
      const response = await fetch('/api/marketplace/buy', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        body: JSON.stringify({
          listing_id: listing.id,
          payment_method: 'crypto',
        }),
      });

      const data = await response.json();

      if (data.success && data.payment_url) {
        if (typeof window !== 'undefined') {
          if (currency === 'TON' && window.Telegram?.WebApp?.openLink) {
            window.Telegram.WebApp.openLink(data.payment_url);
          } else {
            const opened = window.open(data.payment_url, '_blank');
            if (!opened) {
              await navigator.clipboard.writeText(data.payment_url);
              await appAlert(`Ссылка скопирована. Оплатите ${amount} ${currency} в кошельке.`, {
                title: 'Оплата в кошельке',
                type: 'info',
              });
            }
          }
        }

        const paymentId = data.payment_memo || `NFT_${listing.id}_from_${data.buyer_id || ''}`;
        const sinceUnix = Math.floor(Date.now() / 1000) - 120;

        if (
          await appConfirm(
            `После оплаты ${amount} ${currency} нажмите «Подтвердить» — проверим перевод и передадим карту.`,
            { confirmText: 'Я оплатил' }
          )
        ) {
          setLoading(true);
          let confirmed = false;
          for (let i = 0; i < 12; i++) {
            const confirmRes = await fetch('/api/marketplace/confirm-crypto', {
              method: 'POST',
              headers: getApiHeaders(),
              credentials: 'include',
              body: JSON.stringify({
                listing_id: listing.id,
                paymentId,
                sinceUnix,
              }),
            });
            const confirmData = await confirmRes.json();
            if (confirmRes.ok && confirmData.success) {
              confirmed = true;
              await appAlert('NFT куплена! Карта в вашей коллекции.', { title: 'Готово', type: 'success' });
              window.dispatchEvent(new CustomEvent('nft-collection-updated'));
              window.dispatchEvent(new CustomEvent('marketplace-updated'));
              break;
            }
            if (confirmData.code !== 'PAYMENT_PENDING') {
              await appAlert(confirmData.error || 'Ошибка подтверждения', { title: 'Ошибка', type: 'error' });
              break;
            }
            await new Promise((r) => setTimeout(r, 5000));
          }
          if (!confirmed) {
            await appAlert('Платёж ещё не виден в сети. Повторите через минуту.', {
              title: 'Ожидание оплаты',
              type: 'warning',
            });
          }
          setLoading(false);
        }

        loadMarketplace();
      } else {
        await appAlert(data.error || 'Ошибка покупки', { title: 'Ошибка', type: 'error' });
      }
    } catch (error) {
      console.error('Ошибка покупки крипты:', error);
      await appAlert('Ошибка при покупке', { title: 'Ошибка', type: 'error' });
    }
  };

  const handleBuyNFT = async (listing: Listing) => {
    if (!listingHasPrice(listing)) {
      await appAlert('У продавца не указана цена — лот некорректен. Попросите выставить заново.', {
        title: 'Цена не указана',
        type: 'warning',
      });
      return;
    }

    if (listing.price_coins) {
      // ОПЛАТА МОНЕТАМИ
      if (userCoins < listing.price_coins) {
        await appAlert(`Недостаточно монет! Требуется: ${listing.price_coins}, есть: ${userCoins}`, {
          title: 'Недостаточно монет',
          type: 'warning',
        });
        return;
      }

      if (!(await appConfirm(`Купить эту карту за ${listing.price_coins} монет?`, { confirmText: 'Купить' }))) {
        return;
      }

      try {
        const response = await fetch('/api/marketplace/buy', {
          method: 'POST',
          credentials: 'include',
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
          await appAlert('NFT успешно куплена!', { title: 'Готово', type: 'success' });
          const newBalance = userCoins - listing.price_coins;
          onBalanceUpdate?.(newBalance);
          loadMarketplace();
        } else {
          await appAlert(data.error || 'Ошибка покупки', { title: 'Ошибка', type: 'error' });
        }
      } catch (error) {
        console.error('Ошибка покупки:', error);
        await appAlert('Ошибка при покупке', { title: 'Ошибка', type: 'error' });
      }
    } else if (listing.price_ton || listing.price_sol) {
      if (listing.seller_wallet_address?.trim()) {
        setPaymentModal({ listing, mode: 'crypto' });
        return;
      }
      const currency = listing.price_ton ? 'TON' : 'SOL';
      const amount = listing.price_ton || listing.price_sol;
      if (
        !(await appConfirm(
          `Купить за ${amount} ${currency}?\n\nОткроется кошелёк для оплаты.`,
          { confirmText: 'Перейти к оплате' }
        ))
      ) {
        return;
      }
      await executeCryptoPurchase(listing);
    } else if (listing.price_rub && Number(listing.price_rub) > 0) {
      if (isFiatP2P(listing)) {
        setPaymentModal({ listing, mode: 'fiat_p2p' });
        return;
      }
      if (
        !(await appConfirm(
          `Купить за ${listing.price_rub} ₽ через ЮКассу?\n\nОткроется оплата картой или ЮMoney.`,
          { confirmText: 'Оплатить' }
        ))
      ) {
        return;
      }
      try {
        const response = await fetch('/api/marketplace/create-rub-payment', {
          method: 'POST',
          credentials: 'include',
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
          await appAlert(data.error || 'Не удалось создать платёж', { title: 'Ошибка', type: 'error' });
        }
      } catch (e) {
        console.error(e);
        await appAlert('Ошибка при создании платежа', { title: 'Ошибка', type: 'error' });
      }
    }
  };

  const handlePaymentProceed = async () => {
    if (!paymentModal) return;
    const { listing, mode } = paymentModal;
    setPaymentModal(null);

    if (mode === 'crypto') {
      await executeCryptoPurchase(listing);
      return;
    }

    const sellerName = listing.seller?.username || listing.seller?.first_name || 'продавцу';
    await appAlert(
      `После перевода ${Number(listing.price_rub).toLocaleString('ru-RU')} ₽ напишите @${sellerName} для подтверждения и передачи NFT.`,
      { title: 'Ожидаем подтверждение', type: 'info' }
    );
  };

  const handleDeleteNFT = async (nft: NFTCard) => {
    if (!(await appConfirm(`Удалить карту навсегда?\n\n${nft.rank.toUpperCase()} ${getSuitSymbol(nft.suit)}\n\nЭто действие необратимо.`, { destructive: true, confirmText: 'Удалить', cancelText: 'Отмена', type: 'warning' }))) {
      return;
    }

    try {
      const response = await fetch('/api/nft/delete', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders()
        },
        body: JSON.stringify({
          nft_card_id: nft.id,
          nftId: nft.id,
        })
      });

      const data = await response.json();

      if (data.success) {
        loadMyNFTs();
        loadMySales();
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        await appAlert('Карта удалена из коллекции.', { title: 'Удалено', type: 'success' });
      } else {
        await appAlert(data.error || 'Не удалось удалить', { title: 'Ошибка', type: 'error' });
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      await appAlert('Ошибка при удалении карты', { title: 'Ошибка', type: 'error' });
    }
  };

  const handleCancelListing = async (listingId: number) => {
    if (!(await appConfirm('Снять карту с продажи?', { confirmText: 'Снять' }))) {
      return;
    }

    try {
      const response = await fetch('/api/marketplace/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders()
        },
        body: JSON.stringify({ listing_id: listingId })
      });

      const data = await response.json();

      if (data.success) {
        await appAlert('Лот снят с продажи', { title: 'Готово', type: 'success' });
        loadMySales();
      } else {
        await appAlert(data.error || 'Не удалось снять лот', { title: 'Ошибка', type: 'error' });
      }
    } catch (error) {
      console.error('Ошибка отмены:', error);
      await appAlert('Ошибка при отмене', { title: 'Ошибка', type: 'error' });
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
        <PageLoadingScreen
          fullScreen={false}
          compact
          showProgress={false}
          title="Маркетплейс"
          subtitle="Загрузка..."
        />
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
              onSellClick={(nft) => sellModal.openSellModal(nft)}
              onDeleteClick={handleDeleteNFT}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sell Modal */}
      {sellModal.showSellModal && sellModal.sellCard && (
        <SellModal
          nft={{
            id: Number(sellModal.sellCard.id),
            suit: sellModal.sellCard.suit,
            rank: sellModal.sellCard.rank,
            rarity: sellModal.sellCard.rarity,
            image_url: sellModal.sellCard.image_url,
          }}
          sellPrice={sellModal.sellPrice}
          setSellPrice={sellModal.setSellPrice}
          sellCategory={sellModal.sellCategory}
          setSellCategory={sellModal.setSellCategory}
          sellCrypto={sellModal.sellCrypto}
          setSellCrypto={sellModal.setSellCrypto}
          sellFiatMethod={sellModal.sellFiatMethod}
          setSellFiatMethod={sellModal.setSellFiatMethod}
          fiatReceiveMode={sellModal.fiatReceiveMode}
          setFiatReceiveMode={sellModal.setFiatReceiveMode}
          walletAddress={sellModal.walletAddress}
          setWalletAddress={sellModal.setWalletAddress}
          fiatPhone={sellModal.fiatPhone}
          setFiatPhone={sellModal.setFiatPhone}
          fiatQrDataUrl={sellModal.fiatQrDataUrl}
          setFiatQrDataUrl={sellModal.setFiatQrDataUrl}
          isSubmitting={sellModal.isSubmittingSell}
          onClose={sellModal.closeSellModal}
          onConfirm={() => void sellModal.submitSell()}
          getSuitColor={getSuitColor}
          getSuitSymbol={getSuitSymbol}
          getRankDisplay={getRankDisplay}
        />
      )}

      {paymentModal && (
        <BuyPaymentModal
          listing={paymentModal.listing}
          mode={paymentModal.mode}
          onClose={() => setPaymentModal(null)}
          onProceed={() => void handlePaymentProceed()}
          getRankDisplay={getRankDisplay}
          getSuitSymbol={getSuitSymbol}
        />
      )}
    </div>
  );
}

