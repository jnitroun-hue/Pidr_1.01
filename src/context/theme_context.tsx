'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { TelegramWebApp } from '../types/telegram-webapp'

type Theme = 'light' | 'dark' | 'auto'
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange' | 'red'

interface ThemeContextType {
  theme: Theme
  colorScheme: ColorScheme
  isDark: boolean
  setTheme: (theme: Theme) => void
  setColorScheme: (scheme: ColorScheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const COLOR_SCHEMES = {
  blue: {
    primary: '#0ea5e9',
    secondary: '#0284c7',
    accent: '#38bdf8',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
  },
  green: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
  },
  orange: {
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
  },
  red: {
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#f87171',
  },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto')
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('blue')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Загружаем сохраненные настройки
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('pidr-theme') as Theme
      const savedColorScheme = localStorage.getItem('pidr-color-scheme') as ColorScheme
      
      if (savedTheme) setThemeState(savedTheme)
      if (savedColorScheme) setColorSchemeState(savedColorScheme)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    
    // Определяем темную тему
    let shouldBeDark = false
    
    if (theme === 'dark') {
      shouldBeDark = true
    } else if (theme === 'auto') {
      // Проверяем Telegram тему
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        shouldBeDark = window.Telegram.WebApp.colorScheme === 'dark'
      } else {
        // Fallback к системной теме
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    }
    
    setIsDark(shouldBeDark)
    
    // Применяем класс темы
    if (shouldBeDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Применяем цветовую схему
    const colors = COLOR_SCHEMES[colorScheme]
    root.style.setProperty('--accent-color', colors.primary)
    root.style.setProperty('--accent-secondary', colors.secondary)
    root.style.setProperty('--accent-light', colors.accent)
    
  }, [theme, colorScheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pidr-theme', newTheme)
    }
  }

  const setColorScheme = (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pidr-color-scheme', newScheme)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light'
    setTheme(newTheme)
  }

  const value: ThemeContextType = {
    theme,
    colorScheme,
    isDark,
    setTheme,
    setColorScheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}