import { afterEach, describe, expect, it } from 'vitest';
import { socialBonusConfig } from '../src/lib/bonus/social-subscription';

const ENV_KEYS = [
  'NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BONUS_CHANNEL_ID',
  'NEXT_PUBLIC_VK_GROUP_LINK',
  'VK_BONUS_GROUP_ID',
  'VK_SERVICE_TOKEN',
  'VK_ACCESS_TOKEN',
] as const;

const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('socialBonusConfig', () => {
  it('does not enable Telegram reward from link alone', () => {
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK = 'https://t.me/example';
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BONUS_CHANNEL_ID;

    expect(socialBonusConfig('telegram_subscribe')).toEqual({
      configured: false,
      link: 'https://t.me/example',
    });
  });

  it('requires VK group id and server token', () => {
    process.env.NEXT_PUBLIC_VK_GROUP_LINK = 'https://vk.com/example';
    process.env.VK_BONUS_GROUP_ID = '123';
    delete process.env.VK_SERVICE_TOKEN;
    delete process.env.VK_ACCESS_TOKEN;

    expect(socialBonusConfig('vk_subscribe').configured).toBe(false);
  });

  it('enables VK verification only with complete server configuration', () => {
    process.env.NEXT_PUBLIC_VK_GROUP_LINK = 'https://vk.com/example';
    process.env.VK_BONUS_GROUP_ID = '123';
    process.env.VK_SERVICE_TOKEN = 'service-token';

    expect(socialBonusConfig('vk_subscribe').configured).toBe(true);
  });
});
