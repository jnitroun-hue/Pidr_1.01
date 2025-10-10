'use client'

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

const manifestUrl = process.env.NEXT_PUBLIC_TON_MANIFEST_URL || 
  'https://pidr-1-01.vercel.app/tonconnect-manifest.json';

export function TonConnectProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}

