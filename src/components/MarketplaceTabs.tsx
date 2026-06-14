'use client'
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ShoppingBag, X, TrendingUp, Calendar, Check } from 'lucide-react';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';

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
            background: '#ffffff' // ✅ ИСПРАВЛЕНО: белый фон для карт в маркетплейсе
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

          {/* Price + Seller Info */}
          <div style={{
            padding: '12px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: '10px',
            marginBottom: '12px'
          }}>
            {/* Продавец */}
            <div style={{
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Продавец: <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>
                @{listing.seller?.username || listing.seller?.first_name || 'Unknown'}
              </span>
            </div>
            
            {/* Цена */}
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
                <span style={{ fontSize: '24px' }}>💰</span>
                {listing.price_coins.toLocaleString()}
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
                <span style={{ fontSize: '22px' }}>💎</span>
                {listing.price_ton} TON
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
                <span style={{ fontSize: '22px' }}>☀️</span>
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '22px' }}>₽</span>
                {Number(listing.price_rub).toLocaleString('ru-RU')} RUB
              </div>
            )}
          </div>

          {/* Buy Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBuy(listing)}
            disabled={
              listing.price_coins ? userCoins < listing.price_coins : false
            }
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background:
                listing.price_coins && userCoins < listing.price_coins
                  ? 'rgba(100, 116, 139, 0.5)'
                  : `linear-gradient(135deg, ${T.success} 0%, #16a34a 100%)`,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor:
                listing.price_coins && userCoins < listing.price_coins
                  ? 'not-allowed'
                  : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
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
  onDeleteClick: (nft: NFTCard) => void;
}

export function MyNFTsTab({ nfts, onSellClick, onDeleteClick, getSuitColor, getSuitSymbol, getRankDisplay }: MyNFTsTabProps) {
  const [selectedNFT, setSelectedNFT] = useState<NFTCard | null>(null);

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
                <img
                  src={selectedNFT.image_url}
                  alt={`${selectedNFT.rank} ${getSuitSymbol(selectedNFT.suit)}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
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
                  <span>{getRankDisplay(selectedNFT.rank)}</span>
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
                    💰 Продать
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
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={`${nft.rank} of ${nft.suit}`}
                loading="lazy"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  // Fallback на масть и ранг
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div style="
                        width: 100%; 
                        height: 100%; 
                        display: flex; 
                        flex-direction: column;
                        align-items: center; 
                        justify-content: center;
                        color: ${getSuitColor(nft.suit)};
                        font-size: 32px;
                        font-weight: bold;
                      ">
                        <div>${getSuitSymbol(nft.suit)}</div>
                        <div style="font-size: 20px;">${getRankDisplay(nft.rank)}</div>
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: getSuitColor(nft.suit),
                fontSize: '32px',
                fontWeight: 'bold'
              }}>
                <div>{getSuitSymbol(nft.suit)}</div>
                <div style={{ fontSize: '20px' }}>{getRankDisplay(nft.rank)}</div>
              </div>
            )}
          </div>

          {/* Rank and Suit Info */}
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: getSuitColor(nft.suit),
            marginBottom: '6px'
          }}>
            {getRankDisplay(nft.rank)} {getSuitSymbol(nft.suit)}
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
            💰 Продать
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
          background: '#ffffff', // ✅ ИСПРАВЛЕНО: белый фон для карт в маркетплейсе
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
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fbbf24', lineHeight: 1.4 }}>
            {listing.price_coins != null && listing.price_coins > 0 && (
              <div>💰 {listing.price_coins?.toLocaleString()} монет</div>
            )}
            {listing.price_ton != null && listing.price_ton > 0 && <div>💎 {listing.price_ton} TON</div>}
            {listing.price_sol != null && listing.price_sol > 0 && <div>☀️ {listing.price_sol} SOL</div>}
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
          background: '#ffffff', // ✅ ИСПРАВЛЕНО: белый фон для карт в маркетплейсе
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
            {listing.price_coins && `✅ Продано за ${listing.price_coins.toLocaleString()} 💰 монет`}
            {listing.price_ton && `✅ Продано за ${listing.price_ton} 💎 TON`}
            {listing.price_sol && `✅ Продано за ${listing.price_sol} ☀️ SOL`}
            {listing.price_rub != null && Number(listing.price_rub) > 0 && `✅ Продано за ${Number(listing.price_rub).toLocaleString('ru-RU')} ₽`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// SELL MODAL - Продажа: монеты / крипта / рубли + подвыбор способа
// ====================================================================
interface SellModalProps extends HelperFunctions {
  nft: NFTCard;
  sellPrice: string;
  setSellPrice: (value: string) => void;
  sellCategory: 'coins' | 'crypto' | 'fiat';
  setSellCategory: (v: 'coins' | 'crypto' | 'fiat') => void;
  sellCrypto: 'TON' | 'SOL';
  setSellCrypto: (v: 'TON' | 'SOL') => void;
  sellFiatMethod: 'bank_card' | 'sbp' | 'yoo_money' | 'sberbank';
  setSellFiatMethod: (v: 'bank_card' | 'sbp' | 'yoo_money' | 'sberbank') => void;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '10px 8px',
        borderRadius: 999,
        border: active ? `1px solid ${T.borderGoldStrong}` : `1px solid ${T.borderSubtle}`,
        background: active ? `linear-gradient(135deg, ${T.accentGold}22, ${T.accentGold}08)` : T.bgElevated,
        color: active ? T.accentGold : T.textMuted,
        fontWeight: 700,
        fontSize: '12px',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  );
}

export function SellModal({
  nft,
  sellPrice,
  setSellPrice,
  sellCategory,
  setSellCategory,
  sellCrypto,
  setSellCrypto,
  sellFiatMethod,
  setSellFiatMethod,
  isSubmitting,
  onClose,
  onConfirm,
  getSuitColor,
  getSuitSymbol,
  getRankDisplay,
}: SellModalProps) {
  const step = sellCategory === 'crypto' || sellCategory === 'fiat' ? 2 : 1;
  const priceStep =
    sellCategory === 'coins' ? '1' : sellCategory === 'fiat' ? '0.01' : '0.001';
  const placeholder =
    sellCategory === 'coins' ? '1000' : sellCategory === 'fiat' ? '500' : sellCrypto === 'TON' ? '0.5' : '0.1';

  const hint =
    sellCategory === 'coins'
      ? 'Внутриигровые монеты списываются у покупателя с баланса.'
      : sellCategory === 'crypto'
        ? `${sellCrypto}: покупатель отправит крипту на ваш подключённый кошелёк.`
        : '₽: покупатель оплатит через ЮКассу; перевод NFT после успешной оплаты. Нужны колонки в БД (см. 0007_marketplace_rub.sql).';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Продать NFT"
      onClick={() => onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 2147482600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: `linear-gradient(165deg, ${T.bgCard} 0%, ${T.bgDeep} 100%)`,
          borderRadius: T.radiusLg,
          border: `1px solid ${T.borderGold}`,
          padding: '22px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: T.shadowCard,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: T.accentGold, letterSpacing: '0.04em' }}>
            Продать NFT
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.bgElevated,
              border: `1px solid ${T.borderSubtle}`,
              borderRadius: 999,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '18px',
            padding: '12px',
            background: T.bgElevated,
            borderRadius: T.radiusMd,
            border: `1px solid ${T.borderSubtle}`,
          }}
        >
          <div
            style={{
              width: 72,
              height: 100,
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
              border: `2px solid ${getSuitColor(nft.suit)}`,
            }}
          >
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                loading="lazy"
              />
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: getSuitColor(nft.suit) }}>
              {getRankDisplay(nft.rank)} {getSuitSymbol(nft.suit)}
            </div>
            <div style={{ color: T.textMuted, fontSize: '13px', marginTop: 4 }}>
              {nft.rarity === 'pokemon'
                ? 'Pokémon'
                : nft.rarity === 'halloween'
                  ? 'Halloween'
                  : nft.rarity === 'starwars'
                    ? 'Star Wars'
                    : nft.rarity === 'legendary'
                      ? 'Legendary'
                      : nft.rarity}
            </div>
            <div style={{ color: T.textMuted, fontSize: '11px', marginTop: 8 }}>
              Шаг {step}/2 · тип оплаты
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
            Чем платят покупатели
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip active={sellCategory === 'coins'} onClick={() => setSellCategory('coins')}>
              Монеты
            </Chip>
            <Chip active={sellCategory === 'crypto'} onClick={() => setSellCategory('crypto')}>
              Крипта
            </Chip>
            <Chip active={sellCategory === 'fiat'} onClick={() => setSellCategory('fiat')}>
              Рубли
            </Chip>
          </div>
        </div>

        <AnimatePresence>
          {sellCategory === 'crypto' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0 }}
              style={{ marginBottom: 14, overflow: 'hidden' }}
            >
              <div style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, marginBottom: 8 }}>
                Криптовалюта
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip active={sellCrypto === 'TON'} onClick={() => setSellCrypto('TON')}>
                  TON
                </Chip>
                <Chip active={sellCrypto === 'SOL'} onClick={() => setSellCrypto('SOL')}>
                  SOL
                </Chip>
              </div>
            </motion.div>
          )}
          {sellCategory === 'fiat' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginBottom: 14, overflow: 'hidden' }}
            >
              <div style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700, marginBottom: 8 }}>
                Способ оплаты (ЮКасса)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Chip active={sellFiatMethod === 'sbp'} onClick={() => setSellFiatMethod('sbp')}>
                  СБП
                </Chip>
                <Chip active={sellFiatMethod === 'bank_card'} onClick={() => setSellFiatMethod('bank_card')}>
                  Карта
                </Chip>
                <Chip active={sellFiatMethod === 'yoo_money'} onClick={() => setSellFiatMethod('yoo_money')}>
                  ЮMoney
                </Chip>
                <Chip active={sellFiatMethod === 'sberbank'} onClick={() => setSellFiatMethod('sberbank')}>
                  СберPay
                </Chip>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', color: T.text, marginBottom: 8, fontWeight: 700, fontSize: 13 }}>
            Цена
            {sellCategory === 'fiat' ? ' (₽)' : sellCategory === 'coins' ? ' (монеты)' : sellCrypto === 'TON' ? ' (TON)' : ' (SOL)'}
          </label>
          <input
            type="number"
            step={priceStep}
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: T.radiusMd,
              border: `1px solid ${T.borderSubtle}`,
              background: T.bgDeep,
              color: T.text,
              fontSize: '16px',
            }}
          />
          <p style={{ fontSize: '11px', color: T.textMuted, marginTop: 8, lineHeight: 1.45 }}>{hint}</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: T.radiusMd,
              border: `1px solid ${T.borderSubtle}`,
              background: T.bgElevated,
              color: T.text,
              fontWeight: 700,
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Отмена
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: T.radiusMd,
              border: 'none',
              background: `linear-gradient(135deg, ${T.success} 0%, #16a34a 100%)`,
              color: 'white',
              fontWeight: 800,
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Check size={18} />
            {isSubmitting ? 'Выставляем...' : 'Выставить'}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
