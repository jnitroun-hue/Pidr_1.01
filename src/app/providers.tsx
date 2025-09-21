'use client'

import { useEffect } from 'react'
import { TelegramProvider } from '../hooks/useTelegram'
import { ThemeProvider } from '../context/theme_context'
import type { TelegramWebApp } from '../types/telegram-webapp'
import { ChakraProvider } from '@chakra-ui/react'
import { defaultSystem } from '@chakra-ui/react/preset'

// Add global augmentation for Window to include Telegram
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Инициализация CSS переменных для Telegram
    const root = document.documentElement
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp as TelegramWebApp
      
      // Применяем цвета темы Telegram
      if (tg.themeParams) {
        root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0f172a')
        root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#e2e8f0')
        root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#64748b')
        root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#22c55e')
        root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#22c55e')
        root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff')
      }

      // Настройка цветов игры
      root.style.setProperty('--game-bg', tg.themeParams?.bg_color || '#0f172a')
      root.style.setProperty('--background-color', tg.themeParams?.bg_color || '#0f172a')
      root.style.setProperty('--card-bg', '#ffffff')
      root.style.setProperty('--text-color', tg.themeParams?.text_color || '#e2e8f0')
      root.style.setProperty('--accent-color', '#22c55e')
    } else {
      // Fallback для разработки без Telegram
      root.style.setProperty('--tg-theme-bg-color', '#0f172a')
      root.style.setProperty('--tg-theme-text-color', '#e2e8f0')
      root.style.setProperty('--tg-theme-hint-color', '#64748b')
      root.style.setProperty('--tg-theme-link-color', '#22c55e')
      root.style.setProperty('--tg-theme-button-color', '#22c55e')
      root.style.setProperty('--tg-theme-button-text-color', '#ffffff')
      root.style.setProperty('--game-bg', '#0f172a')
      root.style.setProperty('--background-color', '#0f172a')
      root.style.setProperty('--card-bg', '#ffffff')
      root.style.setProperty('--text-color', '#e2e8f0')
      root.style.setProperty('--accent-color', '#22c55e')
    }
  }, [])

  return (
    <ChakraProvider value={defaultSystem}>
      <TelegramProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </TelegramProvider>
    </ChakraProvider>
  )
}