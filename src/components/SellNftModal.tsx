'use client';

import { useCallback, useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Check, Coins, Smartphone, QrCode, Wallet, Upload } from 'lucide-react';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import {
  CRYPTO_OPTIONS,
  FIAT_OPTIONS,
  type FiatMethod,
  type FiatReceiveMode,
  type SellCategory,
  type SellCrypto,
} from '@/lib/marketplace/payment-meta';
import { GRAM } from '@/lib/crypto/gram-brand';
import styles from './SellNftModal.module.css';

export interface SellNftCard {
  id: number;
  suit: string;
  rank: string;
  rarity: string;
  image_url: string;
}

interface HelperFunctions {
  getSuitColor: (suit: string) => string;
  getSuitSymbol: (suit: string) => string;
  getRankDisplay: (rank: string) => string;
}

export interface SellNftModalProps extends HelperFunctions {
  nft: SellNftCard;
  sellPrice: string;
  setSellPrice: (value: string) => void;
  sellCategory: SellCategory;
  setSellCategory: (v: SellCategory) => void;
  sellCrypto: SellCrypto;
  setSellCrypto: (v: SellCrypto) => void;
  sellFiatMethod: FiatMethod;
  setSellFiatMethod: (v: FiatMethod) => void;
  fiatReceiveMode: FiatReceiveMode;
  setFiatReceiveMode: (v: FiatReceiveMode) => void;
  walletAddress: string;
  setWalletAddress: (v: string) => void;
  fiatPhone: string;
  setFiatPhone: (v: string) => void;
  fiatQrDataUrl: string;
  setFiatQrDataUrl: (v: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function rarityLabel(rarity: string): string {
  if (rarity === 'pokemon') return 'Pokémon';
  if (rarity === 'halloween') return 'Halloween';
  if (rarity === 'starwars') return 'Star Wars';
  if (rarity === 'legendary') return 'Legendary';
  return rarity;
}

export function SellNftModal({
  nft,
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
  isSubmitting,
  onClose,
  onConfirm,
  getSuitColor,
  getSuitSymbol,
  getRankDisplay,
}: SellNftModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const suitColor = getSuitColor(nft.suit);

  const priceStep =
    sellCategory === 'coins' ? '1' : sellCategory === 'fiat' ? '0.01' : '0.001';
  const placeholder =
    sellCategory === 'coins' ? '1000' : sellCategory === 'fiat' ? '500' : sellCrypto === 'GRAM' ? '0.5' : '0.1';

  const priceLabel =
    sellCategory === 'fiat'
      ? 'Цена (₽)'
      : sellCategory === 'coins'
        ? 'Цена (монеты)'
        : sellCrypto === 'GRAM'
          ? `Цена (${GRAM.symbol})`
          : 'Цена (SOL)';

  const needsP2P = sellCategory === 'fiat' && (sellFiatMethod === 'sbp' || sellFiatMethod === 'sberbank');

  const handleQrFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 800_000) {
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setFiatQrDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [setFiatQrDataUrl]
  );

  const pasteWallet = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setWalletAddress(text.trim());
    } catch {
      /* ignore */
    }
  }, [setWalletAddress]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Продать NFT"
      className={styles.overlay}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Продать NFT</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className={styles.preview}>
          <div className={styles.cardImg} style={{ borderColor: suitColor }}>
            {nft.image_url ? (
              <img src={nft.image_url} alt="" loading="lazy" />
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: suitColor }}>
              {getRankDisplay(nft.rank)} {getSuitSymbol(nft.suit)}
            </div>
            <div style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>{rarityLabel(nft.rarity)}</div>
            <div style={{ color: T.textMuted, fontSize: 11, marginTop: 8 }}>
              Укажите цену и реквизиты для оплаты
            </div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Способ оплаты покупателя</div>
        <div className={styles.categoryGrid}>
          {(
            [
              { id: 'coins' as const, icon: <Coins size={22} color="#fbbf24" />, label: 'Монеты' },
              { id: 'crypto' as const, icon: <Wallet size={22} color="#38bdf8" />, label: 'Крипта' },
              { id: 'fiat' as const, icon: <span style={{ fontSize: 20, fontWeight: 900, color: '#4ade80' }}>₽</span>, label: 'Рубли' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.categoryCard} ${sellCategory === cat.id ? styles.categoryCardActive : ''}`}
              onClick={() => setSellCategory(cat.id)}
            >
              <div className={styles.categoryIcon}>{cat.icon}</div>
              <div className={styles.categoryTitle}>{cat.label}</div>
            </button>
          ))}
        </div>

        {sellCategory === 'crypto' && (
          <>
            <div className={styles.sectionLabel}>Криптовалюта</div>
            <div className={styles.optionRow}>
              {CRYPTO_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.optionBtn} ${sellCrypto === c.id ? styles.optionBtnActive : ''}`}
                  onClick={() => setSellCrypto(c.id)}
                >
                  <Image src={c.icon} alt={c.label} width={28} height={28} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                {sellCrypto === 'GRAM' ? `Ваш ${GRAM.walletLabel} для получения` : 'Ваш Solana-кошелёк для получения'}
              </label>
              <div className={styles.walletRow}>
                <input
                  type="text"
                  className={styles.input}
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder={sellCrypto === 'GRAM' ? 'UQ... или EQ...' : 'Адрес Solana'}
                />
                <button type="button" className={styles.pasteBtn} onClick={() => void pasteWallet()}>
                  Вставить
                </button>
              </div>
              <p className={styles.hint}>
                Адрес увидит только покупатель при оплате — он сможет скопировать его одним нажатием.
              </p>
            </div>
          </>
        )}

        {sellCategory === 'fiat' && (
          <>
            <div className={styles.sectionLabel}>Способ оплаты</div>
            <div className={styles.optionRow}>
              {FIAT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.optionBtn} ${sellFiatMethod === f.id ? styles.optionBtnActive : ''}`}
                  onClick={() => setSellFiatMethod(f.id)}
                >
                  <span
                    className={styles.optionIcon}
                    style={{ background: f.bg, color: f.color }}
                  >
                    {f.short}
                  </span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {needsP2P && (
              <>
                <div className={styles.sectionLabel}>Куда переводить покупателю</div>
                <div className={styles.receiveTabs}>
                  <button
                    type="button"
                    className={`${styles.receiveTab} ${fiatReceiveMode === 'phone' ? styles.receiveTabActive : ''}`}
                    onClick={() => setFiatReceiveMode('phone')}
                  >
                    <Smartphone size={16} />
                    Телефон СБП
                  </button>
                  <button
                    type="button"
                    className={`${styles.receiveTab} ${fiatReceiveMode === 'qr' ? styles.receiveTabActive : ''}`}
                    onClick={() => setFiatReceiveMode('qr')}
                  >
                    <QrCode size={16} />
                    QR-код
                  </button>
                </div>

                {fiatReceiveMode === 'phone' ? (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Номер телефона для СБП</label>
                    <input
                      type="tel"
                      className={styles.input}
                      value={fiatPhone}
                      onChange={(e) => setFiatPhone(e.target.value)}
                      placeholder="+7 999 123-45-67"
                    />
                    <p className={styles.hint}>
                      Покупатель увидит номер и сумму — перевод P2P, как в играх и маркетплейсах.
                    </p>
                  </div>
                ) : (
                  <div className={styles.field}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleQrFile}
                    />
                    <div
                      className={styles.qrZone}
                      onClick={() => fileRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                    >
                      {fiatQrDataUrl ? (
                        <img src={fiatQrDataUrl} alt="QR" className={styles.qrPreview} />
                      ) : (
                        <Upload size={32} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      )}
                      <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 600 }}>
                        {fiatQrDataUrl ? 'Нажмите, чтобы заменить QR' : 'Загрузите QR из банка (СБП)'}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!needsP2P && (
              <p className={styles.hint} style={{ marginBottom: 14 }}>
                Оплата через ЮКассу — покупатель платит картой или ЮMoney, NFT передаётся после подтверждения.
              </p>
            )}
          </>
        )}

        {sellCategory === 'coins' && (
          <p className={styles.hint} style={{ marginBottom: 14 }}>
            Монеты спишутся с баланса покупателя автоматически при покупке.
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{priceLabel}</label>
          <input
            type="number"
            step={priceStep}
            className={styles.input}
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="button" className={styles.btnSubmit} onClick={onConfirm} disabled={isSubmitting}>
            <Check size={18} />
            {isSubmitting ? 'Выставляем...' : 'Выставить на продажу'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** @deprecated use SellNftModal */
export { SellNftModal as SellModal };
