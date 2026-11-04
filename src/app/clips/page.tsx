'use client';

import { useRouter } from 'next/navigation';

export default function ClipsPage() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100dvh', padding: 24, color: '#f8f4ea', background: '#07060b' }}>
      <button type="button" onClick={() => router.push('/profile')} style={{ color: '#fde68a', background: 'transparent', border: 0, fontSize: 18 }}>
        ←
      </button>
      <h1 style={{ marginTop: 24 }}>Клипы пока выключены</h1>
    </main>
  );
}
