import {
  type FiatMethod,
  type FiatReceiveMode,
  type SellCategory,
  type SellCrypto,
  isValidPhone,
  isValidWallet,
  normalizePhone,
} from './payment-meta';

export interface SellListingInput {
  nftCardId: number;
  category: SellCategory;
  price: string;
  crypto: SellCrypto;
  fiatMethod: FiatMethod;
  fiatReceiveMode: FiatReceiveMode;
  walletAddress: string;
  fiatPhone: string;
  fiatQrDataUrl: string;
}

export type SellValidation =
  | { ok: true; price: number }
  | { ok: false; title: string; message: string };

export function validateSellListing(input: SellListingInput): SellValidation {
  const price = parseFloat(input.price.replace(',', '.'));
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, title: 'Цена', message: 'Укажите корректную цену больше нуля.' };
  }

  if (input.category === 'crypto') {
    const wallet = input.walletAddress.trim();
    if (!wallet) {
      return { ok: false, title: 'Кошелёк', message: 'Укажите адрес кошелька для получения оплаты.' };
    }
    if (!isValidWallet(input.crypto, wallet)) {
      return {
        ok: false,
        title: 'Кошелёк',
        message: `Проверьте адрес ${input.crypto}-кошелька — формат некорректен.`,
      };
    }
  }

  if (input.category === 'fiat') {
    const needsP2P = input.fiatMethod === 'sbp' || input.fiatMethod === 'sberbank';
    if (needsP2P) {
      if (input.fiatReceiveMode === 'phone') {
        if (!isValidPhone(input.fiatPhone)) {
          return {
            ok: false,
            title: 'СБП',
            message: 'Укажите номер телефона для перевода (например +79991234567).',
          };
        }
      } else if (!input.fiatQrDataUrl.trim()) {
        return {
          ok: false,
          title: 'QR-код',
          message: 'Загрузите QR-код для оплаты или переключитесь на номер телефона.',
        };
      }
    }
  }

  return { ok: true, price };
}

export function buildSellListingBody(input: SellListingInput, validatedPrice: number) {
  const body: Record<string, unknown> = {
    nft_card_id: input.nftCardId,
    price_coins: null,
    price_ton: null,
    price_sol: null,
    price_rub: null,
    fiat_payment_method: null,
    seller_wallet_address: null,
    seller_wallet_network: null,
    seller_fiat_phone: null,
    seller_fiat_qr_url: null,
  };

  if (input.category === 'coins') {
    body.price_coins = Math.floor(validatedPrice);
  } else if (input.category === 'crypto') {
    if (input.crypto === 'GRAM') body.price_ton = validatedPrice;
    else body.price_sol = validatedPrice;
    body.seller_wallet_address = input.walletAddress.trim();
    body.seller_wallet_network = input.crypto === 'GRAM' ? 'TON' : input.crypto;
  } else {
    body.price_rub = Math.round(validatedPrice * 100) / 100;
    body.fiat_payment_method = input.fiatMethod;
    if (input.fiatReceiveMode === 'phone' && input.fiatPhone.trim()) {
      body.seller_fiat_phone = normalizePhone(input.fiatPhone);
    }
    if (input.fiatReceiveMode === 'qr' && input.fiatQrDataUrl.trim()) {
      body.seller_fiat_qr_url = input.fiatQrDataUrl.trim();
    }
  }

  return body;
}
