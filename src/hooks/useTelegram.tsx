'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { TelegramWebApp } from '../types/telegram-webapp'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface TelegramContextType {
  webApp: TelegramWebApp | null
  user: TelegramUser | null
  isReady: boolean
  showMainButton: (text: string, callback: () => void) => void
  hideMainButton: () => void
  showBackButton: (callback: () => void) => void
  hideBackButton: () => void
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void
  showAlert: (message: string) => void
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void
  sendData: (data: any) => void
  close: () => void
}

const TelegramContext = createContext<TelegramContextType | null>(null)

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Добавляем небольшую задержку для полной загрузки скрипта
    const initializeTelegram = () => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp
          tg.ready()
          tg.expand()
          
          setWebApp(tg)
          setIsReady(true)

          // Настройка темы только на клиенте
          if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark')
          }
        } else {
          // Для разработки без Telegram
          setIsReady(true)
        }
      } catch (error) {
        console.warn('Failed to initialize Telegram WebApp:', error)
        setIsReady(true) // Продолжаем работу без Telegram
      }
    }

    // Используем setTimeout для обеспечения полной загрузки
    const timer = setTimeout(initializeTelegram, 100)
    return () => clearTimeout(timer)
  }, [])

  const showMainButton = (text: string, callback: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text)
      webApp.MainButton.show()
      webApp.MainButton.onClick(callback)
    }
  }

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide()
    }
  }

  const showBackButton = (callback: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      webApp.BackButton.onClick(callback)
    }
  }

  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide()
    }
  }

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (webApp?.HapticFeedback) {
      if (['success', 'warning', 'error'].includes(type)) {
        webApp.HapticFeedback.notificationOccurred(type as 'success' | 'warning' | 'error')
      } else {
        webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy')
      }
    }
  }

  const showAlert = (message: string) => {
    if (webApp?.showAlert) {
      webApp.showAlert(message)
    } else {
      alert(message)
    }
  }

  const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    if (webApp?.showConfirm) {
      webApp.showConfirm(message, callback)
    } else {
      callback(confirm(message))
    }
  }

  const sendData = (data: any) => {
    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(data))
    }
  }

  const close = () => {
    if (webApp?.close) {
      webApp.close()
    }
  }

  const value: TelegramContextType = {
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    isReady,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showAlert,
    showConfirm,
    sendData,
    close,
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider')
  }
  return context
}