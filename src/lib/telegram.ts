import { createHmac, createHash } from 'crypto'

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  // Parse URL-encoded initData into key-value pairs
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }

  const receivedHash = data['hash'];
  if (!receivedHash) return false;

  // Build data_check_string: sort keys except 'hash', join as key=value with newline
  const pairs: string[] = [];
  Object.keys(data)
    .filter(k => k !== 'hash')
    .sort()
    .forEach(k => {
      pairs.push(`${k}=${data[k]}`);
    });

  const dataCheckString = pairs.join('\n');

  // Secret key is SHA256 of bot token
  const secretKey = createHash('sha256').update(botToken).digest();

  // Compute HMAC-SHA256 of data_check_string using secretKey
  const hmac = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Compare in constant time
  return timingSafeEqualHex(hmac, receivedHash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
} 