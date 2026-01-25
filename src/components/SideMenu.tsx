import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const coins = [
  { name: 'TON', icon: '/img/ton-icon.svg', value: 12345.6789 },
  { name: 'Trump', icon: '/img/trump-icon.svg', value: 9876.5432 },
  { name: 'Solana', icon: '/img/solana-icon.svg', value: 23456.7890 },
  { name: 'Jetton', icon: '/img/jetton-icon.svg', value: 10000.0001 },
];

function formatCrypto(val: number) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function SideMenu({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Side menu */}
          <motion.aside
            className="fixed top-0 left-0 h-full w-[320px] max-w-[90vw] bg-gradient-to-b from-[#181c2a] via-[#232b3e] to-[#0f2027] shadow-2xl z-[101] flex flex-col"
            initial={{ x: -340 }}
            animate={{ x: 0 }}
            exit={{ x: -340 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* SideMenu content can be updated here if needed, wallet removed */}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
} 