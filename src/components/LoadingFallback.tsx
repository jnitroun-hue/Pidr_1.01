'use client'

import React from 'react'

export function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid #334155',
        borderTop: '4px solid #22c55e',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
      <h2 style={{ marginBottom: '10px', fontSize: '24px' }}>P.I.D.R.</h2>
      <p style={{ opacity: 0.7 }}>Загрузка приложения...</p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
