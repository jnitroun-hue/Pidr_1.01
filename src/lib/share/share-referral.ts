import {
  buildReferralLink,
  buildReferralShareText,
} from '@/lib/referral/referral-links';
import { isTelegramMiniAppClient } from '@/lib/telegram/init-mini-app';
import { isVKMiniApp } from '@/lib/auth/vk-bridge';

export type ReferralShareResult = 'shared' | 'copied' | 'cancelled';

export function buildVkShareUrl(url: string): string {
  return `https://vk.com/share.php?url=${encodeURIComponent(url)}`;
}

export function buildTelegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    prompt('Скопируйте ссылку и отправьте другу:', value);
    return true;
  } catch {
    return false;
  }
}

/** Поделиться реферальной ссылкой: native share, Telegram, VK, буфер. */
export async function shareReferralInvite(
  referrerId: number | string,
  preferred: 'auto' | 'telegram' | 'vk' | 'whatsapp' | 'copy' = 'auto'
): Promise<ReferralShareResult> {
  const url = buildReferralLink(referrerId);
  const text = buildReferralShareText(url);
  const title = 'The Must!';

  if (preferred === 'copy') {
    return (await copyText(url)) ? 'copied' : 'cancelled';
  }

  if (preferred === 'telegram') {
    const shareUrl = buildTelegramShareUrl(url, text);
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    if (typeof tg?.openTelegramLink === 'function') {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    return 'shared';
  }

  if (preferred === 'vk') {
    if (isVKMiniApp() && window.vkBridge?.send) {
      try {
        await window.vkBridge.send('VKWebAppShare', { link: url });
        return 'shared';
      } catch {
        /* fallback to vk.com/share */
      }
    }
    window.open(buildVkShareUrl(url), '_blank', 'noopener,noreferrer');
    return 'shared';
  }

  if (preferred === 'whatsapp') {
    window.open(buildWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
    return 'shared';
  }

  if (isTelegramMiniAppClient()) {
    return shareReferralInvite(referrerId, 'telegram');
  }

  if (isVKMiniApp() && window.vkBridge?.send) {
    try {
      await window.vkBridge.send('VKWebAppShare', { link: url });
      return 'shared';
    } catch {
      /* native share below */
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  return (await copyText(`${text}`)) ? 'copied' : 'cancelled';
}
