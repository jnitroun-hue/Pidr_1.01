import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import SideMenu from './SideMenu';
import { usePathname } from 'next/navigation';

const mainCoin = {
  name: 'TON',
  icon: '/img/ton-icon.svg',
  value: 12345.6789,
};

function formatCrypto(val: number) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function BottomNav() {
  const pathname = usePathname();
  const isMainMenu = pathname === '/' || pathname === '/main';
  const [open, setOpen] = useState(false);

  const handleWalletClick = () => {
    setOpen(true);
  };
  const handleCloseMenu = () => {
    setOpen(false);
  };

  return (
    <>
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="backdrop-blur-xl bg-gradient-to-t from-[#181c2a]/95 via-[#232b3e]/90 to-[#0f2027]/80 border-t border-white/10 shadow-2xl">
          <div className="relative flex justify-center items-center px-4 py-3 max-w-md mx-auto gap-4">
            {isMainMenu && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#232b3e]/80 border border-[#ffd700] shadow-lg"
              >
                <Image src={mainCoin.icon} alt={mainCoin.name} width={28} height={28} />
                <span className="text-xl font-bold text-[#ffd700] tabular-nums">{formatCrypto(mainCoin.value)}</span>
              </motion.div>
            )}
          </div>
          {/* Bottom safe area for iOS */}
          <div className="h-safe-area-inset-bottom bg-gradient-to-t from-[#181c2a]/60 to-transparent" />
        </div>
      </motion.nav>
      <SideMenu isOpen={open} onClose={handleCloseMenu} />
    </>
  );
}