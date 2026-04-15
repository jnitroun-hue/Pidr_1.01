'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Link2, Loader2, Wallet2 } from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useWalletStore } from '@/store/walletStore';
import { solanaConnector } from '@/lib/wallets/solana-connector';
import { ethereumConnector } from '@/lib/wallets/ethereum-connector';

type WalletType = 'ton' | 'sol' | 'eth';

type PendingTonWallet = {
  label: string;
  appName?: string;
} | null;

const walletOptions = [
  { id: 'ton-wallet', label: 'TON Wallet', type: 'ton' as WalletType, accent: '#14b8a6' },
  { id: 'tonkeeper', label: 'Tonkeeper', type: 'ton' as WalletType, accent: '#0098ea' },
  { id: 'metamask', label: 'MetaMask', type: 'eth' as WalletType, accent: '#f59e0b' },
  { id: 'trust', label: 'Trust Wallet', type: 'eth' as WalletType, accent: '#2563eb' },
  { id: 'phantom', label: 'Phantom', type: 'sol' as WalletType, accent: '#8b5cf6' },
] as const;

export default function WalletQuickConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [loadingWalletId, setLoadingWalletId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingTonWallet, setPendingTonWallet] = useState<PendingTonWallet>(null);

  const walletState = useWalletStore((state) => ({
    tonAddress: state.tonAddress,
    isTonConnected: state.isTonConnected,
    solanaAddress: state.solanaAddress,
    isSolanaConnected: state.isSolanaConnected,
    ethereumAddress: state.ethereumAddress,
    isEthereumConnected: state.isEthereumConnected,
  }));

  const connectedMap = useMemo(() => ({
    ton: Boolean(tonAddress || walletState.tonAddress || walletState.isTonConnected),
    sol: Boolean(walletState.solanaAddress || walletState.isSolanaConnected),
    eth: Boolean(walletState.ethereumAddress || walletState.isEthereumConnected),
  }), [tonAddress, walletState]);

  useEffect(() => {
    if (!pendingTonWallet || !tonAddress) return;

    const saveTonWallet = async () => {
      try {
        await persistWallet(tonAddress, 'ton');
        useWalletStore.setState({
          tonAddress,
          isTonConnected: true,
        });
        setStatusMessage(`${pendingTonWallet.label} подключен`);
      } catch (error: any) {
        setStatusMessage(error?.message || 'Не удалось сохранить TON кошелёк');
      } finally {
        setLoadingWalletId(null);
        setPendingTonWallet(null);
      }
    };

    saveTonWallet();
  }, [pendingTonWallet, tonAddress]);

  const persistWallet = async (address: string, walletType: WalletType) => {
    const response = await fetch('/api/nft/connect-wallet', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: address,
        wallet_type: walletType,
      }),
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
      const tonUi = tonConnectUI as any;
      if (typeof tonUi?.openSingleWalletModal === 'function') {
        await tonUi.openSingleWalletModal(walletId === 'ton-wallet' ? 'telegram-wallet' : 'tonkeeper');
      } else {
        await tonConnectUI.openModal();
      }
    } catch (error: any) {
      setPendingTonWallet(null);
      setLoadingWalletId(null);
      setStatusMessage(error?.message || `Не удалось открыть ${label}`);
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
    } catch (error: any) {
      if (error?.message !== 'MOBILE_DEEP_LINK') {
        setStatusMessage(error?.message || 'Не удалось подключить Phantom');
      } else {
        setStatusMessage('Открыт deep link в Phantom');
      }
    } finally {
      setLoadingWalletId(null);
    }
  };

  const connectInjectedEthereum = async (preferredWallet: 'metamask' | 'trust') => {
    const provider = (window as any).ethereum;

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

    if (!address) {
      throw new Error('Кошелёк не вернул адрес');
    }

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
    } catch (error: any) {
      setStatusMessage(error?.message || `Не удалось подключить ${label}`);
    } finally {
      setLoadingWalletId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-[28px] border border-cyan-400/15 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">Quick Connect</p>
          <h2 className="mt-1 text-lg font-black text-white">Подключить кошелёк</h2>
          <p className="mt-1 text-sm text-slate-400">
            Быстрый выбор основных кошельков для TON, Ethereum и Solana.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <Wallet2 size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {walletOptions.map((wallet) => {
          const isLoading = loadingWalletId === wallet.id;
          const isConnected = connectedMap[wallet.type];

          return (
            <button
              key={wallet.id}
              type="button"
              onClick={() => {
                if (wallet.id === 'ton-wallet' || wallet.id === 'tonkeeper') {
                  void handleTonWallet(wallet.id, wallet.label);
                  return;
                }

                if (wallet.id === 'phantom') {
                  void handlePhantom();
                  return;
                }

                void handleEthereumWallet(wallet.id, wallet.label);
              }}
              className="group rounded-2xl border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: isConnected ? `${wallet.accent}80` : 'rgba(148, 163, 184, 0.18)',
                background: isConnected
                  ? `linear-gradient(135deg, ${wallet.accent}18 0%, rgba(15,23,42,0.82) 100%)`
                  : 'linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(30,41,59,0.72) 100%)',
                boxShadow: isConnected ? `0 12px 30px ${wallet.accent}22` : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white">{wallet.label}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {wallet.type === 'ton' ? 'TON Connect' : wallet.type === 'eth' ? 'EVM wallet' : 'Solana'}
                  </div>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                ) : isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Link2 className="h-4 w-4 text-slate-500 transition-colors group-hover:text-cyan-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
        {statusMessage || 'После подключения кошелёк автоматически сохраняется и появляется в платёжных списках.'}
      </div>
    </motion.div>
  );
}
