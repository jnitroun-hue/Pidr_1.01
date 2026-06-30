'use client'
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaCoins, FaPlus, FaGift, FaShoppingCart, FaStar,
  FaTelegram, FaShareAlt, FaWallet, FaCopy, FaCheckCircle,
  FaExchangeAlt, FaArrowUp, FaArrowDown, FaHistory, FaQrcode,
  FaChevronRight, FaFire
} from 'react-icons/fa';
import GameWallet from '@/components/GameWallet';
import WalletQuickConnect from '@/components/WalletQuickConnect';
import { useLanguage } from '@/components/LanguageSwitcher';
import { useTranslations } from '@/lib/i18n/translations';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { GRAM } from '@/lib/crypto/gram-brand';
import CryptoIcon from '@/components/CryptoIcon';
import { getCryptoToken } from '@/lib/crypto/crypto-assets';

// ─── Типы ───────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  type: string;
  transaction_type?: string;
  amount: number;
  description: string;
  created_at: string;
  status?: string;
}

// ─── Иконка транзакции ───────────────────────────────────────────────────────
function TxIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bonus') || t.includes('gift') || t.includes('reward'))
    return <FaGift className="text-yellow-400" />;
  if (t.includes('win') || t.includes('game'))
    return <FaStar className="text-yellow-400" />;
  if (t.includes('purchase') || t.includes('buy') || t.includes('shop'))
    return <FaShoppingCart className="text-red-400" />;
  if (t.includes('deposit') || t.includes('ton') || t.includes('crypto') || t.includes('gram'))
    return <CryptoIcon src={getCryptoToken('TON').icon} size={16} alt="Gram" />;
  if (t.includes('referral') || t.includes('invite'))
    return <FaShareAlt className="text-green-400" />;
  return <FaExchangeAlt className="text-gray-400" />;
}

function isIncome(type: string, amount: number): boolean {
  const t = (type || '').toLowerCase();
  if (t.includes('purchase') || t.includes('buy') || t.includes('loss') || t.includes('withdraw')) return false;
  if (amount < 0) return false;
  return true;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} дн назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

// ─── Главная страница ────────────────────────────────────────────────────────
export default function WalletPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [coins, setCoins] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');
  const [tonAmount, setTonAmount] = useState('1.0');
  const [masterAddress, setMasterAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Курс: formatGramRate() — 1 Gram = 1000 монет
  const GRAM_RATE = GRAM.coinsPerGram;
  const coinsForAmount = Math.floor(parseFloat(tonAmount || '0') * GRAM_RATE) || 0;

  // ─── Загрузка данных ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { getApiHeaders } = await import('@/lib/api-headers');
      const headers = getApiHeaders() as Record<string, string>;
      const [meRes, txRes, payRes] = await Promise.allSettled([
        fetch('/api/user/me', { credentials: 'include', headers }),
        fetch('/api/wallet/transactions?limit=20', { credentials: 'include', headers }),
        fetch('/api/wallet/ton/payment-info', { credentials: 'include', headers }),
      ]);

      if (meRes.status === 'fulfilled' && meRes.value.ok) {
        const d = await meRes.value.json();
        if (d.success) setCoins(d.user?.coins ?? 0);
      }

      if (txRes.status === 'fulfilled' && txRes.value.ok) {
        const d = await txRes.value.json();
        if (d.success) setTransactions(d.transactions || []);
      }

      if (payRes.status === 'fulfilled' && payRes.value.ok) {
        const d = await payRes.value.json();
        if (d.success && d.data?.address) setMasterAddress(d.data.address);
      }
    } catch (e) {
      console.error('Ошибка загрузки кошелька:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const copyAddress = async () => {
    if (!masterAddress) return;
    await navigator.clipboard.writeText(masterAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const QUICK_AMOUNTS = [1, 5, 10, 25];

  if (loading) {
    return (
      <PageLoadingScreen
        title={t.wallet.pageTitle}
        subtitle={t.wallet.pageLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#050816_0%,_#0b1220_45%,_#09111d_100%)] pb-16">
      <div className="max-w-md mx-auto px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 mb-4 rounded-2xl border border-white/10 bg-[#0b1220]/85 px-4 py-3 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-yellow-400/30 hover:text-yellow-300"
            >
              <FaArrowLeft />
              <span>{t.common.back}</span>
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">{t.wallet.pageEyebrow}</p>
              <h1 className="text-lg font-black text-white">{t.wallet.pageTitle}</h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <FaWallet />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <WalletQuickConnect />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          <GameWallet hideInlineQuickConnect />
        </motion.div>
      </div>
    </div>
  );
}
