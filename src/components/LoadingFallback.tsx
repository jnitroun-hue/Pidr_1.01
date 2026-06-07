'use client';

import PageLoadingScreen from './PageLoadingScreen';

export function LoadingFallback() {
  return (
    <PageLoadingScreen
      title="The Must!"
      subtitle="Загрузка приложения..."
    />
  );
}

export default LoadingFallback;
