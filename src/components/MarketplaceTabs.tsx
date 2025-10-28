'use client'
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ShoppingBag, X, TrendingUp, Calendar, Check } from 'lucide-react';

// Типы (дублируем из основного компонента)
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

interface HelperFunctions {
  getSuitColor: (suit: string) => string;
  getSuitSymbol: (suit: string) => string;
  getRankDisplay: (rank: string) => string;
}

// ====================================================================
// 🛒 BUY TAB - Покупка NFT
// ====================================================================
interface BuyTabProps extends HelperFunctions {
  listings: Listing[];
  onBuy: (listing: Listing) => void;
  userCoins: number;
}

export function BuyTab({ listings, onBuy, userCoins, getSuitColor, getSuitSymbol, getRankDisplay }: BuyTabProps) {
  if (listings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <ShoppingBag size={64} style={{ color: '#64748b', margin: '0 auto 20px' }} />
        <h3 style={{ color: '#cbd5e1', fontSize: '24px', marginBottom: '10px' }}>
          Нет активных лотов
        </h3>
        <p style={{ color: '#94a3b8' }}>
          Пока никто не выставил NFT на продажу
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px',
      padding: '10px'
    }}>
      {listings.map((listing, index) => (
        <motion.div
          key={listing.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            border: `2px solid ${getSuitColor(listing.nft_card.suit)}40`,
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          whileHover={{
            scale: 1.03,
            boxShadow: `0 10px 30px ${getSuitColor(listing.nft_card.suit)}60`
          }}
        >
          {/* Card Image */}
          <div style={{
            width: '100%',
            aspectRatio: '0.7',
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '12px',
            background: '#1e293b'
          }}>
            {listing.nft_card.image_url ? (
              <Image
                src={listing.nft_card.image_url}
                alt={`${listing.nft_card.rank} of ${listing.nft_card.suit}`}
                fill
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '64px',
                color: getSuitColor(listing.nft_card.suit)
              }}>
                {getSuitSymbol(listing.nft_card.suit)}
              </div>
            )}
          </div>

          {/* Card Info */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: getSuitColor(listing.nft_card.suit),
              marginBottom: '4px'
            }}>
              {getRankDisplay(listing.nft_card.rank)} {getSuitSymbol(listing.nft_card.suit)}
            </h4>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              {listing.nft_card.rarity === 'pokemon' ? '🔥 Pokémon' : '⭐ Simple'}
            </p>
          </div>

          {/* Seller */}
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            marginBottom: '12px',
            padding: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '8px'
          }}>
            <span style={{ opacity: 0.7 }}>Продавец:</span>{' '}
            <span style={{ color: '#cbd5e1' }}>
              @{listing.seller?.username || listing.seller?.first_name || 'Unknown'}
            </span>
          </div>

          {/* Price */}
          <div style={{
            padding: '12px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '10px',
            marginBottom: '12px'
          }}>
            {listing.price_coins && (
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#fbbf24',
                textAlign: 'center'
              }}>
                💰 {listing.price_coins.toLocaleString()} монет
              </div>
            )}
            {listing.price_crypto && (
              <div style={{
                fontSize: '16px',
                color: '#60a5fa',
                textAlign: 'center',
                marginTop: '4px'
              }}>
                ₿ {listing.price_crypto} {listing.crypto_currency}
              </div>
            )}
          </div>

          {/* Buy Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBuy(listing)}
            disabled={listing.price_coins ? userCoins < listing.price_coins : false}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: listing.price_coins && userCoins < listing.price_coins
                ? 'rgba(100, 116, 139, 0.5)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: listing.price_coins && userCoins < listing.price_coins ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <ShoppingBag size={18} />
            {listing.price_coins && userCoins < listing.price_coins ? 'Недостаточно монет' : 'Купить'}
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}

// ====================================================================
// 💼 SELL TAB - Мои продажи
// ====================================================================
interface SellTabProps extends HelperFunctions {
  mySales: { active: Listing[]; sold: Listing[] };
  onCancel: (listingId: number) => void;
}

export function SellTab({ mySales, onCancel, getSuitColor, getSuitSymbol, getRankDisplay }: SellTabProps) {
  return (
    <div>
      {/* Active Listings */}
      <h3 style={{ color: '#fbbf24', fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        🔥 Активные лоты ({mySales.active.length})
      </h3>
      {mySales.active.length === 0 ? (
        <p style={{ color: '#64748b', marginBottom: '40px', textAlign: 'center', padding: '20px' }}>
          У вас нет активных лотов
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {mySales.active.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onCancel={onCancel}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          ))}
        </div>
      )}

      {/* Sold History */}
      <h3 style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        ✅ История продаж ({mySales.sold.length})
      </h3>
      {mySales.sold.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
          Пока нет проданных карт
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {mySales.sold.map((listing) => (
            <SoldCard
              key={listing.id}
              listing={listing}
              getSuitColor={getSuitColor}
              getSuitSymbol={getSuitSymbol}
              getRankDisplay={getRankDisplay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 📦 MY NFTS TAB - Моя коллекция
// ====================================================================
interface MyNFTsTabProps extends HelperFunctions {
  nfts: NFTCard[];
  onSellClick: (nft: NFTCard) => void;
}

export function MyNFTsTab({ nfts, onSellClick, getSuitColor, getSuitSymbol, getRankDisplay }: MyNFTsTabProps) {
  if (nfts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          У вас пока нет NFT карт
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
      padding: '10px'
    }}>
      {nfts.map((nft, index) => (
        <motion.div
          key={nft.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            border: `2px solid ${getSuitColor(nft.suit)}40`,
            padding: '12px',
            textAlign: 'center'
          }}
        >
          {/* Image */}
          <div style={{
            width: '100%',
            aspectRatio: '0.7',
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '10px',
            background: '#1e293b'
          }}>
            {nft.image_url ? (
              <Image
                src={nft.image_url}
                alt={`${nft.rank} of ${nft.suit}`}
                fill
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: getSuitColor(nft.suit)
              }}>
                {getSuitSymbol(nft.suit)}
              </div>
            )}
          </div>

          {/* Info */}
          <h4 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: getSuitColor(nft.suit),
            marginBottom: '8px'
          }}>
            {getRankDisplay(nft.rank)} {getSuitSymbol(nft.suit)}
          </h4>

          {/* Sell Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSellClick(nft)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#0f172a',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            💰 Продать
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}

// ====================================================================
// Helper Components
// ====================================================================
function ListingCard({ listing, onCancel, getSuitColor, getSuitSymbol, getRankDisplay }: any) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.8)',
      borderRadius: '16px',
      border: `2px solid ${getSuitColor(listing.nft_card.suit)}40`,
      padding: '16px'
    }}>
      {/* Compact card display */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '80px',
          height: '112px',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#1e293b',
          flexShrink: 0
        }}>
          {listing.nft_card.image_url ? (
            <Image
              src={listing.nft_card.image_url}
              alt={`${listing.nft_card.rank} of ${listing.nft_card.suit}`}
              fill
              style={{ objectFit: 'contain' }}
            />
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: getSuitColor(listing.nft_card.suit), fontWeight: 'bold', marginBottom: '4px' }}>
            {getRankDisplay(listing.nft_card.rank)} {getSuitSymbol(listing.nft_card.suit)}
          </h4>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            {listing.nft_card.rarity === 'pokemon' ? '🔥 Pokémon' : '⭐ Simple'}
          </p>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
            💰 {listing.price_coins?.toLocaleString()} монет
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onCancel(listing.id)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <X size={16} />
        Отменить
      </motion.button>
    </div>
  );
}

function SoldCard({ listing, getSuitColor, getSuitSymbol, getRankDisplay }: any) {
  return (
    <div style={{
      background: 'rgba(16, 185, 129, 0.1)',
      borderRadius: '16px',
      border: '2px solid rgba(16, 185, 129, 0.3)',
      padding: '16px',
      opacity: 0.8
    }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '80px',
          height: '112px',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#1e293b',
          flexShrink: 0
        }}>
          {listing.nft_card.image_url ? (
            <Image
              src={listing.nft_card.image_url}
              alt={`${listing.nft_card.rank} of ${listing.nft_card.suit}`}
              fill
              style={{ objectFit: 'contain' }}
            />
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: getSuitColor(listing.nft_card.suit), fontWeight: 'bold', marginBottom: '4px' }}>
            {getRankDisplay(listing.nft_card.rank)} {getSuitSymbol(listing.nft_card.suit)}
          </h4>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
            Покупатель: @{listing.buyer?.username || listing.buyer?.first_name}
          </p>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
            ✅ Продано за {listing.price_coins?.toLocaleString()} монет
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// SELL MODAL - Модальное окно продажи
// ====================================================================
interface SellModalProps extends HelperFunctions {
  nft: NFTCard;
  sellPriceCoins: string;
  setSellPriceCoins: (value: string) => void;
  sellPriceCrypto: string;
  setSellPriceCrypto: (value: string) => void;
  sellCurrency: 'TON' | 'SOL';
  setSellCurrency: (value: 'TON' | 'SOL') => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function SellModal({
  nft,
  sellPriceCoins,
  setSellPriceCoins,
  sellPriceCrypto,
  setSellPriceCrypto,
  sellCurrency,
  setSellCurrency,
  onClose,
  onConfirm,
  getSuitColor,
  getSuitSymbol,
  getRankDisplay
}: SellModalProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
          borderRadius: '20px',
          border: `2px solid ${getSuitColor(nft.suit)}60`,
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>
            💰 Продать NFT
          </h3>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '5px'
          }}>
            <X size={24} />
          </button>
        </div>

        {/* NFT Preview */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px'
        }}>
          <div style={{
            width: '100px',
            height: '140px',
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#1e293b',
            flexShrink: 0
          }}>
            {nft.image_url ? (
              <Image
                src={nft.image_url}
                alt={`${nft.rank} of ${nft.suit}`}
                fill
                style={{ objectFit: 'contain' }}
              />
            ) : null}
          </div>
          <div>
            <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: getSuitColor(nft.suit), marginBottom: '8px' }}>
              {getRankDisplay(nft.rank)} {getSuitSymbol(nft.suit)}
            </h4>
            <p style={{ color: '#94a3b8' }}>
              {nft.rarity === 'pokemon' ? '🔥 Pokémon' : '⭐ Simple'}
            </p>
          </div>
        </div>

        {/* Price Inputs */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>
            💰 Цена в монетах (необязательно)
          </label>
          <input
            type="number"
            value={sellPriceCoins}
            onChange={(e) => setSellPriceCoins(e.target.value)}
            placeholder="0"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '2px solid rgba(251, 191, 36, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>
            ₿ Цена в крипте (необязательно)
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              step="0.001"
              value={sellPriceCrypto}
              onChange={(e) => setSellPriceCrypto(e.target.value)}
              placeholder="0.0"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid rgba(96, 165, 250, 0.3)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#e2e8f0',
                fontSize: '16px'
              }}
            />
            <select
              value={sellCurrency}
              onChange={(e) => setSellCurrency(e.target.value as 'TON' | 'SOL')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid rgba(96, 165, 250, 0.3)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#e2e8f0',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              <option value="TON">TON</option>
              <option value="SOL">SOL</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(100, 116, 139, 0.5)',
              color: '#e2e8f0',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Отмена
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Check size={20} />
            Выставить
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

