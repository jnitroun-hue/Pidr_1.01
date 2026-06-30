/**
 * Пополнение через Telegram Wallet / TonConnect / deeplink.
 */
import { beginCell, toNano } from '@ton/core';
import type { TonConnectUI } from '@tonconnect/ui-react';
import { GRAM } from '@/lib/crypto/gram-brand';
import { normalizeDepositCoin } from '@/lib/wallets/master-addresses';

const buildTonCommentPayload = (comment: string) =>
  beginCell().storeUint(0, 32).storeStringTail(comment).endCell().toBoc().toString('base64');

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp?.initDataUnsafe?.user);
}

export function openTelegramWalletApp(): void {
  const tg = (window as any).Telegram?.WebApp;
  const url = 'https://t.me/wallet';
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

export async function copyDepositDetails(address: string, memo?: string | null): Promise<void> {
  const text = memo ? `${address}\nMemo: ${memo}` : address;
  await navigator.clipboard.writeText(text);
}

/** Gram / TON — нативная отправка через TonConnect → Telegram Wallet */
export async function sendGramViaTonConnect(params: {
  tonConnectUI: TonConnectUI;
  masterAddress: string;
  amount: number;
  memo: string;
}): Promise<void> {
  const { tonConnectUI, masterAddress, amount, memo } = params;

  if (!tonConnectUI.connected) {
    const tonUi = tonConnectUI as TonConnectUI & { openSingleWalletModal?: (name: string) => Promise<void> };
    if (typeof tonUi.openSingleWalletModal === 'function') {
      await tonUi.openSingleWalletModal('telegram-wallet');
    } else {
      await tonConnectUI.openModal();
    }
  }

  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: masterAddress,
        amount: toNano(amount).toString(),
        payload: buildTonCommentPayload(memo),
      },
    ],
  });
}

/** Deeplink / открытие кошелька для остальных монет в Telegram */
export function openExternalWalletForDeposit(params: {
  coin: string;
  masterAddress: string;
  amount: number;
  memo?: string | null;
}): void {
  const coin = normalizeDepositCoin(params.coin);
  const { masterAddress, amount, memo } = params;
  const tg = (window as any).Telegram?.WebApp;

  if (coin === 'GRAM' || coin === 'TON') {
    const amountNano = Math.floor(amount * 1_000_000_000);
    const tonUrl = `ton://transfer/${masterAddress}?amount=${amountNano}&text=${encodeURIComponent(memo || '')}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tonUrl);
    } else {
      window.location.href = tonUrl;
    }
    return;
  }

  if (coin === 'TRX' || coin === 'USDT') {
    const tronUrl = `https://link.tronlink.org/#/transfer?address=${encodeURIComponent(masterAddress)}&amount=${amount}${memo ? `&memo=${encodeURIComponent(memo)}` : ''}`;
    if (tg?.openLink) {
      tg.openLink(tronUrl);
    } else {
      window.open(tronUrl, '_blank');
    }
    return;
  }

  if (coin === 'ETH') {
    const wei = BigInt(Math.floor(amount * 1e18)).toString(16);
    const ethUrl = `https://metamask.app.link/send/${masterAddress}@1?value=0x${wei}`;
    if (tg?.openLink) {
      tg.openLink(ethUrl);
    } else {
      window.open(ethUrl, '_blank');
    }
    return;
  }

  if (coin === 'SOL') {
    const solUrl = `https://phantom.app/ul/v1/send?recipient=${encodeURIComponent(masterAddress)}&amount=${amount}`;
    if (tg?.openLink) {
      tg.openLink(solUrl);
    } else {
      window.open(solUrl, '_blank');
    }
    return;
  }

  openTelegramWalletApp();
}

export function depositCoinLabel(coin: string): string {
  const normalized = normalizeDepositCoin(coin);
  if (normalized === 'GRAM' || normalized === 'TON') return GRAM.symbol;
  return normalized ?? coin.toUpperCase();
}
