'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CardLoadingScreenProps {
  onLoadingComplete?: () => void;
  language?: 'ru' | 'en';
  loadingText?: string;
  duration?: number;
}

export default function CardLoadingScreen({ 
  onLoadingComplete,
  language = 'ru',
  loadingText,
  duration = 3000 
}: CardLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 12 + 3;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, [onLoadingComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Логотип */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="logo-container"
        >
          <div className="logo-circle">
            <span className="logo-text">P</span>
          </div>
        </motion.div>

        {/* Название */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="app-title"
        >
          The Must!
        </motion.h1>

        {/* Прогресс бар */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="progress-container"
        >
          <div className="progress-track">
            <motion.div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </motion.div>

        {/* Загрузочный текст */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="loading-message"
        >
          Загрузка игры...
        </motion.p>
      </div>

      <style jsx>{`
        .loading-screen {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
        }

        .logo-container {
          margin-bottom: 2rem;
        }

        .logo-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(59, 130, 246, 0.1);
          position: relative;
          overflow: hidden;
        }

        .logo-circle::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
          animation: shimmer 2s ease-in-out infinite;
        }

        .logo-text {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          z-index: 1;
          position: relative;
        }

        .app-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin: 0 0 3rem 0;
          letter-spacing: 0.1em;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .progress-container {
          width: 100%;
          margin-bottom: 1.5rem;
        }

        .progress-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.75rem;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 2px;
          transition: width 0.3s ease-out;
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          animation: progressShimmer 1.5s ease-in-out infinite;
        }

        .progress-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
        }

        .loading-message {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          font-weight: 500;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(200%) rotate(45deg);
          }
        }

        @keyframes progressShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Адаптивность */
        @media (max-width: 480px) {
          .loading-content {
            padding: 1.5rem;
          }
          
          .logo-circle {
            width: 64px;
            height: 64px;
          }
          
          .logo-text {
            font-size: 1.5rem;
          }
          
          .app-title {
            font-size: 2rem;
            margin-bottom: 2rem;
          }
        }
      `}</style>
    </div>
  );
}