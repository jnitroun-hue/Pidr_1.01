'use client';

import { useState, useEffect } from 'react';
import PageLoadingScreen from './PageLoadingScreen';

interface CardLoadingScreenProps {
  onLoadingComplete?: () => void;
  language?: 'ru' | 'en';
  loadingText?: string;
  duration?: number;
}

export default function CardLoadingScreen({
  onLoadingComplete,
  language = 'ru',
  loadingText,
}: CardLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  const subtitle =
    loadingText ??
    (language === 'en' ? 'Loading game...' : 'Загрузка игры...');

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 12 + 3;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  return (
    <PageLoadingScreen
      title="The Must!"
      subtitle={subtitle}
      fixed
      progress={progress}
    />
  );
}
