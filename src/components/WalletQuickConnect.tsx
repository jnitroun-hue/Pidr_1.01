'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Loader2, Wallet2 } from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useWalletStore } from '@/store/walletStore';
import { solanaConnector } from '@/lib/wallets/solana-connector';
import { ethereumConnector } from '@/lib/wallets/ethereum-connector';
import { getApiHeaders } from '@/lib/api-headers';
import { useShallow } from 'zustand/react/shallow';
import styles from './WalletQuickConnect.module.css';

type WalletType = 'ton' | 'sol' | 'eth';

type PendingTonWallet = {
  label: string;
  appName?: string;
} | null;

const walletOptions = [
  { id: 'ton-wallet', label: 'TON Wallet', type: 'ton' as WalletType, accent: '#14b8a6', badge: 'T' },
  { id: 'tonkeeper', label: 'Tonkeeper', type: 'ton' as WalletType, accent: '#0098ea', badge: 'K' },
  { id: 'metamask', label: 'MetaMask', type: 'eth' as WalletType, accent: '#f59e0b', badge: 'M' },
  { id: 'trust', label: 'Trust Wallet', type: 'eth' as WalletType, accent: '#2563eb', badge: 'TW' },
  { id: 'phantom', label: 'Phantom', type: 'sol' as WalletType, accent: '#8b5cf6', badge: 'P' },
] as const;

type WalletQuickConnectProps = {
  className?: string;
  variant?: 'default' | 'embedded';
};

export default function WalletQuickConnect({ className = '', variant = 'default' }: WalletQuickConnectProps) {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [loadingWalletId, setLoadingWalletId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingTonWallet, setPendingTonWallet] = useState<PendingTonWallet>(null);

  const walletState = useWalletStore(
    useShallow((state) => ({
      tonAddress: state.tonAddress,
      isTonConnected: state.isTonConnected,
      solanaAddress: state.solanaAddress,
      isSolanaConnected: state.isSolanaConnected,
      ethereumAddress: state.ethereumAddress,
      isEthereumConnected: state.isEthereumConnected,
    }))
  );

  const connectedMap = useMemo(
    () => ({
      ton: Boolean(tonAddress || walletState.tonAddress || walletState.isTonConnected),
      sol: Boolean(walletState.solanaAddress || walletState.isSolanaConnected),
      eth: Boolean(walletState.ethereumAddress || walletState.isEthereumConnected),
    }),
    [tonAddress, walletState]
  );

  useEffect(() => {
    if (!pendingTonWallet || !tonAddress) return;

    const saveTonWallet = async () => {
      try {
        await persistWallet(tonAddress, 'ton');
        useWalletStore.setState({ tonAddress, isTonConnected: true });
        setStatusMessage(`${pendingTonWallet.label} подключен`);
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Не удалось сохранить TON кошелёк');
      } finally {
        setLoadingWalletId(null);
        setPendingTonWallet(null);
      }
    };

    void saveTonWallet();
  }, [pendingTonWallet, tonAddress]);

  const persistWallet = async (address: string, walletType: WalletType) => {
    const response = await fetch('/api/nft/connect-wallet', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
      body: JSON.stringify({ wallet_address: address, wallet_type: walletType }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Ошибка подключения кошелька');
    }
    window.dispatchEvent(new CustomEvent('wallet-updated'));
    return result;
  };

  const handleTonWallet = async (walletId: 'ton-wallet' | 'tonkeeper', label: string) => {
    setLoadingWalletId(walletId);
    setStatusMessage(null);
    setPendingTonWallet({ label, appName: walletId === 'ton-wallet' ? 'telegram-wallet' : 'tonkeeper' });
    try {
      const tonUi = tonConnectUI as { openSingleWalletModal?: (name: string) => Promise<void> };
      if (typeof tonUi?.openSingleWalletModal === 'function') {
        await tonUi.openSingleWalletModal(walletId === 'ton-wallet' ? 'telegram-wallet' : 'tonkeeper');
      } else {
        await tonConnectUI.openModal();
      }
    } catch (error: unknown) {
      setPendingTonWallet(null);
      setLoadingWalletId(null);
      setStatusMessage(error instanceof Error ? error.message : `Не удалось открыть ${label}`);
    }
  };

  const handlePhantom = async () => {
    setLoadingWalletId('phantom');
    setStatusMessage(null);
    try {
      const wallet = await solanaConnector.connect();
      await persistWallet(wallet.address, 'sol');
      useWalletStore.setState({
        solanaAddress: wallet.address,
        solanaBalance: wallet.balance,
        isSolanaConnected: true,
      });
      setStatusMessage('Phantom подключен');
    } catch (error: unknown) {
      if (error instanceof Error && error.message !== 'MOBILE_DEEP_LINK') {
        setStatusMessage(error.message || 'Не удалось подключить Phantom');
      } else {
        setStatusMessage('Открыт deep link в Phantom');
      }
    } finally {
      setLoadingWalletId(null);
    }
  };

  const connectInjectedEthereum = async (preferredWallet: 'metamask' | 'trust') => {
    const provider = (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
    if (!provider) {
      if (preferredWallet === 'trust') {
        const trustUrl = `https://link.trustwallet.com/open_url?url=${encodeURIComponent(window.location.href)}`;
        window.open(trustUrl, '_blank', 'noopener,noreferrer');
        throw new Error('Открыт Trust Wallet. Вернитесь после подключения.');
      }
      throw new Error('Ethereum-кошелёк не найден');
    }
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts?.[0];
    if (!address) throw new Error('Кошелёк не вернул адрес');
    const wallet = await ethereumConnector.connect();
    await persistWallet(address, 'eth');
    useWalletStore.setState({
      ethereumAddress: wallet.address,
      ethereumBalance: wallet.balance,
      ethereumNetwork: wallet.network,
      isEthereumConnected: true,
    });
  };

  const handleEthereumWallet = async (walletId: 'metamask' | 'trust', label: string) => {
    setLoadingWalletId(walletId);
    setStatusMessage(null);
    try {
      await connectInjectedEthereum(walletId);
      setStatusMessage(`${label} подключен`);
    } catch (error: unknown) {
      setStatusMessage(error instanceof Error ? error.message : `Не удалось подключить ${label}`);
    } finally {
      setLoadingWalletId(null);
    }
  };

  const onWalletClick = (wallet: (typeof walletOptions)[number]) => {
    if (wallet.id === 'ton-wallet' || wallet.id === 'tonkeeper') {
      void handleTonWallet(wallet.id, wallet.label);
      return;
    }
    if (wallet.id === 'phantom') {
      void handlePhantom();
      return;
    }
    void handleEthereumWallet(wallet.id, wallet.label);
  };

  const rootClass = `${styles.root} ${variant === 'embedded' ? styles.rootEmbedded : ''} ${className}`.trim();

  return (
    <div className={rootClass}>
      {variant === 'default' && (
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Quick Connect</p>
            <h2 className={styles.title}>Подключить кошелёк</h2>
            <p className={styles.subtitle}>TON, Ethereum и Solana — одним нажатием.</p>
          </div>
          <div className={styles.headerIcon}>
            <Wallet2 size={18} />
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {walletOptions.map((wallet) => {
          const isLoading = loadingWalletId === wallet.id;
          const isConnected = connectedMap[wallet.type];
          const networkLabel =
            wallet.type === 'ton' ? 'TON Connect' : wallet.type === 'eth' ? 'EVM · Ethereum' : 'Solana';

          return (
            <button
              key={wallet.id}
              type="button"
              onClick={() => onWalletClick(wallet)}
              className={`${styles.walletBtn} ${isConnected ? styles.walletBtnConnected : ''}`}
              style={
                isConnected
                  ? {
                      borderColor: `${wallet.accent}88`,
                      background: `linear-gradient(135deg, ${wallet.accent}20 0%, rgba(15,23,42,0.9) 100%)`,
                    }
                  : undefined
              }
            >
              <div className={styles.walletBtnInner}>
                <div className={styles.walletMeta}>
                  <div className={styles.walletLabel}>{wallet.label}</div>
                  <div className={styles.walletType}>{networkLabel}</div>
                </div>
                <div
                  className={styles.walletBadge}
                  style={{ background: `linear-gradient(135deg, ${wallet.accent}, ${wallet.accent}cc)` }}
                >
                  {isLoading ? <Loader2 size={16} className={styles.spin} /> : isConnected ? <CheckCircle2 size={18} /> : wallet.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`${styles.statusBar} ${statusMessage && statusMessage.includes('подключен') ? styles.statusBarActive : ''}`}>
        {statusMessage || 'После подключения кошелёк сохраняется в профиле и доступен для оплат.'}
      </div>
    </div>
  );
}
