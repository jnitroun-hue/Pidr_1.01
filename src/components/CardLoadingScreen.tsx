'use client';

import PageLoadingScreen from './PageLoadingScreen';

interface CardLoadingScreenProps {
  onLoadingComplete?: () => void;
  language?: 'ru' | 'en';
  loadingText?: string;
}

/** Первая загрузка главной — только с картежником, без старого «The Must!» и процентов. */
export default function CardLoadingScreen({
  language = 'ru',
  loadingText,
}: CardLoadingScreenProps) {
  const subtitle =
    loadingText ?? (language === 'en' ? 'Loading game...' : 'Загрузка игры...');

  return (
    <PageLoadingScreen
      subtitle={subtitle}
      fixed
      showProgress={false}
      showTitle={false}
    />
  );
}
