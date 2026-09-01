'use client'

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import { getApiHeaders } from '@/lib/api-headers';
import { appConfirm } from '@/lib/app-notice';
import { openNftCardModal } from '@/lib/nft/open-card-modal';
import { generateThemeCardImageDataUrl } from '@/lib/nft/generate-theme-card-client';
import type { NftThemeKey } from '@/lib/nft/theme-config';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';
import { GRAM, formatGramAmount } from '@/lib/crypto/gram-brand';
import { PidrCoinAmount } from '@/components/PidrCoinIcon';
import {
  copyDepositDetails,
  openExternalWalletForDeposit,
  sendGramViaTonConnect,
} from '@/lib/wallets/telegram-wallet-deposit';
import { nftGenCryptoAmount, nftGenRub, NFT_GEN_MAX_COUNT, NFT_GEN_TON_COST } from '@/lib/nft/crypto-gen-costs';

interface NFTThemeGeneratorProps {
  userCoins: number;
  onBalanceUpdate?: (newBalance: number) => void;
}

// Типы тем
type ThemeType = 'pokemon' | 'halloween' | 'starwars' | 'legendary' | 'deck';

// Конфигурация тем
const THEMES = {
  pokemon: {
    name: 'Покемон',
    blurb: 'Полная колода 52 карт с покемонами на лицевой стороне.',
    icon: '⚡',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    singleCost: 10000,
    deckCost: 400000,
    cryptoCost: { ton: 0.5, sol: 5, eth: 0.0002 },
    total: 52,
    folder: 'pokemon',
    prefix: '' // Файлы: 1.png, 2.png, ...
  },
  halloween: {
    name: 'Хеллоуин',
    blurb: 'Хеллоуинские иллюстрации — 10 уникальных артов.',
    icon: '🎃',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    singleCost: 5000,
    deckCost: 200000,
    cryptoCost: { ton: 0.3, sol: 3, eth: 0.0001 },
    total: 10,
    folder: 'halloween',
    prefix: 'hel_'
  },
  starwars: {
    name: 'Звездные войны',
    blurb: 'Коллекция Звёздных войн — 7 артов.',
    icon: '⚔️',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    singleCost: 5000,
    deckCost: 200000,
    cryptoCost: { ton: 0.3, sol: 3, eth: 0.0001 },
    total: 7,
    folder: 'starwars',
    prefix: 'star_'
  },
  legendary: {
    name: 'Легендарная',
    blurb: 'Самые редкие карты: 5 артов и отдельная цена.',
    icon: '👑',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    singleCost: 50000, // ✅ Очень дорого!
    deckCost: 1000000, // ✅ Миллион!
    cryptoCost: { ton: 2, sol: 20, eth: 0.001 },
    total: 5, // ✅ Всего 5 легендарных картинок
    folder: 'legendary',
    prefix: 'leg_', // ✅ Файлы: leg_1.png, leg_2.png, ...
    rarityWeights: { // ✅ Вероятности выпадения
      leg_1: 10, // 10%
      leg_2: 15, // 15%
      leg_3: 25, // 25%
      leg_4: 30, // 30%
      leg_5: 20  // 20%
    }
  }
};

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'];

export default function NFTThemeGenerator({ userCoins, onBalanceUpdate }: NFTThemeGeneratorProps) {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [focusTheme, setFocusTheme] = useState<keyof typeof THEMES>('pokemon');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genStatus, setGenStatus] = useState('');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoTheme, setCryptoTheme] = useState<keyof typeof THEMES | null>(null);
  const [genQty, setGenQty] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'bank_card' | 'sberbank' | 'yoo_money' | 'sbp'>('bank_card');
  const [tonConnectUI] = useTonConnectUI();
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [rateSnapshot, setRateSnapshot] = useState<ExchangeRateSnapshot | null>(null);

  useEffect(() => {
    const updateLayout = () => {
      setIsCompactLayout(window.innerWidth < 720);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    if (!showCryptoModal && !showModal) return;
    fetch('/api/wallet/rates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.crypto) setRateSnapshot(data as ExchangeRateSnapshot);
      })
      .catch(() => {});
  }, [showCryptoModal, showModal]);

  const genAmountFor = (coin: 'GRAM' | 'SOL' | 'TRX' | 'USDT', qty = genQty) => {
    const theme = cryptoTheme || focusTheme;
    return nftGenCryptoAmount(theme, coin, qty, rateSnapshot);
  };

  const rubForQty = (qty: number, themeKey: keyof typeof THEMES = cryptoTheme || focusTheme) => {
    if (!rateSnapshot) {
      const grams = NFT_GEN_TON_COST[themeKey] ?? 0.3;
      return Math.max(1, Math.ceil(grams * 4 * 80 * qty));
    }
    return nftGenRub(themeKey, qty, rateSnapshot);
  };

  const handleCardTopup = async (kind: 'single' | 'deck') => {
    if (!cryptoTheme) return;

    const themeConfig = THEMES[cryptoTheme];
    const qty = kind === 'deck' ? 52 : Math.max(1, genQty);
    const amountRub = rubForQty(qty, cryptoTheme);
    const label = qty === 1 ? '1 карты' : `${qty} карт`;

    try {
      const response = await fetch('/api/payments/yookassa/create', {
        method: 'POST',
        credentials: 'include',
        headers: getApiHeaders(),
        body: JSON.stringify({
          amount: amountRub,
          description: `Генерация ${label} · ${themeConfig.name}`,
          itemType: 'nft_generation',
          itemId: `nft-gen-${cryptoTheme}-${qty}`,
          theme: cryptoTheme,
          qty,
          paymentMethod: selectedPaymentMethod
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.payment?.confirmationUrl) {
        throw new Error(result.message || 'Не удалось создать платеж');
      }

      window.location.href = result.payment.confirmationUrl;
    } catch (error: any) {
      console.error('Ошибка создания YooKassa платежа:', error);
      alert(`❌ Ошибка оплаты: ${error.message || 'Не удалось создать платеж'}`);
    }
  };

  /** Оплата GRAM / SOL / TRX / USDT → сразу генерация карт */
  const handleCryptoPayForGeneration = async (coin: 'GRAM' | 'SOL' | 'TRX' | 'USDT') => {
    if (!cryptoTheme || generating) return;

    const theme = cryptoTheme;
    const themeConfig = THEMES[theme];
    const qty = Math.min(NFT_GEN_MAX_COUNT, Math.max(1, genQty));
    const amount = genAmountFor(coin, qty);

    setGenerating(true);
    setGenTotal(qty);
    setGenProgress(0);
    setGenStatus('Подготовка карт...');

    try {
      const meRes = await fetch('/api/user/me', {
        method: 'GET',
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      const meData = await meRes.json();
      const uid = meData.user?.id ?? meData.user?.telegram_id;
      if (!uid) throw new Error('Не удалось определить пользователя');

      const paymentId = `nftgen_${uid}_${theme}_${qty}_${Date.now()}`;
      const sinceUnix = Math.floor(Date.now() / 1000) - 60;

      const payInfoRes = await fetch(
        `/api/wallet/deposit-info?coin=${encodeURIComponent(coin === 'GRAM' ? 'TON' : coin)}`,
        { method: 'GET', credentials: 'include', headers: getApiHeaders() }
      );
      const payInfo = await payInfoRes.json();
      if (!payInfoRes.ok || !payInfo.success || !payInfo.address) {
        throw new Error(payInfo.message || `${coin} не настроен на сервере`);
      }

      const receiverAddress = payInfo.address;
      const prepared: Array<{ suit: string; rank: string; imageData: string; themeId: number }> = [];
      for (let i = 0; i < qty; i += 1) {
        const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
        const randomId = Math.floor(Math.random() * themeConfig.total) + 1;
        setGenStatus(`Рисунок ${i + 1} из ${qty}...`);
        setGenProgress(i);
        const imageData = await generateThemeCardImage(randomSuit, randomRank, randomId, theme);
        prepared.push({ suit: randomSuit, rank: randomRank, imageData, themeId: randomId });
      }

      setGenStatus(`Оплата ${amount} ${coin === 'GRAM' ? GRAM.symbol : coin}...`);

      let txHash: string | undefined;

      if (coin === 'GRAM') {
        const outcome = await sendGramViaTonConnect({
          tonConnectUI,
          masterAddress: receiverAddress,
          amount,
          memo: paymentId,
        });
        if (outcome.status === 'cancelled') {
          throw new Error('Оплата отменена в Telegram Wallet');
        }
        txHash = outcome.status === 'submitted' ? outcome.clientResult : undefined;
      } else {
        await copyDepositDetails(receiverAddress, paymentId);
        openExternalWalletForDeposit({
          coin,
          masterAddress: receiverAddress,
          amount,
          memo: paymentId,
        });
        alert(
          `Отправьте ${amount} ${coin} на адрес проекта.\nMemo: ${paymentId}\n\nПосле перевода вернитесь — карты появятся в коллекции.`
        );
      }

      setGenStatus(`Проверка оплаты и выпуск карт...`);
      setShowCryptoModal(false);

      const first = prepared[0]!;
      const maxAttempts = coin === 'GRAM' ? 15 : 24;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 4000));

        const genRes = await fetch('/api/nft/generate-crypto', {
          method: 'POST',
          credentials: 'include',
          headers: getApiHeaders(),
          body: JSON.stringify({
            theme,
            suit: first.suit,
            rank: first.rank,
            imageData: first.imageData,
            themeId: first.themeId,
            cards: prepared,
            action: `random_${theme}`,
            crypto: coin,
            paymentId,
            transactionHash: txHash,
            expectedAmount: amount,
            sinceUnix,
          }),
        });

        const genData = await genRes.json();
        if (genRes.ok && genData.success) {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
          const shown = genData.nft || genData.nfts?.[0];
          if (shown) {
            openNftCardModal({
              id: shown.id,
              rank: shown.rank,
              suit: shown.suit,
              rarity: shown.rarity ?? theme,
              image_url: shown.image_url,
              metadata: { theme, theme_id: first.themeId },
            });
          }
          setCryptoTheme(null);
          setShowModal(false);
          return;
        }

        if (genData.code !== 'PAYMENT_PENDING') {
          throw new Error(genData.error || 'Ошибка генерации после оплаты');
        }
      }

      throw new Error('Платёж не подтвердился. Если перевод уже ушёл, подождите и откройте коллекцию.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('User rejects') && !msg.includes('Rejected') && !msg.includes('отменена')) {
        alert(`❌ ${msg}`);
      }
    } finally {
      setGenerating(false);
      setGenStatus('');
      setGenProgress(0);
      setGenTotal(0);
    }
  };

  // Генерация одной карты
  const handleGenerateSingle = async (theme: keyof typeof THEMES) => {
    if (generating) return;
    
    const themeConfig = THEMES[theme];
    
    if (userCoins < themeConfig.singleCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${themeConfig.singleCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    if (!(await appConfirm(`Сгенерировать случайную карту ${themeConfig.name}?\n\nСтоимость: ${themeConfig.singleCost.toLocaleString()} монет`, { confirmText: 'Сгенерировать' }))) {
      return;
    }

    setGenerating(true);
    setSelectedTheme(theme);
    setGenProgress(0);
    setGenTotal(1);
    setGenStatus('Генерация изображения...');

    try {
      const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
      const randomId = Math.floor(Math.random() * themeConfig.total) + 1;

      console.log(`🎨 [Client] Генерируем карту: ${theme}, ID: ${randomId}`);
      const imageData = await generateThemeCardImage(randomSuit, randomRank, randomId, theme);
      setGenStatus('Сохранение в коллекцию...');
      
      const response = await fetch('/api/nft/generate-theme', {
        method: 'POST',
        credentials: 'include',
        headers: getApiHeaders(),
        body: JSON.stringify({
          suit: randomSuit,
          rank: randomRank,
          imageData,
          theme,
          themeId: randomId,
          action: `random_${theme}`,
          skipCoinDeduction: false
        })
      });

      const result = await response.json();

        if (response.ok && result.success) {
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ (мгновенно с retry)
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду
        window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
        
        // ✅ Retry механизм: повторяем обновление через 1 и 3 секунды для надежности
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 1000);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 3000);
        
        // ✅ ОБНОВЛЯЕМ БАЛАНС НА КЛИЕНТЕ
        if (result.newBalance !== undefined) {
          if (onBalanceUpdate) {
            onBalanceUpdate(result.newBalance);
          }
          // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ БАЛАНСА В ПРОФИЛЕ
          window.dispatchEvent(new CustomEvent('balance-updated'));
        } else {
          // ✅ ЕСЛИ newBalance НЕ ПРИШЕЛ - ЗАГРУЖАЕМ ИЗ БД
          console.warn('⚠️ newBalance не получен, загружаем из БД...');
          if (onBalanceUpdate) {
            try {
              const balanceResponse = await fetch('/api/user/me', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: getApiHeaders(),
              });
              if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                if (balanceData.user?.coins !== undefined) {
                  onBalanceUpdate(balanceData.user.coins);
                  window.dispatchEvent(new CustomEvent('balance-updated'));
                }
              }
            } catch (err) {
              console.error('❌ Ошибка загрузки баланса:', err);
            }
          }
        }
        
        setGenProgress(1);
        setGenStatus('Готово!');

        if (result.nft) {
          openNftCardModal({
            id: result.nft.id,
            rank: result.nft.rank ?? randomRank,
            suit: result.nft.suit ?? randomSuit,
            rarity: result.nft.rarity ?? theme,
            image_url: result.nft.image_url,
            metadata: {
              theme: result.nft.theme ?? theme,
              theme_id: result.nft.theme_id ?? randomId,
            },
          });
        }

        setShowModal(false);
      } else {
        throw new Error(result.error || 'Ошибка генерации');
      }
    } catch (error: any) {
      console.error('Ошибка генерации:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setGenerating(false);
      setSelectedTheme(null);
      setGenProgress(0);
      setGenTotal(0);
      setGenStatus('');
    }
  };

  // Генерация полной колоды
  const handleGenerateDeck = async (theme: keyof typeof THEMES) => {
    if (generating) return;
    
    const themeConfig = THEMES[theme];
    
    if (userCoins < themeConfig.deckCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${themeConfig.deckCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    if (!(await appConfirm(`Сгенерировать полную колоду ${themeConfig.name}?\n\n52 уникальные карты\nСтоимость: ${themeConfig.deckCost.toLocaleString()} монет`, { confirmText: 'Сгенерировать колоду' }))) {
      return;
    }

    setGenerating(true);
    setSelectedTheme(theme);
    setGenProgress(0);
    setGenTotal(52);
    setGenStatus('Подготовка генерации колоды...');

    try {
      let successCount = 0;
      const themeConfig = THEMES[theme];

      for (const suit of SUITS) {
        for (const rank of RANKS) {
          const themeId = Math.floor(Math.random() * themeConfig.total) + 1;
          
          setGenStatus(`${getSuitSymbol(suit)} ${rank.toUpperCase()} — генерация...`);
          const imageData = await generateThemeCardImage(suit, rank, themeId, theme);
          
          const response = await fetch('/api/nft/generate-theme', {
            method: 'POST',
            credentials: 'include',
            headers: getApiHeaders(),
            body: JSON.stringify({
              suit,
              rank,
              imageData,
              theme,
              themeId,
              action: `deck_${theme}`,
              skipCoinDeduction: true // Списываем монеты только 1 раз в конце
            })
          });

          const result = await response.json();

          if (response.ok && result.success) {
            successCount++;
          }
          setGenProgress(successCount);
        }
      }

      setGenStatus('Списание монет...');
      const deductResponse = await fetch('/api/user/add-coins', {
        method: 'POST',
        credentials: 'include',
        headers: getApiHeaders(),
        body: JSON.stringify({
          amount: -themeConfig.deckCost
        })
      });

      const deductResult = await deductResponse.json();

      if (deductResponse.ok && deductResult.success) {
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ КОЛОДЫ (мгновенно с retry)
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду
        window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
        
        // ✅ Retry механизм: повторяем обновление через 1 и 3 секунды для надежности
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 1000);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 3000);
        
        setGenStatus('Колода готова!');
        
        alert(`✅ Колода ${themeConfig.name} создана!\n\n${successCount} уникальных карт\nСохранено в коллекцию!`);
        
        if (onBalanceUpdate && deductResult.newBalance !== undefined) {
          onBalanceUpdate(deductResult.newBalance);
        }
        
        window.dispatchEvent(new CustomEvent('balance-updated'));
        
        setShowModal(false);
      } else {
        throw new Error('Ошибка списания монет');
      }
    } catch (error: any) {
      console.error('Ошибка генерации колоды:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setGenerating(false);
      setSelectedTheme(null);
      setGenProgress(0);
      setGenTotal(0);
      setGenStatus('');
    }
  };

  const generateThemeCardImage = (
    suit: string,
    rank: string,
    themeId: number,
    theme: keyof typeof THEMES
  ): Promise<string> => generateThemeCardImageDataUrl(suit, rank, theme as NftThemeKey, themeId);

  // ✅ КЛИЕНТСКАЯ ГЕНЕРАЦИЯ — общая утилита generateThemeCardImageDataUrl

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || suit;
  };

  return (
    <>
      {/* ГЛАВНАЯ КНОПКА */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: T.radiusLg,
          border: `1px solid ${T.borderGold}`,
          background: `linear-gradient(135deg, ${T.accentGold}18 0%, ${T.bgDeep} 100%)`,
          color: T.accentGold,
          fontWeight: 800,
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <Sparkles size={22} />
        Создать NFT-карту
      </motion.button>

      {/* МОДАЛЬНОЕ ОКНО */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !generating && setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: `linear-gradient(165deg, ${T.bgCard} 0%, ${T.bgDeep} 100%)`,
                borderRadius: T.radiusLg,
                border: `1px solid ${T.borderGold}`,
                padding: isCompactLayout ? '18px' : '30px',
                maxWidth: isCompactLayout ? '420px' : '760px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: T.shadowCard,
              }}
            >
              {/* ЗАГОЛОВОК */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: isCompactLayout ? '20px' : '24px', fontWeight: 800, color: T.accentGold, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <Sparkles size={24} />
                    Генерация карт
                  </h2>
                  <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.5, margin: '8px 0 0' }}>
                    Это коллекции рисунков для карт, не тема приложения. Сначала выберите набор, затем одну карту или всю колоду.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={generating}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    color: '#ef4444'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* ШАГ 1: КОЛЛЕКЦИЯ */}
              <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                1. Коллекция артов
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                  marginBottom: '16px'
                }}
              >
                {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((themeKey) => (
                  <ThemeCard
                    key={themeKey}
                    theme={themeKey}
                    themeConfig={THEMES[themeKey]}
                    selected={focusTheme === themeKey}
                    onSelect={() => setFocusTheme(themeKey)}
                    disabled={generating}
                    isLegendary={themeKey === 'legendary'}
                  />
                ))}
              </div>

              {(() => {
                const cfg = THEMES[focusTheme];
                const singleCostLabel = cfg.singleCost.toLocaleString('ru-RU');
                const deckCostLabel = cfg.deckCost.toLocaleString('ru-RU');
                const busy = generating;
                return (
                  <div style={{
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    background: 'rgba(0,0,0,0.22)',
                    border: `1px solid ${cfg.color}44`,
                  }}>
                    <div style={{ color: T.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                      2. Что создать
                    </div>
                    <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{cfg.name}</div>
                    <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>{cfg.blurb}</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: T.textMuted }}>{cfg.total} артов в наборе</span>
                      <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                      <span style={{ fontSize: 12, color: T.textMuted }}>Оплата: монеты или крипта</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.01 }}
                        whileTap={{ scale: busy ? 1 : 0.99 }}
                        disabled={busy}
                        onClick={() => handleGenerateSingle(focusTheme)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${cfg.color}88`,
                          background: cfg.gradient,
                          color: '#0f172a',
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: busy ? 'wait' : 'pointer',
                          opacity: busy ? 0.65 : 1,
                        }}
                      >
                        {busy && selectedTheme === focusTheme ? 'Создаём карту…' : `Одна случайная карта · ${singleCostLabel} монет`}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.01 }}
                        whileTap={{ scale: busy ? 1 : 0.99 }}
                        disabled={busy}
                        onClick={() => handleGenerateDeck(focusTheme)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          border: `1px solid ${cfg.color}55`,
                          background: 'rgba(15,23,42,0.7)',
                          color: '#f8fafc',
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: busy ? 'wait' : 'pointer',
                          opacity: busy ? 0.65 : 1,
                        }}
                      >
                        {busy && selectedTheme === focusTheme ? 'Создаём колоду…' : `Полная колода · ${deckCostLabel} монет`}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.01 }}
                        whileTap={{ scale: busy ? 1 : 0.99 }}
                        disabled={busy}
                        onClick={() => { setCryptoTheme(focusTheme); setGenQty(1); setShowCryptoModal(true); }}
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(16,185,129,0.4)',
                          background: 'rgba(16,185,129,0.12)',
                          color: '#6ee7b7',
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: busy ? 'wait' : 'pointer',
                          opacity: busy ? 0.65 : 1,
                        }}
                      >
                        Оплатить генерацию рублями или криптой
                      </motion.button>
                    </div>
                  </div>
                );
              })()}

              {/* ПРОГРЕСС-БАР ГЕНЕРАЦИИ */}
              {generating && genTotal > 0 && (
                <div style={{
                  padding: '20px', borderRadius: '16px', marginBottom: '16px',
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(6,182,212,0.06) 100%)',
                  border: '1.5px solid rgba(255,215,0,0.25)',
                  boxShadow: '0 4px 24px rgba(255,215,0,0.08)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffd700' }}>
                      {genTotal === 1 ? 'Генерация карты...' : `Генерация колоды`}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#06b6d4' }}>
                      {genProgress}/{genTotal}
                    </span>
                  </div>
                  <div style={{
                    width: '100%', height: '10px', borderRadius: '5px',
                    background: 'rgba(0,0,0,0.4)', overflow: 'hidden',
                    border: '1px solid rgba(255,215,0,0.1)',
                  }}>
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${genTotal > 0 ? (genProgress / genTotal) * 100 : 0}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: '5px',
                        background: 'linear-gradient(90deg, #ffd700 0%, #06b6d4 50%, #ffd700 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite',
                        boxShadow: '0 0 12px rgba(255,215,0,0.4)',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                    {genStatus}
                  </div>
                  <style>{`
                    @keyframes shimmer {
                      0% { background-position: 200% 0; }
                      100% { background-position: -200% 0; }
                    }
                  `}</style>
                </div>
              )}

              {/* БАЛАНС */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Ваш баланс:</p>
                <p style={{ color: '#fbbf24', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <PidrCoinAmount value={userCoins} size={24} />
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ОПЛАТЫ И ПОПОЛНЕНИЯ */}
      <AnimatePresence>
        {showCryptoModal && cryptoTheme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCryptoModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '24px',
                border: '2px solid rgba(59, 130, 246, 0.35)',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#fbbf24',
                  marginBottom: '8px'
                }}>
                  💳 / 💎 Оплата генерации
                </h2>
                <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                  {THEMES[cryptoTheme].name}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5 }}>
                  Оплачиваете сразу генерацию. Карты появятся в коллекции — монеты не начисляются.
                  Цена в рублях считается по курсу {GRAM.symbol}.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(148,163,184,0.18)',
              }}>
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 14 }}>Сколько карт</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Цена пересчитывается сразу</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setGenQty((n) => Math.max(1, n - 1))}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    max={NFT_GEN_MAX_COUNT}
                    value={genQty}
                    onChange={(e) => setGenQty(Math.min(NFT_GEN_MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))}
                    style={{
                      width: 56,
                      textAlign: 'center',
                      borderRadius: 10,
                      border: '1px solid rgba(251,191,36,0.4)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: 16,
                      padding: '8px 4px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setGenQty((n) => Math.min(NFT_GEN_MAX_COUNT, n + 1))}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 20, cursor: 'pointer' }}
                  >+</button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {([
                  {
                    key: 'single' as const,
                    title: genQty === 1 ? 'Генерация карты' : `Генерация ${genQty} карт`,
                    qty: genQty,
                  },
                  {
                    key: 'deck' as const,
                    title: 'Полная колода (52)',
                    qty: 52,
                  }
                ]).map((option) => (
                  <div
                    key={option.key}
                    style={{
                      borderRadius: '18px',
                      padding: '18px',
                      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%)',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#ffffff', fontSize: '17px', fontWeight: 'bold' }}>{option.title}</div>
                        <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                          {formatGramAmount(genAmountFor('GRAM', option.qty))} · сразу в коллекцию
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 'bold' }}>
                          {rubForQty(option.qty).toLocaleString('ru-RU')} ₽
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          по курсу {GRAM.symbol}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        if (option.key === 'deck') setGenQty(52);
                        void handleCardTopup(option.key);
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '14px',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(59, 130, 246, 0.18) 100%)',
                        color: '#ffffff',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Оплатить генерацию · {rubForQty(option.qty).toLocaleString('ru-RU')} ₽
                    </motion.button>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px', fontWeight: 'bold' }}>
                  Способ оплаты картой / YooKassa
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { id: 'bank_card', label: 'Visa / MC' },
                    { id: 'sberbank', label: 'СберПэй' },
                    { id: 'yoo_money', label: 'ЮMoney' },
                    { id: 'sbp', label: 'СБП' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id as 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp')}
                      style={{
                        padding: '11px 10px',
                        borderRadius: '12px',
                        border: selectedPaymentMethod === method.id
                          ? '1.5px solid rgba(251, 191, 36, 0.6)'
                          : '1px solid rgba(148, 163, 184, 0.18)',
                        background: selectedPaymentMethod === method.id
                          ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(59, 130, 246, 0.14) 100%)'
                          : 'rgba(15, 23, 42, 0.7)',
                        color: selectedPaymentMethod === method.id ? '#fbbf24' : '#cbd5e1',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                borderRadius: '18px',
                padding: '18px',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
                  Оплатить генерацию криптой
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>
                  {genQty} {genQty === 1 ? 'карта' : 'карт'}. GRAM открывает Telegram Wallet, как в профиле. После сети карты сразу в коллекции.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {([
                    { coin: 'GRAM' as const, label: formatGramAmount(genAmountFor('GRAM')) },
                    { coin: 'USDT' as const, label: `${genAmountFor('USDT')} USDT` },
                    { coin: 'SOL' as const, label: `${genAmountFor('SOL')} SOL` },
                    { coin: 'TRX' as const, label: `${genAmountFor('TRX')} TRX` },
                  ]).map((opt) => (
                    <motion.button
                      key={opt.coin}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={generating}
                      onClick={() => handleCryptoPayForGeneration(opt.coin)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(8, 145, 178, 0.22) 100%)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: generating ? 'wait' : 'pointer',
                        opacity: generating ? 0.7 : 1,
                      }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
                  {GRAM.symbol}: откроется Telegram Wallet для подтверждения перевода.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCryptoModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                  color: '#ef4444',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ← НАЗАД
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Компонент карточки темы
interface ThemeCardProps {
  theme: keyof typeof THEMES;
  themeConfig: typeof THEMES[keyof typeof THEMES];
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  isLegendary?: boolean;
}

function ThemeCard({ theme, themeConfig, selected, onSelect, disabled, isLegendary }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{
        position: 'relative',
        textAlign: 'left',
        background: selected
          ? `linear-gradient(180deg, ${themeConfig.color}22 0%, rgba(15, 23, 42, 0.94) 100%)`
          : 'rgba(15, 23, 42, 0.88)',
        borderRadius: 16,
        border: selected ? `1.5px solid ${themeConfig.color}` : `1px solid ${themeConfig.color}33`,
        padding: '12px 12px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        boxShadow: selected ? `0 0 0 1px ${themeConfig.color}55, 0 10px 24px rgba(0,0,0,0.35)` : 'none',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {isLegendary && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{themeConfig.icon}</span>
        <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: 14 }}>{themeConfig.name}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.4 }}>
        {themeConfig.total} артов
        {theme === 'legendary' ? ' · rare' : ''}
      </div>
    </button>
  );
}


