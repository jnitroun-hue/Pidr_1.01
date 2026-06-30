/** Есть ли cookie с JWT — без лишних 401 на /api/auth для гостей */
export function hasAuthTokenCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((part) => part.trim().startsWith('auth_token='));
}
