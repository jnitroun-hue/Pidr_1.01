'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageSwitcher';
import { useTranslations } from '@/lib/i18n/translations';
import PageLoadingScreen from '@/components/PageLoadingScreen';

export default function WalletPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);

  useEffect(() => {
    router.replace('/profile?wallet=1');
  }, [router]);

  return (
    <PageLoadingScreen
      title={t.wallet.pageTitle}
      subtitle={t.wallet.pageLoading}
    />
  );
}
