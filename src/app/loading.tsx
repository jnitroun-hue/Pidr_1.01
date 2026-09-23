import PageLoadingScreen from '@/components/PageLoadingScreen';

export default function GlobalLoading() {
  return (
    <PageLoadingScreen
      title="The Must"
      subtitle="Загрузка..."
      showProgress={false}
    />
  );
}
