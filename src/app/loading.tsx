import PageLoadingScreen from '@/components/PageLoadingScreen';

export default function GlobalLoading() {
  return (
    <PageLoadingScreen
      title="P.I.D.R."
      subtitle="Загрузка..."
      showProgress={false}
    />
  );
}
