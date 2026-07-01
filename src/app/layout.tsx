import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import ChunkErrorHandler from '../components/ChunkErrorHandler'
import GlobalRoomInviteListener from '../components/GlobalRoomInviteListener'
import AppUpdateGate from '../components/AppUpdateGate'
import ReferralCapture from '../components/ReferralCapture'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Must! - Card Game',
  description: 'Карточная игра The Must! - Увлекательная игра для Telegram',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          rel="stylesheet"
        />
        {/* ✅ ПРЕФЕТЧИНГ ДЛЯ УСКОРЕНИЯ ЗАГРУЗКИ */}
        <link rel="preconnect" href="https://telegram.org" />
        <link rel="dns-prefetch" href="https://telegram.org" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className}>
        <ChunkErrorHandler />
        <Providers>
          <AppUpdateGate>
          <div className="app-root">
            {children}
          </div>
          {/* Глобальный слушатель приглашений в комнаты (отображается поверх ЛЮБОЙ страницы) */}
          <GlobalRoomInviteListener />
          <ReferralCapture />
          </AppUpdateGate>
        </Providers>
      </body>
    </html>
  )
}