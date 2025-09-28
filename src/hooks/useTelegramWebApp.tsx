'use client'

import { useEffect, useState, useCallback } from 'react';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isProgressVisible: boolean;
    isActive: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
    auth_date: number;
    hash: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
    secondary_bg_color: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  platform: string;
  version: string;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

interface UseTelegramWebAppReturn {
  webApp: TelegramWebApp | null;
  user: TelegramWebApp['initDataUnsafe']['user'] | null;
  isReady: boolean;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramWebApp['themeParams'] | null;
  hapticFeedback: {
    light: () => void;
    medium: () => void;
    heavy: () => void;
    success: () => void;
    error: () => void;
    warning: () => void;
    selection: () => void;
  };
  mainButton: {
    show: (text: string, onClick: () => void) => void;
    hide: () => void;
    setText: (text: string) => void;
    showProgress: () => void;
    hideProgress: () => void;
    enable: () => void;
    disable: () => void;
  };
  backButton: {
    show: (onClick: () => void) => void;
    hide: () => void;
  };
  utils: {
    setHeaderColor: (color: string) => void;
    setBackgroundColor: (color: string) => void;
    expand: () => void;
    close: () => void;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
  };
}

export const useTelegramWebApp = (): UseTelegramWebAppReturn => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);
      
      // Initialize WebApp
      tg.ready();
      tg.expand();
      
      // Set theme colors
      tg.setHeaderColor('#17212b');
      tg.setBackgroundColor('#17212b');
      
      setIsReady(true);
    }
  }, []);

  // Haptic feedback helpers
  const hapticFeedback = {
    light: useCallback(() => {
      webApp?.HapticFeedback?.impactOccurred('light');
    }, [webApp]),
    
    medium: useCallback(() => {
      webApp?.HapticFeedback?.impactOccurred('medium');
    }, [webApp]),
    
    heavy: useCallback(() => {
      webApp?.HapticFeedback?.impactOccurred('heavy');
    }, [webApp]),
    
    success: useCallback(() => {
      webApp?.HapticFeedback?.notificationOccurred('success');
    }, [webApp]),
    
    error: useCallback(() => {
      webApp?.HapticFeedback?.notificationOccurred('error');
    }, [webApp]),
    
    warning: useCallback(() => {
      webApp?.HapticFeedback?.notificationOccurred('warning');
    }, [webApp]),
    
    selection: useCallback(() => {
      webApp?.HapticFeedback?.selectionChanged();
    }, [webApp])
  };

  // Main button helpers
  const mainButton = {
    show: useCallback((text: string, onClick: () => void) => {
      if (webApp?.MainButton) {
        webApp.MainButton.setText(text);
        webApp.MainButton.onClick(onClick);
        webApp.MainButton.show();
      }
    }, [webApp]),
    
    hide: useCallback(() => {
      webApp?.MainButton?.hide();
    }, [webApp]),
    
    setText: useCallback((text: string) => {
      webApp?.MainButton?.setText(text);
    }, [webApp]),
    
    showProgress: useCallback(() => {
      webApp?.MainButton?.showProgress();
    }, [webApp]),
    
    hideProgress: useCallback(() => {
      webApp?.MainButton?.hideProgress();
    }, [webApp]),
    
    enable: useCallback(() => {
      webApp?.MainButton?.enable();
    }, [webApp]),
    
    disable: useCallback(() => {
      webApp?.MainButton?.disable();
    }, [webApp])
  };

  // Back button helpers
  const backButton = {
    show: useCallback((onClick: () => void) => {
      if (webApp?.BackButton) {
        webApp.BackButton.onClick(onClick);
        webApp.BackButton.show();
      }
    }, [webApp]),
    
    hide: useCallback(() => {
      webApp?.BackButton?.hide();
    }, [webApp])
  };

  // Utility functions
  const utils = {
    setHeaderColor: useCallback((color: string) => {
      webApp?.setHeaderColor(color);
    }, [webApp]),
    
    setBackgroundColor: useCallback((color: string) => {
      webApp?.setBackgroundColor(color);
    }, [webApp]),
    
    expand: useCallback(() => {
      webApp?.expand();
    }, [webApp]),
    
    close: useCallback(() => {
      webApp?.close();
    }, [webApp]),
    
    enableClosingConfirmation: useCallback(() => {
      webApp?.enableClosingConfirmation();
    }, [webApp]),
    
    disableClosingConfirmation: useCallback(() => {
      webApp?.disableClosingConfirmation();
    }, [webApp])
  };

  return {
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    isReady,
    platform: webApp?.platform || 'unknown',
    colorScheme: webApp?.colorScheme || 'dark',
    themeParams: webApp?.themeParams || null,
    hapticFeedback,
    mainButton,
    backButton,
    utils
  };
};
