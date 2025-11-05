'use client'
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  price_ton: number | null; // ✅ ДОБАВЛЕНО!
  price_sol: number | null; // ✅ ДОБАВЛЕНО!
  price_crypto: number | null; // Устаревшее поле (для обратной совместимости)
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
// ✅ НОВЫЙ ИНТЕРФЕЙС: ОДИН ИНПУТ + ВАЛЮТА
interface SellModalProps extends HelperFunctions {
  nft: NFTCard;
  sellPrice: string;
  setSellPrice: (value: string) => void;
  sellCurrency: 'COINS' | 'TON' | 'SOL';
  setSellCurrency: (value: 'COINS' | 'TON' | 'SOL') => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function SellModal({
  nft,
  sellPrice,
  setSellPrice,
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
            background: '#ffffff',
            flexShrink: 0,
            border: `2px solid ${getSuitColor(nft.suit)}`
          }}>
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={`${nft.rank} of ${nft.suit}`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block'
                }}
                loading="lazy"
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '0.9rem'
              }}>
                No Image
              </div>
            )}
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

        {/* ✅ НОВАЯ СИСТЕМА: ОДИН ИНПУТ + ВЫБОР ВАЛЮТЫ */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>
            💎 Выберите валюту:
          </label>
          <select
            value={sellCurrency}
            onChange={(e) => setSellCurrency(e.target.value as 'COINS' | 'TON' | 'SOL')}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '2px solid rgba(251, 191, 36, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            <option value="COINS">💰 Монеты (COINS)</option>
            <option value="TON">💎 TON</option>
            <option value="SOL">☀️ SOL</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontWeight: 'bold' }}>
            💵 Цена:
          </label>
          <input
            type="number"
            step={sellCurrency === 'COINS' ? '1' : '0.001'}
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder={sellCurrency === 'COINS' ? '1000' : '0.5'}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '2px solid rgba(96, 165, 250, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              fontSize: '16px'
            }}
          />
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            {sellCurrency === 'COINS' && '💰 Монеты - внутриигровая валюта'}
            {sellCurrency === 'TON' && '💎 TON - криптовалюта Telegram'}
            {sellCurrency === 'SOL' && '☀️ SOL - Solana криптовалюта'}
          </p>
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

