'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Eye, EyeOff, Download, AlertTriangle } from 'lucide-react';

export default function GenerateXPUBsPage() {
  const [mnemonic, setMnemonic] = useState('');
  const [xpubs, setXpubs] = useState<{[key: string]: string}>({});
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Демо XPUB ключи для разработки
  const generateDemoXPUBs = () => {
    setIsGenerating(true);
    
    // Симулируем генерацию
    setTimeout(() => {
      const demoMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
      const demoXPUBs = {
        BTC: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPiGAGycHC6GUdvNzqcqXXX",
        ETH: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPiGAGycHC6GUdvNzqcqYYY",
        TON: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPiGAGycHC6GUdvNzqcqZZZ",
        SOL: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPiGAGycHC6GUdvNzqcqAAA",
        TRC20: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPiGAGycHC6GUdvNzqcqBBB"
      };

      setMnemonic(demoMnemonic);
      setXpubs(demoXPUBs);
      setIsGenerating(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadEnvFile = () => {
    const envContent = Object.entries(xpubs)
      .map(([symbol, xpub]) => `${symbol}_MASTER_XPUB=${xpub}`)
      .join('\n');

    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hd-wallet-xpubs.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              🔐 HD Wallet XPUB Generator
            </h1>
            <p className="text-gray-300">
              Генератор Master XPUB ключей для HD кошельков
            </p>
          </div>

          {/* Предупреждение */}
          <motion.div
            className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-400 font-semibold mb-2">⚠️ ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ</h3>
                <ul className="text-yellow-200 text-sm space-y-1">
                  <li>• Это демо-инструмент для разработки</li>
                  <li>• Для продакшена используйте безопасные методы генерации</li>
                  <li>• Никогда не используйте эти ключи с реальными средствами</li>
                  <li>• Сохраните мнемоническую фразу в безопасном месте</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Кнопка генерации */}
          {!mnemonic && (
            <div className="text-center mb-8">
              <motion.button
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                onClick={generateDemoXPUBs}
                disabled={isGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isGenerating ? '🔄 Генерируем...' : '🎲 Сгенерировать DEMO XPUB ключи'}
              </motion.button>
            </div>
          )}

          {/* Мнемоническая фраза */}
          {mnemonic && (
            <motion.div
              className="bg-gray-900/50 rounded-xl p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">🔑 Мнемоническая фраза</h3>
                <button
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                >
                  {showMnemonic ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <code className="block bg-black/50 p-4 rounded-lg text-green-400 font-mono text-sm break-all">
                  {showMnemonic ? mnemonic : '•'.repeat(mnemonic.length)}
                </code>
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                  onClick={() => copyToClipboard(mnemonic)}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* XPUB ключи */}
          {Object.keys(xpubs).length > 0 && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">📊 Master XPUB Ключи</h3>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  onClick={downloadEnvFile}
                >
                  <Download className="w-4 h-4" />
                  Скачать .env
                </button>
              </div>

              <div className="grid gap-4">
                {Object.entries(xpubs).map(([symbol, xpub]) => (
                  <motion.div
                    key={symbol}
                    className="bg-gray-900/50 rounded-xl p-4"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{symbol}_MASTER_XPUB</span>
                      <button
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={() => copyToClipboard(`${symbol}_MASTER_XPUB=${xpub}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <code className="block bg-black/50 p-3 rounded-lg text-blue-400 font-mono text-xs break-all">
                      {xpub}
                    </code>
                  </motion.div>
                ))}
              </div>

              {/* Инструкции */}
              <motion.div
                className="bg-blue-900/30 border border-blue-600 rounded-xl p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h4 className="text-blue-400 font-semibold mb-3">📋 Как использовать:</h4>
                <ol className="text-blue-200 text-sm space-y-2">
                  <li>1. Скопируйте XPUB ключи выше</li>
                  <li>2. Добавьте их в переменные окружения Vercel</li>
                  <li>3. Или скачайте .env файл и добавьте в проект</li>
                  <li>4. Перезапустите приложение</li>
                </ol>
              </motion.div>

              {/* Кнопка сброса */}
              <div className="text-center">
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                  onClick={() => {
                    setMnemonic('');
                    setXpubs({});
                  }}
                >
                  🔄 Сгенерировать новые ключи
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
