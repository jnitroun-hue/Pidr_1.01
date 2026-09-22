'use client';

import { Home } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from './LanguageSwitcher';

/** Игровой стол сам подтверждает выход, чтобы не бросать партию в один клик. */
const HIDDEN_PATHS = new Set(['/', '/game']);

export default function HomeNavButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  if (!pathname || HIDDEN_PATHS.has(pathname)) return null;

  const label = language === 'en' ? 'Home' : 'Домой';

  const goHome = () => {
    const request = new CustomEvent('pidr:home-request', { cancelable: true });
    if (!window.dispatchEvent(request)) return;
    router.push('/');
  };

  return (
    <button type="button" className="pidr-home-nav" onClick={goHome} aria-label={label}>
      <Home size={16} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}
