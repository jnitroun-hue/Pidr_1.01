'use client';

import { useCallback, useState } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import { appAlert, appConfirm } from '@/lib/app-notice';

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
  const [sellCategory, setSellCategory] = useState<'coins' | 'crypto' | 'fiat'>('coins');
  const [sellCrypto, setSellCrypto] = useState<'TON' | 'SOL'>('TON');
  const [sellFiatMethod, setSellFiatMethod] = useState<
    'bank_card' | 'sbp' | 'yoo_money' | 'sberbank'
  >('sbp');
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

  const openSellModal = useCallback((card: SellableNftCard) => {
    setSellCard(card);
    setSellPrice('');
    setSellCategory('coins');
    setSellCrypto('TON');
    setSellFiatMethod('sbp');
    setShowSellModal(true);
  }, []);

  const closeSellModal = useCallback(() => {
    setShowSellModal(false);
    setSellCard(null);
    setSellPrice('');
    setIsSubmittingSell(false);
  }, []);

  const submitSell = useCallback(async () => {
    if (!sellCard || isSubmittingSell) return;

    const price = parseFloat(sellPrice);
    if (!price || price <= 0) {
      await appAlert('Укажите корректную цену больше нуля.', { title: 'Цена', type: 'warning' });
      return;
    }

    setIsSubmittingSell(true);
    try {
      if (sellCategory === 'crypto') {
        const walletType = sellCrypto === 'TON' ? 'ton' : 'sol';
        const checkResponse = await fetch('/api/wallet/check', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
          body: JSON.stringify({ wallet_type: walletType }),
        });
        const checkData = await checkResponse.json();

        if (!checkData.success || !checkData.wallet) {
          setIsSubmittingSell(false);
          await appAlert(
            `Для продажи за ${sellCrypto} подключите кошелёк в разделе «Кошелёк» или в NFT-коллекции.`,
            { title: 'Нужен кошелёк', type: 'warning' }
          );
          return;
        }

        const ok = await appConfirm(
          `Оплата придёт на ваш ${sellCrypto} кошелёк:\n\n${checkData.wallet.wallet_address}\n\nВыставить лот?`,
          { confirmText: 'Выставить', type: 'info' }
        );
        if (!ok) return;
      }

      const requestBody: Record<string, unknown> = {
        nft_card_id: Number(sellCard.id),
        price_coins: null,
        price_ton: null,
        price_sol: null,
        price_rub: null,
        fiat_payment_method: null,
      };

      if (sellCategory === 'coins') {
        requestBody.price_coins = Math.floor(price);
      } else if (sellCategory === 'crypto') {
        if (sellCrypto === 'TON') requestBody.price_ton = price;
        else requestBody.price_sol = price;
      } else {
        requestBody.price_rub = Math.round(price * 100) / 100;
        requestBody.fiat_payment_method = sellFiatMethod;
      }

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

      setShowSellModal(false);
      setSellCard(null);
      setSellPrice('');
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
    onListed,
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
    isSubmittingSell,
    openSellModal,
    closeSellModal,
    submitSell,
  };
}
