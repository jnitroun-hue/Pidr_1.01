'use client'
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaCoins, FaPlus, FaGift, FaShoppingCart, FaStar,
  FaTelegram, FaShareAlt, FaWallet, FaCopy, FaCheckCircle,
  FaExchangeAlt, FaArrowUp, FaArrowDown, FaHistory, FaQrcode,
  FaChevronRight, FaFire
} from 'react-icons/fa';
import { SiTon } from 'react-icons/si';

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
  if (t.includes('deposit') || t.includes('ton') || t.includes('crypto'))
    return <SiTon className="text-blue-400" />;
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
  const [coins, setCoins] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');
  const [tonAmount, setTonAmount] = useState('1.0');
  const [masterAddress, setMasterAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Курс: 1 TON = 1000 монет
  const TON_RATE = 1000;
  const coinsForAmount = Math.floor(parseFloat(tonAmount || '0') * TON_RATE) || 0;

  // ─── Загрузка данных ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [meRes, txRes, payRes] = await Promise.allSettled([
        fetch('/api/user/me', { credentials: 'include' }),
        fetch('/api/wallet/transactions?limit=20', { credentials: 'include' }),
        fetch('/api/wallet/ton/payment-info', { credentials: 'include' }),
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

      // Fallback: берём адрес из env через публичный API
      if (!masterAddress) {
        setMasterAddress(process.env.NEXT_PUBLIC_MASTER_TON_ADDRESS || '');
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
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#111827] to-[#0d1b2a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Загрузка кошелька...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#111827] to-[#0d1b2a] pb-24">
      <div className="max-w-md mx-auto px-4">

        {/* ── Шапка ── */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-20 bg-gradient-to-b from-[#0a0f1e] to-transparent">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <FaArrowLeft />
            <span className="text-sm">Назад</span>
          </button>
          <h1 className="text-xl font-bold text-yellow-400">💰 Кошелёк</h1>
          <div className="w-16" />
        </div>

        {/* ── Баланс ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-5"
          style={{ background: 'linear-gradient(135deg, #1a2744 0%, #0f1e3d 50%, #1a2744 100%)' }}
        >
          {/* Декоративные круги */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #ffd700, transparent)' }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

          <div className="relative p-6 text-center">
            <p className="text-gray-400 text-sm mb-1 uppercase tracking-widest">Игровой баланс</p>
            <div className="flex items-center justify-center gap-3 mb-1">
              <FaCoins className="text-yellow-400 text-3xl" />
              <span className="text-5xl font-black text-white">
                {coins !== null ? coins.toLocaleString('ru-RU') : '—'}
              </span>
            </div>
            <p className="text-yellow-400/70 text-sm">монет</p>

            {/* Мини-статистика */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-green-400 text-xs font-semibold">Пополнено</p>
                <p className="text-white text-sm font-bold">
                  +{transactions.filter(t => isIncome(t.transaction_type || t.type, t.amount))
                    .reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-red-400 text-xs font-semibold">Потрачено</p>
                <p className="text-white text-sm font-bold">
                  -{transactions.filter(t => !isIncome(t.transaction_type || t.type, t.amount))
                    .reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString('ru-RU')}
                </p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <p className="text-blue-400 text-xs font-semibold">Транзакций</p>
                <p className="text-white text-sm font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Табы ── */}
        <div className="flex bg-[#111827] rounded-2xl p-1 mb-5 gap-1">
          {[
            { key: 'topup', label: 'Пополнить', icon: <FaPlus /> },
            { key: 'history', label: 'История', icon: <FaHistory /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-yellow-400 text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════════ ТАБ: ПОПОЛНИТЬ ══════════════ */}
          {activeTab === 'topup' && (
            <motion.div
              key="topup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >

              {/* Пополнение через TON */}
              <div className="bg-[#111827] rounded-3xl overflow-hidden border border-blue-500/20">
                {/* Заголовок блока */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5"
                  style={{ background: 'linear-gradient(90deg, #0f2044, #111827)' }}>
                  <div className="w-10 h-10 rounded-2xl bg-[#0098EA] flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <SiTon className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Пополнение через TON</p>
                    <p className="text-blue-400 text-xs">1 TON = 1 000 монет</p>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-semibold">
                      Мгновенно
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">

                  {/* Адрес кошелька */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">
                      🔒 Адрес для пополнения
                    </p>
                    <div className="bg-[#0d1117] rounded-2xl p-3 border border-white/10">
                      <p className="text-white/80 text-xs font-mono break-all leading-relaxed mb-3">
                        {masterAddress || 'Загрузка адреса...'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={copyAddress}
                          disabled={!masterAddress}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            copied
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 active:scale-95'
                          }`}
                        >
                          {copied ? <><FaCheckCircle /> Скопировано!</> : <><FaCopy /> Копировать адрес</>}
                        </button>
                        <button
                          onClick={() => setShowQR(!showQR)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-all"
                        >
                          <FaQrcode />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Калькулятор суммы */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">
                      💎 Сумма для пополнения
                    </p>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          value={tonAmount}
                          onChange={e => setTonAmount(e.target.value)}
                          min="0.1"
                          step="0.1"
                          className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
                          placeholder="1.0"
                        />
                      </div>
                      <div className="bg-[#0098EA]/20 border border-[#0098EA]/30 rounded-xl px-4 flex items-center">
                        <span className="text-[#0098EA] font-bold text-sm">TON</span>
                      </div>
                    </div>

                    {/* Быстрые суммы */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {QUICK_AMOUNTS.map(a => (
                        <button
                          key={a}
                          onClick={() => setTonAmount(String(a))}
                          className={`py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            parseFloat(tonAmount) === a
                              ? 'bg-[#0098EA] text-white shadow-lg shadow-blue-500/30'
                              : 'bg-[#0d1117] text-gray-400 border border-white/10 hover:border-blue-500/30 hover:text-white'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>

                    {/* Итог */}
                    {coinsForAmount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-between bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3"
                      >
                        <span className="text-gray-400 text-sm">Вы получите:</span>
                        <div className="flex items-center gap-2">
                          <FaCoins className="text-yellow-400" />
                          <span className="text-yellow-400 font-black text-lg">
                            +{coinsForAmount.toLocaleString('ru-RU')}
                          </span>
                          <span className="text-yellow-400/60 text-sm">монет</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Инструкция */}
                  <div className="bg-[#0d1117] rounded-2xl p-4 border border-white/5">
                    <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                      📋 Как пополнить
                    </p>
                    <ol className="space-y-1.5">
                      {[
                        'Скопируйте адрес кошелька выше',
                        'Откройте ваш TON кошелёк (Tonkeeper, @wallet и др.)',
                        'Отправьте TON на скопированный адрес',
                        'Монеты зачислятся автоматически за 1–2 мин',
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Другие способы пополнения */}
              <div className="bg-[#111827] rounded-3xl p-5 border border-white/5">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-4">
                  🎁 Другие способы получить монеты
                </p>
                <div className="space-y-3">

                  {/* Ежедневный бонус */}
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="w-full flex items-center gap-4 bg-[#0d1117] rounded-2xl p-4 border border-white/5 hover:border-yellow-400/30 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <FaFire className="text-white text-lg" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-sm">Ежедневный бонус</p>
                      <p className="text-gray-400 text-xs">До +200 монет каждый день</p>
                    </div>
                    <FaChevronRight className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
                  </button>

                  {/* Пригласить друга */}
                  <button
                    onClick={() => {
                      const tg = (window as any).Telegram?.WebApp;
                      if (tg) tg.openTelegramLink('https://t.me/share/url?url=https://t.me/NotPidrBot');
                    }}
                    className="w-full flex items-center gap-4 bg-[#0d1117] rounded-2xl p-4 border border-white/5 hover:border-blue-400/30 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <FaTelegram className="text-white text-lg" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-sm">Пригласить друга</p>
                      <p className="text-gray-400 text-xs">+100 монет за каждого друга</p>
                    </div>
                    <FaChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </button>

                  {/* Победа в игре */}
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full flex items-center gap-4 bg-[#0d1117] rounded-2xl p-4 border border-white/5 hover:border-green-400/30 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <FaStar className="text-white text-lg" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-sm">Победа в игре</p>
                      <p className="text-gray-400 text-xs">Зарабатывай монеты в матчах</p>
                    </div>
                    <FaChevronRight className="text-gray-600 group-hover:text-green-400 transition-colors" />
                  </button>

                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ ТАБ: ИСТОРИЯ ══════════════ */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-[#111827] rounded-3xl overflow-hidden border border-white/5">
                <div className="px-5 py-4 border-b border-white/5">
                  <p className="text-white font-bold">История транзакций</p>
                  <p className="text-gray-500 text-xs mt-0.5">Последние {transactions.length} операций</p>
                </div>

                {transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <FaHistory className="text-gray-700 text-4xl mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Транзакций пока нет</p>
                    <p className="text-gray-600 text-xs mt-1">Пополните кошелёк или сыграйте в игру</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {transactions.map((tx, i) => {
                      const type = tx.transaction_type || tx.type || '';
                      const income = isIncome(type, tx.amount);
                      return (
                        <motion.div
                          key={tx.id || i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors"
                        >
                          {/* Иконка */}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            income ? 'bg-green-500/15' : 'bg-red-500/15'
                          }`}>
                            <TxIcon type={type} />
                          </div>

                          {/* Описание */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                              {tx.description || type || 'Транзакция'}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {timeAgo(tx.created_at)}
                            </p>
                          </div>

                          {/* Сумма */}
                          <div className="text-right flex-shrink-0">
                            <div className={`flex items-center gap-1 font-bold text-sm ${
                              income ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {income ? <FaArrowDown className="text-xs" /> : <FaArrowUp className="text-xs" />}
                              {income ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('ru-RU')}
                              <FaCoins className="text-yellow-400 text-xs" />
                            </div>
                            {tx.status && tx.status !== 'completed' && (
                              <span className="text-xs text-yellow-500">{tx.status}</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
