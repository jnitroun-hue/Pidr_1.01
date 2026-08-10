'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCopy, FaExternalLinkAlt, FaShieldAlt } from 'react-icons/fa';
import CryptoIcon from './CryptoIcon';
import PidrCoinIcon from './PidrCoinIcon';
import { DEPOSIT_CAPABILITIES, depositCryptoOptions, getCryptoToken } from '@/lib/crypto/crypto-assets';
import { cryptoDisplaySymbol } from '@/lib/crypto/crypto-assets';
import styles from './WalletFlowModal.module.css';

type ModalType = 'deposit' | 'withdraw';
type DepositMethod = 'crypto' | 'rub';
type WithdrawMethod = 'crypto' | 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp';

type Withdrawal = {
  id: string;
  amount_coins: number;
  method: string;
  asset?: string | null;
  status: string;
  created_at: string;
};

type Props = {
  type: ModalType;
  loading: boolean;
  balance: number;
  coinsPerRub: number;
  selectedCrypto: string;
  setSelectedCrypto: (coin: string) => void;
  depositMethod: DepositMethod;
  setDepositMethod: (method: DepositMethod) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  depositCoins: number;
  rateLine?: string | null;
  rateUpdatedAt?: string;
  depositAddress: string;
  depositMemo?: string;
  depositAddressError?: string;
  walletPayEnabled: boolean;
  inTelegram: boolean;
  onCryptoDeposit: () => void;
  onCopyDeposit: () => void;
  onOpenExternal: () => void;
  rubAmount: string;
  setRubAmount: (amount: string) => void;
  onRubDeposit: () => void;
  withdrawMethod: WithdrawMethod;
  setWithdrawMethod: (method: WithdrawMethod) => void;
  withdrawDestination: string;
  setWithdrawDestination: (destination: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  onWithdraw: () => Promise<void>;
  onBalanceChange: (balance: number) => void;
  onClose: () => void;
};

const OPTIONS = depositCryptoOptions();
const FIAT_METHODS: Array<{ id: Exclude<WithdrawMethod, 'crypto'>; label: string }> = [
  { id: 'bank_card', label: 'Банковская карта' },
  { id: 'sbp', label: 'СБП' },
  { id: 'sberbank', label: 'СберПей' },
  { id: 'yoo_money', label: 'ЮMoney' },
];

function quickAmounts(coin: string): string[] {
  if (coin === 'TON') return ['0.5', '1', '5', '10'];
  if (coin === 'SOL') return ['0.1', '0.5', '1', '5'];
  if (coin === 'TRX' || coin === 'USDT') return ['10', '50', '100', '500'];
  if (coin === 'BTC') return ['0.001', '0.005', '0.01', '0.05'];
  return ['0.01', '0.05', '0.1', '0.5'];
}

export default function WalletFlowModal(props: Props) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [cancelling, setCancelling] = useState('');
  const capability = DEPOSIT_CAPABILITIES[props.selectedCrypto as keyof typeof DEPOSIT_CAPABILITIES];
  const token = getCryptoToken(props.selectedCrypto);
  const cryptoLabel = cryptoDisplaySymbol(props.selectedCrypto);
  const canUseWalletPay = Boolean(capability?.walletPay && props.walletPayEnabled && props.inTelegram);
  const canSubmitCrypto = props.selectedCrypto === 'TON' || canUseWalletPay;
  const canOpenExternal = Boolean(capability?.externalWallet && props.depositAddress);
  const validDepositAmount = Number(props.depositAmount) > 0;

  const loadWithdrawals = useCallback(async () => {
    if (props.type !== 'withdraw') return;
    try {
      const { getApiHeaders } = await import('@/lib/api-headers');
      const response = await fetch('/api/wallet/withdrawals', {
        credentials: 'include',
        cache: 'no-store',
        headers: getApiHeaders() as Record<string, string>,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'История недоступна');
      setWithdrawals(data.withdrawals || []);
      setHistoryError('');
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'История недоступна');
    }
  }, [props.type]);

  useEffect(() => { void loadWithdrawals(); }, [loadWithdrawals]);

  const cancelWithdrawal = async (id: string) => {
    setCancelling(id);
    try {
      const { getApiHeaders } = await import('@/lib/api-headers');
      const response = await fetch('/api/wallet/withdrawals', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Не удалось отменить заявку');
      props.onBalanceChange(Number(data.newBalance));
      await loadWithdrawals();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Не удалось отменить заявку');
    } finally {
      setCancelling('');
    }
  };

  const submitWithdrawal = async () => {
    await props.onWithdraw();
    await loadWithdrawals();
  };

  const withdrawPreview = useMemo(
    () => Math.floor(Number(props.withdrawAmount || 0) / props.coinsPerRub),
    [props.withdrawAmount, props.coinsPerRub]
  );

  return (
    <div className={styles.overlay} onMouseDown={props.onClose}>
      <section className={styles.sheet} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Безопасная операция</div>
            <h2 className={styles.title}>{props.type === 'deposit' ? 'Пополнение' : 'Вывод средств'}</h2>
          </div>
          <button type="button" className={styles.close} onClick={props.onClose} aria-label="Закрыть">×</button>
        </header>

        <div className={styles.body}>
          <div className={styles.steps}>
            <div className={`${styles.step} ${styles.stepActive}`}>1 · Способ</div>
            <div className={`${styles.step} ${styles.stepActive}`}>2 · Реквизиты</div>
            <div className={styles.step}>3 · Подтверждение</div>
          </div>

          {props.type === 'deposit' ? (
            <>
              <div className={styles.segmented}>
                <button type="button" className={`${styles.segment} ${props.depositMethod === 'rub' ? styles.segmentActive : ''}`} onClick={() => props.setDepositMethod('rub')}>Карта / СБП</button>
                <button type="button" className={`${styles.segment} ${props.depositMethod === 'crypto' ? styles.segmentActive : ''}`} onClick={() => props.setDepositMethod('crypto')}>Криптовалюта</button>
              </div>

              {props.depositMethod === 'rub' ? (
                <>
                  <div className={styles.section}>
                    <span className={styles.label}>Сумма</span>
                    <div className={styles.amountRow}>
                      <input className={styles.input} type="number" min="100" step="50" value={props.rubAmount} onChange={(e) => props.setRubAmount(e.target.value)} placeholder="От 100" />
                      <span className={styles.unit}>₽</span>
                    </div>
                    <div className={styles.presets}>
                      {['100', '300', '500', '1000'].map((amount) => <button key={amount} type="button" className={styles.preset} onClick={() => props.setRubAmount(amount)}>{amount} ₽</button>)}
                    </div>
                  </div>
                  <div className={styles.summary}>
                    <span className={styles.muted}>Будет зачислено после подтверждения YooKassa</span>
                    <strong>{Math.floor(Number(props.rubAmount || 0) * props.coinsPerRub).toLocaleString('ru-RU')} монет</strong>
                  </div>
                  <button type="button" className={styles.primary} disabled={props.loading || Number(props.rubAmount) < 100} onClick={props.onRubDeposit}>
                    {props.loading ? 'Создаём платёж…' : 'Перейти к защищённой оплате'}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Выберите актив и проверьте сеть</h3>
                    <div className={styles.tokenGrid}>
                      {OPTIONS.map((option) => (
                        <button key={option.id} type="button" className={`${styles.token} ${props.selectedCrypto === option.id ? styles.tokenActive : ''}`} onClick={() => props.setSelectedCrypto(option.id)}>
                          <CryptoIcon src={option.icon} size={22} alt="" /> {option.name}
                        </button>
                      ))}
                    </div>
                    <div className={styles.networkRow}><strong>{capability?.network || cryptoLabel}</strong><span>{capability?.eta}</span></div>
                    <div className={styles.rate}>{props.rateLine || 'Курс временно недоступен'}</div>
                    {props.rateUpdatedAt && <div className={styles.muted}>Курс: {props.rateUpdatedAt}</div>}
                  </div>

                  <div className={styles.section}>
                    <span className={styles.label}>Сумма {cryptoLabel}</span>
                    <div className={styles.amountRow}>
                      <input className={styles.input} type="number" min="0" step="any" value={props.depositAmount} onChange={(e) => props.setDepositAmount(e.target.value)} placeholder="0" />
                      <span className={styles.unit}>{cryptoLabel}</span>
                    </div>
                    <div className={styles.presets}>
                      {quickAmounts(props.selectedCrypto).map((amount) => <button key={amount} type="button" className={styles.preset} onClick={() => props.setDepositAmount(amount)}>{amount}</button>)}
                    </div>
                  </div>

                  <div className={styles.summary}>
                    <span className={styles.muted}>После проверенного платежа</span>
                    <strong><PidrCoinIcon size={18} alt="" /> {props.depositCoins.toLocaleString('ru-RU')}</strong>
                  </div>

                  <div className={styles.section}>
                    <span className={styles.label}>Адрес · {capability?.network}</span>
                    <div className={styles.address}>{props.depositAddress || props.depositAddressError || 'Адрес не настроен'}</div>
                    {props.depositMemo && <div className={styles.address}>Memo: {props.depositMemo}</div>}
                    <div className={styles.addressActions}>
                      <button type="button" className={styles.secondary} disabled={!props.depositAddress} onClick={props.onCopyDeposit}><FaCopy /> Копировать</button>
                      <button type="button" className={styles.secondary} disabled={!canOpenExternal || !validDepositAmount} onClick={props.onOpenExternal}><FaExternalLinkAlt /> В кошелёк сети</button>
                    </div>
                  </div>

                  {capability?.warning && <div className={styles.warning}>{capability.warning}</div>}
                  {!canSubmitCrypto && (
                    <div className={styles.warning}>
                      Автоматическое зачисление {cryptoLabel} не включено. Адрес показан для прозрачности, но отправлять средства до включения серверной проверки не следует.
                    </div>
                  )}
                  {canUseWalletPay && <div className={styles.notice}>Telegram Wallet создаст отдельный проверяемый заказ в {cryptoLabel}. Зачисление выполняется только после подписанного webhook со статусом PAID.</div>}
                  {props.selectedCrypto === 'TON' && <div className={styles.notice}><FaShieldAlt /> Для TON создаётся уникальный intent с точной суммой и memo. Возврат в приложение безопасен: платёж можно проверить повторно.</div>}
                  {canSubmitCrypto && (
                    <button type="button" className={styles.primary} disabled={props.loading || !validDepositAmount || !props.depositAddress} onClick={props.onCryptoDeposit}>
                      {props.loading ? 'Подготавливаем…' : props.selectedCrypto === 'TON' ? 'Подтвердить в TON-кошельке' : 'Открыть Telegram Wallet Pay'}
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className={styles.segmented}>
                <button type="button" className={`${styles.segment} ${props.withdrawMethod === 'crypto' ? styles.segmentActive : ''}`} onClick={() => props.setWithdrawMethod('crypto')}>Криптовалюта</button>
                <button type="button" className={`${styles.segment} ${props.withdrawMethod !== 'crypto' ? styles.segmentActive : ''}`} onClick={() => props.setWithdrawMethod('bank_card')}>Рубли</button>
              </div>
              {props.withdrawMethod === 'crypto' ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Актив и сеть выплаты</h3>
                  <div className={styles.tokenGrid}>
                    {OPTIONS.map((option) => <button key={option.id} type="button" className={`${styles.token} ${props.selectedCrypto === option.id ? styles.tokenActive : ''}`} onClick={() => props.setSelectedCrypto(option.id)}><CryptoIcon src={option.icon} size={22} alt="" />{option.name}</button>)}
                  </div>
                  <div className={styles.networkRow}><strong>{capability?.network}</strong><span>Проверка вручную</span></div>
                </div>
              ) : (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Способ выплаты</h3>
                  <div className={styles.tokenGrid}>
                    {FIAT_METHODS.map((method) => <button key={method.id} type="button" className={`${styles.token} ${props.withdrawMethod === method.id ? styles.tokenActive : ''}`} onClick={() => props.setWithdrawMethod(method.id)}>{method.label}</button>)}
                  </div>
                </div>
              )}
              <div className={styles.section}>
                <span className={styles.label}>{props.withdrawMethod === 'crypto' ? `Адрес ${capability?.network}` : 'Реквизиты получателя'}</span>
                <input className={styles.input} value={props.withdrawDestination} onChange={(e) => props.setWithdrawDestination(e.target.value)} placeholder={props.withdrawMethod === 'crypto' ? `Адрес ${cryptoLabel}` : 'Карта, телефон или кошелёк'} />
                <span className={styles.label}>Сумма в игровых монетах</span>
                <div className={styles.amountRow}>
                  <input className={styles.input} type="number" min="100" step="1" value={props.withdrawAmount} onChange={(e) => props.setWithdrawAmount(e.target.value)} placeholder="От 100" />
                  <span className={styles.unit}>монет</span>
                </div>
                <div className={styles.presets}>
                  {[.25, .5, .75, 1].map((part) => <button key={part} type="button" className={styles.preset} onClick={() => props.setWithdrawAmount(String(Math.floor(props.balance * part)))}>{part * 100}%</button>)}
                </div>
              </div>
              <div className={styles.summary}><span className={styles.muted}>Резервируется в заявке</span><strong>{withdrawPreview.toLocaleString('ru-RU')} ₽</strong></div>
              <div className={styles.warning}>Проверьте сеть и реквизиты. Сумма резервируется атомарно; заявку можно отменить только пока она в статусе «pending».</div>
              <button type="button" className={styles.primary} disabled={props.loading || Number(props.withdrawAmount) < 100 || !props.withdrawDestination.trim()} onClick={() => void submitWithdrawal()}>
                {props.loading ? 'Создаём заявку…' : 'Создать заявку на вывод'}
              </button>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Последние заявки и восстановление</h3>
                {historyError && <div className={styles.error}>{historyError}</div>}
                <div className={styles.history}>
                  {withdrawals.length === 0 && !historyError && <div className={styles.muted}>Заявок пока нет.</div>}
                  {withdrawals.slice(0, 5).map((item) => (
                    <div key={item.id} className={styles.historyItem}>
                      <div><strong>{Number(item.amount_coins).toLocaleString('ru-RU')} монет · {item.asset || item.method}</strong><div className={styles.muted}>{new Date(item.created_at).toLocaleString('ru-RU')}</div></div>
                      <div><div className={styles.status}>{item.status}</div>{item.status === 'pending' && <button type="button" className={styles.danger} disabled={cancelling === item.id} onClick={() => void cancelWithdrawal(item.id)}>Отменить</button>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
