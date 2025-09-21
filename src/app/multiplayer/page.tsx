'use client';

import { useRouter } from 'next/navigation';
import ProperMultiplayer from '../../components/ProperMultiplayer';

export default function MultiplayerPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  return <ProperMultiplayer onBack={handleBack} />;
}