'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getPendingReferralFromClient } from '@/lib/referral/pending-referral-client';

export default function ReferralWelcomeBanner() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    setReferralCode(getPendingReferralFromClient());
  }, []);

  if (!referralCode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="referral-welcome-banner"
    >
      <div className="referral-welcome-glow" aria-hidden />
      <div className="referral-welcome-content">
        <div className="referral-welcome-badge">🎁 БОНУС</div>
        <h2 className="referral-welcome-title">Вас пригласили в The Must!</h2>
        <p className="referral-welcome-subtitle">
          Зарегистрируйтесь — друг получит <strong>+500 монет</strong>, а вы начнёте играть сразу
        </p>
        <div className="referral-welcome-coins">
          <span className="referral-welcome-coin">💰</span>
          <span className="referral-welcome-amount">+500</span>
          <span className="referral-welcome-coin-label">монет рефереру</span>
        </div>
      </div>

      <style jsx>{`
        .referral-welcome-banner {
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
          padding: 22px 20px;
          border-radius: 20px;
          border: 2px solid #fbbf24;
          background: linear-gradient(
            135deg,
            #1e3a8a 0%,
            #7c3aed 45%,
            #db2777 100%
          );
          box-shadow:
            0 0 40px rgba(251, 191, 36, 0.35),
            0 12px 32px rgba(0, 0, 0, 0.35);
        }

        .referral-welcome-glow {
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, transparent 65%);
          animation: referralPulse 3s ease-in-out infinite;
          pointer-events: none;
        }

        .referral-welcome-content {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .referral-welcome-badge {
          display: inline-block;
          margin-bottom: 10px;
          padding: 6px 14px;
          border-radius: 999px;
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          color: #1e1b4b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          box-shadow: 0 4px 14px rgba(251, 191, 36, 0.5);
        }

        .referral-welcome-title {
          margin: 0 0 8px;
          color: #fff;
          font-size: 1.35rem;
          font-weight: 800;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }

        .referral-welcome-subtitle {
          margin: 0 0 16px;
          color: rgba(255, 255, 255, 0.92);
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .referral-welcome-subtitle strong {
          color: #fde047;
        }

        .referral-welcome-coins {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(251, 191, 36, 0.55);
        }

        .referral-welcome-coin {
          font-size: 1.4rem;
          animation: referralBounce 1.6s ease-in-out infinite;
        }

        .referral-welcome-amount {
          color: #fde047;
          font-size: 1.75rem;
          font-weight: 900;
          text-shadow: 0 0 18px rgba(253, 224, 71, 0.65);
        }

        .referral-welcome-coin-label {
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 600;
        }

        @keyframes referralPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }

        @keyframes referralBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </motion.div>
  );
}
