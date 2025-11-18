import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import ChunkErrorHandler from '../components/ChunkErrorHandler'

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
          media="print"
          onLoad={(e) => {
            if (e.target instanceof HTMLLinkElement) {
              e.target.media = 'all';
            }
          }}
        />
        {/* ✅ ПРЕФЕТЧИНГ ДЛЯ УСКОРЕНИЯ ЗАГРУЗКИ */}
        <link rel="preconnect" href="https://telegram.org" />
        <link rel="dns-prefetch" href="https://telegram.org" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
      </head>
      <body className={inter.className}>
        <ChunkErrorHandler />
        <Providers>
          <div style={{ minHeight: '100vh' }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}