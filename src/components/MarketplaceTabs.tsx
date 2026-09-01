'use client'
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import { fiatMethodLabel } from '@/lib/marketplace/payment-meta';
import { listingHasValidPrice } from '@/lib/marketplace/listing-price';
import { GRAM } from '@/lib/crypto/gram-brand';
import { CRYPTO_TOKENS } from '@/lib/crypto/crypto-assets';
import CryptoIcon from '@/components/CryptoIcon';
import PidrCoinIcon, { PidrCoinAmount } from '@/components/PidrCoinIcon';
import NftCardFace from '@/components/NftCardFace';
import { useLanguage } from '@/components/LanguageSwitcher';
import {
  formatNftCardName,
  getNftRarityLabel,
} from '@/lib/nft/card-display';
import styles from './MarketplaceTabs.module.css';

export { SellNftModal as SellModal } from '@/components/SellNftModal';

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

interface HelperFunctions {
  getSuitColor: (suit: string) => string;
  getSuitSymbol: (suit: string) => string;
  getRankDisplay: (rank: string) => string;
}

function listingHasPrice(listing: Listing): boolean {
  return listingHasValidPrice(listing);
}

// ====================================================================
// 🛒 BUY TAB - Покупка NFT
// ====================================================================
interface BuyTabProps extends HelperFunctions {
  listings: Listing[];
  onBuy: (listing: Listing) => void;
  userCoins: number;
}

export function BuyTab({ listings, onBuy, userCoins, getSuitColor }: BuyTabProps) {
  const { language } = useLanguage();
  const buyableListings = listings.filter(listingHasPrice);

  if (buyableListings.length === 0) {
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
    <div className={styles.buyGrid}>
      {buyableListings.map((listing, index) => (
        <motion.div
          key={listing.id}
          className={styles.listingCard}
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
          <div className={styles.listingFace}>
            <NftCardFace
              suit={listing.nft_card.suit}
              rank={listing.nft_card.rank}
              rarity={listing.nft_card.rarity}
              metadata={listing.nft_card.metadata}
              imageUrl={listing.nft_card.image_url}
              alt={formatNftCardName(listing.nft_card.rank, listing.nft_card.suit, language)}
            />
          </div>

          {/* Card Info */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: getSuitColor(listing.nft_card.suit),
              marginBottom: '4px'
            }}>
              {formatNftCardName(listing.nft_card.rank, listing.nft_card.suit, language)}
            </h4>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              {getNftRarityLabel(listing.nft_card.rarity)}
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
            {!listingHasPrice(listing) && (
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#fca5a5',
                textAlign: 'center',
                padding: '8px',
              }}>
                Цена не указана — лот некорректен
              </div>
            )}
            {listing.price_coins && (
              <div style={{
                fontSize: '22px',
                fontWeight: 'black',
                color: '#fbbf24',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <PidrCoinAmount value={listing.price_coins} size={22} />
              </div>
            )}
            {listing.price_ton && (
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#60a5fa',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <CryptoIcon src={CRYPTO_TOKENS.GRAM.icon} size={22} alt={GRAM.symbol} />
                {listing.price_ton} {GRAM.symbol}
              </div>
            )}
            {listing.price_sol && (
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#f59e0b',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <CryptoIcon src={CRYPTO_TOKENS.SOL.icon} size={22} alt="SOL" />
                {listing.price_sol} SOL
              </div>
            )}
            {listing.price_rub != null && Number(listing.price_rub) > 0 && (
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#86efac',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '22px' }}>₽</span>
                  {Number(listing.price_rub).toLocaleString('ru-RU')} RUB
                </div>
                {listing.fiat_payment_method && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                  }}>
                    {fiatMethodLabel(listing.fiat_payment_method)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Buy Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBuy(listing)}
            disabled={
              !listingHasPrice(listing) ||
              (listing.price_coins ? userCoins < listing.price_coins : false)
            }
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background:
                !listingHasPrice(listing) ||
                (listing.price_coins && userCoins < listing.price_coins)
                  ? 'rgba(100, 116, 139, 0.5)'
                  : `linear-gradient(135deg, ${T.success} 0%, #16a34a 100%)`,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor:
                !listingHasPrice(listing) ||
                (listing.price_coins && userCoins < listing.price_coins)
                  ? 'not-allowed'
                  : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <ShoppingBag size={18} />
            {!listingHasPrice(listing)
              ? 'Недоступно'
              : listing.price_coins && userCoins < listing.price_coins
                ? 'Недостаточно монет'
                : 'Купить'}
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
  onDeleteClick: (nft: NFTCard) => void;
}

export function MyNFTsTab({ nfts, onSellClick, onDeleteClick, getSuitColor, getSuitSymbol, getRankDisplay }: MyNFTsTabProps) {
  const [selectedNFT, setSelectedNFT] = useState<NFTCard | null>(null);
  const { language } = useLanguage();

  if (nfts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          У вас пока нет NFT карт
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/nft-collection';
            }
          }}
          style={{
            marginTop: '16px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#0f172a',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          🎨 Сгенерировать NFT
        </motion.button>
      </div>
    );
  }

  return (
    <>
      {/* МОДАЛКА ПРИ КЛИКЕ НА КАРТУ */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNFT(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(10px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                border: `3px solid ${getSuitColor(selectedNFT.suit)}`,
                borderRadius: '20px',
                padding: '20px',
                maxWidth: '340px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedNFT(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff'
                }}
              >
                <X size={24} />
              </button>

              {/* Изображение карты */}
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '10px',
                marginBottom: '15px',
                aspectRatio: '2/3',
                maxWidth: '200px',
                margin: '0 auto 15px'
              }}>
                <NftCardFace
                  suit={selectedNFT.suit}
                  rank={selectedNFT.rank}
                  imageUrl={selectedNFT.image_url}
                  rarity={selectedNFT.rarity}
                  metadata={selectedNFT.metadata}
                  alt={formatNftCardName(selectedNFT.rank, selectedNFT.suit, language)}
                />
              </div>

              {/* Информация о карте */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{
                  color: '#ffffff',
                  fontSize: '2rem',
                  fontWeight: 'black',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px'
                }}>
                  <span style={{ 
                    color: getSuitColor(selectedNFT.suit),
                    fontSize: '2.5rem',
                    textShadow: `0 0 20px ${getSuitColor(selectedNFT.suit)}aa`
                  }}>
                    {getSuitSymbol(selectedNFT.suit)}
                  </span>
                  <span>{formatNftCardName(selectedNFT.rank, selectedNFT.suit, language)}</span>
                </h2>
                <p style={{
                  color: getSuitColor(selectedNFT.suit),
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  {selectedNFT.rarity === 'pokemon' && '⚡ Покемон'}
                  {selectedNFT.rarity === 'halloween' && '🎃 Хеллоуин'}
                  {selectedNFT.rarity === 'starwars' && '⚔️ Star Wars'}
                  {selectedNFT.rarity === 'unique' && '✨ Уникальная'}
                  {!['pokemon', 'halloween', 'starwars'].includes(selectedNFT.rarity) && selectedNFT.rarity}
                </p>
              </div>

              {/* Кнопки действий */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setSelectedNFT(null);
                      onSellClick(selectedNFT);
                    }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <PidrCoinIcon size={16} alt="" />
                      Продать
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedNFT(null);
                    onDeleteClick(selectedNFT);
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* СЕТКА КАРТ */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '12px',
      padding: '12px'
    }}>
      {nfts.map((nft, index) => (
        <motion.div
          key={nft.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => setSelectedNFT(nft)}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '8px',
            border: `2px solid ${getSuitColor(nft.suit)}40`,
            padding: '8px',
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          {/* Image */}
          <div style={{
            width: '100%',
            aspectRatio: '0.7',
            position: 'relative',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '8px',
            background: '#ffffff',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none'
          }}>
            <NftCardFace
              suit={nft.suit}
              rank={nft.rank}
              imageUrl={nft.image_url}
              rarity={nft.rarity}
              metadata={nft.metadata}
              alt={formatNftCardName(nft.rank, nft.suit, language)}
            />
          </div>

          {/* Rank and Suit Info */}
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: getSuitColor(nft.suit),
            marginBottom: '6px'
          }}>
            {formatNftCardName(nft.rank, nft.suit, language)}
          </div>

          {/* Sell Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onSellClick(nft);
            }}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              color: '#0f172a',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer',
              marginBottom: '4px'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PidrCoinIcon size={14} alt="" />
              Продать
            </span>
          </motion.button>
          
          {/* Delete Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(nft);
            }}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            🗑️ Удалить
          </motion.button>
        </motion.div>
      ))}
    </div>
    </>
  );
}

// ====================================================================
// Helper Components
// ====================================================================
function ListingCard({ listing, onCancel, getSuitColor }: any) {
  const { language } = useLanguage();
  const cardName = formatNftCardName(listing.nft_card.rank, listing.nft_card.suit, language);

  return (
    <div
      className={styles.sellListingCard}
      style={{ borderColor: `${getSuitColor(listing.nft_card.suit)}66` }}
    >
      <div className={styles.sellListingBody}>
        <div className={styles.sellListingFace}>
          <NftCardFace
            suit={listing.nft_card.suit}
            rank={listing.nft_card.rank}
            rarity={listing.nft_card.rarity}
            metadata={listing.nft_card.metadata}
            imageUrl={listing.nft_card.image_url}
            alt={cardName}
          />
        </div>
        <div className={styles.sellListingInfo}>
          <h4 style={{ color: getSuitColor(listing.nft_card.suit) }}>
            {cardName}
          </h4>
          <p className={styles.rarityLabel}>
            {getNftRarityLabel(listing.nft_card.rarity)}
          </p>
          <div className={styles.sellListingPrice}>
            {listing.price_coins != null && listing.price_coins > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PidrCoinAmount value={listing.price_coins ?? 0} size={16} showLabel />
              </div>
            )}
            {listing.price_ton != null && listing.price_ton > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CryptoIcon src={CRYPTO_TOKENS.GRAM.icon} size={18} alt={GRAM.symbol} />
                {listing.price_ton} {GRAM.symbol}
              </div>
            )}
            {listing.price_sol != null && listing.price_sol > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CryptoIcon src={CRYPTO_TOKENS.SOL.icon} size={18} alt="SOL" />
                {listing.price_sol} SOL
              </div>
            )}
            {listing.price_rub != null && Number(listing.price_rub) > 0 && (
              <div>₽ {Number(listing.price_rub).toLocaleString('ru-RU')}</div>
            )}
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

function SoldCard({ listing, getSuitColor }: any) {
  const { language } = useLanguage();
  const cardName = formatNftCardName(listing.nft_card.rank, listing.nft_card.suit, language);

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
          background: '#ffffff', // ✅ ИСПРАВЛЕНО: белый фон для карт в маркетплейсе
          flexShrink: 0
        }}>
          <NftCardFace
            suit={listing.nft_card.suit}
            rank={listing.nft_card.rank}
            rarity={listing.nft_card.rarity}
            metadata={listing.nft_card.metadata}
            imageUrl={listing.nft_card.image_url}
            alt={cardName}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: getSuitColor(listing.nft_card.suit), fontWeight: 'bold', marginBottom: '4px' }}>
            {cardName}
          </h4>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
            Покупатель: @{listing.buyer?.username || listing.buyer?.first_name}
          </p>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {listing.price_coins ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                ✅ Продано за <PidrCoinAmount value={listing.price_coins} size={16} showLabel />
              </span>
            ) : null}
            {listing.price_ton && `✅ Продано за ${listing.price_ton} ${GRAM.symbol}`}
            {listing.price_sol && `✅ Продано за ${listing.price_sol} SOL`}
            {listing.price_rub != null && Number(listing.price_rub) > 0 && `✅ Продано за ${Number(listing.price_rub).toLocaleString('ru-RU')} ₽`}
          </div>
        </div>
      </div>
    </div>
  );
}
