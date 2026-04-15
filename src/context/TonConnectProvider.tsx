'use client'

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ReactNode } from 'react';

const manifestUrl = process.env.NEXT_PUBLIC_TON_MANIFEST_URL || 
  'https://pidr-1-01.vercel.app/tonconnect-manifest.json';
const twaReturnUrl = (process.env.NEXT_PUBLIC_TWA_RETURN_URL || 'https://t.me/NotPidrBot') as `${string}://${string}`;

export function TonConnectProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: 'telegram-wallet',
            name: 'TON Wallet',
            imageUrl: 'https://wallet.tg/images/logo-288.png',
            aboutUrl: 'https://wallet.tg/',
            universalLink: 'https://t.me/wallet/start',
            bridgeUrl: 'https://bridge.tonapi.io/bridge',
            platforms: ['ios', 'android', 'macos', 'windows', 'linux'],
          },
          {
            appName: 'tonkeeper',
            name: 'Tonkeeper',
            imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
            aboutUrl: 'https://tonkeeper.com/',
            universalLink: 'https://app.tonkeeper.com/ton-connect',
            bridgeUrl: 'https://bridge.tonapi.io/bridge',
            platforms: ['ios', 'android', 'chrome', 'firefox', 'macos', 'windows', 'linux'],
          },
        ],
      }}
      actionsConfiguration={{
        twaReturnUrl
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}

