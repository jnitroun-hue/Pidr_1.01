'use client'

/**
 * 🎴 NFT ГАЛЕРЕЯ - ПРОСТАЯ И ПОНЯТНАЯ
 * 4 карты в ряд + модалка с информацией
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import WalletQuickConnect from '@/components/WalletQuickConnect';
import { SellModal } from '@/components/MarketplaceTabs';
import { getApiHeaders } from '@/lib/api-headers';
import { appAlert, appConfirm } from '@/lib/app-notice';
import { GRAM } from '@/lib/crypto/gram-brand';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import {
  getNftRankDisplay,
  getNftRarityLabel,
  getNftSuitColor,
  getNftSuitSymbol,
} from '@/lib/nft/card-display';
import { useNftSellModal } from '@/hooks/useNftSellModal';
import { NFT_OPEN_CARD_MODAL_EVENT, type NftCardModalPayload } from '@/lib/nft/open-card-modal';
import NftThemedCardCanvas, { resolveThemeFromMetadata } from '@/components/NftThemedCardCanvas';
import styles from './NFTGallery.module.css';

interface NFTCard {
  id: string;
  user_id: string;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  is_listed?: boolean;
  is_in_deck?: boolean;
}

export default function NFTGallery() {
  const [collection, setCollection] = useState<NFTCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingCard: { id: string | number; image_url?: string; rarity?: string };
    newCard: NFTCard;
  } | null>(null);

  const sellModal = useNftSellModal(() => {
    loadCollection();
  });

  const getSuitColor = getNftSuitColor;
  const getSuitSymbol = getNftSuitSymbol;
  const getRarityLabel = getNftRarityLabel;
  const getRankDisplay = getNftRankDisplay;

  const renderCardVisual = (card: NFTCard, width: number, height: number, onClick?: () => void) => {
    const themeInfo = resolveThemeFromMetadata(card.metadata, card.rarity);
    const useStoredImage = Boolean(card.image_url && width <= 240);

    if (useStoredImage) {
      return (
        <img
          src={card.image_url}
          alt={`${getRankDisplay(card.rank)} ${card.suit}`}
          onClick={onClick}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 8,
            background: '#fff',
            cursor: onClick ? 'pointer' : undefined,
          }}
        />
      );
    }

    if (themeInfo) {
      return (
        <NftThemedCardCanvas
          suit={card.suit}
          rank={card.rank}
          theme={themeInfo.theme}
          themeId={themeInfo.themeId}
          fallbackImageUrl={card.image_url}
          width={width}
          height={height}
          fluid
          onClick={onClick}
          style={{ boxShadow: 'none', borderRadius: 8, ...(onClick ? {} : { width: '100%', height: '100%' }) }}
        />
      );
    }
    if (card.image_url) {
      return (
        <img
          src={card.image_url}
          alt={`${card.rank} of ${card.suit}`}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onClick={onClick}
        />
      );
    }
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: getSuitColor(card.suit),
          fontSize: '24px',
          fontWeight: 'bold',
        }}
      >
        <div>{getSuitSymbol(card.suit)}</div>
        <div style={{ fontSize: '16px', marginTop: '4px' }}>{getRankDisplay(card.rank)}</div>
      </div>
    );
  };

  useEffect(() => {
    loadCollection();
    
    const handleCollectionUpdate = () => {
      console.log('🔄 [NFTGallery] Обновляем коллекцию...');
      loadCollection();
    };

    const handleOpenCardModal = (event: Event) => {
      const detail = (event as CustomEvent<NftCardModalPayload>).detail;
      if (!detail?.id) return;
      setSelectedCard({
        id: String(detail.id),
        user_id: String(detail.user_id ?? ''),
        rank: detail.rank,
        suit: detail.suit,
        rarity: detail.rarity,
        image_url: detail.image_url,
        metadata: detail.metadata,
        created_at: detail.created_at ?? new Date().toISOString(),
        is_listed: detail.is_listed ?? false,
        is_in_deck: detail.is_in_deck ?? false,
      });
      loadCollection();
    };
    
    window.addEventListener('nft-collection-updated', handleCollectionUpdate);
    window.addEventListener(NFT_OPEN_CARD_MODAL_EVENT, handleOpenCardModal);
    
    return () => {
      window.removeEventListener('nft-collection-updated', handleCollectionUpdate);
      window.removeEventListener(NFT_OPEN_CARD_MODAL_EVENT, handleOpenCardModal);
    };
  }, []);

  const loadCollection = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nft/collection', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          ...getApiHeaders(),
        },
        cache: 'no-store'
      });

      const result = await response.json();

      if (result.success && result.collection) {
        setCollection(result.collection || []);
      } else {
        setCollection([]);
        // ✅ RETRY: Повторяем запрос если не получили данные (максимум 2 попытки)
        if (retryCount < 2) {
          console.log(`🔄 [NFTGallery] Retry загрузки коллекции (попытка ${retryCount + 1})...`);
          setTimeout(() => loadCollection(retryCount + 1), 1000 * (retryCount + 1));
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
      setCollection([]);
      // ✅ RETRY: Повторяем запрос при ошибке (максимум 2 попытки)
      if (retryCount < 2) {
        console.log(`🔄 [NFTGallery] Retry после ошибки (попытка ${retryCount + 1})...`);
        setTimeout(() => loadCollection(retryCount + 1), 1000 * (retryCount + 1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToDeck = async (card: NFTCard, forceReplace: boolean = false) => {
    try {
      // Если это принудительная замена
      if (forceReplace && duplicateInfo) {
        const response = await fetch('/api/nft/replace-deck-card', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders(),
          },
          body: JSON.stringify({
            existingCardId: duplicateInfo.existingCard.id,
            newCardId: card.id,
            suit: card.suit,
            rank: card.rank,
            image_url: card.image_url
          })
        });

        const result = await response.json();

        if (result.success) {
          // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ И КОЛОДУ ПОСЛЕ ЗАМЕНЫ
          loadCollection();
          window.dispatchEvent(new CustomEvent('deck-updated')); // ✅ Обновляем колоду в профиле
          
          setShowReplaceModal(false);
          setDuplicateInfo(null);
          setSelectedCard(null);
          await appAlert('Карта заменена в игровой колоде.', { title: 'Готово', type: 'success' });
        } else {
          await appAlert(result.error || 'Не удалось заменить', { title: 'Ошибка', type: 'error' });
        }
        return;
      }

      const response = await fetch('/api/nft/add-to-deck', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        body: JSON.stringify({
          nft_card_id: card.id,
          suit: card.suit,
          rank: card.rank,
          image_url: card.image_url
        })
      });

      const result = await response.json();

      if (result.success) {
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ И КОЛОДУ ПОСЛЕ ДОБАВЛЕНИЯ
        loadCollection();
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду везде
        window.dispatchEvent(new CustomEvent('deck-updated')); // ✅ Обновляем колоду в профиле (старое событие для совместимости)
        
        setSelectedCard(null);
        await appAlert('Карта добавлена в игровую колоду.', { title: 'Готово', type: 'success' });
      } else if (result.error === 'DUPLICATE_CARD') {
        // ✅ ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО С ПОДТВЕРЖДЕНИЕМ ЗАМЕНЫ
        setDuplicateInfo({
          existingCard: result.existingCard,
          newCard: card
        });
        setShowReplaceModal(true);
      } else {
        await appAlert(result.error || result.message || 'Не удалось добавить', {
          title: 'Ошибка',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('❌ Ошибка добавления в колоду:', error);
      await appAlert('Ошибка добавления в колоду', { title: 'Ошибка', type: 'error' });
    }
  };

  const handleSell = (card: NFTCard) => {
    setSelectedCard(null);
    sellModal.openSellModal({
      id: card.id,
      suit: card.suit,
      rank: card.rank,
      rarity: card.rarity,
      image_url: card.image_url,
    });
  };

  const handleDelete = async (card: NFTCard) => {
    const confirmed = await appConfirm(
      `Удалить карту навсегда?\n\n${getRankDisplay(card.rank)} ${getSuitSymbol(card.suit)}\n${getRarityLabel(card.rarity)}\n\nЭто действие необратимо.`,
      { destructive: true, confirmText: 'Удалить', cancelText: 'Отмена', type: 'warning' }
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/nft/delete', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        body: JSON.stringify({
          nft_card_id: card.id,
          nftId: card.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSelectedCard(null);
        loadCollection();
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        await appAlert('Карта удалена из коллекции.', { title: 'Удалено', type: 'success' });
      } else {
        await appAlert(result.error || 'Не удалось удалить', { title: 'Ошибка', type: 'error' });
      }
    } catch (error) {
      console.error('❌ Ошибка удаления карты:', error);
      await appAlert('Ошибка удаления карты', { title: 'Ошибка', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: T.textMuted, fontSize: '14px' }}>
        Загрузка коллекции…
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎴</div>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>
          Коллекция пуста
        </p>
        <p>Создайте свою первую NFT карту!</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h3 style={{ 
          color: T.accentGold, 
          fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
          fontWeight: 800, 
          marginBottom: '12px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Моя NFT коллекция
        </h3>
        <p style={{ color: T.textMuted, fontSize: '1rem', marginBottom: '20px' }}>
          Всего карт:{' '}
          <span style={{ color: T.accentGold, fontWeight: 'bold', fontSize: '1.2rem' }}>{collection.length}</span>
        </p>

        {/* ✅ ПОДКЛЮЧЕНИЕ КОШЕЛЬКОВ */}
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            padding: '18px 18px',
            borderRadius: T.radiusLg,
            border: `1px solid ${T.borderGold}`,
            background: `linear-gradient(160deg, ${T.bgCard} 0%, rgba(12,17,26,0.95) 100%)`,
            boxShadow: `${T.shadowCard}, inset 0 1px 0 rgba(251,191,36,0.08)`,
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderRadius: T.radiusMd,
              background: T.warningBg,
              border: `1px solid ${T.warningBorder}`,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: '17px', lineHeight: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.warningTitle, fontSize: '12px', fontWeight: 800, marginBottom: 4 }}>
                  Внимание
                </div>
                <div style={{ color: T.warningBody, fontSize: '11px', lineHeight: 1.55 }}>
                  Проверьте сеть и адрес перед переводами и выводом NFT — ошибки в блокчейне необратимы.
                </div>
              </div>
            </div>
          </div>

          <p
            style={{
              color: T.textMuted,
              fontSize: '12px',
              textAlign: 'center',
              margin: '0 0 14px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Кошельки для NFT · {GRAM.symbol} / EVM / Solana
          </p>

          <div
            style={{
              borderRadius: T.radiusMd,
              border: `1px solid rgba(251,191,36,0.12)`,
              overflow: 'hidden',
              background: 'rgba(2, 6, 23, 0.55)',
            }}
          >
            <WalletQuickConnect variant="embedded" />
          </div>
        </div>
      </div>

      {/* СЕТКА КАРТ - КАК В МАГАЗИНЕ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
        padding: '12px'
      }}>
        {collection.map((card, index) => {
          const suitColor = getSuitColor(card.suit);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedCard(card)}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '8px',
                border: `2px solid ${suitColor}40`,
                padding: '8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              {/* ИЗОБРАЖЕНИЕ КАРТЫ - ОПТИМИЗИРОВАНО ДЛЯ МОБИЛЬНЫХ */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '0.7',
                  position: 'relative',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                  background: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  pointerEvents: 'none',
                }}
              >
                {renderCardVisual(card, 300, 420)}
              </div>

              {/* Rank and Suit Info */}
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: suitColor,
                marginBottom: '6px'
              }}>
                {card.rank?.toUpperCase()} {getSuitSymbol(card.suit)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Модалка карты */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedCard && (
              <motion.div
                key="nft-card-detail"
                className={styles.cardOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCard(null)}
              >
                <motion.div
                  className={styles.cardModal}
                  style={{ borderColor: getSuitColor(selectedCard.suit) }}
                  initial={{ scale: 0.92, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.92, y: 24 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => setSelectedCard(null)}
                    aria-label="Закрыть"
                  >
                    <X size={22} />
                  </button>

                  {selectedCard.is_listed && (
                    <div className={styles.badgeListed}>На продаже в магазине</div>
                  )}
                  {selectedCard.is_in_deck && (
                    <div className={styles.badgeListed} style={{ color: '#93c5fd', borderColor: 'rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.1)' }}>
                      В игровой колоде
                    </div>
                  )}

                  <div className={`${styles.cardFrame} ${styles.cardFrameLarge}`}>
                    {renderCardVisual(selectedCard, 280, 392)}
                  </div>

                  <div className={styles.cardTitle}>
                    <div className={styles.rankRow}>
                      <span className={styles.suitGlyph} style={{ color: getSuitColor(selectedCard.suit) }}>
                        {getSuitSymbol(selectedCard.suit)}
                      </span>
                      <span className={styles.rankText}>{getRankDisplay(selectedCard.rank)}</span>
                    </div>
                    <span className={styles.rarityPill} style={{ color: getSuitColor(selectedCard.suit) }}>
                      {getRarityLabel(selectedCard.rarity)}
                    </span>
                    {(selectedCard.metadata?.themeId ?? selectedCard.metadata?.theme_id) != null && (
                      <p className={styles.metaLine}>
                        ID арта:{' '}
                        <span style={{ color: T.accentGold }}>
                          #{String(selectedCard.metadata?.themeId ?? selectedCard.metadata?.theme_id)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className={styles.actions}>
                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDeck}`}
                        onClick={() => void handleAddToDeck(selectedCard)}
                      >
                        🎴 В колоду
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSell}`}
                        onClick={() => handleSell(selectedCard)}
                        disabled={selectedCard.is_listed}
                      >
                        💰 Продать
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDelete}`}
                      onClick={() => void handleDelete(selectedCard)}
                      disabled={selectedCard.is_listed}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <AnimatePresence>
          {showReplaceModal && duplicateInfo &&
            typeof document !== 'undefined' &&
            createPortal(
              <motion.div
                key="nft-replace-deck"
                className={styles.replaceOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowReplaceModal(false);
                  setDuplicateInfo(null);
                }}
              >
                <motion.div
                  className={styles.replaceModal}
                  initial={{ scale: 0.92, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.92, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className={styles.replaceTitle}>Замена карты в колоде</h3>
                  <p className={styles.replaceText}>
                    У вас уже есть{' '}
                    <strong>
                      {duplicateInfo.newCard.rank}
                      {getSuitSymbol(duplicateInfo.newCard.suit)}
                    </strong>{' '}
                    в колоде. Заменить на новую?
                  </p>

                  <div className={styles.replaceCompare}>
                    <div className={styles.replaceSide}>
                      <p className={styles.replaceLabel}>Текущая</p>
                      {duplicateInfo.existingCard.image_url && (
                        <img src={duplicateInfo.existingCard.image_url} alt="Текущая карта" />
                      )}
                    </div>
                    <div className={styles.replaceArrow}>→</div>
                    <div className={styles.replaceSide}>
                      <p className={styles.replaceLabel}>Новая</p>
                      {duplicateInfo.newCard.image_url && (
                        <img src={duplicateInfo.newCard.image_url} alt="Новая карта" />
                      )}
                    </div>
                  </div>

                  <div className={styles.replaceActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnReplaceCancel}`}
                      onClick={() => {
                        setShowReplaceModal(false);
                        setDuplicateInfo(null);
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnReplaceConfirm}`}
                      onClick={() => void handleAddToDeck(duplicateInfo.newCard, true)}
                    >
                      Заменить
                    </button>
                  </div>
                </motion.div>
              </motion.div>,
              document.body
            )}
      </AnimatePresence>

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
    </div>
  );
}

