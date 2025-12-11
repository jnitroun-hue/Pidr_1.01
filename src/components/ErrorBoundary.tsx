'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    console.error('Error stack:', error.stack)
    console.error('Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      // УБРАНО: Страница ошибки по требованию пользователя
      // Автоматически перезапускаем игру через 1 секунду
      setTimeout(() => {
        // Сбрасываем состояние ошибки и перезапускаем
        this.setState({ hasError: false, error: undefined });
        
        // Если ошибка критическая - обновляем страницу
        if (this.state.error?.message?.includes('Cannot read prop') || 
            this.state.error?.message?.includes('undefined')) {
          console.log('🔄 Критическая ошибка - автоматически перезапускаем игру');
          window.location.reload();
        }
      }, 1000);
      
      // Показываем минимальную загрузку вместо страницы ошибки
      return (
        <div style={{ 
          background: '#0f172a', 
          color: '#e2e8f0',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '24px', 
              marginBottom: '10px',
              animation: 'spin 1s linear infinite' 
            }}>⚡</div>
            <p>Перезапуск игры...</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
