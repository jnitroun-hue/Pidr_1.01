'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import { appAlert } from '@/lib/app-notice';
import {
  type FiatMethod,
  type FiatReceiveMode,
  type SellCategory,
  type SellCrypto,
} from '@/lib/marketplace/payment-meta';
import { buildSellListingBody, validateSellListing } from '@/lib/marketplace/sell-listing';

export interface SellableNftCard {
  id: number | string;
  suit: string;
  rank: string;
  rarity: string;
  image_url: string;
}

export function useNftSellModal(onListed?: () => void) {
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellCard, setSellCard] = useState<SellableNftCard | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellCategory, setSellCategory] = useState<SellCategory>('coins');
  const [sellCrypto, setSellCrypto] = useState<SellCrypto>('GRAM');
  const [sellFiatMethod, setSellFiatMethod] = useState<FiatMethod>('sbp');
  const [fiatReceiveMode, setFiatReceiveMode] = useState<FiatReceiveMode>('phone');
  const [walletAddress, setWalletAddress] = useState('');
  const [fiatPhone, setFiatPhone] = useState('');
  const [fiatQrDataUrl, setFiatQrDataUrl] = useState('');
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

  const resetForm = useCallback(() => {
    setSellPrice('');
    setSellCategory('coins');
    setSellCrypto('GRAM');
    setSellFiatMethod('sbp');
    setFiatReceiveMode('phone');
    setWalletAddress('');
    setFiatPhone('');
    setFiatQrDataUrl('');
  }, []);

  const openSellModal = useCallback(
    (card: SellableNftCard) => {
      setSellCard(card);
      resetForm();
      setShowSellModal(true);
    },
    [resetForm]
  );

  const closeSellModal = useCallback(() => {
    setShowSellModal(false);
    setSellCard(null);
    resetForm();
    setIsSubmittingSell(false);
  }, [resetForm]);

  useEffect(() => {
    if (!showSellModal || sellCategory !== 'crypto') return;
    let cancelled = false;
    const walletType = sellCrypto === 'GRAM' ? 'ton' : 'sol';
    (async () => {
      try {
        const res = await fetch('/api/wallet/check', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
          body: JSON.stringify({ wallet_type: walletType }),
        });
        const data = await res.json();
        if (!cancelled && data.success && data.wallet?.wallet_address) {
          setWalletAddress((prev) => prev || String(data.wallet.wallet_address));
        }
      } catch {
        /* optional prefill */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showSellModal, sellCategory, sellCrypto]);

  const submitSell = useCallback(async () => {
    if (!sellCard || isSubmittingSell) return;

    const validation = validateSellListing({
      nftCardId: Number(sellCard.id),
      category: sellCategory,
      price: sellPrice,
      crypto: sellCrypto,
      fiatMethod: sellFiatMethod,
      fiatReceiveMode,
      walletAddress,
      fiatPhone,
      fiatQrDataUrl,
    });

    if (!validation.ok) {
      await appAlert(validation.message, { title: validation.title, type: 'warning' });
      return;
    }

    setIsSubmittingSell(true);
    try {
      const requestBody = buildSellListingBody(
        {
          nftCardId: Number(sellCard.id),
          category: sellCategory,
          price: sellPrice,
          crypto: sellCrypto,
          fiatMethod: sellFiatMethod,
          fiatReceiveMode,
          walletAddress,
          fiatPhone,
          fiatQrDataUrl,
        },
        validation.price
      );

      const response = await fetch('/api/marketplace/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        await appAlert(data.error || 'Не удалось выставить на продажу', {
          title: 'Ошибка',
          type: 'error',
          details: data.hint,
        });
        return;
      }

      const created = data.listing;
      const hasPrice =
        created?.price_coins > 0 ||
        created?.price_ton > 0 ||
        created?.price_sol > 0 ||
        (created?.price_rub != null && Number(created.price_rub) > 0);

      if (!hasPrice) {
        await appAlert(
          'Лот создан без цены — выполните миграции БД (0007 и 0010) в Supabase SQL Editor и выставьте лот снова.',
          { title: 'Нужна миграция БД', type: 'error' }
        );
        return;
      }

      closeSellModal();
      window.dispatchEvent(new CustomEvent('marketplace-updated'));
      window.dispatchEvent(new CustomEvent('nft-collection-updated'));
      onListed?.();

      await appAlert('NFT выставлена на продажу в магазине.', {
        title: 'Готово',
        type: 'success',
        confirmText: 'Отлично',
      });
    } catch (error) {
      await appAlert(error instanceof Error ? error.message : 'Ошибка сети', {
        title: 'Ошибка',
        type: 'error',
      });
    } finally {
      setIsSubmittingSell(false);
    }
  }, [
    sellCard,
    isSubmittingSell,
    sellPrice,
    sellCategory,
    sellCrypto,
    sellFiatMethod,
    fiatReceiveMode,
    walletAddress,
    fiatPhone,
    fiatQrDataUrl,
    onListed,
    closeSellModal,
  ]);

  return {
    showSellModal,
    sellCard,
    sellPrice,
    setSellPrice,
    sellCategory,
    setSellCategory,
    sellCrypto,
    setSellCrypto,
    sellFiatMethod,
    setSellFiatMethod,
    fiatReceiveMode,
    setFiatReceiveMode,
    walletAddress,
    setWalletAddress,
    fiatPhone,
    setFiatPhone,
    fiatQrDataUrl,
    setFiatQrDataUrl,
    isSubmittingSell,
    openSellModal,
    closeSellModal,
    submitSell,
  };
}
