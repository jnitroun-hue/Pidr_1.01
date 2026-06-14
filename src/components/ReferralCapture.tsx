'use client';

import { useEffect } from 'react';
import { captureReferralFromCurrentUrl } from '@/lib/referral/pending-referral-client';

/** Сохраняет ?ref= из URL в cookie до регистрации / входа */
export default function ReferralCapture() {
  useEffect(() => {
    captureReferralFromCurrentUrl();
  }, []);
  return null;
}
